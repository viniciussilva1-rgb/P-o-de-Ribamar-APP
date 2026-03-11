import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { 
  Package, Truck, Calendar, TrendingUp, TrendingDown, 
  AlertTriangle, CheckCircle, BarChart3, Users, ArrowRight,
  ChevronDown, ChevronRight, Lightbulb, RefreshCw
} from 'lucide-react';

const AdminDailyLoadReport: React.FC = () => {
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [expandedDriver, setExpandedDriver] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const { 
    getDailyLoadReport, 
    getProductionSuggestions, 
    products,
    getDrivers,
    dailyLoads
  } = useData();

  const report = getDailyLoadReport(selectedDate);
  const suggestions = getProductionSuggestions(7);
  const drivers = getDrivers();

  // Verificar quais entregadores ainda não registraram carga
  const driversWithLoad = new Set(report.drivers.map(d => d.driverId));
  const driversWithoutLoad = drivers.filter(d => !driversWithLoad.has(d.id));

  const getStatusColor = (rate: number) => {
    if (rate >= 90) return 'text-green-400 bg-green-500/20';
    if (rate >= 70) return 'text-yellow-400 bg-yellow-500/20';
    return 'text-red-400 bg-red-500/20';
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp size={14} className="text-green-500" />;
      case 'down': return <TrendingDown size={14} className="text-red-500" />;
      default: return <ArrowRight size={14} className="text-gray-400" />;
    }
  };

  const getConfidenceLabel = (confidence: 'low' | 'medium' | 'high') => {
    switch (confidence) {
      case 'high': return { text: 'Alta', color: 'text-green-400 bg-green-500/20' };
      case 'medium': return { text: 'Média', color: 'text-yellow-400 bg-yellow-500/20' };
      default: return { text: 'Baixa', color: 'text-gray-400 bg-gray-500/20' };
    }
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
            <h2 className="text-xl font-bold" style={{ color: '#FFFFFF' }}>Relatório de Carga do Dia</h2>
            <p className="text-sm" style={{ color: '#A0A8C0' }}>Acompanhe cargas, vendas e sobras</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setShowSuggestions(!showSuggestions)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors`}
            style={{
              backgroundColor: showSuggestions ? '#1A1E29' : '#13161E',
              borderColor: showSuggestions ? '#F5A623' : 'rgba(255,255,255,0.07)',
              color: showSuggestions ? '#F5A623' : '#A0A8C0'
            }}
          >
            <Lightbulb size={18} />
            Sugestões de Produção
          </button>
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
      </div>

      {/* Sugestões de Produção */}
      {showSuggestions && (
        <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: '#13161E', borderColor: 'rgba(245,166,35,0.2)' }}>
          <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'rgba(245,166,35,0.2)', backgroundColor: '#1A1E29' }}>
            <h3 className="font-semibold flex items-center gap-2" style={{ color: '#F5A623' }}>
              <Lightbulb size={18} />
              Sugestões de Produção para Amanhã
            </h3>
            <span className="text-xs" style={{ color: '#A0A8C0' }}>Baseado nos últimos 7 dias</span>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {suggestions.map(suggestion => {
                const conf = getConfidenceLabel(suggestion.confidence);
                return (
                  <div key={suggestion.productId} className="rounded-lg p-3 border" style={{ backgroundColor: '#1A1E29', borderColor: 'rgba(245,166,35,0.15)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium" style={{ color: '#FFFFFF' }}>{suggestion.productName}</span>
                      {getTrendIcon(suggestion.trend)}
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-2xl font-bold" style={{ color: '#F5A623' }}>{suggestion.suggestedQuantity}</span>
                        <span className="text-sm ml-1" style={{ color: '#A0A8C0' }}>un.</span>
                      </div>
                      <div className="text-right">
                        <div className="text-xs" style={{ color: '#A0A8C0' }}>Média venda: {suggestion.avgDaily}</div>
                        <div className="text-xs" style={{ color: '#A0A8C0' }}>Média sobra: {suggestion.avgReturned}</div>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${conf.color}`}>
                        Confiança: {conf.text}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Cards de Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { title: 'Total Carregado', value: report.totals.totalLoaded, unit: 'unidades', icon: Package, color: '#3B82F6' },
          { title: 'Total Vendido', value: report.totals.totalSold, unit: 'unidades', icon: CheckCircle, color: '#22C55E' },
          { title: 'Total Devolvido', value: report.totals.totalReturned, unit: 'unidades', icon: RefreshCw, color: '#F5A623' },
          { title: 'Aproveitamento', value: report.totals.utilizationRate, unit: '%', icon: TrendingUp, color: '#8B5CF6' }
        ].map((card, idx) => (
          <div key={idx} className="rounded-xl p-4 border" style={{ backgroundColor: '#13161E', borderColor: 'rgba(255,255,255,0.07)' }}>
            <div className="flex items-center gap-2 mb-2">
              <card.icon style={{ color: card.color }} size={20} />
              <span className="text-sm" style={{ color: '#A0A8C0' }}>{card.title}</span>
            </div>
            <span className="text-3xl font-bold" style={{ color: card.color }}>{card.value}</span>
            <span className="text-sm ml-1" style={{ color: '#A0A8C0' }}>{card.unit}</span>
          </div>
        ))}
      </div>

      {/* Alertas de entregadores sem carga */}
      {driversWithoutLoad.length > 0 && (
        <div className="rounded-xl p-4 border" style={{ backgroundColor: '#1A1E29', borderColor: 'rgba(234,179,8,0.2)' }}>
          <div className="flex items-center gap-2" style={{ color: '#FBBF24' }}>
            <AlertTriangle size={20} />
            <span className="font-medium">Entregadores sem carga registrada hoje:</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {driversWithoutLoad.map(driver => (
              <span key={driver.id} className="px-3 py-1 rounded-full text-sm" style={{ backgroundColor: 'rgba(251,191,36,0.15)', color: '#FBBF24' }}>
                {driver.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Relatório por Entregador */}
      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: '#13161E', borderColor: 'rgba(255,255,255,0.07)' }}>
        <div className="px-4 py-3 border-b" style={{ backgroundColor: '#1A1E29', borderColor: 'rgba(255,255,255,0.07)' }}>
          <h3 className="font-semibold flex items-center gap-2" style={{ color: '#FFFFFF' }}>
            <Users size={18} />
            Relatório por Entregador
          </h3>
        </div>
        
        {report.drivers.length === 0 ? (
          <div className="p-8 text-center" style={{ color: '#A0A8C0' }}>
            <Package size={48} className="mx-auto mb-3" style={{ color: '#505569' }} />
            <p>Nenhuma carga registrada para esta data.</p>
          </div>
        ) : (
          <div style={{ borderColor: 'rgba(255,255,255,0.05)' }} className="divide-y">
            {report.drivers.map(driverReport => {
              const isExpanded = expandedDriver === driverReport.driverId;
              
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
                        <div className="flex items-center gap-3 text-sm" style={{ color: '#A0A8C0' }}>
                          <span>Carregou: {driverReport.totalLoaded}</span>
                          <span>Vendeu: {driverReport.totalSold}</span>
                          <span>Devolveu: {driverReport.totalReturned}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(driverReport.utilizationRate)}`}>
                        {driverReport.utilizationRate}% aproveitamento
                      </span>
                      {isExpanded ? <ChevronDown size={20} style={{ color: '#A0A8C0' }} /> : <ChevronRight size={20} style={{ color: '#A0A8C0' }} />}
                    </div>
                  </button>
                  
                  {isExpanded && (
                    <div className="px-4 pb-4" style={{ backgroundColor: '#1A1E29' }}>
                      {driverReport.loads.map(load => (
                        <div key={load.id} className="rounded-lg p-4 mt-2 border" style={{ backgroundColor: '#13161E', borderColor: 'rgba(255,255,255,0.07)' }}>
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm" style={{ color: '#A0A8C0' }}>
                              Saída: {load.loadStartTime ? new Date(load.loadStartTime).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                              {load.returnTime && ` | Retorno: ${new Date(load.returnTime).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              load.status === 'completed' ? 'text-green-400 bg-green-500/20' :
                              load.status === 'in_route' ? 'text-blue-400 bg-blue-500/20' :
                              'text-gray-400 bg-gray-500/20'
                            }`}>
                              {load.status === 'completed' ? 'Finalizado' :
                               load.status === 'in_route' ? 'Em Rota' : 'Carregando'}
                            </span>
                          </div>
                          
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr style={{ borderColor: 'rgba(255,255,255,0.07)' }} className="border-b">
                                  <th className="text-left py-2 font-medium" style={{ color: '#A0A8C0' }}>Produto</th>
                                  <th className="text-center py-2 font-medium" style={{ color: '#A0A8C0' }}>Carregado</th>
                                  <th className="text-center py-2 font-medium" style={{ color: '#A0A8C0' }}>Vendido</th>
                                  <th className="text-center py-2 font-medium" style={{ color: '#A0A8C0' }}>Devolvido</th>
                                  <th className="text-center py-2 font-medium" style={{ color: '#A0A8C0' }}>%</th>
                                </tr>
                              </thead>
                              <tbody>
                                {load.loadItems.map(item => {
                                  const returnItem = load.returnItems?.find(r => r.productId === item.productId);
                                  const product = products.find(p => p.id === item.productId);
                                  const utilization = item.quantity > 0 
                                    ? Math.round(((returnItem?.sold || 0) / item.quantity) * 100) 
                                    : 0;
                                  
                                  return (
                                    <tr key={item.productId} style={{ borderColor: 'rgba(255,255,255,0.03)' }} className="border-b">
                                      <td className="py-2" style={{ color: '#FFFFFF' }}>{product?.name}</td>
                                      <td className="py-2 text-center" style={{ color: '#3B82F6' }}>{item.quantity}</td>
                                      <td className="py-2 text-center" style={{ color: '#22C55E' }}>{returnItem?.sold || '-'}</td>
                                      <td className="py-2 text-center" style={{ color: '#F5A623' }}>{returnItem?.returned || '-'}</td>
                                      <td className="py-2 text-center">
                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(utilization)}`}>
                                          {utilization}%
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                          
                          {(load.loadObservations || load.returnObservations) && (
                            <div className="mt-3 pt-3 border-t text-sm" style={{ borderColor: 'rgba(255,255,255,0.07)', color: '#A0A8C0' }}>
                              {load.loadObservations && <p>📤 <strong>Saída:</strong> {load.loadObservations}</p>}
                              {load.returnObservations && <p>📥 <strong>Retorno:</strong> {load.returnObservations}</p>}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Breakdown por Produto */}
      {report.totals.productBreakdown.length > 0 && (
        <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: '#13161E', borderColor: 'rgba(255,255,255,0.07)' }}>
          <div className="px-4 py-3 border-b" style={{ backgroundColor: '#1A1E29', borderColor: 'rgba(255,255,255,0.07)' }}>
            <h3 className="font-semibold flex items-center gap-2" style={{ color: '#FFFFFF' }}>
              <Package size={18} />
              Resumo por Produto
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: '#1A1E29', borderColor: 'rgba(255,255,255,0.07)' }} className="border-b">
                  <th className="text-left px-4 py-3 text-sm font-medium" style={{ color: '#A0A8C0' }}>Produto</th>
                  <th className="text-center px-4 py-3 text-sm font-medium" style={{ color: '#A0A8C0' }}>Carregado</th>
                  <th className="text-center px-4 py-3 text-sm font-medium" style={{ color: '#A0A8C0' }}>Vendido</th>
                  <th className="text-center px-4 py-3 text-sm font-medium" style={{ color: '#A0A8C0' }}>Devolvido</th>
                  <th className="text-center px-4 py-3 text-sm font-medium" style={{ color: '#A0A8C0' }}>Aproveitamento</th>
                  <th className="text-center px-4 py-3 text-sm font-medium" style={{ color: '#A0A8C0' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {report.totals.productBreakdown.map(item => (
                  <tr key={item.productId} style={{ borderColor: 'rgba(255,255,255,0.03)' }} className="border-b" onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1A1E29')} onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}>
                    <td className="px-4 py-3 font-medium" style={{ color: '#FFFFFF' }}>{item.productName}</td>
                    <td className="px-4 py-3 text-center" style={{ color: '#3B82F6' }}>{item.loaded}</td>
                    <td className="px-4 py-3 text-center" style={{ color: '#22C55E' }}>{item.sold}</td>
                    <td className="px-4 py-3 text-center" style={{ color: '#F5A623' }}>{item.returned}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(item.utilizationRate)}`}>
                        {item.utilizationRate}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {item.alertHighReturn ? (
                        <span className="flex items-center justify-center gap-1" style={{ color: '#EF4444' }}>
                          <AlertTriangle size={16} />
                          <span className="text-xs">Sobra alta</span>
                        </span>
                      ) : (
                        <CheckCircle size={16} style={{ color: '#22C55E' }} className="mx-auto" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDailyLoadReport;
