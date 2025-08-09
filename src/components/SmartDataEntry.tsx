import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmotionEntry, SensoryEntry, Student } from '@/types/student';
import { 
  Brain, 
  Eye, 
  Plus, 
  Sparkles, 
  Clock, 
  TrendingUp,
  Lightbulb,
  Target,
  Zap
} from 'lucide-react';
import { format } from 'date-fns';

interface SmartDataEntryProps {
  student: Student;
  recentEmotions: EmotionEntry[];
  recentSensoryInputs: SensoryEntry[];
  onEmotionAdd: (emotion: Omit<EmotionEntry, 'id' | 'timestamp'>) => void;
  onSensoryAdd: (sensory: Omit<SensoryEntry, 'id' | 'timestamp'>) => void;
}

const EMOTION_CATEGORIES = {
  positive: ['happy', 'excited', 'calm', 'focused', 'proud', 'content', 'confident'],
  challenging: ['anxious', 'frustrated', 'overwhelmed', 'sad', 'angry', 'confused', 'tired'],
  neutral: ['neutral', 'curious', 'thoughtful', 'alert']
};

const SENSORY_TYPES = {
  visual: ['Visual/Sight', 'bright lights', 'colors', 'movement', 'visual stimulation'],
  auditory: ['Auditory/Sound', 'loud noises', 'music', 'silence', 'background noise'],
  tactile: ['Tactile/Touch', 'textures', 'temperature', 'pressure', 'fidgeting'],
  proprioceptive: ['Proprioceptive/Body awareness', 'movement', 'heavy work', 'positioning'],
  vestibular: ['Vestibular/Balance', 'spinning', 'swinging', 'tilting', 'movement'],
  gustatory: ['Gustatory/Taste', 'food textures', 'flavors', 'oral stimulation'],
  olfactory: ['Olfactory/Smell', 'strong odors', 'perfumes', 'cleaning products']
};

const RESPONSE_TYPES = ['seeking', 'avoiding', 'neutral', 'overwhelming', 'calming', 'alerting'];

