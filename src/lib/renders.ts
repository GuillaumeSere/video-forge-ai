import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { projectSchema, type Project } from './projects';

const idSchema = z.string().uuid();
const root = path.join(process.cwd(), 'storage', 'renders');
const jobsDirectory = path.join(root, 'jobs');
const pendingDirectory = path.join(root, 'pending');
const processingDirectory = path.join(root, 'processing');
export const renderOutputDirectory = path.join(root, 'output');

export type RenderStatus = 'queued' | 'rendering' | 'completed' | 'failed';

export type RenderJob = {
  id: string;
  projectId: string;
  projectTitle: string;
  project: Project;
  status: RenderStatus;
  progress: number;
  outputKey: string | null;
  errorMessage: string | null;
  attempts: number;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
};

async function ensureDirectories() {
  await Promise.all([
    mkdir(jobsDirectory, { recursive: true }),
    mkdir(pendingDirectory, { recursive: true }),
    mkdir(processingDirectory, { recursive: true }),
    mkdir(renderOutputDirectory, { recursive: true }),
  ]);
}

async function readJobFile(id: string): Promise<RenderJob | null> {
  if (!idSchema.safeParse(id).success) return null;
  try {
    return JSON.parse(await readFile(path.join(jobsDirectory, `${id}.json`), 'utf8')) as RenderJob;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return null;
    throw error;
  }
}

async function writeJob(job: RenderJob) {
  const temp = path.join(jobsDirectory, `${job.id}.${process.pid}.${Date.now()}.tmp`);
  await writeFile(temp, `${JSON.stringify(job, null, 2)}\n`, 'utf8');
  await rename(temp, path.join(jobsDirectory, `${job.id}.json`));
}

export async function createRenderJob(input: unknown): Promise<RenderJob> {
  await ensureDirectories();
  const parsedProject = projectSchema.parse(input);
  const project: Project = {
    ...parsedProject,
    updatedAt: parsedProject.updatedAt ?? new Date().toISOString(),
  };
  const id = crypto.randomUUID();
  const job: RenderJob = {
    id,
    projectId: project.id,
    projectTitle: project.title,
    project,
    status: 'queued',
    progress: 0,
    outputKey: null,
    errorMessage: null,
    attempts: 0,
    createdAt: new Date().toISOString(),
    startedAt: null,
    completedAt: null,
  };

  await writeJob(job);
  await writeFile(path.join(pendingDirectory, `${id}.json`), JSON.stringify(job), { flag: 'wx' });
  return job;
}

export async function getRenderJob(id: string) {
  return readJobFile(id);
}

export async function listRenderJobs() {
  await ensureDirectories();
  const files = (await readdir(jobsDirectory)).filter((file) => /^[0-9a-f-]{36}\.json$/i.test(file));
  const jobs = await Promise.all(files.map((file) => readJobFile(file.slice(0, -5))));
  return jobs.filter((job): job is RenderJob => job !== null).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function retryRenderJob(id: string) {
  await ensureDirectories();
  const job = await readJobFile(id);
  if (!job || job.status !== 'failed') return null;

  const retried: RenderJob = {
    ...job,
    status: 'queued',
    progress: 0,
    errorMessage: null,
    outputKey: null,
    attempts: job.attempts + 1,
    startedAt: null,
    completedAt: null,
  };
  await writeJob(retried);
  await writeFile(path.join(pendingDirectory, `${id}.json`), JSON.stringify(retried), { flag: 'wx' });
  return retried;
}

export async function claimNextRenderJob() {
  await ensureDirectories();
  const files = (await readdir(pendingDirectory)).filter((file) => /^[0-9a-f-]{36}\.json$/i.test(file));
  for (const file of files) {
    const source = path.join(pendingDirectory, file);
    const claimed = path.join(processingDirectory, file);
    try {
      await rename(source, claimed);
      const job = JSON.parse(await readFile(claimed, 'utf8')) as RenderJob;
      const started: RenderJob = { ...job, status: 'rendering', startedAt: new Date().toISOString() };
      await writeJob(started);
      return { job: started, claimedPath: claimed };
    } catch (error) {
      if (error instanceof Error && 'code' in error && ['ENOENT', 'EEXIST'].includes(String(error.code))) continue;
      throw error;
    }
  }
  return null;
}

export async function updateRenderJob(id: string, changes: Partial<RenderJob>) {
  const job = await readJobFile(id);
  if (!job) throw new Error(`Render job ${id} was not found`);
  const updated = { ...job, ...changes };
  await writeJob(updated);
  return updated;
}

export async function finishRenderJob(id: string, claimedPath: string, outputKey: string) {
  await updateRenderJob(id, {
    status: 'completed',
    progress: 100,
    outputKey,
    errorMessage: null,
    completedAt: new Date().toISOString(),
  });
  await removeClaim(claimedPath);
}

export async function failRenderJob(id: string, claimedPath: string, error: unknown) {
  const message = error instanceof Error ? error.message : 'Le rendu a échoué.';
  await updateRenderJob(id, {
    status: 'failed',
    errorMessage: message.slice(0, 500),
    completedAt: new Date().toISOString(),
  });
  await removeClaim(claimedPath);
}

async function removeClaim(file: string) {
  const { unlink } = await import('node:fs/promises');
  await unlink(file).catch(() => undefined);
}

export function getRenderOutputPath(id: string) {
  if (!idSchema.safeParse(id).success) throw new Error('Invalid render id');
  return path.join(renderOutputDirectory, `${id}.mp4`);
}

