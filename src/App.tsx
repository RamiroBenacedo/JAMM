import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import CreateEvent from './pages/CreateEvent';
import EventDetail from './pages/EventDetail';
import Profile from './pages/Profile';
import Events from './pages/Events';
import Dashboard from './pages/Dashboard';
import Success from './pages/Success';
import MisEventos from './pages/MisEventos';
import Rrpp from './pages/Rrpp';
import EventDetailsRouter from './pages/EventDetailsRouter';
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-gray-900 flex flex-col">
          <Navbar />
          <main className="flex-grow">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/ingresar" element={<Login />} />
              <Route path="/registro" element={<Register />} />
              <Route path="/crear-evento" element={<CreateEvent />} />
              <Route path="/eventos" element={<Events />} />
              <Route path="/evento/:id" element={<EventDetail />} />
              <Route path="/eventos/:id" element={<EventDetailsRouter />} />
              <Route path="/mis-tickets" element={<Profile />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/rrpps" element={<Rrpp />} />
              <Route path="/mis-eventos" element={<MisEventos />} />
              <Route path="/success" element={<Success />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;