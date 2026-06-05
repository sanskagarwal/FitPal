import { Search, Plus } from 'lucide-react';
import { Food } from '../../types';
import { Spinner } from '../Spinner';
import { ConfidenceBadge } from './ConfidenceBadge';

interface FoodSearchProps {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  searching: boolean;
  searchResults: Food[];
  hasSearched: boolean;
  error: string | null;
  onSearch: () => void;
  onAddFood: (food: Food) => void;
}

export const FoodSearch = ({
  searchQuery,
  setSearchQuery,
  searching,
  searchResults,
  hasSearched,
  error,
  onSearch,
  onAddFood,
}: FoodSearchProps) => {
  return (
    <div className="card">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Search Indian Foods
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !searching && onSearch()}
          placeholder="e.g., dosa, dal, roti, paneer tikka..."
          className="input-field flex-1"
          aria-label="Search Indian foods"
        />
        <button
          onClick={onSearch}
          disabled={searching}
          className="btn-primary"
        >
          {searching ? (
            <span className="flex items-center gap-2">
              <Spinner className="w-4 h-4" />
              Searching...
            </span>
          ) : (
            <>
              <Search className="inline w-4 h-4 mr-2" />
              Search
            </>
          )}
        </button>
      </div>

      {/* Loading skeleton */}
      {searching && (
        <div className="mt-4 space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg animate-pulse">
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-gray-200 rounded w-1/3" />
                <div className="h-3 bg-gray-200 rounded w-1/4" />
              </div>
              <div className="h-8 w-16 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800 font-medium">Error:</p>
          <p className="text-sm text-red-700 mt-1">{error}</p>
        </div>
      )}

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="mt-4 space-y-2">
          <h3 className="font-medium text-gray-700">Search Results:</h3>            {searchResults.map((food) => (
            <div
              key={food.id}
              className="flex items-center justify-between gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <div className="min-w-0">
                <p className="font-medium flex items-center gap-2">
                  <span className="truncate">{food.name}</span>
                  <ConfidenceBadge confidence={food.confidence} />
                </p>
                <p className="text-sm text-gray-600">
                  {food.servingSize} • {food.nutrients.calories} cal
                </p>
              </div>
              <button
                onClick={() => onAddFood(food)}
                className="btn-primary text-sm shrink-0"
                aria-label={`Add ${food.name}`}
              >
                <Plus className="inline w-4 h-4" />
                Add
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Empty state when a search returned no matches */}
      {!searching && hasSearched && searchResults.length === 0 && (
        <div className="mt-4 text-center py-8 text-gray-500">
          <Search className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">No foods found. Try a different name or describe the dish.</p>
        </div>
      )}
    </div>
  );
};
