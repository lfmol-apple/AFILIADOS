import { NextResponse } from "next/server";
import { z } from "zod";
import { getConsent, setConsent } from "@/lib/privacy/consent";

const consentChoiceSchema = z.enum(["GRANTED", "DENIED", "UNSET"]);

const postSchema = z.object({
  subjectId: z.string().min(1).max(200),
  analytics: consentChoiceSchema,
  marketing: consentChoiceSchema,
});

export async function GET(request: Request) {
  const subjectId = new URL(request.url).searchParams.get("subjectId");
  if (!subjectId) {
    return NextResponse.json({ error: "subjectId is required" }, { status: 400 });
  }
  const consent = await getConsent(subjectId);
  return NextResponse.json({ consent });
}

export async function POST(request: Request) {
  const parsed = postSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const { subjectId, analytics, marketing } = parsed.data;
  const consent = await setConsent(subjectId, { analytics, marketing });
  return NextResponse.json({ consent });
}
