
export enum UserRole {
  ADMIN = 'ADMIN',
  DRIVER = 'DRIVER',
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
}

export interface Route {
  id: string;
  name: string;
  driverId: string;
}

export interface DeliveryItem {
  productId: string;
  quantity: number;
}

export interface DeliverySchedule {
  seg?: DeliveryItem[];
  ter?: DeliveryItem[];
  qua?: DeliveryItem[];
  qui?: DeliveryItem[];
  sex?: DeliveryItem[];
  sab?: DeliveryItem[];
  dom?: DeliveryItem[];
}

export interface PaymentTransaction {
  id: string;
  date: string;
  amount: number;
  method: string;
}

export interface Client {
  id: string;
  name: string;
  address: string;
  phone: string;
  nif?: string;
  driverId: string; // The driver who owns this client
  routeId?: string; // The specific zone/route
  coordinates?: {
    lat: number;
    lng: number;
  };
  status: 'ACTIVE' | 'INACTIVE';
  
  // Escolha Dinâmica de Produtos
  isDynamicChoice?: boolean; // Cliente com escolha dinâmica (sem lista fixa)
  
  // Payment & Logistics
  paymentMethod?: string; // Legacy/Fallback
  paymentFrequency: 'Diário' | 'Semanal' | 'Mensal' | 'Personalizado';
  paymentCustomDays?: number; // If frequency is Personalizado (e.g., 15 days)
  currentBalance: number; // This can be manually set or auto-calculated
  lastPaymentDate?: string; // Date of the last zero-out
  paymentHistory?: PaymentTransaction[];
  
  // Custom Pricing per Product (Key: ProductID, Value: Price)
  customPrices?: Record<string, number>; 

  leaveReceipt: boolean; // "Precisa deixar papel (Talão)?"
  acceptsReturns: boolean; // "Aceita Devolução de Sobras?"

  // Exceptions
  skippedDates?: string[]; // Array of 'YYYY-MM-DD' where delivery was skipped

  // Delivery Schedule (para clientes normais)
  deliverySchedule?: DeliverySchedule;

  notes?: string;
  deliveryObs?: string;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  quantity: number; // Current stock/production placeholder
  targetQuantity: number;
  unit: string;
  price: number;
  category: string;
  supportsEmpelo?: boolean; // Defines if product can be counted in Empelos (30 units)
}

export interface DailyProductionRecord {
  produced: number;
  delivered: number;
  sold: number;
  leftovers: number;
}

export interface ProductionData {
  [date: string]: {
    [productId: string]: DailyProductionRecord;
  }
}

// ========== SISTEMA DE CARGA DO DIA ==========

export interface LoadItem {
  productId: string;
  quantity: number; // Quantidade carregada
}

export interface ReturnItem {
  productId: string;
  returned: number; // Quantidade devolvida
  sold: number; // Calculado: carregado - devolvido
}

export type DailyLoadStatus = 'loading' | 'in_route' | 'completed';

export interface DailyLoad {
  id: string;
  driverId: string;
  date: string; // YYYY-MM-DD
  status: DailyLoadStatus;
  
  // Carga inicial
  loadItems: LoadItem[];
  loadObservations?: string;
  loadStartTime?: string; // ISO timestamp
  
  // Sobras/Retorno
  returnItems?: ReturnItem[];
  returnObservations?: string;
  returnTime?: string; // ISO timestamp
  
  // Métricas calculadas
  totalLoaded?: number;
  totalSold?: number;
  totalReturned?: number;
  utilizationRate?: number; // Percentual de aproveitamento
  
  createdAt: string;
  updatedAt: string;
}

// Relatório agregado por dia
export interface DailyLoadReport {
  date: string;
  drivers: {
    driverId: string;
    driverName: string;
    loads: DailyLoad[];
    totalLoaded: number;
    totalSold: number;
    totalReturned: number;
    utilizationRate: number;
  }[];
  totals: {
    totalLoaded: number;
    totalSold: number;
    totalReturned: number;
    utilizationRate: number;
    productBreakdown: {
      productId: string;
      productName: string;
      loaded: number;
      sold: number;
      returned: number;
      utilizationRate: number;
      alertHighReturn: boolean; // Alerta para sobra acima do normal
    }[];
  };
}

// Sugestão de produção baseada em histórico
export interface ProductionSuggestion {
  productId: string;
  productName: string;
  avgDaily: number; // Média diária vendida
  avgReturned: number; // Média de devolução
  suggestedQuantity: number; // Quantidade sugerida
  confidence: 'low' | 'medium' | 'high'; // Baseado na quantidade de dados
  trend: 'up' | 'down' | 'stable'; // Tendência recente
}

