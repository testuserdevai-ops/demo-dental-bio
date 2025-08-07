import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { Resend } from "resend";
import Stripe from 'stripe';
import { isEligibleForTrial, createOrExtendStripeTrial, isEligibleForTrialExtension, extendPaidPeriodOrTrial } from '@/utils/trialManagement';

const resend = new Resend(process.env.RESEND_API_KEY);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-06-20',
});

const pricePro = process.env.PRICE_PRO_MONTHLY!

const calculateAge = (birthday: Date) => {
    const today = new Date();
    const birthDate = new Date(birthday); // Convert birthday string to Date if necessary

    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDifference = today.getMonth() - birthDate.getMonth();

    // If the current month is before the birth month, or it's the birth month but the current day is before the birthday
    if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
        age--; // Subtract 1 from age
    }

    return age;
}

export async function POST(request: Request) {
    const supabase = createClient();
    const {
        email,
        password,
        username,
        firstName,
        lastName,
        birthday,
        position,
        offerCode,
        country,
        title,
        redirectUrl,
        inviteUserName,
        location
    } = await request.json();

    // Validate input data
    if (!email || !password || !username) {
        return NextResponse.json({ error: "All fields are required." }, { status: 400 });
    }

    try {
        // Check if email is already in use
        const { data: emailCheckData, error: emailCheckError } = await supabase
            .from("users")
            .select("email")
            .eq("email", email)
            .single();

        if (emailCheckError && emailCheckError.code !== "PGRST116") {
            return NextResponse.json({ error: "Error checking email availability." }, { status: 500 });
        }

        if (emailCheckData) {
            return NextResponse.json({ error: "Email is already in use." }, { status: 400 });
        }

        // Check if username is already taken
        const { data: usernameCheckData, error: usernameCheckError } = await supabase
            .from("users")
            .select("username")
            .ilike("username", username) // Case-insensitive check
            .single();

        if (usernameCheckError && usernameCheckError.code !== "PGRST116") {
            return NextResponse.json({ error: "Error checking username availability." }, { status: 500 });
        }

        if (usernameCheckData) {
            return NextResponse.json({ error: "Username is already taken." }, { status: 400 });
        }

        // Get offer codes from admin
        const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/offer-code`, { method: 'GET' })
        const serverOfferCodes = await response.json()

        if (!response.ok) {
            return NextResponse.json({ error: "Can't get offerCode from the admin" }, { status: 400 })
        }

        // Calculate base trial months
        const baseTrialMonths = (calculateAge(birthday) <= 27 && position === "Student" && serverOfferCodes.some((offer: any) => offer.offer_code === offerCode)) ? 6 : 3;

        // Check if inviteUserName exists and get referral user data
        let referralUser;
        let referralBonus = 0;
        if (inviteUserName) {
            const { data: inviteUserData, error: inviteUserError } = await supabase
                .from("users")
                .select("email, trial_end, current_period_end, subscription_status, subscription_id, customer_id, id, first_name")
                .eq("username", inviteUserName)
                .single();

            if (inviteUserError || !inviteUserData) {
                return NextResponse.json({ error: "Invalid referral link." }, { status: 400 });
            }
            referralUser = inviteUserData;
            referralBonus = 1; // 1 month bonus for referral
        }

        // Calculate total trial months
        const totalTrialMonths = baseTrialMonths + referralBonus;
        const trialMetadata = {
            trial_type: referralBonus > 0 ? 'referral' : (baseTrialMonths === 6 ? 'student_offer' : 'standard'),
            base_trial_months: baseTrialMonths.toString(),
            referral_bonus_months: referralBonus.toString(),
            total_trial_months: totalTrialMonths.toString()
        };

        // Check if user is eligible for trial (no paid sub, no previous trial)
        const eligible = await isEligibleForTrial(username);
        if (!eligible) {
            // User is not eligible for a trial (already paid or already had a trial)
            // Proceed with registration but do not create a trial in Stripe
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        username,
                        first_name: firstName,
                        last_name: lastName,
                        birthday,
                        position,
                        offer_code: offerCode,
                        subscription_status: "PRO", // or "FREE" if you want to mark as free
                        country,
                        title,
                        inviteUserName,
                        location
                    },
                    emailRedirectTo: redirectUrl,
                },
            });
            if (error) {
                return NextResponse.json({ error: error.message }, { status: 400 });
            }
            return NextResponse.json({ message: "User registered successfully (no trial)." }, { status: 200 });
        }

        // Create Stripe trial subscription
        const subscription = await createOrExtendStripeTrial({
            userId: username, // or userId if available
            email,
            name: (`${firstName} ${lastName}`).trim(),
            priceId: pricePro,
            months: totalTrialMonths,
            metadata: trialMetadata
        });
        if (!subscription) {
            return NextResponse.json({ error: "Could not create trial subscription." }, { status: 500 });
        }

        const trialEndDate = subscription.trial_end && new Date(subscription.trial_end * 1000);

        // Register user in Supabase (do not set trial/sub fields, let webhook do it)
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    username,
                    first_name: firstName,
                    last_name: lastName,
                    birthday,
                    position,
                    offer_code: offerCode,
                    subscription_status: "PRO", // will be updated by webhook
                    trial_end: trialEndDate,
                    country,
                    title,
                    inviteUserName,
                    location
                },
                emailRedirectTo: redirectUrl,
            },
        });
        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ message: "User registered successfully (trial created)." }, { status: 200 });
    } catch (err) {
        console.error("Error during registration:", err);
        return NextResponse.json({ error: "Unexpected error occurred." }, { status: 500 });
    }
}
