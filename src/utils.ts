// Helper function to safely serialize BigInt values
export function serializeBigInt(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'bigint') {
    return obj.toString();
  }
  
  if (Array.isArray(obj)) {
    return obj.map(serializeBigInt);
  }
  
  if (typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [key, serializeBigInt(value)])
    );
  }
  
  return obj;
}

export function formatErrorResponse(error: unknown): { contents: any[], tools: any[] } {
  return {
    contents: [{ 
      type: "text", 
      text: `Error: ${error instanceof Error ? error.message : String(error)}` 
    }],
    tools: []
  };
}

export function formatSuccessResponse(data: any): { contents: any[], tools: any[] } {
  return {
    contents: [{ 
      type: "text", 
      text: JSON.stringify(serializeBigInt(data), null, 2)
    }],
    tools: []
  };
} 