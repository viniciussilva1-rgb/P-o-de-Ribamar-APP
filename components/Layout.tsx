
import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, Truck, Wheat, Users, Package, ClipboardList, PackageCheck, BarChart3, Send, Wallet, Calculator, Tag, LayoutDashboard, TrendingUp } from 'lucide-react';
import { APP_NAME } from '../constants';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const { currentUser, logout, isAdmin } = useAuth();

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#0D0F14' }}>
      {/* Sidebar */}
      <aside 
        className="w-64 text-white flex-shrink-0 hidden md:flex flex-col shadow-2xl z-20" 
        style={{ backgroundColor: '#13161E', borderRight: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div 
          className="p-8 border-b" 
          style={{ borderColor: 'rgba(255,255,255,0.07)', backgroundColor: '#13161E' }}
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: '#F5A623' }}>
              <Wheat className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold font-serif leading-none tracking-wide">{APP_NAME}</h1>
              <span className="text-[10px] uppercase tracking-widest opacity-80" style={{ color: '#F5A623' }}>Gestão</span>
            </div>
          </div>
        </div>
        
        <div 
          className="px-6 py-6 border-b"
          style={{ borderColor: 'rgba(255,255,255,0.07)' }}
        >
          <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#F5A623' }}>Usuário</p>
          <div className="flex items-center space-x-3">
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white"
              style={{ backgroundColor: '#1A1E29' }}
            >
              {currentUser?.name.charAt(0)}
            </div>
            <div className="overflow-hidden">
               <p className="text-white text-sm font-medium truncate">{currentUser?.name}</p>
               <span className="text-xs" style={{ color: '#A0A8C0' }}>
                {isAdmin ? 'Administrador' : 'Entregador'}
              </span>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {isAdmin ? (
            <>
              <div className="px-3 pb-2 pt-4 text-xs font-bold uppercase tracking-wider" style={{ color: '#A0A8C0' }}>
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
                icon={<Tag />} 
                label="Preços por Rota" 
                active={activeTab === 'route-prices'} 
                onClick={() => setActiveTab('route-prices')} 
              />
              <NavItem 
                icon={<ClipboardList />} 
                label="Produção" 
                active={activeTab === 'production'} 
                onClick={() => setActiveTab('production')} 
              />
              <NavItem 
                icon={<TrendingUp />} 
                label="Análise Produção" 
                active={activeTab === 'production-analysis'} 
                onClick={() => setActiveTab('production-analysis')} 
              />
              <NavItem 
                icon={<BarChart3 />} 
                label="Relatório Cargas" 
                active={activeTab === 'daily-loads'} 
                onClick={() => setActiveTab('daily-loads')} 
              />
              <NavItem 
                icon={<Send />} 
                label="Entregas" 
                active={activeTab === 'deliveries'} 
                onClick={() => setActiveTab('deliveries')} 
              />
              <NavItem 
                icon={<Calculator />} 
                label="Fecho Semanal" 
                active={activeTab === 'weekly-settlement'} 
                onClick={() => setActiveTab('weekly-settlement')} 
              />
            </>
          ) : (
            <>
               <div className="px-3 pb-2 pt-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                Minha Área
              </div>
              <NavItem 
                icon={<LayoutDashboard />} 
                label="Dashboard" 
                active={activeTab === 'dashboard'} 
                onClick={() => setActiveTab('dashboard')} 
              />
              <NavItem 
                icon={<PackageCheck />} 
                label="Carga do Dia" 
                active={activeTab === 'daily-load'} 
                onClick={() => setActiveTab('daily-load')} 
              />
              <NavItem 
                icon={<Users />} 
                label="Meus Clientes" 
                active={activeTab === 'my-clients'} 
                onClick={() => setActiveTab('my-clients')} 
              />
              <NavItem 
                icon={<Send />} 
                label="Entregas do Dia" 
                active={activeTab === 'daily-deliveries'} 
                onClick={() => setActiveTab('daily-deliveries')} 
              />
              <NavItem 
                icon={<Wallet />} 
                label="Caixa" 
                active={activeTab === 'cashbox'} 
                onClick={() => setActiveTab('cashbox')} 
              />
            </>
          )}
        </nav>

        <div 
          className="p-4 border-t"
          style={{ backgroundColor: '#13161E', borderColor: 'rgba(255,255,255,0.07)' }}
        >
          <button 
            onClick={logout}
            className="flex items-center space-x-3 w-full px-4 py-3 rounded-lg transition-all duration-200"
            style={{
              color: '#A0A8C0',
              backgroundColor: 'transparent'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#1A1E29';
              e.currentTarget.style.color = '#FFFFFF';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#A0A8C0';
            }}
          >
            <LogOut size={20} />
            <span className="font-medium">Sair do Sistema</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header & Content */}
      <div 
        className="flex-1 flex flex-col h-screen overflow-hidden"
        style={{ backgroundColor: '#0D0F14' }}
      >
        {/* Mobile Header */}
        <header 
          className="md:hidden text-white p-4 flex justify-between items-center shadow-md z-30"
          style={{ backgroundColor: '#13161E', borderBottom: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="flex items-center space-x-2">
            <Wheat className="w-6 h-6" style={{ color: '#F5A623' }} />
            <span className="font-bold">{APP_NAME}</span>
          </div>
          <button onClick={logout}>
            <LogOut size={20} />
          </button>
        </header>
        
        {/* Mobile Tab Bar */}
        <div 
          className="md:hidden text-white flex justify-around p-1 shadow-inner z-20 overflow-x-auto flex-shrink-0"
          style={{ backgroundColor: '#13161E', borderBottom: '1px solid rgba(255,255,255,0.07)' }}
        >
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
                icon={<Tag size={20} />} 
                label="Preços" 
                active={activeTab === 'route-prices'} 
                onClick={() => setActiveTab('route-prices')} 
              />
              <MobileNavItem 
                icon={<ClipboardList size={20} />} 
                label="Produção" 
                active={activeTab === 'production'} 
                onClick={() => setActiveTab('production')} 
              />
              <MobileNavItem 
                icon={<TrendingUp size={20} />} 
                label="Análise" 
                active={activeTab === 'production-analysis'} 
                onClick={() => setActiveTab('production-analysis')} 
              />
              <MobileNavItem 
                icon={<BarChart3 size={20} />} 
                label="Cargas" 
                active={activeTab === 'daily-loads'} 
                onClick={() => setActiveTab('daily-loads')} 
              />
              <MobileNavItem 
                icon={<Send size={20} />} 
                label="Entregas" 
                active={activeTab === 'deliveries'} 
                onClick={() => setActiveTab('deliveries')} 
              />
              <MobileNavItem 
                icon={<Calculator size={20} />} 
                label="Fecho" 
                active={activeTab === 'weekly-settlement'} 
                onClick={() => setActiveTab('weekly-settlement')} 
              />
            </>
          ) : (
            <>
              <MobileNavItem 
                icon={<LayoutDashboard size={20} />} 
                label="Dashboard" 
                active={activeTab === 'dashboard'} 
                onClick={() => setActiveTab('dashboard')} 
              />
              <MobileNavItem 
                icon={<PackageCheck size={20} />} 
                label="Carga" 
                active={activeTab === 'daily-load'} 
                onClick={() => setActiveTab('daily-load')} 
              />
              <MobileNavItem 
                icon={<Users size={20} />} 
                label="Clientes" 
                active={activeTab === 'my-clients'} 
                onClick={() => setActiveTab('my-clients')} 
              />
              <MobileNavItem 
                icon={<Send size={20} />} 
                label="Entregas" 
                active={activeTab === 'daily-deliveries'} 
                onClick={() => setActiveTab('daily-deliveries')} 
              />
              <MobileNavItem 
                icon={<Wallet size={20} />} 
                label="Caixa" 
                active={activeTab === 'cashbox'} 
                onClick={() => setActiveTab('cashbox')} 
              />
            </>
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
    className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 group"
    style={{
      backgroundColor: active ? 'rgba(245,166,35,0.12)' : 'transparent',
      color: active ? '#F5A623' : '#A0A8C0',
    }}
    onMouseEnter={(e) => {
      if (!active) {
        e.currentTarget.style.backgroundColor = '#1A1E29';
        e.currentTarget.style.color = '#FFFFFF';
      }
    }}
    onMouseLeave={(e) => {
      if (!active) {
        e.currentTarget.style.backgroundColor = 'transparent';
        e.currentTarget.style.color = '#A0A8C0';
      }
    }}
  >
    {React.cloneElement(icon, { 
      size: 20, 
      style: { color: active ? '#F5A623' : '#A0A8C0' }
    })}
    <span className="font-medium">{label}</span>
  </button>
);

const MobileNavItem = ({ icon, label, active, onClick }: any) => (
    <button 
        onClick={onClick}
        className="flex flex-col items-center px-2 py-1.5 rounded transition-colors min-w-[50px] flex-shrink-0"
        style={{
          backgroundColor: active ? 'rgba(245,166,35,0.12)' : 'transparent',
          color: active ? '#F5A623' : '#A0A8C0',
        }}
    >
        {React.cloneElement(icon, {
          style: { color: active ? '#F5A623' : '#A0A8C0' }
        })}
        <span className="text-[9px] mt-0.5 whitespace-nowrap">{label}</span>
    </button>
);
