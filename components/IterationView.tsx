
import React, { useState } from 'react';
import { IterationRound, SystemStatus, Draft, ReviewerOutput } from '../types';
import { useLocale } from '../contexts/LocaleContext'; // Import useLocale

interface IterationViewProps {
  iterationHistory: IterationRound[];
  currentIterationNum: number;
  systemStatus: SystemStatus;
  isLoading: boolean;
  finalSelectedDraft: Draft | null;
  consolidatedFeedbackForEditing: string;
  setConsolidatedFeedbackForEditing: (value: string) => void;
  onPrepareForContinuation: () => void;
  onDownloadFinalDraft: (content: string, filename: string) => void;
}

const Card: React.FC<{ title: string; children: React.ReactNode; defaultOpen?: boolean; bgColor?: string, expandText: string, collapseText: string }> = 
    ({ title, children, defaultOpen = false, bgColor="bg-white", expandText, collapseText }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className={`${bgColor} shadow-lg rounded-lg mb-6 transition-all duration-300 ease-in-out`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left p-4 font-semibold text-lg text-primary hover:bg-primary/5 focus:outline-none flex justify-between items-center rounded-t-lg"
        aria-expanded={isOpen}
      >
        {title}
        <span className="text-primary/70">{isOpen ? collapseText : expandText}</span>
      </button>
      {isOpen && <div className="p-4 border-t border-gray-200">{children}</div>}
    </div>
  );
};

const DraftDisplay: React.FC<{ draft: Draft; index: number; isSelected?: boolean; isFinal?: boolean; locale: ReturnType<typeof useLocale>['t'] }> = 
    ({ draft, index, isSelected, isFinal, locale }) => (
  <div className={`p-4 border rounded-lg mb-3 ${isSelected || isFinal ? 'border-secondary ring-2 ring-secondary shadow-md' : 'border-gray-300 hover:shadow-sm'}`}>
    <h4 className="font-semibold text-gray-800">
      {isFinal ? locale.iterationView.finalSelectedDraftTitle : locale.iterationView.draftDisplayTitle(index + 1)}
      {(isSelected || isFinal) && <span className="text-secondary font-bold ml-2">{locale.iterationView.draftSelectedSuffix}</span>}
    </h4>
    <p className="text-sm text-gray-600 mt-1 mb-2"><strong>{locale.iterationView.revisionSummaryLabel}</strong> {draft.revisionSummary}</p>
    <pre className="whitespace-pre-wrap bg-gray-50 p-3 rounded text-sm text-gray-700 max-h-80 overflow-y-auto border border-gray-200">{draft.draftContent}</pre>
  </div>
);

const ReviewDisplay: React.FC<{ review: ReviewerOutput['individualDraftReviews'][0]; index: number; score: number; locale: ReturnType<typeof useLocale>['t'] }> = 
    ({ review, index, score, locale }) => (
 <div className="p-4 border border-gray-300 rounded-lg mb-3 hover:shadow-sm">
    <h4 className="font-semibold text-gray-800">{locale.iterationView.reviewDisplayTitle(index + 1)} - <span className={`font-bold ${score >= 80 ? 'text-success' : score >=60 ? 'text-warning' : 'text-error'}`}>{locale.iterationView.scoreLabel(score)}</span></h4>
    <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{review.reviewComments}</p>
  </div>
);


