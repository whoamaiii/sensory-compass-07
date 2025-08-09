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





