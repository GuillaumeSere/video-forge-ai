import { ZodError } from 'zod';
import { deleteProject, listProjects, saveProject } from '@/src/lib/projects';

export async function GET() {
  return Response.json(await listProjects());
}

export async function POST(request: Request) {
  if (Number(request.headers.get('content-length') ?? 0) > 256_000) {
    return Response.json(
      { error: 'La requ\u00eate d\u00e9passe la taille autoris\u00e9e.' },
      { status: 413 },
    );
  }

  try {
    const project = await saveProject(await request.json());
    return Response.json(project, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      return Response.json(
        { error: 'Les informations du projet sont invalides.' },
        { status: 400 },
      );
    }

    console.error('Project storage error:', error);
    return Response.json(
      { error: 'Le projet n\u2019a pas pu \u00eatre enregistr\u00e9.' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get('id');
  if (!id || id.length > 80) {
    return Response.json({ error: 'Identifiant de projet invalide.' }, { status: 400 });
  }

  const deleted = await deleteProject(id);
  if (!deleted) {
    return Response.json({ error: 'Projet introuvable.' }, { status: 404 });
  }

  return new Response(null, { status: 204 });
}
