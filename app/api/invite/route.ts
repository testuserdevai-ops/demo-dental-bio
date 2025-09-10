import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(request: Request) {
    const url = new URL(request.url);
    const referral_username = url.searchParams.get("referral");
    const APP_URL = process.env.APP_URL || "http://localhost:3000";

    if (referral_username) {
        // Redirect to the register page with the referral ID
        return NextResponse.redirect(`${APP_URL}/register?referral=${referral_username}`);
    }

    // If no referral ID is present, you can redirect to a default page or return an error
    return NextResponse.redirect(`${APP_URL}/error?message=missing_referral`);
}

export async function POST(request: Request) {
    const { email, referralLink, name } = await request.json();

    if (!email) {
        return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    try {
        await resend.emails.send({
            from: "Dentalbio <noreply@dental.bio>",
            to: email,
            subject: "You're invited to join Dentalbio!",
            html: `
                <!DOCTYPE html>
                <html lang="en">

                <head>
                    <meta charset="UTF-8" />
                    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                    <title>You are invited!</title>
                    <style>
                        /* Button Styles */
                        .btn {
                            background-color: #5046db;
                            color: white !important;
                            padding: 14px 24px;
                            font-size: 16px;
                            font-weight: 600;
                            border-radius: 8px;
                            text-decoration: none;
                            display: inline-block;
                            margin-top: 30px;
                        }

                        .btn:hover {
                            background-color: #3e3bb1;
                        }
                    </style>
                </head>

                <body
                    style="background-color: #5046db; height: 100%; margin: 0; padding: 0; width: 100%; font-family: Arial, sans-serif;">
                    <table width="100%" cellspacing="0" cellpadding="0" border="0"
                        style="background-color: #5046db; margin: auto; padding-left: 10px; padding-right: 10px; width: 100%;">
                        <tr>
                            <td align="center" style="padding: 20px 0; width: 100%;">
                                <table cellspacing="0" cellpadding="0" border="0"
                                    style="background-color: #fefefe; border-radius: 32px; max-width: 600px; width: 100%; box-shadow: 0px 5px 15px rgba(0, 0, 0, 0.1); margin: 0 auto; table-layout: fixed;">
                                    <!-- Top Row with Logo -->
                                    <tr>
                                        <td style="padding: 50px">
                                            <table cellspacing="0" cellpadding="0" border="0" style="width: auto; margin-left: auto">
                                                <tr>
                                                    <td style="text-align: right">
                                                        <a href="https://dental.bio/login" style="text-decoration: none;">
                                                            <img src="https://cxqkuqtwrtgvoorxidvn.supabase.co/storage/v1/object/public/assets/logo%201.png" alt="Dentalbio Logo" width="150" style="display: block; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none;" />
                                                        </a>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                    <!-- Content Section -->
                                    <tr>
                                        <td style="padding: 0 50px;">
                                            <h1 style="font-size: 28px; font-weight: 300; color: #7646ff; line-height: 1.5; margin: 0;">
                                                ${name} invited you to join Dentalbio!
                                            </h1>
                                            <p style="font-size: 16px; font-weight: 400; color: #1c1c21; line-height: 1.7; margin-top: 50px;">
                                                👋 Hey there!
                                            </p>
                                            <p style="font-size: 16px; font-weight: 500; color: #1c1c21; line-height: 1.7; margin: 20px 0;">
                                                ${name} has invited you to join <b>Dentalbio!</b> If you upgrade to the Pro Plan, you'll
                                                both receive one month free.
                                                Alternatively, you can start with the Free Plan.
                                                <br /><br />
                                                Click the button below to sign up and get started!
                                            </p>

                                            <!-- Referral Link Button -->
                                            <p>
                                                <a href="${referralLink}" class="btn">Sign Up Now</a>
                                            </p>
                                        </td>
                                    </tr>
                                    <!-- Footer -->
                                    <tr>
                                        <td style="padding: 0 50px; text-align: left; padding-bottom: 50px;">
                                            <p style="font-size: 16px; color: #888888; margin-top: 30px;">
                                                <a href="https://dental.bio/login" style="text-decoration: none;">
                                                    <span style="color: #5046db; font-weight: bold; line-height: 1.7;">Dentalbio</span>
                                                </a>
                                                <br />
                                                <span style="color: #fd8516; line-height: 1.7; font-weight: 300;">Your dental identity,
                                                    simplified.</span>
                                            </p>
                                            <p style="color: #1c1c21; opacity: 40%; font-size: 12px; margin-top: 30px; line-height: 1.7;">
                                                You received this email because you were invited to create a Dentalbio account.
                                            </p>
                                            <p style="color: #1c1c21; opacity: 40%; font-size: 12px; margin-top: 14px; line-height: 1.7;">
                                                Biocloud Ltd, 113 Crawford Street, London, W1H 2JG
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </body>

                </html>
            `,
        });

        return NextResponse.json({ message: "Invite sent successfully." });
    } catch (error) {
        return NextResponse.json(
            { error: "Failed to send invite." },
            { status: 500 }
        );
    }
}
