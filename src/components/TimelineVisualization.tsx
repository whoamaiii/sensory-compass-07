import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Toggle } from '@/components/ui/toggle';
import { EmotionEntry, SensoryEntry, TrackingEntry } from '@/types/student';
import { format, subDays, addDays, differenceInMinutes, isWithinInterval } from 'date-fns';
import { 
  Clock, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Maximize2,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Activity,
  Brain,
  Eye,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';

interface TimelineVisualizationProps {
  emotions: EmotionEntry[];
  sensoryInputs: SensoryEntry[];
  trackingEntries: TrackingEntry[];
  anomalies?: Array<{
    timestamp: Date;
    type: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  onTimeRangeChange?: (start: Date, end: Date) => void;
  realtime?: boolean;
}

interface TimelineEvent {
  id: string;
  timestamp: Date;
  type: 'emotion' | 'sensory' | 'tracking' | 'anomaly';
  label: string;
  value?: number;
  color: string;
  metadata?: Record<string, string | number>;
}

interface DataStream {
  id: string;
  label: string;
  color: string;
  data: Array<{ timestamp: Date; value: number }>;
  visible: boolean;
  yScale: [number, number];
}

export const TimelineVisualization: React.FC<TimelineVisualizationProps> = ({
  emotions,
  sensoryInputs,
  trackingEntries,
  anomalies = [],
  onTimeRangeChange,
  realtime = false
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 400 });
  
  // Timeline state
  const [timeRange, setTimeRange] = useState<[Date, Date]>(() => {
    const now = new Date();
    return [subDays(now, 7), now];
  });
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState(0);
  const [brushSelection, setBrushSelection] = useState<[Date, Date] | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [hoveredEvent, setHoveredEvent] = useState<TimelineEvent | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartDateRef = useRef<Date | null>(null);
  
  // Data stream visibility
  const [streamVisibility, setStreamVisibility] = useState({
    emotions: true,
    sensory: true,
    anomalies: true
  });

  // Calculate dimensions on mount and resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width: width - 40, height: height - 200 });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Process data into timeline events
  const timelineEvents = useMemo((): TimelineEvent[] => {
    const events: TimelineEvent[] = [];

    // Process emotions
    if (streamVisibility.emotions) {
      emotions.forEach((emotion, i) => {
        events.push({
          id: `emotion-${i}`,
          timestamp: emotion.timestamp,
          type: 'emotion',
          label: emotion.emotion,
          value: emotion.intensity,
          color: '#10B981',
          metadata: {
            intensity: emotion.intensity,
            triggers: emotion.triggers?.join(', ') || 'None'
          }
        });
      });
    }

    // Process sensory inputs
    if (streamVisibility.sensory) {
      sensoryInputs.forEach((input, i) => {
        events.push({
          id: `sensory-${i}`,
          timestamp: input.timestamp,
          type: 'sensory',
          label: `${input.sensoryType}: ${input.response}`,
          color: '#3B82F6',
          metadata: {
            type: input.sensoryType,
            response: input.response
          }
        });
      });
    }

    // Process anomalies
    if (streamVisibility.anomalies) {
      anomalies.forEach((anomaly, i) => {
        events.push({
          id: `anomaly-${i}`,
          timestamp: anomaly.timestamp,
          type: 'anomaly',
          label: anomaly.type,
          color: anomaly.severity === 'high' ? '#EF4444' : 
                 anomaly.severity === 'medium' ? '#F59E0B' : '#FCD34D'
        });
      });
    }

    return events.filter(event => 
      isWithinInterval(event.timestamp, { start: timeRange[0], end: timeRange[1] })
    );
  }, [emotions, sensoryInputs, anomalies, timeRange, streamVisibility]);

  // Process data streams
  const dataStreams = useMemo((): DataStream[] => {
    const streams: DataStream[] = [];

    // Emotion intensity stream
    const emotionData = emotions
      .filter(e => isWithinInterval(e.timestamp, { start: timeRange[0], end: timeRange[1] }))
      .map(e => ({ timestamp: e.timestamp, value: e.intensity }))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    if (emotionData.length > 0) {
      streams.push({
        id: 'emotion-intensity',
        label: 'Emotion Intensity',
        color: '#10B981',
        data: emotionData,
        visible: streamVisibility.emotions,
        yScale: [0, 10]
      });
    }

    // Sensory response stream (aggregated by hour)
    const sensoryByHour = new Map<string, { seeking: number; avoiding: number; neutral: number }>();
    sensoryInputs
      .filter(s => isWithinInterval(s.timestamp, { start: timeRange[0], end: timeRange[1] }))
      .forEach(input => {
        const hourKey = format(input.timestamp, 'yyyy-MM-dd HH:00');
        if (!sensoryByHour.has(hourKey)) {
          sensoryByHour.set(hourKey, { seeking: 0, avoiding: 0, neutral: 0 });
        }
        const hourData = sensoryByHour.get(hourKey);
        if (!hourData) {
          // This shouldn't happen, but add safety check
          logger.warn('Unexpected missing hour data', { hourKey });
          return;
        }
        if (input.response?.includes('seeking')) hourData.seeking++;
        else if (input.response?.includes('avoiding')) hourData.avoiding++;
        else hourData.neutral++;
      });

    const sensoryData = Array.from(sensoryByHour.entries())
      .map(([hourKey, data]) => ({
        timestamp: new Date(hourKey),
        value: data.seeking - data.avoiding // Net sensory response
      }))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    if (sensoryData.length > 0) {
      const minValue = Math.min(...sensoryData.map(d => d.value));
      const maxValue = Math.max(...sensoryData.map(d => d.value));
      streams.push({
        id: 'sensory-response',
        label: 'Sensory Response (Seeking - Avoiding)',
        color: '#3B82F6',
        data: sensoryData,
        visible: streamVisibility.sensory,
        yScale: [minValue - 1, maxValue + 1]
      });
    }

    return streams;
  }, [emotions, sensoryInputs, timeRange, streamVisibility]);

  // Timeline calculations
  const timeScale = useCallback((date: Date): number => {
    const totalDuration = timeRange[1].getTime() - timeRange[0].getTime();
    const offset = date.getTime() - timeRange[0].getTime();
    return (offset / totalDuration) * dimensions.width * zoomLevel + panOffset;
  }, [timeRange, dimensions.width, zoomLevel, panOffset]);

  const inverseTimeScale = useCallback((x: number): Date => {
    const adjustedX = (x - panOffset) / zoomLevel;
    const totalDuration = timeRange[1].getTime() - timeRange[0].getTime();
    const offset = (adjustedX / dimensions.width) * totalDuration;
    return new Date(timeRange[0].getTime() + offset);
  }, [timeRange, dimensions.width, zoomLevel, panOffset]);

  // Handle zoom
  const handleZoom = (delta: number) => {
    const newZoom = Math.max(0.5, Math.min(10, zoomLevel + delta));
    setZoomLevel(newZoom);
  };

  // Handle pan
  const handlePan = (delta: number) => {
    setPanOffset(prev => prev + delta);
  };

  // Handle brush selection
  const handleMouseDown = useCallback((e: React.MouseEvent<SVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const startDate = inverseTimeScale(x);
    
    dragStartDateRef.current = startDate;
    setIsDragging(true);
  }, [inverseTimeScale]);

  // Handle mouse events for brush selection with proper cleanup
  useEffect(() => {
    if (!isDragging || !dragStartDateRef.current || !svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const startDate = dragStartDateRef.current;

    const handleMouseMove = (e: MouseEvent) => {
      const currentX = e.clientX - rect.left;
      const currentDate = inverseTimeScale(currentX);
      setBrushSelection([
        startDate < currentDate ? startDate : currentDate,
        startDate < currentDate ? currentDate : startDate
      ]);
    };

    const handleMouseUp = () => {
      if (brushSelection && onTimeRangeChange) {
        onTimeRangeChange(brushSelection[0], brushSelection[1]);
      }
      setIsDragging(false);
      dragStartDateRef.current = null;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    // Cleanup function to remove listeners
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, brushSelection, onTimeRangeChange, inverseTimeScale]);

  // Playback animation
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setTimeRange(prev => {
        const duration = prev[1].getTime() - prev[0].getTime();
        const step = (duration / 100) * playbackSpeed;
        return [
          new Date(prev[0].getTime() + step),
          new Date(prev[1].getTime() + step)
        ];
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed]);

  // Real-time updates
  useEffect(() => {
    if (!realtime) return;

    const interval = setInterval(() => {
      const now = new Date();
      setTimeRange(prev => {
        const duration = prev[1].getTime() - prev[0].getTime();
        return [
          new Date(now.getTime() - duration),
          now
        ];
      });
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [realtime]);

  // Render timeline grid
  const renderGrid = () => {
    const gridLines = [];
    const labels = [];
    const startTime = timeRange[0].getTime();
    const endTime = timeRange[1].getTime();
    const duration = endTime - startTime;
    
    // Determine appropriate time interval based on zoom
    let interval: number;
    let formatStr: string;
    if (duration < 3600000) { // Less than 1 hour
      interval = 300000; // 5 minutes
      formatStr = 'HH:mm';
    } else if (duration < 86400000) { // Less than 1 day
      interval = 3600000; // 1 hour
      formatStr = 'HH:mm';
    } else if (duration < 604800000) { // Less than 1 week
      interval = 86400000; // 1 day
      formatStr = 'MMM dd';
    } else {
      interval = 604800000; // 1 week
      formatStr = 'MMM dd';
    }

    for (let time = startTime; time <= endTime; time += interval) {
      const x = timeScale(new Date(time));
      if (x >= 0 && x <= dimensions.width) {
        gridLines.push(
          <line
            key={`grid-${time}`}
            x1={x}
            y1={0}
            x2={x}
            y2={dimensions.height}
            stroke="#e5e7eb"
            strokeDasharray="2,2"
          />
        );
        labels.push(
          <text
            key={`label-${time}`}
            x={x}
            y={dimensions.height - 5}
            textAnchor="middle"
            fontSize="12"
            fill="#6b7280"
          >
            {format(new Date(time), formatStr)}
          </text>
        );
      }
    }

    return { gridLines, labels };
  };

  // Render data streams
  const renderDataStreams = () => {
    return dataStreams.filter(stream => stream.visible).map(stream => {
      const yScale = (value: number) => {
        const [min, max] = stream.yScale;
        const normalized = (value - min) / (max - min);
        return dimensions.height * 0.8 - normalized * (dimensions.height * 0.6);
      };

      const pathData = stream.data
        .map((point, i) => {
          const x = timeScale(point.timestamp);
          const y = yScale(point.value);
          return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
        })
        .join(' ');

      return (
        <g key={stream.id}>
          <path
            d={pathData}
            fill="none"
            stroke={stream.color}
            strokeWidth="2"
            opacity="0.8"
          />
          {stream.data.map((point, i) => {
            const x = timeScale(point.timestamp);
            const y = yScale(point.value);
            if (x >= 0 && x <= dimensions.width) {
              return (
                <circle
                  key={`${stream.id}-${i}`}
                  cx={x}
                  cy={y}
                  r="3"
                  fill={stream.color}
                  className="cursor-pointer hover:r-5"
                  onMouseEnter={() => setHoveredEvent({
                    id: `${stream.id}-${i}`,
                    timestamp: point.timestamp,
                    type: 'tracking',
                    label: `${stream.label}: ${point.value.toFixed(1)}`,
                    value: point.value,
                    color: stream.color
                  })}
                  onMouseLeave={() => setHoveredEvent(null)}
                />
              );
            }
            return null;
          })}
        </g>
      );
    });
  };

  // Render events
  const renderEvents = () => {
    return timelineEvents.map(event => {
      const x = timeScale(event.timestamp);
      if (x < 0 || x > dimensions.width) return null;

      const getIcon = () => {
        switch (event.type) {
          case 'emotion': return <Brain className="h-4 w-4" />;
          case 'sensory': return <Eye className="h-4 w-4" />;
          case 'anomaly': return <AlertCircle className="h-4 w-4" />;
          default: return <Activity className="h-4 w-4" />;
        }
      };

      return (
        <g key={event.id}>
          <line
            x1={x}
            y1={dimensions.height * 0.2}
            x2={x}
            y2={dimensions.height * 0.8}
            stroke={event.color}
            strokeWidth="1"
            opacity="0.3"
          />
          <circle
            cx={x}
            cy={dimensions.height * 0.2}
            r="8"
            fill={event.color}
            className="cursor-pointer"
            onMouseEnter={() => setHoveredEvent(event)}
            onMouseLeave={() => setHoveredEvent(null)}
          />
        </g>
      );
    });
  };

  // Render brush selection
  const renderBrushSelection = () => {
    if (!brushSelection) return null;

    const x1 = timeScale(brushSelection[0]);
    const x2 = timeScale(brushSelection[1]);

    return (
      <rect
        x={Math.min(x1, x2)}
        y={0}
        width={Math.abs(x2 - x1)}
        height={dimensions.height}
        fill="hsl(var(--primary))"
        opacity="0.1"
        stroke="hsl(var(--primary))"
        strokeWidth="2"
        strokeDasharray="4,2"
      />
    );
  };

  const { gridLines, labels } = useMemo(renderGrid, [timeScale, dimensions.width, dimensions.height]);

  const renderedDataStreams = useMemo(renderDataStreams, [dataStreams, timeScale, dimensions.height]);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Timeline Visualization
          </CardTitle>
          <div className="flex items-center gap-2">
            {realtime && (
              <Badge variant="default" className="animate-pulse">
                Live
              </Badge>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setZoomLevel(1);
                setPanOffset(0);
                setBrushSelection(null);
              }}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Controls */}
        <div className="mb-4 space-y-4">
          <div className="flex items-center gap-4">
            {/* Zoom controls */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleZoom(-0.5)}
                disabled={zoomLevel <= 0.5}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium w-16 text-center">
                {Math.round(zoomLevel * 100)}%
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleZoom(0.5)}
                disabled={zoomLevel >= 10}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>

            {/* Pan controls */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handlePan(50)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handlePan(-50)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Playback controls */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={isPlaying ? 'default' : 'outline'}
                onClick={() => setIsPlaying(!isPlaying)}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <Slider
                value={[playbackSpeed]}
                onValueChange={([value]) => setPlaybackSpeed(value)}
                min={0.25}
                max={4}
                step={0.25}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">
                {playbackSpeed}x
              </span>
            </div>

            {/* Stream visibility toggles */}
            <div className="flex items-center gap-2 ml-auto">
              <Toggle
                size="sm"
                pressed={streamVisibility.emotions}
                onPressedChange={(pressed) => 
                  setStreamVisibility(prev => ({ ...prev, emotions: pressed }))
                }
              >
                <Brain className="h-4 w-4 mr-1" />
                Emotions
              </Toggle>
              <Toggle
                size="sm"
                pressed={streamVisibility.sensory}
                onPressedChange={(pressed) => 
                  setStreamVisibility(prev => ({ ...prev, sensory: pressed }))
                }
              >
                <Eye className="h-4 w-4 mr-1" />
                Sensory
              </Toggle>
              <Toggle
                size="sm"
                pressed={streamVisibility.anomalies}
                onPressedChange={(pressed) => 
                  setStreamVisibility(prev => ({ ...prev, anomalies: pressed }))
                }
              >
                <AlertCircle className="h-4 w-4 mr-1" />
                Anomalies
              </Toggle>
            </div>
          </div>

          {/* Time range display */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{format(timeRange[0], 'MMM dd, yyyy HH:mm')}</span>
            <span className="font-medium">
              {differenceInMinutes(timeRange[1], timeRange[0])} minutes
            </span>
            <span>{format(timeRange[1], 'MMM dd, yyyy HH:mm')}</span>
          </div>
        </div>

        {/* Timeline visualization */}
        <div ref={containerRef} className="relative bg-gray-50 rounded-lg overflow-hidden">
          <svg
            ref={svgRef}
            width={dimensions.width}
            height={dimensions.height}
            className="cursor-crosshair"
            onMouseDown={handleMouseDown}
          >
            {/* Grid lines */}
            {gridLines}

            {/* Data streams */}
            {renderedDataStreams}

            {/* Events */}
            {renderEvents()}

            {/* Brush selection */}
            {renderBrushSelection()}

            {/* Time labels */}
            {labels}

            {/* Current time indicator (for realtime mode) */}
            {realtime && (
              <line
                x1={timeScale(new Date())}
                y1={0}
                x2={timeScale(new Date())}
                y2={dimensions.height}
                stroke="#ef4444"
                strokeWidth="2"
                strokeDasharray="4,2"
              />
            )}
          </svg>

          {/* Tooltip */}
          {hoveredEvent && (
            <div
              className={cn(
                "absolute bg-background border rounded-lg shadow-lg p-3 pointer-events-none",
                "top-5"
              )}
              style={{
                left: `${Math.min(timeScale(hoveredEvent.timestamp), dimensions.width - 200)}px`
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <div 
                  className={cn("w-3 h-3 rounded-full")}
                  style={{ backgroundColor: hoveredEvent.color }}
                />
                <span className="font-medium capitalize">{hoveredEvent.type}</span>
              </div>
              <p className="text-sm">{hoveredEvent.label}</p>
              <p className="text-xs text-muted-foreground">
                {format(hoveredEvent.timestamp, 'MMM dd, yyyy HH:mm:ss')}
              </p>
              {hoveredEvent.metadata && (
                <div className="mt-1 pt-1 border-t">
                  {Object.entries(hoveredEvent.metadata).map(([key, value]) => (
                    <p key={key} className="text-xs text-muted-foreground">
                      {key}: {value}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Legend */}
          <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
            <h4 className="font-medium text-sm mb-2">Data Streams</h4>
            <div className="space-y-1">
              {dataStreams.filter(s => s.visible).map(stream => (
                <div key={stream.id} className="flex items-center gap-2">
                  <div 
                    className={cn("w-3 h-3 rounded-full")}
                    style={{ backgroundColor: stream.color }}
                  />
                  <span className="text-xs">{stream.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="absolute top-4 right-4 bg-background/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
            <div className="text-xs space-y-1">
              <p>Events: {timelineEvents.length}</p>
              <p>Zoom: {Math.round(zoomLevel * 100)}%</p>
              {brushSelection && (
                <p>Selection: {differenceInMinutes(brushSelection[1], brushSelection[0])} min</p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};