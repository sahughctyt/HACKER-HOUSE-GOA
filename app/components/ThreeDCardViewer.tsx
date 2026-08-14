'use client';

import dynamic from 'next/dynamic';

const LanyardViewer = dynamic(
  () => import('./LanyardViewer').then((mod) => mod.LanyardViewer),
  { ssr: false }
);

export function ThreeDCardViewer(props: any) {
  return <LanyardViewer {...props} />;
}
