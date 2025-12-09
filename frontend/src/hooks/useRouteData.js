import { useMemo } from 'react';

export const useRouteData = (touristSpots, weatherSegments) => {
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

    return { groupedTourism, mergedWeather };
};

