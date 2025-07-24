import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Loader2, Trash2, Pencil, CheckCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import * as RadixSwitch from '@radix-ui/react-switch';
import '../styles/switch.css';

const ListaUsuariosEvento = ({ refreshFlag }: { refreshFlag: boolean }) => {
  const { user } = useAuth();
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [usuarioAEliminar, setUsuarioAEliminar] = useState<string | null>(null);
  const [usuarioEditando, setUsuarioEditando] = useState<any>(null);
  const [eventos, setEventos] = useState<any[]>([]);
  const [asignados, setAsignados] = useState<string[]>([]);
  const [confirmacion, setConfirmacion] = useState(false);
  const [seleccionarTodos, setSeleccionarTodos] = useState(false);

  const cargarUsuarios = async () => {
    setCargando(true);
    const { data, error } = await supabase
      .from('vista_profiles_eventos')
      .select('*');

    if (!error && data) {
      const agrupados = data.reduce((acc: any, item: any) => {
        // usa rrpp_id como clave
        const key = item.rrpp_id; 
        if (!key) return acc; // descarta si no hay rrpp asociado

        if (!acc[key]) {
          acc[key] = {
            rrppId: item.rrpp_id,         // ← guardo rrpp.id (UUID)
            codigo: item.rrpp_codigo,     // opcional
            email: item.email,
            full_name: item.full_name,
            rol: item.rol,
            eventos: [] as { id: string; name: string }[]
          };
        }
        if (item.event_id && item.event_name && item.activo) {
          acc[key].eventos.push({ id: item.event_id, name: item.event_name });
        }
        return acc;
      }, {} as Record<string, any>);

      setUsuarios(Object.values(agrupados));
    }
    setCargando(false);
  };


  const cargarEventos = async () => {
    const { data } = await supabase
      .from('events')
      .select('id, name')
      .eq('creator_id', user?.id);
    if (data) setEventos(data);
  };

  const toggleEvento = (eventId: string) => {
    if (asignados.includes(eventId)) {
      setAsignados(prev => prev.filter(id => id !== eventId));
    } else {
      setAsignados(prev => [...prev, eventId]);
    }
  };

  const toggleSeleccionarTodos = () => {
    if (seleccionarTodos) {
      setAsignados([]);
    } else {
      setAsignados(eventos.map(e => e.id));
    }
    setSeleccionarTodos(!seleccionarTodos);
  };

  const guardarAsignaciones = async () => {
    if (!usuarioEditando) return;
    const rrppId = usuarioEditando.rrppId;  // UUID de rrpp.id

    // 1️⃣ Traigo todo lo que ya existe (tanto activos como inactivos)
    const { data: existentes } = await supabase
      .from('profile_events')
      .select('event_id, activo')
      .eq('rrpp_id', rrppId);

    const existentesMap = new Map<string, boolean>();
    (existentes || []).forEach(e => existentesMap.set(e.event_id, e.activo!));

    // 2️⃣ Para cada evento en tu lista de creación:
    for (const eventId of eventos.map(e => e.id)) {
      const estaAsignado = asignados.includes(eventId);
      const existe = existentesMap.has(eventId);

      if (estaAsignado && !existe) {
        // Insert nuevo
        await supabase
          .from('profile_events')
          .insert({ rrpp_id: rrppId, event_id: eventId, activo: true });
      }
      else if (!estaAsignado && existe) {
        // ¡Aquí eliminamos la fila en lugar de marcar activo=false!
        await supabase
          .from('profile_events')
          .delete()
          .eq('rrpp_id', rrppId)
          .eq('event_id', eventId);
      }
      // Si ya existe y sigue asignado, no hacemos nada
    }

    setUsuarioEditando(null);
    setConfirmacion(true);
    setTimeout(() => setConfirmacion(false), 3000);
    cargarUsuarios();
  };

const confirmarEliminacion = async () => {
  if (!usuarioAEliminar) return;
  // 1️⃣ Recupero el profile_id antes de borrar el rrpp
  const { data: rrppRow, error: fetchErr } = await supabase
    .from('rrpp')
    .select('profile_id')
    .eq('id', usuarioAEliminar)
    .single();
  if (fetchErr || !rrppRow) {
    console.error('No pude recuperar el profile_id del RRPP', fetchErr);
    setUsuarioAEliminar(null);
    return;
  }
  const profileId = rrppRow.profile_id;

  // 2️⃣ Borro el RRPP (esto eliminará sus profile_events por cascada)
  const { error: rrppErr } = await supabase
    .from('rrpp')
    .delete()
    .eq('id', usuarioAEliminar);
  if (rrppErr) {
    console.error('Error borrando RRPP:', rrppErr);
    setUsuarioAEliminar(null);
    return;
  }

  // 3️⃣ Borro el perfil en profiles
  const { error: profErr } = await supabase
    .from('profiles')
    .delete()
    .eq('id', profileId);
  if (profErr) {
    console.error('Error borrando Profile:', profErr);
  }

  // 4️⃣ Refresco la tabla
  cargarUsuarios();
  setUsuarioAEliminar(null);
};


  useEffect(() => {
    if (user) {
      cargarUsuarios();
      cargarEventos();
    }
  }, [user, refreshFlag]);

  useEffect(() => {
    if (usuarioEditando) {
      const eventosAsociados = usuarioEditando.eventos.map((e: any) => e.id);
      setAsignados(eventosAsociados);
      setSeleccionarTodos(eventosAsociados.length === eventos.length);
    }
  }, [usuarioEditando, eventos]);

  return (
    <div className="bg-[#1f1f1f] p-6 rounded-lg border border-gray-700 mt-8">
      {usuarioAEliminar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#1f1f1f] p-6 rounded-lg border border-gray-700">
            <p className="text-white mb-4">¿Estás seguro que deseas eliminar este usuario?</p>
            <div className="flex justify-end space-x-4">
              <button
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                onClick={() => setUsuarioAEliminar(null)}
              >
                Cancelar
              </button>
              <button
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                onClick={confirmarEliminacion}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
      {confirmacion && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="mb-4 flex items-center text-green-400"
        >
          <CheckCircle className="mr-2" /> Cambios guardados correctamente
        </motion.div>
      )}
      <AnimatePresence>
        {usuarioEditando && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-[#1f1f1f] p-6 rounded-lg border border-gray-700 w-full max-w-md"
            >
              <h3 className="text-white text-lg font-semibold mb-4">Editar eventos para {usuarioEditando.full_name}</h3>
              <div className="mb-4 flex items-center justify-between text-white">
                <span>Seleccionar todos</span>
                <RadixSwitch.Root
                  className="switch-root"
                  checked={seleccionarTodos}
                  onCheckedChange={toggleSeleccionarTodos}
                >
                  <RadixSwitch.Thumb className="switch-thumb" />
                </RadixSwitch.Root>
              </div>
              {eventos.map(evento => (
                <div key={evento.id} className="flex items-center justify-between text-white mb-2">
                  <span>{evento.name}</span>
                  <RadixSwitch.Root
                    className="switch-root"
                    checked={asignados.includes(evento.id)}
                    onCheckedChange={() => toggleEvento(evento.id)}
                  >
                    <RadixSwitch.Thumb className="switch-thumb" />
                  </RadixSwitch.Root>
                </div>
              ))}
              <div className="flex justify-end mt-4 space-x-4">
                <button
                  onClick={() => setUsuarioEditando(null)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Cancelar
                </button>
                <button
                  onClick={guardarAsignaciones}
                  className="px-4 py-2 bg-[#56ae4a] text-white rounded-lg hover:bg-[#68c95b]"
                >
                  Guardar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <table className="min-w-full text-sm text-white mt-6">
        <thead>
          <tr className="bg-[#111] text-gray-400">
            <th className="px-4 py-2 text-left">Nombre</th>
            <th className="px-4 py-2 text-left">Email</th>
            <th className="px-4 py-2 text-left">Rol</th>
            <th className="px-4 py-2 text-left">Eventos Asociados</th>
            <th className="px-4 py-2 text-left">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {usuarios.map(usuario => (
            <tr key={usuario.rrppId} className="border-b border-gray-700">
              <td className="px-4 py-2">{usuario.full_name || '—'}</td>
              <td className="px-4 py-2">{usuario.email || '—'}</td>
              <td className="px-4 py-2">{usuario.rol?.toUpperCase() || '—'}</td>
              <td className="px-4 py-2">
                {usuario.eventos.map((e: any) => e.name).join(', ') || '—'}
              </td>
              <td className="px-4 py-2">
                <button
                  onClick={() => setUsuarioEditando(usuario)}
                  className="text-blue-500 hover:text-blue-700"
                >
                  Editar
                </button>
                <button
                  onClick={() => setUsuarioAEliminar(usuario.rrppId)}
                  className="ml-4 text-red-500 hover:text-red-700"
                >
                  Eliminar
                </button>
              </td>
            </tr>
          ))}

        </tbody>
      </table>
    </div>
    
  );
};

export default ListaUsuariosEvento;
