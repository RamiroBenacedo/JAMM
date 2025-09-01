import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Ticket, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { getRedirectURL } from '../utils/config';
import { checkRateLimit, recordSuccess, RATE_LIMIT_CONFIGS } from '../utils/rateLimiter';
import { logError, logSecurity } from '../utils/secureLogger';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(location.state?.message || null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    remember: false
  });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Trim whitespace from email and validate inputs
    const email = formData.email.trim();
    const password = formData.password.trim();

    // Input validation
    if (!email && !password) {
      setError('Por favor ingresa tu email y contraseña');
      return;
    }

    if (!email) {
      setError('Por favor ingresa tu email');
      return;
    }

    if (!password) {
      setError('Por favor ingresa tu contraseña');
      return;
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Por favor ingresa un email válido');
      return;
    }

    // Rate limiting check
    const rateLimit = checkRateLimit(email, RATE_LIMIT_CONFIGS.login);
    if (!rateLimit.allowed) {
      setError(rateLimit.message || 'Demasiados intentos. Intenta más tarde.');
      logSecurity('Login rate limit exceeded', { email }, undefined);
      return;
    }

    try {
      setLoading(true);

      const { data: { session }, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) {
        logError('Login failed', signInError, { email });
        
        // More specific error messages based on the error type
        if (signInError.message === 'Invalid login credentials') {
          setError('Email o contraseña incorrectos. Por favor verifica tus credenciales.');
          logSecurity('Invalid login credentials', { email });
        } else if (signInError.message.includes('Email not confirmed')) {
          setError('Por favor confirma tu email antes de iniciar sesión.');
        } else if (signInError.message.includes('Too many requests')) {
          setError('Demasiados intentos. Por favor espera unos minutos antes de intentar nuevamente.');
        } else {
          setError('Error al iniciar sesión. Por favor intenta nuevamente.');
        }
        return;
      }

      if (!session) {
        setError('Error al iniciar sesión. Por favor intenta nuevamente.');
        return;
      }

      // Login successful - reset rate limiting for this email
      recordSuccess(email);

      // The redirect will be handled by the useEffect above
    } catch (err) {
      logError('Login error', err, { email });
      setError('Error al iniciar sesión. Por favor intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({
      ...formData,
      [e.target.name]: value
    });
  };

  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true);
      setError(null);

      const { data, error: googleError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: getRedirectURL('/dashboard')
        }
      });

      if (googleError) {
        console.error('Google login error:', googleError);
        setError('Error al iniciar sesión con Google. Por favor intenta nuevamente.');
      }
      
      // Note: If successful, the user will be redirected to Google OAuth page
      // and then back to our app, so we don't need to handle success here
    } catch (err) {
      console.error('Google login error:', err);
      setError('Error al iniciar sesión con Google. Por favor intenta nuevamente.');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="bg-[#2a2a2a] min-h-[calc(100vh-8rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center">
          </div>
          <h2 className="mt-6 text-center text-2xl lg:text-3xl font-normal text-white">
            Inicia sesión en tu cuenta
          </h2>
          <p className="mt-2 text-center text-sm text-gray-400" style={{ fontFamily: 'Inter, sans-serif' }}>
            ¿No tienes una cuenta?{' '}
            <Link to="/registro" className="font-medium text-[#FF5722] hover:text-opacity-90 transition-colors">
              Regístrate
            </Link>
          </p>
        </div>
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          {successMessage && (
            <div className="bg-green-900/50 border border-green-500 text-green-200 px-4 py-3 rounded-lg flex items-center">
              <CheckCircle className="h-5 w-5 mr-2 flex-shrink-0" />
              <span className="text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
                {successMessage}
              </span>
            </div>
          )}
          
          {error && (
            <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded relative">
              <span className="block sm:inline">{error}</span>
            </div>
          )}
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-700 placeholder-gray-400 text-white rounded-t-md focus:outline-none focus:ring-[#FF5722] focus:border-[#FF5722] focus:z-10 sm:text-sm bg-[#1f1f1f]"
                placeholder="Email"
                              />
            </div>
            <div className="relative">
              <label htmlFor="password" className="sr-only">
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={formData.password}
                onChange={handleChange}
                className="appearance-none rounded-none relative block w-full px-3 py-2 pr-10 border border-gray-700 placeholder-gray-400 text-white rounded-b-md focus:outline-none focus:ring-[#FF5722] focus:border-[#FF5722] focus:z-10 sm:text-sm bg-[#1f1f1f]"
                placeholder="Contraseña"
                              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-white transition-colors z-20"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between" style={{ fontFamily: 'Inter, sans-serif' }}>
            <div className="flex items-center">
              <input
                id="remember"
                name="remember"
                type="checkbox"
                checked={formData.remember}
                onChange={handleChange}
                className="h-4 w-4 text-[#FF5722] focus:ring-[#FF5722] border-gray-700 rounded bg-[#1f1f1f]"
              />
              <label htmlFor="remember" className="ml-2 block text-sm text-gray-300">
                Recordarme
              </label>
            </div>

            <div className="text-sm">
              <Link to="/recuperar-password" className="font-medium text-[#FF5722] hover:text-opacity-90 transition-colors">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || googleLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-[#FF5722] hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FF5722] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                          >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </div>

          {/* Divisor */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-[#2a2a2a] text-gray-400" style={{ fontFamily: 'Inter, sans-serif' }}>
                O continúa con
              </span>
            </div>
          </div>

          {/* Botón de Google */}
          <div>
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading || googleLoading}
              className="group relative w-full flex justify-center items-center py-2 px-4 border border-gray-700 text-sm font-medium rounded-md text-white bg-white hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              style={{ color: '#1f2937', backgroundColor: 'white' }}
            >
              {googleLoading ? (
                <span className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 mr-2"></div>
                  Ingresando con Google...
                </span>
              ) : (
                <span className="flex items-center">
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continuar con Google
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Login;