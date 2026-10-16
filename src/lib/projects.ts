import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';

const sceneSchema = z.object({
    id: z.string().min(1).max(80),
    narration: z.string().max(5000),
    caption: z.string().max(200),
    duration: z.number().int().min(1).max(60),
    mediaType: z.enum(['color', 'image', 'video']),
    mediaId: z.string().uuid().optional(),
    mediaName: z.string().max(255).optional(),
    transition: z.enum(['fade', 'cut', 'slide']).default('fade'),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

export const projectSchema = z.object({
    id: z.string().min(1).max(80),
    title: z.string().trim().min(1).max(100),
    topic: z.string().trim().min(1).max(200),
    format: z.enum(['9:16', '16:9', '1:1']),
    language: z.string().max(30).default('Fran\u00e7ais'),
    targetDuration: z.number().int().min(5).max(300).default(30),
    scenes: z.array(sceneSchema).min(1).max(60),
    updatedAt: z.string().datetime().optional(),
});

export type Project = Omit<z.infer<typeof projectSchema>, 'updatedAt'> & { updatedAt: string };

const dataFile = path.join(process.cwd(), 'data', 'projects.json');

async function readAll(): Promise<Project[]> {
    try {
        const content = await readFile(dataFile, 'utf8');
        const parsed: unknown = JSON.parse(content);
        return z.array(projectSchema).parse(parsed).map((project) => ({
            ...project,
            updatedAt: project.updatedAt ?? new Date(0).toISOString(),
        }));
    } catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return [];
        if (error instanceof SyntaxError) return [];
        throw error;
    }
}

export async function listProjects(): Promise<Project[]> {
    return (await readAll()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function saveProject(input: unknown): Promise<Project> {
    const project = projectSchema.parse(input);
    const projects = await readAll();
    const saved: Project = { ...project, updatedAt: new Date().toISOString() };
    const next = projects.filter((item) => item.id !== saved.id);
    next.push(saved);
    await mkdir(path.dirname(dataFile), { recursive: true });
    await writeFile(dataFile, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
    return saved;
}

export async function deleteProject(id: string): Promise<boolean> {
  const projects = await readAll();
  const remaining = projects.filter((project) => project.id !== id);
  if (remaining.length === projects.length) return false;

  await mkdir(path.dirname(dataFile), { recursive: true });
  await writeFile(dataFile, `${JSON.stringify(remaining, null, 2)}\n`, 'utf8');
  return true;
}
