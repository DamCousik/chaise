// Configure deployment-specific data here

var chaiseConfig = {
    layout: 'list',
    confirmDelete: true,
    headTitle: 'Chaise',
    customCSS: '/assets/css/chaise.css',
    navbarBrand: '/',
    navbarBrandImage: null,
    logoutURL: '/image-annotation',
    dataBrowser: '/',
    maxColumns: 6,
    showUnfilteredResults: false,
    defaultAnnotationColor: 'red',
    feedbackURL: 'http://goo.gl/forms/f30sfheh4H',
    helpURL: '/help/using-the-data-browser/',
    showBadgeCounts: false,
    recordUiGridEnabled: false,
    recordUiGridExportCSVEnabled: true,
    recordUiGridExportPDFEnabled: true,
    editRecord: true,
    tour: {
      pickRandom: false,
      searchInputAttribute: "Data",
      searchChosenAttribute: "Data Type",
      searchInputValue: "micro",
      extraAttribute: "Mouse Anatomic Source",
      chosenAttribute: "Data Type",
      chosenValue: "Expression microarray - gene"
    }
};

if (typeof module === 'object' && module.exports && typeof require === 'function') {
    exports.config = chaiseConfig;
}
