import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";

interface VirtualScrollAreaProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  overscan?: number;
}

export function VirtualScrollArea<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  className = "",
  overscan = 5
}: VirtualScrollAreaProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollElementRef = useRef<HTMLDivElement>(null);

  const totalHeight = items.length * itemHeight;

  const visibleRange = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const end = Math.min(
      items.length - 1,
      Math.floor((scrollTop + containerHeight) / itemHeight) + overscan
    );
    return { start, end };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end + 1);
  }, [items, visibleRange]);

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  };

  return (
    <ScrollArea className={className} style={{ height: containerHeight }}>
      <div 
        ref={scrollElementRef}
        onScroll={handleScroll}
        style={{ height: containerHeight, overflow: 'auto' }}
      >
        <div style={{ height: totalHeight, position: 'relative' }}>
          <div
            style={{
              position: 'relative',
              top: visibleRange.start * itemHeight,
            }}
          >
            {visibleItems.map((item, index) => (
              <div
                key={visibleRange.start + index}
                style={{ height: itemHeight }}
              >
                {renderItem(item, visibleRange.start + index)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}