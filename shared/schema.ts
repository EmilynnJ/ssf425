import { pgTable, text, serial, integer, boolean, timestamp, json, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  fullName: text("full_name").notNull(),
  profileImage: text("profile_image"),
  role: text("role", { enum: ["client", "reader", "admin"] }).notNull().default("client"),
  bio: text("bio"),
  specialties: text("specialties", { array: true }),
  pricing: integer("pricing"),
  rating: integer("rating"),
  reviewCount: integer("review_count").default(0),
  verified: boolean("verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  lastActive: timestamp("last_active").defaultNow(),
  isOnline: boolean("is_online").default(false),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull().references(() => users.id),
  receiverId: integer("receiver_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  isPaid: boolean("is_paid").default(false),
  price: integer("price"),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const readings = pgTable("readings", {
  id: serial("id").primaryKey(),
  readerId: integer("reader_id").notNull().references(() => users.id),
  clientId: integer("client_id").notNull().references(() => users.id),
  status: text("status", { enum: ["scheduled", "in_progress", "completed", "cancelled"] }).notNull(),
  type: text("type", { enum: ["chat", "video", "voice"] }).notNull(),
  scheduledFor: timestamp("scheduled_for"),
  duration: integer("duration").notNull(), // in minutes
  price: integer("price").notNull(), // in cents
  notes: text("notes"),
  rating: integer("rating"),
  review: text("review"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: integer("price").notNull(), // in cents
  imageUrl: text("image_url").notNull(),
  category: text("category").notNull(),
  stock: integer("stock").notNull(),
  featured: boolean("featured").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  status: text("status", { enum: ["pending", "processing", "shipped", "delivered", "cancelled"] }).notNull(),
  total: integer("total").notNull(), // in cents
  shippingAddress: json("shipping_address").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => orders.id),
  productId: integer("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull(),
  price: integer("price").notNull(), // in cents
});

export const livestreams = pgTable("livestreams", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  thumbnailUrl: text("thumbnail_url").notNull(),
  status: text("status", { enum: ["scheduled", "live", "ended"] }).notNull(),
  scheduledFor: timestamp("scheduled_for"),
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  category: text("category").notNull(),
  viewerCount: integer("viewer_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const forumPosts = pgTable("forum_posts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  content: text("content").notNull(),
  category: text("category").notNull(),
  likes: integer("likes").default(0),
  views: integer("views").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const forumComments = pgTable("forum_comments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  postId: integer("post_id").notNull().references(() => forumPosts.id),
  content: text("content").notNull(),
  likes: integer("likes").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert Schemas

export const insertUserSchema = createInsertSchema(users)
  .omit({ id: true, createdAt: true, lastActive: true, isOnline: true, reviewCount: true });

export const insertReadingSchema = createInsertSchema(readings)
  .omit({ id: true, createdAt: true, completedAt: true, rating: true, review: true });

export const insertProductSchema = createInsertSchema(products)
  .omit({ id: true, createdAt: true });

export const insertOrderSchema = createInsertSchema(orders)
  .omit({ id: true, createdAt: true, updatedAt: true });

export const insertOrderItemSchema = createInsertSchema(orderItems)
  .omit({ id: true });

export const insertLivestreamSchema = createInsertSchema(livestreams)
  .omit({ id: true, createdAt: true, startedAt: true, endedAt: true, viewerCount: true });

export const insertForumPostSchema = createInsertSchema(forumPosts)
  .omit({ id: true, createdAt: true, updatedAt: true, likes: true, views: true });

export const insertForumCommentSchema = createInsertSchema(forumComments)
  .omit({ id: true, createdAt: true, updatedAt: true, likes: true });

export const insertMessageSchema = createInsertSchema(messages)
  .omit({ id: true, createdAt: true, readAt: true });

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type UserUpdate = Partial<InsertUser> & {
  isOnline?: boolean;
  lastActive?: Date;
};

export type InsertReading = z.infer<typeof insertReadingSchema>;
export type Reading = typeof readings.$inferSelect;

export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type OrderItem = typeof orderItems.$inferSelect;

export type InsertLivestream = z.infer<typeof insertLivestreamSchema>;
export type Livestream = typeof livestreams.$inferSelect;

export type InsertForumPost = z.infer<typeof insertForumPostSchema>;
export type ForumPost = typeof forumPosts.$inferSelect;

export type InsertForumComment = z.infer<typeof insertForumCommentSchema>;
export type ForumComment = typeof forumComments.$inferSelect;

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;
