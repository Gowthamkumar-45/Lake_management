from rest_framework import serializers

from .models import Area, District, LocalBody, Village, Ward


class DistrictSerializer(serializers.ModelSerializer):
    class Meta:
        model = District
        fields = ["id", "name", "code", "latitude", "longitude"]


class LocalBodySerializer(serializers.ModelSerializer):
    body_type_display = serializers.CharField(
        source="get_body_type_display", read_only=True
    )
    uses_wards = serializers.BooleanField(read_only=True)
    district_name = serializers.CharField(source="district.name", read_only=True)

    class Meta:
        model = LocalBody
        fields = [
            "id",
            "district",
            "district_name",
            "body_type",
            "body_type_display",
            "uses_wards",
            "name",
            "latitude",
            "longitude",
            "boundary_geojson",
        ]


class WardSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ward
        fields = ["id", "local_body", "name", "number"]


class VillageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Village
        fields = ["id", "local_body", "name"]


class AreaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Area
        fields = ["id", "ward", "name"]
