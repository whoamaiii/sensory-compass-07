import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { PaginatedSessionsList } from '@/components/PaginatedSessionsList';
import { DataRequirementsCalculator } from '@/components/DataRequirementsCalculator';
import { DataQualityFeedback } from '@/components/DataQualityFeedback';
import { DataCollectionRoadmap } from '@/components/DataCollectionRoadmap';
import { AnalyticsStatusIndicator } from '@/components/AnalyticsStatusIndicator';
import { DateRangeSelector, TimeRange } from '@/components/DateRangeSelector';
import { Student, TrackingEntry, EmotionEntry, SensoryEntry, Insights } from '@/types/student';
import { useTranslation } from '@/hooks/useTranslation';
import { Plus, Calendar, BarChart3, TrendingUp, ChevronDown, Info, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

/**
 * @interface DashboardSectionProps
 * Props for the DashboardSection component.
 * 
 * @property {Student} student - The student object.
 * @property {TrackingEntry[]} trackingEntries - All tracking entries for the student.
 * @property {object} filteredData - Data filtered by the selected date range.
 * @property {TimeRange} selectedRange - The currently selected time range for filtering.
 * @property {(range: TimeRange) => void} onRangeChange - Callback to handle changes to the date range.
 * @property {Insights | null} insights - The AI-generated insights for the student.
 * @property {boolean} isLoadingInsights - Flag indicating if insights are currently being loaded.
 */
interface DashboardSectionProps {
  student: Student;
  trackingEntries: TrackingEntry[];
  filteredData: {
    entries: TrackingEntry[];
    emotions: EmotionEntry[];
    sensoryInputs: SensoryEntry[];
  };
  selectedRange: TimeRange;
  onRangeChange: (range: TimeRange) => void;
  insights: Insights | null;
  isLoadingInsights: boolean;
}

export function DashboardSection({ 
  student, 
  trackingEntries, 
  filteredData, 
  selectedRange, 
  onRangeChange,
  insights,
  isLoadingInsights, 
}: DashboardSectionProps) {
  const { tStudent, tCommon } = useTranslation();
  const navigate = useNavigate();
  const [showAdvancedDetails, setShowAdvancedDetails] = useState(false);

  // Calculate stats for the selected period
  const stats = {
    totalSessions: filteredData.entries.length,
    totalEmotions: filteredData.emotions.length,
    totalSensoryInputs: filteredData.sensoryInputs.length
  };

  // Calculate simple data quality score
  const dataQualityScore = Math.min(
    100,
    Math.round(
      ((stats.totalSessions * 0.4) + (stats.totalEmotions * 0.3) + (stats.totalSensoryInputs * 0.3)) / 10 * 100
    )
  );

  const getQualityStatus = (score: number) => {
    if (score >= 80) return { label: 'Utmerket', color: 'bg-green-500', variant: 'default' as const };
    if (score >= 60) return { label: 'God', color: 'bg-blue-500', variant: 'secondary' as const };
    if (score >= 40) return { label: 'Moderat', color: 'bg-yellow-500', variant: 'outline' as const };
    return { label: 'Trenger mer data', color: 'bg-red-500', variant: 'destructive' as const };
  };

  const qualityStatus = getQualityStatus(dataQualityScore);

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Oversikt</h2>
          <p className="text-muted-foreground">
            Sammendrag av {student.name}s data og aktivitet
          </p>
        </div>
        <Button
          onClick={() => navigate(`/track/${student.id}`)}
          className="bg-gradient-primary hover:opacity-90"
        >
          <Plus className="h-4 w-4 mr-2" />
          {String(tStudent('interface.newSession'))}
        </Button>
      </div>

      {/* Analytics Status */}
      <Card className="bg-gradient-card border-0 shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Analysestatus
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AnalyticsStatusIndicator studentId={student.id} />
        </CardContent>
      </Card>

      {/* Date Range Selector */}
      <Card className="bg-gradient-card border-0 shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {String(tStudent('interface.dataAnalysisPeriod'))}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DateRangeSelector 
            selectedRange={selectedRange}
            onRangeChange={onRangeChange}
          />
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-card border-0 shadow-soft">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {String(tStudent('interface.sessionsInPeriod'))}
                </p>
                <p className="text-2xl font-bold">{stats.totalSessions}</p>
              </div>
              <Badge variant="secondary">{String(tStudent('interface.totalSessions'))}</Badge>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card border-0 shadow-soft">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {String(tStudent('interface.emotionsTracked'))}
                </p>
                <p className="text-2xl font-bold">{stats.totalEmotions}</p>
              </div>
              <Badge variant="secondary">{String(tStudent('interface.totalEmotions'))}</Badge>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card border-0 shadow-soft">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {String(tStudent('interface.sensoryInputs'))}
                </p>
                <p className="text-2xl font-bold">{stats.totalSensoryInputs}</p>
              </div>
              <Badge variant="secondary">{String(tStudent('interface.totalSensoryInputs'))}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Simple Data Quality Overview */}
      <Card className="bg-gradient-card border-0 shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Datakvalitet
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground">Samlet kvalitetsscore</p>
              <p className="text-3xl font-bold">{dataQualityScore}%</p>
            </div>
            <Badge variant={qualityStatus.variant} className="ml-2">
              {qualityStatus.label}
            </Badge>
          </div>
          
          <div className="bg-muted rounded-full h-2 mb-4 overflow-hidden">
            <div 
              className={cn(
                "bg-primary h-2 rounded-full transition-all duration-500",
                "w-full origin-left"
              )}
              style={{ transform: `scaleX(${dataQualityScore / 100})` }}
            />
          </div>

          <Collapsible open={showAdvancedDetails} onOpenChange={setShowAdvancedDetails}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                <span className="text-sm text-muted-foreground">
                  {showAdvancedDetails ? 'Skjul detaljer' : 'Vis detaljert analyse'}
                </span>
                <ChevronDown className={cn(
                  "h-4 w-4 transition-transform",
                  showAdvancedDetails && "rotate-180"
                )} />
              </Button>
            </CollapsibleTrigger>
            
            <CollapsibleContent className="space-y-6 mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <DataRequirementsCalculator
                  entries={filteredData.entries}
                  emotions={filteredData.emotions}
                  sensoryInputs={filteredData.sensoryInputs}
                />
                <DataQualityFeedback
                  entries={filteredData.entries}
                  emotions={filteredData.emotions}
                  sensoryInputs={filteredData.sensoryInputs}
                />
              </div>
              
              <DataCollectionRoadmap
                entries={filteredData.entries}
                emotions={filteredData.emotions}
                sensoryInputs={filteredData.sensoryInputs}
              />
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {/* AI Insights */}
      {isLoadingInsights ? (
        <Card className="bg-gradient-card border-0 shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 animate-pulse" />
              AI-genererte innsikter
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-3 bg-accent/20 rounded-lg animate-pulse h-12 w-full" />
              <div className="p-3 bg-accent/20 rounded-lg animate-pulse h-12 w-full" />
            </div>
          </CardContent>
        </Card>
      ) : insights && insights.suggestions && insights.suggestions.length > 0 && (
        <Card className="bg-gradient-card border-0 shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              AI-genererte innsikter
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insights.suggestions.slice(0, 3).map((suggestion: string, index: number) => (
                <div key={index} className="p-3 bg-accent/20 rounded-lg">
                  <p className="text-sm">{suggestion}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Sessions */}
      {filteredData.entries.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Nylige økter</h3>
          <PaginatedSessionsList sessions={filteredData.entries} />
        </div>
      )}
    </div>
  );
}