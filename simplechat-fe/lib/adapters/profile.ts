export function profileName(name: string | null | undefined): string {
  return name?.trim().slice(0, 100) || "User";
}

export async function writeProfile(
  getToken: () => Promise<string>,
  method: "POST" | "PATCH",
  name: string,
) {
  const token = await getToken();
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/profile`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error || "The request failed. Try again.");
  }
}
