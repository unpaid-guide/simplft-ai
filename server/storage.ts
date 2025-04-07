import { users, User, InsertUser, subscriptions, Subscription, InsertSubscription, plans, Plan, InsertPlan, 
  tokenUsage, TokenUsage, InsertTokenUsage, products, Product, InsertProduct, quotes, Quote, InsertQuote, 
  invoices, Invoice, InsertInvoice, discountRequests, DiscountRequest, InsertDiscountRequest, 
  jobDescriptions, JobDescription, InsertJobDescription, 
  reports, Report, InsertReport } from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, desc, sql as sqlBuilder, count, avg, inArray } from "drizzle-orm";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

// Define the storage interface for our application
export interface IStorage {
  // Session management
  sessionStore: session.Store;

  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUsersByStatus(status: string): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<User>): Promise<User>;
  listUsers(role?: string): Promise<User[]>;
  updateStripeCustomerId(userId: number, stripeCustomerId: string): Promise<User>;

  // Plan management
  createPlan(plan: InsertPlan): Promise<Plan>;
  getPlan(id: number): Promise<Plan | undefined>;
  listActivePlans(): Promise<Plan[]>;
  updatePlan(id: number, data: Partial<Plan>): Promise<Plan>;

  // Subscription management
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;
  getSubscription(id: number): Promise<Subscription | undefined>;
  getActiveSubscriptionByUserId(userId: number): Promise<Subscription | undefined>;
  listSubscriptionsByUserId(userId: number): Promise<Subscription[]>;
  updateSubscription(id: number, data: Partial<Subscription>): Promise<Subscription>;
  updateUserStripeInfo(userId: number, stripeInfo: { customerId: string; subscriptionId: string }): Promise<User>;

  // Token management
  addTokenUsage(usage: InsertTokenUsage): Promise<TokenUsage>;
  getTokenUsageBySubscription(subscriptionId: number): Promise<TokenUsage[]>;
  deductTokens(subscriptionId: number, amount: number, description: string): Promise<Subscription>;
  
  // Product Category management
  createProductCategory(category: InsertProductCategory): Promise<ProductCategory>;
  getProductCategory(id: number): Promise<ProductCategory | undefined>;
  listProductCategories(): Promise<ProductCategory[]>;
  updateProductCategory(id: number, data: Partial<ProductCategory>): Promise<ProductCategory>;
  getCategoryWithSubcategories(id: number): Promise<ProductCategory[]>;
  
  // Product management
  createProduct(product: InsertProduct): Promise<Product>;
  listActiveProducts(): Promise<Product[]>;
  listProductsByCategory(categoryId: number): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  updateProduct(id: number, data: Partial<Product>): Promise<Product>;

  // Quote management
  createQuote(quote: InsertQuote): Promise<Quote>;
  getQuote(id: number): Promise<Quote | undefined>;
  listQuotesByUserId(userId: number): Promise<Quote[]>;
  updateQuoteStatus(id: number, status: string): Promise<Quote>;
  updateQuote(id: number, data: Partial<Quote>): Promise<Quote>;

  // Invoice management
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  getInvoice(id: number): Promise<Invoice | undefined>;
  listInvoicesByUserId(userId: number): Promise<Invoice[]>;
  updateInvoiceStatus(id: number, status: string): Promise<Invoice>;
  updateInvoice(id: number, data: Partial<Invoice>): Promise<Invoice>;
  markInvoiceAsPaid(id: number, paymentMethod: string, paymentReference?: string): Promise<Invoice>;

  // Discount management
  createDiscountRequest(request: InsertDiscountRequest): Promise<DiscountRequest>;
  getDiscountRequest(id: number): Promise<DiscountRequest | undefined>;
  listPendingDiscountRequests(): Promise<DiscountRequest[]>;
  approveDiscountRequest(id: number, approverId: number, notes?: string): Promise<DiscountRequest>;
  rejectDiscountRequest(id: number, approverId: number, notes?: string): Promise<DiscountRequest>;
  
  // Job Description management
  createJobDescription(jobDescription: InsertJobDescription): Promise<JobDescription>;
  getJobDescription(id: number): Promise<JobDescription | undefined>;
  listJobDescriptionsByUserId(userId: number): Promise<JobDescription[]>;
  updateJobDescription(id: number, data: Partial<JobDescription>): Promise<JobDescription>;
  listPublicJobDescriptions(): Promise<JobDescription[]>;

  // Account management
  createAccount(account: InsertAccount): Promise<Account>;
  getAccount(id: number): Promise<Account | undefined>;
  getAccountByName(name: string): Promise<Account | undefined>;
  listAccounts(type?: string): Promise<Account[]>;
  updateAccount(id: number, data: Partial<Account>): Promise<Account>;
  
  // Account Transactions
  createAccountTransaction(transaction: InsertAccountTransaction): Promise<AccountTransaction>;
  getAccountTransaction(id: number): Promise<AccountTransaction | undefined>;
  listAccountTransactions(accountId: number): Promise<AccountTransaction[]>;
  getAccountBalance(accountId: number): Promise<number>;
  
  // Expense management
  createExpense(expense: InsertExpense): Promise<Expense>;
  getExpense(id: number): Promise<Expense | undefined>;
  listExpenses(status?: string): Promise<Expense[]>;
  updateExpense(id: number, data: Partial<Expense>): Promise<Expense>;
  approveExpense(id: number, approverId: number): Promise<Expense>;
  rejectExpense(id: number, approverId: number, reason?: string): Promise<Expense>;
  
  // VAT management
  createVatReturn(vatReturn: InsertVatReturn): Promise<VatReturn>;
  getVatReturn(id: number): Promise<VatReturn | undefined>;
  listVatReturns(status?: string): Promise<VatReturn[]>;
  updateVatReturn(id: number, data: Partial<VatReturn>): Promise<VatReturn>;
  calculateVatForPeriod(startDate: Date, endDate: Date): Promise<{ output: number, input: number, net: number }>;
  
  // Reports
  createReport(report: InsertReport): Promise<Report>;
  getMonthlyRecurringRevenue(): Promise<number>;
  getAnnualRecurringRevenue(): Promise<number>;
  getChurnRate(): Promise<number>;
  getActiveSubscriptionsCount(): Promise<number>;
  getProfitAndLoss(startDate: Date, endDate: Date): Promise<any>;
  getBalanceSheet(date: Date): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is not set");
    }
    
    // Use memory store for sessions
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
  }

  // User management
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async updateUser(id: number, data: Partial<User>): Promise<User> {
    const [updatedUser] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return updatedUser;
  }

  async listUsers(role?: string): Promise<User[]> {
    if (role) {
      return db.select().from(users).where(eq(users.role, role as any));
    }
    return db.select().from(users);
  }
  
  async getUsersByStatus(status: string): Promise<User[]> {
    return db.select().from(users).where(eq(users.status, status as any));
  }

  async updateStripeCustomerId(userId: number, stripeCustomerId: string): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ stripe_customer_id: stripeCustomerId })
      .where(eq(users.id, userId))
      .returning();
    return updatedUser;
  }

  // Plan management
  async createPlan(plan: InsertPlan): Promise<Plan> {
    const [newPlan] = await db.insert(plans).values(plan).returning();
    return newPlan;
  }

  async getPlan(id: number): Promise<Plan | undefined> {
    const [plan] = await db.select().from(plans).where(eq(plans.id, id));
    return plan;
  }

  async listActivePlans(): Promise<Plan[]> {
    return db.select().from(plans).where(eq(plans.is_active, true));
  }

  async updatePlan(id: number, data: Partial<Plan>): Promise<Plan> {
    const [updatedPlan] = await db.update(plans).set(data).where(eq(plans.id, id)).returning();
    return updatedPlan;
  }

  // Subscription management
  async createSubscription(subscription: InsertSubscription): Promise<Subscription> {
    const [newSubscription] = await db.insert(subscriptions).values(subscription).returning();
    return newSubscription;
  }

  async getSubscription(id: number): Promise<Subscription | undefined> {
    const [subscription] = await db.select().from(subscriptions).where(eq(subscriptions.id, id));
    return subscription;
  }

  async getActiveSubscriptionByUserId(userId: number): Promise<Subscription | undefined> {
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.user_id, userId),
          eq(subscriptions.status, 'active')
        )
      );
    return subscription;
  }

  async listSubscriptionsByUserId(userId: number): Promise<Subscription[]> {
    return db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.user_id, userId))
      .orderBy(desc(subscriptions.start_date));
  }

  async updateSubscription(id: number, data: Partial<Subscription>): Promise<Subscription> {
    const [updatedSubscription] = await db
      .update(subscriptions)
      .set(data)
      .where(eq(subscriptions.id, id))
      .returning();
    return updatedSubscription;
  }

  async updateUserStripeInfo(userId: number, stripeInfo: { customerId: string; subscriptionId: string }): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ stripe_customer_id: stripeInfo.customerId })
      .where(eq(users.id, userId))
      .returning();
    
    // Update subscription with Stripe subscription ID
    await db
      .update(subscriptions)
      .set({ stripe_subscription_id: stripeInfo.subscriptionId })
      .where(and(
        eq(subscriptions.user_id, userId),
        eq(subscriptions.status, 'pending')
      ));
    
    return updatedUser;
  }

  // Token management
  async addTokenUsage(usage: InsertTokenUsage): Promise<TokenUsage> {
    const [newUsage] = await db.insert(tokenUsage).values(usage).returning();
    return newUsage;
  }

  async getTokenUsageBySubscription(subscriptionId: number): Promise<TokenUsage[]> {
    return db
      .select()
      .from(tokenUsage)
      .where(eq(tokenUsage.subscription_id, subscriptionId))
      .orderBy(desc(tokenUsage.used_at));
  }

  async deductTokens(subscriptionId: number, amount: number, description: string): Promise<Subscription> {
    // Get current subscription
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.id, subscriptionId));
    
    if (!subscription) {
      throw new Error("Subscription not found");
    }
    
    if (subscription.token_balance < amount) {
      throw new Error("Insufficient token balance");
    }
    
    // Record token usage
    await this.addTokenUsage({
      subscription_id: subscriptionId,
      amount,
      description
    });
    
    // Update token balance
    const [updatedSubscription] = await db
      .update(subscriptions)
      .set({ token_balance: subscription.token_balance - amount })
      .where(eq(subscriptions.id, subscriptionId))
      .returning();
    
    return updatedSubscription;
  }

  // Product management
  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await db.insert(products).values(product).returning();
    return newProduct;
  }

  async listActiveProducts(): Promise<Product[]> {
    return db.select().from(products).where(eq(products.is_active, true));
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  // Quote management
  async createQuote(quote: InsertQuote): Promise<Quote> {
    // Generate a unique quote number
    const quoteNumber = `Q-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const quoteWithNumber = { ...quote, quote_number: quoteNumber };
    
    const [newQuote] = await db.insert(quotes).values(quoteWithNumber).returning();
    return newQuote;
  }

  async getQuote(id: number): Promise<Quote | undefined> {
    const [quote] = await db.select().from(quotes).where(eq(quotes.id, id));
    return quote;
  }

  async listQuotesByUserId(userId: number): Promise<Quote[]> {
    return db
      .select()
      .from(quotes)
      .where(eq(quotes.user_id, userId))
      .orderBy(desc(quotes.created_at));
  }

  async updateQuoteStatus(id: number, status: string): Promise<Quote> {
    const [updatedQuote] = await db
      .update(quotes)
      .set({ status: status as any })
      .where(eq(quotes.id, id))
      .returning();
    return updatedQuote;
  }

  // Invoice management
  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    // Generate a unique invoice number
    const invoiceNumber = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const invoiceWithNumber = { ...invoice, invoice_number: invoiceNumber };
    
    const [newInvoice] = await db.insert(invoices).values(invoiceWithNumber).returning();
    return newInvoice;
  }

  async getInvoice(id: number): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    return invoice;
  }

  async listInvoicesByUserId(userId: number): Promise<Invoice[]> {
    return db
      .select()
      .from(invoices)
      .where(eq(invoices.user_id, userId))
      .orderBy(desc(invoices.created_at));
  }

  async updateInvoiceStatus(id: number, status: string): Promise<Invoice> {
    const [updatedInvoice] = await db
      .update(invoices)
      .set({ status: status as any })
      .where(eq(invoices.id, id))
      .returning();
    return updatedInvoice;
  }

  async updateInvoice(id: number, data: Partial<Invoice>): Promise<Invoice> {
    const [updatedInvoice] = await db
      .update(invoices)
      .set(data)
      .where(eq(invoices.id, id))
      .returning();
    return updatedInvoice;
  }

  async markInvoiceAsPaid(id: number, paymentMethod: string, paymentReference?: string): Promise<Invoice> {
    const paidDate = new Date();
    const updateData: any = { 
      status: 'paid', 
      paid_date: paidDate, 
      payment_method: paymentMethod 
    };
    
    if (paymentReference) {
      updateData.payment_reference = paymentReference;
    }
    
    const [updatedInvoice] = await db
      .update(invoices)
      .set(updateData)
      .where(eq(invoices.id, id))
      .returning();
    
    return updatedInvoice;
  }

  // Discount management
  async createDiscountRequest(request: InsertDiscountRequest): Promise<DiscountRequest> {
    const [newRequest] = await db.insert(discountRequests).values(request).returning();
    return newRequest;
  }

  async getDiscountRequest(id: number): Promise<DiscountRequest | undefined> {
    const [request] = await db.select().from(discountRequests).where(eq(discountRequests.id, id));
    return request;
  }

  async listPendingDiscountRequests(): Promise<DiscountRequest[]> {
    return db
      .select()
      .from(discountRequests)
      .where(eq(discountRequests.status, 'pending'))
      .orderBy(desc(discountRequests.requested_at));
  }

  async approveDiscountRequest(id: number, approverId: number, notes?: string): Promise<DiscountRequest> {
    const now = new Date();
    const [updatedRequest] = await db
      .update(discountRequests)
      .set({ 
        status: 'approved', 
        approved_by: approverId, 
        decision_notes: notes || "Approved", 
        decided_at: now 
      })
      .where(eq(discountRequests.id, id))
      .returning();
    
    // If the discount request is for a quote, update the quote with the approved discount
    if (updatedRequest.quote_id) {
      const quote = await this.getQuote(updatedRequest.quote_id);
      if (quote) {
        let discountAmount = 0;
        
        if (updatedRequest.discount_percent) {
          // Calculate discount amount based on percentage
          discountAmount = Math.round(quote.subtotal * Number(updatedRequest.discount_percent) / 100);
        } else if (updatedRequest.discount_amount) {
          discountAmount = updatedRequest.discount_amount;
        }
        
        // Update the quote with the discount and new total
        const total = quote.subtotal - discountAmount + (quote.vat_amount || 0);
        await db
          .update(quotes)
          .set({ 
            discount_amount: discountAmount,
            discount_percent: updatedRequest.discount_percent,
            total 
          })
          .where(eq(quotes.id, updatedRequest.quote_id));
      }
    }
    
    return updatedRequest;
  }

  async rejectDiscountRequest(id: number, approverId: number, notes?: string): Promise<DiscountRequest> {
    const now = new Date();
    const [updatedRequest] = await db
      .update(discountRequests)
      .set({ 
        status: 'rejected', 
        approved_by: approverId, 
        decision_notes: notes || "Rejected", 
        decided_at: now 
      })
      .where(eq(discountRequests.id, id))
      .returning();
    
    return updatedRequest;
  }

  // Job Description management
  async createJobDescription(jobDescription: InsertJobDescription): Promise<JobDescription> {
    const [newJobDescription] = await db.insert(jobDescriptions).values(jobDescription).returning();
    return newJobDescription;
  }

  async getJobDescription(id: number): Promise<JobDescription | undefined> {
    const [jobDescription] = await db.select().from(jobDescriptions).where(eq(jobDescriptions.id, id));
    return jobDescription;
  }

  async listJobDescriptionsByUserId(userId: number): Promise<JobDescription[]> {
    return db
      .select()
      .from(jobDescriptions)
      .where(eq(jobDescriptions.user_id, userId))
      .orderBy(desc(jobDescriptions.created_at));
  }

  async updateJobDescription(id: number, data: Partial<JobDescription>): Promise<JobDescription> {
    const [updatedJobDescription] = await db
      .update(jobDescriptions)
      .set(data)
      .where(eq(jobDescriptions.id, id))
      .returning();
    return updatedJobDescription;
  }

  async listPublicJobDescriptions(): Promise<JobDescription[]> {
    return db
      .select()
      .from(jobDescriptions)
      .where(eq(jobDescriptions.is_public, true))
      .orderBy(desc(jobDescriptions.created_at));
  }

  // Reports
  async createReport(report: InsertReport): Promise<Report> {
    const [newReport] = await db.insert(reports).values(report).returning();
    return newReport;
  }

  async getMonthlyRecurringRevenue(): Promise<number> {
    const result = await db
      .select({
        mrr: sqlBuilder<number>`SUM(${plans.price})`,
      })
      .from(subscriptions)
      .innerJoin(plans, eq(subscriptions.plan_id, plans.id))
      .where(
        and(
          eq(subscriptions.status, 'active' as any),
          gte(subscriptions.end_date, new Date())
        )
      );
    
    return Number(result[0]?.mrr) || 0;
  }

  async getAnnualRecurringRevenue(): Promise<number> {
    const mrr = await this.getMonthlyRecurringRevenue();
    return mrr * 12;
  }

  async getChurnRate(): Promise<number> {
    // This is a simplified implementation
    // In a real system, you'd calculate churn rate over a specific period
    const totalSubscriptionsResult = await db
      .select({ count: count() })
      .from(subscriptions);
    
    const cancelledSubscriptionsResult = await db
      .select({ count: count() })
      .from(subscriptions)
      .where(eq(subscriptions.status, 'expired' as any));
    
    const totalSubscriptions = totalSubscriptionsResult[0]?.count || 0;
    const cancelledSubscriptions = cancelledSubscriptionsResult[0]?.count || 0;
    
    if (totalSubscriptions === 0) return 0;
    
    return (cancelledSubscriptions / totalSubscriptions) * 100;
  }

  async getActiveSubscriptionsCount(): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(subscriptions)
      .where(eq(subscriptions.status, 'active' as any));
    
    return result[0]?.count || 0;
  }
}

export const storage = new DatabaseStorage();
