import { z } from 'zod';

// Generic type for FastMCP tool definitions
export type FastMCPTool<T = any> = {
  name: string;
  description: string;
  parameters: z.ZodType<T>;
  execute: (args: T) => Promise<string>;
};

// Generic type for FastMCP resource definitions
export type FastMCPResource = {
  name: string;
  description: string;
  uri: string;
  load: () => Promise<{ uri: string; text: string }>;
}; 