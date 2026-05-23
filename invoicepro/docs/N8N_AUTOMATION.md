# ClientFlow AI n8n Automation

n8n should be used as a behind-the-scenes operations helper, not as a visible product for freelancers.

The first useful workflow is daily notification automation:

- sends user daily action digests
- sends client invoice reminders
- sends client proposal follow-ups
- avoids duplicate reminder spam through the backend `NotificationLog`

## What To Import

Import this workflow into n8n:

```text
automation/n8n/clientflow-daily-notifications.json
```

## Backend Values Required On Render

Set these on the Render backend service:

```env
CRON_SECRET=use_a_long_random_secret
AUTOMATION_NOTIFICATIONS_ENABLED=true
AUTOMATION_NOTIFY_CLIENTS=true
AUTOMATION_NOTIFY_USERS=true
FRONTEND_URL=https://www.clientflowai.in
```

Email must also be configured, otherwise the automation can run but cannot send emails:

```env
RESEND_API_KEY=
RESEND_FROM=ClientFlow AI <your_verified_sender>
```

or Gmail SMTP:

```env
EMAIL_USER=
EMAIL_PASS=
EMAIL_FROM_NAME=ClientFlow AI
EMAIL_FROM=
```

## n8n Variables

Set these in n8n. On n8n Cloud, use n8n Variables. On self-hosted n8n, environment variables also work.

```env
CLIENTFLOW_API_BASE_URL=https://invoicepro-527e.onrender.com
CLIENTFLOW_CRON_SECRET=same_value_as_render_CRON_SECRET
```

Optional admin alert webhook:

```env
CLIENTFLOW_ADMIN_ALERT_WEBHOOK=
```

Use a Slack, Discord, Telegram, or custom webhook URL only if you want n8n to alert you when the reminder job reports failures.

## How The Workflow Works

Manual test path:

```text
Manual dry run -> Check automation status -> Dry run reminders
```

Daily real path:

```text
Every day at 9 AM -> Run real reminders -> Any failures? -> Optional admin alert webhook
```

The real run calls:

```text
POST /api/notifications/automation/run
```

with this header:

```text
x-cron-secret: CLIENTFLOW_CRON_SECRET
```

## Test Before Activating

In n8n, run the `Manual dry run` node first.

Expected result:

```json
{
  "message": "Automation dry run completed.",
  "dryRun": true
}
```

If you get `401 Unauthorized`, the n8n `CLIENTFLOW_CRON_SECRET` does not match the Render `CRON_SECRET`.

If you get `CRON_SECRET is not configured`, add `CRON_SECRET` in Render and redeploy the backend.

If email sending fails, check `RESEND_API_KEY` or `EMAIL_USER` / `EMAIL_PASS`.

## Product Rule

Do not show n8n to normal users.

Show this in the product:

```text
ClientFlow AI automatically reminds you and your clients.
```

Use n8n only to trigger the backend automation.
