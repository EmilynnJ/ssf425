import { users, type User, type InsertUser, readings, type Reading, type InsertReading, products, type Product, type InsertProduct, orders, type Order, type InsertOrder, orderItems, type OrderItem, type InsertOrderItem, livestreams, type Livestream, type InsertLivestream, forumPosts, type ForumPost, type InsertForumPost, forumComments, type ForumComment, type InsertForumComment, messages, type Message, type InsertMessage } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // User
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  getReaders(): Promise<User[]>;
  getOnlineReaders(): Promise<User[]>;
  
  // Readings
  createReading(reading: InsertReading): Promise<Reading>;
  getReading(id: number): Promise<Reading | undefined>;
  getReadingsByClient(clientId: number): Promise<Reading[]>;
  getReadingsByReader(readerId: number): Promise<Reading[]>;
  updateReading(id: number, reading: Partial<InsertReading>): Promise<Reading | undefined>;
  
  // Products
  createProduct(product: InsertProduct): Promise<Product>;
  getProduct(id: number): Promise<Product | undefined>;
  getProducts(): Promise<Product[]>;
  getFeaturedProducts(): Promise<Product[]>;
  updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product | undefined>;
  
  // Orders
  createOrder(order: InsertOrder): Promise<Order>;
  getOrder(id: number): Promise<Order | undefined>;
  getOrdersByUser(userId: number): Promise<Order[]>;
  updateOrder(id: number, order: Partial<InsertOrder>): Promise<Order | undefined>;
  
  // Order Items
  createOrderItem(orderItem: InsertOrderItem): Promise<OrderItem>;
  getOrderItems(orderId: number): Promise<OrderItem[]>;
  
  // Livestreams
  createLivestream(livestream: InsertLivestream): Promise<Livestream>;
  getLivestream(id: number): Promise<Livestream | undefined>;
  getLivestreams(): Promise<Livestream[]>;
  getLivestreamsByUser(userId: number): Promise<Livestream[]>;
  updateLivestream(id: number, livestream: Partial<InsertLivestream>): Promise<Livestream | undefined>;
  
  // Forum Posts
  createForumPost(forumPost: InsertForumPost): Promise<ForumPost>;
  getForumPost(id: number): Promise<ForumPost | undefined>;
  getForumPosts(): Promise<ForumPost[]>;
  updateForumPost(id: number, forumPost: Partial<InsertForumPost>): Promise<ForumPost | undefined>;
  
  // Forum Comments
  createForumComment(forumComment: InsertForumComment): Promise<ForumComment>;
  getForumCommentsByPost(postId: number): Promise<ForumComment[]>;
  
  // Messages
  createMessage(message: InsertMessage): Promise<Message>;
  getMessagesByUsers(userId1: number, userId2: number): Promise<Message[]>;
  getUnreadMessageCount(userId: number): Promise<number>;
  markMessageAsRead(id: number): Promise<Message | undefined>;
  
  // Session store for authentication
  sessionStore: session.SessionStore;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private readings: Map<number, Reading>;
  private products: Map<number, Product>;
  private orders: Map<number, Order>;
  private orderItems: Map<number, OrderItem>;
  private livestreams: Map<number, Livestream>;
  private forumPosts: Map<number, ForumPost>;
  private forumComments: Map<number, ForumComment>;
  private messages: Map<number, Message>;
  
  sessionStore: session.SessionStore;
  
  currentUserId: number;
  currentReadingId: number;
  currentProductId: number;
  currentOrderId: number;
  currentOrderItemId: number;
  currentLivestreamId: number;
  currentForumPostId: number;
  currentForumCommentId: number;
  currentMessageId: number;

  constructor() {
    this.users = new Map();
    this.readings = new Map();
    this.products = new Map();
    this.orders = new Map();
    this.orderItems = new Map();
    this.livestreams = new Map();
    this.forumPosts = new Map();
    this.forumComments = new Map();
    this.messages = new Map();
    
    this.currentUserId = 1;
    this.currentReadingId = 1;
    this.currentProductId = 1;
    this.currentOrderId = 1;
    this.currentOrderItemId = 1;
    this.currentLivestreamId = 1;
    this.currentForumPostId = 1;
    this.currentForumCommentId = 1;
    this.currentMessageId = 1;
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
    
    // Create initial data for demo purposes
    this.seedData();
  }

  // User
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username.toLowerCase() === username.toLowerCase()
    );
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email.toLowerCase() === email.toLowerCase()
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const now = new Date();
    const user: User = { 
      ...insertUser, 
      id, 
      createdAt: now, 
      lastActive: now, 
      isOnline: false,
      reviewCount: 0
    };
    this.users.set(id, user);
    return user;
  }
  
  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser: User = {
      ...user,
      ...userData,
      lastActive: new Date()
    };
    
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  async getReaders(): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => user.role === "reader");
  }
  
  async getOnlineReaders(): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => user.role === "reader" && user.isOnline);
  }
  
  // Readings
  async createReading(insertReading: InsertReading): Promise<Reading> {
    const id = this.currentReadingId++;
    const reading: Reading = {
      ...insertReading,
      id,
      createdAt: new Date(),
      completedAt: null
    };
    this.readings.set(id, reading);
    return reading;
  }
  
  async getReading(id: number): Promise<Reading | undefined> {
    return this.readings.get(id);
  }
  
  async getReadingsByClient(clientId: number): Promise<Reading[]> {
    return Array.from(this.readings.values()).filter(reading => reading.clientId === clientId);
  }
  
  async getReadingsByReader(readerId: number): Promise<Reading[]> {
    return Array.from(this.readings.values()).filter(reading => reading.readerId === readerId);
  }
  
  async updateReading(id: number, readingData: Partial<InsertReading>): Promise<Reading | undefined> {
    const reading = this.readings.get(id);
    if (!reading) return undefined;
    
    const updatedReading: Reading = {
      ...reading,
      ...readingData
    };
    
    this.readings.set(id, updatedReading);
    return updatedReading;
  }
  
  // Products
  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const id = this.currentProductId++;
    const product: Product = {
      ...insertProduct,
      id,
      createdAt: new Date()
    };
    this.products.set(id, product);
    return product;
  }
  
  async getProduct(id: number): Promise<Product | undefined> {
    return this.products.get(id);
  }
  
  async getProducts(): Promise<Product[]> {
    return Array.from(this.products.values());
  }
  
  async getFeaturedProducts(): Promise<Product[]> {
    return Array.from(this.products.values()).filter(product => product.featured);
  }
  
  async updateProduct(id: number, productData: Partial<InsertProduct>): Promise<Product | undefined> {
    const product = this.products.get(id);
    if (!product) return undefined;
    
    const updatedProduct: Product = {
      ...product,
      ...productData
    };
    
    this.products.set(id, updatedProduct);
    return updatedProduct;
  }
  
  // Orders
  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const id = this.currentOrderId++;
    const now = new Date();
    const order: Order = {
      ...insertOrder,
      id,
      createdAt: now,
      updatedAt: now
    };
    this.orders.set(id, order);
    return order;
  }
  
  async getOrder(id: number): Promise<Order | undefined> {
    return this.orders.get(id);
  }
  
  async getOrdersByUser(userId: number): Promise<Order[]> {
    return Array.from(this.orders.values()).filter(order => order.userId === userId);
  }
  
  async updateOrder(id: number, orderData: Partial<InsertOrder>): Promise<Order | undefined> {
    const order = this.orders.get(id);
    if (!order) return undefined;
    
    const updatedOrder: Order = {
      ...order,
      ...orderData,
      updatedAt: new Date()
    };
    
    this.orders.set(id, updatedOrder);
    return updatedOrder;
  }
  
  // Order Items
  async createOrderItem(insertOrderItem: InsertOrderItem): Promise<OrderItem> {
    const id = this.currentOrderItemId++;
    const orderItem: OrderItem = {
      ...insertOrderItem,
      id
    };
    this.orderItems.set(id, orderItem);
    return orderItem;
  }
  
  async getOrderItems(orderId: number): Promise<OrderItem[]> {
    return Array.from(this.orderItems.values()).filter(item => item.orderId === orderId);
  }
  
  // Livestreams
  async createLivestream(insertLivestream: InsertLivestream): Promise<Livestream> {
    const id = this.currentLivestreamId++;
    const livestream: Livestream = {
      ...insertLivestream,
      id,
      createdAt: new Date(),
      startedAt: null,
      endedAt: null,
      viewerCount: 0
    };
    this.livestreams.set(id, livestream);
    return livestream;
  }
  
  async getLivestream(id: number): Promise<Livestream | undefined> {
    return this.livestreams.get(id);
  }
  
  async getLivestreams(): Promise<Livestream[]> {
    return Array.from(this.livestreams.values());
  }
  
  async getLivestreamsByUser(userId: number): Promise<Livestream[]> {
    return Array.from(this.livestreams.values()).filter(livestream => livestream.userId === userId);
  }
  
  async updateLivestream(id: number, livestreamData: Partial<InsertLivestream>): Promise<Livestream | undefined> {
    const livestream = this.livestreams.get(id);
    if (!livestream) return undefined;
    
    const updatedLivestream: Livestream = {
      ...livestream,
      ...livestreamData
    };
    
    this.livestreams.set(id, updatedLivestream);
    return updatedLivestream;
  }
  
  // Forum Posts
  async createForumPost(insertForumPost: InsertForumPost): Promise<ForumPost> {
    const id = this.currentForumPostId++;
    const now = new Date();
    const forumPost: ForumPost = {
      ...insertForumPost,
      id,
      createdAt: now,
      updatedAt: now,
      likes: 0,
      views: 0
    };
    this.forumPosts.set(id, forumPost);
    return forumPost;
  }
  
  async getForumPost(id: number): Promise<ForumPost | undefined> {
    return this.forumPosts.get(id);
  }
  
  async getForumPosts(): Promise<ForumPost[]> {
    return Array.from(this.forumPosts.values());
  }
  
  async updateForumPost(id: number, forumPostData: Partial<InsertForumPost>): Promise<ForumPost | undefined> {
    const forumPost = this.forumPosts.get(id);
    if (!forumPost) return undefined;
    
    const updatedForumPost: ForumPost = {
      ...forumPost,
      ...forumPostData,
      updatedAt: new Date()
    };
    
    this.forumPosts.set(id, updatedForumPost);
    return updatedForumPost;
  }
  
  // Forum Comments
  async createForumComment(insertForumComment: InsertForumComment): Promise<ForumComment> {
    const id = this.currentForumCommentId++;
    const now = new Date();
    const forumComment: ForumComment = {
      ...insertForumComment,
      id,
      createdAt: now,
      updatedAt: now,
      likes: 0
    };
    this.forumComments.set(id, forumComment);
    return forumComment;
  }
  
  async getForumCommentsByPost(postId: number): Promise<ForumComment[]> {
    return Array.from(this.forumComments.values()).filter(comment => comment.postId === postId);
  }
  
  // Messages
  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = this.currentMessageId++;
    const message: Message = {
      ...insertMessage,
      id,
      createdAt: new Date(),
      readAt: null
    };
    this.messages.set(id, message);
    return message;
  }
  
  async getMessagesByUsers(userId1: number, userId2: number): Promise<Message[]> {
    return Array.from(this.messages.values()).filter(
      message => 
        (message.senderId === userId1 && message.receiverId === userId2) ||
        (message.senderId === userId2 && message.receiverId === userId1)
    );
  }
  
  async getUnreadMessageCount(userId: number): Promise<number> {
    return Array.from(this.messages.values()).filter(
      message => message.receiverId === userId && message.readAt === null
    ).length;
  }
  
  async markMessageAsRead(id: number): Promise<Message | undefined> {
    const message = this.messages.get(id);
    if (!message) return undefined;
    
    const updatedMessage: Message = {
      ...message,
      readAt: new Date()
    };
    
    this.messages.set(id, updatedMessage);
    return updatedMessage;
  }
  
  // Seed data for demonstration
  private seedData() {
    // Seeding is only for development and is handled elsewhere
  }
}

export const storage = new MemStorage();
