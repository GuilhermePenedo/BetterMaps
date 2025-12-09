import httpx
from .config import SERVER_DRIVING, SERVER_BIKE, SERVER_FOOT
from .utils import haversine_distance
from .weather_service import get_weather_batch, get_weather_color_and_desc
from .tourism_service import find_pois_near_point_local


def get_osrm_config(profile):
    if profile == 'walking':
        return SERVER_FOOT, 'driving'
    elif profile == 'cycling':
        return SERVER_BIKE, 'driving'
    else:
        return SERVER_DRIVING, 'driving'


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


def get_nearest_service(profile, coordinates_str, number):
    return get_osrm_request("nearest", "v1", profile, coordinates_str, ["number=" + str(number)])
