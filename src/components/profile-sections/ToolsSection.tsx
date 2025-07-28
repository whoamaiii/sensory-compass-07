import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AdvancedSearch } from '@/components/AdvancedSearch';
import { QuickEntryTemplates } from '@/components/QuickEntryTemplates';
import { PeriodComparison } from '@/components/PeriodComparison';
import { Student, TrackingEntry, EmotionEntry, SensoryEntry, Goal } from '@/types/student';
import { useTranslation } from '@/hooks/useTranslation';
import { Search, Zap, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ToolsSectionProps {
  student: Student;
  trackingEntries: TrackingEntry[];
  emotions: EmotionEntry[];
  sensoryInputs: SensoryEntry[];
  goals: Goal[];
  activeToolSection: string;
  onToolSectionChange: (section: string) => void;
  onSearchResults?: (results: any) => void;
}

export function ToolsSection({ 
  student, 
  trackingEntries, 
  emotions, 
  sensoryInputs, 
  goals,
  activeToolSection,
  onToolSectionChange,
  onSearchResults 
}: ToolsSectionProps) {
  const { tStudent } = useTranslation();
  const navigate = useNavigate();

  const handleQuickTemplateApply = (template: any) => {
    navigate(`/track/${student.id}`, { 
      state: { 
        prefilledData: template 
      } 
    });
  };

  const toolSections = [
    {
      id: 'search',
      title: tStudent('interface.advancedSearch'),
      icon: Search,
      component: (
        <AdvancedSearch
          students={[student]}
          trackingEntries={trackingEntries}
          emotions={emotions}
          sensoryInputs={sensoryInputs}
          goals={goals}
          onResultsChange={onSearchResults}
        />
      )
    },
    {
      id: 'templates',
      title: tStudent('interface.quickTemplates'),
      icon: Zap,
      component: (
        <QuickEntryTemplates
          studentId={student.id}
          onApplyTemplate={handleQuickTemplateApply}
        />
      )
    },
    {
      id: 'compare',
      title: 'Periodesammenligning',
      icon: Calendar,
      component: (
        <PeriodComparison
          emotions={emotions}
          sensoryInputs={sensoryInputs}
          currentRange={{ start: new Date(), end: new Date(), label: "Current" }}
        />
      )
    }
  ];

  const activeSection = toolSections.find(section => section.id === activeToolSection);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Verktøy</h2>
        <p className="text-muted-foreground">
          Avanserte verktøy for søk, maler og sammenligning
        </p>
      </div>

      {/* Tool Navigation */}
      <div className="flex flex-wrap gap-2">
        {toolSections.map((section) => (
          <button
            key={section.id}
            onClick={() => onToolSectionChange(section.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
              activeToolSection === section.id
                ? 'bg-accent text-accent-foreground border-accent'
                : 'bg-background hover:bg-accent/50 border-border'
            }`}
          >
            <section.icon className="h-4 w-4" />
            {String(section.title)}
          </button>
        ))}
      </div>

      {/* Active Tool Section */}
      {activeSection && (
        <Card className="bg-gradient-card border-0 shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <activeSection.icon className="h-5 w-5" />
              {String(activeSection.title)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeSection.component}
          </CardContent>
        </Card>
      )}
    </div>
  );
}