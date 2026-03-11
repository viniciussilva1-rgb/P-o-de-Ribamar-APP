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
          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs" style={{ backgroundColor: 'rgba(34,197,94,0.2)', color: '#22C55E' }}>
            <CheckCircle size={10} /> Entregue
          </span>
        );
      case 'not_delivered':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs" style={{ backgroundColor: 'rgba(239,68,68,0.2)', color: '#EF4444' }}>
            <XCircle size={10} /> Não Entregue
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs" style={{ backgroundColor: 'rgba(251,191,36,0.2)', color: '#FBBF24' }}>
            <Clock size={10} /> Pendente
          </span>
        );
    }
  };

  const getProgressBar = (delivered: number, total: number) => {
    const percentage = total > 0 ? (delivered / total) * 100 : 0;
    return (
      <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#2A2E3A' }}>
        <div 
          className="h-full transition-all duration-300"
          style={{ width: `${percentage}%`, backgroundColor: '#22C55E' }}
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
          <div className="p-3 rounded-full" style={{ backgroundColor: '#1A1E29' }}>
            <BarChart3 style={{ color: '#F5A623' }} size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold" style={{ color: '#FFFFFF' }}>Painel de Entregas</h2>
            <p className="text-sm" style={{ color: '#A0A8C0' }}>Acompanhe todas as entregas do dia</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ backgroundColor: '#13161E', border: '1px solid rgba(255,255,255,0.07)' }}>
          <Calendar size={18} style={{ color: '#A0A8C0' }} />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border-none focus:ring-0 text-sm"
            style={{ backgroundColor: '#13161E', color: '#FFFFFF' }}
          />
        </div>
      </div>

      {/* Cards de Resumo Geral */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {[
          { title: 'Total Entregas', value: report.totals.totalDeliveries, icon: Users, color: '#3B82F6' },
          { title: 'Entregues', value: report.totals.deliveredCount, icon: CheckCircle, color: '#22C55E' },
          { title: 'Não Entregues', value: report.totals.notDeliveredCount, icon: XCircle, color: '#EF4444' },
          { title: 'Pendentes', value: report.totals.pendingCount, icon: Clock, color: '#FBBF24' },
          { title: 'Valor Total', value: `€${report.totals.totalValue.toFixed(2)}`, icon: DollarSign, color: '#8B5CF6' },
          { title: 'Valor Entregue', value: `€${report.totals.deliveredValue.toFixed(2)}`, icon: CheckCircle, color: '#22C55E' },
          { title: 'Abatimentos', value: `€${report.totals.adjustedValue.toFixed(2)}`, icon: TrendingDown, color: '#F5A623' }
        ].map((card, idx) => (
          <div key={idx} className="rounded-xl p-4 border" style={{ backgroundColor: '#13161E', borderColor: 'rgba(255,255,255,0.07)' }}>
            <div className="flex items-center gap-2 mb-2">
              <card.icon style={{ color: card.color }} size={18} />
              <span className="text-xs" style={{ color: '#A0A8C0' }}>{card.title}</span>
            </div>
            <span className="text-2xl font-bold" style={{ color: card.color }}>{card.value}</span>
          </div>
        ))}
      </div>

      {/* Alerta de entregadores sem entregas */}
      {driversWithoutDeliveries.length > 0 && (
        <div className="rounded-xl p-4 border" style={{ backgroundColor: '#1A1E29', borderColor: 'rgba(251,191,36,0.2)' }}>
          <div className="flex items-center gap-2" style={{ color: '#FBBF24' }}>
            <AlertTriangle size={20} />
            <span className="font-medium">Entregadores sem entregas registradas:</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {driversWithoutDeliveries.map(driver => (
              <span key={driver.id} className="px-3 py-1 rounded-full text-sm" style={{ backgroundColor: 'rgba(251,191,36,0.15)', color: '#FBBF24' }}>
                {driver.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Breakdown por Produto */}
      {report.totals.productBreakdown.length > 0 && (
        <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: '#13161E', borderColor: 'rgba(255,255,255,0.07)' }}>
          <div className="px-4 py-3 border-b" style={{ backgroundColor: '#1A1E29', borderColor: 'rgba(255,255,255,0.07)' }}>
            <h3 className="font-semibold flex items-center gap-2" style={{ color: '#FFFFFF' }}>
              <Package size={18} />
              Produtos Necessários Hoje
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: '#1A1E29', borderColor: 'rgba(255,255,255,0.07)' }} className="border-b">
                  <th className="text-left px-4 py-3 text-sm font-medium" style={{ color: '#A0A8C0' }}>Produto</th>
                  <th className="text-center px-4 py-3 text-sm font-medium" style={{ color: '#A0A8C0' }}>Total</th>
                  <th className="text-center px-4 py-3 text-sm font-medium" style={{ color: '#A0A8C0' }}>Entregue</th>
                  <th className="text-center px-4 py-3 text-sm font-medium" style={{ color: '#A0A8C0' }}>Não Entregue</th>
                  <th className="text-center px-4 py-3 text-sm font-medium" style={{ color: '#A0A8C0' }}>Progresso</th>
                </tr>
              </thead>
              <tbody>
                {report.totals.productBreakdown.map(item => (
                  <tr key={item.productId} style={{ borderColor: 'rgba(255,255,255,0.03)' }} className="border-b" onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1A1E29')} onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}>
                    <td className="px-4 py-3 font-medium" style={{ color: '#FFFFFF' }}>{item.productName}</td>
                    <td className="px-4 py-3 text-center font-medium" style={{ color: '#3B82F6' }}>{item.totalQuantity}</td>
                    <td className="px-4 py-3 text-center" style={{ color: '#22C55E' }}>{item.deliveredQuantity}</td>
                    <td className="px-4 py-3 text-center" style={{ color: '#EF4444' }}>{item.notDeliveredQuantity}</td>
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
      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: '#13161E', borderColor: 'rgba(255,255,255,0.07)' }}>
        <div className="px-4 py-3 border-b flex items-center justify-between" style={{ backgroundColor: '#1A1E29', borderColor: 'rgba(255,255,255,0.07)' }}>
          <h3 className="font-semibold flex items-center gap-2" style={{ color: '#FFFFFF' }}>
            <Truck size={18} />
            Entregas por Entregador
          </h3>
          <div className="flex items-center gap-2">
            <Filter size={16} style={{ color: '#A0A8C0' }} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="text-sm rounded px-2 py-1"
              style={{ backgroundColor: '#1A1E29', borderColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.07)', color: '#FFFFFF' }}
            >
              <option value="all">Todos</option>
              <option value="pending">Pendentes</option>
              <option value="delivered">Entregues</option>
              <option value="not_delivered">Não Entregues</option>
            </select>
          </div>
        </div>
        
        {report.drivers.length === 0 ? (
          <div className="p-8 text-center" style={{ color: '#A0A8C0' }}>
            <Truck size={48} className="mx-auto mb-3" style={{ color: '#505569' }} />
            <p>Nenhuma entrega registrada para esta data.</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
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
                    className="w-full flex items-center justify-between p-4 transition-colors"
                    style={{ backgroundColor: '#13161E' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1A1E29')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#13161E')}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full" style={{ backgroundColor: 'rgba(59,130,246,0.15)' }}>
                        <Truck style={{ color: '#3B82F6' }} size={20} />
                      </div>
                      <div className="text-left">
                        <span className="font-medium" style={{ color: '#FFFFFF' }}>{driverReport.driverName}</span>
                        <div className="flex items-center gap-4 text-sm" style={{ color: '#A0A8C0' }}>
                          <span className="flex items-center gap-1">
                            <CheckCircle size={12} style={{ color: '#22C55E' }} />
                            {driverReport.summary.totalDelivered}
                          </span>
                          <span className="flex items-center gap-1">
                            <XCircle size={12} style={{ color: '#EF4444' }} />
                            {driverReport.summary.totalNotDelivered}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock size={12} style={{ color: '#FBBF24' }} />
                            {driverReport.summary.totalPending}
                          </span>
                          <span className="font-medium" style={{ color: '#22C55E' }}>
                            €{driverReport.summary.deliveredValue.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="text-lg font-bold" style={{
                          color: deliveryRate >= 80 ? '#22C55E' : deliveryRate >= 50 ? '#FBBF24' : '#EF4444'
                        }}>
                          {deliveryRate}%
                        </span>
                        <span className="text-xs block" style={{ color: '#505569' }}>concluído</span>
                      </div>
                      {isExpanded ? <ChevronDown size={20} style={{ color: '#A0A8C0' }} /> : <ChevronRight size={20} style={{ color: '#A0A8C0' }} />}
                    </div>
                  </button>
                  
                  {isExpanded && (
                    <div className="px-4 pb-4" style={{ backgroundColor: '#1A1E29' }}>
                      {/* Resumo por Rota */}
                      {driverReport.summary.routeTotals.length > 0 && (
                        <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-2">
                          {driverReport.summary.routeTotals.map(rt => (
                            <div key={rt.routeId} className="rounded-lg p-3 border" style={{ backgroundColor: '#13161E', borderColor: 'rgba(255,255,255,0.07)' }}>
                              <div className="flex items-center gap-1 mb-1">
                                <MapPin size={14} style={{ color: '#3B82F6' }} />
                                <span className="text-sm font-medium" style={{ color: '#FFFFFF' }}>{rt.routeName}</span>
                              </div>
                              <div className="text-xs" style={{ color: '#A0A8C0' }}>
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
                      <div className="rounded-lg border overflow-hidden" style={{ backgroundColor: '#13161E', borderColor: 'rgba(255,255,255,0.07)' }}>
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b" style={{ backgroundColor: '#1A1E29', borderColor: 'rgba(255,255,255,0.07)' }}>
                              <th className="text-left px-3 py-2 font-medium" style={{ color: '#A0A8C0' }}>Cliente</th>
                              <th className="text-left px-3 py-2 font-medium" style={{ color: '#A0A8C0' }}>Rota</th>
                              <th className="text-left px-3 py-2 font-medium" style={{ color: '#A0A8C0' }}>Produtos</th>
                              <th className="text-center px-3 py-2 font-medium" style={{ color: '#A0A8C0' }}>Valor</th>
                              <th className="text-center px-3 py-2 font-medium" style={{ color: '#A0A8C0' }}>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredDeliveries.map(delivery => (
                              <tr key={delivery.id} style={{ borderColor: 'rgba(255,255,255,0.03)' }} className="border-b" onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1A1E29')} onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}>
                                <td className="px-3 py-2">
                                  <div className="font-medium" style={{ color: '#FFFFFF' }}>{delivery.clientName}</div>
                                  <div className="text-xs" style={{ color: '#A0A8C0' }}>{delivery.clientAddress}</div>
                                </td>
                                <td className="px-3 py-2" style={{ color: '#A0A8C0' }}>
                                  {getRouteName(delivery.routeId)}
                                </td>
                                <td className="px-3 py-2">
                                  <div className="flex flex-wrap gap-1">
                                    {delivery.items.map(item => (
                                      <span key={item.productId} className="px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: '#1A1E29', color: '#A0A8C0' }}>
                                        {getProductName(item.productId)}: {item.quantity}
                                      </span>
                                    ))}
                                  </div>
                                </td>
                                <td className="px-3 py-2 text-center font-medium" style={{ color: '#22C55E' }}>
                                  €{delivery.totalValue.toFixed(2)}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  {getStatusBadge(delivery.status)}
                                  {delivery.status === 'not_delivered' && delivery.notDeliveredReason && (
                                    <div className="text-xs mt-1" style={{ color: '#EF4444' }}>
                                      {delivery.notDeliveredReason}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        
                        {filteredDeliveries.length === 0 && (
                          <div className="p-4 text-center text-sm" style={{ color: '#A0A8C0' }}>
                            Nenhuma entrega com o filtro selecionado.
                          </div>
                        )}
                      </div>
                      
                      {/* Impacto Financeiro */}
                      {driverReport.summary.adjustedValue > 0 && (
                        <div className="mt-3 p-3 rounded-lg border" style={{ backgroundColor: '#1A1E29', borderColor: 'rgba(245,166,35,0.2)' }}>
                          <div className="flex items-center justify-between">
                            <span className="font-medium flex items-center gap-2" style={{ color: '#F5A623' }}>
                              <TrendingDown size={16} />
                              Abatimentos (não entregas):
                            </span>
                            <span className="font-bold" style={{ color: '#F5A623' }}>
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
