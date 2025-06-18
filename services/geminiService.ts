import { GoogleGenAI, GenerateContentResponse, Content, Part, UsageMetadata } from "@google/genai";
import { WriterOutput, ReviewerOutput, WriterResponseSchemaInternal, ReviewerResponseSchemaInternal, Draft, GroundingChunk } from '../types';
import { WRITER_JSON_SCHEMA, REVIEWER_JSON_SCHEMA } from '../constants'; // GEMINI_MODEL_TEXT is no longer directly used here
import { Locale } from '../locales'; // Import Locale type

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error("API_KEY environment variable is not set.");
  // Consider throwing an error or handling this more gracefully if the app can't function without it.
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

function parseJsonFromGeminiResponse(responseText: string, t: Locale): any {
  let jsonStr = responseText.trim();
  const fenceRegex = /^```(?:json)?\s*\n?(.*?)\n?\s*```$/s;
  const match = jsonStr.match(fenceRegex);
  if (match && match[1]) {
    jsonStr = match[1].trim();
  }
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.error("Failed to parse JSON response:", e, "Original text:", responseText);
    throw new Error(t.app.jsonParseFailed(errorMessage, responseText.substring(0, 200)));
  }
}

interface GeminiServiceResponse<T> {
  data: T | null;
  error: string | null;
  usageMetadata?: UsageMetadata;
  groundingChunks?: GroundingChunk[];
}

export async function callWriterAgent(
  prompt: string,
  backgroundMaterial: string | null,
  draftCountN: number,
  isFirstIteration: boolean,
  t: Locale, 
  modelName: string, // Added modelName parameter
  previousReviewerFeedback?: string,
  previousSelectedDraftContent?: string
): Promise<GeminiServiceResponse<WriterOutput>> {
  
  let fullPrompt = `You are an AI writing assistant. Your task is to generate content based on the following instructions and background material (if provided).`;
  fullPrompt += `\nPlease generate ${draftCountN} independent drafts.`;

  if (backgroundMaterial && backgroundMaterial.trim().length > 0) {
    fullPrompt += `\n\nBackground Material:\n\`\`\`\n${backgroundMaterial}\n\`\`\`\n`;
  }

  if (isFirstIteration) {
    fullPrompt += `\n\nWriting Instructions:\n${prompt}`;
    fullPrompt += `\n\nAs this is the first iteration, please state in the "responseToPreviousFeedback" field that this is the initial draft.`;
  } else {
    fullPrompt += `\n\nPrevious reviewer's feedback:\n\`\`\`\n${previousReviewerFeedback || "No feedback."}\n\`\`\`\n`;
    fullPrompt += `\n\nPrevious selected draft content (as a basis for revision):\n\`\`\`\n${previousSelectedDraftContent || "No previous draft."}\n\`\`\`\n`;
    fullPrompt += `\nPlease revise or rewrite based on the feedback and selected draft, generating ${draftCountN} new drafts. In the "responseToPreviousFeedback" field, detail how you addressed the feedback.`;
    fullPrompt += `\n\nNew Writing Instructions (if any, takes precedence over feedback):\n${prompt}`;
  }

  fullPrompt += `\n\nYour output MUST be a JSON object that strictly conforms to the structure described below. Do not add any extra explanations or text outside or inside the JSON object. The 'drafts' field must contain exactly ${draftCountN} draft objects.`;
  fullPrompt += `\nJSON structure example: {"responseToPreviousFeedback": "string", "drafts": [{"draftContent": "string", "revisionSummary": "string"}, ...]}`;

  const contents: Content[] = [{ role: 'user', parts: [{ text: fullPrompt }] }];
  
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: modelName, // Use passed modelName
        contents: contents,
        config: {
            responseMimeType: "application/json",
            responseSchema: WRITER_JSON_SCHEMA,
            temperature: 0.7,
        }
    });

    const responseText = response.text;
    if (!responseText) {
      return { data: null, error: t.app.noContentReturned, usageMetadata: response.usageMetadata };
    }
    
    const parsedData = parseJsonFromGeminiResponse(responseText, t) as WriterResponseSchemaInternal;

    if (!parsedData.drafts || !Array.isArray(parsedData.drafts) ) {
         throw new Error(t.app.writerMissingDrafts);
    }
     if (parsedData.drafts.length !== draftCountN) {
        console.warn(t.app.writerDraftCountMismatch(parsedData.drafts.length, draftCountN));
        // Potentially adjust or throw error based on strictness. For now, it proceeds.
    }
    if (typeof parsedData.responseToPreviousFeedback !== 'string') {
        throw new Error(t.app.writerMissingResponseToFeedback);
    }
    parsedData.drafts.forEach((draft, index) => {
        if (typeof draft.draftContent !== 'string' || typeof draft.revisionSummary !== 'string') {
            throw new Error(t.app.writerMissingDraftContentOrSummary(index));
        }
    });

    return { data: parsedData as WriterOutput, error: null, usageMetadata: response.usageMetadata };

  } catch (error) {
    console.error("Error calling Writer Agent:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { data: null, error: `${t.app.writerErrorPrefix}: ${errorMessage}` };
  }
}

