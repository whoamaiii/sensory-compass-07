import * as tf from '@tensorflow/tfjs';
import { Student, TrackingEntry, EmotionEntry, SensoryEntry } from '../types/student';
import { ValidationResults } from '../types/ml';

// Model versioning and metadata
export interface ModelMetadata {
  name: string;
  version: string;
  createdAt: Date;
  lastTrainedAt: Date;
  accuracy?: number;
  loss?: number;
  inputShape: number[];
  outputShape: number[];
  architecture: string;
  epochs: number;
  dataPoints: number;
  validationResults?: ValidationResults;
}

// ML Model types
export type ModelType = 'emotion-prediction' | 'sensory-response' | 'baseline-clustering';

// Model storage interface
export interface StoredModel {
  model: tf.LayersModel | tf.Sequential;
  metadata: ModelMetadata;
}

// Session-like interface for ML training
export interface MLSession {
  id: string;
  studentId: string;
  date: string;
  emotion: {
    happy?: number;
    sad?: number;
    angry?: number;
    anxious?: number;
    calm?: number;
    energetic?: number;
    frustrated?: number;
  };
  sensory: {
    visual?: 'seeking' | 'avoiding' | 'neutral';
    auditory?: 'seeking' | 'avoiding' | 'neutral';
    tactile?: 'seeking' | 'avoiding' | 'neutral';
    vestibular?: 'seeking' | 'avoiding' | 'neutral';
    proprioceptive?: 'seeking' | 'avoiding' | 'neutral';
  };
  environment: {
    lighting?: 'bright' | 'dim' | 'moderate';
    noise?: 'loud' | 'moderate' | 'quiet';
    temperature?: 'hot' | 'cold' | 'comfortable';
    crowded?: 'very' | 'moderate' | 'not';
    smells?: boolean;
    textures?: boolean;
  };
  activities: string[];
  notes: string;
}

// ML prediction results
export interface EmotionPrediction {
  date: Date;
  emotions: {
    happy: number;
    sad: number;
    angry: number;
    anxious: number;
    calm: number;
    energetic: number;
    frustrated: number;
  };
  confidence: number;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
}

export interface SensoryPrediction {
  sensoryResponse: {
    visual: { seeking: number; avoiding: number; neutral: number };
    auditory: { seeking: number; avoiding: number; neutral: number };
    tactile: { seeking: number; avoiding: number; neutral: number };
    vestibular: { seeking: number; avoiding: number; neutral: number };
    proprioceptive: { seeking: number; avoiding: number; neutral: number };
  };
  environmentalTriggers: {
    trigger: string;
    probability: number;
  }[];
  confidence: number;
}

export interface BaselineCluster {
  clusterId: number;
  centroid: number[];
  description: string;
  anomalyScore: number;
  isNormal: boolean;
}

// Model storage class using IndexedDB
class ModelStorage {
  private dbName = 'sensory-compass-ml';
  private storeName = 'models';
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'name' });
        }
      };
    });
  }

  async saveModel(name: ModelType, model: tf.LayersModel, metadata: ModelMetadata): Promise<void> {
    if (!this.db) await this.init();
    
    // Save model to IndexedDB
    const modelData = await model.save(tf.io.withSaveHandler(async (artifacts) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      await new Promise<void>((resolve, reject) => {
        const request = store.put({
          name,
          artifacts,
          metadata,
          timestamp: new Date()
        });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
      
      return { modelArtifactsInfo: { dateSaved: new Date(), modelTopologyType: 'JSON' } };
    }));
  }

  async loadModel(name: ModelType): Promise<StoredModel | null> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(name);
      
      request.onsuccess = async () => {
        const data = request.result;
        if (!data) {
          resolve(null);
          return;
        }
        
        // Load model from stored artifacts
        const model = await tf.loadLayersModel(tf.io.fromMemory(data.artifacts));
        resolve({
          model,
          metadata: data.metadata
        });
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  async deleteModel(name: ModelType): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(name);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async listModels(): Promise<ModelMetadata[]> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();
      
      request.onsuccess = () => {
        const models = request.result.map(item => item.metadata);
        resolve(models);
      };
      
      request.onerror = () => reject(request.error);
    });
  }
}

