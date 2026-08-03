import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import Stripe from 'stripe';
import { createOrExtendStripeTrial, extendPaidPeriodOrTrial } from '@/utils/trialManagement';
import { sendTemplateEmail } from '@/utils/mails/sendTemplateEmails';
import { sendUserRegisterredEmail } from '@/utils/mails/sendReportEmail';
import { getDomainConfig } from '@/utils/domainConfig';
import { storeDeviceFingerprint } from '@/utils/blockedFingerprints';
import { getClientIp, storeUserIp } from '@/utils/blockedIps';
import supabaseAdmin from '@/utils/supabase/supabaseAdmin';
import { logSecurityEvent, getRequestMeta } from '@/utils/securityLogger';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-06-20',
});

const pricePro = process.env.PRICE_PRO_MONTHLY!;

const calculateAge = (birthday: string | Date) => {
    const today = new Date();
    const birthDate = new Date(birthday);

    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDifference = today.getMonth() - birthDate.getMonth();

    if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }

    return age;
};

export async function POST(request: Request) {
    const supabase = await createClient();
    const {
        title,
        username,
        email,
        password,
        firstName,
        lastName,
        birthday,
        position,
        country,
        location,
        offerCode,
        otp,
        inviteUserName,
        deviceFingerprint,
    } = await request.json();

    // Validate input data
    if (!email || !otp) {
        return NextResponse.json({ error: "Email and OTP are required." }, { status: 400 });
    }

    try {
        // Verify OTP
        const { error: otpError } = await supabase.auth.verifyOtp({
            email,
            token: otp,
            type: "email",
        });

        if (otpError) {
            return NextResponse.json({ error: "Invalid or expired OTP." }, { status: 400 });
        }

        await supabase.auth.updateUser({
            password
        })

        // Fetch the existing user row (insert is handled by Supabase trigger)
        let existingUser: { id: string; email: string } | null = null;
        for (let attempt = 0; attempt < 5; attempt++) {
            const { data, error } = await supabase
                .from('users')
                .select('id, email')
                .eq('email', email)
                .single();
            if (!error && data) {
                existingUser = data as any;
                break;
            }
            // Small delay to allow DB trigger to insert the row
            await new Promise((r) => setTimeout(r, 250));
        }
        if (!existingUser) {
            return NextResponse.json({ error: "User record not found yet. Please retry in a moment." }, { status: 404 });
        }

        // Check if user account is blocked
        const { data: blockedCheck } = await supabaseAdmin
            .from('users')
            .select('is_blocked')
            .eq('id', existingUser.id)
            .single();

        if (blockedCheck?.is_blocked) {
            const meta = getRequestMeta(request);
            logSecurityEvent({
                event_type: 'blocked_user',
                email, route: '/api/register/verify-otp',
                fingerprint: deviceFingerprint,
                ...meta,
                details: { blocked_user_id: existingUser.id },
            });
            // Return fake success so blocked user doesn't know
            return NextResponse.json({ message: "User registered successfully." }, { status: 200 });
        }

        // Store device fingerprint and IP for the user
        const clientIp = getClientIp(request);
        await Promise.all([
            storeDeviceFingerprint(existingUser.id, deviceFingerprint),
            storeUserIp(existingUser.id, clientIp),
        ]);

        // Get offer codes from admin (for student/referral trial logic)
        const baseUrl = new URL(request.url).origin;
        const offerCodesResponse = await fetch(`${baseUrl}/api/offer-code`, { method: 'GET' });
        if (!offerCodesResponse.ok) {
            return NextResponse.json({ error: "Can't get offerCode from the admin" }, { status: 400 });
        }
        const serverOfferCodes = await offerCodesResponse.json();

        // Calculate base trial months
        const baseTrialMonths = (birthday && calculateAge(birthday) <= 27 && position === "Student" && serverOfferCodes.some((offer: any) => offer.offer_code === offerCode)) ? 6 : 1;

        // Check referral bonus
        let referralBonus = 0;
        if (inviteUserName) {
            const { data: inviteUserData } = await supabase
                .from("users")
                .select("id")
                .eq("username", inviteUserName)
                .single();
            if (inviteUserData) {
                referralBonus = 1;

                // Give inviter 1 month of pro trial if referral exists
                await extendPaidPeriodOrTrial(inviteUserData.id, 1);
            }
        }

        // Calculate total trial months and metadata
        const totalTrialMonths = baseTrialMonths + referralBonus;
        const trialMetadata = {
            trial_type: referralBonus > 0 ? 'referral' : (baseTrialMonths === 6 ? 'student_offer' : 'standard'),
            base_trial_months: baseTrialMonths.toString(),
            referral_bonus_months: referralBonus.toString(),
            total_trial_months: totalTrialMonths.toString()
        };

        // Try to create a Stripe trial subscription (also ensures/uses a customer)
        const subscription = await createOrExtendStripeTrial({
            userId: existingUser.id,
            email,
            name: (`${firstName ?? ''} ${lastName ?? ''}`).trim(),
            priceId: pricePro,
            months: totalTrialMonths,
            metadata: trialMetadata
        });

        // Prepare update payload
        let updatePayload: any = {};
        if (subscription) {
            const subscriptionId = subscription.id;
            const planId = subscription.items.data[0]?.price.id ?? null;
            const currentPeriodEnd = subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null;
            const trialEndDate = subscription.trial_end ? new Date(subscription.trial_end * 1000) : null;
            const subscriptionStatus = (subscription.status === 'trialing' || subscription.status === 'active') ? 'PRO' : 'FREE';

            const stripeCustomerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;

            updatePayload = {
                customer_id: stripeCustomerId ?? null,
                subscription_id: subscriptionId,
                plan_id: planId,
                current_period_end: currentPeriodEnd,
                trial_end: trialEndDate,
                subscription_status: subscriptionStatus,
            };
        } else {
            // Not eligible or could not create subscription: still try to attach customer_id if exists
            const existingCustomers = await stripe.customers.list({ email, limit: 1 });
            if (existingCustomers.data.length > 0) {
                updatePayload.customer_id = existingCustomers.data[0].id;
            }
        }

        // Update the existing user row only
        const { error: updateError } = await supabase
            .from('users')
            .update(updatePayload)
            .eq('id', existingUser.id);

        if (updateError) {
            return NextResponse.json({ error: updateError.message }, { status: 400 });
        }

        // Get user time and location server-side
        const now = new Date();
        const time = now.toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
            timeZoneName: "short"
        });

        // Send emails directly (no external fetch to avoid unauthenticated endpoint)
        try {
            const domainConfig = getDomainConfig(request.headers);

            // Send referral bonus notification to the referrer
            if (inviteUserName) {
                try {
                    const { data: referralUser } = await supabase
                        .from("users")
                        .select("email, first_name")
                        .eq("username", inviteUserName)
                        .single();

                    if (referralUser) {
                        await sendTemplateEmail({
                            sendTo: referralUser.email,
                            title: "You got 1 month free!",
                            content: `
                                <h1 style="font-size: 28px; font-weight: 300; color: #7646ff; line-height: 1.5; margin: 0;">
                                  Great News!
                                </h1>
                                <p style="font-size: 16px; font-weight: 400; color: #1c1c21; line-height: 1.7; margin: 20px 0 0 0;">
                                  Hello <b style="text-transform: capitalize;">${referralUser.first_name} </b>!
                                </p>
                                <p style="font-size: 16px; font-weight: 500; color: #1c1c21; line-height: 1.7; margin: 20px 0;">
                                  We wanted to let you know that <b style="text-transform: capitalize;">${firstName}</b> has just signed up using your referral link!
                                  <br /><br />
                                  You got 1 months Pro plan from the <b>${domainConfig.brandName}</b> community.
                                </p>
                                <p style="font-size: 16px; font-weight: 400; color: #1c1c21; line-height: 1.7; margin: 20px 0; margin-top: 30px;">
                                  Thanks for sharing ${domainConfig.brandName}!
                                </p>
                            `
                        }, domainConfig);
                    }
                } catch (error) {
                    console.error('Error sending referral notification email:', error);
                }
            }

            // Get inviter data for welcome email
            const { data: inviterData } = await supabase
                .from("users")
                .select("email, first_name, last_name")
                .eq("username", inviteUserName)
                .single();

            // Send welcome email to the new user
            await sendTemplateEmail({
                sendTo: email,
                title: `${position === "Student" ? "Student Privileges Unlocked! " : ""}You've received PRO ${domainConfig.brandName} for ${totalTrialMonths} month${totalTrialMonths > 1 ? 's' : ''}!`,
                content: `
                    <h1 style="font-size: 28px; font-weight: 300; color: #7646ff; line-height: 1.5; margin: 0;">
                      Welcome to ${domainConfig.brandName}!
                    </h1>
                    <p style="font-size: 16px; font-weight: 400; color: #1c1c21; line-height: 1.7; margin: 50px 0 0 0;">
                      Hey ${firstName},
                    </p>
                    <p style="font-size: 16px; font-weight: 400; color: #1c1c21; line-height: 1.7; margin: 20px 0;">
                      Your registration was successful! You have secured your ${domainConfig.brandName} username:
                    </p>
                    <h2 style="font-size: 24px; font-weight: bold; color: #5046db; margin: 10px 0;">
                      ${domainConfig.baseUrl.replace('https://', '')}/<span style="color: #f1852f;">${username}</span>
                    </h2>
                    <p style="font-size: 16px; font-weight: 400; color: #1c1c21; line-height: 1.7;">
                      Username: <span style="color: #f1852f;">@${username}</span>
                    </p>
                    ${inviterData?.first_name ?
                      `<p style="font-size: 16px; font-weight: 400; color: #1c1c21; line-height: 1.7; margin-top: 20px;">
                      Signed up with <b style="text-transform: capitalize;">${inviterData?.first_name}</b>'s link? You've got a free ${totalTrialMonths}-months Pro Plan.
                      </p>` : ""}
                `
            }, domainConfig);

            // Send admin notification email
            if (email !== "testuser.dev.ai@gmail.com") {
                sendUserRegisterredEmail({
                    username,
                    title,
                    first_name: firstName,
                    last_name: lastName,
                    position,
                    country: country || "Unknown",
                    email,
                    time,
                    location: location || "Unknown"
                });
            }
        } catch (emailError) {
            // Do not fail the entire request for email issues; just log
            console.error('Failed to send welcome email:', emailError);
        }

        return NextResponse.json({ message: subscription ? "User updated successfully (trial created)." : "User updated successfully." }, { status: 200 });
    } catch (err) {
        console.error("Error during registration:", err);
        return NextResponse.json({ error: "Unexpected error occurred." }, { status: 500 });
    }
} 