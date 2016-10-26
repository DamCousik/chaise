(function () {
    'use strict';

    angular.module('chaise.modal', [])

    .controller('ConfirmDeleteController', ['$uibModalInstance', function ConfirmDeleteController($uibModalInstance) {
        var vm = this;
        vm.ok = ok;
        vm.cancel = cancel;

        function ok() {
            $uibModalInstance.close();
        }

        function cancel() {
            $uibModalInstance.dismiss('cancel');
        }
    }])
    .controller('ErrorDialogController', ['$uibModalInstance', 'params', function ErrorDeleteController($uibModalInstance, params) {
        var vm = this;
        vm.params = params;
        vm.ok = ok;

        function ok() {
            $uibModalInstance.close();
        }
    }])
    .controller('SearchPopupController', ['$uibModalInstance', 'params', function SearchPopupController($uibModalInstance, params) {
        var vm = this,
            reference = params.page.reference;

        vm.params = params;
        vm.ok = ok;
        vm.cancel = cancel;

        console.log("Params: ", params);

        vm.tableModel = {
            hasLoaded:          true,
            reference:          reference,
            tableDisplayName:   reference.displayname,
            columns:            reference.columns,
            sortBy:             null,
            sortOrder:          null,
            page:               params.page,
            pageLimit:          25,
            rowValues:          [],
            search:             null
        }

        function ok() {
            $uibModalInstance.close();
        }

        function cancel() {
            $uibModalInstance.dismiss("cancel");
        }
    }]);
})();
