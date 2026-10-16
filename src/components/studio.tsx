'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from './icons';

type Scene = {
  id: string;
  narration: string;
  caption: string;
  duration: number;
  mediaType: 'color' | 'image' | 'video';
  mediaId?: string;
  mediaName?: string;
  transition: 'fade' | 'cut' | 'slide';
  color: string;
};

type Project = {
  id: string;
  title: string;
  topic: string;
  format: string;
  language: string;
  targetDuration: number;
  scenes: Scene[];
  updatedAt: string;
};

type Page = 'studio' | 'projects' | 'batch' | 'library' | 'renders' | 'settings';
type RenderJobView = {
  id: string;
  projectId: string;
  projectTitle: string;
  status: 'queued' | 'rendering' | 'completed' | 'failed';
  progress: number;
  outputKey: string | null;
  errorMessage: string | null;
  attempts: number;
  createdAt: string;
};

const colors = ['#6558f5', '#0b6e69', '#a04f31', '#384e9a', '#905340', '#35594c'];
function formatTime(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(safeSeconds / 60)).padStart(2, '0')}:${String(safeSeconds % 60).padStart(2, '0')}`;
}

const initialScenes: Scene[] = [
  {
    id: 'scene-1',
    narration: 'Chaque grande idée commence par une première étape.',
    caption: 'TOUT COMMENCE PAR UNE IDÉE',
    duration: 5,
    mediaType: 'color',
    transition: 'fade',
    color: colors[0],
  },
  {
    id: 'scene-2',
    narration: 'Donnez vie à vos histoires, une scène à la fois.',
    caption: 'DONNEZ VIE À VOS HISTOIRES',
    duration: 5,
    mediaType: 'color',
    transition: 'fade',
    color: colors[1],
  },
];

const emptyProject: Project = {
  id: 'local-draft',
  title: 'Mon premier projet',
  topic: 'Une idée à partager',
  format: '9:16',
  language: 'Français',
  targetDuration: 30,
  scenes: initialScenes,
  updatedAt: new Date().toISOString(),
};

export default function Studio() {
  const [project, setProject] = useState<Project>(emptyProject);
  const [savedProjects, setSavedProjects] = useState<Project[]>([]);
  const [activeSceneId, setActiveSceneId] = useState(initialScenes[0].id);
  const [page, setPage] = useState<Page>('studio');
  const [batchText, setBatchText] = useState('');
  const [notice, setNotice] = useState('');
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [previewTime, setPreviewTime] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [creatingRender, setCreatingRender] = useState(false);
  const [renderJobs, setRenderJobs] = useState<RenderJobView[]>([]);

  const activeScene = project.scenes.find((scene) => scene.id === activeSceneId) ?? project.scenes[0];
  const totalDuration = project.scenes.reduce((total, scene) => total + scene.duration, 0);

  useEffect(() => {
    fetch('/api/projects')
      .then((response) => (response.ok ? response.json() : []))
      .then((projects: Project[]) => {
        setSavedProjects(projects);
        if (projects[0]) {
          setProject(projects[0]);
          setActiveSceneId(projects[0].scenes[0]?.id ?? '');
        }
      })
      .catch(() => setNotice('Impossible de charger les projets enregistrés.'))
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(''), 3200);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    if (page !== 'renders') return;
    let active = true;
    const refresh = async () => {
      try {
        const response = await fetch('/api/renders', { cache: 'no-store' });
        if (!response.ok) throw new Error('Impossible de charger les rendus.');
        const jobs: RenderJobView[] = await response.json();
        if (active) setRenderJobs(jobs);
      } catch (error) {
        if (active) setNotice(error instanceof Error ? error.message : 'Erreur de chargement des rendus.');
      }
    };
    void refresh();
    const interval = window.setInterval(refresh, 1800);
    return () => { active = false; window.clearInterval(interval); };
  }, [page]);

  function updateProject<K extends keyof Project>(key: K, value: Project[K]) {
    setProject((current) => ({ ...current, [key]: value }));
  }

  function updateScene(id: string, changes: Partial<Scene>) {
    setProject((current) => ({
      ...current,
      scenes: current.scenes.map((scene) =>
        scene.id === id ? { ...scene, ...changes } : scene,
      ),
    }));
  }

  async function uploadMedia(sceneId: string, file?: File) {
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.set('file', file);
      const response = await fetch('/api/media', { method: 'POST', body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Le média n’a pas pu être ajouté.');
      updateScene(sceneId, { mediaId: result.id, mediaType: result.type, mediaName: file.name });
      setNotice('Média ajouté à la scène.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Une erreur est survenue.');
    } finally {
      setUploading(false);
    }
  }

  function addScene() {
    const scene: Scene = {
      id: crypto.randomUUID(),
      narration: 'Votre narration commence ici…',
      caption: 'VOTRE NOUVEAU TITRE',
      duration: 5,
      mediaType: 'color',
      transition: 'fade',
      color: colors[project.scenes.length % colors.length],
    };
    setProject((current) => ({ ...current, scenes: [...current.scenes, scene] }));
    setActiveSceneId(scene.id);
  }

  function duplicateScene(id: string) {
    const index = project.scenes.findIndex((scene) => scene.id === id);
    const source = project.scenes[index];
    if (!source) return;

    const copy = { ...source, id: crypto.randomUUID() };
    const scenes = [...project.scenes];
    scenes.splice(index + 1, 0, copy);
    setProject((current) => ({ ...current, scenes }));
    setActiveSceneId(copy.id);
  }

  function deleteScene(id: string) {
    if (project.scenes.length === 1) {
      setNotice('Un projet doit contenir au moins une scène.');
      return;
    }

    const scenes = project.scenes.filter((scene) => scene.id !== id);
    setProject((current) => ({ ...current, scenes }));
    if (activeSceneId === id) setActiveSceneId(scenes[0].id);
  }

  function moveScene(id: string, offset: number) {
    const index = project.scenes.findIndex((scene) => scene.id === id);
    const nextIndex = index + offset;
    if (nextIndex < 0 || nextIndex >= project.scenes.length) return;

    const scenes = [...project.scenes];
    [scenes[index], scenes[nextIndex]] = [scenes[nextIndex], scenes[index]];
    setProject((current) => ({ ...current, scenes }));
  }

  async function refreshProjects() {
    const response = await fetch('/api/projects');
    if (!response.ok) throw new Error('Impossible de charger les projets.');
    setSavedProjects(await response.json());
  }

  async function saveProject() {
    setSaving(true);
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(project),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Erreur de sauvegarde.');
      setProject(result);
      await refreshProjects();
      setNotice('Projet enregistré.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Impossible de sauvegarder le projet.');
    } finally {
      setSaving(false);
    }
  }

  async function createBatch() {
    const topics = batchText.split(/\r?\n/).map((topic) => topic.trim()).filter(Boolean);
    if (!topics.length) {
      setNotice('Saisissez au moins un sujet.');
      return;
    }

    setBusy(true);
    try {
      for (const topic of topics) {
        const response = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            ...emptyProject,
            id: crypto.randomUUID(),
            title: topic.slice(0, 100),
            topic,
            scenes: initialScenes.map((scene) => ({ ...scene, id: crypto.randomUUID() })),
          }),
        });
        if (!response.ok) throw new Error('Un projet n’a pas pu être créé.');
      }

      await refreshProjects();
      setNotice(`${topics.length} projet${topics.length > 1 ? 's' : ''} créé${topics.length > 1 ? 's' : ''}.`);
      setBatchText('');
      setPage('projects');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Une erreur est survenue.');
    } finally {
      setBusy(false);
    }
  }

  async function deleteSavedProject(saved: Project) {
    const confirmed = window.confirm(`Supprimer « ${saved.title} » ? Cette action est définitive.`);
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/projects?id=${encodeURIComponent(saved.id)}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Le projet n’a pas pu être supprimé.');
      await refreshProjects();
      setNotice('Projet supprimé.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Une erreur est survenue.');
    }
  }

  function newProject() {
    const scenes = initialScenes.map((scene) => ({ ...scene, id: crypto.randomUUID() }));
    setProject({ ...emptyProject, id: crypto.randomUUID(), title: 'Nouveau projet', scenes });
    setActiveSceneId(scenes[0].id);
    setPage('studio');
  }

  function openProject(saved: Project) {
    setProject(saved);
    setActiveSceneId(saved.scenes[0]?.id ?? '');
    setPage('studio');
  }

  async function startRender() {
    setCreatingRender(true);
    try {
      const savedResponse = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(project),
      });
      const savedProject: Project = await savedResponse.json();
      if (!savedResponse.ok) throw new Error('Enregistrez un projet valide avant le rendu.');
      setProject(savedProject);
      await refreshProjects();

      const response = await fetch('/api/renders', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(savedProject),
      });
      const job: RenderJobView & { error?: string } = await response.json();
      if (!response.ok) throw new Error(job.error ?? 'La tâche de rendu n’a pas pu être créée.');
      setRenderJobs((jobs) => [job, ...jobs.filter((item) => item.id !== job.id)]);
      setPage('renders');
      setNotice('Rendu ajouté à la file. Le worker va créer le MP4.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Impossible de lancer le rendu.');
    } finally {
      setCreatingRender(false);
    }
  }

  async function retryRender(id: string) {
    try {
      const response = await fetch('/api/renders', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ retryId: id }),
      });
      const job = await response.json();
      if (!response.ok) throw new Error(job.error ?? 'Le rendu ne peut pas être relancé.');
      setRenderJobs((jobs) => jobs.map((item) => item.id === id ? job : item));
      setNotice('Rendu remis en file d’attente.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Impossible de relancer le rendu.');
    }
  }

  const pageTitle: Record<Page, string> = {
    studio: 'Éditeur',
    projects: 'Mes projets',
    batch: 'Production en série',
    library: 'Bibliothèque',
    renders: 'Rendus',
    settings: 'Paramètres',
  };

  if (!ready) {
    return (
      <main className="loading-screen">
        <Icon name="LoaderCircle" className="spin" size={24} />
        Chargement du studio…
      </main>
    );
  }

  return (
    <main className="app-shell">
      <Sidebar page={page} projectCount={savedProjects.length} onNavigate={setPage} onNewProject={newProject} />

      <section className="main-area">
        <header className="topbar">
          <div className="crumb">Studio <span>/</span> {pageTitle[page]}</div>
          <div className="top-actions">
            <span className="local-pill"><i />Stockage local</span>
            <button className="help-button" aria-label="Aide"><Icon name="CircleHelp" size={18} /></button>
            <div className="avatar small">V</div>
          </div>
        </header>

        {page === 'studio' && (
          <StudioEditor
            project={project}
            activeScene={activeScene}
            activeSceneId={activeSceneId}
            totalDuration={totalDuration}
            playing={playing}
            previewTime={previewTime}
            saving={saving}
            uploading={uploading}
            onTitleChange={(title) => updateProject('title', title)}
            onTopicChange={(topic) => updateProject('topic', topic)}
            onTargetDurationChange={(duration) => updateProject('targetDuration', duration)}
            onFormatChange={(format) => updateProject('format', format)}
            onActiveScene={setActiveSceneId}
            onSceneChange={updateScene}
            onAddScene={addScene}
            onDuplicateScene={duplicateScene}
            onDeleteScene={deleteScene}
            onMoveScene={moveScene}
            onSave={saveProject}
            onExport={startRender}
            creatingRender={creatingRender}
            completedRenderId={renderJobs.find((job) => job.projectId === project.id && job.status === 'completed')?.id}
            onPlayingChange={setPlaying}
            onPreviewTimeChange={setPreviewTime}
            onUpload={uploadMedia}
            onProjects={() => setPage('projects')}
          />
        )}

        {page === 'projects' && (
          <ProjectsPage
            projects={savedProjects}
            onOpen={openProject}
            onDelete={deleteSavedProject}
            onNewProject={newProject}
          />
        )}
        {page === 'batch' && (
          <BatchPage value={batchText} busy={busy} onChange={setBatchText} onCreate={createBatch} />
        )}
        {page === 'library' && <LibraryPage onBack={() => setPage('studio')} />}
        {page === 'renders' && <RendersPage jobs={renderJobs} onRetry={retryRender} onBack={() => setPage('studio')} />}
        {page === 'settings' && <SettingsPage />}

        <footer className="footer">
          <span>VIDEOFORGE AI <i>·</i> MODE LOCAL</span>
          <span>Une idée à la fois.</span>
        </footer>
      </section>

      {notice && (
        <div className="toast" role="status">
          <Icon name="Check" size={15} />
          {notice}
          <button onClick={() => setNotice('')} aria-label="Fermer">
            <Icon name="X" size={14} />
          </button>
        </div>
      )}
    </main>
  );
}

function Sidebar({
  page,
  projectCount,
  onNavigate,
  onNewProject,
}: {
  page: Page;
  projectCount: number;
  onNavigate: (page: Page) => void;
  onNewProject: () => void;
}) {
  const links: { id: Page; title: string; icon: Parameters<typeof Icon>[0]['name'] }[] = [
    { id: 'studio', title: 'Tableau de bord', icon: 'Grid2X2' },
    { id: 'projects', title: 'Mes projets', icon: 'FolderOpen' },
    { id: 'batch', title: 'Production en série', icon: 'Layers2' },
    { id: 'library', title: 'Bibliothèque de médias', icon: 'Image' },
    { id: 'renders', title: 'Rendus', icon: 'Activity' },
  ];

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark"><Icon name="Clapperboard" size={20} /></div>
        <div><b>videoforge</b><span>AI STUDIO</span></div>
      </div>
      <button className="workspace"><span className="workspace-dot" />Espace personnel<Icon name="ChevronDown" size={14} /></button>
      <div className="nav-label">ESPACE DE TRAVAIL</div>
      <nav className="nav-list" aria-label="Navigation principale">
        {links.slice(0, 1).map((link) => (
          <NavButton key={link.id} {...link} active={page === link.id} onClick={() => onNavigate(link.id)} />
        ))}
        <button className="nav-item nav-create" onClick={onNewProject}>
          <Icon name="Plus" />Nouveau projet
        </button>
        {links.slice(1).map((link) => (
          <NavButton
            key={link.id}
            {...link}
            active={page === link.id}
            count={link.id === 'projects' ? projectCount : undefined}
            onClick={() => onNavigate(link.id)}
          />
        ))}
      </nav>
      <div className="sidebar-bottom">
        <NavButton
          id="settings"
          title="Paramètres"
          icon="Settings2"
          active={page === 'settings'}
          onClick={() => onNavigate('settings')}
        />
        <div className="profile">
          <div className="avatar">V</div>
          <div><b>Votre espace</b><span>Plan local</span></div>
          <Icon name="MoreHorizontal" size={18} />
        </div>
      </div>
    </aside>
  );
}

function NavButton({
  id,
  title,
  icon,
  active,
  count,
  onClick,
}: {
  id: Page;
  title: string;
  icon: Parameters<typeof Icon>[0]['name'];
  active: boolean;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button data-page={id} className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}>
      <Icon name={icon} />{title}{count ? <small>{count}</small> : null}
    </button>
  );
}

function StudioEditor({
  project,
  activeScene,
  activeSceneId,
  totalDuration,
  playing,
  previewTime,
  saving,
  uploading,
  onTitleChange,
  onTopicChange,
  onTargetDurationChange,
  onFormatChange,
  onActiveScene,
  onSceneChange,
  onAddScene,
  onDuplicateScene,
  onDeleteScene,
  onMoveScene,
  onSave,
  onExport,
  creatingRender,
  completedRenderId,
  onPlayingChange,
  onPreviewTimeChange,
  onUpload,
  onProjects,
}: {
  project: Project;
  activeScene?: Scene;
  activeSceneId: string;
  totalDuration: number;
  playing: boolean;
  previewTime: number;
  saving: boolean;
  uploading: boolean;
  onTitleChange: (title: string) => void;
  onTopicChange: (topic: string) => void;
  onTargetDurationChange: (duration: number) => void;
  onFormatChange: (format: string) => void;
  onActiveScene: (id: string) => void;
  onSceneChange: (id: string, changes: Partial<Scene>) => void;
  onAddScene: () => void;
  onDuplicateScene: (id: string) => void;
  onDeleteScene: (id: string) => void;
  onMoveScene: (id: string, offset: number) => void;
  onSave: () => void;
  onExport: () => void;
  creatingRender: boolean;
  completedRenderId?: string;
  onPlayingChange: (playing: boolean) => void;
  onPreviewTimeChange: (time: number) => void;
  onUpload: (sceneId: string, file?: File) => Promise<void>;
  onProjects: () => void;
}) {
  const activeIndex = project.scenes.findIndex((scene) => scene.id === activeSceneId);
  const progress = ((activeIndex + 1) / Math.max(project.scenes.length, 1)) * 100;

  return (
    <>
      <div className="editor-heading">
        <div>
          <div className="eyebrow">ESPACE DE CRÉATION <span className="live-dot" /> LOCAL</div>
          <h1>Studio de création</h1>
          <p>Donnez vie à votre prochaine idée.</p>
        </div>
        <div className="heading-actions">
          <button className="button ghost" onClick={onProjects}><Icon name="FolderOpen" size={16} />Mes projets</button>
          <button className="button primary" onClick={onSave} disabled={saving}>
            <Icon name="Check" size={16} />{saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>

      <div className="project-bar">
        <div className="project-identity">
          <div className="project-icon"><Icon name="Film" size={19} /></div>
          <div>
            <input className="title-input" aria-label="Titre du projet" value={project.title} onChange={(event) => onTitleChange(event.target.value)} />
            <input className="topic-input" aria-label="Sujet du projet" value={project.topic} onChange={(event) => onTopicChange(event.target.value)} />
          </div>
        </div>
        <div className="project-controls">
          <label className="compact-select">
            {project.format}<Icon name="ChevronDown" size={13} />
            <select aria-label="Format vidéo" value={project.format} onChange={(event) => onFormatChange(event.target.value)}>
              <option>9:16</option><option>16:9</option><option>1:1</option>
            </select>
          </label>
          <label className="target-duration" title="Durée cible en secondes">
            <input aria-label="Durée cible en secondes" type="number" min={5} max={300} value={project.targetDuration} onChange={(event) => onTargetDurationChange(Math.min(300, Math.max(5, Number(event.target.value))))} />s cible
          </label>
          <div className="divider" />
          <span className="duration-label"><Icon name="Clock3" size={14} />{totalDuration}s</span>
          <button className="icon-button" aria-label="Options"><Icon name="MoreHorizontal" size={18} /></button>
        </div>
      </div>

      <div className="editor-grid">
        <SceneList
          scenes={project.scenes}
          activeSceneId={activeSceneId}
          onSelect={onActiveScene}
          onAdd={onAddScene}
          onDuplicate={onDuplicateScene}
          onDelete={onDeleteScene}
          onMove={onMoveScene}
        />
        <Preview
          project={project}
          activeScene={activeScene}
          activeSceneId={activeSceneId}
          totalDuration={totalDuration}
          progress={progress}
          playing={playing}
          previewTime={previewTime}
          onPlayingChange={onPlayingChange}
          onPreviewTimeChange={onPreviewTimeChange}
          onSelectScene={onActiveScene}
        />
        {activeScene && (
          <SceneProperties
            scene={activeScene}
            sceneNumber={activeIndex + 1}
            uploading={uploading}
            onChange={(changes) => onSceneChange(activeScene.id, changes)}
            onUpload={(file) => onUpload(activeScene.id, file)}
          />
        )}
      </div>

      <div className="bottom-bar">
        <div className="bottom-left">
          <FeatureLabel icon="AudioLines" title="Narration" />
          <FeatureLabel icon="Subtitles" title="Sous-titres" />
          <span className="bottom-option"><Icon name="Music2" size={16} />Musique <Icon name="Plus" size={13} /></span>
        </div>
        <div className="bottom-right">
          {completedRenderId && <a className="button ghost export-button" href={`/api/renders/file?id=${completedRenderId}`}><Icon name="Download" size={16} />Télécharger MP4</a>}
          <button className="button primary render-button" onClick={onExport} disabled={creatingRender}><Icon name={creatingRender ? 'LoaderCircle' : 'WandSparkles'} className={creatingRender ? 'spin' : ''} size={16} />{creatingRender ? 'Mise en file…' : 'Générer la vidéo'}</button>
        </div>
      </div>
    </>
  );
}

function SceneList({
  scenes,
  activeSceneId,
  onSelect,
  onAdd,
  onDuplicate,
  onDelete,
  onMove,
}: {
  scenes: Scene[];
  activeSceneId: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, offset: number) => void;
}) {
  return (
    <div className="left-column">
      <div className="section-row">
        <div><h2>Scènes</h2><p>Organisez le fil de votre vidéo</p></div>
        <span className="count-pill">{scenes.length} scènes</span>
      </div>
      <div className="scene-list">
        {scenes.map((scene, index) => (
          <button
            key={scene.id}
            className={`scene-card ${scene.id === activeSceneId ? 'selected' : ''}`}
            onClick={() => onSelect(scene.id)}
          >
            <div className="scene-thumb" style={{ background: scene.color }}>
              <span>{String(index + 1).padStart(2, '0')}</span><small>{scene.duration}s</small><div className="thumb-lines" />
            </div>
            <div className="scene-info">
              <b>{scene.caption || `Scène ${index + 1}`}</b>
              <span>{scene.mediaType === 'color' ? 'Fond coloré' : scene.mediaType === 'image' ? 'Image importée' : 'Vidéo importée'}</span>
              <div className="scene-mini-actions">
                <span onClick={(event) => { event.stopPropagation(); onMove(scene.id, -1); }}><Icon name="ArrowLeft" size={12} /></span>
                <span onClick={(event) => { event.stopPropagation(); onMove(scene.id, 1); }}><Icon name="ArrowRight" size={12} /></span>
                <span onClick={(event) => { event.stopPropagation(); onDuplicate(scene.id); }}><Icon name="FilePlus2" size={12} /></span>
                <span onClick={(event) => { event.stopPropagation(); onDelete(scene.id); }}><Icon name="Trash2" size={12} /></span>
              </div>
            </div>
            <span className="drag-dots">⠋</span>
          </button>
        ))}
      </div>
      <button className="add-scene" onClick={onAdd}><Icon name="Plus" size={16} />Ajouter une scène</button>
      <div className="quick-tip">
        <Icon name="Sparkles" size={16} />
        <div><b>Une bonne histoire se construit scène par scène.</b><span>Commencez par une idée, puis créez votre narration.</span></div>
      </div>
    </div>
  );
}

function Preview({ project, activeScene, activeSceneId, totalDuration, progress, playing, previewTime, onPlayingChange, onPreviewTimeChange, onSelectScene }: {
  project: Project;
  activeScene?: Scene;
  activeSceneId: string;
  totalDuration: number;
  progress: number;
  playing: boolean;
  previewTime: number;
  onPlayingChange: (playing: boolean) => void;
  onPreviewTimeChange: (time: number) => void;
  onSelectScene: (id: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const totalFrames = Math.max(1, project.scenes.reduce((total, scene) => total + scene.duration, 0) * 30);
  const currentFrame = Math.min(Math.floor(previewTime * 30), totalFrames - 1);
  let sceneStartFrame = 0;
  let currentSceneIndex = 0;
  for (let index = 0; index < project.scenes.length; index += 1) {
    const sceneFrames = project.scenes[index].duration * 30;
    if (currentFrame < sceneStartFrame + sceneFrames) {
      currentSceneIndex = index;
      break;
    }
    sceneStartFrame += sceneFrames;
    currentSceneIndex = Math.min(index + 1, project.scenes.length - 1);
  }
  const currentScene = project.scenes[currentSceneIndex] ?? activeScene;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (playing) {
      void video.play().catch(() => onPlayingChange(false));
    } else {
      video.pause();
    }
  }, [playing, currentScene?.id, onPlayingChange]);

  useEffect(() => {
    if (!playing) return;
    const startedAt = performance.now();
    const startTime = previewTime;
    let frame = 0;
    const tick = () => {
      const elapsed = (performance.now() - startedAt) / 1000;
      const time = startTime + elapsed;
      if (time >= totalDuration) {
        onPreviewTimeChange(totalDuration);
        onPlayingChange(false);
        return;
      }
      onPreviewTimeChange(time);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, previewTime, totalDuration, onPreviewTimeChange, onPlayingChange]);

  return (
    <div className="center-column">
      <div className="section-row preview-title"><div><h2>Aperçu</h2><p>Prévisualisez votre création</p></div></div>
      <div className="preview-stage">
        <div className={`video-preview format-${project.format.replace(':', '-')}`} style={{ background: currentScene?.color ?? colors[0] }}>
          {currentScene?.mediaId && currentScene.mediaType === 'image' && (
            <div
              className="media-background"
              role="img"
              aria-label={currentScene.mediaName ?? 'Image de la scène'}
              style={{ backgroundImage: `url(/api/media?id=${currentScene.mediaId})` }}
            />
          )}
          {currentScene?.mediaId && currentScene.mediaType === 'video' && (
            <video ref={videoRef} className="media-background" src={`/api/media?id=${currentScene.mediaId}`} muted loop playsInline />
          )}
          <div className="video-grain" />
          <div className="preview-topline"><span>VF</span><span>APERÇU</span></div>
          <div className="preview-content">
            <div className="preview-kicker">{project.topic || 'VOTRE SUJET'}</div>
            <div className="preview-caption">{currentScene?.caption || 'VOTRE HISTOIRE COMMENCE ICI'}</div>
            <div className="caption-underline" />
            <div className="preview-narration">{currentScene?.narration}</div>
          </div>
          <div className="preview-subtitle">{currentScene?.caption}</div>
          <div className="preview-watermark">VIDEOFORGE AI</div>
        </div>
      </div>
      <div className="player-controls">
        <button className="play-button" onClick={() => {
          if (previewTime >= totalDuration) onPreviewTimeChange(0);
          onPlayingChange(!playing);
        }} aria-label={playing ? 'Pause' : 'Lire'}>
          <Icon name={playing ? 'Pause' : 'Play'} size={15} fill="currentColor" />
        </button>
        <span className="timecode">{formatTime(previewTime)} <i>/</i> {formatTime(totalDuration)}</span>
        <button className="scrubber" aria-label="Déplacer la lecture" onClick={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          onPreviewTimeChange(Math.max(0, Math.min(totalDuration, ((event.clientX - bounds.left) / bounds.width) * totalDuration)));
        }}>
          <span className="scrubber-fill" style={{ width: `${totalDuration ? (previewTime / totalDuration) * 100 : 0}%` }} />
        </button>
        <Icon name="AudioLines" size={16} />
        <span className="resolution">1080P</span>
      </div>
      <div className="timeline">
        <div className="timeline-head"><span>TIMELINE</span><span>{project.scenes.length} CLIPS <i>·</i> {totalDuration}S</span></div>
        <div className="timeline-track">
          {project.scenes.map((scene, index) => (
            <button
              key={scene.id}
              className={`timeline-clip ${scene.id === currentScene?.id ? 'on' : ''}`}
              style={{ background: scene.color, flex: Math.max(scene.duration, 1) }}
              onClick={() => {
                const start = project.scenes.slice(0, index).reduce((sum, item) => sum + item.duration, 0);
                onPreviewTimeChange(start);
                onSelectScene(scene.id);
              }}
            >
              <span>{String(index + 1).padStart(2, '0')}</span><small>{scene.caption}</small>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function SceneProperties({ scene, sceneNumber, uploading, onChange, onUpload }: {
  scene: Scene;
  sceneNumber: number;
  uploading: boolean;
  onChange: (changes: Partial<Scene>) => void;
  onUpload: (file?: File) => Promise<void>;
}) {
  return (
    <div className="right-column">
      <div className="section-row"><div><h2>Propriétés</h2><p>Personnalisez votre scène</p></div><span className="scene-number">{String(sceneNumber).padStart(2, '0')}</span></div>
      <div className="properties-form">
        <label className="field-label">NARRATION <span>Voix off</span></label>
        <textarea className="narration-input" value={scene.narration} onChange={(event) => onChange({ narration: event.target.value })} placeholder="Saisissez votre narration…" />
        <div className="field-footer"><span><Icon name="AudioLines" size={13} />Narration activée</span><span>{scene.narration.length} caractères</span></div>
        <label className="field-label spaced">TEXTE À L’ÉCRAN</label>
        <input className="text-input" value={scene.caption} onChange={(event) => onChange({ caption: event.target.value })} />
        <div className="field-split">
          <label><span className="field-label">DURÉE</span><div className="number-wrap"><input type="number" min={1} max={60} value={scene.duration} onChange={(event) => onChange({ duration: Math.max(1, Number(event.target.value)) })} /><span>sec</span></div></label>
          <label><span className="field-label">TRANSITION</span><select className="select-input" value={scene.transition} onChange={(event) => onChange({ transition: event.target.value as Scene['transition'] })}><option value="fade">Fondu</option><option value="cut">Aucune</option><option value="slide">Glissement</option></select></label>
        </div>
        <label className="field-label spaced">MÉDIA DE FOND</label>
        <button className="media-picker" disabled={uploading} onClick={() => document.getElementById('media-file')?.click()}>
          <div><Icon name="Image" size={17} /></div>
          <span><b>{uploading ? 'Téléversement…' : scene.mediaName || 'Ajouter un média'}</b><small>JPG, PNG, WebP, MP4 ou WebM · max. 25 Mo</small></span>
          <Icon name={uploading ? 'LoaderCircle' : 'Plus'} className={uploading ? 'spin' : ''} size={16} />
        </button>
        <input id="media-file" type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" hidden onChange={(event) => { void onUpload(event.target.files?.[0]); event.target.value = ''; }} />
        <label className="field-label spaced">COULEUR DE FOND</label>
        <div className="color-row">
          {colors.map((color) => (
            <button key={color} className={`color-swatch ${scene.color === color ? 'chosen' : ''}`} style={{ background: color }} aria-label={`Couleur ${color}`} onClick={() => onChange({ color })} />
          ))}
        </div>
      </div>
    </div>
  );
}

function FeatureLabel({ icon, title }: { icon: 'AudioLines' | 'Subtitles'; title: string }) {
  return (
    <span className="bottom-option">
      <Icon name={icon} size={16} />{title}<span className="toggle on" />
    </span>
  );
}

function ProjectsPage({ projects, onOpen, onDelete, onNewProject }: {
  projects: Project[];
  onOpen: (project: Project) => void;
  onDelete: (project: Project) => void;
  onNewProject: () => void;
}) {
  return (
    <div className="page-content">
      <div className="editor-heading">
        <div><div className="eyebrow">VOTRE ESPACE</div><h1>Mes projets</h1><p>Retrouvez et reprenez vos créations.</p></div>
        <button className="button primary" onClick={onNewProject}><Icon name="Plus" size={16} />Nouveau projet</button>
      </div>
      {projects.length ? (
        <div className="project-grid">
          {projects.map((project) => (
            <article className="saved-project" key={project.id}>
              <button className="saved-project-open" onClick={() => onOpen(project)}>
                <div className="saved-art" style={{ backgroundColor: project.scenes[0]?.color ?? colors[0] }}>
                  {project.scenes[0]?.mediaId && project.scenes[0].mediaType === 'image' && (
                    <div
                      className="project-thumbnail-image"
                      role="img"
                      aria-label={project.scenes[0].mediaName ?? 'Vignette du projet'}
                      style={{ backgroundImage: `url(/api/media?id=${project.scenes[0].mediaId})` }}
                    />
                  )}
                  {project.scenes[0]?.mediaId && project.scenes[0].mediaType === 'video' && (
                    <video className="project-thumbnail-image" src={`/api/media?id=${project.scenes[0].mediaId}`} muted loop autoPlay playsInline />
                  )}
                  {!project.scenes[0]?.mediaId && <Icon name="Film" size={23} />}
                  <span>{project.format}</span>
                </div>
                <div className="saved-project-info"><b>{project.title}</b><span>{project.scenes.length} scènes · {project.topic}</span><small>{new Date(project.updatedAt).toLocaleDateString('fr-FR')}</small></div>
              </button>
              <button
                className="delete-project"
                aria-label={`Supprimer ${project.title}`}
                title="Supprimer le projet"
                onClick={() => onDelete(project)}
              >
                <Icon name="Trash2" size={15} />
              </button>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState icon="FolderOpen" title="Aucun projet pour l’instant" description="Créez un projet et enregistrez-le pour le retrouver ici." action="Créer un projet" onAction={onNewProject} />
      )}
    </div>
  );
}

function BatchPage({ value, busy, onChange, onCreate }: { value: string; busy: boolean; onChange: (value: string) => void; onCreate: () => void }) {
  const count = value.split(/\r?\n/).filter((line) => line.trim()).length;
  return (
    <div className="page-content">
      <div className="editor-heading"><div><div className="eyebrow">GAGNEZ DU TEMPS</div><h1>Production en série</h1><p>Préparez vos sujets sans lancer d’IA payante.</p></div></div>
      <div className="batch-card">
        <label className="field-label">VOS SUJETS <span>UN SUJET PAR LIGNE</span></label>
        <textarea className="batch-input" value={value} onChange={(event) => onChange(event.target.value)} placeholder={'Les secrets du sommeil réparateur\nComment fonctionne l’énergie solaire\n5 habitudes pour mieux se concentrer'} />
        <div className="batch-foot"><span>{count} sujet(s) · Chaque projet sera modifiable avant rendu</span><button className="button primary" onClick={onCreate} disabled={busy}><Icon name={busy ? 'LoaderCircle' : 'Plus'} className={busy ? 'spin' : ''} size={15} />Créer les projets</button></div>
      </div>
    </div>
  );
}

function EmptyState({ icon, title, description, action, onAction }: { icon: 'FolderOpen' | 'Image' | 'Activity' | 'WandSparkles'; title: string; description: string; action: string; onAction: () => void }) {
  return (
    <div className="empty-state">
      <Icon name={icon} size={32} /><b>{title}</b><span>{description}</span>
      <button className="button ghost" onClick={onAction}><Icon name="ArrowLeft" size={15} />{action}</button>
    </div>
  );
}

function LibraryPage({ onBack }: { onBack: () => void }) {
  return (
    <div className="page-content">
      <div className="editor-heading"><div><div className="eyebrow">VOS FICHIERS</div><h1>Bibliothèque de médias</h1><p>Ajoutez des images et des vidéos à vos scènes.</p></div></div>
      <EmptyState icon="Image" title="Votre bibliothèque est vide" description="Les médias ajoutés depuis l’éditeur apparaîtront ici." action="Retour à l’éditeur" onAction={onBack} />
    </div>
  );
}

function RendersPage({ jobs, onRetry, onBack }: {
  jobs: RenderJobView[];
  onRetry: (id: string) => void;
  onBack: () => void;
}) {
  return (
    <div className="page-content">
      <div className="editor-heading"><div><div className="eyebrow">FILE D’ATTENTE</div><h1>Rendus</h1><p>Suivez les exports vidéo de vos projets.</p></div></div>
      {jobs.length === 0 ? (
        <EmptyState icon="Activity" title="Aucun rendu lancé" description="Lancez la génération depuis l’éditeur pour créer un fichier MP4." action="Ouvrir le studio" onAction={onBack} />
      ) : (
        <div className="render-job-list">
          {jobs.map((job) => (
            <article className="render-job" key={job.id}>
              <div className="render-job-icon"><Icon name={job.status === 'completed' ? 'Film' : job.status === 'failed' ? 'CircleHelp' : 'LoaderCircle'} className={job.status === 'rendering' ? 'spin' : ''} size={19} /></div>
              <div className="render-job-details">
                <b>{job.projectTitle}</b>
                <span>{job.status === 'queued' ? 'En attente du worker' : job.status === 'rendering' ? `Rendu en cours · ${job.progress}%` : job.status === 'completed' ? 'MP4 prêt à télécharger' : 'Échec du rendu'}</span>
                {(job.status === 'queued' || job.status === 'rendering') && <div className="render-progress"><i style={{ width: `${job.progress}%` }} /></div>}
                {job.status === 'failed' && <small>{job.errorMessage || 'Le rendu a échoué.'}</small>}
              </div>
              <div className="render-job-actions">
                {job.status === 'completed' && <a className="button primary" href={`/api/renders/file?id=${job.id}`}><Icon name="Download" size={15} />Télécharger MP4</a>}
                {job.status === 'failed' && <button className="button ghost" onClick={() => onRetry(job.id)}><Icon name="WandSparkles" size={15} />Relancer</button>}
                <time>{new Date(job.createdAt).toLocaleString('fr-FR')}</time>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function SettingsPage() {
  return (
    <div className="page-content">
      <div className="editor-heading"><div><div className="eyebrow">PRÉFÉRENCES</div><h1>Paramètres</h1><p>Configuration locale de VideoForge AI.</p></div></div>
      <Setting title="Stockage des projets" description="Fichier JSON local dans le dossier data/" status="Local" />
      <Setting title="Moteur d’export vidéo" description="Remotion n’est pas encore installé." status="Non configuré" />
      <Setting title="Fournisseur IA" description="Aucun fournisseur configuré. Aucun appel payant n’est lancé." status="Mock" />
    </div>
  );
}

function Setting({ title, description, status }: { title: string; description: string; status: string }) {
  return <div className="settings-card"><div><b>{title}</b><span>{description}</span></div><span className="status-off">{status}</span></div>;
}
