// Helper function to safely serialize BigInt values
export function serializeBigInt(obj) {
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
        return Object.fromEntries(Object.entries(obj).map(([key, value]) => [key, serializeBigInt(value)]));
    }
    return obj;
}
export function formatErrorResponse(error) {
    return {
        content: [{
                type: "text",
                text: `Error: ${error instanceof Error ? error.message : String(error)}`
            }],
        isError: true
    };
}
export function formatSuccessResponse(data) {
    return {
        content: [{
                type: "text",
                text: JSON.stringify(serializeBigInt(data), null, 2)
            }]
    };
}
