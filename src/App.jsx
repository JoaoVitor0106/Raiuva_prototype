import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import BuyerCatalog from './pages/BuyerCatalog';
import Checkout from './pages/Checkout';
import SellerDashboard from './pages/SellerDashboard';
import SellerRegistration from './pages/SellerRegistration';
import SellerStore from './pages/SellerStore';
import Login from './pages/Login';
import RegisterClient from './pages/RegisterClient';
import OrderTracking from './pages/OrderTracking';
import { AuthProvider } from './context/AuthContext';
import PrototypeNav from './components/PrototypeNav';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="flex flex-col min-h-screen overflow-x-hidden w-full max-w-full relative pb-16">
          <Navbar />
          <main className="flex-1 w-full max-w-full mx-auto px-4 pt-8 pb-24 overflow-x-hidden box-border">
            <Routes>
              <Route path="/" element={<BuyerCatalog isPDV={false} />} />
              <Route path="/pdv" element={<BuyerCatalog isPDV={true} />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/seller" element={<SellerDashboard />} />
              <Route path="/register-seller" element={<SellerRegistration />} />
              <Route path="/register" element={<RegisterClient />} />
              <Route path="/login" element={<Login />} />
              <Route path="/store/:sellerId" element={<SellerStore />} />
              <Route path="/tracking/:orderId" element={<OrderTracking />} />
            </Routes>
          </main>
          <PrototypeNav />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
