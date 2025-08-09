/**
 * Shared ECharts presets for tooltips and legends.
 * Ensures consistent, accessible behavior across charts.
 */
import type { EChartsOption } from 'echarts';

type TooltipOption = NonNullable<EChartsOption['tooltip']>;
type LegendOption = NonNullable<EChartsOption['legend']>;

export const tooltipPresets = {
  item(): TooltipOption {
    return { trigger: 'item', confine: true, appendToBody: true, transitionDuration: 0 };
  },
  axis(axisPointer?: TooltipOption extends infer T ? T extends { axisPointer?: infer P } ? P : any : any): TooltipOption {
    return { trigger: 'axis', axisPointer, confine: true, appendToBody: true, transitionDuration: 0 } as TooltipOption;
  },
};

export const legendPresets = {
  scrollBottom(): LegendOption {
    return { bottom: 0, type: 'scroll' } as LegendOption;
  },
  top(): LegendOption {
    return { top: 0 } as LegendOption;
  },
};


