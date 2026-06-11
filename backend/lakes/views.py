from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.models import Role

from .models import WaterBody
from .serializers import WaterBodyListSerializer, WaterBodySerializer


class WaterBodyViewSet(viewsets.ModelViewSet):
    """Lakes & ponds.

    Filterable by ?local_body=, ?ward=, ?area=, ?village=, ?status=, ?kind=.
    Officers may read everything but only edit bodies in their assigned local
    bodies; Admin / Super Admin may edit anything.
    """

    def get_serializer_class(self):
        if self.action == "list":
            return WaterBodyListSerializer
        return WaterBodySerializer

    def get_queryset(self):
        qs = WaterBody.objects.select_related(
            "local_body", "ward", "area", "village", "incharge"
        ).all()
        params = self.request.query_params
        for field in ("local_body", "ward", "area", "village", "status", "kind"):
            value = params.get(field)
            if value:
                qs = qs.filter(**{field: value})
        return qs

    def _can_edit(self, instance=None):
        user = self.request.user
        if user.role in (Role.SUPER_ADMIN, Role.ADMIN):
            return True
        # Officers: only within their assigned local bodies.
        if instance is not None:
            return user.local_bodies.filter(pk=instance.local_body_id).exists()
        return True

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        if not self._can_edit(serializer.instance):
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("You can only edit water bodies in your assigned local bodies.")
        serializer.save()

    @action(detail=False, methods=["get"])
    def stats(self, request):
        """Status counts for dashboards, honouring the same filters as list."""
        qs = self.get_queryset()
        counts = {}
        for value, _label in WaterBody.Status.choices:
            counts[value] = qs.filter(status=value).count()
        return Response({"total": qs.count(), "by_status": counts})
