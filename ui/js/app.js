$(document).ready(function() {

  /********************
  * INITIALIZATION
  * *******************/

  // REPLACE WITH YOUR OWN VALUES
  var APPLICATION_ID = 'xxx';
  var SEARCH_ONLY_API_KEY = 'xxx';
  var INDEX_NAME = 'Pictures';
  var HITS_PER_PAGE = 10;
  var FACET_CONFIG = [{ 
		name: 'tags', 
		title: 'Tag', 
		disjunctive: false, 
		sortFunction: sortByCountDesc 
	}];
  var MAX_VALUES_PER_FACET = 5;
  // END REPLACE

  // DOM binding
  var $inputField = $('#q');
  var $hits = $('#hits');
  var $stats = $('#stats');
  var $facets = $('#facets');
  var $pagination = $('#pagination');

  // Templates binding
  var hitTemplate = Hogan.compile($('#hit-template').text());
  var statsTemplate = Hogan.compile($('#stats-template').text());
  var facetTemplate = Hogan.compile($('#facet-template').text());
  var paginationTemplate = Hogan.compile($('#pagination-template').text());

  // Client initialization
  var algolia = algoliasearch(APPLICATION_ID, SEARCH_ONLY_API_KEY);

  // Helper initialization
  var params = {
    hitsPerPage: HITS_PER_PAGE,
    maxValuesPerFacet: MAX_VALUES_PER_FACET,
    facets: $.map(FACET_CONFIG, function(facet) { return !facet.disjunctive ? facet.name : null; }),
    disjunctiveFacets: $.map(FACET_CONFIG, function(facet) { return facet.disjunctive ? facet.name : null; })
  };
  var helper = algoliasearchHelper(algolia, INDEX_NAME, params);

  // Input binding
  $inputField
    .on('keyup', function() {
      var query = $inputField.val();
      toggleIconEmptyInput(!query.trim());
      helper.setQuery(query).search();
    })
    .focus();

  helper.on('change', setURLParams);

  helper.on('error', function(error) {
    console.log(error);
  });
  helper.on('result', function(content, state) {
    renderStats(content);
    renderHits(content);
    renderFacets(content, state);
    renderPagination(content);
  });

  /************
  * SEARCH
  * ***********/

  // Initial search
  initWithUrlParams();
  helper.search();

  function renderStats(content) {
    var stats = {
      nbHits: numberWithDelimiter(content.nbHits),
      processingTimeMS: content.processingTimeMS,
      nbHits_plural: content.nbHits !== 1
    };
    $stats.html(statsTemplate.render(stats));
  }

  function renderHits(content) {
    var hitsHtml = '';
    for (var i = 0; i < content.hits.length; ++i) {
      hitsHtml += hitTemplate.render(content.hits[i]);
    }
    if (content.hits.length === 0) hitsHtml = '<p id="no-hits">We didn\'t find any products for your search.</p>';
    $hits.html(hitsHtml);
  }

  function renderFacets(content, state) {
    // If no results
    if (content.hits.length === 0) {
      $facets.empty();
      return;
    }
    // Process facets
    var facets = [];
    for (var facetIndex = 0; facetIndex < FACET_CONFIG.length; ++facetIndex) {
      var facetParams = FACET_CONFIG[facetIndex];
      var facetResult = content.getFacetByName(facetParams.name);
      if (facetResult) {
        var facetContent = {};
        facetContent.facet = facetParams.name;
        facetContent.title = facetParams.title;
        facetContent.type = facetParams.type;

        // format and sort the facet values
        var values = [];
        for (var v in facetResult.data) {
          values.push({
            label: v,
            value: v,
            id: getUniqueId(),
            count: facetResult.data[v],
            refined: helper.isRefined(facetParams.name, v)
          });
        }
        var sortFunction = facetParams.sortFunction || sortByCountDesc;
        if (facetParams.topListIfRefined) sortFunction = sortByRefined(sortFunction);
        values.sort(sortFunction);
        facetContent.values = values.slice(0, 10);
        facetContent.has_other_values = values.length > 10;
        facetContent.other_values = values.slice(10);
        facetContent.disjunctive = facetParams.disjunctive;
				facets.push(facetContent);
      }
    }
    // Display facets
    var facetsHtml = '';
    for (var indexFacet = 0; indexFacet < facets.length; ++indexFacet) {
      var facet = facets[indexFacet];
      facetsHtml += facetTemplate.render(facet);
    }
    $facets.html(facetsHtml);
  }

  function renderPagination(content) {
    // If no results
    if (content.hits.length === 0) {
      $pagination.empty();
      return;
    }

    // Process pagination
    var pages = [];
    if (content.page > 5) {
      pages.push({ current: false, number: 1 });
      pages.push({ current: false, number: '...', disabled: true });
    }
    for (var p = content.page - 5; p < content.page + 5; ++p) {
      if (p < 0 || p >= content.nbPages) {
        continue;
      }
      pages.push({ current: content.page === p, number: p + 1 });
    }
    if (content.page + 5 < content.nbPages) {
      pages.push({ current: false, number: '...', disabled: true });
      pages.push({ current: false, number: content.nbPages });
    }
    var pagination = {
      pages: pages,
      prev_page: content.page > 0 ? content.page : false,
      next_page: content.page + 1 < content.nbPages ? content.page + 2 : false
    };
    // Display pagination
    $pagination.html(paginationTemplate.render(pagination));
  }

  // Click binding
  $(document).on('click', '.show-more, .show-less', function(e) {
    e.preventDefault();
    $(this).closest('ul').find('.show-more').toggle();
    $(this).closest('ul').find('.show-less').toggle();
    return false;
  });
  $(document).on('click', '.toggleRefine', function() {
    helper.toggleRefine($(this).data('facet'), $(this).data('value')).search();
    return false;
  });
  $(document).on('click', '.gotoPage', function() {
    helper.setCurrentPage(+$(this).data('page') - 1).search();
    $('html, body').animate({scrollTop:0}, '500', 'swing');
    return false;
  });
  $(document).on('click', '.sortBy',function() {
    $(this).closest('.btn-group').find('.sort-by').text($(this).text());
    helper.setIndex(INDEX_NAME + $(this).data('index-suffix')).search();
    return false;
  });
  $(document).on('click', '#input-search',function() {
    $inputField.val('').keyup();
  });

  // Dynamic styles
  $('#facets').on('mouseenter mouseleave', '.button-checkbox', function(){
    $(this).parent().find('.facet_link').toggleClass('hover');
  });
  $('#facets').on('mouseenter mouseleave', '.facet_link', function(){
    $(this).parent().find('.button-checkbox button.btn').toggleClass('hover');
  });


  /************
  * HELPERS
  * ***********/

  function toggleIconEmptyInput(isEmpty) {
    if(isEmpty) {
      $('#input-search')
        .addClass('glyphicon-search')
        .removeClass('glyphicon-remove');
    } else {
      $('#input-search')
        .removeClass('glyphicon-search')
        .addClass('glyphicon-remove');
    }
  }
  function numberWithDelimiter(number, delimiter) {
    number = number + '';
    delimiter = delimiter || ',';
    var split = number.split('.');
    split[0] = split[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1' + delimiter);
    return split.join('.');
  }
  function sortByCountDesc (a, b) {
    return b.count - a.count;
  }
  function sortByName (a, b) {
    return a.value.localeCompare(b.value);
  }
  function sortByRefined (sortFunction) {
    return function (a, b) {
      if (a.refined !== b.refined) {
        if (a.refined) return -1;
        if (b.refined) return 1;
      }
      return sortFunction(a, b);
    };
  }
  function initWithUrlParams() {
    var sPageURL = location.hash;
    if (!sPageURL || sPageURL.length === 0) {
      return true;
    }
    var sURLVariables = sPageURL.split('&');
    if (!sURLVariables || sURLVariables.length === 0) {
      return true;
    }
    var query = decodeURIComponent(sURLVariables[0].split('=')[1]);
    $inputField.val(query);
    helper.setQuery(query);
    for (var i = 2; i < sURLVariables.length; i++) {
      var sParameterName = sURLVariables[i].split('=');
      var facet = decodeURIComponent(sParameterName[0]);
      var value = decodeURIComponent(sParameterName[1]);
      helper.toggleRefine(facet, value, false);
    }
    // Page has to be set in the end to avoid being overwritten
    var page = decodeURIComponent(sURLVariables[1].split('=')[1]) -1;
    helper.setCurrentPage(page);
  }

  function setURLParams(state) {
    var urlParams = '#';
    var currentQuery = state.query;
    urlParams += 'q=' + encodeURIComponent(currentQuery);
    var currentPage = state.page + 1;
    urlParams += '&page=' + currentPage;
    for (var facetRefine in state.facetsRefinements) {
      urlParams += '&' + encodeURIComponent(facetRefine) + '=' + encodeURIComponent(state.facetsRefinements[facetRefine]);
    }
    for (var disjunctiveFacetrefine in state.disjunctiveFacetsRefinements) {
      for (var value in state.disjunctiveFacetsRefinements[disjunctiveFacetrefine]) {
        urlParams += '&' + encodeURIComponent(disjunctiveFacetrefine) + '=' + encodeURIComponent(state.disjunctiveFacetsRefinements[disjunctiveFacetrefine][value]);
      }
    }
    location.replace(urlParams);
  }

  var uniqueId = 0;
  function getUniqueId() {
    return 'uniqueId_' + (++uniqueId);
  }
});
