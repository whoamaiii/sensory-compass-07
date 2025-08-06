import React, { useState, useEffect } from 'react';
import {
  Settings,
  Save,
  Download,
  Upload,
  RotateCcw,
  Info,
  AlertTriangle,
  Shield,
  Zap,
  Brain,
  RefreshCw,
  Activity,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { analyticsConfig, AnalyticsConfiguration, PRESET_CONFIGS } from '@/lib/analyticsConfig';
import { mlModels, ModelMetadata, ModelType } from '@/lib/mlModels';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { logger } from '@/lib/logger';

interface AnalyticsSettingsProps {
  onConfigChange?: (config: AnalyticsConfiguration) => void;
  onClose?: () => void;
}

export const AnalyticsSettings: React.FC<AnalyticsSettingsProps> = ({
  onConfigChange,
  onClose
}) => {
  const [config, setConfig] = useState<AnalyticsConfiguration>(analyticsConfig.getConfig());
  const [selectedPreset, setSelectedPreset] = useState<string>('balanced');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [modelStatus, setModelStatus] = useState<Map<ModelType, ModelMetadata | null>>(new Map());
  const [isTraining, setIsTraining] = useState<ModelType | null>(null);
  const [mlEnabled, setMlEnabled] = useState(true);
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [isDeletingModel, setIsDeletingModel] = useState<ModelType | null>(null);

  useEffect(() => {
    // Subscribe to configuration changes
    const unsubscribe = analyticsConfig.subscribe((newConfig) => {
      setConfig(newConfig);
      if (onConfigChange) {
        onConfigChange(newConfig);
      }
    });

    // Load ML model status
    loadModelStatus();

    return unsubscribe;
  }, [onConfigChange]);

  const loadModelStatus = async () => {
    setIsLoadingModels(true);
    try {
      await mlModels.init();
      const status = await mlModels.getModelStatus();
      setModelStatus(status);
    } catch (error) {
      logger.error('Failed to load ML model status', { error });
      toast.error("Failed to load ML models: Could not retrieve model status. Some features may be unavailable.");
    } finally {
      setIsLoadingModels(false);
    }
  };

  const handleSliderChange = (path: string[], value: number[]) => {
    const newConfig = { ...config };
    let current: Record<string, unknown> = newConfig as unknown as Record<string, unknown>;
    
    for (let i = 0; i < path.length - 1; i++) {
      current = current[path[i]] as Record<string, unknown>;
    }
    
    current[path[path.length - 1]] = value[0];
    setConfig(newConfig);
    setHasUnsavedChanges(true);
  };

  const handleSensitivityChange = (value: string) => {
    const newConfig = { ...config };
    newConfig.alertSensitivity.level = value as 'low' | 'medium' | 'high';
    
    // Adjust multipliers based on sensitivity
    switch (value) {
      case 'low':
        newConfig.alertSensitivity.emotionIntensityMultiplier = 0.8;
        newConfig.alertSensitivity.frequencyMultiplier = 0.8;
        newConfig.alertSensitivity.anomalyMultiplier = 0.8;
        break;
      case 'high':
        newConfig.alertSensitivity.emotionIntensityMultiplier = 1.2;
        newConfig.alertSensitivity.frequencyMultiplier = 1.2;
        newConfig.alertSensitivity.anomalyMultiplier = 1.2;
        break;
      default: // medium
        newConfig.alertSensitivity.emotionIntensityMultiplier = 1.0;
        newConfig.alertSensitivity.frequencyMultiplier = 1.0;
        newConfig.alertSensitivity.anomalyMultiplier = 1.0;
    }
    
    setConfig(newConfig);
    setHasUnsavedChanges(true);
  };

  const handlePresetSelect = (preset: keyof typeof PRESET_CONFIGS) => {
    setSelectedPreset(preset);
    analyticsConfig.setPreset(preset);
    setHasUnsavedChanges(false);
    toast.success(`Applied ${PRESET_CONFIGS[preset].name} configuration`);
  };

  const handleSave = () => {
    analyticsConfig.updateConfig(config);
    setHasUnsavedChanges(false);
    toast.success("Analytics configuration has been updated");
  };

  const handleReset = () => {
    analyticsConfig.resetToDefaults();
    setSelectedPreset('balanced');
    setHasUnsavedChanges(false);
    toast.success("Settings have been reset to defaults");
  };

  const handleExport = () => {
    const configString = analyticsConfig.exportConfig();
    const blob = new Blob([configString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'analytics-config.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success("Configuration saved to analytics-config.json");
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        if (analyticsConfig.importConfig(content)) {
          setHasUnsavedChanges(false);
          toast.success("Successfully imported configuration");
        } else {
          toast.error("Invalid configuration file");
        }
      } catch (error) {
        toast.error("Failed to read configuration file");
      }
    };
    reader.readAsText(file);
  };

  const handleModelRetrain = async (modelType: ModelType) => {
    setIsTraining(modelType);
    
    toast(`Training ${modelType} model in background...`);

    // Simulate training (in real implementation, this would trigger actual training)
    setTimeout(async () => {
      setIsTraining(null);
      await loadModelStatus();
      
      toast.success(`${modelType} model has been updated`);
    }, 3000);
  };

  const handleDeleteModel = async (modelType: ModelType) => {
    setIsDeletingModel(modelType);
    try {
      await mlModels.deleteModel(modelType);
      await loadModelStatus();
      
      toast.success(`${modelType} model has been removed`);
    } catch (error) {
      toast.error("Failed to delete model");
    } finally {
      setIsDeletingModel(null);
    }
  };

  const formatModelType = (type: ModelType): string => {
    return type.split('-').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getModelIcon = (type: ModelType) => {
    switch (type) {
      case 'emotion-prediction':
        return <Brain className="h-4 w-4" />;
      case 'sensory-response':
        return <Activity className="h-4 w-4" />;
      case 'baseline-clustering':
        return <Shield className="h-4 w-4" />;
      default:
        return <Settings className="h-4 w-4" />;
    }
  };

  const renderTooltip = (content: string) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="h-4 w-4 ml-2 text-muted-foreground cursor-help" />
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs">{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Analytics Configuration
          </DialogTitle>
          <DialogDescription>
            Customize analytics parameters to adjust sensitivity and thresholds
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Preset Configurations */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Preset Configurations</CardTitle>
              <CardDescription>
                Choose a preset configuration or customize your own
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup value={selectedPreset} onValueChange={(value) => handlePresetSelect(value as keyof typeof PRESET_CONFIGS)}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Label 
                    htmlFor="conservative" 
                    className="flex flex-col space-y-2 cursor-pointer border rounded-lg p-4 hover:bg-muted/50"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="conservative" id="conservative" />
                      <Shield className="h-4 w-4 text-blue-500" />
                      <span className="font-medium">Conservative</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Higher thresholds, fewer alerts
                    </p>
                  </Label>

                  <Label 
                    htmlFor="balanced" 
                    className="flex flex-col space-y-2 cursor-pointer border rounded-lg p-4 hover:bg-muted/50"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="balanced" id="balanced" />
                      <Settings className="h-4 w-4 text-green-500" />
                      <span className="font-medium">Balanced</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Default settings, balanced sensitivity
                    </p>
                  </Label>

                  <Label 
                    htmlFor="sensitive" 
                    className="flex flex-col space-y-2 cursor-pointer border rounded-lg p-4 hover:bg-muted/50"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="sensitive" id="sensitive" />
                      <Zap className="h-4 w-4 text-yellow-500" />
                      <span className="font-medium">Sensitive</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Lower thresholds, more alerts
                    </p>
                  </Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Detailed Settings Tabs */}
          <Tabs defaultValue="thresholds" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="thresholds">Thresholds</TabsTrigger>
              <TabsTrigger value="sensitivity">Sensitivity</TabsTrigger>
              <TabsTrigger value="timewindows">Time Windows</TabsTrigger>
              <TabsTrigger value="mlmodels">ML Models</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>

            <TabsContent value="thresholds" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Pattern Analysis Thresholds</CardTitle>
                  <CardDescription>
                    Adjust minimum requirements and thresholds for pattern detection
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <Label htmlFor="minDataPoints">Minimum Data Points</Label>
                      {renderTooltip("Minimum number of data points required for analysis")}
                    </div>
                    <div className="flex items-center gap-4">
                      <Slider
                        id="minDataPoints"
                        value={[config.patternAnalysis.minDataPoints]}
                        onValueChange={(value) => handleSliderChange(['patternAnalysis', 'minDataPoints'], value)}
                        min={1}
                        max={10}
                        step={1}
                        className="flex-1"
                      />
                      <span className="w-12 text-right">{config.patternAnalysis.minDataPoints}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center">
                      <Label htmlFor="correlationThreshold">Correlation Threshold</Label>
                      {renderTooltip("Minimum correlation coefficient to consider significant")}
                    </div>
                    <div className="flex items-center gap-4">
                      <Slider
                        id="correlationThreshold"
                        value={[config.patternAnalysis.correlationThreshold]}
                        onValueChange={(value) => handleSliderChange(['patternAnalysis', 'correlationThreshold'], value)}
                        min={0.1}
                        max={0.9}
                        step={0.05}
                        className="flex-1"
                      />
                      <span className="w-12 text-right">{config.patternAnalysis.correlationThreshold.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center">
                      <Label htmlFor="concernFrequency">Concern Frequency Threshold</Label>
                      {renderTooltip("Percentage of sessions that must show concerning patterns")}
                    </div>
                    <div className="flex items-center gap-4">
                      <Slider
                        id="concernFrequency"
                        value={[config.patternAnalysis.concernFrequencyThreshold * 100]}
                        onValueChange={(value) => handleSliderChange(['patternAnalysis', 'concernFrequencyThreshold'], [value[0] / 100])}
                        min={10}
                        max={50}
                        step={5}
                        className="flex-1"
                      />
                      <span className="w-12 text-right">{(config.patternAnalysis.concernFrequencyThreshold * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Enhanced Analysis Thresholds</CardTitle>
                  <CardDescription>
                    Configure advanced pattern detection and anomaly thresholds
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <Label htmlFor="anomalyThreshold">Anomaly Detection Sensitivity</Label>
                      {renderTooltip("Number of standard deviations to trigger anomaly alert")}
                    </div>
                    <div className="flex items-center gap-4">
                      <Slider
                        id="anomalyThreshold"
                        value={[config.enhancedAnalysis.anomalyThreshold]}
                        onValueChange={(value) => handleSliderChange(['enhancedAnalysis', 'anomalyThreshold'], value)}
                        min={1}
                        max={3}
                        step={0.25}
                        className="flex-1"
                      />
                      <span className="w-12 text-right">{config.enhancedAnalysis.anomalyThreshold.toFixed(2)}σ</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center">
                      <Label htmlFor="minSampleSize">Minimum Sample Size</Label>
                      {renderTooltip("Minimum data points for statistical analysis")}
                    </div>
                    <div className="flex items-center gap-4">
                      <Slider
                        id="minSampleSize"
                        value={[config.enhancedAnalysis.minSampleSize]}
                        onValueChange={(value) => handleSliderChange(['enhancedAnalysis', 'minSampleSize'], value)}
                        min={3}
                        max={15}
                        step={1}
                        className="flex-1"
                      />
                      <span className="w-12 text-right">{config.enhancedAnalysis.minSampleSize}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sensitivity" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Alert Sensitivity</CardTitle>
                  <CardDescription>
                    Control how sensitive the system is to potential issues
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <RadioGroup 
                    value={config.alertSensitivity.level} 
                    onValueChange={handleSensitivityChange}
                  >
                    <div className="space-y-4">
                      <Label className="flex items-start space-x-3 cursor-pointer">
                        <RadioGroupItem value="low" className="mt-1" />
                        <div>
                          <p className="font-medium">Low Sensitivity</p>
                          <p className="text-sm text-muted-foreground">
                            Only alert for significant patterns with high confidence
                          </p>
                        </div>
                      </Label>
                      
                      <Label className="flex items-start space-x-3 cursor-pointer">
                        <RadioGroupItem value="medium" className="mt-1" />
                        <div>
                          <p className="font-medium">Medium Sensitivity</p>
                          <p className="text-sm text-muted-foreground">
                            Balanced approach to pattern detection and alerts
                          </p>
                        </div>
                      </Label>
                      
                      <Label className="flex items-start space-x-3 cursor-pointer">
                        <RadioGroupItem value="high" className="mt-1" />
                        <div>
                          <p className="font-medium">High Sensitivity</p>
                          <p className="text-sm text-muted-foreground">
                            Alert for subtle patterns and potential concerns early
                          </p>
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>

                  <div className="pt-4 space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Current Multipliers:</p>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>Emotion: {config.alertSensitivity.emotionIntensityMultiplier}x</div>
                      <div>Frequency: {config.alertSensitivity.frequencyMultiplier}x</div>
                      <div>Anomaly: {config.alertSensitivity.anomalyMultiplier}x</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="timewindows" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Analysis Time Windows</CardTitle>
                  <CardDescription>
                    Configure the time periods used for different analyses
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <Label htmlFor="defaultAnalysis">Default Analysis Period</Label>
                      {renderTooltip("Standard time window for pattern analysis")}
                    </div>
                    <div className="flex items-center gap-4">
                      <Slider
                        id="defaultAnalysis"
                        value={[config.timeWindows.defaultAnalysisDays]}
                        onValueChange={(value) => handleSliderChange(['timeWindows', 'defaultAnalysisDays'], value)}
                        min={7}
                        max={90}
                        step={7}
                        className="flex-1"
                      />
                      <span className="w-16 text-right">{config.timeWindows.defaultAnalysisDays} days</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center">
                      <Label htmlFor="recentData">Recent Data Window</Label>
                      {renderTooltip("Time window for recent activity alerts")}
                    </div>
                    <div className="flex items-center gap-4">
                      <Slider
                        id="recentData"
                        value={[config.timeWindows.recentDataDays]}
                        onValueChange={(value) => handleSliderChange(['timeWindows', 'recentDataDays'], value)}
                        min={3}
                        max={14}
                        step={1}
                        className="flex-1"
                      />
                      <span className="w-16 text-right">{config.timeWindows.recentDataDays} days</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center">
                      <Label htmlFor="longTerm">Long-term Analysis Window</Label>
                      {renderTooltip("Extended time window for trend analysis")}
                    </div>
                    <div className="flex items-center gap-4">
                      <Slider
                        id="longTerm"
                        value={[config.timeWindows.longTermDays]}
                        onValueChange={(value) => handleSliderChange(['timeWindows', 'longTermDays'], value)}
                        min={30}
                        max={180}
                        step={30}
                        className="flex-1"
                      />
                      <span className="w-16 text-right">{config.timeWindows.longTermDays} days</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="mlmodels" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Brain className="h-4 w-4" />
                      Machine Learning Models
                    </span>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="ml-enabled" className="text-sm font-normal">Enable ML</Label>
                      <Switch
                        id="ml-enabled"
                        checked={mlEnabled}
                        onCheckedChange={setMlEnabled}
                      />
                    </div>
                  </CardTitle>
                  <CardDescription>
                    Manage AI-powered prediction models for enhanced analytics
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Loading State */}
                  {isLoadingModels ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      <span className="ml-2 text-muted-foreground">Loading ML models...</span>
                    </div>
                  ) : (
                    <>
                      {/* Model Status List */}
                      {(['emotion-prediction', 'sensory-response', 'baseline-clustering'] as ModelType[]).map((modelType) => {
                    const model = modelStatus.get(modelType);
                    const isCurrentlyTraining = isTraining === modelType;
                    
                    return (
                      <div key={modelType} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getModelIcon(modelType)}
                            <h4 className="font-medium">{formatModelType(modelType)}</h4>
                          </div>
                          <Badge variant={model ? "default" : "outline"}>
                            {model ? 'Trained' : 'Not Trained'}
                          </Badge>
                        </div>
                        
                        {model ? (
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Version</p>
                                <p className="font-medium">{model.version}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Last Trained</p>
                                <p className="font-medium">
                                  {new Date(model.lastTrainedAt).toLocaleDateString()}
                                </p>
                              </div>
                              {model.accuracy && (
                                <div>
                                  <p className="text-muted-foreground">Accuracy</p>
                                  <p className="font-medium">{(model.accuracy * 100).toFixed(1)}%</p>
                                </div>
                              )}
                              <div>
                                <p className="text-muted-foreground">Data Points</p>
                                <p className="font-medium">{model.dataPoints}</p>
                              </div>
                            </div>
                            
                            {model.accuracy && (
                              <div className="space-y-1">
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Model Performance</span>
                                  <span>{(model.accuracy * 100).toFixed(1)}%</span>
                                </div>
                                <Progress value={model.accuracy * 100} className="h-2" />
                              </div>
                            )}
                            
                            <div className="flex gap-2 pt-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleModelRetrain(modelType)}
                                disabled={isCurrentlyTraining || !mlEnabled}
                              >
                                {isCurrentlyTraining ? (
                                  <>
                                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                    Training...
                                  </>
                                ) : (
                                  <>
                                    <RefreshCw className="h-3 w-3 mr-1" />
                                    Retrain
                                  </>
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteModel(modelType)}
                                disabled={isCurrentlyTraining || isDeletingModel === modelType}
                              >
                                {isDeletingModel === modelType ? (
                                  <>
                                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                    Deleting...
                                  </>
                                ) : (
                                  'Delete'
                                )}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-4">
                            <p className="text-sm text-muted-foreground mb-3">
                              No model trained yet. Model will be trained automatically when sufficient data is available.
                            </p>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleModelRetrain(modelType)}
                              disabled={isCurrentlyTraining || !mlEnabled}
                            >
                              {isCurrentlyTraining ? (
                                <>
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                  Training...
                                </>
                              ) : (
                                <>
                                  <Brain className="h-3 w-3 mr-1" />
                                  Train Model
                                </>
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  {/* ML Settings Info */}
                  <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                    <h5 className="font-medium flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      About Machine Learning
                    </h5>
                    <p className="text-sm text-muted-foreground">
                      ML models enhance predictions by learning from historical patterns. They require:
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                      <li>• Emotion prediction: 7+ days of data</li>
                      <li>• Sensory response: 10+ tracking sessions</li>
                      <li>• Baseline clustering: 10+ tracking entries</li>
                    </ul>
                    <p className="text-sm text-muted-foreground">
                      Models are trained locally in your browser and improve over time as more data is collected.
                    </p>
                  </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Cache Settings</CardTitle>
                  <CardDescription>
                    Configure performance optimization settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <Label htmlFor="cacheTTL">Cache Duration</Label>
                      {renderTooltip("How long to keep cached analytics results")}
                    </div>
                    <div className="flex items-center gap-4">
                      <Slider
                        id="cacheTTL"
                        value={[config.cache.ttl / 60000]}
                        onValueChange={(value) => handleSliderChange(['cache', 'ttl'], [value[0] * 60000])}
                        min={1}
                        max={30}
                        step={1}
                        className="flex-1"
                      />
                      <span className="w-16 text-right">{config.cache.ttl / 60000} min</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Label>Invalidate cache on config change</Label>
                      {renderTooltip("Clear cached results when settings change")}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {config.cache.invalidateOnConfigChange ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Import/Export Configuration</CardTitle>
                  <CardDescription>
                    Save and share your configuration settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex gap-4">
                  <Button 
                    variant="outline" 
                    onClick={handleExport}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Export Config
                  </Button>
                  
                  <Label htmlFor="import-config" className="cursor-pointer">
                    <Button 
                      variant="outline" 
                      asChild
                      className="flex items-center gap-2"
                    >
                      <span>
                        <Upload className="h-4 w-4" />
                        Import Config
                      </span>
                    </Button>
                    <input
                      id="import-config"
                      type="file"
                      accept=".json"
                      onChange={handleImport}
                      className="hidden"
                    />
                  </Label>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handleReset}
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset to Defaults
            </Button>
            
            <div className="flex gap-2">
              {hasUnsavedChanges && (
                <p className="text-sm text-yellow-600 flex items-center gap-1 mr-4">
                  <AlertTriangle className="h-4 w-4" />
                  Unsaved changes
                </p>
              )}
              
              <Button 
                variant="outline" 
                onClick={onClose}
              >
                Cancel
              </Button>
              
              <Button 
                onClick={handleSave}
                disabled={!hasUnsavedChanges}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

