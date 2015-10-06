'use strict';

/* Controllers */

var ermInitController = angular.module('ermInitController', ['facetsModel', 'facetsService']);

//angular.module('ermrestApp').controller('InitListCtrl', ['$scope', 'FacetsData',
ermInitController.controller('InitListCtrl', ['$rootScope', '$scope', '$window', 'FacetsData', 'FacetsService', 'ermrest',
                                                      function($rootScope, $scope, $window, FacetsData, FacetsService, ermrest) {

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

	$('.sidebar-overlay').click(function(event) {
    if ($('.sidebar-overlay').hasClass('active')) {
      $('#collectionsTree').removeClass('open');
      $('.sidebar-overlay').removeClass('active');
    }
	});

	var searchQuery = getSearchQuery(window.location.href);
	if (searchQuery['entity'] != null) {
		var values = searchQuery['entity'].split(':');
		searchQuery['schema'] = decodeURIComponent(values[0]);
		searchQuery['table'] = decodeURIComponent(values[1]);
	}
	if (searchQuery['schema'] != null) {
		SCHEMA = searchQuery['schema'];
	} else if (SCHEMA == null) {
		//SCHEMA = 'legacy';
	}
	if (searchQuery['catalog'] != null) {
		CATALOG = searchQuery['catalog'];
	} else if (CATALOG == null) {
		if (chaiseConfig['catalog'] != null) {
			CATALOG = chaiseConfig['catalog'];
		} else {
			CATALOG = ermrest.catalog;
		}
	}
	authnProvider = ermrest.authnProvider;
	if (chaiseConfig['authnProvider'] != null) {
		authnProvider = chaiseConfig['authnProvider'];
	}

	if (chaiseConfig['facetPolicy'] != null) {
		facetPolicy = chaiseConfig['facetPolicy'];
	}

	$scope.FacetsData = FacetsData;

	FacetsService.initTable();

	if (searchQuery['table'] != null) {
		$scope.FacetsData.table = searchQuery['table'];
	} else {
		$scope.FacetsData.table = '';
	}

	if (searchQuery['page'] != null) {
		$scope.FacetsData.bookmarkPage = searchQuery['page'];
	} else {
		$scope.FacetsData.bookmarkPage = null;
	}

	if (searchQuery['facets'] != null) {
		$scope.FacetsData.filter = decodeFilter(searchQuery['facets']);
	} else {
		$scope.FacetsData.filter = null;
	}

	$window.addEventListener('popstate', function(event) {
    event.stopPropagation();
		event.preventDefault();
		$scope.FacetsData.isDetail = false;
		if (!$scope.$$phase) {
			$scope.$apply();
		}
	});

	$scope.FacetsData.view = ermrest.layout;
	if (searchQuery['layout'] != null) {
		$scope.FacetsData.view = searchQuery['layout'];
	} else if (chaiseConfig['layout'] != null) {
		$scope.FacetsData.view = chaiseConfig['layout'];
	}

	initApplication();
	this.hideSpinner = function hideSpinner() {
		//return !$scope.FacetsData.progress;
		return true;
	};
}]);
