/**
 * Logger utility for formatting console output
 */
export declare function formatLogMessage(message: string, isError?: boolean): string;
export declare function truncateText(text: string, maxLength?: number): string;
export declare function formatJsonForLog(data: any): string;
export declare function log(message: string, isError?: boolean): void;
export declare function logJson(label: string, data: any): void;
