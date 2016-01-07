// openSeadragonApp: Defines the Angular application ==================================================================================================================================
var openSeadragonApp = angular.module('openSeadragonApp', ['ERMrest']);

// ERMrestService: A service for operations that deal with the ERMrest db =============================================================================================================
openSeadragonApp.service('ERMrestService', ['ermrestClientFactory', '$http', function(ermrestClientFactory, $http) {
    var client = ermrestClientFactory.getClient(window.location.origin + '/ermrest', null);
    var catalog = client.getCatalog(1);

    // Get a reference to the ERMrestService service
    var self = this;

    // Parse Chaise url to determine required parameters to find the requested entity
    this.path = window.location.hash;
    this.params = this.path.split('/');
    this.catalogId = this.params[0].substring(1);
    this.schemaName = this.params[1].split(':')[0];
    this.tableName = this.params[1].split(':')[1];
    this.entityId = this.params[2].split('=')[1];

    var ERMREST_ENDPOINT = window.location.origin + '/ermrest/catalog/';
    if (chaiseConfig['ermrestLocation'] != null) {
        ERMREST_ENDPOINT = chaiseConfig['ermrestLocation'] + '/ermrest/catalog';
    }

    // Returns a Schema object from ERMrest
    this.getSchema = function getSchema() {
        return catalog.introspect().then(function(schemas) {
            return schemas[self.schemaName];
        });
    };

    // Returns the uri value from a row in rbk:image (filtered by the id found in URL)
    this.getEntity = function getEntity() {
        return this.getSchema().then(function(schema) {
            var table = schema.getTable(self.tableName);
            var filteredTable = table.getFilteredTable(["id=" + self.entityId]);
            return filteredTable.getRows().then(function(rows) {
                return rows[0].data.uri;
            });
        });
    };

    this.insertRoi = function insertRoi(x, y, width, height, context) {
        var timestamp = new Date().toISOString();
        var coordinates = [x, y, width, height];
        var roi = [{
            "id": null,
            "image_id": parseInt(this.entityId),
            "author": null,
            "timestamp": timestamp,
            "coords": coordinates,
            "context_uri": context,
            "anatomy": null
        }];
        var entityPath = ERMREST_ENDPOINT + this.catalogId + '/entity/' + this.schemaName + ':roi?defaults=id,author';
        return $http.post(entityPath, roi);
    };

    this.insertRoiComment = function insertRoiComment(roiId, comment) {
        var timestamp = new Date().toISOString();
        var roiComment = [{
            "id": null,
            "roi_id": roiId,
            "author": null,
            "timestamp": timestamp,
            "comment": comment
        }];

        var entityPath = ERMREST_ENDPOINT + this.catalogId + '/entity/' + this.schemaName + ':roi_comment?defaults=id,author';
        return $http.post(entityPath, roiComment);
    };
    // TODO: Rewrite this with ermrestjs
    this.createAnnotation = function createAnnotation(x, y, width, height, context, comment, successCallback) {
        var newAnnotation = {};
        // First create a row in rbk:roi...
        this.insertRoi(x, y, width, height, context).then(function(response) {
            if (response.data) {
                newAnnotation = response.data[0];
                return response.data[0];
            } else {
                return 'Error: Region of interest could not be created. ' + response.status + ' ' + response.statusText;
            }
        // Then create a row in roi_comment, filling in the roi_id column with the result of insertRoi()
        }).then(function(data) {
            var roiId = data.id;
            self.insertRoiComment(roiId, comment).then(function(response) {
                if (response.data) {
                    newAnnotation.comments = response.data[0].comment;
                    return response.data[0];
                } else {
                    return 'Error: Comment could not be created. ' + response.status + ' ' + response.statusText;
                }
            });
            successCallback(newAnnotation);
        });
    };

    this.getAnnotations = function getAnnotations() {
        var annotations = [];
        this.getSchema().then(function(schema) {
            var roiTable = schema.getTable('roi');
            var filteredRoiTable = roiTable.getFilteredTable(["image_id=" + self.entityId]);
            return filteredRoiTable.getRows().then(function(roiRows) {
                if (roiRows.length > 0) {
                    return Promise.all(roiRows.map(function(roi) {
                        return roi.getRelatedTable(self.schemaName, 'roi_comment').getRows().then(function(commentRows) {
                            return Promise.all(commentRows.map(function(comment) {
                                roi.data.comments = comment.data.comment;
                                annotations.push(roi.data);
                            }));
                        });
                    }));
                } else {
                    console.log('No annotations found for this image.')
                }
            });
        });
        return annotations;
    };
}]);

// MainController: An Angular controller to update the view ===========================================================================================================================
openSeadragonApp.controller('MainController', ['$scope', 'ERMrestService', function($scope, ERMrestService) {
    $scope.annotations = ERMrestService.getAnnotations();
    $scope.viewer = null;
    $scope.viewerReady = false;
    $scope.viewerSource = null;
    $scope.highlightedAnnotation = null;

    // Fetch uri from image table to load OpenSeadragon
    ERMrestService.getEntity().then(function(uri) {
        // Initialize OpenSeadragon with the uri
        $scope.viewerSource = uri;
    });

    // Listen for events from OpenSeadragon/iframe
    // TODO: Maybe figure out an Angular way to listen to the postMessage event
    window.addEventListener('message', function(event) {
        if (event.origin === window.location.origin) {
            var data = event.data;
            var messageType = data.messageType;
            switch (messageType) {
                case 'myAnnoReady':
                    $scope.viewerReady = data.content;
                    if ($scope.viewerReady) {
                        $scope.viewer = window.frames[0];
                        $scope.viewer.postMessage({messageType: 'annotationsList', content: $scope.annotations}, window.location.origin);
                    }
                    break;
                case 'onAnnotationCreated':
                    var annotation = JSON.parse(event.data.content);
                    var coordinates = annotation.data.shapes[0].geometry;
                    ERMrestService.createAnnotation(coordinates.x, coordinates.y, coordinates.width, coordinates.height, annotation.data.context, annotation.data.text, $scope.pushAnnotationToScope);
                    break;
                default:
                    console.log('Invalid message type. No action performed.');
            }
        } else {
            console.log('Invalid event origin. Event origin: ', origin, '. Expected origin: ', window.location.origin);
        }
    });

    // A success callback fn to push new annotations into this controller's scope
    $scope.pushAnnotationToScope = function pushAnnotationToScope(newAnnotation) {
        $scope.annotations.push(newAnnotation);
    };

    $scope.highlightAnnotation = function highlightAnnotation(annotation) {
        $scope.viewer.postMessage({messageType: 'highlightAnnotation', content: annotation}, window.location.origin);
    };

    $scope.setHighlightedAnnotation = function setHighlightedAnnotation(annotationIndex) {
        $scope.highlightedAnnotation = annotationIndex;
    };

    $scope.drawNewAnnotation = function drawNewAnnotation() {
        $scope.viewer.postMessage({messageType: 'drawNewAnnotation'}, window.location.origin);
    }
}]);

// Trusted: A filter that tells Angular when a url is trusted =========================================================================================================================
openSeadragonApp.filter('trusted', ['$sce', function($sce) {
    return function(url) {
        return $sce.trustAsResourceUrl(url);
    };
}]);

// Refreshes page when the window's hash changes
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
