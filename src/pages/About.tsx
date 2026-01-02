import { Link } from 'react-router-dom';
import { Button } from '@/components/common/Button';

/**
 * About page
 */
export function About() {
  return (
    <div className="min-h-screen flex items-start justify-center px-4 py-12">
      <div className="max-w-3xl">
        <h1 className="text-4xl font-bold mb-4">About LibraryAI</h1>
        <p className="text-slate-600 mb-6">
          LibraryAI helps readers discover books they'll love using curated recommendations and
          personalized reading lists. Our mission is to make great books discoverable and to
          connect readers with new ideas.
        </p>

        <h2 className="text-2xl font-semibold mb-2">What we offer</h2>
        <ul className="list-disc list-inside text-slate-600 mb-6">
          <li>Personalized recommendations based on interests and reading history</li>
          <li>Curated reading lists covering many genres and topics</li>
          <li>Easy-to-use search and intuitive book detail pages</li>
        </ul>

        <p className="text-slate-600 mb-6">
          If you have questions or feedback, we'd love to hear from you — drop us a message via
          the contact form (coming soon) or open an issue on the project repository.
        </p>

        <Link to="/">
          <Button variant="primary">Back to Home</Button>
        </Link>
      </div>
    </div>
  );
}
