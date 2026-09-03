import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  buildTriageQueue,
  decideCard,
  resolveTriageOutcome,
  startRerun,
  undoDecision,
  STEP_CONFIGS,
  TRIAGE_CEIL,
  TRIAGE_FLOOR,
  TRIAGE_MAX_ROUND,
  type TriageBucket,
  type TriageState,
  type Value,
} from "./values";

/** yes n장·maybe m장·나머지 no 로 채운 판단 맵. */
function decisions(yes: number, maybe: number, no = 0): Record<number, TriageBucket> {
  const out: Record<number, TriageBucket> = {};
  let id = 1;
  for (let i = 0; i < yes; i++) out[id++] = "yes";
  for (let i = 0; i < maybe; i++) out[id++] = "maybe";
  for (let i = 0; i < no; i++) out[id++] = "no";
  return out;
}

describe("1단계 게이트 — resolveTriageOutcome", () => {
  it("12~24장이면 그대로 2단계로 간다", () => {
    expect(resolveTriageOutcome(decisions(15, 20), 1)).toEqual({
      action: "proceed",
      valueIds: Array.from({ length: 15 }, (_, i) => i + 1),
    });
  });

  it("한 장 모자라면 재분류 없이 곧바로 보충 선택이다", () => {
    // v3.1 은 여기서 maybe 를 두 번 재분류시킨 뒤에야 보충 화면에 닿았다. 세 패스였다.
    const out = resolveTriageOutcome(decisions(11, 1), 1);
    expect(out).toEqual({ action: "topUp", need: 1, message: "조금만 더 골라 주세요." });
  });

  it("보류가 없어도 보충 선택으로 간다", () => {
    expect(resolveTriageOutcome(decisions(9, 0, 63), 1)).toMatchObject({
      action: "topUp",
      need: 3,
    });
  });

  it("24장을 넘으면 한 번 더 나누기를 권한다", () => {
    expect(resolveTriageOutcome(decisions(30, 0), 1)).toMatchObject({
      action: "rerun",
      source: "yes",
    });
  });

  it("라운드 상한에 이르면 과다여도 그대로 보낸다", () => {
    const out = resolveTriageOutcome(decisions(30, 0), TRIAGE_MAX_ROUND);
    expect(out.action).toBe("proceed");
  });

  // 이것이 v3.1 의 결함이었다 — `if (round >= 3) return proceed` 가 함수 첫 줄에 있어
  // 하한 검사를 건너뛰었고, yes 0장이 2단계로 넘어가 화면이 잠겼다.
  it("라운드 상한이 하한 검사를 건너뛰지 못한다", () => {
    expect(resolveTriageOutcome(decisions(5, 20), TRIAGE_MAX_ROUND)).toMatchObject({
      action: "topUp",
      need: 7,
    });
    expect(resolveTriageOutcome(decisions(0, 0, 72), TRIAGE_MAX_ROUND)).toMatchObject({
      action: "topUp",
      need: TRIAGE_FLOOR,
    });
  });

  it("rerun 의 source 는 yes 하나뿐이다 — maybe 재분류 경로가 없다", () => {
    const seen = new Set<string>();
    for (let yes = 0; yes <= 72; yes++) {
      for (const round of [1, 2, 3, 4]) {
        const out = resolveTriageOutcome(decisions(yes, Math.min(72 - yes, 10)), round);
        if (out.action === "rerun") seen.add(out.source);
      }
    }
    expect([...seen]).toEqual(["yes"]);
  });

  // 불변식. 이것이 깨지면 2단계에서 '다음' 버튼이 렌더되지 않아 화면이 잠긴다.
  it("proceed 는 언제나 12장 이상이다 — 전 조합", () => {
    const bad: string[] = [];
    for (let yes = 0; yes <= 72; yes++) {
      for (let maybe = 0; maybe <= 72 - yes; maybe += 7) {
        for (const round of [1, 2, 3, 4]) {
          const out = resolveTriageOutcome(decisions(yes, maybe), round);
          if (out.action === "proceed" && out.valueIds.length < TRIAGE_FLOOR) {
            bad.push(`yes=${yes} maybe=${maybe} round=${round}`);
          }
        }
      }
    }
    expect(bad).toEqual([]);
  });

  // 보충 선택의 후보 풀은 항상 72 - yes 다. need 는 12 - yes 이므로 마르지 않는다.
  it("보충으로 채워야 할 수가 남은 카드 수를 넘지 않는다", () => {
    for (let yes = 0; yes < TRIAGE_FLOOR; yes++) {
      const out = resolveTriageOutcome(decisions(yes, 0, 72 - yes), 1);
      expect(out.action).toBe("topUp");
      if (out.action === "topUp") expect(out.need).toBeLessThanOrEqual(72 - yes);
    }
  });

  it("하한은 2단계가 요구하는 수보다 크다", () => {
    // 후보가 2단계의 to 이하이면 '선택'이 성립하지 않는다.
    expect(TRIAGE_FLOOR).toBeGreaterThan(STEP_CONFIGS[1].to);
    expect(TRIAGE_CEIL).toBeGreaterThan(TRIAGE_FLOOR);
  });
});

