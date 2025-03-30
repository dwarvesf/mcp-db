.PHONY: migrate-up migrate-down setup-continuous-aggregates setup-db

migrate-up:
	npm run migrate:up

migrate-down:
	npm run migrate:down

setup-continuous-aggregates:
	docker exec -i mcp-db-timescaledb-1 psql -U postgres -d postgres -f - < scripts/setup-continuous-aggregates.sql

setup-db: migrate-up setup-continuous-aggregates

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
dev: migrate-up build
	NODE_ENV=development npm run dev -- --transport=sse --port=3001

## debug the server in development mode
debug:
	NODE_ENV=development npm run debug

## Clean the build directory
clean:
	rm -rf dist
