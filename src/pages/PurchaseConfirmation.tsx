import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

// Datos hardcodeados
const MOCK_EVENT_DATA = {
  eventName: "Noche de Jazz en Club Verde",
  date: "Sábado 15 de Marzo, 2025",
  venue: "Club Verde - Palermo"
};

const userEmail = "ramiro@example.com";

// Variantes de animación
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      delayChildren: 0.15,
      staggerChildren: 0.08
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6
    }
  }
};

const overlayVariants = {
  hidden: {
    clipPath: "polygon(100% 0%, 100% 0%, 100% 100%, 100% 100%)"
  },
  visible: {
    clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
    transition: {
      duration: 0.9
    }
  }
};

type PaymentStatus = 'loading' | 'success' | 'failed' | 'error';

const PurchaseConfirmation: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('loading');
  const [showSuccess, setShowSuccess] = useState(false);

  // Función para validar el pago con Mercado Pago
  const validatePayment = async (paymentId: string, preferenceId: string) => {
    try {
      // Simular llamada al webhook/API de validación
      // En producción, esto haría una llamada real a tu backend
      console.log('Validating payment:', { paymentId, preferenceId });

      // Simular diferentes respuestas basadas en parámetros URL
      const status = searchParams.get('status');
      const collection_status = searchParams.get('collection_status');

      // Simular delay de validación
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Lógica de validación basada en parámetros de Mercado Pago
      if (status === 'approved' || collection_status === 'approved') {
        return { success: true, status: 'approved' };
      } else if (status === 'rejected' || collection_status === 'rejected') {
        return { success: false, status: 'rejected', message: 'El pago fue rechazado' };
      } else if (status === 'pending' || collection_status === 'pending') {
        return { success: false, status: 'pending', message: 'El pago está pendiente' };
      } else {
        // Para testing: simular éxito por defecto si no hay parámetros específicos
        return { success: true, status: 'approved' };
      }
    } catch (error) {
      console.error('Error validating payment:', error);
      return { success: false, status: 'error', message: 'Error al validar el pago' };
    }
  };

  useEffect(() => {
    const processPayment = async () => {
      // Obtener parámetros de la URL (enviados por Mercado Pago)
      const paymentId = searchParams.get('payment_id') || searchParams.get('collection_id');
      const preferenceId = searchParams.get('preference_id');
      const merchantOrderId = searchParams.get('merchant_order_id');

      console.log('Payment params:', { paymentId, preferenceId, merchantOrderId });

      if (!paymentId) {
        // Si no hay payment_id, asumir error
        setPaymentStatus('error');
        return;
      }

      try {
        const result = await validatePayment(paymentId, preferenceId || '');

        if (result.success) {
          setPaymentStatus('success');
          setShowSuccess(true);
        } else {
          setPaymentStatus('failed');
        }
      } catch (error) {
        console.error('Payment processing error:', error);
        setPaymentStatus('error');
      }
    };

    processPayment();
  }, [searchParams]);

  useEffect(() => {
    // Prevenir overscroll (bounce) en iOS y otros navegadores
    const preventOverscroll = (e: TouchEvent) => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

      if (scrollTop === 0 && e.touches.length === 1) {
        const touch = e.touches[0];
        const startY = touch.clientY;

        const handleTouchMove = (moveEvent: TouchEvent) => {
          const currentY = moveEvent.touches[0].clientY;
          const deltaY = currentY - startY;

          if (deltaY > 0 && scrollTop === 0) {
            moveEvent.preventDefault();
          }
        };

        const handleTouchEnd = () => {
          document.removeEventListener('touchmove', handleTouchMove);
          document.removeEventListener('touchend', handleTouchEnd);
        };

        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.addEventListener('touchend', handleTouchEnd);
      }
    };

    document.body.style.overscrollBehavior = 'none';
    document.addEventListener('touchstart', preventOverscroll, { passive: false });

    return () => {
      document.body.style.overscrollBehavior = 'auto';
      document.removeEventListener('touchstart', preventOverscroll);
    };
  }, []);

  return (
    <div className="relative bg-neutral-900 text-black px-6 grid place-items-center min-h-screen">
      {/* Overlay verde */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            className="absolute inset-0 bg-emerald-500 z-0"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
          />
        )}
      </AnimatePresence>

      {/* Contenido principal */}
      <div className="relative z-10 w-full max-w-sm mx-auto text-center">
        <AnimatePresence mode="wait">
          {paymentStatus === 'loading' ? (
            // Estado de carga
            <motion.div
              key="loading"
              className="flex flex-col items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mb-6"></div>
              <p className="text-white text-lg">
                Confirmando tu compra…
              </p>
            </motion.div>
          ) : paymentStatus === 'success' ? (
            // Estado de éxito
            <motion.div
              key="success"
              className="flex flex-col items-center gap-6"
              variants={containerVariants}
              initial="hidden"
              animate="show"
            >
              {/* Favicon */}
              <motion.div
                variants={itemVariants}
                className="mx-auto mb-2 flex items-center justify-center"
              >
                <img
                  src="/favicon.png"
                  alt="JAMM Logo"
                  style={{
                    height: window.innerWidth >= 1024 ? '96px' : '140px',
                    width: 'auto'
                  }}
                />
              </motion.div>

              {/* Título principal en dos líneas */}
              <motion.div variants={itemVariants}>
                <h1 className="font-black uppercase tracking-tight leading-[0.95] text-4xl sm:text-5xl">
                  ¡NOS VEMOS  AHÍ!
                </h1>
              </motion.div>

              {/* Detalles del evento */}
              <motion.div variants={itemVariants}>
                <div className="text-base leading-snug max-w-xs mx-auto mt-2">
                  <p className="font-semibold">{MOCK_EVENT_DATA.eventName}</p>
                  <p>{MOCK_EVENT_DATA.date}</p>
                  <p>{MOCK_EVENT_DATA.venue}</p>
                </div>
              </motion.div>

              {/* Email */}
              <motion.div variants={itemVariants}>
                <p className="text-sm opacity-80 mt-2">
                  Te enviamos las entradas a {userEmail}
                </p>
              </motion.div>

              {/* Botón */}
              <motion.div variants={itemVariants} className="mt-6">
                <Link
                  to="/"
                  className="inline-flex items-center justify-center h-12 px-6 rounded-full bg-black text-white font-semibold text-sm active:scale-[0.99] w-full max-w-[220px] mx-auto transition-transform duration-150"
                >
                  Volver al inicio
                </Link>
              </motion.div>
            </motion.div>
          ) : (
            // Estado de error/fallo
            <motion.div
              key="error"
              className="flex flex-col items-center gap-6"
              variants={containerVariants}
              initial="hidden"
              animate="show"
            >
              {/* Icono de error */}
              <motion.div
                variants={itemVariants}
                className="mx-auto mb-2 flex items-center justify-center"
              >
                <div className="w-20 h-20 bg-gray-600 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-10 h-10 text-gray-300" />
                </div>
              </motion.div>

              {/* Título de error */}
              <motion.div variants={itemVariants}>
                <h1 className="font-black uppercase tracking-tight leading-[0.95] text-3xl sm:text-4xl text-white">
                  ALGO SALIÓ MAL
                </h1>
              </motion.div>

              {/* Mensaje de error */}
              <motion.div variants={itemVariants}>
                <div className="text-base leading-snug max-w-xs mx-auto mt-2 text-gray-300">
                  <p className="mb-3">
                    {paymentStatus === 'failed'
                      ? 'No pudimos procesar tu pago correctamente.'
                      : 'Hubo un problema al confirmar tu compra.'
                    }
                  </p>
                  <p className="text-sm text-gray-400">
                    Por favor, intenta nuevamente o contacta a nuestro soporte.
                  </p>
                </div>
              </motion.div>

              {/* Botones de acción */}
              <motion.div variants={itemVariants} className="mt-6 space-y-3 w-full max-w-[220px] mx-auto">
                <button
                  onClick={() => window.location.reload()}
                  className="inline-flex items-center justify-center h-12 px-6 rounded-full bg-gray-700 hover:bg-gray-600 text-white font-semibold text-sm active:scale-[0.99] w-full transition-all duration-150"
                >
                  <RefreshCcw className="w-4 h-4 mr-2" />
                  Intentar nuevamente
                </button>

                <Link
                  to="/eventos"
                  className="inline-flex items-center justify-center h-12 px-6 rounded-full bg-transparent border-2 border-gray-600 text-gray-300 hover:text-white hover:border-gray-500 font-semibold text-sm active:scale-[0.99] w-full transition-all duration-150"
                >
                  Ver otros eventos
                </Link>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default PurchaseConfirmation;