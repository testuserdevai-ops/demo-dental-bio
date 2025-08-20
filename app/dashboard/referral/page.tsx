import React from "react"
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
// import { AdminServer } from "@/utils/functions/useAdminServer";
import { getEffectiveUserId } from "@/utils/user/getEffectiveUserId";
import { LockSimple } from "@phosphor-icons/react/dist/ssr";
import ReferralButton from "./ReferralButton";
import InviteEmailForm from "./InviteEmailForm"
import Link from 'next/link'

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
    // const isSixMonthsOrMore = () => {
    //     const createdAt = new Date(userData.created_at);
    //     const trialEnd = new Date(userData.trial_end);

    //     // Calculate the difference in months
    //     const diffInMonths = (trialEnd.getFullYear() - createdAt.getFullYear()) * 12 +
    //         (trialEnd.getMonth() - createdAt.getMonth());

    //     return userData.position === 'Student' && diffInMonths >= 6;
    // }

    const proAvailable = (userData.subscription_status === "PRO" || userData.subscription_status === "PREMIUM PRO");


    return (
        <div>
            {!proAvailable &&
                <>
                    <div className="flex justify-center gap-2 text-center bg-[#F7FAFC] p-2 rounded-[26px] text-gray-500 font-semibold my-4">
                        <LockSimple size={22} />
                        <Link href={'/upgrade'} target="_blank" className="no-underline cursor-pointer">
                            Upgrade your membership to unlock this feature
                        </Link>
                    </div>
                </>
            }
            <div className={`${proAvailable ? "pt-10" : "relative opacity-40"}`}>
                {!proAvailable &&
                    <div className="absolute w-full h-full top-0 left-0 z-10" />}
                {/* {isSixMonthsOrMore() &&
                    <div className="flex justify-center gap-2 text-center bg-[#F7FAFC] p-2 rounded-[26px] text-gray-500 font-semibold my-4">
                        Congrulates! You have unlocked pro plan for 6 months!
                    </div>
                } */}
                Enjoy a free month on your Pro plan every time someone signs up for a Pro plan using your referral link: <br />
                <a>
                    {referralLink}
                </a>
                <div className="flex justify-end">
                    <ReferralButton referralLink={referralLink} />
                </div>
                <InviteEmailForm referralLink={referralLink} name={userData.first_name} />
            </div>
        </div>
    )
}

export default Referral