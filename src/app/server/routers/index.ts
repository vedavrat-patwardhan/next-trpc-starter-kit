import { router } from '~/app/server/trpc'; 
import { permissionRouter } from './permission';
import { roleRouter } from './role';
import { userRouter } from './user';
import { employeeRouter } from './employee';
import { salaryComponentRouter } from './salaryComponent';
import { salaryStructureRouter } from './salaryStructure';
import { salaryAssignmentRouter } from './salaryAssignment';
import { leaveTypeRouter } from './leaveType'; // Added leaveTypeRouter import
import { leaveApplicationRouter } from './leaveApplication'; // Added leaveApplicationRouter import
import { holidayRouter } from './holiday'; // Added holidayRouter import

export const appRouter = router({
  permission: permissionRouter,
  role: roleRouter,
  user: userRouter,
  employee: employeeRouter,
  salaryComponent: salaryComponentRouter,
  salaryStructure: salaryStructureRouter,
  salaryAssignment: salaryAssignmentRouter,
  leaveType: leaveTypeRouter,               // Added leaveTypeRouter
  leaveApplication: leaveApplicationRouter, // Added leaveApplicationRouter
  holiday: holidayRouter,                   // Added holidayRouter
  // Add other routers here
});

export type AppRouter = typeof appRouter;
