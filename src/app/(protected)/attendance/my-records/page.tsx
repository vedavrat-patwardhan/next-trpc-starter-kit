'use client';

import React, { useState, useEffect } from 'react';
import { format, isValid } from 'date-fns';
import { api } from '@/trpc/react';
import { listAttendanceForEmployeeSchema, AttendanceStatusType } from '@/schemas/attendance.schema';
import { Button } from '@/components/ui/button';
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
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarIcon, InfoIcon, SearchIcon, EraserIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

// --- Local Type Definitions ---
// (Assuming session object and its structure for employeeId)
type SessionUser = {
  employeeId: string;
  // other user properties
};

type Session = {
  user: SessionUser;
} | null;

type AttendanceRecord = {
  id: string;
  date: Date;
  status: AttendanceStatusType;
  checkInTime: Date | null;
  checkOutTime: Date | null;
  notes: string | null;
};

const MyAttendanceRecordsPage = () => {
  // --- Mock Session (Replace with actual session logic) ---
  // TODO: Replace this mock session with actual session data (e.g., from next-auth `useSession()`)
  const [session, setSession] = useState<Session>({
    user: { employeeId: 'cl_mock_employee_id_123' } // Example employeeId
  });
  const employeeId = session?.user?.employeeId;

  // --- State for Date Range Filters ---
  const [startDate, setStartDate] = useState<Date | undefined>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1) // Default to start of current month
  );
  const [endDate, setEndDate] = useState<Date | undefined>(new Date()); // Default to today

  // --- tRPC Query ---
  const attendanceQuery = api.attendance.listForEmployee.useQuery(
    {
      employeeId: employeeId!, // `!` is used assuming employeeId will be available if query is enabled
      startDate: startDate,
      endDate: endDate,
    },
    {
      enabled: !!employeeId, // Only run query if employeeId is available
      // keepPreviousData: true, // Consider for smoother UX on date changes if debouncing is not used
    }
  );

  // --- Effects ---
  // Refetch data when date range changes.
  // No debounce hook available, so it refetches immediately.
  useEffect(() => {
    if (employeeId) {
      attendanceQuery.refetch();
    }
  }, [startDate, endDate, employeeId, attendanceQuery.refetch]);

  // --- Handlers ---
  const handleApplyFilters = () => {
      // Validation for date range can be added here if desired, e.g. endDate >= startDate
      if (startDate && endDate && endDate < startDate) {
          // Potentially show a toast or error message
          alert("End date cannot be before start date.");
          return;
      }
      attendanceQuery.refetch();
  };
  
  const handleClearFilters = () => {
    setStartDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    setEndDate(new Date());
    // Refetch will be triggered by useEffect due to state change
  };


  // --- Render Logic ---
  const renderStatusBadge = (status: AttendanceStatusType) => {
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

  if (!employeeId) {
    return (
      <div className="container mx-auto py-6 flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <InfoIcon className="w-16 h-16 text-orange-500 mb-4" />
        <p className="text-xl text-muted-foreground">User information not available.</p>
        <p className="text-sm text-muted-foreground">Please ensure you are logged in correctly to view your attendance.</p>
        <p className="text-xs text-gray-400 mt-2">Developer Note: Replace mock session with actual session logic.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-8 space-y-4 sm:space-y-0">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">My Attendance Records</h1>
      </div>

      {/* Date Range Filter Section */}
      <div className="mb-8 p-4 border rounded-lg bg-gray-50 shadow">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-end">
          <div className="space-y-1">
            <Label htmlFor="start-date-filter">From Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button id="start-date-filter" variant="outline" className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate && isValid(startDate) ? format(startDate, "PPP") : <span>Pick a start date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-1">
            <Label htmlFor="end-date-filter">To Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button id="end-date-filter" variant="outline" className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate && isValid(endDate) ? format(endDate, "PPP") : <span>Pick an end date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus disabled={(date) => startDate ? date < startDate : false} />
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="flex space-x-2 sm:pt-6"> {/* Adjust alignment for buttons */}
            <Button onClick={handleApplyFilters} className="w-full sm:w-auto">
              <SearchIcon className="mr-2 h-4 w-4" /> Apply
            </Button>
            <Button onClick={handleClearFilters} variant="outline" className="w-full sm:w-auto">
               <EraserIcon className="mr-2 h-4 w-4" /> Clear
            </Button>
          </div>
        </div>
      </div>
      
      {/* Attendance Records Table */}
      {attendanceQuery.isLoading && (
        <div className="space-y-2 mt-4">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-md" />)}
        </div>
      )}

      {attendanceQuery.isError && (
         <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{attendanceQuery.error.message}</span>
            <Button variant="link" size="sm" onClick={() => attendanceQuery.refetch()} className="ml-2 text-red-700">Try again</Button>
        </div>
      )}

      {!attendanceQuery.isLoading && !attendanceQuery.isError && (
        <div className="overflow-x-auto shadow-md border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[15%]">Date</TableHead>
                <TableHead className="w-[15%]">Status</TableHead>
                <TableHead className="w-[15%]">Check-In</TableHead>
                <TableHead className="w-[15%]">Check-Out</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendanceQuery.data?.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center h-32 text-muted-foreground">No attendance records found for the selected period.</TableCell></TableRow>
              )}
              {attendanceQuery.data?.map((record: AttendanceRecord) => (
                <TableRow key={record.id}>
                  <TableCell>{format(new Date(record.date), "PPP")}</TableCell>
                  <TableCell>{renderStatusBadge(record.status)}</TableCell>
                  <TableCell>{record.checkInTime ? format(new Date(record.checkInTime), "p") : '-'}</TableCell>
                  <TableCell>{record.checkOutTime ? format(new Date(new Date(record.checkOutTime)), "p") : '-'}</TableCell>
                  <TableCell className="max-w-sm truncate" title={record.notes || undefined}>{record.notes || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default MyAttendanceRecordsPage;
