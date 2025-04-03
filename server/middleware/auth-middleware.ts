import { Request, Response, NextFunction } from "express";

export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized" });
}

export function isAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated() && req.user.role === "admin") {
    return next();
  }
  return res.status(403).json({ message: "Forbidden - Admin access required" });
}

export function isReader(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated() && req.user.role === "reader") {
    return next();
  }
  return res.status(403).json({ message: "Forbidden - Reader access required" });
}