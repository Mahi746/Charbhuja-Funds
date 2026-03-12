export interface Party {
  id: number;
  name: string;
  is_active: number;
}

export interface FundCycle {
  id: number;
  start_date: string;
  end_date: string;
  annual_interest_rate: number;
  is_active: number;
  is_locked: number;
  opening_balance_p1: number;
  opening_balance_p2: number;
}

export interface Loan {
  id: number;
  borrower_id: number;
  borrower_name: string;
  party_id: number;
  party_name: string;
  cycle_id: number;
  principal_amount: number;
  disbursed_date: string;
  annual_interest_rate: number;
  status: 'Active' | 'Closed';
  notes: string;
  created_at: string;
}

export interface Repayment {
  id: number;
  loan_id: number;
  party_id: number; // Added this
  payment_date: string;
  amount_paid: number;
  payment_mode: 'Cash' | 'Bank';
  notes: string;
  created_at: string;
}

export interface Transaction {
  id: number;
  party_id: number;
  party_name: string;
  loan_id?: number;
  borrower_name?: string;
  transaction_type: string;
  amount: number;
  transaction_date: string;
  notes: string;
  created_at: string;
}

export interface User {
  id: number;
  username: string;
  role: 'admin' | 'manager';
  party_id?: number;
}
