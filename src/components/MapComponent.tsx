"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type MotoboyLocation = {
  id: string;
  fullName: string;
  currentLat: number | null;
  currentLng: number | null;
  isAvailable: boolean;
  vehicleType: string;
  phone?: string;
  updatedAt?: string;
};

type MapComponentProps = {
  motoboys: MotoboyLocation[];
  center?: [number, number];
  zoom?: number;
};

// Definição das cidades com suas coordenadas centrais e raios
const CITIES = [
  {
    name: "Todas as cidades",
    value: "all",
    centerLat: -26.3044,
    centerLng: -48.8456,
    radius: 0.15,
  },
  {
    name: "Joinville",
    value: "joinville",
    centerLat: -26.3044,
    centerLng: -48.8456,
    radius: 0.15,
  },
  {
    name: "Jaraguá do Sul",
    value: "jaragua",
    centerLat: -26.4853,
    centerLng: -49.0664,
    radius: 0.1,
  },
  {
    name: "Florianópolis",
    value: "florianopolis",
    centerLat: -27.5954,
    centerLng: -48.5480,
    radius: 0.2,
  },
];

// Função para calcular distância em km entre duas coordenadas
function distanceInKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Raio da Terra em km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Função para determinar a cidade de um motoboy baseado nas coordenadas
function getCityByCoordinates(lat: number, lng: number): string | null {
  let closestCity: { name: string; distance: number } | null = null;
  
  // Ignorar "Todas as cidades" na busca
  const citiesToCheck = CITIES.filter(c => c.value !== "all");
  
  for (const city of citiesToCheck) {
    const distance = distanceInKm(lat, lng, city.centerLat, city.centerLng);
    // Converter raio de graus para km (aproximadamente 1 grau = 111km)
    const radiusKm = city.radius * 111;
    
    if (distance <= radiusKm) {
      if (!closestCity || distance < closestCity.distance) {
        closestCity = { name: city.value, distance };
      }
    }
  }
  
  return closestCity ? closestCity.name : null;
}

// Fix para ícones padrão do Leaflet
if (typeof window !== "undefined") {
  const DefaultIcon = L.Icon.Default.prototype as unknown as {
    _getIconUrl?: string;
  };
  delete DefaultIcon._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  });
}

