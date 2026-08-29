"use client";

import "leaflet/dist/leaflet.css";

import L from "leaflet";
import Link from "next/link";
import { useEffect, useMemo } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";

import { formatPrice } from "@/lib/utils";
import type { Property } from "@/types";

const marrakeshCenter: L.LatLngTuple = [31.6295, -7.9811];
const locationCenters: Array<{ aliases: string[]; coordinates: L.LatLngTuple; zoom: number }> = [
  { aliases: ["marrakech", "marrakesh"], coordinates: marrakeshCenter, zoom: 12 },
  { aliases: ["medina", "jemaa el fnaa", "jemaa el-fnaa"], coordinates: [31.6258, -7.9891], zoom: 14 },
  { aliases: ["gueliz", "guéliz"], coordinates: [31.6343, -8.0129], zoom: 14 },
  { aliases: ["hivernage"], coordinates: [31.6218, -8.0108], zoom: 14 },
  { aliases: ["palmeraie"], coordinates: [31.6806, -7.9678], zoom: 13 },
  { aliases: ["agdal"], coordinates: [31.5917, -7.9873], zoom: 14 },
  { aliases: ["sidi ghanem"], coordinates: [31.6605, -8.0468], zoom: 14 },
];

function normalizeLocation(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase();
}

function validCoordinates(property: Property): boolean {
  return (
    Number.isFinite(Number(property.latitude)) &&
    Number.isFinite(Number(property.longitude)) &&
    Math.abs(Number(property.latitude)) <= 90 &&
    Math.abs(Number(property.longitude)) <= 180
  );
}

function CenterMap({ properties, location }: { properties: Property[]; location: string }) {
  const map = useMap();

  useEffect(() => {
    const coordinates = properties
      .filter(validCoordinates)
      .map((property) => [Number(property.latitude), Number(property.longitude)] as L.LatLngTuple);

    const normalizedLocation = normalizeLocation(location);
    if (normalizedLocation) {
      const knownLocation = locationCenters.find(({ aliases }) => aliases.some((alias) => {
        const normalizedAlias = normalizeLocation(alias);
        return normalizedAlias.includes(normalizedLocation) || normalizedLocation.includes(normalizedAlias);
      }));
      if (knownLocation) {
        map.setView(knownLocation.coordinates, knownLocation.zoom);
        return;
      }

      const matchingProperty = properties.find((property) => normalizeLocation(
        `${property.address} ${property.city}`,
      ).includes(normalizedLocation));
      if (matchingProperty) {
        map.setView([Number(matchingProperty.latitude), Number(matchingProperty.longitude)], 14);
        return;
      }
    }

    if (coordinates.length === 0) {
      map.setView(marrakeshCenter, 12);
    } else if (coordinates.length === 1) {
      map.setView(coordinates[0], 14);
    } else {
      map.fitBounds(L.latLngBounds(coordinates), { padding: [48, 48], maxZoom: 14 });
    }
  }, [location, map, properties]);

  return null;
}

function PriceMarker({ property }: { property: Property }) {
  const priceLabel = new Intl.NumberFormat("fr-MA", { maximumFractionDigits: 0 }).format(
    Number(property.pricePerNight),
  );
  const icon = useMemo(
    () =>
      L.divIcon({
        className: "keyrak-map-marker-wrap",
        html: `<span class="keyrak-map-marker">${priceLabel} MAD</span>`,
        iconAnchor: [45, 18],
        popupAnchor: [0, -19],
      }),
    [priceLabel],
  );

  return (
    <Marker position={[Number(property.latitude), Number(property.longitude)]} icon={icon}>
      <Popup>
        <div className="min-w-44 font-sans">
          <p className="text-sm font-extrabold text-ink">{property.title}</p>
          <p className="mt-1 text-xs text-sand-700">{property.address}, {property.city}</p>
          <p className="mt-2 text-sm font-bold text-majorelle-700">{formatPrice(Number(property.pricePerNight))} / night</p>
          <Link href={`/properties/${property.id}`} className="mt-3 inline-flex text-xs font-extrabold text-terracotta-700 underline decoration-terracotta-300 underline-offset-4">
            View property
          </Link>
        </div>
      </Popup>
    </Marker>
  );
}

export default function PropertyMap({ properties, location = "" }: { properties: Property[]; location?: string }) {
  const mappableProperties = properties.filter(validCoordinates);

  return (
    <MapContainer
      center={marrakeshCenter}
      zoom={12}
      scrollWheelZoom
      className="h-full min-h-[28rem] w-full"
      aria-label="Map of matching properties"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
      />
      <CenterMap properties={mappableProperties} location={location} />
      {mappableProperties.map((property) => <PriceMarker key={property.id} property={property} />)}
    </MapContainer>
  );
}