// Data preprocessing utilities
export class DataPreprocessor {
  // Normalize data to 0-1 range
  static normalizeData(data: number[], min?: number, max?: number): number[] {
    const dataMin = min ?? Math.min(...data);
    const dataMax = max ?? Math.max(...data);
    const range = dataMax - dataMin || 1;
    
    return data.map(value => (value - dataMin) / range);
  }

  // Extract time features from date
  static extractTimeFeatures(date: Date): number[] {
    const dayOfWeek = date.getDay() / 6; // 0-1
    const hourOfDay = date.getHours() / 23; // 0-1
    const dayOfMonth = (date.getDate() - 1) / 30; // 0-1
    const monthOfYear = date.getMonth() / 11; // 0-1
    
    // Cyclic encoding for better representation
    const dayOfWeekSin = Math.sin(2 * Math.PI * dayOfWeek);
    const dayOfWeekCos = Math.cos(2 * Math.PI * dayOfWeek);
    const hourOfDaySin = Math.sin(2 * Math.PI * hourOfDay);
    const hourOfDayCos = Math.cos(2 * Math.PI * hourOfDay);
    
    return [
      dayOfWeekSin,
      dayOfWeekCos,
      hourOfDaySin,
      hourOfDayCos,
      dayOfMonth,
      monthOfYear
    ];
  }

  // Convert TrackingEntry to MLSession format
  static convertTrackingEntriesToSessions(entries: TrackingEntry[]): MLSession[] {
    return entries.map(entry => {
      // Extract emotion averages
      const emotionData: MLSession['emotion'] = {};
      const emotionTypes = ['happy', 'sad', 'angry', 'anxious', 'calm', 'energetic', 'frustrated'];
      
      emotionTypes.forEach(emotionType => {
        const emotions = entry.emotions.filter(e => e.emotion.toLowerCase() === emotionType);
        if (emotions.length > 0) {
          emotionData[emotionType as keyof MLSession['emotion']] =
            emotions.reduce((sum, e) => sum + e.intensity, 0) / emotions.length;
        }
      });

      // Extract sensory patterns
      const sensoryData: MLSession['sensory'] = {};
      const sensoryTypes = ['visual', 'auditory', 'tactile', 'vestibular', 'proprioceptive'];
      
      sensoryTypes.forEach(sensoryType => {
        const sensoryInputs = entry.sensoryInputs.filter(s =>
          s.sensoryType?.toLowerCase() === sensoryType || s.type?.toLowerCase() === sensoryType
        );
        if (sensoryInputs.length > 0) {
          const seekingCount = sensoryInputs.filter(s => s.response.toLowerCase().includes('seeking')).length;
          const avoidingCount = sensoryInputs.filter(s => s.response.toLowerCase().includes('avoiding')).length;
          const neutralCount = sensoryInputs.length - seekingCount - avoidingCount;
          
          if (seekingCount > avoidingCount && seekingCount > neutralCount) {
            sensoryData[sensoryType as keyof MLSession['sensory']] = 'seeking';
          } else if (avoidingCount > seekingCount && avoidingCount > neutralCount) {
            sensoryData[sensoryType as keyof MLSession['sensory']] = 'avoiding';
          } else {
            sensoryData[sensoryType as keyof MLSession['sensory']] = 'neutral';
          }
        }
      });

      // Extract environmental data
      const environmentData: MLSession['environment'] = {
        lighting: entry.environmentalData?.roomConditions?.lighting as 'bright' | 'dim' | 'moderate' || 'moderate',
        noise: entry.environmentalData?.roomConditions?.noiseLevel && entry.environmentalData.roomConditions.noiseLevel > 70 ? 'loud' :
               entry.environmentalData?.roomConditions?.noiseLevel && entry.environmentalData.roomConditions.noiseLevel < 40 ? 'quiet' : 'moderate',
        temperature: entry.environmentalData?.roomConditions?.temperature && entry.environmentalData.roomConditions.temperature > 26 ? 'hot' :
                    entry.environmentalData?.roomConditions?.temperature && entry.environmentalData.roomConditions.temperature < 18 ? 'cold' : 'comfortable',
        crowded: entry.environmentalData?.classroom?.studentCount && entry.environmentalData.classroom.studentCount > 25 ? 'very' :
                entry.environmentalData?.classroom?.studentCount && entry.environmentalData.classroom.studentCount < 10 ? 'not' : 'moderate',
        smells: false,
        textures: false
      };

      return {
        id: entry.id,
        studentId: entry.studentId,
        date: entry.timestamp.toISOString(),
        emotion: emotionData,
        sensory: sensoryData,
        environment: environmentData,
        activities: [],
        notes: entry.notes || ''
      };
    });
  }

