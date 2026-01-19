import { useMemo } from "react";
import { useLibraryCore } from "./library/useLibraryCore";
import { useCatalogSearch } from "./library/useCatalogSearch";
import { useDownloadQueue } from "./library/useDownloadQueue";

export function useLibrary() {
  const libraryCore = useLibraryCore();
  const catalogSearch = useCatalogSearch();
  
  const localGutenbergIds = useMemo(() => {
    return new Set((libraryCore.booksQ.data ?? []).map((b) => b.gutenberg_id));
  }, [libraryCore.booksQ.data]);

  const downloadQueue = useDownloadQueue(localGutenbergIds);

  const startOrResumeBulk = async () => {
    downloadQueue.setPaused(false);
    const searchQuery = catalogSearch.catalogSearch.length > 0 ? catalogSearch.catalogSearch : null;
    const topic = catalogSearch.activeCatalog.kind === "category" ? catalogSearch.activeCatalog.topic ?? null : null;
    
    if (!catalogSearch.canQueryCatalog) {
      window.alert("Pick a category or enter a search term to scan Gutenberg.");
      return;
    }
    
    const reset =
      downloadQueue.bulkScan.done ||
      (downloadQueue.bulkScan.scanned === 0 && downloadQueue.bulkScan.nextUrl == null) ||
      downloadQueue.bulkScan.catalogKey !== catalogSearch.activeCatalog.catalogKey ||
      downloadQueue.bulkScan.searchQuery !== searchQuery ||
      downloadQueue.bulkScan.topic !== topic;
      
    const from = reset ? null : downloadQueue.bulkScan.nextUrl;
    void downloadQueue.runBulkScan(from ?? null, reset, catalogSearch.activeCatalog.catalogKey, searchQuery, topic);
    void downloadQueue.runQueue();
  };

  const resumeAll = async () => {
    downloadQueue.setPaused(false);
    void downloadQueue.runQueue();
    
    const searchQuery = catalogSearch.catalogSearch.length > 0 ? catalogSearch.catalogSearch : null;
    const topic = catalogSearch.activeCatalog.kind === "category" ? catalogSearch.activeCatalog.topic ?? null : null;

    if (
      !downloadQueue.bulkScan.done &&
      !downloadQueue.bulkScan.running &&
      downloadQueue.bulkScan.catalogKey === catalogSearch.activeCatalog.catalogKey &&
      downloadQueue.bulkScan.searchQuery === searchQuery &&
      downloadQueue.bulkScan.topic === topic
    ) {
      const from = downloadQueue.bulkScan.scanned === 0 ? null : downloadQueue.bulkScan.nextUrl;
      void downloadQueue.runBulkScan(
        from ?? null,
        false,
        catalogSearch.activeCatalog.catalogKey,
        downloadQueue.bulkScan.searchQuery ?? null,
        downloadQueue.bulkScan.topic ?? null,
      );
    }
  };

  return {
    ...libraryCore,
    ...catalogSearch,
    ...downloadQueue,
    localGutenbergIds,
    startOrResumeBulk,
    resumeAll,
    hasQueueActivity: downloadQueue.counts.downloading > 0 || 
                      downloadQueue.counts.queued > 0 || 
                      downloadQueue.counts.failed > 0 || 
                      downloadQueue.counts.done > 0,
    canBulkScan: catalogSearch.canQueryCatalog,
  };
}