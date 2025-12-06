import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Client, UserRole, Product, ProductionData, DailyProductionRecord, Route, PaymentTransaction, DeliverySchedule, DailyLoad, LoadItem, ReturnItem, DailyLoadReport, ProductionSuggestion } from '../types';
import { INITIAL_PRODUCTS, MOCK_ADMIN_EMAIL } from '../constants';
import { db } from '../firebaseConfig'; // Import database
import { collection, doc, setDoc, deleteDoc, updateDoc, onSnapshot, query, where, getDocs } from 'firebase/firestore';

interface DataContextType {
  users: User[];
  clients: Client[];
  products: Product[];
  routes: Route[];
  productionData: ProductionData;
  dailyLoads: DailyLoad[];
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
  
  // Funções de Carga do Dia
  createDailyLoad: (driverId: string, date: string, loadItems: LoadItem[], observations?: string) => Promise<DailyLoad>;
  updateDailyLoad: (loadId: string, updates: Partial<DailyLoad>) => Promise<void>;
  completeDailyLoad: (loadId: string, returnItems: ReturnItem[], observations?: string) => Promise<void>;
  getDailyLoadByDriver: (driverId: string, date: string) => DailyLoad | undefined;
  getDailyLoadsByDate: (date: string) => DailyLoad[];
  getDailyLoadReport: (date: string) => DailyLoadReport;
  getProductionSuggestions: (daysToAnalyze?: number) => ProductionSuggestion[];
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [productionData, setProductionData] = useState<ProductionData>({});
  const [dailyLoads, setDailyLoads] = useState<DailyLoad[]>([]);

  // --- FIREBASE LISTENERS (Realtime Sync) ---

  // 1. Users
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersList = snapshot.docs.map(snap => {
        const data = snap.data() as Partial<User>;
        // Garante que o id sempre exista e seja o id do documento caso não esteja salvo no campo
        const id = (data.id as string) || snap.id;
        // Normaliza role para string maiúscula
        const roleStr = String(data.role ?? '').trim().toUpperCase();
        // Aceita variações: 'DRIVER', 'ENTREGADOR' como motorista
        const normalizedRole = (roleStr === 'ADMIN')
          ? UserRole.ADMIN
          : (roleStr === 'DRIVER' || roleStr === 'ENTREGADOR')
            ? UserRole.DRIVER
            : (data.role as UserRole);
        return {
          id,
          name: String(data.name ?? ''),
          email: String(data.email ?? ''),
          role: normalizedRole,
        } as User;
      });
      
      // Se não houver usuários, cria o Admin inicial
      if (usersList.length === 0) {
         const admin: User = { id: 'admin-1', name: 'Administrador', email: MOCK_ADMIN_EMAIL, role: UserRole.ADMIN };
         setDoc(doc(db, 'users', 'admin-1'), admin);
      }
      setUsers(usersList);
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

