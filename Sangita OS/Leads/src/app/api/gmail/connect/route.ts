import { NextResponse } from "next/server";
import { getGmailAuthUrl } from "@/lib/gmail";

export const runtime = "nodejs";

export async function GET() {
  try {
    const url = getGmailAuthUrl();
    return NextResponse.json({ authUrl: url });
  } catch (error) {
    console.error("GMAIL_CONNECT_ERROR", error);
    return NextResponse.json({ error: "Gmail connection is not configured." }, { status: 401 });
  }
}
