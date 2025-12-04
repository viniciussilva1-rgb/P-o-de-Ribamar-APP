import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Client, UserRole, Product, ProductionData, DailyProductionRecord, Route, PaymentTransaction, DeliverySchedule } from '../types';
import { INITIAL_PRODUCTS, MOCK_ADMIN_EMAIL } from '../constants';
import { db } from '../firebaseConfig'; // Import database
import { collection, doc, setDoc, deleteDoc, updateDoc, onSnapshot, query, where } from 'firebase/firestore';

interface DataContextType {
  users: User[];
  clients: Client[];
  products: Product[];
  routes: Route[];
  productionData: ProductionData;
  addUser: (user: User) => void;
  addClient: (client: Client) => void;
  updateClient: (id: string, updates: Partial<Client>) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  addProduct: (product: Product) => void;
  deleteProduct: (id: string) => void;
  addRoute: (route: Route) => void;
  deleteRoute: (id: string) => void;
  getRoutesByDriver: (driverId: string) => Route[];
  getClientsByDriver: (driverId: string) => Client[];
  getAllClients: () => Client[];
  getDrivers: () => User[];
  updateDailyProduction: (date: string, productId: string, data: Partial<DailyProductionRecord>) => void;
  getDailyRecord: (date: string, productId: string) => DailyProductionRecord;
  
  calculateClientDebt: (client: Client) => { total: number, daysCount: number, details: string[] };
  registerPayment: (clientId: string, amount: number, method: string) => void;
  toggleSkippedDate: (clientId: string, date: string) => void;
  updateClientPrice: (clientId: string, productId: string, newPrice: number, userRole: UserRole) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [productionData, setProductionData] = useState<ProductionData>({});

  // --- FIREBASE LISTENERS (Realtime Sync) ---

  // 1. Users
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersList = snapshot.docs.map(doc => doc.data() as User);
      
