(function () {
    'use strict';

    angular.module('chaise.record.table', ['chaise.ellipses'])

    /**
     * Ways to use recordTable directive:
     *
     * 1. Table only, default row click action (go to record)
     *    <record-table vm="vm" default-row-linking="true"></record-table>
     *
     * 2. Table only, customized row click function
     *    <record-table vm="vm" on-row-click="gotoRowLink(tuple)"></record-table>
     *
     * 3. Table with search, page size, previous/next, default row click action (go to record)
     *    <recordset vm="vm" default-row-linking="true"></recordset>
     *
     * 4. Table with search, page size, previous/next, customized row click function
     *    <recordset vm="vm" on-row-click="gotoRowLink(tuple)"></recordset>
     *
     *
     * vm is the table model, should have this format:
     *
     *      { hasLoaded,    // data is ready, loading icon should not be visible
     *        reference,    // reference object
     *        tableDisplayName,
     *        columns,      // array of Column objects
     *        enableSort,   // boolean whether sorting should be enabled
     *        sortby,       // column name, user selected or null
     *        sortOrder,    // asc (default) or desc
     *        page,         // current page object
     *        pageLimit,    // number of rows per page
     *        rowValues,    // array of rows values, each value has this structure {isHTML:boolean, value:value}
     *        search: null  // search term
     *       }
     *
     *
     * Handle recordset/recordTable events in your controller:
     *
     * 1. recordset-update - data model has been updated
     *    your app may want to update address bar, permalink etc.
     *
     *      $scope.$on('recordset-update', function() {
     *          $window.scrollTo(0, 0);
     *          $window.location.replace($scope.permalink());
     *          $rootScope.location = $window.location.href;
     *      });
     *
     * 2. error - an exception was caught
     *
     *      $scope.$on('error', function(event, exception) {
     *          $log.warn(exception);
     *          ErrorService.catchAll(exception);
     *      });
     */
    .factory('recordTableUtils', ['DataUtils', '$timeout', function(DataUtils, $timeout) {
        function read(scope) {
            scope.vm.hasLoaded = false;

            scope.vm.reference.read(scope.vm.pageLimit).then(function (page) {

                scope.vm.page = page;
                scope.vm.rowValues = DataUtils.getRowValuesFromPage(page);
                scope.vm.hasLoaded = true;

                $timeout(function() {
                    scope.vm.foregoundSearch = false;
                }, 200);
                

                // tell parent controller data updated
                scope.$emit('recordset-update');

            }, function error(response) {
                scope.vm.hasLoaded = true;
                scope.$emit('error', response);

            })
        }

        return {
            read: read
        }
    }])

    .directive('recordTable', ['AlertsService', 'recordTableUtils', function(AlertsService, recordTableUtils) {

        return {
            restrict: 'E',
            templateUrl: '../common/templates/table.html',
            scope: {
                vm: '=',
                defaultRowLinking: "=?", // set to true to use default row click action (go to record)
                onRowClickBind: '=?',    // used by the recordset template to pass down on click function
                onRowClick: '&?'      // set row click function if not using default
            },
            link: function (scope, elem, attr) {

                scope.sortby = function(column) {
                    if (scope.vm.sortby !== column) {
                        scope.vm.sortby = column;
                        scope.vm.sortOrder = "asc";
                        scope.vm.reference = scope.vm.reference.sort([{"column":scope.vm.sortby, "descending":(scope.vm.sortOrder === "desc")}]);
                        recordTableUtils.read(scope);
                    }

                };

                scope.toggleSortOrder = function () {
                    scope.vm.sortOrder = (scope.vm.sortOrder === 'asc' ? scope.vm.sortOrder = 'desc' : scope.vm.sortOrder = 'asc');
                    scope.vm.reference = scope.vm.reference.sort([{"column":scope.vm.sortby, "descending":(scope.vm.sortOrder === "desc")}]);
                    recordTableUtils.read(scope);
                };

                scope.gotoRowLink = function(index) {
                    var tuple = scope.vm.page.tuples[index];
                    var appUrl = tuple.reference.contextualize.detailed.appLink;
                    if (appUrl)
                        location.assign(appUrl);
                    else {
                        AlertsService.addAlert({type: "error", message: "Application Error: row linking undefined for " + tuple.reference.location.compactPath});
                    }
                };

                scope.rowClickAction = function(event, index) {
                    var el = event.target || event.srcElement;
                    if (el.nodeName.toLowerCase() === 'a' || el.nodeName.toLowerCase() === 'button' || el.classList.contains("readmore")) {
                        return false;
                    }

                    var args = {"tuple": scope.vm.page.tuples[index]};
                    if (scope.defaultRowLinking !== undefined && scope.defaultRowLinking === true) {
                        scope.gotoRowLink(index);
                    } else if (scope.onRowClickBind) {
                        scope.onRowClickBind(args);
                    } else if (scope.onRowClick) {
                        scope.onRowClick(args);
                    }
                }

            }
        };
    }])

    .directive('recordset', ['recordTableUtils', '$window', '$timeout', function(recordTableUtils, $window, $timeout) {

        return {
            restrict: 'E',
            templateUrl: '../common/templates/recordset.html',
            scope: {
                vm: '=',
                defaultRowLinking: "=?", // set true to use default row click action (link to record)
                onRowClick: '&?'         // set row click function if not using default
            },
            link: function (scope, elem, attr) {

                $window.onfocus = function() {
                    scope.vm.backgroundSearch = false;
                    recordTableUtils.read(scope);
                };

                scope.pageLimits = [10, 25, 50, 75, 100, 200];

                scope.setPageLimit = function(limit) {
                    scope.vm.backgroundSearch = false;
                    scope.vm.pageLimit = limit;
                    recordTableUtils.read(scope);
                };

                scope.before = function() {
                    scope.vm.backgroundSearch = false;
                    var previous = scope.vm.page.previous;
                    if (previous) {

                        scope.vm.reference = previous;
                        recordTableUtils.read(scope);

                    }
                };

                scope.after = function() {
                    scope.vm.backgroundSearch = false;
                    var next = scope.vm.page.next;
                    if (next) {

                        scope.vm.reference = next;
                        recordTableUtils.read(scope);
                    }

                };


                var inputChangedPromise;
                scope.inputChanged = function() {
                    if (scope.vm.enableAutoSearch) {

                        if (inputChangedPromise) {
                            $timeout.cancel(inputChangedPromise);
                        }

                        inputChangedPromise = $timeout(function() {
                            inputChangedPromise = null;

                            if (!scope.vm.foregoundSearch) {
                                scope.vm.backgroundSearch = true;
                                scope.search(scope.vm.search);
                            }
                        }, 200);
                    }
                };

                scope.enterPressed = function() {
                    scope.vm.backgroundSearch = false;
                    scope.vm.foregoundSearch = true;
                    scope.search(scope.vm.search);
                };

                scope.search = function(term) {

                    if (term)
                        term = term.trim();

                    scope.vm.search = term;
                    scope.vm.reference = scope.vm.reference.search(term); // this will clear previous search first
                    recordTableUtils.read(scope);
                };

                scope.clearSearch = function() {
                    scope.vm.backgroundSearch = false;
                    if (scope.vm.reference.location.searchTerm)
                        scope.search();

                    scope.vm.search = null;
                };

                scope.addRecord = function() {
                    // open a new tab, once focus is back to this page, reload
                    var newRef = scope.vm.reference.contextualize.entryCreate;
                    var appLink = newRef.appLink;

                    // open url in a new tab
                    var window = $window.open(appLink, '_blank');
                    if (window) {
                        window.focus();
                    } else {
                        $window.location.href = appLink;
                    }
                };

            }
        };
    }]);
})();
