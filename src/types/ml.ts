/**
 * @file Defines types related to Machine Learning, including training data structures.
 */

import * as tf from '@tensorflow/tfjs';

/**
 * Represents the structure for training data used by ML models.
 */
export interface TrainingData {
  /**
   * A 2D or 3D tensor of features for training.
   * Shape: [num_samples, num_features] or [num_samples, sequence_length, num_features]
   */
  features: tf.Tensor2D | tf.Tensor3D;

  /**
   * A 1D or 2D tensor of labels corresponding to the features.
   * Shape: [num_samples] or [num_samples, num_labels]
   */
  labels: tf.Tensor;

  /**
   * Optional array of student IDs corresponding to each sample.
   */
  studentIds?: string[];

  /**
   * Optional array of timestamps for each sample.
   */
  timestamps?: Date[];
}
/**
 * A container for performance metrics calculated on a validation set.
 */
export interface ValidationMetrics {
  /** The accuracy of the model. */
  accuracy?: number;
  /** The precision score. */
  precision?: number;
  /** The recall score. */
  recall?: number;
  /** The F1-score. */
  f1Score?: number;
  /** The mean squared error for regression tasks. */
  meanSquaredError?: number;
  /** Optional confusion matrix for binary classification {0,1}. */
  confusionMatrix?: { tp: number; tn: number; fp: number; fn: number };
}

/**
 * Represents a single fold in the cross-validation process,
 * containing indices for the training and validation sets.
 */
export interface TrainingFold {
  /** Array of indices for the training data subset. */
  trainIndices: number[];
  /** Array of indices for the validation data subset. */
  validationIndices: number[];
}

/**
 * The final aggregated results from all folds of the cross-validation process.
 */
export interface ValidationResults {
  /** An array of metrics, one for each fold. */
  foldMetrics: ValidationMetrics[];
  /** The average metrics across all folds. */
  averageMetrics: ValidationMetrics;
  /** The standard deviation of the metrics across all folds. */
  stdDeviationMetrics: ValidationMetrics;
  /** Summed confusion matrix across all folds (binary classification only). */
  overallConfusionMatrix?: { tp: number; tn: number; fp: number; fn: number };
  /** Precision/Recall/F1 recomputed from overallConfusionMatrix for reporting. */
  overallPRF1?: { precision: number; recall: number; f1Score: number; accuracy: number };
}
/**
 * Configuration for the cross-validation process.
 */
export interface CrossValidationConfig {
  /**
   * The number of folds to use for cross-validation.
   * @default 5
   */
  folds: number;

  /**
   * Whether to use stratified sampling to maintain class distribution.
   * @default true
   */
  stratified: boolean;

  /**
   * A seed for the random number generator to ensure reproducibility.
   */
  randomState: number;

  /**
   * The performance metrics to calculate during validation.
   * @example ['accuracy', 'precision', 'recall', 'f1']
   */
  validationMetrics: string[];
}