import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Calendar, CheckCircle2, Clock, Target } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { EmotionEntry, SensoryEntry, TrackingEntry } from '@/types/student';
import { differenceInDays, addDays, format } from 'date-fns';

interface DataCollectionRoadmapProps {
  emotions: EmotionEntry[];
  sensoryInputs: SensoryEntry[];
  entries: TrackingEntry[];
  className?: string;
}

interface Milestone {
  id: string;
  title: string;
  description: string;
  targetDataPoints: number;
  targetDays: number;
  confidenceLevel: string;
  achieved: boolean;
  progress: number;
  estimatedDate: Date | null;
  icon: React.ComponentType<{className?: string}>;
  color: string;
}

export const DataCollectionRoadmap = ({ 
  emotions, 
  sensoryInputs, 
  entries, 
  className 
}: DataCollectionRoadmapProps) => {
  const { tAnalytics, formatDate } = useTranslation();

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
      startDate: allTimestamps[0] || new Date(),
      hasData: totalDataPoints > 0
    };
  }, [emotions, sensoryInputs, entries]);

  // Define roadmap milestones
  const milestones: Milestone[] = useMemo(() => {
    const baseDate = currentStatus.startDate || new Date();
    
    return [
      {
        id: 'initial',
        title: 'Første datainnsamling',
        description: 'Start med å registrere grunnleggende data',
        targetDataPoints: 3,
        targetDays: 3,
        confidenceLevel: 'Grunnlag',
        achieved: currentStatus.dataPoints >= 3 && currentStatus.daysSpan >= 3,
        progress: Math.min(100, (currentStatus.dataPoints / 3 + currentStatus.daysSpan / 3) * 50),
        estimatedDate: currentStatus.dataPoints >= 3 ? null : addDays(baseDate, 3),
        icon: Target,
        color: 'bg-blue-500'
      },
      {
        id: 'basic',
        title: 'Grunnleggende mønster',
        description: 'Nok data til å se grunnleggende trender',
        targetDataPoints: 10,
        targetDays: 14,
        confidenceLevel: 'Lav sikkerhet (25%)',
        achieved: currentStatus.dataPoints >= 10 && currentStatus.daysSpan >= 14,
        progress: Math.min(100, (currentStatus.dataPoints / 10 + currentStatus.daysSpan / 14) * 50),
        estimatedDate: currentStatus.dataPoints >= 10 && currentStatus.daysSpan >= 14 ? null : addDays(baseDate, 14),
        icon: Clock,
        color: 'bg-orange-500'
      },
      {
        id: 'reliable',
        title: 'Pålitelige innsikter',
        description: 'Tilstrekkelig data for moderate innsikter',
        targetDataPoints: 20,
        targetDays: 28,
        confidenceLevel: 'Middels sikkerhet (50%)',
        achieved: currentStatus.dataPoints >= 20 && currentStatus.daysSpan >= 28,
        progress: Math.min(100, (currentStatus.dataPoints / 20 + currentStatus.daysSpan / 28) * 50),
        estimatedDate: currentStatus.dataPoints >= 20 && currentStatus.daysSpan >= 28 ? null : addDays(baseDate, 28),
        icon: CheckCircle2,
        color: 'bg-yellow-500'
      },
      {
        id: 'strong',
        title: 'Sterke mønstre',
        description: 'Høy sikkerhet for pedagogiske beslutninger',
        targetDataPoints: 35,
        targetDays: 42,
        confidenceLevel: 'Høy sikkerhet (75%)',
        achieved: currentStatus.dataPoints >= 35 && currentStatus.daysSpan >= 42,
        progress: Math.min(100, (currentStatus.dataPoints / 35 + currentStatus.daysSpan / 42) * 50),
        estimatedDate: currentStatus.dataPoints >= 35 && currentStatus.daysSpan >= 42 ? null : addDays(baseDate, 42),
        icon: CheckCircle2,
        color: 'bg-green-500'
      },
      {
        id: 'excellent',
        title: 'Utmerket datagrunnlag',
        description: 'Optimalt datagrunnlag for avanserte analyser',
        targetDataPoints: 50,
        targetDays: 60,
        confidenceLevel: 'Meget høy sikkerhet (90%)',
        achieved: currentStatus.dataPoints >= 50 && currentStatus.daysSpan >= 60,
        progress: Math.min(100, (currentStatus.dataPoints / 50 + currentStatus.daysSpan / 60) * 50),
        estimatedDate: currentStatus.dataPoints >= 50 && currentStatus.daysSpan >= 60 ? null : addDays(baseDate, 60),
        icon: CheckCircle2,
        color: 'bg-emerald-500'
      }
    ];
  }, [currentStatus]);

  // Get current and next milestone
  const currentMilestone = milestones.findIndex(m => !m.achieved);
  const nextMilestone = milestones[currentMilestone];

  if (!currentStatus.hasData) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Datainnsamlingskart
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground mb-4">
            Start datainnsamlingen for å se ditt fremgangskart mot høyere sikkerhetsnivåer.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Datainnsamlingskart
        </CardTitle>
        <div className="text-sm text-muted-foreground">
          Fremgang mot høyere sikkerhetsnivå gjennom systematisk datainnsamling
        </div>
      </CardHeader>
      <CardContent>
        {/* Current Progress Summary */}
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">Din fremgang</span>
            <Badge variant="outline">
              {milestones.filter(m => m.achieved).length} av {milestones.length} milepæler
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Datapunkter: </span>
              <span className="font-medium">{currentStatus.dataPoints}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Dager: </span>
              <span className="font-medium">{currentStatus.daysSpan}</span>
            </div>
          </div>
        </div>

        {/* Next Milestone Focus */}
        {nextMilestone && (
          <div className="mb-6 p-4 border-2 border-dashed border-primary/30 rounded-lg">
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 rounded-full ${nextMilestone.color} text-white`}>
                <nextMilestone.icon className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-medium">Neste mål: {nextMilestone.title}</h4>
                <p className="text-sm text-muted-foreground">{nextMilestone.description}</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Fremgang</span>
                <span>{Math.round(nextMilestone.progress)}%</span>
              </div>
              <Progress value={nextMilestone.progress} className="h-2" />
              <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                <div>
                  Datapunkter: {currentStatus.dataPoints}/{nextMilestone.targetDataPoints}
                </div>
                <div>
                  Dager: {currentStatus.daysSpan}/{nextMilestone.targetDays}
                </div>
              </div>
            </div>

            {nextMilestone.estimatedDate && (
              <div className="mt-3 text-sm text-blue-600 dark:text-blue-400">
                <Calendar className="h-4 w-4 inline mr-1" />
                Estimert ferdigdato: {formatDate(nextMilestone.estimatedDate)}
              </div>
            )}
          </div>
        )}

        {/* Roadmap Timeline */}
        <div className="space-y-4">
          <h4 className="font-medium">Komplett veikart</h4>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />
            
            {milestones.map((milestone, index) => (
              <div key={milestone.id} className="relative flex items-start gap-4 pb-6">
                {/* Milestone icon */}
                <div className={`relative z-10 flex items-center justify-center w-12 h-12 rounded-full border-2 ${
                  milestone.achieved 
                    ? `${milestone.color} border-transparent text-white` 
                    : 'bg-background border-border text-muted-foreground'
                }`}>
                  <milestone.icon className="h-5 w-5" />
                </div>
                
                {/* Milestone content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h5 className={`font-medium ${milestone.achieved ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {milestone.title}
                    </h5>
                    <Badge variant={milestone.achieved ? 'default' : 'outline'} className="ml-2">
                      {milestone.achieved ? 'Oppnådd' : milestone.confidenceLevel}
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-2">
                    {milestone.description}
                  </p>
                  
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{milestone.targetDataPoints} datapunkter</span>
                    <span>{milestone.targetDays} dager</span>
                    {milestone.estimatedDate && !milestone.achieved && (
                      <span>Estimert: {formatDate(milestone.estimatedDate)}</span>
                    )}
                  </div>
                  
                  {!milestone.achieved && milestone.progress > 0 && (
                    <div className="mt-2">
                      <Progress value={milestone.progress} className="h-1" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};