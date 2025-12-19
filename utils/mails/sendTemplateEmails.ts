'use server';
import { Resend } from "resend";
import { createClient } from '@/utils/supabase/server';
import { sendUserPlanChangedReportEmail } from "./sendReportEmail";
import { EMAIL_CONFIG, getDomainConfigByHostname, type DomainConfig } from "@/utils/domainConfig";

const apiKey = process.env.RESEND_API_KEY!;

const resend = new Resend(apiKey);

// Helper to get domain config from user's registration domain or default
function getDomainConfigForEmail(userEmail?: string): DomainConfig {
  // TODO: If you store registration domain in user record, fetch it here
  // For now, default to biocloud
  return getDomainConfigByHostname('biocloud');
}

export const sendPlanChangeEmail = async (email: string, previousStatus: string, previousBillingCycle: string, newStatus: string, newBillingCycle: string, domainConfig: DomainConfig) => {
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
      await sendUpgradePlanMail(email, firstName, newStatus, newBillingCycle, domainConfig);
    } else if (newPriority < previousPriority) {
      await sendDowngradePlanMail(email, firstName, newStatus, newBillingCycle, domainConfig);
    } else if (newBillingCycle === "annually") {
      await sendUpgradePlanMail(email, firstName, newStatus, newBillingCycle, domainConfig);
    } else {
      await sendDowngradePlanMail(email, firstName, newStatus, newBillingCycle, domainConfig);
    }

    sendUserPlanChangedReportEmail({
      first_name: firstName,
      last_name: lastName,
      email: email,
      username: user?.username,
      previous_plan: previousStatus,
      previous_billing_cycle: previousBillingCycle,
      current_plan: newStatus,
      current_billing_cycle: newBillingCycle
    })

  } catch (error) {
    console.error('Error sending plan change email:', error);
  }
}

export const sendDowngradePlanMail = async (email: string, firstName: string, plan: string, billingCycle: string, domainConfig: DomainConfig) => {
  try {
    await sendTemplateEmail({
      sendTo: email,
      title: `Your plan has been successfully downgraded to ${plan} ${plan === "FREE" ? "" : billingCycle} Plan`,
      content: `
        <h1 style="font-size: 28px; font-weight: 300; color: #7646ff; line-height: 1.5; margin: 0;">
          Your plan has been successfully downgraded to ${plan} ${plan === "FREE" ? "" : billingCycle} Plan.
        </h1>
        <p style="font-size: 16px; font-weight: 400; color: #1c1c21; line-height: 1.7; margin: 50px 0 0 0;">
          👋 Hello ${firstName},
        </p>
        <p style="font-size: 16px; font-weight: 500; color: #1c1c21; line-height: 1.7; margin: 20px 0;">
          Your plan has been successfully downgraded to ${plan} ${plan === "FREE" ? "" : billingCycle} Plan.
        </p>`
    }, domainConfig)
  } catch (e) {
    console.log(e);
  };
};

export const sendUpgradePlanMail = async (email: string, firstName: string, plan: string, billingCycle: string, domainConfig: DomainConfig) => {
  try {
    await sendTemplateEmail({
      sendTo: email,
      title: `Your plan has been successfully upgraded to ${plan} ${billingCycle} Plan`,
      content: `
        <h1 style="font-size: 28px; font-weight: 300; color: #7646ff; line-height: 1.5; margin: 0;">
          Congratulations <br />
          <span style="font-size: 28px; font-weight: bold; color: #5046db;">
            Your plan has been successfully upgraded to ${plan} ${billingCycle} Plan.
          </span>
        </h1>
        <p style="font-size: 16px; font-weight: 400; color: #1c1c21; line-height: 1.7; margin: 50px 0 0 0;">
          👋 Hello ${firstName},
        </p>
        <p style="font-size: 16px; font-weight: 500; color: #1c1c21; line-height: 1.7; margin: 20px 0;">
          Congratulations! Your plan has been successfully upgraded to ${plan} ${billingCycle} Plan.
        </p>`
    }, domainConfig)
  } catch (e) {
    console.log(e);
  };
};

