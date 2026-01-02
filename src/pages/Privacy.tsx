import { Link } from 'react-router-dom';
import { Button } from '@/components/common/Button';

/**
 * Privacy Policy (simple summary)
 */
export function Privacy() {
  return (
    <div className="min-h-screen flex items-start justify-center px-4 py-12">
      <div className="max-w-3xl">
        <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
        <p className="text-slate-600 mb-4">
          This page explains how LibraryAI collects and uses information. We prioritize user
          privacy and minimize data collection.
        </p>

        <h2 className="text-xl font-semibold mb-2">Information we collect</h2>
        <p className="text-slate-600 mb-3">
          We may collect information you provide (e.g., account email) and non-identifying
          analytics to improve the service. We do not sell user data to third parties.
        </p>

        <h2 className="text-xl font-semibold mb-2">How we use data</h2>
        <p className="text-slate-600 mb-6">
          Data is used to provide recommendations, improve the product, and for basic
          troubleshooting. Users can request deletion of their account and associated data.
        </p>

        <p className="text-slate-600">For full details, consult the complete policy or contact us.</p>

        <div className="mt-6">
          <Link to="/">
            <Button variant="primary">Back to Home</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
