(function() {
    var _path;
    function hasClass(ele, className) {
      var className = " " + className + " ";
      if ((" " + ele.className + " ").replace(/[\n\t]/g, " ").indexOf(className) > -1) {
        return true;
      }
      return false;
    }

    function getNextSibling(elem, selector) {
      var sibling = elem.nextElementSibling;
      if (!selector) return sibling;
      while (sibling) {
        if (sibling.matches(selector)) return sibling;
        sibling = sibling.nextElementSibling
      }
    };

    function onToggle(open, menuText) {
      var elems = document.querySelectorAll(".dropdown-menu.show");
      [].forEach.call(elems, function(el) {
        el.classList.remove("show");
      });
    }

    function toggleMenu($event) {
      $event.stopPropagation();
      $event.preventDefault();
      if (!hasClass(getNextSibling($event.target,".dropdown-menu"),"show")) {
        $event.target.closest(".dropdown-menu").querySelectorAll('.show').forEach(function(el) {
          el.classList.remove("show");
        });
      }
      getNextSibling($event.target,".dropdown-menu").classList.toggle("show");
    }

    function isCatalogDefined(val) {
        return val != undefined && val != null;
    }

    function addLogParams(url, dcctx) {
        // if `?` already in the url, use &
        var paramChar = url.lastIndexOf("?") !== -1 ? "&" : "?";

        var pcid = "navbar";
        // if not navbar app, append appname
        if (dcctx.cid !== "navbar") {
            pcid += "/" + dcctx.cid;
        }
        // ppid should be the pid for the current page
        return url + paramChar + "pcid=" + pcid + "&ppid=" + dcctx.pid;
    }

    function path() {
        if (!_path) {
            var path = "/chaise/";
            if (chaiseConfig && typeof chaiseConfig.chaiseBasePath === "string") {
                var path = chaiseConfig.chaiseBasePath;
                // append "/" if not present
                if (path[path.length-1] !== "/") path += "/";
            }

            _path = window.location.host + path;
        }

        return _path;
    }

    function isChaise(link) {
        var appNames = ["record", "recordset", "recordedit", "search", "login"];

        // parses the url into a location object
        var eleUrl = document.createElement('a');
        eleUrl.href = link;

        for (var i=0; i<appNames.length; i++) {
            var name = appNames[i];
            // path/appName exists in our url
            if (eleUrl.href.indexOf(path() + name) !== -1) return true;
        }

        return false;
    }

    'use strict';
    angular.module('chaise.navbar', [
        'chaise.login',
        'chaise.utils'
    ])
    .directive('navbar', ['ConfigUtils', 'ERMrest', 'logActions', 'logService', 'UriUtils', '$rootScope', '$window', function(ConfigUtils, ERMrest, logActions, logService, UriUtils, $rootScope, $window) {
        var chaiseConfig = ConfigUtils.getConfigJSON();

        // One-time transformation of chaiseConfig.navbarMenu to set the appropriate newTab setting at each node
        var root = chaiseConfig.navbarMenu || {};
        var catalogId = UriUtils.getCatalogId();
        // Set default newTab property at root node
        if (!root.hasOwnProperty('newTab')) {
            root.newTab = true;
        }

        var q = [root];
        while (q.length > 0) {
            var obj = q.shift();
            var parentNewTab = obj.newTab;
            // template the url
            // TODO: This is done here to prevent writing a recursive function (again) in `setConfigJSON()`
            if (obj.url && isCatalogDefined(catalogId)) {
                obj.url = ERMrest.renderHandlebarsTemplate(obj.url, null, {id: catalogId});

                // only append pcid/ppid if link is to a chaise url
                if (isChaise(obj.url)) {
                    var dcctx = ConfigUtils.getContextJSON();
                    obj.url = addLogParams(obj.url, dcctx);
                }
            }
            // If current node has children, set each child's newTab to its own existing newTab or parent's newTab
            if (Array.isArray(obj.children)) {
                obj.children.forEach(function (child) {
                    if (child.newTab === undefined) child.newTab = parentNewTab;
                    q.push(child);
                });
            }
        }

        return {
            restrict: 'EA',
            scope: {},
            templateUrl: UriUtils.chaiseDeploymentPath() + 'common/templates/navbar.html',
            link: function(scope) {
                var chaiseConfig = ConfigUtils.getConfigJSON();
                var dcctx = ConfigUtils.getContextJSON();

                scope.hideNavbar = dcctx.hideNavbar;
                scope.brandURL = chaiseConfig.navbarBrand;
                scope.brandText = chaiseConfig.navbarBrandText;
                scope.brandImage = chaiseConfig.navbarBrandImage;
                scope.menu = chaiseConfig.navbarMenu ? chaiseConfig.navbarMenu.children : [];

                scope.toggleMenu = toggleMenu;
                scope.onToggle = onToggle;

                scope.logBranding = function () {
                    // TODO: not sure if the "name" should be set here
                    // if name is, it should be `brandText`
                    var brandingHeader = {
                        action: logActions.branding
                    }

                    logService.logAction(brandingHeader, logActions.clientAction);
                }

                // {Boolean} open - denotes the state of current menu
                // {String} menuText - text that appears in the UI for the menu
                scope.logMenuToggle = function (menuText) {
                    var menuOpenHeader = {
                        action: logActions.dropdownMenu,
                        name: menuText
                    }

                    logService.logAction(menuOpenHeader, logActions.clientAction);
                }

                scope.logStaticLink = function (menuObject) {
                    // NOTE: if link goes to a chaise app, no logging necessary
                    if (isChaise(menuObject.url)) return;

                    // check if external or internal resource page
                    var action = UriUtils.isSameOrigin(menuObject.url) ? logActions.dropdownMenuInternal : logActions.dropdownMenuExternal;

                    var linkHeader = {
                        action: action,
                        name: menuObject.name
                    }

                    logService.logAction(linkHeader, logActions.clientAction);
                }


                if (isCatalogDefined(catalogId)) {
                    scope.isVersioned = function () {
                        return catalogId.split("@")[1] ? true : false;
                    }

                    scope.toLive = function () {
                        $window.location = addLogParams($window.location.href.replace(catalogId, catalogId.split("@")[0]), dcctx);
                    }
                }
            }
        };
    }])

    .directive('navbarMenu', ['$compile', 'logActions', 'logService', 'UriUtils', function($compile, logActions, logService, UriUtils) {
        return {
            restrict: 'EA',
            scope: {
                menu: '='
            },
            templateUrl: UriUtils.chaiseDeploymentPath() + 'common/templates/navbarMenu.html',
            compile: function(el) {
                var contents = el.contents().remove();
                var compiled;
                return function(scope, el) {
                    if (!compiled) {
                        compiled = $compile(contents);
                    }

                    scope.toggleSubMenu = function (event, menuText) {
                        var menuOpenHeader = {
                            action: logActions.dropdownMenu,
                            name: menuText
                        }

                        logService.logAction(menuOpenHeader, logActions.clientAction);

                        toggleMenu(event);
                    };

                    scope.logStaticLink = function (menuObject) {
                        // NOTE: if link goes to a chaise app, no logging necessary
                        if (isChaise(menuObject.url)) return;

                        // check if external or internal resource page
                        var action = UriUtils.isSameOrigin(menuObject.url) ? logActions.dropdownMenuInternal : logActions.dropdownMenuExternal;

                        var linkHeader = {
                            action: action,
                            name: menuObject.name
                        }

                        logService.logAction(linkHeader, logActions.clientAction);
                    }

                    compiled(scope, function(clone) {
                        el.append(clone);
                    });
                };
            }
        };
    }])
})();
