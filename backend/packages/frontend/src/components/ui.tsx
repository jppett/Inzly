import React from 'react';
import { clsx } from 'clsx';
import type { AddressRequest } from '../types/api';

interface StatusBadgeProps {
  status: AddressRequest['status'];
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  return (
    <span
      className={clsx(
        'status-badge',
        {
          'status-pending': status === 'pending',
          'status-processing': status === 'processing', 
          'status-processed': status === 'processed',
          'status-failed': status === 'failed',
        },
        className
      )}
    >
      {status}
    </span>
  );
};

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  className 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6', 
    lg: 'w-8 h-8',
  };

  return (
    <div className={clsx('flex justify-center items-center', className)}>
      <div
        className={clsx(
          'animate-spin rounded-full border-2 border-gray-300 border-t-primary-600',
          sizeClasses[size]
        )}
      />
    </div>
  );
};

interface ErrorMessageProps {
  message: string;
  className?: string;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, className }) => {
  return (
    <div className={clsx('text-red-600 text-sm', className)}>
      {message}
    </div>
  );
};

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  action,
  className,
}) => {
  return (
    <div className={clsx('text-center py-12', className)}>
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      {description && (
        <p className="text-gray-500 mb-4">{description}</p>
      )}
      {action}
    </div>
  );
};