      // Se não houver usuários, cria o Admin inicial
      if (usersList.length === 0) {
         const admin: User = { id: 'admin-1', name: 'Administrador', email: MOCK_ADMIN_EMAIL, role: UserRole.ADMIN };
         setDoc(doc(db, 'users', 'admin-1'), admin);
      } else {
         setUsers(usersList);
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. Clients
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'clients'), (snapshot) => {
      const list = snapshot.docs.map(doc => doc.data() as Client);
      setClients(list);
    });
    return () => unsubscribe();
  }, []);

  // 3. Products
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'products'), (snapshot) => {
      const list = snapshot.docs.map(doc => doc.data() as Product);
      
      // Seed inicial se vazio
      if (list.length === 0) {
        INITIAL_PRODUCTS.forEach(p => {
            setDoc(doc(db, 'products', p.id), p);
        });
      } else {
        setProducts(list);
      }
    });
    return () => unsubscribe();
  }, []);

  // 4. Routes
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'routes'), (snapshot) => {
      const list = snapshot.docs.map(doc => doc.data() as Route);
      setRoutes(list);
    });
    return () => unsubscribe();
  }, []);

  // 5. Production
  // Estratégia: Escutar coleção 'daily_production', onde ID = Data (YYYY-MM-DD)
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'daily_production'), (snapshot) => {
      const prodMap: ProductionData = {};
      snapshot.docs.forEach(docSnap => {
         prodMap[docSnap.id] = docSnap.data() as { [productId: string]: DailyProductionRecord };
      });
      setProductionData(prodMap);
    });
    return () => unsubscribe();
  }, []);

  // --- ACTIONS (Write to Firebase) ---

  const addUser = async (user: User) => {
    // Nota: Isso cria apenas o registro no banco de dados.
    // O login real (Auth) é criado pelo usuário na tela de login/registro.
    await setDoc(doc(db, 'users', user.id), user);
  };

  const addClient = async (client: Client) => {
    await setDoc(doc(db, 'clients', client.id), client);
  };

  const updateClient = async (id: string, updates: Partial<Client>) => {
    await updateDoc(doc(db, 'clients', id), updates);
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    await updateDoc(doc(db, 'products', id), updates);
  };

  const addProduct = async (product: Product) => {
    await setDoc(doc(db, 'products', product.id), product);
  };

  const deleteProduct = async (id: string) => {
    await deleteDoc(doc(db, 'products', id));
  };

  const addRoute = async (route: Route) => {
    await setDoc(doc(db, 'routes', route.id), route);
  };

  const deleteRoute = async (id: string) => {
    await deleteDoc(doc(db, 'routes', id));
  };

  const getRoutesByDriver = (driverId: string) => {
    return routes.filter(r => r.driverId === driverId);
  };

  const getClientsByDriver = (driverId: string) => {
    return clients.filter(c => c.driverId === driverId);
  };

  const getAllClients = () => clients;

  const getDrivers = () => users.filter(u => u.role === UserRole.DRIVER);

  const updateDailyProduction = async (date: string, productId: string, data: Partial<DailyProductionRecord>) => {
    // Pega o registro atual do estado local ou cria um novo
    const currentDayData = productionData[date] || {};
    const currentProductData = currentDayData[productId] || { produced: 0, delivered: 0, sold: 0, leftovers: 0 };
    
    const newData = { ...currentProductData, ...data };

    // Salva no Firestore usando merge para não apagar outros produtos do mesmo dia
    await setDoc(doc(db, 'daily_production', date), {
        [productId]: newData
    }, { merge: true });
  };

  const getDailyRecord = (date: string, productId: string): DailyProductionRecord => {
    if (productionData[date] && productionData[date][productId]) {
      return productionData[date][productId];
    }
    return { produced: 0, delivered: 0, sold: 0, leftovers: 0 };
  };

  // --- AUTOMATED BILLING LOGIC (Same logic, using Firestore data) ---

  const calculateClientDebt = (client: Client) => {
    let total = 0;
    let daysCount = 0;
    const details: string[] = [];

    const startDateStr = client.lastPaymentDate || client.createdAt.split('T')[0];
    const startDate = new Date(startDateStr);
    const today = new Date();
    
    startDate.setHours(0,0,0,0);
    today.setHours(0,0,0,0);

    const currentDate = new Date(startDate);
    const safetyLimit = new Date();
    safetyLimit.setDate(safetyLimit.getDate() - 365);
    if (currentDate < safetyLimit) {
        currentDate.setTime(safetyLimit.getTime());
    }
    
    if (client.lastPaymentDate) {
        currentDate.setDate(currentDate.getDate() + 1);
    }

    while (currentDate <= today) {
        const dateStr = currentDate.toISOString().split('T')[0];
        
        if (client.skippedDates && client.skippedDates.includes(dateStr)) {
            currentDate.setDate(currentDate.getDate() + 1);
            continue; 
        }

        const dayIndex = currentDate.getDay();
        const mapKeys = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
        const dayKey = mapKeys[dayIndex] as keyof DeliverySchedule;
        
        const scheduledItems = client.deliverySchedule?.[dayKey];

        if (scheduledItems && scheduledItems.length > 0) {
            let dayTotal = 0;
            
            scheduledItems.forEach(item => {
                const product = products.find(p => p.id === item.productId);
                if (product) {
                    const effectivePrice = client.customPrices?.[product.id] ?? product.price;
                    dayTotal += (item.quantity * effectivePrice);
                }
            });

            if (dayTotal > 0) {
                total += dayTotal;
                daysCount++;
            }
        }
        currentDate.setDate(currentDate.getDate() + 1);
    }

    return { total, daysCount, details };
  };

  const registerPayment = async (clientId: string, amount: number, method: string) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const client = clients.find(c => c.id === clientId);
    if (!client) return;

    const newTransaction: PaymentTransaction = {
        id: Date.now().toString(),
        date: todayStr,
        amount: amount,
        method: method
    };
    
    const updatedHistory = [...(client.paymentHistory || []), newTransaction];

    await updateDoc(doc(db, 'clients', clientId), {
        currentBalance: 0,
        lastPaymentDate: todayStr,
        paymentHistory: updatedHistory
    });
  };

  const toggleSkippedDate = async (clientId: string, date: string) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;

    const skipped = client.skippedDates || [];
    const exists = skipped.includes(date);
    let newSkipped;
    
    if (exists) {
        newSkipped = skipped.filter(d => d !== date);
    } else {
        newSkipped = [...skipped, date];
    }
    
    await updateDoc(doc(db, 'clients', clientId), {
        skippedDates: newSkipped
    });
  };

  const updateClientPrice = async (clientId: string, productId: string, newPrice: number, userRole: UserRole) => {
    if (userRole !== UserRole.ADMIN) {
      console.warn("Acesso negado: Apenas administradores podem alterar preços personalizados.");
      return;
    }

    const client = clients.find(c => c.id === clientId);
    if (!client) return;

    const currentCustomPrices = client.customPrices || {};
    
    await updateDoc(doc(db, 'clients', clientId), {
        customPrices: {
            ...currentCustomPrices,
            [productId]: newPrice
        }
    });
  };

  return (
    <DataContext.Provider value={{ 
      users, clients, products, productionData, routes,
      addUser, addClient, updateClient, updateProduct, addProduct, deleteProduct, addRoute, deleteRoute,
      getRoutesByDriver, getClientsByDriver, getAllClients, getDrivers,
      updateDailyProduction, getDailyRecord,
      calculateClientDebt, registerPayment, toggleSkippedDate, updateClientPrice
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within a DataProvider');
  return context;
};