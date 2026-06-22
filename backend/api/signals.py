from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.models import User
from .models import WorkEntry, WaterBody, Notification, AuditLog


@receiver(post_save, sender=WorkEntry)
def update_water_body_work_status(sender, instance, created, **kwargs):
    wb = instance.water_body
    entries = WorkEntry.objects.filter(water_body=wb)
    if not entries.exists():
        return
    statuses = set(entries.values_list('status', flat=True))
    if 'In Progress' in statuses:
        new_status = 'In Progress'
    elif statuses == {'Completed'}:
        new_status = 'Completed'
    elif 'Delayed' in statuses:
        new_status = 'Delayed'
    else:
        new_status = 'Pending'
    WaterBody.objects.filter(pk=wb.pk).update(work_status=new_status)

    if created:
        admins = User.objects.filter(profile__role='admin')
        for admin in admins:
            Notification.objects.create(
                user=admin,
                title=f'New work entry: {instance.title}',
                message=f'{instance.officer or "Field officer"} submitted a {instance.work_type} report for {wb.name}.',
                notif_type='info',
                related_model='WorkEntry',
                related_id=instance.id,
            )
