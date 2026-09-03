import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

/**
 * Sort 화면의 배선 규칙. 순수 함수로 꺼낼 수 없어 렌더러 없이는 잴 수 없는 것들이라,
 * 소스 수준에서 잠근다. 전부 **실제로 발생했던 결함**의 재발 방지다.
 */

const sort = () => readFile(new URL("./Sort.tsx", import.meta.url), "utf8");
const triage = () =>
  readFile(new URL("../components/CardTriage.tsx", import.meta.url), "utf8");

describe("1단계 배선", () => {
  // 결함: 검토 화면의 '{n}장 그대로 2단계로 가기' 가 round 1~2 에서 재분류 화면으로
  //       되튕겼다. 라벨이 하지 않는 일을 약속했다.
  it("검토 화면의 확인은 상한을 다시 묻지 않는다", async () => {
    const source = await sort();
    const body = source.slice(
      source.indexOf("const handleTriageConfirm"),
      source.indexOf("const handleBack")
    );

    expect(body).toContain("TRIAGE_FLOOR");
    // 여기서 게이트를 다시 돌리면 상한이 걸려 재분류로 되튕긴다.
    expect(body).not.toContain("resolveTriageOutcome");
    expect(body).not.toContain('setTriagePhase("rerun")');
  });

  // 결함: queueIds 만 실재 id 로 거르고 decisions 는 거르지 않아, 게이트가 세는 장수와
  //       2단계가 받는 장수가 어긋났다(유령 3장 → 2단계 9장 → 잠긴 화면).
  it("복원 시 저장본 전체를 실재 id 로 거른다", async () => {
    const source = await sort();
    expect(source).toContain("sanitizeTriage");
    // 큐만 거르는 옛 방식이 남아 있으면 안 된다.
    expect(source).not.toContain("parsed.queueIds.filter");
  });

  // 결함: values-progress 는 페이지를 열기만 해도 갱신되는데 values-triage 는 아니어서,
  //       progress 만 신선하고 triage 가 만료되어 1단계 판단이 통째로 사라졌다.
  it("복원한 분류 상태의 시각을 다시 찍는다", async () => {
    const source = await sort();
    // 파일 앞쪽 만료 블록에도 같은 키가 나오므로 복원 블록 시작점부터 잘라 본다.
    const start = source.indexOf('const saved = localStorage.getItem("values-triage")');
    expect(start).toBeGreaterThan(-1);
    const block = source.slice(start, source.indexOf("setTriagePhase(parsed.phase", start));
    expect(block).toContain("timestamp: Date.now()");
  });

  it("분류 상태 없이 2단계 이상이면 이력에서 이관한다", async () => {
    const source = await sort();
    expect(source).toContain("triageFromLegacyProgress");
  });
});

describe("1단계 키보드", () => {
  // 결함: Alt+← 는 브라우저 뒤로가기인데 삼켜지고 카드가 '아니요' 로 들어갔다.
  it("수식키가 눌린 조합은 가로채지 않는다", async () => {
    const source = await triage();
    expect(source).toContain("event.altKey");
    expect(source).toContain("event.metaKey");
    expect(source).toContain("event.ctrlKey");
  });

  // 결함: 키를 누르고 있으면 자동 반복이 덱 전체를 소진했다.
  it("자동 반복을 무시한다", async () => {
    const source = await triage();
    expect(source).toContain("event.repeat");
  });
});
