import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

/**
 * 인쇄 회귀 잠금 (Phase 41).
 *
 * 이 화면의 인쇄는 CSS 한 블록으로 끝나지 않는다. `@media print` 는 DOM 에 없는 노드를
 * 되살릴 수 없으므로, 성찰 질문이 조건부 렌더로 되돌아가는 순간 인쇄 CSS 는 아무 소리 없이
 * 무력해진다 — 화면은 멀쩡하고, 타입도 통과하고, 인쇄물에서만 질문이 사라진다.
 *
 * 그래서 CSS 와 렌더 구조를 함께 잠근다.
 */

const read = (relative: string) =>
  readFile(new URL(relative, import.meta.url), "utf8");

describe("결과 화면 인쇄", () => {
  it("index.css 에 @media print 블록이 있다", async () => {
    const css = await read("../index.css");
    expect(css).toContain("@media print");
  });

  it("인쇄에서 성찰 질문의 숨김을 해제한다", async () => {
    const css = await read("../index.css");
    const printBlock = css.slice(css.indexOf("@media print"));

    expect(printBlock).toContain(".reflection-section");
    // !important 가 없으면 Tailwind 의 `.hidden`(display:none)을 이기지 못한다.
    expect(printBlock).toMatch(/\.reflection-section\s*\{[^}]*display:\s*block\s*!important/);
  });

  it("인쇄에서 버튼·다이얼로그·토스트를 감춘다", async () => {
    const css = await read("../index.css");
    const printBlock = css.slice(css.indexOf("@media print"));

    for (const selector of ["button", '[role="dialog"]', "[data-sonner-toaster]", ".no-print"]) {
      expect(printBlock, selector).toContain(selector);
    }
  });

  // 이것이 이 파일의 존재 이유다.
  it("성찰 질문 블록은 조건부 렌더가 아니라 항상 렌더된다", async () => {
    const source = await read("./Result.tsx");

    expect(source).toContain("reflection-section");
    // 조건부 렌더로 되돌리면 인쇄 CSS 가 조용히 죽는다.
    expect(source).not.toContain("{isExpanded && (");
    // 접힘은 클래스로만 표현한다.
    expect(source).toMatch(/!isExpanded\s*&&\s*"hidden"/);
  });

  it("인쇄 버튼은 768px 미만에서 감춘다", async () => {
    const source = await read("./Result.tsx");
    const css = await read("../index.css");

    expect(source).toContain("window.print()");
    // 라벨은 지시서 §5.2 원문 그대로다.
    expect(source).toContain("인쇄 · PDF로 저장");
    // 폭 판정을 JS 로 하면 초기 렌더에서 버튼이 나타났다 사라진다(D-7).
    expect(source).toContain("print-action");
    expect(css).toMatch(/@media \(max-width: 767px\)[^}]*\{[^}]*\.print-action/);
  });

  // C-5 — 인쇄가 막힌 휴대폰에서는 '복사하기'가 주 동선이다.
  it("모바일에는 복사 안내 한 줄이 있다", async () => {
    const source = await read("./Result.tsx");
    expect(source).toContain("결과를 복사해 메모장이나 메시지에 붙여 두세요");
    expect(source).toContain("md:hidden");
  });

  it("액션 버튼 영역은 인쇄물에 담기지 않는다", async () => {
    const source = await read("./Result.tsx");
    expect(source).toContain("no-print");
  });
});

describe("v1 소실 문안 복원", () => {
  // §5.3 — 그룹코칭 도구에서 '공유'의 누락은 치명적이다.
  it("활용 안내가 다섯 항목이고 실천·공유를 포함한다", async () => {
    const source = await read("./Result.tsx");
    const block = source.slice(
      source.indexOf("이 결과를 어떻게 활용하나요?"),
      source.indexOf("</ul>", source.indexOf("이 결과를 어떻게 활용하나요?"))
    );

    for (const label of ["성찰하기", "실천하기", "공유하기", "방향잡기", "재검토하기"]) {
      expect(block, label).toContain(label);
    }
    expect(block.match(/<li>/g)).toHaveLength(5);
  });

  // §5.4 — 끝이 보여야 첫 단계의 부담이 준다.
  it("인트로가 단계 사다리를 보여주고 첫 단계를 '나누기'로 말한다", async () => {
    const source = await readFile(new URL("./Intro.tsx", import.meta.url), "utf8");

    expect(source).toContain("72장 → 끌리는 것만 → 10개 → 5개 → 3개");
    expect(source).toContain("첫 단계는 고르는 게 아니라 나누는 일입니다");
    // 렌더되는 자리에만 없으면 된다 — 설명 주석에는 남아 있어도 무방하다.
    expect(source).not.toMatch(/>\s*4단계 여정\s*</);
    // 소요 시간 표기는 유지한다(§5.4 명시).
    expect(source).toContain("약 10-15분");
  });

  // §6.1 C안 — 수집은 그대로 두되 안내를 붙인다. 셋 다 있어야 한다.
  it("인트로에 수집 목적·보관 기간·삭제 문의처가 있다", async () => {
    const source = await readFile(new URL("./Intro.tsx", import.meta.url), "utf8");

    expect(source).toContain("개인정보 수집 안내");
    expect(source).toContain("이름과 이메일을 받습니다");   // 목적
    expect(source).toContain("삭제를 요청하실 때까지 보관합니다"); // 보관 기간
    expect(source).toContain("PRIVACY_DELETION_CONTACT");   // 삭제 문의처
  });
});
