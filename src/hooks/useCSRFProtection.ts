// CSRF Protection Hook - Provides CSRF token generation and validation

import { useState, useEffect } from 'react';

interface CSRFToken {
  token: string;
  timestamp: number;
}

const CSRF_TOKEN_KEY = 'csrf_token';
const TOKEN_EXPIRY = 30 * 60 * 1000; // 30 minutes

/**
 * Custom hook to provide CSRF protection
 */
export const useCSRFProtection = () => {
  const [csrfToken, setCSRFToken] = useState<string>('');

  useEffect(() => {
    generateOrRefreshToken();
  }, []);

  /**
   * Generate a cryptographically secure token
   */
  const generateToken = (): string => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  };

  /**
   * Generate or refresh CSRF token
   */
  const generateOrRefreshToken = (): string => {
    try {
      const stored = localStorage.getItem(CSRF_TOKEN_KEY);
      
      if (stored) {
        const parsed: CSRFToken = JSON.parse(stored);
        const now = Date.now();
        
        // If token is not expired, use it
        if (now - parsed.timestamp < TOKEN_EXPIRY) {
          setCSRFToken(parsed.token);
          return parsed.token;
        }
      }
    } catch (error) {
      // Invalid stored token, generate new one
    }

    // Generate new token
    const newToken = generateToken();
    const csrfData: CSRFToken = {
      token: newToken,
      timestamp: Date.now()
    };

    try {
      localStorage.setItem(CSRF_TOKEN_KEY, JSON.stringify(csrfData));
    } catch (error) {
      // localStorage might be full or unavailable
      console.warn('Could not store CSRF token');
    }

    setCSRFToken(newToken);
    return newToken;
  };

  /**
   * Validate CSRF token
   */
  const validateToken = (providedToken: string): boolean => {
    if (!providedToken || !csrfToken) return false;
    
    // Timing-safe comparison to prevent timing attacks
    return timingSafeEqual(providedToken, csrfToken);
  };

  /**
   * Get token for form submission
   */
  const getTokenForSubmission = (): { csrfToken: string } => {
    const token = csrfToken || generateOrRefreshToken();
    return { csrfToken: token };
  };

  /**
   * Refresh token manually
   */
  const refreshToken = (): string => {
    return generateOrRefreshToken();
  };

  return {
    csrfToken,
    getTokenForSubmission,
    validateToken,
    refreshToken
  };
};

/**
 * Timing-safe string comparison to prevent timing attacks
 */
const timingSafeEqual = (a: string, b: string): boolean => {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
};

/**
 * HOC to add CSRF protection to components
 */
export const withCSRFProtection = <P extends object>(
  Component: React.ComponentType<P & { csrfToken: string }>
): React.FC<P> => {
  return (props: P) => {
    const { csrfToken } = useCSRFProtection();
    
    return <Component {...props} csrfToken={csrfToken} />;
  };
};

export default useCSRFProtection;