import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, DollarSign, Home, TrendingUp, MapPin, Calendar } from 'lucide-react';
import { useAddressRequest, useBonesReportByAddressRequest } from '../hooks/useApi';
import { LoadingSpinner, ErrorMessage, StatusBadge } from '../components/ui';

export const PropertyDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const { data: addressRequest, isLoading: isLoadingRequest } = useAddressRequest(id!);
  const { data: bonesReport, isLoading: isLoadingReport } = useBonesReportByAddressRequest(id!);

  if (isLoadingRequest || isLoadingReport) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!addressRequest) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <ErrorMessage message="Address request not found" />
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => navigate('/')}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Dashboard
            </button>
            <StatusBadge status={addressRequest.status} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Property Header */}
        <div className="card mb-8">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center mb-2">
                <MapPin className="w-5 h-5 text-gray-400 mr-2" />
                <h1 className="text-2xl font-bold text-gray-900">{addressRequest.address}</h1>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <Calendar className="w-4 h-4 mr-1" />
                Created {new Date(addressRequest.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>

        {addressRequest.status !== 'processed' ? (
          <div className="card text-center py-12">
            <div className="mb-4">
              <StatusBadge status={addressRequest.status} className="text-base" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {addressRequest.status === 'pending' && 'Request Queued'}
              {addressRequest.status === 'processing' && 'Analysis In Progress'}
              {addressRequest.status === 'failed' && 'Analysis Failed'}
            </h3>
            <p className="text-gray-600">
              {addressRequest.status === 'pending' && 'Your request is in the queue and will be processed soon.'}
              {addressRequest.status === 'processing' && 'We\'re analyzing the property data. This usually takes a few minutes.'}
              {addressRequest.status === 'failed' && 'There was an error processing your request. Please try again.'}
            </p>
          </div>
        ) : bonesReport ? (
          <>
            {/* Property Overview */}
            <div className="grid lg:grid-cols-3 gap-6 mb-8">
              <div className="card">
                <div className="flex items-center mb-3">
                  <DollarSign className="w-5 h-5 text-green-600 mr-2" />
                  <h3 className="font-semibold text-gray-900">Estimated Value</h3>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {bonesReport.report_data.estimatedValue 
                    ? formatCurrency(bonesReport.report_data.estimatedValue)
                    : 'N/A'
                  }
                </p>
                {bonesReport.report_data.summary?.propertyValueRange && (
                  <p className="text-sm text-gray-600 mt-1">
                    Range: {formatCurrency(bonesReport.report_data.summary.propertyValueRange.low)} - {formatCurrency(bonesReport.report_data.summary.propertyValueRange.high)}
                  </p>
                )}
              </div>

              <div className="card">
                <div className="flex items-center mb-3">
                  <Home className="w-5 h-5 text-blue-600 mr-2" />
                  <h3 className="font-semibold text-gray-900">Monthly Rent</h3>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {bonesReport.report_data.rentEstimate?.median 
                    ? formatCurrency(bonesReport.report_data.rentEstimate.median)
                    : 'N/A'
                  }
                </p>
                {bonesReport.report_data.rentEstimate && (
                  <p className="text-sm text-gray-600 mt-1">
                    Range: {formatCurrency(bonesReport.report_data.rentEstimate.low)} - {formatCurrency(bonesReport.report_data.rentEstimate.high)}
                  </p>
                )}
              </div>

              <div className="card">
                <div className="flex items-center mb-3">
                  <TrendingUp className="w-5 h-5 text-purple-600 mr-2" />
                  <h3 className="font-semibold text-gray-900">Investment Score</h3>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {bonesReport.report_data.summary?.investmentPotential 
                    ? `${bonesReport.report_data.summary.investmentPotential}/100`
                    : 'N/A'
                  }
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {(() => {
                    const score = bonesReport.report_data.summary?.investmentPotential;
                    if (score === undefined) return null;
                    if (score >= 70) return 'Excellent potential';
                    if (score >= 50) return 'Good potential';
                    return 'Fair potential';
                  })()}
                </p>
              </div>
            </div>

            {/* Property Details */}
            <div className="grid lg:grid-cols-2 gap-6 mb-8">
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Property Details</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Property Type</span>
                    <span className="font-medium">{bonesReport.report_data.propertyType || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Bedrooms</span>
                    <span className="font-medium">{bonesReport.report_data.bedrooms || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Bathrooms</span>
                    <span className="font-medium">{bonesReport.report_data.bathrooms || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Square Footage</span>
                    <span className="font-medium">
                      {bonesReport.report_data.squareFootage ? formatNumber(bonesReport.report_data.squareFootage) : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Year Built</span>
                    <span className="font-medium">{bonesReport.report_data.yearBuilt || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Lot Size</span>
                    <span className="font-medium">{bonesReport.report_data.lotSize || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Market Metrics</h3>
                {bonesReport.report_data.marketMetrics ? (
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Avg. Days on Market</span>
                      <span className="font-medium">{bonesReport.report_data.marketMetrics.averageDaysOnMarket} days</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Price per Sq Ft</span>
                      <span className="font-medium">{formatCurrency(bonesReport.report_data.marketMetrics.pricePerSquareFoot)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Appreciation Rate</span>
                      <span className="font-medium">{(bonesReport.report_data.marketMetrics.appreciationRate * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500">Market data not available</p>
                )}
              </div>
            </div>

            {/* Location Info */}
            {bonesReport.report_data.location && (
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Location</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">City</span>
                        <span className="font-medium">{bonesReport.report_data.location.city}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">State</span>
                        <span className="font-medium">{bonesReport.report_data.location.state}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">ZIP Code</span>
                        <span className="font-medium">{bonesReport.report_data.location.zipCode}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Latitude</span>
                        <span className="font-medium">{bonesReport.report_data.location.latitude.toFixed(6)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Longitude</span>
                        <span className="font-medium">{bonesReport.report_data.location.longitude.toFixed(6)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="card text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Report Not Available</h3>
            <p className="text-gray-600">The property analysis report is not yet available.</p>
          </div>
        )}
      </main>
    </div>
  );
};