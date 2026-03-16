/**
 * API Route: Get Medeiros Products
 * Busca produtos da API da Medeiros Distribuidora
 */

import { NextRequest, NextResponse } from 'next/server';
import { ApiClient } from '@/libs/api';
import { getTlsFetchOptions } from '@/lib/serverTls';
import { handleApiError } from '@/utils/errors';

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
    return handleApiError(error);
  }
}
