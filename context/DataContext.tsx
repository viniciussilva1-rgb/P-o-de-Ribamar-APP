import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Client, UserRole, Product, ProductionData, DailyProductionRecord, Route, PaymentTransaction, DeliverySchedule, DailyLoad, LoadItem, ReturnItem, DailyLoadReport, ProductionSuggestion, ClientDelivery, DeliveryStatus, DriverDailySummary, AdminDeliveryReport, DeliveryItem, DynamicConsumptionRecord, ProductConsumptionStats, DynamicClientHistory, DynamicClientPrediction, DynamicLoadSummary, DailyCashFund, DailyDriverClosure, DailyPaymentReceived, WeeklyDriverSettlement, ClientPaymentSummary, ClientConsumptionHistory, ClientInvoice } from '../types';
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
  updateClientsOrder: (clientsOrder: { id: string; sortOrder: number }[]) => Promise<void>;
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
  getClientPaymentInfo: (clientId: string) => { lastPaymentDate: string | null; lastPaymentAmount: number | null; paidUntilDate: string | null; unpaidDates: string[]; paidDates: string[] };
  getClientConsumptionHistory: (clientId: string) => ClientConsumptionHistory;
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
  updateDynamicDeliveryItems: (deliveryId: string, items: { productId: string; quantity: number; price: number }[]) => Promise<void>;
  addExtraToDelivery: (deliveryId: string, extraItems: { productId: string; productName: string; quantity: number; unitPrice: number }[]) => Promise<void>;
  removeExtraFromDelivery: (deliveryId: string, productId: string) => Promise<void>;
  substituteProductInDelivery: (deliveryId: string, originalProductId: string, originalQuantityToReplace: number, newProductId: string, newQuantity: number) => Promise<void>;
  revertSubstituteInDelivery: (deliveryId: string, substituteProductId: string) => Promise<void>;
  adjustQuantityInDelivery: (deliveryId: string, productId: string, newQuantity: number) => Promise<void>;
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
  getSettlementHistory: (driverId: string) => WeeklyDriverSettlement[];
  getLastConfirmedSettlement: (driverId: string) => WeeklyDriverSettlement | undefined;
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

  // 7.1 Corrigir nomes de produtos genéricos nas entregas existentes
  useEffect(() => {
    if (products.length === 0 || clientDeliveries.length === 0) return;
    
    const fixProductNames = async () => {
      const deliveriesToFix = clientDeliveries.filter(d => 
        d.items && d.items.some(item => 
          item.productName === 'Produto' && item.productId
        )
      );
      
      if (deliveriesToFix.length === 0) return;
      
      console.log(`[Fix] Corrigindo nomes de produtos em ${deliveriesToFix.length} entregas...`);
      
      for (const delivery of deliveriesToFix) {
        const updatedItems = delivery.items.map(item => {
          if (item.productName === 'Produto' && item.productId) {
            const product = products.find(p => p.id === item.productId);
            if (product) {
              return { ...item, productName: product.name };
            }
          }
          return item;
        });
        
        // Só atualizar se houve mudança
        const hasChanges = updatedItems.some((item, idx) => 
          item.productName !== delivery.items[idx].productName
        );
        
        if (hasChanges) {
          try {
            await updateDoc(doc(db, 'client_deliveries', delivery.id), {
              items: updatedItems
            });
            console.log(`[Fix] Entrega ${delivery.id} corrigida`);
          } catch (err) {
            console.error(`[Fix] Erro ao corrigir entrega ${delivery.id}:`, err);
          }
        }
      }
    };
    
    fixProductNames();
  }, [products, clientDeliveries.length]); // Executar quando produtos carregarem

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
    // Se o deliverySchedule foi alterado, guardar no histórico
    if (updates.deliverySchedule !== undefined) {
      const client = clients.find(c => c.id === id);
      if (client) {
        const today = new Date().toISOString().split('T')[0];
        
        // Criar entrada no histórico com o novo agendamento
        const newHistoryEntry = {
          date: today,
          schedule: updates.deliverySchedule
        };
        
        // Adicionar ao histórico existente
        const existingHistory = client.scheduleHistory || [];
        updates.scheduleHistory = [...existingHistory, newHistoryEntry];
        
        console.log(`[updateClient] Guardando histórico de agendamento para cliente ${id}:`, newHistoryEntry);
      }
    }
    
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

  // Atualizar ordem de múltiplos clientes de uma vez
  const updateClientsOrder = async (clientsOrder: { id: string; sortOrder: number }[]): Promise<void> => {
    const promises = clientsOrder.map(({ id, sortOrder }) => 
      updateDoc(doc(db, 'clients', id), { sortOrder })
    );
    await Promise.all(promises);
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

    // Para clientes dinâmicos, usar as entregas reais (client_deliveries)
    if (client.isDynamicChoice) {
      // Filtrar entregas deste cliente após a última data de pagamento
      const clientDeliveriesForDebt = clientDeliveries.filter(d => {
        if (d.clientId !== client.id) return false;
        if (d.status === 'not_delivered') return false; // Não entregue não conta
        
        // Apenas entregas após lastPaymentDate
        if (client.lastPaymentDate && d.date <= client.lastPaymentDate) return false;
        
        return true;
      });

      // Somar o valor de cada entrega
      clientDeliveriesForDebt.forEach(delivery => {
        if (delivery.totalValue > 0) {
          total += delivery.totalValue;
          daysCount++;
          
          // Criar detalhes
          const itemsDesc = delivery.items.map(item => 
            `${item.quantity}x ${item.productName}`
          ).join(', ');
          details.push(`${delivery.date}: €${delivery.totalValue.toFixed(2)} (${itemsDesc})`);
        }
      });

      return { total, daysCount, details };
    }

    // Para clientes normais, usar o schedule
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

  // Obter informações de pagamento do cliente para o modal
  const getClientPaymentInfo = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) {
      return {
        lastPaymentDate: null,
        lastPaymentAmount: null,
        paidUntilDate: null,
        unpaidDates: [],
        paidDates: []
      };
    }

    // Buscar o último pagamento dos registros diários (mais confiável)
    const clientPaymentsFromDaily = dailyPaymentsReceived
      .filter(p => p.clientId === clientId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    
    const lastDailyPayment = clientPaymentsFromDaily[0];

    // Último pagamento do histórico do cliente
    const paymentHistory = client.paymentHistory || [];
    const lastPayment = paymentHistory.length > 0 
      ? paymentHistory[paymentHistory.length - 1] 
      : null;

    // Data até quando está pago: usar o mais recente entre daily_payments e client.lastPaymentDate
    const paidUntilDate = lastDailyPayment?.paidUntil || client.lastPaymentDate || null;

    // Calcular datas pagas e não pagas (últimos 60 dias)
    const paidDates: string[] = [];
    const unpaidDates: string[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Data de início (60 dias atrás ou data de criação do cliente)
    const startLimit = new Date();
    startLimit.setDate(startLimit.getDate() - 60);
    
    const clientCreatedDate = new Date(client.createdAt.split('T')[0]);
    const startDate = clientCreatedDate > startLimit ? clientCreatedDate : startLimit;

    const currentDate = new Date(startDate);
    
    while (currentDate <= today) {
      const dateStr = currentDate.toISOString().split('T')[0];
      
      // Verificar se é dia de entrega
      const dayIndex = currentDate.getDay();
      const mapKeys = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
      const dayKey = mapKeys[dayIndex] as keyof DeliverySchedule;
      const scheduledItems = client.deliverySchedule?.[dayKey];
      
      // Se tem entrega programada para este dia
      if (scheduledItems && scheduledItems.length > 0) {
        // Verificar se foi pulado (não entregue)
        if (client.skippedDates?.includes(dateStr)) {
          // Dia pulado - não conta
        } else {
          // Verificar se está pago
          if (paidUntilDate && dateStr <= paidUntilDate) {
            paidDates.push(dateStr);
          } else {
            unpaidDates.push(dateStr);
          }
        }
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return {
      lastPaymentDate: lastDailyPayment?.date || lastPayment?.date || null,
      lastPaymentAmount: lastDailyPayment?.amount || lastPayment?.amount || null,
      paidUntilDate,
      unpaidDates,
      paidDates
    };
  };

  // Obter histórico completo de consumo/faturas do cliente
  const getClientConsumptionHistory = (clientId: string): ClientConsumptionHistory => {
    const client = clients.find(c => c.id === clientId);
    
    if (!client) {
      return {
        clientId,
        clientName: '',
        paymentFrequency: 'Diário',
        lastPaymentDate: null,
        paidUntilDate: null,
        totalDebt: 0,
        daysUnpaid: 0,
        allInvoices: [],
        unpaidInvoices: [],
        paidInvoices: [],
        paymentHistory: []
      };
    }

    // Buscar o último pagamento dos registros diários (mais confiável)
    const clientPaymentsFromDaily = dailyPaymentsReceived
      .filter(p => p.clientId === clientId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    
    const lastDailyPayment = clientPaymentsFromDaily[0];
    
    // paidUntilDate: usar o mais recente entre daily_payments e client.lastPaymentDate
    const paidUntilDate = lastDailyPayment?.paidUntil || client.lastPaymentDate || null;
    
    const paymentHistory = (client.paymentHistory || []).map(p => ({
      date: p.date,
      amount: p.amount,
      method: p.method
    }));

    // Data de hoje para filtrar entregas futuras
    const today = new Date().toISOString().split('T')[0];

    // Buscar todas as entregas deste cliente (ordenadas por data desc)
    // IMPORTANTE: Filtrar apenas entregas até hoje E que foram realmente entregues
    const allDeliveries = clientDeliveries
      .filter(d => {
        if (d.clientId !== clientId) return false;
        if (d.status === 'not_delivered') return false;
        
        // Não mostrar entregas futuras
        if (d.date > today) return false;
        
        // Para clientes dinâmicos, só mostrar entregas que foram confirmadas (têm itens com quantidade > 0)
        if (client.isDynamicChoice) {
          // Se status é 'delivered', mostrar
          if (d.status === 'delivered') return true;
          // Se é 'pending' e tem itens com valor, pode ter sido gerada automaticamente
          // Não mostrar pending sem itens reais
          if (d.status === 'pending') {
            const hasRealItems = d.items && d.items.length > 0 && d.items.some(item => item.quantity > 0 && item.productName && item.productName !== 'Produto');
            return hasRealItems;
          }
          return false;
        }
        
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));

    // Converter entregas em faturas
    const allInvoices: ClientInvoice[] = allDeliveries.map(delivery => {
      // Uma entrega está paga se a data é menor OU IGUAL à data "pago até"
      const isPaid = paidUntilDate ? delivery.date <= paidUntilDate : false;
      
      return {
        date: delivery.date,
        items: delivery.items.map(item => ({
          productId: item.productId,
          productName: item.productName || 'Produto',
          quantity: item.quantity,
          unitPrice: item.unitPrice || 0,
          totalPrice: item.totalPrice || (item.quantity * (item.unitPrice || 0)),
          isExtra: (item as any).isExtra || false,
          isSubstitute: (item as any).isSubstitute || false
        })),
        totalValue: delivery.totalValue,
        isPaid,
        deliveryId: delivery.id
      };
    });

    const unpaidInvoices = allInvoices.filter(inv => !inv.isPaid);
    const paidInvoices = allInvoices.filter(inv => inv.isPaid);

    // Calcular débito total usando a mesma lógica
    // Para clientes dinâmicos: somar entregas não pagas
    // Para clientes normais: usar calculateClientDebt
    let totalDebt = 0;
    let daysUnpaid = 0;
    
    if (client.isDynamicChoice) {
      // Para dinâmicos: débito = soma das entregas não pagas
      totalDebt = unpaidInvoices.reduce((sum, inv) => sum + inv.totalValue, 0);
      daysUnpaid = unpaidInvoices.length;
    } else {
      // Para normais: usar a função existente
      const debtCalc = calculateClientDebt(client);
      totalDebt = debtCalc.total;
      daysUnpaid = debtCalc.daysCount;
    }

    // Calcular crédito (pagamento adiantado)
    // Se paidUntilDate é maior que hoje, cliente tem crédito
    let credit = 0;
    let hasFutureCredit = false;
    
    if (paidUntilDate && paidUntilDate > today) {
      hasFutureCredit = true;
      // Calcular quantos dias de crédito tem
      // (simplificado: não calculamos valor exato, só indicamos que tem crédito)
    }

    return {
      clientId,
      clientName: client.name,
      paymentFrequency: client.paymentFrequency || 'Diário',
      lastPaymentDate: lastDailyPayment?.date || (paymentHistory.length > 0 ? paymentHistory[paymentHistory.length - 1].date : null),
      paidUntilDate,
      totalDebt: Math.max(0, totalDebt), // Não mostrar valores negativos
      daysUnpaid,
      credit,
      hasFutureCredit,
      allInvoices,
      unpaidInvoices,
      paidInvoices,
      paymentHistory
    };
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
      loadStartTime: now,
      totalLoaded,
      createdAt: now,
      updatedAt: now
    };

    // Apenas incluir loadObservations se não estiver vazio
    if (observations && observations.trim()) {
      newLoad.loadObservations = observations.trim();
    }
    
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

    // Preparar dados para atualização (sem campos undefined)
    const updateData: Record<string, unknown> = {
      status: 'completed',
      returnItems,
      returnTime: now,
      totalSold,
      totalReturned,
      utilizationRate,
      updatedAt: now
    };

    // Apenas incluir returnObservations se não estiver vazio
    if (observations && observations.trim()) {
      updateData.returnObservations = observations.trim();
    }

    await updateDoc(doc(db, 'daily_loads', loadId), updateData);

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

  // Obter clientes com entrega programada para um dia específico (ordenados por sortOrder)
  const getScheduledClientsForDay = (driverId: string, date: string): Client[] => {
    const dayKey = getDayKey(date);
    
    const filteredClients = clients.filter(client => {
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
    
    // Ordenar por sortOrder (clientes sem sortOrder vão para o final)
    return filteredClients.sort((a, b) => {
      const orderA = a.sortOrder ?? 9999;
      const orderB = b.sortOrder ?? 9999;
      return orderA - orderB;
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
          const itemTotal = price * item.quantity;
          totalValue += itemTotal;
          return { 
            productId: item.productId, 
            quantity: item.quantity,
            productName: product?.name || 'Produto',
            unitPrice: price,
            totalPrice: parseFloat(itemTotal.toFixed(2))
          };
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
      
      // Se estava como "não entregue" antes, remover da lista de skippedDates
      const client = clients.find(c => c.id === delivery.clientId);
      if (client && client.skippedDates?.includes(delivery.date)) {
        const newSkipped = client.skippedDates.filter(d => d !== delivery.date);
        await updateDoc(doc(db, 'clients', client.id), {
          skippedDates: newSkipped
        });
      }
    } else if (status === 'not_delivered') {
      updates.notDeliveredReason = reason || 'Não informado';
      updates.valueAdjustment = delivery.totalValue;
      
      // Adicionar a data aos skippedDates do cliente para não contabilizar na dívida
      const client = clients.find(c => c.id === delivery.clientId);
      if (client) {
        const currentSkipped = client.skippedDates || [];
        // Só adiciona se ainda não estiver na lista
        if (!currentSkipped.includes(delivery.date)) {
          const newSkipped = [...currentSkipped, delivery.date];
          await updateDoc(doc(db, 'clients', client.id), {
            skippedDates: newSkipped
          });
        }
      }
    }
    
    await updateDoc(doc(db, 'client_deliveries', deliveryId), updates);
  };

  // Atualizar itens de uma entrega dinâmica
  const updateDynamicDeliveryItems = async (
    deliveryId: string, 
    items: { productId: string; quantity: number; price: number }[]
  ): Promise<void> => {
    // Buscar diretamente do Firestore para garantir dados atualizados
    const deliveryRef = doc(db, 'client_deliveries', deliveryId);
    
    // Converter itens para o formato correto com nome do produto
    const deliveryItems = items.map(item => {
      const product = products.find(p => p.id === item.productId);
      const totalPrice = (item.price || 0) * (item.quantity || 0);
      return {
        productId: item.productId,
        productName: product?.name || 'Produto',
        quantity: item.quantity || 0,
        unitPrice: item.price || 0,
        totalPrice: parseFloat(totalPrice.toFixed(2))
      };
    });
    
    // Calcular valor total
    const totalValue = deliveryItems.reduce((sum, item) => sum + item.totalPrice, 0);
    
    console.log('[updateDynamicDeliveryItems] Salvando itens:', deliveryItems);
    console.log('[updateDynamicDeliveryItems] Total:', totalValue);
    
    // Salvar itens E marcar como entregue numa única operação
    await updateDoc(deliveryRef, {
      items: deliveryItems,
      totalValue: parseFloat(totalValue.toFixed(2)),
      status: 'delivered',
      deliveredAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    console.log('[updateDynamicDeliveryItems] Salvo com sucesso!');
  };

  // Adicionar itens extras a uma entrega
  const addExtraToDelivery = async (
    deliveryId: string, 
    extraItems: { productId: string; productName: string; quantity: number; unitPrice: number }[]
  ): Promise<void> => {
    const delivery = clientDeliveries.find(d => d.id === deliveryId);
    if (!delivery) return;
    
    // Calcular valor dos extras
    const extraValue = extraItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    
    // Criar novos itens para adicionar (marcados como extra)
    const newItems = extraItems.map(item => ({
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: parseFloat((item.quantity * item.unitPrice).toFixed(2)),
      isExtra: true // Marca como item extra
    }));
    
    // Atualizar a entrega com os novos itens
    const updatedItems = [...delivery.items, ...newItems];
    const newTotalValue = parseFloat((delivery.totalValue + extraValue).toFixed(2));
    
    await updateDoc(doc(db, 'client_deliveries', deliveryId), {
      items: updatedItems,
      totalValue: newTotalValue,
      updatedAt: new Date().toISOString()
    });
  };

  // Remover item extra de uma entrega
  const removeExtraFromDelivery = async (deliveryId: string, productId: string): Promise<void> => {
    const delivery = clientDeliveries.find(d => d.id === deliveryId);
    if (!delivery) return;
    
    // Encontrar o item extra a ser removido
    const itemToRemove = delivery.items.find(item => 
      item.productId === productId && (item as any).isExtra === true
    );
    if (!itemToRemove) return;
    
    // Remover o item e recalcular valor
    const updatedItems = delivery.items.filter(item => 
      !(item.productId === productId && (item as any).isExtra === true)
    );
    const removedValue = (itemToRemove as any).totalPrice || (itemToRemove.quantity * ((itemToRemove as any).unitPrice || 0));
    const newTotalValue = parseFloat((delivery.totalValue - removedValue).toFixed(2));
    
    await updateDoc(doc(db, 'client_deliveries', deliveryId), {
      items: updatedItems,
      totalValue: Math.max(0, newTotalValue),
      updatedAt: new Date().toISOString()
    });
  };

  // Substituir produto em uma entrega (apenas para este dia)
  const substituteProductInDelivery = async (
    deliveryId: string, 
    originalProductId: string,
    originalQuantityToReplace: number, // Quantas unidades do original serão substituídas
    newProductId: string, 
    newQuantity: number
  ): Promise<void> => {
    const delivery = clientDeliveries.find(d => d.id === deliveryId);
    if (!delivery) return;
    
    const newProduct = products.find(p => p.id === newProductId);
    if (!newProduct) return;
    
    // Encontrar o item original (não extra, não já substituído)
    const originalItemIndex = delivery.items.findIndex(item => 
      item.productId === originalProductId && !(item as any).isExtra && !(item as any).isSubstitute
    );
    if (originalItemIndex === -1) return;
    
    const originalItem = delivery.items[originalItemIndex];
    const originalUnitPrice = (originalItem as any).unitPrice || 0;
    const originalProductName = (originalItem as any).productName || getProductName(originalProductId);
    
    // Calcular valor a ser removido (baseado na quantidade substituída)
    const valueToRemove = parseFloat((originalQuantityToReplace * originalUnitPrice).toFixed(2));
    const newValue = parseFloat((newQuantity * newProduct.price).toFixed(2));
    
    // Criar item substituto marcado como substituição
    const substitutedItem = {
      productId: newProduct.id,
      productName: newProduct.name,
      quantity: newQuantity,
      unitPrice: newProduct.price,
      totalPrice: newValue,
      isSubstitute: true,
      originalProductId: originalProductId,
      originalProductName: originalProductName,
      originalQuantityReplaced: originalQuantityToReplace // Guardar quantos foram substituídos
    };
    
    // Calcular quantidade restante do produto original
    const remainingQuantity = originalItem.quantity - originalQuantityToReplace;
    
    // Atualizar a lista de itens
    const updatedItems = [...delivery.items];
    
    if (remainingQuantity > 0) {
      // Reduzir quantidade do original e adicionar substituto
      const updatedOriginal = {
        ...originalItem,
        quantity: remainingQuantity,
        totalPrice: parseFloat((remainingQuantity * originalUnitPrice).toFixed(2))
      };
      updatedItems[originalItemIndex] = updatedOriginal as any;
      updatedItems.push(substitutedItem as any);
    } else {
      // Substituir completamente
      updatedItems.splice(originalItemIndex, 1, substitutedItem as any);
    }
    
    // Recalcular valor total
    const newTotalValue = parseFloat((delivery.totalValue - valueToRemove + newValue).toFixed(2));
    
    await updateDoc(doc(db, 'client_deliveries', deliveryId), {
      items: updatedItems,
      totalValue: newTotalValue,
      updatedAt: new Date().toISOString()
    });
  };

  // Reverter substituição - volta o produto original
  const revertSubstituteInDelivery = async (deliveryId: string, substituteProductId: string): Promise<void> => {
    const delivery = clientDeliveries.find(d => d.id === deliveryId);
    if (!delivery) return;
    
    // Encontrar o item substituto
    const substituteItemIndex = delivery.items.findIndex(item => 
      item.productId === substituteProductId && (item as any).isSubstitute === true
    );
    if (substituteItemIndex === -1) return;
    
    const substituteItem = delivery.items[substituteItemIndex] as any;
    const originalProductId = substituteItem.originalProductId;
    const originalProductName = substituteItem.originalProductName;
    const originalQuantityReplaced = substituteItem.originalQuantityReplaced || substituteItem.quantity;
    
    // Obter preço do produto original
    const originalProduct = products.find(p => p.id === originalProductId);
    const originalUnitPrice = originalProduct?.price || 0;
    
    // Calcular valores
    const substituteValue = substituteItem.totalPrice || (substituteItem.quantity * substituteItem.unitPrice);
    const originalValue = parseFloat((originalQuantityReplaced * originalUnitPrice).toFixed(2));
    
    // Verificar se já existe o produto original na lista (caso de substituição parcial)
    const existingOriginalIndex = delivery.items.findIndex(item => 
      item.productId === originalProductId && !(item as any).isSubstitute && !(item as any).isExtra
    );
    
    const updatedItems = [...delivery.items];
    
    if (existingOriginalIndex >= 0) {
      // Somar a quantidade de volta ao original existente
      const existingOriginal = updatedItems[existingOriginalIndex] as any;
      const newQuantity = existingOriginal.quantity + originalQuantityReplaced;
      updatedItems[existingOriginalIndex] = {
        ...existingOriginal,
        quantity: newQuantity,
        totalPrice: parseFloat((newQuantity * originalUnitPrice).toFixed(2))
      };
      // Remover o substituto
      updatedItems.splice(substituteItemIndex, 1);
    } else {
      // Criar item original novamente no lugar do substituto
      const restoredOriginal = {
        productId: originalProductId,
        productName: originalProductName,
        quantity: originalQuantityReplaced,
        unitPrice: originalUnitPrice,
        totalPrice: originalValue
      };
      updatedItems.splice(substituteItemIndex, 1, restoredOriginal as any);
    }
    
    // Recalcular valor total
    const newTotalValue = parseFloat((delivery.totalValue - substituteValue + originalValue).toFixed(2));
    
    await updateDoc(doc(db, 'client_deliveries', deliveryId), {
      items: updatedItems,
      totalValue: newTotalValue,
      updatedAt: new Date().toISOString()
    });
  };

  // Ajustar quantidade de um produto na entrega (apenas para este dia)
  const adjustQuantityInDelivery = async (
    deliveryId: string, 
    productId: string, 
    newQuantity: number
  ): Promise<void> => {
    const delivery = clientDeliveries.find(d => d.id === deliveryId);
    if (!delivery) return;
    
    // Encontrar o item (não extra, não substituto)
    const itemIndex = delivery.items.findIndex(item => 
      item.productId === productId && !(item as any).isExtra && !(item as any).isSubstitute
    );
    if (itemIndex === -1) return;
    
    const item = delivery.items[itemIndex] as any;
    
    // Obter o preço unitário - tentar do item, depois do cliente, depois do produto
    const client = clients.find(c => c.id === delivery.clientId);
    const product = products.find(p => p.id === productId);
    const unitPrice = item.unitPrice || client?.customPrices?.[productId] || product?.price || 0;
    
    const oldQuantity = item.quantity;
    const oldValue = item.totalPrice || (oldQuantity * unitPrice);
    
    // Guardar quantidade original se ainda não foi guardada
    const originalQuantity = item.originalQuantity || oldQuantity;
    
    const updatedItems = [...delivery.items];
    
    if (newQuantity <= 0) {
      // Remover item se quantidade for 0 ou menos
      updatedItems.splice(itemIndex, 1);
      const newTotalValue = parseFloat((delivery.totalValue - oldValue).toFixed(2));
      
      await updateDoc(doc(db, 'client_deliveries', deliveryId), {
        items: updatedItems,
        totalValue: Math.max(0, newTotalValue),
        updatedAt: new Date().toISOString()
      });
    } else {
      // Atualizar quantidade
      const newValue = parseFloat((newQuantity * unitPrice).toFixed(2));
      
      updatedItems[itemIndex] = {
        ...item,
        quantity: newQuantity,
        unitPrice: unitPrice, // Garantir que unitPrice está salvo
        totalPrice: newValue,
        productName: item.productName || product?.name || 'Produto',
        originalQuantity: originalQuantity, // Guardar quantidade original do registo
        isAdjusted: newQuantity !== originalQuantity // Marcar se foi ajustado
      };
      
      const newTotalValue = parseFloat((delivery.totalValue - oldValue + newValue).toFixed(2));
      
      await updateDoc(doc(db, 'client_deliveries', deliveryId), {
        items: updatedItems,
        totalValue: newTotalValue,
        updatedAt: new Date().toISOString()
      });
    }
  };

  // Função auxiliar para obter nome do produto
  const getProductName = (productId: string): string => {
    const product = products.find(p => p.id === productId);
    return product?.name || 'Produto';
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
    
    // Também atualiza o lastPaymentDate do cliente (pago até) e adiciona ao histórico
    if (client) {
      const paymentHistoryEntry = {
        date: today, // Data em que o pagamento foi feito
        amount,
        method
      };
      
      const existingHistory = client.paymentHistory || [];
      
      await updateDoc(doc(db, 'clients', clientId), {
        lastPaymentDate: paidUntil || today, // Data até quando está pago (selecionada pelo entregador)
        paymentHistory: [...existingHistory, paymentHistoryEntry],
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
  // Considera apenas valores recebidos APÓS o último fecho confirmado
  const calculateWeeklySettlement = (driverId: string, weekStartDate: string) => {
    const driver = users.find(u => u.id === driverId);
    
    // Calcular data final da semana (domingo)
    const startDate = new Date(weekStartDate);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    const weekEndDate = endDate.toISOString().split('T')[0];
    
    // Buscar o ÚLTIMO fecho confirmado deste entregador (independente da semana)
    // Isso garante que após um fecho, os valores sempre começam do zero
    const lastConfirmedSettlement = weeklySettlements
      .filter(s => s.driverId === driverId && s.status === 'confirmed')
      .sort((a, b) => {
        // Ordenar por data de confirmação (mais recente primeiro)
        const dateA = a.confirmedAt || a.createdAt || '';
        const dateB = b.confirmedAt || b.createdAt || '';
        return dateB.localeCompare(dateA);
      })[0];
    
    // Timestamp do último fecho - só contar valores APÓS este momento
    const lastSettlementTimestamp = lastConfirmedSettlement?.confirmedAt || null;
    
    // Buscar todos os pagamentos APÓS o último fecho (sem limite de semana para o período atual)
    const weekPayments = dailyPaymentsReceived.filter(p => {
      const matchesDriver = p.driverId === driverId;
      
      // Se há um fecho confirmado, só contar pagamentos APÓS a confirmação
      if (lastSettlementTimestamp) {
        const paymentTimestamp = p.createdAt || '';
        return matchesDriver && paymentTimestamp > lastSettlementTimestamp;
      }
      
      // Se não há fecho anterior, considerar toda a semana atual
      const inDateRange = p.date >= weekStartDate && p.date <= weekEndDate;
      return matchesDriver && inDateRange;
    });
    
    // Buscar todas as entregas APÓS o último fecho
    const weekDeliveries = clientDeliveries.filter(d => {
      const matchesDriver = d.driverId === driverId;
      const isDelivered = d.status === 'delivered';
      
      // Se há um fecho confirmado, só contar entregas APÓS a confirmação
      if (lastSettlementTimestamp) {
        const deliveryTimestamp = d.deliveredAt || d.createdAt || '';
        return matchesDriver && isDelivered && deliveryTimestamp > lastSettlementTimestamp;
      }
      
      // Se não há fecho anterior, considerar toda a semana atual
      const inDateRange = d.date >= weekStartDate && d.date <= weekEndDate;
      return matchesDriver && inDateRange && isDelivered;
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

  // Obter Fecho Semanal existente (retorna o mais recente confirmado)
  const getWeeklySettlement = (driverId: string, weekStartDate: string): WeeklyDriverSettlement | undefined => {
    // Buscar todos os fechos desta semana para este entregador
    const weekSettlements = weeklySettlements
      .filter(s => s.driverId === driverId && s.weekStartDate === weekStartDate && s.status === 'confirmed')
      .sort((a, b) => {
        const dateA = a.confirmedAt || a.createdAt || '';
        const dateB = b.confirmedAt || b.createdAt || '';
        return dateB.localeCompare(dateA); // Mais recente primeiro
      });
    
    return weekSettlements[0];
  };

  // Confirmar Fecho Semanal (Admin)
  const confirmWeeklySettlement = async (settlementId: string, adminId: string, observations?: string): Promise<void> => {
    const parts = settlementId.split('-');
    const driverId = parts[1];
    const weekStartDate = parts.slice(2).join('-');
    
    // Verificar se já existe um fecho confirmado para esta semana
    const existingConfirmed = weeklySettlements.find(
      s => s.driverId === driverId && s.weekStartDate === weekStartDate && s.status === 'confirmed'
    );
    
    const calculatedData = calculateWeeklySettlement(driverId, weekStartDate);
    const now = new Date().toISOString();
    
    if (existingConfirmed) {
      // Já existe um fecho confirmado - criar um NOVO fecho parcial
      // Usa timestamp para garantir ID único
      const newSettlementId = `settlement-${driverId}-${weekStartDate}-${Date.now()}`;
      
      const newSettlement: WeeklyDriverSettlement = {
        id: newSettlementId,
        ...calculatedData,
        status: 'confirmed',
        confirmedAt: now,
        confirmedBy: adminId,
        createdAt: now,
        updatedAt: now,
        ...(observations && observations.trim() !== '' ? { observations } : {})
      };
      
      await setDoc(doc(db, 'weekly_settlements', newSettlementId), newSettlement);
    } else {
      // Primeiro fecho da semana - usar ID original
      const newSettlement: WeeklyDriverSettlement = {
        id: settlementId,
        ...calculatedData,
        status: 'confirmed',
        confirmedAt: now,
        confirmedBy: adminId,
        createdAt: now,
        updatedAt: now,
        ...(observations && observations.trim() !== '' ? { observations } : {})
      };
      
      await setDoc(doc(db, 'weekly_settlements', settlementId), newSettlement);
    }
  };

  // Obter todos os fechos pendentes
  const getAllPendingSettlements = (): WeeklyDriverSettlement[] => {
    return weeklySettlements.filter(s => s.status === 'pending');
  };

  // Obter histórico de fechos de um entregador (ordenado do mais recente ao mais antigo)
  const getSettlementHistory = (driverId: string): WeeklyDriverSettlement[] => {
    return weeklySettlements
      .filter(s => s.driverId === driverId && s.status === 'confirmed')
      .sort((a, b) => {
        const dateA = a.confirmedAt || a.createdAt || '';
        const dateB = b.confirmedAt || b.createdAt || '';
        return dateB.localeCompare(dateA);
      });
  };

  // Obter o último fecho confirmado de um entregador
  const getLastConfirmedSettlement = (driverId: string): WeeklyDriverSettlement | undefined => {
    return getSettlementHistory(driverId)[0];
  };

  return (
    <DataContext.Provider value={{ 
      users, clients, products, productionData, routes, dailyLoads, clientDeliveries, dynamicConsumptionRecords,
      dailyCashFunds, dailyDriverClosures, dailyPaymentsReceived, weeklySettlements,
      addUser, addClient, updateClient, updateClientsOrder, updateProduct, addProduct, deleteProduct, addRoute, deleteRoute,
      getRoutesByDriver, getClientsByDriver, getAllClients, getDrivers,
      updateDailyProduction, getDailyRecord,
      calculateClientDebt, getClientPaymentInfo, getClientConsumptionHistory, registerPayment, toggleSkippedDate, updateClientPrice, updatePricesForRoute,
      createDailyLoad, updateDailyLoad, completeDailyLoad, getDailyLoadByDriver, getDailyLoadsByDate, getDailyLoadReport, getProductionSuggestions,
      generateDailyDeliveries, updateDeliveryStatus, updateDynamicDeliveryItems, addExtraToDelivery, removeExtraFromDelivery, substituteProductInDelivery, revertSubstituteInDelivery, adjustQuantityInDelivery, getDeliveriesByDriver, getDriverDailySummary, getAdminDeliveryReport, getScheduledClientsForDay,
      recordDynamicDelivery, getDynamicClientHistory, getDynamicClientPrediction, getDynamicLoadSummary, getDynamicClientsForDriver,
      saveDailyCashFund, getDailyCashFund, registerDailyPayment, getDailyPaymentsByDriver, getClientPaymentSummaries,
      saveDailyDriverClosure, getDailyDriverClosure, calculateDailyClosureData,
      getWeeklySettlement, calculateWeeklySettlement, confirmWeeklySettlement, getAllPendingSettlements, getSettlementHistory, getLastConfirmedSettlement
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