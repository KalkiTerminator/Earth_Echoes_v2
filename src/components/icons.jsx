// Minimal icon set drawn as SVG primitives.
const Icon = ({ path, size = 16, stroke = 1.75, className = "", fill = "none" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill={fill} stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
    className={className}>
    {path}
  </svg>
);

export const Icons = {
  Play:      (p) => <Icon {...p} path={<polygon points="6 4 20 12 6 20 6 4" fill="currentColor" stroke="none" />} />,
  Pause:     (p) => <Icon {...p} path={<><rect x="6" y="5" width="4" height="14" fill="currentColor" stroke="none" /><rect x="14" y="5" width="4" height="14" fill="currentColor" stroke="none" /></>} />,
  Film:      (p) => <Icon {...p} path={<><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 8h4M17 8h4M3 16h4M17 16h4M7 4v16M17 4v16" /></>} />,
  Clock:     (p) => <Icon {...p} path={<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>} />,
  X:         (p) => <Icon {...p} path={<><path d="M18 6 6 18M6 6l12 12" /></>} />,
  Share:     (p) => <Icon {...p} path={<><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><path d="M16 6l-4-4-4 4" /><path d="M12 2v13" /></>} />,
  Bookmark:  (p) => <Icon {...p} path={<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />} />,
  BookmarkFill: (p) => <Icon {...p} fill="currentColor" path={<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />} />,
  Volume:    (p) => <Icon {...p} path={<><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" stroke="currentColor" /><path d="M19 12a6 6 0 0 1-3 5.2" /><path d="M15.5 8.5a4 4 0 0 1 0 7" /></>} />,
  VolumeOff: (p) => <Icon {...p} path={<><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" stroke="currentColor" /><path d="M22 9l-6 6M16 9l6 6" /></>} />,
  Settings:  (p) => <Icon {...p} path={<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>} />,
  ChevronR:  (p) => <Icon {...p} path={<polyline points="9 18 15 12 9 6" />} />,
  ChevronL:  (p) => <Icon {...p} path={<polyline points="15 18 9 12 15 6" />} />,
  ChevronDown: (p) => <Icon {...p} path={<polyline points="6 9 12 15 18 9" />} />,
  Skull:     (p) => <Icon {...p} path={<><path d="M12 2a8 8 0 0 0-8 8v5l2 2v3h3v-2h6v2h3v-3l2-2v-5a8 8 0 0 0-8-8z" /><circle cx="9" cy="11" r="1.3" fill="currentColor" /><circle cx="15" cy="11" r="1.3" fill="currentColor" /></>} />,
  Heart:     (p) => <Icon {...p} path={<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z" />} />,
  Globe:     (p) => <Icon {...p} path={<><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></>} />,
  Home:      (p) => <Icon {...p} path={<><path d="M3 12l9-9 9 9" /><path d="M5 10v10h14V10" /></>} />,
  Plus:      (p) => <Icon {...p} path={<><path d="M12 5v14M5 12h14" /></>} />,
  Minus:     (p) => <Icon {...p} path={<path d="M5 12h14" />} />,
  Users:     (p) => <Icon {...p} path={<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.9" /><path d="M16 3.1a4 4 0 0 1 0 7.8" /></>} />,
  Info:      (p) => <Icon {...p} path={<><circle cx="12" cy="12" r="9" /><path d="M12 8h.01M11 12h1v5h1" /></>} />,
  Waves:     (p) => <Icon {...p} path={<><path d="M2 6c2 0 3 2 5 2s3-2 5-2 3 2 5 2 3-2 5-2" /><path d="M2 12c2 0 3 2 5 2s3-2 5-2 3 2 5 2 3-2 5-2" /><path d="M2 18c2 0 3 2 5 2s3-2 5-2 3 2 5 2 3-2 5-2" /></>} />,
  Tree:      (p) => <Icon {...p} path={<><path d="M12 2l4 6h-2l4 6h-3l4 6H5l4-6H6l4-6H8z" /><path d="M12 20v2" /></>} />,
  Snowflake: (p) => <Icon {...p} path={<><path d="M12 2v20M2 12h20M4 6l16 12M20 6L4 18" /></>} />,
  Layers:    (p) => <Icon {...p} path={<><polygon points="12 2 2 8 12 14 22 8 12 2" /><polyline points="2 16 12 22 22 16" /><polyline points="2 12 12 18 22 12" /></>} />,
  Sparkles:  (p) => <Icon {...p} path={<><path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z" fill="currentColor" stroke="none" /><path d="M19 14l.7 1.8L21.5 16.5l-1.8.7L19 19l-.7-1.8L16.5 16.5l1.8-.7z" fill="currentColor" stroke="none" /></>} />,
  History:   (p) => <Icon {...p} path={<><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /><path d="M12 7v5l3 2" /></>} />,
  Search:    (p) => <Icon {...p} path={<><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.5-4.5" /></>} />,
  Download:  (p) => <Icon {...p} path={<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><path d="M12 15V3" /></>} />,
  Menu:      (p) => <Icon {...p} path={<path d="M4 7h16M4 12h16M4 17h16" />} />,
};
