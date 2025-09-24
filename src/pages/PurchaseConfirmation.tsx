import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
// Datos hardcodeados
/*const MOCK_EVENT_DATA = {
  eventName: "Noche de Jazz en Club Verde",
  date: "Sábado 15 de Marzo, 2025",
  venue: "Club Verde - Palermo"
};*/

//const userEmail = "ramiro@example.com";

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
  const [buyerEmail, setBuyerEmail] = useState<string>('');
  const [eventInfo, setEventInfo] = useState<{ name: string; date: string; location: string } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [faviconSize, setFaviconSize] = useState<number>(96);
  // Función para validar el pago con Mercado Pago

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1) event_id desde la URL
        const eventId = searchParams.get('event_id');
        if (!eventId) throw new Error('Falta event_id en la URL');

        // 2) Cargar evento desde Supabase
        const { data: ev, error: evErr } = await supabase
          .from('events')
          .select('id, name, date, location') // ajustá a tu schema
          .eq('id', eventId)
          .single();

        if (evErr || !ev) throw new Error('No se pudo obtener la información del evento');

        // 3) Email: sesión o external_reference (userId__email)
        const { data: authData } = await supabase.auth.getUser();
        let finalEmail = authData?.user?.email ?? '';

        if (!finalEmail) {
          const extRefRaw = searchParams.get('external_reference');
          if (extRefRaw) {
            const extRef = decodeURIComponent(extRefRaw);
            const parts = extRef.split('__');
            if (parts.length > 1) finalEmail = parts[1] || '';
          }
        }

        if (!isMounted) return;

        setEventInfo({ name: ev.name, date: ev.date, location: ev.location });
        setBuyerEmail(finalEmail);
        setLoading(false);
      } catch (e: any) {
        if (!isMounted) return;
        setError(e?.message || 'Error cargando la confirmación');
        setLoading(false);
      }
    };

    run();

    return () => { isMounted = false; };
  }, [searchParams]);
  useEffect(() => {
  const statusParam = (searchParams.get('status') || searchParams.get('collection_status') || '').toLowerCase();

  if (statusParam === 'approved') {
    setPaymentStatus('success');
    setShowSuccess(true);
  } else if (statusParam === 'rejected') {
    setPaymentStatus('failed');
    setShowSuccess(false);
  } else if (statusParam === 'pending') {
    // Podés mostrar una pantalla específica si querés; acá lo trato como "fallo suave"
    setPaymentStatus('failed');
    setShowSuccess(false);
  } else {
    setPaymentStatus('error');
    setShowSuccess(false);
  }
}, [searchParams]);
  useEffect(() => {
    const update = () => setFaviconSize(window.innerWidth >= 1024 ? 96 : 140);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
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
                <img src="/favicon.png" alt="JAMM Logo" style={{ height: `${faviconSize}px`, width: 'auto' }} />
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
                  {loading ? (
                    <div className="text-gray-300">Cargando evento…</div>
                  ) : error ? (
                    <div className="text-red-300">{error}</div>
                  ) : eventInfo ? (
                    <>
                      <p className="font-semibold">{eventInfo.name}</p>
                      <p>{format(parseISO(eventInfo.date), "EEEE d 'de' MMMM, yyyy", { locale: es })}</p>
                      <p>{eventInfo.location}</p>
                    </>
                  ) : null}
                </div>
              </motion.div>

              {/* Email */}
              <motion.div variants={itemVariants}>
                <p className="text-sm opacity-80 mt-2">
                  Te enviamos las entradas a {buyerEmail || 'tu correo'}
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