export const formatDuration = (s) => {
    if (!s) return "-";
    
    const totalSeconds = Math.round(s);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    
    return parts.length > 0 ? parts.join(' ') : "0m";
};

export const formatDistance = (m) => m ? (m < 1000 ? `${Math.round(m)} m` : `${(m/1000).toFixed(1)} km`) : "-";

