import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { FiLink, FiChevronDown, FiChevronUp, FiTrash2 } from 'react-icons/fi';

interface ListaRRPPProps {
  userId: string;
  refreshFlag: boolean;
}

interface RRPP {
  id: string;
  nombre: string;
  redes: string;
  telefono: string;
  codigo: string;
}

interface VentasResumen {
  total: number;
  cantidad: number;
  ventasPorTipo: Record<string, {
    type: string;
    eventName: string;
    eventId: string;
    total: number;
    cantidad: number;
  }>;
}

interface TicketType {
  id: string;
  type: string;
  price: number;
  event_id: string;
}

interface Evento {
  id: string;
  name: string;
  creator_id: string;
}

function ListaRRPP({ userId, refreshFlag }: ListaRRPPProps) {
  const [rrpps, setRrpps] = useState<RRPP[]>([]);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [ventasPorRRPP, setVentasPorRRPP] = useState<Record<string, VentasResumen>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [ticketTypes, setTicketTypes] = useState<Record<string, TicketType & {eventName: string}>>({});
  const [eventosDelUsuario, setEventosDelUsuario] = useState<Evento[]>([]);
  const [loadingDelete, setLoadingDelete] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchData = async () => {
      // Obtener RRPP
      const { data: rrppData, error: rrppError } = await supabase
        .from('rrpp')
        .select('*')
        .eq('creator_id', userId);

      if (rrppError) {
        console.error(rrppError);
      } else {
        setRrpps(rrppData || []);
      }

      // Obtener eventos del usuario actual
      const { data: eventosData, error: eventosError } = await supabase
        .from('events')
        .select('id, name, creator_id')
        .eq('creator_id', userId);

      if (eventosError) {
        console.error(eventosError);
      } else {
        setEventosDelUsuario(eventosData || []);
      }

      // Obtener ticket types con nombre de evento
      if (eventosData && eventosData.length > 0) {
        const { data: ticketData, error: ticketError } = await supabase
          .from('ticket_types')
          .select(`
            id, 
            type, 
            price, 
            event_id,
            events (name)
          `)
          .in('event_id', eventosData.map(e => e.id));

        if (!ticketError && ticketData) {
          const typesMap = ticketData.reduce((acc, type) => {
            acc[type.id] = {
              ...type,
              eventName: (type.events as unknown as Evento)?.name || `Evento ${type.event_id}`
            };
            return acc;
          }, {} as Record<string, TicketType & {eventName: string}>);
          setTicketTypes(typesMap);
        }
      }
    };

    if (userId) fetchData();
  }, [userId, refreshFlag]);

  const toggleRow = async (rrppCodigo: string) => {
    const isExpanded = expandedRows[rrppCodigo];

    setExpandedRows((prev) => ({
      ...prev,
      [rrppCodigo]: !isExpanded,
    }));

    if (!isExpanded && !ventasPorRRPP[rrppCodigo]) {
      const { data, error } = await supabase
        .from('purchased_tickets')
        .select('total_price, ticket_type_id, quantity')
        .eq('rrpp', rrppCodigo)
        .eq('payment_status', 1);

      if (error) {
        console.error(error);
      } else if (data) {
        const ventasPorTipo: Record<string, {
          type: string;
          eventName: string;
          eventId: string;
          total: number;
          cantidad: number;
        }> = {};
        
        data.forEach(ticket => {
          const tipo = ticketTypes[ticket.ticket_type_id];
          if (tipo) {
            if (!ventasPorTipo[ticket.ticket_type_id]) {
              ventasPorTipo[ticket.ticket_type_id] = {
                type: tipo.type,
                eventName: tipo.eventName,
                eventId: tipo.event_id,
                total: 0,
                cantidad: 0
              };
            }
            ventasPorTipo[ticket.ticket_type_id].total += ticket.total_price || 0;
            ventasPorTipo[ticket.ticket_type_id].cantidad += ticket.quantity || 0;
          }
        });

        const total = data.reduce((acc, ticket) => acc + (ticket.total_price || 0), 0);
        const cantidad = data.reduce((acc, ticket) => acc + (ticket.quantity || 0), 0);

        setVentasPorRRPP((prev) => ({
          ...prev,
          [rrppCodigo]: { 
            total, 
            cantidad,
            ventasPorTipo
          },
        }));
      }
    }
  };

  const generateRRPPUrl = (rrppCodigo: string, eventId: string) => {
    const url = `${window.location.origin}/${eventId}?rrpp=${rrppCodigo}`;
    navigator.clipboard.writeText(url);
    setCopiedId(`${rrppCodigo}-${eventId}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const deleteRRPP = async (rrppId: string, rrppCodigo: string) => {
    setLoadingDelete(prev => ({ ...prev, [rrppCodigo]: true }));
    
    try {
      // Verificar si hay tickets asociados
      const { count } = await supabase
        .from('purchased_tickets')
        .select('*', { count: 'exact' })
        .eq('rrpp', rrppCodigo);

      if (count && count > 0) {
        alert('No se puede eliminar este RRPP porque tiene tickets asociados');
        return;
      }

      const { error } = await supabase
        .from('rrpp')
        .delete()
        .eq('id', rrppId);

      if (error) {
        throw error;
      }

      setRrpps(prev => prev.filter(r => r.id !== rrppId));
      // Limpiar estados relacionados
      setExpandedRows(prev => {
        const newState = { ...prev };
        delete newState[rrppCodigo];
        return newState;
      });
      setVentasPorRRPP(prev => {
        const newState = { ...prev };
        delete newState[rrppCodigo];
        return newState;
      });
    } catch (error) {
      console.error('Error eliminando RRPP:', error);
      alert('Error al eliminar RRPP');
    } finally {
      setLoadingDelete(prev => ({ ...prev, [rrppCodigo]: false }));
    }
  };

  if (rrpps.length === 0) {
    return <div className="mt-10 text-white">No tienes RRPP registrados</div>;
  }

  return (
    <div className="mt-6 lg:mt-10">
      <h2 className="text-lg lg:text-xl font-bold mb-4 lg:mb-6 text-white">RRPP Guardados</h2>
      
      {/* Versión para pantallas grandes */}
      <div className="hidden md:block">
        <div className="w-full overflow-x-auto rounded-lg">
          <table className="w-full text-left text-white border border-gray-700 min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Instagram</th>
                <th className="px-4 py-3">Teléfono</th>
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Acción</th>
                <th className="px-4 py-3">Eliminar</th>
              </tr>
            </thead>
            <tbody>
              {rrpps.map((rrpp) => (
                <React.Fragment key={rrpp.id}>
                  <tr className="border-t border-gray-700 hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3">{rrpp.nombre}</td>
                    <td className="px-4 py-3">{rrpp.redes}</td>
                    <td className="px-4 py-3">{rrpp.telefono}</td>
                    <td className="px-4 py-3">{rrpp.codigo}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleRow(rrpp.codigo)}
                        className="flex items-center gap-1 hover:text-[#FF5722] transition-colors"
                        title="Ver detalles"
                      >
                        {expandedRows[rrpp.codigo] ? (
                          <FiChevronUp className="text-lg" />
                        ) : (
                          <FiChevronDown className="text-lg" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => deleteRRPP(rrpp.id, rrpp.codigo)}
                        className="flex items-center gap-1 text-red-400 hover:text-red-600 transition-colors"
                        title="Eliminar RRPP"
                        disabled={loadingDelete[rrpp.codigo]}
                      >
                        {loadingDelete[rrpp.codigo] ? (
                          <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <FiTrash2 className="text-lg" />
                        )}
                      </button>
                    </td>
                  </tr>
                  {expandedRows[rrpp.codigo] && (
                    <tr className="bg-gray-900 border-t border-gray-700">
                      <td colSpan={6}>
                        <div className="p-4 lg:p-6">
                          <h3 className="font-bold mb-4 text-lg">Resumen de Ventas</h3>
                          
                          {ventasPorRRPP[rrpp.codigo]?.cantidad === 0 || 
                          !ventasPorRRPP[rrpp.codigo] ? (
                            <div className="text-gray-400 italic py-4">
                              Este RRPP no tiene tickets confirmados
                            </div>
                          ) : (
                            <>
                              <div className="grid grid-cols-5 gap-4 mb-4 font-semibold border-b border-gray-700 pb-3">
                                <div>Tipo de Ticket</div>
                                <div>Evento</div>
                                <div className="text-right">Precio Unitario</div>
                                <div className="text-right">Cantidad</div>
                                <div className="text-right">Total</div>
                              </div>
                              {ventasPorRRPP[rrpp.codigo]?.ventasPorTipo && 
                                Object.entries(ventasPorRRPP[rrpp.codigo].ventasPorTipo).map(([tipoId, venta]) => (
                                <div key={tipoId} className="grid grid-cols-5 gap-4 py-3 border-b border-gray-700">
                                  <div>{venta.type}</div>
                                  <div>{venta.eventName}</div>
                                  <div className="text-right">
                                    ${(venta.total / venta.cantidad).toFixed(2)}
                                  </div>
                                  <div className="text-right">{venta.cantidad}</div>
                                  <div className="text-right">${venta.total.toFixed(2)}</div>
                                </div>
                              ))}
                              <div className="grid grid-cols-5 gap-4 pt-4 font-bold">
                                <div>Total General</div>
                                <div></div>
                                <div></div>
                                <div className="text-right">{ventasPorRRPP[rrpp.codigo]?.cantidad || 0}</div>
                                <div className="text-right">${ventasPorRRPP[rrpp.codigo]?.total?.toFixed(2) || '0.00'}</div>
                              </div>
                            </>
                          )}

                          {eventosDelUsuario.length > 0 && (
                            <div className="mt-8">
                              <h4 className="font-semibold mb-4 text-lg">Generar enlaces RRPP</h4>
                              <div className="flex flex-wrap gap-3">
                                {eventosDelUsuario.map(evento => (
                                  <div key={evento.id} className="flex items-center gap-2 bg-gray-800 px-4 py-3 rounded-lg">
                                    <span>{evento.name}</span>
                                    <button
                                      onClick={() => generateRRPPUrl(rrpp.codigo, evento.id)}
                                      className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
                                        copiedId === `${rrpp.codigo}-${evento.id}` 
                                          ? 'bg-green-600 hover:bg-green-700' 
                                          : 'bg-[#FF5722] hover:bg-opacity-90'
                                      }`}
                                      title={`Copiar enlace para ${evento.name}`}
                                    >
                                      <FiLink size={16} />
                                      {copiedId === `${rrpp.codigo}-${evento.id}` ? 'Copiado!' : 'Copiar'}
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
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

      {/* Versión para móviles */}
      <div className="md:hidden space-y-4">
        {rrpps.map((rrpp) => (
          <div key={rrpp.id} className="bg-gray-800 rounded-lg overflow-hidden">
            <div className="p-4">
              <div className="space-y-3">
                <div>
                  <p className="text-gray-400 text-sm">Nombre</p>
                  <p className="text-white font-medium">{rrpp.nombre}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Instagram</p>
                  <p className="text-white">{rrpp.redes}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Teléfono</p>
                  <p className="text-white">{rrpp.telefono}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Código</p>
                  <p className="text-white font-medium">{rrpp.codigo}</p>
                </div>
              </div>

              <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-700">
                <button
                  onClick={() => toggleRow(rrpp.codigo)}
                  className="flex items-center gap-2 text-[#FF5722] hover:text-opacity-90 transition-colors"
                >
                  {expandedRows[rrpp.codigo] ? (
                    <>
                      <FiChevronUp className="text-xl" />
                      <span className="text-sm font-medium">Ocultar detalles</span>
                    </>
                  ) : (
                    <>
                      <FiChevronDown className="text-xl" />
                      <span className="text-sm font-medium">Ver detalles</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => deleteRRPP(rrpp.id, rrpp.codigo)}
                  className="flex items-center gap-2 text-red-400 hover:text-red-300 transition-colors"
                  disabled={loadingDelete[rrpp.codigo]}
                >
                  {loadingDelete[rrpp.codigo] ? (
                    <div className="w-5 h-5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <FiTrash2 className="text-xl" />
                      <span className="text-sm font-medium">Eliminar</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {expandedRows[rrpp.codigo] && (
              <div className="border-t border-gray-700 bg-gray-900">
                <div className="p-4">
                  <h3 className="font-bold text-lg mb-4">Resumen de Ventas</h3>
                  
                  {ventasPorRRPP[rrpp.codigo]?.cantidad === 0 || 
                  !ventasPorRRPP[rrpp.codigo] ? (
                    <div className="text-gray-400 italic py-2">
                      Este RRPP no tiene tickets confirmados
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {ventasPorRRPP[rrpp.codigo]?.ventasPorTipo && 
                        Object.entries(ventasPorRRPP[rrpp.codigo].ventasPorTipo).map(([tipoId, venta]) => (
                        <div key={tipoId} className="bg-gray-800 p-4 rounded-lg">
                          <div className="space-y-2">
                            <div>
                              <p className="text-gray-400 text-sm">Tipo de Ticket</p>
                              <p className="text-white">{venta.type}</p>
                            </div>
                            <div>
                              <p className="text-gray-400 text-sm">Evento</p>
                              <p className="text-white">{venta.eventName}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-gray-400 text-sm">Precio Unitario</p>
                                <p className="text-white">${(venta.total / venta.cantidad).toFixed(2)}</p>
                              </div>
                              <div>
                                <p className="text-gray-400 text-sm">Cantidad</p>
                                <p className="text-white">{venta.cantidad}</p>
                              </div>
                            </div>
                            <div className="pt-2 mt-2 border-t border-gray-700">
                              <p className="text-gray-400 text-sm">Total</p>
                              <p className="text-white font-medium">${venta.total.toFixed(2)}</p>
                            </div>
                          </div>
                        </div>
                      ))}

                      <div className="bg-gray-800 p-4 rounded-lg">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-gray-400 text-sm">Total General</p>
                            <p className="text-white font-bold mt-1">
                              ${ventasPorRRPP[rrpp.codigo]?.total?.toFixed(2) || '0.00'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-gray-400 text-sm">Tickets Vendidos</p>
                            <p className="text-white font-bold mt-1">
                              {ventasPorRRPP[rrpp.codigo]?.cantidad || 0}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {eventosDelUsuario.length > 0 && (
                    <div className="mt-6">
                      <h4 className="font-semibold text-lg mb-4">Enlaces RRPP</h4>
                      <div className="space-y-3">
                        {eventosDelUsuario.map(evento => (
                          <div key={evento.id} className="bg-gray-800 p-4 rounded-lg">
                            <p className="text-white mb-3 font-medium">{evento.name}</p>
                            <button
                              onClick={() => generateRRPPUrl(rrpp.codigo, evento.id)}
                              className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-colors ${
                                copiedId === `${rrpp.codigo}-${evento.id}` 
                                  ? 'bg-green-600 hover:bg-green-700' 
                                  : 'bg-[#FF5722] hover:bg-opacity-90'
                              }`}
                            >
                              <FiLink size={18} />
                              {copiedId === `${rrpp.codigo}-${evento.id}` ? 'Copiado!' : 'Copiar Enlace'}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default ListaRRPP;