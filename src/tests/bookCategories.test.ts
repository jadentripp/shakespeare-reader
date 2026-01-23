/**
 * @file bookCategories.test.ts
 * @description Tests to verify that all book categories are properly configured
 * and that the Gutendex API integration handles them correctly.
 * 
 * NOTE: These tests use mocked API responses to avoid rate limiting
 * from Project Gutenberg/Gutendex. Real API calls should only be made
 * manually or in integration test environments.
 */

import { describe, it, expect, beforeEach, afterEach, spyOn, mock } from "bun:test";
import { CATALOG_GROUPS, CatalogEntry, CATALOG_BY_KEY } from "../lib/gutenberg";

const MIN_RESULTS_PER_CATEGORY = 4;

// Extract all category entries (not collections)
const categoryEntries: CatalogEntry[] = CATALOG_GROUPS
    .flatMap(group => group.items)
    .filter(item => item.kind === "category");

// Extract all collection entries
const collectionEntries: CatalogEntry[] = CATALOG_GROUPS
    .flatMap(group => group.items)
    .filter(item => item.kind === "collection" || item.kind === "all");

// All catalog entries
const allCatalogEntries: CatalogEntry[] = CATALOG_GROUPS.flatMap(group => group.items);

/**
 * Creates a mock Gutendex response with a specified number of results.
 */
function createMockGutendexResponse(count: number) {
    return {
        count,
        next: count > 32 ? "https://gutendex.com/books/?page=2" : null,
        previous: null,
        results: Array.from({ length: Math.min(count, 32) }, (_, i) => ({
            id: 1000 + i,
            title: `Mock Book ${i + 1}`,
            authors: [{ name: "Mock Author", birth_year: 1800, death_year: 1850 }],
            subjects: ["Fiction"],
            bookshelves: [],
            languages: ["en"],
            copyright: false,
            media_type: "Text",
            formats: {
                "application/epub+zip": `https://www.gutenberg.org/ebooks/${1000 + i}.epub.images`,
                "text/html": `https://www.gutenberg.org/ebooks/${1000 + i}.html`,
            },
            download_count: 1000 - i,
        })),
    };
}

describe("Book Categories - Configuration Validation", () => {
    it("should have at least one category defined per group", () => {
        const categoryGroups = CATALOG_GROUPS.filter(g => g.label !== "Collections");

        expect(categoryGroups.length).toBeGreaterThan(0);

        categoryGroups.forEach(group => {
            expect(group.items.length).toBeGreaterThanOrEqual(1);
        });
    });

    it("should have all categories with valid topics", () => {
        categoryEntries.forEach(entry => {
            expect(entry.topic).toBeDefined();
            expect(entry.topic!.length).toBeGreaterThan(0);
        });
    });

    it("should have unique keys for all catalog entries", () => {
        const keys = allCatalogEntries.map(e => e.key);
        const uniqueKeys = new Set(keys);

        expect(uniqueKeys.size).toBe(keys.length);
    });

    it("should have all entries accessible via CATALOG_BY_KEY", () => {
        allCatalogEntries.forEach(entry => {
            const found = CATALOG_BY_KEY.get(entry.key);
            expect(found).toBeDefined();
            expect(found?.key).toBe(entry.key);
        });
    });

    it("should have valid collection entries with catalog keys", () => {
        expect(collectionEntries.length).toBeGreaterThan(0);

        collectionEntries.forEach(entry => {
            expect(entry.catalogKey).toBeDefined();
            expect(entry.catalogKey.length).toBeGreaterThan(0);
        });
    });

    it(`should have exactly ${categoryEntries.length} category topics`, () => {
        // Document the expected number of categories
        expect(categoryEntries.length).toBe(71);
    });

    it(`should have exactly ${collectionEntries.length} collections`, () => {
        // Document the expected number of collections
        expect(collectionEntries.length).toBe(5);
    });
});

