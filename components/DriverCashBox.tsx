import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { 
  Wallet, 
  Users, 
  Calculator, 
  CheckCircle, 
  AlertTriangle, 
  TrendingUp,
  TrendingDown,
  Minus,
  CreditCard,
  Banknote,
  Smartphone,
  ArrowRightLeft,
  Calendar,
  MapPin,
  Clock,
  Save,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Eye,
  Search,
  X
} from 'lucide-react';

// Função para normalizar texto (remover acentos)
const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

const DriverCashBox: React.FC = () => {
  const { currentUser } = useAuth();
  const { 
    getClientPaymentSummaries,
    getDailyPaymentsByDriver,
    getDailyCashFund,
    saveDailyCashFund,
    getDailyDriverClosure,
    saveDailyDriverClosure,
    calculateDailyClosureData,
    registerDailyPayment,
    routes,
    getRoutesByDriver,
    dailyDriverClosures,
    dailyCashFunds,
    dailyPaymentsReceived
  } = useData();

  const [activeSection, setActiveSection] = useState<'payments' | 'fund' | 'closure' | 'history'>('payments');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Fundo de Caixa States
  const [fundAmount, setFundAmount] = useState<string>('');
  const [fundObservations, setFundObservations] = useState('');
  const [savingFund, setSavingFund] = useState(false);
  
  // Fecho Diário States
  const [countedAmount, setCountedAmount] = useState<string>('');
  const [closureObservations, setClosureObservations] = useState('');
  const [savingClosure, setSavingClosure] = useState(false);
  
  // Payment Registration States
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedClientForPayment, setSelectedClientForPayment] = useState<string>('');
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('Dinheiro');
  const [paidUntilDate, setPaidUntilDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [savingPayment, setSavingPayment] = useState(false);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);

  // Expandable route sections
  const [expandedRoutes, setExpandedRoutes] = useState<Set<string>>(new Set());

  if (!currentUser) return null;

  const driverId = currentUser.id;
  const today = new Date().toISOString().split('T')[0];
  
  // Dados
  const myRoutes = getRoutesByDriver(driverId);
  const clientSummaries = getClientPaymentSummaries(driverId);
  const todayPayments = getDailyPaymentsByDriver(driverId, selectedDate);
  const cashFund = getDailyCashFund(driverId, selectedDate);
  const dailyClosure = getDailyDriverClosure(driverId, selectedDate);
  const closureData = calculateDailyClosureData(driverId, selectedDate);

  // Agrupar clientes por rota
  const clientsByRoute = useMemo(() => {
    const grouped = new Map<string, typeof clientSummaries>();
    
    clientSummaries.forEach(client => {
      const routeId = client.routeId || 'sem-rota';
      const existing = grouped.get(routeId) || [];
      grouped.set(routeId, [...existing, client]);
    });
    
    return grouped;
  }, [clientSummaries]);

  // Inicializar valores do fundo se existir
  React.useEffect(() => {
    if (cashFund) {
      setFundAmount(cashFund.initialAmount.toString());
      setFundObservations(cashFund.observations || '');
    } else {
      setFundAmount('');
      setFundObservations('');
    }
  }, [cashFund]);

  // Inicializar valores do fecho se existir
  React.useEffect(() => {
    if (dailyClosure) {
      setCountedAmount(dailyClosure.countedAmount.toString());
      setClosureObservations(dailyClosure.observations || '');
    } else {
      setCountedAmount('');
      setClosureObservations('');
    }
  }, [dailyClosure]);

  const handleSaveFund = async () => {
    const amount = parseFloat(fundAmount) || 0;
    if (amount < 0) {
      alert('O valor não pode ser negativo');
      return;
    }
    
    setSavingFund(true);
    try {
      await saveDailyCashFund(driverId, selectedDate, amount, fundObservations || undefined);
      alert('Fundo de caixa salvo com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar fundo:', error);
      alert('Erro ao salvar fundo de caixa');
    } finally {
      setSavingFund(false);
    }
  };

  const handleSaveClosure = async () => {
    const amount = parseFloat(countedAmount) || 0;
    if (amount < 0) {
      alert('O valor não pode ser negativo');
      return;
    }
    
    setSavingClosure(true);
    try {
      await saveDailyDriverClosure(driverId, selectedDate, amount, closureObservations || undefined);
      alert('Fecho diário salvo com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar fecho:', error);
      alert('Erro ao salvar fecho diário');
    } finally {
      setSavingClosure(false);
    }
  };

  const handleRegisterPayment = async () => {
    const amount = parseFloat(paymentAmount) || 0;
    if (!selectedClientForPayment || amount <= 0) {
      alert('Selecione um cliente e informe o valor');
      return;
    }
    
    setSavingPayment(true);
    try {
      await registerDailyPayment(driverId, selectedClientForPayment, amount, paymentMethod, paidUntilDate);
      alert('Pagamento registrado com sucesso!');
      setShowPaymentModal(false);
      setSelectedClientForPayment('');
      setClientSearchTerm('');
      setPaymentAmount('');
      setPaidUntilDate(new Date().toISOString().split('T')[0]);
    } catch (error) {
      console.error('Erro ao registrar pagamento:', error);
      alert('Erro ao registrar pagamento');
    } finally {
      setSavingPayment(false);
    }
  };

  const toggleRoute = (routeId: string) => {
    const newExpanded = new Set(expandedRoutes);
    if (newExpanded.has(routeId)) {
      newExpanded.delete(routeId);
    } else {
      newExpanded.add(routeId);
    }
    setExpandedRoutes(newExpanded);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-PT');
  };

  // Calcular totais do dia
  const totalReceivedToday = todayPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalCashToday = todayPayments.filter(p => p.method === 'Dinheiro').reduce((sum, p) => sum + p.amount, 0);
  const totalMbwayToday = todayPayments.filter(p => p.method === 'MBWay').reduce((sum, p) => sum + p.amount, 0);
  const totalTransferToday = todayPayments.filter(p => p.method === 'Transferência').reduce((sum, p) => sum + p.amount, 0);

  // Calcular diferença do fecho
  const expectedCash = (cashFund?.initialAmount || 0) + totalCashToday;
  const parsedCountedAmount = parseFloat(countedAmount) || 0;
  const difference = parsedCountedAmount - expectedCash;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Wallet className="text-amber-600" />
            Caixa do Entregador
          </h2>
          <p className="text-gray-500">Controle de pagamentos e fecho diário</p>
        </div>
        
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
          <button
            onClick={() => setSelectedDate(today)}
            className="px-3 py-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* Resumo Rápido */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase">Total Recebido</p>
              <p className="text-xl font-bold text-gray-800">{formatCurrency(totalReceivedToday)}</p>
            </div>
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="text-green-600" size={20} />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase">Dinheiro</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(totalCashToday)}</p>
            </div>
            <div className="p-2 bg-green-100 rounded-lg">
              <Banknote className="text-green-600" size={20} />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase">MBWay</p>
              <p className="text-xl font-bold text-blue-600">{formatCurrency(totalMbwayToday)}</p>
            </div>
            <div className="p-2 bg-blue-100 rounded-lg">
              <Smartphone className="text-blue-600" size={20} />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase">Transferência</p>
              <p className="text-xl font-bold text-purple-600">{formatCurrency(totalTransferToday)}</p>
            </div>
            <div className="p-2 bg-purple-100 rounded-lg">
              <ArrowRightLeft className="text-purple-600" size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs de Navegação */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveSection('payments')}
            className={`flex-1 py-4 px-6 text-sm font-medium transition-colors ${
              activeSection === 'payments'
                ? 'bg-amber-50 text-amber-700 border-b-2 border-amber-500'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Users size={18} />
              <span>Pagamentos dos Clientes</span>
            </div>
          </button>
          <button
            onClick={() => setActiveSection('fund')}
            className={`flex-1 py-4 px-6 text-sm font-medium transition-colors ${
              activeSection === 'fund'
                ? 'bg-amber-50 text-amber-700 border-b-2 border-amber-500'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Wallet size={18} />
              <span>Fundo de Caixa</span>
            </div>
          </button>
          <button
            onClick={() => setActiveSection('closure')}
            className={`flex-1 py-4 px-6 text-sm font-medium transition-colors ${
              activeSection === 'closure'
                ? 'bg-amber-50 text-amber-700 border-b-2 border-amber-500'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Calculator size={18} />
              <span>Fecho Diário</span>
            </div>
          </button>
          <button
            onClick={() => setActiveSection('history')}
            className={`flex-1 py-4 px-6 text-sm font-medium transition-colors ${
              activeSection === 'history'
                ? 'bg-amber-50 text-amber-700 border-b-2 border-amber-500'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Clock size={18} />
              <span>Histórico</span>
            </div>
          </button>
        </div>

        <div className="p-6">
          {/* ===== PAGAMENTOS DOS CLIENTES ===== */}
          {activeSection === 'payments' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-800">Pagamentos dos Clientes</h3>
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <CreditCard size={18} />
                  Registrar Pagamento
                </button>
              </div>

              {/* Lista por Rota */}
              {Array.from(clientsByRoute.entries()).map(([routeId, clients]) => {
                const route = myRoutes.find(r => r.id === routeId);
                const routeName = route?.name || 'Sem Rota';
                const isExpanded = expandedRoutes.has(routeId);
                const routeTotal = clients.reduce((sum, c) => sum + (c.todayPayment || 0), 0);
                
                return (
                  <div key={routeId} className="border border-gray-200 rounded-xl overflow-hidden">
                    <button
                      onClick={() => toggleRoute(routeId)}
                      className="w-full px-4 py-3 bg-gray-50 flex items-center justify-between hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <MapPin size={18} className="text-amber-600" />
                        <span className="font-medium text-gray-800">{routeName}</span>
                        <span className="text-sm text-gray-500">({clients.length} clientes)</span>
                      </div>
                      <div className="flex items-center gap-4">
                        {routeTotal > 0 && (
                          <span className="text-green-600 font-medium">{formatCurrency(routeTotal)} hoje</span>
                        )}
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </div>
                    </button>
                    
                    {isExpanded && (
                      <div className="divide-y divide-gray-100">
                        {clients.map(client => (
                          <div key={client.clientId} className="px-4 py-3 hover:bg-gray-50">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                              <div className="flex-1">
                                <p className="font-medium text-gray-800">{client.clientName}</p>
                                <div className="flex flex-wrap gap-4 text-sm text-gray-500 mt-1">
                                  <span className="flex items-center gap-1">
                                    <Clock size={14} />
                                    Último pag.: {formatDate(client.lastPaymentDate)}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Calendar size={14} />
                                    Pago até: {formatDate(client.paidUntil)}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <CreditCard size={14} />
                                    {client.paymentMethod}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                {client.todayPayment && client.todayPayment > 0 ? (
                                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                                    +{formatCurrency(client.todayPayment)}
                                  </span>
                                ) : client.totalDebt > 0 ? (
                                  <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
                                    Deve: {formatCurrency(client.totalDebt)}
                                  </span>
                                ) : (
                                  <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-full text-sm">
                                    Em dia
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {clientsByRoute.size === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <Users size={48} className="mx-auto mb-4 opacity-50" />
                  <p>Nenhum cliente encontrado</p>
                </div>
              )}
            </div>
          )}

          {/* ===== FUNDO DE CAIXA ===== */}
          {activeSection === 'fund' && (
            <div className="space-y-6 max-w-xl">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Fundo de Caixa</h3>
                <p className="text-sm text-gray-500">
                  Registre o valor inicial que você está levando hoje. Este valor é único para o dia e serve para todas as rotas.
                </p>
              </div>

              {cashFund && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle size={20} />
                    <span className="font-medium">Fundo registrado para {formatDate(selectedDate)}</span>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Valor Inicial do Fundo de Caixa (€)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*[.,]?[0-9]*"
                    value={fundAmount}
                    onChange={(e) => {
                      const val = e.target.value.replace(',', '.');
                      if (val === '' || /^\d*\.?\d*$/.test(val)) {
                        setFundAmount(val);
                      }
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent text-lg"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Observações (opcional)
                  </label>
                  <textarea
                    value={fundObservations}
                    onChange={(e) => setFundObservations(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    rows={3}
                    placeholder="Notas sobre o fundo de caixa..."
                  />
                </div>

                <button
                  onClick={handleSaveFund}
                  disabled={savingFund}
                  className="w-full py-3 bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {savingFund ? (
                    <>
                      <RefreshCw size={18} className="animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      Salvar Fundo de Caixa
                    </>
                  )}
                </button>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <p className="text-sm text-blue-700">
                  <strong>Nota:</strong> O fundo de caixa não entra no cálculo do fecho semanal com o administrador. 
                  É apenas para seu controle pessoal diário.
                </p>
              </div>
            </div>
          )}

          {/* ===== FECHO DIÁRIO ===== */}
          {activeSection === 'closure' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Fecho Diário</h3>
                <p className="text-sm text-gray-500">
                  Conte o dinheiro no final do dia e confira se bate com o esperado.
                </p>
              </div>

              {/* Resumo Calculado */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500 mb-1">Fundo de Caixa</p>
                  <p className="text-xl font-bold text-gray-800">{formatCurrency(cashFund?.initialAmount || 0)}</p>
                </div>
                <div className="p-4 bg-green-50 rounded-xl">
                  <p className="text-sm text-gray-500 mb-1">Recebido em Dinheiro</p>
                  <p className="text-xl font-bold text-green-600">{formatCurrency(totalCashToday)}</p>
                </div>
              </div>

              <div className="p-4 bg-amber-50 border-2 border-amber-200 rounded-xl">
                <p className="text-sm text-amber-600 mb-1">Valor Esperado no Caixa</p>
                <p className="text-2xl font-bold text-amber-700">{formatCurrency(expectedCash)}</p>
                <p className="text-xs text-amber-600 mt-1">
                  (Fundo {formatCurrency(cashFund?.initialAmount || 0)} + Dinheiro {formatCurrency(totalCashToday)})
                </p>
              </div>

              {/* Totais por Rota */}
              {closureData.routeTotals.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">Recebido por Rota</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {closureData.routeTotals.map(rt => (
                      <div key={rt.routeId} className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500">{rt.routeName}</p>
                        <p className="text-lg font-semibold text-gray-800">{formatCurrency(rt.totalReceived)}</p>
                        <p className="text-xs text-gray-400">{rt.clientCount} clientes</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Campo de Contagem */}
              <div className="max-w-md">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Valor Contado no Caixa (€)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9]*[.,]?[0-9]*"
                  value={countedAmount}
                  onChange={(e) => {
                    const val = e.target.value.replace(',', '.');
                    if (val === '' || /^\d*\.?\d*$/.test(val)) {
                      setCountedAmount(val);
                    }
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent text-lg"
                  placeholder="0.00"
                />
              </div>

              {/* Resultado */}
              {countedAmount !== '' && parseFloat(countedAmount) > 0 && (
                <div className={`p-4 rounded-xl border-2 ${
                  Math.abs(difference) < 0.01 
                    ? 'bg-green-50 border-green-300' 
                    : difference > 0 
                      ? 'bg-blue-50 border-blue-300'
                      : 'bg-red-50 border-red-300'
                }`}>
                  <div className="flex items-center gap-3">
                    {Math.abs(difference) < 0.01 ? (
                      <>
                        <CheckCircle size={32} className="text-green-600" />
                        <div>
                          <p className="text-lg font-bold text-green-700">Bateu Certo! ✓</p>
                          <p className="text-sm text-green-600">O caixa está correto</p>
                        </div>
                      </>
                    ) : difference > 0 ? (
                      <>
                        <TrendingUp size={32} className="text-blue-600" />
                        <div>
                          <p className="text-lg font-bold text-blue-700">Sobra: {formatCurrency(difference)}</p>
                          <p className="text-sm text-blue-600">Há mais dinheiro do que o esperado</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <TrendingDown size={32} className="text-red-600" />
                        <div>
                          <p className="text-lg font-bold text-red-700">Falta: {formatCurrency(Math.abs(difference))}</p>
                          <p className="text-sm text-red-600">Faltam {formatCurrency(Math.abs(difference))} no caixa</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Observações */}
              <div className="max-w-md">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Observações (opcional)
                </label>
                <textarea
                  value={closureObservations}
                  onChange={(e) => setClosureObservations(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  rows={3}
                  placeholder="Observações sobre o fecho do dia..."
                />
              </div>

              <button
                onClick={handleSaveClosure}
                disabled={savingClosure || countedAmount <= 0}
                className="w-full max-w-md py-3 bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {savingClosure ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Salvar Fecho Diário
                  </>
                )}
              </button>

              {dailyClosure && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2">
                  <CheckCircle size={20} className="text-green-600" />
                  <span className="text-green-700">
                    Fecho registrado em {new Date(dailyClosure.updatedAt).toLocaleString('pt-PT')}
                  </span>
                </div>
              )}

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <p className="text-sm text-blue-700">
                  <strong>Nota:</strong> Este fecho diário é apenas para seu controle pessoal. 
                  Não interfere no fecho semanal oficial com o administrador.
                </p>
              </div>
            </div>
          )}

          {/* ===== HISTÓRICO ===== */}
          {activeSection === 'history' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-800">Histórico de Caixa</h3>
              
              {/* Lista de Histórico */}
              {(() => {
                // Filtrar fechos deste entregador e ordenar por data decrescente
                const myClosures = dailyDriverClosures
                  .filter(c => c.driverId === driverId)
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .slice(0, 30); // Últimos 30 dias
                
                if (myClosures.length === 0) {
                  return (
                    <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                      <Clock size={48} className="mx-auto text-gray-300 mb-3" />
                      <p className="text-gray-500">Nenhum fecho registrado ainda</p>
                      <p className="text-sm text-gray-400">Os registros aparecerão aqui após salvar um fecho diário</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    {myClosures.map(closure => {
                      // Buscar fundo de caixa do mesmo dia
                      const fundOfDay = dailyCashFunds.find(f => f.driverId === driverId && f.date === closure.date);
                      // Buscar pagamentos do dia
                      const paymentsOfDay = dailyPaymentsReceived.filter(p => p.driverId === driverId && p.date === closure.date);
                      const totalReceived = paymentsOfDay.reduce((sum, p) => sum + p.amount, 0);
                      const cashReceived = paymentsOfDay.filter(p => p.method === 'Dinheiro').reduce((sum, p) => sum + p.amount, 0);
                      
                      const expectedCash = (fundOfDay?.initialAmount || 0) + cashReceived;
                      const diff = closure.countedAmount - expectedCash;
                      
                      const formattedDate = new Date(closure.date + 'T12:00:00').toLocaleDateString('pt-PT', {
                        weekday: 'short',
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      });

                      return (
                        <div key={closure.id} className="bg-white border border-gray-200 rounded-xl p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Calendar size={18} className="text-amber-600" />
                              <span className="font-semibold text-gray-800">{formattedDate}</span>
                            </div>
                            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                              diff === 0 
                                ? 'bg-green-100 text-green-700' 
                                : diff > 0 
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-red-100 text-red-700'
                            }`}>
                              {diff === 0 ? 'OK' : diff > 0 ? `+${formatCurrency(diff)}` : formatCurrency(diff)}
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                            <div className="bg-gray-50 rounded-lg p-2">
                              <span className="text-gray-500 block text-xs">Fundo</span>
                              <span className="font-semibold text-gray-800">{formatCurrency(fundOfDay?.initialAmount || 0)}</span>
                            </div>
                            <div className="bg-green-50 rounded-lg p-2">
                              <span className="text-green-600 block text-xs">Recebido (Din.)</span>
                              <span className="font-semibold text-green-700">{formatCurrency(cashReceived)}</span>
                            </div>
                            <div className="bg-blue-50 rounded-lg p-2">
                              <span className="text-blue-600 block text-xs">Esperado</span>
                              <span className="font-semibold text-blue-700">{formatCurrency(expectedCash)}</span>
                            </div>
                            <div className="bg-amber-50 rounded-lg p-2">
                              <span className="text-amber-600 block text-xs">Contado</span>
                              <span className="font-semibold text-amber-700">{formatCurrency(closure.countedAmount)}</span>
                            </div>
                          </div>
                          
                          {closure.observations && (
                            <p className="mt-3 text-sm text-gray-600 italic border-t border-gray-100 pt-2">
                              📝 {closure.observations}
                            </p>
                          )}
                          
                          {/* Total recebido no dia (todos os métodos) */}
                          {totalReceived > 0 && totalReceived !== cashReceived && (
                            <p className="mt-2 text-xs text-gray-500">
                              Total recebido (todos os métodos): {formatCurrency(totalReceived)}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Registro de Pagamento */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-800">Registrar Pagamento</h3>
              <button 
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedClientForPayment('');
                  setClientSearchTerm('');
                }}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              {/* Busca de Cliente */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Buscar Cliente
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                  <input
                    type="text"
                    value={clientSearchTerm}
                    onChange={(e) => {
                      setClientSearchTerm(e.target.value);
                      setShowClientSuggestions(true);
                      if (e.target.value === '') {
                        setSelectedClientForPayment('');
                      }
                    }}
                    onFocus={() => setShowClientSuggestions(true)}
                    placeholder="Digite o nome do cliente..."
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                  
                  {/* Sugestões de clientes */}
                  {showClientSuggestions && clientSearchTerm.length >= 1 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 max-h-60 overflow-y-auto">
                      {clientSummaries
                        .filter(c => normalizeText(c.clientName).includes(normalizeText(clientSearchTerm)))
                        .slice(0, 10)
                        .map(client => (
                          <button
                            key={client.clientId}
                            type="button"
                            className={`w-full px-4 py-3 text-left hover:bg-amber-50 border-b border-gray-100 last:border-0 transition-colors ${
                              selectedClientForPayment === client.clientId ? 'bg-amber-50' : ''
                            }`}
                            onClick={() => {
                              setSelectedClientForPayment(client.clientId);
                              setClientSearchTerm(client.clientName);
                              setShowClientSuggestions(false);
                              // Auto-preencher data pago até baseado na frequência
                              const today = new Date();
                              if (client.paymentFrequency === 'Semanal') {
                                const nextWeek = new Date(today);
                                nextWeek.setDate(today.getDate() + 7);
                                setPaidUntilDate(nextWeek.toISOString().split('T')[0]);
                              } else if (client.paymentFrequency === 'Mensal') {
                                const nextMonth = new Date(today);
                                nextMonth.setMonth(today.getMonth() + 1);
                                setPaidUntilDate(nextMonth.toISOString().split('T')[0]);
                              } else if (client.paymentFrequency === 'Personalizado' && client.paymentCustomDays) {
                                const customDate = new Date(today);
                                customDate.setDate(today.getDate() + client.paymentCustomDays);
                                setPaidUntilDate(customDate.toISOString().split('T')[0]);
                              } else {
                                setPaidUntilDate(today.toISOString().split('T')[0]);
                              }
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="font-medium text-gray-800">{client.clientName}</span>
                                <div className="text-xs text-gray-500 mt-0.5">
                                  {client.routeName || 'Sem rota'} • {client.paymentFrequency}
                                </div>
                              </div>
                              {client.totalDebt > 0 && (
                                <span className="text-sm text-amber-600 font-medium">
                                  {formatCurrency(client.totalDebt)}
                                </span>
                              )}
                            </div>
                          </button>
                        ))}
                      {clientSummaries.filter(c => normalizeText(c.clientName).includes(normalizeText(clientSearchTerm))).length === 0 && (
                        <div className="px-4 py-3 text-gray-500 text-sm text-center">
                          Nenhum cliente encontrado
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Info do cliente selecionado */}
              {selectedClientForPayment && (() => {
                const selectedClient = clientSummaries.find(c => c.clientId === selectedClientForPayment);
                if (!selectedClient) return null;
                return (
                  <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-amber-800">{selectedClient.clientName}</span>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        selectedClient.paymentFrequency === 'Diário' ? 'bg-blue-100 text-blue-700' :
                        selectedClient.paymentFrequency === 'Semanal' ? 'bg-green-100 text-green-700' :
                        selectedClient.paymentFrequency === 'Mensal' ? 'bg-purple-100 text-purple-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {selectedClient.paymentFrequency}
                        {selectedClient.paymentFrequency === 'Personalizado' && selectedClient.paymentCustomDays && 
                          ` (${selectedClient.paymentCustomDays} dias)`
                        }
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="text-gray-600">
                        <Clock size={14} className="inline mr-1" />
                        Último pag.: {formatDate(selectedClient.lastPaymentDate)}
                      </div>
                      <div className="text-gray-600">
                        <Calendar size={14} className="inline mr-1" />
                        Pago até: {formatDate(selectedClient.paidUntil)}
                      </div>
                    </div>
                    {selectedClient.totalDebt > 0 && (
                      <div className="mt-2 pt-2 border-t border-amber-200">
                        <span className="text-amber-700 font-medium">
                          Valor em aberto: {formatCurrency(selectedClient.totalDebt)}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}
              
              {/* Valor */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Valor Recebido (€)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9]*[.,]?[0-9]*"
                  value={paymentAmount}
                  onChange={(e) => {
                    const val = e.target.value.replace(',', '.');
                    if (val === '' || /^\d*\.?\d*$/.test(val)) {
                      setPaymentAmount(val);
                    }
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent text-lg font-semibold"
                  placeholder="0.00"
                />
              </div>

              {/* Data Pago Até - Só mostra se não for pagamento diário */}
              {selectedClientForPayment && (() => {
                const selectedClient = clientSummaries.find(c => c.clientId === selectedClientForPayment);
                if (!selectedClient || selectedClient.paymentFrequency === 'Diário') return null;
                return (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pago Até (Data)
                    </label>
                    <p className="text-xs text-gray-500 mb-2">
                      Este cliente paga {selectedClient.paymentFrequency.toLowerCase()}. 
                      Selecione até quando fica pago.
                    </p>
                    <input
                      type="date"
                      value={paidUntilDate}
                      onChange={(e) => setPaidUntilDate(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>
                );
              })()}
              
              {/* Método de Pagamento */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Método de Pagamento
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['Dinheiro', 'MBWay', 'Transferência', 'Cartão'].map(method => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`py-3 px-4 rounded-xl border-2 transition-colors flex items-center justify-center gap-2 ${
                        paymentMethod === method
                          ? 'border-amber-500 bg-amber-50 text-amber-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {method === 'Dinheiro' && <Banknote size={18} />}
                      {method === 'MBWay' && <Smartphone size={18} />}
                      {method === 'Transferência' && <ArrowRightLeft size={18} />}
                      {method === 'Cartão' && <CreditCard size={18} />}
                      {method}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Botões de ação */}
            <div className="p-6 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedClientForPayment('');
                  setClientSearchTerm('');
                }}
                className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleRegisterPayment}
                disabled={savingPayment || !selectedClientForPayment || paymentAmount <= 0}
                className="flex-1 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {savingPayment ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <CheckCircle size={18} />
                    Confirmar Pagamento
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

export default DriverCashBox;
