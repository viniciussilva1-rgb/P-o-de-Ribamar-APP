import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { ClientDelivery, DeliveryStatus } from '../types';
import { 
  Package, Truck, Calendar, CheckCircle, XCircle, Clock,
  Users, DollarSign, AlertTriangle, ChevronDown, ChevronRight,
  MapPin, BarChart3, TrendingDown, Filter, RefreshCw
} from 'lucide-react';

const AdminDeliveryDashboard: React.FC = () => {
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [expandedDriver, setExpandedDriver] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<DeliveryStatus | 'all'>('all');
  
  const { 
    getAdminDeliveryReport,
    products,
    routes,
    getDrivers,
    clientDeliveries
  } = useData();

  const report = getAdminDeliveryReport(selectedDate);
  const drivers = getDrivers();

  // Verificar entregadores sem entregas registradas
  const driversWithDeliveries = new Set(report.drivers.map(d => d.driverId));
  const driversWithoutDeliveries = drivers.filter(d => !driversWithDeliveries.has(d.id));

  const getStatusBadge = (status: DeliveryStatus) => {
    switch (status) {
      case 'delivered':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
            <CheckCircle size={10} /> Entregue
          </span>
        );
      case 'not_delivered':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs">
            <XCircle size={10} /> Não Entregue
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs">
            <Clock size={10} /> Pendente
          </span>
        );
    }
  };

  const getProgressBar = (delivered: number, total: number) => {
    const percentage = total > 0 ? (delivered / total) * 100 : 0;
    return (
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className="h-full bg-green-500 transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    );
  };

  const getProductName = (productId: string) => {
    return products.find(p => p.id === productId)?.name || 'Produto';
  };

  const getRouteName = (routeId?: string) => {
    if (!routeId) return 'Sem Rota';
    return routes.find(r => r.id === routeId)?.name || 'Rota';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-100 p-3 rounded-full">
            <BarChart3 className="text-indigo-700" size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Painel de Entregas</h2>
            <p className="text-sm text-gray-500">Acompanhe todas as entregas do dia</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
          <Calendar size={18} className="text-gray-400" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border-none focus:ring-0 text-sm"
          />
        </div>
      </div>

      {/* Cards de Resumo Geral */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Users className="text-blue-500" size={18} />
            <span className="text-xs text-gray-500">Total Entregas</span>
          </div>
          <span className="text-2xl font-bold text-blue-600">{report.totals.totalDeliveries}</span>
        </div>
        
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="text-green-500" size={18} />
            <span className="text-xs text-gray-500">Entregues</span>
          </div>
          <span className="text-2xl font-bold text-green-600">{report.totals.deliveredCount}</span>
        </div>
        
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="text-red-500" size={18} />
            <span className="text-xs text-gray-500">Não Entregues</span>
          </div>
          <span className="text-2xl font-bold text-red-600">{report.totals.notDeliveredCount}</span>
        </div>
        
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="text-yellow-500" size={18} />
            <span className="text-xs text-gray-500">Pendentes</span>
          </div>
          <span className="text-2xl font-bold text-yellow-600">{report.totals.pendingCount}</span>
        </div>
        
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="text-purple-500" size={18} />
            <span className="text-xs text-gray-500">Valor Total</span>
          </div>
          <span className="text-xl font-bold text-purple-600">€{report.totals.totalValue.toFixed(2)}</span>
        </div>
        
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="text-green-500" size={18} />
            <span className="text-xs text-gray-500">Valor Entregue</span>
          </div>
          <span className="text-xl font-bold text-green-600">€{report.totals.deliveredValue.toFixed(2)}</span>
        </div>
        
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="text-orange-500" size={18} />
            <span className="text-xs text-gray-500">Abatimentos</span>
          </div>
          <span className="text-xl font-bold text-orange-600">€{report.totals.adjustedValue.toFixed(2)}</span>
        </div>
      </div>

      {/* Alerta de entregadores sem entregas */}
      {driversWithoutDeliveries.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-yellow-700">
            <AlertTriangle size={20} />
            <span className="font-medium">Entregadores sem entregas registradas:</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {driversWithoutDeliveries.map(driver => (
              <span key={driver.id} className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                {driver.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Breakdown por Produto */}
      {report.totals.productBreakdown.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <Package size={18} />
              Produtos Necessários Hoje
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Produto</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Total</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Entregue</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Não Entregue</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Progresso</th>
                </tr>
              </thead>
              <tbody>
                {report.totals.productBreakdown.map(item => (
                  <tr key={item.productId} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{item.productName}</td>
                    <td className="px-4 py-3 text-center text-blue-600 font-medium">{item.totalQuantity}</td>
                    <td className="px-4 py-3 text-center text-green-600">{item.deliveredQuantity}</td>
                    <td className="px-4 py-3 text-center text-red-600">{item.notDeliveredQuantity}</td>
                    <td className="px-4 py-3">
                      <div className="w-24 mx-auto">
                        {getProgressBar(item.deliveredQuantity, item.totalQuantity)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Entregas por Entregador */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <Truck size={18} />
            Entregas por Entregador
          </h3>
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="text-sm border border-gray-200 rounded px-2 py-1"
            >
              <option value="all">Todos</option>
              <option value="pending">Pendentes</option>
              <option value="delivered">Entregues</option>
              <option value="not_delivered">Não Entregues</option>
            </select>
          </div>
        </div>
        
        {report.drivers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Truck size={48} className="mx-auto mb-3 text-gray-300" />
            <p>Nenhuma entrega registrada para esta data.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {report.drivers.map(driverReport => {
              const isExpanded = expandedDriver === driverReport.driverId;
              const filteredDeliveries = statusFilter === 'all' 
                ? driverReport.deliveries 
                : driverReport.deliveries.filter(d => d.status === statusFilter);
              
              const deliveryRate = driverReport.summary.totalClients > 0
                ? Math.round((driverReport.summary.totalDelivered / driverReport.summary.totalClients) * 100)
                : 0;
              
              return (
                <div key={driverReport.driverId}>
                  <button
                    onClick={() => setExpandedDriver(isExpanded ? null : driverReport.driverId)}
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-100 p-2 rounded-full">
                        <Truck className="text-blue-600" size={20} />
                      </div>
                      <div className="text-left">
                        <span className="font-medium text-gray-800">{driverReport.driverName}</span>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <CheckCircle size={12} className="text-green-500" />
                            {driverReport.summary.totalDelivered}
                          </span>
                          <span className="flex items-center gap-1">
                            <XCircle size={12} className="text-red-500" />
                            {driverReport.summary.totalNotDelivered}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock size={12} className="text-yellow-500" />
                            {driverReport.summary.totalPending}
                          </span>
                          <span className="text-green-600 font-medium">
                            €{driverReport.summary.deliveredValue.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className={`text-lg font-bold ${
                          deliveryRate >= 80 ? 'text-green-600' : 
                          deliveryRate >= 50 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {deliveryRate}%
                        </span>
                        <span className="text-xs text-gray-400 block">concluído</span>
                      </div>
                      {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                    </div>
                  </button>
                  
                  {isExpanded && (
                    <div className="bg-gray-50 px-4 pb-4">
                      {/* Resumo por Rota */}
                      {driverReport.summary.routeTotals.length > 0 && (
                        <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-2">
                          {driverReport.summary.routeTotals.map(rt => (
                            <div key={rt.routeId} className="bg-white rounded-lg p-3 border border-gray-200">
                              <div className="flex items-center gap-1 mb-1">
                                <MapPin size={14} className="text-blue-500" />
                                <span className="text-sm font-medium text-gray-700">{rt.routeName}</span>
                              </div>
                              <div className="text-xs text-gray-500">
                                {rt.clientCount} clientes | €{rt.totalValue.toFixed(2)}
                              </div>
                              <div className="mt-1">
                                {getProgressBar(rt.deliveredCount, rt.clientCount)}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Lista de Entregas */}
                      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gray-100 border-b border-gray-200">
                              <th className="text-left px-3 py-2 font-medium text-gray-600">Cliente</th>
                              <th className="text-left px-3 py-2 font-medium text-gray-600">Rota</th>
                              <th className="text-left px-3 py-2 font-medium text-gray-600">Produtos</th>
                              <th className="text-center px-3 py-2 font-medium text-gray-600">Valor</th>
                              <th className="text-center px-3 py-2 font-medium text-gray-600">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredDeliveries.map(delivery => (
                              <tr key={delivery.id} className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="px-3 py-2">
                                  <div className="font-medium text-gray-800">{delivery.clientName}</div>
                                  <div className="text-xs text-gray-500">{delivery.clientAddress}</div>
                                </td>
                                <td className="px-3 py-2 text-gray-600">
                                  {getRouteName(delivery.routeId)}
                                </td>
                                <td className="px-3 py-2">
                                  <div className="flex flex-wrap gap-1">
                                    {delivery.items.map(item => (
                                      <span key={item.productId} className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">
                                        {getProductName(item.productId)}: {item.quantity}
                                      </span>
                                    ))}
                                  </div>
                                </td>
                                <td className="px-3 py-2 text-center font-medium text-green-600">
                                  €{delivery.totalValue.toFixed(2)}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  {getStatusBadge(delivery.status)}
                                  {delivery.status === 'not_delivered' && delivery.notDeliveredReason && (
                                    <div className="text-xs text-red-500 mt-1">
                                      {delivery.notDeliveredReason}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        
                        {filteredDeliveries.length === 0 && (
                          <div className="p-4 text-center text-gray-500 text-sm">
                            Nenhuma entrega com o filtro selecionado.
                          </div>
                        )}
                      </div>
                      
                      {/* Impacto Financeiro */}
                      {driverReport.summary.adjustedValue > 0 && (
                        <div className="mt-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                          <div className="flex items-center justify-between">
                            <span className="text-orange-700 font-medium flex items-center gap-2">
                              <TrendingDown size={16} />
                              Abatimentos (não entregas):
                            </span>
                            <span className="text-orange-800 font-bold">
                              -€{driverReport.summary.adjustedValue.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDeliveryDashboard;
