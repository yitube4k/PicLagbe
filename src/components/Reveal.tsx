import React from 'react';

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

/**
 * Perf note: previously this component ran IntersectionObserver-driven
 * fade/slide reveals on every section — heavy on low-end devices.
 * It now renders children immediately (kept for API compatibility).
 */
export default function Reveal({ children, className = '' }: RevealProps) {
  return <div className={className.trim()}>{children}</div>;
}
