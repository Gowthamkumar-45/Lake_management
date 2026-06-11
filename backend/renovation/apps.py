from django.apps import AppConfig


class RenovationConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "renovation"

    def ready(self):
        from . import signals  # noqa: F401
