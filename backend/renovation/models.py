from django.conf import settings
from django.db import models

from lakes.models import WaterBody


class RenovationStage(models.Model):
    """A step in the renovation workflow for a water body.

    Officers monitor the work stage by stage. Every stage MUST have at least
    one geo-tagged photo (enforced in the API layer) before it can be marked
    complete.
    """

    class StageStatus(models.TextChoices):
        NOT_STARTED = "NOT_STARTED", "Not Started"
        IN_PROGRESS = "IN_PROGRESS", "In Progress"
        COMPLETED = "COMPLETED", "Completed"
        PENDING = "PENDING", "Pending"

    water_body = models.ForeignKey(
        WaterBody, on_delete=models.CASCADE, related_name="stages"
    )
    order = models.PositiveIntegerField(default=1, help_text="Sequence of the stage.")
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, help_text="What work is done in this stage.")
    status = models.CharField(
        max_length=20, choices=StageStatus.choices, default=StageStatus.NOT_STARTED
    )
    pending_reason = models.TextField(
        blank=True, help_text="Reason if this stage is pending."
    )
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)

    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="updated_stages",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["water_body", "order"]

    @property
    def photo_count(self):
        return self.photos.count()

    def __str__(self):
        return f"{self.water_body.name} - {self.order}. {self.title}"


class StagePhoto(models.Model):
    """A mandatory geo-tagged photo uploaded at a renovation stage."""

    stage = models.ForeignKey(
        RenovationStage, on_delete=models.CASCADE, related_name="photos"
    )
    image = models.ImageField(upload_to="renovation_photos/%Y/%m/")
    caption = models.CharField(max_length=255, blank=True)
    # Geographic coordinates where the photo was taken (mandatory).
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    taken_at = models.DateTimeField(null=True, blank=True)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="uploaded_photos",
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-uploaded_at"]

    def __str__(self):
        return f"Photo for {self.stage} @ ({self.latitude}, {self.longitude})"


class Worker(models.Model):
    """A person (or group) who worked on a water body's renovation.

    Tracked separately by gender, with designation, as requested.
    """

    class Gender(models.TextChoices):
        MALE = "MALE", "Male"
        FEMALE = "FEMALE", "Female"

    water_body = models.ForeignKey(
        WaterBody, on_delete=models.CASCADE, related_name="workers"
    )
    name = models.CharField(max_length=200, blank=True)
    gender = models.CharField(max_length=10, choices=Gender.choices)
    designation = models.CharField(max_length=150)
    count = models.PositiveIntegerField(
        default=1, help_text="Number of workers of this designation/gender."
    )

    class Meta:
        ordering = ["gender", "designation"]

    def __str__(self):
        label = self.name or self.designation
        return f"{label} ({self.get_gender_display()}) x{self.count}"


class Equipment(models.Model):
    """Machine or equipment used to revive the water body."""

    water_body = models.ForeignKey(
        WaterBody, on_delete=models.CASCADE, related_name="equipment"
    )
    name = models.CharField(max_length=200)
    quantity = models.PositiveIntegerField(default=1)
    notes = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["name"]
        verbose_name_plural = "Equipment"

    def __str__(self):
        return f"{self.name} x{self.quantity}"


class FundEntry(models.Model):
    """Money used for reviving the water body."""

    water_body = models.ForeignKey(
        WaterBody, on_delete=models.CASCADE, related_name="fund_entries"
    )
    purpose = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    spent_on = models.DateField(null=True, blank=True)
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="fund_entries",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-spent_on", "-created_at"]
        verbose_name_plural = "Fund entries"

    def __str__(self):
        return f"{self.purpose}: {self.amount}"
