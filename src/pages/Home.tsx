import React from 'react';
import { Link } from 'react-router-dom';
import { Users } from 'lucide-react';
import HomeImage from '../constants/img/HomeImage.png';
import CreateEventButton from '../components/CreateEventButton';

const Home = () => {
  return (
    <div className="bg-white">
      {/* Hero Section */}
      <div className="relative min-h-screen flex items-start">
        <div className="absolute inset-0">
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-5 items-center lg:items-start lg:mt-[8vh]">
              <div className="mt-[2vh] lg:mt-0 lg:order-2 lg:w-[75%] lg:ml-auto">
                <img src={HomeImage} alt="HomeImage" className="w-full h-full object-cover" />
              </div>
              <div className="lg:order-1 lg:pr-12 lg:mt-[4vh]">
                <h1 className="text-[38px] lg:text-[64px] font-normal mb-2 text-[#232323] text-left leading-[45px] lg:leading-[110%] tracking-[-0.03em] lg:tracking-[0.02em] font-anton">
                  ACÁ ESTÁN LAS MEJORES
                  <br />
                  EXPERIENCIAS
                </h1>
                <h1 className="text-[17px] lg:text-[24px] font-light mb-8 text-[#232323] text-left leading-[20px] lg:leading-[140%] tracking-[0] lg:tracking-[0.01em] font-sf-pro">
                  Shows increibles. Compra facil. Sugerencias semanales. JAMM hace que salir sea facil y divertido.
                </h1>
                
                <div className="flex flex-col lg:flex-row gap-4 justify-start">
                  {<Link 
                    to="/eventos" 
                    className="primary-button flex items-center lg:text-lg"
                    style={{ background: '#FF5722', color: '#232323' }}
                  >
                    📅  Explorar eventos
                  </Link>}
                  <CreateEventButton
                    className="secondary-button flex items-center lg:text-lg"
                    style={{ borderColor: '#232323', color: '#FF5722', background: 'transparent' }}
                  >
                    💼 ¡Crea tu evento!
                  </CreateEventButton>
                </div>
              </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Home;