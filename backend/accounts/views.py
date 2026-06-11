from django.contrib.auth import get_user_model
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import Role
from .permissions import IsAdminOrSuperAdmin
from .serializers import (
    MyTokenObtainPairSerializer,
    UserCreateSerializer,
    UserSerializer,
)

User = get_user_model()


class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer


class UserViewSet(viewsets.ModelViewSet):
    """Manage users. Super Admin sees all; Admin manages officers in their scope."""

    permission_classes = [IsAdminOrSuperAdmin]

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return UserCreateSerializer
        return UserSerializer

    def get_queryset(self):
        user = self.request.user
        qs = User.objects.all().select_related("district").order_by("username")
        if user.role == Role.ADMIN:
            qs = qs.filter(role=Role.OFFICER)
            if user.district_id:
                qs = qs.filter(district_id=user.district_id)
        return qs

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def me(self, request):
        return Response(UserSerializer(request.user).data)
