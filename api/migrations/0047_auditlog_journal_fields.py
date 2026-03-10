from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0046_tracabilite_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='auditlog',
            name='module',
            field=models.CharField(blank=True, default='', max_length=50),
        ),
        migrations.AddField(
            model_name='auditlog',
            name='reference',
            field=models.CharField(blank=True, default='', max_length=80),
        ),
        migrations.AddField(
            model_name='auditlog',
            name='snapshot',
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddIndex(
            model_name='auditlog',
            index=models.Index(fields=['timestamp'], name='api_auditlo_timesta_08f2d8_idx'),
        ),
        migrations.AddIndex(
            model_name='auditlog',
            index=models.Index(fields=['action'], name='api_auditlo_action_53825f_idx'),
        ),
        migrations.AddIndex(
            model_name='auditlog',
            index=models.Index(fields=['module'], name='api_auditlo_module_493273_idx'),
        ),
        migrations.AddIndex(
            model_name='auditlog',
            index=models.Index(fields=['model_name'], name='api_auditlo_model_n_8f3026_idx'),
        ),
        migrations.AddIndex(
            model_name='auditlog',
            index=models.Index(fields=['reference'], name='api_auditlo_referen_1ffbf2_idx'),
        ),
    ]
