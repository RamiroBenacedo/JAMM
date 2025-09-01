import React from 'react';

const PoliticaDeDevolucion = () => {
  return (
    <div className="bg-[#2a2a2a] min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#1f1f1f] rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-4">Política de Devoluciones</h1>
            <p className="text-gray-300 text-lg">
              En esta sección detallamos los procedimientos para cambios, reembolsos y devoluciones de entradas adquiridas a través de la plataforma de JAMM. Por favor, revisá detenidamente.
            </p>
          </div>
          
          <div className="text-gray-300 space-y-8">
            <div className="border-l-4 border-[#FF5722] pl-6">
              <h2 className="text-2xl font-bold text-white mb-4" style={{ color: '#FF5722' }}>1. Carácter Definitivo de la Compra</h2>
              <p>
                Como regla general, las compras de entradas para eventos son definitivas: no se permiten cambios, reembolsos ni devoluciones una vez completado el proceso de compra. Te recomendamos verificar cuidadosamente la fecha, ubicación, horario y categoría antes de confirmar.
              </p>
            </div>

            <div className="border-l-4 border-[#FF5722] pl-6">
              <h2 className="text-2xl font-bold text-white mb-4" style={{ color: '#FF5722' }}>2. Cancelación o Cambio de Fecha del Evento</h2>
              <p className="mb-4">
                Si el organizador decide reprogramar el evento o cambiar su ubicación, las entradas seguirán siendo válidas para la nueva fecha o lugar. No se aceptan reembolsos por este motivo, salvo que existan disposiciones legales que lo autoricen.
              </p>
              <p>
                En caso de cancelación total y definitiva (sin reprogramación), podrás solicitar el reembolso del precio de la entrada. El organizador es el responsable directo de autorizar la devolución.
              </p>
            </div>

            <div className="border-l-4 border-[#FF5722] pl-6">
              <h2 className="text-2xl font-bold text-white mb-4" style={{ color: '#FF5722' }}>3. Procedimiento de Devolución</h2>
              <p className="mb-4">
                Ante una cancelación definitiva, te notificaremos vía correo electrónico. Deberás completar el formulario de reembolsos provisto para la ocasión o seguir las instrucciones indicadas. Los reembolsos se harán, en la medida de lo posible, por el mismo medio de pago que utilizaste para la compra.
              </p>
              <p>
                El plazo de reintegro puede demorar hasta 30 días hábiles posteriores a la confirmación final por parte del organizador.
              </p>
            </div>

            <div className="border-l-4 border-[#FF5722] pl-6">
              <h2 className="text-2xl font-bold text-white mb-4" style={{ color: '#FF5722' }}>4. Gastos y Comisiones</h2>
              <p>
                La comisión de JAMM por servicio, así como otros cargos o impuestos aplicables, no serán reembolsables salvo que el organizador lo disponga expresamente.
              </p>
            </div>

            <div className="border-l-4 border-[#FF5722] pl-6">
              <h2 className="text-2xl font-bold text-white mb-4" style={{ color: '#FF5722' }}>5. Reventa no Oficial</h2>
              <p>
                La devolución está autorizada sólo bajo los términos mencionados en este documento y son aplicables únicamente a los compradores directos del ticket. El proceso de devolución se llevará a cabo a través de la persona que compró el ticket por medio de la web de JAMM. Cualquier otro caso queda exceptuado de devolución.
              </p>
            </div>

            <div className="border-l-4 border-[#FF5722] pl-6">
              <h2 className="text-2xl font-bold text-white mb-4" style={{ color: '#FF5722' }}>6. Exclusiones</h2>
              <p>
                Aquellas entradas adquiridas en otros canales de venta distintos a JAMM no se rigen por esta política y su reembolso debe gestionarse directamente con la entidad vendedora original.
              </p>
            </div>

            <div className="border-l-4 border-[#FF5722] pl-6">
              <h2 className="text-2xl font-bold text-white mb-4" style={{ color: '#FF5722' }}>7. Contacto</h2>
              <p>
                Si tenés dudas adicionales, podés escribirnos a jamm.qr@gmail.com
              </p>
            </div>

            <div className="bg-[#2a2a2a] border border-[#FF5722] rounded-lg p-6 mt-8">
              <h3 className="text-xl font-semibold text-white mb-4">Información Importante</h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <span className="text-[#FF5722] font-bold">⚠️</span>
                  <p><strong>Recordá:</strong> Las compras son definitivas una vez completadas</p>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-[#FF5722] font-bold">📅</span>
                  <p><strong>Plazo:</strong> Hasta 30 días hábiles para reintegros aprobados</p>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-[#FF5722] font-bold">✉️</span>
                  <p><strong>Contacto:</strong> jamm.qr@gmail.com</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PoliticaDeDevolucion;