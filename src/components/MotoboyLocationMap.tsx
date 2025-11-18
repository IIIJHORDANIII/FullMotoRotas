"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type MotoboyLocationMapProps = {
  lat: number;
  lng: number;
  fullName?: string;
};

// Fix para ícones padrão do Leaflet (apenas no cliente)
let iconFixed = false;
if (typeof window !== "undefined" && !iconFixed) {
  iconFixed = true;
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

export default function MotoboyLocationMap({ lat, lng, fullName = "Sua localização" }: MotoboyLocationMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const timer = setTimeout(() => {
      if (!containerRef.current || mapRef.current) return;

      // Criar mapa com tema escuro
      const map = L.map(containerRef.current, {
        center: [lat, lng],
        zoom: 15,
        zoomControl: true,
        attributionControl: true,
      });

      // Tile layer com tema escuro (CartoDB Dark Matter)
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 19,
      }).addTo(map);

      // Invalidar tamanho após um pequeno delay
      setTimeout(() => {
        map.invalidateSize();
        setMapReady(true);
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
  }, []);

  // Atualizar marcador quando a localização mudar
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;

    const map = mapRef.current;

    // Criar marcador customizado para o motoboy
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
      background-color: #f97316;
      border: 3px solid white;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
    `;
    circleDiv.textContent = "🛵";

    // Adicionar efeito de pulso
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
    markerDiv.appendChild(circleDiv);

    const vehicleIcon = L.divIcon({
      className: "custom-marker",
      html: markerDiv.outerHTML,
      iconSize: [48, 48],
      iconAnchor: [24, 24],
      popupAnchor: [0, -24],
    });

    // Remover marcador anterior se existir
    if (markerRef.current) {
      map.removeLayer(markerRef.current);
    }

    // Criar novo marcador
    const marker = L.marker([lat, lng], {
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
    nameDiv.textContent = fullName;

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
      background-color: #d1fae5;
      color: #065f46;
    `;
    statusBadge.textContent = "📍 Localização Atual";
    statusDiv.appendChild(statusBadge);

    const infoDiv = document.createElement("div");
    infoDiv.style.cssText = `
      font-size: 11px;
      color: #64748b;
      line-height: 1.5;
      margin-top: 8px;
    `;
    infoDiv.innerHTML = `
      <div>Lat: ${lat.toFixed(6)}</div>
      <div>Lng: ${lng.toFixed(6)}</div>
    `;

    popupDiv.appendChild(nameDiv);
    popupDiv.appendChild(statusDiv);
    popupDiv.appendChild(infoDiv);

    marker.bindPopup(popupDiv);
    marker.openPopup();

    // Centralizar mapa na localização
    map.setView([lat, lng], 15);

    markerRef.current = marker;
  }, [lat, lng, fullName, mapReady]);

  return (
    <div className="w-full h-full rounded-lg overflow-hidden border border-slate-800 shadow-xl relative">
      <style jsx global>{`
        @keyframes pulse-ring {
          0% {
            box-shadow: 0 0 0 0 rgba(52, 211, 153, 0.7);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(52, 211, 153, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(52, 211, 153, 0);
          }
        }
      `}</style>
      <div 
        ref={containerRef} 
        className="w-full h-full"
        style={{ minHeight: "400px", height: "100%" }}
      />
    </div>
  );
}

