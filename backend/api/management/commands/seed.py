"""
Management command: python manage.py seed
Creates district, taluks, local bodies, water bodies, officers, work entries, maintenance schedules.
"""
import random
from datetime import date, timedelta
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token
from api.models import District, Taluk, LocalBody, WaterBody, WorkEntry, OfficerProfile, MaintenanceSchedule


TALUKS = [
    'Ramanathapuram', 'Paramakudi', 'Tiruvadanai', 'Kamuthi',
    'Mudukulathur', 'Rajasingamangalam', 'Kadaladi', 'Mandapam',
]

LOCAL_BODIES = {
    'Ramanathapuram': [
        ('Ramanathapuram Municipality', 'Municipality'),
        ('Rameswaram Municipality', 'Municipality'),
        ('Pamban Town Panchayat', 'Town Panchayat'),
        ('Mandapam Town Panchayat', 'Town Panchayat'),
        ('Uchipuli Panchayat', 'Panchayat'),
        ('Keezhakkarai Panchayat', 'Panchayat'),
    ],
    'Paramakudi': [
        ('Paramakudi Municipality', 'Municipality'),
        ('Sayalkudi Town Panchayat', 'Town Panchayat'),
        ('Mudukulathur Town Panchayat', 'Town Panchayat'),
        ('Kamuthi Town Panchayat', 'Town Panchayat'),
        ('Sivaganga Panchayat', 'Panchayat'),
    ],
    'Tiruvadanai': [
        ('Tiruvadanai Town Panchayat', 'Town Panchayat'),
        ('Kilakarai Town Panchayat', 'Town Panchayat'),
        ('Ervadi Panchayat', 'Panchayat'),
        ('Devipattinam Panchayat', 'Panchayat'),
    ],
    'Kamuthi': [
        ('Kamuthi Town Panchayat', 'Town Panchayat'),
        ('Thiruppullani Panchayat', 'Panchayat'),
        ('Abiramam Panchayat', 'Panchayat'),
    ],
    'Mudukulathur': [
        ('Mudukulathur Town Panchayat', 'Town Panchayat'),
        ('Keeranur Panchayat', 'Panchayat'),
        ('Ilayankudi Panchayat', 'Panchayat'),
    ],
    'Rajasingamangalam': [
        ('Rajasingamangalam Panchayat', 'Panchayat'),
        ('Nainarkoil Panchayat', 'Panchayat'),
    ],
    'Kadaladi': [
        ('Kadaladi Panchayat', 'Panchayat'),
        ('Sattankulam Panchayat', 'Panchayat'),
    ],
    'Mandapam': [
        ('Mandapam Town Panchayat', 'Town Panchayat'),
        ('Rameswaram Panchayat', 'Panchayat'),
    ],
}

VILLAGES = {
    'Ramanathapuram': ['Ramanathapuram', 'Pamban', 'Rameswaram', 'Uchipuli', 'Keezhakkarai', 'Mandapam', 'Thiruvangundram', 'Thondi'],
    'Paramakudi': ['Paramakudi', 'Sayalkudi', 'Mudukulathur', 'Sattankulam', 'Ilayangudi', 'Keeranur', 'Perunali'],
    'Tiruvadanai': ['Tiruvadanai', 'Kilakarai', 'Ervadi', 'Devipattinam', 'Alagankulam', 'Muthupettai'],
    'Kamuthi': ['Kamuthi', 'Thiruppullani', 'Abiramam', 'Siruthoppu', 'Ramanathapuram Panchayat'],
    'Mudukulathur': ['Mudukulathur', 'Keeranur', 'Ilayankudi', 'Melur', 'Nambarai'],
    'Rajasingamangalam': ['Rajasingamangalam', 'Nainarkoil', 'Thiruvadanai South', 'Sembanarkoil'],
    'Kadaladi': ['Kadaladi', 'Sattankulam', 'Veeriyavan', 'Thambipuram'],
    'Mandapam': ['Mandapam', 'Rameswaram', 'Pamban North', 'Uchipuli South'],
}

WB_TYPES = ['Kanmai', 'Kanmai', 'Kanmai', 'Lake', 'Lake', 'Canal', 'Pond']
STATUSES = ['Full', 'Full', 'Medium', 'Medium', 'Medium', 'Dry']
WORK_STATUSES = ['Completed', 'Completed', 'In Progress', 'Pending', 'Pending', 'Delayed']
RENO_STATUSES = ['Under Renovation', 'Renovation Complete', 'Renovation Complete', 'Renovation Pending', 'Renovation Pending', 'Encroachment', 'Disappeared']

