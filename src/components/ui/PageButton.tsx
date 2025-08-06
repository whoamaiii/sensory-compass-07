import React, { memo } from 'react';
import { Button } from '@/components/ui/button';

interface PageButtonProps {
  pageNum: number;
  isCurrent: boolean;
  onClick: (pageNum: number) => void;
}

export const PageButton = memo(({ pageNum, isCurrent, onClick }: PageButtonProps) => {
  const handleClick = () => {
    onClick(pageNum);
  };

  return (
    <Button
      variant={isCurrent ? 'default' : 'outline'}
      size="sm"
      onClick={handleClick}
      className="px-3"
    >
      {pageNum}
    </Button>
  );
});

