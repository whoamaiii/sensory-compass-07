/**
 * Centralized chart color system using Tailwind-compatible approach
 * Maps semantic colors to Tailwind classes and CSS variables
 */

// Define semantic color mappings that align with Tailwind theme
export const CHART_COLORS = {
  // Primary data series colors
  emotion: {
    className: 'stroke-green-500 fill-green-500',
    cssVar: 'var(--color-green-500, #10B981)',
    hex: '#10B981' // Fallback only
  },
  sensory: {
    className: 'stroke-blue-500 fill-blue-500',
    cssVar: 'var(--color-blue-500, #3B82F6)',
    hex: '#3B82F6'
  },
  anomaly: {
    high: {
      className: 'stroke-red-500 fill-red-500',
      cssVar: 'var(--color-red-500, #EF4444)',
      hex: '#EF4444'
    },
    medium: {
      className: 'stroke-amber-500 fill-amber-500',
      cssVar: 'var(--color-amber-500, #F59E0B)',
      hex: '#F59E0B'
    },
    low: {
      className: 'stroke-yellow-400 fill-yellow-400',
      cssVar: 'var(--color-yellow-400, #FCD34D)',
      hex: '#FCD34D'
    }
  },
  // Grid and labels
  grid: {
    line: {
      className: 'stroke-gray-200 dark:stroke-gray-700',
      cssVar: 'var(--color-gray-200, #e5e7eb)',
      hex: '#e5e7eb'
    },
    label: {
      className: 'fill-gray-500 dark:fill-gray-400',
      cssVar: 'var(--color-gray-500, #6b7280)',
      hex: '#6b7280'
    }
  }
} as const;

/**
 * Get color value based on preference order:
 * 1. CSS variable (for dynamic theming)
 * 2. Hex fallback
 */
export function getChartColor(
  colorKey: keyof typeof CHART_COLORS | string,
  property: 'stroke' | 'fill' = 'fill'
): string {
  // Handle nested paths like 'anomaly.high'
  const keys = colorKey.split('.');
  let colorObj: any = CHART_COLORS;
  
  for (const key of keys) {
    if (colorObj && typeof colorObj === 'object' && key in colorObj) {
      colorObj = colorObj[key];
    } else {
      // Fallback to a default color if path not found
      return property === 'stroke' ? 'currentColor' : 'transparent';
    }
  }
  
  // If we have a color definition, use CSS variable, otherwise fallback
  if (colorObj && typeof colorObj === 'object' && 'cssVar' in colorObj) {
    return colorObj.cssVar;
  }
  
  return property === 'stroke' ? 'currentColor' : 'transparent';
}

/**
 * Get Tailwind class names for a chart element
 */
export function getChartClassName(
  colorKey: keyof typeof CHART_COLORS | string,
  additionalClasses?: string
): string {
  const keys = colorKey.split('.');
  let colorObj: any = CHART_COLORS;
  
  for (const key of keys) {
    if (colorObj && typeof colorObj === 'object' && key in colorObj) {
      colorObj = colorObj[key];
    } else {
      return additionalClasses || '';
    }
  }
  
  if (colorObj && typeof colorObj === 'object' && 'className' in colorObj) {
    return additionalClasses 
      ? `${colorObj.className} ${additionalClasses}`
      : colorObj.className;
  }
  
  return additionalClasses || '';
}

/**
 * Data stream color assignments for consistent visualization
 */
export const DATA_STREAM_COLORS = [
  'emotion',
  'sensory',
  'anomaly.high',
  'anomaly.medium', 
  'anomaly.low'
] as const;

export type DataStreamColor = typeof DATA_STREAM_COLORS[number];
