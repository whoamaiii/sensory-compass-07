// Accessibility utility functions

/**
 * Announces a message to screen readers
 */
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite') {
  const announcer = document.getElementById('accessibility-announcements');
  if (announcer) {
    announcer.setAttribute('aria-live', priority);
    announcer.textContent = message;
    
    // Clear after a short delay to avoid repeated announcements
    setTimeout(() => {
      announcer.textContent = '';
    }, 1000);
  }
}

/**
 * Moves focus to an element by ID
 */
export function moveFocusTo(elementId: string) {
  const element = document.getElementById(elementId);
  if (element) {
    element.focus();
    return true;
  }
  return false;
}

/**
 * Checks if an element is focusable
 */
export function isFocusable(element: HTMLElement): boolean {
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ];
  
  return focusableSelectors.some(selector => element.matches(selector));
}

/**
 * Gets all focusable elements within a container
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(', ');
  
  return Array.from(container.querySelectorAll(focusableSelectors));
}

/**
 * Traps focus within a container
 */
export function trapFocus(container: HTMLElement) {
  const focusableElements = getFocusableElements(container);
  const firstFocusable = focusableElements[0];
  const lastFocusable = focusableElements[focusableElements.length - 1];

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Tab') {
      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable?.focus();
        }
      }
    }
  };

  container.addEventListener('keydown', handleKeyDown);

  // Focus the first focusable element
  firstFocusable?.focus();

  // Return cleanup function
  return () => {
    container.removeEventListener('keydown', handleKeyDown);
  };
}