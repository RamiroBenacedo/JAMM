import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Clock, Minus, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '../context/AuthContext';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL!
const ANON_KEY    = import.meta.env.VITE_SUPABASE_ANON_KEY!
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
  active: boolean;
}

type TicketQuantity = Record<string, number>;

type GuestData = {
  nombre: string;
  apellido: string;
  idType: string;
  idNumber: string;
  email: string;
  confirmEmail: string;
  phone: string;
  country: string;
};

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [ticketQuantities, setTicketQuantities] = useState<TicketQuantity>({});
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [isCreator, setIsCreator] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [continueAsGuest, setContinueAsGuest] = useState(false);
  const [showGuestWizard, setShowGuestWizard] = useState(false);
  const [guestStep, setGuestStep] = useState<1 | 2 | 3>(1);
  const [guestData, setGuestData] = useState<GuestData>({
    nombre: '', apellido: '', idType: 'DNI', idNumber: '',
    email: '', confirmEmail: '', phone: '', country: ''
  });

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: ev, error: evErr } = await supabase
        .from('events').select('*').eq('id', id).single();
      if (evErr || !ev) return;
      setEvent(ev);
      setIsCreator(user?.id === ev.creator_id);
      const { data: tt, error: ttErr } = await supabase
        .from('ticket_types').select('*').eq('event_id', id);
      if (!ttErr && tt) setTicketTypes(tt);
      const initQty: TicketQuantity = {};
      (tt || []).forEach(t => { initQty[t.id] = 0 });
      setTicketQuantities(initQty);
      setLoading(false);
    })();
  }, [id, user]);

  const handleQuantityChange = (ticketId: string, delta: number) => {
    setTicketQuantities(prev => {
      const current = prev[ticketId] || 0;
      const ticket = ticketTypes.find(t => t.id === ticketId);
      if (!ticket) return prev;
      const max = ticket.type === 'Cortesía'
        ? Infinity
        : Math.min(ticket.quantity, event?.max_tickets_per_user || 0);
      const next = Math.max(0, Math.min(current + delta, max));
      return { ...prev, [ticketId]: next };
    });
  };

  const getTotalTickets = () =>
    Object.values(ticketQuantities).reduce((a, b) => a + b, 0);

  const calculateTotal = () =>
    ticketTypes.reduce(
      (sum, t) => sum + (t.price * (ticketQuantities[t.id] || 0)),
      0
    );

  const handlePurchase = () => {
    if (!user && !continueAsGuest) {
      setShowAuthModal(true);
      return;
    }
    if (continueAsGuest) {
      setShowGuestWizard(true);
      return;
    }
    return purchaseTickets();
  };

  const purchaseTickets = async () => {
    const totalTickets = getTotalTickets();
    if (!event || totalTickets === 0) {
      setPurchaseError('Seleccioná alguna entrada para continuar');
      return;
    }
    setPurchasing(true);
    setPurchaseError(null);
    try {
      if (user) {
        for (const t of ticketTypes) {
          const qty = ticketQuantities[t.id] || 0;
          if (qty > 0) {
            const totalPrice = parseFloat(
              ((t.price * (1 + (event.marketplace_fee / 100))) * qty)
              .toFixed(2)
            );
            const { error } = await supabase.rpc('purchase_tickets', {
              p_ticket_type_id: t.id,
              p_user_id: user.id,
              p_quantity: qty,
              p_total_price: totalPrice
            });
            if (error) throw error;
          }
        }
      }
      const items = ticketTypes
        .filter(t => (ticketQuantities[t.id] || 0) > 0)
        .map(t => ({
          title: t.description,
          quantity: ticketQuantities[t.id],
          unit_price: parseFloat(
            (t.price * (1 + (event.marketplace_fee / 100))).toFixed(2)
          ),
          currency_id: 'ARS'
        }));
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const queryParams = new URLSearchParams(window.location.search);
      const rrpp = queryParams.get('rrpp') || undefined;
      const resp = await fetch(
        'https://qhyclhodgrlqmxdzcfgz.supabase.co/functions/v1/swift-task',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            email: user?.email,
            userId: user?.id,
            event_id: event.id,
            items,
            marketplace_fee: Math.round(
              calculateTotal() * (event.marketplace_fee / 100)
            ),
            ...(rrpp && { rrpp })
          })
        }
      );
      if (!resp.ok) throw new Error();
      const { init_point } = await resp.json();
      window.location.href = init_point;
    } catch {
      setPurchaseError('Error al procesar compra. Volvé a intentar');
    } finally {
      setPurchasing(false);
      setShowAuthModal(false);
    }
  };



