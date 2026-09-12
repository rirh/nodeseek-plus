.PHONY: dev build test
dev:
	@$(PKG_BIN) run dev
build:
	@$(PKG_BIN) run build
test:
	@$(PKG_BIN) run test
