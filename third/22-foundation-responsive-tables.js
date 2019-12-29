function updateResponsiveTables() {
    var switched = false;
    var updateTables = function() {
        if (($(window).width() < 767) && !switched ){
            switched = true;
            $("table.responsive").each(function(i, element) {
                splitTable($(element));
            });
            return true;
        }
        else if (switched && ($(window).width() > 767)) {
            switched = false;
            $("table.unresponsive").each(function(i, element) {
                unsplitTable($(element));
            });
        } else {
            // align row heights
            var original = $('.scrollable > table');
            var copy = $('.pinned > table');
            setCellHeights(original, copy);
        }
    };
    
    // initial call
    updateTables();

    $(window).on("redraw",function(){switched=false;updateTables();}); // An event to listen for
    $(window).on("resize", updateTables);

    function splitTable(original)
    {
        original.wrap("<div class='table-wrapper' />");

        var copy = original.clone();
        
        // hide all columns except for the first
        copy.find("td:not(:first-child), th:not(:first-child)").css("display", "none");
        // hide the first column of the original
        original.find("td:first-child, th:first-child").css("display", "none");
        
        // fiddle with classes to make sure it splits just once
        copy.removeClass("responsive");
        original.removeClass("responsive");
        original.addClass("unresponsive");

        original.closest(".table-wrapper").append(copy);
        copy.wrap("<div class='pinned' />");
        original.wrap("<div class='scrollable' />");
        setCellHeights(original, copy);
    }

    /**
     * Merge two tables
     */
    function unsplitTable(original) {
    	// remove the first column
        original.closest(".table-wrapper").find(".pinned").remove();
        
        // put the necessary classes back
        original.addClass("responsive");
        original.removeClass("unresponsive");
        
        // display the first column of the original table
        original.find("td:first-child, th:first-child").css("display", "table-cell");
        original.unwrap();
        original.unwrap();
    }
    
    /**
     * Align cell heights of two split tables
     */
    function setCellHeights(original, copy) {

    	if (original.length && copy.length) {
        	var tr = original.find('tr'),
	        tr_copy = copy.find('tr'),
	        td = copy.find('td'),
	        heights = [];

	        tr.each(function (index) {
	            var self = $(this),
	                tx = self.find('th, td');
	
	            tx.each(function () {
	                var height = $(this).outerHeight(true);
	                heights[index] = heights[index] || 0;
	                if (height > heights[index]) heights[index] = height;
	            });
	        });
	
		    tr_copy.each(function (index) {
		        $(this).height(heights[index]);
		    });
    	}  
    }
};