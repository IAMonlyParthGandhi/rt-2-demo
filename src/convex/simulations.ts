import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

// Query to get all simulation sessions
export const list = query({
  args: {},
  handler: async (ctx) => {
    const sessions = await ctx.db.query("simulations").order("desc").take(50);
    return sessions;
  },
});

// Query to get a specific simulation session
export const get = query({
  args: { id: v.id("simulations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Create a new simulation session
export const create = mutation({
  args: {
    command: v.string(),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    
    const sessionId = await ctx.db.insert("simulations", {
      command: args.command,
      status: args.status,
      userId: user?._id,
      timestamp: Date.now(),
    });
    
    return sessionId;
  },
});

// Update simulation session status
export const updateStatus = mutation({
  args: {
    id: v.id("simulations"),
    status: v.string(),
    result: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: args.status,
      result: args.result,
    });
  },
});
