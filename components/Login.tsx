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
    <div className="min-h-screen bg-orange-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-amber-100 relative">
        {/* Status Badge */}
        <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-green-100 text-green-700 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-green-200 shadow-sm">
          <div className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </div>
          <Wifi size={10} />
          <span>Sistema Online</span>
        </div>

        <div className="bg-amber-900 p-8 text-center">
          <div className="inline-flex p-3 bg-amber-800 rounded-full mb-4 ring-4 ring-amber-700/50">
            <Wheat className="w-10 h-10 text-amber-300" />
          </div>
          <h1 className="text-2xl font-bold text-white font-serif tracking-wide">{APP_NAME}</h1>
          <p className="text-amber-200/80 mt-2 text-sm">Sistema de Gestão & Logística</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <h2 className="text-center text-lg font-bold text-gray-700">
              Acessar Sistema
            </h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                required
                className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-300 text-gray-900 focus:ring-2 focus:ring-amber-500 outline-none placeholder-gray-400"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
              <input
                type="password"
                required
                className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-300 text-gray-900 focus:ring-2 focus:ring-amber-500 outline-none placeholder-gray-400"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center border border-red-100 font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 rounded-lg transition-all flex justify-center items-center shadow-md active:scale-[0.98]"
            >
              {loading ? <Loader2 className="animate-spin" /> : 'Entrar'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Acesso restrito a funcionários autorizados.
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Contacte o administrador para obter credenciais.
            </p>
          </div>
        </div>
      </div>
      
      <p className="mt-6 text-xs text-amber-800/60 font-medium">
        © {new Date().getFullYear()} {APP_NAME}. Todos os direitos reservados.
      </p>
    </div>
  );
};