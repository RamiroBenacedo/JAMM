import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Mail, User, Ticket, Send, Gift, Plus, Minus, ArrowLeft, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { API_CONFIG } from '../config/api';
import { logError } from '../utils/secureLogger';

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
  const [step, setStep] = useState<'email' | 'confirmUser' | 'selectTicket' | 'done' | 'error' | 'success'>('email');
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  const searchUserByEmail = async () => {
    setSending(true);
    const { data, error } = await supabase
      .from('user_emails')
      .select('id, full_name')
      .eq('email', email)
      .single();
    setSending(false);

    if (error || !data) {
      setErrorMessage('Usuario no encontrado. El destinatario debe estar registrado en la plataforma para recibir entradas gratuitas.');
      setStep('error');
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
      setErrorMessage('No hay entradas disponibles para este evento. Contacta al administrador.');
      setStep('error');
      return;
    }

    setTickets(data);
    setStep('selectTicket');
  };

  const handleSendTicket = async () => {
    if (!selectedTicket) {
      setErrorMessage('Por favor selecciona un tipo de entrada antes de continuar.');
      setStep('error');
      return;
    }

    setSending(true);

    try {
      // Crear múltiples tickets manteniendo el formato original
      const ticketsToInsert = [];
      
      for (let i = 0; i < quantity; i++) {
        const qrCode = generateUniqueQRCode(selectedTicket, eventId, userId, email + i);
        ticketsToInsert.push({
          user_id: userId,
          ticket_type_id: selectedTicket,
          quantity: 1,
          total_price: 0,
          qr_code: qrCode,
          payment_status: 1, // Cambiar a 1 para que aparezca en las métricas RRPP
          email,
          rrpp: rrppCodigo ?? null
        });
      }

      const { error: insertError } = await supabase.from('purchased_tickets').insert(ticketsToInsert);

      if (insertError) {
        setSending(false);
        setErrorMessage('No se pudo registrar el ticket: ' + insertError.message);
        setStep('error');
        return;
      }

      // Usar el endpoint original con el formato correcto (cantidad en items)
      const response = await fetch(
        API_CONFIG.endpoints.swiftTask,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_CONFIG.supabase.anonKey}`, // Como en la versión original
          },
          body: JSON.stringify({
            email,
            userId,
            ticketTypeId: selectedTicket,
            event_id: eventId,
            items: [
              {
                title: 'Entrada Gratuita',
                quantity, // Usar la cantidad seleccionada
                unit_price: 0,
              },
            ],
          }),
        }
      );

      const result = await response.json();
      setSending(false);

      if (!response.ok) {
        const errorMsg = result?.detalles || result?.error || 'Error desconocido';
        setErrorMessage('Error al enviar la entrada: ' + errorMsg);
        setStep('error');
        return;
      }

      setSuccessMessage(`${quantity} entrada${quantity > 1 ? 's' : ''} enviada${quantity > 1 ? 's' : ''} correctamente.`);
      setStep('done');
      setEmail('');
      setUserName('');
      setSelectedTicket('');
      setQuantity(1);
    } catch (error) {
      setSending(false);
      setErrorMessage('Error inesperado al enviar las entradas. Por favor intenta nuevamente.');
      setStep('error');
      console.error('Error:', error);
    }
  };

  return (
    <div className="mb-8">
      <div className="flex items-center space-x-2 mb-6">
        <Gift className="h-5 w-5 text-[#FF5722]" />
        <h3 className="text-base lg:text-lg font-medium text-white">
          Enviar Entradas Gratuitas
        </h3>
      </div>

      <div className="bg-[#111111] p-4 lg:p-6 rounded-lg border border-gray-600">
        {step === 'email' && (
          <div className="space-y-4">
            {/* Aviso informativo */}
            <div className="bg-blue-900/30 border border-blue-500/50 text-blue-200 px-4 py-3 rounded-lg">
              <div className="flex items-start">
                <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium mb-1" style={{ fontFamily: 'Inter, sans-serif' }}>
                    Requisito importante
                  </p>
                  <p className="text-xs text-blue-300" style={{ fontFamily: 'Inter, sans-serif' }}>
                    El destinatario debe estar registrado en la plataforma para recibir entradas gratuitas.
                  </p>
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>
                Email del usuario registrado
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="email"
                  className="w-full pl-10 pr-3 py-3 bg-[#1f1f1f] border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF5722] focus:border-[#FF5722]"
                  placeholder="ejemplo@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                                  />
              </div>
            </div>
            <button
              onClick={searchUserByEmail}
              disabled={sending || !email}
              className="w-full flex items-center justify-center px-4 py-3 bg-[#FF5722] text-white rounded-lg hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
              <User className="h-4 w-4 mr-2" />
              {sending ? 'Buscando...' : 'Buscar Usuario'}
            </button>
          </div>
        )}

        {step === 'confirmUser' && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-[#1f1f1f] p-6 rounded-lg border border-gray-700 max-w-sm mx-4">
              <div className="text-center mb-6">
                <User className="h-12 w-12 text-[#FF5722] mx-auto mb-4" />
                <h4 className="text-lg font-medium text-white mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Confirmar Usuario
                </h4>
                <p className="text-gray-400 mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>
                  ¿Es esta la persona correcta?
                </p>
                <div className="bg-[#111111] p-4 rounded-lg border border-gray-600">
                  <p className="text-xl font-bold text-white" >
                    {userName}
                  </p>
                  <p className="text-sm text-gray-400" style={{ fontFamily: 'Inter, sans-serif' }}>
                    {email}
                  </p>
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center"
                  onClick={() => setStep('email')}
                                  >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Cancelar
                </button>
                <button
                  className="flex-1 px-4 py-2 bg-[#FF5722] text-white rounded-lg hover:bg-opacity-90 transition-colors flex items-center justify-center"
                  onClick={fetchTickets}
                                  >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 'selectTicket' && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-[#1f1f1f] p-6 rounded-lg border border-gray-700 max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="mb-6">
                <div className="flex items-center space-x-2 mb-4">
                  <Ticket className="h-5 w-5 text-[#FF5722]" />
                  <h4 className="text-lg font-medium text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
                    Configurar Entradas
                  </h4>
                </div>
                <p className="text-gray-400 text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Para: <span className="text-white font-medium">{userName}</span>
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3" style={{ fontFamily: 'Inter, sans-serif' }}>
                    Tipo de entrada
                  </label>
                  <div className="space-y-2">
                    {tickets.map(t => (
                      <label key={t.id} className="flex items-center p-3 bg-[#111111] rounded-lg border border-gray-600 cursor-pointer hover:border-[#FF5722] transition-colors">
                        <input
                          type="radio"
                          name="ticket"
                          value={t.id}
                          checked={selectedTicket === t.id}
                          onChange={() => setSelectedTicket(t.id)}
                          className="text-[#FF5722] focus:ring-[#FF5722] border-gray-600"
                        />
                        <div className="ml-3">
                          <div className="text-white font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>
                            {t.type}
                          </div>
                          {t.description && (
                            <div className="text-sm text-gray-400" style={{ fontFamily: 'Inter, sans-serif' }}>
                              {t.description}
                            </div>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3" style={{ fontFamily: 'Inter, sans-serif' }}>
                    Cantidad de entradas
                  </label>
                  <div className="flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="p-2 bg-[#111111] border border-gray-600 rounded-lg hover:border-[#FF5722] transition-colors"
                    >
                      <Minus className="h-4 w-4 text-gray-400" />
                    </button>
                    <div className="flex-1 text-center">
                      <span className="text-2xl font-bold text-white" >
                        {quantity}
                      </span>
                      <p className="text-xs text-gray-400" style={{ fontFamily: 'Inter, sans-serif' }}>
                        entrada{quantity > 1 ? 's' : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.min(10, quantity + 1))}
                      className="p-2 bg-[#111111] border border-gray-600 rounded-lg hover:border-[#FF5722] transition-colors"
                    >
                      <Plus className="h-4 w-4 text-gray-400" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 text-center" style={{ fontFamily: 'Inter, sans-serif' }}>
                    Máximo 10 entradas por envío
                  </p>
                </div>
              </div>

              <div className="flex space-x-3 mt-8">
                <button
                  className="flex-1 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center"
                  onClick={() => setStep('email')}
                                  >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Cancelar
                </button>
                <button
                  className="flex-1 px-4 py-3 bg-[#FF5722] text-white rounded-lg hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                  onClick={handleSendTicket}
                  disabled={sending || !selectedTicket}
                                  >
                  <Send className="h-4 w-4 mr-2" />
                  {sending ? 'Enviando...' : `Enviar ${quantity} entrada${quantity > 1 ? 's' : ''}`}
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 'error' && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-[#1f1f1f] p-6 rounded-lg border border-red-500 max-w-sm mx-4">
              <div className="text-center mb-6">
                <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-white mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Error
                </h4>
                <p className="text-gray-400 text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
                  {errorMessage}
                </p>
              </div>
              <button
                className="w-full px-4 py-3 bg-[#FF5722] text-white rounded-lg hover:bg-opacity-90 transition-colors flex items-center justify-center"
                onClick={() => setStep('email')}
                              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver a Intentar
              </button>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-[#1f1f1f] p-6 rounded-lg border border-green-500 max-w-sm mx-4">
              <div className="text-center mb-6">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-white mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>
                  ¡Éxito!
                </h4>
                <p className="text-gray-400 text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
                  {successMessage}
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  onClick={() => {
                    setStep('email');
                    setEmail('');
                    setUserName('');
                    setSelectedTicket('');
                    setQuantity(1);
                  }}
                                  >
                  Finalizar
                </button>
                <button
                  className="flex-1 px-4 py-2 bg-[#FF5722] text-white rounded-lg hover:bg-opacity-90 transition-colors flex items-center justify-center"
                  onClick={() => {
                    setStep('email');
                    setEmail('');
                    setUserName('');
                    setSelectedTicket('');
                    setQuantity(1);
                  }}
                                  >
                  <Gift className="h-4 w-4 mr-2" />
                  Enviar Más
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="text-center py-8">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h4 className="text-xl font-bold text-white mb-2" >
              ¡{quantity > 1 ? 'Entradas Enviadas' : 'Entrada Enviada'}!
            </h4>
            <p className="text-gray-400 mb-6" style={{ fontFamily: 'Inter, sans-serif' }}>
              {quantity} entrada{quantity > 1 ? 's' : ''} enviada{quantity > 1 ? 's' : ''} exitosamente a {userName}
            </p>
            <button
              className="px-6 py-3 bg-[#FF5722] text-white rounded-lg hover:bg-opacity-90 transition-colors flex items-center mx-auto"
              onClick={() => setStep('email')}
                          >
              <Gift className="h-4 w-4 mr-2" />
              Enviar Otra Entrada
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SendEntryByEmail;
