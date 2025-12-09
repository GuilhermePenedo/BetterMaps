from django.urls import path
from .views import OsrmNearestView, OsrmRouteView, GeocodeView, ReverseGeocodeView

app_name = 'routes'

urlpatterns = [
    # Rotas OSRM
    path('osrm/nearest/', OsrmNearestView.as_view()),
    path('osrm/route/', OsrmRouteView.as_view()),

    # Rotas Nominatim (Geocoding)
    path('geocode/', GeocodeView.as_view()),
    path('reverse-geocode/', ReverseGeocodeView.as_view()),
]