const handleGuestConfirm = async () => {
  setPurchasing(true)
  try {
    const items = ticketTypes
      .filter(t => ticketQuantities[t.id]! > 0)
      .map(t => ({
        title:      t.description,
        quantity:   ticketQuantities[t.id]!,
        unit_price: parseFloat(
          (t.price * (1 + event!.marketplace_fee / 100)).toFixed(2)
        ),
        currency_id:'ARS'
      }))

    const ticketTypeId = ticketTypes.find(t => ticketQuantities[t.id]! > 0)?.id
    if (!ticketTypeId) {
      setPurchaseError('No hay tipo de ticket seleccionado.')
      return
    }

    const resp = await fetch(
      `${SUPABASE_URL}/functions/v1/swift-task`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey':        ANON_KEY,
          'Authorization': `Bearer ${ANON_KEY}`
        },
        body: JSON.stringify({
          email:           guestData.email,
          userId:          null,
          guest:           true,             // <-- Indica compra por invitado
          guestInfo:       guestData,
          event_id:        event!.id,
          ticketTypeId,
          items,
          marketplace_fee: Math.round(
            calculateTotal() * (event!.marketplace_fee / 100)
          )
        })
      }
    )

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: resp.statusText }))
      console.error('swift-task error', resp.status, err)
      throw new Error(err.error || `HTTP ${resp.status}`)
    }

    const { init_point } = await resp.json()
    window.location.href = init_point

  } catch (e) {
    console.error('Error en handleGuestConfirm:', e)
    setPurchaseError('Error al procesar compra.')
  } finally {
    setPurchasing(false)
    setShowGuestWizard(false)
  }
}





  if (loading || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#2a2a2a]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#56ae4a]"></div>
      </div>
    );
  }

  const visibleTickets = ticketTypes.filter(t => {
    if (!t.active) return false;
    if (['Cortesía','Cortesía VIP'].includes(t.type)) {
      return isCreator;
    }
    return true;
  });

  return (
    <div className="bg-[#2a2a2a] min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 grid lg:grid-cols-2 gap-8">
        <div className="relative pb-[56.25%] rounded-lg overflow-hidden shadow-lg">
          <img
            src={event.image_url}
            alt={event.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white mb-4">{event.name}</h1>
          <div className="flex items-center text-gray-300 space-x-4 mb-6">
            <Calendar /><span>{format(new Date(event.date), "EEEE, d 'de' MMMM", { locale: es })}</span>
            <Clock /><span>{event.time}</span>
            <MapPin /><span>{event.location}</span>
          </div>
          <p className="text-gray-400 mb-8">{event.description}</p>
          {purchaseError && (
            <div className="mb-4 bg-red-900/50 border border-red-500 text-red-200 px-4 py-2 rounded">
              {purchaseError}
            </div>
          )}
          <h2 className="text-xl font-semibold text-white mb-4">Entradas disponibles</h2>
          <div className="space-y-4">
            {visibleTickets.map(tk => (
              <div key={tk.id} className="bg-[#1a1a1a] p-4 rounded-lg border border-gray-700">
                <div className="flex justify-between">
                  <div>
                    <h3 className="text-lg text-white">{tk.type}</h3>
                    <p className="text-gray-400">{tk.description}</p>
                    <p className="mt-2 text-2xl text-white">${tk.price}</p>
                    {tk.type !== 'Cortesía' && (
                      <p className="text-gray-400 text-sm">{tk.quantity} disponibles</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button onClick={() => handleQuantityChange(tk.id, -1)} disabled={(ticketQuantities[tk.id]||0) <= 0} className="p-1 bg-[#2a2a2a] rounded disabled:opacity-50"><Minus /></button>
                    <span className="w-8 text-center text-white">{ticketQuantities[tk.id] || 0}</span>
                    <button onClick={() => handleQuantityChange(tk.id, 1)} disabled={tk.type !== 'Cortesía' && ((ticketQuantities[tk.id]||0) >= tk.quantity || (ticketQuantities[tk.id]||0) >= event.max_tickets_per_user)} className="p-1 bg-[#2a2a2a] rounded disabled:opacity-50"><Plus /></button>
                  </div>
                </div>
              </div>
            ))}
            {getTotalTickets() > 0 && (
              <div className="mt-6 p-4 bg-[#1a1a1a] rounded-lg border border-gray-700">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-gray-300">Total entradas: {getTotalTickets()}</p>
                    <p className="text-2xl font-bold text-white">Total: ${calculateTotal()}</p>
                  </div>
                  <button onClick={handlePurchase} disabled={purchasing} className="px-6 py-3 bg-[#56ae4a] text-white rounded-lg hover:bg-[#68c95b] disabled:opacity-50">
                    {purchasing ? 'Procesando...' : 'Comprar entradas'}
                  </button>
                </div>
                <p className="text-sm text-[#56ae4a] mt-2">+{event.marketplace_fee}% de costo de servicio</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de login/guest */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#1f1f1f] p-6 rounded-lg border border-gray-700 max-w-sm w-full">
            <h3 className="text-white text-lg mb-4 text-center">¿Cómo deseas continuar?</h3>
            <button onClick={() => navigate('/ingresar')} className="w-full py-2 bg-blue-600 text-white rounded mb-3">Iniciar sesión / Registrarse</button>
            <button onClick={() => { setContinueAsGuest(true); setShowAuthModal(false); setGuestStep(1); setShowGuestWizard(true); }} className="w-full py-2 bg-gray-600 text-white rounded">Continuar sin registrarse</button>
            <button onClick={() => setShowAuthModal(false)} className="mt-2 text-gray-400 underline">Cancelar</button>
          </div>
        </div>
      )}

      {/* Wizard para guest */}
      {showGuestWizard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#1f1f1f] p-6 rounded-lg border border-gray-700 max-w-3xl w-full">
            <div className="flex justify-between mb-6">
              {[1, 2, 3].map(n => (
                <div key={n} className={`flex-1 border-b-2 ${guestStep >= n ? 'border-blue-500' : 'border-gray-600'}`}>
                  <span className="block text-center text-sm text-gray-400">{n === 1 ? 'Revisa tu orden' : n === 2 ? 'Ingresa tus datos' : 'Confirma tu compra'}</span>
                </div>
              ))}
            </div>

            {guestStep === 1 && (
              <>              
                <div className="space-y-4">
                  {visibleTickets.map(tk => (
                    <div key={tk.id} className="flex justify-between text-white">
                      <span>{ticketQuantities[tk.id]}× {tk.type}</span>
                      <span>${(tk.price * ticketQuantities[tk.id]!).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-gray-300">
                    <span>Costo del servicio:</span>
                    <span>${Math.round(calculateTotal() * (event.marketplace_fee/100))}</span>
                  </div>
                  <div className="flex justify-between font-bold text-white">
                    <span>Total a pagar:</span>
                    <span>${calculateTotal()}</span>
                  </div>
                </div>
                <button onClick={() => setGuestStep(2)} className="mt-6 w-full py-3 bg-blue-600 rounded text-white">Siguiente</button>
              </>
            )}

            {guestStep === 2 && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <input placeholder="Nombre" value={guestData.nombre} onChange={e => setGuestData({...guestData, nombre: e.target.value})} className="p-2 rounded bg-[#2a2a2a] text-white" />
                  <input placeholder="Apellido" value={guestData.apellido} onChange={e => setGuestData({...guestData, apellido: e.target.value})} className="p-2 rounded bg-[#2a2a2a] text-white" />
                  <select value={guestData.idType} onChange={e => setGuestData({...guestData, idType: e.target.value})} className="p-2 rounded bg-[#2a2a2a] text-white">
                    <option>DNI</option>
                    <option>Pasaporte</option>
                  </select>
                  <input placeholder="Número de identificación" value={guestData.idNumber} onChange={e => setGuestData({...guestData, idNumber: e.target.value})} className="p-2 rounded bg-[#2a2a2a] text-white" />
                  <input placeholder="Mail" type="email" value={guestData.email} onChange={e => setGuestData({...guestData, email: e.target.value})} className="p-2 rounded bg-[#2a2a2a] text-white" />
                  <input placeholder="Confirmar mail" type="email" value={guestData.confirmEmail} onChange={e => setGuestData({...guestData, confirmEmail: e.target.value})} className="p-2 rounded bg-[#2a2a2a] text-white" />
                  <input placeholder="Número de teléfono" value={guestData.phone} onChange={e => setGuestData({...guestData, phone: e.target.value})} className="p-2 rounded bg-[#2a2a2a] text-white" />
                  <input placeholder="País" value={guestData.country} onChange={e => setGuestData({...guestData, country: e.target.value})} className="p-2 rounded bg-[#2a2a2a] text-white" />
                </div>
                <div className="flex justify-between mt-6">
                  <button onClick={() => setGuestStep(1)} className="px-6 py-2 border rounded text-white">Anterior</button>
                  <button onClick={() => setGuestStep(3)} className="px-6 py-2 bg-blue-600 rounded text-white">Siguiente</button>
                </div>
              </>
            )}

            {guestStep === 3 && (
              <>
                <p className="text-white mb-4">¡Ya casi es tuyo! Revisa tus datos</p>
                <div className="text-gray-300 space-y-1">
                  <div><strong>Nombre y apellido:</strong> {guestData.nombre} {guestData.apellido}</div>
                  <div><strong>Identificación:</strong> {guestData.idType} - {guestData.idNumber}</div>
                  <div><strong>Mail:</strong> {guestData.email}</div>
                  <div><strong>Número de teléfono:</strong> {guestData.phone}</div>
                </div>
                <hr className="my-4 border-gray-600" />
                <div className="space-y-1 text-gray-300">
                  <div><strong>Nombre del evento:</strong> {event.name}</div>
                  <div><strong>Tus entradas:</strong> {getTotalTickets()}× entradas</div>
                  <div><strong>Total a pagar:</strong> ${calculateTotal()}</div>
                </div>
                <div className="flex justify-between mt-6">
                  <button onClick={() => setGuestStep(2)} className="px-6 py-2 border rounded text-white">Anterior</button>
                  <button onClick={handleGuestConfirm} disabled={purchasing} className="px-6 py-2 bg-blue-600 rounded text-white disabled:opacity-50">
                    {purchasing ? 'Procesando...' : 'Comprar'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
