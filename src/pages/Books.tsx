import { useState, useEffect, useMemo, type ReactElement } from 'react';
import { BookSearch, type FilterState } from '@/components/books/BookSearch';
import { BookGrid } from '@/components/books/BookGrid';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { getBooks, getReviews } from '@/services/api';
import { Book } from '@/types';
import { handleApiError } from '@/utils/errorHandling';
import { averageRating } from '@/utils/formatters';
import { getCenturyFromYear, Century } from '@/enums/years';
import { GENRE_OPTIONS } from '@/enums/genres';

/**
 * Helper function to sort books based on criteria
 */
const sortBooks = (books: Book[], criteria: string): Book[] => {
  return [...books].sort((a, b) => {
    switch (criteria) {
      case 'title':
        return a.title.localeCompare(b.title);
      case 'author':
        return a.author.localeCompare(b.author);
      case 'rating':
        return b.rating - a.rating;
      case 'year':
        return b.publishedYear - a.publishedYear;
      default:
        return 0;
    }
  });
};

/**
 * Books page component with search and filtering
 */
export function Books() {
  const [books, setBooks] = useState<Book[]>([]);
  const [filters, setFilters] = useState<FilterState>({ genre: '', rating: '', year: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState('title');
  const [currentPage, setCurrentPage] = useState(1);
  const [reviewAverageByBookId, setReviewAverageByBookId] = useState<
    Record<string, number | null | undefined>
  >({});

  // Derive unique values for filters
  const uniqueGenres = useMemo(() => GENRE_OPTIONS.sort(), []);
  const uniqueCenturies = useMemo(() => {
    // Return all values from the Century enum
    return Object.values(Century);
  }, []);

  // Derived filtered and sorted books
  const filteredBooks = useMemo(() => {
    let result = books;

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (book) =>
          book.title.toLowerCase().includes(q) ||
          book.author.toLowerCase().includes(q) ||
          book.genre.toLowerCase().includes(q)
      );
    }

    // Genre
    if (filters.genre) {
      result = result.filter((book) => book.genre === filters.genre);
    }

    // Rating
    if (filters.rating) {
      const minRating = parseFloat(filters.rating);
      result = result.filter((book) => book.rating >= minRating);
    }

    // Century (stored in filters.year)
    if (filters.year) {
      result = result.filter((book) => getCenturyFromYear(book.publishedYear) === filters.year);
    }

    return sortBooks(result, sortBy);
  }, [books, searchQuery, filters, sortBy]);

  const pageSize = 12;
  const totalPages = Math.max(1, Math.ceil(filteredBooks.length / pageSize));

  useEffect(() => {
    // Reset to page 1 when filters/search changes
    setCurrentPage(1);
  }, [searchQuery, filters, sortBy]);

  useEffect(() => {
    // Ensure Preline dropdowns are (re)bound when pagination UI changes
    window.HSStaticMethods?.autoInit();
  }, [totalPages, currentPage]);

  useEffect(() => {
    loadBooks();
  }, []);

  const loadBooks = async () => {
    setIsLoading(true);
    try {
      const data = await getBooks();
      setBooks(data);
      // filteredBooks is derived now
    } catch (error) {
      handleApiError(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleSort = (value: string) => {
    setSortBy(value);
  };

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredBooks.length);
  const paginatedBooks = filteredBooks.slice(startIndex, endIndex);

  useEffect(() => {
    let isCancelled = false;

    const missingIds = paginatedBooks
      .map((b) => b.id)
      .filter((id) => typeof reviewAverageByBookId[id] === 'undefined');

    if (missingIds.length === 0) return;

    const loadAverages = async () => {
      try {
        const results = await Promise.allSettled(
          missingIds.map(async (id) => {
            const reviews = await getReviews(id).catch(() => []);
            const avg = averageRating(reviews.map((r) => r.rating));
            return { id, avg };
          })
        );

        if (isCancelled) return;

        setReviewAverageByBookId((prev) => {
          const next = { ...prev };
          for (const r of results) {
            if (r.status === 'fulfilled') {
              next[r.value.id] = r.value.avg;
            }
          }
          return next;
        });
      } catch {
        // Best-effort; per-book errors already handled.
      }
    };

    loadAverages();

    return () => {
      isCancelled = true;
    };
  }, [paginatedBooks, reviewAverageByBookId]);

  const setPageSafe = (page: number) => {
    const next = Math.min(Math.max(1, page), totalPages);
    setCurrentPage(next);
  };

  const buildHiddenPageGroups = (visiblePages: number[]) => {
    const groups: number[][] = [];
    for (let i = 0; i < visiblePages.length - 1; i++) {
      const a = visiblePages[i];
      const b = visiblePages[i + 1];
      if (b > a + 1) {
        const group: number[] = [];
        for (let p = a + 1; p <= b - 1; p++) group.push(p);
        groups.push(group);
      } else {
        groups.push([]);
      }
    }
    return groups;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="container mx-auto">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-5xl md:text-6xl font-extrabold mb-4">
            <span className="gradient-text">Book Catalog</span>
          </h1>
          <p className="text-slate-600 text-xl">
            Browse our collection of{' '}
            <span className="font-bold text-violet-600">{books.length}</span> amazing books
          </p>
        </div>

        {/* Search */}
        <div className="mb-8">
          <BookSearch
            onSearch={handleSearch}
            onFilterChange={setFilters}
            genres={uniqueGenres}
            centuries={uniqueCenturies}
            filters={filters}
          />
        </div>

        {/* Filters & Sort */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div className="glass-effect px-4 py-2 rounded-xl border border-white/20">
            <p className="text-slate-700 font-semibold">
              {filteredBooks.length === 0 ? (
                <>
                  Showing <span className="text-violet-600">0</span> books
                </>
              ) : (
                <>
                  Showing{' '}
                  <span className="text-violet-600">
                    {filteredBooks.length > 0 ? startIndex + 1 : 0}-{endIndex}
                  </span>{' '}
                  of <span className="text-violet-600">{filteredBooks.length}</span>{' '}
                  {filteredBooks.length === 1 ? 'book' : 'books'}
                </>
              )}
            </p>
          </div>

          {/* TODO: Implement sort logic */}
          <div className="flex items-center gap-3">
            <label className="text-sm text-slate-700 font-semibold">Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => handleSort(e.target.value)}
              className="input-modern px-4 py-2.5 text-sm font-medium"
            >
              <option value="title">Title</option>
              <option value="author">Author</option>
              <option value="rating">Rating</option>
              <option value="year">Year</option>
            </select>
          </div>
        </div>

        {/* Book Grid */}
        <BookGrid books={paginatedBooks} reviewAverageByBookId={reviewAverageByBookId} />

        {/* Pagination (10 books per page) */}
        {filteredBooks.length > pageSize && (
          <div className="mt-12 flex justify-center">
            <div className="glass-effect px-4 py-3 rounded-2xl border border-white/20">
              <nav className="flex items-center gap-x-1" aria-label="Pagination">
                {/* Previous */}
                <button
                  type="button"
                  onClick={() => setPageSafe(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="inline-flex items-center justify-center size-10 rounded-xl border border-slate-200 bg-white/70 text-slate-700 hover:bg-white disabled:opacity-50 disabled:pointer-events-none transition"
                  aria-label="Previous page"
                >
                  <svg
                    className="size-4"
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    fill="currentColor"
                    viewBox="0 0 16 16"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z"
                    />
                  </svg>
                </button>

                {/* Page buttons + dropdown gaps (Preline "More with Dropdown") */}
                {(() => {
                  const visiblePages =
                    totalPages <= 7
                      ? Array.from({ length: totalPages }, (_, i) => i + 1)
                      : (() => {
                          const pageSet = new Set<number>();
                          pageSet.add(1);
                          pageSet.add(totalPages);
                          pageSet.add(currentPage);
                          pageSet.add(currentPage - 1);
                          pageSet.add(currentPage + 1);

                          return Array.from(pageSet)
                            .filter((p) => p >= 1 && p <= totalPages)
                            .sort((a, b) => a - b);
                        })();

                  const gapGroups = buildHiddenPageGroups(visiblePages);

                  const renderPageButton = (page: number) => {
                    const isActive = page === currentPage;
                    return (
                      <button
                        key={`page-${page}`}
                        type="button"
                        onClick={() => setPageSafe(page)}
                        aria-current={isActive ? 'page' : undefined}
                        className={[
                          'inline-flex items-center justify-center size-10 rounded-xl border transition font-semibold text-sm',
                          isActive
                            ? 'bg-linear-to-r from-violet-600 to-indigo-600 text-white border-transparent shadow-glow'
                            : 'border-slate-200 bg-white/70 text-slate-700 hover:bg-white',
                        ].join(' ')}
                      >
                        {page}
                      </button>
                    );
                  };

                  const renderGapDropdown = (pages: number[], gapIndex: number) => {
                    if (pages.length === 0) return null;
                    const dropdownId = `books-pagination-more-${gapIndex}`;

                    return (
                      <div key={`gap-${gapIndex}`} className="hs-dropdown relative inline-flex">
                        <button
                          id={dropdownId}
                          type="button"
                          className="hs-dropdown-toggle inline-flex items-center justify-center size-10 rounded-xl border border-slate-200 bg-white/70 text-slate-700 hover:bg-white transition"
                          aria-label="More pages"
                        >
                          <span className="text-lg leading-none">…</span>
                          <svg
                            className="hs-dropdown-open:rotate-180 ms-1 size-3 transition-transform"
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            fill="currentColor"
                            viewBox="0 0 16 16"
                            aria-hidden="true"
                          >
                            <path d="M1.5 5.5l6 6 6-6" />
                          </svg>
                        </button>

                        <div
                          className="hs-dropdown-menu transition-[opacity,margin] duration-200 hs-dropdown-open:opacity-100 opacity-0 hidden min-w-32 bg-white shadow-xl rounded-xl p-2 mt-2 border border-slate-200"
                          aria-labelledby={dropdownId}
                        >
                          {pages.map((p) => (
                            <button
                              key={`gap-page-${p}`}
                              type="button"
                              onClick={() => setPageSafe(p)}
                              className={[
                                'w-full text-left flex items-center justify-between gap-x-3 py-2 px-3 rounded-lg text-sm font-medium transition',
                                p === currentPage
                                  ? 'bg-violet-50 text-violet-700'
                                  : 'text-slate-700 hover:bg-slate-100',
                              ].join(' ')}
                            >
                              <span>Page {p}</span>
                              {p === currentPage && <span className="text-xs">Current</span>}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  };

                  const parts: ReactElement[] = [];
                  for (let i = 0; i < visiblePages.length; i++) {
                    parts.push(renderPageButton(visiblePages[i]));
                    if (i < visiblePages.length - 1) {
                      const gapEl = renderGapDropdown(gapGroups[i] ?? [], i);
                      if (gapEl) parts.push(gapEl);
                    }
                  }
                  return parts;
                })()}

                {/* Next */}
                <button
                  type="button"
                  onClick={() => setPageSafe(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center justify-center size-10 rounded-xl border border-slate-200 bg-white/70 text-slate-700 hover:bg-white disabled:opacity-50 disabled:pointer-events-none transition"
                  aria-label="Next page"
                >
                  <svg
                    className="size-4"
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    fill="currentColor"
                    viewBox="0 0 16 16"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"
                    />
                  </svg>
                </button>
              </nav>

              <div className="mt-2 text-center text-xs text-slate-600 font-medium">
                Page <span className="text-slate-900">{currentPage}</span> of{' '}
                <span className="text-slate-900">{totalPages}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
