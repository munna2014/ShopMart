import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import CustomerView from "./CustomerView";

async function getUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token");

  if (!token) {
    return null;
  }

  try {
    // Communicate with Nginx container internally
    const res = await fetch("http://webserver/api/user", {
      headers: {
        Authorization: `Bearer ${token.value}`,
        Accept: "application/json",
        Host: "localhost", // Force Host header to match Nginx config
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("API response not OK:", res.status, text);
      return null;
    }

    return await res.json();
  } catch (error) {
    console.error("Server Fetch Error:", error);
    return null;
  }
}

export default async function Page() {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  // Format the join date if available, otherwise default
  const joinDate = user.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : "January 2024";

  // Transform backend data to frontend view model
  const customerData = {
    name: user.full_name || user.name || "Customer",
    email: user.email,
    phone: user.phone || "+1 (555) 123-4567",
    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(
      user.full_name || user.name || "Customer"
    )}&size=200&background=059669&color=fff`,
    joinDate: joinDate,
    totalOrders: 24, // Placeholder until order API is ready
    totalSpent: "$2,450.00",
    loyaltyPoints: 1250,
  };

  return <CustomerView customer={customerData} />;
}
