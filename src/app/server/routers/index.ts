import { router } from '@/app/server/trpc';

export const appRouter = router({
  // Add other routers here
});

export type AppRouter = typeof appRouter;
