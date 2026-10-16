import {
  AbsoluteFill,
  Composition,
  Img,
  OffthreadVideo,
  Sequence,
  interpolate,
  registerRoot,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import type { Project } from '../lib/projects';

type RenderScene = Project['scenes'][number] & { mediaUrl?: string };
type RenderProject = Omit<Project, 'scenes'> & { scenes: RenderScene[] };
type VideoProps = { project: RenderProject };

const sampleProject = {
  id: 'sample',
  title: 'Exemple VideoForge',
  topic: 'Donnez vie à vos idées',
  format: '9:16' as const,
  language: 'Français',
  targetDuration: 10,
  updatedAt: new Date(0).toISOString(),
  scenes: [
    { id: 'sample-1', narration: 'Chaque grande idée commence par une première étape.', caption: 'TOUT COMMENCE PAR UNE IDÉE', duration: 5, mediaType: 'color' as const, color: '#6558f5', transition: 'fade' as const },
    { id: 'sample-2', narration: 'Donnez vie à vos histoires, une scène à la fois.', caption: 'DONNEZ VIE À VOS HISTOIRES', duration: 5, mediaType: 'color' as const, color: '#0b6e69', transition: 'fade' as const },
  ],
};

function dimensions(format: Project['format']) {
  if (format === '16:9') return { width: 1920, height: 1080 };
  if (format === '1:1') return { width: 1080, height: 1080 };
  return { width: 1080, height: 1920 };
}

function VideoComposition({ project }: VideoProps) {
  const { fps } = useVideoConfig();
  let from = 0;

  return (
    <AbsoluteFill style={{ backgroundColor: '#090a0f', fontFamily: 'Arial, sans-serif' }}>
      {project.scenes.map((scene, index) => {
        const durationInFrames = Math.max(1, Math.round(scene.duration * fps));
        const start = from;
        from += durationInFrames;
        return (
          <Sequence key={scene.id} from={start} durationInFrames={durationInFrames} name={scene.caption || `Scène ${index + 1}`}>
            <VideoScene scene={scene} topic={project.topic} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
}

function VideoScene({ scene, topic }: { scene: RenderScene; topic: string }) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const transitionFrames = Math.min(18, Math.floor(durationInFrames / 3));
  const opacity = scene.transition === 'fade' && transitionFrames > 0
    ? interpolate(frame, [0, transitionFrames], [0, 1], { extrapolateRight: 'clamp' })
    : 1;
  const translateX = scene.transition === 'slide' && transitionFrames > 0
    ? interpolate(frame, [0, transitionFrames], [70, 0], { extrapolateRight: 'clamp' })
    : 0;

  return (
    <AbsoluteFill style={{ backgroundColor: scene.color, overflow: 'hidden' }}>
      {scene.mediaUrl && scene.mediaType === 'image' && (
        <Img src={scene.mediaUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute' }} />
      )}
      {scene.mediaUrl && scene.mediaType === 'video' && (
        <OffthreadVideo src={scene.mediaUrl} muted style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute' }} />
      )}
      <AbsoluteFill style={{ background: 'linear-gradient(145deg, #08091030 0%, #08091020 42%, #080910bd 100%)' }} />
      <div style={{ position: 'absolute', top: '5.5%', left: '7%', right: '7%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#ffffffb8', fontSize: 22, letterSpacing: 5 }}>
        <b style={{ border: '2px solid #ffffff99', borderRadius: 10, padding: '8px 11px', fontSize: 20 }}>VF</b>
        <span>VIDEOFORGE AI</span>
      </div>
      <div style={{ position: 'absolute', left: '8%', right: '8%', top: '30%', color: 'white', opacity, transform: `translateX(${translateX}px)` }}>
        <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: 5, color: '#ffffffcc', textTransform: 'uppercase' }}>{topic}</div>
        <div style={{ marginTop: 32, maxWidth: '95%', fontSize: '8.5cqw', lineHeight: 1.08, fontWeight: 800, letterSpacing: '-0.035em', textWrap: 'balance' }}>{scene.caption}</div>
        <div style={{ width: 74, height: 7, backgroundColor: '#e4dcff', marginTop: 30, borderRadius: 5 }} />
        <div style={{ marginTop: 25, maxWidth: '88%', fontSize: 30, lineHeight: 1.45, color: '#ffffffdf' }}>{scene.narration}</div>
      </div>
      <div style={{ position: 'absolute', left: '8%', right: '8%', bottom: '11%', textAlign: 'center', padding: '17px 22px', background: '#00000099', borderRadius: 8, color: 'white', fontSize: 31, fontWeight: 700, lineHeight: 1.25 }}>
        {scene.caption}
      </div>
    </AbsoluteFill>
  );
}

function RemotionRoot() {
  return (
    <Composition
      id="VideoForge"
      component={VideoComposition}
      defaultProps={{ project: sampleProject }}
      durationInFrames={300}
      fps={30}
      width={1080}
      height={1920}
      calculateMetadata={({ props }) => {
        const totalSeconds = props.project.scenes.reduce((sum, scene) => sum + scene.duration, 0);
        return {
          ...dimensions(props.project.format),
          durationInFrames: Math.max(1, Math.round(totalSeconds * 30)),
          fps: 30,
        };
      }}
    />
  );
}

registerRoot(RemotionRoot);
