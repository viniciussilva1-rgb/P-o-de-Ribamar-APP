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
  Eye
} from 'lucide-react';

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
    getRoutesByDriver
  } = useData();

  const [activeSection, setActiveSection] = useState<'payments' | 'fund' | 'closure'>('payments');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Fundo de Caixa States
  const [fundAmount, setFundAmount] = useState<number>(0);
  const [fundObservations, setFundObservations] = useState('');
  const [savingFund, setSavingFund] = useState(false);
  
  // Fecho Diário States
  const [countedAmount, setCountedAmount] = useState<number>(0);
  const [closureObservations, setClosureObservations] = useState('');
  const [savingClosure, setSavingClosure] = useState(false);
  
  // Payment Registration States
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedClientForPayment, setSelectedClientForPayment] = useState<string>('');
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('Dinheiro');
  const [savingPayment, setSavingPayment] = useState(false);

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
      setFundAmount(cashFund.initialAmount);
      setFundObservations(cashFund.observations || '');
    } else {
      setFundAmount(0);
      setFundObservations('');
    }
  }, [cashFund]);

  // Inicializar valores do fecho se existir
  React.useEffect(() => {
    if (dailyClosure) {
      setCountedAmount(dailyClosure.countedAmount);
      setClosureObservations(dailyClosure.observations || '');
    } else {
      setCountedAmount(0);
      setClosureObservations('');
    }
  }, [dailyClosure]);

  const handleSaveFund = async () => {
    setSavingFund(true);
    try {
      await saveDailyCashFund(driverId, selectedDate, fundAmount, fundObservations || undefined);
      alert('Fundo de caixa salvo com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar fundo:', error);
      alert('Erro ao salvar fundo de caixa');
    } finally {
      setSavingFund(false);
    }
  };

  const handleSaveClosure = async () => {
    setSavingClosure(true);
    try {
      await saveDailyDriverClosure(driverId, selectedDate, countedAmount, closureObservations || undefined);
      alert('Fecho diário salvo com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar fecho:', error);
      alert('Erro ao salvar fecho diário');
    } finally {
      setSavingClosure(false);
    }
  };

  const handleRegisterPayment = async () => {
    if (!selectedClientForPayment || paymentAmount <= 0) {
      alert('Selecione um cliente e informe o valor');
      return;
    }
    
    setSavingPayment(true);
    try {
      await registerDailyPayment(driverId, selectedClientForPayment, paymentAmount, paymentMethod);
      alert('Pagamento registrado com sucesso!');
      setShowPaymentModal(false);
      setSelectedClientForPayment('');
      setPaymentAmount(0);
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
  const difference = countedAmount - expectedCash;

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
                    type="number"
                    step="0.01"
                    min="0"
                    value={fundAmount}
                    onChange={(e) => setFundAmount(parseFloat(e.target.value) || 0)}
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
                  type="number"
                  step="0.01"
                  min="0"
                  value={countedAmount}
                  onChange={(e) => setCountedAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent text-lg"
                  placeholder="0.00"
                />
              </div>

              {/* Resultado */}
              {countedAmount > 0 && (
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
        </div>
      </div>

      {/* Modal de Registro de Pagamento */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-800">Registrar Pagamento</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cliente
              </label>
              <select
                value={selectedClientForPayment}
                onChange={(e) => setSelectedClientForPayment(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
              >
                <option value="">Selecione um cliente</option>
                {clientSummaries.map(client => (
                  <option key={client.clientId} value={client.clientId}>
                    {client.clientName} ({client.routeName || 'Sem rota'})
                    {client.totalDebt > 0 && ` - Deve: ${formatCurrency(client.totalDebt)}`}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Valor (€)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                placeholder="0.00"
              />
            </div>
            
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
                    className={`py-2 px-3 rounded-lg border-2 transition-colors ${
                      paymentMethod === method
                        ? 'border-amber-500 bg-amber-50 text-amber-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleRegisterPayment}
                disabled={savingPayment || !selectedClientForPayment || paymentAmount <= 0}
                className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {savingPayment ? 'Salvando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverCashBox;
