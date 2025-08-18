import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { logger } from '@/lib/logger';
import { useTranslation } from 'react-i18next';
import { toast } from '@/hooks/use-toast';

interface DevErrorBannerProps {
  className?: string;
}

// Simple dev-only banner that listens for window errors/unhandledrejections.
// - Moves event listeners into useEffect with cleanup
// - Uses central logger instead of console
// - Internationalizes all user-facing strings via common namespace
// - Adds minimal a11y with role="alert"
export const DevErrorBanner: React.FC<DevErrorBannerProps> = ({ className }) => {
  const { t } = useTranslation('common');
  const [count, setCount] = useState<number>(0);
  const [visible, setVisible] = useState<boolean>(false);
  const errorCountRef = useRef(0);

  const isProd = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.PROD;

  const message = useMemo(() => t('devBanner.errorCaptured', { count }), [t, count]);

  const handleError = useCallback((ev: ErrorEvent) => {
    errorCountRef.current += 1;
    setCount(errorCountRef.current);
    setVisible(true);
    logger.error('dev_error_captured', { name: ev.error?.name, message: ev.message, filename: ev.filename, lineno: ev.lineno, colno: ev.colno });
    if (!isProd) {
      toast({ title: t('devBanner.title'), description: t('devBanner.details') });
    } else {
      // minimal user notice in production
      toast({ title: t('devBanner.title') });
    }
  }, [isProd, t]);

  const handleUnhandledRejection = useCallback((ev: PromiseRejectionEvent) => {
    errorCountRef.current += 1;
    setCount(errorCountRef.current);
    setVisible(true);
    const reason = ev.reason && typeof ev.reason === 'object' ? { name: (ev.reason as Error)?.name, message: (ev.reason as Error)?.message } : { message: String(ev.reason) };
    logger.error('dev_unhandled_rejection', reason);
    if (!isProd) {
      toast({ title: t('devBanner.title'), description: t('devBanner.details') });
    } else {
      toast({ title: t('devBanner.title') });
    }
  }, [isProd, t]);

  useEffect(() => {
    // Register listeners once
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection as EventListener);
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection as EventListener);
    };
  }, [handleError, handleUnhandledRejection]);

  const onDismiss = useCallback(() => {
    setVisible(false);
  }, []);

  if (!visible) {
    return (
      <div aria-live="polite" className="sr-only">
        {t('devBanner.listening')}
      </div>
    );
  }

  return (
    <div role="alert" aria-atomic="true" className={`w-full border border-destructive/50 bg-destructive/10 text-foreground rounded-md p-3 flex items-start gap-3 ${className ?? ''}`}>
      <div className="flex-1">
        <p className="font-medium">{t('devBanner.title')}</p>
        <p className="text-sm text-muted-foreground">{message} — {t('devBanner.details')}</p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label={t('buttons.close')}
        className="shrink-0 inline-flex items-center justify-center rounded-md px-2 py-1 text-sm font-medium text-foreground hover:bg-foreground/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onDismiss();
          }
        }}
        data-testid="dev-error-banner-dismiss"
      >
        {t('buttons.close')}
      </button>
    </div>
  );
};
