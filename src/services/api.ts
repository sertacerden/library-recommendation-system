import { Book, ReadingList, Review, Recommendation } from '@/types';
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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export async function getBooks(): Promise<Book[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/books`);
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(
        `Failed to fetch books: ${response.status} ${response.statusText}. ${errorText}`
      );
    }

    const data = await response.json();

    if (Array.isArray(data)) {
      return data;
    }

    if (typeof data?.body === 'string') {
      const parsed = JSON.parse(data.body);
      return Array.isArray(parsed) ? parsed : [];
    }

    return [];
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

/**
 * Get AI-powered book recommendations using Amazon Bedrock
 *
 * TODO: Replace with real API call in Week 4, Day 1-2
 *
 * Implementation steps:
 * 1. Enable Bedrock model access in AWS Console (Claude 3 Haiku recommended)
 * 2. Deploy Lambda function: library-get-recommendations (see IMPLEMENTATION_GUIDE.md)
 * 3. Create API Gateway endpoint: POST /recommendations
 * 4. Add Cognito authorizer
 * 5. Update function signature to accept query parameter:
 *    export async function getRecommendations(query: string): Promise<Recommendation[]>
 * 6. Replace mock code below with:
 *
 * const headers = await getAuthHeaders();
 * const response = await fetch(`${API_BASE_URL}/recommendations`, {
 *   method: 'POST',
 *   headers,
 *   body: JSON.stringify({ query })
 * });
 * if (!response.ok) throw new Error('Failed to get recommendations');
 * const data = await response.json();
 * return data.recommendations;
 *
 * Expected response: Array of recommendations with title, author, reason, confidence
 *
 * Documentation: https://docs.aws.amazon.com/bedrock/latest/userguide/
 */
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
        return {
          ...(item as unknown as ReadingList),
          bookIds,
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
 * Create a new reading list
 *
 * TODO: Replace with real API call in Week 2, Day 5-7
 *
 * Implementation steps:
 * 1. Deploy Lambda function: library-create-reading-list
 * 2. Lambda should generate UUID for id and timestamps
 * 3. Lambda should get userId from Cognito token
 * 4. Create API Gateway endpoint: POST /reading-lists
 * 5. Add Cognito authorizer (Week 3)
 * 6. Replace mock code below with:
 *
 * const headers = await getAuthHeaders();
 * const response = await fetch(`${API_BASE_URL}/reading-lists`, {
 *   method: 'POST',
 *   headers,
 *   body: JSON.stringify(list)
 * });
 * if (!response.ok) throw new Error('Failed to create reading list');
 * return response.json();
 *
 * Expected response: Complete ReadingList object with generated id and timestamps
 */
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

/**
 * Update a reading list
 * TODO: Replace with PUT /reading-lists/:id API call
 */
export async function updateReadingList(
  id: string,
  list: Partial<Pick<ReadingList, 'name' | 'description' | 'bookIds'>>
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

    return {
      ...(itemRaw as unknown as ReadingList),
      bookIds,
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

/**
 * Delete a reading list
 * TODO: Replace with DELETE /reading-lists/:id API call
 */
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

/**
 * Get reviews for a book
 */
export async function getReviews(bookId: string): Promise<Review[]> {
  try {
    // Some deployments protect GET reviews behind Cognito as well, so include auth headers.
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_BASE_URL}/books/${encodeURIComponent(bookId)}/reviews?limit=50`,
      {
        headers,
      }
    );

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

/**
 * Create a new review
 */
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

/**
 * Delete a review (only the owner can delete)
 */
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getUsers(): Promise<any[]> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/admin/users`, { headers });

    if (!response.ok) {
      console.warn('Failed to fetch users');
      return [];
    }

    const data = await response.json();
    return Array.isArray(data) ? data : JSON.parse(data.body || '[]');
  } catch (error) {
    console.error('Failed to get users:', error);
    return [];
  }
}
