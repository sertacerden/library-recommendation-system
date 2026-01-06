import { Book, ReadingList, Review, Recommendation, User } from '@/types';
import { fetchAuthSession } from 'aws-amplify/auth';

async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    const session = await fetchAuthSession();
    // Token selection can vary by API Gateway authorizer type:
    // - Many Cognito User Pool authorizers (REST API) expect an ID token.
    // - Some JWT authorizers (HTTP API) validate `aud`, which is typically present on ID tokens,
    //   while access tokens often use `client_id` instead.
    //
    // Configure via Vite env:
    // - VITE_AUTH_TOKEN_TYPE=id (default)      -> use idToken
    // - VITE_AUTH_TOKEN_TYPE=access           -> use accessToken
    const tokenType = (import.meta.env.VITE_AUTH_TOKEN_TYPE || 'id').toLowerCase();
    const token =
      tokenType === 'access'
        ? (session.tokens?.accessToken?.toString() ?? session.tokens?.idToken?.toString())
        : (session.tokens?.idToken?.toString() ?? session.tokens?.accessToken?.toString());
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      // Some API Gateway authorizers expect a raw JWT, others expect `Bearer <jwt>`.
      // Configure via Vite env:
      // - VITE_AUTH_HEADER_MODE=bearer (default) -> "Authorization: Bearer <token>"
      // - VITE_AUTH_HEADER_MODE=raw           -> "Authorization: <token>"
      const mode = (import.meta.env.VITE_AUTH_HEADER_MODE || 'bearer').toLowerCase();
      headers.Authorization = mode === 'raw' ? token : `Bearer ${token}`;
    }
    return headers;
  } catch {
    return {
      'Content-Type': 'application/json',
    };
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

type PaginatedResult<T> = { items: T[]; nextToken?: string };

function parseJsonBodyIfNeeded(data: unknown): unknown {
  if (isObject(data) && typeof data.body === 'string') {
    try {
      return JSON.parse(data.body);
    } catch {
      return data.body;
    }
  }
  return data;
}

function parsePaginatedItems<T>(payload: unknown): PaginatedResult<T> | null {
  if (!isObject(payload)) return null;
  const itemsRaw = payload.items;
  if (!Array.isArray(itemsRaw)) return null;
  const nextTokenRaw = payload.nextToken;
  return {
    items: itemsRaw as T[],
    ...(typeof nextTokenRaw === 'string' && nextTokenRaw.trim() ? { nextToken: nextTokenRaw } : {}),
  };
}

async function getBooksPage(
  options: { limit?: number; nextToken?: string } = {}
): Promise<PaginatedResult<Book>> {
  const params = new URLSearchParams();
  if (options.limit) params.append('limit', options.limit.toString());
  if (options.nextToken) params.append('nextToken', options.nextToken);

  const url =
    params.size > 0 ? `${API_BASE_URL}/books?${params.toString()}` : `${API_BASE_URL}/books`;

  const response = await fetch(url);
  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`Failed to fetch books: ${response.status} ${response.statusText}. ${errorText}`);
  }

  const data = await response.json();
  const payload = parseJsonBodyIfNeeded(data);

  // Back-compat: some implementations return a bare array of books
  if (Array.isArray(payload)) {
    return { items: payload as Book[] };
  }

  // Preferred: { items: [...], nextToken?: string }
  const paginated = parsePaginatedItems<Book>(payload);
  if (paginated) return paginated;

  return { items: [] };
}

