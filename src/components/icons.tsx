import type { ReactNode, SVGProps } from 'react';

type IconName = 'Activity' | 'ArrowLeft' | 'ArrowRight' | 'AudioLines' | 'Check' | 'ChevronDown' | 'CircleHelp' | 'Clapperboard' | 'Clock3' | 'Download' | 'FilePlus2' | 'Film' | 'FolderOpen' | 'Grid2X2' | 'Image' | 'Layers2' | 'LoaderCircle' | 'MoreHorizontal' | 'Music2' | 'Pause' | 'Play' | 'Plus' | 'Settings2' | 'Sparkles' | 'Subtitles' | 'Trash2' | 'WandSparkles' | 'X';
type Props = Omit<SVGProps<SVGSVGElement>, 'name'> & { name: IconName; size?: number };

export function Icon({ name, size = 16, ...props }: Props) {
    const paths: Record<IconName, ReactNode> = {
        Activity: <><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></>,
        ArrowLeft: <><path d="m12 19-7-7 7-7" /><path d="M19 12H5" /></>,
        ArrowRight: <><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></>,
        AudioLines: <><path d="M2 10v3" /><path d="M6 6v11" /><path d="M10 3v18" /><path d="M14 8v8" /><path d="M18 5v13" /><path d="M22 10v3" /></>,
        Check: <><path d="m20 6-11 11-5-5" /></>, ChevronDown: <><path d="m6 9 6 6 6-6" /></>,
        CircleHelp: <><circle cx="12" cy="12" r="10" /><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3" /><path d="M12 17h.01" /></>,
        Clapperboard: <><path d="M4 11h16v10H4z" /><path d="m4 11 2-8 16 4-2 8" /><path d="m8 3 4 8" /><path d="m16 5 4 8" /></>,
        Clock3: <><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></>, Download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5 5 5-5" /><path d="M12 15V3" /></>,
        FilePlus2: <><path d="M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4" /><path d="M14 2v6h6" /><path d="M3 15h6" /><path d="M6 12v6" /></>,
        Film: <><rect x="2" y="3" width="20" height="18" rx="2" /><path d="M7 3v18M3 8h4m-4 5h4m-4 5h4M17 3v18m0-13h4m-4 5h4m-4 5h4" /></>,
        FolderOpen: <><path d="m20 20-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2v10" /><path d="M2 11h20l-2 9" /></>,
        Grid2X2: <><rect width="7" height="7" x="3" y="3" rx="1" /><rect width="7" height="7" x="14" y="3" rx="1" /><rect width="7" height="7" x="14" y="14" rx="1" /><rect width="7" height="7" x="3" y="14" rx="1" /></>,
        Image: <><rect width="18" height="18" x="3" y="3" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-5-5L5 21" /></>, Layers2: <><path d="m12 2 8 4-8 4-8-4 8-4Z" /><path d="m4 12 8 4 8-4" /><path d="m4 16 8 4 8-4" /></>,
        LoaderCircle: <><path d="M12 2a10 10 0 1 0 10 10" /></>, MoreHorizontal: <><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></>,
        Music2: <><circle cx="8" cy="18" r="4" /><path d="M12 18V2l8-1v16" /><circle cx="16" cy="17" r="4" /></>, Pause: <><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></>,
        Play: <><path d="m7 3 14 9-14 9z" /></>, Plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
        Settings2: <><path d="M20 7h-9" /><path d="M14 17H5" /><circle cx="17" cy="17" r="3" /><circle cx="7" cy="7" r="3" /></>,
        Sparkles: <><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-2-5.8L4 11l6-2.2L12 3Z" /><path d="M19 14v5m-2.5-2.5h5M5 3v4M3 5h4" /></>,
        Subtitles: <><path d="M7 15h4M15 15h2" /><path d="M7 11h2m4 0h4" /><rect width="20" height="14" x="2" y="5" rx="2" /></>,
        Trash2: <><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="m19 6-1 14H6L5 6" /><path d="M10 11v5m4-5v5" /></>,
        WandSparkles: <><path d="m15 4 5 5" /><path d="m13 6 6 6" /><path d="M3 21 16 8" /><path d="m14 3 1-2m5 5 2-1M3 7l2 1M7 3l1 2m7 13 1 2 2-1-1-2-2 1Z" /></>,
        X: <><path d="m18 6-12 12" /><path d="m6 6 12 12" /></>,
    };
    return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg>;
}
