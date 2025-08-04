/**
 * @file Defines the core interfaces and types for the cross-validation framework.
 */

import * as tf from '@tensorflow/tfjs';
import { TrainingData, ValidationResults, ValidationMetrics, TrainingFold, CrossValidationConfig } from '../../types/ml';

/**
 * Handles the K-Fold Cross-Validation process for a TensorFlow.js model.
 */
export class CrossValidator {
  /**
   * Orchestrates the entire k-fold cross-validation process.
   * @param model - The TensorFlow.js model to be validated.
   * @param data - The full training dataset.
   * @param config - The configuration for the cross-validation process.
   * @returns The aggregated results of the cross-validation.
   */
  public async validateModel(
    createModel: () => tf.Sequential,
    data: TrainingData,
    config: CrossValidationConfig
  ): Promise<ValidationResults> {
    const folds = await this.generateFolds(data, config.folds, config.stratified);
    const foldMetrics: ValidationMetrics[] = [];

    for (const fold of folds) {
      const { trainIndices, validationIndices } = fold;
      
      const trainFeatures = tf.gather(data.features, trainIndices);
      const trainLabels = tf.gather(data.labels, trainIndices);
      const valFeatures = tf.gather(data.features, validationIndices);
      const valLabels = tf.gather(data.labels, validationIndices);

      const model = createModel(); // Create a fresh model for each fold
      
      await model.fit(trainFeatures, trainLabels, {
        epochs: 5, // This should be configurable
        batchSize: 32, // This should be configurable
        verbose: 0,
      });

      const predictionsTensor = model.predict(valFeatures) as tf.Tensor;
      const predictions = Array.from(await predictionsTensor.argMax(1).data() as unknown as Iterable<number>);
      const actuals = Array.from(await valLabels.argMax(1).data() as unknown as Iterable<number>);

      const metrics = this.calculateValidationMetrics(predictions, actuals);
      foldMetrics.push(metrics);

      tf.dispose([trainFeatures, trainLabels, valFeatures, valLabels, predictionsTensor]);
      model.dispose(); // Correct way to dispose a model
    }
    
    // Aggregate results
    const averageMetrics = this.aggregateMetrics(foldMetrics, (arr) => tf.mean(arr).dataSync()[0]);
    const stdDeviationMetrics = this.aggregateMetrics(foldMetrics, (arr) => tf.moments(arr).variance.sqrt().dataSync()[0]);

    // Aggregate confusion matrices across folds (binary only) and recompute PR/F1/accuracy
    let overallConfusionMatrix: { tp: number; tn: number; fp: number; fn: number } | undefined;
    let overallPRF1: { precision: number; recall: number; f1Score: number; accuracy: number } | undefined;

    const matrices = foldMetrics
      .map(m => m.confusionMatrix)
      .filter((cm): cm is { tp: number; tn: number; fp: number; fn: number } => !!cm);

    if (matrices.length > 0) {
      const sum = matrices.reduce((acc, cm) => ({
        tp: acc.tp + cm.tp,
        tn: acc.tn + cm.tn,
        fp: acc.fp + cm.fp,
        fn: acc.fn + cm.fn,
      }), { tp: 0, tn: 0, fp: 0, fn: 0 });

      overallConfusionMatrix = sum;
      const precDen = sum.tp + sum.fp;
      const recDen = sum.tp + sum.fn;
      const precision = precDen === 0 ? 0 : sum.tp / precDen;
      const recall = recDen === 0 ? 0 : sum.tp / recDen;
      const f1Den = precision + recall;
      const f1Score = f1Den === 0 ? 0 : (2 * precision * recall) / f1Den;
      const total = sum.tp + sum.tn + sum.fp + sum.fn;
      const accuracy = total === 0 ? 0 : (sum.tp + sum.tn) / total;
      overallPRF1 = { precision, recall, f1Score, accuracy };
    }

    return { foldMetrics, averageMetrics, stdDeviationMetrics, overallConfusionMatrix, overallPRF1 };
  }

