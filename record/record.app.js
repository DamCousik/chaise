(function() {
    'use strict';

    angular.module('chaise.record', [
        'ngSanitize',
        'chaise.errors',
        'chaise.filters',
        'chaise.modal',
        'chaise.navbar',
        'chaise.record.display',
        'chaise.record.table',
        'chaise.html',
        'chaise.utils',
        'ermrestjs',
        'ui.bootstrap'
    ])

    // The page info object passed to the table directive
    .factory('pageInfo', [function() {
        return {
            loading: true,
            previousButtonDisabled: true,
            nextButtonDisabled: true,
            pageLimit: 25
        };
    }])

    .run(['DataUtils', 'headInjector', 'ERMrest', 'UriUtils', 'ErrorService', 'pageInfo', '$log', '$rootScope', '$window', 'AlertsService', '$q', function runApp(DataUtils, headInjector, ERMrest, UriUtils, ErrorService, pageInfo, $log, $rootScope, $window, AlertsService, $q) {
        var context = {};
        $rootScope.pageInfo = pageInfo;
        UriUtils.setOrigin();
        headInjector.addTitle();
        headInjector.addCustomCSS();
        $rootScope.alerts = AlertsService.alerts;

        try {
            var ermrestUri = UriUtils.chaiseURItoErmrestURI($window.location);

            context = $rootScope.context = UriUtils.parseURLFragment($window.location, context);

            // The context object won't change unless the app is reloaded
            context.appName = "record";

            if (context.filter) {
                ERMrest.resolve(ermrestUri, {cid: context.appName}).then(function getReference(reference) {
                    // $rootScope.reference != reference after contextualization
                    $rootScope.reference = reference.contextualize.detailed;
                    $rootScope.reference.session = $rootScope.session;

                    $log.info("Reference: ", $rootScope.reference);

                    $rootScope.relatedReferences = $rootScope.reference.related;
                    // There should only ever be one entity related to this reference
                    return $rootScope.reference.read(1);
                }, function error(exception) {
                    return $q.reject(exception);
                }).then(function getPage(page) {
                    var tuple = page.tuples[0];
                    // Used directly in the record-display directive
                    $rootScope.recordDisplayname = tuple.displayname;

                    // Collate tuple.isHTML and tuple.values into an array of objects
                    // i.e. {isHTML: false, value: 'sample'}
                    $rootScope.recordValues = [];
                    tuple.values.forEach(function(value, index) {
                        $rootScope.recordValues.push({
                            isHTML: tuple.isHTML[index],
                            value: value
                        });
                    });

                    $rootScope.columns = $rootScope.reference.columns;

                    $rootScope.tableModels = [];

                    for (var i = 0; i < $rootScope.relatedReferences.length; i++) {
                        $rootScope.relatedReferences[i] = $rootScope.relatedReferences[i].contextualize.compactBrief;

                        if ($rootScope.relatedReferences[i].display.defaultPageSize) {
                            pageInfo.pageLimit = $rootScope.relatedReferences[i].display.defaultPageSize;
                        }
                        (function(i) {
                            $rootScope.relatedReferences[i].read(pageInfo.pageLimit).then(function (page) {

                                var model = {
                                    reference: $rootScope.relatedReferences[i],
                                    columns: $rootScope.relatedReferences[i].columns,
                                    page: page,
                                    hasNext: page.hasNext,      // used to determine if a link should be shown
                                    hasLoaded: true,            // used to determine if the current table and next table should be rendered
                                    open: true,                 // to define if the accordion is open or closed
                                    sortby: null,               // column name, user selected or null
                                    sortOrder: null,            // asc (default) or desc
                                    rowValues: []               // array of rows values
                                };
                                model.rowValues = DataUtils.getRowValuesFromPage(page);
                                $rootScope.tableModels[i] = model;
                            });
                        })(i);
                    }

                }, function error(response) {
                    $log.warn(response);
                    throw response;
                }).catch(function genericCatch(exception) {
                    ErrorService.catchAll(exception);
                });
            // No filter defined, redirect to search
            } else {
                // change the path and redirect to search because no id was supplied
                var modifiedPath = $window.location.pathname.replace(context.appName, "search");
                // If default catalog/table are not defined, ...chaiseURItoErmrestURI would have caught that error
                var catalogId = (context.catalogID ? context.catalogID : chaiseConfig.defaultCatalog);
                if (chaiseConfig.defaultTables) {
                    var tableConfig = chaiseConfig.defaultTables[catalogId];
                }
                var schemaTableName = ( (context.schemaName && context.tableName) ? context.schemaName + ':' + context.tableName : tableConfig.schema + ':' + tableConfig.table );
                var modifiedHash = '#' + catalogId + '/' + schemaTableName;

                var message = "No filter was defined. Cannot find a record without a filter.";
                var redirectLink = $window.location.origin + modifiedPath + modifiedHash;
                ErrorService.errorPopup(message, '', "search page", redirectLink);
            }
        // no catalog or schema:table defined, no defaults either, redirect to home page
        } catch (exception) {
            ErrorService.errorPopup(exception.message, exception.code, "home page");
        }

        /**
         * it saves the location in $rootScope.location.
         * When address bar is changed, this code compares the address bar location
         * with the last save recordset location. If it's the same, the change of url was
         * done internally, do not refresh page. If not, the change was done manually
         * outside recordset, refresh page.
         *
         */
        UriUtils.setLocationChangeHandling();
    }]);
})();
