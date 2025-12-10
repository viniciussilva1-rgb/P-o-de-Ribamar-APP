import React, { useState, useMemo } from 'react';
import { MapPin, Navigation, ExternalLink, Route, Users, Clock, RefreshCw, ChevronDown, ChevronUp, Play } from 'lucide-react';
import { Client } from '../types';

interface SmartDeliveryMapProps {
  clients: Client[];
  driverName?: string;
}

const SmartDeliveryMap: React.FC<SmartDeliveryMapProps> = ({ clients, driverName }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [startingPoint, setStartingPoint] = useState<string>('');
  const [useCurrentLocation, setUseCurrentLocation] = useState(true);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Filtrar clientes que têm coordenadas e ordenar por sortOrder
  const clientsWithCoords = useMemo(() => {
    return clients
      .filter(c => c.coordinates && c.coordinates.lat && c.coordinates.lng && c.status === 'ACTIVE')
      .sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999));
  }, [clients]);

  // Clientes sem coordenadas
  const clientsWithoutCoords = useMemo(() => {
    return clients
      .filter(c => !c.coordinates || !c.coordinates.lat || !c.coordinates.lng)
      .filter(c => c.status === 'ACTIVE');
  }, [clients]);

  // Obter localização atual
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocalização não suportada pelo navegador');
      return;
    }

    setIsLoadingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setIsLoadingLocation(false);
      },
      (error) => {
        console.error('Erro ao obter localização:', error);
        alert('Não foi possível obter sua localização. Verifique as permissões.');
        setIsLoadingLocation(false);
      },
      { enableHighAccuracy: true }
    );
  };

  // Gerar URL do Google Maps com waypoints
  const generateGoogleMapsUrl = () => {
    if (clientsWithCoords.length === 0) return null;

    // Ponto de partida
    let origin = '';
    if (useCurrentLocation && currentLocation) {
      origin = `${currentLocation.lat},${currentLocation.lng}`;
    } else if (startingPoint) {
      origin = encodeURIComponent(startingPoint);
    } else if (currentLocation) {
      origin = `${currentLocation.lat},${currentLocation.lng}`;
    } else {
      // Usar o primeiro cliente como origem se não tiver localização
      const first = clientsWithCoords[0];
      origin = `${first.coordinates!.lat},${first.coordinates!.lng}`;
    }

    // Destino (último cliente)
    const lastClient = clientsWithCoords[clientsWithCoords.length - 1];
    const destination = `${lastClient.coordinates!.lat},${lastClient.coordinates!.lng}`;

    // Waypoints (clientes do meio, máximo 23 para Google Maps)
    const middleClients = clientsWithCoords.slice(0, -1).slice(0, 23);
    const waypoints = middleClients
      .map(c => `${c.coordinates!.lat},${c.coordinates!.lng}`)
      .join('|');

    // Construir URL
    let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
    
    if (waypoints) {
      url += `&waypoints=${encodeURIComponent(waypoints)}`;
    }

    return url;
  };

  // Gerar URL para navegação Waze
  const generateWazeUrl = () => {
    if (clientsWithCoords.length === 0) return null;
    
    // Waze só aceita um destino, usar o primeiro cliente
    const firstClient = clientsWithCoords[0];
    return `https://waze.com/ul?ll=${firstClient.coordinates!.lat},${firstClient.coordinates!.lng}&navigate=yes`;
  };

  // Abrir mapa no Google Maps
  const openInGoogleMaps = () => {
    const url = generateGoogleMapsUrl();
    if (url) {
      window.open(url, '_blank');
    }
  };

  // Abrir no Waze
  const openInWaze = () => {
    const url = generateWazeUrl();
    if (url) {
      window.open(url, '_blank');
    }
  };

  // Estimar tempo total (aproximado: 5 min por cliente + 3 min de deslocamento)
  const estimatedTime = useMemo(() => {
    const minutes = clientsWithCoords.length * 8; // ~8 min por cliente (entrega + deslocamento)
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}min` : `${mins}min`;
  }, [clientsWithCoords.length]);

  if (clients.length === 0) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6 text-center">
        <Navigation className="mx-auto text-blue-400 mb-2" size={32} />
        <p className="text-blue-600 font-medium">Nenhum cliente cadastrado</p>
        <p className="text-blue-500 text-sm">Adicione clientes para usar a Entrega Inteligente</p>
      </div>
    );
  }

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
              {clientsWithCoords.length} clientes com GPS • Tempo estimado: {estimatedTime}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full font-bold">
            GPS
          </span>
          {isExpanded ? <ChevronUp className="text-blue-600" /> : <ChevronDown className="text-blue-600" />}
        </div>
      </button>

      {/* Conteúdo expandido */}
      {isExpanded && (
        <div className="p-4 pt-0 space-y-4">
          {/* Instruções */}
          <div className="bg-white/70 rounded-lg p-3 text-sm text-blue-700">
            <p className="font-medium mb-1">📍 Como funciona:</p>
            <p>O sistema irá abrir o Google Maps com todos os clientes na ordem de entrega que você definiu.</p>
          </div>

          {/* Opções de ponto de partida */}
          <div className="bg-white rounded-lg p-3 space-y-3">
            <p className="font-semibold text-gray-700 text-sm">Ponto de Partida:</p>
            
            <div className="flex items-center gap-2">
              <input
                type="radio"
                id="currentLoc"
                checked={useCurrentLocation}
                onChange={() => setUseCurrentLocation(true)}
                className="text-blue-600"
              />
              <label htmlFor="currentLoc" className="text-sm text-gray-600 flex-1">
                Usar minha localização atual
              </label>
              <button
                onClick={getCurrentLocation}
                disabled={isLoadingLocation}
                className="text-blue-600 hover:text-blue-700 p-1"
                title="Atualizar localização"
              >
                <RefreshCw size={16} className={isLoadingLocation ? 'animate-spin' : ''} />
              </button>
            </div>

            {currentLocation && (
              <p className="text-xs text-green-600 ml-6">
                ✓ Localização obtida
              </p>
            )}

            <div className="flex items-center gap-2">
              <input
                type="radio"
                id="customLoc"
                checked={!useCurrentLocation}
                onChange={() => setUseCurrentLocation(false)}
                className="text-blue-600"
              />
              <label htmlFor="customLoc" className="text-sm text-gray-600">
                Endereço personalizado:
              </label>
            </div>

            {!useCurrentLocation && (
              <input
                type="text"
                value={startingPoint}
                onChange={(e) => setStartingPoint(e.target.value)}
                placeholder="Ex: Padaria Pão de Ribamar, Lisboa"
                className="w-full p-2 text-sm border border-gray-300 rounded-lg ml-6"
              />
            )}
          </div>

          {/* Lista de clientes na ordem */}
          <div className="bg-white rounded-lg p-3">
            <p className="font-semibold text-gray-700 text-sm mb-2 flex items-center gap-2">
              <Route size={16} />
              Ordem de Entrega ({clientsWithCoords.length} clientes):
            </p>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {clientsWithCoords.map((client, index) => (
                <div
                  key={client.id}
                  className="flex items-center gap-2 p-2 bg-gray-50 rounded text-sm"
                >
                  <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate">{client.name}</p>
                    <p className="text-gray-500 text-xs truncate">{client.address}</p>
                  </div>
                  <MapPin size={14} className="text-green-500 flex-shrink-0" />
                </div>
              ))}
            </div>
          </div>

          {/* Clientes sem GPS */}
          {clientsWithoutCoords.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="font-semibold text-amber-700 text-sm mb-2 flex items-center gap-2">
                <MapPin size={16} className="text-amber-500" />
                Clientes sem GPS ({clientsWithoutCoords.length}):
              </p>
              <p className="text-amber-600 text-xs mb-2">
                Estes clientes não aparecerão no mapa. Edite-os para adicionar coordenadas.
              </p>
              <div className="flex flex-wrap gap-1">
                {clientsWithoutCoords.slice(0, 5).map(client => (
                  <span key={client.id} className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-xs">
                    {client.name}
                  </span>
                ))}
                {clientsWithoutCoords.length > 5 && (
                  <span className="text-amber-600 text-xs">
                    +{clientsWithoutCoords.length - 5} mais
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Botões de ação */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => {
                if (!currentLocation && useCurrentLocation) {
                  getCurrentLocation();
                  setTimeout(openInGoogleMaps, 1500);
                } else {
                  openInGoogleMaps();
                }
              }}
              disabled={clientsWithCoords.length === 0}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white p-3 rounded-lg flex items-center justify-center gap-2 font-bold shadow-lg transition-all active:scale-95"
            >
              <Play size={20} />
              Iniciar Rota no Google Maps
              <ExternalLink size={16} />
            </button>

            <button
              onClick={openInWaze}
              disabled={clientsWithCoords.length === 0}
              className="bg-[#33ccff] hover:bg-[#00b8e6] disabled:bg-gray-300 text-white p-3 rounded-lg flex items-center justify-center gap-2 font-bold shadow-lg transition-all active:scale-95"
            >
              <Navigation size={20} />
              Abrir no Waze
              <ExternalLink size={16} />
            </button>
          </div>

          {/* Info adicional */}
          <div className="flex items-center justify-center gap-4 text-xs text-blue-600">
            <span className="flex items-center gap-1">
              <Users size={14} />
              {clientsWithCoords.length} paradas
            </span>
            <span className="flex items-center gap-1">
              <Clock size={14} />
              ~{estimatedTime}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartDeliveryMap;
