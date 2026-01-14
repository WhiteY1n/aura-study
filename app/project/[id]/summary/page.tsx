"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ArrowLeft,
  Moon,
  Sun,
  FileDown,
  BookOpen,
  Lightbulb,
  Quote,
  Layers,
} from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { mockSummary } from "@/lib/mocks/summary";

const navSections = [
  { id: "overall", label: "Overview", icon: BookOpen },
  { id: "insights", label: "Key Insights", icon: Lightbulb },
  { id: "passages", label: "Passages", icon: Quote },
  { id: "pages", label: "Page Highlights", icon: Layers },
];

function SummarySkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-28" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-3 rounded-lg bg-secondary/50">
              <Skeleton className="h-5 w-40 mb-2" />
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export default function SummaryPage() {
  const params = useParams();
  const id = params.id as string;
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("overall");

  useEffect(() => {
    setMounted(true);
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" });
  };

  const isDark = resolvedTheme === "dark";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <Link href={`/project/${id}`}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="font-semibold text-foreground">Summary</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <FileDown className="h-4 w-4 mr-2" />
              Export
            </Button>
            {mounted && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(isDark ? "light" : "dark")}
              >
                {isDark ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex gap-8">
        <main className="flex-1 space-y-6">
          {isLoading ? (
            <SummarySkeleton />
          ) : (
            <>
              <Card id="overall">
                <CardHeader>
                  <CardTitle>Overall Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="leading-relaxed whitespace-pre-line">
                    {mockSummary.overall}
                  </p>
                </CardContent>
              </Card>

              <Card id="insights">
                <CardHeader>
                  <CardTitle>Key Insights</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {mockSummary.keyInsights.map((insight, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-secondary/50"
                    >
                      <h3 className="font-semibold mb-1">{insight.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {insight.content}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card id="passages">
                <CardHeader>
                  <CardTitle>Important Passages</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {mockSummary.passages.map((passage, idx) => (
                    <div
                      key={idx}
                      className="border-l-4 border-primary pl-4 py-2"
                    >
                      <p className="italic">&quot;{passage.text}&quot;</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Page {passage.page}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card id="pages">
                <CardHeader>
                  <CardTitle>Page Highlights</CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible>
                    {mockSummary.pageHighlights.map((page) => (
                      <AccordionItem key={page.page} value={`page-${page.page}`}>
                        <AccordionTrigger>Page {page.page}</AccordionTrigger>
                        <AccordionContent>
                          <ul className="space-y-1 text-sm text-muted-foreground">
                            {page.highlights.map((h, i) => (
                              <li key={i}>• {h}</li>
                            ))}
                          </ul>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            </>
          )}
        </main>

        <aside className="hidden lg:block w-48">
          <div className="sticky top-20">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              On this page
            </h3>
            <nav className="space-y-1">
              {navSections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className={cn(
                    "block w-full text-left px-3 py-2 text-sm rounded-lg transition-colors",
                    activeSection === section.id
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-secondary"
                  )}
                >
                  {section.label}
                </button>
              ))}
            </nav>
          </div>
        </aside>
      </div>
    </div>
  );
}
