import { useState } from 'react';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTranslation } from '@/hooks/useTranslation';

export const LanguageSettings = () => {
  const { currentLanguage, changeLanguage, tCommon } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const handleLanguageChange = (language: 'nb' | 'en') => {
    changeLanguage(language);
    setIsOpen(false);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">
            {currentLanguage === 'nb' 
              ? String(tCommon('language.norwegian'))
              : String(tCommon('language.english'))
            }
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem 
          onClick={() => handleLanguageChange('nb')}
          className={currentLanguage === 'nb' ? 'bg-accent' : ''}
        >
          {String(tCommon('language.norwegian'))}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleLanguageChange('en')}
          className={currentLanguage === 'en' ? 'bg-accent' : ''}
        >
          {String(tCommon('language.english'))}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};