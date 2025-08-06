# Mock Data Loader

The `MockDataLoader` component facilitates the loading and management of mock student data, providing a controlled environment for testing various pattern analysis features.

### Component Props:
- **isLoading**: `boolean`
  - Indicates if data is currently being loaded.
- **loadingProgress**: `number`
  - Displays the current loading progress percentage.

### Usage Example:

```jsx
<MockDataLoader />
```

This component is used within testing and development tools to simulate real-world scenarios and verify the application's behavior under different data conditions.

### Error Handling:
- Proper error handling with toast notifications.
- Custom event dispatch to inform components across the app when mock data is loaded, allowing refresh without a full page reload.

### Performance Considerations:
- Presents loading progress for better UX.
- Uses `setInterval` to simulate loading progress.

### Optimization Strategies:
- The data simulation process is optimized to prevent UI blocking by progressing loading in intervals.

### Inline Comments:
Inline comments are provided throughout the component to give clarity on each of the major steps in the mock data handling process.
