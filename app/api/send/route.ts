import { NextResponse } from "next/server";
import { createClient } from '@/utils/supabase/server';
import { extendPaidPeriodOrTrial } from '@/utils/trialManagement';
import { sendTemplateEmail } from "@/utils/mails/sendTemplateEmails";
import { sendUserRegisterredEmail } from "@/utils/mails/sendReportEmail";
import { getDomainConfig } from "@/utils/domainConfig";

interface EmailData {
  email: string;
  title: string;
  country: string;
  position: string;
  username: string;
  first_name: string;
  last_name: string;
  time: string;
  location: string;
  trialMonths: number;
  inviteUserName: string | null;
}

export async function POST(req: Request) {
  const {
    email,
    title,
    country,
    position,
    username,
    first_name,
    last_name,
    time,
    location,
    trialMonths,
    inviteUserName
  }: EmailData = await req.json();

  const supabase = createClient();
  const domainConfig = getDomainConfig(req.headers);

  try {
    // Handle referral bonus for the referrer (only after email verification)
    if (inviteUserName) {
      try {
        // Get referral user data
        const { data: referralUser, error: referralError } = await supabase
          .from("users")
          .select("email, trial_end, current_period_end, subscription_status, subscription_id, customer_id, id, first_name")
          .eq("username", inviteUserName)
          .single();

        if (referralUser && !referralError) {
          // Extend referrer's trial/paid period by 1 month
          const extensionSuccess = await extendPaidPeriodOrTrial(referralUser.id, 1);

          if (extensionSuccess) {
            await sendTemplateEmail({
              sendTo: referralUser.email,
              title: "You got 1 month free! 🎉",
              content: `
                <h1 style="font-size: 28px; font-weight: 300; color: #7646ff; line-height: 1.5; margin: 0;">
                  Great News! 🎉
                </h1>
                <p style="font-size: 16px; font-weight: 400; color: #1c1c21; line-height: 1.7; margin: 20px 0 0 0;">
                  Hello <b style="text-transform: capitalize;">${referralUser.first_name} </b>!
                </p>
                <p style="font-size: 16px; font-weight: 500; color: #1c1c21; line-height: 1.7; margin: 20px 0;">
                  We wanted to let you know that <b style="text-transform: capitalize;">${first_name}</b> has just signed up using your referral link! 
                  <br /><br />
                  You got 1 months Pro plan from the <b>${domainConfig.brandName}</b> community.
                </p>
                <p style="font-size: 16px; font-weight: 400; color: #1c1c21; line-height: 1.7; margin: 20px 0; margin-top: 30px;">
                  Thanks for sharing ${domainConfig.brandName}!
                </p>
              `
            }, domainConfig)
          }
        }
      } catch (error) {
        console.error('Error handling referral bonus:', error);
      }
    }

    // Get inviter data for welcome email
    const { data: inviterData, error: emailCheckError } = await supabase
      .from("users")
      .select("email, first_name, last_name")
      .eq("username", inviteUserName)
      .single();

    await sendTemplateEmail({
      sendTo: email,
      title: `${position === "Student" ? "Student Privileges Unlocked! " : ""}You've received PRO ${domainConfig.brandName} for ${trialMonths} month${trialMonths > 1 ? 's' : ''}!`,
      content: `
        <h1 style="font-size: 28px; font-weight: 300; color: #7646ff; line-height: 1.5; margin: 0;">
          Welcome to ${domainConfig.brandName}! 🎉
        </h1>
        <p style="font-size: 16px; font-weight: 400; color: #1c1c21; line-height: 1.7; margin: 50px 0 0 0;">
          👋 Hey ${first_name},
        </p>
        <p style="font-size: 16px; font-weight: 400; color: #1c1c21; line-height: 1.7; margin: 20px 0;">
          Your registration was successful! 🚀 You have secured your ${domainConfig.brandName} username:
        </p>
        <h2 style="font-size: 24px; font-weight: bold; color: #5046db; margin: 10px 0;">
          ${domainConfig.baseUrl.replace('https://', '')}/<span style="color: #f1852f;">${username}</span>
        </h2>
        <p style="font-size: 16px; font-weight: 400; color: #1c1c21; line-height: 1.7;">
          Username: <span style="color: #f1852f;">@${username}</span>
        </p>
        ${inviterData?.first_name ?
          `<p style="font-size: 16px; font-weight: 400; color: #1c1c21; line-height: 1.7; margin-top: 20px;">
          Signed up with <b style="text-transform: capitalize;">${inviterData?.first_name}</b>'s link? You've got a free ${trialMonths}-months Pro Plan.
          </p>` : ""}
      `
    }, domainConfig)

    // Send a plain text email to the admin
    if (email != "testuser.dev.ai@gmail.com") {
      sendUserRegisterredEmail({
        username,
        title,
        first_name,
        last_name,
        position,
        country,
        email,
        time,
        location
      })
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}
