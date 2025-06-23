import sgMail from '@sendgrid/mail';
import dotenv from 'dotenv';
dotenv.config();

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

/**
 * Type definition for email template data
 */
export interface InstructorEmailTemplateData {
  instructor_name: string;
  contact_id: string;
  institution: string;
  current_date: string;
  support_email: string;
  salesperson_name: string;
}

/**
 * Determines whether to send emails (not necessarily to real recipients)
 * @returns boolean indicating if emails should be sent
 */
function sendEmailEnabled(): boolean {
  return process.env.SENDGRID_SEND_EMAILS_ENABLED === 'true';
}

/**
 * Determines whether to send emails to real recipients or to the test email
 * @returns boolean indicating if real emails should be sent
 */
function shouldSendRealEmails(): boolean {
  return process.env.SENDGRID_SEND_REAL_EMAILS === 'true';
}

/**
 * Gets the appropriate recipient email address based on configuration
 * @param intendedRecipient - The intended recipient's email address
 * @returns The email address to actually send to
 */
function getRecipientEmail(intendedRecipient: string): string {
  if (shouldSendRealEmails()) {
    return intendedRecipient;
  }
  
  const testEmail = process.env.SENDGRID_TO_EMAIL || 'test@example.com';
  console.log(`⚠️ Dev mode: Redirecting email from ${intendedRecipient} to ${testEmail}`);
  return testEmail;
}

/**
 * Sends an email using SendGrid with dynamic template
 * @param to - Recipient email address
 * @param templateId - SendGrid template ID
 * @param dynamicData - Data to populate the template
 * @returns Promise that resolves to boolean indicating success
 */
export async function sendTemplateEmail(
  to: string,
  templateId: string,
  dynamicData: Record<string, any>
): Promise<boolean> {
  try {
    // Determine actual recipient
    const actualRecipient = getRecipientEmail(to);
    
    // Add original recipient to dynamic data for traceability
    const enhancedData = {
      ...dynamicData,
      original_recipient: to,
      is_redirected: !shouldSendRealEmails()
    };
    
    const msg = {
      to: actualRecipient,
      from: process.env.SENDGRID_FROM_EMAIL || 'instructors@mheducation.com',
      templateId,
      dynamicTemplateData: enhancedData,
    };
    
    if (!sendEmailEnabled()) {
      console.log(`✅ SENDING DISABLED: Email intended for ${to} would have been sent to ${actualRecipient} using template ${templateId}`);
      return true;
    }
    await sgMail.send(msg);
    
    if (shouldSendRealEmails()) {
      console.log(`✅ Email sent successfully to ${to} using template ${templateId}`);
    } else {
      console.log(`✅ QA MODE: Email intended for ${to} redirected to ${actualRecipient} (template: ${templateId})`);
    }
    
    return true;
  } catch (error) {
    console.error('Error sending email via SendGrid:', error);
    return false;
  }
}

/**
 * Sends an instructor notification email
 * @param email - Instructor's email address
 * @param instructorName - Instructor's name
 * @param contactId - Instructor's ID
 * @param institution - Instructor's institution
 * @returns Promise that resolves to boolean indicating success
 */
export async function sendInstructorEmail(
  email: string,
  instructorName: string,
  contactId: string,
  institution: string
): Promise<boolean> {
  const templateData: InstructorEmailTemplateData = {
    instructor_name: instructorName || 'Professor',
    contact_id: contactId,
    institution: institution,
    current_date: new Date().toLocaleDateString(),
    support_email: process.env.SUPPORT_EMAIL || 'instructors@mheducation.com',
    salesperson_name: 'Chuck Page-Turner'
  };
  
  return sendTemplateEmail(
    email,
    process.env.SENDGRID_INSTRUCTOR_REQUEST_TEMPLATE_ID || '',
    templateData
  );
} 