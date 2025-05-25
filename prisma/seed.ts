import { PrismaClient } from '@prisma/client';
import { PERMISSIONS, roleMap } from '../src/config/permissions'; 
import bcrypt from 'bcryptjs'; // For hashing user passwords

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seeding process...');

  // 1. Create a Default Organization
  const defaultOrganization = await prisma.organization.upsert({
    where: { organizationId: 'default-org-id' }, // Use a fixed ID for easy reference if needed
    update: { name: 'Default Organization' },
    create: {
      organizationId: 'default-org-id',
      name: 'Default Organization',
    },
  });
  console.log(`Upserted Default Organization: ${defaultOrganization.name} (ID: ${defaultOrganization.organizationId})`);

  // 2. Seed Permissions
  const allPermissionValues = Object.values(PERMISSIONS);
  console.log(`Found ${allPermissionValues.length} unique permission codes to seed.`);
  for (const permCode of allPermissionValues) {
    const [group, action] = permCode.split(':');
    const description = `${action ? action.charAt(0).toUpperCase() + action.slice(1) : 'Manage'} ${group.replace(/_/g, ' ')}`;
    await prisma.permission.upsert({
      where: { name: permCode },
      update: { description },
      create: {
        name: permCode,
        group: group || 'general',
        description: description,
      },
    });
  }
  console.log('Permissions seeded successfully.');

  // 3. Seed Roles and RolePermissionMappings
  const roles = Object.keys(roleMap) as Array<keyof typeof roleMap>;
  console.log(`Found ${roles.length} roles to seed.`);
  const seededRoles: Record<string, string> = {}; // To store roleName: roleId

  for (const roleName of roles) {
    const rolePermissions = roleMap[roleName];
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: {
        name: roleName,
        description: `${roleName} role`,
      },
    });
    seededRoles[roleName] = role.roleId;
    console.log(`Upserted role: ${role.name} (ID: ${role.roleId})`);

    if (rolePermissions && rolePermissions.length > 0) {
      const permissionRecords = await prisma.permission.findMany({
        where: { name: { in: rolePermissions } },
      });
      await prisma.rolePermissionMapping.deleteMany({ where: { roleId: role.roleId } });
      const mappingsToCreate = permissionRecords.map((permission) => ({
        roleId: role.roleId,
        permissionId: permission.permissionId,
      }));
      if (mappingsToCreate.length > 0) {
        await prisma.rolePermissionMapping.createMany({ data: mappingsToCreate });
        console.log(`Created ${mappingsToCreate.length} permission mappings for role: ${role.name}`);
      }
    }
  }
  console.log('Roles and RolePermissionMappings seeded successfully.');

  // 4. Seed Sample Users (associated with the default organization and roles)
  const usersToSeed = [
    {
      username: 'admin_user',
      email: 'admin@example.com',
      password: 'password123',
      roleName: 'ADMIN', // Ensure this roleName matches a key in your roleMap
    },
    {
      username: 'hr_user',
      email: 'hr@example.com',
      password: 'password123',
      roleName: 'HR',
    },
    {
      username: 'employee_user',
      email: 'employee@example.com',
      password: 'password123',
      roleName: 'EMPLOYEE',
    },
  ];

  console.log(`Seeding ${usersToSeed.length} sample users...`);
  for (const userData of usersToSeed) {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const roleId = seededRoles[userData.roleName];
    if (!roleId) {
      console.warn(`Role ${userData.roleName} not found for user ${userData.username}. Skipping user.`);
      continue;
    }

    await prisma.user.upsert({
      where: { email: userData.email },
      update: {
        username: userData.username,
        passwordHash: hashedPassword,
        roleId: roleId,
        organizationId: defaultOrganization.organizationId,
        isActive: true,
      },
      create: {
        username: userData.username,
        email: userData.email,
        passwordHash: hashedPassword,
        roleId: roleId,
        organizationId: defaultOrganization.organizationId,
        isActive: true,
      },
    });
    console.log(`Upserted user: ${userData.username} with role ${userData.roleName}`);
  }
  console.log('Sample users seeded successfully.');
  
  // 5. Seed other organization-specific entities (example: Department)
  await prisma.department.upsert({
    where: { organizationId_name: { organizationId: defaultOrganization.organizationId, name: 'General' } },
    update: {},
    create: {
      name: 'General',
      description: 'General Department',
      organizationId: defaultOrganization.organizationId,
    },
  });
  console.log('Seeded General Department for default organization.');

  // Example: Seed a default PayrollConfig for the organization
  await prisma.payrollConfig.upsert({
      where: { organizationId: defaultOrganization.organizationId },
      update: { payFrequency: "MONTHLY" }, // Example update
      create: {
        organizationId: defaultOrganization.organizationId,
        payFrequency: "MONTHLY",
        currency: "USD",
        taxCalculationMethod: "PROGRESSIVE", // Example
      }
  });
  console.log('Seeded PayrollConfig for default organization.');
  
  // Example: Seed default Leave Types for the organization
  const defaultLeaveTypes = [
      { name: "Annual Leave", defaultDays: 20, isPaid: true },
      { name: "Sick Leave", defaultDays: 10, isPaid: true },
      { name: "Unpaid Leave", defaultDays: 0, isPaid: false },
  ];
  for(const lt of defaultLeaveTypes) {
      await prisma.leaveType.upsert({
          where: { organizationId_name: { organizationId: defaultOrganization.organizationId, name: lt.name } },
          update: { defaultDays: lt.defaultDays, isPaid: lt.isPaid },
          create: {
              ...lt,
              organizationId: defaultOrganization.organizationId,
          }
      });
  }
  console.log('Seeded default Leave Types for default organization.');


  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
