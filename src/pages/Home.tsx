import React from 'react';
import { Link } from 'react-router-dom';
import { Users } from 'lucide-react';
import ImagenHome from '../constants/img/ImagenHome.png';

const Home = () => {
  return (
    <div className="bg-[#2a2a2a]">
      {/* Hero Section */}
      <div className="relative min-h-screen flex items-center">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-r from-[#56ae4a]/20 to-transparent" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-5xl lg:text-7xl font-bold mb-6">
                La forma más
                <br />
                fácil de vender
                <br />
                <span className="gradient-text">entradas</span>
              </h1>
              
              <p className="text-xl text-gray-400 mb-8 leading-relaxed">
                Crea, vende y gestiona entradas QR para tus eventos
                <br />
                de forma segura y sencilla.
              </p>
              
              <div className="flex flex-wrap gap-4">
                {/*<Link 
                  to="/crear-evento" 
                  className="primary-button flex items-center"
                >
                  🎟️ Crea tu evento
                </Link>*/}
                {<Link 
                    to="https://wa.me/5491165822002?text=¡Hola! Quiero obtener mas información para trabajar con JAMM" 
                    target='_blank'
                    className="primary-button flex items-center"
                  >
                  💼 ¡Trabajemos juntos!
                </Link>}
                <Link 
                  to="/eventos" 
                  className="secondary-button flex items-center"
                >
                  📅 Explora eventos
                </Link>
              </div>
            </div>

            <div className="hidden lg:block">
              <img 
                src={ImagenHome}
                alt="JAMM Platform Preview"
                className="w-4/5 h-auto rounded-lg mx-auto transition-transform duration-300 hover:scale-105"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">¿Por qué elegir JAMM?</h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            La plataforma más completa para la gestión y venta de entradas para tus eventos
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-[#1f1f1f] rounded-2xl p-8 border border-gray-800 hover:border-primary/30 transition-all duration-300">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-6">
              <span className="text-2xl">🎟️</span>
            </div>
            <h3 className="text-xl font-semibold mb-3">Venta de Entradas QR</h3>
            <p className="text-gray-400">
              Genera entradas con códigos QR únicos para un control de acceso seguro y eficiente
            </p>
          </div>

          <div className="bg-[#1f1f1f] rounded-2xl p-8 border border-gray-800 hover:border-primary/30 transition-all duration-300">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-6">
              <span className="text-2xl">💰</span>
            </div>
            <h3 className="text-xl font-semibold mb-3">Cobros directo a tu cuenta</h3>
            <p className="text-gray-400">
              Las ventas de entradas van directo a tu cuenta instantaneamente
            </p>
          </div>

          <div className="bg-[#1f1f1f] rounded-2xl p-8 border border-gray-800 hover:border-primary/30 transition-all duration-300">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-6">
              <span className="text-2xl">📊</span>
            </div>
            <h3 className="text-xl font-semibold mb-3">Análisis en Tiempo Real</h3>
            <p className="text-gray-400">
              Obtén estadísticas detalladas y reportes de ventas en tiempo real
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;