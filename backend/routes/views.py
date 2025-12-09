from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .services.osrm_service import get_nearest_service, get_route, get_geocode, get_reverse_geocode

class OsrmNearestView(APIView):
    def get(self, request):
        lng = request.query_params.get('lng')
        lat = request.query_params.get('lat')
        profile = request.query_params.get('profile', 'driving')

        if not lng or not lat:
            return Response({'error': 'lng and lat required'}, status=status.HTTP_400_BAD_REQUEST)

        coords = f"{lng},{lat}"
        try:
            result = get_nearest_service(profile, coords, 1)
            return Response(result)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class OsrmRouteView(APIView):
    def get(self, request):
        origin_lng = request.query_params.get('origin_lng')
        origin_lat = request.query_params.get('origin_lat')
        dest_lng = request.query_params.get('dest_lng')
        dest_lat = request.query_params.get('dest_lat')
        # Aqui capturamos o profile que vem do React (walking, cycling, driving)
        profile = request.query_params.get('profile', 'driving')

        if not all([origin_lng, origin_lat, dest_lng, dest_lat]):
            return Response({'error': 'All coordinates required'}, status=status.HTTP_400_BAD_REQUEST)

        coordinates = f"{origin_lng},{origin_lat};{dest_lng},{dest_lat}"
        try:
            result = get_route(profile, coordinates)
            return Response(result)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class GeocodeView(APIView):
    def get(self, request):
        address = request.query_params.get('address')

        if not address:
            return Response({'error': 'Address parameter is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            result = get_geocode(address)
            return Response(result)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ReverseGeocodeView(APIView):
    def get(self, request):
        lat = request.query_params.get('lat')
        lng = request.query_params.get('lng')

        if not lat or not lng:
            return Response({'error': 'Lat and Lng parameters are required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            result = get_reverse_geocode(lat, lng)
            return Response(result)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)