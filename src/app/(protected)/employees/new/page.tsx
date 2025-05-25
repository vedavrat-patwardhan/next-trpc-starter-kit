'use client';

import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '~/trpc/react';
import { PERMISSIONS } from '~/config/permissions';
import { usePermission } from '~/hooks/usePermission';
import { createEmployeeSchema } from '~/schemas/employee.schema'; // Adjust path if needed
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { DatePicker } from '~/components/DatePicker'; // Assuming DatePicker component exists
import { toast } from '~/components/ui/use-toast';
import { Loader } from '~/components/Loader';
import { ArrowLeftIcon } from 'lucide-react';

type CreateEmployeeFormData = z.infer<typeof createEmployeeSchema>;

const CreateEmployeePage: React.FC = () => {
  const router = useRouter();
  const { hasPermission } = usePermission();
  const canCreateEmployee = hasPermission(PERMISSIONS.EMPLOYEE_CREATE);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
  } = useForm<CreateEmployeeFormData>({
    resolver: zodResolver(createEmployeeSchema),
    defaultValues: {
      // Initialize default values for controlled components if needed
      firstName: '',
      lastName: '',
      email: '',
      jobTitle: '',
      hireDate: undefined, // Or new Date() if you want today as default
      // departmentId: null, // react-hook-form handles undefined better for selects
      // reportingToId: null,
    },
  });

  // Fetch departments for select dropdown
  // TODO: Replace with actual department API call if available
  const { data: departments, isLoading: isLoadingDepartments } = api.employee.list.useQuery({pageSize: 100}); // Mock, replace
  
  // Fetch employees for "Reporting To" select dropdown
  const { data: employeesForReporting, isLoading: isLoadingEmployeesForReporting } = api.employee.list.useQuery({
    pageSize: 1000, // Fetch a large list, or implement search/pagination for this select
    isActive: true, // Typically report to active employees
  });

  const createEmployeeMutation = api.employee.create.useMutation({
    onSuccess: (data) => {
      toast({
        title: 'Employee Created',
        description: `${data.firstName} ${data.lastName} has been successfully created.`,
      });
      router.push('/employees'); // Redirect to employee list page
    },
    onError: (error) => {
      toast({
        title: 'Error Creating Employee',
        description: error.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: CreateEmployeeFormData) => {
    // Ensure optional fields that are empty strings are converted to null/undefined if schema expects that
    const payload = {
        ...data,
        phoneNumber: data.phoneNumber || undefined,
        dateOfBirth: data.dateOfBirth || null,
        departmentId: data.departmentId || null,
        reportingToId: data.reportingToId || null,
        profilePictureUrl: data.profilePictureUrl || null,
        address: data.address ? {
            street: data.address.street || undefined,
            city: data.address.city || undefined,
            state: data.address.state || undefined,
            zipCode: data.address.zipCode || undefined,
            country: data.address.country || undefined,
        } : null,
        gender: data.gender || null,
        emergencyContact: data.emergencyContact ? {
            name: data.emergencyContact.name || undefined,
            relationship: data.emergencyContact.relationship || undefined,
            phone: data.emergencyContact.phone || undefined,
        } : null,
    };
    createEmployeeMutation.mutate(payload);
  };

  if (!canCreateEmployee) {
    // This should ideally be handled by route protection or a higher-order component
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <p className="text-xl text-muted-foreground">You do not have permission to create employees.</p>
        <Button onClick={() => router.push('/employees')} className="mt-4">Back to Employee List</Button>
      </div>
    );
  }
  
  // Example of setting a value, useful for date pickers or other custom components
  useEffect(() => {
    // setValue('hireDate', new Date()); // Example: Set default hire date
  }, [setValue]);

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 max-w-2xl">
      <div className="mb-6">
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeftIcon className="mr-2 h-4 w-4" /> Back to Employee List
        </Button>
      </div>
      <h1 className="text-3xl font-bold mb-8">Add New Employee</h1>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Info Section */}
        <div className="p-6 border rounded-lg bg-background shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name</Label>
              <Controller
                name="firstName"
                control={control}
                render={({ field }) => <Input id="firstName" {...field} />}
              />
              {errors.firstName && <p className="text-sm text-red-500 mt-1">{errors.firstName.message}</p>}
            </div>
            <div>
              <Label htmlFor="lastName">Last Name</Label>
              <Controller
                name="lastName"
                control={control}
                render={({ field }) => <Input id="lastName" {...field} />}
              />
              {errors.lastName && <p className="text-sm text-red-500 mt-1">{errors.lastName.message}</p>}
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Controller
                name="email"
                control={control}
                render={({ field }) => <Input id="email" type="email" {...field} />}
              />
              {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <Label htmlFor="phoneNumber">Phone Number (Optional)</Label>
              <Controller
                name="phoneNumber"
                control={control}
                render={({ field }) => <Input id="phoneNumber" {...field} value={field.value ?? ''} />}
              />
              {errors.phoneNumber && <p className="text-sm text-red-500 mt-1">{errors.phoneNumber.message}</p>}
            </div>
            <div>
              <Label htmlFor="dateOfBirth">Date of Birth (Optional)</Label>
              <Controller
                name="dateOfBirth"
                control={control}
                render={({ field }) => <DatePicker date={field.value || undefined} onDateChange={field.onChange} />}
              />
              {errors.dateOfBirth && <p className="text-sm text-red-500 mt-1">{errors.dateOfBirth.message}</p>}
            </div>
             <div>
              <Label htmlFor="gender">Gender (Optional)</Label>
              <Controller
                name="gender"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value ?? ''}>
                    <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                      <SelectItem value="PreferNotToSay">Prefer Not To Say</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.gender && <p className="text-sm text-red-500 mt-1">{errors.gender.message}</p>}
            </div>
          </div>
        </div>

        {/* Employment Details Section */}
        <div className="p-6 border rounded-lg bg-background shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Employment Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="jobTitle">Job Title</Label>
              <Controller
                name="jobTitle"
                control={control}
                render={({ field }) => <Input id="jobTitle" {...field} />}
              />
              {errors.jobTitle && <p className="text-sm text-red-500 mt-1">{errors.jobTitle.message}</p>}
            </div>
            <div>
              <Label htmlFor="hireDate">Hire Date</Label>
              <Controller
                name="hireDate"
                control={control}
                render={({ field }) => <DatePicker date={field.value} onDateChange={field.onChange} required />}
              />
              {errors.hireDate && <p className="text-sm text-red-500 mt-1">{errors.hireDate.message}</p>}
            </div>
            <div>
              <Label htmlFor="departmentId">Department (Optional)</Label>
              <Controller
                name="departmentId"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value ?? ''} disabled={isLoadingDepartments}>
                    <SelectTrigger>
                      <SelectValue placeholder={isLoadingDepartments ? "Loading..." : "Select department"} />
                    </SelectTrigger>
                    <SelectContent>
                      {departments?.items?.map(dep => <SelectItem key={dep.employeeId} value={dep.employeeId}>{dep.firstName} {dep.lastName} (Mocked)</SelectItem>)}
                      {/* Replace above with actual department data when available */}
                      {/* {departments?.map(dep => <SelectItem key={dep.departmentId} value={dep.departmentId}>{dep.name}</SelectItem>)} */}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.departmentId && <p className="text-sm text-red-500 mt-1">{errors.departmentId.message}</p>}
            </div>
            <div>
              <Label htmlFor="reportingToId">Reporting To (Optional)</Label>
              <Controller
                name="reportingToId"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value ?? ''} disabled={isLoadingEmployeesForReporting}>
                    <SelectTrigger>
                      <SelectValue placeholder={isLoadingEmployeesForReporting ? "Loading..." : "Select manager"} />
                    </SelectTrigger>
                    <SelectContent>
                      {employeesForReporting?.items?.map(emp => (
                        <SelectItem key={emp.employeeId} value={emp.employeeId}>
                          {emp.firstName} {emp.lastName} ({emp.jobTitle})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.reportingToId && <p className="text-sm text-red-500 mt-1">{errors.reportingToId.message}</p>}
            </div>
          </div>
        </div>
        
        {/* TODO: Add sections for Address and Emergency Contact if needed, similar structure */}

        <div className="flex justify-end space-x-3">
          <Button type="button" variant="outline" onClick={() => router.push('/employees')} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || isLoadingDepartments || isLoadingEmployeesForReporting}>
            {isSubmitting ? <Loader text="Saving..." /> : 'Create Employee'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CreateEmployeePage;
