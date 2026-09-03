import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { saveValuesAssessment, getAllValuesAssessments, getValuesAssessmentsByEmail, deleteValuesAssessment, deleteValuesAssessments } from "./db";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  values: router({
    /**
     * Save values assessment result
     */
    save: publicProcedure
      .input(
        z.object({
          name: z.string().min(1),
          email: z.string().email(),
          value1: z.string(),
          value2: z.string(),
          value3: z.string(),
          customValue: z.string().optional(), // 사용자가 추가한 커스텀 가치 (선택적)
        })
      )
      .mutation(async ({ input }) => {
        // input 을 찍지 않는다 — 이름·이메일·가치 3개가 그대로 들어 있다(docs/04 §4.3).
        try {
          await saveValuesAssessment(input);
          return { success: true };
        } catch (error) {
          console.error('[SERVER] 결과 저장 실패:', error);
          throw error;
        }
      }),

    /**
     * Get all values assessment results (admin)
     */
    getAll: adminProcedure
      .query(async () => {
        return await getAllValuesAssessments();
      }),

    /**
     * Get assessments by email
     *
     * **아직 공개 프로시저다.** 참여자가 세션 없이 부르는 유일한 조회라 잠그면 이력 화면이 죽는다.
     * 소유권 검증 방식(이메일 인증 링크·조회 토큰·로그인 강제)은 개인정보 수집 방식 결정과 함께
     * 정해야 한다(UPGRADE_PLAN §6.1). 그때까지의 완화로 반환 컬럼을 최소로 좁혀 두었다
     * (server/db.ts — 이메일은 되돌려 주지 않는다).
     */
    getByEmail: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .query(async ({ input }) => {
        return await getValuesAssessmentsByEmail(input.email);
      }),

    /**
     * Delete a single assessment (admin)
     */
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteValuesAssessment(input.id);
        return { success: true };
      }),

    /**
     * Delete multiple assessments (admin)
     */
    deleteMany: adminProcedure
      .input(z.object({ ids: z.array(z.number()) }))
      .mutation(async ({ input }) => {
        await deleteValuesAssessments(input.ids);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
