import { z } from 'zod';

export const createEmployeeSchema = z.object({
  firstName: z.string().min(1, { message: "First name is required" }),
  lastName: z.string().min(1, { message: "Last name is required" }),
  email: z.string().email({ message: "Invalid email address" }),
  phoneNumber: z.string().optional(),
  dateOfBirth: z.coerce.date().optional().nullable(), // coerce to allow string input from forms
  hireDate: z.coerce.date({ errorMap: () => ({ message: "Hire date is required and must be a valid date." })}),
  jobTitle: z.string().min(1, { message: "Job title is required" }),
  departmentId: z.string().optional().nullable(),
  reportingToId: z.string().optional().nullable(), // Manager's Employee ID
  profilePictureUrl: z.string().url().optional().nullable(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
    country: z.string().optional(),
  }).optional().nullable(),
  gender: z.string().optional().nullable(),
  emergencyContact: z.object({
    name: z.string().optional(),
    relationship: z.string().optional(),
    phone: z.string().optional(),
  }).optional().nullable(),
  // isActive is true by default in Prisma schema, not typically set on creation via form
});

export const updateEmployeeSchema = z.object({
  employeeId: z.string().min(1), // Required to identify the employee to update
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phoneNumber: z.string().optional().nullable(),
  dateOfBirth: z.coerce.date().optional().nullable(),
  hireDate: z.coerce.date().optional(),
  jobTitle: z.string().min(1).optional(),
  departmentId: z.string().optional().nullable(),
  reportingToId: z.string().optional().nullable(),
  profilePictureUrl: z.string().url().optional().nullable(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
    country: z.string().optional(),
  }).optional().nullable(),
  gender: z.string().optional().nullable(),
  emergencyContact: z.object({
    name: z.string().optional(),
    relationship: z.string().optional(),
    phone: z.string().optional(),
  }).optional().nullable(),
  isActive: z.boolean().optional(),
});

// Schema for listing employees with pagination, filtering, and sorting
export const listEmployeesSchema = z.object({
  page: z.number().min(1).default(1).optional(),
  pageSize: z.number().min(1).max(100).default(10).optional(),
  departmentId: z.string().optional().nullable(),
  isActive: z.boolean().optional().nullable(),
  sortBy: z.enum(['firstName', 'lastName', 'hireDate', 'createdAt']).default('createdAt').optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc').optional(),
  search: z.string().optional(), // For general text search
});
