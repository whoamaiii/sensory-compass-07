import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AnalyticsDashboard } from '@/components/AnalyticsDashboard';
import { LazyInteractiveDataVisualization } from '@/components/lazy/LazyInteractiveDataVisualization';
import { DetailedConfidenceExplanation } from '@/components/DetailedConfidenceExplanation';
import { ConfidenceIndicator } from '@/components/ConfidenceIndicator';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Student, TrackingEntry, EmotionEntry, SensoryEntry, Insights, Pattern, Correlation } from '@/types/student';
import { useTranslation } from '@/hooks/useTranslation';
import { BarChart3, TrendingUp, AlertCircle, Loader } from 'lucide-react';
import { PatternDetectionEmptyState } from '@/components/PatternDetectionEmptyState';
import { logger } from '@/lib/logger';

/**
 * @interface AnalyticsSectionProps
 * Props for the AnalyticsSection component.
 * 
 * @property {Student} student - The student object.
 * @property {TrackingEntry[]} trackingEntries - All tracking entries for the student.
 * @property {object} filteredData - Data filtered by the selected date range.
 * @property {Insights | null} insights - The AI-generated insights for the student.
 * @property {boolean} isLoadingInsights - Flag indicating if insights are currently being loaded.
 */
interface AnalyticsSectionProps {
  student: Student;
  trackingEntries: TrackingEntry[];
  filteredData: {
    entries: TrackingEntry[];
    emotions: EmotionEntry[];
    sensoryInputs: SensoryEntry[];
  };
  insights: Insights | null;
  isLoadingInsights: boolean;
}

