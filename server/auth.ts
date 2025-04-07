import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User, InsertUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends User {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  if (!process.env.SESSION_SECRET) {
    console.warn("SESSION_SECRET environment variable not set, using a random value");
  }

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || randomBytes(32).toString("hex"),
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    }
  };

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        // First try finding user by username
        let user = await storage.getUserByUsername(username);
        
        // If not found, try by email (allowing login with email)
        if (!user) {
          user = await storage.getUserByEmail(username);
        }
        
        // If user not found or password doesn't match
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false, { message: "Invalid email/username or password" });
        }
        
        // Check if user account is pending approval
        if (user.status === 'pending') {
          return done(null, false, { message: "Your account is pending approval by an administrator" });
        }
        
        // Check if user account is suspended
        if (user.status === 'suspended') {
          return done(null, false, { message: "Your account has been suspended. Please contact an administrator" });
        }
        
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Authentication routes
  app.post("/api/register", async (req, res, next) => {
    try {
      // Validate the request
      const { email, password, name, company, phone } = req.body;
      
      // Generate a username based on email (e.g., part before @)
      const username = email.split('@')[0] + Math.floor(Math.random() * 1000);
      
      // Check if user already exists
      const existingUsername = await storage.getUserByUsername(username);
      if (existingUsername) {
        return res.status(400).json({ message: "Username already exists. Please try again." });
      }

      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }

      // If admin is creating the user (internal user)
      if (req.user && req.user.role === 'admin') {
        const { role } = req.body;
        
        // Create the user with hashed password, no approval needed
        const hashedPassword = await hashPassword(password);
        const userData: InsertUser = {
          username,
          email,
          password: hashedPassword,
          name,
          role: role || 'customer',  // Admin can specify any role
          company,
          status: 'active',
          phone
        };

        const newUser = await storage.createUser(userData);
        const userWithoutPassword = { ...newUser, password: undefined };
        
        // Admin is creating a user, don't log them in
        res.status(201).json(userWithoutPassword);
      } 
      // Self-registration (customer or partner) that needs approval
      else {
        // Create the user with hashed password and pending status
        const hashedPassword = await hashPassword(password);
        const userData: InsertUser = {
          username,
          email,
          password: hashedPassword,
          name,
          role: 'customer',  // Default role for self-registration
          company,
          status: 'pending', // Pending admin approval
          phone
        };

        const newUser = await storage.createUser(userData);
        
        // Don't immediately log in the user since they need approval
        res.status(201).json({ 
          message: "Registration successful. Your account is pending approval by an administrator.",
          user: { ...newUser, password: undefined }
        });
      }
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: Error, user: User, info: any) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }
      req.login(user, (loginErr) => {
        if (loginErr) {
          return next(loginErr);
        }
        // Don't send the hashed password to the client
        const userWithoutPassword = { ...user, password: undefined };
        return res.status(200).json(userWithoutPassword);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) {
        return next(err);
      }
      res.status(200).json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    // Don't send the hashed password to the client
    const userWithoutPassword = { ...req.user, password: undefined };
    res.json(userWithoutPassword);
  });
  
  // Additional user management routes for admins
  
  // Get all users - admin only  
  app.get("/api/users", async (req, res, next) => {
    try {
      if (!req.isAuthenticated() || req.user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const users = await storage.listUsers();
      
      // Don't send passwords
      const sanitizedUsers = users.map(user => ({
        ...user,
        password: undefined
      }));
      
      res.json(sanitizedUsers);
    } catch (error) {
      next(error);
    }
  });
  
  // Get all pending user registrations
  app.get("/api/users/pending", async (req, res, next) => {
    try {
      if (!req.isAuthenticated() || req.user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const pendingUsers = await storage.getUsersByStatus('pending');
      
      // Don't send passwords
      const sanitizedUsers = pendingUsers.map(user => ({
        ...user,
        password: undefined
      }));
      
      res.json(sanitizedUsers);
    } catch (error) {
      next(error);
    }
  });
  
  // Approve a pending user registration
  app.post("/api/users/:id/approve", async (req, res, next) => {
    try {
      if (!req.isAuthenticated() || req.user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const userId = parseInt(req.params.id);
      const { role } = req.body; // Admin can optionally update the role
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (user.status !== 'pending') {
        return res.status(400).json({ message: "User is not in pending status" });
      }
      
      // Update user status to active and potentially update role
      const updatedUser = await storage.updateUser(userId, { 
        status: 'active',
        ...(role && { role }) 
      });
      
      res.json({ 
        message: "User approved successfully", 
        user: { ...updatedUser, password: undefined } 
      });
    } catch (error) {
      next(error);
    }
  });
  
  // Reject/suspend a user
  app.post("/api/users/:id/suspend", async (req, res, next) => {
    try {
      if (!req.isAuthenticated() || req.user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const userId = parseInt(req.params.id);
      const { reason } = req.body;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Update user status to suspended
      const updatedUser = await storage.updateUser(userId, { 
        status: 'suspended',
        suspension_reason: reason || 'Suspended by administrator'
      });
      
      res.json({ 
        message: "User suspended successfully", 
        user: { ...updatedUser, password: undefined } 
      });
    } catch (error) {
      next(error);
    }
  });

  // Role-based middleware
  function requireRole(role: string | string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const roles = Array.isArray(role) ? role : [role];
      if (!roles.includes(req.user.role)) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      next();
    };
  }

  // Make the role middleware available for routes
  app.use((req, _res, next) => {
    (req as any).requireRole = requireRole;
    next();
  });
}
