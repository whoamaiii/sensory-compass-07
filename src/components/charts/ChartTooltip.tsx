import { FC, memo } from 'react';
import { EmotionType, EMOTION_EMOJIS } from '@/lib/chartUtils';

interface TooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

export const ChartTooltip: FC<TooltipProps> = memo(({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col space-y-1 text-right">
            <p className="font-bold text-foreground">{label}</p>
            {payload.map((entry) => (
              <p key={`label-${entry.name}`} className="text-sm text-muted-foreground">
                {EMOTION_EMOJIS[entry.name as EmotionType] || ''} {entry.name}
              </p>
            ))}
          </div>
          <div className="flex flex-col space-y-1 text-right">
            <p className="font-bold text-foreground">Value</p>
            {payload.map((entry) => (
              <p key={`value-${entry.name}`} className="text-sm text-foreground">
                {entry.value.toFixed(1)}
              </p>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return null;
});

ChartTooltip.displayName = 'ChartTooltip';

