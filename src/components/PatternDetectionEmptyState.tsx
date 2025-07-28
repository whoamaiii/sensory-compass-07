import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, TrendingUp, Calendar, Target } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

interface PatternDetectionEmptyStateProps {
  dataPoints: number;
  daysWithData: number;
  onCollectData?: () => void;
  className?: string;
}

export const PatternDetectionEmptyState = ({
  dataPoints,
  daysWithData,
  onCollectData,
  className
}: PatternDetectionEmptyStateProps) => {
  const { tCommon } = useTranslation();

  const getGuidanceMessage = () => {
    if (dataPoints === 0) {
      return {
        title: "Ingen data registrert ennå",
        description: "Start med å registrere følelser og sensoriske opplevelser for å oppdage mønstre.",
        actionText: "Registrer første oppføring",
        icon: AlertTriangle,
        color: "text-orange-600"
      };
    }

    if (dataPoints < 3) {
      return {
        title: "Trenger mer data for mønstergjenkjenning",
        description: `Du har ${dataPoints} datapunkter. Registrer minst ${3 - dataPoints} til for å begynne å se mønstre.`,
        actionText: "Fortsett å registrere data",
        icon: Target,
        color: "text-blue-600"
      };
    }

    if (daysWithData < 7) {
      return {
        title: "Trenger data over lengre tid",
        description: `Du har ${daysWithData} dager med data. Samle data over minst 7 dager for å identifisere trender.`,
        actionText: "Fortsett daglig registrering",
        icon: Calendar,
        color: "text-purple-600"
      };
    }

    return {
      title: "Ingen tydelige mønstre oppdaget ennå",
      description: "Data er tilgjengelig, men ingen sterke mønstre er funnet. Dette kan være positivt - det kan bety stabil tilstand.",
      actionText: "Fortsett å overvåke",
      icon: TrendingUp,
      color: "text-green-600"
    };
  };

  const guidance = getGuidanceMessage();
  const Icon = guidance.icon;

  const requirements = [
    { label: "Minimum datapunkter", current: dataPoints, target: 3, met: dataPoints >= 3 },
    { label: "Dager med data", current: daysWithData, target: 7, met: daysWithData >= 7 },
    { label: "Regelmessighet", current: "Variabel", target: "Daglig", met: false }
  ];

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className={`h-5 w-5 ${guidance.color}`} />
          {guidance.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-muted-foreground">
          {guidance.description}
        </p>

        {/* Requirements Progress */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Krav for mønstergjenkjenning:</h4>
          {requirements.map((req, index) => (
            <div key={index} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50">
              <span className="text-sm">{req.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {req.current} / {req.target}
                </span>
                <div className={`w-3 h-3 rounded-full ${req.met ? 'bg-green-500' : 'bg-muted-foreground/30'}`} />
              </div>
            </div>
          ))}
        </div>

        {/* Quick Tips */}
        <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
            Tips for bedre mønstergjenkjenning:
          </h4>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>• Registrer data på samme tid hver dag</li>
            <li>• Inkluder både følelser og sensoriske opplevelser</li>
            <li>• Legg merke til miljøfaktorer (støy, lys, aktivitet)</li>
            <li>• Vær konsistent i minst 2-3 uker</li>
          </ul>
        </div>

        {/* Action Button */}
        {onCollectData && (
          <Button 
            onClick={onCollectData}
            className="w-full bg-gradient-primary hover:opacity-90"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            {guidance.actionText}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};