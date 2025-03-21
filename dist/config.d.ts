export declare function validateConfig(args: any): {
    databaseUrl: string;
    logLevel: "debug" | "info" | "error";
    gcsBucket?: string | undefined;
};
