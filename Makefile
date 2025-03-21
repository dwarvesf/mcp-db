# Makefile

# Variables
BUILD_DIR = build
NODE_ENV = development

# Targets
down:
	docker compose down

init: down
	docker compose up -d

## Install dependencies
install:
	npm install

## Build the project
build:
	npm run build

## Run the server in development mode
dev: build
	NODE_ENV=$(NODE_ENV) npm run dev

## debug the server in development mode
debug: build
	NODE_ENV=$(NODE_ENV) npx @modelcontextprotocol/inspector make dev

## Clean the build directory
clean:
	rm -rf $(BUILD_DIR)

.PHONY: install build dev clean
