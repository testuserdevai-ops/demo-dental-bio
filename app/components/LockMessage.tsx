import IntroText from "./IntroText";
import { LockSimpleIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

const LockMessage = () => {
  return (
    <IntroText>
      <LockSimpleIcon size={22} />
      <Link
        href={"/upgrade"}
        target="_blank"
        className="no-underline cursor-pointer"
      >
        Upgrade your membership to unlock this feature
      </Link>
    </IntroText>
  );
};

export default LockMessage;
