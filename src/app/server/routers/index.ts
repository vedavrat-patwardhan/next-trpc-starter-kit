import { router } from '~/app/server/trpc'; 
import { permissionRouter } from './permission';
import { roleRouter } from './role';
import { userRouter } from './user';
import { employeeRouter } from './employee';
import { salaryComponentRouter } from './salaryComponent';
import { salaryStructureRouter } from './salaryStructure';
import { salaryAssignmentRouter } from './salaryAssignment';
import { leaveTypeRouter } from './leaveType';
import { leaveApplicationRouter } from './leaveApplication';
import { holidayRouter } from './holiday';
import { attendanceRouter } from './attendance';
import { dashboardRouter } from './dashboard'; // Added dashboardRouter import

export const appRouter = router({
  permission: permissionRouter,
  role: roleRouter,
  user: userRouter,
  employee: employeeRouter,
  salaryComponent: salaryComponentRouter,
  salaryStructure: salaryStructureRouter,
  salaryAssignment: salaryAssignmentRouter,
  leaveType: leaveTypeRouter,
  leaveApplication: leaveApplicationRouter,
  holiday: holidayRouter,
  attendance: attendanceRouter,
  dashboard: dashboardRouter, // Added dashboardRouter
  // Add other routers here
});

export type AppRouter = typeof appRouter;
