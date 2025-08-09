import { useState, useEffect, useRef, useCallback, useMemo, useReducer } from 'react';
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

type RealtimeDataAction =
  | { type: 'START_STREAM' }
  | { type: 'STOP_STREAM' }
  | { type: 'SET_CONNECTION_STATUS'; payload: RealtimeDataState['connectionStatus'] }
  | { type: 'INSERT_DATA'; payload: { emotion?: EmotionEntry; sensory?: SensoryEntry; tracking?: TrackingEntry } }
  | { type: 'SET_HISTORICAL_DATA'; payload: { emotions: EmotionEntry[]; sensoryInputs: SensoryEntry[]; trackingEntries: TrackingEntry[] } }
  | { type: 'CLEAR_NEW_DATA_INDICATOR' }
  | { type: 'RESET_STATE'; payload: RealtimeDataState };

const realtimeDataReducer = (state: RealtimeDataState, action: RealtimeDataAction): RealtimeDataState => {
  switch (action.type) {
    case 'START_STREAM':
      return { ...state, isLive: true, connectionStatus: 'connecting' };
    case 'STOP_STREAM':
      return { ...state, isLive: false, connectionStatus: 'disconnected' };
    case 'SET_CONNECTION_STATUS':
      return { ...state, connectionStatus: action.payload };
    case 'INSERT_DATA':
      return {
        ...state,
        lastUpdate: new Date(),
        newDataCount: state.newDataCount + 1,
        emotions: action.payload.emotion ? [...state.emotions, action.payload.emotion].slice(-1000) : state.emotions,
        sensoryInputs: action.payload.sensory ? [...state.sensoryInputs, action.payload.sensory].slice(-1000) : state.sensoryInputs,
        trackingEntries: action.payload.tracking ? [...state.trackingEntries, action.payload.tracking].slice(-1000) : state.trackingEntries,
      };
    case 'SET_HISTORICAL_DATA':
      return {
        ...state,
        emotions: [...action.payload.emotions, ...state.emotions],
        sensoryInputs: [...action.payload.sensoryInputs, ...state.sensoryInputs],
        trackingEntries: [...action.payload.trackingEntries, ...state.trackingEntries],
        connectionStatus: state.isLive ? 'connected' : 'disconnected',
      };
    case 'CLEAR_NEW_DATA_INDICATOR':
      return { ...state, newDataCount: 0 };
    case 'RESET_STATE':
      return action.payload;
    default:
      return state;
  }
};

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
  const initialState = useMemo(() => ({
    emotions: initialData.emotions,
    sensoryInputs: initialData.sensoryInputs,
    trackingEntries: initialData.trackingEntries,
    isLive: false,
    lastUpdate: null,
    connectionStatus: 'disconnected' as const,
    newDataCount: 0,
  }), [initialData]);

  const [state, dispatch] = useReducer(realtimeDataReducer, initialState);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
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
      const newTimestamps = new Set(newDataTimestamps.current);
      newTimestamps.add(new Date().getTime());

      // Clean up old timestamps
      const cutoff = Date.now() - liveDataThreshold;
      newTimestamps.forEach(timestamp => {
        if (timestamp < cutoff) {
          newTimestamps.delete(timestamp);
        }
      });
      newDataTimestamps.current = newTimestamps;

      dispatch({ type: 'INSERT_DATA', payload: { emotion: newEmotion, sensory: newSensory, tracking: newTracking } });
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

  // Track connection timeout to ensure proper cleanup
  const connectionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Start the real-time stream
  const startStream = useCallback(() => {
    dispatch({ type: 'START_STREAM' });

    // Clear any existing connection timeout
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }

    // Simulate connection delay
    connectionTimeoutRef.current = setTimeout(() => {
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'connected' });

      if (options.simulateData) {
        // Start simulated data generation
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = setInterval(simulateDataStream, options.updateInterval);
      } else {
        logger.info('Real-time data connection would be established here');
      }
      
      // Clear the ref once timeout executes
      connectionTimeoutRef.current = null;
    }, 1000);
  }, [options.simulateData, options.updateInterval, simulateDataStream]);

  // Stop the real-time stream
  const stopStream = useCallback(() => {
    // Clear connection timeout if it's still pending
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    dispatch({ type: 'STOP_STREAM' });

    // In a real implementation, close WebSocket/SSE connection
  }, []);

  // Clear new data indicator
  const clearNewDataIndicator = useCallback(() => {
    dispatch({ type: 'CLEAR_NEW_DATA_INDICATOR' });
  }, []);

  // Track historical data timeout to ensure proper cleanup
  const historicalDataTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Get historical data (simulate API call)
  const getHistoricalData = useCallback((minutes: number) => {
    dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'connecting' });

    // Clear any existing historical data timeout
    if (historicalDataTimeoutRef.current) {
      clearTimeout(historicalDataTimeoutRef.current);
      historicalDataTimeoutRef.current = null;
    }

    // Simulate API call delay
    historicalDataTimeoutRef.current = setTimeout(() => {
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

      dispatch({ 
        type: 'SET_HISTORICAL_DATA', 
        payload: { 
          emotions: historicalEmotions.reverse(), 
          sensoryInputs: historicalSensory.reverse(), 
          trackingEntries: historicalTracking.reverse() 
        } 
      });
      
      // Clear the ref once timeout executes
      historicalDataTimeoutRef.current = null;
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
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    
    if (state.connectionStatus === 'connected' && Math.random() < 0.01) { // 1% chance of error
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'error' });
      
      // Auto-reconnect after 3 seconds
      reconnectTimeout = setTimeout(() => {
        if (state.isLive) {
          startStream();
        }
      }, 3000);
    }

    return () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [state.connectionStatus, state.isLive, startStream]);

  // Comprehensive cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear all timeouts on unmount
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
      
      if (historicalDataTimeoutRef.current) {
        clearTimeout(historicalDataTimeoutRef.current);
        historicalDataTimeoutRef.current = null;
      }
      
      // Clear intervals
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      // Cancel animation frames
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, []); // Empty dependency array ensures this only runs on unmount

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
  const animationRef = useRef<ReturnType<typeof setInterval> | null>(null);

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