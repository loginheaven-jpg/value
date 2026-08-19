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
