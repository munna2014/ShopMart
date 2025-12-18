import { cookies } from "next/headers";
import AboutClient from "./AboutClient";

export default async function AboutPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token");
  const isLoggedIn = !!token;

  return <AboutClient isLoggedIn={isLoggedIn} />;
}
