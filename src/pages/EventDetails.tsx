// src/pages/EventDetails.tsx
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import SendEntryByEmail from '../components/SendEntryByEmail';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { Save, Plus, Trash2 } from 'lucide-react';

type TicketType = {
  id: string;
  type: string;
  description: string;
  price: number;
  quantity: number;
  active?: boolean;
};

type RRPPVenta = {
  rrpp: string;
  totalSales: number;
  ticketsSold: number;
};

type EventDetail = {
  id: string;
  name: string;
  description: string;
  date: string;
  time: string;
  location: string;
  ticket_types: TicketType[];
};

type TicketStats = {
  id: string;
  type: string;
  ticketsSold: number;
  totalSales: number;
  quantity: number;
  percentSold: number;
};

const EventDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [rol, setRol] = useState<string | null>(null);
  const [evento, setEvento] = useState<EventDetail | null>(null);
  const [rrppStats, setRrppStats] = useState<RRPPVenta[]>([]);
  const [ticketStats, setTicketStats] = useState<TicketStats[]>([]);
  const [editingTickets, setEditingTickets] = useState<{ [key: string]: TicketType }>({});
  const [newTicket, setNewTicket] = useState<Omit<TicketType, 'id'>>({ type: '', description: '', price: 0, quantity: 0, active: true });
  const [showNewTicketForm, setShowNewTicketForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    supabase.from('profiles').select('rol').eq('user_id', user.id).single().then(({ data }) => setRol(data?.rol ?? null));
  }, [user]);

  const loadEvent = async () => {
    if (!user?.id || !id) return;
    setLoading(true);
    const { data: event, error } = await supabase
      .from('events')
      .select('id, name, description, date, time, location, ticket_types (id, type, description, price, quantity, active)')
      .eq('id', id).eq('creator_id', user.id).single();
    if (error || !event) { setLoading(false); return; }
    setEvento(event);
    const ids = event.ticket_types.map(t => t.id);
    const { data: ventas } = await supabase.from('purchased_tickets')
      .select('rrpp, quantity, total_price, ticket_type_id').eq('payment_status', 1).in('ticket_type_id', ids);
    if (ventas) {
      const map = new Map<string, RRPPVenta>();
      ventas.forEach(v => { if (!v.rrpp) return; const e = map.get(v.rrpp) || { rrpp: v.rrpp, totalSales: 0, ticketsSold: 0 }; e.totalSales += v.total_price || 0; e.ticketsSold += v.quantity || 0; map.set(v.rrpp, e); });
      const codes = Array.from(map.keys());
      const { data: rrppNames } = await supabase.from('rrpp').select('codigo, nombre').in('codigo', codes);
      setRrppStats(Array.from(map.values()).map(r => ({ rrpp: rrppNames?.find(n => n.codigo === r.rrpp)?.nombre || r.rrpp, totalSales: r.totalSales, ticketsSold: r.ticketsSold })));
    }
    setTicketStats(event.ticket_types.map(tt => {
      const sold = (ventas?.filter(v => v.ticket_type_id === tt.id).reduce((s, v) => s + (v.quantity||0), 0)) || 0;
      const sales = (ventas?.filter(v => v.ticket_type_id === tt.id).reduce((s, v) => s + (v.total_price||0), 0)) || 0;
      const perc = tt.quantity ? Math.min((sold/tt.quantity)*100, 100) : 0;
      return { id: tt.id, type: tt.type, ticketsSold: sold, totalSales: sales, quantity: tt.quantity, percentSold: perc };
    }));
    setLoading(false);
  };

  useEffect(() => { loadEvent(); }, [user, id]);

  const handleTicketChange = (tid: string, field: keyof TicketType, value: string|number) => {
    setEditingTickets(p => ({ ...p, [tid]: { ...p[tid], [field]: value } }));
  };

  const handleSaveTickets = async () => { if (!evento) return; setSaving(true);
    for (const [tid, t] of Object.entries(editingTickets)) await supabase.from('ticket_types').update({ price: t.price, quantity: t.quantity, description: t.description }).eq('id', tid);
    setEditingTickets({}); setSaving(false); await loadEvent();
  };

  const handleAddNewTicket = async () => { if (!evento) return;
    await supabase.from('ticket_types').insert({ event_id: evento.id, ...newTicket }); setShowNewTicketForm(false);
    setNewTicket({ type:'',description:'',price:0,quantity:0,active:true }); await loadEvent();
  };

  const confirmDelete = (tid: string) => setConfirmDeleteId(tid);
  const handleDeleteTicket = async () => { if (!confirmDeleteId) return;
    await supabase.from('ticket_types').update({ active: false }).eq('id', confirmDeleteId);
    setConfirmDeleteId(null); await loadEvent();
  };

  if (loading) return <div className="bg-[#1e1e1e] flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#56ae4a]"></div></div>;
  if (!evento) return <div className="text-red-500 p-8">Evento no encontrado o sin acceso.</div>;

  return (
    <div className="bg-[#1e1e1e] text-white py-10 min-h-screen">
      <div className="max-w-5xl mx-auto px-6">
        <h1 className="text-4xl font-bold mb-4">{evento.name}</h1>
        <p className="text-gray-300 mb-6">{evento.description}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
          <div className="bg-[#2c2c2c] p-4 rounded border border-gray-700">{evento.date} - {evento.time}</div>
          <div className="bg-[#2c2c2c] p-4 rounded border border-gray-700">{evento.location}</div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          {ticketStats.map(t => (<div key={t.id} className="bg-[#2a2a2a] p-4 rounded border border-gray-700"><h4 className="font-semibold mb-2">{t.type}</h4><p>Vendidos: {t.ticketsSold}/{t.quantity}</p><p>Total ventas: ${t.totalSales.toFixed(2)}</p><p>Porcentaje vendido: {t.percentSold.toFixed(1)}%</p></div>))}
        </div>
        <SendEntryByEmail eventId={evento.id} />
        {['organizador','productora'].includes(rol||'')&&(
          <div className="mt-10">
            {showNewTicketForm?<div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6"><input value={newTicket.type} onChange={e=>setNewTicket(p=>({...p,type:e.target.value}))} className="p-2 bg-[#111] rounded" placeholder="Tipo" /><input value={newTicket.description} onChange={e=>setNewTicket(p=>({...p,description:e.target.value}))} className="p-2 bg-[#111] rounded" placeholder="Descripción" /><input type="number" value={newTicket.price} onChange={e=>setNewTicket(p=>({...p,price:parseFloat(e.target.value)}))} className="p-2 bg-[#111] rounded" placeholder="Precio" /><input type="number" value={newTicket.quantity} onChange={e=>setNewTicket(p=>({...p,quantity:parseInt(e.target.value,10)}))} className="p-2 bg-[#111] rounded" placeholder="Cantidad" /></div>:null}
            {showNewTicketForm?<button onClick={handleAddNewTicket} className="bg-[#56ae4a] text-white px-4 py-2 rounded mr-4">Agregar</button>:<button onClick={()=>setShowNewTicketForm(true)} className="bg-[#56ae4a] text-white px-4 py-2 rounded mr-4"><Plus className="inline w-4 h-4 mr-1"/>Nuevo ticket</button>}
            {!showNewTicketForm&&<button onClick={handleSaveTickets} disabled={saving} className="bg-[#56ae4a] text-white px-4 py-2 rounded"><Save className="inline w-4 h-4 mr-1"/>Guardar cambios</button>}
            <div className="mt-6 space-y-4">
              {evento.ticket_types.filter(t=>t.active!==false).map(ticket=>(
                <div key={ticket.id} className="bg-[#2a2a2a] p-4 rounded border border-gray-700 grid grid-cols-1 sm:grid-cols-5 gap-4 items-center">
                  <input value={ticket.type} disabled className="p-2 bg-[#111] rounded" />
                  <input value={editingTickets[ticket.id]?.description||ticket.description} onChange={e=>handleTicketChange(ticket.id,'description',e.target.value)} className="p-2 bg-[#111] rounded" />
                  <input type="number" value={editingTickets[ticket.id]?.price||ticket.price} onChange={e=>handleTicketChange(ticket.id,'price',parseFloat(e.target.value))} className="p-2 bg-[#111] rounded" />
                  <input type="number" value={editingTickets[ticket.id]?.quantity||ticket.quantity} onChange={e=>handleTicketChange(ticket.id,'quantity',parseInt(e.target.value,10))} className="p-2 bg-[#111] rounded" />
                  <button onClick={()=>confirmDelete(ticket.id)} className="text-red-400 hover:underline flex items-center"><Trash2 className="w-4 h-4 mr-1"/>Eliminar</button>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="mt-12"><h2 className="text-xl font-semibold">Ventas por RRPP</h2><ResponsiveContainer width="100%" height={300}><BarChart data={rrppStats}><CartesianGrid stroke="#374151"/><XAxis dataKey="rrpp" stroke="#9CA3AF"/><YAxis stroke="#9CA3AF"/><Tooltip/><Legend/><Bar dataKey="ticketsSold" fill="#56ae4a" name="Tickets vendidos"/><Bar dataKey="totalSales" fill="#9333ea" name="Ventas ($)"/></BarChart></ResponsiveContainer></div>
      </div>
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-[#2a2a2a] p-6 rounded-lg">
            <p className="mb-4">¿Confirma eliminar este tipo de ticket?</p>
            <div className="flex justify-end space-x-4">
              <button onClick={()=>setConfirmDeleteId(null)} className="px-4 py-2 bg-[#111] rounded">Cancelar</button>
              <button onClick={handleDeleteTicket} className="px-4 py-2 bg-[#c53030] text-white rounded">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventDetails;
