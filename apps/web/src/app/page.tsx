// Next
import { redirect } from "next/navigation";

// "/" is outside the proxy matcher, because bee-link serves a public site: a signed-out
// visitor does reach this and is forwarded to /dashboard, which the proxy does guard.
export default function Home() {
  redirect("/dashboard");
}
