import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Plus, Minus, Trash2, Search, Zap, Flame, Snowflake, Clock, Beer, Cookie, Pause } from 'lucide-react';
import { collection, onSnapshot, doc } from '../mocks/firestore.js';
import { db } from '../mocks/firestore.js';

import Bull from '../components/Bull';
import logoImg from '../assets/raiuva-logo.png';

const BuyerCatalog = ({ isPDV = false }) => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isStoreAvailable, setIsStoreAvailable] = useState(true);

  // Sync store status from banco-de-dados
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'store_status'), (docSnap) => {
      if (docSnap.exists()) {
        setIsStoreAvailable(docSnap.data().isAvailable);
      }
    });
    return () => unsub();
  }, []);

  // 1. Listen to Real-time Cloud Firestore Products
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'products'), (snapshot) => {
      if (!snapshot.empty) {
        const firestoreList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setProducts(firestoreList);
        localStorage.setItem('raiuva_beverages_list', JSON.stringify(firestoreList));
      } else {
        setProducts([]);
        localStorage.removeItem('raiuva_beverages_list');
      }
    }, (err) => {
      console.warn("Lendo produtos locais:", err);
    });

    return () => unsub();
  }, []);

  const addToCart = (product) => {
    const existing = cart.find(item => item.id === product.id);
    const currentQty = existing ? existing.quantity : 0;
    const availableStock = product.stock || 0;
    
    if (currentQty >= availableStock) {
      alert(`Desculpe, temos apenas ${availableStock} unidades disponíveis no momento.`);
      return;
    }

    if (existing) {
      setCart(cart.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.id !== productId));
  };

  const decreaseQuantity = (productId) => {
    const existing = cart.find(item => item.id === productId);
    if (existing && existing.quantity === 1) {
      removeFromCart(productId);
    } else if (existing) {
      setCart(cart.map(item => item.id === productId ? { ...item, quantity: item.quantity - 1 } : item));
    }
  };

  const getProductQuantity = (productId) => {
    const item = cart.find(item => item.id === productId);
    return item ? item.quantity : 0;
  };

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalCartValue = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleCheckout = () => {
    navigate('/checkout', { state: { cart, isPDV } });
  };

  const handleBuyNow = (product) => {
    if ((product.stock || 0) <= 0) return;
    const singleItemCart = [{ ...product, quantity: 1 }];
    navigate('/checkout', { state: { cart: singleItemCart, isPDV } });
  };

  // Only show active/available beverages for buyers
  const activeProducts = products.filter(p => p.isAvailable !== false);

  // Filtering by brand and search
  const filteredProducts = activeProducts.filter(product => {
    const matchesBrand = selectedBrand === 'all' || product.category === selectedBrand;
    const matchesSearch = product.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          product.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesBrand && matchesSearch;
  });

  const brands = [
    { id: 'all', label: 'Todos', icon: Zap },
    { id: 'monster', label: 'Monster', icon: Flame },
    { id: 'redbull', label: 'Red Bull', icon: Bull },
    { id: 'baly', label: 'Baly', icon: Zap },
    { id: 'refrigerantes', label: 'Refrigerantes', icon: Snowflake },
    { id: 'alcoolicos', label: 'Alcoólicos', icon: Beer },
    { id: 'doces', label: 'Doces', icon: Cookie }
  ];



  return (
    <>
      <div className="animate-fade-in space-y-8 max-w-7xl mx-auto pb-28 md:pb-8">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-black via-[#0d0718] to-[#170a2c] border border-[#A020F0]/40 p-6 md:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#A020F0]/20 border border-[#A020F0]/50 text-[#CFFF00] text-xs font-black uppercase tracking-wider shadow-[0_0_15px_rgba(160,32,240,0.4)]">
              <Zap size={14} className="text-[#CFFF00]" /> RaiUva Drinks • Cardápio do Dia
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-white leading-tight tracking-tight">
              Energia & Refresco <br />
              <span className="bg-gradient-to-r from-[#CFFF00] via-[#00E5FF] to-white bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(207,255,0,0.3)]">
                Direto na sua Mão ⚡
              </span>
            </h1>
            <p className="text-slate-300 text-sm md:text-base">
              Bebidas selecionadas e geladas disponíveis hoje na <strong className="text-white">RaiUva</strong>. Entregamos no seu Bloco e Sala em minutos!
            </p>
          </div>
          
          {/* Logo Right Side */}
          <div className="hidden md:flex justify-center items-center opacity-80 hover:opacity-100 transition-opacity">
            <img 
              src={logoImg} 
              alt="RaiUva Icon" 
              className="w-40 h-40 lg:w-56 lg:h-56 object-contain drop-shadow-[0_0_35px_rgba(207,255,0,0.3)] hover:scale-105 transition-transform duration-500" 
            />
          </div>
        </div>

        {/* Decorative background glows */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-96 h-96 bg-[#A020F0]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-32 top-10 w-64 h-64 bg-[#00E5FF]/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Brand Filters & Search Bar */}
      <div className="space-y-4">
        {/* Search */}
        <div className="relative max-w-md">
          <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text"
            placeholder="Buscar bebida disponível hoje..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-12 py-3.5 text-sm border-[#A020F0]/40"
          />
        </div>

        {/* Brand Buttons */}
        <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none">
          {brands.map(brand => {
            const Icon = brand.icon;
            const isSelected = selectedBrand === brand.id;
            return (
              <button
                key={brand.id}
                onClick={() => setSelectedBrand(brand.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-sm whitespace-nowrap transition-all duration-200 cursor-pointer border ${
                  isSelected 
                    ? 'bg-[#CFFF00] text-black border-[#CFFF00] shadow-[0_0_20px_rgba(207,255,0,0.4)] scale-105' 
                    : 'bg-[#0a0712] hover:bg-[#150e26] text-white border-[#A020F0]/30 hover:border-[#A020F0]/60'
                }`}
              >
                <Icon size={16} className={isSelected ? 'text-black' : 'text-[#CFFF00]'} />
                {brand.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Products Grid Header */}
      <div className="flex justify-between items-center pt-2">
        <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
          <span>Disponíveis Agora</span>
          <span className="text-xs bg-[#A020F0]/30 text-[#CFFF00] border border-[#A020F0]/50 px-3 py-1 rounded-full font-bold">
            {filteredProducts.length} opções geladas
          </span>
        </h2>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {!isStoreAvailable && !isPDV ? (
          <div className="col-span-full glass-panel text-center py-16 animate-fade-in border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.1)]">
            <Pause size={48} className="text-red-400 mx-auto mb-4 animate-pulse" />
            <h3 className="text-2xl font-black text-white mb-2">Delivery Temporariamente Pausado</h3>
            <p className="text-sm text-slate-300 mb-2">
              Nossa equipe está em aula, prova, ou temporariamente indisponível.
            </p>
            <p className="text-xs text-[#CFFF00] font-bold">
              O cardápio não pode receber pedidos agora, mas voltaremos em breve! ⚡
            </p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="col-span-full glass-panel text-center py-16">
            <Clock size={40} className="text-[#CFFF00] mx-auto mb-3 opacity-70 animate-pulse" />
            <h3 className="text-lg font-black text-white mb-1">Nenhuma bebida ativa nesta categoria hoje</h3>
            <p className="text-sm text-slate-400">
              O cardápio varia diariamente. Escolha outra marca ou volte mais tarde!
            </p>
          </div>
        ) : (
          filteredProducts.map(product => {
            const quantity = getProductQuantity(product.id);

            const badgeClass = 
              product.badgeType === 'cyan' ? 'bg-[#00E5FF]/20 text-[#00E5FF] border-[#00E5FF]/40 shadow-[0_0_10px_rgba(0,229,255,0.2)]' :
              product.badgeType === 'grape' ? 'bg-[#A020F0]/25 text-[#f3e8ff] border-[#A020F0]/50 shadow-[0_0_10px_rgba(160,32,240,0.3)]' :
              'bg-[#CFFF00]/20 text-[#CFFF00] border-[#CFFF00]/40 shadow-[0_0_10px_rgba(207,255,0,0.2)]';

            const fitStyle = product.imageFit === 'contain' ? 'object-contain' : 'object-cover';
            const positionStyle = 
              product.imagePosition === 'top' ? 'object-top' :
              product.imagePosition === 'bottom' ? 'object-bottom' : 'object-center';

            return (
              <div 
                key={product.id} 
                className="glass-panel glass-panel-hover flex flex-col h-full relative group overflow-hidden"
              >
                {product.badge && (
                  <div className={`absolute top-3 left-3 z-10 backdrop-blur-md border text-[11px] font-black px-2.5 py-1 rounded-lg ${badgeClass}`}>
                    {product.badge}
                  </div>
                )}
                
                {product.stock > 0 && product.stock <= 5 && (
                  <div className="absolute top-3 right-3 z-10 bg-red-500/90 text-white text-[10px] font-black px-2 py-0.5 rounded shadow-[0_0_10px_rgba(239,68,68,0.5)] animate-pulse">
                    Restam {product.stock}
                  </div>
                )}

                <div className="w-full h-48 rounded-xl overflow-hidden mb-4 bg-black flex items-center justify-center relative border border-white/5 p-2">
                  <img 
                    src={product.imageUrl} 
                    alt={product.title} 
                    className={`w-full h-full ${fitStyle} ${positionStyle} transition-transform duration-500 ${product.stock === 0 ? 'grayscale opacity-50' : 'group-hover:scale-105'}`} 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                  {product.stock === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
                      <span className="bg-red-600 text-white font-black px-4 py-1.5 rounded-lg border border-red-400 shadow-xl transform -rotate-12 text-sm uppercase tracking-widest">
                        Esgotado ❌
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-black text-white leading-snug">{product.title}</h3>
                    <p className="text-slate-400 text-xs mt-1.5 line-clamp-2">{product.description}</p>
                  </div>

                  <div className="flex flex-wrap justify-between items-center gap-3 mt-5 pt-3 border-t border-white/10">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-black tracking-wider">Preço</span>
                      <span className="text-xl font-black text-[#CFFF00] whitespace-nowrap">
                        R$ {parseFloat(product.price).toFixed(2)}
                      </span>
                    </div>

                    {(product.stock || 0) === 0 ? (
                      <button 
                        className="btn bg-slate-800 text-slate-500 border border-slate-700 text-xs px-4 py-2 cursor-not-allowed" 
                        disabled
                      >
                        Indisponível
                      </button>
                    ) : quantity === 0 ? (
                      <div className="flex gap-2">
                          <button 
                            className="btn bg-[#00E5FF] text-black border border-[#00E5FF]/40 text-xs px-3 py-2 flex items-center gap-1 shadow-[0_0_15px_rgba(0,229,255,0.4)] hover:scale-105" 
                            onClick={() => handleBuyNow(product)}
                            title="Comprar direto"
                          >
                            <Zap size={14} /> Comprar
                          </button>
                        <button 
                          className="btn btn-primary text-xs px-3 py-2" 
                          onClick={() => addToCart(product)}
                        >
                          <Plus size={14} /> Add
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 bg-black border border-[#CFFF00]/40 rounded-xl p-1 shadow-[0_0_12px_rgba(207,255,0,0.15)]">
                        {quantity === 1 ? (
                          <button 
                            onClick={() => removeFromCart(product.id)} 
                            className="p-1 text-red-400 hover:text-red-300 transition-colors"
                            title="Remover do carrinho"
                          >
                            <Trash2 size={16} />
                          </button>
                        ) : (
                          <button 
                            onClick={() => decreaseQuantity(product.id)} 
                            className="p-1 text-slate-300 hover:text-white transition-colors"
                            title="Diminuir"
                          >
                            <Minus size={16} />
                          </button>
                        )}
                        <span className="font-black w-5 text-center text-sm text-[#CFFF00]">{quantity}</span>
                        <button 
                          onClick={() => addToCart(product)} 
                          disabled={quantity >= product.stock}
                          className="p-1 text-[#CFFF00] hover:text-white transition-colors disabled:opacity-30 disabled:hover:text-[#CFFF00]"
                          title="Aumentar"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <footer className="mt-12 flex flex-col items-center justify-center gap-3 border-t border-[#A020F0]/20 pt-8 pb-4 opacity-80 hover:opacity-100 transition-opacity">
        <a 
          href="https://www.instagram.com/raiuva_drinks/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-slate-300 hover:text-[#CFFF00] transition-colors"
        >
          <img src="/instagram-logo.png" alt="Instagram" className="w-7 h-7 object-contain" />
          <span className="font-bold tracking-wider text-sm">@raiuva_drinks</span>
        </a>
      </footer>

      </div>
      
      {/* Floating Round Cart Button */}
      {cart.length > 0 && (
        <button 
          onClick={handleCheckout}
          className="fixed bottom-6 right-6 z-50 bg-[#CFFF00] text-black w-14 h-14 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(207,255,0,0.5)] hover:scale-110 transition-transform cursor-pointer"
          title={`Ver Carrinho (R$ ${totalCartValue.toFixed(2)})`}
        >
          <ShoppingCart size={24} />
          <span className="absolute -top-1 -right-1 bg-[#A020F0] text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-black">
            {totalItems}
          </span>
        </button>
      )}
    </>
  );
};

export default BuyerCatalog;



