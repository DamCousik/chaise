(function() {
    'use strict';
    
    angular.module('chaise.inputs', ['chaise.validators'])

    .directive('rangeInputs', function() {
        return {
            restrict: 'E',
            templateUrl: '../common/templates/rangeInputs.html',
            scope: {
                type: '=',
                callback: '&',
                absMin: '=?',
                absMax: '=?'
            },
            link: function(scope, elem, attr) {
                function emptyOrNull(val) {
                    return (val == '' || val == null || val == undefined);
                }

                /**
                 * Returns a relative type after checkins if the column has a domain type.
                 *
                 * @returns {String} - the column's type's name
                 */
                scope.type = function (type) {
                    var relativeType;
                    
                    switch (type.name) {
                        case 'date':
                            relativeType: "date";
                            break;
                        case 'timestamp':
                        case 'timestamptz':
                            relativeType: "datetime";
                            break;
                        case 'int2':
                        case 'int4':
                        case 'int8':
                        case 'float4':
                        case 'float8':
                        case 'numeric':
                        default:
                            relativeType = type.baseType ? type(type.baseType) : "number";
                            break;
                    }
                    return relativeType;
                }

                // returns a boolean to disable the add button if both min and max are not set
                scope.disableAdd = function () {
                    return ( emptyOrNull(scope.min) && emptyOrNull(scope.max) )
                };

                scope.addRange = function () {
                    var min, max;
                    scope.isDirty = true;
                    // data for timestamp[tz] needs to be formatted properly
                    if (scope.type(scope.type) == "datetime") {
                        min = moment(scope.min.date + scope.min.time, 'YYYY-MM-DDHH:mm:ss').format('YYYY-MM-DDTHH:mm:ss.SSSZ');
                        max = moment(scope.max.date + scope.max.time, 'YYYY-MM-DDHH:mm:ss').format('YYYY-MM-DDTHH:mm:ss.SSSZ');
                    } else {
                        min = scope.min;
                        max = scope.max;
                    }

                    if (min == '') min = null;
                    if (max == '') max = null;
                    scope.callback(min, max);
                };
            }
        }
    });
})();
