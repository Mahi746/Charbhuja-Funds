import { differenceInDays, parseISO } from 'date-fns';

export const calculateInterest = (principal: number, annualRate: number, startDate: string, endDate: string = new Date().toISOString()) => {
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  const daysElapsed = Math.max(0, differenceInDays(end, start));
  
  // interest = principal_amount × 0.18 × (days_elapsed / 365)
  const interest = principal * annualRate * (daysElapsed / 365);
  
  return {
    interest: Math.round(interest * 100) / 100,
    daysElapsed
  };
};

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
};

export const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};
