## 0.1.0 - 2025-08-08

- Chart hover behavior hardened in `src/components/charts/EChartContainer.tsx` and `src/components/charts/ChartKit.ts`.
  - Disabled series dimming on hover (`emphasis.disabled`, `focus: 'none'`, opaque `blur` state).
  - Tooltip stability improvements (`appendToBody`, zero transition duration) and container overflow visibility.
  - Rationale: prevent perception that the chart "disappears" when hovering; keep all lines fully visible.





