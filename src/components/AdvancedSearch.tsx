import React, { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Search, Filter, X, ChevronDown, Calendar } from "lucide-react";
import { Student, TrackingEntry, EmotionEntry, SensoryEntry, Goal } from "@/types/student";
import { format, isWithinInterval } from "date-fns";
import { useTranslation } from "@/hooks/useTranslation";

interface SearchFilters {
  query: string;
  emotions: string[];
  sensoryTypes: string[];
  dateRange: { from: Date | undefined; to: Date | undefined } | undefined;
  goalStatus: string[];
  intensityRange: { min: number; max: number };
}

interface AdvancedSearchProps {
  students: Student[];
  trackingEntries: TrackingEntry[];
  emotions: EmotionEntry[];
  sensoryInputs: SensoryEntry[];
  goals: Goal[];
  onResultsChange: (results: {
    students: Student[];
    entries: TrackingEntry[];
    emotions: EmotionEntry[];
    sensoryInputs: SensoryEntry[];
    goals: Goal[];
  }) => void;
}

const emotionTypes = ["happy", "sad", "angry", "anxious", "calm", "frustrated", "excited", "confused"];
const sensoryTypes = ["visual", "auditory", "tactile", "vestibular", "proprioceptive"];
const goalStatuses = ["active", "achieved", "paused", "discontinued"];

