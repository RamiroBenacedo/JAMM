import React, { useState } from 'react';
import AsignarUsuario from '../components/AsignarUsuario';
import ListaUsuariosEvento from '../components/ListaUsuariosEvento';

const RrppPage: React.FC = () => {
  const [refreshFlag, setRefreshFlag] = useState(false);

  const handleUsuarioAsignado = () => {
    setRefreshFlag(prev => !prev);
  };

  return (
    <div className="min-h-screen bg-[#2a2a2a] py-8 flex flex-col items-center">
      <div className="w-full max-w-4xl px-4">
        <h1 className="text-3xl font-bold text-white mb-6 text-center">Gestión de RRPPs</h1>

        <AsignarUsuario onUsuarioAsignado={handleUsuarioAsignado} />

        <ListaUsuariosEvento refreshFlag={refreshFlag} />
      </div>
    </div>
  );
};

export default RrppPage;