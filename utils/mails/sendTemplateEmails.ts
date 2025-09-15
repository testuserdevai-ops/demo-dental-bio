'use server';
import { Resend } from "resend";
import { createClient } from '@/utils/supabase/server';
import { sendUserPlanChangedReportEmail } from "./sendReportEmail";

const apiKey = process.env.RESEND_API_KEY!;

const resend = new Resend(apiKey);

export const sendPlanChangeEmail = async (email: string, previousStatus: string, newStatus: string) => {
  try {
    const supabase = createClient();
    const { data: user } = await supabase
      .from('users')
      .select('first_name, last_name, username')
      .eq('email', email)
      .single();

    const firstName = user?.first_name || 'User';
    const lastName = user?.last_name || '';

    // Determine if it's an upgrade or downgrade
    const planPriority = {
      'FREE': 0,
      'PRO': 1,
      'PREMIUM PRO': 2
    };

    const previousPriority = planPriority[previousStatus as keyof typeof planPriority] || 0;
    const newPriority = planPriority[newStatus as keyof typeof planPriority] || 0;

    if (newPriority > previousPriority) {
      await sendUpgradePlanMail(email, firstName, newStatus);
    } else if (newPriority < previousPriority) {
      await sendDowngradePlanMail(email, firstName, newStatus);
    }

    if (newPriority !== previousPriority) {
      sendUserPlanChangedReportEmail({
        first_name: firstName,
        last_name: lastName,
        email: email,
        username: user?.username,
        previous_plan: previousStatus,
        current_plan: newStatus
      })
    }
  } catch (error) {
    console.error('Error sending plan change email:', error);
  }
}

export const sendDowngradePlanMail = async (email: string, firstName: string, plan: string) => {
  try {
    await sendTemplateEmail({
      sendTo: email,
      title: `Your plan has been successfully downgraded to ${plan}`,
      content: `
        <h1 style="font-size: 28px; font-weight: 300; color: #7646ff; line-height: 1.5; margin: 0;">
          Your plan has been successfully downgraded to ${plan}
        </h1>
        <p style="font-size: 16px; font-weight: 400; color: #1c1c21; line-height: 1.7; margin: 50px 0 0 0;">
          👋 Hello ${firstName},
        </p>
        <p style="font-size: 16px; font-weight: 500; color: #1c1c21; line-height: 1.7; margin: 20px 0;">
          Your plan has been successfully downgraded to ${plan}
        </p>`
    })
  } catch (e) {
    console.log(e);
  };
};

export const sendUpgradePlanMail = async (email: string, firstName: string, plan: string) => {
  try {
    await sendTemplateEmail({
      sendTo: email,
      title: `Your plan has been successfully upgraded to ${plan}`,
      content: `
        <h1 style="font-size: 28px; font-weight: 300; color: #7646ff; line-height: 1.5; margin: 0;">
          Congratulations <br />
          <span style="font-size: 28px; font-weight: bold; color: #5046db;">
            Your plan has been successfully upgraded to ${plan}
          </span>
        </h1>
        <p style="font-size: 16px; font-weight: 400; color: #1c1c21; line-height: 1.7; margin: 50px 0 0 0;">
          👋 Hello ${firstName},
        </p>
        <p style="font-size: 16px; font-weight: 500; color: #1c1c21; line-height: 1.7; margin: 20px 0;">
          Congratulations! Your plan has been successfully upgraded to ${plan}
        </p>`
    })
  } catch (e) {
    console.log(e);
  };
};

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

export const sendTemplateEmail = async (params: EmailType) => {
  try {
    const data = await resend.emails.send({
      from: "Dentalbio <noreply@dental.bio>",
      to: params.sendTo,
      subject: params.title,
      html: `
    <!DOCTYPE html>
    <html lang="en">

    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${params.title}</title>
    </head>

    <body
      style="background-color: #5046db; height: 100vh; margin: 0; padding-top: 100px; width: 100%; font-family: Arial, sans-serif;">
      <table width="100%" cellspacing="0" cellpadding="0" border="0"
        style="background-color: #5046db; margin: auto; padding-left: 10px; padding-right: 10px; width: 100%;">
        <tr>
          <td align="center" style="padding: 20px 0; width: 100%;">
            <table cellspacing="0" cellpadding="0" border="0"
              style="background-color: #fefefe; border-radius: 32px; max-width: 600px; width: 100%; box-shadow: 0px 5px 15px rgba(0, 0, 0, 0.1); margin: 0 auto; table-layout: fixed;">
              <!-- Top Row with Logo -->
              <tr>
                <td style="padding: 50px;">
                  <table cellspacing="0" cellpadding="0" border="0" style="width: auto; margin-left: auto;">
                    <tr>
                      <td style="text-align: right;">
                        <a href="https://dental.bio/login" style="text-decoration: none;">
                          <img src="https://cxqkuqtwrtgvoorxidvn.supabase.co/storage/v1/object/public/assets/logo%201.png"
                            alt="Dentalbio Logo" width="150"
                            style="display: block; border: 0; height: auto; line-height: 100%; outline: none;" />
                        </a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <!-- Content Section -->
              <tr>
                <td style="padding: 0 50px;">
                  ${params.content}
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="padding: 0 50px; text-align: left; padding-bottom: 50px;">
                  <p style="font-size: 16px; color: #888888; margin-top: 30px;">
                    <a href="https://dental.bio/login" style="text-decoration: none;">
                      <span style="color: #5046db; font-weight: bold; line-height: 1.7;">Dentalbio</span>
                    </a>
                    <br />
                    <span style="color: #fd8516; line-height: 1.7; font-weight: 300;">Your dental identity,
                      simplified.</span>
                  </p>
                  <p style="color: #1c1c21; opacity: 40%; font-size: 12px; margin-top: 30px; line-height: 1.7;">
                    You received this email because a Dentalbio account was created with this email.
                  </p>
                  <p style="color: #1c1c21; opacity: 40%; font-size: 12px; margin-top: 14px; line-height: 1.7;">
                    Biocloud Ltd, 113 Crawford Street, London, W1H 2JG
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>

    </html>
    `
    });

    return data.data;
  } catch (e) {
    console.log(e);
  };
};
