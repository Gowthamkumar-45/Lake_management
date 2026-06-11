from django.conf import settings
from django.db import models

from geography.models import Area, LocalBody, Village, Ward


class WaterBody(models.Model):
    """A lake or pond tracked by the system.

    Location is resolved through the geography hierarchy. For Corporation /
    Municipality / Town Panchayat a water body sits under a Ward + Area; for a
    Panchayat it sits under a Village. The local_body is always set so a body
    can be listed and mapped per local body.
    """

    class BodyKind(models.TextChoices):
        LAKE = "LAKE", "Lake"
        POND = "POND", "Pond"

    class Status(models.TextChoices):
        UNDER_RENOVATION = "UNDER_RENOVATION", "Under Renovation"
        RENOVATION_COMPLETE = "RENOVATION_COMPLETE", "Renovation Complete"
        RENOVATION_PENDING = "RENOVATION_PENDING", "Renovation Pending"
        ENCROACHMENT = "ENCROACHMENT", "Encroachment"
        DISAPPEARED = "DISAPPEARED", "Disappeared"

    class WaterSource(models.TextChoices):
        RAIN_WATER = "RAIN_WATER", "Rain Water Only"
        RIVER_CONNECTION = "RIVER_CONNECTION", "River Connection"
        BOTH = "BOTH", "Rain Water + River Connection"

    class RevivedBy(models.TextChoices):
        NGO = "NGO", "NGO"
        LOCAL_TEAM = "LOCAL_TEAM", "Local Team"
        GOVERNMENT = "GOVERNMENT", "Government"

    name = models.CharField(max_length=200)
    kind = models.CharField(max_length=10, choices=BodyKind.choices, default=BodyKind.POND)

    # Location (local_body always set; ward+area OR village depending on type)
    local_body = models.ForeignKey(
        LocalBody, on_delete=models.CASCADE, related_name="water_bodies"
    )
    ward = models.ForeignKey(
        Ward, on_delete=models.SET_NULL, null=True, blank=True, related_name="water_bodies"
    )
    area = models.ForeignKey(
        Area, on_delete=models.SET_NULL, null=True, blank=True, related_name="water_bodies"
    )
    village = models.ForeignKey(
        Village, on_delete=models.SET_NULL, null=True, blank=True, related_name="water_bodies"
    )

    # Geo coordinates for the map marker (mandatory for mapping).
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    boundary_geojson = models.TextField(
        blank=True, help_text="Optional GeoJSON polygon of the water body outline."
    )

    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.RENOVATION_PENDING
    )
    # Reason required when status is RENOVATION_PENDING.
    pending_reason = models.TextField(blank=True)

    # Characteristics
    water_source = models.CharField(
        max_length=20, choices=WaterSource.choices, default=WaterSource.RAIN_WATER
    )
    capacity_litres = models.BigIntegerField(
        null=True, blank=True, help_text="Storage capacity in litres."
    )
    area_acres = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )

    # Revival / ownership info
    revived_by = models.CharField(
        max_length=20, choices=RevivedBy.choices, blank=True
    )
    revived_by_name = models.CharField(
        max_length=200, blank=True, help_text="Name of the NGO / local team."
    )

    # Incharge officer for this water body.
    incharge = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="incharge_water_bodies",
    )
    incharge_name = models.CharField(
        max_length=200, blank=True, help_text="Free-text incharge if not a system user."
    )
    incharge_contact = models.CharField(max_length=50, blank=True)

    total_funds_used = models.DecimalField(
        max_digits=14, decimal_places=2, default=0,
        help_text="Rolled up from renovation fund entries.",
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_water_bodies",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        verbose_name = "Water Body"
        verbose_name_plural = "Water Bodies"

    def __str__(self):
        return f"{self.name} ({self.get_kind_display()})"
