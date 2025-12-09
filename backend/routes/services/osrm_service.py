import httpx
import math
from ..models import SimpleTouristPoint

# Servidores
SERVER_DRIVING = "router.project-osrm.org"
SERVER_BIKE = "routing.openstreetmap.de/routed-bike"
SERVER_FOOT = "routing.openstreetmap.de/routed-foot"
NOMINATIM_SERVER = "nominatim.openstreetmap.org"

# API Open-Meteo
OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"

DEFAULT_DETOUR_RADIUS = 50


def get_osrm_config(profile):
    if profile == 'walking':
        return SERVER_FOOT, 'driving'
    elif profile == 'cycling':
        return SERVER_BIKE, 'driving'
    else:
        return SERVER_DRIVING, 'driving'


# --- HELPERS MATEMÁTICOS ---
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


# --- METEOROLOGIA OTIMIZADA (BATCH 150) ---

def get_weather_batch(points):
    """
    Recebe uma lista de pontos [(lat, lon), ...].
    Divide em lotes grandes de 150 para ser super rápido.
    """
    if not points: return []

    final_results = []
    # Aumentado para 150 como pedido (reduz nº de pedidos HTTP)
    BATCH_SIZE = 50

    batches = chunk_list(points, BATCH_SIZE)

    for batch in batches:
        # Arredondar coordenadas para 4 casas decimais poupa caracteres no URL
        lats = [f"{p[0]:.4f}" for p in batch]
        lons = [f"{p[1]:.4f}" for p in batch]

        params = {
            'latitude': ",".join(lats),
            'longitude': ",".join(lons),
            'current': 'weather_code,temperature_2m',
            'timezone': 'auto'
        }

        try:
            # Timeout aumentado para 10s porque o pedido é maior e pode demorar a processar
            response = httpx.get(OPEN_METEO_URL, params=params, timeout=10.0)

            if response.status_code == 200:
                data = response.json()

                # A API retorna lista se forem vários, objeto se for um
                if isinstance(data, list):
                    final_results.extend([item.get('current', {}) for item in data])
                else:
                    final_results.append(data.get('current', {}))
            else:
                print(f"Erro Batch API ({len(batch)} pts): {response.status_code}")
                # Se falhar (ex: URL too long), tentamos recuperar preenchendo com None
                final_results.extend([None] * len(batch))

        except Exception as e:
            print(f"Exceção Batch Weather: {e}")
            final_results.extend([None] * len(batch))

    return final_results


def get_weather_color_and_desc(code):
    if code is None: return '#8c03fc', 'Desconhecido'
    if code <= 1: return '#f59e0b', 'Sol'
    if code <= 3: return '#6b7280', 'Nublado'
    if code <= 48: return '#9ca3af', 'Nevoeiro'
    if code <= 67: return '#3b82f6', 'Chuva'
    if code <= 77: return '#06b6d4', 'Neve'
    if code <= 82: return '#2563eb', 'Aguaceiros'
    if code >= 95: return '#1e3a8a', 'Trovoada'
    return '#8c03fc', 'Normal'


# --- LÓGICA TURISMO (BD Local) ---
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


# --- OSRM CORE ---
def get_osrm_request(service, version, profile, coords_str, options):
    server, internal_profile = get_osrm_config(profile)
    protocol = "https" if "openstreetmap.de" in server else "http"
    url = f"{protocol}://{server}/{service}/{version}/{internal_profile}/{coords_str}.json"
    if options: url += "?" + "&".join(options)
    response = httpx.get(url, timeout=30)
    response.raise_for_status()
    return response.json()


