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
  const [mostrarModalAsignacion, setMostrarModalAsignacion] = useState(false);
  const [rolSeleccionado, setRolSeleccionado] = useState('rrpp');
  const [eventos, setEventos] = useState<any[]>([]);
  const [eventosAsignados, setEventosAsignados] = useState<string[]>([]);
  const [mensaje, setMensaje] = useState('');
  const [asignadoExitosamente, setAsignadoExitosamente] = useState(false);
  const [modalYaExiste, setModalYaExiste] = useState(false);
  const [redes, setRedes] = useState('');
  const [telefono, setTelefono] = useState('');
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

  const toggleAsignacionEvento = (eventId: string) => {
    if (eventosAsignados.includes(eventId)) {
      setEventosAsignados(prev => prev.filter(id => id !== eventId));
    } else {
      setEventosAsignados(prev => [...prev, eventId]);
    }
  };
  const generateCodigo = () => {
    return Math.random().toString(36).substring(2,10).toUpperCase();
  };
  const confirmarAsignacionFinal = async () => {
    if (!usuarioEncontrado) return;

    // 1️⃣ Perfil
    let { data: perfiles, error: perfilErr } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', usuarioEncontrado.id)
      .eq('rol', rolSeleccionado);
    if (perfilErr) { setMensaje('Error verificando perfil'); return; }

    let profileId = perfiles?.[0]?.id;
    if (!profileId) {
      const { data: newP, error: insPerfErr } = await supabase
        .from('profiles')
        .insert({ user_id: usuarioEncontrado.id, rol: rolSeleccionado })
        .select('id')
        .single();
      if (insPerfErr || !newP) { setMensaje('No pude crear el perfil'); return; }
      profileId = newP.id;
    }

    // 2️⃣ RRPP (si aplica)
    let rrppId: number|undefined;
    if (rolSeleccionado === 'rrpp') {
      const { data: rrpps, error: rrppErr } = await supabase
        .from('rrpp')
        .select('id, codigo')
        .eq('profile_id', profileId)
        .limit(1);
      if (rrppErr) { setMensaje('Error verificando RRPP'); return; }

      if (rrpps?.length) {
        rrppId = rrpps[0].id;
      } else {
        const codigo = generateCodigo();
        const { data: newR, error: insRErr } = await supabase
          .from('rrpp')
          .insert({
            profile_id: profileId,
            nombre: usuarioEncontrado.full_name,
            redes,
            telefono,
            codigo
          })
          .select('id')
          .single();
        if (insRErr || !newR) { setMensaje('No pude crear RRPP'); return; }
        rrppId = newR.id;
      }
    }

    // 3️⃣ Asignar eventos
    if (rrppId) {
      const inserts = eventosAsignados.map(eid => ({
        rrpp_id: rrppId,
        event_id: eid,
        activo: true
      }));
      const { error: insEvtErr } = await supabase
        .from('profile_events')
        .insert(inserts);
      if (insEvtErr) { setMensaje('Error asignando eventos'); return; }
    }

    setAsignadoExitosamente(true);
    onUsuarioAsignado();
    setTimeout(() => setAsignadoExitosamente(false), 3000);
    setMostrarModalAsignacion(false);
    setUsuarioEncontrado(null);
    setEmail('');
    setEventosAsignados([]);
  };


  useEffect(() => {
    if (usuarioEncontrado) cargarEventos();
  }, [usuarioEncontrado]);

  return (
    <div className="bg-[#1f1f1f] p-6 rounded-lg border border-gray-700 mb-8">
      <h2 className="text-xl font-semibold text-white mb-4">Asignar RRPP a eventos</h2>
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

      <AnimatePresence>
        {mostrarModalAsignacion && usuarioEncontrado && (
          <motion.div
            // … animaciones …
            className="bg-[#111] border border-gray-700 mt-6 p-6 rounded-lg"
          >
            <h3 className="text-white text-lg font-semibold mb-4">
              Datos de RRPP para {usuarioEncontrado.full_name}
            </h3>

            {/* 3️⃣ Inputs para redes y teléfono */}
            <div className="mb-4">
              <label className="block text-white mb-1">Instagram / Redes</label>
              <input
                type="text"
                value={redes}
                onChange={e => setRedes(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                placeholder="p.ej. @mis.redes"
              />
            </div>
            <div className="mb-4">
              <label className="block text-white mb-1">Teléfono</label>
              <input
                type="tel"
                value={telefono}
                onChange={e => setTelefono(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                placeholder="p.ej. +34 600 123 456"
              />
            </div>

            <h4 className="text-white font-medium mb-2">Seleccionar eventos</h4>
                        <table className="w-full text-sm text-white">
              <thead>
                <tr className="bg-[#222]">
                  <th className="px-4 py-2 text-left">Evento</th>
                  <th className="px-4 py-2 text-left">Vinculado</th>
                </tr>
              </thead>
              <tbody>
                {eventos.map((evento) => (
                  <tr key={evento.id} className="border-t border-gray-700">
                    <td className="px-4 py-2">{evento.name}</td>
                    <td className="px-4 py-2">
                      <label className="inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="form-checkbox h-5 w-5 text-green-500"
                          checked={eventosAsignados.includes(evento.id)}
                          onChange={() => toggleAsignacionEvento(evento.id)}
                        />
                      </label>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setMostrarModalAsignacion(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarAsignacionFinal}
                className="px-4 py-2 bg-[#56ae4a] text-white rounded-lg hover:bg-[#68c95b]"
              >
                Confirmar y Guardar
              </button>
            </div>
          </motion.div>
        )}
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
                    setMostrarModalAsignacion(true);
                  }}
                >
                  Sí
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


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
              <h3 className="text-white text-lg font-semibold mb-4">Este usuario ya tiene rol asignado</h3>
              <p className="text-gray-300 text-sm mb-6">Ya tiene un perfil con el mismo rol.</p>
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
