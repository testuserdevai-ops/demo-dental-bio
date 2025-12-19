import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import Stripe from 'stripe';
import { createOrExtendStripeTrial, extendPaidPeriodOrTrial } from '@/utils/trialManagement';

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
    const supabase = createClient();
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
        domain,
        brand,
        vertical,
        offerCode,
        otp,
        inviteUserName,
    } = await request.json();

    const url = new URL(request.url)
    const baseUrl = url.origin

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

        // Get offer codes from admin (for student/referral trial logic)
        const offerCodesResponse = await fetch(`${baseUrl}/api/offer-code`, { method: 'GET' });
        if (!offerCodesResponse.ok) {
            return NextResponse.json({ error: "Can't get offerCode from the admin" }, { status: 400 });
        }
        const serverOfferCodes = await offerCodesResponse.json();

        // Calculate base trial months
        const baseTrialMonths = (birthday && calculateAge(birthday) <= 27 && position === "Student" && serverOfferCodes.some((offer: any) => offer.offer_code === offerCode)) ? 6 : 3;

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

        const emailData = {
            domain,
            brand,
            vertical,
            title,
            email,
            first_name: firstName,
            last_name: lastName,
            position,
            username,
            time,
            country: country || "Unknown",
            location: location || "Unknown",
            trialMonths: totalTrialMonths,
            inviteUserName
        };

        const sendResponse = await fetch(`${baseUrl}/api/send`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(emailData)
        });
        if (!sendResponse.ok) {
            // Do not fail the entire request for email issues; just log
            console.error('Failed to send welcome email');
        }

        return NextResponse.json({ message: subscription ? "User updated successfully (trial created)." : "User updated successfully." }, { status: 200 });
    } catch (err) {
        console.error("Error during registration:", err);
        return NextResponse.json({ error: "Unexpected error occurred." }, { status: 500 });
    }
} 