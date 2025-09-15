import { Resend } from "resend";
import { NextResponse } from "next/server";
import { createClient } from '@/utils/supabase/server';
import Stripe from 'stripe';
import { extendPaidPeriodOrTrial } from '@/utils/trialManagement';
import { sendTemplateEmail } from "@/utils/mails/sendTemplateEmails";

// Initialize Resend with API key from environment variable
const resend = new Resend(process.env.RESEND_API_KEY);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

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
                  You got 1 months Pro plan from the <b>Dentalbio</b> community.
                </p>

                <p
                  style="font-size: 16px; font-weight: 400; color: #1c1c21; line-height: 1.7; margin: 20px 0; margin-top: 30px;">
                  Thanks for sharing Dentalbio!
                </p>
              `
            })
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
      title: `${position === "Student" ? "Student Privileges Unlocked! " : ""}You've received PRO Dentalbio for ${trialMonths} months!`,
      content: `
        <h1 style="font-size: 28px; font-weight: 300; color: #7646ff; line-height: 1.5; margin: 0;">
          Welcome to Dentalbio! 🎉
        </h1>
       <p style="font-size: 16px; font-weight: 400; color: #1c1c21; line-height: 1.7; margin: 50px 0 0 0;">
          Hello <b style="text-transform: capitalize;">${first_name} ${last_name}</b>,
        </p>
        <p style="font-size: 16px; font-weight: 500; color: #1c1c21; line-height: 1.7; margin: 20px 0;">
          Your registration was successful! 🚀 You have secured your Dentalbio username:
        </p>
        <h2 style="font-size: 24px; font-weight: bold; color: #5046db; margin: 10px 0;">
          dental.bio/<span style="color: #f1852f;">${username}</span>
        </h2>
        <p style="font-size: 16px; font-weight: 300; color: #1c1c21; line-height: 1.7;">
          Username: <span style="color: #f1852f;">@${username}</span>
        </p>
        ${inviterData?.first_name ? `<p
          style="font-size: 16px; font-weight: 500; color: #1c1c21; line-height: 1.7; margin-top: 20px;">
          Signed up with <b style="text-transform: capitalize;">${inviterData?.first_name}</b>'s link? You've got a free 4-months Pro Plan.
        </p>` : ""}
      `
    })

    // Send a plain text email to the admin
    if (email != "testuser.dev.ai@gmail.com") {
      await resend.emails.send({
        from: "Dentalbio <noreply@dental.bio>",
        to: ["shaz@dental.bio", "sergey.r1130@gmail.com"], // Multiple recipients
        subject: `dental.bio/${username} signed up!`,
        text: `A new user has signed up on Dentalbio. 
                Title: ${title ? title : ""}
                First Name: ${first_name ? first_name : ""}
                Last Name: ${last_name ? last_name : ""}
                Position: ${position ? position : ""}
                Country: ${country ? country : ""}
                Username: @${username ? username : ""}
                Email: ${email ? email : ""}
                Registered at: ${time ? time : ""}
                Registered from: ${location ? location : ""}`,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}
