'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { api } from '~/trpc/react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { usePermission } from '~/hooks/usePermission';
import { PERMISSIONS } from '~/config/permissions';
import { Loader } from '~/components/Loader'; // Assuming Loader component exists
import { toast } from '~/components/ui/use-toast';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusCircleIcon,
  Edit3Icon,
  EyeIcon,
  Trash2Icon,
} from 'lucide-react';
import Link from 'next/link';

const DEFAULT_PAGE_SIZE = 10;

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

const EmployeeListPage: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { hasPermission } = usePermission();

  const canCreateEmployee = hasPermission(PERMISSIONS.EMPLOYEE_CREATE);
  const canEditEmployee = hasPermission(PERMISSIONS.EMPLOYEE_EDIT);
  const canDeactivateEmployee = hasPermission(PERMISSIONS.EMPLOYEE_DEACTIVATE);
  const canViewAllEmployees = hasPermission(PERMISSIONS.EMPLOYEE_VIEW_ALL);

  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const [pageSize, setPageSize] = useState(Number(searchParams.get('pageSize')) || DEFAULT_PAGE_SIZE);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [departmentFilter, setDepartmentFilter] = useState(searchParams.get('departmentId') || '');
  // TODO: Add department list fetching for filter dropdown, e.g., api.department.list.useQuery();

  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const { data, isLoading, error, refetch } = api.employee.list.useQuery(
    {
      page,
      pageSize,
      search: debouncedSearchTerm,
      departmentId: departmentFilter || undefined,
      // TODO: Add sorting and status filter options from state
    },
    {
      enabled: canViewAllEmployees,
      keepPreviousData: true,
    }
  );

  useEffect(() => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));
    if (searchTerm) params.set('search', searchTerm);
    if (departmentFilter) params.set('departmentId', departmentFilter);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [page, pageSize, searchTerm, departmentFilter, router, pathname]);

  const deactivateMutation = api.employee.deactivate.useMutation({
    onSuccess: () => {
      toast({ title: 'Employee Deactivated', description: 'The employee has been successfully deactivated.' });
      refetch();
    },
    onError: (err) => {
      toast({
        title: 'Deactivation Failed',
        description: err.message || 'Could not deactivate employee.',
        variant: 'destructive',
      });
    },
  });

  const handleDeactivate = (employeeId: string) => {
    if (window.confirm('Are you sure you want to deactivate this employee?')) {
      deactivateMutation.mutate({ employeeId });
    }
  };

  if (!canViewAllEmployees && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <p className="text-xl text-muted-foreground">You do not have permission to view this page.</p>
        <Button onClick={() => router.push('/')} className="mt-4">Go to Dashboard</Button>
      </div>
    );
  }

  if (isLoading && !data) return <Loader text="Loading employees..." />;
  if (error) return <p className="text-red-500 p-4">Error loading employees: {error.message}</p>;

  const employees = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Employee Management</h1>
        {canCreateEmployee && (
          <Button asChild>
            <Link href="/employees/new">
              <PlusCircleIcon className="mr-2 h-5 w-5" /> Add New Employee
            </Link>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6 p-4 border rounded-lg bg-muted/40">
        <Input
          placeholder="Search by name, email, job..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setPage(1);
          }}
          className="lg:col-span-2"
        />
        {/* Replace with actual Select component for departments when API is ready */}
        <Input 
          placeholder="Filter by Department ID"
          value={departmentFilter}
          onChange={(e) => {
            setDepartmentFilter(e.target.value);
            setPage(1); 
          }}
        />
        {/* TODO: Add Select for Status (Active/Inactive) */}
        {/* TODO: Add Select for Sorting */}
      </div>

      <div className="bg-background shadow-md rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="hidden md:table-cell">Email</TableHead>
              <TableHead>Department</TableHead>
              <TableHead className="hidden lg:table-cell">Job Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.length > 0 ? (
              employees.map((employee) => (
                <TableRow key={employee.employeeId}>
                  <TableCell className="font-medium">{employee.firstName} {employee.lastName}</TableCell>
                  <TableCell className="hidden md:table-cell">{employee.email}</TableCell>
                  <TableCell>{employee.department?.name ?? 'N/A'}</TableCell>
                  <TableCell className="hidden lg:table-cell">{employee.jobTitle}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      employee.isActive ? 'bg-green-100 text-green-700 dark:bg-green-700 dark:text-green-100' : 'bg-red-100 text-red-700 dark:bg-red-700 dark:text-red-100'
                    }`}>
                      {employee.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button asChild variant="ghost" size="icon" title="View Details">
                      <Link href={`/employees/${employee.employeeId}`}>
                        <EyeIcon className="h-4 w-4" />
                      </Link>
                    </Button>
                    {canEditEmployee && (
                       <Button asChild variant="ghost" size="icon" title="Edit Employee">
                        <Link href={`/employees/${employee.employeeId}/edit`}>
                          <Edit3Icon className="h-4 w-4" />
                        </Link>
                      </Button>
                    )}
                    {canDeactivateEmployee && employee.isActive && (
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Deactivate Employee"
                        onClick={() => handleDeactivate(employee.employeeId)}
                        disabled={deactivateMutation.isLoading && deactivateMutation.variables?.employeeId === employee.employeeId}
                      >
                        <Trash2Icon className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                  No employees found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <Button
            variant="outline"
            onClick={() => setPage(prev => Math.max(prev - 1, 1))}
            disabled={page <= 1 || isLoading}
            size="sm"
          >
            <ChevronLeftIcon className="mr-1 h-4 w-4" /> Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
            disabled={page >= totalPages || isLoading}
            size="sm"
          >
            Next <ChevronRightIcon className="ml-1 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default EmployeeListPage;
