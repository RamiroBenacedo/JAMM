import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useParams } from 'react-router-dom';
import EventDetails from './EventDetails';
import EventDetailsRRPP from './EventDetailsRRPP';
import { supabase } from '../lib/supabase';

const EventDetailsRouter: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [rol, setRol] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const fetchRol = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('rol')
          .eq('user_id', user.id)
          .single();

        if (error) throw error;
        setRol(data?.rol || null);
      } catch (error: any) {
        console.error('Error fetching rol:', error);
        setErrorMsg(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRol();
  }, [user]);

  if (loading) {
    return (
      <div className="bg-[#2a2a2a] min-h-[calc(100vh-8rem)]">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FF5722]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#2a2a2a] min-h-[calc(100vh-8rem)]">
      {rol === 'rrpp' ? (
        <EventDetailsRRPP />
      ) : (
        <EventDetails />
      )}
    </div>
  );
};

export default EventDetailsRouter;
