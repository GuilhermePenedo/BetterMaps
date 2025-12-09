import { MapContainer, TileLayer, Marker, Popup, useMapEvents, Polyline, useMap, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useState, useEffect, useMemo } from 'react';
import { fetchRoute, fetchGeocode, fetchReverseGeocode } from '../services/api';
import '../styles/MapComponent.css';

// ... (Configuração dos Ícones Estáticos - Carro, Casa, etc. - Mantém Igual) ...
const createIcon = (url) => new L.Icon({ iconUrl: process.env.PUBLIC_URL + url, iconSize: [36, 36], iconAnchor: [18, 36], popupAnchor: [0, -36] });
const carIcon = createIcon('/car_marker.png');
const bikeIcon = createIcon('/bike_marker.png');
const footIcon = createIcon('/foot_marker.png');
const destinationIcon = createIcon('/destination_marker.png');
const homeIcon = createIcon('/home_marker.png');

function ZoomTracker({ setZoom }) {
    const map = useMapEvents({ zoomend: () => setZoom(map.getZoom()) });
    return null;
}
function LocationMarker({ selectionMode, handleMapClick }) {
    useMapEvents({ click(e) { if (selectionMode) handleMapClick(e.latlng, selectionMode); } });
    return null;
}
function MapCenterController({ centerCoords }) {
    const map = useMap();
    useEffect(() => { if (centerCoords) map.setView([centerCoords.lat, centerCoords.lng], 14, { animate: true }); }, [centerCoords, map]);
    return null;
}

