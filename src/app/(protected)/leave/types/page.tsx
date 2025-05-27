'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '@/trpc/react';
import { createLeaveTypeSchema, CreateLeaveTypeInput, updateLeaveTypeSchema, UpdateLeaveTypeInput } from '@/schemas/leave.schema';

// Defined LeaveType locally as direct import from @prisma/client might not be available.
type LeaveType = {
  id: string;
  name: string;
  defaultDays: number;
  isPaid: boolean;
  description: string | null;
  organizationId: string; // Assuming this field exists based on typical Prisma schemas
  createdAt: Date;      // Assuming this field exists
  updatedAt: Date;      // Assuming this field exists
};
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/useToast';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, PlusCircle, Pencil, Trash2 } from "lucide-react";

const ManageLeaveTypesPage = () => {
  const { data: leaveTypes, isLoading, error, refetch } = api.leaveType.listByOrg.useQuery();
  const { toast } = useToast();

  // State for dialogs
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // State for selected leave type
  const [selectedLeaveType, setSelectedLeaveType] = useState<LeaveType | null>(null);

  // Create Form
  const createForm = useForm<CreateLeaveTypeInput>({
    resolver: zodResolver(createLeaveTypeSchema),
    defaultValues: {
      name: '',
      defaultDays: 0,
      isPaid: true,
      description: '',
    },
  });

  // Edit Form
  const editForm = useForm<UpdateLeaveTypeInput>({
    resolver: zodResolver(updateLeaveTypeSchema),
    // Default values for edit form, leaveTypeId will be populated on open
    defaultValues: { 
      leaveTypeId: '',
      name: '',
      defaultDays: 0,
      isPaid: true,
      description: '',
    },
  });

  // Populate edit form when selectedLeaveType changes and dialog opens
  useEffect(() => {
    if (selectedLeaveType && isEditDialogOpen) {
      editForm.reset({
        leaveTypeId: selectedLeaveType.id,
        name: selectedLeaveType.name,
        defaultDays: selectedLeaveType.defaultDays,
        isPaid: selectedLeaveType.isPaid,
        description: selectedLeaveType.description ?? '',
      });
    }
  }, [selectedLeaveType, isEditDialogOpen, editForm]);

  // Mutations
  const createLeaveTypeMutation = api.leaveType.create.useMutation({
    onSuccess: () => {
      toast({ title: 'Success', description: 'Leave type created successfully.' });
      refetch();
      setIsCreateDialogOpen(false);
      createForm.reset();
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Error Creating Leave Type',
        description: error.message,
      });
    },
  });

  const updateLeaveTypeMutation = api.leaveType.update.useMutation({
    onSuccess: () => {
      toast({ title: 'Success', description: 'Leave type updated successfully.' });
      refetch();
      setIsEditDialogOpen(false);
      setSelectedLeaveType(null); 
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Error Updating Leave Type',
        description: error.message,
      });
    },
  });

  const deleteLeaveTypeMutation = api.leaveType.delete.useMutation({
    onSuccess: () => {
      toast({ title: 'Success', description: 'Leave type deleted successfully.' });
      refetch();
      setIsDeleteDialogOpen(false);
      setSelectedLeaveType(null);
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Error Deleting Leave Type',
        description: error.message, // Example: "Cannot delete, leave type is in use."
      });
    },
  });

  // Submit Handlers
  const onCreateSubmit = (values: CreateLeaveTypeInput) => {
    createLeaveTypeMutation.mutate(values);
  };

  const onEditSubmit = (values: UpdateLeaveTypeInput) => {
    if (!selectedLeaveType?.id) {
        toast({ variant: "destructive", title: "Error", description: "Leave Type ID is missing for update."});
        return;
    }
    // Values from form should already include leaveTypeId if populated correctly by useEffect
    updateLeaveTypeMutation.mutate({ ...values, leaveTypeId: selectedLeaveType.id });
  };

  const onDeleteConfirm = () => {
    if (selectedLeaveType?.id) {
      deleteLeaveTypeMutation.mutate({ leaveTypeId: selectedLeaveType.id });
    } else {
      toast({ variant: "destructive", title: "Error", description: "No leave type selected for deletion."});
      setIsDeleteDialogOpen(false); // Close dialog if no ID
    }
  };

  // Dialog Open Handlers
  const handleEditOpen = (leaveType: LeaveType) => {
    setSelectedLeaveType(leaveType);
    // Reset form here to ensure it's populated when dialog opens
    editForm.reset({ 
        leaveTypeId: leaveType.id,
        name: leaveType.name,
        defaultDays: leaveType.defaultDays,
        isPaid: leaveType.isPaid,
        description: leaveType.description ?? '',
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteOpen = (leaveType: LeaveType) => {
    setSelectedLeaveType(leaveType);
    setIsDeleteDialogOpen(true);
  };
  
  // Close dialog and reset selection
  const handleCloseCreateDialog = () => {
    setIsCreateDialogOpen(false);
    createForm.reset();
  }

  const handleCloseEditDialog = () => {
    setIsEditDialogOpen(false);
    setSelectedLeaveType(null); 
    // It's good practice to reset form on close as well, though useEffect handles population on open
    editForm.reset({ leaveTypeId: '', name: '', defaultDays: 0, isPaid: true, description: '' });
  }

  const handleCloseDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
    setSelectedLeaveType(null);
  }

  if (isLoading) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-4">Manage Leave Types</h1>
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-4">Manage Leave Types</h1>
        <Alert variant="destructive">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load leave types: {error.message} { refetch && <Button variant="link" onClick={() => refetch()}>Try again</Button>}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Manage Leave Types</h1>
        {/* Create Leave Type Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={(isOpen) => { if (!isOpen) handleCloseCreateDialog(); else setIsCreateDialogOpen(true); }}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Create New Leave Type
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New Leave Type</DialogTitle>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                <FormField
                  control={createForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Annual Leave" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  control={createForm.control}
                  control={createForm.control}
                  name="defaultDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default Days</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g. 20" {...field} onChange={event => field.onChange(+event.target.value)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isPaid"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Is Paid?</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Short description of the leave type"
                          className="resize-none"
                          {...field}
                          value={field.value ?? ''} // Ensure value is not null
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="outline" onClick={handleCloseCreateDialog}>Cancel</Button>
                  </DialogClose>
                  <Button type="submit" disabled={createLeaveTypeMutation.isLoading || createLeaveTypeMutation.isSuccess}>
                    {createLeaveTypeMutation.isLoading ? 'Creating...' : (createLeaveTypeMutation.isSuccess ? 'Created!' : 'Create Leave Type')}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Default Days</TableHead>
            <TableHead>Is Paid?</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leaveTypes?.map((leaveType) => (
            <TableRow key={leaveType.id}>
              <TableCell>{leaveType.name}</TableCell>
              <TableCell>{leaveType.defaultDays}</TableCell>
              <TableCell>{leaveType.isPaid ? 'Yes' : 'No'}</TableCell>
              <TableCell>{leaveType.description || '-'}</TableCell>
              <TableCell className="text-right space-x-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleEditOpen(leaveType)}
                  disabled={(updateLeaveTypeMutation.isLoading && selectedLeaveType?.id === leaveType.id) || (deleteLeaveTypeMutation.isLoading && selectedLeaveType?.id === leaveType.id) || createLeaveTypeMutation.isLoading}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleDeleteOpen(leaveType)}
                  disabled={(deleteLeaveTypeMutation.isLoading && selectedLeaveType?.id === leaveType.id) || (updateLeaveTypeMutation.isLoading && selectedLeaveType?.id === leaveType.id) || createLeaveTypeMutation.isLoading}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {(leaveTypes?.length === 0 || !leaveTypes) && (
            <TableRow>
              <TableCell colSpan={5} className="text-center h-24">
                No leave types found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default ManageLeaveTypesPage;
