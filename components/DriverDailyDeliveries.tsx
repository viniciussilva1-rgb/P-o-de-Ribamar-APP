import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { ClientDelivery, DeliveryStatus } from '../types';
import { 
  Package, Truck, CheckCircle, XCircle, Clock, MapPin, Phone, 
  User, AlertCircle, Loader2, Calendar, ChevronDown, ChevronRight,
  DollarSign, ClipboardList, RefreshCw, Send, Filter
} from 'lucide-react';

const DriverDailyDeliveries: React.FC = () => {
  const { currentUser } = useAuth();
  const { 
    products, 
    routes,
    generateDailyDeliveries,
    updateDeliveryStatus,
    getDeliveriesByDriver,
    getDriverDailySummary,
    getScheduledClientsForDay,
    clientDeliveries
  } = useData();
  
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [deliveries, setDeliveries] = useState<ClientDelivery[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedDelivery, setExpandedDelivery] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<DeliveryStatus | 'all'>('all');
  const [notDeliveredReason, setNotDeliveredReason] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Carregar entregas do dia
  useEffect(() => {
    if (currentUser?.id) {
      const existingDeliveries = getDeliveriesByDriver(currentUser.id, selectedDate);
      setDeliveries(existingDeliveries);
    }
  }, [currentUser?.id, selectedDate, clientDeliveries]);

  // Gerar entregas do dia
  const handleGenerateDeliveries = async () => {
    if (!currentUser?.id) return;
    
    setLoading(true);
    setError('');
    
    try {
      const generated = await generateDailyDeliveries(currentUser.id, selectedDate);
      setDeliveries(generated);
    } catch (err) {
      console.error('Erro ao gerar entregas:', err);
      setError('Erro ao gerar entregas. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Marcar como entregue
  const handleMarkDelivered = async (deliveryId: string) => {
    setProcessingId(deliveryId);
    try {
      await updateDeliveryStatus(deliveryId, 'delivered');
    } catch (err) {
      console.error('Erro ao marcar entrega:', err);
      setError('Erro ao atualizar status.');
    } finally {
      setProcessingId(null);
    }
  };

  // Marcar como não entregue
  const handleMarkNotDelivered = async (deliveryId: string) => {
    setProcessingId(deliveryId);
    try {
      await updateDeliveryStatus(deliveryId, 'not_delivered', notDeliveredReason);
      setNotDeliveredReason('');
      setExpandedDelivery(null);
    } catch (err) {
      console.error('Erro ao marcar não entrega:', err);
      setError('Erro ao atualizar status.');
    } finally {
      setProcessingId(null);
    }
  };

  const getProductName = (productId: string) => {
    return products.find(p => p.id === productId)?.name || 'Produto';
  };

  const getRouteName = (routeId?: string) => {
    if (!routeId) return 'Sem Rota';
    return routes.find(r => r.id === routeId)?.name || 'Rota';
  };

  const getStatusBadge = (status: DeliveryStatus) => {
    switch (status) {
      case 'delivered':
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
            <CheckCircle size={12} /> Entregue
          </span>
        );
      case 'not_delivered':
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
            <XCircle size={12} /> Não Entregue
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
            <Clock size={12} /> Pendente
          </span>
        );
    }
  };

  // Filtrar entregas
  const filteredDeliveries = deliveries.filter(d => 
    statusFilter === 'all' || d.status === statusFilter
  );

  // Agrupar por rota
  const deliveriesByRoute = filteredDeliveries.reduce((acc, delivery) => {
    const routeId = delivery.routeId || 'sem-rota';
    if (!acc[routeId]) acc[routeId] = [];
    acc[routeId].push(delivery);
    return acc;
  }, {} as Record<string, ClientDelivery[]>);

  // Resumo do dia
  const summary = currentUser?.id ? getDriverDailySummary(currentUser.id, selectedDate) : null;

  // Clientes programados (para verificar se há entregas a gerar)
  const scheduledClients = currentUser?.id ? getScheduledClientsForDay(currentUser.id, selectedDate) : [];
  const hasUngenerated = scheduledClients.length > deliveries.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 p-3 rounded-full">
            <Send className="text-blue-700" size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Entregas do Dia</h2>
            <p className="text-sm text-gray-500">Gerencie suas entregas programadas</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
            <Calendar size={18} className="text-gray-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border-none focus:ring-0 text-sm"
            />
          </div>
          <button
            onClick={handleGenerateDeliveries}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
            {deliveries.length === 0 ? 'Gerar Entregas' : 'Atualizar'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertCircle className="text-red-500" size={20} />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {/* Alerta de entregas não geradas */}
      {hasUngenerated && deliveries.length > 0 && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="text-yellow-600" size={20} />
            <span className="text-yellow-700">
              Há {scheduledClients.length - deliveries.length} cliente(s) com entrega programada ainda não gerada.
            </span>
          </div>
          <button
            onClick={handleGenerateDeliveries}
            className="text-yellow-700 hover:text-yellow-800 font-medium text-sm"
          >
            Atualizar lista
          </button>
        </div>
      )}

      {/* Resumo do Dia */}
      {summary && deliveries.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <ClipboardList className="text-blue-500" size={18} />
              <span className="text-sm text-gray-500">Total</span>
            </div>
            <span className="text-2xl font-bold text-blue-600">{summary.totalClients}</span>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="text-green-500" size={18} />
              <span className="text-sm text-gray-500">Entregues</span>
            </div>
            <span className="text-2xl font-bold text-green-600">{summary.totalDelivered}</span>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <XCircle className="text-red-500" size={18} />
              <span className="text-sm text-gray-500">Não Entregues</span>
            </div>
            <span className="text-2xl font-bold text-red-600">{summary.totalNotDelivered}</span>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="text-yellow-500" size={18} />
              <span className="text-sm text-gray-500">Pendentes</span>
            </div>
            <span className="text-2xl font-bold text-yellow-600">{summary.totalPending}</span>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="text-purple-500" size={18} />
              <span className="text-sm text-gray-500">Valor Total</span>
            </div>
            <span className="text-2xl font-bold text-purple-600">€{summary.totalValue.toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* Resumo de Produtos */}
      {summary && summary.productTotals.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <Package size={18} />
              Produtos a Entregar Hoje
            </h3>
          </div>
          <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            {summary.productTotals.map(pt => (
              <div key={pt.productId} className="bg-gray-50 rounded-lg p-3">
                <span className="text-sm text-gray-600">{pt.productName}</span>
                <p className="text-lg font-bold text-gray-800">{pt.quantity} un.</p>
                <p className="text-xs text-gray-500">€{pt.value.toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filtros */}
      {deliveries.length > 0 && (
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-gray-400" />
          <span className="text-sm text-gray-500">Filtrar:</span>
          {(['all', 'pending', 'delivered', 'not_delivered'] as const).map(filter => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                statusFilter === filter
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {filter === 'all' ? 'Todos' : 
               filter === 'pending' ? 'Pendentes' :
               filter === 'delivered' ? 'Entregues' : 'Não Entregues'}
            </button>
          ))}
        </div>
      )}

      {/* Lista de Entregas por Rota */}
      {deliveries.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <Truck size={48} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 mb-4">
            {scheduledClients.length > 0 
              ? `Você tem ${scheduledClients.length} cliente(s) com entrega programada para hoje.`
              : 'Nenhuma entrega programada para este dia.'}
          </p>
          {scheduledClients.length > 0 && (
            <button
              onClick={handleGenerateDeliveries}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Gerando...' : 'Gerar Lista de Entregas'}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(deliveriesByRoute).map(([routeId, routeDeliveries]) => (
            <div key={routeId} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                    <MapPin size={18} className="text-blue-600" />
                    {getRouteName(routeId === 'sem-rota' ? undefined : routeId)}
                  </h3>
                  <span className="text-sm text-gray-500">
                    {routeDeliveries.length} cliente(s)
                  </span>
                </div>
              </div>
              
              <div className="divide-y divide-gray-100">
                {routeDeliveries.map(delivery => {
                  const isExpanded = expandedDelivery === delivery.id;
                  const isProcessing = processingId === delivery.id;
                  
                  return (
                    <div key={delivery.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <User size={16} className="text-gray-400" />
                            <span className="font-medium text-gray-800">{delivery.clientName}</span>
                            {getStatusBadge(delivery.status)}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <MapPin size={14} />
                              {delivery.clientAddress}
                            </span>
                            <span className="flex items-center gap-1">
                              <Phone size={14} />
                              {delivery.clientPhone}
                            </span>
                          </div>
                          
                          {/* Produtos */}
                          <div className="mt-2 flex flex-wrap gap-2">
                            {delivery.items.map(item => (
                              <span key={item.productId} className="px-2 py-1 bg-gray-100 rounded text-sm">
                                {getProductName(item.productId)}: {item.quantity}
                              </span>
                            ))}
                          </div>
                          
                          <div className="mt-2 flex items-center gap-4">
                            <span className="text-sm font-medium text-green-600">
                              Valor: €{delivery.totalValue.toFixed(2)}
                            </span>
                            {delivery.status === 'not_delivered' && delivery.notDeliveredReason && (
                              <span className="text-sm text-red-500">
                                Motivo: {delivery.notDeliveredReason}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* Ações */}
                        {delivery.status === 'pending' && (
                          <div className="flex flex-col gap-2 ml-4">
                            <button
                              onClick={() => handleMarkDelivered(delivery.id)}
                              disabled={isProcessing}
                              className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm"
                            >
                              {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                              Entregue
                            </button>
                            <button
                              onClick={() => setExpandedDelivery(isExpanded ? null : delivery.id)}
                              className="flex items-center gap-1 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm"
                            >
                              <XCircle size={14} />
                              Não Entregue
                            </button>
                          </div>
                        )}
                        
                        {delivery.status !== 'pending' && (
                          <div className="ml-4">
                            {delivery.status === 'delivered' && delivery.deliveredAt && (
                              <span className="text-xs text-gray-400">
                                {new Date(delivery.deliveredAt).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {/* Formulário de motivo para não entrega */}
                      {isExpanded && delivery.status === 'pending' && (
                        <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
                          <label className="block text-sm font-medium text-red-700 mb-2">
                            Motivo da não entrega (opcional):
                          </label>
                          <textarea
                            value={notDeliveredReason}
                            onChange={(e) => setNotDeliveredReason(e.target.value)}
                            placeholder="Ex: Cliente ausente, endereço incorreto..."
                            className="w-full px-3 py-2 border border-red-200 rounded-lg text-sm resize-none"
                            rows={2}
                          />
                          <div className="flex justify-end gap-2 mt-2">
                            <button
                              onClick={() => setExpandedDelivery(null)}
                              className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded text-sm"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={() => handleMarkNotDelivered(delivery.id)}
                              disabled={isProcessing}
                              className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 text-sm"
                            >
                              {isProcessing ? 'Salvando...' : 'Confirmar'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DriverDailyDeliveries;
