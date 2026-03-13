import { NextRequest, NextResponse } from 'next/server';
import { readdir, stat, unlink } from 'fs/promises';
import path from 'path';

/**
 * Endpoint para limpar mídias antigas (mais de X dias)
 * Uso: POST /api/media/cleanup?days=30
 */
export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const daysStr = searchParams.get('days') || '30';
    const days = parseInt(daysStr, 10);

    if (isNaN(days) || days < 1) {
      return NextResponse.json(
        { error: 'Parâmetro days deve ser um número maior que 0' },
        { status: 400 }
      );
    }

    const mediaDir = path.join(process.cwd(), 'public', 'media', 'whatsapp');
    const now = Date.now();
    const maxAge = days * 24 * 60 * 60 * 1000; // dias em ms

    const files = await readdir(mediaDir);
    let deletedCount = 0;
    let deletedSize = 0;

    for (const file of files) {
      // Ignorar .gitignore
      if (file === '.gitignore') continue;

      const filePath = path.join(mediaDir, file);
      const stats = await stat(filePath);

      // Se o arquivo é mais antigo que maxAge, deletar
      if (now - stats.mtime.getTime() > maxAge) {
        await unlink(filePath);
        deletedCount++;
        deletedSize += stats.size;
        console.log(`[MEDIA CLEANUP] Deletado: ${file} (${stats.size} bytes)`);
      }
    }

    return NextResponse.json({
      success: true,
      deletedCount,
      deletedSize,
      deletedSizeMB: (deletedSize / 1024 / 1024).toFixed(2),
      message: `${deletedCount} arquivo(s) deletado(s), ${(deletedSize / 1024 / 1024).toFixed(2)} MB liberados`,
    });

  } catch (error) {
    console.error('[MEDIA CLEANUP] Erro:', error);
    return NextResponse.json(
      { 
        error: 'Erro ao limpar mídias', 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}
