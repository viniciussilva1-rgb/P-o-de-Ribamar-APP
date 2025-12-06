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
    if (rate >= 90) return 'text-green-600 bg-green-50';
    if (rate >= 70) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
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
      case 'high': return { text: 'Alta', color: 'text-green-600 bg-green-100' };
      case 'medium': return { text: 'Média', color: 'text-yellow-600 bg-yellow-100' };
      default: return { text: 'Baixa', color: 'text-gray-600 bg-gray-100' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-purple-100 p-3 rounded-full">
            <BarChart3 className="text-purple-700" size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Relatório de Carga do Dia</h2>
            <p className="text-sm text-gray-500">Acompanhe cargas, vendas e sobras</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSuggestions(!showSuggestions)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
              showSuggestions 
                ? 'bg-amber-100 border-amber-300 text-amber-700' 
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Lightbulb size={18} />
            Sugestões de Produção
          </button>
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
      </div>

      {/* Sugestões de Produção */}
      {showSuggestions && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-amber-200 flex items-center justify-between">
            <h3 className="font-semibold text-amber-800 flex items-center gap-2">
              <Lightbulb size={18} />
              Sugestões de Produção para Amanhã
            </h3>
            <span className="text-xs text-amber-600">Baseado nos últimos 7 dias</span>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {suggestions.map(suggestion => {
                const conf = getConfidenceLabel(suggestion.confidence);
                return (
                  <div key={suggestion.productId} className="bg-white rounded-lg p-3 border border-amber-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-800">{suggestion.productName}</span>
                      {getTrendIcon(suggestion.trend)}
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-2xl font-bold text-amber-700">{suggestion.suggestedQuantity}</span>
                        <span className="text-sm text-gray-500 ml-1">un.</span>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-500">Média venda: {suggestion.avgDaily}</div>
                        <div className="text-xs text-gray-500">Média sobra: {suggestion.avgReturned}</div>
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
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Package className="text-blue-500" size={20} />
            <span className="text-sm text-gray-500">Total Carregado</span>
          </div>
          <span className="text-3xl font-bold text-blue-600">{report.totals.totalLoaded}</span>
          <span className="text-sm text-gray-400 ml-1">unidades</span>
        </div>
        
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="text-green-500" size={20} />
            <span className="text-sm text-gray-500">Total Vendido</span>
          </div>
          <span className="text-3xl font-bold text-green-600">{report.totals.totalSold}</span>
          <span className="text-sm text-gray-400 ml-1">unidades</span>
        </div>
        
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <RefreshCw className="text-orange-500" size={20} />
            <span className="text-sm text-gray-500">Total Devolvido</span>
          </div>
          <span className="text-3xl font-bold text-orange-600">{report.totals.totalReturned}</span>
          <span className="text-sm text-gray-400 ml-1">unidades</span>
        </div>
        
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="text-purple-500" size={20} />
            <span className="text-sm text-gray-500">Aproveitamento</span>
          </div>
          <span className={`text-3xl font-bold ${
            report.totals.utilizationRate >= 80 ? 'text-green-600' : 
            report.totals.utilizationRate >= 60 ? 'text-yellow-600' : 'text-red-600'
          }`}>{report.totals.utilizationRate}%</span>
        </div>
      </div>

      {/* Alertas de entregadores sem carga */}
      {driversWithoutLoad.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-yellow-700">
            <AlertTriangle size={20} />
            <span className="font-medium">Entregadores sem carga registrada hoje:</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {driversWithoutLoad.map(driver => (
              <span key={driver.id} className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                {driver.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Relatório por Entregador */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 border-b border-gray-200">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <Users size={18} />
            Relatório por Entregador
          </h3>
        </div>
        
        {report.drivers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Package size={48} className="mx-auto mb-3 text-gray-300" />
            <p>Nenhuma carga registrada para esta data.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {report.drivers.map(driverReport => {
              const isExpanded = expandedDriver === driverReport.driverId;
              
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
                        <div className="flex items-center gap-3 text-sm text-gray-500">
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
                      {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                    </div>
                  </button>
                  
                  {isExpanded && (
                    <div className="bg-gray-50 px-4 pb-4">
                      {driverReport.loads.map(load => (
                        <div key={load.id} className="bg-white rounded-lg p-4 mt-2 border border-gray-200">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm text-gray-500">
                              Saída: {load.loadStartTime ? new Date(load.loadStartTime).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                              {load.returnTime && ` | Retorno: ${new Date(load.returnTime).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              load.status === 'completed' ? 'bg-green-100 text-green-700' :
                              load.status === 'in_route' ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {load.status === 'completed' ? 'Finalizado' :
                               load.status === 'in_route' ? 'Em Rota' : 'Carregando'}
                            </span>
                          </div>
                          
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-gray-200">
                                  <th className="text-left py-2 text-gray-600 font-medium">Produto</th>
                                  <th className="text-center py-2 text-gray-600 font-medium">Carregado</th>
                                  <th className="text-center py-2 text-gray-600 font-medium">Vendido</th>
                                  <th className="text-center py-2 text-gray-600 font-medium">Devolvido</th>
                                  <th className="text-center py-2 text-gray-600 font-medium">%</th>
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
                                    <tr key={item.productId} className="border-b border-gray-100">
                                      <td className="py-2 text-gray-800">{product?.name}</td>
                                      <td className="py-2 text-center text-blue-600">{item.quantity}</td>
                                      <td className="py-2 text-center text-green-600">{returnItem?.sold || '-'}</td>
                                      <td className="py-2 text-center text-orange-600">{returnItem?.returned || '-'}</td>
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
                            <div className="mt-3 pt-3 border-t border-gray-200 text-sm text-gray-600">
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
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-4 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <Package size={18} />
              Resumo por Produto
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Produto</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Carregado</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Vendido</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Devolvido</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Aproveitamento</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {report.totals.productBreakdown.map(item => (
                  <tr key={item.productId} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{item.productName}</td>
                    <td className="px-4 py-3 text-center text-blue-600">{item.loaded}</td>
                    <td className="px-4 py-3 text-center text-green-600">{item.sold}</td>
                    <td className="px-4 py-3 text-center text-orange-600">{item.returned}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(item.utilizationRate)}`}>
                        {item.utilizationRate}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {item.alertHighReturn ? (
                        <span className="flex items-center justify-center gap-1 text-red-600">
                          <AlertTriangle size={16} />
                          <span className="text-xs">Sobra alta</span>
                        </span>
                      ) : (
                        <CheckCircle size={16} className="text-green-500 mx-auto" />
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
