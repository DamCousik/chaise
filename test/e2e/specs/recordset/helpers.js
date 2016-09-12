var chaisePage = require('../../utils/chaise.page.js');

exports.testPresentation = function (tableParams) {

	it("should have '" + tableParams.title +  "' as title", function() {
		chaisePage.recordsetPage.getPageTitle().then(function(txt) {
			expect(txt).toBe(tableParams.title);
		});
	});

	it("should show correct table rows", function() {
		chaisePage.recordsetPage.getRows().then(function(rows) {
			expect(rows.length).toBe(3);
			for (var i = 0; i < rows.length; i++) {
				(function(index) {
					rows[index].all(by.tagName("td")).then(function (cells) {
						expect(cells.length).toBe(tableParams.columns.length);
						expect(cells[0].getText()).toBe(tableParams.data[index].title);
						expect(cells[1].element(by.tagName("a")).getAttribute("href")).toBe(tableParams.data[index].website);
						expect(cells[1].element(by.tagName("a")).getText()).toBe("Link to Website");
						expect(cells[2].getText()).toBe(tableParams.data[index].rating);
						expect(cells[3].getText()).toBe(tableParams.data[index].summary);
						expect(cells[4].getText()).toBe(tableParams.data[index].opened_on);
						expect(cells[5].getText()).toBe(tableParams.data[index].luxurious);
					});
				}(i))
			}
		});
	});

	it("should show " + tableParams.columns.length + " columns", function() {
		chaisePage.recordsetPage.getColumns().getInnerHtml().then(function(columnNames) {
			for (var j = 0; j < columnNames.length; j++) {
				expect(columnNames[j]).toBe(tableParams.columns[j]);

			}
		});
	});


};