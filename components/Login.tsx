import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Wheat, Loader2, Wifi } from 'lucide-react';
import { APP_NAME } from '../constants';

export const Login: React.FC = () => {
  const { login } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const success = await login(email, password);
      if (!success) setError('Email ou senha inválidos.');
    } catch (err) {
      setError('Ocorreu um erro inesperado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ backgroundColor: '#0D0F14' }}
    >
      <div 
        className="w-full max-w-md rounded-2xl shadow-xl overflow-hidden relative"
        style={{ backgroundColor: '#13161E', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        {/* Status Badge */}
        <div className="absolute top-4 right-4 flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm" style={{ backgroundColor: 'rgba(34,197,94,0.2)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.3)' }}>
          <div className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full" style={{ backgroundColor: 'rgba(34,197,94,0.7)' }}></span>
            <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: '#22C55E' }}></span>
          </div>
          <Wifi size={10} />
          <span>Sistema Online</span>
        </div>

        <div 
          className="p-8 text-center"
          style={{ backgroundColor: '#13161E' }}
        >
          <div className="inline-flex p-3 mb-4 rounded-full ring-4" style={{ backgroundColor: 'rgba(245,166,35,0.1)', ringColor: 'rgba(245,166,35,0.2)' }}>
            <Wheat className="w-10 h-10" style={{ color: '#F5A623' }} />
          </div>
          <h1 className="text-2xl font-bold font-serif tracking-wide" style={{ color: '#FFFFFF' }}>{APP_NAME}</h1>
          <p className="mt-2 text-sm" style={{ color: '#A0A8C0' }}>Sistema de Gestão & Logística</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <h2 className="text-center text-lg font-bold" style={{ color: '#FFFFFF' }}>
              Acessar Sistema
            </h2>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#A0A8C0' }}>Email</label>
              <input
                type="email"
                required
                className="w-full px-4 py-3 rounded-lg text-white outline-none placeholder-gray-500 transition-all"
                style={{
                  backgroundColor: '#1A1E29',
                  border: '1px solid rgba(255,255,255,0.07)',
                  color: '#FFFFFF'
                }}
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#F5A623';
                  e.currentTarget.style.backgroundColor = '#1A1E29';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#A0A8C0' }}>Senha</label>
              <input
                type="password"
                required
                className="w-full px-4 py-3 rounded-lg text-white outline-none placeholder-gray-500 transition-all"
                style={{
                  backgroundColor: '#1A1E29',
                  border: '1px solid rgba(255,255,255,0.07)',
                  color: '#FFFFFF'
                }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#F5A623';
                  e.currentTarget.style.backgroundColor = '#1A1E29';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
                }}
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg text-sm text-center font-medium" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full font-semibold py-3 rounded-lg transition-all flex justify-center items-center shadow-md active:scale-[0.98]"
              style={{ backgroundColor: '#F5A623', color: '#000000' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.filter = 'brightness(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.filter = 'brightness(1)';
              }}
            >
              {loading ? <Loader2 className="animate-spin" /> : 'Entrar'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs" style={{ color: '#A0A8C0' }}>
              Acesso restrito a funcionários autorizados.
            </p>
            <p className="text-xs mt-1" style={{ color: '#A0A8C0' }}>
              Contacte o administrador para obter credenciais.
            </p>
          </div>
        </div>
      </div>
      
      <p className="mt-6 text-xs font-medium" style={{ color: '#A0A8C0' }}>
        © {new Date().getFullYear()} {APP_NAME}. Todos os direitos reservados.
      </p>
    </div>
  );
};