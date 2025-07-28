import { useState } from "react";
import { format, subDays, subWeeks, subMonths, startOfDay, endOfDay } from "date-fns";
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";

export interface TimeRange {
  start: Date;
  end: Date;
  label: string;
}

interface DateRangeSelectorProps {
  onRangeChange: (range: TimeRange) => void;
  selectedRange: TimeRange;
  className?: string;
}

export const DateRangeSelector = ({ onRangeChange, selectedRange, className }: DateRangeSelectorProps) => {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: selectedRange.start,
    to: selectedRange.end,
  });
  const [isOpen, setIsOpen] = useState(false);

  const presetRanges = [
    {
      label: "Last 7 days",
      value: "7d",
      getRange: () => ({
        start: startOfDay(subDays(new Date(), 6)),
        end: endOfDay(new Date()),
        label: "Last 7 days"
      })
    },
    {
      label: "Last 30 days",
      value: "30d",
      getRange: () => ({
        start: startOfDay(subDays(new Date(), 29)),
        end: endOfDay(new Date()),
        label: "Last 30 days"
      })
    },
    {
      label: "Last 3 months",
      value: "3m",
      getRange: () => ({
        start: startOfDay(subMonths(new Date(), 3)),
        end: endOfDay(new Date()),
        label: "Last 3 months"
      })
    },
    {
      label: "Last 6 months",
      value: "6m",
      getRange: () => ({
        start: startOfDay(subMonths(new Date(), 6)),
        end: endOfDay(new Date()),
        label: "Last 6 months"
      })
    },
    {
      label: "This week",
      value: "week",
      getRange: () => {
        const now = new Date();
        const dayOfWeek = now.getDay();
        const startOfWeek = subDays(now, dayOfWeek);
        return {
          start: startOfDay(startOfWeek),
          end: endOfDay(now),
          label: "This week"
        };
      }
    },
    {
      label: "This month",
      value: "month",
      getRange: () => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return {
          start: startOfDay(startOfMonth),
          end: endOfDay(now),
          label: "This month"
        };
      }
    }
  ];

  const handlePresetSelect = (value: string) => {
    const preset = presetRanges.find(p => p.value === value);
    if (preset) {
      const range = preset.getRange();
      onRangeChange(range);
      setDateRange({ from: range.start, to: range.end });
    }
  };

  const handleCustomDateSelect = (range: DateRange | undefined) => {
    setDateRange(range);
    if (range?.from && range?.to) {
      onRangeChange({
        start: startOfDay(range.from),
        end: endOfDay(range.to),
        label: `${format(range.from, "MMM d")} - ${format(range.to, "MMM d, yyyy")}`
      });
      setIsOpen(false);
    }
  };

  return (
    <div className={cn("flex items-center gap-2 font-dyslexia", className)}>
      {/* Preset Selector */}
      <Select onValueChange={handlePresetSelect}>
        <SelectTrigger className="w-[160px] bg-input border-border">
          <SelectValue placeholder="Quick select" />
        </SelectTrigger>
        <SelectContent>
          {presetRanges.map((preset) => (
            <SelectItem key={preset.value} value={preset.value}>
              {preset.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Custom Date Range */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-[280px] justify-start text-left font-normal bg-input",
              !dateRange && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateRange?.from ? (
              dateRange.to ? (
                <>
                  {format(dateRange.from, "LLL dd, y")} -{" "}
                  {format(dateRange.to, "LLL dd, y")}
                </>
              ) : (
                format(dateRange.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date range</span>
            )}
            <ChevronDown className="ml-auto h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={dateRange?.from}
            selected={dateRange}
            onSelect={handleCustomDateSelect}
            numberOfMonths={2}
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>

      {/* Current Selection Display */}
      <div className="text-sm text-muted-foreground">
        <span className="hidden md:inline">Selected: </span>
        <span className="font-medium text-foreground">{selectedRange.label}</span>
      </div>
    </div>
  );
};