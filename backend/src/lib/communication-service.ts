import { env } from "../config/env";

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface SendSmsOptions {
  to: string;
  body: string;
}

export interface PushNotificationMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: "default" | null;
}

export class CommunicationService {
  private postmarkToken?: string;
  private fromEmail: string;
  private twilioSid?: string;
  private twilioToken?: string;
  private twilioFrom?: string;

  constructor() {
    this.postmarkToken = process.env.POSTMARK_SERVER_TOKEN?.trim();
    this.fromEmail = process.env.FROM_EMAIL?.trim() || "noreply@pavdental.com";
    this.twilioSid = process.env.TWILIO_ACCOUNT_SID?.trim();
    this.twilioToken = process.env.TWILIO_AUTH_TOKEN?.trim();
    this.twilioFrom = process.env.TWILIO_FROM_PHONE?.trim();
  }

  async sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string }> {
    if (this.postmarkToken && !this.postmarkToken.startsWith("mock")) {
      try {
        const response = await fetch("https://api.postmarkapp.com/email", {
          method: "POST",
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "X-Postmark-Server-Token": this.postmarkToken,
          },
          body: JSON.stringify({
            From: this.fromEmail,
            To: options.to,
            Subject: options.subject,
            HtmlBody: options.html,
            TextBody: options.text,
            MessageStream: "outbound",
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("[CommunicationService] Postmark error:", errorData);
          return { success: false };
        }

        const data = await response.json() as any;
        return { success: true, messageId: data.MessageID };
      } catch (err) {
        console.error("[CommunicationService] Failed to send email via Postmark:", err);
        return { success: false };
      }
    }

    // Development / Test fallback
    console.log(`[Email Dispatch] To: ${options.to} | Subject: "${options.subject}"`);
    console.log(`[Email Content]\n${options.text}\n`);
    return { success: true, messageId: `mock_email_${Date.now()}` };
  }

  async sendSms(options: SendSmsOptions): Promise<{ success: boolean; sid?: string }> {
    if (this.twilioSid && this.twilioToken && this.twilioFrom && !this.twilioSid.startsWith("mock")) {
      try {
        const auth = Buffer.from(`${this.twilioSid}:${this.twilioToken}`).toString("base64");
        const body = new URLSearchParams({
          From: this.twilioFrom,
          To: options.to,
          Body: options.body,
        });

        const response = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${this.twilioSid}/Messages.json`,
          {
            method: "POST",
            headers: {
              "Authorization": `Basic ${auth}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: body.toString(),
          }
        );

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          console.error("[CommunicationService] Twilio error:", errData);
          return { success: false };
        }

        const data = await response.json() as any;
        return { success: true, sid: data.sid };
      } catch (err) {
        console.error("[CommunicationService] Failed to send SMS via Twilio:", err);
        return { success: false };
      }
    }

    // Development / Test fallback
    console.log(`[SMS Dispatch] To: ${options.to} | Body: "${options.body}"`);
    return { success: true, sid: `mock_sms_${Date.now()}` };
  }

  async sendVerificationEmail(email: string, token: string): Promise<boolean> {
    const appUrl = process.env.APP_URL || "http://localhost:8081";
    const verificationUrl = `${appUrl}/verify-email?token=${encodeURIComponent(token)}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #0D9488;">Pav Dental Account Verification</h2>
        <p>Thank you for registering with Pav Dental. Please verify your email address to access your dental records and consultations.</p>
        <p style="margin: 30px 0;">
          <a href="${verificationUrl}" style="background-color: #0D9488; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Verify Email Address
          </a>
        </p>
        <p style="color: #64748B; font-size: 13px;">Or copy and paste this verification code into the app: <strong>${token}</strong></p>
        <p style="color: #94A3B8; font-size: 12px; margin-top: 40px;">If you did not create a Pav Dental account, please disregard this message.</p>
      </div>
    `;

    const text = `Pav Dental Account Verification\n\nPlease verify your email by opening:\n${verificationUrl}\n\nOr enter code: ${token}\n\nThis link expires in 24 hours.`;

    const result = await this.sendEmail({
      to: email,
      subject: "Verify your email - Pav Dental",
      html,
      text,
    });

    return result.success;
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<boolean> {
    const appUrl = process.env.APP_URL || "http://localhost:8081";
    const resetUrl = `${appUrl}/reset-password?token=${encodeURIComponent(token)}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #0D9488;">Pav Dental Password Reset</h2>
        <p>A password reset was requested for your Pav Dental account.</p>
        <p style="margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #0D9488; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Reset Password
          </a>
        </p>
        <p style="color: #64748B; font-size: 13px;">Or enter token: <strong>${token}</strong></p>
        <p style="color: #EF4444; font-size: 12px;">This reset link expires in 1 hour. If you did not request this, please contact support immediately.</p>
      </div>
    `;

    const text = `Pav Dental Password Reset\n\nReset your password at:\n${resetUrl}\n\nOr enter token: ${token}\n\nExpires in 1 hour.`;

    const result = await this.sendEmail({
      to: email,
      subject: "Reset your Pav Dental password",
      html,
      text,
    });

    return result.success;
  }

  async sendMfaCode(destination: string, code: string): Promise<boolean> {
    const isEmail = destination.includes("@");

    if (isEmail) {
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #0D9488;">Pav Dental Security Code</h2>
          <p>Your two-factor authentication security code is:</p>
          <div style="background-color: #F1F5F9; padding: 16px; font-size: 28px; font-weight: bold; letter-spacing: 4px; text-align: center; color: #0F172A; border-radius: 8px; margin: 20px 0;">
            ${code}
          </div>
          <p style="color: #64748B; font-size: 13px;">This code expires in 5 minutes. Do not share it with anyone.</p>
        </div>
      `;
      const text = `Your Pav Dental security code is ${code}. It expires in 5 minutes.`;

      const result = await this.sendEmail({
        to: destination,
        subject: `Your Pav Dental security code: ${code}`,
        html,
        text,
      });
      return result.success;
    } else {
      const body = `Your Pav Dental security code is ${code}. Expires in 5 minutes.`;
      const result = await this.sendSms({
        to: destination,
        body,
      });
      return result.success;
    }
  }

  async sendExpoPushNotifications(messages: PushNotificationMessage[]): Promise<{
    sentCount: number;
    failedCount: number;
    tickets?: any[];
  }> {
    if (messages.length === 0) {
      return { sentCount: 0, failedCount: 0 };
    }

    try {
      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Accept-Encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(messages),
      });

      if (!response.ok) {
        console.error("[CommunicationService] Expo push API returned status:", response.status);
        return { sentCount: 0, failedCount: messages.length };
      }

      const resJson = await response.json() as any;
      const tickets = resJson.data || [];
      const failed = tickets.filter((t: any) => t.status === "error").length;

      return {
        sentCount: messages.length - failed,
        failedCount: failed,
        tickets,
      };
    } catch (err) {
      console.error("[CommunicationService] Error contacting Expo Push API:", err);
      return { sentCount: 0, failedCount: messages.length };
    }
  }
}

export const communicationService = new CommunicationService();

