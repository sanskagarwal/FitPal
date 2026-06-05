import { Sparkles } from 'lucide-react';
import { Spinner, LoadingBlock } from '../Spinner';

interface AIGoalSuggestionProps {
  gettingSuggestion: boolean;
  aiExplanation: string;
  onGetSuggestions: () => void;
}

export const AIGoalSuggestion = ({ gettingSuggestion, aiExplanation, onGetSuggestions }: AIGoalSuggestionProps) => {
  return (
    <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <h3 className="font-semibold text-purple-900">AI-Powered Goal Suggestions</h3>
        </div>
        <button
          type="button"
          onClick={onGetSuggestions}
          disabled={gettingSuggestion}
          className="btn-primary bg-purple-600 hover:bg-purple-700 flex items-center gap-2"
        >
          {gettingSuggestion && <Spinner className="w-4 h-4" />}
          {gettingSuggestion ? 'Getting Suggestions...' : 'Get AI Suggestions'}
        </button>
      </div>
      {gettingSuggestion ? (
        <div className="bg-white p-3 rounded">
          <LoadingBlock label="Crunching your profile and target to recommend goals…" />
        </div>
      ) : aiExplanation ? (
        <div className="bg-white p-3 rounded text-sm text-gray-700 whitespace-pre-line leading-relaxed">
          {aiExplanation}
        </div>
      ) : (
        <p className="text-sm text-purple-700">
          Get personalized nutrition goals based on your profile using AI
        </p>
      )}
    </div>
  );
};
