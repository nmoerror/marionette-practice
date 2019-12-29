'use strict';

WMAPP.module('Extension.Model', function (Model) {
	/**
	 * Extend the Model
	 */
	Model.AbstractModel = Backbone.AssociatedModel.extend({

		// Default URL for the model's representation on the server -- if you're
		// using Backbone's restful methods, override this to change the endpoint
		// that will be called.
		url: function () {
			var base =
				_.result(this, 'urlRoot') ||
				_.result(this.collection, 'url') ||
				function () {
					throw new Error('A "url" property or function must be specified');
				}();
			if (this.isNew()) return base + this.parseQueryParams();
			return base.replace(/([^\/])$/, '$1/') + encodeURIComponent(this.id) + this.parseQueryParams();
		},

		queryParams: {},
		
		parseQueryParams: function (queryParams) {
			queryParams = queryParams || this.queryParams;
			if (_.isEmpty(queryParams)) {
				return '';
			} else {
				var str = '?';
				_.each(queryParams, function (value, key) {
					str += key + '=' + value + '&';
				});
				return str.substring(0, str.length - 1);
			}
		},

		fetch: function (options) {
			if (!options || !options.suppressSpinner) {
				WMAPP.Helper.showSpinner();
				if (WMAPP.isApp && (!options || !options.suppressStatus) && typeof this.displayName != "undefined") {
					WMAPP.Helper.showStatus('Loading ' + this.displayName);
				}
			}
			var promise = Backbone.AssociatedModel.prototype.fetch.call(this, options);
			promise.then(function () {
				if (!options || !options.suppressSpinner) {
					WMAPP.Helper.hideSpinner();
					WMAPP.Helper.hideStatus();
				}
				if (options && typeof options.success == "function") {
					options.success();
				}
			}, function (xhr) {
				if (!options || !options.suppressSpinner) {
					WMAPP.Helper.hideSpinner();
					WMAPP.Helper.hideStatus();
				}
				if (options && typeof options.error == "function") {
					options.error();
				}
				WMAPP.xhrPromiseErrorHandler(xhr, this);
			});
			return promise;
		},

		save: function (key, val, options) {
			if (!key || !key.suppressSpinner) {
				WMAPP.Helper.showSpinner();
				if (WMAPP.isApp && (!key || !key.suppressStatus) && typeof this.displayName != "undefined") {
					WMAPP.Helper.showStatus('Saving ' + this.displayName);
				}
			}

			if (typeof this.attributes.modified != "undefined") {
				this.set('modified', moment().format('YYYY-MM-DD HH:mm:ss'));
			}

			var promise = Backbone.AssociatedModel.prototype.save.call(this, key, val, options);
			if (promise) {
				promise.then(function () {
					if (!key || !key.suppressSpinner) {
						WMAPP.Helper.hideSpinner();
						WMAPP.Helper.hideStatus();
					}
					if (key && typeof key.success == "function") {
						key.success();
					}
				}, function (xhr) {
					if (!key || !key.suppressSpinner) {
						WMAPP.Helper.hideSpinner();
						WMAPP.Helper.hideStatus();
					}
					if (key && typeof key.error == "function") {
						key.error();
					}
					WMAPP.xhrPromiseErrorHandler(xhr, this);
				});
				return promise;
			} else {
				if (!key || !key.suppressSpinner) {
					WMAPP.Helper.hideSpinner();
					WMAPP.Helper.hideStatus();
				}
			}
			return false;
		},
		destruct: function() {
			if (this._options && this._options.preventDestroy) {
				return;
			}
			var that = this;
			this.stopListening();
			_.each(this.attributes, function(value, attribute) {
				if (value && ((value instanceof WMAPP.Extension.Model.Collection) || (value instanceof WMAPP.Extension.Model.PageableCollection))) {
					value.destroy();
				} else if (value && value instanceof WMAPP.Extension.Model.AbstractModel) {
					value.destruct();
				}
			});
			if (this.collection) {
				delete this.collection;
			}
			if (this.jqXhr) {
				delete this.jqXhr;
			}
			this.clear({silent: true});
			
			this.isDestructed = true;
		},
        destroy: function(options) {
        	options = options ? _.clone(options) : {};
        	options.headers = {};
        	
            // set the header?
        	if (this.get('delete_user')) {
        		options.headers['X-Member-delete'] = WMAPP.member.id;	
        	}
        	
            // Call the base implementation
            var xhr =  Backbone.AssociatedModel.prototype.destroy.apply(this, [options]);

            return xhr;
        },			

		initialize: function (model, options) {
			var url = this.getUrl();
			options || (options = {});
			this._options = options;
			
			this.queryParams = new Object();
			
			if (options && options.allowAbortXhr) {
				this.listenTo(WMAPP.vent, 'trigger:xhr:abort:all', this.abortXhr);
				this.listenTo(WMAPP.vent, 'trigger:xhr:abort:' + this.storeName, this.abortXhr);
			}
			
			Backbone.AssociatedModel.prototype.initialize.apply(this, arguments);
		},

		abortXhr: function(id) {
			if (this.jqXhr) {
				if (typeof id != 'undefined' && id != this.id) {
					// if an id was defined, but it doesnt match this model, just ignore the event
					return;
				}
				this.isAborted = true;
				this.jqXhr.abort();
			}
		},

		urlRoot: function () {
			return this.getUrl();
		},

        getUrl: function(domain){
            domain = domain || WMAPP.domain || "";
        	if (this.urlOnce) {
        		var url = this.urlOnce
        		this.urlOnce = null;
        		return url;
        	} else {
                if((WMAPP.isBackend === true && _.isString(this.backendUrlRoot)) || WMAPP.isAdmin) {
                    return this.backendUrlRoot;
                } else if((WMAPP.isBackend === false) && _.isString(this.frontendUrlRoot)) {
                	if (WMAPP.isApp) {
        				if (domain) {
        					domain = "https://" + domain;
        				}
        				return domain + this.frontendUrlRoot;
                	} else {
                		return this.frontendUrlRoot;
                	}
                } else {
                    return null;
                }
        	}
        },
        
        orderUp: function() {
            this.set({order: this.get('order') - 1});
        },
     
        orderDown: function() {
            this.set({order: this.get('order') + 1});
        },

        // Resets changed attributes to their saved attributes (will reset anything not saved)
        // Takes an optional array of keys. If keys, will reset only those keys
        reset: function(keys) {
            var that = this;
            if (! keys) {
                keys = Object.keys(this.changed)
					.filter(function(k) {
						// We don't want to touch anything that's a model
						return !(k.charAt(0) === '_');
					});
            };
            keys.map(function (k) {
				that.set(k, that._previousAttributes[k])
			});
            return this;
        },

    });
	
	/**
	 * Extend the Model to define a signature model
	 */
	Model.EntitySignature = Backbone.AssociatedModel.extend({
		frontendUrlRoot: "/",
		backendUrlRoot: "/",
		defaults: {
			json: null,
			toUrl: null,
		},
		relations: [
	        {
	    		type: Backbone.One,
	    		key: 'signature',
	    		relatedModel: 'WMAPP.Extension.Model.Signature',
	    	},
     		// <protected> TODO: add any extra relationships here
			// </protected>
        ],
		validation: {
			entity: {
				required: true,
				msg: 'This is required'
			},
			signature: {
				required: true,
				model: 'This is required'
			},
			// <protected> TODO: add any custom validation rules in here
			// </protected>
		},
	});

	/**
	 * Extend the Model to define a signature model
	 */
	Model.Signature = Backbone.AssociatedModel.extend({
		frontendUrlRoot: "/",
		backendUrlRoot: "/",
		defaults: {
			json: null,
			toUrl: null,
		},
		validation: {
			json: {
				required: true,
			},
			toUrl: {
				required: true,
			},
			// <protected> TODO: add any custom validation rules in here
			// </protected>
		},
	});	

    /**
     * Extend the Collection
     */
    Model.Collection = Backbone.Collection.extend({
		url: function() {
			return this.getUrl() + this.parseQueryParams();
		},
		
		model: Model.AbstractModel,

		queryParams: {},
		
		parse: function(response) {
			if (response.state) {
				if (WMAPP.isApp) {
					this.state = {};
					this.state.totalRecords = response.state.total;
				}

				return response.items;
			} else {
				return response;
			}
		},

		fetch: function (options) {
			if (!options || !options.suppressSpinner) {
				WMAPP.Helper.showSpinner();
				if (WMAPP.isApp && (!options || !options.suppressStatus) && typeof this.displayName != "undefined") {
					WMAPP.Helper.showStatus('Loading ' + WMAPP.Helper.pluralize(this.displayName));
				}
			}
			var promise = Backbone.Collection.prototype.fetch.call(this, options);
			promise.then(function () {
				if (!options || !options.suppressSpinner) {
					WMAPP.Helper.hideSpinner();
					WMAPP.Helper.hideStatus();
				}
				if (options && typeof options.success == "function") {
					options.success();
				}
			}, function (xhr) {
				if (!options || !options.suppressSpinner) {
					WMAPP.Helper.hideSpinner();
					WMAPP.Helper.hideStatus();
				}
				if (options && typeof options.error == "function") {
					options.error();
				}
				WMAPP.xhrPromiseErrorHandler(xhr, this);
			});
			return promise;
		},

		parseQueryParams: function (queryParams) {
			queryParams = queryParams || this.queryParams;
			if (_.isEmpty(queryParams)) {
				return '';
			} else {
				var str = '?';
				_.each(queryParams, function (value, key) {
					str += key + '=' + value + '&';
				});
				return str.substring(0, str.length - 1);
			}
		},

        getUrl: function(domain) {
            domain = domain || WMAPP.domain || "";
			if (this.urlOnce) {
				var url = this.urlOnce
				this.urlOnce = null;
				return url;
			} else {
				if ((WMAPP.isBackend === true) && _.isString(this.backendUrl)) {
					return this.backendUrl;
				} else if ((WMAPP.isBackend === false) && _.isString(this.frontendUrl)) {
					if (WMAPP.isApp) {
						if (domain) {
							domain = "https://" + domain;
						}
						return domain + this.frontendUrl;
					} else {
						return this.frontendUrl;
					}
				} else {
					return null;
				}
			}
		},

		initialize: function (models, options) {
			var that = this;
			options || (options = {});
			this._options = options;
			if (options.displayAttribute) {
				this.displayAttribute = options.displayAttribute;
			};

			this.queryParams = new Object();
			this.isLoading = false;

			this.listenTo(this, 'request', this.setIsLoading);
			this.listenTo(this, 'reset', this.unsetIsLoading);

			if (options) {
				if (this.dao && options.registerSyncEvents) {
					this.listenTo(WMAPP.vent, 'trigger:app:sync:complete:' + this.dao.prototype.modelName, WMAPP.Extension.Model.afterSync);
				}
				if (options.allowAbortXhr) {
					this.listenTo(WMAPP.vent, 'trigger:xhr:abort:all', Model.Collection.prototype.abortXhr);
					this.listenTo(WMAPP.vent, 'trigger:xhr:abort:' + this.storeName, Model.Collection.prototype.abortXhr);
				}
			}
			
			Backbone.Collection.prototype.initialize.apply(this, arguments);
		},

		abortXhr: function() {
			if (this.jqXhr) {
				this.isAborted = true;
				this.jqXhr.abort();
			}
		},

		setIsLoading: function () {
			this.isLoading = true;
		},

		unsetIsLoading: function () {
			this.isLoading = false;
		},
		destruct: function() {
			if (this._options && this._options.preventDestroy) {
				return;
			}
			var that = this;
			this.stopListening();
			this.each(function(model) {
				model.destruct();
			});
			if (this.jqXhr) {
				delete this.jqXhr;
			}
			this.reset(null, {silent: true});
			
			this.isDestructed = true;
		},
		destroy: function() {
			this.destruct();
			this.isDestroyed = true;
		},

		
		/*
		 * Get a count of the local records using the models dao
		 */
		countLocal: function (callback) {
			if (!this.dao) {
				return;
			}
			var that = this;
			var dao = new this.dao();
			dao.setDb(window.db, this, function (tableCreated) {
				dao.setConditions(that, function () {
					dao.findCount(this, function (count) {
						if (typeof callback == "function") {
							callback(count);
						}
					});
				});
			});
		},
		
		replace: function(model, index) {
			this.remove(this.at(index));
			this.add(model, {at: index});
		},
		
		orderUp: function(model) {
		    // find the model we're going to swap order with
		    var orderToSwap = model.get('order') - 1;
		    var otherModel = this.at(orderToSwap - 1);
		 
		    // swap order
		    if (otherModel) {
			    model.orderUp();
			    otherModel.orderDown();
			    
			    this.sort();
		    }
		},
		 
		orderDown: function(model) {
		    // find the model we're going to swap order with
		    var orderToSwap = model.get('order') + 1;
		    var otherModel = this.at(orderToSwap - 1);
		 
		    // swap order
		    if (otherModel) {
			    model.orderDown();
			    otherModel.orderUp();
			    
			    this.sort();
		    }
		},	
		
		add: function (models, options) {
			Backbone.Collection.prototype.add.apply(this, arguments);
		},
		
		remove: function (models, options) {
			Backbone.Collection.prototype.remove.apply(this, arguments);
		},			
	});

	WMAPP.Extension.Model.Collection.prototype.save = function (options) {
		if (!options || !options.suppressSpinner) {
			WMAPP.Helper.showSpinner();
			if (WMAPP.isApp && (!options || !options.suppressStatus) && typeof this.displayName != "undefined") {
				WMAPP.Helper.showStatus('Saving ' + WMAPP.Helper.pluralize(this.displayName));
			}
		}
		var promise = Backbone.sync("update", this, options);
		promise.then(function () {
			if (!options || !options.suppressSpinner) {
				WMAPP.Helper.hideSpinner();
				WMAPP.Helper.hideStatus();
			}
			if (options && typeof options.success == "function") {
				options.success();
			}
		}, function (xhr) {
			if (!options || !options.suppressSpinner) {
				WMAPP.Helper.hideSpinner();
				WMAPP.Helper.hideStatus();
			}
			if (options && typeof options.error == "function") {
				options.error();
			}
			WMAPP.xhrPromiseErrorHandler(xhr, this);
		});
		return promise;
    };


	/**
	 * Extend the PageableCollection
	 */
	Model.PageableCollection = Backbone.PageableCollection.extend({
		initialize: function(models, options) {
			var that = this;
			this._options = options;
			
			if (options) {
				if (this.dao && options.registerSyncEvents) {
					this.listenTo(WMAPP.vent, 'trigger:app:sync:complete:' + this.dao.prototype.modelName, WMAPP.Extension.Model.afterSync);
				}
				if (options.allowAbortXhr) {
					this.listenTo(WMAPP.vent, 'trigger:xhr:abort:all', Model.Collection.prototype.abortXhr);
					this.listenTo(WMAPP.vent, 'trigger:xhr:abort:' + this.storeName, Model.Collection.prototype.abortXhr);
				}
			}

			Backbone.PageableCollection.prototype.initialize.apply(this, arguments);
		},
		destroy: Model.Collection.prototype.destroy,
		destruct: Model.Collection.prototype.destruct,
		fetch: function (options) {
			options = options || {};
			if (!options.suppressSpinner) {
				WMAPP.Helper.showSpinner();
				if (WMAPP.isApp && (!options || !options.suppressStatus) && typeof this.displayName != "undefined") {
					WMAPP.Helper.showStatus('Loading ' + WMAPP.Helper.pluralize(this.displayName));
				}
			}
			if (options.reset && this.mode == "infinite") {
				this.fullCollection.reset(null, {silent: true});
			}
			var promise = Backbone.PageableCollection.prototype.fetch.call(this, options);
			promise.then(function () {
				if (!options || !options.suppressSpinner) {
					WMAPP.Helper.hideSpinner();
					WMAPP.Helper.hideStatus();
				}
			}, function () {
				if (!options || !options.suppressSpinner) {
					WMAPP.Helper.hideSpinner();
					WMAPP.Helper.hideStatus();
				}
			});
			return promise;
		},
		url: function () {
			return this.getUrl();
		},
        getUrl: function(domain){
            domain = domain || WMAPP.domain || "";
			if (this.urlOnce) {
				var url = this.urlOnce;
				this.urlOnce = null;
				return url;
			} else {
				if ((WMAPP.isBackend === true) && _.isString(this.backendUrl)) {
					return this.backendUrl;
				} else if ((WMAPP.isBackend === false) && _.isString(this.frontendUrl)) {
					if (WMAPP.isApp) {
						if (domain) {
							domain = "https://" + domain;
						}
						return domain + this.frontendUrl;
					} else {
						return this.frontendUrl;
					}
				} else {
					return null;
				}
			}
		},
		state: function() {
			if (WMAPP.isApp) {
				return { pageSize: 10 };
			} else {
				return { pageSize: 20 };
			}
		},
		parseLinks: function(response) {
			var links = {}
			var lastPage = Math.ceil(response.state.total / this.state.pageSize);

			var queryParams = _.extend(_.omit(this.queryParams || {}, ['currentPage', 'directions', 'order', 'pageSize', 'sortKey', 'totalPages', 'totalRecords']), {
				page: this.state.firstPage,
				per_page: this.state.pageSize
			});
			
			links['first'] = this.getUrl() + WMAPP.Extension.Model.Collection.prototype.parseQueryParams.call(null, queryParams);
			
			
			queryParams.page = lastPage;
			links['last'] = this.getUrl() + WMAPP.Extension.Model.Collection.prototype.parseQueryParams.call(null, queryParams);
			
			if (this.state.currentPage < lastPage) {
				queryParams.page = this.state.currentPage+1;
				links['next'] = this.getUrl() + WMAPP.Extension.Model.Collection.prototype.parseQueryParams.call(null, queryParams);
			}
			
			return links;
		},
		parseState: function (resp, queryParams, state, options) {
			if (resp && resp.state) {
				return {
					totalRecords: resp.state.total,
					currentPage: resp.state.page
				};
			}
		},
		parseRecords: function (resp, options) {
			if (resp && resp.items) {
				return resp.items;
			} else {
				return resp;
			}
		},
		parseBeforeLocalSave: function (resp, options) {
			if (resp && resp.state) {
				this.state.totalRecords = resp.state.total;
				this.state.currentPage = resp.state.page;
				this.state.totalPages = Math.floor(this.state.totalRecords / this.state.pageSize);
				this.state.lastPage = Math.floor(this.state.totalRecords / this.state.pageSize);
			}

			if (resp && resp.items) {
				return resp.items;
			} else {
				return resp;
			}
		},
		queryParams: {
			sortKey: "sort",
			order: "direction"
		},
		getPage: function (index, options) {
			if (!options) {
				var options = {};
			}
			options.remote = true;
			options.add = true;
			arguments[1] = options;
			Backbone.PageableCollection.prototype.getPage.apply(this, arguments);
			return this;
		},
		deleteMultiple: function (ids, deleteUser) {
			var url = this.url + '?ids=' + ids.join('|');
			var ids;
			var result;
			$.ajax({
				url: url,
				dataType: 'json',
				type: 'DELETE',
				beforeSend: function(request) {
				    request.setRequestHeader("X-Member-delete", deleteUser);
				},
				async: false,
				timeout: 30000,
				success: function (data) {
					result = data;
				},
				error: function (data) {
					if (response.responseJSON) {
						result = data.responseJSON;
						if (response.responseJSON.message) {
							WMAPP.Helper.showMessage('alert', response.responseJSON.message);
						}
						if (response.responseJSON.errors) {
							model.validationError = response.responseJSON.errors;
						}
					} else if (response.statusText && response.status) {
						WMAPP.Helper.showMessage('alert', "Error (" + response.status + "): " + response.statusText);
					} else {
						WMAPP.Helper.showMessage('alert', "An unknown error has occurred.");
					}
				}
			});
			return result;
		},
		loadMore: function() {
			var that = this;
			var state = _.clone(this.state);
			var remoteRecordsToFetch = 2*that.state.pageSize;
			var modelName = this.storeName.split('.').pop();
			var collection = eval('new WMAPP.' + this.featureName + '.Model.' + modelName + 'Collection([], { suppressSyncEvents: true})');
			collection.remote = true;

			// set the query params for the call
			collection.queryParams = _.omit(this.queryParams, _.without(WMAPP.Extension.DAO.AbstractDAO.prototype.omitQueryParams, 'expand'));
			collection.queryParams.limit = remoteRecordsToFetch;
			if (that.pageableSorting) {
				collection.queryParams.direction = that.pageableSorting.direction > 0 ? 'ASC' : 'DESC';
				collection.queryParams.sort = that.pageableSorting.attribute;
				collection.queryParams[that.featureName + modelName + '_' + that.pageableSorting.attribute] = that.last().get(that.pageableSorting.attribute);
				if (that.pageableSorting.isDate) {
					collection.queryParams['date_flag'] = that.pageableSorting.direction > 0 ? 'greater' : 'less';
				}
			}

			var promise = $.Deferred();
			collection.fetch().then(function() {
				if (collection.length === 0 || collection.length < remoteRecordsToFetch) {
					that.state.noMoreRemote = true;
				}
				if (collection.length > 0) {
					collection.destroy();
					that.fetch().then(promise.resolve);
				} else {
					collection.destroy();
					promise.resolve();
				}
			}, function(xhr) {
				collection.destroy();
				WMAPP.xhrPromiseErrorHandler(xhr, this);
				promise.reject();
			});
			return promise;
		},
	});

	WMAPP.Extension.Model.PageableCollection.prototype.save = function (options) {
		if (!options || !options.suppressSpinner) {
			WMAPP.Helper.showSpinner();
			if (WMAPP.isApp && (!options || !options.suppressStatus) && typeof this.displayName != "undefined") {
				WMAPP.Helper.showStatus('Saving ' + WMAPP.Helper.pluralize(this.displayName));
			}
		}
		var promise = Backbone.sync("update", this, options);
		promise.then(function () {
			if (!options || !options.suppressSpinner) {
				WMAPP.Helper.hideSpinner();
				WMAPP.Helper.hideStatus();
			}
			if (options && typeof options.success == "function") {
				options.success();
			}
		}, function (xhr) {
			if (!options || !options.suppressSpinner) {
				WMAPP.Helper.hideSpinner();
				WMAPP.Helper.hideStatus();
			}
			if (options && typeof options.error == "function") {
				options.error();
			}
			WMAPP.xhrPromiseErrorHandler(xhr, this);
		});
		return promise;
	};

	Model.Tab = WMAPP.Extension.Model.AbstractModel.extend({
		defaults: {
			id: null,
			name: null,
			slug: null,
			active: false,
			adminOnly: false,
			'default': false
		},
		validation: {
			slug: {
				required: true,
			},
		},
	});

	Model.TabCollection = WMAPP.Extension.Model.Collection.extend({
		model: Model.Tab,
	});
	
	Model.afterSyncDebounced = function(modelName) {
		console.error('afterSync', this.storeName);
		if (!this.remote && !this.isDestroyed) {
			this.fetch({
				suppressSpinner: true,
				suppressStatus: true,
			});
		}
	},
	
	Model.afterSync = _.debounce(Model.afterSyncDebounced, 50);
});

