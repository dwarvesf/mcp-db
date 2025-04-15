import { AuthProvider, AuthResult } from "mcp-framework";
import { IncomingMessage } from "node:http";
import { getConfig } from "../config.js";

class CustomAuthProvider implements AuthProvider {
    async authenticate(req: IncomingMessage): Promise<boolean | AuthResult> {
        // Check for Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return false;
        }

        // Basic authentication check - you can extend this with your custom logic
        if (authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            console.log("token", token);
            console.log("jwtKey", getConfig().jwtKey);
            if (token === getConfig().jwtKey) {
                return {
                    data: {
                        token,
                        // Add any additional user data here
                    }
                };
            }
        }

        return false;
    }

    getAuthError(): { status: number; message: string } {
        return {
            status: 401,
            message: "Invalid or missing authentication token"
        };
    }
}

export default CustomAuthProvider;