import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Event {
  id: string;
  name: string;
  description: string;
  date: string;
  time: string;
  location: string;
  sales_end_date: string;
  image_url: string;
}

function Events() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .eq('active', true)
          .order('date', { ascending: true });

        if (error) throw error;

        setEvents(data || []);
      } catch (err) {
        console.error('Error fetching events:', err);
        setError('No se pudieron cargar los eventos. Por favor, intenta de nuevo más tarde.');
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  if (loading) {
    return (
      <div className="bg-[#2a2a2a]">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#56ae4a]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#2a2a2a]">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-white mb-8">Eventos</h1>

        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded mb-8">
            {error}
          </div>
        )}

        {events.length === 0 ? (
          <div className="bg-[#1f1f1f] rounded-lg shadow-lg overflow-hidden p-6 text-center">
            <h2 className="text-xl font-semibold text-white mb-2">No hay eventos disponibles</h2>
            <p className="text-gray-400">Aún no se han publicado eventos.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <Link
                key={event.id}
                to={`/evento/${event.id}`}
                className="bg-[#1f1f1f] rounded-lg shadow-lg overflow-hidden hover:ring-2 hover:ring-[#56ae4a] transition-all duration-200"
              >
                <div className="relative pb-[56.25%]">
                  <img
                    src={event.image_url}
                    alt={event.name}
                    className="absolute inset-0 w-full h-full object-cover object-center"
                  />
                </div>
                <div className="p-6">
                  <h2 className="text-xl font-semibold text-white mb-2">{event.name}</h2>
                  <p className="text-gray-400 mb-4 line-clamp-2">{event.description}</p>
                  
                  <div className="space-y-2 text-sm text-gray-300">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2 text-[#56ae4a]" />
                      <span>
                        {format(new Date(event.date), "EEEE d 'de' MMMM, yyyy", { locale: es })}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-2 text-[#56ae4a]" />
                      <span>{event.time}</span>
                    </div>
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-2 text-[#56ae4a]" />
                      <span>{event.location}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Events;