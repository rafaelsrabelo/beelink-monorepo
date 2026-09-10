// Next
import { redirect } from "next/navigation";

// Signed-out visitors never reach this: src/proxy.ts sends them to /login first.
export default function Home() {
  redirect("/dashboard");
}
