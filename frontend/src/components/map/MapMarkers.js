import { Marker, Popup, Polyline } from 'react-leaflet';
import { homeIcon, destinationIcon } from '../../icons/mapIcons';
import { getOriginIcon } from '../../utils/iconHelpers';

function MapMarkers({
    userLocation,
    origin,
    destination,
    transportMode,
    touristSpots,
    weatherSegments,
    getPointIcon
}) {
    return (
        <>
            {userLocation && (
                <Marker position={userLocation} icon={homeIcon}>
                    <Popup className="custom-popup">
                        <div className="popup-content">
                            <div className="popup-title">Eu</div>
                            <div className="popup-desc">Sua Localização</div>
                        </div>
                    </Popup>
                </Marker>
            )}
            {origin && (
                <Marker position={origin} icon={getOriginIcon(transportMode)}>
                    <Popup className="custom-popup">
                        <div className="popup-content">
                            <div className="popup-title">Origem</div>
                            <div className="popup-desc">Ponto de partida</div>
                        </div>
                    </Popup>
                </Marker>
            )}
            {destination && (
                <Marker position={destination} icon={destinationIcon}>
                    <Popup className="custom-popup">
                        <div className="popup-content">
                            <div className="popup-title">Destino</div>
                            <div className="popup-desc">Ponto de chegada</div>
                        </div>
                    </Popup>
                </Marker>
            )}

            {touristSpots.map((spot, index) => {
                const isWeather = spot.category.includes('Alerta') || spot.category.includes('Chuva') || spot.category.includes('Sol');
                const tagClass = isWeather ? (spot.category.includes('Sol') ? 'tag-sun' : 'tag-rain') : 'tag-tourist';
                return (
                    <Marker key={index} position={[spot.lat, spot.lon]} icon={getPointIcon(spot.category)}>
                        <Popup className="custom-popup">
                            <div className="popup-header">
                                <span className={`popup-tag ${tagClass}`}>{isWeather?'Meteo':'Turismo'}</span>
                            </div>
                            <div className="popup-content">
                                <div className="popup-title">{spot.name}</div>
                                <div className="popup-desc">{spot.category}</div>
                            </div>
                        </Popup>
                    </Marker>
                );
            })}

            {weatherSegments.map((segment, index) => (
                <Polyline key={index} positions={segment.coordinates} color={segment.color} weight={5} opacity={0.8}>
                    <Popup className="custom-popup">
                        <div className="popup-header">
                            <span className="popup-tag tag-sun" style={{backgroundColor:segment.color,color:'white',border:'none'}}>Segmento</span>
                        </div>
                        <div className="popup-content">
                            <div className="popup-title">{segment.description}</div>
                        </div>
                    </Popup>
                </Polyline>
            ))}
        </>
    );
}

export default MapMarkers;

