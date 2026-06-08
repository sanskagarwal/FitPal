// Small badge shown when the AI is not fully confident about a food's nutrition.
export const ConfidenceBadge = ({ confidence }: { confidence?: 'high' | 'medium' | 'low' }) => {
  if (!confidence || confidence === 'high') return null;
  const isLow = confidence === 'low';
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
        isLow ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
      }`}
      title="The AI estimated these values. You can edit the calories."
    >
      ~estimated
    </span>
  );
};
