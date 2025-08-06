
import React from 'react';
import { ResponsiveHeatMap } from '@nivo/heatmap';
import { CorrelationResult } from '@/lib/patternAnalysis';

interface CorrelationHeatmapProps {
  data: CorrelationResult[];
}

export const CorrelationHeatmap: React.FC<CorrelationHeatmapProps> = ({ data }) => {
  const factors = Array.from(new Set(data.flatMap(d => [d.factor1, d.factor2])));
  const chartData = factors.map(factor1 => ({
    id: factor1,
    data: factors.map(factor2 => ({
      x: factor2,
      y: data.find(d => (d.factor1 === factor1 && d.factor2 === factor2) || (d.factor1 === factor2 && d.factor2 === factor1))?.correlation ?? 0,
    })),
  }));

  return (
    <div className="h-[400px]">
      <ResponsiveHeatMap
        data={chartData}
        keys={factors}
        indexBy="id"
        margin={{ top: 100, right: 60, bottom: 60, left: 60 }}
        axisTop={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: -90,
          legend: '',
          legendOffset: -70,
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: '',
          legendOffset: -40,
        }}
        colors="bwr"
        cellOpacity={1}
        cellBorderWidth={1}
        cellBorderColor={{ from: 'color', modifiers: [['darker', 0.4]] }}
        labelTextColor={{ from: 'color', modifiers: [['brighter', 1.8]] }}
        defs={[
          {
            id: 'lines',
            type: 'patternLines',
            background: 'inherit',
            color: 'rgba(0, 0, 0, 0.1)',
            rotation: -45,
            lineWidth: 4,
            spacing: 7,
          },
        ]}
        fill={[{ id: 'lines' }]}
        animate={true}
        motionStiffness={80}
        motionDamping={9}
        hoverTarget="cell"
        cellHoverOthersOpacity={0.25}
      />
    </div>
  );
};

