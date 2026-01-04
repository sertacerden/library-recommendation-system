import { useState, useEffect } from 'react';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import {
  createReadingList,
  deleteReadingList,
  getBooks,
  getReadingLists,
  updateReadingList,
} from '@/services/api';
import type { Book, ReadingList } from '@/types';
import { formatDate } from '@/utils/formatters';
import { handleApiError, showSuccess } from '@/utils/errorHandling';
import { SearchableMultiSelect } from '@/components/common/SearchableMultiSelect';

/**
 * ReadingLists page component
 */
export function ReadingLists() {
  const [lists, setLists] = useState<ReadingList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');
  const [newListBookIds, setNewListBookIds] = useState<string[]>([]);

  const [editListId, setEditListId] = useState<string | null>(null);
  const [editListName, setEditListName] = useState('');
  const [editListDescription, setEditListDescription] = useState('');
  const [editListBookIds, setEditListBookIds] = useState<string[]>([]);

  const [books, setBooks] = useState<Book[]>([]);
  const [isBooksLoading, setIsBooksLoading] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    loadLists();
  }, []);

  useEffect(() => {
    // Re-init Preline components when lists change or on mount
    window.HSStaticMethods?.autoInit();
  }, [lists]);

  // Reload lists when other parts of the app modify reading lists
  useEffect(() => {
    const handler = () => {
      loadLists();
    };
    window.addEventListener('reading-lists-changed', handler);
    return () => window.removeEventListener('reading-lists-changed', handler);
  }, []);

  const loadLists = async () => {
    setIsLoading(true);
    try {
      const data = await getReadingLists();
      setLists(data);
    } catch (error) {
      handleApiError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateList = async () => {
    if (!newListName.trim()) {
      alert('Please enter a list name');
      return;
    }

    try {
      const uniqueBookIds = Array.from(new Set(newListBookIds));
      const newList = await createReadingList({
        name: newListName,
        description: newListDescription,
        bookIds: uniqueBookIds,
      });
      setLists([...lists, newList]);
      closeCreateListModal();
      setNewListName('');
      setNewListDescription('');
      setNewListBookIds([]);
      showSuccess('Reading list created successfully!');
    } catch (error) {
      handleApiError(error);
    }
  };

  const openEditModal = async (list: ReadingList) => {
    setEditListId(list.id);
    setEditListName(list.name);
    setEditListDescription(list.description ?? '');
    setEditListBookIds(list.bookIds || []);
    // Offcanvas is opened via data attributes on the button

    if (books.length === 0 && !isBooksLoading) {
      await loadBooks();
    }
  };

  const closeEditModal = () => {
    // Close offcanvas programmatically
    window.HSOverlay?.close('#edit-reading-list-offcanvas');
  };

  const handleUpdateList = async () => {
    if (!editListId) return;
    if (!editListName.trim()) {
      alert('Please enter a list name');
      return;
    }

    try {
      const uniqueBookIds = Array.from(new Set(editListBookIds));
      const updated = await updateReadingList(editListId, {
        name: editListName.trim(),
        description: editListDescription,
        bookIds: uniqueBookIds,
      });
      setLists((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
      showSuccess('Reading list updated successfully!');
      closeEditModal();
    } catch (error) {
      handleApiError(error);
    }
  };

  const handleDeleteList = async (listId: string) => {
    if (!window.confirm('Are you sure you want to delete this reading list?')) {
      return;
    }

    try {
      await deleteReadingList(listId);
      setLists((prev) => prev.filter((l) => l.id !== listId));
      showSuccess('Reading list deleted successfully!');
    } catch (error) {
      handleApiError(error);
    }
  };

  const loadBooks = async () => {
    setIsBooksLoading(true);
    try {
      const data = await getBooks();
      setBooks(data);
    } catch (error) {
      handleApiError(error);
    } finally {
      setIsBooksLoading(false);
    }
  };

  const openCreateListModal = async () => {
    setNewListName('');
    setNewListDescription('');
    setNewListBookIds([]);

    if (books.length === 0 && !isBooksLoading) {
      await loadBooks();
    }
  };

  const closeCreateListModal = () => {
    window.HSOverlay?.close('#create-reading-list-offcanvas');
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
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-2">My Reading Lists</h1>
            <p className="text-slate-600 text-lg">Organize your books into custom lists</p>
          </div>
          <Button
            variant="primary"
            size="lg"
            onClick={openCreateListModal}
            data-hs-overlay="#create-reading-list-offcanvas"
          >
            Create New List
          </Button>
        </div>

        {lists.length === 0 ? (
          <div className="text-center py-12 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200">
            <svg
              className="w-16 h-16 text-slate-400 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <h3 className="text-xl font-bold text-slate-900 mb-2">No reading lists yet</h3>
            <p className="text-slate-600 mb-4">
              Create your first list to start organizing your books
            </p>
            <Button
              variant="primary"
              onClick={openCreateListModal}
              data-hs-overlay="#create-reading-list-offcanvas"
            >
              Create Your First List
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {lists.map((list) => (
              <div
                key={list.id}
                className="bg-white/90 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-xl hover:border-blue-300 transition-all duration-300"
              >
                <h3 className="text-xl font-bold text-slate-900 mb-2">{list.name}</h3>
                <p className="text-slate-600 mb-4 line-clamp-2">{list.description}</p>
                <div className="flex items-center justify-between text-sm text-slate-500 mb-4">
                  <span>{list.bookIds.length} books</span>
                  <span>Created {formatDate(list.createdAt)}</span>
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="secondary"
                    onClick={() => openEditModal(list)}
                    className="flex-1"
                    data-hs-overlay="#edit-reading-list-offcanvas"
                  >
                    Edit
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => handleDeleteList(list.id)}
                    className="flex-1 bg-red-50! text-red-600! hover:bg-red-100! hover:border-red-200!"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Offcanvas */}
        <div
          id="create-reading-list-offcanvas"
          className="hs-overlay hidden fixed top-0 end-0 transition-all duration-200 transform h-full max-w-md w-full z-80 bg-white dark:bg-white border-s border-gray-200"
          style={{ backgroundColor: 'white', zIndex: 80 }}
          tabIndex={-1}
          data-hs-overlay-options='{
            "bodyScroll": true,
            "backdrop": true
          }'
        >
          <div className="flex justify-between items-center py-3 px-4 border-b border-gray-200">
            <h3 className="font-bold text-gray-800">Create New Reading List</h3>
            <button
              type="button"
              className="px-3 py-1 text-sm font-semibold text-gray-800 hover:bg-gray-100 rounded-lg transition-all active:scale-95"
              onClick={closeCreateListModal}
            >
              Close
            </button>
          </div>
          <div className="p-4 space-y-4">
            <Input
              label="List Name"
              type="text"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="e.g., Summer Reading 2024"
              required
            />

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <textarea
                value={newListDescription}
                onChange={(e) => setNewListDescription(e.target.value)}
                placeholder="What's this list about?"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[100px] resize-none"
              />
            </div>

            <div>
              <SearchableMultiSelect
                label="Books (optional)"
                options={books.map((b) => ({
                  value: b.id,
                  label: b.title,
                  description: b.author,
                }))}
                selectedValues={newListBookIds}
                onChange={setNewListBookIds}
                pageSize={10}
                placeholder={isBooksLoading ? 'Loading books…' : 'Search books…'}
                disabled={isBooksLoading || books.length === 0}
              />
              <p className="mt-2 text-sm text-slate-600">
                Selected: <span className="font-medium">{newListBookIds.length}</span>
              </p>
              {books.length === 0 ? (
                <p className="mt-1 text-sm text-slate-500">
                  {isBooksLoading ? 'Loading books…' : 'No books available'}
                </p>
              ) : null}
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="primary" onClick={handleCreateList} className="flex-1">
                Create List
              </Button>
              <Button variant="secondary" onClick={closeCreateListModal} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </div>

        {/* Edit Offcanvas */}
        <div
          id="edit-reading-list-offcanvas"
          className="hs-overlay hidden fixed top-0 end-0 transition-all duration-200 transform h-full max-w-md w-full z-80 bg-white dark:bg-white border-s border-gray-200"
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
              onClick={closeEditModal}
            >
              Close
            </button>
          </div>
          <div className="p-4 space-y-4">
            <Input
              label="List Name"
              type="text"
              value={editListName}
              onChange={(e) => setEditListName(e.target.value)}
              placeholder="e.g., Summer Reading 2024"
              required
            />

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <textarea
                value={editListDescription}
                onChange={(e) => setEditListDescription(e.target.value)}
                placeholder="What's this list about?"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[100px] resize-none"
              />
            </div>

            <div>
              <SearchableMultiSelect
                label="Books"
                options={books.map((b) => ({
                  value: b.id,
                  label: b.title,
                  description: b.author,
                }))}
                selectedValues={editListBookIds}
                onChange={setEditListBookIds}
                pageSize={10}
                placeholder={isBooksLoading ? 'Loading books…' : 'Search books…'}
                disabled={isBooksLoading || books.length === 0}
              />
              <p className="mt-2 text-sm text-slate-600">
                Selected: <span className="font-medium">{editListBookIds.length}</span>
              </p>
              {books.length === 0 ? (
                <p className="mt-1 text-sm text-slate-500">
                  {isBooksLoading ? 'Loading books…' : 'No books available'}
                </p>
              ) : null}
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="primary"
                onClick={handleUpdateList}
                className="flex-1"
                disabled={!editListId}
              >
                Save Changes
              </Button>
              <Button variant="secondary" onClick={closeEditModal} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