export function AnalyticsSection({ 
  student, 
  trackingEntries, 
  filteredData, 
  insights,
  isLoadingInsights,
}: AnalyticsSectionProps) {
  const { tAnalytics, tCommon } = useTranslation();

  useEffect(() => {
    logger.debug('[AnalyticsSection] Props received', {
      studentId: student?.id,
      trackingEntriesCount: trackingEntries?.length,
      filteredDataEntriesCount: filteredData?.entries?.length,
      hasInsights: !!insights,
      isLoadingInsights,
    });
  }, [student, trackingEntries, filteredData, insights, isLoadingInsights]);

  if (!student || !filteredData || !trackingEntries) {
    return (
      <div className="space-y-6">
        <Card className="bg-gradient-card border-0 shadow-soft">
          <CardContent className="p-6">
            <div className="text-center text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              <p>Analytics data is not available</p>
              <p className="text-sm mt-2">
                The required data for this section is missing or still loading. Please try again later.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const safeFilteredData = {
    entries: filteredData.entries || [],
    emotions: filteredData.emotions || [],
    sensoryInputs: filteredData.sensoryInputs || [],
  };

  const getConfidenceLevel = () => {
    const totalEntries = safeFilteredData.entries.length;
    const totalEmotions = safeFilteredData.emotions.length;
    
    if (totalEntries < 5) return 0.3;
    if (totalEntries < 15 || totalEmotions < 10) return 0.7;
    return 0.9;
  };

  const confidenceLevel = getConfidenceLevel();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Dataanalyse</h2>
        <p className="text-muted-foreground">
          Avansert analyse av {student.name}s mønstre og trender
        </p>
      </div>

      {/* Systemforklaring (Norwegian explainer) */}
      <Card className="bg-card/60 border border-border/60">
        <CardHeader>
          <CardTitle>Systemforklaring</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <p>
            Denne siden sammenfatter elevens data for å gi et oversiktlig bilde av
            emosjoner, sanseinntrykk og miljøfaktorer over tid. Systemet bruker
            statistiske metoder for å finne mønstre, beregne korrelasjoner og gi
            anbefalinger. Korrelasjonskartet (varmekart) viser styrken på
            sammenhenger mellom faktorer fra −1 (sterk negativ) til 1 (sterk
            positiv). Bare tydeligere sammenhenger merkes med tall for å holde
            visningen ryddig.
          </p>
          <p>
            Innsiktene genereres lokalt i nettleseren og tunge beregninger kjøres i en
            web‑arbeider for å bevare ytelse. Ingen persondata sendes til en server.
            Resultatene bør tolkes som støtte for faglig vurdering, ikke som fasit.
          </p>
          <p className="text-xs text-muted-foreground/80">
            Tips: Hold musepekeren over celler i varmekartet for detaljer som
            korrelasjonsverdi og signifikans. Bruk filtrene over diagrammene for
            å justere tidsrom og se hvordan mønstrene endrer seg.
          </p>
        </CardContent>
      </Card>

      {/* Main Analytics Dashboard */}
      <ErrorBoundary showToast={false}>
        <AnalyticsDashboard
          student={student}
          filteredData={safeFilteredData}
        />
      </ErrorBoundary>

      {/* Confidence Explanation */}
      <Card className="bg-gradient-card border-0 shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Analysetillit og datakvalitet
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <ConfidenceIndicator 
              confidence={confidenceLevel}
              dataPoints={filteredData?.entries?.length || 0}
            />
              <DetailedConfidenceExplanation
                confidence={confidenceLevel}
                dataPoints={(filteredData?.entries?.length || 0) + (filteredData?.emotions?.length || 0) + (filteredData?.sensoryInputs?.length || 0)}
                timeSpanDays={30}
                rSquared={Math.min(0.9, 0.4 + (confidenceLevel * 0.5))}
              />
          </div>
        </CardContent>
      </Card>


      {/* Inline visualization removed to avoid duplication with dashboard tabs */}

      {/* Detailed Insights */}
      {isLoadingInsights ? (
        <Card className="bg-gradient-card border-0 shadow-soft">
           <CardHeader>
             <CardTitle className="flex items-center gap-2">
               <Loader className="h-5 w-5 animate-spin" />
               Laster innsikter...
             </CardTitle>
           </CardHeader>
           <CardContent className="h-48 flex items-center justify-center">
             <p className="text-muted-foreground">Analyserer data...</p>
           </CardContent>
         </Card>
      ) : insights && (insights.patterns?.length > 0 || insights.correlations?.length > 0) ? (
        <Card className="bg-gradient-card border-0 shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Detaljerte innsikter
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {insights.patterns && insights.patterns.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Oppdagede mønstre:</h4>
                  <div className="space-y-2">
                    {insights.patterns.map((pattern: Pattern, index: number) => (
                      <div key={index} className="p-3 bg-accent/20 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium">{pattern.pattern}</p>
                          <span className="text-xs px-2 py-1 bg-primary/20 text-primary rounded">
                            {Math.round((pattern.confidence || 0) * 100)}% sikkerhet
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{pattern.description}</p>
                        {pattern.recommendations && pattern.recommendations.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs font-medium mb-1">Anbefalinger:</p>
                            <ul className="text-xs text-muted-foreground space-y-1">
                              {pattern.recommendations.slice(0, 2).map((rec: string, i: number) => (
                                <li key={i}>• {rec}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {insights.correlations && insights.correlations.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Korrelasjoner:</h4>
                  <div className="space-y-2">
                    {insights.correlations.map((correlation: Correlation, index: number) => (
                      <div key={index} className="p-3 bg-accent/20 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium">{correlation.factor1} ↔ {correlation.factor2}</p>
                          <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-600 rounded">
                            r = {correlation.correlation?.toFixed(2) || 'N/A'}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{correlation.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <PatternDetectionEmptyState
          dataPoints={(filteredData?.emotions?.length || 0) + (filteredData?.sensoryInputs?.length || 0)}
          daysWithData={Math.max(1, new Set(
            (filteredData?.entries || []).map(e => {
              const timestamp = e.timestamp instanceof Date ? e.timestamp : new Date(e.timestamp);
              return timestamp.toDateString();
            })
          ).size)}
          onCollectData={() => window.location.href = `/track/${student.id}`}
        />
      )}
    </div>
  );
}