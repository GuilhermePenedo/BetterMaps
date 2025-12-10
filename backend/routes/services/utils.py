import math


def haversine_distance(coord1, coord2):
    R = 6371000
    lon1, lat1 = float(coord1[0]), float(coord1[1])
    lon2, lat2 = float(coord2[0]), float(coord2[1])
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * (2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)))


def chunk_list(lst, n):
    if not lst: return []
    # Divide lista em pedaços de tamanho N
    return [lst[i:i + n] for i in range(0, len(lst), n)]

