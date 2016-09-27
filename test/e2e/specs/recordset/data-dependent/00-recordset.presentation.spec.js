var chaisePage = require('../../../utils/chaise.page.js'), IGNORE = "tag:isrd.isi.edu,2016:ignore", HIDDEN = "tag:misd.isi.edu,2015:hidden";
var recordsetHelpers = require('../helpers.js');

describe('View recordset,', function() {

    var params, testConfiguration = browser.params.configuration.tests, testParams = testConfiguration.params;

    for (var i=0; i< testParams.tuples.length; i++) {

        (function(tupleParams, index) {

            describe("For table " + tupleParams.table_name + ",", function() {

                var table, record;

                beforeAll(function () {
                    var keys = [];
                    tupleParams.keys.forEach(function(key) {
                        keys.push(key.name + key.operator + key.value);
                    });
                    browser.ignoreSynchronization=true;
                    browser.get(browser.params.url + ":" + tupleParams.table_name + "/" + keys.join("&") + "@sort(" + tupleParams.sortby + ")");
                    browser.sleep(2000);
                });

                describe("Presentation ,", function() {
                    var params = recordsetHelpers.testPresentation(tupleParams);
                });

            });

        })(testParams.tuples[i], i);


    }

    it('should load custom CSS and document title defined in chaise-config.js', function() {
        var chaiseConfig = browser.executeScript('return chaiseConfig');
        if (chaiseConfig.customCSS) {
            expect($("link[href='" + chaiseConfig.customCSS + "']").length).toBeTruthy();
        }
        if (chaiseConfig.headTitle) {
            browser.getTitle().then(function(title) {
                expect(title).toEqual(chaiseConfig.headTitle);
            });
        }
    });

});
