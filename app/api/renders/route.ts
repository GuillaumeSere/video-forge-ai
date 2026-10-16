import { ZodError } from 'zod';
import { createRenderJob, listRenderJobs, retryRenderJob } from '@/src/lib/renders';

export async function GET() {
  return Response.json(await listRenderJobs());
}

export async function POST(request: Request) {
  if (Number(request.headers.get('content-length') ?? 0) > 1_000_000) {
    return Response.json({ error: 'Le projet dépasse la taille autorisée.' }, { status: 413 });
  }

  try {
    const body: unknown = await request.json();
    if (typeof body === 'object' && body !== null && 'retryId' in body && typeof body.retryId === 'string') {
      const retried = await retryRenderJob(body.retryId);
      if (!retried) return Response.json({ error: 'Ce rendu ne peut pas être relancé.' }, { status: 409 });
      return Response.json(retried, { status: 202 });
    }

    const job = await createRenderJob(body);
    return Response.json(job, { status: 202 });
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      return Response.json({ error: 'Le projet contient des données invalides.' }, { status: 400 });
    }

    console.error('Render queue error:', error);
    return Response.json({ error: 'La tâche de rendu n’a pas pu être créée.' }, { status: 500 });
  }
}
