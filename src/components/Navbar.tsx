'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Users,
  LayoutDashboard,
  MessageSquare,
  FileText,
  HelpCircle,
  Menu,
  Briefcase,
  LogOut,
  Bell, // Added Bell icon
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns'; // For relative time
import { api } from '@/trpc/react'; // Added tRPC
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useSession, signOut } from 'next-auth/react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'; // Added Popover
import { Badge } from '@/components/ui/badge'; // Added Badge
import { ScrollArea } from '@/components/ui/scroll-area'; // Added ScrollArea
import { useToast } from '@/hooks/useToast'; // For potential errors

// Local type for Notification (simplified, assuming router returns this structure)
type NotificationItem = {
  notificationId: string;
  message: string;
  link?: string | null;
  createdAt: Date; // Assuming date object from server
  isRead: boolean;
};

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
}

export function Navbar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = React.useState(false);
  const { data: session } = useSession();
  const role = session?.user.role; // Assuming role is available like this
  const { toast } = useToast();

  // Determine the base path based on the role
  // Adjust base path logic if session or role structure is different
  const roleBasePath = session?.user?.organizationId ? '/admin' : (role === 'PROFESSIONAL' ? '/professional' : '/');


  const navItems: NavItem[] = [
    // Example: Conditionally show Admin Dashboard
    ...(session?.user?.organizationId && session?.user?.role?.permissions.includes('DASHBOARD_VIEW') // Assuming permission check
      ? [
          {
            title: 'Admin Dashboard',
            href: `/admin/dashboard`, // Updated path
            icon: LayoutDashboard,
          },
        ]
      : []),
    {
      title: 'Home',
      href: `${roleBasePath}/`,
      icon: Home, // Default icon
    },
    // Add other common nav items or role-specific items here
    // Example: My Payslips (for employees)
    ...(session?.user?.employeeId // Assuming employeeId implies an employee role
      ? [
          {
            title: 'My Payslips',
            href: `/payroll/my-payslips`,
            icon: FileText,
          },
           {
            title: 'My Attendance',
            href: `/attendance/my-records`,
            icon: CalendarDays,
          },
           {
            title: 'My Leave',
            href: `/leave/my-applications`,
            icon: Briefcase, // Using Briefcase, could be specific leave icon
          }
        ]
      : []),
      // Example: Manage Employees (for admins)
    ...(session?.user?.organizationId && session?.user?.role?.permissions.includes('EMPLOYEE_READ_ALL')
      ? [
          {
            title: 'Employees',
            href: `/employees`,
            icon: Users,
          },
        ]
      : []),
    // ... other links based on permissions
  ];

  const { data: unreadCountData, refetch: refetchUnreadCount } = api.notification.getUnreadCount.useQuery(undefined, {
    enabled: !!session, // Only fetch if user is logged in
    refetchInterval: 60000, // Refetch every 60 seconds
  });
  const unreadCount = unreadCountData?.count || 0;

  const { data: notificationsData, isLoading: isLoadingNotifications, refetch: refetchNotifications } = api.notification.listForUser.useQuery(
    { limit: 7, unreadOnly: false }, // Show recent (read and unread)
    { enabled: !!session } // Only fetch if user is logged in
  );
  const notifications = notificationsData || [];

  const markAsReadMutation = api.notification.markAsRead.useMutation({
    onSuccess: () => {
      refetchUnreadCount();
      refetchNotifications(); // Could be more optimistic
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Error", description: `Could not mark notification as read: ${error.message}`});
    }
  });

  const handleNotificationClick = (notification: NotificationItem) => {
    if (!notification.isRead) {
      markAsReadMutation.mutate({ notificationId: notification.notificationId });
    }
    if (notification.link) {
      // TODO: Use Next.js router to navigate if it's an internal link
      // router.push(notification.link);
      window.location.href = notification.link; // Simple navigation for now
    }
  };
  
  const handleMarkAllAsRead = () => {
      // This would ideally call a markAllAsRead mutation if available.
      // For now, let's simulate by marking visible ones as read.
      const unreadIds = notifications.filter(n => !n.isRead).map(n => n.notificationId);
      if (unreadIds.length > 0) {
          // If you had a markMultipleAsRead mutation:
          // markMultipleAsReadMutation.mutate({ notificationIds: unreadIds });
          unreadIds.forEach(id => markAsReadMutation.mutate({ notificationId: id }));
      }
  };


  const handleSignOut = () => {
    signOut({ callbackUrl: '/' });
  };

  const userInitials = session?.user?.name
    ? session.user.name.split(' ').map((n) => n[0]).join('').toUpperCase()
    : (session?.user?.email ? session.user.email[0].toUpperCase() : 'U');


  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center">
          {/* Mobile Nav Trigger */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="mr-2 md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="pr-0 sm:max-w-xs">
              <MobileNav
                items={navItems} // Pass relevant nav items
                pathname={pathname}
                setIsOpen={setIsOpen}
                onSignOut={handleSignOut}
                userInitials={userInitials}
                userName={session?.user?.name}
                userEmail={session?.user?.email}
              />
            </SheetContent>
          </Sheet>

          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="font-bold sm:inline-block text-primary text-xl">HRMS</span>
          </Link>
          
          {/* Desktop Nav */}
          <nav className="hidden md:flex md:gap-4">
            {navItems.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className={cn(
                  "transition-colors hover:text-foreground/80",
                  pathname === item.href ? "text-foreground" : "text-foreground/60"
                )}
              >
                {item.title}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-x-3">
          {/* Notification Bell */}
          {session && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 justify-center rounded-full p-0.5 text-xs">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="end">
                <div className="p-4 font-medium border-b">
                  Notifications ({unreadCount})
                </div>
                <ScrollArea className="h-[300px]">
                  {isLoadingNotifications && <div className="p-4 space-y-3">{[...Array(3)].map((_,i)=><Skeleton key={i} className="h-10 w-full"/>)}</div>}
                  {!isLoadingNotifications && notifications.length === 0 && <p className="p-4 text-sm text-muted-foreground">No new notifications.</p>}
                  {!isLoadingNotifications && notifications.length > 0 && (
                    <div className="divide-y">
                      {notifications.map((notif) => (
                        <div 
                          key={notif.notificationId} 
                          className={cn(
                            "p-3 hover:bg-accent cursor-pointer",
                            !notif.isRead && "bg-primary/5"
                          )}
                          onClick={() => handleNotificationClick(notif)}
                        >
                          <p className={cn("text-sm mb-0.5", !notif.isRead && "font-semibold")}>{notif.message}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
                {notifications.length > 0 && unreadCount > 0 && (
                     <div className="p-2 border-t">
                        <Button variant="link" size="sm" className="w-full" onClick={handleMarkAllAsRead}>Mark all as read</Button>
                    </div>
                )}
                <div className="p-2 border-t text-center">
                  <Button variant="link" size="sm" asChild>
                    <Link href="/notifications">View All Notifications</Link>
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* User Profile Dropdown */}
          {session ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{userInitials}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuItem className="flex flex-col items-start !p-2">
                  <div className="text-sm font-medium">{session.user?.name || 'User'}</div>
                  <div className="text-xs text-muted-foreground">{session.user?.email}</div>
                </DropdownMenuItem>
                {/* Add other dropdown items like Profile, Settings etc. */}
                <DropdownMenuItem onClick={handleSignOut} className="text-red-600 focus:text-red-700 focus:bg-red-50">
                  <LogOut className="mr-2 h-4 w-4" /> Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild variant="default">
              <Link href="/auth/signin">Sign In</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

interface MobileNavProps {
  items: NavItem[];
  pathname: string;
  setIsOpen: (open: boolean) => void;
  onSignOut: () => void;
  userInitials: string;
  userName?: string | null;
  userEmail?: string | null;
}

function MobileNav({
  items,
  pathname,
  setIsOpen,
  onSignOut,
  userInitials,
  userName,
  userEmail,
}: MobileNavProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-2 py-4">
        <Link
          href="/"
          className="mb-8 flex items-center"
          onClick={() => setIsOpen(false)}
        >
          <span className="font-bold text-primary">HRMS</span>
        </Link>
        <div className="flex flex-col space-y-2">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsOpen(false)}
              className={cn(
                "flex items-center gap-2 rounded-md p-2 text-sm font-medium hover:bg-accent",
                pathname === item.href ? "bg-accent text-accent-foreground" : "text-muted-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.title}
            </Link>
          ))}
        </div>
      </div>
      <div className="mt-auto border-t p-4">
         {session?.user && (
             <div className="flex items-center gap-2 mb-3">
                 <Avatar className="h-8 w-8">
                     <AvatarFallback>{userInitials}</AvatarFallback>
                 </Avatar>
                 <div>
                     <p className="text-sm font-medium">{session.user.name || 'User'}</p>
                     <p className="text-xs text-muted-foreground">{session.user.email}</p>
                 </div>
             </div>
         )}
        <Button variant="outline" className="w-full" onClick={onSignOut}>
          <LogOut className="mr-2 h-4 w-4" /> Log out
        </Button>
      </div>
    </div>
  );
}
