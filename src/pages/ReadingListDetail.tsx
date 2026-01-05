import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { SearchableMultiSelect } from '@/components/common/SearchableMultiSelect';
import { deleteReadingList, getBooks, getReadingList, updateReadingList } from '@/services/api';
import type { Book, ReadingList } from '@/types';
import { handleApiError, showSuccess } from '@/utils/errorHandling';
import { confirmPopup } from '@/utils/confirm';

/**
 * ReadingListDetail page component
 */
export function ReadingListDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const BOOKS_PER_PAGE = 10;

  const [list, setList] = useState<ReadingList | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [titleSearch, setTitleSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [isSavingProgress, setIsSavingProgress] = useState(false);

  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editBookIds, setEditBookIds] = useState<string[]>([]);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    void load(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const load = async (listId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const rl = await getReadingList(listId);
      if (!rl) {
        navigate('/404');
        return;
      }
      setList(rl);
      setCompletedIds(new Set(Array.isArray(rl.completedBookIds) ? rl.completedBookIds : []));

      // Fetch all books once, then filter by this list's bookIds
      const allBooks = await getBooks();
      setBooks(allBooks);
    } catch (e) {
      handleApiError(e);
      setError(e instanceof Error ? e.message : 'Failed to load reading list');
    } finally {
      setIsLoading(false);
    }
  };

  const listBooks = useMemo(() => {
    if (!list) return [];
    const idSet = new Set(list.bookIds || []);
    return books.filter((b) => idSet.has(b.id));
  }, [books, list]);

  const orderedBooks = useMemo(() => {
    // order_by=readed: unread first, then read; secondary sort by title for stability.
    const next = [...listBooks];
    next.sort((a, b) => {
      const aDone = completedIds.has(a.id) ? 1 : 0;
      const bDone = completedIds.has(b.id) ? 1 : 0;
      if (aDone !== bDone) return aDone - bDone; // unread (0) first
      return a.title.localeCompare(b.title);
    });
    return next;
  }, [completedIds, listBooks]);

  const filteredBooks = useMemo(() => {
    const q = titleSearch.trim().toLowerCase();
    if (!q) return orderedBooks;
    return orderedBooks.filter((b) => b.title.toLowerCase().includes(q));
  }, [orderedBooks, titleSearch]);

  const totalPages = Math.max(1, Math.ceil(filteredBooks.length / BOOKS_PER_PAGE));
  const clampedCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);
  const pageStartIndex = (clampedCurrentPage - 1) * BOOKS_PER_PAGE;
  const pageEndIndex = Math.min(pageStartIndex + BOOKS_PER_PAGE, filteredBooks.length);
  const paginatedBooks = filteredBooks.slice(pageStartIndex, pageEndIndex);

  const openEdit = () => {
    if (!list) return;
    setEditName(list.name || '');
    setEditDescription(list.description || '');
    setEditBookIds(Array.isArray(list.bookIds) ? list.bookIds : []);
    window.HSStaticMethods?.autoInit();
    queueMicrotask(() => {
      if (!window.HSOverlay?.open) {
        console.warn('HSOverlay is not available. Is Preline initialized?');
        return;
      }
      window.HSOverlay.open('#edit-reading-list-detail-offcanvas');
    });
  };

  const closeEdit = () => {
    window.HSOverlay?.close('#edit-reading-list-detail-offcanvas');
  };

  const handleSaveEdit = async () => {
    if (!id || !list) return;
    const nextName = editName.trim();
    if (!nextName) {
      setError('Please enter a list name.');
      return;
    }
    const nextBookIds = Array.from(new Set(editBookIds));
    const nextCompleted = Array.from(completedIds).filter((bid) => nextBookIds.includes(bid));

    setIsSavingEdit(true);
    setError(null);
    try {
      const updated = await updateReadingList(id, {
        name: nextName,
        description: editDescription,
        bookIds: nextBookIds,
        completedBookIds: nextCompleted,
      });
      setList(updated);
      setCompletedIds(new Set(updated.completedBookIds ?? []));
      closeEdit();
    } catch (e) {
      handleApiError(e);
      setError(e instanceof Error ? e.message : 'Failed to update reading list');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;

    const ok = await confirmPopup({
      title: 'Delete reading list?',
      message: 'Are you sure you want to delete this reading list?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger',
    });
    if (!ok) return;

    setIsDeleting(true);
    setError(null);
    try {
      await deleteReadingList(id);
      window.dispatchEvent(new Event('reading-lists-changed'));
      showSuccess('Reading list deleted successfully!');
      navigate('/reading-lists', { replace: true });
    } catch (e) {
      handleApiError(e);
      setError(e instanceof Error ? e.message : 'Failed to delete reading list');
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleCompleted = async (bookId: string) => {
    if (!id || !list) return;

    const next = new Set(completedIds);
    if (next.has(bookId)) next.delete(bookId);
    else next.add(bookId);

    setCompletedIds(next);
    // Keep list in sync locally
    setList({ ...list, completedBookIds: Array.from(next) });

    setIsSavingProgress(true);
    try {
      await updateReadingList(id, { completedBookIds: Array.from(next) });
    } catch (e) {
      // Revert on failure
      handleApiError(e);
      setError(e instanceof Error ? e.message : 'Failed to save progress');
      setCompletedIds(new Set(Array.isArray(list.completedBookIds) ? list.completedBookIds : []));
      setList(list);
    } finally {
      setIsSavingProgress(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!list) return null;

  return (
    <div className="min-h-screen py-10 px-4">
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="font-semibold">Back</span>
        </button>

        <div className="glass-effect rounded-3xl shadow-2xl border border-white/20 overflow-hidden p-8 md:p-12">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div className="min-w-0">
              <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-3 leading-tight">
                {list.name}
              </h1>
              <p className="text-slate-600 text-lg leading-relaxed">
                {list.description || 'No description'}
              </p>
              <div className="mt-6 text-sm text-slate-600">
                <span className="font-semibold">Books:</span> {list.bookIds.length}
              </div>
            </div>
            <div className="flex flex-col gap-3 w-full md:w-56">
              <Button
                variant="outline"
                onClick={() => navigate('/reading-lists')}
                className="w-full justify-center whitespace-nowrap"
              >
                View All Lists
              </Button>
              <Button
                variant="secondary"
                onClick={openEdit}
                data-hs-overlay="#edit-reading-list-detail-offcanvas"
                className="w-full justify-center whitespace-nowrap"
              >
                Edit Reading List
              </Button>
              <Button
                variant="danger"
                onClick={handleDelete}
                className="w-full justify-center whitespace-nowrap"
                disabled={isDeleting || isSavingEdit}
              >
                {isDeleting ? 'Deleting…' : 'Delete Reading List'}
              </Button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-6 p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 font-medium">
            {error}
          </div>
        )}

        <div className="mt-8 glass-effect rounded-3xl shadow-xl border border-white/20 p-8 md:p-12">
          <h2 className="text-3xl font-bold text-slate-900 mb-6 flex items-center">
            <span className="w-1 h-8 bg-linear-to-b from-violet-600 to-indigo-600 rounded-full mr-3"></span>
            Books in this list
          </h2>

          <div className="max-w-md">
            <Input
              label="Search by title"
              type="text"
              value={titleSearch}
              onChange={(e) => {
                setTitleSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Type a book title..."
            />
          </div>

          <div className="overflow-x-auto mt-4">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 w-10">Readed</th>
                  <th className="text-left py-3 px-4">Title</th>
                  <th className="text-left py-3 px-4">Author</th>
                  <th className="text-left py-3 px-4">Genre</th>
                  <th className="text-left py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedBooks.length === 0 ? (
                  <tr>
                    <td className="py-6 px-4 text-slate-600 text-center" colSpan={6}>
                      {titleSearch.trim() ? 'No books match that title' : 'No books in this list'}
                    </td>
                  </tr>
                ) : (
                  paginatedBooks.map((book) => (
                    <tr
                      key={book.id}
                      className={`border-b hover:bg-slate-50 ${
                        completedIds.has(book.id) ? 'opacity-60' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-violet-600"
                          checked={completedIds.has(book.id)}
                          onChange={() => toggleCompleted(book.id)}
                          aria-label={`Mark ${book.title} as completed`}
                        />
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`font-medium ${
                            completedIds.has(book.id)
                              ? 'text-slate-500 line-through'
                              : 'text-slate-900'
                          }`}
                        >
                          {book.title}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={completedIds.has(book.id) ? 'text-slate-500 line-through' : ''}>
                          {book.author}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={completedIds.has(book.id) ? 'text-slate-500 line-through' : ''}>
                          {book.genre}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => navigate(`/books/${book.id}`)}
                        >
                          View Details
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <p className="text-sm text-slate-600">
              {filteredBooks.length === 0
                ? 'Showing 0 of 0'
                : `Showing ${pageStartIndex + 1}-${pageEndIndex} of ${filteredBooks.length}`}
            </p>
            <p className="text-sm text-slate-500">
              {isSavingProgress ? 'Saving…' : ''}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={clampedCurrentPage === 1}
                onClick={() => setCurrentPage(clampedCurrentPage - 1)}
              >
                Prev
              </Button>
              <span className="text-sm text-slate-600 px-2">
                Page {clampedCurrentPage} / {totalPages}
              </span>
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
        </div>
      </div>

      {/* Edit Offcanvas (Preline overlay) */}
      <div
        id="edit-reading-list-detail-offcanvas"
        className="hs-overlay hidden fixed top-0 end-0 transition-all duration-200 transform h-full max-w-md w-full z-80 bg-white border-s border-gray-200"
        style={{ backgroundColor: 'white', zIndex: 80 }}
        tabIndex={-1}
        data-hs-overlay-options='{
          "bodyScroll": true,
          "backdrop": true
        }'
      >
        <div className="flex justify-between items-center py-3 px-4 border-b border-gray-200">
          <h3 className="font-bold text-gray-800">Edit Reading List</h3>
          <button
            type="button"
            className="px-3 py-1 text-sm font-semibold text-gray-800 hover:bg-gray-100 rounded-lg transition-all active:scale-95"
            onClick={closeEdit}
          >
            Close
          </button>
        </div>

        <div className="p-4 space-y-4">
          <Input
            label="List Name"
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="e.g., Favorites"
            required
          />

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Description</label>
            <textarea
              className="input-modern min-h-[110px] resize-none"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="What’s this list about?"
            />
          </div>

          <SearchableMultiSelect
            label="Books"
            options={books.map((b) => ({
              value: b.id,
              label: b.title,
              description: b.author,
            }))}
            selectedValues={editBookIds}
            onChange={setEditBookIds}
            pageSize={10}
            placeholder={books.length === 0 ? 'No books available' : 'Search books…'}
            disabled={books.length === 0}
          />

          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={closeEdit}
              className="flex-1 justify-center whitespace-nowrap"
              disabled={isSavingEdit}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveEdit}
              className="flex-1 justify-center whitespace-nowrap"
              disabled={isSavingEdit}
            >
              {isSavingEdit ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}


