import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslation } from '@/hooks/useTranslation';
import { 
  ChevronDown, 
  ChevronUp, 
  Calculator, 
  TrendingUp, 
  Database, 
  Calendar,
  AlertCircle,
  CheckCircle,
  Target,
  BookOpen,
  Info
} from 'lucide-react';

interface DetailedConfidenceExplanationProps {
  confidence: number;
  dataPoints: number;
  timeSpanDays: number;
  rSquared: number;
  minDataPoints?: number;
  recommendedTimeSpan?: number;
}

export const DetailedConfidenceExplanation: React.FC<DetailedConfidenceExplanationProps> = ({
  confidence,
  dataPoints,
  timeSpanDays,
  rSquared,
  minDataPoints = 10,
  recommendedTimeSpan = 21
}) => {
  const { tAnalytics } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);

  const getConfidenceLevel = (): 'low' | 'medium' | 'high' => {
    if (confidence >= 0.7) return 'high';
    if (confidence >= 0.4) return 'medium';
    return 'low';
  };

  const getDataQualityScore = () => {
    const dataScore = Math.min(dataPoints / minDataPoints, 1) * 100;
    const timeScore = Math.min(timeSpanDays / recommendedTimeSpan, 1) * 100;
    return {
      dataScore: Math.round(dataScore),
      timeScore: Math.round(timeScore),
      overallScore: Math.round((dataScore + timeScore) / 2)
    };
  };

  const getPatternStrength = () => {
    if (rSquared >= 0.7) return { level: 'strong', score: Math.round(rSquared * 100) };
    if (rSquared >= 0.4) return { level: 'moderate', score: Math.round(rSquared * 100) };
    return { level: 'weak', score: Math.round(rSquared * 100) };
  };

  const getConfidenceFactors = () => {
    const factors = [];
    
    if (dataPoints < minDataPoints) {
      factors.push({
        type: 'warning',
        title: String(tAnalytics('confidence.factors.insufficientData.title')),
        description: String(tAnalytics('confidence.factors.insufficientData.description', { 
          current: dataPoints, 
          needed: minDataPoints 
        })),
        impact: 'high',
        actionable: true
      });
    } else {
      factors.push({
        type: 'success',
        title: String(tAnalytics('confidence.factors.sufficientData.title')),
        description: String(tAnalytics('confidence.factors.sufficientData.description', { 
          count: dataPoints 
        })),
        impact: 'positive',
        actionable: false
      });
    }

    if (timeSpanDays < recommendedTimeSpan) {
      factors.push({
        type: 'warning',
        title: String(tAnalytics('confidence.factors.shortTimespan.title')),
        description: String(tAnalytics('confidence.factors.shortTimespan.description', { 
          current: timeSpanDays, 
          recommended: recommendedTimeSpan 
        })),
        impact: 'medium',
        actionable: true
      });
    } else {
      factors.push({
        type: 'success',
        title: String(tAnalytics('confidence.factors.adequateTimespan.title')),
        description: String(tAnalytics('confidence.factors.adequateTimespan.description', { 
          days: timeSpanDays 
        })),
        impact: 'positive',
        actionable: false
      });
    }

    const patternStrength = getPatternStrength();
    if (patternStrength.level === 'weak') {
      factors.push({
        type: 'info',
        title: String(tAnalytics('confidence.factors.weakPattern.title')),
        description: String(tAnalytics('confidence.factors.weakPattern.description', { 
          rsquared: rSquared.toFixed(3),
          percentage: patternStrength.score 
        })),
        impact: 'medium',
        actionable: true
      });
    } else {
      factors.push({
        type: 'success',
        title: String(tAnalytics(`confidence.factors.${patternStrength.level}Pattern.title`)),
        description: String(tAnalytics(`confidence.factors.${patternStrength.level}Pattern.description`, { 
          rsquared: rSquared.toFixed(3),
          percentage: patternStrength.score 
        })),
        impact: 'positive',
        actionable: false
      });
    }

    return factors;
  };

  const getActionableRecommendations = () => {
    const recommendations = [];
    
    if (dataPoints < minDataPoints) {
      recommendations.push(String(tAnalytics('confidence.recommendations.collectMoreData', { 
        needed: minDataPoints - dataPoints 
      })));
    }
    
    if (timeSpanDays < recommendedTimeSpan) {
      recommendations.push(String(tAnalytics('confidence.recommendations.extendTimespan', { 
        additional: recommendedTimeSpan - timeSpanDays 
      })));
    }
    
    if (rSquared < 0.4) {
      recommendations.push(String(tAnalytics('confidence.recommendations.improveDataConsistency')));
      recommendations.push(String(tAnalytics('confidence.recommendations.documentContext')));
    }
    
    return recommendations;
  };

  const renderCalculationBreakdown = () => {
    const qualityScores = getDataQualityScore();
    const patternStrength = getPatternStrength();
    
    return (
      <div className="space-y-4">
        <div className="text-sm font-medium">{String(tAnalytics('confidence.calculation.title'))}</div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              <span className="text-sm">{String(tAnalytics('confidence.calculation.dataQuantity'))}</span>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium">{qualityScores.dataScore}%</div>
              <div className="text-xs text-muted-foreground">
                {dataPoints}/{minDataPoints} {String(tAnalytics('confidence.calculation.dataPoints'))}
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="text-sm">{String(tAnalytics('confidence.calculation.timeSpan'))}</span>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium">{qualityScores.timeScore}%</div>
              <div className="text-xs text-muted-foreground">
                {timeSpanDays}/{recommendedTimeSpan} {String(tAnalytics('confidence.calculation.days'))}
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm">{String(tAnalytics('confidence.calculation.patternStrength'))}</span>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium">{patternStrength.score}%</div>
              <div className="text-xs text-muted-foreground">
                R² = {rSquared.toFixed(3)}
              </div>
            </div>
          </div>
        </div>
        
        <div className="border-t pt-3">
          <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              <span className="text-sm font-medium">{String(tAnalytics('confidence.calculation.overall'))}</span>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold">{Math.round(confidence * 100)}%</div>
              <div className="text-xs text-muted-foreground">
                {String(tAnalytics(`confidence.${getConfidenceLevel()}`))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderEducationalContent = () => {
    return (
      <div className="space-y-4">
        <div className="text-sm font-medium">{String(tAnalytics('confidence.education.title'))}</div>
        
        <div className="space-y-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Info className="h-4 w-4" />
                {String(tAnalytics('confidence.education.whatIsConfidence.title'))}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 text-sm text-muted-foreground">
              {String(tAnalytics('confidence.education.whatIsConfidence.content'))}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="h-4 w-4" />
                {String(tAnalytics('confidence.education.whyItMatters.title'))}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 text-sm text-muted-foreground">
              {String(tAnalytics('confidence.education.whyItMatters.content'))}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                {String(tAnalytics('confidence.education.interpretation.title'))}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              <div className="text-xs">
                <Badge variant="outline" className="text-emerald-600 border-emerald-200 mr-2">
                  70-100%
                </Badge>
                <span className="text-muted-foreground">
                  {String(tAnalytics('confidence.education.interpretation.high'))}
                </span>
              </div>
              <div className="text-xs">
                <Badge variant="outline" className="text-amber-600 border-amber-200 mr-2">
                  40-69%
                </Badge>
                <span className="text-muted-foreground">
                  {String(tAnalytics('confidence.education.interpretation.medium'))}
                </span>
              </div>
              <div className="text-xs">
                <Badge variant="outline" className="text-orange-600 border-orange-200 mr-2">
                  0-39%
                </Badge>
                <span className="text-muted-foreground">
                  {String(tAnalytics('confidence.education.interpretation.low'))}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  const confidenceFactors = getConfidenceFactors();
  const recommendations = getActionableRecommendations();
  const qualityScores = getDataQualityScore();

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            {String(tAnalytics('confidence.detailed.title'))}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge 
              variant="outline" 
              className={
                getConfidenceLevel() === 'high' ? 'text-emerald-600 border-emerald-200' :
                getConfidenceLevel() === 'medium' ? 'text-amber-600 border-amber-200' :
                'text-orange-600 border-orange-200'
              }
            >
              {Math.round(confidence * 100)}% {String(tAnalytics(`confidence.${getConfidenceLevel()}`))}
            </Badge>
            <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
            </Collapsible>
          </div>
        </div>
      </CardHeader>
      
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleContent>
          <CardContent>
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">{String(tAnalytics('confidence.tabs.overview'))}</TabsTrigger>
                <TabsTrigger value="calculation">{String(tAnalytics('confidence.tabs.calculation'))}</TabsTrigger>
                <TabsTrigger value="factors">{String(tAnalytics('confidence.tabs.factors'))}</TabsTrigger>
                <TabsTrigger value="education">{String(tAnalytics('confidence.tabs.education'))}</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">{String(tAnalytics('confidence.overview.dataQuality'))}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Progress value={qualityScores.overallScore} className="mb-2" />
                      <div className="text-xs text-muted-foreground">
                        {qualityScores.overallScore}% {String(tAnalytics('confidence.overview.complete'))}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">{String(tAnalytics('confidence.overview.timespan'))}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-lg font-bold">{timeSpanDays}</div>
                      <div className="text-xs text-muted-foreground">
                        {String(tAnalytics('confidence.overview.daysOfData'))}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">{String(tAnalytics('confidence.overview.patterns'))}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-lg font-bold">{getPatternStrength().score}%</div>
                      <div className="text-xs text-muted-foreground">
                        {String(tAnalytics(`confidence.overview.${getPatternStrength().level}Pattern`))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                {recommendations.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">{String(tAnalytics('confidence.overview.recommendations'))}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {recommendations.map((rec, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm">
                            <Target className="h-4 w-4 mt-0.5 text-primary" />
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
              
              <TabsContent value="calculation">
                {renderCalculationBreakdown()}
              </TabsContent>
              
              <TabsContent value="factors" className="space-y-4">
                {confidenceFactors.map((factor, index) => (
                  <Card key={index}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        {factor.type === 'success' ? (
                          <CheckCircle className="h-4 w-4 text-emerald-600" />
                        ) : factor.type === 'warning' ? (
                          <AlertCircle className="h-4 w-4 text-amber-600" />
                        ) : (
                          <Info className="h-4 w-4 text-blue-600" />
                        )}
                        {factor.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-sm text-muted-foreground">{factor.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
              
              <TabsContent value="education">
                {renderEducationalContent()}
              </TabsContent>
            </Tabs>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};