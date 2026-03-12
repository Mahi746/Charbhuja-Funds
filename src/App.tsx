import React, { useState, useEffect, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Lock, 
  LogOut, 
  Plus, 
  History, 
  Search, 
  Filter, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Wallet, 
  Building2, 
  Users, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Menu,
  X,
  IndianRupee
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Loan, Repayment, Transaction, FundCycle, Party, User } from './types';
import { calculateInterest, formatCurrency, formatDate } from './utils';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---

const Card = ({ children, className, ...props }: { children: React.ReactNode; className?: string; [key: string]: any }) => (
  <div {...props} className={cn("bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden", className)}>
    {children}
  </div>
);

const StatCard = ({ label, value, subValue, icon: Icon, trend, color = "slate" }: any) => {
  const colors: any = {
    slate: "text-slate-600 bg-slate-50",
    emerald: "text-emerald-600 bg-emerald-50",
    amber: "text-amber-600 bg-amber-50",
    rose: "text-rose-600 bg-rose-50",
    indigo: "text-indigo-600 bg-indigo-50",
  };

  return (
    <Card className="p-5 flex items-start justify-between">
      <div>
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">{label}</p>
        <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
        {subValue && <p className="text-xs text-slate-400 mt-1">{subValue}</p>}
      </div>
      <div className={cn("p-2.5 rounded-xl", colors[color])}>
        <Icon size={20} />
      </div>
    </Card>
  );
};

// --- Pages ---

