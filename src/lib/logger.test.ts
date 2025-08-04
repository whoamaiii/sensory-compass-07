import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger, LogLevel } from './logger';

describe('Logger', () => {
  let consoleSpy: {
    log: ReturnType<typeof vi.spyOn>;
    info: ReturnType<typeof vi.spyOn>;
    warn: ReturnType<typeof vi.spyOn>;
    error: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    // Spy on console methods to check if they are called
    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      info: vi.spyOn(console, 'info').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    };
    logger.init(LogLevel.INFO); // Default log level for tests
  });

  afterEach(() => {
    // Restore original console methods
    vi.restoreAllMocks();
  });

  it('should not log messages below the configured log level', () => {
    logger.setLogLevel(LogLevel.WARN);
    logger.info('This should not be logged');
    logger.debug('This should not be logged');
    expect(consoleSpy.info).not.toHaveBeenCalled();
    expect(consoleSpy.log).not.toHaveBeenCalled();
  });

  it('should log messages at or above the configured log level', () => {
    logger.setLogLevel(LogLevel.INFO);
    logger.info('Info message');
    logger.warn('Warning message');
    logger.error('Error message');

    expect(consoleSpy.info).toHaveBeenCalled();
    expect(consoleSpy.warn).toHaveBeenCalled();
    expect(consoleSpy.error).toHaveBeenCalled();
  });

  it('should log debug messages when log level is DEBUG', () => {
    logger.setLogLevel(LogLevel.DEBUG);
    logger.debug('Debug message');
    expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('DEBUG'), 'Debug message');
  });

  it('should prefix logs with the correct level', () => {
    logger.setLogLevel(LogLevel.DEBUG);
    logger.info('Info');
    logger.warn('Warn');
    logger.error('Error');

    expect(consoleSpy.info).toHaveBeenCalledWith(expect.stringContaining('INFO'), 'Info');
    expect(consoleSpy.warn).toHaveBeenCalledWith(expect.stringContaining('WARN'), 'Warn');
    expect(consoleSpy.error).toHaveBeenCalledWith(expect.stringContaining('ERROR'), 'Error');
  });

  it('should be able to change log level dynamically', () => {
    logger.setLogLevel(LogLevel.ERROR);
    logger.warn('This should not be logged');
    expect(consoleSpy.warn).not.toHaveBeenCalled();

    logger.setLogLevel(LogLevel.WARN);
    logger.warn('This should be logged');
    expect(consoleSpy.warn).toHaveBeenCalled();
  });

  it('should handle multiple arguments', () => {
    const obj = { a: 1, b: 2 };
    logger.info('Logging an object:', obj);
    expect(consoleSpy.info).toHaveBeenCalledWith(expect.stringContaining('INFO'), 'Logging an object:', obj);
  });
});