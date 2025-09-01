import React from 'react';

const DefensaDelConsumidor = () => {
  return (
    <div className="bg-[#2a2a2a] min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#1f1f1f] rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-white mb-8">Ley de Defensa al Consumidor</h1>
          
          <div className="text-gray-300 space-y-6">
            <p className="text-lg">
              Información sobre sus derechos según la Ley Nacional de Defensa del Consumidor N° 24.240
            </p>
            
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white">Sus Derechos como Consumidor</h2>
              <p>
                Como consumidor en Argentina, usted tiene derechos protegidos por la Ley de Defensa del Consumidor que incluyen:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Derecho a la información clara y veraz sobre productos y servicios</li>
                <li>Derecho a la protección de su salud y seguridad</li>
                <li>Derecho a no ser discriminado</li>
                <li>Derecho a la educación del consumo</li>
                <li>Derecho a un trato equitativo y digno</li>
              </ul>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white">Información del Proveedor</h2>
              <p>
                JAMM se compromete a cumplir con todas las disposiciones de la Ley de Defensa del Consumidor, proporcionando información clara sobre nuestros servicios y precios.
              </p>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white">Resolución de Conflictos</h2>
              <p>
                En caso de disputas, usted puede recurrir a los siguientes organismos:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Oficinas Municipales de Información al Consumidor (OMIC)</li>
                <li>Dirección Nacional de Defensa del Consumidor</li>
                <li>Sistema Nacional de Arbitraje de Consumo</li>
              </ul>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white">Contacto para Reclamos</h2>
              <div className="bg-[#2a2a2a] p-4 rounded-lg border border-gray-700">
                <p><strong>JAMM</strong></p>
                <p>Email: jamm.qr@gmail.com</p>
                <p>Teléfono: +54 11 2550-6290</p>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white">Autoridad de Aplicación</h2>
              <div className="bg-[#2a2a2a] p-4 rounded-lg border border-gray-700">
                <p><strong>Secretaría de Comercio Interior</strong></p>
                <p>Dirección Nacional de Defensa del Consumidor</p>
                <p>Sitio web: www.argentina.gob.ar/produccion/defensadelconsumidor</p>
                <p>Teléfono: 0800-666-1518</p>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white">Información Adicional</h2>
              <p>
                Para conocer más sobre sus derechos como consumidor, visite el sitio web oficial de la Dirección Nacional de Defensa del Consumidor o contacte directamente con los organismos de control correspondientes.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DefensaDelConsumidor;