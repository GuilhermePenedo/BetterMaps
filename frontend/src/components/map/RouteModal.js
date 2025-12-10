function RouteModal({ activeModal, setActiveModal, groupedTourism, mergedWeather }) {
    if (!activeModal) return null;

    return (
        <div className="modal-overlay" onClick={()=>setActiveModal(null)}>
            <div className="modal-content" onClick={e=>e.stopPropagation()}>
                <div className="modal-header">
                    <h3>{activeModal==='tourist'?'Pontos de Interesse':'Previsão Meteorológica'}</h3>
                    <button className="close-btn" onClick={()=>setActiveModal(null)}>&times;</button>
                </div>
                <div className="modal-body">
                    {activeModal==='tourist' && Object.entries(groupedTourism).map(([cat, items])=>
                        <div key={cat}>
                            <div className="group-header">{cat}</div>
                            {items.map((s,i)=>
                                <div key={i} className="list-item">
                                    <div className="item-icon-circle">T</div>
                                    <div className="item-info">
                                        <div className="item-name">{s.name}</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    {activeModal==='weather' && mergedWeather.map((s,i)=>
                        <div key={i} className="list-item">
                            <div className="item-icon-circle" style={{backgroundColor:s.color+'20',color:s.color}}>●</div>
                            <div className="item-info">
                                <div className="item-name">
                                    <span className="weather-range">{s.startIndex===s.endIndex?`Troço ${s.startIndex}`:`Troços ${s.startIndex}-${s.endIndex}`}</span>
                                </div>
                                <div className="item-meta">{s.description}</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default RouteModal;

