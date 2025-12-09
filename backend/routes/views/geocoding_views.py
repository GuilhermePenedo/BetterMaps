from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from ..services.geocoding_service import get_geocode, get_reverse_geocode


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

