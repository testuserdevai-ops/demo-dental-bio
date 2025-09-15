import { sendTemplateEmail } from "./sendTemplateEmails";

export const sendDowngradePlanMail = async (email: string, firstName: string, plan: string) => {
  try {
    await sendTemplateEmail({
      sendTo: email,
      title: `Your plan has been successfully downgraded to ${plan}`,
      content: `
        <h1 style="font-size: 28px; font-weight: 300; color: #7646ff; line-height: 1.5; margin: 0;">
          Your plan has been successfully downgraded to ${plan}
        </h1>
        <p style="font-size: 16px; font-weight: 400; color: #1c1c21; line-height: 1.7; margin: 50px 0 0 0;">
          👋 Hello ${firstName},
        </p>
        <p style="font-size: 16px; font-weight: 500; color: #1c1c21; line-height: 1.7; margin: 20px 0;">
          Your plan has been successfully downgraded to ${plan}
        </p>`
    })
  } catch (e) {
    console.log(e);
  };
};