  // Prepare emotion data for training
  static prepareEmotionData(sessions: MLSession[], sequenceLength: number = 7): {
    inputs: tf.Tensor3D;
    outputs: tf.Tensor2D;
    normalizers: { min: number; max: number };
  } {
    const sequences: number[][][] = [];
    const targets: number[][] = [];
    
    // Sort sessions by date
    const sortedSessions = [...sessions].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    // Create sequences
    for (let i = 0; i < sortedSessions.length - sequenceLength; i++) {
      const sequence: number[][] = [];
      const target: number[] = [];
      
      // Build sequence
      for (let j = 0; j < sequenceLength; j++) {
        const session = sortedSessions[i + j];
        const timeFeatures = this.extractTimeFeatures(new Date(session.date));
        const emotionValues = [
          session.emotion.happy ?? 0,
          session.emotion.sad ?? 0,
          session.emotion.angry ?? 0,
          session.emotion.anxious ?? 0,
          session.emotion.calm ?? 0,
          session.emotion.energetic ?? 0,
          session.emotion.frustrated ?? 0
        ];
        
        sequence.push([...emotionValues, ...timeFeatures]);
      }
      
      // Get target (next day's emotions)
      const targetSession = sortedSessions[i + sequenceLength];
      target.push(
        targetSession.emotion.happy ?? 0,
        targetSession.emotion.sad ?? 0,
        targetSession.emotion.angry ?? 0,
        targetSession.emotion.anxious ?? 0,
        targetSession.emotion.calm ?? 0,
        targetSession.emotion.energetic ?? 0,
        targetSession.emotion.frustrated ?? 0
      );
      
      sequences.push(sequence);
      targets.push(target);
    }
    
    // Normalize data
    const allValues = sequences.flat(2);
    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    
    const normalizedSequences = sequences.map(seq =>
      seq.map(step => this.normalizeData(step, min, max))
    );
    
    const normalizedTargets = targets.map(target =>
      this.normalizeData(target, 0, 10) // Emotions are 0-10 scale
    );
    
    return {
      inputs: tf.tensor3d(normalizedSequences),
      outputs: tf.tensor2d(normalizedTargets),
      normalizers: { min, max }
    };
  }

