import React, { Suspense } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { getDomainConfig } from "@/utils/domainConfig";
import { headers } from "next/headers";

export default async function Terms() {
  const headersList = headers();
  const domainConfig = getDomainConfig(headersList);

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Navbar />

      <div className="flex flex-col items-center justify-start h-full w-full overflow-x-clip pt-44 px-10 md:px-20">
        <div className="flex justify-start items-center min-h-screen">
          <div className="rounded-lg max-w-4xl">
            <h1 className="text-[23px] md:text-[26px] font-semibold mb-6 text-gray-800">
              Terms & Conditions
            </h1>

            <p className="mb-4 text-gray-600">Terms last updated: 23rd September 2024</p>
            <p className="mb-4 text-gray-600">
              {domainConfig.brandName} is a platform designed to help {domainConfig.vertical} professionals create and manage online profiles, offering a centralised hub where users can share relevant content and links. We aim to keep things straightforward, so these terms and conditions ("Terms") explain how you can use {domainConfig.brandName} and its related services.
            </p>

            <h2 className="text-xl font-semibold mb-3 text-gray-800">Welcome to {domainConfig.brandName}!</h2>
            <p className="mb-4 text-gray-600">
              We are delighted that you’ve chosen to use {domainConfig.brandName}. These Terms, alongside our associated policies, govern your use of the services provided via our website (https://{domainConfig.domain}), apps, and associated tools or features (collectively, the "Platform" or "{domainConfig.brandName}"). By using {domainConfig.brandName}, you agree to comply with these Terms as well as any additional policies linked within the Platform.
            </p>
            <p className="mb-4 text-gray-600">
              When we refer to "we," "our," or "us," we mean Biocloud Ltd (company number: 15869715, registered at 113 Crawford Street, London, W1H 2JG), the legal entity that owns {domainConfig.brandName}. If you disagree with any part of these Terms, please refrain from using {domainConfig.brandName}. We recommend you carefully read through these Terms, and if you have any questions, feel free to reach out to us at support@dental.bio.
            </p>

            <h2 className="text-xl font-semibold mb-3 text-gray-800">Changes to These Terms</h2>
            <p className="mb-4 text-gray-600">
              {domainConfig.brandName} may evolve over time as we enhance our services and add new features. Occasionally, we may need to update these Terms to reflect platform changes, legal updates, or other business reasons. When we make changes, we will post the revised Terms on our Platform, and it is your responsibility to review them periodically.
            </p>
            <p className="mb-4 text-gray-600">
              If a significant change is made that could negatively impact your use of {domainConfig.brandName}, we will try to notify you at least 30 days in advance, typically through an in-platform notification. Your continued use of the Platform following any changes indicates your acceptance of the updated Terms. If you do not agree with the updated Terms, we advise you to discontinue using {domainConfig.brandName} and close your account.
            </p>

            <h2 className="text-xl font-semibold mb-3 text-gray-800">Creating an Account</h2>
            <p className="mb-4 text-gray-600">
              To use {domainConfig.brandName}, you must create an account. You must be at least 18 years old to register for an account, and by doing so, you confirm that you have the legal capacity to agree to these Terms. If you are creating an account on behalf of a business or another individual, you confirm that you are authorised to bind them to these Terms.
            </p>
            <p className="mb-4 text-gray-600">
              You agree to provide accurate and current information when creating your account and to keep this information up to date. You are responsible for maintaining the confidentiality of your account details, including your password, and for any actions taken using your account. If you suspect unauthorised use of your account, please notify us immediately at support@dental.bio.
            </p>
            <p className="mb-4 text-gray-600">
              Your account is personal to you, and you may not transfer or assign it to another person without our prior written consent. Misuse of your account that damages our reputation or violates any laws may result in suspension or termination of your access to the Platform.
            </p>

            <h2 className="text-xl font-semibold mb-3 text-gray-800">Choosing a Username</h2>
            <p className="mb-4 text-gray-600">
              When creating your {domainConfig.brandName} profile, you will select a username. It is important that this username respects the rights of others and is not offensive or misleading. You must avoid using names that belong to another person or entity (such as celebrities or brands) or choosing a username with the intention of reselling it (commonly referred to as "cybersquatting").
            </p>
            <p className="mb-4 text-gray-600">
              If we believe your username violates these guidelines or infringes on another's rights, we may ask you to choose a new one or, in certain cases, reassign it. If you do not comply, we may suspend or terminate your account. If a third party claims that your username infringes their intellectual property (IP) rights, you will have the opportunity to respond to their claims in accordance with applicable IP laws.
            </p>
            <p className="mb-4 text-gray-600">
              If your account remains inactive for six months or more, we reserve the right to reclaim or reassign your username. Before taking this action, we will try to contact you using the information linked to your account.
            </p>

            <h2 className="text-xl font-semibold mb-3 text-gray-800">Managing Your Plan</h2>
            <p className="mb-4 text-gray-600">
              {domainConfig.brandName} offers both free and paid subscription plans. Your subscription begins when you accept these Terms and continues until you cancel it. You can cancel your paid plan at any time, and unless otherwise required by law, payments are non-refundable. If you cancel, your account will revert to the free plan at the end of your current billing cycle.
            </p>
            <p className="mb-4 text-gray-600">
              If you purchased your subscription through a third-party service like Apple’s App Store or Google Play, you must cancel your subscription directly through that service. {domainConfig.brandName} cannot process refunds for purchases made through external platforms. You may also request a refund from the applicable service provider by following their guidelines.
            </p>
            <p className="mb-4 text-gray-600">
              If you decide to permanently delete your account, you can do so from your account settings. Please note that once your account is deleted, you will lose access to any content or information associated with it, and this action is irreversible.
            </p>

            <h2 className="text-xl font-semibold mb-3 text-gray-800">Your Content</h2>
            <p className="mb-4 text-gray-600">
              {domainConfig.brandName} allows you to post a variety of content, including links, text, videos, and other materials. By uploading content to your profile, you represent that:
            </p>
            <ul className="list-disc list-inside mb-4 text-gray-600">
              <li>You either own the content or have the necessary permissions to post it;</li>
              <li>Your content does not violate anyone’s privacy, intellectual property, or other rights;</li>
              <li>Your content is accurate, not misleading, and complies with all applicable laws and our Community Guidelines;</li>
              <li>Your content does not contain viruses, harmful code, or disruptive elements that could harm the Platform or other users;</li>
              <li>You will not use the Platform to post unsolicited advertisements or promotional materials;</li>
              <li>Your content aligns with our community standards and policies.</li>
            </ul>
            <p className="mb-4 text-gray-600">
              We reserve the right to remove any content that violates these Terms or applicable laws. In certain cases, we may restrict access to your profile or apply a sensitive content warning if we deem your content inappropriate for all audiences.
            </p>

            <h2 className="text-xl font-semibold mb-3 text-gray-800">7. What We Can Do with Your Content</h2>
            <p className="mb-4 text-gray-600">
              By posting content on your {domainConfig.brandName} profile, you grant us a worldwide, royalty-free, perpetual, non-exclusive licence to use, display, distribute, modify, and adapt your content. This licence allows us to feature your content across the Platform, and in our marketing and promotional activities, both on {domainConfig.brandName} and other media channels.
            </p>
            <p className="mb-4 text-gray-600">
              You retain ownership of all rights to your content, but by posting it on {domainConfig.brandName}, you agree that:
            </p>
            <ul className="list-disc list-inside mb-4 text-gray-600">
              <li>We may use your content in connection with our business operations;</li>
              <li>We are not required to pay you or any third parties for using your content;</li>
              <li>Your content may be publicly accessible, and other users or third parties may share or reuse it, including beyond {domainConfig.brandName};</li>
              <li>We may modify or remove your content if it violates these Terms, our Community Guidelines, or applicable laws.</li>
            </ul>

            <h2 className="text-xl font-semibold mb-3 text-gray-800">8. Monetising Your Content</h2>
            <p className="mb-4 text-gray-600">
              {domainConfig.brandName} offers monetisation features that allow users to generate income through their profiles. If you are eligible for any monetisation programme, we will notify you via email or through your profile dashboard.
            </p>
            <p className="mb-4 text-gray-600">
              Here are the key requirements and conditions for accessing monetisation features:
            </p>
            <ul className="list-disc list-inside mb-4 text-gray-600">
              <li>Eligibility: You must reside in a country where monetisation features are available, and you must have verified your email address. If you move to a country where monetisation is not available, your access to these features may be revoked.</li>
              <li>Account Standing: To maintain access to monetisation, your account must comply with these Terms and our Community Guidelines. Any violations could result in the suspension or removal of monetisation privileges.</li>
              <li>Commission: {domainConfig.brandName} may negotiate commission rates for affiliate sales or transactions conducted through the Platform. These rates will be displayed in your account dashboard and are subject to change at our discretion.</li>
              <li>Transparency: You are legally required to disclose any commissions, partnerships, or sponsorships in your profile content.</li>
            </ul>
            <p className="mb-4 text-gray-600">
              {domainConfig.brandName} is not responsible for any third-party commissions or transactions conducted through external affiliate networks or payment providers. You are responsible for managing these relationships independently.
            </p>

            <h2 className="text-xl font-semibold mb-3 text-gray-800">9. Payouts for Monetisation</h2>
            <p className="mb-4 text-gray-600">
              If you participate in {domainConfig.brandName}’s monetisation features, you will receive monthly payouts for eligible funds earned through commission-based transactions. These payouts will be made via third-party payment processors such as PayPal or Stripe. You are required to complete any necessary "Know Your Customer" (KYC) processes to receive funds through these platforms.
            </p>
            <p className="mb-4 text-gray-600">
              {domainConfig.brandName} will only pay out "closed commissions," which means transactions that are final and irreversible. Pending commissions that have not been finalised may not be paid out. In the event of account termination, you will receive payouts for closed commissions up to the date of termination, but pending commissions may be forfeited.
            </p>
            <p className="mb-4 text-gray-600">
              Please be aware that fees, taxes, and other external charges may apply to your transactions, and you are responsible for ensuring compliance with your local tax obligations. {domainConfig.brandName} is not responsible for any withholding taxes, income taxes, or other financial obligations arising from your use of the Platform.
            </p>

            <h2 className="text-xl font-semibold mb-3 text-gray-800">10. Suspension or Termination of Your Account</h2>
            <p className="mb-4 text-gray-600">
              If you breach these Terms, fail to comply with our Community Guidelines, or violate any applicable laws, {domainConfig.brandName} reserves the right to suspend or terminate your account. Depending on the nature and severity of the breach, we may take action including, but not limited to:
            </p>
            <ul className="list-disc list-inside mb-4 text-gray-600">
              <li>Temporary suspension of your account;</li>
              <li>Removal of specific content from your profile;</li>
              <li>Limitation or removal of access to monetisation features;</li>
              <li>Permanent termination of your account.</li>
            </ul>
            <p className="mb-4 text-gray-600">
              We will endeavour to notify you before taking any action, although this is not always possible. If your account is terminated, you will lose access to any content or features associated with it, and any pending monetisation payouts may be forfeited. You will not receive a refund for any payments made before the termination of your account.
            </p>
            <p className="mb-4 text-gray-600">
              If you believe your account has been wrongfully suspended or terminated, you may contact us at support@dental.bio. We are committed to resolving disputes in good faith, and we encourage open communication before pursuing legal action. Both parties agree to make reasonable efforts to resolve any disputes for at least 30 days before considering litigation.
            </p>

            <h2 className="text-xl font-semibold mb-3 text-gray-800">11. Your Responsibility for End Users</h2>
            <p className="mb-4 text-gray-600">
              As a {domainConfig.brandName} user, you are solely responsible for your profile visitors and any customers who engage with your content or purchase goods or services through your profile (collectively referred to as "End Users"). You are responsible for:
            </p>
            <ul className="list-disc list-inside mb-4 text-gray-600">
              <li>Ensuring compliance with applicable laws and regulations regarding transactions and interactions with End Users;</li>
              <li>Providing accurate, clear, and honest information about the goods or services you offer;</li>
              <li>Managing disputes, refunds, and any issues that arise from transactions with End Users.</li>
            </ul>
            <p className="mb-4 text-gray-600">
              {domainConfig.brandName} is not responsible for any products or services sold through your profile, nor are we responsible for any donations collected via features like the "Support Me" option. Donations must be voluntary and cannot be used as a substitute for selling goods or services unless clearly stated.
            </p>

            <h2 className="text-xl font-semibold mb-3 text-gray-800">12. Feedback and Beta Features</h2>
            <p className="mb-4 text-gray-600">
              We appreciate any feedback you provide to help improve {domainConfig.brandName}. From time to time, we may offer you access to beta features or experimental tools to test new functionality. By providing feedback or using beta features, you agree that we can use your suggestions or insights without compensating you.
            </p>
            <p className="mb-4 text-gray-600">
              Beta features are in development, so they may not be fully functional or reliable. Your use of these features is at your own risk, and we may discontinue or modify them at any time.
            </p>

            <h2 className="text-xl font-semibold mb-3 text-gray-800">13. Fees and Payments</h2>
            <p className="mb-4 text-gray-600">
              If you opt for a paid plan on {domainConfig.brandName}, you agree to the applicable subscription fees and any related charges. Fees are generally displayed in GBP (British Pounds) and include taxes such as VAT, unless specified otherwise. Your subscription will start when you accept these Terms and will be billed in advance, either monthly or annually, depending on the plan you choose.
            </p>
            <p className="mb-4 text-gray-600">
              <strong>Subscription Renewal:</strong> Your paid plan will automatically renew at the end of each billing cycle unless you cancel it before the renewal date. Upon renewal, the updated fees and Terms will apply.
            </p>
            <p className="mb-4 text-gray-600">
              <strong>Payment Methods:</strong> You must provide valid payment information, such as a credit or debit card, when signing up for a paid plan. By doing so, you authorise us to charge the applicable fees to your chosen payment method. If a payment fails, you will receive a notice to resolve the issue within a specified period to avoid a disruption in your service.
            </p>
            <p className="mb-4 text-gray-600">
              <strong>Transaction Fees:</strong> Certain features on {domainConfig.brandName}, such as monetisation tools, may include transaction fees. These are percentage-based and will be deducted from the transaction amount before funds are credited to your account. These fees are dependent on your subscription plan and are detailed on our pricing page. Transaction fees are in addition to any external fees charged by third-party payment processors like Stripe or PayPal.
            </p>
            <p className="mb-4 text-gray-600">
              <strong>External Fees:</strong> Payment processing services may impose additional fees for transactions, which will be deducted before you receive payment. {domainConfig.brandName} is not responsible for these external fees, and it is your responsibility to review and accept the terms and fees imposed by third-party payment processors.
            </p>
            <p className="mb-4 text-gray-600">
              <strong>Fee Changes:</strong> {domainConfig.brandName} reserves the right to change its subscription or transaction fees. We will notify you at least one month before any fee changes take effect. If you do not agree with the new fees, you have the option to cancel your plan before the next billing cycle begins.
            </p>

            <h2 className="text-xl font-semibold mb-3 text-gray-800">14. Taxes and Compliance</h2>
            <p className="mb-4 text-gray-600">
              As a {domainConfig.brandName} user, you are responsible for complying with all applicable tax obligations in your country. This includes any taxes related to your earnings through the Platform, such as income taxes or VAT. You must ensure that you fulfil any reporting or tax filing requirements imposed by your local authorities. {domainConfig.brandName} is not responsible for withholding or paying taxes on your behalf.
            </p>
            <p className="mb-4 text-gray-600">
              If you fail to meet your legal tax obligations, {domainConfig.brandName} will not be held liable for any penalties or losses you incur.
            </p>

            <h2 className="text-xl font-semibold mb-3 text-gray-800">15. Privacy and Data Protection</h2>
            <p className="mb-4 text-gray-600">
              Your privacy is important to us. {domainConfig.brandName} collects and processes personal data in accordance with our Privacy Policy, which outlines how we handle your personal information. By using {domainConfig.brandName}, you agree to the terms of our Privacy Policy and understand that your data may be collected and used as described therein.
            </p>
            <p className="mb-4 text-gray-600">
              <strong>Personal Data:</strong> We may collect data such as your name, email address, payment details, and other information necessary to operate your account. Additionally, we may collect data on your usage of the Platform, including interactions with other users, links clicked, and content viewed.
            </p>
            <p className="mb-4 text-gray-600">
              <strong>Data Processing:</strong> We process personal data for the purposes of providing and improving the Platform, managing accounts, processing payments, and communicating with you about our services. All data processing is done in accordance with the General Data Protection Regulation (GDPR) and other applicable laws.
            </p>
            <p className="mb-4 text-gray-600">
              <strong>Third-Party Services:</strong> {domainConfig.brandName} may use third-party service providers for payment processing, email communication, analytics, or other essential functions. We ensure that these providers adhere to privacy and data protection regulations. However, your interactions with these third-party services may be subject to their own terms and policies, and {domainConfig.brandName} is not responsible for how these third parties handle your data.
            </p>
            <p className="mb-4 text-gray-600">
              <strong>User Consent:</strong> By using {domainConfig.brandName}, you consent to the collection and processing of your personal data as described in our Privacy Policy. You also acknowledge that data analytics provided to you may not always be 100% accurate or complete, but we strive to provide you with the most accurate data possible.
            </p>

            <h2 className="text-xl font-semibold mb-3 text-gray-800">16. Confidential Information</h2>
            <p className="mb-4 text-gray-600">
              During your use of {domainConfig.brandName}, we may share confidential information with you, such as upcoming features or beta releases. You agree to keep such information confidential and not disclose it to any third parties without our written consent. You must take reasonable measures to protect this information from unauthorised access or disclosure.
            </p>
            <p className="mb-4 text-gray-600">
              If we explicitly permit the public sharing of certain information (such as a beta feature you’re testing), we will let you know.
            </p>

            <h2 className="text-xl font-semibold mb-3 text-gray-800">17. Intellectual Property and Platform Use</h2>
            <p className="mb-4 text-gray-600">
              The content, design, and functionality of the {domainConfig.brandName} Platform are protected by copyright, trademark, and other intellectual property laws. Unless otherwise stated, all rights, titles, and interest in the Platform, including the software, features, and content, belong to Biocloud Ltd.
            </p>
            <p className="mb-4 text-gray-600">
              <strong>Licence to Use:</strong> We grant you a limited, revocable, non-exclusive, and non-transferable licence to use {domainConfig.brandName} for creating and sharing your profile and content, subject to these Terms. You may not copy, distribute, modify, or reverse-engineer any part of the Platform without our prior written consent.
            </p>
            <p className="mb-4 text-gray-600">
              <strong>Prohibited Use:</strong> You are not permitted to use {domainConfig.brandName} in any way that infringes on our intellectual property rights or those of others. This includes, but is not limited to, using our brand name, logo, or other proprietary elements without permission.
            </p>
            <p className="mb-4 text-gray-600">
              <strong>Third-Party Content:</strong> When using {domainConfig.brandName}, you may encounter content, links, or services provided by third parties. We do not control or endorse third-party content and are not responsible for any actions or losses resulting from your interaction with such content.
            </p>

            <h2 className="text-xl font-semibold mb-3 text-gray-800">18. Limitation of Liability</h2>
            <p className="mb-4 text-gray-600">
              {domainConfig.brandName} is provided "as is" and "as available," without any warranties, express or implied. We make no guarantees about the uptime, functionality, or performance of the Platform, and we are not responsible for any damages or losses you may experience from using {domainConfig.brandName}, including but not limited to:
            </p>
            <ul className="list-disc list-inside mb-4 text-gray-600">
              <li>Loss of data or content;</li>
              <li>Downtime or interruptions in service;</li>
              <li>Inaccuracies or errors in the Platform;</li>
              <li>Any harm resulting from your reliance on information or content available through the Platform.</li>
            </ul>
            <p className="mb-4 text-gray-600">
              To the fullest extent permitted by law, {domainConfig.brandName} and Biocloud Ltd will not be liable for any indirect, incidental, or consequential damages arising from your use of the Platform. In the event of a claim, our total liability will not exceed the amount you have paid to {domainConfig.brandName} in the 12 months preceding the claim, or £100, whichever is greater.
            </p>

            <h2 className="text-xl font-semibold mb-3 text-gray-800">19. Disclaimers</h2>
            <p className="mb-4 text-gray-600">
              By using {domainConfig.brandName}, you acknowledge and agree that you are doing so at your own risk. We do not warrant that the Platform will always be error-free, uninterrupted, or secure, nor do we make any guarantees about the accuracy or reliability of the content posted by other users.
            </p>
            <p className="mb-4 text-gray-600">
              <strong>No Warranty:</strong> We disclaim all implied warranties of merchantability, fitness for a particular purpose, or non-infringement. Any information or advice provided by {domainConfig.brandName}, whether through the Platform or in communications, should not be relied upon for making business, financial, or legal decisions.
            </p>
            <p className="mb-4 text-gray-600">
              <strong>Liability Waiver:</strong> To the extent permitted by law, you waive any claims against Biocloud Ltd or {domainConfig.brandName} arising from your use of the Platform, including any loss or damage resulting from interactions with other users, third-party services, or content.
            </p>

            <h2 className="text-xl font-semibold mb-3 text-gray-800">20. Third-Party Services</h2>
            <p className="mb-4 text-gray-600">
              {domainConfig.brandName} may offer features or integrations with third-party services, such as payment processing through Stripe or PayPal. These services are subject to their own terms and conditions, which you are responsible for reviewing and complying with. {domainConfig.brandName} does not control or endorse any third-party services and is not responsible for any issues arising from your use of them.
            </p>
            <p className="mb-4 text-gray-600">
              If we display third-party terms or agreements, they will be available on the Platform, and your continued use of those services implies acceptance of their terms.
            </p>

            <h2 className="text-xl font-semibold mb-3 text-gray-800">21. App Terms</h2>
            <p className="mb-4 text-gray-600">
              If you download and use the {domainConfig.brandName} app on a mobile or tablet device, the following terms apply:
            </p>
            <p className="mb-4 text-gray-600">
              <strong>Licence to Use:</strong> You are granted a limited, revocable, non-exclusive, non-transferable right to download and install the app on a single device that you own or control. The app is for your personal use only and should not be distributed or made available over a network where it can be accessed by multiple devices at once.
            </p>
            <p className="mb-4 text-gray-600">
              <strong>Updates:</strong> From time to time, we may release updates or new versions of the app. By using the app, you agree that these Terms will also apply to any updates or changes. If you do not agree with any changes, you should uninstall the app and discontinue its use.
            </p>
            <p className="mb-4 text-gray-600">
              <strong>Cancellation and Deletion:</strong> If you or we cancel your account, you must delete the app from your device. Continued use of the app after cancellation may result in further actions, including data deletion or suspension of access.
            </p>
            <p className="mb-4 text-gray-600">
              <strong>App Store Terms:</strong> If you download the app from a third-party store, such as the Apple App Store or Google Play, you also agree to comply with their specific terms of service. In the event of a conflict between these Terms and the App Store terms, the App Store terms will prevail.
            </p>
            <p className="mb-4 text-gray-600">
              We are solely responsible for providing the app and its content. If you have complaints or experience technical issues, contact us at support@dental.bio, not the App Store.
            </p>
            <p className="mb-4 text-gray-600">
              You confirm that you are not on a US government restricted parties list or living in a country subject to US embargoes or sanctions.
            </p>
            <p className="mb-4 text-gray-600">
              <strong>Third-Party Beneficiaries:</strong> The App Store providers and their subsidiaries are third-party beneficiaries of these Terms and have the right to enforce these Terms against you as applicable.
            </p>

            <h2 className="text-xl font-semibold mb-3 text-gray-800">22. Open Source Software</h2>
            <p className="mb-4 text-gray-600">
              The {domainConfig.brandName} app may include components of open-source software, which are governed by their own specific licence terms. These licences may grant you rights beyond those provided under these Terms. If any open-source licence conflicts with these Terms, the terms of the open-source licence will apply solely to the specific component involved.
            </p>
            <p className="mb-4 text-gray-600">
              For a full list of the open-source components used within the app and their licence terms, visit our Open-Source Content Library on the legal section of the {domainConfig.brandName} app or website.
            </p>

            <h2 className="text-xl font-semibold mb-3 text-gray-800">23. Termination and Suspension of Service</h2>
            <p className="mb-4 text-gray-600">
              {domainConfig.brandName} reserves the right to suspend or terminate your account or access to the Platform at any time for breach of these Terms, failure to comply with legal obligations, or for any other reason we deem necessary to protect our business, users, or the integrity of the Platform.
            </p>
            <p className="mb-4 text-gray-600">
              In the event of termination:
            </p>
            <ul className="list-disc list-inside mb-4 text-gray-600">
              <li>You will no longer have access to your account, and all content associated with your profile may be deleted.</li>
              <li>Any outstanding subscription fees are non-refundable unless required by law.</li>
              <li>{domainConfig.brandName} will not be liable for any data loss or service disruption resulting from account termination.</li>
            </ul>
            <p className="mb-4 text-gray-600">
              If you wish to terminate your own account, you can do so by contacting support@dental.bio. Upon termination, these Terms will cease to apply, except for any provisions that should survive termination (such as provisions related to intellectual property, liability, and indemnity).
            </p>

            <h2 className="text-xl font-semibold mb-3 text-gray-800">24. Governing Law and Jurisdiction</h2>
            <p className="mb-4 text-gray-600">
              These Terms and any disputes arising out of or related to your use of {domainConfig.brandName} will be governed by the laws of England and Wales. Both you and we agree to submit to the exclusive jurisdiction of the courts of England and Wales to resolve any legal matter arising from these Terms or the use of the Platform.
            </p>
            <p className="mb-4 text-gray-600">
              If any provision of these Terms is found to be invalid or unenforceable under applicable law, the remainder of the Terms will continue to apply in full force and effect.
            </p>

            <h2 className="text-xl font-semibold mb-3 text-gray-800">25. Final Provisions</h2>
            <p className="mb-4 text-gray-600">
              <strong>Entire Agreement:</strong> These Terms, along with our Privacy Policy and any other legal documents referenced within the Platform, constitute the entire agreement between you and {domainConfig.brandName}. They supersede any prior agreements or understandings regarding your use of the Platform.
            </p>
            <p className="mb-4 text-gray-600">
              <strong>No Waiver:</strong> Our decision not to enforce any right or provision of these Terms will not be considered a waiver of those rights or provisions.
            </p>
            <p className="mb-4 text-gray-600">
              <strong>Severability:</strong> If any part of these Terms is deemed unenforceable or invalid, that provision will be removed, and the remaining provisions will continue to be valid and enforceable.
            </p>
            <p className="mb-4 text-gray-600">
              <strong>Transfer of Rights:</strong> You may not transfer or assign your rights under these Terms to anyone else without our prior written consent. We may assign or transfer our rights to a third party without your consent as part of a merger, acquisition, or sale of assets.
            </p>
            <p className="mb-4 text-gray-600">
              <strong>Notices:</strong> We may provide notices to you by email or through the Platform. You are responsible for ensuring that we have an up-to-date email address for you. Any notices provided by us will be deemed effective as of the date of delivery.
            </p>
            <p className="mb-4 text-gray-600">
              <strong>Force Majeure:</strong> {domainConfig.brandName} will not be held liable for any delay or failure in performance caused by circumstances beyond our reasonable control, including, but not limited to, natural disasters, war, strikes, labour disputes, government action, or failures in telecommunications or other technology services.
            </p>

            <h2 className="text-xl font-semibold mb-3 text-gray-800">26. Contact Information</h2>
            <p className="mb-4 text-gray-600">
              If you have any questions about these Terms or wish to contact us for any reason, please reach out to us at:
            </p>
            <p className="mb-4 text-gray-600">
              Biocloud Ltd<br />
              113 Crawford Street, London, W1H 2JG<br />
              Support Email: support@dental.bio<br />
              Website: https://{domainConfig.domain}
            </p>

          </div>
        </div>
      </div>
      <Footer />
    </Suspense>
  );
}
