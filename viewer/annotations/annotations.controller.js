(function() {
    'use strict';

    angular.module('chaise.viewer')

    .controller('AnnotationsController', ['AuthService', 'annotations', 'comments', 'anatomies', 'AnnotationsService', '$window', '$scope', function AnnotationsController(AuthService, annotations, comments, anatomies, AnnotationsService, $window, $scope) {
        var vm = this;
        vm.annotations = annotations;
        vm.anatomies = anatomies;
        vm.arrowColors = ['red', 'orange', 'yellow', 'green', 'blue', 'purple'];

        vm.filterAnnotations = filterAnnotations;

        vm.createMode = false;
        vm.newAnnotation = {config:{color: 'orange'}}; // default color orange
        vm.drawAnnotation = drawAnnotation;
        vm.createAnnotation = createAnnotation;
        vm.cancelNewAnnotation = cancelNewAnnotation;

        vm.editedAnnotation = null; // Track which annotation is being edited right now; used to show/hide the right UI elements depending on which one is being edited.
        var originalAnnotation = null; // Holds the original contents of annotation in the event that a user cancels an edit
        vm.editAnnotation = editAnnotation;
        vm.cancelEdit = cancelEdit;
        vm.updateAnnotation = updateAnnotation;

        vm.deleteAnnotation = deleteAnnotation;

        vm.highlightedAnnotation = null;
        vm.centerAnnotation = centerAnnotation;

        vm.getNumComments = getNumComments;
        vm.authorName = authorName;

        vm.allowCreate = AuthService.createAnnotation;
        vm.allowEdit = AuthService.editAnnotation;
        vm.allowDelete = AuthService.deleteAnnotation;

        vm.showSections = showSections;

        // Listen to events of type 'message' (from Annotorious)
        $window.addEventListener('message', function annotationControllerListener(event) {
            // TODO: Check if origin is valid first; if not, return and exit.
            // Do this for the other listeners as well.
            if (event.origin === window.location.origin) {
                var data = event.data;
                var messageType = data.messageType;

                switch (messageType) {
                    case 'annotoriousReady':
                        // annotoriousReady case handled in viewer.app.js.
                        // Repeating the case here to avoid triggering default case
                        break;
                    case 'annotationDrawn':
                        vm.newAnnotation.shape = data.content.shape;
                        $scope.$apply(function() {
                            vm.createMode = true;
                        });
                        break;
                    case 'onHighlighted':
                    // On-hover highlighting behavior no longer needed
                    // OSD still sends this message out on hover though, so the
                    // is case here to avoid triggering default case
                        break;
                    case 'onUnHighlighted':
                    // On-hover highlighting behavior no longer needed
                    // OSD still sends this message out on hover though, so the
                    // is case here to avoid triggering default case
                        break;
                    case 'onClickAnnotation':
                        var content = JSON.parse(data.content);
                        var annotation = findAnnotation(content.data.shapes[0].geometry);
                        if (annotation) {
                            var annotationId = annotation.table.name + '-' + annotation.data.id;
                            $scope.$apply(function() {
                                vm.highlightedAnnotation = annotationId;
                            });
                            scrollIntoView(annotationId);
                        }
                        break;
                    default:
                        console.log('Invalid event message type "' + messageType + '"');
                }
            } else {
                console.log('Invalid event origin. Event origin: ', event.origin, '. Expected origin: ', window.location.origin);
            }
        });

        function filterAnnotations(annotation) {
            if (!vm.query) {
                return true;
            }

            vm.query = vm.query.toLowerCase();

            annotation = annotation.data;
            var author = annotation.author;
            var props = [annotation.anatomy, annotation.description, author.display_name, author.full_name, author.email, annotation.created];
            var numProps = props.length;
            for (var i = 0; i < numProps; i++) {
                if (props[i] && props[i].toLowerCase().indexOf(vm.query) > -1) {
                    return true;
                }
            }

            var commentsArr = comments[annotation.id];
            if (commentsArr) {
                var numComments = commentsArr.length;
                for (var c = 0; c < numComments; c++) {
                    var comment = commentsArr[c].data;
                    var commentAuthor = comment.author;
                    var commentProps = [comment.comment, comment.created, commentAuthor.display_name, commentAuthor.full_name, commentAuthor.email];
                    var numCommentProps = commentProps.length;
                    for (var p = 0; p < numCommentProps; p++) {
                        if (commentProps[p] && commentProps[p].toLowerCase().indexOf(vm.query) > -1) {
                            return true;
                        }
                    }
                }
            }

            return false;
        }

        function drawAnnotation(type) {
            vm.newAnnotation.type = type;
            return AnnotationsService.drawAnnotation();
        }

        function createAnnotation() {
            vm.createMode = false;
            AnnotationsService.createAnnotation(vm.newAnnotation);
            vm.newAnnotation = {config:{color: 'orange'}};
        }

        function cancelNewAnnotation() {
            vm.createMode = false;
            return AnnotationsService.cancelNewAnnotation();
        }

        function editAnnotation(annotation) {
            vm.editedAnnotation = annotation.table.name + '-' + annotation.data.id;
            annotation = annotation.data;
            originalAnnotation = {
                description: annotation.description,
                anatomy: annotation.anatomy,
                config: annotation.config,
                type: annotation.type
            };
        };

        function cancelEdit(annotation) {
            vm.editedAnnotation = null;
            var data = annotation.data;
            data.description = originalAnnotation.description;
            data.anatomy = originalAnnotation.anatomy;
            data.config = originalAnnotation.config;
            data.type = originalAnnotation.type;
        };

        function updateAnnotation(annotation) {
            vm.editedAnnotation = null;
            return AnnotationsService.updateAnnotation(annotation);
        }

        function deleteAnnotation(annotation) {
            return AnnotationsService.deleteAnnotation(annotation);
        };

        function setHighlightedAnnotation(annotation) {
            vm.highlightedAnnotation = annotation.table.name + '-' + annotation.data.id;
        }

        // Centers and zooms to the annotation inside Annotorious
        function centerAnnotation(annotation) {
            setHighlightedAnnotation(annotation);
            return AnnotationsService.centerAnnotation(annotation);
        }

        function getNumComments(annotation) {
            return AnnotationsService.getNumComments(annotation.data.id);
        }

        // Return an annotation/section that matches an object of coordinates
        function findAnnotation(coordinates) {
            var length = vm.annotations.length;
            for (var i = 0; i < length; i++) {
                var annotationCoords = vm.annotations[i].data.coords;
                if (coordinates.x == annotationCoords[0] && coordinates.y == annotationCoords[1] && coordinates.width == annotationCoords[2] && coordinates.height == annotationCoords[3]) {
                    return vm.annotations[i];
                }
            }
        }

        // Scroll a DOM element into visible part of the browser
        function scrollIntoView(elementId) {
            // Using native JS b/c angular.element returns a jQuery/jqLite object,
            // which is incompatible with .scrollIntoView()
            document.getElementById(elementId).scrollIntoView({
                block: 'start',
                behavior: 'smooth'
            });
        }

        // Used to set the author based on the info object from the user object (user.info) that is set on every annotation
        // The info object is the session.client object and may contain a combination of display_name, full_name, and email
        function authorName(client) {
            return (client.display_name ? client.display_name : (client.full_name ? client.full_name : client.email ));
        }

        function showSections() {

        }
    }]);
})();