export default function MapComponent({ motoboys, center = [-23.5505, -46.6333], zoom = 12 }: MapComponentProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const userInteractedRef = useRef<boolean>(false); // Rastrear se o usuário interagiu com o mapa
  const hasCenteredOnceRef = useRef<boolean>(false); // Rastrear se já centralizou pelo menos uma vez
  const [selectedCity, setSelectedCity] = useState<string>("all"); // Estado para cidade selecionada
  
  // Filtrar motoboys baseado na cidade selecionada
  const filteredMotoboys = selectedCity === "all" 
    ? motoboys 
    : motoboys.filter((motoboy) => {
        if (!motoboy.currentLat || !motoboy.currentLng) return false;
        const motoboyCity = getCityByCoordinates(motoboy.currentLat, motoboy.currentLng);
        return motoboyCity === selectedCity;
      });

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Garantir que o container tenha altura
    if (containerRef.current) {
      containerRef.current.style.height = "100%";
      containerRef.current.style.width = "100%";
    }

    // Aguardar um pouco para garantir que o DOM está pronto
    const timer = setTimeout(() => {
      if (!containerRef.current || mapRef.current) return;

      // Criar mapa com tema escuro usando centro e zoom padrão
      const map = L.map(containerRef.current, {
        center: center,
        zoom: zoom,
        zoomControl: true,
        attributionControl: true,
      });

      // Tile layer com tema escuro (CartoDB Dark Matter)
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 19,
      }).addTo(map);

      // Invalidar tamanho após um pequeno delay para garantir renderização
      setTimeout(() => {
        map.invalidateSize();
      }, 100);

      // Detectar interações do usuário (zoom, pan) para prevenir centralização automática
      map.on('zoomstart', () => {
        userInteractedRef.current = true;
      });

      map.on('movestart', () => {
        userInteractedRef.current = true;
      });

      map.on('dragstart', () => {
        userInteractedRef.current = true;
      });

      mapRef.current = map;
    }, 100);

    return () => {
      clearTimeout(timer);
      // NÃO remover o mapa aqui - apenas limpar quando o componente for desmontado completamente
      // Isso evita que o mapa seja recriado durante atualizações
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Criar mapa apenas uma vez quando o componente montar

  // Atualizar marcadores quando motoboys mudarem ou cidade selecionada mudar
  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;
    const markers = markersRef.current;

    // Filtrar motoboys com localização válida primeiro (usando filteredMotoboys)
    const validMotoboys = filteredMotoboys.filter((m) => m.currentLat && m.currentLng);
    
    // Se não há motoboys válidos, limpar todos os marcadores
    if (validMotoboys.length === 0) {
      markers.forEach((marker) => map.removeLayer(marker));
      markers.clear();
      return;
    }

    // Criar ou atualizar marcadores em batch para melhor performance
    const markersToAdd: L.Marker[] = [];
    
    validMotoboys.forEach((motoboy) => {
      if (!motoboy.currentLat || !motoboy.currentLng) return;
      
      if (!markers.has(motoboy.id)) {
        // Criar novo marcador com estilo customizado
        const vehicleEmoji = motoboy.vehicleType === "moto" ? "🏍️" : motoboy.vehicleType === "bike" ? "🚲" : "🚗";
        const markerColor = motoboy.isAvailable ? "#10b981" : "#ef4444"; // green-500 ou red-500
        
        const markerDiv = document.createElement("div");
        markerDiv.style.cssText = `
          position: relative;
          width: 48px;
          height: 48px;
        `;
        
        const circleDiv = document.createElement("div");
        circleDiv.style.cssText = `
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background-color: ${markerColor};
          border: 3px solid white;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          transition: transform 0.2s;
        `;
        circleDiv.textContent = vehicleEmoji;
        
        // Adicionar efeito hover
        circleDiv.addEventListener("mouseenter", () => {
          circleDiv.style.transform = "scale(1.1)";
        });
        circleDiv.addEventListener("mouseleave", () => {
          circleDiv.style.transform = "scale(1)";
        });
        
        if (motoboy.isAvailable) {
          const pulseDiv = document.createElement("div");
          pulseDiv.style.cssText = `
            position: absolute;
            top: -4px;
            right: -4px;
            width: 16px;
            height: 16px;
            background-color: #34d399;
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 0 0 0 rgba(52, 211, 153, 0.7);
            animation: pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          `;
          markerDiv.appendChild(pulseDiv);
        }
        
        markerDiv.appendChild(circleDiv);
        
        const vehicleIcon = L.divIcon({
          className: "custom-marker",
          html: markerDiv.outerHTML,
          iconSize: [48, 48],
          iconAnchor: [24, 24],
          popupAnchor: [0, -24],
        });

        const marker = L.marker([motoboy.currentLat, motoboy.currentLng], {
          icon: vehicleIcon,
        });

        // Popup com informações
        const popupDiv = document.createElement("div");
        popupDiv.style.cssText = `
          padding: 12px;
          min-width: 200px;
          font-family: inherit;
        `;
        
        const nameDiv = document.createElement("div");
        nameDiv.style.cssText = `
          font-weight: 600;
          color: #0f172a;
          margin-bottom: 8px;
          font-size: 14px;
        `;
        nameDiv.textContent = motoboy.fullName;
        
        const statusDiv = document.createElement("div");
        statusDiv.style.cssText = `
          margin-bottom: 8px;
          font-size: 12px;
        `;
        const statusBadge = document.createElement("span");
        statusBadge.style.cssText = `
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 500;
          ${motoboy.isAvailable 
            ? "background-color: #d1fae5; color: #065f46;" 
            : "background-color: #fee2e2; color: #991b1b;"}
        `;
        statusBadge.textContent = motoboy.isAvailable ? "✓ Disponível" : "✗ Indisponível";
        statusDiv.appendChild(statusBadge);
        
        const infoDiv = document.createElement("div");
        infoDiv.style.cssText = `
          font-size: 11px;
          color: #64748b;
          line-height: 1.5;
        `;
        infoDiv.innerHTML = `
          <div>Veículo: ${motoboy.vehicleType}</div>
          ${motoboy.phone ? `<div style="margin-top: 4px;">📞 ${motoboy.phone}</div>` : ""}
        `;
        
        popupDiv.appendChild(nameDiv);
        popupDiv.appendChild(statusDiv);
        popupDiv.appendChild(infoDiv);
        
        // Desabilitar autoPan para prevenir ajuste automático do mapa quando popup abre
        marker.bindPopup(popupDiv, {
          autoPan: false, // Prevenir que o mapa se ajuste automaticamente
        });

        markers.set(motoboy.id, marker);
        markersToAdd.push(marker); // Adicionar à lista para adicionar em batch
      } else {
        // Atualizar posição do marcador existente SEM remover
        const marker = markers.get(motoboy.id)!;
        const currentLatLng = marker.getLatLng();
        const newLatLng = [motoboy.currentLat, motoboy.currentLng] as [number, number];
        
        // Só atualizar posição se mudou significativamente (evita flickering)
        if (
          Math.abs(currentLatLng.lat - newLatLng[0]) > 0.0001 ||
          Math.abs(currentLatLng.lng - newLatLng[1]) > 0.0001
        ) {
          marker.setLatLng(newLatLng);
        }
        
        // Atualizar cor do marcador se disponibilidade mudou (sem remover)
        const icon = marker.getIcon() as L.DivIcon;
        const iconHtml = icon.options.html as string;
        const isCurrentlyAvailable = iconHtml.includes("#10b981");
        
        if (isCurrentlyAvailable !== motoboy.isAvailable) {
          // Recriar apenas o ícone, mantendo o marcador no mapa
          const vehicleEmoji = motoboy.vehicleType === "moto" ? "🏍️" : motoboy.vehicleType === "bike" ? "🚲" : "🚗";
          const markerColor = motoboy.isAvailable ? "#10b981" : "#ef4444";
          
          const markerDiv = document.createElement("div");
          markerDiv.style.cssText = `
            position: relative;
            width: 48px;
            height: 48px;
          `;
          
          const circleDiv = document.createElement("div");
          circleDiv.style.cssText = `
            width: 48px;
            height: 48px;
            border-radius: 50%;
            background-color: ${markerColor};
            border: 3px solid white;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.1);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            transition: transform 0.2s;
          `;
          circleDiv.textContent = vehicleEmoji;
          
          if (motoboy.isAvailable) {
            const pulseDiv = document.createElement("div");
            pulseDiv.style.cssText = `
              position: absolute;
              top: -4px;
              right: -4px;
              width: 16px;
              height: 16px;
              background-color: #34d399;
              border-radius: 50%;
              border: 2px solid white;
              box-shadow: 0 0 0 0 rgba(52, 211, 153, 0.7);
              animation: pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
            `;
            markerDiv.appendChild(pulseDiv);
          }
          
          markerDiv.appendChild(circleDiv);
          
          const newIcon = L.divIcon({
            className: "custom-marker",
            html: markerDiv.outerHTML,
            iconSize: [48, 48],
            iconAnchor: [24, 24],
            popupAnchor: [0, -24],
          });
          
          marker.setIcon(newIcon);
        }
      }
    });

    // Adicionar novos marcadores em batch (mais eficiente)
    if (markersToAdd.length > 0) {
      // Usar requestAnimationFrame para adicionar marcadores de forma otimizada
      requestAnimationFrame(() => {
        markersToAdd.forEach((marker) => {
          marker.addTo(map);
        });
        
        // Centralizar automaticamente apenas na primeira vez que os pins são carregados
        if (!hasCenteredOnceRef.current && validMotoboys.length > 0 && !userInteractedRef.current) {
          hasCenteredOnceRef.current = true;
          
          // Aguardar um pouco para garantir que os marcadores foram renderizados
          setTimeout(() => {
            if (!mapRef.current) return;
            
            if (validMotoboys.length === 1) {
              // Se há apenas um motoboy, centralizar nele
              mapRef.current.setView(
                [validMotoboys[0].currentLat!, validMotoboys[0].currentLng!], 
                15,
                { animate: true }
              );
            } else {
              // Se há múltiplos motoboys, ajustar bounds
              const bounds = L.latLngBounds(
                validMotoboys.map((m) => [m.currentLat!, m.currentLng!] as [number, number])
              );
              
              if (bounds.isValid() && bounds.getNorth() !== bounds.getSouth() && bounds.getEast() !== bounds.getWest()) {
                mapRef.current.fitBounds(bounds, { 
                  padding: [50, 50], 
                  maxZoom: 15,
                  animate: true
                });
              }
            }
          }, 300); // Pequeno delay para garantir renderização
        }
      });
    }

    // Remover marcadores apenas se realmente não existem mais na lista
    // Usar um Set para verificação eficiente e evitar remoções desnecessárias
    const motoboyIds = new Set(validMotoboys.map((m) => m.id));
    const toRemove: string[] = [];
    
    markers.forEach((marker, id) => {
      if (!motoboyIds.has(id)) {
        // Marcar para remoção
        toRemove.push(id);
      }
    });
    
    // Remover apenas os marcadores que realmente não existem mais em batch
    if (toRemove.length > 0) {
      requestAnimationFrame(() => {
        toRemove.forEach((id) => {
          const marker = markers.get(id);
          if (marker) {
            map.removeLayer(marker);
            markers.delete(id);
          }
        });
      });
    }
    
    // Centralizar automaticamente na primeira vez se não há novos marcadores mas há motoboys válidos
    // Isso cobre o caso onde os motoboys já existem quando o componente monta
    // Verificar após processar tudo se ainda não centralizou e há marcadores no mapa
    if (!hasCenteredOnceRef.current && validMotoboys.length > 0 && !userInteractedRef.current && markersToAdd.length === 0) {
      // Verificar se há marcadores no mapa (pode ser que já existiam antes)
      const hasMarkersOnMap = Array.from(markers.values()).some(marker => map.hasLayer(marker));
      
      if (hasMarkersOnMap) {
        hasCenteredOnceRef.current = true;
        
        // Aguardar um pouco para garantir que o mapa está pronto
        setTimeout(() => {
          if (!mapRef.current) return;
          
          if (validMotoboys.length === 1) {
            // Se há apenas um motoboy, centralizar nele
            mapRef.current.setView(
              [validMotoboys[0].currentLat!, validMotoboys[0].currentLng!], 
              15,
              { animate: true }
            );
          } else {
            // Se há múltiplos motoboys, ajustar bounds
            const bounds = L.latLngBounds(
              validMotoboys.map((m) => [m.currentLat!, m.currentLng!] as [number, number])
            );
            
            if (bounds.isValid() && bounds.getNorth() !== bounds.getSouth() && bounds.getEast() !== bounds.getWest()) {
              mapRef.current.fitBounds(bounds, { 
                padding: [50, 50], 
                maxZoom: 15,
                animate: true
              });
            }
          }
        }, 500); // Delay um pouco maior para garantir que tudo está renderizado
      }
    }
  }, [filteredMotoboys]);

  // Função para centralizar o mapa nos motoboys
  const handleCenterMap = () => {
    if (!mapRef.current) return;
    
    const validMotoboys = filteredMotoboys.filter((m) => m.currentLat && m.currentLng);
    
    if (validMotoboys.length === 0) {
      return;
    }
    
    // Marcar que já centralizou (mesmo que manualmente)
    hasCenteredOnceRef.current = true;
    
    // Resetar flag de interação quando o usuário clica no botão de centralizar
    userInteractedRef.current = false;
    
    if (validMotoboys.length === 1) {
      // Se há apenas um motoboy, centralizar nele
      mapRef.current.setView(
        [validMotoboys[0].currentLat!, validMotoboys[0].currentLng!], 
        15,
        { animate: true }
      );
    } else {
      // Se há múltiplos motoboys, ajustar bounds
      const bounds = L.latLngBounds(
        validMotoboys.map((m) => [m.currentLat!, m.currentLng!] as [number, number])
      );
      
      if (bounds.isValid() && bounds.getNorth() !== bounds.getSouth() && bounds.getEast() !== bounds.getWest()) {
        mapRef.current.fitBounds(bounds, { 
          padding: [50, 50], 
          maxZoom: 15,
          animate: true
        });
      }
    }
  };

  return (
    <div className="relative w-full h-full rounded-lg overflow-hidden border border-slate-800 shadow-xl" style={{ minHeight: "500px", height: "100%" }}>
      <div 
        ref={containerRef} 
        className="w-full h-full"
      />
      
      {/* Legenda/Filtro de cidade - posicionado no topo */}
      <div className="absolute top-4 left-4 z-[1000] bg-slate-900/95 backdrop-blur-sm rounded-lg shadow-lg border border-slate-700 p-3 min-w-[200px]">
        <label htmlFor="city-filter" className="block text-xs font-semibold text-slate-300 mb-2">
          Filtrar por cidade
        </label>
        <select
          id="city-filter"
          value={selectedCity}
          onChange={(e) => setSelectedCity(e.target.value)}
          className="w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
        >
          {CITIES.map((city) => (
            <option key={city.value} value={city.value} className="bg-slate-800 text-slate-200">
              {city.name}
            </option>
          ))}
        </select>
        {selectedCity !== "all" && (
          <div className="mt-2 text-xs text-slate-400">
            {filteredMotoboys.filter((m) => m.currentLat && m.currentLng).length} motoboy(s) encontrado(s)
          </div>
        )}
      </div>
      
      {/* Botão flutuante para centralizar - posicionado na parte inferior centralizada */}
      <button
        onClick={handleCenterMap}
        className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-[1000] bg-slate-900 hover:bg-slate-800 text-white rounded-full p-3 shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center group"
        style={{
          width: "56px",
          height: "56px",
          boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2)",
        }}
        title="Centralizar mapa nos motoboys"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6 group-hover:scale-110 transition-transform duration-200"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      </button>
    </div>
  );
}

