import { useMemo, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle, 
  AlertTriangle, 
  TrendingUp, 
  Calendar, 
  Target,
  BarChart3,
  Clock
} from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { EmotionEntry, SensoryEntry, TrackingEntry } from '@/types/student';
import { differenceInDays, eachDayOfInterval, format, subDays, isWithinInterval } from 'date-fns';

interface DataQualityFeedbackProps {
  emotions: EmotionEntry[];
  sensoryInputs: SensoryEntry[];
  entries: TrackingEntry[];
  className?: string;
}

interface QualityMetric {
  id: string;
  title: string;
  description: string;
  score: number;
  maxScore: number;
  status: 'excellent' | 'good' | 'fair' | 'poor';
  recommendations: string[];
  icon: React.ComponentType<any>;
}

/**
 * DataQualityFeedback
 *
 * Provides visual feedback about the coverage and balance of collected data.
 * Protects against incorrect metric calculations if arrays or their elements are missing/broken.
 */
export const DataQualityFeedback = memo(({ 
  emotions, 
  sensoryInputs, 
  entries, 
  className 
}: DataQualityFeedbackProps) => {
  const { tAnalytics, formatDate } = useTranslation();

  // Calculate comprehensive data quality metrics
  const qualityMetrics = useMemo(() => {
    const totalDataPoints = emotions.length + sensoryInputs.length;
    const totalEntries = entries.length;
    
    if (totalDataPoints === 0) {
      return [];
    }

    // Get data span
    const allTimestamps = [
      ...emotions.map(e => e.timestamp),
      ...sensoryInputs.map(s => s.timestamp),
      ...entries.map(e => e.timestamp)
    ].sort((a, b) => a.getTime() - b.getTime());

    if (allTimestamps.length === 0) {
      return [];
    }
    
    const dataSpan = differenceInDays(new Date(), allTimestamps[0]) + 1;
    const startDate = allTimestamps[0];
    const endDate = new Date();

    // 1. Data Volume Quality
    const volumeScore = Math.min(100, (totalDataPoints / 30) * 100);
    const volumeStatus = volumeScore >= 80 ? 'excellent' : volumeScore >= 60 ? 'good' : volumeScore >= 40 ? 'fair' : 'poor';

    // 2. Consistency Quality (how regularly data is collected)
    const allDays = eachDayOfInterval({ start: startDate, end: endDate });
    const daysWithData = allDays.filter(day => {
      return allTimestamps.some(timestamp => 
        format(timestamp, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
      );
    });
    const consistencyScore = (daysWithData.length / allDays.length) * 100;
    const consistencyStatus = consistencyScore >= 80 ? 'excellent' : consistencyScore >= 60 ? 'good' : consistencyScore >= 40 ? 'fair' : 'poor';

    // 3. Data Diversity Quality (balance between emotions and sensory)
    const emotionRatio = totalDataPoints === 0 ? 0 : emotions.length / totalDataPoints;
    const sensoryRatio = totalDataPoints === 0 ? 0 : sensoryInputs.length / totalDataPoints;
    const diversityBalance = 1 - Math.abs(emotionRatio - sensoryRatio);
    const diversityScore = diversityBalance * 100;
    const diversityStatus = diversityScore >= 80 ? 'excellent' : diversityScore >= 60 ? 'good' : diversityScore >= 40 ? 'fair' : 'poor';

    // 4. Recent Activity Quality (data freshness)
    const recentData = [...emotions, ...sensoryInputs].filter(item => 
      isWithinInterval(item.timestamp, { start: subDays(new Date(), 7), end: new Date() })
    );
    const recentActivityScore = Math.min(100, (recentData.length / 7) * 100);
    const recentActivityStatus = recentActivityScore >= 80 ? 'excellent' : recentActivityScore >= 60 ? 'good' : recentActivityScore >= 40 ? 'fair' : 'poor';

    // 5. Session Completeness (emotions + sensory in same sessions)
    const completeSessions = entries.filter(entry => 
      Array.isArray(entry.emotions) && Array.isArray(entry.sensoryInputs) && entry.emotions.length > 0 && entry.sensoryInputs.length > 0
    );
    const completenessScore = totalEntries > 0 ? (completeSessions.length / totalEntries) * 100 : 0;
    const completenessStatus = completenessScore >= 80 ? 'excellent' : completenessScore >= 60 ? 'good' : completenessScore >= 40 ? 'fair' : 'poor';

    const metrics: QualityMetric[] = [
      {
        id: 'volume',
        title: 'Datamengde',
        description: 'Total mengde data samlet over tid',
        score: Math.round(volumeScore),
        maxScore: 100,
        status: volumeStatus,
        recommendations: [
          volumeScore < 40 ? 'Samle mer data - mål på minst 30 datapunkter' : '',
          volumeScore < 80 ? 'Øk frekvensen på datainnsamling' : '',
          volumeScore >= 80 ? 'Utmerket datamengde!' : ''
        ].filter(Boolean),
        icon: BarChart3
      },
      {
        id: 'consistency',
        title: 'Konsistens',
        description: 'Hvor jevnlig data samles inn',
        score: Math.round(consistencyScore),
        maxScore: 100,
        status: consistencyStatus,
        recommendations: [
          consistencyScore < 60 ? 'Samle data mer regelmessig - ideelt daglig' : '',
          consistencyScore < 80 ? 'Prøv å etablere en fast rutine for datainnsamling' : '',
          consistencyScore >= 80 ? 'Excellent consistency!' : ''
        ].filter(Boolean),
        icon: Calendar
      },
      {
        id: 'diversity',
        title: 'Databalanse',
        description: 'Balanse mellom følelser og sensoriske data',
        score: Math.round(diversityScore),
        maxScore: 100,
        status: diversityStatus,
        recommendations: [
          emotionRatio < 0.3 ? 'Registrer flere følelser' : '',
          sensoryRatio < 0.3 ? 'Registrer flere sensoriske opplevelser' : '',
          diversityScore >= 80 ? 'God balanse mellom datatyper!' : ''
        ].filter(Boolean),
        icon: Target
      },
      {
        id: 'recent',
        title: 'Nylig aktivitet',
        description: 'Datainnsamling siste 7 dager',
        score: Math.round(recentActivityScore),
        maxScore: 100,
        status: recentActivityStatus,
        recommendations: [
          recentActivityScore < 40 ? 'Øk datainnsamlingen de siste dagene' : '',
          recentActivityScore < 80 ? 'Prøv å samle data hver dag denne uken' : '',
          recentActivityScore >= 80 ? 'Utmerket nylig aktivitet!' : ''
        ].filter(Boolean),
        icon: Clock
      },
      {
        id: 'completeness',
        title: 'Øktfullstendighet',
        description: 'Økter med både følelser og sensoriske data',
        score: Math.round(completenessScore),
        maxScore: 100,
        status: completenessStatus,
        recommendations: [
          completenessScore < 60 ? 'Inkluder både følelser og sensoriske data i hver økt' : '',
          completenessScore < 80 ? 'Prøv å være mer komplett i dataregistreringen' : '',
          completenessScore >= 80 ? 'Utmerket øktfullstendighet!' : ''
        ].filter(Boolean),
        icon: CheckCircle
      }
    ];

    return metrics;
  }, [emotions, sensoryInputs, entries]);

  // Calculate overall quality score
  const overallScore = useMemo(() => {
    if (qualityMetrics.length === 0) return 0;
    return Math.round(qualityMetrics.reduce((sum, metric) => sum + metric.score, 0) / qualityMetrics.length);
  }, [qualityMetrics]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-green-600 bg-green-50 dark:bg-green-950/20';
      case 'good': return 'text-blue-600 bg-blue-50 dark:bg-blue-950/20';
      case 'fair': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950/20';
      case 'poor': return 'text-red-600 bg-red-50 dark:bg-red-950/20';
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-950/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'excellent': return <CheckCircle className="h-4 w-4" />;
      case 'good': return <TrendingUp className="h-4 w-4" />;
      case 'fair': return <AlertTriangle className="h-4 w-4" />;
      case 'poor': return <AlertTriangle className="h-4 w-4" />;
      default: return <BarChart3 className="h-4 w-4" />;
    }
  };

  if (qualityMetrics.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Datakvalitet
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">
            Ingen data tilgjengelig for kvalitetsvurdering
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Datakvalitet
        </CardTitle>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Samlet score:</span>
            <Badge variant={overallScore >= 80 ? 'default' : overallScore >= 60 ? 'secondary' : 'outline'}>
              {overallScore}/100
            </Badge>
          </div>
          <Progress value={overallScore} className="flex-1 h-2" />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quality Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {qualityMetrics.map((metric) => (
            <div key={metric.id} className={`p-4 rounded-lg ${getStatusColor(metric.status)}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <metric.icon className="h-4 w-4" />
                  <span className="font-medium">{metric.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(metric.status)}
                  <span className="font-mono text-sm">{metric.score}/{metric.maxScore}</span>
                </div>
              </div>
              
              <p className="text-sm opacity-80 mb-3">{metric.description}</p>
              
              <Progress value={metric.score} className="mb-3 h-1" />
              
              {metric.recommendations.length > 0 && (
                <div className="space-y-1">
                  {metric.recommendations.map((rec, index) => (
                    <p key={index} className="text-xs opacity-90">
                      • {rec}
                    </p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Overall Quality Assessment */}
        <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 rounded-lg">
          <h4 className="font-medium mb-2">Samlet vurdering</h4>
          <p className="text-sm text-muted-foreground mb-3">
            {overallScore >= 90 && 'Utmerket datakvalitet! Dine data gir høy sikkerhet for analyser.'}
            {overallScore >= 70 && overallScore < 90 && 'God datakvalitet. Små forbedringer kan øke sikkerhetsnivået.'}
            {overallScore >= 50 && overallScore < 70 && 'Moderat datakvalitet. Fokuser på de områdene som trenger forbedring.'}
            {overallScore < 50 && 'Datakvaliteten kan forbedres betydelig. Følg anbefalingene for bedre analyser.'}
          </p>
          
          {/* Top Priority Recommendations */}
          {qualityMetrics.filter(m => m.status === 'poor' || m.status === 'fair').length > 0 && (
            <div className="space-y-2">
              <h5 className="text-sm font-medium">Prioriterte forbedringer:</h5>
              {qualityMetrics
                .filter(m => m.status === 'poor' || m.status === 'fair')
                .slice(0, 3)
                .map((metric, index) => (
                  <div key={metric.id} className="text-sm flex items-start gap-2">
                    <span className="font-medium text-xs bg-white dark:bg-gray-800 px-2 py-1 rounded">
                      {index + 1}
                    </span>
                    <span>{metric.recommendations[0]}</span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

DataQualityFeedback.displayName = 'DataQualityFeedback';
