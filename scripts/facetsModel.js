//'use strict';

/* Model Module */

var facetsModel = angular.module('facetsModel', []);

//angular.module('ermrestApp').factory('FacetsData', function() {
facetsModel.factory('FacetsData', function() {
	return {
		'box': {},
		'bookmark': '#',
		'bookmarkPage': null,
		'chooseColumns': {},
		'collectionsPredicate': '',
		'colsDefs': [],
		'colsDescr': {},
		'colsGroup': {},
		'datasetFiles': {},
		'denormalizedView': {},
		'detailColumns': [],
		'detailRows': [],
		'details': false,
		'enabledFilters': {},
		'enableAll': false,
		'entryRow': [],
		'entityPredicates': [],
		'entry3Dview': '',
		'entrySubtitle': '',
		'entryTitle': '',
		'ermrestData': [],
		'error': false,
		'exportOptions': {
			format: {name:"CSV", type:"DIRECT", template:null},
			formatOptions:{},
			defaultFormats:[
				{name:"CSV", type:"DIRECT", template:null},
				{name:"JSON", type:"DIRECT", template:null}
			],
			supportedFormats:[],
			exportPredicate:'',
			exportUrl:''
		},
		'externalReferenceRows': [],
		'facetClass': {},
		'facetPreviousValues': {},
		'facets': [],
		'facetSelection': false,
		'files': [],
		'filter': null,
		'filterAllText': '',
		'filterOptions': {
			filterText: "",
			useExternalFilter: true
		},
		'filterSearchAllTimeout': null,
		'filterSliderTimeout': null,
		'filterTextTimeout': null,
		'level': 0,
		'linearizeView': {},
		'isDetail': false,
		'maxPages': 0,
		'metadata': {},
		'moreFlag': false,
		'narrow': {},
		'narrowFilter': '',
		'pageMap': {},
		'pageNavigation': false,
		'pagingOptions': {
			pageSizes: [25, 50, 100],
			pageSize: 25,
			currentPage: 1
		},
		'pageRange': [],
		'progress': false,
		'ready': false,
		'score': [],
		'searchFilter': '',
		'searchFilterTimeout': null,
		'searchFilterValue': {},
		'selectedEntity': null,
		'sessionFilters': {},
		'sortColumns': [''],
		'sortDirection': 'asc',
		'sortDirectionOptions': ['asc', 'desc'],
		'sortFacet': '',
		'sortInfo': {'fields': [], 'directions': []},
		'sortOrder': null,
		'table': '',
		'tables': [],
		'tablesStack': [],
		'tag': null,
		'tagPages': 5,
		'textEntryRow': [],
		'thumbnails': {},
		'tiles': [],
		'totalServerItems': 0,
		'tree': [],
		'view': null,
		'viewer3dFile': []
	};
});
