import React from 'react';
import { 
  BarChart3, 
  Target, 
  TrendingUp, 
  FileText, 
  Home,
  Search,
  Zap,
  Calendar
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from '@/components/ui/sidebar';
import { useTranslation } from '@/hooks/useTranslation';
import { Student } from '@/types/student';

interface StudentProfileSidebarProps {
  student: Student;
  activeSection: string;
  onSectionChange: (section: string) => void;
}

export function StudentProfileSidebar({ 
  student, 
  activeSection, 
  onSectionChange 
}: StudentProfileSidebarProps) {
  const { state } = useSidebar();
  const { tStudent, tCommon, tAnalytics } = useTranslation();

  const menuItems = [
    {
      section: 'dashboard',
      title: tCommon('navigation.dashboard'),
      icon: Home,
      description: 'Oversikt og sammendrag'
    },
    {
      section: 'analytics',
      title: tCommon('navigation.analytics'),
      icon: BarChart3,
      description: 'Datanalyse og innsikter'
    },
    {
      section: 'goals',
      title: 'Mål',
      icon: Target,
      description: 'Målstyring og progresjon'
    },
    {
      section: 'progress',
      title: 'Fremgang',
      icon: TrendingUp,
      description: 'Utviklingsanalyse'
    },
    {
      section: 'reports',
      title: tCommon('navigation.reports'),
      icon: FileText,
      description: 'Rapporter og eksport'
    }
  ];

  const toolItems = [
    {
      section: 'search',
      title: tStudent('interface.advancedSearch'),
      icon: Search,
      description: 'Avansert søk'
    },
    {
      section: 'templates',
      title: tStudent('interface.quickTemplates'),
      icon: Zap,
      description: 'Hurtigmaler'
    },
    {
      section: 'compare',
      title: 'Sammenligning',
      icon: Calendar,
      description: 'Periodesammenligning'
    }
  ];

  const isActive = (section: string) => activeSection === section;

  return (
    <Sidebar className={state === "collapsed" ? "w-14" : "w-64"}>
      <SidebarContent>
        {/* Student Header */}
        <div className={`p-4 border-b ${state === "collapsed" ? 'px-2' : ''}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
              {student.name.split(' ').map(n => n[0]).join('').toUpperCase()}
            </div>
            {state !== "collapsed" && (
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-sm truncate">{student.name}</h3>
                {student.grade && (
                  <p className="text-xs text-muted-foreground">{student.grade}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>{String("Hovedseksjoner")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.section}>
                  <SidebarMenuButton
                    onClick={() => onSectionChange(item.section)}
                    className={`cursor-pointer ${
                      isActive(item.section) 
                        ? 'bg-accent text-accent-foreground font-medium' 
                        : 'hover:bg-accent/50'
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    {state !== "collapsed" && (
                      <span className="text-sm">{String(item.title)}</span>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Tools Section */}
        <SidebarGroup>
          <SidebarGroupLabel>{String("Verktøy")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {toolItems.map((item) => (
                <SidebarMenuItem key={item.section}>
                  <SidebarMenuButton
                    onClick={() => onSectionChange(item.section)}
                    className={`cursor-pointer ${
                      isActive(item.section) 
                        ? 'bg-accent text-accent-foreground font-medium' 
                        : 'hover:bg-accent/50'
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    {state !== "collapsed" && (
                      <span className="text-sm">{String(item.title)}</span>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}