import { useMapEvents } from 'react-leaflet';

function ZoomTracker({ setZoom }) {
    const map = useMapEvents({ zoomend: () => setZoom(map.getZoom()) });
    return null;
}

export default ZoomTracker;

