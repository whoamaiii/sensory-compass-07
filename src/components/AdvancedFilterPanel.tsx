import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmotionEntry, SensoryEntry, TrackingEntry, EnvironmentalEntry } from '@/types/student';
import { format, startOfDay, addDays, subDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { 
  Filter, 
  Calendar as CalendarIcon,
  Brain,
  Eye,
  Thermometer,
  Clock,
  RotateCcw,
  Save,
  Trash2,
  Plus,
  Check
} from 'lucide-react';

export interface FilterCriteria {
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  emotions: {
    types: string[];
    intensityRange: [number, number];
    includeTriggers: string[];
    excludeTriggers: string[];
  };
  sensory: {
    types: string[];
    responses: string[];
    intensityRange: [number, number];
  };
  environmental: {
    locations: string[];
    activities: string[];
    conditions: {
      noiseLevel: [number, number];
      temperature: [number, number];
      lighting: string[];
    };
    weather: string[];
    timeOfDay: string[];
  };
  patterns: {
    anomaliesOnly: boolean;
    minConfidence: number;
    patternTypes: string[];
  };
  realtime: boolean;
}

interface AdvancedFilterPanelProps {
  emotions: EmotionEntry[];
  sensoryInputs: SensoryEntry[];
  trackingEntries: TrackingEntry[];
  onFilterChange: (criteria: FilterCriteria) => void;
  savedFilters?: Array<{ id: string; name: string; criteria: FilterCriteria }>;
  onSaveFilter?: (name: string, criteria: FilterCriteria) => void;
  onDeleteFilter?: (id: string) => void;
}

// Preset filter configurations
const FILTER_PRESETS: Array<{ name: string; description: string; criteria: Partial<FilterCriteria> }> = [
  {
    name: 'High Intensity Events',
    description: 'Focus on high-intensity emotions and sensory responses',
    criteria: {
      emotions: {
        types: [],
        intensityRange: [7, 10],
        includeTriggers: [],
        excludeTriggers: []
      },
      sensory: {
        types: [],
        responses: [],
        intensityRange: [7, 10]
      }
    }
  },
  {
    name: 'Challenging Environments',
    description: 'Filter for difficult environmental conditions',
    criteria: {
      environmental: {
        locations: [],
        activities: [],
        conditions: {
          noiseLevel: [7, 10],
          temperature: [25, 40],
          lighting: []
        },
        weather: ['stormy', 'rainy'],
        timeOfDay: []
      }
    }
  },
  {
    name: 'Positive Patterns',
    description: 'Show only positive emotions and seeking behaviors',
    criteria: {
      emotions: {
        types: ['happy', 'calm', 'excited', 'proud', 'focused'],
        intensityRange: [0, 10],
        includeTriggers: [],
        excludeTriggers: []
      },
      sensory: {
        types: [],
        responses: ['seeking'],
        intensityRange: [0, 10]
      }
    }
  },
  {
    name: 'Recent Activity',
    description: 'Last 24 hours of data',
    criteria: {
      dateRange: {
        start: subDays(new Date(), 1),
        end: new Date()
      }
    }
  }
];

export const AdvancedFilterPanel: React.FC<AdvancedFilterPanelProps> = ({
  emotions,
  sensoryInputs,
  trackingEntries,
  onFilterChange,
  savedFilters = [],
  onSaveFilter,
  onDeleteFilter
}) => {
  const [criteria, setCriteria] = useState<FilterCriteria>({
    dateRange: {
      start: null,
      end: null
    },
    emotions: {
      types: [],
      intensityRange: [0, 10],
      includeTriggers: [],
      excludeTriggers: []
    },
    sensory: {
      types: [],
      responses: [],
      intensityRange: [0, 10]
    },
    environmental: {
      locations: [],
      activities: [],
      conditions: {
        noiseLevel: [0, 10],
        temperature: [15, 30],
        lighting: []
      },
      weather: [],
      timeOfDay: []
    },
    patterns: {
      anomaliesOnly: false,
      minConfidence: 0,
      patternTypes: []
    },
    realtime: false
  });

  const [filterName, setFilterName] = useState('');
  const [activeFilters, setActiveFilters] = useState<number>(0);

  // Extract unique values from data
  const uniqueEmotions = [...new Set(emotions.map(e => e.emotion))];
  const uniqueTriggers = [...new Set(emotions.flatMap(e => e.triggers || []))];
  const uniqueSensoryTypes = [...new Set(sensoryInputs.map(s => s.sensoryType || s.type || '').filter(Boolean))];
  const uniqueSensoryResponses = [...new Set(sensoryInputs.map(s => s.response))];
  
  const uniqueLocations = [...new Set(
    trackingEntries.map(t => t.environmentalData?.location).filter(Boolean)
  )] as string[];
  
  const uniqueActivities = [...new Set(
    trackingEntries.map(t => t.environmentalData?.classroom?.activity).filter(Boolean)
  )] as string[];

  // Count active filters
  useEffect(() => {
    let count = 0;
    
    if (criteria.dateRange.start || criteria.dateRange.end) count++;
    if (criteria.emotions.types.length > 0) count++;
    if (criteria.emotions.intensityRange[0] > 0 || criteria.emotions.intensityRange[1] < 10) count++;
    if (criteria.emotions.includeTriggers.length > 0) count++;
    if (criteria.emotions.excludeTriggers.length > 0) count++;
    if (criteria.sensory.types.length > 0) count++;
    if (criteria.sensory.responses.length > 0) count++;
    if (criteria.sensory.intensityRange[0] > 0 || criteria.sensory.intensityRange[1] < 10) count++;
    if (criteria.environmental.locations.length > 0) count++;
    if (criteria.environmental.activities.length > 0) count++;
    if (criteria.environmental.weather.length > 0) count++;
    if (criteria.environmental.timeOfDay.length > 0) count++;
    if (criteria.patterns.anomaliesOnly) count++;
    if (criteria.patterns.minConfidence > 0) count++;
    if (criteria.patterns.patternTypes.length > 0) count++;
    
    setActiveFilters(count);
  }, [criteria]);

  // Apply preset filter
  const applyPreset = useCallback((preset: Partial<FilterCriteria>) => {
    setCriteria(prev => ({
      ...prev,
      ...preset,
      emotions: { ...prev.emotions, ...preset.emotions },
      sensory: { ...prev.sensory, ...preset.sensory },
      environmental: { 
        ...prev.environmental, 
        ...preset.environmental,
        conditions: {
          ...prev.environmental.conditions,
          ...preset.environmental?.conditions
        }
      },
      patterns: { ...prev.patterns, ...preset.patterns }
    }));
  }, []);

  // Update filter and notify parent
  const updateFilter = useCallback((updates: Partial<FilterCriteria>) => {
    const newCriteria = {
      ...criteria,
      ...updates,
      emotions: { ...criteria.emotions, ...updates.emotions },
      sensory: { ...criteria.sensory, ...updates.sensory },
      environmental: { 
        ...criteria.environmental, 
        ...updates.environmental,
        conditions: {
          ...criteria.environmental.conditions,
          ...updates.environmental?.conditions
        }
      },
      patterns: { ...criteria.patterns, ...updates.patterns }
    };
    setCriteria(newCriteria);
    onFilterChange(newCriteria);
  }, [criteria, onFilterChange]);

  // Reset all filters
  const resetFilters = useCallback(() => {
    const defaultCriteria: FilterCriteria = {
      dateRange: { start: null, end: null },
      emotions: { types: [], intensityRange: [0, 10], includeTriggers: [], excludeTriggers: [] },
      sensory: { types: [], responses: [], intensityRange: [0, 10] },
      environmental: {
        locations: [],
        activities: [],
        conditions: { noiseLevel: [0, 10], temperature: [15, 30], lighting: [] },
        weather: [],
        timeOfDay: []
      },
      patterns: { anomaliesOnly: false, minConfidence: 0, patternTypes: [] },
      realtime: false
    };
    setCriteria(defaultCriteria);
    onFilterChange(defaultCriteria);
  }, [onFilterChange]);

  // Save current filter
  const handleSaveFilter = useCallback(() => {
    if (filterName && onSaveFilter) {
      onSaveFilter(filterName, criteria);
      setFilterName('');
    }
  }, [filterName, criteria, onSaveFilter]);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Advanced Filters
            {activeFilters > 0 && (
              <Badge variant="default">{activeFilters} active</Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={resetFilters}
              disabled={activeFilters === 0}
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset
            </Button>
            {criteria.realtime && (
              <Badge variant="default" className="animate-pulse">
                Real-time
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="filters" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="filters">Filters</TabsTrigger>
            <TabsTrigger value="presets">Presets</TabsTrigger>
            <TabsTrigger value="saved">Saved ({savedFilters.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="filters" className="space-y-4">
            <Accordion type="multiple" className="w-full">
              {/* Date Range Filter */}
              <AccordionItem value="date">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    Date Range
                    {(criteria.dateRange.start || criteria.dateRange.end) && (
                      <Badge variant="secondary">Active</Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Start Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !criteria.dateRange.start && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {criteria.dateRange.start ? (
                              format(criteria.dateRange.start, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={criteria.dateRange.start || undefined}
                            onSelect={(date) => updateFilter({
                              dateRange: { ...criteria.dateRange, start: date || null }
                            })}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div>
                      <Label>End Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !criteria.dateRange.end && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {criteria.dateRange.end ? (
                              format(criteria.dateRange.end, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={criteria.dateRange.end || undefined}
                            onSelect={(date) => updateFilter({
                              dateRange: { ...criteria.dateRange, end: date || null }
                            })}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateFilter({
                        dateRange: { start: subDays(new Date(), 7), end: new Date() }
                      })}
                    >
                      Last 7 days
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateFilter({
                        dateRange: { start: subDays(new Date(), 30), end: new Date() }
                      })}
                    >
                      Last 30 days
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Emotion Filters */}
              <AccordionItem value="emotions">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4" />
                    Emotions
                    {(criteria.emotions.types.length > 0 || 
                      criteria.emotions.intensityRange[0] > 0 || 
                      criteria.emotions.intensityRange[1] < 10) && (
                      <Badge variant="secondary">Active</Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4">
                  <div>
                    <Label>Emotion Types</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {uniqueEmotions.map(emotion => (
                        <div key={emotion} className="flex items-center space-x-2">
                          <Checkbox
                            id={emotion}
                            checked={criteria.emotions.types.includes(emotion)}
                            onCheckedChange={(checked) => {
                              const types = checked
                                ? [...criteria.emotions.types, emotion]
                                : criteria.emotions.types.filter(t => t !== emotion);
                              updateFilter({
                                emotions: { ...criteria.emotions, types }
                              });
                            }}
                          />
                          <label
                            htmlFor={emotion}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {emotion}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>Intensity Range: {criteria.emotions.intensityRange[0]} - {criteria.emotions.intensityRange[1]}</Label>
                    <Slider
                      value={criteria.emotions.intensityRange}
                      onValueChange={(value) => updateFilter({
                        emotions: { ...criteria.emotions, intensityRange: value as [number, number] }
                      })}
                      min={0}
                      max={10}
                      step={1}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label>Include Triggers</Label>
                    <Select
                      value={criteria.emotions.includeTriggers.join(',')}
                      onValueChange={(value) => {
                        const triggers = value ? value.split(',') : [];
                        updateFilter({
                          emotions: { ...criteria.emotions, includeTriggers: triggers }
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select triggers to include" />
                      </SelectTrigger>
                      <SelectContent>
                        {uniqueTriggers.map(trigger => (
                          <SelectItem key={trigger} value={trigger}>
                            {trigger}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Sensory Filters */}
              <AccordionItem value="sensory">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Sensory
                    {(criteria.sensory.types.length > 0 || 
                      criteria.sensory.responses.length > 0) && (
                      <Badge variant="secondary">Active</Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4">
                  <div>
                    <Label>Sensory Types</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {uniqueSensoryTypes.map(type => (
                        <div key={type} className="flex items-center space-x-2">
                          <Checkbox
                            id={`sensory-${type}`}
                            checked={criteria.sensory.types.includes(type)}
                            onCheckedChange={(checked) => {
                              const types = checked
                                ? [...criteria.sensory.types, type]
                                : criteria.sensory.types.filter(t => t !== type);
                              updateFilter({
                                sensory: { ...criteria.sensory, types }
                              });
                            }}
                          />
                          <label
                            htmlFor={`sensory-${type}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {type}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>Responses</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {uniqueSensoryResponses.map(response => (
                        <div key={response} className="flex items-center space-x-2">
                          <Checkbox
                            id={`response-${response}`}
                            checked={criteria.sensory.responses.includes(response)}
                            onCheckedChange={(checked) => {
                              const responses = checked
                                ? [...criteria.sensory.responses, response]
                                : criteria.sensory.responses.filter(r => r !== response);
                              updateFilter({
                                sensory: { ...criteria.sensory, responses }
                              });
                            }}
                          />
                          <label
                            htmlFor={`response-${response}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {response}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>Intensity Range: {criteria.sensory.intensityRange[0]} - {criteria.sensory.intensityRange[1]}</Label>
                    <Slider
                      value={criteria.sensory.intensityRange}
                      onValueChange={(value) => updateFilter({
                        sensory: { ...criteria.sensory, intensityRange: value as [number, number] }
                      })}
                      min={0}
                      max={10}
                      step={1}
                      className="mt-2"
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Environmental Filters */}
              <AccordionItem value="environmental">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <Thermometer className="h-4 w-4" />
                    Environmental
                    {(criteria.environmental.locations.length > 0 || 
                      criteria.environmental.activities.length > 0) && (
                      <Badge variant="secondary">Active</Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4">
                  <div>
                    <Label>Locations</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {uniqueLocations.map(location => (
                        <div key={location} className="flex items-center space-x-2">
                          <Checkbox
                            id={`location-${location}`}
                            checked={criteria.environmental.locations.includes(location)}
                            onCheckedChange={(checked) => {
                              const locations = checked
                                ? [...criteria.environmental.locations, location]
                                : criteria.environmental.locations.filter(l => l !== location);
                              updateFilter({
                                environmental: { ...criteria.environmental, locations }
                              });
                            }}
                          />
                          <label
                            htmlFor={`location-${location}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {location}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>Weather Conditions</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {['sunny', 'cloudy', 'rainy', 'stormy', 'snowy'].map(weather => (
                        <div key={weather} className="flex items-center space-x-2">
                          <Checkbox
                            id={`weather-${weather}`}
                            checked={criteria.environmental.weather.includes(weather)}
                            onCheckedChange={(checked) => {
                              const weatherList = checked
                                ? [...criteria.environmental.weather, weather]
                                : criteria.environmental.weather.filter(w => w !== weather);
                              updateFilter({
                                environmental: { ...criteria.environmental, weather: weatherList }
                              });
                            }}
                          />
                          <label
                            htmlFor={`weather-${weather}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 capitalize"
                          >
                            {weather}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>Noise Level: {criteria.environmental.conditions.noiseLevel[0]} - {criteria.environmental.conditions.noiseLevel[1]}</Label>
                    <Slider
                      value={criteria.environmental.conditions.noiseLevel}
                      onValueChange={(value) => updateFilter({
                        environmental: {
                          ...criteria.environmental,
                          conditions: {
                            ...criteria.environmental.conditions,
                            noiseLevel: value as [number, number]
                          }
                        }
                      })}
                      min={0}
                      max={10}
                      step={1}
                      className="mt-2"
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Pattern Filters */}
              <AccordionItem value="patterns">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Patterns & Analysis
                    {(criteria.patterns.anomaliesOnly || 
                      criteria.patterns.minConfidence > 0) && (
                      <Badge variant="secondary">Active</Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="anomalies"
                      checked={criteria.patterns.anomaliesOnly}
                      onCheckedChange={(checked) => updateFilter({
                        patterns: { ...criteria.patterns, anomaliesOnly: checked }
                      })}
                    />
                    <Label htmlFor="anomalies">Show anomalies only</Label>
                  </div>

                  <div>
                    <Label>Minimum Confidence: {criteria.patterns.minConfidence}%</Label>
                    <Slider
                      value={[criteria.patterns.minConfidence]}
                      onValueChange={([value]) => updateFilter({
                        patterns: { ...criteria.patterns, minConfidence: value }
                      })}
                      min={0}
                      max={100}
                      step={5}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label>Pattern Types</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {['emotion', 'sensory', 'environmental', 'correlation'].map(type => (
                        <div key={type} className="flex items-center space-x-2">
                          <Checkbox
                            id={`pattern-${type}`}
                            checked={criteria.patterns.patternTypes.includes(type)}
                            onCheckedChange={(checked) => {
                              const types = checked
                                ? [...criteria.patterns.patternTypes, type]
                                : criteria.patterns.patternTypes.filter(t => t !== type);
                              updateFilter({
                                patterns: { ...criteria.patterns, patternTypes: types }
                              });
                            }}
                          />
                          <label
                            htmlFor={`pattern-${type}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 capitalize"
                          >
                            {type}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* Real-time toggle */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <Label htmlFor="realtime">Real-time Updates</Label>
              </div>
              <Switch
                id="realtime"
                checked={criteria.realtime}
                onCheckedChange={(checked) => updateFilter({ realtime: checked })}
              />
            </div>
          </TabsContent>

          <TabsContent value="presets" className="space-y-4">
            <div className="grid gap-4">
              {FILTER_PRESETS.map((preset, index) => (
                <Card key={index} className="cursor-pointer hover:bg-accent" onClick={() => applyPreset(preset.criteria)}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{preset.name}</h4>
                        <p className="text-sm text-muted-foreground">{preset.description}</p>
                      </div>
                      <Button size="sm" variant="ghost">
                        <Check className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="saved" className="space-y-4">
            {onSaveFilter && (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Filter name..."
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-md"
                />
                <Button onClick={handleSaveFilter} disabled={!filterName}>
                  <Save className="h-4 w-4 mr-1" />
                  Save Current
                </Button>
              </div>
            )}

            {savedFilters.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Filter className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No saved filters yet</p>
                <p className="text-sm">Save your current filter configuration for quick access</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {savedFilters.map((filter) => (
                  <Card key={filter.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{filter.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {Object.keys(filter.criteria).filter(k => 
                              JSON.stringify(filter.criteria[k as keyof FilterCriteria]) !== 
                              JSON.stringify(criteria[k as keyof FilterCriteria])
                            ).length} filters configured
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setCriteria(filter.criteria);
                              onFilterChange(filter.criteria);
                            }}
                          >
                            Apply
                          </Button>
                          {onDeleteFilter && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onDeleteFilter(filter.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

// Helper function to apply filters to data
export const applyFilters = <T extends { timestamp: Date }>(
  data: T[],
  criteria: FilterCriteria,
  getEmotionData?: (item: T) => EmotionEntry | null,
  getSensoryData?: (item: T) => SensoryEntry | null,
  getEnvironmentalData?: (item: T) => EnvironmentalEntry | null
): T[] => {
  return data.filter(item => {
    // Date range filter: normalize to half-open [start, end)
    if (criteria.dateRange.start || criteria.dateRange.end) {
      const start = criteria.dateRange.start ? startOfDay(criteria.dateRange.start) : new Date(0);
      // Use endExclusive as startOfDay(end) + 1 day for whole-day selection
      const endExclusive = criteria.dateRange.end ? addDays(startOfDay(criteria.dateRange.end), 1) : new Date(8640000000000000);
      const ts = item.timestamp;
      if (!(ts >= start && ts < endExclusive)) return false;
    }

    // Emotion filters
    if (getEmotionData) {
      const emotion = getEmotionData(item);
      if (emotion) {
        if (criteria.emotions.types.length > 0 && !criteria.emotions.types.includes(emotion.emotion)) {
          return false;
        }
        if (emotion.intensity < criteria.emotions.intensityRange[0] || 
            emotion.intensity > criteria.emotions.intensityRange[1]) {
          return false;
        }
        if (criteria.emotions.includeTriggers.length > 0 && 
            !emotion.triggers?.some(t => criteria.emotions.includeTriggers.includes(t))) {
          return false;
        }
        if (criteria.emotions.excludeTriggers.length > 0 && 
            emotion.triggers?.some(t => criteria.emotions.excludeTriggers.includes(t))) {
          return false;
        }
      }
    }

    // Sensory filters
    if (getSensoryData) {
      const sensory = getSensoryData(item);
      if (sensory) {
        const sensoryType = sensory.sensoryType || sensory.type || '';
        if (criteria.sensory.types.length > 0 && !criteria.sensory.types.includes(sensoryType)) {
          return false;
        }
        if (criteria.sensory.responses.length > 0 && !criteria.sensory.responses.includes(sensory.response)) {
          return false;
        }
        if (sensory.intensity && 
            (sensory.intensity < criteria.sensory.intensityRange[0] || 
             sensory.intensity > criteria.sensory.intensityRange[1])) {
          return false;
        }
      }
    }

    // Environmental filters
    if (getEnvironmentalData) {
      const env = getEnvironmentalData(item);
      if (env) {
        if (criteria.environmental.locations.length > 0 && 
            env.location && !criteria.environmental.locations.includes(env.location)) {
          return false;
        }
        if (criteria.environmental.activities.length > 0 && 
            env.classroom?.activity && !criteria.environmental.activities.includes(env.classroom.activity)) {
          return false;
        }
        if (criteria.environmental.weather.length > 0 && 
            env.weather?.condition && !criteria.environmental.weather.includes(env.weather.condition)) {
          return false;
        }
        if (env.roomConditions?.noiseLevel && 
            (env.roomConditions.noiseLevel < criteria.environmental.conditions.noiseLevel[0] || 
             env.roomConditions.noiseLevel > criteria.environmental.conditions.noiseLevel[1])) {
          return false;
        }
      }
    }

    return true;
  });
};