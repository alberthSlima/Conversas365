"use client";

import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F1F6FF]">
      <Card className="w-full max-w-md shadow-lg border-none">
        <CardHeader className="flex flex-col items-center gap-2">
          <Image
            src="/medeiros365.png"
            alt="365 Logo"
            width={64}
            height={64}
            className="mb-2"
            priority
          />
          <CardTitle className="text-2xl font-semibold text-gray-900 font-sans">Conversas 365</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4">
            <Input
              type="email"
              placeholder="E-mail"
              className="h-12 bg-white border-gray-300 focus:border-[#0850FD] font-sans"
              autoComplete="username"
              required
            />
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Senha"
                className="h-12 bg-white border-gray-300 focus:border-[#0850FD] font-sans pr-10"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-400" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400" />
                )}
              </button>
            </div>
            <Button type="submit" className="h-12 bg-[#0850FD] hover:bg-[#0640CC] text-white font-sans font-medium mt-2 cursor-pointer">
              Entrar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 