import { pgTable, text, serial, integer, boolean, timestamp, foreignKey, pgEnum, decimal, jsonb, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Enums
export const userRoleEnum = pgEnum('user_role', ['admin', 'sales', 'customer', 'finance']);
export const userStatusEnum = pgEnum('user_status', ['active', 'pending', 'suspended']);
export const subscriptionStatusEnum = pgEnum('subscription_status', ['active', 'pending', 'expired']);
export const discountStatusEnum = pgEnum('discount_status', ['pending', 'approved', 'rejected']);
export const invoiceStatusEnum = pgEnum('invoice_status', ['paid', 'pending', 'overdue']);
export const quoteStatusEnum = pgEnum('quote_status', ['pending', 'accepted', 'rejected', 'expired']);
export const vatRateEnum = pgEnum('vat_rate', ['standard', 'zero', 'exempt', 'reverse_charge']);
export const transactionTypeEnum = pgEnum('transaction_type', ['income', 'expense']);
export const expenseCategoryEnum = pgEnum('expense_category', ['utilities', 'software', 'marketing', 'office', 'payroll', 'other']);

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: userRoleEnum("role").notNull().default('customer'),
  status: userStatusEnum("status").notNull().default('active'),
  company: text("company"),
  phone: text("phone"),
  suspension_reason: text("suspension_reason"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  stripe_customer_id: text("stripe_customer_id"),
  // For sales team
  discount_limit: integer("discount_limit").default(10),
});

export const usersRelations = relations(users, ({ many }) => ({
  subscriptions: many(subscriptions),
  invoices: many(invoices),
  quotes: many(quotes),
  discountRequests: many(discountRequests),
  jobDescriptions: many(jobDescriptions),
}));

// Subscription Plans
export const plans = pgTable("plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: integer("price").notNull(), // in cents
  token_amount: integer("token_amount").notNull(),
  stripe_price_id: text("stripe_price_id"),
  is_active: boolean("is_active").default(true).notNull(),
  features: jsonb("features").default({}).notNull(),
});

export const plansRelations = relations(plans, ({ many }) => ({
  subscriptions: many(subscriptions),
}));

// Subscriptions
export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  plan_id: integer("plan_id").notNull().references(() => plans.id),
  stripe_subscription_id: text("stripe_subscription_id"),
  status: subscriptionStatusEnum("status").notNull().default('pending'),
  start_date: timestamp("start_date").defaultNow().notNull(),
  end_date: timestamp("end_date"),
  token_balance: integer("token_balance").notNull(),
  auto_renew: boolean("auto_renew").default(true).notNull(),
  current_period_start: timestamp("current_period_start"),
  current_period_end: timestamp("current_period_end"),
});

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, {
    fields: [subscriptions.user_id],
    references: [users.id],
  }),
  plan: one(plans, {
    fields: [subscriptions.plan_id],
    references: [plans.id],
  }),
}));

// Token Usage
export const tokenUsage = pgTable("token_usage", {
  id: serial("id").primaryKey(),
  subscription_id: integer("subscription_id").notNull().references(() => subscriptions.id, { onDelete: 'cascade' }),
  amount: integer("amount").notNull(),
  description: text("description").notNull(),
  used_at: timestamp("used_at").defaultNow().notNull(),
});

export const tokenUsageRelations = relations(tokenUsage, ({ one }) => ({
  subscription: one(subscriptions, {
    fields: [tokenUsage.subscription_id],
    references: [subscriptions.id],
  }),
}));