export async function getBooks(): Promise<Book[]> {
  try {
    // DynamoDB Scan/Query returns max ~1MB per request.
    // If the backend supports pagination via nextToken, fetch all pages.
    const items: Book[] = [];
    let nextToken: string | undefined = undefined;

    // Safety guard to avoid infinite loops on a bad backend token.
    for (let i = 0; i < 200; i++) {
      const page = await getBooksPage({ limit: 200, nextToken });
      items.push(...page.items);
      if (!page.nextToken) break;
      nextToken = page.nextToken;
    }

    return items;
  } catch (error) {
    // Handle network errors (Failed to fetch, CORS, etc.)
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(
        `Network error: Unable to connect to API at ${API_BASE_URL}. Please check your API configuration and ensure the server is running.`
      );
    }
    // Re-throw other errors as-is
    throw error;
  }
}
export async function getBook(id: string): Promise<Book | null> {
  const response = await fetch(`${API_BASE_URL}/books/${encodeURIComponent(id)}`);

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error('Failed to fetch book');
  }

  const data = await response.json();

  if (typeof data?.body === 'string') {
    return JSON.parse(data.body) as Book;
  }

  return data as Book;
}
export async function createBook(book: Omit<Book, 'id'>): Promise<Book> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/books`, {
      method: 'POST',
      headers,
      body: JSON.stringify(book),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(
        `Failed to create book: ${response.status} ${response.statusText}. ${errorText}`
      );
    }

    const data = await response.json();
    return isObject(data) && typeof data.body === 'string' ? JSON.parse(data.body) : data;
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(
        `Network error: Unable to connect to API at ${API_BASE_URL}. Original error: ${error.message}`
      );
    }
    throw error;
  }
}
export async function updateBook(id: string, book: Partial<Book>): Promise<Book> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/books/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(book),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(
        `Failed to update book: ${response.status} ${response.statusText}. ${errorText}`
      );
    }

    const data = await response.json();
    return isObject(data) && typeof data.body === 'string' ? JSON.parse(data.body) : data;
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(
        `Network error: Unable to connect to API at ${API_BASE_URL}. Original error: ${error.message}`
      );
    }
    throw error;
  }
}

export async function deleteBook(id: string): Promise<void> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/books/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(
        `Failed to delete book: ${response.status} ${response.statusText}. ${errorText}`
      );
    }
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(
        `Network error: Unable to connect to API at ${API_BASE_URL}. Original error: ${error.message}`
      );
    }
    throw error;
  }
}
export async function getRecommendations(query: string): Promise<Recommendation[]> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/recommendations`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(
        `Failed to get recommendations: ${response.status} ${response.statusText}. ${errorText}`
      );
    }

    const data = await response.json();
    const payload: unknown =
      isObject(data) && typeof data.body === 'string' ? JSON.parse(data.body) : data;

    if (!isObject(payload) || !Array.isArray(payload.recommendations)) {
      return [];
    }

    return payload.recommendations
      .map((rec): Recommendation | null => {
        if (!isObject(rec)) return null;
        const title = rec.title;
        const author = rec.author;
        const reason = rec.reason;
        const confidence = rec.confidence;

        if (
          typeof title !== 'string' ||
          typeof author !== 'string' ||
          typeof reason !== 'string' ||
          typeof confidence !== 'number'
        ) {
          return null;
        }

        return { title, author, reason, confidence };
      })
      .filter((rec): rec is Recommendation => rec !== null);
  } catch (error) {
    // Handle network errors (Failed to fetch, CORS, etc.)
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(
        `Network error: Unable to connect to API at ${API_BASE_URL}. Please check your API configuration and ensure the server is running.`
      );
    }
    throw error;
  }
}
export async function getReadingLists(): Promise<ReadingList[]> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/reading-lists`, { headers });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(
        `Failed to fetch reading lists: ${response.status} ${response.statusText}. ${errorText}`
      );
    }

    const data = await response.json();

    let itemsRaw: unknown = [];
    if (Array.isArray(data)) {
      itemsRaw = data;
    } else if (isObject(data) && typeof data.body === 'string') {
      itemsRaw = JSON.parse(data.body);
    }

    if (!Array.isArray(itemsRaw)) {
      return [];
    }

    return itemsRaw
      .map((item) => {
        if (!isObject(item)) return null;
        const bookIdsRaw = item.bookIds;
        const bookIds = Array.isArray(bookIdsRaw)
          ? bookIdsRaw.filter((id): id is string => typeof id === 'string')
          : [];
        const completedBookIdsRaw = item.completedBookIds;
        const completedBookIds = Array.isArray(completedBookIdsRaw)
          ? completedBookIdsRaw.filter((id): id is string => typeof id === 'string')
          : undefined;
        return {
          ...(item as unknown as ReadingList),
          bookIds,
          ...(completedBookIds ? { completedBookIds } : {}),
        };
      })
      .filter((item): item is ReadingList => item !== null);
  } catch (error) {
    // Handle network errors (Failed to fetch, CORS, etc.)
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(
        `Network error: Unable to connect to API at ${API_BASE_URL}. Please check your API configuration and ensure the server is running.`
      );
    }
    // Re-throw other errors as-is
    throw error;
  }
}

/**
 * Get a single reading list by id (for the current user)
 */
export async function getReadingList(id: string): Promise<ReadingList | null> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/reading-lists/${encodeURIComponent(id)}`, { headers });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(
        `Failed to fetch reading list: ${response.status} ${response.statusText}. ${errorText}`
      );
    }

    const data = await response.json();
    const payload: unknown = isObject(data) && typeof data.body === 'string' ? JSON.parse(data.body) : data;
    if (!isObject(payload)) {
      throw new Error('Invalid reading list response');
    }

    const bookIdsRaw = payload.bookIds;
    const bookIds = Array.isArray(bookIdsRaw)
      ? bookIdsRaw.filter((bookId): bookId is string => typeof bookId === 'string')
      : [];
    const completedBookIdsRaw = payload.completedBookIds;
    const completedBookIds = Array.isArray(completedBookIdsRaw)
      ? completedBookIdsRaw.filter((bookId): bookId is string => typeof bookId === 'string')
      : undefined;

    return {
      ...(payload as unknown as ReadingList),
      bookIds,
      ...(completedBookIds ? { completedBookIds } : {}),
    };
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(
        `Network error: Unable to connect to API at ${API_BASE_URL}. Please check your API configuration and ensure the server is running.`
      );
    }
    throw error;
  }
}

