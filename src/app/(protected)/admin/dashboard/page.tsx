'use client';

import React from 'react';
import Link from 'next/link';
import { api } from '@/trpc/react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { 
    Users, 
    Briefcase, 
    CalendarDays, 
    FileText, 
    AlertTriangle, 
    ArrowRight,
    Gift, // For Holidays
    UserPlus, // For New Hires
    LogOut // For Leave Applications
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Define types based on expected tRPC router output
type KeyMetrics = {
  totalActiveEmployees: number;
  pendingLeaveApplicationsCount: number;
  currentPayrollStatus: string | { id: string; status: string; period: string; paymentDate: string };
  upcomingHolidaysCount: number;
};

type UpcomingHoliday = {
  name: string;
  date: string; // Already formatted by router
};

type RecentLeaveApplication = {
  id: string;
  employeeName: string;
  leaveTypeName: string;
  status: string;
  appliedOn: string; // Already formatted
};

type RecentlyHiredEmployee = {
  id: string;
  name: string;
  jobTitle: string;
  hireDate: string; // Already formatted
};


const AdminDashboardPage = () => {
  const { data: keyMetrics, isLoading: isLoadingMetrics, error: errorMetrics } = api.dashboard.getKeyMetrics.useQuery();
  const { data: upcomingHolidays, isLoading: isLoadingHolidays, error: errorHolidays } = api.dashboard.getUpcomingHolidaysList.useQuery({ limit: 5 });
  const { data: recentLeaves, isLoading: isLoadingRecentLeaves, error: errorRecentLeaves } = api.dashboard.getRecentLeaveApplications.useQuery({ limit: 5 });
  const { data: newHires, isLoading: isLoadingNewHires, error: errorNewHires } = api.dashboard.getRecentlyHiredEmployees.useQuery({ limit: 5 });

  const renderMetricCard = (title: string, value: string | number | undefined, icon: React.ReactNode, linkTo?: string, isLoading?: boolean, error?: any) => {
    if (isLoading) {
      return (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            {icon}
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-1/2" />
            {linkTo && <Skeleton className="h-4 w-1/3 mt-2" />}
          </CardContent>
        </Card>
      );
    }
    if (error) {
        return (
             <Card className="border-red-200 bg-red-50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-red-700">{title}</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                    <p className="text-xs text-red-600">Error loading data.</p>
                    {/* <p className="text-xs text-red-400">{error.message}</p> */}
                </CardContent>
             </Card>
        )
    }
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {icon}
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{value ?? 'N/A'}</div>
          {linkTo && (
            <Link href={linkTo} className="text-xs text-muted-foreground hover:text-primary flex items-center mt-1">
              View Details <ArrowRight className="h-3 w-3 ml-1" />
            </Link>
          )}
        </CardContent>
      </Card>
    );
  };
  
  const renderStatusBadge = (status: string) => {
    const baseClasses = "px-2 py-0.5 text-xs font-semibold rounded-full inline-block";
    switch (status.toUpperCase()) { // Assuming status might come in various cases
      case 'PENDING': return <span className={cn(baseClasses, "bg-yellow-100 text-yellow-800")}>Pending</span>;
      case 'APPROVED': return <span className={cn(baseClasses, "bg-green-100 text-green-800")}>Approved</span>;
      case 'REJECTED': return <span className={cn(baseClasses, "bg-red-100 text-red-800")}>Rejected</span>;
      case 'CANCELLED': return <span className={cn(baseClasses, "bg-gray-100 text-gray-800")}>Cancelled</span>;
      // Payroll statuses
      case 'DRAFT': return <span className={cn(baseClasses, "bg-gray-200 text-gray-800")}>Draft</span>;
      case 'PENDING_APPROVAL': return <span className={cn(baseClasses, "bg-yellow-100 text-yellow-800")}>Pending Approval</span>;
      case 'PROCESSING': return <span className={cn(baseClasses, "bg-blue-100 text-blue-800")}>Processing</span>;
      case 'COMPLETED': return <span className={cn(baseClasses, "bg-green-100 text-green-800")}>Completed</span>;
      case 'FAILED': return <span className={cn(baseClasses, "bg-red-100 text-red-800")}>Failed</span>;
      default: return <span className={cn(baseClasses, "bg-gray-300 text-gray-900")}>{status}</span>;
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Admin Dashboard</h1>
      </div>

      {/* Key Metrics Section */}
      <div className="mb-10">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Key Metrics</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {renderMetricCard("Total Active Employees", keyMetrics?.totalActiveEmployees, <Users className="h-5 w-5 text-muted-foreground" />, "/employees", isLoadingMetrics, errorMetrics)}
          {renderMetricCard("Pending Leave Applications", keyMetrics?.pendingLeaveApplicationsCount, <FileText className="h-5 w-5 text-muted-foreground" />, "/leave/requests", isLoadingMetrics, errorMetrics)}
          {renderMetricCard("Upcoming Holidays (30d)", keyMetrics?.upcomingHolidaysCount, <Gift className="h-5 w-5 text-muted-foreground" />, "/leave/holidays", isLoadingMetrics, errorMetrics)}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Payroll Status</CardTitle>
              <Briefcase className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoadingMetrics && <Skeleton className="h-8 w-3/4" />}
              {errorMetrics && <p className="text-xs text-red-600">Error loading data.</p>}
              {!isLoadingMetrics && !errorMetrics && keyMetrics && (
                typeof keyMetrics.currentPayrollStatus === 'string' ? (
                  <div className="text-lg font-semibold">{keyMetrics.currentPayrollStatus}</div>
                ) : (
                  <>
                    <div className="text-lg font-bold">{renderStatusBadge(keyMetrics.currentPayrollStatus.status)}</div>
                    <p className="text-xs text-muted-foreground">{keyMetrics.currentPayrollStatus.period}</p>
                    {keyMetrics.currentPayrollStatus.paymentDate !== 'N/A' && <p className="text-xs text-muted-foreground">Paid: {keyMetrics.currentPayrollStatus.paymentDate}</p>}
                  </>
                )
              )}
               <Link href="/payroll/run" className="text-xs text-muted-foreground hover:text-primary flex items-center mt-1">
                Manage Payroll <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Other Widgets Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upcoming Holidays Widget */}
        <Card className="lg:col-span-1 flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center"><Gift className="mr-2 h-5 w-5 text-indigo-500" />Upcoming Holidays</CardTitle>
            <CardDescription>A quick look at the next few holidays.</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow">
            {isLoadingHolidays && <div className="space-y-3">{[...Array(3)].map((_,i) => <Skeleton key={i} className="h-6 w-full" />)}</div>}
            {errorHolidays && <p className="text-sm text-red-600">Could not load holidays.</p>}
            {!isLoadingHolidays && !errorHolidays && (
              upcomingHolidays && upcomingHolidays.length > 0 ? (
                <ul className="space-y-2">
                  {upcomingHolidays.map((holiday, index) => (
                    <li key={index} className="flex justify-between items-center text-sm py-1 border-b border-gray-100 last:border-b-0">
                      <span>{holiday.name}</span>
                      <span className="text-muted-foreground">{holiday.date}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-muted-foreground">No upcoming holidays in the next 30 days.</p>
            )}
          </CardContent>
          <CardFooter>
            <Button asChild variant="link" className="p-0 h-auto text-sm">
              <Link href="/leave/holidays">Manage Holidays <ArrowRight className="h-3 w-3 ml-1" /></Link>
            </Button>
          </CardFooter>
        </Card>

        {/* Recent Leave Applications Widget */}
        <Card className="lg:col-span-1 flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center"><LogOut className="mr-2 h-5 w-5 text-orange-500" />Recent Leave Applications</CardTitle>
             <CardDescription>Latest leave requests from employees.</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow">
            {isLoadingRecentLeaves && <div className="space-y-3">{[...Array(3)].map((_,i) => <Skeleton key={i} className="h-8 w-full" />)}</div>}
            {errorRecentLeaves && <p className="text-sm text-red-600">Could not load leave applications.</p>}
            {!isLoadingRecentLeaves && !errorRecentLeaves && (
              recentLeaves && recentLeaves.length > 0 ? (
                <div className="space-y-3">
                  {recentLeaves.map((leave) => (
                    <div key={leave.id} className="text-sm py-1.5 border-b border-gray-100 last:border-b-0">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{leave.employeeName}</span>
                        {renderStatusBadge(leave.status)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {leave.leaveTypeName} ({leave.startDate} - {leave.endDate})
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-muted-foreground">No recent leave applications.</p>
            )}
          </CardContent>
          <CardFooter>
            <Button asChild variant="link" className="p-0 h-auto text-sm">
              <Link href="/leave/requests">Manage Leave Requests <ArrowRight className="h-3 w-3 ml-1" /></Link>
            </Button>
          </CardFooter>
        </Card>

        {/* Recently Hired Employees Widget */}
        <Card className="lg:col-span-1 flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center"><UserPlus className="mr-2 h-5 w-5 text-teal-500" />Recently Hired Employees</CardTitle>
            <CardDescription>New members who joined the team.</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow">
            {isLoadingNewHires && <div className="space-y-3">{[...Array(3)].map((_,i) => <Skeleton key={i} className="h-8 w-full" />)}</div>}
            {errorNewHires && <p className="text-sm text-red-600">Could not load new hires.</p>}
            {!isLoadingNewHires && !errorNewHires && (
              newHires && newHires.length > 0 ? (
                 <div className="space-y-3">
                  {newHires.map((hire) => (
                    <div key={hire.id} className="text-sm py-1.5 border-b border-gray-100 last:border-b-0">
                      <div className="font-medium">{hire.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {hire.jobTitle} - Hired: {hire.hireDate}
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-muted-foreground">No recent hires to display.</p>
            )}
          </CardContent>
           <CardFooter>
            <Button asChild variant="link" className="p-0 h-auto text-sm">
                <Link href="/employees">Manage Employees <ArrowRight className="h-3 w-3 ml-1" /></Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
