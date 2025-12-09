import { useMemo } from 'react';
import L from 'leaflet';

export const useMapIcons = (currentZoom) => {
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

    return { getPointIcon };
};

