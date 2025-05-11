export const PERMISSIONS = {
  // User permissions
  USER_MANAGE: 'user:manage',
  USER_VIEW: 'user:view',

  // Organization permissions
  ORG_MANAGE: 'organization:manage',
  ORG_VIEW: 'organization:view',

  // Professional permissions
  PROF_MANAGE: 'professional:manage',
  PROF_VIEW: 'professional:view',

  // Job permissions
  JOB_MANAGE: 'job:manage',
  JOB_VIEW: 'job:view',

  // Application permissions
  APPLICATION_MANAGE: 'application:manage',
  APPLICATION_VIEW: 'application:view',

  // Form permissions
  FORM_MANAGE: 'form:manage',
  FORM_VIEW: 'form:view',
} as const;

export const roleMap = {
  SUPER_ADMIN: [
    PERMISSIONS.USER_MANAGE,
    PERMISSIONS.ORG_MANAGE,
    PERMISSIONS.PROF_MANAGE,
    PERMISSIONS.JOB_MANAGE,
    PERMISSIONS.APPLICATION_MANAGE,
    PERMISSIONS.FORM_MANAGE,
  ],
  ORGANIZATION_ADMIN: [
    PERMISSIONS.ORG_MANAGE,
    PERMISSIONS.JOB_MANAGE,
    PERMISSIONS.APPLICATION_VIEW,
    PERMISSIONS.FORM_VIEW,
  ],
  PROFESSIONAL: [
    PERMISSIONS.PROF_VIEW,
    PERMISSIONS.JOB_VIEW,
    PERMISSIONS.APPLICATION_MANAGE,
  ],
};
