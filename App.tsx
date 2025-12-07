
import React, { useState } from 'react';
import { DataProvider } from './context/DataContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './components/Login';
import { Layout } from './components/Layout';
import { DriversOverview, ProductCatalog, ProductionManager, ClientManager } from './components/AdminView';
import { DriverView } from './components/DriverView';
import DriverDailyLoad from './components/DriverDailyLoad';
import AdminDailyLoadReport from './components/AdminDailyLoadReport';
import DriverDailyDeliveries from './components/DriverDailyDeliveries';
import AdminDeliveryDashboard from './components/AdminDeliveryDashboard';
import DriverCashBox from './components/DriverCashBox';
import AdminWeeklySettlement from './components/AdminWeeklySettlement';
import { UserRole } from './types';
import useSyncEntregadorFirestore from './hooks/useSyncEntregadorFirestore';

const AppContent: React.FC = () => {
  const { currentUser } = useAuth();
  // Changed default to 'drivers' for Admin, 'my-clients' for Driver
  const [activeTab, setActiveTab] = useState('drivers'); 

  // Sincroniza automaticamente o entregador autenticado com Firestore (coleção 'entregadores')
  // Desativado temporariamente - coleção não está sendo usada
  // useSyncEntregadorFirestore(true);

  // Determine initial tab based on role if needed
  React.useEffect(() => {
    if (currentUser) {
      if (currentUser.role === UserRole.ADMIN && activeTab === 'my-clients') {
        setActiveTab('drivers');
      } else if (currentUser.role === UserRole.DRIVER && activeTab === 'drivers') {
        setActiveTab('daily-load');
      }
    }
  }, [currentUser]);

  if (!currentUser) {
    return <Login />;
  }

  const renderAdminContent = () => {
    switch (activeTab) {
      case 'products':
        return <ProductCatalog />;
      case 'production':
        return <ProductionManager />;
      case 'clients-admin':
        return <ClientManager />;
      case 'daily-loads':
        return <AdminDailyLoadReport />;
      case 'deliveries':
        return <AdminDeliveryDashboard />;
      case 'weekly-settlement':
        return <AdminWeeklySettlement />;
      case 'drivers':
      default:
        return <DriversOverview />;
    }
  };

  const renderDriverContent = () => {
    switch (activeTab) {
      case 'my-clients':
        return <DriverView />;
      case 'daily-deliveries':
        return <DriverDailyDeliveries />;
      case 'cashbox':
        return <DriverCashBox />;
      case 'daily-load':
      default:
        return <DriverDailyLoad />;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {currentUser.role === UserRole.ADMIN ? (
        renderAdminContent()
      ) : (
        renderDriverContent()
      )}
    </Layout>
  );
};

function App() {
  return (
    <DataProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </DataProvider>
  );
}

export default App;
