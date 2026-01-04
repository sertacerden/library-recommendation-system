import { useRef, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/common/Button';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Input } from '@/components/common/Input';
import {
  createReview,
  getBook,
  getReadingLists,
  getReviews,
  updateReadingList,
  createReadingList,
} from '@/services/api';
import { Book, ReadingList, Review } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { formatDate, formatRating } from '@/utils/formatters';
import { handleApiError, showSuccess } from '@/utils/errorHandling';

/**
 * BookDetail page component
 */
export function BookDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [book, setBook] = useState<Book | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const reviewsSectionRef = useRef<HTMLDivElement | null>(null);
  const reviewCommentRef = useRef<HTMLTextAreaElement | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isReviewsLoading, setIsReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  const [newRating, setNewRating] = useState<number>(5);
  const [newComment, setNewComment] = useState<string>('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  useEffect(() => {
    if (id) {
      loadBook(id);
      loadReviews(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadBook = async (bookId: string) => {
    setIsLoading(true);
    try {
      const data = await getBook(bookId);
      if (!data) {
        navigate('/404');
        return;
      }
      setBook(data);
    } catch (error) {
      handleApiError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadReviews = async (bookId: string) => {
    setIsReviewsLoading(true);
    setReviewsError(null);
    try {
      const data = await getReviews(bookId);
      setReviews(data);
    } catch (error) {
      handleApiError(error);
      setReviewsError(error instanceof Error ? error.message : 'Failed to load reviews');
      setReviews([]);
    } finally {
      setIsReviewsLoading(false);
    }
  };

  const scrollToReviews = () => {
    reviewsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(() => reviewCommentRef.current?.focus(), 250);
  };

  const clampRating = (rating: number) => Math.max(1, Math.min(5, rating));

  const averageRating = reviews.length
    ? reviews.reduce((sum, r) => sum + (typeof r.rating === 'number' ? r.rating : 0), 0) / reviews.length
    : 0;

  const renderStars = (rating: number) => {
    const full = Math.round(clampRating(rating));
    return (
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, idx) => {
          const filled = idx < full;
          return (
            <svg
              key={idx}
              className={`w-4 h-4 ${filled ? 'text-amber-500' : 'text-slate-300'}`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          );
        })}
      </div>
    );
  };

  const handleSubmitReview = async () => {
    if (!id) return;
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    const rating = clampRating(newRating);
    const comment = newComment.trim();
    if (!comment) {
      setReviewsError('Please write a comment for your review.');
      scrollToReviews();
      return;
    }

    setIsSubmittingReview(true);
    setReviewsError(null);
    try {
      const created = await createReview({
        bookId: id,
        rating,
        comment,
      });
      setReviews((prev) => [created, ...prev]);
      setNewRating(5);
      setNewComment('');
      showSuccess('Review submitted!');
      scrollToReviews();
    } catch (error) {
      handleApiError(error);
      setReviewsError(error instanceof Error ? error.message : 'Failed to submit review');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Add to reading list functionality
  const [showAddModal, setShowAddModal] = useState(false);
  const [lists, setLists] = useState<ReadingList[]>([]);
  const [isListsLoading, setIsListsLoading] = useState(false);
  const [newListNameForQuickCreate, setNewListNameForQuickCreate] = useState('');
  const [selectedListId, setSelectedListId] = useState<string>('');

  const handleAddToList = async () => {
    setShowAddModal(true);
    if (lists.length === 0) {
      setIsListsLoading(true);
      try {
        const data = await getReadingLists();
        setLists(data);
      } catch (error) {
        handleApiError(error);
      } finally {
        setIsListsLoading(false);
      }
    }
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setNewListNameForQuickCreate('');
  };

  const handleAddToExistingList = async (listId?: string) => {
    const targetId = listId ?? selectedListId;
    if (!book || !targetId) return;
    try {
      const list = lists.find((l) => l.id === targetId);
      if (!list) return;
      if (list.bookIds.includes(book.id)) {
        alert('This book is already in the selected list');
        return;
      }
      const updated = await updateReadingList(targetId, { bookIds: [...list.bookIds, book.id] });
      setLists((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
      showSuccess(`Added to "${updated.name}"`);
      window.dispatchEvent(new Event('reading-lists-changed'));
      setSelectedListId('');
      closeAddModal();
    } catch (error) {
      handleApiError(error);
    }
  };

  const handleCreateListWithBook = async () => {
    if (!newListNameForQuickCreate.trim()) {
      alert('Please enter a name for the list');
      return;
    }
    try {
      const created = await createReadingList({
        name: newListNameForQuickCreate.trim(),
        description: '',
        bookIds: [book!.id],
      });
      setLists((prev) => [...prev, created]);
      showSuccess('Reading list created and book added!');
      window.dispatchEvent(new Event('reading-lists-changed'));
      closeAddModal();
    } catch (error) {
      handleApiError(error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!book) {
    return null;
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="container mx-auto max-w-6xl">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-slate-600 hover:text-violet-600 mb-8 transition-colors group glass-effect px-4 py-2 rounded-xl border border-white/20 w-fit"
        >
          <svg
            className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          <span className="font-semibold">Back</span>
        </button>

        <div className="glass-effect rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 p-8 md:p-12">
            <div className="md:col-span-1">
              <div className="relative group">
                <img
                  src={book.coverImage}
                  alt={book.title}
                  className="w-full rounded-2xl shadow-2xl group-hover:shadow-glow transition-all duration-300"
                  onError={(e) => {
                    e.currentTarget.src = 'https://via.placeholder.com/300x400?text=No+Cover';
                  }}
                />
                <div className="absolute inset-0 bg-linear-to-t from-violet-900/20 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>
            </div>

            <div className="md:col-span-2">
              <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-3 leading-tight">
                {book.title}
              </h1>
              <p className="text-xl text-slate-600 mb-6 font-medium">by {book.author}</p>

              <div className="flex flex-wrap items-center gap-4 mb-8">
                <div className="flex items-center bg-linear-to-r from-amber-50 to-orange-50 px-4 py-2 rounded-xl border border-amber-200 shadow-sm">
                  <svg
                    className="w-5 h-5 text-amber-500 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="text-lg font-bold text-amber-700">
                    {formatRating(book.rating)}
                  </span>
                </div>

                <span className="badge-gradient px-4 py-2 text-sm">{book.genre}</span>

                <div className="flex items-center text-slate-600 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <span className="font-semibold">{book.publishedYear}</span>
                </div>
              </div>

              <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center">
                  <span className="w-1 h-6 bg-linear-to-b from-violet-600 to-indigo-600 rounded-full mr-3"></span>
                  Description
                </h2>
                <p className="text-slate-700 leading-relaxed text-lg">{book.description}</p>
              </div>

              <div className="mb-8 glass-effect p-4 rounded-xl border border-white/20">
                <p className="text-sm text-slate-600">
                  <span className="font-semibold">ISBN:</span> {book.isbn}
                </p>
              </div>

              <div className="flex flex-wrap gap-4">
                <Button variant="primary" size="lg" onClick={handleAddToList}>
                  <svg
                    className="w-5 h-5 mr-2 inline"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                  Add to Reading List
                </Button>
                <Button variant="outline" size="lg" onClick={scrollToReviews}>
                  <svg
                    className="w-5 h-5 mr-2 inline"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                  Write a Review
                </Button>
              </div>
            </div>
          </div>
        </div>

        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={closeAddModal}></div>
            <div className="relative z-10 bg-white rounded-xl shadow-xl w-full max-w-md p-6">
              <h3 className="text-lg font-bold mb-3">Add &quot;{book.title}&quot; to reading list</h3>

              {isListsLoading ? (
                <div className="flex items-center justify-center py-6">
                  <LoadingSpinner />
                </div>
              ) : (
                <div>
                  {lists.length === 0 ? (
                    <div>
                      <p className="text-slate-600 mb-3">You don't have any reading lists yet. Create one now:</p>
                      <Input
                        label="List Name"
                        type="text"
                        value={newListNameForQuickCreate}
                        onChange={(e) => setNewListNameForQuickCreate(e.target.value)}
                        placeholder="e.g., Favorites"
                      />
                      <div className="flex justify-end gap-2 mt-4">
                        <Button variant="primary" onClick={handleCreateListWithBook}>
                          Create & Add
                        </Button>
                        <Button variant="secondary" onClick={closeAddModal}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Choose a list</label>
                      <select
                        value={selectedListId}
                        onChange={(e) => setSelectedListId(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 mb-3"
                      >
                        <option value="">Select a list…</option>
                        {lists.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.name} ({l.bookIds.length} books)
                          </option>
                        ))}
                      </select>

                      <div className="flex justify-end gap-2">
                        <Button
                          variant="primary"
                          onClick={() => handleAddToExistingList()}
                          disabled={
                            !selectedListId || lists.find((l) => l.id === selectedListId)?.bookIds.includes(book.id)
                          }
                        >
                          Add to Selected
                        </Button>
                        <Button variant="secondary" onClick={closeAddModal}>
                          Cancel
                        </Button>
                      </div>

                      <div className="mt-3 border-t pt-3">
                        <p className="text-slate-600 mb-2">Or create a new list:</p>
                        <Input
                          label="New List Name"
                          type="text"
                          value={newListNameForQuickCreate}
                          onChange={(e) => setNewListNameForQuickCreate(e.target.value)}
                          placeholder="e.g., To Read"
                        />
                        <div className="flex justify-end gap-2 mt-3">
                          <Button variant="primary" onClick={handleCreateListWithBook}>
                            Create & Add
                          </Button>
                          <Button variant="secondary" onClick={closeAddModal}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <div
          ref={reviewsSectionRef}
          className="mt-8 glass-effect rounded-3xl shadow-xl border border-white/20 p-8 md:p-12"
        >
          <h2 className="text-3xl font-bold text-slate-900 mb-6 flex items-center">
            <span className="w-1 h-8 bg-linear-to-b from-violet-600 to-indigo-600 rounded-full mr-3"></span>
            Reviews
          </h2>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="flex items-center bg-linear-to-r from-amber-50 to-orange-50 px-4 py-2 rounded-xl border border-amber-200 shadow-sm">
                <span className="text-lg font-bold text-amber-700">
                  {reviews.length ? formatRating(averageRating) : '—'}
                </span>
                <span className="text-sm text-amber-700/80 ml-2">avg</span>
              </div>
              <div className="text-slate-600 font-medium">
                {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
              </div>
            </div>

            <Button variant="outline" size="md" onClick={scrollToReviews} className="w-fit">
              Write a Review
            </Button>
          </div>

          {reviewsError && (
            <div className="mb-6 p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 font-medium">
              {reviewsError}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <div className="glass-effect p-6 rounded-2xl border border-white/20">
                <h3 className="text-xl font-bold text-slate-900 mb-4">Add your review</h3>

                {!isAuthenticated ? (
                  <div className="text-slate-600">
                    <p className="mb-4">Log in to write a review.</p>
                    <Button variant="primary" size="md" onClick={() => navigate('/login')}>
                      Go to Login
                    </Button>
                  </div>
                ) : (
                  <>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Rating</label>
                    <select
                      className="input-modern mb-5"
                      value={newRating}
                      onChange={(e) => setNewRating(clampRating(Number(e.target.value)))}
                    >
                      {[5, 4, 3, 2, 1].map((r) => (
                        <option key={r} value={r}>
                          {r} {r === 1 ? 'star' : 'stars'}
                        </option>
                      ))}
                    </select>

                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Comment <span className="text-rose-500 ml-1">*</span>
                    </label>
                    <textarea
                      ref={reviewCommentRef}
                      className="input-modern min-h-[140px] resize-none"
                      placeholder="What did you think?"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                    />

                    <div className="mt-5 flex items-center gap-3">
                      <Button
                        variant="primary"
                        size="md"
                        onClick={handleSubmitReview}
                        disabled={isSubmittingReview || isReviewsLoading}
                      >
                        {isSubmittingReview ? 'Submitting...' : 'Submit Review'}
                      </Button>
                      <button
                        type="button"
                        className="text-slate-600 hover:text-violet-600 font-semibold"
                        onClick={() => {
                          setNewRating(5);
                          setNewComment('');
                          setReviewsError(null);
                        }}
                      >
                        Clear
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="lg:col-span-2 space-y-4">
              {isReviewsLoading ? (
                <div className="py-10 flex items-center justify-center">
                  <LoadingSpinner size="md" />
                </div>
              ) : reviews.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-linear-to-br from-violet-100 to-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg
                      className="w-8 h-8 text-violet-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                      />
                    </svg>
                  </div>
                  <p className="text-slate-600 text-lg">No reviews yet. Be the first!</p>
                </div>
              ) : (
                reviews.map((review) => (
                  <div
                    key={review.id}
                    className="glass-effect p-6 rounded-2xl border border-white/20 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-3">
                          {renderStars(review.rating)}
                          <span className="text-slate-700 font-bold">{formatRating(review.rating)}</span>
                        </div>
                        <div className="text-sm text-slate-500 mt-1">{formatDate(review.createdAt)}</div>
                      </div>
                      <div className="text-sm text-slate-500 font-medium">
                        {review.userName?.trim() ||
                          (user && review.userId === user.id ? user.name : `User ${review.userId.slice(0, 6)}…`)}
                      </div>
                    </div>
                    <p className="text-slate-700 mt-4 leading-relaxed">{review.comment}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