  // 6. Daily Loads (Carga do Dia)
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'daily_loads'), (snapshot) => {
      const loadsList = snapshot.docs.map(docSnap => ({
        ...docSnap.data(),
        id: docSnap.id
      } as DailyLoad));
      setDailyLoads(loadsList);
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

  const getDrivers = () => {
    // Normaliza o campo role para evitar problemas de capitalização ou tipo string
    const isDriver = (r: any) => {
      const s = String(r ?? '').trim().toUpperCase();
      return s === 'DRIVER' || s === 'ENTREGADOR';
    };
    return users.filter(u => isDriver(u.role));
  };

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

  // ========== FUNÇÕES DE CARGA DO DIA ==========

  const createDailyLoad = async (driverId: string, date: string, loadItems: LoadItem[], observations?: string): Promise<DailyLoad> => {
    const loadId = `load-${driverId}-${date}`;
    const now = new Date().toISOString();
    
    const totalLoaded = loadItems.reduce((sum, item) => sum + item.quantity, 0);
    
    const newLoad: DailyLoad = {
      id: loadId,
      driverId,
      date,
      status: 'in_route',
      loadItems,
      loadObservations: observations,
      loadStartTime: now,
      totalLoaded,
      createdAt: now,
      updatedAt: now
    };
    
    await setDoc(doc(db, 'daily_loads', loadId), newLoad);
    return newLoad;
  };

  const updateDailyLoad = async (loadId: string, updates: Partial<DailyLoad>): Promise<void> => {
    await updateDoc(doc(db, 'daily_loads', loadId), {
      ...updates,
      updatedAt: new Date().toISOString()
    });
  };

  const completeDailyLoad = async (loadId: string, returnItems: ReturnItem[], observations?: string): Promise<void> => {
    const load = dailyLoads.find(l => l.id === loadId);
    if (!load) return;

    const now = new Date().toISOString();
    
    // Calcular métricas
    const totalReturned = returnItems.reduce((sum, item) => sum + item.returned, 0);
    const totalSold = returnItems.reduce((sum, item) => sum + item.sold, 0);
    const utilizationRate = load.totalLoaded && load.totalLoaded > 0 
      ? Math.round((totalSold / load.totalLoaded) * 100) 
      : 0;

    await updateDoc(doc(db, 'daily_loads', loadId), {
      status: 'completed',
      returnItems,
      returnObservations: observations,
      returnTime: now,
      totalSold,
      totalReturned,
      utilizationRate,
      updatedAt: now
    });

    // Atualizar produção diária com os dados de venda e sobra
    for (const item of returnItems) {
      const currentRecord = getDailyRecord(load.date, item.productId);
      await updateDailyProduction(load.date, item.productId, {
        sold: currentRecord.sold + item.sold,
        leftovers: currentRecord.leftovers + item.returned
      });
    }
  };

  const getDailyLoadByDriver = (driverId: string, date: string): DailyLoad | undefined => {
    return dailyLoads.find(l => l.driverId === driverId && l.date === date);
  };

  const getDailyLoadsByDate = (date: string): DailyLoad[] => {
    return dailyLoads.filter(l => l.date === date);
  };

  const getDailyLoadReport = (date: string): DailyLoadReport => {
    const loadsForDate = getDailyLoadsByDate(date);
    
    // Agrupar por entregador
    const driverMap = new Map<string, DailyLoad[]>();
    loadsForDate.forEach(load => {
      const existing = driverMap.get(load.driverId) || [];
      driverMap.set(load.driverId, [...existing, load]);
    });

    // Construir dados por entregador
    const driversData = Array.from(driverMap.entries()).map(([driverId, loads]) => {
      const driver = users.find(u => u.id === driverId);
      const totalLoaded = loads.reduce((sum, l) => sum + (l.totalLoaded || 0), 0);
      const totalSold = loads.reduce((sum, l) => sum + (l.totalSold || 0), 0);
      const totalReturned = loads.reduce((sum, l) => sum + (l.totalReturned || 0), 0);
      const utilizationRate = totalLoaded > 0 ? Math.round((totalSold / totalLoaded) * 100) : 0;

      return {
        driverId,
        driverName: driver?.name || 'Desconhecido',
        loads,
        totalLoaded,
        totalSold,
        totalReturned,
        utilizationRate
      };
    });

    // Calcular totais gerais e breakdown por produto
    const productTotals = new Map<string, { loaded: number; sold: number; returned: number }>();
    
    loadsForDate.forEach(load => {
      // Somar cargas
      load.loadItems.forEach(item => {
        const existing = productTotals.get(item.productId) || { loaded: 0, sold: 0, returned: 0 };
        productTotals.set(item.productId, {
          ...existing,
          loaded: existing.loaded + item.quantity
        });
      });
      
      // Somar retornos
      load.returnItems?.forEach(item => {
        const existing = productTotals.get(item.productId) || { loaded: 0, sold: 0, returned: 0 };
        productTotals.set(item.productId, {
          ...existing,
          sold: existing.sold + item.sold,
          returned: existing.returned + item.returned
        });
      });
    });

    const productBreakdown = Array.from(productTotals.entries()).map(([productId, totals]) => {
      const product = products.find(p => p.id === productId);
      const utilizationRate = totals.loaded > 0 ? Math.round((totals.sold / totals.loaded) * 100) : 0;
      // Alerta se sobra > 20%
      const alertHighReturn = totals.loaded > 0 && (totals.returned / totals.loaded) > 0.2;

      return {
        productId,
        productName: product?.name || 'Produto Desconhecido',
        loaded: totals.loaded,
        sold: totals.sold,
        returned: totals.returned,
        utilizationRate,
        alertHighReturn
      };
    });

    const totalLoaded = driversData.reduce((sum, d) => sum + d.totalLoaded, 0);
    const totalSold = driversData.reduce((sum, d) => sum + d.totalSold, 0);
    const totalReturned = driversData.reduce((sum, d) => sum + d.totalReturned, 0);
    const overallUtilization = totalLoaded > 0 ? Math.round((totalSold / totalLoaded) * 100) : 0;

    return {
      date,
      drivers: driversData,
      totals: {
        totalLoaded,
        totalSold,
        totalReturned,
        utilizationRate: overallUtilization,
        productBreakdown
      }
    };
  };

  const getProductionSuggestions = (daysToAnalyze: number = 7): ProductionSuggestion[] => {
    const today = new Date();
    const suggestions: ProductionSuggestion[] = [];
    
    // Coletar dados dos últimos N dias
    const productStats = new Map<string, { sold: number[]; returned: number[] }>();
    
    for (let i = 1; i <= daysToAnalyze; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const loadsForDate = getDailyLoadsByDate(dateStr);
      loadsForDate.forEach(load => {
        load.returnItems?.forEach(item => {
          const existing = productStats.get(item.productId) || { sold: [], returned: [] };
          existing.sold.push(item.sold);
          existing.returned.push(item.returned);
          productStats.set(item.productId, existing);
        });
      });
    }

    // Gerar sugestões
    products.forEach(product => {
      const stats = productStats.get(product.id);
      
      if (!stats || stats.sold.length === 0) {
        // Sem dados suficientes
        suggestions.push({
          productId: product.id,
          productName: product.name,
          avgDaily: 0,
          avgReturned: 0,
          suggestedQuantity: product.targetQuantity || 0,
          confidence: 'low',
          trend: 'stable'
        });
        return;
      }

      const avgSold = stats.sold.reduce((a, b) => a + b, 0) / stats.sold.length;
      const avgReturned = stats.returned.reduce((a, b) => a + b, 0) / stats.returned.length;
      
      // Calcular tendência (comparar últimos 3 dias com anteriores)
      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (stats.sold.length >= 5) {
        const recent = stats.sold.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
        const older = stats.sold.slice(3).reduce((a, b) => a + b, 0) / (stats.sold.length - 3);
        if (recent > older * 1.1) trend = 'up';
        else if (recent < older * 0.9) trend = 'down';
      }

      // Sugestão: média vendida + 10% de margem para sobras aceitáveis
      const suggestedQuantity = Math.ceil(avgSold * 1.1);
      
      // Confiança baseada na quantidade de dados
      const confidence: 'low' | 'medium' | 'high' = 
        stats.sold.length >= 7 ? 'high' : 
        stats.sold.length >= 3 ? 'medium' : 'low';

      suggestions.push({
        productId: product.id,
        productName: product.name,
        avgDaily: Math.round(avgSold),
        avgReturned: Math.round(avgReturned),
        suggestedQuantity,
        confidence,
        trend
      });
    });

    return suggestions;
  };

  return (
    <DataContext.Provider value={{ 
      users, clients, products, productionData, routes, dailyLoads,
      addUser, addClient, updateClient, updateProduct, addProduct, deleteProduct, addRoute, deleteRoute,
      getRoutesByDriver, getClientsByDriver, getAllClients, getDrivers,
      updateDailyProduction, getDailyRecord,
      calculateClientDebt, registerPayment, toggleSkippedDate, updateClientPrice,
      createDailyLoad, updateDailyLoad, completeDailyLoad, getDailyLoadByDriver, getDailyLoadsByDate, getDailyLoadReport, getProductionSuggestions
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