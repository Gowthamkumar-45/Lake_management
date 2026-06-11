from rest_framework import viewsets

from accounts.permissions import IsStaffWriteOrReadOnly

from .models import Area, District, LocalBody, Village, Ward
from .serializers import (
    AreaSerializer,
    DistrictSerializer,
    LocalBodySerializer,
    VillageSerializer,
    WardSerializer,
)


class DistrictViewSet(viewsets.ModelViewSet):
    queryset = District.objects.all()
    serializer_class = DistrictSerializer
    permission_classes = [IsStaffWriteOrReadOnly]


class LocalBodyViewSet(viewsets.ModelViewSet):
    """Local bodies, filterable by ?district= and ?body_type=."""

    serializer_class = LocalBodySerializer
    permission_classes = [IsStaffWriteOrReadOnly]

    def get_queryset(self):
        qs = LocalBody.objects.select_related("district").all()
        district = self.request.query_params.get("district")
        body_type = self.request.query_params.get("body_type")
        if district:
            qs = qs.filter(district_id=district)
        if body_type:
            qs = qs.filter(body_type=body_type)
        return qs


class WardViewSet(viewsets.ModelViewSet):
    """Wards, filterable by ?local_body=."""

    serializer_class = WardSerializer
    permission_classes = [IsStaffWriteOrReadOnly]

    def get_queryset(self):
        qs = Ward.objects.all()
        local_body = self.request.query_params.get("local_body")
        if local_body:
            qs = qs.filter(local_body_id=local_body)
        return qs


class VillageViewSet(viewsets.ModelViewSet):
    """Villages, filterable by ?local_body=."""

    serializer_class = VillageSerializer
    permission_classes = [IsStaffWriteOrReadOnly]

    def get_queryset(self):
        qs = Village.objects.all()
        local_body = self.request.query_params.get("local_body")
        if local_body:
            qs = qs.filter(local_body_id=local_body)
        return qs


class AreaViewSet(viewsets.ModelViewSet):
    """Areas, filterable by ?ward=."""

    serializer_class = AreaSerializer
    permission_classes = [IsStaffWriteOrReadOnly]

    def get_queryset(self):
        qs = Area.objects.all()
        ward = self.request.query_params.get("ward")
        if ward:
            qs = qs.filter(ward_id=ward)
        return qs
