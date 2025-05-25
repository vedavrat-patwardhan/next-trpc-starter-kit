'use client';

import React, { useState } from 'react';
import { api } from '~/trpc/react';
import { usePermission } from '~/hooks/usePermission';
import { PERMISSIONS } from '~/config/permissions';
import { Button } from '~/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogClose,
} from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { Checkbox } from '~/components/ui/checkbox';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  createSalaryComponentSchema,
  updateSalaryComponentSchema,
  CreateSalaryComponentInput,
  UpdateSalaryComponentInput,
  salaryComponentTypeSchema,
  salaryCalculationTypeSchema,
} from '~/schemas/salaryComponent.schema';
import { toast } from '~/components/ui/use-toast';
import { Loader } from '~/components/Loader';
import { PlusCircleIcon, EditIcon, TrashIcon } from 'lucide-react';
import type { SalaryComponent } from '@prisma/client'; // For type hinting

type SalaryComponentFormData = CreateSalaryComponentInput | UpdateSalaryComponentInput;

const SalaryComponentsPage: React.FC = () => {
  const { hasPermission } = usePermission();
  const canManage = hasPermission(PERMISSIONS.SALARY_STRUCTURE_MANAGE);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<SalaryComponent | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [componentToDelete, setComponentToDelete] = useState<SalaryComponent | null>(null);

  // Fetch salary components - organizationId will be derived from session by tRPC
  const { data: components, isLoading, error, refetch } = api.salaryComponent.listByOrg.useQuery(
    {}, // Empty input as orgId is from session
    { enabled: canManage }
  );
  
  const {
    control,
    handleSubmit,
    register,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SalaryComponentFormData>({
    resolver: zodResolver(editingComponent ? updateSalaryComponentSchema : createSalaryComponentSchema),
    defaultValues: {
      name: '',
      type: 'EARNING',
      calculationType: 'FIXED',
      formula: '',
      isTaxable: true,
    },
  });

  const calculationType = watch('calculationType');

  const createMutation = api.salaryComponent.create.useMutation({
    onSuccess: () => {
      toast({ title: 'Success', description: 'Salary component created successfully.' });
      refetch();
      setIsModalOpen(false);
    },
    onError: (err) => {
      toast({ title: 'Error', description: err.message || 'Failed to create component.', variant: 'destructive' });
    },
  });

  const updateMutation = api.salaryComponent.update.useMutation({
    onSuccess: () => {
      toast({ title: 'Success', description: 'Salary component updated successfully.' });
      refetch();
      setIsModalOpen(false);
    },
    onError: (err) => {
      toast({ title: 'Error', description: err.message || 'Failed to update component.', variant: 'destructive' });
    },
  });

  const deleteMutation = api.salaryComponent.delete.useMutation({
    onSuccess: () => {
      toast({ title: 'Success', description: 'Salary component deleted successfully.' });
      refetch();
      setIsDeleteDialogOpen(false);
    },
    onError: (err) => {
      toast({ title: 'Error', description: err.message || 'Failed to delete component.', variant: 'destructive' });
      setIsDeleteDialogOpen(false);
    },
  });

  const openModalForCreate = () => {
    setEditingComponent(null);
    reset({
      name: '',
      type: 'EARNING',
      calculationType: 'FIXED',
      formula: '',
      isTaxable: true,
    });
    setIsModalOpen(true);
  };

  const openModalForEdit = (component: SalaryComponent) => {
    setEditingComponent(component);
    reset({
      componentId: component.componentId,
      name: component.name,
      type: component.type as "EARNING" | "DEDUCTION",
      calculationType: component.calculationType as "FIXED" | "PERCENTAGE" | "FORMULA",
      formula: component.formula ?? '',
      isTaxable: component.isTaxable,
    });
    setIsModalOpen(true);
  };
  
  const openDeleteDialog = (component: SalaryComponent) => {
    setComponentToDelete(component);
    setIsDeleteDialogOpen(true);
  };

  const onSubmit = (data: SalaryComponentFormData) => {
    if (editingComponent) {
      updateMutation.mutate(data as UpdateSalaryComponentInput);
    } else {
      createMutation.mutate(data as CreateSalaryComponentInput);
    }
  };

  const handleDeleteConfirm = () => {
    if (componentToDelete) {
      deleteMutation.mutate({ componentId: componentToDelete.componentId });
    }
  };

  if (!canManage && !isLoading) {
    return <p className="p-4 text-red-500">You do not have permission to manage salary components.</p>;
  }
  if (isLoading) return <Loader text="Loading salary components..." />;
  if (error) return <p className="p-4 text-red-500">Error loading components: {error.message}</p>;

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Salary Components</h1>
        {canManage && (
          <Button onClick={openModalForCreate}>
            <PlusCircleIcon className="mr-2 h-5 w-5" /> Add New Component
          </Button>
        )}
      </div>

      <div className="bg-background shadow-md rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Calculation Type</TableHead>
              <TableHead>Taxable</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {components && components.length > 0 ? (
              components.map((component) => (
                <TableRow key={component.componentId}>
                  <TableCell className="font-medium">{component.name}</TableCell>
                  <TableCell>{component.type}</TableCell>
                  <TableCell>{component.calculationType}</TableCell>
                  <TableCell>{component.isTaxable ? 'Yes' : 'No'}</TableCell>
                  <TableCell className="text-right space-x-2">
                    {canManage && (
                      <>
                        <Button variant="ghost" size="icon" onClick={() => openModalForEdit(component)} title="Edit">
                          <EditIcon className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(component)} title="Delete">
                          <TrashIcon className="h-4 w-4 text-red-500" />
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                  No salary components found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingComponent ? 'Edit' : 'Create New'} Salary Component</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div>
              <Label htmlFor="name">Component Name</Label>
              <Input id="name" {...register('name')} />
              {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <Label htmlFor="type">Type</Label>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      {salaryComponentTypeSchema.options.map(option => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.type && <p className="text-sm text-red-500 mt-1">{errors.type.message}</p>}
            </div>

            <div>
              <Label htmlFor="calculationType">Calculation Type</Label>
              <Controller
                name="calculationType"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger><SelectValue placeholder="Select calculation type" /></SelectTrigger>
                    <SelectContent>
                      {salaryCalculationTypeSchema.options.map(option => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.calculationType && <p className="text-sm text-red-500 mt-1">{errors.calculationType.message}</p>}
            </div>

            {calculationType === 'FORMULA' && (
              <div>
                <Label htmlFor="formula">Formula</Label>
                <Input id="formula" {...register('formula')} placeholder="e.g., (basic_salary * 0.1) / 12" />
                {errors.formula && <p className="text-sm text-red-500 mt-1">{errors.formula.message}</p>}
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Controller
                name="isTaxable"
                control={control}
                render={({ field }) => (
                    <Checkbox id="isTaxable" checked={field.value} onCheckedChange={field.onChange} />
                )}
              />
              <Label htmlFor="isTaxable" className="font-normal">Is Taxable</Label>
              {errors.isTaxable && <p className="text-sm text-red-500 mt-1">{errors.isTaxable.message}</p>}
            </div>
            
            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Input id="description" {...register('description')} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader text="Saving..." /> : (editingComponent ? 'Save Changes' : 'Create Component')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Salary Component</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the component "{componentToDelete?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={deleteMutation.isLoading}>Cancel</Button>
            </DialogClose>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={deleteMutation.isLoading}>
              {deleteMutation.isLoading ? <Loader text="Deleting..." /> : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SalaryComponentsPage;
