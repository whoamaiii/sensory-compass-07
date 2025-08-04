import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { EmotionEntry, SensoryEntry, TrackingEntry, EnvironmentalEntry } from '@/types/student';
import { differenceInMinutes, subMinutes } from 'date-fns';
import { logger } from '@/lib/logger';

interface RealtimeDataOptions {
  enabled: boolean;
  windowSize: number; // in minutes
  updateInterval: number; // in milliseconds
  smoothTransitions: boolean;
  simulateData?: boolean; // For demo purposes
}

interface RealtimeDataState {
  emotions: EmotionEntry[];
  sensoryInputs: SensoryEntry[];
  trackingEntries: TrackingEntry[];
  isLive: boolean;
  lastUpdate: Date | null;
  connectionStatus: 'connected' | 'disconnected' | 'connecting' | 'error';
  newDataCount: number;
}

export interface RealtimeDataReturn extends RealtimeDataState {
  startStream: () => void;
  stopStream: () => void;
  clearNewDataIndicator: () => void;
  getHistoricalData: (minutes: number) => void;
  isDataLive: (timestamp: Date) => boolean;
}

// Simulate real-time data generation
const generateRealtimeEmotionEntry = (): EmotionEntry => {
  const emotions = ['happy', 'calm', 'anxious', 'frustrated', 'excited', 'sad'];
  const triggers = ['noise', 'crowd', 'task', 'transition', 'social'];
  
  return {
    id: `emotion-${Date.now()}-${Math.random()}`,
    timestamp: new Date(),
    emotion: emotions[Math.floor(Math.random() * emotions.length)],
    intensity: Math.floor(Math.random() * 8) + 3, // 3-10
    triggers: Math.random() > 0.5 
      ? [triggers[Math.floor(Math.random() * triggers.length)]]
      : [],
    notes: ''
  };
};

const generateRealtimeSensoryEntry = (): SensoryEntry => {
  const sensoryTypes = ['visual', 'auditory', 'tactile', 'vestibular', 'proprioceptive'];
  const responses = ['seeking', 'avoiding', 'neutral'];
  
  return {
    id: `sensory-${Date.now()}-${Math.random()}`,
    timestamp: new Date(),
    sensoryType: sensoryTypes[Math.floor(Math.random() * sensoryTypes.length)],
    response: responses[Math.floor(Math.random() * responses.length)],
    intensity: Math.floor(Math.random() * 8) + 3,
    notes: ''
  };
};

const generateEnvironmentalEntry = (): EnvironmentalEntry => {
  return {
    id: `env-${Date.now()}-${Math.random()}`,
    timestamp: new Date(),
    location: 'classroom',
    socialContext: Math.random() > 0.5 ? 'group' : 'individual',
    roomConditions: {
      temperature: 20 + Math.floor(Math.random() * 5),
      humidity: 40 + Math.floor(Math.random() * 20),
      lighting: Math.random() > 0.5 ? 'bright' : 'dim',
      noiseLevel: Math.floor(Math.random() * 10)
    },
    weather: {
      condition: ['sunny', 'cloudy', 'rainy'][Math.floor(Math.random() * 3)] as 'sunny' | 'cloudy' | 'rainy',
      temperature: 15 + Math.floor(Math.random() * 15)
    },
    classroom: {
      activity: ['instruction', 'transition', 'free-time'][Math.floor(Math.random() * 3)] as 'instruction' | 'transition' | 'free-time',
      studentCount: 15 + Math.floor(Math.random() * 10),
      timeOfDay: 'morning'
    }
  };
};

const generateRealtimeTrackingEntry = (): TrackingEntry => {
  return {
    id: `tracking-${Date.now()}-${Math.random()}`,
    studentId: 'current-student',
    timestamp: new Date(),
    emotions: [generateRealtimeEmotionEntry()],
    sensoryInputs: [generateRealtimeSensoryEntry()],
    environmentalData: generateEnvironmentalEntry(),
    notes: ''
  };
};

