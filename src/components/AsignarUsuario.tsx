import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, X } from 'lucide-react';

const AsignarUsuario = ({ onUsuarioAsignado }: { onUsuarioAsignado: () => void }) => {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [usuarioEncontrado, setUsuarioEncontrado] = useState<any>(null);
  const [mostrarModalConfirmacion, setMostrarModalConfirmacion] = useState(false);
  const [mostrarModalRol, setMostrarModalRol] = useState(false);
  const [rolSeleccionado, setRolSeleccionado] = useState('organizador');
  const [eventoSeleccionado, setEventoSeleccionado] = useState('');
  const [eventos, setEventos] = useState<any[]>([]);
  const [mensaje, setMensaje] = useState('');
  const [asignadoExitosamente, setAsignadoExitosamente] = useState(false);
  const [modalYaExiste, setModalYaExiste] = useState(false);

  const buscarUsuario = async () => {
    const { data, error } = await supabase
      .from('user_emails')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !data) {
      setMensaje('Usuario no encontrado.');
      setUsuarioEncontrado(null);
      return;
    }

    setUsuarioEncontrado(data);
    setMostrarModalConfirmacion(true);
    setMensaje('');
  };

  const cargarEventos = async () => {
    const { data, error } = await supabase
      .from('events')
      .select('id, name')
      .eq('creator_id', user?.id);

    if (!error) setEventos(data || []);
  };

  const confirmarAsignacion = async () => {
    if (!usuarioEncontrado) return;

    const { data: existentes, error: errorBusqueda } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', usuarioEncontrado.id)
    .eq('event_id', eventoSeleccionado);

    if (existentes && existentes.length > 0) {
    setModalYaExiste(true);
    return;
    }

    const { error } = await supabase
      .from('profiles')
      .upsert({
        user_id: usuarioEncontrado.id,
        rol: rolSeleccionado,
        event_id: eventoSeleccionado
      });

    if (!error) {
      setAsignadoExitosamente(true);
      onUsuarioAsignado();
      setTimeout(() => setAsignadoExitosamente(false), 3000);
    } else {
      setMensaje('Error al asignar el usuario.');
    }

    setMostrarModalRol(false);
    setUsuarioEncontrado(null);
    setEmail('');
  };

  useEffect(() => {
    if (mostrarModalRol) cargarEventos();
  }, [mostrarModalRol]);

  return (
    <div className="bg-[#1f1f1f] p-6 rounded-lg border border-gray-700 mb-8">
      <h2 className="text-xl font-semibold text-white mb-4">Asignar usuario a evento</h2>
      <div className="flex gap-4 items-end">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="px-4 py-2 rounded-lg border border-gray-600 bg-[#111] text-white"
          placeholder="Buscar por email"
        />
        <button
          onClick={buscarUsuario}
          className="px-4 py-2 bg-[#56ae4a] text-white rounded-lg hover:bg-[#68c95b]"
        >
          Buscar
        </button>
      </div>
      {mensaje && <p className="text-sm text-gray-300 mt-4">{mensaje}</p>}

      {asignadoExitosamente && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="mt-4 flex items-center text-green-400"
        >
          <CheckCircle className="mr-2" /> Usuario asignado correctamente
        </motion.div>
      )}

      {/* Modal Confirmación */}
      <AnimatePresence>
        {mostrarModalConfirmacion && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-[#1f1f1f] p-6 rounded-lg border border-gray-700 w-full max-w-md"
            >
              <h3 className="text-white text-lg font-semibold mb-4">Usuario encontrado correctamente</h3>
              <p className="text-white text-sm mb-2">Nombre completo: {usuarioEncontrado.full_name}</p>
              <p className="text-white text-sm mb-2">Email: {usuarioEncontrado.email}</p>
              <div className="flex justify-end space-x-4 mt-4">
                <button
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  onClick={() => setMostrarModalConfirmacion(false)}
                >
                  No
                </button>
                <button
                  className="px-4 py-2 bg-[#56ae4a] text-white rounded-lg hover:bg-[#68c95b]"
                  onClick={() => {
                    setMostrarModalConfirmacion(false);
                    setMostrarModalRol(true);
                  }}
                >
                  Sí
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    {/* Modal Asignar Rol */}
    <AnimatePresence>
    {mostrarModalRol && (
        <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        >
        <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="relative bg-[#1f1f1f] p-6 rounded-lg border border-gray-700 w-full max-w-md"
        >
            {/* Botón X para cerrar */}
            <button
            onClick={() => setMostrarModalRol(false)}
            className="absolute top-3 right-3 text-gray-400 hover:text-white"
            aria-label="Cerrar"
            >
            <X className="h-5 w-5" />
            </button>

            <h3 className="text-white text-lg font-semibold mb-4">Asignar rol y evento</h3>

            <div className="mb-4">
            <label className="block text-gray-300 text-sm mb-1">Rol</label>
            <select
                className="w-full bg-[#111] text-white border border-gray-600 rounded-lg px-3 py-2"
                value={rolSeleccionado}
                onChange={(e) => setRolSeleccionado(e.target.value)}
            >
                <option value="organizador">Organizador</option>
                <option value="rrpp">RRPP</option>
            </select>
            </div>

            <div className="mb-4">
            <label className="block text-gray-300 text-sm mb-1">Evento</label>
            <select
                className="w-full bg-[#111] text-white border border-gray-600 rounded-lg px-3 py-2"
                value={eventoSeleccionado}
                onChange={(e) => setEventoSeleccionado(e.target.value)}
            >
                <option value="">Seleccionar evento</option>
                {eventos.map((evento) => (
                <option key={evento.id} value={evento.id}>
                    {evento.name}
                </option>
                ))}
            </select>
            </div>

            <div className="flex justify-end">
            <button
                onClick={confirmarAsignacion}
                className="px-4 py-2 bg-[#56ae4a] text-white rounded-lg hover:bg-[#68c95b]"
            >
                Confirmar
            </button>
            </div>
        </motion.div>
        </motion.div>
    )}
    </AnimatePresence>

      {/* Modal de usuario ya asignado */}
      <AnimatePresence>
        {modalYaExiste && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-[#1f1f1f] p-6 rounded-lg border border-gray-700 w-full max-w-md"
            >
              <h3 className="text-white text-lg font-semibold mb-4">Este usuario ya está asignado</h3>
              <p className="text-gray-300 text-sm mb-6">Este usuario ya fue asignado al evento seleccionado.</p>
              <div className="flex justify-end">
                <button
                  onClick={() => setModalYaExiste(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AsignarUsuario;
