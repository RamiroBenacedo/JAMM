import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

interface CreateEventButtonProps {
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
  isNavbar?: boolean;
}

const CreateEventButton: React.FC<CreateEventButtonProps> = ({ 
  className, 
  style, 
  children,
  isNavbar = false
}) => {
  const { user } = useAuth();
  const [rol, setRol] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRol = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      
      const { data, error } = await supabase
        .from('profiles')
        .select('rol')
        .eq('user_id', user.id);

      if (!error && data.length > 0) {
        setRol(data[0].rol);
      } else {
        setRol(null);
      }
      setLoading(false);
    };

    fetchRol();
  }, [user]);

  if (loading) {
    return (
      <button 
        className={className} 
        style={style}
        disabled
      >
        {children}
      </button>
    );
  }

  // Si el usuario está autenticado y es productora, va a crear-evento
  if (user && rol === 'productora') {
    return (
      <Link 
        to="/crear-evento" 
        className={className}
        style={style}
      >
        {children}
      </Link>
    );
  }

  // Para cualquier otro caso (no autenticado o rol diferente), va a WhatsApp en nueva pestaña
  return (
    <a
      href="https://wa.me/5491165822002?text=¡Hola! Quiero obtener mas información para trabajar con JAMM"
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      style={style}
    >
      {children}
    </a>
  );
};

export default CreateEventButton;