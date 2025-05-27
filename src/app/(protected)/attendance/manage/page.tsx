'use client';

import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, isValid, parseISO } from 'date-fns';
import { api } from '@/trpc/react';
import {
  logAttendanceInputSchema,
  LogAttendanceInput,
  updateAttendanceInputSchema,
  UpdateAttendanceInput,
  listAttendanceInputSchema,
  ListAttendanceInput,
  attendanceStatusSchema,
  AttendanceStatusType,
} from '@/schemas/attendance.schema';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
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
import { Pagination } from '@/components/ui/pagination';
import { useToast } from '@/hooks/useToast';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarIcon, PlusCircle, Edit3, Trash2, SearchIcon, EraserIcon, ClockIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
// Assuming useDebounce hook is not available, so direct state updates will trigger refetches.

// --- Local Type Definitions ---
type EmployeeMinimal = {
  employeeId: string;
  firstName: string | null;
  lastName: string | null;
};

type AttendanceRecordForTable = {
  id: string; // Prisma 'attendanceId' is 'id' here
  employeeId: string;
  date: Date;
  status: AttendanceStatusType;
  checkInTime: Date | null;
  checkOutTime: Date | null;
  notes: string | null;
  employee: { // Assuming this structure from the 'listForOrganization' query
    firstName: string | null;
    lastName: string | null;
  };
};


