install:
    pnpm install

check: format lint typecheck test build

clean: core-clean jetbrains-clean
    pnpm clean

lint:
    pnpm lint
    cd packages/animoria-jetbrains && ./gradlew detekt ktlintCheck

format:
    pnpm format
    cd packages/animoria-jetbrains && ./gradlew ktlintFormat

typecheck:
    pnpm -r --filter=!@animoria/core typecheck

test: core-test vscode-test sandbox-test jetbrains-test

test-all: test

core-build:
    cargo build --release --manifest-path packages/animoria-core-rust/Cargo.toml
    pnpm --filter @animoria/contracts build

core-test:
    cargo test --manifest-path packages/animoria-core-rust/Cargo.toml

core-clean:
    cargo clean --manifest-path packages/animoria-core-rust/Cargo.toml

vscode-build: core-build ui-build
    pnpm --filter animoria-vscode build

vscode-test:
    pnpm --filter animoria-vscode test

vscode-typecheck:
    pnpm --filter animoria-vscode typecheck

ui-build:
    pnpm --filter @animoria/ui build

ui-test:
    pnpm --filter @animoria/ui test

dev: sandbox-dev

sandbox-dev:
    pnpm --filter animoria-sandbox dev

sandbox-build: ui-build
    pnpm --filter animoria-sandbox build

sandbox-test:
    pnpm --filter animoria-sandbox test

jetbrains-build: core-build ui-build
    node scripts/copy-sea-into-jetbrains.mjs
    cd packages/animoria-jetbrains && ./gradlew buildPlugin -x buildSearchableOptions

jetbrains-run: core-build ui-build
    node scripts/copy-sea-into-jetbrains.mjs
    cd packages/animoria-jetbrains && ./gradlew runIde

jetbrains-test:
    cd packages/animoria-jetbrains && ./gradlew test

jetbrains-lint:
    cd packages/animoria-jetbrains && ./gradlew detekt ktlintCheck

jetbrains-format:
    cd packages/animoria-jetbrains && ./gradlew ktlintFormat

jetbrains-clean:
    cd packages/animoria-jetbrains && ./gradlew clean

build: core-build ui-build vscode-build sandbox-build jetbrains-build
