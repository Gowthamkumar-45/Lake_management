from rest_framework import serializers

from .models import Equipment, FundEntry, RenovationStage, StagePhoto, Worker


class StagePhotoSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    uploaded_by_name = serializers.CharField(
        source="uploaded_by.username", read_only=True
    )

    class Meta:
        model = StagePhoto
        fields = [
            "id",
            "stage",
            "image",
            "image_url",
            "caption",
            "latitude",
            "longitude",
            "taken_at",
            "uploaded_by",
            "uploaded_by_name",
            "uploaded_at",
        ]
        read_only_fields = ["uploaded_by", "uploaded_at"]
        extra_kwargs = {"image": {"write_only": True}}

    def get_image_url(self, obj):
        request = self.context.get("request")
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        return obj.image.url if obj.image else None


class RenovationStageSerializer(serializers.ModelSerializer):
    photos = StagePhotoSerializer(many=True, read_only=True)
    photo_count = serializers.IntegerField(read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = RenovationStage
        fields = [
            "id",
            "water_body",
            "order",
            "title",
            "description",
            "status",
            "status_display",
            "pending_reason",
            "start_date",
            "end_date",
            "photos",
            "photo_count",
            "updated_by",
            "updated_at",
        ]
        read_only_fields = ["updated_by", "updated_at"]

    def validate(self, attrs):
        status = attrs.get("status", getattr(self.instance, "status", None))
        # A stage cannot be marked COMPLETED without at least one geo-photo.
        if status == RenovationStage.StageStatus.COMPLETED and self.instance:
            if self.instance.photos.count() == 0:
                raise serializers.ValidationError(
                    "Upload at least one geo-tagged photo before completing this stage."
                )
        pending_reason = attrs.get(
            "pending_reason", getattr(self.instance, "pending_reason", "")
        )
        if status == RenovationStage.StageStatus.PENDING and not pending_reason:
            raise serializers.ValidationError(
                {"pending_reason": "A reason is required when a stage is pending."}
            )
        return attrs


class WorkerSerializer(serializers.ModelSerializer):
    gender_display = serializers.CharField(source="get_gender_display", read_only=True)

    class Meta:
        model = Worker
        fields = [
            "id",
            "water_body",
            "name",
            "gender",
            "gender_display",
            "designation",
            "count",
        ]


class EquipmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Equipment
        fields = ["id", "water_body", "name", "quantity", "notes"]


class FundEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = FundEntry
        fields = [
            "id",
            "water_body",
            "purpose",
            "amount",
            "spent_on",
            "recorded_by",
            "created_at",
        ]
        read_only_fields = ["recorded_by", "created_at"]
