'use strict';

/* Controllers */

var ermDiscoverController = angular.module('ermDiscoverController', []);

ermDiscoverController.controller('DiscoverListCtrl', ['$scope', '$timeout', '$sce', '$location',
                                               function($scope, $timeout, $sce, $location) {
	$('footer').hide();
	$('.panel-collapse').on('hide.bs.collapse', function () {
	      $(this).prev('.panel-heading').find('.glyphicon').removeClass('glyphicon-minus').addClass('glyphicon-plus');
	});
	$('.panel-collapse').on('show.bs.collapse', function () {
	      $(this).prev('.panel-heading').find('.glyphicon').removeClass('glyphicon-plus').addClass('glyphicon-minus');
	});

	$('#attrsort').click(function(){
		if ($('span').hasClass("glyphicon-sort-by-attributes")) {
		$("#attrsort span.glyphicon").removeClass("glyphicon-sort-by-attributes").addClass("glyphicon-sort-by-attributes-alt");
		}
		else {
		$("#attrsort span.glyphicon").removeClass("glyphicon-sort-by-attributes-alt").addClass("glyphicon-sort-by-attributes");
		}
	});
	if ($location.search()['schema'] != null) {
		SCHEMA = $location.search()['schema'];
	} else if (SCHEMA == null) {
		SCHEMA = 'facebase';
	}
	if ($location.search()['catalog'] != null) {
		CATALOG = $location.search()['catalog'];
	} else if (CATALOG == null) {
		CATALOG = 1;
	}
	initApplication();
	$scope.level = 0;
	$scope.collectionsPredicate = '';
	$scope.entityPredicates = [];
	$scope.selectedEntity = null;
	$scope.pageNavigation = false;
	$scope.details = false;
	$scope.denormalizedView = {};
	$scope.entryRow = [];
	$scope.detailColumns = [];
	$scope.detailRows = [];
	$scope.textEntryRow = [];
	$scope.entry3Dview = '';
	$scope.entryTitle = '';
	$scope.entrySubtitle = '';
	$scope.tagPages = 5;
	$scope.pageRange = [];
	$scope.pageMap = {};
	$scope.maxPages = 0;
	$scope.sortFacet = '';
	$scope.sortDirection = 'asc';
	$scope.sortDirectionOptions = ['asc', 'desc'];
	$scope.sortColumns = [''];
	$scope.initPageRange = function () {
	    for (var i = 1; i <= $scope.tagPages; i++) {
	    	$scope.pageRange.push(i);
	    	$scope.pageMap[i] = i;
	    }
	}
	
	$scope.tree = [];
	$scope.table = '';
	if ($location.search()['table'] != null) {
		$scope.table = $location.search()['table'];
	}
	$scope.tables = [];

	$scope.ready = false;
	$scope.filterAllText = '';
	$scope.moreFlag = false;
	$scope.facetClass = {};
	$scope.chooseColumns = {};
	$scope.score = [];
	$scope.narrow = {};
	$scope.box = {};
	$scope.filterTextTimeout = null;
	$scope.filterSliderTimeout = null;
	$scope.filterSearchAllTimeout = null;

	$scope.facets = [];
	$scope.ermrestData = [];
	$scope.metadata = {};
	$scope.colsDescr = {};
	$scope.colsGroup = {};
	$scope.colsDefs = [];
	$scope.filterOptions = {
			filterText: "",
			useExternalFilter: true
	};
	$scope.totalServerItems = 0;
	$scope.pagingOptions = {
			pageSizes: [25, 50, 100],
			pageSize: 25,
			currentPage: 1
	};  
	$scope.sortInfo = {'fields': [], 'directions': []};
	$scope.setPagingData = function(data, totalItems, page, pageSize){	
		if (page == 1) {
			$scope.ermrestData = data;
		} else {
			$scope.ermrestData = $scope.ermrestData.concat(data);
		}
		$scope.options['ermrestData'] = $scope.ermrestData;
		$scope.collectionsPredicate = getCollectionsPredicate($scope.entityPredicates, $scope.options);
		$scope.totalServerItems = totalItems;
		$scope.maxPages = Math.floor($scope.totalServerItems/$scope.pagingOptions.pageSize);
		if ($scope.totalServerItems%$scope.pagingOptions.pageSize != 0) {
			$scope.maxPages++;
		}
		if (!$scope.$$phase) {
			$scope.$apply();
		}
	};
	$scope.getPagedDataAsync = function (pageSize, page, searchText, sortOption) {
		setTimeout(function () {
			if (sortOption != null && sortOption['fields'].length > 1) {
				sortOption = null;
			}
			$scope.options['sortOption'] = sortOption;
			if (searchText) {
				getPage($scope.options, $scope.totalServerItems, $scope.setPagingData);
			} else {
				getPage($scope.options, $scope.totalServerItems, $scope.setPagingData);
			}
		}, 100);
	};
	$scope.$watch('pagingOptions', function (newVal, oldVal) {
		if ($scope.ready && newVal !== oldVal && 
				(newVal.currentPage !== oldVal.currentPage || newVal.pageSize !== oldVal.pageSize)) {
			$scope.getPagedDataAsync($scope.pagingOptions.pageSize, $scope.pagingOptions.currentPage, $scope.filterOptions.filterText, $scope.sortInfo);
		}
	}, true);
	
	$scope.$watch('filterOptions', function (newVal, oldVal) {
		if ($scope.ready && newVal !== oldVal) {
			$scope.pagingOptions.currentPage = 1;
			$scope.getPagedDataAsync($scope.pagingOptions.pageSize, $scope.pagingOptions.currentPage, $scope.filterOptions.filterText, $scope.sortInfo);
		}
	}, true);
	
	$scope.$watch('sortInfo', function (newVal, oldVal) {
		if ($scope.ready && newVal !== oldVal) {
			if ($scope.options['sortInfo']['fields'].length > 1) {
				$('div.ngSortButtonUp').addClass('ng-hide');
			}
			$scope.pagingOptions.currentPage = 1;
			$scope.getPagedDataAsync($scope.pagingOptions.pageSize, $scope.pagingOptions.currentPage, $scope.filterOptions.filterText, newVal);
		}
	}, true);

	$scope.options = {
			'box': $scope.box,
			'chooseColumns': $scope.chooseColumns,
			'colsDefs': $scope.colsDefs,
			'colsDescr': $scope.colsDescr,
			'colsGroup': $scope.colsGroup,
			'ermrestData': $scope.ermrestData,
			'facetClass': $scope.facetClass,
			'facets': $scope.facets,
			'filterOptions': $scope.filterOptions,
			'filterAllText': $scope.filterAllText,
			'metadata': $scope.metadata,
			'narrow': $scope.narrow,
			'pagingOptions': $scope.pagingOptions,
			'score': $scope.score,
			'sortInfo': $scope.sortInfo,
			'sortOption': null,
			'table': $scope.table,
			'tree': $scope.tree,
			'entityPredicates': $scope.entityPredicates
	};

	$scope.setSortOption = function setSortOption() {
		var sortOption = $scope.sortInfo;
		if (sortOption != null && sortOption['fields'].length > 1) {
			sortOption = null;
		}
		$scope.options['sortOption'] = sortOption;
	};
	
	$scope.initSortOption = function initSortOption() {
		$.each($scope.colsDefs, function(i, col) {
			if (isSortable($scope.table, col.field)) {
				$scope.sortColumns.push(col.field);
			}
		});
	};
	
	$scope.initTable = function initTable() {
		$scope.ready = false;
		$('footer').hide();
		$scope.moreFlag = false;
		$scope.filterTextTimeout = null;
		$scope.filterSliderTimeout = null;
		$scope.filterSearchAllTimeout = null;
		$scope.totalServerItems = 0;
		$scope.options['filterAllText'] = $scope.filterAllText = '';
		$('#headerSearch').val('');
		$scope.options['table'] = $scope.table;
		$scope.sortColumns = [''];
		$scope.pageRange = [];
		$scope.pageMap = {};
		$scope.maxPages = 0;
		$scope.sortFacet = '';
		$scope.sortDirection = 'asc';
		$scope.details = false;
		$scope.entryRow = [];
		$scope.detailColumns = [];
		$scope.detailRows = [];
		$scope.textEntryRow = [];
		$scope.entry3Dview = '';
		$scope.entryTitle = '';
		$scope.entrySubtitle = '';
		$scope.initPageRange();
		clearFacets($scope.options);
	};

	$scope.successUpdateModels = function successUpdateModels() {
		$scope.$apply();
		$scope.$broadcast('reCalcViewDimensions');
	};

	$scope.successUpdateCount = function successUpdateCount() {
		$scope.ready = true;
		$('footer').show();
		$scope.$apply();
		//console.log(JSON.stringify($scope.options, null, 4));
	};

	$scope.successInitModels = function successInitModels() {
		updateCount($scope.options, $scope.successUpdateCount);
		$scope.$apply();
	};

	$scope.successGetColumnDescriptions = function successGetColumnDescriptions(data, textStatus, jqXHR) {
		initModels($scope.options, $scope.successInitModels);
	};

	$scope.successGetErmrestData = function successGetErmrestData(data, totalItems, page, pageSize) {
		if (page == 1) {
			$scope.ermrestData = data;
		} else {
			$scope.ermrestData = $scope.ermrestData.concat(data);
		}
		$scope.options['ermrestData'] = $scope.ermrestData;
		$scope.totalServerItems = totalItems;
		$scope.collectionsPredicate = getCollectionsPredicate($scope.entityPredicates, $scope.options);
		if ($scope.selectedEntity != null) {
			$scope.selectedEntity['count'] = totalItems;
		}
		$scope.maxPages = Math.floor($scope.totalServerItems/$scope.pagingOptions.pageSize);
		if ($scope.totalServerItems%$scope.pagingOptions != 0) {
			$scope.maxPages++;
		}
		$scope.$apply();
		$('div.ngSortButtonUp').addClass('ng-hide');
		getColumnDescriptions($scope.options, $scope.successGetColumnDescriptions);
	};

	$scope.successGetTableColumnsUniques = function successGetTableColumnsUniques() {
		//alert(JSON.stringify($scope.score, null, 4));
		$scope.setSortOption();
		getErmrestData($scope.options, $scope.successGetErmrestData, $scope.successUpdateModels);
	};

	$scope.successGetTableColumns = function successGetTableColumns(columns) {
		$scope.options['facets'] = $scope.facets = columns['facets'];
		$scope.options['colsDefs'] = $scope.colsDefs = columns['colsDefs'];
		$scope.initSortOption();
		$scope.$apply();
		getTableColumnsUniques($scope.options, $scope.successGetTableColumnsUniques);
	};
	
	$scope.successGetMetadata = function successGetMetadata(data, textStatus, jqXHR) {
		$scope.options['metadata'] = $scope.metadata = data;
		getTableColumns($scope.options, $scope.successGetTableColumns);
	};
	
	$scope.successGetTables = function successGetTables() {
		$('#headerSearch').attr('disabled', 'disabled');
		$scope.$apply();
		selectCollection();
	};

	$scope.initPageRange();
	getTables($scope.tables, $scope.options, $scope.successGetTables);

	$scope.successSearchFacets = function successSearchFacets(data, totalItems, page, pageSize) {
		$scope.options['ermrestData'] = $scope.ermrestData = data;
		$scope.collectionsPredicate = getCollectionsPredicate($scope.entityPredicates, $scope.options);
		$scope.totalServerItems = totalItems;
		if ($scope.selectedEntity != null) {
			$scope.selectedEntity['count'] = totalItems;
		}
		$scope.maxPages = Math.floor($scope.totalServerItems/$scope.pagingOptions.pageSize);
		if ($scope.totalServerItems%$scope.pagingOptions != 0) {
			$scope.maxPages++;
		}
		$scope.$apply();
	};

	this.if_type = $scope.if_type = function if_type(facet, facet_type) {
		var ret = false;
		if ($scope.colsDescr[facet['table']][facet['name']] != null) {
			ret = ($scope.colsDescr[facet['table']][facet['name']]['type'] == facet_type);
			if (facet_type == 'bigint') {
				ret = psqlNumeric.contains($scope.colsDescr[facet['table']][facet['name']]['type']);
			} else if (facet_type == 'text') {
				ret = psqlText.contains($scope.colsDescr[facet['table']][facet['name']]['type']);
			}
		}
		return ret;
	};

	this.showApplication = function showApplication() {
		return true;
	};

	this.hideSpinner = function hideSpinner() {
		return true;
	};

	this.delay_predicate = function delay_predicate(facet,keyCode) {
		if ($scope.filterTextTimeout != null) {
			$timeout.cancel($scope.filterTextTimeout);
		}
		$scope.filterTextTimeout = $timeout(function(){$scope.predicate(facet,keyCode);}, 1000); // delay 1000 ms
	};

	this.isAttribute = function isAttribute(table, column) {
		return !hasAnnotation(table, column, 'dataset');
	};
	
	this.isNested = function isNested(table) {
		return !association_tables_names.contains(table);
	};
	
	$scope.predicate = function predicate(facet,keyCode) {
		if ($scope.box[facet['table']][facet['name']]['value'] == '') {
			$scope.facetClass[facet['table']][facet['name']] = '';
		} else {
			$scope.facetClass[facet['table']][facet['name']] = 'selectedFacet';
		}
		$scope.setSortOption();
		$scope.pagingOptions.currentPage = 1;
		getErmrestData($scope.options, $scope.successSearchFacets, $scope.successUpdateModels);
	};

	this.delay_slider = function delay_slider(facet) {
		if ($scope.filterSliderTimeout != null) {
			$timeout.cancel($scope.filterSliderTimeout);
		}
		$scope.filterSliderTimeout = $timeout(function(){$scope.predicate_slider(facet);}, 1); // delay 1 ms
	};

	$scope.predicate_slider = function predicate_slider(facet) {
		if ($scope.box[facet['table']][facet['name']]['min'] > $scope.box[facet['table']][facet['name']]['floor']) {
			$scope.box[facet['table']][facet['name']]['left'] = true;
		} else if ($scope.box[facet['table']][facet['name']]['left'] && $scope.box[facet['table']][facet['name']]['min'] == $scope.box[facet['table']][facet['name']]['floor']) {
			delete $scope.box[facet['table']][facet['name']]['left'];
		}
		if ($scope.box[facet['table']][facet['name']]['max'] < $scope.box[facet['table']][facet['name']]['ceil']) {
			$scope.box[facet['table']][facet['name']]['right'] = true;
		} else if ($scope.box[facet['table']][facet['name']]['right'] && $scope.box[facet['table']][facet['name']]['max'] == $scope.box[facet['table']][facet['name']]['original_ceil']) {
			delete $scope.box[facet['table']][facet['name']]['right'];
		}
		setFacetClass($scope.options, facet, $scope.facetClass);
		$scope.setSortOption();
		$scope.pagingOptions.currentPage = 1;
		getErmrestData($scope.options, $scope.successSearchFacets, $scope.successUpdateModels);
	};

	this.delay_search_all = function delay_search_all() {
		if ($scope.filterSearchAllTimeout != null) {
			$timeout.cancel($scope.filterSearchAllTimeout);
		}
		$scope.filterSearchAllTimeout = $timeout(function(){$scope.predicate_search_all();}, 1000); // delay 1 s
	};

	$scope.predicate_search_all = function predicate_search_all() {
		$scope.options['filterAllText'] = $scope.filterAllText;
		$scope.setSortOption();
		$scope.pagingOptions.currentPage = 1;
		getErmrestData($scope.options, $scope.successSearchFacets, $scope.successUpdateModels);
	};

	this.predicate_checkbox = function predicate_checkbox(facet) {
		setFacetClass($scope.options, facet, $scope.facetClass);
		$scope.setSortOption();
		$scope.pagingOptions.currentPage = 1;
		getErmrestData($scope.options, $scope.successSearchFacets, $scope.successUpdateModels);
	};

	this.predicate_select = function predicate_select(facet) {
		setFacetClass($scope.options, facet, $scope.facetClass);
		$scope.setSortOption();
		$scope.pagingOptions.currentPage = 1;
		getErmrestData($scope.options, $scope.successSearchFacets, $scope.successUpdateModels);
	};

	this.table_select = function table_select() {
		$scope.entityPredicates.length = 0;
		$scope.selectedEntity = null;
		$scope.initTable();
		getMetadata($scope.table, $scope.successGetMetadata);
	};

	this.showFacetValue = function showFacetValue(facet, value) {
		return ($scope.colsGroup[facet['table']][facet['name']][value] == 0 && !$scope.box[facet['table']][facet['name']]['values'][value]);
	};
	this.show = function show(facet) {
		return ($scope.narrow[facet['table']][facet['name']] == null && $scope.ready && $scope.chooseColumns[facet['table']][facet['name']] && 
				($scope.box[facet['table']][facet['name']]['facetcount'] > 0 || 
						$scope.colsDescr[facet['table']][facet['name']]['type'] == 'enum' && hasCheckedValues($scope.box, facet)));
	};
	this.showFacetCount = function showFacetCount(facet) {
		return ($scope.chooseColumns[facet['table']][facet['name']] && 
				($scope.box[facet['table']][facet['name']]['facetcount'] > 0 || 
						$scope.colsDescr[facet['table']][facet['name']]['type'] == 'enum' && hasCheckedValues($scope.box, facet)));
	};
	this.showClearButton = function showClearButton() {
		return $scope.ready;
	};
	this.showFilters = function showFilters() {
		//return $scope.ready;
		return true;
	};
	this.showTree = function showTree() {
		return true;
	};
	this.showResults = function showResults() {
		//return $scope.ready;
		return true;
	};
	this.hide = function hide(facet) {
		return ($scope.narrow[facet['table']][facet['name']] == null || !$scope.chooseColumns[facet['table']][facet['name']] || 
				($scope.box[facet['table']][facet['name']]['facetcount'] == 0 && 
						($scope.colsDescr[facet['table']][facet['name']]['type'] == 'bigint' ||
								$scope.colsDescr[facet['table']][facet['name']]['type'] == 'enum' && !hasCheckedValues($scope.box, facet))));
	};
	this.expand = function expand(facet) {
		$scope.narrow[facet['table']][facet['name']] = true;
	};
	this.collapse = function collapse(facet) {
		delete $scope.narrow[facet['table']][facet['name']];
	};
	this.preventRoute = function preventRoute(event, facet) {
		event.preventDefault();
		if ($scope.narrow[facet['table']][facet['name']] == null) {
			$scope.narrow[facet['table']][facet['name']] = true;
		} else {
			delete $scope.narrow[facet['table']][facet['name']];
		}
	};
	this.logout = function logout() {
		var res = submitLogout();
		window.location = '#/login';
	};
	this.clear = function clear(event) {
		//window.location = '#';
		event.preventDefault();
		$scope.entityPredicates.length = 0;
		$scope.selectedEntity = null;
		$scope.initTable();
		getMetadata($scope.table, $scope.successGetMetadata);
	};
	
	this.displayMore = function displayMore(event) {
		event.preventDefault();
		$scope.moreFlag = !$scope.moreFlag;
	};
	this.showMore = function showMore() {
		return (!$scope.moreFlag && $scope.ready);
	};
	this.hideMore = function hideMore() {
		return (!$scope.moreFlag);
	};
	this.expandMore = function expandMore() {
		$scope.moreFlag = true;
	};
	this.collapseMore = function collapseMore() {
		$scope.moreFlag = false;
	};
	this.showMoreButton = function showMoreButton() {
		return $scope.ready;
	};
	this.showSearchBox = function showSearchBox() {
		return $scope.ready;
	};
	this.itemThumbnail = function itemThumbnail(row) {
		var ret = getEntryThumbnail(row);
		if (ret == null) {
			ret = getAssociationThumbnail($scope.table, row);
		}
		return ret;
	};
	this.itemAssociateThumbnail = function itemAssociateThumbnail(table, row, column) {
		return getDenormalizedThumbnail(table, row, column);
	};
	this.itemAssociate3dView = function itemAssociate3dView(table, row, column) {
		return getDenormalized3dView(table, row, column);
	};
	this.itemAssociateFile = function itemAssociateFile(table, row, column) {
		return getDenormalizedFile(table, row, column);
	};
	this.itemDenormalizedValue = function itemDenormalizedValue(table, row, column, val) {
		return getItemDenormalizedValue(table, row, column, val);
	};
	this.itemTitle = function itemTitle(row) {
		return getEntryTitle(row);
	};
	this.preventDefault = function preventDefault(event) {
		event.preventDefault();
	};
	this.pageToFirst = function pageToFirst(event) {
		event.preventDefault();
		$scope.pagingOptions.currentPage = 2;
		$scope.pagingOptions.currentPage = updatePageTag('backward', $scope.pagingOptions.currentPage, $scope.pageMap, $scope.tagPages, $scope.maxPages);
		setActivePage($scope.pagingOptions.currentPage, $scope.pageMap);
	};
	this.pageToLast = function pageToLast(event) {
		event.preventDefault();
		$scope.pagingOptions.currentPage = $scope.maxPages - 1;
		$scope.pagingOptions.currentPage = updatePageTag('forward', $scope.pagingOptions.currentPage, $scope.pageMap, $scope.tagPages, $scope.maxPages);
		setActivePage($scope.pagingOptions.currentPage, $scope.pageMap);
	};
	this.pageBackward = function pageBackward(event) {
		event.preventDefault();
		$scope.pagingOptions.currentPage = updatePageTag('backward', $scope.pagingOptions.currentPage, $scope.pageMap, $scope.tagPages, $scope.maxPages);
		setActivePage($scope.pagingOptions.currentPage, $scope.pageMap);
	};
	this.pageForward = function pageForward(event) {
		event.preventDefault();
		$scope.pagingOptions.currentPage = updatePageTag('forward', $scope.pagingOptions.currentPage, $scope.pageMap, $scope.tagPages, $scope.maxPages);
		setActivePage($scope.pagingOptions.currentPage, $scope.pageMap);
	};
	this.cantPageBackward = function cantPageBackward() {
		return $scope.pagingOptions.currentPage == 1;
	};
	this.canPageForward = function canPageForward() {
		return $scope.pagingOptions.currentPage < $scope.maxPages;
	};
	this.pageButton = function pageButton(page) {
		return $scope.pageMap[page];
	};
	this.setActiveClass = function setActiveClass(index) {
		var ret = 'page-selector';
		if (index == 0) {
			ret += ' active';
		}
		return ret;
	};

	this.selectPage = function selectPage(event, page) {
		event.preventDefault();
		$scope.pagingOptions.currentPage = $scope.pageMap[page];
		setActivePage($scope.pagingOptions.currentPage, $scope.pageMap);
	};
	this.pageInRange = function pageInRange(page) {
		return $scope.pageMap[page] <= $scope.maxPages;
	};
	this.lastRecord = function lastRecord() {
		var ret = $scope.pagingOptions.currentPage * $scope.pagingOptions.pageSize;
		if (ret > $scope.totalServerItems) {
			ret = $scope.totalServerItems;
		}
		return ret;
	};
	this.changeSortDirection = function changeSortDirection(event) {
		event.preventDefault();
		if ($scope.sortInfo.fields.length == 1) {
			$scope.sortInfo.directions.length = 1;
			if ($scope.sortDirection == $scope.sortDirectionOptions[0]) {
				$scope.sortDirection = $scope.sortDirectionOptions[1];
			} else {
				$scope.sortDirection = $scope.sortDirectionOptions[0];
			}
			$scope.sortInfo.directions[0] = $scope.sortDirection;
		}
	};
	this.changeSortOption = function changeSortOption() {
		$scope.sortInfo.fields.length = 1;
		$scope.sortInfo.directions.length = 1;
		$scope.sortInfo.fields[0] = $scope.sortFacet;
		$scope.sortInfo.directions[0] = $scope.sortDirection;
		if ($scope.sortFacet=='') {
			$scope.sortInfo.fields.push('Not Sorted');
		}
	};
	this.toggleFacet = function toggleFacet(event, facet) {
		if ($scope.narrow[facet['table']][facet['name']] == null) {
			$scope.narrow[facet['table']][facet['name']] = true;
			$(event.target).addClass('collapsed');
			$(event.target).find('.glyphicon').removeClass('glyphicon-plus').addClass('glyphicon-minus');
			setTimeout(function () {
				$scope.$broadcast('reCalcViewDimensions');
			}, 1);
		} else if ($scope.if_type(facet, 'enum')) {
			if (!hasCheckedValues($scope.box, facet) && !$(event.target).is(':checkbox')) {
				$(event.target).removeClass('collapsed');
				$(event.target).find('.glyphicon').removeClass('glyphicon-minus').addClass('glyphicon-plus');
				delete $scope.narrow[facet['table']][facet['name']];
			}
		} else if ($scope.if_type(facet, 'bigint') && !$(event.target).is('rzslider')) {
			if ($scope.box[facet['table']][facet['name']]['min'] == $scope.box[facet['table']][facet['name']]['floor'] && $scope.box[facet['table']][facet['name']]['max'] == $scope.box[facet['table']][facet['name']]['ceil']) {
				$(event.target).removeClass('collapsed');
				$(event.target).find('.glyphicon').removeClass('glyphicon-minus').addClass('glyphicon-plus');
				delete $scope.narrow[facet['table']][facet['name']];
			}
		} else if ($scope.if_type(facet, 'text') && !$(event.target).is('input:text')) {
			if ($scope.box[facet['table']][facet['name']]['value'].length == 0) {
				$(event.target).removeClass('collapsed');
				$(event.target).find('.glyphicon').removeClass('glyphicon-minus').addClass('glyphicon-plus');
				delete $scope.narrow[facet['table']][facet['name']];
			}
		}
	};
	// "m" is the number of columns per row
	this.clicker = function clicker(event, row, m) {
		event.preventDefault();
		if (row == null) {
			$scope.details = false;
			$scope.entryRow = [];
			$scope.detailColumns = [];
			$scope.detailRows = [];
			$scope.textEntryRow = [];
			$scope.entry3Dview = '';
			$scope.entryTitle = '';
			$scope.entrySubtitle = '';
		} else {
			$scope.entryRow = row;
			$scope.detailColumns = getDetailColumns(row);
			$scope.detailRows = getDetailRows(row, m);
			$scope.textEntryRow = getLongTextColumns(row);
			$scope.entryTitle = getEntryTitle(row);
			$scope.entrySubtitle = getEntrySubtitle(row);
			$scope.details = true;
			entityDenormalize(getEntityTable($scope.options), row, $scope.denormalizedView);
		}
	};
	// "m" is the number of columns per row
	// "maxRows" is the maxim number of rows to be displayed
	this.displayColumns = function displayColumns(row, m, maxRows) {
		return getDisplayColumns(row, m, maxRows);
	};
	this.download = function download(event, url) {
		window.open(url, '_blank');
	};
	this.init3Dview = function init3Dview(url) {
		return $sce.trustAsResourceUrl(url);
	};
	this.openZoomify = function openZoomify(event, url) {
		window.open(url, '_blank');
	};
	this.html = function html(table, column, data) {
		return hasAnnotation(table, column, 'html') ? $sce.trustAsHtml(data) : data;
	};
	this.if_hasText = function if_hasText() {
		return $scope.textEntryRow.length > 0;
	};
	this.if_hasThumbnail = function if_hasThumbnail() {
		var ret = display_columns['thumbnail'].length > 0;
		if (!ret) {
			ret = hasAssociationThumnbnail($scope.table);
		}
		return ret;
	};
	this.expandCollapse = function expandCollapse(data, show) {
		data.expand = !data.expand;
		data.show = show;
	};
	this.displayTreeCount = function displayTreeCount(data) {
		var ret = '';
		if (data.count > 0) {
			ret = '(' + data.count + ')';
		}
		return ret;
	};
	this.showTableSelect = function showTableSelect() {
		return false;
	};
	this.showRefine = function showRefine() {
		return $('.highlighted', $('#treeDiv')).length > 0;
	};
	this.isThumbnail = function isThumbnail(table, column) {
		return hasAnnotation(table, column, 'thumbnail');
	};
	this.isHTML = function isHTML(table, column) {
		return hasAnnotation(table, column, 'html');
	};
	this.is3dView = function is3dView(table, column) {
		return hasAnnotation(table, column, '3dview');
	};
	this.isZoomify = function isZoomify(table, column) {
		return hasAnnotation(table, column, 'zoomify');
	};
	this.isDownload = function isDownload(table, column) {
		return hasAnnotation(table, column, 'file');
	};
	this.detailValue = function detailValue(table, column, data) {
		return hasAnnotation(table, column, 'html') ? '' : data;
	};
	this.display = function display(table, column) {
		return COLUMNS_ALIAS[table][column];
	};
	this.getEntityResults = function getEntityResults(event, data) {
		var peviousTable = $scope.table;
		var node = $('label.highlighted', $('#treeDiv'));
		var isNew = (node.length == 0 || node[0] !== event.target);
		if (isNew) {
			$("#attrsort span.glyphicon").removeClass("glyphicon-sort-by-attributes-alt").addClass("glyphicon-sort-by-attributes");
		}
		if (data.level != -1 && isNew) {
			$('#headerSearch').removeAttr('disabled');
			collapseTree($scope.tree[0], data);
			$('label', $('#treeDiv')).removeClass('highlighted');
			$(event.target).addClass('highlighted');
			var newBranch = false;
			if (data.level > 0 && $scope.level >= 0) {
				var oldRoot = null;
				if ($scope.level > 0) {
					var oldRootParent = $scope.selectedEntity.parent;
					while (oldRootParent.parent != null) {
						oldRootParent = oldRootParent.parent;
					}
					oldRoot = oldRootParent.name;
				} else {
					oldRoot = $scope.selectedEntity.name;
				}
				var newRootParent = data.parent;
				while (newRootParent.parent != null) {
					newRootParent = newRootParent.parent;
				}
				if ((oldRoot != null || $scope.entityPredicates.length == 0) && newRootParent.name != oldRoot) {
					$scope.level = 0;
					$scope.entityPredicates.length = 1;
					$scope.entityPredicates[0] = encodeSafeURIComponent(newRootParent.name);
					newBranch = true;
				}
			}
			$scope.selectedEntity = data;
			$scope.table = data.name;
			$scope.options.table = $scope.table;
			if (data.level == 0) {
				resetTreeCount(data);
				$scope.entityPredicates.length = 0;
				$scope.entityPredicates.push(encodeSafeURIComponent($scope.table));
				$scope.level = 0;
				updateTreeCount(data, $scope.entityPredicates);
				$scope.initTable();
				getMetadata(data.name, $scope.successGetMetadata);
			} else if (data.level > $scope.level) {
				$scope.entityPredicates.length = data.level+1;
				$scope.entityPredicates[data.level] = encodeSafeURIComponent(data.name);
				if (!newBranch) {
					var predicate = getPredicate($scope.options, null, null, peviousTable);
					if (predicate.length > 0) {
						$scope.entityPredicates[$scope.level] += '/' + predicate.join('/');
					}
				}
				var node = data.parent;
				for (var i=data.level-1; i>$scope.level; i--) {
					$scope.entityPredicates[i] = encodeSafeURIComponent(node.name);
					node = node.parent;
				}
				updateTreeCount(data, $scope.entityPredicates);
				$scope.level = data.level;
				$scope.initTable();
				getMetadata(data.name, $scope.successGetMetadata);
			} else if (data.level < $scope.level) {
				resetTreeCount(data);
				$scope.entityPredicates.length = data.level+1;
				$scope.entityPredicates[data.level] = encodeSafeURIComponent(data.name);
				updateTreeCount(data, $scope.entityPredicates);
				$scope.level = data.level;
				$scope.initTable();
				getMetadata(data.name, $scope.successGetMetadata);
			} else if (data.level == $scope.level) {
				$scope.entityPredicates[data.level] = encodeSafeURIComponent(data.name);
				updateTreeCount(data, $scope.entityPredicates);
				$scope.level = data.level;
				$scope.initTable();
				getMetadata(data.name, $scope.successGetMetadata);
			}
		}
	};
}]);

