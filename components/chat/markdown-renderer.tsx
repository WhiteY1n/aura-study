"use client";

import React from "react";
import { Button } from "@/components/ui/button";

interface MessageSegment {
  text: string;
  citation_id?: number;
}

export interface Citation {
  citation_id: number;
  source_id: string;
  source_title: string;
  source_type: string;
  chunk_index?: number;
  excerpt?: string;
  chunk_lines_from?: number;
  chunk_lines_to?: number;
}

interface MarkdownRendererProps {
  content: string | { segments: MessageSegment[]; citations: Citation[] };
  className?: string;
  onCitationClick?: (citation: Citation) => void;
  isUserMessage?: boolean;
}

function CitationButton({
  chunkIndex,
  onClick,
}: {
  chunkIndex: number;
  onClick: () => void;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className="inline-flex items-center justify-center h-5 w-5 p-0 ml-0.5 text-xs font-medium rounded-full bg-primary/10 hover:bg-primary/20 text-primary"
    >
      {chunkIndex + 1}
    </Button>
  );
}

export function MarkdownRenderer({
  content,
  className = "",
  onCitationClick,
  isUserMessage = false,
}: MarkdownRendererProps) {
  // Handle enhanced content with citations
  if (typeof content === "object" && "segments" in content) {
    return (
      <div className={className}>
        {processMarkdownWithCitations(
          content.segments,
          content.citations,
          onCitationClick,
          isUserMessage
        )}
      </div>
    );
  }

  // For legacy string content, convert to simple format
  const segments: MessageSegment[] = [
    { text: typeof content === "string" ? content : "" },
  ];
  const citations: Citation[] = [];

  return (
    <div className={className}>
      {processMarkdownWithCitations(
        segments,
        citations,
        onCitationClick,
        isUserMessage
      )}
    </div>
  );
}

const processMarkdownWithCitations = (
  segments: MessageSegment[],
  citations: Citation[],
  onCitationClick?: (citation: Citation) => void,
  isUserMessage: boolean = false
) => {
  // For user messages, render as inline content
  if (isUserMessage) {
    return (
      <span>
        {segments.map((segment, index) => (
          <span key={index}>
            {processInlineMarkdown(segment.text)}
            {segment.citation_id && onCitationClick && (
              <CitationButton
                chunkIndex={(() => {
                  const citation = citations.find(
                    (c) => c.citation_id === segment.citation_id
                  );
                  return citation?.chunk_index || 0;
                })()}
                onClick={() => {
                  const citation = citations.find(
                    (c) => c.citation_id === segment.citation_id
                  );
                  if (citation) {
                    onCitationClick(citation);
                  }
                }}
              />
            )}
          </span>
        ))}
      </span>
    );
  }

  // For AI messages, treat each segment as a potential paragraph
  const paragraphs: React.JSX.Element[] = [];

  segments.forEach((segment, segmentIndex) => {
    const citation = segment.citation_id
      ? citations.find((c) => c.citation_id === segment.citation_id)
      : undefined;

    // Split segment text by double line breaks to handle multiple paragraphs
    const paragraphTexts = segment.text
      .split("\n\n")
      .filter((text) => text.trim());

    paragraphTexts.forEach((paragraphText, paragraphIndex) => {
      const processedContent = processTextWithMarkdown(paragraphText.trim());

      paragraphs.push(
        <p
          key={`${segmentIndex}-${paragraphIndex}`}
          className="mb-4 leading-relaxed"
        >
          {processedContent}
          {/* Add citation at the end of the paragraph if this is the last paragraph of the segment */}
          {paragraphIndex === paragraphTexts.length - 1 &&
            citation &&
            onCitationClick && (
              <CitationButton
                chunkIndex={citation.chunk_index || 0}
                onClick={() => onCitationClick(citation)}
              />
            )}
        </p>
      );
    });
  });

  return paragraphs;
};

const processTextWithMarkdown = (text: string) => {
  const lines = text.split("\n");

  return lines.map((line, lineIndex) => {
    const parts = line.split(/(\*\*.*?\*\*|__.*?__)/g);

    const processedLine = parts.map((part, partIndex) => {
      if (part.match(/^\*\*(.*)\*\*$/)) {
        const boldText = part.replace(/^\*\*(.*)\*\*$/, "$1");
        return <strong key={partIndex}>{boldText}</strong>;
      } else if (part.match(/^__(.*__)$/)) {
        const boldText = part.replace(/^__(.*__)$/, "$1");
        return <strong key={partIndex}>{boldText}</strong>;
      } else {
        return part;
      }
    });

    return (
      <span key={lineIndex}>
        {processedLine}
        {lineIndex < lines.length - 1 && <br />}
      </span>
    );
  });
};

const processInlineMarkdown = (text: string) => {
  const parts = text.split(/(\*\*.*?\*\*|__.*?__)/g);

  return parts.map((part, partIndex) => {
    if (part.match(/^\*\*(.*)\*\*$/)) {
      const boldText = part.replace(/^\*\*(.*)\*\*$/, "$1");
      return <strong key={partIndex}>{boldText}</strong>;
    } else if (part.match(/^__(.*__)$/)) {
      const boldText = part.replace(/^__(.*__)$/, "$1");
      return <strong key={partIndex}>{boldText}</strong>;
    } else {
      return part;
    }
  });
};
