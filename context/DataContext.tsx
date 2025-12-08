import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Client, UserRole, Product, ProductionData, DailyProductionRecord, Route, PaymentTransaction, DeliverySchedule, DailyLoad, LoadItem, ReturnItem, DailyLoadReport, ProductionSuggestion, ClientDelivery, DeliveryStatus, DriverDailySummary, AdminDeliveryReport, DeliveryItem, DynamicConsumptionRecord, ProductConsumptionStats, DynamicClientHistory, DynamicClientPrediction, DynamicLoadSummary, DailyCashFund, DailyDriverClosure, DailyPaymentReceived, WeeklyDriverSettlement, ClientPaymentSummary } from '../types';
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
  updatePricesForRoute: (routeId: string, prices: Record<string, number>, userRole: UserRole) => Promise<{ success: number; failed: number }>;
  
  // Funções de Carga do Dia
  createDailyLoad: (driverId: string, date: string, loadItems: LoadItem[], observations?: string) => Promise<DailyLoad>;
  updateDailyLoad: (loadId: string, updates: Partial<DailyLoad>) => Promise<void>;
  completeDailyLoad: (loadId: string, returnItems: ReturnItem[], observations?: string) => Promise<void>;
  getDailyLoadByDriver: (driverId: string, date: string) => DailyLoad | undefined;
  getDailyLoadsByDate: (date: string) => DailyLoad[];
  getDailyLoadReport: (date: string) => DailyLoadReport;
  getProductionSuggestions: (daysToAnalyze?: number) => ProductionSuggestion[];
  
  // Funções de Entrega do Dia
  clientDeliveries: ClientDelivery[];
  generateDailyDeliveries: (driverId: string, date: string) => Promise<ClientDelivery[]>;
  updateDeliveryStatus: (deliveryId: string, status: DeliveryStatus, reason?: string) => Promise<void>;
  getDeliveriesByDriver: (driverId: string, date: string) => ClientDelivery[];
  getDriverDailySummary: (driverId: string, date: string) => DriverDailySummary;
  getAdminDeliveryReport: (date: string) => AdminDeliveryReport;
  getScheduledClientsForDay: (driverId: string, date: string) => Client[];
  
  // Funções de Escolha Dinâmica (IA)
  dynamicConsumptionRecords: DynamicConsumptionRecord[];
  recordDynamicDelivery: (clientId: string, driverId: string, items: { productId: string; quantity: number; price: number }[]) => Promise<void>;
  getDynamicClientHistory: (clientId: string) => DynamicClientHistory | null;
  getDynamicClientPrediction: (clientId: string, date: string) => DynamicClientPrediction;
  getDynamicLoadSummary: (driverId: string, date: string) => DynamicLoadSummary;
  getDynamicClientsForDriver: (driverId: string) => Client[];
  
  // Funções do Caixa do Entregador
  dailyCashFunds: DailyCashFund[];
  dailyDriverClosures: DailyDriverClosure[];
  dailyPaymentsReceived: DailyPaymentReceived[];
  weeklySettlements: WeeklyDriverSettlement[];
  
  // Fundo de Caixa
  saveDailyCashFund: (driverId: string, date: string, initialAmount: number, observations?: string) => Promise<void>;
  getDailyCashFund: (driverId: string, date: string) => DailyCashFund | undefined;
  
  // Pagamentos Recebidos
  registerDailyPayment: (driverId: string, clientId: string, amount: number, method: string, paidUntil?: string) => Promise<void>;
  getDailyPaymentsByDriver: (driverId: string, date: string) => DailyPaymentReceived[];
  getClientPaymentSummaries: (driverId: string) => ClientPaymentSummary[];
  
  // Fecho Diário
  saveDailyDriverClosure: (driverId: string, date: string, countedAmount: number, observations?: string) => Promise<void>;
  getDailyDriverClosure: (driverId: string, date: string) => DailyDriverClosure | undefined;
  calculateDailyClosureData: (driverId: string, date: string) => Omit<DailyDriverClosure, 'id' | 'countedAmount' | 'difference' | 'status' | 'observations' | 'createdAt' | 'updatedAt'>;
  
  // Fecho Semanal (Admin)
  getWeeklySettlement: (driverId: string, weekStartDate: string) => WeeklyDriverSettlement | undefined;
  calculateWeeklySettlement: (driverId: string, weekStartDate: string) => Omit<WeeklyDriverSettlement, 'id' | 'status' | 'confirmedAt' | 'confirmedBy' | 'observations' | 'createdAt' | 'updatedAt'>;
  confirmWeeklySettlement: (settlementId: string, adminId: string, observations?: string) => Promise<void>;
  getAllPendingSettlements: () => WeeklyDriverSettlement[];
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [productionData, setProductionData] = useState<ProductionData>({});
  const [dailyLoads, setDailyLoads] = useState<DailyLoad[]>([]);
  const [clientDeliveries, setClientDeliveries] = useState<ClientDelivery[]>([]);
  const [dynamicConsumptionRecords, setDynamicConsumptionRecords] = useState<DynamicConsumptionRecord[]>([]);
  
  // Estados do Caixa do Entregador
  const [dailyCashFunds, setDailyCashFunds] = useState<DailyCashFund[]>([]);
  const [dailyDriverClosures, setDailyDriverClosures] = useState<DailyDriverClosure[]>([]);
  const [dailyPaymentsReceived, setDailyPaymentsReceived] = useState<DailyPaymentReceived[]>([]);
  const [weeklySettlements, setWeeklySettlements] = useState<WeeklyDriverSettlement[]>([]);

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

  // 7. Client Deliveries (Entrega do Dia)
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'client_deliveries'), (snapshot) => {
      const deliveriesList = snapshot.docs.map(docSnap => ({
        ...docSnap.data(),
        id: docSnap.id
      } as ClientDelivery));
      setClientDeliveries(deliveriesList);
    });
    return () => unsubscribe();
  }, []);

  // 8. Dynamic Consumption Records (Histórico de Escolha Dinâmica)
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'dynamic_consumption'), (snapshot) => {
      const recordsList = snapshot.docs.map(docSnap => ({
        ...docSnap.data(),
        id: docSnap.id
      } as DynamicConsumptionRecord));
      setDynamicConsumptionRecords(recordsList);
    });
    return () => unsubscribe();
  }, []);

  // 9. Daily Cash Funds (Fundo de Caixa Diário)
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'daily_cash_funds'), (snapshot) => {
      const fundsList = snapshot.docs.map(docSnap => ({
        ...docSnap.data(),
        id: docSnap.id
      } as DailyCashFund));
      setDailyCashFunds(fundsList);
    });
    return () => unsubscribe();
  }, []);

  // 10. Daily Driver Closures (Fecho Diário do Entregador)
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'daily_driver_closures'), (snapshot) => {
      const closuresList = snapshot.docs.map(docSnap => ({
        ...docSnap.data(),
        id: docSnap.id
      } as DailyDriverClosure));
      setDailyDriverClosures(closuresList);
    });
    return () => unsubscribe();
  }, []);

  // 11. Daily Payments Received (Pagamentos Recebidos)
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'daily_payments_received'), (snapshot) => {
      const paymentsList = snapshot.docs.map(docSnap => ({
        ...docSnap.data(),
        id: docSnap.id
      } as DailyPaymentReceived));
      setDailyPaymentsReceived(paymentsList);
    });
    return () => unsubscribe();
  }, []);

  // 12. Weekly Settlements (Fecho Semanal)
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'weekly_settlements'), (snapshot) => {
      const settlementsList = snapshot.docs.map(docSnap => ({
        ...docSnap.data(),
        id: docSnap.id
      } as WeeklyDriverSettlement));
      setWeeklySettlements(settlementsList);
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
    
    // Se o deliverySchedule foi alterado, atualizar entregas pendentes de hoje
    if (updates.deliverySchedule !== undefined) {
      const today = new Date().toISOString().split('T')[0];
      const dayKey = getDayKeyFromDate(today);
      
      // Buscar entregas pendentes deste cliente para hoje
      const pendingDeliveries = clientDeliveries.filter(
        d => d.clientId === id && d.date === today && d.status === 'pending'
      );
      
      console.log(`[updateClient] Atualizando ${pendingDeliveries.length} entregas pendentes para cliente ${id}`);
      console.log(`[updateClient] Dia: ${dayKey}, Schedule:`, updates.deliverySchedule?.[dayKey]);
      
      for (const delivery of pendingDeliveries) {
        // Usar os dados do updates, não do state (que pode estar desatualizado)
        const clientData = clients.find(c => c.id === id);
        const customPrices = updates.customPrices ?? clientData?.customPrices ?? {};
        const newScheduledItems = updates.deliverySchedule?.[dayKey] || [];
        
        console.log(`[updateClient] Novos itens para entrega ${delivery.id}:`, newScheduledItems);
        
        // Recalcular itens e valor
        let totalValue = 0;
        const items: { productId: string; quantity: number }[] = newScheduledItems.map(item => {
          const product = products.find(p => p.id === item.productId);
          const price = customPrices[item.productId] ?? product?.price ?? 0;
          totalValue += price * item.quantity;
          return { productId: item.productId, quantity: item.quantity };
        });
        
        console.log(`[updateClient] Atualizando entrega ${delivery.id} com itens:`, items, `valor: ${totalValue}`);
        
        // Atualizar a entrega no Firestore
        await updateDoc(doc(db, 'client_deliveries', delivery.id), {
          items,
          totalValue: parseFloat(totalValue.toFixed(2)),
          updatedAt: new Date().toISOString()
        });
      }
    }
  };

  // Helper para obter a chave do dia
  const getDayKeyFromDate = (date: string): 'dom' | 'seg' | 'ter' | 'qua' | 'qui' | 'sex' | 'sab' => {
    const mapKeys: ('dom' | 'seg' | 'ter' | 'qua' | 'qui' | 'sex' | 'sab')[] = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
    return mapKeys[new Date(date).getDay()];
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

  // Atualizar preços para todos os clientes de uma rota
  const updatePricesForRoute = async (routeId: string, prices: Record<string, number>, userRole: UserRole): Promise<{ success: number; failed: number }> => {
    if (userRole !== UserRole.ADMIN) {
      console.warn("Acesso negado: Apenas administradores podem alterar preços em massa.");
      return { success: 0, failed: 0 };
    }

    const clientsInRoute = clients.filter(c => c.routeId === routeId && c.status === 'ACTIVE');
    let success = 0;
    let failed = 0;

    for (const client of clientsInRoute) {
      try {
        const currentCustomPrices = client.customPrices || {};
        const updatedPrices = { ...currentCustomPrices };
        
        // Só atualiza os produtos que têm preço definido (não vazio)
        for (const [productId, price] of Object.entries(prices)) {
          if (price !== undefined && price !== null && !isNaN(price)) {
            updatedPrices[productId] = price;
          }
        }

        await updateDoc(doc(db, 'clients', client.id), {
          customPrices: updatedPrices
        });
        success++;
      } catch (error) {
        console.error(`Erro ao atualizar preços do cliente ${client.name}:`, error);
        failed++;
      }
    }

    return { success, failed };
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

  // ========== FUNÇÕES DE ENTREGA DO DIA ==========

  // Helper: Obter dia da semana como chave do schedule
  const getDayKey = (date: string): keyof DeliverySchedule => {
    const dayIndex = new Date(date).getDay();
    const mapKeys: (keyof DeliverySchedule)[] = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
    return mapKeys[dayIndex];
  };

  // Obter clientes com entrega programada para um dia específico
  const getScheduledClientsForDay = (driverId: string, date: string): Client[] => {
    const dayKey = getDayKey(date);
    
    return clients.filter(client => {
      // Deve pertencer ao entregador
      if (client.driverId !== driverId) return false;
      
      // Deve estar ativo
      if (client.status !== 'ACTIVE') return false;
      
      // Verificar se está nos dias pulados
      if (client.skippedDates?.includes(date)) return false;
      
      // Clientes dinâmicos sempre aparecem (eles escolhem na hora)
      if (client.isDynamicChoice) return true;
      
      // Para clientes normais, verificar se tem entrega programada para este dia
      const scheduledItems = client.deliverySchedule?.[dayKey];
      return scheduledItems && scheduledItems.length > 0;
    });
  };

  // Gerar entregas do dia para um entregador
  const generateDailyDeliveries = async (driverId: string, date: string): Promise<ClientDelivery[]> => {
    const dayKey = getDayKey(date);
    const scheduledClients = getScheduledClientsForDay(driverId, date);
    
    // Verificar entregas já existentes
    const existingDeliveries = clientDeliveries.filter(
      d => d.driverId === driverId && d.date === date
    );
    const existingClientIds = new Set(existingDeliveries.map(d => d.clientId));
    
    const newDeliveries: ClientDelivery[] = [];
    const now = new Date().toISOString();
    
    for (const client of scheduledClients) {
      // Não criar se já existe
      if (existingClientIds.has(client.id)) continue;
      
      let items: DeliveryItem[] = [];
      let totalValue = 0;
      
      if (client.isDynamicChoice) {
        // Cliente dinâmico: itens vazios, serão preenchidos na entrega
        // Usar previsão da IA para estimar valor
        const prediction = getDynamicClientPrediction(client.id, date);
        totalValue = prediction.predictedTotalValue;
      } else {
        // Cliente normal: usar schedule fixo
        const scheduledItems = client.deliverySchedule?.[dayKey] || [];
        items = scheduledItems.map(item => {
          const product = products.find(p => p.id === item.productId);
          const price = client.customPrices?.[item.productId] ?? product?.price ?? 0;
          totalValue += price * item.quantity;
          return { productId: item.productId, quantity: item.quantity };
        });
      }
      
      const deliveryId = `delivery-${driverId}-${client.id}-${date}`;
      
      const newDelivery: ClientDelivery = {
        id: deliveryId,
        date,
        driverId,
        clientId: client.id,
        routeId: client.routeId,
        clientName: client.name,
        clientAddress: client.address,
        clientPhone: client.phone,
        items,
        totalValue: parseFloat(totalValue.toFixed(2)),
        status: 'pending',
        createdAt: now,
        updatedAt: now
      };
      
      await setDoc(doc(db, 'client_deliveries', deliveryId), newDelivery);
      newDeliveries.push(newDelivery);
    }
    
    return [...existingDeliveries, ...newDeliveries];
  };

  // Atualizar status de uma entrega
  const updateDeliveryStatus = async (deliveryId: string, status: DeliveryStatus, reason?: string): Promise<void> => {
    const delivery = clientDeliveries.find(d => d.id === deliveryId);
    if (!delivery) return;
    
    const now = new Date().toISOString();
    const updates: Partial<ClientDelivery> = {
      status,
      updatedAt: now
    };
    
    if (status === 'delivered') {
      updates.deliveredAt = now;
    } else if (status === 'not_delivered') {
      updates.notDeliveredReason = reason || 'Não informado';
      updates.valueAdjustment = delivery.totalValue;
      
      // Abater do saldo do cliente
      const client = clients.find(c => c.id === delivery.clientId);
      if (client) {
        const newBalance = Math.max(0, (client.currentBalance || 0) - delivery.totalValue);
        await updateDoc(doc(db, 'clients', client.id), {
          currentBalance: newBalance
        });
      }
    }
    
    await updateDoc(doc(db, 'client_deliveries', deliveryId), updates);
  };

  // Obter entregas de um entregador para uma data
  const getDeliveriesByDriver = (driverId: string, date: string): ClientDelivery[] => {
    return clientDeliveries.filter(d => d.driverId === driverId && d.date === date);
  };

  // Gerar resumo diário do entregador
  const getDriverDailySummary = (driverId: string, date: string): DriverDailySummary => {
    const deliveries = getDeliveriesByDriver(driverId, date);
    
    // Totais de produtos
    const productMap = new Map<string, { quantity: number; value: number }>();
    deliveries.forEach(delivery => {
      delivery.items.forEach(item => {
        const existing = productMap.get(item.productId) || { quantity: 0, value: 0 };
        const product = products.find(p => p.id === item.productId);
        const client = clients.find(c => c.id === delivery.clientId);
        const price = client?.customPrices?.[item.productId] ?? product?.price ?? 0;
        productMap.set(item.productId, {
          quantity: existing.quantity + item.quantity,
          value: existing.value + (price * item.quantity)
        });
      });
    });
    
    const productTotals = Array.from(productMap.entries()).map(([productId, data]) => ({
      productId,
      productName: products.find(p => p.id === productId)?.name || 'Produto',
      quantity: data.quantity,
      value: data.value
    }));
    
    // Totais por rota
    const routeMap = new Map<string, { clientCount: number; totalValue: number; deliveredCount: number; pendingCount: number }>();
    deliveries.forEach(delivery => {
      const routeId = delivery.routeId || 'sem-rota';
      const existing = routeMap.get(routeId) || { clientCount: 0, totalValue: 0, deliveredCount: 0, pendingCount: 0 };
      routeMap.set(routeId, {
        clientCount: existing.clientCount + 1,
        totalValue: existing.totalValue + delivery.totalValue,
        deliveredCount: existing.deliveredCount + (delivery.status === 'delivered' ? 1 : 0),
        pendingCount: existing.pendingCount + (delivery.status === 'pending' ? 1 : 0)
      });
    });
    
    const routeTotals = Array.from(routeMap.entries()).map(([routeId, data]) => ({
      routeId,
      routeName: routes.find(r => r.id === routeId)?.name || 'Sem Rota',
      ...data
    }));
    
    // Métricas gerais
    const delivered = deliveries.filter(d => d.status === 'delivered');
    const notDelivered = deliveries.filter(d => d.status === 'not_delivered');
    const pending = deliveries.filter(d => d.status === 'pending');
    
    return {
      date,
      driverId,
      productTotals,
      routeTotals,
      totalClients: deliveries.length,
      totalDelivered: delivered.length,
      totalNotDelivered: notDelivered.length,
      totalPending: pending.length,
      totalValue: deliveries.reduce((sum, d) => sum + d.totalValue, 0),
      deliveredValue: delivered.reduce((sum, d) => sum + d.totalValue, 0),
      adjustedValue: notDelivered.reduce((sum, d) => sum + (d.valueAdjustment || 0), 0)
    };
  };

  // Relatório administrativo
  const getAdminDeliveryReport = (date: string): AdminDeliveryReport => {
    const deliveriesForDate = clientDeliveries.filter(d => d.date === date);
    
    // Agrupar por entregador
    const driverMap = new Map<string, ClientDelivery[]>();
    deliveriesForDate.forEach(delivery => {
      const existing = driverMap.get(delivery.driverId) || [];
      driverMap.set(delivery.driverId, [...existing, delivery]);
    });
    
    const driversData = Array.from(driverMap.entries()).map(([driverId, deliveries]) => {
      const driver = users.find(u => u.id === driverId);
      return {
        driverId,
        driverName: driver?.name || 'Desconhecido',
        deliveries,
        summary: getDriverDailySummary(driverId, date)
      };
    });
    
    // Calcular totais gerais
    const allDelivered = deliveriesForDate.filter(d => d.status === 'delivered');
    const allNotDelivered = deliveriesForDate.filter(d => d.status === 'not_delivered');
    const allPending = deliveriesForDate.filter(d => d.status === 'pending');
    
    // Breakdown por produto
    const productBreakdown = new Map<string, { total: number; delivered: number; notDelivered: number }>();
    deliveriesForDate.forEach(delivery => {
      delivery.items.forEach(item => {
        const existing = productBreakdown.get(item.productId) || { total: 0, delivered: 0, notDelivered: 0 };
        productBreakdown.set(item.productId, {
          total: existing.total + item.quantity,
          delivered: existing.delivered + (delivery.status === 'delivered' ? item.quantity : 0),
          notDelivered: existing.notDelivered + (delivery.status === 'not_delivered' ? item.quantity : 0)
        });
      });
    });
    
    return {
      date,
      drivers: driversData,
      totals: {
        totalDeliveries: deliveriesForDate.length,
        deliveredCount: allDelivered.length,
        notDeliveredCount: allNotDelivered.length,
        pendingCount: allPending.length,
        totalValue: deliveriesForDate.reduce((sum, d) => sum + d.totalValue, 0),
        deliveredValue: allDelivered.reduce((sum, d) => sum + d.totalValue, 0),
        adjustedValue: allNotDelivered.reduce((sum, d) => sum + (d.valueAdjustment || 0), 0),
        productBreakdown: Array.from(productBreakdown.entries()).map(([productId, data]) => ({
          productId,
          productName: products.find(p => p.id === productId)?.name || 'Produto',
          totalQuantity: data.total,
          deliveredQuantity: data.delivered,
          notDeliveredQuantity: data.notDelivered
        }))
      }
    };
  };

  // ========== FUNÇÕES DE ESCOLHA DINÂMICA (IA) ==========

  // Obter clientes dinâmicos de um entregador
  const getDynamicClientsForDriver = (driverId: string): Client[] => {
    return clients.filter(c => c.driverId === driverId && c.isDynamicChoice && c.status === 'ACTIVE');
  };

  // Registrar entrega dinâmica (atualiza histórico)
  const recordDynamicDelivery = async (
    clientId: string, 
    driverId: string, 
    items: { productId: string; quantity: number; price: number }[]
  ): Promise<void> => {
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const dayOfWeek = now.getDay();
    
    const totalValue = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    const record: DynamicConsumptionRecord = {
      id: `dyn-${clientId}-${date}-${Date.now()}`,
      clientId,
      driverId,
      date,
      dayOfWeek,
      items,
      totalValue,
      createdAt: now.toISOString()
    };
    
    await setDoc(doc(db, 'dynamic_consumption', record.id), record);
  };

  // Calcular estatísticas de um produto para um cliente
  const calculateProductStats = (clientId: string, productId: string): ProductConsumptionStats | null => {
    const records = dynamicConsumptionRecords.filter(r => r.clientId === clientId);
    const productRecords = records
      .map(r => ({
        record: r,
        item: r.items.find(i => i.productId === productId)
      }))
      .filter(x => x.item !== undefined);
    
    if (productRecords.length === 0) return null;
    
    const quantities = productRecords.map(x => x.item!.quantity);
    const total = quantities.reduce((a, b) => a + b, 0);
    const avg = total / quantities.length;
    const min = Math.min(...quantities);
    const max = Math.max(...quantities);
    
    // Calcular desvio padrão
    const squaredDiffs = quantities.map(q => Math.pow(q - avg, 2));
    const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / squaredDiffs.length;
    const stdDev = Math.sqrt(avgSquaredDiff);
    
    // Calcular tendência (últimas 5 entregas vs anteriores)
    let trend: 'increasing' | 'stable' | 'decreasing' = 'stable';
    if (quantities.length >= 5) {
      const recent = quantities.slice(-5).reduce((a, b) => a + b, 0) / 5;
      const older = quantities.slice(0, -5);
      if (older.length > 0) {
        const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
        if (recent > olderAvg * 1.1) trend = 'increasing';
        else if (recent < olderAvg * 0.9) trend = 'decreasing';
      }
    }
    
    // Por dia da semana
    const byDayMap = new Map<number, { total: number; count: number }>();
    productRecords.forEach(x => {
      const day = x.record.dayOfWeek;
      const existing = byDayMap.get(day) || { total: 0, count: 0 };
      byDayMap.set(day, { 
        total: existing.total + x.item!.quantity, 
        count: existing.count + 1 
      });
    });
    
    const product = products.find(p => p.id === productId);
    
    return {
      productId,
      productName: product?.name || 'Produto',
      totalOrders: productRecords.length,
      totalQuantity: total,
      averageQuantity: parseFloat(avg.toFixed(1)),
      minQuantity: min,
      maxQuantity: max,
      stdDeviation: parseFloat(stdDev.toFixed(2)),
      lastOrderDate: productRecords[productRecords.length - 1]?.record.date,
      trend,
      byDayOfWeek: Array.from(byDayMap.entries()).map(([day, data]) => ({
        dayOfWeek: day,
        averageQuantity: parseFloat((data.total / data.count).toFixed(1)),
        orderCount: data.count
      }))
    };
  };

  // Obter histórico completo de um cliente dinâmico
  const getDynamicClientHistory = (clientId: string): DynamicClientHistory | null => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return null;
    
    const records = dynamicConsumptionRecords.filter(r => r.clientId === clientId);
    if (records.length === 0) {
      return {
        clientId,
        clientName: client.name,
        totalDeliveries: 0,
        productStats: [],
        averageTotalValue: 0,
        preferredDays: []
      };
    }
    
    // Produtos únicos pedidos
    const productIds = new Set<string>();
    records.forEach(r => r.items.forEach(i => productIds.add(i.productId)));
    
    // Estatísticas por produto
    const productStats: ProductConsumptionStats[] = [];
    productIds.forEach(pid => {
      const stats = calculateProductStats(clientId, pid);
      if (stats) productStats.push(stats);
    });
    
    // Dias preferidos (ordenar por frequência)
    const dayCount = new Map<number, number>();
    records.forEach(r => {
      dayCount.set(r.dayOfWeek, (dayCount.get(r.dayOfWeek) || 0) + 1);
    });
    const preferredDays = Array.from(dayCount.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([day]) => day);
    
    // Datas
    const dates = records.map(r => r.date).sort();
    
    return {
      clientId,
      clientName: client.name,
      totalDeliveries: records.length,
      firstDeliveryDate: dates[0],
      lastDeliveryDate: dates[dates.length - 1],
      productStats,
      averageTotalValue: parseFloat((records.reduce((sum, r) => sum + r.totalValue, 0) / records.length).toFixed(2)),
      preferredDays
    };
  };

  // Gerar previsão para um cliente dinâmico
  const getDynamicClientPrediction = (clientId: string, date: string): DynamicClientPrediction => {
    const client = clients.find(c => c.id === clientId);
    const dayOfWeek = new Date(date).getDay();
    const route = client?.routeId ? routes.find(r => r.id === client.routeId) : null;
    
    const history = getDynamicClientHistory(clientId);
    const hasHistory = history !== null && history.totalDeliveries >= 3;
    
    const safetyMargin = 1.2; // 20% extra de segurança
    
    const predictedItems: DynamicClientPrediction['predictedItems'] = [];
    
    if (hasHistory && history) {
      // SÓ mostra produtos que o cliente realmente pede
      history.productStats.forEach(stats => {
        // Verificar se tem dados específicos para este dia da semana
        const dayStats = stats.byDayOfWeek.find(d => d.dayOfWeek === dayOfWeek);
        const avgForDay = dayStats?.averageQuantity || stats.averageQuantity;
        
        // Calcular faixa
        const min = Math.max(1, Math.floor(avgForDay - stats.stdDeviation));
        const max = Math.ceil(avgForDay + stats.stdDeviation);
        const recommended = Math.ceil(avgForDay * safetyMargin);
        
        predictedItems.push({
          productId: stats.productId,
          productName: stats.productName,
          minQuantity: min,
          avgQuantity: parseFloat(avgForDay.toFixed(1)),
          maxQuantity: max,
          recommendedQuantity: recommended
        });
      });
    }
    // Sem histórico = lista vazia (não mostrar nada pré-selecionado)
    
    // Calcular valor total previsto
    const predictedTotalValue = predictedItems.reduce((sum, item) => {
      const product = products.find(p => p.id === item.productId);
      const price = client?.customPrices?.[item.productId] ?? product?.price ?? 0;
      return sum + (price * item.recommendedQuantity);
    }, 0);
    
    // Determinar confiança
    let confidence: 'high' | 'medium' | 'low' = 'low';
    if (hasHistory && history) {
      if (history.totalDeliveries >= 10) confidence = 'high';
      else if (history.totalDeliveries >= 5) confidence = 'medium';
    }
    
    return {
      clientId,
      clientName: client?.name || 'Cliente',
      routeId: client?.routeId,
      routeName: route?.name,
      date,
      dayOfWeek,
      hasHistory,
      confidence,
      predictedItems,
      predictedTotalValue: parseFloat(predictedTotalValue.toFixed(2))
    };
  };

  // Gerar resumo de carga extra para clientes dinâmicos
  const getDynamicLoadSummary = (driverId: string, date: string): DynamicLoadSummary => {
    const dynamicClients = getDynamicClientsForDriver(driverId);
    
    const predictions = dynamicClients.map(client => 
      getDynamicClientPrediction(client.id, date)
    );
    
    // Consolidar totais por produto
    const productTotals = new Map<string, { min: number; avg: number; max: number; recommended: number }>();
    
    predictions.forEach(prediction => {
      prediction.predictedItems.forEach(item => {
        const existing = productTotals.get(item.productId) || { min: 0, avg: 0, max: 0, recommended: 0 };
        productTotals.set(item.productId, {
          min: existing.min + item.minQuantity,
          avg: existing.avg + item.avgQuantity,
          max: existing.max + item.maxQuantity,
          recommended: existing.recommended + item.recommendedQuantity
        });
      });
    });
    
    const recommendedLoad = Array.from(productTotals.entries()).map(([productId, totals]) => ({
      productId,
      productName: products.find(p => p.id === productId)?.name || 'Produto',
      minTotal: totals.min,
      avgTotal: parseFloat(totals.avg.toFixed(1)),
      maxTotal: totals.max,
      recommendedTotal: totals.recommended
    }));
    
    return {
      date,
      driverId,
      dynamicClientsCount: dynamicClients.length,
      predictions,
      recommendedLoad,
      totalRecommendedValue: predictions.reduce((sum, p) => sum + p.predictedTotalValue, 0)
    };
  };

  // ========== FUNÇÕES DO CAIXA DO ENTREGADOR ==========

  // Salvar Fundo de Caixa Diário
  const saveDailyCashFund = async (driverId: string, date: string, initialAmount: number, observations?: string): Promise<void> => {
    const fundId = `fund-${driverId}-${date}`;
    const now = new Date().toISOString();
    
    const existingFund = dailyCashFunds.find(f => f.driverId === driverId && f.date === date);
    
    const fundData: Record<string, unknown> = {
      id: fundId,
      driverId,
      date,
      initialAmount,
      createdAt: existingFund?.createdAt || now,
      updatedAt: now
    };
    
    // Só incluir observations se tiver valor
    if (observations && observations.trim()) {
      fundData.observations = observations;
    }
    
    await setDoc(doc(db, 'daily_cash_funds', fundId), fundData);
  };

  // Obter Fundo de Caixa do dia
  const getDailyCashFund = (driverId: string, date: string): DailyCashFund | undefined => {
    return dailyCashFunds.find(f => f.driverId === driverId && f.date === date);
  };

  // Registrar Pagamento Recebido
  const registerDailyPayment = async (driverId: string, clientId: string, amount: number, method: string, paidUntil?: string): Promise<void> => {
    const today = new Date().toISOString().split('T')[0];
    const paymentId = `payment-${driverId}-${clientId}-${Date.now()}`;
    const now = new Date().toISOString();
    
    const client = clients.find(c => c.id === clientId);
    const route = client?.routeId ? routes.find(r => r.id === client.routeId) : null;
    
    const paymentData: DailyPaymentReceived = {
      id: paymentId,
      driverId,
      clientId,
      date: today,
      clientName: client?.name || 'Cliente',
      routeId: client?.routeId,
      routeName: route?.name,
      amount,
      method: method as DailyPaymentReceived['method'],
      paidUntil: paidUntil || today,
      createdAt: now
    };
    
    await setDoc(doc(db, 'daily_payments_received', paymentId), paymentData);
    
    // Também atualiza o lastPaymentDate do cliente
    if (client) {
      await updateDoc(doc(db, 'clients', clientId), {
        lastPaymentDate: today,
        currentBalance: 0
      });
    }
  };

  // Obter pagamentos do dia de um entregador
  const getDailyPaymentsByDriver = (driverId: string, date: string): DailyPaymentReceived[] => {
    return dailyPaymentsReceived.filter(p => p.driverId === driverId && p.date === date);
  };

  // Obter resumo de pagamentos de todos os clientes de um entregador
  const getClientPaymentSummaries = (driverId: string): ClientPaymentSummary[] => {
    const driverClients = clients.filter(c => c.driverId === driverId && c.status === 'ACTIVE');
    const today = new Date().toISOString().split('T')[0];
    
    return driverClients.map(client => {
      const route = client.routeId ? routes.find(r => r.id === client.routeId) : null;
      const todayPayments = dailyPaymentsReceived.filter(p => p.clientId === client.id && p.date === today);
      const todayPayment = todayPayments.reduce((sum, p) => sum + p.amount, 0);
      
      // Calcular débito
      const { total: totalDebt } = calculateClientDebt(client);
      
      // Encontrar último pagamento
      const clientPayments = dailyPaymentsReceived.filter(p => p.clientId === client.id).sort((a, b) => b.date.localeCompare(a.date));
      const lastPayment = clientPayments[0];
      
      return {
        clientId: client.id,
        clientName: client.name,
        routeId: client.routeId,
        routeName: route?.name,
        lastPaymentDate: lastPayment?.date || client.lastPaymentDate,
        paidUntil: lastPayment?.paidUntil || client.lastPaymentDate,
        paymentMethod: client.paymentMethod || 'Dinheiro',
        paymentFrequency: client.paymentFrequency,
        paymentCustomDays: client.paymentCustomDays,
        todayPayment: todayPayment > 0 ? todayPayment : undefined,
        totalDebt: Math.max(0, totalDebt - todayPayment)
      };
    });
  };

  // Calcular dados do fecho diário (sem countedAmount, que é preenchido pelo entregador)
  const calculateDailyClosureData = (driverId: string, date: string) => {
    const payments = getDailyPaymentsByDriver(driverId, date);
    const cashFund = getDailyCashFund(driverId, date);
    
    // Totais por método
    const totalReceivedCash = payments.filter(p => p.method === 'Dinheiro').reduce((sum, p) => sum + p.amount, 0);
    const totalReceivedMbway = payments.filter(p => p.method === 'MBWay').reduce((sum, p) => sum + p.amount, 0);
    const totalReceivedTransfer = payments.filter(p => p.method === 'Transferência').reduce((sum, p) => sum + p.amount, 0);
    const totalReceivedOther = payments.filter(p => !['Dinheiro', 'MBWay', 'Transferência'].includes(p.method)).reduce((sum, p) => sum + p.amount, 0);
    
    // Valor esperado no caixa (fundo + dinheiro recebido)
    const cashFundAmount = cashFund?.initialAmount || 0;
    const expectedCashAmount = cashFundAmount + totalReceivedCash;
    
    // Totais por rota
    const routeMap = new Map<string, { routeName: string; totalReceived: number; clientCount: number }>();
    payments.forEach(p => {
      const routeId = p.routeId || 'sem-rota';
      const existing = routeMap.get(routeId) || { routeName: p.routeName || 'Sem Rota', totalReceived: 0, clientCount: 0 };
      
      // Contar clientes únicos
      const clientsInRoute = new Set(payments.filter(pay => pay.routeId === routeId).map(pay => pay.clientId));
      
      routeMap.set(routeId, {
        routeName: existing.routeName,
        totalReceived: existing.totalReceived + p.amount,
        clientCount: clientsInRoute.size
      });
    });
    
    const routeTotals = Array.from(routeMap.entries()).map(([routeId, data]) => ({
      routeId,
      ...data
    }));
    
    return {
      driverId,
      date,
      cashFundAmount,
      totalReceivedCash,
      totalReceivedMbway,
      totalReceivedTransfer,
      totalReceivedOther,
      expectedCashAmount,
      routeTotals
    };
  };

  // Salvar Fecho Diário
  const saveDailyDriverClosure = async (driverId: string, date: string, countedAmount: number, observations?: string): Promise<void> => {
    const closureId = `closure-${driverId}-${date}`;
    const now = new Date().toISOString();
    
    const calculatedData = calculateDailyClosureData(driverId, date);
    const difference = countedAmount - calculatedData.expectedCashAmount;
    
    let status: DailyDriverClosure['status'] = 'balanced';
    if (Math.abs(difference) < 0.01) {
      status = 'balanced';
    } else if (difference > 0) {
      status = 'surplus';
    } else {
      status = 'shortage';
    }
    
    const existingClosure = dailyDriverClosures.find(c => c.driverId === driverId && c.date === date);
    
    const closureData: Record<string, unknown> = {
      id: closureId,
      ...calculatedData,
      countedAmount,
      difference: parseFloat(difference.toFixed(2)),
      status,
      createdAt: existingClosure?.createdAt || now,
      updatedAt: now
    };
    
    // Só incluir observations se tiver valor
    if (observations && observations.trim()) {
      closureData.observations = observations;
    }
    
    await setDoc(doc(db, 'daily_driver_closures', closureId), closureData);
  };

  // Obter Fecho Diário
  const getDailyDriverClosure = (driverId: string, date: string): DailyDriverClosure | undefined => {
    return dailyDriverClosures.find(c => c.driverId === driverId && c.date === date);
  };

  // Calcular dados do Fecho Semanal
  const calculateWeeklySettlement = (driverId: string, weekStartDate: string) => {
    const driver = users.find(u => u.id === driverId);
    
    // Calcular data final da semana (domingo)
    const startDate = new Date(weekStartDate);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    const weekEndDate = endDate.toISOString().split('T')[0];
    
    // Buscar todos os pagamentos da semana
    const weekPayments = dailyPaymentsReceived.filter(p => {
      return p.driverId === driverId && p.date >= weekStartDate && p.date <= weekEndDate;
    });
    
    // Buscar todas as entregas da semana
    const weekDeliveries = clientDeliveries.filter(d => {
      return d.driverId === driverId && d.date >= weekStartDate && d.date <= weekEndDate && d.status === 'delivered';
    });
    
    // Totais gerais
    const totalDelivered = weekDeliveries.reduce((sum, d) => sum + d.totalValue, 0);
    const totalReceived = weekPayments.reduce((sum, p) => sum + p.amount, 0);
    
    // Por método de pagamento
    const cashTotal = weekPayments.filter(p => p.method === 'Dinheiro').reduce((sum, p) => sum + p.amount, 0);
    const mbwayTotal = weekPayments.filter(p => p.method === 'MBWay').reduce((sum, p) => sum + p.amount, 0);
    const transferTotal = weekPayments.filter(p => p.method === 'Transferência').reduce((sum, p) => sum + p.amount, 0);
    const otherTotal = weekPayments.filter(p => !['Dinheiro', 'MBWay', 'Transferência'].includes(p.method)).reduce((sum, p) => sum + p.amount, 0);
    
    // Por rota
    const routeMap = new Map<string, { routeName: string; totalDelivered: number; totalReceived: number; clientsPaid: Set<string> }>();
    
    weekDeliveries.forEach(d => {
      const routeId = d.routeId || 'sem-rota';
      const route = routes.find(r => r.id === routeId);
      const existing = routeMap.get(routeId) || { routeName: route?.name || 'Sem Rota', totalDelivered: 0, totalReceived: 0, clientsPaid: new Set() };
      routeMap.set(routeId, {
        ...existing,
        totalDelivered: existing.totalDelivered + d.totalValue
      });
    });
    
    weekPayments.forEach(p => {
      const routeId = p.routeId || 'sem-rota';
      const existing = routeMap.get(routeId) || { routeName: p.routeName || 'Sem Rota', totalDelivered: 0, totalReceived: 0, clientsPaid: new Set() };
      existing.clientsPaid.add(p.clientId);
      routeMap.set(routeId, {
        ...existing,
        totalReceived: existing.totalReceived + p.amount
      });
    });
    
    const routeTotals = Array.from(routeMap.entries()).map(([routeId, data]) => ({
      routeId,
      routeName: data.routeName,
      totalDelivered: parseFloat(data.totalDelivered.toFixed(2)),
      totalReceived: parseFloat(data.totalReceived.toFixed(2)),
      clientsPaid: data.clientsPaid.size
    }));
    
    // Lista de clientes que pagaram
    const clientPaymentMap = new Map<string, { clientName: string; routeId?: string; routeName?: string; totalPaid: number; method: string; paymentDates: string[] }>();
    weekPayments.forEach(p => {
      const existing = clientPaymentMap.get(p.clientId) || { 
        clientName: p.clientName, 
        routeId: p.routeId, 
        routeName: p.routeName, 
        totalPaid: 0, 
        method: p.method, 
        paymentDates: [] 
      };
      clientPaymentMap.set(p.clientId, {
        ...existing,
        totalPaid: existing.totalPaid + p.amount,
        paymentDates: [...existing.paymentDates, p.date]
      });
    });
    
    const clientPayments = Array.from(clientPaymentMap.entries()).map(([clientId, data]) => ({
      clientId,
      ...data
    }));
    
    // O valor a entregar é o dinheiro recebido (MBWay e Transferência já vão para a conta)
    const totalToSettle = cashTotal;
    
    return {
      driverId,
      driverName: driver?.name || 'Entregador',
      weekStartDate,
      weekEndDate,
      totalDelivered: parseFloat(totalDelivered.toFixed(2)),
      totalReceived: parseFloat(totalReceived.toFixed(2)),
      totalToSettle: parseFloat(totalToSettle.toFixed(2)),
      cashTotal: parseFloat(cashTotal.toFixed(2)),
      mbwayTotal: parseFloat(mbwayTotal.toFixed(2)),
      transferTotal: parseFloat(transferTotal.toFixed(2)),
      otherTotal: parseFloat(otherTotal.toFixed(2)),
      routeTotals,
      clientPayments
    };
  };

  // Obter Fecho Semanal existente
  const getWeeklySettlement = (driverId: string, weekStartDate: string): WeeklyDriverSettlement | undefined => {
    return weeklySettlements.find(s => s.driverId === driverId && s.weekStartDate === weekStartDate);
  };

  // Confirmar Fecho Semanal (Admin)
  const confirmWeeklySettlement = async (settlementId: string, adminId: string, observations?: string): Promise<void> => {
    const settlement = weeklySettlements.find(s => s.id === settlementId);
    if (!settlement) {
      // Criar novo settlement
      const parts = settlementId.split('-');
      const driverId = parts[1];
      const weekStartDate = parts.slice(2).join('-');
      
      const calculatedData = calculateWeeklySettlement(driverId, weekStartDate);
      const now = new Date().toISOString();
      
      const newSettlement: WeeklyDriverSettlement = {
        id: settlementId,
        ...calculatedData,
        status: 'confirmed',
        confirmedAt: now,
        confirmedBy: adminId,
        observations,
        createdAt: now,
        updatedAt: now
      };
      
      await setDoc(doc(db, 'weekly_settlements', settlementId), newSettlement);
    } else {
      // Atualizar existente
      const now = new Date().toISOString();
      await updateDoc(doc(db, 'weekly_settlements', settlementId), {
        status: 'confirmed',
        confirmedAt: now,
        confirmedBy: adminId,
        observations,
        updatedAt: now
      });
    }
  };

  // Obter todos os fechos pendentes
  const getAllPendingSettlements = (): WeeklyDriverSettlement[] => {
    return weeklySettlements.filter(s => s.status === 'pending');
  };

  return (
    <DataContext.Provider value={{ 
      users, clients, products, productionData, routes, dailyLoads, clientDeliveries, dynamicConsumptionRecords,
      dailyCashFunds, dailyDriverClosures, dailyPaymentsReceived, weeklySettlements,
      addUser, addClient, updateClient, updateProduct, addProduct, deleteProduct, addRoute, deleteRoute,
      getRoutesByDriver, getClientsByDriver, getAllClients, getDrivers,
      updateDailyProduction, getDailyRecord,
      calculateClientDebt, registerPayment, toggleSkippedDate, updateClientPrice, updatePricesForRoute,
      createDailyLoad, updateDailyLoad, completeDailyLoad, getDailyLoadByDriver, getDailyLoadsByDate, getDailyLoadReport, getProductionSuggestions,
      generateDailyDeliveries, updateDeliveryStatus, getDeliveriesByDriver, getDriverDailySummary, getAdminDeliveryReport, getScheduledClientsForDay,
      recordDynamicDelivery, getDynamicClientHistory, getDynamicClientPrediction, getDynamicLoadSummary, getDynamicClientsForDriver,
      saveDailyCashFund, getDailyCashFund, registerDailyPayment, getDailyPaymentsByDriver, getClientPaymentSummaries,
      saveDailyDriverClosure, getDailyDriverClosure, calculateDailyClosureData,
      getWeeklySettlement, calculateWeeklySettlement, confirmWeeklySettlement, getAllPendingSettlements
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