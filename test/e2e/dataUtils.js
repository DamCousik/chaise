
var Sidebar = function() {
	var COMMENT_URI = "comment", FACET_URI = "facet", FACETORDER_URI = "facetOrder", DESCRIPTION_URI = "description";
	var self = this;

	this.getColumns = function(table, annotations, dataTypes) {
		var columns = [], annotations = annotations || ["hidden"];
		var cDefs = table.column_definitions.slice(0);
		cDefs.forEach(function(c) {
			if (!dataTypes || dataTypes.contains(c.type.typename)) {
				if ( c['annotations'] == null || c['annotations'][COMMENT_URI] == null || !c['annotations'][COMMENT_URI].intersect(annotations).length) {
					c.table_name = table.table_name;
					columns.push(c);
				} 
			}
		});
		return columns.slice(0);
	};

	this.getAllReferenceColumnsForATable = function(schema, table, annotations, dataTypes) {
		var columns = [], referenceTables = [];
		table['foreign_keys'].forEach(function(key) {
			if (key['referenced_columns'] != null) {
				key['referenced_columns'].forEach(function(refCol) {
					referenceTables.push(refCol);
				});
			}
		});

		referenceTables.forEach(function(referenceTable) {
			for(var k in schema.content.tables) {
				metadata = schema.content.tables[k];
				if (k == referenceTable['table_name']) {
					if (metadata['annotations'] != null && metadata['annotations'][COMMENT_URI] != null && metadata['annotations'][COMMENT_URI].contains('association')) {
						var referredColumns = self.getColumns(schema.content.tables[referenceTable['table_name']], annotations, dataTypes);
						referredColumns.forEach(function(rc) {
							if (rc.name !== referenceTable.column_name) {
								columns.push(rc);
							}
						});
					}
				}
			}
		});

		columns = columns.concat(this.getAllRefererColumnsForTables(schema, table, annotations, dataTypes));
		return columns.slice(0);
	};

	this.getAllRefererColumnsForTables = function(schema, table, annotations, dataTypes) {
		var tables = schema.content.tables, columns = [];
		for (var k in tables) {
			var t = tables[k];
			if (t.table_name != table.table_name) {
				t['foreign_keys'].forEach(function(key) {
					if (key['referenced_columns'] != null) {
						for (var i=0 ; i<key['referenced_columns'].length; i++) {
							if (key['referenced_columns'][i].table_name == table.table_name) {
								var cols = self.getColumns(t, annotations, dataTypes);
								columns = columns.concat(cols);
							}
						}
					}
				});
			}
		}
		return columns;
	};

	var getVisibleColumns = function(columns) {
		var visibleColumns = [];
		columns.forEach(function(c) {
			if (c['annotations'] != null && 
				((c['annotations'][COMMENT_URI] != null && c['annotations'][COMMENT_URI].contains('top'))
														||
				(c['annotations'][FACETORDER_URI] != null && c['annotations'][FACETORDER_URI].length))) 
			{
				visibleColumns.push(c);
			}
		});
		return visibleColumns.slice(0);
	};

	// Returns columns which don't have 'hidden', 'summary' and 'dataset' set in their comment annotation 
	this.getAllSidebarColumns = function(schema, table, dataTypes) {
		var annotation = ['hidden', 'summary', 'dataset', 'image', 'accommodation'];
		return self.getColumns(table, annotation, dataTypes).concat(this.getAllReferenceColumnsForATable(schema, table, annotation, dataTypes));
	};


	// Returns columns which don't have 'hidden', 'summary', 'bottom' and 'dataset' set in their comment annotation 
	this.getAllVisibleSidebarColumns = function(schema, table, dataTypes) {
		var annotation = ['hidden', 'summary', 'bottom', 'dataset', 'image', 'accommodation'];
		var columns =  self.getColumns(table, annotation, dataTypes).concat(this.getAllReferenceColumnsForATable(schema, table, annotation, dataTypes));
		return getVisibleColumns(columns);
	};


	// Returns columns which don't have 'hidden', 'summary', and 'dataset' set in their comment annotation 
	this.getInvisibleSidebarColumns = function(schema, table, dataTypes) {
		var columns = this.getAllSidebarColumns(schema, table, dataTypes);
		this.getAllVisibleSidebarColumns(schema, table, dataTypes).forEach(function(c) {
			for (i = 0 ; i < columns.length; i++) {
				if (columns[i].name == c.name && c.table_name == columns[i].table_name) {
					columns.splice(i, 1);
					break;
				}
			}
		});

		return columns.slice(0);
	};

	// Returns columns which have  either 'hidden', 'summary', 'bottom' or 'dataset' set in their comment annotation 
	this.getAllInvisibleColumns = function(schema, table, dataTypes) {
		var columns = table.column_definitions;
		this.getAllSidebarColumns(schema, table, dataTypes).forEach(function() {
			if (columns.name == c.name) {
				columns.splice(i, 1);
			}
		});
		return columns.slice(0);
	};

	this.getAllCheckableColumns = function(schema, table, dataTypes) {
		var annotation = ['hidden', 'summary', 'text', 'dataset', 'image', 'accommodation'], dataTypes = dataTypes || ['text', 'boolean'];
		return self.getColumns(table, annotation, dataTypes).concat(this.getAllReferenceColumnsForATable(schema, table, annotation, dataTypes));
	};

	this.getAllVisibleCheckableColumnsForATable = function(schema, table, dataTypes) {
		var annotation = ['hidden', 'summary', 'text', 'bottom', 'dataset', 'image', 'accommodation'], dataTypes = dataTypes || ['text', 'boolean'];
		var columns = self.getColumns(table, annotation, dataTypes).concat(this.getAllReferenceColumnsForATable(schema, table, annotation, dataTypes));
		return getVisibleColumns(columns);
	};

	this.getAllInvisibleCheckableSidebarColumns = function(schema, table, dataTypes) {
		var columns = this.getAllCheckableColumns(schema, table, dataTypes);
		this.getAllVisibleCheckableColumnsForATable(schema, table, dataTypes).forEach(function(c) {
			for (i=0 ; i<columns.length;i++) {
				if (columns[i].name == c.name && c.table_name == columns[i].table_name) {
					columns.splice(i, 1);
					break;
				}
			}
		});

		return columns.slice(0);
	};

	this.getAllNumericSidebarColumns = function(schema, table) {
		return this.getAllSidebarColumns(schema, table, ['int4', 'int8', 'float4', 'float8', 'serial4', 'serial8']);
	};

	this.getVisibleNumbericSidebarColumns = function(schema, table) {
		var columns = this.getAllVisibleSidebarColumns(schema, table, ['int4', 'int8', 'float4', 'float8', 'serial4', 'serial8']);
		return getVisibleColumns(columns);
	};

	this.getAllInvisibleNumericSidebarColumns = function() {
		return this.getInvisibleSidebarColumns(schema, table, ['int4', 'int8', 'float4', 'float8', 'serial4', 'serial8']);
	};

	this.getAllDateSidebarColumns = function(schema, table) {
		return this.getAllSidebarColumns(schema, table, ['date', 'timestamptz']);
	};

	this.getVisibleDateSidebarColumns = function(schema, table) {
		var columns = this.getAllVisibleSidebarColumns(schema, table, ['date', 'timestamptz']);
		return getVisibleColumns(columns);
	};

	this.getAllInvisibleDateSidebarColumns = function(schema, table) {
		return this.getInvisibleSidebarColumns(schema, table, ['date', 'timestamptz']);
	};

	this.getColumnDisplayName = function(column) {
		var annotation = column.annotations;
		// If display name found in annotation then return it else
		// compute the display name replacing undercores with space and 
		// changing the case of first letter of each word to uppercase
		if (annotation && annotation[DESCRIPTION_URI] && annotation[DESCRIPTION_URI]['display']) 
			return annotation[DESCRIPTION_URI]['display'];
		
		var parts = column.name.split('_'), strings = [];
		parts.forEach(function(part) {
			strings.push(part[0].toUpperCase() + part.substr(1));
		});
		return strings.join(' ');
	};

	this.getVisibleSidebarColumnOrder = function(schema, table) {
		var visibleColumns = this.getAllVisibleSidebarColumns(schema, table);
		var orderedColumns = [], topColumns = [];

		visibleColumns.forEach(function(c) {
			if (c['annotations'][FACETORDER_URI] != null && c['annotations'][FACETORDER_URI].length) {
				orderedColumns.push(c);
			} else {
				topColumns.push(c);
			}
		});

		orderedColumns = orderedColumns.sort(function(a, b) {
			return a['annotations'][FACETORDER_URI][0] - b['annotations'][FACETORDER_URI][0];
		});

		return orderedColumns.concat(topColumns);
	};
}

var DataUtils = function() {
	this.sidebar = new Sidebar();
};

module.exports = DataUtils;