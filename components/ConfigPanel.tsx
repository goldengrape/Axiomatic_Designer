import React from 'react';
import { SystemStatus } from '../types';
import { MAX_BACKGROUND_MATERIAL_LENGTH, AVAILABLE_MODELS_FOR_SELECTION } from '../constants';
import { useLocale } from '../contexts/LocaleContext'; // Import useLocale

interface ConfigPanelProps {
  minIterations: number;
  setMinIterations: (value: number) => void;
  maxIterations: number;
  setMaxIterations: (value: number) => void;
  draftCountN: number;
  setDraftCountN: (value: number) => void;
  backgroundMaterial: string;
  setBackgroundMaterial: (value: string) => void;
  selectedGeminiModel: string;
  setSelectedGeminiModel: (value: string) => void;
  onStart: () => void;
  onReset: () => void;
  systemStatus: SystemStatus;
  isLoading: boolean;
}

const ConfigInput: React.FC<{ label: string; id: string; children: React.ReactNode }> = ({ label, id, children }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    {children}
  </div>
);

export const ConfigPanel: React.FC<ConfigPanelProps> = ({
  minIterations, setMinIterations,
  maxIterations, setMaxIterations,
  draftCountN, setDraftCountN,
  backgroundMaterial, setBackgroundMaterial,
  selectedGeminiModel, setSelectedGeminiModel,
  onStart, onReset,
  systemStatus, isLoading
}) => {
  const { t } = useLocale(); // Use locale hook

  const isEffectivelyRunning = isLoading || systemStatus === SystemStatus.WRITING || systemStatus === SystemStatus.REVIEWING;
  const isAdjusting = systemStatus === SystemStatus.ADJUSTING_FOR_CONTINUATION;
  
  const canStart = systemStatus === SystemStatus.IDLE || 
                   systemStatus === SystemStatus.COMPLETED || 
                   systemStatus === SystemStatus.ERROR || 
                   systemStatus === SystemStatus.ADJUSTING_FOR_CONTINUATION;

  const disableNonAdjustableFields = isEffectivelyRunning || isAdjusting;
  const disableAllConfig = isEffectivelyRunning;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const allowedTypes = ['text/plain', 'text/markdown'];
    if (!allowedTypes.includes(file.type) && !file.name.endsWith('.txt') && !file.name.endsWith('.md')) {
        alert(t.configPanel.uploadFileErrorType);
        event.target.value = ''; 
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content.length > MAX_BACKGROUND_MATERIAL_LENGTH) {
        alert(t.configPanel.uploadFileErrorSize(MAX_BACKGROUND_MATERIAL_LENGTH));
        return;
      }
      setBackgroundMaterial(content);
    };
    reader.onerror = () => {
        alert(t.configPanel.uploadFileErrorRead);
    };
    reader.readAsText(file);
    event.target.value = ''; 
  };


  return (
    <div className="bg-white p-6 shadow-xl rounded-lg space-y-6">
      <div>
        <ConfigInput label={t.configPanel.backgroundMaterialLabel} id="backgroundMaterial">
          <textarea
              id="backgroundMaterial"
              value={backgroundMaterial}
              onChange={(e) => {
                  if (e.target.value.length <= MAX_BACKGROUND_MATERIAL_LENGTH) {
                      setBackgroundMaterial(e.target.value);
                  }
              }}
              rows={5}
              placeholder={t.configPanel.backgroundMaterialPlaceholder(MAX_BACKGROUND_MATERIAL_LENGTH)}
              className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary transition-shadow duration-150"
              disabled={disableNonAdjustableFields}
              aria-disabled={disableNonAdjustableFields}
              aria-label={t.configPanel.backgroundMaterialLabel}
          />
        </ConfigInput>
        <div className="flex justify-between items-center mt-2">
            <p className="text-xs text-gray-500">
                {t.configPanel.backgroundMaterialChars(backgroundMaterial.length, MAX_BACKGROUND_MATERIAL_LENGTH)}
            </p>
            <label
                htmlFor="backgroundFileUpload"
                className={`px-4 py-2 text-sm font-medium rounded-md shadow-sm cursor-pointer transition-colors duration-150
                            ${disableNonAdjustableFields 
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                                : 'bg-secondary text-white hover:bg-secondary/90 focus:ring-secondary focus:ring-offset-2 focus:outline-none focus:ring-2'}`}
                aria-disabled={disableNonAdjustableFields}
            >
                {t.configPanel.uploadFileButton}
            </label>
            <input
                type="file"
                id="backgroundFileUpload"
                accept=".txt,.md,text/plain,text/markdown"
                onChange={handleFileChange}
                className="hidden"
                disabled={disableNonAdjustableFields}
            />
        </div>
      </div>
      
      <div>
        <ConfigInput label={t.configPanel.modelLabel} id="geminiModelSelect">
           <select
            id="geminiModelSelect"
            value={selectedGeminiModel}
            onChange={(e) => setSelectedGeminiModel(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary transition-shadow duration-150 bg-white"
            disabled={disableNonAdjustableFields}
            aria-disabled={disableNonAdjustableFields}
            aria-label={t.configPanel.modelLabel}
          >
            {AVAILABLE_MODELS_FOR_SELECTION.map(model => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </select>
        </ConfigInput>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ConfigInput label={t.configPanel.draftCountLabel} id="draftCountN">
          <input
            type="number"
            id="draftCountN"
            value={draftCountN}
            onChange={(e) => setDraftCountN(Math.max(1, Math.min(3, parseInt(e.target.value, 10))))}
            min="1" max="3"
            className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary transition-shadow duration-150"
            disabled={disableNonAdjustableFields}
            aria-disabled={disableNonAdjustableFields}
            aria-label={t.configPanel.draftCountLabel}
          />
        </ConfigInput>
        <ConfigInput label={t.configPanel.minIterationsLabel} id="minIterations">
          <input
            type="number"
            id="minIterations"
            value={minIterations}
            onChange={(e) => setMinIterations(Math.max(1, parseInt(e.target.value, 10)))}
            min="1"
            className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary transition-shadow duration-150"
            disabled={disableNonAdjustableFields} 
            aria-disabled={disableNonAdjustableFields}
            aria-label={t.configPanel.minIterationsLabel}
          />
        </ConfigInput>
        <ConfigInput label={t.configPanel.maxIterationsLabel} id="maxIterations">
          <input
            type="number"
            id="maxIterations"
            value={maxIterations}
            onChange={(e) => setMaxIterations(Math.max(minIterations > 0 ? minIterations : 1, parseInt(e.target.value, 10)))} 
            min={minIterations > 0 ? minIterations : 1}
            className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary transition-shadow duration-150"
            disabled={disableAllConfig && !isAdjusting} 
            aria-disabled={disableAllConfig && !isAdjusting}
            aria-label={t.configPanel.maxIterationsLabel}
          />
        </ConfigInput>
      </div>

      <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 pt-4 border-t border-gray-200 mt-2">
        <button
          onClick={onStart}
          disabled={!canStart || isLoading}
          aria-disabled={!canStart || isLoading}
          className="w-full sm:w-auto flex-grow px-6 py-3 bg-primary text-white font-semibold rounded-md shadow-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 ease-in-out"
        >
          {isLoading ? t.configPanel.startButtonLoading : (isAdjusting ? t.configPanel.continueButton : t.configPanel.startButton)}
        </button>
        <button
          onClick={onReset}
          disabled={systemStatus === SystemStatus.WRITING || systemStatus === SystemStatus.REVIEWING} 
          aria-disabled={systemStatus === SystemStatus.WRITING || systemStatus === SystemStatus.REVIEWING}
          className="w-full sm:w-auto flex-grow px-6 py-3 bg-neutral text-white font-semibold rounded-md shadow-md hover:bg-neutral/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 ease-in-out"
        >
          {t.configPanel.resetButton}
        </button>
      </div>
    </div>
  );
};