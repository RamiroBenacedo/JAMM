import React from 'react';
import { Link } from 'react-router-dom';
import { Ticket, Heart, Mail, Twitter, Instagram } from 'lucide-react';
import LogoImage from '../constants/img/logo.png';
import CreateEventButton from './CreateEventButton';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          {/* Logo and description */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center">
              <img src={LogoImage} alt="Logo" className="h-30 w-40" />
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase">
              Enlaces rápidos
            </h3>
            <ul className="mt-4 space-y-4">
              <li>
                <Link to="/eventos" className="text-gray-600 hover:text-[#FF5722] transition-colors">
                  Explorar eventos
                </Link>
              </li>
              <li>
                <CreateEventButton className="text-gray-600 hover:text-[#FF5722] transition-colors">
                  Crear evento
                </CreateEventButton>
              </li>
            </ul>
          </div>

          {/* Legales */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase">
              Legales
            </h3>
            <ul className="mt-4 space-y-4">
              <li>
                <Link to="/terminos-y-condiciones" className="text-gray-600 hover:text-[#FF5722] transition-colors">
                  Términos y condiciones
                </Link>
              </li>
              <li>
                <Link to="/politica-de-devolucion" className="text-gray-600 hover:text-[#FF5722] transition-colors">
                  Política de devoluciones
                </Link>
              </li>
              <li>
                <Link to="/politica-de-privacidad" className="text-gray-600 hover:text-[#FF5722] transition-colors">
                  Política de privacidad
                </Link>
              </li>
              <li>
                <Link to="/defensa-del-consumidor" className="text-gray-600 hover:text-[#FF5722] transition-colors">
                  Ley de defensa al consumidor
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
                  className="text-gray-600 hover:text-[#FF5722] transition-colors flex items-center"
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
                  className="text-gray-600 hover:text-[#FF5722] transition-colors flex items-center"
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
                  className="text-gray-600 hover:text-[#FF5722] transition-colors flex items-center"
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
              <Heart className="h-4 w-4 mx-1" style={{ color: '#FF5722' }} />
              <span className="text-gray-600 text-sm">por el equipo de JAMM</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;