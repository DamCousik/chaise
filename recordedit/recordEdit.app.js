(function() {
    'use strict';

    angular.module('chaise.recordEdit', [
        '720kb.datepicker',
        'chaise.alerts',
        'chaise.authen',
        'chaise.delete',
        'chaise.errors',
        'chaise.filters',
        'chaise.modal',
        'chaise.navbar',
        'chaise.utils',
        'chaise.validators',
        'ermrestjs',
        'ngCookies',
        'ngMessages',
        'ngSanitize',
        'ui.bootstrap',
        'ui.mask',
        'ui.select'
    ])

    .config(['$cookiesProvider', '$windowProvider', function($cookiesProvider, $windowProvider) {
        $cookiesProvider.defaults.path = '/';
        $cookiesProvider.defaults.secure = true;
    }])

    .run(['ERMrest', 'ErrorService', 'headInjector', 'recordEditModel', 'UiUtils', 'UriUtils', '$log', '$rootScope', '$window', '$cookies', function runRecordEditApp(ERMrest, ErrorService, headInjector, recordEditModel, UiUtils, UriUtils, $log, $rootScope, $window, $cookies) {
        var context = { booleanValues: ['', true, false] };
        UriUtils.setOrigin();
        headInjector.addTitle();
        headInjector.addCustomCSS();

        // This is to allow the dropdown button to open at the top/bottom depending on the space available
        UiUtils.setBootstrapDropdownButtonBehavior();
        UriUtils.setLocationChangeHandling();

        try {
            // If defined but false, throw an error
            if (!chaiseConfig.editRecord && chaiseConfig.editRecord !== undefined) {
                var message = 'Chaise is currently configured to disallow editing records. Check the editRecord setting in chaise-config.js.';
                var error = new Error(message);
                error.code = "Record Editing Disabled";

                throw error;
            }

            var ermrestUri = UriUtils.chaiseURItoErmrestURI($window.location);

            context = $rootScope.context = UriUtils.parseURLFragment($window.location, context);
            context.appName = "recordedit";

            ERMrest.resolve(ermrestUri, {cid: context.appName}).then(function getReference(reference) {
                $rootScope.reference = (context.filter ? reference.contextualize.entryEdit : reference.contextualize.entryCreate);
                $rootScope.reference.session = $rootScope.session;

                $log.info("Reference: ", $rootScope.reference);

                // Case for creating an entity with prefilled values
                if (context.prefill) {
                    // get the cookie with the prefill value
                    var cookie = $cookies.getObject(context.prefill);
                    if (cookie) {
                        // assign those values into the model
                        Object.keys(cookie).forEach(function(key) {
                            // TODO: Should refactor this switch statement out into its function after GPCR decodeURIComponent
                            // It's nearly identical to the switch statement in the if (context.filter) {} case
                            var colName = key; var colValue = cookie[key]; var colType;
                            $rootScope.reference.columns.some(function(column) {
                                if (column.name === colName) {
                                    colType = column.type.name;
                                    return true;
                                }
                            });
                            switch (colType) {
                                case "timestamp":
                                case "timestamptz":
                                    if (colValue) {
                                        // Cannot ensure that all timestamp values are formatted in ISO 8601
                                        // TODO: Fix pretty print fn in ermrestjs to return ISO 8601 format instead of toLocaleString?
                                        var ts = moment(colValue);
                                        value = {
                                            date: ts.format('YYYY-MM-DD'),
                                            time: ts.format('hh:mm:ss'),
                                            meridiem: ts.format('A')
                                        };
                                    } else {
                                        value = {
                                            date: null,
                                            time: null,
                                            meridiem: null
                                        };
                                    }
                                    break;
                                case "int2":
                                case "int4":
                                case "int8":
                                    colValue = (colValue ? parseInt(colValue, 10) : '');
                                    break;
                                case "float4":
                                case "float8":
                                case "numeric":
                                    colValue = (colValue ? parseFloat(colValue) : '');
                                    break;
                                default:
                                    break;
                            }
                            recordEditModel.rows[recordEditModel.rows.length - 1][colName] = colValue;
                        });
                    }
                }

                // Case for editing an entity
                if (context.filter) {
                    if ($rootScope.reference.canUpdate) {
                        // check id range before reading?
                        $rootScope.reference.read(1).then(function getPage(page) {
                            $log.info("Page: ", page);

                            if (page.tuples.length < 1) {
                                var filter = context.filter;
                                var noDataMessage = "No entity exists with " + filter.column + filter.operator + filter.value;
                                var noDataError = new Error(noDataMessage);
                                noDataError.code = "404 Not Found";

                                throw noDataError;
                            }

                            var column, value,
                            tuple = page.tuples[0],
                            values = tuple.values;

                            $rootScope.tuples = page.tuples;
                            $rootScope.displayname = tuple.displayname;

                            for (var i = 0; i < $rootScope.reference.columns.length; i++) {
                                column = $rootScope.reference.columns[i];

                                switch (column.type.name) {
                                    case "timestamp":
                                    case "timestamptz":
                                        if (values[i]) {
                                            // Cannot ensure that all timestamp values are formatted in ISO 8601
                                            // TODO: Fix pretty print fn in ermrestjs to return ISO 8601 format instead of toLocaleString?
                                            var ts = moment(values[i]);
                                            value = {
                                                date: ts.format('YYYY-MM-DD'),
                                                time: ts.format('hh:mm:ss'),
                                                meridiem: ts.format('A')
                                            };
                                        } else {
                                            value = {
                                                date: null,
                                                time: null,
                                                meridiem: null
                                            };
                                        }
                                        break;
                                    case "int2":
                                    case "int4":
                                    case "int8":
                                        value = (values[i] ? parseInt(values[i], 10) : '');
                                        break;
                                    case "float4":
                                    case "float8":
                                    case "numeric":
                                        value = (values[i] ? parseFloat(values[i]) : '');
                                        break;
                                    default:
                                        value = values[i];
                                        break;
                                }

                                recordEditModel.rows[recordEditModel.rows.length - 1][column.name] = value;
                            }
                            $log.info('Model: ', recordEditModel);
                        }, function error(response) {
                            $log.warn(response);
                            throw reponse;
                        }).catch(function readCatch(exception) {
                            ErrorService.errorPopup(exception.message, exception.code, "home page");
                        });
                    } else {
                        var notAuthorizedMessage = "You are not authorized to Update entities.";
                        var notAuthorizedError = new Error(notAuthorizedMessage);
                        notAuthorizedError.code = ($rootScope.session ? "403 Fordbidden" : "401 Unauthorized");

                        throw notAuthorizedError;
                    }
                } else {
                    if ($rootScope.reference.canCreate) {
                        $rootScope.displayname = $rootScope.reference.displayname;
                    } else {
                        var notAuthorizedMessage = "You are not authorized to Create entities.";
                        var notAuthorizedError = new Error(notAuthorizedMessage);
                        notAuthorizedError.code = ($rootScope.session ? "403 Fordbidden" : "401 Unauthorized");

                        throw notAuthorizedError;
                    }
                }
            }, function error(response) {
                $log.warn(response);
                throw response;
            }).catch(function genericCatch(exception) {
                if (exception instanceof ERMrest.UnauthorizedError)
                    ErrorService.catchAll(exception);
                else
                    ErrorService.errorPopup(exception.message, exception.code, "home page");
            });
        } catch (exception) {
            ErrorService.errorPopup(exception.message, exception.code, "home page");
        }
    }]);
})();
