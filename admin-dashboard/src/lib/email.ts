// Simple email helper – replace with real provider (SendGrid, SES, etc.)
// For now it logs to the console.
export async function sendVerificationEmail(to: string, token: string) {
  const verificationLink = `${process.env.NEXT_PUBLIC_APP_URL}/auth/v1/verify?token=${encodeURIComponent(token)}`;
  console.log(`[Email] Send verification to ${to}: ${verificationLink}`);
  // TODO: integrate with actual email service using EMAIL_API_KEY, FROM_EMAIL env vars.
}

export async function sendPasswordResetEmail(to: string, token: string) {
  const resetLink = `${process.env.NEXT_PUBLIC_APP_URL}/auth/v1/reset?token=${encodeURIComponent(token)}`;
  console.log(`[Email] Send password reset to ${to}: ${resetLink}`);
}
