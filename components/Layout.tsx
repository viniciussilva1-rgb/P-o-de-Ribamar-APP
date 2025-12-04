
import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, Truck, Wheat, Users, Package, ClipboardList } from 'lucide-react';
import { APP_NAME } from '../constants';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const { currentUser, logout, isAdmin } = useAuth();

  return (
    <div className="min-h-screen flex bg-orange-50/30">
      {/* Sidebar */}
      <aside className="w-64 bg-amber-950 text-white flex-shrink-0 hidden md:flex flex-col shadow-2xl z-20">
        <div className="p-8 border-b border-amber-900/50 bg-amber-900">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-500 rounded-lg">
              <Wheat className="w-6 h-6 text-amber-50" />
            </div>
            <div>
              <h1 className="text-lg font-bold font-serif leading-none tracking-wide">{APP_NAME}</h1>
              <span className="text-[10px] uppercase tracking-widest text-amber-400 opacity-80">Gestão</span>
            </div>
          </div>
        </div>
        
        <div className="px-6 py-6 border-b border-amber-900/30">
          <p className="text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">Usuário</p>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-amber-800 flex items-center justify-center text-amber-200 font-bold">
              {currentUser?.name.charAt(0)}
            </div>
            <div className="overflow-hidden">
               <p className="text-amber-100 text-sm font-medium truncate">{currentUser?.name}</p>
               <span className="text-xs text-amber-500/80">
                {isAdmin ? 'Administrador' : 'Entregador'}
              </span>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {isAdmin ? (
            <>
              <div className="px-3 pb-2 pt-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                Menu Principal
              </div>
              <NavItem 
                icon={<Truck />} 
                label="Entregadores" 
                active={activeTab === 'drivers'} 
                onClick={() => setActiveTab('drivers')} 
              />
              <NavItem 
                icon={<Users />} 
                label="Clientes" 
                active={activeTab === 'clients-admin'} 
                onClick={() => setActiveTab('clients-admin')} 
              />
              <NavItem 
                icon={<Package />} 
                label="Produtos" 
                active={activeTab === 'products'} 
                onClick={() => setActiveTab('products')} 
              />
              <NavItem 
                icon={<ClipboardList />} 
                label="Produção" 
                active={activeTab === 'production'} 
                onClick={() => setActiveTab('production')} 
              />
            </>
          ) : (
            <>
               <div className="px-3 pb-2 pt-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                Minha Área
              </div>
              <NavItem 
                icon={<Users />} 
                label="Meus Clientes" 
                active={activeTab === 'my-clients'} 
                onClick={() => setActiveTab('my-clients')} 
              />
            </>
          )}
        </nav>

        <div className="p-4 bg-amber-950 border-t border-amber-900/50">
          <button 
            onClick={logout}
            className="flex items-center space-x-3 w-full px-4 py-3 rounded-lg text-amber-300/70 hover:bg-amber-900 hover:text-white transition-all duration-200"
          >
            <LogOut size={20} />
            <span className="font-medium">Sair do Sistema</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header & Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-gray-50/50">
        {/* Mobile Header */}
        <header className="md:hidden bg-amber-900 text-white p-4 flex justify-between items-center shadow-md z-30">
          <div className="flex items-center space-x-2">
            <Wheat className="w-6 h-6 text-amber-300" />
            <span className="font-bold">{APP_NAME}</span>
          </div>
          <button onClick={logout}>
            <LogOut size={20} />
          </button>
        </header>
        
        {/* Mobile Tab Bar */}
        <div className="md:hidden bg-amber-800 text-amber-100 flex justify-around p-2 shadow-inner z-20 overflow-x-auto">
            {isAdmin ? (
            <>
              <MobileNavItem 
                icon={<Truck size={20} />} 
                label="Drivers" 
                active={activeTab === 'drivers'} 
                onClick={() => setActiveTab('drivers')} 
              />
               <MobileNavItem 
                icon={<Users size={20} />} 
                label="Clientes" 
                active={activeTab === 'clients-admin'} 
                onClick={() => setActiveTab('clients-admin')} 
              />
              <MobileNavItem 
                icon={<Package size={20} />} 
                label="Produtos" 
                active={activeTab === 'products'} 
                onClick={() => setActiveTab('products')} 
              />
              <MobileNavItem 
                icon={<ClipboardList size={20} />} 
                label="Produção" 
                active={activeTab === 'production'} 
                onClick={() => setActiveTab('production')} 
              />
            </>
          ) : (
            <MobileNavItem 
              icon={<Users size={20} />} 
              label="Clientes" 
              active={activeTab === 'my-clients'} 
              onClick={() => setActiveTab('my-clients')} 
            />
          )}
        </div>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto p-4 md:p-8 scroll-smooth">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

const NavItem = ({ icon, label, active, onClick }: any) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
      active 
        ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/20' 
        : 'text-amber-100/70 hover:bg-amber-900 hover:text-white'
    }`}
  >
    {React.cloneElement(icon, { size: 20, className: active ? 'text-amber-200' : 'text-amber-500 group-hover:text-amber-300' })}
    <span className="font-medium">{label}</span>
  </button>
);

const MobileNavItem = ({ icon, label, active, onClick }: any) => (
    <button 
        onClick={onClick}
        className={`flex flex-col items-center px-4 py-1 rounded transition-colors min-w-[60px] ${active ? 'bg-amber-700 text-white' : 'opacity-70'}`}
    >
        {icon}
        <span className="text-[10px] mt-1">{label}</span>
    </button>
);
