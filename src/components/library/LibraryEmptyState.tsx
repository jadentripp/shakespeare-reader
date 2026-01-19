import { BookOpen, Search } from "lucide-react";

interface LibraryEmptyStateProps {
  type: "library" | "catalog" | "search";
  title?: string;
  description?: string;
}

export function LibraryEmptyState({ type, title, description }: LibraryEmptyStateProps) {
  const configs = {
    library: {
      icon: BookOpen,
      title: title || "Your library is empty",
      description: description || "Browse the collections above or search for books to add",
    },
    catalog: {
      icon: Search,
      title: title || "Search the catalog",
      description: description || "Enter a search term to browse over 70,000 free ebooks",
    },
    search: {
      icon: Search,
      title: title || "No matches",
      description: description || "Try a different search term",
    },
  };

  const { icon: Icon, title: t, description: d } = configs[type];

  return (
    <div className={`rounded-2xl border border-dashed border-border/60 bg-muted/20 text-center ${type === 'catalog' || type === 'library' ? 'py-16' : 'py-12'}`}>
      <Icon className="mx-auto h-12 w-12 text-muted-foreground/40" />
      <h3 className={`mt-4 font-medium text-foreground ${type !== 'search' ? 'font-serif text-lg' : ''}`}>{t}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{d}</p>
    </div>
  );
}
