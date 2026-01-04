import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { ClientDelivery, DeliveryStatus, Client, DynamicClientPrediction, ClientConsumptionHistory } from '../types';
import { 
  Package, Truck, CheckCircle, XCircle, Clock, MapPin, Phone, 
  User, AlertCircle, Loader2, Calendar, ChevronDown, ChevronRight, ChevronLeft,
  DollarSign, ClipboardList, RefreshCw, Send, Filter, Users,
  Sparkles, Edit3, Plus, Minus, Save, CreditCard, Banknote, X,
  ShoppingBag, ArrowLeftRight, Trash2, Receipt, Search, Undo2
} from 'lucide-react';

// Helper: formatar dia da semana
const getDayName = (date: string): string => {
  const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  return days[new Date(date).getDay()];
};

const getDayKey = (date: string): 'dom' | 'seg' | 'ter' | 'qua' | 'qui' | 'sex' | 'sab' => {
  const mapKeys: ('dom' | 'seg' | 'ter' | 'qua' | 'qui' | 'sex' | 'sab')[] = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
  return mapKeys[new Date(date).getDay()];
};

// ========== TIPOS E FUNÇÕES DO CALENDÁRIO DE PAGAMENTOS ==========

// Status possíveis de cada dia no calendário
export type CalendarDayStatus = 
  | 'paid'         // Verde: dia pago (data <= paidThrough)
  | 'to_pay'       // Laranja: a pagar (data > paidThrough e <= hoje)
  | 'no_bread'     // Vermelho: cliente não quis pão (marcado pelo entregador)
  | 'no_delivery'  // Cinza: sem entrega (feriado, sem rota, etc.)
  | 'future';      // Futuro: data > hoje

export interface CalendarDayInfo {
  date: string;           // YYYY-MM-DD
  status: CalendarDayStatus;
  hasDelivery: boolean;   // Se tem entrega programada para este dia
  value?: number;         // Valor da entrega (se houver)
}

/**
 * Computa o status de cada dia do calendário com base nas regras de negócio
 * 
 * @param visibleDays Array de datas visíveis no calendário (YYYY-MM-DD)
 * @param paidThrough Data até onde está pago (YYYY-MM-DD) ou null
 * @param todayStr Data de hoje (YYYY-MM-DD)
 * @param deliveryDates Datas com entrega programada
 * @param noBreadDates Datas marcadas como "cliente não quis pão"
 * @returns Map de data -> CalendarDayInfo
 */
export const computeCalendarStatuses = (
  visibleDays: string[],
  paidThrough: string | null,
  todayStr: string,
  deliveryDates: string[],
  noBreadDates: string[]
): Map<string, CalendarDayInfo> => {
  const result = new Map<string, CalendarDayInfo>();
  
  // Converter para comparação de datas sem horário
  const todayDate = new Date(todayStr);
  todayDate.setHours(0, 0, 0, 0);
  
  const paidThroughDate = paidThrough ? new Date(paidThrough) : null;
  if (paidThroughDate) {
    paidThroughDate.setHours(0, 0, 0, 0);
  }
  
  const deliverySet = new Set(deliveryDates);
  const noBreadSet = new Set(noBreadDates);
  
  for (const dateStr of visibleDays) {
    const currentDate = new Date(dateStr);
    currentDate.setHours(0, 0, 0, 0);
    
    const hasDelivery = deliverySet.has(dateStr);
    const isNoBread = noBreadSet.has(dateStr);
    const isFuture = currentDate > todayDate;
    const isPaid = paidThroughDate && currentDate <= paidThroughDate;
    
    let status: CalendarDayStatus;
    
    if (isFuture) {
      // Futuro: sem marcação de cobrança
      status = 'future';
    } else if (isNoBread) {
      // Vermelho: cliente não quis pão (prioridade sobre pago/a pagar)
      status = 'no_bread';
    } else if (!hasDelivery) {
      // Cinza: sem entrega (feriado, sem rota)
      status = 'no_delivery';
    } else if (isPaid) {
      // Verde: pago (data <= paidThrough, inclusivo)
      status = 'paid';
    } else {
      // Laranja: a pagar (data > paidThrough e <= hoje)
      status = 'to_pay';
    }
    
    result.set(dateStr, {
      date: dateStr,
      status,
      hasDelivery
    });
  }
  
  return result;
};

/**
 * Calcula o valor total do intervalo (lastPaidThrough, newPaidThrough]
 * Ou seja, do dia APÓS o último pago até a nova data (inclusivo)
 * 
 * @param invoices Lista de faturas/entregas com data e valor
 * @param lastPaidThrough Data até onde estava pago anteriormente (YYYY-MM-DD) ou null
 * @param newPaidThrough Nova data "pago até" selecionada (YYYY-MM-DD)
 * @returns Valor total do intervalo
 */
export const computeAmountForRange = (
  invoices: { date: string; totalValue: number }[],
  lastPaidThrough: string | null,
  newPaidThrough: string
): number => {
  // Filtrar faturas no intervalo (lastPaidThrough, newPaidThrough]
  // Ou seja: data > lastPaidThrough AND data <= newPaidThrough
  const relevantInvoices = invoices.filter(invoice => {
    const invoiceDate = invoice.date;
    
    // Se não tinha pago até nenhuma data, incluir todas até newPaidThrough
    if (!lastPaidThrough) {
      return invoiceDate <= newPaidThrough;
    }
    
    // Intervalo: (lastPaidThrough, newPaidThrough]
    // Estritamente MAIOR que lastPaidThrough (exclui o dia anterior)
    // Menor ou IGUAL a newPaidThrough (inclui a nova data)
    return invoiceDate > lastPaidThrough && invoiceDate <= newPaidThrough;
  });
  
  // Somar valores
  return relevantInvoices.reduce((sum, inv) => sum + inv.totalValue, 0);
};

