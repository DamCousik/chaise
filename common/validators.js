(function() {
    'use strict';


    var INTEGER_REGEXP = /^\-?\d+$/;
    // updated float regex
    // ^(Infinity|-Infinity|NaN|-?\d+(\.\d+)?([eE][-+]?\d+)?$
    var FLOAT_REGEXP = /^\-?(\d+)?((\.)?\d+)?$/;
    angular.module('chaise.validators', [])
    // Validation directive for testing if an input value is an integer
    // Use: <input type="number" required integer>
    .directive('integer', function() {
        return {
            require: 'ngModel',
            link: function(scope, elm, attrs, ctrl) {
                ctrl.$validators.integer = function(modelValue, viewValue) {
                    if (ctrl.$isEmpty(modelValue)) {
                        // consider empty models to be valid
                        // use the `required` attribute in the HTML
                        return true;
                    }
                    if (INTEGER_REGEXP.test(viewValue)) {
                        // it is valid
                        return true;
                    }
                    // it is invalid
                    return false;
                };
            }
        };
    })

    // Validation directive for testing if an input value is a float
    // Use: <input type="number" required float>
    .directive('float', function() {
        return {
            require: 'ngModel',
            link: function(scope, elm, attrs, ctrl) {
                ctrl.$validators.float = function(modelValue, viewValue) {
                    if (ctrl.$isEmpty(modelValue)) {
                        // consider empty models to be valid
                        // use the `required` attribute in the HTML
                        return true;
                    }
                    if (FLOAT_REGEXP.test(viewValue)) {
                        // it is valid
                        return true;
                    }
                    // it is invalid
                    return false;
                };
            }
        };
    })

    // Validation directive for testing if an input value is a date
    // Use: <input type="text" date>
    .directive('date', function() {
        return {
            require: 'ngModel',
            link: function(scope, elm, attrs, ctrl) {
                ctrl.$validators.date = function(modelValue, viewValue) {
                    var value = modelValue || viewValue;
                    if (ctrl.$isEmpty(value)) {
                        return true;
                    }
                    return moment(value, ['YYYY-MM-DD', 'YYYY-M-DD', 'YYYY-M-D', 'YYYY-MM-D'], true).isValid();
                };
            }
        };
    })


    //Validation directive for JSON for testing if an input value is valid JSON
    // Use: <input type="textarea" json>
    .directive('json', function() {
        return {
            require: 'ngModel',
            link: function(scope, elm, attrs, ctrl) {
                ctrl.$validators.json = function(modelValue, viewValue) {
                    var value = modelValue || viewValue;
                    if (ctrl.$isEmpty(value)) {
                        return true;
                    }
                    try{
                        JSON.parse(value);
                        return true;
                    }
                    catch(e){
                        return false;
                    }
                };
            }
        };
    })

    // Validation directive for testing if an input value is a time
    // Use: <input type="text" time>
    .directive('time', function() {
        return {
            require: 'ngModel',
            link: function(scope, elm, attrs, ctrl) {
                ctrl.$validators.time = function(modelValue, viewValue) {
                    if (ctrl.$isEmpty(modelValue)) {
                        return true;
                    }
                    return moment(modelValue, ['H:m:s', 'H:m', 'H'], true).isValid();
                };
                /*
                The parser below takes the view value and inserts the appropriate colons before updating the model value.
                If we decide the placeholder char for the time input's mask should be something other than
                a valid time character (e.g. underscore or space; currently it's 0), then we need to set the model-view-value
                attr on the time input's ui-mask to `false` and uncomment the parser below.
                */
                // ctrl.$parsers.push(function(value) {
                //     value = value.replace(/(.{2})/g, '$1:');
                //     if (value.slice(-1) === ':') {
                //         value = value.slice(0, -1);
                //     }
                //     return value;
                // });
            }
        };
    })

    /**
    * @desc
    * The timestamp directive is used to test if a timestamp object model is valid. It should be used
    * in conjunction with the date and time validators by placing it on each date and time input.
    * It accepts 1 attribute:
    * @param {Object} validateValues - This is required. This will be the object model for timestamp fields.
    * The object must have "date" and "time" properties.
    * @example <input type="text" time timestamp validate-values="entireTimestampObjectModelHere">
    * @example <input type="text" date timestamp validate-values="entireTimestampObjectModelHere">
    */
    .directive('timestamp', function() {
        return {
            restrict: 'A',
            require: 'ngModel',
            link: function(scope, elm, attr, ctrl) {
                scope.$watch(attr.validateValues, function(newObj, oldObj) {
                    // If newObj and oldObj are identical, then this listener fn was triggered
                    // due to app initialization, not an actual model change. Do nothing.
                    if (newObj === oldObj || newObj == null) {
                        return;
                    }
                    var date = newObj.date,
                        dateIsValid = moment(date, ['YYYY-MM-DD', 'YYYY-M-DD', 'YYYY-M-D', 'YYYY-MM-D'], true).isValid(),
                        dateIsEmpty = (date === null || date === '' || date === undefined),
                        time = newObj.time,
                        // H:m:s matches all permutation of hours:minutes:seconds where there is a single digit or 2 digits input
                        // eg. 02:02:02 === 2:2:2 are both validated as proper
                        timeIsValid = moment(time, ['H:m:s', 'H:m', 'H'], true).isValid(),
                        timeIsEmpty = (time === null || time === '' || time === undefined);

                    if (dateIsValid) {
                        if (!timeIsValid && !timeIsEmpty) {
                            return ctrl.$setValidity('timestampTime', false);
                        }
                    } else if (dateIsEmpty) {
                        if (timeIsValid || !timeIsEmpty) {
                            return ctrl.$setValidity('timestampDate', false);
                        }
                    } else { // if date is bad, the whole timestamp is bad..
                        return ctrl.$setValidity('timestampDate', false);
                    }
                    ctrl.$setValidity('timestampDate', true);
                    ctrl.$setValidity('timestampTime', true);
                }, true);
            }
        };
    })

    .directive('fileExtension', function() {
        return {
            restrict: 'A',
            require: 'ngModel',
            link: function(scope, elm, attrs, ctrl) {
                ctrl.$validators.fileExtension = function(modelValue, viewValue) {
                    if (ctrl.$isEmpty(modelValue)) {
                        // consider empty models to be valid
                        // use the `required` attribute in the HTML
                        return true;
                    }
                    var fileExtensionFilter = scope.column.filenameExtFilter;
                    if (fileExtensionFilter) {
                        var isMatch = false;
                        for (var j=0; j<fileExtensionFilter.length; j++) {
                            if (modelValue.slice(modelValue.length - fileExtensionFilter[j].length, modelValue.length) == fileExtensionFilter[j]) {
                                isMatch = true
                            }
                        }
                        return isMatch;
                    }

                    // no filenameExtFilter, validates as true
                    return true;
                };
            }
        };
    });
})();
