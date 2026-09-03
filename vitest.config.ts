import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  root: path.resolve(import.meta.dirname),
  test: {
    environment: "node",
    // client 를 넣지 않으면 client/src/**/*.test.ts 가 조용히 수집되지 않는다.
    //   1단계 게이트(resolveTriageOutcome)의 단위 테스트가 그 자리에 있으므로 필수다.
    include: [
      "server/**/*.test.ts",
      "server/**/*.spec.ts",
      "client/src/**/*.test.ts",
      "client/src/**/*.spec.ts",
    ],
  },
});
