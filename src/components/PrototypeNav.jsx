import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Store, ShoppingCart, Presentation, Monitor, Truck } from 'lucide-react';

const routes = [
  { path: '/', name: 'Catálogo', icon: Store },
  { path: '/checkout', name: 'Checkout', icon: ShoppingCart },
  { path: '/seller', name: 'Painel Vendedor', icon: Presentation },
  { path: '/pdv', name: 'PDV / Caixa', icon: Monitor },
  { path: '/tracking/pedido-teste', name: 'Rastreio', icon: Truck }
];

export default function PrototypeNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigation = (path) => {
    if (path === '/checkout') {
      navigate(path, { 
        state: { 
          cart: [{ id: 'item-1', title: 'Red Bull Energy Drink', price: 10, quantity: 2, stock: 100 }]
        } 
      });
    } else {
      navigate(path);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 w-full bg-[#0d0718]/90 backdrop-blur-md border-t border-purple-900/50 p-3 z-[9999] flex justify-around items-center">
      {routes.map((route) => {
        const Icon = route.icon;
        const isActive = location.pathname === route.path || (route.path.includes('/tracking') && location.pathname.includes('/tracking'));
        
        return (
          <button
            key={route.path}
            onClick={() => handleNavigation(route.path)}
            className={`flex flex-col items-center gap-1 transition-all ${isActive ? 'text-[#CFFF00] scale-110' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <Icon size={22} className={isActive ? 'drop-shadow-[0_0_8px_rgba(207,255,0,0.8)]' : ''} />
            <span className="text-[10px] font-bold">{route.name}</span>
          </button>
        );
      })}
    </div>
  );
}
