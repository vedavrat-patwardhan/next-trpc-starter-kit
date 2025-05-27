'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { api } from '@/trpc/react';
import { createHolidaySchema, CreateHolidayInput, updateHolidaySchema, UpdateHolidayInput, listHolidaysByOrgSchema } from '@/schemas/leave.schema';
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
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useToast } from '@/hooks/useToast';
import { Skeleton } from '@/components/ui/skeleton';
// Assuming Alert component is available
// import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; 
import { Terminal, PlusCircle, CalendarIcon, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Define Holiday type locally
type Holiday = {
  id: string;
  name: string;
  date: Date;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
};

const ManageHolidaysPage = () => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedHoliday, setSelectedHoliday] = useState<Holiday | null>(null);
  const { toast } = useToast();

  const holidaysQuery = api.holiday.listByOrg.useQuery(
    { year: selectedYear },
    { keepPreviousData: true }
  );

  useEffect(() => {
    // Refetch when selectedYear changes. 
    // The query key `selectedYear` already handles this, 
    // but explicit refetch can be used if needed for specific scenarios.
    holidaysQuery.refetch();
  }, [selectedYear]); // holidaysQuery.refetch was removed from dep array as it can cause infinite loops

  const createForm = useForm<CreateHolidayInput>({
    resolver: zodResolver(createHolidaySchema),
    defaultValues: { name: '', date: new Date(selectedYear, 0, 1) }, // Default to Jan 1 of selected year
  });

  const editForm = useForm<UpdateHolidayInput>({
    resolver: zodResolver(updateHolidaySchema),
    defaultValues: { holidayId: '', name: '', date: new Date() },
  });

  // Populate edit form when selectedHoliday changes and dialog opens
  useEffect(() => {
    if (selectedHoliday && isEditDialogOpen) {
      editForm.reset({
        holidayId: selectedHoliday.id,
        name: selectedHoliday.name,
        date: new Date(selectedHoliday.date), // Ensure date is a Date object
      });
    }
  }, [selectedHoliday, isEditDialogOpen, editForm]);


  const createHolidayMutation = api.holiday.create.useMutation({
    onSuccess: () => {
      toast({ title: 'Success', description: 'Holiday created successfully.' });
      holidaysQuery.refetch();
      setIsCreateDialogOpen(false);
      createForm.reset({ name: '', date: new Date(selectedYear, 0, 1) });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Error Creating Holiday',
        description: error.message,
      });
    },
  });

  const updateHolidayMutation = api.holiday.update.useMutation({
    onSuccess: () => {
      toast({ title: 'Success', description: 'Holiday updated successfully.' });
      holidaysQuery.refetch();
      setIsEditDialogOpen(false);
      setSelectedHoliday(null);
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Error Updating Holiday',
        description: error.message,
      });
    },
  });

  const deleteHolidayMutation = api.holiday.delete.useMutation({
    onSuccess: () => {
      toast({ title: 'Success', description: 'Holiday deleted successfully.' });
      holidaysQuery.refetch();
      setIsDeleteDialogOpen(false);
      setSelectedHoliday(null);
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Error Deleting Holiday',
        description: error.message,
      });
    },
  });

  const onCreateSubmit = (values: CreateHolidayInput) => {
    createHolidayMutation.mutate(values);
  };

  const onEditSubmit = (values: UpdateHolidayInput) => {
    if (!selectedHoliday?.id) {
      toast({ variant: "destructive", title: "Error", description: "Holiday ID is missing."});
      return;
    }
    updateHolidayMutation.mutate({ ...values, holidayId: selectedHoliday.id });
  };

  const onDeleteConfirm = () => {
    if (selectedHoliday?.id) {
      deleteHolidayMutation.mutate({ holidayId: selectedHoliday.id });
    } else {
      toast({ variant: "destructive", title: "Error", description: "No holiday selected for deletion."});
      setIsDeleteDialogOpen(false);
    }
  };
  
  const handleOpenCreateDialog = () => {
    createForm.reset({ name: '', date: new Date(selectedYear, 0, 1) }); // Reset with current year's Jan 1
    setIsCreateDialogOpen(true);
  }

  const handleCloseCreateDialog = () => {
    setIsCreateDialogOpen(false);
    // createForm.reset(); // Already handled in handleOpen and onSuccess
  };

  const handleOpenEditDialog = (holiday: Holiday) => {
    setSelectedHoliday(holiday);
    // useEffect will populate the form
    setIsEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setIsEditDialogOpen(false);
    setSelectedHoliday(null);
    editForm.reset({ holidayId: '', name: '', date: new Date() });
  };

  const handleOpenDeleteDialog = (holiday: Holiday) => {
    setSelectedHoliday(holiday);
    setIsDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
    setSelectedHoliday(null);
  };


  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Manage Holidays</h1>
        {/* Create Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenCreateDialog}>
              <PlusCircle className="mr-2 h-4 w-4" /> Create New Holiday
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New Holiday</DialogTitle>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                <FormField
                  control={createForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Holiday Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. New Year's Day" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            // For create, allow picking any date, year constraint is on UI for `selectedYear`
                            // disabled={(date) => date.getFullYear() !== selectedYear}
                            defaultMonth={field.value ? new Date(field.value.getFullYear(), field.value.getMonth()) : new Date(selectedYear, 0)}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="outline" onClick={handleCloseCreateDialog}>Cancel</Button>
                  </DialogClose>
                  <Button type="submit" disabled={createHolidayMutation.isLoading || createHolidayMutation.isSuccess}>
                    {createHolidayMutation.isLoading ? 'Creating...' : (createHolidayMutation.isSuccess ? 'Created!' : 'Create Holiday')}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Holiday</DialogTitle>
          </DialogHeader>
          {selectedHoliday && (
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Holiday Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Christmas Day" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(new Date(field.value), "PPP") // Ensure field.value is a Date
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value ? new Date(field.value) : undefined}
                            onSelect={field.onChange}
                            defaultMonth={field.value ? new Date(field.value.getFullYear(), field.value.getMonth()) : new Date(selectedYear, 0)}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="outline" onClick={handleCloseEditDialog}>Cancel</Button>
                  </DialogClose>
                  <Button type="submit" disabled={updateHolidayMutation.isLoading || updateHolidayMutation.isSuccess}>
                    {updateHolidayMutation.isLoading ? 'Saving...' : (updateHolidayMutation.isSuccess ? 'Saved!' : 'Save Changes')}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Holiday</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Are you sure you want to delete the holiday: <strong>{selectedHoliday?.name}</strong> ({selectedHoliday?.date ? format(new Date(selectedHoliday.date), 'PPP') : ''})?</p>
            <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" onClick={handleCloseDeleteDialog}>Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={onDeleteConfirm}
              disabled={deleteHolidayMutation.isLoading || deleteHolidayMutation.isSuccess}
            >
              {deleteHolidayMutation.isLoading ? 'Deleting...' : (deleteHolidayMutation.isSuccess ? 'Deleted!' : 'Delete')}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-6 flex items-center space-x-3">
        <label htmlFor="year-selector" className="text-lg font-medium">Select Year:</label>
        <Input
          type="number"
          id="year-selector"
          value={selectedYear}
          onChange={(e) => {
            const yearVal = parseInt(e.target.value, 10);
            if (yearVal >= 1900 && yearVal <= 2100) { // Basic validation
              setSelectedYear(yearVal);
            }
          }}
          className="p-2 border rounded shadow-sm w-32 text-lg"
          min="1900"
          max="2100"
        />
      </div>

      {holidaysQuery.isLoading && (
        <div className="space-y-2 mt-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      )}

      {holidaysQuery.error && (
        <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert"> {/* Basic Alert, replace with component if available */}
            <strong className="font-bold"><Terminal className="inline mr-2 h-5 w-5" />Error: </strong>
            <span className="block sm:inline">{holidaysQuery.error.message}</span>
            <Button variant="link" size="sm" onClick={() => holidaysQuery.refetch()} className="ml-2 text-red-700">Try again</Button>
        </div>
      )}

      {!holidaysQuery.isLoading && !holidaysQuery.error && (
        <Table className="mt-4">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40%]">Name</TableHead>
              <TableHead className="w-[30%]">Date</TableHead>
              <TableHead className="text-right w-[30%]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {holidaysQuery.data?.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">
                  No holidays found for {selectedYear}.
                </TableCell>
              </TableRow>
            )}
            {holidaysQuery.data?.map((holiday) => (
              <TableRow key={holiday.id}>
                <TableCell className="font-medium">{holiday.name}</TableCell>
                <TableCell>{format(new Date(holiday.date), 'PPP')}</TableCell> {/* Ensure date is correctly formatted */}
                <TableCell className="text-right space-x-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleOpenEditDialog(holiday)}
                    disabled={(updateHolidayMutation.isLoading && selectedHoliday?.id === holiday.id) || (deleteHolidayMutation.isLoading && selectedHoliday?.id === holiday.id) || createHolidayMutation.isLoading}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleOpenDeleteDialog(holiday)}
                    disabled={(deleteHolidayMutation.isLoading && selectedHoliday?.id === holiday.id) || (updateHolidayMutation.isLoading && selectedHoliday?.id === holiday.id) || createHolidayMutation.isLoading}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
};

export default ManageHolidaysPage;