  /**
   * Splits the dataset into k-folds for training and validation.
   * Can perform stratified sampling if configured.
   * @param data - The training dataset.
   * @param k - The number of folds.
   * @returns An array of TrainingFold objects.
   */
  public async generateFolds(data: TrainingData, k: number, stratified: boolean = false): Promise<TrainingFold[]> {
    const numSamples = data.features.shape[0];
    const indices = tf.util.createShuffledIndices(numSamples);

    if (!stratified) {
      const foldSize = Math.floor(numSamples / k);
      const folds: TrainingFold[] = [];

      for (let i = 0; i < k; i++) {
        const validationIndices = Array.from(indices.slice(i * foldSize, (i + 1) * foldSize)) as number[];
        const trainIndices = (Array.from(indices) as number[]).filter(index => !validationIndices.includes(index));
        folds.push({ trainIndices, validationIndices });
      }
      return folds;
    }

    // Stratified K-Fold
    const labels = await data.labels.data();
    const classIndices: { [key: number]: number[] } = {};

    for (let i = 0; i < numSamples; i++) {
      const label = labels[i];
      if (!classIndices[label]) {
        classIndices[label] = [];
      }
      classIndices[label].push(i);
    }

    const folds: TrainingFold[] = Array.from({ length: k }, () => ({ trainIndices: [], validationIndices: [] }));

    for (const label in classIndices) {
      const indicesForClass = tf.util.createShuffledIndices(classIndices[label].length);
      const shuffledClassIndices = classIndices[label].map((_, i) => classIndices[label][indicesForClass[i]]);
      
      for (let i = 0; i < shuffledClassIndices.length; i++) {
        const foldIndex = i % k;
        folds[foldIndex].validationIndices.push(shuffledClassIndices[i]);
      }
    }

    for (let i = 0; i < k; i++) {
      const validationIndices = folds[i].validationIndices;
      const allIndices = Array.from({ length: numSamples }, (_, i) => i);
      folds[i].trainIndices = allIndices.filter(index => !validationIndices.includes(index));
    }

    return folds;
  }

  /**
   * Calculates a set of performance metrics from predictions and actual values.
   * @param predictions - The model's predictions.
   * @param actuals - The true labels.
   * @returns A ValidationMetrics object.
   */
  public calculateValidationMetrics(predictions: number[], actuals: number[]): ValidationMetrics {
    if (predictions.length !== actuals.length) {
      throw new Error('Predictions and actuals must have the same length.');
    }

    const n = actuals.length;
    const correct = predictions.filter((p, i) => p === actuals[i]).length;
    const accuracy = correct / n;

    // Binary metrics when labels are {0,1}
    const uniqueLabels = Array.from(new Set([...predictions, ...actuals]));
    if (uniqueLabels.every(l => l === 0 || l === 1)) {
      let tp = 0, tn = 0, fp = 0, fn = 0;
      for (let i = 0; i < n; i++) {
        const p = predictions[i];
        const a = actuals[i];
        if (p === 1 && a === 1) tp++;
        else if (p === 0 && a === 0) tn++;
        else if (p === 1 && a === 0) fp++;
        else if (p === 0 && a === 1) fn++;
      }
      const precision = (tp + fp) === 0 ? 0 : tp / (tp + fp);
      const recall = (tp + fn) === 0 ? 0 : tp / (tp + fn);
      const f1Score = (precision + recall) === 0 ? 0 : (2 * precision * recall) / (precision + recall);
      return { accuracy, precision, recall, f1Score, confusionMatrix: { tp, tn, fp, fn } };
    }

    // Multi-class fallback: accuracy only for now
    return { accuracy };
  }

  private aggregateMetrics(foldMetrics: ValidationMetrics[], aggFn: (arr: number[]) => number): ValidationMetrics {
    const aggregated: ValidationMetrics = {};
    const metricKeys = Object.keys(foldMetrics[0]) as (keyof ValidationMetrics)[];

    for (const key of metricKeys) {
      if (key === 'confusionMatrix') {
        // Do not average confusion matrices; keep them at fold level if needed.
        continue;
      }
      const values = foldMetrics
        .map(m => m[key])
        .filter((v): v is number => typeof v === 'number');
      if (values.length > 0) {
        aggregated[key] = aggFn(values);
      }
    }
    return aggregated;
  }
}