const mockContent = {
    intro: {
        headline: 'myMIFFputer prototype shell',
        subline: 'A lighter surface tuned for MIFF moments',
    },
    wallpaper: {
        image: 'linear-gradient(135deg, #020617, #0f172a 55%, #312e81)',
        tint: 'rgba(2, 6, 23, 0.55)',
    },
    theme: {
        accent: '#c084fc',
        panel: 'rgba(8, 12, 32, 0.78)',
        text: '#f8fafc',
        mutedText: 'rgba(248, 250, 252, 0.72)',
        taskbar: 'rgba(5, 7, 18, 0.9)',
        wallpaperTint: 'rgba(5, 8, 20, 0.45)',
    },
    modules: [
        {
            id: 'miff-studio',
            title: 'MIFF Studio',
            icon: '🎨',
            summary: 'Co-create stylized storyboards with MIFF-grade controls.',
            content: 'MIFF Studio keeps your casting boards, shot plans, and AI treatments on one collaborative surface. Bring prompts, palette references, and location notes together.',
            tags: ['story', 'concept'],
            window: {
                width: 520,
                height: 420,
            },
        },
        {
            id: 'beat-scout',
            title: 'Beat Scout',
            icon: '🎧',
            summary: 'Preview sonic interiors tuned to your film beats.',
            content: 'Audition MIFF-curated stems, dial intent sliders, and export ready-to-share cues directly into your edit. Pair with timeline markers to stay in sync.',
            tags: ['audio', 'mood'],
            window: {
                width: 480,
                height: 360,
            },
        },
        {
            id: 'field-notes',
            title: 'Field Notes',
            icon: '🗺️',
            summary: 'MIFF scouts whisper back with annotated itineraries.',
            content: 'Pin photos, capture approvals, and let MIFF highlight the most production-ready routes. Live sync ensures your crew stays aligned when the sun shifts.',
            window: {
                width: 460,
                height: 380,
            },
        },
    ],
};
export default mockContent;
//# sourceMappingURL=mockContent.js.map