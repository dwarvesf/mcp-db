.PHONY: migrate-up migrate-down setup-continuous-aggregates setup-db

migrate-up:
	devbox run migrate-up

migrate-down:
	devbox run migrate-down

setup-continuous-aggregates:
	devbox run setup-continuous-aggregates

setup-db:
	devbox run setup-db

down:
	docker compose down

init: down
	docker compose up -d
	sleep 2
	make setup-db

## Install dependencies
install:
	devbox run install

## Build the project
build:
	devbox run build

## Run the server in development mode
dev:
	devbox run dev

## Run the FastMCP server in development mode
dev-fast:
	devbox run dev-fast

## debug the server in development mode
debug:
	devbox run debug

## debug the FastMCP server in development mode
debug-fast:
	devbox run debug-fast

## Clean the build directory
clean:
	devbox run clean
