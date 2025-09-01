// Secure Logger - Prevents sensitive data exposure in logs

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: Record<string, any>;
  userId?: string;
}

// Sensitive patterns to redact from logs
const SENSITIVE_PATTERNS = [
  /password/i,
  /token/i,
  /key/i,
  /secret/i,
  /authorization/i,
  /bearer/i,
  /email/i,
  /credit/i,
  /card/i,
  /ssn/i,
  /dni/i,
  /phone/i,
  /address/i
];

// Email pattern to redact
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// Phone number pattern to redact
const PHONE_REGEX = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;

class SecureLogger {
  private static instance: SecureLogger;
  private currentLevel: LogLevel;

  private constructor() {
    this.currentLevel = process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.WARN;
  }

  public static getInstance(): SecureLogger {
    if (!SecureLogger.instance) {
      SecureLogger.instance = new SecureLogger();
    }
    return SecureLogger.instance;
  }

  /**
   * Sanitize data to remove sensitive information
   */
  private sanitizeData(data: any): any {
    if (typeof data === 'string') {
      return this.sanitizeString(data);
    }
    
    if (typeof data === 'object' && data !== null) {
      if (Array.isArray(data)) {
        return data.map(item => this.sanitizeData(item));
      }
      
      const sanitized: Record<string, any> = {};
      for (const [key, value] of Object.entries(data)) {
        if (this.isSensitiveKey(key)) {
          sanitized[key] = '[REDACTED]';
        } else {
          sanitized[key] = this.sanitizeData(value);
        }
      }
      return sanitized;
    }
    
    return data;
  }

  /**
   * Sanitize string content
   */
  private sanitizeString(str: string): string {
    // Redact emails
    str = str.replace(EMAIL_REGEX, '[EMAIL_REDACTED]');
    
    // Redact phone numbers
    str = str.replace(PHONE_REGEX, '[PHONE_REDACTED]');
    
    // Redact potential tokens (long alphanumeric strings)
    str = str.replace(/[a-zA-Z0-9]{32,}/g, '[TOKEN_REDACTED]');
    
    return str;
  }

  /**
   * Check if a key name indicates sensitive data
   */
  private isSensitiveKey(key: string): boolean {
    return SENSITIVE_PATTERNS.some(pattern => pattern.test(key));
  }

  /**
   * Create a safe log entry
   */
  private createLogEntry(level: LogLevel, message: string, context?: any, userId?: string): LogEntry {
    return {
      level,
      message: this.sanitizeString(message),
      timestamp: new Date(),
      context: context ? this.sanitizeData(context) : undefined,
      userId
    };
  }

  /**
   * Log debug messages (development only)
   */
  public debug(message: string, context?: any, userId?: string): void {
    if (this.currentLevel <= LogLevel.DEBUG) {
      const entry = this.createLogEntry(LogLevel.DEBUG, message, context, userId);
      console.debug('🔍 DEBUG:', entry.message, entry.context);
    }
  }

  /**
   * Log info messages
   */
  public info(message: string, context?: any, userId?: string): void {
    if (this.currentLevel <= LogLevel.INFO) {
      const entry = this.createLogEntry(LogLevel.INFO, message, context, userId);
      console.info('ℹ️ INFO:', entry.message, entry.context);
    }
  }

  /**
   * Log warning messages
   */
  public warn(message: string, context?: any, userId?: string): void {
    if (this.currentLevel <= LogLevel.WARN) {
      const entry = this.createLogEntry(LogLevel.WARN, message, context, userId);
      console.warn('⚠️ WARN:', entry.message, entry.context);
    }
  }

  /**
   * Log error messages
   */
  public error(message: string, error?: Error | any, context?: any, userId?: string): void {
    if (this.currentLevel <= LogLevel.ERROR) {
      const entry = this.createLogEntry(LogLevel.ERROR, message, context, userId);
      
      if (process.env.NODE_ENV === 'development') {
        console.error('🚨 ERROR:', entry.message, {
          error: error?.message || error,
          stack: error?.stack,
          context: entry.context
        });
      } else {
        console.error('🚨 ERROR:', entry.message, {
          error: 'An error occurred',
          context: entry.context
        });
        
        // In production, you would send to a logging service here
        this.sendToLoggingService(entry, error);
      }
    }
  }

  /**
   * Log security events (always logged regardless of level)
   */
  public security(message: string, context?: any, userId?: string): void {
    const entry = this.createLogEntry(LogLevel.ERROR, `SECURITY: ${message}`, context, userId);
    console.error('🛡️ SECURITY:', entry.message, entry.context);
    
    // Always send security events to logging service
    this.sendToLoggingService(entry);
  }

  /**
   * Send logs to external logging service (placeholder)
   */
  private sendToLoggingService(entry: LogEntry, error?: Error): void {
    // In a real implementation, you would send to services like:
    // - Sentry
    // - LogRocket
    // - DataDog
    // - Custom logging endpoint
    
    if (process.env.NODE_ENV === 'development') {
      console.log('📤 Would send to logging service:', entry);
    }
  }

  /**
   * Set logging level
   */
  public setLevel(level: LogLevel): void {
    this.currentLevel = level;
  }
}

// Export singleton instance
export const logger = SecureLogger.getInstance();

// Convenience functions
export const logDebug = (message: string, context?: any, userId?: string) => 
  logger.debug(message, context, userId);

export const logInfo = (message: string, context?: any, userId?: string) => 
  logger.info(message, context, userId);

export const logWarn = (message: string, context?: any, userId?: string) => 
  logger.warn(message, context, userId);

export const logError = (message: string, error?: Error | any, context?: any, userId?: string) => 
  logger.error(message, error, context, userId);

export const logSecurity = (message: string, context?: any, userId?: string) => 
  logger.security(message, context, userId);