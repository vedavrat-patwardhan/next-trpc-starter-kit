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
} from 'lucide-react';

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

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
}

export function Navbar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = React.useState(false);
  const { data: session } = useSession();
  const role = session?.user.role;

  // Determine the base path based on the role
  const roleBasePath =
    role === 'PROFESSIONAL' ? '/professional' : '/organization';

  const navItems: NavItem[] = [
    {
      title: 'Home',
      href: `${roleBasePath}/`,
      icon: Home,
    },
    {
      title: role === 'PROFESSIONAL' ? 'Find Jobs' : 'Find Candidates',
      href: role === 'PROFESSIONAL' ? `${roleBasePath}/jobs` : '/candidates',
      icon: role === 'PROFESSIONAL' ? Briefcase : Users,
    },
    {
      title: 'Dashboard',
      href: `${roleBasePath}/dashboard/overview`,
      icon: LayoutDashboard,
    },
    {
      title: 'Chat',
      href: '/chat',
      icon: MessageSquare,
    },
    {
      title: 'Application',
      href: '/application',
      icon: FileText,
    },
    {
      title: 'Customer Support',
      href: '/support',
      icon: HelpCircle,
    },
  ];

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' });
  };

  const userInitials = session?.user?.name
    ? session.user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
    : 'U';

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex w-full px-4 h-16 justify-items-center justify-between">
        <div className="flex items-center">
          <div className="mr-4 flex items-center justify-center md:hidden">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="mr-2 px-0 text-base hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 md:hidden"
                >
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="pr-0">
                <MobileNav
                  items={navItems}
                  pathname={pathname}
                  setIsOpen={setIsOpen}
                  onSignOut={handleSignOut}
                  userInitials={userInitials}
                  userName={session?.user?.name}
                  userEmail={session?.user?.email}
                />
              </SheetContent>
            </Sheet>
          </div>
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <h1 className="text-primary text-2xl font-bold">TrainerDB</h1>
          </Link>
          <nav className="hidden md:flex md:flex-1">
            <ul className="flex gap-2">
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  pathname.startsWith(item.href + '/');

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        'group inline-flex h-10 w-max items-center justify-center rounded-md px-4 py-2 text-lg font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50',
                        isActive
                          ? 'bg-accent text-accent-foreground'
                          : 'text-muted-foreground'
                      )}
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {item.title}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        {/* User profile and logout */}
        <div className="flex items-center">
          {session ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-10 w-10 rounded-full"
                >
                  <Avatar className="h-10 w-10">
                    {/* <AvatarImage src={session.user?. || ""} alt={session.user?.name || "User"} /> */}
                    <AvatarFallback>{userInitials}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="flex flex-col space-y-1 p-2">
                  <p className="text-sm font-medium leading-none">
                    {session.user?.name}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {session.user?.email}
                  </p>
                </div>
                <DropdownMenuItem
                  className="cursor-pointer flex items-center gap-2 text-destructive focus:text-destructive"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-4 w-4" />
                  <span>Log out</span>
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
          <span className="font-bold">TrainerDB</span>
        </Link>
        <nav className="flex flex-col gap-4">
          {items.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + '/');

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
                  isActive
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.title}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User profile and logout for mobile */}
      <div className="mt-auto border-t p-4">
        {userName && (
          <div className="flex items-center gap-3 mb-4">
            <Avatar className="h-10 w-10">
              <AvatarFallback>{userInitials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">{userName}</p>
              <p className="text-xs text-muted-foreground">{userEmail}</p>
            </div>
          </div>
        )}
        <Button
          variant="outline"
          className="w-full flex items-center gap-2 justify-center"
          onClick={onSignOut}
        >
          <LogOut className="h-4 w-4" />
          <span>Log out</span>
        </Button>
      </div>
    </div>
  );
}
