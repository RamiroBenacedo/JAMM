// src/pages/EventDetailsRRPP.tsx
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import SendEntryByEmail from '../components/SendEntryByEmail';
import { BarChart3, Users, Gift, DollarSign, Ticket, Calendar, MapPin, AlertTriangle, Mail, Copy, Check } from 'lucide-react';


type TicketData = {
  id: string;
  quantity: number;
  total_price: number;
  email: string | null;
  created_at: string;
  payment_status: number;
  rrpp: string | null;
  ticket_types: {
    id: string;
    event_id: string;
    name: string;
    description: string | null;
    price: number;
  };
};

type EventData = {
  id: string;
  name: string;
  description: string | null;
  date: string;
  location: string | null;
  creator_id: string;
};

type RRPPStats = {
  totalTicketsSold: number;
  totalTicketsFree: number;
  totalTicketsConfirmed: number;
  totalRevenue: number;
  ticketTypeBreakdown: {
    name: string;
    quantity: number;
    totalPrice: number;
    isFree: boolean;
  }[];
};

const EventDetailsRRPP: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  
  // Estados principales
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eventData, setEventData] = useState<EventData | null>(null);
  const [rrppCode, setRrppCode] = useState<string | null>(null);
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [freeTickets, setFreeTickets] = useState<TicketData[]>([]);
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState<RRPPStats>({
    totalTicketsSold: 0,
    totalTicketsFree: 0,
    totalTicketsConfirmed: 0,
    totalRevenue: 0,
    ticketTypeBreakdown: []
  });
  const [isAssigned, setIsAssigned] = useState(false);

  // Función para obtener datos del RRPP
  const fetchRRPPData = async (userId: string) => {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      throw new Error('No se pudo obtener el perfil del usuario');
    }

    const { data: rrpp, error: rrppError } = await supabase
      .from('rrpp')
      .select('id, codigo')
      .eq('profile_id', profile.id)
      .single();

    if (rrppError || !rrpp) {
      throw new Error('No se encontró el RRPP asociado al usuario');
    }

    return { rrppId: rrpp.id, rrppCode: rrpp.codigo };
  };

  // Función para verificar asignación al evento
  const checkEventAssignment = async (rrppId: string, eventId: string) => {
    const { data: assignment, error } = await supabase
      .from('profile_events')
      .select('id')
      .eq('rrpp_id', rrppId)
      .eq('event_id', eventId)
      .eq('activo', true)
      .single();

    return !error && assignment;
  };

  // Función para obtener datos del evento
  const fetchEventData = async (eventId: string) => {
    const { data: event, error } = await supabase
      .from('events')
      .select('id, name, description, date, location, creator_id')
      .eq('id', eventId)
      .single();

    if (error || !event) {
      throw new Error('No se pudo obtener la información del evento');
    }

    return event as EventData;
  };


  // Función para obtener todos los tickets del RRPP para el evento específico
  const fetchRRPPTickets = async (rrppCode: string, eventId: string) => {
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
          rrpp,
          email
        )
      )`;

    const { data, error } = await supabase
      .from('events')
      .select(baseSelect)
      .eq('id', eventId)
      .eq('ticket_types.purchased_tickets.payment_status', 1)
      .eq('ticket_types.purchased_tickets.rrpp', rrppCode);

    if (error) {
      console.error('Error fetching RRPP tickets:', error);
      throw new Error('Error al obtener los tickets del RRPP');
    }

    const events = data || [];
    if (events.length === 0) return [];

    const event = events[0];
    const tickets: TicketData[] = [];

    if (Array.isArray(event.ticket_types)) {
      for (const ticketType of event.ticket_types) {
        if (Array.isArray(ticketType.purchased_tickets)) {
          for (const purchase of ticketType.purchased_tickets) {
            tickets.push({
              id: `${ticketType.id}_${purchase.payment_id || Date.now()}`,
              quantity: purchase.quantity || 0,
              total_price: purchase.total_price || 0,
              email: purchase.email || null,
              created_at: purchase.purchase_date || '',
              payment_status: purchase.payment_status || 0,
              rrpp: purchase.rrpp || null,
              ticket_types: {
                id: ticketType.id || '',
                event_id: eventId,
                name: ticketType.type || '',
                description: ticketType.description || null,
                price: ticketType.price || 0
              }
            });
          }
        }
      }
    }

    return tickets;
  };

  // Función para copiar el link del RRPP
  const copyRRPPLink = async () => {
    if (!rrppCode || !id) return;
    
    const rrppLink = `https://jammcmmnty.com/evento/${id}?rrpp=${rrppCode}`;
    
    try {
      await navigator.clipboard.writeText(rrppLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Error al copiar el link:', err);
      // Fallback para navegadores que no soportan clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = rrppLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Función para calcular estadísticas
  const calculateStats = (ticketsData: TicketData[]): RRPPStats => {
    const stats = ticketsData.reduce(
      (acc, ticket) => {
        const quantity = ticket.quantity;
        const price = ticket.total_price;
        const isFree = price === 0;

        if (isFree) {
          acc.totalTicketsFree += quantity;
        } else {
          acc.totalTicketsSold += quantity;
          acc.totalRevenue += price;
        }

        acc.totalTicketsConfirmed += quantity;

        // Agregar al desglose por tipo
        const existingType = acc.ticketTypeBreakdown.find(
          item => item.name === ticket.ticket_types.name
        );

        if (existingType) {
          existingType.quantity += quantity;
          existingType.totalPrice += price;
        } else {
          acc.ticketTypeBreakdown.push({
            name: ticket.ticket_types.name,
            quantity: quantity,
            totalPrice: price,
            isFree: isFree
          });
        }

        return acc;
      },
      {
        totalTicketsSold: 0,
        totalTicketsFree: 0,
        totalTicketsConfirmed: 0,
        totalRevenue: 0,
        ticketTypeBreakdown: []
      } as RRPPStats
    );

    return stats;
  };

  // Efecto principal para cargar todos los datos
  useEffect(() => {
    const loadData = async () => {
      if (!user?.id || !id) return;

      try {
        setLoading(true);
        setError(null);

        // 1. Obtener datos del RRPP
        const { rrppId, rrppCode: code } = await fetchRRPPData(user.id);
        setRrppCode(code);

        // 2. Verificar asignación al evento
        const assigned = await checkEventAssignment(rrppId, id);
        if (!assigned) {
          setIsAssigned(false);
          setLoading(false);
          return;
        }
        setIsAssigned(true);

        // 3. Obtener datos del evento
        const event = await fetchEventData(id);
        setEventData(event);

        // 4. Obtener tickets del RRPP para este evento
        const ticketsData = await fetchRRPPTickets(code, id);
        setTickets(ticketsData);

        // 5. Filtrar entradas gratuitas para la tabla específica
        const freeTicketsData = ticketsData.filter(ticket => ticket.total_price === 0);
        setFreeTickets(freeTicketsData);

        // 6. Calcular estadísticas
        const calculatedStats = calculateStats(ticketsData);
        setStats(calculatedStats);

      } catch (err) {
        console.error('Error loading RRPP event details:', err);
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user?.id, id]);

  // Estados de carga y error
  if (loading) {
    return (
      <div className="bg-[#2a2a2a] min-h-[calc(100vh-8rem)]">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FF5722]"></div>
        </div>
      </div>
    );
  }

  if (!isAssigned) {
    return (
      <div className="bg-[#2a2a2a] min-h-[calc(100vh-8rem)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-red-900/50 border border-red-500 text-red-200 px-6 py-8 rounded-lg">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 mr-4" />
              <div>
                <h3 className="text-lg font-medium mb-2" >
                  Acceso Denegado
                </h3>
                <p className="text-sm" >
                  No tienes permisos para ver este evento. Contacta al organizador para ser asignado como RRPP.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#2a2a2a] min-h-[calc(100vh-8rem)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-red-900/50 border border-red-500 text-red-200 px-6 py-8 rounded-lg">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 mr-4" />
              <div>
                <h3 className="text-lg font-medium mb-2" >
                  Error al Cargar Datos
                </h3>
                <p className="text-sm" >
                  {error}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!eventData) {
    return (
      <div className="bg-[#2a2a2a] min-h-[calc(100vh-8rem)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-white text-center">No se encontró información del evento.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#2a2a2a] min-h-[calc(100vh-8rem)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-8">
          
          {/* Header del evento */}
          <div className="bg-[#1f1f1f] shadow rounded-lg border border-gray-700 p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-4">
                  <BarChart3 className="h-8 w-8 text-[#FF5722]" />
                  <h1 className="text-2xl lg:text-3xl font-bold text-white">
                    {eventData.name}
                  </h1>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-300">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-[#FF5722]" />
                    <span >
                      {new Date(eventData.date).toLocaleDateString('es-ES', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                  
                  {eventData.location && (
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-[#FF5722]" />
                      <span >
                        {eventData.location}
                      </span>
                    </div>
                  )}
                </div>
                
                {eventData.description && (
                  <p className="mt-4 text-gray-400" >
                    {eventData.description}
                  </p>
                )}
              </div>
              
              <div className="bg-[#FF5722]/20 px-4 py-3 rounded-lg border border-[#FF5722]/30">
                <div className="text-center">
                  <p className="text-xs lg:text-sm text-gray-400 mb-2">
                    Link del RRPP
                  </p>
                  <button
                    onClick={copyRRPPLink}
                    className="flex items-center justify-center space-x-2 w-full px-3 py-2 bg-[#FF5722] text-white text-sm font-medium rounded-md hover:bg-[#E64A19] transition-colors focus:outline-none focus:ring-2 focus:ring-[#FF5722]/50"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4" />
                        <span>¡Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        <span>Copiar Link</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Métricas de rendimiento */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-[#1f1f1f] p-6 rounded-lg border border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Ticket className="h-6 w-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400" >
                    Total Confirmadas
                  </p>
                  <p className="text-2xl font-bold text-white" >
                    {stats.totalTicketsConfirmed}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-[#1f1f1f] p-6 rounded-lg border border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-[#FF5722]/20 rounded-lg">
                  <Users className="h-6 w-6 text-[#FF5722]" />
                </div>
                <div>
                  <p className="text-sm text-gray-400" >
                    Entradas Vendidas
                  </p>
                  <p className="text-2xl font-bold text-white" >
                    {stats.totalTicketsSold}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-[#1f1f1f] p-6 rounded-lg border border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <Gift className="h-6 w-6 text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400" >
                    Entradas Gratuitas
                  </p>
                  <p className="text-2xl font-bold text-white" >
                    {stats.totalTicketsFree}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-[#1f1f1f] p-6 rounded-lg border border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-yellow-500/20 rounded-lg">
                  <DollarSign className="h-6 w-6 text-yellow-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400" >
                    Ingresos Generados
                  </p>
                  <p className="text-2xl font-bold text-white" >
                    ${stats.totalRevenue.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Desglose por tipo de entrada */}
          {stats.ticketTypeBreakdown.length > 0 && (
            <div className="bg-[#1f1f1f] rounded-lg border border-gray-700">
              <div className="px-6 py-4 border-b border-gray-600">
                <div className="flex items-center space-x-2">
                  <Ticket className="h-5 w-5 text-[#FF5722]" />
                  <h2 className="text-xl font-semibold text-white" >
                    Desglose por Tipo de Entrada
                  </h2>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#111111]">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider" >
                        Tipo de Entrada
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider" >
                        Cantidad
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider" >
                        Precio Total
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider" >
                        Estado
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-600">
                    {stats.ticketTypeBreakdown.map((item, index) => (
                      <tr key={index} className="hover:bg-[#2a2a2a] transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <Ticket className="h-4 w-4 text-[#FF5722] mr-2" />
                            <span className="text-sm font-medium text-white" >
                              {item.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-sm font-semibold text-white" >
                            {item.quantity}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-sm font-semibold text-white" >
                            ${item.totalPrice.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            item.isFree 
                              ? 'bg-green-900/50 text-green-200 border border-green-500' 
                              : 'bg-blue-900/50 text-blue-200 border border-blue-500'
                          }`} >
                            {item.isFree ? 'Gratuita' : 'Paga'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tabla de entradas gratuitas emitidas */}
          {freeTickets.length > 0 && (
            <div className="bg-[#1f1f1f] rounded-lg border border-gray-700">
              <div className="px-6 py-4 border-b border-gray-600">
                <div className="flex items-center space-x-2">
                  <Gift className="h-5 w-5 text-green-400" />
                  <h2 className="text-xl font-semibold text-white">
                    Entradas Gratuitas Emitidas
                  </h2>
                  <span className="bg-green-500/20 text-green-400 text-sm font-medium px-2 py-1 rounded-full">
                    {freeTickets.length} {freeTickets.length === 1 ? 'entrada' : 'entradas'}
                  </span>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <div className="max-h-[500px] overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-[#111111] sticky top-0">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Tipo de Entrada
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Email Destinatario
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Cantidad
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Fecha de Emisión
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-600">
                      {freeTickets.map((ticket, index) => (
                        <tr key={ticket.id || index} className="hover:bg-[#2a2a2a] transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <Ticket className="h-4 w-4 text-green-400 mr-2" />
                              <span className="text-sm font-medium text-white">
                                {ticket.ticket_types.name}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <Mail className="h-4 w-4 text-gray-400 mr-2" />
                              <span className="text-sm text-white">
                                {ticket.email || 'Sin email registrado'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900/50 text-green-200 border border-green-500">
                              {ticket.quantity}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-gray-300">
                              {ticket.created_at 
                                ? new Date(ticket.created_at).toLocaleDateString('es-ES', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })
                                : 'Fecha no disponible'
                              }
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Componente para enviar entradas gratuitas */}
          <div className="bg-[#1f1f1f] rounded-lg border border-gray-700 p-6">
            <SendEntryByEmail eventId={id!} rrppCodigo={rrppCode} />
          </div>

        </div>
      </div>
    </div>
  );
};

export default EventDetailsRRPP;