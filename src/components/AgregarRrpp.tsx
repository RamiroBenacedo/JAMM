import React, { useState, useEffect } from "react";
import { supabase } from '../lib/supabase';
import { FiX } from 'react-icons/fi';

interface RRPP {
  id: string;
  nombre?: string;
  instagram?: string;
  telefono?: string;
  redes?: string;
}

interface AgregarRRPPProps {
  userId: string;
  onRRPPAdded: () => void;
}

function AgregarRRPP({ userId, onRRPPAdded }: AgregarRRPPProps) {
  const [show, setShow] = useState(false);
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nombre: "",
    instagram: "",
    telefono: "",
  });

  useEffect(() => {
    if (show) {
      setVisible(true);
    }
  }, [show]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(() => setShow(false), 300);
  };

  const handleShow = () => setShow(true);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { nombre, instagram, telefono } = formData;

    try {
      const { error } = await supabase.rpc('add_rrpp', {
        p_nombre: nombre,
        p_redes: instagram,
        p_telefono: telefono,
      });

      if (error) {
        alert(`Error al agregar RRPP: ${error.message}`);
      } else {
        alert('RRPP agregado correctamente');
        setFormData({ nombre: '', instagram: '', telefono: '' });
        handleClose();
        onRRPPAdded();
      }
    } catch (err) {
      console.error(err);
      alert('Error inesperado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleShow}
        className="px-5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
      >
        Agregar RRPP
      </button>

      {(show || visible) && (
        <div
          className={`fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 transition-opacity duration-300 ${
            visible ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <div
            className={`bg-gray-900 rounded-lg shadow-lg p-8 w-full max-w-lg mx-4 text-white transform transition-transform duration-300 ${
              visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
            }`}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold">Nuevo RRPP</h2>
              <button onClick={handleClose} className="text-gray-400 hover:text-white">
                <FiX size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Campos del formulario */}
              <div>
                <label htmlFor="nombre" className="block text-sm font-medium mb-1">
                  Nombre
                </label>
                <input
                  id="nombre"
                  name="nombre"
                  type="text"
                  value={formData.nombre}
                  onChange={handleChange}
                  required
                  className="w-full bg-gray-800 border border-gray-700 rounded-md px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="instagram" className="block text-sm font-medium mb-1">
                  Instagram
                </label>
                <input
                  id="instagram"
                  name="instagram"
                  type="text"
                  value={formData.instagram}
                  onChange={handleChange}
                  required
                  className="w-full bg-gray-800 border border-gray-700 rounded-md px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="telefono" className="block text-sm font-medium mb-1">
                  Teléfono
                </label>
                <input
                  id="telefono"
                  name="telefono"
                  type="text"
                  value={formData.telefono}
                  onChange={handleChange}
                  className="w-full bg-gray-800 border border-gray-700 rounded-md px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-700">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-5 py-2 rounded-md border border-gray-600 hover:bg-gray-800 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 rounded-md hover:bg-blue-700 transition"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                  ) : (
                    "Guardar"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default AgregarRRPP;