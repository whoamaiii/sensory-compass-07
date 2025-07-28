import { useState, useMemo, useCallback } from 'react';

interface PaginationOptions {
  initialPageSize?: number;
  initialPage?: number;
}

export function useDataPagination<T>(
  data: T[],
  options: PaginationOptions = {}
) {
  const { initialPageSize = 10, initialPage = 1 } = options;
  
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const totalItems = data.length;
  const totalPages = Math.ceil(totalItems / pageSize);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return data.slice(startIndex, endIndex);
  }, [data, currentPage, pageSize]);

  const goToPage = useCallback((page: number) => {
    const clampedPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(clampedPage);
  }, [totalPages]);

  const goToNextPage = useCallback(() => {
    goToPage(currentPage + 1);
  }, [currentPage, goToPage]);

  const goToPreviousPage = useCallback(() => {
    goToPage(currentPage - 1);
  }, [currentPage, goToPage]);

  const goToFirstPage = useCallback(() => {
    setCurrentPage(1);
  }, []);

  const goToLastPage = useCallback(() => {
    setCurrentPage(totalPages);
  }, [totalPages]);

  const changePageSize = useCallback((newPageSize: number) => {
    const newTotalPages = Math.ceil(totalItems / newPageSize);
    const newCurrentPage = Math.min(currentPage, newTotalPages);
    
    setPageSize(newPageSize);
    setCurrentPage(newCurrentPage || 1);
  }, [currentPage, totalItems]);

  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;

  const startIndex = totalItems > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endIndex = Math.min(currentPage * pageSize, totalItems);

  return {
    // Data
    paginatedData,
    
    // Pagination state
    currentPage,
    pageSize,
    totalItems,
    totalPages,
    
    // Navigation
    goToPage,
    goToNextPage,
    goToPreviousPage,
    goToFirstPage,
    goToLastPage,
    changePageSize,
    
    // Status
    hasNextPage,
    hasPreviousPage,
    
    // Display info
    startIndex,
    endIndex,
    
    // Utilities
    isFirstPage: currentPage === 1,
    isLastPage: currentPage === totalPages,
    isEmpty: totalItems === 0
  };
}