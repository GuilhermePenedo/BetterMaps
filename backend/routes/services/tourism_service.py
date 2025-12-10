from ..models import SimpleTouristPoint
from .utils import haversine_distance


def find_pois_near_point_local(lat, lng, radius, exclude_names=[]):
    delta = 0.0015
    min_lat, max_lat = lat - delta, lat + delta
    min_lon, max_lon = lng - delta, lng + delta
    candidates = SimpleTouristPoint.objects.filter(
        lat__gte=min_lat, lat__lte=max_lat,
        lng__gte=min_lon, lng__lte=max_lon
    ).exclude(name__in=exclude_names)
    found = []
    for poi in candidates:
        if haversine_distance((lng, lat), (poi.lng, poi.lat)) <= radius:
            found.append({'lat': poi.lat, 'lon': poi.lng, 'name': poi.name, 'category': poi.category})
    return found

