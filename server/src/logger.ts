import { LFortranSettings } from "./lfortran-types";

import { MovingStats } from "./stats";

export enum LogLevel {
  OFF   = 0,
  FATAL = 1,
  ERROR = 2,
  WARN  = 3,
  INFO  = 4,
  DEBUG = 5,
  TRACE = 6,
  ALL   = 7,
}

export function logLevelFromName(lowerName: string): LogLevel {
  const upperName: string = lowerName.toUpperCase();
  const level: LogLevel | undefined = LogLevel[upperName];
  if (level === undefined) {
    throw new Error(`Invalid LogLevel: ${lowerLevel}`);
  }
  return level;
}

export class Logger {

  /** Current `LogLevel` for filtering and formatting messages. */
  public level: LogLevel = LogLevel.INFO;

  /** Whether to enable benchmarking. */
  public enableBenchmark: boolean = false;

  stats: Map<string, MovingStats> = new Map();

  /**
   * @param level Initial `LogLevel` of this `Logger`.
   */
  constructor(settings?: LFortranSettings) {
    if (settings !== undefined) {
      this.configure(settings);
    }
  }

  configure(settings: LFortranSettings): void {
    this.level = logLevelFromName(settings.log.level);
    this.enableBenchmark = settings.log.benchmark;
  }

  /**
   * Returns whether benchmark requests will be logged.
   * @return Value of `this.enableBenchmark`.
   */
  isBenchmarkEnabled(): boolean {
    return this.enableBenchmark;
  }

  /**
   * Returns true if no log level is enabled.
   * @return Whether all log levels are disabled.
   */
  areAllDisabled(): boolean {
    return this.level === LogLevel.OFF;
  }

  /**
   * Returns true when the log level is at least `LogLevel.FATAL`.
   * @return Whether fatal logs are enabled.
   */
  isFatalEnabled(): boolean {
    return this.level >= LogLevel.FATAL;
  }

  /**
   * Returns true when the log level is at least `LogLevel.ERROR`.
   * @return Whether error logs are enabled.
   */
  isErrorEnabled(): boolean {
    return this.level >= LogLevel.ERROR;
  }

  /**
   * Returns true when the log level is at least `LogLevel.WARN`.
   * @return Whether warn logs are enabled.
   */
  isWarnEnabled(): boolean {
    return this.level >= LogLevel.WARN;
  }

  /**
   * Returns true when the log level is at least `LogLevel.INFO`.
   * @return Whether info logs are enabled.
   */
  isInfoEnabled(): boolean {
    return this.level >= LogLevel.INFO;
  }

  /**
   * Returns true when the log level is at least `LogLevel.DEBUG`.
   * @return Whether debug logs are enabled.
   */
  isDebugEnabled(): boolean {
    return this.level >= LogLevel.DEBUG;
  }

  /**
   * Returns true when the log level is at least `LogLevel.TRACE`.
   * @return Whether trace logs are enabled.
   */
  isTraceEnabled(): boolean {
    return this.level >= LogLevel.TRACE;
  }

  /**
   * Returns true if all the log levels are enabled.
   * @return Whether all the log levels are enabled.
   */
  areAllEnabled(): boolean {
    return this.level === LogLevel.ALL;
  }

  benchmark(identifier: string, start: number): void {
    if (this.isBenchmarkEnabled()) {
      const stop: number = performance.now();
      const millis: number = stop - start;

      let stats: MovingStats | undefined = this.stats.get(identifier);
      if (stats === undefined) {
        stats = new MovingStats();
        this.stats.set(identifier, stats);
      }
      stats.observe(millis);

      this.printFormat(console.log, "TIME", [
        "%s took %s ms (samples: %d, mean: %s +/- %s ms, min: %s ms, max: %s ms)",
        identifier,
        millis.toFixed(2),
        stats.getNumSamples(),
        stats.getMean().toFixed(2),
        stats.getStdDev().toFixed(2),
        stats.getMin().toFixed(2),
        stats.getMax().toFixed(2),
      ]);
    }
  }

