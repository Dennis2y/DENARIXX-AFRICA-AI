import { Resend } from "resend";

let resend: Resend | null = null;

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!resend) resend = new Resend(process.env.RESEND_API_KEY);
  return resend;
}

function getAppDomain(): string {
  const domains = process.env.REPLIT_DOMAINS;
  if (domains) return `https://${domains.split(",")[0].trim()}`;
  return "https://denarixx.ai";
}

function buildWelcomeEmail(params: {
  name: string | null;
  email: string;
  referralCode: string;
  referredByCode: string | null;
}): { subject: string; html: string } {
  const { name, referralCode, referredByCode } = params;
  const firstName = name ? name.trim().split(" ")[0] : "Visionary";
  const domain = getAppDomain();
  const referralUrl = `${domain}?ref=${referralCode}`;
  const leaderboardUrl = `${domain}/leaderboard`;

  const subject = `Welcome to DENARIXX AFRICA AI, ${firstName}! 🚀 Here's your referral link`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#0B1020;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0B1020;padding:32px 16px;">
  <tr>
    <td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">

        <!-- Header -->
        <tr>
          <td style="padding-bottom:32px;text-align:center;">
            <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
              <tr>
                <td style="background-color:rgba(0,229,255,0.1);border:1px solid rgba(0,229,255,0.3);border-radius:10px;padding:8px 16px;display:inline-block;">
                  <span style="color:#00E5FF;font-size:20px;font-weight:900;letter-spacing:-0.5px;">DENARIXX<span style="color:#7B61FF;">.AI</span></span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Main card -->
        <tr>
          <td style="background-color:#111827;border:1px solid rgba(255,255,255,0.08);border-radius:20px;overflow:hidden;">

            <!-- Top accent bar -->
            <tr>
              <td style="background:linear-gradient(90deg,#00E5FF,#7B61FF);height:3px;display:block;"></td>
            </tr>

            <!-- Hero content -->
            <tr>
              <td style="padding:48px 40px 40px;">
                <!-- Emoji + Headline -->
                <p style="margin:0 0 8px;font-size:40px;text-align:center;">🌍</p>
                <h1 style="margin:0 0 12px;font-size:28px;font-weight:900;color:#FFFFFF;text-align:center;line-height:1.2;">
                  You're in, ${firstName}!
                </h1>
                <p style="margin:0 0 32px;font-size:16px;color:#94A3B8;text-align:center;line-height:1.6;">
                  Welcome to the waitlist for <strong style="color:#00E5FF;">Africa's AI Operating System</strong>.
                  You're among the first to experience what we're building for the continent.
                </p>

                ${referredByCode ? `
                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                  <tr>
                    <td style="background-color:rgba(0,255,148,0.08);border:1px solid rgba(0,255,148,0.2);border-radius:12px;padding:14px 20px;text-align:center;">
                      <p style="margin:0;font-size:13px;color:#00FF94;font-weight:600;">
                        ✅ You joined via a referral — you and your referrer both get priority access!
                      </p>
                    </td>
                  </tr>
                </table>
                ` : ""}

                <!-- Divider -->
                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                  <tr>
                    <td style="border-top:1px solid rgba(255,255,255,0.07);"></td>
                  </tr>
                </table>

                <!-- Referral Section -->
                <h2 style="margin:0 0 8px;font-size:18px;font-weight:800;color:#FFFFFF;text-align:center;">
                  🔗 Your Personal Referral Link
                </h2>
                <p style="margin:0 0 20px;font-size:14px;color:#94A3B8;text-align:center;">
                  Every person who signs up through your link moves you up the ambassador leaderboard — and gets <em>them</em> priority access too.
                </p>

                <!-- Referral URL box -->
                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
                  <tr>
                    <td style="background-color:#0B1020;border:1px solid rgba(0,229,255,0.3);border-radius:12px;padding:16px 20px;text-align:center;">
                      <p style="margin:0 0 6px;font-size:11px;color:#94A3B8;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Your Referral Link</p>
                      <p style="margin:0 0 10px;font-size:13px;color:#00E5FF;font-family:'Courier New',monospace;word-break:break-all;">${referralUrl}</p>
                      <p style="margin:0;font-size:11px;color:#64748B;">Code: <strong style="color:#FFFFFF;font-family:monospace;">${referralCode}</strong></p>
                    </td>
                  </tr>
                </table>

                <!-- CTA button -->
                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                  <tr>
                    <td align="center" style="padding-top:16px;">
                      <a href="${referralUrl}" style="display:inline-block;background:linear-gradient(135deg,#00E5FF,#7B61FF);color:#000000;font-weight:900;font-size:15px;padding:14px 36px;border-radius:50px;text-decoration:none;letter-spacing:0.3px;">
                        Share My Referral Link →
                      </a>
                    </td>
                  </tr>
                </table>

                <!-- Social share buttons -->
                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                  <tr>
                    <td align="center">
                      <table cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="padding-right:8px;">
                            <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent(`I just joined the DENARIXX AFRICA AI waitlist! 🚀 Africa's AI Operating System is coming. Join me via my link:`)}&url=${encodeURIComponent(referralUrl)}" style="display:inline-block;background-color:rgba(29,161,242,0.12);border:1px solid rgba(29,161,242,0.3);color:#1DA1F2;font-size:13px;font-weight:700;padding:10px 20px;border-radius:8px;text-decoration:none;">
                              𝕏 Share on X
                            </a>
                          </td>
                          <td>
                            <a href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralUrl)}" style="display:inline-block;background-color:rgba(0,119,181,0.12);border:1px solid rgba(0,119,181,0.3);color:#0077B5;font-size:13px;font-weight:700;padding:10px 20px;border-radius:8px;text-decoration:none;">
                              in LinkedIn
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>

                <!-- Divider -->
                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                  <tr>
                    <td style="border-top:1px solid rgba(255,255,255,0.07);"></td>
                  </tr>
                </table>

                <!-- What's next -->
                <h2 style="margin:0 0 16px;font-size:16px;font-weight:800;color:#FFFFFF;">What happens next?</h2>
                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                  ${[
                    ["🏗️", "We're building", "The team is shipping 10 AI modules designed for every African."],
                    ["📣", "Early access wave", "The more people you invite, the higher your priority."],
                    ["🚀", "Launch notification", "You'll be the first to know when we go live."],
                  ].map(([emoji, title, desc]) => `
                  <tr>
                    <td style="padding-bottom:16px;">
                      <table cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="vertical-align:top;padding-right:12px;font-size:20px;line-height:1;">${emoji}</td>
                          <td style="vertical-align:top;">
                            <p style="margin:0 0 2px;font-size:14px;font-weight:700;color:#FFFFFF;">${title}</p>
                            <p style="margin:0;font-size:13px;color:#94A3B8;">${desc}</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>`).join("")}
                </table>

                <!-- Leaderboard link -->
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="background:linear-gradient(135deg,rgba(123,97,255,0.12),rgba(0,229,255,0.06));border:1px solid rgba(123,97,255,0.25);border-radius:12px;padding:20px;text-align:center;">
                      <p style="margin:0 0 8px;font-size:14px;color:#FFFFFF;font-weight:700;">🏆 Ambassador Leaderboard</p>
                      <p style="margin:0 0 12px;font-size:13px;color:#94A3B8;">Track your rank and see the top referrers across Africa.</p>
                      <a href="${leaderboardUrl}" style="color:#7B61FF;font-size:13px;font-weight:700;text-decoration:underline;">View Leaderboard →</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background-color:#0B1020;border-top:1px solid rgba(255,255,255,0.06);padding:24px 40px;text-align:center;">
                <p style="margin:0 0 6px;font-size:12px;color:#475569;">
                  <strong style="color:#00E5FF;">DENARIXX AFRICA AI</strong> · Headquartered in Ghana, building for 54 nations
                </p>
                <p style="margin:0;font-size:11px;color:#334155;">
                  You're receiving this because you joined our waitlist at ${domain}
                </p>
              </td>
            </tr>

          </td>
        </tr>

        <!-- Bottom spacer -->
        <tr><td style="padding-top:24px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#334155;">© ${new Date().getFullYear()} DENARIXX AFRICA AI. All rights reserved.</p>
        </td></tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

  return { subject, html };
}

export async function sendWelcomeEmail(params: {
  name: string | null;
  email: string;
  referralCode: string;
  referredByCode: string | null;
}): Promise<void> {
  const client = getResend();
  if (!client) return; // No API key configured — skip silently

  const { subject, html } = buildWelcomeEmail(params);

  await client.emails.send({
    from: "DENARIXX AFRICA AI <onboarding@resend.dev>",
    to: [params.email],
    subject,
    html,
  });
}
