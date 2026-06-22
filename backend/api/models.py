from django.db import models
from django.contrib.auth.models import User


class District(models.Model):
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name


class Taluk(models.Model):
    district = models.ForeignKey(District, on_delete=models.CASCADE, related_name='taluks')
    name = models.CharField(max_length=100)

    class Meta:
        unique_together = ('district', 'name')

    def __str__(self):
        return self.name


class LocalBody(models.Model):
    LB_TYPES = [
        ('Municipality', 'Municipality'),
        ('Town Panchayat', 'Town Panchayat'),
        ('Panchayat', 'Panchayat'),
    ]
    taluk = models.ForeignKey(Taluk, on_delete=models.CASCADE, related_name='local_bodies')
    name = models.CharField(max_length=100)
    lb_type = models.CharField(max_length=30, choices=LB_TYPES)

    def __str__(self):
        return self.name


class WaterBody(models.Model):
    TYPE_CHOICES = [
        ('Lake', 'Lake'),
        ('Pond', 'Pond'),
        ('Canal', 'Canal'),
        ('River', 'River'),
        ('Kanmai', 'Kanmai'),
    ]
    STATUS_CHOICES = [
        ('Full', 'Full'),
        ('Medium', 'Medium'),
        ('Dry', 'Dry'),
    ]
    WORK_STATUS_CHOICES = [
        ('Completed', 'Completed'),
        ('In Progress', 'In Progress'),
        ('Pending', 'Pending'),
        ('Delayed', 'Delayed'),
    ]
    RENO_STATUS_CHOICES = [
        ('Under Renovation', 'Under Renovation'),
        ('Renovation Complete', 'Renovation Complete'),
        ('Renovation Pending', 'Renovation Pending'),
        ('Encroachment', 'Encroachment'),
        ('Disappeared', 'Disappeared'),
    ]

    wb_id = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=200)
    wb_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    taluk = models.ForeignKey(Taluk, on_delete=models.SET_NULL, null=True, related_name='water_bodies')
    village = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='Medium')
    water_level = models.IntegerField(default=50, help_text='Water level as percentage')
    area = models.CharField(max_length=30, blank=True)
    last_inspection = models.DateField(null=True, blank=True)
    next_inspection = models.DateField(null=True, blank=True)
    work_status = models.CharField(max_length=20, choices=WORK_STATUS_CHOICES, default='Pending')
    reno_status = models.CharField(max_length=30, choices=RENO_STATUS_CHOICES, default='Renovation Pending')
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    notes = models.TextField(blank=True)
    # Water source info
    inflow_sources = models.TextField(blank=True, help_text='Comma-separated inflow sources')
    outflow_details = models.TextField(blank=True, help_text='Outflow destinations and type')
    catchment_area = models.CharField(max_length=50, blank=True, help_text='Catchment area in sq.km')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.wb_id} - {self.name}"


class WorkEntry(models.Model):
    STATUS_CHOICES = [
        ('Completed', 'Completed'),
        ('In Progress', 'In Progress'),
        ('Pending', 'Pending'),
        ('Delayed', 'Delayed'),
    ]
    water_body = models.ForeignKey(WaterBody, on_delete=models.CASCADE, related_name='work_entries')
    work_type = models.CharField(max_length=100)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    start_date = models.DateField()
    completion_date = models.DateField(null=True, blank=True)
    progress = models.IntegerField(default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending')
    officer = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.water_body.wb_id} - {self.title}"


class Photo(models.Model):
    PHASE_CHOICES = [
        ('before', 'Before'),
        ('during', 'During'),
        ('after', 'After'),
    ]
    water_body = models.ForeignKey(WaterBody, on_delete=models.CASCADE, related_name='photos')
    work_entry = models.ForeignKey(WorkEntry, on_delete=models.SET_NULL, null=True, blank=True, related_name='photos')
    image = models.ImageField(upload_to='water_bodies/photos/')
    phase = models.CharField(max_length=10, choices=PHASE_CHOICES)
    caption = models.CharField(max_length=200, blank=True)
    taken_at = models.DateTimeField(auto_now_add=True)
    officer = models.CharField(max_length=100, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

    def __str__(self):
        return f"{self.water_body.wb_id} - {self.phase} photo"


class OfficerProfile(models.Model):
    ROLE_CHOICES = [
        ('admin', 'District Administrator'),
        ('taluk', 'Taluk Officer'),
        ('field', 'Field Officer'),
        ('auditor', 'Auditor'),
    ]
    STATUS_CHOICES = [
        ('Active', 'Active'),
        ('On leave', 'On leave'),
        ('Inactive', 'Inactive'),
    ]
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=10, choices=ROLE_CHOICES)
    taluk = models.ForeignKey(Taluk, on_delete=models.SET_NULL, null=True, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    designation = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='Active')
    initials = models.CharField(max_length=3, blank=True)

    def __str__(self):
        return f"{self.user.get_full_name()} ({self.role})"


class WorkforceEntry(models.Model):
    water_body = models.ForeignKey(WaterBody, on_delete=models.CASCADE, related_name='workforce_entries')
    role = models.CharField(max_length=100)
    count = models.IntegerField(default=0)
    gender = models.CharField(max_length=10, choices=[('male','Male'),('female','Female'),('mixed','Mixed')], default='mixed')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.water_body.wb_id} - {self.role} ({self.count})"


