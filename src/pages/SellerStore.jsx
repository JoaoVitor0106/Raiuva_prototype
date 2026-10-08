import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShoppingCart, ArrowLeft, Store } from 'lucide-react';
import { doc, getDoc, collection, query, where, getDocs } from '../mocks/firestore.js';
import { db } from '../mocks/firestore.js';

const SellerStore = () => {
  const { sellerId } = useParams();
  const navigate = useNavigate();
  const [sellerInfo, setSellerInfo] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);

  useEffect(() => {
    const fetchSellerData = async () => {
      try {
        const sellerRef = doc(db, 'sellers', sellerId);
        const sellerSnap = await getDoc(sellerRef);
        
        if (sellerSnap.exists()) {
          setSellerInfo(sellerSnap.data());
          
          const q = query(collection(db, 'products'), where('sellerId', '==', sellerId));
          const querySnapshot = await getDocs(q);
          const productsList = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setProducts(productsList);
        }
      } catch (error) {
        console.error("Erro ao buscar dados do vendedor:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSellerData();
  }, [sellerId]);

  if (loading) {
    return <div style={{ padding: '48px', textAlign: 'center' }}>Carregando loja...</div>;
  }

  if (!sellerInfo) {
    return (
      <div className="glass-panel" style={{ textAlign: 'center', padding: '48px' }}>
        <h2>Loja não encontrada</h2>
        <button className="btn btn-primary" onClick={() => navigate('/')} style={{ marginTop: '16px' }}>
          Voltar para Início
        </button>
      </div>
    );
  }

  const addToCart = (product) => {
    // Basic add to cart for demonstration
    setCart([...cart, { ...product, quantity: 1 }]);
  };

  const handleCheckout = () => {
    if (cart.length > 0) {
      navigate('/checkout', { state: { cart } });
    }
  };

  return (
    <div className="animate-fade-in max-w-7xl mx-auto space-y-8">
      <button className="btn bg-transparent hover:bg-white/5 text-slate-300 mb-4" onClick={() => navigate('/')}>
        <ArrowLeft size={20} /> Voltar para Lojas
      </button>

      {/* Seller Header */}
      <div className="glass-panel flex flex-col md:flex-row items-center gap-6">
        {sellerInfo.logoUrl ? (
          <img src={sellerInfo.logoUrl} alt={sellerInfo.storeName} className="w-24 h-24 rounded-full object-cover border-4 border-emerald-500 shadow-xl shadow-emerald-500/20" />
        ) : (
          <div className="w-24 h-24 rounded-full bg-emerald-500 flex items-center justify-center shadow-xl shadow-emerald-500/20">
            <Store size={40} className="text-white" />
          </div>
        )}
        <div className="text-center md:text-left">
          <h1 className="text-3xl font-bold mb-2">{sellerInfo.storeName || sellerInfo.fullName}</h1>
          <p className="text-slate-400">{sellerInfo.description || "O melhor lanche da universidade você encontra aqui!"}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold">Produtos</h2>
        <button className="btn btn-accent w-full sm:w-auto" onClick={handleCheckout} disabled={cart.length === 0}>
          <ShoppingCart size={20} /> Carrinho ({cart.length})
        </button>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.length === 0 ? (
          <p>Esta loja ainda não possui produtos cadastrados.</p>
        ) : (
          products.map(product => (
          <div key={product.id} className="glass-panel glass-panel-hover flex flex-col h-full">
            <img 
              src={product.imageUrl} 
              alt={product.title} 
              className="w-full h-48 object-cover rounded-xl mb-4" 
            />
            <h3 className="text-xl font-bold text-slate-100">{product.title}</h3>
            <p className="text-slate-400 text-sm flex-1 mt-1 mb-4">{product.description}</p>
            
            <div className="flex justify-between items-center mt-auto pt-4 border-t border-white/5">
              <span className="text-xl font-bold text-emerald-400">R$ {parseFloat(product.price).toFixed(2)}</span>
              <button className="btn btn-primary text-sm px-4 py-2" onClick={() => addToCart(product)}>
                Adicionar
              </button>
            </div>
          </div>
        )))}
      </div>
    </div>
  );
};

export default SellerStore;



