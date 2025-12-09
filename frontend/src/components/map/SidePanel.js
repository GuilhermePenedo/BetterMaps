import { Icons } from '../../icons/uiIcons';
import { formatDuration, formatDistance } from '../../utils/formatters';

function SidePanel({
    originAddress,
    setOriginAddress,
    destAddress,
    setDestAddress,
    selectionMode,
    setSelectionMode,
    transportMode,
    setTransportMode,
    routeOptions,
    toggleOption,
    handleAddressSearch,
    handleUseCurrentLocation,
    traceRoute,
    origin,
    destination,
    isLoading,
    handleClear,
    routeInfo,
    touristSpots,
    weatherSegments,
    setActiveModal
}) {
    return (
        <div className="side-panel">
            <h2>Planear Viagem</h2>
            <div className="input-group">
                <label>Origem</label>
                <div className="input-wrapper">
                    <input value={originAddress} onChange={e=>setOriginAddress(e.target.value)} onKeyDown={e=>handleAddressSearch(e,'origin')} className="location-input"/>
                    <button className="icon-btn" onClick={handleUseCurrentLocation} title="Usar GPS"><Icons.Home /></button>
                    <button className={`icon-btn ${selectionMode==='origin'?'active':''}`} onClick={()=>setSelectionMode('origin')} title="Mapa"><Icons.MapPin /></button>
                </div>
            </div>
            <div className="input-group">
                <label>Destino</label>
                <div className="input-wrapper">
                    <input value={destAddress} onChange={e=>setDestAddress(e.target.value)} onKeyDown={e=>handleAddressSearch(e,'destination')} className="location-input"/>
                    <button className={`icon-btn ${selectionMode==='destination'?'active':''}`} onClick={()=>setSelectionMode('destination')} title="Mapa"><Icons.MapPin /></button>
                </div>
            </div>
            <div className="input-group" style={{marginTop:'10px'}}>
                <div className="transport-grid">
                    {[{id:'driving',l:'Carro'},{id:'cycling',l:'Bicicleta'},{id:'walking',l:'A Pé'}].map(m=>
                        <button key={m.id} className={`transport-btn ${transportMode===m.id?'active':''}`} onClick={()=>setTransportMode(m.id)}>{m.l}</button>
                    )}
                </div>
            </div>
            <div className="input-group" style={{marginTop:'10px'}}>
                <div className="route-type-grid">
                    <button className={`type-btn tourist ${routeOptions.tourist?'active':''}`} onClick={()=>toggleOption('tourist')}>Turística</button>
                    <button className={`type-btn climatic ${routeOptions.climatic?'active':''}`} onClick={()=>toggleOption('climatic')}>Climática</button>
                </div>
            </div>
            <div className="actions-container">
                <button className="btn-primary" onClick={()=>traceRoute()} disabled={!origin||!destination||isLoading}>{isLoading?'A calcular...':'Calcular Rota'}</button>
                {(origin||destination)&&<button className="btn-secondary" onClick={handleClear}>Limpar</button>}
            </div>

            {routeInfo && (
                <>
                    <div className="route-stats">
                        <div className="stat-item">
                            <span className="stat-value">{formatDuration(routeInfo.duration)}</span>
                            <span className="stat-label">Tempo</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-value">{formatDistance(routeInfo.distance)}</span>
                            <span className="stat-label">Distância</span>
                        </div>
                    </div>
                    <div className="lists-triggers">
                        {touristSpots.length > 0 && <button className="list-btn" onClick={()=>setActiveModal('tourist')} title="Ver Turismo" data-count={touristSpots.length}><Icons.List /></button>}
                        {weatherSegments.length > 1 && <button className="list-btn" onClick={()=>setActiveModal('weather')} title="Ver Meteo"><Icons.Sun /></button>}
                    </div>
                </>
            )}
        </div>
    );
}

export default SidePanel;

