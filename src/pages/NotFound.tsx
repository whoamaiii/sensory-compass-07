import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { LanguageSettings } from "@/components/LanguageSettings";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { logger } from "@/lib/logger";

const NotFound = () => {
  const location = useLocation();
  const { tCommon } = useTranslation();

  useEffect(() => {
    logger.error("404 Error: User attempted to access non-existent route", {
      path: location.pathname
    });
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background font-dyslexia">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-end mb-8">
          <LanguageSettings />
        </div>
        
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <h1 className="text-6xl font-bold text-primary mb-4">{String(tCommon('notFound.title'))}</h1>
            <p className="text-xl text-muted-foreground mb-8">{String(tCommon('notFound.subtitle'))}</p>
            <Button 
              onClick={() => window.location.href = '/'}
              className="bg-gradient-primary hover:opacity-90 font-dyslexia"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {String(tCommon('notFound.backHome'))}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
