import { type NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GATEWAY_URL = "http://127.0.0.1:18789/v1/chat/completions";

async function readGatewayToken(): Promise<string> {
  const configPath = path.join(
    process.env.HOME || "/Users/elizabeth",
    ".openclaw",
    "openclaw.json",
  );
  const raw = await fs.readFile(configPath, "utf8");
  const config = JSON.parse(raw);
  return config.gateway?.auth?.token;
}

export async function POST(req: NextRequest) {
  let body: { messages?: unknown; sessionKey?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json({ error: "Messages required" }, { status: 400 });
  }

  const sessionKey =
    typeof body.sessionKey === "string" && body.sessionKey.length > 0
      ? body.sessionKey
      : undefined;

  try {
    const token = await readGatewayToken();

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    if (sessionKey) {
      headers["x-openclaw-session-key"] = sessionKey;
    }

    const gwRes = await fetch(GATEWAY_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: "openclaw/default",
        messages: body.messages,
      }),
    });

    if (!gwRes.ok) {
      const errText = await gwRes.text().catch(() => gwRes.statusText);
      return NextResponse.json(
        { error: `Gateway error (${gwRes.status}): ${errText}` },
        { status: gwRes.status },
      );
    }

    const data = await gwRes.json();
    return NextResponse.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
