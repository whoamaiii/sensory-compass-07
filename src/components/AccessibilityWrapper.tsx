import React from 'react';

interface AccessibilityWrapperProps {
  children: React.ReactNode;
  skipToContent?: boolean;
  announceChanges?: boolean;
}

export const AccessibilityWrapper: React.FC<AccessibilityWrapperProps> = ({
  children,
  skipToContent = true,
  announceChanges = true
}) => {
  return (
    <>
      {skipToContent && (
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary text-primary-foreground px-4 py-2 rounded-md z-50 font-dyslexia"
        >
          Skip to main content
        </a>
      )}
      
      <div id="main-content" className="focus:outline-none" tabIndex={-1}>
        {children}
      </div>

      {announceChanges && (
        <div
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
          id="accessibility-announcements"
        />
      )}
    </>
  );
};