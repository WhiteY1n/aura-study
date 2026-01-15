"use client";

import { useState, useMemo } from "react";
import { Plus, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  TopNav,
  SearchBar,
  SortDropdown,
  LayoutToggle,
  EmptyState,
  ProjectCard,
  type SortOption,
  type Project,
} from "@/components/dashboard";
import { FadeIn } from "@/components/animations";
import { useNotebooks, useNotebookDelete, useNotebookUpdate } from "@/hooks";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";

const ITEMS_PER_PAGE = 12;

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { notebooks, isLoading, error } = useNotebooks();
  const { deleteNotebook } = useNotebookDelete();
  const { updateNotebook } = useNotebookUpdate();
  const { toast } = useToast();
  const supabase = createClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("date");
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [currentPage, setCurrentPage] = useState(1);
  const [isCreating, setIsCreating] = useState(false);

  // Transform notebooks to Project format
  const projects: Project[] = useMemo(() => {
    return (notebooks || []).map((nb) => ({
      id: nb.id,
      title: nb.title || "Untitled",
      lastUpdated: formatRelativeDate(nb.updated_at || nb.created_at),
      sourcesCount: nb.sources?.[0]?.count || 0,
      icon: nb.icon || "📝",
    }));
  }, [notebooks]);

  // Filter and sort projects
  const filteredProjects = useMemo(() => {
    let result = [...projects];

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((p) => p.title.toLowerCase().includes(query));
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === "title") {
        return a.title.localeCompare(b.title);
      }
      // Default: sort by date (newest first) - use original order from API
      return 0;
    });

    return result;
  }, [projects, searchQuery, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredProjects.length / ITEMS_PER_PAGE);
  const paginatedProjects = filteredProjects.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset to page 1 when filter changes
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  // Create new notebook
  const handleCreateProject = async () => {
    if (!user) return;

    setIsCreating(true);
    try {
      const { data, error } = await supabase
        .from("notebooks")
        .insert({
          user_id: user.id,
          title: "Untitled notebook",
          icon: "📝",
          generation_status: "pending",
        })
        .select()
        .single();

      if (error) throw error;

      router.push(`/project/${data.id}`);
    } catch (err) {
      console.error("Error creating notebook:", err);
      toast({
        variant: "destructive",
        title: "Failed to create notebook",
        description: "Please try again.",
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Rename notebook
  const handleRename = (id: string, newTitle: string) => {
    updateNotebook(
      { id, updates: { title: newTitle } },
      {
        onSuccess: () => {
          toast({
            title: "Notebook renamed",
            description: `Renamed to "${newTitle}"`,
          });
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: "Failed to rename",
            description: "Please try again.",
          });
        },
      }
    );
  };

  // Delete notebook
  const handleDelete = (id: string) => {
    deleteNotebook(id);
  };

  // Show loading when auth is loading or when user is null (logging out)
  if (isLoading || authLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <TopNav />
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <p className="text-destructive">Failed to load notebooks</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TopNav />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-[calc(100vh-56px)] flex flex-col">
        {projects.length === 0 ? (
          <EmptyState onCreateProject={handleCreateProject} />
        ) : (
          <div className="space-y-6 flex-1 flex flex-col">
            {/* Search + Sort + Layout toggle row */}
            <FadeIn>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
                  <SearchBar
                    value={searchQuery}
                    onChange={handleSearchChange}
                    className="flex-1 min-w-0"
                  />
                  <SortDropdown value={sortBy} onValueChange={setSortBy} />
                </div>
                <LayoutToggle layout={layout} onLayoutChange={setLayout} />
              </div>
            </FadeIn>

            {/* Create button */}
            <FadeIn delay={0.1}>
              <Button
                onClick={handleCreateProject}
                className="gap-2 select-none"
                disabled={isCreating}
              >
                {isCreating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Create new
              </Button>
            </FadeIn>

            {/* Projects grid/list */}
            {filteredProjects.length === 0 ? (
              <div className="text-center py-16 flex-1">
                <p className="text-muted-foreground">
                  No notebooks found matching &quot;{searchQuery}&quot;
                </p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col">
                {layout === "grid" ? (
                  <div 
                    key={`grid-${sortBy}-${currentPage}`}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                  >
                    {paginatedProjects.map((project, index) => (
                      <FadeIn key={`${project.id}-${sortBy}`} delay={index * 0.05}>
                        <ProjectCard
                          project={project}
                          layout="grid"
                          onRename={handleRename}
                          onDelete={handleDelete}
                        />
                      </FadeIn>
                    ))}
                  </div>
                ) : (
                  <div key={`list-${sortBy}-${currentPage}`} className="space-y-2">
                    {paginatedProjects.map((project, index) => (
                      <FadeIn key={`${project.id}-${sortBy}`} delay={index * 0.03}>
                        <ProjectCard
                          project={project}
                          layout="list"
                          onRename={handleRename}
                          onDelete={handleDelete}
                        />
                      </FadeIn>
                    ))}
                  </div>
                )}

                {/* Spacer to push pagination to bottom */}
                <div className="flex-1" />

                {/* Pagination */}
                {totalPages > 1 && (
                  <FadeIn delay={0.2}>
                    <Pagination className="mt-8 select-none">
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={(e) => {
                              e.preventDefault();
                              if (currentPage > 1) setCurrentPage(currentPage - 1);
                            }}
                            className={
                              currentPage === 1
                                ? "pointer-events-none opacity-50"
                                : "cursor-pointer"
                            }
                          />
                        </PaginationItem>

                        {/* Page numbers */}
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                          (page) => {
                            const showPage =
                              page === 1 ||
                              page === totalPages ||
                              (page >= currentPage - 1 && page <= currentPage + 1);

                            const showEllipsisBefore =
                              page === currentPage - 2 && currentPage > 3;
                            const showEllipsisAfter =
                              page === currentPage + 2 &&
                              currentPage < totalPages - 2;

                            if (showEllipsisBefore || showEllipsisAfter) {
                              return (
                                <PaginationItem key={page}>
                                  <PaginationEllipsis />
                                </PaginationItem>
                              );
                            }

                            if (!showPage) return null;

                            return (
                              <PaginationItem key={page}>
                                <PaginationLink
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setCurrentPage(page);
                                  }}
                                  isActive={currentPage === page}
                                  className="cursor-pointer"
                                >
                                  {page}
                                </PaginationLink>
                              </PaginationItem>
                            );
                          }
                        )}

                        <PaginationItem>
                          <PaginationNext
                            onClick={(e) => {
                              e.preventDefault();
                              if (currentPage < totalPages)
                                setCurrentPage(currentPage + 1);
                            }}
                            className={
                              currentPage === totalPages
                                ? "pointer-events-none opacity-50"
                                : "cursor-pointer"
                            }
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </FadeIn>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// Helper function
function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours === 0) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return diffMinutes <= 1 ? "Just now" : `${diffMinutes} minutes ago`;
    }
    return diffHours === 1 ? "1 hour ago" : `${diffHours} hours ago`;
  }

  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}
