/**
 * Simple test script to verify analytics fallback mode functionality
 */

// Set up global environment for Node.js execution
(global as any).import = {
  meta: {
    env: {
      PROD: false,
      DEV: true
    }
  }
};

import { analyticsWorkerFallback } from '../src/lib/analyticsWorkerFallback';
import { AnalyticsData } from '../src/workers/analytics.worker';
import { EmotionEntry, SensoryEntry, TrackingEntry } from '../src/types/student';

// Mock data generation
const generateMockData = (): AnalyticsData => {
  const now = new Date();
  const emotions: EmotionEntry[] = [];
  const sensoryInputs: SensoryEntry[] = [];
  const entries: TrackingEntry[] = [];

  // Generate emotion entries
  for (let i = 0; i < 10; i++) {
    emotions.push({
      id: `emotion-${i}`,
      studentId: 'test-student',
      timestamp: new Date(now.getTime() - i * 24 * 60 * 60 * 1000), // Go back i days
      emotion: ['happy', 'sad', 'anxious', 'calm'][i % 4],
      intensity: Math.floor(Math.random() * 5) + 1,
      triggers: [],
      notes: ''
    });
  }

  // Generate sensory entries
  for (let i = 0; i < 10; i++) {
    sensoryInputs.push({
      id: `sensory-${i}`,
      studentId: 'test-student',
      timestamp: new Date(now.getTime() - i * 24 * 60 * 60 * 1000),
      type: ['visual', 'auditory', 'tactile', 'vestibular'][i % 4],
      response: ['seeking', 'avoiding', 'neutral'][i % 3],
      intensity: Math.floor(Math.random() * 5) + 1,
      notes: ''
    });
  }

  // Generate tracking entries
  for (let i = 0; i < 5; i++) {
    entries.push({
      id: `entry-${i}`,
      studentId: 'test-student',
      timestamp: new Date(now.getTime() - i * 24 * 60 * 60 * 1000),
      type: 'regular',
      emotions: emotions.slice(i * 2, i * 2 + 2),
      sensoryInputs: sensoryInputs.slice(i * 2, i * 2 + 2),
      activities: [],
      goals: [],
      notes: '',
      environmentalData: {
        roomConditions: {
          lighting: 'bright',
          noiseLevel: 3,
          temperature: 22,
          crowdedness: 2
        },
        distractions: []
      }
    });
  }

  return { emotions, sensoryInputs, entries };
};

// Test function
const testFallbackMode = async () => {
  console.log('Testing Analytics Fallback Mode...\n');

  const mockData = generateMockData();
  console.log(`Generated mock data:`);
  console.log(`- ${mockData.emotions.length} emotion entries`);
  console.log(`- ${mockData.sensoryInputs.length} sensory entries`);
  console.log(`- ${mockData.entries.length} tracking entries\n`);

  try {
    console.log('Processing analytics...');
    const startTime = Date.now();
    
    const results = await analyticsWorkerFallback.processAnalytics(mockData);
    
    const processingTime = Date.now() - startTime;
    console.log(`\nProcessing completed in ${processingTime}ms\n`);

    console.log('Results:');
    console.log(`- Patterns found: ${results.patterns.length}`);
    results.patterns.forEach(pattern => {
      console.log(`  • ${pattern.pattern} (${pattern.description}) - Confidence: ${(pattern.confidence * 100).toFixed(1)}%`);
    });

    console.log(`\n- Correlations found: ${results.correlations.length}`);
    results.correlations.forEach(corr => {
      console.log(`  • ${corr.description} - Significance: ${corr.significance}`);
    });

    console.log(`\n- Predictive insights: ${results.predictiveInsights.length}`);
    results.predictiveInsights.forEach(insight => {
      console.log(`  • ${insight.type}: ${insight.description}`);
    });

    console.log(`\n- Anomalies detected: ${results.anomalies.length}`);
    results.anomalies.forEach(anomaly => {
      console.log(`  • ${anomaly.type} anomaly: ${anomaly.description} - Severity: ${anomaly.severity}`);
    });

    console.log(`\n- Insights:`);
    results.insights.forEach(insight => {
      console.log(`  • ${insight}`);
    });

    console.log('\n✅ Fallback mode test completed successfully!');
  } catch (error) {
    console.error('\n❌ Error during fallback mode test:', error);
  }
};

// Run the test
testFallbackMode().catch(console.error);
