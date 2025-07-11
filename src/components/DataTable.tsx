"use client";

import { useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
} from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Filter, Calendar, MousePointer, Search } from "lucide-react";

// Mock data type
type HSMData = {
  id: string;
  nome: string;
  telefone: string;
  codigoCliente: string;
  dataEnvio: string;
  hsm: string;
  status: "enviado" | "entregue" | "não entregue" | "lido" | "não lido";
  cliqueBotao: boolean;
  resposta: boolean;
  erros: string;
};

// Mock data
const mockData: HSMData[] = Array.from({ length: 100 }, (_, i) => ({
  id: `hsm-${i + 1}`,
  nome: `Cliente ${i + 1}`,
  telefone: `+55 11 9${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
  codigoCliente: `CLI-${String(i + 1).padStart(4, '0')}`,
  dataEnvio: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR'),
  hsm: `Esta é uma mensagem HSM de exemplo número ${i + 1}. Contém informações importantes sobre o produto ou serviço oferecido pela empresa. Pode ser uma mensagem promocional, informativa ou de notificação.`,
  status: ["enviado", "entregue", "não entregue", "lido", "não lido"][Math.floor(Math.random() * 5)] as HSMData["status"],
  cliqueBotao: Math.random() > 0.5,
  resposta: Math.random() > 0.6,
  erros: Math.random() > 0.8 ? `Erro de conexão timeout após ${Math.floor(Math.random() * 30) + 1} segundos. Tentativa de reenvio falhada.` : "",
}));

const columnHelper = createColumnHelper<HSMData>();

export default function DataTable() {
  const [data] = useState(mockData);
  const [globalFilter, setGlobalFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [clickFilter, setClickFilter] = useState("all");
  const [pageSize, setPageSize] = useState(20);

  const columns = [
    columnHelper.accessor("nome", {
      header: "Nome/Telefone",
      cell: (info) => (
        <div className="min-w-[180px]">
          <div className="font-medium text-gray-900">{info.getValue()}</div>
          <div className="text-sm text-gray-500">{info.row.original.telefone}</div>
        </div>
      ),
    }),
    columnHelper.accessor("codigoCliente", {
      header: "Código do Cliente",
      cell: (info) => (
        <div className="min-w-[120px] font-mono text-sm">
          {info.getValue()}
        </div>
      ),
    }),
    columnHelper.accessor("dataEnvio", {
      header: "Data de Envio",
      cell: (info) => (
        <div className="min-w-[100px] text-sm">
          {info.getValue()}
        </div>
      ),
    }),
    columnHelper.accessor("hsm", {
      header: "HSM",
      cell: (info) => (
        <div className="min-w-[300px] max-w-[300px]">
          <div 
            className="line-clamp-1 text-sm text-gray-700 cursor-help"
            title={info.getValue()}
          >
            {info.getValue()}
          </div>
        </div>
      ),
    }),
    columnHelper.accessor("status", {
      header: "Status",
      cell: (info) => {
        const status = info.getValue();
        const getStatusColor = (status: string) => {
          switch (status) {
            case "enviado": return "bg-blue-100 text-blue-800";
            case "entregue": return "bg-green-100 text-green-800";
            case "não entregue": return "bg-red-100 text-red-800";
            case "lido": return "bg-emerald-100 text-emerald-800";
            case "não lido": return "bg-yellow-100 text-yellow-800";
            default: return "bg-gray-100 text-gray-800";
          }
        };
        return (
          <div className="min-w-[100px]">
            <Badge className={`${getStatusColor(status)} border-0`}>
              {status}
            </Badge>
          </div>
        );
      },
    }),
    columnHelper.accessor("cliqueBotao", {
      header: "Clique Botão",
      cell: (info) => (
        <div className="min-w-[80px] text-center">
          <Badge className={info.getValue() ? "bg-green-100 text-green-800 border-0" : "bg-gray-100 text-gray-800 border-0"}>
            {info.getValue() ? "Sim" : "Não"}
          </Badge>
        </div>
      ),
    }),
    columnHelper.accessor("resposta", {
      header: "Resposta",
      cell: (info) => (
        <div className="min-w-[80px] text-center">
          <Badge className={info.getValue() ? "bg-green-100 text-green-800 border-0" : "bg-gray-100 text-gray-800 border-0"}>
            {info.getValue() ? "Sim" : "Não"}
          </Badge>
        </div>
      ),
    }),
    columnHelper.accessor("erros", {
      header: "Erros",
      cell: (info) => (
        <div className="min-w-[200px] max-w-[200px]">
          {info.getValue() ? (
            <div 
              className="line-clamp-2 text-sm text-red-600 cursor-help"
              title={info.getValue()}
            >
              {info.getValue()}
            </div>
          ) : (
            <span className="text-sm text-gray-400">-</span>
          )}
        </div>
      ),
    }),
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    globalFilterFn: "includesString",
    state: {
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
    initialState: {
      pagination: {
        pageSize: pageSize,
      },
    },
  });

  return (
    <div className="space-y-6 p-6">
      {/* Title and Description */}
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-gray-900">Conversas HSM</h1>
        <p className="text-gray-600">Visualize e gerencie todas as mensagens HSM enviadas pelo WhatsApp Business API</p>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Pesquise por código de cliente, nome ou telefone"
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="w-96 h-11 pl-10"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48 !h-11 cursor-pointer hover:bg-gray-50">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="cursor-pointer">Todos Status</SelectItem>
              <SelectItem value="enviado" className="cursor-pointer">Enviado</SelectItem>
              <SelectItem value="entregue" className="cursor-pointer">Entregue</SelectItem>
              <SelectItem value="não entregue" className="cursor-pointer">Não Entregue</SelectItem>
              <SelectItem value="lido" className="cursor-pointer">Lido</SelectItem>
              <SelectItem value="não lido" className="cursor-pointer">Não Lido</SelectItem>
            </SelectContent>
          </Select>

          <Select value={clickFilter} onValueChange={setClickFilter}>
            <SelectTrigger className="w-48 !h-11 cursor-pointer hover:bg-gray-50">
              <MousePointer className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Clique" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="cursor-pointer">Clique Botão</SelectItem>
              <SelectItem value="sim" className="cursor-pointer">Sim</SelectItem>
              <SelectItem value="não" className="cursor-pointer">Não</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" className="gap-2 !h-11 cursor-pointer font-normal">
            <Calendar className="h-4 w-4" />
            Últimos 30 dias
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="w-full overflow-x-auto border rounded-lg">
        <table className="w-full">
          <thead className="bg-gray-50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-4 border-b">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-700">
            Mostrando {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} a{" "}
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              table.getFilteredRowModel().rows.length
            )}{" "}
            de {table.getFilteredRowModel().rows.length} resultados
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700">Ver</span>
            <Select 
              value={pageSize.toString()} 
              onValueChange={(value) => {
                setPageSize(Number(value));
                table.setPageSize(Number(value));
              }}
            >
              <SelectTrigger className="w-20 cursor-pointer">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="20" className="cursor-pointer">20</SelectItem>
                <SelectItem value="50" className="cursor-pointer">50</SelectItem>
                <SelectItem value="100" className="cursor-pointer">100</SelectItem>
                <SelectItem value="200" className="cursor-pointer">200</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-gray-700">linhas</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          {/* Page Numbers */}
          {Array.from({ length: Math.min(5, table.getPageCount()) }, (_, i) => {
            const pageIndex = table.getState().pagination.pageIndex;
            const startPage = Math.max(0, pageIndex - 2);
            const pageNumber = startPage + i;
            
            if (pageNumber >= table.getPageCount()) return null;
            
            return (
              <Button
                key={pageNumber}
                variant={pageNumber === pageIndex ? "default" : "outline"}
                size="sm"
                onClick={() => table.setPageIndex(pageNumber)}
                className={`cursor-pointer ${pageNumber === pageIndex ? "bg-[#0850FD] text-white" : ""}`}
              >
                {pageNumber + 1}
              </Button>
            );
          })}
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="cursor-pointer"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
} 