from django.urls import path
from .views import OsrmNearestView, OsrmRouteView

app_name = 'routes'

urlpatterns = [
    path('osrm/nearest/', OsrmNearestView.as_view()),
    path('osrm/route/', OsrmRouteView.as_view()),
]