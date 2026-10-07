import Header from "@/components/Header";
import AccountClient from "@/components/AccountClient";
import { requireUser } from "@/lib/auth";
import { HttpError } from "@/lib/errors";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
export const dynamic = "force-dynamic";
export default async function AccountPage() {
  const user = await requireUser().catch(error => { if (error instanceof HttpError && error.status === 401) redirect("/login?next=/account"); throw error; });
  const rooms = await db.room.findMany({ where: { hostUserId: user.id }, select: { id: true, name: true }, take: 50 });
  return <><Header /><main id="main-content" className="shell"><AccountClient email={user.email} verified={!!user.emailVerified} initialRooms={rooms} /></main></>;
}
