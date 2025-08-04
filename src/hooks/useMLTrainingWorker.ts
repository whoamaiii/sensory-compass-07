import { useRef, useCallback, useState } from 'react';
import { TrackingEntry } from '@/types/student';
import { ModelType, mlModels } from '@/lib/mlModels';
import MLTrainingWorker from '@/workers/mlTraining.worker?worker';
import type { TrainingRequest, TrainingProgress, TrainingResult } from '@/workers/mlTraining.worker';
import { logger } from '@/lib/logger';

interface TrainingStatus {
  isTraining: boolean;
  modelType?: ModelType;
  progress?: number;
  epoch?: number;
  totalEpochs?: number;
  loss?: number;
  accuracy?: number;
  error?: string;
}

interface UseMLTrainingWorkerReturn {
  trainModel: (
    modelType: ModelType,
    trackingEntries: TrackingEntry[],
    options?: { epochs?: number; batchSize?: number }
  ) => Promise<void>;
  trainingStatus: TrainingStatus;
  cancelTraining: () => void;
}

export const useMLTrainingWorker = (): UseMLTrainingWorkerReturn => {
  const workerRef = useRef<Worker | null>(null);
  const [trainingStatus, setTrainingStatus] = useState<TrainingStatus>({
    isTraining: false
  });

  const createWorker = useCallback(() => {
    // Terminate any existing worker before creating a new one to avoid leaks
    if (workerRef.current) {
      try {
        workerRef.current.terminate();
      } catch {
        // ignore
      }
      workerRef.current = null;
    }

    const worker = new MLTrainingWorker();

    worker.onmessage = async (e: MessageEvent<TrainingProgress | TrainingResult>) => {
      const message = e.data;

      if (message.type === 'progress') {
        const safeTotal = Math.max(1, message.totalEpochs || 1);
        const clampedEpoch = Math.min(message.epoch ?? 0, safeTotal);
        setTrainingStatus(prev => ({
          ...prev,
          epoch: clampedEpoch,
          totalEpochs: safeTotal,
          loss: message.loss,
          accuracy: message.accuracy,
          progress: (clampedEpoch / safeTotal) * 100
        }));
      } else if (message.type === 'complete') {
        try {
          await mlModels.init();
          setTrainingStatus({
            isTraining: false,
            modelType: message.modelType,
            progress: 100
          });
        } catch (error) {
          logger.error('Failed to save trained model:', error);
          setTrainingStatus({
            isTraining: false,
            error: 'Failed to save trained model'
          });
        }
      } else if (message.type === 'error') {
        setTrainingStatus({
          isTraining: false,
          error: message.error
        });
      }
    };

    worker.onerror = (error) => {
      logger.error('ML training worker error:', error);
      setTrainingStatus({
        isTraining: false,
        error: 'Training worker encountered an error'
      });
    };

    workerRef.current = worker;
    return worker;
  }, []);

  const trainModel = useCallback(async (
    modelType: ModelType,
    trackingEntries: TrackingEntry[],
    options?: { epochs?: number; batchSize?: number }
  ): Promise<void> => {
    // Create or reuse worker
    const worker = workerRef.current || createWorker();

    // Set training status
    setTrainingStatus({
      isTraining: true,
      modelType,
      progress: 0,
      epoch: 0,
      totalEpochs: options?.epochs || 50
    });

    // Prepare training request
    let trainingType: TrainingRequest['type'];
    switch (modelType) {
      case 'emotion-prediction':
        trainingType = 'train-emotion';
        break;
      case 'sensory-response':
        trainingType = 'train-sensory';
        break;
      case 'baseline-clustering':
        trainingType = 'train-baseline';
        break;
      default:
        throw new Error(`Unknown model type: ${modelType}`);
    }

    const request: TrainingRequest = {
      type: trainingType,
      data: {
        trackingEntries
      },
      config: {
        epochs: options?.epochs ?? 50,
        batchSize: options?.batchSize ?? 32
      }
    };

    // Send training request to worker
    worker.postMessage(request);
  }, [createWorker]);

  const cancelTraining = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
      setTrainingStatus({
        isTraining: false,
        error: 'Training cancelled'
      });
    }
  }, []);

  return {
    trainModel,
    trainingStatus,
    cancelTraining
  };
};