import { NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/gmail";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    if (!code) {
      return NextResponse.json({ error: "Missing authorization code." }, { status: 400 });
    }
    await exchangeCodeForTokens(code);
    return NextResponse.redirect(new URL("/", request.url));
  } catch (error) {
    console.error("GMAIL_CALLBACK_ERROR", error);
    return NextResponse.json({ error: "Gmail connection failed." }, { status: 500 });
  }
}