describe("진행바 라벨", () => {
  it("1단계는 분류, 4단계는 비교로 표시한다", () => {
    expect(STEP_CONFIGS[0].barLabel).toBe("분류");
    expect(STEP_CONFIGS[3].barLabel).toBe("비교");
  });

  it("2·3단계는 개수를 그대로 쓴다", () => {
    expect(STEP_CONFIGS[1].barLabel).toBeUndefined();
    expect(STEP_CONFIGS[2].barLabel).toBeUndefined();
  });

  // to 를 바꾸면 Sort 의 선택 게이트와 server/valuesData.test.ts 가 함께 흔들린다.
  it("barLabel 을 넣어도 to 는 그대로다", () => {
    expect(STEP_CONFIGS.slice(0, 4).map((c) => c.to)).toEqual([20, 10, 5, 3]);
  });
});

describe("1단계 카드 순서 — buildTriageQueue", () => {
  const load = async (): Promise<Value[]> =>
    JSON.parse(
      await readFile(new URL("../../public/values.json", import.meta.url), "utf8")
    ) as Value[];

  it("72장을 빠짐없이 한 번씩 내보낸다", async () => {
    const order = buildTriageQueue(await load());
    expect(order).toHaveLength(72);
    expect(new Set(order).size).toBe(72);
    expect([...order].sort((a, b) => a - b)).toEqual(
      Array.from({ length: 72 }, (_, i) => i + 1)
    );
  });

  // 이것이 이 함수의 존재 이유다. '관계'는 14장이라 무작위로 섞으면 실제로 뭉친다.
  it("같은 카테고리 카드가 연달아 나오지 않는다", async () => {
    const values = await load();
    const category = new Map(values.map((v) => [v.id, v.category]));
    const order = buildTriageQueue(values);

    const runs: string[] = [];
    for (let i = 1; i < order.length; i++) {
      if (category.get(order[i]) === category.get(order[i - 1])) {
        runs.push(`${i - 1}~${i}: ${category.get(order[i])}`);
      }
    }
    expect(runs).toEqual([]);
  });

  it("무작위가 아니다 — 같은 입력이면 같은 배열이다", async () => {
    const values = await load();
    expect(buildTriageQueue(values)).toEqual(buildTriageQueue(values));
  });

  // 카테고리 안 위치는 입력 순서를 따르므로 입력을 뒤집으면 배열도 달라진다. 그래도
  // 흩는다는 성질 자체는 입력 순서에 기대지 않는다 — 뒤집은 입력에서도 뭉치지 않아야 한다.
  it("입력 순서가 바뀌어도 흩는 성질은 유지된다", async () => {
    const values = await load();
    const category = new Map(values.map((v) => [v.id, v.category]));
    const order = buildTriageQueue([...values].reverse());

    expect(order).toHaveLength(72);
    expect(new Set(order).size).toBe(72);
    const runs = order.filter(
      (id, i) => i > 0 && category.get(id) === category.get(order[i - 1])
    );
    expect(runs).toEqual([]);
  });

  it("한 카테고리만 있어도, 빈 입력이어도 무너지지 않는다", async () => {
    const values = await load();
    const onlyOne = values.filter((v) => v.category === "관계");
    expect(buildTriageQueue(onlyOne)).toHaveLength(onlyOne.length);
    expect(buildTriageQueue([])).toEqual([]);
  });
});

