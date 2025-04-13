import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Ticket, Calendar, QrCode, Mail, User, CheckCircle, XCircle, Clock, AlertTriangle, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import QRCode from 'qrcode';

interface PurchasedTicket {
  id: string;
  quantity: number;
  total_price: number;
  purchase_date: string;
  qr_code: string;
  active: boolean;
  payment_status: number;
  payment_id: number;
  ticket_type: {
    type: string;
    event: {
      name: string;
      date: string;
      time: string;
      location: string;
    }
  }
}

interface Event {
  id: string;
  name: string;
  date: string;
  time: string;
  location: string;
  ticket_types: {
    type: string;
    quantity: number;
  }[]
}

const Profile = () => {
  const [activeTab, setActiveTab] = useState('tickets');
  const { user } = useAuth();
  const [purchasedTickets, setPurchasedTickets] = useState<PurchasedTicket[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrCodes, setQrCodes] = useState<{[key: string]: string}>({});
  const [userData, setUserData] = useState<{
    full_name: string | null;
    email: string | null;
  }>({
    full_name: null,
    email: null
  });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const generateQRCode = async (ticketId: string, qrCode: string) => {
      try {
        const qrDataUrl = await QRCode.toDataURL(qrCode, {
          width: 200,
          margin: 0,
          color: {
            dark: '#FFFFFF',
            light: '#00000000'
          },
          errorCorrectionLevel: 'L'
        });
        setQrCodes(prev => ({
          ...prev,
          [ticketId]: qrDataUrl
        }));
      } catch (err) {
        console.error('Error generating QR code:', err);
      }
    };

    const fetchUserData = async () => {
      if (!user) return;

      try {
        // Get user metadata
        const { data: { user: userData }, error: userError } = await supabase.auth.getUser();
        
        if (userError) throw userError;
        
        setUserData({
          full_name: userData?.user_metadata?.full_name || 'Usuario',
          email: userData?.email || ''
        });

        // Fetch purchased tickets with event details
        const { data: ticketsData, error: ticketsError } = await supabase
          .from('purchased_tickets')
          .select(`
            id,
            quantity,
            total_price,
            purchase_date,
            qr_code,
            active,
            payment_id,
            payment_status,
            ticket_type:ticket_type_id (
              type,
              event:event_id (
                name,
                date,
                time,
                location
              )
            )
          `)
          .eq('user_id', user.id)
          .order('purchase_date', { ascending: false });

        if (ticketsError) throw ticketsError;
        setPurchasedTickets(ticketsData || []);

        // Generate QR codes for each ticket
        for (const ticket of ticketsData || []) {
          await generateQRCode(ticket.id, ticket.qr_code);
        }

        // Fetch events created by the user
        const { data: eventsData, error: eventsError } = await supabase
          .from('events')
          .select(`
            id,
            name,
            date,
            time,
            location,
            ticket_types (
              type,
              quantity
            )
          `)
          .eq('creator_id', user.id)
          .order('date', { ascending: true });

        if (eventsError) throw eventsError;
        setEvents(eventsData || []);

      } catch (err) {
        console.error('Error fetching user data:', err);
        setError('Error al cargar los datos. Por favor, intenta de nuevo más tarde.');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user]);

  const calculateAvailableTickets = (event: Event) => {
    return event.ticket_types.reduce((sum, ticket) => {
      // Only count non-courtesy tickets
      if (ticket.type !== 'Cortesía') {
        return sum + ticket.quantity;
      }
      return sum;
    }, 0);
  };

  const handleDeleteEvent = async (eventId: string) => {
    setEventToDelete(eventId);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!eventToDelete) return;
  
    try {
      setDeleting(true);
  
      const { data: ticketTypes, error: ttError } = await supabase
        .from('ticket_types')
        .select('id')
        .eq('event_id', eventToDelete);
  
      if (ttError) throw ttError;
      const ticketTypeIds = ticketTypes.map(tt => tt.id);
  
      await supabase
        .from('purchased_tickets')
        .update({ ticket_type_id: null })
        .in('ticket_type_id', ticketTypeIds);
  
      await supabase
        .from('ticket_types')
        .delete()
        .in('id', ticketTypeIds);

      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventToDelete);
  
      if (error) throw error;
  
      setEvents(events.filter(event => event.id !== eventToDelete));
      setShowDeleteModal(false);
      setEventToDelete(null);
    } catch (err) {
      console.error('Error deleting event:', err);
      setError('Error al eliminar el evento. Por favor, intenta de nuevo más tarde.');
    } finally {
      setDeleting(false);
    }
  };
  

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-[#1f1f1f] shadow rounded-lg border border-gray-700">
          <div className="px-4 py-5 sm:px-6">
            <div className="flex flex-col space-y-2">
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-[#56ae4a]" />
                <h2 className="text-2xl font-bold text-white">{userData.full_name}</h2>
              </div>
              <div className="flex items-center space-x-2 text-gray-400">
                <Mail className="h-4 w-4" />
                <span>{userData.email}</span>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-700">
            <div className="px-4 py-5 sm:p-6">
              {error && (
                <div className="mb-6 bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              <div className="border-b border-gray-700">
                <nav className="-mb-px flex space-x-8">
                  <button
                    className={`${
                      activeTab === 'tickets'
                        ? 'border-[#56ae4a] text-[#56ae4a]'
                        : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'
                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                    onClick={() => setActiveTab('tickets')}
                  >
                    <Ticket className="w-5 h-5 inline mr-2" />
                    Mis Tickets
                  </button>
                  <button
                    className={`${
                      activeTab === 'events'
                        ? 'border-[#56ae4a] text-[#56ae4a]'
                        : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'
                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                    onClick={() => setActiveTab('events')}
                  >
                    <Calendar className="w-5 h-5 inline mr-2" />
                    Mis Eventos
                  </button>
                </nav>
              </div>

              {activeTab === 'tickets' && (
                <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {purchasedTickets.length === 0 ? (
                    <div className="col-span-full bg-[#111111] p-6 text-center rounded-lg border border-gray-700">
                      <p className="text-gray-400">No has comprado entradas todavía.</p>
                    </div>
                  ) : (
                    purchasedTickets
                    .filter(ticket => ticket.payment_status !== null && ticket.payment_status !== 0)
                    .map((ticket) => {                  
                      return (
                        <div 
                          key={ticket.id} 
                          className={`bg-[#111111] overflow-hidden shadow rounded-lg border ${
                            ticket.active ? 'border-[#56ae4a]/30' : 'border-red-500/30'
                          }`}
                        >
                          <div className="px-4 py-5 sm:p-6">
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="text-lg font-medium text-white">{ticket.ticket_type.event.name}</h3>
                              <div className={`flex items-center ${
                                ticket.active ? 'text-[#56ae4a]' : 'text-red-400'
                              }`}>
                                {ticket.active ? (
                                  <>
                                    <CheckCircle className="h-5 w-5 mr-1" />
                                    <span className="text-sm">Activo</span>
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="h-5 w-5 mr-1" />
                                    <span className="text-sm">Usado</span>
                                  </>
                                )}
                              </div>
                            </div>
                    
                            <div className="text-sm text-gray-400">
                              <p className="mb-1">
                                {format(new Date(ticket.ticket_type.event.date), "EEEE d 'de' MMMM, yyyy", { locale: es })}
                              </p>
                              <p className="mb-1">{ticket.ticket_type.event.time}</p>
                              <p className="mb-1">{ticket.ticket_type.event.location}</p>
                              <p className="mb-1">Tipo: {ticket.ticket_type.type}</p>
                              <p className="mb-1">Cantidad: {ticket.quantity}</p>
                              <p className="text-[#56ae4a]">Total: ${ticket.total_price}</p>
                            </div>
                    
                            <div className="mt-4 flex justify-center bg-[#1f1f1f] p-4 rounded-lg">
                              {qrCodes[ticket.id] ? (
                                <img 
                                  src={qrCodes[ticket.id]} 
                                  alt="QR Code" 
                                  className={`w-32 h-32 transition-opacity duration-200 ${
                                    ticket.active ? 'opacity-100' : 'opacity-50'
                                  }`}
                                />
                              ) : (
                                <div className="w-32 h-32 flex items-center justify-center">
                                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#56ae4a]"></div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {activeTab === 'events' && (
                <div className="mt-6">
                  {events.length === 0 ? (
                    <div className="bg-[#111111] p-6 text-center rounded-lg border border-gray-700">
                      <p className="text-gray-400">No has creado ningún evento todavía.</p>
                      <Link
                        to="/crear-evento"
                        className="mt-4 inline-block bg-[#56ae4a] text-white px-4 py-2 rounded-lg hover:bg-[#68c95b]"
                      >
                        Crear mi primer evento
                      </Link>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-700">
                        <thead className="bg-[#111111]">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                              Evento
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                              Fecha
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                              Ubicación
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                              Entradas Disponibles
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                              Acciones
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-[#1f1f1f] divide-y divide-gray-700">
                          {events.map((event) => (
                            <tr key={event.id}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-white">{event.name}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-300">
                                  {format(new Date(event.date), "d MMM yyyy", { locale: es })}
                                  <br />
                                  {event.time}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-300">{event.location}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-300">{calculateAvailableTickets(event)}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <div className="flex space-x-4">
                                  <Link
                                    to={`/evento/${event.id}`}
                                    className="text-[#56ae4a] hover:text-[#68c95b]"
                                  >
                                    Ver detalles
                                  </Link>
                                  <button
                                    onClick={() => handleDeleteEvent(event.id)}
                                    className="text-red-500 hover:text-red-400 flex items-center"
                                  >
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    Eliminar
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-[#1f1f1f] rounded-lg p-6 max-w-md w-full">
              <h3 className="text-xl font-bold text-white mb-4">¿Estás seguro?</h3>
              <p className="text-gray-300 mb-6">
                Se perderán todos los datos relacionados con este evento, incluyendo entradas vendidas y configuraciones. Esta acción no se puede deshacer.
              </p>
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setEventToDelete(null);
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  disabled={deleting}
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center"
                >
                  {deleting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                      Eliminando...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Eliminar evento
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Profile;