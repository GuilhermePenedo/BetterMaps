import httpx
import math
from ..models import SimpleTouristPoint  # Importar o teu modelo

# Servidores
SERVER_DRIVING = "router.project-osrm.org"
SERVER_BIKE = "routing.openstreetmap.de/routed-bike"
SERVER_FOOT = "routing.openstreetmap.de/routed-foot"
NOMINATIM_SERVER = "nominatim.openstreetmap.org"

# Raio de desvio (50 metros)
DEFAULT_DETOUR_RADIUS = 50


def get_osrm_config(profile):
    if profile == 'walking':
        return SERVER_FOOT, 'driving'
    elif profile == 'cycling':
        return SERVER_BIKE, 'driving'
    else:
        return SERVER_DRIVING, 'driving'


# --- Helpers de Cálculo ---

def haversine_distance(coord1, coord2):
    """ Calcula distância em metros entre dois pontos (lat, lng) """
    R = 6371000
    # OSRM devolve [lng, lat], a nossa BD tem lat/lng separados
    # Aqui assumimos input como tuplos (lng, lat)
    lon1, lat1 = float(coord1[0]), float(coord1[1])
    lon2, lat2 = float(coord2[0]), float(coord2[1])

    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)

    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * (2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)))


# --- CONSULTA LOCAL (A parte nova e rápida) ---

def find_pois_near_point_local(lat, lng, radius=DEFAULT_DETOUR_RADIUS, exclude_names=[]):
    """
    Consulta a base de dados SQLite local.
    """
    # 1. Filtro grosso (Bounding Box) para ser rápido
    # 0.001 graus ~= 111 metros. Criamos uma caixa à volta do ponto.
    delta = 0.0015

    min_lat, max_lat = lat - delta, lat + delta
    min_lon, max_lon = lng - delta, lng + delta

    # Query Django
    candidates = SimpleTouristPoint.objects.filter(
        lat__gte=min_lat, lat__lte=max_lat,
        lng__gte=min_lon, lng__lte=max_lon
    ).exclude(name__in=exclude_names)

    found_pois = []

    # 2. Refinamento (Distância exata)
    for poi in candidates:
        # Nota: haversine espera (lng, lat)
        dist = haversine_distance((lng, lat), (poi.lng, poi.lat))

        if dist <= radius:
            found_pois.append({
                'lat': poi.lat,
                'lon': poi.lng,
                'name': poi.name,
                'category': poi.category
            })

    return found_pois


# --- OSRM Core ---

def get_osrm_request(service, version, profile, coords_str, options):
    server, internal_profile = get_osrm_config(profile)
    protocol = "https" if "openstreetmap.de" in server else "http"
    url = f"{protocol}://{server}/{service}/{version}/{internal_profile}/{coords_str}.json"
    if options: url += "?" + "&".join(options)

    # print(f"OSRM Call: {url}")
    response = httpx.get(url, timeout=30)
    response.raise_for_status()
    return response.json()


def get_route(profile, origin, dest, route_type='normal'):
    """
    Lógica Principal de Roteamento
    origin/dest: tuplos (lng, lat)
    """
    all_tourist_spots = []

    if route_type == 'tourist':
        print(f"--- Rota Turística Local (Raio: {DEFAULT_DETOUR_RADIUS}m) ---")

        # 1. Obter rota base para saber o caminho
        base_coords = f"{origin[0]},{origin[1]};{dest[0]},{dest[1]}"
        try:
            base_route = get_osrm_request("route", "v1", profile, base_coords, ["overview=full", "geometries=geojson"])
        except:
            return {'error': 'Falha rota base'}

        route_waypoints = []
        seen_names = set()

        if base_route.get('routes'):
            geometry = base_route['routes'][0]['geometry']['coordinates']  # Lista de [lng, lat]
            total_points = len(geometry)

            # 2. Verificar pontos ao longo da rota
            # Como a BD é local e rápida, podemos verificar MAIS pontos sem perder performance.
            # Vamos verificar a cada 2% do caminho (muito detalhado)
            step = max(1, int(total_points * 0.02))
            indices_to_check = range(0, total_points, step)

            for idx in indices_to_check:
                pt = geometry[idx]  # [lng, lat]

                # Chamada à função LOCAL
                pois = find_pois_near_point_local(
                    pt[1], pt[0],  # lat, lng
                    radius=DEFAULT_DETOUR_RADIUS,
                    exclude_names=list(seen_names)
                )

                if pois:
                    for poi in pois:
                        if poi['name'] not in seen_names:
                            print(f"📍 Encontrado na BD: {poi['name']}")
                            all_tourist_spots.append(poi)
                            route_waypoints.append(f"{poi['lon']},{poi['lat']}")
                            seen_names.add(poi['name'])

        # 3. Construir rota final
        if route_waypoints:
            # OSRM tem limite de URL (~20-30 waypoints é seguro)
            # Se tivermos muitos pontos turísticos, pegamos nos 20 mais distribuídos
            waypoints_str = ";".join(route_waypoints[:20])
            final_coords = f"{origin[0]},{origin[1]};{waypoints_str};{dest[0]},{dest[1]}"
        else:
            final_coords = base_coords

    else:
        # Rota Normal
        final_coords = f"{origin[0]},{origin[1]};{dest[0]},{dest[1]}"

    # Chamada Final
    try:
        final_data = get_osrm_request("route", "v1", profile, final_coords,
                                      ["steps=true", "geometries=geojson", "overview=full"])
        final_data['tourist_spots'] = all_tourist_spots
        return final_data
    except Exception as e:
        print(f"Erro na rota final OSRM: {e}")
        fallback = get_osrm_request("route", "v1", profile, f"{origin[0]},{origin[1]};{dest[0]},{dest[1]}",
                                    ["geometries=geojson"])
        fallback['tourist_spots'] = all_tourist_spots
        return fallback


# --- Helpers Nominatim ---
def get_nominatim_request(endpoint, params):
    url = f"https://{NOMINATIM_SERVER}/{endpoint}"
    headers = {'User-Agent': 'BetterMaps-App/1.0'}
    params['format'] = 'json'
    response = httpx.get(url, params=params, headers=headers, timeout=10)
    response.raise_for_status()
    return response.json()


def get_nearest_service(profile, coordinates_str, number):
    return get_osrm_request("nearest", "v1", profile, coordinates_str, ["number=" + str(number)])


def get_geocode(address):
    return get_nominatim_request("search", {"q": address, "limit": 1})


def get_reverse_geocode(lat, lng):
    return get_nominatim_request("reverse", {"lat": lat, "lon": lng})