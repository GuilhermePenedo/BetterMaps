import { MapContainer, TileLayer, Marker, Popup, useMapEvents, Polyline, useMap, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useState, useEffect } from 'react';
import { fetchRoute, fetchGeocode, fetchReverseGeocode } from '../services/api';
import '../styles/MapComponent.css';

// --- Configuração dos Ícones ---
const createIcon = (url) => new L.Icon({
    iconUrl: process.env.PUBLIC_URL + url,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36]
});

// Ícones por Transporte
const carIcon = createIcon('/car_marker.png');
const bikeIcon = createIcon('/bike_marker.png');
const footIcon = createIcon('/foot_marker.png');

// Outros Ícones
const destinationIcon = createIcon('/destination_marker.png');
const homeIcon = createIcon('/home_marker.png');

// --- Componentes Auxiliares ---
function LocationMarker({ selectionMode, handleMapClick }) {
    useMapEvents({
        click(e) {
            if (selectionMode) {
                handleMapClick(e.latlng, selectionMode);
            }
        }
    });
    return null;
}

function MapCenterController({ centerCoords }) {
    const map = useMap();
    useEffect(() => {
        if (centerCoords) {
            map.setView([centerCoords.lat, centerCoords.lng], 14, { animate: true });
        }
    }, [centerCoords, map]);
    return null;
}

