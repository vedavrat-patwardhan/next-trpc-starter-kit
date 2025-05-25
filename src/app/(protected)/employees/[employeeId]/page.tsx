'use client';

import React, { useState } from 'react'; // Added useState
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '~/trpc/react';
import { usePermission } from '~/hooks/usePermission';
import { PERMISSIONS } from '~/config/permissions';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '~/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';
import { Loader } from '~/components/Loader';
import { toast } from '~/components/ui/use-toast';
import { 
  ArrowLeftIcon, Edit3Icon, Trash2Icon, UserCircle2Icon, BriefcaseIcon, 
  BuildingIcon, PhoneIcon, MailIcon, CalendarDaysIcon, UserCheck2Icon, 
  UserX2Icon, DollarSignIcon, HistoryIcon, BadgePercentIcon, PencilLineIcon
} from 'lucide-react';
import { format } from 'date-fns';
import SalaryAssignmentModal from '~/components/employees/SalaryAssignmentModal'; // Import the modal
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table';
import type { SalaryAssignment, SalaryStructure as PrismaSalaryStructure } from '@prisma/client';

// Define a type that includes the salaryStructure relation
interface SalaryAssignmentWithStructure extends SalaryAssignment {
  salaryStructure: PrismaSalaryStructure | null;
}
interface SalaryAssignmentWithFullStructure extends SalaryAssignment {
  salaryStructure: (PrismaSalaryStructure & {
    componentMappings: ({ salaryComponent: { name: string, type: string, calculationType: string }})[]
  }) | null;
}


