'use server';
import { Resend } from "resend";
import { EMAIL_CONFIG } from "@/utils/domainConfig";

const apiKey = process.env.RESEND_API_KEY!;

const resend = new Resend(apiKey);

export const sendTrialStatusEmail = async (notificationsSent: {
  email: String;
  daysRemaining: Number;
  sentAt: String;
}[]) => {
  try {
    await resend.emails.send({
      from: `Biocloud <${EMAIL_CONFIG.from}>`,
      to: ['sergey.r1130@gmail.com'],
      subject: `Trial Period Report`,
      html: `<div>${notificationsSent.map(notification => (
        `<p style="font-size: 16px; font-weight: 500; color: #1c1c21; line-height: 1.7; margin: 20px 0;">${notification.email}: (${notification.daysRemaining} days remaining)</p>`
      )).join("")}</div>`
    });
  } catch (e) {
    console.log(e);
  };
};

export const sendUserRegisterredEmail = async (registerData: {
  username: string;
  title: string;
  first_name: string;
  last_name: string;
  position: string;
  country: string;
  email: string;
  time: string;
  location: string;
}) => {
  try {
    await resend.emails.send({
      from: `Biocloud <${EMAIL_CONFIG.from}>`,
      to: ["shaz@dental.bio", "sergey.r1130@gmail.com"],
      subject: `${registerData.username} signed up!`,
      text: `A new user has signed up. 
              Title: ${registerData.title || ""}
              First Name: ${registerData.first_name || ""}
              Last Name: ${registerData.last_name || ""}
              Position: ${registerData.position || ""}
              Country: ${registerData.country || ""}
              Username: @${registerData.username || ""}
              Email: ${registerData.email || ""}
              Registered at: ${registerData.time || ""}
              Registered from: ${registerData.location || ""}`,
    });
  } catch (e) {
    console.error(e);
  }
}

export const sendBlockedDomainAttemptEmail = async (attemptData: {
  email: string;
  blocked_domain: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  position?: string;
  country?: string;
  location?: string;
  ip?: string;
  user_agent?: string;
  time: string;
  route: string;
}) => {
  try {
    await resend.emails.send({
      from: `Biocloud <${EMAIL_CONFIG.from}>`,
      to: ['sergey.r1130@gmail.com'],
      subject: `⚠️ Blocked registration attempt: ${attemptData.blocked_domain}`,
      text: `A registration attempt was blocked due to a disposable email domain.

Blocked Domain: ${attemptData.blocked_domain}
Email: ${attemptData.email}
Route: ${attemptData.route}
Time: ${attemptData.time}

Registration Info:
  Username: ${attemptData.username || 'N/A'}
  First Name: ${attemptData.first_name || 'N/A'}
  Last Name: ${attemptData.last_name || 'N/A'}
  Position: ${attemptData.position || 'N/A'}
  Country: ${attemptData.country || 'N/A'}
  Location: ${attemptData.location || 'N/A'}

Session Info:
  IP: ${attemptData.ip || 'N/A'}
  User-Agent: ${attemptData.user_agent || 'N/A'}`,
    });
  } catch (e) {
    console.error('Error sending blocked domain attempt email:', e);
  }
};

export const sendUserPlanChangedReportEmail = async (emailData: {
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  previous_plan: string;
  previous_billing_cycle: string;
  current_plan: string;
  current_billing_cycle: string;
}) => {
  try {
    await resend.emails.send({
      from: `Biocloud <${EMAIL_CONFIG.from}>`,
      to: ["shaz@dental.bio", "sergey.r1130@gmail.com"],
      subject: `${emailData.first_name}'s plan has been changed`,
      text: `
        ${emailData.first_name}'s plan has been changed from ${emailData.previous_plan} ${emailData.previous_plan === "FREE" ? "" : emailData.previous_billing_cycle} Plan to ${emailData.current_plan} ${emailData.current_plan === "FREE" ? "" : emailData.current_billing_cycle} Plan
        First Name: ${emailData.first_name}
        Last Name: ${emailData.last_name}
        Username: ${emailData.username}
        Email Address: ${emailData.email}
      `,
    });
  } catch (e) {
    console.error(e);
  }
}