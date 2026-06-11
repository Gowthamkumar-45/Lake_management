from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

from geography.models import Area, District, LocalBody, Village, Ward
from lakes.models import WaterBody
from renovation.models import Equipment, FundEntry, RenovationStage, Worker

User = get_user_model()


class Command(BaseCommand):
    help = "Seed demo users and a sample geography + water body hierarchy."

    @transaction.atomic
    def handle(self, *args, **options):
        # --- Users -------------------------------------------------------
        sa, created = User.objects.get_or_create(
            username="superadmin",
            defaults={
                "role": "SUPER_ADMIN",
                "is_staff": True,
                "is_superuser": True,
                "designation": "State Administrator",
            },
        )
        sa.set_password("admin123")
        sa.save()

        # --- Geography ---------------------------------------------------
        district, _ = District.objects.get_or_create(
            name="Coimbatore",
            defaults={"code": "CBE", "latitude": Decimal("11.0168"), "longitude": Decimal("76.9558")},
        )

        admin, _ = User.objects.get_or_create(
            username="admin",
            defaults={
                "role": "ADMIN",
                "is_staff": True,
                "designation": "District Officer",
                "district": district,
            },
        )
        admin.set_password("admin123")
        admin.district = district
        admin.save()

        corp, _ = LocalBody.objects.get_or_create(
            district=district,
            body_type=LocalBody.BodyType.CORPORATION,
            name="Coimbatore Corporation",
            defaults={"latitude": Decimal("11.0168"), "longitude": Decimal("76.9558")},
        )
        panch, _ = LocalBody.objects.get_or_create(
            district=district,
            body_type=LocalBody.BodyType.PANCHAYAT,
            name="Thondamuthur Panchayat",
            defaults={"latitude": Decimal("10.9890"), "longitude": Decimal("76.8200")},
        )

        officer, _ = User.objects.get_or_create(
            username="officer",
            defaults={
                "role": "OFFICER",
                "designation": "Field Officer",
                "district": district,
            },
        )
        officer.set_password("admin123")
        officer.district = district
        officer.save()
        officer.local_bodies.set([corp, panch])

        ward, _ = Ward.objects.get_or_create(
            local_body=corp, name="Gandhipuram", defaults={"number": "045"}
        )
        area, _ = Area.objects.get_or_create(ward=ward, name="Cross Cut Road")
        village, _ = Village.objects.get_or_create(
            local_body=panch, name="Thondamuthur Village"
        )

        # --- Water bodies ------------------------------------------------
        lake, created = WaterBody.objects.get_or_create(
            name="Valankulam Lake",
            local_body=corp,
            defaults={
                "kind": WaterBody.BodyKind.LAKE,
                "ward": ward,
                "area": area,
                "latitude": Decimal("10.9920"),
                "longitude": Decimal("76.9680"),
                "status": WaterBody.Status.UNDER_RENOVATION,
                "water_source": WaterBody.WaterSource.BOTH,
                "capacity_litres": 45000000,
                "area_acres": Decimal("62.50"),
                "revived_by": WaterBody.RevivedBy.NGO,
                "revived_by_name": "Siruthuli NGO",
                "incharge": officer,
                "incharge_contact": "+91 98765 43210",
            },
        )
        pond, _ = WaterBody.objects.get_or_create(
            name="Thondamuthur Oorani",
            local_body=panch,
            defaults={
                "kind": WaterBody.BodyKind.POND,
                "village": village,
                "latitude": Decimal("10.9885"),
                "longitude": Decimal("76.8215"),
                "status": WaterBody.Status.RENOVATION_PENDING,
                "pending_reason": "Awaiting fund sanction from district office.",
                "water_source": WaterBody.WaterSource.RAIN_WATER,
                "area_acres": Decimal("3.20"),
                "incharge": officer,
            },
        )

        if created:
            # Renovation workflow for the lake.
            stages = [
                ("Survey & Marking", RenovationStage.StageStatus.COMPLETED),
                ("De-silting", RenovationStage.StageStatus.IN_PROGRESS),
                ("Bund Strengthening", RenovationStage.StageStatus.NOT_STARTED),
                ("Inlet/Outlet Channel Work", RenovationStage.StageStatus.NOT_STARTED),
            ]
            for i, (title, status) in enumerate(stages, start=1):
                RenovationStage.objects.create(
                    water_body=lake, order=i, title=title, status=status,
                    description=f"{title} works for {lake.name}.",
                )
            Worker.objects.create(water_body=lake, gender="MALE", designation="JCB Operator", count=3)
            Worker.objects.create(water_body=lake, gender="MALE", designation="Labour", count=18)
            Worker.objects.create(water_body=lake, gender="FEMALE", designation="Labour", count=12)
            Worker.objects.create(water_body=lake, gender="FEMALE", designation="Supervisor", count=1)
            Equipment.objects.create(water_body=lake, name="JCB Excavator", quantity=2)
            Equipment.objects.create(water_body=lake, name="Tipper Truck", quantity=4)
            FundEntry.objects.create(water_body=lake, purpose="De-silting work", amount=Decimal("850000"))
            FundEntry.objects.create(water_body=lake, purpose="Machinery rental", amount=Decimal("320000"))

        self.stdout.write(self.style.SUCCESS("Demo data seeded."))
        self.stdout.write("Logins (password 'admin123'): superadmin / admin / officer")
