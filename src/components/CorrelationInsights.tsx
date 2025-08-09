import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CorrelationMatrix } from '@/lib/enhancedPatternAnalysis';
import {
  ArrowDownRight,
  ArrowUpRight,
  Activity,
  Eye,
  Thermometer,
  Sun,
  Volume2,
  Link as LinkIcon
} from 'lucide-react';

type CorrelationPair = CorrelationMatrix['significantPairs'][number];

export interface CorrelationInsightsProps {
  pairs: CorrelationPair[];
  maxItems?: number;
  dataPoints?: number;
  title?: string;
}

const factorLabel = (f: string): string => {
  const map: Record<string, string> = {
    avgEmotionIntensity: 'overall emotion intensity',
    positiveEmotionRatio: 'positive emotion rate',
    sensorySeekingRatio: 'sensory seeking rate',
    noiseLevel: 'noise level',
    temperature: 'room temperature',
    lightingQuality: 'lighting quality',
  };
  return map[f] || f.replace(/([A-Z])/g, ' $1').toLowerCase();
};

const factorIcon = (f: string) => {
  switch (f) {
    case 'avgEmotionIntensity':
      return <Activity className="h-4 w-4" />;
    case 'positiveEmotionRatio':
      return <Activity className="h-4 w-4" />;
    case 'sensorySeekingRatio':
      return <Eye className="h-4 w-4" />;
    case 'noiseLevel':
      return <Volume2 className="h-4 w-4" />;
    case 'temperature':
      return <Thermometer className="h-4 w-4" />;
    case 'lightingQuality':
      return <Sun className="h-4 w-4" />;
    default:
      return <LinkIcon className="h-4 w-4" />;
  }
};

const significanceBadgeVariant = (s: CorrelationPair['significance']): 'default' | 'outline' =>
  s === 'high' ? 'default' : 'outline';

const borderClassFor = (corr: number, sig: CorrelationPair['significance']): string => {
  const base = sig === 'high' ? 'border-2 ' : 'border ';
  if (corr > 0.5) return base + 'border-emerald-400';
  if (corr < -0.5) return base + 'border-rose-400';
  if (sig === 'moderate') return base + 'border-amber-300';
  return base + 'border-muted';
};

const strengthText = (s: CorrelationPair['significance']): string =>
  s === 'high' ? 'a strong' : s === 'moderate' ? 'a clear' : 'a notable';

export function CorrelationInsights({
  pairs,
  maxItems = 5,
  dataPoints,
  title = 'Correlation Insights',
}: CorrelationInsightsProps) {
  const topPairs = (pairs || []).slice(0, maxItems);

  if (!topPairs.length) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LinkIcon className="h-5 w-5" />
          {title}
          {typeof dataPoints === 'number' && dataPoints > 0 && (
            <span className="ml-2 text-xs text-muted-foreground">based on {dataPoints} sessions</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {topPairs.map((p, idx) => {
            const positive = p.correlation >= 0;
            const pairTitle = `${factorLabel(p.factor1)} ↔ ${factorLabel(p.factor2)}`;
            const direction = positive ? 'increase' : 'decrease';
            const arrow = positive ? (
              <ArrowUpRight className="h-4 w-4 text-emerald-600" />
            ) : (
              <ArrowDownRight className="h-4 w-4 text-rose-600" />
            );
            return (
              <div
                key={idx}
                className={`p-3 rounded-lg bg-card/50 ${borderClassFor(p.correlation, p.significance)}`}
                aria-label={`Correlation insight ${idx + 1}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {factorIcon(p.factor1)}
                    {factorIcon(p.factor2)}
                    <span className="font-medium capitalize">{pairTitle}</span>
                  </div>
                  <Badge variant={significanceBadgeVariant(p.significance)} className="capitalize">
                    {p.significance}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  We found {strengthText(p.significance)} {positive ? 'positive' : 'negative'} link. When {factorLabel(p.factor1)}
                  {' '}goes up, {factorLabel(p.factor2)} tends to {direction}. {arrow}
                  {' '}<span className="ml-1 text-foreground font-medium">r = {p.correlation.toFixed(2)}</span>
                  {Number.isFinite(p.pValue) && p.pValue >= 0 && p.pValue <= 1 && (
                    <span className="ml-2">(p = {p.pValue.toFixed(3)})</span>
                  )}
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default CorrelationInsights;


