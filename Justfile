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
    pnpm typecheck

test:
    pnpm test

build: core-build vscode-build sandbox-build jetbrains-build

core-build:
    pnpm --filter @animoria/core build

core-test:
    pnpm --filter @animoria/core test

core-clean:
    pnpm --filter @animoria/core clean

vscode-build: core-build
    pnpm --filter animoria-vscode build

vscode-test:
    pnpm --filter animoria-vscode test

vscode-typecheck:
    pnpm --filter animoria-vscode typecheck

dev: sandbox-dev

sandbox-dev:
    pnpm --filter animoria-sandbox dev

sandbox-build: core-build
    pnpm --filter animoria-sandbox build

jetbrains-build: core-build
    pnpm --filter @animoria/ui build
    pnpm --filter @animoria/core build:sea
    node scripts/copy-sea-into-jetbrains.mjs
    cd packages/animoria-jetbrains && ./gradlew buildPlugin -x buildSearchableOptions

jetbrains-run: core-build
    pnpm --filter @animoria/ui build
    pnpm --filter @animoria/core build:sea
    node scripts/copy-sea-into-jetbrains.mjs
    cd packages/animoria-jetbrains && ./gradlew runIde

jetbrains-lint:
    cd packages/animoria-jetbrains && ./gradlew detekt ktlintCheck

jetbrains-format:
    cd packages/animoria-jetbrains && ./gradlew ktlintFormat

jetbrains-clean:
    cd packages/animoria-jetbrains && ./gradlew clean
