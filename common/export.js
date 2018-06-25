(function () {
    'use strict';

    angular.module('chaise.export', [])

    .directive('export', ['$http', 'UriUtils', 'AlertsService', function ($http, UriUtils, AlertsService) {
        return {
            restrict: 'AE',
            templateUrl: '../common/templates/export.html',
            scope: {
                reference: "<",
                hasValues: "<"
            },
            link: function (scope, element, attributes) {
                scope.isLoading = false;

                scope.submit = function () {
                    scope.isLoading = true;
                    var base_url = scope.reference.location.service;
                    scope.exportOptions = {
                        host: base_url.substring(0, base_url.lastIndexOf("/")),
                        format: {},
                        formatOptions: {
                            "bag": {
                                name: scope.reference.location.tableName,
                                algs: ["md5"],
                                archiver: "zip",
                                metadata: {},
                                table_format: "csv"
                            }
                        },
                        defaultFormat: {
                            name: "CSV", type: "DIRECT", template: null
                        },
                        defaultFormats: [
                            {name: "CSV", type: "DIRECT", template: null},
                            {name: "JSON", type: "DIRECT", template: null}
                        ],
                        supportedFormats: []
                    };

                    // TODO: this function is meant to be triggered by a change of the current table context
                    updateExportFormats(scope);

                    // The actual export code - it invokes a (synchronous) web service call to either
                    // ermrest (for single table CSV or JSON export) or ioboxd (if bag or multi-file export)
                    doExport(scope);

                };

                function updateExportFormats(scope) {
                    scope.exportOptions.format = JSON.parse(JSON.stringify(scope.exportOptions.defaultFormat));
                    scope.exportOptions.supportedFormats =
                        JSON.parse(JSON.stringify(scope.exportOptions.defaultFormats));
                    var exportAnnotations = scope.reference.table.annotations.get("tag:isrd.isi.edu,2016:export");
                    var templates = (exportAnnotations !== undefined) ?
                        exportAnnotations.content["templates"] : null;
                    if (templates == null) {
                        return;
                    }
                    templates.forEach(function (template) {
                        var name = template['name'];
                        var format_name = template['format_name'] || null;
                        var format_type = template['format_type'] || "BAG";
                        if (format_name) {
                            var format = {name: format_name, type: format_type, template: template};
                            scope.exportOptions.supportedFormats.push(format);
                            // TODO: remove this hardcoded default once a proper UI selector is in place
                            if (format_type == "BAG") {
                                scope.exportOptions.format = format;
                            }
                        }
                    });
                }

                function createExportParameters(scope) {
                    var exportParameters = {};

                    var bagFormatOpts = scope.exportOptions.formatOptions["bag"];
                    if (bagFormatOpts !== undefined) {
                        var bagParameters = {};
                        exportParameters["bag"] = bagParameters;
                        bagParameters["bag_name"] = bagFormatOpts["name"];
                        bagParameters["bag_algorithms"] = bagFormatOpts["algs"];
                        bagParameters["bag_archiver"] = bagFormatOpts["archiver"];
                        bagParameters["bag_metadata"] = bagFormatOpts["metadata"];
                    }

                    var catalogParameters = {};
                    exportParameters["catalog"] = catalogParameters;
                    catalogParameters["host"] = scope.exportOptions.host;
                    catalogParameters["catalog"] = scope.reference.location.catalog;
                    var queries = [];
                    catalogParameters["queries"] = queries;

                    var template = scope.exportOptions.format["template"];
                    if (!template) {
                        // this is basically the same as a single file CSV or JSON export but packaged as a bag
                        var query = {};
                        query["output_path"] = bagFormatOpts["name"];
                        query["output_format"] = bagFormatOpts["table_format"];
                        query["query_path"] = "/" + scope.reference.location.api + "/" +
                            decodeURI(scope.reference.location.ermrestCompactPath + "?limit=none");
                        queries.push(query);
                    } else {
                        // TODO: The "template" mechanism needs refactoring to allow for full query paths in the
                        // template config, and not just "meta" query fragments.
                        var outputs = template["outputs"];
                        if ((outputs === undefined) || (outputs && outputs.length === 0)) {
                            var error = "No outputs configured in template: " + template["name"];
                            AlertsService.addAlert(error);
                            throw new Error(error);
                        }

                        var depth = 1;
                        var baseTableAlias = "X";
                        var tableAliasToken = baseTableAlias + depth;
                        $.each(outputs, function (i, output) {
                            var query = {};
                            var queryFrags = [];
                            var source = output["source"];
                            var sourceName = source["name"];
                            var sourceType = source["type"];
                            var dest = output["destination"];
                            var destName = dest["name"];
                            var destType = dest["type"];
                            var destParams = dest["params"];
                            var predicate = decodeURI(scope.reference.location.ermrestCompactPath);

                            queryFrags.push(sourceType);
                            var predicateContainsTargetEntity = predicate.indexOf(sourceName) !== -1;
                            if (predicateContainsTargetEntity) {
                                queryFrags.push(predicate);
                            } else {
                                queryFrags.push(predicate);
                                queryFrags.push(tableAliasToken + ":=" + sourceName);
                            }
                            if (source["filter"] !== undefined) {
                                queryFrags.push(source["filter"]);
                            }
                            if ((sourceType === "attribute") || (sourceType === "attributegroup")) {
                                var columnRefs = [];
                                var columnMap = source["column_map"];
                                if (columnMap !== undefined) {
                                    for (var col in columnMap) {
                                        if (columnMap.hasOwnProperty(col)) {
                                            columnRefs.push(col + ":=" +
                                                columnMap[col]);
                                        }
                                    }
                                }
                                queryFrags.push(columnRefs.join(","))
                            }
                            var query_path = encodeURI("/" + queryFrags.join("/") + "?limit=none");
                            query["query_path"] = query_path.replace(/\(/g, '%28').replace(/\)/g, '%29');
                            query["output_path"] = destName || sourceName;
                            query["output_format"] = destType || bagFormatOpts["table_format"];
                            if (destParams != null) {
                                query["output_format_params"] = destParams;
                            }
                            queries.push(query);
                        });
                    }

                    return exportParameters;
                }

                function invokeExternalExport(scope) {
                    var exportFormatType = scope.exportOptions.format["type"];
                    var exportParameters = JSON.stringify(createExportParameters(scope), null, "  ");
                    var serviceUrl = scope.exportOptions.host + "/iobox/export/" +
                        (exportFormatType == "BAG" ? "bdbag" : "file");
                    console.info("Executing external export with the following parameters:\n" + exportParameters);
                    console.time('External export duration');
                    // TODO: Use angularjs selectors instead of jquery.
                    /*
                    $http.post(uri, headers).then(function (response) {
                        console.log("data:", response.data);
                    }).catch(function (err) {
                        throw err;
                    });*/
                    $.ajax({
                        url: serviceUrl,
                        type: 'POST',
                        contentType: 'application/json',
                        data: exportParameters,
                        dataType: 'text',
                        headers: {},
                        timeout: 300000,
                        async: true,
                        success: function (data, textStatus, jqXHR) {
                            var uriList = data.split("\n");
                            if (uriList) {
                                location.href = uriList[0];
                            }
                            console.timeEnd('External export duration');
                            scope.isLoading = false;
                            scope.$apply()
                        },
                        error: function (jqXHR, textStatus, errorThrown) {
                            console.timeEnd('External export duration');
                            AlertsService.addAlert("Export failed for " + serviceUrl + " with " +
                                textStatus + ": " + errorThrown + ": " + jqXHR.responseText, "error");
                            scope.isLoading = false;
                            scope.$apply()
                        }
                    });
                }

                function doExport(scope) {
                    var baseName = scope.reference.location.tableName;
                    var baseOpts = "?limit=none&download=" + UriUtils.fixedEncodeURIComponent(baseName);
                    var exportFormatName = scope.exportOptions.format["name"];
                    var exportFormatType = scope.exportOptions.format["type"];
                    switch (exportFormatType) {
                        case "DIRECT":
                            if (exportFormatName === "CSV") {
                                location.href = scope.reference.location.ermrestUri + baseOpts + "&accept=csv";
                            } else if (exportFormatName === "JSON") {
                                location.href = scope.reference.location.ermrestUri + baseOpts + "&accept=json";
                            }
                            break;
                        case "BAG":
                        case "FILE":
                            invokeExternalExport(scope);
                            break;
                        default:
                            AlertsService.addAlert("Unsupported export format: " + exportFormatType);
                    }
                }
            }
        };
    }]);
})();
