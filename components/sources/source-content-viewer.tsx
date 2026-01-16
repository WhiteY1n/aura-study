"use client";

import { useMemo, useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface Citation {
  citation_id: number;
  source_id: string;
  source_title: string;
  source_type: string;
  chunk_index?: number;
  excerpt?: string;
  chunk_lines_from?: number;
  chunk_lines_to?: number;
}

interface SourceContentViewerProps {
  sourceContent?: string;
  sourceTitle?: string;
  sourceSummary?: string;
  sourceUrl?: string;
  sourceType?: string;
  onClose?: () => void;
  highlightedCitation?: Citation | null;
}

export function SourceContentViewer({
  sourceContent,
  sourceTitle,
  sourceSummary,
  sourceUrl,
  sourceType,
  onClose,
  highlightedCitation,
}: SourceContentViewerProps) {
  const highlightRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const lastCitationIdRef = useRef<number | undefined>(undefined);

  // Tách nội dung thành từng dòng để render đẹp hơn
  const contentLines = useMemo(() => {
    if (!sourceContent) return [];
    return sourceContent.split("\n");
  }, [sourceContent]);

  // Kiểm tra dữ liệu dòng trích dẫn có hợp lệ để highlight không
  const hasValidCitationLines =
    highlightedCitation &&
    typeof highlightedCitation.chunk_lines_from === "number" &&
    typeof highlightedCitation.chunk_lines_to === "number" &&
    highlightedCitation.chunk_lines_from > 0;

  // Tính phạm vi cần highlight
  const startLine = hasValidCitationLines
    ? highlightedCitation!.chunk_lines_from!
    : -1;
  const endLine = hasValidCitationLines
    ? highlightedCitation!.chunk_lines_to!
    : -1;

  // Tự cuộn đến đoạn được highlight
  useEffect(() => {
    if (hasValidCitationLines && highlightRef.current && scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      ) as HTMLElement | null;

      const shouldScroll =
        highlightedCitation?.citation_id !== lastCitationIdRef.current ||
        (viewport && highlightRef.current
          ? Math.abs(highlightRef.current.offsetTop - viewport.scrollTop) >
            viewport.clientHeight / 2
          : false);

      if (shouldScroll && viewport) {
        lastCitationIdRef.current = highlightedCitation?.citation_id;
        setTimeout(() => {
          const highlightedElement = highlightRef.current;
          if (highlightedElement && viewport) {
            const scrollTop =
              highlightedElement.offsetTop -
              viewport.clientHeight / 2 +
              highlightedElement.clientHeight / 2;
            viewport.scrollTo({
              top: Math.max(0, scrollTop),
              behavior: "smooth",
            });
          }
        }, 150);
      }
    }
  }, [
    highlightedCitation?.citation_id,
    highlightedCitation?.chunk_lines_from,
    hasValidCitationLines,
  ]);

  if (!sourceContent) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-border/50 flex-shrink-0">
          <Button variant="ghost" size="sm" onClick={onClose} className="gap-2">
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">No content available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border/50 flex-shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold text-foreground line-clamp-2">
              {sourceTitle}
            </h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="flex-shrink-0 h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Accordion hướng dẫn nguồn */}
      {sourceSummary && (
        <div className="border-b border-border/50 flex-shrink-0">
          <Accordion type="single" collapsible>
            <AccordionItem value="guide" className="border-0">
              <AccordionTrigger className="px-4 py-3 text-sm font-medium hover:no-underline">
                <div className="flex items-center gap-2">
                  <span>Source guide</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 max-h-64 overflow-y-auto">
                <div className="text-sm text-foreground space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Summary</h4>
                    <p className="leading-relaxed text-muted-foreground text-sm">
                      {sourceSummary}
                    </p>
                  </div>

                  {/* Hiển thị URL khi nguồn là website */}
                  {sourceType === "website" && sourceUrl && (
                    <div>
                      <h4 className="font-medium mb-2">URL</h4>
                      <a
                        href={sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline break-all text-sm"
                      >
                        {sourceUrl}
                      </a>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      )}

      {/* Nội dung */}
      <ScrollArea className="flex-1 h-full" ref={scrollAreaRef}>
        <div className="p-6 w-full">
          <div className="prose prose-sm max-w-none dark:prose-invert w-full">
            {contentLines.map((line, idx) => {
              const lineNumber = idx + 1; // Dòng được đánh số từ 1
              const isHighlighted =
                startLine > 0 &&
                lineNumber >= startLine &&
                lineNumber <= endLine;
              const isFirstHighlightedLine =
                isHighlighted && lineNumber === startLine;
              const isLastHighlightedLine =
                isHighlighted && lineNumber === endLine;

              // Xác định bo góc khi highlight
              let roundedClass = "";
              if (isHighlighted) {
                if (isFirstHighlightedLine && isLastHighlightedLine) {
                  roundedClass = "rounded-lg";
                } else if (isFirstHighlightedLine) {
                  roundedClass = "rounded-t-lg";
                } else if (isLastHighlightedLine) {
                  roundedClass = "rounded-b-lg";
                }
              }

              return (
                <div
                  key={idx}
                  ref={isFirstHighlightedLine ? highlightRef : null}
                  className={`py-0.5 px-2 text-sm whitespace-pre-wrap break-words leading-relaxed ${roundedClass} ${
                    isHighlighted
                      ? "bg-primary/20 dark:bg-primary/30"
                      : "hover:bg-muted/30"
                  }`}
                  style={{
                    // Thêm viền trên cho dòng highlight đầu tiên
                    borderTop: isFirstHighlightedLine ? "2px solid hsl(var(--primary))" : "none",
                    // Thêm viền dưới cho dòng highlight cuối
                    borderBottom: isLastHighlightedLine ? "2px solid hsl(var(--primary))" : "none",
                    // Thêm viền trái/phải cho mọi dòng được highlight
                    borderLeft: isHighlighted ? "2px solid hsl(var(--primary))" : "none",
                    borderRight: isHighlighted ? "2px solid hsl(var(--primary))" : "none",
                  }}
                >
                  <span
                    className={
                      isHighlighted
                        ? "font-medium text-foreground"
                        : "text-foreground"
                    }
                  >
                    {line || "\u00A0"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
