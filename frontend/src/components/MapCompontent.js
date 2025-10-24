import { MapContainer, TileLayer, Marker, Popup, useMapEvents} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useState } from 'react';

function LocationMarker({ onSelect }) {
    useMapEvents({
        click(e) {
            onSelect(e.latlng);
        }
    });
    return null;
}

function MapComponent() {

    const customIcon = new L.Icon({
        iconUrl: process.env.PUBLIC_URL + '/marker.png',
        iconSize: [36, 36],
        iconAnchor: [18, 36],
        popupAnchor: [0, -36]
    });

    const [marker, setMarker] = useState(null);

    return (
        <MapContainer center={[38.711944321907616, -9.206683151026464]} zoom={13} style={{ height: '100vh', width: '100%' , cursor: 'default'}}>
            <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <LocationMarker onSelect={setMarker} />
            {marker && (
                <Marker position={marker} icon={customIcon}>
                    <Popup>
                        Ponto selecionado:<br />
                        Latitude: {marker.lat.toFixed(6)}<br />
                        Longitude: {marker.lng.toFixed(6)}
                    </Popup>
                </Marker>
            )}
        </MapContainer>
    );
}

export default MapComponent;
