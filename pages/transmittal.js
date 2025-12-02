import dynamic from 'next/dynamic';

// Render the client-only Transmittal page component to avoid complex
// server-side prerendering issues during build/deploy.
const TransmittalPage = dynamic(() => import('../components/TransmittalPageClient'), {
  ssr: false,
});

export default function TransmittalRoute() {
  return <TransmittalPage />;
}