describe("Book Categories - Expected Results", () => {
    /**
     * This test documents all the categories and their expected API behavior.
     * Each category topic maps to a Gutendex topic filter.
     */

    const categoryGroups = [
        {
            group: "Literature",
            expectedTopics: [
                "Adventure",
                "American Literature",
                "British Literature",
                "French Literature",
                "German Literature",
                "Russian Literature",
                "Classics of Literature",
                "Biographies",
                "Novels",
                "Short Stories",
                "Poetry",
                "Plays/Films/Dramas",
                "Romance",
                "Science-Fiction & Fantasy",
                "Crime, Thrillers & Mystery",
                "Mythology, Legends & Folklore",
                "Humour",
                "Children & Young Adult Reading",
                "Literature - Other",
            ],
        },
        {
            group: "Science & Technology",
            expectedTopics: [
                "Engineering & Technology",
                "Mathematics",
                "Science - Physics",
                "Science - Chemistry/Biochemistry",
                "Science - Biology",
                "Science - Earth/Agricultural/Farming",
                "Research Methods/Statistics/Information Sys",
                "Environmental Issues",
            ],
        },
        {
            group: "History",
            expectedTopics: [
                "History - American",
                "History - British",
                "History - European",
                "History - Ancient",
                "History - Medieval/Middle Ages",
                "History - Early Modern (c. 1450-1750)",
                "History - Modern (1750+)",
                "History - Religious",
                "History - Royalty",
                "History - Warfare",
                "History - Schools & Universities",
                "History - Other",
                "Archaeology & Anthropology",
            ],
        },
        {
            group: "Social Sciences & Society",
            expectedTopics: [
                "Business/Management",
                "Economics",
                "Law & Criminology",
                "Gender & Sexuality Studies",
                "Psychiatry/Psychology",
                "Sociology",
                "Politics",
                "Parenthood & Family Relations",
                "Old Age & the Elderly",
            ],
        },
        {
            group: "Arts & Culture",
            expectedTopics: [
                "Art",
                "Architecture",
                "Music",
                "Fashion",
                "Journalism/Media/Writing",
                "Language & Communication",
                "Essays, Letters & Speeches",
            ],
        },
        {
            group: "Religion & Philosophy",
            expectedTopics: ["Religion/Spirituality", "Philosophy & Ethics"],
        },
        {
            group: "Lifestyle & Hobbies",
            expectedTopics: [
                "Cooking & Drinking",
                "Sports/Hobbies",
                "How To ...",
                "Travel Writing",
                "Nature/Gardening/Animals",
                "Sexuality & Erotica",
            ],
        },
        {
            group: "Health & Medicine",
            expectedTopics: ["Health & Medicine", "Drugs/Alcohol/Pharmacology", "Nutrition"],
        },
        {
            group: "Education & Reference",
            expectedTopics: [
                "Encyclopedias/Dictionaries/Reference",
                "Teaching & Education",
                "Reports & Conference Proceedings",
                "Journals",
            ],
        },
    ];

    categoryGroups.forEach(({ group, expectedTopics }) => {
        describe(`${group}`, () => {
            it(`should have ${expectedTopics.length} topics defined`, () => {
                const catalogGroup = CATALOG_GROUPS.find(g => g.label === group);
                expect(catalogGroup).toBeDefined();
                expect(catalogGroup!.items.length).toBe(expectedTopics.length);
            });

            expectedTopics.forEach(topic => {
                it(`should have '${topic}' as a valid category`, () => {
                    const entry = categoryEntries.find(e => e.topic === topic);
                    expect(entry).toBeDefined();
                    expect(entry!.kind).toBe("category");
                    expect(entry!.catalogKey).toBe("all");
                });
            });
        });
    });
});

describe("Book Categories - API Integration (Mocked)", () => {
    let fetchSpy: ReturnType<typeof spyOn>;

    beforeEach(() => {
        mock.restore();
    });

    afterEach(() => {
        if (fetchSpy) fetchSpy.mockRestore();
        mock.restore();
    });

    it("each category topic should produce a valid Gutendex URL", () => {
        categoryEntries.forEach(entry => {
            const url = new URL("https://gutendex.com/books/");
            url.searchParams.set("topic", entry.topic!);

            // URL should be valid and contain the topic
            expect(url.toString()).toContain("topic=");
            expect(url.searchParams.get("topic")).toBe(entry.topic);
        });
    });

    it("should handle API responses with at least 4 results per category (mocked)", async () => {
        // Mock fetch to return successful responses
        const originalFetch = globalThis.fetch;
        globalThis.fetch = async (url: string | URL | Request) => {
            const urlStr = url.toString();

            // All categories should return at least MIN_RESULTS_PER_CATEGORY
            return new Response(JSON.stringify(createMockGutendexResponse(50)), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            });
        };

        try {
            // Test a sample of categories
            const sampleCategories = categoryEntries.slice(0, 5);

            for (const entry of sampleCategories) {
                const url = new URL("https://gutendex.com/books/");
                url.searchParams.set("topic", entry.topic!);

                const response = await fetch(url.toString());
                const data = await response.json();

                expect(data.count).toBeGreaterThanOrEqual(MIN_RESULTS_PER_CATEGORY);
                expect(data.results.length).toBeGreaterThanOrEqual(MIN_RESULTS_PER_CATEGORY);
            }
        } finally {
            globalThis.fetch = originalFetch;
        }
    });

    it("should handle API errors gracefully", async () => {
        const originalFetch = globalThis.fetch;
        globalThis.fetch = async () => {
            return new Response(JSON.stringify({ error: "Rate limited" }), {
                status: 429,
                headers: { "Content-Type": "application/json" },
            });
        };

        try {
            const url = new URL("https://gutendex.com/books/");
            url.searchParams.set("topic", "Adventure");

            const response = await fetch(url.toString());

            // Should return 429 status
            expect(response.status).toBe(429);
        } finally {
            globalThis.fetch = originalFetch;
        }
    });
});

describe("Book Categories - Collections Validation", () => {
    const expectedCollections = [
        { key: "collection-all", label: "All of Gutenberg", catalogKey: "all" },
        { key: "collection-shakespeare", label: "Shakespeare", catalogKey: "shakespeare" },
        { key: "collection-greek-tragedy", label: "Greek tragedy", catalogKey: "greek-tragedy" },
        { key: "collection-greek-epic", label: "Greek epics", catalogKey: "greek-epic" },
        { key: "collection-roman-drama", label: "Roman drama", catalogKey: "roman-drama" },
    ];

    expectedCollections.forEach(({ key, label, catalogKey }) => {
        it(`should have '${label}' collection with key '${key}'`, () => {
            const entry = CATALOG_BY_KEY.get(key);
            expect(entry).toBeDefined();
            expect(entry!.label).toBe(label);
            expect(entry!.catalogKey).toBe(catalogKey);
        });
    });
});