const PublicDashboard = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [partyFilter, setPartyFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("Active");

  useEffect(() => {
    fetch('/api/dashboard-data')
      .then(res => res.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    if (!data) return null;
    const { loans, repayments, cycle } = data;
    
    const totalDisbursed = loans.reduce((acc: number, l: Loan) => acc + l.principal_amount, 0);
    const totalRepaid = repayments.reduce((acc: number, r: Repayment) => acc + r.amount_paid, 0);
    
    let totalLiveInterest = 0;
    let outstandingPrincipal = 0;
    
    loans.forEach((l: Loan) => {
      if (l.status === 'Active') {
        const { interest } = calculateInterest(l.principal_amount, l.annual_interest_rate, l.disbursed_date);
        totalLiveInterest += interest;
        
        const loanRepayments = repayments.filter((r: Repayment) => r.loan_id === l.id)
          .reduce((acc: number, r: Repayment) => acc + r.amount_paid, 0);
        outstandingPrincipal += (l.principal_amount - loanRepayments);
      }
    });

    const openingFund = cycle.opening_balance_p1 + cycle.opening_balance_p2;
    const availableFunds = openingFund + totalRepaid - totalDisbursed;

    return {
      totalFund: openingFund,
      totalDisbursed,
      totalRepaid,
      outstandingPrincipal,
      liveInterest: totalLiveInterest,
      recoverable: outstandingPrincipal + totalLiveInterest,
      availableFunds,
      activeLoans: loans.filter((l: Loan) => l.status === 'Active').length
    };
  }, [data]);

  const filteredLoans = useMemo(() => {
    if (!data) return [];
    return data.loans.filter((l: Loan) => {
      const matchesSearch = l.borrower_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesParty = partyFilter === "all" || l.party_id.toString() === partyFilter;
      const matchesStatus = statusFilter === "all" || l.status === statusFilter;
      return matchesSearch && matchesParty && matchesStatus;
    }).sort((a: Loan, b: Loan) => new Date(b.disbursed_date).getTime() - new Date(a.disbursed_date).getTime());
  }, [data, searchTerm, partyFilter, statusFilter]);

  if (loading) return <div className="flex items-center justify-center min-h-screen">Loading Dashboard...</div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-600 p-2 rounded-lg">
              <Building2 className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-none">Village Fund</h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Live Dashboard</p>
            </div>
          </div>
          <Link to="/login" className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors">
            <Lock size={16} />
            <span>Manager Login</span>
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Info Banner */}
        <div className="mb-8 bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex items-start gap-4">
          <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
            <AlertCircle size={20} />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-indigo-900">View-Only Access</h4>
            <p className="text-sm text-indigo-700 mt-0.5">
              This dashboard is for transparency. Only authorized managers can update records.
              Cycle: {formatDate(data.cycle.start_date)} to {formatDate(data.cycle.end_date)}
            </p>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Fund Value" value={formatCurrency(stats?.totalFund || 0)} icon={Wallet} color="indigo" />
          <StatCard label="Available Funds" value={formatCurrency(stats?.availableFunds || 0)} icon={CheckCircle2} color="emerald" />
          <StatCard label="Outstanding Principal" value={formatCurrency(stats?.outstandingPrincipal || 0)} icon={ArrowUpRight} color="amber" />
          <StatCard label="Live Interest Accrued" value={formatCurrency(stats?.liveInterest || 0)} icon={Clock} color="amber" />
          <StatCard label="Total Recoverable" value={formatCurrency(stats?.recoverable || 0)} icon={IndianRupee} color="indigo" />
          <StatCard label="Total Disbursed" value={formatCurrency(stats?.totalDisbursed || 0)} icon={ArrowUpRight} color="slate" />
          <StatCard label="Total Repaid" value={formatCurrency(stats?.totalRepaid || 0)} icon={ArrowDownLeft} color="emerald" />
          <StatCard label="Active Loans" value={stats?.activeLoans || 0} icon={Users} color="slate" />
        </div>

        {/* Party Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {data.parties.map((p: Party) => {
            const partyLoans = data.loans.filter((l: Loan) => l.party_id === p.id);
            const partyRepayments = data.repayments.filter((r: Repayment) => r.party_id === p.id);
            const disbursed = partyLoans.reduce((acc: number, l: Loan) => acc + l.principal_amount, 0);
            const repaid = partyRepayments.reduce((acc: number, r: Repayment) => acc + r.amount_paid, 0);
            const opening = p.id === 1 ? data.cycle.opening_balance_p1 : data.cycle.opening_balance_p2;
            
            return (
              <Card key={p.id} className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-slate-900">{p.name}</h3>
                  <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">Party Fund</span>
                </div>
                <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Opening Fund</p>
                    <p className="text-base font-semibold text-slate-900">{formatCurrency(opening)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Available</p>
                    <p className="text-base font-semibold text-emerald-600">{formatCurrency(opening + repaid - disbursed)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Disbursed</p>
                    <p className="text-base font-semibold text-slate-900">{formatCurrency(disbursed)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Repaid</p>
                    <p className="text-base font-semibold text-slate-900">{formatCurrency(repaid)}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Loans Table */}
        <Card className="mb-8">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="text-lg font-bold text-slate-900">Active Loans</h3>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Search borrower..." 
                  className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <select 
                className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none"
                value={partyFilter}
                onChange={(e) => setPartyFilter(e.target.value)}
              >
                <option value="all">All Parties</option>
                {data.parties.map((p: Party) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <select 
                className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="Active">Active Only</option>
                <option value="Closed">Closed Only</option>
                <option value="all">All Status</option>
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Borrower</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Party</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Principal</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date Taken</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Days</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Interest</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Repaid</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLoans.map((l: Loan) => {
                  const { interest, daysElapsed } = calculateInterest(l.principal_amount, l.annual_interest_rate, l.disbursed_date);
                  const loanRepayments = data.repayments.filter((r: Repayment) => r.loan_id === l.id)
                    .reduce((acc: number, r: Repayment) => acc + r.amount_paid, 0);
                  const totalDue = l.principal_amount + interest - loanRepayments;

                  return (
                    <tr key={l.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-slate-900">{l.borrower_name}</p>
                        <span className={cn(
                          "text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded",
                          l.status === 'Active' ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                        )}>
                          {l.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{l.party_name}</td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">{formatCurrency(l.principal_amount)}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{formatDate(l.disbursed_date)}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{daysElapsed}</td>
                      <td className="px-6 py-4 text-sm font-medium text-amber-600">{formatCurrency(interest)}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{formatCurrency(loanRepayments)}</td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-slate-900">{formatCurrency(totalDue)}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-lg font-bold text-slate-900">Recent Transactions</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Party</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Details</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.transactions.map((t: Transaction) => (
                  <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-600">{formatDate(t.transaction_date)}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full",
                        t.transaction_type.includes('Disbursed') ? "bg-amber-100 text-amber-700" :
                        t.transaction_type.includes('Received') ? "bg-emerald-100 text-emerald-700" :
                        "bg-slate-100 text-slate-600"
                      )}>
                        {t.transaction_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{t.party_name}</td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-slate-900">{t.borrower_name || '-'}</p>
                      {t.notes && <p className="text-xs text-slate-400 truncate max-w-[200px]">{t.notes}</p>}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-900 text-right">
                      {formatCurrency(t.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </main>

      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 border-t border-slate-200 mt-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-slate-500 text-xs leading-relaxed">
          <div>
            <p>• All calculations are based on simple interest at 18 percent annually unless changed by admin.</p>
            <p>• This page is updated live when authorized managers add or edit entries.</p>
          </div>
          <div>
            <p>• Please cross verify physical cash and bank records during annual Holi settlement.</p>
            <p>• For any discrepancies, contact the village fund committee.</p>
          </div>
          <div className="text-right">
            <p>© 2026 Village Fund Management System</p>
            <p>Built for transparency and trust.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

const LoginPage = ({ onLogin }: { onLogin: (user: User) => void }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (data.success) {
      onLogin(data.user);
      navigate('/manager');
    } else {
      setError("Invalid username or password");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="bg-emerald-600 w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-200">
            <Lock className="text-white" size={24} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Manager Login</h2>
          <p className="text-slate-500 text-sm mt-1">Authorized fund managers only</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Username</label>
            <input 
              type="text" 
              required
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Password</label>
            <input 
              type="password" 
              required
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <div className="bg-rose-50 text-rose-600 text-sm p-3 rounded-xl flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <button 
            type="submit" 
            className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
          >
            Login to Dashboard
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <Link to="/" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">
            ← Back to Public Dashboard
          </Link>
        </div>
      </Card>
    </div>
  );
};

const ManagerDashboard = ({ user, onLogout }: { user: User; onLogout: () => void }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("loans");
  
  // Form States
  const [loanForm, setLoanForm] = useState({ borrower_name: "", party_id: "1", principal_amount: "", disbursed_date: new Date().toISOString().split('T')[0], notes: "" });
  const [repaymentForm, setRepaymentForm] = useState({ loan_id: "", payment_date: new Date().toISOString().split('T')[0], amount_paid: "", payment_mode: "Cash", notes: "" });
  const [fundForm, setFundForm] = useState({ party_id: "1", transaction_type: "Cash Deposit", amount: "", transaction_date: new Date().toISOString().split('T')[0], notes: "" });

  const refreshData = () => {
    setLoading(true);
    fetch('/api/dashboard-data')
      .then(res => res.json())
      .then(setData)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleAddLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/loans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...loanForm, user_id: user.id })
    });
    const result = await res.json();
    if (res.ok) {
      alert("Loan added successfully!");
      setLoanForm({ borrower_name: "", party_id: "1", principal_amount: "", disbursed_date: new Date().toISOString().split('T')[0], notes: "" });
      refreshData();
    } else {
      alert(result.message || "Failed to add loan");
    }
  };

  const handleAddRepayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/repayments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...repaymentForm, user_id: user.id })
    });
    if (res.ok) {
      alert("Repayment recorded successfully!");
      setRepaymentForm({ loan_id: "", payment_date: new Date().toISOString().split('T')[0], amount_paid: "", payment_mode: "Cash", notes: "" });
      refreshData();
    }
  };

  const handleFundTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/fund-transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...fundForm, user_id: user.id })
    });
    if (res.ok) {
      alert("Transaction recorded successfully!");
      setFundForm({ party_id: "1", transaction_type: "Cash Deposit", amount: "", transaction_date: new Date().toISOString().split('T')[0], notes: "" });
      refreshData();
    }
  };

  const handleCloseLoan = async (loanId: number) => {
    if (confirm("Are you sure you want to mark this loan as closed?")) {
      const res = await fetch('/api/loans/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loan_id: loanId, user_id: user.id })
      });
      if (res.ok) refreshData();
    }
  };

  if (loading && !data) return <div className="flex items-center justify-center min-h-screen">Loading Manager Dashboard...</div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-slate-900 p-2 rounded-lg">
              <LayoutDashboard className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-none">Manager Panel</h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Logged in as {user.username}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/" className="text-sm font-medium text-slate-600 hover:text-slate-900">View Public Site</Link>
            <button 
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 rounded-xl text-sm font-medium hover:bg-rose-100 transition-colors"
            >
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
          {[
            { id: "loans", label: "Loan Ledger", icon: Users },
            { id: "add-loan", label: "New Loan", icon: Plus },
            { id: "repayment", label: "Repayment", icon: ArrowDownLeft },
            { id: "fund", label: "Fund Entry", icon: Wallet },
            { id: "history", label: "Transactions", icon: History },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
                activeTab === tab.id 
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-100" 
                  : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
              )}
            >
              <tab.icon size={18} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "loans" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <Card>
                <div className="p-6 border-b border-slate-100">
                  <h3 className="text-lg font-bold text-slate-900">Manage All Loans</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50">
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Borrower</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Principal</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Due Today</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.loans.map((l: Loan) => {
                        const { interest } = calculateInterest(l.principal_amount, l.annual_interest_rate, l.disbursed_date);
                        const loanRepayments = data.repayments.filter((r: Repayment) => r.loan_id === l.id)
                          .reduce((acc: number, r: Repayment) => acc + r.amount_paid, 0);
                        const totalDue = l.principal_amount + interest - loanRepayments;

                        return (
                          <tr key={l.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4">
                              <p className="text-sm font-bold text-slate-900">{l.borrower_name}</p>
                              <p className="text-xs text-slate-500">{l.party_name} • {formatDate(l.disbursed_date)}</p>
                            </td>
                            <td className="px-6 py-4 text-sm font-medium text-slate-900">{formatCurrency(l.principal_amount)}</td>
                            <td className="px-6 py-4 text-sm font-bold text-amber-600">{formatCurrency(totalDue)}</td>
                            <td className="px-6 py-4">
                              <span className={cn(
                                "text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full",
                                l.status === 'Active' ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                              )}>
                                {l.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {l.status === 'Active' && (
                                  <button 
                                    onClick={() => handleCloseLoan(l.id)}
                                    className="p-2 text-slate-400 hover:text-emerald-600 transition-colors"
                                    title="Mark as Closed"
                                  >
                                    <CheckCircle2 size={18} />
                                  </button>
                                )}
                                <button 
                                  onClick={() => {
                                    setRepaymentForm({ ...repaymentForm, loan_id: l.id.toString() });
                                    setActiveTab("repayment");
                                  }}
                                  className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                                  title="Add Repayment"
                                >
                                  <ArrowDownLeft size={18} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            </motion.div>
          )}

          {activeTab === "add-loan" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <Card className="max-w-2xl mx-auto p-8">
                <h3 className="text-xl font-bold text-slate-900 mb-6">Disburse New Loan</h3>
                <form onSubmit={handleAddLoan} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Borrower Name</label>
                      <input 
                        type="text" required
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        value={loanForm.borrower_name}
                        onChange={(e) => setLoanForm({ ...loanForm, borrower_name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Party</label>
                      <select 
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                        value={loanForm.party_id}
                        onChange={(e) => setLoanForm({ ...loanForm, party_id: e.target.value })}
                      >
                        {data.parties.map((p: Party) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Principal Amount</label>
                      <input 
                        type="number" required min="1"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        value={loanForm.principal_amount}
                        onChange={(e) => setLoanForm({ ...loanForm, principal_amount: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Disbursement Date</label>
                      <input 
                        type="date" required
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                        value={loanForm.disbursed_date}
                        onChange={(e) => setLoanForm({ ...loanForm, disbursed_date: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Notes (Optional)</label>
                    <textarea 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none h-24"
                      value={loanForm.notes}
                      onChange={(e) => setLoanForm({ ...loanForm, notes: e.target.value })}
                    />
                  </div>
                  <button type="submit" className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100">
                    Confirm Disbursement
                  </button>
                </form>
              </Card>
            </motion.div>
          )}

          {activeTab === "repayment" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <Card className="max-w-2xl mx-auto p-8">
                <h3 className="text-xl font-bold text-slate-900 mb-6">Record Repayment</h3>
                <form onSubmit={handleAddRepayment} className="space-y-6">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Select Loan</label>
                    <select 
                      required
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                      value={repaymentForm.loan_id}
                      onChange={(e) => setRepaymentForm({ ...repaymentForm, loan_id: e.target.value })}
                    >
                      <option value="">-- Select Borrower --</option>
                      {data.loans.filter((l: Loan) => l.status === 'Active').map((l: Loan) => (
                        <option key={l.id} value={l.id}>{l.borrower_name} ({l.party_name})</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Repayment Amount</label>
                      <input 
                        type="number" required min="1"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                        value={repaymentForm.amount_paid}
                        onChange={(e) => setRepaymentForm({ ...repaymentForm, amount_paid: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Payment Date</label>
                      <input 
                        type="date" required
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                        value={repaymentForm.payment_date}
                        onChange={(e) => setRepaymentForm({ ...repaymentForm, payment_date: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Payment Mode</label>
                      <select 
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                        value={repaymentForm.payment_mode}
                        onChange={(e) => setRepaymentForm({ ...repaymentForm, payment_mode: e.target.value as any })}
                      >
                        <option value="Cash">Cash</option>
                        <option value="Bank">Bank</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Notes</label>
                    <textarea 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none h-24"
                      value={repaymentForm.notes}
                      onChange={(e) => setRepaymentForm({ ...repaymentForm, notes: e.target.value })}
                    />
                  </div>
                  <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
                    Record Payment
                  </button>
                </form>
              </Card>
            </motion.div>
          )}

          {activeTab === "fund" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <Card className="max-w-2xl mx-auto p-8">
                <h3 className="text-xl font-bold text-slate-900 mb-6">Fund / Cash / Bank Entry</h3>
                <form onSubmit={handleFundTransaction} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Transaction Type</label>
                      <select 
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                        value={fundForm.transaction_type}
                        onChange={(e) => setFundForm({ ...fundForm, transaction_type: e.target.value })}
                      >
                        <option value="Cash Deposit">Cash Deposit</option>
                        <option value="Cash Withdrawal">Cash Withdrawal</option>
                        <option value="Bank Deposit">Bank Deposit</option>
                        <option value="Bank Withdrawal">Bank Withdrawal</option>
                        <option value="Manual Adjustment">Manual Adjustment</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Party</label>
                      <select 
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                        value={fundForm.party_id}
                        onChange={(e) => setFundForm({ ...fundForm, party_id: e.target.value })}
                      >
                        {data.parties.map((p: Party) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Amount</label>
                      <input 
                        type="number" required min="1"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                        value={fundForm.amount}
                        onChange={(e) => setFundForm({ ...fundForm, amount: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Date</label>
                      <input 
                        type="date" required
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                        value={fundForm.transaction_date}
                        onChange={(e) => setFundForm({ ...fundForm, transaction_date: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Notes</label>
                    <textarea 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none h-24"
                      value={fundForm.notes}
                      onChange={(e) => setFundForm({ ...fundForm, notes: e.target.value })}
                    />
                  </div>
                  <button type="submit" className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-100">
                    Submit Entry
                  </button>
                </form>
              </Card>
            </motion.div>
          )}

          {activeTab === "history" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <Card>
                <div className="p-6 border-b border-slate-100">
                  <h3 className="text-lg font-bold text-slate-900">Full Transaction History</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50">
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Party</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Details</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.transactions.map((t: Transaction) => (
                        <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 text-sm text-slate-600">{formatDate(t.transaction_date)}</td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full",
                              t.transaction_type.includes('Disbursed') ? "bg-amber-100 text-amber-700" :
                              t.transaction_type.includes('Received') ? "bg-emerald-100 text-emerald-700" :
                              "bg-slate-100 text-slate-600"
                            )}>
                              {t.transaction_type}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">{t.party_name}</td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-medium text-slate-900">{t.borrower_name || '-'}</p>
                            {t.notes && <p className="text-xs text-slate-400 truncate max-w-[200px]">{t.notes}</p>}
                          </td>
                          <td className="px-6 py-4 text-sm font-bold text-slate-900 text-right">
                            {formatCurrency(t.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('village_fund_user');
    return saved ? JSON.parse(saved) : null;
  });

  const handleLogin = (user: User) => {
    setUser(user);
    localStorage.setItem('village_fund_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('village_fund_user');
  };

  return (
    <Router>
      <Routes>
        <Route path="/" element={<PublicDashboard />} />
        <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
        <Route 
          path="/manager" 
          element={user ? <ManagerDashboard user={user} onLogout={handleLogout} /> : <Navigate to="/login" />} 
        />
      </Routes>
    </Router>
  );
}
