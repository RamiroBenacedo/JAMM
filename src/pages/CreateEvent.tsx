import React, { useState, useEffect } from 'react';
import { Calendar, Ticket, Settings, Upload, X, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import Modal from 'react-modal';
import { validateFile, generateSecureFileName, FILE_CONFIGS, FileValidationResult } from '../utils/fileValidation';
import { logError, logInfo } from '../utils/secureLogger';

interface TicketType {
  type: string;
  description: string;
  price: number;
  quantity: number;
}

const CreateEvent = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  useEffect(() => {
    if (!user) {
      navigate('/ingresar');
    }
  }, [user, navigate])
  if(!user){
    return;
  }
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [eventData, setEventData] = useState({
    name: '',
    description: '',
    date: '',
    time: '',
    location: '',
    tickets: [] as TicketType[],
    maxTicketsPerUser: 1,
    salesEndDate: '',
    termsAccepted: false,
    imageUrl: '',
    imageFile: null as File | null
  });

  const [newTicket, setNewTicket] = useState<TicketType>({
    type: '',
    description: '',
    price: 0,
    quantity: 0
  });

  const [showTicketForm, setShowTicketForm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [ticketErrors, setTicketErrors] = useState<Record<string, string>>({});
  const [fileValidation, setFileValidation] = useState<FileValidationResult | null>(null);

  const tabs = [
    {
      name: 'Detalles del evento',
      icon: Calendar,
      description: 'Información básica sobre tu evento'
    },
    {
      name: 'Entradas',
      icon: Ticket,
      description: 'Configura los tipos de entradas y precios'
    },
    {
      name: 'Configuración',
      icon: Settings,
      description: 'Ajustes adicionales del evento'
    }
  ];

  const validateTicket = () => {
    const newErrors: Record<string, string> = {};
    
    if (!newTicket.type.trim()) {
      newErrors.type = 'El tipo de entrada es requerido';
    }
    if (!newTicket.description.trim()) {
      newErrors.description = 'La descripción es requerida';
    }
    if (newTicket.price < 0) {
      newErrors.price = 'El precio no puede ser negativo';
    }
    if (newTicket.quantity <= 0) {
      newErrors.quantity = 'La cantidad debe ser mayor a 0';
    }

    setTicketErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddTicket = () => {
    if (validateTicket()) {
      setEventData({
        ...eventData,
        tickets: [...eventData.tickets, newTicket]
      });
      setNewTicket({ type: '', description: '', price: 0, quantity: 0 });
      setShowTicketForm(false);
      setTicketErrors({});
    }
  };

  const handleRemoveTicket = (index: number) => {
    const newTickets = [...eventData.tickets];
    newTickets.splice(index, 1);
    setEventData({
      ...eventData,
      tickets: newTickets
    });
  };

  const validateTab = (tabIndex: number) => {
    const newErrors: Record<string, string> = {};

    if (tabIndex === 0) {
      if (!eventData.name) newErrors.name = 'El nombre es requerido';
      if (!eventData.description) newErrors.description = 'La descripción es requerida';
      if (!eventData.date) newErrors.date = 'La fecha es requerida';
      if (!eventData.time) newErrors.time = 'La hora es requerida';
      if (!eventData.location) newErrors.location = 'La ubicación es requerida';
    } else if (tabIndex === 1) {
      if (eventData.tickets.length === 0) newErrors.tickets = 'Debe agregar al menos un tipo de entrada';
    } else if (tabIndex === 2) {
      if (!eventData.salesEndDate) newErrors.salesEndDate = 'La fecha de cierre de ventas es requerida';
      if (!eventData.termsAccepted) newErrors.terms = 'Debe aceptar los términos y condiciones';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateTab(activeTab)) {
      setActiveTab(prev => Math.min(prev + 1, tabs.length - 1));
    }
  };

  const handleImageUpload = async (file: File): Promise<string | null> => {
    if (!file) return null;
    
    try {
      // Validate file security
      const validation = await validateFile(file, FILE_CONFIGS.image);
      setFileValidation(validation);

      if (!validation.isValid) {
        setErrors({ ...errors, imageFile: validation.error || 'Archivo no válido' });
        return null;
      }

      // Generate secure filename
      const secureFileName = generateSecureFileName(file);
      const filePath = `event-images/${secureFileName}`;

      const { error: uploadError } = await supabase.storage
        .from('events')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false // Don't overwrite existing files
        });

      if (uploadError) {
        if (uploadError.message.includes('already exists')) {
          // Retry with new filename
          const retryFileName = generateSecureFileName(file);
          const retryPath = `event-images/${retryFileName}`;
          const { error: retryError } = await supabase.storage
            .from('events')
            .upload(retryPath, file, { cacheControl: '3600', upsert: false });
          
          if (retryError) throw retryError;
          
          const { data: { publicUrl } } = supabase.storage
            .from('events')
            .getPublicUrl(retryPath);
          return publicUrl;
        }
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('events')
        .getPublicUrl(filePath);

      // Clear any previous errors
      const newErrors = { ...errors };
      delete newErrors.imageFile;
      setErrors(newErrors);

      return publicUrl;
    } catch (error) {
      logError('Image upload failed', error, { fileName: file.name, fileSize: file.size }, user?.id);
      setErrors({ ...errors, imageFile: 'Error al subir la imagen. Intente nuevamente.' });
      return null;
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file immediately on selection
      const validation = await validateFile(file, FILE_CONFIGS.image);
      setFileValidation(validation);

      if (!validation.isValid) {
        setErrors({ ...errors, imageFile: validation.error || 'Archivo no válido' });
        // Clear the input
        e.target.value = '';
        return;
      }

      // Clear any previous errors
      const newErrors = { ...errors };
      delete newErrors.imageFile;
      setErrors(newErrors);

      const reader = new FileReader();
      reader.onloadend = () => {
        setEventData(prev => ({
          ...prev,
          imageUrl: reader.result as string,
          imageFile: file
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setEventData(prev => ({
      ...prev,
      imageUrl: '',
      imageFile: null
    }));
  };

  const handleSubmit = async () => {
    if (!validateTab(2) || !user) return;

    try {
      setLoading(true);

      let imageUrl = eventData.imageFile 
        ? await handleImageUpload(eventData.imageFile)
        : null;
      const salesEndDateIso = eventData.salesEndDate
      ? new Date(eventData.salesEndDate).toISOString()
      : null;
      const { data: event, error: eventError } = await supabase
        .from('events')
        .insert({
          creator_id: user.id,
          name: eventData.name,
          description: eventData.description,
          date: eventData.date,
          time: eventData.time,
          location: eventData.location,
          max_tickets_per_user: eventData.maxTicketsPerUser,
          sales_end_date: salesEndDateIso,
          image_url: imageUrl
        })
        .select()
        .single();

      if (eventError) throw eventError;

      const ticketTypes = eventData.tickets.map(ticket => ({
        event_id: event.id,
        type: ticket.type,
        description: ticket.description,
        price: ticket.price,
        quantity: ticket.quantity
      }));

      const { error: ticketError } = await supabase
        .from('ticket_types')
        .insert(ticketTypes);

      if (ticketError) throw ticketError;

      navigate(`/evento/${event.id}`);
    } catch (error) {
      logError('Event creation failed', error, { 
        eventName: eventData.name,
        ticketCount: eventData.tickets.length 
      }, user?.id);
      setErrors({
        submit: 'Error al crear el evento. Por favor, intente nuevamente.'
      });
    } finally {
      setLoading(false);
    }
  };

  const termsAndConditions = `
    TÉRMINOS Y CONDICIONES DE USO DE LA PLATAFORMA

    1. ACEPTACIÓN DE LOS TÉRMINOS
    Al crear un evento en nuestra plataforma, usted acepta cumplir con estos términos y condiciones.

    2. RESPONSABILIDADES DEL ORGANIZADOR
    - Proporcionar información precisa y verdadera sobre el evento
    - Cumplir con las fechas y horarios establecidos
    - Garantizar la calidad del evento según lo anunciado
    - Respetar las políticas de reembolso establecidas

    3. COMISIONES Y PAGOS
    - La plataforma cobra una comisión del 10% sobre el valor de cada entrada vendida
    - Los pagos se procesarán a través de nuestro sistema de pago seguro
    - Las transferencias al organizador se realizarán automaticamente de la cuenta del usuario, no pasaran por la cuenta bancaria de JAMM

    4. CANCELACIONES Y REEMBOLSOS
    - El organizador debe notificar cualquier cancelación con al menos 48 horas de anticipación
    - Los reembolsos se procesarán según la política establecida
    - La plataforma retiene el derecho de cancelar eventos que incumplan las normas

    5. PROPIEDAD INTELECTUAL
    - El organizador mantiene los derechos de su contenido
    - La plataforma puede usar información del evento para promoción

    6. PRIVACIDAD Y DATOS
    - Los datos de los compradores serán tratados según nuestra política de privacidad
    - El organizador se compromete a no usar los datos para otros fines

    7. LIMITACIÓN DE RESPONSABILIDAD
    La plataforma no se hace responsable por:
    - Cancelaciones de eventos
    - Cambios en la programación
    - Incumplimiento por parte del organizador
    - Problemas técnicos fuera de nuestro control

    8. MODIFICACIONES
    Nos reservamos el derecho de modificar estos términos en cualquier momento.
  `;

  return (
    <div className="min-h-screen bg-[#2a2a2a]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-white mb-2">Crear nuevo evento</h1>
        <p className="text-gray-400 mb-8">Complete los detalles de su evento en los siguientes pasos</p>
        
        <div className="bg-[#1f1f1f] rounded-xl shadow-xl overflow-hidden">
          <div className="grid grid-cols-3 border-b border-gray-700">
            {tabs.map((tab, index) => (
              <button
                key={tab.name}
                onClick={() => setActiveTab(index)}
                className={`
                  relative py-6 px-4 text-center transition-all duration-200
                  ${activeTab === index
                    ? 'bg-[#2a2a2a]'
                    : 'hover:bg-[#2a2a2a]/50'}
                `}
              >
                <div className={`
                  absolute bottom-0 left-0 w-full h-0.5
                  ${activeTab === index ? 'bg-[#FF5722]' : 'bg-transparent'}
                `} />
                <tab.icon className={`
                  w-6 h-6 mx-auto mb-2
                  ${activeTab === index ? 'text-[#FF5722]' : 'text-gray-400'}
                `} />
                <div className={`
                  text-sm font-medium
                  ${activeTab === index ? 'text-white' : 'text-gray-400'}
                `}>
                  {tab.name}
                </div>
                <p className="text-xs text-gray-500 mt-1">{tab.description}</p>
              </button>
            ))}
          </div>

          <div className="p-8">
            {errors.submit && (
              <div className="mb-6 bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded">
                {errors.submit}
              </div>
            )}

            {activeTab === 0 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-200">Imagen del evento</label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-600 border-dashed rounded-lg bg-[#2a2a2a]">
                    {eventData.imageUrl ? (
                      <div className="relative">
                        <img
                          src={eventData.imageUrl}
                          alt="Preview"
                          className="max-h-64 rounded-lg"
                        />
                        <button
                          onClick={removeImage}
                          className="absolute top-2 right-2 p-1 bg-red-500 rounded-full text-white hover:bg-red-600 transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1 text-center">
                        <Upload className="mx-auto h-12 w-12 text-gray-400" />
                        <div className="flex text-sm text-gray-400">
                          <label className="relative cursor-pointer rounded-md font-medium text-[#FF5722] hover:text-opacity-80 focus-within:outline-none">
                            <span>Sube una imagen</span>
                            <input
                              type="file"
                              className="sr-only"
                              accept="image/*"
                              onChange={handleImageChange}
                            />
                          </label>
                          <p className="pl-1">o arrastra y suelta</p>
                        </div>
                        <p className="text-xs text-gray-500">
                          PNG, JPG, GIF hasta 10MB
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-200">Nombre del evento</label>
                  <input
                    type="text"
                    className={`mt-1 block w-full rounded-lg border-gray-600 bg-[#2a2a2a] shadow-sm focus:border-[#FF5722] focus:ring-[#FF5722] text-white ${
                      errors.name ? 'border-red-500' : ''
                    }`}
                    value={eventData.name}
                    onChange={(e) => setEventData({...eventData, name: e.target.value})}
                  />
                  {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-200">Descripción</label>
                  <textarea
                    rows={4}
                    className={`mt-1 block w-full rounded-lg border-gray-600 bg-[#2a2a2a] shadow-sm focus:border-[#FF5722] focus:ring-[#FF5722] text-white ${
                      errors.description ? 'border-red-500' : ''
                    }`}
                    value={eventData.description}
                    onChange={(e) => setEventData({...eventData, description: e.target.value})}
                  />
                  {errors.description && <p className="mt-1 text-sm text-red-500">{errors.description}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-200">Ubicación</label>
                  <input
                    type="text"
                    className={`mt-1 block w-full rounded-lg border-gray-600 bg-[#2a2a2a] shadow-sm focus:border-[#FF5722] focus:ring-[#FF5722] text-white ${
                      errors.location ? 'border-red-500' : ''
                    }`}
                    value={eventData.location}
                    onChange={(e) => setEventData({...eventData, location: e.target.value})}
                    placeholder="Ej: Teatro Municipal, Av. Principal 123"
                  />
                  {errors.location && <p className="mt-1 text-sm text-red-500">{errors.location}</p>}
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-200">Fecha</label>
                    <input
                      type="date"
                      className={`mt-1 block w-full rounded-lg border-gray-600 bg-[#2a2a2a] shadow-sm focus:border-[#FF5722] focus:ring-[#FF5722] text-white ${
                        errors.date ? 'border-red-500' : ''
                      }`}
                      value={eventData.date}
                      onChange={(e) => setEventData({...eventData, date: e.target.value})}
                    />
                    {errors.date && <p className="mt-1 text-sm text-red-500">{errors.date}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-200">Hora</label>
                    <input
                      type="time"
                      className={`mt-1 block w-full rounded-lg border-gray-600 bg-[#2a2a2a] shadow-sm focus:border-[#FF5722] focus:ring-[#FF5722] text-white ${
                        errors.time ? 'border-red-500' : ''
                      }`}
                      value={eventData.time}
                      onChange={(e) => setEventData({...eventData, time: e.target.value})}
                    />
                    {errors.time && <p className="mt-1 text-sm text-red-500">{errors.time}</p>}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 1 && (
              <div className="space-y-6">
                <div className="bg-[#2a2a2a] p-6 rounded-lg border border-gray-700">
                  <h3 className="text-xl font-medium text-white mb-4">Configurar entradas</h3>
                  
                  {eventData.tickets.length > 0 && (
                    <div className="mt-4 space-y-4">
                      {eventData.tickets.map((ticket, index) => (
                        <div key={index} className="flex items-start justify-between p-4 bg-[#1f1f1f] rounded-lg border border-gray-600 hover:border-[#FF5722] transition-colors duration-200">
                          <div>
                            <p className="text-white font-medium">{ticket.type}</p>
                            <p className="text-gray-400 text-sm mt-1">{ticket.description}</p>
                            <div className="mt-2 flex items-center space-x-4">
                              <span className="text-[#FF5722] font-medium">${ticket.price}</span>
                              <span className="text-gray-400">|</span>
                              <span className="text-gray-300">{ticket.quantity} disponibles</span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveTicket(index)}
                            className="text-gray-400 hover:text-red-400 transition-colors duration-200"
                          >
                            <Settings className="h-5 w-5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {showTicketForm ? (
                    <div className="mt-6 space-y-4 bg-[#1f1f1f] p-6 rounded-lg border border-gray-600">
                      <div>
                        <label className="block text-sm font-medium text-gray-200">Tipo de entrada</label>
                        <input
                          type="text"
                          className={`mt-1 block w-full rounded-lg border-gray-600 bg-[#2a2a2a] shadow-sm focus:border-[#FF5722] focus:ring-[#FF5722] text-white ${
                            ticketErrors.type ? 'border-red-500' : ''
                          }`}
                          value={newTicket.type}
                          onChange={(e) => setNewTicket({...newTicket, type: e.target.value})}
                          placeholder="Ej: General, VIP, etc."
                        />
                        {ticketErrors.type && <p className="mt-1 text-sm text-red-500">{ticketErrors.type}</p>}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-200">Descripción</label>
                        <textarea
                          rows={2}
                          className={`mt-1 block w-full rounded-lg border-gray-600 bg-[#2a2a2a] shadow-sm focus:border-[#FF5722] focus:ring-[#FF5722] text-white ${
                            ticketErrors.description ? 'border-red-500' : ''
                          }`}
                          value={newTicket.description}
                          onChange={(e) => setNewTicket({...newTicket, description: e.target.value})}
                          placeholder="Describe los beneficios de este tipo de entrada"
                        />
                        {ticketErrors.description && <p className="mt-1 text-sm text-red-500">{ticketErrors.description}</p>}
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label className="block text-sm font-medium text-gray-200">Precio</label>
                          <div className="mt-1 relative rounded-lg shadow-sm">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <span className="text-gray-400 sm:text-sm">$</span>
                            </div>
                            <input
                              type="number"
                              min="0"
                              className={`pl-7 block w-full rounded-lg border-gray-600 bg-[#2a2a2a] shadow-sm focus:border-[#FF5722] focus:ring-[#FF5722] text-white ${
                                ticketErrors.price ? 'border-red-500' : ''
                              }`}
                              value={newTicket.price}
                              onChange={(e) => setNewTicket({...newTicket, price: Number(e.target.value)})}
                            />
                          </div>
                          {ticketErrors.price && <p className="mt-1 text-sm text-red-500">{ticketErrors.price}</p>}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-200">Cantidad disponible</label>
                          <input
                            type="number"
                            min="1"
                            className={`mt-1 block w-full rounded-lg border-gray-600 bg-[#2a2a2a] shadow-sm focus:border-[#FF5722] focus:ring-[#FF5722] text-white ${
                              ticketErrors.quantity ? 'border-red-500' : ''
                            }`}
                            value={newTicket.quantity}
                            onChange={(e) => setNewTicket({...newTicket, quantity: Number(e.target.value)})}
                          />
                          {ticketErrors.quantity && <p className="mt-1 text-sm text-red-500">{ticketErrors.quantity}</p>}
                        </div>
                      </div>

                      <div className="flex space-x-4 pt-4">
                        <button
                          onClick={handleAddTicket}
                          className="flex-1 bg-[#FF5722] text-white px-4 py-2 rounded-lg hover:bg-opacity-90 transition-colors duration-200"
                        >
                          Agregar
                        </button>
                        <button
                          onClick={() => {
                            setShowTicketForm(false);
                            setTicketErrors({});
                            setNewTicket({ type: '', description: '', price: 0, quantity: 0 });
                          }}
                          className="flex-1 bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors duration-200"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-6">
                      <button
                        className="w-full flex items-center justify-center px-4 py-3 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-[#FF5722] hover:bg-opacity-90 transition-colors duration-200"
                        onClick={() => setShowTicketForm(true)}
                      >
                        + Agregar tipo de entrada
                      </button>
                      {errors.tickets && <p className="mt-2 text-sm text-red-500">{errors.tickets}</p>}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 2 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-200">
                    Máximo de tickets por usuario
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="mt-1 block w-full rounded-lg border-gray-600 bg-[#2a2a2a] shadow-sm focus:border-[#FF5722] focus:ring-[#FF5722] text-white"
                    value={eventData.maxTicketsPerUser}
                    onChange={(e) => setEventData({...eventData, maxTicketsPerUser: parseInt(e.target.value)})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-200">
                    Fecha de cierre de ventas
                  </label>
                  <input
                    type="datetime-local"
                    className={`mt-1 block w-full rounded-lg border-gray-600 bg-[#2a2a2a] shadow-sm focus:border-[#FF5722] focus:ring-[#FF5722] text-white ${
                      errors.salesEndDate ? 'border-red-500' : ''
                    }`}
                    value={eventData.salesEndDate}
                    onChange={(e) => setEventData({...eventData, salesEndDate: e.target.value})}
                  />
                  {errors.salesEndDate && <p className="mt-1 text-sm text-red-500">{errors.salesEndDate}</p>}
                </div>

                <div className="relative flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      type="checkbox"
                      className={`focus:ring-[#FF5722] h-4 w-4 text-[#FF5722] border-gray-600 rounded bg-[#2a2a2a] checked:bg-[#FF5722] ${
                        errors.terms ? 'border-red-500' : ''
                      }`}
                      checked={eventData.termsAccepted}
                      onChange={(e) => setEventData({...eventData, termsAccepted: e.target.checked})}
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label className="font-medium text-gray-200">
                      Acepto los{' '}
                      <button
                        type="button"
                        onClick={() => setShowTermsModal(true)}
                        className="text-[#FF5722] hover:text-opacity-80 underline focus:outline-none"
                      >
                        términos y condiciones
                      </button>
                    </label>
                    <p className="text-gray-400">
                      Al crear este evento, acepto cumplir con todas las políticas y términos de servicio.
                    </p>
                    {errors.terms && <p className="mt-1 text-sm text-red-500">{errors.terms}</p>}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="px-8 py-4 bg-[#2a2a2a] border-t border-gray-700">
            <div className="flex justify-end">
              <button
                onClick={activeTab === 2 ? handleSubmit : handleNext}
                disabled={loading}
                className="inline-flex justify-center py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-[#FF5722] hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FF5722] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creando evento...
                  </span>
                ) : (
                  activeTab === 2 ? 'Crear evento' : 'Siguiente'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={showTermsModal}
        onRequestClose={() => setShowTermsModal(false)}
        className="max-w-2xl mx-auto mt-20 bg-[#1f1f1f] rounded-lg shadow-xl border border-gray-700 outline-none"
        overlayClassName="fixed inset-0 bg-black bg-opacity-75 z-50"
      >
        <div className="p-6">
          <h2 className="text-2xl font-bold text-white mb-4">Términos y Condiciones</h2>
          <div className="prose prose-invert max-h-[60vh] overflow-y-auto">
            <pre className="whitespace-pre-wrap text-gray-300 font-sans">
              {termsAndConditions}
            </pre>
          </div>
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={() => setShowTermsModal(false)}
              className="px-4 py-2 bg-[#FF5722] text-white rounded-lg hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-[#FF5722] focus:ring-offset-2 focus:ring-offset-[#1f1f1f]"
            >
              Cerrar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default CreateEvent;