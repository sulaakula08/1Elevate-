"use client";

import { AuthForm } from "@/components/AuthForm";

export default function LoginPage() {
  return (
    <div className="max-w-md mx-auto py-12 sm:py-16">
      <AuthForm mode="signin" />
    </div>
  );
}
