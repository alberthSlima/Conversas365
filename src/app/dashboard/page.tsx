import Header from "@/components/Header";
import DataTable from "@/components/DataTable";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <DataTable />
          </div>
        </div>
      </main>
    </div>
  );
} 