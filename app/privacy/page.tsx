import React, { Suspense } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Link from "next/link";

export default function Privacy() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Navbar />

      <div className="flex flex-col items-center justify-start h-full w-full overflow-x-clip pt-44 px-10 md:px-20">
        <div className="flex justify-start items-center min-h-screen">
          <div className="rounded-lg max-w-4xl">
            <h1 className="text-[23px] md:text-[26px] font-semibold mb-6 text-gray-800">
              Privacy Notice
            </h1>

            <p className="mb-4 text-gray-600">
              Effective Date: September 15, 2024
            </p>

            <p className="mb-4 text-gray-600">
              At Dentalbio, your privacy is important to us. We only collect the
              information necessary to provide our services to you. This Privacy
              Notice explains what data we collect, how we use it, and your
              rights regarding your information.
            </p>

            <h2 className="text-xl font-semibold mb-3 text-gray-800">
              1. Information We Collect
            </h2>
            <p className="mb-4 text-gray-600">
              We collect the following information when you interact with us:
            </p>
            <ul className="list-disc list-inside mb-4 text-gray-600">
              <li>Your name</li>
              <li>Your email address</li>
            </ul>

            <h2 className="text-xl font-semibold mb-3 text-gray-800">
              2. How We Use Your Information
            </h2>
            <p className="mb-4 text-gray-600">
              The information we collect is used solely to:
            </p>
            <ul className="list-disc list-inside mb-4 text-gray-600">
              <li>Manage and provide the services you have requested</li>
              <li>
                Send transactional emails related to your account or services
              </li>
              <li>Occasionally notify you about relevant events or updates</li>
            </ul>

            <h2 className="text-xl font-semibold mb-3 text-gray-800">
              3. No Sharing of Information
            </h2>
            <p className="mb-4 text-gray-600">
              We respect your privacy. Dentalbio does not share, sell, or
              disclose your personal information to third parties for any
              reason. Your data is safe with us.
            </p>

            <h2 className="text-xl font-semibold mb-3 text-gray-800">
              4. Data Security
            </h2>
            <p className="mb-4 text-gray-600">
              We use industry-standard security measures to protect your
              personal data. However, no online service is 100% secure, but we
              make every effort to keep your information safe.
            </p>

            <h2 className="text-xl font-semibold mb-3 text-gray-800">
              5. Your Rights
            </h2>
            <p className="mb-4 text-gray-600">
              You have the right to access, correct, or request deletion of your
              personal data. If you'd like to make any changes or have concerns,
              please reach out to us.
            </p>

            <p className="mb-4 text-gray-600">
              If you have any questions about our Privacy Notice, feel free to
              contact us at{" "}
              <Link
                href="mailto:support@dental.bio"
                className="text-blue-600 hover:underline"
              >
                support@dental.bio
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </Suspense>
  );
}
