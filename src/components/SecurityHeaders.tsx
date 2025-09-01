// Security Headers Component - Adds client-side security configurations

import React, { useEffect } from 'react';

interface SecurityHeadersProps {
  children: React.ReactNode;
}

const SecurityHeaders: React.FC<SecurityHeadersProps> = ({ children }) => {
  useEffect(() => {
    // Set security-related meta tags and configurations
    const setSecurityMetas = () => {
      // Content Security Policy (CSP) - Basic protection against XSS
      const cspMeta = document.createElement('meta');
      cspMeta.setAttribute('http-equiv', 'Content-Security-Policy');
      cspMeta.setAttribute('content', generateCSP());
      
      // X-Content-Type-Options - Prevents MIME type sniffing
      const noSniffMeta = document.createElement('meta');
      noSniffMeta.setAttribute('http-equiv', 'X-Content-Type-Options');
      noSniffMeta.setAttribute('content', 'nosniff');
      
      // X-Frame-Options - Prevents clickjacking
      const frameOptionsMeta = document.createElement('meta');
      frameOptionsMeta.setAttribute('http-equiv', 'X-Frame-Options');
      frameOptionsMeta.setAttribute('content', 'DENY');
      
      // X-XSS-Protection - Enables XSS filtering
      const xssProtectionMeta = document.createElement('meta');
      xssProtectionMeta.setAttribute('http-equiv', 'X-XSS-Protection');
      xssProtectionMeta.setAttribute('content', '1; mode=block');
      
      // Referrer Policy - Controls referrer information
      const referrerPolicyMeta = document.createElement('meta');
      referrerPolicyMeta.setAttribute('name', 'referrer');
      referrerPolicyMeta.setAttribute('content', 'strict-origin-when-cross-origin');
      
      // Permissions Policy - Controls browser features
      const permissionsPolicyMeta = document.createElement('meta');
      permissionsPolicyMeta.setAttribute('http-equiv', 'Permissions-Policy');
      permissionsPolicyMeta.setAttribute('content', generatePermissionsPolicy());

      // Check if metas already exist to avoid duplicates
      const head = document.head;
      if (!head.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
        head.appendChild(cspMeta);
      }
      if (!head.querySelector('meta[http-equiv="X-Content-Type-Options"]')) {
        head.appendChild(noSniffMeta);
      }
      if (!head.querySelector('meta[http-equiv="X-Frame-Options"]')) {
        head.appendChild(frameOptionsMeta);
      }
      if (!head.querySelector('meta[http-equiv="X-XSS-Protection"]')) {
        head.appendChild(xssProtectionMeta);
      }
      if (!head.querySelector('meta[name="referrer"]')) {
        head.appendChild(referrerPolicyMeta);
      }
      if (!head.querySelector('meta[http-equiv="Permissions-Policy"]')) {
        head.appendChild(permissionsPolicyMeta);
      }
    };

    // Set additional security configurations
    const setSecurityConfigs = () => {
      // Disable right-click in production (optional - can be intrusive)
      if (process.env.NODE_ENV === 'production') {
        const disableRightClick = (e: MouseEvent) => {
          if (e.button === 2) { // Right click
            e.preventDefault();
            return false;
          }
        };

        // Disable common dev tools shortcuts in production
        const disableDevTools = (e: KeyboardEvent) => {
          // F12
          if (e.key === 'F12') {
            e.preventDefault();
            return false;
          }
          // Ctrl+Shift+I
          if (e.ctrlKey && e.shiftKey && e.key === 'I') {
            e.preventDefault();
            return false;
          }
          // Ctrl+Shift+J
          if (e.ctrlKey && e.shiftKey && e.key === 'J') {
            e.preventDefault();
            return false;
          }
          // Ctrl+U
          if (e.ctrlKey && e.key === 'u') {
            e.preventDefault();
            return false;
          }
        };

        // Note: These are commented out as they can be intrusive for legitimate users
        // Uncomment only if you need high security and understand the trade-offs
        // document.addEventListener('contextmenu', disableRightClick);
        // document.addEventListener('keydown', disableDevTools);

        // Cleanup function would remove these listeners
        return () => {
          // document.removeEventListener('contextmenu', disableRightClick);
          // document.removeEventListener('keydown', disableDevTools);
        };
      }
    };

    setSecurityMetas();
    const cleanup = setSecurityConfigs();

    return cleanup;
  }, []);

  return <>{children}</>;
};

/**
 * Generate Content Security Policy - Permissive for payment functionality
 */
const generateCSP = (): string => {
  const isDev = process.env.NODE_ENV === 'development';
  
  // Very permissive CSP to ensure payment functionality works
  const csp = [
    "default-src 'self' 'unsafe-inline' 'unsafe-eval' https: http:",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https: http: data:",
    "style-src 'self' 'unsafe-inline' https: http:",
    "font-src 'self' https: http: data:",
    "img-src 'self' data: https: http: blob:",
    "media-src 'self' data: blob: https: http:",
    "connect-src 'self' https: http: wss: ws:",
    "frame-src 'self' https: http:",
    "object-src 'self'",
    "base-uri 'self'",
    "form-action 'self' https: http:",
    "frame-ancestors 'self'"
  ];

  // No upgrade-insecure-requests in development
  if (!isDev) {
    csp.push("upgrade-insecure-requests");
  }

  return csp.join('; ');
};

/**
 * Generate Permissions Policy
 */
const generatePermissionsPolicy = (): string => {
  return [
    'camera=(),',
    'microphone=(),',
    'geolocation=(self),',
    'payment=(self),',
    'fullscreen=(self),',
    'clipboard-write=(self),',
    'accelerometer=(),',
    'gyroscope=(),',
    'magnetometer=(),',
    'notifications=(self),',
    'push=(),',
    'speaker=(),',
    'vibrate=(),',
    'vr=()'
  ].join(' ');
};

export default SecurityHeaders;