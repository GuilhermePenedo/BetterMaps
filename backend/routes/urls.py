from django.urls import path
from .views import OsrmNearestView

app_name = 'routes'

urlpatterns = [
    path('osrm/nearest/', OsrmNearestView.as_view()),
]