
import { Schema as GeminiSchema } from '@google/genai'; // For responseSchema

export enum SystemStatus {
  IDLE = "IDLE", // Using string keys for enum values for easier i18n mapping
  CONFIGURING = "CONFIGURING",
  WRITING = "WRITING",
  REVIEWING = "REVIEWING",
  PAUSED = "PAUSED",
  COMPLETED = "COMPLETED",
  ADJUSTING_FOR_CONTINUATION = "ADJUSTING_FOR_CONTINUATION",
  ERROR = "ERROR"
}

// Helper to get symbol for SystemStatus, to be used with locale keys
export const getSystemStatusSymbol = (status: SystemStatus): symbol => {
  return Symbol.for(status);
};


export interface Draft {
  draftContent: string;
  revisionSummary: string;
}

export interface WriterOutput {
  responseToPreviousFeedback: string;
  drafts: Draft[];
}

export interface DraftReview {
  reviewComments: string;
  score: number; // 0-100
}

export interface ReviewerOutput {
  individualDraftReviews: DraftReview[];
  selectedDraftIndex: number; // 0-based
  consolidatedFeedback: string;
}

export interface IterationRound {
  roundNumber: number;
  writerInstructionUsed: string; 
  writerOutput: WriterOutput | null;
  writerRawResponse?: string; 
  reviewerInstructionUsed: string; 
  reviewerOutput: ReviewerOutput | null;
  reviewerRawResponse?: string; 
  selectedDraftByReviewerThisRound: Draft | null; 
}

export interface BackgroundMaterial {
  name: string;
  content: string;
}

export interface TokenUsage {
  totalInputTokens: number;
  totalOutputTokens: number;
}

// For Gemini API response_schema definition
export interface WriterResponseSchemaInternal {
    responseToPreviousFeedback: string;
    drafts: Array<{
        draftContent: string;
        revisionSummary: string;
    }>;
}

export interface ReviewerResponseSchemaInternal {
    individualDraftReviews: Array<{
        reviewComments: string;
        score: number;
    }>;
    selectedDraftIndex: number;
    consolidatedFeedback: string;
}

// This type is directly from @google/genai and is what we should use for schema definitions
export type GeminiResponseTypeSchema = GeminiSchema;

// For grounding metadata from Gemini Search
export interface GroundingChunkWeb {
  uri: string;
  title: string;
}
export interface GroundingChunk {
  web?: GroundingChunkWeb;
  retrievedContext?: {
    uri: string;
    title: string;
  };
  // other types of chunks can be added here if needed
}
