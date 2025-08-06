# Logger Service

The Logger class provides centralized logging for applications with configurable levels and outputs.

### Configurable Options:
- **LogLevel**: Controls log verbosity.
- **enableConsole**: Toggles console logging.
- **enableRemote**: Toggles remote service logging.
- **remoteEndpoint**: Endpoint URL for remote logging.

### Methods:
- **debug**: Logs debugging information.
- **info**: Logs general info.
- **warn**: Logs warnings.
- **error**: Logs errors with optional remote dispatch.

### Usage Example:
```typescript
import { logger, LogLevel } from './logger';
logger.setLogLevel(LogLevel.DEBUG);
logger.debug('Debug message');
```

### Performance and Optimization:
- Optimized for conditional logging based on set level.
- Deferred remote dispatch to prevent blocking UI.

### Error Handling:
- Prevents infinite loops in case of remote dispatch failures.
