import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

type TicketType = {
  id: string;
  type: string;
  description: string;
};

interface Props {
  eventId: string;
  rrppCodigo?: string | null;
}

// Funciones para generar el código QR (igual que en la Edge Function)
const generateAlphanumericString = (length: number): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const generateUniqueQRCode = (
  ticketId: string,
  eventId: string,
  userId: string,
  email: string
): string => {
  const userPart = userId ? userId.substring(0, 4) : 'UNKU';
  const emailPart = email ? email.substring(0, 4) : 'UNKE';
  const prefix =
    ticketId.substring(0, 4) + eventId.substring(0, 4) + userPart + emailPart;
  const randomPart = generateAlphanumericString(8);
  const timestamp = Date.now().toString(36).toUpperCase();
  const suffix = timestamp.substring(timestamp.length - 4);
  return `${prefix}${randomPart}${suffix}`;
};

const SendEntryByEmail: React.FC<Props> = ({ eventId, rrppCodigo }) => {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState('');
  const [step, setStep] = useState<'email' | 'confirmUser' | 'selectTicket' | 'done'>('email');
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<string>('');

  const searchUserByEmail = async () => {
    setSending(true);
    const { data, error } = await supabase
      .from('user_emails')
      .select('id, full_name')
      .eq('email', email)
      .single();
    setSending(false);

    if (error || !data) {
      alert('Usuario no encontrado.');
      return;
    }

    setUserName(data.full_name || 'Sin nombre');
    setUserId(data.id);
    setStep('confirmUser');
  };

  const fetchTickets = async () => {
    const { data, error } = await supabase
      .from('ticket_types')
      .select('id, type, description')
      .eq('event_id', eventId);

    if (error || !data?.length) {
      alert('No hay entradas disponibles para este evento.');
      setStep('email');
      return;
    }

    setTickets(data);
    setStep('selectTicket');
  };

  const handleSendTicket = async () => {
    if (!selectedTicket) {
      alert('Selecciona una entrada.');
      return;
    }

    setSending(true);

    const qrCode = generateUniqueQRCode(selectedTicket, eventId, userId, email);

    const { error: insertError } = await supabase.from('purchased_tickets').insert({
      user_id: userId,
      ticket_type_id: selectedTicket,
      quantity: 1,
      total_price: 0,
      qr_code: qrCode,
      payment_status: 0,
      email,
      rrpp: rrppCodigo ?? null
    });

    if (insertError) {
      setSending(false);
      alert('No se pudo registrar el ticket: ' + insertError.message);
      return;
    }

    const response = await fetch(
      'https://qhyclhodgrlqmxdzcfgz.supabase.co/functions/v1/swift-task',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          email,
          userId,
          ticketTypeId: selectedTicket,
          event_id: eventId,
          items: [
            {
              title: 'Entrada Gratuita',
              quantity: 1,
              unit_price: 0,
            },
          ],
        }),
      }
    );

    const result = await response.json();
    setSending(false);

    if (!response.ok) {
      alert('Error al enviar la entrada: ' + (result?.detalles || result?.error));
      return;
    }

    alert('Entrada enviada correctamente.');
    setStep('done');
    setEmail('');
    setUserName('');
    setSelectedTicket('');
  };

  return (
    <div className="bg-[#2c2c2c] p-6 rounded-2xl shadow-md border border-gray-700 max-w-md mx-auto mt-12">
      <h3 className="text-xl font-medium mb-3">Enviar entrada por email</h3>

      {step === 'email' && (
        <>
          <input
            type="email"
            className="w-full mb-4 p-3 rounded-lg bg-[#3a3a3a] border border-gray-600 placeholder-gray-400 text-white"
            placeholder="ejemplo@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
          <button
            onClick={searchUserByEmail}
            className={`w-full py-2 rounded-lg text-white font-semibold ${
              sending ? 'bg-gray-600' : 'bg-[#56ae4a] hover:bg-green-600'
            }`}
            disabled={sending || !email}
          >
            {sending ? 'Buscando...' : 'Buscar usuario'}
          </button>
        </>
      )}

      {step === 'confirmUser' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-[#2c2c2c] p-6 rounded-xl border border-gray-700 max-w-sm">
            <p className="text-white text-lg mb-4">¿Es esta la persona correcta?</p>
            <p className="text-xl font-bold text-green-400 mb-4">{userName}</p>
            <div className="flex justify-end space-x-3">
              <button
                className="px-4 py-2 bg-gray-500 text-white rounded"
                onClick={() => setStep('email')}
              >
                Cancelar
              </button>
              <button
                className="px-4 py-2 bg-green-500 text-white rounded"
                onClick={fetchTickets}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 'selectTicket' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-[#2c2c2c] p-6 rounded-xl border border-gray-700 max-w-md">
            <p className="text-white text-lg mb-4">
              Selecciona la entrada gratuita a enviar:
            </p>
            {tickets.map(t => (
              <div key={t.id} className="mb-2">
                <input
                  type="radio"
                  id={t.id}
                  name="ticket"
                  value={t.id}
                  onChange={() => setSelectedTicket(t.id)}
                  className="mr-2"
                />
                <label htmlFor={t.id} className="text-gray-200">
                  {t.type}
                </label>
              </div>
            ))}
            <div className="flex justify-end space-x-3 mt-4">
              <button
                className="px-4 py-2 bg-gray-500 text-white rounded"
                onClick={() => setStep('email')}
              >
                Cancelar
              </button>
              <button
                className="px-4 py-2 bg-green-500 text-white rounded"
                onClick={handleSendTicket}
                disabled={sending}
              >
                {sending ? 'Enviando...' : 'Enviar entrada'}
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 'done' && (
        <div className="text-center text-green-400 mt-4">
          Entrada enviada exitosamente.
          <button
            className="mt-4 underline text-gray-200"
            onClick={() => setStep('email')}
          >
            Enviar otra entrada
          </button>
        </div>
      )}
    </div>
  );
};

export default SendEntryByEmail;