  // Prepare sensory data for training
  static prepareSensoryData(sessions: MLSession[]): {
    inputs: tf.Tensor2D;
    outputs: tf.Tensor2D;
  } {
    const inputs: number[][] = [];
    const outputs: number[][] = [];
    
    sessions.forEach(session => {
      if (!session.sensory || !session.environment) return;
      
      // Input features
      const environmentFeatures = [
        session.environment.lighting === 'bright' ? 1 : session.environment.lighting === 'dim' ? 0.5 : 0,
        session.environment.noise === 'loud' ? 1 : session.environment.noise === 'moderate' ? 0.5 : 0,
        session.environment.temperature === 'hot' ? 1 : session.environment.temperature === 'cold' ? 0 : 0.5,
        session.environment.crowded === 'very' ? 1 : session.environment.crowded === 'moderate' ? 0.5 : 0,
        session.environment.smells ? 1 : 0,
        session.environment.textures ? 1 : 0
      ];
      
      const timeFeatures = this.extractTimeFeatures(new Date(session.date));
      
      inputs.push([...environmentFeatures, ...timeFeatures]);
      
      // Output features (sensory responses)
      const sensoryOutputs: number[] = [];
      ['visual', 'auditory', 'tactile', 'vestibular', 'proprioceptive'].forEach(sense => {
        const response = session.sensory[sense as keyof typeof session.sensory];
        sensoryOutputs.push(
          response === 'seeking' ? 1 : 0,    // seeking probability
          response === 'avoiding' ? 1 : 0,   // avoiding probability
          response === 'neutral' ? 1 : 0     // neutral probability
        );
      });
      
      outputs.push(sensoryOutputs);
    });
    
    return {
      inputs: tf.tensor2d(inputs),
      outputs: tf.tensor2d(outputs)
    };
  }
}

// Main ML Models class
export class MLModels {
  private storage: ModelStorage;
  private models: Map<ModelType, StoredModel>;
  private isInitialized: boolean = false;

  constructor() {
    this.storage = new ModelStorage();
    this.models = new Map();
  }

  async init(): Promise<void> {
    if (this.isInitialized) return;
    
    await this.storage.init();
    
    // Load existing models
    const modelTypes: ModelType[] = ['emotion-prediction', 'sensory-response', 'baseline-clustering'];
    for (const type of modelTypes) {
      const model = await this.storage.loadModel(type);
      if (model) {
        this.models.set(type, model);
      }
    }
    
    this.isInitialized = true;
  }

  // Create emotion prediction model
  createEmotionModel(): tf.Sequential {
    const model = tf.sequential({
      layers: [
        tf.layers.lstm({
          units: 64,
          returnSequences: true,
          inputShape: [7, 13] // 7 days, 13 features (7 emotions + 6 time features)
        }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.lstm({
          units: 32,
          returnSequences: false
        }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({
          units: 16,
          activation: 'relu'
        }),
        tf.layers.dense({
          units: 7,
          activation: 'sigmoid' // Output emotions normalized to 0-1
        })
      ]
    });
    
    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'meanSquaredError',
      metrics: ['mse', 'mae']
    });
    
    return model;
  }

