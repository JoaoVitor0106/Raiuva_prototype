import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Mail, Lock, Phone, Zap } from 'lucide-react';
import { createUserWithEmailAndPassword } from '../mocks/auth.js';
import { doc, setDoc } from '../mocks/firestore.js';
import { auth, db } from '../mocks/firestore.js';
import RaivaLogo from '../components/RaivaLogo';

const RegisterClient = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;

      await setDoc(doc(db, 'users', user.uid), {
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        role: 'buyer',
        createdAt: new Date().toISOString()
      });

      setIsSubmitting(false);
      navigate('/');
    } catch (error) {
      console.error("Erro ao registrar cliente:", error);
      setError("Erro ao criar conta: " + error.message);
      setIsSubmitting(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="animate-fade-in max-w-md mx-auto py-4">
      <div className="glass-panel border-[#A020F0]/40 shadow-[0_0_50px_rgba(160,32,240,0.15)]">
        <div className="flex justify-center mb-4">
          <RaivaLogo size={80} />
        </div>
        
        <h2 className="text-2xl font-black text-center text-white mb-1">Criar Conta RaiUva</h2>
        <p className="text-center text-slate-300 text-xs mb-6">
          Peça seus energéticos e refrigerantes na sala em segundos ⚡
        </p>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-100 px-4 py-2.5 rounded-xl mb-4 text-xs font-bold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="flex items-center gap-1.5 mb-1.5 text-slate-300 text-xs font-black uppercase tracking-wider">
              <User size={14} className="text-[#00E5FF]" /> Nome Completo
            </label>
            <input 
              type="text" 
              name="fullName"
              className="input-field text-sm" 
              placeholder="Ex: João Silva" 
              value={formData.fullName}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 mb-1.5 text-slate-300 text-xs font-black uppercase tracking-wider">
              <Mail size={14} className="text-[#00E5FF]" /> E-mail
            </label>
            <input 
              type="email" 
              name="email"
              className="input-field text-sm" 
              placeholder="seu.email@exemplo.com"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 mb-1.5 text-slate-300 text-xs font-black uppercase tracking-wider">
              <Lock size={14} className="text-[#00E5FF]" /> Senha
            </label>
            <input 
              type="password" 
              name="password"
              className="input-field text-sm" 
              placeholder="Mínimo 6 caracteres" 
              value={formData.password}
              onChange={handleChange}
              required
              minLength={6}
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 mb-1.5 text-slate-300 text-xs font-black uppercase tracking-wider">
              <Phone size={14} className="text-[#00E5FF]" /> WhatsApp
            </label>
            <input 
              type="tel" 
              name="phone"
              className="input-field text-sm" 
              placeholder="(61) 99999-9999" 
              value={formData.phone}
              onChange={handleChange}
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary w-full py-3.5 text-sm mt-4 shadow-[0_0_25px_rgba(207,255,0,0.35)] font-black" 
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Cadastrando...' : 'Cadastrar e Fazer Pedido ⚡'}
          </button>
        </form>

        <p className="text-center mt-5 text-xs text-slate-400">
          Já possui conta?{' '}
          <Link to="/login" className="text-[#CFFF00] hover:underline font-black transition-colors">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterClient;



