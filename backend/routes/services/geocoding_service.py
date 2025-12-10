import httpx
from .config import NOMINATIM_SERVER


def get_nominatim_request(endpoint, params):
    url = f"https://{NOMINATIM_SERVER}/{endpoint}"
    headers = {'User-Agent': 'BetterMaps-App/1.0'}
    params['format'] = 'json'
    response = httpx.get(url, params=params, headers=headers, timeout=10)
    return response.json()


def get_geocode(address):
    return get_nominatim_request("search", {"q": address, "limit": 1})


def get_reverse_geocode(lat, lng):
    return get_nominatim_request("reverse", {"lat": lat, "lon": lng})

