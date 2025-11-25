import { MapContainer, TileLayer, Marker, Popup, useMapEvents, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useState, useEffect } from 'react';
import { fetchRoute } from '../services/api';
import '../styles/MapComponent.css';

function LocationMarker({ onSelect, isSelectingOrigin }) {
    useMapEvents({
        click(e) {
            onSelect(e.latlng);
        }
    });
    return null;
}

// Componente para controlar o mapa e centrar na geolocalização
function MapCenterController({ userLocation }) {
    const map = useMap();
    
    useEffect(() => {
        if (userLocation) {
            map.setView([userLocation.lat, userLocation.lng], 15);
        }
    }, [userLocation, map]);
    
    return null;
}

function MapComponent() {

    const customIcon = new L.Icon({
        iconUrl: process.env.PUBLIC_URL + '/marker.png',
        iconSize: [36, 36],
        iconAnchor: [18, 36],
        popupAnchor: [0, -36]
    });

    const originIcon = new L.Icon({
        iconUrl: process.env.PUBLIC_URL + '/marker.png',
        iconSize: [36, 36],
        iconAnchor: [18, 36],
        popupAnchor: [0, -36],
        className: 'origin-marker'
    });

    const destinationIcon = new L.Icon({
        iconUrl: process.env.PUBLIC_URL + '/marker.png',
        iconSize: [36, 36],
        iconAnchor: [18, 36],
        popupAnchor: [0, -36],
        className: 'destination-marker'
    });

    const homeIcon = new L.Icon({
        iconUrl: process.env.PUBLIC_URL + '/home_marker.png',
        iconSize: [36, 36],
        iconAnchor: [18, 36],
        popupAnchor: [0, -36],
        className: 'home-marker'
    });

    const [destination, setDestination] = useState(null);
    const [origin, setOrigin] = useState(null);
    const [route, setRoute] = useState(null);
    const [isSelectingOrigin, setIsSelectingOrigin] = useState(false);
    const [userLocation, setUserLocation] = useState(null);
    const [mapCenter, setMapCenter] = useState([38.711944321907616, -9.206683151026464]);

    // Pedir geolocalização ao montar o componente
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const currentLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    setUserLocation(currentLocation);
                    setMapCenter([currentLocation.lat, currentLocation.lng]);
                    console.log('Localização obtida:', currentLocation);
                },
                (error) => {
                    console.warn('Geolocalização não concedida ou indisponível:', error.message);
                    // Mantém a localização padrão (Lisboa)
                }
            );
        }
    }, []);

    const handleDestinationSelect = (latlng) => {
        if (!isSelectingOrigin) {
            setDestination(latlng);
            setIsSelectingOrigin(true);
        }
    };

    const handleOriginSelect = (latlng) => {
        if (isSelectingOrigin) {
            setOrigin(latlng);
            traceRoute(latlng, destination);
            setIsSelectingOrigin(false);
        }
    };

    const handleStartRoute = (destinationPoint) => {
        setDestination(destinationPoint);
        setIsSelectingOrigin(true);
    };

    const handleUseCurrentLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const currentLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    setOrigin(currentLocation);
                    setUserLocation(currentLocation);
                    if (destination) {
                        traceRoute(currentLocation, destination);
                        setIsSelectingOrigin(false);
                    }
                },
                (error) => {
                    console.error('Erro ao obter localização:', error);
                    alert('Não foi possível obter a sua localização. Por favor, clique no mapa para selecionar a origem.');
                }
            );
        }
    };

    const traceRoute = async (originPoint, destinationPoint) => {
        try {
            const response = await fetchRoute(
                originPoint.lng, 
                originPoint.lat, 
                destinationPoint.lng, 
                destinationPoint.lat
            );
            
            // OSRM retorna geometria GeoJSON
            if (response.data.routes && response.data.routes.length > 0) {
                const geometry = response.data.routes[0].geometry;
                if (geometry && geometry.coordinates) {
                    setRoute(geometry.coordinates.map(coord => [coord[1], coord[0]]));
                } else {
                    console.error('Geometria não encontrada na resposta:', response.data);
                    alert('Erro: Geometria da rota não encontrada');
                }
            } else {
                console.error('Nenhuma rota encontrada na resposta:', response.data);
                alert('Erro: Nenhuma rota disponível entre estes pontos');
            }
        } catch (error) {
            console.error('Erro ao traçar rota:', error);
            console.error('Response:', error.response?.data);
            alert(`Erro ao calcular rota: ${error.response?.data?.error || error.message}`);
        }
    };

    const handleCancelRoute = () => {
        setDestination(null);
        setOrigin(null);
        setRoute(null);
        setIsSelectingOrigin(false);
    };

    const handleClearAll = () => {
        setDestination(null);
        setOrigin(null);
        setRoute(null);
        setIsSelectingOrigin(false);
        // NÃO reseta userLocation para manter o marcador de casa
    };

    return (
        <div className="map-container-wrapper">
            <MapContainer 
                center={mapCenter} 
                zoom={13} 
                style={{ height: '100vh', width: '100%', cursor: isSelectingOrigin ? 'crosshair' : 'default' }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapCenterController userLocation={userLocation} />
                <LocationMarker onSelect={isSelectingOrigin ? handleOriginSelect : handleDestinationSelect} />
                
                {/* Marker de Destino */}
                {destination && (
                    <Marker position={destination} icon={destinationIcon}>
                        <Popup>
                            <div>
                                <strong>Destino</strong><br />
                                Latitude: {destination.lat.toFixed(6)}<br />
                                Longitude: {destination.lng.toFixed(6)}
                            </div>
                        </Popup>
                    </Marker>
                )}

                {/* Marker de Origem */}
                {origin && (
                    <Marker position={origin} icon={originIcon}>
                        <Popup>
                            <div>
                                <strong>Origem</strong><br />
                                Latitude: {origin.lat.toFixed(6)}<br />
                                Longitude: {origin.lng.toFixed(6)}
                            </div>
                        </Popup>
                    </Marker>
                )}

                {/* Marcador de localização atual do utilizador (quando não é origem) */}
                {userLocation && !origin && (
                    <Marker 
                        position={[userLocation.lat, userLocation.lng]} 
                        icon={homeIcon}
                    >
                        <Popup>
                            <div>
                                <strong>Sua Localização</strong><br />
                                Latitude: {userLocation.lat.toFixed(6)}<br />
                                Longitude: {userLocation.lng.toFixed(6)}
                            </div>
                        </Popup>
                    </Marker>
                )}
                
                {/* Linha da rota */}
                {route && <Polyline positions={route} color="blue" weight={4} opacity={0.7} />}
            </MapContainer>

            {/* Painel Lateral */}
            <div className="side-panel">
                {!destination ? (
                    <div className="panel-content">
                        <h3>Selecionar Rota</h3>
                        <p>Clique no mapa para definir o seu destino</p>
                    </div>
                ) : !origin ? (
                    <div className="panel-content">
                        <h3>Escolher Origem</h3>
                        <div className="destination-info">
                            <p><strong>Destino:</strong></p>
                            <p>Latitude: {destination.lat.toFixed(6)}</p>
                            <p>Longitude: {destination.lng.toFixed(6)}</p>
                        </div>
                        <button 
                            className="btn btn-primary"
                            onClick={handleUseCurrentLocation}
                        >
                            📍 Usar Localização Atual
                        </button>
                        <p className="or-divider">ou</p>
                        <p className="instructions">Clique no mapa para selecionar a origem</p>
                        <button 
                            className="btn btn-secondary"
                            onClick={handleCancelRoute}
                        >
                            Cancelar
                        </button>
                    </div>
                ) : (
                    <div className="panel-content">
                        <h3>Rota Traçada</h3>
                        <div className="route-info">
                            <div className="info-section">
                                <p><strong>Origem:</strong></p>
                                <p>Latitude: {origin.lat.toFixed(6)}</p>
                                <p>Longitude: {origin.lng.toFixed(6)}</p>
                            </div>
                            <div className="info-section">
                                <p><strong>Destino:</strong></p>
                                <p>Latitude: {destination.lat.toFixed(6)}</p>
                                <p>Longitude: {destination.lng.toFixed(6)}</p>
                            </div>
                        </div>
                        <button 
                            className="btn btn-secondary"
                            onClick={handleClearAll}
                        >
                            Nova Rota
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default MapComponent;
