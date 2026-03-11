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
      <div className="border-2 rounded-xl p-6 text-center" style={{ backgroundColor: '#13161E', borderColor: 'rgba(245,166,35,0.3)' }}>
        <Navigation className="mx-auto mb-2" style={{ color: '#F5A623' }} size={32} />
        <p className="font-medium" style={{ color: '#F5A623' }}>Nenhum cliente cadastrado</p>
        <p className="text-sm" style={{ color: '#A0A8C0' }}>Adicione clientes para usar a Entrega Inteligente</p>
      </div>
    );
  }

  const allCompleted = currentIndex >= sortedClients.length;

  return (
    <div className="border-2 rounded-xl overflow-hidden" style={{ backgroundColor: '#13161E', borderColor: 'rgba(245,166,35,0.3)' }}>
      {/* Header - Sempre visível */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between transition-colors"
        style={{ backgroundColor: '#13161E' }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1A1E29')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#13161E')}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ backgroundColor: '#F5A623' }}>
            <Navigation className="text-black" size={24} />
          </div>
          <div className="text-left">
            <h3 className="font-bold text-lg" style={{ color: '#FFFFFF' }}>Entrega Inteligente</h3>
            <p style={{ color: '#A0A8C0' }} className="text-sm">
              {completedClients.size} de {sortedClients.length} entregas • 
              {remainingCount > 0 ? ` Faltam ${remainingCount}` : ' Concluído!'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isNavigating && (
            <span className="text-white text-xs px-2 py-1 rounded-full font-bold animate-pulse" style={{ backgroundColor: '#22C55E' }}>
              EM ROTA
            </span>
          )}
          {isExpanded ? <ChevronUp style={{ color: '#F5A623' }} /> : <ChevronDown style={{ color: '#F5A623' }} />}
        </div>
      </button>

      {/* Conteúdo expandido */}
      {isExpanded && (
        <div className="p-4 pt-0 space-y-4">
          
          {/* Cliente Atual - Destaque */}
          {currentClient && !allCompleted ? (
            <div className="rounded-xl p-4 shadow-lg border-2" style={{ backgroundColor: '#1A1E29', borderColor: '#F5A623' }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-white px-3 py-1 rounded-full text-sm font-bold" style={{ backgroundColor: '#F5A623', color: '#000' }}>
                  Parada {currentIndex + 1} de {sortedClients.length}
                </span>
                {currentClient.coordinates?.lat ? (
                  <span className="text-xs flex items-center gap-1" style={{ color: '#22C55E' }}>
                    <MapPin size={12} /> GPS OK
                  </span>
                ) : (
                  <span className="text-xs flex items-center gap-1" style={{ color: '#FBBF24' }}>
                    <MapPin size={12} /> Sem GPS
                  </span>
                )}
              </div>

              <div className="space-y-2 mb-4">
                <h4 className="text-xl font-bold flex items-center gap-2" style={{ color: '#FFFFFF' }}>
                  <User size={20} style={{ color: '#F5A623' }} />
                  {currentClient.name}
                </h4>
                <p className="flex items-center gap-2" style={{ color: '#A0A8C0' }}>
                  <MapPin size={16} style={{ color: '#505569' }} />
                  {currentClient.address}
                </p>
                {currentClient.phone && (
                  <button 
                    onClick={() => callClient(currentClient.phone)}
                    className="flex items-center gap-2 hover:underline"
                    style={{ color: '#F5A623' }}
                  >
                    <Phone size={16} />
                    {currentClient.phone}
                  </button>
                )}
                {currentClient.deliveryObs && (
                  <p className="text-sm p-2 rounded" style={{ color: '#F5A623', backgroundColor: 'rgba(245,166,35,0.1)' }}>
                    📝 {currentClient.deliveryObs}
                  </p>
                )}
              </div>

              {/* Botões de Navegação */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <button
                  onClick={() => navigateToClient(currentClient)}
                  className="p-3 rounded-lg flex items-center justify-center gap-2 font-bold shadow transition-all active:scale-95 text-white"
                  style={{ backgroundColor: '#3B82F6' }}
                  onMouseEnter={(e) => (e.currentTarget.style.filter = 'brightness(1.1)')}
                  onMouseLeave={(e) => (e.currentTarget.style.filter = 'brightness(1)')}
                >
                  <Play size={18} />
                  Google Maps
                </button>
                <button
                  onClick={() => navigateViaWaze(currentClient)}
                  className="text-white p-3 rounded-lg flex items-center justify-center gap-2 font-bold shadow transition-all active:scale-95"
                  style={{ backgroundColor: '#33ccff' }}
                  onMouseEnter={(e) => (e.currentTarget.style.filter = 'brightness(1.1)')}
                  onMouseLeave={(e) => (e.currentTarget.style.filter = 'brightness(1)')}
                >
                  <Navigation size={18} />
                  Waze
                </button>
              </div>

              {/* Botão principal - Marcar como entregue */}
              <button
                onClick={markAsDeliveredAndNext}
                className="w-full text-white p-4 rounded-lg flex items-center justify-center gap-2 font-bold text-lg shadow-lg transition-all active:scale-95"
                style={{ backgroundColor: '#22C55E' }}
                onMouseEnter={(e) => (e.currentTarget.style.filter = 'brightness(1.1)')}
                onMouseLeave={(e) => (e.currentTarget.style.filter = 'brightness(1)')}
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
                  className="flex-1 p-2 rounded-lg text-sm flex items-center justify-center gap-1 transition-all"
                  style={{
                    backgroundColor: currentIndex === 0 ? '#2A2E3A' : '#3A3E4A',
                    color: currentIndex === 0 ? '#505569' : '#A0A8C0',
                    opacity: currentIndex === 0 ? 0.5 : 1
                  }}
                >
                  ← Anterior
                </button>
                <button
                  onClick={skipToNext}
                  disabled={currentIndex >= sortedClients.length - 1}
                  className="flex-1 p-2 rounded-lg text-sm flex items-center justify-center gap-1 transition-all"
                  style={{
                    backgroundColor: currentIndex >= sortedClients.length - 1 ? '#2A2E3A' : 'rgba(245,166,35,0.15)',
                    color: currentIndex >= sortedClients.length - 1 ? '#505569' : '#F5A623',
                    opacity: currentIndex >= sortedClients.length - 1 ? 0.5 : 1
                  }}
                >
                  <SkipForward size={14} />
                  Pular
                </button>
              </div>
            </div>
          ) : (
            /* Todas as entregas concluídas */
            <div className="border-2 rounded-xl p-6 text-center" style={{ backgroundColor: '#13161E', borderColor: '#22C55E' }}>
              <CheckCircle className="mx-auto mb-2" style={{ color: '#22C55E' }} size={48} />
              <h4 className="text-xl font-bold" style={{ color: '#22C55E' }}>Rota Concluída! 🎉</h4>
              <p style={{ color: '#A0A8C0' }}>Todas as {sortedClients.length} entregas foram visitadas</p>
              <button
                onClick={resetRoute}
                className="mt-4 text-white px-6 py-2 rounded-lg flex items-center gap-2 mx-auto"
                style={{ backgroundColor: '#22C55E' }}
                onMouseEnter={(e) => (e.currentTarget.style.filter = 'brightness(1.1)')}
                onMouseLeave={(e) => (e.currentTarget.style.filter = 'brightness(1)')}
              >
                <RotateCcw size={18} />
                Reiniciar Rota
              </button>
            </div>
          )}

          {/* Próximo Cliente - Preview */}
          {nextClient && !allCompleted && (
            <div className="rounded-lg p-3 border" style={{ backgroundColor: '#1A1E29', borderColor: 'rgba(255,255,255,0.07)' }}>
              <p className="text-xs uppercase font-semibold mb-1" style={{ color: '#A0A8C0' }}>Próxima Parada:</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium" style={{ color: '#FFFFFF' }}>{nextClient.name}</p>
                  <p className="text-sm truncate" style={{ color: '#A0A8C0' }}>{nextClient.address}</p>
                </div>
                <span className="px-2 py-1 rounded text-sm" style={{ backgroundColor: '#2A2E3A', color: '#A0A8C0' }}>
                  #{currentIndex + 2}
                </span>
              </div>
            </div>
          )}

          {/* Lista completa de clientes */}
          <div className="rounded-lg p-3" style={{ backgroundColor: '#1A1E29' }}>
            <p className="font-semibold text-sm mb-2" style={{ color: '#FFFFFF' }}>
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
                    className={`w-full flex items-center gap-2 p-2 rounded text-sm text-left transition-all`}
                    style={{
                      backgroundColor: isCurrent ? '#2A5A8A' : '#2A2E3A',
                      borderColor: isCurrent ? '#F5A623' : 'transparent',
                      border: isCurrent ? '2px solid #F5A623' : 'none',
                      color: '#FFFFFF',
                      opacity: isCompleted ? 0.6 : 1
                    }}
                  >
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0`}
                      style={{
                        backgroundColor: isCompleted ? '#22C55E' : isCurrent ? '#F5A623' : '#505569',
                        color: isCompleted ? '#FFF' : isCurrent ? '#000' : '#8B96B8'
                      }}>
                      {isCompleted ? <CheckCircle size={14} /> : index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium truncate ${isCompleted ? 'line-through' : ''}`}
                        style={{ color: isCompleted ? '#A0A8C0' : '#FFFFFF' }}>
                        {client.name}
                      </p>
                    </div>
                    {isCurrent && (
                      <span className="text-xs font-bold" style={{ color: '#F5A623' }}>ATUAL</span>
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
              className="w-full p-2 rounded-lg text-sm flex items-center justify-center gap-2 transition-all"
              style={{ backgroundColor: '#2A2E3A', color: '#A0A8C0' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#3A3E4A')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#2A2E3A')}
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