export const useRealtimeData = (
  initialData: {
    emotions: EmotionEntry[];
    sensoryInputs: SensoryEntry[];
    trackingEntries: TrackingEntry[];
  },
  options: RealtimeDataOptions
): RealtimeDataReturn => {
  const [state, setState] = useState<RealtimeDataState>({
    emotions: initialData.emotions,
    sensoryInputs: initialData.sensoryInputs,
    trackingEntries: initialData.trackingEntries,
    isLive: false,
    lastUpdate: null,
    connectionStatus: 'disconnected',
    newDataCount: 0
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const newDataTimestamps = useRef<Set<number>>(new Set());

  // Track which data points are "live" (recently added)
  const liveDataThreshold = 5000; // 5 seconds

  // Filter data based on window size
  const filteredData = useMemo(() => {
    if (!options.enabled || options.windowSize === 0) {
      return state;
    }

    const cutoffTime = subMinutes(new Date(), options.windowSize);

    return {
      ...state,
      emotions: state.emotions.filter(e => e.timestamp >= cutoffTime),
      sensoryInputs: state.sensoryInputs.filter(s => s.timestamp >= cutoffTime),
      trackingEntries: state.trackingEntries.filter(t => t.timestamp >= cutoffTime)
    };
  }, [state, options.enabled, options.windowSize]);

  // Smooth data insertion with animation frames
  const smoothInsertData = useCallback((
    newEmotion?: EmotionEntry,
    newSensory?: SensoryEntry,
    newTracking?: TrackingEntry
  ) => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    const animate = () => {
      setState(prev => {
        const now = new Date();
        newDataTimestamps.current.add(now.getTime());

        const updates: Partial<RealtimeDataState> = {
          lastUpdate: now,
          newDataCount: prev.newDataCount + 1
        };

        if (newEmotion) {
          updates.emotions = [...prev.emotions, newEmotion].slice(-1000); // Keep last 1000
        }
        if (newSensory) {
          updates.sensoryInputs = [...prev.sensoryInputs, newSensory].slice(-1000);
        }
        if (newTracking) {
          updates.trackingEntries = [...prev.trackingEntries, newTracking].slice(-1000);
        }

        // Clean up old timestamps
        const cutoff = now.getTime() - liveDataThreshold;
        newDataTimestamps.current.forEach(timestamp => {
          if (timestamp < cutoff) {
            newDataTimestamps.current.delete(timestamp);
          }
        });

        return { ...prev, ...updates };
      });
    };

    if (options.smoothTransitions) {
      animationFrameRef.current = requestAnimationFrame(animate);
    } else {
      animate();
    }
  }, [options.smoothTransitions, liveDataThreshold]);

  // Simulate real-time data stream
  const simulateDataStream = useCallback(() => {
    // Randomly generate new data
    const rand = Math.random();
    
    if (rand < 0.4) { // 40% chance of emotion data
      smoothInsertData(generateRealtimeEmotionEntry(), undefined, undefined);
    } else if (rand < 0.7) { // 30% chance of sensory data
      smoothInsertData(undefined, generateRealtimeSensoryEntry(), undefined);
    } else if (rand < 0.9) { // 20% chance of tracking data
      smoothInsertData(undefined, undefined, generateRealtimeTrackingEntry());
    }
    // 10% chance of no new data this cycle
  }, [smoothInsertData]);

  // Start the real-time stream
  const startStream = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      isLive: true, 
      connectionStatus: 'connecting' 
    }));

    // Simulate connection delay
    setTimeout(() => {
      setState(prev => ({ 
        ...prev, 
        connectionStatus: 'connected' 
      }));

      if (options.simulateData) {
        // Start simulated data generation
        intervalRef.current = setInterval(simulateDataStream, options.updateInterval);
      } else {
        // In a real implementation, you would:
        // 1. Connect to WebSocket/SSE endpoint
        // 2. Listen for data events
        // 3. Call smoothInsertData with received data
        logger.info('Real-time data connection would be established here');
      }
    }, 1000);
  }, [options.simulateData, options.updateInterval, simulateDataStream]);

  // Stop the real-time stream
  const stopStream = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    setState(prev => ({ 
      ...prev, 
      isLive: false, 
      connectionStatus: 'disconnected' 
    }));

    // In a real implementation, close WebSocket/SSE connection
  }, []);

  // Clear new data indicator
  const clearNewDataIndicator = useCallback(() => {
    setState(prev => ({ ...prev, newDataCount: 0 }));
  }, []);

  // Get historical data (simulate API call)
  const getHistoricalData = useCallback((minutes: number) => {
    setState(prev => ({ ...prev, connectionStatus: 'connecting' }));

    // Simulate API call delay
    setTimeout(() => {
      const now = new Date();
      const historicalEmotions: EmotionEntry[] = [];
      const historicalSensory: SensoryEntry[] = [];
      const historicalTracking: TrackingEntry[] = [];

      // Generate some historical data points
      for (let i = 0; i < minutes; i += 5) {
        const timestamp = subMinutes(now, i);
        
        if (Math.random() > 0.3) {
          historicalEmotions.push({
            ...generateRealtimeEmotionEntry(),
            timestamp
          });
        }

        if (Math.random() > 0.4) {
          historicalSensory.push({
            ...generateRealtimeSensoryEntry(),
            timestamp
          });
        }

        if (Math.random() > 0.5) {
          historicalTracking.push({
            ...generateRealtimeTrackingEntry(),
            timestamp
          });
        }
      }

      setState(prev => ({
        ...prev,
        emotions: [...historicalEmotions.reverse(), ...prev.emotions],
        sensoryInputs: [...historicalSensory.reverse(), ...prev.sensoryInputs],
        trackingEntries: [...historicalTracking.reverse(), ...prev.trackingEntries],
        connectionStatus: prev.isLive ? 'connected' : 'disconnected'
      }));
    }, 500);
  }, []);

  // Check if a data point is "live" (recently added)
  const isDataLive = useCallback((timestamp: Date): boolean => {
    const now = new Date();
    // Use millisecond difference directly to avoid rounding errors from differenceInMinutes
    return now.getTime() - new Date(timestamp).getTime() < liveDataThreshold;
  }, [liveDataThreshold]);

  // Auto-start/stop based on enabled option
  useEffect(() => {
    if (options.enabled && !state.isLive) {
      startStream();
    } else if (!options.enabled && state.isLive) {
      stopStream();
    }

    return () => {
      // Only stop if currently live; avoid redundant calls after an explicit stop
      if (state.isLive) {
        stopStream();
      }
    };
  }, [options.enabled, state.isLive, startStream, stopStream]);

  // Handle connection errors (simulated)
  useEffect(() => {
    if (state.connectionStatus === 'connected' && Math.random() < 0.01) { // 1% chance of error
      setState(prev => ({ ...prev, connectionStatus: 'error' }));
      
      // Auto-reconnect after 3 seconds
      setTimeout(() => {
        if (state.isLive) {
          startStream();
        }
      }, 3000);
    }
  }, [state.connectionStatus, state.isLive, startStream]);

  return {
    ...filteredData,
    isLive: state.isLive,
    lastUpdate: state.lastUpdate,
    connectionStatus: state.connectionStatus,
    newDataCount: state.newDataCount,
    startStream,
    stopStream,
    clearNewDataIndicator,
    getHistoricalData,
    isDataLive
  };
};

// Hook for managing real-time updates to visualizations
export const useRealtimeVisualization = (
  data: RealtimeDataReturn,
  updateInterval: number = 100
) => {
  const [animatedData, setAnimatedData] = useState(data);
  const animationRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!data.isLive) {
      setAnimatedData(data);
      return;
    }

    // Smooth animation for data updates
    const animate = () => {
      setAnimatedData(prev => {
        // Implement smooth transitions for numerical values
        const smoothTransition = (current: number, target: number, factor = 0.1) => {
          return current + (target - current) * factor;
        };

        // For now, just pass through the data
        // In a real implementation, you might interpolate positions, sizes, etc.
        return data;
      });
    };

    animationRef.current = setInterval(animate, updateInterval);

    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
    };
  }, [data, updateInterval]);

  return animatedData;
};