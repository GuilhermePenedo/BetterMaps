import httpx
from .config import OPEN_METEO_URL
from .utils import chunk_list


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

