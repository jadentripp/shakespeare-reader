import {
  RootRoute,
  Route,
  Router,
} from "@tanstack/react-router";
import AppLayout from "./App";
import BookPage from "./routes/BookPage";
import LibraryPage from "./routes/LibraryPage";
import SettingsPage from "./routes/SettingsPage";

const rootRoute = new RootRoute({
  component: AppLayout,
});

const indexRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "/",
  component: LibraryPage,
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

const routeTree = rootRoute.addChildren([indexRoute, bookRoute, settingsRoute]);

export const router = new Router({
  routeTree,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
