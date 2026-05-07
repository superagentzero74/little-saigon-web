import { NextRequest, NextResponse } from "next/server";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: "little-saigon-c055a",
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}
const db = getFirestore();

const ADMIN_EMAIL = "superagentzero74@gmail.com"; // Resend verified email — change to tuan@productsgo.com after domain verification

async function sendEmail(to: string, subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      from: "Little Saigon <onboarding@resend.dev>",
      to,
      subject,
      html,
    }),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, topic, message, phone, okToEmail, urgentUpdate, claimBusinessId, claimBusinessName, userId, newBusiness, newBizAddress } = body;

    if (!name || !email || !message) {
      return NextResponse.json({ error: "Name, email, and message are required" }, { status: 400 });
    }
    if (name.length > 200 || email.length > 200 || message.length > 5000) {
      return NextResponse.json({ error: "Input too long" }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    const isClaim = !!(claimBusinessId || claimBusinessName);

    const ticket: Record<string, any> = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      topic: topic || "general",
      message: message.trim(),
      status: "new",
      createdAt: new Date(),
      source: "web",
    };

    if (isClaim) {
      ticket.claimBusinessId = claimBusinessId || "";
      ticket.claimBusinessName = claimBusinessName || "";
      ticket.phone = phone || "";
      ticket.okToEmail = okToEmail || false;
      ticket.urgentUpdate = urgentUpdate || "";
      ticket.newBusiness = newBusiness || false;
      ticket.newBizAddress = newBizAddress || "";
    }

    await db.collection("support_tickets").add(ticket);

    // Also create a claimRequests doc so it shows in admin claims page
    if (isClaim) {
      await db.collection("claimRequests").add({
        businessId: claimBusinessId || "",
        businessName: claimBusinessName || "",
        userId: userId || "",
        userName: name.trim(),
        userEmail: email.trim().toLowerCase(),
        phone: phone || "",
        status: "pending",
        note: message.trim(),
        urgentUpdate: urgentUpdate || "",
        newBusiness: newBusiness || false,
        newBizAddress: newBizAddress || "",
        createdAt: new Date(),
      });
    }

    // Confirmation email to user (may fail without domain verification — non-blocking)
    try {
    const userSubject = isClaim
      ? `We received your claim request for ${claimBusinessName || "your business"}`
      : "We received your message — Little Saigon";

    await sendEmail(email.trim().toLowerCase(), userSubject, `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
        <h2 style="color: #1a1a1a;">Hi ${name.trim()},</h2>
        <p style="color: #555; line-height: 1.6;">
          ${isClaim
            ? `Thank you for submitting your claim request${claimBusinessName ? ` for <strong>${claimBusinessName}</strong>` : ""}. Our team will review your request and get back to you within 1-2 business days.`
            : "Thank you for reaching out. We've received your message and will get back to you as soon as possible."
          }
        </p>
        <p style="color: #999; font-size: 13px; margin-top: 24px;">
          — Little Saigon Team<br>
          <a href="https://littlesaigongo.com" style="color: #1a1a1a;">littlesaigongo.com</a>
        </p>
      </div>
    `);
    } catch { /* user email may fail without domain verification */ }

    // Admin notification
    const reqType = isClaim ? (newBusiness ? "New Business Request" : "Claim Request") : "Support Ticket";
    await sendEmail(ADMIN_EMAIL, `[Little Saigon] ${reqType}: ${claimBusinessName || name.trim()}`, `
      <div style="font-family: sans-serif; max-width: 600px;">
        <h2 style="color: #1a1a1a;">New ${isClaim ? "Business Claim" : "Support"} Request</h2>
        <table style="border-collapse: collapse; width: 100%; font-size: 14px;">
          <tr><td style="padding: 8px; color: #888; width: 120px;">Name</td><td style="padding: 8px;">${name.trim()}</td></tr>
          <tr><td style="padding: 8px; color: #888;">Email</td><td style="padding: 8px;"><a href="mailto:${email.trim()}">${email.trim()}</a></td></tr>
          <tr><td style="padding: 8px; color: #888;">Topic</td><td style="padding: 8px;">${topic || "general"}</td></tr>
          ${isClaim ? `
            <tr><td style="padding: 8px; color: #888;">Business</td><td style="padding: 8px;"><strong>${claimBusinessName || "—"}</strong></td></tr>
            <tr><td style="padding: 8px; color: #888;">Phone</td><td style="padding: 8px;">${phone || "—"}</td></tr>
            <tr><td style="padding: 8px; color: #888;">Urgent Update</td><td style="padding: 8px;">${urgentUpdate || "—"}</td></tr>
            ${newBusiness ? `<tr><td style="padding: 8px; color: #888;">Type</td><td style="padding: 8px; color: #d97706; font-weight: bold;">NEW BUSINESS (not yet listed)</td></tr>
            <tr><td style="padding: 8px; color: #888;">Address</td><td style="padding: 8px;">${newBizAddress || "—"}</td></tr>` : ""}
          ` : ""}
          <tr><td style="padding: 8px; color: #888; vertical-align: top;">Message</td><td style="padding: 8px;">${message.trim()}</td></tr>
        </table>
        <p style="margin-top: 16px;">
          <a href="https://littlesaigongo.com/admin/claims" style="color: #1a1a1a; font-weight: bold;">View in Admin</a>
        </p>
      </div>
    `);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[support] Error:", err.message);
    return NextResponse.json({ error: "Failed to submit. Please try again." }, { status: 500 });
  }
}