// Product Categories
export const productCategories = pgTable("product_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  parent_id: integer("parent_id"), // Will be set up with references later
  is_active: boolean("is_active").default(true).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const productCategoriesRelations = relations(productCategories, ({ many, one }) => ({
  products: many(products),
  parent: one(productCategories, {
    fields: [productCategories.parent_id],
    references: [productCategories.id],
  }),
  subcategories: many(productCategories, {
    relationName: "parent_child"
  }),
}));

// Products/Services
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category_id: integer("category_id").references(() => productCategories.id),
  sku: text("sku").notNull().unique(),
  internal_cost: integer("internal_cost").notNull(), // in cents
  price: integer("price").notNull(), // in cents, sales price
  token_cost: integer("token_cost").notNull(),
  vat_rate: vatRateEnum("vat_rate").default('standard').notNull(),
  is_active: boolean("is_active").default(true).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const productsRelations = relations(products, ({ one }) => ({
  category: one(productCategories, {
    fields: [products.category_id],
    references: [productCategories.id],
  }),
}));

// Quotes
export const quotes = pgTable("quotes", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  created_by: integer("created_by").notNull().references(() => users.id),
  quote_number: text("quote_number").notNull().unique(),
  status: quoteStatusEnum("status").notNull().default('pending'),
  subtotal: integer("subtotal").notNull(), // in cents
  discount_percent: decimal("discount_percent").default('0'),
  discount_amount: integer("discount_amount").default(0), // in cents
  vat_amount: integer("vat_amount").default(0), // in cents
  vat_rate: decimal("vat_rate").default('5'), // 5% VAT rate for UAE
  total: integer("total").notNull(), // in cents
  items: jsonb("items").default([]).notNull(), // includes internal cost, sale price and VAT details
  internal_cost_total: integer("internal_cost_total").default(0), // in cents, for accounting purposes
  profit_margin: decimal("profit_margin"), // calculated profit margin percentage
  expiry_date: timestamp("expiry_date"),
  notes: text("notes"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const quotesRelations = relations(quotes, ({ one }) => ({
  user: one(users, {
    fields: [quotes.user_id],
    references: [users.id],
  }),
  creator: one(users, {
    fields: [quotes.created_by],
    references: [users.id],
  }),
}));

// Invoices
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  quote_id: integer("quote_id").references(() => quotes.id),
  invoice_number: text("invoice_number").notNull().unique(),
  status: invoiceStatusEnum("status").notNull().default('pending'),
  subtotal: integer("subtotal").notNull(), // in cents
  discount_percent: decimal("discount_percent").default('0'),
  discount_amount: integer("discount_amount").default(0), // in cents
  vat_amount: integer("vat_amount").default(0), // in cents
  vat_rate: decimal("vat_rate").default('5'), // 5% VAT rate for UAE
  vat_registration_number: text("vat_registration_number"),
  total: integer("total").notNull(), // in cents
  items: jsonb("items").default([]).notNull(), // includes internal cost, sale price and VAT details
  internal_cost_total: integer("internal_cost_total").default(0), // in cents, for accounting purposes
  profit_margin: decimal("profit_margin"), // calculated profit margin percentage
  due_date: timestamp("due_date").notNull(),
  paid_date: timestamp("paid_date"),
  payment_method: text("payment_method"),
  payment_reference: text("payment_reference"), // replacing stripe_payment_intent_id
  notes: text("notes"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const invoicesRelations = relations(invoices, ({ one }) => ({
  user: one(users, {
    fields: [invoices.user_id],
    references: [users.id],
  }),
  quote: one(quotes, {
    fields: [invoices.quote_id],
    references: [quotes.id],
  }),
}));

// Discount Requests
export const discountRequests = pgTable("discount_requests", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  requested_by: integer("requested_by").notNull().references(() => users.id),
  approved_by: integer("approved_by").references(() => users.id),
  quote_id: integer("quote_id").references(() => quotes.id),
  status: discountStatusEnum("status").notNull().default('pending'),
  discount_percent: decimal("discount_percent"),
  discount_amount: integer("discount_amount"), // in cents
  reason: text("reason").notNull(),
  decision_notes: text("decision_notes"),
  requested_at: timestamp("requested_at").defaultNow().notNull(),
  decided_at: timestamp("decided_at"),
});

export const discountRequestsRelations = relations(discountRequests, ({ one }) => ({
  user: one(users, {
    fields: [discountRequests.user_id],
    references: [users.id],
  }),
  requester: one(users, {
    fields: [discountRequests.requested_by],
    references: [users.id],
  }),
  approver: one(users, {
    fields: [discountRequests.approved_by],
    references: [users.id],
  }),
  quote: one(quotes, {
    fields: [discountRequests.quote_id],
    references: [quotes.id],
  }),
}));

// Job Descriptions
export const jobSeniorityEnum = pgEnum('job_seniority', ['entry', 'junior', 'mid', 'senior', 'executive']);

export const jobDescriptions = pgTable("job_descriptions", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar("title", { length: 255 }).notNull(),
  company: varchar("company", { length: 255 }),
  department: varchar("department", { length: 255 }),
  seniority: jobSeniorityEnum("seniority").default('mid'),
  industry: varchar("industry", { length: 255 }),
  skills: jsonb("skills").default([]).notNull(),
  responsibilities: text("responsibilities"),
  requirements: text("requirements"),
  benefits: text("benefits"),
  description: text("description").notNull(),
  tokens_used: integer("tokens_used").notNull().default(0),
  is_public: boolean("is_public").default(false).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const jobDescriptionsRelations = relations(jobDescriptions, ({ one }) => ({
  user: one(users, {
    fields: [jobDescriptions.user_id],
    references: [users.id],
  }),
}));

// Accounting-related tables
export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  type: text("type").notNull(), // asset, liability, equity, income, expense
  account_number: text("account_number").unique(),
  description: text("description"),
  balance: integer("balance").default(0).notNull(), // in cents
  is_system: boolean("is_system").default(false).notNull(), // system accounts cannot be deleted
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const accountTransactions = pgTable("account_transactions", {
  id: serial("id").primaryKey(),
  account_id: integer("account_id").notNull().references(() => accounts.id),
  transaction_date: timestamp("transaction_date").defaultNow().notNull(),
  amount: integer("amount").notNull(), // in cents, can be negative
  description: text("description").notNull(),
  transaction_type: transactionTypeEnum("transaction_type").notNull(),
  reference_id: integer("reference_id"), // can be invoice_id, expense_id, etc.
  reference_type: text("reference_type"), // 'invoice', 'expense', etc.
  created_by: integer("created_by").notNull().references(() => users.id),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const accountTransactionsRelations = relations(accountTransactions, ({ one }) => ({
  account: one(accounts, {
    fields: [accountTransactions.account_id],
    references: [accounts.id],
  }),
  creator: one(users, {
    fields: [accountTransactions.created_by],
    references: [users.id],
  }),
}));

export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  amount: integer("amount").notNull(), // in cents
  vat_amount: integer("vat_amount").default(0), // in cents
  vat_rate: decimal("vat_rate").default('5'), // 5% VAT rate for UAE
  vat_recoverable: boolean("vat_recoverable").default(true).notNull(),
  expense_date: timestamp("expense_date").notNull(),
  description: text("description"),
  category: expenseCategoryEnum("category").notNull(),
  account_id: integer("account_id").notNull().references(() => accounts.id),
  payment_method: text("payment_method"),
  payment_reference: text("payment_reference"),
  receipt_url: text("receipt_url"),
  status: text("status").default('pending').notNull(), // pending, approved, rejected
  approved_by: integer("approved_by").references(() => users.id),
  approved_at: timestamp("approved_at"),
  created_by: integer("created_by").notNull().references(() => users.id),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const expensesRelations = relations(expenses, ({ one }) => ({
  account: one(accounts, {
    fields: [expenses.account_id],
    references: [accounts.id],
  }),
  creator: one(users, {
    fields: [expenses.created_by],
    references: [users.id],
  }),
  approver: one(users, {
    fields: [expenses.approved_by],
    references: [users.id],
  }),
}));

export const vatReturns = pgTable("vat_returns", {
  id: serial("id").primaryKey(),
  period_start: timestamp("period_start").notNull(),
  period_end: timestamp("period_end").notNull(),
  due_date: timestamp("due_date").notNull(),
  submission_date: timestamp("submission_date"),
  output_vat: integer("output_vat").notNull(), // in cents
  input_vat: integer("input_vat").notNull(), // in cents
  net_vat: integer("net_vat").notNull(), // in cents
  status: text("status").default('draft').notNull(), // draft, submitted, paid
  reference_number: text("reference_number"),
  notes: text("notes"),
  created_by: integer("created_by").notNull().references(() => users.id),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const vatReturnsRelations = relations(vatReturns, ({ one }) => ({
  creator: one(users, {
    fields: [vatReturns.created_by],
    references: [users.id],
  }),
}));

// Reports
export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  data: jsonb("data").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// Schema Definitions
export const insertUserSchema = createInsertSchema(users).omit({ id: true, created_at: true, stripe_customer_id: true });
export const insertPlanSchema = createInsertSchema(plans).omit({ id: true });
export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({ id: true, start_date: true, current_period_start: true, current_period_end: true });
export const insertTokenUsageSchema = createInsertSchema(tokenUsage).omit({ id: true, used_at: true });
export const insertProductCategorySchema = createInsertSchema(productCategories).omit({ id: true, created_at: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true, created_at: true, updated_at: true });
export const insertQuoteSchema = createInsertSchema(quotes).omit({ id: true, created_at: true });
export const insertInvoiceSchema = createInsertSchema(invoices).omit({ id: true, created_at: true, paid_date: true });
export const insertDiscountRequestSchema = createInsertSchema(discountRequests).omit({ id: true, requested_at: true, decided_at: true, status: true, approved_by: true, decision_notes: true });
export const insertJobDescriptionSchema = createInsertSchema(jobDescriptions).omit({ id: true, created_at: true, updated_at: true, tokens_used: true });
export const insertAccountSchema = createInsertSchema(accounts).omit({ id: true, created_at: true, updated_at: true, balance: true });
export const insertAccountTransactionSchema = createInsertSchema(accountTransactions).omit({ id: true, created_at: true });
export const insertExpenseSchema = createInsertSchema(expenses).omit({ id: true, created_at: true, updated_at: true, approved_at: true, approved_by: true });
export const insertVatReturnSchema = createInsertSchema(vatReturns).omit({ id: true, created_at: true, updated_at: true, submission_date: true });
export const insertReportSchema = createInsertSchema(reports).omit({ id: true, created_at: true });

// Type Definitions
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Plan = typeof plans.$inferSelect;
export type InsertPlan = z.infer<typeof insertPlanSchema>;

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;

export type TokenUsage = typeof tokenUsage.$inferSelect;
export type InsertTokenUsage = z.infer<typeof insertTokenUsageSchema>;

export type ProductCategory = typeof productCategories.$inferSelect;
export type InsertProductCategory = z.infer<typeof insertProductCategorySchema>;

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export type Quote = typeof quotes.$inferSelect;
export type InsertQuote = z.infer<typeof insertQuoteSchema>;

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;

export type DiscountRequest = typeof discountRequests.$inferSelect;
export type InsertDiscountRequest = z.infer<typeof insertDiscountRequestSchema>;

export type JobDescription = typeof jobDescriptions.$inferSelect;
export type InsertJobDescription = z.infer<typeof insertJobDescriptionSchema>;

export type Account = typeof accounts.$inferSelect;
export type InsertAccount = z.infer<typeof insertAccountSchema>;

export type AccountTransaction = typeof accountTransactions.$inferSelect;
export type InsertAccountTransaction = z.infer<typeof insertAccountTransactionSchema>;

export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;

export type VatReturn = typeof vatReturns.$inferSelect;
export type InsertVatReturn = z.infer<typeof insertVatReturnSchema>;

export type Report = typeof reports.$inferSelect;
export type InsertReport = z.infer<typeof insertReportSchema>;

// Type for authentication
export type LoginData = Pick<InsertUser, "username" | "password">;

// For token-based subscription model
export type TokenTransaction = {
  userId: number;
  subscriptionId: number;
  amount: number;
  description: string;
};
