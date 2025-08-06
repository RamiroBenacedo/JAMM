import React, { useState } from 'react';
import AsignarUsuario from '../components/AsignarUsuario';
import ListaUsuariosEvento from '../components/ListaUsuariosEvento';

const RrppPage: React.FC = () => {
  const [refreshFlag, setRefreshFlag] = useState(false);

  const handleUsuarioAsignado = () => {
    setRefreshFlag(prev => !prev);
  };

  return (
    <div className="min-h-screen bg-[#2a2a2a] py-4 lg:py-8">
      <div className="px-4 sm:px-6 lg:px-8 max-w-[95vw] mx-auto">
        <h1 className="text-2xl lg:text-3xl font-bold text-white mb-4 lg:mb-6 text-left lg:text-center">
          Gestión de RRPPs
        </h1>

        <div className="space-y-4 lg:space-y-6 overflow-hidden">
          <AsignarUsuario onUsuarioAsignado={handleUsuarioAsignado} />
          <div className="overflow-hidden">
            <ListaUsuariosEvento refreshFlag={refreshFlag} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default RrppPage;