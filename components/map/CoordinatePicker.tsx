'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
import type { Marker as LeafletMarker } from 'leaflet'
import { terminalIcon } from './icons'

// Centre of the Philippines, matching components/map/index.tsx.
const PH_CENTER: [number, number] = [12.8797, 121.774]
const PH_ZOOM = 6
const PICKED_ZOOM = 15

interface CoordinatePickerProps {
  lat: number | null
  lng: number | null
  onPick: (lat: number, lng: number) => void
}

/** Click anywhere on the map to place the marker. */
function ClickToPlace({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => onPick(e.latlng.lat, e.latlng.lng),
  })
  return null
}

/** Recentre when coordinates arrive from outside, e.g. opening the edit form
 *  or pressing "use my current location". */
function Recenter({ lat, lng }: { lat: number | null; lng: number | null }) {
  const map = useMap()
  useEffect(() => {
    if (lat === null || lng === null) return
    map.setView([lat, lng], Math.max(map.getZoom(), PICKED_ZOOM))
  }, [lat, lng, map])
  return null
}

export default function CoordinatePicker({ lat, lng, onPick }: CoordinatePickerProps) {
  const hasPoint = lat !== null && lng !== null

  return (
    <MapContainer
      center={hasPoint ? [lat, lng] : PH_CENTER}
      zoom={hasPoint ? PICKED_ZOOM : PH_ZOOM}
      className="w-full h-64 rounded-lg"
      style={{ background: '#0f172a' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      <ClickToPlace onPick={onPick} />
      <Recenter lat={lat} lng={lng} />
      {hasPoint && (
        <Marker
          position={[lat, lng]}
          icon={terminalIcon}
          draggable
          eventHandlers={{
            dragend: (e) => {
              const { lat: newLat, lng: newLng } = (e.target as LeafletMarker).getLatLng()
              onPick(newLat, newLng)
            },
          }}
        />
      )}
    </MapContainer>
  )
}
