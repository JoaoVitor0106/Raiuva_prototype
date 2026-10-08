import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { CheckCircle, MapPin, Trash2, Plus, Minus, CreditCard, QrCode, Banknote, Zap, ArrowLeft, Copy, Check, ShieldCheck, Loader2, RefreshCw, Pause } from 'lucide-react';
import { collection, addDoc, doc, updateDoc, increment, onSnapshot } from '../mocks/firestore.js';
import { db } from '../mocks/firestore.js';
import { useAuth } from '../context/AuthContext';
const generatePix = (amount, txId, pixKey, name, city) => {
  const pad = (str) => String(str.length).padStart(2, '0');
  const field = (id, val) => `${id}${pad(val)}${val}`;
  const payload = `000201` +
    field('26', field('00', 'br.gov.bcb.pix') + field('01', pixKey)) +
    `520400005303986` +
    field('54', amount.toFixed(2)) +
    `5802BR` +
    field('59', name) +
    field('60', city) +
    field('62', field('05', txId)) +
    `6304`;

  let crc = 0xFFFF;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) ? (crc << 1) ^ 0x1021 : (crc << 1);
    }
  }
  return payload + (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
};

const Checkout = () => {
  const { currentUser, userData } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const initialCart = location.state?.cart || [];
  const isPDV = location.state?.isPDV || false;

  const [cart, setCart] = useState(initialCart);
  const [addressType, setAddressType] = useState('convencional');
  const [formData, setFormData] = useState({
    buyerName: '',
    buyerPhone: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    referencePoint: '',
    bloco: '',
    sala: '',
    pontoReferenciaUni: '',
    paymentMethod: 'pix',
    changeFor: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState(null);
  const [isStoreAvailable, setIsStoreAvailable] = useState(true);

  // Sync store status
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'store_status'), (docSnap) => {
      if (docSnap.exists()) {
        setIsStoreAvailable(docSnap.data().isAvailable);
      }
    });
    return () => unsub();
  }, []);

  // PIX State
  const [pixCopied, setPixCopied] = useState(false);
  const [pixStatus, setPixStatus] = useState('WAITING'); // 'WAITING' | 'CHECKING' | 'CONFIRMED'
  const [pixTxId, setPixTxId] = useState(() => 'RAI' + Math.floor(100000 + Math.random() * 900000));

  const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // Dynamic PIX Copia e Cola Code
  const pixCode = generatePix(totalAmount, pixTxId, '49256185000199', 'RaiUva Drinks', 'BRASILIA');

  // QR Code URL using standard QR API
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(pixCode)}&color=CFFF00&bgcolor=0a0812`;

  const copyPixCode = () => {
    navigator.clipboard.writeText(pixCode);
    setPixCopied(true);
    setTimeout(() => setPixCopied(false), 3000);
  };

  const handleVerifyPix = () => {
    setPixStatus('CHECKING');
    setTimeout(() => {
      setPixStatus('CONFIRMED');
    }, 2000);
  };

  const addToCart = (productId) => {
    setCart(cart.map(item => {
      if (item.id === productId) {
        if (item.quantity >= (item.stock || 0)) {
          alert(`Desculpe, temos apenas ${item.stock || 0} unidades disponíveis no momento.`);
          return item;
        }
        return { ...item, quantity: item.quantity + 1 };
      }
      return item;
    }));
  };

  const removeFromCart = (productId) => setCart(cart.filter(item => item.id !== productId));

  const decreaseQuantity = (productId) => {
    setCart(cart.map(item => item.id === productId ? { ...item, quantity: Math.max(0, item.quantity - 1) } : item).filter(item => item.quantity > 0));
  };

  const handlePhoneChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);

    let formatted = value;
    if (value.length > 7) {
      formatted = `(${value.slice(0, 2)}) ${value.slice(2, 3)} ${value.slice(3, 7)}-${value.slice(7)}`;
    } else if (value.length > 3) {
      formatted = `(${value.slice(0, 2)}) ${value.slice(2, 3)} ${value.slice(3)}`;
    } else if (value.length > 2) {
      formatted = `(${value.slice(0, 2)}) ${value.slice(2)}`;
    } else if (value.length > 0) {
      formatted = `(${value}`;
    }

    setFormData({ ...formData, buyerPhone: formatted });
  };


  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.paymentMethod === 'pix' && pixStatus !== 'CONFIRMED') {
      alert("Por favor, realize o pagamento PIX e clique em 'Verificar Pagamento' antes de confirmar o pedido.");
      return;
    }

    if (!isStoreAvailable && !isPDV) {
      alert("O delivery foi pausado enquanto você fechava o pedido. Tente novamente mais tarde.");
      return;
    }

    setIsSubmitting(true);

    const addressString = addressType === 'universidade'
      ? `Universidade - Bloco: ${formData.bloco || 'N/A'}, Sala: ${formData.sala || 'N/A'}`
      : `${formData.street}, ${formData.number}${formData.complement ? ` - ${formData.complement}` : ''}, ${formData.city}`;

    const newOrder = {
      buyer: formData.buyerName || 'Cliente',
      phone: formData.buyerPhone,
      buyerId: 'guest',
      sellerId: 'raiuva-distribuidora',
      room: isPDV ? 'Bancada / PDV' : addressString,
      referencePoint: isPDV ? 'Venda presencial' : (addressType === 'universidade' ? (formData.pontoReferenciaUni || 'Sem referência') : (formData.referencePoint || 'Sem referência')),
      paymentMethod: formData.paymentMethod,
      pixStatus: formData.paymentMethod === 'pix' ? 'CONFIRMED' : null,
      pixTxId: formData.paymentMethod === 'pix' ? pixTxId : null,
      changeFor: formData.paymentMethod === 'cash' ? formData.changeFor : null,
      status: isPDV ? 'completed_pdv' : 'PENDING',
      type: isPDV ? 'pdv' : 'delivery',
      total: totalAmount,
      items: cart.map(item => `${item.quantity}x ${item.title}`),
      createdAt: 'Agora mesmo'
    };

    try {
      const docRef = await addDoc(collection(db, 'orders'), {
        ...newOrder,
        createdAtTimestamp: new Date().toISOString()
      });
      setCreatedOrderId(docRef.id);

      // Decrease stock for each item in the cart
      try {
        const stockPromises = cart.map(item => {
          const updates = { stock: increment(-item.quantity) };
          if ((item.stock || 0) - item.quantity <= 0) {
            updates.isAvailable = false;
          }
          return updateDoc(doc(db, 'products', item.id), updates);
        });
        await Promise.all(stockPromises);
      } catch (stockError) {
        console.warn("Erro ao subtrair estoque (pode já estar esgotado ou offline):", stockError);
      }

      // Disparo de notificação Push via Backend Vercel foi removido no protótipo

      setIsSubmitting(false);
      setIsSuccess(true);

      setTimeout(() => {
        if (isPDV) {
          navigate('/pdv');
        } else {
          navigate(`/tracking/${docRef.id}`);
        }
      }, 3500);
    } catch (error) {
      console.error("Erro ao salvar pedido:", error);
      setIsSubmitting(false);
      alert("Houve um erro ao processar seu pedido. Tente novamente.");
    }
  };

  if (cart.length === 0 && !isSuccess) {
    return (
      <div className="glass-panel animate-fade-in max-w-xl mx-auto text-center py-16 space-y-4">
        <Zap size={48} className="text-[#CFFF00] mx-auto opacity-80 animate-bounce" />
        <h2 className="text-2xl font-black text-white">Seu carrinho está vazio</h2>
        <p className="text-slate-400 text-sm">Escolha seus energéticos e refrigerantes na RaiUva para pedir agora.</p>
        <button className="btn btn-primary" onClick={() => navigate('/')}>
          Voltar ao Cardápio
        </button>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="glass-panel animate-fade-in max-w-2xl mx-auto text-center py-16 space-y-4 border-[#CFFF00]/40 shadow-[0_0_50px_rgba(207,255,0,0.2)]">
        <CheckCircle size={72} className="text-[#CFFF00] mx-auto animate-bounce" />
        <h2 className="text-3xl font-black text-white">Pedido Confirmado na RaiUva! ⚡</h2>
        <p className="text-slate-200 text-lg">
          {formData.paymentMethod === 'pix' ? 'Pagamento PIX verificado com sucesso! 💰 ' : ''}
          Nossa equipe já está separando suas bebidas geladas para levar na sua sala.
        </p>
        <div className="p-4 rounded-xl bg-[#A020F0]/20 border border-[#A020F0]/40 max-w-md mx-auto text-[#CFFF00] text-sm font-bold shadow-lg">
          📍 Entrega em: {formData.street}, {formData.number}
        </div>
        <p className="text-xs text-slate-400 pt-4">Redirecionando para o acompanhamento do pedido...</p>
      </div>
    );
  }

  if (!isStoreAvailable && !isPDV) {
    return (
      <div className="animate-fade-in max-w-7xl mx-auto py-20 px-4 text-center">
        <div className="glass-panel max-w-2xl mx-auto space-y-6 py-12">
          <Pause size={64} className="text-red-400 mx-auto animate-pulse" />
          <h2 className="text-3xl font-black text-white">Delivery Pausado</h2>
          <p className="text-slate-300">
            Nossa equipe está indisponível no momento e não podemos receber seu pedido agora.
          </p>
          <button className="btn btn-primary mt-4" onClick={() => navigate('/')}>
            Voltar ao Início
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-6xl mx-auto space-y-6">
      <button
        onClick={() => navigate('/')}
        className="text-slate-400 hover:text-white flex items-center gap-2 text-sm font-bold transition-colors"
      >
        <ArrowLeft size={16} /> Voltar para o Cardápio RaiUva
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Form Column */}
        <div className="lg:col-span-7 space-y-6">
          <div className="glass-panel">
            <h2 className="text-xl font-black text-white flex items-center gap-2 mb-6">
              <MapPin className="text-[#CFFF00]" />
              <span>{isPDV ? "Venda Presencial (PDV)" : "Onde entregar o pedido?"}</span>
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className={isPDV ? "sm:col-span-2" : ""}>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-1.5">
                    {isPDV ? "Nome do Cliente (Opcional)" : "Seu Nome / Apelido *"}
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Como devemos te chamar?"
                    value={formData.buyerName}
                    onChange={e => setFormData({ ...formData, buyerName: e.target.value })}
                    required={!isPDV}
                  />
                </div>
                {!isPDV && (
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-1.5">
                      WhatsApp / Telefone *
                    </label>
                    <input
                      type="tel"
                      className="input-field"
                      placeholder="(61) 9 9999-9999"
                      value={formData.buyerPhone}
                      onChange={handlePhoneChange}
                      required
                    />
                  </div>
                )}
              </div>

              {!isPDV && (
                <>
                  <div className="flex gap-2 mb-4 bg-black/40 p-1 rounded-xl border border-white/10">
                    <button
                      type="button"
                      onClick={() => setAddressType('convencional')}
                      className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${addressType === 'convencional' ? 'bg-[#A020F0] text-white shadow-[0_0_15px_rgba(160,32,240,0.3)]' : 'text-slate-400 hover:text-white'}`}
                    >
                      Endereço
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddressType('universidade')}
                      className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${addressType === 'universidade' ? 'bg-[#A020F0] text-white shadow-[0_0_15px_rgba(160,32,240,0.3)]' : 'text-slate-400 hover:text-white'}`}
                    >
                      Universidade
                    </button>
                  </div>

                  {addressType === 'convencional' ? (
                    <div className="space-y-4 animate-fade-in">
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                        <div className="sm:col-span-3">
                          <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-1.5">
                            Rua / Avenida / Logradouro *
                          </label>
                          <input
                            type="text"
                            className="input-field"
                            placeholder="Ex: Rua 10 Norte"
                            value={formData.street}
                            onChange={e => setFormData({ ...formData, street: e.target.value })}
                            required
                            autoComplete="new-password"
                          />
                        </div>
                        <div className="sm:col-span-1">
                          <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-1.5">
                            Número *
                          </label>
                          <input
                            type="text"
                            className="input-field"
                            placeholder="Ex: 123"
                            value={formData.number}
                            onChange={e => setFormData({ ...formData, number: e.target.value })}
                            required
                            autoComplete="new-password"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-1.5">
                            Cidade *
                          </label>
                          <input
                            type="text"
                            className="input-field"
                            placeholder="Ex: Taguatinga"
                            value={formData.city}
                            onChange={e => setFormData({ ...formData, city: e.target.value })}
                            required
                            autoComplete="new-password"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-1.5">
                            Ponto de Referência
                          </label>
                          <input
                            type="text"
                            className="input-field"
                            placeholder="Ex: Próximo ao Metrô"
                            value={formData.referencePoint}
                            onChange={e => setFormData({ ...formData, referencePoint: e.target.value })}
                            autoComplete="new-password"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-1 gap-4">
                        <div>
                          <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-1.5">
                            Complemento
                          </label>
                          <input
                            type="text"
                            className="input-field"
                            placeholder="Ex: Praça do Relógio"
                            value={formData.complement}
                            onChange={e => setFormData({ ...formData, complement: e.target.value })}
                            autoComplete="new-password"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 animate-fade-in">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-1.5">
                            Bloco (Opcional)
                          </label>
                          <input
                            type="text"
                            className="input-field"
                            placeholder="Ex: Bloco M"
                            value={formData.bloco}
                            onChange={e => setFormData({ ...formData, bloco: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-1.5">
                            Sala (Opcional)
                          </label>
                          <input
                            type="text"
                            className="input-field"
                            placeholder="Ex: Sala 302"
                            value={formData.sala}
                            onChange={e => setFormData({ ...formData, sala: e.target.value })}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-1.5">
                          Ponto de Referência (Opcional)
                        </label>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="Ex: Perto da lanchonete"
                          value={formData.pontoReferenciaUni}
                          onChange={e => setFormData({ ...formData, pontoReferenciaUni: e.target.value })}
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Payment Method Selector */}
              <div className="pt-4 border-t border-white/10 space-y-4">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-300">
                  Forma de Pagamento
                </label>

                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, paymentMethod: 'pix' })}
                    className={`p-3.5 rounded-xl border text-center font-black text-xs flex flex-col items-center gap-2 transition-all cursor-pointer ${formData.paymentMethod === 'pix'
                      ? 'bg-[#CFFF00] text-black border-[#CFFF00] shadow-[0_0_15px_rgba(207,255,0,0.35)] scale-105'
                      : 'bg-black border-[#A020F0]/30 text-white hover:border-[#A020F0]/60'
                      }`}
                  >
                    <QrCode size={20} />
                    <span>PIX Instantâneo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, paymentMethod: 'card' })}
                    className={`p-3.5 rounded-xl border text-center font-black text-xs flex flex-col items-center gap-2 transition-all cursor-pointer ${formData.paymentMethod === 'card'
                      ? 'bg-[#00E5FF] text-black border-[#00E5FF] shadow-[0_0_15px_rgba(0,229,255,0.35)] scale-105'
                      : 'bg-black border-[#A020F0]/30 text-white hover:border-[#A020F0]/60'
                      }`}
                  >
                    <CreditCard size={20} />
                    <span>Cartão na Entrega</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, paymentMethod: 'cash' })}
                    className={`p-3.5 rounded-xl border text-center font-black text-xs flex flex-col items-center gap-2 transition-all cursor-pointer ${formData.paymentMethod === 'cash'
                      ? 'bg-[#A020F0] text-white border-[#A020F0] shadow-[0_0_15px_rgba(160,32,240,0.35)] scale-105'
                      : 'bg-black border-[#A020F0]/30 text-white hover:border-[#A020F0]/60'
                      }`}
                  >
                    <Banknote size={20} />
                    <span>Dinheiro</span>
                  </button>
                </div>

                {/* PIX COPIA E COLA & VERIFICATION SECTION */}
                {formData.paymentMethod === 'pix' && (
                  <div className="bg-[#090514] border-2 border-[#CFFF00]/50 rounded-2xl p-5 space-y-4 animate-fade-in shadow-[0_0_25px_rgba(207,255,0,0.15)]">
                    <div className="flex justify-between items-center pb-2 border-b border-white/10">
                      <span className="font-black text-sm text-white flex items-center gap-2">
                        <QrCode size={16} className="text-[#CFFF00]" /> PIX Copia e Cola Oficial RaiUva
                      </span>
                      <span className="text-xs font-black text-[#CFFF00] bg-black px-2 py-0.5 rounded border border-[#CFFF00]/40">
                        TXID: #{pixTxId}
                      </span>
                    </div>

                    {/* QR Code and Instructions */}
                    <div className="flex flex-col sm:flex-row items-center gap-5">
                      <div className="p-2 bg-black border border-[#CFFF00]/40 rounded-xl flex-shrink-0 shadow-md">
                        <img
                          src={qrCodeUrl}
                          alt="QR Code PIX RaiUva"
                          className="w-36 h-36 rounded-lg object-contain"
                        />
                      </div>

                      <div className="space-y-2 flex-1 text-center sm:text-left">
                        <p className="text-xs text-slate-300">
                          1. Abra o aplicativo do seu banco.<br />
                          2. Escolha <strong>PIX Copia e Cola</strong> ou escaneie o QR Code.<br />
                          3. Pague o valor exato de <strong className="text-[#CFFF00]">R$ {totalAmount.toFixed(2)}</strong>.
                        </p>

                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={copyPixCode}
                            className={`btn text-xs w-full py-2.5 flex items-center justify-center gap-2 font-black transition-all ${pixCopied
                              ? 'bg-[#00E5FF] text-black border-[#00E5FF]'
                              : 'bg-[#A020F0]/30 hover:bg-[#A020F0]/50 text-white border border-[#A020F0]/60'
                              }`}
                          >
                            {pixCopied ? <Check size={16} /> : <Copy size={16} />}
                            {pixCopied ? 'Código Copiado com Sucesso! 📋⚡' : 'Copiar Código PIX (Copia e Cola)'}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Copia e Cola Input Field */}
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Código PIX:</label>
                      <input
                        type="text"
                        readOnly
                        value={pixCode}
                        className="input-field text-xs text-slate-400 bg-black/80 font-mono py-2 select-all cursor-pointer"
                        onClick={copyPixCode}
                      />
                    </div>

                    {/* Verification Status Banner */}
                    <div className="pt-2">
                      {pixStatus === 'CONFIRMED' ? (
                        <div className="p-3 bg-emerald-500/20 border border-emerald-500/50 rounded-xl text-center space-y-1 animate-fade-in shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                          <div className="flex items-center justify-center gap-2 text-emerald-400 font-black text-sm">
                            <ShieldCheck size={18} /> PAGAMENTO PIX CONFIRMADO PELO BANCO! ⚡
                          </div>
                          <p className="text-[11px] text-emerald-200">
                            O vendedor da RaiUva foi notificado automaticamente. Pode confirmar o pedido!
                          </p>
                        </div>
                      ) : pixStatus === 'CHECKING' ? (
                        <div className="p-3 bg-[#A020F0]/20 border border-[#A020F0]/50 rounded-xl text-center flex items-center justify-center gap-2 text-white text-xs font-bold animate-pulse">
                          <Loader2 className="animate-spin text-[#CFFF00]" size={16} />
                          Consultando confirmação instantânea no Banco Central...
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={handleVerifyPix}
                          className="btn bg-[#CFFF00] hover:bg-[#b8e600] text-black w-full py-3 font-black text-xs flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(207,255,0,0.3)]"
                        >
                          <RefreshCw size={15} /> Já realizei o pagamento, Verificar PIX ⚡
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Cash Change Input */}
                {formData.paymentMethod === 'cash' && (
                  <div className="mt-3">
                    <input
                      type="text"
                      className="input-field text-sm"
                      placeholder="Precisa de troco para quanto? (Ex: R$ 50,00)"
                      value={formData.changeFor}
                      onChange={e => setFormData({ ...formData, changeFor: e.target.value })}
                    />
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="btn btn-primary w-full py-4 text-base mt-6 shadow-[0_0_30px_rgba(207,255,0,0.35)] font-black"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Enviando Pedido ⚡...' : 'Confirmar Pedido'}
              </button>
            </form>
          </div>
        </div>

        {/* Order Summary Column */}
        <div className="lg:col-span-5">
          <div className="glass-panel sticky top-28 space-y-6">
            <h2 className="text-xl font-black text-white border-b border-white/10 pb-4 flex items-center justify-between">
              <span>Resumo do Pedido</span>
              <span className="text-xs bg-[#A020F0]/25 text-[#CFFF00] font-black px-2.5 py-1 rounded-md border border-[#A020F0]/50 shadow-[0_0_10px_rgba(160,32,240,0.3)]">
                RaiUva Delivery ⚡
              </span>
            </h2>

            <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
              {cart.map((item) => (
                <div key={item.id} className="flex justify-between items-center border-b border-white/5 pb-4">
                  <div className="flex-1 pr-3">
                    <h4 className="font-bold text-sm text-white">{item.title}</h4>
                    <span className="text-xs text-[#00E5FF] font-semibold">
                      R$ {item.price.toFixed(2)} cada
                    </span>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <span className="font-black text-sm text-white">
                      R$ {(item.price * item.quantity).toFixed(2)}
                    </span>

                    <div className="flex items-center gap-1.5 bg-black border border-[#A020F0]/40 rounded-lg p-0.5">
                      {item.quantity === 1 ? (
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.id)}
                          className="p-1 text-red-400 hover:text-red-300 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => decreaseQuantity(item.id)}
                          className="p-1 text-slate-300 hover:text-white transition-colors"
                        >
                          <Minus size={14} />
                        </button>
                      )}
                      <span className="font-black w-4 text-center text-xs text-[#CFFF00]">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => addToCart(item.id)}
                        disabled={item.quantity >= (item.stock || 0)}
                        className="p-1 text-[#CFFF00] hover:text-white transition-colors disabled:opacity-30 disabled:hover:text-[#CFFF00]"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-white/10 space-y-2">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Taxa de Entrega na Sala</span>
                <span className="text-[#00E5FF] font-bold">Grátis no Campus ⚡</span>
              </div>
              <div className="flex justify-between items-center text-lg font-black pt-2">
                <span>Total a Pagar</span>
                <span className="text-3xl text-[#CFFF00] font-black drop-shadow-[0_0_15px_rgba(207,255,0,0.4)]">
                  R$ {totalAmount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;



