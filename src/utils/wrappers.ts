import { FastMCPTool, FastMCPResource } from '../fast-tools/types.js';
import { formatLogMessage, formatJsonForLog, truncateText, log, logJson } from './logger.js';

/**
 * Wraps a tool with logging functionality
 * @param tool The original tool to wrap
 * @returns A wrapped tool with logging
 */
export function wrapToolWithLogging(tool: FastMCPTool): FastMCPTool {
  const originalExecute = tool.execute;
  
  return {
    ...tool,
    execute: async (args: any) => {
      log(`Executing tool: ${tool.name}`);
      logJson('Parameters', args);
      
      const startTime = performance.now();
      try {
        const result = await originalExecute(args);
        const duration = Math.round(performance.now() - startTime);
        
        log(`Tool ${tool.name} completed in ${duration}ms`);
        
        // Try to parse and pretty-print the result if it's JSON
        let formattedResult;
        try {
          const parsedResult = JSON.parse(result);
          formattedResult = formatJsonForLog(parsedResult);
        } catch {
          // If it's not valid JSON, just truncate it
          formattedResult = truncateText(result);
        }
        
        logJson('Result', formattedResult);
        
        return result;
      } catch (error) {
        const duration = Math.round(performance.now() - startTime);
        log(`Tool ${tool.name} failed after ${duration}ms`, true);
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        throw error;
      }
    }
  };
}

/**
 * Wraps a resource with logging functionality
 * @param resource The original resource to wrap
 * @returns A wrapped resource with logging
 */
export function wrapResourceWithLogging(resource: FastMCPResource): FastMCPResource {
  const originalLoad = resource.load;
  
  return {
    ...resource,
    load: async () => {
      log(`Loading resource: ${resource.name}`);
      
      const startTime = performance.now();
      try {
        const result = await originalLoad();
        const duration = Math.round(performance.now() - startTime);
        
        log(`Resource ${resource.name} loaded in ${duration}ms`);
        
        // Try to parse and pretty-print the content if it's JSON
        let formattedContent;
        try {
          const parsedContent = JSON.parse(result.text);
          formattedContent = formatJsonForLog(parsedContent);
        } catch {
          // If it's not valid JSON, just truncate it
          formattedContent = truncateText(result.text);
        }
        
        logJson('Resource content', formattedContent);
        
        return result;
      } catch (error) {
        const duration = Math.round(performance.now() - startTime);
        log(`Resource ${resource.name} failed to load after ${duration}ms`, true);
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        throw error;
      }
    }
  };
}

/**
 * Wraps all tools in an array with logging functionality
 * @param tools Array of tools to wrap
 * @returns Array of wrapped tools
 */
export function wrapToolsWithLogging(tools: FastMCPTool[]): FastMCPTool[] {
  return tools.map(wrapToolWithLogging);
}

/**
 * Wraps all resources in an array with logging functionality
 * @param resources Array of resources to wrap
 * @returns Array of wrapped resources
 */
export function wrapResourcesWithLogging(resources: FastMCPResource[]): FastMCPResource[] {
  return resources.map(wrapResourceWithLogging);
} 