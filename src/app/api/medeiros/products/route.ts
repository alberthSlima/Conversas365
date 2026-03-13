/**
 * API Route: Get Medeiros Products
 * Busca produtos da API da Medeiros Distribuidora
 */

import { NextRequest, NextResponse } from 'next/server';
import { ApiClient } from '@/infrastructure/http/ApiClient';
import { getTlsFetchOptions } from '@/lib/serverTls';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const branch = searchParams.get('branch') || '1';

    const client = new ApiClient();
    const endpoint = `/api/v2/offers/products?branch=${branch}`;
    const tlsOpts = await getTlsFetchOptions(client.getFullUrl(endpoint));
    const products = await client.get<unknown[]>(endpoint, tlsOpts);

    return NextResponse.json(products);
  } catch (error) {
    console.error('[MEDEIROS API ERROR]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao buscar produtos' },
      { status: 500 }
    );
  }
}