export const AdvancedSearch: React.FC<AdvancedSearchProps> = ({
  students,
  trackingEntries,
  emotions,
  sensoryInputs,
  goals,
  onResultsChange
}) => {
  const { tAnalytics, tCommon } = useTranslation();
  const [filters, setFilters] = useState<SearchFilters>({
    query: "",
    emotions: [],
    sensoryTypes: [],
    dateRange: undefined,
    goalStatus: [],
    intensityRange: { min: 1, max: 5 }
  });
  
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);

  const filteredResults = useMemo(() => {
    let filteredStudents = students;
    let filteredEntries = trackingEntries;
    let filteredEmotions = emotions;
    let filteredSensoryInputs = sensoryInputs;
    let filteredGoals = goals;

    // Text search - optimized to build Set during filtering
    if (filters.query.trim()) {
      const query = filters.query.toLowerCase();
      const studentIds = new Set<string>();
      
      // Filter students and collect IDs in a single pass
      filteredStudents = filteredStudents.filter(student => {
        const matches = student.name.toLowerCase().includes(query) ||
                        student.notes?.toLowerCase().includes(query);
        if (matches) {
          studentIds.add(student.id);
        }
        return matches;
      });
      
      // Use pre-built Set for filtering related data
      filteredEntries = filteredEntries.filter(entry => studentIds.has(entry.studentId));
      filteredEmotions = filteredEmotions.filter(emotion => studentIds.has(emotion.studentId));
      filteredSensoryInputs = filteredSensoryInputs.filter(sensory => studentIds.has(sensory.studentId));
      filteredGoals = filteredGoals.filter(goal => studentIds.has(goal.studentId));
    }

    // Date range filter
    if (filters.dateRange?.from && filters.dateRange?.to) {
      const dateInterval = { start: filters.dateRange.from, end: filters.dateRange.to };
      filteredEntries = filteredEntries.filter(entry =>
        isWithinInterval(entry.timestamp, dateInterval)
      );
      filteredEmotions = filteredEmotions.filter(emotion =>
        isWithinInterval(emotion.timestamp, dateInterval)
      );
      filteredSensoryInputs = filteredSensoryInputs.filter(sensory =>
        isWithinInterval(sensory.timestamp, dateInterval)
      );
    }

    // Emotion type filter - optimized to build Set during filtering
    if (filters.emotions.length > 0) {
      const emotionStudentIds = new Set<string>();
      
      // Filter emotions and collect student IDs in a single pass
      filteredEmotions = filteredEmotions.filter(emotion => {
        const matches = filters.emotions.includes(emotion.emotion);
        if (matches && emotion.studentId) {
          emotionStudentIds.add(emotion.studentId);
        }
        return matches;
      });
      
      filteredStudents = filteredStudents.filter(student => emotionStudentIds.has(student.id));
    }

    // Sensory type filter - optimized to build Set during filtering
    if (filters.sensoryTypes.length > 0) {
      const sensoryStudentIds = new Set<string>();
      
      // Filter sensory inputs and collect student IDs in a single pass
      filteredSensoryInputs = filteredSensoryInputs.filter(sensory => {
        const matches = filters.sensoryTypes.includes(sensory.sensoryType);
        if (matches && sensory.studentId) {
          sensoryStudentIds.add(sensory.studentId);
        }
        return matches;
      });
      
      if (filters.emotions.length === 0) {
        filteredStudents = filteredStudents.filter(student => sensoryStudentIds.has(student.id));
      }
    }

    // Intensity range filter
    filteredEmotions = filteredEmotions.filter(emotion =>
      emotion.intensity >= filters.intensityRange.min &&
      emotion.intensity <= filters.intensityRange.max
    );

    // Goal status filter - optimized to build Set during filtering
    if (filters.goalStatus.length > 0) {
      const goalStudentIds = new Set<string>();
      
      // Filter goals and collect student IDs in a single pass
      filteredGoals = filteredGoals.filter(goal => {
        const matches = filters.goalStatus.includes(goal.status);
        if (matches && goal.studentId) {
          goalStudentIds.add(goal.studentId);
        }
        return matches;
      });
      
      if (filters.emotions.length === 0 && filters.sensoryTypes.length === 0) {
        filteredStudents = filteredStudents.filter(student => goalStudentIds.has(student.id));
      }
    }

    return {
      students: filteredStudents,
      entries: filteredEntries,
      emotions: filteredEmotions,
      sensoryInputs: filteredSensoryInputs,
      goals: filteredGoals
    };
  }, [students, trackingEntries, emotions, sensoryInputs, goals, filters]);

  // Update active filters count
  React.useEffect(() => {
    let count = 0;
    if (filters.query.trim()) count++;
    if (filters.emotions.length > 0) count++;
    if (filters.sensoryTypes.length > 0) count++;
    if (filters.dateRange?.from && filters.dateRange?.to) count++;
    if (filters.goalStatus.length > 0) count++;
    if (filters.intensityRange.min > 1 || filters.intensityRange.max < 5) count++;
    setActiveFiltersCount(count);
  }, [filters]);

  // Notify parent of results change
  React.useEffect(() => {
    onResultsChange(filteredResults);
  }, [filteredResults, onResultsChange]);

  const clearAllFilters = () => {
    setFilters({
      query: "",
      emotions: [],
      sensoryTypes: [],
      dateRange: undefined,
      goalStatus: [],
      intensityRange: { min: 1, max: 5 }
    });
  };

  const removeFilter = (type: string, value?: string) => {
    switch (type) {
      case "query":
        setFilters(prev => ({ ...prev, query: "" }));
        break;
      case "emotion":
        setFilters(prev => ({
          ...prev,
          emotions: prev.emotions.filter(e => e !== value)
        }));
        break;
      case "sensory":
        setFilters(prev => ({
          ...prev,
          sensoryTypes: prev.sensoryTypes.filter(s => s !== value)
        }));
        break;
      case "date":
        setFilters(prev => ({ ...prev, dateRange: undefined }));
        break;
      case "goal":
        setFilters(prev => ({
          ...prev,
          goalStatus: prev.goalStatus.filter(g => g !== value)
        }));
        break;
    }
  };

  return (
    <Card className="bg-gradient-card border-0 shadow-soft">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            {String(tAnalytics('interface.advancedSearchFiltering'))}
          </CardTitle>
          <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                {String(tCommon('interface.filters'))}
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
                    {activeFiltersCount}
                  </Badge>
                )}
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </CollapsibleTrigger>
          </Collapsible>
        </div>
        
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`${String(tCommon('interface.search'))}...`}
            value={filters.query}
            onChange={(e) => setFilters(prev => ({ ...prev, query: e.target.value }))}
            className="flex-1"
          />
        </div>

        {/* Active Filters Display */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {filters.query && (
              <Badge variant="secondary" className="flex items-center gap-1">
                {String(tCommon('interface.search'))}: "{filters.query}"
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => removeFilter("query")}
                />
              </Badge>
            )}
            {filters.emotions.map(emotion => (
              <Badge key={emotion} variant="secondary" className="flex items-center gap-1">
                {String(tCommon('interface.emotion'))}: {emotion}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => removeFilter("emotion", emotion)}
                />
              </Badge>
            ))}
            {filters.sensoryTypes.map(sensory => (
              <Badge key={sensory} variant="secondary" className="flex items-center gap-1">
                {String(tCommon('interface.sensory'))}: {sensory}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => removeFilter("sensory", sensory)}
                />
              </Badge>
            ))}
            {filters.dateRange?.from && filters.dateRange?.to && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(filters.dateRange.from, "MMM dd")} - {format(filters.dateRange.to, "MMM dd")}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => removeFilter("date")}
                />
              </Badge>
            )}
            {filters.goalStatus.map(status => (
              <Badge key={status} variant="secondary" className="flex items-center gap-1">
                {String(tCommon('interface.goal'))}: {status}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => removeFilter("goal", status)}
                />
              </Badge>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="h-6 px-2 text-xs"
            >
              {String(tCommon('interface.clearAll'))}
            </Button>
          </div>
        )}
      </CardHeader>

      <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
        <CollapsibleContent>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Date Range Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{String(tCommon('interface.dateRange'))}</label>
                <DatePickerWithRange
                  value={filters.dateRange}
                  onChange={(range) => setFilters(prev => ({ ...prev, dateRange: range }))}
                />
              </div>

              {/* Emotion Types Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{String(tCommon('interface.emotionTypes'))}</label>
                <div className="grid grid-cols-2 gap-2">
                  {emotionTypes.map((emotion) => (
                    <div key={emotion} className="flex items-center space-x-2">
                      <Checkbox
                        id={`emotion-${emotion}`}
                        checked={filters.emotions.includes(emotion)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFilters(prev => ({ ...prev, emotions: [...prev.emotions, emotion] }));
                          } else {
                            setFilters(prev => ({ ...prev, emotions: prev.emotions.filter(e => e !== emotion) }));
                          }
                        }}
                      />
                      <label htmlFor={`emotion-${emotion}`} className="text-sm capitalize">
                        {emotion}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sensory Types Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{String(tCommon('interface.sensoryTypes'))}</label>
                <div className="grid grid-cols-2 gap-2">
                  {sensoryTypes.map((sensory) => (
                    <div key={sensory} className="flex items-center space-x-2">
                      <Checkbox
                        id={`sensory-${sensory}`}
                        checked={filters.sensoryTypes.includes(sensory)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFilters(prev => ({ ...prev, sensoryTypes: [...prev.sensoryTypes, sensory] }));
                          } else {
                            setFilters(prev => ({ ...prev, sensoryTypes: prev.sensoryTypes.filter(s => s !== sensory) }));
                          }
                        }}
                      />
                      <label htmlFor={`sensory-${sensory}`} className="text-sm capitalize">
                        {sensory}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Goal Status Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{String(tCommon('interface.goalStatus'))}</label>
                <div className="grid grid-cols-2 gap-2">
                  {goalStatuses.map((status) => (
                    <div key={status} className="flex items-center space-x-2">
                      <Checkbox
                        id={`goal-${status}`}
                        checked={filters.goalStatus.includes(status)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFilters(prev => ({ ...prev, goalStatus: [...prev.goalStatus, status] }));
                          } else {
                            setFilters(prev => ({ ...prev, goalStatus: prev.goalStatus.filter(g => g !== status) }));
                          }
                        }}
                      />
                      <label htmlFor={`goal-${status}`} className="text-sm capitalize">
                        {status}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Intensity Range Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{String(tCommon('interface.emotionIntensityRange'))}</label>
                <div className="flex items-center space-x-2">
                  <Select
                    value={filters.intensityRange.min.toString()}
                    onValueChange={(value) => 
                      setFilters(prev => ({ 
                        ...prev, 
                        intensityRange: { ...prev.intensityRange, min: parseInt(value) }
                      }))
                    }
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map(num => (
                        <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-muted-foreground">{String(tCommon('interface.to'))}</span>
                  <Select
                    value={filters.intensityRange.max.toString()}
                    onValueChange={(value) => 
                      setFilters(prev => ({ 
                        ...prev, 
                        intensityRange: { ...prev.intensityRange, max: parseInt(value) }
                      }))
                    }
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map(num => (
                        <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Results Summary */}
            <div className="pt-4 border-t border-border/50">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  {String(tCommon('interface.results'))}: {filteredResults.students.length} students, {filteredResults.emotions.length} emotions, {filteredResults.sensoryInputs.length} sensory inputs, {filteredResults.goals.length} goals
                </span>
                {activeFiltersCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                    {String(tCommon('interface.clearAllFilters'))}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};