/** Custom validators**/
_.extend(Backbone.Model.prototype, Backbone.Validation.mixin);
_.extend(Backbone.Validation.callbacks, {
	invalid: function (view, attr, error, selector) {
		console.log('view', view);
		console.log('attr', attr);
		console.log('error', error);
		console.log('selector', selector);			
		if (typeof view != "undefined" && view.suppressValidationErrors) {
			return;
		}
		
		var formattedAttr = WMAPP.Helper.lowerCaseFirst(WMAPP.Helper.camelCase(attr));
	
		console.log('formattedAttr', formattedAttr);
		if (error == true)
			return;

		if (view != undefined && view.regionManager !== undefined) {
			console.log('formattedAttr2', formattedAttr);
			// remove any existing error classes
			view.$el.find('.error').remove('small.error');
			view.$el.find('.error').removeClass('error');
			// Wait 100ms for the DOM to update
			setTimeout(function() {
				var found = false;
				$.each(view.regionManager._regions, function (regionName, region) {

					console.log('regionName', regionName);
					found = true;
					var $el;
					var $content;
					var $tab;

					var viewId = view.options.layoutId + WMAPP.Helper.upperCaseFirst(formattedAttr);
					console.log('viewId', viewId);
					$el = view.$('[id=' + viewId + ']:visible');
					if ($el.length == 0) {
						$el = view.$('[id=' + view.options.layoutId + WMAPP.Helper.upperCaseFirst(formattedAttr) + ']');
						if ($el.length == 0) {
							$el = view.$('[id^=' + view.options.layoutId + WMAPP.Helper.upperCaseFirst(formattedAttr) + ']:visible');
						} else {
							// check if this field is on a tab
							if ($el.parents('div.tabs-content')) {
								$content = $el.parents('div.content');
								if ($content) {
									$tab = $('a[href="#' + $content.attr('id') + '"]');
									if ($tab) {
										$tab.addClass('error');
									}
								}
							}
						}
					}

					// add some classes
					if ($el.length) {
						if (WMAPP.errorOffset == null || (WMAPP.errorOffset && $el.offset().top < WMAPP.errorOffset.offset().top))
							WMAPP.errorOffset = $el;

						// if the field is wrapped in a label
						if ($el.parent('label').length == 1) {
							$el.addClass('error');
							if ($el.parent('label').hasClass("error")) {
								$el.parent('label').removeClass("error");
								$el.siblings('small').remove();
							}
							$el.parent('label').addClass("error").append('<small class="error" data-attribute="' + attr + '">' + error + '</small>');
							// if the field is wrapped in a div
						} else if ($el.parent('div:not(.columns)').length == 1) {
							if ($el.parent('div').hasClass("error")) {
								$el.parent('div').removeClass("error");
								$el.siblings('small').remove();
							}
							$el.parent('div').addClass("error").append('<small class="error" data-attribute="' + attr + '">' + error + '</small>');
							// if the field is wrapped in a span (autocomplete)
						} else if ($el.parent('span').prev('label').length == 1) {
							if ($el.parent('span').prev('label').hasClass("error")) {
								$el.parent('span').prev('label').removeClass("error");
								$el.siblings('small').remove();
							}
							$el.parent('span').prev('label').addClass("error");
							$el.parent('span').append('<small class="error" data-attribute="' + attr + '">' + error + '</small>');
							// if the fields previous sibling is the label
						} else if ($el.prev('label').length == 1) {
							if ($el.prev('label').hasClass("error")) {
								$el.parent('label').removeClass("error");
								$el.next('small').remove();
							}
							$el.append('<small class="error" data-attribute="' + attr + '">' + error + '</small>').prev('label').addClass("error");
							// if the fields previous sibling is a div
						} else if ($el.prev('div').length == 1) {
							if ($el.prev('div').hasClass("error")) {
								$el.parent('div').removeClass("error");
								$el.next('small').remove();
							}
							$el.append('<small class="error" data-attribute="' + attr + '">' + error + '</small>').prev('div').addClass("error");
							// find the label
						} else if ($el.closest("div.row").prev('label').parent('div')) {
							if ($el.closest("div.row").prev('label').parent('div').hasClass("error")) {
								$el.closest("div.row").prev('label').parent('div').removeClass("error");
								$el.closest("div.row").prev('label').siblings('small').remove();
							}							
							$el.closest("div.row").prev('label').parent('div').append('<small class="error" data-attribute="' + attr + '">' + error + '</small>').addClass("error");
						} else {
							console.error('Could not find an element with ID ' + viewId + ' when trying to validate.');
						}
					} else {
						console.error('Could not find an element with ID ' + viewId + ' when trying to validate.');
					}
				});

				if (!found) {
					var $el = view.$el;
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
					}
				}
			}, 100);
		} else if (view != undefined) {
			var $el = view.$el;
			if (WMAPP.errorOffset == null || (WMAPP.errorOffset && $el.offset().top < WMAPP.errorOffset.offset().top))
				WMAPP.errorOffset = $el;

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
			}
		} else {
			WMAPP.Helper.showMessage('error', error);
		}
	}
});

