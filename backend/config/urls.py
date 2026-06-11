from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from accounts.views import MyTokenObtainPairView, UserViewSet
from geography.views import (
    AreaViewSet,
    DistrictViewSet,
    LocalBodyViewSet,
    VillageViewSet,
    WardViewSet,
)
from lakes.views import WaterBodyViewSet
from renovation.views import (
    EquipmentViewSet,
    FundEntryViewSet,
    RenovationStageViewSet,
    StagePhotoViewSet,
    WorkerViewSet,
)

router = DefaultRouter()
router.register("users", UserViewSet, basename="user")
router.register("districts", DistrictViewSet, basename="district")
router.register("local-bodies", LocalBodyViewSet, basename="localbody")
router.register("wards", WardViewSet, basename="ward")
router.register("villages", VillageViewSet, basename="village")
router.register("areas", AreaViewSet, basename="area")
router.register("water-bodies", WaterBodyViewSet, basename="waterbody")
router.register("stages", RenovationStageViewSet, basename="stage")
router.register("stage-photos", StagePhotoViewSet, basename="stagephoto")
router.register("workers", WorkerViewSet, basename="worker")
router.register("equipment", EquipmentViewSet, basename="equipment")
router.register("fund-entries", FundEntryViewSet, basename="fundentry")

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/login/", MyTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/", include(router.urls)),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
