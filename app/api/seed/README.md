# Seed Data

This directory contains both seed data as well as reference data for testing the application.

## Instructor Response

This is a sample instructor response to an email request for office hours.  This comes from the Inbound Parse Webhook from SendGrid.

```bash
curl -X POST http://localhost:3000/api/email/inbound \
  -F "from=Professor Jane Smith <jane.smith@university.edu>" \
  -F "subject=Re: Meeting and Office Hours" \
  -F "text=Hello Chuck,

Thank you for your email. I'd be happy to meet with you to discuss course materials.

My office hours this semester are Mondays and Wednesdays from 2:00 PM to 4:00 PM in the Science Building, Room 302. I also teach on Tuesdays and Thursdays from 10:00 AM to 11:30 AM in the Main Auditorium.

Feel free to stop by during my office hours, or we can schedule a specific time if you prefer.

Best regards,
Professor Jane Smith
Department of Physics
University of Example" \
  -F "envelope={\"to\":[\"inbound@yourdomain.com\"],\"from\":\"jane.smith@university.edu\"}" \
  -F "dkim=pass"
```
