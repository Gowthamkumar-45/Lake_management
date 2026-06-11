from django.db.models import Sum
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from .models import FundEntry


def _recalc_funds(water_body):
    total = water_body.fund_entries.aggregate(s=Sum("amount"))["s"] or 0
    if water_body.total_funds_used != total:
        water_body.total_funds_used = total
        water_body.save(update_fields=["total_funds_used"])


@receiver(post_save, sender=FundEntry)
def fund_saved(sender, instance, **kwargs):
    _recalc_funds(instance.water_body)


@receiver(post_delete, sender=FundEntry)
def fund_deleted(sender, instance, **kwargs):
    _recalc_funds(instance.water_body)
