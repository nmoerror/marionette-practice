'use strict';

WMAPP.module('Helper', function (Helper) {
	Helper.padLeft = function (nr, n, str) {
		return Array(n - String(nr).length + 1).join(str || '0') + nr;
	};

	Helper.spinnerTimer = null,
	Helper.spinnersShown = 0; // keep a record of the number of spinners showing, as we be loading multiple things simultaneously.
	Helper.progressBars = {}; // keep a record of all the currently shown progress bars

	Helper.refreshProgressBars = function() {
		var wrapper = $(".wmapp-global-progress-bar-wrapper");
		if (wrapper.length === 0) {
			wrapper = $('<div class="wmapp-global-progress-bar-wrapper"><ul></ul></div>');
			$('body').append(wrapper);
		}
		var bars = wrapper.find('ul');
		if (Helper.progressBars && _.size(Helper.progressBars) > 0) {
			$('.wmapp-spinner').addClass('showing-progress');
			_.each(_.values(Helper.progressBars), function(value, i) {
				var existingProgress = bars.find('li[data-progress-id="' + i + '"]');
				if (existingProgress && existingProgress.length) {
					existingProgress.find('span').css('width', value + '%').text(value.toFixed(0)+'%');
				} else {
					bars.append('<li data-progress-id="' + i + '"><span style="width:'+value+'%">'+value.toFixed(0)+'%</span></li>');
				}
			});
		} else {
			$('.wmapp-spinner').removeClass('showing-progress');
			wrapper.remove();
		}
	}

	Helper.showSpinner = function (text) {
		Helper.spinnersShown++;

		var str = "Showing spinner (" + Helper.spinnersShown + " active)";
		for (var i=1; i<Helper.spinnersShown; i++) {
			str = "\t" + str;
		}
		if (Helper.spinnersShown <= 10) {
			console.debug(str); // don't go crazy with the console logs. 10 levels deep is more than enough.
		}

		if (Helper.spinnerTimer != null) {
			clearInterval(Helper.spinnerTimer);
		}

		//WMAPP.Helper.printStackTrace();
		if ($(".wmapp-spinner").length === 0) {
			if (text) {
				$('body').append('<div class="wmapp-spinner" style="opacity: 1"><div></div><span>' + text + '</span></div>');
			} else {
				$('body').append('<div class="wmapp-spinner" style="opacity: 1"><div></div></div>');
			}
		} else {
			$(".wmapp-spinner").css('opacity', 1);
		}
	};

	Helper.hideSpinner = function () {
		if (Helper.spinnersShown <= 0) {
			// dont do anything if there's no spinners, but make sure the spinner element is gone!
			$(".wmapp-spinner").remove();
			return;
		}
		Helper.spinnersShown--;
		var str = "Hiding spinner (" + Helper.spinnersShown + " active)";
		for (var i=1; i<=Helper.spinnersShown; i++) {
			str = "\t" + str;
		}
		if (Helper.spinnersShown < 10) {
			console.debug(str); // don't go crazy with the console logs. 10 levels deep is more than enough.
		}
		//WMAPP.Helper.printStackTrace();
		if (Helper.spinnersShown === 0) {
			$(".wmapp-spinner").css('opacity', 0);

			Helper.spinnerTimer = setInterval(function () {
				// spinner opacity might still be decending
				if ($(".wmapp-spinner").css('opacity') == 0) {
					clearInterval(Helper.spinnerTimer);
					Helper.spinnersShown = 0;
					$(".wmapp-spinner").remove();

					console.log('HIDE SPINNER REFLOW');
					$(document).foundation('reflow');
				}
			}, 100);
		}
	};

	Helper.showStatus = function (msg) {
		if ($(".wmapp-status-message-wrapper").length === 0) {
			$('body').append('<div class="wmapp-status-message-wrapper"><div class="wmapp-status-message">' + msg + '</div></div>');
		} else {
			$(".wmapp-status-message").text(msg);
		}
	};

	Helper.hideStatus = function () {
		$(".wmapp-status-message-wrapper").remove();
	};
	
	Helper.showMessage = function (type, message, delay, container) {
		if (type == "error") {
			console.error(message);
		} else {
			console.log(message);
		}
		if  (!delay && typeof delay == 'undefined') {
			delay = 7000;
		}
        if(!message){
            return;
        }
		if (!container) {
			container = '.wmapp-message';
		}
		
		if (WMAPP.isApp) {
			if ($(container).length === 0) {
				$('body').append('<div class="wmapp-message ' + type + '"><p>' + message + '</p></div>');
				setTimeout(function () {
					$(container).addClass("visible");
				}, 10);
			} else {
				$(container+" p").text(message);
			}
			if (delay != 0) {
				clearInterval(Helper.hideMessageTimeout);
				var timeout = setInterval(function () {
					clearInterval(timeout);
					Helper.hideMessage();
				}, delay);
			}
		} else {
			$(container).html('');
			var msg = '<div data-alert class="alert-box ' + type + ' wmapp-message-' + type + '"><p style="margin-bottom: 0">' + message + '</p><a href="#" class="close">&times;</a></div>';
			if (delay != 0) {
				$(container).append(msg).fadeIn(200).delay(delay).fadeOut(2000);
			} else {
				$(container).append(msg).fadeIn(200);
			}

			$(document).foundation('reflow');
		}
	};

	Helper.hideMessage = function () {
		if (WMAPP.isApp) {
			$(".wmapp-message").removeClass("visible");
			setTimeout(function () {
				$('.wmapp-message').remove();
			}, 300);
		} else {
			$('.wmapp-message').html('');
		}
	};

	Helper.escape = function(text) {
		text = text || "";
		return text
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&#039;");
	};
	
	Helper.unescape = function(text) {
		text = text || "";
		return text
			.replace(/&amp;/g, "&")
			.replace(/&lt;/g, "<")
			.replace(/&gt;/g, ">")
			.replace(/&quot;/g, '"')
			.replace(/&#039;/g, "'");
	}
	
	Helper.pluralize = function (text) {
		if (typeof text == "undefined") {
			return "";
		}
		text = text.toString();
		var lastLetter = text.substr(text.length - 1).toLowerCase();
		var secondLast = text.substring(text.length - 2, text.length - 1).toLowerCase();
		var lastTwoLetters = text.substr(text.length - 2).toLowerCase();
		if (lastLetter == "y") {
			// if second last word is a vowel just append s
			if (secondLast == "a" || secondLast == "e" || secondLast == "i" || secondLast == "o" || secondLast == "u") {
				text += "s";
			} else {
				text = text.substring(0, text.length - 1) + "ies";
			}
			// Need some sort of checking to see if the word needs to be handled
			// differently i.e class
		} else if (lastTwoLetters == "ss") {
			text += "es";
		} else if (lastLetter == "s") {
			// do nothing!
		} else {
			text += "s";
		}
		return text;
	};

	Helper.aOrAn = function (text) {
		var firstLetter = text.substring(0, 1).toLowerCase();
		var vowles = ['a', 'e', 'i', 'o', 'u'];
		for (var i in vowles) {
			if (firstLetter == vowles[i]) {
				return 'an ' + text;
			}
		}
		return 'a ' + text;
	};

	Helper.showResponseErrors = function (formId, errors) {
		for (var attr in errors) {
			if (errors.hasOwnProperty(attr)) {
				var $el = $('[id=' + formId + WMAPP.Helper.upperCaseFirst(WMAPP.Helper.camelCase(attr)) + ']');
				var error = errors[attr][0];
				// add some classes
				if ($el.parent('label').length == 1) {
					$el.addClass('error');
					if ($el.parent('label').hasClass("error")) {
						$el.parent('label').removeClass("error");
						$el.next('small').remove();
					}
					$el.parent('label').addClass("error").append('<small class="error" data-attribute="' + attr + '">' + error + '</small>');
				} else if ($el.parent('div').length == 1) {
					if ($el.parent('div').hasClass("error")) {
						$el.parent('div').removeClass("error");
						$el.next('small').remove();
					}
					$el.parent('div').addClass("error").append('<small class="error" data-attribute="' + attr + '">' + error + '</small>');
				} else {
					// do something globally
					WMAPP.alert(error, null, null, true);
				}
			}
		}
	};

	Helper.clearErrors = function (formId, clearOffset) {
		if (clearOffset) {
			WMAPP.errorOffset = null;
		}
		$('small.error').remove();
		$('.error').removeClass('error');
	};

	Helper.searchUrl = function (formId, href) {
		// remove any query if we need
		var parts;
		var thatRegex = new RegExp('/?');
		if (thatRegex.test(href)) {
			parts = href.split('?');
			href = parts[0];
		}

		// get any named parameters
		var base = '/';
		var parse = href.split('/');
		var query = {};
		var thisRegex = new RegExp(':');
		for (var i = 0; i < parse.length; i++) {
			if (parse[i] !== '' && !thisRegex.test(parse[i])) {
				base += parse[i] + '/';
			} else if (thisRegex.test(parse[i])) {
				current = parse[i].split(':');

				if (current[0] != 'page') // reset the page, and dont send
				// through any empty values
					query[current[0]] = current[1];
			}
		}

		base = base + '?';

		// go through each input and get the value
		var $inputs = $('#' + formId + ' input[id^="' + formId + '"], #' + formId + ' input[id^="Member"], #' + formId + ' textarea[id^="' + formId + '"], #' + formId + ' textarea[id^="Member"], #' + formId + ' select[id^="' + formId + '"], #' + formId + ' select[id^="Member"]');
		$inputs.each(function () {
			if (this.type != 'hidden') {
				if (this.type == 'checkbox') {
					if (this.checked != undefined) {
						if (this.checked)
							query[this.name] = $(this).val();
						else
							query[this.name] = 0;
					}
				} else
					query[this.name] = $(this).val();
			}
		});

		// go thru the named parameters, and construct the href
		for (var key in query) {
			if (query.hasOwnProperty(key) && query[key] != '') {
				base += key + '=' + query[key] + '&';
			}
		}

		base = base.substring(0, base.length - 1);

		return base;
	};

	Helper.resetSearchUrl = function (formId, href) {
		var $inputs = $('#' + formId + ' input[id^="' + formId + '"], #' + formId + ' input[id^="Member"], #' + formId + ' textarea[id^="' + formId + '"], #' + formId + ' textarea[id^="Member"], #' + formId + ' select[id^="' + formId + '"], #' + formId + ' select[id^="Member"]');
		$inputs.each(function () {
			if (this.type != 'hidden') {
				if (this.type == 'checkbox') {
					if (this.checked != undefined) {
						if (this.checked)
							$(this).prop('checked', false);
					}
				} else
					$(this).val('');
			}
		});

		return href = $('#' + formId).attr('action');
	};

	Helper.getPropertyByPath = function (target, propertyPath) {
		if (!propertyPath) {
			return null;
		}
		var properties = propertyPath.split('.');
		var rslt = target;
		for (var i = 0; i < properties.length; i++) {
			rslt = rslt[properties[i]];
			if (typeof (rslt) === "undefined") {
				return null;
			}
		}
		return rslt;
	};

	Helper.camelCase = function (input, useSpaces) {
		var regex = /_(.)/g;
		if (useSpaces) {
			regex = /[_\s](.)/g
		}
		return input.toString().toLowerCase().replace(regex, function (match, group1) {
			return (useSpaces ? ' ' : '') + group1.toUpperCase();
		});
	};

	Helper.titleCase = function(input) {
		input = input.toString().toLowerCase().replace(/_/g, ' ');
		return input.replace(/(^|\s)(.)/g, function (match, group1, group2) {
			return group1 + group2.toUpperCase();
		});
	}

	Helper.upperCaseFirst = function (input) {
		return input.toString().charAt(0).toUpperCase() + input.slice(1);
	};

	Helper.lowerCaseFirst = function (input) {
		return input.toString().charAt(0).toLowerCase() + input.slice(1);
	};

	Helper.tableName = function (input, seperator) {
		if (seperator == undefined)
			seperator = '_';

		if (input !== null) {
			input = input.toString().replace(/[ ]+/g, seperator)
			input = input.replace(/[^a-zA-Z0-9_]+/g, seperator);
			input = input.replace(/[__]+/g, seperator);
			return input.toLowerCase();
		} else {
			return input;
		}
	};

	Helper.slugify = function (input, replacement) {
		if (replacement == undefined)
			replacement = '-';
		
		var replaced = input.toString().toLowerCase();
		var reg = new RegExp(replacement, "g");
		replaced = replaced.replace(reg, ' ');
		replaced = replaced.replace(/[^a-z0-9\s]/g, ' ').trim();
		replaced = replaced.replace(/\s+/g, " ");
		replaced = replaced.replace(/\s/g, replacement);		
		
//		var replaced = input.toString().toLowerCase();
//		var reg = new RegExp(replacement, "g");
//		replaced = replaced.replace(reg, ' ');
//		replaced = replaced.replace(/[^a-z0-9\s]/g, '_').trim();
//		replaced = replaced.replace(/_$/g, '');
//		replaced = replaced.replace(/\s+/g, " ");
//		replaced = replaced.replace(/\s/g, replacement);

		return replaced;
	};

	Helper.enableAutoComplete = function (inputField, suggestions, propertyName, options) {
		var targetInput = $(inputField).filter('input');
		if (targetInput.length < 1) {
			throw 'Error: cannot match an input element';
		}
		if (!_.isArray(suggestions)) {
			throw 'Error: suggestions must be an array';
		}
		if (!_.isString(propertyName)) {
			throw 'Error: propertyName must be a string';
		}
		var classNameSuffix = options.classNameSuffix;
		if (classNameSuffix && !_.isString(classNameSuffix)) {
			throw 'Error: classNameSuffix must be a string';
		}
		var onSelectCallback = options.onSelect;
		if (onSelectCallback && !_.isFunction(onSelectCallback)) {
			throw 'Error: onSelectCallback must be a function';
		}
		var suggestionEngine = new Bloodhound({
			datumTokenizer: Bloodhound.tokenizers.obj.whitespace(propertyName),
			queryTokenizer: Bloodhound.tokenizers.whitespace,
			local: suggestions
		});
		suggestionEngine.initialize();
		$(inputField).typeahead({
			hint: false,
			highlight: true,
			minLength: 1
		}, {
			name: classNameSuffix || 'wmapp-autocomplete',
			displayKey: propertyName,
			source: suggestionEngine.ttAdapter()
		});
		if (onSelectCallback) {
			$(inputField).off('typeahead:selected');
			$(inputField).on('typeahead:selected', onSelectCallback);
		}
		return $(inputField);
	};

	Helper.disableAutoComplete = function (inputField) {
		$(inputField).typeahead('destroy');
	};

	Helper.clearAutoComplete = function (inputField) {
		$(inputField).typeahead('val', '');
	};

	Helper.validateFileSize = function (size) {
		if (size > WMAPP._appSettings.maxUpload) {
			return false;
		} else {
			return true;
		}
	};

	Helper.validateImageType = function (imageType) {
		var check = imageType.replace('/', '_');

		var found = false;
		_.each(WMAPP.acceptedImageTypes, function (type, ext) {
			if (check == type || check == ext)
				found = true;
		});

		return found;
	};

	Helper.validateFileType = function (fileType) {
		if (fileType) {
			var check = fileType.replace('/', '_');

			var found = false;
			_.each(WMAPP.acceptedFileTypes, function (type, ext) {
				if (check == type || check == ext)
					found = true;
			});

			return found;
		} else {
			return false;
		}
	};

	Helper.isJSON = function (str) {
		try {
			JSON.parse(str);
		} catch (e) {
			return false;
		}
		return true;
	};

	/**
	 * Starts the ajax process, disables a button and displays the loader
	 */
	Helper.wmAjaxStart = function (element) {
		element.attr('disabled', 'disabled');
		element.append('<i id="wmAjaxPending" class="fa fa-refresh fa-spin" style="margin-left:0.3em"></i>');
	};

	/**
	 * Ends the ajax process, enables the button and removes the loader
	 */
	Helper.wmAjaxEnd = function (removeDisable) {
		if (!removeDisable)
			$('#wmAjaxPending').parent().removeAttr('disabled');
		$('#wmAjaxPending').remove();

		if (WMAPP.errorOffset != null) {
			$('html, body').animate({
		        scrollTop: WMAPP.errorOffset.offset().top - 100
		    }, 1000);
		}
	};

	Helper.toSubDomain = function (str) {
		return _.str.words(str.toLowerCase()).join('');
	};

	Helper.finiteInt = function (val, name) {
		if (!_.isNumber(val) || _.isNaN(val) || !_.isFinite(val) || ~~val !== val) {
			throw new TypeError("`" + name + "` must be a finite integer");
		}
		return val;
	};

	Helper.printStackTrace = function () {
		var e = new Error('dummy');
		var stack = e.stack.replace(/^[^\(]+?[\n$]/gm, '')
			.replace(/^\s+at\s+/gm, '')
			.replace(/^Object.<anonymous>\s*\(/gm, '{anonymous}()@')
			.split('\n');
		console.error("STACK TRACE");
	};

	Helper.base64ToBlob = function(b64Data, contentType, sliceSize) {
		contentType = contentType || '';
		sliceSize = sliceSize || 512;

		var byteCharacters = atob(b64Data);
		var byteArrays = [];

		for (var offset = 0; offset < byteCharacters.length; offset += sliceSize) {
			var slice = byteCharacters.slice(offset, offset + sliceSize);

			var byteNumbers = new Array(slice.length);
			for (var i = 0; i < slice.length; i++) {
				byteNumbers[i] = slice.charCodeAt(i);
			}

			var byteArray = new Uint8Array(byteNumbers);

			byteArrays.push(byteArray);
		}

		var blob = new Blob(byteArrays, {type: contentType});
		return blob;
	};

	Helper.resizeImage = function(img, maxWidth, maxHeight) {
		maxWidth = maxWidth ? maxWidth : ((WMAPP.isApp) ? 800 : WMAPP.maxImageHeight);
		maxHeight = maxHeight ? maxHeight : ((WMAPP.isApp) ? 600 : WMAPP.maxImageWidth);

		// Pull the image type out of the data uri with regex
		var imgType = /data:(.+);.+/.exec(img.src)[1];
		var canvas = document.createElement('canvas');
		var ctx = canvas.getContext("2d");
		ctx.drawImage(img, 0, 0);

		var width = img.width;
		var height = img.height;

		if (width > height) {
			if (width > maxWidth) {
				height *= maxWidth / width;
				width = maxWidth;
			}
		} else {
			if (height > maxHeight) {
				width *= maxHeight / height;
				height = maxHeight;
			}
		}

		canvas.width = width;
		canvas.height = height;
		ctx = canvas.getContext("2d");
		ctx.drawImage(img, 0, 0, width, height);
		return canvas.toDataURL(imgType, 1.0);
	}

	Helper.compareIds =  function(a, b) {
		return Helper.castId(a) == Helper.castId(b);
	}
	
	Helper.castId = function(value) {
		if (value) {
			if (Helper.isUuid(value)) {
				return value.toLowerCase();
			}
			else if (isFinite(value)) {
				return parseInt(value);
			}
			else {
				return value;
			}
		} else {
			return null;
		}
	}
	
	Helper.isUuid = function(value) {
		return value ? value.toString().toLowerCase().match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/) : false;
	}
	
	Helper.isValidId = function(value, allowNull) {
		allowNull = allowNull || true;
		if (value) {
			return Helper.isUuid(value) || (isFinite(value) && !isNaN(parseInt(value)));
		} else {
			return allowNull;
		}
	}
	
	Helper.generateUuid = function() {
		var d = new Date().getTime();
		if (typeof performance !== 'undefined' && typeof performance.now === 'function'){
			d += performance.now(); //use high-precision timer if available
		}
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
			var r = (d + Math.random() * 16) % 16 | 0;
			d = Math.floor(d / 16);
			return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
		});
	}

	Helper.random = function(min, max) {
		return Math.floor(Math.random()*(max-min+1)+min);
	};

	Helper.toCurrency = function(value) {
		if (typeof value == "undefined") {
			return "$0.00";
		}
		try {
			var res = parseFloat(value).toLocaleString("en-AU", {style: "currency", currency: "AUD", currencyDisplay: "symbol"});
			if (res == "NaN") {
				return "$0.00";
			} else {
				return res.substring(1)
			}
		} catch (error) {
			return "$0.00";
		}

	};

	Helper.parseUrl = function(url) {
		var parser = document.createElement('a');
		parser.href = url;

		parser.pathnameParts = parser.pathname.split('/');
		var index = parser.pathnameParts.indexOf("");
		parser.pathnameParts.splice(index, 1);

		return parser;
	};
	
	Helper.parseQueryString = function(queryString){
	    var params = {};
	    if(queryString){
	        _.each(
	            _.map(decodeURI(queryString).split(/&/g),function(el,i){
	                var aux = el.split('='), o = {};
	                if(aux.length >= 1){
	                    var val = undefined;
	                    if(aux.length == 2)
	                        val = aux[1];
	                    o[aux[0]] = val;
	                }
	                return o;
	            }),
	            function(o){
	                _.extend(params,o);
	            }
	        );
	    }
	    return params;
	};

	Helper.calculateBmi = function(weightKg, heightCm) {
		var weightKg = parseFloat(weightKg);
		var heightM = parseFloat(heightCm)*0.01;

		var bmi = weightKg/Math.pow(heightM,2);

		if (!isNaN(bmi)) {
			return bmi;
		}

		return null;
	};

	Helper.calculateWeightFromBmi = function(bmi, heightCm) {
		var bmi = parseFloat(bmi);
		var heightM = parseFloat(heightCm)*0.01;

		var weightKg = bmi * Math.pow(heightM,2);

		if (!isNaN(weightKg)) {
			return weightKg;
		}

		return null;
	};

	Helper.roundToNearest = function(value, toNearest, fixed) {
		value = typeof value == 'undefined' ? 0 : parseFloat(value);
		toNearest = typeof toNearest == 'undefined' ? 1 : toNearest;
		fixed = typeof fixed == 'undefined' ? 0 : fixed;
		return parseFloat((Math.round(value / toNearest) * toNearest).toFixed(fixed));
	}

	Helper.dateOrCreatedUpdated = function(model, dateAttr, createdAttr) {
		createdAttr = createdAttr ? createdAttr : 'created';
		return moment(model.get(dateAttr) ? model.get(dateAttr) : model.get(createdAttr), model.get(dateAttr) ? 'DD-MM-YYYY' : '');
	}

	Helper.average = function(collection, modelAttribute) {
		var average = 0;
		if (collection.each) {
			collection.each(function(model) {
				average += parseFloat(model.get(modelAttribute));
			});
		} else if (collection.length) {
			_.each(collection, function(value) {
				if (value instanceof Backbone.Model) {
					average += parseFloat(value.get(modelAttribute));
				} else {
					average += parseFloat(value);
				}
			});
		} else {
			return false;
		}
		return average / collection.length;
	}

	// Replace SVG images with SVG data for CSS styling	
	Helper.imgToSvg = function(el) {
		$(el).find('img').each(function() {
			var img = this;
			$.ajax({
				global: false,
				method: 'GET',
				url: $(img).attr('src'),
			}).then(function(data) {
				var svg = $(data).find('svg');
				for (var i=0; i<img.attributes.length; i++) {
					if (img.attributes[i] != 'src') {
						svg.attr(img.attributes[i].name, img.attributes[i].value);
					}
				}
				$(img).replaceWith(svg);
			});
		});
	};

	/**
	 * Turns a flat list of parent-child items into a hierarcy. Performs in O(2n).
	 *
	 * @param array $list	The flat list to hierarchify
	 * @param string $idFieldOnParent	The field which acts as the id for the parent row (eg `id` or `uuid`)
	 * @param string $parentIdFieldOnChild	The field which acts as the foreign key to the parent row (eg `parent_id` or `parent_uuid`)
	 * @param string $childrenFieldName	The name of the field to place nested children in the parent
	 * @return array
	 */
	Helper.flatListToHierarchy = function(list, idFieldOnParent, parentIdFieldOnChild, childrenFieldName) {
		idFieldOnParent = idFieldOnParent || 'id';
		parentIdFieldOnChild = parentIdFieldOnChild || 'parent_id';
		childrenFieldName = childrenFieldName || '_childs';
		
		// Initialise some vars
		var map = {};
		var hierarchy = [];

		// Loop over each item in the list (by reference)
		for (var i=0; i<list.length; i++) {
			var item = list[i];

			// Add the array to nest this item's children
			item.set(childrenFieldName, []);

			// Add this item to a map of id=>item
			map[item.get(idFieldOnParent)] = item;

			// If this item does not have a parent, it must be a "root", so add it to the top of the hierarchy
			if (!item.get(parentIdFieldOnChild)) {
				hierarchy.push(item);
			}
		}

		// Loop over each item in the list again (by reference)
		for (var i=0; i<list.length; i++) {
			var item = list[i];
			// If the item references a parent, grab the parent from the map and add this item to it as a child
			if (item.get(parentIdFieldOnChild)) {
				if (map[item.get(parentIdFieldOnChild)]) {
					map[item.get(parentIdFieldOnChild)].get(childrenFieldName).push(item);
				} else {
					// if the parent can't be found, let's treat this as a top-level item
					hierarchy.push(item);
				}
			}
		}

		// Return the Hierarchy
		return hierarchy;
	}
	
	Helper.sum = function(n) {
		if (!n || n <= 0) {
			return 0;
		} else {
			return n*(n+1)/2;
		}
	}
	
	Helper.factorial = function(n) {
		if (n < 0) {
			return -1;
		}
		else if (n == 0) {
			return 1;
		} else {
			return (n * Helper.factorial(n - 1));
		}
	}
	
	// JavaScript implementation of PHP's arrayWalkRecursive
	// original by: Hugues Peccatte
	//      note 1: Only works with user-defined functions, not built-in functions like void()
	//   example 1: array_walk_recursive([3, 4], function () {}, 'userdata')
	//   returns 1: true
	//   example 2: array_walk_recursive([3, [4]], function () {}, 'userdata')
	//   returns 2: true
	//   example 3: array_walk_recursive([3, []], function () {}, 'userdata')
	//   returns 3: true
	Helper.arrayWalkRecursive = function(array, funcname, userdata) {
		if (!array || typeof array !== 'object') {
			return false;
		}
		if (typeof funcname !== 'function') {
			return false;
		}
		for (var key in array) {
			if (Object.prototype.toString.call(array[key]) === '[object Array]') {
				var funcArgs = [array[key], funcname]
				if (arguments.length > 2) {
					funcArgs.push(userdata);
				}
				if (Helper.arrayWalkRecursive.apply(null, funcArgs) === false) {
					return false;
				}
				continue;
			}
			try {
				if (arguments.length > 2) {
					funcname(array[key], key, userdata);
				} else {
					funcname(array[key], key);
				}
			} catch (e) {
				return false;
			}
		}
		return true;
	}
	
	// Converts new line characters to line breaks
	Helper.nl2br = function(str) {
		str = (str || '').toString();
		return str.replace(/\r\n|\r|\n/g, '<br/>');
	};
	
	// Converts hex codes to RGB
	Helper.hexToRgb = function(hex) {
		var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
		return result ? {
			r: parseInt(result[1], 16),
			g: parseInt(result[2], 16),
			b: parseInt(result[3], 16)
		} : null;
	}

	// Helper Function for XIRR from https://gist.github.com/ghalimi/4669712
	/*
	 * Licensed to the Apache Software Foundation (ASF) under one
	 * or more contributor license agreements.  See the NOTICE file
	 * distributed with this work for additional information
	 * regarding copyright ownership.  The ASF licenses this file
	 * to you under the Apache License, Version 2.0 (the
	 * "License"); you may not use this file except in compliance
	 * with the License.  You may obtain a copy of the License at
	 *
	 *   http://www.apache.org/licenses/LICENSE-2.0
	 *
	 * Unless required by applicable law or agreed to in writing,
	 * software distributed under the License is distributed on an
	 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
	 * KIND, either express or implied.  See the License for the
	 * specific language governing permissions and limitations
	 * under the License.
	 *
	 *************************************************************/

	Helper.XIRR = function(values, dates, guess) {
	  // Credits: algorithm inspired by Apache OpenOffice

	  // Calculates the resulting amount
	  var irrResult = function(values, dates, rate) {
	    var r = rate + 1;
	    var result = values[0];
	    for (var i = 1; i < values.length; i++) {
	    	result += values[i] / Math.pow(r, moment(dates[i]).diff(moment(dates[0]), 'days') / 365);
	    }
	    return result;
	  }

	  // Calculates the first derivation
	  var irrResultDeriv = function(values, dates, rate) {
	    var r = rate + 1;
	    var result = 0;
	    for (var i = 1; i < values.length; i++) {
	      var frac = moment(dates[i]).diff(moment(dates[0]), 'days') / 365;
	      result -= frac * values[i] / Math.pow(r, frac + 1);
	    }
	    return result;
	  }

	  // Check that values contains at least one positive value and one negative value
	  var positive = false;
	  var negative = false;
	  for (var i = 0; i < values.length; i++) {
	    if (values[i] > 0) positive = true;
	    if (values[i] < 0) negative = true;
	  }

	  // Return error if values does not contain at least one positive value and one negative value
	  if (!positive || !negative) return '#NUM!';

	  // Initialize guess and resultRate
	  var guess = (typeof guess === 'undefined') ? 0.1 : guess;
	  var resultRate = guess;

	  // Set maximum epsilon for end of iteration
	  var epsMax = 1e-10;

	  // Set maximum number of iterations
	  var iterMax = 50;

	  // Implement Newton's method
	  var newRate, epsRate, resultValue;
	  var iteration = 0;
	  var contLoop = true;
	  do {
	    resultValue = irrResult(values, dates, resultRate);
	    newRate = resultRate - resultValue / irrResultDeriv(values, dates, resultRate);
	    epsRate = Math.abs(newRate - resultRate);
	    resultRate = newRate;
	    contLoop = (epsRate > epsMax) && (Math.abs(resultValue) > epsMax);
	  } while(contLoop && (++iteration < iterMax));

	  if(contLoop) return '#NUM!';

	  // Return internal rate of return
	  return resultRate;
	};
	
	Helper.fGetSuffix = function(nPos){

	    var sSuffix = "";

	    switch (nPos % 10){
	        case 1:
	            sSuffix = (nPos % 100 === 11) ? "th" : "st";
	            break;
	        case 2:
	            sSuffix = (nPos % 100 === 12) ? "th" : "nd";
	            break;
	        case 3:
	            sSuffix = (nPos % 100 === 13) ? "th" : "rd";
	            break;
	        default:
	            sSuffix = "th";
	            break;
	    }

	    return sSuffix;
	};

	/**
	 * A lookup function that doesn't throw exceptions if there is a lookup on a null value
	 *
	 * Take the following javascript object:
	 * var o = {a: {b: {c: 4}}, x: 'hello world'}
	 *
	 * Now you can normally lookup a value in the object
	 * o.a.b.c // 4
	 *
	 * However you can have exceptions
	 * o.a.d.c // Uncaught TypeError: Cannot read property 'c' of undefined
	 *
	 * This function takes an object and a lookup array that shall stop if it runs into issues.
	 * To compare to our first examples
	 * WMAPP.Helper.safeLookup(o, ['a', 'b', 'c']) // 4
	 * WMAPP.Helper.safeLookup(o, ['a', 'd', 'c']) // undefined
	 *
	 * We can also call functions using safelookup if the lookup value is a JSON object
	 * The key is a function name and the value is an array of args (will be converted to an array of length 1 if it is not an array)
	 * WMAPP.Helper.safeLookup(o, ['x', {replace: ['l', 'a']}]) // "healo world"
	 *
	 * This can be useful for nested backbone models
	 *
	 * WMAPP.Helper.safeLookup(myModel, [
	 *     {get: '_thing'},
	 *     {get: '_stuff'},
	 *     {get: '_other'}
	 * ]) // Some model or undefined if there is a break in the chain
	 *
	 * @param obj {Object} The object to perform a lookup on
	 * @param lookup {Object[]} A lookup array
	 * @returns {*} The result of the lookup or undefined|null on failure
	 */
	Helper.safeLookup = function(obj, lookup) {
		var result = obj;
		for (var i = 0; i < lookup.length; i++) {
			if (result === null || result === undefined) {
				return result;
			}
			if (_.isObject(lookup[i])) {
				var keys = Object.keys(lookup[i]);
				if (keys.length > 0) {
					if (typeof result[keys[0]] !== 'function') {
						return undefined;
					}

					var v;
					if (_.isArray(lookup[i][keys[0]])) {
						v = lookup[i][keys[0]];
					} else {
						v = [lookup[i][keys[0]]];
					}
					result = result[keys[0]].apply(result, v);
				}
			} else {
				result = result[lookup[i]];
			}
		}
		return result;
	};

	/**
	 * It builds urls, nuff said
	 * It takes a url and query params and joins them together
	 *
	 * Example:
	 * WMAPP.Helper.buildUrl('https://google.com', {first: 'thing', second: 'stuff'})
	 * will make:
	 * "https://google.com?first=thing&second=stuff"
	 *
	 * @param urlBase {string} The base url
	 * @param queryParams {{string: string}} A map of query params
	 * @returns {string} The composed url
	 */
	Helper.buildUrl = function(urlBase, queryParams) {
		return urlBase + '?' + _.map(queryParams, function(v, k){return k + '=' + v}).join('&');
	}
});