export const sendTrialEndNotificationMail = async (email: string, firstName: string, daysRemaining: number, domainConfig: DomainConfig) => {
  try {
    const config = domainConfig || getDomainConfigForEmail(email);
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
          Your ${config.brandName} PRO trial will expire in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}. Don't lose access to your identity management tools!
        </p>
        <p style="font-size: 16px; font-weight: 500; color: #1c1c21; line-height: 1.7; margin: 20px 0;">
          Upgrade now to continue enjoying:
        </p>
        <ul style="font-size: 16px; color: #1c1c21; line-height: 1.7; margin: 20px 0; padding-left: 20px;">
          <li>Unlimited identity management</li>
          <li>Advanced analytics and insights</li>
          <li>Priority customer support</li>
          <li>All premium features</li>
        </ul>
        <div style="text-align: center; margin: 40px 0;">
          <a href="${config.baseUrl}/upgrade"
              style="background-color: #5046db; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            Upgrade Now
          </a>
        </div>
        <p style="font-size: 14px; color: #888888; line-height: 1.7; margin: 20px 0;">
          Questions? Contact our support team at ${EMAIL_CONFIG.support}
        </p>
      `
    }, config)
  } catch (e) {
    console.log(e);
  };
};

export const sendTemplateEmail = async (params: EmailType, domainConfig?: DomainConfig) => {
  try {
    const config = domainConfig || getDomainConfigForEmail(params.sendTo);

    // Get logo URL - use Supabase storage URL for now, or use domain-specific logo path
    // If you have domain-specific logos in Supabase, update this logic
    const logoUrl = `https://cxqkuqtwrtgvoorxidvn.supabase.co/storage/v1/object/public/assets/${config.brandName}.jpg`;

    const data = await resend.emails.send({
      from: `${config.emailFrom} <${EMAIL_CONFIG.from}>`,
      to: params.sendTo,
      subject: params.title,
      html: `
        <!DOCTYPE html>
        <html lang="en">

        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>${params.title}</title>
          <style>
            /* Mobile-friendly adjustments */
            @media only screen and (max-width: 600px) {
              .container {
                padding-top: 40px !important;
              }
              .content {
                padding: 32px !important
              }
              .logo {
                padding-bottom: 24px !important;
              }
            }
            .button {
              /* Layout */
              display: flex;
              justify-content: center;
              align-items: center;
              gap: 0.5rem; /* gap-2 */
              margin-top: 0.75rem; /* my-3 */
              margin-bottom: 0.75rem;

              /* Appearance */
              opacity: 1;
              background-color: #5046db; /* bg-primary-1 */
              color: #ffffff !important;
              text-decoration: none;
              font-size: 16px;
              width: fit-content;              
              font-weight: 600; /* font-bold */
              border-radius: 26px;

              /* Spacing */
              padding-left: 20px;
              padding-right: 20px;
              padding-top: 10px;
              padding-bottom: 10px;

              /* Animation */
              transition: all 0.2s ease-in-out;
            }

            /* Hover state (enabled:hover:bg-[#5046db]) */
            .button:hover:enabled {
              background-color: #302a83;
            }
          </style>
        </head>

        <body
          class="container"
          style="background-color: #5046db; height: 100vh; margin: 0; padding-top: 100px; width: 100%; font-family: Arial, sans-serif;">
          <table width="100%" cellspacing="0" cellpadding="0" border="0"
            style="background-color: #5046db; margin: auto; padding-left: 10px; padding-right: 10px; width: 100%;">
            <tr>
              <td align="center" style="padding: 20px 0; width: 100%;">
                <table cellspacing="0" cellpadding="0" border="0" class="content"
                  style="padding: 50px; background-color: #fefefe; border-radius: 32px; max-width: 600px; width: 100%; box-shadow: 0px 5px 15px rgba(0, 0, 0, 0.1); margin: 0 auto; table-layout: fixed;">
                  <!-- Top Row with Logo -->
                  <tr>
                    <td>
                      <table cellspacing="0" cellpadding="0" border="0" class="logo" style="width: auto; margin-left: auto; padding-bottom: 50px;">
                        <tr>
                          <td style="text-align: right;">
                            <a href="${config.baseUrl}/login" style="text-decoration: none;">
                              <img src="${logoUrl}"
                                alt="${config.brandName} Logo" width="150"
                                style="display: block; border: 0; height: auto; line-height: 100%; outline: none;" />
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <!-- Content Section -->
                  <tr>
                    <td>
                      ${params.content}
                    </td>
                  </tr>
                  <!-- Footer -->
                  <tr>
                    <td>
                      <p style="font-size: 16px; color: #888888; margin-top: 30px;">
                        <a href="${config.baseUrl}/login" style="text-decoration: none;">
                          <span style="color: #5046db; font-weight: bold; line-height: 1.7;">${config.brandName}</span>
                        </a>
                        <br />
                        <span style="color: #fd8516; line-height: 1.7; font-weight: 300;">Your ${config.vertical} identity, simplified.</span>
                      </p>
                      <p style="color: #1c1c21; opacity: 40%; font-size: 12px; margin-top: 30px; line-height: 1.7;">
                        You received this email because a ${config.brandName} account was created with this email.
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
