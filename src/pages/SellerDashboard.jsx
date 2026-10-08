import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Play, Pause, Package, Check, Plus, Minus, Loader2, Zap, Clock, MapPin, DollarSign, Sparkles, Eye, EyeOff, Trash2, Edit3, X, Upload, Image as ImageIcon, Link as LinkIcon, Crop, Move, Maximize2, RotateCcw, KeyRound, ShieldCheck, LogOut, Settings, Save, Shield, Cloud, Banknote, Calendar, Filter, Bell } from 'lucide-react';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, onSnapshot } from '../mocks/firestore.js';
import { db } from '../mocks/firestore.js';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { DEFAULT_ADMIN_CREDS, getAdminCredentials } from './Login';



const SellerDashboard = () => {
  const { currentUser, sellerData } = useAuth();
  const navigate = useNavigate();

  // Admin Authentication State
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(() => {
    return sessionStorage.getItem('raiuva_admin_session') === 'true';
  });
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Admin Credentials Customization State
  const [showAdminCredsModal, setShowAdminCredsModal] = useState(false);
  const [adminCreds, setAdminCreds] = useState(getAdminCredentials);
  const [editAdminEmail, setEditAdminEmail] = useState('');
  const [editAdminPassword, setEditAdminPassword] = useState('');
  const [credsSuccessMsg, setCredsSuccessMsg] = useState('');
  const [clearingDb, setClearingDb] = useState(false);

  const [activeTab, setActiveTab] = useState('menu'); // 'menu' | 'orders'
  const [isAvailable, setIsAvailable] = useState(true);
  const [orders, setOrders] = useState([]);
  const [beverages, setBeverages] = useState([]);

  // Sync store status from banco-de-dados
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'store_status'), (docSnap) => {
      if (docSnap.exists()) {
        setIsAvailable(docSnap.data().isAvailable);
      } else {
        // Se não existir o documento, criamos ele por padrão
        setDoc(doc(db, 'settings', 'store_status'), { isAvailable: true });
      }
    });
    return () => unsub();
  }, []);

  // History Filters
  const [historyDateFilter, setHistoryDateFilter] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState('ALL');

  // Add product modal state
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [addModeImage, setAddModeImage] = useState('file');
  const [newProduct, setNewProduct] = useState({
    title: '',
    category: 'monster',
    description: '',
    price: '',
    imageUrl: '',
    badge: 'Geladíssimo ❄️',
    badgeType: 'cyan',
    imageFit: 'contain',
    imagePosition: 'center'
  });
  const [addingProduct, setAddingProduct] = useState(false);

  // Edit product modal state
  const [editingProduct, setEditingProduct] = useState(null);
  const [editModeImage, setEditModeImage] = useState('file');
  const [savingEdit, setSavingEdit] = useState(false);

  // 1. REAL-TIME LISTENER FOR PRODUCTS IN CLOUD FIRESTORE
  useEffect(() => {
    const unsubProducts = onSnapshot(collection(db, 'products'), async (snapshot) => {
      if (!snapshot.empty) {
        // Enforce docSnap.id as the true primary key to avoid duplicates
        const firestoreList = snapshot.docs.map(docSnap => ({
          ...docSnap.data(),
          id: docSnap.id
        }));
        setBeverages(firestoreList);
        localStorage.setItem('raiuva_beverages_list', JSON.stringify(firestoreList));
      } else {
        setBeverages([]);
        localStorage.removeItem('raiuva_beverages_list');
      }
    }, (error) => {
      console.warn("Erro ao ouvir produtos do Firestore:", error);
    });

    return () => unsubProducts();
  }, []);

  // Notification Settings State
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [notificationConfig, setNotificationConfig] = useState({
    vibration: 'strong', // 'strong' | 'normal' | 'off'
    sound: 'on', // 'on' | 'off'
  });

  // Cancel Order Modal State
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState(null);
  const [cancelReason, setCancelReason] = useState('');

  // Notification Modal State
  const [selectedNotificationOrderId, setSelectedNotificationOrderId] = useState(null);

  // Onboarding Modal State
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Parse Push Notification URL parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('notificationOrderId');
    if (orderId) {
      setSelectedNotificationOrderId(orderId);
      // Clean up URL so it doesn't stay there
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('raiuva_onboarding_v1');
    if (!hasSeenOnboarding) {
      setShowOnboarding(true);
    }
  }, []);

  // Request Notification Permissions & Setup Listener on Mount
  useEffect(() => {
    let actionListener = null;

    const setupNotifications = async () => {
      try {
        const { display } = await LocalNotifications.requestPermissions();
        if (display !== 'granted') {
          console.warn('Permissão de notificação negada');
        } else {
          // Create high priority channel for Android
          await LocalNotifications.createChannel({
            id: 'high_priority_orders_v2',
            name: 'Novos Pedidos (Urgente)',
            description: 'Canal de prioridade máxima para novos pedidos da RaiUva',
            importance: 5, // 5 = IMPORTANCE_MAX (shows as heads-up notification)
            visibility: 1, // 1 = PUBLIC
            vibration: true,
            lights: true,
          });

          // Add listener for notification click
          actionListener = await LocalNotifications.addListener('localNotificationActionPerformed', (notificationAction) => {
            const data = notificationAction.notification.extra;
            if (data && data.orderId) {
              setSelectedNotificationOrderId(data.orderId);
            }
          });
        }
      } catch (e) {
        console.warn('LocalNotifications não suportado', e);
      }

      // OneSignal initialization moved to App.jsx to ensure it runs immediately
    };
    setupNotifications();

    return () => {
      if (actionListener) {
        actionListener.remove();
      }
    };
  }, []);

  // 2. REAL-TIME LISTENER FOR ORDERS IN CLOUD FIRESTORE
  useEffect(() => {
    let initialLoad = true;
    const unsubOrders = onSnapshot(collection(db, 'orders'), (snapshot) => {
      const ordersList = snapshot.docs.map(docSnap => ({
        ...docSnap.data(),
        id: docSnap.id
      }));
      setOrders(ordersList);

      if (!initialLoad) {
        snapshot.docChanges().forEach(async (change) => {
          if (change.type === 'added') {
            const orderData = change.doc.data();
            if (orderData.status === 'PENDING') {
              // Vibrate
              if (notificationConfig.vibration !== 'off') {
                try {
                  if (notificationConfig.vibration === 'strong') {
                    if (navigator.vibrate) {
                      navigator.vibrate([3000]);
                    } else {
                      await Haptics.vibrate({ duration: 3000 });
                    }
                  } else {
                    if (navigator.vibrate) {
                      navigator.vibrate([500]);
                    } else {
                      await Haptics.vibrate({ duration: 500 });
                    }
                  }
                } catch (e) { console.warn(e); }
              }

              // Local Notification & Sound
              if (notificationConfig.sound === 'on') {
                try {
                  await LocalNotifications.schedule({
                    notifications: [
                      {
                        title: "NOVO PEDIDO RAIUVA ⚡",
                        body: `Pedido novo recebido! Cliente: ${orderData.buyer || 'Desconhecido'}`,
                        id: Math.floor(Math.random() * 100000),
                        channelId: 'high_priority_orders_v2',
                        smallIcon: 'ic_notification',
                        extra: { orderId: change.doc.id }
                      }
                    ]
                  });
                } catch (e) { console.warn("Error scheduling notification", e); }
              }
            }
          }
        });
      }
      initialLoad = false;
    }, (error) => {
      console.warn("Erro ao ouvir pedidos:", error);
    });

    return () => unsubOrders();
  }, [notificationConfig]);

  // Admin Login Handler
  const handleAdminLogin = (e) => {
    e.preventDefault();
    setLoginError('');
    const currentCreds = getAdminCredentials();

    if (
      loginEmail.trim().toLowerCase() === currentCreds.email.toLowerCase() &&
      loginPassword === currentCreds.password
    ) {
      setIsAdminAuthenticated(true);
      sessionStorage.setItem('raiuva_admin_session', 'true');
    } else {
      setLoginError('E-mail ou senha de administrador incorretos.');
    }
  };

  const handleAdminLogout = () => {
    setIsAdminAuthenticated(false);
    sessionStorage.removeItem('raiuva_admin_session');
  };

  // Open Edit Admin Credentials Modal
  const openCredsModal = () => {
    const current = getAdminCredentials();
    setEditAdminEmail(current.email);
    setEditAdminPassword(current.password);
    setCredsSuccessMsg('');
    setShowAdminCredsModal(true);
  };

  // Save New Admin Credentials
  const handleSaveAdminCreds = (e) => {
    e.preventDefault();
    if (!editAdminEmail.trim() || !editAdminPassword.trim()) {
      alert("Por favor, preencha o e-mail e a senha.");
      return;
    }

    const newCreds = {
      email: editAdminEmail.trim().toLowerCase(),
      password: editAdminPassword.trim()
    };

    localStorage.setItem('raiuva_admin_creds', JSON.stringify(newCreds));
    setAdminCreds(newCreds);
    setCredsSuccessMsg("Credenciais salvas com sucesso! ⚡");
    setTimeout(() => {
      setShowAdminCredsModal(false);
      setCredsSuccessMsg('');
    }, 1200);
  };

  // Reset Admin Credentials to Default
  const handleResetAdminCreds = () => {
    if (window.confirm("Deseja restaurar o e-mail e senha padrão (demo@raiuva.dev / demo123)?")) {
      localStorage.setItem('raiuva_admin_creds', JSON.stringify(DEFAULT_ADMIN_CREDS));
      setAdminCreds(DEFAULT_ADMIN_CREDS);
      setEditAdminEmail(DEFAULT_ADMIN_CREDS.email);
      setEditAdminPassword(DEFAULT_ADMIN_CREDS.password);
      setCredsSuccessMsg("Restaurado para o padrão com sucesso!");
    }
  };


  const toggleAvailability = async () => {
    const newStatus = !isAvailable;
    setIsAvailable(newStatus); // Optimistic UI
    try {
      await setDoc(doc(db, 'settings', 'store_status'), { isAvailable: newStatus }, { merge: true });
    } catch (error) {
      console.warn("Erro ao atualizar status da loja", error);
    }
  };

  // Direct Cloud Firestore updates for toggles by doc.id
  const toggleBeverageAvailability = async (id) => {
    const item = beverages.find(b => b.id === id);
    if (!item) return;
    const newAvail = !item.isAvailable;

    try {
      await updateDoc(doc(db, 'products', id), { isAvailable: newAvail });
    } catch (err) {
      await setDoc(doc(db, 'products', id), { ...item, isAvailable: newAvail }, { merge: true });
    }
  };

  const handleUpdateStock = async (beverage, newStock) => {
    if (newStock < 0) newStock = 0;
    const currentStock = beverage.stock || 0;
    const currentSellerStock = beverage.sellerStock || 0;
    const delta = newStock - currentStock;

    try {
      const updates = { stock: newStock };
      
      if (delta > 0) {
        updates.sellerStock = Math.max(0, currentSellerStock - delta);
      } else if (delta < 0) {
        updates.sellerStock = currentSellerStock + Math.abs(delta);
      }

      if (newStock === 0) updates.isAvailable = false;
      await updateDoc(doc(db, 'products', beverage.id), updates);
    } catch (err) {
      console.warn("Erro ao atualizar estoque:", err);
    }
  };

  const handleUpdateSellerStock = async (id, newSellerStock) => {
    if (newSellerStock < 0) newSellerStock = 0;
    try {
      await updateDoc(doc(db, 'products', id), { sellerStock: newSellerStock });
    } catch (err) {
      console.warn("Erro ao atualizar estoque do vendedor:", err);
    }
  };

  const toggleAllOfBrand = async (brandCategory, targetStatus) => {
    const toUpdate = beverages.filter(b => brandCategory === 'all' || b.category === brandCategory);
    try {
      const promises = toUpdate.map(bev => updateDoc(doc(db, 'products', bev.id), { isAvailable: targetStatus }));
      await Promise.all(promises);
    } catch (e) {
      console.warn("Erro ao atualizar lote:", e);
    }
  };

  // Delete exactly by Firestore doc ID
  const removeBeverage = async (id) => {
    if (window.confirm("Deseja remover esta bebida do cardápio?")) {
      try {
        await deleteDoc(doc(db, 'products', id));
      } catch (err) {
        console.warn("Erro ao deletar:", err);
      }
    }
  };

  const handleDeviceImageUpload = (file, isEditing = false) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert("Por favor, selecione um arquivo de imagem válido.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64Url = e.target.result;
      if (isEditing) {
        setEditingProduct(prev => ({ ...prev, imageUrl: base64Url }));
      } else {
        setNewProduct(prev => ({ ...prev, imageUrl: base64Url }));
      }
    };
    reader.readAsDataURL(file);
  };

  const startEditBeverage = (beverage) => {
    setEditingProduct({
      ...beverage,
      id: beverage.id, // Preserva exatamente o ID do documento
      price: beverage.price.toString(),
      imageFit: beverage.imageFit || 'contain',
      imagePosition: beverage.imagePosition || 'center'
    });
  };

  // Save edit replacing the exact document by ID
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingProduct) return;
    setSavingEdit(true);

    const docId = editingProduct.id;
    const updatedItem = {
      ...editingProduct,
      id: docId,
      price: parseFloat(editingProduct.price),
      imageFit: editingProduct.imageFit || 'contain',
      imagePosition: editingProduct.imagePosition || 'center'
    };

    try {
      // Atualiza o documento exato pelo ID no Firestore sem criar duplicatas
      await setDoc(doc(db, 'products', docId), updatedItem, { merge: true });
    } catch (error) {
      console.warn("Erro ao salvar no Firestore:", error);
    } finally {
      setSavingEdit(false);
      setEditingProduct(null);
    }
  };

  const updateOrderStatus = async (id, newStatus) => {
    try {
      await updateDoc(doc(db, 'orders', id), { status: newStatus });
    } catch (error) {
      console.warn("Erro ao atualizar status:", error);
    }
  };

  const handleCancelOrder = async (e) => {
    e.preventDefault();
    if (!orderToCancel) return;

    try {
      await updateDoc(doc(db, 'orders', orderToCancel.id), {
        status: 'CANCELLED',
        cancelReason: cancelReason || 'Nenhum motivo informado pelo distribuidor.'
      });
      setShowCancelModal(false);
      setOrderToCancel(null);
      setCancelReason('');
    } catch (error) {
      console.warn("Erro ao cancelar pedido:", error);
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    setAddingProduct(true);

    const newId = 'prod-' + Date.now();
    const createdItem = {
      id: newId,
      title: newProduct.title,
      category: newProduct.category,
      description: newProduct.description,
      price: parseFloat(newProduct.price),
      badge: newProduct.badge,
      badgeType: newProduct.badgeType,
      imageUrl: newProduct.imageUrl || 'https://images.unsplash.com/photo-1622543925917-763c34d1a86e?w=600&q=80',
      imageFit: newProduct.imageFit || 'contain',
      imagePosition: newProduct.imagePosition || 'center',
      isAvailable: true,
      stock: 0,
      sellerStock: 0,
      createdAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'products', newId), createdItem);
    } catch (error) {
      console.warn("Erro ao gravar produto no Firestore:", error);
    } finally {
      setShowAddProduct(false);
      setNewProduct({
        title: '',
        category: 'monster',
        description: '',
        price: '',
        imageUrl: '',
        badge: 'Gelado ❄️',
        badgeType: 'cyan',
        imageFit: 'contain',
        imagePosition: 'center'
      });
      setAddingProduct(false);
    }
  };

  // -------------------------------------------------------------
  // ADMIN AUTHENTICATION SCREEN REMOVED
  // -------------------------------------------------------------

  const availableCount = beverages.filter(b => b.isAvailable).length;
  const deliveryOrders = orders.filter(o => o.type !== 'pdv' && !['COMPLETED', 'DELIVERED', 'completed_pdv', 'CANCELLED'].includes(o.status));
  const pdvOrders = orders.filter(o => o.type === 'pdv');
  const completedDeliveryOrders = orders.filter(o => o.type !== 'pdv' && ['COMPLETED', 'DELIVERED'].includes(o.status));

  const totalPdvSales = pdvOrders.reduce((sum, order) => sum + (order.total || 0), 0);
  const totalDeliverySales = completedDeliveryOrders.reduce((sum, order) => sum + (order.total || 0), 0);
  const totalGeneralSales = totalPdvSales + totalDeliverySales;

  return (
    <div className="animate-fade-in max-w-5xl mx-auto space-y-8 overflow-x-hidden w-full box-border">
      {/* Header with Admin Management & Cloud Status */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <button 
            onClick={() => navigate('/pdv')}
            className="mb-2 btn bg-black/60 hover:bg-[#A020F0]/20 text-white border border-[#A020F0]/40 text-xs px-3 py-1.5 flex items-center gap-2 font-bold rounded-xl transition-all shadow-[0_0_10px_rgba(160,32,240,0.3)]"
          >
            <Banknote size={14} className="text-[#CFFF00]" /> Acessar Frente de Caixa (PDV)
          </button>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <span>Painel RaiUva</span>
          </h1>
          <p className="text-slate-300 text-sm mt-1">
            Controle de estoque diário, edição de bebidas e acompanhamento de pedidos em tempo real.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowAddProduct(true)}
            className="btn btn-primary text-xs px-4 py-2.5 shadow-[0_0_20px_rgba(207,255,0,0.3)] flex items-center gap-1.5"
          >
            <Plus size={16} /> Nova Bebida
          </button>

          <button
            onClick={() => setShowNotificationSettings(true)}
            className="btn bg-[#00E5FF]/20 hover:bg-[#00E5FF]/35 text-[#00E5FF] border border-[#00E5FF]/40 text-xs px-3 py-2.5 flex items-center gap-1.5 font-bold"
            title="Configurações de Notificação"
          >
            <Bell size={14} /> Notificações
          </button>

          <button
            onClick={openCredsModal}
            className="btn bg-[#A020F0]/20 hover:bg-[#A020F0]/35 text-slate-200 border border-[#A020F0]/40 text-xs px-3 py-2.5 flex items-center gap-1.5 font-bold"
            title="Alterar e-mail e senha de administrador"
          >
            <KeyRound size={14} className="text-[#CFFF00]" /> Alterar Login Admin
          </button>
        </div>
      </div>

      {/* Availability Status Card */}
      <div className="glass-panel border-[#A020F0]/40 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-gradient-to-r from-black via-[#0c0816] to-[#150a26]">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-3 text-white">
            {isAvailable ? <Play className="text-[#CFFF00]" /> : <Pause className="text-red-400" />}
            <span>Status Geral do Delivery: </span>
            <span className={isAvailable ? 'text-[#CFFF00] font-black drop-shadow-[0_0_8px_rgba(207,255,0,0.5)]' : 'text-red-400 font-black'}>
              {isAvailable ? 'RECEBENDO PEDIDOS ⚡' : 'PAUSADO (EM AULA/PROVA)'}
            </span>
          </h2>
          <p className="text-slate-300 text-sm mt-1">
            {isAvailable
              ? `Delivery ativo no campus (V2). Atualmente ${availableCount} bebidas estão ligadas para venda no banco de dados.`
              : 'Você está em aula/prova ou fora do campus. Alunos não podem enviar novos pedidos.'}
          </p>
        </div>

        <label className="relative inline-flex items-center cursor-pointer select-none">
          <input type="checkbox" className="sr-only peer" checked={isAvailable} onChange={toggleAvailability} />
          <div className="w-16 h-8 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-black after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-black after:border-black after:border after:rounded-full after:h-7 after:w-7 after:transition-all peer-checked:bg-[#CFFF00] shadow-[0_0_15px_rgba(207,255,0,0.3)]"></div>
        </label>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-3 border-b border-white/10 pb-3 overflow-x-auto whitespace-nowrap scrollbar-hide w-full max-w-full">
        <button
          onClick={() => setActiveTab('menu')}
          className={`flex-shrink-0 btn text-sm px-6 py-2.5 rounded-xl border font-black transition-all ${activeTab === 'menu'
            ? 'bg-[#CFFF00] text-black border-[#CFFF00] shadow-[0_0_20px_rgba(207,255,0,0.3)]'
            : 'bg-black text-slate-300 border-[#A020F0]/30 hover:border-[#A020F0]/60'
            }`}
        >
          <Zap size={16} /> Cardápio ({availableCount} ativas)
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`flex-shrink-0 btn text-sm px-6 py-2.5 rounded-xl border font-black transition-all ${activeTab === 'orders'
            ? 'bg-[#CFFF00] text-black border-[#CFFF00] shadow-[0_0_20px_rgba(207,255,0,0.3)]'
            : 'bg-black text-slate-300 border-[#A020F0]/30 hover:border-[#A020F0]/60'
            }`}
        >
          <Package size={16} /> Pedidos ({deliveryOrders.length})
        </button>

        <button
          onClick={() => setActiveTab('pdv')}
          className={`flex-shrink-0 btn text-sm px-6 py-2.5 rounded-xl border font-black transition-all ${activeTab === 'pdv'
            ? 'bg-[#CFFF00] text-black border-[#CFFF00] shadow-[0_0_20px_rgba(207,255,0,0.3)]'
            : 'bg-black text-slate-300 border-[#A020F0]/30 hover:border-[#A020F0]/60'
            }`}
        >
          <Banknote size={16} /> Histórico
        </button>
      </div>

      {/* TAB 1: MENU MANAGEMENT */}
      {activeTab === 'menu' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-black/60 p-4 rounded-2xl border border-[#A020F0]/30">
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <span>Ligar, Desligar & Editar Bebidas</span>
                <span className="text-xs bg-[#A020F0]/30 text-[#00E5FF] px-2.5 py-0.5 rounded-full font-bold">
                  {availableCount} de {beverages.length} ativas
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Cada edição atualiza a bebida correspondente sem duplicar latinhas.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleAllOfBrand('all', true)}
                className="btn bg-[#A020F0]/20 hover:bg-[#A020F0]/35 text-[#CFFF00] border border-[#A020F0]/40 text-xs px-3 py-2 font-bold"
              >
                Ligar Todas
              </button>
              <button
                onClick={() => toggleAllOfBrand('all', false)}
                className="btn bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 text-xs px-3 py-2 font-bold"
              >
                Desligar Todas
              </button>
            </div>
          </div>

          {/* Beverage Switch & Edit Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {beverages.map((beverage) => (
              <div
                key={beverage.id}
                className={`glass-panel p-4 flex items-center justify-between gap-4 border transition-all ${beverage.isAvailable
                  ? 'border-[#CFFF00]/40 bg-[#120b22]/80 shadow-[0_0_15px_rgba(207,255,0,0.08)]'
                  : 'border-white/10 bg-black/50 opacity-60'
                  }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-black flex items-center justify-center border border-white/10 flex-shrink-0 p-0.5">
                    <img
                      src={beverage.imageUrl}
                      alt={beverage.title}
                      className={`w-full h-full ${beverage.imageFit === 'contain' ? 'object-contain' : 'object-cover'} ${beverage.imagePosition === 'top' ? 'object-top' :
                        beverage.imagePosition === 'bottom' ? 'object-bottom' : 'object-center'
                        }`}
                    />
                  </div>
                  <div className="min-w-0">
                    <h4 className={`font-black text-sm truncate ${beverage.isAvailable ? 'text-white' : 'text-slate-400 line-through'}`}>
                      {beverage.title}
                    </h4>
                    <span className="text-xs text-[#CFFF00] font-black block">
                      R$ {parseFloat(beverage.price).toFixed(2)}
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                      {beverage.category}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-lg border border-white/10">
                    <span className="text-[10px] uppercase font-bold text-slate-400 px-1" title="Estoque disponível para o cliente final">Venda</span>
                    <button
                      onClick={() => handleUpdateStock(beverage, (beverage.stock || 0) - 1)}
                      disabled={(beverage.stock || 0) <= 0}
                      className="p-1 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="text-xs font-black w-5 text-center text-[#CFFF00]">
                      {beverage.stock || 0}
                    </span>
                    <button
                      onClick={() => handleUpdateStock(beverage, (beverage.stock || 0) + 1)}
                      className="p-1 text-slate-400 hover:text-white transition-colors"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-lg border border-white/10">
                    <span className="text-[10px] uppercase font-bold text-slate-400 px-1" title="Estoque reservado / Controle do vendedor">Reserva</span>
                    <button
                      onClick={() => handleUpdateSellerStock(beverage.id, (beverage.sellerStock || 0) - 1)}
                      disabled={(beverage.sellerStock || 0) <= 0}
                      className="p-1 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="text-xs font-black w-5 text-center text-[#00E5FF]">
                      {beverage.sellerStock || 0}
                    </span>
                    <button
                      onClick={() => handleUpdateSellerStock(beverage.id, (beverage.sellerStock || 0) + 1)}
                      className="p-1 text-slate-400 hover:text-white transition-colors"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => startEditBeverage(beverage)}
                      className="p-1.5 rounded-lg bg-[#A020F0]/20 hover:bg-[#A020F0]/40 text-[#00E5FF] border border-[#A020F0]/30 transition-colors"
                      title="Editar Bebida e Enquadramento"
                    >
                      <Edit3 size={15} />
                    </button>

                    <label className="relative inline-flex items-center cursor-pointer select-none" title="Ligar/Desligar Visibilidade">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={beverage.isAvailable}
                        onChange={() => toggleBeverageAvailability(beverage.id)}
                      />
                      <div className="w-10 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-black after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-black after:border-black after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#CFFF00] shadow-sm"></div>
                    </label>

                    <button
                      onClick={() => removeBeverage(beverage.id)}
                      className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                      title="Excluir bebida"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: EDIT ADMIN CREDENTIALS */}
      {showAdminCredsModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md overflow-y-auto p-4 sm:p-6 flex justify-center items-start">
          <div className="relative w-full max-w-md my-8 bg-[#0c0818] border border-[#A020F0]/50 rounded-3xl p-6 sm:p-8 shadow-[0_0_60px_rgba(0,0,0,0.95)] animate-fade-in">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/10">
              <h3 className="font-black text-lg text-white flex items-center gap-2">
                <KeyRound className="text-[#CFFF00]" size={20} /> Alterar Login do Admin
              </h3>
              <button
                type="button"
                onClick={() => setShowAdminCredsModal(false)}
                className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
                title="Fechar"
              >
                <X size={20} />
              </button>
            </div>

            {credsSuccessMsg && (
              <div className="p-3 rounded-xl bg-[#CFFF00]/20 border border-[#CFFF00]/50 text-[#CFFF00] text-xs font-black mb-4 animate-fade-in">
                {credsSuccessMsg}
              </div>
            )}

            <form onSubmit={handleSaveAdminCreds} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-1">
                  Novo E-mail de Administrador
                </label>
                <input
                  type="email"
                  className="input-field text-sm"
                  value={editAdminEmail}
                  onChange={e => setEditAdminEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-1">
                  Nova Senha de Administrador
                </label>
                <input
                  type="text"
                  className="input-field text-sm font-mono"
                  value={editAdminPassword}
                  onChange={e => setEditAdminPassword(e.target.value)}
                  required
                />
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="submit"
                  className="btn btn-primary w-full py-3 text-xs font-black flex items-center justify-center gap-2"
                >
                  <Save size={16} /> Salvar Novo Login Admin ⚡
                </button>

                <button
                  type="button"
                  onClick={handleResetAdminCreds}
                  className="text-xs text-slate-400 hover:text-[#CFFF00] py-2 transition-colors"
                >
                  ↺ Restaurar para o padrão (demo@raiuva.dev / demo123)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT BEVERAGE MODAL */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md overflow-y-auto p-4 sm:p-6 flex justify-center items-start">
          <div className="relative w-full max-w-xl my-6 bg-[#0c0818] border border-[#CFFF00]/50 rounded-3xl p-6 sm:p-8 shadow-[0_0_60px_rgba(0,0,0,0.95)] animate-fade-in">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/10">
              <h3 className="font-black text-xl text-white flex items-center gap-2">
                <Edit3 className="text-[#CFFF00]" /> Editar Bebida
              </h3>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
                title="Fechar"
              >
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-1">
                  Nome da Bebida
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={editingProduct.title}
                  onChange={e => setEditingProduct({ ...editingProduct, title: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-1">
                  Marca / Categoria
                </label>
                <select
                  className="input-field bg-black text-white"
                  value={editingProduct.category}
                  onChange={e => setEditingProduct({ ...editingProduct, category: e.target.value })}
                >
                  <option value="redbull">Red Bull</option>
                  <option value="monster">Monster</option>
                  <option value="baly">Baly</option>
                  <option value="refrigerantes">Refrigerantes</option>
                  <option value="alcoolicos">Alcoólicos</option>
                  <option value="doces">Doces</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-1">
                  Preço (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="input-field"
                  value={editingProduct.price}
                  onChange={e => setEditingProduct({ ...editingProduct, price: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-1">
                  Badge / Destaque
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={editingProduct.badge || ''}
                  onChange={e => setEditingProduct({ ...editingProduct, badge: e.target.value })}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-1">
                  Descrição
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={editingProduct.description || ''}
                  onChange={e => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  required
                />
              </div>

              {/* Image Picker */}
              <div className="md:col-span-2 space-y-3 pt-2 border-t border-white/10">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-300">
                    Foto da Bebida
                  </label>
                  <div className="flex items-center gap-1 bg-black p-1 rounded-lg border border-white/10 text-xs">
                    <button
                      type="button"
                      onClick={() => setEditModeImage('file')}
                      className={`px-2.5 py-1 rounded-md font-bold flex items-center gap-1.5 transition-all ${editModeImage === 'file'
                        ? 'bg-[#A020F0] text-white'
                        : 'text-slate-400 hover:text-white'
                        }`}
                    >
                      <Upload size={12} /> Do Dispositivo
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditModeImage('url')}
                      className={`px-2.5 py-1 rounded-md font-bold flex items-center gap-1.5 transition-all ${editModeImage === 'url'
                        ? 'bg-[#A020F0] text-white'
                        : 'text-slate-400 hover:text-white'
                        }`}
                    >
                      <LinkIcon size={12} /> Link Web
                    </button>
                  </div>
                </div>

                {editModeImage === 'file' ? (
                  <div>
                    <label className="w-full flex flex-col items-center justify-center p-3 border-2 border-dashed border-[#A020F0]/50 hover:border-[#CFFF00] bg-black/60 rounded-xl cursor-pointer transition-all group">
                      <Upload size={20} className="text-[#00E5FF] group-hover:scale-110 transition-transform mb-1" />
                      <span className="text-xs font-bold text-slate-200">Trocar foto do dispositivo</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleDeviceImageUpload(e.target.files[0], true)}
                      />
                    </label>
                  </div>
                ) : (
                  <div>
                    <input
                      type="url"
                      className="input-field text-sm"
                      placeholder="https://..."
                      value={editingProduct.imageUrl || ''}
                      onChange={e => setEditingProduct({ ...editingProduct, imageUrl: e.target.value })}
                    />
                  </div>
                )}
              </div>

              {/* ENQUADRAMENTO CONTROLS */}
              {editingProduct.imageUrl && (
                <div className="md:col-span-2 bg-black/90 p-4 rounded-xl border border-[#A020F0]/40 space-y-3">
                  <h4 className="text-xs font-black text-[#CFFF00] uppercase tracking-wider flex items-center gap-2">
                    <Crop size={14} /> Ajuste de Enquadramento da Foto
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">
                          Modo de Exibição:
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingProduct({ ...editingProduct, imageFit: 'contain' })}
                            className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all ${editingProduct.imageFit === 'contain'
                              ? 'bg-[#CFFF00] text-black border-[#CFFF00] shadow-sm'
                              : 'bg-[#0f091c] text-slate-300 border-white/10'
                              }`}
                          >
                            🥫 Lata Inteira (Sem Cortes)
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingProduct({ ...editingProduct, imageFit: 'cover' })}
                            className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all ${editingProduct.imageFit === 'cover'
                              ? 'bg-[#CFFF00] text-black border-[#CFFF00] shadow-sm'
                              : 'bg-[#0f091c] text-slate-300 border-white/10'
                              }`}
                          >
                            📐 Preencher Card
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">
                          Foco da Foto (Alinhamento):
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {['top', 'center', 'bottom'].map((pos) => (
                            <button
                              key={pos}
                              type="button"
                              onClick={() => setEditingProduct({ ...editingProduct, imagePosition: pos })}
                              className={`px-2 py-1.5 rounded-lg text-xs font-bold border capitalize transition-all ${editingProduct.imagePosition === pos
                                ? 'bg-[#A020F0] text-white border-[#A020F0]'
                                : 'bg-[#0f091c] text-slate-400 border-white/10'
                                }`}
                            >
                              {pos === 'top' ? 'Topo' : pos === 'center' ? 'Centro' : 'Base'}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-[#090512] border border-white/10">
                      <span className="text-[10px] text-slate-400 font-bold mb-1">Prévia no Card do Cliente</span>
                      <div className="w-40 h-36 rounded-lg overflow-hidden bg-black flex items-center justify-center relative border border-white/10 p-1">
                        <img
                          src={editingProduct.imageUrl}
                          alt="Prévia Enquadramento"
                          className={`w-full h-full transition-all duration-200 ${editingProduct.imageFit === 'contain' ? 'object-contain' : 'object-cover'
                            } ${editingProduct.imagePosition === 'top' ? 'object-top' :
                              editingProduct.imagePosition === 'bottom' ? 'object-bottom' : 'object-center'
                            }`}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="md:col-span-2 flex justify-end gap-3 mt-4 pt-3 border-t border-white/10">
                <button
                  type="button"
                  className="btn bg-[#0e0a18] hover:bg-[#1a122c] text-slate-300 border border-white/10 text-sm"
                  onClick={() => setEditingProduct(null)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary font-black text-sm"
                  disabled={savingEdit}
                >
                  {savingEdit ? <Loader2 className="animate-spin" size={18} /> : 'Salvar Alterações ⚡'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD BEVERAGE MODAL */}
      {showAddProduct && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md overflow-y-auto p-4 sm:p-6 flex justify-center items-start">
          <div className="relative w-full max-w-xl my-6 bg-[#0c0818] border border-[#CFFF00]/40 rounded-3xl p-6 sm:p-8 shadow-[0_0_60px_rgba(0,0,0,0.95)] animate-fade-in">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/10">
              <h3 className="font-black text-xl text-white flex items-center gap-2">
                <Sparkles className="text-[#CFFF00]" /> Cadastrar Nova Bebida
              </h3>
              <button
                type="button"
                onClick={() => setShowAddProduct(false)}
                className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
                title="Fechar"
              >
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleAddProduct} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-1">
                  Nome da Bebida
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Ex: Monster Mango Loco 473ml"
                  value={newProduct.title}
                  onChange={e => setNewProduct({ ...newProduct, title: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-1">
                  Marca / Categoria
                </label>
                <select
                  className="input-field bg-black text-white"
                  value={newProduct.category}
                  onChange={e => setNewProduct({ ...newProduct, category: e.target.value })}
                >
                  <option value="redbull">Red Bull</option>
                  <option value="monster">Monster</option>
                  <option value="baly">Baly</option>
                  <option value="refrigerantes">Refrigerantes</option>
                  <option value="alcoolicos">Alcoólicos</option>
                  <option value="doces">Doces</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-1">
                  Preço (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="input-field"
                  placeholder="11.50"
                  value={newProduct.price}
                  onChange={e => setNewProduct({ ...newProduct, price: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-1">
                  Badge / Destaque (Opcional)
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Ex: Super Gelado ❄️, Zero Açúcar"
                  value={newProduct.badge}
                  onChange={e => setNewProduct({ ...newProduct, badge: e.target.value })}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-1">
                  Descrição
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Ex: Lata geladíssima, entrega em até 10 minutos."
                  value={newProduct.description}
                  onChange={e => setNewProduct({ ...newProduct, description: e.target.value })}
                  required
                />
              </div>

              {/* Image Picker Section */}
              <div className="md:col-span-2 space-y-3 pt-2 border-t border-white/10">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-300">
                    Foto da Bebida
                  </label>
                  <div className="flex items-center gap-1 bg-black p-1 rounded-lg border border-white/10 text-xs">
                    <button
                      type="button"
                      onClick={() => setAddModeImage('file')}
                      className={`px-2.5 py-1 rounded-md font-bold flex items-center gap-1.5 transition-all ${addModeImage === 'file'
                        ? 'bg-[#A020F0] text-white'
                        : 'text-slate-400 hover:text-white'
                        }`}
                    >
                      <Upload size={12} /> Do Dispositivo
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddModeImage('url')}
                      className={`px-2.5 py-1 rounded-md font-bold flex items-center gap-1.5 transition-all ${addModeImage === 'url'
                        ? 'bg-[#A020F0] text-white'
                        : 'text-slate-400 hover:text-white'
                        }`}
                    >
                      <LinkIcon size={12} /> Link Web
                    </button>
                  </div>
                </div>

                {addModeImage === 'file' ? (
                  <div>
                    <label className="w-full flex flex-col items-center justify-center p-4 border-2 border-dashed border-[#A020F0]/50 hover:border-[#CFFF00] bg-black/60 rounded-xl cursor-pointer transition-all group">
                      <Upload size={24} className="text-[#00E5FF] group-hover:scale-110 transition-transform mb-1" />
                      <span className="text-xs font-bold text-slate-200">Escolher foto do seu dispositivo</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleDeviceImageUpload(e.target.files[0], false)}
                      />
                    </label>
                  </div>
                ) : (
                  <div>
                    <input
                      type="url"
                      className="input-field text-sm"
                      placeholder="https://..."
                      value={newProduct.imageUrl}
                      onChange={e => setNewProduct({ ...newProduct, imageUrl: e.target.value })}
                    />
                  </div>
                )}
              </div>

              {/* ENQUADRAMENTO / FIT CONTROLS & PREVIEW */}
              {newProduct.imageUrl && (
                <div className="md:col-span-2 bg-black/90 p-4 rounded-xl border border-[#A020F0]/40 space-y-3">
                  <h4 className="text-xs font-black text-[#CFFF00] uppercase tracking-wider flex items-center gap-2">
                    <Crop size={14} /> Ajuste de Enquadramento
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">
                          Modo de Exibição:
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setNewProduct({ ...newProduct, imageFit: 'contain' })}
                            className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all ${newProduct.imageFit === 'contain'
                              ? 'bg-[#CFFF00] text-black border-[#CFFF00]'
                              : 'bg-[#0f091c] text-slate-300 border-white/10'
                              }`}
                          >
                            🥫 Lata Inteira
                          </button>
                          <button
                            type="button"
                            onClick={() => setNewProduct({ ...newProduct, imageFit: 'cover' })}
                            className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all ${newProduct.imageFit === 'cover'
                              ? 'bg-[#CFFF00] text-black border-[#CFFF00]'
                              : 'bg-[#0f091c] text-slate-300 border-white/10'
                              }`}
                          >
                            📐 Preencher Card
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">
                          Foco (Alinhamento):
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {['top', 'center', 'bottom'].map((pos) => (
                            <button
                              key={pos}
                              type="button"
                              onClick={() => setNewProduct({ ...newProduct, imagePosition: pos })}
                              className={`px-2 py-1.5 rounded-lg text-xs font-bold border capitalize transition-all ${newProduct.imagePosition === pos
                                ? 'bg-[#A020F0] text-white border-[#A020F0]'
                                : 'bg-[#0f091c] text-slate-400 border-white/10'
                                }`}
                            >
                              {pos === 'top' ? 'Topo' : pos === 'center' ? 'Centro' : 'Base'}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-[#090512] border border-white/10">
                      <span className="text-[10px] text-slate-400 font-bold mb-1">Prévia do Card</span>
                      <div className="w-40 h-36 rounded-lg overflow-hidden bg-black flex items-center justify-center relative border border-white/10 p-1">
                        <img
                          src={newProduct.imageUrl}
                          alt="Prévia"
                          className={`w-full h-full transition-all duration-200 ${newProduct.imageFit === 'contain' ? 'object-contain' : 'object-cover'
                            } ${newProduct.imagePosition === 'top' ? 'object-top' :
                              newProduct.imagePosition === 'bottom' ? 'object-bottom' : 'object-center'
                            }`}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="md:col-span-2 flex justify-end gap-3 mt-4 pt-3 border-t border-white/10">
                <button
                  type="button"
                  className="btn bg-[#0e0a18] hover:bg-[#1a122c] text-slate-300 border border-white/10"
                  onClick={() => setShowAddProduct(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary font-black"
                  disabled={addingProduct}
                >
                  {addingProduct ? <Loader2 className="animate-spin" size={18} /> : 'Salvar ⚡'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: ORDERS LIST SECTION */}
      {activeTab === 'orders' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <span>Pedidos</span>
              <span className="text-xs bg-[#A020F0]/25 text-[#CFFF00] px-3 py-1 rounded-full font-black border border-[#A020F0]/50">
                {deliveryOrders.length} pedidos
              </span>
            </h2>
          </div>

          {deliveryOrders.length === 0 ? (
            <div className="glass-panel text-center text-slate-400 py-12">
              Nenhum pedido de entrega ativo no momento.
            </div>
          ) : (
            deliveryOrders.map(order => (
              <div
                key={order.id}
                className="glass-panel flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3">
                    <span className="font-black text-lg text-white flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                      <span>Pedido #{order.id.slice(0, 6)} • {order.buyer}</span>
                      {order.phone && (
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(order.phone);
                            alert("Telefone copiado!");
                          }}
                          className="text-xs bg-slate-800 text-[#00E5FF] px-2 py-0.5 rounded border border-[#00E5FF]/30 font-bold hover:bg-slate-700 transition-colors cursor-pointer active:scale-95"
                          title="Copiar telefone"
                        >
                          📱 {order.phone}
                        </button>
                      )}
                    </span>
                    <span className="text-xs text-slate-400 font-medium whitespace-nowrap">
                      {order.createdAt || 'Hoje'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[#CFFF00] font-black text-sm bg-[#A020F0]/20 px-3 py-1.5 rounded-lg border border-[#A020F0]/40 w-fit">
                    <MapPin size={16} /> {order.room}
                  </div>

                  {order.referencePoint && (
                    <p className="text-xs text-slate-400 italic">
                      Referência: {order.referencePoint}
                    </p>
                  )}

                  <div className="text-sm text-slate-200">
                    <strong className="text-slate-400">Itens:</strong> {Array.isArray(order.items) ? order.items.join(', ') : order.items}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs font-black pt-1">
                    <span className="text-[#CFFF00] text-base font-black">
                      Total: R$ {parseFloat(order.total).toFixed(2)}
                    </span>
                    {order.paymentMethod === 'pix' ? (
                      <span className="text-black uppercase bg-[#CFFF00] px-2.5 py-1 rounded-lg font-black flex items-center gap-1.5 shadow-[0_0_12px_rgba(207,255,0,0.4)]">
                        <Check size={14} className="stroke-[3]" /> PIX PAGO & CONFIRMADO {order.pixTxId ? `(#${order.pixTxId})` : ''}
                      </span>
                    ) : order.paymentMethod === 'card' ? (
                      <span className="text-black uppercase bg-[#00E5FF] px-2 py-1 rounded font-black">
                        Cartão na Entrega 💳
                      </span>
                    ) : (
                      <span className="text-white uppercase bg-[#A020F0] px-2 py-1 rounded font-black">
                        Dinheiro 💵 {order.changeFor ? `(Troco p/ ${order.changeFor})` : ''}
                      </span>
                    )}
                  </div>
                </div>

                {/* Order Actions */}
                <div className="flex flex-col gap-2 w-full md:w-auto min-w-[200px]">
                  <div className={`px-4 py-1.5 rounded-xl text-xs font-black text-center border uppercase tracking-wider
                    ${order.status === 'PENDING' ? 'bg-[#A020F0]/20 text-[#CFFF00] border-[#A020F0]/50 shadow-[0_0_10px_rgba(160,32,240,0.3)]' :
                      order.status === 'ACCEPTED' ? 'bg-[#00E5FF]/20 text-[#00E5FF] border-[#00E5FF]/50 shadow-[0_0_10px_rgba(0,229,255,0.3)]' :
                        order.status === 'ARRIVED_AT_DOOR' ? 'bg-[#CFFF00]/25 text-[#CFFF00] border-[#CFFF00]/50 shadow-[0_0_15px_rgba(207,255,0,0.35)]' :
                          'bg-slate-900 text-slate-400 border-slate-800'}`}>
                    {order.status === 'PENDING' ? 'AGUARDANDO CONFIRMAÇÃO' :
                      order.status === 'ACCEPTED' ? 'SEPARANDO BEBIDAS ❄️' :
                        order.status === 'ARRIVED_AT_DOOR' ? 'NA PORTA DA SALA 🚪⚡' : 'ENTREGUE'}
                  </div>

                  {order.status === 'PENDING' && (
                    <div className="flex gap-2">
                      <button
                        className="btn btn-primary text-xs py-2.5 font-black flex-1"
                        onClick={() => updateOrderStatus(order.id, 'ACCEPTED')}
                      >
                        <Check size={16} /> Aceitar
                      </button>
                      <button
                        className="btn bg-red-500/20 text-red-500 border border-red-500/40 hover:bg-red-500/40 text-xs py-2.5 font-black px-3"
                        onClick={() => {
                          setOrderToCancel(order);
                          setCancelReason('');
                          setShowCancelModal(true);
                        }}
                        title="Recusar"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}
                  {order.status === 'ACCEPTED' && (
                    <button
                      className="btn btn-accent text-xs py-2.5 font-black"
                      onClick={() => updateOrderStatus(order.id, 'ARRIVED_AT_DOOR')}
                    >
                      <Package size={16} /> Cheguei na Porta
                    </button>
                  )}
                  {order.status === 'ARRIVED_AT_DOOR' && (
                    <button
                      className="btn bg-[#181128] hover:bg-[#251b3d] text-white border border-[#A020F0]/40 text-xs py-2.5 font-black"
                      onClick={() => updateOrderStatus(order.id, 'COMPLETED')}
                    >
                      Finalizar Entrega
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 3: HISTORY SECTION */}
      {activeTab === 'pdv' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#0a0712] p-6 rounded-2xl border border-[#CFFF00]/30 shadow-[0_0_30px_rgba(207,255,0,0.1)]">
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <Banknote className="text-[#CFFF00]" />
                <span>Histórico de Pedidos</span>
              </h2>
              <p className="text-slate-400 text-sm mt-1">
                Acompanhe o histórico de todos os pedidos, incluindo Delivery e PDV.
              </p>
            </div>
            <div className="text-right">
              <span className="block text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">Total de Vendas (Geral)</span>
              <span className="text-3xl font-black text-[#CFFF00]">R$ {totalGeneralSales.toFixed(2)}</span>
            </div>
          </div>

          <div className="bg-[#0c0818] border border-white/10 rounded-2xl p-4 sm:p-6 mb-8">
            <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Filter size={16} className="text-[#CFFF00]" /> Filtros
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                  Filtrar por Data
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input
                    type="date"
                    className="input-field pl-9 bg-black text-white w-full text-sm"
                    value={historyDateFilter}
                    onChange={(e) => setHistoryDateFilter(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                  Status do Pedido
                </label>
                <select
                  className="input-field bg-black text-white w-full text-sm"
                  value={historyStatusFilter}
                  onChange={(e) => setHistoryStatusFilter(e.target.value)}
                >
                  <option value="ALL">Todos os pedidos</option>
                  <option value="ACTIVE">Em andamento (Aguardando, Preparando, Saiu p/ Entrega)</option>
                  <option value="COMPLETED">Concluídos (Entregues/PDV)</option>
                  <option value="PENDING">Aguardando Confirmação</option>
                  <option value="ACCEPTED">Preparando</option>
                  <option value="ARRIVED_AT_DOOR">Chegou na Porta</option>
                  <option value="CANCELLED">Cancelados</option>
                </select>
              </div>
            </div>
            {(historyDateFilter || historyStatusFilter !== 'ALL') && (
              <div className="mt-3 flex justify-end">
                <button
                  className="text-xs text-[#00E5FF] hover:text-white transition-colors font-bold"
                  onClick={() => { setHistoryDateFilter(''); setHistoryStatusFilter('ALL'); }}
                >
                  Limpar Filtros
                </button>
              </div>
            )}
          </div>

          {(() => {
            const filteredHistory = orders.filter(order => {
              if (historyDateFilter) {
                if (!order.createdAtTimestamp) return false;
                const orderDate = new Date(order.createdAtTimestamp).toISOString().split('T')[0];
                if (orderDate !== historyDateFilter) return false;
              }
              if (historyStatusFilter !== 'ALL') {
                if (historyStatusFilter === 'COMPLETED' && !['DELIVERED', 'completed_pdv', 'COMPLETED'].includes(order.status)) return false;
                if (historyStatusFilter === 'ACTIVE' && ['DELIVERED', 'completed_pdv', 'COMPLETED', 'CANCELLED'].includes(order.status)) return false;
                if (historyStatusFilter !== 'COMPLETED' && historyStatusFilter !== 'ACTIVE' && order.status !== historyStatusFilter) return false;
              }
              return true;
            }).sort((a, b) => new Date(b.createdAtTimestamp || 0) - new Date(a.createdAtTimestamp || 0));

            if (filteredHistory.length === 0) {
              return (
                <div className="glass-panel text-center text-slate-400 py-12">
                  Nenhum pedido encontrado com os filtros selecionados.
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredHistory.map(order => (
                  <div key={order.id} className="glass-panel space-y-3 relative overflow-hidden">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-black text-white flex items-center gap-2">
                          Pedido #{order.id.slice(0, 6)}
                          {order.type === 'pdv' && <span className="bg-[#CFFF00]/20 text-[#CFFF00] text-[9px] px-1.5 py-0.5 rounded border border-[#CFFF00]/40 uppercase">PDV</span>}
                        </span>
                        {order.buyer && order.buyer !== 'Cliente' && (
                          <p className="text-sm text-slate-400">Cliente: {order.buyer}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="block text-xs text-slate-500 font-medium">
                          {order.createdAtTimestamp ? new Date(order.createdAtTimestamp).toLocaleString('pt-BR') : order.createdAt}
                        </span>
                      </div>
                    </div>

                    <div className="text-sm text-slate-200 bg-black/40 p-2 rounded-lg border border-white/5">
                      {Array.isArray(order.items) ? order.items.join(', ') : order.items}
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <span className="text-[#CFFF00] font-black">R$ {parseFloat(order.total || 0).toFixed(2)}</span>
                      <div className="flex gap-2 items-center">
                        <span className={`text-[10px] uppercase px-2 py-1 rounded font-black border
                          ${['COMPLETED', 'DELIVERED', 'completed_pdv'].includes(order.status) ? 'bg-[#CFFF00]/10 text-[#CFFF00] border-[#CFFF00]/30' :
                            order.status === 'CANCELLED' ? 'bg-red-500/10 text-red-400 border-red-500/30' :
                              'bg-[#00E5FF]/10 text-[#00E5FF] border-[#00E5FF]/30'}`}>
                          {['COMPLETED', 'DELIVERED', 'completed_pdv'].includes(order.status) ? 'CONCLUÍDO' :
                            order.status === 'CANCELLED' ? 'CANCELADO' : 'EM ANDAMENTO'}
                        </span>
                        {order.paymentMethod === 'pix' ? (
                          <span className="text-[10px] uppercase bg-[#CFFF00]/20 text-[#CFFF00] px-2 py-1 rounded font-black border border-[#CFFF00]/40">
                            PIX PAGO
                          </span>
                        ) : order.paymentMethod === 'card' ? (
                          <span className="text-[10px] uppercase bg-[#00E5FF]/20 text-[#00E5FF] px-2 py-1 rounded font-black border border-[#00E5FF]/40">
                            CARTÃO
                          </span>
                        ) : (
                          <span className="text-[10px] uppercase bg-[#A020F0]/20 text-[#f3e8ff] px-2 py-1 rounded font-black border border-[#A020F0]/40">
                            DINHEIRO {order.changeFor ? `(Tr: ${order.changeFor})` : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}
      {/* NOTIFICATION SETTINGS MODAL */}
      {showNotificationSettings && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in p-4" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
          <div className="glass-panel max-w-sm w-full space-y-5 border-[#00E5FF]/50 shadow-[0_0_30px_rgba(0,229,255,0.3)]">
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <Bell className="text-[#00E5FF]" /> Notificações
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-2">Vibração</label>
                <select
                  className="input-field text-sm"
                  value={notificationConfig.vibration}
                  onChange={(e) => setNotificationConfig({ ...notificationConfig, vibration: e.target.value })}
                >
                  <option value="strong">Forte (Alerta Longo)</option>
                  <option value="normal">Normal (Curto)</option>
                  <option value="off">Desativado</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-2">Som de Notificação</label>
                <select
                  className="input-field text-sm"
                  value={notificationConfig.sound}
                  onChange={(e) => setNotificationConfig({ ...notificationConfig, sound: e.target.value })}
                >
                  <option value="on">Ativado</option>
                  <option value="off">Desativado</option>
                </select>
              </div>
            </div>

            <button
              onClick={() => setShowNotificationSettings(false)}
              className="btn bg-[#00E5FF] hover:bg-[#00cce6] text-black w-full py-3 text-sm font-black mt-4 shadow-[0_0_20px_rgba(0,229,255,0.3)]"
            >
              Salvar Configurações
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* CANCEL ORDER MODAL */}
      {showCancelModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in p-4" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
          <div className="glass-panel max-w-sm w-full space-y-5 border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.3)]">
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <X className="text-red-500" /> Recusar Pedido
            </h3>

            <form onSubmit={handleCancelOrder} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-2">
                  Motivo da Recusa (Opcional)
                </label>
                <textarea
                  className="input-field text-sm min-h-[80px]"
                  placeholder="Ex: Falta de estoque, fora de rota, etc."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                ></textarea>
              </div>

              <div className="flex gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="btn bg-[#0e0a18] hover:bg-[#1a122c] text-slate-300 border border-white/10 text-sm flex-1"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  className="btn bg-red-500 hover:bg-red-600 text-white font-black text-sm flex-1 shadow-[0_0_20px_rgba(239,68,68,0.4)]"
                >
                  Confirmar Recusa
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* NOTIFICATION ORDER MODAL */}
      {selectedNotificationOrderId && (() => {
        const notificationOrder = orders.find(o => o.id === selectedNotificationOrderId);
        if (!notificationOrder) return null;

        return createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-[#0c0816] w-full max-w-md rounded-2xl border border-[#A020F0]/50 shadow-[0_0_40px_rgba(160,32,240,0.3)] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="bg-[#A020F0] p-4 flex justify-between items-center">
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <Zap className="text-[#CFFF00]" fill="currentColor" /> NOVO PEDIDO!
                </h2>
                <button onClick={() => setSelectedNotificationOrderId(null)} className="text-white hover:text-[#CFFF00]">
                  <X size={24} />
                </button>
              </div>

              {/* Content */}
              <div className="p-0 overflow-y-auto max-h-[65vh]">
                <div className="p-6 space-y-5">

                  {/* Cabeçalho do Cliente */}
                  <div className="flex flex-col gap-2 border-b border-[#A020F0]/30 pb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xl font-black text-white">{notificationOrder.buyer}</span>
                      <span className="text-xs text-slate-400 bg-slate-900 px-2.5 py-1 rounded-full border border-slate-800">
                        #{notificationOrder.id.slice(0, 6)}
                      </span>
                    </div>
                    {notificationOrder.phone && (
                      <div className="text-sm font-bold text-[#00E5FF] flex items-center gap-1.5">
                        📱 {notificationOrder.phone}
                      </div>
                    )}
                    <div className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                      <Clock size={14} className="text-[#A020F0]" />
                      {notificationOrder.createdAt || 'Agora mesmo'}
                    </div>
                  </div>

                  {/* Informações de Entrega */}
                  <div className="space-y-3 border-b border-[#A020F0]/30 pb-4">
                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">Local da Entrega</h4>
                    <div className="flex items-start gap-3">
                      <MapPin className="text-[#CFFF00] shrink-0 mt-0.5" size={18} />
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-black text-[#A020F0] uppercase bg-[#A020F0]/10 px-2 py-0.5 rounded w-fit">
                          {notificationOrder.deliveryType === 'address' || notificationOrder.address ? 'Endereço Residencial/Comercial' : 'Universidade (UCB)'}
                        </span>
                        <span className="font-bold text-white text-base leading-tight">
                          {notificationOrder.room || notificationOrder.address}
                        </span>
                      </div>
                    </div>
                    {notificationOrder.referencePoint && (
                      <div className="mt-2 text-sm text-slate-300 italic bg-white/5 p-3 rounded-xl border border-white/10">
                        <strong className="text-slate-400 not-italic block mb-1 text-xs">Ponto de Referência:</strong>
                        {notificationOrder.referencePoint}
                      </div>
                    )}
                  </div>

                  {/* Informações de Pagamento */}
                  <div className="space-y-3 border-b border-[#A020F0]/30 pb-4">
                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">Pagamento</h4>
                    <div>
                      {notificationOrder.paymentMethod === 'pix' ? (
                        <span className="text-black uppercase bg-[#CFFF00] px-3 py-1.5 rounded-lg font-black text-xs shadow-[0_0_12px_rgba(207,255,0,0.3)]">
                          PIX CONFIRMADO {notificationOrder.pixTxId ? `(#${notificationOrder.pixTxId})` : ''}
                        </span>
                      ) : notificationOrder.paymentMethod === 'card' ? (
                        <span className="text-black uppercase bg-[#00E5FF] px-3 py-1.5 rounded-lg font-black text-xs">
                          Cartão na Entrega 💳
                        </span>
                      ) : (
                        <span className="text-white uppercase bg-[#A020F0] px-3 py-1.5 rounded-lg font-black text-xs">
                          Dinheiro 💵 {notificationOrder.changeFor ? `(Troco p/ ${notificationOrder.changeFor})` : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Itens */}
                  <div className="space-y-3 pb-2">
                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">Itens do Pedido</h4>
                    <div className="space-y-2">
                      {Array.isArray(notificationOrder.items) ? (
                        notificationOrder.items.map((item, idx) => (
                          <div key={idx} className="flex text-white font-medium text-sm bg-black/30 p-2.5 rounded-lg border border-white/5">
                            <span>• {item}</span>
                          </div>
                        ))
                      ) : (
                        <div className="text-white font-medium text-sm bg-black/30 p-2.5 rounded-lg border border-white/5">
                          {notificationOrder.items}
                        </div>
                      )}
                    </div>
                  </div>

                </div>

                {/* Bloco Total Fixo */}
                <div className="bg-gradient-to-t from-black via-black/95 to-black/80 p-6 border-t border-[#A020F0]/40 flex justify-between items-center text-xl font-black text-white sticky bottom-0">
                  <span>TOTAL:</span>
                  <span className="text-[#CFFF00] text-2xl drop-shadow-[0_0_8px_rgba(207,255,0,0.5)]">
                    R$ {(notificationOrder.total || 0).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="p-4 bg-black flex gap-3 border-t border-white/10">
                <button onClick={() => {
                  setOrderToCancel(notificationOrder);
                  setCancelReason('');
                  setShowCancelModal(true);
                  setSelectedNotificationOrderId(null);
                }} className="btn bg-[#0e0a18] hover:bg-[#1a122c] text-red-500 border border-red-500/20 py-3 font-bold text-sm px-4 flex items-center gap-2 transition-colors">
                  <X size={18} /> RECUSAR
                </button>
                <button onClick={() => {
                  updateOrderStatus(notificationOrder.id, 'ACCEPTED');
                  setSelectedNotificationOrderId(null);
                  setActiveTab('orders'); // Jump to orders tab
                }} className="btn bg-[#CFFF00] hover:bg-[#aacc00] text-black flex-1 py-3 font-black text-sm flex justify-center items-center gap-2">
                  <Check size={18} /> ACEITAR PEDIDO
                </button>
              </div>
            </div>
          </div>,
          document.body
        );
      })()}

      {/* ONBOARDING MODAL (TUTORIAL) */}
      {showOnboarding && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-[#0c0816] w-full max-w-md rounded-2xl border border-[#CFFF00]/50 shadow-[0_0_40px_rgba(207,255,0,0.2)] overflow-hidden flex flex-col">
            <div className="bg-[#CFFF00] p-4 flex justify-between items-center">
              <h2 className="text-xl font-black text-black flex items-center gap-2">
                <Bell className="text-black" fill="currentColor" /> BEM-VINDO!
              </h2>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-white text-sm font-medium">
                Para que o seu celular **vibre forte** e toque um alarme quando a tela estiver apagada, siga este passo a passo (só precisa fazer isso uma vez):
              </p>

              <div className="bg-black/50 p-4 rounded-xl border border-white/10 space-y-3">
                <div className="flex gap-3 text-sm text-slate-300">
                  <span className="font-black text-[#CFFF00]">1.</span>
                  <span>Acesse as <strong>Informações do app</strong> (segurando o ícone do RaiUva).</span>
                </div>
                <div className="flex gap-3 text-sm text-slate-300">
                  <span className="font-black text-[#CFFF00]">2.</span>
                  <span>Vá em <strong>Notificações</strong>.</span>
                </div>
                <div className="flex gap-3 text-sm text-slate-300">
                  <span className="font-black text-[#CFFF00]">3.</span>
                  <span>Clique no canal chamado <strong>"Novos Pedidos (Urgente)"</strong>.</span>
                </div>
                <div className="flex gap-3 text-sm text-slate-300">
                  <span className="font-black text-[#CFFF00]">4.</span>
                  <span>Lá dentro, mude o <strong>Som</strong> para um Alarme desejado e ative/mude a <strong>Vibração</strong> para o mais forte possível!</span>
                </div>
                <div className="flex gap-3 text-sm text-slate-300">
                  <span className="font-black text-[#CFFF00]">5.</span>
                  <span>Faça o mesmo para o canal chamado <strong>Default</strong> e ative a opção <strong>Exibir na tela</strong>.</span>
                </div>
                <div className="flex gap-3 text-sm text-slate-300">
                  <span className="font-black text-[#CFFF00]">6.</span>
                  <span>Por fim, volte nas Informações do app, vá em <strong>Bateria</strong>, ative a opção <strong>Execução em segundo plano</strong>, aperte nela e selecione a opção <strong>"Sem Restrições"</strong> para não atrasar as notificações!</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-black flex gap-3 border-t border-white/10">
              <button onClick={() => {
                localStorage.setItem('raiuva_onboarding_v1', 'true');
                setShowOnboarding(false);
              }} className="btn bg-[#CFFF00] hover:bg-[#aacc00] text-black flex-1 py-3 font-black text-sm">
                Entendi, vou configurar!
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default SellerDashboard;



