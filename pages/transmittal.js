import dynamic from 'next/dynamic';

// Render the app-based transmittal page purely on the client to avoid
// complex server-side prerendering issues during build/deploy.
const TransmittalPage = dynamic(() => import('../app/transmittal/page'), {
  ssr: false,
});

export default function TransmittalRoute() {
  return <TransmittalPage />;
}


