import httpx

server = "router.project-osrm.org"
my_coords = "9.139806,38.736889"

osrm_server = "router.project-osrm.org"
nominatim_server = "nominatim.openstreetmap.org"  # Novo servidor para Geocoding


# --- Funções Genéricas ---
def get_osrm_request(service, version, profile, coordinates, format, options):
    url = f"http://{osrm_server}/{service}/{version}/{profile}/{coordinates}.{format}"
    if options:
        url += "?" + "&".join(options)
    response = httpx.get(url)
    response.raise_for_status()
    return response.json()


def get_nominatim_request(endpoint, params):
    url = f"https://{nominatim_server}/{endpoint}"
    # O Nominatim exige um User-Agent válido
    headers = {'User-Agent': 'BetterMaps-App/1.0'}
    # Adicionar format=json obrigatoriamente
    params['format'] = 'json'

    response = httpx.get(url, params=params, headers=headers)
    response.raise_for_status()
    return response.json()


# --- Serviços OSRM (Existentes) ---
def get_nearest_service(profile, coordinates, number):
    return get_osrm_request("nearest", "v1", profile, coordinates, "json", ["number=" + str(number)])


def get_route(profile, coordinates):
    return get_osrm_request("route", "v1", profile, coordinates, "json",
                            ["steps=true", "geometries=geojson", "overview=full"])


# --- Novos Serviços de Geocoding (Nominatim) ---

def get_geocode(address):
    """ Converte texto (ex: 'Lisboa') em coordenadas """
    return get_nominatim_request("search", {"q": address, "limit": 1})


def get_reverse_geocode(lat, lng):
    """ Converte coordenadas em texto """
    return get_nominatim_request("reverse", {"lat": lat, "lon": lng})


data = get_nearest_service("driving", my_coords, 1)
print(data)
