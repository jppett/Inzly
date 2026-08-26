import React, { useState } from 'react';
import { Search, MapPin, Plus } from 'lucide-react';
import { useSearchAddressRequests, useCreateAddressRequest } from '../hooks/useApi';
import { LoadingSpinner, ErrorMessage } from './ui';
import type { AddressRequest } from '../types/api';

interface AddressSearchProps {
  onAddressSelect?: (address: AddressRequest) => void;
  className?: string;
}

export const AddressSearch: React.FC<AddressSearchProps> = ({
  onAddressSelect,
  className = '',
}) => {
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  
  const { data: searchResults, isLoading: isSearching } = useSearchAddressRequests(query);
  const createMutation = useCreateAddressRequest();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setShowResults(value.length > 0);
  };

  const handleAddressSelect = (address: AddressRequest) => {
    setQuery(address.address);
    setShowResults(false);
    onAddressSelect?.(address);
  };

  const handleCreateNew = async () => {
    if (!query.trim()) return;
    
    try {
      const newRequest = await createMutation.mutateAsync({ address: query.trim() });
      setQuery('');
      setShowResults(false);
      onAddressSelect?.(newRequest);
    } catch (error) {
      console.error('Failed to create address request:', error);
    }
  };

  const exactMatch = searchResults?.find(
    result => result.address.toLowerCase() === query.toLowerCase()
  );

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          placeholder="Enter property address..."
          className="input pl-10 pr-4"
          onFocus={() => setShowResults(query.length > 0)}
          onBlur={() => setTimeout(() => setShowResults(false), 150)}
        />
      </div>

      {showResults && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {isSearching ? (
            <div className="p-4">
              <LoadingSpinner size="sm" />
            </div>
          ) : (
            <>
              {searchResults && searchResults.length > 0 ? (
                <div className="py-2">
                  <div className="px-3 py-1 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Existing Addresses
                  </div>
                  {searchResults.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => handleAddressSelect(result)}
                      className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center justify-between"
                    >
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-sm">{result.address}</span>
                      </div>
                      <span className={`status-badge status-${result.status}`}>
                        {result.status}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}

              {query.trim() && !exactMatch && (
                <div className="border-t border-gray-200">
                  <button
                    onClick={handleCreateNew}
                    disabled={createMutation.isPending}
                    className="w-full px-3 py-3 text-left hover:bg-gray-50 flex items-center text-primary-600 disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    <span className="text-sm font-medium">
                      Create new request for "{query}"
                    </span>
                    {createMutation.isPending && (
                      <LoadingSpinner size="sm" className="ml-auto" />
                    )}
                  </button>
                </div>
              )}
            </>
          )}

          {createMutation.error && (
            <div className="p-3 border-t border-gray-200">
              <ErrorMessage 
                message={createMutation.error.message || 'Failed to create address request'} 
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};