export const IterationView: React.FC<IterationViewProps> = ({
  iterationHistory, currentIterationNum, systemStatus, isLoading,
  finalSelectedDraft, consolidatedFeedbackForEditing, setConsolidatedFeedbackForEditing,
  onPrepareForContinuation, onDownloadFinalDraft
}) => {
  const { t } = useLocale(); // Use locale hook

  if (iterationHistory.length === 0 && systemStatus === SystemStatus.IDLE && !isLoading) {
    return <div className="mt-8 p-8 bg-white shadow-xl rounded-lg text-center text-gray-500 text-lg">{t.iterationView.initialPrompt}</div>;
  }
  
  const lastRound = iterationHistory.length > 0 ? iterationHistory[iterationHistory.length - 1] : null;

  return (
    <div className="mt-8">
      <h2 className="text-3xl font-semibold text-primary mb-6">{t.iterationView.historyTitle}</h2>
      {iterationHistory.map((round, index) => (
        <Card 
            key={round.roundNumber} 
            title={t.iterationView.roundTitle(round.roundNumber)} 
            defaultOpen={index === iterationHistory.length -1 && systemStatus !== SystemStatus.COMPLETED && systemStatus !== SystemStatus.ADJUSTING_FOR_CONTINUATION}
            expandText={t.iterationView.expandSection}
            collapseText={t.iterationView.collapseSection}
        >
          <div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">{t.iterationView.writerPhaseTitle}</h3>
            {round.writerOutput ? (
              <>
                <p className="text-sm text-gray-600 mb-2"><strong>{t.iterationView.writerResponseToFeedback}</strong> {round.writerOutput.responseToPreviousFeedback}</p>
                {round.writerOutput.drafts.map((draft, draftIdx) => (
                  <DraftDisplay 
                    key={draftIdx} 
                    draft={draft} 
                    index={draftIdx} 
                    isSelected={round.reviewerOutput?.selectedDraftIndex === draftIdx}
                    locale={t}
                  />
                ))}
              </>
            ) : (systemStatus === SystemStatus.WRITING || systemStatus === SystemStatus.REVIEWING) && currentIterationNum === round.roundNumber && isLoading ? (
                <p className="text-md text-gray-500 italic">{t.iterationView.writerOutputGenerating}</p>
            ) : (
                <p className="text-md text-gray-500 italic">{t.iterationView.writerOutputPending}</p>
            )}
          </div>

          {round.writerOutput && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-xl font-semibold text-gray-700 mb-2">{t.iterationView.reviewerPhaseTitle}</h3>
              {round.reviewerOutput ? (
                <>
                  {round.reviewerOutput.individualDraftReviews.map((review, reviewIdx) => (
                    <ReviewDisplay 
                        key={reviewIdx} 
                        review={review} 
                        index={reviewIdx}
                        score={review.score}
                        locale={t}
                    />
                  ))}
                  <p className="text-md text-gray-600 mt-3"><strong>{t.iterationView.selectedDraftIndexLabel}</strong> {round.reviewerOutput.selectedDraftIndex + 1}</p>
                  <div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-lg shadow-sm">
                    <p className="text-md text-gray-800 font-semibold">{t.iterationView.consolidatedFeedbackLabel}</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap mt-1">{round.reviewerOutput.consolidatedFeedback}</p>
                  </div>
                </>
              ) : (systemStatus === SystemStatus.REVIEWING || systemStatus === SystemStatus.WRITING ) && currentIterationNum === round.roundNumber && isLoading ? (
                 <p className="text-md text-gray-500 italic">{t.iterationView.reviewerOutputGenerating}</p>
              ) : (
                <p className="text-md text-gray-500 italic">{t.iterationView.reviewerOutputPending}</p>
              )}
            </div>
          )}
        </Card>
      ))}

      {systemStatus === SystemStatus.COMPLETED && finalSelectedDraft && lastRound?.reviewerOutput && (
        <Card 
            title={t.iterationView.completedCardTitle} 
            defaultOpen={true} 
            bgColor="bg-green-50 border-l-4 border-green-500"
            expandText={t.iterationView.expandSection}
            collapseText={t.iterationView.collapseSection}
        >
          <h3 className="text-2xl font-semibold text-green-700 mb-3">{t.iterationView.completedMessageHeader}</h3>
          <p className="text-gray-700 mb-1">{t.iterationView.completedMessageBody}</p>
          <p className="text-gray-700 mb-4">{t.iterationView.completedSelectedDraftLabel}</p>
          <DraftDisplay draft={finalSelectedDraft} index={0} isFinal={true} locale={t} />
          
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-md font-semibold text-gray-800 mb-1">{t.iterationView.completedFinalReviewLabel}</h4>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{lastRound.reviewerOutput.consolidatedFeedback}</p>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
            <button
                onClick={() => onDownloadFinalDraft(finalSelectedDraft.draftContent, t.iterationView.downloadDraftFilename(currentIterationNum))}
                className="flex-grow px-6 py-3 bg-primary text-white font-semibold rounded-md shadow-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors duration-150"
            >
                {t.iterationView.downloadFinalDraftButton}
            </button>
            <button
                onClick={onPrepareForContinuation}
                className="flex-grow px-6 py-3 bg-secondary text-white font-semibold rounded-md shadow-md hover:bg-secondary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary transition-colors duration-150"
            >
                {t.iterationView.continueOptimizingButton}
            </button>
          </div>
        </Card>
      )}

      {systemStatus === SystemStatus.ADJUSTING_FOR_CONTINUATION && finalSelectedDraft && (
         <Card 
            title={t.iterationView.adjustingCardTitle} 
            defaultOpen={true} 
            bgColor="bg-yellow-50 border-l-4 border-yellow-500"
            expandText={t.iterationView.expandSection}
            collapseText={t.iterationView.collapseSection}
        >
            <h3 className="text-2xl font-semibold text-yellow-700 mb-3">{t.iterationView.adjustingMessageHeader}</h3>
            <p className="text-gray-700 mb-2">{t.iterationView.adjustingMessageBody}</p>
            <DraftDisplay draft={finalSelectedDraft} index={0} isFinal={true} locale={t} />
            
            <div className="mt-4">
                <label htmlFor="editableFeedback" className="block text-md font-medium text-gray-800 mb-1">
                    {t.iterationView.editFeedbackLabel}
                </label>
                <textarea
                    id="editableFeedback"
                    value={consolidatedFeedbackForEditing}
                    onChange={(e) => setConsolidatedFeedbackForEditing(e.target.value)}
                    rows={6}
                    className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary transition-shadow duration-150"
                    aria-label={t.iterationView.editFeedbackAriaLabel}
                />
            </div>
            <p className="mt-4 text-sm text-gray-600">
                {t.iterationView.adjustingConfigInstructions}
            </p>
             <div className="mt-6">
                <button
                    onClick={() => onDownloadFinalDraft(finalSelectedDraft.draftContent, t.iterationView.downloadCurrentDraftFilename(currentIterationNum))}
                    className="px-6 py-3 bg-neutral text-white font-semibold rounded-md shadow-md hover:bg-neutral/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral transition-colors duration-150"
                >
                    {t.iterationView.downloadCurrentDraftButton}
                </button>
            </div>
        </Card>
      )}

    </div>
  );
};
