import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Loader2, Trash2, Pencil, CheckCircle, Search } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import * as RadixSwitch from '@radix-ui/react-switch';
import '../styles/switch.css';

const ListaUsuariosEvento = ({ refreshFlag }: { refreshFlag: boolean }) => {
  const { user } = useAuth();
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [usuariosFiltrados, setUsuariosFiltrados] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [usuarioAEliminar, setUsuarioAEliminar] = useState<string | null>(null);
  const [usuarioEditando, setUsuarioEditando] = useState<any>(null);
  const [eventos, setEventos] = useState<any[]>([]);
  const [asignados, setAsignados] = useState<string[]>([]);
  const [confirmacion, setConfirmacion] = useState(false);
  const [seleccionarTodos, setSeleccionarTodos] = useState(false);

  const cargarUsuarios = async () => {
    setCargando(true);
    
    // Primero obtengo los eventos del usuario actual
    const { data: eventosUsuario, error: eventosError } = await supabase
      .from('events')
      .select('id')
      .eq('creator_id', user?.id);

    if (eventosError || !eventosUsuario?.length) {
      setUsuarios([]);
      setCargando(false);
      return;
    }

    const eventIds = eventosUsuario.map(e => e.id);
    
    // Ahora filtro la vista solo por RRPPs que están asignados a eventos del usuario actual
    const { data, error } = await supabase
      .from('vista_profiles_eventos')
      .select('*')
      .in('event_id', eventIds);

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

  useEffect(() => {
    const filtrarUsuarios = () => {
      const termino = busqueda.toLowerCase().trim();
      if (!termino) {
        setUsuariosFiltrados(usuarios);
        return;
      }
      
      const filtrados = usuarios.filter(usuario => 
        usuario.full_name?.toLowerCase().includes(termino) ||
        usuario.email?.toLowerCase().includes(termino)
      );
      setUsuariosFiltrados(filtrados);
    };

    filtrarUsuarios();
  }, [busqueda, usuarios]);

  return (
    <div className="bg-[#1f1f1f] p-4 lg:p-6 rounded-lg border border-gray-700 mt-6 lg:mt-8">
      {usuarioAEliminar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1f1f1f] p-4 lg:p-6 rounded-lg border border-gray-700 w-full max-w-sm">
            <p className="text-white mb-4 text-center">¿Estás seguro que deseas eliminar este usuario?</p>
            <div className="flex justify-end space-x-3">
              <button
                className="flex-1 px-4 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
                onClick={() => setUsuarioAEliminar(null)}
              >
                Cancelar
              </button>
              <button
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
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
          className="mb-4 flex items-center justify-center lg:justify-start text-[#FF5722]"
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
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-[#1f1f1f] p-4 lg:p-6 rounded-lg border border-gray-700 w-full max-w-md"
            >
              <h3 className="text-white text-lg font-semibold mb-6">Editar eventos para {usuarioEditando.full_name}</h3>
              <div className="mb-4 flex items-center justify-between text-white">
                <span className="text-sm">Seleccionar todos</span>
                <RadixSwitch.Root
                  className="switch-root"
                  checked={seleccionarTodos}
                  onCheckedChange={toggleSeleccionarTodos}
                >
                  <RadixSwitch.Thumb className="switch-thumb" />
                </RadixSwitch.Root>
              </div>
              <div className="max-h-[40vh] overflow-y-auto space-y-3 pr-2">
                {eventos.map(evento => (
                  <div key={evento.id} className="flex items-center justify-between text-white">
                    <span className="text-sm">{evento.name}</span>
                    <RadixSwitch.Root
                      className="switch-root"
                      checked={asignados.includes(evento.id)}
                      onCheckedChange={() => toggleEvento(evento.id)}
                    >
                      <RadixSwitch.Thumb className="switch-thumb" />
                    </RadixSwitch.Root>
                  </div>
                ))}
              </div>
              <div className="flex justify-end mt-6 space-x-3">
                <button
                  onClick={() => setUsuarioEditando(null)}
                  className="px-4 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={guardarAsignaciones}
                  className="px-4 py-2.5 bg-[#FF5722] text-white rounded-lg hover:bg-opacity-90 transition-colors text-sm font-medium"
                >
                  Guardar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o email..."
            className="w-full bg-white text-[#232323] px-4 py-2.5 pl-10 rounded-lg border border-gray-200 focus:outline-none focus:border-[#FF5722] transition-colors"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        </div>
      </div>

      {/* Versión Desktop */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="min-w-full text-sm text-white">
          <thead>
            <tr className="bg-[#111] text-gray-400">
              <th className="px-4 py-3 text-left">Nombre</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Rol</th>
              <th className="px-4 py-3 text-left">Eventos Asociados</th>
              <th className="px-4 py-3 text-left">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuariosFiltrados.map(usuario => (
              <tr key={usuario.rrppId} className="border-b border-gray-700 hover:bg-[#2a2a2a] transition-colors">
                <td className="px-4 py-3">{usuario.full_name || '—'}</td>
                <td className="px-4 py-3">{usuario.email || '—'}</td>
                <td className="px-4 py-3">{usuario.rol?.toUpperCase() || '—'}</td>
                <td className="px-4 py-3">
                  {usuario.eventos.map((e: any) => e.name).join(', ') || '—'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setUsuarioEditando(usuario)}
                      className="flex items-center gap-1.5 text-[#FF5722] hover:text-opacity-80 transition-colors"
                    >
                      <Pencil size={16} />
                      <span>Editar</span>
                    </button>
                    <button
                      onClick={() => setUsuarioAEliminar(usuario.rrppId)}
                      className="flex items-center gap-1.5 text-red-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={16} />
                      <span>Eliminar</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Versión Mobile */}
      <div className="lg:hidden space-y-4">
        {usuariosFiltrados.map(usuario => (
          <div key={usuario.rrppId} className="bg-[#2a2a2a] rounded-lg overflow-hidden">
            <div className="p-4 space-y-3">
              <div>
                <p className="text-gray-400 text-xs">Nombre</p>
                <p className="text-white font-medium">{usuario.full_name || '—'}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs">Email</p>
                <p className="text-white">{usuario.email || '—'}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs">Rol</p>
                <p className="text-white">{usuario.rol?.toUpperCase() || '—'}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs">Eventos Asociados</p>
                <p className="text-white">
                  {usuario.eventos.map((e: any) => e.name).join(', ') || '—'}
                </p>
              </div>
            </div>
            
            <div className="border-t border-gray-700 p-4 flex justify-between items-center bg-[#1f1f1f]">
              <button
                onClick={() => setUsuarioEditando(usuario)}
                className="flex items-center gap-1.5 text-[#FF5722] hover:text-opacity-80 transition-colors"
              >
                <Pencil size={16} />
                <span className="text-sm font-medium">Editar</span>
              </button>
              <button
                onClick={() => setUsuarioAEliminar(usuario.rrppId)}
                className="flex items-center gap-1.5 text-red-500 hover:text-red-400 transition-colors"
              >
                <Trash2 size={16} />
                <span className="text-sm font-medium">Eliminar</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {cargando && (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="w-6 h-6 text-[#FF5722] animate-spin" />
        </div>
      )}

      {!cargando && usuariosFiltrados.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          {busqueda 
            ? 'No se encontraron resultados para tu búsqueda'
            : 'No hay usuarios RRPP registrados'}
        </div>
      )}
    </div>
  );
};

export default ListaUsuariosEvento;
