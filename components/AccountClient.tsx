"use client";
import { useState } from "react";
import { signOut } from "next-auth/react";
import BotCheck from "./BotCheck";
import { useLanguage } from "./LanguageProvider";
import Dialog from "./Dialog";
import Link from "next/link";
export default function AccountClient({ email, verified, initialRooms }: { email: string; verified: boolean; initialRooms: {id:string;name:string}[] }) {
  const { t } = useLanguage();
  const [token, setToken] = useState(""), [reset, setReset] = useState(0), [busy, setBusy] = useState(false), [message, setMessage] = useState(""), [confirm, setConfirm] = useState("");
  const [rooms, setRooms] = useState(initialRooms), [deleting, setDeleting] = useState<string | null>(null);
  async function verify() {
    setBusy(true); setMessage("");
    try {
      const r = await fetch("/api/account/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ botToken: token }) });
      const body = await r.json(); if (!r.ok) throw new Error(body.error);
      setMessage("Check your inbox for a verification link. It expires in one hour.");
    } catch (error) { setMessage((error as Error).message); }
    finally { setBusy(false); setReset(v => v + 1); }
  }
  async function remove() {
    setBusy(true); setMessage("");
    try {
      const r = await fetch("/api/account", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirmation: confirm }) });
      const body = await r.json(); if (!r.ok) throw new Error(body.error);
      await signOut({ callbackUrl: "/" });
    } catch (error) { setMessage((error as Error).message); setBusy(false); }
  }
  return <div className="form-wrap stack"><h1>{t("Account")}</h1><p>{email}</p><p>{verified ? t("Email verified") : t("Verify your email before creating rooms, joining sessions, or requesting AI and email reports.")}</p>
    {!verified && <><BotCheck action="verify" onToken={setToken} resetKey={reset} /><button disabled={busy || !token} onClick={verify}>{t("Send verification email")}</button></>}
    <p role="status">{t(message)}</p><h2>{t("Your hosted rooms")}</h2>{rooms.map(room => <div className="row between" key={room.id}><Link href={`/rooms/${room.id}`}>{room.name}</Link><button className="quiet" disabled={busy} onClick={() => setDeleting(room.id)}>{t("Delete room")}</button></div>)}
    {deleting && <Dialog title={t("Delete room")} busy={busy} onClose={() => setDeleting(null)}><p>{t("Permanently delete this room, its documents, messages and quiz results?")}</p><button disabled={busy} onClick={async () => { setBusy(true); try { const r = await fetch(`/api/rooms/${deleting}`, {method:"DELETE"}); const body = await r.json(); if(!r.ok)throw new Error(body.error); setRooms(old=>old.filter(room=>room.id!==deleting)); setDeleting(null); }catch(error){setMessage((error as Error).message);}finally{setBusy(false);} }}>{t("Delete room permanently")}</button><button className="secondary" disabled={busy} onClick={()=>setDeleting(null)}>{t("Cancel")}</button></Dialog>}
    <h2>{t("Delete account")}</h2><p>{t("This permanently deletes your account, hosted rooms, and personal participation records. This cannot be undone.")}</p>
    <label>{t("Type DELETE to confirm")}<input value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="off" /></label>
    <button disabled={busy || confirm !== "DELETE"} onClick={remove}>{t("Delete account permanently")}</button>
    <button className="secondary" disabled={busy} onClick={() => signOut({ callbackUrl: "/" })}>{t("Sign out")}</button></div>;
}
