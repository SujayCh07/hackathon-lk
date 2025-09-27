import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export function WorldMap({ markers = [] }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layersRef = useRef([]);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [20, 0],
      zoom: 2,
      zoomControl: false
    });
    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: 'Map data © OpenStreetMap contributors'
    }).addTo(map);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      layersRef.current.forEach((layer) => layer.remove());
      layersRef.current = [];
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    layersRef.current.forEach((layer) => layer.remove());
    layersRef.current = [];

    markers.forEach((marker) => {
      const circle = L.circleMarker(marker.coords, {
        radius: 8,
        color: '#2EC4B6',
        weight: 2,
        fillColor: '#EE6C4D',
        fillOpacity: 0.7
      });
      circle.bindPopup(`<strong>${marker.city}</strong><br/>PPP: ${marker.ppp.toFixed(2)}`);
      circle.addTo(map);
      layersRef.current.push(circle);
    });
  }, [markers]);

  return (
    <div className="relative h-80 w-full overflow-hidden rounded-3xl border border-white/50">
      <div ref={mapRef} className="h-full w-full" aria-label="World map showing PPP hotspots" />
      <div className="pointer-events-none absolute inset-0 rounded-3xl border border-white/30 shadow-inner shadow-teal/20" aria-hidden="true" />
    </div>
  );
}

export default WorldMap;
