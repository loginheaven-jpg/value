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

    expect(source).toContain("window.print()");
    expect(source).toContain("hidden md:inline-flex");
  });

  it("액션 버튼 영역은 인쇄물에 담기지 않는다", async () => {
    const source = await read("./Result.tsx");
    expect(source).toContain("no-print");
  });
});
