from django.contrib.auth.models import AbstractUser
from django.db import models


class Role(models.TextChoices):
    SUPER_ADMIN = "SUPER_ADMIN", "Super Admin"
    ADMIN = "ADMIN", "Admin"
    OFFICER = "OFFICER", "Officer"


class User(AbstractUser):
    """Custom user with a role used for authorization across the system.

    - SUPER_ADMIN: full access, manages admins and master geography data.
    - ADMIN: manages officers and data within an assigned district / local bodies.
    - OFFICER: field user who updates lakes/ponds and the renovation workflow.
    """

    role = models.CharField(
        max_length=20, choices=Role.choices, default=Role.OFFICER
    )
    phone = models.CharField(max_length=20, blank=True)
    designation = models.CharField(max_length=120, blank=True)

    # An officer (and optionally an admin) is scoped to a district and a set
    # of local bodies they are responsible for.
    district = models.ForeignKey(
        "geography.District",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="users",
    )
    local_bodies = models.ManyToManyField(
        "geography.LocalBody",
        blank=True,
        related_name="officers",
    )

    @property
    def is_super_admin(self):
        return self.role == Role.SUPER_ADMIN

    @property
    def is_admin_role(self):
        return self.role == Role.ADMIN

    @property
    def is_officer(self):
        return self.role == Role.OFFICER

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"
