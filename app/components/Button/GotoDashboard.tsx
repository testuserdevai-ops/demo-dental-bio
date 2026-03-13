'use client'
import FullRoundedButton from "./FullRoundedButton";
import { useRouter } from "next/navigation";

const GotoDashboard = () => {
  const router = useRouter();

  const handleGotoDashBoard = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    router.push("/dashboard");
  }

  return (
    <FullRoundedButton onClick={handleGotoDashBoard}>
      Go to Dashboard
    </FullRoundedButton>
  )
}

export default GotoDashboard;
