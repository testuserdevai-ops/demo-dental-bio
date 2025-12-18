
import { NextResponse } from "next/server";
import { createClient } from '@/utils/supabase/server';
import { sendTemplateEmail } from "@/utils/mails/sendTemplateEmails";
import { getDomainConfigByHostname } from "@/utils/domainConfig";

export async function GET(req: Request) {

  const supabase = createClient();

  try {
    if (req.method !== 'GET') {
      return NextResponse.json({ message: 'Method not allowed' }, { status: 405 });
    }

    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const { data: users, error } = await supabase
      .from('users')
      .select('email, username, first_name, trial_end')
      .gte('trial_end', new Date())
      .lte('trial_end', threeDaysFromNow.toISOString())

    if (error) {
      console.error('Error fetch users:', error);
      return NextResponse.json({ message: 'Error fetching users' }, { status: 500 });
    }

    for (const user of users) {
      const calculateDaysLeft = () => {
        const trialEndDate: any = new Date(user.trial_end);
        const currentDate: any = new Date();

        const differenceInMillis = trialEndDate - currentDate;
        const millisecondsPerDay = 1000 * 60 * 60 * 24;
        const daysLeft = Math.ceil(differenceInMillis / millisecondsPerDay)
        return daysLeft;
      }

      const daysLeft = calculateDaysLeft();

      // TODO: If you store registration domain in user record, use it here
      // For now, default to biocloud
      const domainConfig = getDomainConfigByHostname('biocloud');
      const userUrl = `${domainConfig.baseUrl.replace('https://', '')}/${user.username}`;

      const title = `Your Free Trial is Expiring in ${daysLeft} Days: ${userUrl}!`

      await sendTemplateEmail({
        sendTo: user.email,
        title,
        content: `
          <p style="font-size: 16px; color: #333; line-height: 1.6; margin: 0;">
            👋 Hello <strong>${user.first_name}</strong>,
          </p>
          <p style="font-size: 16px; color: #333; line-height: 1.6; margin: 20px 0;">
            Your ${domainConfig.brandName} trial for <strong style="color: #f1852f;">${userUrl}</strong>
            is ending in <strong>${daysLeft} days</strong>.
          </p>
          <p style="font-size: 16px; color: #333; line-height: 1.6; margin: 20px 0;">
            Upgrade now to keep your profile live and unlock premium features!
          </p>

          <!-- Upgrade Button -->
          <a href="${domainConfig.baseUrl}/upgrade"
            style="display: inline-block; background-color: #5046db; color: #ffffff; font-size: 16px; font-weight: bold; text-decoration: none; padding: 12px 24px; border-radius: 6px; margin-top: 20px;">
            Upgrade Now
          </a>

          <p style="font-size: 14px; color: #777; margin-top: 20px;">
            Need help? Reply to this email or visit our
            <a href="${domainConfig.baseUrl}/support" style="color: #5046db; text-decoration: none;">Support
              Center</a>.
          </p>
        `
      }, domainConfig)
    }

    return NextResponse.json({ message: 'Emails sent!' }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}