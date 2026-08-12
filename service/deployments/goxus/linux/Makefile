#======================================================
# goxus frontend
#======================================================
SHELL := /bin/bash
APP_NAME=goxus-front
APP_LOG_NAME=goxus-front

PROJECT_ROOT_PATH=../../../..
INSTALL_PATH=/usr/local/bin

START_SCRIPT=goxus-front-start
START_SCRIPT_SRC=$(shell pwd)/$(START_SCRIPT)
START_SCRIPT_INSTALL=$(INSTALL_PATH)/$(START_SCRIPT)

SERVICE_NAME=goxus-front
SERVICE_PATH=/etc/systemd/system

SERVER_ROLE=production

#=========================================================================
#
#=========================================================================
.PHONY: help build-app install-app uninstall-app install-service uninstall-service \
        service-stop service-start service-status service-restart upgrade all

help: Makefile
	@echo "Choose build option for $(APP_NAME):"
	@sed -n 's/^##//p' $< | column -s ':' |  sed -e 's/^/ /'

## all: Build and install application + service
all: uninstall-app build-app install-app

## build-app: Build Next.js production bundle
build-app:
	export NVM_DIR="$$HOME/.nvm" && \
	[ -s "$$NVM_DIR/nvm.sh" ] && . "$$NVM_DIR/nvm.sh" && \
	cd $(PROJECT_ROOT_PATH)/ && nvm use && NEXT_PUBLIC_API_URL=http://api.goxus.ivan npm run build

## install-app: Install start script + create log directory
install-app:
	@chmod +x $(START_SCRIPT_SRC)
	@sudo mkdir -p /var/log/$(APP_LOG_NAME) && \
	sudo chmod 777 /var/log/$(APP_LOG_NAME) && \
	sudo ln -sf $(START_SCRIPT_SRC) $(START_SCRIPT_INSTALL)

## uninstall-app: Remove start script symlink
uninstall-app:
	sudo rm -f $(START_SCRIPT_INSTALL)

## install-service: Install and enable systemd service
install-service:
	sudo systemctl enable $(shell pwd)/$(PROJECT_ROOT_PATH)/configs/$(SERVER_ROLE)/$(SERVICE_NAME).service && \
	sudo systemctl daemon-reload

## uninstall-service: Disable and remove systemd service
uninstall-service:
	sudo systemctl disable $(SERVICE_NAME) 2>/dev/null; true
	sudo systemctl daemon-reload

## service-stop: Stop frontend
service-stop:
	sudo systemctl stop $(SERVICE_NAME)

## service-start: Start frontend
service-start:
	sudo systemctl start $(SERVICE_NAME)

## service-status: Get frontend status
service-status:
	sudo systemctl status $(SERVICE_NAME) --no-pager

## service-restart: Restart frontend
service-restart:
	sudo systemctl restart $(SERVICE_NAME)

## upgrade: stop -> build -> start -> status
upgrade: service-stop build-app install-app service-start service-status