import { MapContainer, TileLayer, Marker, Popup, useMapEvents, Polyline, useMap, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useState, useEffect, useMemo } from 'react';
import { fetchRoute, fetchGeocode, fetchReverseGeocode } from '../services/api';
import '../styles/MapComponent.css';

// --- ÍCONES SVG (UI) ---
const Icons = {
    Home: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
    MapPin: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
    List: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
    Sun: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
};

// --- ÍCONES LEAFLET (Mapa) ---
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

    // Ícones Dinâmicos (Markers)
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

    // Estados Principais
    const [origin, setOrigin] = useState(null);
    const [destination, setDestination] = useState(null);
    const [originAddress, setOriginAddress] = useState("");
    const [destAddress, setDestAddress] = useState("");
    const [routeOptions, setRouteOptions] = useState({ tourist: false, climatic: false });
    const [weatherSegments, setWeatherSegments] = useState([]);
    const [touristSpots, setTouristSpots] = useState([]);
    const [routeInfo, setRouteInfo] = useState(null);
    const [userLocation, setUserLocation] = useState(null);
    const [mapCenter, setMapCenter] = useState({ lat: 38.7119, lng: -9.2066 });
    const [selectionMode, setSelectionMode] = useState(null);
    const [transportMode, setTransportMode] = useState('driving');
    const [isLoading, setIsLoading] = useState(false);
    const [activeModal, setActiveModal] = useState(null);

    // Processamento de Dados (Agrupamento)
    const groupedTourism = useMemo(() => {
        if (!touristSpots.length) return {};
        return touristSpots.reduce((acc, spot) => {
            const cat = spot.category || 'Outros';
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(spot);
            return acc;
        }, {});
    }, [touristSpots]);

    const mergedWeather = useMemo(() => {
        if (!weatherSegments.length) return [];
        const merged = [];
        let currentGroup = { ...weatherSegments[0], startIndex: 1, endIndex: 1 };
        for (let i = 1; i < weatherSegments.length; i++) {
            const segment = weatherSegments[i];
            if (segment.description === currentGroup.description) {
                currentGroup.endIndex = i + 1;
            } else {
                merged.push(currentGroup);
                currentGroup = { ...segment, startIndex: i + 1, endIndex: i + 1 };
            }
        }
        merged.push(currentGroup);
        return merged;
    }, [weatherSegments]);

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
    const formatDuration = (s) => s ? `${Math.round(s/60)} min` : "-";
    const formatDistance = (m) => m ? (m < 1000 ? `${Math.round(m)} m` : `${(m/1000).toFixed(1)} km`) : "-";
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
            <div className="side-panel">
                <h2>Planear Viagem</h2>
                <div className="input-group"><label>Origem</label><div className="input-wrapper"><input value={originAddress} onChange={e=>setOriginAddress(e.target.value)} onKeyDown={e=>handleAddressSearch(e,'origin')} className="location-input"/><button className="icon-btn" onClick={handleUseCurrentLocation} title="Usar GPS"><Icons.Home /></button><button className={`icon-btn ${selectionMode==='origin'?'active':''}`} onClick={()=>setSelectionMode('origin')} title="Mapa"><Icons.MapPin /></button></div></div>
                <div className="input-group"><label>Destino</label><div className="input-wrapper"><input value={destAddress} onChange={e=>setDestAddress(e.target.value)} onKeyDown={e=>handleAddressSearch(e,'destination')} className="location-input"/><button className={`icon-btn ${selectionMode==='destination'?'active':''}`} onClick={()=>setSelectionMode('destination')} title="Mapa"><Icons.MapPin /></button></div></div>
                <div className="input-group" style={{marginTop:'10px'}}><div className="transport-grid">{[{id:'driving',l:'Carro'},{id:'cycling',l:'Bicicleta'},{id:'walking',l:'A Pé'}].map(m=><button key={m.id} className={`transport-btn ${transportMode===m.id?'active':''}`} onClick={()=>setTransportMode(m.id)}>{m.l}</button>)}</div></div>
                <div className="input-group" style={{marginTop:'10px'}}><div className="route-type-grid"><button className={`type-btn tourist ${routeOptions.tourist?'active':''}`} onClick={()=>toggleOption('tourist')}>📸 Turística</button><button className={`type-btn climatic ${routeOptions.climatic?'active':''}`} onClick={()=>toggleOption('climatic')}>☁️ Climática</button></div></div>
                <div className="actions-container"><button className="btn-primary" onClick={()=>traceRoute()} disabled={!origin||!destination||isLoading}>{isLoading?'A calcular...':'Calcular Rota'}</button>{(origin||destination)&&<button className="btn-secondary" onClick={handleClear}>Limpar</button>}</div>

                {routeInfo && (
                    <>
                        <div className="route-stats"><div className="stat-item"><span className="stat-value">{formatDuration(routeInfo.duration)}</span><span className="stat-label">Tempo</span></div><div className="stat-item"><span className="stat-value">{formatDistance(routeInfo.distance)}</span><span className="stat-label">Distância</span></div></div>
                        <div className="lists-triggers">
                            {touristSpots.length > 0 && <button className="list-btn" onClick={()=>setActiveModal('tourist')} title="Ver Turismo" data-count={touristSpots.length}><Icons.List /></button>}
                            {weatherSegments.length > 1 && <button className="list-btn" onClick={()=>setActiveModal('weather')} title="Ver Meteo"><Icons.Sun /></button>}
                        </div>
                    </>
                )}
            </div>

            <MapContainer center={[mapCenter.lat, mapCenter.lng]} zoom={13} zoomControl={false} style={{ height: '100vh', width: '100%', cursor: selectionMode ? 'crosshair' : 'grab' }}>
                <ZoomControl position="bottomright" />
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
                <MapCenterController centerCoords={mapCenter} />
                <LocationMarker selectionMode={selectionMode} handleMapClick={handleMapSelect} />
                <ZoomTracker setZoom={setCurrentZoom} />

                {userLocation && <Marker position={userLocation} icon={homeIcon}><Popup className="custom-popup"><strong>Eu</strong><div className="popup-desc">Sua Localização</div></Popup></Marker>}
                {origin && <Marker position={origin} icon={getOriginIcon()}><Popup className="custom-popup"><strong>Origem</strong></Popup></Marker>}
                {destination && <Marker position={destination} icon={destinationIcon}><Popup className="custom-popup"><strong>Destino</strong></Popup></Marker>}

                {touristSpots.map((spot, index) => {
                    const isWeather = spot.category.includes('Alerta') || spot.category.includes('Chuva') || spot.category.includes('Sol');
                    const tagClass = isWeather ? (spot.category.includes('Sol') ? 'tag-sun' : 'tag-rain') : 'tag-tourist';
                    return <Marker key={index} position={[spot.lat, spot.lon]} icon={getPointIcon(spot.category)}><Popup className="custom-popup"><span className={`popup-tag ${tagClass}`}>{isWeather?'Meteo':'Turismo'}</span><div className="popup-title">{spot.name}</div><div className="popup-desc">{spot.category}</div></Popup></Marker>
                })}

                {weatherSegments.map((segment, index) => (
                    <Polyline key={index} positions={segment.coordinates} color={segment.color} weight={5} opacity={0.8}><Popup className="custom-popup"><span className="popup-tag tag-sun" style={{backgroundColor:segment.color,color:'white',border:'none'}}>Segmento</span><div className="popup-title">{segment.description}</div></Popup></Polyline>
                ))}
            </MapContainer>

            {activeModal && (
                <div className="modal-overlay" onClick={()=>setActiveModal(null)}>
                    <div className="modal-content" onClick={e=>e.stopPropagation()}>
                        <div className="modal-header"><h3>{activeModal==='tourist'?'Pontos de Interesse':'Previsão Meteorológica'}</h3><button className="close-btn" onClick={()=>setActiveModal(null)}>&times;</button></div>
                        <div className="modal-body">
                            {activeModal==='tourist' && Object.entries(groupedTourism).map(([cat, items])=><div key={cat}><div className="group-header">{cat}</div>{items.map((s,i)=><div key={i} className="list-item"><div className="item-icon-circle">T</div><div className="item-info"><div className="item-name">{s.name}</div></div></div>)}</div>)}
                            {activeModal==='weather' && mergedWeather.map((s,i)=><div key={i} className="list-item"><div className="item-icon-circle" style={{backgroundColor:s.color+'20',color:s.color}}>●</div><div className="item-info"><div className="item-name"><span className="weather-range">{s.startIndex===s.endIndex?`Troço ${s.startIndex}`:`Troços ${s.startIndex}-${s.endIndex}`}</span></div><div className="item-meta">{s.description}</div></div></div>)}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default MapComponent;