(function() {
    'use strict';

    angular.module('chaise.dataEntry', [
        'ERMrest',
        'ngSanitize',
        'chaise.utils',
        'chaise.errors',
        'chaise.alerts',
        'chaise.filters',
        'chaise.interceptors',
        'chaise.validators',
        'ui.select',
        'rzModule',
        '720kb.datepicker',
        'ngMessages'
    ])

    // Configure the context info from the URI
    .config(['context', '$httpProvider', function configureContext(context, $httpProvider) {
        $httpProvider.interceptors.push('Interceptors');

        if (chaiseConfig.headTitle !== undefined) {
            document.getElementsByTagName('head')[0].getElementsByTagName('title')[0].innerHTML = chaiseConfig.headTitle;
        }

        // Parse the url
        context.serviceURL = window.location.origin + '/ermrest';
        if (chaiseConfig.ermrestLocation) {
            context.serviceURL = chaiseConfig.ermrestLocation + '/ermrest';
        }

        var hash = window.location.hash;

        if (hash === undefined || hash == '' || hash.length == 1) {
            return;
        }

        var parts = hash.substring(1).split('/');
        context.catalogID = parts[0];
        if (parts[1]) {
            var params = parts[1].split(':');
            if (params.length > 1) {
                context.schemaName = decodeURIComponent(params[0]);
                context.tableName = decodeURIComponent(params[1]);
            } else {
                context.tableName = decodeURIComponent(params[0]);
            }
        }

        // If there are filters appended to the URL, add them to context.js
        if (parts[2]) {
            context.filters = {};
            var filters = parts[2].split('&');
            for (var i = 0, len = filters.length; i < len; i++) {
                var filter = filters[i].split('=');
                if (filter[0] && filter[1]) {
                    context.filters[decodeURIComponent(filter[0])] = decodeURIComponent(filter[1]);
                }
            }
        }
        console.log('Context:',context);
    }])

    .run(['context', 'ermrestServerFactory', 'dataEntryModel', 'AlertsService', '$http', function runApp(context, ermrestServerFactory, dataEntryModel, AlertsService, $http) {
        var server = context.server = ermrestServerFactory.getServer(context.serviceURL);
        server.catalogs.get(context.catalogID).then(function success(catalog) {
            var schema = catalog.schemas.get(context.schemaName);
            if (schema) {
                var table = schema.tables.get(context.tableName);
                if (table) {
                    console.log('Table:', table);
                    dataEntryModel.table = table;
                    dataEntryModel.cols = table.columns.all();

                    var foreignKeys = table.foreignKeys.all();
                    angular.forEach(foreignKeys, function(fkey) {
                        // simple implies one column
                        if (fkey.simple) {
                            var ftable = fkey.key.table;
                            var keyColumn = fkey.key.colset.columns[0];

                            /* FIRST USE CASE: covered by default; display = key column */

                            var pattern = "{" + keyColumn.name + "}";
                            var displayColumns = [keyColumn];

                            /* SECOND USE CASE: conditional if the table is tagged as a vocabulary */

                            try {
                                try {
                                    var vocabAnnotation = ftable.annotations.get("tag:misd.isi.edu,2015:vocabulary");
                                } catch (error) {
                                    // no vocab annotation, do nothing
                                }

                                try {
                                    var displayAnnotation = ftable.annotations.get("tag:misd.isi.edu,2015:display");
                                } catch (error) {
                                    // no display annotation, do nothing
                                }

                                if (vocabAnnotation) {
                                    if (vocabAnnotation.content.term) {
                                        var termColumn = ftable.columns.get(vocabAnnotation.content.term);
                                        displayColumns.push(termColumn); // the array is now [keyColumn, termColumn]
                                    }
                                    // vocabulary term is undefined
                                    else {
                                        var ftableColumns = ftable.columns.all();
                                        for (var i = 0, length = ftableColumns.length; i < length; i++) {
                                            var uppColumnName = ftableColumns[i].name.toUpperCase();
                                            if (uppColumnName == 'TERM' || uppColumnName == 'NAME') {
                                                displayColumns.push(ftableColumns[i]);
                                                break;
                                            }
                                        } /* term undefined */
                                    }
                                    if (displayColumns.length > 1) {
                                        pattern = "{" + displayColumns[1].name + "}";
                                    }
                                    /* END USE CASE 2 */
                                }
                                /* THIRD USE CASE: not a vocabulary but it has a “display : row name” annotation */
                                else if (displayAnnotation) {
                                    if (displayAnnotation.content.row_name) {
                                        // TODO
                                        // var array_of_col_names = REGEX THE array of column_name strings from “ … `{` column_name `}` …” patterns
                                        // angular.forEach(array_of_col_names, function(column_name) {
                                        //     displayColumns.push(table.columns.get(column_name));
                                        // });
                                        //
                                        // pattern = displayAnnotation.row_name;
                                    }
                                }
                            } finally {
                                try {
                                    (function(fkey) {
                                        ftable.entity.get(null, null, displayColumns).then(function success(rowset){
                                            var domainValues = dataEntryModel.domainValues[fkey.colset.columns[0].name] = [];
                                            var displayColumnName = (displayColumns[1] ? displayColumns[1].name : keyColumn.name);

                                            angular.forEach(rowset.data, function(column) {
                                                 domainValues.push( {key: column[keyColumn.name], display: column[displayColumnName]/*Util.patternExpansion( pattern, column.data )*/} );
                                            });
                                        });
                                    })(fkey);
                                } catch (error) {
                                    // handle error
                                }
                            }
                        }
                    });

                    // If there are filters, populate the model with existing records' column values
                    if (context.filters) {
                        var path = new ERMrest.DataPath(table);
                        var filters = [];
                        angular.forEach(context.filters, function(value, key) {
                            var column = path.context.columns.get(key);
                            filters.push(new ERMrest.BinaryPredicate(column, ERMrest.OPERATOR.EQUAL, value));
                        });
                        // TODO: Store filters in URI form in model to use later on form submission
                        var filterString = new ERMrest.Conjunction(filters);
                        // dataEntryModel.filterUri = filterString.toUri();

                        var path = path.filter(filterString);
                        path.entity.get().then(function success(entity) {
                            if (entity.length === 0) {
                                AlertsService.addAlert({type: 'error', message: 'Sorry, the requested record was not found. Please check the URL and refresh the page.' });
                                console.log('The requested record in schema ' + context.schemaName + ', table ' + context.tableName + ' with the following attributes: ' + context.filters + ' was not found.');
                            }

                            angular.forEach(entity[0], function(value, colName) {
                                var pathColumnType = path.context.columns.get(colName).column.type.name;
                                if (pathColumnType == 'date' || pathColumnType == 'timestamptz') {
                                    // Must transform the value into a Date so that
                                    // Angular won't complain when putting the value
                                    // in an input of type "date" in the view
                                    value = new Date(value);
                                }
                                dataEntryModel.rows[dataEntryModel.rows.length - 1][colName] = value;
                            });
                        });
                    }
                    console.log('Model:',dataEntryModel);
                } else {
                    alert('Sorry, the requested table "' + context.tableName + '" was not found. Please check the URL and refresh the page.');
                    console.log('Table not found.');
                }
            } else {
                alert('Sorry, the requested schema "' + context.schemaName + '" was not found. Please check the URL and refresh the page');
                console.log('Schema not found.');
            }
        }, function error(response) {
            if (response.status == 401) {
                getGoauth(UriUtils.fixedEncodeURIComponent(window.location.href));
                console.log(response);
            }
        });

        function getGoauth(referrer) {
            var url = '/ermrest/authn/preauth?referrer=' + referrer;
            $http.get(url).then(function success(response) {
                window.open(response.data.redirect_url, '_self');
            }, function error(response) {
                console.log('Error: ', error);
            });
        }
    }]);

    // Refresh the page when the window's hash changes. Needed because Angular
    // normally doesn't refresh page when hash changes.
    window.onhashchange = function() {
        if (window.location.hash != '#undefined') {
            location.reload();
        } else {
            history.replaceState("", document.title, window.location.pathname);
            location.reload();
        }
        function goBack() {
            window.location.hash = window.location.lasthash[window.location.lasthash.length-1];
            window.location.lasthash.pop();
        }
    }
})();
