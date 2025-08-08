import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import Stripe from 'stripe';
import { isEligibleForTrial, createOrExtendStripeTrial } from '@/utils/trialManagement';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-06-20',
});

const pricePro = process.env.PRICE_PRO_MONTHLY!;

const calculateAge = (birthday: Date) => {
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
        email,
        firstName,
        lastName,
        birthday,
        position,
        offerCode,
        otp,
        inviteUserName,
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
        const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/offer-code`, { method: 'GET' });
        const serverOfferCodes = await response.json();

        if (!response.ok) {
            return NextResponse.json({ error: "Can't get offerCode from the admin" }, { status: 400 });
        }

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

        // Ensure Stripe customer exists for this email
        let customerId: string | null = null;
        const existingCustomers = await stripe.customers.list({ email, limit: 1 });
        if (existingCustomers.data.length > 0) {
            customerId = existingCustomers.data[0].id;
        } else {
            const customer = await stripe.customers.create({ email, name: (`${firstName ?? ''} ${lastName ?? ''}`).trim() });
            customerId = customer.id;
        }

        // Determine eligibility using the user's id
        const eligible = existingCustomers.data.length === 0;

        let updatePayload: any = { customer_id: customerId };

        if (eligible) {
            // Create Stripe trial subscription
            const subscription = await createOrExtendStripeTrial({
                userId: existingUser.id,
                email,
                name: (`${firstName ?? ''} ${lastName ?? ''}`).trim(),
                priceId: pricePro,
                months: totalTrialMonths,
                metadata: trialMetadata
            });
            if (!subscription) {
                return NextResponse.json({ error: "Could not create trial subscription." }, { status: 500 });
            }

            const subscriptionId = subscription.id;
            const planId = subscription.items.data[0]?.price.id ?? null;
            const currentPeriodEnd = subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null;
            const trialEndDate = subscription.trial_end ? new Date(subscription.trial_end * 1000) : null;
            const subscriptionStatus = (subscription.status === 'trialing' || subscription.status === 'active') ? 'PRO' : 'FREE';

            updatePayload = {
                ...updatePayload,
                subscription_id: subscriptionId,
                plan_id: planId,
                current_period_end: currentPeriodEnd,
                trial_end: trialEndDate,
                subscription_status: subscriptionStatus,
            };
        }

        // Update the existing user row only
        const { error: updateError } = await supabase
            .from('users')
            .update(updatePayload)
            .eq('id', existingUser.id);

        if (updateError) {
            return NextResponse.json({ error: updateError.message }, { status: 400 });
        }

        return NextResponse.json({ message: eligible ? "User updated successfully (trial created)." : "User updated successfully." }, { status: 200 });
    } catch (err) {
        console.error("Error during registration:", err);
        return NextResponse.json({ error: "Unexpected error occurred." }, { status: 500 });
    }
} 