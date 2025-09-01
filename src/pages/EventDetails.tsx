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
  LineChart,
  Line,
  ComposedChart,
} from 'recharts';
import { Save, Plus, Trash2, Calendar, MapPin, BarChart3, Users, DollarSign, Percent, Ticket, TrendingUp, Eye, ExternalLink, FileText, FileSpreadsheet, Table, CheckCircle, Search, Gift, Clock, Activity, AlertTriangle, TrendingDown, ChevronDown, ChevronRight, ChevronUp } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';

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

type RRPPDetailed = {
  rrpp: string;
  rrppName: string;
  totalSales: number;
  totalTicketsSold: number;
  ticketsByType: {
    ticketType: string;
    ticketsSold: number;
    totalSales: number;
  }[];
};

type PurchasedTicketData = {
  id: string;
  user_name: string;
  user_email: string;
  ticket_type: string;
  quantity: number;
  total_price: number;
  purchase_date: string;
  payment_status: number;
  active: boolean;
};

type FreeTicketData = {
  id: string;
  sender_email: string;
  receiver_name: string;
  receiver_email: string;
  ticket_type: string;
  quantity: number;
  issue_date: string;
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
  const [rrppDetailed, setRrppDetailed] = useState<RRPPDetailed[]>([]);
  const [ticketStats, setTicketStats] = useState<TicketStats[]>([]);
  const [purchasedTickets, setPurchasedTickets] = useState<PurchasedTicketData[]>([]);
  const [freeTickets, setFreeTickets] = useState<FreeTicketData[]>([]);
  const [filteredPurchasedTickets, setFilteredPurchasedTickets] = useState<PurchasedTicketData[]>([]);
  const [filteredFreeTickets, setFilteredFreeTickets] = useState<FreeTicketData[]>([]);
  const [filteredRrppDetailed, setFilteredRrppDetailed] = useState<RRPPDetailed[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [freeTicketsSearchTerm, setFreeTicketsSearchTerm] = useState('');
  const [rrppSearchTerm, setRrppSearchTerm] = useState('');
  const [expandedRrpps, setExpandedRrpps] = useState<Set<string>>(new Set());
  const [allTicketTypes, setAllTicketTypes] = useState<{id: string, type: string}[]>([]);
  const [expandedRrppRows, setExpandedRrppRows] = useState<Set<string>>(new Set());
  const [editingTickets, setEditingTickets] = useState<{ [key: string]: TicketType }>({});
  const [newTicket, setNewTicket] = useState<Omit<TicketType, 'id'>>({ type: '', description: '', price: 0, quantity: 0, active: true });
  const [showNewTicketForm, setShowNewTicketForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [totalScannedTickets, setTotalScannedTickets] = useState(0);
  
  // Estados para las nuevas métricas
  const [salesVelocityPeriod, setSalesVelocityPeriod] = useState<'day' | 'week'>('day');
  const [salesVelocity, setSalesVelocity] = useState(0);
  const [avgAdvanceTime, setAvgAdvanceTime] = useState(0);
  const [avgTicketPrice, setAvgTicketPrice] = useState(0);
  const [projectedRevenue, setProjectedRevenue] = useState(0);
  const [mostSoldTicket, setMostSoldTicket] = useState<{type: string, quantity: number}>({type: 'N/A', quantity: 0});
  const [noShowRate, setNoShowRate] = useState(0);
  
  // Estados para el gráfico de ventas
  const [salesChartPeriod, setSalesChartPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [salesChartData, setSalesChartData] = useState<any[]>([]);
  const [selectedTicketType, setSelectedTicketType] = useState<string>('all');

  useEffect(() => {
    if (!user?.id) return;
    supabase.from('profiles').select('rol').eq('user_id', user.id).single().then(({ data }) => setRol(data?.rol ?? null));
  }, [user]);

  // Filtrar tickets por búsqueda
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredPurchasedTickets(purchasedTickets);
    } else {
      const filtered = purchasedTickets.filter(ticket => 
        ticket.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.user_email.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredPurchasedTickets(filtered);
    }
  }, [searchTerm, purchasedTickets]);

  // Filtrar tickets gratuitos por búsqueda
  useEffect(() => {
    if (!freeTicketsSearchTerm.trim()) {
      setFilteredFreeTickets(freeTickets);
    } else {
      const filtered = freeTickets.filter(ticket => 
        ticket.sender_email.toLowerCase().includes(freeTicketsSearchTerm.toLowerCase()) ||
        ticket.receiver_name.toLowerCase().includes(freeTicketsSearchTerm.toLowerCase()) ||
        ticket.receiver_email.toLowerCase().includes(freeTicketsSearchTerm.toLowerCase()) ||
        ticket.ticket_type.toLowerCase().includes(freeTicketsSearchTerm.toLowerCase())
      );
      setFilteredFreeTickets(filtered);
    }
  }, [freeTicketsSearchTerm, freeTickets]);

  // Filtrar RRPPs detallados por búsqueda
  useEffect(() => {
    if (!rrppSearchTerm.trim()) {
      setFilteredRrppDetailed(rrppDetailed);
    } else {
      const filtered = rrppDetailed.filter(rrpp => 
        rrpp.rrppName.toLowerCase().includes(rrppSearchTerm.toLowerCase()) ||
        rrpp.ticketsByType.some(ticket => 
          ticket.ticketType.toLowerCase().includes(rrppSearchTerm.toLowerCase())
        )
      );
      setFilteredRrppDetailed(filtered);
    }
  }, [rrppSearchTerm, rrppDetailed]);

  const toggleRrppExpanded = (rrppCode: string) => {
    setExpandedRrpps(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rrppCode)) {
        newSet.delete(rrppCode);
      } else {
        newSet.add(rrppCode);
      }
      return newSet;
    });
  };

  const toggleRrppRowExpanded = (rrppCode: string) => {
    setExpandedRrppRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rrppCode)) {
        newSet.delete(rrppCode);
      } else {
        newSet.add(rrppCode);
      }
      return newSet;
    });
  };

  // Función para crear vista detallada con todos los tipos de tickets
  const createDetailedRrppView = (rrppStats: RRPPVenta[], rrppDetailed: RRPPDetailed[]) => {
    return rrppStats.map(stat => {
      const detailedData = rrppDetailed.find(d => d.rrppName === stat.rrpp);
      
      // Crear mapa de ventas existentes por tipo de ticket
      const soldByType = new Map<string, {ticketsSold: number, totalSales: number}>();
      if (detailedData) {
        detailedData.ticketsByType.forEach(tt => {
          soldByType.set(tt.ticketType, {
            ticketsSold: tt.ticketsSold,
            totalSales: tt.totalSales
          });
        });
      }

      // Crear lista completa incluyendo tickets con 0 ventas
      const allTicketDetails = allTicketTypes.map(ticketType => {
        const sold = soldByType.get(ticketType.type) || { ticketsSold: 0, totalSales: 0 };
        return {
          ticketType: ticketType.type,
          ticketsSold: sold.ticketsSold,
          totalSales: sold.totalSales
        };
      });

      return {
        ...stat,
        ticketDetails: allTicketDetails
      };
    });
  };

  const calculateMostSoldTicket = (allTickets: any[]) => {
    if (!allTickets || allTickets.length === 0) {
      setMostSoldTicket({type: 'N/A', quantity: 0});
      return;
    }

    // Ticket más vendido: contar ventas por tipo de ticket
    const salesByType = new Map<string, number>();
    allTickets.forEach(ticket => {
      const ticketType = Array.isArray(ticket.ticket_types) 
        ? ticket.ticket_types[0]?.type || 'Desconocido'
        : ticket.ticket_types?.type || 'Desconocido';
      
      const currentCount = salesByType.get(ticketType) || 0;
      salesByType.set(ticketType, currentCount + ticket.quantity);
    });

    // Encontrar el tipo con más ventas
    let mostSold = {type: 'N/A', quantity: 0};
    for (const [type, quantity] of salesByType.entries()) {
      if (quantity > mostSold.quantity) {
        mostSold = {type, quantity};
      }
    }
    setMostSoldTicket(mostSold);
  };

  const calculateAdvancedMetrics = (allTickets: any[], event: EventDetail) => {
    if (!allTickets || allTickets.length === 0) {
      setSalesVelocity(0);
      setAvgAdvanceTime(0);
      setAvgTicketPrice(0);
      setProjectedRevenue(0);
      setNoShowRate(0);
      return;
    }

    const eventDate = new Date(event.date + 'T' + event.time);
    const now = new Date();
    const totalTickets = allTickets.reduce((sum, t) => sum + t.quantity, 0);
    const totalRevenue = allTickets.reduce((sum, t) => sum + t.total_price, 0);

    // Sales Velocity: entradas vendidas por día/semana desde que se abrió la venta
    const firstSale = allTickets.length > 0 ? new Date(Math.min(...allTickets.map(t => new Date(t.purchase_date).getTime()))) : now;
    const daysSinceFirstSale = Math.max(1, Math.ceil((now.getTime() - firstSale.getTime()) / (1000 * 60 * 60 * 24)));
    const weeksSinceFirstSale = Math.max(1, Math.ceil(daysSinceFirstSale / 7));
    
    const velocityPerDay = totalTickets / daysSinceFirstSale;
    const velocityPerWeek = totalTickets / weeksSinceFirstSale;
    setSalesVelocity(salesVelocityPeriod === 'day' ? velocityPerDay : velocityPerWeek);

    // Tiempo promedio de venta anticipada: promedio de días entre compra y evento
    const advanceTimes = allTickets.map(t => {
      const purchaseDate = new Date(t.purchase_date);
      return Math.max(0, Math.ceil((eventDate.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24)));
    });
    const avgAdvance = advanceTimes.reduce((sum, days) => sum + days, 0) / advanceTimes.length;
    setAvgAdvanceTime(avgAdvance || 0);

    // Ticket promedio: total recaudado / entradas vendidas
    setAvgTicketPrice(totalTickets > 0 ? totalRevenue / totalTickets : 0);

    // Ingreso total proyectado: estimación basada en ritmo actual y tiempo restante
    const daysUntilEvent = Math.max(0, Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    const projectedTicketsFromVelocity = velocityPerDay * daysUntilEvent;
    const avgTicketValue = totalTickets > 0 ? totalRevenue / totalTickets : 0;
    const projectedAdditionalRevenue = projectedTicketsFromVelocity * avgTicketValue;
    setProjectedRevenue(totalRevenue + projectedAdditionalRevenue);

    // Tasa de no-show: porcentaje de tickets con payment_status=1 y active=true
    const activeTickets = allTickets.filter(t => t.payment_status === 1 && t.active === true);
    const activeTicketCount = activeTickets.reduce((sum, t) => sum + t.quantity, 0);
    setNoShowRate(totalTickets > 0 ? (activeTicketCount / totalTickets) * 100 : 0);
  };

  const generateSalesChartData = (allTickets: any[], event: EventDetail) => {
    if (!allTickets || allTickets.length === 0) {
      setSalesChartData([]);
      return;
    }

    // Filtrar tickets por tipo si se selecciona uno específico
    let filteredTickets = allTickets;
    if (selectedTicketType !== 'all') {
      filteredTickets = allTickets.filter(t => 
        Array.isArray(t.ticket_types) 
          ? t.ticket_types[0]?.type === selectedTicketType
          : t.ticket_types?.type === selectedTicketType
      );
    }

    // Agrupar ventas por período
    const salesByPeriod = new Map<string, { tickets: number; revenue: number }>();
    
    filteredTickets.forEach(ticket => {
      const purchaseDate = new Date(ticket.purchase_date);
      let periodKey = '';
      
      switch (salesChartPeriod) {
        case 'day':
          periodKey = purchaseDate.toISOString().split('T')[0]; // YYYY-MM-DD
          break;
        case 'week':
          const startOfWeek = new Date(purchaseDate);
          startOfWeek.setDate(purchaseDate.getDate() - purchaseDate.getDay());
          periodKey = startOfWeek.toISOString().split('T')[0];
          break;
        case 'month':
          periodKey = `${purchaseDate.getFullYear()}-${String(purchaseDate.getMonth() + 1).padStart(2, '0')}`;
          break;
      }
      
      const existing = salesByPeriod.get(periodKey) || { tickets: 0, revenue: 0 };
      existing.tickets += ticket.quantity || 0;
      existing.revenue += ticket.total_price || 0;
      salesByPeriod.set(periodKey, existing);
    });

    // Convertir a array y ordenar por fecha
    const chartData = Array.from(salesByPeriod.entries())
      .map(([period, data]) => ({
        period,
        tickets: data.tickets,
        revenue: data.revenue,
        displayPeriod: formatPeriodForDisplay(period, salesChartPeriod)
      }))
      .sort((a, b) => a.period.localeCompare(b.period));

    setSalesChartData(chartData);
  };

  const formatPeriodForDisplay = (period: string, periodType: 'day' | 'week' | 'month') => {
    const date = new Date(period);
    
    switch (periodType) {
      case 'day':
        return date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
      case 'week':
        const endOfWeek = new Date(date);
        endOfWeek.setDate(date.getDate() + 6);
        return `${date.getDate()}/${date.getMonth() + 1} - ${endOfWeek.getDate()}/${endOfWeek.getMonth() + 1}`;
      case 'month':
        return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'short' });
      default:
        return period;
    }
  };

  const loadEvent = async () => {
    if (!user?.id || !id) return;
    setLoading(true);
    
    // Cargar evento
    const { data: event, error } = await supabase
      .from('events')
      .select('id, name, description, date, time, location, ticket_types (id, type, description, price, quantity, active)')
      .eq('id', id).eq('creator_id', user.id).single();
    
    if (error || !event) { 
      setLoading(false); 
      return; 
    }
    
    setEvento(event);
    
    // Cargar todos los tipos de tickets del evento (para el detalle expandible)
    const allTicketTypesData = event.ticket_types || [];
    setAllTicketTypes(allTicketTypesData.map(tt => ({ id: tt.id, type: tt.type })));
    
    const ids = event.ticket_types.map(t => t.id);
    
    // Cargar ventas confirmadas (payment_status = 1) con información del tipo de ticket
    const { data: ventas } = await supabase.from('purchased_tickets')
      .select(`
        rrpp, 
        quantity, 
        total_price, 
        ticket_type_id, 
        active,
        ticket_types!inner(type)
      `)
      .eq('payment_status', 1)
      .not('payment_id', 'is', null)
      .in('ticket_type_id', ids);
      
    
    // Cargar datos completos de tickets comprados para la tabla
    const { data: allTickets } = await supabase
      .from('purchased_tickets')
      .select(`
        id,
        quantity,
        total_price,
        purchase_date,
        payment_status,
        active,
        user_emails!inner(full_name, email),
        ticket_types!inner(type)
      `)
      .eq('payment_status', 1)
      .not('payment_id', 'is', null)
      .in('ticket_type_id', ids)
      .order('purchase_date', { ascending: false });
    
    if (allTickets) {
      const purchasedData = allTickets.map(ticket => ({
        id: ticket.id,
        user_name: Array.isArray(ticket.user_emails) ? (ticket.user_emails[0] as any)?.full_name || 'N/A' : (ticket.user_emails as any)?.full_name || 'N/A',
        user_email: Array.isArray(ticket.user_emails) ? (ticket.user_emails[0] as any)?.email || 'N/A' : (ticket.user_emails as any)?.email || 'N/A',
        ticket_type: Array.isArray(ticket.ticket_types) ? (ticket.ticket_types[0] as any)?.type || 'N/A' : (ticket.ticket_types as any)?.type || 'N/A',
        quantity: ticket.quantity || 0,
        total_price: ticket.total_price || 0,
        purchase_date: ticket.purchase_date,
        payment_status: ticket.payment_status,
        active: ticket.active
      }));
      setPurchasedTickets(purchasedData);
      setFilteredPurchasedTickets(purchasedData);
    }

    // Cargar tickets gratuitos emitidos (total_price = 0 y payment_status = 1)
    const { data: freeTicketsData } = await supabase
      .from('purchased_tickets')
      .select(`
        id,
        quantity,
        purchase_date,
        email,
        rrpp,
        user_emails!inner(full_name, email),
        ticket_types!inner(type)
      `)
      .eq('payment_status', 1)
      .eq('total_price', 0)
      .in('ticket_type_id', ids)
      .order('purchase_date', { ascending: false });

    // Obtener nombres de RRPPs para los tickets gratuitos
    const rrppCodes = freeTicketsData?.map(t => t.rrpp).filter(Boolean) || [];
    let rrppNames = new Map<string, string>();
    
    if (rrppCodes.length > 0) {
      const { data: rrppData } = await supabase
        .from('rrpp')
        .select('codigo, nombre')
        .in('codigo', rrppCodes);
      
      if (rrppData) {
        rrppData.forEach(rrpp => rrppNames.set(rrpp.codigo, rrpp.nombre));
      }
    }

    if (freeTicketsData) {
      const freeTicketsMapped = freeTicketsData.map(ticket => ({
        id: ticket.id,
        sender_email: ticket.rrpp 
          ? `RRPP: ${rrppNames.get(ticket.rrpp) || ticket.rrpp}` 
          : (ticket.email || 'Sistema'),
        receiver_name: Array.isArray(ticket.user_emails) ? (ticket.user_emails[0] as any)?.full_name || 'N/A' : (ticket.user_emails as any)?.full_name || 'N/A',
        receiver_email: Array.isArray(ticket.user_emails) ? (ticket.user_emails[0] as any)?.email || 'N/A' : (ticket.user_emails as any)?.email || 'N/A',
        ticket_type: Array.isArray(ticket.ticket_types) ? (ticket.ticket_types[0] as any)?.type || 'N/A' : (ticket.ticket_types as any)?.type || 'N/A',
        quantity: ticket.quantity || 0,
        issue_date: ticket.purchase_date
      }));
      setFreeTickets(freeTicketsMapped);
      setFilteredFreeTickets(freeTicketsMapped);
    }
    
    // Calcular estadísticas de RRPP - incluir todos los RRPPs asignados
    // 1. Obtener todos los RRPPs asignados al evento
    const { data: assignedRrpps, error: rrppError } = await supabase
      .from('profile_events')
      .select(`
        rrpp_id,
        rrpp!inner(codigo, nombre)
      `)
      .eq('event_id', id)
      .eq('activo', true);

    if (!rrppError && assignedRrpps) {
      // 2. Inicializar mapa con todos los RRPPs asignados (valores en 0)
      const map = new Map<string, RRPPVenta>();
      assignedRrpps.forEach(assignment => {
        const rrppData = Array.isArray(assignment.rrpp) ? assignment.rrpp[0] : assignment.rrpp;
        if (rrppData) {
          map.set(rrppData.codigo, {
            rrpp: rrppData.nombre,
            totalSales: 0,
            ticketsSold: 0
          });
        }
      });

      // 3. Actualizar con datos reales de ventas
      if (ventas) {
        ventas.forEach(v => { 
          if (!v.rrpp || !map.has(v.rrpp)) return; 
          const e = map.get(v.rrpp)!; 
          e.totalSales += v.total_price || 0; 
          e.ticketsSold += v.quantity || 0; 
          map.set(v.rrpp, e); 
        });
      }

      // 4. Convertir a array y establecer estado
      setRrppStats(Array.from(map.values()));

      // Calcular datos detallados de RRPP por tipo de entrada
      const detailedMap = new Map<string, RRPPDetailed>();
      
      // Inicializar todos los RRPPs asignados en el detailedMap
      assignedRrpps.forEach(assignment => {
        const rrppData = Array.isArray(assignment.rrpp) ? assignment.rrpp[0] : assignment.rrpp;
        if (rrppData) {
          detailedMap.set(rrppData.codigo, {
            rrpp: rrppData.codigo,
            rrppName: rrppData.nombre,
            totalSales: 0,
            totalTicketsSold: 0,
            ticketsByType: []
          });
        }
      });

      // Actualizar con datos reales de ventas
      if (ventas) {
        ventas.forEach(v => {
          if (!v.rrpp || !detailedMap.has(v.rrpp)) return;
          
          const rrppCode = v.rrpp;
          const ticketType = Array.isArray(v.ticket_types) ? (v.ticket_types[0] as any)?.type || 'Desconocido' : (v.ticket_types as any)?.type || 'Desconocido';
          
          const rrppData = detailedMap.get(rrppCode)!;
          rrppData.totalSales += v.total_price || 0;
          rrppData.totalTicketsSold += v.quantity || 0;
          
          // Buscar si ya existe el tipo de ticket
        let ticketTypeData = rrppData.ticketsByType.find(t => t.ticketType === ticketType);
        if (!ticketTypeData) {
          ticketTypeData = { ticketType, ticketsSold: 0, totalSales: 0 };
          rrppData.ticketsByType.push(ticketTypeData);
        }
        
        ticketTypeData.ticketsSold += v.quantity || 0;
        ticketTypeData.totalSales += v.total_price || 0;
        });
      }

      const detailedData = Array.from(detailedMap.values());
      setRrppDetailed(detailedData);
      setFilteredRrppDetailed(detailedData);
    }
    
    // Calcular tickets escaneados (active = false)
    const scannedTickets = ventas?.filter(v => v.active === false).reduce((sum, v) => sum + (v.quantity || 0), 0) || 0;
    setTotalScannedTickets(scannedTickets);
    
    // Calcular estadísticas por tipo de ticket
    setTicketStats(event.ticket_types.map(tt => {
      const sold = (ventas?.filter(v => v.ticket_type_id === tt.id).reduce((s, v) => s + (v.quantity||0), 0)) || 0;
      const sales = (ventas?.filter(v => v.ticket_type_id === tt.id).reduce((s, v) => s + (v.total_price||0), 0)) || 0;
      const perc = tt.quantity ? Math.min((sold/tt.quantity)*100, 100) : 0;
      return { id: tt.id, type: tt.type, ticketsSold: sold, totalSales: sales, quantity: tt.quantity, percentSold: perc };
    }));
    
    // Calcular nuevas métricas
    calculateAdvancedMetrics(allTickets || [], event);
    
    // Calcular ticket más vendido (independiente de velocity period)
    calculateMostSoldTicket(allTickets || []);
    
    // Generar datos del gráfico de ventas
    generateSalesChartData(allTickets || [], event);
    
    setLoading(false);
  };

  useEffect(() => { loadEvent(); }, [user, id]);

  // Recalcular sales velocity cuando cambie el período
  useEffect(() => {
    if (purchasedTickets.length > 0 && evento) {
      calculateAdvancedMetrics(purchasedTickets, evento);
      // NO recalcular most sold ticket aquí - se mantiene independiente
    }
  }, [salesVelocityPeriod]);

  // Regenerar datos del gráfico y recalcular métricas cuando cambien los filtros
  useEffect(() => {
    if (purchasedTickets.length > 0 && evento) {
      generateSalesChartData(purchasedTickets, evento);
      // También recalcular métricas cuando cambia el filtro de tipo de entrada
      calculateAdvancedMetrics(purchasedTickets, evento);
      // Recalcular most sold ticket solo cuando cambian los datos reales
      if (selectedTicketType === 'all') {
        // Solo recalcular si mostramos todos los tipos
        calculateMostSoldTicket(purchasedTickets);
      }
    }
  }, [salesChartPeriod, selectedTicketType]);

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

  // Funciones de descarga
  const downloadRRPPDataCSV = () => {
    const csvData = rrppStats.map(rrpp => ({
      'RRPP': rrpp.rrpp,
      'Entradas Vendidas': rrpp.ticketsSold,
      'Total Ventas ($)': rrpp.totalSales.toFixed(2)
    }));
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${evento?.name}_rrpp_data.csv`;
    link.click();
  };

  const downloadRRPPDataPDF = () => {
    const doc = new jsPDF();
    doc.text(`Reporte de RRPPs - ${evento?.name}`, 20, 20);
    
    const tableColumn = ['RRPP', 'Entradas Vendidas', 'Total Ventas ($)'];
    const tableRows = rrppStats.map(rrpp => [
      rrpp.rrpp,
      rrpp.ticketsSold.toString(),
      `$${rrpp.totalSales.toFixed(2)}`
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 30,
    });

    doc.save(`${evento?.name}_rrpp_data.pdf`);
  };

  const downloadTicketsDataCSV = () => {
    const csvData = purchasedTickets.map(ticket => ({
      'Usuario': ticket.user_name,
      'Email': ticket.user_email,
      'Tipo de Entrada': ticket.ticket_type,
      'Cantidad': ticket.quantity,
      'Precio Total ($)': ticket.total_price.toFixed(2),
      'Fecha de Compra': new Date(ticket.purchase_date).toLocaleDateString('es-ES'),
      'Estado': ticket.active ? 'Activo' : 'Escaneado'
    }));
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${evento?.name}_tickets_vendidos.csv`;
    link.click();
  };

  const downloadTicketsDataPDF = () => {
    const doc = new jsPDF();
    doc.text(`Tickets Vendidos - ${evento?.name}`, 20, 20);
    
    const tableColumn = ['Usuario', 'Email', 'Tipo', 'Cant.', 'Total ($)', 'Fecha', 'Estado'];
    const tableRows = filteredPurchasedTickets.map(ticket => [
      ticket.user_name,
      ticket.user_email,
      ticket.ticket_type,
      ticket.quantity.toString(),
      `$${ticket.total_price.toFixed(2)}`,
      new Date(ticket.purchase_date).toLocaleDateString('es-ES'),
      ticket.active ? 'Activo' : 'Escaneado'
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 30,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [255, 87, 34] }
    });

    doc.save(`${evento?.name}_tickets_vendidos.pdf`);
  };

  const downloadFreeTicketsDataCSV = () => {
    const csvData = filteredFreeTickets.map(ticket => ({
      'Enviado por': ticket.sender_email,
      'Receptor': ticket.receiver_name,
      'Email Receptor': ticket.receiver_email,
      'Tipo de Entrada': ticket.ticket_type,
      'Cantidad': ticket.quantity,
      'Fecha de Emisión': new Date(ticket.issue_date).toLocaleDateString('es-ES')
    }));
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${evento?.name}_tickets_gratuitos.csv`;
    link.click();
  };

  const downloadFreeTicketsDataPDF = () => {
    const doc = new jsPDF();
    doc.text(`Tickets Gratuitos - ${evento?.name}`, 20, 20);
    
    const tableColumn = ['Enviado por', 'Receptor', 'Email Receptor', 'Tipo', 'Cant.', 'Fecha'];
    const tableRows = filteredFreeTickets.map(ticket => [
      ticket.sender_email,
      ticket.receiver_name,
      ticket.receiver_email,
      ticket.ticket_type,
      ticket.quantity.toString(),
      new Date(ticket.issue_date).toLocaleDateString('es-ES')
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 30,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [255, 87, 34] }
    });

    doc.save(`${evento?.name}_tickets_gratuitos.pdf`);
  };

  const downloadRRPPDetailedDataCSV = () => {
    const csvData: any[] = [];
    filteredRrppDetailed.forEach(rrpp => {
      // Fila principal del RRPP
      csvData.push({
        'RRPP': rrpp.rrppName,
        'Tipo de Entrada': 'TOTAL',
        'Entradas Vendidas': rrpp.totalTicketsSold,
        'Total Ventas ($)': rrpp.totalSales.toFixed(2)
      });
      
      // Subfils por tipo de entrada
      rrpp.ticketsByType.forEach(ticketType => {
        csvData.push({
          'RRPP': `  └─ ${rrpp.rrppName}`,
          'Tipo de Entrada': ticketType.ticketType,
          'Entradas Vendidas': ticketType.ticketsSold,
          'Total Ventas ($)': ticketType.totalSales.toFixed(2)
        });
      });
    });
    
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${evento?.name}_rrpp_detallado.csv`;
    link.click();
  };

  const downloadRRPPDetailedDataPDF = () => {
    const doc = new jsPDF();
    doc.text(`Reporte Detallado de RRPPs - ${evento?.name}`, 20, 20);
    
    const tableData: any[] = [];
    filteredRrppDetailed.forEach(rrpp => {
      // Fila principal del RRPP
      tableData.push([
        rrpp.rrppName,
        'TOTAL',
        rrpp.totalTicketsSold.toString(),
        `$${rrpp.totalSales.toFixed(2)}`
      ]);
      
      // Subfilas por tipo de entrada
      rrpp.ticketsByType.forEach(ticketType => {
        tableData.push([
          `  └─ ${ticketType.ticketType}`,
          '',
          ticketType.ticketsSold.toString(),
          `$${ticketType.totalSales.toFixed(2)}`
        ]);
      });
    });

    autoTable(doc, {
      head: [['RRPP', 'Tipo', 'Entradas', 'Ventas ($)']],
      body: tableData,
      startY: 30,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [255, 87, 34] }
    });

    doc.save(`${evento?.name}_rrpp_detallado.pdf`);
  };

  if (loading) {
    return (
      <div className="bg-[#2a2a2a]">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FF5722]"></div>
        </div>
      </div>
    );
  }

  if (!evento) {
    return (
      <div className="bg-[#2a2a2a] min-h-[calc(100vh-8rem)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded">
            Evento no encontrado o sin acceso.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#2a2a2a]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-[#1f1f1f] shadow rounded-lg border border-gray-700">
          {/* Header del evento */}
          <div className="px-4 py-5 sm:px-6">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-6 w-6 text-[#FF5722]" />
              <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Anton' }}>
                {evento.name}
              </h2>
            </div>
            <p className="mt-2 text-gray-400" style={{ fontFamily: 'Inter, sans-serif' }}>
              {evento.description}
            </p>
          </div>

          <div className="border-t border-gray-700">
            <div className="px-4 py-5 sm:p-6">
              {/* Información básica del evento */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-[#111111] p-4 rounded-lg border border-gray-600">
                  <div className="flex items-center space-x-2 mb-2">
                    <Calendar className="h-5 w-5 text-[#FF5722]" />
                    <h3 className="text-lg font-medium text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
                      Fecha y Hora
                    </h3>
                  </div>
                  <p className="text-gray-300" style={{ fontFamily: 'Inter, sans-serif' }}>
                    {evento.date} - {evento.time}
                  </p>
                </div>
                
                <div className="bg-[#111111] p-4 rounded-lg border border-gray-600">
                  <div className="flex items-center space-x-2 mb-2">
                    <MapPin className="h-5 w-5 text-[#FF5722]" />
                    <h3 className="text-lg font-medium text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
                      Ubicación
                    </h3>
                  </div>
                  <p className="text-gray-300" style={{ fontFamily: 'Inter, sans-serif' }}>
                    {evento.location}
                  </p>
                </div>
              </div>

              {/* Estadísticas totales del evento */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5 text-[#FF5722]" />
                    <h3 className="text-lg font-medium text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
                      Resumen General del Evento
                    </h3>
                  </div>
                  <a
                    href={`/evento/${evento.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 px-4 py-2 bg-[#FF5722] text-white rounded-lg hover:bg-opacity-90 transition-colors"
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  >
                    <Eye className="h-4 w-4" />
                    <span>Ver Evento Público</span>
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-7 gap-4 mb-6">
                  <div className="bg-[#111111] p-4 rounded-lg border border-gray-600">
                    <div className="flex items-center space-x-2 mb-2">
                      <Users className="h-4 w-4 text-[#FF5722]" />
                      <span className="text-sm text-gray-400" style={{ fontFamily: 'Inter, sans-serif' }}>
                        Total Vendidas
                      </span>
                    </div>
                    <p className="text-xl font-bold text-white" style={{ fontFamily: 'Anton' }}>
                      {ticketStats.reduce((sum, t) => sum + t.ticketsSold, 0)}
                    </p>
                    <p className="text-xs text-gray-500" style={{ fontFamily: 'Inter, sans-serif' }}>
                      de {ticketStats.reduce((sum, t) => sum + t.quantity, 0)} disponibles
                    </p>
                  </div>
                  
                  <div className="bg-[#111111] p-4 rounded-lg border border-gray-600">
                    <div className="flex items-center space-x-2 mb-2">
                      <Ticket className="h-4 w-4 text-[#FF5722]" />
                      <span className="text-sm text-gray-400" style={{ fontFamily: 'Inter, sans-serif' }}>
                        Tickets Totales
                      </span>
                    </div>
                    <p className="text-xl font-bold text-white" style={{ fontFamily: 'Anton' }}>
                      {ticketStats.reduce((sum, t) => sum + t.ticketsSold, 0) + freeTickets.reduce((sum, ticket) => sum + ticket.quantity, 0)}
                    </p>
                    <p className="text-xs text-gray-500" style={{ fontFamily: 'Inter, sans-serif' }}>
                      vendidos + gratuitos
                    </p>
                  </div>
                  
                  <div className="bg-[#111111] p-4 rounded-lg border border-gray-600">
                    <div className="flex items-center space-x-2 mb-2">
                      <DollarSign className="h-4 w-4 text-[#FF5722]" />
                      <span className="text-sm text-gray-400" style={{ fontFamily: 'Inter, sans-serif' }}>
                        Ingresos Totales
                      </span>
                    </div>
                    <p className="text-xl font-bold text-white" style={{ fontFamily: 'Anton' }}>
                      ${ticketStats.reduce((sum, t) => sum + t.totalSales, 0).toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500" style={{ fontFamily: 'Inter, sans-serif' }}>
                      recaudados hasta ahora
                    </p>
                  </div>

                  <div className="bg-[#111111] p-4 rounded-lg border border-gray-600">
                    <div className="flex items-center space-x-2 mb-2">
                      <CheckCircle className="h-4 w-4 text-[#FF5722]" />
                      <span className="text-sm text-gray-400" style={{ fontFamily: 'Inter, sans-serif' }}>
                        Tickets Escaneados
                      </span>
                    </div>
                    <p className="text-xl font-bold text-white" style={{ fontFamily: 'Anton' }}>
                      {totalScannedTickets}
                    </p>
                    <p className="text-xs text-gray-500" style={{ fontFamily: 'Inter, sans-serif' }}>
                      ingresados al evento
                    </p>
                  </div>
                  
                  <div className="bg-[#111111] p-4 rounded-lg border border-gray-600">
                    <div className="flex items-center space-x-2 mb-2">
                      <Percent className="h-4 w-4 text-[#FF5722]" />
                      <span className="text-sm text-gray-400" style={{ fontFamily: 'Inter, sans-serif' }}>
                        Ocupación General
                      </span>
                    </div>
                    <p className="text-xl font-bold text-white" style={{ fontFamily: 'Anton' }}>
                      {totalScannedTickets > 0 && ticketStats.reduce((sum, t) => sum + t.ticketsSold, 0) > 0 ? 
                        ((totalScannedTickets / ticketStats.reduce((sum, t) => sum + t.ticketsSold, 0)) * 100).toFixed(1)
                        : '0.0'}%
                    </p>
                    <p className="text-xs text-gray-500" style={{ fontFamily: 'Inter, sans-serif' }}>
                      escaneados vs vendidos
                    </p>
                  </div>
                  
                  <div className="bg-[#111111] p-4 rounded-lg border border-gray-600">
                    <div className="flex items-center space-x-2 mb-2">
                      <Gift className="h-4 w-4 text-[#FF5722]" />
                      <span className="text-sm text-gray-400" style={{ fontFamily: 'Inter, sans-serif' }}>
                        Tickets Gratuitos
                      </span>
                    </div>
                    <p className="text-xl font-bold text-white" style={{ fontFamily: 'Anton' }}>
                      {freeTickets.reduce((sum, ticket) => sum + ticket.quantity, 0)}
                    </p>
                    <p className="text-xs text-gray-500" style={{ fontFamily: 'Inter, sans-serif' }}>
                      emitidos gratuitamente
                    </p>
                  </div>
                  
                  <div className="bg-[#111111] p-4 rounded-lg border border-gray-600">
                    <div className="flex items-center space-x-2 mb-2">
                      <Ticket className="h-4 w-4 text-[#FF5722]" />
                      <span className="text-sm text-gray-400" style={{ fontFamily: 'Inter, sans-serif' }}>
                        Tipos de Entrada
                      </span>
                    </div>
                    <p className="text-xl font-bold text-white" style={{ fontFamily: 'Anton' }}>
                      {ticketStats.length}
                    </p>
                    <p className="text-xs text-gray-500" style={{ fontFamily: 'Inter, sans-serif' }}>
                      tipos disponibles
                    </p>
                  </div>
                </div>
              </div>

              {/* Métricas Avanzadas del Evento */}
              <div className="mb-8">
                <div className="flex items-center space-x-2 mb-6">
                  <Activity className="h-5 w-5 text-[#FF5722]" />
                  <h3 className="text-lg font-medium text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
                    Métricas Avanzadas
                  </h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  {/* Sales Velocity */}
                  <div className="bg-[#111111] p-4 rounded-lg border border-gray-600">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="h-4 w-4 text-[#FF5722]" />
                        <span className="text-sm text-gray-400" style={{ fontFamily: 'Inter, sans-serif' }}>
                          Sales Velocity
                        </span>
                      </div>
                      <div className="flex bg-[#1f1f1f] rounded-lg p-1">
                        <button
                          onClick={() => setSalesVelocityPeriod('day')}
                          className={`px-2 py-1 text-xs rounded ${
                            salesVelocityPeriod === 'day' 
                              ? 'bg-[#FF5722] text-white' 
                              : 'text-gray-400 hover:text-white'
                          } transition-colors`}
                          style={{ fontFamily: 'Inter, sans-serif' }}
                        >
                          Día
                        </button>
                        <button
                          onClick={() => setSalesVelocityPeriod('week')}
                          className={`px-2 py-1 text-xs rounded ${
                            salesVelocityPeriod === 'week' 
                              ? 'bg-[#FF5722] text-white' 
                              : 'text-gray-400 hover:text-white'
                          } transition-colors`}
                          style={{ fontFamily: 'Inter, sans-serif' }}
                        >
                          Semana
                        </button>
                      </div>
                    </div>
                    <p className="text-xl font-bold text-white" style={{ fontFamily: 'Anton' }}>
                      {salesVelocity.toFixed(1)}
                    </p>
                    <p className="text-xs text-gray-500" style={{ fontFamily: 'Inter, sans-serif' }}>
                      entradas por {salesVelocityPeriod === 'day' ? 'día' : 'semana'}
                    </p>
                  </div>

                  {/* Tiempo promedio de venta anticipada */}
                  <div className="bg-[#111111] p-4 rounded-lg border border-gray-600">
                    <div className="flex items-center space-x-2 mb-2">
                      <Clock className="h-4 w-4 text-[#FF5722]" />
                      <span className="text-sm text-gray-400" style={{ fontFamily: 'Inter, sans-serif' }}>
                        Venta Anticipada
                      </span>
                    </div>
                    <p className="text-xl font-bold text-white" style={{ fontFamily: 'Anton' }}>
                      {avgAdvanceTime.toFixed(0)}
                    </p>
                    <p className="text-xs text-gray-500" style={{ fontFamily: 'Inter, sans-serif' }}>
                      días promedio de anticipación
                    </p>
                  </div>

                  {/* Ticket promedio */}
                  <div className="bg-[#111111] p-4 rounded-lg border border-gray-600">
                    <div className="flex items-center space-x-2 mb-2">
                      <DollarSign className="h-4 w-4 text-[#FF5722]" />
                      <span className="text-sm text-gray-400" style={{ fontFamily: 'Inter, sans-serif' }}>
                        Ticket Promedio
                      </span>
                    </div>
                    <p className="text-xl font-bold text-white" style={{ fontFamily: 'Anton' }}>
                      ${avgTicketPrice.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500" style={{ fontFamily: 'Inter, sans-serif' }}>
                      precio promedio por entrada
                    </p>
                  </div>

                  {/* Ingreso total proyectado */}
                  <div className="bg-[#111111] p-4 rounded-lg border border-gray-600">
                    <div className="flex items-center space-x-2 mb-2">
                      <TrendingUp className="h-4 w-4 text-[#FF5722]" />
                      <span className="text-sm text-gray-400" style={{ fontFamily: 'Inter, sans-serif' }}>
                        Ingreso Proyectado
                      </span>
                    </div>
                    <p className="text-xl font-bold text-white" style={{ fontFamily: 'Anton' }}>
                      ${projectedRevenue.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500" style={{ fontFamily: 'Inter, sans-serif' }}>
                      estimación no precisa*
                    </p>
                  </div>

                  {/* Tasa de no-show */}
                  <div className="bg-[#111111] p-4 rounded-lg border border-gray-600">
                    <div className="flex items-center space-x-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-[#FF5722]" />
                      <span className="text-sm text-gray-400" style={{ fontFamily: 'Inter, sans-serif' }}>
                        Tasa de No-Show
                      </span>
                    </div>
                    <p className="text-xl font-bold text-white" style={{ fontFamily: 'Anton' }}>
                      {noShowRate.toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-500" style={{ fontFamily: 'Inter, sans-serif' }}>
                      tickets vendidos no escaneados
                    </p>
                  </div>

                  {/* Ticket más vendido */}
                  <div className="bg-[#111111] p-4 rounded-lg border border-gray-600">
                    <div className="flex items-center space-x-2 mb-2">
                      <TrendingUp className="h-4 w-4 text-[#FF5722]" />
                      <span className="text-sm text-gray-400" style={{ fontFamily: 'Inter, sans-serif' }}>
                        Ticket Más Vendido
                      </span>
                    </div>
                    <p className="text-lg font-bold text-white truncate" style={{ fontFamily: 'Anton' }} title={mostSoldTicket.type}>
                      {mostSoldTicket.type}
                    </p>
                    <p className="text-xs text-gray-500" style={{ fontFamily: 'Inter, sans-serif' }}>
                      {mostSoldTicket.quantity} entradas vendidas
                    </p>
                  </div>
                </div>

                <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-3">
                  <p className="text-yellow-300 text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
                    <strong>*Nota:</strong> El ingreso proyectado es una estimación basada en el ritmo de venta actual y se actualiza con más datos. No es una proyección precisa.
                  </p>
                </div>
              </div>

              {/* Métricas de tickets por tipo */}
              <div className="mb-8">
                <div className="flex items-center space-x-2 mb-6">
                  <Ticket className="h-5 w-5 text-[#FF5722]" />
                  <h3 className="text-lg font-medium text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
                    Estadísticas por Tipo de Entrada
                  </h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {ticketStats.map(t => (
                    <div key={t.id} className="bg-[#111111] p-6 rounded-lg border border-gray-600">
                      <h4 className="text-lg font-semibold text-white mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>
                        {t.type}
                      </h4>
                      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Users className="h-4 w-4 text-[#FF5722]" />
                            <span className="text-sm text-gray-400" style={{ fontFamily: 'Inter, sans-serif' }}>
                              Entradas Vendidas
                            </span>
                          </div>
                          <span className="text-white font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>
                            {t.ticketsSold}/{t.quantity}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <DollarSign className="h-4 w-4 text-[#FF5722]" />
                            <span className="text-sm text-gray-400" style={{ fontFamily: 'Inter, sans-serif' }}>
                              Ingresos Generados
                            </span>
                          </div>
                          <span className="text-white font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>
                            ${t.totalSales.toFixed(2)}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Percent className="h-4 w-4 text-[#FF5722]" />
                            <span className="text-sm text-gray-400" style={{ fontFamily: 'Inter, sans-serif' }}>
                              Porcentaje Vendido
                            </span>
                          </div>
                          <span className="text-white font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>
                            {t.percentSold.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Gráfico de Ventas por Período */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5 text-[#FF5722]" />
                    <h3 className="text-lg font-medium text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
                      Evolución de Ventas
                    </h3>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    {/* Selector de tipo de entrada */}
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-400" style={{ fontFamily: 'Inter, sans-serif' }}>
                        Tipo:
                      </span>
                      <select
                        value={selectedTicketType}
                        onChange={(e) => setSelectedTicketType(e.target.value)}
                        className="bg-[#1f1f1f] border border-gray-600 text-white rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF5722] focus:border-[#FF5722]"
                        style={{ fontFamily: 'Inter, sans-serif' }}
                      >
                        <option value="all">Todos los tipos</option>
                        {evento?.ticket_types?.map(tt => (
                          <option key={tt.id} value={tt.type}>{tt.type}</option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Toggle de período */}
                    <div className="flex bg-[#1f1f1f] rounded-lg p-1">
                      <button
                        onClick={() => setSalesChartPeriod('day')}
                        className={`px-3 py-1 text-xs rounded ${
                          salesChartPeriod === 'day' 
                            ? 'bg-[#FF5722] text-white' 
                            : 'text-gray-400 hover:text-white'
                        } transition-colors`}
                        style={{ fontFamily: 'Inter, sans-serif' }}
                      >
                        Día
                      </button>
                      <button
                        onClick={() => setSalesChartPeriod('week')}
                        className={`px-3 py-1 text-xs rounded ${
                          salesChartPeriod === 'week' 
                            ? 'bg-[#FF5722] text-white' 
                            : 'text-gray-400 hover:text-white'
                        } transition-colors`}
                        style={{ fontFamily: 'Inter, sans-serif' }}
                      >
                        Semana
                      </button>
                      <button
                        onClick={() => setSalesChartPeriod('month')}
                        className={`px-3 py-1 text-xs rounded ${
                          salesChartPeriod === 'month' 
                            ? 'bg-[#FF5722] text-white' 
                            : 'text-gray-400 hover:text-white'
                        } transition-colors`}
                        style={{ fontFamily: 'Inter, sans-serif' }}
                      >
                        Mes
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-[#111111] p-6 rounded-lg border border-gray-600">
                  {salesChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={400}>
                      <ComposedChart data={salesChartData}>
                        <CartesianGrid stroke="#374151" />
                        <XAxis 
                          dataKey="displayPeriod" 
                          stroke="#9CA3AF" 
                          style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px' }}
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        {/* Eje Y izquierdo para tickets */}
                        <YAxis 
                          yAxisId="tickets"
                          stroke="#FF5722" 
                          style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px' }}
                          label={{ value: 'Entradas', angle: -90, position: 'insideLeft' }}
                        />
                        {/* Eje Y derecho para revenue */}
                        <YAxis 
                          yAxisId="revenue"
                          orientation="right"
                          stroke="#56ae4a" 
                          style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px' }}
                          label={{ value: 'Ingresos ($)', angle: 90, position: 'insideRight' }}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#1f1f1f', 
                            border: '1px solid #374151', 
                            borderRadius: '8px',
                            color: '#fff',
                            fontFamily: 'Inter, sans-serif'
                          }}
                          formatter={(value, name) => [
                            name === 'tickets' ? `${value} entradas` : `$${Number(value).toFixed(2)}`,
                            name === 'tickets' ? 'Entradas Vendidas' : 'Ingresos'
                          ]}
                          labelFormatter={(label) => `Período: ${label}`}
                        />
                        <Legend 
                          wrapperStyle={{ 
                            fontFamily: 'Inter, sans-serif', 
                            fontSize: '14px' 
                          }}
                        />
                        <Bar 
                          yAxisId="tickets"
                          dataKey="tickets" 
                          fill="#FF5722" 
                          name="Entradas Vendidas" 
                          radius={[4, 4, 0, 0]}
                        />
                        <Line 
                          yAxisId="revenue"
                          type="monotone" 
                          dataKey="revenue" 
                          stroke="#56ae4a" 
                          strokeWidth={3}
                          name="Ingresos ($)" 
                          dot={{ fill: '#56ae4a', strokeWidth: 2, r: 4 }}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center py-12">
                      <TrendingUp className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                      <p className="text-gray-400" style={{ fontFamily: 'Inter, sans-serif' }}>
                        No hay datos de ventas disponibles para el período seleccionado
                      </p>
                      <p className="text-sm text-gray-500 mt-2" style={{ fontFamily: 'Inter, sans-serif' }}>
                        Los datos aparecerán cuando se registren ventas
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Componente de envío de entradas */}
              <SendEntryByEmail eventId={evento.id} />

              {/* Tabla de tickets vendidos */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-2">
                    <Table className="h-5 w-5 text-[#FF5722]" />
                    <h3 className="text-lg font-medium text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
                      Tickets Vendidos ({filteredPurchasedTickets.length})
                    </h3>
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={downloadTicketsDataCSV}
                      className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      style={{ fontFamily: 'Inter, sans-serif' }}
                    >
                      <FileSpreadsheet className="h-4 w-4" />
                      <span>CSV</span>
                    </button>
                    <button
                      onClick={downloadTicketsDataPDF}
                      className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      style={{ fontFamily: 'Inter, sans-serif' }}
                    >
                      <FileText className="h-4 w-4" />
                      <span>PDF</span>
                    </button>
                  </div>
                </div>

                {/* Buscador */}
                {purchasedTickets.length > 0 && (
                  <div className="mb-4">
                    <div className="relative max-w-md">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Buscar por nombre o email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 bg-[#1f1f1f] border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF5722] focus:border-[#FF5722]"
                        style={{ fontFamily: 'Inter, sans-serif' }}
                      />
                    </div>
                  </div>
                )}
                
                <div className="bg-[#111111] rounded-lg border border-gray-600 overflow-hidden">
                  {filteredPurchasedTickets.length > 0 ? (
                    <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                      <table className="min-w-full divide-y divide-gray-700">
                        <thead className="bg-[#1f1f1f] sticky top-0 z-10">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider" style={{ fontFamily: 'Inter, sans-serif' }}>
                              Usuario
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider" style={{ fontFamily: 'Inter, sans-serif' }}>
                              Email
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider" style={{ fontFamily: 'Inter, sans-serif' }}>
                              Tipo de Entrada
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider" style={{ fontFamily: 'Inter, sans-serif' }}>
                              Cantidad
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider" style={{ fontFamily: 'Inter, sans-serif' }}>
                              Total ($)
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider" style={{ fontFamily: 'Inter, sans-serif' }}>
                              Fecha
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider" style={{ fontFamily: 'Inter, sans-serif' }}>
                              Estado
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                          {filteredPurchasedTickets.map((ticket) => (
                            <tr key={ticket.id} className="hover:bg-[#1f1f1f] transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
                                  {ticket.user_name}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-300" style={{ fontFamily: 'Inter, sans-serif' }}>
                                  {ticket.user_email}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#FF5722]/20 text-[#FF5722]" style={{ fontFamily: 'Inter, sans-serif' }}>
                                  {ticket.ticket_type}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
                                  {ticket.quantity}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
                                  ${ticket.total_price.toFixed(2)}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-300" style={{ fontFamily: 'Inter, sans-serif' }}>
                                  {new Date(ticket.purchase_date).toLocaleDateString('es-ES')}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  ticket.active 
                                    ? 'bg-green-900/50 text-green-300' 
                                    : 'bg-red-900/50 text-red-300'
                                }`} style={{ fontFamily: 'Inter, sans-serif' }}>
                                  {ticket.active ? 'Activo' : 'Escaneado'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Table className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                      <p className="text-gray-400" style={{ fontFamily: 'Inter, sans-serif' }}>
                        No hay tickets vendidos para mostrar
                      </p>
                      <p className="text-sm text-gray-500 mt-2" style={{ fontFamily: 'Inter, sans-serif' }}>
                        Los tickets aparecerán cuando se confirmen las compras
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Tabla de tickets emitidos gratis */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-2">
                    <Gift className="h-5 w-5 text-[#FF5722]" />
                    <h3 className="text-lg font-medium text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
                      Tickets Gratuitos Emitidos ({filteredFreeTickets.length})
                    </h3>
                  </div>
                  {freeTickets.length > 0 && (
                    <div className="flex space-x-3">
                      <button
                        onClick={downloadFreeTicketsDataCSV}
                        className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        style={{ fontFamily: 'Inter, sans-serif' }}
                      >
                        <FileSpreadsheet className="h-4 w-4" />
                        <span>CSV</span>
                      </button>
                      <button
                        onClick={downloadFreeTicketsDataPDF}
                        className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        style={{ fontFamily: 'Inter, sans-serif' }}
                      >
                        <FileText className="h-4 w-4" />
                        <span>PDF</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Buscador para tickets gratuitos */}
                {freeTickets.length > 0 && (
                  <div className="mb-4">
                    <div className="relative max-w-md">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Buscar por remitente, receptor o tipo..."
                        value={freeTicketsSearchTerm}
                        onChange={(e) => setFreeTicketsSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 bg-[#1f1f1f] border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF5722] focus:border-[#FF5722]"
                        style={{ fontFamily: 'Inter, sans-serif' }}
                      />
                    </div>
                  </div>
                )}
                
                <div className="bg-[#111111] rounded-lg border border-gray-600 overflow-hidden">
                  {filteredFreeTickets.length > 0 ? (
                    <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                      <table className="min-w-full divide-y divide-gray-700">
                        <thead className="bg-[#1f1f1f] sticky top-0 z-10">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider" style={{ fontFamily: 'Inter, sans-serif' }}>
                              Enviado por
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider" style={{ fontFamily: 'Inter, sans-serif' }}>
                              Receptor
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider" style={{ fontFamily: 'Inter, sans-serif' }}>
                              Email Receptor
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider" style={{ fontFamily: 'Inter, sans-serif' }}>
                              Tipo de Entrada
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider" style={{ fontFamily: 'Inter, sans-serif' }}>
                              Cantidad
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider" style={{ fontFamily: 'Inter, sans-serif' }}>
                              Fecha de Emisión
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                          {filteredFreeTickets.map((ticket) => (
                            <tr key={ticket.id} className="hover:bg-[#1f1f1f] transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
                                  {ticket.sender_email}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-300" style={{ fontFamily: 'Inter, sans-serif' }}>
                                  {ticket.receiver_name}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-300" style={{ fontFamily: 'Inter, sans-serif' }}>
                                  {ticket.receiver_email}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900/50 text-green-300" style={{ fontFamily: 'Inter, sans-serif' }}>
                                  {ticket.ticket_type}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
                                  {ticket.quantity}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-300" style={{ fontFamily: 'Inter, sans-serif' }}>
                                  {new Date(ticket.issue_date).toLocaleDateString('es-ES')}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Gift className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                      <p className="text-gray-400" style={{ fontFamily: 'Inter, sans-serif' }}>
                        {freeTickets.length === 0 
                          ? 'No hay tickets gratuitos emitidos'
                          : 'No se encontraron tickets que coincidan con la búsqueda'
                        }
                      </p>
                      <p className="text-sm text-gray-500 mt-2" style={{ fontFamily: 'Inter, sans-serif' }}>
                        {freeTickets.length === 0 
                          ? 'Los tickets aparecerán cuando se envíen entradas gratuitas'
                          : 'Intenta con otros términos de búsqueda'
                        }
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Panel de administración para organizadores/productoras */}
              {['organizador','productora'].includes(rol||'') && (
                <div className="mt-10">
                  <div className="flex items-center space-x-2 mb-6">
                    <Save className="h-5 w-5 text-[#FF5722]" />
                    <h3 className="text-lg font-medium text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
                      Gestionar Tipos de Entrada
                    </h3>
                  </div>
                  
                  {showNewTicketForm ? (
                    <div className="bg-[#111111] p-6 rounded-lg border border-gray-600 mb-6">
                      <h4 className="text-white font-medium mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>
                        Nueva Entrada
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                        <input
                          value={newTicket.type}
                          onChange={e => setNewTicket(p => ({...p, type: e.target.value}))}
                          className="p-3 bg-[#1f1f1f] border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#FF5722] focus:border-[#FF5722]"
                          placeholder="Tipo de entrada"
                          style={{ fontFamily: 'Inter, sans-serif' }}
                        />
                        <input
                          value={newTicket.description}
                          onChange={e => setNewTicket(p => ({...p, description: e.target.value}))}
                          className="p-3 bg-[#1f1f1f] border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#FF5722] focus:border-[#FF5722]"
                          placeholder="Descripción"
                          style={{ fontFamily: 'Inter, sans-serif' }}
                        />
                        <input
                          type="number"
                          value={newTicket.price}
                          onChange={e => setNewTicket(p => ({...p, price: parseFloat(e.target.value)}))}
                          className="p-3 bg-[#1f1f1f] border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#FF5722] focus:border-[#FF5722]"
                          placeholder="Precio ($)"
                          style={{ fontFamily: 'Inter, sans-serif' }}
                        />
                        <input
                          type="number"
                          value={newTicket.quantity}
                          onChange={e => setNewTicket(p => ({...p, quantity: parseInt(e.target.value, 10)}))}
                          className="p-3 bg-[#1f1f1f] border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#FF5722] focus:border-[#FF5722]"
                          placeholder="Cantidad"
                          style={{ fontFamily: 'Inter, sans-serif' }}
                        />
                      </div>
                      <div className="flex justify-end space-x-4">
                        <button
                          onClick={() => setShowNewTicketForm(false)}
                          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                          style={{ fontFamily: 'Inter, sans-serif' }}
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={handleAddNewTicket}
                          className="px-4 py-2 bg-[#FF5722] text-white rounded-lg hover:bg-opacity-90 transition-colors"
                          style={{ fontFamily: 'Inter, sans-serif' }}
                        >
                          <Plus className="inline w-4 h-4 mr-1" />
                          Agregar Entrada
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center mb-6">
                      <button
                        onClick={() => setShowNewTicketForm(true)}
                        className="px-4 py-2 bg-[#FF5722] text-white rounded-lg hover:bg-opacity-90 transition-colors"
                        style={{ fontFamily: 'Inter, sans-serif' }}
                      >
                        <Plus className="inline w-4 h-4 mr-1" />
                        Nueva Entrada
                      </button>
                      <button
                        onClick={handleSaveTickets}
                        disabled={saving}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                        style={{ fontFamily: 'Inter, sans-serif' }}
                      >
                        <Save className="inline w-4 h-4 mr-1" />
                        {saving ? 'Guardando...' : 'Guardar Cambios'}
                      </button>
                    </div>
                  )}
                  
                  <div className="space-y-4">
                    {evento.ticket_types.filter(t => t.active !== false).map(ticket => (
                      <div key={ticket.id} className="bg-[#111111] p-4 rounded-lg border border-gray-600">
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                          <div>
                            <label className="text-xs text-gray-400 mb-1 block" style={{ fontFamily: 'Inter, sans-serif' }}>
                              Tipo
                            </label>
                            <input
                              value={ticket.type}
                              disabled
                              className="p-2 bg-[#1f1f1f] border border-gray-600 rounded text-white opacity-50 w-full"
                              style={{ fontFamily: 'Inter, sans-serif' }}
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-400 mb-1 block" style={{ fontFamily: 'Inter, sans-serif' }}>
                              Descripción
                            </label>
                            <input
                              value={editingTickets[ticket.id]?.description || ticket.description}
                              onChange={e => handleTicketChange(ticket.id, 'description', e.target.value)}
                              className="p-2 bg-[#1f1f1f] border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-[#FF5722] w-full"
                              style={{ fontFamily: 'Inter, sans-serif' }}
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-400 mb-1 block" style={{ fontFamily: 'Inter, sans-serif' }}>
                              Precio ($)
                            </label>
                            <input
                              type="number"
                              value={editingTickets[ticket.id]?.price || ticket.price}
                              onChange={e => handleTicketChange(ticket.id, 'price', parseFloat(e.target.value))}
                              className="p-2 bg-[#1f1f1f] border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-[#FF5722] w-full"
                              style={{ fontFamily: 'Inter, sans-serif' }}
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-400 mb-1 block" style={{ fontFamily: 'Inter, sans-serif' }}>
                              Cantidad
                            </label>
                            <input
                              type="number"
                              value={editingTickets[ticket.id]?.quantity || ticket.quantity}
                              onChange={e => handleTicketChange(ticket.id, 'quantity', parseInt(e.target.value, 10))}
                              className="p-2 bg-[#1f1f1f] border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-[#FF5722] w-full"
                              style={{ fontFamily: 'Inter, sans-serif' }}
                            />
                          </div>
                          <div className="flex justify-center">
                            <button
                              onClick={() => confirmDelete(ticket.id)}
                              className="text-red-400 hover:text-red-300 flex items-center transition-colors"
                              style={{ fontFamily: 'Inter, sans-serif' }}
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Eliminar
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Gráfico de ventas por RRPP */}
              <div className="mt-12">
                <div className="flex items-center space-x-2 mb-6">
                  <BarChart3 className="h-5 w-5 text-[#FF5722]" />
                  <h3 className="text-lg font-medium text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
                    Rendimiento de Ventas por RRPP
                  </h3>
                </div>

                {/* Tabla detallada de RRPPs */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <Table className="h-5 w-5 text-[#FF5722]" />
                      <h4 className="text-md font-medium text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
                        Rendimiento por RRPP ({rrppStats.length})
                      </h4>
                    </div>
                    {rrppStats.length > 0 && (
                      <div className="flex space-x-3">
                        <button
                          onClick={downloadRRPPDataCSV}
                          className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                          style={{ fontFamily: 'Inter, sans-serif' }}
                        >
                          <FileSpreadsheet className="h-4 w-4" />
                          <span>CSV</span>
                        </button>
                        <button
                          onClick={downloadRRPPDataPDF}
                          className="flex items-center space-x-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                          style={{ fontFamily: 'Inter, sans-serif' }}
                        >
                          <FileText className="h-4 w-4" />
                          <span>PDF</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="bg-[#111111] rounded-lg border border-gray-600 overflow-hidden">
                    {rrppStats.length > 0 ? (
                      <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                        <table className="min-w-full divide-y divide-gray-700">
                          <thead className="bg-[#1f1f1f] sticky top-0 z-10">
                            <tr>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider" style={{ fontFamily: 'Inter, sans-serif' }}>
                                RRPP
                              </th>
                              <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider" style={{ fontFamily: 'Inter, sans-serif' }}>
                                Entradas Vendidas
                              </th>
                              <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider" style={{ fontFamily: 'Inter, sans-serif' }}>
                                Total Ventas ($)
                              </th>
                              <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider" style={{ fontFamily: 'Inter, sans-serif' }}>
                                Acciones
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-700">
                            {/* Fila de TOTAL GENERAL */}
                            <tr className="bg-[#FF5722]/10 border-b-2 border-[#FF5722]/30">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-bold text-[#FF5722]" style={{ fontFamily: 'Inter, sans-serif' }}>
                                  🏆 TOTAL GENERAL
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <div className="text-sm font-bold text-[#FF5722]" style={{ fontFamily: 'Anton' }}>
                                  {rrppStats.reduce((sum, stat) => sum + stat.ticketsSold, 0)}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <div className="text-sm font-bold text-[#FF5722]" style={{ fontFamily: 'Anton' }}>
                                  ${rrppStats.reduce((sum, stat) => sum + stat.totalSales, 0).toFixed(2)}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <span className="text-xs text-gray-400" style={{ fontFamily: 'Inter, sans-serif' }}>
                                  Suma de todos los RRPPs
                                </span>
                              </td>
                            </tr>

                            {/* Filas de RRPPs individuales */}
                            {createDetailedRrppView(rrppStats, rrppDetailed).map((rrpp, index) => {
                              const isExpanded = expandedRrppRows.has(rrpp.rrpp);
                              
                              return (
                                <React.Fragment key={rrpp.rrpp}>
                                  {/* Fila principal del RRPP */}
                                  <tr className={index % 2 === 0 ? 'bg-[#111111]' : 'bg-[#0f0f0f]'}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="text-sm font-medium text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
                                        {rrpp.rrpp}
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                      <div className="text-sm font-semibold text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
                                        {rrpp.ticketsSold}
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                      <div className="text-sm font-semibold text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
                                        ${rrpp.totalSales.toFixed(2)}
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                      <button
                                        onClick={() => toggleRrppRowExpanded(rrpp.rrpp)}
                                        className="inline-flex items-center px-3 py-1 bg-[#FF5722] text-white rounded-md hover:bg-[#E64A19] transition-colors text-xs"
                                        style={{ fontFamily: 'Inter, sans-serif' }}
                                      >
                                        {isExpanded ? (
                                          <>
                                            <ChevronUp className="h-4 w-4 mr-1" />
                                            Ocultar
                                          </>
                                        ) : (
                                          <>
                                            <ChevronDown className="h-4 w-4 mr-1" />
                                            Ver Detalle
                                          </>
                                        )}
                                      </button>
                                    </td>
                                  </tr>

                                  {/* Filas expandibles con detalle por tipo de ticket */}
                                  {isExpanded && rrpp.ticketDetails.map((ticket, ticketIndex) => (
                                    <tr key={`${rrpp.rrpp}-${ticket.ticketType}`} className="bg-[#0a0a0a] border-l-4 border-[#FF5722]/30">
                                      <td className="px-6 py-3 whitespace-nowrap pl-12">
                                        <div className="text-xs text-gray-300" style={{ fontFamily: 'Inter, sans-serif' }}>
                                          └─ {ticket.ticketType}
                                        </div>
                                      </td>
                                      <td className="px-6 py-3 whitespace-nowrap text-center">
                                        <div className="text-xs text-gray-300" style={{ fontFamily: 'Inter, sans-serif' }}>
                                          {ticket.ticketsSold}
                                        </div>
                                      </td>
                                      <td className="px-6 py-3 whitespace-nowrap text-center">
                                        <div className="text-xs text-gray-300" style={{ fontFamily: 'Inter, sans-serif' }}>
                                          ${ticket.totalSales.toFixed(2)}
                                        </div>
                                      </td>
                                      <td className="px-6 py-3 whitespace-nowrap text-center">
                                        {ticket.ticketsSold === 0 && (
                                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-600/20 text-gray-400" style={{ fontFamily: 'Inter, sans-serif' }}>
                                            Sin ventas
                                          </span>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </React.Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Table className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                        <p className="text-gray-400" style={{ fontFamily: 'Inter, sans-serif' }}>
                          No hay datos de RRPPs disponibles
                        </p>
                        <p className="text-sm text-gray-500 mt-2" style={{ fontFamily: 'Inter, sans-serif' }}>
                          Los datos aparecerán cuando se asignen RRPPs al evento
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-[#111111] p-6 rounded-lg border border-gray-600">
                  {rrppStats.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={rrppStats}>
                        <CartesianGrid stroke="#374151" />
                        <XAxis 
                          dataKey="rrpp" 
                          stroke="#9CA3AF" 
                          style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px' }}
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis 
                          stroke="#9CA3AF" 
                          style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px' }}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#1f1f1f', 
                            border: '1px solid #374151', 
                            borderRadius: '8px',
                            color: '#fff',
                            fontFamily: 'Inter, sans-serif'
                          }}
                          formatter={(value, name) => [
                            name === 'ticketsSold' ? `${value} entradas` : `$${value}`,
                            name === 'ticketsSold' ? 'Entradas Vendidas' : 'Ingresos'
                          ]}
                          labelFormatter={(label) => `RRPP: ${label}`}
                        />
                        <Legend 
                          wrapperStyle={{ 
                            fontFamily: 'Inter, sans-serif', 
                            fontSize: '14px' 
                          }}
                        />
                        <Bar 
                          dataKey="ticketsSold" 
                          fill="#FF5722" 
                          name="Entradas Vendidas" 
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar 
                          dataKey="totalSales" 
                          fill="#56ae4a" 
                          name="Ingresos ($)" 
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center py-12">
                      <BarChart3 className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                      <p className="text-gray-400" style={{ fontFamily: 'Inter, sans-serif' }}>
                        No hay datos de ventas por RRPP disponibles
                      </p>
                      <p className="text-sm text-gray-500 mt-2" style={{ fontFamily: 'Inter, sans-serif' }}>
                        Los datos aparecerán cuando se registren ventas
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Modal de confirmación de eliminación */}
        {confirmDeleteId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-[#1f1f1f] p-6 rounded-lg border border-gray-700 max-w-md w-full mx-4">
              <h3 className="text-white text-lg font-semibold mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>
                Confirmar Eliminación
              </h3>
              <p className="text-gray-300 mb-6" style={{ fontFamily: 'Inter, sans-serif' }}>
                ¿Estás seguro de que deseas eliminar este tipo de entrada? Esta acción no se puede deshacer.
              </p>
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteTicket}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  <Trash2 className="w-4 h-4 inline mr-1" />
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventDetails;
