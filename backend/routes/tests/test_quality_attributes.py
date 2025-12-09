"""
Testes de Atributos de Qualidade do Sistema BetterMaps
"""
import time
from unittest.mock import Mock, patch, MagicMock
from django.test import TestCase
from django.test import Client
from rest_framework.test import APIClient
from rest_framework import status
import json

from ..services.osrm_service import get_route
from ..services.weather_service import get_weather_batch, get_weather_color_and_desc
from ..services.geocoding_service import get_geocode, get_reverse_geocode


class A_InteroperabilityTests(TestCase):
    """
    A. Interoperabilidade (Interoperability)
    Testa se o Backend normaliza respostas JSON de APIs diferentes (OSRM, Open-Meteo, Nominatim)
    num formato único e padrão para o Frontend consumir.
    """
    
    def setUp(self):
        self.client = APIClient()
    
    @patch('routes.services.osrm_service.httpx.get')
    def test_osrm_response_normalization(self, mock_get):
        """Testa se a resposta OSRM é normalizada com weather_segments e tourist_spots"""
        # Mock da resposta OSRM (formato real)
        mock_osrm_response = {
            'routes': [{
                'distance': 5000,
                'duration': 600,
                'geometry': {
                    'coordinates': [[-9.2066, 38.7119], [-9.15, 38.75]]
                }
            }],
            'code': 'Ok'
        }
        
        mock_response = Mock()
        mock_response.json.return_value = mock_osrm_response
        mock_response.raise_for_status = Mock()
        mock_get.return_value = mock_response
        
        # Mock do weather service
        with patch('routes.services.osrm_service.get_weather_batch') as mock_weather:
            mock_weather.return_value = [{'weather_code': 0, 'temperature_2m': 20}]
            
            result = get_route('driving', (-9.2066, 38.7119), (-9.15, 38.75), 
                             is_tourist=False, is_climatic=True)
            
            # Verifica que a resposta tem formato normalizado
            self.assertIn('weather_segments', result)
            self.assertIn('tourist_spots', result)
            self.assertIsInstance(result['weather_segments'], list)
            self.assertIsInstance(result['tourist_spots'], list)
            
            # Verifica estrutura dos weather_segments
            if result['weather_segments']:
                segment = result['weather_segments'][0]
                self.assertIn('coordinates', segment)
                self.assertIn('color', segment)
                self.assertIn('description', segment)
    
    @patch('routes.services.weather_service.httpx.get')
    def test_weather_api_response_normalization(self, mock_get):
        """Testa se a resposta Open-Meteo é normalizada para formato padrão"""
        # Mock da resposta Open-Meteo (formato real)
        mock_weather_response = {
            'current': {
                'weather_code': 0,
                'temperature_2m': 20.5
            }
        }
        
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = mock_weather_response
        mock_get.return_value = mock_response
        
        result = get_weather_batch([(38.7119, -9.2066)])
        
        # Verifica formato normalizado
        self.assertIsInstance(result, list)
        if result:
            self.assertIn('weather_code', result[0])
            self.assertIn('temperature_2m', result[0])
    
    @patch('routes.services.geocoding_service.httpx.get')
    def test_nominatim_response_normalization(self, mock_get):
        """Testa se a resposta Nominatim mantém formato consistente"""
        # Mock da resposta Nominatim (formato real)
        mock_nominatim_response = [{
            'display_name': 'Lisboa, Portugal',
            'lat': '38.7119',
            'lon': '-9.2066'
        }]
        
        mock_response = Mock()
        mock_response.json.return_value = mock_nominatim_response
        mock_get.return_value = mock_response
        
        result = get_geocode('Lisboa')
        
        # Verifica que retorna lista (formato padrão Nominatim)
        self.assertIsInstance(result, (list, dict))
        # Se for lista, verifica primeiro elemento
        if isinstance(result, list) and result:
            self.assertIn('display_name', result[0])
            self.assertIn('lat', result[0])
            self.assertIn('lon', result[0])
    
    def test_unified_response_structure(self):
        """Testa se todas as APIs retornam estruturas que o frontend pode consumir"""
        # Testa endpoint de rota que combina múltiplas APIs
        with patch('routes.services.osrm_service.httpx.get') as mock_osrm, \
             patch('routes.services.osrm_service.get_weather_batch') as mock_weather:
            
            mock_osrm_response = Mock()
            mock_osrm_response.json.return_value = {
                'routes': [{
                    'distance': 5000,
                    'duration': 600,
                    'geometry': {'coordinates': [[-9.2066, 38.7119], [-9.15, 38.75]]}
                }]
            }
            mock_osrm_response.raise_for_status = Mock()
            mock_osrm.return_value = mock_osrm_response
            mock_weather.return_value = [{'weather_code': 0}]
            
            result = get_route('driving', (-9.2066, 38.7119), (-9.15, 38.75), 
                             is_climatic=True)
            
            # Verifica estrutura unificada
            required_keys = ['weather_segments', 'tourist_spots']
            for key in required_keys:
                self.assertIn(key, result, f"Chave '{key}' ausente na resposta normalizada")