WORK_TYPES = ['Desilting', 'Bund Repair', 'Sluice Renovation', 'Canal Lining', 'Weed Removal', 'Inlet Repair', 'Outlet Repair']
WORK_NAMES = [
    'Desilting and deepening work',
    'Bund strengthening and repair',
    'Sluice gate renovation',
    'Canal lining and repair',
    'Aquatic weed removal',
    'Inlet channel repair',
    'Outlet channel restoration',
    'Embankment protection work',
]

OFFICERS = [
    ('M. Rajesh', 'AE', 'Ramanathapuram', 'MR', 'rajesh'),
    ('V. Anand', 'AE', 'Mandapam', 'VA', 'anand'),
    ('S. Devan', 'AEE', 'Kamuthi', 'SD', 'devan'),
    ('K. Suresh', 'AE', 'Paramakudi', 'KS', 'suresh'),
    ('P. Kumar', 'JE', 'Tiruvadanai', 'PK', 'kumar'),
    ('R. Priya', 'AEE', 'Mudukulathur', 'RP', 'priya'),
    ('T. Selvan', 'AE', 'Kadaladi', 'TS', 'selvan'),
    ('N. Velu', 'JE', 'Rajasingamangalam', 'NV', 'velu'),
]

MAINT_TITLES = [
    'Quarterly inspection',
    'Annual desilting inspection',
    'Pre-monsoon check',
    'Post-monsoon assessment',
    'Bund condition assessment',
    'Water quality check',
    'Sluice functionality test',
]


