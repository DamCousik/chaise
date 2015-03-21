'use strict';

/* Controllers */

var ermResultsController = angular.module('ermResultsController', ['facetsModel', 'facetsService']);

//angular.module('ermrestApp').controller('ResultsListCtrl', ['$scope', '$timeout', '$sce', 'FacetsData', 'FacetsService',
ermResultsController.controller('ResultsListCtrl', ['$scope', '$timeout', '$sce', 'FacetsData', 'FacetsService',
                                                      function($scope, $timeout, $sce, FacetsData, FacetsService) {

	$scope.FacetsData = FacetsData;
	
	$scope.predicate_search_all = function predicate_search_all() {
		FacetsService.setSortOption();
		$scope.FacetsData.pagingOptions.currentPage = 1;
		getErmrestData($scope.FacetsData, $scope.successSearchFacets, $scope.successUpdateModels);
	};

	$scope.successSearchFacets = function successSearchFacets(data, totalItems, page, pageSize) {
		FacetsService.successSearchFacets(data, totalItems, page, pageSize);
		if (!$scope.$$phase) {
			$scope.$apply();
		}
	};

	$scope.successUpdateModels = function successUpdateModels() {
		if (!$scope.$$phase) {
			$scope.$apply();
		}
		$scope.$broadcast('reCalcViewDimensions');
	};

	this.cantPageBackward = function cantPageBackward() {
		return $scope.FacetsData.pagingOptions.currentPage == 1;
	};

	this.canPageForward = function canPageForward() {
		return $scope.FacetsData.pagingOptions.currentPage < $scope.FacetsData.maxPages;
	};

	// "m" is the number of columns per row
	this.clicker = function clicker(event, row, m, index) {
		event.preventDefault();
		if (row == null) {
			$scope.FacetsData.details = false;
			$scope.FacetsData.entryRow = [];
			$scope.FacetsData.detailColumns = [];
			$scope.FacetsData.detailRows = [];
			$scope.FacetsData.textEntryRow = [];
			$scope.FacetsData.entry3Dview = '';
			$scope.FacetsData.entryTitle = '';
			$scope.FacetsData.entrySubtitle = '';
            $scope.FacetsData.tiles = [];
            $scope.FacetsData.files = [];
            $scope.FacetsData.viewer3dFile = [];
		} else {
            $scope.FacetsData.modalIndex = index;
            $scope.FacetsData.spinner[index] = true;
			$scope.FacetsData.entryRow = row;
			$scope.FacetsData.detailColumns = getDetailColumns(row);
			$scope.FacetsData.detailRows = getDetailRows(row, m);
			$scope.FacetsData.textEntryRow = getLongTextColumns(row);
			$scope.FacetsData.entryTitle = getEntryTitle(row);
			$scope.FacetsData.entrySubtitle = getEntrySubtitle(row);
			$scope.FacetsData.details = true;
			entityDenormalize(getEntityTable($scope.FacetsData), row, $scope.FacetsData.denormalizedView);
			entityLinearize($scope.FacetsData.denormalizedView, $scope.FacetsData.linearizeView);
            getDenormalizedFiles($scope.FacetsData.table, row, $scope.FacetsData.datasetFiles);
            $scope.FacetsData.tiles = getTilesLayout($scope.FacetsData.datasetFiles, 3);
            $scope.FacetsData.files = getFilesLayout($scope.FacetsData.datasetFiles);
            $scope.FacetsData.viewer3dFile = getViewer3d($scope.FacetsData.datasetFiles);
		}
	};
	
    this.closeModal = function closeModal(event) {
    	FacetsService.closeModal(event);
	}

	this.delay_search_all = function delay_search_all() {
		if ($scope.FacetsData.filterSearchAllTimeout != null) {
			$timeout.cancel($scope.FacetsData.filterSearchAllTimeout);
		}
		$scope.FacetsData.filterSearchAllTimeout = $timeout(function(){$scope.predicate_search_all();}, 1000); // delay 1 s
	};

	this.display = function display(table, column) {
		return FacetsService.display(table, column);
	};

	// "m" is the number of columns per row
	// "maxRows" is the maxim number of rows to be displayed
	this.displayColumns = function displayColumns(row, m, maxRows) {
		return getDisplayColumns(row, m, maxRows, $scope.FacetsData.table);
	};
	
	this.viewColumns = function viewColumns(row, m, maxRows) {
		return getViewColumns(row, m, maxRows, $scope.FacetsData.table);
	}

	this.html = function html(table, column, data) {
		return FacetsService.html(table, column, data);
	};

	this.if_hasThumbnail = function if_hasThumbnail() {
		var ret = display_columns['thumbnail'].length > 0;
		if (!ret) {
			ret = hasAssociationThumnbnail($scope.FacetsData.table);
		}
		return ret;
	};

	this.isSummary = function isSummary(table, column) {
		return hasAnnotation(table, column, 'summary');
	};

	this.hasSummary = function hasSummary(table) {
		return hasColumnAnnotation(table, 'summary');
	};

	this.itemThumbnail = function itemThumbnail(row) {
		var ret = getEntryThumbnail(row);
		if (ret == null) {
			ret = getAssociationThumbnail($scope.FacetsData.table, row);
		}
		return ret;
	};
	
	this.itemTitle = function itemTitle(row) {
		return getEntryTitle(row);
	};

	this.lastRecord = function lastRecord() {
		var ret = $scope.FacetsData.pagingOptions.currentPage * $scope.FacetsData.pagingOptions.pageSize;
		if (ret > $scope.FacetsData.totalServerItems) {
			ret = $scope.FacetsData.totalServerItems;
		}
		return ret;
	};

	this.pageBackward = function pageBackward(event) {
		event.preventDefault();
		$scope.FacetsData.pagingOptions.currentPage = updatePageTag('backward', $scope.FacetsData.pagingOptions.currentPage, $scope.FacetsData.pageMap, $scope.FacetsData.tagPages, $scope.FacetsData.maxPages);
		setActivePage($scope.FacetsData.pagingOptions.currentPage, $scope.FacetsData.pageMap);
	};

	this.pageButton = function pageButton(page) {
		return $scope.FacetsData.pageMap[page];
	};

	this.pageForward = function pageForward(event) {
		event.preventDefault();
		$scope.FacetsData.pagingOptions.currentPage = updatePageTag('forward', $scope.FacetsData.pagingOptions.currentPage, $scope.FacetsData.pageMap, $scope.FacetsData.tagPages, $scope.FacetsData.maxPages);
		setActivePage($scope.FacetsData.pagingOptions.currentPage, $scope.FacetsData.pageMap);
	};

	this.pageInRange = function pageInRange(page) {
		return $scope.FacetsData.pageMap[page] <= $scope.FacetsData.maxPages;
	};

	this.pageToFirst = function pageToFirst(event) {
		event.preventDefault();
		$scope.FacetsData.pagingOptions.currentPage = 2;
		$scope.FacetsData.pagingOptions.currentPage = updatePageTag('backward', $scope.FacetsData.pagingOptions.currentPage, $scope.FacetsData.pageMap, $scope.FacetsData.tagPages, $scope.FacetsData.maxPages);
		setActivePage($scope.FacetsData.pagingOptions.currentPage, $scope.FacetsData.pageMap);
	};

	this.pageToLast = function pageToLast(event) {
		event.preventDefault();
		$scope.FacetsData.pagingOptions.currentPage = $scope.FacetsData.maxPages - 1;
		$scope.FacetsData.pagingOptions.currentPage = updatePageTag('forward', $scope.FacetsData.pagingOptions.currentPage, $scope.FacetsData.pageMap, $scope.FacetsData.tagPages, $scope.FacetsData.maxPages);
		setActivePage($scope.FacetsData.pagingOptions.currentPage, $scope.FacetsData.pageMap);
	};

	this.selectPage = function selectPage(event, page) {
		event.preventDefault();
		$scope.FacetsData.pagingOptions.currentPage = $scope.FacetsData.pageMap[page];
		setActivePage($scope.FacetsData.pagingOptions.currentPage, $scope.FacetsData.pageMap);
	};

	this.setActiveClass = function setActiveClass(index) {
		var ret = 'page-selector';
		if (index == 0) {
			ret += ' active';
		}
		return ret;
	};

	this.setSummaryClass = function setSummaryClass(table, column, value) {
		return value + (hasAnnotation(table, column, 'summary') ? ' summary' : ' truncate');
	};


	this.showResults = function showResults() {
		return true;
	};

	this.showSpinner = function showSpinner(index) {
		return $scope.FacetsData.spinner[index] == true;
	};
	
	this.selectView = function selectView(event, view) {
		event.preventDefault();
		$scope.FacetsData.view = view;
		if (!$scope.$$phase) {
			$scope.$apply();
		}
	}
	
    this.sidebarClick = function sidebarClick(event, toggle) {
    	event.stopPropagation();
    	if (toggle == 'collections-toggle') {
    		event.preventDefault();
    	}
    	FacetsService.sidebarClick(toggle);
	}

	this.preventDefault = function preventDefault(event) {
		event.preventDefault();
	};

	this.displayTreeCount = function displayTreeCount(data) {
		var ret = '';
		if (data != null && data.count > 0) {
			ret = '(' + data.count + ')';
		}
		return ret;
	};

	this.if_type = $scope.if_type = function if_type(facet, facet_type) {
		var ret = false;
		if ($scope.FacetsData.colsDescr[facet['table']] != null && $scope.FacetsData.colsDescr[facet['table']][facet['name']] != null) {
			ret = ($scope.FacetsData.colsDescr[facet['table']][facet['name']]['type'] == facet_type);
			if (facet_type == 'bigint') {
				ret = psqlNumeric.contains($scope.FacetsData.colsDescr[facet['table']][facet['name']]['type']);
			} else if (facet_type == 'text') {
				ret = psqlText.contains($scope.FacetsData.colsDescr[facet['table']][facet['name']]['type']);
			}
		}
		return ret;
	};

	this.showFacetValues = $scope.showFacetValues  = function showFacetValues(facet, facet_type) {
		var ret = false;
		var value = $scope.FacetsData.box[facet['table']][facet['name']];
		if (value != null) {
			if (facet_type == 'bigint') {
				ret = value['left'] || value['right'];
			} else if (facet_type == 'text') {
				ret = value['value'].length > 0;
			} else if (facet_type == 'enum') {
				$.each(value['values'], function(checkbox_key, checkbox_value) {
					if (checkbox_value) {
						ret = true;
						return false;
					}
				});
			}
		}
		return ret;
	};

	this.setListClass = function setListClass(facet) {
		var value = $scope.FacetsData.box[facet['table']][facet['name']];
		var values = [];
		$.each(value['values'], function(checkbox_key, checkbox_value) {
			if (checkbox_value) {
				values.push(checkbox_value);
			}
		});
		return (values.length > 1) ? 'multi_values' : 'single_value';
	};
	
	this.getFacetValues = $scope.getFacetValues = function getFacetValues(facet) {
		var value = $scope.FacetsData.box[facet['table']][facet['name']];
		var values = [];
		$.each(value['values'], function(checkbox_key, checkbox_value) {
			if (checkbox_value) {
				values.push(checkbox_key);
			}
		});
		return values;
	};
	
	this.displayTitle = function displayTitle(facet) {
		var values = $scope.getFacetValues(facet);
		var ret = '';
		$.each(values, function(i, value) {
			if (i > 0) {
				ret += ', ';
			}
			ret += value;
		});
		return ret;
	};
	
	this.hasFilters = $scope.hasFilters = function hasFilters() {
		var ret = false;
		$.each($scope.FacetsData.facets, function(i, facet) {
			if ($scope.FacetsData.colsDescr[facet['table']] != null && $scope.FacetsData.colsDescr[facet['table']][facet['name']] != null) {
				var facet_type = $scope.FacetsData.colsDescr[facet['table']][facet['name']]['type'];
				if ($scope.if_type(facet, 'bigint')) {
					facet_type = 'bigint';
				} else if ($scope.if_type(facet, 'text')) {
					facet_type = 'text';
				}
				ret = $scope.showFacetValues(facet, facet_type);
				if (ret) {
					return false;
				}
			}
		});
		
		return ret;
	};
	
	this.setFilterClass = function setFilterClass() {
		return $scope.hasFilters() ? '' : 'filter-bg';
	};

    this.removeFilter = function removeFilter(event, facet) {
    	//event.stopPropagation();
    	event.preventDefault();
    	if ($scope.if_type(facet, 'bigint')) {
    		$scope.FacetsData.box[facet['table']][facet['name']]['min'] = $scope.FacetsData.box[facet['table']][facet['name']]['floor'];
    		$scope.FacetsData.box[facet['table']][facet['name']]['max'] = $scope.FacetsData.box[facet['table']][facet['name']]['ceil'];
    		$scope.delay_slider(facet);
    	} else if ($scope.if_type(facet, 'text')) {
    		$scope.FacetsData.box[facet['table']][facet['name']]['value'] = '';
    		$scope.delay_predicate(facet, event.keyCode);
    	} else if ($scope.if_type(facet, 'enum')) {
    		$.each($scope.FacetsData.box[facet['table']][facet['name']]['values'], function(key, value) {
    			$scope.FacetsData.box[facet['table']][facet['name']]['values'][key] = false;
    		});
    		$scope.predicate_checkbox(facet);
    	}
	}
    
	$scope.predicate_slider = function predicate_slider(facet) {
		if ($scope.FacetsData.box[facet['table']][facet['name']]['min'] > $scope.FacetsData.box[facet['table']][facet['name']]['floor']) {
			$scope.FacetsData.box[facet['table']][facet['name']]['left'] = true;
		} else if ($scope.FacetsData.box[facet['table']][facet['name']]['left'] && $scope.FacetsData.box[facet['table']][facet['name']]['min'] == $scope.FacetsData.box[facet['table']][facet['name']]['floor']) {
			delete $scope.FacetsData.box[facet['table']][facet['name']]['left'];
		}
		if ($scope.FacetsData.box[facet['table']][facet['name']]['max'] < $scope.FacetsData.box[facet['table']][facet['name']]['ceil']) {
			$scope.FacetsData.box[facet['table']][facet['name']]['right'] = true;
		} else if ($scope.FacetsData.box[facet['table']][facet['name']]['right'] && $scope.FacetsData.box[facet['table']][facet['name']]['max'] == $scope.FacetsData.box[facet['table']][facet['name']]['original_ceil']) {
			delete $scope.FacetsData.box[facet['table']][facet['name']]['right'];
		}
		setFacetClass($scope.FacetsData, facet, $scope.FacetsData.facetClass);
		FacetsService.setSortOption();
		$scope.FacetsData.pagingOptions.currentPage = 1;
		getErmrestData($scope.FacetsData, $scope.successSearchFacets, $scope.successUpdateModels);
	};

	$scope.predicate = function predicate(facet,keyCode) {
		if ($scope.FacetsData.box[facet['table']][facet['name']]['value'] == '') {
			$scope.FacetsData.facetClass[facet['table']][facet['name']] = '';
		} else {
			$scope.FacetsData.facetClass[facet['table']][facet['name']] = 'selectedFacet';
		}
		FacetsService.setSortOption();
		$scope.FacetsData.pagingOptions.currentPage = 1;
		getErmrestData($scope.FacetsData, $scope.successSearchFacets, $scope.successUpdateModels);
	};

	this.delay_slider = $scope.delay_slider = function delay_slider(facet) {
		if ($scope.FacetsData.filterSliderTimeout != null) {
			$timeout.cancel($scope.FacetsData.filterSliderTimeout);
		}
		$scope.FacetsData.filterSliderTimeout = $timeout(function(){$scope.predicate_slider(facet);}, 1); // delay 1 ms
	};

	this.delay_predicate = $scope.delay_predicate = function delay_predicate(facet,keyCode) {
		if ($scope.FacetsData.filterTextTimeout != null) {
			$timeout.cancel($scope.FacetsData.filterTextTimeout);
		}
		$scope.FacetsData.filterTextTimeout = $timeout(function(){$scope.predicate(facet,keyCode);}, 1000); // delay 1000 ms
	};

	this.showFacetValue = function showFacetValue(facet, value) {
		return ($scope.FacetsData.colsGroup[facet['table']][facet['name']][value] == 0 && !$scope.FacetsData.box[facet['table']][facet['name']]['values'][value]);
	};

	this.predicate_checkbox = $scope.predicate_checkbox = function predicate_checkbox(facet) {
		setFacetClass($scope.FacetsData, facet, $scope.FacetsData.facetClass);
		FacetsService.setSortOption();
		$scope.FacetsData.pagingOptions.currentPage = 1;
		getErmrestData($scope.FacetsData, $scope.successSearchFacets, $scope.successUpdateModels);
	};

	this.showChiclet = $scope.showChiclet  = function showChiclet(facet) {
		var facet_type = null;
		if ($scope.if_type(facet, 'bigint')) {
			facet_type = 'bigint';
		} else if ($scope.if_type(facet, 'text')) {
			facet_type = 'text';
		} else if ($scope.if_type(facet, 'enum')) {
			facet_type = 'enum';
		}
		var ret = facet_type != null ? $scope.showFacetValues(facet, facet_type) : false;
		return ret;
	};

	$scope.slideFilter = function slideFilter(event, toggle, tag) {
		//event.preventDefault();
		$scope.FacetsData.tag = tag;
		emptyJSON($scope.FacetsData.facetPreviousValues);
    	if ($scope.if_type($scope.FacetsData.tag, 'bigint')) {
    		$scope.FacetsData.facetPreviousValues['min'] = $scope.FacetsData.box[tag['table']][tag['name']]['min'];
    		$scope.FacetsData.facetPreviousValues['max'] = $scope.FacetsData.box[tag['table']][tag['name']]['max'];
    	} else if ($scope.if_type($scope.FacetsData.tag, 'text')) {
    		$scope.FacetsData.facetPreviousValues['value'] = $scope.FacetsData.box[tag['table']][tag['name']]['value'];
    	} else if ($scope.if_type($scope.FacetsData.tag, 'enum')) {
    		var values = {};
    		$.each($scope.FacetsData.box[tag['table']][tag['name']]['values'], function(key, value) {
    			values[key] = value;
    		});
    		$scope.FacetsData.facetPreviousValues['values'] = values;
    	}
    	FacetsService.sidebarClick(toggle);
    	if (toggle == 'field-toggle') {
    		setTimeout(function () {
    			if (!$scope.$$phase) {
    				$scope.$apply();
    			}
    			$scope.$broadcast('reCalcViewDimensions');
    		}, 1000);
    	}
	};

	this.editFacet = function editFacet(event, facet) {
    	event.preventDefault();
		setTimeout(function () {
			$('#filterButton').click();
			setTimeout(function () {
				$scope.slideFilter(null, 'field-toggle', facet);
			}, 1);
		}, 1);
		//alert(facet['display']);
	};

}]);

