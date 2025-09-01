'use server';
import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY!;

const resend = new Resend(apiKey);

export const sendVerificationMail = async (email: string, username: string, firstName: string) => {
  try {
    const data = await resend.emails.send({
      from: "Dentalbio <noreply@dental.bio>",
      to: email,
      subject: "Congratulations! You are verified!",
      html: `
    <!DOCTYPE html>
    <html lang="en">

    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Congratulations! You are verified!</title>
    </head>

    <body
      style="background-color: #5046db; height: 100vh; margin: 0; padding-top: 100px; width: 100%; font-family: Arial, sans-serif;">
      <table width="100%" cellspacing="0" cellpadding="0" border="0"
        style="background-color: #5046db; margin: auto; padding-left: 10px; padding-right: 10px; width: 100%;">
        <tr>
          <td align="center" style="padding: 20px 0; width: 100%;">
            <table cellspacing="0" cellpadding="0" border="0"
              style="background-color: #fefefe; border-radius: 32px; max-width: 600px; width: 100%; box-shadow: 0px 5px 15px rgba(0, 0, 0, 0.1); margin: 0 auto; table-layout: fixed;">
              <!-- Top Row with Logo -->
              <tr>
                <td style="padding: 50px;">
                  <table cellspacing="0" cellpadding="0" border="0" style="width: auto; margin-left: auto;">
                    <tr>
                      <td style="text-align: right;">
                        <a href="https://dental.bio/login" style="text-decoration: none;">
                          <img src="https://cxqkuqtwrtgvoorxidvn.supabase.co/storage/v1/object/public/assets/logo%201.png"
                            alt="Dentalbio Logo" width="150"
                            style="display: block; border: 0; height: auto; line-height: 100%; outline: none;" />
                        </a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <!-- Content Section -->
              <tr>
                <td style="padding: 0 50px;">
                  <h1 style="font-size: 28px; font-weight: 300; color: #7646ff; line-height: 1.5; margin: 0;">
                    Congratulations <br />
                    <span style="font-size: 28px; font-weight: bold; color: #5046db;">
                      dental.bio/<span style="color: #f1852f">${username}</span>
                    </span>
                    <br />
                    is verified<div style="display: inline-block; width: 24px; height: 24px; margin-left: 4px;"><svg xmlns="http://www.w3.org/2000/svg" fill="#49ADF4"
                      viewBox="0 -26 256 256">
                      <path
                        d="M225.86,102.82c-3.77-3.94-7.67-8-9.14-11.57-1.36-3.27-1.44-8.69-1.52-13.94-.15-9.76-.31-20.82-8-28.51s-18.75-7.85-28.51-8c-5.25-.08-10.67-.16-13.94-1.52-3.56-1.47-7.63-5.37-11.57-9.14C146.28,23.51,138.44,16,128,16s-18.27,7.51-25.18,14.14c-3.94,3.77-8,7.67-11.57,9.14C88,40.64,82.56,40.72,77.31,40.8c-9.76.15-20.82.31-28.51,8S41,67.55,40.8,77.31c-.08,5.25-.16,10.67-1.52,13.94-1.47,3.56-5.37,7.63-9.14,11.57C23.51,109.72,16,117.56,16,128s7.51,18.27,14.14,25.18c3.77,3.94,7.67,8,9.14,11.57,1.36,3.27,1.44,8.69,1.52,13.94.15,9.76.31,20.82,8,28.51s18.75,7.85,28.51,8c5.25.08,10.67.16,13.94,1.52,3.56,1.47,7.63,5.37,11.57,9.14C109.72,232.49,117.56,240,128,240s18.27-7.51,25.18-14.14c3.94-3.77,8-7.67,11.57-9.14,3.27-1.36,8.69-1.44,13.94-1.52,9.76-.15,20.82-.31,28.51-8s7.85-18.75,8-28.51c.08-5.25.16-10.67,1.52-13.94,1.47-3.56,5.37-7.63,9.14-11.57C232.49,146.28,240,138.44,240,128S232.49,109.73,225.86,102.82Zm-52.2,6.84-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35a8,8,0,0,1,11.32,11.32Z">
                      </path>
                    </svg></div>
                  </h1>
                  <p style="font-size: 16px; font-weight: 400; color: #1c1c21; line-height: 1.7; margin: 50px 0 0 0;">
                    👋 Hello ${firstName},
                  </p>
                  <p style="font-size: 16px; font-weight: 500; color: #1c1c21; line-height: 1.7; margin: 20px 0;">
                    Congratulations on verifying your <span style="color: #f1852f">@${username}</span> Dentalbio account!
                  </p>
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="padding: 0 50px; text-align: left; padding-bottom: 50px;">
                  <p style="font-size: 16px; color: #888888; margin-top: 30px;">
                    <a href="https://dental.bio/login" style="text-decoration: none;">
                      <span style="color: #5046db; font-weight: bold; line-height: 1.7;">Dentalbio</span>
                    </a>
                    <br />
                    <span style="color: #fd8516; line-height: 1.7; font-weight: 300;">Your dental identity,
                      simplified.</span>
                  </p>
                  <p style="color: #1c1c21; opacity: 40%; font-size: 12px; margin-top: 30px; line-height: 1.7;">
                    You received this email because a Dentalbio account was created with this email.
                  </p>
                  <p style="color: #1c1c21; opacity: 40%; font-size: 12px; margin-top: 14px; line-height: 1.7;">
                    Biocloud Ltd, 113 Crawford Street, London, W1H 2JG
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>

    </html>
    `
    });
  } catch (e) {
    console.log(e);
  };
};
