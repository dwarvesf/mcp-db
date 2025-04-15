export function serializeBigInt(obj) {
    if (obj === null || obj === undefined) {
        return obj;
    }
    if (typeof obj === 'bigint') {
        return obj.toString();
    }
    // Handle Date objects
    if (obj instanceof Date) {
        return obj.toISOString();
    }
    // Special case for date strings that aren't Date objects yet
    if (typeof obj === 'string' &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(obj)) {
        return obj;
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
                text: `${error instanceof Error ? JSON.stringify(error, Object.getOwnPropertyNames(error)) : String(error)}`
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
