(function() {
    'use strict';

    angular.module('chaise.viewer')

    .controller('AnnotationsController', ['annotations', 'anatomies', 'AnnotationsService', '$window', '$document', '$scope', function AnnotationsController(annotations, anatomies, AnnotationsService, $window, $document, $scope) {
        var vm = this;
        vm.annotations = annotations;
        vm.anatomies = anatomies;

        vm.filterAnnotations = filterAnnotations;

        vm.createMode = false;
        vm.newAnnotation = null;
        vm.drawAnnotation = drawAnnotation;
        vm.createAnnotation = createAnnotation;
        vm.cancelNewAnnotation = cancelNewAnnotation;

        vm.editedAnnotation = null; // Track which annotation is being edited right now; used to show/hide the right UI elements depending on which one is being edited.
        // vm.originalAnnotation = null; // Holds the original contents of annotation in the event that a user cancels an edit
        vm.editAnnotation = editAnnotation;
        vm.cancelEdit = cancelEdit;
        vm.updateAnnotation = updateAnnotation;

        vm.deleteAnnotation = deleteAnnotation;

        vm.highlightedAnnotation = null;
        vm.setHighlightedAnnotation = setHighlightedAnnotation;


        $window.addEventListener('message', function annotationControllerListener(event) {
            if (event.origin === window.location.origin) {
                var data = event.data;
                if (data.messageType === 'annotationDrawn') {
                    vm.newAnnotation = {
                        description: '',
                        shape: data.content.shape
                    };
                    $scope.$apply(function() {
                        vm.createMode = true;
                    });
                } else if (data.messageType === 'onHighlighted') {
                    var content = JSON.parse(data.content);
                    var annotation = findAnnotation(content.data.shapes[0].geometry);
                    $scope.$apply(function() {
                        vm.highlightedAnnotation = annotation.data.id;
                        // Scroll the annotation into visible part of browser
                        document.getElementById('annotation-' + vm.highlightedAnnotation).scrollIntoView({
                            block: 'start',
                            behavior: 'smooth'
                        });
                    });
                    var element = document.get
                } else if (data.messageType ==='onUnHighlighted') {
                    $scope.$apply(function() {
                        vm.highlightedAnnotation = null;
                    });
                }
            }
        });

        // Returns true if at least one of a specified subset of an object's keys contains a value that contains the query
        function filterAnnotations(keys) {
            var query = vm.query;
            return function(annotation) {
                if (!query) {
                    // If query is "" or undefined, then the annotation is considered a match
                    return true;
                } else {
                    console.log(query);
                    annotation = annotation.data;
                    query = query.toLowerCase();
                    // // If the "anatomy" key is null, make it "No Anatomy" so that a query for "No Anatomy" will match this key
                    if (!annotation.anatomy) {
                        annotation.anatomy = 'No Anatomy';
                    }
                    // Loop through the array to find matches
                    var numKeys = keys.length;
                    if (numKeys > 0) {
                        for (var i = 0; i < numKeys; i++) {
                            if (annotation[keys[i]].toLowerCase().indexOf(query) !== -1) {
                                return true;
                            }
                        }
                    }
                    // // Set the "anatomy" key back to null if it was changed to "No Anatomy" earlier
                    if (annotation.anatomy === 'No Anatomy') {
                        annotation.anatomy = null;
                    }
                }
            }
        }

        function drawAnnotation(annotation) {
            return AnnotationsService.drawAnnotation();
        }

        function createAnnotation() {
            vm.createMode = false;
            return AnnotationsService.createAnnotation(vm.newAnnotation);
        }

        function cancelNewAnnotation() {
            vm.createMode = false;
            return AnnotationsService.cancelNewAnnotation();
        }

        function editAnnotation(annotation) {
            vm.editedAnnotation = annotation.data.id;
            // vm.originalAnnotation = annotation;
        };

        function cancelEdit(annotation) {
            vm.editedAnnotation = null;
            // annotation = vm.originalAnnotation;
        };

        function updateAnnotation(annotation) {
            vm.editedAnnotation = null;
            return AnnotationsService.updateAnnotation(annotation);
        }

        function deleteAnnotation(annotation) {
            return AnnotationsService.deleteAnnotation(annotation);
        };

        function setHighlightedAnnotation(annotation) {
            if (vm.highlightedAnnotation == annotation.data.id) {
                vm.highlightedAnnotation = null;
                return;
            }

            vm.highlightedAnnotation = annotation.data.id;
            highlightAnnotation(annotation);
        }

        function highlightAnnotation(annotation) {
            return AnnotationsService.highlightAnnotation(annotation);
        }

        // Return an annotation that matches an object of coordinates
        function findAnnotation(coordinates) {
            for (var i = 0; i < vm.annotations.length; i++) {
                var annotationCoords = vm.annotations[i].data.coords;
                if (coordinates.x == annotationCoords[0] && coordinates.y == annotationCoords[1] && coordinates.width == annotationCoords[2] && coordinates.height == annotationCoords[3]) {
                    return vm.annotations[i];
                }
            }
        }
    }]);
})();
