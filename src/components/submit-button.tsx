"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Submit button that shows a spinner while its form's server action runs. */
export function SubmitButton({ children, className, size }: { children: React.ReactNode; className?: string; size?: "default" | "lg" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} size={size} className={className}>
      {pending && <Loader2 className="h-5 w-5 animate-spin" />}
      {children}
    </Button>
  );
}
