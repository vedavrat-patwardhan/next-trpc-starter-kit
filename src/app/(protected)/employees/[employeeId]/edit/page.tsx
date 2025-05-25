'use client';

import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter, useParams } from 'next/navigation'; // useParams to get employeeId
import Link from 'next/link';
import { api } from '~/trpc/react';
import { PERMISSIONS } from '~/config/permissions';
import { usePermission } from '~/hooks/usePermission';
import { updateEmployeeSchema } from '~/schemas/employee.schema'; // Adjust path if needed
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { DatePicker } from '~/components/DatePicker'; // Assuming DatePicker component exists
import { Checkbox } from '~/components/ui/checkbox'; // For isActive
import { toast } from '~/components/ui/use-toast';
import { Loader } from '~/components/Loader';
import { ArrowLeftIcon } from 'lucide-react';

type UpdateEmployeeFormData = z.infer<typeof updateEmployeeSchema>;

const EditEmployeePage: React.FC = () => {
  const router = useRouter();
  const params = useParams();
  const employeeId = params.employeeId as string; // From route segment [employeeId]

  const { hasPermission } = usePermission();
  const canEditEmployee = hasPermission(PERMISSIONS.EMPLOYEE_EDIT);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset, // To populate form with fetched data
    setValue,
  } = useForm<UpdateEmployeeFormData>({
    resolver: zodResolver(updateEmployeeSchema),
    defaultValues: {
      employeeId: employeeId,
      // other fields will be populated from fetched data
    },
  });

  // Fetch existing employee data
  const { data: employeeData, isLoading: isLoadingEmployee, error: employeeError } = api.employee.getById.useQuery(
    { id: employeeId },
    {
      enabled: !!employeeId && canEditEmployee, // Only fetch if employeeId is available and user has permission
      onSuccess: (data) => {
        if (data) {
          // Populate form with fetched data
          reset({
            employeeId: data.employeeId,
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            phoneNumber: data.phoneNumber ?? undefined,
            dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
            hireDate: data.hireDate ? new Date(data.hireDate) : undefined,
            jobTitle: data.jobTitle,
            departmentId: data.departmentId ?? undefined,
            reportingToId: data.reportingToId ?? undefined,
            profilePictureUrl: data.profilePictureUrl ?? undefined,
            address: data.address ? {
                street: (data.address as any).street ?? undefined,
                city: (data.address as any).city ?? undefined,
                state: (data.address as any).state ?? undefined,
                zipCode: (data.address as any).zipCode ?? undefined,
                country: (data.address as any).country ?? undefined,
            } : undefined,
            gender: data.gender ?? undefined,
            emergencyContact: data.emergencyContact ? {
                name: (data.emergencyContact as any).name ?? undefined,
                relationship: (data.emergencyContact as any).relationship ?? undefined,
                phone: (data.emergencyContact as any).phone ?? undefined,
            } : undefined,
            isActive: data.isActive,
          });
        }
      },
    }
  );

  // Fetch departments for select dropdown
  const { data: departments, isLoading: isLoadingDepartments } = api.employee.list.useQuery({pageSize: 100}); // Mock, replace

  // Fetch employees for "Reporting To" select dropdown
  const { data: employeesForReporting, isLoading: isLoadingEmployeesForReporting } = api.employee.list.useQuery({
    pageSize: 1000,
    isActive: true,
  });

  const updateEmployeeMutation = api.employee.update.useMutation({
    onSuccess: (data) => {
      toast({
        title: 'Employee Updated',
        description: `${data.firstName} ${data.lastName} has been successfully updated.`,
      });
      router.push(`/employees/${data.employeeId}`); // Redirect to employee detail page
    },
    onError: (error) => {
      toast({
        title: 'Error Updating Employee',
        description: error.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: UpdateEmployeeFormData) => {
     const payload = {
        ...data,
        employeeId: employeeId, // ensure employeeId is part of the payload
        phoneNumber: data.phoneNumber || null,
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
    updateEmployeeMutation.mutate(payload);
  };

  if (!canEditEmployee && !isLoadingEmployee) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <p className="text-xl text-muted-foreground">You do not have permission to edit employees.</p>
        <Button onClick={() => router.push('/employees')} className="mt-4">Back to Employee List</Button>
      </div>
    );
  }

  if (isLoadingEmployee) return <Loader text="Loading employee data..." />;
  if (employeeError) return <p className="text-red-500 p-4">Error loading employee: {employeeError.message}</p>;
  if (!employeeData) return <p className="text-red-500 p-4">Employee not found.</p>;


  return (
    <div className="container mx-auto py-8 px-4 md:px-6 max-w-2xl">
      <div className="mb-6">
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeftIcon className="mr-2 h-4 w-4" /> Back
        </Button>
      </div>
      <h1 className="text-3xl font-bold mb-8">Edit Employee: {employeeData.firstName} {employeeData.lastName}</h1>
      
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
                render={({ field }) => <Input id="phoneNumber" {...field} value={field.value ?? ''}/>}
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
                  <Select onValueChange={field.onChange} value={field.value ?? ''}>
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
                render={({ field }) => <DatePicker date={field.value} onDateChange={field.onChange} />}
              />
              {errors.hireDate && <p className="text-sm text-red-500 mt-1">{errors.hireDate.message}</p>}
            </div>
            <div>
              <Label htmlFor="departmentId">Department (Optional)</Label>
              <Controller
                name="departmentId"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value ?? ''} disabled={isLoadingDepartments}>
                    <SelectTrigger>
                      <SelectValue placeholder={isLoadingDepartments ? "Loading..." : "Select department"} />
                    </SelectTrigger>
                    <SelectContent>
                       {departments?.items?.map(dep => <SelectItem key={dep.employeeId} value={dep.employeeId}>{dep.firstName} {dep.lastName} (Mocked)</SelectItem>)}
                      {/* Replace with actual department data */}
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
                  <Select onValueChange={field.onChange} value={field.value ?? ''} disabled={isLoadingEmployeesForReporting}>
                    <SelectTrigger>
                      <SelectValue placeholder={isLoadingEmployeesForReporting ? "Loading..." : "Select manager"} />
                    </SelectTrigger>
                    <SelectContent>
                      {employeesForReporting?.items?.filter(emp => emp.employeeId !== employeeId) // Exclude self
                        .map(emp => (
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
            <div className="flex items-center space-x-2 mt-2">
              <Controller
                name="isActive"
                control={control}
                render={({ field }) => (
                  <Checkbox id="isActive" checked={field.value} onCheckedChange={field.onChange} />
                )}
              />
              <Label htmlFor="isActive">Active Employee</Label>
              {errors.isActive && <p className="text-sm text-red-500 mt-1">{errors.isActive.message}</p>}
            </div>
          </div>
        </div>

        {/* TODO: Add sections for Address and Emergency Contact */}

        <div className="flex justify-end space-x-3">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || isLoadingEmployee || isLoadingDepartments || isLoadingEmployeesForReporting}>
            {isSubmitting ? <Loader text="Saving..." /> : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default EditEmployeePage;
