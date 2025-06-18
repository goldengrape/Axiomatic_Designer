import React, { useState, useEffect, useCallback } from 'react';
import { ConfigPanel } from './components/ConfigPanel';
import { IterationView } from './components/IterationView';
import Spinner from './components/Spinner';
import { LanguageSwitcher } from './components/LanguageSwitcher'; // Import LanguageSwitcher
import { SystemStatus, IterationRound, Draft, TokenUsage, getSystemStatusSymbol } from './types';
import { callWriterAgent, callReviewerAgent } from './services/geminiService';
import { 
  DEFAULT_WRITER_INSTRUCTION, DEFAULT_REVIEWER_STANDARD, 
  DEFAULT_MIN_ITERATIONS, DEFAULT_MAX_ITERATIONS, 
  DEFAULT_TARGET_SCORE, DEFAULT_DRAFT_COUNT_N,
  GEMINI_MODEL_TEXT // Default model ID
} from './constants';
import { UsageMetadata } from '@google/genai';
import { useLocale } from './contexts/LocaleContext'; // Import useLocale

const App: React.FC = () => {
  const { t } = useLocale(); // Use locale hook

  const [writerInstruction, setWriterInstruction] = useState<string>(DEFAULT_WRITER_INSTRUCTION);
  const [reviewerStandard, setReviewerStandard] = useState<string>(DEFAULT_REVIEWER_STANDARD);
  const [minIterations, setMinIterations] = useState<number>(DEFAULT_MIN_ITERATIONS);
  const [maxIterations, setMaxIterations] = useState<number>(DEFAULT_MAX_ITERATIONS);
  const [targetScore, setTargetScore] = useState<number>(DEFAULT_TARGET_SCORE);
  const [draftCountN, setDraftCountN] = useState<number>(DEFAULT_DRAFT_COUNT_N);
  const [backgroundMaterial, setBackgroundMaterial] = useState<string>("");
  const [selectedGeminiModel, setSelectedGeminiModel] = useState<string>(GEMINI_MODEL_TEXT);


  const [iterationHistory, setIterationHistory] = useState<IterationRound[]>([]);
  const [currentIterationNum, setCurrentIterationNum] = useState<number>(0); 
  const [finalSelectedDraft, setFinalSelectedDraft] = useState<Draft | null>(null);
  const [consolidatedFeedbackForEditing, setConsolidatedFeedbackForEditing] = useState<string>("");
  
  const [systemStatus, setSystemStatus] = useState<SystemStatus>(SystemStatus.IDLE);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [tokenUsage, setTokenUsage] = useState<TokenUsage>({ totalInputTokens: 0, totalOutputTokens: 0 });

  const updateTokenUsage = (usage?: UsageMetadata) => {
    if (usage) {
      const promptTokensInCall = usage.promptTokenCount || 0;
      const candidateTokensInCall = (usage.totalTokenCount || 0) - promptTokensInCall;
      
      setTokenUsage(prev => ({
        totalInputTokens: prev.totalInputTokens + promptTokensInCall,
        totalOutputTokens: prev.totalOutputTokens + (candidateTokensInCall > 0 ? candidateTokensInCall : 0)
      }));
    }
  };
  
  const handleReset = () => {
    setWriterInstruction(DEFAULT_WRITER_INSTRUCTION);
    setReviewerStandard(DEFAULT_REVIEWER_STANDARD);
    setMinIterations(DEFAULT_MIN_ITERATIONS);
    setMaxIterations(DEFAULT_MAX_ITERATIONS);
    setTargetScore(DEFAULT_TARGET_SCORE);
    setDraftCountN(DEFAULT_DRAFT_COUNT_N);
    setBackgroundMaterial("");
    setSelectedGeminiModel(GEMINI_MODEL_TEXT); // Reset selected model
    setIterationHistory([]);
    setCurrentIterationNum(0);
    setFinalSelectedDraft(null);
    setConsolidatedFeedbackForEditing("");
    setSystemStatus(SystemStatus.IDLE);
    setErrorMessage(null);
    setIsLoading(false);
    setTokenUsage({ totalInputTokens: 0, totalOutputTokens: 0 });
  };

  const processWriterTurnRef = React.useRef<((
    iterationNumber: number, 
    currentWriterInstruction: string, 
    isFirstIter: boolean, 
    prevFeedback?: string, 
    prevDraftContent?: string
  ) => Promise<void>) | null>(null);


  const processReviewerTurn = useCallback(async (iterationNumber: number, draftsToReview: Draft[]) => {
    setIsLoading(true); 
    setSystemStatus(SystemStatus.REVIEWING);
    setErrorMessage(null);

    const reviewerResult = await callReviewerAgent(draftsToReview, reviewerStandard, t, selectedGeminiModel); // Pass t and selectedGeminiModel
    updateTokenUsage(reviewerResult.usageMetadata);

    if (reviewerResult.error || !reviewerResult.data) {
      setErrorMessage(reviewerResult.error || t.app.defaultError);
      setSystemStatus(SystemStatus.ERROR);
      setIsLoading(false);
      return;
    }

    const currentReviewerOutput = reviewerResult.data;
    const selectedDraftIndex = currentReviewerOutput.selectedDraftIndex;

    if (selectedDraftIndex < 0 || selectedDraftIndex >= draftsToReview.length) {
        setErrorMessage(t.app.reviewerInvalidSelectedIndex(selectedDraftIndex, draftsToReview.length));
        setSystemStatus(SystemStatus.ERROR);
        setIsLoading(false);
        return;
    }
    const selectedDraft = draftsToReview[selectedDraftIndex];
    
    setIterationHistory(prev => prev.map(r => 
        r.roundNumber === iterationNumber ? {
            ...r, 
            reviewerOutput: currentReviewerOutput, 
            selectedDraftByReviewerThisRound: selectedDraft 
        } : r
    ));
    
    setConsolidatedFeedbackForEditing(currentReviewerOutput.consolidatedFeedback); 

    const bestScoreThisRound = currentReviewerOutput.individualDraftReviews[selectedDraftIndex]?.score || 0;
    const isCycleCompleted = (iterationNumber >= maxIterations) || (bestScoreThisRound >= targetScore && iterationNumber >= minIterations);

    if (isCycleCompleted) {
      setSystemStatus(SystemStatus.COMPLETED);
      setFinalSelectedDraft(selectedDraft);
      setIsLoading(false);
    } else {
      const nextIterationNum = iterationNumber + 1;
      if (processWriterTurnRef.current) {
        processWriterTurnRef.current(
          nextIterationNum,
          writerInstruction, 
          false, 
          currentReviewerOutput.consolidatedFeedback,
          selectedDraft.draftContent
        );
      } else {
        setErrorMessage(t.app.internalErrorCannotContinue);
        setSystemStatus(SystemStatus.ERROR);
        setIsLoading(false);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewerStandard, maxIterations, targetScore, minIterations, writerInstruction, t, selectedGeminiModel]); // Added t and selectedGeminiModel


  const processWriterTurn = useCallback(async (
    iterationNumber: number, 
    currentWriterInstruction: string, 
    isFirstIter: boolean, 
    prevFeedback?: string, 
    prevDraftContent?: string
  ) => {
    setIsLoading(true); 
    setSystemStatus(SystemStatus.WRITING);
    setErrorMessage(null);
    setCurrentIterationNum(iterationNumber); 

    setIterationHistory(prev => {
        const existingRoundIndex = prev.findIndex(r => r.roundNumber === iterationNumber);
        if (existingRoundIndex > -1) {
            const updatedHistory = [...prev];
            updatedHistory[existingRoundIndex] = { 
                ...prev[existingRoundIndex], 
                writerInstructionUsed: currentWriterInstruction, 
                writerOutput: null, 
                reviewerInstructionUsed: reviewerStandard, 
                reviewerOutput: null, 
                selectedDraftByReviewerThisRound: null 
            };
            return updatedHistory;
        } else {
             const newRound: IterationRound = {
                roundNumber: iterationNumber,
                writerInstructionUsed: currentWriterInstruction,
                writerOutput: null,
                reviewerInstructionUsed: reviewerStandard, 
                reviewerOutput: null,
                selectedDraftByReviewerThisRound: null,
            };
            return [...prev, newRound];
        }
    });
    
    const writerResult = await callWriterAgent(
      currentWriterInstruction, 
      backgroundMaterial, 
      draftCountN,
      isFirstIter,
      t, // Pass t
      selectedGeminiModel, // Pass selectedGeminiModel
      prevFeedback,
      prevDraftContent
    );
    updateTokenUsage(writerResult.usageMetadata);

    if (writerResult.error || !writerResult.data) {
      setErrorMessage(writerResult.error || t.app.defaultError);
      setSystemStatus(SystemStatus.ERROR);
      setIsLoading(false);
      return;
    }
    
    const currentWriterOutput = writerResult.data;
    setIterationHistory(prev => prev.map(r => r.roundNumber === iterationNumber ? {...r, writerOutput: currentWriterOutput } : r));
    
    processReviewerTurn(iterationNumber, currentWriterOutput.drafts);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backgroundMaterial, draftCountN, reviewerStandard, processReviewerTurn, t, selectedGeminiModel]); // Added t and selectedGeminiModel

  useEffect(() => {
    processWriterTurnRef.current = processWriterTurn;
  }, [processWriterTurn]);


  const handleStart = () => {
    setErrorMessage(null); 

    if (systemStatus === SystemStatus.ADJUSTING_FOR_CONTINUATION) {
        if (!finalSelectedDraft) {
            setErrorMessage(t.app.continueErrorNoDraft);
            setSystemStatus(SystemStatus.ERROR);
            return;
        }
         if (currentIterationNum >= maxIterations) { 
             setErrorMessage(t.app.continueErrorMaxIterationsReached(currentIterationNum, maxIterations));
             setSystemStatus(SystemStatus.ERROR); 
             return;
        }
        processWriterTurn(
            currentIterationNum + 1, 
            writerInstruction, 
            false, 
            consolidatedFeedbackForEditing, 
            finalSelectedDraft.draftContent
        );
    } else { 
        setIterationHistory([]);
        setCurrentIterationNum(0); 
        setFinalSelectedDraft(null);
        setConsolidatedFeedbackForEditing(""); 
        setTokenUsage({ totalInputTokens: 0, totalOutputTokens: 0 });
        processWriterTurn(1, writerInstruction, true);
    }
  };

  const handlePrepareForContinuation = () => {
    if (finalSelectedDraft && iterationHistory.length > 0) {
        const lastReviewOutput = iterationHistory[iterationHistory.length-1]?.reviewerOutput;
        if (lastReviewOutput?.consolidatedFeedback) {
            setConsolidatedFeedbackForEditing(lastReviewOutput.consolidatedFeedback);
        } else {
             setConsolidatedFeedbackForEditing(t.app.failedToGetPreviousFeedback);
        }
        setSystemStatus(SystemStatus.ADJUSTING_FOR_CONTINUATION);
        setIsLoading(false); 
    } else {
        setErrorMessage(t.app.noIterationToContinue);
        setSystemStatus(SystemStatus.ERROR); 
    }
  };
  
  const handleDownloadFinalDraft = (content: string, filename: string) => {
    const element = document.createElement("a");
    const file = new Blob([content], {type: 'text/plain;charset=utf-8'});
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element); 
    element.click();
    document.body.removeChild(element);
    URL.revokeObjectURL(element.href); 
  };

  const displayedSystemStatus = t.systemStatus[getSystemStatusSymbol(systemStatus)] || systemStatus.toString();

  return (
    <div className="min-h-screen bg-base-200 p-4 md:p-8 selection:bg-primary/20 selection:text-primary">
      {isLoading && <Spinner />}
      <header className="mb-10 text-center">
        <div className="flex justify-center items-center gap-4 mb-2">
            <h1 className="text-4xl sm:text-5xl font-bold text-primary flex items-center justify-center gap-3">
              {t.app.title}
            </h1>
            <LanguageSwitcher /> 
        </div>
        <p className="text-neutral-600 text-md sm:text-lg">{t.app.subtitle}</p>
      </header>

      <div className="max-w-6xl mx-auto space-y-8">
        <ConfigPanel
          minIterations={minIterations}
          setMinIterations={setMinIterations}
          maxIterations={maxIterations}
          setMaxIterations={setMaxIterations}
          draftCountN={draftCountN}
          setDraftCountN={setDraftCountN}
          backgroundMaterial={backgroundMaterial}
          setBackgroundMaterial={setBackgroundMaterial}
          selectedGeminiModel={selectedGeminiModel}
          setSelectedGeminiModel={setSelectedGeminiModel}
          onStart={handleStart}
          onReset={handleReset}
          systemStatus={systemStatus}
          isLoading={isLoading}
        />

        {errorMessage && (
          <div 
            className="p-4 bg-error/10 text-red-700 border-l-4 border-error rounded-md shadow-md my-4" 
            role="alert" 
            aria-live="assertive"
          >
            <h3 className="font-bold text-lg">{t.app.errorOccurred}</h3>
            <p className="whitespace-pre-wrap mt-1">{errorMessage}</p>
          </div>
        )}

        <div 
          className="p-4 bg-blue-50 border-l-4 border-blue-500 text-blue-700 rounded-md shadow-sm my-4" 
          role="status" 
          aria-live="polite"
        >
            <h3 className="font-semibold text-lg">{t.app.statusBase}: <span className="font-bold">{displayedSystemStatus}</span></h3>
            {(systemStatus === SystemStatus.WRITING || systemStatus === SystemStatus.REVIEWING) && currentIterationNum > 0 && 
              <p className="text-sm mt-1">{t.app.currentIterationOf(currentIterationNum, maxIterations)}</p>
            }
            {systemStatus === SystemStatus.COMPLETED && currentIterationNum > 0 &&
              <p className="text-sm mt-1">{t.app.completedIterations(currentIterationNum)}</p>
            }
             {systemStatus === SystemStatus.ADJUSTING_FOR_CONTINUATION && currentIterationNum > 0 &&
              <p className="text-sm mt-1">{t.app.adjustingForContinuation(currentIterationNum, maxIterations, targetScore)}</p>
            }
             <p className="text-sm mt-1">{t.app.totalInputTokens}: {tokenUsage.totalInputTokens}, {t.app.totalOutputTokens}: {tokenUsage.totalOutputTokens}</p>
        </div>
        
        <IterationView
          iterationHistory={iterationHistory}
          currentIterationNum={currentIterationNum}
          systemStatus={systemStatus}
          isLoading={isLoading} 
          finalSelectedDraft={finalSelectedDraft}
          consolidatedFeedbackForEditing={consolidatedFeedbackForEditing}
          setConsolidatedFeedbackForEditing={setConsolidatedFeedbackForEditing}
          onPrepareForContinuation={handlePrepareForContinuation}
          onDownloadFinalDraft={handleDownloadFinalDraft}
        />
      </div>
      <footer className="text-center mt-16 py-6 border-t border-gray-300">
        <p className="text-sm text-gray-500">{t.app.footerText(new Date().getFullYear())}</p>
      </footer>
    </div>
  );
};

export default App;