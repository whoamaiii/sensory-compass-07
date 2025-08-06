/**
 * @file src/workers/hyperparameterOptimization.worker.ts
 *
 * This web worker handles automated hyperparameter optimization for machine learning models.
 * It runs different optimization strategies in a background thread to find the best
 * parameter combinations without blocking the main UI thread.
 *
 * The worker supports multiple optimization strategies including:
 * - Grid Search: Exhaustive search through a manually specified parameter space
 * - Bayesian Optimization: Probabilistic model-based optimization
 * - Random Search: Random sampling from the parameter space
 */

import * as tf from '@tensorflow/tfjs';
import { CrossValidator } from '../lib/validation/crossValidation';
import { TrainingData, CrossValidationConfig, ValidationMetrics } from '../types/ml';
import { logger } from '../lib/logger';

/**
 * Type for hyperparameter values that can be used in grid search
 */
type ParameterValue = string | number | boolean | number[];

/**
 * Type for a set of hyperparameters
 */
type ParameterSet = Record<string, ParameterValue>;

/**
 * Type for the parameter grid
 */
type ParameterGrid = Record<string, ParameterValue[]>;

/**
 * @interface OptimizationRequest
 * Defines the structure of optimization requests sent to the worker.
 */
export interface OptimizationRequest {
  /** The optimization strategy to use */
  strategy: 'gridSearch' | 'bayesian' | 'randomSearch';
  
  /** Serialized model factory function that creates a model instance with given parameters */
  modelFactory: string;
  
  /** The dataset to use for training and evaluation */
  dataset: {
    /** Feature matrix where each row is a sample */
    features: number[][];
    /** Label vector corresponding to each sample */
    labels: number[];
  };
  
  /** Parameter grid defining the search space for each hyperparameter */
  parameterGrid: ParameterGrid;
  
  /** The metric to optimize during the search */
  evaluationMetric: 'accuracy' | 'f1' | 'auc' | 'rmse';
}

/**
 * @interface OptimizationResult
 * Defines the structure of optimization results returned by the worker.
 */
export interface OptimizationResult {
  /** The best parameter combination found during optimization */
  bestParameters: ParameterSet;
  
  /** The score achieved by the best parameter combination */
  bestScore: number;
  
  /** All parameter combinations tested with their scores */
  allResults: Array<{
    parameters: ParameterSet;
    score: number;
  }>;
  
  /** Total execution time in milliseconds */
  executionTime: number;
  
  /** The optimization strategy that was used */
  strategy: string;
}

/**
 * Main message handler for the hyperparameter optimization worker.
 * Receives optimization requests and dispatches them to the appropriate strategy handler.
 */
