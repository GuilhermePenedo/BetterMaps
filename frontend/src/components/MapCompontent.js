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

// Ícones de Transporte
const carIcon = createIcon('/car_marker.png');
const bikeIcon = createIcon('/bike_marker.png');
const footIcon = createIcon('/foot_marker.png');

// Outros Ícones
const destinationIcon = createIcon('/destination_marker.png');
const homeIcon = createIcon('/home_marker.png');

// Ícone para Pontos Turísticos (Usamos um link externo ou um ficheiro local se tiveres)
const touristIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/3203/3203071.png',
    iconSize: [22, 22],   // Tamanho reduzido (era 32, 32)
    iconAnchor: [11, 22], // Ponto que toca no mapa (metade da largura, altura total)
    popupAnchor: [0, -22] // Onde abre o balão de texto
});

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
    // --- Estados de Dados ---
    const [origin, setOrigin] = useState(null);
    const [destination, setDestination] = useState(null);
    const [originAddress, setOriginAddress] = useState("");
    const [destAddress, setDestAddress] = useState("");

    const [route, setRoute] = useState(null);
    const [routeInfo, setRouteInfo] = useState(null); // Distância e Tempo
    const [touristSpots, setTouristSpots] = useState([]); // Lista de pontos turísticos

    const [userLocation, setUserLocation] = useState(null);
    const [mapCenter, setMapCenter] = useState({ lat: 38.7119, lng: -9.2066 });

    // --- Estados de UI/Configuração ---
    const [selectionMode, setSelectionMode] = useState(null);
    const [transportMode, setTransportMode] = useState('driving'); // driving, cycling, walking
    const [routeType, setRouteType] = useState('normal'); // normal, tourist, climatic, emergency
    const [isLoading, setIsLoading] = useState(false);

    // 1. Inicializar GPS
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

    // --- Helpers ---
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

    // --- Handlers ---

    const handleMapSelect = async (latlng, mode) => {
        setSelectionMode(null);
        setIsLoading(true);
        setRoute(null);
        setTouristSpots([]); // Limpar pontos antigos
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
            setTouristSpots([]);
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
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleUseCurrentLocation = async () => {
        if (!userLocation) return alert("A aguardar GPS...");
        setIsLoading(true);
        setRoute(null);
        setTouristSpots([]);

        try {
            const response = await fetchReverseGeocode(userLocation.lat, userLocation.lng);
            const address = response.data.display_name || "Minha Localização";
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

    // Calcular Rota Principal
    const traceRoute = async () => {
        if (!origin || !destination) return;

        setIsLoading(true);
        // Limpar dados anteriores
        setRoute(null);
        setTouristSpots([]);
        setRouteInfo(null);

        try {
            const response = await fetchRoute(
                origin.lng, origin.lat,
                destination.lng, destination.lat,
                transportMode,
                routeType // Envia o tipo (tourist, normal, etc)
            );

            if (response.data.routes && response.data.routes.length > 0) {
                const routeData = response.data.routes[0];
                const geometry = routeData.geometry;

                // 1. Desenhar linha
                if (geometry && geometry.coordinates) {
                    setRoute(geometry.coordinates.map(coord => [coord[1], coord[0]]));
                }

                // 2. Definir Estatísticas
                setRouteInfo({
                    distance: routeData.distance,
                    duration: routeData.duration
                });

                // 3. Adicionar Pontos Turísticos (se existirem na resposta)
                if (response.data.tourist_spots && response.data.tourist_spots.length > 0) {
                    setTouristSpots(response.data.tourist_spots);
                }

            } else {
                alert("Não foi encontrada rota para este trajeto.");
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
        setTouristSpots([]);
        setSelectionMode(null);
    };

    return (
        <div className="map-container-wrapper">

            {/* --- PAINEL LATERAL --- */}
            <div className="side-panel">
                <h2>Planear Viagem</h2>

                {/* Inputs */}
                <div className="input-group">
                    <label>Ponto de Partida</label>
                    <div className="input-wrapper">
                        <input type="text" className="location-input" placeholder="Escreva e Enter..." value={originAddress} onChange={(e) => setOriginAddress(e.target.value)} onKeyDown={(e) => handleAddressSearch(e, 'origin')} />
                        <button className="icon-btn" onClick={handleUseCurrentLocation} title="GPS">🏠</button>
                        <button className={`icon-btn ${selectionMode === 'origin' ? 'active' : ''}`} onClick={() => setSelectionMode(selectionMode === 'origin' ? null : 'origin')} title="Mapa">📍</button>
                    </div>
                    {selectionMode === 'origin' && <span className="coordinates-text">Clique no mapa...</span>}
                </div>

                <div className="input-group">
                    <label>Destino</label>
                    <div className="input-wrapper">
                        <input type="text" className="location-input" placeholder="Escreva e Enter..." value={destAddress} onChange={(e) => setDestAddress(e.target.value)} onKeyDown={(e) => handleAddressSearch(e, 'destination')} />
                        <button className={`icon-btn ${selectionMode === 'destination' ? 'active' : ''}`} onClick={() => setSelectionMode(selectionMode === 'destination' ? null : 'destination')} title="Mapa">📍</button>
                    </div>
                    {selectionMode === 'destination' && <span className="coordinates-text">Clique no mapa...</span>}
                </div>

                {/* Meio de Transporte */}
                <div className="input-group" style={{marginTop: '10px'}}>
                    <label>Meio de Transporte</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button className={`icon-btn ${transportMode === 'driving' ? 'active' : ''}`} onClick={() => setTransportMode('driving')} style={{flex: 1, fontSize: '13px', fontWeight: '500', width: 'auto'}}>🚗 Carro</button>
                        <button className={`icon-btn ${transportMode === 'cycling' ? 'active' : ''}`} onClick={() => setTransportMode('cycling')} style={{flex: 1, fontSize: '13px', fontWeight: '500', width: 'auto'}}>🚲 Bike</button>
                        <button className={`icon-btn ${transportMode === 'walking' ? 'active' : ''}`} onClick={() => setTransportMode('walking')} style={{flex: 1, fontSize: '13px', fontWeight: '500', width: 'auto'}}>🚶 A Pé</button>
                    </div>
                </div>

                {/* Tipo de Rota */}
                <div className="input-group" style={{marginTop: '10px'}}>
                    <label>Tipo de Rota</label>
                    <div className="route-type-grid">
                        <button className={`type-btn normal ${routeType === 'normal' ? 'active' : ''}`} onClick={() => setRouteType('normal')}>⚡ Rápida</button>
                        <button className={`type-btn tourist ${routeType === 'tourist' ? 'active' : ''}`} onClick={() => setRouteType('tourist')}>📸 Turística</button>
                        <button className={`type-btn climatic ${routeType === 'climatic' ? 'active' : ''}`} onClick={() => setRouteType('climatic')}>☁️ Climática</button>
                        <button className={`type-btn emergency ${routeType === 'emergency' ? 'active' : ''}`} onClick={() => setRouteType('emergency')}>🚑 Emergência</button>
                    </div>
                </div>

                {/* Ações */}
                <div className="actions-container">
                    <button className="btn-primary" onClick={() => traceRoute()} disabled={!origin || !destination || isLoading}>
                        {isLoading ? 'A processar...' : 'Calcular Rota'}
                    </button>
                    {(origin || destination) && <button className="btn-secondary" onClick={handleClear}>Limpar</button>}
                </div>

                {/* Estatísticas */}
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

            {/* --- MAPA --- */}
            <MapContainer
                center={[mapCenter.lat, mapCenter.lng]}
                zoom={13}
                zoomControl={false}
                style={{ height: '100vh', width: '100%', cursor: selectionMode ? 'crosshair' : 'grab' }}
            >
                <ZoomControl position="bottomright" />
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
                <MapCenterController centerCoords={mapCenter} />
                <LocationMarker selectionMode={selectionMode} handleMapClick={handleMapSelect} />


                {userLocation && (<Marker position={userLocation} icon={homeIcon}><Popup>A sua localização</Popup></Marker>)}
                {origin && <Marker position={origin} icon={getOriginIcon()}><Popup>Origem</Popup></Marker>}
                {destination && <Marker position={destination} icon={destinationIcon}><Popup>Destino</Popup></Marker>}
                {/* Marcadores Turísticos */}
                {touristSpots.map((spot, index) => (
                    <Marker key={index} position={[spot.lat, spot.lon]} icon={touristIcon}>
                        <Popup>
                            <strong>📸 Ponto Turístico</strong><br/>
                            {spot.name}
                        </Popup>
                    </Marker>
                ))}

                {route && (
                    <>
                        <Polyline positions={route} color="black" weight={6} opacity={0.6} />
                        <Polyline
                            positions={route}
                            color={routeType === 'emergency' ? '#ef4444' : (routeType === 'tourist' ? '#f97316' : '#8c03fc')}
                            weight={4}
                            opacity={0.9}
                        />
                    </>
                )}
            </MapContainer>
        </div>
    );
}

export default MapComponent;