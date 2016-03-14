var chaisePage = require('../chaise.page.js');

describe('Search result detail page,', function () {
    var waitTimeAfterClickingEditFilter = 10000;
    var EC = protractor.ExpectedConditions;
    beforeEach(function (done) {
        browser.get('');
        var sidebar = element(by.id('sidebar'));
        browser.wait(EC.visibilityOf(sidebar), 10000).then(function () {
            done();
        });
    });

    describe('should click one random sidebar attribute', function () {
        var randomSidebarAttr = '';
        var randomEditAttr = '';
        var randomRecordTitle = '';
        beforeEach(function (done) {
            var allAttrs = chaisePage.sidebar.sidebarAttrsDisplayed;
            allAttrs.count().then(function (num) {
                    var ranInt = chaisePage.tools.getRandomInt(0, num - 1);
                    var ranAttr = allAttrs.get(ranInt);
                    ranAttr.getText().then(function (attrName) {
                        //avoid 'Somite Count' because it will not show in record page
                        //might need other ways to check it
                        if (attrName === 'Somite Count') {
                            var nextAttr = allAttrs.get(ranInt + 1);
                            nextAttr.getText().then(function (txt) {
                                randomSidebarAttr = txt;
                                console.log(' ');
                                console.log('' + txt);
                                nextAttr.click();
                                done();
                            });
                        } else if (attrName === 'Mouse Chromosome') {
                            var nextAttr = allAttrs.get(ranInt - 1);
                            nextAttr.getText().then(function (txt) {
                                randomSidebarAttr = txt;
                                console.log('' + txt);
                                nextAttr.click();
                                done();
                            });
                        } else if (attrName === 'Investigator') {
                            var nextAttr = allAttrs.get(ranInt + 1);
                            nextAttr.getText().then(function (txt) {
                                randomSidebarAttr = txt;
                                console.log('' + txt);
                                nextAttr.click();
                                done();
                            });
                        } else if (attrName === 'Accession') {
                            var nextAttr = allAttrs.get(ranInt - 1);
                            nextAttr.getText().then(function (txt) {
                                randomSidebarAttr = txt;
                                console.log('' + txt);
                                nextAttr.click();
                                done();
                            });
                        } else {
                            randomSidebarAttr = attrName;
                            ranAttr.getText().then(function (txt) {
                                console.log('' + txt);
                                ranAttr.click();
                                done();
                            });
                        }
                    });
            });
        });

        describe('should check one random edit filter,', function () {
            beforeEach(function (done) {
                var allFilters = chaisePage.editFilter.editFilterAttrsDisplayed;
                allFilters.count().then(function (num) {
                    var ranInt = chaisePage.tools.getRandomInt(0, num - 1);
                    var ranAttr = allFilters.get(ranInt);
                    var randAttrLabel = ranAttr.$('label');
                    ranAttr.getText().then(function (attrName) {
                        randomEditAttr = attrName;
                        console.log('->' + attrName)
                        randAttrLabel.click();
                        setTimeout(function () {
                            done();
                        }, waitTimeAfterClickingEditFilter);
                    });
                });
            });

            describe('should click one random record in results,', function () {
                beforeEach(function (done) {
                    var allResults = chaisePage.resultContent.resultAllRows;
                    allResults.count().then(function (num) {
                        var rand = chaisePage.tools.getRandomInt(0, num - 1);
                        var randResult = allResults.get(rand);
                        var randResultTitle = chaisePage.resultContent.getResultTitleElement(randResult);
                        randResultTitle.getText().then(function (title) {
                            randomRecordTitle = title;
                            console.log('->' + title);
                            randResultTitle.click();
                            browser.rootEl = "#recordApp";
                            browser.ignoreSynchronization = true;
                            var newPageTitleEle = element(by.id('record-bookmark-container'));
                            browser.wait(EC.visibilityOf(newPageTitleEle), 10000).then(function () {
                                done();
                            });
                        });
                    });
                });

                describe('the record detail page,', function () {
                    beforeEach(function (done) {
                        browser.ignoreSynchronization = true;
                        done();
                    });

                    it('should have the same title as previous record column', function (done) {
                        var entityTitle = chaisePage.recordPage.entityTitle;
                        expect(entityTitle.getText()).toBe(randomRecordTitle);
                        done();
                    });

                    it('should display the \'Accession\' key and non-empty content', function (done) {
                        var accessionText = 'accession';
                        var accKey = chaisePage.recordPage.findEntityKeyByName(accessionText);
                        var accValue = chaisePage.recordPage.findEntityValueByName(accessionText);
                        expect(accKey.isDisplayed()).toBe(true);
                        expect(accValue.isDisplayed()).toBe(true);
                        expect(accValue.getText()).not.toBe('');
                        expect(accKey.getText()).toBe('Accession');
                        done();
                    });
                    it('should display the \'Description\' key and non-empty content', function (done) {
                        var desText = 'description';
                        var accKey = chaisePage.recordPage.findEntityKeyByName(desText);
                        var accValue = chaisePage.recordPage.findEntityValueByName(desText);
                        expect(accKey.isDisplayed()).toBe(true);
                        expect(accValue.isDisplayed()).toBe(true);
                        expect(accValue.getText()).not.toBe('');
                        expect(accKey.getText()).toBe('Description');
                        done();
                    });
                    xit('should display the \'Funding\' key and non-empty content', function (done) {
                        var fundingText = 'funding';
                        var accKey = chaisePage.recordPage.findEntityKeyByName(fundingText);
                        var accValue = chaisePage.recordPage.findEntityValueByName(fundingText);
                        expect(accKey.isDisplayed()).toBe(true);
                        expect(accValue.isDisplayed()).toBe(true);
                        expect(accValue.getText()).not.toBe('');
                        expect(accKey.getText()).toBe('Funding');
                        done();
                    }).pend('Some record page may not contain "Funding", ex. Data Type -> Morphometic analysis');
                    xit('should display the \'Pubmed Id\' key and display \'N/A\' or digits', function (done) {
                        var pubmedText = 'pubmed id';
                        var accKey = chaisePage.recordPage.findEntityKeyByName(pubmedText);
                        var accValue = chaisePage.recordPage.findEntityValueByName(pubmedText);
                        expect(accKey.isDisplayed()).toBe(true);
                        expect(accValue.isDisplayed()).toBe(true);
                        expect(accValue.getText()).toMatch('(^[0-9]*$|^N/A$)');
                        expect(accKey.getText()).toBe('Pubmed Id');
                        done();
                    }).pend('Some record page may not contain "Pumbed Id", ex. Mouse Phenotype -> Normative');

                    it('should contain the randomly chosen attribute field (' + randomSidebarAttr + ')', function (done) {
                        var sidebarAttr = randomSidebarAttr.toLowerCase();
                        var sidebarAttrKey = chaisePage.recordPage.findEntityKeyByName(sidebarAttr);
                        expect(sidebarAttrKey.isDisplayed()).toBe(true);
                        done();
                    });

                    it('should contain the randomly chosen edit filter (' + randomEditAttr + ')' +
                        ' in attribute value', function (done) {
                        var sidebarAttr = randomSidebarAttr.toLowerCase();
                        var sidebarAttrValue = chaisePage.recordPage.findEntityValueByName(sidebarAttr);
                        expect(sidebarAttrValue.isDisplayed()).toBe(true);
                        sidebarAttrValue.getText().then(function (valueText) {
                            expect(valueText.toLowerCase()).toContain(randomEditAttr.toLowerCase());
                            done();
                        });
                    });

                    xit('should display \'Files\', toggle it ' +
                        'to display file icon or \'No rows found\'', function (done) {
                        var fileWrapper = chaisePage.recordPage.findToggleWrapperByName('Files');
                        expect(fileWrapper.isDisplayed()).toBe(true);
                        expect(fileWrapper.getText()).toBe('FILES');
                        chaisePage.recordPage.clickToggleWrapperByName('Files');
                        //var activeEle = fileWrapper.$('div[ng-class="{\'active\': files.open }"]');
                        //chaisePage.customExpect.elementContainClass(activeEle, 'active');
                        var collapseArea = fileWrapper.$('div.panel-collapse');
                        expect(collapseArea.isDisplayed()).toBe(true);
                        collapseArea.getText().then(function (text) {
                            //after testing, test.toLowerCase() will be exactly 'no rows found'
                            if (text.toLowerCase() !== 'no rows found') {
                                var fileImg = collapseArea.$('img');
                                expect(fileImg.isDisplayed()).toBe(true);
                                done();
                            } else {
                                done();
                            }
                        });
                    }).pend('Some record page may not contain "Files", ex. Organism -> Human');

                    it('should display \'Dataset Geo\', toggle it to display something', function (done) {
                        var dataset = 'dataset geo';
                        var dataSetWrapper = chaisePage.recordPage.findToggleWrapperByName(dataset);
                        chaisePage.recordPage.clickToggleWrapperByName(dataset);
                        var collapseArea = dataSetWrapper.$('div.panel-collapse');
                        expect(collapseArea.isDisplayed()).toBe(true);
                        done();
                    });

                });

                afterEach(function (done) {
                    browser.rootEl = "#main-content";
                    browser.ignoreSynchronization = false;
                    done();
                });


            });

        });

    });


});
