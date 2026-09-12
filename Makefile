.DEFAULT_GOAL := help
include make/config.mk
include make/version.mk
include make/app.mk
include make/deploy.mk

.PHONY: help
help:
	@echo 'make dev            启动油猴开发服务'
	@echo 'make build          构建可安装脚本'
	@echo 'make test           运行针对性回归测试'
	@echo 'make update-version 更新上海时间版本号'
	@echo 'make deploy         检查、构建、提交版本并推送 GitHub'
	@echo 'make deploy-local   仅生成本地生产分发文件'
	@echo 'make deploy-stage   更新版本并生成测试分发文件（本地）'
