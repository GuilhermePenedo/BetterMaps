import { MapContainer, TileLayer, ZoomControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useState } from 'react';
import { fetchRoute, fetchGeocode, fetchReverseGeocode } from '../services/api';
import '../styles/MapComponent.css';

// Componentes do Mapa
import ZoomTracker from './map/ZoomTracker';
import LocationMarker from './map/LocationMarker';
import MapCenterController from './map/MapCenterController';
import MapMarkers from './map/MapMarkers';
import SidePanel from './map/SidePanel';
import RouteModal from './map/RouteModal';

// Hooks
import { useMapIcons } from '../hooks/useMapIcons';
import { useUserLocation } from '../hooks/useUserLocation';
import { useRouteData } from '../hooks/useRouteData';

function MapComponent() {
    const [currentZoom, setCurrentZoom] = useState(13);

    // Estados Principais
    const [origin, setOrigin] = useState(null);
    const [destination, setDestination] = useState(null);
    const [originAddress, setOriginAddress] = useState("");
    const [destAddress, setDestAddress] = useState("");
    const [routeOptions, setRouteOptions] = useState({ tourist: false, climatic: false });
    const [weatherSegments, setWeatherSegments] = useState([]);
    const [touristSpots, setTouristSpots] = useState([]);
    const [routeInfo, setRouteInfo] = useState(null);
    const [selectionMode, setSelectionMode] = useState(null);
    const [transportMode, setTransportMode] = useState('driving');
    const [isLoading, setIsLoading] = useState(false);
    const [activeModal, setActiveModal] = useState(null);

    // Hooks customizados
    const { getPointIcon } = useMapIcons(currentZoom);
    const { userLocation, mapCenter, setMapCenter } = useUserLocation({ lat: 38.7119, lng: -9.2066 });
    const { groupedTourism, mergedWeather } = useRouteData(touristSpots, weatherSegments);

    const toggleOption = (opt) => setRouteOptions(p => ({ ...p, [opt]: !p[opt] }));

    const handleMapSelect = async (latlng, mode) => {
        setSelectionMode(null); setIsLoading(true); setWeatherSegments([]); setTouristSpots([]); setRouteInfo(null);
        try {
            mode==='origin' ? setOrigin(latlng) : setDestination(latlng);
            try {
                const res = await fetchReverseGeocode(latlng.lat, latlng.lng);
                const addr = res.data?.display_name || "Localização";
                mode==='origin' ? setOriginAddress(addr) : setDestAddress(addr);
            } catch {}
        } finally { setIsLoading(false); }
    };

    const handleAddressSearch = async (e, mode) => {
        if (e.key === 'Enter') {
            setIsLoading(true); setWeatherSegments([]); setTouristSpots([]); setRouteInfo(null);
            try {
                const res = await fetchGeocode(mode === 'origin' ? originAddress : destAddress);
                if (res.data?.[0]) {
                    const c = { lat: parseFloat(res.data[0].lat), lng: parseFloat(res.data[0].lon) };
                    mode==='origin' ? setOrigin(c) : setDestination(c);
                    setMapCenter(c);
                } else alert("Não encontrado");
            } catch {} finally { setIsLoading(false); }
        }
    };

    const handleUseCurrentLocation = async () => {
        if (!userLocation) return alert("Sem GPS");
        setIsLoading(true); setWeatherSegments([]); setTouristSpots([]); setRouteInfo(null);
        try {
            const res = await fetchReverseGeocode(userLocation.lat, userLocation.lng);
            setOrigin(userLocation); setOriginAddress(res.data?.display_name); setMapCenter(userLocation);
            if(selectionMode) setSelectionMode(null);
        } catch {} finally { setIsLoading(false); }
    };

    const traceRoute = async () => {
        if (!origin || !destination) return;
        setIsLoading(true); setWeatherSegments([]); setTouristSpots([]);
        try {
            const res = await fetchRoute(origin.lng, origin.lat, destination.lng, destination.lat, transportMode, routeOptions.tourist, routeOptions.climatic);
            if (res.data.routes?.length > 0) {
                const rd = res.data.routes[0];
                if (res.data.weather_segments) {
                    const processedSegments = res.data.weather_segments.map(seg => ({
                        ...seg, coordinates: seg.coordinates.map(c => [c[1], c[0]])
                    }));
                    setWeatherSegments(processedSegments);
                }
                setRouteInfo({ distance: rd.distance, duration: rd.duration });
                if (res.data.tourist_spots) setTouristSpots(res.data.tourist_spots);
            } else alert("Rota não encontrada");
        } catch (e) { console.error(e); alert("Erro rota"); } finally { setIsLoading(false); }
    };

    const handleClear = () => {
        setOrigin(null); setDestination(null); setOriginAddress(""); setDestAddress("");
        setWeatherSegments([]); setRouteInfo(null); setTouristSpots([]); setSelectionMode(null); setActiveModal(null);
    };

    return (
        <div className="map-container-wrapper">
            <SidePanel
                originAddress={originAddress}
                setOriginAddress={setOriginAddress}
                destAddress={destAddress}
                setDestAddress={setDestAddress}
                selectionMode={selectionMode}
                setSelectionMode={setSelectionMode}
                transportMode={transportMode}
                setTransportMode={setTransportMode}
                routeOptions={routeOptions}
                toggleOption={toggleOption}
                handleAddressSearch={handleAddressSearch}
                handleUseCurrentLocation={handleUseCurrentLocation}
                traceRoute={traceRoute}
                origin={origin}
                destination={destination}
                isLoading={isLoading}
                handleClear={handleClear}
                routeInfo={routeInfo}
                touristSpots={touristSpots}
                weatherSegments={weatherSegments}
                setActiveModal={setActiveModal}
            />

            <MapContainer center={[mapCenter.lat, mapCenter.lng]} zoom={13} zoomControl={false} style={{ height: '100vh', width: '100%', cursor: selectionMode ? 'crosshair' : 'grab' }}>
                <ZoomControl position="bottomright" />
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
                <MapCenterController centerCoords={mapCenter} />
                <LocationMarker selectionMode={selectionMode} handleMapClick={handleMapSelect} />
                <ZoomTracker setZoom={setCurrentZoom} />

                <MapMarkers
                    userLocation={userLocation}
                    origin={origin}
                    destination={destination}
                    transportMode={transportMode}
                    touristSpots={touristSpots}
                    weatherSegments={weatherSegments}
                    getPointIcon={getPointIcon}
                />
            </MapContainer>

            <RouteModal
                activeModal={activeModal}
                setActiveModal={setActiveModal}
                groupedTourism={groupedTourism}
                mergedWeather={mergedWeather}
            />
        </div>
    );
}

export default MapComponent;
