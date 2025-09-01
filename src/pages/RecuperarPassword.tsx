import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getRedirectURL } from '../utils/config';

const RecuperarPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validación de email vacío
    if (!email.trim()) {
      setError('Por favor ingresa tu email');
      return;
    }

    // Validación de formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Por favor ingresa un email válido');
      return;
    }

    try {
      setLoading(true);

      // Usar la función de Supabase para enviar el email de recuperación
      // NOTA: En Supabase Dashboard debes tener habilitado:
      // 1. Auth por email en Authentication > Settings
      // 2. Template de "Reset Password" activado en Authentication > Email Templates
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          // URL de redirección después de hacer click en el enlace del email
          redirectTo: getRedirectURL('/restablecer-password')
        }
      );

      if (resetError) {
        console.error('Reset password error:', resetError);
        
        // Manejo de errores específicos
        if (resetError.message.includes('User not found')) {
          setError('No existe una cuenta registrada con este email.');
        } else if (resetError.message.includes('Email rate limit exceeded')) {
          setError('Demasiados intentos. Por favor espera unos minutos antes de intentar nuevamente.');
        } else {
          setError('Error al enviar el email de recuperación. Por favor intenta nuevamente.');
        }
        return;
      }

      // Si llega aquí, el email se envió exitosamente
      setSuccess(true);
      setEmail(''); // Limpiar el campo

    } catch (err) {
      console.error('Unexpected error:', err);
      setError('Error inesperado. Por favor intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    // Limpiar errores al empezar a escribir
    if (error) setError(null);
    if (success) setSuccess(false);
  };

  return (
    <div className="bg-[#2a2a2a] min-h-[calc(100vh-8rem)] flex items-center justify-center py-6 lg:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-4 lg:space-y-8">
        <div>
          <div className="flex justify-center">
            <Link 
              to="/ingresar" 
              className="flex items-center text-[#FF5722] hover:text-opacity-90 transition-colors mb-4"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              <span style={{ fontFamily: 'Inter, sans-serif' }}>Volver al login</span>
            </Link>
          </div>
          <h2 className="mt-6 text-center text-2xl lg:text-3xl font-normal text-white" >
            Recuperar Contraseña
          </h2>
          <p className="mt-2 text-center text-xs lg:text-sm text-gray-400" style={{ fontFamily: 'Inter, sans-serif' }}>
            Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña
          </p>
        </div>

        {success ? (
          <div className="text-center space-y-6">
            <div className="bg-green-900/50 border border-green-500 text-green-200 px-4 py-3 rounded-lg flex items-center">
              <CheckCircle className="h-5 w-5 mr-2 flex-shrink-0" />
              <div className="text-left">
                <p className="font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>
                  ¡Email enviado exitosamente!
                </p>
                <p className="text-xs lg:text-sm mt-1" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Revisa tu correo para restablecer tu contraseña
                </p>
              </div>
            </div>
            
            <div className="text-xs lg:text-sm text-gray-400 space-y-2" style={{ fontFamily: 'Inter, sans-serif' }}>
              <p>• Revisa tu bandeja de entrada y spam</p>
              <p>• El enlace expira en 1 hora</p>
              <p>• Si no recibes el email, intenta nuevamente</p>
            </div>

            <button
              onClick={() => {
                setSuccess(false);
                setEmail('');
              }}
              className="text-[#FF5722] hover:text-opacity-90 transition-colors text-xs lg:text-sm"
                          >
              Enviar a otro email
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            {error && (
              <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg flex items-center">
                <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
                <span className="text-xs lg:text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
                  {error}
                </span>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-xs lg:text-sm font-medium text-gray-300 mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={handleEmailChange}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-700 rounded-md shadow-sm placeholder-gray-400 text-white bg-[#1f1f1f] focus:outline-none focus:ring-[#FF5722] focus:border-[#FF5722] sm:text-xs lg:text-sm"
                  placeholder="Ingresa tu email"
                                  />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-xs lg:text-sm font-medium rounded-md text-white bg-[#FF5722] hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FF5722] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                    Enviando...
                  </>
                ) : (
                  'Enviar enlace de recuperación'
                )}
              </button>
            </div>
          </form>
        )}

        <div className="text-center">
          <p className="text-xs lg:text-sm text-gray-400" style={{ fontFamily: 'Inter, sans-serif' }}>
            ¿Recordaste tu contraseña?{' '}
            <Link to="/ingresar" className="font-medium text-[#FF5722] hover:text-opacity-90 transition-colors">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RecuperarPassword;