import { transformDbUsers } from "./_components/data";
import { Users } from "./_components/users";

async function getUsers() {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/v1/admin/users`, {
      cache: "no-store",
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
