import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Query to get tokenization examples
export const list = query({
  args: {},
  handler: async (ctx) => {
    const examples = await ctx.db.query("tokenization").order("desc").take(20);
    return examples;
  },
});

// Create a new tokenization example
export const create = mutation({
  args: {
    action: v.object({
      terminate: v.number(),
      x: v.number(),
      y: v.number(),
      z: v.number(),
      rx: v.number(),
      ry: v.number(),
      rz: v.number(),
      gripper: v.number(),
    }),
    tokens: v.array(v.number()),
    bins: v.object({
      terminate: v.number(),
      x: v.number(),
      y: v.number(),
      z: v.number(),
      rx: v.number(),
      ry: v.number(),
      rz: v.number(),
      gripper: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const exampleId = await ctx.db.insert("tokenization", {
      action: args.action,
      tokens: args.tokens,
      bins: args.bins,
      timestamp: Date.now(),
    });
    
    return exampleId;
  },
});

// Tokenize action (convert continuous values to discrete bins)
export const tokenize = mutation({
  args: {
    terminate: v.number(),
    x: v.number(),
    y: v.number(),
    z: v.number(),
    rx: v.number(),
    ry: v.number(),
    rz: v.number(),
    gripper: v.number(),
  },
  handler: async (ctx, args) => {
    // Helper functions for discretization
    const continuousToBinTranslation = (value: number): number => {
      const clamped = Math.max(-1.0, Math.min(1.0, value));
      const bin = Math.floor((clamped + 1.0) * 127.5);
      return Math.max(0, Math.min(255, bin));
    };

    const continuousToBinRotation = (degrees: number): number => {
      const clamped = Math.max(-180, Math.min(180, degrees));
      const bin = Math.floor((clamped + 180) * (255.0 / 360.0));
      return Math.max(0, Math.min(255, bin));
    };

    const continuousToBinGripper = (value: number): number => {
      const clamped = Math.max(-1.0, Math.min(1.0, value));
      const bin = Math.floor((clamped + 1.0) * 127.5);
      return Math.max(0, Math.min(255, bin));
    };

    const terminateToBin = (flag: number): number => {
      return flag ? 1 : 0;
    };

    // Calculate bins
    const bins = {
      terminate: terminateToBin(args.terminate),
      x: continuousToBinTranslation(args.x),
      y: continuousToBinTranslation(args.y),
      z: continuousToBinTranslation(args.z),
      rx: continuousToBinRotation(args.rx),
      ry: continuousToBinRotation(args.ry),
      rz: continuousToBinRotation(args.rz),
      gripper: continuousToBinGripper(args.gripper),
    };

    // Create token array
    const tokens = [
      bins.terminate,
      bins.x,
      bins.y,
      bins.z,
      bins.rx,
      bins.ry,
      bins.rz,
      bins.gripper,
    ];

    return { bins, tokens };
  },
});

// Detokenize (convert tokens back to continuous values)
export const detokenize = mutation({
  args: {
    tokens: v.array(v.number()),
  },
  handler: async (ctx, args) => {
    // Helper functions for de-discretization
    const binToContinuousTranslation = (bin: number): number => {
      const value = (bin / 127.5) - 1.0;
      return Math.round(value * 1000) / 1000; // Round to 3 decimal places
    };

    const binToContinuousRotation = (bin: number): number => {
      const degrees = (bin * (360.0 / 255.0)) - 180;
      return Math.round(degrees * 10) / 10; // Round to 1 decimal place
    };

    const binToContinuousGripper = (bin: number): number => {
      const value = (bin / 127.5) - 1.0;
      return Math.round(value * 1000) / 1000; // Round to 3 decimal places
    };

    const binToTerminate = (bin: number): number => {
      return bin;
    };

    // Extract bins from tokens
    const bins = {
      terminate: args.tokens[0],
      x: args.tokens[1],
      y: args.tokens[2],
      z: args.tokens[3],
      rx: args.tokens[4],
      ry: args.tokens[5],
      rz: args.tokens[6],
      gripper: args.tokens[7],
    };

    // Convert bins back to continuous values
    const action = {
      terminate: binToTerminate(bins.terminate),
      x: binToContinuousTranslation(bins.x),
      y: binToContinuousTranslation(bins.y),
      z: binToContinuousTranslation(bins.z),
      rx: binToContinuousRotation(bins.rx),
      ry: binToContinuousRotation(bins.ry),
      rz: binToContinuousRotation(bins.rz),
      gripper: binToContinuousGripper(bins.gripper),
    };

    return { action, bins };
  },
});