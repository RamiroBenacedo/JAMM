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
import { Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
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
  createdAt: string;
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
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null);

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
        created_at,
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
          ticketsAvailable,
          createdAt: e.created_at
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

  const handleDateSort = () => {
    if (sortOrder === null) {
      setSortOrder('desc'); // First click: newest first
    } else if (sortOrder === 'desc') {
      setSortOrder('asc'); // Second click: oldest first  
    } else {
      setSortOrder(null); // Third click: no sorting
    }
  };

  const filteredAndSortedEvents = eventStats
    .filter(event => event.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      if (sortOrder === null) return 0;
      
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      
      if (sortOrder === 'asc') {
        return dateA.getTime() - dateB.getTime();
      } else {
        return dateB.getTime() - dateA.getTime();
      }
    });

  if (loading) {
    return (
      <div className="bg-[#2a2a2a]">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FF5722]"></div>
        </div>
      </div>
    );
  }

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
    <div className="bg-[#2a2a2a] text-white min-h-screen py-6 lg:py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <h1 className="text-2xl lg:text-3xl font-bold mb-6 lg:mb-8 text-center">Mis Eventos</h1>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-6 mb-6 lg:mb-8">
          <div className="bg-[#1f1f1f] p-3 lg:p-4 rounded-lg border border-gray-700">
            <p className="text-xs lg:text-sm text-gray-400">Total Entradas Confirmadas</p>
            <p className="text-lg lg:text-2xl font-bold mt-1">{totals.totalConfirmed}</p>
          </div>
          <div className="bg-[#1f1f1f] p-3 lg:p-4 rounded-lg border border-gray-700">
            <p className="text-xs lg:text-sm text-gray-400">Entradas Gratuitas</p>
            <p className="text-lg lg:text-2xl font-bold mt-1">{totals.ticketsFree}</p>
          </div>
          <div className="bg-[#1f1f1f] p-3 lg:p-4 rounded-lg border border-gray-700">
            <p className="text-xs lg:text-sm text-gray-400">Entradas Pagas</p>
            <p className="text-lg lg:text-2xl font-bold mt-1">{totals.ticketsPaid}</p>
          </div>
          <div className="bg-[#1f1f1f] p-3 lg:p-4 rounded-lg border border-gray-700">
            <p className="text-xs lg:text-sm text-gray-400">Ventas Totales</p>
            <p className="text-lg lg:text-2xl font-bold mt-1">${totals.totalSales.toFixed(2)}</p>
          </div>
          <div className="bg-[#1f1f1f] p-3 lg:p-4 rounded-lg border border-gray-700">
            <p className="text-xs lg:text-sm text-gray-400">Eventos Asociados</p>
            <p className="text-lg lg:text-2xl font-bold mt-1">{totals.totalEvents}</p>
          </div>
        </div>

        {/* Chart Section */}
        <div className="bg-[#1f1f1f] p-4 lg:p-6 rounded-lg border border-gray-700 mb-6 lg:mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            <h2 className="text-lg lg:text-xl font-semibold">Análisis de Ventas Totales</h2>
            <div className="flex gap-2">
              {(['days', 'months', 'events'] as const).map(m => (
                <button
                  key={m}
                  className={`px-3 lg:px-4 py-1.5 rounded-lg text-sm transition-colors ${
                    timeframe === m 
                      ? 'bg-[#FF5722] text-white' 
                      : 'bg-[#111] text-gray-300 hover:bg-opacity-80'
                  }`}
                  onClick={() => setTimeframe(m)}
                >
                  {m === 'days' ? 'Días' : m === 'months' ? 'Meses' : 'Eventos'}
                </button>
              ))}
            </div>
          </div>
          <div className="h-[300px] lg:h-[400px]">
            <ResponsiveContainer>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="date" 
                  stroke="#9CA3AF"
                  tick={{ fontSize: 12 }}
                  angle={-15}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  yAxisId="left" 
                  stroke="#9CA3AF" 
                  tickFormatter={v => `$${v}`}
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  yAxisId="right" 
                  orientation="right" 
                  stroke="#9CA3AF"
                  tick={{ fontSize: 12 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1f1f1f',
                    border: '1px solid #374151',
                    borderRadius: '8px'
                  }}
                />
                <Legend 
                  wrapperStyle={{
                    paddingTop: '20px'
                  }}
                />
                <Line 
                  yAxisId="left" 
                  dataKey="sales" 
                  type="monotone" 
                  name="Ventas ($)"
                  stroke="#FF5722"
                  strokeWidth={2}
                />
                <Line 
                  yAxisId="right" 
                  dataKey="tickets" 
                  type="monotone" 
                  name="Tickets"
                  stroke="#9333EA"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Events Table */}
        <div className="bg-[#1f1f1f] rounded-lg border border-gray-700 overflow-hidden">
          {/* Search Bar */}
          <div className="p-4 border-b border-gray-700">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Buscar eventos por nombre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-4 py-3 bg-[#2a2a2a] border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF5722] focus:border-transparent transition-all"
              />
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#111] text-gray-400 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left">Evento</th>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={handleDateSort}
                      className="flex items-center gap-2 hover:text-white transition-colors group"
                    >
                      Fecha de Publicación
                      {sortOrder === null && (
                        <ArrowUpDown className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                      {sortOrder === 'desc' && (
                        <ArrowDown className="h-4 w-4 text-[#FF5722]" />
                      )}
                      {sortOrder === 'asc' && (
                        <ArrowUp className="h-4 w-4 text-[#FF5722]" />
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-right">Ventas</th>
                  <th className="px-4 py-3 text-right">Tickets Pagos</th>
                  <th className="px-4 py-3 text-right">Tickets Gratis</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredAndSortedEvents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-gray-500 text-center">
                      {searchTerm ? 'No se encontraron eventos que coincidan con la búsqueda.' : 'No hay eventos para mostrar.'}
                    </td>
                  </tr>
                ) : filteredAndSortedEvents.map(e => (
                  <tr key={e.id} className="hover:bg-[#2a2a2a] transition-colors">
                    <td className="px-4 py-3 text-left">{e.name}</td>
                    <td className="px-4 py-3 text-left">
                      {format(new Date(e.createdAt), "d 'de' MMMM, yyyy", { locale: es })}
                    </td>
                    <td className="px-4 py-3 text-right">${e.totalSales.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">{e.ticketsPaid}</td>
                    <td className="px-4 py-3 text-right">{e.ticketsFree}</td>
                    <td className="px-4 py-3 text-right">{e.totalConfirmed}</td>
                    <td className="px-4 py-3 text-center">
                      <button 
                        className="text-[#FF5722] hover:text-opacity-80 transition-colors font-medium"
                        onClick={() => handleVerDetalles(e.id)}
                      >
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
    </div>
  );
};

export default MisEventos;
