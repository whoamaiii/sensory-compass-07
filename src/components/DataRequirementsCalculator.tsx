import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Calendar, Target, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { EmotionEntry, SensoryEntry, TrackingEntry } from '@/types/student';
import { differenceInDays, addDays, format } from 'date-fns';

interface DataRequirementsCalculatorProps {
  emotions: EmotionEntry[];
  sensoryInputs: SensoryEntry[];
  entries: TrackingEntry[];
  className?: string;
}

interface ConfidenceRequirement {
  level: 'low' | 'medium' | 'high';
  percentage: number;
  minDataPoints: number;
  minDays: number;
  minRSquared: number;
  color: string;
  description: string;
}

interface RequirementProgress {
  current: number;
  needed: number;
  progress: number;
  daysToTarget: number;
  targetDate: Date;
}

export const DataRequirementsCalculator = ({ 
  emotions, 
  sensoryInputs, 
  entries, 
  className 
}: DataRequirementsCalculatorProps) => {
  const { tAnalytics, formatDate } = useTranslation();

  // Define confidence level requirements
  const requirements: ConfidenceRequirement[] = [
    {
      level: 'low',
      percentage: 25,
      minDataPoints: 5,
      minDays: 7,
      minRSquared: 0.3,
      color: 'bg-orange-500',
      description: String(tAnalytics('confidence.low'))
    },
    {
      level: 'medium',
      percentage: 50,
      minDataPoints: 15,
      minDays: 21,
      minRSquared: 0.5,
      color: 'bg-yellow-500',
      description: String(tAnalytics('confidence.medium'))
    },
    {
      level: 'high',
      percentage: 75,
      minDataPoints: 30,
      minDays: 42,
      minRSquared: 0.7,
      color: 'bg-green-500',
      description: String(tAnalytics('confidence.high'))
    }
  ];

  // Calculate current data status
  const currentStatus = useMemo(() => {
    const totalDataPoints = emotions.length + sensoryInputs.length;
    const allTimestamps = [
      ...emotions.map(e => e.timestamp),
      ...sensoryInputs.map(s => s.timestamp),
      ...entries.map(e => e.timestamp)
    ].sort((a, b) => a.getTime() - b.getTime());

    const daysSpan = allTimestamps.length > 0 
      ? differenceInDays(new Date(), allTimestamps[0]) + 1 
      : 0;

    return {
      dataPoints: totalDataPoints,
      daysSpan,
      entriesCount: entries.length,
      startDate: allTimestamps[0] || new Date(),
      hasData: totalDataPoints > 0
    };
  }, [emotions, sensoryInputs, entries]);

  // Calculate progress toward each confidence level
  const progressCalculations = useMemo(() => {
    return requirements.map(req => {
      const dataPointsProgress = Math.min(100, (currentStatus.dataPoints / req.minDataPoints) * 100);
      const daysProgress = Math.min(100, (currentStatus.daysSpan / req.minDays) * 100);
      const overallProgress = Math.min(dataPointsProgress, daysProgress);

      const dataPointsNeeded = Math.max(0, req.minDataPoints - currentStatus.dataPoints);
      const daysNeeded = Math.max(0, req.minDays - currentStatus.daysSpan);

      // Estimate days to target (assuming 1 data point per day)
      const daysToTarget = Math.max(dataPointsNeeded, daysNeeded);
      const targetDate = addDays(new Date(), daysToTarget);

      return {
        requirement: req,
        progress: overallProgress,
        dataPoints: {
          current: currentStatus.dataPoints,
          needed: dataPointsNeeded,
          progress: dataPointsProgress
        },
        days: {
          current: currentStatus.daysSpan,
          needed: daysNeeded,
          progress: daysProgress
        },
        daysToTarget,
        targetDate,
        isAchieved: overallProgress >= 100
      };
    });
  }, [requirements, currentStatus]);

  // Get next target confidence level
  const nextTarget = progressCalculations.find(p => !p.isAchieved);
  const currentLevel = progressCalculations.filter(p => p.isAchieved).length;

  // Calculate recommended daily collection rate
  const getRecommendedRate = () => {
    if (!nextTarget) return null;
    const dailyRate = Math.ceil(nextTarget.dataPoints.needed / Math.max(nextTarget.daysToTarget, 1));
    return Math.max(1, dailyRate);
  };

  if (!currentStatus.hasData) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Datakrav for sikkerhetsnivå
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground mb-4">
            Ingen data registrert ennå. Start med å samle data for å se fremgang mot sikkerhetsnivåer.
          </p>
          <Button variant="outline">
            Start datainnsamling
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Datakrav for sikkerhetsnivå
        </CardTitle>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{currentStatus.dataPoints} datapunkter samlet</span>
          <span>{currentStatus.daysSpan} dager med data</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Status */}
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div>
            <p className="font-medium">Nåværende sikkerhetsnivå</p>
            <p className="text-sm text-muted-foreground">
              {currentLevel === 0 && 'Under lavt nivå'}
              {currentLevel === 1 && 'Lavt nivå oppnådd'}
              {currentLevel === 2 && 'Middels nivå oppnådd'}
              {currentLevel >= 3 && 'Høyt nivå oppnådd'}
            </p>
          </div>
          <Badge variant={currentLevel >= 3 ? 'default' : currentLevel >= 1 ? 'secondary' : 'outline'}>
            {currentLevel >= 3 ? 'Høy' : currentLevel >= 1 ? 'Middels' : 'Lav'} sikkerhet
          </Badge>
        </div>

        {/* Progress toward next level */}
        {nextTarget && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Fremgang mot {nextTarget.requirement.description}</h4>
              <span className="text-sm text-muted-foreground">
                {Math.round(nextTarget.progress)}% fullført
              </span>
            </div>
            
            <Progress value={nextTarget.progress} className="h-2" />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Datapunkter</span>
                  <span>{nextTarget.dataPoints.current} / {nextTarget.requirement.minDataPoints}</span>
                </div>
                <Progress value={nextTarget.dataPoints.progress} className="h-1" />
                {nextTarget.dataPoints.needed > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {nextTarget.dataPoints.needed} flere datapunkter trengs
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Tidsperiode</span>
                  <span>{nextTarget.days.current} / {nextTarget.requirement.minDays} dager</span>
                </div>
                <Progress value={nextTarget.days.progress} className="h-1" />
                {nextTarget.days.needed > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {nextTarget.days.needed} flere dager trengs
                  </p>
                )}
              </div>
            </div>

            {/* Timeline prediction */}
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-blue-900 dark:text-blue-100">Tidsestimat</span>
              </div>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Med {getRecommendedRate()} datapunkt(er) per dag vil du nå{' '}
                <span className="font-medium">{nextTarget.requirement.description}</span> innen{' '}
                <span className="font-medium">{formatDate(nextTarget.targetDate)}</span>
                {nextTarget.daysToTarget > 0 && ` (om ${nextTarget.daysToTarget} dager)`}
              </p>
            </div>
          </div>
        )}

        {/* All confidence levels overview */}
        <div className="space-y-3">
          <h4 className="font-medium">Alle sikkerhetsnivåer</h4>
          {progressCalculations.map((calc, index) => (
            <div 
              key={calc.requirement.level}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                calc.isAchieved ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' : 
                'bg-muted/30'
              }`}
            >
              <div className="flex items-center gap-3">
                {calc.isAchieved ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <div className={`w-5 h-5 rounded-full ${calc.requirement.color} opacity-60`} />
                )}
                <div>
                  <p className="font-medium">{calc.requirement.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {calc.requirement.minDataPoints} datapunkter over {calc.requirement.minDays} dager
                  </p>
                </div>
              </div>
              <div className="text-right">
                <Badge variant={calc.isAchieved ? 'default' : 'outline'}>
                  {calc.isAchieved ? 'Oppnådd' : `${Math.round(calc.progress)}%`}
                </Badge>
                {!calc.isAchieved && calc.daysToTarget > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    ~{calc.daysToTarget} dager igjen
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Collection recommendations */}
        {nextTarget && (
          <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              <span className="font-medium text-purple-900 dark:text-purple-100">Anbefalinger</span>
            </div>
            <ul className="text-sm text-purple-800 dark:text-purple-200 space-y-1">
              <li>• Samle {getRecommendedRate()} datapunkt(er) per dag for optimal fremgang</li>
              <li>• Registrer data konsekvent for bedre mønstergjenkjenning</li>
              <li>• Inkluder både følelser og sensoriske opplevelser i hver økt</li>
              <li>• Noter miljøfaktorer for å identifisere sammenhenger</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};