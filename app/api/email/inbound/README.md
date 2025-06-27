# **Sales Email Reply Integration with SendGrid**

## **Overview**

The email inbound API endpoint handles incoming emails from SendGrid's Inbound Parse webhook. It processes these emails to extract office hours information and updates the instructor record accordingly.

## **Required Information**

This document provides the necessary instructions for Sales to provide the dependencies for the [SendGrid Inbound Parse](https://www.twilio.com/docs/sendgrid/ui/account-and-settings/inbound-parse) to capture instructor email replies and forward them to the above-mentioned API endpoint.

### **1. Subdomain Setup**

- The company must set up a **subdomain** under their verified domain to be used for email replies.
- Suggested format: `instructors.example.com`
- Ensure DNS records are properly configured.

### **2. Email Address**

- The email address used for replies should be formatted as:
  - `instructors@example.com`
- This will be the "reply-to" email address for instructor responses, which will be parsed, data extracted and forwarded to the SFDC API endpoint.

## **Next Steps**

Once the subdomain and email address are configured, contractor can proceed with the rest of the setup (webhook integration, API handling, and Salesforce updates).
