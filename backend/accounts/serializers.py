from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import Role

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    role_display = serializers.CharField(source="get_role_display", read_only=True)
    district_name = serializers.CharField(source="district.name", read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "role",
            "role_display",
            "phone",
            "designation",
            "district",
            "district_name",
            "local_bodies",
            "is_active",
        ]


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "password",
            "first_name",
            "last_name",
            "role",
            "phone",
            "designation",
            "district",
            "local_bodies",
        ]

    def validate_role(self, value):
        """An Admin may only create Officers; a Super Admin may create anyone."""
        request = self.context.get("request")
        if request and request.user.role == Role.ADMIN and value != Role.OFFICER:
            raise serializers.ValidationError("Admins can only create Officer accounts.")
        return value

    def create(self, validated_data):
        password = validated_data.pop("password")
        local_bodies = validated_data.pop("local_bodies", [])
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        user.local_bodies.set(local_bodies)
        return user


class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Embed role + identity in the JWT and the login response body."""

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role
        token["username"] = user.username
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data["user"] = UserSerializer(self.user).data
        return data