export async function createReadingList(
  list: Omit<ReadingList, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
): Promise<ReadingList> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/reading-lists`, {
      method: 'POST',
      headers,
      body: JSON.stringify(list),
    });
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(
        `Failed to create reading list: ${response.status} ${response.statusText}. ${errorText}`
      );
    }
    return response.json();
  } catch (error) {
    // Handle network errors (Failed to fetch, CORS, etc.)
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(
        `Network error: Unable to connect to API at ${API_BASE_URL}. Please check your API configuration and ensure the server is running.`
      );
    }
    // Re-throw other errors as-is
    throw error;
  }
}
export async function updateReadingList(
  id: string,
  list: Partial<Pick<ReadingList, 'name' | 'description' | 'bookIds' | 'completedBookIds'>>
): Promise<ReadingList> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/reading-lists/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        ...(list.name !== undefined ? { name: list.name } : {}),
        ...(list.description !== undefined ? { description: list.description } : {}),
        ...(list.bookIds !== undefined ? { bookIds: list.bookIds } : {}),
        ...(list.completedBookIds !== undefined ? { completedBookIds: list.completedBookIds } : {}),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(
        `Failed to update reading list: ${response.status} ${response.statusText}. ${errorText}`
      );
    }

    const data = await response.json();

    const itemRaw: unknown =
      isObject(data) && typeof data.body === 'string' ? JSON.parse(data.body) : data;
    if (!isObject(itemRaw)) {
      throw new Error('Invalid update reading list response');
    }

    const bookIdsRaw = itemRaw.bookIds;
    const bookIds = Array.isArray(bookIdsRaw)
      ? bookIdsRaw.filter((bookId): bookId is string => typeof bookId === 'string')
      : [];
    const completedBookIdsRaw = itemRaw.completedBookIds;
    const completedBookIds = Array.isArray(completedBookIdsRaw)
      ? completedBookIdsRaw.filter((bookId): bookId is string => typeof bookId === 'string')
      : undefined;

    return {
      ...(itemRaw as unknown as ReadingList),
      bookIds,
      ...(completedBookIds ? { completedBookIds } : {}),
    };
  } catch (error) {
    console.error('Update Reading List Error:', error);
    // Handle network errors (Failed to fetch, CORS, etc.)
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(
        `Network error: Unable to connect to API at ${API_BASE_URL}. Original error: ${error.message}`
      );
    }
    // Re-throw other errors as-is
    throw error;
  }
}

export async function deleteReadingList(id: string): Promise<void> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/reading-lists/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(
        `Failed to delete reading list: ${response.status} ${response.statusText}. ${errorText}`
      );
    }
  } catch (error) {
    console.error('Delete Reading List Error:', error);
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(
        `Network error: Unable to connect to API at ${API_BASE_URL}. Original error: ${error.message}`
      );
    }
    throw error;
  }
}

export async function getAllReviews(
  options: { limit?: number; nextToken?: string } = {}
): Promise<{ items: Review[]; nextToken?: string }> {
  try {
    const headers = await getAuthHeaders();
    const params = new URLSearchParams();
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.nextToken) params.append('nextToken', options.nextToken);

    const response = await fetch(`${API_BASE_URL}/admin/reviews?${params.toString()}`, {
      headers,
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(
        `Failed to fetch all reviews: ${response.status} ${response.statusText}. ${errorText}`
      );
    }

    const data = await response.json();
    // The lambda returns { items: [...], nextToken: ... }
    const itemsRaw = (data.items || []) as unknown[];
    const nextToken = data.nextToken as string | undefined;

    interface RawReviewItem {
      id?: string;
      reviewId?: string;
      bookId?: string;
      userId?: string;
      userName?: string;
      name?: string;
      userDisplayName?: string;
      rating?: number;
      comment?: string;
      createdAt?: string;
    }

    // Helper to map raw items to Review type
    const mapToReview = (item: unknown): Review | null => {
      if (!isObject(item)) return null;
      const raw = item as RawReviewItem;

      const id = raw.id ?? raw.reviewId;
      if (
        !id ||
        !raw.bookId ||
        !raw.userId ||
        typeof raw.rating !== 'number' ||
        !raw.comment ||
        !raw.createdAt
      ) {
        return null;
      }

      return {
        id,
        bookId: raw.bookId,
        userId: raw.userId,
        userName: raw.userName ?? raw.name ?? raw.userDisplayName,
        rating: raw.rating,
        comment: raw.comment,
        createdAt: raw.createdAt,
      };
    };

    const items = itemsRaw.map(mapToReview).filter((r): r is Review => r !== null);

    return { items, nextToken };
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(
        `Network error: Unable to connect to API at ${API_BASE_URL}. Please check your API configuration and ensure the server is running.`
      );
    }
    throw error;
  }
}

export async function getReviews(bookId: string): Promise<Review[]> {
  try {
    // ... existing getReviews logic ...
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_BASE_URL}/books/${encodeURIComponent(bookId)}/reviews?limit=50`,
      {
        headers,
        cache: 'no-store',
      }
    );
    // ... existing getReviews logic ...

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(
        `Failed to fetch reviews: ${response.status} ${response.statusText}. ${errorText}`
      );
    }

    const data = await response.json();
    const payload: unknown =
      isObject(data) && typeof data.body === 'string' ? JSON.parse(data.body) : data;

    const itemsRaw: unknown =
      isObject(payload) && Array.isArray(payload.items) ? payload.items : payload;

    if (!Array.isArray(itemsRaw)) return [];

    const toReview = (item: unknown): Review | null => {
      if (!isObject(item)) return null;
      const idRaw = item.id ?? item.reviewId;
      const bookIdRaw = item.bookId;
      const userIdRaw = item.userId;
      const userNameRaw = item.userName ?? item.name ?? item.userDisplayName;
      const ratingRaw = item.rating;
      const commentRaw = item.comment;
      const createdAtRaw = item.createdAt;

      if (
        typeof idRaw !== 'string' ||
        typeof bookIdRaw !== 'string' ||
        typeof userIdRaw !== 'string' ||
        typeof ratingRaw !== 'number' ||
        typeof commentRaw !== 'string' ||
        typeof createdAtRaw !== 'string'
      ) {
        return null;
      }

      return {
        id: idRaw,
        bookId: bookIdRaw,
        userId: userIdRaw,
        ...(typeof userNameRaw === 'string' && userNameRaw.trim()
          ? { userName: userNameRaw.trim() }
          : {}),
        rating: ratingRaw,
        comment: commentRaw,
        createdAt: createdAtRaw,
      };
    };

    return itemsRaw.map(toReview).filter((r): r is Review => r !== null);
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(
        `Network error: Unable to connect to API at ${API_BASE_URL}. Please check your API configuration and ensure the server is running.`
      );
    }
    throw error;
  }
}

