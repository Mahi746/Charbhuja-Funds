import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("village_fund.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT, -- 'admin', 'manager'
    party_id INTEGER
  );

  CREATE TABLE IF NOT EXISTS parties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    is_active INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS fund_cycles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    start_date TEXT,
    end_date TEXT,
    annual_interest_rate REAL DEFAULT 0.18,
    is_active INTEGER DEFAULT 1,
    is_locked INTEGER DEFAULT 0,
    opening_balance_p1 REAL DEFAULT 0,
    opening_balance_p2 REAL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS borrowers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT,
    mobile TEXT,
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS loans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    borrower_id INTEGER,
    party_id INTEGER,
    cycle_id INTEGER,
    principal_amount REAL,
    disbursed_date TEXT,
    annual_interest_rate REAL,
    status TEXT DEFAULT 'Active', -- 'Active', 'Closed'
    notes TEXT,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS repayments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    loan_id INTEGER,
    payment_date TEXT,
    amount_paid REAL,
    payment_mode TEXT, -- 'Cash', 'Bank'
    notes TEXT,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    party_id INTEGER,
    loan_id INTEGER,
    transaction_type TEXT, -- 'Loan Disbursed', 'Repayment Received', 'Cash Deposit', 'Cash Withdrawal', 'Bank Deposit', 'Bank Withdrawal', 'Correction Entry'
    amount REAL,
    transaction_date TEXT,
    notes TEXT,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT,
    entity_id INTEGER,
    action_type TEXT,
    changed_by INTEGER,
    old_value TEXT,
    new_value TEXT,
    change_reason TEXT,
    changed_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Seed initial data if empty
const userCount = db.prepare("SELECT count(*) as count FROM users").get().count;
if (userCount === 0) {
  db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)").run("admin", "admin123", "admin");
  db.prepare("INSERT INTO parties (name) VALUES (?)").run("Party 1");
  db.prepare("INSERT INTO parties (name) VALUES (?)").run("Party 2");
  
  // Current cycle (Holi 2026 to Holi 2027 approx)
  db.prepare("INSERT INTO fund_cycles (start_date, end_date, opening_balance_p1, opening_balance_p2) VALUES (?, ?, ?, ?)").run(
    "2026-03-03", "2027-03-22", 500000, 500000
  );
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE username = ? AND password = ?").get(username, password);
    if (user) {
      const { password, ...userWithoutPassword } = user;
      res.json({ success: true, user: userWithoutPassword });
    } else {
      res.status(401).json({ success: false, message: "Invalid credentials" });
    }
  });

  app.get("/api/dashboard-data", (req, res) => {
    const cycle = db.prepare("SELECT * FROM fund_cycles WHERE is_active = 1").get();
    const parties = db.prepare("SELECT * FROM parties").all();
    const loans = db.prepare(`
      SELECT l.*, b.full_name as borrower_name, p.name as party_name 
      FROM loans l 
      JOIN borrowers b ON l.borrower_id = b.id 
      JOIN parties p ON l.party_id = p.id
      WHERE l.cycle_id = ?
    `).all(cycle.id);

    const repayments = db.prepare(`
      SELECT r.*, l.party_id 
      FROM repayments r 
      JOIN loans l ON r.loan_id = l.id 
      WHERE l.cycle_id = ?
    `).all(cycle.id);

    const transactions = db.prepare(`
      SELECT t.*, p.name as party_name, b.full_name as borrower_name
      FROM transactions t
      JOIN parties p ON t.party_id = p.id
      LEFT JOIN loans l ON t.loan_id = l.id
      LEFT JOIN borrowers b ON l.borrower_id = b.id
      WHERE t.party_id IN (SELECT id FROM parties)
      ORDER BY t.transaction_date DESC, t.id DESC
      LIMIT 50
    `).all();

    res.json({ cycle, parties, loans, repayments, transactions });
  });

  app.post("/api/loans", (req, res) => {
    const { borrower_name, party_id, principal_amount, disbursed_date, notes, user_id } = req.body;
    
    // 1. Find or create borrower
    let borrower = db.prepare("SELECT id FROM borrowers WHERE full_name = ?").get(borrower_name);
    if (!borrower) {
      const result = db.prepare("INSERT INTO borrowers (full_name) VALUES (?)").run(borrower_name);
      borrower = { id: result.lastInsertRowid };
    }

    const cycle = db.prepare("SELECT * FROM fund_cycles WHERE is_active = 1").get();

    // Check available funds
    const loans = db.prepare("SELECT SUM(principal_amount) as total FROM loans WHERE cycle_id = ?").get(cycle.id);
    const repayments = db.prepare(`
      SELECT SUM(amount_paid) as total 
      FROM repayments r 
      JOIN loans l ON r.loan_id = l.id 
      WHERE l.cycle_id = ?
    `).get(cycle.id);
    
    const openingFund = cycle.opening_balance_p1 + cycle.opening_balance_p2;
    const totalDisbursed = loans.total || 0;
    const totalRepaid = repayments.total || 0;
    const availableFunds = openingFund + totalRepaid - totalDisbursed;

    if (principal_amount > availableFunds) {
      return res.status(400).json({ success: false, message: "Insufficient funds available in the village fund." });
    }

    // 2. Insert loan
    const result = db.prepare(`
      INSERT INTO loans (borrower_id, party_id, cycle_id, principal_amount, disbursed_date, annual_interest_rate, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(borrower.id, party_id, cycle.id, principal_amount, disbursed_date, cycle.annual_interest_rate, notes, user_id);

    const loanId = result.lastInsertRowid;

    // 3. Create transaction
    db.prepare(`
      INSERT INTO transactions (party_id, loan_id, transaction_type, amount, transaction_date, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(party_id, loanId, 'Loan Disbursed', principal_amount, disbursed_date, notes, user_id);

    res.json({ success: true, loanId });
  });

  app.post("/api/repayments", (req, res) => {
    const { loan_id, payment_date, amount_paid, payment_mode, notes, user_id } = req.body;
    
    const loan = db.prepare("SELECT * FROM loans WHERE id = ?").get(loan_id);
    
    // 1. Insert repayment
    db.prepare(`
      INSERT INTO repayments (loan_id, payment_date, amount_paid, payment_mode, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(loan_id, payment_date, amount_paid, payment_mode, notes, user_id);

    // 2. Create transaction
    db.prepare(`
      INSERT INTO transactions (party_id, loan_id, transaction_type, amount, transaction_date, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(loan.party_id, loan_id, 'Repayment Received', amount_paid, payment_date, notes, user_id);

    res.json({ success: true });
  });

  app.post("/api/fund-transactions", (req, res) => {
    const { party_id, transaction_type, amount, transaction_date, notes, user_id } = req.body;
    
    db.prepare(`
      INSERT INTO transactions (party_id, transaction_type, amount, transaction_date, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(party_id, transaction_type, amount, transaction_date, notes, user_id);

    res.json({ success: true });
  });

  app.post("/api/loans/close", (req, res) => {
    const { loan_id, user_id } = req.body;
    db.prepare("UPDATE loans SET status = 'Closed', updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(user_id, loan_id);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
