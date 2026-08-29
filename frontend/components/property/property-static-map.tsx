"use client";

import "leaflet/dist/leaflet.css";

import { CircleMarker, MapContainer, TileLayer } from "react-leaflet";

type PropertyStaticMapProps = {
  latitude: number;
  longitude: number;
  title: string;
};

export default function PropertyStaticMap({ latitude, longitude, title }: PropertyStaticMapProps) {
  const center: [number, number] = [latitude, longitude];

  return (
    <MapContainer
      center={center}
      zoom={15}
      dragging={false}
      zoomControl={false}
      scrollWheelZoom={false}
      doubleClickZoom={false}
      touchZoom={false}
      boxZoom={false}
      keyboard={false}
      className="h-72 w-full sm:h-80"
      aria-label={`Fixed map showing the location of ${title}`}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
      />
      <CircleMarker
        center={center}
        radius={10}
        pathOptions={{
          color: "#ffffff",
          fillColor: "#4945d8",
          fillOpacity: 1,
          weight: 3,
        }}
      />
    </MapContainer>
  );
}
