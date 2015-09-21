# Makefile rules

# Disable built-in rules
.SUFFIXES:

# Project name
PROJ=chaise

# Node module dependencies
MODULES=node_modules

# Node bin scripts
BIN=$(MODULES)/.bin

# Mocha scripts
UNIT=$(BIN)/mocha

# Rule to determine MD5 utility
ifeq ($(shell which md5),)
    MD5 = md5sum
else
    MD5 = md5 -q
endif

CAT=cat

# Bower front end components
BOWER=bower_components

# CSS source
CSS=styles
CSS_DEPS=$(CSS)/vendor/bootstrap.css \
	$(CSS)/vendor/ng-grid.css \
	$(CSS)/vendor/rzslider.css \
	$(CSS)/vendor/angular-datepicker.css
CSS_SOURCE=$(CSS)/swoop-sidebar.css \
	$(CSS)/jquery.nouislider.min.css \
	$(CSS)/material-design/css/material-design-iconic-font.min.css \
	$(CSS)/ermrest.css \
	$(CSS)/app.css \
	$(CSS)/appheader.css

# JavaScript source and test specs
JS=scripts
JS_DEPS=$(JS)/vendor/jquery-latest.min.js \
	$(JS)/vendor/jquery-ui-tooltip.min.js \
	$(JS)/vendor/jquery.nouislider.all.min.js \
	$(JS)/vendor/bootstrap.min.js \
	$(JS)/vendor/jquery.cookie.js \
	$(JS)/vendor/angular.js \
	$(JS)/vendor/angular-sanitize.js \
	$(JS)/vendor/rzslider.js \
	$(JS)/vendor/angular-datepicker.js \
	$(JS)/vendor/ng-grid.js
JS_SOURCE=$(JS)/respond.js \
	$(JS)/variables.js \
	$(JS)/utils.js \
	$(JS)/ermrest.js \
	chaise-config.js \
	$(JS)/app.js \
	$(JS)/facetsModel.js \
	$(JS)/facetsService.js \
	$(JS)/controller/ermrestDetailController.js \
	$(JS)/controller/ermrestFilterController.js \
	$(JS)/controller/ermrestInitController.js \
	$(JS)/controller/ermrestLoginController.js \
	$(JS)/controller/ermrestLogoutController.js \
	$(JS)/controller/ermrestResultsController.js \
	$(JS)/controller/ermrestSideBarController.js

TEMPLATES=views
TEMPLATES_DEPS=$(TEMPLATES)/erminit.html \
	$(TEMPLATES)/ermdetail.html \
	$(TEMPLATES)/ermsidebar.html \
	$(TEMPLATES)/ermretrievefilters.html \
	$(TEMPLATES)/ermretrieveresults.html



# Distribution target
DIST=dist

# Project package full/minified
PKG=$(DIST)/$(PROJ).js
MIN=$(DIST)/$(PROJ).min.js

# Documentation target
DOC=doc
API=$(DOC)/api.md
JSDOC=jsdoc

# Hidden target files (for make only)
LINT=.make-lint

.PHONY: all
all: lint build test $(DOC)

.PHONY: build
build: $(PKG) $(MIN) app.html login.html

# Rule to build the full library
$(PKG): $(JS_SOURCE) $(BIN)
	mkdir -p $(DIST)
	cat $(JS_SOURCE) > $(PKG)

# Rule to build the minified package
$(MIN): $(JS_SOURCE) $(BIN)
	mkdir -p $(DIST)
	$(BIN)/ccjs $(JS_SOURCE) > $(MIN)

# Rule to lint the source (only changed source is linted)
$(LINT): $(JS_SOURCE) $(BIN)
	$(BIN)/jshint $(filter $(JS_SOURCE), $?)
	@touch $(LINT)

.PHONY: lint
lint: $(LINT)

# Rule for making markdown docs
$(DOC): $(API)

