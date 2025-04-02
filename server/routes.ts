import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { z } from "zod";
import { UserUpdate, Reading } from "@shared/schema";
import stripeClient from "./services/stripe-client";
import trtcClient from "./services/trtc-client";
import * as muxClient from "./services/mux-client";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);
  
  // Create HTTP server
  const httpServer = createServer(app);
  
  // Setup WebSocket server for live readings and real-time communication
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Track all connected WebSocket clients
  const connectedClients = new Map();
  let clientIdCounter = 1;
  
  // Broadcast a message to all connected clients
  const broadcastToAll = (message: any) => {
    const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
    console.log(`Broadcasting message to all clients: ${messageStr}`);
    
    let sentCount = 0;
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(messageStr);
          sentCount++;
        } catch (error) {
          console.error("Error sending message to client:", error);
        }
      }
    });
    
    console.log(`Successfully sent message to ${sentCount} clients`);
  };
  
  // Send a notification to a specific user if they're connected
  const notifyUser = (userId: number, notification: any) => {
    const userClients = Array.from(connectedClients.entries())
      .filter(([_, data]) => data.userId === userId)
      .map(([clientId]) => clientId);
      
    userClients.forEach(clientId => {
      const clientSocket = connectedClients.get(clientId)?.socket;
      if (clientSocket && clientSocket.readyState === WebSocket.OPEN) {
        clientSocket.send(JSON.stringify(notification));
      }
    });
  };
  
  // Make WebSocket methods available globally
  (global as any).websocket = {
    broadcastToAll,
    notifyUser
  };
  
  // Broadcast activity to keep readings page updated in real-time
  const broadcastReaderActivity = async (readerId: number, status: string) => {
    try {
      const reader = await storage.getUser(readerId);
      if (!reader) return;
      
      // Extract safe reader data
      const { password, ...safeReader } = reader;
      
      broadcastToAll({
        type: 'reader_status_change',
        reader: safeReader,
        status,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Error broadcasting reader activity:', error);
    }
  };
  
  wss.on('connection', (ws, req) => {
    const clientId = clientIdCounter++;
    let userId: number | null = null;
    
    console.log(`WebSocket client connected [id=${clientId}]`);
    
    // Store client connection
    connectedClients.set(clientId, { socket: ws, userId });
    
    // Send initial welcome message with client ID
    ws.send(JSON.stringify({ 
      type: 'connected', 
      message: 'Connected to SoulSeer WebSocket Server',
      clientId,
      serverTime: Date.now()
    }));
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log(`WebSocket message received from client ${clientId}:`, data.type);
        
        // Handle ping messages
        if (data.type === 'ping') {
          console.log(`Received ping from client ${clientId}, sending pong`);
          ws.send(JSON.stringify({ 
            type: 'pong', 
            timestamp: data.timestamp,
            serverTime: Date.now()
          }));
        }
        
        // Handle chat messages (direct client-to-client communication)
        else if (data.type === 'chat_message' && data.readingId) {
          console.log(`Received chat message for reading ${data.readingId} from client ${clientId}`);
          
          // Broadcast to all connected clients
          broadcastToAll({
            type: 'chat_message',
            readingId: data.readingId,
            senderId: data.senderId || userId,
            senderName: data.senderName,
            message: data.message,
            timestamp: Date.now()
          });
        }
        
        // Handle authentication
        else if (data.type === 'authenticate' && data.userId) {
          userId = data.userId;
          
          // Update the client data with user ID
          connectedClients.set(clientId, { socket: ws, userId });
          
          console.log(`Client ${clientId} authenticated as user ${userId}`);
          
          // If user is a reader, broadcast their online status
          if (userId !== null) {
            storage.getUser(userId).then(user => {
              if (user && user.role === 'reader') {
                const update: UserUpdate = { isOnline: true };
                storage.updateUser(userId as number, update);
                broadcastReaderActivity(userId as number, 'online');
              }
            }).catch(err => {
              console.error('Error updating reader status:', err);
            });
          }
          
          // Confirm authentication success
          ws.send(JSON.stringify({
            type: 'authentication_success',
            userId,
            timestamp: Date.now()
          }));
        }
        
        // Handle subscribing to specific channels
        else if (data.type === 'subscribe' && data.channel) {
          console.log(`Client ${clientId} subscribed to ${data.channel}`);
          
          // Store subscription data with the client
          const clientData = connectedClients.get(clientId);
          if (clientData) {
            connectedClients.set(clientId, {
              ...clientData,
              subscriptions: [...(clientData.subscriptions || []), data.channel]
            });
          }
          
          ws.send(JSON.stringify({
            type: 'subscription_success',
            channel: data.channel,
            timestamp: Date.now()
          }));
        }
        
        // Handle WebRTC signaling messages
        else if (['offer', 'answer', 'ice_candidate', 'call_ended', 'join_reading', 'call_connected'].includes(data.type) && data.readingId) {
          console.log(`WebRTC signaling: ${data.type} for reading ${data.readingId}`);
          
          // If this is a join message, broadcast it to everyone to notify them
          if (data.type === 'join_reading') {
            broadcastToAll(data);
          }
          // If this message has a specific recipient, forward it only to them
          else if (data.recipientId) {
            notifyUser(data.recipientId, data);
          }
          // Otherwise broadcast it to all clients associated with this reading
          else {
            broadcastToAll(data);
          }
        }
      } catch (error) {
        console.error(`Error processing WebSocket message from client ${clientId}:`, error);
        
        // Send error notification back to client
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Failed to process message',
          timestamp: Date.now()
        }));
      }
    });
    
    ws.on('close', (code, reason) => {
      console.log(`WebSocket client ${clientId} disconnected. Code: ${code}, Reason: ${reason}`);
      
      // If user is a reader, update their status and broadcast offline status
      if (userId !== null) {
        storage.getUser(userId).then(user => {
          if (user && user.role === 'reader') {
            const update: UserUpdate = { isOnline: false };
            storage.updateUser(userId as number, update);
            broadcastReaderActivity(userId as number, 'offline');
          }
        }).catch(err => {
          console.error('Error updating reader status on disconnect:', err);
        });
      }
      
      // Remove client from connected clients
      connectedClients.delete(clientId);
    });
    
    ws.on('error', (error) => {
      console.error(`WebSocket error for client ${clientId}:`, error);
      connectedClients.delete(clientId);
    });
  });
  
  // Add WebSocket related utilities to global scope for use in API routes
  (global as any).websocket = {
    broadcastToAll,
    notifyUser,
    broadcastReaderActivity
  };
  
  // API Routes
  
  // Readers
  app.get("/api/readers", async (req, res) => {
    try {
      const readers = await storage.getReaders();
      // Remove sensitive data
      const sanitizedReaders = readers.map(reader => {
        const { password, ...safeReader } = reader;
        return safeReader;
      });
      res.json(sanitizedReaders);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch readers" });
    }
  });
  
  app.get("/api/readers/online", async (req, res) => {
    try {
      const readers = await storage.getOnlineReaders();
      // Remove sensitive data
      const sanitizedReaders = readers.map(reader => {
        const { password, ...safeReader } = reader;
        return safeReader;
      });
      res.json(sanitizedReaders);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch online readers" });
    }
  });
  
  app.get("/api/readers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid reader ID" });
      }
      
      const reader = await storage.getUser(id);
      if (!reader || reader.role !== "reader") {
        return res.status(404).json({ message: "Reader not found" });
      }
      
      // Remove sensitive data
      const { password, ...safeReader } = reader;
      res.json(safeReader);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch reader" });
    }
  });
  
  // Update reader status (online/offline)
  app.patch("/api/readers/status", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "reader") {
      return res.status(403).json({ message: "Not authorized" });
    }
    
    try {
      const { isOnline } = req.body;
      
      if (isOnline === undefined) {
        return res.status(400).json({ message: "isOnline status is required" });
      }
      
      const updatedUser = await storage.updateUser(req.user.id, {
        isOnline,
        lastActive: new Date()
      });
      
      // Broadcast status change to all connected clients
      broadcastReaderActivity(req.user.id, isOnline ? 'online' : 'offline');
      
      res.json({ success: true, user: updatedUser });
    } catch (error) {
      res.status(500).json({ message: "Failed to update status" });
    }
  });
  
  // Update reader pricing
  app.patch("/api/readers/pricing", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "reader") {
      return res.status(403).json({ message: "Not authorized" });
    }
    
    try {
      const { pricingChat, pricingVoice, pricingVideo } = req.body;
      
      if (pricingChat === undefined && pricingVoice === undefined && pricingVideo === undefined) {
        return res.status(400).json({ message: "At least one pricing field is required" });
      }
      
      // Validate pricing values
      const update: UserUpdate = {};
      
      if (pricingChat !== undefined) {
        if (isNaN(pricingChat) || pricingChat < 0) {
          return res.status(400).json({ message: "Chat pricing must be a positive number" });
        }
        update.pricingChat = pricingChat;
      }
      
      if (pricingVoice !== undefined) {
        if (isNaN(pricingVoice) || pricingVoice < 0) {
          return res.status(400).json({ message: "Voice pricing must be a positive number" });
        }
        update.pricingVoice = pricingVoice;
      }
      
      if (pricingVideo !== undefined) {
        if (isNaN(pricingVideo) || pricingVideo < 0) {
          return res.status(400).json({ message: "Video pricing must be a positive number" });
        }
        update.pricingVideo = pricingVideo;
      }
      
      // Update the pricing
      const updatedUser = await storage.updateUser(req.user.id, update);
      
      // Remove sensitive data before returning
      const { password, ...safeUser } = updatedUser;
      
      res.json({ success: true, user: safeUser });
    } catch (error) {
      console.error("Failed to update reader pricing:", error);
      res.status(500).json({ message: "Failed to update pricing" });
    }
  });
  
  // Readings
  app.post("/api/readings", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const readingData = req.body;
      
      const reading = await storage.createReading({
        readerId: readingData.readerId,
        clientId: req.user.id,
        status: "scheduled",
        type: readingData.type,
        readingMode: "scheduled",
        scheduledFor: readingData.scheduledFor ? new Date(readingData.scheduledFor) : null,
        duration: readingData.duration || null,
        pricePerMinute: readingData.pricePerMinute || 100,
        notes: readingData.notes || null
      });
      
      res.status(201).json(reading);
    } catch (error) {
      res.status(500).json({ message: "Failed to create reading" });
    }
  });
  
  app.get("/api/readings/client", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const readings = await storage.getReadingsByClient(req.user.id);
      res.json(readings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch readings" });
    }
  });
  
  app.get("/api/readings/reader", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "reader") {
      return res.status(401).json({ message: "Not authenticated as reader" });
    }
    
    try {
      const readings = await storage.getReadingsByReader(req.user.id);
      res.json(readings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch readings" });
    }
  });
  
  app.get("/api/readings/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid reading ID" });
      }
      
      const reading = await storage.getReading(id);
      if (!reading) {
        return res.status(404).json({ message: "Reading not found" });
      }
      
      // Check if user is authorized (client or reader of this reading)
      if (req.user.id !== reading.clientId && req.user.id !== reading.readerId && req.user.role !== "admin") {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      res.json(reading);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch reading" });
    }
  });
  
  app.patch("/api/readings/:id/status", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid reading ID" });
      }
      
      const reading = await storage.getReading(id);
      if (!reading) {
        return res.status(404).json({ message: "Reading not found" });
      }
      
      // Check if user is authorized (client or reader of this reading)
      if (req.user.id !== reading.clientId && req.user.id !== reading.readerId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      const { status } = req.body;
      
      // Update reading status
      const updatedReading = await storage.updateReading(id, { status });
      
      res.json(updatedReading);
    } catch (error) {
      res.status(500).json({ message: "Failed to update reading status" });
    }
  });
  
  // Send a chat message in a reading session
  app.post("/api/readings/:id/message", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid reading ID" });
      }
      
      const reading = await storage.getReading(id);
      if (!reading) {
        return res.status(404).json({ message: "Reading not found" });
      }
      
      // Check if user is authorized (client or reader of this reading)
      if (req.user.id !== reading.clientId && req.user.id !== reading.readerId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      const { message } = req.body;
      
      if (!message) {
        return res.status(400).json({ message: "Message is required" });
      }
      
      // Broadcast the message to both participants
      (global as any).websocket.broadcastToAll({
        type: 'chat_message',
        readingId: reading.id,
        senderId: req.user.id,
        senderName: req.user.fullName || req.user.username,
        message,
        timestamp: Date.now()
      });
      
      res.status(200).json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to send message" });
    }
  });
  
  // End a reading session
  app.post("/api/readings/:id/end", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid reading ID" });
      }
      
      const reading = await storage.getReading(id);
      if (!reading) {
        return res.status(404).json({ message: "Reading not found" });
      }
      
      // Check if user is authorized (client or reader of this reading)
      if (req.user.id !== reading.clientId && req.user.id !== reading.readerId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      const { duration } = req.body;
      
      if (!duration || isNaN(duration)) {
        return res.status(400).json({ message: "Valid duration is required" });
      }
      
      // Calculate final cost based on duration and price per minute
      const durationInMinutes = Math.ceil(duration / 60); // Convert seconds to minutes, round up
      const totalCost = reading.pricePerMinute * durationInMinutes;
      
      // Update reading with duration, status, and end time
      const updatedReading = await storage.updateReading(id, {
        status: "completed",
        duration,
        totalCost,
        endedAt: new Date()
      });
      
      // Process the payment if this is an on-demand reading
      if (reading.readingMode === 'on_demand') {
        try {
          await processCompletedReadingPayment(
            reading.id,
            totalCost,
            durationInMinutes
          );
        } catch (paymentError) {
          console.error('Error processing payment:', paymentError);
          // Continue anyway as the reading is completed
        }
      }
      
      // Notify both client and reader about the end of the session
      (global as any).websocket.broadcastToAll({
        type: 'reading_ended',
        readingId: reading.id,
        duration,
        totalCost,
        timestamp: Date.now()
      });
      
      res.json(updatedReading);
    } catch (error) {
      console.error('Error ending reading:', error);
      res.status(500).json({ message: "Failed to end reading session" });
    }
  });
  
  // Products
  app.get("/api/products", async (req, res) => {
    try {
      console.log("Getting products from database...");
      const products = await storage.getProducts();
      console.log(`Found ${products.length} products`);
      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });
  
  app.get("/api/products/featured", async (req, res) => {
    try {
      console.log("Getting featured products from database...");
      const products = await storage.getFeaturedProducts();
      console.log(`Found ${products.length} featured products`);
      res.json(products);
    } catch (error) {
      console.error("Error fetching featured products:", error);
      res.status(500).json({ message: "Failed to fetch featured products" });
    }
  });
  
  app.get("/api/products/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid product ID" });
      }
      
      const product = await storage.getProduct(id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      res.json(product);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });
  
  // Stripe payment intent creation for shop checkout
  app.post("/api/create-payment-intent", async (req, res) => {
    try {
      const { amount } = req.body;
      
      if (!process.env.STRIPE_SECRET_KEY) {
        throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
      }
      
      if (!amount || amount <= 0) {
        return res.status(400).json({ message: "Valid amount is required" });
      }
      
      const { clientSecret, paymentIntentId } = await stripeClient.createPaymentIntent({
        amount,
        currency: "usd",
        metadata: {
          integration_check: 'accept_a_payment',
          source: 'shop_checkout'
        },
      });
      
      res.json({ clientSecret, paymentIntentId });
    } catch (error: any) {
      console.error('Error creating payment intent:', error);
      res.status(500).json({ message: error.message });
    }
  });
  
  // Admin-only routes for product management
  app.post("/api/products", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }
    
    try {
      const productData = req.body;
      const product = await storage.createProduct(productData);
      res.status(201).json(product);
    } catch (error) {
      res.status(500).json({ message: "Failed to create product" });
    }
  });
  
  app.patch("/api/products/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }
    
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid product ID" });
      }
      
      const product = await storage.getProduct(id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      const updatedProduct = await storage.updateProduct(id, req.body);
      res.json(updatedProduct);
    } catch (error) {
      res.status(500).json({ message: "Failed to update product" });
    }
  });
  
  // Sync all products with Stripe
  app.post("/api/products/sync-with-stripe", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }
    
    try {
      // 1. Get all products from database
      const dbProducts = await storage.getProducts();
      
      // 2. Sync each product with Stripe
      const results = await Promise.all(
        dbProducts.map(async (product) => {
          try {
            const { stripeProductId, stripePriceId } = await stripeClient.syncProductWithStripe(product);
            
            // 3. Update product in database with Stripe IDs
            await storage.updateProduct(product.id, { 
              stripeProductId, 
              stripePriceId 
            });
            
            return { 
              id: product.id, 
              name: product.name, 
              success: true,
              stripeProductId,
              stripePriceId
            };
          } catch (error: any) {
            return { 
              id: product.id, 
              name: product.name, 
              success: false, 
              error: error.message 
            };
          }
        })
      );
      
      // 4. Return results
      res.json({
        totalProducts: dbProducts.length,
        successCount: results.filter(r => r.success).length,
        failureCount: results.filter(r => !r.success).length,
        results
      });
    } catch (error: any) {
      console.error("Error syncing products with Stripe:", error);
      res.status(500).json({ message: "Failed to sync products with Stripe" });
    }
  });
  
  // Import products from Stripe
  app.post("/api/products/import-from-stripe", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }
    
    try {
      // 1. Get products from Stripe
      const stripeProducts = await stripeClient.fetchStripeProducts();
      
      // 2. Get existing products from DB to check for duplicates
      const dbProducts = await storage.getProducts();
      const existingStripeProductIds = new Set(
        dbProducts
          .filter(p => p.stripeProductId)
          .map(p => p.stripeProductId)
      );
      
      // 3. Filter out products that already exist in the database
      const newProducts = stripeProducts.filter(
        p => !existingStripeProductIds.has(p.stripeProductId)
      );
      
      // 4. Import new products into database
      const importResults = await Promise.all(
        newProducts.map(async (product) => {
          try {
            const newProduct = await storage.createProduct({
              name: product.name,
              description: product.description,
              price: product.price,
              imageUrl: product.imageUrl,
              category: product.category,
              stock: product.stock,
              featured: product.featured,
              stripeProductId: product.stripeProductId,
              stripePriceId: product.stripePriceId
            });
            
            return { 
              id: newProduct.id, 
              name: newProduct.name, 
              success: true 
            };
          } catch (error: any) {
            return { 
              name: product.name, 
              success: false, 
              error: error.message 
            };
          }
        })
      );
      
      // 5. Return results
      res.json({
        totalImported: newProducts.length,
        successCount: importResults.filter(r => r.success).length,
        failureCount: importResults.filter(r => !r.success).length,
        results: importResults
      });
    } catch (error: any) {
      console.error("Error importing products from Stripe:", error);
      res.status(500).json({ message: "Failed to import products from Stripe" });
    }
  });
  
  // Orders
  app.post("/api/orders", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const orderData = req.body;
      
      // Create order
      const order = await storage.createOrder({
        userId: req.user.id,
        status: "pending",
        total: orderData.total,
        shippingAddress: orderData.shippingAddress
      });
      
      // Create order items
      for (const item of orderData.items) {
        await storage.createOrderItem({
          orderId: order.id,
          productId: item.productId,
          quantity: item.quantity,
          price: item.price
        });
      }
      
      res.status(201).json(order);
    } catch (error) {
      res.status(500).json({ message: "Failed to create order" });
    }
  });
  
  app.get("/api/orders", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const orders = await storage.getOrdersByUser(req.user.id);
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });
  
  app.get("/api/orders/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid order ID" });
      }
      
      const order = await storage.getOrder(id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // Check if user is authorized
      if (req.user.id !== order.userId && req.user.role !== "admin") {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      // Get order items
      const orderItems = await storage.getOrderItems(id);
      
      res.json({ ...order, items: orderItems });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch order" });
    }
  });
  
  // Livestreams
  app.get("/api/livestreams", async (req, res) => {
    try {
      const livestreams = await storage.getLivestreams();
      res.json(livestreams);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch livestreams" });
    }
  });
  
  app.post("/api/livestreams", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "reader") {
      return res.status(403).json({ message: "Not authorized" });
    }
    
    try {
      const livestreamData = req.body;
      
      // Create the livestream with MUX integration
      const livestream = await muxClient.createLivestream(
        req.user,
        livestreamData.title,
        livestreamData.description
      );
      
      // Add additional data from the request
      await storage.updateLivestream(livestream.id, {
        thumbnailUrl: livestreamData.thumbnailUrl || null,
        scheduledFor: livestreamData.scheduledFor ? new Date(livestreamData.scheduledFor) : null,
        category: livestreamData.category || "General"
      });
      
      // Return the livestream with streamUrl for broadcasting
      res.status(201).json({
        ...livestream,
        streamUrl: `rtmps://global-live.mux.com:443/app/${livestream.streamKey}`
      });
    } catch (error) {
      console.error("Failed to create livestream:", error);
      res.status(500).json({ message: "Failed to create livestream" });
    }
  });
  
  app.patch("/api/livestreams/:id/status", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid livestream ID" });
      }
      
      const livestream = await storage.getLivestream(id);
      if (!livestream) {
        return res.status(404).json({ message: "Livestream not found" });
      }
      
      // Check if user is authorized
      if (req.user.id !== livestream.userId && req.user.role !== "admin") {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      const { status } = req.body;
      
      // Update additional fields based on status
      let updateData: any = { status };
      
      if (status === "live") {
        updateData.startedAt = new Date();
      } else if (status === "ended") {
        updateData.endedAt = new Date();
      }
      
      const updatedLivestream = await storage.updateLivestream(id, updateData);
      
      res.json(updatedLivestream);
    } catch (error) {
      res.status(500).json({ message: "Failed to update livestream status" });
    }
  });
  
  // Forum
  app.get("/api/forum/posts", async (req, res) => {
    try {
      const posts = await storage.getForumPosts();
      res.json(posts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch forum posts" });
    }
  });
  
  app.post("/api/forum/posts", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const postData = req.body;
      
      const post = await storage.createForumPost({
        userId: req.user.id,
        title: postData.title,
        content: postData.content,
        category: postData.category
      });
      
      res.status(201).json(post);
    } catch (error) {
      res.status(500).json({ message: "Failed to create forum post" });
    }
  });

  app.get("/api/forum/posts/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid post ID" });
      }
      
      const post = await storage.getForumPost(id);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }
      
      // Increment view count
      const updatedPost = await storage.updateForumPost(id, {
        views: post.views + 1
      });
      
      res.json(updatedPost);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch post" });
    }
  });
  
  app.post("/api/forum/posts/:id/like", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid post ID" });
      }
      
      const post = await storage.getForumPost(id);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }
      
      // Increment likes
      const updatedPost = await storage.updateForumPost(id, {
        likes: post.likes + 1
      });
      
      res.json(updatedPost);
    } catch (error) {
      res.status(500).json({ message: "Failed to like post" });
    }
  });
  
  app.get("/api/forum/comments", async (req, res) => {
    try {
      const postId = req.query.postId ? parseInt(req.query.postId as string) : undefined;
      
      if (postId) {
        const comments = await storage.getForumCommentsByPost(postId);
        return res.json(comments);
      }
      
      res.status(400).json({ message: "Post ID is required" });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });
  
  app.get("/api/forum/posts/:id/comments", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid post ID" });
      }
      
      const comments = await storage.getForumCommentsByPost(id);
      res.json(comments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });
  
  app.post("/api/forum/posts/:id/comments", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid post ID" });
      }
      
      const post = await storage.getForumPost(id);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }
      
      const commentData = req.body;
      
      const comment = await storage.createForumComment({
        userId: req.user.id,
        postId: id,
        content: commentData.content
      });
      
      res.status(201).json(comment);
    } catch (error) {
      res.status(500).json({ message: "Failed to create comment" });
    }
  });
  
  // Messages
  app.get("/api/messages/:userId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const messages = await storage.getMessagesByUsers(req.user.id, userId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });
  
  app.post("/api/messages", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const messageData = req.body;
      
      const message = await storage.createMessage({
        senderId: req.user.id,
        receiverId: messageData.receiverId,
        content: messageData.content,
        isPaid: messageData.isPaid || false,
        price: messageData.price || null
      });
      
      res.status(201).json(message);
    } catch (error) {
      res.status(500).json({ message: "Failed to send message" });
    }
  });
  
  app.patch("/api/messages/:id/read", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid message ID" });
      }
      
      const updatedMessage = await storage.markMessageAsRead(id);
      if (!updatedMessage) {
        return res.status(404).json({ message: "Message not found" });
      }
      
      res.json(updatedMessage);
    } catch (error) {
      res.status(500).json({ message: "Failed to mark message as read" });
    }
  });
  
  app.get("/api/messages/unread/count", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const count = await storage.getUnreadMessageCount(req.user.id);
      res.json({ count });
    } catch (error) {
      res.status(500).json({ message: "Failed to get unread message count" });
    }
  });

  // On-demand reading endpoints (pay per minute)
  
  // Payment API endpoints
  app.get("/api/stripe/config", (req, res) => {
    res.json({
      publishableKey: process.env.VITE_STRIPE_PUBLIC_KEY
    });
  });
  
  // Create a payment intent for on-demand readings
  app.post("/api/stripe/create-payment-intent", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const { amount, readingId, metadata = {} } = req.body;
      
      if (!amount || isNaN(amount)) {
        return res.status(400).json({ message: "Valid amount is required" });
      }
      
      // Use Stripe customer ID if available, or create a new one later
      const customerId = req.user.stripeCustomerId;
      
      const result = await stripeClient.createPaymentIntent({
        amount,
        ...(customerId ? { customerId } : {}),
        metadata: {
          readingId: readingId?.toString() || '',
          userId: req.user.id.toString(),
          ...metadata
        }
      });
      
      res.json(result);
    } catch (error: any) {
      console.error("Error creating payment intent:", error);
      res.status(500).json({ message: error.message });
    }
  });
  
  // Update an existing payment intent (for pay-per-minute)
  app.post("/api/stripe/update-payment-intent", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const { paymentIntentId, amount, metadata = {} } = req.body;
      
      if (!paymentIntentId) {
        return res.status(400).json({ message: "Payment intent ID is required" });
      }
      
      if (!amount || isNaN(amount)) {
        return res.status(400).json({ message: "Valid amount is required" });
      }
      
      const result = await stripeClient.updatePaymentIntent(paymentIntentId, {
        amount,
        metadata: {
          ...metadata,
          updatedAt: new Date().toISOString()
        }
      });
      
      res.json(result);
    } catch (error: any) {
      console.error("Error updating payment intent:", error);
      res.status(500).json({ message: error.message });
    }
  });
  
  // Capture a payment intent (for finalized pay-per-minute sessions)
  app.post("/api/stripe/capture-payment-intent", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const { paymentIntentId } = req.body;
      
      if (!paymentIntentId) {
        return res.status(400).json({ message: "Payment intent ID is required" });
      }
      
      const result = await stripeClient.capturePaymentIntent(paymentIntentId);
      res.json(result);
    } catch (error: any) {
      console.error("Error capturing payment intent:", error);
      res.status(500).json({ message: error.message });
    }
  });
  
  // Create an on-demand reading session
  app.post("/api/readings/on-demand", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const { readerId, type } = req.body;
      
      if (!readerId || !type || !["chat", "video", "voice"].includes(type)) {
        return res.status(400).json({ message: "Invalid parameters" });
      }
      
      // Get the reader
      const reader = await storage.getUser(readerId);
      if (!reader || reader.role !== "reader") {
        return res.status(404).json({ message: "Reader not found" });
      }
      
      // Check if reader is online
      if (!reader.isOnline) {
        return res.status(400).json({ message: "Reader is not online" });
      }
      
      // Check if client has sufficient balance (minimum $5 or 500 cents)
      const client = await storage.getUser(req.user.id);
      const minimumBalance = 500; // $5 in cents
      if (!client || (client.accountBalance || 0) < minimumBalance) {
        return res.status(400).json({ 
          message: "Insufficient account balance. Minimum of $5 is required to start a reading.",
          balance: client ? client.accountBalance || 0 : 0,
          minimumRequired: minimumBalance
        });
      }
      
      // Determine the appropriate price based on reading type
      let pricePerMinute = 100; // Default $1/min
      
      if (type === 'chat') {
        pricePerMinute = reader.pricingChat || reader.pricing || 100;
      } else if (type === 'voice') {
        pricePerMinute = reader.pricingVoice || reader.pricing || 200;
      } else if (type === 'video') {
        pricePerMinute = reader.pricingVideo || reader.pricing || 300;
      }
      
      // Create a new reading record
      const reading = await storage.createReading({
        readerId,
        clientId: req.user.id,
        status: "waiting_payment",
        type,
        readingMode: "on_demand",
        pricePerMinute: pricePerMinute,
        duration: 0, // Start with 0 and track actual duration during the session
        price: 0, // Database requires this field (legacy)
        totalPrice: 0, // Will be calculated based on duration after the reading is completed
        notes: null
      });
      
      // Create payment link using Stripe
      const paymentResult = await stripeClient.createOnDemandReadingPayment(
        pricePerMinute, // in cents
        req.user.id,
        req.user.fullName,
        readerId,
        reading.id,
        type
      );
      
      if (!paymentResult.success) {
        // If payment creation fails, update the reading status to cancelled
        await storage.updateReading(reading.id, { status: "cancelled" });
        return res.status(500).json({ message: "Failed to create payment" });
      }
      
      // Update reading with payment link
      const updatedReading = await storage.updateReading(reading.id, {
        paymentLinkUrl: paymentResult.paymentLinkUrl
      });
      
      // Notify the reader
      (global as any).websocket.notifyUser(readerId, {
        type: 'new_reading_request',
        reading: updatedReading,
        client: {
          id: req.user.id,
          fullName: req.user.fullName,
          username: req.user.username
        },
        timestamp: Date.now()
      });
      
      res.json({
        success: true,
        reading: updatedReading,
        paymentLink: paymentResult.paymentLinkUrl
      });
    } catch (error) {
      console.error('Error creating on-demand reading:', error);
      res.status(500).json({ message: "Failed to create on-demand reading" });
    }
  });
  
  // Schedule a reading (fixed price one-time payment)
  app.post("/api/readings/schedule", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const { readerId, type, duration, scheduledFor, notes, price } = req.body;
      
      if (!readerId || !type || !["chat", "video", "voice"].includes(type)) {
        return res.status(400).json({ message: "Invalid parameters" });
      }
      
      // Validate required fields
      if (!duration || isNaN(duration) || duration <= 0) {
        return res.status(400).json({ message: "Valid duration is required" });
      }
      
      if (!scheduledFor) {
        return res.status(400).json({ message: "Scheduled date and time is required" });
      }
      
      if (!price || isNaN(price) || price <= 0) {
        return res.status(400).json({ message: "Valid price is required" });
      }
      
      // Get the reader
      const reader = await storage.getUser(readerId);
      if (!reader || reader.role !== "reader") {
        return res.status(404).json({ message: "Reader not found" });
      }
      
      // Validate scheduled date (must be in the future)
      const scheduledDate = new Date(scheduledFor);
      if (isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
        return res.status(400).json({ message: "Scheduled date must be in the future" });
      }
      
      const clientId = req.user.id;
      
      // Create a Stripe payment intent for the full amount
      try {
        const stripeCustomerId = req.user.stripeCustomerId;
        let customerId = stripeCustomerId;
        
        // Create a new Stripe customer if the user doesn't have one
        if (!customerId) {
          const customer = await stripeClient.customers.create({
            email: req.user.email,
            name: req.user.fullName || req.user.username,
          });
          customerId = customer.id;
          
          // Update user with Stripe customer ID
          await storage.updateUser(clientId, {
            stripeCustomerId: customerId
          });
        }
        
        // Create a payment intent for the full reading cost
        const paymentIntent = await stripeClient.paymentIntents.create({
          amount: price,
          currency: 'usd',
          customer: customerId,
          payment_method_types: ['card'],
          metadata: {
            readingType: 'scheduled',
            clientId: clientId.toString(),
            readerId: readerId.toString(),
            type,
            duration: duration.toString(),
            scheduledFor: scheduledDate.toISOString(),
          },
        });
        
        // Create the reading in "waiting_payment" status
        const reading = await storage.createReading({
          readerId,
          clientId,
          type,
          status: "waiting_payment",
          price: price / duration, // Store the per-minute rate
          duration,
          totalPrice: price,
          scheduledFor: scheduledDate,
          notes: notes || null,
          readingMode: "scheduled",
          stripePaymentIntentId: paymentIntent.id
        });
        
        // Notify the reader
        (global as any).websocket.notifyUser(readerId, {
          type: 'new_scheduled_reading',
          reading,
          client: {
            id: req.user.id,
            fullName: req.user.fullName,
            username: req.user.username
          },
          timestamp: Date.now()
        });
        
        // Return the client secret for the payment intent
        return res.status(201).json({ 
          reading,
          clientSecret: paymentIntent.client_secret,
          paymentLink: `/checkout?clientSecret=${paymentIntent.client_secret}&readingId=${reading.id}`
        });
        
      } catch (stripeError) {
        console.error("Stripe error creating payment intent:", stripeError);
        return res.status(400).json({ 
          message: "Payment processing error",
          error: stripeError.message 
        });
      }
      
    } catch (error) {
      console.error("Error scheduling reading:", error);
      return res.status(500).json({ message: "Failed to schedule reading" });
    }
  });
  
  // Start an on-demand reading session (after payment)
  app.post("/api/readings/:id/start", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid reading ID" });
      }
      
      const reading = await storage.getReading(id);
      if (!reading) {
        return res.status(404).json({ message: "Reading not found" });
      }
      
      // Check if user is authorized (client or reader of this reading)
      if (req.user.id !== reading.clientId && req.user.id !== reading.readerId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      // Check if reading is in the right status
      if (reading.status !== "waiting_payment" && reading.status !== "payment_completed") {
        return res.status(400).json({ 
          message: "Reading can't be started. Current status: " + reading.status 
        });
      }
      
      // Update reading status and start time
      const updatedReading = await storage.updateReading(id, {
        status: "in_progress",
        startedAt: new Date()
      });
      
      // Notify both participants
      (global as any).websocket.notifyUser(reading.clientId, {
        type: 'reading_started',
        reading: updatedReading,
        timestamp: Date.now()
      });
      
      (global as any).websocket.notifyUser(reading.readerId, {
        type: 'reading_started',
        reading: updatedReading,
        timestamp: Date.now()
      });
      
      res.json(updatedReading);
    } catch (error) {
      res.status(500).json({ message: "Failed to start reading" });
    }
  });
  
  // Complete an on-demand reading session and process payment from account balance
  app.post("/api/readings/:id/end", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid reading ID" });
      }
      
      const reading = await storage.getReading(id);
      if (!reading) {
        return res.status(404).json({ message: "Reading not found" });
      }
      
      // Check if user is authorized (client or reader of this reading)
      if (req.user.id !== reading.clientId && req.user.id !== reading.readerId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      // Check if reading is in progress
      if (reading.status !== "in_progress") {
        return res.status(400).json({ message: "Reading is not in progress" });
      }
      
      const { duration, totalPrice } = req.body;
      
      if (!duration || duration <= 0) {
        return res.status(400).json({ message: "Invalid duration" });
      }
      
      if (!totalPrice || totalPrice <= 0) {
        return res.status(400).json({ message: "Invalid total price" });
      }
      
      // Calculate and verify the price based on duration and pricePerMinute
      const calculatedPrice = reading.pricePerMinute * duration;
      if (Math.abs(calculatedPrice - totalPrice) > (reading.pricePerMinute / 2)) {
        console.warn(`Price discrepancy detected: calculated ${calculatedPrice} vs. received ${totalPrice}`);
      }
      
      // Process payment from client's account balance
      const client = await storage.getUser(reading.clientId);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      // Check if client has sufficient balance
      const currentBalance = client.accountBalance || 0;
      if (currentBalance < totalPrice) {
        return res.status(400).json({ 
          message: "Insufficient account balance. Please add funds to continue.",
          balance: currentBalance,
          required: totalPrice
        });
      }
      
      // Deduct from client's balance
      const updatedClient = await storage.updateUser(client.id, {
        accountBalance: currentBalance - totalPrice
      });
      
      // Add to reader's balance (if not already admin)
      const reader = await storage.getUser(reading.readerId);
      if (reader && reader.role === "reader") {
        // Readers get 80% of the payment, platform takes 20%
        const readerShare = Math.floor(totalPrice * 0.8);
        await storage.updateUser(reader.id, {
          accountBalance: (reader.accountBalance || 0) + readerShare
        });
      }
      
      // Update reading with completion details
      const now = new Date();
      const updatedReading = await storage.updateReading(id, {
        status: "completed",
        completedAt: now,
        duration,
        totalPrice,
        paymentStatus: "paid",
        paymentId: `internal-${Date.now()}`
      });
      
      // Notify both participants
      (global as any).websocket.notifyUser(reading.clientId, {
        type: 'reading_completed',
        reading: updatedReading,
        timestamp: Date.now(),
        totalAmount: totalPrice,
        durationMinutes: duration
      });
      
      (global as any).websocket.notifyUser(reading.readerId, {
        type: 'reading_completed',
        reading: updatedReading,
        timestamp: Date.now(),
        totalAmount: totalPrice,
        durationMinutes: duration
      });
      
      res.json({
        success: true,
        reading: updatedReading
      });
    } catch (error) {
      console.error('Error completing reading:', error);
      res.status(500).json({ message: "Failed to complete reading" });
    }
  });
  
  // Rate a completed reading
  app.post("/api/readings/:id/rate", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid reading ID" });
      }
      
      const reading = await storage.getReading(id);
      if (!reading) {
        return res.status(404).json({ message: "Reading not found" });
      }
      
      // Only the client can rate a reading
      if (req.user.id !== reading.clientId) {
        return res.status(403).json({ message: "Only the client can rate a reading" });
      }
      
      // Check if reading is completed
      if (reading.status !== "completed") {
        return res.status(400).json({ message: "Reading must be completed before rating" });
      }
      
      const { rating, review } = req.body;
      
      if (rating === undefined || rating < 1 || rating > 5) {
        return res.status(400).json({ message: "Rating must be between 1 and 5" });
      }
      
      // Update reading with rating and review
      const updatedReading = await storage.updateReading(id, { rating, review });
      
      // Update reader's review count
      const reader = await storage.getUser(reading.readerId);
      if (reader) {
        await storage.updateUser(reading.readerId, { 
          reviewCount: (reader.reviewCount || 0) + 1 
        });
      }
      
      // Notify reader about the new review
      (global as any).websocket.notifyUser(reading.readerId, {
        type: 'new_review',
        reading: updatedReading,
        rating,
        review,
        timestamp: Date.now()
      });
      
      res.json(updatedReading);
    } catch (error) {
      res.status(500).json({ message: "Failed to rate reading" });
    }
  });
  
  // Account Balance Management
  app.get('/api/user/balance', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ 
        balance: user.accountBalance || 0,
        formatted: `$${((user.accountBalance || 0) / 100).toFixed(2)}`
      });
    } catch (error: any) {
      console.error("Error fetching user balance:", error);
      res.status(500).json({ message: error.message });
    }
  });
  
  // Get user's reading history
  app.get('/api/users/:id/readings', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    // Users can only access their own readings
    if (req.user.id !== parseInt(req.params.id) && req.user.role !== 'admin') {
      return res.status(403).json({ message: "Not authorized" });
    }
    
    try {
      let readings;
      
      if (req.user.role === 'client') {
        readings = await storage.getReadingsByClient(req.user.id);
      } else if (req.user.role === 'reader') {
        readings = await storage.getReadingsByReader(req.user.id);
      } else {
        // Admin can view all completed readings
        const allReadings = await storage.getReadings();
        readings = allReadings.filter((r: Reading) => r.status === 'completed');
      }
      
      // Add reader names to the readings
      const readingsWithNames = await Promise.all(readings.map(async (reading: Reading) => {
        const reader = await storage.getUser(reading.readerId);
        return {
          ...reading,
          readerName: reader ? reader.fullName : 'Unknown Reader'
        };
      }));
      
      res.json(readingsWithNames.filter((r: Reading & { readerName: string }) => r.status === 'completed'));
    } catch (error: any) {
      console.error("Error fetching readings:", error);
      res.status(500).json({ message: error.message });
    }
  });
  
  // Get user's upcoming readings
  app.get('/api/users/:id/readings/upcoming', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    // Users can only access their own upcoming readings
    if (req.user.id !== parseInt(req.params.id) && req.user.role !== 'admin') {
      return res.status(403).json({ message: "Not authorized" });
    }
    
    try {
      let readings;
      
      if (req.user.role === 'client') {
        readings = await storage.getReadingsByClient(req.user.id);
      } else if (req.user.role === 'reader') {
        readings = await storage.getReadingsByReader(req.user.id);
      } else {
        // Admin can view all scheduled readings
        const allReadings = await storage.getReadings();
        readings = allReadings.filter(r => 
          r.status === 'scheduled' || 
          r.status === 'waiting_payment' || 
          r.status === 'payment_completed' ||
          r.status === 'in_progress'
        );
      }
      
      // Add reader names to the readings
      const readingsWithNames = await Promise.all(readings.map(async (reading) => {
        const reader = await storage.getUser(reading.readerId);
        return {
          ...reading,
          readerName: reader ? reader.fullName : 'Unknown Reader'
        };
      }));
      
      // Filter for upcoming readings
      const upcomingReadings = readingsWithNames.filter(r => 
        r.status === 'scheduled' || 
        r.status === 'waiting_payment' || 
        r.status === 'payment_completed' ||
        r.status === 'in_progress'
      );
      
      res.json(upcomingReadings);
    } catch (error: any) {
      console.error("Error fetching upcoming readings:", error);
      res.status(500).json({ message: error.message });
    }
  });
  
  // Add funds to account balance 
  app.post('/api/user/add-funds', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const { amount } = req.body;
    
    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ message: "Valid amount is required" });
    }
    
    try {
      // Create a Stripe payment intent to add funds
      const result = await stripeClient.createPaymentIntent({
        amount,
        metadata: {
          userId: req.user.id.toString(),
          purpose: 'account_funding'
        }
      });
      
      res.json(result);
    } catch (error: any) {
      console.error("Error creating payment intent for adding funds:", error);
      res.status(500).json({ message: error.message });
    }
  });
  
  // Create a payment intent for checkout (store purchases)
  app.post('/api/create-payment-intent', async (req, res) => {
    try {
      const { amount } = req.body;
      
      if (!amount || isNaN(amount)) {
        return res.status(400).json({ message: "Valid amount is required" });
      }
      
      // If user is logged in, associate the payment with them
      const metadata: Record<string, string> = {
        purpose: 'store_purchase'
      };
      
      if (req.isAuthenticated()) {
        metadata.userId = req.user.id.toString();
      }
      
      const result = await stripeClient.createPaymentIntent({
        amount,
        metadata
      });
      
      res.json(result);
    } catch (error: any) {
      console.error("Error creating payment intent for store purchase:", error);
      res.status(500).json({ message: error.message });
    }
  });
  
  // Get user balance
  app.get('/api/user/balance', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const user = await storage.getUser(req.user.id);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const balance = user.accountBalance || 0;
      
      res.json({
        balance,
        formatted: `$${(balance / 100).toFixed(2)}`
      });
    } catch (error: any) {
      console.error("Error fetching user balance:", error);
      res.status(500).json({ message: error.message });
    }
  });
  
  // Confirm added funds (after payment is completed)
  app.post('/api/user/confirm-funds', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const { paymentIntentId } = req.body;
    
    if (!paymentIntentId) {
      return res.status(400).json({ message: "Payment intent ID is required" });
    }
    
    try {
      // Check if payment intent exists and is valid
      const paymentIntent = await stripeClient.retrievePaymentIntent(paymentIntentId);
      
      if (paymentIntent.status !== "succeeded") {
        return res.status(400).json({ message: "Payment not completed" });
      }
      
      if (paymentIntent.metadata.userId !== req.user.id.toString()) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      // Add funds to user's account balance
      const amountToAdd = paymentIntent.amount;
      const user = await storage.getUser(req.user.id);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const currentBalance = user.accountBalance || 0;
      const updatedUser = await storage.updateUser(user.id, {
        accountBalance: currentBalance + amountToAdd
      });
      
      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to update account balance" });
      }
      
      res.json({ 
        success: true, 
        newBalance: updatedUser.accountBalance || 0,
        formatted: `$${((updatedUser.accountBalance || 0) / 100).toFixed(2)}` 
      });
    } catch (error: any) {
      console.error("Error confirming added funds:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Admin API routes
  
  // Get all readings (admin only)
  app.get("/api/admin/readings", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized. Admin access required." });
    }
    
    try {
      const readings = await storage.getReadings();
      const readingsWithNames = await Promise.all(readings.map(async (reading) => {
        const client = await storage.getUser(reading.clientId);
        const reader = reading.readerId ? await storage.getUser(reading.readerId) : null;
        
        return {
          ...reading,
          clientName: client ? client.username : "Unknown",
          readerName: reader ? reader.username : "Unassigned"
        };
      }));
      
      return res.json(readingsWithNames);
    } catch (error) {
      console.error("Error fetching all readings:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Get all readers (admin only)
  app.get("/api/admin/readers", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized. Admin access required." });
    }
    
    try {
      const readers = await storage.getReaders();
      return res.json(readers);
    } catch (error) {
      console.error("Error fetching all readers:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Get all users (admin only)
  app.get("/api/admin/users", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized. Admin access required." });
    }
    
    try {
      // We need to get all users - adapted storage method might be needed
      const users = await storage.getAllUsers();
      
      // Return without password information
      const sanitizedUsers = users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      
      return res.json(sanitizedUsers);
    } catch (error) {
      console.error("Error fetching all users:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // TRTC API Endpoint - Get credentials needed for TRTC connection
  app.post("/api/trtc/params", async (req, res) => {
    try {
      const { userId, roomId } = req.body;
      
      if (!userId || !roomId) {
        return res.status(400).json({ message: "userId and roomId are required" });
      }
      
      const roomParams = trtcClient.generateRoomParams(userId, roomId);
      
      res.json(roomParams);
    } catch (error) {
      console.error("Failed to generate TRTC parameters:", error);
      res.status(500).json({ message: "Failed to generate TRTC parameters" });
    }
  });

  return httpServer;
}
