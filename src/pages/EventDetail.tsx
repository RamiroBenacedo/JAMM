import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Clock, Ticket, Minus, Plus, Edit2, Save, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '../context/AuthContext';

interface Event {
  id: string;
  name: string;
  description: string;
  date: string;
  time: string;
  location: string;
  sales_end_date: string;
  max_tickets_per_user: number;
  creator_id: string;
  id_vendedor: number;
  marketplace_fee: number;
  image_url: string;
}

interface TicketType {
  id: string;
  type: string;
  description: string;
  price: number;
  quantity: number;
  payment_id: number;
  payment_status: number;
}

interface TicketQuantity {
  [key: string]: number;
}

const EventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [ticketQuantities, setTicketQuantities] = useState<TicketQuantity>({});
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [isCreator, setIsCreator] = useState(false);
  const [editingQuantities, setEditingQuantities] = useState<{ [key: string]: number }>({});
  const [saving, setSaving] = useState(false);
  
  // New state for editing
  const [isEditing, setIsEditing] = useState(false);
  const [editedEvent, setEditedEvent] = useState<Partial<Event>>({});
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEventDetails = async () => {
      try {
        // Fetch event details
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select('*')
          .eq('id', id)
          .single();

        if (eventError) throw eventError;
        if (!eventData) throw new Error('Evento no encontrado');

        setEvent(eventData);
        setIsCreator(user?.id === eventData.creator_id);
        setEditedEvent({
          name: eventData.name,
          description: eventData.description,
          location: eventData.location,
        });

        // Fetch ticket types
        const { data: ticketData, error: ticketError } = await supabase
          .from('ticket_types')
          .select('*')
          .eq('event_id', id);

        if (ticketError) throw ticketError;
        
        // Initialize editing quantities
        const initialEditingQuantities: { [key: string]: number } = {};
        ticketData?.forEach(ticket => {
          initialEditingQuantities[ticket.id] = ticket.quantity;
        });
        setEditingQuantities(initialEditingQuantities);
        
        setTicketTypes(ticketData || []);

        // Initialize quantities
        const initialQuantities: TicketQuantity = {};
        ticketData?.forEach(ticket => {
          initialQuantities[ticket.id] = 0;
        });
        setTicketQuantities(initialQuantities);

      } catch (err) {
        console.error('Error fetching event details:', err);
        setError('No se pudo cargar el evento. Por favor, intenta de nuevo más tarde.');
      } finally {
        setLoading(false);
      }
    };

    fetchEventDetails();
  }, [id, user]);

  const handleQuantityChange = (ticketId: string, delta: number) => {
    setTicketQuantities(prev => {
      const currentQuantity = prev[ticketId] || 0;
      const ticket = ticketTypes.find(t => t.id === ticketId);
      
      if (!ticket) return prev;
      
      // Special handling for courtesy tickets
      if (ticket.type === 'Cortesía') {
        const newQuantity = Math.max(0, currentQuantity + delta);
        return {
          ...prev,
          [ticketId]: newQuantity
        };
      }
      
      // Regular tickets
      const newQuantity = Math.max(0, Math.min(currentQuantity + delta, ticket.quantity));
      
      return {
        ...prev,
        [ticketId]: newQuantity
      };
    });
  };

  const calculateTotal = () => {
    return ticketTypes.reduce((total, ticket) => {
      const quantity = ticketQuantities[ticket.id] || 0;
      return total + (ticket.price * quantity);
    }, 0);
  };

  const getTotalTickets = () => {
    return Object.values(ticketQuantities).reduce((sum, quantity) => sum + quantity, 0);
  };

  const handlePurchase = async () => {
    if (!user) {
      navigate('/ingresar')
      return
    }
  
    const totalTickets = getTotalTickets()
    if (totalTickets === 0) {
      setPurchaseError('Por favor selecciona la cantidad de entradas que deseas comprar')
      return
    }
  
    try {
      setPurchasing(true)
      setPurchaseError(null)
  
      const items = []
      let totalAmount = 0;
      let selectedTicketTypeId = null;
      for (const ticket of ticketTypes) {
        const quantity = ticketQuantities[ticket.id]
        if (quantity > 0) {
          const { error } = await supabase.rpc('purchase_tickets', {
            p_ticket_type_id: ticket.id,
            p_user_id: user.id,
            p_quantity: quantity,
            p_total_price: parseFloat((ticket.price * 1.1).toFixed(2)) * quantity,
          })
          selectedTicketTypeId = ticket.id;
          if (!selectedTicketTypeId) {
            console.error('No se encontró ticketTypeId válido');
            return;
          }
          if (error) throw error
          const subtotal = parseFloat((ticket.price * 1.1).toFixed(2)) * quantity
          totalAmount += subtotal
          items.push({
            title: ticket.description,
            quantity,
            unit_price: parseFloat((ticket.price * 1.1).toFixed(2)),
            currency_id: 'ARS'
          })
        }
      }
      const marketplace_fee = event?.marketplace_fee != null ? Math.round(totalAmount * (event.marketplace_fee / 100)) : 0;
  
      const { data: { session } } = await supabase.auth.getSession()
  
      const response = await fetch(
        'https://qhyclhodgrlqmxdzcfgz.supabase.co/functions/v1/swift-task',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            email: user.email,
            items,
            ticketTypeId: selectedTicketTypeId,
            event_id: event?.id,
            userId: user.id,
            marketplace_fee: marketplace_fee
          }),
        }
      )
  
      if (!response.ok) throw new Error('No se pudo obtener el enlace de pago.')
  
      const data = await response.json()

      window.location.href = data.init_point
  
    } catch (err) {
      console.error('Error creando preferencia:', err)
      setPurchaseError('Error al procesar la compra. Por favor, intenta de nuevo.')
    } finally {
      setPurchasing(false)
    }
  }

  const handleEditQuantityChange = (ticketId: string, newQuantity: number) => {
    setEditingQuantities(prev => ({
      ...prev,
      [ticketId]: Math.max(0, newQuantity)
    }));
  };

  const isAtTicketLimit = (ticketId: string) => {
    const ticket = ticketTypes.find(t => t.id === ticketId);
    if (!ticket || !event) return false;
    
    if (ticket.type === 'Cortesía') return false;
    return ticketQuantities[ticketId] >= event.max_tickets_per_user;
  };

  const handleSaveChanges = async () => {
    if (!event || !editedEvent.name || !editedEvent.description || !editedEvent.location) {
      setEditError('Por favor complete todos los campos');
      return;
    }

    try {
      setSaving(true);
      setEditError(null);

      const { error: updateError } = await supabase
        .from('events')
        .update({
          name: editedEvent.name,
          description: editedEvent.description,
          location: editedEvent.location,
        })
        .eq('id', event.id);

      if (updateError) throw updateError;

      // Update local state
      setEvent(prev => prev ? {
        ...prev,
        name: editedEvent.name!,
        description: editedEvent.description!,
        location: editedEvent.location!,
      } : null);

      setIsEditing(false);
    } catch (err) {
      console.error('Error updating event:', err);
      setEditError('Error al actualizar el evento. Por favor, intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-[#2a2a2a]">
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#56ae4a]"></div>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="bg-[#2a2a2a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded">
            {error || 'Evento no encontrado'}
          </div>
        </div>
      </div>
    );
  }

  const total = calculateTotal();
  console.log(event.marketplace_fee);
  // Filter tickets based on user role
  const visibleTickets = ticketTypes.filter(ticket => {
    if (ticket.type === 'Cortesía') {
      return isCreator; // Only show courtesy tickets to event creator
    }
    return true; // Show all other tickets to everyone
  });

  return (
    <div className="bg-[#2a2a2a]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="lg:grid lg:grid-cols-2 lg:gap-x-8">
          <div className="relative pb-[56.25%] rounded-lg overflow-hidden shadow-lg">
            <img
              src={event.image_url}
              alt={event.name}
              className="absolute inset-0 w-full h-full object-cover object-center"
            />
          </div>

          <div className="mt-10 lg:mt-0">
            {isEditing ? (
              <div className="space-y-4">
                {editError && (
                  <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded">
                    {editError}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Nombre del evento
                  </label>
                  <input
                    type="text"
                    value={editedEvent.name}
                    onChange={(e) => setEditedEvent(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-[#1f1f1f] border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-[#56ae4a] focus:ring-1 focus:ring-[#56ae4a]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Descripción
                  </label>
                  <textarea
                    value={editedEvent.description}
                    onChange={(e) => setEditedEvent(prev => ({ ...prev, description: e.target.value }))}
                    rows={4}
                    className="w-full bg-[#1f1f1f] border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-[#56ae4a] focus:ring-1 focus:ring-[#56ae4a]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Ubicación
                  </label>
                  <input
                    type="text"
                    value={editedEvent.location}
                    onChange={(e) => setEditedEvent(prev => ({ ...prev, location: e.target.value }))}
                    className="w-full bg-[#1f1f1f] border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-[#56ae4a] focus:ring-1 focus:ring-[#56ae4a]"
                  />
                </div>
                <div className="flex space-x-4">
                  <button
                    onClick={handleSaveChanges}
                    disabled={saving}
                    className="flex items-center px-4 py-2 bg-[#56ae4a] text-white rounded-lg hover:bg-[#68c95b] disabled:opacity-50"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Guardando...' : 'Guardar cambios'}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setEditError(null);
                      setEditedEvent({
                        name: event.name,
                        description: event.description,
                        location: event.location,
                      });
                    }}
                    className="flex items-center px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h1 className="text-3xl font-bold text-white">{event.name}</h1>
                  {isCreator && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center px-3 py-1 bg-[#1f1f1f] text-gray-300 rounded-lg hover:bg-[#2a2a2a] transition-colors"
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      Editar
                    </button>
                  )}
                </div>
                
                <div className="mt-4 space-y-6">
                  <div className="flex items-center text-gray-300">
                    <Calendar className="h-5 w-5 mr-2" />
                    <span>{format(new Date(event.date), "EEEE d 'de' MMMM, yyyy", { locale: es })}</span>
                  </div>
                  <div className="flex items-center text-gray-300">
                    <Clock className="h-5 w-5 mr-2" />
                    <span>{event.time}</span>
                  </div>
                  <div className="flex items-center text-gray-300">
                    <MapPin className="h-5 w-5 mr-2" />
                    <span>{event.location}</span>
                  </div>

                  <div className="border-t border-gray-700 pt-6">
                    <p className="text-gray-300">{event.description}</p>
                  </div>
                </div>
              </>
            )}

            <div className="border-t border-gray-700 pt-6 mt-6">
              <h2 className="text-xl font-semibold text-white mb-4">Entradas disponibles</h2>
              
              {purchaseError && (
                <div className="mb-4 bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded">
                  {purchaseError}
                </div>
              )}
              
              {visibleTickets.length > 0 ? (
                <div className="space-y-4">
                  {visibleTickets.map((ticket) => (
                    <div 
                      key={ticket.id}
                      className="bg-[#1a1a1a] rounded-lg p-4 border border-gray-700"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-medium text-white">{ticket.type}</h3>
                          <p className="text-gray-400 mt-1">{ticket.description}</p>
                          <div className="mt-2 flex items-center space-x-4">
                            <span className="text-2xl font-bold text-white">${ticket.price}</span>
                            {ticket.type !== 'Cortesía' && (
                              <>
                                <span className="text-gray-400">|</span>
                                <div className="flex items-center text-gray-300">
                                  <Ticket className="h-4 w-4 mr-1" />
                                  <span>{ticket.quantity} disponibles</span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end space-y-2">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleQuantityChange(ticket.id, -1)}
                              disabled={ticketQuantities[ticket.id] === 0}
                              className="p-1 rounded-md bg-[#2a2a2a] text-gray-300 hover:bg-[#333333] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="w-8 text-center text-white">
                              {ticketQuantities[ticket.id] || 0}
                            </span>
                            <button
                              onClick={() => handleQuantityChange(ticket.id, 1)}
                              disabled={
                                ticket.type !== 'Cortesía' && (
                                  ticketQuantities[ticket.id] >= ticket.quantity ||
                                  ticketQuantities[ticket.id] >= event.max_tickets_per_user
                                )
                              }
                              className="p-1 rounded-md bg-[#2a2a2a] text-gray-300 hover:bg-[#333333] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                          {isAtTicketLimit(ticket.id) && (
                            <p className="text-sm text-yellow-500">
                              Límite máximo de {event.max_tickets_per_user} {event.max_tickets_per_user === 1 ? 'entrada' : 'entradas'} por usuario
                            </p>
                          )}
                        </div>
                      </div>
                      {ticketQuantities[ticket.id] > 0 && (
                        <div className="mt-2 text-right text-[#56ae4a]">
                          Subtotal: ${ticket.price * ticketQuantities[ticket.id]}
                        </div>
                      )}
                    </div>
                  ))}

                  {getTotalTickets() > 0 && (
                    <div className="mt-6 bg-[#1a1a1a] rounded-lg p-4 border border-gray-700">
                      <div className="flex flex-col space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-gray-300">Total de entradas: {getTotalTickets()}</p>
                            <p className="text-2xl font-bold text-white mt-1">Total: ${total}</p>
                          </div>
                          <div className="flex flex-col items-end">
                            <button
                              onClick={handlePurchase}
                              disabled={purchasing || getTotalTickets() === 0}
                              className="bg-[#56ae4a] text-white px-6 py-3 rounded-lg hover:bg-[#68c95b] focus:outline-none focus:ring-2 focus:ring-[#56ae4a] focus:ring-offset-2 focus:ring-offset-[#2a2a2a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                            >
                              {purchasing ? 'Procesando...' : 'Comprar entradas'}
                            </button>
                            <p className="text-[#56ae4a] text-sm mt-2 text-right max-w-[200px]">
                              El valor del ticket posee 10% extra de costo de servicio
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 bg-[#1a1a1a] rounded-lg border border-gray-700">
                  <p className="text-gray-400">No hay entradas disponibles en este momento.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EventDetail;