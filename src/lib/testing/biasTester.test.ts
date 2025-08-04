import { describe, it, expect } from 'vitest';

type Label = 0 | 1;
type Group = 'A' | 'B';

function simulatePredictions(nPerGroup = 200, biasDelta = 0.02) {
  // Create two groups with slightly different positive rates
  const results: { group: Group; actual: Label; pred: Label }[] = [];
  const basePositive = 0.5;
  const groupAPos = basePositive;
  const groupBPos = Math.min(1, Math.max(0, basePositive + biasDelta));

  for (let i = 0; i < nPerGroup; i++) {
    const actualA: Label = Math.random() < groupAPos ? 1 : 0;
    const actualB: Label = Math.random() < groupBPos ? 1 : 0;

    // Predictor with some noise
    const predA: Label = Math.random() < (actualA ? 0.8 : 0.2) ? 1 : 0;
    const predB: Label = Math.random() < (actualB ? 0.8 : 0.2) ? 1 : 0;

    results.push({ group: 'A', actual: actualA, pred: predA });
    results.push({ group: 'B', actual: actualB, pred: predB });
  }
  return results;
}

function rates(items: { actual: Label; pred: Label }[]) {
  let tp = 0, fp = 0, tn = 0, fn = 0;
  for (const r of items) {
    if (r.pred === 1 && r.actual === 1) tp++;
    else if (r.pred === 1 && r.actual === 0) fp++;
    else if (r.pred === 0 && r.actual === 0) tn++;
    else if (r.pred === 0 && r.actual === 1) fn++;
  }
  const precision = (tp + fp) ? tp / (tp + fp) : 0;
  const recall = (tp + fn) ? tp / (tp + fn) : 0;
  const fpr = (fp + tn) ? fp / (fp + tn) : 0;
  const fnr = (fn + tp) ? fn / (fn + tp) : 0;
  return { precision, recall, fpr, fnr };
}

describe('biasTester', () => {
  it('keeps disparity between groups within acceptable delta', () => {
    const data = simulatePredictions(300, 0.01);
    const groupA = data.filter(d => d.group === 'A');
    const groupB = data.filter(d => d.group === 'B');

    const ra = rates(groupA);
    const rb = rates(groupB);

    const deltaFPR = Math.abs(ra.fpr - rb.fpr);
    const deltaFNR = Math.abs(ra.fnr - rb.fnr);

    // Acceptable disparity thresholds (tunable)
    const TOL = Number(process.env.CI_BIAS_TOL || 0.10);
    expect(deltaFPR).toBeLessThan(TOL);
    expect(deltaFNR).toBeLessThan(TOL);
  });
});