from rest_framework import serializers

from .models import WaterBody


class WaterBodyListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for lists and map markers."""

    kind_display = serializers.CharField(source="get_kind_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    local_body_name = serializers.CharField(source="local_body.name", read_only=True)

    class Meta:
        model = WaterBody
        fields = [
            "id",
            "name",
            "kind",
            "kind_display",
            "status",
            "status_display",
            "latitude",
            "longitude",
            "local_body",
            "local_body_name",
            "ward",
            "area",
            "village",
        ]


class WaterBodySerializer(serializers.ModelSerializer):
    kind_display = serializers.CharField(source="get_kind_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    water_source_display = serializers.CharField(
        source="get_water_source_display", read_only=True
    )
    revived_by_display = serializers.CharField(
        source="get_revived_by_display", read_only=True
    )
    local_body_name = serializers.CharField(source="local_body.name", read_only=True)
    ward_name = serializers.CharField(source="ward.name", read_only=True)
    area_name = serializers.CharField(source="area.name", read_only=True)
    village_name = serializers.CharField(source="village.name", read_only=True)
    incharge_display = serializers.SerializerMethodField()

    class Meta:
        model = WaterBody
        fields = [
            "id",
            "name",
            "kind",
            "kind_display",
            "local_body",
            "local_body_name",
            "ward",
            "ward_name",
            "area",
            "area_name",
            "village",
            "village_name",
            "latitude",
            "longitude",
            "boundary_geojson",
            "status",
            "status_display",
            "pending_reason",
            "water_source",
            "water_source_display",
            "capacity_litres",
            "area_acres",
            "revived_by",
            "revived_by_display",
            "revived_by_name",
            "incharge",
            "incharge_name",
            "incharge_contact",
            "incharge_display",
            "total_funds_used",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["total_funds_used", "created_at", "updated_at"]

    def get_incharge_display(self, obj):
        if obj.incharge:
            full = obj.incharge.get_full_name() or obj.incharge.username
            return full
        return obj.incharge_name or ""

    def validate(self, attrs):
        status = attrs.get("status", getattr(self.instance, "status", None))
        pending_reason = attrs.get(
            "pending_reason", getattr(self.instance, "pending_reason", "")
        )
        if status == WaterBody.Status.RENOVATION_PENDING and not pending_reason:
            raise serializers.ValidationError(
                {"pending_reason": "A reason is required when status is Renovation Pending."}
            )
        return attrs
