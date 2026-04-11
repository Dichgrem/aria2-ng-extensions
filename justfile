set shell := ["bash", "-c"]

default:
	@just --list

install:
	bun install

dev:
	bun run dev

dev-firefox:
  bun run dev:firefox

build:
	bun run build

build-firefox:
  bun run build:firefox

zip:
	bun run zip

zip-firefox:
  bun run zip:firefox

download-ariang:
	bun run download:ariang

lint:
	biome check entrypoints/ wxt.config.ts

lint-fix:
	biome check --write --unsafe entrypoints/ wxt.config.ts

fmt:
	biome format --write entrypoints/
