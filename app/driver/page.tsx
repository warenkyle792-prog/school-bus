import DriverApp from "./DriverApp";
import { getSnapshot } from "@/lib/getSnapshot";

export const dynamic = "force-dynamic";

export const metadata = { title: "Driver · Safiri" };

export default async function DriverPage() {
  const initial = await getSnapshot();
  return <DriverApp initial={initial} />;
}
