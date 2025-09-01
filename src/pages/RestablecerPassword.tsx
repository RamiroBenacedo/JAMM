import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

const RestablecerPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Verificar si hay una sesión activa (necesaria para cambiar la contraseña)
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Si no hay sesión, redirigir al login
        navigate('/ingresar');
      }
    };
    
    checkSession();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validaciones
    if (!password.trim() || !confirmPassword.trim()) {
      setError('Por favor completa todos los campos');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    try {
      setLoading(true);

      // Actualizar la contraseña del usuario
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) {
        console.error('Update password error:', updateError);
        setError('Error al actualizar la contraseña. Por favor intenta nuevamente.');
        return;
      }

      setSuccess(true);
      
      // Redirigir al login después de 3 segundos
      setTimeout(() => {
        navigate('/ingresar');
      }, 3000);

    } catch (err) {
      console.error('Unexpected error:', err);
      setError('Error inesperado. Por favor intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (error) setError(null);
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmPassword(e.target.value);
    if (error) setError(null);
  };

  if (success) {
    return (
      <div className="bg-[#2a2a2a] min-h-[calc(100vh-8rem)] flex items-center justify-center py-6 lg:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full text-center space-y-4 lg:space-y-8">
          <div className="bg-green-900/50 border border-green-500 text-green-200 px-6 py-8 rounded-lg">
            <CheckCircle className="h-16 w-16 mx-auto mb-4" />
            <h2 className="text-xl lg:text-2xl font-normal text-white mb-2" >
              ¡Contraseña actualizada!
            </h2>
            <p style={{ fontFamily: 'Inter, sans-serif' }}>
              Tu contraseña ha sido cambiada exitosamente.
            </p>
            <p className="text-xs lg:text-sm mt-2" style={{ fontFamily: 'Inter, sans-serif' }}>
              Serás redirigido al login en unos segundos...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#2a2a2a] min-h-[calc(100vh-8rem)] flex items-center justify-center py-6 lg:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-4 lg:space-y-8">
        <div>
          <h2 className="mt-6 text-center text-xl lg:text-2xl lg:text-3xl font-normal text-white" >
            Restablecer Contraseña
          </h2>
          <p className="mt-2 text-center text-xs lg:text-sm text-gray-400" style={{ fontFamily: 'Inter, sans-serif' }}>
            Ingresa tu nueva contraseña
          </p>
        </div>

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
            <label htmlFor="password" className="block text-xs lg:text-sm font-medium text-gray-300 mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>
              Nueva Contraseña
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={handlePasswordChange}
                className="block w-full pr-10 px-3 py-2 border border-gray-700 rounded-md shadow-sm placeholder-gray-400 text-white bg-[#1f1f1f] focus:outline-none focus:ring-[#FF5722] focus:border-[#FF5722] sm:text-xs lg:text-sm"
                placeholder="Ingresa tu nueva contraseña (mín. 6 caracteres)"
                              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-xs lg:text-sm font-medium text-gray-300 mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>
              Confirmar Nueva Contraseña
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={handleConfirmPasswordChange}
                className="block w-full pr-10 px-3 py-2 border border-gray-700 rounded-md shadow-sm placeholder-gray-400 text-white bg-[#1f1f1f] focus:outline-none focus:ring-[#FF5722] focus:border-[#FF5722] sm:text-xs lg:text-sm"
                placeholder="Confirma tu nueva contraseña"
                              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400" />
                )}
              </button>
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
                  Actualizando...
                </>
              ) : (
                'Actualizar Contraseña'
              )}
            </button>
          </div>
        </form>

        <div className="text-xs lg:text-sm text-gray-400 text-center space-y-2" style={{ fontFamily: 'Inter, sans-serif' }}>
          <p>• La contraseña debe tener al menos 6 caracteres</p>
          <p>• Usa una combinación de letras, números y símbolos</p>
        </div>
      </div>
    </div>
  );
};

export default RestablecerPassword;