import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { database } from "@/lib/database";
import { recordOpen } from "@/lib/portal";

export async function GET(_request: Request, context: { params: Promise<{ savedLinkId: string }> }) {
  const { savedLinkId } = await context.params;
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/signin?next=${encodeURIComponent(`/go/${savedLinkId}`)}`);
  }
  const opened = recordOpen(database(), user.id, savedLinkId);
  if (!opened) notFound();
  redirect(opened.url);
}