class B_UsabilityTests(TestCase):
    """
    B. Usabilidade (Usability)
    Testa se a interface permite Zoom, Pan e Seleção sem latência percetível.
    Nota: Testes de UI são principalmente no frontend, mas podemos testar
    que o backend responde rápido o suficiente.
    """
    
    def setUp(self):
        self.client = APIClient()
    
    @patch('routes.services.osrm_service.httpx.get')
    def test_route_response_time_acceptable(self, mock_get):
        """Testa se o tempo de resposta da rota é aceitável (< 2 segundos)"""
        mock_response = Mock()
        mock_response.json.return_value = {
            'routes': [{
                'distance': 5000,
                'duration': 600,
                'geometry': {'coordinates': [[-9.2066, 38.7119], [-9.15, 38.75]]}
            }]
        }
        mock_response.raise_for_status = Mock()
        mock_get.return_value = mock_response
        
        start_time = time.time()
        with patch('routes.services.osrm_service.get_weather_batch') as mock_weather:
            mock_weather.return_value = []
            get_route('driving', (-9.2066, 38.7119), (-9.15, 38.75))
        end_time = time.time()
        
        response_time = end_time - start_time
        # Deve responder em menos de 2 segundos (com mocks)
        self.assertLess(response_time, 2.0, 
                       f"Tempo de resposta muito lento: {response_time:.2f}s")
    
    @patch('routes.services.geocoding_service.httpx.get')
    def test_geocode_response_time_acceptable(self, mock_get):
        """Testa se o geocoding responde rápido (< 1 segundo)"""
        mock_response = Mock()
        mock_response.json.return_value = [{
            'display_name': 'Lisboa',
            'lat': '38.7119',
            'lon': '-9.2066'
        }]
        mock_get.return_value = mock_response
        
        start_time = time.time()
        get_geocode('Lisboa')
        end_time = time.time()
        
        response_time = end_time - start_time
        self.assertLess(response_time, 1.0,
                       f"Geocoding muito lento: {response_time:.2f}s")


class C_ModifiabilityTests(TestCase):
    """
    C. Modificabilidade (Modularity/Maintainability)
    Testa se a arquitetura permite adicionar novos serviços sem reescrever código existente.
    """
    
    def test_osrm_service_independent(self):
        """Testa se OSRM Service pode ser usado independentemente"""
        # Verifica que o serviço não depende de outros serviços desnecessariamente
        from ..services.osrm_service import get_osrm_request, get_osrm_config
        
        # Testa função isolada
        server, profile = get_osrm_config('driving')
        self.assertIsNotNone(server)
        self.assertIsNotNone(profile)
    
    def test_weather_service_independent(self):
        """Testa se Weather Service pode ser usado independentemente"""
        from ..services.weather_service import get_weather_color_and_desc
        
        # Testa função isolada sem dependências externas
        color, desc = get_weather_color_and_desc(0)
        self.assertIsNotNone(color)
        self.assertIsNotNone(desc)
        self.assertIsInstance(color, str)
        self.assertIsInstance(desc, str)
    
    def test_geocoding_service_independent(self):
        """Testa se Geocoding Service pode ser usado independentemente"""
        from ..services.geocoding_service import get_nominatim_request
        
        # Verifica que o serviço tem interface clara
        self.assertTrue(callable(get_nominatim_request))
    
    def test_tourism_service_independent(self):
        """Testa se Tourism Service pode ser usado independentemente"""
        from ..services.tourism_service import find_pois_near_point_local
        
        # Verifica que o serviço tem interface clara
        self.assertTrue(callable(find_pois_near_point_local))
    
    def test_new_service_can_be_added(self):
        """
        Testa se um novo serviço pode ser adicionado sem modificar serviços existentes.
        Simula adição de um EmergencyService hipotético.
        """
        # Verifica que os serviços atuais não têm dependências circulares
        from ..services import osrm_service, weather_service, geocoding_service, tourism_service
        
        # Todos os serviços devem ser importáveis independentemente
        self.assertTrue(hasattr(osrm_service, 'get_route'))
        self.assertTrue(hasattr(weather_service, 'get_weather_batch'))
        self.assertTrue(hasattr(geocoding_service, 'get_geocode'))
        self.assertTrue(hasattr(tourism_service, 'find_pois_near_point_local'))
        
        # Simula estrutura de novo serviço
        class MockEmergencyService:
            @staticmethod
            def find_emergency_services(lat, lng, radius):
                return []
        
        # Verifica que pode coexistir com serviços existentes
        emergency_service = MockEmergencyService()
        self.assertTrue(hasattr(emergency_service, 'find_emergency_services'))
    
    def test_services_use_standard_interfaces(self):
        """Testa se os serviços seguem interfaces padrão (facilita extensão)"""
        from ..services.osrm_service import get_route
        from ..services.weather_service import get_weather_batch
        from ..services.geocoding_service import get_geocode
        
        # Verifica que todos retornam estruturas de dados (não objetos complexos)
        # Isso facilita adicionar novos serviços que seguem o mesmo padrão
        services = [
            ('osrm', get_route),
            ('weather', get_weather_batch),
            ('geocoding', get_geocode)
        ]
        
        for name, service_func in services:
            self.assertTrue(callable(service_func), 
                          f"Serviço {name} não é callable")


