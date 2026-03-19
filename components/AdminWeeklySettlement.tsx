import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { WeeklyDriverSettlement } from '../types';
import { 
  Calculator,
  Users,
  Calendar,
  CheckCircle,
  Clock,
  Banknote,
  Smartphone,
  ArrowRightLeft,
  MapPin,
  TrendingUp,
  TrendingDown,
  FileText,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  RefreshCw,
  Check,
  X,
  History,
  Eye,
  Trash2,
  Loader2
} from 'lucide-react';

const AdminWeeklySettlement: React.FC = () => {
  const { currentUser } = useAuth();
  const { 
    getDrivers,
    calculateWeeklySettlement,
    getWeeklySettlement,
    confirmWeeklySettlement,
    cancelWeeklySettlement,
    getSettlementHistory,
    getLastConfirmedSettlement,
    routes
  } = useData();

  // Hoje
  const today = new Date().toISOString().split('T')[0];

  const [expandedDriver, setExpandedDriver] = useState<string | null>(null);
  const [confirmingSettlement, setConfirmingSettlement] = useState<string | null>(null);
  const [showingHistory, setShowingHistory] = useState<string | null>(null);
  const [selectedSettlement, setSelectedSettlement] = useState<WeeklyDriverSettlement | null>(null);
  const [settlementObservations, setSettlementObservations] = useState('');
  const [loading, setLoading] = useState(false);
  const [cancellingSettlementId, setCancellingSettlementId] = useState<string | null>(null);
  
  // Estados para contagem detalhada do dinheiro entregue
  const [deliveredAmount, setDeliveredAmount] = useState<string>('');
  const [showDetailedCount, setShowDetailedCount] = useState(false);
  const [coinCounts, setCoinCounts] = useState({
    cent1: 0, cent2: 0, cent5: 0, cent10: 0, cent20: 0, cent50: 0, euro1: 0, euro2: 0
  });
  const [noteCounts, setNoteCounts] = useState({
    note5: 0, note10: 0, note20: 0, note50: 0, note100: 0, note200: 0, note500: 0
  });
  
  // Cálculo de moedas
  const totalCoins = useMemo(() => {
    return (
      coinCounts.cent1 * 0.01 +
      coinCounts.cent2 * 0.02 +
      coinCounts.cent5 * 0.05 +
      coinCounts.cent10 * 0.10 +
      coinCounts.cent20 * 0.20 +
      coinCounts.cent50 * 0.50 +
      coinCounts.euro1 * 1.00 +
      coinCounts.euro2 * 2.00
    );
  }, [coinCounts]);
  
  // Cálculo de notas
  const totalNotes = useMemo(() => {
    return (
      noteCounts.note5 * 5 +
      noteCounts.note10 * 10 +
      noteCounts.note20 * 20 +
      noteCounts.note50 * 50 +
      noteCounts.note100 * 100 +
      noteCounts.note200 * 200 +
      noteCounts.note500 * 500
    );
  }, [noteCounts]);
  
  // Total calculado de moedas + notas
  const calculatedTotal = useMemo(() => {
    return totalCoins + totalNotes;
  }, [totalCoins, totalNotes]);
  
  // Atualizar o valor total quando contagem detalhada muda
  React.useEffect(() => {
    if (showDetailedCount && calculatedTotal > 0) {
      setDeliveredAmount(calculatedTotal.toFixed(2));
    }
  }, [calculatedTotal, showDetailedCount]);
  
  // Resetar estados quando fecha o formulário de confirmação
  const resetConfirmationForm = () => {
    setConfirmingSettlement(null);
    setSettlementObservations('');
    setDeliveredAmount('');
    setShowDetailedCount(false);
    setCoinCounts({ cent1: 0, cent2: 0, cent5: 0, cent10: 0, cent20: 0, cent50: 0, euro1: 0, euro2: 0 });
    setNoteCounts({ note5: 0, note10: 0, note20: 0, note50: 0, note100: 0, note200: 0, note500: 0 });
  };

  if (!currentUser) return null;

  const drivers = getDrivers();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-PT', { 
      day: '2-digit', 
      month: 'short' 
    });
  };

  const formatDateShort = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-PT', { 
      day: '2-digit', 
      month: '2-digit' 
    });
  };

  const formatFullDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-PT', { 
      weekday: 'long',
      day: '2-digit', 
      month: 'long',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('pt-PT', { 
      day: '2-digit', 
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Calcular dados de todos os entregadores
  const driversSettlements = useMemo(() => {
    return drivers.map(driver => {
      const calculated = calculateWeeklySettlement(driver.id, today);
      const lastSettlement = getLastConfirmedSettlement(driver.id);
      const history = getSettlementHistory(driver.id);
      
      // Calcular período atual: dia após o último fecho até hoje + 6 dias
      let periodStart = today;
      if (lastSettlement?.confirmedAt) {
        const lastFechoDate = new Date(lastSettlement.confirmedAt);
        lastFechoDate.setDate(lastFechoDate.getDate() + 1); // Dia seguinte ao fecho
        periodStart = lastFechoDate.toISOString().split('T')[0];
      }
      
      // Período termina 6 dias após o início (próximo fecho previsto)
      const periodEndDate = new Date(periodStart);
      periodEndDate.setDate(periodEndDate.getDate() + 6);
      const periodEnd = periodEndDate.toISOString().split('T')[0];
      
      return {
        driver,
        calculated,
        lastSettlement,
        history,
        hasNewValues: calculated.totalReceived > 0,
        periodStart,
        periodEnd
      };
    });
  }, [drivers, today, calculateWeeklySettlement, getLastConfirmedSettlement, getSettlementHistory]);

  // Calcular período geral (do mais antigo ao mais recente entre todos os entregadores)
  const generalPeriod = useMemo(() => {
    if (driversSettlements.length === 0) {
      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + 6);
      return { start: today, end: endDate.toISOString().split('T')[0] };
    }
    
    // Encontrar o período mais antigo (inicio) entre todos
    const starts = driversSettlements.map(ds => ds.periodStart).sort();
    const start = starts[0];
    
    // Fim é sempre 6 dias após o início
    const endDate = new Date(start);
    endDate.setDate(endDate.getDate() + 6);
    
    return { start, end: endDate.toISOString().split('T')[0] };
  }, [driversSettlements, today]);

  // Totais gerais (valores pendentes a receber)
  const totalStats = useMemo(() => {
    return driversSettlements.reduce((acc, ds) => ({
      totalDelivered: acc.totalDelivered + ds.calculated.totalDelivered,
      totalReceived: acc.totalReceived + ds.calculated.totalReceived,
      totalToSettle: acc.totalToSettle + ds.calculated.totalToSettle,
      cashTotal: acc.cashTotal + ds.calculated.cashTotal,
      mbwayTotal: acc.mbwayTotal + ds.calculated.mbwayTotal,
      transferTotal: acc.transferTotal + ds.calculated.transferTotal,
      withPendingValues: acc.withPendingValues + (ds.hasNewValues ? 1 : 0),
      upToDate: acc.upToDate + (ds.hasNewValues ? 0 : 1)
    }), {
      totalDelivered: 0,
      totalReceived: 0,
      totalToSettle: 0,
      cashTotal: 0,
      mbwayTotal: 0,
      transferTotal: 0,
      withPendingValues: 0,
      upToDate: 0
    });
  }, [driversSettlements]);

  const handleConfirmSettlement = async (driverId: string, expectedCash: number) => {
    if (!currentUser || !currentUser.id) {
      alert('Erro: Usuário não autenticado. Faça login novamente.');
      return;
    }

    const amountDelivered = showDetailedCount ? calculatedTotal : (parseFloat(deliveredAmount) || 0);
    
    if (amountDelivered <= 0) {
      alert('Por favor, informe o valor entregue pelo entregador.');
      return;
    }

    setLoading(true);
    try {
      // Usar timestamp para criar ID único, permitindo múltiplos fechos
      const settlementId = `settlement-${driverId}-${Date.now()}`;
      
      // Preparar dados da entrega
      const deliveryData = {
        amountDelivered,
        settlementDifference: amountDelivered - expectedCash,
        ...(showDetailedCount && {
          deliveredCoins: totalCoins,
          deliveredNotes: totalNotes,
          coinDetails: coinCounts,
          noteDetails: noteCounts
        })
      };
      
      await confirmWeeklySettlement(settlementId, currentUser.id, settlementObservations || undefined, deliveryData);
      resetConfirmationForm();
      alert('Fecho confirmado com sucesso! Os valores foram zerados.');
    } catch (error: any) {
      console.error('Erro ao confirmar fecho:', error);
      alert('Erro ao confirmar fecho: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setLoading(false);
    }
  };

  // Cancelar/Eliminar um fecho do histórico
  const handleCancelSettlement = async (settlementId: string, amount: number) => {
    if (!window.confirm(`Tem certeza que deseja cancelar este fecho de ${formatCurrency(amount)}?\n\nEsta ação não pode ser desfeita e os valores voltarão a aparecer no próximo fecho.`)) {
      return;
    }
    
    setCancellingSettlementId(settlementId);
    try {
      await cancelWeeklySettlement(settlementId);
      // Se o settlement que está sendo visualizado foi cancelado, fechar o modal
      if (selectedSettlement?.id === settlementId) {
        setSelectedSettlement(null);
      }
    } catch (error: any) {
      console.error('Erro ao cancelar fecho:', error);
      alert('Erro ao cancelar fecho: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setCancellingSettlementId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Calculator className="text-amber-600" />
            Fecho dos Entregadores
          </h2>
          <p className="text-gray-500">Confirme os fechos e receba o dinheiro dos entregadores</p>
        </div>
      </div>

      {/* Período Atual */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center justify-center">
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-1">Período Atual de Cobrança</p>
            <p className="text-xl font-bold text-amber-600">
              {formatDateShort(generalPeriod.start)} - {formatDateShort(generalPeriod.end)}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Os valores abaixo são desde o último fecho de cada entregador
            </p>
          </div>
        </div>
      </div>

      {/* Resumo Geral */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase">Total Entregue</p>
              <p className="text-xl font-bold text-gray-800">{formatCurrency(totalStats.totalDelivered)}</p>
            </div>
            <div className="p-2 bg-blue-100 rounded-lg">
              <TrendingUp className="text-blue-600" size={20} />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase">Total Recebido</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(totalStats.totalReceived)}</p>
            </div>
            <div className="p-2 bg-green-100 rounded-lg">
              <Banknote className="text-green-600" size={20} />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase">A Receber (Dinheiro)</p>
              <p className="text-xl font-bold text-amber-600">{formatCurrency(totalStats.totalToSettle)}</p>
            </div>
            <div className="p-2 bg-amber-100 rounded-lg">
              <Calculator className="text-amber-600" size={20} />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase">Status</p>
              <p className="text-xl font-bold">
                <span className="text-amber-600">{totalStats.withPendingValues}</span>
                <span className="text-gray-400"> / </span>
                <span className="text-green-600">{totalStats.upToDate}</span>
              </p>
              <p className="text-xs text-gray-400">Com valores / Em dia</p>
            </div>
            <div className="p-2 bg-gray-100 rounded-lg">
              <Users className="text-gray-600" size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Detalhes por Método de Pagamento */}
      <div style={{ backgroundColor: '#13161E', borderColor: 'rgba(255,255,255,0.1)' }} className="rounded-xl p-4 shadow-sm border">
        <h3 style={{ color: '#F5A623' }} className="text-sm font-bold mb-3">Totais por Método de Pagamento</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="flex items-center gap-3">
            <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }} className="p-2 rounded-lg">
              <Banknote style={{ color: '#10B981' }} size={18} />
            </div>
            <div>
              <p style={{ color: '#A0A8C0' }} className="text-xs">Dinheiro</p>
              <p style={{ color: '#10B981' }} className="font-bold text-sm">{formatCurrency(totalStats.cashTotal)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }} className="p-2 rounded-lg">
              <Smartphone style={{ color: '#3B82F6' }} size={18} />
            </div>
            <div>
              <p style={{ color: '#A0A8C0' }} className="text-xs">MBWay</p>
              <p style={{ color: '#3B82F6' }} className="font-bold text-sm">{formatCurrency(totalStats.mbwayTotal)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div style={{ backgroundColor: 'rgba(168, 85, 247, 0.1)' }} className="p-2 rounded-lg">
              <ArrowRightLeft style={{ color: '#A855F7' }} size={18} />
            </div>
            <div>
              <p style={{ color: '#A0A8C0' }} className="text-xs">Transferência</p>
              <p style={{ color: '#A855F7' }} className="font-bold text-sm">{formatCurrency(totalStats.transferTotal)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Entregadores */}
      <div className="space-y-4">
        <h3 style={{ color: '#FFFFFF' }} className="text-lg font-semibold">Entregadores - Valores Pendentes</h3>
        
        {driversSettlements.map(({ driver, calculated, lastSettlement, history, hasNewValues, periodStart, periodEnd }) => (
          <div 
            key={driver.id} 
            style={{ 
              backgroundColor: '#13161E',
              borderColor: hasNewValues ? 'rgba(245, 166, 35, 0.3)' : 'rgba(16, 185, 129, 0.3)'
            }}
            className="rounded-xl shadow-sm border overflow-hidden"
          >
            {/* Header do Entregador */}
            <div
              onClick={() => setExpandedDriver(expandedDriver === driver.id ? null : driver.id)}
              style={{ backgroundColor: '#1A1E29' }}
              className="p-4 cursor-pointer hover:opacity-80 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                    hasNewValues ? 'text-amber-600' : 'text-green-500'
                  }`}
                  style={{
                    backgroundColor: hasNewValues ? 'rgba(245, 166, 35, 0.1)' : 'rgba(16, 185, 129, 0.1)'
                  }}>
                    {driver.name.charAt(0)}
                  </div>
                  <div>
                    <p style={{ color: '#FFFFFF' }} className="font-medium">{driver.name}</p>
                    <div className="flex items-center gap-2 text-sm flex-wrap">
                      <span style={{ color: '#A0A8C0' }}>
                        {formatDateShort(periodStart)} - {formatDateShort(periodEnd)}
                      </span>
                      {hasNewValues ? (
                        <span style={{ color: '#F5A623' }} className="flex items-center gap-1">
                          <Clock size={14} />
                          Pendente
                        </span>
                      ) : (
                        <span style={{ color: '#10B981' }} className="flex items-center gap-1">
                          <CheckCircle size={14} />
                          Em dia
                        </span>
                      )}
                      {history.length > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowingHistory(showingHistory === driver.id ? null : driver.id);
                          }}
                          style={{ color: '#3B82F6' }}
                          className="flex items-center gap-1 hover:opacity-80"
                        >
                          <History size={14} />
                          {history.length} fecho(s)
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  <div className="text-right hidden md:block">
                    <p style={{ color: '#A0A8C0' }} className="text-sm">Total Recebido</p>
                    <p style={{ color: '#10B981' }} className="font-bold">{formatCurrency(calculated.totalReceived)}</p>
                  </div>
                  <div className="text-right">
                    <p style={{ color: '#A0A8C0' }} className="text-sm">A Entregar</p>
                    <p style={{ color: '#F5A623' }} className="font-bold text-lg">{formatCurrency(calculated.totalToSettle)}</p>
                  </div>
                  <div style={{ color: '#F5A623' }}>
                    {expandedDriver === driver.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </div>
              </div>
            </div>

            {/* Histórico de Fechos */}
            {showingHistory === driver.id && history.length > 0 && (
              <div style={{ backgroundColor: '#1A1E29', borderTopColor: 'rgba(255,255,255,0.1)' }} className="border-t p-4">
                <h4 style={{ color: '#3B82F6' }} className="text-sm font-bold mb-3 flex items-center gap-2">
                  <History size={16} />
                  Histórico de Fechos
                </h4>
                <p style={{ color: '#A0A8C0' }} className="text-xs mb-2">
                  💡 Clique no ícone de lixeira para cancelar um fecho feito por engano
                </p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {history.map((settlement, index) => (
                    <div 
                      key={settlement.id} 
                      style={{ backgroundColor: '#0D0F14', borderColor: 'rgba(59, 130, 246, 0.3)' }}
                      className="p-3 rounded-lg border"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p style={{ color: '#FFFFFF' }} className="text-sm font-medium">
                            {formatDateTime(settlement.confirmedAt || settlement.createdAt || '')}
                          </p>
                          {settlement.observations && (
                            <p style={{ color: '#A0A8C0' }} className="text-xs italic mt-1">"{settlement.observations}"</p>
                          )}
                        </div>
                        <div className="text-right flex items-center gap-3">
                          <div>
                            <p style={{ color: '#10B981' }} className="font-bold">{formatCurrency(settlement.totalReceived)}</p>
                            <p style={{ color: '#A0A8C0' }} className="text-xs">
                              {formatCurrency(settlement.cashTotal)} em dinheiro
                            </p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancelSettlement(settlement.id, settlement.totalReceived);
                            }}
                            disabled={cancellingSettlementId === settlement.id}
                            style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#EF4444' }}
                            className="p-2 rounded-lg hover:opacity-80 transition-colors disabled:opacity-50"
                            title="Cancelar este fecho"
                          >
                            {cancellingSettlementId === settlement.id ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <Trash2 size={16} />
                            )}
                          </button>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSettlement(settlement);
                        }}
                        style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6' }}
                        className="w-full mt-2 py-1.5 text-sm rounded-lg hover:opacity-80 transition-colors flex items-center justify-center gap-1 font-medium"
                      >
                        <Eye size={14} />
                        Ver Detalhes do Fecho
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Detalhes Expandidos */}
            {expandedDriver === driver.id && (
              <div style={{ backgroundColor: '#1A1E29', borderTopColor: 'rgba(255,255,255,0.1)' }} className="border-t p-4 space-y-4">
                {/* Info do último fecho */}
                {lastSettlement && (
                  <div style={{ backgroundColor: '#0D0F14', borderColor: 'rgba(59, 130, 246, 0.3)' }} className="p-3 border rounded-lg">
                    <p style={{ color: '#3B82F6' }} className="text-sm">
                      <strong>Último fecho:</strong> {formatDateTime(lastSettlement.confirmedAt || '')} 
                      <span className="ml-2">({formatCurrency(lastSettlement.totalReceived)})</span>
                    </p>
                    <p style={{ color: '#3B82F6' }} className="text-xs mt-1 opacity-80">
                      Os valores abaixo são apenas do período APÓS este fecho
                    </p>
                  </div>
                )}

                {/* Resumo por Método */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div style={{ backgroundColor: '#0D0F14', borderColor: 'rgba(16, 185, 129, 0.2)' }} className="p-3 rounded-lg border">
                    <p style={{ color: '#A0A8C0' }} className="text-xs">Dinheiro</p>
                    <p style={{ color: '#10B981' }} className="font-bold text-sm">{formatCurrency(calculated.cashTotal)}</p>
                  </div>
                  <div style={{ backgroundColor: '#0D0F14', borderColor: 'rgba(59, 130, 246, 0.2)' }} className="p-3 rounded-lg border">
                    <p style={{ color: '#A0A8C0' }} className="text-xs">MBWay</p>
                    <p style={{ color: '#3B82F6' }} className="font-bold text-sm">{formatCurrency(calculated.mbwayTotal)}</p>
                  </div>
                  <div style={{ backgroundColor: '#0D0F14', borderColor: 'rgba(168, 85, 247, 0.2)' }} className="p-3 rounded-lg border">
                    <p style={{ color: '#A0A8C0' }} className="text-xs">Transferência</p>
                    <p style={{ color: '#A855F7' }} className="font-bold text-sm">{formatCurrency(calculated.transferTotal)}</p>
                  </div>
                  <div style={{ backgroundColor: '#0D0F14', borderColor: 'rgba(160, 168, 192, 0.2)' }} className="p-3 rounded-lg border">
                    <p style={{ color: '#A0A8C0' }} className="text-xs">Outros</p>
                    <p style={{ color: '#A0A8C0' }} className="font-bold text-sm">{formatCurrency(calculated.otherTotal)}</p>
                  </div>
                </div>

                {/* Por Rota */}
                {calculated.routeTotals.length > 0 && (
                  <div>
                    <h4 style={{ color: '#FFFFFF' }} className="text-sm font-medium mb-2">Por Rota</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {calculated.routeTotals.map(rt => (
                        <div key={rt.routeId} style={{ backgroundColor: '#0D0F14', borderColor: 'rgba(255,255,255,0.1)' }} className="p-3 rounded-lg flex items-center justify-between border">
                          <div className="flex items-center gap-2">
                            <MapPin size={16} style={{ color: '#F5A623' }} />
                            <span style={{ color: '#FFFFFF' }} className="text-sm font-medium">{rt.routeName}</span>
                          </div>
                          <div className="text-right">
                            <p style={{ color: '#10B981' }} className="font-bold text-sm">{formatCurrency(rt.totalReceived)}</p>
                            <p style={{ color: '#A0A8C0' }} className="text-xs">{rt.clientsPaid} clientes</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Lista de Clientes que Pagaram */}
                {calculated.clientPayments.length > 0 && (
                  <div>
                    <h4 style={{ color: '#FFFFFF' }} className="text-sm font-medium mb-2">Clientes que Pagaram ({calculated.clientPayments.length})</h4>
                    <div style={{ backgroundColor: '#0D0F14', borderColor: 'rgba(255,255,255,0.1)' }} className="rounded-lg overflow-hidden border">
                      <div className="max-h-64 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead style={{ backgroundColor: '#1A1E29', borderBottomColor: 'rgba(255,255,255,0.1)' }} className="sticky top-0 border-b">
                            <tr>
                              <th style={{ color: '#A0A8C0' }} className="text-left p-2 font-medium">Cliente</th>
                              <th style={{ color: '#A0A8C0' }} className="text-left p-2 font-medium">Rota</th>
                              <th style={{ color: '#A0A8C0' }} className="text-left p-2 font-medium">Método</th>
                              <th style={{ color: '#A0A8C0' }} className="text-right p-2 font-medium">Valor</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-700">
                            {calculated.clientPayments.map(cp => (
                              <tr key={cp.clientId} style={{ backgroundColor: '#1A1E29' }} className="hover:opacity-80">
                                <td style={{ color: '#FFFFFF' }} className="p-2">{cp.clientName}</td>
                                <td style={{ color: '#A0A8C0' }} className="p-2">{cp.routeName || '-'}</td>
                                <td className="p-2">
                                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                    cp.method === 'Dinheiro' ? 'bg-green-100 text-green-700' :
                                    cp.method === 'MBWay' ? 'bg-blue-100 text-blue-700' :
                                    cp.method === 'Transferência' ? 'bg-purple-100 text-purple-700' :
                                    'bg-gray-100 text-gray-700'
                                  }`}>
                                    {cp.method}
                                  </span>
                                </td>
                                <td style={{ color: '#FFFFFF' }} className="p-2 text-right font-bold">{formatCurrency(cp.totalPaid)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* Ações - Mostrar botão de fecho se houver valores pendentes */}
                {hasNewValues && (
                  <div className="pt-4 border-t border-gray-200">
                    {confirmingSettlement === driver.id ? (
                      <div className="space-y-4 bg-amber-50 p-4 rounded-xl border border-amber-200">
                        <div className="flex items-center justify-between">
                          <h4 className="text-lg font-semibold text-amber-800 flex items-center gap-2">
                            <Calculator size={20} />
                            Confirmar Fecho - {driver.name}
                          </h4>
                          <button
                            onClick={resetConfirmationForm}
                            className="p-1 text-gray-400 hover:text-gray-600"
                          >
                            <X size={18} />
                          </button>
                        </div>
                        
                        {/* Valor Esperado */}
                        <div className="p-4 bg-amber-100 border-2 border-amber-300 rounded-xl">
                          <p className="text-sm text-amber-700 mb-1">Valor Esperado (Dinheiro)</p>
                          <p className="text-2xl font-bold text-amber-800">{formatCurrency(calculated.cashTotal)}</p>
                          <p className="text-xs text-amber-600 mt-1">
                            Este é o valor em dinheiro que o entregador deve entregar
                          </p>
                        </div>

                        {/* Toggle para contagem detalhada */}
                        <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200">
                          <button
                            onClick={() => setShowDetailedCount(!showDetailedCount)}
                            className={`relative w-14 h-7 rounded-full transition-colors ${
                              showDetailedCount ? 'bg-amber-500' : 'bg-gray-300'
                            }`}
                          >
                            <span className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                              showDetailedCount ? 'translate-x-7' : 'translate-x-0'
                            }`} />
                          </button>
                          <div>
                            <p className="font-medium text-gray-800">Contagem Detalhada</p>
                            <p className="text-sm text-gray-500">Contar moedas e notas separadamente</p>
                          </div>
                        </div>

                        {/* Contagem Detalhada de Moedas e Notas */}
                        {showDetailedCount ? (
                          <div className="space-y-4">
                            {/* Moedas */}
                            <div className="bg-gradient-to-br from-amber-50 to-yellow-50 p-4 rounded-xl border border-amber-200">
                              <h5 className="text-md font-semibold text-amber-800 mb-3 flex items-center gap-2">
                                <span className="text-xl">🪙</span> Moedas
                              </h5>
                              <div className="grid grid-cols-4 gap-2">
                                {[
                                  { key: 'cent1', label: '1c', value: 0.01 },
                                  { key: 'cent2', label: '2c', value: 0.02 },
                                  { key: 'cent5', label: '5c', value: 0.05 },
                                  { key: 'cent10', label: '10c', value: 0.10 },
                                  { key: 'cent20', label: '20c', value: 0.20 },
                                  { key: 'cent50', label: '50c', value: 0.50 },
                                  { key: 'euro1', label: '€1', value: 1.00 },
                                  { key: 'euro2', label: '€2', value: 2.00 },
                                ].map(coin => (
                                  <div key={coin.key} className="bg-white rounded-lg p-2 shadow-sm border border-amber-100">
                                    <p className="text-xs text-gray-500 text-center mb-1">{coin.label}</p>
                                    <input
                                      type="number"
                                      inputMode="numeric"
                                      min="0"
                                      value={coinCounts[coin.key as keyof typeof coinCounts] || ''}
                                      onChange={(e) => setCoinCounts(prev => ({
                                        ...prev,
                                        [coin.key]: parseInt(e.target.value) || 0
                                      }))}
                                      className="w-full text-center text-lg font-bold border-0 bg-transparent focus:ring-0"
                                      placeholder="0"
                                    />
                                    <p className="text-xs text-amber-600 text-center">
                                      {formatCurrency((coinCounts[coin.key as keyof typeof coinCounts] || 0) * coin.value)}
                                    </p>
                                  </div>
                                ))}
                              </div>
                              <div className="mt-3 p-2 bg-amber-100 rounded-lg">
                                <div className="flex justify-between items-center">
                                  <span className="font-medium text-amber-800 text-sm">Total em Moedas:</span>
                                  <span className="text-lg font-bold text-amber-700">{formatCurrency(totalCoins)}</span>
                                </div>
                              </div>
                            </div>

                            {/* Notas */}
                            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border border-green-200">
                              <h5 className="text-md font-semibold text-green-800 mb-3 flex items-center gap-2">
                                <span className="text-xl">💵</span> Notas
                              </h5>
                              <div className="grid grid-cols-4 gap-2">
                                {[
                                  { key: 'note5', label: '€5', color: 'bg-gray-100' },
                                  { key: 'note10', label: '€10', color: 'bg-red-50' },
                                  { key: 'note20', label: '€20', color: 'bg-blue-50' },
                                  { key: 'note50', label: '€50', color: 'bg-orange-50' },
                                  { key: 'note100', label: '€100', color: 'bg-green-50' },
                                  { key: 'note200', label: '€200', color: 'bg-yellow-50' },
                                  { key: 'note500', label: '€500', color: 'bg-purple-50' },
                                ].map(note => (
                                  <div key={note.key} className={`${note.color} rounded-lg p-2 shadow-sm border border-green-100`}>
                                    <p className="text-xs text-gray-600 text-center mb-1 font-medium">{note.label}</p>
                                    <input
                                      type="number"
                                      inputMode="numeric"
                                      min="0"
                                      value={noteCounts[note.key as keyof typeof noteCounts] || ''}
                                      onChange={(e) => setNoteCounts(prev => ({
                                        ...prev,
                                        [note.key]: parseInt(e.target.value) || 0
                                      }))}
                                      className="w-full text-center text-lg font-bold border-0 bg-transparent focus:ring-0"
                                      placeholder="0"
                                    />
                                    <p className="text-xs text-green-600 text-center">
                                      {formatCurrency((noteCounts[note.key as keyof typeof noteCounts] || 0) * parseInt(note.label.replace('€', '')))}
                                    </p>
                                  </div>
                                ))}
                              </div>
                              <div className="mt-3 p-2 bg-green-100 rounded-lg">
                                <div className="flex justify-between items-center">
                                  <span className="font-medium text-green-800 text-sm">Total em Notas:</span>
                                  <span className="text-lg font-bold text-green-700">{formatCurrency(totalNotes)}</span>
                                </div>
                              </div>
                            </div>

                            {/* Total Geral */}
                            <div className="bg-gradient-to-r from-amber-500 to-amber-600 p-4 rounded-xl text-white">
                              <div className="flex justify-between items-center">
                                <div>
                                  <p className="text-amber-100 text-sm">Total Entregue</p>
                                  <p className="text-xs text-amber-200 mt-1">Moedas + Notas</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-2xl font-bold">{formatCurrency(calculatedTotal)}</p>
                                  <p className="text-xs text-amber-200">
                                    {formatCurrency(totalCoins)} + {formatCurrency(totalNotes)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* Campo de Valor Simples */
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Valor Entregue pelo Entregador (€)
                            </label>
                            <input
                              type="text"
                              inputMode="decimal"
                              pattern="[0-9]*[.,]?[0-9]*"
                              value={deliveredAmount}
                              onChange={(e) => {
                                const val = e.target.value.replace(',', '.');
                                if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                  setDeliveredAmount(val);
                                }
                              }}
                              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent text-lg"
                              placeholder="0.00"
                            />
                          </div>
                        )}

                        {/* Resultado - Diferença */}
                        {(() => {
                          const amountDelivered = showDetailedCount ? calculatedTotal : (parseFloat(deliveredAmount) || 0);
                          const difference = amountDelivered - calculated.cashTotal;
                          
                          if (amountDelivered > 0) {
                            return (
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
                                      <CheckCircle size={28} className="text-green-600" />
                                      <div>
                                        <p className="text-lg font-bold text-green-700">Valor Correto! ✓</p>
                                        <p className="text-sm text-green-600">O entregador entregou o valor exato</p>
                                      </div>
                                    </>
                                  ) : difference > 0 ? (
                                    <>
                                      <TrendingUp size={28} className="text-blue-600" />
                                      <div>
                                        <p className="text-lg font-bold text-blue-700">Sobra: {formatCurrency(difference)}</p>
                                        <p className="text-sm text-blue-600">Entregou mais do que o esperado</p>
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      <AlertCircle size={28} className="text-red-600" />
                                      <div>
                                        <p className="text-lg font-bold text-red-700">Falta: {formatCurrency(Math.abs(difference))}</p>
                                        <p className="text-sm text-red-600">Entregou menos do que o esperado</p>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })()}

                        {/* Observações */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Observações (opcional)
                          </label>
                          <textarea
                            value={settlementObservations}
                            onChange={(e) => setSettlementObservations(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                            rows={2}
                            placeholder="Observações do fecho (diferenças, justificativas, etc)..."
                          />
                        </div>

                        {/* Botões */}
                        <div className="flex gap-2">
                          <button
                            onClick={resetConfirmationForm}
                            className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={() => handleConfirmSettlement(driver.id, calculated.cashTotal)}
                            disabled={loading || (showDetailedCount ? calculatedTotal <= 0 : !deliveredAmount || parseFloat(deliveredAmount) <= 0)}
                            className="flex-1 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            {loading ? (
                              <RefreshCw size={18} className="animate-spin" />
                            ) : (
                              <Check size={18} />
                            )}
                            Confirmar Fecho
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmingSettlement(driver.id)}
                        className="w-full py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <CheckCircle size={18} />
                        Confirmar Fecho (Receber {formatCurrency(calculated.cashTotal)} em dinheiro)
                      </button>
                    )}
                  </div>
                )}

                {/* Se não houver valores pendentes */}
                {!hasNewValues && (
                  <div className="pt-4 border-t border-gray-200">
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2 text-green-700">
                        <CheckCircle size={18} />
                        <span className="font-medium">Sem valores pendentes</span>
                      </div>
                      <p className="text-sm text-green-600 mt-1">
                        Todos os valores foram acertados no último fecho
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {drivers.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl">
            <Users size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">Nenhum entregador cadastrado</p>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <div className="flex items-start gap-3">
          <AlertCircle size={20} className="text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-700">
            <p className="font-medium mb-1">Como funciona o Fecho:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-600">
              <li>O sistema calcula automaticamente os totais de cada entregador</li>
              <li>O valor "A Entregar" considera apenas <strong>dinheiro em espécie</strong></li>
              <li>MBWay e Transferências já vão direto para a conta da empresa</li>
              <li>Após confirmar o fecho, os valores zeram e começa novo período</li>
              <li>Clique no histórico para ver detalhes de fechos anteriores</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Modal de Detalhes do Fecho */}
      {selectedSettlement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div style={{ backgroundColor: '#0D0F14', borderRadius: '0.75rem', maxWidth: '42rem', width: '100%', maxHeight: '90vh', overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.7)' }}>
            {/* Header do Modal */}
            <div style={{ padding: '1rem', backgroundColor: '#1A1E29', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#FFFFFF' }}>
                    <FileText size={20} />
                    Detalhes do Fecho
                  </h3>
                  <p style={{ color: '#A0A8C0', fontSize: '0.875rem' }}>
                    {selectedSettlement.driverName} - {formatDateTime(selectedSettlement.confirmedAt || '')}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedSettlement(null)}
                  style={{ padding: '0.5rem', backgroundColor: 'transparent', borderRadius: '0.5rem', cursor: 'pointer', color: '#A0A8C0' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#505569')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Conteúdo do Modal */}
            <div style={{ padding: '1rem', overflowY: 'auto', maxHeight: 'calc(90vh - 120px)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Resumo Geral */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem' }}>
                <div style={{ backgroundColor: '#13161E', padding: '0.75rem', borderRadius: '0.5rem', textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <p style={{ fontSize: '0.75rem', color: '#F5A623', textTransform: 'uppercase', fontWeight: 'bold' }}>Total Entregue</p>
                  <p style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#FFFFFF' }}>{formatCurrency(selectedSettlement.totalDelivered)}</p>
                </div>
                <div style={{ backgroundColor: '#13161E', padding: '0.75rem', borderRadius: '0.5rem', textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <p style={{ fontSize: '0.75rem', color: '#10B981', textTransform: 'uppercase', fontWeight: 'bold' }}>Total Recebido</p>
                  <p style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#10B981' }}>{formatCurrency(selectedSettlement.totalReceived)}</p>
                </div>
                <div style={{ backgroundColor: '#13161E', padding: '0.75rem', borderRadius: '0.5rem', textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <p style={{ fontSize: '0.75rem', color: '#F59E0B', textTransform: 'uppercase', fontWeight: 'bold' }}>Dinheiro</p>
                  <p style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#F59E0B' }}>{formatCurrency(selectedSettlement.cashTotal)}</p>
                </div>
                <div style={{ backgroundColor: '#13161E', padding: '0.75rem', borderRadius: '0.5rem', textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <p style={{ fontSize: '0.75rem', color: '#3B82F6', textTransform: 'uppercase', fontWeight: 'bold' }}>MBWay/Transf.</p>
                  <p style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#3B82F6' }}>
                    {formatCurrency(selectedSettlement.mbwayTotal + selectedSettlement.transferTotal)}
                  </p>
                </div>
              </div>

              {/* Detalhes por Método */}
              <div style={{ backgroundColor: '#13161E', padding: '1rem', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#F5A623', marginBottom: '0.75rem' }}>Por Método de Pagamento</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ padding: '0.5rem', backgroundColor: '#1A1E29', borderRadius: '0.375rem' }}>
                      <Banknote style={{ color: '#10B981' }} size={16} />
                    </div>
                    <div>
                      <p style={{ fontSize: '0.75rem', color: '#A0A8C0' }}>Dinheiro</p>
                      <p style={{ fontWeight: 'bold', fontSize: '0.875rem', color: '#10B981' }}>{formatCurrency(selectedSettlement.cashTotal)}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ padding: '0.5rem', backgroundColor: '#1A1E29', borderRadius: '0.375rem' }}>
                      <Smartphone style={{ color: '#3B82F6' }} size={16} />
                    </div>
                    <div>
                      <p style={{ fontSize: '0.75rem', color: '#A0A8C0' }}>MBWay</p>
                      <p style={{ fontWeight: 'bold', fontSize: '0.875rem', color: '#3B82F6' }}>{formatCurrency(selectedSettlement.mbwayTotal)}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ padding: '0.5rem', backgroundColor: '#1A1E29', borderRadius: '0.375rem' }}>
                      <ArrowRightLeft style={{ color: '#A855F7' }} size={16} />
                    </div>
                    <div>
                      <p style={{ fontSize: '0.75rem', color: '#A0A8C0' }}>Transferência</p>
                      <p style={{ fontWeight: 'bold', fontSize: '0.875rem', color: '#A855F7' }}>{formatCurrency(selectedSettlement.transferTotal)}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ padding: '0.5rem', backgroundColor: '#1A1E29', borderRadius: '0.375rem' }}>
                      <Calculator style={{ color: '#A0A8C0' }} size={16} />
                    </div>
                    <div>
                      <p style={{ fontSize: '0.75rem', color: '#A0A8C0' }}>Outros</p>
                      <p style={{ fontWeight: 'bold', fontSize: '0.875rem', color: '#FFFFFF' }}>{formatCurrency(selectedSettlement.otherTotal)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Por Rota */}
              {selectedSettlement.routeTotals && selectedSettlement.routeTotals.length > 0 && (
                <div style={{ backgroundColor: '#13161E', padding: '1rem', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#F5A623', marginBottom: '0.75rem' }}>Por Rota</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {selectedSettlement.routeTotals.map((rt) => (
                      <div key={rt.routeId} style={{ backgroundColor: '#1A1E29', padding: '0.75rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <MapPin size={16} style={{ color: '#F5A623' }} />
                          <span style={{ fontWeight: 'bold', color: '#FFFFFF' }}>{rt.routeName}</span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ fontWeight: 'bold', color: '#10B981' }}>{formatCurrency(rt.totalReceived)}</p>
                          <p style={{ fontSize: '0.75rem', color: '#A0A8C0' }}>{rt.clientsPaid} cliente(s)</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Dados da Entrega (valores entregues pelo entregador) */}
              {selectedSettlement.amountDelivered !== undefined && (
                <div style={{ backgroundColor: '#13161E', padding: '1rem', borderRadius: '0.5rem', border: '2px solid #F5A623' }}>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#F5A623', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Banknote size={16} />
                    Dinheiro Entregue ao Admin
                  </h4>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.75rem' }}>
                    <div style={{ backgroundColor: '#1A1E29', padding: '0.75rem', borderRadius: '0.5rem' }}>
                      <p style={{ fontSize: '0.75rem', color: '#A0A8C0' }}>Valor Esperado</p>
                      <p style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#F5A623' }}>{formatCurrency(selectedSettlement.cashTotal)}</p>
                    </div>
                    <div style={{ backgroundColor: '#1A1E29', padding: '0.75rem', borderRadius: '0.5rem' }}>
                      <p style={{ fontSize: '0.75rem', color: '#A0A8C0' }}>Valor Entregue</p>
                      <p style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#10B981' }}>{formatCurrency(selectedSettlement.amountDelivered)}</p>
                    </div>
                  </div>
                  
                  {/* Diferença */}
                  {selectedSettlement.settlementDifference !== undefined && (
                    <div style={{
                      padding: '0.75rem',
                      borderRadius: '0.5rem',
                      backgroundColor: Math.abs(selectedSettlement.settlementDifference) < 0.01 
                        ? '#1A1E29' 
                        : selectedSettlement.settlementDifference > 0 
                          ? '#1A1E29'
                          : '#1A1E29',
                      borderLeft: Math.abs(selectedSettlement.settlementDifference) < 0.01 
                        ? '4px solid #10B981' 
                        : selectedSettlement.settlementDifference > 0 
                          ? '4px solid #3B82F6'
                          : '4px solid #EF4444'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 'bold', color: '#FFFFFF' }}>Diferença:</span>
                        <span style={{
                          fontWeight: 'bold',
                          color: Math.abs(selectedSettlement.settlementDifference) < 0.01 
                            ? '#10B981' 
                            : selectedSettlement.settlementDifference > 0 
                              ? '#3B82F6'
                              : '#EF4444'
                        }}>
                          {selectedSettlement.settlementDifference > 0 ? '+' : ''}
                          {formatCurrency(selectedSettlement.settlementDifference)}
                          {Math.abs(selectedSettlement.settlementDifference) < 0.01 && ' ✓'}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {/* Detalhes da contagem (moedas e notas) */}
                  {(selectedSettlement.deliveredCoins !== undefined || selectedSettlement.deliveredNotes !== undefined) && (
                    <div style={{ marginTop: '0.75rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      {selectedSettlement.deliveredCoins !== undefined && (
                        <div style={{ backgroundColor: '#1A1E29', padding: '0.5rem', borderRadius: '0.375rem' }}>
                          <p style={{ fontSize: '0.75rem', color: '#F5A623' }}>Total em Moedas</p>
                          <p style={{ fontWeight: 'bold', color: '#F5A623' }}>{formatCurrency(selectedSettlement.deliveredCoins)}</p>
                        </div>
                      )}
                      {selectedSettlement.deliveredNotes !== undefined && (
                        <div style={{ backgroundColor: '#1A1E29', padding: '0.5rem', borderRadius: '0.375rem' }}>
                          <p style={{ fontSize: '0.75rem', color: '#10B981' }}>Total em Notas</p>
                          <p style={{ fontWeight: 'bold', color: '#10B981' }}>{formatCurrency(selectedSettlement.deliveredNotes)}</p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Detalhes por denominação */}
                  {selectedSettlement.coinDetails && Object.keys(selectedSettlement.coinDetails).some(k => (selectedSettlement.coinDetails as any)[k] > 0) && (
                    <div style={{ marginTop: '0.75rem' }}>
                      <p style={{ fontSize: '0.75rem', color: '#F5A623', marginBottom: '0.5rem', fontWeight: 'bold' }}>Contagem de Moedas:</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {[
                          { key: 'cent1', label: '1c' },
                          { key: 'cent2', label: '2c' },
                          { key: 'cent5', label: '5c' },
                          { key: 'cent10', label: '10c' },
                          { key: 'cent20', label: '20c' },
                          { key: 'cent50', label: '50c' },
                          { key: 'euro1', label: '€1' },
                          { key: 'euro2', label: '€2' },
                        ].map(coin => {
                          const count = (selectedSettlement.coinDetails as any)?.[coin.key] || 0;
                          if (count === 0) return null;
                          return (
                            <span key={coin.key} style={{ padding: '0.25rem 0.5rem', backgroundColor: '#1A1E29', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: 'bold', color: '#F5A623', border: '1px solid rgba(245, 166, 35, 0.3)' }}>
                              {count}x {coin.label}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  {selectedSettlement.noteDetails && Object.keys(selectedSettlement.noteDetails).some(k => (selectedSettlement.noteDetails as any)[k] > 0) && (
                    <div style={{ marginTop: '0.75rem' }}>
                      <p style={{ fontSize: '0.75rem', color: '#10B981', marginBottom: '0.5rem', fontWeight: 'bold' }}>Contagem de Notas:</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {[
                          { key: 'note5', label: '€5' },
                          { key: 'note10', label: '€10' },
                          { key: 'note20', label: '€20' },
                          { key: 'note50', label: '€50' },
                          { key: 'note100', label: '€100' },
                          { key: 'note200', label: '€200' },
                          { key: 'note500', label: '€500' },
                        ].map(note => {
                          const count = (selectedSettlement.noteDetails as any)?.[note.key] || 0;
                          if (count === 0) return null;
                          return (
                            <span key={note.key} style={{ padding: '0.25rem 0.5rem', backgroundColor: '#1A1E29', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: 'bold', color: '#10B981', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                              {count}x {note.label}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Clientes que Pagaram */}
              {selectedSettlement.clientPayments && selectedSettlement.clientPayments.length > 0 && (
                <div style={{ backgroundColor: '#13161E', padding: '1rem', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#F5A623', marginBottom: '0.75rem' }}>
                    Clientes que Pagaram ({selectedSettlement.clientPayments.length})
                  </h4>
                  <div style={{ backgroundColor: '#1A1E29', borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ maxHeight: '256px', overflowY: 'auto' }}>
                      <table style={{ width: '100%', fontSize: '0.875rem' }}>
                        <thead style={{ backgroundColor: '#0D0F14', position: 'sticky', top: 0 }}>
                          <tr>
                            <th style={{ textAlign: 'left', padding: '0.5rem', fontWeight: 'bold', color: '#F5A623' }}>Cliente</th>
                            <th style={{ textAlign: 'left', padding: '0.5rem', fontWeight: 'bold', color: '#F5A623' }}>Rota</th>
                            <th style={{ textAlign: 'left', padding: '0.5rem', fontWeight: 'bold', color: '#F5A623' }}>Método</th>
                            <th style={{ textAlign: 'right', padding: '0.5rem', fontWeight: 'bold', color: '#F5A623' }}>Valor</th>
                          </tr>
                        </thead>
                        <tbody style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                          {selectedSettlement.clientPayments.map((cp, idx) => (
                            <tr key={cp.clientId} style={{ borderBottom: idx !== selectedSettlement.clientPayments.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', backgroundColor: idx % 2 === 0 ? '#13161E' : '#0D0F14' }}>
                              <td style={{ padding: '0.5rem', fontWeight: 'bold', color: '#FFFFFF' }}>{cp.clientName}</td>
                              <td style={{ padding: '0.5rem', color: '#A0A8C0' }}>{cp.routeName || '-'}</td>
                              <td style={{ padding: '0.5rem' }}>
                                <span style={{
                                  padding: '0.25rem 0.5rem',
                                  borderRadius: '0.25rem',
                                  fontSize: '0.75rem',
                                  fontWeight: 'bold',
                                  backgroundColor: cp.method === 'Dinheiro' ? 'rgba(16, 185, 129, 0.2)' :
                                    cp.method === 'MBWay' ? 'rgba(59, 130, 246, 0.2)' :
                                    cp.method === 'Transferência' ? 'rgba(168, 85, 247, 0.2)' :
                                    'rgba(160, 168, 192, 0.2)',
                                  color: cp.method === 'Dinheiro' ? '#10B981' :
                                    cp.method === 'MBWay' ? '#3B82F6' :
                                    cp.method === 'Transferência' ? '#A855F7' :
                                    '#A0A8C0'
                                }}>
                                  {cp.method}
                                </span>
                              </td>
                              <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 'bold', color: '#10B981' }}>{formatCurrency(cp.totalPaid)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Observações */}
              {selectedSettlement.observations && (
                <div style={{ backgroundColor: '#13161E', padding: '1rem', borderRadius: '0.5rem', border: '2px solid #F5A623' }}>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#F5A623', marginBottom: '0.5rem' }}>Observações</h4>
                  <p style={{ fontSize: '0.875rem', color: '#A0A8C0', fontStyle: 'italic' }}>"{selectedSettlement.observations}"</p>
                </div>
              )}
            </div>

            {/* Footer do Modal */}
            <div style={{ padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', backgroundColor: '#1A1E29', display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => handleCancelSettlement(selectedSettlement.id, selectedSettlement.totalReceived)}
                disabled={cancellingSettlementId === selectedSettlement.id}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  backgroundColor: '#EF4444',
                  color: '#FFFFFF',
                  borderRadius: '0.5rem',
                  border: 'none',
                  cursor: cancellingSettlementId === selectedSettlement.id ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  opacity: cancellingSettlementId === selectedSettlement.id ? 0.5 : 1,
                  fontWeight: 'bold',
                  fontSize: '0.875rem'
                }}
              >
                {cancellingSettlementId === selectedSettlement.id ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Cancelando...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    Cancelar Fecho
                  </>
                )}
              </button>
              <button
                onClick={() => setSelectedSettlement(null)}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  backgroundColor: '#505569',
                  color: '#FFFFFF',
                  borderRadius: '0.5rem',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '0.875rem'
                }}
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

export default AdminWeeklySettlement;
