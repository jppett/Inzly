import React from 'react';
import { AddressSearch } from '../components/AddressSearch';
import { AddressRequestTable } from '../components/AddressRequestTable';
import { Building, BarChart3, TrendingUp } from 'lucide-react';
import type { AddressRequest } from '../types/api';

export const HomePage: React.FC = () => {
  const handleAddressSelect = (address: AddressRequest) => {
    // Refresh the table by letting React Query handle the cache invalidation
    console.log('Address selected:', address);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Building className="w-8 h-8 text-primary-600 mr-3" />
              <h1 className="text-xl font-bold text-gray-900">Bones Report</h1>
            </div>
            <div className="text-sm text-gray-600">
              Property Analysis Platform
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Property Investment Analysis
          </h2>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            Get comprehensive property reports including market analysis, rental estimates, 
            and investment potential for any address.
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-8">
            <AddressSearch 
              onAddressSelect={handleAddressSelect}
              className="w-full"
            />
          </div>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12">
            <div className="card text-center">
              <BarChart3 className="w-12 h-12 text-primary-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Market Analysis
              </h3>
              <p className="text-gray-600 text-sm">
                Get detailed market metrics, price trends, and comparable properties
              </p>
            </div>
            
            <div className="card text-center">
              <TrendingUp className="w-12 h-12 text-primary-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Rental Estimates
              </h3>
              <p className="text-gray-600 text-sm">
                Accurate rental price estimates based on current market data
              </p>
            </div>
            
            <div className="card text-center">
              <Building className="w-12 h-12 text-primary-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Investment Score
              </h3>
              <p className="text-gray-600 text-sm">
                AI-powered investment potential scoring and recommendations
              </p>
            </div>
          </div>
        </div>

        {/* Address Requests Table */}
        <AddressRequestTable />
      </main>
    </div>
  );
};