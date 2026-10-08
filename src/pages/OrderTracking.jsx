import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, Package, MapPin, Zap, ArrowLeft, Clock, BellRing, BellOff } from 'lucide-react';

// Pedido fictício apenas para demonstração do protótipo
const MOCK_ORDER = {
  buyer: 'Maria Eduarda',
  items: ['2x Red Bull Energy Drink', '1x Monster Energy Zero Ultra'],
  total: 32.0,
  status: 'ACCEPTED',
  paymentMethod: 'pix',
  room: 'Bloco K, Sala 201',
  referencePoint: 'Perto da escada rolante',
  createdAtTimestamp: Date.now() - 5 * 60 * 1000,
};

const OrderTracking = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(MOCK_ORDER);
  const [loading] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState('granted');
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [newAddress, setNewAddress] = useState('');

  const handleUpdateAddress = async () => {
    if (!newAddress.trim()) return;
    try {
      setOrder((prev) => ({ ...prev, room: newAddress }));
      setIsEditingAddress(false);
    } catch (error) {
      console.error("Erro ao atualizar endereço", error);
      alert("Erro ao atualizar o local. Tente novamente.");
    }
  };

  // Pedir permissão de notificação quando a tela abre
  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) return;
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
    } catch (error) {
      console.warn("Erro ao pedir permissão de notificação:", error);
    }
  };


  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-300">
        <Zap size={40} className="text-[#CFFF00] animate-bounce mb-4" />
        <p className="font-bold">Buscando seu pedido na nuvem...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-20 text-slate-300">
        <h2 className="text-2xl font-black text-white mb-2">Pedido não encontrado</h2>
        <p>Verifique o link ou volte para a página inicial.</p>
        <button onClick={() => navigate('/')} className="btn btn-primary mt-6">Voltar ao Início</button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-2xl mx-auto space-y-6 pb-12">
      <button
        onClick={() => navigate('/')}
        className="text-slate-400 hover:text-white flex items-center gap-2 text-sm font-bold transition-colors"
      >
        <ArrowLeft size={16} /> Voltar para o Cardápio RaiUva
      </button>

      <div className="glass-panel border-[#CFFF00]/40 shadow-[0_0_50px_rgba(207,255,0,0.15)]">
        <div className="text-center pb-6 border-b border-white/10 mb-6">
          <h2 className="text-3xl font-black text-white mb-2">Status do Pedido</h2>
          <p className="text-[#CFFF00] font-mono font-bold">#{orderId}</p>
        </div>

        {/* Permissão de Notificação Alerta */}
        {notificationPermission !== 'granted' && (
          <div className="bg-[#A020F0]/20 border border-[#A020F0]/50 rounded-xl p-4 mb-8 text-center animate-pulse">
            <h4 className="text-[#CFFF00] font-black text-sm mb-2 flex items-center justify-center gap-2">
              <BellOff size={18} /> Ative as Notificações
            </h4>
            <p className="text-xs text-slate-300 mb-3">
              Por favor, aceite as notificações para que avisemos o status dos seus pedidos e quando chegarmos na sua porta!
            </p>
            <button
              onClick={requestNotificationPermission}
              className="btn text-xs bg-[#A020F0] text-white py-2 px-6 shadow-[0_0_15px_rgba(160,32,240,0.4)]"
            >
              Ativar Notificações ⚡
            </button>
          </div>
        )}

        <div className="space-y-8">
          {order.status === 'CANCELLED' ? (
            <div className="bg-red-500/10 border border-red-500/40 rounded-xl p-6 text-center">
              <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/40">
                <BellOff size={32} />
              </div>
              <h3 className="text-xl font-black text-red-500 mb-2">Pedido Cancelado</h3>
              <p className="text-slate-300 text-sm mb-4">
                Infelizmente o seu pedido não pôde ser atendido no momento.
              </p>
              {order.cancelReason && (
                <div className="bg-black/50 p-4 rounded-lg border border-red-500/20 text-left">
                  <span className="text-[10px] text-red-400 font-bold uppercase tracking-widest mb-1 block">Motivo:</span>
                  <p className="text-sm text-slate-200">{order.cancelReason}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="relative pl-6 border-l-2 border-white/10 space-y-10">
            {/* Status 1: Pendente */}
            <div className="relative">
              <div className={`absolute -left-[35px] p-1.5 rounded-full border-4 border-[#0c0816] ${order.status !== 'PENDING' ? 'bg-[#00E5FF] text-black' : 'bg-[#CFFF00] text-black'
                }`}>
                <Clock size={20} />
              </div>
              <h3 className={`font-black text-lg ${order.status === 'PENDING' ? 'text-[#CFFF00]' : 'text-slate-400'}`}>
                Aguardando Confirmação
              </h3>
              <p className="text-xs text-slate-500 mt-1">O distribuidor está verificando seu pedido.</p>
            </div>

            {/* Status 2: Aceito / Preparando */}
            <div className="relative">
              <div className={`absolute -left-[35px] p-1.5 rounded-full border-4 border-[#0c0816] ${order.status === 'ACCEPTED' ? 'bg-[#CFFF00] text-black shadow-[0_0_15px_rgba(207,255,0,0.5)]' :
                  ['ARRIVED_AT_DOOR', 'COMPLETED'].includes(order.status) ? 'bg-[#00E5FF] text-black' : 'bg-slate-800 text-slate-500'
                }`}>
                <Package size={20} />
              </div>
              <h3 className={`font-black text-lg ${order.status === 'ACCEPTED' ? 'text-[#CFFF00]' : 'text-slate-400'}`}>
                Separando Bebidas ❄️
              </h3>
              <p className="text-xs text-slate-500 mt-1">Seu pedido foi aceito e está sendo levado até você.</p>
            </div>

            {/* Status 3: Na Porta */}
            <div className="relative">
              <div className={`absolute -left-[35px] p-1.5 rounded-full border-4 border-[#0c0816] ${order.status === 'ARRIVED_AT_DOOR' ? 'bg-[#CFFF00] text-black shadow-[0_0_15px_rgba(207,255,0,0.5)]' :
                  order.status === 'COMPLETED' ? 'bg-[#00E5FF] text-black' : 'bg-slate-800 text-slate-500'
                }`}>
                <MapPin size={20} />
              </div>
              <h3 className={`font-black text-lg ${order.status === 'ARRIVED_AT_DOOR' ? 'text-[#CFFF00]' : 'text-slate-400'}`}>
                Na Porta da Sala 🚪⚡
              </h3>
              <p className="text-xs text-slate-500 mt-1">O entregador chegou. Vá até a porta pegar seu pedido!</p>
            </div>

            {/* Status 4: Finalizado */}
            <div className="relative">
              <div className={`absolute -left-[35px] p-1.5 rounded-full border-4 border-[#0c0816] ${order.status === 'COMPLETED' ? 'bg-[#CFFF00] text-black shadow-[0_0_15px_rgba(207,255,0,0.5)]' : 'bg-slate-800 text-slate-500'
                }`}>
                <CheckCircle size={20} />
              </div>
              <h3 className={`font-black text-lg ${order.status === 'COMPLETED' ? 'text-[#CFFF00]' : 'text-slate-400'}`}>
                Entregue
              </h3>
              <p className="text-xs text-slate-500 mt-1">Pedido finalizado com sucesso.</p>
            </div>
            </div>
          )}
        </div>

        <div className="mt-8 pt-6 border-t border-white/10">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-white font-black text-sm">Detalhes do Pedido</h4>
            {['PENDING', 'ACCEPTED'].includes(order.status) && !isEditingAddress && (
              <button
                onClick={() => {
                  setNewAddress(order.room);
                  setIsEditingAddress(true);
                }}
                className="text-xs text-[#00E5FF] font-bold hover:underline"
              >
                Editar Local
              </button>
            )}
          </div>

          {isEditingAddress ? (
            <div className="flex flex-col gap-2 mb-3">
              <input
                type="text"
                className="w-full bg-black/50 border border-white/20 rounded-lg p-2 text-xs text-white"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                placeholder="Ex:Taguatinga Centro, Praça do Relógio,QSA 12"
                autoComplete="new-password"
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setIsEditingAddress(false)}
                  className="text-xs text-slate-400 font-bold px-3 py-1 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleUpdateAddress}
                  className="text-xs bg-[#CFFF00] text-black font-black px-4 py-1.5 rounded-lg shadow-sm"
                >
                  Salvar
                </button>
              </div>
            </div>
          ) : (
            <p className="text-slate-300 text-xs"><strong>Local:</strong> {order.room}</p>
          )}

          <p className="text-slate-300 text-xs mt-1"><strong>Cliente:</strong> {order.buyer}</p>
          <div className="mt-3 text-slate-400 text-[11px]">
            {Array.isArray(order.items) ? order.items.join(', ') : order.items}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderTracking;



