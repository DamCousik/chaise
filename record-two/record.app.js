(function() {
    'use strict';

    angular.module('chaise.record', [
        'ngSanitize',
        'chaise.errors',
        'chaise.modal',
        'chaise.navbar',
        'chaise.record.display',
        'chaise.record.table',
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
            pageLimit: 5,
            recordStart: 1,
            recordEnd: 5
        };
    }])

    .run(['ERMrest', 'UriUtils', 'ErrorService', 'pageInfo', '$log', '$rootScope', '$window', function runApp(ERMrest, UriUtils, ErrorService, pageInfo, $log, $rootScope, $window) {
        $rootScope.pageInfo = pageInfo;
        UriUtils.setOrigin();

        var context = $rootScope.context = UriUtils.parseURLFragment($window.location);
        if (!context) {
            var context = $rootScope.context = {};
        }

        try {
            var ermrestUri = UriUtils.chaiseURItoErmrestURI($window.location);

            // The context object won't change unless the app is reloaded
            context.appName = 'record-two';

            ERMrest.resolve(ermrestUri, {cid: context.appName}).then(function getReference(reference) {
                $log.info("Reference:", reference);
                $rootScope.reference = reference.contextualize.record;

                $rootScope.relatedReferences = reference.related;

                // There should only ever be one entity related to this reference
                return $rootScope.reference.read(1);
            }).then(function getPage(page) {
                var tuple = page.tuples[0];

                // Used directly in the record-display directive
                $rootScope.recordDisplayname = tuple.displayname;
                $rootScope.recordValues = tuple.values;
                $rootScope.columns = $rootScope.reference.columns;

                $rootScope.dataArray = [];

                for (var i = 0; i < $rootScope.relatedReferences.length; i++) {
                    // We want to limit the number of values shown by default
                    // Maybe have a chaise config option
                    (function(i) {
                        $rootScope.relatedReferences[i].read(5).then(function (page) {
                            $rootScope.dataArray[i] = page.tuples;
                        });
                    })(i);
                };

            }, function error(response) {
                $log.warn(response);
                throw response;
            }).catch(function genericCatch(exception) {
                ErrorService.catchAll(exception);
            });
        } catch (exception) {
            ErrorService.errorPopup(exception);
        }
    }]);
})();
