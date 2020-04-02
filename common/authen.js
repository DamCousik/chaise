(function() {
    'use strict';

    angular.module('chaise.authen', ['chaise.utils', 'chaise.storage'])

    .factory('Session', ['ConfigUtils', 'Errors', 'messageMap', 'logService', 'modalUtils', 'StorageService', 'UriUtils', '$cookies', '$interval', '$log', '$q', '$rootScope', '$sce', '$uibModalStack', '$window',
        function (ConfigUtils, Errors, messageMap, logService, modalUtils, StorageService, UriUtils, $cookies, $interval, $log, $q, $rootScope, $sce, $uibModalStack, $window) {
        // authn API no longer communicates through ermrest, removing the need to check for ermrest location
        var serviceURL = $window.location.origin;

        var LOCAL_STORAGE_KEY = 'session';              // name of object session information is stored under
        var PROMPT_EXPIRATION_KEY = 'promptExpiration'; // name of key for prompt expiration value
        var PREVIOUS_SESSION_KEY = 'previousSession';   // name of key for previous session boolean

        var SESSION_INFO_KEY = "sessionInfo";           // name of key for logged in user's session
        var SESSION_COOKIE_KEY = "cookie";              // name of key for logged in user's cookie

        var _cookie = null;                             // cookie value when app loads
        var _session = null;                            // current session object
        var _prevSession = null;                        // previous session object
        var _sameSessionAsPrevious = false;

        var _changeCbs = {};

        var _counter = 0;

        var _executeListeners = function() {
            for (var k in _changeCbs) {
                _changeCbs[k]();
            }
        };

        /**
         * Functions that interact with the StorageService tokens
         * There are 3 keys stored under the LOCAL_STORAGE_KEY object, PROMPT_EXPIRATION_KEY, PREVIOUS_SESSION_KEY, and SESSION_INFO_KEY
         */

        // returns data stored in loacal storage for `keyName`
        var _getKeyFromStorage = function (keyName) {
            return StorageService.getStorage(LOCAL_STORAGE_KEY)[keyName];
        }

        // create value in storage with `keyName` and `value`
        var _setKeyInStorage = function (keyName, value) {
            var data = {};

            data[keyName] = value;

            StorageService.updateStorage(LOCAL_STORAGE_KEY, data);
        }

        // removes the key/value pair at `keyName`
        var _removeKeyFromStorage = function (keyName) {
            if (_keyExistsInStorage(keyName)) {
                StorageService.deleteStorageValue(LOCAL_STORAGE_KEY, keyName);
            }
        };

        // verifies value exists for `keyName`
        var _keyExistsInStorage = function(keyName) {
            var sessionStorage = StorageService.getStorage(LOCAL_STORAGE_KEY);

            return (sessionStorage && sessionStorage[keyName]);
        };


        // creates an expiration token with `keyName`
        var _createToken = function (keyName) {
            var data = {};
            var hourFromNow = new Date();
            hourFromNow.setHours(hourFromNow.getHours() + 1);

            data[keyName] = hourFromNow.getTime();

            StorageService.updateStorage(LOCAL_STORAGE_KEY, data);
        };

        // checks if the expiration token with `keyName` has expired
        var _expiredToken = function (keyName) {
            var sessionStorage = StorageService.getStorage(LOCAL_STORAGE_KEY);

            return (sessionStorage && new Date().getTime() > sessionStorage[keyName]);
        };

        // extends the expiration token with `keyName` if it hasn't expired
        var _extendToken = function (keyName) {
            if (_keyExistsInStorage(keyName) && !_expiredToken(keyName)) {
                _createToken(keyName);
            }
        };

        var modalInstance = null;
        var loginWindowCb = function (params, referrerId, cb, type, rejectCb){
            if(type.indexOf('modal')!== -1){
                if (_session) {
                    params.title = messageMap.sessionExpired.title;
                } else {
                    params.title = messageMap.noSession.title;
                }
                var closed = false;

                var cleanupModal = function (message) {
                    $interval.cancel(intervalId);
                    $cookies.remove("chaise-" + referrerId, { path: "/" });
                    closed = true;
                }
                var onModalCloseSuccess = function () {
                    cleanupModal("login refreshed");
                    cb();
                }

                var onModalClose = function(response) {
                    cleanupModal("no login");
                    if (rejectCb) {
                        //  ermrestJS throws error if 'response' is not formatted as an Error
                        if (typeof response == "String") {
                            response = new Error(response);
                        }
                        rejectCb(response);
                    }
                };

                modalInstance = modalUtils.showModal({
                    windowClass: "modal-login-instruction",
                    templateUrl: UriUtils.chaiseDeploymentPath() + "common/templates/loginDialog.modal.html",
                    controller: 'LoginDialogController',
                    controllerAs: 'ctrl',
                    resolve: {
                        params: params
                    },
                    openedClass: 'modal-login',
                    backdrop: 'static',
                    keyboard: false
                }, onModalCloseSuccess, onModalClose, false);
            }


            /* if browser is IE then add explicit handler to watch for changes in localstorage for a particular
             * variable
             */
            if (UriUtils.isBrowserIE()) {
                $cookies.put("chaise-" + referrerId, true, { path: "/" });
                var intervalId;
                var watchChangeInReferrerId = function () {
                    if (!$cookies.get("chaise-" + referrerId)) {
                        $interval.cancel(intervalId);
                        if (typeof cb== 'function') {
                            if(type.indexOf('modal')!== -1){
                                intervalId = $interval(watchChangeInReferrerId, 50);
                                modalInstance.close("Done");
                                cb();
                                closed = true;
                            }
                            else{
                                cb();
                            }
                        }
                        return;
                    }
                }
            }
            else {
                window.addEventListener('message', function(args) {
                    if (args && args.data && (typeof args.data == 'string')) {
                        _setKeyInStorage(PREVIOUS_SESSION_KEY);
                        _removeKeyFromStorage(PROMPT_EXPIRATION_KEY);
                        var obj = UriUtils.queryStringToJSON(args.data);
                        if (obj.referrerid == referrerId && (typeof cb== 'function')) {
                            if(type.indexOf('modal')!== -1){
                                modalInstance.close("Done");
                                cb();
                                closed = true;
                            }
                            else{
                                cb();
                            }
                        }
                    }
                });
            }
        };


        var logInHelper = function(logInTypeCb, win, cb, type, rejectCb, logAction){
            var referrerId = (new Date().getTime());

            var url = serviceURL + '/authn/preauth?referrer='+UriUtils.fixedEncodeURIComponent($window.location.origin+"/"+ UriUtils.chaiseDeploymentPath() + "login?referrerid=" + referrerId);
            var config = {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'Accept': 'application/json'
                },
                skipHTTP401Handling: true
            };

            // TODO in the case of loginInAModal, we're not doing the actual login,
            // but we're still sending the request. Since we need to change this anyways,
            // I decided to not add any log action in that case and instead we should just
            // fix that function.
            if (logAction) {
                config.headers[ERMrest.contextHeaderName] = {
                    action: logService.getActionString(logAction, "", "")
                }
            }
            ConfigUtils.getHTTPService().get(url, config).then(function(response){
                var data = response.data;

                var login_url = "";
                if (data['redirect_url'] !== undefined) {
                    login_url = data['redirect_url'];
                } else if (data['login_form'] !== undefined) {
                    // we want to use the old login flow to login
                    // (login in the same window so when login does occur, it changes the same page instead of the page in the window that pops up)
                    win = $window;
                    // prevents the dialog from popping up shortly before the page redirects to login
                    type = "";
                    var referrer = $window.location.href;
                    var login_form = data['login_form'];
                    login_url = '../login?referrer=' + UriUtils.fixedEncodeURIComponent(referrer);
                    var method = login_form['method'];
                    var action = UriUtils.fixedEncodeURIComponent(login_form['action']);
                    var text = '';
                    var hidden = '';
                    for (var i = 0; i < login_form['input_fields'].length; i++) {
                        var field = login_form['input_fields'][i];
                        if (field.type === 'text') {
                            text = UriUtils.fixedEncodeURIComponent(field.name);
                        } else {
                            hidden = UriUtils.fixedEncodeURIComponent(field.name);
                        }
                    }
                    login_url += '&method=' + method + '&action=' + action + '&text=' + text + '&hidden=' + hidden + '&?referrerid=' + referrerId;
                }

                var params = {
                    login_url: login_url
                };
                if(win){
                        win.location=params.login_url;
                }
                logInTypeCb(params,referrerId, cb, type, rejectCb);
            }, function(error) {
                throw ERMrest.responseToError(error);
            });
        };

        /**
         * opens a window dialog for logging in
         */
        var popupLogin = function (logAction, postLoginCB) {
            if (!postLoginCB) {
                postLoginCB = function(){
                    if (!shouldReloadPageAfterLogin()) {
                        // fetches the session of the user that just logged in
                        _getSession().then(function () {
                            if (modalInstance) modalInstance.close();
                        });
                    } else {
                        window.location.reload();
                    }
                };
            }

            var x = window.innerWidth/2 - 800/2;
            var y = window.innerHeight/2 - 600/2;

            var win = window.open("", '_blank','width=800,height=600,left=' + x + ',top=' + y);

            logInHelper(loginWindowCb, win, postLoginCB, 'popUp', null, logAction);
        };

        var shouldReloadPageAfterLogin = function() {
            if (_session === null && _prevSession == null) return true;
            return false;
        };

        /**
         * Will return a promise that is resolved with the session.
         * It will also call the _executeListeners() functions and sets the _session.
         * If we couldn't fetch the session, it will resolve with `null`.
         *
         * @param  {string=} context undefined or "401"
         */
        var _getSession = function(context) {
            var config = {
                skipHTTP401Handling: true,
                headers: {}
            };

            config.headers[ERMrest.contextHeaderName] = {
                action: logService.getActionString(logService.logActions.SESSION_RETRIEVE, "", "")
            }

            // see if there's a token before doing any decision making

            // if there's no webauthnCookie || no cookieFromStorage, login flow

            // if there's a webauthnCookie user was logged in at some point on this machine, check to see if it matches _cookie
            //  - if NOT match page was used by someone that's not the current webauthn cookie holder, check webauthnCookie matches cookieFromStorage
            //    - if match, check cookieFromStorage.expires is not expired
            //      - if expired, login flow
            //      - if not expired, use local storage session
            //    - if NOT match, shouldn't happen unless cookie in browser is updated without chaise
            //  - if match user had a session on this page, make sure _session.expires is not expired
            //    - if not expired, TODO leasing idea
            //    - if expired, login timeout warning

            // no webauthn
            // if there's a cookieFromStorage user was here before, see if it is expired
            //  - if expired

            return ConfigUtils.getHTTPService().get(serviceURL + "/authn/session", config).then(function(response) {
                if (context === "401" && shouldReloadPageAfterLogin()) {
                    window.location.reload();
                    return response.data;
                }

                // keep track of only the first session, so when a timeout occurs, we can compare the sessions
                // when a new session is fetched after timeout, check if the identities are the same
                if (_prevSession) {
                    _sameSessionAsPrevious = _prevSession.client.id == response.data.client.id;
                } else {
                    _prevSession = response.data
                }

                if (!_session) {
                    // only update _session if no session is set
                    _session = response.data;
                }

                _executeListeners();
                return _session;
            }).catch(function(err) {
                $log.warn(ERMrest.responseToError(err));

                _session = null;
                _executeListeners();
                return _session;
            });
        }

        return {
            getSession: _getSession,

            /**
             * Will return a promise that is resolved with the session.
             * Meant for validating the server session and verify if it's still active or not
             */
            validateSession: function () {
                var config = {
                    skipHTTP401Handling: true,
                    headers: {}
                };
                config.headers[ERMrest.contextHeaderName] = {
                    action: logService.getActionString(logService.logActions.SESSION_VALIDATE, "", "")
                }
                return ConfigUtils.getHTTPService().get(serviceURL + "/authn/session", config).then(function(response) {
                    if (!_session) {
                        // only update _session if no session is set
                        _session = response.data;
                    }
                    return _session;
                }).catch(function(err) {
                    $log.warn(ERMrest.responseToError(err));

                    _session = null;
                    return _session;
                });
            },

            validateSessionBeforeMutation: function (cb) {
                var handleDiffUser = function () {

                    // modalInstance comes from error modal controller to close the modal after logging in, but before checking to throw an error again
                    var checkSession = function (modalInstance) {
                        modalInstance.dismiss("continue");
                        // check if login state resolved
                        _getSession().then(function (session) {
                            if (!session || !_sameSessionAsPrevious) {
                                handleDiffUser()
                            } else {
                                cb();
                            }
                        });
                    }

                    var errorCB = checkSession;

                    if (!_session) {
                        // for continuing in the modal if there is a user
                        errorCB = function (modalInstance) {
                            popupLogin("action", function () {
                                checkSession(modalInstance);
                            });
                        }
                    }

                    throw new Errors.DifferentUserConflictError(_session, _prevSession, errorCB); // cannot dismiss
                }

                // Checks if an error needs to be thrown because the user is different and continues execution if the login state is resolved
                // a session must exist before calling this function
                var validateSessionSubmit = function () {
                    if (!_sameSessionAsPrevious) {
                        handleDiffUser();
                    } else {
                        // we have a session now and it's the same as when the app started
                        cb();
                    }
                }

                _getSession().then(function (session) {
                    if (!session) {
                        var onSuccess = function () {
                            validateSessionSubmit();
                        }

                        var onError = function (err) {
                            // NOTE: user didn't login, what's the error ?
                            // same error message as duplicate user except "anon"
                            handleDiffUser();
                        }

                        // should be modal login
                        logInHelper(loginWindowCb, "", onSuccess, 'modal', onError, "action"); // logAction
                    } else {
                        validateSessionSubmit();
                    }
                });
            },

            getSessionValue: function() {
                return _session;
            },

            getPrevSessionValue: function() {
                return _prevSession;
            },

            isSameSessionAsPrevious: function() {
                return _sameSessionAsPrevious;
            },

            shouldReloadPageAfterLogin: shouldReloadPageAfterLogin,

            // if there's a previous login token AND
            // the prompt expiration token does not exist OR it has expired
            showPreviousSessionAlert: function() {
                return (_keyExistsInStorage(PREVIOUS_SESSION_KEY) && (!_keyExistsInStorage(PROMPT_EXPIRATION_KEY) || _expiredToken(PROMPT_EXPIRATION_KEY)));
            },

            subscribeOnChange: function(fn) {
                // To avoid same ids for an instance we add counter
                var id = new Date().getTime() + (++_counter);

                if (typeof fn  == 'function') {
                    _changeCbs[id] = fn;
                }
                return id;
            },

            unsubscribeOnChange: function(id) {
                delete _changeCbs[id];
            },

            createPromptExpirationToken: function() {
                _createToken(PROMPT_EXPIRATION_KEY);
            },

            extendPromptExpirationToken: function() {
                _extendToken(PROMPT_EXPIRATION_KEY);
            },

            loginInAPopUp: popupLogin,

            /**
             * TODO technically this function should even ask for preauthn in logInHelper
             * This function opens a modal dialog which has a link for login
             * the callback for this function has a race condition because the login link in the modal uses `loginInAPopUp`
             * that function uses the embedded `reloadCb` as the callback for the actual login window closing.
             * these 2 callbacks trigger in the order of `popupCb` first then `modalCb` where modalCb is ignored more often than not
             * @param {Function} notifyErmrestCB - runs after the login process has been complete
             */
            loginInAModal: function(notifyErmrestCB, notifyErmrestRejectCB, logAction) {
                logInHelper(loginWindowCb, "", notifyErmrestCB, 'modal', notifyErmrestRejectCB, logAction);
            },

            logout: function() {
                var chaiseConfig = ConfigUtils.getConfigJSON();
                var logoutURL = chaiseConfig['logoutURL'] ? chaiseConfig['logoutURL'] : '/';
                var url = serviceURL + "/authn/session";

                url += '?logout_url=' + UriUtils.fixedEncodeURIComponent(logoutURL);

                var config = {
                    skipHTTP401Handling: true,
                    headers: {}
                };
                config.headers[ERMrest.contextHeaderName] = {
                    action: logService.getActionString(logService.logActions.LOGOUT_NAVBAR, "", "")
                }
                ConfigUtils.getHTTPService().delete(url, config).then(function(response) {
                    StorageService.deleteStorageNamespace(LOCAL_STORAGE_KEY);
                    $window.location = response.data.logout_url;
                }, function(error) {
                    // if the logout fails for some reason, send the user to the logout url as defined above
                    $window.location = logoutURL;
                });
            }
        }
    }])

    var pathname = window.location.pathname;

    // If app is not search, viewer and login then attach the unauthorised 401 http handler to ermrestjs

    if (pathname.indexOf('/search/') == -1 && pathname.indexOf('/viewer/') == -1 && pathname.indexOf('/login') == -1) {

        angular.module('chaise.authen')

        .run(['ConfigUtils', 'ERMrest', 'Errors', 'ErrorService', '$injector', '$q', function runRecordEditApp(ConfigUtils, ERMrest, Errors, ErrorService, $injector, $q) {

            var Session = $injector.get("Session");

            // Bind callback function by invoking setHTTP401Handler handler passing the callback
            // This callback will be called whenever 401 HTTP error is encountered unless there is
            // already login flow in progress
            ERMrest.setHTTP401Handler(function() {
                var defer = $q.defer();

                // Call login in a new modal window to perform authentication
                // and return a promise to notify ermrestjs that the user has loggedin
                Session.loginInAModal(function() {

                    // Once the user has logged in fetch the new session and set the session value
                    // and resolve the promise to notify ermrestjs that the user has logged in
                    // and it can continue firing other queued calls
                    Session.getSession("401").then(function(_session) {
                        var prevSession = Session.getPrevSessionValue();
                        // TODO: limiting this to entry may not be the right condition?
                        // Not sure if this will trigger on page load, if not I think it's safe to run this in all contexts
                        // recordset  - read should throw a 409 if there's a permission issue
                        // record     - same issue with read above
                        //            - p&b add throws a conflict error in most cases, so won't get sent here either (RBK)
                        // recordedit - add/update return here in some cases, and in other cases will return a 409 and ignore this case
                        var differentUser = prevSession && !Session.isSameSessionAsPrevious()

                        // send boolean to communicate in ermrestJS if execution should continue after 401 error thrown and subsequent login
                        defer.resolve(differentUser);

                        // throw Error if login is successful but it's a different user
                        if (differentUser) ErrorService.handleException(new Errors.DifferentUserConflictError(_session, prevSession), false);
                    }, function(exception) {
                        defer.reject(exception);
                    });

                }, function (response) {
                    // returns to rejectCB in ermrestJS/http.js
                    defer.reject(response);
                });

                return defer.promise;
            });


        }]);

    }

})();
