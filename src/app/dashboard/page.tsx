"use client";

import Header from "@/components/Header";
import MessagesTable from "@/components/MessagesTable";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <MessagesTable />
          </div>
        </div>
      </main>
    </div>
  );
} 