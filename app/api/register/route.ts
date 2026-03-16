import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getBlockedDomain } from '@/utils/blockedDomains';
import { isBlockedFingerprint } from '@/utils/blockedFingerprints';
import { getClientIp, isBlockedIp } from '@/utils/blockedIps';
import { sendBlockedDomainAttemptEmail } from '@/utils/mails/sendReportEmail';

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
        location,
        deviceFingerprint,
    } = await request.json();

    const url = new URL(request.url)
	const baseUrl = url.origin;

    // Validate input data
    if (!email || !password || !username) {
        return NextResponse.json({ error: "All fields are required." }, { status: 400 });
    }

    try {
        // Check if email domain is blocked (disposable/temp email providers)
        const blockedDomain = await getBlockedDomain(email);
        if (blockedDomain) {
            sendBlockedDomainAttemptEmail({
                email,
                blocked_domain: blockedDomain,
                username,
                first_name: firstName,
                last_name: lastName,
                position,
                country,
                location,
                ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
                user_agent: request.headers.get('user-agent') || undefined,
                time: new Date().toISOString(),
                route: '/api/register',
            });
            return NextResponse.json({ error: "Registration from this email provider is not allowed. Please use a different email address." }, { status: 400 });
        }

        // Silently block registration from blocked device fingerprints or IPs
        const clientIp = getClientIp(request);
        const [fingerprintBlocked, ipBlocked] = await Promise.all([
            isBlockedFingerprint(deviceFingerprint),
            isBlockedIp(clientIp),
        ]);
        if (fingerprintBlocked || ipBlocked) {
            return NextResponse.json({ message: "User registered successfully. Please check your email for the verification code." }, { status: 200 });
        }

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
        const baseTrialMonths = (birthday && calculateAge(birthday) <= 27 && position === "Student" && serverOfferCodes.some((offer: any) => offer.offer_code === offerCode)) ? 6 : 1;
        const referralBonus = inviteUserName ? 1 : 0;
        const totalTrialMonths = baseTrialMonths + referralBonus;

        // Register user in Supabase; trial + Stripe details will be set after OTP verification
        // Note: The pre-checks above are for fast UX feedback. The DB unique constraints
        // are the actual guarantee against duplicates (handles race conditions).
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
            // Handle DB unique constraint violations that slipped past the pre-checks (race condition)
            const msg = error.message?.toLowerCase?.() ?? "";
            if (msg.includes("unique") || msg.includes("duplicate") || msg.includes("already")) {
                if (msg.includes("email")) {
                    return NextResponse.json({ error: "Email is already in use." }, { status: 400 });
                }
                if (msg.includes("username")) {
                    return NextResponse.json({ error: "Username is already taken." }, { status: 400 });
                }
            }
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ message: "User registered successfully. Please check your email for the verification code." }, { status: 200 });
    } catch (err) {
        console.error("Error during registration:", err);
        return NextResponse.json({ error: "Unexpected error occurred." }, { status: 500 });
    }
}
