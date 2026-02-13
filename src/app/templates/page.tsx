"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { useTemplates } from "@/application/hooks/useTemplates";

export default function TemplatesPage() {
  const router = useRouter();
  const { templates: domainTemplates, loading, error } = useTemplates();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Converter Domain Entities para formato UI (mantém compatibilidade)
  const templates = domainTemplates.map(t => t.toPrimitives());

  // Filtrar por nome
  const filteredTemplates = templates.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Paginação
  const totalPages = Math.ceil(filteredTemplates.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTemplates = filteredTemplates.slice(startIndex, endIndex);

  // Resetar página ao filtrar
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Header />
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-12 text-center">
              <div className="animate-spin w-16 h-16 mx-auto border-4 border-blue-600 border-t-transparent rounded-full mb-4"></div>
              <p className="text-gray-600 text-lg font-medium">Carregando templates...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Header />
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-12 text-center">
              <svg className="w-16 h-16 mx-auto text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-600 text-lg font-semibold">Erro ao carregar templates</p>
              <p className="text-gray-500 mt-2">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Header />
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
        {/* Header da Página */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">WhatsApp Templates</h1>
              <p className="text-gray-600 mt-1">Gerencie seus templates de mensagem</p>
            </div>
          </div>

          {/* Campo de pesquisa */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex-1 w-full sm:max-w-2xl">
                <div className="relative">
                  <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Pesquisar templates por nome..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 px-4 py-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-blue-900">{filteredTemplates.length}</p>
                  <p className="text-xs text-blue-600">Templates</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      
        {filteredTemplates.length === 0 && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-12 text-center">
            <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-gray-500 text-lg font-medium">Nenhum template encontrado</p>
            <p className="text-gray-400 text-sm mt-2">Tente ajustar sua pesquisa</p>
          </div>
        )}

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {currentTemplates.map((t) => (
            <div
              key={t.id}
              onClick={() => router.push(`/templates/${t.id}`)}
              className="group bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-6 cursor-pointer hover:shadow-2xl hover:border-blue-500 transition-all duration-200 hover:-translate-y-1"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 group-hover:from-blue-600 group-hover:to-indigo-600 rounded-xl flex items-center justify-center transition-all duration-200">
                  <svg className="w-6 h-6 text-blue-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <h3 className="font-bold text-lg text-gray-900 group-hover:text-blue-700 transition-colors mb-3 line-clamp-2">{t.name}</h3>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 group-hover:bg-blue-50 rounded-lg text-xs font-medium text-gray-700 group-hover:text-blue-700 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                  </svg>
                  {t.language}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 group-hover:bg-blue-50 rounded-lg text-xs font-medium text-gray-700 group-hover:text-blue-700 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  {t.category}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Controles de Paginação */}
        {filteredTemplates.length > 0 && totalPages > 1 && (
          <div className="mt-8 bg-white rounded-2xl shadow-xl border border-gray-200 p-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-2 px-6 py-3 border-2 border-gray-300 rounded-xl text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 hover:border-blue-500 transition-all disabled:hover:border-gray-300 disabled:hover:bg-white"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Anterior
              </button>
              
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700">
                  Página
                </span>
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={currentPage}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (val >= 1 && val <= totalPages) setCurrentPage(val);
                  }}
                  className="w-16 px-3 py-2 border-2 border-gray-300 rounded-xl text-center text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <span className="text-sm font-medium text-gray-700">
                  de {totalPages}
                </span>
              </div>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-2 px-6 py-3 border-2 border-gray-300 rounded-xl text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 hover:border-blue-500 transition-all disabled:hover:border-gray-300 disabled:hover:bg-white"
              >
                Próxima
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
