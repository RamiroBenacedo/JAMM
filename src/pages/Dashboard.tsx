import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, subMonths, eachDayOfInterval, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronDown, ChevronUp, Save, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface TicketType {
  id: string;
  type: string;
  description: string;
  price: number;
  quantity: number;
  active: boolean;
}

interface Event {
  id: string;
  name: string;
  max_tickets_per_user: number;
  ticket_types: TicketType[];
}

interface EventStats {
  id: string;
  name: string;
  totalSales: number;
  ticketsSold: number;
  ticketsAvailable: number;
  max_tickets_per_user: number;
  totalFreeTickets: number;
  ticket_types: TicketType[];
  rrppTickets?: {
    rrpp: string;
    quantity: number;
    totalSales: number;
    eventName: string;
  }[];
}

interface ChartData {
  date: string;
  sales: number;
  tickets: number;
}

interface Purchase {
  date: string;
  sales: number;
  tickets: number;
}

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [timeframe, setTimeframe] = useState<'days' | 'months' | 'events'>('months');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eventStats, setEventStats] = useState<EventStats[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [purchaseData, setPurchaseData] = useState<Purchase[]>([]);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [editingTickets, setEditingTickets] = useState<{ [key: string]: TicketType }>({});
  const [saving, setSaving] = useState(false);
  const [showNewTicketForm, setShowNewTicketForm] = useState(false);
  const [newTicket, setNewTicket] = useState<Omit<TicketType, 'id'>>({
    type: '',
    description: '',
    price: 0,
    quantity: 0,
    active: true
  });
  const [totalStats, setTotalStats] = useState({
    totalSales: 0,
    totalTicketsSold: 0,
    totalTicketsAvailable: 0,
    totalEvents: 0,
    totalFreeTickets: 0
  });

  useEffect(() => {
    if (!user) {
      navigate('/ingresar');
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch events with ticket types and purchased tickets
        const { data: events, error: eventsError } = await supabase
          .from('events')
          .select(`
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
              purchased_tickets (
                quantity,
                total_price,
                purchase_date,
                payment_status,
                payment_id,
                rrpp
              )
            )
          `)
          .eq('creator_id', user.id);

        if (eventsError) throw eventsError;

        // Calculate stats for each event
        const stats: EventStats[] = events.map(event => {
          const filteredTicketTypes = event.ticket_types.map(type => {
            const validPurchases = type.purchased_tickets.filter(p => p.payment_status === 1).filter(p => p.payment_id != null);
            return {
              ...type,
              purchased_tickets: validPurchases
            };
          });
    
          const ticketsSold = filteredTicketTypes.reduce((total, type) =>
            total + type.purchased_tickets.reduce((sum, purchase) => sum + purchase.quantity, 0), 0);
    
          const totalSales = filteredTicketTypes.reduce((total, type) =>
            total + type.purchased_tickets.reduce((sum, purchase) => sum + purchase.total_price, 0), 0);
    
          const ticketsAvailable = filteredTicketTypes.reduce((total, type) => {
            if (type.type !== 'Cortesía') {
              return total + type.quantity;
            }
            return total;
          }, 0);

          const freeTickets = event.ticket_types.reduce((sum, type) => {
            if (!type.purchased_tickets) return sum;
            return sum + type.purchased_tickets
              .filter(p => p.payment_status === 1 && p.payment_id === null && p.total_price === 0)
              .reduce((subtotal, p) => subtotal + p.quantity, 0);
          }, 0);

          const rrppTicketsMap: { [rrpp: string]: { quantity: number, totalSales: number } } = {};

          event.ticket_types.forEach(type => {
            if (!type.purchased_tickets) return;
          
            type.purchased_tickets.forEach(ticket => {
              if (ticket.rrpp !== null && ticket.payment_status === 1) {
                if (!rrppTicketsMap[ticket.rrpp]) {
                  rrppTicketsMap[ticket.rrpp] = { quantity: 0, totalSales: 0 };
                }
                rrppTicketsMap[ticket.rrpp].quantity += ticket.quantity;
                rrppTicketsMap[ticket.rrpp].totalSales += ticket.total_price;
              }
            });
          });
          
          const rrppTickets = Object.entries(rrppTicketsMap).map(([rrpp, { quantity, totalSales }]) => ({
            rrpp,
            quantity,
            totalSales,
            eventName: event.name
          }));
          
          return {
            id: event.id,
            name: event.name,
            totalSales,
            ticketsSold,
            ticketsAvailable,
            max_tickets_per_user: event.max_tickets_per_user,
            ticket_types: filteredTicketTypes.map(({ purchased_tickets, ...ticket }) => ticket),
            totalFreeTickets: freeTickets,
            rrppTickets
          };
        });
    
        setEventStats(stats);
    
        // Calculate total stats
        const totals = stats.reduce((acc, event) => ({
          totalSales: acc.totalSales + event.totalSales,
          totalTicketsSold: acc.totalTicketsSold + event.ticketsSold,
          totalTicketsAvailable: acc.totalTicketsAvailable + event.ticketsAvailable,
          totalEvents: acc.totalEvents + 1,
          totalFreeTickets: acc.totalFreeTickets + event.totalFreeTickets
        }), {
          totalSales: 0,
          totalTicketsSold: 0,
          totalTicketsAvailable: 0,
          totalEvents: 0,
          totalFreeTickets: 0
        });
    
        setTotalStats(totals);
    
        // Prepare purchase data
        const purchases = events.flatMap(event =>
          event.ticket_types.flatMap(type =>
            type.purchased_tickets
              .filter(purchase => purchase.payment_status === 1)
              .map(purchase => ({
                date: purchase.purchase_date,
                sales: purchase.total_price,
                tickets: purchase.quantity
              }))
          )
        );
    
        setPurchaseData(purchases);
        updateChartData(purchases, timeframe);
    
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Error al cargar los datos del dashboard');
      } finally {
        setLoading(false);
      }
    };    

    fetchData();
  }, [user, navigate, timeframe]);

  const updateChartData = (purchases: Purchase[], selectedTimeframe: 'days' | 'months' | 'events') => {
    if (purchases.length === 0) {
      setChartData([]);
      return;
    }

    let data: ChartData[] = [];

    if (selectedTimeframe === 'months') {
      // Group by months
      const monthlyData = new Map<string, { sales: number; tickets: number }>();
      
      const last6Months = Array.from({ length: 6 }, (_, i) => {
        const date = subMonths(new Date(), i);
        return format(date, 'yyyy-MM');
      }).reverse();

      last6Months.forEach(month => {
        monthlyData.set(month, { sales: 0, tickets: 0 });
      });

      purchases.forEach(purchase => {
        const purchaseDate = new Date(purchase.date);
        if (isValid(purchaseDate)) {
          const month = format(purchaseDate, 'yyyy-MM');
          if (monthlyData.has(month)) {
            const current = monthlyData.get(month)!;
            monthlyData.set(month, {
              sales: current.sales + purchase.sales,
              tickets: current.tickets + purchase.tickets
            });
          }
        }
      });

      data = Array.from(monthlyData.entries()).map(([month, stats]) => ({
        date: format(new Date(month), 'MMM yyyy', { locale: es }),
        sales: stats.sales,
        tickets: stats.tickets
      }));

    } else if (selectedTimeframe === 'days') {
      // Group by days (last 30 days)
      const days = eachDayOfInterval({
        start: subMonths(new Date(), 1),
        end: new Date()
      });

      const dailyData = new Map<string, { sales: number; tickets: number }>();
      
      days.forEach(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        dailyData.set(dayStr, { sales: 0, tickets: 0 });
      });

      purchases.forEach(purchase => {
        const purchaseDate = new Date(purchase.date);
        if (isValid(purchaseDate)) {
          const day = format(purchaseDate, 'yyyy-MM-dd');
          if (dailyData.has(day)) {
            const current = dailyData.get(day)!;
            dailyData.set(day, {
              sales: current.sales + purchase.sales,
              tickets: current.tickets + purchase.tickets
            });
          }
        }
      });

      data = Array.from(dailyData.entries()).map(([day, stats]) => ({
        date: format(new Date(day), 'd MMM', { locale: es }),
        sales: stats.sales,
        tickets: stats.tickets
      }));

    } else {
      // Group by events
      data = eventStats.map(event => ({
        date: event.name,
        sales: event.totalSales,
        tickets: event.ticketsSold
      }));
    }

    setChartData(data);
  };

  const handleTicketChange = (ticketId: string, field: keyof TicketType, value: string | number) => {
    setEditingTickets(prev => ({
      ...prev,
      [ticketId]: {
        ...prev[ticketId],
        [field]: value
      }
    }));
  };

  const handleSaveTickets = async (eventId: string) => {
    try {
      setSaving(true);
      setError(null);
      
      // Update each modified ticket type
      for (const [ticketId, ticket] of Object.entries(editingTickets)) {
        const { error } = await supabase
          .from('ticket_types')
          .update({
            price: ticket.price,
            quantity: ticket.quantity,
            description: ticket.description
          })
          .eq('id', ticketId);

        if (error) throw error;
      }

      // Refresh data to show updated values
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select(`
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
            purchased_tickets (
              quantity,
              total_price,
              purchase_date,
              payment_id,
              payment_status
            )
          )
        `)
        .eq('creator_id', user?.id);

      if (eventsError) throw eventsError;

      // Calculate stats for each event
      const stats: EventStats[] = events.map(event => {
        const ticketsSold = event.ticket_types.reduce((total, type) => 
          total + type.purchased_tickets.reduce((sum, purchase) => sum + purchase.quantity, 0), 0);
        
        const totalSales = event.ticket_types.reduce((total, type) => 
          total + type.purchased_tickets.reduce((sum, purchase) => sum + purchase.total_price, 0), 0);
        
        const ticketsAvailable = event.ticket_types.reduce((total, type) => {
          if (type.type !== 'Cortesía') {
            return total + type.quantity;
          }
          return total;
        }, 0);

        const freeTickets = event.ticket_types.reduce((sum, type) => {
          if (!type.purchased_tickets) return sum;
          return sum + type.purchased_tickets
            .filter(p => p.payment_status === 1 && p.payment_id === null && p.total_price === 0)
            .reduce((subtotal, p) => subtotal + p.quantity, 0);
        }, 0);

        return {
          id: event.id,
          name: event.name,
          totalSales,
          ticketsSold,
          ticketsAvailable,
          max_tickets_per_user: event.max_tickets_per_user,
          ticket_types: event.ticket_types.map(({ purchased_tickets, ...ticket }) => ticket),
          totalFreeTickets: freeTickets
        };
      });

      setEventStats(stats);
      setExpandedEventId(null);
      setEditingTickets({});

    } catch (err) {
      console.error('Error updating tickets:', err);
      setError('Error al actualizar los tickets. Por favor, intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddNewTicket = async (eventId: string) => {
    if (!newTicket.type || !newTicket.description || newTicket.quantity <= 0) {
      setError('Por favor complete todos los campos correctamente');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // Insert new ticket type
      const { data: ticketData, error: ticketError } = await supabase
        .from('ticket_types')
        .insert({
          event_id: eventId,
          type: newTicket.type,
          description: newTicket.description,
          price: newTicket.price,
          quantity: newTicket.quantity
        })
        .select()
        .single();

      if (ticketError) throw ticketError;

      // Update local state
      const updatedEventStats = eventStats.map(event => {
        if (event.id === eventId) {
          return {
            ...event,
            ticketsAvailable: event.ticketsAvailable + (newTicket.type !== 'Cortesía' ? newTicket.quantity : 0),
            ticket_types: [...event.ticket_types, ticketData]
          };
        }
        return event;
      });

      setEventStats(updatedEventStats);

      // Reset form
      setNewTicket({
        type: '',
        description: '',
        price: 0,
        quantity: 0,
        active: true
      });
      setShowNewTicketForm(false);

    } catch (err) {
      console.error('Error adding new ticket type:', err);
      setError('Error al agregar nuevo tipo de ticket. Por favor, intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTicket = async (ticketId: string) => {
    try {
      setSaving(true);
      setError(null);

      const { error: updateError } = await supabase
        .from('ticket_types')
        .update({ active: false })
        .eq('id', ticketId);
  
      if (updateError) throw updateError;

      setEventStats(prevStats => 
        prevStats.map(event => ({
          ...event,
          ticket_types: event.ticket_types.map(ticket => 
            ticket.id === ticketId ? { ...ticket, active: false } : ticket
          ),
          ticketsAvailable: event.ticket_types.reduce((total, type) => 
            total + (type.active ? type.quantity : 0), 0)
        }))
      );
  
      // Show success message
      setError('Ticket marcado como inactivo exitosamente');
      setTimeout(() => setError(null), 3000);
  
    } catch (err) {
      console.error('Error updating ticket active status:', err);
      setError('Error al actualizar el estado del ticket. Por favor, intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-[#2a2a2a]">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#56ae4a]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#2a2a2a]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-white mb-8">Dashboard</h1>

        {error && (
          <div className="mb-8 bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-[#1f1f1f] rounded-lg p-6 border border-gray-700">
            <h3 className="text-gray-400 text-sm font-medium">Ventas Totales</h3>
            <p className="mt-2 text-3xl font-bold text-white">${totalStats.totalSales.toFixed(2)}</p>
          </div>
          <div className="bg-[#1f1f1f] rounded-lg p-6 border border-gray-700">
            <h3 className="text-gray-400 text-sm font-medium">Tickets Vendidos</h3>
            <p className="mt-2 text-3xl font-bold text-white">{totalStats.totalTicketsSold}</p>
          </div>
          <div className="bg-[#1f1f1f] rounded-lg p-6 border border-gray-700">
            <h3 className="text-gray-400 text-sm font-medium">Tickets Disponibles</h3>
            <p className="mt-2 text-3xl font-bold text-white">{totalStats.totalTicketsAvailable}</p>
          </div>
          <div className="bg-[#1f1f1f] rounded-lg p-6 border border-gray-700">
            <h3 className="text-gray-400 text-sm font-medium">Tickets Gratuitos</h3>
            <p className="mt-2 text-3xl font-bold text-white">{totalStats.totalFreeTickets}</p>
          </div>
          <div className="bg-[#1f1f1f] rounded-lg p-6 border border-gray-700">
            <h3 className="text-gray-400 text-sm font-medium">Total Eventos</h3>
            <p className="mt-2 text-3xl font-bold text-white">{totalStats.totalEvents}</p>
          </div>
        </div>
        {/* Chart Section */}
        <div className="bg-[#1f1f1f] rounded-lg p-6 border border-gray-700 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-white">Análisis de Ventas</h2>
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  setTimeframe('days');
                  updateChartData(purchaseData, 'days');
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  timeframe === 'days'
                    ? 'bg-[#56ae4a] text-white'
                    : 'bg-[#111111] text-gray-300 hover:bg-[#1a1a1a]'
                }`}
              >
                Días
              </button>
              <button
                onClick={() => {
                  setTimeframe('months');
                  updateChartData(purchaseData, 'months');
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  timeframe === 'months'
                    ? 'bg-[#56ae4a] text-white'
                    : 'bg-[#111111] text-gray-300 hover:bg-[#1a1a1a]'
                }`}
              >
                Meses
              </button>
              <button
                onClick={() => {
                  setTimeframe('events');
                  updateChartData(purchaseData, 'events');
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  timeframe === 'events'
                    ? 'bg-[#56ae4a] text-white'
                    : 'bg-[#111111] text-gray-300 hover:bg-[#1a1a1a]'
                }`}
              >
                Eventos
              </button>
            </div>
          </div>
          
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="date"
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                />
                <YAxis
                  yAxisId="left"
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value) => `$${value}`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f1f1f',
                    border: '1px solid #374151',
                    borderRadius: '0.5rem',
                  }}
                  itemStyle={{ color: '#E5E7EB' }}
                  labelStyle={{ color: '#E5E7EB' }}
                />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="sales"
                  stroke="#56ae4a"
                  name="Ventas ($)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="tickets"
                  stroke="#9333ea"
                  name="Tickets"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        {/* Separacion */}
        <br />
        <hr />
        <br />
        {/* RRPPs Stats */}
        <h2 className="text-3xl font-semibold text-white mb-6">Estadísticas de RRPPs</h2>
        {eventStats.flatMap(event => {
          const rrppTickets = event.rrppTickets ?? [];
          console.log(rrppTickets.length);
          if (rrppTickets.length > 0) {
            return (
              <div key={event.id} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {rrppTickets.map(rrpp => (
                  <div key={`${event.id}-${rrpp.rrpp}`} className="bg-[#1f1f1f] rounded-lg p-6 border border-gray-700">
                    <h3 className="text-gray-400 text-sm font-medium">{rrpp.rrpp}</h3>
                    <p className="mt-2 text-2xl font-bold text-white">{event.name}</p>
                    <p className="text-sm">🎟️ Tickets vendidos: <span className="font-medium">{rrpp.quantity}</span></p>
                    <p className="text-sm">💰 Total vendido: <span className="font-medium">${rrpp.totalSales.toFixed(2)}</span></p>
                  </div>
                ))}
              </div>
            );
          } else {
            return (
              <p key={event.id} className="text-center text-lg text-gray-500">No se encontró información de ningún RRPP.</p>
            );
          }
        })}
        <br />
        <hr />
        <br />
        {/* Events Table */}
        <div className="bg-[#1f1f1f] rounded-lg border border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-700">
            <h2 className="text-xl font-semibold text-white">Detalles por Evento</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-[#111111]">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Evento
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Ventas
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Tickets Vendidos
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Tickets Disponibles
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-[#1f1f1f] divide-y divide-gray-700">
                {eventStats.map((event) => (
                  <React.Fragment key={event.id}>
                    <tr className="hover:bg-[#2a2a2a]">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                        {event.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        ${event.totalSales.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {event.ticketsSold}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {event.ticketsAvailable}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        <button
                          onClick={() => setExpandedEventId(expandedEventId === event.id ? null : event.id)}
                          className="text-[#56ae4a] hover:text-[#68c95b] flex items-center"
                        >
                          {expandedEventId === event.id ? (
                            <>
                              <ChevronUp className="h-4 w-4 mr-1" />
                              Ocultar
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-4 w-4 mr-1" />
                              Administrar
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                    {expandedEventId === event.id && (
                      <tr>
                        <td colSpan={5} className="px-6 py-4 bg-[#111111]">
                          <div className="space-y-4">
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="text-lg font-medium text-white">Tipos de Tickets</h3>
                              <div className="flex space-x-4">
                                <button
                                  onClick={() => setShowNewTicketForm(true)}
                                  className="flex items-center px-4 py-2 bg-[#56ae4a] text-white rounded-lg hover:bg-[#68c95b]"
                                >
                                  <Plus className="h-4 w-4 mr-2" />
                                  Nuevo tipo de ticket
                                </button>
                                <button
                                  onClick={() => handleSaveTickets(event.id)}
                                  disabled={saving}
                                  className="flex items-center px-4 py-2 bg-[#56ae4a] text-white rounded-lg hover:bg-[#68c95b] disabled:opacity-50"
                                >
                                  <Save className="h-4 w-4 mr-2" />
                                  {saving ? 'Guardando...' : 'Guardar cambios'}
                                </button>
                              </div>
                            </div>

                            {showNewTicketForm && (
                              <div className="bg-[#1f1f1f] p-4 rounded-lg border border-gray-700 mb-4">
                                <h4 className="text-white font-medium mb-4">Nuevo Tipo de Ticket</h4>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">
                                      Tipo
                                    </label>
                                    <input
                                      type="text"
                                      value={newTicket.type}
                                      onChange={(e) => setNewTicket(prev => ({ ...prev, type: e.target.value }))}
                                      className="w-full bg-[#111111] border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-[#56ae4a] focus:ring-1 focus:ring-[#56ae4a]"
                                      placeholder="Ej: VIP, General"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">
                                      Descripción
                                    </label>
                                    <input
                                      type="text"
                                      value={newTicket.description}
                                      onChange={(e) => setNewTicket(prev => ({ ...prev, description: e.target.value }))}
                                      className="w-full bg-[#111111] border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-[#56ae4a] focus:ring-1 focus:ring-[#56ae4a]"
                                      placeholder="Describe los beneficios"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">
                                      Precio
                                    </label>
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={newTicket.price}
                                      onChange={(e) => setNewTicket(prev => ({ ...prev, price: parseFloat(e.target.value) }))}
                                      className="w-full bg-[#111111] border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-[#56ae4a] focus:ring-1 focus:ring-[#56ae4a]"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">
                                      Cantidad Disponible
                                    </label>
                                    <input
                                      type="number"
                                      min="0"
                                      value={newTicket.quantity}
                                      onChange={(e) => setNewTicket(prev => ({ ...prev, quantity: parseInt(e.target.value) }))}
                                      className="w-full bg-[#111111] border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-[#56ae4a] focus:ring-1 focus:ring-[#56ae4a]"
                                    />
                                  </div>
                                </div>
                                <div className="flex justify-end mt-4 space-x-4">
                                  <button
                                    onClick={() => setShowNewTicketForm(false)}
                                    className="px-4 py-2 bg-[#111111] text-white rounded-lg hover:bg-[#1a1a1a]"
                                  >
                                    Cancelar
                                  </button>
                                  <button
                                    onClick={() => handleAddNewTicket(event.id)}
                                    disabled={saving || !newTicket.type || !newTicket.description}
                                    className="px-4 py-2 bg-[#56ae4a] text-white rounded-lg hover:bg-[#68c95b] disabled:opacity-50"
                                  >
                                    {saving ? 'Agregando...' : 'Agregar Ticket'}
                                  </button>
                                </div>
                              </div>
                            )}
                            
                            <div className="grid gap-4">
                              {event.ticket_types.filter(ticket => ticket.active === true).map((ticket) => (
                                <div key={ticket.id} className="bg-[#1f1f1f] p-4 rounded-lg border border-gray-700">
                                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                    <div>
                                      <label className="block text-sm font-medium text-gray-300 mb-1">
                                        Tipo
                                      </label>
                                      <input
                                        type="text"
                                        value={editingTickets[ticket.id]?.type || ticket.type}
                                        disabled
                                        className="w-full bg-[#111111] border border-gray-600 rounded-lg px-3 py-2 text-white disabled:opacity-50"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-sm font-medium text-gray-300 mb-1">
                                        Descripción
                                      </label>
                                      <input
                                        type="text"
                                        value={editingTickets[ticket.id]?.description || ticket.description}
                                        onChange={(e) =>
                                          handleTicketChange(ticket.id, 'description', e.target.value)}
                                        className="w-full bg-[#111111] border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-[#56ae4a] focus:ring-1 focus:ring-[#56ae4a]"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-sm font-medium text-gray-300 mb-1">
                                        Precio
                                      </label>
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={editingTickets[ticket.id]?.price || ticket.price}
                                        onChange={(e) =>
                                          handleTicketChange(ticket.id, 'price', parseFloat(e.target.value))}
                                        className="w-full bg-[#111111] border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-[#56ae4a] focus:ring-1 focus:ring-[#56ae4a]"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-sm font-medium text-gray-300 mb-1">
                                        Cantidad Disponible
                                      </label>
                                      <input
                                        type="number"
                                        min="0"
                                        value={editingTickets[ticket.id]?.quantity || ticket.quantity}
                                        onChange={(e) =>
                                          handleTicketChange(ticket.id, 'quantity', parseInt(e.target.value))}
                                        className="w-full bg-[#111111] border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-[#56ae4a] focus:ring-1 focus:ring-[#56ae4a]"
                                      />
                                    </div>
                                    <div className="flex items-end">
                                      {ticket.type !== 'Cortesía' && (
                                        <button
                                          onClick={() => handleDeleteTicket(ticket.id)}
                                          disabled={saving}
                                          className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center disabled:opacity-50"
                                        >
                                          <Trash2 className="h-4 w-4 mr-2" />
                                          {saving ? 'Eliminando...' : 'Eliminar'}
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;