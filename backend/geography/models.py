from django.db import models


class District(models.Model):
    name = models.CharField(max_length=120, unique=True)
    code = models.CharField(max_length=20, blank=True)
    # Map default view for the district.
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class LocalBody(models.Model):
    """A local administrative body inside a district.

    Tamil Nadu local body types:
      CORPORATION    -> Maanagaratchi
      MUNICIPALITY   -> Nagaratchi
      TOWN_PANCHAYAT -> Peruratchi
      PANCHAYAT      -> Ooratchi

    Corporation / Municipality / Town Panchayat are subdivided into Wards
    (which contain Areas). A Panchayat is subdivided into Villages directly.
    """

    class BodyType(models.TextChoices):
        CORPORATION = "CORPORATION", "Corporation (Maanagaratchi)"
        MUNICIPALITY = "MUNICIPALITY", "Municipality (Nagaratchi)"
        TOWN_PANCHAYAT = "TOWN_PANCHAYAT", "Town Panchayat (Peruratchi)"
        PANCHAYAT = "PANCHAYAT", "Panchayat (Ooratchi)"

    district = models.ForeignKey(
        District, on_delete=models.CASCADE, related_name="local_bodies"
    )
    body_type = models.CharField(max_length=20, choices=BodyType.choices)
    name = models.CharField(max_length=150)
    # Each local body has its own map.
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    # Optional GeoJSON boundary string for drawing the body outline on the map.
    boundary_geojson = models.TextField(blank=True)

    class Meta:
        ordering = ["name"]
        unique_together = ("district", "body_type", "name")
        verbose_name_plural = "Local bodies"

    @property
    def uses_wards(self):
        return self.body_type != self.BodyType.PANCHAYAT

    def __str__(self):
        return f"{self.name} [{self.get_body_type_display()}]"


class Ward(models.Model):
    """Ward inside a Corporation / Municipality / Town Panchayat."""

    local_body = models.ForeignKey(
        LocalBody, on_delete=models.CASCADE, related_name="wards"
    )
    name = models.CharField(max_length=120)
    number = models.CharField(max_length=20, blank=True)

    class Meta:
        ordering = ["number", "name"]
        unique_together = ("local_body", "name")

    def __str__(self):
        return f"Ward {self.number} - {self.name}" if self.number else self.name


class Village(models.Model):
    """Village inside a Panchayat."""

    local_body = models.ForeignKey(
        LocalBody, on_delete=models.CASCADE, related_name="villages"
    )
    name = models.CharField(max_length=120)

    class Meta:
        ordering = ["name"]
        unique_together = ("local_body", "name")

    def __str__(self):
        return self.name


class Area(models.Model):
    """Area inside a Ward (for Corporation / Municipality / Town Panchayat)."""

    ward = models.ForeignKey(Ward, on_delete=models.CASCADE, related_name="areas")
    name = models.CharField(max_length=120)

    class Meta:
        ordering = ["name"]
        unique_together = ("ward", "name")

    def __str__(self):
        return self.name
