(function() {
    'use strict';

    angular.module('chaise.record', [
        'chaise.errors',
        'chaise.modal',
        'chaise.navbar',
        'chaise.recordDisplay',
        'chaise.utils',
        'ERMrest',
        'ui.bootstrap'
    ])

    // Config is no
    .run(['UriUtils', 'ErrorService', '$http', '$q', '$log', '$rootScope', '$window', function runApp(UriUtils, ErrorService, $http, $q, $log, $rootScope, $window) {

        ERMrest.configure($http, $q);
        UriUtils.setOrigin();
        var ermrestUri = UriUtils.chaiseURItoErmrestURI($window.location);

        ERMrest.resolve(ermrestUri, {cid: 'record-two'}).then(function getReference(reference) {
            $log.info("Reference:", reference);
            $rootScope.reference = reference;

            return reference.read(1);
        }).then(function getPage(page) {
            var tuple = page.tuples[0];

            $rootScope.recordValues = tuple.values;
            $rootScope.columns = $rootScope.reference.columns;

        }, function error(response) {
            $log.warn(response);
            throw response;
        }).catch(function genericCatch(exception) {
            ErrorService.catchAll(exception);
        });
    }]);
})();
