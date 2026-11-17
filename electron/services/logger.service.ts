export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

export class LoggerService {
  private static instance: LoggerService;

  public static getInstance(): LoggerService {
    if (!LoggerService.instance) {
      LoggerService.instance = new LoggerService();
    }
    return LoggerService.instance;
  }

  private log(level: LogLevel, context: string, message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const formatted = `[${timestamp}] [${level}] [${context}]: ${message}`;
    if (level === LogLevel.ERROR) {
      console.error(formatted, data ?? '');
    } else if (level === LogLevel.WARN) {
      console.warn(formatted, data ?? '');
    } else {
      console.log(formatted, data ?? '');
    }
  }

  public debug(context: string, message: string, data?: any) {
    this.log(LogLevel.DEBUG, context, message, data);
  }

  public info(context: string, message: string, data?: any) {
    this.log(LogLevel.INFO, context, message, data);
  }

  public warn(context: string, message: string, data?: any) {
    this.log(LogLevel.WARN, context, message, data);
  }

  public error(context: string, message: string, data?: any) {
    this.log(LogLevel.ERROR, context, message, data);
  }
}