export const SmartDataEntry: React.FC<SmartDataEntryProps> = ({
  student,
  recentEmotions,
  recentSensoryInputs,
  onEmotionAdd,
  onSensoryAdd
}) => {
  const [activeTab, setActiveTab] = useState<'emotion' | 'sensory'>('emotion');
  
  // Emotion form state
  const [selectedEmotion, setSelectedEmotion] = useState('');
  const [emotionIntensity, setEmotionIntensity] = useState([3]);
  const [emotionContext, setEmotionContext] = useState('');
  const [emotionTrigger, setEmotionTrigger] = useState('');
  
  // Sensory form state
  const [selectedSensoryType, setSelectedSensoryType] = useState('');
  const [selectedSensoryInput, setSelectedSensoryInput] = useState('');
  const [sensoryResponse, setSensoryResponse] = useState('');
  const [sensoryContext, setSensoryContext] = useState('');

  // Smart suggestions based on recent patterns
  const smartSuggestions = useMemo(() => {
    const suggestions = {
      emotions: [] as string[],
      sensoryInputs: [] as string[],
      contexts: [] as string[]
    };

    // Analyze recent emotion patterns
    const recentEmotionCounts = recentEmotions.reduce((acc, emotion) => {
      acc[emotion.emotion] = (acc[emotion.emotion] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Suggest commonly used emotions
    const topEmotions = Object.entries(recentEmotionCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([emotion]) => emotion);
    
    suggestions.emotions = topEmotions;

    // Analyze recent sensory patterns
    const recentSensoryTypes = recentSensoryInputs.reduce((acc, sensory) => {
      acc[sensory.type] = (acc[sensory.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topSensoryTypes = Object.entries(recentSensoryTypes)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([type]) => type);
    
    suggestions.sensoryInputs = topSensoryTypes;

    // Extract common contexts
    const allContexts = [
      ...recentEmotions.map(e => e.context).filter(Boolean),
      ...recentSensoryInputs.map(s => s.context).filter(Boolean)
    ];
    
    const contextCounts = allContexts.reduce((acc, context) => {
      acc[context] = (acc[context] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    suggestions.contexts = Object.entries(contextCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([context]) => context);

    return suggestions;
  }, [recentEmotions, recentSensoryInputs]);

  // Quick entry templates based on patterns
  const quickTemplates = useMemo(() => {
    const templates = [];
    
    // Time-based suggestions
    const currentHour = new Date().getHours();
    if (currentHour < 12) {
      templates.push({
        type: 'emotion',
        label: 'Morning Check-in',
        data: { emotion: 'alert', intensity: 3, context: 'Morning transition' }
      });
    } else if (currentHour > 15) {
      templates.push({
        type: 'emotion',
        label: 'Afternoon Energy',
        data: { emotion: 'tired', intensity: 2, context: 'End of day' }
      });
    }

    // Pattern-based suggestions
    if (recentEmotions.some(e => e.emotion === 'anxious' && e.intensity >= 4)) {
      templates.push({
        type: 'sensory',
        label: 'Calming Activity',
        data: { type: 'tactile', input: 'fidget tool', response: 'calming' }
      });
    }

    return templates;
  }, [recentEmotions]);

  const handleEmotionSubmit = useCallback(() => {
    if (!selectedEmotion) return;
    
    onEmotionAdd({
      emotion: selectedEmotion,
      intensity: emotionIntensity[0],
      context: emotionContext,
      trigger: emotionTrigger
    });

    // Reset form
    setSelectedEmotion('');
    setEmotionIntensity([3]);
    setEmotionContext('');
    setEmotionTrigger('');
  }, [selectedEmotion, emotionIntensity, emotionContext, emotionTrigger, onEmotionAdd]);

  const handleSensorySubmit = useCallback(() => {
    if (!selectedSensoryType || !selectedSensoryInput || !sensoryResponse) return;
    
    onSensoryAdd({
      type: selectedSensoryType,
      input: selectedSensoryInput,
      response: sensoryResponse,
      context: sensoryContext
    });

    // Reset form
    setSelectedSensoryType('');
    setSelectedSensoryInput('');
    setSensoryResponse('');
    setSensoryContext('');
  }, [selectedSensoryType, selectedSensoryInput, sensoryResponse, sensoryContext, onSensoryAdd]);

  interface QuickTemplate {
    type: 'emotion' | 'sensory';
    label: string;
    data: {
      emotion?: string;
      intensity?: number;
      context?: string;
      type?: string;
      input?: string;
      response?: string;
    };
  }

  const applyQuickTemplate = useCallback((template: QuickTemplate) => {
    if (template.type === 'emotion') {
      setActiveTab('emotion');
      setSelectedEmotion(template.data.emotion);
      setEmotionIntensity([template.data.intensity]);
      setEmotionContext(template.data.context);
    } else if (template.type === 'sensory') {
      setActiveTab('sensory');
      setSelectedSensoryType(template.data.type);
      setSelectedSensoryInput(template.data.input);
      setSensoryResponse(template.data.response);
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* Quick Templates */}
      {quickTemplates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Smart Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {quickTemplates.map((template, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => applyQuickTemplate(template)}
                  className="flex items-center gap-2"
                >
                  {template.type === 'emotion' ? <Brain className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  {template.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Entry Form */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Smart Data Entry for {student.name}</CardTitle>
            <div className="flex gap-2">
              <Button
                variant={activeTab === 'emotion' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('emotion')}
                className="flex items-center gap-2"
              >
                <Brain className="h-4 w-4" />
                Emotion
              </Button>
              <Button
                variant={activeTab === 'sensory' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('sensory')}
                className="flex items-center gap-2"
              >
                <Eye className="h-4 w-4" />
                Sensory
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {activeTab === 'emotion' ? (
            // Emotion Entry Form
            <div className="space-y-4">
              {/* Smart emotion suggestions */}
              {smartSuggestions.emotions.length > 0 && (
                <div>
                  <Label className="text-sm font-medium mb-2 flex items-center gap-2">
                    <TrendingUp className="h-3 w-3" />
                    Recently Used Emotions
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {smartSuggestions.emotions.map((emotion) => (
                      <Badge
                        key={emotion}
                        variant={selectedEmotion === emotion ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => setSelectedEmotion(emotion)}
                      >
                        {emotion}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Emotion selection by category */}
              <div className="space-y-3">
                <Label>Select Emotion</Label>
                {Object.entries(EMOTION_CATEGORIES).map(([category, emotions]) => (
                  <div key={category}>
                    <Label className="text-xs font-medium text-muted-foreground mb-1 block capitalize">
                      {category} Emotions
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {emotions.map((emotion) => (
                        <Badge
                          key={emotion}
                          variant={selectedEmotion === emotion ? 'default' : 'outline'}
                          className="cursor-pointer"
                          onClick={() => setSelectedEmotion(emotion)}
                        >
                          {emotion}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Intensity slider */}
              <div className="space-y-2">
                <Label>Intensity: {emotionIntensity[0]}/5</Label>
                <Slider
                  value={emotionIntensity}
                  onValueChange={setEmotionIntensity}
                  max={5}
                  min={1}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Very Low</span>
                  <span>Low</span>
                  <span>Moderate</span>
                  <span>High</span>
                  <span>Very High</span>
                </div>
              </div>

              {/* Context suggestions */}
              {smartSuggestions.contexts.length > 0 && (
                <div>
                  <Label className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Lightbulb className="h-3 w-3" />
                    Common Contexts
                  </Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {smartSuggestions.contexts.map((context) => (
                      <Badge
                        key={context}
                        variant="outline"
                        className="cursor-pointer"
                        onClick={() => setEmotionContext(context)}
                      >
                        {context}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="emotion-context">Context/Situation</Label>
                  <Input
                    id="emotion-context"
                    value={emotionContext}
                    onChange={(e) => setEmotionContext(e.target.value)}
                    placeholder="What was happening?"
                  />
                </div>
                <div>
                  <Label htmlFor="emotion-trigger">Trigger (if known)</Label>
                  <Input
                    id="emotion-trigger"
                    value={emotionTrigger}
                    onChange={(e) => setEmotionTrigger(e.target.value)}
                    placeholder="What caused this emotion?"
                  />
                </div>
              </div>

              <Button 
                onClick={handleEmotionSubmit}
                disabled={!selectedEmotion}
                className="w-full flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Emotion Entry
              </Button>
            </div>
          ) : (
            // Sensory Entry Form
            <div className="space-y-4">
              {/* Smart sensory suggestions */}
              {smartSuggestions.sensoryInputs.length > 0 && (
                <div>
                  <Label className="text-sm font-medium mb-2 flex items-center gap-2">
                    <TrendingUp className="h-3 w-3" />
                    Recently Used Sensory Types
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {smartSuggestions.sensoryInputs.map((type) => (
                      <Badge
                        key={type}
                        variant={selectedSensoryType === type ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => setSelectedSensoryType(type)}
                      >
                        {type}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Sensory type selection */}
              <div>
                <Label>Sensory Type</Label>
                <Select value={selectedSensoryType} onValueChange={setSelectedSensoryType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select sensory type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SENSORY_TYPES).map(([key, [name]]) => (
                      <SelectItem key={key} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Sensory input examples based on type */}
              {selectedSensoryType && (
                <div>
                  <Label className="text-sm font-medium mb-2">Common {selectedSensoryType} Inputs</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {SENSORY_TYPES[selectedSensoryType as keyof typeof SENSORY_TYPES]?.slice(1).map((input) => (
                      <Badge
                        key={input}
                        variant={selectedSensoryInput === input ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => setSelectedSensoryInput(input)}
                      >
                        {input}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="sensory-input">Specific Input</Label>
                <Input
                  id="sensory-input"
                  value={selectedSensoryInput}
                  onChange={(e) => setSelectedSensoryInput(e.target.value)}
                  placeholder="Describe the sensory input"
                />
              </div>

              {/* Response type */}
              <div>
                <Label>Response Type</Label>
                <div className="flex flex-wrap gap-2">
                  {RESPONSE_TYPES.map((response) => (
                    <Badge
                      key={response}
                      variant={sensoryResponse === response ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => setSensoryResponse(response)}
                    >
                      {response}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="sensory-context">Context/Situation</Label>
                <Textarea
                  id="sensory-context"
                  value={sensoryContext}
                  onChange={(e) => setSensoryContext(e.target.value)}
                  placeholder="Additional context or observations"
                  rows={2}
                />
              </div>

              <Button 
                onClick={handleSensorySubmit}
                disabled={!selectedSensoryType || !selectedSensoryInput || !sensoryResponse}
                className="w-full flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Sensory Entry
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Entry History Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Entries
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {recentEmotions.slice(0, 3).map((emotion, index) => (
              <div key={`emotion-${index}`} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-purple-500" />
                  <span className="font-medium">{emotion.emotion}</span>
                  <Badge variant="outline">Intensity {emotion.intensity}</Badge>
                </div>
                <span className="text-xs text-muted-foreground">
                  {format(emotion.timestamp, 'HH:mm')}
                </span>
              </div>
            ))}
            {recentSensoryInputs.slice(0, 3).map((sensory, index) => (
              <div key={`sensory-${index}`} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-cyan-500" />
                  <span className="font-medium">{sensory.input}</span>
                  <Badge variant="outline">{sensory.response}</Badge>
                </div>
                <span className="text-xs text-muted-foreground">
                  {format(sensory.timestamp, 'HH:mm')}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};