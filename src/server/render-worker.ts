import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  claimNextRenderJob,
  failRenderJob,
  finishRenderJob,
  getRenderOutputPath,
  updateRenderJob,
} from '../lib/renders';
import type { Project } from '../lib/projects';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const entryPoint = path.resolve(currentDirectory, '../remotion/Root.tsx');
const appUrl = (process.env.APP_URL ?? 'http://127.0.0.1:3000').replace(/\/$/, '');
const concurrency = Math.max(1, Math.min(4, Number.parseInt(process.env.RENDER_CONCURRENCY ?? '1', 10) || 1));
const frameConcurrency = process.env.RENDER_FRAME_CONCURRENCY ?? '50%';
let stopping = false;

process.on('SIGINT', () => { stopping = true; });
process.on('SIGTERM', () => { stopping = true; });

function withMediaUrls(project: Project) {
  return {
    ...project,
    scenes: project.scenes.map((scene) => ({
      ...scene,
      ...(scene.mediaId ? { mediaUrl: `${appUrl}/api/media?id=${encodeURIComponent(scene.mediaId)}` } : {}),
    })),
  };
}

async function renderClaimedJob(claim: NonNullable<Awaited<ReturnType<typeof claimNextRenderJob>>>, serveUrl: string) {
  const { job, claimedPath } = claim;
  const outputKey = `${job.id}.mp4`;
  const project = withMediaUrls(job.project);
  const inputProps = { project };

  try {
    console.info(`[worker] Rendu démarré : ${job.projectTitle} (${job.id})`);
    const composition = await selectComposition({
      serveUrl,
      id: 'VideoForge',
      inputProps,
      logLevel: 'error',
    });
    let lastProgress = 0;
    let progressWrite = Promise.resolve();

    await renderMedia({
      composition,
      serveUrl,
      codec: 'h264',
      outputLocation: getRenderOutputPath(job.id),
      inputProps,
      overwrite: true,
      concurrency: frameConcurrency,
      logLevel: 'error',
      onProgress: ({ progress }) => {
        const value = Math.min(99, Math.floor(progress * 100));
        if (value >= lastProgress + 2) {
          lastProgress = value;
          progressWrite = progressWrite.then(async () => {
            await updateRenderJob(job.id, { progress: value });
          }).catch((error) => {
            console.error(`[worker] Progression non enregistrée (${job.id})`, error);
          });
        }
      },
    });

    await progressWrite;
    await finishRenderJob(job.id, claimedPath, outputKey);
    console.info(`[worker] Rendu terminé : ${outputKey}`);
  } catch (error) {
    console.error(`[worker] Échec du rendu (${job.id})`, error);
    await failRenderJob(job.id, claimedPath, error);
  }
}

async function workerLoop(workerNumber: number, serveUrl: string) {
  while (!stopping) {
    const claim = await claimNextRenderJob();
    if (!claim) {
      await new Promise((resolve) => setTimeout(resolve, 900));
      continue;
    }
    console.info(`[worker ${workerNumber}] Tâche ${claim.job.id}`);
    await renderClaimedJob(claim, serveUrl);
  }
}

async function main() {
  console.info(`[worker] Construction de la composition Remotion (${entryPoint})`);
  const serveUrl = await bundle({ entryPoint });
  console.info(`[worker] Prêt; concurrence ${concurrency}. En attente de tâches.`);
  await Promise.all(Array.from({ length: concurrency }, (_, index) => workerLoop(index + 1, serveUrl)));
}

main().catch((error: unknown) => {
  console.error('[worker] Arrêt inattendu', error);
  process.exitCode = 1;
});

