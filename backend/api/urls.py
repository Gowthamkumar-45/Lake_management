from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('districts', views.DistrictViewSet)
router.register('taluks', views.TalukViewSet)
router.register('local-bodies', views.LocalBodyViewSet)
router.register('villages', views.VillageViewSet)
router.register('water-bodies', views.WaterBodyViewSet)
router.register('work-entries', views.WorkEntryViewSet)
router.register('photos', views.PhotoViewSet)
router.register('officers', views.OfficerProfileViewSet)
router.register('maintenance', views.MaintenanceScheduleViewSet)
router.register('workforce', views.WorkforceEntryViewSet)
router.register('machines', views.MachineEntryViewSet)
router.register('funds', views.FundEntryViewSet)
router.register('water-level-history', views.WaterLevelRecordViewSet)
router.register('assignments', views.WaterBodyAssignmentViewSet)
router.register('notifications', views.NotificationViewSet, basename='notification')
router.register('audit-logs', views.AuditLogViewSet)
router.register('inflow-sources', views.InflowSourceViewSet)
router.register('outflow-sources', views.OutflowSourceViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('auth/login/', views.login_view, name='login'),
    path('auth/logout/', views.logout_view, name='logout'),
    path('auth/me/', views.me_view, name='me'),
    path('stats/', views.stats_view, name='stats'),
    path('recent-updates/', views.recent_updates_view, name='recent-updates'),
    path('geo/hierarchy/', views.geo_hierarchy_view, name='geo-hierarchy'),
]
