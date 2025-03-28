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
dev:
	npm run build
	NODE_ENV=development npm run dev -- --transport=sse --port=3001

## debug the server in development mode
debug:
	NODE_ENV=development npm run debug

## Clean the build directory
clean:
	rm -rf dist

.PHONY: install build dev debug clean

.DEFAULT_GOAL := dev
