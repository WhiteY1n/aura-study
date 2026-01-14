"use client";

import { motion } from "framer-motion";
import { Mail, X, CheckCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface EmailConfirmationProps {
  email: string;
  onClose: () => void;
}

export function EmailConfirmation({ email, onClose }: EmailConfirmationProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-secondary/20 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        className="w-full max-w-md"
      >
        <Card className="border-border/50 shadow-2xl relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4 h-8 w-8"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>

          <CardHeader className="text-center space-y-4 pt-12">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center"
            >
              <Mail className="h-10 w-10 text-primary" />
            </motion.div>

            <CardTitle className="text-2xl font-bold">
              Check your email
            </CardTitle>

            <CardDescription className="text-base">
              We&apos;ve sent a confirmation link to
            </CardDescription>

            <p className="text-sm font-medium text-foreground">{email}</p>
          </CardHeader>

          <CardContent className="space-y-6 pb-8">
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <p>Click the link in the email to verify your account</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <p>Once verified, you&apos;ll be automatically signed in</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <p>You can close this window and return later</p>
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground text-center">
                Didn&apos;t receive the email? Check your spam folder or try
                signing up again.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
