(function() {
    'use strict';
    angular.module('chaise.recordcreate', ['chaise.errors']).factory("recordCreate", ['$rootScope', '$cookies', '$log', '$window', '$uibModal', 'AlertsService', 'DataUtils', 'MathUtils', 'UriUtils', function($rootScope, $cookies, $log, $window, $uibModal, AlertsService, DataUtils, MathUtils, UriUtils) {
        
        var viewModel = {};
        var GV_recordEditModel = {},
            completed = {};
        var addRecordRequests = {}; // <generated unique id : reference of related table>
        var editRecordRequests = {}; // generated id: {schemaName, tableName}
        var updated = {};


        function uploadFiles(submissionRowsCopy, isUpdate, onSuccess) {

            // If url is valid
            // if (areFilesValid(submissionRowsCopy)) {
            if (1) {
                $uibModal.open({
                    templateUrl: "../common/templates/uploadProgress.modal.html",
                    controller: "UploadModalDialogController",
                    controllerAs: "ctrl",
                    size: "md",
                    backdrop: 'static',
                    keyboard: false,
                    resolve: {
                        params: {
                            reference: $rootScope.reference,
                            rows: submissionRowsCopy
                        }
                    }
                }).result.then(onSuccess, function(exception) {
                    viewModel.readyToSubmit = false;
                    viewModel.submissionButtonDisabled = false;

                    if (exception) AlertsService.addAlert(exception.message, 'error');
                });
            } else {
                viewModel.readyToSubmit = false;
                viewModel.submissionButtonDisabled = false;
            }
        }

        function addRecords(isUpdate, derivedref, recordEditModel, isModalUpdate, onSuccessFunction) {
            var model = isModalUpdate ? GV_recordEditModel : recordEditModel;
            var form = viewModel.formContainer;

            // this will include updated and previous raw values.
            var submissionRowsCopy = [];

            model.submissionRows.forEach(function(row) {
                submissionRowsCopy.push(Object.assign({}, row));
            });

            /**
             * Add raw values that are not visible to submissionRowsCopy:
             *
             * submissionRowsCopy is the datastructure that will be used for creating
             * the upload url. It must have all the visible and invisible data.
             * The following makes sure that submissionRowsCopy has all the underlying data
             */
            if (isUpdate) {
                for (var i = 0; i < submissionRowsCopy.length; i++) {
                    var newData = submissionRowsCopy[i];
                    var oldData = $rootScope.tuples[i].data;

                    // make sure submissionRowsCopy has all the data
                    for (var key in oldData) {
                        if (key in newData) continue;
                        newData[key] = oldData[key];
                    }
                }
            }

            //call uploadFiles which will upload files and callback on success
            uploadFiles(submissionRowsCopy, isUpdate, function() {

                var fn = "create",
                    args = [submissionRowsCopy];
                var fnScope = isModalUpdate ? derivedref.unfilteredReference.contextualize.entryCreate : $rootScope.reference.unfilteredReference.contextualize.entryCreate;

                if (isUpdate) {

                    /**
                     * After uploading files, the returned submissionRowsCopy contains
                     * new file data. This includes filename, filebyte, and md5.
                     * The following makes sure that all the data are updated.
                     * That's why this for loop must be after uploading files and not before.
                     * And we cannot just pass submissionRowsCopy to update function, because
                     * update function only accepts array of tuples (and not just key-value pair).
                     */
                    for (var i = 0; i < submissionRowsCopy.length; i++) {
                        var row = submissionRowsCopy[i];
                        var data = $rootScope.tuples[i].data;
                        // assign each value from the form to the data object on tuple
                        for (var key in row) {
                            data[key] = (row[key] === '' ? null : row[key]);
                        }
                    }

                    // submit $rootScope.tuples because we are changing and
                    // comparing data from the old data set for the tuple with the updated data set from the UI
                    fn = "update", fnScope = $rootScope.reference, args = [$rootScope.tuples];
                }

                fnScope[fn].apply(fnScope, args).then(function success(result) {

                    var page = result.successful;
                    var failedPage = result.failed;

                    // the returned reference is contextualized and we don't need to contextualize it again
                    var resultsReference = page.reference;
                    if (isUpdate) {
                        for (var i = 0; i < submissionRowsCopy.length; i++) {
                            var row = submissionRowsCopy[i];
                            var data = $rootScope.tuples[i].data;
                            // assign each value from the form to the data object on tuple
                            for (var key in row) {
                                data[key] = (row[key] === '' ? null : row[key]);
                            }
                        }

                        // check if there is a window that opened the current one
                        // make sure the update function is defined for that window
                        // verify whether we still have a valid vaue to call that function with
                        if (window.opener && window.opener.updated && context.queryParams.invalidate) {
                            window.opener.updated(context.queryParams.invalidate);
                        }
                    } else {
                        if (!isModalUpdate) {
                            $cookies.remove($rootScope.context.queryParams.prefill);


                            // add cookie indicating record added
                            if ($rootScope.context.queryParams.invalidate) {
                                $cookies.put($rootScope.context.queryParams.invalidate, submissionRowsCopy.length, {
                                    expires: new Date(Date.now() + (60 * 60 * 24 * 1000))
                                });
                            }
                        }
                    }
                    viewModel.readyToSubmit = false; // form data has already been submitted to ERMrest

                    if (!isModalUpdate) {
                        onSuccessFunction(page);
                    } else {
                        onSuccessFunction(model, page, result);

                    }
                }).catch(function(exception) {
                    viewModel.submissionButtonDisabled = false;
                    if (exception instanceof ERMrest.NoDataChangedError) {
                        AlertsService.addAlert(exception.message, 'warning');
                    } else {
                        AlertsService.addAlert(exception.message, 'error');
                    }
                });

            });

        }

        /**
         * Will add the cookie and also populate the values for the main table.
         */
        function updateViewModel(cookie) {
            var recordEditModel = {
                table: {},
                rows: [{}], // rows of data in the form, not the table from ERMrest
                oldRows: [{}], // Keep a copy of the initial rows data so that we can see if user has made any changes later
                submissionRows: [{}] // rows of data
            };
            // Update view model
            recordEditModel.rows[recordEditModel.rows.length - 1][cookie.constraintName] = cookie.rowname.value;

            // Update submission model
            var columnNames = Object.keys(cookie.keys);
            columnNames.forEach(function(colName) {
                var colValue = cookie.keys[colName];
                recordEditModel.submissionRows[recordEditModel.submissionRows.length - 1][colName] = colValue;
            });
            GV_recordEditModel = recordEditModel;
        }
        var addPopup = function(ref, rowIndex, derivedref, isModalUpdate) {
            var column = ref;

            var originalTuple, nullArr = [],
                editOrCopy = true,
                params = {};

            if (viewModel.editMode) {
                originalTuple = $rootScope.tuples[rowIndex];
            } else {
                originalTuple = null;
                editOrCopy = false;
            }
            var ref1 = ref.unfilteredReference.contextualize.compact;
            params.reference = ref1.contextualize.compactSelect;
            params.reference.session = $rootScope.session;
            params.context = "compact/select";
            params.selectMode = isModalUpdate ? "multi-select" : "single-select";

            var modalInstance = $uibModal.open({
                animation: false,
                controller: "SearchPopupController",
                controllerAs: "ctrl",
                resolve: {
                    params: params
                },
                size: "lg",
                templateUrl: "../common/templates/searchPopup.modal.html"
            });

            modalInstance.result.then(function dataSelected(tuples) {
                // tuple - returned from action in modal (should be the foreign key value in the recrodedit reference)
                // set data in view model (model.rows) and submission model (model.submissionRows)
                // we assume that the data for the main table has been populated before
                var mapping = derivedref._secondFKR.mapping;

                for (i = 0; i < tuples.length; i++) {
                    derivedref._secondFKR.key.colset.columns.forEach(function(col) {
                        if (angular.isUndefined(GV_recordEditModel.submissionRows[i])) {
                            var obj = {};
                            angular.copy(GV_recordEditModel.submissionRows[i - 1], obj);
                            GV_recordEditModel.submissionRows.push(obj);
                        }
                        GV_recordEditModel.submissionRows[i][mapping.getFromColumn(col).name] = tuples[i].data[col.name];
                    });

                }
                if (isModalUpdate)
                    addRecords(viewModel.editMode, derivedref, nullArr, isModalUpdate, viewModel.onSuccess);

            });
        }
        var addRelatedRecord = function(ref, rowIndex, modelObject, isModal) {

            updateViewModel(modelObject);
            var derivedref = isModal ? ref.derivedAssociationReference : null;
            addPopup(ref, 0, derivedref, isModal);
        };

        function addRelatedRecordFact(isModalUpdate, ref, rowIdx, modelObject, editMode, formContainer, readyToSubmit, recordsetLink, resultsetModel, resultset, submissionButtonDisabled, omittedResultsetModel, onSuccess) {
            viewModel.onSuccess = onSuccess;
            viewModel.editMode = editMode;
            viewModel.formContainer = formContainer;
            viewModel.readyToSubmit = readyToSubmit;
            viewModel.recordsetLink = recordsetLink;
            viewModel.resultsetModel = resultsetModel;
            viewModel.resultset = resultset;
            viewModel.submissionButtonDisabled = submissionButtonDisabled;
            viewModel.omittedResultsetModel = omittedResultsetModel;
            addRelatedRecord(ref, rowIdx, modelObject, isModalUpdate);
        }

        return {
            addRelatedRecordFact: addRelatedRecordFact,
            addRecords: addRecords
        }
    }])
})();
