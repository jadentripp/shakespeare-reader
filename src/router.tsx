import {
  RootRoute,
  Route,
  Router,
} from "@tanstack/react-router";
import AppLayout from "./App";
import BookPage from "./routes/BookPage";
import LibraryPage from "./routes/LibraryPage";
import SettingsPage from "./routes/SettingsPage";
import ThreeDLibraryPage from "./routes/ThreeDLibraryPage";

const rootRoute = new RootRoute({
  component: AppLayout,
});

const indexRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "/",
  component: LibraryPage,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      q: (search.q as string) || "",
      category: (search.category as string) || "collection-all",
    };
  },
});

const threeDLibraryRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "/3d-library",
  component: ThreeDLibraryPage,
});

const bookRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "/book/$bookId",
  component: BookPage,
});

const settingsRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: SettingsPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  threeDLibraryRoute,
  bookRoute,
  settingsRoute,
]);

export const router = new Router({
  routeTree,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