export async function callReviewerAgent(
  draftsToReview: Draft[],
  reviewerStandard: string,
  t: Locale,
  modelName: string // Added modelName parameter
): Promise<GeminiServiceResponse<ReviewerOutput>> {
  
  let fullPrompt = `You are an AI content reviewer. Your task is to review ${draftsToReview.length} drafts based on the following review criteria.`;
  fullPrompt += `\n\nReview Criteria:\n\`\`\`\n${reviewerStandard}\n\`\`\`\n`;
  fullPrompt += `\n\nThe drafts to be reviewed are as follows:`;

  draftsToReview.forEach((draft, index) => {
    fullPrompt += `\n\nDraft ${index + 1}:\n\`\`\`\n${draft.draftContent}\n---Revision Summary---\n${draft.revisionSummary}\n\`\`\`\n`;
  });

  fullPrompt += `\n\nPlease provide independent review comments and a score from 0-100 for each draft. Then, select the draft you consider the best from these ${draftsToReview.length} drafts (indicate its 0-based index). Finally, provide consolidated review feedback, including the reasons for selecting the best draft and suggestions for improving the selected draft in the next round.`;
  fullPrompt += `\n\nYour output MUST be a JSON object that strictly conforms to the structure described below. Do not add any extra explanations or text outside or inside the JSON object. The 'individualDraftReviews' field must contain exactly ${draftsToReview.length} review objects. 'selectedDraftIndex' must be a valid 0-based index.`;
  fullPrompt += `\nJSON structure example: {"individualDraftReviews": [{"reviewComments": "string", "score": number (0-100)}, ...], "selectedDraftIndex": number, "consolidatedFeedback": "string"}`;
  
  const contents: Content[] = [{ role: 'user', parts: [{ text: fullPrompt }] }];

  try {
     const response: GenerateContentResponse = await ai.models.generateContent({
        model: modelName, // Use passed modelName
        contents: contents,
        config: {
            responseMimeType: "application/json",
            responseSchema: REVIEWER_JSON_SCHEMA,
            temperature: 0.5, 
        }
    });

    const responseText = response.text;
     if (!responseText) {
      return { data: null, error: t.app.noContentReturned, usageMetadata: response.usageMetadata };
    }

    const parsedData = parseJsonFromGeminiResponse(responseText, t) as ReviewerResponseSchemaInternal;

    if (!parsedData.individualDraftReviews || !Array.isArray(parsedData.individualDraftReviews) || parsedData.individualDraftReviews.length !== draftsToReview.length) {
        throw new Error(t.app.reviewerMissingReviews(draftsToReview.length));
    }
    parsedData.individualDraftReviews.forEach((review, index) => {
        if (typeof review.reviewComments !== 'string' || typeof review.score !== 'number' || review.score < 0 || review.score > 100) {
            throw new Error(t.app.reviewerInvalidReviewContent(index));
        }
    });
    if (typeof parsedData.selectedDraftIndex !== 'number' || parsedData.selectedDraftIndex < 0 || parsedData.selectedDraftIndex >= draftsToReview.length) {
         // Fallback to selecting the first draft if index is invalid, and log a warning.
        console.warn(`Reviewer returned invalid selectedDraftIndex: ${parsedData.selectedDraftIndex}. Defaulting to 0.`);
        parsedData.selectedDraftIndex = 0; 
        // Or throw new Error(t.app.reviewerInvalidSelectedIndex(parsedData.selectedDraftIndex, draftsToReview.length)); 
        // Depending on how strictly this should be handled. For now, defaulting.
    }
    if (typeof parsedData.consolidatedFeedback !== 'string') {
        throw new Error(t.app.reviewerMissingConsolidatedFeedback);
    }

    return { data: parsedData as ReviewerOutput, error: null, usageMetadata: response.usageMetadata };

  } catch (error) {
    console.error("Error calling Reviewer Agent:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { data: null, error: `${t.app.reviewerErrorPrefix}: ${errorMessage}` };
  }
}