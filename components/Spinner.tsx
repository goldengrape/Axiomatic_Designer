
import React from 'react';
import { useLocale } from '../contexts/LocaleContext'; // Import useLocale

const Spinner: React.FC = () => {
  const { t } = useLocale(); // Use locale hook
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50" aria-live="assertive" role="alert">
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary"></div>
      <p className="ml-4 text-white text-xl">{t.spinner.processing}</p>
    </div>
  );
};

export default Spinner;
