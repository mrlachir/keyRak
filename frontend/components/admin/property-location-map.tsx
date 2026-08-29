"use client";

import "leaflet/dist/leaflet.css";

import { useEffect } from "react";
import { CircleMarker, MapContainer, TileLayer, useMapEvents } from "react-leaflet";

const marrakeshCenter: [number, number] = [31.6295, -7.9811];

function validCoordinates(latitude: number, longitude: number): boolean {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180
  );
}

function PinDrop({
  latitude,
  longitude,
  onCoordinatesChange,
}: {
  latitude: number;
  longitude: number;
  onCoordinatesChange: (latitude: number, longitude: number) => void;
}) {
  const map = useMapEvents({
    click(event) {
      onCoordinatesChange(event.latlng.lat, event.latlng.lng);
    },
  });
  const position: [number, number] = validCoordinates(latitude, longitude)
    ? [latitude, longitude]
    : marrakeshCenter;

  useEffect(() => {
    const nextPosition: [number, number] = validCoordinates(latitude, longitude)
      ? [latitude, longitude]
      : marrakeshCenter;
    map.setView(nextPosition, Math.max(map.getZoom(), 14), { animate: true });
  }, [latitude, longitude, map]);

  return (
    <CircleMarker
      center={position}
      radius={10}
      pathOptions={{ color: "#ffffff", weight: 3, fillColor: "#2757c7", fillOpacity: 1 }}
    />
  );
}

export default function PropertyLocationMap({
  latitude,
  longitude,
  onCoordinatesChange,
}: {
  latitude: number;
  longitude: number;
  onCoordinatesChange: (latitude: number, longitude: number) => void;
}) {
  const center: [number, number] = validCoordinates(latitude, longitude)
    ? [latitude, longitude]
    : marrakeshCenter;

  return (
    <MapContainer
      center={center}
      zoom={14}
      scrollWheelZoom
      className="h-72 w-full"
      aria-label="Choose the property location on a map"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
      />
      <PinDrop
        latitude={latitude}
        longitude={longitude}
        onCoordinatesChange={onCoordinatesChange}
      />
    </MapContainer>
  );
}
