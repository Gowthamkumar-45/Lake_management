from rest_framework import viewsets, filters, status
from collections import defaultdict
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from django.db.models import Count, Q
from django.contrib.auth import authenticate
from django.utils import timezone
from datetime import date
from .models import District, Taluk, LocalBody, Village, WaterBody, WorkEntry, Photo, OfficerProfile, MaintenanceSchedule, WorkforceEntry, MachineEntry, FundEntry, WaterLevelRecord, WaterBodyAssignment, Notification, AuditLog, InflowSource, OutflowSource
from .serializers import (
    DistrictSerializer, TalukSerializer, LocalBodySerializer, VillageSerializer,
    WaterBodyListSerializer, WaterBodyDetailSerializer,
    WorkEntrySerializer, PhotoSerializer, OfficerProfileSerializer,
    MaintenanceScheduleSerializer, WorkforceEntrySerializer, MachineEntrySerializer, FundEntrySerializer,
    WaterLevelRecordSerializer, WaterBodyAssignmentSerializer, NotificationSerializer, AuditLogSerializer,
    InflowSourceSerializer, OutflowSourceSerializer,
)


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    username = request.data.get('username')
    password = request.data.get('password')
    user = authenticate(request, username=username, password=password)
    if not user:
        return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

    token, _ = Token.objects.get_or_create(user=user)
    profile = getattr(user, 'profile', None)

    role = profile.role if profile else 'admin'
    taluk_name = profile.taluk.name if (profile and profile.taluk) else None

    # Build nav permissions per role
    NAV = {
        'admin':   ['/', '/explore', '/map', '/water-bodies', '/maintenance', '/field', '/reports', '/master-data', '/users'],
        'taluk':   ['/', '/explore', '/map', '/water-bodies', '/maintenance', '/field', '/reports'],
        'field':   ['/field'],
        'auditor': ['/', '/water-bodies', '/reports'],
    }

    return Response({
        'token': token.key,
        'id': user.id,
        'name': user.get_full_name() or user.username,
        'role': role,
        'init': profile.initials if profile else user.username[:2].upper(),
        'short': profile.designation if profile else 'Officer',
        'sub': (taluk_name + ' Taluk') if taluk_name else 'Ramnad HQ',
        'scope': taluk_name,
        'nav': NAV.get(role, ['/']),
        'canExport': role in ('admin', 'auditor'),
    })


@api_view(['POST'])
def logout_view(request):
    if request.auth:
        request.auth.delete()
    return Response({'ok': True})


@api_view(['GET'])
def me_view(request):
    user = request.user
    profile = getattr(user, 'profile', None)
    role = profile.role if profile else 'admin'
    taluk_name = profile.taluk.name if (profile and profile.taluk) else None
    NAV = {
        'admin':   ['/', '/explore', '/map', '/water-bodies', '/maintenance', '/field', '/reports', '/master-data', '/users'],
        'taluk':   ['/', '/explore', '/map', '/water-bodies', '/maintenance', '/field', '/reports'],
        'field':   ['/field'],
        'auditor': ['/', '/water-bodies', '/reports'],
    }
    return Response({
        'id': user.id,
        'name': user.get_full_name() or user.username,
        'role': role,
        'init': profile.initials if profile else user.username[:2].upper(),
        'short': profile.designation if profile else 'Officer',
        'sub': (taluk_name + ' Taluk') if taluk_name else 'Ramnad HQ',
        'scope': taluk_name,
        'nav': NAV.get(role, ['/']),
        'canExport': role in ('admin', 'auditor'),
    })