const EmployeeDetailPage: React.FC = () => {
  const router = useRouter();
  const params = useParams();
  const employeeId = params.employeeId as string;

  const { hasPermission } = usePermission();
  const canEditEmployee = hasPermission(PERMISSIONS.EMPLOYEE_EDIT);
  const canDeactivateEmployee = hasPermission(PERMISSIONS.EMPLOYEE_DEACTIVATE);
  const canManageSalaryAssignment = hasPermission(PERMISSIONS.SALARY_ASSIGN_MANAGE);

  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);

  const { data: employee, isLoading: isLoadingEmployee, error: employeeError, refetch: refetchEmployee } = api.employee.getById.useQuery(
    { id: employeeId },
    { enabled: !!employeeId }
  );

  const { 
    data: activeAssignment, 
    isLoading: isLoadingActiveAssignment, 
    refetch: refetchActiveAssignment 
  } = api.salaryAssignment.getActiveAssignmentForEmployee.useQuery(
    { employeeId },
    { enabled: !!employeeId }
  );
  
  const { 
    data: assignmentHistory, 
    isLoading: isLoadingAssignmentHistory, 
    refetch: refetchAssignmentHistory 
  } = api.salaryAssignment.getAssignmentsForEmployee.useQuery(
    { employeeId },
    { enabled: !!employeeId }
  );

  const handleAssignmentSuccess = () => {
    refetchActiveAssignment();
    refetchAssignmentHistory();
  };

  const deactivateMutation = api.employee.deactivate.useMutation({
    onSuccess: () => {
      toast({ title: 'Employee Deactivated', description: 'The employee has been successfully deactivated.' });
      refetchEmployee(); 
    },
    onError: (err) => {
      toast({
        title: 'Deactivation Failed',
        description: err.message || 'Could not deactivate employee.',
        variant: 'destructive',
      });
    },
  });

  const handleDeactivate = () => {
    if (window.confirm('Are you sure you want to deactivate this employee?')) {
      deactivateMutation.mutate({ employeeId });
    }
  };
  
  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase();
  };

  if (isLoadingEmployee) return <Loader text="Loading employee details..." />;
  if (employeeError) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <p className="text-xl text-red-500 mb-4">Error: {employeeError.message}</p>
        <Button onClick={() => router.push('/employees')} className="mt-4">Back to Employee List</Button>
      </div>
    );
  }
  if (!employee) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <p className="text-xl text-muted-foreground">Employee not found.</p>
        <Button onClick={() => router.push('/employees')} className="mt-4">Back to Employee List</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 max-w-4xl">
      {/* Navigation and Actions */}
      <div className="mb-6 flex justify-between items-center">
        <Button variant="outline" size="sm" onClick={() => router.push('/employees')}>
          <ArrowLeftIcon className="mr-2 h-4 w-4" /> Back to Employee List
        </Button>
        <div className="space-x-2">
          {canEditEmployee && (
            <Button asChild variant="outline">
              <Link href={`/employees/${employeeId}/edit`}>
                <Edit3Icon className="mr-2 h-4 w-4" /> Edit Profile
              </Link>
            </Button>
          )}
          {canDeactivateEmployee && employee.isActive && (
            <Button variant="destructive" onClick={handleDeactivate} disabled={deactivateMutation.isLoading}>
              <Trash2Icon className="mr-2 h-4 w-4" /> Deactivate
            </Button>
          )}
        </div>
      </div>

      {/* Employee Info Card */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center space-x-4 pb-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={employee.profilePictureUrl ?? undefined} alt={`${employee.firstName} ${employee.lastName}`} />
            <AvatarFallback className="text-2xl">{getInitials(employee.firstName, employee.lastName)}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-3xl">{employee.firstName} {employee.lastName}</CardTitle>
            <CardDescription className="text-lg">{employee.jobTitle}</CardDescription>
            <span className={`mt-1 px-2 py-0.5 text-xs font-semibold rounded-full ${
              employee.isActive ? 'bg-green-100 text-green-700 dark:bg-green-700 dark:text-green-100' : 'bg-red-100 text-red-700 dark:bg-red-700 dark:text-red-100'
            }`}>
              {employee.isActive ? <><UserCheck2Icon className="inline h-3 w-3 mr-1"/>Active</> : <><UserX2Icon className="inline h-3 w-3 mr-1"/>Inactive</>}
            </span>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 pt-4 border-t">
          <InfoItem icon={<MailIcon />} label="Email" value={employee.email} />
          <InfoItem icon={<PhoneIcon />} label="Phone Number" value={employee.phoneNumber || 'N/A'} />
          <InfoItem icon={<CalendarDaysIcon />} label="Date of Birth" value={employee.dateOfBirth ? format(new Date(employee.dateOfBirth), 'PPP') : 'N/A'} />
          <InfoItem icon={<CalendarDaysIcon />} label="Hire Date" value={employee.hireDate ? format(new Date(employee.hireDate), 'PPP') : 'N/A'} />
          <InfoItem icon={<UserCircle2Icon />} label="Gender" value={employee.gender || 'N/A'} />
          <InfoItem icon={<BuildingIcon />} label="Department" value={employee.department?.name || 'N/A'} />
          <InfoItem icon={<BriefcaseIcon />} label="Reporting To" value={employee.manager ? `${employee.manager.firstName} ${employee.manager.lastName}` : 'N/A'} />
          <InfoItem icon={<UserCircle2Icon />} label="User Account" value={employee.user?.username || 'Not Linked'} />
        </CardContent>
      </Card>

      {/* Compensation Section */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row justify-between items-center">
          <div>
            <CardTitle>Compensation</CardTitle>
            <CardDescription>Current and historical salary assignments.</CardDescription>
          </div>
          {canManageSalaryAssignment && (
            <Button onClick={() => setIsAssignmentModalOpen(true)}>
              <PencilLineIcon className="mr-2 h-4 w-4" /> Assign / Update Structure
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isLoadingActiveAssignment && <Loader text="Loading active assignment..." />}
          {!isLoadingActiveAssignment && activeAssignment && (
            <div className="mb-6 p-4 border rounded-lg bg-muted/50">
              <h3 className="text-lg font-semibold mb-2 flex items-center">
                <DollarSignIcon className="mr-2 h-5 w-5 text-green-500" /> Active Salary Assignment
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <InfoItem label="Structure Name" value={activeAssignment.salaryStructure?.name} />
                <InfoItem label="Effective Date" value={format(new Date(activeAssignment.effectiveDate), 'PPP')} />
                <InfoItem label="Basic Salary" value={activeAssignment.basicSalary.toLocaleString(undefined, { style: 'currency', currency: 'USD' })} /> 
                {/* Replace USD with actual currency from org settings later */}
              </div>
              {activeAssignment.customValues && Object.keys(activeAssignment.customValues).length > 0 && (
                <div className="mt-3">
                  <h4 className="text-sm font-medium mb-1">Custom Overrides:</h4>
                  <pre className="text-xs p-2 bg-gray-100 dark:bg-gray-800 rounded-md overflow-x-auto">
                    {JSON.stringify(activeAssignment.customValues, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
          {!isLoadingActiveAssignment && !activeAssignment && (
            <p className="text-muted-foreground mb-4">No active salary assignment found for this employee.</p>
          )}

          <h3 className="text-lg font-semibold mb-3 flex items-center">
            <HistoryIcon className="mr-2 h-5 w-5 text-blue-500" /> Assignment History
          </h3>
          {isLoadingAssignmentHistory && <Loader text="Loading assignment history..." />}
          {!isLoadingAssignmentHistory && assignmentHistory && assignmentHistory.length > 0 ? (
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Structure Name</TableHead>
                    <TableHead>Effective Date</TableHead>
                    <TableHead>Basic Salary</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignmentHistory.map((assignment: SalaryAssignmentWithStructure) => (
                    <TableRow key={assignment.assignmentId}>
                      <TableCell>{assignment.salaryStructure?.name ?? 'N/A'}</TableCell>
                      <TableCell>{format(new Date(assignment.effectiveDate), 'PPP')}</TableCell>
                      <TableCell>{assignment.basicSalary.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          assignment.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {assignment.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            !isLoadingAssignmentHistory && <p className="text-muted-foreground">No assignment history found.</p>
          )}
        </CardContent>
      </Card>

      {/* Other sections like Address, Emergency Contact, Direct Reports remain the same */}
      {employee.address && (
        <Card className="mb-6">
          <CardHeader><CardTitle>Address</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            <InfoItem label="Street" value={(employee.address as any).street || 'N/A'} />
            <InfoItem label="City" value={(employee.address as any).city || 'N/A'} />
            <InfoItem label="State" value={(employee.address as any).state || 'N/A'} />
            <InfoItem label="Zip Code" value={(employee.address as any).zipCode || 'N/A'} />
            <InfoItem label="Country" value={(employee.address as any).country || 'N/A'} />
          </CardContent>
        </Card>
      )}

      {employee.emergencyContact && (
        <Card className="mb-6">
          <CardHeader><CardTitle>Emergency Contact</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            <InfoItem label="Name" value={(employee.emergencyContact as any).name || 'N/A'} />
            <InfoItem label="Relationship" value={(employee.emergencyContact as any).relationship || 'N/A'} />
            <InfoItem label="Phone" value={(employee.emergencyContact as any).phone || 'N/A'} />
          </CardContent>
        </Card>
      )}

      {employee.directReports && employee.directReports.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Direct Reports ({employee.directReports.length})</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {employee.directReports.map(report => (
                <li key={report.employeeId} className="text-sm p-2 border rounded-md hover:bg-muted/50">
                  <Link href={`/employees/${report.employeeId}`} className="block">
                    {report.firstName} {report.lastName} ({report.email})
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
      
      {/* Salary Assignment Modal */}
      {employee && (
        <SalaryAssignmentModal
          isOpen={isAssignmentModalOpen}
          onOpenChange={setIsAssignmentModalOpen}
          employee={employee}
          onAssignmentSuccess={handleAssignmentSuccess}
        />
      )}
    </div>
  );
};

interface InfoItemProps {
  icon?: React.ReactNode;
  label: string;
  value: string | undefined | null;
}

const InfoItem: React.FC<InfoItemProps> = ({ icon, label, value }) => (
  <div className="flex items-start space-x-3 mb-2"> {/* Added mb-2 for spacing */}
    {icon && <div className="flex-shrink-0 mt-1 text-muted-foreground">{React.cloneElement(icon as React.ReactElement, { className: "h-5 w-5" })}</div>}
    <div>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="text-md">{value || 'N/A'}</p>
    </div>
  </div>
);

export default EmployeeDetailPage;
