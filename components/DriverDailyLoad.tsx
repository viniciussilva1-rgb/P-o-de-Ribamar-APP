import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { LoadItem, ReturnItem, DailyLoad, DynamicLoadSummary } from '../types';
import { 
  Package, Truck, CheckCircle, AlertCircle, Plus, Minus, 
  Save, ArrowRight, RotateCcw, Loader2, Calendar,
  TrendingUp, TrendingDown, AlertTriangle, ClipboardList,
  Sparkles, Info, Zap, Brain
} from 'lucide-react';

const DriverDailyLoad: React.FC = () => {
  const { currentUser } = useAuth();
  const { 
    products, 
    createDailyLoad, 
    completeDailyLoad, 
    getDailyLoadByDriver,
    dailyLoads,
    getDynamicLoadSummary,
    getDynamicClientsForDriver,
    getScheduledClientsForDay,
    clients
  } = useData();
  
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [currentLoad, setCurrentLoad] = useState<DailyLoad | undefined>(undefined);
  
  // Estado para criar nova carga
  const [loadItems, setLoadItems] = useState<LoadItem[]>([]);
  const [loadObservations, setLoadObservations] = useState('');
  
  // Estado para registrar sobras
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [returnObservations, setReturnObservations] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Carregar carga existente do dia
  useEffect(() => {
    if (currentUser?.id) {
      const existingLoad = getDailyLoadByDriver(currentUser.id, selectedDate);
      setCurrentLoad(existingLoad);
      
      if (existingLoad) {
        // Se há carga existente, preparar os itens de retorno
        if (existingLoad.status === 'in_route' && !existingLoad.returnItems) {
          const initialReturns: ReturnItem[] = existingLoad.loadItems.map(item => ({
            productId: item.productId,
            returned: 0,
            sold: item.quantity
          }));
          setReturnItems(initialReturns);
        } else if (existingLoad.returnItems) {
          setReturnItems(existingLoad.returnItems);
        }
      } else {
        // Inicializar com todos os produtos zerados
        const initialItems: LoadItem[] = products.map(p => ({
          productId: p.id,
          quantity: 0
        }));
        setLoadItems(initialItems);
        setReturnItems([]);
      }
    }
  }, [currentUser?.id, selectedDate, dailyLoads, products]);

  const updateLoadQuantity = (productId: string, delta: number) => {
    setLoadItems(prev => prev.map(item => {
      if (item.productId === productId) {
        return { ...item, quantity: Math.max(0, item.quantity + delta) };
      }
      return item;
    }));
  };

  const setLoadQuantity = (productId: string, quantity: number) => {
    setLoadItems(prev => prev.map(item => {
      if (item.productId === productId) {
        return { ...item, quantity: Math.max(0, quantity) };
      }
      return item;
    }));
  };

  const updateReturnQuantity = (productId: string, returned: number) => {
    if (!currentLoad) return;
    
    const loadItem = currentLoad.loadItems.find(i => i.productId === productId);
    const maxReturn = loadItem?.quantity || 0;
    const actualReturned = Math.min(Math.max(0, returned), maxReturn);
    
    setReturnItems(prev => prev.map(item => {
      if (item.productId === productId) {
        return { 
          ...item, 
          returned: actualReturned,
          sold: maxReturn - actualReturned
        };
      }
      return item;
    }));
  };

  const handleStartRoute = async () => {
    if (!currentUser?.id) return;
    
    const itemsWithQuantity = loadItems.filter(item => item.quantity > 0);
    if (itemsWithQuantity.length === 0) {
      setError('Adicione pelo menos um produto à carga.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await createDailyLoad(currentUser.id, selectedDate, itemsWithQuantity, loadObservations || undefined);
      setSuccess('Carga registrada com sucesso! Boa rota!');
    } catch (err) {
      console.error('Erro ao criar carga:', err);
      setError('Erro ao registrar carga. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteRoute = async () => {
    if (!currentLoad) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await completeDailyLoad(currentLoad.id, returnItems, returnObservations || undefined);
      setSuccess('Rota finalizada com sucesso! Sobras registradas.');
    } catch (err) {
      console.error('Erro ao finalizar rota:', err);
      setError('Erro ao registrar sobras. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const getProductName = (productId: string) => {
    return products.find(p => p.id === productId)?.name || 'Produto';
  };

  const totalLoadItems = loadItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalReturned = returnItems.reduce((sum, item) => sum + item.returned, 0);
  const totalSold = returnItems.reduce((sum, item) => sum + item.sold, 0);

  // Calcular dia da semana para obter clientes agendados
  const getDayKey = (dateStr: string): keyof import('../types').DeliverySchedule => {
    const date = new Date(dateStr + 'T12:00:00');
    const days: (keyof import('../types').DeliverySchedule)[] = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
    return days[date.getDay()];
  };

  // Obter clientes agendados para o dia (excluindo dinâmicos)
  const scheduledClients = currentUser?.id 
    ? getScheduledClientsForDay(currentUser.id, selectedDate).filter(c => !c.isDynamicChoice)
    : [];

  // Calcular carga necessária baseada nos clientes agendados
  const calculateScheduledLoad = (): { productId: string; quantity: number; clients: string[] }[] => {
    const dayKey = getDayKey(selectedDate);
    const loadMap: Record<string, { quantity: number; clients: string[] }> = {};

    scheduledClients.forEach(client => {
      const items = client.deliverySchedule?.[dayKey] || [];
      items.forEach(item => {
        if (!loadMap[item.productId]) {
          loadMap[item.productId] = { quantity: 0, clients: [] };
        }
        loadMap[item.productId].quantity += item.quantity;
        loadMap[item.productId].clients.push(client.name);
      });
    });

    return Object.entries(loadMap).map(([productId, data]) => ({
      productId,
      quantity: data.quantity,
      clients: data.clients
    }));
  };

  const scheduledLoad = calculateScheduledLoad();
  const totalScheduledItems = scheduledLoad.reduce((sum, item) => sum + item.quantity, 0);

  // Função para aplicar a carga recomendada dos clientes agendados
  const applyScheduledRecommendation = () => {
    setLoadItems(prev => {
      const newItems = [...prev];
      scheduledLoad.forEach(rec => {
        const idx = newItems.findIndex(item => item.productId === rec.productId);
        if (idx !== -1) {
          newItems[idx] = { ...newItems[idx], quantity: rec.quantity };
        }
      });
      return newItems;
    });
    setSuccess('Carga dos clientes agendados aplicada!');
  };

  // Função para adicionar a carga recomendada (soma com a atual)
  const addScheduledRecommendation = () => {
    setLoadItems(prev => {
      const newItems = [...prev];
      scheduledLoad.forEach(rec => {
        const idx = newItems.findIndex(item => item.productId === rec.productId);
        if (idx !== -1) {
          newItems[idx] = { ...newItems[idx], quantity: newItems[idx].quantity + rec.quantity };
        }
      });
      return newItems;
    });
    setSuccess('Carga adicionada!');
  };

  // Estado e dados para clientes dinâmicos
  const [showDynamicInfo, setShowDynamicInfo] = useState(true);
  const [showScheduledInfo, setShowScheduledInfo] = useState(true);
  const dynamicClients = currentUser?.id ? getDynamicClientsForDriver(currentUser.id) : [];
  const dynamicSummary: DynamicLoadSummary | null = currentUser?.id && dynamicClients.length > 0 
    ? getDynamicLoadSummary(currentUser.id, selectedDate) 
    : null;

  // Função para aplicar carga recomendada dos clientes dinâmicos
  const applyDynamicRecommendation = () => {
    if (!dynamicSummary) return;
    
    setLoadItems(prev => {
      const newItems = [...prev];
      dynamicSummary.recommendedLoad.forEach(rec => {
        const idx = newItems.findIndex(item => item.productId === rec.productId);
        if (idx !== -1) {
          newItems[idx] = { ...newItems[idx], quantity: newItems[idx].quantity + rec.recommendedTotal };
        }
      });
      return newItems;
    });
    setShowDynamicInfo(false);
    setSuccess('Carga recomendada para clientes dinâmicos adicionada!');
  };

  // Função para obter a cor do badge de confiança
  const getConfidenceBadge = (confidence: 'high' | 'medium' | 'low') => {
    switch (confidence) {
      case 'high':
        return 'bg-green-100 text-green-700';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700';
      case 'low':
        return 'bg-orange-100 text-orange-700';
    }
  };

  const getConfidenceLabel = (confidence: 'high' | 'medium' | 'low') => {
    switch (confidence) {
      case 'high':
        return 'Alta';
      case 'medium':
        return 'Média';
      case 'low':
        return 'Baixa';
    }
  };

  // Renderizar baseado no estado atual
  if (!currentLoad) {
    // Formulário para criar nova carga
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-amber-100 p-3 rounded-full">
              <Package className="text-amber-700" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Carga do Dia</h2>
              <p className="text-sm text-gray-500">Registre os produtos que está levando</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-gray-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <AlertCircle className="text-red-500" size={20} />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {success && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
            <CheckCircle className="text-green-500" size={20} />
            <span className="text-green-700">{success}</span>
          </div>
        )}

        {/* Seção de Carga Recomendada - Clientes Agendados */}
        {scheduledClients.length > 0 && showScheduledInfo && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-amber-200 flex items-center justify-between">
              <h3 className="font-semibold text-amber-800 flex items-center gap-2">
                <ClipboardList size={18} className="text-amber-600" />
                Carga Necessária - Clientes Agendados
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-sm text-amber-600 bg-amber-100 px-2 py-1 rounded-full">
                  {scheduledClients.length} cliente{scheduledClients.length !== 1 ? 's' : ''} • {totalScheduledItems} itens
                </span>
                <button
                  onClick={() => setShowScheduledInfo(false)}
                  className="text-amber-400 hover:text-amber-600 text-sm"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-4">
              {/* Info */}
              <div className="mb-3 p-2 bg-amber-100/50 rounded-lg">
                <p className="text-xs text-amber-700 flex items-center gap-1">
                  <Info size={14} />
                  Calculado automaticamente baseado nos pedidos programados dos seus clientes para hoje
                </p>
              </div>

              {/* Produtos necessários */}
              {scheduledLoad.length > 0 ? (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
                    {scheduledLoad.map(item => {
                      const product = products.find(p => p.id === item.productId);
                      return (
                        <div key={item.productId} className="bg-white rounded-lg p-3 border border-amber-100 hover:shadow-sm transition-shadow">
                          <span className="text-sm text-gray-600 block truncate">{product?.name || 'Produto'}</span>
                          <div className="flex items-end justify-between mt-1">
                            <span className="text-xl font-bold text-amber-700">{item.quantity}</span>
                            <span className="text-xs text-gray-400">
                              {item.clients.length} cliente{item.clients.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Detalhes por cliente */}
                  <details className="mb-4">
                    <summary className="cursor-pointer text-sm text-amber-600 hover:text-amber-800 flex items-center gap-1">
                      <Info size={14} />
                      Ver clientes para hoje ({getDayKey(selectedDate).toUpperCase()})
                    </summary>
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                      {scheduledClients.map(client => {
                        const dayKey = getDayKey(selectedDate);
                        const items = client.deliverySchedule?.[dayKey] || [];
                        const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
                        return (
                          <div key={client.id} className="bg-white rounded-lg p-3 border border-gray-100 flex items-center justify-between">
                            <div>
                              <span className="font-medium text-gray-800 text-sm">{client.name}</span>
                              <div className="text-xs text-gray-500">
                                {items.map(i => {
                                  const prod = products.find(p => p.id === i.productId);
                                  return `${prod?.name || 'Produto'}: ${i.quantity}`;
                                }).join(', ')}
                              </div>
                            </div>
                            <span className="text-amber-700 font-bold">{totalItems}</span>
                          </div>
                        );
                      })}
                    </div>
                  </details>

                  {/* Botões de ação */}
                  <div className="flex gap-2">
                    <button
                      onClick={applyScheduledRecommendation}
                      className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                    >
                      <Zap size={16} />
                      Aplicar Carga ({totalScheduledItems} itens)
                    </button>
                    <button
                      onClick={addScheduledRecommendation}
                      className="py-2.5 px-4 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                      title="Adicionar à carga atual"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  <p className="text-sm">Nenhum produto programado para os clientes de hoje.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Indicador de clientes agendados (colapsado) */}
        {scheduledClients.length > 0 && !showScheduledInfo && (
          <button
            onClick={() => setShowScheduledInfo(true)}
            className="w-full flex items-center justify-center gap-2 py-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-700 hover:bg-amber-100"
          >
            <ClipboardList size={16} />
            <span className="text-sm font-medium">
              Ver carga necessária: {scheduledClients.length} cliente{scheduledClients.length !== 1 ? 's' : ''} agendado{scheduledClients.length !== 1 ? 's' : ''} ({totalScheduledItems} itens)
            </span>
          </button>
        )}

        {/* Seção de Clientes Dinâmicos */}
        {dynamicClients.length > 0 && dynamicSummary && showDynamicInfo && (
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-purple-200 flex items-center justify-between">
              <h3 className="font-semibold text-purple-800 flex items-center gap-2">
                <Sparkles size={18} className="text-purple-600" />
                Carga Extra - Clientes Dinâmicos (IA)
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-sm text-purple-600 bg-purple-100 px-2 py-1 rounded-full">
                  {dynamicSummary.dynamicClientsCount} cliente{dynamicSummary.dynamicClientsCount !== 1 ? 's' : ''}
                </span>
                <button
                  onClick={() => setShowDynamicInfo(false)}
                  className="text-purple-400 hover:text-purple-600 text-sm"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-4">
              {/* Verificar se há dados de histórico */}
              {dynamicSummary.recommendedLoad.length > 0 ? (
                <>
                  {/* Info sobre IA */}
                  <div className="mb-3 p-2 bg-purple-100/50 rounded-lg">
                    <p className="text-xs text-purple-700 flex items-center gap-1">
                      <Brain size={14} />
                      Previsão baseada em IA analisando histórico de consumo dos clientes
                    </p>
                  </div>

                  {/* Produtos recomendados */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
                    {dynamicSummary.recommendedLoad.map(rec => (
                      <div key={rec.productId} className="bg-white rounded-lg p-3 border border-purple-100">
                        <span className="text-sm text-gray-600 block truncate">{rec.productName}</span>
                        <div className="flex items-end justify-between mt-1">
                          <span className="text-xl font-bold text-purple-700">{rec.recommendedTotal}</span>
                          <span className="text-xs text-gray-400">
                            ({rec.minTotal}-{rec.maxTotal})
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Previsões por cliente */}
                  <details className="mb-4">
                    <summary className="cursor-pointer text-sm text-purple-600 hover:text-purple-800 flex items-center gap-1">
                      <Info size={14} />
                      Ver detalhes por cliente
                    </summary>
                    <div className="mt-3 space-y-2">
                      {dynamicSummary.predictions.map(pred => (
                        <div key={pred.clientId} className="bg-white rounded-lg p-3 border border-gray-100">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-gray-800">{pred.clientName}</span>
                            <div className="flex items-center gap-2">
                              {pred.routeName && (
                                <span className="text-xs text-gray-500">{pred.routeName}</span>
                              )}
                              <span className={`text-xs px-2 py-0.5 rounded-full ${getConfidenceBadge(pred.confidence)}`}>
                                {pred.hasHistory ? `Confiança: ${getConfidenceLabel(pred.confidence)}` : 'Sem histórico'}
                              </span>
                            </div>
                          </div>
                          {pred.predictedItems.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {pred.predictedItems.slice(0, 5).map(item => (
                                <span key={item.productId} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                  {item.productName}: {item.recommendedQuantity}
                                </span>
                              ))}
                              {pred.predictedItems.length > 5 && (
                                <span className="text-xs text-gray-400">+{pred.predictedItems.length - 5} mais</span>
                              )}
                            </div>
                          ) : (
                            <p className="text-xs text-gray-400 italic">Aguardando primeiras entregas para aprender padrão</p>
                          )}
                          {pred.predictedTotalValue > 0 && (
                            <div className="text-xs text-gray-500 mt-1">
                              Valor estimado: €{pred.predictedTotalValue.toFixed(2)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </details>

                  {/* Botão para aplicar */}
                  <div className="flex items-center justify-between pt-3 border-t border-purple-200">
                    <div className="text-sm text-purple-700">
                      Total recomendado: <strong>€{dynamicSummary.totalRecommendedValue?.toFixed(2) || '0.00'}</strong>
                    </div>
                    <button
                      onClick={applyDynamicRecommendation}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium text-sm"
                    >
                      <Zap size={16} />
                      Adicionar à Carga
                    </button>
                  </div>
                </>
              ) : (
                /* Sem histórico - mostrar mensagem informativa */
                <div className="text-center py-6">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 rounded-full mb-3">
                    <Brain size={24} className="text-purple-500" />
                  </div>
                  <h4 className="font-medium text-gray-800 mb-2">Aprendendo padrões de consumo</h4>
                  <p className="text-sm text-gray-500 max-w-md mx-auto">
                    Os clientes dinâmicos ainda não têm histórico suficiente. 
                    Após algumas entregas, a IA vai sugerir automaticamente a carga extra recomendada 
                    baseada nos produtos que eles costumam pedir.
                  </p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {dynamicSummary.predictions.map(pred => (
                      <span key={pred.clientId} className="text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded-full">
                        {pred.clientName}: {pred.hasHistory ? 'Com histórico' : 'Aguardando dados'}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Indicador de clientes dinâmicos (colapsado) */}
        {dynamicClients.length > 0 && !showDynamicInfo && (
          <button
            onClick={() => setShowDynamicInfo(true)}
            className="w-full flex items-center justify-center gap-2 py-3 bg-purple-50 rounded-lg border border-purple-200 text-purple-700 hover:bg-purple-100"
          >
            <Sparkles size={16} />
            <span className="text-sm font-medium">
              Ver recomendação para {dynamicClients.length} cliente{dynamicClients.length !== 1 ? 's' : ''} dinâmico{dynamicClients.length !== 1 ? 's' : ''}
            </span>
          </button>
        )}

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <ClipboardList size={18} />
              Produtos para Carregar
            </h3>
          </div>
          
          <div className="divide-y divide-gray-100">
            {products.map(product => {
              const loadItem = loadItems.find(i => i.productId === product.id);
              const quantity = loadItem?.quantity || 0;
              
              return (
                <div key={product.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
                  <div className="flex-1">
                    <span className="font-medium text-gray-800">{product.name}</span>
                    <span className="text-sm text-gray-500 ml-2">€{product.price.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateLoadQuantity(product.id, -10)}
                      className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600"
                    >
                      <Minus size={16} />
                    </button>
                    <input
                      type="number"
                      min="0"
                      value={quantity}
                      onChange={(e) => setLoadQuantity(product.id, parseInt(e.target.value) || 0)}
                      className="w-20 text-center px-2 py-2 border border-gray-200 rounded-lg font-semibold"
                    />
                    <button
                      onClick={() => updateLoadQuantity(product.id, 10)}
                      className="p-2 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-700"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Observações (opcional)
          </label>
          <textarea
            value={loadObservations}
            onChange={(e) => setLoadObservations(e.target.value)}
            placeholder="Ex: Pedido especial do cliente X, verificar endereço..."
            className="w-full px-3 py-2 border border-gray-200 rounded-lg resize-none"
            rows={3}
          />
        </div>

        <div className="flex items-center justify-between bg-amber-50 rounded-xl p-4 border border-amber-200">
          <div>
            <span className="text-sm text-amber-700">Total de produtos:</span>
            <span className="text-2xl font-bold text-amber-800 ml-2">{totalLoadItems}</span>
            <span className="text-sm text-amber-600 ml-1">unidades</span>
          </div>
          <button
            onClick={handleStartRoute}
            disabled={loading || totalLoadItems === 0}
            className="flex items-center gap-2 px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
          >
            {loading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Truck size={20} />
            )}
            Iniciar Rota
          </button>
        </div>
      </div>
    );
  }

  // Carga em rota - Mostrar resumo e formulário de sobras
  if (currentLoad.status === 'in_route') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-3 rounded-full">
              <Truck className="text-blue-700" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Rota em Andamento</h2>
              <p className="text-sm text-gray-500">
                Iniciada às {currentLoad.loadStartTime ? new Date(currentLoad.loadStartTime).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
              </p>
            </div>
          </div>
          <div className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
            Em Rota
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <AlertCircle className="text-red-500" size={20} />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {success && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
            <CheckCircle className="text-green-500" size={20} />
            <span className="text-green-700">{success}</span>
          </div>
        )}

        {/* Resumo da carga */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <Package size={18} />
              Carga Carregada
            </h3>
          </div>
          <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-3">
            {currentLoad.loadItems.map(item => (
              <div key={item.productId} className="bg-gray-50 rounded-lg p-3">
                <span className="text-sm text-gray-600">{getProductName(item.productId)}</span>
                <p className="text-lg font-bold text-gray-800">{item.quantity} un.</p>
              </div>
            ))}
          </div>
          {currentLoad.loadObservations && (
            <div className="px-4 pb-4">
              <p className="text-sm text-gray-500 italic">
                📝 {currentLoad.loadObservations}
              </p>
            </div>
          )}
        </div>

        {/* Formulário de sobras */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-orange-50 to-red-50 px-4 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <RotateCcw size={18} />
              Registrar Sobras/Devoluções
            </h3>
          </div>
          
          <div className="divide-y divide-gray-100">
            {currentLoad.loadItems.map(loadItem => {
              const returnItem = returnItems.find(r => r.productId === loadItem.productId);
              const returned = returnItem?.returned || 0;
              const sold = loadItem.quantity - returned;
              
              return (
                <div key={loadItem.productId} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-800">{getProductName(loadItem.productId)}</span>
                    <span className="text-sm text-gray-500">Levou: {loadItem.quantity}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <label className="text-xs text-gray-500 block mb-1">Devolveu:</label>
                      <input
                        type="number"
                        min="0"
                        max={loadItem.quantity}
                        value={returned}
                        onChange={(e) => updateReturnQuantity(loadItem.productId, parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-center font-semibold"
                      />
                    </div>
                    <ArrowRight className="text-gray-400" size={20} />
                    <div className="flex-1 bg-green-50 rounded-lg p-2 text-center">
                      <label className="text-xs text-green-600 block">Vendeu:</label>
                      <span className="text-lg font-bold text-green-700">{sold}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Observações do Retorno (opcional)
          </label>
          <textarea
            value={returnObservations}
            onChange={(e) => setReturnObservations(e.target.value)}
            placeholder="Ex: Cliente Y não estava, devolução por qualidade..."
            className="w-full px-3 py-2 border border-gray-200 rounded-lg resize-none"
            rows={3}
          />
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-xl p-4 text-center border border-blue-100">
            <span className="text-sm text-blue-600 block">Carregado</span>
            <span className="text-2xl font-bold text-blue-700">{currentLoad.totalLoaded}</span>
          </div>
          <div className="bg-green-50 rounded-xl p-4 text-center border border-green-100">
            <span className="text-sm text-green-600 block">Vendido</span>
            <span className="text-2xl font-bold text-green-700">{totalSold}</span>
          </div>
          <div className="bg-orange-50 rounded-xl p-4 text-center border border-orange-100">
            <span className="text-sm text-orange-600 block">Devolvido</span>
            <span className="text-2xl font-bold text-orange-700">{totalReturned}</span>
          </div>
        </div>

        <button
          onClick={handleCompleteRoute}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg"
        >
          {loading ? (
            <Loader2 size={24} className="animate-spin" />
          ) : (
            <CheckCircle size={24} />
          )}
          Finalizar Rota
        </button>
      </div>
    );
  }

  // Rota finalizada - Mostrar resumo
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-green-100 p-3 rounded-full">
            <CheckCircle className="text-green-700" size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Rota Finalizada</h2>
            <p className="text-sm text-gray-500">
              {selectedDate === today ? 'Hoje' : new Date(selectedDate).toLocaleDateString('pt-PT')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-gray-400" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
          />
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-xl p-4 text-center border border-blue-100">
          <span className="text-sm text-blue-600 block">Carregado</span>
          <span className="text-2xl font-bold text-blue-700">{currentLoad.totalLoaded}</span>
        </div>
        <div className="bg-green-50 rounded-xl p-4 text-center border border-green-100">
          <span className="text-sm text-green-600 block">Vendido</span>
          <span className="text-2xl font-bold text-green-700">{currentLoad.totalSold}</span>
        </div>
        <div className="bg-orange-50 rounded-xl p-4 text-center border border-orange-100">
          <span className="text-sm text-orange-600 block">Devolvido</span>
          <span className="text-2xl font-bold text-orange-700">{currentLoad.totalReturned}</span>
        </div>
        <div className="bg-purple-50 rounded-xl p-4 text-center border border-purple-100">
          <span className="text-sm text-purple-600 block">Aproveitamento</span>
          <span className="text-2xl font-bold text-purple-700">{currentLoad.utilizationRate}%</span>
        </div>
      </div>

      {/* Detalhamento por produto */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-3 border-b border-gray-200">
          <h3 className="font-semibold text-gray-800">Detalhamento por Produto</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {currentLoad.loadItems.map(loadItem => {
            const returnItem = currentLoad.returnItems?.find(r => r.productId === loadItem.productId);
            const utilizationRate = loadItem.quantity > 0 
              ? Math.round(((returnItem?.sold || 0) / loadItem.quantity) * 100)
              : 0;
            const isLowUtilization = utilizationRate < 70;
            
            return (
              <div key={loadItem.productId} className="p-4 flex items-center justify-between">
                <div className="flex-1">
                  <span className="font-medium text-gray-800">{getProductName(loadItem.productId)}</span>
                  <div className="flex items-center gap-4 mt-1 text-sm">
                    <span className="text-blue-600">Levou: {loadItem.quantity}</span>
                    <span className="text-green-600">Vendeu: {returnItem?.sold || 0}</span>
                    <span className="text-orange-600">Devolveu: {returnItem?.returned || 0}</span>
                  </div>
                </div>
                <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                  isLowUtilization ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                }`}>
                  {isLowUtilization ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
                  {utilizationRate}%
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Observações */}
      {(currentLoad.loadObservations || currentLoad.returnObservations) && (
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
          <h4 className="font-medium text-gray-700 mb-2">Observações</h4>
          {currentLoad.loadObservations && (
            <p className="text-sm text-gray-600 mb-1">
              <strong>Saída:</strong> {currentLoad.loadObservations}
            </p>
          )}
          {currentLoad.returnObservations && (
            <p className="text-sm text-gray-600">
              <strong>Retorno:</strong> {currentLoad.returnObservations}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default DriverDailyLoad;
