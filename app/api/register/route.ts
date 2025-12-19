import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

const calculateAge = (birthday: string | Date) => {
    const today = new Date();
    const birthDate = new Date(birthday);

    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDifference = today.getMonth() - birthDate.getMonth();

    if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
        age--;
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

    const url = new URL(request.url)
	const baseUrl = url.origin;

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
            .ilike("username", username)
            .single();

        if (usernameCheckError && usernameCheckError.code !== "PGRST116") {
            return NextResponse.json({ error: "Error checking username availability." }, { status: 500 });
        }

        if (usernameCheckData) {
            return NextResponse.json({ error: "Username is already taken." }, { status: 400 });
        }

        // Get offer codes from admin for client info only (trial will be handled post-verify)
        const response = await fetch(`${baseUrl}/api/offer-code`, { method: 'GET' });
        if (!response.ok) {
            return NextResponse.json({ error: "Can't get offerCode from the admin" }, { status: 400 });
        }
        const serverOfferCodes = await response.json();

        // Calculate base trial months to store as signup metadata (actual creation happens after OTP)
        const baseTrialMonths = (birthday && calculateAge(birthday) <= 27 && position === "Student" && serverOfferCodes.some((offer: any) => offer.offer_code === offerCode)) ? 6 : 3;
        const referralBonus = inviteUserName ? 1 : 0;
        const totalTrialMonths = baseTrialMonths + referralBonus;

        // Register user in Supabase; trial + Stripe details will be set after OTP verification
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
                    country,
                    title,
                    inviteUserName,
                    location,
                    intended_trial_months: totalTrialMonths
                },
                emailRedirectTo: redirectUrl,
            },
        });
        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ message: "User registered successfully. Please check your email for the verification code." }, { status: 200 });
    } catch (err) {
        console.error("Error during registration:", err);
        return NextResponse.json({ error: "Unexpected error occurred." }, { status: 500 });
    }
}
