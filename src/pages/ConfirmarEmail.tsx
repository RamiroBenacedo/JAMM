import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Mail, CheckCircle, RefreshCw, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getRedirectURL } from '../utils/config';

const ConfirmarEmail: React.FC = () => {
  const location = useLocation();
  const initialEmail = location.state?.email || '';
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [resendCount, setResendCount] = useState(0);

  const handleResendEmail = async () => {
    if (!email.trim()) {
      setError('Por favor ingresa tu email para reenviar la confirmación');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: getRedirectURL('/dashboard')
        }
      });

      if (resendError) {
        if (resendError.message.includes('Email rate limit exceeded')) {
          setError('Has enviado demasiados emails. Por favor espera unos minutos antes de intentar nuevamente.');
        } else if (resendError.message.includes('User already registered')) {
          setError('Esta cuenta ya está verificada. Puedes iniciar sesión.');
        } else {
          setError('Error al reenviar el email. Por favor intenta nuevamente.');
        }
        return;
      }

      setSuccess(true);
      setResendCount(prev => prev + 1);
      
      // Reset success message after 5 seconds
      setTimeout(() => setSuccess(false), 5000);

    } catch (err) {
      console.error('Resend email error:', err);
      setError('Error inesperado. Por favor intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (error) setError(null);
    if (success) setSuccess(false);
  };

  return (
    <div className="bg-[#2a2a2a] min-h-[calc(100vh-8rem)] flex items-center justify-center py-6 lg:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-4 lg:space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="bg-[#FF5722]/20 p-4 rounded-full">
              <Mail className="h-12 w-12 text-[#FF5722]" />
            </div>
          </div>
          <h2 className="text-2xl lg:text-3xl font-normal text-white mb-2" >
            Confirma tu Email
          </h2>
          <p className="text-gray-400 mb-6">
            Te hemos enviado un email de confirmación. Revisa tu bandeja de entrada y haz clic en el enlace para activar tu cuenta.
          </p>
        </div>

        {success && (
          <div className="bg-green-900/50 border border-green-500 text-green-200 px-4 py-3 rounded-lg flex items-center mb-6">
            <CheckCircle className="h-5 w-5 mr-2 flex-shrink-0" />
            <div>
              <p className="font-medium">
                Email reenviado exitosamente
              </p>
              <p className="text-sm mt-1">
                Revisa tu bandeja de entrada y spam
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg flex items-center mb-6">
            <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
            <span className="text-sm">
              {error}
            </span>
          </div>
        )}

        <div className="bg-[#1f1f1f] border border-gray-700 rounded-lg p-6 space-y-4">
          <div className="text-sm text-gray-400 space-y-3">
            <div className="flex items-start">
              <span className="text-[#FF5722] mr-2">•</span>
              <span>Revisa tu bandeja de entrada y la carpeta de spam</span>
            </div>
            <div className="flex items-start">
              <span className="text-[#FF5722] mr-2">•</span>
              <span>El enlace de confirmación expira en 24 horas</span>
            </div>
            <div className="flex items-start">
              <span className="text-[#FF5722] mr-2">•</span>
              <span>Una vez confirmado, podrás iniciar sesión normalmente</span>
            </div>
            {resendCount > 0 && (
              <div className="flex items-start text-green-400">
                <span className="text-green-400 mr-2">•</span>
                <span>Emails enviados: {resendCount + 1}</span>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
              Email (para reenviar confirmación)
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={handleEmailChange}
              className="block w-full px-3 py-2 border border-gray-700 rounded-md shadow-sm placeholder-gray-400 text-white bg-[#111111] focus:outline-none focus:ring-[#FF5722] focus:border-[#FF5722] sm:text-sm"
              placeholder="tu-email@ejemplo.com"
                          />
          </div>

          <button
            onClick={handleResendEmail}
            disabled={loading || !email.trim()}
            className="w-full flex justify-center items-center py-2 px-4 border border-gray-600 text-sm font-medium rounded-md text-gray-300 bg-transparent hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FF5722] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-transparent mr-2" />
                Reenviando...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Reenviar email de confirmación
              </>
            )}
          </button>
        </div>

        <div className="text-center space-y-4">
          <p className="text-sm text-gray-400">
            ¿Ya confirmaste tu email?
          </p>
          <Link 
            to="/ingresar" 
            className="inline-block bg-[#FF5722] text-white px-6 py-2 rounded-lg hover:bg-opacity-90 transition-colors font-medium"
                      >
            Iniciar Sesión
          </Link>
        </div>

        <div className="text-center pt-4">
          <Link 
            to="/" 
            className="text-sm text-gray-400 hover:text-gray-300 transition-colors"
                      >
            ← Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ConfirmarEmail;