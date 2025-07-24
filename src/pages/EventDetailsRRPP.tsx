// src/pages/EventDetailsRRPP.tsx
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import SendEntryByEmail from '../components/SendEntryByEmail';

const EventDetailsRRPP: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [eventName, setEventName] = useState('');
  const [ventas, setVentas] = useState({
    totalSales: 0,
    ticketsPaid: 0,
    ticketsFree: 0,
    totalConfirmed: 0
  });
  const [loading, setLoading] = useState(true);
  const [notAssigned, setNotAssigned] = useState(false);
  const [rrppCodigo, setRrppCodigo] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id || !id) return;

    const fetchVentas = async () => {
      setLoading(true);

      // 1️⃣ Obtener profile.id
      const { data: prof, error: profErr } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();
      if (profErr || !prof) {
        console.error(profErr);
        setLoading(false);
        return;
      }
      const profileId = prof.id;

      // 2️⃣ Obtener rrpp.id y código
      const { data: rrpp, error: rrppErr } = await supabase
        .from('rrpp')
        .select('id, codigo')
        .eq('profile_id', profileId)
        .single();
      if (rrppErr || !rrpp) {
        console.error(rrppErr);
        setLoading(false);
        return;
      }
      const { id: rrppId, codigo: rrppCodigo } = rrpp;
      setRrppCodigo(rrppCodigo);

      // 3️⃣ Verificar asignación
      const { data: pe, error: peErr } = await supabase
        .from('profile_events')
        .select('event_id')
        .eq('rrpp_id', rrppId)
        .eq('event_id', id)
        .single();
      if (peErr || !pe) {
        setNotAssigned(true);
        setLoading(false);
        return;
      }

      // 4️⃣ Nombre del evento
      const { data: evt, error: evtErr } = await supabase
        .from('events')
        .select('name')
        .eq('id', id)
        .single();
      if (evtErr || !evt) {
        console.error(evtErr);
        setLoading(false);
        return;
      }
      setEventName(evt.name);

      // 5️⃣ Traer y resumir tickets de este RRPP por código
      const { data: tickets, error: ticketsErr } = await supabase
        .from('purchased_tickets')
        .select(`
          quantity,
          total_price,
          ticket_types (
            event_id
          )
        `)
        .eq('rrpp', rrppCodigo)
        .eq('payment_status', 1);
      if (ticketsErr || !tickets) {
        console.error(ticketsErr);
        setLoading(false);
        return;
      }

      // 6️⃣ Filtrar por evento y calcular totales
      const ventasEvt = tickets.filter(t => t.ticket_types?.event_id === id);
      const resumen = ventasEvt.reduce(
        (acc, curr) => {
          const isFree = curr.total_price === 0;
          const quantity = curr.quantity ?? 0;

          return {
            totalSales: acc.totalSales + (curr.total_price ?? 0),
            ticketsPaid: acc.ticketsPaid + (!isFree ? quantity : 0),
            ticketsFree: acc.ticketsFree + (isFree ? quantity : 0),
            totalConfirmed: acc.totalConfirmed + quantity
          };
        },
        { totalSales: 0, ticketsPaid: 0, ticketsFree: 0, totalConfirmed: 0 }
      );

      setVentas(resumen);
      setLoading(false);
    };

    fetchVentas();
  }, [user, id]);

  if (notAssigned) {
    return <div className="text-white p-8">No estás asignado a este evento.</div>;
  }

  if (loading) {
    return <div className="text-white p-8">Cargando evento...</div>;
  }

  return (
    <div className="bg-[#1e1e1e] text-white py-10 min-h-screen">
      <div className="max-w-3xl mx-auto px-6 text-center">
        <h1 className="text-3xl font-bold mb-6">{eventName}</h1>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
          <div className="bg-[#2a2a2a] p-6 rounded border border-gray-700">
            <p className="text-sm text-gray-400">Entradas Pagas Confirmadas</p>
            <p className="text-2xl font-bold">{ventas.ticketsPaid}</p>
          </div>
          <div className="bg-[#2a2a2a] p-6 rounded border border-gray-700">
            <p className="text-sm text-gray-400">Entradas Gratuitas Emitidas</p>
            <p className="text-2xl font-bold">{ventas.ticketsFree}</p>
          </div>
          <div className="bg-[#2a2a2a] p-6 rounded border border-gray-700">
            <p className="text-sm text-gray-400">Total de Entradas Confirmadas</p>
            <p className="text-2xl font-bold">{ventas.totalConfirmed}</p>
          </div>
        </div>

        {ventas.totalSales > 0 && (
          <div className="bg-[#2a2a2a] p-6 rounded border border-gray-700 mb-10">
            <p className="text-sm text-gray-400">Monto Total Vendido</p>
            <p className="text-2xl font-bold">${ventas.totalSales.toFixed(2)}</p>
          </div>
        )}
      </div>

      <SendEntryByEmail eventId={id!} rrppCodigo={rrppCodigo} />
    </div>
  );
};

export default EventDetailsRRPP;