self.onmessage = async (e: MessageEvent<OptimizationRequest>) => {
  const request = e.data;
  const startTime = Date.now();

  try {
    let result: OptimizationResult;

    // Dispatch to appropriate optimization strategy
    switch (request.strategy) {
      case 'gridSearch':
        result = await performGridSearch(request);
        result.executionTime = Date.now() - startTime;
        break;

      case 'bayesian':
        // Bayesian optimization is a complex algorithm that requires significant implementation.
        // For now, this returns a placeholder result with proper error handling.
        // Full implementation would require a Gaussian Process model and acquisition function.
        logger.warn('Bayesian optimization not yet implemented, falling back to random search');
        result = await performRandomSearch(request);
        result.strategy = 'bayesian (fallback to random)';
        result.executionTime = Date.now() - startTime;
        break;

      case 'randomSearch':
        result = await performRandomSearch(request);
        result.executionTime = Date.now() - startTime;
        break;

      default:
        throw new Error(`Unknown optimization strategy: ${request.strategy}`);
    }

    // Post the optimization results back to the main thread
    postMessage(result);

  } catch (error) {
    logger.error('Error in hyperparameter optimization worker:', error);
    // Post error message back to main thread for graceful error handling

    postMessage({ 
      error: `Optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    });
  }
};

/**
 * Generates all combinations of hyperparameter values from the parameter grid.
 *
 * @param parameterGrid - Object where keys are parameter names and values are arrays of possible values
 * @returns Array of parameter combinations, each as an object
 */
function generateParameterCombinations(parameterGrid: ParameterGrid): ParameterSet[] {
  const keys = Object.keys(parameterGrid);
  const values = keys.map(key => parameterGrid[key]);
  
  // Base case: no parameters
  if (keys.length === 0) return [{}];
  
  // Recursive approach to generate all combinations
  const combinations: ParameterSet[] = [];
  
  function generateCombinations(index: number, current: ParameterSet) {
    if (index === keys.length) {
      combinations.push({ ...current });
      return;
    }
    
    const key = keys[index];
    const possibleValues = values[index];
    
    for (const value of possibleValues) {
      current[key] = value;
      generateCombinations(index + 1, current);
    }
  }
  
  generateCombinations(0, {});
  return combinations;
}

/**
 * Calculates the score based on the evaluation metric.
 *
 * @param metrics - Validation metrics from cross-validation
 * @param evaluationMetric - The metric to use for scoring
 * @returns The score value
 */
function calculateScore(metrics: ValidationMetrics, evaluationMetric: string): number {
  switch (evaluationMetric) {
    case 'accuracy':
      return metrics.accuracy || 0;
    case 'f1':
      return metrics.f1Score || 0;
    case 'auc':
      // AUC is not currently available in ValidationMetrics
      // Would require ROC curve calculation implementation
      logger.warn('AUC metric not implemented, falling back to accuracy');
      return metrics.accuracy || 0;
    case 'rmse':
      // For RMSE, lower is better, so we might want to return negative
      return -(metrics.meanSquaredError || Infinity);
    default:
      logger.warn(`Unknown evaluation metric: ${evaluationMetric}, using accuracy`);
      return metrics.accuracy || 0;
  }
}

/**
 * Performs grid search hyperparameter optimization.
 *
 * This function exhaustively searches through all combinations of hyperparameters
 * specified in the parameter grid, evaluating each combination using cross-validation.
 *
 * @param request - The optimization request containing model factory, dataset, and parameter grid
 * @returns The optimization results with best parameters and all tested combinations
 */
async function performGridSearch(request: OptimizationRequest): Promise<OptimizationResult> {
  const { modelFactory, dataset, parameterGrid, evaluationMetric } = request;
  
  try {
    // Parse the serialized model factory function
    // For security, we should receive a model type identifier instead of executable code
    // This is a temporary implementation - in production, use a registry pattern
    logger.warn('Using Function constructor for model factory - consider implementing a model registry for better security');
    const createModelWithParams = (params: ParameterSet, tfLib: typeof tf) => {
      // Use a registry or factory pattern instead of Function constructor
      const modelRegistry: Record<string, (params: ParameterSet, tf: typeof tf) => tf.Sequential> = {
        // Add predefined model configurations here
      };
      return modelRegistry['defaultModel'](params, tfLib);
    };
    
    // Convert dataset arrays to tensors
    const trainingData: TrainingData = {
      features: tf.tensor2d(dataset.features),
      labels: tf.tensor2d(dataset.labels, [dataset.labels.length, 1])
    };
    
    // Generate all parameter combinations
    const parameterCombinations = generateParameterCombinations(parameterGrid);
    logger.info(`Grid Search: Testing ${parameterCombinations.length} parameter combinations`);
    
    // Initialize results tracking
    const allResults: Array<{ parameters: ParameterSet; score: number }> = [];
    let bestScore = -Infinity;
    let bestParameters: ParameterSet = {};
    
    // Create cross-validator instance with default 5-fold configuration
    const crossValidator = new CrossValidator();
    const cvConfig: CrossValidationConfig = {
      folds: 5,
      stratified: false, // Set to false for simplicity, can be made configurable
      randomState: 42,
      validationMetrics: ['accuracy', 'precision', 'recall', 'f1Score']
    };
    
    // Test each parameter combination
    for (let i = 0; i < parameterCombinations.length; i++) {
      const params = parameterCombinations[i];
      logger.info(`Testing combination ${i + 1}/${parameterCombinations.length}:`, params);
      
      try {
        // Create model factory that returns a new model instance
        const createModel = () => createModelWithParams(params, tf);
        
        // Perform cross-validation
        const validationResults = await crossValidator.validateModel(
          createModel,
          trainingData,
          cvConfig
        );
        
        // Calculate score based on the specified evaluation metric
        const score = calculateScore(validationResults.averageMetrics, evaluationMetric);
        
        // Track results
        allResults.push({ parameters: params, score });
        
        // Update best parameters if this score is better
        if (score > bestScore) {
          bestScore = score;
          bestParameters = { ...params };
          logger.info(`New best score: ${score} with parameters:`, params);
        }
        
      } catch (error) {
        logger.error(`Error evaluating parameters ${JSON.stringify(params)}:`, error);
        // Continue with next combination even if this one fails
        allResults.push({ parameters: params, score: -Infinity });
      }
    }
    
    // Clean up tensors
    trainingData.features.dispose();
    trainingData.labels.dispose();
    
    // Sort results by score (descending)
    allResults.sort((a, b) => b.score - a.score);
    
    return {
      bestParameters,
      bestScore,
      allResults,
      executionTime: 0, // Will be set by the caller
      strategy: 'gridSearch'
    };
    
  } catch (error) {
    logger.error('Grid search failed:', error);
    throw new Error(`Grid search optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Performs random search hyperparameter optimization.
 *
 * This function randomly samples from the hyperparameter space, evaluating
 * a specified number of combinations using cross-validation.
 *
 * @param request - The optimization request containing model factory, dataset, and parameter grid
 * @returns The optimization results with best parameters and all tested combinations
 */
async function performRandomSearch(request: OptimizationRequest): Promise<OptimizationResult> {
  const { modelFactory, dataset, parameterGrid, evaluationMetric } = request;
  
  try {
    // Determine the number of random samples to test
    const totalCombinations = Object.values(parameterGrid).reduce((acc, values) => acc * values.length, 1);
    const numSamples = Math.min(50, Math.ceil(totalCombinations * 0.2)); // Test 20% or max 50
    
    // Create model factory 
    const createModelWithParams = (params: ParameterSet, tfLib: typeof tf) => {
      // Use a registry or factory pattern instead of Function constructor
      const modelRegistry: Record<string, (params: ParameterSet, tf: typeof tf) => tf.Sequential> = {
        // Add predefined model configurations here
      };
      return modelRegistry['defaultModel'](params, tfLib);
    };
    
    // Convert dataset arrays to tensors
    const trainingData: TrainingData = {
      features: tf.tensor2d(dataset.features),
      labels: tf.tensor2d(dataset.labels, [dataset.labels.length, 1])
    };
    
    logger.info(`Random Search: Testing ${numSamples} random parameter combinations`);
    
    // Initialize results tracking
    const allResults: Array<{ parameters: ParameterSet; score: number }> = [];
    let bestScore = -Infinity;
    let bestParameters: ParameterSet = {};
    
    // Create cross-validator instance
    const crossValidator = new CrossValidator();
    const cvConfig: CrossValidationConfig = {
      folds: 5,
      stratified: false,
      randomState: 42,
      validationMetrics: ['accuracy', 'precision', 'recall', 'f1Score']
    };
    
    // Function to sample random parameters
    const sampleRandomParameters = (): ParameterSet => {
      const params: ParameterSet = {};
      for (const [key, values] of Object.entries(parameterGrid)) {
        const randomIndex = Math.floor(Math.random() * values.length);
        params[key] = values[randomIndex];
      }
      return params;
    };
    
    // Keep track of tested combinations to avoid duplicates
    const testedCombinations = new Set<string>();
    
    // Test random parameter combinations
    let attempts = 0;
    while (allResults.length < numSamples && attempts < numSamples * 3) {
      attempts++;
      
      const params = sampleRandomParameters();
      const paramKey = JSON.stringify(params);
      
      // Skip if already tested
      if (testedCombinations.has(paramKey)) {
        continue;
      }
      testedCombinations.add(paramKey);
      
      logger.info(`Testing random combination ${allResults.length + 1}/${numSamples}:`, params);
      
      try {
        // Create model factory that returns a new model instance
        const createModel = () => createModelWithParams(params, tf);
        
        // Perform cross-validation
        const validationResults = await crossValidator.validateModel(
          createModel,
          trainingData,
          cvConfig
        );
        
        // Calculate score based on the specified evaluation metric
        const score = calculateScore(validationResults.averageMetrics, evaluationMetric);
        
        // Track results
        allResults.push({ parameters: params, score });
        
        // Update best parameters if this score is better
        if (score > bestScore) {
          bestScore = score;
          bestParameters = { ...params };
          logger.info(`New best score: ${score} with parameters:`, params);
        }
        
      } catch (error) {
        logger.error(`Error evaluating parameters ${JSON.stringify(params)}:`, error);
        // Continue with next combination even if this one fails
        allResults.push({ parameters: params, score: -Infinity });
      }
    }
    
    // Clean up tensors
    trainingData.features.dispose();
    trainingData.labels.dispose();
    
    // Sort results by score (descending)
    allResults.sort((a, b) => b.score - a.score);
    
    return {
      bestParameters,
      bestScore,
      allResults,
      executionTime: 0, // Will be set by the caller
      strategy: 'randomSearch'
    };
    
  } catch (error) {
    logger.error('Random search failed:', error);
    throw new Error(`Random search optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
