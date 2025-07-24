import React, { useState } from 'react';

type TicketLine = {
  description: string;
  unitPrice: number;
  quantity: number;
};

interface GuestCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  lines: TicketLine[];
  total: number;
  marketplaceFeePct: number;
  onConfirm: (guestData: GuestData) => void;
}

export interface GuestData {
  firstName: string;
  lastName: string;
  docType: string;
  docNumber: string;
  email: string;
  phone: string;
  country: string;
}

const GuestCheckoutModal: React.FC<GuestCheckoutModalProps> = ({
  isOpen, onClose, lines, total, marketplaceFeePct, onConfirm
}) => {
  const [step, setStep] = useState<1|2|3>(1);
  const [guest, setGuest] = useState<GuestData>({
    firstName: '', lastName: '', docType: 'DNI', docNumber: '',
    email: '', phone: '', country: ''
  });

  const fee = Math.round(total * (marketplaceFeePct/100));
  const finalAmount = total + fee;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-[#1f1f1f] rounded-lg w-full max-w-3xl p-6">
        {/* Barra de progreso */}
        <div className="flex justify-between mb-6">
          {['1','2','3'].map((n,i) => (
            <div key={n} className={`flex-1 text-center ${step===i+1 ? 'text-white' : 'text-gray-500'}`}>
              <span className="inline-block w-6 h-6 border rounded-full mb-1"
                style={{ borderColor: step>=i+1 ? '#56ae4a' : '#555' }}>
                {i+1}
              </span>
              <div className="text-sm">
                {i===0 ? 'Revisa tu orden' : i===1 ? 'Ingresa tus datos' : 'Confirma tu compra'}
              </div>
            </div>
          ))}
        </div>

        {step === 1 && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Tus entradas</h2>
            <ul className="space-y-3 mb-6">
              {lines.map((l, idx) => (
                <li key={idx} className="flex justify-between text-gray-200">
                  <span>{l.quantity} × {l.description}</span>
                  <span>${(l.unitPrice*l.quantity).toLocaleString()}</span>
                </li>
              ))}
            </ul>
            <div className="border-t border-gray-700 pt-4 mb-6 text-gray-200">
              <div className="flex justify-between mb-1">
                <span>Costo de servicio</span><span>${fee.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold text-white">
                <span>Total a pagar</span><span>${finalAmount.toLocaleString()}</span>
              </div>
            </div>
            <button
              className="w-full py-3 bg-[#56ae4a] text-white rounded hover:bg-[#68c95b]"
              onClick={()=>setStep(2)}
            >
              Siguiente
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Ingresa tus datos</h2>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <input
                type="text"
                placeholder="Nombre"
                value={guest.firstName}
                onChange={e=>setGuest({...guest, firstName:e.target.value})}
                className="col-span-1 p-2 bg-[#2a2a2a] text-white rounded"
              />
              <input
                type="text"
                placeholder="Apellido"
                value={guest.lastName}
                onChange={e=>setGuest({...guest, lastName:e.target.value})}
                className="col-span-1 p-2 bg-[#2a2a2a] text-white rounded"
              />
              <select
                value={guest.docType}
                onChange={e=>setGuest({...guest, docType:e.target.value})}
                className="p-2 bg-[#2a2a2a] text-white rounded"
              >
                <option>DNI</option>
                <option>Pasaporte</option>
              </select>
              <input
                type="text"
                placeholder="Número de identificación"
                value={guest.docNumber}
                onChange={e=>setGuest({...guest, docNumber:e.target.value})}
                className="p-2 bg-[#2a2a2a] text-white rounded"
              />
              <input
                type="email"
                placeholder="Email"
                value={guest.email}
                onChange={e=>setGuest({...guest, email:e.target.value})}
                className="p-2 bg-[#2a2a2a] text-white rounded"
              />
              <input
                type="tel"
                placeholder="Teléfono"
                value={guest.phone}
                onChange={e=>setGuest({...guest, phone:e.target.value})}
                className="p-2 bg-[#2a2a2a] text-white rounded"
              />
              <input
                type="text"
                placeholder="País"
                value={guest.country}
                onChange={e=>setGuest({...guest, country:e.target.value})}
                className="col-span-2 p-2 bg-[#2a2a2a] text-white rounded"
              />
            </div>
            <div className="flex justify-between">
              <button
                className="px-4 py-2 bg-gray-600 text-white rounded"
                onClick={()=>setStep(1)}
              >
                Anterior
              </button>
              <button
                className="px-4 py-2 bg-[#56ae4a] text-white rounded hover:bg-[#68c95b]"
                onClick={()=>setStep(3)}
              >
                Siguiente
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Confirma tu compra</h2>
            <div className="bg-[#2a2a2a] p-4 rounded mb-6">
              <p className="text-gray-200 mb-2"><strong>Nombre:</strong> {guest.firstName} {guest.lastName}</p>
              <p className="text-gray-200 mb-2"><strong>ID:</strong> {guest.docType} {guest.docNumber}</p>
              <p className="text-gray-200 mb-2"><strong>Email:</strong> {guest.email}</p>
              <p className="text-gray-200 mb-2"><strong>Teléfono:</strong> {guest.phone}</p>
              <p className="text-gray-200"><strong>País:</strong> {guest.country}</p>
            </div>
            <div className="flex justify-between">
              <button
                className="px-4 py-2 bg-gray-600 text-white rounded"
                onClick={()=>setStep(2)}
              >
                Anterior
              </button>
              <button
                className="px-4 py-2 bg-[#56ae4a] text-white rounded hover:bg-[#68c95b]"
                onClick={()=>onConfirm(guest)}
              >
                Pagar ${finalAmount.toLocaleString()}
              </button>
            </div>
          </div>
        )}

        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
          onClick={onClose}
        >
          <X />
        </button>
      </div>
    </div>
  );
};
