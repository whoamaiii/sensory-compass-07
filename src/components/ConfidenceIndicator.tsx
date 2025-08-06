import React, { memo } from 'react';
import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useTranslation } from '@/hooks/useTranslation';
import { differenceInDays } from 'date-fns';

interface ConfidenceIndicatorProps {
  confidence: number;
  dataPoints?: number;
  timeSpanDays?: number;
  rSquared?: number;
  className?: string;
}

export const ConfidenceIndicator = memo<ConfidenceIndicatorProps>(({
  confidence,
  dataPoints = 0,
  timeSpanDays = 0,
  rSquared = 0,
  className = ''
}) => {
  const { tAnalytics } = useTranslation();

  const getConfidenceLevel = (): 'low' | 'medium' | 'high' => {
    if (confidence >= 0.7) return 'high';
    if (confidence >= 0.4) return 'medium';
    return 'low';
  };

  const getConfidenceColor = () => {
    const level = getConfidenceLevel();
    switch (level) {
      case 'high': return 'text-emerald-600';
      case 'medium': return 'text-amber-600';
      case 'low': return 'text-orange-600';
    }
  };

  const generateExplanations = (): string[] => {
    const explanations: string[] = [];
    
    if (dataPoints < 10) {
      explanations.push(String(tAnalytics('confidence.explanations.insufficientData', { 
        count: dataPoints, 
        minimum: 10 
      })));
    }
    
    if (timeSpanDays < 14) {
      explanations.push(String(tAnalytics('confidence.explanations.shortTimespan', { 
        days: timeSpanDays, 
        recommended: 21 
      })));
    }
    
    if (rSquared < 0.3) {
      explanations.push(String(tAnalytics('confidence.explanations.weakPattern', { 
        rsquared: rSquared.toFixed(3) 
      })));
    } else if (rSquared > 0.7) {
      explanations.push(String(tAnalytics('confidence.explanations.strongPattern', { 
        rsquared: rSquared.toFixed(3) 
      })));
    } else if (rSquared > 0.4) {
      explanations.push(String(tAnalytics('confidence.explanations.moderatePattern')));
    }

    if (explanations.length === 0) {
      if (confidence >= 0.8) {
        explanations.push(String(tAnalytics('confidence.explanations.excellentData')));
      } else if (confidence >= 0.6) {
        explanations.push(String(tAnalytics('confidence.explanations.reliableInsight')));
      } else if (confidence >= 0.3) {
        explanations.push(String(tAnalytics('confidence.explanations.emergingTrend')));
      } else {
        explanations.push(String(tAnalytics('confidence.explanations.needMoreData')));
      }
    }

    return explanations;
  };

  const level = getConfidenceLevel();
  const explanations = generateExplanations();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`inline-flex items-center gap-1 cursor-help ${className}`}>
            <span className={`text-sm font-medium ${getConfidenceColor()}`}>
              {Math.round(confidence * 100)}%
            </span>
            <Info className={`h-3 w-3 ${getConfidenceColor()}`} />
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-2">
            <div className="font-medium">
              {String(tAnalytics(`confidence.${level}`))}
            </div>
            <div className="space-y-1">
              {explanations.map((explanation, index) => (
                <div key={index} className="text-xs text-muted-foreground">
                  • {explanation}
                </div>
              ))}
            </div>
            <div className="text-xs text-muted-foreground pt-1 border-t border-border">
              {String(tAnalytics('confidence.tooltip'))}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

ConfidenceIndicator.displayName = 'ConfidenceIndicator';
