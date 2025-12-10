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
  FileText,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  RefreshCw,
  Check,
  X,
  History,
  Eye
} from 'lucide-react';

const AdminWeeklySettlement: React.FC = () => {
  const { currentUser } = useAuth();
  const { 
    getDrivers,
    calculateWeeklySettlement,
    getWeeklySettlement,
    confirmWeeklySettlement,
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

  const handleConfirmSettlement = async (driverId: string) => {
    if (!currentUser || !currentUser.id) {
      alert('Erro: Usuário não autenticado. Faça login novamente.');
      return;
    }

    setLoading(true);
    try {
      // Usar timestamp para criar ID único, permitindo múltiplos fechos
      const settlementId = `settlement-${driverId}-${Date.now()}`;
      await confirmWeeklySettlement(settlementId, currentUser.id, settlementObservations || undefined);
      setConfirmingSettlement(null);
      setSettlementObservations('');
      alert('Fecho confirmado com sucesso! Os valores foram zerados.');
    } catch (error) {
      console.error('Erro ao confirmar fecho:', error);
      alert('Erro ao confirmar fecho: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setLoading(false);
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
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <h3 className="text-sm font-medium text-gray-500 mb-3">Totais por Método de Pagamento</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Banknote className="text-green-600" size={18} />
            </div>
            <div>
              <p className="text-xs text-gray-500">Dinheiro</p>
              <p className="font-semibold text-gray-800">{formatCurrency(totalStats.cashTotal)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Smartphone className="text-blue-600" size={18} />
            </div>
            <div>
              <p className="text-xs text-gray-500">MBWay</p>
              <p className="font-semibold text-gray-800">{formatCurrency(totalStats.mbwayTotal)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <ArrowRightLeft className="text-purple-600" size={18} />
            </div>
            <div>
              <p className="text-xs text-gray-500">Transferência</p>
              <p className="font-semibold text-gray-800">{formatCurrency(totalStats.transferTotal)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Entregadores */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">Entregadores - Valores Pendentes</h3>
        
        {driversSettlements.map(({ driver, calculated, lastSettlement, history, hasNewValues, periodStart, periodEnd }) => (
          <div 
            key={driver.id} 
            className={`bg-white rounded-xl shadow-sm border overflow-hidden ${
              hasNewValues ? 'border-amber-200' : 'border-green-200'
            }`}
          >
            {/* Header do Entregador */}
            <div
              onClick={() => setExpandedDriver(expandedDriver === driver.id ? null : driver.id)}
              className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                    hasNewValues ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                  }`}>
                    {driver.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{driver.name}</p>
                    <div className="flex items-center gap-2 text-sm flex-wrap">
                      <span className="text-gray-500">
                        {formatDateShort(periodStart)} - {formatDateShort(periodEnd)}
                      </span>
                      {hasNewValues ? (
                        <span className="flex items-center gap-1 text-amber-600">
                          <Clock size={14} />
                          Pendente
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-green-600">
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
                          className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
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
                    <p className="text-sm text-gray-500">Total Recebido</p>
                    <p className="font-semibold text-green-600">{formatCurrency(calculated.totalReceived)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">A Entregar</p>
                    <p className="font-bold text-amber-600 text-lg">{formatCurrency(calculated.totalToSettle)}</p>
                  </div>
                  {expandedDriver === driver.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </div>
            </div>

            {/* Histórico de Fechos */}
            {showingHistory === driver.id && history.length > 0 && (
              <div className="border-t border-blue-100 p-4 bg-blue-50">
                <h4 className="text-sm font-medium text-blue-800 mb-3 flex items-center gap-2">
                  <History size={16} />
                  Histórico de Fechos
                </h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {history.map((settlement, index) => (
                    <div 
                      key={settlement.id} 
                      className="bg-white p-3 rounded-lg border border-blue-200"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-800">
                            {formatDateTime(settlement.confirmedAt || settlement.createdAt || '')}
                          </p>
                          {settlement.observations && (
                            <p className="text-xs text-gray-500 italic mt-1">"{settlement.observations}"</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-green-600">{formatCurrency(settlement.totalReceived)}</p>
                          <p className="text-xs text-gray-500">
                            {formatCurrency(settlement.cashTotal)} em dinheiro
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSettlement(settlement);
                        }}
                        className="w-full mt-2 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors flex items-center justify-center gap-1"
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
              <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-4">
                {/* Info do último fecho */}
                {lastSettlement && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-700">
                      <strong>Último fecho:</strong> {formatDateTime(lastSettlement.confirmedAt || '')} 
                      <span className="ml-2">({formatCurrency(lastSettlement.totalReceived)})</span>
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      Os valores abaixo são apenas do período APÓS este fecho
                    </p>
                  </div>
                )}

                {/* Resumo por Método */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-white p-3 rounded-lg">
                    <p className="text-xs text-gray-500">Dinheiro</p>
                    <p className="font-semibold text-green-600">{formatCurrency(calculated.cashTotal)}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg">
                    <p className="text-xs text-gray-500">MBWay</p>
                    <p className="font-semibold text-blue-600">{formatCurrency(calculated.mbwayTotal)}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg">
                    <p className="text-xs text-gray-500">Transferência</p>
                    <p className="font-semibold text-purple-600">{formatCurrency(calculated.transferTotal)}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg">
                    <p className="text-xs text-gray-500">Outros</p>
                    <p className="font-semibold text-gray-600">{formatCurrency(calculated.otherTotal)}</p>
                  </div>
                </div>

                {/* Por Rota */}
                {calculated.routeTotals.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Por Rota</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {calculated.routeTotals.map(rt => (
                        <div key={rt.routeId} className="bg-white p-3 rounded-lg flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <MapPin size={16} className="text-amber-500" />
                            <span className="text-sm font-medium">{rt.routeName}</span>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-gray-800">{formatCurrency(rt.totalReceived)}</p>
                            <p className="text-xs text-gray-500">{rt.clientsPaid} clientes</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Lista de Clientes que Pagaram */}
                {calculated.clientPayments.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Clientes que Pagaram ({calculated.clientPayments.length})</h4>
                    <div className="bg-white rounded-lg overflow-hidden">
                      <div className="max-h-64 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-100 sticky top-0">
                            <tr>
                              <th className="text-left p-2 font-medium text-gray-600">Cliente</th>
                              <th className="text-left p-2 font-medium text-gray-600">Rota</th>
                              <th className="text-left p-2 font-medium text-gray-600">Método</th>
                              <th className="text-right p-2 font-medium text-gray-600">Valor</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {calculated.clientPayments.map(cp => (
                              <tr key={cp.clientId} className="hover:bg-gray-50">
                                <td className="p-2">{cp.clientName}</td>
                                <td className="p-2 text-gray-500">{cp.routeName || '-'}</td>
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
                                <td className="p-2 text-right font-medium">{formatCurrency(cp.totalPaid)}</td>
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
                      <div className="space-y-3">
                        <textarea
                          value={settlementObservations}
                          onChange={(e) => setSettlementObservations(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                          rows={2}
                          placeholder="Observações do fecho (opcional)..."
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setConfirmingSettlement(null);
                              setSettlementObservations('');
                            }}
                            className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={() => handleConfirmSettlement(driver.id)}
                            disabled={loading}
                            className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
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
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
            {/* Header do Modal */}
            <div className="p-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <FileText size={20} />
                    Detalhes do Fecho
                  </h3>
                  <p className="text-blue-100 text-sm">
                    {selectedSettlement.driverName} - {formatDateTime(selectedSettlement.confirmedAt || '')}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedSettlement(null)}
                  className="p-2 hover:bg-blue-500 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Conteúdo do Modal */}
            <div className="p-4 overflow-y-auto max-h-[calc(90vh-120px)] space-y-4">
              {/* Resumo Geral */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-gray-50 p-3 rounded-lg text-center">
                  <p className="text-xs text-gray-500 uppercase">Total Entregue</p>
                  <p className="text-lg font-bold text-gray-800">{formatCurrency(selectedSettlement.totalDelivered)}</p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg text-center">
                  <p className="text-xs text-gray-500 uppercase">Total Recebido</p>
                  <p className="text-lg font-bold text-green-600">{formatCurrency(selectedSettlement.totalReceived)}</p>
                </div>
                <div className="bg-amber-50 p-3 rounded-lg text-center">
                  <p className="text-xs text-gray-500 uppercase">Dinheiro</p>
                  <p className="text-lg font-bold text-amber-600">{formatCurrency(selectedSettlement.cashTotal)}</p>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg text-center">
                  <p className="text-xs text-gray-500 uppercase">MBWay/Transf.</p>
                  <p className="text-lg font-bold text-blue-600">
                    {formatCurrency(selectedSettlement.mbwayTotal + selectedSettlement.transferTotal)}
                  </p>
                </div>
              </div>

              {/* Detalhes por Método */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Por Método de Pagamento</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-green-100 rounded">
                      <Banknote className="text-green-600" size={14} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Dinheiro</p>
                      <p className="font-semibold text-sm">{formatCurrency(selectedSettlement.cashTotal)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-100 rounded">
                      <Smartphone className="text-blue-600" size={14} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">MBWay</p>
                      <p className="font-semibold text-sm">{formatCurrency(selectedSettlement.mbwayTotal)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-purple-100 rounded">
                      <ArrowRightLeft className="text-purple-600" size={14} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Transferência</p>
                      <p className="font-semibold text-sm">{formatCurrency(selectedSettlement.transferTotal)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-gray-100 rounded">
                      <Calculator className="text-gray-600" size={14} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Outros</p>
                      <p className="font-semibold text-sm">{formatCurrency(selectedSettlement.otherTotal)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Por Rota */}
              {selectedSettlement.routeTotals && selectedSettlement.routeTotals.length > 0 && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Por Rota</h4>
                  <div className="space-y-2">
                    {selectedSettlement.routeTotals.map((rt) => (
                      <div key={rt.routeId} className="bg-white p-3 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MapPin size={16} className="text-amber-500" />
                          <span className="font-medium">{rt.routeName}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrency(rt.totalReceived)}</p>
                          <p className="text-xs text-gray-500">{rt.clientsPaid} cliente(s)</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Clientes que Pagaram */}
              {selectedSettlement.clientPayments && selectedSettlement.clientPayments.length > 0 && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">
                    Clientes que Pagaram ({selectedSettlement.clientPayments.length})
                  </h4>
                  <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
                    <div className="max-h-64 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100 sticky top-0">
                          <tr>
                            <th className="text-left p-2 font-medium text-gray-600">Cliente</th>
                            <th className="text-left p-2 font-medium text-gray-600">Rota</th>
                            <th className="text-left p-2 font-medium text-gray-600">Método</th>
                            <th className="text-right p-2 font-medium text-gray-600">Valor</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {selectedSettlement.clientPayments.map((cp) => (
                            <tr key={cp.clientId} className="hover:bg-gray-50">
                              <td className="p-2 font-medium">{cp.clientName}</td>
                              <td className="p-2 text-gray-500">{cp.routeName || '-'}</td>
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
                              <td className="p-2 text-right font-semibold">{formatCurrency(cp.totalPaid)}</td>
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
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <h4 className="text-sm font-medium text-yellow-800 mb-2">Observações</h4>
                  <p className="text-sm text-yellow-700 italic">"{selectedSettlement.observations}"</p>
                </div>
              )}
            </div>

            {/* Footer do Modal */}
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setSelectedSettlement(null)}
                className="w-full py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
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
