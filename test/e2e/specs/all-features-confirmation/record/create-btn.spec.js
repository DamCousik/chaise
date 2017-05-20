var chaisePage = require('../../../utils/chaise.page.js');

describe('View existing record,', function() {

    var params, testConfiguration = browser.params.configuration.tests, testParams = testConfiguration.params;

    for (var i=0; i< testParams.tuples.length; i++) {

        (function(tupleParams, index) {

            describe("For table " + tupleParams.table_name + ",", function() {

                var table, record;

                beforeAll(function() {
                    var keys = [];
                    tupleParams.keys.forEach(function(key) {
                        keys.push(key.name + key.operator + key.value);
                    });
                    browser.ignoreSynchronization=true;
                    var url = browser.params.url + ":" + tupleParams.table_name + "/" + keys.join("&");
                    browser.get(url);
                    table = browser.params.defaultSchema.content.tables[tupleParams.table_name];
                    chaisePage.waitForElement(element(by.id('tblRecord')));
                });

                it('should load chaise-config.js and have editRecord=true', function() {
                    browser.executeScript('return chaiseConfig;').then(function(chaiseConfig) {
                        expect(chaiseConfig.editRecord).toBe(true);
                    });
                });

                describe("Click the create record button ,", function() {
                    it("should redirect to recordedit app", function() {
                        var EC = protractor.ExpectedConditions,
                            createButton = chaisePage.recordPage.getCreateRecordButton();

                        browser.wait(EC.elementToBeClickable(createButton), browser.params.defaultTimeout);

                        createButton.click().then(function() {
                            return browser.driver.getCurrentUrl();
                        }).then(function(url) {
                            expect(url.indexOf('recordedit')).toBeGreaterThan(-1);
                        });
                    });
                });

            });

        })(testParams.tuples[i], i);


    }

});
