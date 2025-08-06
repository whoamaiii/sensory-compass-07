# Environmental Correlations Manual Test

## Test Setup
1. Navigate to `/environmental-correlations-test` in the application
2. The demo will generate data with a strong correlation between noise levels and anxiety

## Test Cases

### 1. UI Rendering Test
**Steps:**
1. Click on the "Correlations" tab in the Analytics Dashboard
2. Look for the "Environmental Correlations" section

**Expected Results:**
- The "Environmental Correlations" heading should be visible
- Correlation data should be displayed showing relationships between environmental factors and emotions

### 2. Correlation Data Test
**Steps:**
1. Review the correlation results displayed
2. Look for "Noise Level ↔ Emotion Intensity" correlation

**Expected Results:**
- Should show a high positive correlation (0.7 or higher)
- Description should read "Higher noise levels correlate with more intense emotions"
- Recommendations should include noise reduction strategies

### 3. Data Size Performance Test
**Steps:**
1. Click "1 Week" button to generate 7 days of data
2. Observe loading time and UI responsiveness
3. Click "30 Days" button
4. Observe loading time and UI responsiveness
5. Click "90 Days" button
6. Observe loading time and UI responsiveness

**Expected Results:**
- All data sizes should load within 2 seconds
- UI should remain responsive during analysis
- Correlation results should be consistent across data sizes

### 4. Worker vs Fallback Test
**Steps:**
1. Open browser developer tools
2. Go to Application > Service Workers
3. Check "Offline" to disable workers
4. Refresh the page
5. Navigate to correlations tab

**Expected Results:**
- Correlations should still calculate and display
- Results should be identical to worker-enabled mode

## Performance Benchmarks
- 7 days of data: < 500ms
- 30 days of data: < 1000ms
- 90 days of data: < 2000ms

## Known Patterns in Demo Data
- Morning sessions (9 AM): Low noise (1-2) correlates with calm emotions (intensity 2-3)
- Afternoon sessions (2 PM): High noise (4-5) correlates with anxious emotions (intensity 4-5)
- Expected correlation coefficient: 0.8 or higher
