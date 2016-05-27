(function() {
    'use strict';

    angular.module('chaise.dataEntry')

    .controller('FormController', ['dataEntryModel', 'context', '$window', function FormController(dataEntryModel, context, $window) {
        var vm = this;
        vm.dataEntryModel = dataEntryModel;
        vm.editMode = context.filters || false;
        vm.booleanValues = context.booleanValues;

        vm.alert = null;
        vm.closeAlert = closeAlert;

        vm.submit = submit;
        vm.redirectAfterSubmission = redirectAfterSubmission;
        vm.showSubmissionError = showSubmissionError;
        vm.addFormRow = addFormRow;
        vm.numRowsToAdd = 1;
        var MAX_ROWS_TO_ADD = context.maxRowsToAdd; // add too many rows and browser could hang

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

        function redirectAfterSubmission(entities) {
            var form = vm.formContainer;
            var model = vm.dataEntryModel;
            var rowset = model.rows;
            var redirectUrl = $window.location.origin;

            vm.alert = {type: 'success', message: 'Your data has been submitted. Redirecting you now to the record...'};
            form.$setUntouched();
            form.$setPristine();

            if (rowset.length === 1) {
                // example: https://dev.isrd.isi.edu/chaise/record/#1/legacy:dataset/id=5564
                // TODO: Postpone using datapath api to build redirect url until
                // datapath is redeveloped to only use aliases when necessary
                redirectUrl += '/chaise/record/#' + context.catalogID + '/' + encodeURIComponent(context.schemaName) + ':' + encodeURIComponent(context.tableName);
            }
            // TODO: Implement redirect to recordset app when data entry supports multi-row insertion
            // else if (rowset.length > 1) {
            //     // example: https://synapse-dev.isrd.isi.edu/chaise/recordset/#1/Zebrafish:Subject@sort(Birth%20Date::desc::)
            //     redirectUrl += '/chaise/recordset/#' + context.catalogID + '/' + context.schemaName + ':' + context.tableName;
            // } else {
            // // Rowset count is either 0 or negative so there's nothing to submit..
            // // alert('Nothing to submit'); ???
            // }

            // Find the shortest "primary key" for use in redirect url
            var keys = model.table.keys.all().sort(function(a, b) {
                return a.colset.length() - b.colset.length();
            });
            var shortestKey = keys[0].colset.columns;

            // Build the redirect url with key cols and entity's values
            for (var c = 0, len = shortestKey.length; c < len; c++) {
                var colName = shortestKey[c].name;
                redirectUrl += "/" + encodeURIComponent(colName) + '=' + encodeURIComponent(entities[0][colName]);
            }

            // Redirect to record or recordset app..
            window.location.replace(redirectUrl);
        }

        function showSubmissionError(response) {
            vm.alert = {type: 'error', message: response.data};
            console.log(response);
        }

        function submit() {
            var form = vm.formContainer;
            var model = vm.dataEntryModel;
            form.$setUntouched();
            form.$setPristine();

            if (form.$invalid) {
                vm.alert = {type: 'error', message: 'Sorry, the data could not be submitted because there are errors on the form. Please check all fields and try again.'};
                form.$setSubmitted();
                return;
            }

            if (vm.editMode) {
                model.table.entity.put(model.rows).then(function success(entities) {
                    // Wrapping redirectAfterSubmission callback fn in the success callback fn
                    // due to inability to pass the success/error responses directly
                    // into redirectAfterSubmission fn. (ReferenceError)
                    vm.redirectAfterSubmission(entities);
                }, function error(response) {
                    vm.showSubmissionError(response);
                });
            } else {
                model.table.entity.post(model.rows, vm.getDefaults()).then(function success(entities) {
                    vm.redirectAfterSubmission(entities);
                }, function error(response) {
                    vm.showSubmissionError(response);
                });
            }
        }

        function addFormRow(numRows) {
            numRows = parseInt(numRows, 10);
            if (Number.isNaN(numRows) || numRows < 0 || numRows > MAX_ROWS_TO_ADD) {
                return vm.alert = {type: 'error', message: "Sorry, you can only add 1 to " + MAX_ROWS_TO_ADD + " rows at a time. Please enter a whole number from 1 to " + MAX_ROWS_TO_ADD + "."};
            } else if (numRows === 0) {
                return;
            }
            var rowset = vm.dataEntryModel.rows;
            var prototypeRow = rowset[rowset.length-1];
            for (var i = 0; i < numRows; i++) {
                var row = angular.copy(prototypeRow);
                rowset.push(row);
            }
        }

        function getDefaults() {
            var defaults = [];
            var columns =  vm.dataEntryModel.table.columns.all();
            var numColumns = columns.length;
            for (var i = 0; i < numColumns; i++) {
                var columnName = columns[i].name;
                if (vm.isAutoGen(columnName) || vm.isHiddenColumn(columns[i])) {
                    defaults.push(columnName);
                }
            }
            return defaults;
        }

        function getKeyColumns() {
            var keys = [];
            var _keys = vm.dataEntryModel.table.keys.all();
            var numKeys = _keys.length;
            for (var i = 0; i < numKeys; i++) {
                var columns = _keys[i].colset.columns;
                var numColumns = columns.length;
                for (var c = 0; c < numColumns; c++) {
                    keys.push(columns[c]);
                }
            }
            return keys;
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
            return (vm.dataEntryModel.table.columns.get(name).type.name.indexOf('serial') === 0);
        }

        function isForeignKey(columnName) {
            // Columns with FK refs and their FK values are stored in the domainValues
            // obj with the column name as keys and FK values as values. For now,
            // we can determine whether a column is a FK by checking whether domainValues
            // has a key of that column's name.
            return vm.dataEntryModel.domainValues.hasOwnProperty(columnName);
        }

        // Returns true if a column type is found in the given array of types
        function matchType(columnType, types) {
            if (types.indexOf(columnType) !== -1) {
                return true;
            }
            return false;
        }

        function closeAlert() {
            vm.alert = null;
        }

        // Returns true if a column has a 2015:hidden annotation or a 2016:ignore
        // (with entry context) annotation.
        function isHiddenColumn(column) {
            var ignore = column.annotations.get('tag:isrd.isi.edu,2016:ignore');
            var hidden = column.annotations.get('tag:misd.isi.edu,2015:hidden');
            if ((ignore && (ignore.content.length === 0 || ignore.content === null || ignore.content.indexOf('entry') !== -1)) || hidden) {
                return true;
            }
            return false;
        }
    }]);
})();
