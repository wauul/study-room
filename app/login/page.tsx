import LoginClient from "@/components/LoginClient";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";
export default function LoginPage() {
  return (
    <LoginClient
      enabledProviders={authOptions.providers
        .filter((provider) => provider.type === "oauth")
        .map((provider) => provider.id)}
    />
  );
}
