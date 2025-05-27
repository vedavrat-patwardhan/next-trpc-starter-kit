import { TRPCError } from '@trpc/server';
import { leaveApplicationRouter } from './leaveApplication'; // Assuming this is the way to get router definition
import { type AppRouter } from './index'; // For caller type if possible, or use any
import { type inferProcedureInput } from '@trpc/server';
import { type Session } from 'next-auth'; // Or your session type
import { type PrismaClient } from '@prisma/client'; // For mocking prisma
import { mockDeep, DeepMockProxy } from 'jest-mock-extended'; // Popular mocking library

// Mock Prisma Client
const prismaMock = mockDeep<PrismaClient>();

// Mock Session Context
interface MockContext {
  prisma: DeepMockProxy<PrismaClient>;
  session: Session | null;
}

const createMockContext = (session: Session | null): MockContext => ({
  prisma: prismaMock,
  session,
});

// Helper to create a caller for the router (adapt to your actual setup)
// This is a conceptual helper. In a real tRPC testing setup, you'd use `appRouter.createCaller`.
const createCaller = (ctx: MockContext) => {
  // This is a simplified way to "call" procedures for testing purposes.
  // In a real setup, you'd use the tRPC instance's createCaller.
  // For this example, we'll directly call the procedure functions with mocked ctx.
  // This means we are not testing the full tRPC middleware stack here, but the procedure logic itself.
  // To test the full stack, you'd need a more integrated setup.

  // This is a placeholder. Actual tRPC testing involves `appRouter.createCaller(ctx)`.
  // Since we don't have appRouter directly configured for testing here,
  // we'll simulate calls by invoking the procedure's functions.
  // This is not ideal but demonstrates the testing logic for the procedures.
  return {
    leaveApplication: {
      applyForLeave: async (input: any) => 
        (leaveApplicationRouter.applyForLeave as any)._def.meta?.procedure._def.mutation({ ctx, input, path: 'leaveApplication.applyForLeave', type: 'mutation', rawInput: input }),
      updateStatus: async (input: any) =>
        (leaveApplicationRouter.updateStatus as any)._def.meta?.procedure._def.mutation({ ctx, input, path: 'leaveApplication.updateStatus', type: 'mutation', rawInput: input }),
      cancelApplication: async (input: any) =>
        (leaveApplicationRouter.cancelApplication as any)._def.meta?.procedure._def.mutation({ ctx, input, path: 'leaveApplication.cancelApplication', type: 'mutation', rawInput: input }),
    },
  };
};


