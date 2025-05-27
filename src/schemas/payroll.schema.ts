import { z } from 'zod';

// ===== PayrollStatus Enum =====
export const payrollStatusSchema = z.enum([
  'DRAFT',
  'PENDING_APPROVAL',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
]);
export type PayrollStatusType = z.infer<typeof payrollStatusSchema>;

// ===== PayslipLineItem Schema =====
export const payslipLineItemSchema = z.object({
  name: z.string().min(1, "Line item name is required"),
  type: z.enum(['EARNING', 'DEDUCTION']),
  amount: z.number().positive("Amount must be a positive number"), // Or .min(0) if zero amount is allowed
  componentId: z.string().optional(), // Optional: ID of the SalaryComponent
});
export type PayslipLineItem = z.infer<typeof payslipLineItemSchema>;

// ===== Payslip Schema =====
// Reflects the Payslip model, used for data transfer and validation.
// Fields like payslipId, payrollId, employeeId, generatedDate are often set by the backend.
export const payslipSchema = z.object({
  payslipId: z.string().cuid(),
  payrollId: z.string().cuid(),
  employeeId: z.string().cuid(), // Employee this payslip belongs to
  generatedDate: z.coerce.date(),
  fileUrl: z.string().url().optional().nullable(),
  earningsBreakdown: z.array(payslipLineItemSchema),
  deductionsBreakdown: z.array(payslipLineItemSchema),
  grossEarnings: z.number(),
  totalDeductions: z.number(),
  netPay: z.number(),
  summaryInfo: z.record(z.any()).optional().nullable(), // Flexible JSON for summary details like LOP days
  notes: z.string().optional().nullable(),
  organizationId: z.string().cuid(),
});
export type PayslipOutput = z.infer<typeof payslipSchema>; // For output/return types

// ===== Run Payroll Input Schema =====
// For initiating a new payroll run.
export const runPayrollInputSchema = z.object({
  payPeriodStart: z.coerce.date({ errorMap: () => ({ message: "Valid start date is required." }) }),
  payPeriodEnd: z.coerce.date({ errorMap: () => ({ message: "Valid end date is required." }) }),
  employeeIds: z.array(z.string().cuid()).optional(), // Optional: if empty, process for all eligible
  // organizationId is typically injected from session/context by the backend procedure
}).refine(data => data.payPeriodEnd >= data.payPeriodStart, {
  message: "Pay period end date cannot be before start date",
  path: ["payPeriodEnd"],
});
export type RunPayrollInput = z.infer<typeof runPayrollInputSchema>;

// ===== PayrollRun Schema =====
// Reflects the Payroll model, used for data transfer and validation.
export const payrollRunSchema = z.object({
  payrollId: z.string().cuid(),
  payPeriodStart: z.coerce.date(),
  payPeriodEnd: z.coerce.date(),
  paymentDate: z.coerce.date().optional().nullable(),
  status: payrollStatusSchema,
  processingLogs: z.record(z.any()).optional().nullable(), // Flexible JSON for logs
  organizationId: z.string().cuid(),
  // When fetching details, payslips might be included:
  // payslips: z.array(payslipSchema).optional(), 
});
export type PayrollRunOutput = z.infer<typeof payrollRunSchema>; // For output/return types

// ===== Payroll ID Schema =====
export const payrollIdSchema = z.object({
  payrollId: z.string().cuid({ message: "Valid Payroll ID is required" }),
});
export type PayrollIdInput = z.infer<typeof payrollIdSchema>;

// ===== List Payroll Input Schema =====
export const listPayrollInputSchema = z.object({
  status: payrollStatusSchema.optional(),
  startDate: z.coerce.date().optional(), // To filter by payPeriodStart or paymentDate
  endDate: z.coerce.date().optional(),   // To filter by payPeriodStart or paymentDate
  page: z.number().min(1).default(1).optional(),
  pageSize: z.number().min(1).max(100).default(10).optional(),
  // organizationId will be injected from session context
});
export type ListPayrollInput = z.infer<typeof listPayrollInputSchema>;


// ===== List My Payslips Input Schema =====
export const listMyPayslipsInputSchema = z.object({
    page: z.number().min(1).default(1).optional(),
    pageSize: z.number().min(1).max(50).default(10).optional(), // Max 50 for personal view
    payPeriodStart: z.coerce.date().optional(),
    payPeriodEnd: z.coerce.date().optional(),
    // employeeId will be injected from session context
});
export type ListMyPayslipsInput = z.infer<typeof listMyPayslipsInputSchema>;

// ===== Get Payslip Input Schema (for employee) =====
export const getPayslipInputSchema = z.object({
    payslipId: z.string().cuid({ message: "Valid Payslip ID is required" }),
    // employeeId will be injected from session context for validation
});
export type GetPayslipInput = z.infer<typeof getPayslipInputSchema>;

// ===== Email Payslip Input Schema =====
export const emailPayslipInputSchema = z.object({
    payslipId: z.string().cuid({ message: "Valid Payslip ID is required" }),
    // Potentially add email address if it can be different from employee's default
});
export type EmailPayslipInput = z.infer<typeof emailPayslipInputSchema>;

// ===== Approve Payroll Run Input Schema =====
// Currently just uses payrollId, but could be extended (e.g., approval comments)
export const approvePayrollRunInputSchema = payrollIdSchema;
export type ApprovePayrollRunInput = z.infer<typeof approvePayrollRunInputSchema>;
