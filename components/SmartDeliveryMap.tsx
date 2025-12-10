import React, { useState, useMemo } from 'react';
import { MapPin, Navigation, ExternalLink, ChevronDown, ChevronUp, Play, CheckCircle, ArrowRight, SkipForward, RotateCcw, Phone, User } from 'lucide-react';
import { Client } from '../types';

interface SmartDeliveryMapProps {
  clients: Client[];
  driverName?: string;
}

const SmartDeliveryMap: React.FC<SmartDeliveryMapProps> = ({ clients, driverName }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completedClients, setCompletedClients] = useState<Set<string>>(new Set());
  const [isNavigating, setIsNavigating] = useState(false);

  // Filtrar clientes ativos e ordenar por sortOrder
  const sortedClients = useMemo(() => {
    return clients
      .filter(c => c.status === 'ACTIVE')
      .sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999));
  }, [clients]);

  // Cliente atual
  const currentClient = sortedClients[currentIndex];
  
  // Próximo cliente
  const nextClient = sortedClients[currentIndex + 1];

  // Clientes restantes
  const remainingCount = sortedClients.length - currentIndex;

  // Navegar para o cliente atual
  const navigateToClient = (client: Client) => {
    setIsNavigating(true);
    
    let url = '';
    if (client.coordinates?.lat && client.coordinates?.lng) {
      // Se tem coordenadas, usar elas
      url = `https://www.google.com/maps/dir/?api=1&destination=${client.coordinates.lat},${client.coordinates.lng}&travelmode=driving`;
    } else {
      // Se não tem coordenadas, usar o endereço
      url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(client.address)}&travelmode=driving`;
    }
    
    window.open(url, '_blank');
  };

  // Navegar via Waze
  const navigateViaWaze = (client: Client) => {
    setIsNavigating(true);
    
    let url = '';
    if (client.coordinates?.lat && client.coordinates?.lng) {
      url = `https://waze.com/ul?ll=${client.coordinates.lat},${client.coordinates.lng}&navigate=yes`;
    } else {
      url = `https://waze.com/ul?q=${encodeURIComponent(client.address)}&navigate=yes`;
    }
    
    window.open(url, '_blank');
  };

  // Ligar para o cliente
  const callClient = (phone: string) => {
    window.open(`tel:${phone}`, '_self');
  };

  // Marcar como entregue e ir para o próximo
  const markAsDeliveredAndNext = () => {
    if (currentClient) {
      setCompletedClients(prev => new Set(prev).add(currentClient.id));
    }
    if (currentIndex < sortedClients.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
    setIsNavigating(false);
  };

  // Pular para o próximo sem marcar
  const skipToNext = () => {
    if (currentIndex < sortedClients.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
    setIsNavigating(false);
  };

  // Voltar ao anterior
  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
    setIsNavigating(false);
  };

  // Reiniciar a rota
  const resetRoute = () => {
    setCurrentIndex(0);
    setCompletedClients(new Set());
    setIsNavigating(false);
  };

  // Ir para um cliente específico
  const goToClient = (index: number) => {
    setCurrentIndex(index);
    setIsNavigating(false);
  };

  if (sortedClients.length === 0) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6 text-center">
        <Navigation className="mx-auto text-blue-400 mb-2" size={32} />
        <p className="text-blue-600 font-medium">Nenhum cliente cadastrado</p>
        <p className="text-blue-500 text-sm">Adicione clientes para usar a Entrega Inteligente</p>
      </div>
    );
  }

  const allCompleted = currentIndex >= sortedClients.length;

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl overflow-hidden">
      {/* Header - Sempre visível */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-blue-100/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Navigation className="text-white" size={24} />
          </div>
          <div className="text-left">
            <h3 className="font-bold text-blue-800 text-lg">Entrega Inteligente</h3>
            <p className="text-blue-600 text-sm">
              {completedClients.size} de {sortedClients.length} entregas • 
              {remainingCount > 0 ? ` Faltam ${remainingCount}` : ' Concluído!'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isNavigating && (
            <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full font-bold animate-pulse">
              EM ROTA
            </span>
          )}
          {isExpanded ? <ChevronUp className="text-blue-600" /> : <ChevronDown className="text-blue-600" />}
        </div>
      </button>

      {/* Conteúdo expandido */}
      {isExpanded && (
        <div className="p-4 pt-0 space-y-4">
          
          {/* Cliente Atual - Destaque */}
          {currentClient && !allCompleted ? (
            <div className="bg-white rounded-xl p-4 shadow-lg border-2 border-blue-300">
              <div className="flex items-center justify-between mb-3">
                <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                  Parada {currentIndex + 1} de {sortedClients.length}
                </span>
                {currentClient.coordinates?.lat ? (
                  <span className="text-green-600 text-xs flex items-center gap-1">
                    <MapPin size={12} /> GPS OK
                  </span>
                ) : (
                  <span className="text-amber-600 text-xs flex items-center gap-1">
                    <MapPin size={12} /> Sem GPS
                  </span>
                )}
              </div>

              <div className="space-y-2 mb-4">
                <h4 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <User size={20} className="text-blue-600" />
                  {currentClient.name}
                </h4>
                <p className="text-gray-600 flex items-center gap-2">
                  <MapPin size={16} className="text-gray-400" />
                  {currentClient.address}
                </p>
                {currentClient.phone && (
                  <button 
                    onClick={() => callClient(currentClient.phone)}
                    className="text-blue-600 flex items-center gap-2 hover:underline"
                  >
                    <Phone size={16} />
                    {currentClient.phone}
                  </button>
                )}
                {currentClient.deliveryObs && (
                  <p className="text-amber-600 text-sm bg-amber-50 p-2 rounded">
                    📝 {currentClient.deliveryObs}
                  </p>
                )}
              </div>

              {/* Botões de Navegação */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <button
                  onClick={() => navigateToClient(currentClient)}
                  className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg flex items-center justify-center gap-2 font-bold shadow transition-all active:scale-95"
                >
                  <Play size={18} />
                  Google Maps
                </button>
                <button
                  onClick={() => navigateViaWaze(currentClient)}
                  className="bg-[#33ccff] hover:bg-[#00b8e6] text-white p-3 rounded-lg flex items-center justify-center gap-2 font-bold shadow transition-all active:scale-95"
                >
                  <Navigation size={18} />
                  Waze
                </button>
              </div>

              {/* Botão principal - Marcar como entregue */}
              <button
                onClick={markAsDeliveredAndNext}
                className="w-full bg-green-600 hover:bg-green-700 text-white p-4 rounded-lg flex items-center justify-center gap-2 font-bold text-lg shadow-lg transition-all active:scale-95"
              >
                <CheckCircle size={24} />
                Entregue! Próximo Cliente
                <ArrowRight size={20} />
              </button>

              {/* Botões secundários */}
              <div className="flex gap-2 mt-2">
                <button
                  onClick={goToPrevious}
                  disabled={currentIndex === 0}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 disabled:opacity-50 text-gray-700 p-2 rounded-lg text-sm flex items-center justify-center gap-1"
                >
                  ← Anterior
                </button>
                <button
                  onClick={skipToNext}
                  disabled={currentIndex >= sortedClients.length - 1}
                  className="flex-1 bg-amber-100 hover:bg-amber-200 disabled:opacity-50 text-amber-700 p-2 rounded-lg text-sm flex items-center justify-center gap-1"
                >
                  <SkipForward size={14} />
                  Pular
                </button>
              </div>
            </div>
          ) : (
            /* Todas as entregas concluídas */
            <div className="bg-green-100 border-2 border-green-300 rounded-xl p-6 text-center">
              <CheckCircle className="mx-auto text-green-600 mb-2" size={48} />
              <h4 className="text-xl font-bold text-green-800">Rota Concluída! 🎉</h4>
              <p className="text-green-600">Todas as {sortedClients.length} entregas foram visitadas</p>
              <button
                onClick={resetRoute}
                className="mt-4 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 mx-auto"
              >
                <RotateCcw size={18} />
                Reiniciar Rota
              </button>
            </div>
          )}

          {/* Próximo Cliente - Preview */}
          {nextClient && !allCompleted && (
            <div className="bg-white/70 rounded-lg p-3 border border-gray-200">
              <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Próxima Parada:</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-700">{nextClient.name}</p>
                  <p className="text-sm text-gray-500 truncate">{nextClient.address}</p>
                </div>
                <span className="bg-gray-200 text-gray-600 px-2 py-1 rounded text-sm">
                  #{currentIndex + 2}
                </span>
              </div>
            </div>
          )}

          {/* Lista completa de clientes */}
          <div className="bg-white rounded-lg p-3">
            <p className="font-semibold text-gray-700 text-sm mb-2">
              Ordem de Entrega:
            </p>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {sortedClients.map((client, index) => {
                const isCompleted = completedClients.has(client.id);
                const isCurrent = index === currentIndex;
                
                return (
                  <button
                    key={client.id}
                    onClick={() => goToClient(index)}
                    className={`w-full flex items-center gap-2 p-2 rounded text-sm text-left transition-all
                      ${isCurrent ? 'bg-blue-100 border-2 border-blue-400' : 'bg-gray-50 hover:bg-gray-100'}
                      ${isCompleted ? 'opacity-60' : ''}
                    `}
                  >
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                      ${isCompleted ? 'bg-green-500 text-white' : isCurrent ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'}
                    `}>
                      {isCompleted ? <CheckCircle size={14} /> : index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium truncate ${isCompleted ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                        {client.name}
                      </p>
                    </div>
                    {isCurrent && (
                      <span className="text-blue-600 text-xs font-bold">ATUAL</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Botão de reset */}
          {completedClients.size > 0 && (
            <button
              onClick={resetRoute}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 p-2 rounded-lg text-sm flex items-center justify-center gap-2"
            >
              <RotateCcw size={16} />
              Reiniciar do Início
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default SmartDeliveryMap;
