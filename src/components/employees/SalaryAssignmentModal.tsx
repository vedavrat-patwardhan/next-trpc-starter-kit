'use client';

import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '~/trpc/react';
import { createSalaryAssignmentSchema, CreateSalaryAssignmentInput } from '~/schemas/salaryAssignment.schema';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { DatePicker } from '~/components/DatePicker'; // Assuming DatePicker component exists
import { Textarea } from '~/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '~/components/ui/dialog';
import { toast } from '~/components/ui/use-toast';
import { Loader } from '~/components/Loader';
import type { Employee, SalaryStructure } from '@prisma/client';

interface SalaryAssignmentModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  employee: Employee; // To display employee name and pass employeeId
  onAssignmentSuccess?: () => void; // Optional callback
}

const SalaryAssignmentModal: React.FC<SalaryAssignmentModalProps> = ({
  isOpen,
  onOpenChange,
  employee,
  onAssignmentSuccess,
}) => {
  const {
    control,
    handleSubmit,
    register,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateSalaryAssignmentInput>({
    resolver: zodResolver(createSalaryAssignmentSchema),
    defaultValues: {
      employeeId: employee.employeeId,
      structureId: '',
      effectiveDate: new Date(),
      basicSalary: 0,
      customValues: {},
    },
  });

  // Fetch available salary structures for the organization
  // Assumes organizationId is handled by the tRPC procedure via session
  const { data: salaryStructures, isLoading: isLoadingStructures } = api.salaryStructure.listByOrg.useQuery(
    { isActive: true }, // Only show active structures for assignment
  );

  const assignMutation = api.salaryAssignment.assignStructureToEmployee.useMutation({
    onSuccess: () => {
      toast({
        title: 'Success',
        description: `Salary structure assigned to ${employee.firstName} ${employee.lastName} successfully.`,
      });
      reset();
      onOpenChange(false);
      onAssignmentSuccess?.(); // Call callback to refetch data on parent page
    },
    onError: (err) => {
      toast({
        title: 'Error Assigning Structure',
        description: err.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: CreateSalaryAssignmentInput) => {
    let parsedCustomValues: Record<string, any> | null = null;
    if (typeof data.customValues === 'string' && data.customValues.trim() !== '') {
        try {
            parsedCustomValues = JSON.parse(data.customValues);
        } catch (error) {
            toast({ title: 'Invalid JSON', description: 'Custom Overrides must be a valid JSON object.', variant: 'destructive' });
            return;
        }
    } else if (typeof data.customValues === 'object' && data.customValues !== null) {
        parsedCustomValues = data.customValues; // Already an object
    }
    
    const payload: CreateSalaryAssignmentInput = {
      ...data,
      employeeId: employee.employeeId, // Ensure employeeId is set
      basicSalary: Number(data.basicSalary), // Ensure basicSalary is a number
      customValues: parsedCustomValues,
    };
    assignMutation.mutate(payload);
  };
  
  // Reset form when modal opens or employee changes
  React.useEffect(() => {
    if (isOpen) {
      reset({
        employeeId: employee.employeeId,
        structureId: '',
        effectiveDate: new Date(),
        basicSalary: 0,
        customValues: {}, 
      });
    }
  }, [isOpen, employee, reset]);


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Assign Salary Structure to {employee.firstName} {employee.lastName}</DialogTitle>
          <DialogDescription>
            Select a salary structure and provide assignment details. This will deactivate any previous active assignments.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div>
            <Label htmlFor="structureId">Salary Structure</Label>
            <Controller
              name="structureId"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingStructures}>
                  <SelectTrigger>
                    <SelectValue placeholder={isLoadingStructures ? "Loading structures..." : "Select a structure"} />
                  </SelectTrigger>
                  <SelectContent>
                    {salaryStructures?.map((structure: SalaryStructure) => (
                      <SelectItem key={structure.structureId} value={structure.structureId}>
                        {structure.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.structureId && <p className="text-sm text-red-500 mt-1">{errors.structureId.message}</p>}
          </div>

          <div>
            <Label htmlFor="effectiveDate">Effective Date</Label>
            <Controller
              name="effectiveDate"
              control={control}
              render={({ field }) => (
                <DatePicker
                  date={field.value ? new Date(field.value) : undefined}
                  onDateChange={field.onChange}
                  required
                />
              )}
            />
            {errors.effectiveDate && <p className="text-sm text-red-500 mt-1">{errors.effectiveDate.message}</p>}
          </div>

          <div>
            <Label htmlFor="basicSalary">Basic Salary</Label>
            <Controller
              name="basicSalary"
              control={control}
              render={({ field }) => <Input id="basicSalary" type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />}
            />
            {errors.basicSalary && <p className="text-sm text-red-500 mt-1">{errors.basicSalary.message}</p>}
          </div>
          
          <div>
            <Label htmlFor="customValues">Custom Overrides (JSON format, optional)</Label>
            <Controller
                name="customValues"
                control={control}
                render={({ field }) => (
                    <Textarea
                        id="customValues"
                        {...field}
                        value={typeof field.value === 'string' ? field.value : (field.value ? JSON.stringify(field.value, null, 2) : '')}
                        onChange={(e) => field.onChange(e.target.value)} // Keep as string for textarea
                        rows={4}
                        placeholder='Example: {"Bonus": 150, "Allowance": "Special"}'
                    />
                )}
            />
            {errors.customValues && <p className="text-sm text-red-500 mt-1">{errors.customValues.message}</p>}
             <p className="text-xs text-muted-foreground mt-1">
              Provide overrides for specific salary components as a JSON object. E.g., <code>{`{"componentIdOrName": value}`}</code>.
              This requires backend logic to map names to IDs if names are used. For now, use Component IDs.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || isLoadingStructures}>
              {isSubmitting ? <Loader text="Assigning..." /> : 'Assign Structure'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SalaryAssignmentModal;
