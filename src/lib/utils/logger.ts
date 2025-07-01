interface LogContext {
  [key: string]: any;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  info(message: string, context?: LogContext): void {
    this.log('INFO', message, context);
  }

  error(message: string, context?: LogContext): void {
    this.log('ERROR', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log('WARN', message, context);
  }

  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      this.log('DEBUG', message, context);
    }
  }

  private log(level: string, message: string, context?: LogContext): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...context,
    };

    if (this.isDevelopment) {
      console.log(`[${timestamp}] ${level}: ${message}`, context ? JSON.stringify(context, null, 2) : '');
    } else {
      // In production, you might want to send logs to a service like Winston, Datadog, etc.
      console.log(JSON.stringify(logEntry));
    }
  }
}

export const logger = new Logger();