class MachineEntry(models.Model):
    water_body = models.ForeignKey(WaterBody, on_delete=models.CASCADE, related_name='machine_entries')
    name = models.CharField(max_length=200)
    qty = models.IntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.water_body.wb_id} - {self.name} x{self.qty}"


class FundEntry(models.Model):
    water_body = models.ForeignKey(WaterBody, on_delete=models.CASCADE, related_name='fund_entries')
    label = models.CharField(max_length=200)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.water_body.wb_id} - {self.label} ₹{self.amount}L"


class WaterLevelRecord(models.Model):
    water_body = models.ForeignKey(WaterBody, on_delete=models.CASCADE, related_name='level_history')
    level = models.IntegerField(help_text='Water level percentage')
    status = models.CharField(max_length=10, choices=WaterBody.STATUS_CHOICES)
    recorded_by = models.CharField(max_length=100, blank=True)
    recorded_at = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['recorded_at']

    def __str__(self):
        return f"{self.water_body.wb_id} - {self.level}% on {self.recorded_at}"


class WaterBodyAssignment(models.Model):
    water_body = models.ForeignKey(WaterBody, on_delete=models.CASCADE, related_name='assignments')
    officer = models.ForeignKey('OfficerProfile', on_delete=models.CASCADE, related_name='assignments')
    assigned_by = models.CharField(max_length=100, blank=True)
    assigned_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ('water_body', 'officer')

    def __str__(self):
        return f"{self.officer} → {self.water_body.wb_id}"


class Notification(models.Model):
    TYPE_CHOICES = [
        ('info', 'Info'), ('success', 'Success'), ('warning', 'Warning'), ('error', 'Error'),
    ]
    user = models.ForeignKey('auth.User', on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=200)
    message = models.TextField(blank=True)
    notif_type = models.CharField(max_length=10, choices=TYPE_CHOICES, default='info')
    is_read = models.BooleanField(default=False)
    related_model = models.CharField(max_length=50, blank=True)
    related_id = models.IntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.notif_type}] {self.title} → {self.user.username}"


class AuditLog(models.Model):
    user = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True, related_name='audit_logs')
    action = models.CharField(max_length=20)
    model_name = models.CharField(max_length=50)
    object_id = models.IntegerField(null=True, blank=True)
    object_repr = models.CharField(max_length=200, blank=True)
    changes = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user} {self.action} {self.model_name}#{self.object_id}"


class MaintenanceSchedule(models.Model):
    STATUS_CHOICES = [
        ('Scheduled', 'Scheduled'),
        ('In Progress', 'In Progress'),
        ('Completed', 'Completed'),
        ('Overdue', 'Overdue'),
    ]
    water_body = models.ForeignKey(WaterBody, on_delete=models.CASCADE, related_name='maintenance_schedules')
    title = models.CharField(max_length=200)
    scheduled_date = models.DateField()
    completed_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='Scheduled')
    officer = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.water_body.wb_id} - {self.title}"


class InflowSource(models.Model):
    SOURCE_TYPES = [
        ('catchment', 'Catchment'), ('canal', 'Canal connection'),
        ('river', 'River connection'), ('groundwater', 'Groundwater support'),
        ('sluice', 'Inlet sluice'), ('stream', 'Stream'), ('other', 'Other'),
    ]
    CONDITION_CHOICES = [
        ('good', 'Good'), ('moderate', 'Moderate'),
        ('needs_repair', 'Needs repair'), ('silted', 'Silted'),
    ]
    DIRECTION_CHOICES = [
        ('inflow', 'Inflow'), ('bidirectional', 'Bidirectional'), ('seasonal', 'Seasonal'),
    ]
    water_body = models.ForeignKey(WaterBody, on_delete=models.CASCADE, related_name='inflow_sources_set')
    name = models.CharField(max_length=200)
    source_type = models.CharField(max_length=30, choices=SOURCE_TYPES, default='other')
    direction = models.CharField(max_length=20, choices=DIRECTION_CHOICES, default='inflow')
    condition = models.CharField(max_length=20, choices=CONDITION_CHOICES, default='good')
    connected_to = models.CharField(max_length=300, blank=True)
    length_km = models.FloatField(null=True, blank=True)
    ayacut_acres = models.FloatField(null=True, blank=True)
    status = models.CharField(max_length=20, default='active')
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.water_body.wb_id} inflow: {self.name}"


class OutflowSource(models.Model):
    OUTLET_TYPES = [
        ('weir', 'Surplus weir'), ('canal', 'Irrigation canal'),
        ('sluice', 'Outlet sluice'), ('drain', 'Overflow drain'),
        ('supply', 'Water supply'), ('fisheries', 'Fisheries'),
        ('seepage', 'Seepage'), ('other', 'Other'),
    ]
    CONDITION_CHOICES = [
        ('good', 'Good'), ('moderate', 'Moderate'),
        ('needs_repair', 'Needs repair'), ('silted', 'Silted'),
    ]
    water_body = models.ForeignKey(WaterBody, on_delete=models.CASCADE, related_name='outflow_sources_set')
    name = models.CharField(max_length=200)
    outlet_type = models.CharField(max_length=30, choices=OUTLET_TYPES, default='other')
    condition = models.CharField(max_length=20, choices=CONDITION_CHOICES, default='good')
    connected_to = models.CharField(max_length=300, blank=True)
    length_km = models.FloatField(null=True, blank=True)
    ayacut_acres = models.FloatField(null=True, blank=True)
    status = models.CharField(max_length=20, default='active')
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.water_body.wb_id} outflow: {self.name}"