// ========== SISTEMA DE ENTREGA DO DIA ==========

export type DeliveryStatus = 'pending' | 'delivered' | 'not_delivered';

export interface ClientDelivery {
  id: string;
  date: string; // YYYY-MM-DD
  driverId: string;
  clientId: string;
  routeId?: string;
  
  // Dados do cliente (snapshot no momento)
  clientName: string;
  clientAddress: string;
  clientPhone: string;
  
  // Itens da entrega
  items: DeliveryItem[];
  totalValue: number; // Valor total da entrega
  
  // Status e controle
  status: DeliveryStatus;
  deliveredAt?: string; // ISO timestamp quando foi entregue
  notDeliveredReason?: string; // Motivo se não entregue
  
  // Ajustes financeiros
  valueAdjustment?: number; // Valor abatido se não entregue
  
  createdAt: string;
  updatedAt: string;
}

// Resumo diário do entregador
export interface DriverDailySummary {
  date: string;
  driverId: string;
  
  // Totais de produtos
  productTotals: {
    productId: string;
    productName: string;
    quantity: number;
    value: number;
  }[];
  
  // Totais por rota
  routeTotals: {
    routeId: string;
    routeName: string;
    clientCount: number;
    totalValue: number;
    deliveredCount: number;
    pendingCount: number;
  }[];
  
  // Métricas gerais
  totalClients: number;
  totalDelivered: number;
  totalNotDelivered: number;
  totalPending: number;
  totalValue: number;
  deliveredValue: number;
  adjustedValue: number; // Valor abatido por não entregas
}

// Relatório administrativo
export interface AdminDeliveryReport {
  date: string;
  drivers: {
    driverId: string;
    driverName: string;
    deliveries: ClientDelivery[];
    summary: DriverDailySummary;
  }[];
  totals: {
    totalDeliveries: number;
    deliveredCount: number;
    notDeliveredCount: number;
    pendingCount: number;
    totalValue: number;
    deliveredValue: number;
    adjustedValue: number;
    productBreakdown: {
      productId: string;
      productName: string;
      totalQuantity: number;
      deliveredQuantity: number;
      notDeliveredQuantity: number;
    }[];
  };
}

// ========== ESCOLHA DINÂMICA DE PRODUTOS ==========

// Registro de consumo histórico de um cliente (cada entrega)
export interface DynamicConsumptionRecord {
  id: string;
  clientId: string;
  driverId: string;
  date: string; // YYYY-MM-DD
  dayOfWeek: number; // 0-6 (dom-sab)
  items: {
    productId: string;
    quantity: number;
    price: number;
  }[];
  totalValue: number;
  createdAt: string;
}

// Estatísticas de consumo por produto para um cliente
export interface ProductConsumptionStats {
  productId: string;
  productName: string;
  totalOrders: number; // Quantas vezes foi pedido
  totalQuantity: number; // Quantidade total histórica
  averageQuantity: number; // Média por pedido
  minQuantity: number; // Mínimo registrado
  maxQuantity: number; // Máximo registrado
  stdDeviation: number; // Desvio padrão
  lastOrderDate?: string; // Última vez que pediu
  trend: 'increasing' | 'stable' | 'decreasing'; // Tendência
  // Por dia da semana (0-6)
  byDayOfWeek: {
    dayOfWeek: number;
    averageQuantity: number;
    orderCount: number;
  }[];
}

// Histórico completo de um cliente com escolha dinâmica
export interface DynamicClientHistory {
  clientId: string;
  clientName: string;
  totalDeliveries: number;
  firstDeliveryDate?: string;
  lastDeliveryDate?: string;
  productStats: ProductConsumptionStats[];
  averageTotalValue: number;
  // Dias da semana que mais compra (ordenado)
  preferredDays: number[];
}

// Previsão de carga para cliente dinâmico
export interface DynamicClientPrediction {
  clientId: string;
  clientName: string;
  routeId?: string;
  routeName?: string;
  date: string;
  dayOfWeek: number;
  hasHistory: boolean; // Se tem histórico ou usa padrão
  confidence: 'high' | 'medium' | 'low'; // Confiança na previsão
  predictedItems: {
    productId: string;
    productName: string;
    minQuantity: number;
    avgQuantity: number;
    maxQuantity: number;
    recommendedQuantity: number; // Quantidade recomendada para levar
  }[];
  predictedTotalValue: number;
}

