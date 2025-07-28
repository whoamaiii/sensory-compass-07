import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrackingEntry } from '@/types/student';
import { useDataPagination } from '@/hooks/useDataPagination';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginatedSessionsListProps {
  sessions: TrackingEntry[];
  title?: string;
}

export const PaginatedSessionsList: React.FC<PaginatedSessionsListProps> = ({
  sessions,
  title = "Sessions in Selected Period"
}) => {
  const {
    paginatedData,
    currentPage,
    pageSize,
    totalItems,
    totalPages,
    goToPage,
    goToNextPage,
    goToPreviousPage,
    goToFirstPage,
    goToLastPage,
    changePageSize,
    hasNextPage,
    hasPreviousPage,
    startIndex,
    endIndex,
    isEmpty
  } = useDataPagination(sessions, { initialPageSize: 10 });

  if (isEmpty) {
    return (
      <Card className="bg-gradient-card border-0 shadow-soft">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No sessions found in the selected period.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-card border-0 shadow-soft">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{title}</span>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Showing {startIndex}-{endIndex} of {totalItems}</span>
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => changePageSize(parseInt(value))}
            >
              <SelectTrigger className="w-20 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Sessions List */}
        <div className="space-y-4">
          {paginatedData.map((entry) => (
            <div key={entry.id} className="border-l-4 border-primary pl-4 py-2 hover:bg-muted/50 transition-colors rounded-r">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-foreground">
                  {entry.timestamp.toLocaleDateString()} at {entry.timestamp.toLocaleTimeString()}
                </span>
                <div className="flex gap-2">
                  <Badge variant="outline" className="text-xs">
                    {entry.emotions.length} emotions
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {entry.sensoryInputs.length} sensory
                  </Badge>
                  {entry.environmentalData && (
                    <Badge variant="outline" className="text-xs">
                      Environmental data
                    </Badge>
                  )}
                </div>
              </div>
              {entry.generalNotes && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {entry.generalNotes}
                </p>
              )}
              {entry.emotions.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {entry.emotions.slice(0, 3).map((emotion, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {emotion.emotion} ({emotion.intensity})
                    </Badge>
                  ))}
                  {entry.emotions.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{entry.emotions.length - 3} more
                    </Badge>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </div>
            
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={goToFirstPage}
                disabled={!hasPreviousPage}
                className="px-2"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={goToPreviousPage}
                disabled={!hasPreviousPage}
                className="px-2"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              {/* Page number buttons */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => goToPage(pageNum)}
                    className="px-3"
                  >
                    {pageNum}
                  </Button>
                );
              })}

              <Button
                variant="outline"
                size="sm"
                onClick={goToNextPage}
                disabled={!hasNextPage}
                className="px-2"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={goToLastPage}
                disabled={!hasNextPage}
                className="px-2"
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};