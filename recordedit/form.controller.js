(function() {
    'use strict';

    angular.module('chaise.recordEdit')

    .controller('FormController', ['AlertsService', 'UriUtils', 'recordEditModel', '$window', '$log', '$rootScope', function FormController(AlertsService, UriUtils, recordEditModel, $window, $log, $rootScope) {
        var vm = this;
        var context = $rootScope.context;
        vm.recordEditModel = recordEditModel;
        vm.editMode = context.filter || false;
        vm.booleanValues = context.booleanValues;
        vm.getAutoGenValue = getAutoGenValue;

        vm.alerts = AlertsService.alerts;
        vm.closeAlert = AlertsService.deleteAlert;

        vm.submit = submit;
        vm.redirectAfterSubmission = redirectAfterSubmission;
        vm.showSubmissionError = showSubmissionError;
        vm.copyFormRow = copyFormRow;
        vm.removeFormRow = removeFormRow;

        vm.getDefaults = getDefaults;

        vm.inputType = null;
        vm.int2min = -32768;
        vm.int2max = 32767;
        vm.int4min = -2147483648;
        vm.int4max = 2147483647;
        vm.int8min = -9223372036854775808
        vm.int8max = 9223372036854775807;

        vm.columnToDisplayType = columnToDisplayType;
        vm.isAutoGen = isAutoGen;
        vm.isForeignKey = isForeignKey;
        vm.matchType = matchType;
        vm.isHiddenColumn = isHiddenColumn;


        // Takes a page object and uses the uri generated for the reference to construct a chaise uri
        function redirectAfterSubmission(page) {
            var rowset = vm.recordEditModel.rows,
                redirectUrl = "../";

            // Created a single entity or Updated one
            if (rowset.length == 1) {
                AlertsService.addAlert({type: 'success', message: 'Your data has been submitted. Redirecting you now to the record...'});

                redirectUrl += "record/#" + UriUtils.fixedEncodeURIComponent(page.reference.location.catalog) + '/' + page.reference.location.compactPath;
            } else {
                AlertsService.addAlert({type: 'success', message: 'Your data has been submitted. Redirecting you now to the record...'});

                redirectUrl += "recordset/#" + UriUtils.fixedEncodeURIComponent(page.reference.location.catalog) + '/' + page.reference.location.compactPath;
            }

            // Redirect to record or recordset app..
            $window.location = redirectUrl;
        }

        function showSubmissionError(response) {
            AlertsService.addAlert({type: 'error', message: response.message});
            $log.info(response);
        }


        /*
         * Allows to tranform some form values depending on their types
         * Boolean: If the value is empty ('') then set it as null
         * Date/Timestamptz: If the value is empty ('') then set it as null
         */
        function transformRowValues(row, model) {
            for (var k in row) {
                try {
                    var column = model.table.columns.get(k);
                    switch (column.type.name) {
                        default: if (row[k] === '') row[k] = null;
                                 break;
                    }
                } catch(e) {}
            }
        }

        function submit() {
            var form = vm.formContainer;
            var model = vm.recordEditModel;
            form.$setUntouched();
            form.$setPristine();

            if (form.$invalid) {
                AlertsService.addAlert({type: 'error', message: 'Sorry, the data could not be submitted because there are errors on the form. Please check all fields and try again.'});
                form.$setSubmitted();
                return;
            }

            model.rows.forEach(function(row) {
                transformRowValues(row, model);
            });

            if (vm.editMode) {
                // model.table.entity.put(model.rows).then(function success(entities) {
                $rootScope.reference.update(model.rows).then(function success(entities) {
                    vm.redirectAfterSubmission(entities);
                }, function error(response) {
                    vm.showSubmissionError(response);
                });
            } else {
                $rootScope.reference.create(model.rows).then(function success(page) {
                    vm.redirectAfterSubmission(page);
                }, function error(response) {
                    vm.showSubmissionError(response);
                });
            }
        }

        function copyFormRow() {
            // Check if the prototype row to copy has any invalid values. If it
            // does, display an error. Otherwise, copy the row.
            var index = vm.recordEditModel.rows.length - 1;
            var protoRowValidityStates = vm.formContainer.row[index];
            var validRow = true;
            angular.forEach(protoRowValidityStates, function(value, key) {
                if (value.$dirty && value.$invalid) {
                    AlertsService.addAlert({type: 'error', message: "Sorry, we can't copy this record because it has invalid values in it. Please check its fields and try again."});
                    validRow = false;
                }
            });
            if (validRow) {
                var rowset = vm.recordEditModel.rows;
                var protoRow = rowset[index];
                var row = angular.copy(protoRow);

                // transform row values to avoid parsing issues with null values
                transformRowValues(row, vm.recordEditModel);

                rowset.push(row);

            }
        }

        function removeFormRow(index) {
            vm.recordEditModel.rows.splice(index, 1);
        }

        function getDefaults() {
            var defaults = [];

            try {
                var columns = vm.recordEditModel.table.columns.all();
                var numColumns = columns.length;
                for (var i = 0; i < numColumns; i++) {
                    var columnName = columns[i].name;
                    if (vm.isAutoGen(columnName) || vm.isHiddenColumn(columns[i])) {
                        defaults.push(columnName);
                    }
                }
            } catch (exception) { // catches table.columns.all()
                // Should not error, if none it returns an empty array
            } finally {
                return defaults;
            }
        }

        function getKeyColumns() {
            var keys = [];
            try {
                var _keys = vm.recordEditModel.table.keys.all();
                var numKeys = _keys.length;
                for (var i = 0; i < numKeys; i++) {
                    var columns = _keys[i].colset.columns;
                    var numColumns = columns.length;
                    for (var c = 0; c < numColumns; c++) {
                        keys.push(columns[c]);
                    }
                }
            } catch (exception) { // catches table.keys.all()
                // Should not error, if none it returns an empty array
            } finally {
                return keys;
            }
        }

        function columnToDisplayType(column) {
            var name = column.name;
            var type = column.type.name;
            var displayType;
            if (vm.isAutoGen(name)) {
                displayType = 'autogen';
            } else if (vm.isForeignKey(name)) {
                displayType = 'dropdown';
            } else {
                switch (type) {
                    case 'timestamptz':
                    case 'date':
                        displayType = 'date';
                        break;
                    case 'float4':
                    case 'float8':
                    case 'numeric':
                        displayType = 'number';
                        break;
                    case 'int2':
                        displayType = 'integer2';
                        break;
                    case 'int4':
                        displayType = 'integer4';
                        break;
                    case 'int8':
                        displayType = 'integer8';
                        break;
                    case 'boolean':
                        displayType = 'boolean';
                        break;
                    case 'markdown':
                    case 'longtext':
                        displayType = 'longtext';
                        break;
                    case 'shorttext':
                    default:
                        displayType = 'text';
                        break;
                }
            }
            return displayType;
        }

        // Returns true if a column's fields should be automatically generated
        // In this case, columns of type serial* == auto-generated
        function isAutoGen(name) {
            try {
                return ($rootScope.reference._table.columns.get(name).type.name.indexOf('serial') === 0);
            } catch (exception) {
                // handle exception
                $log.info(exception);
            }
        }

        function isForeignKey(columnName) {
            // Columns with FK refs and their FK values are stored in the domainValues
            // obj with the column name as keys and FK values as values. For now,
            // we can determine whether a column is a FK by checking whether domainValues
            // has a key of that column's name.
            return vm.recordEditModel.domainValues.hasOwnProperty(columnName);
        }

        // Returns true if a column type is found in the given array of types
        function matchType(columnType, types) {
            if (types.indexOf(columnType) !== -1) {
                return true;
            }
            return false;
        }

        // Returns true if a column has a 2015:hidden annotation or a 2016:ignore
        // (with entry context) annotation.
        function isHiddenColumn(column) {
            var ignore, ignoreCol, hidden;
            var ignoreAnnotation = 'tag:isrd.isi.edu,2016:ignore';

            try {
                ignore = column.annotations.contains(ignoreAnnotation);
                if (ignore) {
                    ignoreCol = column.annotations.get(ignoreAnnotation); // still needs to be caught in case something gets out of sync
                }
                hidden = column.annotations.contains('tag:misd.isi.edu,2015:hidden');

            } finally {
               if ((ignore && (ignoreCol.content.length === 0 || ignoreCol.content === null || ignoreCol.content.indexOf('entry') !== -1)) || hidden) {
                   return true;
               }
               return false;
            }

        }

        // If in edit mode, autogen fields show the value of the existing record
        // Otherwise, show a static string in entry mode.
        function getAutoGenValue(value) {
            if (vm.editMode) {
                return value;
            }
            return 'To be set by system';
        }
    }]);
})();
