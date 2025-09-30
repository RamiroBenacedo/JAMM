import React, { useState, useEffect } from 'react';
import { Settings, Mail, Lock, CheckCircle, AlertCircle, User, Eye, EyeOff, CreditCard, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
type MpStatus = 'none' | 'active' | 'expired';
const Configuracion = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [rol, setRol] = useState<string | null>(null);
  const [userData, setUserData] = useState<{
    full_name: string | null;
    email: string | null;
    hasPassword: boolean;
    isOAuthUser: boolean;
  }>({
    full_name: null,
    email: null,
    hasPassword: false,
    isOAuthUser: false
  });
  
  // Estados para el cambio de email
  const [emailForm, setEmailForm] = useState({
    newEmail: '',
    password: ''
  });
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);

  // Estados para el cambio de password
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  
  // Estados para mostrar/ocultar contraseñas
  const [showEmailPassword, setShowEmailPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [mpConnected, setMpConnected] = useState<boolean>(false);
  const [mpExpiry, setMpExpiry] = useState<Date | null>(null);
  const [mpStatus, setMpStatus] = useState<MpStatus>('none');

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;

      try {
        setLoading(true);

        // Obtener rol del usuario
        const { data: profileData } = await supabase
          .from('profiles')
          .select('rol')
          .eq('user_id', user.id)
          .single();

        setRol(profileData?.rol || null);

        const { data: { user: userData }, error: userError } = await supabase.auth.getUser();

        if (userError) throw userError;
        
        // Detectar si el usuario es de OAuth (Google, Facebook, etc.)
        const isOAuthUser = userData?.app_metadata?.providers?.length > 0 && 
                           !userData?.app_metadata?.providers?.includes('email');
        
        // Para usuarios OAuth, asumimos que no tienen contraseña inicialmente
        // Para usuarios de email, asumimos que sí tienen contraseña
        const hasPassword = !isOAuthUser;

        setUserData({
          full_name: userData?.user_metadata?.full_name || 'Usuario',
          email: userData?.email || '',
          hasPassword,
          isOAuthUser
        });
        
        setEmailForm(prev => ({
          ...prev,
          newEmail: userData?.email || ''
        }));
        const { data: mpRow, error: mpErr } = await supabase
          .from('mp_vendedores')
          .select('created_at, expires_in')
          .eq('creator_id', user.id)
          .maybeSingle();

        function calcExpiry(created_at: string, expires_in?: number | null): Date | null {
          if (!expires_in) return null;
          const base = new Date(created_at);
          return new Date(base.getTime() + expires_in * 1000);
        }

        if (!mpErr && mpRow) {
          const exp = calcExpiry(mpRow.created_at, mpRow.expires_in);
          const isActive = !!exp && exp.getTime() > Date.now();

          setMpExpiry(exp ?? null);
          setMpConnected(isActive);
          setMpStatus(isActive ? 'active' : 'expired');
        } else {
          setMpExpiry(null);
          setMpConnected(false);
          setMpStatus('none');
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user]);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmailForm({
      ...emailForm,
      [e.target.name]: e.target.value
    });
    if (emailError) setEmailError(null);
    if (emailSuccess) setEmailSuccess(null);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordForm({
      ...passwordForm,
      [e.target.name]: e.target.value
    });
    if (passwordError) setPasswordError(null);
    if (passwordSuccess) setPasswordSuccess(null);
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(null);
    setEmailSuccess(null);

    const { newEmail, password } = emailForm;

    // Validaciones
    if (!newEmail.trim() || !password.trim()) {
      setEmailError('Todos los campos son obligatorios');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      setEmailError('Por favor ingresa un email válido');
      return;
    }

    if (newEmail === userData.email) {
      setEmailError('El nuevo email debe ser diferente al actual');
      return;
    }

    try {
      setEmailLoading(true);

      // Primero verificamos la contraseña actual
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userData.email || '',
        password: password
      });

      if (signInError) {
        setEmailError('Contraseña incorrecta');
        return;
      }

      // Actualizamos el email
      const { error: updateError } = await supabase.auth.updateUser({
        email: newEmail
      });

      if (updateError) {
        if (updateError.message.includes('already been taken')) {
          setEmailError('Este email ya está en uso por otra cuenta');
        } else {
          setEmailError('Error al actualizar el email. Intenta nuevamente.');
        }
        return;
      }

      setEmailSuccess('Se ha enviado un email de confirmación a tu nueva dirección. Revisa tu bandeja de entrada.');
      setEmailForm({ newEmail: '', password: '' });
    } catch (err) {
      console.error('Error updating email:', err);
      setEmailError('Error al actualizar el email. Intenta nuevamente.');
    } finally {
      setEmailLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    const { currentPassword, newPassword, confirmPassword } = passwordForm;

    // Validaciones básicas
    if (!newPassword.trim() || !confirmPassword.trim()) {
      setPasswordError('Todos los campos son obligatorios');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Las contraseñas nuevas no coinciden');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }

    // Validaciones específicas según el tipo de usuario
    if (userData.hasPassword) {
      // Usuario con contraseña existente
      if (!currentPassword.trim()) {
        setPasswordError('La contraseña actual es obligatoria');
        return;
      }
      
      if (currentPassword === newPassword) {
        setPasswordError('La nueva contraseña debe ser diferente a la actual');
        return;
      }
    }

    try {
      setPasswordLoading(true);

      // Si el usuario tiene contraseña, verificamos la contraseña actual
      if (userData.hasPassword) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: userData.email || '',
          password: currentPassword
        });

        if (signInError) {
          setPasswordError('Contraseña actual incorrecta');
          return;
        }
      }

      // Actualizamos la contraseña (esto funciona tanto para crear como para cambiar)
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        setPasswordError('Error al actualizar la contraseña. Intenta nuevamente.');
        return;
      }

      // Si era un usuario OAuth, ahora tiene contraseña
      if (!userData.hasPassword) {
        setUserData(prev => ({ ...prev, hasPassword: true }));
      }

      setPasswordSuccess(userData.hasPassword ? 'Contraseña actualizada exitosamente' : 'Contraseña creada exitosamente');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      console.error('Error updating password:', err);
      setPasswordError('Error al actualizar la contraseña. Intenta nuevamente.');
    } finally {
      setPasswordLoading(false);
    }
  };
  function generateStateString(params: Record<string,string>) {
  const usp = new URLSearchParams(params)
  return usp.toString()
}

  function generateShortId(): string {
    const letters = Math.random().toString(36).substring(2, 8) // 6 chars
    const digits = Math.floor(Math.random() * 90 + 10)         // 2 dígitos 10-99
    return `${letters}${digits}`
  }

  const handleMercadoPagoConnect = () => {
    // cliente: podés usar user.id o un identificador estable de tu negocio
    const cliente = (user?.id as string) || generateShortId()
    const creatorId = (user?.id as string) || ''

    const state = generateStateString({ id: cliente, creator_id: creatorId })

    // (opcional) anti-CSRF: guardar state para validarlo luego
    sessionStorage.setItem('mp_state', state)

    const params = new URLSearchParams({
      client_id: '4561360244072920',
      response_type: 'code',
      platform_id: 'mp',
      state,
      redirect_uri: `${window.location.origin}/oauth`
    })

    const mercadoPagoAuthUrl = `https://auth.mercadopago.com.ar/authorization?${params.toString()}`

    window.location.href = mercadoPagoAuthUrl
  }

  function calcExpiry(created_at: string, expires_in?: number | null): Date | null {
    if (!expires_in) return null
    const base = new Date(created_at)
    return new Date(base.getTime() + expires_in * 1000)
  }


  if (loading) {
    return (
      <div className="bg-[#2a2a2a] min-h-[calc(100vh-8rem)]">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FF5722]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#2a2a2a] min-h-[calc(100vh-8rem)]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-[#1f1f1f] shadow rounded-lg border border-gray-700">
          <div className="px-4 py-5 sm:px-6">
            <div className="flex items-center space-x-2">
              <Settings className="h-6 w-6 text-[#FF5722]" />
              <h2 className="text-xl lg:text-2xl font-bold text-white" >
                Configuración de Cuenta
              </h2>
            </div>
            <div className="mt-2 flex items-center space-x-2 text-gray-400">
              <User className="h-4 w-4" />
              <span style={{ fontFamily: 'Inter, sans-serif' }}>{userData.full_name}</span>
            </div>
          </div>
          
          <div className="border-t border-gray-700">
            <div className="px-4 py-5 sm:p-6">
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">

                {/* Sección de Mercado Pago - Solo para productoras */}
                {rol === 'productora' && (
                  <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center space-x-2">
                      <CreditCard className="h-5 w-5 text-[#FF5722]" />
                      <h3 className="text-base lg:text-lg font-medium text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
                        Integración con Mercado Pago
                      </h3>
                    </div>

                    <div className="bg-[#111111] border border-gray-700 rounded-lg p-6">
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-white mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>
                            Estado de la Conexión
                          </h4>
                          <div className="space-y-3">
                            <div className="flex items-center space-x-2">
                              <div className={`w-2 h-2 rounded-full ${mpConnected ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                              <span className={`text-sm ${mpConnected ? 'text-green-400' : 'text-gray-400'}`}>
                                {mpConnected ? 'Activa' : 'No conectada'}
                              </span>
                            </div>
                            <div className="text-xs text-gray-400">
                              <p>
                                Token válido hasta:{' '}
                                <span className="text-white">
                                  {mpExpiry ? mpExpiry.toLocaleString('es-AR', {
                                    timeZone: 'America/Argentina/Buenos_Aires',
                                    year: 'numeric',
                                    month: '2-digit',
                                    day: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  }) : '—'}
                                </span>
                              </p>
                            </div>
                          </div>

                        </div>

                        <div className="flex flex-col gap-3">
                          <button
                            onClick={handleMercadoPagoConnect}
                            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#00B5D8] hover:bg-[#0095B3] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00B5D8] transition-colors"
                          >
                            <CreditCard className="h-4 w-4 mr-2" />
                            Conectar a Mercado Pago
                            <ExternalLink className="h-3 w-3 ml-2" />
                          </button>

                          <p className="text-xs text-gray-500 text-center" style={{ fontFamily: 'Inter, sans-serif' }}>
                            Se abrirá en una nueva ventana
                          </p>
                        </div>
                      </div>

                      <div className="mt-6 pt-4 border-t border-gray-700">
                        <h5 className="text-xs font-medium text-gray-300 mb-3" style={{ fontFamily: 'Inter, sans-serif' }}>
                          Panel de Control
                        </h5>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                          <div className="bg-[#2a2a2a] p-3 rounded">
                            <div className="text-gray-400 mb-1">Estado</div>
                            <div className={
                              mpStatus === 'active' ? 'text-green-400 font-medium'
                              : mpStatus === 'expired' ? 'text-yellow-400 font-medium'
                              : 'text-gray-400 font-medium'
                            }>
                              {mpStatus === 'active' ? 'Activa' : mpStatus === 'expired' ? 'Desactivada' : 'Aguardando conexión'}
                            </div>
                          </div>
                          <div className="bg-[#2a2a2a] p-3 rounded">
                              <div className="bg-[#2a2a2a] p-3 rounded">
                              <div className="text-gray-400 mb-1">Vencimiento</div>
                              <div className="text-white font-medium">
                                {mpExpiry ? mpExpiry.toLocaleString('es-AR', {
                                  timeZone: 'America/Argentina/Buenos_Aires',
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                }) : '—'}
                              </div>
                            </div>
                          </div>
                          <div className="bg-[#2a2a2a] p-3 rounded">
                            <div className="text-gray-400 mb-1">Fecha de Conexión</div>
                            <div className="text-white font-medium">
                              {mpConnected && mpExpiry ? new Date(mpExpiry.getTime() - (mpExpiry.getTimezoneOffset() * 60000)).toLocaleDateString() : '—'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Formulario para cambiar email */}
                <div className="space-y-6">
                  <div className="flex items-center space-x-2">
                    <Mail className="h-5 w-5 text-[#FF5722]" />
                    <h3 className="text-base lg:text-lg font-medium text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
                      Cambiar Email
                    </h3>
                  </div>
                  
                  <form onSubmit={handleEmailSubmit} className="space-y-4">
                    {emailError && (
                      <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg flex items-center">
                        <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
                        <span className="text-xs lg:text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>{emailError}</span>
                      </div>
                    )}
                    
                    {emailSuccess && (
                      <div className="bg-green-900/50 border border-green-500 text-green-200 px-4 py-3 rounded-lg flex items-center">
                        <CheckCircle className="h-5 w-5 mr-2 flex-shrink-0" />
                        <span className="text-xs lg:text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>{emailSuccess}</span>
                      </div>
                    )}
                    
                    <div>
                      <label className="block text-xs lg:text-sm font-medium text-gray-300 mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>
                        Email actual: <span className="text-gray-400">{userData.email}</span>
                      </label>
                    </div>
                    
                    <div>
                      <label htmlFor="newEmail" className="block text-xs lg:text-sm font-medium text-gray-300 mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>
                        Nuevo Email
                      </label>
                      <input
                        id="newEmail"
                        name="newEmail"
                        type="email"
                        required
                        value={emailForm.newEmail}
                        onChange={handleEmailChange}
                        className="block w-full px-3 py-2 border border-gray-700 rounded-md shadow-sm placeholder-gray-400 text-white bg-[#111111] focus:outline-none focus:ring-[#FF5722] focus:border-[#FF5722]"
                        placeholder="Ingresa tu nuevo email"
                                              />
                    </div>
                    
                    <div>
                      <label htmlFor="emailPassword" className="block text-xs lg:text-sm font-medium text-gray-300 mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>
                        Confirma tu contraseña actual
                      </label>
                      <div className="relative">
                        <input
                          id="emailPassword"
                          name="password"
                          type={showEmailPassword ? "text" : "password"}
                          required
                          value={emailForm.password}
                          onChange={handleEmailChange}
                          className="block w-full px-3 py-2 pr-10 border border-gray-700 rounded-md shadow-sm placeholder-gray-400 text-white bg-[#111111] focus:outline-none focus:ring-[#FF5722] focus:border-[#FF5722]"
                          placeholder="Contraseña actual"
                                                  />
                        <button
                          type="button"
                          onClick={() => setShowEmailPassword(!showEmailPassword)}
                          className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-white transition-colors"
                          tabIndex={-1}
                        >
                          {showEmailPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                    
                    <button
                      type="submit"
                      disabled={emailLoading}
                      className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-xs lg:text-sm font-medium text-white bg-[#FF5722] hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FF5722] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                          >
                      {emailLoading ? 'Actualizando...' : 'Actualizar Email'}
                    </button>
                  </form>
                </div>

                {/* Formulario para cambiar/crear contraseña */}
                <div className="space-y-6">
                  <div className="flex items-center space-x-2">
                    <Lock className="h-5 w-5 text-[#FF5722]" />
                    <h3 className="text-base lg:text-lg font-medium text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
                      {userData.hasPassword ? 'Cambiar Contraseña' : 'Crear Contraseña'}
                    </h3>
                  </div>
                  
                  {userData.isOAuthUser && !userData.hasPassword && (
                    <div className="bg-blue-900/50 border border-blue-500 text-blue-200 px-4 py-3 rounded-lg">
                      <p className="text-xs lg:text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
                        Puedes crear una contraseña para poder iniciar sesión con email además de Google.
                      </p>
                    </div>
                  )}
                  
                  <form onSubmit={handlePasswordSubmit} className="space-y-4">
                    {passwordError && (
                      <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg flex items-center">
                        <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
                        <span className="text-xs lg:text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>{passwordError}</span>
                      </div>
                    )}
                    
                    {passwordSuccess && (
                      <div className="bg-green-900/50 border border-green-500 text-green-200 px-4 py-3 rounded-lg flex items-center">
                        <CheckCircle className="h-5 w-5 mr-2 flex-shrink-0" />
                        <span className="text-xs lg:text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>{passwordSuccess}</span>
                      </div>
                    )}
                    
                    {userData.hasPassword && (
                      <div>
                        <label htmlFor="currentPassword" className="block text-xs lg:text-sm font-medium text-gray-300 mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>
                          Contraseña Actual
                        </label>
                        <div className="relative">
                          <input
                            id="currentPassword"
                            name="currentPassword"
                            type={showCurrentPassword ? "text" : "password"}
                            required
                            value={passwordForm.currentPassword}
                            onChange={handlePasswordChange}
                            className="block w-full px-3 py-2 pr-10 border border-gray-700 rounded-md shadow-sm placeholder-gray-400 text-white bg-[#111111] focus:outline-none focus:ring-[#FF5722] focus:border-[#FF5722]"
                            placeholder="Ingresa tu contraseña actual"
                                                      />
                          <button
                            type="button"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-white transition-colors"
                            tabIndex={-1}
                          >
                            {showCurrentPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                    
                    <div>
                      <label htmlFor="newPassword" className="block text-xs lg:text-sm font-medium text-gray-300 mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>
                        {userData.hasPassword ? 'Nueva Contraseña' : 'Contraseña'}
                      </label>
                      <div className="relative">
                        <input
                          id="newPassword"
                          name="newPassword"
                          type={showNewPassword ? "text" : "password"}
                          required
                          value={passwordForm.newPassword}
                          onChange={handlePasswordChange}
                          className="block w-full px-3 py-2 pr-10 border border-gray-700 rounded-md shadow-sm placeholder-gray-400 text-white bg-[#111111] focus:outline-none focus:ring-[#FF5722] focus:border-[#FF5722]"
                          placeholder={userData.hasPassword ? "Ingresa tu nueva contraseña (mín. 6 caracteres)" : "Ingresa tu contraseña (mín. 6 caracteres)"}
                                                  />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-white transition-colors"
                          tabIndex={-1}
                        >
                          {showNewPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <label htmlFor="confirmPassword" className="block text-xs lg:text-sm font-medium text-gray-300 mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>
                        {userData.hasPassword ? 'Confirmar Nueva Contraseña' : 'Confirmar Contraseña'}
                      </label>
                      <div className="relative">
                        <input
                          id="confirmPassword"
                          name="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          required
                          value={passwordForm.confirmPassword}
                          onChange={handlePasswordChange}
                          className="block w-full px-3 py-2 pr-10 border border-gray-700 rounded-md shadow-sm placeholder-gray-400 text-white bg-[#111111] focus:outline-none focus:ring-[#FF5722] focus:border-[#FF5722]"
                          placeholder={userData.hasPassword ? "Confirma tu nueva contraseña" : "Confirma tu contraseña"}
                                                  />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-white transition-colors"
                          tabIndex={-1}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                    
                    <button
                      type="submit"
                      disabled={passwordLoading}
                      className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-xs lg:text-sm font-medium text-white bg-[#FF5722] hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FF5722] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                          >
                      {passwordLoading 
                        ? (userData.hasPassword ? 'Actualizando...' : 'Creando...') 
                        : (userData.hasPassword ? 'Actualizar Contraseña' : 'Crear Contraseña')
                      }
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Configuracion;