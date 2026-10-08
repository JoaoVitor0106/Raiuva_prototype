import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, LogIn, Zap, ShieldCheck } from 'lucide-react';
import { signInWithEmailAndPassword } from '../mocks/auth.js';
import { auth } from '../mocks/firestore.js';
import { useAuth } from '../context/AuthContext';
import RaivaLogo from '../components/RaivaLogo';

export const DEFAULT_ADMIN_CREDS = {
  email: 'admin@raiuva.com',
  password: 'raiuva2026'
};

export const getAdminCredentials = () => {
  const saved = localStorage.getItem('raiuva_admin_creds');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      return DEFAULT_ADMIN_CREDS;
    }
  }
  return DEFAULT_ADMIN_CREDS;
};

const Login = () => {
  const navigate = useNavigate();
  const { loginAsAdmin } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    
    const adminCreds = getAdminCredentials();

    // Check if logging in with Admin Account
    if (
      formData.email.trim().toLowerCase() === adminCreds.email.toLowerCase() &&
      formData.password === adminCreds.password
    ) {
      loginAsAdmin();
      navigate('/seller');
      setIsSubmitting(false);
      return;
    }

    // Otherwise attempt standard banco-de-dados Auth login (Students / Buyers)
    try {
      await signInWithEmailAndPassword(auth, formData.email, formData.password);
      navigate('/');
    } catch (err) {
      console.error("Erro ao fazer login:", err);
      setError("E-mail ou senha incorretos.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="animate-fade-in max-w-md mx-auto py-6">
      <div className="glass-panel border-[#A020F0]/40 shadow-[0_0_50px_rgba(160,32,240,0.15)]">
        <div className="flex justify-center mb-4">
          <RaivaLogo size={80} />
        </div>

        <h2 className="text-2xl font-black text-center text-white mb-1">Acessar Conta</h2>
        <p className="text-center text-slate-300 text-xs mb-6">
          Entre para pedir seus energéticos na <strong className="text-[#CFFF00]">RaiUva</strong> ou gerenciar seu delivery ⚡
        </p>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-100 px-4 py-2.5 rounded-xl mb-4 text-xs font-bold animate-shake">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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
              placeholder="••••••••" 
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary w-full py-3.5 text-sm mt-4 shadow-[0_0_25px_rgba(207,255,0,0.35)] font-black" 
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Entrando...' : <><LogIn size={18} /> Entrar na RaiUva ⚡</>}
          </button>
        </form>


        <p className="text-center mt-6 text-xs text-slate-400">
          Ainda não tem conta?{' '}
          <Link to="/register" className="text-[#CFFF00] hover:underline font-black transition-colors">
            Cadastre-se aqui
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;