// --- Componente Principal ---
function MapComponent() {
    const [origin, setOrigin] = useState(null);
    const [destination, setDestination] = useState(null);
    const [originAddress, setOriginAddress] = useState("");
    const [destAddress, setDestAddress] = useState("");

    const [route, setRoute] = useState(null);
    const [routeInfo, setRouteInfo] = useState(null);

    const [userLocation, setUserLocation] = useState(null);
    const [mapCenter, setMapCenter] = useState({ lat: 38.7119, lng: -9.2066 });

    const [selectionMode, setSelectionMode] = useState(null);
    const [transportMode, setTransportMode] = useState('driving');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const current = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    setUserLocation(current);
                    setMapCenter(prev => prev.lat === 38.7119 ? current : prev);
                },
                (error) => console.warn('Erro GPS:', error.message)
            );
        }
    }, []);

    // Helper para escolher ícone
    const getOriginIcon = () => {
        switch (transportMode) {
            case 'cycling': return bikeIcon;
            case 'walking': return footIcon;
            default: return carIcon;
        }
    };

    const formatDuration = (seconds) => {
        if (!seconds) return "0 min";
        const minutes = Math.round(seconds / 60);
        if (minutes < 60) return `${minutes} min`;
        const hours = Math.floor(minutes / 60);
        const remainingMins = minutes % 60;
        return `${hours}h ${remainingMins}min`;
    };

    const formatDistance = (meters) => {
        if (!meters) return "0 m";
        if (meters < 1000) return `${Math.round(meters)} m`;
        return `${(meters / 1000).toFixed(1)} km`;
    };

    const handleMapSelect = async (latlng, mode) => {
        setSelectionMode(null);
        setIsLoading(true);
        setRoute(null);
        setRouteInfo(null);

        try {
            if (mode === 'origin') setOrigin(latlng);
            else setDestination(latlng);

            try {
                const response = await fetchReverseGeocode(latlng.lat, latlng.lng);
                const address = response.data && response.data.display_name
                    ? response.data.display_name
                    : "Localização selecionada";

                if (mode === 'origin') setOriginAddress(address);
                else setDestAddress(address);
            } catch (err) {
                const coordString = `${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`;
                if (mode === 'origin') setOriginAddress(coordString);
                else setDestAddress(coordString);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddressSearch = async (e, mode) => {
        if (e.key === 'Enter') {
            setIsLoading(true);
            setRoute(null);
            setRouteInfo(null);
            const textToSearch = mode === 'origin' ? originAddress : destAddress;

            try {
                const response = await fetchGeocode(textToSearch);
                const results = response.data;

                if (results && results.length > 0) {
                    const coords = {
                        lat: parseFloat(results[0].lat),
                        lng: parseFloat(results[0].lon)
                    };

                    if (mode === 'origin') setOrigin(coords);
                    else setDestination(coords);

                    setMapCenter(coords);
                } else {
                    alert("Endereço não encontrado.");
                }
            } catch (error) {
                console.error("Erro Geocode:", error);
                alert("Erro ao pesquisar endereço.");
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleUseCurrentLocation = async () => {
        if (!userLocation) {
            alert("Localização GPS ainda não disponível.");
            return;
        }

        setIsLoading(true);
        setRoute(null);
        setRouteInfo(null);

        try {
            const response = await fetchReverseGeocode(userLocation.lat, userLocation.lng);
            const address = response.data && response.data.display_name
                ? response.data.display_name
                : "Minha Localização";

            setOrigin(userLocation);
            setOriginAddress(address);
            setMapCenter(userLocation);

            if (selectionMode === 'origin') setSelectionMode(null);
        } catch (error) {
            console.error(error);
            setOrigin(userLocation);
            setOriginAddress("Minha Localização");
        } finally {
            setIsLoading(false);
        }
    };

    const traceRoute = async () => {
        if (!origin || !destination) return;

        setIsLoading(true);
        try {
            const response = await fetchRoute(
                origin.lng,
                origin.lat,
                destination.lng,
                destination.lat,
                transportMode
            );

            if (response.data.routes && response.data.routes.length > 0) {
                const routeData = response.data.routes[0];
                const geometry = routeData.geometry;

                if (geometry && geometry.coordinates) {
                    setRoute(geometry.coordinates.map(coord => [coord[1], coord[0]]));
                    setRouteInfo({
                        distance: routeData.distance,
                        duration: routeData.duration
                    });
                }
            } else {
                alert("Rota não encontrada.");
            }
        } catch (error) {
            console.error('Erro Route:', error);
            alert("Erro ao calcular rota.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleClear = () => {
        setOrigin(null);
        setDestination(null);
        setOriginAddress("");
        setDestAddress("");
        setRoute(null);
        setRouteInfo(null);
        setSelectionMode(null);
    };

    return (
        <div className="map-container-wrapper">
            <div className="side-panel">
                <h2>Planear Viagem</h2>

                <div className="input-group">
                    <label>Ponto de Partida</label>
                    <div className="input-wrapper">
                        <input
                            type="text"
                            className="location-input"
                            placeholder="Escreva e Enter..."
                            value={originAddress}
                            onChange={(e) => setOriginAddress(e.target.value)}
                            onKeyDown={(e) => handleAddressSearch(e, 'origin')}
                        />
                        <button className="icon-btn" onClick={handleUseCurrentLocation} title="Usar GPS">🏠</button>
                        <button
                            className={`icon-btn ${selectionMode === 'origin' ? 'active' : ''}`}
                            onClick={() => setSelectionMode(selectionMode === 'origin' ? null : 'origin')}
                            title="Escolher no mapa"
                        >📍</button>
                    </div>
                    {selectionMode === 'origin' && <span className="coordinates-text highlight">Clique no mapa...</span>}
                </div>

                <div className="input-group">
                    <label>Destino</label>
                    <div className="input-wrapper">
                        <input
                            type="text"
                            className="location-input"
                            placeholder="Escreva e Enter..."
                            value={destAddress}
                            onChange={(e) => setDestAddress(e.target.value)}
                            onKeyDown={(e) => handleAddressSearch(e, 'destination')}
                        />
                        <button
                            className={`icon-btn ${selectionMode === 'destination' ? 'active' : ''}`}
                            onClick={() => setSelectionMode(selectionMode === 'destination' ? null : 'destination')}
                            title="Escolher no mapa"
                        >📍</button>
                    </div>
                    {selectionMode === 'destination' && <span className="coordinates-text highlight">Clique no mapa...</span>}
                </div>

                <div className="input-group" style={{marginTop: '10px'}}>
                    <label>Meio de Transporte</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            className={`icon-btn ${transportMode === 'driving' ? 'active' : ''}`}
                            onClick={() => setTransportMode('driving')}
                            style={{flex: 1, fontSize: '14px', fontWeight: '500'}}
                        >
                            🚗 Carro
                        </button>
                        <button
                            className={`icon-btn ${transportMode === 'cycling' ? 'active' : ''}`}
                            onClick={() => setTransportMode('cycling')}
                            style={{flex: 1, fontSize: '14px', fontWeight: '500'}}
                        >
                            🚲 Bike
                        </button>
                        <button
                            className={`icon-btn ${transportMode === 'walking' ? 'active' : ''}`}
                            onClick={() => setTransportMode('walking')}
                            style={{flex: 1, fontSize: '14px', fontWeight: '500'}}
                        >
                            🚶 A Pé
                        </button>
                    </div>
                </div>

                <div className="actions-container">
                    <button
                        className="btn-primary"
                        onClick={() => traceRoute()}
                        disabled={!origin || !destination || isLoading}
                    >
                        {isLoading ? 'A processar...' : 'Calcular Rota'}
                    </button>

                    {(origin || destination) && (
                        <button className="btn-secondary" onClick={handleClear}>
                            Limpar
                        </button>
                    )}
                </div>

                {routeInfo && (
                    <div className="route-stats">
                        <div className="stat-item">
                            <span className="stat-label">Tempo</span>
                            <span className="stat-value">{formatDuration(routeInfo.duration)}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Distância</span>
                            <span className="stat-value">{formatDistance(routeInfo.distance)}</span>
                        </div>
                    </div>
                )}
            </div>

            <MapContainer
                center={[mapCenter.lat, mapCenter.lng]}
                zoom={13}
                zoomControl={false}
                style={{ height: '100vh', width: '100%', cursor: selectionMode ? 'crosshair' : 'grab' }}
            >
                <ZoomControl position="bottomright" />
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; OpenStreetMap contributors'
                />

                <MapCenterController centerCoords={mapCenter} />

                <LocationMarker
                    selectionMode={selectionMode}
                    handleMapClick={handleMapSelect}
                />

                {/* --- AQUI ESTÁ A MUDANÇA --- */}
                {origin && <Marker position={origin} icon={getOriginIcon()}><Popup>Origem</Popup></Marker>}
                {destination && <Marker position={destination} icon={destinationIcon}><Popup>Destino</Popup></Marker>}

                {userLocation && (!origin || (origin.lat !== userLocation.lat)) && (
                    <Marker position={userLocation} icon={homeIcon}><Popup>GPS Atual</Popup></Marker>
                )}

                {route && (
                    <>
                        <Polyline positions={route} color="black" weight={6} opacity={0.6} />
                        <Polyline positions={route} color="#8c03fc" weight={4} opacity={0.9} />
                    </>
                )}
            </MapContainer>
        </div>
    );
}

export default MapComponent;