import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Ticket, QrCode, Mail, User, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
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


const Profile = () => {
  const { user } = useAuth();
  const [purchasedTickets, setPurchasedTickets] = useState<PurchasedTicket[]>([]);
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

      } catch (err) {
        console.error('Error fetching user data:', err);
        setError('Error al cargar los datos. Por favor, intenta de nuevo más tarde.');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user]);

  

  if (loading) {
    return (
      <div className="bg-[#2a2a2a]">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FF5722]"></div>
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
                <User className="h-5 w-5 text-[#FF5722]" />
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
                  <div className="border-white text-white whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm">
                    <Ticket className="w-5 h-5 inline mr-2" />
                    Mis Tickets
                  </div>
                </nav>
              </div>

              <div>
                <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {purchasedTickets.length === 0 ? (
                    <div className="col-span-full bg-[#111111] p-6 text-center rounded-lg border border-gray-700">
                      <p className="text-gray-400">No has comprado entradas todavía.</p>
                      <p className="text-gray-400">Si realizaste una compra y no aparecen tus entradas, por favor esperá unos minutos mientras se confirma tu compra.</p>
                      <p className="text-gray-400">Te notificaremos por correo cuando estén disponibles.</p>
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
                              <p className="text-[#FFFFFF]">Total: ${ticket.total_price}</p>
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
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default Profile;