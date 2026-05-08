import React from 'react';

// Exact replica SVG paths matching the provided classic blocky Chess.com design

const Exclamation = () => (
  <path d="M10.25 4.5h3.5v9h-3.5z M10.25 15.5h3.5v3.5h-3.5z" />
);

const Question = () => (
  <path d="M12 4.5c-2.5 0-4.5 1.5-4.5 3.5h3.5c0-.8.5-1.2 1.2-1.2s1.2.4 1.2 1.2c0 1.2-3 1.8-3 4.5v1h3.5v-.5c0-2 3-2.5 3-5 0-2-2-3.5-5-3.5z M10.25 15.5h3.5v3.5h-3.5z" />
);

export const BrilliantIcon = ({ size = 16, color = '#fff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <g transform="translate(-2.5, 0)"><Exclamation /></g>
    <g transform="translate(2.5, 0)"><Exclamation /></g>
  </svg>
);

export const GreatFindIcon = ({ size = 16, color = '#fff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Exclamation />
  </svg>
);

export const BestIcon = ({ size = 16, color = '#fff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M12 3.5l2.6 5.5 6.1.8-4.5 4.3 1.1 6.1-5.3-2.9-5.3 2.9 1.1-6.1-4.5-4.3 6.1-.8z" />
  </svg>
);

export const ExcellentIcon = ({ size = 16, color = '#fff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <rect x="4.5" y="10.5" width="3.5" height="9.5" rx="0.5" />
    <path d="M9.5 10.5V7a2 2 0 0 1 4 0v3.5h4.5A1.5 1.5 0 0 1 19.5 12v6a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 9.5 18V10.5z" />
  </svg>
);

export const GoodIcon = ({ size = 16, color = '#fff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 13l4 4L18 7" />
  </svg>
);

export const BookIcon = ({ size = 16, color = '#fff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M5.5 7l5.5 1.5v11l-5.5-1.5v-11zm6.5 1.5l5.5-1.5v11l-5.5 1.5v-11z" />
  </svg>
);

export const InaccuracyIcon = ({ size = 16, color = '#fff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <g transform="translate(-2.5, 0)"><Question /></g>
    <g transform="translate(3, 0)"><Exclamation /></g>
  </svg>
);

export const MistakeIcon = ({ size = 16, color = '#fff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Question />
  </svg>
);

export const MissIcon = ({ size = 16, color = '#fff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 7l10 10M17 7L7 17" />
  </svg>
);

export const BlunderIcon = ({ size = 16, color = '#fff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <g transform="translate(-3, 0)"><Question /></g>
    <g transform="translate(3, 0)"><Question /></g>
  </svg>
);

export const ForcedIcon = ({ size = 16, color = '#fff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5">
    <rect x="5" y="5" width="14" height="14" rx="2" />
  </svg>
);

export function ClassificationIcon({ type, size = 16, color = '#fff' }) {
  switch (type) {
    case 'brilliant': return <BrilliantIcon size={size} color={color} />;
    case 'great': return <GreatFindIcon size={size} color={color} />;
    case 'best': return <BestIcon size={size} color={color} />;
    case 'excellent': return <ExcellentIcon size={size} color={color} />;
    case 'good': return <GoodIcon size={size} color={color} />;
    case 'book': return <BookIcon size={size} color={color} />;
    case 'inaccuracy': return <InaccuracyIcon size={size} color={color} />;
    case 'mistake': return <MistakeIcon size={size} color={color} />;
    case 'miss': return <MissIcon size={size} color={color} />;
    case 'blunder': return <BlunderIcon size={size} color={color} />;
    case 'forced': return <ForcedIcon size={size} color={color} />;
    default: return null;
  }
}
