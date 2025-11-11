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

    // Aguardar um pouco para garantir que o DOM está pronto
    const timer = setTimeout(() => {
      if (!containerRef.current || mapRef.current) return;

      // Criar mapa com tema escuro
      const map = L.map(containerRef.current, {
        center,
        zoom,
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

      mapRef.current = map;
    }, 100);

    return () => {
      clearTimeout(timer);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Atualizar marcadores quando motoboys mudarem
  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;
    const markers = markersRef.current;

    // Criar ou atualizar marcadores
    motoboys.forEach((motoboy) => {
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
        }).addTo(map);

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
      } else {
        // Atualizar posição do marcador existente
        const marker = markers.get(motoboy.id)!;
        marker.setLatLng([motoboy.currentLat, motoboy.currentLng]);
        
        // Atualizar cor do marcador se disponibilidade mudou
        const icon = marker.getIcon() as L.DivIcon;
        const iconHtml = icon.options.html as string;
        const isCurrentlyAvailable = iconHtml.includes("#10b981");
        
        if (isCurrentlyAvailable !== motoboy.isAvailable) {
          // Recriar marcador com nova cor
          map.removeLayer(marker);
          markers.delete(motoboy.id);
          // Será recriado na próxima iteração
        }
      }
    });

    // Remover marcadores que não existem mais
    markers.forEach((marker, id) => {
      if (!motoboys.find((m) => m.id === id)) {
        map.removeLayer(marker);
        markers.delete(id);
      }
    });

    // Ajustar zoom para mostrar todos os marcadores apenas se houver motoboys
    if (motoboys.length > 0 && motoboys.some((m) => m.currentLat && m.currentLng)) {
      const bounds = L.latLngBounds(
        motoboys
          .filter((m) => m.currentLat && m.currentLng)
          .map((m) => [m.currentLat!, m.currentLng!] as [number, number])
      );
      if (bounds.isValid() && bounds.getNorth() !== bounds.getSouth() && bounds.getEast() !== bounds.getWest()) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      }
    } else {
      // Garantir que o mapa seja invalidado mesmo sem marcadores
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
        }
      }, 200);
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

