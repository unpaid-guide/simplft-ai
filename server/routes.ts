import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, hashPassword, comparePasswords } from "./auth";
import stripeService from "./stripe";
import { fromZodError } from "zod-validation-error";
import { 
  insertUserSchema, insertPlanSchema, insertSubscriptionSchema, insertTokenUsageSchema,
  insertProductSchema, insertQuoteSchema, insertInvoiceSchema, insertDiscountRequestSchema,
  insertJobDescriptionSchema, User as SchemaUser
} from "@shared/schema";
import { generateJobDescription } from "./openai";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes and middleware
  setupAuth(app);

  // User management routes
  app.get("/api/users", async (req, res, next) => {
    try {
      if (!req.isAuthenticated() || !['admin', 'finance'].includes(req.user.role)) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const role = req.query.role as string | undefined;
      const users = await storage.listUsers(role);
      
      // Don't send passwords to the client
      const sanitizedUsers = users.map(user => ({ ...user, password: undefined }));
      
      res.json(sanitizedUsers);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/users/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const userId = parseInt(req.params.id);
      
      // Only allow users to access their own data unless they're admin/finance
      if (userId !== req.user.id && !['admin', 'finance'].includes(req.user.role)) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Don't send password
      const { password, ...sanitizedUser } = user;
      
      res.json(sanitizedUser);
    } catch (error) {
      next(error);
    }
  });

  // Get pending users route
  app.get("/api/users/pending", async (req, res, next) => {
    try {
      if (!req.isAuthenticated() || req.user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const pendingUsers = await storage.getUsersByStatus("pending");
      
      // Don't send passwords to the client
      const sanitizedUsers = pendingUsers.map(user => ({ ...user, password: undefined }));

      res.json(sanitizedUsers);
    } catch (error) {
      next(error);
    }
  });

  // Approve user
  app.post("/api/users/:id/approve", async (req, res, next) => {
    try {
      if (!req.isAuthenticated() || req.user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const userId = parseInt(req.params.id);
      const { role } = req.body;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const updatedUser = await storage.updateUser(userId, { 
        status: "active",
        ...(role && { role })
      });

      const { password, ...sanitizedUser } = updatedUser;
      
      res.json(sanitizedUser);
    } catch (error) {
      next(error);
    }
  });

  // Suspend user
  app.post("/api/users/:id/suspend", async (req, res, next) => {
    try {
      if (!req.isAuthenticated() || req.user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const userId = parseInt(req.params.id);
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Don't allow suspending yourself
      if (userId === req.user.id) {
        return res.status(400).json({ message: "Cannot suspend yourself" });
      }

      const updatedUser = await storage.updateUser(userId, { status: "suspended" });
      const { password, ...sanitizedUser } = updatedUser;
      
      res.json(sanitizedUser);
    } catch (error) {
      next(error);
    }
  });

  // Change user role
  app.patch("/api/users/:id/role", async (req, res, next) => {
    try {
      if (!req.isAuthenticated() || req.user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const userId = parseInt(req.params.id);
      const { role } = req.body;
      
      if (!role || !['admin', 'finance', 'sales', 'customer'].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Don't allow changing your own role
      if (userId === req.user.id) {
        return res.status(400).json({ message: "Cannot change your own role" });
      }

      const updatedUser = await storage.updateUser(userId, { role });
      const { password, ...sanitizedUser } = updatedUser;
      
      res.json(sanitizedUser);
    } catch (error) {
      next(error);
    }
  });

  // Reset user password
  app.post("/api/users/:id/reset-password", async (req, res, next) => {
    try {
      if (!req.isAuthenticated() || req.user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const userId = parseInt(req.params.id);
      const { newPassword } = req.body;
      
      if (!newPassword || newPassword.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Use the imported hashPassword function
      
      // Hash the new password
      const hashedPassword = await hashPassword(newPassword);
      const updatedUser = await storage.updateUser(userId, { password: hashedPassword });
      const { password, ...sanitizedUser } = updatedUser;
      
      res.json(sanitizedUser);
    } catch (error) {
      next(error);
    }
  });

  // Change own password
  app.post("/api/users/:id/change-password", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const userId = parseInt(req.params.id);
      
      // Users can only change their own password unless they're admin
      if (userId !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const { currentPassword, newPassword } = req.body;
      
      if (!newPassword || newPassword.length < 8) {
        return res.status(400).json({ message: "New password must be at least 8 characters" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Use the imported auth functions
      
      // If user is changing their own password, verify current password
      if (userId === req.user.id) {
        if (!currentPassword) {
          return res.status(400).json({ message: "Current password is required" });
        }
        
        const isPasswordValid = await comparePasswords(currentPassword, user.password);
        if (!isPasswordValid) {
          return res.status(400).json({ message: "Current password is incorrect" });
        }
      }

      // Hash the new password
      const hashedPassword = await hashPassword(newPassword);
      const updatedUser = await storage.updateUser(userId, { password: hashedPassword });
      const { password, ...sanitizedUser } = updatedUser;
      
      res.json(sanitizedUser);
    } catch (error) {
      next(error);
    }
  });

  // Plan management routes
  app.get("/api/plans", async (_req, res, next) => {
    try {
      const plans = await storage.listActivePlans();
      res.json(plans);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/plans", async (req, res, next) => {
    try {
      if (!req.isAuthenticated() || req.user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Validate request body
      const validateResult = insertPlanSchema.safeParse(req.body);
      if (!validateResult.success) {
        return res.status(400).json({ message: "Invalid plan data", errors: fromZodError(validateResult.error) });
      }
      
      const plan = await storage.createPlan(validateResult.data);
      res.status(201).json(plan);
    } catch (error) {
      next(error);
    }
  });

  // Subscription management routes
  app.get("/api/subscriptions", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      let subscriptions;
      
      // Admins and finance can see all subscriptions
      if (['admin', 'finance'].includes(req.user.role)) {
        // TODO: Implement pagination and filtering
        const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
        
        if (userId) {
          subscriptions = await storage.listSubscriptionsByUserId(userId);
        } else {
          // This would be a more complex query to get all subscriptions
          // For now, just return an error asking for a user ID
          return res.status(400).json({ message: "Please provide a userId" });
        }
      } else {
        // Regular users can only see their own subscriptions
        subscriptions = await storage.listSubscriptionsByUserId(req.user.id);
      }
      
      res.json(subscriptions);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/subscriptions/active", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      // For non-admin users, return their active subscription
      if (req.user.role !== 'admin' && req.user.role !== 'finance') {
        const subscription = await storage.getActiveSubscriptionByUserId(req.user.id);
        return res.json(subscription || null);
      }
      
      // For admins and finance, allow checking any user's subscription
      const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
      if (!userId) {
        return res.status(400).json({ message: "Please provide a userId" });
      }
      
      const subscription = await storage.getActiveSubscriptionByUserId(userId);
      res.json(subscription || null);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/subscriptions", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      // Validate request body
      const validateResult = insertSubscriptionSchema.safeParse(req.body);
      if (!validateResult.success) {
        return res.status(400).json({ message: "Invalid subscription data", errors: fromZodError(validateResult.error) });
      }
      
      // Only allow admins to create subscriptions for other users
      if (validateResult.data.user_id !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Get the plan to set the token balance
      const plan = await storage.getPlan(validateResult.data.plan_id);
      if (!plan) {
        return res.status(404).json({ message: "Plan not found" });
      }
      
      // Set the token balance based on the plan
      const subscriptionData = {
        ...validateResult.data,
        token_balance: plan.token_amount
      };
      
      const subscription = await storage.createSubscription(subscriptionData);
      res.status(201).json(subscription);
    } catch (error) {
      next(error);
    }
  });

  // Token usage routes
  app.get("/api/token-usage/:subscriptionId", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const subscriptionId = parseInt(req.params.subscriptionId);
      
      // Get the subscription to check permissions
      const subscription = await storage.getSubscription(subscriptionId);
      if (!subscription) {
        return res.status(404).json({ message: "Subscription not found" });
      }
      
      // Only allow access to the subscription owner or admins/finance
      if (subscription.user_id !== req.user.id && !['admin', 'finance'].includes(req.user.role)) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const usage = await storage.getTokenUsageBySubscription(subscriptionId);
      res.json(usage);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/token-usage", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      // Validate request body
      const validateResult = insertTokenUsageSchema.safeParse(req.body);
      if (!validateResult.success) {
        return res.status(400).json({ message: "Invalid token usage data", errors: validateResult.error });
      }
      
      // Get the subscription to check permissions
      const subscription = await storage.getSubscription(validateResult.data.subscription_id);
      if (!subscription) {
        return res.status(404).json({ message: "Subscription not found" });
      }
      
      // Only allow token deduction by the subscription owner or admins
      if (subscription.user_id !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Deduct tokens and record usage
      try {
        const updatedSubscription = await storage.deductTokens(
          validateResult.data.subscription_id,
          validateResult.data.amount,
          validateResult.data.description
        );
        
        res.json(updatedSubscription);
      } catch (error: any) {
        if (error.message === "Insufficient token balance") {
          return res.status(400).json({ message: error.message });
        }
        throw error;
      }
    } catch (error) {
      next(error);
    }
  });

  // Product/Service routes
  app.get("/api/products", async (_req, res, next) => {
    try {
      const products = await storage.listActiveProducts();
      // Ensure we return an array even if there's an issue with the database
      res.json(products || []);
    } catch (error) {
      // If there's an error, just return an empty array rather than failing
      console.error("Error fetching products:", error);
      res.json([]);
    }
  });

  app.post("/api/products", async (req, res, next) => {
    try {
      if (!req.isAuthenticated() || !['admin', 'finance'].includes(req.user.role)) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Validate request body
      const validateResult = insertProductSchema.safeParse(req.body);
      if (!validateResult.success) {
        return res.status(400).json({ message: "Invalid product data", errors: validateResult.error });
      }
      
      const product = await storage.createProduct(validateResult.data);
      res.status(201).json(product);
    } catch (error) {
      next(error);
    }
  });

  // Quote management routes
  app.get("/api/quotes", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      let quotes;
      
      // Admins, finance, and sales can see all quotes
      if (['admin', 'finance', 'sales'].includes(req.user.role)) {
        const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
        
        if (userId) {
          quotes = await storage.listQuotesByUserId(userId);
        } else {
          // This would be a more complex query to get all quotes
          // For now, just return an error asking for a user ID
          return res.status(400).json({ message: "Please provide a userId" });
        }
      } else {
        // Regular users can only see their own quotes
        quotes = await storage.listQuotesByUserId(req.user.id);
      }
      
      res.json(quotes);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/quotes", async (req, res, next) => {
    try {
      if (!req.isAuthenticated() || !['admin', 'sales', 'finance'].includes(req.user.role)) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Validate request body
      const validateResult = insertQuoteSchema.safeParse(req.body);
      if (!validateResult.success) {
        return res.status(400).json({ message: "Invalid quote data", errors: validateResult.error });
      }
      
      // Set the creator to the current user
      const quoteData = {
        ...validateResult.data,
        created_by: req.user.id
      };
      
      const quote = await storage.createQuote(quoteData);
      res.status(201).json(quote);
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/quotes/:id/status", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const quoteId = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!status || !['pending', 'accepted', 'rejected', 'expired'].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      const quote = await storage.getQuote(quoteId);
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }
      
      // Check permissions
      if (quote.user_id !== req.user.id && !['admin', 'sales', 'finance'].includes(req.user.role)) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Customers can only accept or reject quotes
      if (req.user.role === 'customer' && !['accepted', 'rejected'].includes(status)) {
        return res.status(403).json({ message: "Customers can only accept or reject quotes" });
      }
      
      const updatedQuote = await storage.updateQuoteStatus(quoteId, status);
      res.json(updatedQuote);
    } catch (error) {
      next(error);
    }
  });

  // Invoice management routes
  app.get("/api/invoices", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      let invoices;
      
      // Admins, finance, and sales can see all invoices
      if (['admin', 'finance', 'sales'].includes(req.user.role)) {
        const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
        
        if (userId) {
          invoices = await storage.listInvoicesByUserId(userId);
        } else {
          // This would be a more complex query to get all invoices
          // For now, just return an error asking for a user ID
          return res.status(400).json({ message: "Please provide a userId" });
        }
      } else {
        // Regular users can only see their own invoices
        invoices = await storage.listInvoicesByUserId(req.user.id);
      }
      
      res.json(invoices);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/invoices", async (req, res, next) => {
    try {
      if (!req.isAuthenticated() || !['admin', 'finance'].includes(req.user.role)) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Validate request body
      const validateResult = insertInvoiceSchema.safeParse(req.body);
      if (!validateResult.success) {
        return res.status(400).json({ message: "Invalid invoice data", errors: validateResult.error });
      }
      
      const invoice = await storage.createInvoice(validateResult.data);
      res.status(201).json(invoice);
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/invoices/:id/status", async (req, res, next) => {
    try {
      if (!req.isAuthenticated() || !['admin', 'finance'].includes(req.user.role)) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const invoiceId = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!status || !['paid', 'pending', 'overdue'].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      const invoice = await storage.getInvoice(invoiceId);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      const updatedInvoice = await storage.updateInvoiceStatus(invoiceId, status);
      res.json(updatedInvoice);
    } catch (error) {
      next(error);
    }
  });

  // Payment routes
  app.post("/api/create-payment-intent", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const { amount, invoiceId } = req.body;
      
      if (!amount || amount <= 0) {
        return res.status(400).json({ message: "Invalid amount" });
      }
      
      // If an invoice ID is provided, verify it belongs to the user
      if (invoiceId) {
        const invoice = await storage.getInvoice(invoiceId);
        if (!invoice) {
          return res.status(404).json({ message: "Invoice not found" });
        }
        
        if (invoice.user_id !== req.user.id && req.user.role !== 'admin') {
          return res.status(403).json({ message: "Access denied" });
        }
      }
      
      // Get a mock payment intent for our simulation
      const paymentIntent = await stripeService.createPaymentIntent(amount);
      
      // If there's an invoice, associate the payment intent with it
      if (invoiceId) {
        // Mark the invoice as paid directly
        await storage.markInvoiceAsPaid(invoiceId, "simulated payment", paymentIntent.id);
      }
      
      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/subscriptions/create", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const { planId, paymentMethodId } = req.body;
      
      if (!planId || !paymentMethodId) {
        return res.status(400).json({ message: "Plan ID and payment method ID are required" });
      }
      
      // Create mock subscription directly through our service
      const result = await stripeService.createSubscription(req.user.id, planId, paymentMethodId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  // Discount approval routes
  app.get("/api/discount-requests", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      // Only admins can see all pending discount requests
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const requests = await storage.listPendingDiscountRequests();
      res.json(requests);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/discount-requests", async (req, res, next) => {
    try {
      if (!req.isAuthenticated() || !['sales', 'admin'].includes(req.user.role)) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Validate request body
      const validateResult = insertDiscountRequestSchema.safeParse(req.body);
      if (!validateResult.success) {
        return res.status(400).json({ message: "Invalid discount request data", errors: validateResult.error });
      }
      
      // Check if the user is a sales person and the discount is within their limit
      if (req.user.role === 'sales') {
        // If both discount percent and amount are provided, check both
        if (validateResult.data.discount_percent) {
          const percentValue = Number(validateResult.data.discount_percent);
          const discountLimit = req.user.discount_limit || 0;
          if (percentValue > discountLimit) {
            return res.status(403).json({ 
              message: `Discount exceeds your limit of ${discountLimit}%. Please submit for approval.` 
            });
          }
        }
        
        // For amount-based discounts, we would need to calculate the percentage based on the quote value
        // This is a simplified check
        if (validateResult.data.discount_amount && validateResult.data.quote_id) {
          const quote = await storage.getQuote(validateResult.data.quote_id);
          if (quote) {
            const percentValue = (validateResult.data.discount_amount / quote.subtotal) * 100;
            const discountLimit = req.user.discount_limit || 0;
            if (percentValue > discountLimit) {
              return res.status(403).json({ 
                message: `Discount exceeds your limit of ${discountLimit}%. Please submit for approval.` 
              });
            }
          }
        }
      }
      
      // Set the requestor to the current user
      const requestData = {
        ...validateResult.data,
        requested_by: req.user.id
      };
      
      const request = await storage.createDiscountRequest(requestData);
      res.status(201).json(request);
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/discount-requests/:id/approve", async (req, res, next) => {
    try {
      if (!req.isAuthenticated() || req.user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const requestId = parseInt(req.params.id);
      const { notes } = req.body;
      
      const discountRequest = await storage.getDiscountRequest(requestId);
      if (!discountRequest) {
        return res.status(404).json({ message: "Discount request not found" });
      }
      
      if (discountRequest.status !== 'pending') {
        return res.status(400).json({ message: "This request has already been processed" });
      }
      
      const updatedRequest = await storage.approveDiscountRequest(requestId, req.user.id, notes);
      res.json(updatedRequest);
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/discount-requests/:id/reject", async (req, res, next) => {
    try {
      if (!req.isAuthenticated() || req.user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const requestId = parseInt(req.params.id);
      const { notes } = req.body;
      
      const discountRequest = await storage.getDiscountRequest(requestId);
      if (!discountRequest) {
        return res.status(404).json({ message: "Discount request not found" });
      }
      
      if (discountRequest.status !== 'pending') {
        return res.status(400).json({ message: "This request has already been processed" });
      }
      
      const updatedRequest = await storage.rejectDiscountRequest(requestId, req.user.id, notes);
      res.json(updatedRequest);
    } catch (error) {
      next(error);
    }
  });

  // Job Description management routes
  app.get("/api/job-descriptions", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      // Filter by user ID
      const userId = req.query.userId ? parseInt(req.query.userId as string) : req.user.id;
      
      // Regular users can only see their own job descriptions
      if (userId !== req.user.id && !['admin'].includes(req.user.role)) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const jobDescriptions = await storage.listJobDescriptionsByUserId(userId);
      res.json(jobDescriptions);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/job-descriptions/public", async (_req, res, next) => {
    try {
      const jobDescriptions = await storage.listPublicJobDescriptions();
      res.json(jobDescriptions);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/job-descriptions/:id", async (req, res, next) => {
    try {
      const jobId = parseInt(req.params.id);
      const jobDescription = await storage.getJobDescription(jobId);
      
      if (!jobDescription) {
        return res.status(404).json({ message: "Job description not found" });
      }
      
      // Check if the job is public or if the user is authenticated and is the owner or admin
      const isPublic = jobDescription.is_public;
      const isOwner = req.isAuthenticated() && req.user.id === jobDescription.user_id;
      const isAdmin = req.isAuthenticated() && req.user.role === 'admin';
      
      if (!isPublic && !isOwner && !isAdmin) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(jobDescription);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/job-descriptions", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      // Validate and create directly - this endpoint doesn't use AI generation
      const validateResult = insertJobDescriptionSchema.safeParse(req.body);
      if (!validateResult.success) {
        return res.status(400).json({ message: "Invalid job description data", errors: fromZodError(validateResult.error) });
      }
      
      // Only allow users to create job descriptions for themselves
      const jobData = {
        ...validateResult.data,
        user_id: req.user.id
      };
      
      const jobDescription = await storage.createJobDescription(jobData);
      res.status(201).json(jobDescription);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/job-descriptions/generate", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const { title, company, department, seniority, industry, skills, customInstructions } = req.body;
      
      if (!title) {
        return res.status(400).json({ message: "Job title is required" });
      }
      
      try {
        const jobDescription = await generateJobDescription({
          userId: req.user.id,
          title,
          company,
          department,
          seniority,
          industry,
          skills,
          customInstructions
        });
        
        res.status(201).json(jobDescription);
      } catch (error: any) {
        if (error.message.includes("token balance")) {
          return res.status(400).json({ message: error.message });
        }
        throw error;
      }
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/job-descriptions/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const jobId = parseInt(req.params.id);
      const jobDescription = await storage.getJobDescription(jobId);
      
      if (!jobDescription) {
        return res.status(404).json({ message: "Job description not found" });
      }
      
      // Only the owner or admin can update a job description
      if (jobDescription.user_id !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const updatedJobDescription = await storage.updateJobDescription(jobId, req.body);
      res.json(updatedJobDescription);
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/job-descriptions/:id/visibility", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const jobId = parseInt(req.params.id);
      const { is_public } = req.body;
      
      if (typeof is_public !== 'boolean') {
        return res.status(400).json({ message: "is_public must be a boolean" });
      }
      
      const jobDescription = await storage.getJobDescription(jobId);
      
      if (!jobDescription) {
        return res.status(404).json({ message: "Job description not found" });
      }
      
      // Only the owner or admin can update visibility
      if (jobDescription.user_id !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const updatedJobDescription = await storage.updateJobDescription(jobId, { is_public });
      res.json(updatedJobDescription);
    } catch (error) {
      next(error);
    }
  });

  // Reports
  app.get("/api/reports/metrics", async (req, res, next) => {
    try {
      if (!req.isAuthenticated() || !['admin', 'finance'].includes(req.user.role)) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const mrr = await storage.getMonthlyRecurringRevenue();
      const arr = await storage.getAnnualRecurringRevenue();
      const churnRate = await storage.getChurnRate();
      const activeSubscriptionsCount = await storage.getActiveSubscriptionsCount();
      
      res.json({
        mrr,
        arr,
        churnRate,
        activeSubscriptionsCount
      });
    } catch (error) {
      next(error);
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);

  return httpServer;
}
