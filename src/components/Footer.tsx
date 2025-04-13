import React from 'react';
import { Link } from 'react-router-dom';
import { Ticket, Heart, Mail, Twitter, Instagram } from 'lucide-react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo and description */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center">
              <Ticket className="h-8 w-8 text-primary" />
              <span className="ml-2 text-2xl font-bold text-gray-900">JAMM</span>
            </div>
            <p className="mt-4 text-gray-600">
              La plataforma líder en venta de entradas para eventos. Gestiona tus eventos y vende entradas de forma segura y sencilla.
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase">
              Enlaces rápidos
            </h3>
            <ul className="mt-4 space-y-4">
              <li>
                <Link to="/eventos" className="text-gray-600 hover:text-primary transition-colors">
                  Explorar eventos
                </Link>
              </li>
              <li>
                <Link to="/crear-evento" className="text-gray-600 hover:text-primary transition-colors">
                  Crear evento
                </Link>
              </li>
              <li>
                <Link to="/perfil" className="text-gray-600 hover:text-primary transition-colors">
                  Mi perfil
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase">
              Contacto
            </h3>
            <ul className="mt-4 space-y-4">
              <li>
                <a 
                  href="mailto:jamm.qr@gmail.com" 
                  className="text-gray-600 hover:text-primary transition-colors flex items-center"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  jamm.qr@gmail.com
                </a>
              </li>
              <li>
                <a 
                  href="https://twitter.com/jamm.qr" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-gray-600 hover:text-primary transition-colors flex items-center"
                >
                  <Twitter className="h-4 w-4 mr-2" />
                  @jamm.qr
                </a>
              </li>
              <li>
                <a 
                  href="https://instagram.com/jamm.qr" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-gray-600 hover:text-primary transition-colors flex items-center"
                >
                  <Instagram className="h-4 w-4 mr-2" />
                  @jamm.qr
                </a>
              </li>
              <li className="text-gray-600 flex items-center">
                <span className="mr-2">📞</span>
                ¿Necesitás ayuda con algo?<br/>
                +54 11 2550-6290
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-200">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-600 text-sm">
              © {currentYear} JAMM. Todos los derechos reservados.
            </p>
            <div className="flex items-center mt-4 md:mt-0">
              <span className="text-gray-600 text-sm">Hecho con</span>
              <Heart className="h-4 w-4 mx-1 text-primary" />
              <span className="text-gray-600 text-sm">por el equipo de JAMM</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;