import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, TrendingUp, Clock } from 'lucide-react';
import { useAddressRequests } from '../hooks/useApi';
import { LoadingSpinner, ErrorMessage, EmptyState, StatusBadge } from './ui';
import type { AddressRequest } from '../types/api';

interface AddressRequestTableProps {
  className?: string;
}

export const AddressRequestTable: React.FC<AddressRequestTableProps> = ({ 
  className = '' 
}) => {
  const navigate = useNavigate();
  const { data: requests, isLoading, error } = useAddressRequests();

  if (isLoading) {
    return (
      <div className={`card ${className}`}>
        <LoadingSpinner size="lg" className="py-8" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`card ${className}`}>
        <ErrorMessage message="Failed to load address requests" />
      </div>
    );
  }

  if (!requests || requests.length === 0) {
    return (
      <div className={`card ${className}`}>
        <EmptyState 
          title="No address requests found"
          description="Start by creating your first property analysis request"
        />
      </div>
    );
  }

  const handleRowClick = (request: AddressRequest) => {
    if (request.status === 'processed') {
      navigate(`/property/${request.id}`);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusIcon = (status: AddressRequest['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'processing':
        return <TrendingUp className="w-4 h-4" />;
      case 'processed':
        return <TrendingUp className="w-4 h-4" />;
      case 'failed':
        return <Clock className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className={`card ${className}`}>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Address Requests</h2>
        <p className="text-gray-600">Track the status of your property analysis requests</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-medium text-gray-700">Address</th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">Created</th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((request) => (
              <tr 
                key={request.id}
                className={`
                  border-b border-gray-100 hover:bg-gray-50 transition-colors
                  ${request.status === 'processed' ? 'cursor-pointer' : ''}
                `}
                onClick={() => handleRowClick(request)}
              >
                <td className="py-4 px-4">
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {request.address}
                    </span>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center">
                    {getStatusIcon(request.status)}
                    <StatusBadge status={request.status} className="ml-2" />
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="w-4 h-4 mr-1" />
                    {formatDate(request.created_at)}
                  </div>
                </td>
                <td className="py-4 px-4">
                  {request.status === 'processed' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/property/${request.id}`);
                      }}
                      className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                    >
                      View Report
                    </button>
                  )}
                  {request.status === 'processing' && (
                    <span className="text-sm text-gray-500">Processing...</span>
                  )}
                  {request.status === 'pending' && (
                    <span className="text-sm text-gray-500">Queued</span>
                  )}
                  {request.status === 'failed' && (
                    <span className="text-sm text-red-600">Failed</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};