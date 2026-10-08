import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Zap, User, LogOut, LogIn, ArrowRightLeft, ShieldCheck, Download } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Capacitor } from '@capacitor/core';
import RaivaLogo from './RaivaLogo';
const Navbar = () => {
  const { currentUser, userData, sellerData, isSellerMode, toggleMode, logout, isLocalAdmin } = useAuth();
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    const hasDismissed = localStorage.getItem('raiuva_install_dismissed');
    
    if (!Capacitor.isNativePlatform() && !isStandalone && !hasDismissed) {
      setShowInstallBtn(true);
    }

    const handleBeforeInstallPrompt = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    setShowInstallBtn(false);
    localStorage.setItem('raiuva_install_dismissed', 'true');

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      alert("Para instalar, acesse as Opções do Navegador (Android) ou menu de Compartilhar (iPhone) e toque em 'Adicionar à Tela de Início'!");
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error("Erro ao sair", error);
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-black/85 backdrop-blur-xl border-b border-[#A020F0]/30 shadow-2xl mb-8 transition-all duration-300">
      <div className="container mx-auto px-4 h-20 flex items-center justify-between relative">
        {/* Left Side: Install App */}
        <div className="flex items-center">
          {showInstallBtn && (
            <button 
              onClick={handleInstallClick} 
              className="btn bg-[#00E5FF] text-black border-[#00E5FF] shadow-[0_0_15px_rgba(0,229,255,0.4)] text-[10px] sm:text-xs px-2 py-1.5 rounded-lg font-black flex items-center gap-1 hover:scale-105 transition-transform"
            >
              <Download size={14} /> <span className="hidden sm:inline">Instalar App</span><span className="sm:hidden">Instalar</span>
            </button>
          )}
        </div>

        {/* Center: Brand Logo */}
        <Link to="/" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hover:opacity-95 transition-opacity z-10">
          <RaivaLogo size={42} />
        </Link>
        
        <div className="flex items-center gap-3 sm:gap-6">
          {/* Always show Comprar if in Buyer Mode */}
          {!isSellerMode && (
            <Link to="/" className="btn bg-[#A020F0]/15 hover:bg-[#A020F0]/30 text-white border border-[#A020F0]/40 text-sm">
              <Zap size={18} className="text-[#CFFF00]" /> <span className="hidden sm:inline font-bold">Cardápio</span>
            </Link>
          )}

          {currentUser || isLocalAdmin ? (
            <>
              {Capacitor.isNativePlatform() && (sellerData || isLocalAdmin ? (
                /* Toggle for RaiUva Admin/Seller */
                <button 
                  onClick={() => {
                    toggleMode();
                    navigate(isSellerMode ? '/' : '/seller');
                  }} 
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#CFFF00]/40 bg-[#CFFF00]/10 text-[#CFFF00] hover:bg-[#CFFF00]/20 transition-all shadow-lg hover:shadow-[0_0_15px_rgba(207,255,0,0.25)] text-sm font-bold"
                >
                  <ArrowRightLeft size={16} />
                  <span className="hidden sm:inline font-bold">
                    {isSellerMode ? 'Ver Loja (Cliente)' : 'Painel RaiUva'}
                  </span>
                </button>
              ) : (
                /* Non-seller users */
                <Link to="/seller" className="btn btn-primary text-sm shadow-[0_0_20px_rgba(207,255,0,0.3)]">
                  <ShieldCheck size={18} /> <span className="hidden lg:inline">Acesso Distribuidora</span>
                </Link>
              ))}

              <div className="flex items-center gap-3 pl-3 border-l border-white/10">
                <span className="hidden md:inline text-xs text-slate-300">
                  Olá, <strong className="text-white">{userData?.fullName?.split(' ')[0] || (isLocalAdmin ? 'Admin' : 'Cliente')}</strong>
                </span>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;


