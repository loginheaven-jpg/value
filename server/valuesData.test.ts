import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { STEP_CONFIGS, type Value } from "../client/src/types/values";

describe("가치 카드 데이터와 핵심 선택 단계", () => {
  it("정식 카드 데이터는 중복 없는 72개이며 id 1부터 72까지를 사용한다", async () => {
    const source = await readFile(
      new URL("../client/public/values.json", import.meta.url),
      "utf8"
    );
    const values = JSON.parse(source) as Value[];

    expect(values).toHaveLength(72);
    expect(new Set(values.map(value => value.id)).size).toBe(72);
    expect(values.map(value => value.id)).toEqual(
      Array.from({ length: 72 }, (_, index) => index + 1)
    );
    expect(values.some(value => value.id === 73)).toBe(false);
  });

  it("카드 축소 단계는 72개에서 20개, 10개, 5개로 진행된다", () => {
    expect(STEP_CONFIGS.slice(0, 3).map(config => [config.from, config.to])).toEqual([
      [72, 20],
      [20, 10],
      [10, 5],
    ]);
  });
});

// ── Phase 38: 성찰 질문 데이터 통합 ─────────────────────────────────────────
// 질문이 코드(`Result.tsx` 의 한글명 키 매핑)에서 데이터(`values.json` 의 카드별 `questions`)로
// 옮겨 왔다. 옛 구조는 카드 이름이 바뀌면 조용히 끊겼다 — Phase 22 의 개명으로 32장이 기본 질문에
// 떨어지고 사문 키 9개가 남았다. 아래 잠금은 그 상태로 되돌아가지 못하게 한다.
describe("성찰 질문은 카드 데이터가 소유한다", () => {
  const loadValues = async (): Promise<Value[]> =>
    JSON.parse(
      await readFile(new URL("../client/public/values.json", import.meta.url), "utf8")
    ) as Value[];

  it("72장 전부가 고유 성찰 질문 2개를 갖는다", async () => {
    const values = await loadValues();
    const missing = values.filter(v => !Array.isArray(v.questions) || v.questions.length < 2);
    expect(missing.map(v => `${v.id} ${v.korean}`)).toEqual([]);
    expect(values.reduce((n, v) => n + v.questions.length, 0)).toBe(144);
  });

  it("빈 질문이 없다", async () => {
    const values = await loadValues();
    for (const value of values) {
      for (const question of value.questions) {
        expect(question.trim(), `${value.id} ${value.korean}`).not.toBe("");
      }
    }
  });

  it("한 카드 안에서 같은 질문이 반복되지 않는다", async () => {
    const values = await loadValues();
    for (const value of values) {
      expect(new Set(value.questions).size, `${value.id} ${value.korean}`).toBe(
        value.questions.length
      );
    }
  });

  // v3.1 C-6 / v3.2 D-8. 픽스처는 이관 **이전에** 뽑았고 이후 수정하지 않는다.
  //   원본 §4.3 이 "기존 40장의 문구는 수정하지 않는다"고 했으므로 그것을 잠근다.
  it("이관한 40장의 문구가 이관 전과 한 글자도 다르지 않다", async () => {
    const values = await loadValues();
    const legacy = JSON.parse(
      await readFile(new URL("./__fixtures__/legacyQuestions.json", import.meta.url), "utf8")
    ) as Record<string, string[]>;

    expect(Object.keys(legacy)).toHaveLength(40);
    for (const [korean, questions] of Object.entries(legacy)) {
      const card = values.find(v => v.korean === korean);
      expect(card, `${korean} 카드가 사라졌다`).toBeDefined();
      expect(card!.questions, korean).toEqual(questions);
    }
  });

  it("삭제된 카드용 사문 질문이 남아 있지 않다", async () => {
    const values = await loadValues();
    const names = new Set(values.map(v => v.korean));
    for (const gone of ["우정", "자기계발", "성공", "탁월함", "평판", "행복", "재미", "체면", "사명"]) {
      expect(names.has(gone), gone).toBe(false);
    }
  });

  it("Result.tsx 에 한글명 키 매핑이 되살아나지 않았다", async () => {
    const source = await readFile(
      new URL("../client/src/pages/Result.tsx", import.meta.url),
      "utf8"
    );
    expect(source).not.toContain("REFLECTION_QUESTIONS");
    expect(source).toContain("DEFAULT_QUESTIONS");
  });
});

// ── Phase 39-C: 73번 카드 레거시 제거 ───────────────────────────────────────
// 73번 카드는 Phase 36 에 데이터에서 사라졌는데 Sort.tsx 의 분기가 남아 실행되지 않는 코드로 있었다.
// 결과 화면의 가치 교체(§7.2)는 **유지**하므로 custom-value-result 는 살아 있어야 한다.
describe("73번 카드 레거시가 되살아나지 않았다", () => {
  const read = (rel: string) => readFile(new URL(rel, import.meta.url), "utf8");

  it("Sort.tsx 에 73번 분기와 커스텀 입력이 없다", async () => {
    const source = await read("../client/src/pages/Sort.tsx");
    expect(source).not.toMatch(/73/);
    expect(source).not.toContain("custom-value-step3");
    expect(source).not.toContain("customInputMode");
    expect(source).not.toContain("handleCustomValueSubmit");
  });

  it("Result.tsx 는 custom-value-step3 를 읽지 않는다", async () => {
    const source = await read("../client/src/pages/Result.tsx");
    expect(source).not.toContain("custom-value-step3");
  });

  it("결과 화면의 가치 교체는 유지된다 (§7.2)", async () => {
    const source = await read("../client/src/pages/Result.tsx");
    expect(source).toContain("custom-value-result");
  });
});

// ── Phase 39-A: 관리자 API 서버 잠금 ────────────────────────────────────────
// /admin 은 가드가 하나도 없이 마운트 즉시 getAll 을 불렀다. getAll 은 전 참여자의
// 이름·이메일·가치를 돌려주므로 주소만 알면 열렸다.
describe("관리자 API 가 서버에서 잠겨 있다", () => {
  const routers = () => readFile(new URL("./routers.ts", import.meta.url), "utf8");

  it("getAll·delete·deleteMany 가 adminProcedure 다", async () => {
    const source = await routers();
    for (const name of ["getAll", "delete", "deleteMany"]) {
      expect(source, name).toContain(name + ": adminProcedure");
      expect(source, name).not.toContain(name + ": publicProcedure");
    }
  });

  // 참여자가 세션 없이 부르는 두 프로시저다. 잠그면 앱이 죽으므로 의도적으로 열려 있고,
  // 그 사실이 잊히지 않게 여기 못 박는다. 소유권 검증은 §6.1 결정 사안이다.
  it("save·getByEmail 은 의도적으로 공개다", async () => {
    const source = await routers();
    expect(source).toContain("save: publicProcedure");
    expect(source).toContain("getByEmail: publicProcedure");
  });

  it("getByEmail 이 이메일을 되돌려 주지 않는다", async () => {
    const source = await readFile(new URL("./db.ts", import.meta.url), "utf8");
    const fn = source.slice(source.indexOf("getValuesAssessmentsByEmail"));
    const body = fn.split(/^}/m)[0];
    expect(body).not.toMatch(/email:\s*valuesAssessments\.email/);
    expect(body).toContain("id: valuesAssessments.id");
  });

  it("Admin 화면에 로그인·권한 게이트가 있다", async () => {
    const source = await readFile(new URL("../client/src/pages/Admin.tsx", import.meta.url), "utf8");
    expect(source).toContain("useAuth");
    expect(source).toContain('user?.role === "admin"');
    expect(source).toContain("enabled: isAdmin");
  });
});

