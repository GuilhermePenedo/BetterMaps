from django.db import models

class SimpleTouristPoint(models.Model):
    name = models.CharField(max_length=255)
    category = models.CharField(max_length=100) # ex: museum, castle
    lat = models.FloatField()  # Latitude normal
    lng = models.FloatField()  # Longitude normal

    def __str__(self):
        return f"{self.name} ({self.lat}, {self.lng})"
