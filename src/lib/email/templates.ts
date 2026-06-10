const appName = process.env.NEXT_PUBLIC_COMPANY_NAME ?? "Travel Expense";
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function baseTemplate(body: string) {
  return `
<!DOCTYPE html><html><head><meta charset="utf-8"><style>
body{font-family:sans-serif;color:#111;background:#f5f5f5;margin:0;padding:0}
.wrap{max-width:600px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden}
.header{background:#1d4ed8;color:#fff;padding:24px 32px;font-size:18px;font-weight:600}
.body{padding:32px}
.btn{display:inline-block;margin-top:24px;padding:12px 24px;background:#1d4ed8;color:#fff;text-decoration:none;border-radius:6px;font-size:14px}
.footer{padding:16px 32px;color:#6b7280;font-size:12px;border-top:1px solid #e5e7eb}
</style></head><body>
<div class="wrap">
  <div class="header">${appName}</div>
  <div class="body">${body}</div>
  <div class="footer">${appName} · This is an automated message.</div>
</div></body></html>`;
}

export function preSubmittedEmail(ref: string, employeeName: string, destination: string, tripDates: string) {
  return {
    subject: `Action required: Pre-Trip ${ref} from ${employeeName}`,
    html: baseTemplate(`
      <p>A new Pre-Trip request requires your approval.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:6px 0;color:#6b7280">Reference</td><td><strong>${ref}</strong></td></tr>
        <tr><td style="padding:6px 0;color:#6b7280">Employee</td><td>${employeeName}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280">Destination</td><td>${destination}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280">Trip dates</td><td>${tripDates}</td></tr>
      </table>
      <a class="btn" href="${appUrl}/approvals">Review in Approvals Queue</a>
    `),
  };
}

export function preApprovedEmail(ref: string, destination: string, tripDates: string) {
  return {
    subject: `Pre-Trip approved: ${ref} — you may now book your trip`,
    html: baseTemplate(`
      <p>Your Pre-Trip request has been <strong>approved</strong>. You may now proceed with booking.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:6px 0;color:#6b7280">Reference</td><td><strong>${ref}</strong></td></tr>
        <tr><td style="padding:6px 0;color:#6b7280">Destination</td><td>${destination}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280">Trip dates</td><td>${tripDates}</td></tr>
      </table>
      <a class="btn" href="${appUrl}/forms">View your forms</a>
    `),
  };
}

export function preRejectedEmail(ref: string, notes: string) {
  return {
    subject: `Action needed: Pre-Trip ${ref} returned — see notes`,
    html: baseTemplate(`
      <p>Your Pre-Trip request has been <strong>returned</strong> with the following notes:</p>
      <blockquote style="border-left:4px solid #e5e7eb;padding:12px 16px;margin:16px 0;color:#374151">${notes}</blockquote>
      <p>Please review the notes, make the necessary changes, and resubmit.</p>
      <a class="btn" href="${appUrl}/forms">View your forms</a>
    `),
  };
}

export function postSubmittedEmail(ref: string, employeeName: string, destination: string, tripDates: string) {
  return {
    subject: `Action required: Post-Trip ${ref} from ${employeeName}`,
    html: baseTemplate(`
      <p>A Post-Trip expense claim requires your approval.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:6px 0;color:#6b7280">Reference</td><td><strong>${ref}</strong></td></tr>
        <tr><td style="padding:6px 0;color:#6b7280">Employee</td><td>${employeeName}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280">Destination</td><td>${destination}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280">Trip dates</td><td>${tripDates}</td></tr>
      </table>
      <a class="btn" href="${appUrl}/approvals">Review in Approvals Queue</a>
    `),
  };
}

export function postApprovedEmail(ref: string) {
  return {
    subject: `Post-Trip approved: ${ref} — PDF is ready to download`,
    html: baseTemplate(`
      <p>Your Post-Trip expense claim has been <strong>approved</strong>. Your PDF is ready to download.</p>
      <a class="btn" href="${appUrl}/forms">Download PDF from Dashboard</a>
    `),
  };
}

export function postRejectedEmail(ref: string, notes: string) {
  return {
    subject: `Action needed: Post-Trip ${ref} returned — see notes`,
    html: baseTemplate(`
      <p>Your Post-Trip expense claim has been <strong>returned</strong> with the following notes:</p>
      <blockquote style="border-left:4px solid #e5e7eb;padding:12px 16px;margin:16px 0;color:#374151">${notes}</blockquote>
      <a class="btn" href="${appUrl}/forms">View your forms</a>
    `),
  };
}

export function userInviteEmail(loginUrl: string) {
  return {
    subject: `You've been added to the expense system — click to log in`,
    html: baseTemplate(`
      <p>You have been added to the <strong>${appName}</strong> travel expense system.</p>
      <p>Click the button below to set up your account and log in:</p>
      <a class="btn" href="${loginUrl}">Log in now</a>
      <p style="margin-top:16px;color:#6b7280;font-size:12px">This link expires in 1 hour.</p>
    `),
  };
}
