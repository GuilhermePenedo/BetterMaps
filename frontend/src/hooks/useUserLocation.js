import { useState, useEffect } from 'react';

export const useUserLocation = (initialCenter) => {
    const [userLocation, setUserLocation] = useState(null);
    const [mapCenter, setMapCenter] = useState(initialCenter);

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

    return { userLocation, mapCenter, setMapCenter };
};

