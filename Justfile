install:
    pnpm install

check: format lint typecheck test build

clean: core-clean jetbrains-clean
    pnpm clean

audit: 
    pnpm audit
    cd packages/animoria-core-rust && cargo audit

lint: core-lint
    pnpm lint
    cd packages/animoria-jetbrains && ./gradlew detekt ktlintCheck

format: core-format
    pnpm format
    cd packages/animoria-jetbrains && ./gradlew ktlintFormat

typecheck:
    cargo check --manifest-path packages/animoria-core-rust/Cargo.toml
    pnpm -r typecheck

test: core-test vscode-test sandbox-test jetbrains-test

test-all: test

core-build:
    cargo build --release --manifest-path packages/animoria-core-rust/Cargo.toml
    pnpm --filter @animoria/contracts build

core-test:
    cargo test --manifest-path packages/animoria-core-rust/Cargo.toml

core-lint:
    cargo clippy --manifest-path packages/animoria-core-rust/Cargo.toml --all-targets -- -D warnings

core-format:
    cargo fmt --manifest-path packages/animoria-core-rust/Cargo.toml

core-clean:
    cargo clean --manifest-path packages/animoria-core-rust/Cargo.toml

vscode-build: core-build ui-build
    pnpm --filter animoria-vscode build

vscode-run: core-build ui-build
    node scripts/copy-native-daemon.mjs
    cd packages/animoria-vscode && pnpm run dev

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
    node scripts/copy-native-daemon.mjs
    cd packages/animoria-jetbrains && ./gradlew buildPlugin -x buildSearchableOptions

jetbrains-run: core-build ui-build
    node scripts/copy-native-daemon.mjs
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
