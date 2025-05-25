'use client';

import React, { useState, useEffect } from 'react';
import { useRouter }
from 'next/navigation';
import Link from 'next/link';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '~/trpc/react';
import { PERMISSIONS } from '~/config/permissions';
import { usePermission } from '~/hooks/usePermission';
import { createSalaryStructureSchema, CreateSalaryStructureInput } from '~/schemas/salaryStructure.schema';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { toast } from '~/components/ui/use-toast';
import { Loader } from '~/components/Loader';
import { ArrowLeftIcon, PlusCircleIcon, Trash2Icon, XCircleIcon } from 'lucide-react';
import type { SalaryComponent } from '@prisma/client';

const CreateSalaryStructurePage: React.FC = () => {
  const router = useRouter();
  const { hasPermission } = usePermission();
  const canManage = hasPermission(PERMISSIONS.SALARY_STRUCTURE_MANAGE);

  const {
    control,
    handleSubmit,
    register,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateSalaryStructureInput>({
    resolver: zodResolver(createSalaryStructureSchema),
    defaultValues: {
      name: '',
      description: '',
      components: [{ componentId: '', definedValue: null, percentageOfComponentId: null }],
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control,
    name: 'components',
  });

  // Fetch available salary components for the organization
  const { data: availableComponents, isLoading: isLoadingComponents } = api.salaryComponent.listByOrg.useQuery(
    {}, { enabled: canManage }
  );

  const createStructureMutation = api.salaryStructure.create.useMutation({
    onSuccess: (data) => {
      toast({
        title: 'Salary Structure Created',
        description: `Structure "${data?.name}" has been successfully created.`,
      });
      router.push('/payroll/settings/salary-structures');
    },
    onError: (error) => {
      toast({
        title: 'Error Creating Structure',
        description: error.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: CreateSalaryStructureInput) => {
    // Filter out any components where componentId is empty, which might happen if rows are added but not configured
    const processedData = {
      ...data,
      components: data.components.filter(comp => comp.componentId) 
                                 .map(comp => ({
                                    ...comp,
                                    definedValue: comp.definedValue ? Number(comp.definedValue) : null,
                                    percentageOfComponentId: comp.percentageOfComponentId || null,
                                 })),
    };
    if(processedData.components.length === 0){
        toast({ title: 'Validation Error', description: 'At least one component must be configured.', variant: 'destructive'});
        return;
    }
    createStructureMutation.mutate(processedData);
  };

  if (!canManage && !isLoadingComponents) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <p className="text-xl text-muted-foreground">You do not have permission to create salary structures.</p>
        <Button onClick={() => router.push('/payroll/settings/salary-structures')} className="mt-4">Back to List</Button>
      </div>
    );
  }

  const getComponentDetails = (componentId: string): SalaryComponent | undefined => {
    return availableComponents?.find(c => c.componentId === componentId);
  };
  
  const watchFieldArray = watch('components'); // For dynamic rendering based on component type

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 max-w-3xl">
      <div className="mb-6">
        <Button variant="outline" size="sm" asChild>
          <Link href="/payroll/settings/salary-structures">
            <ArrowLeftIcon className="mr-2 h-4 w-4" /> Back to Structures List
          </Link>
        </Button>
      </div>
      <h1 className="text-3xl font-bold mb-8">Create New Salary Structure</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Structure Details Section */}
        <div className="p-6 border rounded-lg bg-background shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Structure Details</h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Structure Name</Label>
              <Input id="name" {...register('name')} />
              {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Input id="description" {...register('description')} />
              {errors.description && <p className="text-sm text-red-500 mt-1">{errors.description.message}</p>}
            </div>
          </div>
        </div>

        {/* Components Section */}
        <div className="p-6 border rounded-lg bg-background shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Salary Components</h2>
            <Button type="button" variant="outline" size="sm" onClick={() => append({ componentId: '', definedValue: null, percentageOfComponentId: null })}>
              <PlusCircleIcon className="mr-2 h-4 w-4" /> Add Component
            </Button>
          </div>
          {errors.components?.root && <p className="text-sm text-red-500 mb-2">{errors.components.root.message}</p>}
          
          <div className="space-y-4">
            {fields.map((field, index) => {
              const selectedComponentDetails = getComponentDetails(watchFieldArray[index]?.componentId);
              return (
                <div key={field.id} className="p-4 border rounded-md bg-muted/30 space-y-3 relative">
                   <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => remove(index)} 
                      className="absolute top-2 right-2 text-muted-foreground hover:text-destructive"
                      title="Remove Component"
                    >
                      <XCircleIcon className="h-4 w-4" />
                    </Button>
                  <div>
                    <Label htmlFor={`components.${index}.componentId`}>Component</Label>
                    <Controller
                      name={`components.${index}.componentId`}
                      control={control}
                      render={({ field: controllerField }) => (
                        <Select
                          onValueChange={(value) => {
                            controllerField.onChange(value);
                            // Reset related fields when component changes
                            setValue(`components.${index}.definedValue`, null);
                            setValue(`components.${index}.percentageOfComponentId`, null);
                          }}
                          value={controllerField.value}
                          disabled={isLoadingComponents}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={isLoadingComponents ? "Loading..." : "Select component"} />
                          </SelectTrigger>
                          <SelectContent>
                            {availableComponents?.map(comp => (
                              <SelectItem key={comp.componentId} value={comp.componentId}>
                                {comp.name} ({comp.type} - {comp.calculationType})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.components?.[index]?.componentId && (
                      <p className="text-sm text-red-500 mt-1">{errors.components[index]?.componentId?.message}</p>
                    )}
                  </div>

                  {selectedComponentDetails?.calculationType === 'FIXED' && (
                    <div>
                      <Label htmlFor={`components.${index}.definedValue`}>Defined Value (Override)</Label>
                      <Controller
                        name={`components.${index}.definedValue`}
                        control={control}
                        render={({ field: controllerField }) => (
                           <Input 
                            id={`components.${index}.definedValue`} 
                            type="number" 
                            {...controllerField} 
                            value={controllerField.value ?? ''}
                            onChange={e => controllerField.onChange(parseFloat(e.target.value))}
                            placeholder="Enter fixed amount for this structure"
                          />
                        )}
                      />
                       {errors.components?.[index]?.definedValue && (
                        <p className="text-sm text-red-500 mt-1">{errors.components[index]?.definedValue?.message}</p>
                      )}
                    </div>
                  )}
                  
                  {selectedComponentDetails?.calculationType === 'PERCENTAGE' && (
                    <div>
                      <Label htmlFor={`components.${index}.percentageOfComponentId`}>Percentage Of (Optional)</Label>
                       <Controller
                        name={`components.${index}.percentageOfComponentId`}
                        control={control}
                        render={({ field: controllerField }) => (
                          <Select 
                            onValueChange={controllerField.onChange} 
                            value={controllerField.value ?? ''}
                            disabled={isLoadingComponents}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select base component for percentage (if any)" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">None (Use component's default formula/base)</SelectItem>
                              {availableComponents?.filter(c => c.type === "EARNING" && c.componentId !== selectedComponentDetails.componentId).map(comp => (
                                <SelectItem key={comp.componentId} value={comp.componentId}>
                                  {comp.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                       <p className="text-xs text-muted-foreground mt-1">
                         If the percentage (defined on the Salary Component: "{selectedComponentDetails.name}") is based on another component in this structure (e.g. Basic Pay).
                       </p>
                      {errors.components?.[index]?.percentageOfComponentId && (
                        <p className="text-sm text-red-500 mt-1">{errors.components[index]?.percentageOfComponentId?.message}</p>
                      )}
                    </div>
                  )}
                  {/* FORMULA type components use their global formula by default, no structure-specific value here */}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || isLoadingComponents}>
            {isSubmitting ? <Loader text="Saving..." /> : 'Create Salary Structure'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CreateSalaryStructurePage;
