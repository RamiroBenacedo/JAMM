import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import AsignarUsuario from '../components/AsignarUsuario';
import ListaUsuariosEvento from '../components/ListaUsuariosEvento';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  BarChart3, 
  Users, 
  DollarSign,
  Ticket, 
  TrendingUp, 
  FileSpreadsheet, 
  FileText, 
  Table, 
  Search,
  Calendar,
  Gift,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';

type RRPPGeneralStats = {
  rrpp: string;
  rrppName: string;
  redes: string;
  telefono: string;
  totalSales: number;
  totalTicketsSold: number;
  totalPaidTickets: number;
  eventsCount: number;
  totalFreeTickets: number;
  avgTicketsPerEvent: number;
  avgFreeTicketsPerEvent: number;
  avgRevenuePerEvent: number;
  percentageOfTotal: number;
};

type EventRRPPStats = {
  eventId: string;
  eventName: string;
  rrpp: string;
  rrppName: string;
  totalSales: number;
  ticketsSold: number;
  eventDate: string;
};

type TicketTypeStats = {
  ticketType: string;
  totalSold: number;
  totalSales: number;
  eventsCount: number;
};

const RrppPage: React.FC = () => {
  const { user } = useAuth();
  const [refreshFlag, setRefreshFlag] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generalStats, setGeneralStats] = useState<RRPPGeneralStats[]>([]);
  const [sortedGeneralStats, setSortedGeneralStats] = useState<RRPPGeneralStats[]>([]);
  const [ticketTypeStats, setTicketTypeStats] = useState<TicketTypeStats[]>([]);
  const [totalEventTickets, setTotalEventTickets] = useState(0);
  const [sortConfig, setSortConfig] = useState<{
    key: 'avgTicketsPerEvent' | 'avgFreeTicketsPerEvent' | 'avgRevenuePerEvent' | 'percentageOfTotal' | null;
    direction: 'asc' | 'desc';
  }>({ key: null, direction: 'asc' });

  const COLORS = ['#FF5722', '#56ae4a', '#2196F3', '#FF9800', '#9C27B0', '#4CAF50'];

  const handleUsuarioAsignado = () => {
    setRefreshFlag(prev => !prev);
  };

  const handleSort = (key: 'avgTicketsPerEvent' | 'avgFreeTicketsPerEvent' | 'avgRevenuePerEvent' | 'percentageOfTotal') => {
    let direction: 'asc' | 'desc' = 'asc';
    
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    
    setSortConfig({ key, direction });
  };

  const getSortIcon = (columnKey: 'avgTicketsPerEvent' | 'avgFreeTicketsPerEvent' | 'avgRevenuePerEvent' | 'percentageOfTotal') => {
    if (sortConfig.key !== columnKey) {
      return <ChevronsUpDown className="h-4 w-4 text-gray-400" />;
    }
    
    return sortConfig.direction === 'asc' 
      ? <ChevronUp className="h-4 w-4 text-[#FF5722]" />
      : <ChevronDown className="h-4 w-4 text-[#FF5722]" />;
  };

  // useEffect para aplicar el ordenamiento cada vez que cambien los datos o el sortConfig
  useEffect(() => {
    if (!sortConfig.key) {
      setSortedGeneralStats(generalStats);
      return;
    }

    const sorted = [...generalStats].sort((a, b) => {
      const aValue = a[sortConfig.key!];
      const bValue = b[sortConfig.key!];
      
      if (sortConfig.direction === 'asc') {
        return aValue - bValue;
      } else {
        return bValue - aValue;
      }
    });

    setSortedGeneralStats(sorted);
  }, [generalStats, sortConfig]);

  useEffect(() => {
    if (user?.id) {
      fetchAllRRPPData();
    }
  }, [refreshFlag, user?.id]);


  const fetchAllRRPPData = async () => {
    try {
      setLoading(true);
      
      // 1. Obtener todos los RRPPs asignados a eventos del usuario actual (incluso sin ventas)
      const { data: eventosUsuario, error: eventosError } = await supabase
        .from('events')
        .select('id')
        .eq('creator_id', user?.id);

      if (eventosError || !eventosUsuario?.length) {
        setGeneralStats([]);
        setTicketTypeStats([]);
        setTotalEventTickets(0);
        setLoading(false);
        return;
      }

      const eventIds = eventosUsuario.map(e => e.id);
      
      // 2. Obtener todos los RRPPs asignados a mis eventos
      const { data: assignedRrpps, error: assignedError } = await supabase
        .from('profile_events')
        .select(`
          rrpp_id,
          event_id,
          rrpp!inner(codigo, nombre, redes, telefono, profile_id),
          events!inner(name, date)
        `)
        .in('event_id', eventIds)
        .eq('activo', true);

      if (assignedError) {
        console.error('Error fetching assigned RRPPs:', assignedError);
        setLoading(false);
        return;
      }


      // 3. Obtener estadísticas de ventas para estos RRPPs
      const rrppCodes = assignedRrpps.map(item => item.rrpp.codigo);
      
      let ventasData: any[] = [];
      if (rrppCodes.length > 0) {
        const { data: ventas, error: ventasError } = await supabase
          .from('purchased_tickets')
          .select(`
            rrpp,
            quantity,
            total_price,
            ticket_types!inner(event_id, type)
          `)
          .in('rrpp', rrppCodes)
          .not('rrpp', 'is', null)  // Asegurar que rrpp no sea null
          .eq('payment_status', 1)
          .in('ticket_types.event_id', eventIds);
        
        if (!ventasError) {
          ventasData = ventas || [];
        }
      }

      // 4. Calcular estadísticas generales por RRPP
      const generalStatsMap = new Map<string, RRPPGeneralStats>();
      
      // Inicializar todos los RRPPs asignados con valores en 0
      assignedRrpps.forEach(item => {
        const codigo = item.rrpp.codigo;
        if (!generalStatsMap.has(codigo)) {
          generalStatsMap.set(codigo, {
            rrpp: codigo,
            rrppName: item.rrpp.nombre,
            redes: item.rrpp.redes || 'N/A',
            telefono: item.rrpp.telefono || 'N/A',
            totalSales: 0,
            totalTicketsSold: 0,
            totalPaidTickets: 0,
            eventsCount: 0,
            totalFreeTickets: 0,
            avgTicketsPerEvent: 0,
            avgFreeTicketsPerEvent: 0,
            avgRevenuePerEvent: 0,
            percentageOfTotal: 0
          });
        }
      });

      // Contar eventos únicos por RRPP
      const eventCountMap = new Map<string, Set<string>>();
      assignedRrpps.forEach(item => {
        const codigo = item.rrpp.codigo;
        if (!eventCountMap.has(codigo)) {
          eventCountMap.set(codigo, new Set());
        }
        eventCountMap.get(codigo)!.add(item.event_id);
      });

      // Actualizar conteo de eventos
      eventCountMap.forEach((eventSet, codigo) => {
        const stats = generalStatsMap.get(codigo);
        if (stats) {
          stats.eventsCount = eventSet.size;
        }
      });

      // Agregar datos de ventas (solo ventas con código RRPP válido)
      ventasData.forEach(venta => {
        // Verificar que la venta tenga un código RRPP válido
        if (!venta.rrpp) return;
        
        const stats = generalStatsMap.get(venta.rrpp);
        if (stats) {
          const quantity = venta.quantity || 0;
          const totalPrice = venta.total_price || 0;
          
          stats.totalTicketsSold += quantity;
          stats.totalSales += totalPrice;
          
          if (totalPrice === 0) {
            stats.totalFreeTickets += quantity;
          } else {
            stats.totalPaidTickets += quantity;
          }
        }
      });

      // Calcular promedios por evento
      generalStatsMap.forEach((stats) => {
        if (stats.eventsCount > 0) {
          stats.avgTicketsPerEvent = stats.totalPaidTickets / stats.eventsCount;
          stats.avgFreeTicketsPerEvent = stats.totalFreeTickets / stats.eventsCount;
          stats.avgRevenuePerEvent = stats.totalSales / stats.eventsCount;
        }
      });

      // 5. Calcular total de entradas vendidas en todos los eventos (RRPP + directas)
      const { data: allEventTickets, error: allTicketsError } = await supabase
        .from('purchased_tickets')
        .select(`
          quantity,
          ticket_types!inner(event_id)
        `)
        .in('ticket_types.event_id', eventIds)
        .eq('payment_status', 1);

      if (!allTicketsError && allEventTickets) {
        const totalTickets = allEventTickets.reduce((sum, ticket) => sum + (ticket.quantity || 0), 0);
        setTotalEventTickets(totalTickets);
        
        // Calcular porcentaje individual para cada RRPP
        generalStatsMap.forEach((stats) => {
          if (totalTickets > 0) {
            stats.percentageOfTotal = (stats.totalTicketsSold / totalTickets) * 100;
          }
        });
      } else {
        setTotalEventTickets(0);
      }

      setGeneralStats(Array.from(generalStatsMap.values()));

      // 6. Estadísticas por tipo de entrada (solo de ventas con código RRPP)
      if (rrppCodes.length > 0) {
        const { data: ticketTypeData, error: ticketTypeError } = await supabase
          .from('purchased_tickets')
          .select(`
            quantity,
            total_price,
            ticket_types!inner(type, event_id)
          `)
          .in('rrpp', rrppCodes)
          .not('rrpp', 'is', null)
          .eq('payment_status', 1)
          .in('ticket_types.event_id', eventIds);
        
        if (!ticketTypeError && ticketTypeData) {
          // Agrupar por tipo de entrada
          const typeStatsMap = new Map<string, {totalSold: number, totalSales: number, eventsCount: Set<string>}>();
          
          ticketTypeData.forEach(ticket => {
            const ticketType = Array.isArray(ticket.ticket_types) 
              ? ticket.ticket_types[0]?.type 
              : ticket.ticket_types?.type;
            const eventId = Array.isArray(ticket.ticket_types) 
              ? ticket.ticket_types[0]?.event_id 
              : ticket.ticket_types?.event_id;
              
            if (!ticketType) return;
            
            if (!typeStatsMap.has(ticketType)) {
              typeStatsMap.set(ticketType, {
                totalSold: 0,
                totalSales: 0,
                eventsCount: new Set()
              });
            }
            
            const stats = typeStatsMap.get(ticketType)!;
            stats.totalSold += ticket.quantity || 0;
            stats.totalSales += ticket.total_price || 0;
            if (eventId) stats.eventsCount.add(eventId);
          });
          
          // Convertir a formato final
          const typeStatsArray = Array.from(typeStatsMap.entries()).map(([type, stats]) => ({
            ticketType: type,
            totalSold: stats.totalSold,
            totalSales: stats.totalSales,
            eventsCount: stats.eventsCount.size
          }));
          
          setTicketTypeStats(typeStatsArray);
        } else {
          setTicketTypeStats([]);
        }
      } else {
        setTicketTypeStats([]);
      }

    } catch (error: any) {
      console.error('Error in fetchAllRRPPData:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadGeneralStatsCSV = () => {
    const csvData = sortedGeneralStats.map(stat => ({
      'RRPP': stat.rrppName,
      'Redes': stat.redes,
      'Teléfono': stat.telefono,
      'Eventos': stat.eventsCount,
      'Entradas Vendidas': stat.totalPaidTickets,
      'Entradas Gratuitas': stat.totalFreeTickets,
      'Ingresos Totales': stat.totalSales.toFixed(2),
      'Entradas Vendidas Promedio por Evento': stat.avgTicketsPerEvent.toFixed(1),
      'Entradas Gratuitas Promedio por Evento': stat.avgFreeTicketsPerEvent.toFixed(1),
      'Porcentaje del Total': `${stat.percentageOfTotal.toFixed(1)}%`,
      'Ingresos Promedio por Evento': stat.avgRevenuePerEvent.toFixed(2)
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'estadisticas_generales_rrpp.csv';
    link.click();
  };


  const downloadGeneralStatsPDF = () => {
    const doc = new jsPDF();
    doc.text('Estadísticas Generales de RRPPs', 20, 20);
    
    const tableData = sortedGeneralStats.map(stat => [
      stat.rrppName,
      stat.redes,
      stat.telefono,
      stat.eventsCount.toString(),
      stat.avgTicketsPerEvent.toFixed(1),
      stat.avgFreeTicketsPerEvent.toFixed(1),
      `${stat.percentageOfTotal.toFixed(1)}%`,
      `$${stat.avgRevenuePerEvent.toFixed(2)}`
    ]);

    autoTable(doc, {
      head: [['RRPP', 'Redes', 'Teléfono', 'Eventos', 'Ent. Vendidas Prom/Evento', 'Ent. Gratuitas Prom/Evento', '% del Total', 'Ingresos Prom/Evento ($)']],
      body: tableData,
      startY: 30,
      styles: { fontSize: 5 },
      headStyles: { fillColor: [255, 87, 34] }
    });

    doc.save('estadisticas_generales_rrpp.pdf');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#2a2a2a] py-4 lg:py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FF5722]"></div>
        </div>
      </div>
    );
  }

  const totalRrppTickets = generalStats?.reduce((sum, stat) => sum + (stat.totalTicketsSold || 0), 0) || 0; // vendidas + gratis por RRPPs
  const totalSales = generalStats?.reduce((sum, stat) => sum + (stat.totalSales || 0), 0) || 0;
  const totalPaidRrppTickets = generalStats?.reduce((sum, stat) => sum + (stat.totalPaidTickets || 0), 0) || 0; // solo vendidas por RRPPs
  const totalFreeRrppTickets = generalStats?.reduce((sum, stat) => sum + (stat.totalFreeTickets || 0), 0) || 0; // solo gratis por RRPPs
  const rrppPercentage = totalEventTickets > 0 ? (totalRrppTickets / totalEventTickets) * 100 : 0;

  return (
    <div className="min-h-screen bg-[#2a2a2a] py-2 lg:py-4 xl:py-8">
      <div className="px-3 sm:px-4 lg:px-6 xl:px-8 max-w-[95vw] mx-auto">
        <h1 className="text-xl lg:text-2xl xl:text-3xl font-bold text-white mb-3 lg:mb-4 xl:mb-6 text-left lg:text-center">
          Dashboard de RRPPs
        </h1>

        {/* Resumen General */}
        <div className="mb-8">
          <div className="flex items-center space-x-2 mb-6">
            <TrendingUp className="h-5 w-5 text-[#FF5722]" />
            <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
              Resumen General
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-4 mb-4 lg:mb-6">
            <div className="bg-[#1f1f1f] p-6 rounded-lg border border-gray-700">
              <div className="flex items-center space-x-2 mb-2">
                <Ticket className="h-5 w-5 text-[#FF5722]" />
                <span className="text-sm text-gray-400" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Total Entradas por RRPPs
                </span>
              </div>
              <p className="text-2xl font-bold text-white" >
                {totalRrppTickets.toLocaleString()}
              </p>
            </div>

            <div className="bg-[#1f1f1f] p-6 rounded-lg border border-gray-700">
              <div className="flex items-center space-x-2 mb-2">
                <DollarSign className="h-5 w-5 text-[#FF5722]" />
                <span className="text-sm text-gray-400" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Ingresos Totales
                </span>
              </div>
              <p className="text-2xl font-bold text-white" >
                ${totalSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>

            <div className="bg-[#1f1f1f] p-6 rounded-lg border border-gray-700">
              <div className="flex items-center space-x-2 mb-2">
                <Users className="h-5 w-5 text-[#FF5722]" />
                <span className="text-sm text-gray-400" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Entradas Vendidas por RRPPs
                </span>
              </div>
              <p className="text-2xl font-bold text-white" >
                {totalPaidRrppTickets.toLocaleString()}
              </p>
            </div>

            <div className="bg-[#1f1f1f] p-6 rounded-lg border border-gray-700">
              <div className="flex items-center space-x-2 mb-2">
                <Gift className="h-5 w-5 text-[#FF5722]" />
                <span className="text-sm text-gray-400" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Entradas Gratuitas por RRPPs
                </span>
              </div>
              <p className="text-2xl font-bold text-white" >
                {totalFreeRrppTickets.toLocaleString()}
              </p>
            </div>

            <div className="bg-[#1f1f1f] p-6 rounded-lg border border-gray-700">
              <div className="flex items-center space-x-2 mb-2">
                <BarChart3 className="h-5 w-5 text-[#FF5722]" />
                <span className="text-sm text-gray-400" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Porcentaje por RRPPs
                </span>
              </div>
              <p className="text-2xl font-bold text-white" >
                {rrppPercentage.toFixed(1)}%
              </p>
              <div className="text-xs text-gray-500 mt-1" style={{ fontFamily: 'Inter, sans-serif' }}>
                de {totalEventTickets.toLocaleString()} totales
              </div>
            </div>
          </div>
        </div>

        {/* Estadísticas por RRPP */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-[#FF5722]" />
              <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
                Rendimiento por RRPP
              </h2>
            </div>
            {generalStats.length > 0 && (
              <div className="flex space-x-3">
                <button
                  onClick={downloadGeneralStatsCSV}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                  >
                  <FileSpreadsheet className="h-4 w-4" />
                  <span>CSV</span>
                </button>
                <button
                  onClick={downloadGeneralStatsPDF}
                  className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                  >
                  <FileText className="h-4 w-4" />
                  <span>PDF</span>
                </button>
              </div>
            )}
          </div>

          <div className="bg-[#1f1f1f] rounded-lg border border-gray-700 overflow-hidden">
            {sortedGeneralStats.length > 0 ? (
              <div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-700">
                    <thead className="bg-[#111111]">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider" style={{ fontFamily: 'Inter, sans-serif' }}>
                          Nombre Completo
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider" style={{ fontFamily: 'Inter, sans-serif' }}>
                          Redes
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider" style={{ fontFamily: 'Inter, sans-serif' }}>
                          Número Celular
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider" style={{ fontFamily: 'Inter, sans-serif' }}>
                          <button
                            onClick={() => handleSort('avgTicketsPerEvent')}
                            className="flex items-center space-x-1 hover:text-white transition-colors group"
                          >
                            <span>Entradas Vendidas Promedio</span>
                            {getSortIcon('avgTicketsPerEvent')}
                          </button>
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider" style={{ fontFamily: 'Inter, sans-serif' }}>
                          <button
                            onClick={() => handleSort('avgFreeTicketsPerEvent')}
                            className="flex items-center space-x-1 hover:text-white transition-colors group"
                          >
                            <span>Entradas Gratuitas Promedio</span>
                            {getSortIcon('avgFreeTicketsPerEvent')}
                          </button>
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider" style={{ fontFamily: 'Inter, sans-serif' }}>
                          <button
                            onClick={() => handleSort('percentageOfTotal')}
                            className="flex items-center space-x-1 hover:text-white transition-colors group"
                          >
                            <span>% del Total</span>
                            {getSortIcon('percentageOfTotal')}
                          </button>
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider" style={{ fontFamily: 'Inter, sans-serif' }}>
                          <button
                            onClick={() => handleSort('avgRevenuePerEvent')}
                            className="flex items-center space-x-1 hover:text-white transition-colors group"
                          >
                            <span>Ingresos Generados Promedio</span>
                            {getSortIcon('avgRevenuePerEvent')}
                          </button>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {sortedGeneralStats.map((stat, index) => (
                        <tr key={stat.rrpp} className={index % 2 === 0 ? 'bg-[#1f1f1f]' : 'bg-[#111111]'}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
                              {stat.rrppName}
                            </div>
                            <div className="text-xs text-gray-400" style={{ fontFamily: 'Inter, sans-serif' }}>
                              Código: {stat.rrpp}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-300" style={{ fontFamily: 'Inter, sans-serif' }}>
                              {stat.redes}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-300" style={{ fontFamily: 'Inter, sans-serif' }}>
                              {stat.telefono}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-semibold text-white" >
                              {stat.avgTicketsPerEvent.toFixed(1)}
                            </div>
                            <div className="text-xs text-gray-400" style={{ fontFamily: 'Inter, sans-serif' }}>
                              por evento ({stat.eventsCount} eventos)
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-semibold text-white" >
                              {stat.avgFreeTicketsPerEvent.toFixed(1)}
                            </div>
                            <div className="text-xs text-gray-400" style={{ fontFamily: 'Inter, sans-serif' }}>
                              por evento
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-semibold text-white" >
                              {stat.percentageOfTotal.toFixed(1)}%
                            </div>
                            <div className="text-xs text-gray-400" style={{ fontFamily: 'Inter, sans-serif' }}>
                              del total
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-semibold text-white" >
                              ${stat.avgRevenuePerEvent.toFixed(2)}
                            </div>
                            <div className="text-xs text-gray-400" style={{ fontFamily: 'Inter, sans-serif' }}>
                              por evento
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Texto indicativo sobre métricas por evento */}
                <div className="px-6 py-4 bg-[#0f0f0f] border-t border-gray-600">
                  <div className="flex items-center space-x-2 text-sm text-gray-400" style={{ fontFamily: 'Inter, sans-serif' }}>
                    <span>💡</span>
                    <span>Para consultar las métricas por evento específico, diríjase al detalle del evento correspondiente.</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Table className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400" style={{ fontFamily: 'Inter, sans-serif' }}>
                  No hay datos de RRPPs disponibles
                </p>
              </div>
            )}
          </div>
        </div>



        {/* Gestión de RRPPs (componentes originales) */}
        <div className="mt-12 pt-8 border-t border-gray-700">
          <h2 className="text-xl font-bold text-white mb-6" style={{ fontFamily: 'Inter, sans-serif' }}>
            Gestión de RRPPs
          </h2>
          <div className="space-y-4 lg:space-y-6 overflow-hidden">
            <AsignarUsuario onUsuarioAsignado={handleUsuarioAsignado} />
            <div className="overflow-hidden">
              <ListaUsuariosEvento refreshFlag={refreshFlag} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RrppPage;