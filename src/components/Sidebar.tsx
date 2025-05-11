'use client';

import type React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Home,
  Info,
  BookOpen,
  Users,
  UserPlus,
  Filter,
  Star,
  Clock,
  Briefcase,
  Search,
  BookmarkPlus,
  CheckCircle,
  XCircle,
  LayoutDashboard,
  Settings,
  MessageSquare,
  Archive,
  FileText,
  FilePlus,
  HelpCircle,
  Phone,
  Video,
  Bookmark,
} from 'lucide-react';

interface SidebarItem {
  title: string;
  href: string;
  icon: React.ElementType;
}

interface SidebarSection {
  title: string;
  items: SidebarItem[];
}

export function Sidebar() {
  const pathname = usePathname();

  // Get the first segment of the URL to determine which section we're in
  const segments = pathname.split('/');
  const sectionKey = segments[2] || ''; // e.g. 'dashboard'
  const basePath = `/${segments[1]}`; // Ensure basePath always starts with '/'

  const sidebarSections: Record<string, SidebarSection> = {
    '': {
      title: 'Home',
      items: [
        { title: 'Overview', href: `${basePath}/`, icon: Home },
        { title: 'About Us', href: `${basePath}/about`, icon: Info },
        { title: 'Guides', href: `${basePath}/guides`, icon: BookOpen },
      ],
    },
    candidates: {
      title: 'Find Candidates',
      items: [
        {
          title: 'All Candidates',
          href: `${basePath}/candidates`,
          icon: Users,
        },
        {
          title: 'New Candidates',
          href: `${basePath}/candidates/new`,
          icon: UserPlus,
        },
        {
          title: 'Search Filters',
          href: `${basePath}/candidates/filters`,
          icon: Filter,
        },
        {
          title: 'Saved Searches',
          href: `${basePath}/candidates/saved`,
          icon: Star,
        },
        {
          title: 'Recent Activity',
          href: `${basePath}/candidates/recent`,
          icon: Clock,
        },
      ],
    },
    jobs: {
      title: 'Find Jobs',
      items: [
        { title: 'All Jobs', href: `${basePath}/jobs`, icon: Briefcase },
        { title: 'Search Jobs', href: `${basePath}/jobs/search`, icon: Search },
        {
          title: 'Saved Jobs',
          href: `${basePath}/jobs/saved`,
          icon: BookmarkPlus,
        },
        {
          title: 'Applied Jobs',
          href: `${basePath}/jobs/applied`,
          icon: CheckCircle,
        },
        {
          title: 'Recent Postings',
          href: `${basePath}/jobs/recent`,
          icon: Clock,
        },
      ],
    },
    dashboard: {
      title: 'Dashboard',
      items: [
        {
          title: 'Overview',
          href: `${basePath}/dashboard/`,
          icon: LayoutDashboard,
        },
        {
          title: 'Post A Job',
          href: `${basePath}/dashboard/post-job`,
          icon: FilePlus,
        },
        {
          title: 'Saved Candidates',
          href: `${basePath}/dashboard/saved-candidates`,
          icon: Bookmark,
        },
        {
          title: 'Settings',
          href: `${basePath}/dashboard/settings/company-info`,
          icon: Settings,
        },
      ],
    },
    chat: {
      title: 'Chat',
      items: [
        {
          title: 'All Messages',
          href: `${basePath}/chat`,
          icon: MessageSquare,
        },
        { title: 'Group Chats', href: `${basePath}/chat/groups`, icon: Users },
        {
          title: 'New Conversation',
          href: `${basePath}/chat/new`,
          icon: UserPlus,
        },
        { title: 'Archived', href: `${basePath}/chat/archived`, icon: Archive },
        {
          title: 'Settings',
          href: `${basePath}/chat/settings`,
          icon: Settings,
        },
      ],
    },
    application: {
      title: 'Applications',
      items: [
        {
          title: 'All Applications',
          href: `${basePath}/application`,
          icon: FileText,
        },
        {
          title: 'New Application',
          href: `${basePath}/application/new`,
          icon: FilePlus,
        },
        {
          title: 'Approved',
          href: `${basePath}/application/approved`,
          icon: CheckCircle,
        },
        {
          title: 'Rejected',
          href: `${basePath}/application/rejected`,
          icon: XCircle,
        },
        {
          title: 'Pending Review',
          href: `${basePath}/application/pending`,
          icon: Clock,
        },
      ],
    },
    support: {
      title: 'Customer Support',
      items: [
        { title: 'Help Center', href: `${basePath}/support`, icon: HelpCircle },
        {
          title: 'Live Chat',
          href: `${basePath}/support/chat`,
          icon: MessageSquare,
        },
        {
          title: 'Support Tickets',
          href: `${basePath}/support/tickets`,
          icon: FileText,
        },
        {
          title: 'Phone Support',
          href: `${basePath}/support/call`,
          icon: Phone,
        },
        {
          title: 'Video Tutorials',
          href: `${basePath}/support/video`,
          icon: Video,
        },
      ],
    },
  };

  const currentSection = sidebarSections[sectionKey];

  if (!currentSection) return null;

  return (
    <aside className="hidden md:block w-64 border-r min-h-[calc(100vh-4rem)] bg-muted/30">
      <div className="py-4 px-2">
        <h3 className="mb-4 px-4 text-2xl font-semibold">
          {currentSection.title}
        </h3>
        <nav className="space-y-1">
          {currentSection.items.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-lg font-medium ${
                  isActive
                    ? 'text-primary bg-accent/50'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.title}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Get the first segment of the URL to determine if we should show a sidebar
  const basePath = pathname.split('/')[1] || '';

  // Determine if we should show a sidebar for this route
  const showSidebar = basePath !== '' || pathname === '/';

  // If no sidebar should be shown, render just the content
  if (!showSidebar) {
    return <div className="container py-6">{children}</div>;
  }

  return (
    <div className="flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content */}
      <main className="flex-1 py-6 px-6">{children}</main>
    </div>
  );
}
