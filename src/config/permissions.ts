export const PERMISSIONS = {
  // User permissions (can be phased out or re-evaluated if User model is solely for app access)
  USER_MANAGE: 'user:manage', // Manages app users, not employees
  USER_VIEW: 'user:view',

  // Employee Management
  EMPLOYEE_CREATE: 'employee:create',
  EMPLOYEE_VIEW_ALL: 'employee:view_all', // View all employee profiles
  EMPLOYEE_VIEW_SELF: 'employee:view_self', // View own employee profile
  EMPLOYEE_EDIT: 'employee:edit', // Edit employee details
  EMPLOYEE_DEACTIVATE: 'employee:deactivate', // Deactivate employee records

  // Salary & Payroll Management
  SALARY_STRUCTURE_MANAGE: 'salary_structure:manage', // Create, update, delete salary structures
  SALARY_ASSIGN_MANAGE: 'salary_assign:manage', // Assign salary structures to employees
  PAYROLL_CONFIG_MANAGE: 'payroll_config:manage', // Manage payroll settings
  PAYROLL_RUN: 'payroll:run', // Initiate and process payroll
  PAYSLIP_VIEW_ALL: 'payslip:view_all', // View all employee payslips
  PAYSLIP_VIEW_SELF: 'payslip:view_self', // View own payslip

  // Leave Management
  LEAVE_TYPE_MANAGE: 'leave_type:manage', // Create, update, delete leave types
  LEAVE_APPLY: 'leave:apply', // Apply for leave
  LEAVE_APPROVE: 'leave:approve', // Approve or reject leave applications
  LEAVE_VIEW_ALL_APPLICATIONS: 'leave:view_all_applications', // View all leave applications

  // Attendance Management
  ATTENDANCE_MANAGE: 'attendance:manage', // Manage attendance records (e.g., manual entries, corrections)

  // Role & Permission Management
  ROLE_MANAGE: 'role:manage', // Manage roles and their permissions
  PERMISSION_VIEW: 'permission:view', // View available permissions in the system

  // General System / Admin
  ADMIN_DASHBOARD_VIEW: 'admin_dashboard:view', // View administrative dashboard

  // NOTE: Phasing out ORG, PROF, JOB, APPLICATION, FORM permissions
  // as they are not relevant to the Payroll system.
  // If these are part of a larger system, they can remain, but for Payroll focus:
  ORG_MANAGE: 'organization:manage', // Kept for potential top-level admin
  ORG_VIEW: 'organization:view',
} as const;

export const roleMap = {
  // SUPER_ADMIN role from previous setup, can be mapped to a more specific "SystemAdmin" or similar if needed
  // For now, let's assume this is the ultimate admin.
  SUPER_ADMIN: [
    PERMISSIONS.USER_MANAGE, // Manage app access
    PERMISSIONS.ORG_MANAGE, // If there's a concept of multiple orgs using the system
    PERMISSIONS.ROLE_MANAGE,
    PERMISSIONS.PERMISSION_VIEW,
    PERMISSIONS.ADMIN_DASHBOARD_VIEW,
    PERMISSIONS.EMPLOYEE_CREATE,
    PERMISSIONS.EMPLOYEE_VIEW_ALL,
    PERMISSIONS.EMPLOYEE_EDIT,
    PERMISSIONS.EMPLOYEE_DEACTIVATE,
    PERMISSIONS.SALARY_STRUCTURE_MANAGE,
    PERMISSIONS.SALARY_ASSIGN_MANAGE,
    PERMISSIONS.PAYROLL_CONFIG_MANAGE,
    PERMISSIONS.PAYROLL_RUN,
    PERMISSIONS.PAYSLIP_VIEW_ALL,
    PERMISSIONS.LEAVE_TYPE_MANAGE,
    PERMISSIONS.LEAVE_VIEW_ALL_APPLICATIONS, // Super admin might also approve, but HR is primary
    PERMISSIONS.LEAVE_APPROVE, // Super admin can also approve
    PERMISSIONS.ATTENDANCE_MANAGE,
  ],
  ADMIN: [ // Application Administrator
    PERMISSIONS.USER_MANAGE,
    PERMISSIONS.ROLE_MANAGE,
    PERMISSIONS.PERMISSION_VIEW,
    PERMISSIONS.ADMIN_DASHBOARD_VIEW,
    PERMISSIONS.EMPLOYEE_CREATE,
    PERMISSIONS.EMPLOYEE_VIEW_ALL,
    PERMISSIONS.EMPLOYEE_EDIT,
    PERMISSIONS.EMPLOYEE_DEACTIVATE,
    PERMISSIONS.SALARY_STRUCTURE_MANAGE,
    PERMISSIONS.SALARY_ASSIGN_MANAGE,
    PERMISSIONS.PAYROLL_CONFIG_MANAGE,
    PERMISSIONS.PAYROLL_RUN,
    PERMISSIONS.PAYSLIP_VIEW_ALL,
    PERMISSIONS.LEAVE_TYPE_MANAGE,
    PERMISSIONS.LEAVE_VIEW_ALL_APPLICATIONS,
    PERMISSIONS.LEAVE_APPROVE,
    PERMISSIONS.ATTENDANCE_MANAGE,
  ],
  HR: [ // Human Resources Role
    PERMISSIONS.EMPLOYEE_CREATE,
    PERMISSIONS.EMPLOYEE_VIEW_ALL,
    PERMISSIONS.EMPLOYEE_EDIT,
    PERMISSIONS.EMPLOYEE_DEACTIVATE,
    PERMISSIONS.SALARY_STRUCTURE_MANAGE, // May or may not manage structures, depends on org. Can view for sure.
    PERMISSIONS.SALARY_ASSIGN_MANAGE,
    PERMISSIONS.PAYROLL_CONFIG_MANAGE, // Typically HR would manage payroll configurations
    PERMISSIONS.PAYROLL_RUN,
    PERMISSIONS.PAYSLIP_VIEW_ALL,
    PERMISSIONS.LEAVE_TYPE_MANAGE,
    PERMISSIONS.LEAVE_APPROVE,
    PERMISSIONS.LEAVE_VIEW_ALL_APPLICATIONS,
    PERMISSIONS.ATTENDANCE_MANAGE,
    PERMISSIONS.PERMISSION_VIEW, // HR might need to see available permissions for context
    PERMISSIONS.ADMIN_DASHBOARD_VIEW, // HR specific dashboard view
  ],
  EMPLOYEE: [ // Standard Employee Role
    PERMISSIONS.EMPLOYEE_VIEW_SELF,
    PERMISSIONS.PAYSLIP_VIEW_SELF,
    PERMISSIONS.LEAVE_APPLY,
    // Potentially view own attendance if there's a module for it
  ],
  // ORGANIZATION_ADMIN and PROFESSIONAL roles from the old config are removed
  // as they don't fit the new Payroll system structure.
  // If this Payroll system is part of a larger platform where these roles exist,
  // they should be re-evaluated and their permissions updated accordingly.
};
