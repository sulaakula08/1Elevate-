"use client";

import { AuthForm } from "@/components/AuthForm";

export default function SignupPage() {
  return (
    <div className="max-w-md mx-auto py-12 sm:py-16">
      <AuthForm mode="signup" />
    </div>
  );
}
