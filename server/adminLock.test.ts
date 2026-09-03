import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

/**
 * 관리자 잠금을 **실제 호출로** 검증한다.
 *
 * 지금까지 이 잠금의 근거는 소스 문자열 검사뿐이었다("`getAll: adminProcedure` 가 있는가").
 * 그것은 미들웨어가 실제로 막는지는 말해 주지 않는다 — `adminProcedure` 의 정의가 바뀌거나
 * 미들웨어가 무력화되어도 문자열은 그대로다.
 *
 * 이 파일이 성립하려면 `vitest.config.ts` 에 `resolve.alias` 가 있어야 한다.
 * `server/routers.ts` 가 `@shared/const` 를 import 하므로, 별칭이 없으면 라우터를 아예
 * 불러올 수 없다. 별칭을 지우면 이 파일 전체가 수집 단계에서 실패한다 — 그것이 신호다.
 *
 * DB 는 필요 없다. `DATABASE_URL` 이 없으면 `getDb()` 가 null 을 돌려주고, 권한 검사는
 * 리졸버 본문보다 **먼저** 돈다. 그래서 잠금은 DB 없이도 정확히 잴 수 있다.
 */

const ctx = (user: unknown): TrpcContext =>
  ({ req: {}, res: {}, user } as unknown as TrpcContext);

const ANON = ctx(null);
const MEMBER = ctx({ id: 1, openId: "u-1", role: "user" });
const ADMIN = ctx({ id: 2, openId: "u-2", role: "admin" });

/** 권한에서 막혔는가. 리졸버까지 갔다가 DB 때문에 죽은 것과 구별한다. */
async function rejectionCode(run: () => Promise<unknown>): Promise<string | undefined> {
  try {
    await run();
    return undefined;
  } catch (error) {
    return (error as { code?: string }).code;
  }
}

describe("관리자 전용 프로시저", () => {
  it("비로그인 호출을 FORBIDDEN 으로 막는다", async () => {
    const anon = appRouter.createCaller(ANON);

    expect(await rejectionCode(() => anon.values.getAll())).toBe("FORBIDDEN");
    expect(await rejectionCode(() => anon.values.delete({ id: 1 }))).toBe("FORBIDDEN");
    expect(await rejectionCode(() => anon.values.deleteMany({ ids: [1] }))).toBe("FORBIDDEN");
  });

  it("로그인했더라도 admin 이 아니면 막는다", async () => {
    const member = appRouter.createCaller(MEMBER);

    expect(await rejectionCode(() => member.values.getAll())).toBe("FORBIDDEN");
    expect(await rejectionCode(() => member.values.delete({ id: 1 }))).toBe("FORBIDDEN");
    expect(await rejectionCode(() => member.values.deleteMany({ ids: [1] }))).toBe("FORBIDDEN");
  });

  // 이것이 없으면 위의 두 테스트는 '전부 막는 게이트'로도 통과한다.
  it("admin 은 게이트를 통과한다 — 막히는 이유가 권한이 아니다", async () => {
    const code = await rejectionCode(() => appRouter.createCaller(ADMIN).values.getAll());
    // DB 가 없으므로 리졸버 안에서 죽는다. 중요한 것은 그것이 FORBIDDEN 이 아니라는 점이다.
    expect(code).not.toBe("FORBIDDEN");
    expect(code).not.toBe("UNAUTHORIZED");
  });
});

describe("참여자 경로는 열려 있어야 한다", () => {
  // 잠그면 비로그인 참여자 흐름이 죽는다(§6.1 결정 대기). 열려 있음을 잠가 둔다.
  it("save 는 비로그인 호출을 권한으로 막지 않는다", async () => {
    const code = await rejectionCode(() =>
      appRouter.createCaller(ANON).values.save({
        name: "테스트",
        email: "test@example.com",
        value1: "성장",
        value2: "관계",
        value3: "자유",
      })
    );

    expect(code).not.toBe("FORBIDDEN");
    expect(code).not.toBe("UNAUTHORIZED");
  });

  it("getByEmail 은 비로그인 호출을 권한으로 막지 않는다", async () => {
    const code = await rejectionCode(() =>
      appRouter.createCaller(ANON).values.getByEmail({ email: "test@example.com" })
    );

    expect(code).not.toBe("FORBIDDEN");
    expect(code).not.toBe("UNAUTHORIZED");
  });
});
