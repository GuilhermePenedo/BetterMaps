import { useMapEvents } from 'react-leaflet';

function LocationMarker({ selectionMode, handleMapClick }) {
    useMapEvents({ click(e) { if (selectionMode) handleMapClick(e.latlng, selectionMode); } });
    return null;
}

export default LocationMarker;