// Resumo de carga extra para clientes dinâmicos
export interface DynamicLoadSummary {
  date: string;
  driverId: string;
  dynamicClientsCount: number;
  predictions: DynamicClientPrediction[];
  // Totais recomendados por produto
  recommendedLoad: {
    productId: string;
    productName: string;
    minTotal: number;
    avgTotal: number;
    maxTotal: number;
    recommendedTotal: number;
  }[];
  totalRecommendedValue: number;
}

// Configurações padrão para clientes sem histórico
export interface DynamicDefaultSettings {
  id: string;
  // Quantidade padrão inicial por produto
  defaultQuantities: {
    productId: string;
    quantity: number;
  }[];
  // Margem de segurança (%) para previsões
  safetyMarginPercent: number;
  // Mínimo de entregas para considerar histórico confiável
  minDeliveriesForReliableHistory: number;
  updatedAt: string;
  updatedBy: string;
}

// ========== CAIXA DO ENTREGADOR ==========

// Fundo de Caixa Diário
export interface DailyCashFund {
  id: string;
  driverId: string;
  date: string; // YYYY-MM-DD
  initialAmount: number; // Valor inicial do fundo
  observations?: string;
  createdAt: string;
  updatedAt: string;
}

// Fecho Diário do Entregador
export interface DailyDriverClosure {
  id: string;
  driverId: string;
  date: string; // YYYY-MM-DD
  
  // Valores do entregador
  cashFundAmount: number; // Fundo de caixa inicial
  countedAmount: number; // Valor contado pelo entregador no final
  
  // Valores calculados automaticamente
  totalReceivedCash: number; // Total recebido em dinheiro no dia
  totalReceivedMbway: number; // Total recebido em MBWay
  totalReceivedTransfer: number; // Total recebido em transferência
  totalReceivedOther: number; // Outros métodos
  expectedCashAmount: number; // Fundo + recebido em dinheiro
  
  // Diferença
  difference: number; // countedAmount - expectedCashAmount
  status: 'balanced' | 'surplus' | 'shortage'; // Bateu certo, Sobra, Falta
  
  // Por rota
  routeTotals: {
    routeId: string;
    routeName: string;
    totalReceived: number;
    clientCount: number;
  }[];
  
  observations?: string;
  createdAt: string;
  updatedAt: string;
}

// Pagamento recebido pelo entregador (registro diário)
export interface DailyPaymentReceived {
  id: string;
  driverId: string;
  clientId: string;
  date: string; // YYYY-MM-DD
  
  // Dados do cliente (snapshot)
  clientName: string;
  routeId?: string;
  routeName?: string;
  
  // Pagamento
  amount: number;
  method: 'Dinheiro' | 'MBWay' | 'Transferência' | 'Cartão' | 'Outro';
  
  // Período que o pagamento cobre
  paidUntil?: string; // Data até quando está pago
  
  // Referência
  referenceDeliveryIds?: string[]; // IDs das entregas que este pagamento cobre
  
  createdAt: string;
}

// Fecho Semanal (Administrador)
export interface WeeklyDriverSettlement {
  id: string;
  driverId: string;
  driverName: string;
  
  // Período
  weekStartDate: string; // YYYY-MM-DD (segunda-feira)
  weekEndDate: string; // YYYY-MM-DD (domingo)
  
  // Totais da semana
  totalDelivered: number; // Valor total de entregas entregues
  totalReceived: number; // Valor total recebido dos clientes
  totalToSettle: number; // Valor que o entregador deve entregar ao admin
  
  // Por método de pagamento
  cashTotal: number;
  mbwayTotal: number;
  transferTotal: number;
  otherTotal: number;
  
  // Por rota
  routeTotals: {
    routeId: string;
    routeName: string;
    totalDelivered: number;
    totalReceived: number;
    clientsPaid: number;
  }[];
  
  // Lista de clientes que pagaram
  clientPayments: {
    clientId: string;
    clientName: string;
    routeId?: string;
    routeName?: string;
    totalPaid: number;
    method: string;
    paymentDates: string[];
  }[];
  
  // Status
  status: 'pending' | 'confirmed';
  confirmedAt?: string;
  confirmedBy?: string;
  
  observations?: string;
  createdAt: string;
  updatedAt: string;
}

// Resumo de pagamentos de um cliente (para visualização)
export interface ClientPaymentSummary {
  clientId: string;
  clientName: string;
  routeId?: string;
  routeName?: string;
  lastPaymentDate?: string;
  paidUntil?: string;
  paymentMethod?: string;
  todayPayment?: number; // Valor pago hoje (se houver)
  totalDebt: number; // Saldo devedor atual
}