export async function createReview(input: {
  bookId: string;
  rating: number;
  comment: string;
}): Promise<Review> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_BASE_URL}/books/${encodeURIComponent(input.bookId)}/reviews`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          rating: input.rating,
          comment: input.comment,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(
        `Failed to create review: ${response.status} ${response.statusText}. ${errorText}`
      );
    }

    const data = await response.json();
    const payload: unknown =
      isObject(data) && typeof data.body === 'string' ? JSON.parse(data.body) : data;

    if (!isObject(payload)) {
      throw new Error('Invalid create review response');
    }

    const idRaw = payload.id ?? payload.reviewId;
    const bookIdRaw = payload.bookId;
    const userIdRaw = payload.userId;
    const userNameRaw = payload.userName ?? payload.name ?? payload.userDisplayName;
    const ratingRaw = payload.rating;
    const commentRaw = payload.comment;
    const createdAtRaw = payload.createdAt;

    if (
      typeof idRaw !== 'string' ||
      typeof bookIdRaw !== 'string' ||
      typeof userIdRaw !== 'string' ||
      typeof ratingRaw !== 'number' ||
      typeof commentRaw !== 'string' ||
      typeof createdAtRaw !== 'string'
    ) {
      throw new Error('Invalid create review response shape');
    }

    return {
      id: idRaw,
      bookId: bookIdRaw,
      userId: userIdRaw,
      ...(typeof userNameRaw === 'string' && userNameRaw.trim()
        ? { userName: userNameRaw.trim() }
        : {}),
      rating: ratingRaw,
      comment: commentRaw,
      createdAt: createdAtRaw,
    };
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(
        `Network error: Unable to connect to API at ${API_BASE_URL}. Please check your API configuration and ensure the server is running.`
      );
    }
    throw error;
  }
}

export async function deleteReview(input: { bookId: string; reviewId: string }): Promise<void> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_BASE_URL}/books/${encodeURIComponent(input.bookId)}/reviews/${encodeURIComponent(
        input.reviewId
      )}`,
      {
        method: 'DELETE',
        headers,
      }
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(
        `Failed to delete review: ${response.status} ${response.statusText}. ${errorText}`
      );
    }
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(
        `Network error: Unable to connect to API at ${API_BASE_URL}. Please check your API configuration and ensure the server is running.`
      );
    }
    throw error;
  }
}

