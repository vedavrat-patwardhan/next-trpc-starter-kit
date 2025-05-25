import { z } from 'zod';
import {
  createTRPCRouter,
  permissionProtectedProcedure,
  publicProcedure, // For getById, will add custom logic
} from '~/app/server/trpc';
import { prisma } from '~/app/server/db';
import { PERMISSIONS } from '~/config/permissions';
import {
  createEmployeeSchema,
  updateEmployeeSchema,
  listEmployeesSchema,
} from '~/schemas/employee.schema'; // Adjust path as necessary
import { TRPCError } from '@trpc/server';
// import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
// import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Placeholder for S3 client, replace with actual initialization
// const s3Client = new S3Client({
//   region: process.env.AWS_S3_REGION,
//   credentials: {
//     accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
//     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
//   },
// });
// const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;

export const employeeRouter = createTRPCRouter({
  create: permissionProtectedProcedure(PERMISSIONS.EMPLOYEE_CREATE)
    .input(createEmployeeSchema)
    .mutation(async ({ input, ctx }) => {
      const organizationId = ctx.session?.user?.organizationId;
      if (!organizationId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Organization ID missing from session.' });
      }

      const { email } = input;
      // Check if employee with the same email already exists within the organization
      const existingEmployee = await prisma.employee.findFirst({ 
        where: { email, organizationId } 
      });
      if (existingEmployee) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: `An employee with email ${email} already exists in this organization.`,
        });
      }
      return prisma.employee.create({
        data: {
          ...input,
          organizationId, // Set organizationId for the new employee
          address: input.address ?? undefined,
          emergencyContact: input.emergencyContact ?? undefined,
          departmentId: input.departmentId ?? undefined,
          reportingToId: input.reportingToId ?? undefined,
        },
      });
    }),

  list: permissionProtectedProcedure(PERMISSIONS.EMPLOYEE_VIEW_ALL)
    .input(listEmployeesSchema)
    .query(async ({ input, ctx }) => {
      const organizationId = ctx.session?.user?.organizationId;
      if (!organizationId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Organization ID missing from session.' });
      }

      const { page = 1, pageSize = 10, sortBy = 'createdAt', sortOrder = 'desc', departmentId, isActive, search } = input;
      const skip = (page - 1) * pageSize;

      const whereClause: any = { organizationId }; // Always filter by organizationId
      if (departmentId) whereClause.departmentId = departmentId;
      if (isActive !== undefined && isActive !== null) whereClause.isActive = isActive;
      if (search) {
        whereClause.OR = [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { jobTitle: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [items, total] = await prisma.$transaction([
        prisma.employee.findMany({
          skip,
          take: pageSize,
          where: whereClause,
          orderBy: { [sortBy]: sortOrder },
          include: {
            department: true, 
            user: { 
              select: { userId: true, username: true, isActive: true }
            }
          },
        }),
        prisma.employee.count({ where: whereClause }),
      ]);
      return {
        items,
        total,
        totalPages: Math.ceil(total / pageSize),
        currentPage: page,
      };
    }),

  getById: publicProcedure // Protection logic is custom within the resolver
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const organizationId = ctx.session?.user?.organizationId;
      if (!organizationId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Organization ID missing from session.' });
      }

      const employee = await prisma.employee.findUnique({
        where: { employeeId: input.id },
        include: {
          department: true,
          user: { select: { userId: true, username: true, isActive: true, roleId: true } }, 
          manager: { select: { employeeId: true, firstName: true, lastName: true, email: true } }, 
          directReports: { select: { employeeId: true, firstName: true, lastName: true, email: true } }, 
        },
      });

      if (!employee) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Employee not found.' });
      }

      // Check if the employee belongs to the user's organization
      if (employee.organizationId !== organizationId) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'This employee does not belong to your organization.' });
      }

      // Permission check (already established they are in the same org)
      const hasViewAllPermission = ctx.session?.user.permissions?.includes(PERMISSIONS.EMPLOYEE_VIEW_ALL) ?? false;
      const isSelf = employee.user?.userId === ctx.session?.user.id;
      const hasViewSelfPermission = ctx.session?.user.permissions?.includes(PERMISSIONS.EMPLOYEE_VIEW_SELF) ?? false;

      if (hasViewAllPermission || (isSelf && hasViewSelfPermission)) {
        return employee;
      }
      
      throw new TRPCError({ code: 'FORBIDDEN', message: 'You do not have permission to view this employee.' });
    }),

  update: permissionProtectedProcedure(PERMISSIONS.EMPLOYEE_EDIT)
    .input(updateEmployeeSchema)
    .mutation(async ({ input, ctx }) => {
      const organizationId = ctx.session?.user?.organizationId;
      if (!organizationId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Organization ID missing from session.' });
      }

      const { employeeId, ...dataToUpdate } = input;
      
      // Verify employee belongs to user's organization before update
      const existingEmp = await prisma.employee.findUnique({ where: { employeeId }});
      if (!existingEmp || existingEmp.organizationId !== organizationId) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot update employee from another organization.'});
      }

      if (dataToUpdate.email) {
        const conflictingEmployee = await prisma.employee.findFirst({
            where: {
                email: dataToUpdate.email,
                organizationId, // Check within the same org
                NOT: { employeeId: employeeId } 
            }
        });
        if (conflictingEmployee) {
            throw new TRPCError({
                code: 'CONFLICT',
                message: `Another employee with email ${dataToUpdate.email} already exists in this organization.`,
            });
        }
      }

      return prisma.employee.update({
        where: { employeeId }, // employeeId is globally unique
        data: {
          ...dataToUpdate,
          address: dataToUpdate.address === null ? null : (dataToUpdate.address ?? undefined),
          emergencyContact: dataToUpdate.emergencyContact === null ? null : (dataToUpdate.emergencyContact ?? undefined),
          departmentId: dataToUpdate.departmentId === null ? null : (dataToUpdate.departmentId ?? undefined),
          reportingToId: dataToUpdate.reportingToId === null ? null : (dataToUpdate.reportingToId ?? undefined),
        },
      });
    }),

  deactivate: permissionProtectedProcedure(PERMISSIONS.EMPLOYEE_DEACTIVATE)
    .input(z.object({ employeeId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const organizationId = ctx.session?.user?.organizationId;
      if (!organizationId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Organization ID missing from session.' });
      }
      
      const existingEmp = await prisma.employee.findUnique({ where: { employeeId: input.employeeId }});
      if (!existingEmp || existingEmp.organizationId !== organizationId) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot deactivate employee from another organization.'});
      }

      return prisma.employee.update({
        where: { employeeId: input.employeeId },
        data: { isActive: false },
      });
    }),
  
  // Placeholder for S3 presigned URL generation
  // Ensure employeeId check includes organizationId check
  getPresignedUrlForDocumentUpload: permissionProtectedProcedure(PERMISSIONS.EMPLOYEE_EDIT) // Or a more specific document permission
    .input(z.object({ employeeId: z.string(), fileName: z.string(), fileType: z.string() }))
    .mutation(async ({ input }) => {
      // const { employeeId, fileName, fileType } = input;
      // const key = `employee-documents/${employeeId}/${Date.now()}_${fileName}`;

      // if (!BUCKET_NAME) {
      //   throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'S3 bucket name not configured.' });
      // }

      // const command = new PutObjectCommand({
      //   Bucket: BUCKET_NAME,
      //   Key: key,
      //   ContentType: fileType,
      // });

      // try {
      //   const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // URL expires in 1 hour
      //   return { uploadUrl, key };
      // } catch (error) {
      //   console.error("Error generating presigned URL:", error);
      //   throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Could not generate upload URL.' });
      // }
      throw new TRPCError({ code: 'NOT_IMPLEMENTED', message: 'S3 upload not yet implemented.' });
    }),
});
