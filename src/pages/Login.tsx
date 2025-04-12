import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Ticket } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    remember: false
  });

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

    try {
      setLoading(true);

      const { data: { session }, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) {
        console.error('Sign in error:', signInError);
        
        // More specific error messages based on the error type
        if (signInError.message === 'Invalid login credentials') {
          setError('Email o contraseña incorrectos. Por favor verifica tus credenciales.');
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

      // The redirect will be handled by the useEffect above
    } catch (err) {
      console.error('Login error:', err);
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

  return (
    <div className="bg-[#2a2a2a] min-h-[calc(100vh-8rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center">
            <Ticket className="h-12 w-12 text-primary" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
            Inicia sesión en tu cuenta
          </h2>
          <p className="mt-2 text-center text-sm text-gray-400">
            ¿No tienes una cuenta?{' '}
            <Link to="/registro" className="font-medium text-primary hover:text-primary-light">
              Regístrate
            </Link>
          </p>
        </div>
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
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
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-700 placeholder-gray-400 text-white rounded-t-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm bg-[#1f1f1f]"
                placeholder="Email"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={formData.password}
                onChange={handleChange}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-700 placeholder-gray-400 text-white rounded-b-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm bg-[#1f1f1f]"
                placeholder="Contraseña"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember"
                name="remember"
                type="checkbox"
                checked={formData.remember}
                onChange={handleChange}
                className="h-4 w-4 text-primary focus:ring-primary border-gray-700 rounded bg-[#1f1f1f]"
              />
              <label htmlFor="remember" className="ml-2 block text-sm text-gray-300">
                Recordarme
              </label>
            </div>

            <div className="text-sm">
              <Link to="/recuperar-password" className="font-medium text-primary hover:text-primary-light">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Login;