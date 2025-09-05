import { useState, useEffect } from "react";

export default function useIsMobile(breakpoint = 1200) {
	const [isMobile, setIsMobile] = useState(false);

	useEffect(() => {
		// Function to check screen width
		const handleResize = () => {
			setIsMobile(window.innerWidth < breakpoint);
		};

		// Initial check
		handleResize();

		// Listen for window resize
		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, [breakpoint]);

	return isMobile;
}