class Command(BaseCommand):
    help = 'Seed the database with Ramanathapuram WBMS data'

    def handle(self, *args, **options):
        self.stdout.write('Seeding database...')
        random.seed(42)

        # District
        district, _ = District.objects.get_or_create(name='Ramanathapuram')

        # Taluks
        taluk_objs = {}
        for tname in TALUKS:
            t, _ = Taluk.objects.get_or_create(district=district, name=tname)
            taluk_objs[tname] = t

        # Local bodies
        for tname, lbs in LOCAL_BODIES.items():
            for lb_name, lb_type in lbs:
                LocalBody.objects.get_or_create(
                    taluk=taluk_objs[tname], name=lb_name,
                    defaults={'lb_type': lb_type}
                )

        # Officers + Users
        # Superuser / admin
        if not User.objects.filter(username='admin').exists():
            admin_user = User.objects.create_superuser('admin', 'admin@wbms.tn.gov.in', 'admin123')
            admin_user.first_name = 'S.'
            admin_user.last_name = 'Karthikeyan'
            admin_user.save()
            OfficerProfile.objects.create(
                user=admin_user, role='admin', designation='District Admin',
                initials='SK', phone='9444000001', status='Active'
            )
            Token.objects.get_or_create(user=admin_user)

        # Auditor
        if not User.objects.filter(username='auditor').exists():
            aud_user = User.objects.create_user('auditor', 'auditor@wbms.tn.gov.in', 'audit123')
            aud_user.first_name = 'G.'
            aud_user.last_name = 'Natarajan'
            aud_user.save()
            OfficerProfile.objects.create(
                user=aud_user, role='auditor', designation='Dist. Auditor',
                initials='GN', phone='9444000009', status='Active'
            )
            Token.objects.get_or_create(user=aud_user)

        # Field + taluk officers
        for name, desig, taluk_name, initials, uname in OFFICERS:
            if not User.objects.filter(username=uname).exists():
                parts = name.split('. ', 1)
                u = User.objects.create_user(uname, f'{uname}@wbms.tn.gov.in', 'officer123')
                u.first_name = parts[0] + '.'
                u.last_name = parts[1] if len(parts) > 1 else ''
                u.save()
                role = 'taluk' if desig in ('AEE', 'AE') else 'field'
                OfficerProfile.objects.create(
                    user=u, role=role, taluk=taluk_objs.get(taluk_name),
                    designation=desig, initials=initials, phone='944400000' + str(random.randint(1, 9)), status='Active'
                )
                Token.objects.get_or_create(user=u)

        # Water bodies — generate ~1284 spread across taluks
        TALUK_COUNTS = {
            'Ramanathapuram': 214, 'Paramakudi': 198, 'Tiruvadanai': 176,
            'Mudukulathur': 152, 'Kamuthi': 141, 'Mandapam': 118,
            'Kadaladi': 148, 'Rajasingamangalam': 137,
        }
        existing_ids = set(WaterBody.objects.values_list('wb_id', flat=True))
        wb_counter = {t: 1 for t in TALUKS}
        today = date.today()

        for tname, count in TALUK_COUNTS.items():
            villages = VILLAGES[tname]
            taluk = taluk_objs[tname]
            for i in range(count):
                wb_id = f"WB-{tname[:3].upper()}-{wb_counter[tname]:04d}"
                wb_counter[tname] += 1
                if wb_id in existing_ids:
                    continue
                village = villages[i % len(villages)]
                wb_type = WB_TYPES[i % len(WB_TYPES)]
                status = random.choice(STATUSES)
                water_level = {'Full': random.randint(75, 100), 'Medium': random.randint(35, 74), 'Dry': random.randint(0, 34)}[status]
                work_status = random.choice(WORK_STATUSES)
                reno_status = random.choice(RENO_STATUSES)
                last_insp = today - timedelta(days=random.randint(30, 365))
                next_insp = today + timedelta(days=random.randint(-30, 180))
                area_val = f"{random.uniform(0.5, 50):.1f} ha" if wb_type != 'Canal' else f"{random.uniform(1, 20):.1f} km"
                WaterBody.objects.create(
                    wb_id=wb_id,
                    name=f"{village} {wb_type} {'I' if i % 5 == 0 else 'II' if i % 5 == 1 else 'III' if i % 5 == 2 else 'IV' if i % 5 == 3 else ''}".strip(),
                    wb_type=wb_type, taluk=taluk, village=village,
                    status=status, water_level=water_level, area=area_val,
                    last_inspection=last_insp, next_inspection=next_insp,
                    work_status=work_status, reno_status=reno_status,
                    latitude=round(9.2 + random.uniform(0, 0.8), 6),
                    longitude=round(78.5 + random.uniform(0, 0.8), 6),
                )

        # Work entries for a sample of water bodies
        if WorkEntry.objects.count() < 50:
            sample_wbs = list(WaterBody.objects.order_by('?')[:200])
            officer_names = [o[0] for o in OFFICERS]
            for wb in sample_wbs:
                n_works = random.randint(1, 3)
                for j in range(n_works):
                    wtype = random.choice(WORK_TYPES)
                    wname = random.choice(WORK_NAMES)
                    ws = random.choice(['Completed', 'In Progress', 'Pending'])
                    start = today - timedelta(days=random.randint(10, 300))
                    prog = {'Completed': 100, 'In Progress': random.randint(10, 90), 'Pending': 0}[ws]
                    WorkEntry.objects.create(
                        water_body=wb, work_type=wtype, title=wname,
                        description=f'{wtype} work at {wb.name}',
                        start_date=start,
                        completion_date=(start + timedelta(days=random.randint(30, 120))) if ws == 'Completed' else None,
                        progress=prog, status=ws,
                        officer=random.choice(officer_names),
                    )

        # Maintenance schedules
        if MaintenanceSchedule.objects.count() < 50:
            sample_wbs = list(WaterBody.objects.order_by('?')[:300])
            officer_names = [o[0] for o in OFFICERS]
            for wb in sample_wbs:
                title = random.choice(MAINT_TITLES)
                offset = random.randint(-60, 120)
                sched_date = today + timedelta(days=offset)
                ms = 'Overdue' if offset < 0 else 'Scheduled'
                MaintenanceSchedule.objects.create(
                    water_body=wb, title=title, scheduled_date=sched_date,
                    status=ms, officer=random.choice(officer_names),
                )

        total_wb = WaterBody.objects.count()
        self.stdout.write(self.style.SUCCESS(
            f'Done. {total_wb} water bodies, {WorkEntry.objects.count()} work entries, '
            f'{MaintenanceSchedule.objects.count()} schedules, {User.objects.count()} users.'
        ))
        self.stdout.write('')
        self.stdout.write('Login credentials:')
        self.stdout.write('  admin / admin123   → District Admin')
        self.stdout.write('  auditor / audit123 → Auditor')
        self.stdout.write('  rajesh / officer123 → Taluk Officer (Ramanathapuram)')
        self.stdout.write('  anand / officer123  → Taluk Officer (Mandapam)')
