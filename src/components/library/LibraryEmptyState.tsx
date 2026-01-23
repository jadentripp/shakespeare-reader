import { BookOpen, Search } from 'lucide-react'

interface LibraryEmptyStateProps {
  type: 'library' | 'catalog' | 'search'
  title?: string
  description?: string
}

export function LibraryEmptyState({ type, title, description }: LibraryEmptyStateProps) {
  const configs = {
    library: {
      icon: BookOpen,
      title: title || 'Your library is empty',
      description: description || 'Browse the collections above or search for books to add',
    },
    catalog: {
      icon: Search,
      title: title || 'Search the catalog',
      description: description || 'Enter a search term to browse over 70,000 free ebooks',
    },
    search: {
      icon: Search,
      title: title || 'No matches',
      description: description || 'Try a different search term',
    },
  }

  const { icon: Icon, title: t, description: d } = configs[type]

  return (
    <div
      className={`border-4 border-black bg-stone-50 text-center dark:border-white dark:bg-stone-900 ${type === 'catalog' || type === 'library' ? 'py-20' : 'py-12'}`}
    >
      <Icon className="mx-auto h-12 w-12 text-black dark:text-white" />
      <h3 className="mt-6 font-sans text-xl font-black uppercase tracking-tighter text-foreground">
        {t}
      </h3>
      <p className="mt-2 font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {d}
      </p>
    </div>
  )
}