@api_view(['GET'])
def stats_view(request):
    today = date.today()
    qs = WaterBody.objects.all()

    total = qs.count()
    full = qs.filter(status='Full').count()
    medium = qs.filter(status='Medium').count()
    dry = qs.filter(status='Dry').count()

    active_maint = WorkEntry.objects.filter(status='In Progress').count()
    completed = WorkEntry.objects.filter(status='Completed').count()
    pending = WorkEntry.objects.filter(status='Pending').count()

    due_alerts = MaintenanceSchedule.objects.filter(
        scheduled_date__lte=today, status__in=('Scheduled', 'Overdue')
    ).count()

    under_reno = qs.filter(reno_status='Under Renovation').count()
    complete_reno = qs.filter(reno_status='Renovation Complete').count()
    pending_reno = qs.filter(reno_status='Renovation Pending').count()
    encroachment = qs.filter(reno_status='Encroachment').count()
    disappeared = qs.filter(reno_status='Disappeared').count()

    # Taluk-wise
    taluk_stats = []
    for taluk in Taluk.objects.all():
        tqs = qs.filter(taluk=taluk)
        taluk_stats.append({
            'name': taluk.name,
            'total': tqs.count(),
            'full': tqs.filter(status='Full').count(),
            'medium': tqs.filter(status='Medium').count(),
            'dry': tqs.filter(status='Dry').count(),
        })

    # Type distribution
    type_dist = []
    for wb_type, label in WaterBody.TYPE_CHOICES:
        type_dist.append({'type': label, 'count': qs.filter(wb_type=wb_type).count()})

    # Monthly work completions for current year
    current_year = date.today().year
    monthly_completions = defaultdict(int)
    monthly_inspections = defaultdict(int)
    for we in WorkEntry.objects.filter(start_date__year=current_year):
        m = we.start_date.month
        if we.status == 'Completed':
            monthly_completions[m] += 1
        if we.work_type == 'Inspection':
            monthly_inspections[m] += 1
    monthly_data = [
        {'month': m, 'completions': monthly_completions.get(m, 0), 'inspections': monthly_inspections.get(m, 0)}
        for m in range(1, 13)
    ]

    # Taluk-wise water level average
    taluk_water = []
    for taluk in Taluk.objects.all():
        tqs = qs.filter(taluk=taluk)
        levels = list(tqs.values_list('water_level', flat=True))
        avg = round(sum(levels) / len(levels)) if levels else 0
        taluk_water.append({'name': taluk.name, 'avg_level': avg, 'total': len(levels)})

    return Response({
        'total': total,
        'active_maintenance': active_maint,
        'completed_works': completed,
        'pending_works': pending,
        'due_alerts': due_alerts,
        'status': {'full': full, 'medium': medium, 'dry': dry},
        'renovation': {
            'under': under_reno,
            'complete': complete_reno,
            'pending': pending_reno,
            'encroachment': encroachment,
            'disappeared': disappeared,
        },
        'taluk_stats': taluk_stats,
        'taluk_water': taluk_water,
        'type_dist': type_dist,
        'monthly_data': monthly_data,
    })


@api_view(['GET'])
def recent_updates_view(request):
    entries = WorkEntry.objects.select_related(
        'water_body', 'water_body__taluk'
    ).order_by('-created_at')[:10]
    data = []
    for e in entries:
        data.append({
            'id': e.id,
            'officer': e.officer or 'Field Officer',
            'action': e.title,
            'body': e.water_body.name,
            'taluk': e.water_body.taluk.name if e.water_body.taluk else '',
            'time': e.created_at.strftime('%-d %b'),
            'status': e.status,
        })
    return Response(data)


class DistrictViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = District.objects.all()
    serializer_class = DistrictSerializer


class TalukViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Taluk.objects.select_related('district').all()
    serializer_class = TalukSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['name']


class LocalBodyViewSet(viewsets.ModelViewSet):
    queryset = LocalBody.objects.select_related('taluk').prefetch_related('villages', 'children__villages').all()
    serializer_class = LocalBodySerializer

    def get_queryset(self):
        qs = super().get_queryset()
        taluk = self.request.query_params.get('taluk')
        if taluk:
            qs = qs.filter(taluk__name=taluk)
        lb_type = self.request.query_params.get('type')
        if lb_type:
            qs = qs.filter(lb_type=lb_type)
        return qs


