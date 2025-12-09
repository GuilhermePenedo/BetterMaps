import httpx

# Servidores
SERVER_DRIVING = "router.project-osrm.org"
SERVER_BIKE = "routing.openstreetmap.de/routed-bike"
SERVER_FOOT = "routing.openstreetmap.de/routed-foot"
NOMINATIM_SERVER = "nominatim.openstreetmap.org"


def get_osrm_config(profile):
    """
    Escolhe o servidor correto baseado no perfil.
    Nota: Os servidores 'routed-bike' e 'routed-foot' esperam 'driving' na URL
    interna, mesmo sendo rotas de bicicleta/pé.
    """
    if profile == 'walking':
        return SERVER_FOOT, 'driving'
    elif profile == 'cycling':
        return SERVER_BIKE, 'driving'
    else:
        return SERVER_DRIVING, 'driving'  # Default: Carro


# --- Funções Genéricas OSRM ---
def get_osrm_request(service, version, profile_requested, coordinates, format, options):
    # 1. Escolher servidor
    server, internal_profile = get_osrm_config(profile_requested)

    # 2. Definir protocolo (o servidor alemão exige HTTPS)
    protocol = "https" if "openstreetmap.de" in server else "http"

    url = f"{protocol}://{server}/{service}/{version}/{internal_profile}/{coordinates}.{format}"

    if options:
        url += "?" + "&".join(options)

    print(f"Requesting OSRM ({profile_requested}): {url}")  # Log para debug

    response = httpx.get(url)
    response.raise_for_status()
    return response.json()


def get_nominatim_request(endpoint, params):
    url = f"https://{NOMINATIM_SERVER}/{endpoint}"
    # User-Agent obrigatório
    headers = {'User-Agent': 'BetterMaps-App/1.0'}
    params['format'] = 'json'

    response = httpx.get(url, params=params, headers=headers)
    response.raise_for_status()
    return response.json()


# --- Serviços Públicos ---

def get_nearest_service(profile, coordinates, number):
    return get_osrm_request("nearest", "v1", profile, coordinates, "json", ["number=" + str(number)])


def get_route(profile, coordinates):
    return get_osrm_request("route", "v1", profile, coordinates, "json",
                            ["steps=true", "geometries=geojson", "overview=full"])


def get_geocode(address):
    return get_nominatim_request("search", {"q": address, "limit": 1})


def get_reverse_geocode(lat, lng):
    return get_nominatim_request("reverse", {"lat": lat, "lon": lng})