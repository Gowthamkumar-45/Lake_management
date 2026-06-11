from rest_framework import viewsets
from rest_framework.parsers import FormParser, MultiPartParser

from .models import Equipment, FundEntry, RenovationStage, StagePhoto, Worker
from .serializers import (
    EquipmentSerializer,
    FundEntrySerializer,
    RenovationStageSerializer,
    StagePhotoSerializer,
    WorkerSerializer,
)


def _filter_by_water_body(qs, request):
    water_body = request.query_params.get("water_body")
    if water_body:
        qs = qs.filter(water_body_id=water_body)
    return qs


class RenovationStageViewSet(viewsets.ModelViewSet):
    serializer_class = RenovationStageSerializer

    def get_queryset(self):
        qs = RenovationStage.objects.prefetch_related("photos").all()
        return _filter_by_water_body(qs, self.request)

    def perform_create(self, serializer):
        serializer.save(updated_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)


class StagePhotoViewSet(viewsets.ModelViewSet):
    serializer_class = StagePhotoSerializer
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        qs = StagePhoto.objects.all()
        stage = self.request.query_params.get("stage")
        if stage:
            qs = qs.filter(stage_id=stage)
        return qs

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)


class WorkerViewSet(viewsets.ModelViewSet):
    serializer_class = WorkerSerializer

    def get_queryset(self):
        return _filter_by_water_body(Worker.objects.all(), self.request)


class EquipmentViewSet(viewsets.ModelViewSet):
    serializer_class = EquipmentSerializer

    def get_queryset(self):
        return _filter_by_water_body(Equipment.objects.all(), self.request)


class FundEntryViewSet(viewsets.ModelViewSet):
    serializer_class = FundEntrySerializer

    def get_queryset(self):
        return _filter_by_water_body(FundEntry.objects.all(), self.request)

    def perform_create(self, serializer):
        serializer.save(recorded_by=self.request.user)
