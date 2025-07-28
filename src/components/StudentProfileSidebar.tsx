import React from 'react';
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
      icon: 'dashboard',
      description: 'Oversikt og sammendrag'
    },
    {
      section: 'analytics',
      title: tCommon('navigation.analytics'),
      icon: 'analytics',
      description: 'Datanalyse og innsikter'
    },
    {
      section: 'goals',
      title: 'Mål',
      icon: 'flag',
      description: 'Målstyring og progresjon'
    },
    {
      section: 'progress',
      title: 'Fremgang',
      icon: 'trending_up',
      description: 'Utviklingsanalyse'
    },
    {
      section: 'reports',
      title: tCommon('navigation.reports'),
      icon: 'description',
      description: 'Rapporter og eksport'
    }
  ];

  const toolItems = [
    {
      section: 'search',
      title: tStudent('interface.advancedSearch'),
      icon: 'search',
      description: 'Avansert søk'
    },
    {
      section: 'templates',
      title: tStudent('interface.quickTemplates'),
      icon: 'flash_on',
      description: 'Hurtigmaler'
    },
    {
      section: 'compare',
      title: 'Sammenligning',
      icon: 'compare_arrows',
      description: 'Periodesammenligning'
    }
  ];

  const isActive = (section: string) => activeSection === section;

  return (
    <Sidebar className={`${state === "collapsed" ? "w-14" : "w-64"} bg-card/95 border-border backdrop-blur-sm`}>
      <SidebarContent className="bg-transparent">
        {/* Student Header */}
        <div className={`p-4 border-b border-border/20 bg-card/50 backdrop-blur-sm ${state === "collapsed" ? 'px-2' : ''}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground font-bold text-sm shadow-lg">
              {student.name.split(' ').map(n => n[0]).join('').toUpperCase()}
            </div>
            {state !== "collapsed" && (
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-sm truncate text-foreground">{student.name}</h3>
                {student.grade && (
                  <p className="text-xs text-muted-foreground">{student.grade}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground text-xs font-medium uppercase tracking-wider px-3 py-2">
            Hovedseksjoner
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.section}>
                  <SidebarMenuButton
                    onClick={() => onSectionChange(item.section)}
                    className={`cursor-pointer mx-2 rounded-lg transition-all duration-200 ${
                      isActive(item.section) 
                        ? 'bg-primary text-primary-foreground shadow-lg' 
                        : 'text-foreground hover:bg-accent hover:text-accent-foreground'
                    }`}
                  >
                    <span className="material-icons text-base">{item.icon}</span>
                    {state !== "collapsed" && (
                     <span className="text-sm ml-3">{String(item.title)}</span>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Tools Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground text-xs font-medium uppercase tracking-wider px-3 py-2">
            Verktøy
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {toolItems.map((item) => (
                <SidebarMenuItem key={item.section}>
                  <SidebarMenuButton
                    onClick={() => onSectionChange(item.section)}
                    className={`cursor-pointer mx-2 rounded-lg transition-all duration-200 ${
                      isActive(item.section) 
                        ? 'bg-primary text-primary-foreground shadow-lg' 
                        : 'text-foreground hover:bg-accent hover:text-accent-foreground'
                    }`}
                  >
                    <span className="material-icons text-base">{item.icon}</span>
                    {state !== "collapsed" && (
                      <span className="text-sm ml-3">{String(item.title)}</span>
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