'use client'

import FullRoundedButton from "@/app/components/Button/FullRoundedButton";
import { useRouter } from 'next/navigation';  // Import useRouter

const DeleteBio: React.FC = () => {
    const router = useRouter();  // Initialize the router

    const handleDowngradeClick = () => {
        router.push('/upgrade');
    };

    return (
        <div>
            <h2 className="text-lg font-semibold text-dark text-start w-full mb-0">
                Downgrade this Bio
            </h2>

            <div className="text-sm text-gray-500 my-1">Once you downgrade your bio, some premium functionalities will no longer be available.</div>

            <div className="flex justify-end">
                <FullRoundedButton onClick={handleDowngradeClick} buttonType="danger" className="my-2">Downgrade Bio</FullRoundedButton>
            </div>
        </div>
    )
}

export default DeleteBio;
