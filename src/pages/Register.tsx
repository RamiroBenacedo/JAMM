import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Ticket } from 'lucide-react';
import { supabase } from '../lib/supabase';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Trim whitespace from inputs
    const email = formData.email.trim();
    const name = formData.name.trim();
    const password = formData.password;
    const passwordConfirm = formData.passwordConfirm;

    if (!email || !name || !password || !passwordConfirm) {
      setError('Por favor completa todos los campos');
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

    try {
      setLoading(true);

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name
          }
        }
      });

      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          setError('Ya existe una cuenta con este email. Por favor inicia sesión.');
        } else {
          setError('Error al registrar usuario. Por favor intenta nuevamente.');
        }
        return;
      }

      // Sign in the user immediately after registration
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) {
        setError('Cuenta creada pero hubo un error al iniciar sesión. Por favor intenta iniciar sesión manualmente.');
        navigate('/ingresar');
        return;
      }

      // Redirect to home on successful registration and login
      navigate('/');
    } catch (err) {
      setError('Error al registrar usuario. Por favor intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
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
            Crea tu cuenta
          </h2>
          <p className="mt-2 text-center text-sm text-gray-400">
            ¿Ya tienes una cuenta?{' '}
            <Link to="/ingresar" className="font-medium text-primary hover:text-primary-light">
              Inicia sesión
            </Link>
          </p>
        </div>
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          {error && (
            <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded relative">
              <span className="block sm:inline">{error}</span>
              {error.includes('Ya existe una cuenta') && (
                <div className="mt-2">
                  <Link to="/ingresar" className="font-medium underline hover:text-red-100">
                    Ir a iniciar sesión
                  </Link>
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
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-700 placeholder-gray-400 text-white rounded-t-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm bg-[#1f1f1f]"
                placeholder="Nombre completo"
              />
            </div>
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
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-700 placeholder-gray-400 text-white focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm bg-[#1f1f1f]"
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
                autoComplete="new-password"
                required
                value={formData.password}
                onChange={handleChange}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-700 placeholder-gray-400 text-white focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm bg-[#1f1f1f]"
                placeholder="Contraseña"
              />
            </div>
            <div>
              <label htmlFor="passwordConfirm" className="sr-only">
                Confirmar contraseña
              </label>
              <input
                id="passwordConfirm"
                name="passwordConfirm"
                type="password"
                autoComplete="new-password"
                required
                value={formData.passwordConfirm}
                onChange={handleChange}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-700 placeholder-gray-400 text-white rounded-b-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm bg-[#1f1f1f]"
                placeholder="Confirmar contraseña"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
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