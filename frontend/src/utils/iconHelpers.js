import { carIcon, bikeIcon, footIcon } from '../icons/mapIcons';

export const getOriginIcon = (transportMode) => {
    switch (transportMode) {
        case 'cycling': return bikeIcon;
        case 'walking': return footIcon;
        default: return carIcon;
    }
};

