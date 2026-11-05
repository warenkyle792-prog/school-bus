import ParentApp from "./ParentApp";
import { getSnapshot } from "@/lib/getSnapshot";

export const dynamic = "force-dynamic";

export const metadata = { title: "Parent · Safiri" };

export default async function ParentPage() {
  const initial = await getSnapshot();
  return <ParentApp initial={initial} />;
}
