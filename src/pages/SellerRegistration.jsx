import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, User, Mail, Lock, Phone, Image } from 'lucide-react';
import { createUserWithEmailAndPassword } from '../mocks/auth.js';
import { doc, setDoc, getDoc } from '../mocks/firestore.js';
import { auth, db } from '../mocks/firestore.js';
import { useAuth } from '../context/AuthContext';

const SellerRegistration = () => {
  const navigate = useNavigate();
  const { currentUser, userData, toggleMode } = useAuth();
  
  const [formData, setFormData] = useState({
    storeName: '',
    fullName: '',
    email: '',
    password: '',
    phone: '',
    logoUrl: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Se já estiver logado, preenche os dados automaticamente
  useEffect(() => {
    if (currentUser && userData) {
      setFormData(prev => ({
        ...prev,
        fullName: userData.fullName || '',
        email: userData.email || '',
        phone: userData.phone || ''
      }));
    }
  }, [currentUser, userData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    
    try {
      let uid = currentUser?.uid;

      // Se não estiver logado, cria a conta primeiro
      if (!currentUser) {
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        uid = userCredential.user.uid;

        // Salva também na coleção de users para manter a consistência
        await setDoc(doc(db, 'users', uid), {
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          role: 'seller', // Conta criada diretamente como vendedor
          createdAt: new Date().toISOString()
        });
      }

      // Cria a loja do vendedor
      await setDoc(doc(db, 'sellers', uid), {
        storeName: formData.storeName,
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        logoUrl: formData.logoUrl,
        isAvailable: true,
        createdAt: new Date().toISOString()
      });

      // Se o usuário logado acabou de criar a loja, força a mudança de modo
      if (currentUser && toggleMode) {
        // ToggleMode is called from context to trigger re-render
        // However context update is async based on firestore snapshot in real app.
        // Here we just navigate and the layout will react when it fetches sellerData.
      }

      setIsSubmitting(false);
      navigate('/seller');
      window.location.reload(); // Hard reload to force context to fetch sellerData and update UI instantly
    } catch (error) {
      console.error("Erro ao registrar vendedor:", error);
      setError(error.message);
      setIsSubmitting(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      <div className="glass-panel glass-panel-hover">
        <h2 className="text-2xl font-bold text-center mb-2">
          {currentUser ? 'Criar Minha Loja' : 'Seja um Vendedor'}
        </h2>
        <p className="text-center text-slate-400 mb-8">
          {currentUser 
            ? 'Preencha os dados da sua nova loja para começar a vender.' 
            : 'Crie sua loja e comece a vender no campus agora mesmo!'}
        </p>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-100 px-4 py-3 rounded-xl mb-6 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
              <Store size={18} /> Nome da Loja
            </label>
            <input 
              type="text" 
              name="storeName"
              className="input-field" 
              placeholder="Ex: Doces da Ana" 
              value={formData.storeName}
              onChange={handleChange}
              required
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
              <Image size={18} /> Logo da Loja (URL da Imagem)
            </label>
            <input 
              type="url" 
              name="logoUrl"
              className="input-field" 
              placeholder="Ex: https://meusite.com/minha-logo.png" 
              value={formData.logoUrl}
              onChange={handleChange}
            />
            {formData.logoUrl && (
              <div style={{ marginTop: '8px', textAlign: 'center' }}>
                <img 
                  src={formData.logoUrl} 
                  alt="Pré-visualização da Logo" 
                  style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '50%', border: '2px solid var(--primary-color)' }}
                  onError={(e) => e.target.style.display = 'none'}
                />
              </div>
            )}
          </div>

          {!currentUser && (
            <>
              <div>
                <label className="flex items-center gap-2 mb-2 text-slate-400 text-sm font-medium">
                  <User size={16} /> Nome Completo
                </label>
                <input 
                  type="text" 
                  name="fullName"
                  className="input-field" 
                  placeholder="Seu nome completo" 
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <label className="flex items-center gap-2 mb-2 text-slate-400 text-sm font-medium">
                  <Mail size={16} /> E-mail (Universitário preferencialmente)
                </label>
                <input 
                  type="email" 
                  name="email"
                  className="input-field" 
                  placeholder="seu.email@exemplo.com" 
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <label className="flex items-center gap-2 mb-2 text-slate-400 text-sm font-medium">
                  <Lock size={16} /> Senha
                </label>
                <input 
                  type="password" 
                  name="password"
                  className="input-field" 
                  placeholder="Sua senha segura" 
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <label className="flex items-center gap-2 mb-2 text-slate-400 text-sm font-medium">
                  <Phone size={16} /> WhatsApp
                </label>
                <input 
                  type="tel" 
                  name="phone"
                  className="input-field" 
                  placeholder="(61) 99999-9999" 
                  value={formData.phone}
                  onChange={handleChange}
                  required
                />
              </div>
            </>
          )}

          <button type="submit" className="btn btn-primary w-full mt-6" disabled={isSubmitting}>
            {isSubmitting ? 'Criando sua loja...' : 'Finalizar Cadastro'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SellerRegistration;