  // Create sensory response model
  createSensoryModel(): tf.Sequential {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({
          units: 32,
          activation: 'relu',
          inputShape: [12] // 6 environment + 6 time features
        }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({
          units: 16,
          activation: 'relu'
        }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({
          units: 15,
          activation: 'softmax' // 5 senses × 3 responses (seeking/avoiding/neutral)
        })
      ]
    });
    
    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    });
    
    return model;
  }

  // Train emotion model
  async trainEmotionModel(
    trackingEntries: TrackingEntry[],
    epochs: number = 50,
    callbacks?: tf.CustomCallbackArgs
  ): Promise<void> {
    const sessions = DataPreprocessor.convertTrackingEntriesToSessions(trackingEntries);
    const model = this.createEmotionModel();
    const { inputs, outputs, normalizers } = DataPreprocessor.prepareEmotionData(sessions);
    
    const history = await model.fit(inputs, outputs, {
      epochs,
      batchSize: 32,
      validationSplit: 0.2,
      callbacks,
      shuffle: true
    });
    
    // Save model with metadata
    const metadata: ModelMetadata = {
      name: 'emotion-prediction',
      version: '1.0.0',
      createdAt: new Date(),
      lastTrainedAt: new Date(),
      accuracy: history.history.val_mse ? 
        history.history.val_mse[history.history.val_mse.length - 1] as number : 
        undefined,
      loss: history.history.loss[history.history.loss.length - 1] as number,
      inputShape: [7, 13],
      outputShape: [7],
      architecture: 'LSTM',
      epochs,
      dataPoints: trackingEntries.length
    };
    
    await this.storage.saveModel('emotion-prediction', model, metadata);
    this.models.set('emotion-prediction', { model, metadata });
    
    // Clean up tensors
    inputs.dispose();
    outputs.dispose();
  }

  // Train sensory model
  async trainSensoryModel(
    trackingEntries: TrackingEntry[],
    epochs: number = 50,
    callbacks?: tf.CustomCallbackArgs
  ): Promise<void> {
    const sessions = DataPreprocessor.convertTrackingEntriesToSessions(trackingEntries);
    const model = this.createSensoryModel();
    const { inputs, outputs } = DataPreprocessor.prepareSensoryData(sessions);
    
    const history = await model.fit(inputs, outputs, {
      epochs,
      batchSize: 32,
      validationSplit: 0.2,
      callbacks,
      shuffle: true
    });
    
    // Save model with metadata
    const metadata: ModelMetadata = {
      name: 'sensory-response',
      version: '1.0.0',
      createdAt: new Date(),
      lastTrainedAt: new Date(),
      accuracy: history.history.acc ? 
        history.history.acc[history.history.acc.length - 1] as number : 
        undefined,
      loss: history.history.loss[history.history.loss.length - 1] as number,
      inputShape: [12],
      outputShape: [15],
      architecture: 'Dense',
      epochs,
      dataPoints: trackingEntries.length
    };
    
    await this.storage.saveModel('sensory-response', model, metadata);
    this.models.set('sensory-response', { model, metadata });
    
    // Clean up tensors
    inputs.dispose();
    outputs.dispose();
  }

  // Predict emotions for next 7 days
  async predictEmotions(
    recentEntries: TrackingEntry[],
    daysToPredict: number = 7
  ): Promise<EmotionPrediction[]> {
    const recentSessions = DataPreprocessor.convertTrackingEntriesToSessions(recentEntries);
    const model = this.models.get('emotion-prediction');
    if (!model) {
      throw new Error('Emotion prediction model not found');
    }
    
    const predictions: EmotionPrediction[] = [];
    const currentSessions = [...recentSessions];
    
    for (let day = 0; day < daysToPredict; day++) {
      const { inputs, normalizers } = DataPreprocessor.prepareEmotionData(
        currentSessions.slice(-7),
        7
      );
      
      if (inputs.shape[0] === 0) {
        inputs.dispose();
        break;
      }
      
      const prediction = model.model.predict(inputs.slice([0, 0, 0], [1, -1, -1])) as tf.Tensor;
      const values = await prediction.array() as number[][];
      
      const predictedDate = new Date(currentSessions[currentSessions.length - 1].date);
      predictedDate.setDate(predictedDate.getDate() + 1);
      
      // Denormalize predictions
      const emotionValues = values[0].map(v => v * 10); // Convert back to 0-10 scale
      
      // Simple dispersion-based confidence: inverse of variance across outputs
      const variance = (() => {
        const mean = emotionValues.reduce((s, v) => s + v, 0) / emotionValues.length;
        const varSum = emotionValues.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / emotionValues.length;
        return varSum;
      })();
      const confidence = Math.max(0.0, Math.min(1.0, 1 / (1 + variance)));

      predictions.push({
        date: predictedDate,
        emotions: {
          happy: emotionValues[0],
          sad: emotionValues[1],
          angry: emotionValues[2],
          anxious: emotionValues[3],
          calm: emotionValues[4],
          energetic: emotionValues[5],
          frustrated: emotionValues[6]
        },
        confidence,
        confidenceInterval: {
          lower: Math.max(0, confidence - 0.1),
          upper: Math.min(1, confidence + 0.1)
        }
      });
      
      // Add prediction as a new session for next iteration
      currentSessions.push({
        id: `predicted-${day}`,
        studentId: currentSessions[0].studentId,
        date: predictedDate.toISOString(),
        emotion: {
          happy: emotionValues[0],
          sad: emotionValues[1],
          angry: emotionValues[2],
          anxious: emotionValues[3],
          calm: emotionValues[4],
          energetic: emotionValues[5],
          frustrated: emotionValues[6]
        },
        sensory: currentSessions[currentSessions.length - 1].sensory,
        environment: currentSessions[currentSessions.length - 1].environment,
        activities: [],
        notes: ''
      });
      
      // Clean up
      inputs.dispose();
      prediction.dispose();
    }
    
    return predictions;
  }

  // Predict sensory responses
  async predictSensoryResponse(
    environment: MLSession['environment'],
    date: Date
  ): Promise<SensoryPrediction> {
    const model = this.models.get('sensory-response');
    if (!model) {
      throw new Error('Sensory response model not found');
    }
    
    // Prepare input
    const environmentFeatures = [
      environment.lighting === 'bright' ? 1 : environment.lighting === 'dim' ? 0.5 : 0,
      environment.noise === 'loud' ? 1 : environment.noise === 'moderate' ? 0.5 : 0,
      environment.temperature === 'hot' ? 1 : environment.temperature === 'cold' ? 0 : 0.5,
      environment.crowded === 'very' ? 1 : environment.crowded === 'moderate' ? 0.5 : 0,
      environment.smells ? 1 : 0,
      environment.textures ? 1 : 0
    ];
    
    const timeFeatures = DataPreprocessor.extractTimeFeatures(date);
    const input = tf.tensor2d([[...environmentFeatures, ...timeFeatures]]);
    
    const prediction = model.model.predict(input) as tf.Tensor;
    const values = await prediction.array() as number[][];
    
    // Parse predictions
    const senses = ['visual', 'auditory', 'tactile', 'vestibular', 'proprioceptive'];
    const sensoryResponse: SensoryPrediction['sensoryResponse'] = {
      visual: { seeking: 0, avoiding: 0, neutral: 0 },
      auditory: { seeking: 0, avoiding: 0, neutral: 0 },
      tactile: { seeking: 0, avoiding: 0, neutral: 0 },
      vestibular: { seeking: 0, avoiding: 0, neutral: 0 },
      proprioceptive: { seeking: 0, avoiding: 0, neutral: 0 }
    };
    
    senses.forEach((sense, i) => {
      const baseIdx = i * 3;
      sensoryResponse[sense as keyof typeof sensoryResponse] = {
        seeking: values[0][baseIdx],
        avoiding: values[0][baseIdx + 1],
        neutral: values[0][baseIdx + 2]
      };
    });
    
    // Identify environmental triggers
    const triggers = [];
    if (environment.noise === 'loud' && sensoryResponse.auditory.avoiding > 0.5) {
      triggers.push({ trigger: 'Loud noise', probability: sensoryResponse.auditory.avoiding });
    }
    if (environment.lighting === 'bright' && sensoryResponse.visual.avoiding > 0.5) {
      triggers.push({ trigger: 'Bright lights', probability: sensoryResponse.visual.avoiding });
    }
    if (environment.crowded === 'very' && sensoryResponse.tactile.avoiding > 0.5) {
      triggers.push({ trigger: 'Crowded spaces', probability: sensoryResponse.tactile.avoiding });
    }
    
    // Clean up
    input.dispose();
    prediction.dispose();
    
    // Confidence heuristic: sharper softmax => higher confidence
    const flat = values[0];
    const maxP = Math.max(...flat);
    const entropy = -flat.reduce((s, p) => s + (p > 0 ? p * Math.log(p) : 0), 0);
    const normEntropy = entropy / Math.log(flat.length || 1);
    const confidence = Math.max(0, Math.min(1, (maxP * 0.6) + (1 - normEntropy) * 0.4));

    return {
      sensoryResponse,
      environmentalTriggers: triggers.sort((a, b) => b.probability - a.probability),
      confidence
    };
  }

  // Get model status
  async getModelStatus(): Promise<Map<ModelType, ModelMetadata | null>> {
    const status = new Map<ModelType, ModelMetadata | null>();
    const types: ModelType[] = ['emotion-prediction', 'sensory-response', 'baseline-clustering'];
    
    for (const type of types) {
      const model = this.models.get(type);
      status.set(type, model?.metadata || null);
    }
    
    return status;
  }

  // Delete a model
  async deleteModel(type: ModelType): Promise<void> {
    await this.storage.deleteModel(type);
    this.models.delete(type);
  }

  // Export model for external use
  async exportModel(type: ModelType, path: string): Promise<void> {
    const model = this.models.get(type);
    if (!model) {
      throw new Error(`Model ${type} not found`);
    }
    
    await model.model.save(`file://${path}`);
  }

  // Baseline clustering using K-means
  async performBaselineClustering(
    trackingEntries: TrackingEntry[],
    numClusters: number = 3
  ): Promise<BaselineCluster[]> {
    if (trackingEntries.length < numClusters) {
      throw new Error('Not enough data points for clustering');
    }

    // Extract features for clustering
    const features = trackingEntries.map(entry => {
      const avgEmotionIntensity = entry.emotions.length > 0
        ? entry.emotions.reduce((sum, e) => sum + e.intensity, 0) / entry.emotions.length
        : 0;
      
      const positiveEmotionRatio = entry.emotions.length > 0
        ? entry.emotions.filter(e => ['happy', 'calm', 'focused', 'excited'].includes(e.emotion.toLowerCase())).length / entry.emotions.length
        : 0;
      
      const sensorySeekingRatio = entry.sensoryInputs.length > 0
        ? entry.sensoryInputs.filter(s => s.response.toLowerCase().includes('seeking')).length / entry.sensoryInputs.length
        : 0;
      
      const sensoryAvoidingRatio = entry.sensoryInputs.length > 0
        ? entry.sensoryInputs.filter(s => s.response.toLowerCase().includes('avoiding')).length / entry.sensoryInputs.length
        : 0;
      
      return [
        avgEmotionIntensity / 5, // Normalize to 0-1
        positiveEmotionRatio,
        sensorySeekingRatio,
        sensoryAvoidingRatio
      ];
    });

    // Normalize features
    const normalizedFeatures = this.normalizeFeatures(features);
    
    // Perform K-means clustering
    const { centroids, assignments } = await this.kMeansClustering(normalizedFeatures, numClusters);
    
    // Calculate anomaly scores
    const clusters: BaselineCluster[] = [];
    for (let i = 0; i < numClusters; i++) {
      const clusterPoints = normalizedFeatures.filter((_, idx) => assignments[idx] === i);
      const avgDistance = clusterPoints.length > 0
        ? clusterPoints.reduce((sum, point) => sum + this.euclideanDistance(point, centroids[i]), 0) / clusterPoints.length
        : 0;
      
      // Determine cluster characteristics
      const description = this.describeCluster(centroids[i]);
      
      clusters.push({
        clusterId: i,
        centroid: centroids[i],
        description,
        anomalyScore: avgDistance,
        isNormal: avgDistance < 0.5 // Threshold for normal behavior
      });
    }
    
    return clusters;
  }

  // K-means clustering implementation
  private async kMeansClustering(
    data: number[][],
    k: number,
    maxIterations: number = 100
  ): Promise<{ centroids: number[][]; assignments: number[] }> {
    const n = data.length;
    const dimensions = data[0].length;
    
    // Initialize centroids randomly
    const centroids = this.initializeCentroids(data, k);
    const assignments = new Array(n).fill(0);
    let previousAssignments = new Array(n).fill(-1);
    
    for (let iter = 0; iter < maxIterations; iter++) {
      // Assignment step
      for (let i = 0; i < n; i++) {
        let minDistance = Infinity;
        let closestCentroid = 0;
        
        for (let j = 0; j < k; j++) {
          const distance = this.euclideanDistance(data[i], centroids[j]);
          if (distance < minDistance) {
            minDistance = distance;
            closestCentroid = j;
          }
        }
        
        assignments[i] = closestCentroid;
      }
      
      // Check for convergence
      if (assignments.every((val, idx) => val === previousAssignments[idx])) {
        break;
      }
      
      previousAssignments = [...assignments];
      
      // Update step
      for (let j = 0; j < k; j++) {
        const clusterPoints = data.filter((_, idx) => assignments[idx] === j);
        if (clusterPoints.length > 0) {
          centroids[j] = new Array(dimensions).fill(0).map((_, dim) =>
            clusterPoints.reduce((sum, point) => sum + point[dim], 0) / clusterPoints.length
          );
        }
      }
    }
    
    return { centroids, assignments };
  }

  // Initialize centroids using K-means++
  private initializeCentroids(data: number[][], k: number): number[][] {
    const centroids: number[][] = [];
    const n = data.length;
    
    // Choose first centroid randomly
    centroids.push([...data[Math.floor(Math.random() * n)]]);
    
    // Choose remaining centroids
    for (let i = 1; i < k; i++) {
      const distances = data.map(point => {
        const minDist = centroids.reduce((min, centroid) =>
          Math.min(min, this.euclideanDistance(point, centroid)), Infinity);
        return minDist * minDist;
      });
      
      // Choose next centroid with probability proportional to squared distance
      const totalDist = distances.reduce((sum, d) => sum + d, 0);
      let randomValue = Math.random() * totalDist;
      let selectedIndex = 0;
      
      for (let j = 0; j < n; j++) {
        randomValue -= distances[j];
        if (randomValue <= 0) {
          selectedIndex = j;
          break;
        }
      }
      
      centroids.push([...data[selectedIndex]]);
    }
    
    return centroids;
  }

  // Calculate Euclidean distance
  private euclideanDistance(point1: number[], point2: number[]): number {
    return Math.sqrt(
      point1.reduce((sum, val, i) => sum + Math.pow(val - point2[i], 2), 0)
    );
  }

  // Normalize features to 0-1 range
  private normalizeFeatures(features: number[][]): number[][] {
    const dimensions = features[0].length;
    const mins = new Array(dimensions).fill(Infinity);
    const maxs = new Array(dimensions).fill(-Infinity);
    
    // Find min and max for each dimension
    features.forEach(feature => {
      feature.forEach((val, i) => {
        mins[i] = Math.min(mins[i], val);
        maxs[i] = Math.max(maxs[i], val);
      });
    });
    
    // Normalize
    return features.map(feature =>
      feature.map((val, i) => {
        const range = maxs[i] - mins[i];
        return range === 0 ? 0 : (val - mins[i]) / range;
      })
    );
  }

  // Describe cluster characteristics
  private describeCluster(centroid: number[]): string {
    const [emotionIntensity, positiveRatio, seekingRatio, avoidingRatio] = centroid;
    
    let description = '';
    
    // Emotion characteristics
    if (emotionIntensity > 0.7) {
      description += 'High emotional intensity';
    } else if (emotionIntensity < 0.3) {
      description += 'Low emotional intensity';
    } else {
      description += 'Moderate emotional intensity';
    }
    
    // Emotional valence
    if (positiveRatio > 0.6) {
      description += ', predominantly positive emotions';
    } else if (positiveRatio < 0.4) {
      description += ', predominantly challenging emotions';
    } else {
      description += ', mixed emotional states';
    }
    
    // Sensory patterns
    if (seekingRatio > 0.6) {
      description += ', high sensory seeking';
    } else if (avoidingRatio > 0.6) {
      description += ', high sensory avoiding';
    } else {
      description += ', balanced sensory responses';
    }
    
    return description;
  }
}

// Singleton instance
export const mlModels = new MLModels();