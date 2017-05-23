var chaisePage = require('../../utils/chaise.page.js'),
IGNORE = "tag:isrd.isi.edu,2016:ignore",
HIDDEN = "tag:misd.isi.edu,2015:hidden",
IMMUTABLE = "tag:isrd.isi.edu,2016:immutable",
GENERATED = "tag:isrd.isi.edu,2016:generated";
var chance = require('chance').Chance();
var moment = require('moment');
var EC = protractor.ExpectedConditions;
var exec = require('child_process').execSync;

exports.testPresentationAndBasicValidation = function(tableParams) {

    var visibleFields = [];
    
	if (tableParams.keys) {
		it("should have edit record title", function() {
            var EC = protractor.ExpectedConditions;

            browser.wait(EC.visibilityOf(chaisePage.recordEditPage.getFormTitle()), browser.params.defaultTimeout);
            var title = chaisePage.recordEditPage.getFormTitle();
            expect(title.getText()).toEqual("Edit " + tableParams.edit_entity_displayname + " Record");
		});

		it("should not allow to add new rows/columns", function() {
			chaisePage.recordEditPage.getAddRowButton().then(function(button) {
				if (button) expect("Add button visible").toBe("Add Button should not be visible");
				else expect(true).toBeDefined();
			});
		});

	} else {
		it("should have create record title", function() {
            var EC = protractor.ExpectedConditions;

            browser.wait(EC.visibilityOf(chaisePage.recordEditPage.getFormTitle()), browser.params.defaultTimeout);

			chaisePage.recordEditPage.getEntityTitle().then(function(txt) {
				expect(txt).toBe("Create " + tableParams.create_entity_displayname + " Records");
			});
		});

		it("should allow to add new rows/columns", function() {
			chaisePage.recordEditPage.getAddRowButton().then(function(button) {
				if (!button) expect("Add button invisible").toBe("Add Button should be visible");
				else expect(true).toBeDefined();
			});
		});
	}

	it("should render columns which are inside the visible columns annotation if defined; Default all are visible", function() {
		var columns = tableParams.columns;
		chaisePage.recordEditPage.getAllColumnCaptions().then(function(pageColumns) {
			expect(pageColumns.length).toBe(columns.length);
			pageColumns.forEach(function(c) {
				c.getAttribute('innerHTML').then(function(txt) {
					txt = txt.trim();
					var col = columns.find(function(cl) {
                        return txt == cl.title;
                    });
					expect(col).toBeDefined();
					c.column = col;
					visibleFields.push(c);
				});
			});
		});
	});

	it("should show line under columns which have a comment", function() {
		var columns = tableParams.columns.filter(function(c) { if (c.comment) return true; });
		chaisePage.recordEditPage.getColumnsWithUnderline().then(function(pageColumns) {
			expect(pageColumns.length).toBe(columns.length);
			pageColumns.forEach(function(c) {
				c.getText().then(function(txt) {
					txt = txt.trim();
					var col = columns.find(function(cl) { return txt == cl.title });
					expect(txt).toBe(col ? col.title : " should not have underline");
					if (col) {
						expect(c.getAttribute("uib-tooltip")).toBe(col.comment);
					}
				});
			});
		});
	});

	it("should show red asterisk (*) before for fields which are required", function() {
		var columns = tableParams.columns.filter(function(c) { if (c.nullok === false && !c.generated && !c.immutable) return true; });
		console.log("\n        Required Fields");
		columns.forEach(function(c) {
            var el = visibleFields.find(function(v) { return v.column.name == c.name });
			chaisePage.recordEditPage.getColumnWithAsterisk(el).then(function(el) {
				console.log("         ->" + c.title);
				if (el) expect(true).toBeDefined();
				else expect(undefined).toBe("Asterisk");
			});
		});
	});

	var testMultipleRecords = function(recordIndex) {

		var title = tableParams.records ? "Record " + (recordIndex + 1) : "Editing";

		describe(title + ",",function() {

			if (recordIndex > 0) {
				it("should click add record button", function() {
					chaisePage.recordEditPage.getAddRowButton().then(function(button) {
						chaisePage.clickButton(button);
                        browser.wait(function() {
                            return chaisePage.recordEditPage.getForms().count().then(function(ct) {
                                return (ct == recordIndex + 1);
                            });
                        }, browser.params.defaultTimeout);
					});
				});
			};

			var longTextDataTypeFields = [], textDataTypeFields = [], booleanDataTypeFields = [], foreignKeyFields = [], datePickerFields = [], integerDataTypeFields = [], floatDataTypeFields = [];

            it("should show columns with generated or immutable annotations as disabled", function() {
                var disabledCols = tableParams.columns.filter(function(c) { if (c.generated || c.immutable) return true; });
           
                disabledCols.forEach(function(column) {
                    if (column.type == 'timestamp' || column.type == 'timestamptz') {
                        var timeInputs = chaisePage.recordEditPage.getTimestampInputsForAColumn(column.name, recordIndex);
                        var dateInput = timeInputs.date, timeInput = timeInputs.time, meridiemBtn = timeInputs.meridiem;
                        expect(dateInput.isEnabled()).toBe(false);
                        expect(timeInput.isEnabled()).toBe(false);
                        expect(meridiemBtn.isEnabled()).toBe(false);
                    } else {
                        chaisePage.recordEditPage.getInputForAColumn(column.name, recordIndex).then(function(input) {
                            expect(input.isEnabled()).toBe(false);
                            if (!tableParams.keys) {
                                expect(input.getAttribute('placeholder')).toBe('Automatically generated');
                            }
                        }).catch(function(e) {
                            console.log(e);
                        });
                    }
                });
            });

			it("should show textarea input for longtext datatype and then set the value", function() {
				var columns = tableParams.columns.filter(function(c) { if ((c.type === "longtext" ) && !c.isForeignKey) return true; });
				columns.forEach(function(c) {
					chaisePage.recordEditPage.getTextAreaForAcolumn(c.name, recordIndex).then(function(txtArea) {
						if (txtArea) {
							expect(true).toBeDefined();
							longTextDataTypeFields.push(txtArea);

							if (c._value != undefined) {
								expect(txtArea.getAttribute('value')).toBe(c._value);
							}

							chaisePage.recordEditPage.clearInput(txtArea);
							browser.sleep(10);

							txtArea.column = c;
							var text = chance.paragraph();
							c._value = text;
							txtArea.sendKeys(text);

							expect(txtArea.getAttribute('value')).toBeDefined(text);
						} else {
							expect(undefined).toBeDefined();
						}
					});
				});
			});



			it("should show text input for shorttext and text datatype", function() {

				var columns = tableParams.columns.filter(function(c) { if ((c.type === "shorttext" || c.type === "text") && !c.isForeignKey && !c.isFile) return true; });

				columns.forEach(function(c) {
					chaisePage.recordEditPage.getInputForAColumn(c.name, recordIndex).then(function(txtInput) {
						if (txtInput) {
							expect(true).toBeDefined();
							textDataTypeFields.push(txtInput);
							txtInput.column = c;

							if (c._value != undefined) {
								expect(txtInput.getAttribute('value')).toBe(c._value);
							}

							chaisePage.recordEditPage.clearInput(txtInput);
							browser.sleep(10);

							var text = c.isUrl ? chance.url() : chance.sentence({ words: 5 });
							c._value = text;
							txtInput.sendKeys(text);

							expect(txtInput.getAttribute('value')).toBeDefined(text);
						} else {
							expect(undefined).toBeDefined();
						}
					});
				});
			});

			describe("Boolean fields,", function() {

				var pageColumns = [], columns = [], dropdowns = [];

				beforeAll(function() {
					columns = tableParams.columns.filter(function(c) { if (c.type === "boolean" && !c.isForeignKey) return true; });

					chaisePage.recordEditPage.getAllColumnCaptions().then(function(pcs) {
						pcs.forEach(function(pc) {
							pc.getAttribute('innerHTML').then(function(txt) {
								txt = txt.trim();
								var col = columns.find(function(cl) { return txt == cl.title });
								if (col) {
									pc.column = col;
									pageColumns.push(pc);
								}
							});
						});
					});
				});


				it("should show a dropdown", function() {
					console.log("\n        Boolean Fields");
					pageColumns.forEach(function(pc) {
						chaisePage.recordEditPage.getDropdown(pc, recordIndex).then(function(dropdown) {
							console.log("         ->" + pc.column.name);
							if (dropdown) {
								expect(true).toBeDefined();
								dropdown.column = pc.column;

								if (dropdown.column._value != undefined) {
									expect(chaisePage.recordEditPage.getDropdownText(dropdown)).toBe(dropdown.column._value.length == 0 ? 'Select a value' : (dropdown.column._value + ""));
								}

								dropdowns.push(dropdown);
								booleanDataTypeFields.push(dropdown);
							} else {
								expect(undefined).toBeDefined();
							}
						});
					});
				});

				it("should render 3 options for a boolean field if nullok is true else 2", function() {
					dropdowns.forEach(function(dropdown) {
						browser.executeScript("return $(arguments[0]).data().$scope.$select.items", dropdown).then(function(items) {
							if (dropdown.column.nullok == false) {
								expect(items.length).toBe(2);
							} else {
								expect(items.length).toBe(3);
							}
						});
					});
				});

				it("should select an option (true, false, none)", function() {
					dropdowns.forEach(function(dropdown) {
						var value = chance.bool();
						/*if (dropdown.column.nullok == true) {
							if (chance.bool()) value = "";
						} */
						dropdown.column._value = value;
						chaisePage.recordEditPage.selectDropdownValue(dropdown, value).then(function() {
							browser.sleep(10);
							expect(chaisePage.recordEditPage.getDropdownText(dropdown)).toBe(value.length == 0 ? 'Select a value' : (value + ""));
						});
					});
				});

			});

			describe("Foreign key fields,", function() {

				var pageColumns = [], columns = [], dropdowns = [];

				beforeAll(function() {
					columns = tableParams.columns.filter(function(c) { if (c.isForeignKey) return true; });

					chaisePage.recordEditPage.getAllColumnCaptions().then(function(pcs) {
						pcs.forEach(function(pc) {
							pc.getAttribute('innerHTML').then(function(txt) {
								txt = txt.trim();
								var col = columns.find(function(cl) { return txt == cl.title });
								if (col) {
									pc.column = col;
									pageColumns.push(pc);
								}
							});
						});
					});
				});

                it('should show an uneditable field for each foreign key column', function() {
                    var expectedNumOfPopupFields = columns.length * (recordIndex + 1);
                    var popupFields = element.all(by.css('.popup-select-value'));
                    expect(popupFields.count()).toBe(expectedNumOfPopupFields);
                    // Ensure each field is an uneditable div element (not an input)
                    popupFields.map(function(field) {
                        expect(field.getTagName()).toBe('div');
                        expect(field.getAttribute('contenteditable')).toBe('false');
                    });
                });

                // in the edit case
                if (!tableParams.records) {

                    it("clicking the 'x' should remove the value in the foreign key field.", function () {
                        var foreignKeyInput = chaisePage.recordEditPage.getForeignKeyInputValue(columns[0].title, recordIndex);
                        //the first foreignkey input for editing should be pre-filled
                        expect(foreignKeyInput.getAttribute("value")).toBeDefined();

                        chaisePage.recordEditPage.getForeignKeyInputRemoveBtns().then(function(foreignKeyInputRemoveBtn) {
                        	return chaisePage.clickButton(foreignKeyInputRemoveBtn[0]);
                        }).then(function() {
                            // value is empty string after removing it
                            expect(foreignKeyInput.getAttribute("value")).toBe('');
                        });
                    });

                    it("clicking 'x' in the model should close it without returning a value.", function () {
                        var modalClose = chaisePage.recordEditPage.getModalCloseBtn(),
                            EC = protractor.ExpectedConditions;

                        chaisePage.recordEditPage.getModalPopupBtnsUsingScript().then(function(popupBtns) {
                        	return chaisePage.clickButton(popupBtns[0]);
                        }).then(function() {
                            // wait for the modal to open
                            browser.wait(EC.visibilityOf(modalClose), browser.params.defaultTimeout);
                            return modalClose.click();
                        }).then(function() {
                            var foreignKeyInput = chaisePage.recordEditPage.getForeignKeyInputValue(columns[0].title, recordIndex);
                            expect(foreignKeyInput.getAttribute("value")).toBe('');
                        });
                    });
				}

                it("should open a modal search and select a foreign key value.", function () {
                    chaisePage.recordEditPage.getModalPopupBtnsUsingScript().then(function(popupBtns) {
                    	var modalTitle = chaisePage.recordEditPage.getModalTitle(),
                        	EC = protractor.ExpectedConditions;

                    	expect(popupBtns.length).toBe(columns.length * (recordIndex + 1));

	                    for (var i=0; i<columns.length; i++) {
	                        (function(i) {
	                            var rows;
	                            chaisePage.clickButton(popupBtns[(columns.length * recordIndex) + i ]).then(function() {
	                                // wait for the modal to open
	                                browser.wait(EC.visibilityOf(modalTitle), browser.params.defaultTimeout);
                                    // Expect search box to have focus
                                    var searchBox = chaisePage.recordsetPage.getSearchBox();
                                    browser.wait(function() {
                                        var searchBoxId, activeElement;
                                        return searchBox.getAttribute('id').then(function(id) {
                                            searchBoxId = id;
                                            return browser.driver.switchTo().activeElement().getAttribute('id');
                                        }).then(function(activeId) {
                                            activeElement = activeId;
                                            return activeId == searchBoxId;
                                        });
                                    }, browser.params.defaultTimeout).then(function() {
                                        expect(searchBox.getAttribute('id')).toEqual(browser.driver.switchTo().activeElement().getAttribute('id'));
                                    });
	                                return modalTitle.getText();
	                            }).then(function(text) {
	                                // make sure modal opened
	                                expect(text.indexOf("Choose")).toBeGreaterThan(-1);
                                    browser.wait(function () {
                                        return chaisePage.recordsetPage.getRows().count().then(function (ct) {
                                            return (ct > 0);
                                        });
                                    });
	                                rows = chaisePage.recordsetPage.getRows();
	                                // count is needed for clicking a random row
	                                return rows.count();
	                            }).then(function(ct) {
	                                expect(ct).toBeGreaterThan(0);

	                                var index = Math.floor(Math.random() * ct);
	                                return rows.get(index).all(by.css(".select-action-button"));
								}).then(function(selectButtons) {
									return selectButtons[0].click();
	                            }).then(function() {
	                                browser.wait(EC.visibilityOf(chaisePage.recordEditPage.getFormTitle()), browser.params.defaultTimeout);
	                                var foreignKeyInput = chaisePage.recordEditPage.getForeignKeyInputValue(columns[i].title, recordIndex);
	                                expect(foreignKeyInput.getAttribute("value")).toBeDefined();
                                    // Open the same modal again to make sure search box is autofocused again
                                    return chaisePage.clickButton(popupBtns[(columns.length * recordIndex) + i ]);
	                            }).then(function() {
                                    // Wait for the modal to open
	                                browser.wait(EC.visibilityOf(modalTitle), browser.params.defaultTimeout);
                                    // Expect search box to have focus.
                                    var searchBox = chaisePage.recordsetPage.getSearchBox();
                                    browser.wait(function() {
                                        var searchBoxId, activeElement;
                                        return searchBox.getAttribute('id').then(function(id) {
                                            searchBoxId = id;
                                            return browser.driver.switchTo().activeElement().getAttribute('id');
                                        }).then(function(activeId) {
                                            activeElement = activeId;
                                            return activeId == searchBoxId;
                                        });
                                    }, browser.params.defaultTimeout).then(function() {
                                        expect(searchBox.getAttribute('id')).toEqual(browser.driver.switchTo().activeElement().getAttribute('id'));
                                    });
                                    // Close the modal
                                    chaisePage.recordEditPage.getModalCloseBtn().click();
                                }).catch(function(e) {
                                    console.dir(e);
                                    expect('Something went wrong in this promise chain').toBe('Please see error message.');
                                });
	                        })(i);
	                    }
                    });

                });
			});

			describe("Date fields,", function() {
                it('should show input fields and validate for date columns', function() {
                	var columns = tableParams.columns.filter(function(c) { if (c.type == "date" && !c.isForeignKey) return true; });
                    columns.forEach(function(column) {
                        var dateInput = chaisePage.recordEditPage.getInputValue(column.name, recordIndex);
                        datePickerFields.push(dateInput);
                        if (column._value != undefined) {
							expect(dateInput.getAttribute('value')).toBe(column._value);
						}

                        chaisePage.recordEditPage.clearInput(dateInput);

                        dateInput.sendKeys('1234-13-31');
                        expect(dateInput.getAttribute('value')).toBeFalsy();
                        chaisePage.recordEditPage.getDateInputErrorMessage(dateInput, 'date').then(function(error) {
                            expect(error).toBeTruthy();
                        });

                        chaisePage.recordEditPage.clearInput(dateInput);

                        dateInput.sendKeys('2016-01-01');
                        expect(dateInput.getAttribute('value')).toEqual('2016-01-01');
                        chaisePage.recordEditPage.getDateInputErrorMessage(dateInput, 'date').then(function(error) {
                            expect(error).toBeFalsy();
                        });
                    });
                });

                it('\"Today\" button should enter the current date into the input', function() {
                    var today = moment().format('YYYY-MM-DD');
                    datePickerFields.forEach(function(dp) {
                        var todayBtn = dp.all(by.css('.input-group-btn > button'))[0];
                        todayBtn.click();
                        expect(dp.getAttribute('value')).toEqual(today);
                    });
                });

                it('\"Clear\" button clear the date input respectively', function() {
                    datePickerFields.forEach(function(dp) {
                        var clearBtn = dp.all(by.css('.input-group-btn > button'))[1];
                        expect(dp.getAttribute('value')).toBeFalsy();
                    });
                });

				it("should have a datepicker element", function() {
					console.log("\n        Date/Timestamptz fields");
					var columns = tableParams.columns.filter(function(c) { if (c.type == "date" && !c.isForeignKey) return true; });
					columns.forEach(function(column) {
						chaisePage.recordEditPage.getInputValue(column.name, recordIndex).then(function(dateInput) {
							console.log("         ->" + column.name);
							if (dateInput) {
								expect(true).toBeDefined();
								dateInput.column = column;
								datePickerFields.push(dateInput);

								if (column._value != undefined) {
									expect(dateInput.getAttribute('value')).toBe(column._value);
								}
							} else {
								expect(undefined).toBeDefined();
							}
						});
					});
				}).pend('Postpone test until a datepicker is re-implemented');

				it("should render open datepicker on click", function() {
					datePickerFields.forEach(function(dp) {
						chaisePage.clickButton(dp);
						browser.sleep(10);
						chaisePage.recordEditPage.getDatePickerForAnInput(dp).then(function(datePicker) {
							if (datePicker) {
								expect(true).toBeDefined();
							} else {
								expect(undefined).toBeDefined();
							}
							dp.datePicker = datePicker;
						});
					});
				}).pend('Postpone test until a datepicker is re-implemented');

				it("should select a date , and check the value", function() {
					datePickerFields.forEach(function(dateInput) {
						chaisePage.clickButton(dateInput);
						browser.sleep(10);
						chaisePage.recordEditPage.getDayButtonsForDatePicker(dateInput.datePicker).then(function(dayBtns) {
							var day = chaisePage.recordEditPage.getRandomInt(1, dayBtns.length);
							console.log(dayBtns.length);
							dayBtns[day-1].click();

							var month = ((new Date()).getMonth() + 1);
							month = (month < 10) ? "0" + month : month;
							day = (day < 10) ? "0" + day : day;

							var date = (new Date()).getFullYear() + "-" + month + "-"  + day;
							expect(dateInput.getAttribute('value')).toBe(date);

							dateInput.column._value = date;

							// Required error message should disappear
							chaisePage.recordEditPage.getDateInputErrorMessage(dateInput, 'required').then(function(err) {
								if (err) {
									expect(undefined).toBe("Date input " + dateInput.column.name + " Required Error message to be hidden");
								} else {
									expect(true).toBeDefined();
								}
							});
						});
					});
				}).pend('Postpone test until a datepicker is re-implemented');
			});

            describe("Timestamp fields,", function() {
                var timeInputFields = [];
                var columns;

                it('should have 3 inputs with validation for each timestamp column', function() {
                	columns = tableParams.columns.filter(function(c) { if (( c.type == "timestamptz" || c.type == "timestamp") && !c.isForeignKey ) return true; });
                    
                    columns.forEach(function(column) {
                        var timeInputs = chaisePage.recordEditPage.getTimestampInputsForAColumn(column.name, recordIndex);
                        var dateInput = timeInputs.date, timeInput = timeInputs.time, meridiemBtn = timeInputs.meridiem;

                        expect(dateInput).toBeDefined();
                        expect(timeInput).toBeDefined();
                        expect(meridiemBtn).toBeDefined();

                        // Test toggling of meridiem button
                        // Testing meridiem before the time input test because toggling btn should work
                        // with or without input in the other fields (i.e. date and time input fields).
                        var initialMeridiem = '';
                        meridiemBtn.getText().then(function(text) {
                            initialMeridiem = text;
                            return meridiemBtn.click();
                        }).then(function() {
                            return meridiemBtn.getText();
                        }).then(function(newText) {
                            if (initialMeridiem == 'AM') {
                                expect(newText).toEqual('PM');
                            } else {
                                expect(newText).toEqual('AM');
                            }
                            return meridiemBtn.click();
                        }).then(function() {
                            return meridiemBtn.getText();
                        }).then(function(newText) {
                            expect(newText).toEqual(initialMeridiem);
                        }).catch(function(error) {
                            console.log(error);
                            expect('There was an error in this promise chain.').toBe('Please see the error message.');
                        });

                        // If user enters an invalid time an error msg should appear
                        timeInput.clear();
                        timeInput.sendKeys('24:12:00'); // this is invalid because we're only accepting 24-hr time formats from 0-23
                        chaisePage.recordEditPage.getTimestampInputErrorMessage(timeInput, 'time').then(function(error) {
                            if (error) {
                                expect(true).toBe(true);
                                expect(true).toBe(true);
                            }
                        });

                        // If user enters a valid time, then error msg should disappear
                        timeInput.clear();
                        timeInput.sendKeys('12:00:00');
                        chaisePage.recordEditPage.getTimestampInputErrorMessage(timeInput, 'time').then(function(error) {
                            if (error) {
                                expect('An error message was not supposed to appear.').toBe('But one was found.');
                            } else {
                                expect(true).toBe(true);
                            }
                        });
                        timeInput.clear();
                        // users can enter 1 digit in any place
                        timeInput.sendKeys('2:00:00');
                        chaisePage.recordEditPage.getTimestampInputErrorMessage(timeInput, 'time').then(function(error) {
                            if (error) {
                                expect('An error message was not supposed to appear.').toBe('But one was found.');
                            } else {
                                expect(true).toBe(true);
                            }
                        });
                        timeInput.clear();
                        // users can enter just the hours
                        timeInput.sendKeys('08');
                        chaisePage.recordEditPage.getTimestampInputErrorMessage(timeInput, 'time').then(function(error) {
                            if (error) {
                                expect('An error message was not supposed to appear.').toBe('But one was found.');
                            } else {
                                expect(true).toBe(true);
                            }
                        });
                        timeInput.clear();
                        // users can enter less than the full string
                        timeInput.sendKeys('2:10');
                        chaisePage.recordEditPage.getTimestampInputErrorMessage(timeInput, 'time').then(function(error) {
                            if (error) {
                                expect('An error message was not supposed to appear.').toBe('But one was found.');
                            } else {
                                expect(true).toBe(true);
                            }
                        });
                        timeInput.clear();
                        // users can enter time in 24 hr format
                        timeInput.sendKeys('20:00:00');
                        chaisePage.recordEditPage.getTimestampInputErrorMessage(timeInput, 'time').then(function(error) {
                            if (error) {
                                expect('An error message was not supposed to appear.').toBe('But one was found.');
                            } else {
                                expect(true).toBe(true);
                            }
                        });
                        timeInput.clear();
                        // users can enter 0 for the time
                        timeInput.sendKeys('00:00:00');
                        chaisePage.recordEditPage.getTimestampInputErrorMessage(timeInput, 'time').then(function(error) {
                            if (error) {
                                expect('An error message was not supposed to appear.').toBe('But one was found.');
                            } else {
                                expect(true).toBe(true);
                            }
                        });

                        // Invalid date + good time = error
                        // If user enters a valid time but no date, an error msg should appear
                        dateInput.clear();
                        timeInput.clear();
                        timeInput.sendKeys('12:00:00');
                        chaisePage.recordEditPage.getTimestampInputErrorMessage(timeInput, 'timestampDate').then(function(error) {
                            if (error) {
                                expect(true).toBe(true);
                            } else {
                                expect('An error message was supposed to appear.').toBe('But none were found.');
                            }
                            // Good date + good time = no error
                            // Now, if user enters a valid date, then no error message should appear
                            return dateInput.sendKeys('2016-01-01');
                        }).then(function() {
                            return chaisePage.recordEditPage.getTimestampInputErrorMessage(timeInput, 'timestampDate');
                        }).then(function(error) {
                            if (error) {
                                expect('An error message was not supposed to appear.').toBe('But one was found.');
                            } else {
                                expect(true).toBe(true);
                            }
                            // Good date + null time = no error
                            return timeInput.clear();
                        }).then(function() {
                            return chaisePage.recordEditPage.getTimestampInputErrorMessage(timeInput, 'timestampTime');
                        }).then(function(error) {
                            if (error) {
                                expect('An error message was not supposed to appear.').toBe('But one was found.');
                            } else {
                                expect(true).toBe(true);
                            }
                        });

                        // toggle after data is input as well
                        meridiemBtn.click().then(function() {
                            return meridiemBtn.getText();
                        }).then(function(newText) {
                            if (initialMeridiem == 'AM') {
                                expect(newText).toEqual('PM');
                            } else {
                                expect(newText).toEqual('AM');
                            }
                            return meridiemBtn.click();
                        }).then(function() {
                            return meridiemBtn.getText();
                        }).then(function(newText) {
                            expect(newText).toEqual(initialMeridiem);
                        }).catch(function(error) {
                            console.log(error);
                            expect('There was an error in this promise chain.').toBe('Please see the error message.');
                        });

                        timeInputFields.push({
                            date: dateInput,
                            time: timeInput,
                            meridiem: meridiemBtn,
                            column: column
                        });
                    });
                });

                it('should clear the input after clicking the \"Clear\" button', function() {
                    timeInputFields.forEach(function(obj) {
                        var clearBtn = element.all(by.css('button[name="' + obj.column.name + '"]')).get(2);
                        clearBtn.click();
                        expect(obj.date.getAttribute('value')).toBeFalsy();
                        expect(obj.time.getAttribute('value')).toBeFalsy();
                        expect(obj.meridiem.getText()).toEqual('AM');
                    });
                });

                it('should have the current time after clicking the \"Now\" button', function() {
                    timeInputFields.forEach(function(obj) {
                        var nowBtn = element.all(by.css('button[name="' + obj.column.name + '"]')).get(1);
                        var UIdate, date = moment().format('YYYY-MM-DD');
                        var UItime, time = moment().format('x'); // in milliseconds
                        var timeDelta = 60 * 1000; // 1 minute, in milliseconds
                        var startTime = time - timeDelta, endTime = time + timeDelta;
                        var meridiem = moment().format('A');

                        nowBtn.click();
                        obj.date.getAttribute('value').then(function(dateVal) {
                            // Check date input
                            UIdate = dateVal;
                            expect(dateVal).toEqual(date);
                            return obj.time.getAttribute('value');
                        }).then(function(timeVal) {
                            // Check time input value is within an interval
                            UItime = timeVal;
                            var UItimestamp = moment(UIdate + UItime, 'YYYY-MM-DDhh:mm').format('x'); // in milliseconds
                            expect(startTime < UItimestamp < endTime).toBeTruthy();
                            return obj.meridiem.getText();
                        }).then(function(meridiemVal) {
                            // Check meridiem btn
                            expect(meridiemVal).toEqual(meridiem);
                        }).catch(function(error) {
                            console.log(error);
                        });
                    });
                });
            });

			describe("Integer fields,", function() {
				it("should render input type as number with integer attribute", function() {
					console.log("\n       Integer Fields");
					
					var columns = tableParams.columns.filter(function(c) { if (c.type.startsWith("int") && !c.isForeignKey) return true; });

					columns.forEach(function(column) {
						chaisePage.recordEditPage.getIntegerInputForAColumn(column.name, recordIndex).then(function(intInput) {
							console.log("         ->" + column.name);
							if (intInput) {
								expect(true).toBeDefined();
								intInput.column = column;
								integerDataTypeFields.push(intInput);

								if (column._value != undefined) {
									expect(intInput.getAttribute('value')).toBe(column._value);
								}

							} else {
								expect(undefined).toBeDefined();
							}
						});
					});
				});

				it("should validate required and invalid text input", function() {
					integerDataTypeFields.forEach(function(intInput) {

						var prevValue = "";

						// Clear value if it is in edit mode
						if (tableParams.primary_keys.indexOf(intInput.column.name) != -1) {
							intInput.getAttribute("value").then(function(value) {
								prevValue = value + "";
							});
						}
						chaisePage.recordEditPage.clearInput(intInput);

						if (intInput.column.nullok == false && !intInput.column.generated && !intInput.column.immutable) {
							chaisePage.recordEditPage.submitForm();
							chaisePage.recordEditPage.getInputErrorMessage(intInput, 'required').then(function(err) {
								if(err) {
									expect(true).toBeDefined();
								} else {
									expect(undefined).toBe("Integer input " + intInput.column.name + " Required Error message to be displayed");
								}
							});
						}

						// Invalid text value
						var text = "1j2yu", actualValue = "12";
						intInput.sendKeys(text);
						expect(intInput.getAttribute('value')).toBe(actualValue);

						// Required Error message should disappear;
						chaisePage.recordEditPage.getInputErrorMessage(intInput, 'required').then(function(err) {
							if (err) {
								expect(undefined).toBe("Integer input " + intInput.column.name + " Required Error message to be hidden");
							} else {
								expect(true).toBeDefined();
							}
						});

						// Clear value
						chaisePage.recordEditPage.clearInput(intInput);
						expect(intInput.getAttribute('value')).toBe("");

						//Restore the value to the original one
						if (tableParams.primary_keys.indexOf(intInput.column.name) != -1) {
							intInput.sendKeys(prevValue);
						}
					});
				});

				it("should validate int8(-9223372036854776000 < value < 9223372036854776000), int4(-2147483648 < value < 2147483647) and int2(-32768 < value < 32767) with range values", function() {

					integerDataTypeFields.forEach(function(intInput) {
						var min = -9223372036854776000, max = 9223372036854776000, invalidMaxNo = "2343243243242414423243242353253253253252352", invalidMinNo = "-2343243243242414423243242353253253253252352";
						if (intInput.column.type == 'int2') {
							min = -32768, max = 32767, invalidMaxNo = "8375832757832", invalidMinNo = "-237587565";
						} else if (intInput.column.type == 'int4') {
							min = -2147483648, max = 2147483647, invalidMaxNo = "3827374576453", invalidMinNo = "-326745374576375";
						}

						var validNo = chaisePage.recordEditPage.getRandomInt(min, max) + "", invalidMaxNo = "2343243243242414423243242353253253253252352", invalidMinNo = "-2343243243242414423243242353253253253252352";

						// Store original value to reset it for avoiding any conflicts or referece issues due to unique or foreign key issue
						if (tableParams.primary_keys.indexOf(intInput.column.name) != -1) {
							intInput.getAttribute("value").then(function(value) {
								validNo = value + "";
							});
						}

						// Clear value if it is in edit mode
						chaisePage.recordEditPage.clearInput(intInput);

						// Check for invalid maximum number
						intInput.sendKeys(invalidMaxNo);
						chaisePage.recordEditPage.getInputErrorMessage(intInput, 'max').then(function(err) {
							if (err) {
								expect(true).toBeDefined();
							} else {
								expect(undefined).toBe("Integer input " + intInput.column.name + " Max Error message to be displayed");
							}
						});


						// Clear value
						chaisePage.recordEditPage.clearInput(intInput);
						expect(intInput.getAttribute('value')).toBe("");

						chaisePage.recordEditPage.getInputErrorMessage(intInput, 'max').then(function(err) {
							if (err) {
								expect(undefined).toBe("Integer input " + intInput.column.name + " Max Error message to be hidden");
							} else {
								expect(true).toBeDefined();
							}
						});

						// Check for invalid minimum number
						intInput.sendKeys(invalidMinNo);
						chaisePage.recordEditPage.getInputErrorMessage(intInput, 'min').then(function(err) {
							if (err) {
								expect(true).toBeDefined();
							} else {
								expect(undefined).toBe("Integer input " + intInput.column.name + " Min Error message to be displayed");
							}
						});

						// Clear value
						chaisePage.recordEditPage.clearInput(intInput);
						expect(intInput.getAttribute('value')).toBe("");

						chaisePage.recordEditPage.getInputErrorMessage(intInput, 'min').then(function(err) {
							if (err) {
								expect(undefined).toBe("Integer input " + intInput.column.name + " Min Error message to be hidden");
							} else {
								expect(true).toBeDefined();
							}
						});

						// Check for a valid number
						intInput.sendKeys(validNo);
						expect(intInput.getAttribute('value')).toBe(validNo);

						intInput.column._value = validNo;

						chaisePage.recordEditPage.getInputErrorMessage(intInput, 'max').then(function(err) {
							if (err) {
								expect(undefined).toBe("Integer input " + intInput.column.name + " Max Error message to be hidden");
							} else {
								expect(true).toBeDefined();
							}
						});

						chaisePage.recordEditPage.getInputErrorMessage(intInput, 'min').then(function(err) {
							if (err) {
								expect(undefined).toBe("Integer input " + intInput.column.name + " Min Error message to be hidden");
							} else {
								expect(true).toBeDefined();
							}
						});

					});

				});

			});

			describe("Float fields,", function() {

				it("should render input type as number with float attribute", function() {
					console.log("\n       Float Fields");
					var columns = tableParams.columns.filter(function(c){ if ((c.type.startsWith('float') ||  c.type.startsWith('numeric')) && !c.isForeignKey) return true; });
					columns.forEach(function(column) {
						chaisePage.recordEditPage.getFloatInputForAColumn(column.name, recordIndex).then(function(floatInput) {
							console.log("         ->" + column.name);
							if (floatInput) {
								expect(true).toBeDefined();
								floatInput.column = column;
								floatDataTypeFields.push(floatInput);
								if (column._value != undefined) {
									expect(floatInput.getAttribute('value')).toBe(column._value);
								}
							} else {
								expect(undefined).toBeDefined();
							}
						});
					});
				});

				it("should validate invalid text input", function() {
					floatDataTypeFields.forEach(function(floatInput) {

						var validNo = chaisePage.recordEditPage.getRandomArbitrary() + "";

						// Clear value if it is in edit mode
						if (tableParams.primary_keys.indexOf(floatInput.column.name) != -1) {
							floatInput.getAttribute("value").then(function(value) {
								validNo = value + "";
							});
						}
						chaisePage.recordEditPage.clearInput(floatInput);

						if (floatInput.column.nullok == false) {
							chaisePage.recordEditPage.submitForm();
							chaisePage.recordEditPage.getInputErrorMessage(floatInput, 'required').then(function(err) {
								if(err) {
									expect(true).toBeDefined();
								} else {
									expect(undefined).toBe("Float input " + floatInput.column.name + " Required Error message to be displayed");
								}
							});
						}

						// Invalid text value
						var text = "1j2yu.5", actualValue = "12.5";
						floatInput.sendKeys(text).then(function() {
                            return floatInput.getAttribute('value');
                        }).then(function(value) {
                            expect(value).toBe(actualValue);
                        }).catch(function(error) {
                            console.log('ERROR:', error);
                            expect('Something went wrong in this promise chain to check the value of an input field.').toBe('See error msg for more info.')
                        });

						// Required Error message should disappear;
						chaisePage.recordEditPage.getInputErrorMessage(floatInput, 'required').then(function(err) {
							if (err) {
								expect(undefined).toBe("Float input " + floatInput.column.name + " Required Error message to be hidden");
							} else {
								expect(true).toBeDefined();
							}
						});

						// Clear value
						chaisePage.recordEditPage.clearInput(floatInput);
						expect(floatInput.getAttribute('value')).toBe("");

						//Restore the value to the original one or a valid input
						floatInput.sendKeys(validNo);
						expect(floatInput.getAttribute('value')).toBe(validNo);

						floatInput.column._value = validNo;

					});
				});

			});

			describe("File fields,", function() {

				it("should render input type as file input ", function() {
					console.log("\n       File Input Fields");
					var columns = tableParams.columns.filter(function(c){ if (c.type == "text" && c.isFile && !c.isForeignKey) return true; });
					columns.forEach(function(column) {
						chaisePage.recordEditPage.getInputForAColumn(column.name, recordIndex).then(function(fileInput) {
							console.log("         ->" + column.name);
							if (fileInput) {
								expect(true).toBeDefined();
								fileInput.column = column;

								chaisePage.recordEditPage.getInputForAColumn("txt" + column.name, recordIndex).then(function(txtInput) {
									var file = tableParams.files.shift();
									var filePath = require('path').resolve(__dirname, file.path);

									column._value = file.name;
									fileInput.sendKeys(filePath);

									browser.sleep(100);

									expect(fileInput.getAttribute('value')).toContain(file.name);
									expect(txtInput.getAttribute('value')).toBe(file.name);
								});
								
							} else {
								expect(undefined).toBe(true, "Unable to find file input field for column " + column.name);
							}
						});
					});
				});

			});


		});

		

		if (tableParams.records && recordIndex < (tableParams.records > 1 ? tableParams.records : 0)) {
			testMultipleRecords(recordIndex + 1);
		}
	};

	testMultipleRecords(0);

	return {
		visibleFields: visibleFields,
   	    table: table
	};

};

// params must include the names of the columns that you want to check for values of
exports.testRecordAppValuesAfterSubmission = function(params) {
    chaisePage.waitForElement(element(by.id('tblRecord')));

    for (var i = 0; i < params.column_names.length; i++) {
        var columnName = params.column_names[i];
        var column = chaisePage.recordPage.getColumnValue(columnName);
        expect(column.getText()).toBeDefined();
    }
}