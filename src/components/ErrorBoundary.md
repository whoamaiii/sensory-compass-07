# ErrorBoundary Component

A React error boundary component that catches JavaScript errors anywhere in the child component tree, logs those errors, and displays a fallback UI.

## TypeScript Interface

```typescript
interface Props {
  children: ReactNode;           // Child components to wrap
  fallback?: ReactNode;         // Optional custom fallback UI
  onError?: (error: Error, errorInfo: ErrorInfo) => void;  // Optional error callback
  showToast?: boolean;          // Whether to show error toast (default: true)
}

interface State {
  hasError: boolean;            // Whether an error has been caught
  error?: Error;                // The caught error
  errorInfo?: ErrorInfo;        // React error info with component stack
  errorCount: number;           // Number of errors caught (for preventing loops)
}
```

## Usage Examples

### Basic Usage

```tsx
import { ErrorBoundary } from '@/components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <YourApplication />
    </ErrorBoundary>
  );
}
```

### With Custom Fallback

```tsx
<ErrorBoundary 
  fallback={
    <div className="error-page">
      <h1>Oops! Something went wrong</h1>
      <button onClick={() => window.location.reload()}>
        Reload Page
      </button>
    </div>
  }
>
  <RiskyComponent />
</ErrorBoundary>
```

### With Error Handler

```tsx
<ErrorBoundary 
  onError={(error, errorInfo) => {
    // Send to monitoring service
    monitoringService.logError(error, {
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userId: currentUser?.id
    });
  }}
  showToast={false}  // Handle notifications manually
>
  <MainContent />
</ErrorBoundary>
```

### Nested Error Boundaries

```tsx
// App-level boundary
<ErrorBoundary fallback={<AppErrorFallback />}>
  <Router>
    {/* Route-level boundaries */}
    <Route path="/dashboard">
      <ErrorBoundary fallback={<DashboardErrorFallback />}>
        <Dashboard />
      </ErrorBoundary>
    </Route>
    
    <Route path="/analytics">
      <ErrorBoundary fallback={<AnalyticsErrorFallback />}>
        <Analytics />
      </ErrorBoundary>
    </Route>
  </Router>
</ErrorBoundary>
```

## Key Features

### 1. Automatic Error Recovery
- After 3 consecutive errors, automatically attempts to recover after 5 seconds
- Prevents infinite error loops that could lock up the application

### 2. Development-Friendly Error Display
- Shows detailed error information in development mode
- Includes error message, stack trace, and component stack
- Hidden in production for security

### 3. Multiple Recovery Options
- **Try Again**: Resets the error boundary state
- **Reload Page**: Full page refresh
- **Go Home**: Navigate to the root of the application

### 4. Centralized Error Logging
- Uses the `handleErrorBoundaryError` function for consistent error handling
- Logs errors with full context for debugging
- Integrates with the application's logging service

## Implementation Details

### Error Catching Lifecycle

```typescript
// 1. Static method called when error is thrown
static getDerivedStateFromError(error: Error): State {
  return { hasError: true, error, errorCount: 0 };
}

// 2. Instance method for side effects
componentDidCatch(error: Error, errorInfo: ErrorInfo) {
  // Log the error
  handleErrorBoundaryError(error, errorInfo);
  
  // Update state with error details
  this.setState(prevState => ({
    error,
    errorInfo,
    errorCount: prevState.errorCount + 1
  }));
  
  // Call custom handler if provided
  this.props.onError?.(error, errorInfo);
  
  // Auto-reset after multiple errors
  if (this.state.errorCount >= 2) {
    this.scheduleAutoReset();
  }
}
```

### Auto-Reset Mechanism

```typescript
private scheduleAutoReset = () => {
  if (this.resetTimeoutId) {
    clearTimeout(this.resetTimeoutId);
  }
  
  this.resetTimeoutId = setTimeout(() => {
    this.handleRetry();
    toast.info('Page automatically refreshed after multiple errors');
  }, 5000);
};
```

## Performance Considerations

1. **Minimal Overhead**: Error boundaries add negligible performance overhead when no errors occur

2. **Error Isolation**: Prevents errors from crashing the entire application

3. **Memory Management**: Properly cleans up timeouts in `componentWillUnmount`

## Best Practices

### 1. Strategic Placement

```tsx
// ❌ Don't wrap every component
<ErrorBoundary><Button /></ErrorBoundary>
<ErrorBoundary><Input /></ErrorBoundary>

// ✅ Wrap logical sections
<ErrorBoundary>
  <Header />
  <MainContent />
  <Footer />
</ErrorBoundary>
```

### 2. Granular Boundaries for Features

```tsx
// Isolate high-risk features
<ErrorBoundary fallback={<ChartErrorFallback />}>
  <ComplexDataVisualization data={largeDataset} />
</ErrorBoundary>
```

### 3. Error Recovery Strategies

```tsx
const ChartErrorFallback = () => (
  <Card className="p-4">
    <p>Unable to render chart</p>
    <Button onClick={() => refetchData()}>
      Try Loading Again
    </Button>
  </Card>
);
```

### 4. Testing Error Boundaries

```tsx
// Test component that throws on demand
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

// In tests
it('should catch and display errors', () => {
  const { getByText } = render(
    <ErrorBoundary>
      <ThrowError shouldThrow={true} />
    </ErrorBoundary>
  );
  
  expect(getByText('Something went wrong')).toBeInTheDocument();
});
```

## Common Error Scenarios

### 1. Async Errors
Error boundaries don't catch errors in:
- Event handlers
- Asynchronous code (setTimeout, promises)
- Server-side rendering
- Errors thrown in the error boundary itself

### 2. Handling Async Errors

```tsx
// Use try-catch in async code
const handleClick = async () => {
  try {
    await riskyAsyncOperation();
  } catch (error) {
    // Handle error appropriately
    logger.error('Async operation failed', error);
    toast.error('Operation failed');
  }
};
```

## Accessibility

The error boundary UI includes:
- Clear error messaging
- Keyboard-accessible buttons
- Proper ARIA labels
- High contrast colors for error states

## Future Enhancements

1. **Error Reporting**: Integration with error monitoring services (Sentry, LogRocket)
2. **Error Recovery**: Smarter recovery strategies based on error type
3. **Error Analytics**: Track error patterns and frequencies
4. **User Feedback**: Allow users to report errors with context
