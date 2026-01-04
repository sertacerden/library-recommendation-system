export {};

declare global {
  interface Window {
    HSStaticMethods?: {
      autoInit: () => void;
    };
    HSOverlay?: {
      open: (selector: string) => void;
      close: (selector: string) => void;
    };

    __amplifyAuth?: {
      fetchAuthSession: () => Promise<unknown>;
      getCurrentUser: () => Promise<unknown>;
    };
  }
}
