import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
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
  X
} from 'lucide-react';

const AdminWeeklySettlement: React.FC = () => {
  const { currentUser } = useAuth();
  const { 
    getDrivers,
    calculateWeeklySettlement,
    getWeeklySettlement,
    confirmWeeklySettlement,
    routes
  } = useData();

  // Calcular semana atual (segunda a domingo)
  const getWeekDates = (date: Date) => {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Ajustar para segunda
    const monday = new Date(date.setDate(diff));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    return {
      start: monday.toISOString().split('T')[0],
      end: sunday.toISOString().split('T')[0]
    };
  };

  const [selectedWeekStart, setSelectedWeekStart] = useState(() => getWeekDates(new Date()).start);
  const [expandedDriver, setExpandedDriver] = useState<string | null>(null);
  const [confirmingSettlement, setConfirmingSettlement] = useState<string | null>(null);
  const [settlementObservations, setSettlementObservations] = useState('');
  const [loading, setLoading] = useState(false);

  if (!currentUser) return null;

  const drivers = getDrivers();
  const weekEnd = (() => {
    const start = new Date(selectedWeekStart);
    start.setDate(start.getDate() + 6);
    return start.toISOString().split('T')[0];
  })();

  // Navegar entre semanas
  const goToPreviousWeek = () => {
    const start = new Date(selectedWeekStart);
    start.setDate(start.getDate() - 7);
    setSelectedWeekStart(start.toISOString().split('T')[0]);
  };

  const goToNextWeek = () => {
    const start = new Date(selectedWeekStart);
    start.setDate(start.getDate() + 7);
    setSelectedWeekStart(start.toISOString().split('T')[0]);
  };

  const goToCurrentWeek = () => {
    setSelectedWeekStart(getWeekDates(new Date()).start);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-PT', { 
      day: '2-digit', 
      month: 'short' 
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

  // Calcular dados de todos os entregadores
  const driversSettlements = useMemo(() => {
    return drivers.map(driver => {
      const calculated = calculateWeeklySettlement(driver.id, selectedWeekStart);
      const existing = getWeeklySettlement(driver.id, selectedWeekStart);
      
      return {
        driver,
        calculated,
        existing,
        isConfirmed: existing?.status === 'confirmed'
      };
    });
  }, [drivers, selectedWeekStart, calculateWeeklySettlement, getWeeklySettlement]);

  // Totais gerais
  const totalStats = useMemo(() => {
    return driversSettlements.reduce((acc, ds) => ({
      totalDelivered: acc.totalDelivered + ds.calculated.totalDelivered,
      totalReceived: acc.totalReceived + ds.calculated.totalReceived,
      totalToSettle: acc.totalToSettle + ds.calculated.totalToSettle,
      cashTotal: acc.cashTotal + ds.calculated.cashTotal,
      mbwayTotal: acc.mbwayTotal + ds.calculated.mbwayTotal,
      transferTotal: acc.transferTotal + ds.calculated.transferTotal,
      confirmed: acc.confirmed + (ds.isConfirmed ? 1 : 0),
      pending: acc.pending + (ds.isConfirmed ? 0 : 1)
    }), {
      totalDelivered: 0,
      totalReceived: 0,
      totalToSettle: 0,
      cashTotal: 0,
      mbwayTotal: 0,
      transferTotal: 0,
      confirmed: 0,
      pending: 0
    });
  }, [driversSettlements]);

  const handleConfirmSettlement = async (driverId: string) => {
    console.log('Iniciando handleConfirmSettlement para driver:', driverId);
    console.log('Current user:', currentUser);

    if (!currentUser || !currentUser.id) {
      console.error('Usuário não autenticado ou sem ID');
      alert('Erro: Usuário não autenticado. Faça login novamente.');
      return;
    }

    console.log('Selected week start:', selectedWeekStart);

    setLoading(true);
    try {
      const settlementId = `settlement-${driverId}-${selectedWeekStart}`;
      console.log('Settlement ID gerado:', settlementId);

      await confirmWeeklySettlement(settlementId, currentUser.id, settlementObservations || undefined);
      console.log('confirmWeeklySettlement executado com sucesso');

      setConfirmingSettlement(null);
      setSettlementObservations('');
      alert('Fecho semanal confirmado com sucesso!');
    } catch (error) {
      console.error('Erro completo ao confirmar fecho:', error);
      alert('Erro ao confirmar fecho semanal: ' + (error.message || 'Erro desconhecido'));
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
            Fecho Semanal dos Entregadores
          </h2>
          <p className="text-gray-500">Confirme os fechos semanais de cada entregador</p>
        </div>
      </div>

      {/* Navegação de Semanas */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between">
          <button
            onClick={goToPreviousWeek}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            ← Semana Anterior
          </button>
          
          <div className="text-center">
            <p className="text-lg font-semibold text-gray-800">
              {formatDate(selectedWeekStart)} - {formatDate(weekEnd)}
            </p>
            <p className="text-sm text-gray-500">
              {formatFullDate(selectedWeekStart).split(',')[0]}
            </p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={goToCurrentWeek}
              className="px-4 py-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors"
            >
              Semana Atual
            </button>
            <button
              onClick={goToNextWeek}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Próxima Semana →
            </button>
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
                <span className="text-green-600">{totalStats.confirmed}</span>
                <span className="text-gray-400"> / </span>
                <span className="text-amber-600">{totalStats.pending}</span>
              </p>
              <p className="text-xs text-gray-400">Confirmados / Pendentes</p>
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
        <h3 className="text-lg font-semibold text-gray-800">Entregadores</h3>
        
        {driversSettlements.map(({ driver, calculated, existing, isConfirmed }) => (
          <div 
            key={driver.id} 
            className={`bg-white rounded-xl shadow-sm border overflow-hidden ${
              isConfirmed ? 'border-green-200' : 'border-gray-100'
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
                    isConfirmed ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {driver.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{driver.name}</p>
                    <div className="flex items-center gap-2 text-sm">
                      {isConfirmed ? (
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle size={14} />
                          Confirmado
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-amber-600">
                          <Clock size={14} />
                          Pendente
                        </span>
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

            {/* Detalhes Expandidos */}
            {expandedDriver === driver.id && (
              <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-4">
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

                {/* Ações */}
                {!isConfirmed && (
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
                        Confirmar Fecho Semanal
                      </button>
                    )}
                  </div>
                )}

                {isConfirmed && existing && (
                  <div className="pt-4 border-t border-gray-200">
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2 text-green-700">
                        <CheckCircle size={18} />
                        <span className="font-medium">Fecho confirmado</span>
                      </div>
                      <p className="text-sm text-green-600 mt-1">
                        Em {new Date(existing.confirmedAt || '').toLocaleString('pt-PT')}
                      </p>
                      {existing.observations && (
                        <p className="text-sm text-gray-600 mt-2 italic">"{existing.observations}"</p>
                      )}
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
            <p className="font-medium mb-1">Como funciona o Fecho Semanal:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-600">
              <li>O sistema calcula automaticamente os totais de cada entregador</li>
              <li>O valor "A Entregar" considera apenas <strong>dinheiro em espécie</strong></li>
              <li>MBWay e Transferências já vão direto para a conta da empresa</li>
              <li>O fundo de caixa <strong>não</strong> entra no cálculo</li>
              <li>Confirme o fecho após receber o dinheiro do entregador</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminWeeklySettlement;