_.extend(Backbone.Validation.configure, {
	labelFormatter: 'label'
});

Backbone.Validation.patterns.digits = /^-?\d+$/;
_.extend(Backbone.Validation.validators, {
	collection: function (value, attr, customValue, model) {
		var ok = true;
		if (value && value.models) {
			$.each(value.models, function (i, model) {
				model.validate();
				if (!model.isValid()) {
					ok = false;
				}
			});
		}
		if (!ok) {
			return 'Please check your model';
		}
	},
	collectionSize: function (value, attr, customValue, model) {
		if (value && value.models && value.models.length == 0) {
			return customValue;
		}
	},
	model: function (value, attr, customValue, model) {
		if (value && (!value.get('id') || (typeof value.get('id') != 'undefined' && (value.get('id') === null || parseInt(value.get('id')) !== NaN)))) {
			value.validate();
			if (!value.isValid()) {
				return customValue;
			}
		}
	},
	signature: function (value, attr, customValue, model) {
		if (!value || !_.isObject(value)) {
			return customValue;
		} else if (_.isObject(value) && (!value.json)) {
			return customValue;
		}
	},
	futureTime: function (value, attr, customValue, model) {
		var _t = moment(value, "DD-MM-YYYY");
		var _n = moment();
		if (customValue === true && !(_t.isValid() && _t.isAfter(_n))) {
			return 'Must be in the future';
		}
	},

	pastTime: function (value, attr, customValue, model) {
		var _t = moment(value, "DD-MM-YYYY");
		var _n = moment();
		if (customValue === true && !(_t.isValid() && _t.isBefore(_n))) {
			return 'Must be in the past';
		}
	},


	validateVideoUrl: function (value, attr, customValue, model) {

		if (value == null || value == "") {
			return 'Invalid URL entered';
		}

		// value must be valid video url (youtube.com, youtu.be, vimeo.com or mpora.com)
		var splitUrl = value.split("/");
		var foundValid = false;

		// for each string in split url
		var i = 0;
		for (i = 0; i < splitUrl.length; i++) {

			// if string matches valid url
			if (splitUrl[i] == "www.youtube.com" || splitUrl[i] == "youtube.com") {
				// e.g. https://www.youtube.com/watch?v=i6XKgvKZy10

				// get last part of url, split by the equals sign
				var urlEnd = splitUrl[i + 1].split("=");

				// first half must be "watch?v"
				if (urlEnd[0] != 'watch?v') {
					return 'Invalid URL entered';
				}

				foundValid = true;

			} else if (splitUrl == "vimeo.com") {
				// e.g. http://vimeo.com/2323231

				// vimeo just has a number at the end of the url
				var endUrl = splitUrl[i + 1];
				if (!IsNumeric(endUrl)) {
					return 'Invalid URL entered';
				}
				foundValid = true;

			} else if (splitUrl == "youtu.be") {
				//e.g. http://youtu.be/i6XKgvKZy10
				// youtu.be doesn't have anything special in its url.
				foundValid = true;

			} else if (splitUrl == "mpora.com") {
				// e.g. http://mpora.com/videos/AAdyi77atpj9/embed

				// word videos should appear next in url
				if (splitUrl[i + 1] == "videos") {

					// url must end with word embed
					var endUrl = splitUrl[i + 3];
					if (endUrl == "embed") {
						foundValid = true;
					}
				}
			}
		}
		if (!foundValid) {
			return 'Invalid URL entered!';
		}
	},
	acceptance: function (value, attr, customValue, model) {
		if (value != customValue) {
			if (customValue) {
				return 'This field must be true';
			} else {
				return 'This field must be false';
			}
		}
	},
	idNumericOrUuid: function(value, attr, customValue, model) {
		if (!WMAPP.Helper.isValidId(value)) {
			return 'This field must be numeric or a UUID';
		}
	},
	creditCard: function (value, attr, customValue, model) {
		var creditCard_re = /^\d{4}-?\d{4}-?\d{4}-?\d{4}$/;
		if (customValue === true && !(creditCard_re.test(value))) {
			return 'must be must be a valid credit card number';
		}
	},
	phoneNumber: function (value, attr, customValue, model) {
		var phoneNumber_re = /^\({0,1}((0|\+61)(2|4|3|7|8)){0,1}\){0,1}(\ |-){0,1}[0-9]{2}(\ |-){0,1}[0-9]{2}(\ |-){0,1}[0-9]{1}(\ |-){0,1}[0-9]{3}$/;
		//var phoneNumber_re = /^(?:\+?(61))? ?(?:\((?=.*\)))?(0?[2-57-8])\)? ?(\d\d(?:[- ](?=\d{3})|(?!\d\d[- ]?\d[- ]))\d\d[- ]?\d[- ]?\d{3})$/;
		//var phoneNumber_re = /^(?:(?:\+?1\s*(?:[.-]\s*)?)?(?:\(\s*([2-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9])\s*\)|([2-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9]))\s*(?:[.-]\s*)?)?([2-9]1[02-9]|[2-9][02-9]1|[2-9][02-9]{2})\s*(?:[.-]\s*)?([0-9]{4})(?:\s*(?:#|x\.?|ext\.?|extension)\s*(\d+))?$/;
		
		if (customValue === true && !(phoneNumber_re.test(value))) {
			return 'Must be a valid phone number';
		}
	},	
	digits: function (value, attr, options, model) {
		var integerDigitNumber = parseInt(options.integer);
		var fractionDigitNumber = parseInt(options.fraction);
		if (integerDigitNumber > -1 && fractionDigitNumber > -1 && (integerDigitNumber + fractionDigitNumber) > 0) {
			var regex_str = ['^'];
			if (integerDigitNumber > 0) {
				regex_str.push('\\d{0,' + integerDigitNumber + '}');
				regex_str.push('$');
			} else {
				regex_str.push('0?');
				regex_str.push('$');
			}
			regex_str = regex_str.join('');
			if (fractionDigitNumber > 0) {
				regex_str = [regex_str, '|', regex_str.slice(0, -1)];
				regex_str.push('\\.\\d{1,' + fractionDigitNumber + '}');
				regex_str.push('$');
				regex_str = regex_str.join('');
			}
			var digits_re = RegExp(regex_str);
			if (!digits_re.test(value)) {
				return [' must be a number with no more than ', integerDigitNumber, ' digits before the decimal point and ', fractionDigitNumber, ' after'].join('');
			}
		} else {
			return 'Invalid validation rule: digits' + JSON.stringify(options);
		}
	},
	email: function (value, attr, customValue, model) {
		var email_re = Backbone.Validation.patterns.email;
		if (customValue === true && !(email_re.test(value))) {
			return Backbone.Validation.messages.email.replace('{0}', '');
		}
	},
	url: function (value, attr, customValue, model) {
		var url_re = Backbone.Validation.patterns.url;
		if (customValue === true && !(url_re.test(value))) {
			return Backbone.Validation.messages.url.replace('{0}', '');
		}
	},
	notNull: function (value, attr, customValue, model) {
		if (value === null) {
			return Backbone.Validation.messages.required.replace('{0}', '');
		}
	},
	validateGoogleStreet: function (value, attr, customValue, model) {
		if (model.get('google_street') === false) {
			return 'Please enter a valid street address';
		}
	},
	internalAttribute: function (value, attr, customValue, model) {
		if (!value || typeof value.get(customValue) === undefined || value.get(customValue) === null || value.get(customValue) === '') {
			return WMAPP.Helper.upperCaseFirst(customValue) + ' is required';
		}
	},
	rangeLength: function (value, attr, range, model) {
		var value = String(value);
		if (value.length < range[0] || value.length > range[1]) {
          return this.format('{0} must be between {1} and {2} characters', this.formatLabel(attr, model), range[0], range[1]);
		}
	},
	greaterThanZero: function(value, attr, customValue, model) {
		if(value <= 0) {
			return 'Must be greater than 0';
		}
	},
	passwords: function (value, attr, range, model) {
		if (value !== model.get('confirm_password')) {
			return 'Please ensure your Password and Confirm Passwords match';
		}
	},
});
