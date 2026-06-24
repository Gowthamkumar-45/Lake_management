from rest_framework import serializers
from .models import District, Taluk, LocalBody, Village, WaterBody, WorkEntry, Photo, OfficerProfile, MaintenanceSchedule, WorkforceEntry, MachineEntry, FundEntry, WaterLevelRecord, WaterBodyAssignment, Notification, AuditLog, InflowSource, OutflowSource


class DistrictSerializer(serializers.ModelSerializer):
    class Meta:
        model = District
        fields = '__all__'


class TalukSerializer(serializers.ModelSerializer):
    district_name = serializers.CharField(source='district.name', read_only=True)

    class Meta:
        model = Taluk
        fields = '__all__'


class VillageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Village
        fields = '__all__'


class PanchayatSerializer(serializers.ModelSerializer):
    villages = VillageSerializer(many=True, read_only=True)

    class Meta:
        model = LocalBody
        fields = ['id', 'name', 'lb_type', 'parent', 'villages']


class LocalBodySerializer(serializers.ModelSerializer):
    taluk_name = serializers.CharField(source='taluk.name', read_only=True)
    villages = VillageSerializer(many=True, read_only=True)
    children = PanchayatSerializer(many=True, read_only=True)

    class Meta:
        model = LocalBody
        fields = '__all__'


class WorkEntrySerializer(serializers.ModelSerializer):
    water_body_name = serializers.CharField(source='water_body.name', read_only=True)
    water_body_wb_id = serializers.CharField(source='water_body.wb_id', read_only=True)
    water_body_survey_number = serializers.CharField(source='water_body.survey_number', read_only=True)
    taluk_name = serializers.CharField(source='water_body.taluk.name', read_only=True)

    class Meta:
        model = WorkEntry
        fields = '__all__'


class PhotoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Photo
        fields = '__all__'


class WaterBodyListSerializer(serializers.ModelSerializer):
    taluk_name = serializers.CharField(source='taluk.name', read_only=True)
    wb_id = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = WaterBody
        fields = [
            'id', 'wb_id', 'name', 'wb_type', 'taluk', 'taluk_name',
            'village', 'status', 'water_level', 'area', 'survey_number', 'address',
            'last_inspection', 'next_inspection', 'work_status', 'reno_status',
            'latitude', 'longitude',
        ]


class WaterBodyDetailSerializer(serializers.ModelSerializer):
    taluk_name = serializers.CharField(source='taluk.name', read_only=True)
    work_entries = WorkEntrySerializer(many=True, read_only=True)
    photos = PhotoSerializer(many=True, read_only=True)

    class Meta:
        model = WaterBody
        fields = '__all__'


class OfficerProfileSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    email = serializers.EmailField(source='user.email', read_only=True)
    taluk_name = serializers.CharField(source='taluk.name', read_only=True)

    class Meta:
        model = OfficerProfile
        fields = ['id', 'name', 'email', 'role', 'taluk', 'taluk_name', 'phone', 'designation', 'status', 'initials']

    def get_name(self, obj):
        return obj.user.get_full_name() or obj.user.username


class WorkforceEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkforceEntry
        fields = '__all__'


class MachineEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = MachineEntry
        fields = '__all__'


class FundEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = FundEntry
        fields = '__all__'


class WaterLevelRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = WaterLevelRecord
        fields = '__all__'


class WaterBodyAssignmentSerializer(serializers.ModelSerializer):
    officer_name = serializers.SerializerMethodField()
    water_body_name = serializers.CharField(source='water_body.name', read_only=True)
    water_body_wb_id = serializers.CharField(source='water_body.wb_id', read_only=True)

    class Meta:
        model = WaterBodyAssignment
        fields = '__all__'

    def get_officer_name(self, obj):
        return obj.officer.user.get_full_name() or obj.officer.user.username


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'


class AuditLogSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = AuditLog
        fields = '__all__'


class InflowSourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = InflowSource
        fields = '__all__'


class OutflowSourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = OutflowSource
        fields = '__all__'


class MaintenanceScheduleSerializer(serializers.ModelSerializer):
    water_body_name = serializers.CharField(source='water_body.name', read_only=True)
    water_body_id = serializers.CharField(source='water_body.wb_id', read_only=True)
    taluk_name = serializers.CharField(source='water_body.taluk.name', read_only=True)

    class Meta:
        model = MaintenanceSchedule
        fields = '__all__'
