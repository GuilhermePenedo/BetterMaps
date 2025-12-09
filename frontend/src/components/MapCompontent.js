import { MapContainer, TileLayer, Marker, Popup, useMapEvents, Polyline, useMap, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useState, useEffect } from 'react';
import { fetchRoute, fetchGeocode, fetchReverseGeocode } from '../services/api';
import '../styles/MapComponent.css';

// --- Configuração dos Ícones (Mantida Igual) ---
const createIcon = (url) => new L.Icon({
    iconUrl: process.env.PUBLIC_URL + url,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36]
});

const originIcon = createIcon('/origin_marker.png');
const destinationIcon = createIcon('/destination_marker.png');
const homeIcon = createIcon('/home_marker.png');

// --- Componentes Auxiliares (Mantidos Iguais) ---
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

function MapComponent() {
    // --- Estados ---
    const [origin, setOrigin] = useState(null);
    const [destination, setDestination] = useState(null);
    const [originAddress, setOriginAddress] = useState("");
    const [destAddress, setDestAddress] = useState("");
    const [route, setRoute] = useState(null);
    const [userLocation, setUserLocation] = useState(null);
    const [mapCenter, setMapCenter] = useState(null);
    const [selectionMode, setSelectionMode] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    // 1. GPS ao Iniciar
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const current = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    setUserLocation(current);
                    if (!mapCenter) setMapCenter(current);
                },
                (error) => console.warn('Erro GPS:', error.message)
            );
        }
    }, []);

    // REMOVIDO: O useEffect que calculava a rota automaticamente foi apagado.

    // --- Lógica de Negócio ---

    // Ação: Clicar no Mapa
    const handleMapSelect = async (latlng, mode) => {
        setSelectionMode(null);
        setIsLoading(true);
        setRoute(null); // LIMPAR ROTA ANTIGA ao mudar um ponto

        try {
            if (mode === 'origin') setOrigin(latlng);
            else setDestination(latlng);

            const response = await fetchReverseGeocode(latlng.lat, latlng.lng);
            const address = response.data.display_name || "Localização selecionada";

            if (mode === 'origin') setOriginAddress(address);
            else setDestAddress(address);

        } catch (error) {
            console.error("Erro Reverse Geocode:", error);
            const fallback = `${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`;
            if (mode === 'origin') setOriginAddress(fallback);
            else setDestAddress(fallback);
        } finally {
            setIsLoading(false);
        }
    };

    // Ação: Escrever e dar Enter
    const handleAddressSearch = async (e, mode) => {
        if (e.key === 'Enter') {
            setIsLoading(true);
            setRoute(null); // LIMPAR ROTA ANTIGA ao mudar um ponto
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

    // Ação: Botão GPS
    const handleUseCurrentLocation = async () => {
        if (!userLocation) {
            alert("Localização GPS ainda não disponível.");
            return;
        }

        setIsLoading(true);
        setRoute(null); // LIMPAR ROTA ANTIGA

        try {
            const response = await fetchReverseGeocode(userLocation.lat, userLocation.lng);
            setOrigin(userLocation);
            setOriginAddress(response.data.display_name || "Minha Localização");
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

    // Ação: Calcular Rota (AGORA SÓ CHAMADO PELO BOTÃO)
    const traceRoute = async () => {
        // Validação extra para garantir que temos os dois pontos
        if (!origin || !destination) return;

        setIsLoading(true);
        try {
            const response = await fetchRoute(
                origin.lng,
                origin.lat,
                destination.lng,
                destination.lat
            );

            if (response.data.routes && response.data.routes.length > 0) {
                const geometry = response.data.routes[0].geometry;
                setRoute(geometry.coordinates.map(coord => [coord[1], coord[0]]));
            } else {
                alert("Rota não encontrada.");
            }
        } catch (error) {
            console.error('Erro Route:', error);
            alert("Não foi possível calcular a rota.");
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
        setSelectionMode(null);
    };

    // --- Renderização ---
    return (
        <div className="map-container-wrapper">

            {/* PAINEL LATERAL */}
            <div className="side-panel">
                <h2>Planear Viagem</h2>

                {/* ORIGEM */}
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
                        <button
                            className="icon-btn"
                            onClick={handleUseCurrentLocation}
                            title="Usar GPS"
                        >🏠</button>
                        <button
                            className={`icon-btn ${selectionMode === 'origin' ? 'active' : ''}`}
                            onClick={() => setSelectionMode(selectionMode === 'origin' ? null : 'origin')}
                            title="Escolher no mapa"
                        >📍</button>
                    </div>
                    {selectionMode === 'origin' && <span className="coordinates-text highlight">Clique no mapa...</span>}
                </div>

                {/* DESTINO */}
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

                {/* AÇÕES */}
                <div className="actions-container">
                    <button
                        className="btn-primary"
                        // Agora chamamos traceRoute sem argumentos, pois ele usa o estado origin/destination
                        onClick={() => traceRoute()}
                        disabled={!origin || !destination || isLoading}
                    >
                        {isLoading ? 'A processar...' : 'Calcular Rota'}
                    </button>

                    {(origin || destination) && (
                        <button
                            className="btn-secondary"
                            onClick={handleClear}
                        >
                            Limpar
                        </button>
                    )}
                </div>
            </div>

            {/* MAPA */}
            <MapContainer
                center={[38.7119, -9.2066]}
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

                {origin && <Marker position={origin} icon={originIcon}><Popup>Origem</Popup></Marker>}
                {destination && <Marker position={destination} icon={destinationIcon}><Popup>Destino</Popup></Marker>}
                {userLocation && <Marker position={userLocation} icon={homeIcon}><Popup>GPS Atual</Popup></Marker>}

                {route && (
                    <>
                        <Polyline positions={route} color="black" weight={6} opacity={1} />
                        <Polyline positions={route} color="#8c03fc" weight={4} opacity={0.8} />
                    </>
                )}
            </MapContainer>
        </div>
    );
}

export default MapComponent;