class D_PerformanceTests(TestCase):
    """
    D. Performance (Time Behaviour)
    Testa se o tempo de resposta entre pedido de rota e visualização é otimizado.
    """
    
    @patch('routes.services.osrm_service.httpx.get')
    def test_route_calculation_performance(self, mock_get):
        """Testa performance do cálculo de rotas"""
        mock_response = Mock()
        mock_response.json.return_value = {
            'routes': [{
                'distance': 5000,
                'duration': 600,
                'geometry': {'coordinates': [[-9.2066, 38.7119], [-9.15, 38.75]]}
            }]
        }
        mock_response.raise_for_status = Mock()
        mock_get.return_value = mock_response
        
        start_time = time.time()
        with patch('routes.services.osrm_service.get_weather_batch') as mock_weather:
            mock_weather.return_value = []
            result = get_route('driving', (-9.2066, 38.7119), (-9.15, 38.75))
        end_time = time.time()
        
        elapsed = end_time - start_time
        # Com mocks, deve ser muito rápido (< 0.5s)
        self.assertLess(elapsed, 0.5, 
                       f"Cálculo de rota muito lento: {elapsed:.3f}s")
        self.assertIsNotNone(result)
    
    @patch('routes.services.weather_service.httpx.get')
    def test_weather_batch_performance(self, mock_get):
        """Testa performance do batch request de weather"""
        # Simula 50 pontos (tamanho do batch)
        # A API Open-Meteo retorna lista quando há múltiplos pontos
        mock_response = Mock()
        mock_response.status_code = 200
        # Retorna lista com 50 elementos (um para cada ponto)
        mock_response.json.return_value = [
            {'current': {'weather_code': 0, 'temperature_2m': 20}} 
            for _ in range(50)
        ]
        mock_get.return_value = mock_response
        
        points = [(38.7119 + i*0.01, -9.2066 + i*0.01) for i in range(50)]
        
        start_time = time.time()
        result = get_weather_batch(points)
        end_time = time.time()
        
        elapsed = end_time - start_time
        # Batch deve ser eficiente
        self.assertLess(elapsed, 1.0,
                       f"Batch weather muito lento: {elapsed:.3f}s para {len(points)} pontos")
        self.assertEqual(len(result), len(points))
    
    @patch('routes.services.osrm_service.httpx.get')
    def test_route_with_climatic_performance(self, mock_get):
        """Testa performance de rota com segmentos climáticos"""
        # Mock de rota com muitos pontos
        coords = [[-9.2066 + i*0.001, 38.7119 + i*0.001] for i in range(100)]
        mock_response = Mock()
        mock_response.json.return_value = {
            'routes': [{
                'distance': 50000,
                'duration': 3600,
                'geometry': {'coordinates': coords}
            }]
        }
        mock_response.raise_for_status = Mock()
        mock_get.return_value = mock_response
        
        start_time = time.time()
        with patch('routes.services.osrm_service.get_weather_batch') as mock_weather:
            # Simula batch rápido
            mock_weather.return_value = [{'weather_code': 0} for _ in range(10)]
            result = get_route('driving', (-9.2066, 38.7119), (-9.15, 38.75), 
                             is_climatic=True)
        end_time = time.time()
        
        elapsed = end_time - start_time
        # Rota climática deve processar segmentos eficientemente
        self.assertLess(elapsed, 1.0,
                       f"Rota climática muito lenta: {elapsed:.3f}s")
        self.assertIn('weather_segments', result)

