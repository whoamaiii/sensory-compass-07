### Chart hover behavior (no dimming)

Context: Some GPU/browser combinations caused the non-hovered series to dim, which users perceived as the chart disappearing when the tooltip appeared.

What we enforce globally in `src/components/charts/EChartContainer.tsx`:
- emphasis.disabled = true
- emphasis.focus = 'none'
- emphasis.blurScope = 'global'
- blur.itemStyle.opacity = 1 and blur.lineStyle.opacity = 1
- select.disabled = true (avoid selection dimming)
- tooltip.appendToBody = true and transitionDuration = 0
- container overflow = visible

Builders in `src/components/charts/ChartKit.ts` also set the same no-dimming emphasis/blur options per series.

Rationale: Keep all series fully visible and avoid any hover-driven opacity changes.


### Centralized presets for tooltips and legends

We now use shared presets to ensure consistent tooltip/legend configuration across all charts:

- Location: `src/components/charts/presets.ts`
- Usage:
  - Axis tooltips: `tooltipPresets.axis({ type: 'line' | 'shadow' })`
  - Item tooltips: `tooltipPresets.item()`
  - Legends: `legendPresets.scrollBottom()` or `legendPresets.top()`

These presets apply `appendToBody`, `confine`, and `transitionDuration: 0` by default to avoid clipping and flicker. Builders in `src/components/charts/ChartKit.ts` and optimized sub-components import these presets, so behavior is uniform throughout the app.