# --- FUNÇÃO PRINCIPAL ---
def get_route(profile, origin, dest, is_tourist=False, is_climatic=False):
    """
    Combina Turística (Desvio) e Climática (Batch Request Paginado)
    """
    waypoints_str = ""
    extra_info_markers = []

    # 1. PROCESSAR TURISMO
    if is_tourist:
        base_coords = f"{origin[0]},{origin[1]};{dest[0]},{dest[1]}"
        try:
            base_route = get_osrm_request("route", "v1", profile, base_coords, ["geometries=geojson"])
            if base_route.get('routes'):
                geo = base_route['routes'][0]['geometry']['coordinates']
                step = max(1, int(len(geo) * 0.03))
                seen = set()
                route_waypoints = []
                radius = 50 if profile == 'walking' else (200 if profile == 'cycling' else 500)

                for i in range(0, len(geo), step):
                    pt = geo[i]
                    pois = find_pois_near_point_local(pt[1], pt[0], radius, list(seen))
                    if pois:
                        for p in pois:
                            if p['name'] not in seen:
                                extra_info_markers.append(p)
                                if len(route_waypoints) < 15:
                                    route_waypoints.append(f"{p['lon']},{p['lat']}")
                                seen.add(p['name'])
                if route_waypoints:
                    waypoints_str = ";".join(route_waypoints)
        except Exception as e:
            print(f"Erro Turismo: {e}")

    # 2. CONSTRUIR ROTA FINAL
    if waypoints_str:
        final_coords = f"{origin[0]},{origin[1]};{waypoints_str};{dest[0]},{dest[1]}"
    else:
        final_coords = f"{origin[0]},{origin[1]};{dest[0]},{dest[1]}"

    try:
        route_data = get_osrm_request("route", "v1", profile, final_coords,
                                      ["steps=true", "geometries=geojson", "overview=full"])
    except:
        return {'error': 'Falha na rota final'}

    # 3. PROCESSAR SEGMENTOS DE COR
    weather_segments = []

    if route_data.get('routes'):
        main_route = route_data['routes'][0]
        geometry = main_route['geometry']['coordinates']
        total_distance = main_route['distance']

        if is_climatic:
            print("--- Pintura Climática (Batch 150) ---")

            # Resolução dinâmica para garantir que não geramos 5000 pontos
            # Mas mantemos bom detalhe
            if total_distance > 500000:
                SEGMENT_RESOLUTION = 10000  # 10km (rotas > 500km)
            elif total_distance > 100000:
                SEGMENT_RESOLUTION = 5000  # 5km (rotas > 100km)
            else:
                SEGMENT_RESOLUTION = 2000  # 2km (rotas curtas)

            # Passo A: Criar segmentos
            segments_to_process = []
            current_segment = []
            accumulated_dist = 0
            last_pt = None

            for i, pt in enumerate(geometry):
                current_segment.append(pt)
                if last_pt: accumulated_dist += haversine_distance(last_pt, pt)

                # Corta segmento quando atinge resolução ou é o fim
                if accumulated_dist >= SEGMENT_RESOLUTION or i == len(geometry) - 1:
                    mid_pt = current_segment[len(current_segment) // 2]
                    segments_to_process.append({
                        'coords': current_segment,
                        'midpoint': (mid_pt[1], mid_pt[0])
                    })
                    current_segment = [pt]
                    accumulated_dist = 0
                last_pt = pt

            # Passo B: Batch Request Super Rápido
            midpoints = [seg['midpoint'] for seg in segments_to_process]
            weather_results = get_weather_batch(midpoints)

            # Passo C: Colorir
            for i, seg in enumerate(segments_to_process):
                weather = weather_results[i] if i < len(weather_results) else None
                color = '#8c03fc'
                desc = 'Desconhecido'

                if weather:
                    code = weather.get('weather_code', 0)
                    color, desc = get_weather_color_and_desc(code)

                weather_segments.append({
                    'coordinates': seg['coords'],
                    'color': color,
                    'description': desc
                })

        elif is_tourist:
            weather_segments = [{'coordinates': geometry, 'color': '#f97316', 'description': 'Rota Turística'}]
        else:
            weather_segments = [{'coordinates': geometry, 'color': '#8c03fc', 'description': 'Rota Normal'}]

    route_data['weather_segments'] = weather_segments
    route_data['tourist_spots'] = extra_info_markers

    return route_data


# --- HELPERS API ---
def get_nominatim_request(endpoint, params):
    url = f"https://{NOMINATIM_SERVER}/{endpoint}"
    headers = {'User-Agent': 'BetterMaps-App/1.0'}
    params['format'] = 'json'
    response = httpx.get(url, params=params, headers=headers, timeout=10)
    return response.json()


def get_nearest_service(profile, coordinates_str, number):
    return get_osrm_request("nearest", "v1", profile, coordinates_str, ["number=" + str(number)])


def get_geocode(address):
    return get_nominatim_request("search", {"q": address, "limit": 1})


def get_reverse_geocode(lat, lng):
    return get_nominatim_request("reverse", {"lat": lat, "lon": lng})