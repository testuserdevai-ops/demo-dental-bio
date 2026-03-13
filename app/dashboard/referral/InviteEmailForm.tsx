"use client";

import React, { useState } from "react";
import FullRoundedButton from "@/app/components/Button/FullRoundedButton";
import { PaperPlane, CheckCircle } from "@phosphor-icons/react";
import { useMessage } from "@/app/contexts/MessageContext";
import LabeledInput from '../components/LabeledInput';
import { apiClient } from "@/services/apiClient";

interface ReferralButtonProps {
	referralLink: string,
	name: string,
}

const ReferralButton = ({ referralLink, name }: ReferralButtonProps) => {
	const { setNotificationMessage } = useMessage();

	const [email, setEmail] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [isSent, setIsSent] = useState(false);

	const handleInvite = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			setIsLoading(true);
			await apiClient.post("/api/invite", { email, referralLink, name });

			setIsSent(true);

			setTimeout(() => {
				setIsSent(false);
			}, 2000);
		} catch (err) {
			// Error handled silently
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div>
			<h2 className="text-lg font-semibold text-dark text-start w-full mt-6 mb-0">
				Send Invite Link
			</h2>

			<div className="text-sm text-gray-500 mb-2 ml-2">You can send your personalised referral link to a friend using the field below.</div>
			<form onSubmit={handleInvite} className="flex-col-gap">
				<LabeledInput
					label="Email"
					name="email"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
				/>
				<div className='flex justify-end'>
					<FullRoundedButton isLoading={isLoading} type='submit' className="flex gap-2">
						{isSent ? <CheckCircle size={24} /> : isLoading ? null : <PaperPlane size={24} />}
						{isSent ? "Sent!" : "Send Referral Link"}
					</FullRoundedButton>
				</div>
			</form>
		</div>
	);
};

export default ReferralButton;