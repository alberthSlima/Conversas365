"use client";

import Image from "next/image";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

export default function Header() {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center">
          <Image
            src="/medeiros365.png"
            alt="365 Logo"
            width={56}
            height={56}
            priority
          />
        </div>

        {/* Menu */}
        <nav className="flex items-center gap-6 ml-8">
          <a href="#" className="text-gray-500 hover:text-[#0850FD] font-normal font-sans">
            Dashboard
          </a>
          <div className="flex flex-col items-center">
            <a href="#" className="text-[#0850FD] hover:text-[#0850FD] font-medium font-sans">
              Conversas
            </a>
            <div className="w-full h-0.5 bg-[#0850FD] mt-1 rounded-full"></div>
          </div>
          <a href="#" className="text-gray-500 hover:text-[#0850FD] font-normal font-sans">
            Relatórios
          </a>
        </nav>

        {/* Profile */}
        <Popover>
          <PopoverTrigger asChild>
            <Avatar className="h-8 w-8 cursor-pointer">
              <AvatarFallback className="bg-[#F1F6FF] text-[#0850FD] text-sm font-medium">
                RC
              </AvatarFallback>
            </Avatar>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-4">
            <div className="space-y-3">
              <div>
                <p className="font-medium text-gray-900">Rafael Cifu</p>
                <p className="text-sm text-gray-500">rafael@medeiros365.com</p>
              </div>
              <Button 
                variant="outline" 
                className="w-full bg-red-50 border-red-200 text-red-600 hover:bg-red-100 hover:text-red-700 cursor-pointer"
              >
                Logout
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
} 