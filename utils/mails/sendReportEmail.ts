'use server';
import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY!;

const resend = new Resend(apiKey);

export const sendTrialStatusEmail = async (notificationsSent: {
  email: String;
  daysRemaining: Number;
  sentAt: String;
}[]) => {
  try {
    await resend.emails.send({
      from: "Dentalbio <noreply@dental.bio>",
      to: ['sergey.r1130@gmail.com'],
      subject: `Trial Period Report`,
      html: `<div>${notificationsSent.map(notification => (
        `<p style="font-size: 16px; font-weight: 500; color: #1c1c21; line-height: 1.7; margin: 20px 0;">${notification.email}: (${notification.daysRemaining} days remaining)</p>`
      )).join("")}</div>`
    });
  } catch (e) {
    console.log(e);
  };
};

export const sendUserRegisterredEmail = async (registerData: {
  username: string;
  title: string;
  first_name: string;
  last_name: string;
  position: string;
  country: string;
  email: string;
  time: string;
  location: string;
}) => {
  try {
    await resend.emails.send({
      from: "Dentalbio <noreply@dental.bio>",
      to: ["shaz@dental.bio", "sergey.r1130@gmail.com"],
      subject: `dental.bio/${registerData.username} signed up!`,
      text: `A new user has signed up on Dentalbio. 
              Title: ${registerData.title || ""}
              First Name: ${registerData.first_name || ""}
              Last Name: ${registerData.last_name || ""}
              Position: ${registerData.position || ""}
              Country: ${registerData.country || ""}
              Username: @${registerData.username || ""}
              Email: ${registerData.email || ""}
              Registered at: ${registerData.time || ""}
              Registered from: ${registerData.location || ""}`,
    });
  } catch (e) {
    console.error(e);
  }
}

export const sendUserPlanChangedReportEmail = async (emailData: {
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  previous_plan: string;
  current_plan: string;
}) => {
  try {
    await resend.emails.send({
      from: "Dentalbio <noreply@dental.bio>",
      to: ["sergey.r1130@gmail.com"],
      subject: `${emailData.first_name}'s plan has been changed`,
      text: `
        ${emailData.first_name}'s plan has been changed from ${emailData.previous_plan} to ${emailData.current_plan}
        First Name: ${emailData.first_name}
        Last Name: ${emailData.last_name}
        Username: ${emailData.username}
        Email Address: ${emailData.email}
      `,
    });
  } catch (e) {
    console.error(e);
  }
}