var dataSetupCode = require("../data_setup/import.js");
var Q = require('q'); 

// Fetches the schemas for the current catalog
// The schema could be a new one or existing one depending on the test configuration
// Takes a callback function as an argument to be called on success
var fetchSchemas = function(testConfiguration, catalogId) {
	// Default to 1 if catalogId is undefined or null
	var catalogId = catalogId || 1, catalog, defaultSchema, defaultTable, defer = Q.defer();
	var done = false;
	  
	// Fetches the schemas for the catalogId
	// and sets the defaultSchema and defaultTable in browser parameters
	dataSetupCode.introspect({
		url: process.env.CHAISE_BASE_URL.replace('chaise', 'ermrest/'),
		catalogId: catalogId || 1,
		authCookie: testConfiguration.authCookie
	}).then(function(schema, catalog) {
        if (testConfiguration.dataSetup && testConfiguration.dataSetup.schema) {
            schema = catalog.schemas[testConfiguration.dataSetup.schema.name] || schema;
        }
        catalog = catalog;
		defaultSchema = schema;
		defaultTable = schema.defaultTable;
		// Set done to true to mention that the execution is over
		done = true;
	}, function(err) {
		throw new Error("Unable to fetch schemas");
	});

	// Wait until the value of done is true
	browser.wait(function() {
		return done;
	}, 5000).then(function() {
        defer.resolve({ catalogId: catalogId, catalog: catalog, defaultSchema: defaultSchema, defaultTable: defaultTable }); 
	}, function(err) {
        console.log("I timed out 3000");
        err.catalogId = catalogId;
		defer.reject(err);
	});

    return defer.promise;
};
exports.fetchSchemas = fetchSchemas;

exports.setup = function(testConfiguration) {

    var defer = Q.defer();
    
	testConfiguration.dataSetup.url = process.env.CHAISE_BASE_URL.replace('chaise', 'ermrest/');        
    testConfiguration.dataSetup.authCookie = testConfiguration.authCookie;

	var setupDone = false, successful = false, catalogId, schema;

    // Call setup to import data for tests as specified in the configuration    
    dataSetupCode.setup(testConfiguration.dataSetup).then(function(data) {
		
		// Set catalogId in browser params for future reference to delete it if required
        catalogId = data.catalogId;

        // Set schema returned in browser params for refering it in test cases
        schema = data.schema;
        
        // Set successful to determine data import was done successfully
        successful = true;

        // Set setupDone to true to specify that the dataSetup code has completed its execution
        setupDone = true;
    }, function(err) {

        // Set catalogId in browser params for future reference to delete if it required
        catalogId = err.catalogId || null; 

        // Set setupDone to true to specify that the dataSetup code has completed its execution
        setupDone = true;
    });

    // Wait until setupDone value is true
    browser.wait(function() {
        return setupDone;
    }, 120000).then(function() {
    	
        // If data import was successful then fetch the schema definitions for the catalog
        // and set the default Schema and default Table in browser parameters
        if (successful) {
        	exports.fetchSchemas(testConfiguration, catalogId).then(function(data) {
                data.schema = schema;
                defer.resolve(data);
	        }, function(err) {
                defer.reject({ catalogId: catalogId });
            });
        } else {
            defer.reject({ catalogId: catalogId });
        }
    }, function(err) {
        console.log("I timed out 12000");
        err.catalogId = catalogId;
        defer.reject(err);
    });

    return defer.promise;
};


exports.tear = function(testConfiguration, catalogId, defer) {
	var cleanupDone = false, defer = Q.defer();

	testConfiguration.dataSetup.url = process.env.CHAISE_BASE_URL.replace('chaise', 'ermrest/');        

    dataSetupCode.tear({
      url: process.env.CHAISE_BASE_URL.replace('chaise', 'ermrest/'),
      catalogId: catalogId,
      dataSetup: testConfiguration.dataSetup
    }).done(function() {
      cleanupDone = true;
    });

    browser.wait(function() {
      return cleanupDone;
    }, 5000).then(function() {
        defer.resolve();
    }, function(err) {
        defer.reject(err);
    });

    return defer.promise;
};