function MapComponent() {
    const [currentZoom, setCurrentZoom] = useState(13);

    // --- Ícones Dinâmicos ---
    const pointIcons = useMemo(() => {
        const makeSet = (url) => ({
            normal: new L.Icon({ iconUrl: url, iconSize: [24, 24], iconAnchor: [12, 24], popupAnchor: [0, -24] }),
            small: new L.Icon({ iconUrl: url, iconSize: [16, 16], iconAnchor: [8, 16], popupAnchor: [0, -16] }),
            mini: new L.Icon({ iconUrl: url, iconSize: [10, 10], iconAnchor: [5, 10], popupAnchor: [0, -10] })
        });
        return {
            tourist: makeSet('https://cdn-icons-png.flaticon.com/512/3203/3203071.png'),
            sun: makeSet('https://cdn-icons-png.flaticon.com/512/869/869869.png'),
            rain: makeSet('https://cdn-icons-png.flaticon.com/512/1146/1146860.png')
        };
    }, []);

    const getPointIcon = (category) => {
        let iconSet = pointIcons.tourist;
        if (category.includes('Sol') || category.includes('Sem Chuva') || category.includes('Limpo')) iconSet = pointIcons.sun;
        else if (category.includes('Chuva') || category.includes('Alerta') || category.includes('Trovoada')) iconSet = pointIcons.rain;

        if (currentZoom >= 15) return iconSet.normal;
        if (currentZoom >= 12) return iconSet.small;
        return iconSet.mini;
    };

    // --- Estados ---
    const [origin, setOrigin] = useState(null);
    const [destination, setDestination] = useState(null);
    const [originAddress, setOriginAddress] = useState("");
    const [destAddress, setDestAddress] = useState("");

    // NOVO: Opções booleanas em vez de string única
    const [routeOptions, setRouteOptions] = useState({
        tourist: false,
        climatic: false
    });

    const [weatherSegments, setWeatherSegments] = useState([]);
    const [routeInfo, setRouteInfo] = useState(null);
    const [touristSpots, setTouristSpots] = useState([]);
    const [userLocation, setUserLocation] = useState(null);
    const [mapCenter, setMapCenter] = useState({ lat: 38.7119, lng: -9.2066 });
    const [selectionMode, setSelectionMode] = useState(null);
    const [transportMode, setTransportMode] = useState('driving');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                    setUserLocation(c);
                    setMapCenter(prev => prev.lat === 38.7119 ? c : prev);
                }, (e) => console.warn(e)
            );
        }
    }, []);

    const getOriginIcon = () => {
        switch (transportMode) {
            case 'cycling': return bikeIcon;
            case 'walking': return footIcon;
            default: return carIcon;
        }
    };
    const formatDuration = (s) => s ? `${Math.round(s/60)} min` : "0 min";
    const formatDistance = (m) => m ? (m < 1000 ? `${Math.round(m)} m` : `${(m/1000).toFixed(1)} km`) : "0 m";

    // --- Toggle Helper ---
    const toggleOption = (option) => {
        setRouteOptions(prev => ({
            ...prev,
            [option]: !prev[option]
        }));
    };

    // --- Handlers (Resumidos) ---
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
        setIsLoading(true);
        setWeatherSegments([]);
        setTouristSpots([]);

        try {
            // PASSAR OS DOIS BOOLEANOS
            const res = await fetchRoute(
                origin.lng, origin.lat,
                destination.lng, destination.lat,
                transportMode,
                routeOptions.tourist, // isTourist
                routeOptions.climatic // isClimatic
            );

            if (res.data.routes?.length > 0) {
                const rd = res.data.routes[0];

                if (res.data.weather_segments) {
                    const processedSegments = res.data.weather_segments.map(seg => ({
                        ...seg,
                        coordinates: seg.coordinates.map(c => [c[1], c[0]])
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
        setWeatherSegments([]); setRouteInfo(null); setTouristSpots([]); setSelectionMode(null);
    };

    return (
        <div className="map-container-wrapper">
            <div className="side-panel">
                <h2>Planear Viagem</h2>
                <div className="input-group"><label>Origem</label><div className="input-wrapper"><input value={originAddress} onChange={e=>setOriginAddress(e.target.value)} onKeyDown={e=>handleAddressSearch(e,'origin')} className="location-input"/><button className="icon-btn" onClick={handleUseCurrentLocation}>🏠</button><button className="icon-btn" onClick={()=>setSelectionMode('origin')}>📍</button></div></div>
                <div className="input-group"><label>Destino</label><div className="input-wrapper"><input value={destAddress} onChange={e=>setDestAddress(e.target.value)} onKeyDown={e=>handleAddressSearch(e,'destination')} className="location-input"/><button className="icon-btn" onClick={()=>setSelectionMode('destination')}>📍</button></div></div>
                <div className="input-group" style={{marginTop:'10px'}}><div style={{display:'flex',gap:'8px'}}>{['driving','cycling','walking'].map(m=><button key={m} className={`icon-btn ${transportMode===m?'active':''}`} onClick={()=>setTransportMode(m)} style={{flex:1,fontSize:'12px'}}>{m==='driving'?'🚗':m==='cycling'?'🚲':'🚶'}</button>)}</div></div>

                {/* --- SELETOR DE TIPO (Nova Lógica) --- */}
                <div className="input-group" style={{marginTop:'10px'}}>
                    <div className="route-type-grid">
                        <button
                            className={`type-btn tourist ${routeOptions.tourist ? 'active' : ''}`}
                            onClick={() => toggleOption('tourist')}
                        >
                            📸 Turística
                        </button>
                        <button
                            className={`type-btn climatic ${routeOptions.climatic ? 'active' : ''}`}
                            onClick={() => toggleOption('climatic')}
                        >
                            ☁️ Climática
                        </button>
                    </div>
                </div>

                <div className="actions-container"><button className="btn-primary" onClick={()=>traceRoute()} disabled={!origin||!destination||isLoading}>{isLoading?'A carregar...':'Calcular Rota'}</button>{(origin||destination)&&<button className="btn-secondary" onClick={handleClear}>Limpar</button>}</div>
                {routeInfo && <div className="route-stats"><div className="stat-item"><span>{formatDuration(routeInfo.duration)}</span></div><div className="stat-item"><span>{formatDistance(routeInfo.distance)}</span></div></div>}
            </div>

            <MapContainer center={[mapCenter.lat, mapCenter.lng]} zoom={13} zoomControl={false} style={{ height: '100vh', width: '100%', cursor: selectionMode ? 'crosshair' : 'grab' }}>
                <ZoomControl position="bottomright" />
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
                <MapCenterController centerCoords={mapCenter} />
                <LocationMarker selectionMode={selectionMode} handleMapClick={handleMapSelect} />
                <ZoomTracker setZoom={setCurrentZoom} />

                {userLocation && <Marker position={userLocation} icon={homeIcon}><Popup>Eu</Popup></Marker>}
                {origin && <Marker position={origin} icon={getOriginIcon()}><Popup>Origem</Popup></Marker>}
                {destination && <Marker position={destination} icon={destinationIcon}><Popup>Destino</Popup></Marker>}

                {touristSpots.map((spot, index) => (
                    <Marker key={index} position={[spot.lat, spot.lon]} icon={getPointIcon(spot.category)}>
                        <Popup><strong>{spot.category.includes('Alerta')?'🌦️ Meteo':'📸 Turismo'}</strong><br/>{spot.name}<br/><small>{spot.category}</small></Popup>
                    </Marker>
                ))}

                {weatherSegments.map((segment, index) => (
                    <Polyline
                        key={index}
                        positions={segment.coordinates}
                        color={segment.color}
                        weight={5}
                        opacity={0.8}
                    >
                        <Popup>Tempo nesta zona: {segment.description}</Popup>
                    </Polyline>
                ))}
            </MapContainer>
        </div>
    );
}

export default MapComponent;