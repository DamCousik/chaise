(function() {
    'use strict';

    var client;

    angular.module('chaise.viewer', ['ERMrest', 'ngSanitize', 'chaise.filters', 'ui.select'])

    // Configure the context info from the URI
    .config(['context', function configureContext(context) {
        if (chaiseConfig.headTitle !== undefined) {
            document.getElementsByTagName('head')[0].getElementsByTagName('title')[0].innerHTML = chaiseConfig.headTitle;
        }

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
                context.schemaName = params[0];
                context.tableName = params[1];
            } else {
                context.schemaName = '';
                context.tableName = params[0];
            }
        }
        if (parts[2]) {
            params = parts[2].split('=');
            if (params.length > 1) {
                context.imageID = params[1];
            }
        }
    }])

    // Get a client connection to ERMrest
    // Note: Only Providers and Constants can be dependencies in .config blocks. So
    // if you want to use a factory or service (e.g. $window or your custom one)
    // in a .config block, you add append 'Provider' to the dependency name and
    // run .$get() on it. This returns a Provider instance of the factory/service.
    .config(['ermrestServerFactoryProvider', 'context', function configureClient(ermrestServerFactoryProvider, context) {
        client = ermrestServerFactoryProvider.$get().getServer(context.serviceURL);
        // client = ermrestClientFactoryProvider.$get().getClient(context.serviceURL);
    }])

    // Set user info
    .config(['userProvider', 'context', function configureUser(userProvider, context) {

        client.session.get().then(function success(session) {
        // client.getSession().then(function success(session) {
            console.log('Session: ', session);
            var groups = context.groups;
            var attributes = session.attributes;
            var user = userProvider.$get();

            user.name = session.client;

            if (attributes.indexOf(groups.curators) > -1) {
                return user.role = 'curator';
            } else if (attributes.indexOf(groups.annotators) > -1) {
                return user.role = 'annotator';
            } else if (attributes.indexOf(groups.users) > -1) {
                return user.role = 'user';
            } else {
                user.role = null;
            }
            console.log('User: ', user);
        }, function error(response) {
            if (response.status == 401 || response.status == 404) {
                if (chaiseConfig.authnProvider == 'goauth') {
                    getGoauth(encodeSafeURIComponent(window.location.href));
                }
                console.log(response);
                throw response;
            }
        });

        function getGoauth(referrer) {
            var url = '/ermrest/authn/preauth?referrer=' + referrer;
            // Inject $http service
            var $http = angular.injector(['ng']).get('$http');
            $http.get(url).then(function success(response) {
                console.log('Success: ', response);
                window.open(response.data.redirect_url, '_self');
            }, function error(response) {
                console.log('Error: ', response);
                throw response;
            });
        }

        function encodeSafeURIComponent (str) {
            return encodeURIComponent(str).replace(/[!'()*]/g, function(c) {
                return '%' + c.charCodeAt(0).toString(16).toUpperCase();
            });
        }
    }])

    // Get session info, hydrate values providers, and set up iframe
    .run(['$http', '$window', 'context', 'image', 'annotations', 'comments', 'sections', 'anatomies', 'statuses', 'vocabs', 'user', function runApp($http, $window, context, image, annotations, comments, sections, anatomies, statuses, vocabs) {
        var origin = $window.location.origin;
        var iframe = $window.frames[0];
        var annotoriousReady = false;

        client.catalogs.get(context.catalogID).then(function success(catalog) {
        // var catalog = client.getCatalog(context.catalogID);
            var schema = catalog.schemas.get(context.schemaName);
        // catalog.introspect().then(function success(schemas) {
            // console.log('Schemas: ', schemas);
            // var schema = schemas[context.schemaName];
            if (schema) {
                var table = schema.tables.get(context.tableName);
                // var table = schema.getTable(context.tableName);
                // BinaryPredicate(column, operator, value) is used for building a filter
                var idFilter = ERMrest.BinaryPredicate(table.columns.get('id'), ERMrest.OPERATOR.EQUAL, context.imageID);
                table.entity.get(idFilter).then(function success(entity) {
                // var filteredTable = table.getFilteredTable(['id=' + context.imageID]);
                // if (filteredTable) {
                    // filteredTable.getEntities().then(function success(_entities) {
                        image.entity = entity;
                        // image.entity = _entities[0];
                        iframe.location.replace(image.entity.data.uri);
                        console.log('Image: ', image);

                        var sectionTable = schema.tables.get('section_annotation');
                        // var sectionTable = image.entity.getRelatedTable(context.schemaName, 'section_annotation');
                        sectionTable.entity.get().then(function success(_sections) {
                        // sectionTable.getEntities().then(function success(_sections) {
                            var length = _sections.length;
                            for (var i = 0; i < length; i++) {
                                sections.push(_sections[i]);
                            }
                            if (annotoriousReady) {
                                iframe.postMessage({messageType: 'loadAnnotations', content: sections}, origin);
                            }
                            console.log('Sections: ', sections);
                        }, function error(response) {
                            throw response;
                        });

                        var annotationTable = schema.tables.get('annotation');
                        // var annotationTable = image.entity.getRelatedTable(context.schemaName, 'annotation');
                        annotationTable.entity.get().then(function success(_annotations) {
                        // annotationTable.getEntities().then(function success(_annotations) {
                            var length = _annotations.length;
                            for (var i = 0; i < length; i++) {
                                annotations.push(_annotations[i]);
                            }

                            if (annotoriousReady) {
                                iframe.postMessage({messageType: 'loadAnnotations', content: annotations}, origin);
                            }
                            console.log('Annotations: ', annotations);
                        }, function error(response) {
                            throw response;
                        });

                        // Get all the comments for this image
                        var commentTable = schema.tables.get('annotation_comment');
                        // var commentTable = annotationTable.getRelatedTable(context.schemaName, 'annotation_comment');
                        commentTable.entity.get().then(function success(_comments) {
                        // commentTable.getEntities().then(function success(_comments) {
                            var length = _comments.length;
                            for (var i = 0; i < length; i++) {
                                var annotationId = _comments[i].data.annotation_id;
                                if (!comments[annotationId]) {
                                    comments[annotationId] = [];
                                }
                                comments[annotationId].push(_comments[i]);
                            }
                            console.log('Comments: ', comments);
                        }, function error(response) {
                            console.log(response);
                        });
// table.entity.get(filter) => entity response
                    }, function error(response) {
                        throw response;
                    });
                // }

                // Get all rows from "anatomy" table
                var anatomyTable = schema.tables.get('anatomy');
                // var anatomyTable = schema.getTable('anatomy');
                anatomyTable.entity.get().then(function success(_anatomies) {
                // anatomyTable.getEntities().then(function success(_anatomies) {
                    anatomies.push('No Anatomy');
                    var length = _anatomies.length;
                    for (var j = 0; j < length; j++) {
                        anatomies.push(_anatomies[j].data.term);
                    }
                }, function error(response) {
                    throw response;
                });

                // Get all rows from "image_grade_code" table.
                var statusTable = schema.tables.get('image_grade_code');
                // var statusTable = schema.getTable('image_grade_code');
                statusTable.entity.get().then(function success(_statuses) {
                // statusTable.getEntities().then(function success(_statuses) {
                    var length = _statuses.length;
                    for (var j = 0; j < length; j++) {
                        statuses.push(_statuses[j].data.code);
                    }
                }, function error(response) {
                    throw response;
                });


                // Get all rows from "tissues" table
                var tissueTable = schema.tables.get('tissue');
                // var tissueTable = schema.getTable('tissue');
                tissueTable.entity.get().then(function success(_tissues) {
                // tissueTable.getEntities().then(function success(_tissues) {
                    var length = _tissues.length;
                    vocabs['tissue'] = [];
                    for (var j = 0; j < length; j++) {
                        vocabs['tissue'].push(_tissues[j].data.term);
                    }
                }, function error(response) {
                    throw response;
                });

                // Get all rows from "age stage" table
                var ageStageTable = schema.tables.get('age_stage');
                // var ageStageTable = schema.getTable('age_stage');
                ageStageTable.entity.get().then(function success(_stages) {
                // ageStageTable.getEntities().then(function success(_stages) {
                    var length = _stages.length;
                    vocabs['age_stage'] = [];
                    for (var j = 0; j < length; j++) {
                        vocabs['age_stage'].push(_stages[j].data.term);
                    }
                }, function error(response) {
                    throw response;
                });

                // Get all rows from "gender" table
                var genderTable = schema.tables.get('gender');
                // var genderTable = schema.getTable('gender');
                genderTable.entity.get().then(function success(_genders) {
                // genderTable.getEntities().then(function success(_genders) {
                    var length = _genders.length;
                    vocabs['gender'] = [];
                    for (var j = 0; j < length; j++) {
                        vocabs['gender'].push(_genders[j].data.term);
                    }
                }, function error(response) {
                    throw response;
                });

                // Get all rows from "specimen_fixation" table
                var specimenFixationTable = schema.tables.get('specimen_fixation');
                // var specimenFixationTable = schema.getTable('specimen_fixation');
                specimenFixationTable.entity.get().then(function success(_fixations) {
                // specimenFixationTable.getEntities().then(function success(_fixations) {
                    var length = _fixations.length;
                    vocabs['specimen_fixation'] = [];
                    for (var j = 0; j < length; j++) {
                        vocabs['specimen_fixation'].push(_fixations[j].data.term);
                    }
                }, function error(response) {
                    throw response;
                });

                // Get all rows from "embedding_medium" table
                var embeddingMediumTable = schema.tables.get('embedding_medium');
                // var embeddingMediumTable = schema.getTable('embedding_medium');
                embeddingMediumTable.entity.get().then(function success(_media) {
                // embeddingMediumTable.getEntities().then(function success(_media) {
                    var length = _media.length;
                    vocabs['embedding_medium'] = [];
                    for (var j = 0; j < _media.length; j++) {
                        vocabs['embedding_medium'].push(_media[j].data.term);
                    }
                }, function error(response) {
                    throw response;
                });

                // Get all rows from "staining_protocol" table
                var stainingProtocolTable = schema.tables.get('staining_protocol');
                // var stainingProtocolTable = schema.getTable('staining_protocol');
                stainingProtocolTable.entity.get().then(function success(_protocols) {
                // stainingProtocolTable.getEntities().then(function success(_protocols) {
                    var length = _protocols.length;
                    vocabs['staining_protocol'] = [];
                    for (var j = 0; j < length; j++) {
                        vocabs['staining_protocol'].push(_protocols[j].data.term);
                    }
                }, function error(response) {
                    throw response;
                });
            }
// catalog.introspect() => schemas response
        // }, function error(response) {
        //     console.log(response);
        // });
// catalog promise response
        }, function error(response) {
          console.log(response);
        });


        $window.addEventListener('message', function(event) {
            if (event.origin === origin) {
                if (event.data.messageType == 'annotoriousReady') {
                    annotoriousReady = event.data.content;
                    if (annotoriousReady) {
                        iframe.postMessage({messageType: 'loadSpecialAnnotations', content: sections}, origin);
                        iframe.postMessage({messageType: 'loadAnnotations', content: annotations}, origin);
                    }
                }
            } else {
                console.log('Invalid event origin. Event origin: ', origin, '. Expected origin: ', window.location.origin);
            }
        });
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