/**
 * Delete a review (admin only)
 */
export async function adminDeleteReview(input: {
  bookId: string;
  reviewId: string;
}): Promise<void> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_BASE_URL}/admin/books/${encodeURIComponent(input.bookId)}/reviews/${encodeURIComponent(
        input.reviewId
      )}`,
      {
        method: 'DELETE',
        headers,
      }
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(
        `Failed to delete review: ${response.status} ${response.statusText}. ${errorText}`
      );
    }
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(
        `Network error: Unable to connect to API at ${API_BASE_URL}. Please check your API configuration and ensure the server is running.`
      );
    }
    throw error;
  }
}

/**
 * Get all reading lists (admin only)
 */
export async function getAllReadingLists(): Promise<ReadingList[]> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/admin/reading-lists`, { headers });

    if (!response.ok) {
      console.warn('Failed to fetch admin reading lists, falling back to user lists');
      return getReadingLists();
    }
    const data = await response.json();
    let itemsRaw: unknown = [];
    if (Array.isArray(data)) {
      itemsRaw = data;
    } else if (isObject(data) && typeof data.body === 'string') {
      itemsRaw = JSON.parse(data.body);
    }

    if (!Array.isArray(itemsRaw)) return [];

    return itemsRaw
      .map((item) => {
        if (!isObject(item)) return null;
        const bookIdsRaw = item.bookIds;
        const bookIds = Array.isArray(bookIdsRaw)
          ? bookIdsRaw.filter((id): id is string => typeof id === 'string')
          : [];
        return {
          ...(item as unknown as ReadingList),
          bookIds,
        };
      })
      .filter((item): item is ReadingList => item !== null);
  } catch (error) {
    console.error('Failed to get all reading lists:', error);
    return [];
  }
}

