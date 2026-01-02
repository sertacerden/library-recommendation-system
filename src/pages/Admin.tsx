import { useState, useEffect } from 'react';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { CoverImageUpload } from '@/components/common/CoverImageUpload';
import { getBooks, createBook, updateBook, deleteBook } from '@/services/api';
import { Book } from '@/types';
import { handleApiError, showSuccess } from '@/utils/errorHandling';

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
    rating: 0,
    publishedYear: new Date().getFullYear(),
    isbn: '',
  });

  const [editBook, setEditBook] = useState<Book | null>(null);

  useEffect(() => {
    loadBooks();
  }, []);

  useEffect(() => {
    // Initialize Preline components
    window.HSStaticMethods?.autoInit();
  }, [books]);

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

  useEffect(() => {
    setCurrentPage((prev) => Math.min(Math.max(prev, 1), totalPages));
  }, [totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [titleSearch]);

  const getVisiblePages = (): Array<number | '...'> => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: Array<number | '...'> = [];
    const left = Math.max(2, clampedCurrentPage - 1);
    const right = Math.min(totalPages - 1, clampedCurrentPage + 1);

    pages.push(1);
    if (left > 2) pages.push('...');
    for (let p = left; p <= right; p++) pages.push(p);
    if (right < totalPages - 1) pages.push('...');
    pages.push(totalPages);

    return pages;
  };

  const loadBooks = async () => {
    setIsLoading(true);
    try {
      const data = await getBooks();
      setBooks(data);
    } catch (error) {
      handleApiError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const openAddBookOffcanvas = () => {
    // Rely on data attribute for opening, or programmatic if needed
    // But we need to reset form state
    setNewBook({
      title: '',
      author: '',
      genre: '',
      description: '',
      coverImage: '',
      rating: 0,
      publishedYear: new Date().getFullYear(),
      isbn: '',
    });
    setAddCoverUploadReset((prev) => prev + 1);
  };

  const closeAddBookOffcanvas = () => {
    window.HSOverlay?.close('#add-book-offcanvas');
  };

  const openEditBookOffcanvas = (book: Book) => {
    setEditBook(book);
    setEditCoverUploadReset((prev) => prev + 1);
  };

  const closeEditBookOffcanvas = () => {
    window.HSOverlay?.close('#edit-book-offcanvas');
  };

  const handleCreateBook = async () => {
    if (!newBook.title || !newBook.author) {
      alert('Please fill in required fields');
      return;
    }

    try {
      const created = await createBook(newBook);
      const nextBooks = [...books, created];
      setBooks(nextBooks);
      const nextFiltered = filterBooksByTitle(nextBooks, titleSearch);
      setCurrentPage(Math.max(1, Math.ceil(nextFiltered.length / BOOKS_PER_PAGE)));
      closeAddBookOffcanvas();
      showSuccess('Book added successfully!');
    } catch (error) {
      handleApiError(error);
    }
  };

  const handleUpdateBook = async () => {
    if (!editBook || !editBook.title || !editBook.author) {
      alert('Please fill in required fields');
      return;
    }

    try {
      const updated = await updateBook(editBook.id, editBook);
      setBooks(books.map((b) => (b.id === updated.id ? updated : b)));

      closeEditBookOffcanvas();
      // Delay clearing state to allow offcanvas close animation to finish
      setTimeout(() => {
        setEditBook(null);
      }, 300);
      showSuccess('Book updated successfully!');
    } catch (error) {
      console.error(error); // Log detailed error
      handleApiError(error);
    }
  };

  const handleDeleteBook = async (id: string) => {
    if (!confirm('Are you sure you want to delete this book?')) {
      return;
    }

    try {
      await deleteBook(id);
      setBooks(books.filter((book) => book.id !== id));
      showSuccess('Book deleted successfully!');
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

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="container mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-2">Admin Dashboard</h1>
          <p className="text-slate-600 text-lg">Manage books and view system metrics</p>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
            <h3 className="text-lg font-semibold mb-2 opacity-90">Total Books</h3>
            <p className="text-5xl font-bold">{books.length}</p>
          </div>
          <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-lg p-6 text-white">
            <h3 className="text-lg font-semibold mb-2 opacity-90">Total Users</h3>
            <p className="text-5xl font-bold">42</p>
            <p className="text-sm mt-1 opacity-75">Placeholder data</p>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
            <h3 className="text-lg font-semibold mb-2 opacity-90">Active Reading Lists</h3>
            <p className="text-5xl font-bold">18</p>
            <p className="text-sm mt-1 opacity-75">Placeholder data</p>
          </div>
        </div>

        {/* Books Management */}
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-slate-900">Manage Books</h2>
            <Button
              variant="primary"
              onClick={openAddBookOffcanvas}
              data-hs-overlay="#add-book-offcanvas"
            >
              Add New Book
            </Button>
          </div>

          <div className="max-w-md">
            <Input
              label="Search by title"
              type="text"
              value={titleSearch}
              onChange={(e) => setTitleSearch(e.target.value)}
              placeholder="Type a book title..."
            />
          </div>

          <div className="overflow-x-auto">
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
                      <td className="py-3 px-4">{book.title}</td>
                      <td className="py-3 px-4">{book.author}</td>
                      <td className="py-3 px-4">{book.genre}</td>
                      <td className="py-3 px-4">{book.rating}</td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => openEditBookOffcanvas(book)}
                            data-hs-overlay="#edit-book-offcanvas"
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

          {/* Pagination */}
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

              {getVisiblePages().map((p, idx) =>
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
                    onClick={() => setCurrentPage(p)}
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
        </div>

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
              className="flex justify-center items-center size-7 text-sm font-semibold rounded-full border border-transparent text-gray-800 hover:bg-gray-100 disabled:opacity-50 disabled:pointer-events-none"
              onClick={closeAddBookOffcanvas}
            >
              <span className="sr-only">Close modal</span>
              <svg
                className="shrink-0 size-4"
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6 6 18"></path>
                <path d="m6 6 18 18"></path>
              </svg>
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
              label="Rating (0-5)"
              type="number"
              min="0"
              max="5"
              step="0.1"
              value={newBook.rating}
              onChange={(e) => setNewBook({ ...newBook, rating: parseFloat(e.target.value) })}
            />

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
          className="hs-overlay hidden fixed top-0 end-0 transition-all duration-200 transform h-full max-w-md w-full z-80 bg-white dark:bg-white border-s border-gray-200"
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
              className="flex justify-center items-center size-7 text-sm font-semibold rounded-full border border-transparent text-gray-800 hover:bg-gray-100 disabled:opacity-50 disabled:pointer-events-none"
              onClick={closeEditBookOffcanvas}
            >
              <span className="sr-only">Close modal</span>
              <svg
                className="shrink-0 size-4"
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6 6 18"></path>
                <path d="m6 6 18 18"></path>
              </svg>
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

                <CoverImageUpload
                  label="Cover Image"
                  value={editBook.coverImage || ''}
                  resetSignal={editCoverUploadReset}
                  onChange={(nextValue) => setEditBook({ ...editBook, coverImage: nextValue })}
                />

                <Input
                  label="Rating"
                  type="number"
                  min="0"
                  max="5"
                  step="0.1"
                  value={editBook.rating}
                  onChange={(e) => setEditBook({ ...editBook, rating: parseFloat(e.target.value) })}
                />

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
