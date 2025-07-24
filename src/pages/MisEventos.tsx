// src/pages/MisEventos.tsx
import React, { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { format, subMonths, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

type EventStat = {
  id: string;
  name: string;
  totalSales: number;
  ticketsSold: number;
  ticketsPaid: number;
  ticketsFree: number;
  totalConfirmed: number;
  ticketsAvailable: number;
};

type Purchase = {
  date: string;
  sales: number;
  tickets: number;
};

const MisEventos: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [eventStats, setEventStats] = useState<EventStat[]>([]);
  const [chartData, setChartData] = useState<Purchase[]>([]);
  const [timeframe, setTimeframe] = useState<'days' | 'months' | 'events'>('months');
  const [rol, setRol] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('rol')
        .eq('user_id', user.id)
        .single();
      if (error) console.error('Error fetching rol:', error);
      else setRol(data!.rol);
    })();
  }, [user]);

  useEffect(() => {
    if (!user?.id || !rol) return;
    setLoading(true);
    (async () => {
      let events: any[] = [];
      
      const baseSelect = `
        id,
        name,
        max_tickets_per_user,
        ticket_types (
          id,
          type,
          description,
          price,
          quantity,
          active,
          purchased_tickets!inner (
            quantity,
            total_price,
            purchase_date,
            payment_status,
            payment_id,
            rrpp
          )
        )`;

      if (rol === 'organizador' || rol === 'productora') {
        const { data, error } = await supabase
          .from('events')
          .select(baseSelect)
          .eq('creator_id', user.id)
          .eq('ticket_types.purchased_tickets.payment_status', 1);
        if (error) {
          console.error(error);
          setLoading(false);
          return;
        }
        events = data || [];
      }

      if (rol === 'rrpp') {
        const { data: pData, error: pErr } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', user.id)
          .single();
        if (pErr || !pData) {
          console.error(pErr);
          setLoading(false);
          return;
        }
        const profileId = pData.id;

        const { data: rData, error: rErr } = await supabase
          .from('rrpp')
          .select('id, codigo')
          .eq('profile_id', profileId)
          .single();
        if (rErr || !rData) {
          console.error(rErr);
          setLoading(false);
          return;
        }
        const rrppId = rData.id;
        const rrppCode = rData.codigo;

        const { data: peData, error: peErr } = await supabase
          .from('profile_events')
          .select('event_id')
          .eq('rrpp_id', rrppId)
          .eq('activo', true);
        if (peErr) {
          console.error(peErr);
          setLoading(false);
          return;
        }
        const eventIds = peData.map((e: any) => e.event_id);

        const { data, error } = await supabase
          .from('events')
          .select(baseSelect)
          .in('id', eventIds)
          .eq('ticket_types.purchased_tickets.payment_status', 1)
          .eq('ticket_types.purchased_tickets.rrpp', rrppCode);
        if (error) {
          console.error(error);
          setLoading(false);
          return;
        }
        events = data || [];
      }

      const stats = events.map(e => {
        const tt = Array.isArray(e.ticket_types) ? e.ticket_types : [];

        let ticketsPaid = 0;
        let ticketsFree = 0;
        let totalSales = 0;

        for (const t of tt) {
          for (const p of t.purchased_tickets) {
            const quantity = p.quantity ?? 0;
            const isFree = (p.total_price ?? 0) === 0;

            if (isFree) ticketsFree += quantity;
            else ticketsPaid += quantity;

            totalSales += p.total_price ?? 0;
          }
        }

        const totalConfirmed = ticketsPaid + ticketsFree;
        const ticketsAvailable = tt.reduce(
          (sum: number, t: any) => t.type !== 'Cortesía' ? sum + (t.quantity ?? 0) : sum,
          0
        );

        return {
          id: e.id,
          name: e.name,
          totalSales,
          ticketsSold: totalConfirmed,
          ticketsPaid,
          ticketsFree,
          totalConfirmed,
          ticketsAvailable
        };
      });

      setEventStats(stats);

      const purchases: Purchase[] = events.flatMap(e =>
        e.ticket_types.flatMap((t: any) =>
          t.purchased_tickets.map((p: any) => ({ date: p.purchase_date, sales: p.total_price, tickets: p.quantity }))
        )
      );
      updateChart(purchases, stats);
      setLoading(false);
    })();
  }, [user, rol, timeframe]);

  const updateChart = (purchases: Purchase[], stats: EventStat[] = eventStats) => {
    if (timeframe === 'events') {
      setChartData(stats.map(e => ({ date: e.name, sales: e.totalSales, tickets: e.ticketsSold })));
      return;
    }
    const map = new Map<string, { sales: number; tickets: number }>();
    const interval = timeframe === 'months'
      ? Array.from({ length: 6 }, (_, i) => format(subMonths(new Date(), 5 - i), 'yyyy-MM'))
      : eachDayOfInterval({ start: subMonths(new Date(), 1), end: new Date() }).map(d => format(d, 'yyyy-MM-dd'));
    interval.forEach(key => map.set(key, { sales: 0, tickets: 0 }));
    purchases.forEach(({ date, sales, tickets }) => {
      const key = timeframe === 'months' ? format(new Date(date), 'yyyy-MM') : format(new Date(date), 'yyyy-MM-dd');
      if (map.has(key)) {
        const cur = map.get(key)!;
        map.set(key, { sales: cur.sales + sales, tickets: cur.tickets + tickets });
      }
    });
    const chart = Array.from(map.entries()).map(([key, { sales, tickets }]) => ({
      date: timeframe === 'months'
        ? format(new Date(key + '-01'), 'MMM yyyy', { locale: es })
        : format(new Date(key), 'd MMM', { locale: es }),
      sales,
      tickets
    }));
    setChartData(chart);
  };

  const handleVerDetalles = (id: string) => navigate(`/eventos/${id}`);

  if (loading) return <div className="text-white p-8">Cargando eventos...</div>;

  const totals = eventStats.reduce(
    (acc, cur) => ({
      totalSales: acc.totalSales + cur.totalSales,
      ticketsPaid: acc.ticketsPaid + cur.ticketsPaid,
      ticketsFree: acc.ticketsFree + cur.ticketsFree,
      totalConfirmed: acc.totalConfirmed + cur.totalConfirmed,
      totalEvents: acc.totalEvents + 1
    }),
    {
      totalSales: 0,
      ticketsPaid: 0,
      ticketsFree: 0,
      totalConfirmed: 0,
      totalEvents: 0
    }
  );

  return (
    <div className="bg-[#2a2a2a] text-white min-h-screen py-10">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8 text-center">Mis Eventos</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-[#1f1f1f] p-4 rounded border border-gray-700">
            <p className="text-sm text-gray-400">Total Entradas Confirmadas</p>
            <p className="text-2xl font-bold">{totals.totalConfirmed}</p>
          </div>
          <div className="bg-[#1f1f1f] p-4 rounded border border-gray-700">
            <p className="text-sm text-gray-400">Entradas Gratuitas Emitidas</p>
            <p className="text-2xl font-bold">{totals.ticketsFree}</p>
          </div>
          <div className="bg-[#1f1f1f] p-4 rounded border border-gray-700">
            <p className="text-sm text-gray-400">Entradas Pagas Confirmadas</p>
            <p className="text-2xl font-bold">{totals.ticketsPaid}</p>
          </div>

          <div className="bg-[#1f1f1f] p-4 rounded border border-gray-700">
            <p className="text-sm text-gray-400">Ventas Totales</p>
            <p className="text-2xl font-bold">${totals.totalSales.toFixed(2)}</p>
          </div>
          <div className="bg-[#1f1f1f] p-4 rounded border border-gray-700">
            <p className="text-sm text-gray-400">Eventos Asociados</p>
            <p className="text-2xl font-bold">{totals.totalEvents}</p>
          </div>
        </div>

        {/* Gráfico */}
        <div className="bg-[#1f1f1f] p-6 rounded border border-gray-700 mb-8">
          <div className="flex justify-between mb-4">
            <h2 className="text-xl font-semibold">Análisis de Ventas</h2>
            <div className="flex space-x-2">
              {(['days', 'months', 'events'] as const).map(m => (
                <button
                  key={m}
                  className={`px-4 py-1 rounded ${timeframe === m ? 'bg-[#56ae4a]' : 'bg-[#111] text-gray-300'}`}
                  onClick={() => setTimeframe(m)}
                >
                  {m === 'days' ? 'Días' : m === 'months' ? 'Meses' : 'Eventos'}
                </button>
              ))}
            </div>
          </div>
          <div className="h-[400px]">
            <ResponsiveContainer>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9CA3AF" />
                <YAxis yAxisId="left" stroke="#9CA3AF" tickFormatter={v => `$${v}`} />
                <YAxis yAxisId="right" orientation="right" stroke="#9CA3AF" />
                <Tooltip />
                <Legend />
                <Line yAxisId="left" dataKey="sales" type="monotone" name="Ventas ($)" />
                <Line yAxisId="right" dataKey="tickets" type="monotone" name="Tickets" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tabla de eventos */}
        <div className="bg-[#1f1f1f] rounded border border-gray-700 overflow-x-auto">
          <table className="w-full text-sm text-center">
            <thead className="bg-[#111] text-gray-400 uppercase tracking-wider">
              <tr>
                <th className="p-4">Evento</th>
                <th className="p-4">Ventas</th>
                <th className="p-4">Tickets Pagos</th>
                <th className="p-4">Tickets Emitidos</th>
                <th className="p-4">Total Confirmados</th>
                <th className="p-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {eventStats.length === 0 ? (
                <tr><td colSpan={6} className="p-4 text-gray-500">No hay eventos para mostrar.</td></tr>
              ) : eventStats.map(e => (
                <tr key={e.id} className="border-t border-gray-700 hover:bg-[#2a2a2a]">
                  <td className="p-4">{e.name}</td>
                  <td className="p-4">${e.totalSales.toFixed(2)}</td>
                  <td className="p-4">{e.ticketsPaid}</td>
                  <td className="p-4">{e.ticketsFree}</td>
                  <td className="p-4">{e.totalConfirmed}</td>
                  <td className="p-4">
                    <button className="text-[#56ae4a] hover:underline" onClick={() => handleVerDetalles(e.id)}>
                      Ver detalles
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MisEventos;
