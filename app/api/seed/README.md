# Seed Data

This directory contains both seed data as well as reference data for testing the application.

## Instructor Response

This is a sample instructor response to an email request for office hours.  This comes from the Inbound Parse Webhook from SendGrid.

The localhost url needs to be exposed externally using ngrok.  Otherwise, the email inbound API will not be able to receive the email.  This will be changed once the application is deployed, and we have a persistent public url to call.

```bash
ngrok http 3000
```

Then, the ngrok url needs to be used in the SendGrid Inbound Parse webhook.

```bash
curl -X POST https://<ngrok-url>/api/email/inbound \
  -F "from=Professor Jose Sosa <jose.sosa@rutgers.edu>" \
  -F "subject=Re: Meeting and Office Hours" \
  -F "text=Hello Chuck,

Thank you for your email. I'd be happy to meet with you to discuss course materials.

My office hours this semester are Mondays and Wednesdays from 2:00 PM to 4:00 PM in the Science Building, Room 302. I also teach on Tuesdays and Thursdays from 10:00 AM to 11:30 AM in the Main Auditorium.

Feel free to stop by during my office hours, or we can schedule a specific time if you prefer.

Best regards,
Professor Jose Sosa
Department of Mathematics
Rutgers University New Brunswick" \
  -F "envelope={\"to\":[\"inbound@yourdomain.com\"],\"from\":\"jose.sosa@rutgers.edu\"}" \
  -F "dkim=pass"
```
