import { Link } from 'react-router-dom';
import { Button } from '@/components/common/Button';

/**
 * Terms of Service (summary)
 */
export function Terms() {
  return (
    <div className="min-h-screen flex items-start justify-center px-4 py-12">
      <div className="max-w-3xl">
        <h1 className="text-4xl font-bold mb-4">Terms of Service</h1>
        <p className="text-slate-600 mb-4">
          By using LibraryAI you agree to our terms. Please use the site responsibly and do not
          attempt to abuse or reverse-engineer services.
        </p>

        <h2 className="text-xl font-semibold mb-2">User obligations</h2>
        <p className="text-slate-600 mb-3">Keep account information accurate and respect other users.</p>

        <h2 className="text-xl font-semibold mb-2">Liability</h2>
        <p className="text-slate-600 mb-6">LibraryAI provides content for informational purposes and is not liable for user actions.</p>

        <p className="text-slate-600">If you have questions about these terms, contact the site administrators.</p>

        <div className="mt-6">
          <Link to="/">
            <Button variant="primary">Back to Home</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
