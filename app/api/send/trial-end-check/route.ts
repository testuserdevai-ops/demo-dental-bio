
import { Resend } from "resend";
import { NextResponse } from "next/server";
import { createClient } from '@/utils/supabase/server';

// Initialize Resend with API key from environment variable
const resend = new Resend(process.env.RESEND_API_KEY);

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

    await resend.emails.send({
      from: "Dentalbio <noreply@dental.bio>",
      to: "sergey.r1130@gmail.com",
      subject: "Cron Job",
      text: `Cron job is runned`
    });

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

      const title = `Your Free Trial is Expiring in ${daysLeft} Days: dental.bio/${user.username}!`

      // Send HTML email to the user
      const userEmail = await resend.emails.send({
        from: "Dentalbio <noreply@dental.bio>",
        to: [user.email],
        subject: `${title}`,
        html: `
        <!DOCTYPE html>
        <body style="background-color: #5046db; margin: 0; padding: 0; width: 100%; font-family: Arial, sans-serif;">
        <table width="100%" cellspacing="0" cellpadding="0" border="0"
          style="background-color: #5046db; padding: 20px; width: 100%;">
          <tr>
            <td align="left">
              <table cellspacing="0" cellpadding="0" border="0"
                style="background-color: #fefefe; border-radius: 32px; max-width: 600px; width: 100%; box-shadow: 0px 5px 15px rgba(0, 0, 0, 0.1); margin: 0 auto; table-layout: fixed; padding: 0 50px;">

                <!-- Logo -->
                <tr>
                  <td style="padding: 50px 0; padding-bottom: 20px;" align="right">
                    <a href="https://dental.bio/login" style="text-decoration: none;">
                      <img src="https://cxqkuqtwrtgvoorxidvn.supabase.co/storage/v1/object/public/assets/logo%201.png"
                        alt="Dentalbio Logo" width="150" style="display: block; border: 0; margin-bottom: 20px;" />
                    </a>
                  </td>
                </tr>

                <!-- Heading -->
                <tr>
                  <td align="left">
                    <h1
                      style="font-size: 28px; font-weight: 300; color: #5046db; line-height: 1.5; margin: 0; padding-bottom: 30px;">
                      Your Free Trial is Ending Soon! ⏳
                    </h1>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 20px 0; text-align: left;">
                    <p style="font-size: 16px; color: #333; line-height: 1.6; margin: 0;">
                      👋 Hello <strong>${user.first_name}</strong>,
                    </p>
                    <p style="font-size: 16px; color: #333; line-height: 1.6; margin: 20px 0;">
                      Your Dentalbio trial for <strong style="color: #f1852f;">dental.bio/${user.username}</strong>
                      is ending in <strong>${daysLeft} days</strong>.
                    </p>
                    <p style="font-size: 16px; color: #333; line-height: 1.6; margin: 20px 0;">
                      Upgrade now to keep your profile live and unlock premium features!
                    </p>

                    <!-- Upgrade Button -->
                    <a href="https://${process.env.APP_URL}/upgrade"
                      style="display: inline-block; background-color: #5046db; color: #ffffff; font-size: 16px; font-weight: bold; text-decoration: none; padding: 12px 24px; border-radius: 6px; margin-top: 20px;">
                      Upgrade Now
                    </a>

                    <p style="font-size: 14px; color: #777; margin-top: 20px;">
                      Need help? Reply to this email or visit our
                      <a href="https://yourdomain.com/support" style="color: #5046db; text-decoration: none;">Support
                        Center</a>.
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="text-align: left; padding: 30px 0 70px;">
                    <p style="font-size: 14px; color: #888; margin: 0;">
                      <a href="https://dental.bio/login" style="text-decoration: none;">
                        <span style="color: #5046db; font-weight: bold; line-height: 1.7;">Dentalbio</span>
                      </a>
                      <br />
                      <span style="color: #fd8516;">Your dental identity, simplified.</span>
                    </p>
                    <p style="font-size: 12px; color: #aaa; margin-top: 20px;">
                      You received this email because you signed up for a Dentalbio account.
                    </p>
                    <p style="font-size: 12px; color: #aaa;">
                      Biocloud Ltd, 113 Crawford Street, London, W1H 2JG
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>

      </html>`,
      });
    }

    return NextResponse.json({ message: 'Emails sent!' }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}