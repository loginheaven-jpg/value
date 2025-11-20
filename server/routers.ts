import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
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
        console.log('[SERVER] values.save mutation 호출됨:', input);
        try {
          const result = await saveValuesAssessment(input);
          console.log('[SERVER] DB 저장 성공:', result);
          return { success: true };
        } catch (error) {
          console.error('[SERVER] DB 저장 실패:', error);
          throw error;
        }
      }),

    /**
     * Get all values assessment results (admin)
     */
    getAll: publicProcedure
      .query(async () => {
        return await getAllValuesAssessments();
      }),

    /**
     * Get assessments by email
     */
    getByEmail: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .query(async ({ input }) => {
        return await getValuesAssessmentsByEmail(input.email);
      }),

    /**
     * Delete a single assessment (admin)
     */
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteValuesAssessment(input.id);
        return { success: true };
      }),

    /**
     * Delete multiple assessments (admin)
     */
    deleteMany: publicProcedure
      .input(z.object({ ids: z.array(z.number()) }))
      .mutation(async ({ input }) => {
        await deleteValuesAssessments(input.ids);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
