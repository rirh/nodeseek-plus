.PHONY: deploy deploy-local deploy-stage
# Build and commit source changes together with the release artifacts.
SKIP_CHECKS ?= 0
deploy:
	@SKIP_CHECKS="$(SKIP_CHECKS)" node scripts/deploy.mjs

deploy-local: update-version
	@$(PKG_BIN) run typecheck
	@$(PKG_BIN) run build
	@echo '本地分发文件已生成：dist/nodeseek-plus-plus.user.js'

deploy-stage: update-version
	@$(PKG_BIN) run typecheck
	@$(PKG_BIN) run build --mode stage
	@echo '本地测试文件已生成：dist-stage/nodeseek-plus-plus.user.js'
