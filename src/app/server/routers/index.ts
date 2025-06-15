import { router } from '@/app/server/trpc';
import { adminRouter } from './admin';
import { hrRouter } from './hr';
import { employeeRouter } from './employee';
// Import sub-routers if they are meant to be merged here directly
// For now, adminRouter, hrRouter, employeeRouter are expected to be merged routers themselves
// or they would internally merge their sub-routers like userManagementRouter.

export const appRouter = router({
  admin: adminRouter,     // Namespace for admin routes
  hr: hrRouter,         // Namespace for HR routes
  employee: employeeRouter, // Namespace for employee routes
  // Add other top-level routers here if any
});

export type AppRouter = typeof appRouter;
