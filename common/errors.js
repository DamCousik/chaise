(function() {
    'use strict';

    angular.module('chaise.errors', ['chaise.alerts', 'chaise.authen', 'chaise.modal', 'chaise.utils'])

    .constant('errorNames', {
        unauthorized: "Unauthorized",
        forbidden: "Forbidden",
        notFound: "Not Found"
    })

    // Factory for each error type
    .factory('ErrorService', ['AlertsService', 'errorNames', 'Session', 'messageMap', '$log', '$rootScope', '$uibModal', '$window', function ErrorService(AlertsService, errorNames, Session, messageMap, $log, $rootScope, $uibModal, $window) {

        function errorPopup(message, errorCode, pageName, redirectLink) {
            var providedLink = true;
            // if it's not defined, redirect to the dataBrowser config setting (if set) or the landing page
            if (!redirectLink) {
                providedLink = false;
                var redirectLink = (chaiseConfig.dataBrowser ? chaiseConfig.dataBrowser : $window.location.origin);
            }

            var params = {
                message: message,
                errorCode: errorCode,
                pageName: pageName
            };

            var modalInstance = $uibModal.open({
                templateUrl: '../common/templates/errorDialog.modal.html',
                controller: 'ErrorDialogController',
                controllerAs: 'ctrl',
                backdrop: 'static',
                keyboard: false,
                resolve: {
                    params: params
                }
            });

            modalInstance.result.then(function () {
                if (errorCode == errorNames.unauthorized && !providedLink) {
                    Session.login($window.location.href);
                } else {
                    $window.location.replace(redirectLink);
                }
            });
        }

        function noRecordError(filters) {
            var noDataMessage = messageMap.noDataMessage;
            for (var k = 0; k < filters.length; k++) {
                noDataMessage += filters[k].column + filters[k].operator + filters[k].value;
                if (k != filters.length-1) {
                    noDataMessage += " or ";
                }
            }
            var error = new Error(noDataMessage);
            error.code = errorNames.notFound;

            return error;
        }

        function MalformedUriError(message) {
            this.message = message;
        }

        MalformedUriError.prototype = Object.create(Error.prototype);
        MalformedUriError.prototype.constructor = MalformedUriError;

        function InvalidInputError(message) {
            this.message = message;
        }

        InvalidInputError.prototype = Object.create(Error.prototype);
        InvalidInputError.prototype.constructor = MalformedUriError;

        // TODO: implement hierarchies of exceptions in ermrestJS and use that hierarchy to conditionally check for certain exceptions
        function catchAll(exception) {
            $log.info(exception);
            if (exception instanceof ERMrest.UnauthorizedError || exception.code == errorNames.unauthorized) {
                Session.login($window.location.href);
            } else if (exception instanceof ERMrest.PreconditionFailedError) {
                AlertsService.addAlert(messageMap.generalPreconditionFailed, 'warning');
            } else {
                AlertsService.addAlert(exception.message, 'error');
            }
        }

        return {
            errorPopup: errorPopup,
            catchAll: catchAll,
            noRecordError: noRecordError,
            MalformedUriError: MalformedUriError,
            InvalidInputError: InvalidInputError
        };
    }]);
})();