/**
 * Get total users count (admin only)
 */
export async function getUsers(): Promise<User[]> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/admin/users`, { headers });

    if (!response.ok) {
      console.warn('Failed to fetch users');
      return [];
    }

    const isUserRole = (value: unknown): value is User['role'] =>
      value === 'user' || value === 'admin';

    const toIsoStringOrEmpty = (value: unknown): string => {
      if (typeof value === 'string') return value;
      if (value instanceof Date) return value.toISOString();
      return '';
    };

    const extractCognitoAttributes = (attrsRaw: unknown): Record<string, string> => {
      if (!Array.isArray(attrsRaw)) return {};
      const out: Record<string, string> = {};
      for (const attr of attrsRaw) {
        if (!isObject(attr)) continue;
        const name = attr.Name;
        const value = attr.Value;
        if (typeof name === 'string' && typeof value === 'string') {
          out[name] = value;
        }
      }
      return out;
    };

    const toUser = (raw: unknown): User | null => {
      if (!isObject(raw)) return null;

      // Native app shape
      const idRaw = raw.id;
      const emailRaw = raw.email;
      const nameRaw = raw.name;
      const roleRaw = raw.role;
      const createdAtRaw = raw.createdAt;

      // Cognito-ish shape
      const usernameRaw = raw.Username ?? raw.username;
      const attrs = extractCognitoAttributes(raw.Attributes);

      const id = typeof idRaw === 'string' ? idRaw : typeof usernameRaw === 'string' ? usernameRaw : '';
      if (!id) return null;

      const email =
        typeof emailRaw === 'string'
          ? emailRaw
          : typeof attrs.email === 'string'
            ? attrs.email
            : '';

      const name =
        typeof nameRaw === 'string'
          ? nameRaw
          : typeof attrs.name === 'string'
            ? attrs.name
            : [attrs.given_name, attrs.family_name].filter(Boolean).join(' ') ||
              (typeof usernameRaw === 'string' ? usernameRaw : '');

      const roleAttr = attrs['custom:role'] ?? attrs.role;
      const role: User['role'] = isUserRole(roleRaw)
        ? roleRaw
        : isUserRole(roleAttr)
          ? roleAttr
          : 'user';

      const createdAt =
        typeof createdAtRaw === 'string'
          ? createdAtRaw
          : toIsoStringOrEmpty(raw.UserCreateDate ?? raw.CreatedAt ?? raw.createdAt);

      return {
        id,
        email,
        name,
        role,
        createdAt,
      };
    };

    const data: unknown = await response.json();
    const payload = parseJsonBodyIfNeeded(data);

    let usersRaw: unknown = payload;
    if (isObject(payload)) {
      const candidate = payload.items ?? payload.users ?? payload.Items ?? payload.Users;
      if (candidate !== undefined) usersRaw = candidate;
    }

    if (!Array.isArray(usersRaw)) return [];
    return usersRaw.map(toUser).filter((u): u is User => u !== null);
  } catch (error) {
    console.error('Failed to get users:', error);
    return [];
  }
}
