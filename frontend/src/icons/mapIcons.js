import L from 'leaflet';

// --- ÍCONES LEAFLET (Mapa) ---
const createIcon = (url) => new L.Icon({ iconUrl: process.env.PUBLIC_URL + url, iconSize: [36, 36], iconAnchor: [18, 36], popupAnchor: [0, -36] });

export const carIcon = createIcon('/car_marker.png');
export const bikeIcon = createIcon('/bike_marker.png');
export const footIcon = createIcon('/foot_marker.png');
export const destinationIcon = createIcon('/destination_marker.png');
export const homeIcon = createIcon('/home_marker.png');