/**
 * 원본 §9 Phase 40 이 요구했으나 지시서 개정 과정에서 소실된 회귀 기준(G-3).
 *   ① 72장 완주 후 2단계 후보군이 yes 더미와 일치한다
 *   ② 되돌리기가 직전 판단을 정확히 취소한다
 *   ③ 2라운드에서 되돌려도 1라운드 판단이 사라지지 않는다
 */
describe("분류 상태 전이 — 소실된 회귀 기준 복구 (G-3)", () => {
  const load = async (): Promise<Value[]> =>
    JSON.parse(
      await readFile(new URL("../../public/values.json", import.meta.url), "utf8")
    ) as Value[];

  const fresh = (queueIds: number[]): TriageState => ({
    round: 1,
    queueIds,
    decisions: {},
    history: [],
    timestamp: 0,
  });

  it("72장을 완주하면 2단계 후보군이 yes 더미와 정확히 일치한다", async () => {
    const values = await load();
    const order = buildTriageQueue(values);

    // 3장마다 하나씩 yes — 24장이 되어 상한을 넘지 않는다.
    let state = fresh(order);
    const expectedYes: number[] = [];
    order.forEach((id, i) => {
      const bucket: TriageBucket = i % 3 === 0 ? "yes" : i % 3 === 1 ? "maybe" : "no";
      if (bucket === "yes") expectedYes.push(id);
      state = decideCard(state, bucket);
    });

    expect(state.queueIds).toEqual([]);
    expect(state.history).toHaveLength(72);
    expect(expectedYes).toHaveLength(24);

    const outcome = resolveTriageOutcome(state.decisions, state.round);
    expect(outcome.action).toBe("proceed");
    if (outcome.action === "proceed") {
      expect([...outcome.valueIds].sort((a, b) => a - b)).toEqual(
        [...expectedYes].sort((a, b) => a - b)
      );
    }
  });

  it("되돌리기가 직전 판단을 정확히 취소한다", () => {
    const before = decideCard(decideCard(fresh([7, 8, 9]), "yes"), "no");
    expect(before.decisions).toEqual({ 7: "yes", 8: "no" });

    const after = undoDecision(before);
    expect(after.queueIds).toEqual([8, 9]); // 카드가 큐 맨 앞으로 돌아온다
    expect(after.decisions).toEqual({ 7: "yes" }); // 그 판단만 지워진다
    expect(after.history).toEqual([7]);

    // 한 번 더 되돌리면 처음 상태다.
    const start = undoDecision(after);
    expect(start.queueIds).toEqual([7, 8, 9]);
    expect(start.decisions).toEqual({});
    expect(start.history).toEqual([]);

    // 되돌릴 것이 없으면 아무 일도 없다.
    expect(undoDecision(start)).toEqual(start);
  });

  it("2라운드에서 되돌려도 1라운드 판단이 사라지지 않는다", () => {
    // 1라운드: 1·2 는 yes, 3 은 no.
    let state = fresh([1, 2, 3]);
    state = decideCard(state, "yes");
    state = decideCard(state, "yes");
    state = decideCard(state, "no");

    // 2라운드는 yes 만 다시 돈다. no 판단은 누적된 채 남는다.
    state = startRerun(state, [1, 2, 3]);
    expect(state.round).toBe(2);
    expect(state.queueIds).toEqual([1, 2]);
    expect(state.decisions).toEqual({ 3: "no" });
    expect(state.history).toEqual([]); // 되돌리기는 라운드 경계를 넘지 않는다

    state = decideCard(state, "no");
    // 되돌릴 수 있는 것은 이번 라운드 판단뿐이다.
    const undone = undoDecision(undoDecision(state));
    expect(undone.decisions).toEqual({ 3: "no" }); // 1라운드 판단은 그대로다
    expect(undone.queueIds).toEqual([1, 2]);
  });

  it("빈 큐에 판단을 밀어 넣어도 상태가 흔들리지 않는다", () => {
    const empty = fresh([]);
    expect(decideCard(empty, "yes")).toEqual(empty);
  });
});