const DriverDailyDeliveries: React.FC = () => {
  const { currentUser } = useAuth();
  const { 
    products, 
    routes,
    clients,
    generateDailyDeliveries,
    updateDeliveryStatus,
    addExtraToDelivery,
    removeExtraFromDelivery,
    substituteProductInDelivery,
    revertSubstituteInDelivery,
    adjustQuantityInDelivery,
    getDeliveriesByDriver,
    getDriverDailySummary,
    getScheduledClientsForDay,
    clientDeliveries,
    getDynamicClientsForDriver,
    getDynamicClientPrediction,
    getDynamicClientHistory,
    recordDynamicDelivery,
    registerDailyPayment,
    cancelDailyPayment,
    getDailyPaymentsByDriver,
    calculateClientDebt,
    getClientPaymentInfo,
    getClientConsumptionHistory,
    updateDynamicDeliveryItems
  } = useData();
  
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedRoute, setSelectedRoute] = useState<string>('all');
  const [deliveries, setDeliveries] = useState<ClientDelivery[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedDelivery, setExpandedDelivery] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<DeliveryStatus | 'all'>('all');
  const [notDeliveredReason, setNotDeliveredReason] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Estado para edição de entrega dinâmica
  const [editingDynamicDelivery, setEditingDynamicDelivery] = useState<string | null>(null);
  const [dynamicDeliveryItems, setDynamicDeliveryItems] = useState<{ productId: string; quantity: number; price: number }[]>([]);
  const [selectedProductToAdd, setSelectedProductToAdd] = useState<string>('');
  const [quantityToAdd, setQuantityToAdd] = useState<number>(1);

  // Estados para modal de pagamento
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentClientId, setPaymentClientId] = useState<string>('');
  const [paymentClientName, setPaymentClientName] = useState<string>('');
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('Dinheiro');
  const [paidUntilDate, setPaidUntilDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [savingPayment, setSavingPayment] = useState(false);
  const [clientDebt, setClientDebt] = useState<number>(0);

  // Estados para modal de Extra
  const [showExtraModal, setShowExtraModal] = useState(false);
  const [extraDeliveryId, setExtraDeliveryId] = useState<string>('');
  const [extraClientName, setExtraClientName] = useState<string>('');
  const [extraItems, setExtraItems] = useState<{ productId: string; productName: string; quantity: number; unitPrice: number }[]>([]);
  const [extraProductId, setExtraProductId] = useState<string>('');
  const [extraQuantity, setExtraQuantity] = useState<string>('');
  const [savingExtra, setSavingExtra] = useState(false);

  // Estados para modal de Substituição
  const [showSubstituteModal, setShowSubstituteModal] = useState(false);
  const [substituteDeliveryId, setSubstituteDeliveryId] = useState<string>('');
  const [substituteClientName, setSubstituteClientName] = useState<string>('');
  const [substituteOriginalProductId, setSubstituteOriginalProductId] = useState<string>('');
  const [substituteOriginalQty, setSubstituteOriginalQty] = useState<string>(''); // Quantas unidades do original substituir
  const [substituteNewProductId, setSubstituteNewProductId] = useState<string>('');
  const [substituteQuantity, setSubstituteQuantity] = useState<string>('');
  const [savingSubstitute, setSavingSubstitute] = useState(false);
  const [deliveryItemsForSubstitute, setDeliveryItemsForSubstitute] = useState<any[]>([]);

  // Estados para modal de Ajuste de Quantidade
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustDeliveryId, setAdjustDeliveryId] = useState<string>('');
  const [adjustClientName, setAdjustClientName] = useState<string>('');
  const [adjustProductId, setAdjustProductId] = useState<string>('');
  const [adjustProductName, setAdjustProductName] = useState<string>('');
  const [adjustCurrentQty, setAdjustCurrentQty] = useState<number>(0);
  const [adjustOriginalQty, setAdjustOriginalQty] = useState<number>(0);
  const [adjustNewQty, setAdjustNewQty] = useState<string>('');
  const [savingAdjust, setSavingAdjust] = useState(false);

  // Estados para informações de pagamento no modal
  const [paymentInfo, setPaymentInfo] = useState<{
    lastPaymentDate: string | null;
    lastPaymentAmount: number | null;
    paidUntilDate: string | null;
    unpaidDates: string[];
    paidDates: string[];
    skippedDates?: string[];
  } | null>(null);
  const [showCustomCalendar, setShowCustomCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  // Estados para atualização otimista do calendário
  const [optimisticPaidUntil, setOptimisticPaidUntil] = useState<string | null>(null);
  const [serverPaidUntil, setServerPaidUntil] = useState<string | null>(null);
  const [clientConsumptionHistory, setClientConsumptionHistory] = useState<ClientConsumptionHistory | null>(null);

  // Estados para modal de consumo/faturas
  const [showConsumptionModal, setShowConsumptionModal] = useState(false);
  const [consumptionData, setConsumptionData] = useState<ClientConsumptionHistory | null>(null);

  // Clientes dinâmicos
  const dynamicClients = currentUser?.id ? getDynamicClientsForDriver(currentUser.id) : [];

  // Rotas do entregador
  const myRoutes = routes.filter(r => r.driverId === currentUser?.id);

  // Carregar entregas do dia
  useEffect(() => {
    if (currentUser?.id) {
      const existingDeliveries = getDeliveriesByDriver(currentUser.id, selectedDate);
      setDeliveries(existingDeliveries);
    }
  }, [currentUser?.id, selectedDate, clientDeliveries]);

  // Gerar entregas do dia
  const handleGenerateDeliveries = async () => {
    if (!currentUser?.id) return;
    
    setLoading(true);
    setError('');
    
    try {
      const generated = await generateDailyDeliveries(currentUser.id, selectedDate);
      setDeliveries(generated);
    } catch (err: any) {
      console.error('Erro ao gerar entregas:', err);
      const errorMessage = err?.message || err?.code || 'Erro desconhecido';
      if (errorMessage.includes('permission-denied')) {
        setError('Erro de permissão. Contacte o administrador para verificar as regras do Firestore.');
      } else {
        setError(`Erro ao gerar entregas: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Marcar como entregue
  const handleMarkDelivered = async (deliveryId: string) => {
    setProcessingId(deliveryId);
    try {
      await updateDeliveryStatus(deliveryId, 'delivered');
    } catch (err) {
      console.error('Erro ao marcar entrega:', err);
      setError('Erro ao atualizar status.');
    } finally {
      setProcessingId(null);
    }
  };

  // Marcar como não entregue
  const handleMarkNotDelivered = async (deliveryId: string) => {
    setProcessingId(deliveryId);
    try {
      await updateDeliveryStatus(deliveryId, 'not_delivered', notDeliveredReason);
      setNotDeliveredReason('');
      setExpandedDelivery(null);
    } catch (err) {
      console.error('Erro ao marcar não entrega:', err);
      setError('Erro ao atualizar status.');
    } finally {
      setProcessingId(null);
    }
  };

  // Reverter entrega para pendente
  const handleRevertToPending = async (deliveryId: string) => {
    if (!window.confirm('Tem certeza que deseja reverter esta entrega para pendente?')) {
      return;
    }
    setProcessingId(deliveryId);
    try {
      await updateDeliveryStatus(deliveryId, 'pending');
    } catch (err) {
      console.error('Erro ao reverter entrega:', err);
      setError('Erro ao reverter status.');
    } finally {
      setProcessingId(null);
    }
  };

  // Cancelar pagamento
  const handleCancelPayment = async (clientId: string, clientName: string) => {
    if (!currentUser?.id) return;
    
    // Buscar pagamentos do dia para este cliente
    const todayPayments = getDailyPaymentsByDriver(currentUser.id, selectedDate)
      .filter(p => p.clientId === clientId);
    
    if (todayPayments.length === 0) {
      setError('Nenhum pagamento encontrado para cancelar.');
      return;
    }
    
    // Se houver múltiplos pagamentos, pegar o mais recente
    const lastPayment = todayPayments.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    
    if (!window.confirm(`Cancelar o último pagamento de €${lastPayment.amount.toFixed(2)} do cliente ${clientName}?`)) {
      return;
    }
    
    setProcessingId(clientId);
    try {
      await cancelDailyPayment(lastPayment.id, clientId);
    } catch (err) {
      console.error('Erro ao cancelar pagamento:', err);
      setError('Erro ao cancelar pagamento.');
    } finally {
      setProcessingId(null);
    }
  };

  // Verificar se cliente tem pagamento hoje
  const getClientTodayPayment = (clientId: string): number => {
    if (!currentUser?.id) return 0;
    const todayPayments = getDailyPaymentsByDriver(currentUser.id, selectedDate)
      .filter(p => p.clientId === clientId);
    return todayPayments.reduce((sum, p) => sum + p.amount, 0);
  };

  // Iniciar edição de entrega dinâmica
  const handleStartDynamicEdit = (delivery: ClientDelivery) => {
    const client = clients.find(c => c.id === delivery.clientId);
    if (!client?.isDynamicChoice) return;
    
    // Obter histórico para ver se há padrão
    const history = getDynamicClientHistory(delivery.clientId);
    
    // Se tem histórico com padrão, pré-carregar os produtos mais frequentes
    let initialItems: { productId: string; quantity: number; price: number }[] = [];
    
    if (history && history.totalDeliveries >= 3) {
      // Pegar os top 5 produtos mais pedidos
      const topProducts = history.productStats
        .sort((a, b) => b.totalOrders - a.totalOrders)
        .slice(0, 5);
      
      initialItems = topProducts.map(stat => ({
        productId: stat.productId,
        quantity: Math.round(stat.averageQuantity),
        price: client.customPrices?.[stat.productId] ?? products.find(p => p.id === stat.productId)?.price ?? 0
      }));
    }
    // Se não tem histórico, começa vazio
    
    setDynamicDeliveryItems(initialItems);
    setSelectedProductToAdd('');
    setQuantityToAdd(1);
    setEditingDynamicDelivery(delivery.id);
  };

  // Adicionar produto à lista de entrega dinâmica
  const handleAddDynamicProduct = (clientId: string) => {
    if (!selectedProductToAdd || quantityToAdd <= 0) return;
    
    const client = clients.find(c => c.id === clientId);
    const product = products.find(p => p.id === selectedProductToAdd);
    if (!product) return;
    
    const price = client?.customPrices?.[selectedProductToAdd] ?? product.price;
    
    // Verificar se já existe na lista
    const existingIndex = dynamicDeliveryItems.findIndex(item => item.productId === selectedProductToAdd);
    
    if (existingIndex >= 0) {
      // Atualizar quantidade
      setDynamicDeliveryItems(prev => 
        prev.map((item, idx) => 
          idx === existingIndex 
            ? { ...item, quantity: item.quantity + quantityToAdd }
            : item
        )
      );
    } else {
      // Adicionar novo
      setDynamicDeliveryItems(prev => [
        ...prev,
        { productId: selectedProductToAdd, quantity: quantityToAdd, price }
      ]);
    }
    
    setSelectedProductToAdd('');
    setQuantityToAdd(1);
  };

  // Remover produto da lista
  const handleRemoveDynamicProduct = (productId: string) => {
    setDynamicDeliveryItems(prev => prev.filter(item => item.productId !== productId));
  };

  // Atualizar quantidade de item dinâmico
  const updateDynamicItemQuantity = (productId: string, delta: number) => {
    setDynamicDeliveryItems(prev => 
      prev.map(item => 
        item.productId === productId 
          ? { ...item, quantity: Math.max(0, item.quantity + delta) }
          : item
      )
    );
  };

  // Confirmar entrega dinâmica
  const handleConfirmDynamicDelivery = async (deliveryId: string) => {
    const delivery = deliveries.find(d => d.id === deliveryId);
    if (!delivery || !currentUser?.id) return;
    
    const itemsWithQuantity = dynamicDeliveryItems.filter(item => item.quantity > 0);
    
    if (itemsWithQuantity.length === 0) {
      setError('Adicione pelo menos um produto à entrega.');
      return;
    }
    
    console.log('[handleConfirmDynamicDelivery] Itens a salvar:', itemsWithQuantity);
    
    setProcessingId(deliveryId);
    try {
      // Atualizar os itens E marcar como entregue (tudo numa única operação)
      await updateDynamicDeliveryItems(deliveryId, itemsWithQuantity);
      
      // Registrar consumo dinâmico (histórico para IA)
      await recordDynamicDelivery(delivery.clientId, currentUser.id, itemsWithQuantity);
      
      // NÃO chamar updateDeliveryStatus - já foi feito em updateDynamicDeliveryItems
      
      setEditingDynamicDelivery(null);
      setDynamicDeliveryItems([]);
    } catch (err) {
      console.error('Erro ao confirmar entrega dinâmica:', err);
      setError('Erro ao registrar entrega dinâmica.');
    } finally {
      setProcessingId(null);
    }
  };

  // Abrir modal de pagamento
  const handleOpenPaymentModal = (clientId: string, clientName: string) => {
    const client = clients.find(c => c.id === clientId);
    if (client) {
      const debt = calculateClientDebt(client);
      setClientDebt(debt.total);
      
      // Carregar informações de pagamento
      const info = getClientPaymentInfo(clientId);
      setPaymentInfo(info);
      
      // Carregar histórico de consumo para cálculo de valores
      const history = getClientConsumptionHistory(clientId);
      setClientConsumptionHistory(history);
      
      // Configurar estados para atualização otimista
      const confirmedPaidUntil = info.paidUntilDate || null;
      setServerPaidUntil(confirmedPaidUntil);
      setOptimisticPaidUntil(confirmedPaidUntil);
      
      // Data inicial do "pago até" é a data atual confirmada ou hoje
      setPaidUntilDate(confirmedPaidUntil || new Date().toISOString().split('T')[0]);
      
      // Calcular valor inicial baseado no intervalo
      // Se já tem paidUntil, calcular valor de hoje (se não estiver pago)
      // Senão, usar dívida total
      if (confirmedPaidUntil) {
        const todayStr = new Date().toISOString().split('T')[0];
        const invoices = history.allInvoices.map(inv => ({ date: inv.date, totalValue: inv.totalValue }));
        const amountToPay = computeAmountForRange(invoices, confirmedPaidUntil, todayStr);
        setPaymentAmount(amountToPay > 0 ? amountToPay.toFixed(2) : '');
      } else {
        setPaymentAmount(debt.total > 0 ? debt.total.toFixed(2) : '');
      }
    }
    setPaymentClientId(clientId);
    setPaymentClientName(clientName);
    setPaymentMethod('Dinheiro');
    setShowCustomCalendar(false);
    setCalendarMonth(new Date());
    setShowPaymentModal(true);
  };

  // Handler para seleção otimista de data no calendário
  const handleOptimisticDateSelect = (dateStr: string) => {
    // Atualização otimista: atualiza imediatamente o UI
    setOptimisticPaidUntil(dateStr);
    setPaidUntilDate(dateStr);
    
    // Calcular novo valor baseado no intervalo (serverPaidUntil, dateStr]
    if (clientConsumptionHistory) {
      const invoices = clientConsumptionHistory.allInvoices.map(inv => ({ 
        date: inv.date, 
        totalValue: inv.totalValue 
      }));
      const newAmount = computeAmountForRange(invoices, serverPaidUntil, dateStr);
      setPaymentAmount(newAmount > 0 ? newAmount.toFixed(2) : '0.00');
    }
    
    setShowCustomCalendar(false);
  };

  // Registrar pagamento
  const handleRegisterPayment = async () => {
    if (!currentUser?.id || !paymentClientId) return;
    
    const amount = parseFloat(paymentAmount) || 0;
    if (amount <= 0) {
      setError('Informe um valor válido');
      return;
    }
    
    // Guardar estado para possível rollback
    const previousPaidUntil = serverPaidUntil;
    
    setSavingPayment(true);
    try {
      await registerDailyPayment(currentUser.id, paymentClientId, amount, paymentMethod, paidUntilDate);
      
      // Sucesso: limpar estados
      setShowPaymentModal(false);
      setPaymentClientId('');
      setPaymentClientName('');
      setPaymentAmount('');
      setClientDebt(0);
      setOptimisticPaidUntil(null);
      setServerPaidUntil(null);
      setClientConsumptionHistory(null);
    } catch (err) {
      console.error('Erro ao registrar pagamento:', err);
      setError('Erro ao registrar pagamento');
      
      // Rollback: reverter para o último estado confirmado
      setOptimisticPaidUntil(previousPaidUntil);
      setPaidUntilDate(previousPaidUntil || new Date().toISOString().split('T')[0]);
      
      // Recalcular valor para o estado anterior
      if (clientConsumptionHistory && previousPaidUntil) {
        const invoices = clientConsumptionHistory.allInvoices.map(inv => ({ 
          date: inv.date, 
          totalValue: inv.totalValue 
        }));
        const todayStr = new Date().toISOString().split('T')[0];
        const revertedAmount = computeAmountForRange(invoices, previousPaidUntil, todayStr);
        setPaymentAmount(revertedAmount > 0 ? revertedAmount.toFixed(2) : '');
      }
    } finally {
      setSavingPayment(false);
    }
  };

  // Abrir modal de extras
  const handleOpenExtraModal = (deliveryId: string, clientName: string) => {
    setExtraDeliveryId(deliveryId);
    setExtraClientName(clientName);
    setExtraItems([]);
    setExtraProductId('');
    setExtraQuantity(1);
    setShowExtraModal(true);
  };

  // Adicionar item extra à lista
  const handleAddExtraItem = () => {
    const qty = parseInt(extraQuantity) || 0;
    if (!extraProductId || qty <= 0) return;
    
    const product = products.find(p => p.id === extraProductId);
    if (!product) return;
    
    // Verificar se já existe na lista
    const existingIndex = extraItems.findIndex(item => item.productId === extraProductId);
    if (existingIndex >= 0) {
      // Somar quantidade
      const updated = [...extraItems];
      updated[existingIndex].quantity += qty;
      setExtraItems(updated);
    } else {
      // Adicionar novo item
      setExtraItems([...extraItems, {
        productId: product.id,
        productName: product.name,
        quantity: qty,
        unitPrice: product.price
      }]);
    }
    
    setExtraProductId('');
    setExtraQuantity('');
  };

  // Remover item extra da lista
  const handleRemoveExtraItem = (productId: string) => {
    setExtraItems(extraItems.filter(item => item.productId !== productId));
  };

  // Calcular total dos extras
  const extraTotal = extraItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

  // Salvar extras e marcar como entregue
  const handleSaveExtras = async () => {
    if (!extraDeliveryId || extraItems.length === 0) return;
    
    setSavingExtra(true);
    try {
      // Adicionar extras à entrega
      await addExtraToDelivery(extraDeliveryId, extraItems);
      
      setShowExtraModal(false);
      setExtraDeliveryId('');
      setExtraClientName('');
      setExtraItems([]);
    } catch (err) {
      console.error('Erro ao adicionar extras:', err);
      setError('Erro ao adicionar itens extras');
    } finally {
      setSavingExtra(false);
    }
  };

  // Remover extra já salvo
  const handleRemoveSavedExtra = async (deliveryId: string, productId: string) => {
    try {
      await removeExtraFromDelivery(deliveryId, productId);
    } catch (err) {
      console.error('Erro ao remover extra:', err);
      setError('Erro ao remover item extra');
    }
  };

  // Reverter substituição - volta o produto original
  const handleRevertSubstitute = async (deliveryId: string, substituteProductId: string) => {
    try {
      await revertSubstituteInDelivery(deliveryId, substituteProductId);
    } catch (err) {
      console.error('Erro ao reverter substituição:', err);
      setError('Erro ao reverter substituição');
    }
  };

  // Abrir modal de ajuste de quantidade
  const handleOpenAdjustModal = (deliveryId: string, clientName: string, item: any) => {
    setAdjustDeliveryId(deliveryId);
    setAdjustClientName(clientName);
    setAdjustProductId(item.productId);
    setAdjustProductName(item.productName || getProductName(item.productId));
    setAdjustCurrentQty(item.quantity);
    setAdjustOriginalQty(item.originalQuantity || item.quantity);
    setAdjustNewQty(item.quantity.toString());
    setShowAdjustModal(true);
  };

  // Salvar ajuste de quantidade
  const handleSaveAdjust = async () => {
    const newQty = parseInt(adjustNewQty) || 0;
    if (!adjustDeliveryId || !adjustProductId) return;
    
    setSavingAdjust(true);
    try {
      await adjustQuantityInDelivery(adjustDeliveryId, adjustProductId, newQty);
      setShowAdjustModal(false);
      setAdjustDeliveryId('');
      setAdjustClientName('');
      setAdjustProductId('');
      setAdjustProductName('');
      setAdjustCurrentQty(0);
      setAdjustOriginalQty(0);
      setAdjustNewQty('');
    } catch (err) {
      console.error('Erro ao ajustar quantidade:', err);
      setError('Erro ao ajustar quantidade');
    } finally {
      setSavingAdjust(false);
    }
  };

  // Abrir modal de substituição
  const handleOpenSubstituteModal = (deliveryId: string, clientName: string, items: any[]) => {
    // Filtrar apenas itens que não são extras nem já substituídos
    const regularItems = items.filter(item => !item.isExtra && !item.isSubstitute);
    setSubstituteDeliveryId(deliveryId);
    setSubstituteClientName(clientName);
    setDeliveryItemsForSubstitute(regularItems);
    setSubstituteOriginalProductId('');
    setSubstituteOriginalQty('');
    setSubstituteNewProductId('');
    setSubstituteQuantity('');
    setShowSubstituteModal(true);
  };

  // Salvar substituição
  const handleSaveSubstitute = async () => {
    const originalQty = parseInt(substituteOriginalQty) || 0;
    const newQty = parseInt(substituteQuantity) || 0;
    if (!substituteDeliveryId || !substituteOriginalProductId || !substituteNewProductId || originalQty <= 0 || newQty <= 0) return;
    
    setSavingSubstitute(true);
    try {
      await substituteProductInDelivery(substituteDeliveryId, substituteOriginalProductId, originalQty, substituteNewProductId, newQty);
      setShowSubstituteModal(false);
      setSubstituteDeliveryId('');
      setSubstituteClientName('');
      setSubstituteOriginalProductId('');
      setSubstituteOriginalQty('');
      setSubstituteNewProductId('');
      setSubstituteQuantity('');
      setDeliveryItemsForSubstitute([]);
    } catch (err) {
      console.error('Erro ao substituir produto:', err);
      setError('Erro ao substituir produto');
    } finally {
      setSavingSubstitute(false);
    }
  };

  // Verificar se cliente é dinâmico
  const isClientDynamic = (clientId: string): boolean => {
    const client = clients.find(c => c.id === clientId);
    return client?.isDynamicChoice === true;
  };

  const getProductName = (productId: string) => {
    return products.find(p => p.id === productId)?.name || 'Produto';
  };

  const getRouteName = (routeId?: string) => {
    if (!routeId) return 'Sem Rota';
    return routes.find(r => r.id === routeId)?.name || 'Rota';
  };

  const getStatusBadge = (status: DeliveryStatus) => {
    switch (status) {
      case 'delivered':
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
            <CheckCircle size={12} /> Entregue
          </span>
        );
      case 'not_delivered':
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
            <XCircle size={12} /> Não Entregue
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
            <Clock size={12} /> Pendente
          </span>
        );
    }
  };

  // Badge de status de PAGAMENTO (separado do status de entrega)
  // Mostra se a entrega está paga ou a pagar
  const getPaymentStatusBadge = (clientId: string, deliveryDate: string, deliveryStatus: DeliveryStatus) => {
    // Só mostrar badge de pagamento para entregas que foram concluídas (delivered)
    if (deliveryStatus !== 'delivered') return null;
    
    const paymentInfo = getClientPaymentInfo(clientId);
    const isPaid = paymentInfo.paidDates.includes(deliveryDate);
    
    if (isPaid) {
      return (
        <span className="flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium" title="Pagamento confirmado">
          € Pago
        </span>
      );
    } else {
      return (
        <span className="flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium" title="Aguardando pagamento">
          € A pagar
        </span>
      );
    }
  };

  // Filtrar entregas por status, rota E termo de pesquisa
  const filteredDeliveries = deliveries.filter(d => {
    const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
    const matchesRoute = selectedRoute === 'all' || d.routeId === selectedRoute;
    const matchesSearch = searchTerm === '' || 
      d.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.clientAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.clientPhone && d.clientPhone.includes(searchTerm));
    return matchesStatus && matchesRoute && matchesSearch;
  });

  // Agrupar por rota (só se não tiver rota selecionada)
  // Ordenar: pendentes primeiro (por sortOrder), depois entregues/não entregues
  const sortDeliveries = (deliveryList: ClientDelivery[]): ClientDelivery[] => {
    return [...deliveryList].sort((a, b) => {
      // Primeiro: pendentes no topo
      const isPendingA = a.status === 'pending' ? 0 : 1;
      const isPendingB = b.status === 'pending' ? 0 : 1;
      if (isPendingA !== isPendingB) return isPendingA - isPendingB;
      
      // Depois: ordenar por sortOrder do cliente
      const clientA = clients.find(c => c.id === a.clientId);
      const clientB = clients.find(c => c.id === b.clientId);
      const orderA = clientA?.sortOrder ?? 9999;
      const orderB = clientB?.sortOrder ?? 9999;
      return orderA - orderB;
    });
  };

  const groupedDeliveries: Record<string, ClientDelivery[]> = filteredDeliveries.reduce((acc, delivery) => {
    const routeId = delivery.routeId || 'sem-rota';
    if (!acc[routeId]) acc[routeId] = [];
    acc[routeId].push(delivery);
    return acc;
  }, {} as Record<string, ClientDelivery[]>);

  // Ordenar cada grupo de entregas
  const deliveriesByRoute: Record<string, ClientDelivery[]> = selectedRoute === 'all'
    ? Object.keys(groupedDeliveries).reduce((acc, routeId) => {
        acc[routeId] = sortDeliveries(groupedDeliveries[routeId]);
        return acc;
      }, {} as Record<string, ClientDelivery[]>)
    : { [selectedRoute]: sortDeliveries(filteredDeliveries) };

  // Resumo do dia
  const summary = currentUser?.id ? getDriverDailySummary(currentUser.id, selectedDate) : null;

  // Clientes programados (para verificar se há entregas a gerar)
  const scheduledClients = currentUser?.id ? getScheduledClientsForDay(currentUser.id, selectedDate) : [];
  const hasUngenerated = scheduledClients.length > deliveries.length;

  // Clientes do entregador para diagnóstico
  const myClients = clients.filter(c => c.driverId === currentUser?.id);
  const dayKey = getDayKey(selectedDate);
  const activeClients = myClients.filter(c => c.status === 'ACTIVE');
  const clientsWithSchedule = activeClients.filter(c => 
    c.deliverySchedule && Object.keys(c.deliverySchedule).length > 0
  );
  const clientsWithDaySchedule = activeClients.filter(c => {
    const items = c.deliverySchedule?.[dayKey];
    return items && items.length > 0;
  });

  // Filtrar clientes agendados por rota selecionada
  const filteredScheduledClients = selectedRoute === 'all' 
    ? scheduledClients 
    : scheduledClients.filter(c => c.routeId === selectedRoute);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 p-3 rounded-full">
            <Send className="text-blue-700" size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Entregas do Dia</h2>
            <p className="text-sm text-gray-500">Gerencie suas entregas programadas</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
            <Calendar size={18} className="text-gray-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border-none focus:ring-0 text-sm"
            />
          </div>
          <button
            onClick={handleGenerateDeliveries}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
            {deliveries.length === 0 ? 'Gerar Entregas' : 'Atualizar'}
          </button>
        </div>
      </div>

      {/* Seletor de Rota */}
      {myRoutes.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex items-center gap-2">
              <MapPin className="text-amber-600" size={20} />
              <span className="font-medium text-amber-800">Selecione a Rota:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedRoute('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedRoute === 'all'
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'bg-white text-amber-700 border border-amber-300 hover:bg-amber-100'
                }`}
              >
                Todas as Rotas
              </button>
              {myRoutes.map(route => {
                const routeDeliveryCount = deliveries.filter(d => d.routeId === route.id).length;
                const routePendingCount = deliveries.filter(d => d.routeId === route.id && d.status === 'pending').length;
                return (
                  <button
                    key={route.id}
                    onClick={() => setSelectedRoute(route.id)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                      selectedRoute === route.id
                        ? 'bg-amber-600 text-white shadow-md'
                        : 'bg-white text-amber-700 border border-amber-300 hover:bg-amber-100'
                    }`}
                  >
                    {route.name}
                    {routeDeliveryCount > 0 && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        selectedRoute === route.id 
                          ? 'bg-amber-500 text-white' 
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {routePendingCount}/{routeDeliveryCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertCircle className="text-red-500" size={20} />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {/* Alerta de entregas não geradas */}
      {hasUngenerated && deliveries.length > 0 && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="text-yellow-600" size={20} />
            <span className="text-yellow-700">
              Há {scheduledClients.length - deliveries.length} cliente(s) com entrega programada ainda não gerada.
            </span>
          </div>
          <button
            onClick={handleGenerateDeliveries}
            className="text-yellow-700 hover:text-yellow-800 font-medium text-sm"
          >
            Atualizar lista
          </button>
        </div>
      )}

      {/* Resumo do Dia - filtrado por rota se selecionada */}
      {summary && filteredDeliveries.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <ClipboardList className="text-blue-500" size={18} />
              <span className="text-sm text-gray-500">Total</span>
            </div>
            <span className="text-2xl font-bold text-blue-600">{filteredDeliveries.length}</span>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="text-green-500" size={18} />
              <span className="text-sm text-gray-500">Entregues</span>
            </div>
            <span className="text-2xl font-bold text-green-600">
              {filteredDeliveries.filter(d => d.status === 'delivered').length}
            </span>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <XCircle className="text-red-500" size={18} />
              <span className="text-sm text-gray-500">Não Entregues</span>
            </div>
            <span className="text-2xl font-bold text-red-600">
              {filteredDeliveries.filter(d => d.status === 'not_delivered').length}
            </span>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="text-yellow-500" size={18} />
              <span className="text-sm text-gray-500">Pendentes</span>
            </div>
            <span className="text-2xl font-bold text-yellow-600">
              {filteredDeliveries.filter(d => d.status === 'pending').length}
            </span>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="text-purple-500" size={18} />
              <span className="text-sm text-gray-500">Valor Total</span>
            </div>
            <span className="text-2xl font-bold text-purple-600">
              €{filteredDeliveries.reduce((sum, d) => sum + d.totalValue, 0).toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {/* Resumo de Produtos */}
      {summary && summary.productTotals.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <Package size={18} />
              Produtos a Entregar Hoje
            </h3>
          </div>
          <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            {summary.productTotals.map(pt => (
              <div key={pt.productId} className="bg-gray-50 rounded-lg p-3">
                <span className="text-sm text-gray-600">{pt.productName}</span>
                <p className="text-lg font-bold text-gray-800">{pt.quantity} un.</p>
                <p className="text-xs text-gray-500">€{pt.value.toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filtros e Pesquisa */}
      {deliveries.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          {/* Campo de Pesquisa */}
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Pesquisar cliente por nome, endereço ou telefone para receber pagamento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            )}
          </div>
          {searchTerm && (
            <p className="text-sm text-blue-600">
              <span className="font-medium">{filteredDeliveries.length}</span> cliente(s) encontrado(s) para "{searchTerm}"
            </p>
          )}
          
          {/* Filtros de Status */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter size={18} className="text-gray-400" />
            <span className="text-sm text-gray-500">Filtrar:</span>
            {(['all', 'pending', 'delivered', 'not_delivered'] as const).map(filter => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  statusFilter === filter
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {filter === 'all' ? 'Todos' : 
                 filter === 'pending' ? 'Pendentes' :
                 filter === 'delivered' ? 'Entregues' : 'Não Entregues'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Lista de Entregas por Rota */}
      {deliveries.length === 0 ? (
        <div className="space-y-4">
          {/* Info do dia selecionado */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-blue-700">
              <Calendar size={20} />
              <span className="font-medium">
                {getDayName(selectedDate)} - {new Date(selectedDate).toLocaleDateString('pt-BR')}
                {selectedRoute !== 'all' && (
                  <span className="ml-2 text-blue-600">
                    • Rota: {getRouteName(selectedRoute)}
                  </span>
                )}
              </span>
            </div>
          </div>

          {filteredScheduledClients.length > 0 ? (
            <>
              {/* Lista de clientes agendados para o dia */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-3 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                    <Users size={18} className="text-green-600" />
                    {filteredScheduledClients.length} Cliente(s) com Entrega para {getDayName(selectedDate)}
                    {selectedRoute !== 'all' && ` na rota ${getRouteName(selectedRoute)}`}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Clique em "Gerar Lista de Entregas" para começar
                  </p>
                </div>
                
                <div className="divide-y divide-gray-100">
                  {filteredScheduledClients.map((client: Client) => {
                    const dayKey = getDayKey(selectedDate);
                    const scheduleItems = client.deliverySchedule?.[dayKey] || [];
                    
                    return (
                      <div key={client.id} className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <User size={16} className="text-gray-400" />
                              <span className="font-medium text-gray-800">{client.name}</span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <span className="flex items-center gap-1">
                                <MapPin size={14} />
                                {client.address}
                              </span>
                              {client.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone size={14} />
                                  {client.phone}
                                </span>
                              )}
                            </div>
                            {/* Produtos agendados */}
                            <div className="mt-2 flex flex-wrap gap-2">
                              {scheduleItems.map((item) => (
                                <span key={item.productId} className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-sm">
                                  {getProductName(item.productId)}: {item.quantity}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="text-sm text-gray-400">
                            {getRouteName(client.routeId)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* Botão para gerar entregas */}
              <div className="flex justify-center">
                <button
                  onClick={handleGenerateDeliveries}
                  disabled={loading}
                  className="flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 shadow-lg hover:shadow-xl transition-all"
                >
                  {loading ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    <>
                      <Send size={20} />
                      Gerar Lista de Entregas
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-8">
              <div className="text-center mb-6">
                <Truck size={48} className="mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500 mb-2">
                  Nenhum cliente com entrega programada para <strong>{getDayName(selectedDate)}</strong>.
                </p>
              </div>
              
              {/* Diagnóstico */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
                <h4 className="font-medium text-yellow-800 mb-2 flex items-center gap-2">
                  <AlertCircle size={18} />
                  Diagnóstico
                </h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• Você tem <strong>{activeClients.length}</strong> cliente(s) ativo(s)</li>
                  <li>• <strong>{clientsWithSchedule.length}</strong> cliente(s) têm algum dia de entrega configurado</li>
                  <li>• <strong>{clientsWithDaySchedule.length}</strong> cliente(s) têm entrega configurada para <strong>{getDayName(selectedDate)}</strong></li>
                </ul>
                
                {clientsWithSchedule.length === 0 && (
                  <div className="mt-3 pt-3 border-t border-yellow-200">
                    <p className="text-yellow-800 text-sm">
                      <strong>💡 Dica:</strong> Para configurar entregas, edite um cliente, vá na aba "Entrega" e adicione os produtos para cada dia da semana.
                    </p>
                  </div>
                )}
                
                {clientsWithSchedule.length > 0 && clientsWithDaySchedule.length === 0 && (
                  <div className="mt-3 pt-3 border-t border-yellow-200">
                    <p className="text-yellow-800 text-sm">
                      <strong>💡 Dica:</strong> Seus clientes têm entregas configuradas, mas não para {getDayName(selectedDate)}. Tente selecionar outro dia ou configure entregas para este dia.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(deliveriesByRoute).map(([routeId, routeDeliveries]: [string, ClientDelivery[]]) => (
            <div key={routeId} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                    <MapPin size={18} className="text-blue-600" />
                    {getRouteName(routeId === 'sem-rota' ? undefined : routeId)}
                  </h3>
                  <span className="text-sm text-gray-500">
                    {routeDeliveries.length} cliente(s)
                  </span>
                </div>
              </div>
              
              <div className="divide-y divide-gray-100">
                {routeDeliveries.map(delivery => {
                  const isExpanded = expandedDelivery === delivery.id;
                  const isProcessing = processingId === delivery.id;
                  
                  return (
                    <div key={delivery.id} className={`p-4 ${isClientDynamic(delivery.clientId) ? 'border-l-4 border-purple-400' : ''}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <User size={16} className="text-gray-400" />
                            <span className="font-medium text-gray-800">{delivery.clientName}</span>
                            {isClientDynamic(delivery.clientId) && (
                              <span className="flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                                <Sparkles size={10} />
                                DINÂMICO
                              </span>
                            )}
                            {getStatusBadge(delivery.status)}
                            {getPaymentStatusBadge(delivery.clientId, selectedDate, delivery.status)}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <MapPin size={14} />
                              {delivery.clientAddress}
                            </span>
                            <span className="flex items-center gap-1">
                              <Phone size={14} />
                              {delivery.clientPhone}
                            </span>
                          </div>
                          
                          {/* Produtos - diferente para dinâmicos */}
                          {editingDynamicDelivery !== delivery.id ? (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {delivery.items.map((item, idx) => (
                                <span key={`${item.productId}-${idx}`} className={`px-2 py-1 rounded text-sm flex items-center gap-1 ${
                                  (item as any).isExtra 
                                    ? 'bg-purple-100 text-purple-700 border border-purple-300' 
                                    : (item as any).isSubstitute
                                      ? 'bg-orange-100 text-orange-700 border border-orange-300'
                                      : (item as any).isAdjusted
                                        ? 'bg-blue-100 text-blue-700 border border-blue-300'
                                        : isClientDynamic(delivery.clientId) 
                                          ? 'bg-purple-100 text-purple-700' 
                                          : 'bg-gray-100'
                                }`}>
                                  {(item as any).isExtra && <span className="font-bold">+</span>}
                                  {(item as any).isSubstitute && <ArrowLeftRight size={12} />}
                                  {(item as any).isAdjusted && <Edit3 size={12} />}
                                  {getProductName(item.productId)}: {item.quantity}
                                  {/* Mostrar quantidade original se foi ajustado */}
                                  {(item as any).isAdjusted && (item as any).originalQuantity && (
                                    <span className="text-xs opacity-70">(era {(item as any).originalQuantity})</span>
                                  )}
                                  {/* Botão de editar quantidade (item normal, não extra, não substituto) */}
                                  {!(item as any).isExtra && !(item as any).isSubstitute && delivery.status === 'pending' && !isClientDynamic(delivery.clientId) && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenAdjustModal(delivery.id, delivery.clientName, item);
                                      }}
                                      className="ml-1 p-0.5 hover:bg-gray-200 rounded"
                                      title="Ajustar quantidade"
                                    >
                                      <Edit3 size={12} />
                                    </button>
                                  )}
                                  {/* Botão de remover extra */}
                                  {(item as any).isExtra && delivery.status === 'pending' && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveSavedExtra(delivery.id, item.productId);
                                      }}
                                      className="ml-1 p-0.5 hover:bg-purple-200 rounded"
                                      title="Remover extra"
                                    >
                                      <X size={12} />
                                    </button>
                                  )}
                                  {/* Botão de reverter substituição */}
                                  {(item as any).isSubstitute && delivery.status === 'pending' && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRevertSubstitute(delivery.id, item.productId);
                                      }}
                                      className="ml-1 p-0.5 hover:bg-orange-200 rounded"
                                      title={`Reverter para ${(item as any).originalQuantityReplaced || item.quantity}x ${(item as any).originalProductName}`}
                                    >
                                      <X size={12} />
                                    </button>
                                  )}
                                </span>
                              ))}
                              {isClientDynamic(delivery.clientId) && delivery.items.length === 0 && (
                                <span className="text-sm text-purple-600 italic">
                                  Selecione os produtos na entrega →
                                </span>
                              )}
                            </div>
                          ) : (
                            /* Editor de produtos para cliente dinâmico */
                            <div className="mt-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                              {/* Header */}
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <Sparkles size={16} className="text-purple-600" />
                                  <span className="text-sm font-medium text-purple-800">Adicionar Produtos:</span>
                                </div>
                                {dynamicDeliveryItems.length > 0 && (
                                  <span className="text-xs bg-purple-200 text-purple-700 px-2 py-0.5 rounded-full">
                                    {dynamicDeliveryItems.length} produto(s)
                                  </span>
                                )}
                              </div>

                              {/* Seletor de produto + quantidade */}
                              <div className="flex gap-2 mb-3">
                                <select
                                  value={selectedProductToAdd}
                                  onChange={(e) => setSelectedProductToAdd(e.target.value)}
                                  className="flex-1 px-3 py-2 border border-purple-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-purple-400"
                                >
                                  <option value="">Selecione um produto...</option>
                                  {products
                                    .filter(p => !dynamicDeliveryItems.find(item => item.productId === p.id))
                                    .map(product => {
                                      const client = clients.find(c => c.id === delivery.clientId);
                                      const price = client?.customPrices?.[product.id] ?? product.price;
                                      return (
                                        <option key={product.id} value={product.id}>
                                          {product.name} - €{price.toFixed(2)}
                                        </option>
                                      );
                                    })}
                                </select>
                                <input
                                  type="number"
                                  min="1"
                                  value={quantityToAdd === 0 ? '' : quantityToAdd}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === '' || isNaN(Number(val))) {
                                      setQuantityToAdd(0);
                                    } else {
                                      setQuantityToAdd(Number(val));
                                    }
                                  }}
                                  className="w-20 px-3 py-2 border border-purple-200 rounded-lg text-sm text-center font-bold"
                                />
                                <button
                                  onClick={() => handleAddDynamicProduct(delivery.clientId)}
                                  disabled={!selectedProductToAdd}
                                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <Plus size={18} />
                                </button>
                              </div>

                              {/* Lista de produtos adicionados */}
                              {dynamicDeliveryItems.length > 0 ? (
                                <div className="space-y-2 mb-3">
                                  {dynamicDeliveryItems.map(item => {
                                    const product = products.find(p => p.id === item.productId);
                                    if (!product) return null;
                                    return (
                                      <div key={item.productId} className="flex items-center justify-between bg-white p-2 rounded-lg border border-purple-100">
                                        <div className="flex items-center gap-2">
                                          <button
                                            onClick={() => handleRemoveDynamicProduct(item.productId)}
                                            className="p-1 rounded bg-red-100 hover:bg-red-200 text-red-600"
                                          >
                                            <XCircle size={14} />
                                          </button>
                                          <span className="text-sm font-medium text-gray-800">{product.name}</span>
                                          <span className="text-xs text-gray-500">€{item.price.toFixed(2)}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <button
                                            onClick={() => updateDynamicItemQuantity(item.productId, -1)}
                                            className="p-1 rounded bg-purple-100 hover:bg-purple-200 text-purple-700"
                                          >
                                            <Minus size={14} />
                                          </button>
                                          <span className="w-10 text-center font-bold text-purple-700">{item.quantity}</span>
                                          <button
                                            onClick={() => updateDynamicItemQuantity(item.productId, 1)}
                                            className="p-1 rounded bg-purple-100 hover:bg-purple-200 text-purple-700"
                                          >
                                            <Plus size={14} />
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="text-center py-4 text-gray-500 text-sm bg-white rounded-lg border border-dashed border-purple-200 mb-3">
                                  Nenhum produto adicionado ainda
                                </div>
                              )}

                              {/* Footer com total e botões */}
                              <div className="flex items-center justify-between pt-3 border-t border-purple-200">
                                <span className="text-sm text-purple-700">
                                  Total: <strong className="text-lg">€{dynamicDeliveryItems.reduce((sum, i) => sum + (i.price * i.quantity), 0).toFixed(2)}</strong>
                                </span>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => { setEditingDynamicDelivery(null); setDynamicDeliveryItems([]); setSelectedProductToAdd(''); }}
                                    className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm"
                                  >
                                    Cancelar
                                  </button>
                                  <button
                                    onClick={() => handleConfirmDynamicDelivery(delivery.id)}
                                    disabled={isProcessing || dynamicDeliveryItems.length === 0}
                                    className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
                                  >
                                    {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                                    Confirmar Entrega
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          <div className="mt-2 flex items-center gap-4">
                            {/* Para clientes dinâmicos pendentes sem itens, não mostrar valor (já tem a mensagem roxa acima) */}
                            {!(isClientDynamic(delivery.clientId) && delivery.status === 'pending' && delivery.items.length === 0) && (
                              <span className="text-sm font-medium text-green-600">
                                Valor: €{delivery.totalValue.toFixed(2)}
                              </span>
                            )}
                            {delivery.status === 'not_delivered' && delivery.notDeliveredReason && (
                              <span className="text-sm text-red-500">
                                Motivo: {delivery.notDeliveredReason}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* Ações */}
                        {delivery.status === 'pending' && editingDynamicDelivery !== delivery.id && (
                          <div className="flex flex-col gap-2 ml-4">
                            {isClientDynamic(delivery.clientId) ? (
                              /* Botão especial para cliente dinâmico */
                              <button
                                onClick={() => handleStartDynamicEdit(delivery)}
                                className="flex items-center gap-1 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
                              >
                                <Edit3 size={14} />
                                Registrar Entrega
                              </button>
                            ) : (
                              /* Botão normal para cliente fixo */
                              <button
                                onClick={() => handleMarkDelivered(delivery.id)}
                                disabled={isProcessing}
                                className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm"
                              >
                                {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                                Entregue
                              </button>
                            )}
                            <button
                              onClick={() => setExpandedDelivery(isExpanded ? null : delivery.id)}
                              className="flex items-center gap-1 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm"
                            >
                              <XCircle size={14} />
                              Não Entregue
                            </button>
                            {/* Botão Extra - Adicionar itens extras */}
                            {!isClientDynamic(delivery.clientId) && (
                              <button
                                onClick={() => handleOpenExtraModal(delivery.id, delivery.clientName)}
                                className="flex items-center gap-1 px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 text-sm"
                              >
                                <ShoppingBag size={14} />
                                + Extra
                              </button>
                            )}
                            {/* Botão Substituir - Trocar produto apenas neste dia */}
                            {!isClientDynamic(delivery.clientId) && delivery.items.some(item => !(item as any).isExtra && !(item as any).isSubstitute) && (
                              <button
                                onClick={() => handleOpenSubstituteModal(delivery.id, delivery.clientName, delivery.items)}
                                className="flex items-center gap-1 px-3 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 text-sm"
                              >
                                <ArrowLeftRight size={14} />
                                Trocar
                              </button>
                            )}
                            {/* Botão Receber Pagamento */}
                            <button
                              onClick={() => handleOpenPaymentModal(delivery.clientId, delivery.clientName)}
                              className="flex items-center gap-1 px-3 py-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 text-sm"
                            >
                              <Banknote size={14} />
                              Receber €
                            </button>
                          </div>
                        )}
                        
                        {delivery.status !== 'pending' && (
                          <div className="ml-4 flex flex-col gap-2 items-end">
                            {delivery.status === 'delivered' && (
                              <>
                                {delivery.deliveredAt && (
                                  <span className="text-xs text-gray-400">
                                    {new Date(delivery.deliveredAt).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                )}
                                {/* Botões de ação para entrega confirmada */}
                                <div className="flex flex-wrap gap-1 justify-end">
                                  {/* Botão Receber Pagamento */}
                                  <button
                                    onClick={() => handleOpenPaymentModal(delivery.clientId, delivery.clientName)}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 text-xs"
                                  >
                                    <Banknote size={12} />
                                    Receber €
                                  </button>
                                  {/* Botão Cancelar Pagamento (se tiver pagamento hoje) */}
                                  {getClientTodayPayment(delivery.clientId) > 0 && (
                                    <button
                                      onClick={() => handleCancelPayment(delivery.clientId, delivery.clientName)}
                                      disabled={processingId === delivery.clientId}
                                      className="flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-xs"
                                      title={`Cancelar pagamento de €${getClientTodayPayment(delivery.clientId).toFixed(2)}`}
                                    >
                                      <XCircle size={12} />
                                      {processingId === delivery.clientId ? '...' : 'Cancelar €'}
                                    </button>
                                  )}
                                  {/* Botão Reverter Entrega */}
                                  <button
                                    onClick={() => handleRevertToPending(delivery.id)}
                                    disabled={isProcessing}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-xs"
                                    title="Reverter para pendente"
                                  >
                                    <Undo2 size={12} />
                                    {isProcessing ? '...' : 'Reverter'}
                                  </button>
                                </div>
                              </>
                            )}
                            {delivery.status === 'not_delivered' && (
                              <>
                                {delivery.notDeliveredReason && (
                                  <span className="text-xs text-red-500 max-w-[150px] text-right">
                                    {delivery.notDeliveredReason}
                                  </span>
                                )}
                                {/* Botão Reverter Não Entrega */}
                                <button
                                  onClick={() => handleRevertToPending(delivery.id)}
                                  disabled={isProcessing}
                                  className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-xs"
                                  title="Reverter para pendente"
                                >
                                  <Undo2 size={12} />
                                  {isProcessing ? '...' : 'Reverter'}
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Formulário de motivo para não entrega */}
                      {isExpanded && delivery.status === 'pending' && (
                        <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
                          <label className="block text-sm font-medium text-red-700 mb-2">
                            Motivo da não entrega (opcional):
                          </label>
                          <textarea
                            value={notDeliveredReason}
                            onChange={(e) => setNotDeliveredReason(e.target.value)}
                            placeholder="Ex: Cliente ausente, endereço incorreto..."
                            className="w-full px-3 py-2 border border-red-200 rounded-lg text-sm resize-none"
                            rows={2}
                          />
                          <div className="flex justify-end gap-2 mt-2">
                            <button
                              onClick={() => setExpandedDelivery(null)}
                              className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded text-sm"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={() => handleMarkNotDelivered(delivery.id)}
                              disabled={isProcessing}
                              className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 text-sm"
                            >
                              {isProcessing ? 'Salvando...' : 'Confirmar'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Pagamento */}
      {showPaymentModal && paymentClientId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Banknote className="text-amber-600" size={20} />
              Receber Pagamento
            </h3>
            
            <div className="mb-4">
              <p className="text-gray-600 text-sm mb-1">Cliente:</p>
              <p className="font-semibold text-gray-800">{paymentClientName}</p>
            </div>

            {/* Informações de Pagamento */}
            {paymentInfo && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Último pagamento:</span>
                  <span className="text-sm font-medium">
                    {paymentInfo.lastPaymentDate 
                      ? `${new Date(paymentInfo.lastPaymentDate).toLocaleDateString('pt-PT')} - €${paymentInfo.lastPaymentAmount?.toFixed(2) || '0.00'}`
                      : 'Nenhum registado'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Pago até:</span>
                  <span className={`text-sm font-medium ${paymentInfo.paidUntilDate ? 'text-green-600' : 'text-gray-400'}`}>
                    {paymentInfo.paidUntilDate 
                      ? new Date(paymentInfo.paidUntilDate).toLocaleDateString('pt-PT')
                      : 'Não definido'}
                  </span>
                </div>
                {paymentInfo.unpaidDates.length > 0 && (
                  <div className="pt-2 border-t border-gray-200">
                    <span className="text-sm text-red-600 font-medium">
                      ⚠️ {paymentInfo.unpaidDates.length} dia(s) por pagar
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Mostrar dívida atual */}
            {clientDebt > 0 ? (
              <div className="mb-4 p-3 bg-red-50 rounded-lg border border-red-200">
                <p className="text-sm text-red-700">
                  <strong>Dívida atual:</strong> €{clientDebt.toFixed(2)}
                </p>
              </div>
            ) : (
              <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm text-green-700">
                  Cliente sem dívida pendente
                </p>
              </div>
            )}

            <div className="space-y-4">
              {/* Valor */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valor Recebido (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>

              {/* Método de Pagamento */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Método de Pagamento
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setPaymentMethod('Dinheiro')}
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                      paymentMethod === 'Dinheiro'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <Banknote size={18} />
                    Dinheiro
                  </button>
                  <button
                    onClick={() => setPaymentMethod('MB Way')}
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                      paymentMethod === 'MB Way'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <CreditCard size={18} />
                    MB Way
                  </button>
                </div>
              </div>

              {/* Data até quando fica pago - Calendário Personalizado */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pago até (data)
                </label>
                <div className="relative">
                  <button
                    onClick={() => setShowCustomCalendar(!showCustomCalendar)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-left flex items-center justify-between"
                  >
                    <span>{paidUntilDate ? new Date(paidUntilDate).toLocaleDateString('pt-PT') : 'Selecionar data...'}</span>
                    <Calendar size={18} className="text-gray-400" />
                  </button>
                  
                  {/* Calendário Personalizado com Atualização Otimista */}
                  {showCustomCalendar && paymentInfo && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 p-3">
                      {/* Header do calendário */}
                      <div className="flex items-center justify-between mb-3">
                        <button
                          onClick={() => {
                            const newMonth = new Date(calendarMonth);
                            newMonth.setMonth(newMonth.getMonth() - 1);
                            setCalendarMonth(newMonth);
                          }}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          <ChevronLeft size={20} />
                        </button>
                        <span className="font-medium">
                          {calendarMonth.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })}
                        </span>
                        <button
                          onClick={() => {
                            const newMonth = new Date(calendarMonth);
                            newMonth.setMonth(newMonth.getMonth() + 1);
                            setCalendarMonth(newMonth);
                          }}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          <ChevronRight size={20} />
                        </button>
                      </div>
                      
                      {/* Dias da semana */}
                      <div className="grid grid-cols-7 gap-1 mb-2 text-center">
                        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, i) => (
                          <div key={i} className="text-xs font-medium text-gray-500 py-1">{day}</div>
                        ))}
                      </div>
                      
                      {/* Dias do mês com computeCalendarStatuses */}
                      <div className="grid grid-cols-7 gap-1">
                        {(() => {
                          const year = calendarMonth.getFullYear();
                          const month = calendarMonth.getMonth();
                          const firstDay = new Date(year, month, 1);
                          const lastDay = new Date(year, month + 1, 0);
                          const todayStr = new Date().toISOString().split('T')[0];
                          
                          // Usar optimisticPaidUntil para atualização imediata
                          const effectivePaidThrough = optimisticPaidUntil || paidUntilDate || null;
                          
                          // Gerar array de datas visíveis
                          const visibleDays: string[] = [];
                          for (let day = 1; day <= lastDay.getDate(); day++) {
                            const dateObj = new Date(year, month, day);
                            visibleDays.push(dateObj.toISOString().split('T')[0]);
                          }
                          
                          // Datas com entrega programada (paidDates + unpaidDates)
                          const deliveryDates = [...paymentInfo.paidDates, ...paymentInfo.unpaidDates];
                          
                          // Datas "não quis pão" (skippedDates)
                          const noBreadDates = paymentInfo.skippedDates || [];
                          
                          // Computar status de cada dia
                          const calendarStatuses = computeCalendarStatuses(
                            visibleDays,
                            effectivePaidThrough,
                            todayStr,
                            deliveryDates,
                            noBreadDates
                          );
                          
                          const days = [];
                          
                          // Dias vazios antes do primeiro dia do mês
                          for (let i = 0; i < firstDay.getDay(); i++) {
                            days.push(<div key={`empty-${i}`} className="w-8 h-8"></div>);
                          }
                          
                          // Dias do mês
                          for (let day = 1; day <= lastDay.getDate(); day++) {
                            const dateObj = new Date(year, month, day);
                            const dateStr = dateObj.toISOString().split('T')[0];
                            const dayInfo = calendarStatuses.get(dateStr);
                            const status = dayInfo?.status || 'no_delivery';
                            const isSelected = paidUntilDate === dateStr;
                            const isFuture = status === 'future';
                            
                            // Mapear status para classes CSS
                            // Verde (paid): pago
                            // Laranja (to_pay): a pagar
                            // Vermelho (no_bread): não quis pão
                            // Cinza (no_delivery/future): sem entrega ou futuro
                            let bgClass = 'bg-gray-50 hover:bg-gray-100';
                            let ringClass = '';
                            
                            if (isSelected) {
                              bgClass = 'bg-amber-500 text-white hover:bg-amber-600';
                            } else {
                              switch (status) {
                                case 'paid':
                                  // Verde: pago (data <= paidThrough)
                                  ringClass = 'ring-2 ring-green-500 ring-inset';
                                  bgClass = 'bg-green-50 hover:bg-green-100 text-green-700';
                                  break;
                                case 'to_pay':
                                  // Laranja: a pagar (data > paidThrough e <= hoje)
                                  ringClass = 'ring-2 ring-orange-400 ring-inset';
                                  bgClass = 'bg-orange-50 hover:bg-orange-100 text-orange-700';
                                  break;
                                case 'no_bread':
                                  // Vermelho: não quis pão
                                  ringClass = 'ring-2 ring-red-500 ring-inset';
                                  bgClass = 'bg-red-50 hover:bg-red-100 text-red-700';
                                  break;
                                case 'no_delivery':
                                  // Cinza: sem entrega
                                  bgClass = 'bg-gray-100 text-gray-500';
                                  break;
                                case 'future':
                                  // Futuro: desabilitado
                                  bgClass = 'bg-gray-100 text-gray-400';
                                  break;
                              }
                            }
                            
                            days.push(
                              <button
                                key={day}
                                onClick={() => {
                                  if (!isFuture) {
                                    // Atualização otimista: atualiza imediatamente
                                    handleOptimisticDateSelect(dateStr);
                                  }
                                }}
                                disabled={isFuture}
                                className={`w-8 h-8 rounded-full text-sm font-medium transition-all ${bgClass} ${ringClass} ${isFuture ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                              >
                                {day}
                              </button>
                            );
                          }
                          
                          return days;
                        })()}
                      </div>
                      
                      {/* Legenda atualizada */}
                      <div className="mt-3 pt-3 border-t border-gray-200 flex flex-wrap gap-3 text-xs">
                        <div className="flex items-center gap-1">
                          <div className="w-4 h-4 rounded-full ring-2 ring-green-500 ring-inset bg-green-50"></div>
                          <span className="text-gray-600">Pago</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-4 h-4 rounded-full ring-2 ring-orange-400 ring-inset bg-orange-50"></div>
                          <span className="text-gray-600">A pagar</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-4 h-4 rounded-full ring-2 ring-red-500 ring-inset bg-red-50"></div>
                          <span className="text-gray-600">Não quis pão</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-4 h-4 rounded-full bg-gray-100"></div>
                          <span className="text-gray-600">Sem entrega</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Clique para ver o calendário com dias pagos e por pagar
                </p>
              </div>

              {/* Botão Ver Consumo/Faturas */}
              <button
                type="button"
                onClick={() => {
                  const history = getClientConsumptionHistory(paymentClientId);
                  setConsumptionData(history);
                  setShowConsumptionModal(true);
                }}
                className="w-full mt-4 py-2 bg-purple-100 text-purple-700 rounded-lg font-medium hover:bg-purple-200 transition-colors flex justify-center items-center gap-2 border border-purple-200"
              >
                <Receipt size={18} />
                Ver Consumo / Faturas Detalhadas
              </button>
            </div>

            {/* Botões */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setPaymentClientId('');
                  setPaymentClientName('');
                  setPaymentAmount('');
                  setClientDebt(0);
                  setPaymentInfo(null);
                  setOptimisticPaidUntil(null);
                  setServerPaidUntil(null);
                  setClientConsumptionHistory(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleRegisterPayment}
                disabled={savingPayment || !paymentAmount || parseFloat(paymentAmount) <= 0}
                className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {savingPayment ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} />
                    Registrar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Extras */}
      {showExtraModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <ShoppingBag size={20} />
                    Adicionar Extra
                  </h3>
                  <p className="text-purple-100 text-sm">{extraClientName}</p>
                </div>
                <button
                  onClick={() => {
                    setShowExtraModal(false);
                    setExtraItems([]);
                  }}
                  className="p-2 hover:bg-purple-500 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Conteúdo */}
            <div className="p-4 space-y-4">
              {/* Seleção de produto */}
              <div className="flex gap-2">
                <select
                  value={extraProductId}
                  onChange={(e) => setExtraProductId(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Selecione o produto...</option>
                  {products.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.name} - €{product.price.toFixed(2)}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  value={extraQuantity}
                  onChange={(e) => setExtraQuantity(e.target.value)}
                  placeholder="Qtd"
                  className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-center"
                />
                <button
                  onClick={handleAddExtraItem}
                  disabled={!extraProductId || !extraQuantity}
                  className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  <Plus size={20} />
                </button>
              </div>

              {/* Lista de extras adicionados */}
              {extraItems.length > 0 && (
                <div className="border border-purple-200 rounded-lg overflow-hidden">
                  <div className="bg-purple-50 px-3 py-2 text-sm font-medium text-purple-700">
                    Itens Extras
                  </div>
                  <div className="divide-y divide-gray-100">
                    {extraItems.map(item => (
                      <div key={item.productId} className="flex items-center justify-between px-3 py-2">
                        <div>
                          <span className="font-medium">{item.productName}</span>
                          <span className="text-gray-500 ml-2">x{item.quantity}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-purple-600">
                            €{(item.quantity * item.unitPrice).toFixed(2)}
                          </span>
                          <button
                            onClick={() => handleRemoveExtraItem(item.productId)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="bg-purple-100 px-3 py-2 flex justify-between items-center">
                    <span className="font-medium text-purple-700">Total Extra:</span>
                    <span className="text-lg font-bold text-purple-700">€{extraTotal.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {extraItems.length === 0 && (
                <div className="text-center py-6 text-gray-400">
                  <ShoppingBag size={32} className="mx-auto mb-2 opacity-50" />
                  <p>Adicione produtos extras acima</p>
                </div>
              )}

              {/* Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-700">
                  <strong>💡 Dica:</strong> Ao salvar, os itens extras serão adicionados à entrega.
                </p>
              </div>
            </div>

            {/* Botões */}
            <div className="p-4 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => {
                  setShowExtraModal(false);
                  setExtraItems([]);
                }}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveExtras}
                disabled={savingExtra || extraItems.length === 0}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {savingExtra ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} />
                    Salvar Extras
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Substituição de Produto */}
      {showSubstituteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <ArrowLeftRight size={20} />
                    Substituir Produto
                  </h3>
                  <p className="text-orange-100 text-sm">{substituteClientName}</p>
                </div>
                <button
                  onClick={() => {
                    setShowSubstituteModal(false);
                    setDeliveryItemsForSubstitute([]);
                  }}
                  className="p-2 hover:bg-orange-400 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Conteúdo */}
            <div className="p-4 space-y-4">
              {/* Produto Original */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Produto a Substituir:
                </label>
                <select
                  value={substituteOriginalProductId}
                  onChange={(e) => {
                    setSubstituteOriginalProductId(e.target.value);
                    setSubstituteOriginalQty(''); // Limpar quantidade ao mudar produto
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Selecione o produto original...</option>
                  {deliveryItemsForSubstitute.map(item => (
                    <option key={item.productId} value={item.productId}>
                      {getProductName(item.productId)} (x{item.quantity})
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantidade do Original a Substituir */}
              {substituteOriginalProductId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantas unidades substituir?
                  </label>
                  {(() => {
                    const selectedItem = deliveryItemsForSubstitute.find(item => item.productId === substituteOriginalProductId);
                    const maxQty = selectedItem?.quantity || 1;
                    return (
                      <div className="flex gap-2 items-center">
                        <input
                          type="number"
                          min="1"
                          max={maxQty}
                          value={substituteOriginalQty}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            if (val <= maxQty) {
                              setSubstituteOriginalQty(e.target.value);
                            }
                          }}
                          placeholder="Qtd"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                        />
                        <button
                          onClick={() => setSubstituteOriginalQty(maxQty.toString())}
                          className="px-3 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 text-sm"
                        >
                          Todas ({maxQty})
                        </button>
                      </div>
                    );
                  })()}
                  <p className="text-xs text-gray-500 mt-1">
                    As unidades não substituídas permanecerão na entrega
                  </p>
                </div>
              )}

              {/* Novo Produto */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Novo Produto:
                </label>
                <select
                  value={substituteNewProductId}
                  onChange={(e) => setSubstituteNewProductId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Selecione o novo produto...</option>
                  {products.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.name} - €{product.price.toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantidade do Novo Produto */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantidade do novo produto:
                </label>
                <input
                  type="number"
                  min="1"
                  value={substituteQuantity}
                  onChange={(e) => setSubstituteQuantity(e.target.value)}
                  placeholder="Qtd"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Resumo da troca */}
              {substituteOriginalProductId && substituteOriginalQty && substituteNewProductId && substituteQuantity && (
                <div className="bg-orange-100 border border-orange-300 rounded-lg p-3">
                  <p className="text-sm text-orange-800 font-medium">📋 Resumo da troca:</p>
                  <p className="text-sm text-orange-700 mt-1">
                    {substituteOriginalQty}x {getProductName(substituteOriginalProductId)} → {substituteQuantity}x {getProductName(substituteNewProductId)}
                  </p>
                </div>
              )}

              {/* Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-700">
                  <strong>💡 Nota:</strong> Esta substituição é apenas para esta entrega. O registo do cliente não será alterado.
                </p>
              </div>
            </div>

            {/* Botões */}
            <div className="p-4 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => {
                  setShowSubstituteModal(false);
                  setDeliveryItemsForSubstitute([]);
                }}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveSubstitute}
                disabled={savingSubstitute || !substituteOriginalProductId || !substituteOriginalQty || !substituteNewProductId || !substituteQuantity}
                className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {savingSubstitute ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <ArrowLeftRight size={16} />
                    Confirmar Troca
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Ajuste de Quantidade */}
      {showAdjustModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-sm w-full shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <Edit3 size={20} />
                    Ajustar Quantidade
                  </h3>
                  <p className="text-blue-100 text-sm">{adjustClientName}</p>
                </div>
                <button
                  onClick={() => setShowAdjustModal(false)}
                  className="p-2 hover:bg-blue-400 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Conteúdo */}
            <div className="p-4 space-y-4">
              {/* Produto */}
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-500">Produto:</p>
                <p className="font-medium text-lg">{adjustProductName}</p>
                {adjustOriginalQty !== adjustCurrentQty && (
                  <p className="text-xs text-blue-600 mt-1">
                    Quantidade original do registo: {adjustOriginalQty}
                  </p>
                )}
              </div>

              {/* Quantidade */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nova Quantidade:
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      const current = parseInt(adjustNewQty) || 0;
                      if (current > 0) setAdjustNewQty((current - 1).toString());
                    }}
                    className="w-12 h-12 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 flex items-center justify-center text-2xl font-bold"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min="0"
                    value={adjustNewQty}
                    onChange={(e) => setAdjustNewQty(e.target.value)}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-center text-2xl font-bold focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => {
                      const current = parseInt(adjustNewQty) || 0;
                      setAdjustNewQty((current + 1).toString());
                    }}
                    className="w-12 h-12 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 flex items-center justify-center text-2xl font-bold"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Botão de restaurar original */}
              {adjustOriginalQty !== parseInt(adjustNewQty) && (
                <button
                  onClick={() => setAdjustNewQty(adjustOriginalQty.toString())}
                  className="w-full px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm flex items-center justify-center gap-2"
                >
                  <RefreshCw size={14} />
                  Restaurar quantidade original ({adjustOriginalQty})
                </button>
              )}

              {/* Aviso */}
              {parseInt(adjustNewQty) === 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-700">
                    <strong>⚠️ Atenção:</strong> Quantidade 0 removerá este produto da entrega de hoje.
                  </p>
                </div>
              )}

              {/* Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-700">
                  <strong>💡 Nota:</strong> Este ajuste é apenas para hoje. O registo do cliente não será alterado.
                </p>
              </div>
            </div>

            {/* Botões */}
            <div className="p-4 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => setShowAdjustModal(false)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveAdjust}
                disabled={savingAdjust || adjustNewQty === '' || parseInt(adjustNewQty) === adjustCurrentQty}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {savingAdjust ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} />
                    Confirmar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Consumo/Faturas */}
      {showConsumptionModal && consumptionData && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[60]" onClick={() => setShowConsumptionModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-purple-800 px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Receipt size={24} />
                  Consumo / Faturas
                </h2>
                <p className="text-purple-200 text-sm">{consumptionData.clientName}</p>
              </div>
              <button onClick={() => setShowConsumptionModal(false)} className="text-white/80 hover:text-white">
                <X size={24} />
              </button>
            </div>

            {/* Resumo */}
            <div className="bg-purple-50 px-6 py-4 border-b border-purple-100">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-xs text-purple-600 uppercase font-semibold">Frequência</p>
                  <p className="text-lg font-bold text-purple-800">{consumptionData.paymentFrequency}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-purple-600 uppercase font-semibold">Pago até</p>
                  <p className={`text-lg font-bold ${consumptionData.hasFutureCredit ? 'text-green-600' : 'text-purple-800'}`}>
                    {consumptionData.paidUntilDate 
                      ? new Date(consumptionData.paidUntilDate).toLocaleDateString('pt-PT')
                      : 'Nunca'}
                    {consumptionData.hasFutureCredit && ' ✓'}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-purple-600 uppercase font-semibold">Dias em aberto</p>
                  <p className={`text-lg font-bold ${consumptionData.daysUnpaid > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {consumptionData.daysUnpaid}
                  </p>
                </div>
                <div className="text-center">
                  {consumptionData.hasFutureCredit ? (
                    <>
                      <p className="text-xs text-green-600 uppercase font-semibold">Status</p>
                      <p className="text-lg font-bold text-green-600">✓ Adiantado</p>
                    </>
                  ) : consumptionData.totalDebt > 0 ? (
                    <>
                      <p className="text-xs text-red-600 uppercase font-semibold">Total em aberto</p>
                      <p className="text-2xl font-bold text-red-600">€ {consumptionData.totalDebt.toFixed(2)}</p>
                    </>
                  ) : (
                    <>
                      <p className="text-xs text-green-600 uppercase font-semibold">Status</p>
                      <p className="text-lg font-bold text-green-600">✓ Em dia</p>
                    </>
                  )}
                </div>
              </div>
              
              {/* Mensagem de pagamento adiantado */}
              {consumptionData.hasFutureCredit && (
                <div className="mt-3 p-2 bg-green-100 border border-green-200 rounded-lg text-center">
                  <p className="text-sm text-green-700 font-medium">
                    🎉 Cliente pagou adiantado até {new Date(consumptionData.paidUntilDate!).toLocaleDateString('pt-PT')}
                  </p>
                </div>
              )}
            </div>

            {/* Conteúdo com scroll */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Faturas em Aberto */}
              {consumptionData.unpaidInvoices.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-red-700 mb-3 flex items-center gap-2">
                    <AlertCircle size={20} />
                    Faturas em Aberto ({consumptionData.unpaidInvoices.length})
                  </h3>
                  <div className="space-y-3">
                    {consumptionData.unpaidInvoices.map((invoice, idx) => (
                      <div key={idx} className="bg-red-50 border border-red-200 rounded-xl p-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-bold text-red-800">
                            {new Date(invoice.date).toLocaleDateString('pt-PT', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
                          </span>
                          <span className="text-lg font-bold text-red-600">€ {invoice.totalValue.toFixed(2)}</span>
                        </div>
                        <div className="space-y-1">
                          {invoice.items.map((item, itemIdx) => (
                            <div key={itemIdx} className="flex justify-between text-sm text-red-700">
                              <span className="flex items-center gap-2">
                                <Package size={14} />
                                {item.quantity}x {item.productName}
                                {item.isExtra && <span className="text-xs bg-orange-200 text-orange-700 px-1.5 py-0.5 rounded">Extra</span>}
                                {item.isSubstitute && <span className="text-xs bg-blue-200 text-blue-700 px-1.5 py-0.5 rounded">Substituto</span>}
                              </span>
                              <span>€ {item.totalPrice.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Histórico de Pagamentos */}
              {consumptionData.paymentHistory.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-green-700 mb-3 flex items-center gap-2">
                    <CheckCircle size={20} />
                    Histórico de Pagamentos ({consumptionData.paymentHistory.length})
                  </h3>
                  <div className="bg-green-50 border border-green-200 rounded-xl divide-y divide-green-200">
                    {consumptionData.paymentHistory.slice().reverse().map((payment, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3">
                        <div>
                          <span className="font-medium text-green-800">
                            {new Date(payment.date).toLocaleDateString('pt-PT')}
                          </span>
                          <span className="text-xs text-green-600 ml-2">({payment.method})</span>
                        </div>
                        <span className="font-bold text-green-700">€ {payment.amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Faturas Pagas */}
              {consumptionData.paidInvoices.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-gray-600 mb-3 flex items-center gap-2">
                    <Receipt size={20} />
                    Entregas Pagas ({consumptionData.paidInvoices.length})
                  </h3>
                  <div className="space-y-2">
                    {consumptionData.paidInvoices.slice(0, 10).map((invoice, idx) => (
                      <div key={idx} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700">
                            {new Date(invoice.date).toLocaleDateString('pt-PT')}
                          </span>
                          <span className="text-sm font-bold text-gray-600">€ {invoice.totalValue.toFixed(2)}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {invoice.items.map(i => `${i.quantity}x ${i.productName}`).join(', ')}
                        </div>
                      </div>
                    ))}
                    {consumptionData.paidInvoices.length > 10 && (
                      <p className="text-sm text-gray-500 text-center">
                        ... e mais {consumptionData.paidInvoices.length - 10} entregas pagas
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Mensagem se não houver dados */}
              {consumptionData.allInvoices.length === 0 && (
                <div className="text-center py-12">
                  <Receipt className="mx-auto text-gray-300 mb-4" size={64} />
                  <p className="text-gray-500 text-lg">Nenhuma entrega registrada ainda.</p>
                  <p className="text-gray-400 text-sm mt-2">
                    As entregas aparecerão aqui quando forem realizadas.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowConsumptionModal(false)}
                className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverDailyDeliveries;
