from django.core.management.base import BaseCommand
from api.models import WaterBody, WorkEntry, Photo, OfficerProfile, MaintenanceSchedule


class Command(BaseCommand):
    help = 'Clear all dummy water body data. Keeps geo data (District, Taluk, LocalBody) and users.'

    def handle(self, *args, **options):
        self.stdout.write('Clearing dummy data...')

        photos = Photo.objects.count()
        Photo.objects.all().delete()
        self.stdout.write(f'  Deleted {photos} photos')

        entries = WorkEntry.objects.count()
        WorkEntry.objects.all().delete()
        self.stdout.write(f'  Deleted {entries} work entries')

        schedules = MaintenanceSchedule.objects.count()
        MaintenanceSchedule.objects.all().delete()
        self.stdout.write(f'  Deleted {schedules} maintenance schedules')

        officers = OfficerProfile.objects.count()
        OfficerProfile.objects.all().delete()
        self.stdout.write(f'  Deleted {officers} officer profiles')

        bodies = WaterBody.objects.count()
        WaterBody.objects.all().delete()
        self.stdout.write(f'  Deleted {bodies} water bodies')

        self.stdout.write(self.style.SUCCESS('\nDone! Database is clean.'))
        self.stdout.write('Kept: District, Taluk, LocalBody (geo data) and users.')
        self.stdout.write('Now enter real water bodies via the UI or admin panel.')
