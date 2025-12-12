import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  CalendarDays,
  AlertTriangle,
  CheckCircle,
  Clock,
  MapPin,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Wallet,
  CreditCard,
  Filter
} from 'lucide-react';

const DriverDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const { 
    getClientsByDriver, 
    getRoutesByDriver,
    getClientPaymentSummaries
  } = useData();

  const [expandedRoutes, setExpandedRoutes] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<'all' | 'monthly' | 'weekly' | 'daily'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending' | 'overdue'>('all');

  if (!currentUser) return null;

  const driverId = currentUser.id;
  const myClients = getClientsByDriver(driverId);
  const myRoutes = getRoutesByDriver(driverId);
  const clientSummaries = getClientPaymentSummaries(driverId);

  // Calcular data de referência para pagamentos
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay()); // Domingo
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  // Classificar clientes por status de pagamento
  const classifyClient = (clientId: string) => {
    const client = myClients.find(c => c.id === clientId);
    const summary = clientSummaries.find(s => s.clientId === clientId);
    
    if (!client || !summary) return { status: 'unknown', daysOverdue: 0 };

    const frequency = client.paymentFrequency || 'Mensal';
    const paidUntil = summary.paidUntil ? new Date(summary.paidUntil) : null;
    const lastPayment = summary.lastPaymentDate ? new Date(summary.lastPaymentDate) : null;

    // Se não tem registro de pagamento, está pendente
    if (!paidUntil && !lastPayment) {
      return { status: 'pending', daysOverdue: 30 };
    }

    // Verificar se está em dia baseado no paidUntil
    if (paidUntil) {
      const diffDays = Math.floor((today.getTime() - paidUntil.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 0) {
        return { status: 'paid', daysOverdue: 0 };
      } else {
        return { status: 'overdue', daysOverdue: diffDays };
      }
    }

    // Fallback baseado na frequência
    if (lastPayment) {
      const diffDays = Math.floor((today.getTime() - lastPayment.getTime()) / (1000 * 60 * 60 * 24));
      
      if (frequency === 'Diário' && diffDays > 1) {
        return { status: 'overdue', daysOverdue: diffDays - 1 };
      } else if (frequency === 'Semanal' && diffDays > 7) {
        return { status: 'overdue', daysOverdue: diffDays - 7 };
      } else if (frequency === 'Quinzenal' && diffDays > 15) {
        return { status: 'overdue', daysOverdue: diffDays - 15 };
      } else if (frequency === 'Mensal' && diffDays > 30) {
        return { status: 'overdue', daysOverdue: diffDays - 30 };
      }
      
      return { status: 'paid', daysOverdue: 0 };
    }

    return { status: 'pending', daysOverdue: 0 };
  };

  // Agrupar clientes por rota e status
  const clientsByRouteAndStatus = useMemo(() => {
    const result = new Map<string, {
      routeName: string;
      monthly: { paid: typeof myClients; pending: typeof myClients; overdue: typeof myClients };
      weekly: { paid: typeof myClients; pending: typeof myClients; overdue: typeof myClients };
      daily: { paid: typeof myClients; pending: typeof myClients; overdue: typeof myClients };
      other: { paid: typeof myClients; pending: typeof myClients; overdue: typeof myClients };
      totals: { total: number; paid: number; pending: number; overdue: number };
    }>();

    // Inicializar rotas
    myRoutes.forEach(route => {
      result.set(route.id, {
        routeName: route.name,
        monthly: { paid: [], pending: [], overdue: [] },
        weekly: { paid: [], pending: [], overdue: [] },
        daily: { paid: [], pending: [], overdue: [] },
        other: { paid: [], pending: [], overdue: [] },
        totals: { total: 0, paid: 0, pending: 0, overdue: 0 }
      });
    });

    // Adicionar rota "Sem Rota" para clientes sem rota
    result.set('sem-rota', {
      routeName: 'Sem Rota',
      monthly: { paid: [], pending: [], overdue: [] },
      weekly: { paid: [], pending: [], overdue: [] },
      daily: { paid: [], pending: [], overdue: [] },
      other: { paid: [], pending: [], overdue: [] },
      totals: { total: 0, paid: 0, pending: 0, overdue: 0 }
    });

    // Classificar cada cliente
    myClients.forEach(client => {
      if (client.status === 'INACTIVE') return; // Ignorar inativos

      const routeId = client.routeId || 'sem-rota';
      const routeData = result.get(routeId);
      if (!routeData) return;

      const classification = classifyClient(client.id);
      const frequency = client.paymentFrequency || 'Mensal';
      
      let frequencyGroup: 'monthly' | 'weekly' | 'daily' | 'other';
      if (frequency === 'Mensal') frequencyGroup = 'monthly';
      else if (frequency === 'Semanal') frequencyGroup = 'weekly';
      else if (frequency === 'Diário') frequencyGroup = 'daily';
      else frequencyGroup = 'other';

      // Adicionar cliente ao grupo correto
      const clientWithClassification = { ...client, classification };
      
      if (classification.status === 'paid') {
        routeData[frequencyGroup].paid.push(clientWithClassification as any);
        routeData.totals.paid++;
      } else if (classification.status === 'overdue') {
        routeData[frequencyGroup].overdue.push(clientWithClassification as any);
        routeData.totals.overdue++;
      } else {
        routeData[frequencyGroup].pending.push(clientWithClassification as any);
        routeData.totals.pending++;
      }
      routeData.totals.total++;
    });

    return result;
  }, [myClients, myRoutes, clientSummaries]);

  // Calcular totais gerais
  const globalTotals = useMemo(() => {
    let total = 0, paid = 0, pending = 0, overdue = 0;
    let monthlyPending = 0, weeklyPending = 0, dailyPending = 0;

    clientsByRouteAndStatus.forEach(route => {
      total += route.totals.total;
      paid += route.totals.paid;
      pending += route.totals.pending;
      overdue += route.totals.overdue;
      
      monthlyPending += route.monthly.pending.length + route.monthly.overdue.length;
      weeklyPending += route.weekly.pending.length + route.weekly.overdue.length;
      dailyPending += route.daily.pending.length + route.daily.overdue.length;
    });

    return { total, paid, pending, overdue, monthlyPending, weeklyPending, dailyPending };
  }, [clientsByRouteAndStatus]);

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

  const getStatusBadge = (status: string, daysOverdue: number) => {
    if (status === 'paid') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
          <CheckCircle size={12} />
          Em dia
        </span>
      );
    } else if (status === 'overdue') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
          <AlertTriangle size={12} />
          {daysOverdue}d atraso
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
          <Clock size={12} />
          Pendente
        </span>
      );
    }
  };

  const renderClientList = (clients: any[], title: string, bgColor: string) => {
    if (clients.length === 0) return null;

    return (
      <div className={`${bgColor} rounded-lg p-3 mb-2`}>
        <h5 className="font-medium text-sm text-gray-700 mb-2">{title} ({clients.length})</h5>
        <div className="space-y-2">
          {clients.map(client => {
            const summary = clientSummaries.find(s => s.clientId === client.id);
            return (
              <div key={client.id} className="bg-white rounded-lg p-2 shadow-sm flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 text-sm truncate">{client.name}</p>
                  <p className="text-xs text-gray-500 truncate">{client.address}</p>
                  {summary?.paidUntil && (
                    <p className="text-xs text-gray-400">
                      Pago até: {new Date(summary.paidUntil).toLocaleDateString('pt-PT')}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 ml-2">
                  {getStatusBadge(client.classification?.status, client.classification?.daysOverdue || 0)}
                  <span className="text-xs text-gray-500">{client.paymentFrequency || 'Mensal'}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <LayoutDashboard className="text-amber-600" />
            Dashboard
          </h2>
          <p className="text-gray-500">Visão geral dos clientes e pagamentos por rota</p>
        </div>
      </div>

      {/* Cards de Resumo - Clicáveis */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          onClick={() => setStatusFilter(statusFilter === 'all' ? 'all' : 'all')}
          className={`bg-white rounded-xl p-4 shadow-sm border-2 transition-all text-left ${
            statusFilter === 'all' ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-100 hover:border-blue-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase">Total Clientes</p>
              <p className="text-2xl font-bold text-gray-800">{globalTotals.total}</p>
            </div>
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="text-blue-600" size={24} />
            </div>
          </div>
          {statusFilter === 'all' && (
            <p className="text-xs text-blue-600 mt-2 font-medium">✓ Mostrando todos</p>
          )}
        </button>

        <button
          onClick={() => setStatusFilter(statusFilter === 'paid' ? 'all' : 'paid')}
          className={`bg-white rounded-xl p-4 shadow-sm border-2 transition-all text-left ${
            statusFilter === 'paid' ? 'border-green-500 ring-2 ring-green-200' : 'border-gray-100 hover:border-green-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase">Em Dia</p>
              <p className="text-2xl font-bold text-green-600">{globalTotals.paid}</p>
            </div>
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="text-green-600" size={24} />
            </div>
          </div>
          {statusFilter === 'paid' && (
            <p className="text-xs text-green-600 mt-2 font-medium">✓ Filtrando em dia</p>
          )}
        </button>

        <button
          onClick={() => setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending')}
          className={`bg-white rounded-xl p-4 shadow-sm border-2 transition-all text-left ${
            statusFilter === 'pending' ? 'border-amber-500 ring-2 ring-amber-200' : 'border-gray-100 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase">Pendentes</p>
              <p className="text-2xl font-bold text-amber-600">{globalTotals.pending}</p>
            </div>
            <div className="p-2 bg-amber-100 rounded-lg">
              <Clock className="text-amber-600" size={24} />
            </div>
          </div>
          {statusFilter === 'pending' && (
            <p className="text-xs text-amber-600 mt-2 font-medium">✓ Filtrando pendentes</p>
          )}
        </button>

        <button
          onClick={() => setStatusFilter(statusFilter === 'overdue' ? 'all' : 'overdue')}
          className={`bg-white rounded-xl p-4 shadow-sm border-2 transition-all text-left ${
            statusFilter === 'overdue' ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-100 hover:border-red-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase">Em Atraso</p>
              <p className="text-2xl font-bold text-red-600">{globalTotals.overdue}</p>
            </div>
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="text-red-600" size={24} />
            </div>
          </div>
          {statusFilter === 'overdue' && (
            <p className="text-xs text-red-600 mt-2 font-medium">✓ Filtrando em atraso</p>
          )}
        </button>
      </div>

      {/* Cards por Tipo de Pagamento */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="text-purple-600" size={20} />
            <span className="font-semibold text-purple-800">Mensais</span>
          </div>
          <p className="text-3xl font-bold text-purple-700">{globalTotals.monthlyPending}</p>
          <p className="text-sm text-purple-600">clientes com pagamento pendente</p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <CalendarDays className="text-blue-600" size={20} />
            <span className="font-semibold text-blue-800">Semanais</span>
          </div>
          <p className="text-3xl font-bold text-blue-700">{globalTotals.weeklyPending}</p>
          <p className="text-sm text-blue-600">clientes com pagamento pendente</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="text-green-600" size={20} />
            <span className="font-semibold text-green-800">Diários</span>
          </div>
          <p className="text-3xl font-bold text-green-700">{globalTotals.dailyPending}</p>
          <p className="text-sm text-green-600">clientes com pagamento pendente</p>
        </div>
      </div>

      {/* Filtro */}
      <div className="flex items-center gap-2 bg-white rounded-xl p-2 shadow-sm border border-gray-100">
        <Filter size={18} className="text-gray-400 ml-2" />
        <span className="text-sm text-gray-500">Filtrar por:</span>
        <div className="flex gap-1 flex-wrap">
          {[
            { key: 'all', label: 'Todos' },
            { key: 'monthly', label: 'Mensais' },
            { key: 'weekly', label: 'Semanais' },
            { key: 'daily', label: 'Diários' }
          ].map(filter => (
            <button
              key={filter.key}
              onClick={() => setFilterType(filter.key as any)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filterType === filter.key
                  ? 'bg-amber-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista por Rotas */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <MapPin className="text-amber-600" size={20} />
          Clientes por Rota
        </h3>

        {Array.from(clientsByRouteAndStatus.entries()).map(([routeId, routeData]) => {
          // Filtrar clientes baseado no filtro de frequência
          let clientsToShow: { pending: any[]; overdue: any[]; paid: any[] };
          
          if (filterType === 'monthly') {
            clientsToShow = routeData.monthly;
          } else if (filterType === 'weekly') {
            clientsToShow = routeData.weekly;
          } else if (filterType === 'daily') {
            clientsToShow = routeData.daily;
          } else {
            // Combinar todos
            clientsToShow = {
              pending: [...routeData.monthly.pending, ...routeData.weekly.pending, ...routeData.daily.pending, ...routeData.other.pending],
              overdue: [...routeData.monthly.overdue, ...routeData.weekly.overdue, ...routeData.daily.overdue, ...routeData.other.overdue],
              paid: [...routeData.monthly.paid, ...routeData.weekly.paid, ...routeData.daily.paid, ...routeData.other.paid]
            };
          }

          // Aplicar filtro de status
          let filteredClients = { ...clientsToShow };
          if (statusFilter === 'paid') {
            filteredClients = { pending: [], overdue: [], paid: clientsToShow.paid };
          } else if (statusFilter === 'pending') {
            filteredClients = { pending: clientsToShow.pending, overdue: [], paid: [] };
          } else if (statusFilter === 'overdue') {
            filteredClients = { pending: [], overdue: clientsToShow.overdue, paid: [] };
          }

          const totalPending = filteredClients.pending.length + filteredClients.overdue.length;
          const totalPaid = filteredClients.paid.length;
          const totalInRoute = totalPending + totalPaid;

          if (totalInRoute === 0) return null;

          const isExpanded = expandedRoutes.has(routeId);

          return (
            <div key={routeId} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <button
                onClick={() => toggleRoute(routeId)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <MapPin className="text-amber-600" size={18} />
                  </div>
                  <div className="text-left">
                    <span className="font-semibold text-gray-800">{routeData.routeName}</span>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-gray-500">{totalInRoute} clientes</span>
                      {totalPending > 0 && (
                        <span className="text-red-600 font-medium">{totalPending} pendentes</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {/* Mini badges de status */}
                  <div className="hidden sm:flex items-center gap-2">
                    {filteredClients.overdue.length > 0 && (
                      <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                        {filteredClients.overdue.length} atraso
                      </span>
                    )}
                    {filteredClients.pending.length > 0 && (
                      <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                        {filteredClients.pending.length} pendente
                      </span>
                    )}
                    {filteredClients.paid.length > 0 && (
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                        {filteredClients.paid.length} ok
                      </span>
                    )}
                  </div>
                  {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 border-t border-gray-100">
                  <div className="pt-4 space-y-3">
                    {/* Em Atraso */}
                    {renderClientList(
                      filteredClients.overdue,
                      '🚨 Em Atraso',
                      'bg-red-50'
                    )}
                    
                    {/* Pendentes */}
                    {renderClientList(
                      filteredClients.pending,
                      '⏳ Pagamento Pendente',
                      'bg-amber-50'
                    )}
                    
                    {/* Em Dia */}
                    {renderClientList(
                      filteredClients.paid,
                      '✅ Em Dia',
                      'bg-green-50'
                    )}

                    {totalInRoute === 0 && (
                      <p className="text-center text-gray-500 py-4">
                        Nenhum cliente nesta rota com o filtro selecionado
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DriverDashboard;
