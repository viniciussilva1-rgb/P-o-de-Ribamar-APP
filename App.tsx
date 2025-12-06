
import React, { useState } from 'react';
import { DataProvider } from './context/DataContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './components/Login';
import { Layout } from './components/Layout';
import { DriversOverview, ProductCatalog, ProductionManager, ClientManager } from './components/AdminView';
import { DriverView } from './components/DriverView';
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
      } else if (currentUser.role === UserRole.DRIVER) {
        setActiveTab('my-clients');
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
      case 'drivers':
      default:
        return <DriversOverview />;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {currentUser.role === UserRole.ADMIN ? (
        renderAdminContent()
      ) : (
        <DriverView />
      )}
    </Layout>
  );
};

function App() {
  // Força logout ao carregar o App para evitar login automático
  React.useEffect(() => {
    const { logout } = require('./context/AuthContext');
    if (typeof logout === 'function') {
      logout();
    }
  }, []);
  return (
    <DataProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </DataProvider>
  );
}

export default App;
