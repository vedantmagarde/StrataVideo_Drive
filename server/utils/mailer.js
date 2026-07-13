import { Resend } from 'resend';
import dotenv from 'dotenv';
dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

const htmlTemplate = (title, message, emoji) => `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 40px 20px; text-align: center; }
        .container { max-width: 600px; margin: 0 auto; background-color: #1e293b; padding: 40px; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); border: 1px solid #334155; }
        .logo { font-size: 24px; font-weight: bold; color: #38bdf8; margin-bottom: 24px; }
        h1 { font-size: 20px; margin-bottom: 16px; color: #f1f5f9; }
        p { font-size: 16px; color: #cbd5e1; line-height: 1.5; margin-bottom: 24px; }
        .emoji { font-size: 48px; margin-bottom: 16px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">StrataVideo Drive</div>
        <div class="emoji">${emoji}</div>
        <h1>${title}</h1>
        <p>${message}</p>
    </div>
</body>
</html>
`;

export const sendUploadComplete = async (toEmail, filename) => {
    try {
        const response = await resend.emails.send({
            from: 'StrataVideo Drive <onboarding@resend.dev>',
            to: toEmail,
            subject: 'Upload Complete',
            html: htmlTemplate(
                'Upload Complete',
                `Your file <strong>${filename}</strong> has been successfully chunked, encoded, and uploaded to YouTube.`,
                '🚀'
            )
        });
        if (response.error) {
            console.error("Resend API Error (upload email):", response.error);
        } else {
            console.log("Email sent successfully!", response.data);
        }
    } catch (error) {
        console.error("Error sending upload email:", error);
    }
};

export const sendDownloadReady = async (toEmail, filename) => {
    try {
        const response = await resend.emails.send({
            from: 'StrataVideo Drive <onboarding@resend.dev>',
            to: toEmail,
            subject: 'File Ready for Download',
            html: htmlTemplate(
                'File Ready',
                `Your file <strong>${filename}</strong> has been fully downloaded, decoded, and is ready. Head over to the dashboard to download it now.`,
                '📥'
            )
        });
        if (response.error) {
            console.error("Resend API Error (download email):", response.error);
        } else {
            console.log("Email sent successfully!", response.data);
        }
    } catch (error) {
        console.error("Error sending download email:", error);
    }
};

export const sendUploadFailed = async (toEmail, filename, reason) => {
    try {
        const response = await resend.emails.send({
            from: 'StrataVideo Drive <onboarding@resend.dev>',
            to: toEmail,
            subject: 'Upload Failed',
            html: htmlTemplate(
                'Upload Failed',
                `Unfortunately, your file <strong>${filename}</strong> failed to upload. Reason: ${reason}`,
                '❌'
            )
        });
        if (response.error) {
            console.error("Resend API Error (upload failed email):", response.error);
        } else {
            console.log("Email sent successfully!", response.data);
        }
    } catch (error) {
        console.error("Error sending failed upload email:", error);
    }
};