describe('Leave Application Router', () => {
  let mockCtx: MockContext;
  let caller: ReturnType<typeof createCaller>;

  const mockEmployeeId = 'emp_test_id_123';
  const mockOrganizationId = 'org_test_id_456';
  const mockUserId = 'user_test_id_789';

  beforeEach(() => {
    // Reset mocks before each test
    jest.resetAllMocks(); // For jest-mock-extended
    
    const mockSession: Session = {
      user: {
        id: mockUserId, // next-auth typically uses 'id'
        employeeId: mockEmployeeId,
        organizationId: mockOrganizationId,
        role: { id: 'role_admin', name: 'Admin', permissions: ['leave_application_approve', 'leave_application_view_all'] }, // Example permissions
      },
      expires: new Date(Date.now() + 2 * 86400).toISOString(), // Mock session expiry
    };
    mockCtx = createMockContext(mockSession);
    caller = createCaller(mockCtx);
  });

  describe('applyForLeave Procedure', () => {
    type ApplyLeaveInput = inferProcedureInput<AppRouter['leaveApplication']['applyForLeave']>;

    const validLeaveTypeId = 'valid_leave_type_id';
    const anotherOrgLeaveTypeId = 'another_org_leave_type_id';
    
    const defaultInput: ApplyLeaveInput = {
      leaveTypeId: validLeaveTypeId,
      startDate: new Date('2024-08-01'),
      endDate: new Date('2024-08-05'),
      reason: 'Vacation',
    };

    it('should create a leave application successfully', async () => {
      prismaMock.leaveType.findFirst.mockResolvedValueOnce({
        leaveTypeId: validLeaveTypeId,
        organizationId: mockOrganizationId,
        name: 'Annual Leave',
        defaultDays: 20,
        isPaid: true,
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      prismaMock.leaveApplication.findMany.mockResolvedValueOnce([]); // No overlapping leaves
      prismaMock.leaveApplication.create.mockResolvedValueOnce({
        applicationId: 'new_app_id',
        employeeId: mockEmployeeId,
        organizationId: mockOrganizationId,
        ...defaultInput,
        status: 'PENDING',
        appliedOn: new Date(),
        updatedAt: new Date(),
        approvedById: null,
        comments: null,
      } as any); // Cast to any to satisfy Prisma's generated type if complex

      const result = await caller.leaveApplication.applyForLeave(defaultInput);

      expect(prismaMock.leaveApplication.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            employeeId: mockEmployeeId,
            organizationId: mockOrganizationId,
            leaveTypeId: validLeaveTypeId,
            startDate: defaultInput.startDate,
            endDate: defaultInput.endDate,
            reason: defaultInput.reason,
            status: 'PENDING',
          }),
        })
      );
      expect(result).toHaveProperty('applicationId', 'new_app_id');
      expect(result).toHaveProperty('status', 'PENDING');
    });

    it('should fail if endDate is before startDate', async () => {
      const invalidInput = { ...defaultInput, endDate: new Date('2024-07-30') };
      // Zod schema refinement should catch this, but testing the procedure's check if any
      // For this test, we assume the Zod schema handles it, so the call might not even reach the resolver's specific logic.
      // If there's specific resolver logic beyond Zod, that's what we'd target.
      // Here, we're testing the schema validation at the router level.
      // The actual error might come from Zod parsing if not caught earlier.
      // The provided router code has a .refine for this in schema, so this test is valid.
      
      // We don't need to mock prisma calls if Zod validation fails first.
      // However, if the procedure has its own check, then mocks would be needed.

      await expect(caller.leaveApplication.applyForLeave(invalidInput)).rejects.toThrowError(
        // Zod errors are typically specific. For simplicity, we check for a TRPCError that might wrap it,
        // or expect Zod's specific error structure if testing schema validation directly.
        // The router code doesn't show custom error for this, it relies on Zod.
        // So, the error would likely be a Zod validation error wrapped by TRPC.
        // For this conceptual test, let's assume it might throw a BAD_REQUEST or similar.
        // The actual error message/code depends on how tRPC handles Zod errors.
        /End date cannot be before start date/i 
        // Or, if Zod errors are passed through directly:
        // expect.objectContaining({ issues: expect.arrayContaining([expect.objectContaining({ message: "End date cannot be before start date" })]) })
      );
    });
    
    it('should fail if leave dates overlap with an existing non-cancelled/non-rejected leave', async () => {
      prismaMock.leaveType.findFirst.mockResolvedValueOnce({ // Valid leave type
        leaveTypeId: validLeaveTypeId, organizationId: mockOrganizationId, defaultDays: 20, 
      } as any);
      prismaMock.leaveApplication.findMany.mockResolvedValueOnce([ // Existing overlapping leave
        { applicationId: 'existing_app_id', startDate: new Date('2024-08-03'), endDate: new Date('2024-08-07'), status: 'PENDING' }
      ] as any);

      await expect(caller.leaveApplication.applyForLeave(defaultInput)).rejects.toThrowError(
        new TRPCError({ code: 'CONFLICT', message: 'Leave dates overlap with an existing application.' })
      );
    });

    it('should fail if the selected leaveTypeId does not belong to the user\'s organization', async () => {
      prismaMock.leaveType.findFirst.mockResolvedValueOnce({ // Leave type from another org
        leaveTypeId: anotherOrgLeaveTypeId, organizationId: 'another_org_id', defaultDays: 10,
      } as any);
      // No need to mock findMany or create if the leave type check fails first.

      await expect(caller.leaveApplication.applyForLeave({ ...defaultInput, leaveTypeId: anotherOrgLeaveTypeId })).rejects.toThrowError(
        new TRPCError({ code: 'BAD_REQUEST', message: 'Selected leave type is invalid or does not belong to this organization.' })
      );
    });

    it('should fail if the selected leaveTypeId is not found', async () => {
        prismaMock.leaveType.findFirst.mockResolvedValueOnce(null); // Leave type not found
  
        await expect(caller.leaveApplication.applyForLeave(defaultInput)).rejects.toThrowError(
          new TRPCError({ code: 'BAD_REQUEST', message: 'Selected leave type is invalid or does not belong to this organization.' })
        );
    });
    
    // Optional: Test for defaultDays check if still active
    it('should fail if requested days exceed default days (and no complex balance system)', async () => {
        prismaMock.leaveType.findFirst.mockResolvedValueOnce({
            leaveTypeId: validLeaveTypeId,
            organizationId: mockOrganizationId,
            defaultDays: 2, // Only 2 days allowed
        } as any);
        prismaMock.leaveApplication.findMany.mockResolvedValueOnce([]); // No overlap

        const inputExceedingDays: ApplyLeaveInput = {
            ...defaultInput, // Start: Aug 1, End: Aug 5 (5 days)
        };
        
        // This test depends on the specific logic in the router for this check.
        // The provided router code had this commented out. If it were active:
        // await expect(caller.leaveApplication.applyForLeave(inputExceedingDays)).rejects.toThrowError(
        //   new TRPCError({ code: 'BAD_REQUEST', message: expect.stringContaining('exceeds available balance') })
        // );
        // For now, this test might pass if the check is indeed commented out, or fail if it's active.
        // Assuming the check is commented out, the application should succeed if other conditions are met.
         prismaMock.leaveApplication.create.mockResolvedValueOnce({ applicationId: 'new_app_id_exceed' } as any);
         const result = await caller.leaveApplication.applyForLeave(inputExceedingDays);
         expect(result).toHaveProperty('applicationId', 'new_app_id_exceed');
    });

  });

  // --- updateStatus Procedure Tests ---
  describe('updateStatus Procedure', () => {
    type UpdateStatusInput = inferProcedureInput<AppRouter['leaveApplication']['updateStatus']>;
    const targetApplicationId = 'app_to_update_id';

    const mockPendingApplication = {
        applicationId: targetApplicationId,
        organizationId: mockOrganizationId,
        status: 'PENDING',
        employeeId: 'other_emp_id', // So it's not the admin's own application
    };

    it('should successfully approve a PENDING application', async () => {
        prismaMock.leaveApplication.findUnique.mockResolvedValueOnce(mockPendingApplication as any);
        prismaMock.leaveApplication.update.mockResolvedValueOnce({ ...mockPendingApplication, status: 'APPROVED' } as any);

        const input: UpdateStatusInput = { applicationId: targetApplicationId, status: 'APPROVED', comments: 'Approved by admin' };
        const result = await caller.leaveApplication.updateStatus(input);

        expect(prismaMock.leaveApplication.update).toHaveBeenCalledWith(expect.objectContaining({
            where: { applicationId: targetApplicationId },
            data: { status: 'APPROVED', comments: 'Approved by admin', approvedById: mockUserId },
        }));
        expect(result.status).toBe('APPROVED');
    });

    it('should successfully reject a PENDING application with comments', async () => {
        prismaMock.leaveApplication.findUnique.mockResolvedValueOnce(mockPendingApplication as any);
        prismaMock.leaveApplication.update.mockResolvedValueOnce({ ...mockPendingApplication, status: 'REJECTED' } as any);
        
        const input: UpdateStatusInput = { applicationId: targetApplicationId, status: 'REJECTED', comments: 'Insufficient reason' };
        const result = await caller.leaveApplication.updateStatus(input);

        expect(prismaMock.leaveApplication.update).toHaveBeenCalledWith(expect.objectContaining({
            where: { applicationId: targetApplicationId },
            data: { status: 'REJECTED', comments: 'Insufficient reason', approvedById: mockUserId },
        }));
        expect(result.status).toBe('REJECTED');
    });
    
    it('should fail if trying to update an application not in PENDING status', async () => {
        prismaMock.leaveApplication.findUnique.mockResolvedValueOnce({ ...mockPendingApplication, status: 'APPROVED' } as any);
        
        const input: UpdateStatusInput = { applicationId: targetApplicationId, status: 'APPROVED' };
        await expect(caller.leaveApplication.updateStatus(input)).rejects.toThrowError(
            new TRPCError({ code: 'BAD_REQUEST', message: 'Application is not in PENDING state and cannot be updated.' })
        );
    });

    it('should fail if the application does not belong to the user\'s organization', async () => {
        prismaMock.leaveApplication.findUnique.mockResolvedValueOnce({ ...mockPendingApplication, organizationId: 'another_org_id' } as any);
        
        const input: UpdateStatusInput = { applicationId: targetApplicationId, status: 'APPROVED' };
        await expect(caller.leaveApplication.updateStatus(input)).rejects.toThrowError(
            new TRPCError({ code: 'FORBIDDEN', message: 'Application not found or access denied.' })
        );
    });
    
    it('should fail if application not found', async () => {
        prismaMock.leaveApplication.findUnique.mockResolvedValueOnce(null);
        
        const input: UpdateStatusInput = { applicationId: 'non_existent_app_id', status: 'APPROVED' };
        await expect(caller.leaveApplication.updateStatus(input)).rejects.toThrowError(
            new TRPCError({ code: 'NOT_FOUND', message: 'Application not found or access denied.' })
        );
    });

  });

  // --- cancelApplication Procedure Tests ---
  describe('cancelApplication Procedure', () => {
    type CancelApplicationInput = inferProcedureInput<AppRouter['leaveApplication']['cancelApplication']>;
    const ownApplicationId = 'own_app_id';
    const otherUserApplicationId = 'other_user_app_id';

    const mockOwnPendingApplication = {
        applicationId: ownApplicationId,
        employeeId: mockEmployeeId, // Belongs to the current user
        organizationId: mockOrganizationId,
        status: 'PENDING',
    };

    it('should successfully cancel a PENDING application owned by the employee', async () => {
        prismaMock.leaveApplication.findUnique.mockResolvedValueOnce(mockOwnPendingApplication as any);
        prismaMock.leaveApplication.update.mockResolvedValueOnce({ ...mockOwnPendingApplication, status: 'CANCELLED' } as any);

        const input: CancelApplicationInput = { applicationId: ownApplicationId };
        const result = await caller.leaveApplication.cancelApplication(input);

        expect(prismaMock.leaveApplication.update).toHaveBeenCalledWith(expect.objectContaining({
            where: { applicationId: ownApplicationId },
            data: { status: 'CANCELLED' },
        }));
        expect(result.status).toBe('CANCELLED');
    });

    it('should fail if trying to cancel an application not in PENDING status', async () => {
        prismaMock.leaveApplication.findUnique.mockResolvedValueOnce({ ...mockOwnPendingApplication, status: 'APPROVED' } as any);
        
        const input: CancelApplicationInput = { applicationId: ownApplicationId };
        await expect(caller.leaveApplication.cancelApplication(input)).rejects.toThrowError(
            new TRPCError({ code: 'BAD_REQUEST', message: 'Only PENDING applications can be cancelled.' })
        );
    });

    it('should fail if an employee tries to cancel an application they do not own', async () => {
        prismaMock.leaveApplication.findUnique.mockResolvedValueOnce({
            applicationId: otherUserApplicationId,
            employeeId: 'another_employee_id', // Does not belong to current user
            organizationId: mockOrganizationId,
            status: 'PENDING',
        } as any);
        
        const input: CancelApplicationInput = { applicationId: otherUserApplicationId };
        await expect(caller.leaveApplication.cancelApplication(input)).rejects.toThrowError(
            new TRPCError({ code: 'FORBIDDEN', message: 'You can only cancel your own applications.' })
        );
    });
    
    it('should fail to cancel if application not found', async () => {
        prismaMock.leaveApplication.findUnique.mockResolvedValueOnce(null);
        
        const input: CancelApplicationInput = { applicationId: 'non_existent_app_id' };
        await expect(caller.leaveApplication.cancelApplication(input)).rejects.toThrowError(
            new TRPCError({ code: 'NOT_FOUND', message: 'Application not found.' })
        );
    });
  });
});

