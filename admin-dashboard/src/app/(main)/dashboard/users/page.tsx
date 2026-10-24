import { cookies } from "next/headers";

import { transformDbUsers } from "./_components/data";
import { Users } from "./_components/users";

async function getUsers() {
  try {
    // The users API needs the staff session, so pass this request's cookie on.
    const token = (await cookies()).get("admin_token")?.value;
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/v1/admin/users`, {
      cache: "no-store",
      headers: token ? { cookie: `admin_token=${encodeURIComponent(token)}` } : {},
    });
    const data = await response.json();
    return transformDbUsers(data.users || []);
  } catch (error) {
    console.error("Error fetching users:", error);
    return [];
  }
}

export default async function Page() {
  const users = await getUsers();
  return <Users users={users} />;
}
