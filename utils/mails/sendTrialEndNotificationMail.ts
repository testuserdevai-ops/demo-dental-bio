'use server';
import { Resend } from "resend";
import { sendTemplateEmail } from "./sendTemplateEmails";

const apiKey = process.env.RESEND_API_KEY!;

const resend = new Resend(apiKey);

export const sendTrialEndNotificationMail = async (email: string, firstName: string, daysRemaining: number) => {
  try {
    sendTemplateEmail({
      sendTo: email,
      title: `Your trial ends in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} - Upgrade now!`,
      content: `
        <h1 style="font-size: 28px; font-weight: 300; color: #7646ff; line-height: 1.5; margin: 0;">
          Your trial ends in <span style="font-size: 28px; font-weight: bold; color: #5046db;">${daysRemaining} day${daysRemaining === 1 ? '' : 's'}!</span>
        </h1>
        <p style="font-size: 16px; font-weight: 400; color: #1c1c21; line-height: 1.7; margin: 50px 0 0 0;">
          👋 Hey ${firstName},
        </p>
        <p style="font-size: 16px; font-weight: 500; color: #1c1c21; line-height: 1.7; margin: 20px 0;">
          Your Dentalbio PRO trial will expire in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}. Don't lose access to your dental identity management tools!
        </p>
        <p style="font-size: 16px; font-weight: 500; color: #1c1c21; line-height: 1.7; margin: 20px 0;">
          Upgrade now to continue enjoying:
        </p>
        <ul style="font-size: 16px; color: #1c1c21; line-height: 1.7; margin: 20px 0; padding-left: 20px;">
          <li>Unlimited dental identity management</li>
          <li>Advanced analytics and insights</li>
          <li>Priority customer support</li>
          <li>All premium features</li>
        </ul>
        <div style="text-align: center; margin: 40px 0;">
          <a href="${process.env.APP_URL}/upgrade" 
              style="background-color: #5046db; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            Upgrade Now
          </a>
        </div>
        <p style="font-size: 14px; color: #888888; line-height: 1.7; margin: 20px 0;">
          Questions? Contact our support team at support@dental.bio
        </p>
      `
    })
  } catch (e) {
    console.log(e);
  };
};

export const sendTrialStatusEmail = async (notificationsSent: {
  email: String;
  daysRemaining: Number;
  sentAt: String;
}[]) => {
  try {
    const data = await resend.emails.send({
      from: "Dentalbio <noreply@dental.bio>",
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