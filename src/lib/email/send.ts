import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  tripFormId: string,
  recipientId: string,
  type: string
) {
  try {
    const { data } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to,
      subject,
      html,
    });

    await prisma.notification.create({
      data: {
        tripFormId,
        recipientId,
        type: type as any,
        resendMessageId: data?.id,
      },
    });
  } catch (err) {
    console.error("Email send failed:", err);
  }
}
