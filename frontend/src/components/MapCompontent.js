import { MapContainer, TileLayer} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

function MapComponent() {

    return (
        <MapContainer center={[38.711944321907616, -9.206683151026464]} zoom={13} style={{ height: '100vh', width: '100%' }}>
            <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
        </MapContainer>
    );
}

export default MapComponent;