class VillageViewSet(viewsets.ModelViewSet):
    queryset = Village.objects.select_related('panchayat__taluk').all()
    serializer_class = VillageSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        panchayat = self.request.query_params.get('panchayat')
        if panchayat:
            qs = qs.filter(panchayat_id=panchayat)
        return qs


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def geo_hierarchy_view(request):
    """Returns hierarchy: Division → {Taluks (revenue), Blocks (panchayat union)} → Panchayat → Village"""
    district = District.objects.first()
    taluks = Taluk.objects.select_related('district').prefetch_related(
        'local_bodies__villages',
        'local_bodies__children__villages',
    ).all().order_by('division', 'name')

    def build_panchayat(lb):
        return {
            'id': lb.id,
            'name': lb.name,
            'type': lb.lb_type,
            'villages': [{'id': v.id, 'name': v.name} for v in lb.villages.all().order_by('name')],
        }

    divisions = {}
    for taluk in taluks:
        div = taluk.division or 'Unassigned'
        if div not in divisions:
            divisions[div] = {'taluks': [], 'blocks': []}

        # Taluks — only their direct panchayats (no blocks)
        panchayats = [
            build_panchayat(lb)
            for lb in taluk.local_bodies.filter(parent__isnull=True).exclude(lb_type='Block').order_by('name')
        ]
        divisions[div]['taluks'].append({
            'id': taluk.id,
            'name': taluk.name,
            'wb_count': taluk.water_bodies.count(),
            'panchayats': panchayats,
        })

        # Blocks — lifted to division level, separate from taluks
        for lb in taluk.local_bodies.filter(lb_type='Block', parent__isnull=True).order_by('name'):
            divisions[div]['blocks'].append({
                'id': lb.id,
                'name': lb.name,
                'taluk_id': taluk.id,
                'taluk_name': taluk.name,
                'panchayats': [build_panchayat(child) for child in lb.children.all().order_by('name')],
                'villages': [{'id': v.id, 'name': v.name} for v in lb.villages.all().order_by('name')],
            })

    return Response({
        'district': district.name if district else 'Ramanathapuram',
        'divisions': [
            {'name': k, 'taluks': v['taluks'], 'blocks': v['blocks']}
            for k, v in sorted(divisions.items())
        ],
    })


