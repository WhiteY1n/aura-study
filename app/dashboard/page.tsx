"use client";

import { useState, useMemo } from "react";
import { Plus, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
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
  const { user } = useAuth();
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
          emoji: "📝",
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <TopNav />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
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

      <main className="max-w-7xl mx-auto px-4 py-8">
        {projects.length === 0 ? (
          <EmptyState onCreateProject={handleCreateProject} />
        ) : (
          <FadeIn>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <h1 className="text-2xl font-semibold">My Notebooks</h1>
              <Button
                onClick={handleCreateProject}
                disabled={isCreating}
                className="gap-2"
              >
                {isCreating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                New notebook
              </Button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <SearchBar
                value={searchQuery}
                onChange={handleSearchChange}
                className="flex-1 max-w-md"
              />
              <div className="flex items-center gap-2">
                <SortDropdown value={sortBy} onValueChange={setSortBy} />
                <LayoutToggle layout={layout} onLayoutChange={setLayout} />
              </div>
            </div>

            {/* Projects grid/list */}
            {filteredProjects.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  No notebooks match your search.
                </p>
              </div>
            ) : (
              <>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={layout}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className={
                      layout === "grid"
                        ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                        : "flex flex-col gap-3"
                    }
                  >
                    {paginatedProjects.map((project, index) => (
                      <motion.div
                        key={project.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <ProjectCard
                          project={project}
                          layout={layout}
                          onRename={handleRename}
                          onDelete={handleDelete}
                        />
                      </motion.div>
                    ))}
                  </motion.div>
                </AnimatePresence>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-8">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        setCurrentPage((p) => Math.max(1, p - 1))
                      }
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground px-4">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </FadeIn>
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
