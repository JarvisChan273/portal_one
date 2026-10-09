"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { authenticate, createSession, createUser } from "@/lib/accounts";
import { clearSessionCookie, getCurrentUser, setSessionCookie } from "@/lib/current-user";
import { database } from "@/lib/database";
import { PortalError } from "@/lib/errors";
import { normalizeEmail } from "@/lib/passwords";
import {
  createGroup,
  deleteGroup,
  deleteLink,
  moveGroup,
  moveLink,
  moveLinkToGroup,
  renameGroup,
  saveCatalogSite,
  saveLink,
  setPinned,
} from "@/lib/portal";
import { safeNextPath } from "@/lib/safe-next";
import { loginBlocked, loginFailed, loginSucceeded } from "@/lib/throttle";

export type FormState = { error: string };

function directionOf(value: FormDataEntryValue | null): -1 | 1 {
  return value === "up" ? -1 : 1;
}

async function signedInUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/signin?next=/portal");
  return user;
}

function rethrowUnlessPortalError(error: unknown): FormState {
  if (error instanceof PortalError) return { error: error.message };
  throw error;
}

export async function signUpAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const nextPath = safeNextPath(String(formData.get("next") ?? ""));
  if (password !== confirm) return { error: "Those passwords do not match." };

  try {
    const user = createUser(database(), String(formData.get("email") ?? ""), password);
    await setSessionCookie(createSession(database(), user.id));
  } catch (error) {
    return rethrowUnlessPortalError(error);
  }

  revalidatePath("/", "layout");
  redirect(nextPath);
}

export async function signInAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");
  const nextPath = safeNextPath(String(formData.get("next") ?? ""));
  if (loginBlocked(email)) return { error: "Too many attempts. Try again in a few minutes." };

  const user = authenticate(database(), email, password);
  if (!user) {
    loginFailed(email);
    return { error: "Email or password is wrong." };
  }

  loginSucceeded(email);
  await setSessionCookie(createSession(database(), user.id));
  revalidatePath("/", "layout");
  redirect(nextPath);
}

export async function signOutAction(): Promise<void> {
  await clearSessionCookie();
  revalidatePath("/", "layout");
  redirect("/explore");
}

export async function addLinkAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const user = await signedInUser();
  try {
    const result = saveLink(
      database(),
      user.id,
      String(formData.get("url") ?? ""),
      String(formData.get("title") ?? ""),
    );
    revalidatePath("/portal");
    revalidatePath("/explore");
    redirect(`/portal?notice=${result.existed ? "already-saved" : "saved"}#link-${result.id}`);
  } catch (error) {
    return rethrowUnlessPortalError(error);
  }
}

export async function saveCatalogAction(formData: FormData): Promise<void> {
  const returnTo = safeNextPath(String(formData.get("returnTo") ?? ""), "/explore");
  const user = await getCurrentUser();
  if (!user) redirect(`/signin?next=${encodeURIComponent(returnTo)}`);

  try {
    const result = saveCatalogSite(database(), user.id, String(formData.get("catalogSiteId") ?? ""));
    revalidatePath("/portal");
    revalidatePath("/explore");
    redirect(`/portal?notice=${result.existed ? "already-saved" : "saved"}#link-${result.id}`);
  } catch (error) {
    if (error instanceof PortalError) {
      redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}error=${encodeURIComponent(error.message)}`);
    }
    throw error;
  }
}

export async function addUrlAction(formData: FormData): Promise<void> {
  const returnTo = safeNextPath(String(formData.get("returnTo") ?? ""), "/explore");
  const user = await getCurrentUser();
  if (!user) redirect(`/signin?next=${encodeURIComponent(returnTo)}`);
  try {
    const result = saveLink(database(), user.id, String(formData.get("url") ?? ""));
    revalidatePath("/portal");
    revalidatePath("/explore");
    redirect(`/portal?notice=${result.existed ? "already-saved" : "saved"}#link-${result.id}`);
  } catch (error) {
    if (error instanceof PortalError) {
      redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}error=${encodeURIComponent(error.message)}`);
    }
    throw error;
  }
}

async function mutatePortal(formData: FormData, run: (userId: string) => void): Promise<void> {
  const user = await signedInUser();
  const view = formData.get("view") === "recent" ? "?view=recent" : "";
  try {
    run(user.id);
  } catch (error) {
    if (error instanceof PortalError) {
      redirect(`/portal${view}${view ? "&" : "?"}error=${encodeURIComponent(error.message)}`);
    }
    throw error;
  }
  revalidatePath("/portal");
  redirect(`/portal${view}`);
}

export async function createGroupAction(formData: FormData): Promise<void> {
  await mutatePortal(formData, (userId) => {
    createGroup(database(), userId, String(formData.get("name") ?? ""));
  });
}

export async function renameGroupAction(formData: FormData): Promise<void> {
  await mutatePortal(formData, (userId) => {
    renameGroup(database(), userId, String(formData.get("id") ?? ""), String(formData.get("name") ?? ""));
  });
}

export async function deleteGroupAction(formData: FormData): Promise<void> {
  await mutatePortal(formData, (userId) => {
    deleteGroup(database(), userId, String(formData.get("id") ?? ""));
  });
}

export async function moveGroupAction(formData: FormData): Promise<void> {
  await mutatePortal(formData, (userId) => {
    moveGroup(database(), userId, String(formData.get("id") ?? ""), directionOf(formData.get("direction")));
  });
}

export async function setPinnedAction(formData: FormData): Promise<void> {
  await mutatePortal(formData, (userId) => {
    setPinned(database(), userId, String(formData.get("id") ?? ""), formData.get("pinned") === "1");
  });
}

export async function deleteLinkAction(formData: FormData): Promise<void> {
  await mutatePortal(formData, (userId) => {
    deleteLink(database(), userId, String(formData.get("id") ?? ""));
  });
}

export async function moveLinkAction(formData: FormData): Promise<void> {
  await mutatePortal(formData, (userId) => {
    moveLink(database(), userId, String(formData.get("id") ?? ""), directionOf(formData.get("direction")));
  });
}

export async function moveLinkToGroupAction(formData: FormData): Promise<void> {
  const rawGroup = String(formData.get("groupId") ?? "");
  await mutatePortal(formData, (userId) => {
    moveLinkToGroup(database(), userId, String(formData.get("id") ?? ""), rawGroup || null);
  });
}
