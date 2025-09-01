import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import SecurityHeaders from './components/SecurityHeaders';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import RecuperarPassword from './pages/RecuperarPassword';
import RestablecerPassword from './pages/RestablecerPassword';
import ConfirmarEmail from './pages/ConfirmarEmail';
import CreateEvent from './pages/CreateEvent';
import EventDetail from './pages/EventDetail';
import Profile from './pages/Profile';
import Events from './pages/Events';
import Success from './pages/Success';
import MisEventos from './pages/MisEventos';
import Rrpp from './pages/Rrpp';
import Configuracion from './pages/Configuracion';
import EventDetailsRouter from './pages/EventDetailsRouter';
import TerminosYCondiciones from './pages/TerminosYCondiciones';
import PoliticaDePrivacidad from './pages/PoliticaDePrivacidad';
import PoliticaDeDevolucion from './pages/PoliticaDeDevolucion';
import DefensaDelConsumidor from './pages/DefensaDelConsumidor';
function App() {
  return (
    <SecurityHeaders>
      <AuthProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-gray-900 flex flex-col">
            <Navbar />
            <main className="flex-grow">
              <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/ingresar" element={<Login />} />
              <Route path="/registro" element={<Register />} />
              <Route path="/recuperar-password" element={<RecuperarPassword />} />
              <Route path="/restablecer-password" element={<RestablecerPassword />} />
              <Route path="/confirmar-email" element={<ConfirmarEmail />} />
              <Route path="/crear-evento" element={<CreateEvent />} />
              <Route path="/eventos" element={<Events />} />
              <Route path="/evento/:id" element={<EventDetail />} />
              <Route path="/eventos/:id" element={<EventDetailsRouter />} />
              <Route path="/mis-tickets" element={<Profile />} />
              <Route path="/rrpps" element={<Rrpp />} />
              <Route path="/mis-eventos" element={<MisEventos />} />
              <Route path="/success" element={<Success />} />
              <Route path="/configuracion" element={<Configuracion />} />
              <Route path="/terminos-y-condiciones" element={<TerminosYCondiciones />} />
              <Route path="/politica-de-privacidad" element={<PoliticaDePrivacidad />} />
              <Route path="/politica-de-devolucion" element={<PoliticaDeDevolucion />} />
              <Route path="/defensa-del-consumidor" element={<DefensaDelConsumidor />} />
            </Routes>
            </main>
            <Footer />
          </div>
        </BrowserRouter>
      </AuthProvider>
    </SecurityHeaders>
  );
}

export default App;