const ManageAttendancePage = () => {
  const { toast } = useToast();

  // --- State ---
  const [filters, setFilters] = useState<Omit<ListAttendanceInput, 'page' | 'pageSize'>>({
    employeeId: undefined,
    startDate: undefined,
    endDate: undefined,
    status: undefined,
  });
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10 });
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecordForTable | null>(null);

  // --- tRPC Queries & Mutations ---
  // Debounce is not used here as per previous findings. Direct state changes will trigger useEffect.
  const attendanceQuery = api.attendance.listForOrganization.useQuery({
    ...filters,
    page: pagination.page,
    pageSize: pagination.pageSize,
  });

  // Assuming an employee list query exists.
  // Replace with actual if different, or mock if not critical for this task's scope.
  const { data: employees, isLoading: isLoadingEmployees } = api.employee.listMinimal.useQuery();


  const logAttendanceMutation = api.attendance.log.useMutation({
    onSuccess: () => {
      toast({ title: 'Success', description: 'Attendance record added.' });
      attendanceQuery.refetch();
      setIsAddDialogOpen(false);
    },
    onError: (error) => toast({ variant: 'destructive', title: 'Error adding record', description: error.message }),
  });

  const updateAttendanceMutation = api.attendance.update.useMutation({
    onSuccess: () => {
      toast({ title: 'Success', description: 'Attendance record updated.' });
      attendanceQuery.refetch();
      setIsEditDialogOpen(false);
    },
    onError: (error) => toast({ variant: 'destructive', title: 'Error updating record', description: error.message }),
  });

  const deleteAttendanceMutation = api.attendance.delete.useMutation({
    onSuccess: () => {
      toast({ title: 'Success', description: 'Attendance record deleted.' });
      attendanceQuery.refetch();
      setIsDeleteDialogOpen(false);
    },
    onError: (error) => toast({ variant: 'destructive', title: 'Error deleting record', description: error.message }),
  });

  // --- Forms ---
  const addForm = useForm<LogAttendanceInput>({
    resolver: zodResolver(logAttendanceInputSchema),
    defaultValues: { employeeId: '', date: new Date(), status: 'PRESENT', checkInTime: undefined, checkOutTime: undefined, notes: '' },
  });

  const editForm = useForm<UpdateAttendanceInput>({
    resolver: zodResolver(updateAttendanceInputSchema),
    defaultValues: { attendanceId: '', employeeId: '', date: new Date(), status: 'PRESENT', checkInTime: undefined, checkOutTime: undefined, notes: '' },
  });

  // --- Effects ---
  useEffect(() => {
    attendanceQuery.refetch();
  }, [filters, pagination, attendanceQuery.refetch]);

  useEffect(() => {
    if (selectedRecord && isEditDialogOpen) {
      const checkIn = selectedRecord.checkInTime ? new Date(selectedRecord.checkInTime) : undefined;
      const checkOut = selectedRecord.checkOutTime ? new Date(selectedRecord.checkOutTime) : undefined;
      
      editForm.reset({
        attendanceId: selectedRecord.id,
        employeeId: selectedRecord.employeeId,
        date: new Date(selectedRecord.date),
        status: selectedRecord.status,
        // For time inputs, we might need to format them if using <input type="time">
        // For now, assuming Calendar or a similar component handles Date objects for time part too.
        checkInTime: checkIn,
        checkOutTime: checkOut,
        notes: selectedRecord.notes || '',
      });
    }
  }, [selectedRecord, isEditDialogOpen, editForm]);


  // --- Handlers ---
  const handleFilterChange = (filterName: keyof typeof filters, value: any) => {
    setFilters(prev => ({ ...prev, [filterName]: value === '' ? undefined : value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };
  
  const handleClearFilters = () => {
    setFilters({ employeeId: undefined, startDate: undefined, endDate: undefined, status: undefined });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleOpenAddDialog = () => {
    addForm.reset({ employeeId: '', date: new Date(), status: 'PRESENT', checkInTime: undefined, checkOutTime: undefined, notes: '' });
    setIsAddDialogOpen(true);
  };
  const handleOpenEditDialog = (record: AttendanceRecordForTable) => {
    setSelectedRecord(record);
    setIsEditDialogOpen(true);
  };
  const handleOpenDeleteDialog = (record: AttendanceRecordForTable) => {
    setSelectedRecord(record);
    setIsDeleteDialogOpen(true);
  };

  const onAddSubmit = (values: LogAttendanceInput) => {
    logAttendanceMutation.mutate(values);
  };
  const onEditSubmit = (values: UpdateAttendanceInput) => {
    updateAttendanceMutation.mutate(values);
  };
  const onDeleteConfirm = () => {
    if (selectedRecord) deleteAttendanceMutation.mutate({ attendanceId: selectedRecord.id });
  };

  const renderStatusBadge = (status: AttendanceStatusType) => { /* ... (same as MyAttendancePage) ... */ 
    const baseClasses = "px-2 py-0.5 text-xs font-semibold rounded-full inline-block";
    switch (status) {
      case 'PRESENT': return <span className={cn(baseClasses, "bg-green-100 text-green-800")}>Present</span>;
      case 'ABSENT': return <span className={cn(baseClasses, "bg-red-100 text-red-800")}>Absent</span>;
      case 'LATE': return <span className={cn(baseClasses, "bg-yellow-100 text-yellow-800")}>Late</span>;
      case 'HALF_DAY': return <span className={cn(baseClasses, "bg-blue-100 text-blue-800")}>Half Day</span>;
      case 'LEAVE': return <span className={cn(baseClasses, "bg-purple-100 text-purple-800")}>Leave</span>;
      case 'HOLIDAY': return <span className={cn(baseClasses, "bg-indigo-100 text-indigo-800")}>Holiday</span>;
      default: return <span className={cn(baseClasses, "bg-gray-200 text-gray-700")}>{status}</span>;
    }
  };
  
  // Helper to format time for input type="time" or display
  const formatTimeForInput = (date: Date | undefined | null): string => {
    if (!date || !isValid(date)) return '';
    return format(date, 'HH:mm');
  };

  // Helper to combine date and time string into a Date object
  const combineDateAndTime = (datePart: Date, timePartStr: string | undefined | null): Date | undefined => {
    if (!timePartStr) return undefined;
    const [hours, minutes] = timePartStr.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return undefined;
    const newDate = new Date(datePart);
    newDate.setHours(hours, minutes, 0, 0);
    return newDate;
  };


  const records = attendanceQuery.data?.applications || []; // `applications` key from router
  const totalRecords = attendanceQuery.data?.totalRecords || 0;

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-8 space-y-4 sm:space-y-0">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Manage Employee Attendance</h1>
        <Button onClick={handleOpenAddDialog}><PlusCircle className="mr-2 h-4 w-4" /> Add Record</Button>
      </div>

      {/* Filters Section */}
      <div className="mb-8 p-4 border rounded-lg bg-gray-50 shadow">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 items-end">
          {/* Employee Filter */}
          <div className="space-y-1">
            <Label htmlFor="employee-filter">Employee</Label>
            <Select value={filters.employeeId || ''} onValueChange={(value) => handleFilterChange('employeeId', value)} disabled={isLoadingEmployees}>
              <SelectTrigger id="employee-filter">
                <SelectValue placeholder={isLoadingEmployees ? "Loading..." : "All Employees"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Employees</SelectItem>
                {employees?.map((emp: EmployeeMinimal) => (
                  <SelectItem key={emp.employeeId} value={emp.employeeId}>{emp.firstName} {emp.lastName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Date Filters and Status Filter (similar to ManageLeaveRequestsPage) */}
          <div className="space-y-1">
            <Label htmlFor="start-date-filter">From Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button id="start-date-filter" variant="outline" className={cn("w-full justify-start text-left font-normal", !filters.startDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.startDate && isValid(new Date(filters.startDate)) ? format(new Date(filters.startDate), "PPP") : <span>Pick start date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={filters.startDate ? new Date(filters.startDate) : undefined} onSelect={(d) => handleFilterChange('startDate', d)} initialFocus /></PopoverContent>
            </Popover>
          </div>
          <div className="space-y-1">
            <Label htmlFor="end-date-filter">To Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button id="end-date-filter" variant="outline" className={cn("w-full justify-start text-left font-normal", !filters.endDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.endDate && isValid(new Date(filters.endDate)) ? format(new Date(filters.endDate), "PPP") : <span>Pick end date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={filters.endDate ? new Date(filters.endDate) : undefined} onSelect={(d) => handleFilterChange('endDate', d)} initialFocus disabled={(date) => filters.startDate ? date < new Date(filters.startDate) : false} /></PopoverContent>
            </Popover>
          </div>
          <div className="space-y-1">
            <Label htmlFor="status-filter">Status</Label>
            <Select value={filters.status || ''} onValueChange={(value) => handleFilterChange('status', value as AttendanceStatusType | undefined)}>
              <SelectTrigger id="status-filter"><SelectValue placeholder="All Statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Statuses</SelectItem>
                {attendanceStatusSchema.options.map(status => (
                  <SelectItem key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex space-x-2 pt-6">
            <Button onClick={handleClearFilters} variant="outline" className="w-full"><EraserIcon className="mr-2 h-4 w-4" />Clear</Button>
          </div>
        </div>
      </div>
      
      {/* Attendance Table */}
      {attendanceQuery.isLoading && <div className="space-y-2 mt-4">{[...Array(pagination.pageSize)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>}
      {attendanceQuery.isError && <div className="mt-4 text-red-600">Error loading attendance: {attendanceQuery.error.message} <Button variant="link" onClick={() => attendanceQuery.refetch()}>Try again</Button></div>}
      
      {!attendanceQuery.isLoading && !attendanceQuery.isError && (
        <>
          <div className="overflow-x-auto shadow-md border rounded-lg">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Employee</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead>
                <TableHead>Check-In</TableHead><TableHead>Check-Out</TableHead><TableHead>Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {records.length === 0 && <TableRow><TableCell colSpan={7} className="text-center h-32">No records found.</TableCell></TableRow>}
                {records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>{record.employee.firstName} {record.employee.lastName}</TableCell>
                    <TableCell>{format(new Date(record.date), "PPP")}</TableCell>
                    <TableCell>{renderStatusBadge(record.status)}</TableCell>
                    <TableCell>{record.checkInTime ? format(new Date(record.checkInTime), "p") : '-'}</TableCell>
                    <TableCell>{record.checkOutTime ? format(new Date(record.checkOutTime), "p") : '-'}</TableCell>
                    <TableCell className="max-w-xs truncate" title={record.notes || undefined}>{record.notes || '-'}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="sm" onClick={() => handleOpenEditDialog(record)}><Edit3 className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleOpenDeleteDialog(record)} className="text-red-600 hover:text-red-700"><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {totalRecords > 0 && <div className="mt-6"><Pagination totalRecords={totalRecords} currentPage={pagination.page} onPageChange={(p) => setPagination(pg => ({...pg, page: p}))} itemsPerPage={pagination.pageSize} onItemsPerPageChange={(ps) => setPagination({page:1, pageSize:ps})} /></div>}
        </>
      )}

      {/* Add Record Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Add New Attendance Record</DialogTitle></DialogHeader>
          <Form {...addForm}>
            <form onSubmit={addForm.handleSubmit(onAddSubmit)} className="space-y-4 py-2">
              <FormField control={addForm.control} name="employeeId" render={({ field }) => (
                <FormItem><FormLabel>Employee</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoadingEmployees}>
                    <FormControl><SelectTrigger>{isLoadingEmployees ? "Loading..." : "Select Employee"}</SelectTrigger></FormControl>
                    <SelectContent>{employees?.map((emp: EmployeeMinimal) => <SelectItem key={emp.employeeId} value={emp.employeeId}>{emp.firstName} {emp.lastName}</SelectItem>)}</SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )} />
              <FormField control={addForm.control} name="date" render={({ field }) => (
                <FormItem className="flex flex-col"><FormLabel>Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild><FormControl><Button variant="outline" className={cn(!field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger>
                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
                  </Popover><FormMessage />
                </FormItem>
              )} />
              <FormField control={addForm.control} name="status" render={({ field }) => (
                <FormItem><FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
                    <SelectContent>{attendanceStatusSchema.options.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()}</SelectItem>)}</SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )} />
              <Controller
                control={addForm.control}
                name="checkInTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Check-In Time (Optional)</FormLabel>
                    <Input 
                      type="time" 
                      value={field.value ? formatTimeForInput(field.value instanceof Date ? field.value : parseISO(field.value)) : ''}
                      onChange={(e) => field.onChange(combineDateAndTime(addForm.getValues("date"), e.target.value))}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Controller
                control={addForm.control}
                name="checkOutTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Check-Out Time (Optional)</FormLabel>
                    <Input 
                      type="time" 
                      value={field.value ? formatTimeForInput(field.value instanceof Date ? field.value : parseISO(field.value)) : ''}
                      onChange={(e) => field.onChange(combineDateAndTime(addForm.getValues("date"), e.target.value))}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField control={addForm.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Notes (Optional)</FormLabel><FormControl><Textarea placeholder="Any relevant notes..." {...field} /></FormControl><FormMessage /></FormItem>)} />
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                <Button type="submit" disabled={logAttendanceMutation.isLoading}>{logAttendanceMutation.isLoading ? 'Saving...' : 'Add Record'}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Record Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Edit Attendance Record</DialogTitle></DialogHeader>
          {selectedRecord && (
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4 py-2">
                <FormField control={editForm.control} name="employeeId" render={({ field }) => (
                  <FormItem><FormLabel>Employee</FormLabel>
                     <Input value={`${selectedRecord.employee.firstName} ${selectedRecord.employee.lastName}`} readOnly disabled className="bg-gray-100" />
                  </FormItem>
                )} />
                 <FormField control={editForm.control} name="date" render={({ field }) => ( // Date is part of the form, but usually not editable for an existing record
                  <FormItem className="flex flex-col"><FormLabel>Date</FormLabel>
                    <Popover>
                        <PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("bg-gray-100",!field.value && "text-muted-foreground")} disabled>{field.value ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger>
                        {/* Calendar not shown as date is typically not editable for existing record */}
                    </Popover><FormMessage />
                  </FormItem>
                )} />
                <FormField control={editForm.control} name="status" render={({ field }) => (
                  <FormItem><FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
                      <SelectContent>{attendanceStatusSchema.options.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()}</SelectItem>)}</SelectContent>
                    </Select><FormMessage />
                  </FormItem>
                )} />
                 <Controller
                    control={editForm.control}
                    name="checkInTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Check-In Time (Optional)</FormLabel>
                        <Input 
                          type="time" 
                          value={field.value ? formatTimeForInput(field.value instanceof Date ? field.value : parseISO(field.value as unknown as string)) : ''}
                          onChange={(e) => field.onChange(combineDateAndTime(editForm.getValues("date")!, e.target.value))}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Controller
                    control={editForm.control}
                    name="checkOutTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Check-Out Time (Optional)</FormLabel>
                        <Input 
                          type="time" 
                          value={field.value ? formatTimeForInput(field.value instanceof Date ? field.value : parseISO(field.value as unknown as string)) : ''}
                          onChange={(e) => field.onChange(combineDateAndTime(editForm.getValues("date")!, e.target.value))}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                <FormField control={editForm.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Notes (Optional)</FormLabel><FormControl><Textarea placeholder="Any relevant notes..." {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                <DialogFooter>
                  <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                  <Button type="submit" disabled={updateAttendanceMutation.isLoading}>{updateAttendanceMutation.isLoading ? 'Saving...' : 'Save Changes'}</Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Record Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Delete Attendance Record</DialogTitle></DialogHeader>
          <p>Are you sure you want to delete this attendance record for <strong>{selectedRecord?.employee.firstName} {selectedRecord?.employee.lastName}</strong> on <strong>{selectedRecord ? format(new Date(selectedRecord.date), "PPP") : ''}</strong>?</p>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button variant="destructive" onClick={onDeleteConfirm} disabled={deleteAttendanceMutation.isLoading}>{deleteAttendanceMutation.isLoading ? 'Deleting...' : 'Delete Record'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManageAttendancePage;
