import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { saveValuesAssessment, getAllValuesAssessments, getValuesAssessmentsByEmail } from "./db";

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
          email: z.string().email(),
          value1: z.string(),
          value2: z.string(),
          value3: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        await saveValuesAssessment(input);
        return { success: true };
      }),

    /**
     * Get all assessments (admin only - for now public for testing)
     */
    getAll: publicProcedure.query(async () => {
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
  }),
});

export type AppRouter = typeof appRouter;
