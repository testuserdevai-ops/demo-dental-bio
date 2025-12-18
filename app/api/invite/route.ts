import { sendTemplateEmail } from "@/utils/mails/sendTemplateEmails";
import { getDomainConfig } from "@/utils/domainConfig";
import { NextResponse } from "next/server";

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
	const domainConfig = await getDomainConfig();

	if (!email) {
		return NextResponse.json({ error: "Email is required." }, { status: 400 });
	}

	try {
		await sendTemplateEmail({
			sendTo: email,
			title: `You're invited to join ${domainConfig.brandName}!`,
			content: `
				<h1 style="font-size: 28px; font-weight: 300; color: #7646ff; line-height: 1.5; margin: 0;">
						${name} invited you to join ${domainConfig.brandName}!
				</h1>
				<p style="font-size: 16px; font-weight: 400; color: #1c1c21; line-height: 1.7; margin-top: 50px;">
						👋 Hey there!
				</p>
				<p style="font-size: 16px; font-weight: 500; color: #1c1c21; line-height: 1.7; margin: 20px 0;">
						${name} has invited you to join <b>${domainConfig.brandName}!</b> If you upgrade to the Pro Plan, you'll
						both receive one month free.
						Alternatively, you can start with the Free Plan.
						<br /><br />
						Click the button below to sign up and get started!
				</p>

				<!-- Referral Link Button -->
				<p>
						<a href="${referralLink}" class="btn">Sign Up Now</a>
				</p>`
		})

		return NextResponse.json({ message: "Invite sent successfully." });
	} catch (error) {
		return NextResponse.json(
			{ error: "Failed to send invite." },
			{ status: 500 }
		);
	}
}
