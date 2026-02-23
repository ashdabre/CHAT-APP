import { Webhook } from "svix";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { api } from "../../../../../convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";

const convex = new ConvexHttpClient(
  process.env.NEXT_PUBLIC_CONVEX_URL!
);

export async function POST(req: Request) {
  const body = await req.text();

  // ✅ FIX: headers() must be awaited in Next 15
  const headerPayload = await headers();

  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new NextResponse("Missing headers", { status: 400 });
  }

  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);

  let evt: any;

  try {
    evt = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    });
  } catch (err) {
    console.error("Webhook verification failed", err);
    return new NextResponse("Invalid signature", { status: 400 });
  }

  const { type, data } = evt;

  if (type === "user.created" || type === "user.updated") {
    await convex.mutation(api.users.syncUser, {
      clerkId: data.id,
      name: `${data.first_name ?? ""} ${data.last_name ?? ""}`.trim(),
      email: data.email_addresses?.[0]?.email_address ?? "",
      avatarUrl: data.image_url,
    });
  }

  return NextResponse.json({ success: true });
}