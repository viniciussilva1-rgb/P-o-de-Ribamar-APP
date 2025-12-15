
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Plus, User, MapPin, Phone, Search, Map, Save, X, Navigation, CreditCard, Loader2, Calendar, AlertCircle, Tag, FileText, RotateCcw, Calculator, CheckCircle, Sparkles, Copy, Check, GripVertical, ArrowUpDown, ChevronUp, ChevronDown, Receipt, ChevronLeft, ChevronRight, Package, Plane, Trash2 } from 'lucide-react';
import { Client, Route, DeliverySchedule, Product, ClientConsumptionHistory, VacationPeriod } from '../types';
import SmartDeliveryMap from './SmartDeliveryMap';

// Componente auxiliar para isolar o estado de adição por linha
const AddScheduleItemRow: React.FC<{ products: Product[], onAdd: (productId: string, quantity: number) => void }> = ({ products, onAdd }) => {
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState(1);

  const handleAdd = () => {
    if (selectedProduct && quantity > 0) {
      onAdd(selectedProduct, quantity);
      setSelectedProduct('');
      setQuantity(1);
    }
  };

  return (
    <div className="flex gap-2 items-center bg-white p-1.5 rounded border border-dashed border-gray-300">
      <select 
        className="flex-1 text-sm p-1.5 bg-transparent border-none focus:ring-0 text-gray-700"
        value={selectedProduct}
        onChange={(e) => setSelectedProduct(e.target.value)}
      >
        <option value="">+ Adicionar Produto</option>
        {products.map(p => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
      <input 
        type="number" 
        min="1"
        className="w-16 p-1.5 text-sm border-l border-gray-200 text-center"
        placeholder="Qtd"
        value={quantity}
        onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
      />
      <button 
        type="button"
        onClick={handleAdd}
        className="p-1.5 bg-amber-100 text-amber-700 rounded hover:bg-amber-200"
        disabled={!selectedProduct}
      >
        <Plus size={16} />
      </button>
    </div>
  );
};

// Componente para aplicar produtos em múltiplos dias de uma vez
const QuickScheduleSetup: React.FC<{ 
  products: Product[], 
  onApply: (items: { productId: string, quantity: number }[], days: string[]) => void 
}> = ({ products, onApply }) => {
  const [selectedProducts, setSelectedProducts] = useState<{ productId: string, quantity: number }[]>([]);
  const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set());
  const [newProductId, setNewProductId] = useState('');
  const [newQuantity, setNewQuantity] = useState<number | ''>('');

  const daysOptions = [
    { key: 'seg', label: 'Seg', fullLabel: 'Segunda' },
    { key: 'ter', label: 'Ter', fullLabel: 'Terça' },
    { key: 'qua', label: 'Qua', fullLabel: 'Quarta' },
    { key: 'qui', label: 'Qui', fullLabel: 'Quinta' },
    { key: 'sex', label: 'Sex', fullLabel: 'Sexta' },
    { key: 'sab', label: 'Sáb', fullLabel: 'Sábado' },
    { key: 'dom', label: 'Dom', fullLabel: 'Domingo' },
  ];

  const handleAddProduct = () => {
    if (newProductId && newQuantity && newQuantity > 0) {
      const exists = selectedProducts.find(p => p.productId === newProductId);
      if (exists) {
        setSelectedProducts(prev => prev.map(p => 
          p.productId === newProductId ? { ...p, quantity: newQuantity } : p
        ));
      } else {
        setSelectedProducts(prev => [...prev, { productId: newProductId, quantity: newQuantity }]);
      }
      setNewProductId('');
      setNewQuantity('');
    }
  };

  const handleRemoveProduct = (productId: string) => {
    setSelectedProducts(prev => prev.filter(p => p.productId !== productId));
  };

  const toggleDay = (dayKey: string) => {
    const newDays = new Set(selectedDays);
    if (newDays.has(dayKey)) {
      newDays.delete(dayKey);
    } else {
      newDays.add(dayKey);
    }
    setSelectedDays(newDays);
  };

  const selectAllWeekdays = () => {
    setSelectedDays(new Set(['seg', 'ter', 'qua', 'qui', 'sex']));
  };

  const selectAllDays = () => {
    setSelectedDays(new Set(['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom']));
  };

  const clearDays = () => {
    setSelectedDays(new Set());
  };

  const handleApply = () => {
    if (selectedProducts.length > 0 && selectedDays.size > 0) {
      onApply(selectedProducts, Array.from(selectedDays));
      setSelectedProducts([]);
      setSelectedDays(new Set());
    }
  };

  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Copy size={18} className="text-amber-600" />
        <h4 className="font-bold text-amber-800">Aplicar em Múltiplos Dias</h4>
        <span className="text-xs bg-amber-200 text-amber-700 px-2 py-0.5 rounded-full">Rápido</span>
      </div>
      
      <p className="text-xs text-amber-700">
        Selecione os produtos e dias, depois clique em "Aplicar" para adicionar de uma vez.
      </p>

      {/* Seletor de Produtos */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-gray-600 uppercase">1. Escolha os Produtos</label>
        
        {/* Lista de produtos selecionados */}
        {selectedProducts.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {selectedProducts.map(sp => {
              const prod = products.find(p => p.id === sp.productId);
              return (
                <div key={sp.productId} className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-amber-300 shadow-sm">
                  <span className="text-sm font-medium">{prod?.name}</span>
                  <span className="text-xs bg-amber-100 text-amber-700 px-1.5 rounded font-bold">{sp.quantity}</span>
                  <button 
                    type="button"
                    onClick={() => handleRemoveProduct(sp.productId)}
                    className="text-red-400 hover:text-red-600 ml-1"
                  >
                    <X size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
        
        {/* Adicionar novo produto */}
        <div className="flex gap-2">
          <select
            value={newProductId}
            onChange={(e) => setNewProductId(e.target.value)}
            className="flex-1 p-2 text-sm border border-amber-300 rounded-lg bg-white focus:ring-2 focus:ring-amber-500"
          >
            <option value="">Selecionar produto...</option>
            {products.filter(p => !selectedProducts.find(sp => sp.productId === p.id)).map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <input
            type="number"
            min="1"
            value={newQuantity}
            onChange={(e) => setNewQuantity(e.target.value === '' ? '' : parseInt(e.target.value) || '')}
            className="w-20 p-2 text-sm border border-amber-300 rounded-lg text-center font-bold"
            placeholder="Qtd"
          />
          <button
            type="button"
            onClick={handleAddProduct}
            disabled={!newProductId}
            className="px-3 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>

      {/* Seletor de Dias */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-gray-600 uppercase">2. Escolha os Dias</label>
          <div className="flex gap-2">
            <button 
              type="button"
              onClick={selectAllWeekdays}
              className="text-xs text-amber-600 hover:text-amber-800 font-medium"
            >
              Seg-Sex
            </button>
            <span className="text-gray-300">|</span>
            <button 
              type="button"
              onClick={selectAllDays}
              className="text-xs text-amber-600 hover:text-amber-800 font-medium"
            >
              Todos
            </button>
            <span className="text-gray-300">|</span>
            <button 
              type="button"
              onClick={clearDays}
              className="text-xs text-gray-500 hover:text-gray-700 font-medium"
            >
              Limpar
            </button>
          </div>
        </div>
        
        <div className="flex gap-2 flex-wrap">
          {daysOptions.map(day => (
            <button
              key={day.key}
              type="button"
              onClick={() => toggleDay(day.key)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedDays.has(day.key)
                  ? 'bg-amber-500 text-white shadow-md'
                  : 'bg-white border border-gray-300 text-gray-600 hover:border-amber-400'
              }`}
            >
              {day.label}
            </button>
          ))}
        </div>
      </div>

      {/* Resumo e Botão Aplicar */}
      {selectedProducts.length > 0 && selectedDays.size > 0 && (
        <div className="pt-2 border-t border-amber-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-amber-800">
              <span className="font-semibold">{selectedProducts.length}</span> produto(s) em{' '}
              <span className="font-semibold">{selectedDays.size}</span> dia(s)
            </div>
            <button
              type="button"
              onClick={handleApply}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center gap-2 shadow-md transition-all active:scale-95"
            >
              <Check size={18} />
              Aplicar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const DriverView: React.FC = () => {
  const { currentUser } = useAuth();
  const { 
    getClientsByDriver,
    addClient,
    updateClient,
    getRoutesByDriver,
    addRoute,
    deleteRoute,
    products,
    calculateClientDebt,
    getClientConsumptionHistory,
    getClientPaymentInfo,
    registerPayment,
    toggleSkippedDate,
    updateClientsOrder
  } = useData();
  
  // Modals
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isRouteModalOpen, setIsRouteModalOpen] = useState(false);
  const [showConsumptionModal, setShowConsumptionModal] = useState(false);
  const [consumptionData, setConsumptionData] = useState<ClientConsumptionHistory | null>(null);
  
  // States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRouteFilter, setSelectedRouteFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'geral' | 'entrega' | 'pagamento' | 'obs' | 'falhas' | 'precos' | 'ferias'>('geral');
  const [isLocating, setIsLocating] = useState(false);
  
  // States for Vacation
  const [vacationStartDate, setVacationStartDate] = useState('');
  const [vacationEndDate, setVacationEndDate] = useState('');
  const [vacationReason, setVacationReason] = useState('');
  
  // States for Payment Calculation
  const [calculatedTotal, setCalculatedTotal] = useState<number | null>(null);
  const [calculatedDays, setCalculatedDays] = useState<number>(0);
  const [calcDateFrom, setCalcDateFrom] = useState<string>('');
  const [calcDateTo, setCalcDateTo] = useState<string>('');
  const [calcDailyValue, setCalcDailyValue] = useState<number>(0);
  const [showPeriodCalendar, setShowPeriodCalendar] = useState(false);
  const [periodCalendarMonth, setPeriodCalendarMonth] = useState(new Date());
  const [selectingDateType, setSelectingDateType] = useState<'from' | 'to'>('from');
  
  // Route Form
  const [newRouteName, setNewRouteName] = useState('');

  // Drag & Drop States
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [draggedClientId, setDraggedClientId] = useState<string | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const [moveToPosition, setMoveToPosition] = useState<{ clientId: string; position: string } | null>(null);

  // Client Form
  const initialClientState: Partial<Client> = {
    name: '',
    address: '',
    phone: '',
    nif: '',
    routeId: '',
    status: 'ACTIVE',
    coordinates: { lat: 0, lng: 0 },
    notes: '',
    paymentFrequency: 'Mensal',
    paymentCustomDays: 15,
    currentBalance: 0,
    leaveReceipt: false,
    acceptsReturns: false,
    isDynamicChoice: false, // Escolha Dinâmica
    deliverySchedule: {},
    customPrices: {}
  };
  const [clientForm, setClientForm] = useState<Partial<Client>>(initialClientState);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);

  // Sem usuário logado, não renderiza nada (App cuida de mostrar Login)
  if (!currentUser) return null;

  // Leitura dos dados do contexto (já vindos do Firestore via onSnapshot)
  const myClients = getClientsByDriver(currentUser.id);
  const myRoutes = getRoutesByDriver(currentUser.id);

  // Lista local para ordenação durante drag & drop
  const [localClientOrder, setLocalClientOrder] = useState<Client[]>([]);

  // Sincronizar lista local quando myClients mudar OU quando entrar no modo de reordenação
  React.useEffect(() => {
    if (!isReorderMode) {
      // Fora do modo de reordenação: sincroniza com myClients ordenado por sortOrder
      const sorted = [...myClients].sort((a, b) => {
        const orderA = a.sortOrder ?? 9999;
        const orderB = b.sortOrder ?? 9999;
        return orderA - orderB;
      });
      setLocalClientOrder(sorted);
    }
  }, [myClients, isReorderMode]);

  // Clientes filtrados (por rota) - usado tanto no modo normal quanto no modo de ordenação
  const clientsFilteredByRoute = localClientOrder.filter(c => {
    return selectedRouteFilter === 'all' || c.routeId === selectedRouteFilter;
  });

  // Clientes filtrados por busca também no modo de ordenação
  const filteredClients = clientsFilteredByRoute.filter(c => {
    if (!searchTerm) return true;
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.address.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Funções de mover com botões - movem dentro da lista filtrada visível
  // Função para mover cliente para uma posição específica
  const handleMoveToPosition = (clientId: string, targetPosition: number) => {
    // Trabalhar com a lista filtrada por rota (sem busca)
    const currentFilteredList = localClientOrder.filter(c => 
      selectedRouteFilter === 'all' || c.routeId === selectedRouteFilter
    );
    
    // Validar posição (1-based para o usuário)
    const targetIndex = targetPosition - 1;
    if (targetIndex < 0 || targetIndex >= currentFilteredList.length) return;
    
    // Encontrar índice atual na lista filtrada
    const currentFilteredIdx = currentFilteredList.findIndex(c => c.id === clientId);
    if (currentFilteredIdx === -1 || currentFilteredIdx === targetIndex) return;
    
    // Cliente a mover
    const clientToMove = currentFilteredList[currentFilteredIdx];
    
    // Cliente que está na posição alvo
    const targetClient = currentFilteredList[targetIndex];
    
    // Índices na lista completa
    const clientFullIndex = localClientOrder.findIndex(c => c.id === clientToMove.id);
    const targetFullIndex = localClientOrder.findIndex(c => c.id === targetClient.id);
    
    // Reordenar: remover o cliente e inserir na nova posição
    const newOrder = [...localClientOrder];
    const [removed] = newOrder.splice(clientFullIndex, 1);
    newOrder.splice(targetFullIndex, 0, removed);
    
    setLocalClientOrder(newOrder);
    setMoveToPosition(null);
    setSearchTerm(''); // Limpar busca para ver a nova posição
  };

  const handleMoveUp = (clientId: string) => {
    // Encontrar índice na lista filtrada atual (filtrada por rota, sem busca)
    const currentFilteredList = localClientOrder.filter(c => 
      selectedRouteFilter === 'all' || c.routeId === selectedRouteFilter
    );
    const filteredIdx = currentFilteredList.findIndex(c => c.id === clientId);
    if (filteredIdx <= 0) return;
    
    // Encontrar os clientes a trocar
    const currentClient = currentFilteredList[filteredIdx];
    const previousClient = currentFilteredList[filteredIdx - 1];
    
    // Encontrar índices na lista completa
    const currentIndexInFull = localClientOrder.findIndex(c => c.id === currentClient.id);
    const previousIndexInFull = localClientOrder.findIndex(c => c.id === previousClient.id);
    
    // Criar nova lista com a troca
    const newOrder = [...localClientOrder];
    const temp = newOrder[currentIndexInFull];
    newOrder[currentIndexInFull] = newOrder[previousIndexInFull];
    newOrder[previousIndexInFull] = temp;
    
    setLocalClientOrder(newOrder);
  };

  const handleMoveDown = (clientId: string) => {
    // Encontrar índice na lista filtrada atual
    const currentFilteredList = localClientOrder.filter(c => 
      selectedRouteFilter === 'all' || c.routeId === selectedRouteFilter
    );
    const filteredIdx = currentFilteredList.findIndex(c => c.id === clientId);
    if (filteredIdx === -1 || filteredIdx >= currentFilteredList.length - 1) return;
    
    // Encontrar os clientes a trocar
    const currentClient = currentFilteredList[filteredIdx];
    const nextClient = currentFilteredList[filteredIdx + 1];
    
    // Encontrar índices na lista completa
    const currentIndexInFull = localClientOrder.findIndex(c => c.id === currentClient.id);
    const nextIndexInFull = localClientOrder.findIndex(c => c.id === nextClient.id);
    
    // Criar nova lista com a troca
    const newOrder = [...localClientOrder];
    const temp = newOrder[currentIndexInFull];
    newOrder[currentIndexInFull] = newOrder[nextIndexInFull];
    newOrder[nextIndexInFull] = temp;
    
    setLocalClientOrder(newOrder);
  };

  // Funções de Drag & Drop
  const handleDragStart = (e: React.DragEvent, clientId: string) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', clientId);
    setDraggedClientId(clientId);
  };

  const handleDragOver = (e: React.DragEvent, targetClientId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!draggedClientId || draggedClientId === targetClientId) return;
    
    // Trabalhar com a lista filtrada
    const currentFilteredList = localClientOrder.filter(c => 
      selectedRouteFilter === 'all' || c.routeId === selectedRouteFilter
    );
    const draggedFilteredIndex = currentFilteredList.findIndex(c => c.id === draggedClientId);
    const targetFilteredIndex = currentFilteredList.findIndex(c => c.id === targetClientId);
    
    if (draggedFilteredIndex === -1 || targetFilteredIndex === -1) return;
    
    // Encontrar os clientes
    const draggedClient = currentFilteredList[draggedFilteredIndex];
    const targetClient = currentFilteredList[targetFilteredIndex];
    
    // Índices na lista completa
    const draggedFullIndex = localClientOrder.findIndex(c => c.id === draggedClient.id);
    const targetFullIndex = localClientOrder.findIndex(c => c.id === targetClient.id);
    
    // Reordenar lista completa
    const newOrder = [...localClientOrder];
    const [draggedItem] = newOrder.splice(draggedFullIndex, 1);
    newOrder.splice(targetFullIndex, 0, draggedItem);
    setLocalClientOrder(newOrder);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDraggedClientId(null);
  };

  const handleDragEnd = () => {
    setDraggedClientId(null);
  };

  const handleSaveOrder = async () => {
    setSavingOrder(true);
    try {
      // Criar lista de atualizações com a nova ordem
      const updates = localClientOrder.map((client, index) => ({
        id: client.id,
        sortOrder: index
      }));
      await updateClientsOrder(updates);
      // Sucesso - sai do modo de reordenação automaticamente
      setIsReorderMode(false);
    } catch (error) {
      console.error('Erro ao salvar ordem:', error);
      alert('Erro ao salvar ordem de entrega');
    } finally {
      setSavingOrder(false);
    }
  };

  const handleOpenClientModal = (client?: Client) => {
    setCalculatedTotal(null); // Reset calc
    setCalcDateFrom('');
    setCalcDateTo('');
    setCalcDailyValue(0);
    setCalculatedDays(0);
    // Reset vacation form
    setVacationStartDate('');
    setVacationEndDate('');
    setVacationReason('');
    if (client) {
      setEditingClientId(client.id);
      setClientForm({ ...client, deliverySchedule: client.deliverySchedule || {}, customPrices: client.customPrices || {}, vacationPeriods: client.vacationPeriods || [] });
    } else {
      setEditingClientId(null);
      setClientForm({ ...initialClientState, routeId: myRoutes.length > 0 ? myRoutes[0].id : '' });
    }
    setActiveTab('geral');
    setIsClientModalOpen(true);
  };

  const handleSaveClient = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingClientId) {
      // Garantir que deliverySchedule e vacationPeriods sejam incluídos na atualização
      const updateData = {
        ...clientForm,
        deliverySchedule: clientForm.deliverySchedule || {},
        customPrices: clientForm.customPrices || {},
        vacationPeriods: clientForm.vacationPeriods || [],
      };
      updateClient(editingClientId, updateData);
    } else {
      const newClient: Client = {
        id: Date.now().toString(),
        name: clientForm.name || 'Sem Nome',
        address: clientForm.address || '',
        phone: clientForm.phone || '',
        nif: clientForm.nif,
        driverId: currentUser.id,
        routeId: clientForm.routeId,
        coordinates: clientForm.coordinates,
        status: clientForm.status || 'ACTIVE',
        notes: clientForm.notes,
        paymentFrequency: clientForm.paymentFrequency || 'Mensal',
        paymentCustomDays: clientForm.paymentCustomDays,
        currentBalance: Number(clientForm.currentBalance) || 0,
        leaveReceipt: clientForm.leaveReceipt || false,
        acceptsReturns: clientForm.acceptsReturns || false,
        isDynamicChoice: clientForm.isDynamicChoice || false,
        deliverySchedule: clientForm.deliverySchedule || {},
        customPrices: clientForm.customPrices || {},
        vacationPeriods: clientForm.vacationPeriods || [],
        createdAt: new Date().toISOString()
      };
      addClient(newClient);
    }
    setIsClientModalOpen(false);
  };

  const handleAddRoute = async () => {
    if (!newRouteName.trim()) {
      alert('Digite o nome da rota');
      return;
    }
    const route: Route = {
      id: Date.now().toString(),
      name: newRouteName,
      driverId: currentUser.id
    };
    try {
      console.log('📍 Criando rota:', route);
      await addRoute(route);
      console.log('✅ Rota criada com sucesso');
      setNewRouteName('');
      alert(`Rota "${route.name}" criada com sucesso!\nVocê pode agora associar clientes a esta rota.`);
    } catch (err: any) {
      console.error('❌ Erro ao criar rota:', err);
      const errorMsg = err?.message || err?.code || 'Erro desconhecido';
      alert(`Erro ao criar rota:\n${errorMsg}\n\nCertifique-se de que está logado e que tem permissão.`);
    }
  };

  const getGPS = () => {
    if (!navigator.geolocation) {
      alert('Geolocalização não suportada neste navegador.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setClientForm(prev => ({
          ...prev,
          coordinates: {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          }
        }));
        setIsLocating(false);
      },
      (error) => {
        console.error("GPS Error:", error);
        alert('Erro ao obter localização: ' + error.message);
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  // Schedule Helpers
  const daysOfWeek = [
    { key: 'seg', label: 'Segunda-feira' },
    { key: 'ter', label: 'Terça-feira' },
    { key: 'qua', label: 'Quarta-feira' },
    { key: 'qui', label: 'Quinta-feira' },
    { key: 'sex', label: 'Sexta-feira' },
    { key: 'sab', label: 'Sábado' },
    { key: 'dom', label: 'Domingo' },
  ];

  const handleAddItemToSchedule = (dayKey: string, productId: string, quantity: number) => {
    const currentSchedule = { ...clientForm.deliverySchedule };
    const dayItems = currentSchedule[dayKey as keyof DeliverySchedule] || [];

    // Check if product already exists for this day
    const existingIndex = dayItems.findIndex(i => i.productId === productId);
    
    let newDayItems;
    if (existingIndex >= 0) {
      // Update quantity
      newDayItems = [...dayItems];
      newDayItems[existingIndex].quantity = quantity;
    } else {
      // Add new
      newDayItems = [...dayItems, { productId: productId, quantity: quantity }];
    }

    const newSchedule = {
      ...currentSchedule,
      [dayKey]: newDayItems
    };

    setClientForm({
      ...clientForm,
      deliverySchedule: newSchedule
    });
  };

  const handleRemoveItemFromSchedule = (dayKey: string, productId: string) => {
    const currentSchedule = { ...clientForm.deliverySchedule };
    const dayItems = currentSchedule[dayKey as keyof DeliverySchedule] || [];
    
    setClientForm({
      ...clientForm,
      deliverySchedule: {
        ...currentSchedule,
        [dayKey]: dayItems.filter(i => i.productId !== productId)
      }
    });
  };

  // Aplicar produtos em múltiplos dias de uma vez
  const handleApplyToMultipleDays = (items: { productId: string, quantity: number }[], days: string[]) => {
    const currentSchedule = { ...clientForm.deliverySchedule };
    
    days.forEach(dayKey => {
      const dayItems = [...(currentSchedule[dayKey as keyof DeliverySchedule] || [])];
      
      items.forEach(item => {
        const existingIndex = dayItems.findIndex(i => i.productId === item.productId);
        if (existingIndex >= 0) {
          // Atualizar quantidade se já existe
          dayItems[existingIndex].quantity = item.quantity;
        } else {
          // Adicionar novo item
          dayItems.push({ productId: item.productId, quantity: item.quantity });
        }
      });
      
      currentSchedule[dayKey as keyof DeliverySchedule] = dayItems;
    });
    
    setClientForm({
      ...clientForm,
      deliverySchedule: currentSchedule
    });
  };

    const handleCalculateDebt = () => {
      const baseClient = editingClientId ? myClients.find(c => c.id === editingClientId) : undefined;
      
      const tempClient = {
          ...(baseClient || {}),
          ...clientForm,
          createdAt: baseClient?.createdAt || new Date().toISOString()
      } as Client;

      // Usar datas personalizadas se fornecidas, senão usar padrão
      const dateFrom = calcDateFrom || tempClient.lastPaymentDate || tempClient.createdAt?.split('T')[0];
      const dateTo = calcDateTo || formatDateLocal(new Date());

      const result = calculatePeriodDebt(tempClient, dateFrom, dateTo);
      
      setCalculatedTotal(result.total);
      setCalculatedDays(result.daysCount);
      setCalcDailyValue(result.dailyValue);
      setClientForm(prev => ({ ...prev, currentBalance: parseFloat(result.total.toFixed(2)) }));
  };

  // Função para formatar data local sem problemas de fuso horário
  const formatDateLocal = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Função para calcular dívida de um período
  // Considera o histórico de alterações do agendamento para usar os valores corretos de cada período
  const calculatePeriodDebt = (client: Client, dateFromStr: string, dateToStr: string) => {
    const mapKeys = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
    
    // Função para obter o agendamento válido em uma data específica
    const getScheduleForDate = (dateStr: string): DeliverySchedule | undefined => {
      // Se não tem histórico, usar o agendamento atual
      if (!client.scheduleHistory || client.scheduleHistory.length === 0) {
        return client.deliverySchedule;
      }
      
      // Ordenar histórico por data (mais recente primeiro)
      const sortedHistory = [...client.scheduleHistory].sort((a, b) => 
        b.date.localeCompare(a.date)
      );
      
      // Encontrar o agendamento que era válido nessa data
      // (o primeiro no histórico cuja data seja <= a data em questão)
      for (const entry of sortedHistory) {
        if (entry.date <= dateStr) {
          return entry.schedule;
        }
      }
      
      // Se a data é anterior a qualquer entrada do histórico, usar o primeiro agendamento
      // ou o agendamento atual como fallback
      return sortedHistory[sortedHistory.length - 1]?.schedule || client.deliverySchedule;
    };
    
    // Função para calcular o valor de um dia específico com um agendamento específico
    const getDayValue = (schedule: DeliverySchedule | undefined, dayOfWeek: number) => {
      if (!schedule) return 0;
      const dayKey = mapKeys[dayOfWeek];
      const items = schedule[dayKey as keyof DeliverySchedule];
      if (!items || items.length === 0) return 0;
      
      let dayTotal = 0;
      items.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          const price = client.customPrices?.[product.id] ?? product.price;
          dayTotal += item.quantity * price;
        }
      });
      return dayTotal;
    };
    
    // Função para verificar se um dia da semana tem entrega em um agendamento
    const hasDeliveryOnDay = (schedule: DeliverySchedule | undefined, dayOfWeek: number) => {
      if (!schedule) return false;
      const dayKey = mapKeys[dayOfWeek];
      const items = schedule[dayKey as keyof DeliverySchedule];
      return items && items.length > 0;
    };

    // Parsear datas
    const [y1, m1, d1] = dateFromStr.split('-').map(Number);
    const [y2, m2, d2] = dateToStr.split('-').map(Number);
    const startDate = new Date(y1, m1 - 1, d1);
    const endDate = new Date(y2, m2 - 1, d2);

    let total = 0;
    let daysCount = 0;
    const current = new Date(startDate);

    while (current <= endDate) {
      const dateStr = formatDateLocal(current);
      const dayOfWeek = current.getDay();
      
      // Obter o agendamento válido para esta data
      const scheduleForDate = getScheduleForDate(dateStr);
      
      // Este dia da semana tem entrega?
      if (hasDeliveryOnDay(scheduleForDate, dayOfWeek)) {
        // Verificar se não foi marcado como falha
        const isSkipped = client.skippedDates?.includes(dateStr);
        
        if (!isSkipped) {
          // Somar o valor do dia
          const dayValue = getDayValue(scheduleForDate, dayOfWeek);
          total += dayValue;
          daysCount++;
        }
      }
      
      current.setDate(current.getDate() + 1);
    }

    // Calcular valor médio diário para exibição
    const dailyValue = daysCount > 0 ? total / daysCount : 0;

    return { total, daysCount, dailyValue };
  };

  const handleConfirmPayment = () => {
    if (editingClientId && calculatedTotal !== null) {
        registerPayment(editingClientId, calculatedTotal, 'Dinheiro'); // Defaulting to Cash for now
        setClientForm(prev => ({ ...prev, currentBalance: 0 }));
        setCalculatedTotal(0);
        alert("Pagamento registrado com sucesso! O histórico foi atualizado.");
    }
  };

  // Falhas Logic
  const handleToggleSkippedDate = (date: string) => {
      if (!editingClientId) return;
      toggleSkippedDate(editingClientId, date);
      // Update local form state to reflect changes if we are editing
      const currentSkipped = clientForm.skippedDates || [];
      if (currentSkipped.includes(date)) {
          setClientForm({...clientForm, skippedDates: currentSkipped.filter(d => d !== date)});
      } else {
          setClientForm({...clientForm, skippedDates: [...currentSkipped, date]});
      }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Meus Clientes</h2>
          <p className="text-gray-500">Gerencie sua carteira e rotas de entrega</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isReorderMode ? (
            <>
              <button 
                onClick={handleSaveOrder}
                disabled={savingOrder}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 shadow-lg transition-transform active:scale-95 disabled:opacity-50"
              >
                {savingOrder ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                <span>Salvar Ordem</span>
              </button>
              <button 
                onClick={() => {
                  setIsReorderMode(false);
                  // Restaurar ordem original
                  const sorted = [...myClients].sort((a, b) => {
                    const orderA = a.sortOrder ?? 9999;
                    const orderB = b.sortOrder ?? 9999;
                    return orderA - orderB;
                  });
                  setLocalClientOrder(sorted);
                }}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 shadow-lg transition-transform active:scale-95"
              >
                <X size={20} />
                <span>Cancelar</span>
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={() => setIsReorderMode(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 shadow-lg transition-transform active:scale-95"
              >
                <ArrowUpDown size={20} />
                <span className="hidden sm:inline">Ordenar Entrega</span>
              </button>
              <button 
                onClick={() => setIsRouteModalOpen(true)}
                className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-gray-50 transition-colors shadow-sm"
              >
                <Map size={20} />
                <span className="hidden sm:inline">Gerenciar Rotas</span>
              </button>
              <button 
                onClick={() => handleOpenClientModal()}
                className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 shadow-lg transition-transform active:scale-95"
              >
                <Plus size={20} />
                <span>Novo Cliente</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Modo de Ordenação - Instruções */}
      {isReorderMode && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-blue-700">
            <GripVertical size={20} />
            <span className="font-medium">Modo de Ordenação Ativo</span>
          </div>
          <p className="text-blue-600 text-sm mt-1">
            Arraste os clientes para reorganizar a ordem de entrega. A ordem será usada ao gerar as "Entregas do Dia".
          </p>
        </div>
      )}

      {/* Smart Delivery Map - Entrega Inteligente */}
      {!isReorderMode && (
        <SmartDeliveryMap 
          clients={myClients} 
          driverName={currentUser?.name}
        />
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-400" />
          </div>
          <input 
            type="text" 
            placeholder="Buscar por nome ou endereço..." 
            className="pl-10 w-full p-3 rounded-xl border-2 border-amber-100 focus:border-amber-400 focus:outline-none bg-white text-gray-900"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select 
          className="p-3 rounded-xl border-2 border-amber-100 focus:border-amber-400 focus:outline-none bg-white text-gray-900"
          value={selectedRouteFilter}
          onChange={(e) => setSelectedRouteFilter(e.target.value)}
        >
          <option value="all">Todas as Rotas</option>
          {myRoutes.map(route => (
            <option key={route.id} value={route.id}>{route.name}</option>
          ))}
        </select>
      </div>

      {/* Info sobre busca no modo de ordenação */}
      {isReorderMode && searchTerm && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-700 text-sm">
          🔍 Mostrando {filteredClients.length} cliente(s) que correspondem à busca. 
          Use o botão <strong>"Ir para posição"</strong> para mover o cliente para uma posição específica.
        </div>
      )}

      {/* Client List */}
      <div className={`grid gap-4 ${isReorderMode ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
        {filteredClients.length > 0 ? (
          filteredClients.map((client) => {
            const routeName = myRoutes.find(r => r.id === client.routeId)?.name || 'Sem Rota';
            
            // Auto Calculate Debt for display in card (Optional performance hit, but better UX)
            // Ideally we store this, but for now lets calc on fly or use stored
            const displayBalance = client.currentBalance;
            // Posição real na lista filtrada por rota (sem busca) - essa é a posição de entrega
            const realPosition = clientsFilteredByRoute.findIndex(c => c.id === client.id) + 1;
            const totalInRoute = clientsFilteredByRoute.length;

            return (
              <div 
                key={client.id}
                draggable={isReorderMode}
                onDragStart={(e) => handleDragStart(e, client.id)}
                onDragOver={(e) => handleDragOver(e, client.id)}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
                onClick={() => !isReorderMode && handleOpenClientModal(client)}
                className={`bg-white p-4 rounded-xl shadow-sm border relative overflow-hidden transition-all ${
                  isReorderMode 
                    ? `${draggedClientId === client.id ? 'opacity-50 scale-95 ring-2 ring-blue-400' : 'hover:bg-blue-50'}`
                    : 'cursor-pointer hover:shadow-md'
                } ${client.status === 'INACTIVE' ? 'opacity-70 border-gray-200' : client.isDynamicChoice ? 'border-purple-200 ring-2 ring-purple-100' : 'border-amber-50'}`}
              >
                {/* Modo de Reordenação */}
                {isReorderMode ? (
                  <div className="flex items-center gap-3">
                    {/* Botões de mover */}
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleMoveUp(client.id); }}
                        disabled={realPosition === 1}
                        className="p-1.5 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="Mover para cima"
                      >
                        <ChevronUp size={18} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleMoveDown(client.id); }}
                        disabled={realPosition === totalInRoute}
                        className="p-1.5 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="Mover para baixo"
                      >
                        <ChevronDown size={18} />
                      </button>
                    </div>
                    
                    {/* Número da posição e botão de ir para posição */}
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        setMoveToPosition({ clientId: client.id, position: '' }); 
                      }}
                      className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg hover:bg-blue-700 transition-colors"
                      title={`Posição ${realPosition} de ${totalInRoute} - Clique para mover para outra posição`}
                    >
                      {realPosition}
                    </button>
                    
                    {/* Info do cliente */}
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800">{client.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <MapPin size={14} className="text-amber-500" />
                        <span className="line-clamp-1">{client.address}</span>
                      </div>
                      <span className="text-xs text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                        {routeName}
                      </span>
                    </div>
                    
                    {/* Ícone de arrastar */}
                    <div className="text-gray-400 cursor-grab active:cursor-grabbing p-2">
                      <GripVertical size={24} />
                    </div>
                  </div>
                ) : (
                  /* Modo Normal */
                  <>
                    {client.status === 'INACTIVE' && (
                       <div className="absolute top-0 right-0 bg-red-100 text-red-600 text-xs px-2 py-1 rounded-bl-lg font-bold">INATIVO</div>
                    )}
                    {client.isDynamicChoice && client.status !== 'INACTIVE' && (
                       <div className="absolute top-0 right-0 bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-bl-lg font-bold flex items-center gap-1">
                         <Sparkles size={12} />
                         DINÂMICO
                       </div>
                    )}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className={`p-2 rounded-full ${client.status === 'INACTIVE' ? 'bg-gray-200' : client.isDynamicChoice ? 'bg-purple-100' : 'bg-amber-100'}`}>
                          <User className={client.status === 'INACTIVE' ? 'text-gray-500' : client.isDynamicChoice ? 'text-purple-600' : 'text-amber-600'} size={20} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg text-gray-800 leading-tight">{client.name}</h3>
                          <span className="text-xs text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                            {routeName}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-start space-x-2">
                        <MapPin size={16} className="mt-0.5 text-amber-500 shrink-0" />
                        <span className="line-clamp-2">{client.address}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Phone size={16} className="text-amber-500 shrink-0" />
                        <span>{client.phone}</span>
                      </div>
                      <div className="flex items-center space-x-2 pt-1">
                        <CreditCard size={16} className="text-gray-400 shrink-0" />
                        <span className="text-xs font-medium bg-gray-100 px-2 py-0.5 rounded text-gray-600">{client.paymentFrequency || 'Mensal'}</span>
                        {displayBalance > 0 && (
                          <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">
                            Deve: € {displayBalance.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })
        ) : (
          <div className="col-span-full text-center py-12 bg-white rounded-xl border-dashed border-2 border-gray-200">
            <User className="mx-auto text-gray-300 mb-2" size={48} />
            <p className="text-gray-500">Nenhum cliente encontrado.</p>
          </div>
        )}
      </div>

      {/* Modal: Mover para Posição */}
      {moveToPosition && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setMoveToPosition(null)}>
          <div className="bg-white rounded-2xl w-full max-w-xs p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <ArrowUpDown size={20} className="text-blue-600" />
                <h3 className="text-lg font-bold text-gray-800">Mover para Posição</h3>
              </div>
              <button onClick={() => setMoveToPosition(null)}>
                <X size={20} className="text-gray-400 hover:text-gray-600"/>
              </button>
            </div>
            
            <p className="text-sm text-gray-500 mb-4">
              Cliente: <strong>{localClientOrder.find(c => c.id === moveToPosition.clientId)?.name}</strong>
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Posição atual: <strong>{clientsFilteredByRoute.findIndex(c => c.id === moveToPosition.clientId) + 1}</strong> de <strong>{clientsFilteredByRoute.length}</strong>
            </p>
            
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Nova posição (1 a {clientsFilteredByRoute.length}):
              </label>
              <input 
                type="number" 
                min={1}
                max={clientsFilteredByRoute.length}
                className="w-full p-3 border border-gray-300 rounded-xl text-center text-lg font-bold bg-white text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                placeholder={`1 - ${clientsFilteredByRoute.length}`}
                value={moveToPosition.position}
                onChange={(e) => setMoveToPosition({ ...moveToPosition, position: e.target.value })}
                autoFocus
              />
              
              <div className="flex gap-2 mt-4">
                <button 
                  onClick={() => setMoveToPosition(null)}
                  className="flex-1 p-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => {
                    const pos = parseInt(moveToPosition.position);
                    if (pos >= 1 && pos <= clientsFilteredByRoute.length) {
                      handleMoveToPosition(moveToPosition.clientId, pos);
                    } else {
                      alert(`Por favor, insira uma posição entre 1 e ${clientsFilteredByRoute.length}`);
                    }
                  }}
                  disabled={!moveToPosition.position}
                  className="flex-1 p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Mover
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Gerenciar Rotas */}
      {isRouteModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                 <Map size={20} className="text-gray-700" />
                 <h3 className="text-lg font-bold text-gray-800">Gerenciar Rotas (Zonas)</h3>
              </div>
              <button onClick={() => setIsRouteModalOpen(false)}><X size={20} className="text-gray-400 hover:text-gray-600"/></button>
            </div>
            
            <p className="text-sm text-gray-500 mb-4">Crie zonas de entrega (ex: Torres Vedras, Ribamar) para organizar seus clientes.</p>

            <div className="flex gap-2 mb-6">
              <input 
                type="text" 
                className="flex-1 p-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900"
                placeholder="Nome da Rota"
                value={newRouteName}
                onChange={e => setNewRouteName(e.target.value)}
              />
              <button 
                onClick={handleAddRoute}
                className="bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-700"
              >
                Adicionar
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {myRoutes.length > 0 ? (
                myRoutes.map(route => (
                  <div key={route.id} className="flex justify-between items-center p-2 bg-gray-50 rounded border border-gray-100">
                    <span className="text-gray-800 font-medium">{route.name}</span>
                    <button 
                      onClick={() => deleteRoute(route.id)}
                      className="text-red-400 hover:text-red-600 p-1"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-center text-sm text-gray-400 italic">Nenhuma rota criada.</p>
              )}
            </div>

            <div className="mt-6">
               <button 
                  onClick={() => setIsRouteModalOpen(false)}
                  className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium"
               >
                 Fechar
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Novo/Editar Cliente (Complex Form) */}
      {isClientModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-800">
                {editingClientId ? 'Editar Cliente' : 'Novo Cliente'}
              </h3>
              <button onClick={() => setIsClientModalOpen(false)}>
                <X size={24} className="text-gray-400 hover:text-gray-600"/>
              </button>
            </div>

            {/* Tabs */}
            <div className="flex overflow-x-auto border-b border-gray-200 px-4 bg-gray-50/50">
              {[
                { id: 'geral', label: 'Geral', icon: <User size={14} /> },
                { id: 'entrega', label: 'Entrega', icon: <Calendar size={14} /> },
                { id: 'pagamento', label: 'Modo de Pagamento', icon: <CreditCard size={14} /> },
                { id: 'ferias', label: 'Férias', icon: <Package size={14} /> },
                { id: 'obs', label: 'Obs', icon: null },
                { id: 'falhas', label: 'Falhas', icon: <AlertCircle size={14} /> },
                { id: 'precos', label: 'Preços', icon: <Tag size={14} /> },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                    activeTab === tab.id 
                      ? 'border-amber-600 text-amber-700 bg-white' 
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto flex-1 bg-white">
              <form id="client-form" onSubmit={handleSaveClient}>
                
                {/* TAB: GERAL */}
                {activeTab === 'geral' && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Nome do Cliente</label>
                      <input 
                        required
                        type="text" 
                        placeholder="Nome *"
                        className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white text-gray-900"
                        value={clientForm.name}
                        onChange={e => setClientForm({...clientForm, name: e.target.value})}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Entregador Responsável</label>
                        <input 
                           disabled
                           type="text"
                           value={currentUser.name}
                           className="w-full p-2.5 bg-gray-100 border border-gray-300 rounded-lg text-gray-500 cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Rota / Zona de Entrega</label>
                        <select 
                          className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white text-gray-900"
                          value={clientForm.routeId}
                          onChange={e => setClientForm({...clientForm, routeId: e.target.value})}
                        >
                          <option value="">Padrão (Sem Zona)</option>
                          {myRoutes.map(r => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">NIF (Opcional)</label>
                      <input 
                        type="text" 
                        placeholder="NIF da Empresa"
                        className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white text-gray-900"
                        value={clientForm.nif || ''}
                        onChange={e => setClientForm({...clientForm, nif: e.target.value})}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-1">
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Telefone</label>
                        <input 
                          type="tel" 
                          placeholder="Telefone"
                          className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white text-gray-900"
                          value={clientForm.phone}
                          onChange={e => setClientForm({...clientForm, phone: e.target.value})}
                        />
                      </div>
                      <div className="md:col-span-2">
                         <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Coordenadas (opcional)</label>
                         <div className="flex gap-2">
                           <input 
                              type="text" 
                              placeholder="Latitude"
                              className="w-1/2 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white text-gray-900 text-sm"
                              value={clientForm.coordinates?.lat || ''}
                              onChange={e => setClientForm({
                                ...clientForm, 
                                coordinates: { 
                                  ...clientForm.coordinates, 
                                  lat: e.target.value,
                                  lng: clientForm.coordinates?.lng || ''
                                }
                              })}
                            />
                            <input 
                              type="text" 
                              placeholder="Longitude"
                              className="w-1/2 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white text-gray-900 text-sm"
                              value={clientForm.coordinates?.lng || ''}
                              onChange={e => setClientForm({
                                ...clientForm, 
                                coordinates: { 
                                  ...clientForm.coordinates, 
                                  lat: clientForm.coordinates?.lat || '',
                                  lng: e.target.value
                                }
                              })}
                            />
                         </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Endereço</label>
                      <textarea 
                        required
                        placeholder="Endereço completo"
                        rows={2}
                        className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white text-gray-900 resize-none"
                        value={clientForm.address}
                        onChange={e => setClientForm({...clientForm, address: e.target.value})}
                      />
                    </div>

                    <div className="flex justify-end">
                      <button 
                        type="button"
                        onClick={getGPS}
                        disabled={isLocating}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        {isLocating ? <Loader2 size={16} className="animate-spin" /> : <Navigation size={16} />}
                        <span>{isLocating ? 'Buscando...' : 'Pegar GPS Atual'}</span>
                      </button>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Status da Conta: <span className={`font-bold ${clientForm.status === 'ACTIVE' ? 'text-green-600' : 'text-red-600'}`}>{clientForm.status === 'ACTIVE' ? 'ATIVA' : 'INATIVA'}</span></span>
                      <button 
                        type="button"
                        onClick={() => setClientForm(prev => ({ ...prev, status: prev.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' }))}
                        className="text-xs text-blue-600 hover:underline font-medium"
                      >
                        Alterar
                      </button>
                    </div>

                    {/* Escolha Dinâmica - DESTAQUE na aba Geral */}
                    <label className={`flex items-center space-x-3 p-4 border-2 rounded-xl transition-all cursor-pointer ${clientForm.isDynamicChoice ? 'bg-purple-50 border-purple-400 shadow-md' : 'border-gray-200 hover:bg-gray-50'}`}>
                      <input 
                        type="checkbox" 
                        className="w-5 h-5 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                        checked={clientForm.isDynamicChoice || false}
                        onChange={e => setClientForm({...clientForm, isDynamicChoice: e.target.checked})}
                      />
                      <div className="flex flex-col flex-1">
                         <div className="flex items-center space-x-2">
                            <Sparkles size={20} className={clientForm.isDynamicChoice ? "text-purple-600" : "text-gray-500"}/>
                            <span className={`font-bold ${clientForm.isDynamicChoice ? "text-purple-800" : "text-gray-700"}`}>
                              Cliente com Escolha Dinâmica
                            </span>
                            {clientForm.isDynamicChoice && (
                              <span className="px-2 py-0.5 bg-purple-200 text-purple-700 text-xs font-bold rounded-full">
                                IA
                              </span>
                            )}
                         </div>
                         <p className="text-xs text-gray-500 mt-1 pl-7">
                           O cliente escolhe os produtos no momento da entrega. A IA calcula previsões baseadas no histórico.
                         </p>
                         {clientForm.isDynamicChoice && (
                           <div className="mt-2 pl-7 p-2 bg-purple-100 rounded-lg">
                             <p className="text-xs text-purple-700">
                               ✨ <strong>Não precisa configurar dias/produtos fixos.</strong> O sistema aprende automaticamente com cada entrega.
                             </p>
                           </div>
                         )}
                      </div>
                    </label>
                  </div>
                )}

                {/* TAB: ENTREGA (NEW SCHEDULE) */}
                {activeTab === 'entrega' && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <p className="text-sm text-gray-500 mb-2">Defina os dias e a quantidade de produtos para entrega automática.</p>
                    
                    {/* Quick Setup - Aplicar em múltiplos dias */}
                    <QuickScheduleSetup 
                      products={products}
                      onApply={handleApplyToMultipleDays}
                    />

                    {/* Separador */}
                    <div className="flex items-center gap-3 py-2">
                      <div className="flex-1 h-px bg-gray-200"></div>
                      <span className="text-xs text-gray-400 font-medium">ou edite dia a dia</span>
                      <div className="flex-1 h-px bg-gray-200"></div>
                    </div>
                    
                    <div className="space-y-3">
                      {daysOfWeek.map(day => {
                        const items = clientForm.deliverySchedule?.[day.key as keyof DeliverySchedule] || [];
                        const isActive = items.length > 0;

                        return (
                          <div key={day.key} className={`border rounded-lg overflow-hidden transition-colors ${isActive ? 'border-amber-200 bg-amber-50/30' : 'border-gray-200 bg-gray-50/50'}`}>
                            <div className="flex items-center justify-between p-3 bg-white border-b border-gray-100">
                              <span className="font-semibold text-gray-700 text-sm flex items-center gap-2">
                                <Calendar size={14} className="text-amber-500" />
                                {day.label}
                              </span>
                              <span className="text-xs text-gray-400">
                                {items.length > 0 ? `${items.reduce((acc, i) => acc + i.quantity, 0)} itens` : 'Sem entrega'}
                              </span>
                            </div>

                            <div className="p-3">
                              {/* List existing items */}
                              {items.length > 0 && (
                                <ul className="space-y-2 mb-3">
                                  {items.map(item => {
                                    const prod = products.find(p => p.id === item.productId);
                                    return (
                                      <li key={item.productId} className="flex justify-between items-center text-sm bg-white p-2 rounded shadow-sm border border-gray-100">
                                        <span className="text-gray-800">{prod?.name || 'Produto Removido'}</span>
                                        <div className="flex items-center gap-3">
                                          <span className="font-bold text-amber-700">{item.quantity} un.</span>
                                          <button 
                                            type="button"
                                            onClick={() => handleRemoveItemFromSchedule(day.key, item.productId)}
                                            className="text-red-400 hover:text-red-600"
                                          >
                                            <X size={14} />
                                          </button>
                                        </div>
                                      </li>
                                    );
                                  })}
                                </ul>
                              )}

                              {/* Add new item row - ISOLATED COMPONENT */}
                              <AddScheduleItemRow 
                                products={products} 
                                onAdd={(pid, qty) => handleAddItemToSchedule(day.key, pid, qty)} 
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* TAB: PAGAMENTO (Updated Automation) */}
                {activeTab === 'pagamento' && (
                  <div className="space-y-6 animate-in fade-in duration-200">
                    
                    {/* Frequência */}
                    <div className="bg-amber-50 p-4 rounded-lg border border-amber-100">
                         <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Frequência de Pagamento</label>
                         <div className="flex gap-2">
                           <select 
                              className="w-full p-2.5 border border-amber-200 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-amber-500 outline-none font-medium"
                              value={clientForm.paymentFrequency || 'Mensal'}
                              onChange={e => setClientForm({...clientForm, paymentFrequency: e.target.value as any})}
                            >
                             <option value="Diário">Diário</option>
                             <option value="Semanal">Semanal</option>
                             <option value="Mensal">Mensal</option>
                             <option value="Personalizado">Personalizado</option>
                           </select>
                           {clientForm.paymentFrequency === 'Personalizado' && (
                             <input 
                               type="number" 
                               placeholder="Dias" 
                               className="w-24 p-2.5 border border-amber-200 rounded-lg bg-white text-gray-900 text-center font-bold"
                               value={clientForm.paymentCustomDays || ''}
                               onChange={e => setClientForm({...clientForm, paymentCustomDays: parseInt(e.target.value)})}
                             />
                           )}
                         </div>
                    </div>

                    {/* Valor a Pagar (Saldo) - WITH AUTOMATION */}
                    <div>
                       <div className="flex justify-between items-center mb-1">
                           <label className="block text-xs font-semibold text-gray-500 uppercase">Valor a Pagar (Saldo Atual)</label>
                           <span className="text-xs text-gray-400">Último Pagamento: {clientForm.lastPaymentDate ? new Date(clientForm.lastPaymentDate).toLocaleDateString() : 'Nunca'}</span>
                       </div>
                       
                       {/* Campos de data para cálculo do papel - COM CALENDÁRIO VISUAL */}
                       {clientForm.leaveReceipt && (
                         <div className="mb-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                           <p className="text-xs font-semibold text-amber-700 mb-2">📋 Período para o Papel:</p>
                           <div className="grid grid-cols-2 gap-3 mb-2">
                             <div>
                               <label className="block text-xs text-amber-600 mb-1">De:</label>
                               <button
                                 type="button"
                                 onClick={() => { setSelectingDateType('from'); setShowPeriodCalendar(true); }}
                                 className="w-full p-2 border border-amber-300 rounded-lg bg-white text-gray-900 text-sm text-left hover:bg-amber-50"
                               >
                                 {calcDateFrom ? new Date(calcDateFrom).toLocaleDateString('pt-PT') : 'Selecionar...'}
                               </button>
                             </div>
                             <div>
                               <label className="block text-xs text-amber-600 mb-1">Até:</label>
                               <button
                                 type="button"
                                 onClick={() => { setSelectingDateType('to'); setShowPeriodCalendar(true); }}
                                 className="w-full p-2 border border-amber-300 rounded-lg bg-white text-gray-900 text-sm text-left hover:bg-amber-50"
                               >
                                 {calcDateTo ? new Date(calcDateTo).toLocaleDateString('pt-PT') : 'Selecionar...'}
                               </button>
                             </div>
                           </div>
                           
                           {/* Calendário Visual */}
                           {showPeriodCalendar && editingClientId && (
                             <div className="mt-3 bg-white rounded-lg border border-amber-300 p-3">
                               {(() => {
                                 const paymentInfo = getClientPaymentInfo(editingClientId);
                                 return (
                                   <>
                                     {/* Header do calendário */}
                                     <div className="flex justify-between items-center mb-3">
                                       <button
                                         type="button"
                                         onClick={() => {
                                           const newMonth = new Date(periodCalendarMonth);
                                           newMonth.setMonth(newMonth.getMonth() - 1);
                                           setPeriodCalendarMonth(newMonth);
                                         }}
                                         className="p-1 hover:bg-gray-100 rounded"
                                       >
                                         <ChevronLeft size={20} />
                                       </button>
                                       <span className="font-semibold text-gray-700 capitalize">
                                         {periodCalendarMonth.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })}
                                       </span>
                                       <button
                                         type="button"
                                         onClick={() => {
                                           const newMonth = new Date(periodCalendarMonth);
                                           newMonth.setMonth(newMonth.getMonth() + 1);
                                           setPeriodCalendarMonth(newMonth);
                                         }}
                                         className="p-1 hover:bg-gray-100 rounded"
                                       >
                                         <ChevronRight size={20} />
                                       </button>
                                     </div>
                                     
                                     {/* Dias da semana */}
                                     <div className="grid grid-cols-7 gap-1 text-center mb-1">
                                       {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, i) => (
                                         <div key={i} className="text-xs font-medium text-gray-500 py-1">{day}</div>
                                       ))}
                                     </div>
                                     
                                     {/* Dias do mês */}
                                     <div className="grid grid-cols-7 gap-1">
                                       {(() => {
                                         const year = periodCalendarMonth.getFullYear();
                                         const month = periodCalendarMonth.getMonth();
                                         const firstDay = new Date(year, month, 1);
                                         const lastDay = new Date(year, month + 1, 0);
                                         const today = new Date();
                                         today.setHours(0, 0, 0, 0);
                                         
                                         const days = [];
                                         
                                         // Dias vazios antes do primeiro dia do mês
                                         for (let i = 0; i < firstDay.getDay(); i++) {
                                           days.push(<div key={`empty-${i}`} className="w-8 h-8"></div>);
                                         }
                                         
                                         // Dias do mês
                                         for (let day = 1; day <= lastDay.getDate(); day++) {
                                           const dateObj = new Date(year, month, day);
                                           const dateStr = dateObj.toISOString().split('T')[0];
                                           const isFuture = dateObj > today;
                                           const isPaid = paymentInfo.paidDates.includes(dateStr);
                                           const isUnpaid = paymentInfo.unpaidDates.includes(dateStr);
                                           const isSelectedFrom = calcDateFrom === dateStr;
                                           const isSelectedTo = calcDateTo === dateStr;
                                           const isInRange = calcDateFrom && calcDateTo && dateStr >= calcDateFrom && dateStr <= calcDateTo;
                                           
                                           let bgClass = 'bg-gray-50 hover:bg-gray-100';
                                           let ringClass = '';
                                           
                                           if (isSelectedFrom || isSelectedTo) {
                                             bgClass = 'bg-amber-500 text-white hover:bg-amber-600';
                                           } else if (isInRange) {
                                             bgClass = 'bg-amber-100 hover:bg-amber-200';
                                           } else if (isFuture) {
                                             bgClass = 'bg-gray-100 text-gray-400';
                                           } else if (isPaid) {
                                             ringClass = 'ring-2 ring-green-500 ring-inset';
                                             bgClass = 'bg-green-50 hover:bg-green-100 text-green-700';
                                           } else if (isUnpaid) {
                                             ringClass = 'ring-2 ring-red-500 ring-inset';
                                             bgClass = 'bg-red-50 hover:bg-red-100 text-red-700';
                                           }
                                           
                                           days.push(
                                             <button
                                               key={day}
                                               type="button"
                                               onClick={() => {
                                                 if (!isFuture) {
                                                   if (selectingDateType === 'from') {
                                                     setCalcDateFrom(dateStr);
                                                     setSelectingDateType('to');
                                                   } else {
                                                     setCalcDateTo(dateStr);
                                                     setShowPeriodCalendar(false);
                                                   }
                                                 }
                                               }}
                                               disabled={isFuture}
                                               className={`w-8 h-8 rounded-full text-xs font-medium transition-all ${bgClass} ${ringClass} ${isFuture ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                                             >
                                               {day}
                                             </button>
                                           );
                                         }
                                         
                                         return days;
                                       })()}
                                     </div>
                                     
                                     {/* Legenda */}
                                     <div className="mt-3 pt-3 border-t border-gray-200 flex flex-wrap gap-2 text-xs">
                                       <div className="flex items-center gap-1">
                                         <div className="w-3 h-3 rounded-full ring-2 ring-green-500 ring-inset bg-green-50"></div>
                                         <span className="text-gray-600">Pago</span>
                                       </div>
                                       <div className="flex items-center gap-1">
                                         <div className="w-3 h-3 rounded-full ring-2 ring-red-500 ring-inset bg-red-50"></div>
                                         <span className="text-gray-600">Deve</span>
                                       </div>
                                       <div className="flex items-center gap-1">
                                         <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                                         <span className="text-gray-600">Selecionado</span>
                                       </div>
                                     </div>
                                     
                                     {/* Texto indicativo */}
                                     <p className="text-xs text-amber-600 mt-2 text-center">
                                       {selectingDateType === 'from' ? 'Selecione a data inicial' : 'Selecione a data final'}
                                     </p>
                                     
                                     {/* Botão fechar */}
                                     <button
                                       type="button"
                                       onClick={() => setShowPeriodCalendar(false)}
                                       className="w-full mt-2 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200"
                                     >
                                       Fechar
                                     </button>
                                   </>
                                 );
                               })()}
                             </div>
                           )}
                         </div>
                       )}

                       <div className="flex gap-2 items-center">
                            <div className="flex-1 relative">
                                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-xl font-bold">€</span>
                                <input 
                                    type="number"
                                    step="0.01"
                                    className="w-full p-3 pl-8 border-2 border-gray-300 rounded-lg bg-white text-gray-900 text-2xl font-bold tracking-tight"
                                    value={clientForm.currentBalance}
                                    onChange={e => setClientForm({...clientForm, currentBalance: parseFloat(e.target.value)})}
                                />
                            </div>
                            {clientForm.leaveReceipt && (
                                <button
                                    type="button"
                                    onClick={handleCalculateDebt}
                                    className="bg-amber-600 hover:bg-amber-700 text-white p-3 rounded-lg flex items-center gap-2 shadow-md transition-all active:scale-95"
                                    title="Calcular dívida baseada no histórico"
                                >
                                    <Calculator size={24} />
                                    <span className="text-sm font-bold leading-tight hidden sm:block">Calcular<br/>Papel</span>
                                </button>
                            )}
                       </div>

                       {/* Calculation Breakdown Preview */}
                       {calculatedTotal !== null && (
                           <div className="mt-2 bg-green-50 p-3 rounded border border-green-200 text-sm">
                               <p className="font-semibold text-green-800 mb-1 flex items-center gap-2">
                                   <CheckCircle size={14} />
                                   Cálculo Realizado com Sucesso
                               </p>
                               <p className="text-green-700">
                                   Período: <span className="font-bold">{calcDateFrom || 'Início'}</span> até <span className="font-bold">{calcDateTo || 'Hoje'}</span>
                               </p>
                               <p className="text-green-800 font-bold mt-1 text-lg">
                                   {calculatedDays} dias × €{calcDailyValue.toFixed(2)}/dia = €{calculatedTotal.toFixed(2)}
                               </p>
                           </div>
                       )}

                       {/* Payment Action */}
                       <button
                            type="button"
                            onClick={handleConfirmPayment}
                            disabled={!editingClientId || clientForm.currentBalance <= 0}
                            className="w-full mt-3 py-2 bg-green-600 disabled:bg-gray-300 text-white rounded-lg font-bold shadow hover:bg-green-700 transition-colors flex justify-center items-center gap-2"
                        >
                            <CreditCard size={18} />
                            Confirmar Recebimento (Zerar Dívida)
                        </button>
                        
                        {/* Botão Ver Consumo/Faturas */}
                        {editingClientId && (
                          <button 
                            type="button"
                            onClick={() => {
                              const history = getClientConsumptionHistory(editingClientId);
                              setConsumptionData(history);
                              setShowConsumptionModal(true);
                            }}
                            className="w-full mt-2 py-2 bg-purple-600 text-white rounded-lg font-bold shadow hover:bg-purple-700 transition-colors flex justify-center items-center gap-2"
                          >
                            <Receipt size={18} />
                            Ver Consumo / Faturas
                          </button>
                        )}
                    </div>

                    {/* Checkboxes Options */}
                    <div className="space-y-3 pt-4 border-t border-gray-100">
                        <label className={`flex items-center space-x-3 p-3 border rounded-lg transition-colors cursor-pointer ${clientForm.leaveReceipt ? 'bg-amber-50 border-amber-200' : 'border-gray-200 hover:bg-gray-50'}`}>
                          <input 
                            type="checkbox" 
                            className="w-5 h-5 text-amber-600 rounded border-gray-300 focus:ring-amber-500"
                            checked={clientForm.leaveReceipt || false}
                            onChange={e => setClientForm({...clientForm, leaveReceipt: e.target.checked})}
                          />
                          <div className="flex flex-col">
                             <div className="flex items-center space-x-2">
                                <FileText size={18} className={clientForm.leaveReceipt ? "text-amber-600" : "text-gray-500"}/>
                                <span className={`font-medium ${clientForm.leaveReceipt ? "text-amber-800" : "text-gray-700"}`}>Precisa deixar papel (Talão)?</span>
                             </div>
                             {clientForm.leaveReceipt && <span className="text-xs text-amber-600 pl-7">O sistema calculará o valor automaticamente.</span>}
                          </div>
                        </label>

                        <label className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="w-5 h-5 text-amber-600 rounded border-gray-300 focus:ring-amber-500"
                            checked={clientForm.acceptsReturns || false}
                            onChange={e => setClientForm({...clientForm, acceptsReturns: e.target.checked})}
                          />
                          <div className="flex items-center space-x-2">
                             <RotateCcw size={18} className="text-gray-500"/>
                             <span className="text-gray-700 font-medium">Aceita Devolução de Sobras?</span>
                          </div>
                        </label>
                    </div>

                  </div>
                )}

                {activeTab === 'falhas' && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                        <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                            <h4 className="font-bold text-red-800 mb-2 flex items-center gap-2">
                                <AlertCircle size={18} />
                                Registrar Falha de Entrega
                            </h4>
                            <p className="text-sm text-red-700 mb-4">
                                Marque os dias em que o cliente <strong>NÃO</strong> recebeu pão (ex: viajou, cancelou). 
                                Estes dias serão descontados automaticamente do cálculo do pagamento.
                            </p>
                            
                            <div className="flex gap-2 items-center">
                                <input 
                                    type="date" 
                                    className="p-2 border border-red-200 rounded bg-white text-gray-800"
                                    onChange={(e) => {
                                        if (e.target.value) handleToggleSkippedDate(e.target.value);
                                    }}
                                />
                                <span className="text-xs text-gray-500">Selecione para alternar (Falta / Normal)</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h5 className="font-semibold text-gray-700 text-sm">Histórico de Falhas (Dias descontados):</h5>
                            {clientForm.skippedDates && clientForm.skippedDates.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {clientForm.skippedDates.map(date => (
                                        <span key={date} className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full flex items-center gap-1 border border-red-200">
                                            {new Date(date).toLocaleDateString()}
                                            <button 
                                                type="button" 
                                                onClick={() => handleToggleSkippedDate(date)} 
                                                className="hover:text-red-950"
                                            >
                                                <X size={12} />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-400 italic">Nenhuma falha registrada recentemente.</p>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'precos' && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                     <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex items-start gap-3">
                        <Tag className="text-blue-600 mt-0.5" size={20} />
                        <div>
                           <h4 className="font-bold text-blue-800">Tabela de Preços</h4>
                           <p className="text-sm text-blue-700">Preços praticados para este cliente. Apenas o administrador pode alterar estes valores.</p>
                        </div>
                     </div>

                     <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                        <table className="w-full text-sm text-left">
                           <thead className="bg-gray-50 text-gray-600 font-semibold uppercase">
                              <tr>
                                 <th className="p-3 border-b">Produto</th>
                                 <th className="p-3 border-b text-right">Preço Efetivo</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-gray-100">
                              {products.map(product => {
                                 const customPrice = clientForm.customPrices?.[product.id];
                                 const hasCustomPrice = customPrice !== undefined;
                                 const effectivePrice = hasCustomPrice ? customPrice : product.price;

                                 return (
                                    <tr key={product.id} className="hover:bg-gray-50">
                                       <td className="p-3 text-gray-800 font-medium">{product.name}</td>
                                       <td className="p-3 text-right">
                                          <div className="flex items-center justify-end gap-2">
                                             {hasCustomPrice && (
                                                <span className="text-xs bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded border border-amber-200">Personalizado</span>
                                             )}
                                             <span className={`font-bold ${hasCustomPrice ? 'text-amber-700' : 'text-gray-700'}`}>
                                                € {effectivePrice.toFixed(2)}
                                             </span>
                                          </div>
                                       </td>
                                    </tr>
                                 )
                              })}
                           </tbody>
                        </table>
                     </div>
                  </div>
                )}

                {activeTab === 'ferias' && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                      <h4 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
                        <Plane size={18} />
                        Períodos de Férias
                      </h4>
                      <p className="text-sm text-blue-700 mb-4">
                        Configure os períodos em que o cliente está de férias. Durante esses dias, 
                        o cliente <strong>não aparecerá</strong> nas entregas do dia e <strong>não será cobrado</strong>.
                      </p>
                      
                      {/* Formulário para adicionar período */}
                      <div className="bg-white rounded-lg p-4 border border-blue-200 mb-4">
                        <h5 className="text-sm font-semibold text-gray-700 mb-3">Adicionar Novo Período</h5>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Data de Início</label>
                            <input
                              type="date"
                              value={vacationStartDate}
                              onChange={(e) => setVacationStartDate(e.target.value)}
                              className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Data de Fim</label>
                            <input
                              type="date"
                              value={vacationEndDate}
                              onChange={(e) => setVacationEndDate(e.target.value)}
                              className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Motivo (opcional)</label>
                            <input
                              type="text"
                              value={vacationReason}
                              onChange={(e) => setVacationReason(e.target.value)}
                              placeholder="Ex: Férias, Viagem..."
                              className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (!vacationStartDate || !vacationEndDate) {
                              alert('Por favor, selecione as datas de início e fim.');
                              return;
                            }
                            if (vacationEndDate < vacationStartDate) {
                              alert('A data de fim deve ser maior ou igual à data de início.');
                              return;
                            }
                            const newPeriod: VacationPeriod = {
                              id: Date.now().toString(),
                              startDate: vacationStartDate,
                              endDate: vacationEndDate,
                              reason: vacationReason || undefined,
                              createdAt: new Date().toISOString()
                            };
                            const currentPeriods = clientForm.vacationPeriods || [];
                            setClientForm({
                              ...clientForm,
                              vacationPeriods: [...currentPeriods, newPeriod]
                            });
                            // Limpar formulário
                            setVacationStartDate('');
                            setVacationEndDate('');
                            setVacationReason('');
                          }}
                          className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm font-medium"
                        >
                          <Plus size={16} />
                          Adicionar Período
                        </button>
                      </div>
                    </div>

                    {/* Lista de períodos existentes */}
                    <div className="space-y-2">
                      <h5 className="font-semibold text-gray-700 text-sm flex items-center gap-2">
                        <Calendar size={16} />
                        Períodos Programados
                      </h5>
                      {clientForm.vacationPeriods && clientForm.vacationPeriods.length > 0 ? (
                        <div className="space-y-2">
                          {clientForm.vacationPeriods
                            .sort((a, b) => a.startDate.localeCompare(b.startDate))
                            .map(period => {
                              const startDate = new Date(period.startDate);
                              const endDate = new Date(period.endDate);
                              const today = new Date();
                              today.setHours(0, 0, 0, 0);
                              
                              const isActive = today >= startDate && today <= endDate;
                              const isPast = endDate < today;
                              const isFuture = startDate > today;
                              
                              // Calcular duração
                              const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
                              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                              
                              let statusBadge = null;
                              let borderColor = 'border-gray-200';
                              let bgColor = 'bg-white';
                              
                              if (isActive) {
                                statusBadge = <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-medium">Em andamento</span>;
                                borderColor = 'border-green-300';
                                bgColor = 'bg-green-50';
                              } else if (isPast) {
                                statusBadge = <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">Passado</span>;
                              } else if (isFuture) {
                                statusBadge = <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-medium">Agendado</span>;
                                borderColor = 'border-blue-200';
                                bgColor = 'bg-blue-50/50';
                              }
                              
                              return (
                                <div
                                  key={period.id}
                                  className={`p-3 rounded-lg border ${borderColor} ${bgColor} flex items-center justify-between`}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isActive ? 'bg-green-200' : isFuture ? 'bg-blue-200' : 'bg-gray-200'}`}>
                                      <Plane size={18} className={isActive ? 'text-green-700' : isFuture ? 'text-blue-700' : 'text-gray-600'} />
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium text-gray-800">
                                          {startDate.toLocaleDateString('pt-PT')} - {endDate.toLocaleDateString('pt-PT')}
                                        </span>
                                        {statusBadge}
                                      </div>
                                      <div className="flex items-center gap-2 text-sm text-gray-500">
                                        <span>{diffDays} dia{diffDays > 1 ? 's' : ''}</span>
                                        {period.reason && (
                                          <>
                                            <span>•</span>
                                            <span>{period.reason}</span>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updatedPeriods = (clientForm.vacationPeriods || []).filter(p => p.id !== period.id);
                                      setClientForm({
                                        ...clientForm,
                                        vacationPeriods: updatedPeriods
                                      });
                                    }}
                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Remover período"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </div>
                              );
                            })}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                          <Plane size={32} className="mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Nenhum período de férias cadastrado</p>
                          <p className="text-xs mt-1">Adicione períodos acima para que o cliente não apareça nas entregas</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'obs' && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Observações Gerais</label>
                    <textarea 
                      rows={6}
                      className="w-full p-2.5 border border-gray-300 rounded-lg bg-white text-gray-900"
                      value={clientForm.notes || ''}
                      onChange={e => setClientForm({...clientForm, notes: e.target.value})}
                      placeholder="Anote aqui preferências do cliente, código da porta, etc."
                    />
                  </div>
                )}

              </form>
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end space-x-3 rounded-b-xl">
              <button 
                type="button"
                onClick={() => setIsClientModalOpen(false)}
                className="px-5 py-2.5 text-gray-600 hover:bg-white hover:text-gray-800 border border-transparent hover:border-gray-300 rounded-lg transition-all font-medium"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                form="client-form"
                className="px-5 py-2.5 bg-amber-700 text-white rounded-lg hover:bg-amber-800 shadow-md flex items-center space-x-2 font-medium transition-all"
              >
                <Save size={18} />
                <span>Salvar Cliente</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Consumo/Faturas */}
      {showConsumptionModal && consumptionData && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={() => setShowConsumptionModal(false)}>
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

              {/* Faturas Pagas (colapsável) */}
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
                    As entregas aparecerão aqui quando forem realizadas através de "Entregas do Dia".
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
