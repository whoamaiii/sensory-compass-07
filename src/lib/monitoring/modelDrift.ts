import * as tf from '@tensorflow/tfjs';
import { logger } from '@/lib/logger';

/**
 * Configuration options for model drift detection
 * 
 * @interface DriftConfig
 * @description Defines parameters used to configure the drift detection algorithm.
 * This interface allows customization of detection sensitivity and methodology.
 */
export interface DriftConfig {
  /**
   * The threshold value above which drift is considered detected
   * @description A value between 0 and 1, where higher values require more significant drift for detection
   * @default 0.3
   */
  threshold: number;
  
  /**
   * The method used for calculating drift
   * @description Specifies the statistical method for measuring distribution divergence
   * @example 'kl_divergence', 'js_divergence', 'wasserstein', 'chi_squared'
   */
  method: 'kl_divergence' | 'js_divergence' | 'wasserstein' | 'chi_squared';
  
  /**
   * Number of bins to use for histogram-based methods
   * @description Used when discretizing continuous data for divergence calculations
   * @default 50
   */
  bins?: number;
  
  /**
   * Whether to normalize the data before drift detection
   * @description Normalizing can help when comparing datasets with different scales
   * @default true
   */
  normalize?: boolean;
  
  /**
   * Confidence level for statistical tests (if applicable)
   * @description Used for methods that perform hypothesis testing
   * @default 0.95
   */
  confidenceLevel?: number;
}

/**
 * Result of a drift detection analysis
 * 
 * @interface DriftResult
 * @description Contains the outcome of drift detection including the divergence score,
 * detection status, timestamp, and optional detailed information about the analysis.
 */
export interface DriftResult {
  /**
   * The calculated divergence score between distributions
   * @description A numerical measure of how different the new data distribution is
   * from the reference distribution. Higher values indicate greater drift.
   */
  divergenceScore: number;
  
  /**
   * Whether drift has been detected based on the configured threshold
   * @description True if divergenceScore exceeds the configured threshold
   */
  isDriftDetected: boolean;
  
  /**
   * The timestamp when the drift detection was performed
   * @description Records when this analysis was conducted for tracking drift over time
   */
  timestamp: Date;
  
  /**
   * Optional detailed information about the drift detection
   * @description May include information about which features contributed most to drift,
   * statistical test results, or other diagnostic information
   */
  details?: string;
}

/**
 * Model Drift Detector class for monitoring distribution shifts in model inputs
 * 
 * @class ModelDriftDetector
 * @description Implements various statistical methods to detect when the distribution
 * of new data significantly differs from a reference distribution. This is crucial
 * for identifying when a model may need retraining or when data quality issues arise.
 * 
 * @example
 * ```typescript
 * const detector = new ModelDriftDetector(config);
 * const result = await detector.detect(newDataTensor, referenceDataTensor);
 * if (result.isDriftDetected) {
 *   logger.info(`Drift detected with score: ${result.divergenceScore}`);
 * }
 * ```
 */
export class ModelDriftDetector {
  private config: DriftConfig;

  /**
   * Creates an instance of ModelDriftDetector
   *
   * @constructor
   * @param {DriftConfig} config - Configuration options for drift detection
   */
  constructor(config: DriftConfig) {
    this.config = {
      bins: 50,
      normalize: true,
      confidenceLevel: 0.95,
      ...config
    };
  }

