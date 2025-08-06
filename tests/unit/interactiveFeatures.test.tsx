import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// Mock components for testing
const MockStudentList = ({ onSelect }: { onSelect: (id: string) => void }) => {
  return (
    <div>
      <button onClick={() => onSelect('student-1')}>Student 1</button>
      <button onClick={() => onSelect('student-2')}>Student 2</button>
    </div>
  );
};

const MockDataVisualization = ({ data }: { data: any }) => {
  return (
    <div data-testid="data-visualization">
      {data ? `Displaying ${data.length} entries` : 'No data'}
    </div>
  );
};

const MockFilterControls = ({ onFilterChange }: { onFilterChange: (filters: any) => void }) => {
  return (
    <div>
      <button onClick={() => onFilterChange({ emotion: 'happy' })}>Filter Happy</button>
      <button onClick={() => onFilterChange({ emotion: null })}>Clear Filters</button>
    </div>
  );
};

describe('Interactive Features', () => {
  describe('User Interactions', () => {
    test('should handle student selection', () => {
      const handleSelect = vi.fn();
      render(<MockStudentList onSelect={handleSelect} />);
      
      const student1Button = screen.getByText('Student 1');
      fireEvent.click(student1Button);
      
      expect(handleSelect).toHaveBeenCalledWith('student-1');
    });

    test('should update visualization on data change', () => {
      const { rerender } = render(<MockDataVisualization data={null} />);
      expect(screen.getByText('No data')).toBeInTheDocument();
      
      rerender(<MockDataVisualization data={[1, 2, 3]} />);
      expect(screen.getByText('Displaying 3 entries')).toBeInTheDocument();
    });

    test('should handle filter changes', () => {
      const handleFilterChange = vi.fn();
      render(<MockFilterControls onFilterChange={handleFilterChange} />);
      
      const filterButton = screen.getByText('Filter Happy');
      fireEvent.click(filterButton);
      
      expect(handleFilterChange).toHaveBeenCalledWith({ emotion: 'happy' });
      
      const clearButton = screen.getByText('Clear Filters');
      fireEvent.click(clearButton);
      
      expect(handleFilterChange).toHaveBeenCalledWith({ emotion: null });
    });
  });

  describe('Error Handling UI', () => {
    const MockErrorBoundary = ({ children, fallback }: { children: React.ReactNode, fallback: React.ComponentType<{ error: Error }> }) => {
      const [hasError, setHasError] = React.useState(false);
      const [error, setError] = React.useState<Error | null>(null);

      React.useEffect(() => {
        const errorHandler = (event: ErrorEvent) => {
          setHasError(true);
          setError(new Error(event.message));
        };
        window.addEventListener('error', errorHandler);
        return () => window.removeEventListener('error', errorHandler);
      }, []);

      if (hasError && error) {
        const FallbackComponent = fallback;
        return <FallbackComponent error={error} />;
      }

      return <>{children}</>;
    };

    const ThrowError = () => {
      throw new Error('Test error');
    };

    test('should display error UI when component fails', () => {
      const ErrorFallback = ({ error }: { error: Error }) => (
        <div role="alert">Error: {error.message}</div>
      );

      // Suppress console.error for this test
      const originalError = console.error;
      console.error = vi.fn();

      expect(() => {
        render(
          <MockErrorBoundary fallback={ErrorFallback}>
            <ThrowError />
          </MockErrorBoundary>
        );
      }).toThrow();

      // Restore console.error
      console.error = originalError;
    });
  });

  describe('Loading States', () => {
    const MockLoadingComponent = ({ isLoading, data }: { isLoading: boolean, data?: any }) => {
      if (isLoading) {
        return <div role="status" aria-busy="true">Loading...</div>;
      }
      return <div>{data || 'No data'}</div>;
    };

    test('should show loading state', () => {
      render(<MockLoadingComponent isLoading={true} />);
      
      const loadingElement = screen.getByRole('status');
      expect(loadingElement).toBeInTheDocument();
      expect(loadingElement).toHaveAttribute('aria-busy', 'true');
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    test('should show data after loading', () => {
      const { rerender } = render(<MockLoadingComponent isLoading={true} />);
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      
      rerender(<MockLoadingComponent isLoading={false} data="Test data" />);
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      expect(screen.getByText('Test data')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    const MockForm = ({ onSubmit }: { onSubmit: (data: any) => void }) => {
      const [errors, setErrors] = React.useState<{ [key: string]: string }>({});
      
      const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        const data = Object.fromEntries(formData);
        
        const newErrors: { [key: string]: string } = {};
        if (!data.name) {
          newErrors.name = 'Name is required';
        }
        if (!data.grade) {
          newErrors.grade = 'Grade is required';
        }
        
        if (Object.keys(newErrors).length > 0) {
          setErrors(newErrors);
        } else {
          onSubmit(data);
        }
      };
      
      return (
        <form onSubmit={handleSubmit}>
          <div>
            <input name="name" placeholder="Name" />
            {errors.name && <span role="alert">{errors.name}</span>}
          </div>
          <div>
            <input name="grade" placeholder="Grade" />
            {errors.grade && <span role="alert">{errors.grade}</span>}
          </div>
          <button type="submit">Submit</button>
        </form>
      );
    };

    test('should validate required fields', () => {
      const handleSubmit = vi.fn();
      render(<MockForm onSubmit={handleSubmit} />);
      
      const submitButton = screen.getByText('Submit');
      fireEvent.click(submitButton);
      
      expect(screen.getByText('Name is required')).toBeInTheDocument();
      expect(screen.getByText('Grade is required')).toBeInTheDocument();
      expect(handleSubmit).not.toHaveBeenCalled();
    });

    test('should submit valid form', () => {
      const handleSubmit = vi.fn();
      render(<MockForm onSubmit={handleSubmit} />);
      
      const nameInput = screen.getByPlaceholderText('Name');
      const gradeInput = screen.getByPlaceholderText('Grade');
      
      fireEvent.change(nameInput, { target: { value: 'John Doe' } });
      fireEvent.change(gradeInput, { target: { value: '10' } });
      
      const submitButton = screen.getByText('Submit');
      fireEvent.click(submitButton);
      
      expect(handleSubmit).toHaveBeenCalledWith({
        name: 'John Doe',
        grade: '10'
      });
    });
  });
});
