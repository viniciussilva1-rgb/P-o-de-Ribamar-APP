import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { ClientDelivery, DeliveryStatus, Client, DynamicClientPrediction } from '../types';
import { 
  Package, Truck, CheckCircle, XCircle, Clock, MapPin, Phone, 
  User, AlertCircle, Loader2, Calendar, ChevronDown, ChevronRight,
  DollarSign, ClipboardList, RefreshCw, Send, Filter, Users,
  Sparkles, Edit3, Plus, Minus, Save, CreditCard, Banknote, X
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

const DriverDailyDeliveries: React.FC = () => {
  const { currentUser } = useAuth();
  const { 
    products, 
    routes,
    clients,
    generateDailyDeliveries,
    updateDeliveryStatus,
    getDeliveriesByDriver,
    getDriverDailySummary,
    getScheduledClientsForDay,
    clientDeliveries,
    getDynamicClientsForDriver,
    getDynamicClientPrediction,
    getDynamicClientHistory,
    recordDynamicDelivery,
    registerDailyPayment,
    calculateClientDebt
  } = useData();

  // Estados para modal de papel
  const [showLeaveReceiptModal, setShowLeaveReceiptModal] = useState(false);
  const [leaveReceiptClientId, setLeaveReceiptClientId] = useState('');
  const [leaveReceiptClientName, setLeaveReceiptClientName] = useState('');
  const [leaveReceiptDateFrom, setLeaveReceiptDateFrom] = useState('');
  const [leaveReceiptDateTo, setLeaveReceiptDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [leaveReceiptValue, setLeaveReceiptValue] = useState(0);

  // Função para calcular valor do período específico
  const calculatePeriodValue = (clientId: string, dateFrom: string, dateTo: string) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return 0;

    let total = 0;
    const startDate = new Date(dateFrom);
    const endDate = new Date(dateTo);
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];

      // Verificar se a data foi pulada
      if (client.skippedDates && client.skippedDates.includes(dateStr)) {
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      const dayIndex = currentDate.getDay();
      const mapKeys = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
      const dayKey = mapKeys[dayIndex] as keyof typeof client.deliverySchedule;

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

        total += dayTotal;
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return total;
  };

  // Função para abrir modal de papel
  const handleOpenLeaveReceiptModal = (clientId: string, clientName: string) => {
    setLeaveReceiptClientId(clientId);
    setLeaveReceiptClientName(clientName);

    // Definir período padrão: último mês
    const today = new Date();
    const lastMonth = new Date(today);
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    setLeaveReceiptDateFrom(lastMonth.toISOString().split('T')[0]);
    setLeaveReceiptDateTo(today.toISOString().split('T')[0]);

    const value = calculatePeriodValue(clientId, lastMonth.toISOString().split('T')[0], today.toISOString().split('T')[0]);
    setLeaveReceiptValue(value);
    setShowLeaveReceiptModal(true);
  };

  // Função para atualizar valor quando datas mudarem
  const updateLeaveReceiptValue = () => {
    if (leaveReceiptClientId && leaveReceiptDateFrom && leaveReceiptDateTo) {
      const value = calculatePeriodValue(leaveReceiptClientId, leaveReceiptDateFrom, leaveReceiptDateTo);
      setLeaveReceiptValue(value);
    }
  };
  
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedRoute, setSelectedRoute] = useState<string>('all');
  const [deliveries, setDeliveries] = useState<ClientDelivery[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedDelivery, setExpandedDelivery] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<DeliveryStatus | 'all'>('all');
  const [notDeliveredReason, setNotDeliveredReason] = useState('');
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
    
    setProcessingId(deliveryId);
    try {
      // Registrar consumo dinâmico (histórico para IA)
      await recordDynamicDelivery(delivery.clientId, currentUser.id, itemsWithQuantity);
      
      // Atualizar status da entrega como entregue
      await updateDeliveryStatus(deliveryId, 'delivered');
      
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
      setPaymentAmount(debt.total > 0 ? debt.total.toFixed(2) : '');
    }
    setPaymentClientId(clientId);
    setPaymentClientName(clientName);
    setPaidUntilDate(new Date().toISOString().split('T')[0]);
    setPaymentMethod('Dinheiro');
    setShowPaymentModal(true);
  };

  // Registrar pagamento
  const handleRegisterPayment = async () => {
    if (!currentUser?.id || !paymentClientId) return;
    
    const amount = parseFloat(paymentAmount) || 0;
    if (amount <= 0) {
      setError('Informe um valor válido');
      return;
    }
    
    setSavingPayment(true);
    try {
      await registerDailyPayment(currentUser.id, paymentClientId, amount, paymentMethod, paidUntilDate);
      setShowPaymentModal(false);
      setPaymentClientId('');
      setPaymentClientName('');
      setPaymentAmount('');
      setClientDebt(0);
    } catch (err) {
      console.error('Erro ao registrar pagamento:', err);
      setError('Erro ao registrar pagamento');
    } finally {
      setSavingPayment(false);
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

  // Filtrar entregas por status E por rota
  const filteredDeliveries = deliveries.filter(d => {
    const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
    const matchesRoute = selectedRoute === 'all' || d.routeId === selectedRoute;
    return matchesStatus && matchesRoute;
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

      {/* Filtros */}
      {deliveries.length > 0 && (
        <div className="flex items-center gap-2">
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
                          <div className="flex items-center gap-2 mb-1">
                            <User size={16} className="text-gray-400" />
                            <span className="font-medium text-gray-800">{delivery.clientName}</span>
                            {isClientDynamic(delivery.clientId) && (
                              <span className="flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                                <Sparkles size={10} />
                                DINÂMICO
                              </span>
                            )}
                            {getStatusBadge(delivery.status)}
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
                              {delivery.items.map(item => (
                                <span key={item.productId} className={`px-2 py-1 rounded text-sm ${
                                  isClientDynamic(delivery.clientId) ? 'bg-purple-100 text-purple-700' : 'bg-gray-100'
                                }`}>
                                  {getProductName(item.productId)}: {item.quantity}
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
                            <span className="text-sm font-medium text-green-600">
                              Valor: €{delivery.totalValue.toFixed(2)}
                            </span>
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
                            {/* Botão Receber Pagamento */}
                            <button
                              onClick={() => handleOpenPaymentModal(delivery.clientId, delivery.clientName)}
                              className="flex items-center gap-1 px-3 py-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 text-sm"
                            >
                              <Banknote size={14} />
                              Receber €
                            </button>
                            {/* Botão Deixar Papel */}
                            {(() => {
                              const client = clients.find(c => c.id === delivery.clientId);
                              if (client?.leaveReceipt) {
                                return (
                                  <button
                                    onClick={() => handleOpenLeaveReceiptModal(delivery.clientId, delivery.clientName)}
                                    className="flex items-center gap-1 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm"
                                  >
                                    <ClipboardList size={14} />
                                    Deixar Papel
                                  </button>
                                );
                              }
                              return null;
                            })()}
                                {/* Modal Deixar Papel */}
                                {showLeaveReceiptModal && leaveReceiptClientId && (
                                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                                    <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-xl">
                                      <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                        <ClipboardList className="text-blue-600" size={20} />
                                        Deixar Papel para Cliente
                                      </h3>
                                      <div className="mb-4">
                                        <p className="text-gray-600 text-sm mb-1">Cliente:</p>
                                        <p className="font-semibold text-gray-800">{leaveReceiptClientName}</p>
                                      </div>
                                      <div className="mb-4 space-y-3">
                                        <div>
                                          <label className="block text-sm font-medium text-gray-700 mb-1">De (data inicial):</label>
                                          <input
                                            type="date"
                                            value={leaveReceiptDateFrom}
                                            onChange={e => {
                                              setLeaveReceiptDateFrom(e.target.value);
                                              setTimeout(updateLeaveReceiptValue, 100);
                                            }}
                                            className="w-full px-4 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-sm font-medium text-gray-700 mb-1">Até (data final):</label>
                                          <input
                                            type="date"
                                            value={leaveReceiptDateTo}
                                            onChange={e => {
                                              setLeaveReceiptDateTo(e.target.value);
                                              setTimeout(updateLeaveReceiptValue, 100);
                                            }}
                                            className="w-full px-4 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                          />
                                        </div>
                                      </div>
                                      <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                        <p className="text-sm text-blue-700">
                                          <strong>Valor a apontar no papel:</strong> €{leaveReceiptValue.toFixed(2)}
                                        </p>
                                        <p className="text-xs text-blue-600 mt-1">
                                          Período: {leaveReceiptDateFrom} até {leaveReceiptDateTo}
                                        </p>
                                      </div>
                                      <div className="flex gap-3 mt-6">
                                        <button
                                          onClick={() => {
                                            setShowLeaveReceiptModal(false);
                                            setLeaveReceiptClientId('');
                                            setLeaveReceiptClientName('');
                                            setLeaveReceiptDateFrom('');
                                            setLeaveReceiptDateTo(new Date().toISOString().split('T')[0]);
                                            setLeaveReceiptValue(0);
                                          }}
                                          className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                                        >
                                          Fechar
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                )}
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
                                {/* Botão Receber Pagamento também para entregas confirmadas */}
                                <button
                                  onClick={() => handleOpenPaymentModal(delivery.clientId, delivery.clientName)}
                                  className="flex items-center gap-1 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 text-xs"
                                >
                                  <Banknote size={12} />
                                  Receber €
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
          <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Banknote className="text-amber-600" size={20} />
              Receber Pagamento
            </h3>
            
            <div className="mb-4">
              <p className="text-gray-600 text-sm mb-1">Cliente:</p>
              <p className="font-semibold text-gray-800">{paymentClientName}</p>
            </div>

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

              {/* Data até quando fica pago */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pago até (data)
                </label>
                <input
                  type="date"
                  value={paidUntilDate}
                  onChange={(e) => setPaidUntilDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Deixe em branco se não souber a data exata
                </p>
              </div>
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
    </div>
  );
};

export default DriverDailyDeliveries;
