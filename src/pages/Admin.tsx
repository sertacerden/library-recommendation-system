import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { CoverImageUpload } from '@/components/common/CoverImageUpload';
import { CountUp } from '@/components/common/CountUp';
import {
  getBooks,
  createBook,
  updateBook,
  deleteBook,
  getAllReadingLists,
  getUsers,
  getAllReviews,
  adminDeleteReview,
} from '@/services/api';
import { Book, Review } from '@/types';
import { handleApiError, showSuccess, showWarning } from '@/utils/errorHandling';
import { confirmPopup } from '@/utils/confirm';
import { formatRatingOrNR } from '@/utils/formatters';
import { Link } from 'react-router-dom';

/**
 * Admin page component for managing books and viewing metrics
 */
export function Admin() {
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [titleSearch, setTitleSearch] = useState('');
  const [addCoverUploadReset, setAddCoverUploadReset] = useState(0);
  const [editCoverUploadReset, setEditCoverUploadReset] = useState(0);
  const [newBook, setNewBook] = useState({
    title: '',
    author: '',
    genre: '',
    description: '',
    coverImage: '',
    publishedYear: new Date().getFullYear(),
    isbn: '',
  });

  const [editBook, setEditBook] = useState<Book | null>(null);

  const [readingListCount, setReadingListCount] = useState(0);
  const [userCount, setUserCount] = useState(0);

  // Reviews management state
  const [activeTab, setActiveTab] = useState<'books' | 'reviews'>('books');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isReviewsLoading, setIsReviewsLoading] = useState(false);
  const [reviewsPage, setReviewsPage] = useState(1);

  const averageRatingByBookId = useMemo(() => {
    const acc = new Map<string, { sum: number; count: number }>();
    for (const r of reviews) {
      const cur = acc.get(r.bookId) ?? { sum: 0, count: 0 };
      cur.sum += r.rating;
      cur.count += 1;
      acc.set(r.bookId, cur);
    }
    const avg = new Map<string, number>();
    for (const [bookId, { sum, count }] of acc.entries()) {
      if (count > 0) avg.set(bookId, sum / count);
    }
    return avg;
  }, [reviews]);

  const fetchAllReviews = useCallback(async (): Promise<Review[]> => {
    const all: Review[] = [];
    let nextToken: string | undefined = undefined;
    let pageGuard = 0;

    do {
      // Guard against accidental infinite loops if backend returns the same token repeatedly
      if (pageGuard++ > 50) break;

      const res = await getAllReviews({ limit: 200, nextToken });
      all.push(...res.items);
      nextToken = res.nextToken;
    } while (nextToken);

    return all;
  }, []);

  useEffect(() => {
    // Initialize Preline components once the loading state is resolved and elements are in DOM
    if (!isLoading) {
      setTimeout(() => {
        window.HSStaticMethods?.autoInit();
      }, 100);
    }
  }, [isLoading]);

  const filterBooksByTitle = (allBooks: Book[], query: string) => {
    const q = query.trim().toLowerCase();
    if (!q) return allBooks;
    return allBooks.filter((b) => b.title.toLowerCase().includes(q));
  };

  const BOOKS_PER_PAGE = 10;
  const filteredBooks = filterBooksByTitle(books, titleSearch);
  const totalPages = Math.max(1, Math.ceil(filteredBooks.length / BOOKS_PER_PAGE));
  const clampedCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);
  const pageStartIndex = (clampedCurrentPage - 1) * BOOKS_PER_PAGE;
  const pageEndIndex = Math.min(pageStartIndex + BOOKS_PER_PAGE, filteredBooks.length);
  const paginatedBooks = filteredBooks.slice(pageStartIndex, pageEndIndex);

  const REVIEWS_PER_PAGE = 10;
  const totalReviewPages = Math.max(1, Math.ceil(reviews.length / REVIEWS_PER_PAGE));
  const clampedReviewsPage = Math.min(Math.max(reviewsPage, 1), totalReviewPages);
  const reviewsStartIndex = (clampedReviewsPage - 1) * REVIEWS_PER_PAGE;
  const reviewsEndIndex = Math.min(reviewsStartIndex + REVIEWS_PER_PAGE, reviews.length);
  const paginatedReviews = reviews.slice(reviewsStartIndex, reviewsEndIndex);

  useEffect(() => {
    setCurrentPage((prev) => Math.min(Math.max(prev, 1), totalPages));
  }, [totalPages]);

  useEffect(() => {
    setReviewsPage((prev) => Math.min(Math.max(prev, 1), totalReviewPages));
  }, [totalReviewPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [titleSearch]);

  const getVisiblePages = (current: number, total: number): Array<number | '...'> => {
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    const pages: Array<number | '...'> = [];
    const left = Math.max(2, current - 1);
    const right = Math.min(total - 1, current + 1);

    pages.push(1);
    if (left > 2) pages.push('...');
    for (let p = left; p <= right; p++) pages.push(p);
    if (right < total - 1) pages.push('...');
    pages.push(total);

    return pages;
  };

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [booksData, readingListsData, usersData, reviewsData] = await Promise.all([
        getBooks(),
        getAllReadingLists().catch(() => []),
        getUsers().catch(() => []),
        fetchAllReviews().catch(() => []),
      ]);
      setBooks(booksData);
      setReadingListCount(readingListsData.length);
      setUserCount(usersData.length);
      const sortedReviews = reviewsData.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setReviews(sortedReviews);
    } catch (error) {
      handleApiError(error);
    } finally {
      setIsLoading(false);
    }
  }, [fetchAllReviews]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openAddBookOffcanvas = () => {
    setNewBook({
      title: '',
      author: '',
      genre: '',
      description: '',
      coverImage: '',
      publishedYear: new Date().getFullYear(),
      isbn: '',
    });
    setAddCoverUploadReset((prev) => prev + 1);

    setTimeout(() => {
      const el = document.getElementById('add-book-offcanvas');
      if (el && window.HSOverlay) {
        window.HSOverlay.open(el);
      }
    }, 10);
  };

  const closeAddBookOffcanvas = () => {
    const el = document.getElementById('add-book-offcanvas');
    if (el && window.HSOverlay) {
      window.HSOverlay.close(el);
    }
  };

  const openEditBookOffcanvas = (book: Book) => {
    setEditBook(book);
    setEditCoverUploadReset((prev) => prev + 1);

    setTimeout(() => {
      const el = document.getElementById('edit-book-offcanvas');
      if (el && window.HSOverlay) {
        window.HSOverlay.open(el);
      }
    }, 10);
  };

  const closeEditBookOffcanvas = () => {
    const el = document.getElementById('edit-book-offcanvas');
    if (el && window.HSOverlay) {
      window.HSOverlay.close(el);
    }
  };

  const handleCreateBook = async () => {
    if (!newBook.title || !newBook.author) {
      showWarning('Please fill in required fields');
      return;
    }

    try {
      const created = await createBook({
        ...newBook,
        rating: 0,
      });

      closeAddBookOffcanvas();

      // Delay state updates to prevent DOM thrashing during close animation
      setTimeout(() => {
        const nextBooks = [...books, created];
        setBooks(nextBooks);
        const nextFiltered = filterBooksByTitle(nextBooks, titleSearch);
        setCurrentPage(Math.max(1, Math.ceil(nextFiltered.length / BOOKS_PER_PAGE)));
        showSuccess('Book added successfully!');
      }, 400);
    } catch (error) {
      handleApiError(error);
    }
  };

  const handleUpdateBook = async () => {
    if (!editBook || !editBook.title || !editBook.author) {
      showWarning('Please fill in required fields');
      return;
    }

    try {
      const updatePayload = {
        title: editBook.title,
        author: editBook.author,
        genre: editBook.genre,
        description: editBook.description,
        coverImage: editBook.coverImage,
        rating: 0,
        publishedYear: editBook.publishedYear,
        isbn: editBook.isbn,
      };

      const updated = await updateBook(editBook.id, updatePayload);

      closeEditBookOffcanvas();

      // Delay state updates to prevent DOM thrashing during close animation
      setTimeout(() => {
        setBooks(books.map((b) => (b.id === updated.id ? updated : b)));
        setEditBook(null);
        showSuccess('Book updated successfully!');
      }, 400);
    } catch (error) {
      console.error(error); // Log detailed error
      handleApiError(error);
    }
  };

  const handleDeleteBook = async (id: string) => {
    const ok = await confirmPopup({
      title: 'Delete book?',
      message: 'Are you sure you want to delete this book?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      await deleteBook(id);
      setBooks(books.filter((book) => book.id !== id));
      showSuccess('Book deleted successfully!');
    } catch (error) {
      handleApiError(error);
    }
  };

  const handleTabChange = (tab: 'books' | 'reviews') => {
    setActiveTab(tab);
    if (tab === 'reviews') {
      loadReviews();
    }
  };

  const loadReviews = async () => {
    setIsReviewsLoading(true);
    try {
      const items = await fetchAllReviews();
      const sortedReviews = items.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setReviews(sortedReviews);
    } catch (error) {
      handleApiError(error);
    } finally {
      setIsReviewsLoading(false);
    }
  };

  const handleDeleteReview = async (bookId: string, reviewId: string) => {
    const ok = await confirmPopup({
      title: 'Delete review?',
      message: 'Are you sure you want to delete this review?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await adminDeleteReview({ bookId, reviewId });
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      showSuccess('Review deleted successfully');
    } catch (error) {
      // If the review is already gone (404), treat it as success and remove from UI
      if (error instanceof Error && error.message.includes('404')) {
        setReviews((prev) => prev.filter((r) => r.id !== reviewId));
        showSuccess('Review deleted (was already missing)');
        return;
      }

      // Check for specific backend misconfiguration error
      if (error instanceof Error && error.message.includes('Missing path param')) {
        handleApiError(
          'Backend Error: The Admin Delete API is missing the {reviewId} path parameter configuration in API Gateway. Please contact the backend developer.'
        );
        return;
      }

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

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="container mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-2">Admin Dashboard</h1>
          <p className="text-slate-600 text-lg">Manage books and view system metrics</p>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-linear-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
            <h3 className="text-lg font-semibold mb-2 opacity-90">Total Books</h3>
            <p className="text-5xl font-bold">
              <CountUp end={books.length} duration={1500} />
            </p>
          </div>
          <div className="bg-linear-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-lg p-6 text-white">
            <h3 className="text-lg font-semibold mb-2 opacity-90">Total Users</h3>
            <p className="text-5xl font-bold">
              <CountUp end={userCount} duration={1500} />
            </p>
          </div>
          <div className="bg-linear-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
            <h3 className="text-lg font-semibold mb-2 opacity-90">Active Reading Lists</h3>
            <p className="text-5xl font-bold">
              <CountUp end={readingListCount} duration={1500} />
            </p>
          </div>
        </div>

        {/* Books Management */}
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200 p-6">
          <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => handleTabChange('books')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  activeTab === 'books'
                    ? 'bg-white text-violet-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Manage Books
              </button>
              <button
                onClick={() => handleTabChange('reviews')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  activeTab === 'reviews'
                    ? 'bg-white text-violet-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Manage Reviews
              </button>
            </div>

            {activeTab === 'books' && (
              <Button variant="primary" onClick={openAddBookOffcanvas}>
                Add New Book
              </Button>
            )}
            {activeTab === 'reviews' && (
              <Button variant="secondary" onClick={loadReviews} disabled={isReviewsLoading}>
                {isReviewsLoading ? 'Refreshing...' : 'Refresh Reviews'}
              </Button>
            )}
          </div>

          {activeTab === 'books' ? (
            <>
              <div className="max-w-md">
                <Input
                  label="Search by title"
                  type="text"
                  value={titleSearch}
                  onChange={(e) => setTitleSearch(e.target.value)}
                  placeholder="Type a book title..."
                />
              </div>

              <div className="overflow-x-auto mt-4">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Title</th>
                      <th className="text-left py-3 px-4">Author</th>
                      <th className="text-left py-3 px-4">Genre</th>
                      <th className="text-left py-3 px-4">Rating</th>
                      <th className="text-left py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedBooks.length === 0 ? (
                      <tr>
                        <td className="py-6 px-4 text-slate-600 text-center" colSpan={5}>
                          {titleSearch.trim() ? 'No books match that title' : 'No books found'}
                        </td>
                      </tr>
                    ) : (
                      paginatedBooks.map((book) => (
                        <tr key={book.id} className="border-b hover:bg-slate-50">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              {book.coverImage ? (
                                <img
                                  src={book.coverImage}
                                  alt={book.title}
                                  className="h-10 w-8 object-cover rounded shadow-sm border border-slate-200"
                                />
                              ) : (
                                <div className="h-10 w-8 bg-slate-100 rounded border border-slate-200 flex items-center justify-center">
                                  <span className="text-xs text-slate-400">No Img</span>
                                </div>
                              )}
                              <Link to={`/books/${book.id}`} className="font-medium text-slate-900 hover:underline">
                                {book.title}
                              </Link>
                            </div>
                          </td>
                          <td className="py-3 px-4">{book.author}</td>
                          <td className="py-3 px-4">{book.genre}</td>
                          <td className="py-3 px-4">
                            {formatRatingOrNR(averageRatingByBookId.get(book.id) ?? null)}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex gap-2">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => openEditBookOffcanvas(book)}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => handleDeleteBook(book.id)}
                              >
                                Delete
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            /* Reviews Table */
            <div className="overflow-x-auto">
              {isReviewsLoading ? (
                <div className="flex justify-center py-12">
                  <LoadingSpinner />
                </div>
              ) : (
                <>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Book</th>
                        <th className="text-left py-3 px-4">User</th>
                        <th className="text-left py-3 px-4">Review</th>
                        <th className="text-left py-3 px-4">Rating</th>
                        <th className="text-left py-3 px-4">Date</th>
                        <th className="text-left py-3 px-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedReviews.length === 0 ? (
                        <tr>
                          <td className="py-6 px-4 text-slate-600 text-center" colSpan={6}>
                            No reviews found.
                          </td>
                        </tr>
                      ) : (
                        paginatedReviews.map((review) => {
                          const book = books.find((b) => b.id === review.bookId);
                          return (
                            <tr key={review.id} className="border-b hover:bg-slate-50">
                              <td className="py-3 px-4">
                                <span className="font-medium text-slate-900">
                                  {book?.title || 'Unknown Book'}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <span className="text-sm">{review.userName || 'Anonymous'}</span>
                              </td>
                              <td className="py-3 px-4">
                                <p
                                  className="text-sm text-slate-600 max-w-xs truncate"
                                  title={review.comment}
                                >
                                  {review.comment}
                                </p>
                              </td>
                              <td className="py-3 px-4">
                                <span className="inline-flex items-center px-2 py-1 rounded-md bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200">
                                  ★ {review.rating}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-sm text-slate-500">
                                {new Date(review.createdAt).toLocaleDateString()}
                              </td>
                              <td className="py-3 px-4">
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() => handleDeleteReview(review.bookId, review.id)}
                                >
                                  Delete
                                </Button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>

                  {/* Reviews Pagination */}
                  <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <p className="text-sm text-slate-600">
                      {reviews.length === 0
                        ? 'Showing 0 of 0'
                        : `Showing ${reviewsStartIndex + 1}-${reviewsEndIndex} of ${
                            reviews.length
                          }`}
                    </p>

                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={clampedReviewsPage === 1}
                        onClick={() => setReviewsPage(clampedReviewsPage - 1)}
                      >
                        Prev
                      </Button>

                      {getVisiblePages(clampedReviewsPage, totalReviewPages).map((p, idx) =>
                        p === '...' ? (
                          <span key={`r-ellipsis-${idx}`} className="px-2 text-slate-500">
                            ...
                          </span>
                        ) : (
                          <Button
                            key={`r-page-${p}`}
                            variant={p === clampedReviewsPage ? 'primary' : 'secondary'}
                            size="sm"
                            aria-current={p === clampedReviewsPage ? 'page' : undefined}
                            onClick={() => setReviewsPage(p as number)}
                          >
                            {p}
                          </Button>
                        )
                      )}

                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={clampedReviewsPage === totalReviewPages}
                        onClick={() => setReviewsPage(clampedReviewsPage + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Pagination (Only for books) */}
        {activeTab === 'books' && (
          <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <p className="text-sm text-slate-600">
              {filteredBooks.length === 0
                ? 'Showing 0 of 0'
                : `Showing ${pageStartIndex + 1}-${pageEndIndex} of ${filteredBooks.length}`}
            </p>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="secondary"
                size="sm"
                disabled={clampedCurrentPage === 1}
                onClick={() => setCurrentPage(clampedCurrentPage - 1)}
              >
                Prev
              </Button>

              {getVisiblePages(clampedCurrentPage, totalPages).map((p, idx) =>
                p === '...' ? (
                  <span key={`ellipsis-${idx}`} className="px-2 text-slate-500">
                    ...
                  </span>
                ) : (
                  <Button
                    key={p}
                    variant={p === clampedCurrentPage ? 'primary' : 'secondary'}
                    size="sm"
                    aria-current={p === clampedCurrentPage ? 'page' : undefined}
                    onClick={() => setCurrentPage(p as number)}
                  >
                    {p}
                  </Button>
                )
              )}

              <Button
                variant="secondary"
                size="sm"
                disabled={clampedCurrentPage === totalPages}
                onClick={() => setCurrentPage(clampedCurrentPage + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Add Book Offcanvas */}
        <div
          id="add-book-offcanvas"
          className="hs-overlay hidden fixed top-0 end-0 transition-all duration-200 transform h-full max-w-md w-full z-80 bg-white dark:bg-white border-s border-gray-200"
          style={{ backgroundColor: 'white', zIndex: 80 }}
          tabIndex={-1}
          data-hs-overlay-options='{
            "bodyScroll": true,
            "backdrop": true
          }'
        >
          <div className="flex justify-between items-center py-3 px-4 border-b border-gray-200">
            <h3 className="font-bold text-gray-800">Add New Book</h3>
            <button
              type="button"
              className="px-3 py-1 text-sm font-semibold text-gray-800 hover:bg-gray-100 rounded-lg transition-all active:scale-95"
              onClick={closeAddBookOffcanvas}
            >
              Close
            </button>
          </div>
          <div className="p-4 space-y-4 overflow-y-auto h-[calc(100%-60px)] pb-8">
            <CoverImageUpload
              label="Cover Image"
              value={newBook.coverImage}
              onChange={(val) => setNewBook({ ...newBook, coverImage: val })}
              resetSignal={addCoverUploadReset}
            />

            <Input
              label="Title"
              type="text"
              value={newBook.title}
              onChange={(e) => setNewBook({ ...newBook, title: e.target.value })}
              required
            />

            <Input
              label="Author"
              type="text"
              value={newBook.author}
              onChange={(e) => setNewBook({ ...newBook, author: e.target.value })}
              required
            />

            <Input
              label="Genre"
              type="text"
              value={newBook.genre}
              onChange={(e) => setNewBook({ ...newBook, genre: e.target.value })}
              required
            />

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <textarea
                value={newBook.description}
                onChange={(e) => setNewBook({ ...newBook, description: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[100px] resize-none"
              />
            </div>

            <Input
              label="Published Year"
              type="number"
              value={newBook.publishedYear}
              onChange={(e) => setNewBook({ ...newBook, publishedYear: parseInt(e.target.value) })}
            />

            <Input
              label="ISBN"
              type="text"
              value={newBook.isbn}
              onChange={(e) => setNewBook({ ...newBook, isbn: e.target.value })}
            />

            <div className="flex gap-3 pt-4">
              <Button variant="primary" onClick={handleCreateBook} className="flex-1">
                Add Book
              </Button>
              <Button variant="secondary" onClick={closeAddBookOffcanvas} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </div>

        {/* Edit Book Offcanvas */}
        <div
          id="edit-book-offcanvas"
          className={`hs-overlay ${editBook ? '' : 'hidden'} fixed top-0 end-0 transition-all duration-200 transform h-full max-w-md w-full z-80 bg-white dark:bg-white border-s border-gray-200`}
          style={{ backgroundColor: 'white', zIndex: 80 }}
          tabIndex={-1}
          data-hs-overlay-options='{
            "bodyScroll": true,
            "backdrop": true
          }'
        >
          <div className="flex justify-between items-center py-3 px-4 border-b border-gray-200">
            <h3 className="font-bold text-gray-800">Edit Book</h3>
            <button
              type="button"
              className="px-3 py-1 text-sm font-semibold text-gray-800 hover:bg-gray-100 rounded-lg transition-all active:scale-95"
              onClick={closeEditBookOffcanvas}
            >
              Close
            </button>
          </div>
          <div className="p-4 space-y-4 overflow-y-auto h-[calc(100%-60px)] pb-8">
            {editBook && (
              <>
                <CoverImageUpload
                  label="Cover Image"
                  value={editBook.coverImage || ''}
                  resetSignal={editCoverUploadReset}
                  onChange={(nextValue) => setEditBook({ ...editBook, coverImage: nextValue })}
                />

                <Input
                  label="Title"
                  type="text"
                  value={editBook.title}
                  onChange={(e) => setEditBook({ ...editBook, title: e.target.value })}
                  required
                />

                <Input
                  label="Author"
                  type="text"
                  value={editBook.author}
                  onChange={(e) => setEditBook({ ...editBook, author: e.target.value })}
                  required
                />

                <Input
                  label="Genre"
                  type="text"
                  value={editBook.genre}
                  onChange={(e) => setEditBook({ ...editBook, genre: e.target.value })}
                  required
                />

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={editBook.description || ''}
                    onChange={(e) => setEditBook({ ...editBook, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[100px] resize-none"
                  />
                </div>

                <Input
                  label="Published Year"
                  type="number"
                  value={editBook.publishedYear}
                  onChange={(e) =>
                    setEditBook({ ...editBook, publishedYear: parseInt(e.target.value) })
                  }
                />

                <Input
                  label="ISBN"
                  type="text"
                  value={editBook.isbn || ''}
                  onChange={(e) => setEditBook({ ...editBook, isbn: e.target.value })}
                />

                <div className="flex gap-3 pt-4">
                  <Button variant="primary" onClick={handleUpdateBook} className="flex-1">
                    Save Changes
                  </Button>
                  <Button variant="secondary" onClick={closeEditBookOffcanvas} className="flex-1">
                    Cancel
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
