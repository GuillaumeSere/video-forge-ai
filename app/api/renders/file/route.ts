import { readFile, stat } from 'node:fs/promises';
import { getRenderJob, getRenderOutputPath } from '@/src/lib/renders';

export async function GET(request: Request) {
  const jobId = new URL(request.url).searchParams.get('id') ?? '';
  const job = await getRenderJob(jobId);
  if (!job || job.status !== 'completed' || job.outputKey !== `${jobId}.mp4`) {
    return Response.json({ error: 'Le fichier MP4 n’est pas disponible.' }, { status: 404 });
  }

  try {
    const outputPath = getRenderOutputPath(jobId);
    const fileInfo = await stat(outputPath);
    const content = await readFile(outputPath);
    return new Response(content, {
      headers: {
        'content-type': 'video/mp4',
        'content-length': String(fileInfo.size),
        'content-disposition': `attachment; filename="videoforge-${jobId}.mp4"`,
        'cache-control': 'private, no-store',
        'x-content-type-options': 'nosniff',
      },
    });
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return Response.json({ error: 'Le fichier MP4 est introuvable.' }, { status: 404 });
    }
    throw error;
  }
}