class WaterBodyViewSet(viewsets.ModelViewSet):
    queryset = WaterBody.objects.select_related('taluk').all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['wb_id', 'name', 'village', 'taluk__name']
    ordering_fields = ['wb_id', 'name', 'status', 'water_level', 'last_inspection']
    ordering = ['wb_id']

    def get_serializer_class(self):
        if self.action in ('retrieve', 'update', 'partial_update'):
            return WaterBodyDetailSerializer
        return WaterBodyListSerializer

    def perform_create(self, serializer):
        wb_id = self.request.data.get('wb_id', '').strip()
        if not wb_id:
            taluk_id = self.request.data.get('taluk')
            try:
                taluk = Taluk.objects.get(id=taluk_id)
                prefix = taluk.name[:3].upper()
            except Exception:
                prefix = 'GEN'
            count = WaterBody.objects.filter(wb_id__startswith=f'WB-{prefix}-').count()
            wb_id = f'WB-{prefix}-{str(count + 1).zfill(4)}'
            while WaterBody.objects.filter(wb_id=wb_id).exists():
                count += 1
                wb_id = f'WB-{prefix}-{str(count + 1).zfill(4)}'
        serializer.save(wb_id=wb_id)

    def get_queryset(self):
        qs = super().get_queryset()
        status_filter = self.request.query_params.get('status')
        wb_type = self.request.query_params.get('type')
        taluk = self.request.query_params.get('taluk')
        work_status = self.request.query_params.get('work_status')
        reno_status = self.request.query_params.get('reno_status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        if wb_type:
            qs = qs.filter(wb_type=wb_type)
        if taluk:
            qs = qs.filter(taluk__name=taluk)
        if work_status:
            qs = qs.filter(work_status=work_status)
        if reno_status:
            qs = qs.filter(reno_status=reno_status)
        return qs


class WorkEntryViewSet(viewsets.ModelViewSet):
    queryset = WorkEntry.objects.select_related('water_body').all()
    serializer_class = WorkEntrySerializer

    def get_queryset(self):
        qs = super().get_queryset()
        wb = self.request.query_params.get('water_body')
        if wb:
            qs = qs.filter(water_body_id=wb)
        return qs


class PhotoViewSet(viewsets.ModelViewSet):
    queryset = Photo.objects.all()
    serializer_class = PhotoSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        wb = self.request.query_params.get('water_body')
        if wb:
            qs = qs.filter(water_body_id=wb)
        return qs


class OfficerProfileViewSet(viewsets.ModelViewSet):
    queryset = OfficerProfile.objects.select_related('user', 'taluk').all()
    serializer_class = OfficerProfileSerializer


class WorkforceEntryViewSet(viewsets.ModelViewSet):
    queryset = WorkforceEntry.objects.all()
    serializer_class = WorkforceEntrySerializer

    def get_queryset(self):
        qs = super().get_queryset()
        wb = self.request.query_params.get('water_body')
        if wb:
            qs = qs.filter(water_body_id=wb)
        return qs


class MachineEntryViewSet(viewsets.ModelViewSet):
    queryset = MachineEntry.objects.all()
    serializer_class = MachineEntrySerializer

    def get_queryset(self):
        qs = super().get_queryset()
        wb = self.request.query_params.get('water_body')
        if wb:
            qs = qs.filter(water_body_id=wb)
        return qs


class FundEntryViewSet(viewsets.ModelViewSet):
    queryset = FundEntry.objects.all()
    serializer_class = FundEntrySerializer

    def get_queryset(self):
        qs = super().get_queryset()
        wb = self.request.query_params.get('water_body')
        if wb:
            qs = qs.filter(water_body_id=wb)
        return qs


class WaterLevelRecordViewSet(viewsets.ModelViewSet):
    queryset = WaterLevelRecord.objects.all()
    serializer_class = WaterLevelRecordSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        wb = self.request.query_params.get('water_body')
        if wb:
            qs = qs.filter(water_body_id=wb)
        return qs


class WaterBodyAssignmentViewSet(viewsets.ModelViewSet):
    queryset = WaterBodyAssignment.objects.select_related('water_body', 'officer__user').all()
    serializer_class = WaterBodyAssignmentSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        officer = self.request.query_params.get('officer')
        wb = self.request.query_params.get('water_body')
        active = self.request.query_params.get('active')
        if officer:
            qs = qs.filter(officer_id=officer)
        if wb:
            qs = qs.filter(water_body_id=wb)
        if active == 'true':
            qs = qs.filter(is_active=True)
        return qs


class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({'ok': True})

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        notif = self.get_object()
        notif.is_read = True
        notif.save()
        return Response({'ok': True})


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.select_related('user').all()
    serializer_class = AuditLogSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        model = self.request.query_params.get('model')
        obj_id = self.request.query_params.get('object_id')
        if model:
            qs = qs.filter(model_name=model)
        if obj_id:
            qs = qs.filter(object_id=obj_id)
        return qs[:100]


class MaintenanceScheduleViewSet(viewsets.ModelViewSet):
    queryset = MaintenanceSchedule.objects.select_related('water_body', 'water_body__taluk').all()
    serializer_class = MaintenanceScheduleSerializer
    filter_backends = [filters.OrderingFilter]
    ordering = ['scheduled_date']

    def get_queryset(self):
        qs = super().get_queryset()
        status_filter = self.request.query_params.get('status')
        taluk = self.request.query_params.get('taluk')
        if status_filter:
            qs = qs.filter(status=status_filter)
        if taluk:
            qs = qs.filter(water_body__taluk__name=taluk)
        return qs


class InflowSourceViewSet(viewsets.ModelViewSet):
    queryset = InflowSource.objects.select_related('water_body').all()
    serializer_class = InflowSourceSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        wb = self.request.query_params.get('water_body')
        if wb:
            qs = qs.filter(water_body_id=wb)
        return qs


class OutflowSourceViewSet(viewsets.ModelViewSet):
    queryset = OutflowSource.objects.select_related('water_body').all()
    serializer_class = OutflowSourceSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        wb = self.request.query_params.get('water_body')
        if wb:
            qs = qs.filter(water_body_id=wb)
        return qs
