import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import StartClient from "./StartClient";

export default async function StartPage() {
  const session = await getSession();
  if (!session.user) redirect("/");

  return (
    <StartClient
      username={session.user.username}
      avatarUrl={session.user.avatarUrl}
    />
  );
}
