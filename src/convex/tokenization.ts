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
      x: v.number(),
      y: v.number(),
      z: v.number(),
      gripper: v.number(),
    }),
    tokens: v.array(v.number()),
    bins: v.object({
      x: v.number(),
      y: v.number(),
      z: v.number(),
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
    x: v.number(),
    y: v.number(),
    z: v.number(),
    gripper: v.number(),
  },
  handler: async (ctx, args) => {
    // Define bin ranges (256 bins for each dimension)
    const numBins = 256;
    
    // Normalize values to [0, 1] range and convert to bins
    const xBin = Math.floor(((args.x + 1) / 2) * (numBins - 1));
    const yBin = Math.floor(((args.y + 1) / 2) * (numBins - 1));
    const zBin = Math.floor(((args.z + 1) / 2) * (numBins - 1));
    const gripperBin = Math.floor(args.gripper * (numBins - 1));
    
    // Create tokens (offset by vocabulary size for each dimension)
    const vocabOffset = 32000; // Assuming base vocabulary size
    const tokens = [
      vocabOffset + xBin,
      vocabOffset + numBins + yBin,
      vocabOffset + 2 * numBins + zBin,
      vocabOffset + 3 * numBins + gripperBin,
    ];
    
    return {
      bins: { x: xBin, y: yBin, z: zBin, gripper: gripperBin },
      tokens,
    };
  },
});

// Detokenize (convert tokens back to continuous values)
export const detokenize = mutation({
  args: {
    tokens: v.array(v.number()),
  },
  handler: async (ctx, args) => {
    const numBins = 256;
    const vocabOffset = 32000;
    
    // Extract bins from tokens
    const xBin = args.tokens[0] - vocabOffset;
    const yBin = args.tokens[1] - vocabOffset - numBins;
    const zBin = args.tokens[2] - vocabOffset - 2 * numBins;
    const gripperBin = args.tokens[3] - vocabOffset - 3 * numBins;
    
    // Convert bins back to continuous values
    const x = (xBin / (numBins - 1)) * 2 - 1;
    const y = (yBin / (numBins - 1)) * 2 - 1;
    const z = (zBin / (numBins - 1)) * 2 - 1;
    const gripper = gripperBin / (numBins - 1);
    
    return {
      action: { x, y, z, gripper },
      bins: { x: xBin, y: yBin, z: zBin, gripper: gripperBin },
    };
  },
});