  /**
   * Prepends the log level to the given statement.
   * @param log Prints the log message.
   * @param level Identifies the log level of the message.
   * @param message_and_args An optional vararg array that may contain either a
   *   string message followed by positional arguments or a single element
   *   consisting of an object to debug (such as a caught `Error`).
   */
  printFormat(log: (...messages_and_args: any[]) => void,
              level: string,
              message_and_args: any[]): void {
    if ((message_and_args.length > 0) && (typeof message_and_args[0] === "string")) {
      const message = message_and_args[0];
      const formatted: string = `[${level}] ${message}`;
      message_and_args[0] = formatted;
    }
    log.apply(console, message_and_args);
  }

  /**
   * Prints a message to `console.error` with the prefix `[FATAL]`. This should
   * only be used to log errors that cannot be recovered from. In order to use
   * this method, the log level must be set to at least `LogLevel.FATAL`.
   * @param message_and_args An optional vararg array that may contain either a
   *   string message followed by positional arguments or a single element
   *   consisting of an object to debug (such as a caught `Error`).
   */
  fatal(...message_and_args: any[]): void {
    if (this.isFatalEnabled()) {
      this.printFormat(console.error, "FATAL", message_and_args);
    }
  }

  /**
   * Prints a message to `console.error` with the prefix `[ERROR]`. This should
   * be used when logging non-fatal errors that prevent functionality. In order
   * to use this method, the log level must be set to at least `LogLevel.ERROR`.
   * @param message_and_args An optional vararg array that may contain either a
   *   string message followed by positional arguments or a single element
   *   consisting of an object to debug (such as a caught `Error`).
   */
  error(...message_and_args: any[]): void {
    if (this.isErrorEnabled()) {
      this.printFormat(console.error, "ERROR", message_and_args);
    }
  }

  /**
   * Prints an optional message to `console.error` along with a stack trace
   * consisting of the call stack of this function. In order to use this method,
   * the log level must be set to at least `LogLevel.ERROR`.
   * @param message_and_args An optional vararg array that may contain either a
   *   string message followed by positional arguments or a single element
   *   consisting of an object to debug (such as a caught `Error`).
   */
  stack(...message_and_args: any[]): void {
    if (this.isErrorEnabled()) {
      console.trace(...message_and_args);
    }
  }

  /**
   * Prints a message to `console.warn` with the prefix `[WARN]`. This should be
   * used when logging non-fatal errors that do not prevent functionality. In
   * order to use this method, the log level must be set to at least
   * `LogLevel.WARN`.
   * @param message_and_args An optional vararg array that may contain either a
   *   string message followed by positional arguments or a single element
   *   consisting of an object to debug (such as a caught `Error`).
   */
  warn(...message_and_args: any[]): void {
    if (this.isWarnEnabled()) {
      this.printFormat(console.warn, "WARN", message_and_args);
    }
  }

  /**
   * Prints a message to `console.info` with the prefix `[INFO]`. This should be
   * used when logging standard messages. In order to use this method, the log
   * level must be set to at least `LogLevel.INFO`.
   * @param message_and_args An optional vararg array that may contain either a
   *   string message followed by positional arguments or a single element
   *   consisting of an object to debug (such as a caught `Error`).
   */
  info(...message_and_args: any[]): void {
    if (this.isInfoEnabled()) {
      this.printFormat(console.info, "INFO", message_and_args);
    }
  }

  /**
   * Prints a message to `console.debug` with the prefix `[DEBUG]`. This should be
   * used when logging information for debugging purposes. In order to use this
   * method, the log level must be set to at least `LogLevel.DEBUG`.
   * @param message_and_args An optional vararg array that may contain either a
   *   string message followed by positional arguments or a single element
   *   consisting of an object to debug (such as a caught `Error`).
   */
  debug(...message_and_args: any[]): void {
    if (this.isDebugEnabled()) {
      this.printFormat(console.debug, "DEBUG", message_and_args);
    }
  }

  /**
   * Prints a message to `console.debug` with the prefix `[TRACE]`. This should
   * be used when logging extraneous information for debugging purposes that
   * would pollute the terminal output with unnecessary messages unless the
   * messages are explicitly desired. Such messages may include the names and
   * parameters of every method called. In order to use this method, the log
   * level must be set to at least `LogLevel.TRACE`.
   * @param message_and_args An optional vararg array that may contain either a
   *   string message followed by positional arguments or a single element
   *   consisting of an object to debug (such as a caught `Error`).
   */
  trace(...message_and_args: any[]): void {
    if (this.isTraceEnabled()) {
      this.printFormat(console.debug, "TRACE", message_and_args);
    }
  }
}
