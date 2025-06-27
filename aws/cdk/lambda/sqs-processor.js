const sgMail = require('@sendgrid/mail');

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

/**
 * Determines whether to send emails (not necessarily to real recipients)
 */
function sendEmailEnabled() {
  return process.env.SENDGRID_SEND_EMAILS_ENABLED === 'true';
}

/**
 * Determines whether to send emails to real recipients or to the test email
 */
function shouldSendRealEmails() {
  return process.env.SENDGRID_SEND_REAL_EMAILS === 'true';
}

/**
 * Gets the appropriate recipient email address based on configuration
 */
function getRecipientEmail(intendedRecipient) {
  if (shouldSendRealEmails()) {
    return intendedRecipient;
  }
  
  const testEmail = process.env.SENDGRID_TO_EMAIL || 'test@example.com';
  console.log(`⚠️ Dev mode: Redirecting email from ${intendedRecipient} to ${testEmail}`);
  return testEmail;
}

/**
 * Sends an email using SendGrid with dynamic template
 */
async function sendTemplateEmail(to, templateId, dynamicData) {
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
      from: process.env.SENDGRID_FROM_EMAIL || 'instructors@example.com',
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
 */
async function sendInstructorEmail(email, instructorName, contactId, institution) {
  const templateData = {
    instructor_name: instructorName || 'Professor',
    contact_id: contactId,
    institution: institution,
    current_date: new Date().toLocaleDateString(),
    support_email: process.env.SUPPORT_EMAIL || 'instructors@example.com',
    salesperson_name: 'Chuck Page-Turner'
  };
  
  return sendTemplateEmail(
    email,
    process.env.SENDGRID_INSTRUCTOR_REQUEST_TEMPLATE_ID || '',
    templateData
  );
}

exports.handler = async (event) => {
  console.log('Lambda triggered by SQS - processing', event.Records.length, 'messages');
  
  if (!process.env.SENDGRID_API_KEY) {
    throw new Error('SENDGRID_API_KEY environment variable is not set');
  }
  
  let processedCount = 0;
  let failedCount = 0;
  const batchItemFailures = [];
  
  // Process each SQS record from the event
  for (const record of event.Records) {
    try {
      // Parse the message body
      const messageBody = JSON.parse(record.body || '{}');
      
      // Log message contents
      console.log('Processing message:', {
        MessageId: record.messageId,
        Body: messageBody
      });
      
      // Send email using SendGrid
      const emailSent = await sendInstructorEmail(
        messageBody.email,
        messageBody.instructorName,
        messageBody.contactId,
        messageBody.institution
      );
      
      if (emailSent) {
        console.log(`✅ Message ${record.messageId} processed successfully`);
        processedCount++;
        // Message will be automatically deleted from queue since we don't add it to batchItemFailures
      } else {
        console.log(`❌ Failed to send email to: ${messageBody.email}. Adding to failed items.`);
        failedCount++;
        batchItemFailures.push({ itemIdentifier: record.messageId });
      }
             
    } catch (messageError) {
      console.error('Error processing message:', messageError);
      console.log(`❌ Message ${record.messageId} failed processing. Adding to failed items.`);
      failedCount++;
      batchItemFailures.push({ itemIdentifier: record.messageId });
    }
  }
  
  console.log(`Processing complete. Successful: ${processedCount}, Failed: ${failedCount}`);
  
  // Return partial batch failure response
  // Successfully processed messages will be deleted, failed ones will be retried
  return {
    batchItemFailures: batchItemFailures
  };
}; 