# Rule for making API doc
$(API): $(JS_SOURCE) $(BIN)
	mkdir -p $(DOC)
	$(BIN)/jsdoc2md $(JS_SOURCE) > $(API)

# jsdoc: target for html docs produced (using 'jsdoc')
$(JSDOC): $(JS_SOURCE) $(BIN)
	mkdir -p $(JSDOC)
	$(BIN)/jsdoc --pedantic -d $(JSDOC) $(JS_SOURCE)
	@touch $(JSDOC)

# Rule to ensure Node bin scripts are present
$(BIN): $(MODULES)
	@touch $(BIN)

# Rule to install Node modules locally
$(MODULES): package.json
	npm install
	@touch $(MODULES)

# Rule to install Bower front end components locally
$(BOWER): $(BIN) bower.json
	$(BIN)/bower install
	@touch $(BOWER)

.PHONY: deps
deps: $(BIN) $(BOWER)

.PHONY: updeps
updeps:
	npm update
	$(BIN)/bower update

# Rule to clean project directory
.PHONY: clean
clean:
	rm app.html
	rm login.html
	rm -rf $(DIST)
	rm -rf $(JSDOC)
	rm -f .make-*

# Rule to clean the dependencies too
.PHONY: distclean
distclean: clean
	rm -rf $(MODULES)
	rm -rf $(BOWER)

# Rule to run unit tests
.PHONY: test
test:
	$(UNIT)

# Rule to run testem
.PHONY: testem
testem:
	$(BIN)/testem

# Rule to run karma
.PHONY: karma
karma:
	$(BIN)/karma start

# Rules to attach checksums to JavaScript source in the header
app.html: app.html.in .make-asset-block .make-template-block
	sed -e '/%ASSETS%/ {' -e 'r .make-asset-block' -e 'd' -e '}' app.html.in > app_temp.html
	sed -e '/%TEMPLATES%/ {' -e 'r .make-template-block' -e 'd' -e '}' app_temp.html > app.html
	rm app_temp.html

login.html: login.html.in .make-asset-block
	sed -e '/%ASSETS%/ {' -e 'r .make-asset-block' -e 'd' -e '}' login.html.in > login.html

.make-asset-block: $(CSS_DEPS) $(CSS_SOURCE) $(JS_DEPS) $(JS_SOURCE)
	> .make-asset-block
	for file in $(CSS_DEPS); do \
		echo "<link rel='stylesheet' type='text/css' href='$$file'>" >> .make-asset-block ; \
	done
	for file in $(CSS_SOURCE); do \
		checksum=$$($(MD5) $$file | awk '{ print $$1 }') ; \
		echo "<link rel='stylesheet' type='text/css' href='$$file?v=$$checksum'>" >> .make-asset-block ; \
	done
	for file in $(JS_DEPS); do \
		echo "<script src='$$file'></script>" >> .make-asset-block ; \
	done
	for file in $(JS_SOURCE); do \
		checksum=$$($(MD5) $$file | awk '{ print $$1 }') ; \
		echo "<script src='$$file?v=$$checksum'></script>" >> .make-asset-block ; \
	done

.make-template-block: $(TEMPLATES_DEPS)
	> .make-template-block
	for file in $(TEMPLATES_DEPS); do \
		$(CAT) $$file >> .make-template-block ; \
	done

# Rules for help/usage
.PHONY: help usage
help: usage
usage:
	@echo "Available 'make' targets:"
	@echo "    all       - an alias for build"
	@echo "    deps      - local install of node and bower dependencies"
	@echo "    updeps    - update local dependencies"
	@echo "    lint      - lint the source"
	@echo "    build     - builds the package"
	@echo "    test      - runs commandline tests"
	@echo "    testem    - starts the testem service"
	@echo "    karma     - starts the karma service"
	@echo "    doc       - make autogenerated markdown docs"
	@echo "    jsdoc     - make autogenerated html docs"
	@echo "    clean     - cleans the dist dir"
	@echo "    distclean - cleans the dist dir and the dependencies"