  /**
   * Detects drift between new data and reference data distributions
   *
   * @method detect
   * @async
   * @param {tf.Tensor} newData - The new data tensor to check for drift
   * @param {tf.Tensor} referenceData - The reference data tensor representing the expected distribution
   * @returns {Promise<DriftResult>} A promise that resolves to a DriftResult object containing
   * the divergence score, detection status, timestamp, and optional details
   *
   * @description This method compares the statistical distributions of the new data
   * against the reference data using KL divergence. The implementation handles
   * data preprocessing, distribution calculation, divergence measurement, and threshold
   * comparison to determine if significant drift has occurred.
   *
   * The KL divergence is calculated as: KL(P||Q) = Σ P(i) * log(P(i)/Q(i))
   * where P is the new data distribution and Q is the reference distribution.
   */
  public async detect(newData: tf.Tensor, referenceData: tf.Tensor): Promise<DriftResult> {
    try {
      // Validate inputs
      if (!newData || !referenceData) {
        throw new Error('Both newData and referenceData tensors are required');
      }

      // Check for empty tensors
      const newDataSize = newData.size;
      const referenceDataSize = referenceData.size;
      
      if (newDataSize === 0 || referenceDataSize === 0) {
        throw new Error('Cannot detect drift on empty tensors');
      }

      // Flatten tensors to 1D for distribution calculation
      const flatNewData = newData.flatten();
      const flatReferenceData = referenceData.flatten();

      // Normalize data if configured
      let processedNewData: tf.Tensor1D = flatNewData;
      let processedReferenceData: tf.Tensor1D = flatReferenceData;

      if (this.config.normalize) {
        processedNewData = await this.normalizeData(flatNewData) as tf.Tensor1D;
        processedReferenceData = await this.normalizeData(flatReferenceData) as tf.Tensor1D;
      }

      // Calculate distributions using histogram binning
      const [newDataDist, refDataDist] = await this.calculateDistributions(
        processedNewData,
        processedReferenceData
      );

      // Calculate KL divergence
      const divergenceScore = await this.calculateKLDivergence(newDataDist, refDataDist);

      // Determine if drift is detected
      const isDriftDetected = divergenceScore > this.config.threshold;

      // Clean up tensors
      flatNewData.dispose();
      flatReferenceData.dispose();
      if (this.config.normalize) {
        processedNewData.dispose();
        processedReferenceData.dispose();
      }
      newDataDist.dispose();
      refDataDist.dispose();

      // Create result
      const result: DriftResult = {
        divergenceScore,
        isDriftDetected,
        timestamp: new Date(),
        details: `KL divergence: ${divergenceScore.toFixed(4)}, Threshold: ${this.config.threshold}, Drift detected: ${isDriftDetected ? 'Yes' : 'No'}`
      };

      return result;
    } catch (error) {
      throw new Error(`Drift detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Normalizes data to have zero mean and unit variance
   *
   * @private
   * @param {tf.Tensor} data - The tensor to normalize
   * @returns {Promise<tf.Tensor>} The normalized tensor
   */
  private async normalizeData(data: tf.Tensor): Promise<tf.Tensor> {
    const mean = data.mean();
    const std = tf.moments(data).variance.sqrt();
    
    // Add small epsilon to avoid division by zero
    const epsilon = 1e-10;
    const normalizedData = data.sub(mean).div(std.add(epsilon));
    
    mean.dispose();
    std.dispose();
    
    return normalizedData;
  }

  /**
   * Calculates probability distributions for both datasets using histogram binning
   *
   * @private
   * @param {tf.Tensor} newData - The new data tensor
   * @param {tf.Tensor} referenceData - The reference data tensor
   * @returns {Promise<[tf.Tensor, tf.Tensor]>} Tuple of probability distributions
   */
  private async calculateDistributions(
    newData: tf.Tensor,
    referenceData: tf.Tensor
  ): Promise<[tf.Tensor, tf.Tensor]> {
    const bins = this.config.bins || 50;

    // Combine data to get consistent bin edges
    const combinedData = tf.concat([newData, referenceData]);
    const minVal = await combinedData.min().array() as number;
    const maxVal = await combinedData.max().array() as number;
    combinedData.dispose();

    // Create bin edges
    const binWidth = (maxVal - minVal) / bins;
    const binEdges = Array.from({ length: bins + 1 }, (_, i) => minVal + i * binWidth);

    // Calculate histograms
    const newDataHist = await this.calculateHistogram(newData, binEdges);
    const refDataHist = await this.calculateHistogram(referenceData, binEdges);

    // Convert to probability distributions
    const newDataDist = this.histogramToProbability(newDataHist);
    const refDataDist = this.histogramToProbability(refDataHist);

    newDataHist.dispose();
    refDataHist.dispose();

    return [newDataDist, refDataDist];
  }

  /**
   * Calculates histogram for given data and bin edges
   *
   * @private
   * @param {tf.Tensor} data - The data tensor
   * @param {number[]} binEdges - Array of bin edge values
   * @returns {Promise<tf.Tensor>} The histogram counts
   */
  private async calculateHistogram(data: tf.Tensor, binEdges: number[]): Promise<tf.Tensor> {
    const dataArray = await data.array() as number[];
    const bins = binEdges.length - 1;
    const histogram = new Float32Array(bins);

    // Count values in each bin
    for (const value of dataArray) {
      let binIndex = Math.floor((value - binEdges[0]) / (binEdges[binEdges.length - 1] - binEdges[0]) * bins);
      binIndex = Math.max(0, Math.min(bins - 1, binIndex));
      histogram[binIndex]++;
    }

    return tf.tensor1d(histogram);
  }

  /**
   * Converts histogram counts to probability distribution
   *
   * @private
   * @param {tf.Tensor} histogram - The histogram counts
   * @returns {tf.Tensor} The probability distribution
   */
  private histogramToProbability(histogram: tf.Tensor): tf.Tensor {
    const sum = histogram.sum();
    // Add small epsilon to avoid division by zero
    const epsilon = 1e-10;
    return histogram.div(sum.add(epsilon));
  }

  /**
   * Calculates KL divergence between two probability distributions
   * KL(P||Q) = Σ P(i) * log(P(i)/Q(i))
   *
   * @private
   * @param {tf.Tensor} p - The new data distribution (P)
   * @param {tf.Tensor} q - The reference distribution (Q)
   * @returns {Promise<number>} The KL divergence value
   */
  private async calculateKLDivergence(p: tf.Tensor, q: tf.Tensor): Promise<number> {
    // Add small epsilon to avoid log(0) and division by zero
    const epsilon = 1e-10;
    
    // Calculate KL divergence: P(i) * log(P(i)/Q(i))
    const pSafe = p.add(epsilon);
    const qSafe = q.add(epsilon);
    
    const ratio = pSafe.div(qSafe);
    const logRatio = ratio.log();
    const klTerms = pSafe.mul(logRatio);
    const klDivergence = klTerms.sum();

    const result = await klDivergence.array() as number;

    // Clean up intermediate tensors
    pSafe.dispose();
    qSafe.dispose();
    ratio.dispose();
    logRatio.dispose();
    klTerms.dispose();
    klDivergence.dispose();

    return result;
  }
}