# Use Claude Desktop to connect

There are two ways for Claude Desktop to connect to the mcp server:

1. Using ngrok and supergateway
2. Using mcp-proxy

## 1. Using ngrok and supergateway

### Prerequisites

- ngrok
- docker

### Setup

1. Start the mcp server:

   ```bash
   make dev ## this will start the mcp server on port 3001
   ```

2. Start ngrok:

   ```bash
   ngrok http 3001
   ```

3. Config `claude_desktop_config.json`:

   ```json
    {
        "mcpServers": {
            "knowledge-hub-local": {
                "command": "docker",
                "args": [
                    "run",
                    "-i",
                    "--rm",
                    "supercorp/supergateway",
                    "--sse",
                    "https://<your-ngrok-url>/sse",
                ]
            }
        }
    }
    ```

4. Start Claude Desktop and use tools that the mcp server provides.

## 2. Using mcp-proxy

### Prerequisites

- python
- [mcp-proxy](https://github.com/sparfenyuk/mcp-proxy)

### Setup

1. Start the mcp server:

   ```bash
   make dev ## this will start the mcp server on port 3001
   ```

2. Config `claude_desktop_config.json`:

   ```json
    {
        "mcpServers": {
            "knowledge-hub-local": {
                "command": "mcp-proxy",
                "args": [
                    "http://localhost:3001/sse",
                ]
            }
        }
    }
    ```

3. Start Claude Desktop from shell:

   ```bash
    /Applications/Claude.app/Contents/MacOS/Claude
    ```

4. Start Claude Desktop and use tools that the mcp server provides.