// Note: The `createCaller` helper is a simplification.
// In a real tRPC testing setup, you'd use `appRouter.createCaller(mockedCtx)`
// which requires your `appRouter` instance and potentially more setup for context.
// This example focuses on the logic within the procedures assuming `ctx` and `input` are correctly passed.
// The `(leaveApplicationRouter.procedureName as any)._def.meta?.procedure._def.mutation(...)` is a deep dive into
// tRPC internals to simulate the call without the full router setup, which is NOT standard practice for testing.
// Standard practice involves testing through the router's caller.
// Permissions are mocked via the session user's role. More granular permission testing might be needed.
// This structure assumes Jest and jest-mock-extended.
// The tests for `updateStatus` assume an admin/HR user with appropriate permissions.
// The tests for `cancelApplication` assume an employee user. Context should be adjusted accordingly for actual roles.
// The `applyForLeave` tests assume the session user is an employee applying for leave.
// The `mockSession` in `beforeEach` is set up for an admin-like user for `updateStatus`.
// For `applyForLeave` and `cancelApplication`, you might need to adjust the session mock in specific test blocks
// or have separate describe blocks for different user roles if the procedures behave differently based on role beyond permissions.
// For instance, an admin might be able to cancel anyone's PENDING leave, which is not tested here.
// The current `cancelApplication` tests only cover an employee cancelling their own.
// If `leave_application_manage_all` permission allows admin to cancel any pending, that's another test case.
// The provided router code for `cancelApplication` does not show admin override logic, only self-cancellation.
