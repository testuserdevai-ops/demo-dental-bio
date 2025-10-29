import React from "react"
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getEffectiveUserId } from "@/utils/user/getEffectiveUserId";
import ReferralButton from "./ReferralButton";
import InviteEmailForm from "./InviteEmailForm"
import LabeledInput from "../components/LabeledInput";
import LockMessage from "@/app/components/LockMessage";
import IntroText from "@/app/components/IntroText";

export const metadata = {
	title: "Get one month free!",
	description: 'Get one month free on your Pro Plan for each friend you refer. Your friend will also receive one month free when they sign up using your link. There’s no limit to how many friends you can refer!'
};

const Referral = async ({ searchParams }: { searchParams: { userId?: string } }) => {
	const supabase = createClient();
	const targetUserId = searchParams.userId;

	const userId = await getEffectiveUserId({ supabase, targetUserId });

	const { data: userData, error: userError } = await supabase
		.from("users")
		.select("username, subscription_status, role, first_name, created_at, trial_end, position")
		.eq("id", userId)
		.single();

	if (!userData)
		return redirect("/dashboard");

	const referralLink = `${process.env.APP_URL}/api/invite?referral=${userData.username}`

	const proAvailable = (userData.subscription_status === "PRO" || userData.subscription_status === "PREMIUM PRO");

	return (
		<div className="flex flex-col gap-3">
			{!proAvailable && <LockMessage />}
			<div className={`${proAvailable ? "" : "opacity-40"}`}>
				{!proAvailable &&
					<div className="absolute w-full h-full top-0 left-0 z-10" />}

				<IntroText>Enjoy a free month on your Pro plan every time someone signs up for a Pro plan using your referral link</IntroText>
				<h2 className="text-lg font-semibold text-dark text-start w-full mt-6 mb-3">
					Referral Link:
				</h2>
				<LabeledInput
					label="Referral Link"
					name="referralLink"
					value={referralLink}
					readOnly={true}>
				</LabeledInput>
				<div className="flex justify-end">
					<ReferralButton referralLink={referralLink} />
				</div>
				<InviteEmailForm referralLink={referralLink} name={userData.first_name} />
			</div>
		</div>
	)
}

export default Referral