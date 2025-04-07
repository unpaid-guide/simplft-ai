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

// Products/Services
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: integer("price").notNull(), // in cents
  token_cost: integer("token_cost").notNull(),
  is_active: boolean("is_active").default(true).notNull(),
});

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
  tax: integer("tax").default(0), // in cents
  total: integer("total").notNull(), // in cents
  items: jsonb("items").default([]).notNull(),
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
  tax: integer("tax").default(0), // in cents
  total: integer("total").notNull(), // in cents
  items: jsonb("items").default([]).notNull(),
  due_date: timestamp("due_date").notNull(),
  paid_date: timestamp("paid_date"),
  payment_method: text("payment_method"),
  stripe_payment_intent_id: text("stripe_payment_intent_id"),
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
export const insertProductSchema = createInsertSchema(products).omit({ id: true });
export const insertQuoteSchema = createInsertSchema(quotes).omit({ id: true, created_at: true });
export const insertInvoiceSchema = createInsertSchema(invoices).omit({ id: true, created_at: true, paid_date: true });
export const insertDiscountRequestSchema = createInsertSchema(discountRequests).omit({ id: true, requested_at: true, decided_at: true, status: true, approved_by: true, decision_notes: true });
export const insertJobDescriptionSchema = createInsertSchema(jobDescriptions).omit({ id: true, created_at: true, updated_at: true, tokens_used: true });
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
