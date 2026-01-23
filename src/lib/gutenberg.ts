export type CatalogKind = 'all' | 'collection' | 'category'

export type CatalogEntry = {
  key: string
  label: string
  description: string
  kind: CatalogKind
  catalogKey: string
  topic?: string
}

export type CatalogGroup = {
  label: string
  items: CatalogEntry[]
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const COLLECTIONS: CatalogEntry[] = [
  {
    key: 'collection-all',
    label: 'All of Gutenberg',
    description: 'Search the entire Project Gutenberg catalog.',
    kind: 'all',
    catalogKey: 'all',
  },
  {
    key: 'collection-shakespeare',
    label: 'Shakespeare',
    description: 'Plays and poems attributed to William Shakespeare.',
    kind: 'collection',
    catalogKey: 'shakespeare',
  },
  {
    key: 'collection-greek-tragedy',
    label: 'Greek tragedy',
    description: 'Aeschylus, Sophocles, Euripides, and their contemporaries.',
    kind: 'collection',
    catalogKey: 'greek-tragedy',
  },
  {
    key: 'collection-greek-epic',
    label: 'Greek epics',
    description: 'Epic poetry and mythic journeys from ancient Greece.',
    kind: 'collection',
    catalogKey: 'greek-epic',
  },
  {
    key: 'collection-roman-drama',
    label: 'Roman drama',
    description: 'Latin comedies, tragedies, and theatrical classics.',
    kind: 'collection',
    catalogKey: 'roman-drama',
  },
]

const CATEGORY_GROUPS: { label: string; topics: string[] }[] = [
  {
    label: 'Literature',
    topics: [
      'Adventure',
      'American Literature',
      'British Literature',
      'French Literature',
      'German Literature',
      'Russian Literature',
      'Classics of Literature',
      'Biographies',
      'Novels',
      'Short Stories',
      'Poetry',
      'Plays/Films/Dramas',
      'Romance',
      'Science-Fiction & Fantasy',
      'Crime, Thrillers & Mystery',
      'Mythology, Legends & Folklore',
      'Humour',
      'Children & Young Adult Reading',
      'Literature - Other',
    ],
  },
  {
    label: 'Science & Technology',
    topics: [
      'Engineering & Technology',
      'Mathematics',
      'Science - Physics',
      'Science - Chemistry/Biochemistry',
      'Science - Biology',
      'Science - Earth/Agricultural/Farming',
      'Research Methods/Statistics/Information Sys',
      'Environmental Issues',
    ],
  },
  {
    label: 'History',
    topics: [
      'History - American',
      'History - British',
      'History - European',
      'History - Ancient',
      'History - Medieval/Middle Ages',
      'History - Early Modern (c. 1450-1750)',
      'History - Modern (1750+)',
      'History - Religious',
      'History - Royalty',
      'History - Warfare',
      'History - Schools & Universities',
      'History - Other',
      'Archaeology & Anthropology',
    ],
  },
  {
    label: 'Social Sciences & Society',
    topics: [
      'Business/Management',
      'Economics',
      'Law & Criminology',
      'Gender & Sexuality Studies',
      'Psychiatry/Psychology',
      'Sociology',
      'Politics',
      'Parenthood & Family Relations',
      'Old Age & the Elderly',
    ],
  },
  {
    label: 'Arts & Culture',
    topics: [
      'Art',
      'Architecture',
      'Music',
      'Fashion',
      'Journalism/Media/Writing',
      'Language & Communication',
      'Essays, Letters & Speeches',
    ],
  },
  {
    label: 'Religion & Philosophy',
    topics: ['Religion/Spirituality', 'Philosophy & Ethics'],
  },
  {
    label: 'Lifestyle & Hobbies',
    topics: [
      'Cooking & Drinking',
      'Sports/Hobbies',
      'How To ...',
      'Travel Writing',
      'Nature/Gardening/Animals',
      'Sexuality & Erotica',
    ],
  },
  {
    label: 'Health & Medicine',
    topics: ['Health & Medicine', 'Drugs/Alcohol/Pharmacology', 'Nutrition'],
  },
  {
    label: 'Education & Reference',
    topics: [
      'Encyclopedias/Dictionaries/Reference',
      'Teaching & Education',
      'Reports & Conference Proceedings',
      'Journals',
    ],
  },
]

const CATEGORY_CATALOG_GROUPS: CatalogGroup[] = CATEGORY_GROUPS.map((group) => ({
  label: group.label,
  items: group.topics.map((topic) => ({
    key: `category-${slug(group.label)}-${slug(topic)}`,
    label: topic,
    description: 'Project Gutenberg main category.',
    kind: 'category',
    catalogKey: 'all',
    topic,
  })),
}))

export const CATALOG_GROUPS: CatalogGroup[] = [
  { label: 'Collections', items: COLLECTIONS },
  ...CATEGORY_CATALOG_GROUPS,
]

export const CATALOG_BY_KEY = new Map(
  CATALOG_GROUPS.flatMap((group) => group.items).map((item) => [item.key, item]),
)

export const DEFAULT_CATALOG_KEY = 'collection-all'
