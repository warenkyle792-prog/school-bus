import ConsoleShell from "./ConsoleShell";
import { getSnapshot } from "@/lib/getSnapshot";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Operations console · Safiri",
};

export default async function ConsolePage() {
  // Render with live data on the server so the console opens populated; the
  // client takes over polling from this first snapshot.
  const initial = await getSnapshot();
  return <ConsoleShell initial={initial} />;
}
