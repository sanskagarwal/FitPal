import { useState } from 'react';
import { Food } from '../../types';
import { analyzeFoodWithAI } from '../../services/openai';

// Wraps the existing AI food-search call and its surrounding UI state.
export const useFoodSearch = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Food[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    setError(null);
    try {
      const results = await analyzeFoodWithAI(searchQuery);
      setSearchResults(results);
      setHasSearched(true);
    } catch (error) {
      console.error('Search error:', error);
      setError(error instanceof Error ? error.message : 'Failed to search for food. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  // Clear results/query after a food has been added to the selection.
  const clearSearch = () => {
    setSearchResults([]);
    setSearchQuery('');
    setHasSearched(false);
  };

  return {
    searchQuery,
    setSearchQuery,
    searching,
    searchResults,
    hasSearched,
    error,
    handleSearch,
    clearSearch,
  };
};
