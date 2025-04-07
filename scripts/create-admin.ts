import { db } from "../server/db";
import { users } from "../shared/schema";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { eq } from "drizzle-orm";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function createAdminUser() {
  try {
    // Hash the admin password
    const hashedPassword = await hashPassword("Admin@123");
    
    // Check if admin already exists
    const [existingAdmin] = await db.select().from(users).where(eq(users.email, "admin@simplft.com"));

    if (existingAdmin) {
      console.log("Admin user exists, updating password...");
      // Update the admin password
      const [updatedAdmin] = await db
        .update(users)
        .set({ password: hashedPassword })
        .where(eq(users.email, "admin@simplft.com"))
        .returning();

      console.log("Admin password updated successfully:");
      console.log({
        username: updatedAdmin.username,
        email: updatedAdmin.email,
        role: updatedAdmin.role,
        status: updatedAdmin.status,
      });
    } else {
      // Create new admin user with hashed password
      const [admin] = await db
        .insert(users)
        .values({
          username: "admin",
          email: "admin@simplft.com",
          password: hashedPassword,
          name: "System Administrator",
          role: "admin",
          status: "active",
          company: "Simplft", 
          phone: "1234567890",
          created_at: new Date()
        })
        .returning();

      console.log("Admin user created successfully:");
      console.log({
        username: admin.username,
        email: admin.email,
        role: admin.role,
        status: admin.status,
      });
    }
  } catch (error) {
    console.error("Error creating/updating admin user:", error);
  } finally {
    process.exit(0);
  }
}

createAdminUser();