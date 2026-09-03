import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  root: path.resolve(import.meta.dirname),
  // vite.config.ts 의 별칭을 그대로 둔다. 없으면 `@shared/const` 를 import 하는
  //   server/routers.ts 를 테스트가 아예 불러올 수 없어, 관리자 잠금을 실제 호출로
  //   검증하는 길이 막힌다(소스 문자열 검사밖에 못 한다).
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
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
