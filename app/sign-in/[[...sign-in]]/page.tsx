import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--bg-root,#1C1B1A)] p-4">
      <SignIn />
    </main>
  );
}
