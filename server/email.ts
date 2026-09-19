import { TRPCError } from "@trpc/server";

export async function sendVerificationCodeEmail(to: string, code: string, deviceLabel: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Email verification is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL before enabling local account sign-in." });
  const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ from, to: [to], subject: "SwasthyaFlow login verification code", html: `<div style="font-family:Arial,sans-serif;max-width:520px"><h2>SwasthyaFlow login verification</h2><p>A sign-in was attempted from a new device or IP address (${deviceLabel}).</p><p style="font-size:28px;font-weight:700;letter-spacing:8px">${code}</p><p>This code expires in 10 minutes. If you did not request it, secure your account immediately.</p></div>` }) });
  if (!response.ok) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Verification email could not be sent. Please try again or contact your administrator." });
}
