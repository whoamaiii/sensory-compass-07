# Async State Hook

The `useAsyncState` hook provides a flexible way to handle asynchronous operations in React applications.

## TypeScript Interfaces

### AsyncState
```typescript
interface AsyncState<T> {
  data: T | null;          // The data returned from the async operation
  loading: boolean;        // Indicates if the async operation is in progress
  error: Error | null;     // Any error that occurred during the async operation
  isSuccess: boolean;      // Indicates if the operation was successful
  isError: boolean;        // Indicates if there was an error
  isIdle: boolean;         // Indicates if the operation has not started
}
```

### UseAsyncStateOptions
```typescript
interface UseAsyncStateOptions {
  onSuccess?: <T>(data: T) => void;  // Callback on success
  onError?: (error: Error) => void;  // Callback on error
  retryCount?: number;               // Number of retry attempts
  retryDelay?: number;               // Delay between retries (ms)
  showErrorToast?: boolean;          // Option to show toast on error
}
```

## Usage Examples

### Basic Usage

```tsx
const fetchData = async () => {
  const response = await fetch('/api/data');
  return response.json();
};

const { state, execute } = useAsyncState(null, {
  onSuccess: (data) => console.log('Data loaded:', data),
  onError: (error) => console.error('Failed to load data:', error)
});

useEffect(() => {
  execute(fetchData);
}, [execute]);
```

### With Retry Logic

```tsx
const { state, execute } = useAsyncState(null, {
  retryCount: 3,
  retryDelay: 1000,
  showErrorToast: true,
});

const handleLoad = () => execute(() => api.fetchData());
```

## Features and Strategies

1. **Retry Logic**:
   - Supports retries with exponential backoff behavior controlled by `retryCount` and `retryDelay`.
   - Uses a retry loop to handle transient failures gracefully.

2. **Lifecycle Management**:
   - Initiates network calls in a `useEffect` hook or from any event handler.
   - Cleans up properly using `useRef` to check mounting status.

3. **Error Handling**:
   - Integrates with centralized error reporting services.
   - Optionally shows error notifications via toasts.

4. **Modular and Extensible**:
   - Extends easily for more complex query or mutation logic with options and callbacks.

5. **Toast Integration**:
   - Uses a toast notification to update users of errors and retries automatically.

## Common Pitfalls and Tips

- **Always Check Mounting Status**:
  - Use `isMountedRef.current` to safely update state after async calls to prevent memory leaks.

- **Error Handling**:
  - Implement both `onError` and `showErrorToast` to ensure proper user feedback.

- **Optimize for Hooks Simplicity**:
  - Control and extend hook behavior via options to keep execution flow simple.

- **Abort Controllers**:
  - Incorporate abort controllers for cancellable fetch requests to prevent stale data updates.

## Best Practices

1. **Consistent Hook Options**:
  - Provide default options for retries and error handling across app for consistency.

2. **Use with Context Providers**:
  - Combine hook results with context providers to share async state across components.

3. **Separate Logic from UI**:
  - Separate pure data fetching logic from UI components for reusability and testability.

## Testing the Hook

### Mocking Axios

```tsx
jest.mock('axios');

it('should set loading to false and data when successful', async () => {
  axios.get.mockResolvedValueOnce({ data: mockData });
  const { result, waitForNextUpdate } = renderHook(() => useAsyncState(fetchData));

  act(() => {
    result.current.execute();
  });

  await waitForNextUpdate();
  expect(result.current.state).toMatchObject({
    loading: false,
    data: mockData,
    error: null
  });
});
```

### Mocking Fetch

```tsx
beforeAll(() => jest.spyOn(global, 'fetch'));

afterEach(() => jest.clearAllMocks());

it('shows error toast when fetch fails', async () => {
  fetch.mockRejectedValueOnce(new Error('Failed to fetch'));
  const { result, waitForNextUpdate } = renderHook(() => useAsyncState(fetchData));

  act(() => {
    result.current.execute();
  });

  await waitForNextUpdate();

  expect(toast.error).toHaveBeenCalledWith('Async operation failed');
  expect(result.current.state.error).not.toBeNull();
});
```

## Future Improvements

- **Automated Cancellation**: Integrate with `AbortController` for request cancellation.
- **Enhanced Debouncing**: Include debouncing strategies to avoid excessive network calls.
- **Batch Processing**: Incorporate batching for reducing network request overhead.
