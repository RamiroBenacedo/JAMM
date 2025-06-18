import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Loader2, Trash2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

const ListaUsuariosEvento = ({ refreshFlag }: { refreshFlag: boolean }) => {
  const { user } = useAuth();
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [usuarioAEliminar, setUsuarioAEliminar] = useState<string | null>(null);

  const cargarUsuarios = async () => {
    setCargando(true);
    const { data: perfiles, error } = await supabase
      .from('profiles')
      .select(`id, rol, event_id, created_at, user_emails(email, full_name), events(name)`);

    if (!error && perfiles) setUsuarios(perfiles);
    setCargando(false);
  };

  const confirmarEliminacion = async () => {
    if (!usuarioAEliminar) return;
    const { error } = await supabase.from('profiles').delete().eq('id', usuarioAEliminar);
    if (!error) cargarUsuarios();
    setUsuarioAEliminar(null);
  };

    useEffect(() => {
    if (user) cargarUsuarios();
    }, [user, refreshFlag]);

  return (
    <div className="bg-[#1f1f1f] p-6 rounded-lg border border-gray-700 mt-8">
      <h2 className="text-xl font-semibold text-white mb-4">Usuarios asignados a tus eventos</h2>
      {cargando ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="animate-spin h-6 w-6 text-white" />
        </div>
      ) : (
        <table className="min-w-full text-sm text-white">
          <thead>
            <tr className="bg-[#111] text-gray-400">
              <th className="px-4 py-2 text-left">Nombre</th>
              <th className="px-4 py-2 text-left">Email</th>
              <th className="px-4 py-2 text-left">Rol</th>
              <th className="px-4 py-2 text-left">Evento</th>
              <th className="px-4 py-2 text-left">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((usuario, idx) => (
              <tr key={idx} className="border-b border-gray-700">
                <td className="px-4 py-2">{usuario.user_emails?.full_name || '—'}</td>
                <td className="px-4 py-2">{usuario.user_emails?.email || '—'}</td>
                <td className="px-4 py-2 capitalize">{usuario.rol}</td>
                <td className="px-4 py-2">{usuario.events?.name || usuario.event_id}</td>
                <td className="px-4 py-2">
                  <button
                    onClick={() => setUsuarioAEliminar(usuario.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Modal de confirmación */}
      <AnimatePresence>
        {usuarioAEliminar && (
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
              <h3 className="text-white text-lg font-semibold mb-4">¿Eliminar usuario?</h3>
              <p className="text-gray-300 text-sm mb-6">Esta acción no se puede deshacer.</p>
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => setUsuarioAEliminar(null)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarEliminacion}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Eliminar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ListaUsuariosEvento;