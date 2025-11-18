"use client";

import { useEffect, useRef } from "react";
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

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Garantir que o container tenha altura
    if (containerRef.current) {
      containerRef.current.style.height = "100%";
      containerRef.current.style.width = "100%";
    }

    // Calcular centro inicial baseado nos motoboys, se houver
    let initialCenter = center;
    let initialZoom = zoom;
    
    const motoboysWithLocation = motoboys.filter((m) => m.currentLat && m.currentLng);
    if (motoboysWithLocation.length > 0) {
      if (motoboysWithLocation.length === 1) {
        initialCenter = [motoboysWithLocation[0].currentLat!, motoboysWithLocation[0].currentLng!];
        initialZoom = 15;
      } else {
        const bounds = L.latLngBounds(
          motoboysWithLocation.map((m) => [m.currentLat!, m.currentLng!] as [number, number])
        );
        if (bounds.isValid()) {
          initialCenter = [bounds.getCenter().lat, bounds.getCenter().lng];
          initialZoom = 12;
        }
      }
    }

    // Aguardar um pouco para garantir que o DOM está pronto
    const timer = setTimeout(() => {
      if (!containerRef.current || mapRef.current) return;

      // Criar mapa com tema escuro
      const map = L.map(containerRef.current, {
        center: initialCenter,
        zoom: initialZoom,
        zoomControl: true,
        attributionControl: true,
      });

      // Tile layer com tema escuro (CartoDB Dark Matter)
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 19,
      }).addTo(map);

      // Se há motoboys, ajustar bounds após criar o mapa
      if (motoboysWithLocation.length > 1) {
        const bounds = L.latLngBounds(
          motoboysWithLocation.map((m) => [m.currentLat!, m.currentLng!] as [number, number])
        );
        if (bounds.isValid() && bounds.getNorth() !== bounds.getSouth() && bounds.getEast() !== bounds.getWest()) {
          setTimeout(() => {
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
          }, 200);
        }
      }

      // Invalidar tamanho após um pequeno delay para garantir renderização
      setTimeout(() => {
        map.invalidateSize();
      }, 100);

      mapRef.current = map;
    }, 100);

    return () => {
      clearTimeout(timer);
      // NÃO remover o mapa aqui - apenas limpar quando o componente for desmontado completamente
      // Isso evita que o mapa seja recriado durante atualizações
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Criar mapa apenas uma vez quando o componente montar

  // Atualizar marcadores quando motoboys mudarem
  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;
    const markers = markersRef.current;

    // Filtrar motoboys com localização válida primeiro
    const validMotoboys = motoboys.filter((m) => m.currentLat && m.currentLng);
    
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
        
        marker.bindPopup(popupDiv);

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

    // Ajustar zoom e centralizar apenas se necessário (evitar ajustes desnecessários)
    if (validMotoboys.length > 0) {
      // Usar debounce para evitar múltiplos ajustes
      const timeoutId = setTimeout(() => {
        if (!mapRef.current) return;
        
        const bounds = L.latLngBounds(
          validMotoboys.map((m) => [m.currentLat!, m.currentLng!] as [number, number])
        );
        
        if (bounds.isValid()) {
          const currentBounds = mapRef.current.getBounds();
          const boundsChanged = 
            Math.abs(bounds.getNorth() - currentBounds.getNorth()) > 0.01 ||
            Math.abs(bounds.getSouth() - currentBounds.getSouth()) > 0.01 ||
            Math.abs(bounds.getEast() - currentBounds.getEast()) > 0.01 ||
            Math.abs(bounds.getWest() - currentBounds.getWest()) > 0.01;
          
          // Só ajustar se os bounds mudaram significativamente
          if (boundsChanged || markers.size === 1) {
            if (validMotoboys.length === 1) {
              mapRef.current.setView(
                [validMotoboys[0].currentLat!, validMotoboys[0].currentLng!], 
                15,
                { animate: false }
              );
            } else if (bounds.getNorth() !== bounds.getSouth() && bounds.getEast() !== bounds.getWest()) {
              mapRef.current.fitBounds(bounds, { 
                padding: [50, 50], 
                maxZoom: 15,
                animate: false
              });
            }
          }
        }
      }, 100); // Reduzir delay para resposta mais rápida
      
      return () => clearTimeout(timeoutId);
    }
  }, [motoboys]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full rounded-lg overflow-hidden border border-slate-800 shadow-xl"
      style={{ minHeight: "500px", height: "100%" }}
    />
  );
}

