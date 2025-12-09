import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

function MapCenterController({ centerCoords }) {
    const map = useMap();
    useEffect(() => { if (centerCoords) map.setView([centerCoords.lat, centerCoords.lng], 14, { animate: true }); }, [centerCoords, map]);
    return null;
}

export default MapCenterController;

