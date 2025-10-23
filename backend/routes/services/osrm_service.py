import httpx

server = "router.project-osrm.org"
my_coords = "9.139806,38.736889"

def get_request(service, version,profile, coordinates, format, options):
    url = f"http://{server}/{service}/{version}/{profile}/{coordinates}.{format}"
    if options:
        url += "?" + "&".join(options)
    response = httpx.get(url)
    response.raise_for_status()  # opcional: lança erro se HTTP != 200
    return response.json()

def get_nearest_service(profile, coordinates, number):
    return get_request("nearest", "v1", profile, coordinates, "json", ["number=" + str(number)])


data = get_nearest_service("driving", my_coords, 1)
print(data)
