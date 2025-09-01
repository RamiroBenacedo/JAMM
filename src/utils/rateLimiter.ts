// Rate Limiter - Prevents brute force attacks and abuse

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number; // Time window in milliseconds
  blockDurationMs?: number; // How long to block after limit exceeded
  message?: string;
}

interface RateLimitState {
  attempts: number;
  firstAttempt: number;
  blockedUntil?: number;
  lastAttempt: number;
}

// Default configurations for different endpoint types
export const RATE_LIMIT_CONFIGS = {
  // Authentication endpoints - strict limits
  login: {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    blockDurationMs: 30 * 60 * 1000, // 30 minutes block
    message: 'Demasiados intentos de inicio de sesión. Intenta nuevamente en 30 minutos.'
  },
  register: {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    blockDurationMs: 60 * 60 * 1000, // 1 hour block
    message: 'Demasiados intentos de registro. Intenta nuevamente en 1 hora.'
  },
  passwordReset: {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    blockDurationMs: 60 * 60 * 1000, // 1 hour block
    message: 'Demasiados intentos de recuperación de contraseña. Intenta nuevamente en 1 hora.'
  },
  
  // Transaction endpoints - moderate limits
  purchase: {
    maxAttempts: 10,
    windowMs: 10 * 60 * 1000, // 10 minutes
    blockDurationMs: 20 * 60 * 1000, // 20 minutes block
    message: 'Demasiados intentos de compra. Intenta nuevamente en 20 minutos.'
  },
  
  // Email sending - prevent spam
  emailSend: {
    maxAttempts: 5,
    windowMs: 10 * 60 * 1000, // 10 minutes
    blockDurationMs: 30 * 60 * 1000, // 30 minutes block
    message: 'Demasiados emails enviados. Intenta nuevamente en 30 minutos.'
  },
  
  // Form submissions - general protection
  formSubmit: {
    maxAttempts: 10,
    windowMs: 5 * 60 * 1000, // 5 minutes
    blockDurationMs: 10 * 60 * 1000, // 10 minutes block
    message: 'Demasiadas acciones realizadas. Intenta nuevamente en 10 minutos.'
  }
} as const;

class RateLimiter {
  private storage: Map<string, RateLimitState> = new Map();
  private readonly storagePrefix = 'rateLimit_';

  constructor() {
    // Load from localStorage if available
    this.loadFromStorage();
    
    // Clean up expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Check if an action is allowed
   */
  public isAllowed(key: string, config: RateLimitConfig): { allowed: boolean; message?: string; retryAfter?: number } {
    const now = Date.now();
    const fullKey = this.generateKey(key);
    const state = this.storage.get(fullKey);

    // If no previous attempts, allow
    if (!state) {
      this.recordAttempt(fullKey, now);
      return { allowed: true };
    }

    // Check if currently blocked
    if (state.blockedUntil && now < state.blockedUntil) {
      const retryAfter = Math.ceil((state.blockedUntil - now) / 1000);
      return {
        allowed: false,
        message: config.message,
        retryAfter
      };
    }

    // Check if window has expired - reset counter
    if (now - state.firstAttempt > config.windowMs) {
      this.recordAttempt(fullKey, now, true); // Reset
      return { allowed: true };
    }

    // Check if limit exceeded
    if (state.attempts >= config.maxAttempts) {
      const blockUntil = now + (config.blockDurationMs || config.windowMs);
      this.blockUser(fullKey, blockUntil);
      const retryAfter = Math.ceil((blockUntil - now) / 1000);
      
      return {
        allowed: false,
        message: config.message,
        retryAfter
      };
    }

    // Allow and record attempt
    this.recordAttempt(fullKey, now);
    return { allowed: true };
  }

  /**
   * Record a successful action (reset counter on success)
   */
  public recordSuccess(key: string): void {
    const fullKey = this.generateKey(key);
    this.storage.delete(fullKey);
    this.saveToStorage();
  }

  /**
   * Record a failed action (increment counter)
   */
  public recordFailure(key: string): void {
    // Failure is already recorded in isAllowed check
    // This method exists for explicit failure recording if needed
  }

  /**
   * Get remaining attempts
   */
  public getRemainingAttempts(key: string, config: RateLimitConfig): number {
    const fullKey = this.generateKey(key);
    const state = this.storage.get(fullKey);
    
    if (!state) return config.maxAttempts;
    
    const now = Date.now();
    if (now - state.firstAttempt > config.windowMs) {
      return config.maxAttempts; // Window expired
    }
    
    return Math.max(0, config.maxAttempts - state.attempts);
  }

  /**
   * Clear rate limit for a specific key (admin use)
   */
  public clearLimit(key: string): void {
    const fullKey = this.generateKey(key);
    this.storage.delete(fullKey);
    this.saveToStorage();
  }

  /**
   * Generate a unique key for the user/action combination
   */
  private generateKey(key: string): string {
    // In a real app, you might want to include IP address
    // For now, using the provided key (email, userId, etc.)
    return `${this.storagePrefix}${key}`;
  }

  /**
   * Record an attempt
   */
  private recordAttempt(fullKey: string, now: number, reset: boolean = false): void {
    if (reset) {
      this.storage.set(fullKey, {
        attempts: 1,
        firstAttempt: now,
        lastAttempt: now
      });
    } else {
      const state = this.storage.get(fullKey);
      if (state) {
        state.attempts++;
        state.lastAttempt = now;
      } else {
        this.storage.set(fullKey, {
          attempts: 1,
          firstAttempt: now,
          lastAttempt: now
        });
      }
    }
    
    this.saveToStorage();
  }

  /**
   * Block user until specified time
   */
  private blockUser(fullKey: string, blockUntil: number): void {
    const state = this.storage.get(fullKey);
    if (state) {
      state.blockedUntil = blockUntil;
      this.saveToStorage();
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, state] of this.storage.entries()) {
      // Remove if blocked time has expired and no recent activity
      if (state.blockedUntil && state.blockedUntil < now && now - state.lastAttempt > 60 * 60 * 1000) {
        keysToDelete.push(key);
      }
      // Remove if window has expired and no block
      else if (!state.blockedUntil && now - state.firstAttempt > 60 * 60 * 1000) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.storage.delete(key));
    if (keysToDelete.length > 0) {
      this.saveToStorage();
    }
  }

  /**
   * Save to localStorage
   */
  private saveToStorage(): void {
    try {
      const data = Object.fromEntries(this.storage.entries());
      localStorage.setItem('rateLimitData', JSON.stringify(data));
    } catch (error) {
      // localStorage might be full or unavailable
      console.warn('Could not save rate limit data to localStorage');
    }
  }

  /**
   * Load from localStorage
   */
  private loadFromStorage(): void {
    try {
      const data = localStorage.getItem('rateLimitData');
      if (data) {
        const parsed = JSON.parse(data);
        this.storage = new Map(Object.entries(parsed));
      }
    } catch (error) {
      // Invalid data in localStorage
      console.warn('Could not load rate limit data from localStorage');
    }
  }
}

// Singleton instance
const rateLimiter = new RateLimiter();

// Convenience functions
export const checkRateLimit = (key: string, config: RateLimitConfig) => 
  rateLimiter.isAllowed(key, config);

export const recordSuccess = (key: string) => 
  rateLimiter.recordSuccess(key);

export const recordFailure = (key: string) => 
  rateLimiter.recordFailure(key);

export const getRemainingAttempts = (key: string, config: RateLimitConfig) => 
  rateLimiter.getRemainingAttempts(key, config);

export const clearRateLimit = (key: string) => 
  rateLimiter.clearLimit(key);

export default rateLimiter;