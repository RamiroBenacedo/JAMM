import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const Navbar = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [rol, setRol] = useState<string | null>(null);
  const [tieneRol, setTieneRol] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const fetchRol = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from('profiles')
        .select('rol')
        .eq('user_id', user.id);

      if (!error && data.length > 0) {
        setTieneRol(true);
        setRol(data[0].rol);
      } else {
        setTieneRol(false);
        setRol(null);
      }
    };

    fetchRol();
  }, [user]);

  return (
    <nav className="bg-white border-b border-gray-200 relative z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
            <span className="text-4xl font-bold" style={{ fontFamily: 'Gasoek One', color: '#232323' }}>JAMM</span>
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <Link 
                  to="/crear-evento" 
                  className="primary-button"
                  style={{ background: '#232323', color: 'white' }}
                >
                  Crear Evento
                </Link>
                <div className="relative" ref={dropdownRef}>
                  <button 
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center text-[#232323] hover:text-opacity-80 focus:outline-none transition-colors"
                  >
                    <UserCircle className="h-6 w-6" />
                  </button>
                  {isDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
                      <div className="py-1 text-sm text-gray-700" role="menu" aria-orientation="vertical">
                        <Link
                          to="/mis-tickets"
                          onClick={() => setIsDropdownOpen(false)}
                          className="block px-4 py-2 hover:bg-gray-100"
                          role="menuitem"
                        >
                          Mis Tickets
                        </Link>

                        {tieneRol && (
                          <Link
                            to="/mis-eventos"
                            onClick={() => setIsDropdownOpen(false)}
                            className="block px-4 py-2 hover:bg-gray-100"
                            role="menuitem"
                          >
                            Mis Eventos
                          </Link>
                        )}

                        {rol === 'productora' && (
                          <Link
                            to="/rrpps"
                            onClick={() => setIsDropdownOpen(false)}
                            className="block px-4 py-2 hover:bg-gray-100"
                            role="menuitem"
                          >
                            RRPPs
                          </Link>
                        )}

                        <Link
                          to="/configuracion"
                          onClick={() => setIsDropdownOpen(false)}
                          className="block px-4 py-2 hover:bg-gray-100"
                          role="menuitem"
                        >
                          Configuración
                        </Link>

                        <button
                          onClick={() => {
                            handleLogout();
                            setIsDropdownOpen(false);
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          role="menuitem"
                        >
                          Cerrar Sesión
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <Link
                to="/ingresar"
                className="primary-button"
                style={{ background: '#232323', color: 'white' }}
              >
                Ingresar
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
