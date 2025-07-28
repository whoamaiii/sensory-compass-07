import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PaginatedSessionsList } from '@/components/PaginatedSessionsList';
import { DataRequirementsCalculator } from '@/components/DataRequirementsCalculator';
import { DataQualityFeedback } from '@/components/DataQualityFeedback';
import { DataCollectionRoadmap } from '@/components/DataCollectionRoadmap';
import { AnalyticsStatusIndicator } from '@/components/AnalyticsStatusIndicator';
import { DateRangeSelector, TimeRange } from '@/components/DateRangeSelector';
import { Student, TrackingEntry, EmotionEntry, SensoryEntry } from '@/types/student';
import { useTranslation } from '@/hooks/useTranslation';
import { Plus, Calendar, BarChart3, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
  insights: any;
}

export function DashboardSection({ 
  student, 
  trackingEntries, 
  filteredData, 
  selectedRange, 
  onRangeChange,
  insights 
}: DashboardSectionProps) {
  const { tStudent, tCommon } = useTranslation();
  const navigate = useNavigate();

  // Calculate stats for the selected period
  const stats = {
    totalSessions: filteredData.entries.length,
    totalEmotions: filteredData.emotions.length,
    totalSensoryInputs: filteredData.sensoryInputs.length
  };

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

      {/* Data Quality Section */}
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

      {/* Data Collection Roadmap */}
      <DataCollectionRoadmap
        entries={filteredData.entries}
        emotions={filteredData.emotions}
        sensoryInputs={filteredData.sensoryInputs}
      />

      {/* AI Insights */}
      {insights && insights.suggestions && insights.suggestions.length > 0 && (
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