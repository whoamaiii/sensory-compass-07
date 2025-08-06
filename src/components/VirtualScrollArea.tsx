import React, { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

/**
 * @fileoverview VirtualScrollArea - A performance-optimized virtual scrolling component
 * 
 * Virtual scrolling is a technique where only the visible items (plus a small buffer)
 * are rendered in the DOM, while maintaining the illusion of a complete scrollable list.
 * This dramatically improves performance when dealing with large datasets.
 * 
 * ## Benefits:
 * - **Reduced Memory Usage**: Only visible items are kept in the DOM
 * - **Faster Initial Render**: Rendering 20 items vs 10,000 items
 * - **Improved Scroll Performance**: Less DOM manipulation during scrolling
 * - **Scalability**: Can handle datasets with millions of items
 * 
 * ## Implementation Details:
 * The component uses a "window" rendering technique:
 * 1. Calculates which items should be visible based on scroll position
 * 2. Renders only those items plus an overscan buffer
 * 3. Uses CSS transforms to position items correctly
 * 4. Maintains a virtual height to preserve scrollbar behavior
 * 
 * ## Performance Considerations:
 * - Items must have a fixed height for accurate positioning
 * - The overscan buffer helps prevent flickering during fast scrolling
 * - Using React.memo on renderItem can further improve performance
 * 
 * @module components/VirtualScrollArea
 */

/**
 * A virtualized scroll area component for efficiently rendering long lists.
 *
 * This component enhances performance by rendering only the items currently visible
 * within the viewport, plus a specified number of "overscan" items before and after
 * the visible range. This approach minimizes the number of DOM elements, leading to
 * faster rendering and lower memory usage, which is especially beneficial for
 * applications displaying large datasets.
 *
 * It is built on top of the `@/components/ui/scroll-area` component and handles
 * the logic for calculating which items to display as the user scrolls.
 *
 * @example
 * // Basic usage with simple string items
 * ```tsx
 * const items = Array.from({ length: 1000 }, (_, i) => `Item ${i + 1}`);
 *
 * const MyListComponent = () => (
 *   <VirtualScrollArea
 *     items={items}
 *     itemHeight={40}
 *     containerHeight={400}
 *     renderItem={(item, index) => (
 *       <div key={index} style={{ lineHeight: '40px', padding: '0 10px' }}>
 *         {item}
 *       </div>
 *     )}
 *     className="border rounded-md"
 *   />
 * );
 * ```
 * 
 * @example
 * // Usage with complex objects and memoized render function
 * ```tsx
 * interface User {
 *   id: string;
 *   name: string;
 *   email: string;
 *   avatar: string;
 * }
 * 
 * const users: User[] = fetchUsers(); // Your data source
 * 
 * const UserListItem = React.memo<{ user: User; index: number }>(({ user, index }) => (
 *   <div className="flex items-center p-2 hover:bg-gray-50">
 *     <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full mr-3" />
 *     <div>
 *       <div className="font-semibold">{user.name}</div>
 *       <div className="text-sm text-gray-500">{user.email}</div>
 *     </div>
 *   </div>
 * ));
 * 
 * const UserList = () => (
 *   <VirtualScrollArea
 *     items={users}
 *     itemHeight={60}
 *     containerHeight={600}
 *     renderItem={(user, index) => <UserListItem key={user.id} user={user} index={index} />}
 *     overscan={10} // Increase overscan for smoother scrolling
 *   />
 * );
 * ```
 * 
 * @example
 * // Usage with dynamic container height
 * ```tsx
 * const DynamicHeightList = () => {
 *   const [containerHeight, setContainerHeight] = useState(0);
 *   const containerRef = useRef<HTMLDivElement>(null);
 * 
 *   useEffect(() => {
 *     const updateHeight = () => {
 *       if (containerRef.current) {
 *         setContainerHeight(containerRef.current.clientHeight);
 *       }
 *     };
 * 
 *     updateHeight();
 *     window.addEventListener('resize', updateHeight);
 *     return () => window.removeEventListener('resize', updateHeight);
 *   }, []);
 * 
 *   return (
 *     <div ref={containerRef} className="h-full">
 *       {containerHeight > 0 && (
 *         <VirtualScrollArea
 *           items={items}
 *           itemHeight={50}
 *           containerHeight={containerHeight}
 *           renderItem={(item, index) => <ItemComponent item={item} />}
 *         />
 *       )}
 *     </div>
 *   );
 * };
 * ```
 */
interface VirtualScrollAreaProps<T> {
  /**
   * The array of items to be rendered in the list.
   * Can be of any type, as long as `renderItem` can handle it.
   * @type {T[]}
   */
  items: T[];
  /**
   * The fixed height of each item in the list, in pixels.
   * This is crucial for calculating the position of virtualized items.
   * @type {number}
   */
  itemHeight: number;
  /**
   * The total height of the scrollable container, in pixels.
   * @type {number}
   */
  containerHeight: number;
  /**
   * A function that takes an item and its index and returns a React node to be rendered.
   * This function is called for each visible item.
   * @param {T} item - The item data to render.
   * @param {number} index - The index of the item in the original `items` array.
   * @returns {React.ReactNode} The JSX element to render for the item.
   */
  renderItem: (item: T, index: number) => React.ReactNode;
  /**
   * Optional CSS class name(s) to apply to the root `ScrollArea` component.
   * @type {string}
   * @default ""
   */
  className?: string;
  /**
   * The number of items to render outside the visible viewport, both above and below.
   * A larger overscan can reduce flickering on fast scrolls at the cost of rendering more elements.
   * @type {number}
   * @default 5
   */
  overscan?: number;
}

/**
 * Renders a virtualized scroll area for efficiently displaying long lists.
 *
 * @template T - The type of items in the list.
 * @param {VirtualScrollAreaProps<T>} props - The props for the component.
 * @returns {React.ReactElement} The rendered virtual scroll area component.
 */
export function VirtualScrollArea<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  className = "",
  overscan = 5,
}: VirtualScrollAreaProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollElementRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastScrollTopRef = useRef(0);

  // Clamp totalHeight to 0 (no negative wrapper heights when items is empty)
  const totalHeight = Math.max(0, items.length * itemHeight);

  /**
   * Calculate visible range based on scroll position.
   * Memoized to prevent unnecessary recalculations.
   * 
   * @returns {Object} Object containing start and end indices of visible items
   */
  const visibleRange = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const end = Math.min(
      items.length - 1,
      Math.floor((scrollTop + containerHeight) / itemHeight) + overscan
    );
    return { start, end };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

  /**
   * Extract visible items from the full items array.
   * Memoized to prevent unnecessary array operations.
   * 
   * @returns {T[]} Array of items currently visible (plus overscan)
   */
  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end + 1);
  }, [items, visibleRange]);

  /**
   * Throttled scroll handler to prevent excessive state updates.
   * Uses requestAnimationFrame for smooth scrolling performance.
   * 
   * @param {React.UIEvent<HTMLDivElement>} event - The scroll event
   */
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const currentScrollTop = event.currentTarget.scrollTop;
    
    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    // Throttle scroll updates using requestAnimationFrame
    scrollTimeoutRef.current = setTimeout(() => {
      // Only update if scroll position actually changed
      if (Math.abs(currentScrollTop - lastScrollTopRef.current) > 1) {
        lastScrollTopRef.current = currentScrollTop;
        setScrollTop(currentScrollTop);
      }
    }, 16); // ~60fps throttling
  }, []);

  /**
   * Cleanup effect to clear timeouts on unmount.
   * Prevents memory leaks from pending timeouts.
   */
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  return (
    <ScrollArea className={cn(className, "relative")} style={{ height: containerHeight }}>
      <div 
        ref={scrollElementRef}
        onScroll={handleScroll}
        className="overflow-auto"
        style={{ height: containerHeight }}
      >
        <div className="relative" style={{ height: totalHeight }}>
          <div
            className="relative"
            style={{
              transform: `translateY(${visibleRange.start * itemHeight}px)`
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