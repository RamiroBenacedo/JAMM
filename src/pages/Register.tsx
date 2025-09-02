import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Ticket, Info, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { validateEmail, getPopularEmailDomains } from '../utils/emailValidation';
import { getRedirectURL } from '../utils/config';
import { checkRateLimit, recordSuccess, RATE_LIMIT_CONFIGS } from '../utils/rateLimiter';
import { logError, logSecurity } from '../utils/secureLogger';

const Register = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    passwordConfirm: ''
  });
  const [emailError, setEmailError] = useState<string | null>(null);
  const [showEmailSuggestions, setShowEmailSuggestions] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setEmailError(null);

    // Trim whitespace from inputs
    const email = formData.email.trim();
    const name = formData.name.trim();
    const password = formData.password;
    const passwordConfirm = formData.passwordConfirm;

    if (!email || !name || !password || !passwordConfirm) {
      setError('Por favor completa todos los campos');
      return;
    }

    // Validar email con dominios válidos
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      setEmailError(emailValidation.error || 'Email inválido');
      setShowEmailSuggestions(true);
      return;
    }

    if (password !== passwordConfirm) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    // Rate limiting check
    const rateLimit = checkRateLimit(email, RATE_LIMIT_CONFIGS.register);
    if (!rateLimit.allowed) {
      setError(rateLimit.message || 'Demasiados intentos de registro. Intenta más tarde.');
      logSecurity('Registration rate limit exceeded', { email });
      return;
    }

    try {
      setLoading(true);

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name
          },
          // Configurar URL de redirección después de confirmar email
          emailRedirectTo: getRedirectURL('/')
        }
      });

      if (signUpError) {
        logError('Registration failed', signUpError, { email });
        if (signUpError.message.includes('already registered')) {
          setError('Ya existe una cuenta con este email. Por favor inicia sesión.');
          logSecurity('Registration attempt with existing email', { email });
        } else if (signUpError.message.includes('Invalid email')) {
          setEmailError('Email inválido. Verifica el formato.');
          setShowEmailSuggestions(true);
        } else {
          setError('Error al registrar usuario. Por favor intenta nuevamente.');
        }
        return;
      }

      // Registration successful - reset rate limiting for this email
      recordSuccess(email);

      // Verificar si el usuario necesita confirmar su email
      if (signUpData.user && !signUpData.user.email_confirmed_at) {
        // Redirigir a la página de confirmación de email
        navigate('/confirmar-email', { 
          state: { email: email },
          replace: true 
        });
        return;
      }

      // Si el email ya está confirmado (caso raro), redirigir al login
      navigate('/ingresar', { 
        state: { message: 'Cuenta creada exitosamente. Puedes iniciar sesión.' }
      });
    } catch (err) {
      logError('Registration error', err, { email });
      setError('Error al registrar usuario. Por favor intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });

    // Limpiar errores cuando el usuario empieza a escribir
    if (error) setError(null);
    
    // Validación en tiempo real para email
    if (name === 'email') {
      setEmailError(null);
      setShowEmailSuggestions(false);
      
      // Validar email si tiene contenido
      if (value.trim()) {
        const emailValidation = validateEmail(value.trim());
        if (!emailValidation.isValid) {
          setEmailError(emailValidation.error || 'Email inválido');
        }
      }
    }
  };

  return (
    <div className="bg-[#2a2a2a] min-h-[calc(100vh-8rem)] flex items-center justify-center py-6 lg:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-4 lg:space-y-8">
        <div>
          <div className="flex justify-center">
          </div>
          <h2 className="mt-4 lg:mt-6 text-center text-2xl lg:text-3xl font-normal text-white">
            Crea tu cuenta
          </h2>
          <p className="mt-1 lg:mt-2 text-center text-xs lg:text-sm text-gray-400">
            ¿Ya tienes una cuenta?{' '}
            <Link to="/ingresar" className="font-medium text-[#FF5722] hover:text-opacity-90 transition-colors">
              Inicia sesión
            </Link>
          </p>
        </div>
        <form onSubmit={handleSubmit} className="mt-4 lg:mt-8 space-y-4 lg:space-y-6">
          {error && (
            <div className="bg-red-900/50 border border-red-500 text-red-200 px-3 lg:px-4 py-2 lg:py-3 rounded relative">
              <span className="block sm:inline text-xs lg:text-sm">{error}</span>
              {error.includes('Ya existe una cuenta') && (
                <div className="mt-2">
                  <Link to="/ingresar" className="font-medium underline hover:text-red-100">
                    Ir a iniciar sesión
                  </Link>
                </div>
              )}
            </div>
          )}
          
          {emailError && (
            <div className="bg-red-900/50 border border-red-500 text-red-200 px-3 lg:px-4 py-2 lg:py-3 rounded relative">
              <span className="block sm:inline text-xs lg:text-sm">{emailError}</span>
              {showEmailSuggestions && (
                <div className="mt-3 pt-3 border-t border-red-400">
                  <p className="text-xs lg:text-sm font-medium mb-2">Dominios recomendados:</p>
                  <div className="flex flex-wrap gap-1 lg:gap-2">
                    {getPopularEmailDomains().slice(0, 6).map(domain => (
                      <span 
                        key={domain}
                        className="text-xs bg-red-800/50 px-1 lg:px-2 py-1 rounded text-red-200"
                      >
                        @{domain}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="name" className="sr-only">
                Nombre completo
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleChange}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-700 placeholder-gray-400 text-white rounded-t-md focus:outline-none focus:ring-[#FF5722] focus:border-[#FF5722] focus:z-10 text-sm lg:text-base bg-[#1f1f1f]"
                placeholder="Nombre completo"
              />
            </div>
            <div>
              <label htmlFor="email" className="sr-only">
                Email
              </label>
              <div className="relative">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className={`appearance-none rounded-none relative block w-full px-3 py-2 border ${
                    emailError ? 'border-red-500' : 'border-gray-700'
                  } placeholder-gray-400 text-white focus:outline-none focus:ring-[#FF5722] focus:border-[#FF5722] focus:z-10 text-sm lg:text-base bg-[#1f1f1f]`}
                  placeholder="Email (ej: tu@gmail.com)"
                />
                {emailError && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <Info className="h-5 w-5 text-red-400" />
                  </div>
                )}
              </div>
            </div>
            <div className="relative">
              <label htmlFor="password" className="sr-only">
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                value={formData.password}
                onChange={handleChange}
                className="appearance-none rounded-none relative block w-full px-3 py-2 pr-10 border border-gray-700 placeholder-gray-400 text-white focus:outline-none focus:ring-[#FF5722] focus:border-[#FF5722] focus:z-10 text-sm lg:text-base bg-[#1f1f1f]"
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
            <div className="relative">
              <label htmlFor="passwordConfirm" className="sr-only">
                Confirmar contraseña
              </label>
              <input
                id="passwordConfirm"
                name="passwordConfirm"
                type={showPasswordConfirm ? "text" : "password"}
                autoComplete="new-password"
                required
                value={formData.passwordConfirm}
                onChange={handleChange}
                className="appearance-none rounded-none relative block w-full px-3 py-2 pr-10 border border-gray-700 placeholder-gray-400 text-white rounded-b-md focus:outline-none focus:ring-[#FF5722] focus:border-[#FF5722] focus:z-10 text-sm lg:text-base bg-[#1f1f1f]"
                placeholder="Confirmar contraseña"
              />
              <button
                type="button"
                onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-white transition-colors z-20"
                tabIndex={-1}
              >
                {showPasswordConfirm ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 lg:py-3 px-4 border border-transparent text-sm lg:text-base font-medium rounded-md text-white bg-[#FF5722] hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FF5722] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {loading ? 'Registrando...' : 'Registrarse'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Register;