'use strict';

WMAPP.module('Extension.View', function (View) {

	/**
	 * ------------------------------------------------------------------------------------------------------------------------------------
	 * GENERIC VIEWS
	 * ------------------------------------------------------------------------------------------------------------------------------------
	 */
	var loadingViewTemplate = '<div class="wmapp-loading-spinner text-center"><img class="wmapp-loading-spinner-image" src="/img/spinner.gif"></div>';

	/**
	 * Loading view
	 */
	View.LoadingView = Backbone.Marionette.ItemView.extend({
		template: _.template(loadingViewTemplate)
	});
	/**
	 * Extend the Layout View
	 */
	View.LayoutView = Backbone.Marionette.LayoutView.extend({

		onDestroy: function() {
			if (this.options.collection) {
				var that = this;
				var otherListeners = [];
				_.each(this.options.collection._events, function(listeners, event) {
					_.each(listeners, function(listener) {
						if (listener.ctx != that && listener.ctx != that.options.collection && otherListeners.indexOf(listener.ctx) < 0) {
							otherListeners.push(listener.ctx);
						}
					});
				});
				this.options.collection.each(function(model) {
					_.each(model._events, function(listeners, event) {
						_.each(listeners, function(listener) {
							if (listener.ctx != that && listener.ctx != model && listener.ctx != that.options.collection && otherListeners.indexOf(listener.ctx) < 0) {
								otherListeners.push(listener.ctx);
							}
						});
					});
				});
				if (!otherListeners.length && this.options.collection instanceof WMAPP.Extension.Model.Collection) {
					this.options.collection.destroy();
				}
			}
		},

		collectionEvents: {
			'no-op': function() {
				// Include this so there is an event bound between the collection and this view.
				// (Prevents collection from being destroyed)
			},
		},

		modelEvents: {
			'no-op': function() {
				// Include this so there is an event bound between the collection and this view.
				// (Prevents collection from being destroyed)
			},
		},

		initialize: function () {
			if (this.model) {
				Backbone.Validation.bind(this);
			}

			_.bindAll(this, 'beforeRender', 'render', 'afterRender', 'triggerDelayed');
			var _this = this;
			this.render = _.wrap(this.render, function (render) {
				_this.beforeRender();
				render();
				_this.afterRender();
				return _this;
			});
		},

		beforeRender: function () {},

		afterRender: function () {
			if (this.options.model) {
				this.$el.attr({
					'data-model-cid': this.options.model.cid,
					'data-model-id': this.options.model.get(this.options.model.primaryKey),
					'data-model-value': this.options.model.get(this.options.model.displayAttribute),
					'data-model-entity': this.options.model.entityName,
					'data-model-plugin': this.options.model.featureName,
				});
			}
			if (this.options.uuid) {
				this.$el.attr('data-uuid', this.options.uuid);
			}
		},

		// this function is required for Chrome to display spinning
		// icon on a button properly
		triggerDelayed: function (name) {
			var that = this;
			var args = arguments;
			_.delay(function () {
				Backbone.View.prototype.trigger.apply(that, args);
			}, 200);
		},

		// to be called after all of the regions have been shown
		afterAllShown: function () {
			$.each(this.regionManager._regions, function (regionName, region) {
				if (region.currentView && typeof region.currentView.afterShow == 'function') {
					region.currentView.afterShow();
				}
			});

			$(document).foundation('reflow');
		},
	});

	/*
	 * Extend the marionette region
	 */
	View.Region = Backbone.Marionette.Region.extend({
		onBeforeShow: function() {
			$(".wmapp-mobile-content").scrollTop(0);
		},
		onShow: function () {
			$(document).foundation('reflow');
		},
		show: function() {
			if (this.currentView) {
				this.currentView.destroy();
			}
			Backbone.Marionette.Region.prototype.show.apply(this, arguments);
		},
	});

	/**
	 * Custom pagination page handler which triggers events rather than
	 * manipulate collection directly after being clicked.
	 * Very useful if you want add page number to url then let router to
	 * trigger the action
	 */
	View.NoActionPageHandle = Backgrid.Extension.PageHandle.extend({
		changePage: function (e) {
			e.preventDefault();
			var $el = this.$el,
				col = this.collection;
			if (!$el.hasClass("active") && !$el.hasClass("disabled")) {
				if (this.isRewind) {
					this.trigger('wmapp:pagination:go', 1);
				} else if (this.isBack) {
					this.trigger('wmapp:pagination:go', col.state.currentPage - 1);
				} else if (this.isForward) {
					this.trigger('wmapp:pagination:go', col.state.currentPage + 1);
				} else if (this.isFastForward) {
					this.trigger('wmapp:pagination:go', col.state.totalPages);
				} else {
					this.trigger('wmapp:pagination:go', this.pageIndex);
				}
			}
			return this;
		}
	});

	/**
	 * Extend the Pagination View
	 */
	View.PaginationView = Backgrid.Extension.Paginator.extend({
		windowSize: 10,
		slideScale: 0.5,
		className: "pagination-centered",
		template: function(that) {
			var tmplStr = '';
			if (!that.collection || !that.collection.state) {
				return tmplStr;
			}
			if (WMAPP.isApp) {
				if (that.collection.state.currentPage == that.collection.state.totalPages && that.collection.remoteAfterLocal && !that.collection.state.noMoreRemote) {
					tmplStr += '<div class="pagination-load-more"><a href="#" class="wmapp-button button small">Load more data from server</a></div>';
				}
			}
			if (that.collection.state.totalPages === 1 || that.collection.state.totalPages === null) {
				return tmplStr;
			}
			var indices = 0;
			tmplStr +=	'<ul class="pagination">' +
							'<li class="' + (that.collection.state.currentPage == that.collection.state.firstPage ? 'disabled unavailable' : '') + '"><a href="#" title="First" class="handle" data-page="' + that.collection.state.firstPage + '"><span class="fa fa-angle-double-left"></span></a></li>' +
							'<li class="' + (that.collection.state.currentPage == that.collection.state.firstPage ? 'disabled unavailable' : '') + '"><a href="#" title="Previous" class="handle" data-page="' + (that.collection.state.currentPage - 1) + '"><span class="fa fa-angle-left"></span></a></li>';
			_.each(that.handles, function(handle, i) {
				if (!handle.isBack && !handle.isRewind && !handle.isForward && !handle.isFastForward) {
					if (indices++ < 5) {
						tmplStr += 	'<li class="' + (that.collection.state.currentPage == handle.pageIndex ? 'active current' : '') + '"><a href="#" class="handle page-index" title="Page ' + handle.pageIndex + '" data-page="'+handle.pageIndex+'">' + handle.pageIndex + '</a></li>';
					}
				}
			});
			tmplStr += 		'<li class="' + (that.collection.state.currentPage == that.collection.state.lastPage ? 'disabled unavailable' : '') + '"><a href="#" title="Next" class="handle" data-page="' + (that.collection.state.currentPage + 1) + '"><span class="fa fa-angle-right"></span></a></li>' +
							'<li class="' + (that.collection.state.currentPage == that.collection.state.lastPage ? 'disabled unavailable' : '') + '"><a href="#" title="Last" class="handle" data-page="' + that.collection.state.lastPage + '"><span class="fa fa-angle-double-right"></span></a></li>' +
						'</ul>';
			return tmplStr;
		},
		events: {
			'click a.handle': 'pageHandleClicked',
			'click .pagination-load-more a': 'loadMoreClicked'
		},
		pageHandleClicked: function(e) {
			e.preventDefault();
			e.stopPropagation();
			var target = $(e.currentTarget);
			if (!target.parent().hasClass('current') && !target.parent().hasClass('unavailable')) {
				this.collection.getPage(parseInt(target.attr('data-page')), {reset: true});
				this.render();
			}
		},
		loadMoreClicked: function(e) {
			e.preventDefault();
			e.stopPropagation();
			var that = this;
			this.collection.loadMore().then(function() {
				//that.render.call(that);
			});
		},
		render: function () {
			if (this.handles) {
				_.each(this.handles, function(handle) {
					handle.remove();
				});
			}

			this.handles = this.makeHandles();
			this.$el.empty();
			this.$el.html(this.template(this));

			if (WMAPP.isApp) {
				$(".wmapp-mobile-content").scrollTop(0);
			}

			return this;
		},
		initialize: function() {
			if (this.collection) {
				this.listenTo(this.collection, 'sync reset', this.render);
			}
			return Backgrid.Extension.Paginator.prototype.initialize.apply(this, arguments);
		},
	});

	/**
	 * Custom pagination pagination view using NoActionPageHandle
	 * Very useful if you want add page number to url then let router to
	 * trigger the action
	 */
	View.NoActionPaginationView = View.PaginationView.extend({
		pageHandle: WMAPP.Extension.View.NoActionPageHandle,
		render: function () {
			Backgrid.Extension.Paginator.prototype.render.apply(this, arguments);
			if (this.handles.length > 5) {
				this.$el.show();
				this.$el.find('ul').removeClass('pagination').addClass('pagination');
				this.$el.find('ul li.active').removeClass('current').addClass('current');
				this.$el.find('ul li.disabled').removeClass('unavailable').addClass('unavailable');
				for (var i = 0; i < this.handles.length; i++) {
					this.listenTo(this.handles[i], 'wmapp:pagination:go', function (action) {
						this.trigger('wmapp:pagination:go', action);
					});
				}
			} else {
				this.$el.hide();
			}
			return this;
		}
	});

	/**
	 * Extend the Item ViewG
	 */
	View.ItemView = Backbone.Marionette.ItemView.extend({
		// listenTo: function(other, event, callback) {
		// 	if (!other.listenedToBy) {
		// 		other.listenedToBy = [];
		// 	}
		// 	if (other.listenedToBy.indexOf(this) < 0) {
		// 		other.listenedToBy.push(this);
		// 	}
		// 	return Backbone.Marionette.ItemView.prototype.listenTo.apply(this, arguments);
		// },
		// stopListening: function() {
		// 	return Backbone.Marionette.ItemView.prototype.stopListening.apply(this, arguments);
		// },
		// onDestroy: function() {
		// 	if (this.listenedToBy && this.listenedToBy.length) {
		// 		var listenedToBy = this.listenedToBy.pop();
		// 		while (listenedToBy) {
		// 			listenedToBy.stopListening(this);
		// 			listenedToBy = this.listenedToBy.pop();
		// 		}
		// 	}
		// },

		initialize: function (options) {
			_.bindAll(this, 'beforeRender', 'render', 'afterRender', 'triggerDelayed');
			var _this = this;
			this.render = _.wrap(this.render, function (render) {
				_this.beforeRender();
				render();
				_this.afterRender();
				return _this;
			});
		},

		modelEvents: {
			'change:id': 'render'
		},

		getTemplate: function () {
			if (this.model && this.options && this.options.showLoadingView) {
				if (this.model.get('id')) {
					return this.template;
				} else {
					return _.template(loadingViewTemplate);
				}
			} else {
				return this.template;
			}
		},

		beforeRender: function () {},

		afterRender: function () {
			if (this.options.model) {
				this.$el.attr({
					'data-model-cid': this.options.model.cid,
					'data-model-id': this.options.model.get(this.options.model.primaryKey),
					'data-model-value': this.options.model.get(this.options.model.displayAttribute),
					'data-model-entity': this.options.model.entityName,
					'data-model-plugin': this.options.model.featureName,
				});
			}
			if (this.options.uuid) {
				this.$el.attr('data-uuid', this.options.uuid);
			}
		},

		// this function is required for Chrome to display spinning
		// icon on a button properly
		triggerDelayed: function (name) {
			var that = this;
			var args = arguments;
			_.delay(function () {
				Backbone.View.prototype.trigger.apply(that, args);
			}, 200);
		}
	});

	/**
	 * Extend the Collection View
	 */
	View.CollectionView = Backbone.Marionette.CollectionView.extend({
		// listenTo: function(other, event, callback) {
		// 	if (!other.listenedToBy) {
		// 		other.listenedToBy = [];
		// 	}
		// 	if (other.listenedToBy.indexOf(this) < 0) {
		// 		other.listenedToBy.push(this);
		// 	}
		// 	return Backbone.Marionette.CollectionView.prototype.listenTo.apply(this, arguments);
		// },
		// stopListening: function() {
		// 	return Backbone.Marionette.CollectionView.prototype.stopListening.apply(this, arguments);
		// },
		// onDestroy: function() {
		// 	if (this.listenedToBy && this.listenedToBy.length) {
		// 		var listenedToBy = this.listenedToBy.pop();
		// 		while (listenedToBy) {
		// 			listenedToBy.stopListening(this);
		// 			listenedToBy = this.listenedToBy.pop();
		// 		}
		// 	}
		// },

		onDestroy: function() {
			if (this.options.collection) {
				var that = this;
				var otherListeners = [];
				_.each(this.options.collection._events, function(listeners, event) {
					_.each(listeners, function(listener) {
						if (listener.ctx != that && listener.ctx != that.options.collection && otherListeners.indexOf(listener.ctx) < 0) {
							otherListeners.push(listener.ctx);
						}
					});
				});
				this.options.collection.each(function(model) {
					_.each(model._events, function(listeners, event) {
						_.each(listeners, function(listener) {
							if (listener.ctx != that && listener.ctx != model && listener.ctx != that.options.collection && otherListeners.indexOf(listener.ctx) < 0) {
								otherListeners.push(listener.ctx);
							}
						});
					});
				});
				if (!otherListeners.length && this.options.collection instanceof WMAPP.Extension.Model.Collection) {
					this.options.collection.destroy();
				}
			}
		},

		getEmptyView: function () {
			if (this.options && this.options.showLoadingView && this.collection.isLoading) {
				return View.LoadingView;
			}
		},
		// this function is required for Chrome to display spinning
		// icon on a button properly
		triggerDelayed: function (name) {
			var that = this;
			var args = arguments;
			_.delay(function () {
				Backbone.View.prototype.trigger.apply(that, args);
			}, 200);
		},

		// responsive tables refresh
		updateTables: function () {
			updateResponsiveTables();
		},

		// update responsive tables on every sync
		collectionEvents: {
			'sync': 'updateTables',
			'reset': 'render',
			'no-op': function() {
				// Include this so there is an event bound between the collection and this view.
				// (Prevents collection from being destroyed)
			},
		},

		render: function() {
			// clear the container
			this.$el.html('');
			Backbone.Marionette.CollectionView.prototype.render.call(this);
		}
	});

	/**
	 * Extend the Composite View
	 */
	View.CompositeView = Backbone.Marionette.CompositeView.extend({
		// listenTo: function(other, event, callback) {
		// 	if (!other.listenedToBy) {
		// 		other.listenedToBy = [];
		// 	}
		// 	if (other.listenedToBy.indexOf(this) < 0) {
		// 		other.listenedToBy.push(this);
		// 	}
		// 	return Backbone.Marionette.CompositeView.prototype.listenTo.apply(this, arguments);
		// },
		// stopListening: function() {
		// 	return Backbone.Marionette.CompositeView.prototype.stopListening.apply(this, arguments);
		// },
		// onDestroy: function() {
		// 	if (this.listenedToBy && this.listenedToBy.length) {
		// 		var listenedToBy = this.listenedToBy.pop();
		// 		while (listenedToBy) {
		// 			listenedToBy.stopListening(this);
		// 			listenedToBy = this.listenedToBy.pop();
		// 		}
		// 	}
		// },
		buildChildView: function(child, ChildViewClass, childViewOptions) {
			if (typeof ChildViewClass == 'string') {
				ChildViewClass = eval(ChildViewClass);
			}
			return Backbone.Marionette.CompositeView.prototype.buildChildView.call(this, child, ChildViewClass, childViewOptions);
		},
		onDestroy: function() {
			if (this.options.collection) {
				var that = this;
				var otherListeners = [];
				_.each(this.options.collection._events, function(listeners, event) {
					_.each(listeners, function(listener) {
						if (listener.ctx != that && listener.ctx != that.options.collection && otherListeners.indexOf(listener.ctx) < 0) {
							otherListeners.push(listener.ctx);
						}
					});
				});
				this.options.collection.each(function(model) {
					_.each(model._events, function(listeners, event) {
						_.each(listeners, function(listener) {
							if (listener.ctx != that && listener.ctx != model && listener.ctx != that.options.collection && otherListeners.indexOf(listener.ctx) < 0) {
								otherListeners.push(listener.ctx);
							}
						});
					});
				});
				if (!otherListeners.length && this.options.collection instanceof WMAPP.Extension.Model.Collection) {
					this.options.collection.destroy();
				}
			}
		},

		// this function is required for Chrome to display spinning
		// icon on a button properly
		triggerDelayed: function (name) {
			var that = this;
			var args = arguments;
			_.delay(function () {
				Backbone.View.prototype.trigger.apply(that, args);
			}, 200);
		},

		getTemplate: function () {
			if (this.collection && this.collection.isLoading && this.options && this.options.showLoadingView) {
				return _.template(loadingViewTemplate);
			} else {
				return this.template;
			}
		},

		// responsive tables refresh
		updateTables: function () {
			updateResponsiveTables();
		},

		// update responsive tables on every sync
		collectionEvents: {
			'sync': 'updateTables',
			'reset': 'render',
			'no-op': function() {
				// Include this so there is an event bound between the collection and this view.
				// (Prevents collection from being destroyed)
			},
		},

		modelEvents: {
			'no-op': function() {
				// Include this so there is an event bound between the collection and this view.
				// (Prevents collection from being destroyed)
			},
		},

		render: function() {
			// clear the container
			this.$el.html('');
			Backbone.Marionette.CompositeView.prototype.render.call(this);

			if (this.options.model) {
				this.$el.attr({
					'data-model-cid': this.options.model.cid,
					'data-model-id': this.options.model.get(this.options.model.primaryKey),
					'data-model-value': this.options.model.get(this.options.model.displayAttribute),
					'data-model-entity': this.options.model.entityName,
					'data-model-plugin': this.options.model.featureName,
				});
			}
		}
	});

	View.HtmlView = WMAPP.Extension.View.ItemView.extend({
		initialize: function() {
			if (this.model) {
				this.listenTo(this.model, 'sync', function() {
					if (this.options.updateHtml && typeof this.options.updateHtml == "function") {
						this.options.updateHtml();
					}

					// re-render
					this.render();
				},this);
			}

			WMAPP.Extension.View.ItemView.prototype.initialize.call(this);
		},
		updateHtml: function() {

		},
		template: function(data) {
			var options = data.options;
			var tmplStr = '';
			if (options.backButton) {
				tmplStr += '<div class="clearfix">' +
					'<button class="wmapp-button wmapp-button-back wmapp-back-button right">Back</button>' +
					'</div>';
			}
			tmplStr += options.html;
			return tmplStr;
		},
		templateHelpers: function () {
			return {
				model: this.model,
				options: this.options
			};
		},
		events: {
			"click .wmapp-back-button": "onBack"
		},
		onBack: function (e) {
			console.log('Back button (html) pressed');
			e.preventDefault();
			e.stopPropagation();
			this.trigger('trigger:backButton');
		},
	});

	View.AbstractContentArea = WMAPP.Extension.View.ItemView.extend({
		template: function (data) {
			return data.html;
		},
		initialize: function () {
			this.on('show', this._renderContentArea, this);
			this.on('before:destroy', this._destroyContentArea, this);
		},
		modelEvents: {
			'change:html': 'render'
		},
		_renderContentArea: function () {
			WMAPP.renderContentArea(this.$el[0]);

			// Google Authorship tags
			if (this.model.get('_author_id')) {
				$('link[rel="author"]').remove();
				$('head').append('<link rel="author" href="' + this.model.get('_author_id').get('member_name') + '"/>');
			}

			// Google+
			if (this.model.get('meta_title')) {
				$('meta[itemprop="name"]').remove();
				$('head').append('<meta itemprop="name" content="' + this.model.get('meta_title') + '" />');
			}
			if (this.model.get('meta_description')) {
				$('meta[itemprop="description"]').remove();
				$('head').append('<meta itemprop="description" content="' + this.model.get('meta_description') + '" />');
			}
			if (this.model.get('_social_media_image') && this.model.get('_social_media_image').get('id')) {
				$('meta[itemprop="image"]').remove();
				$('head').append('<meta itemprop="image" content="' + WMAPP.settings.site_url + 'site/img/' + this.model.get('_social_media_image').get('file') + '" />');
			}

			// Twitter
			if (this.model.get('meta_title')) {
				$('meta[name="twitter:title"]').remove();
				$('head').append('<meta name="twitter:title" content="' + this.model.get('meta_title') + '" />');
			}
			if (this.model.get('meta_description')) {
				$('meta[name="twitter:description"]').remove();
				$('head').append('<meta name="twitter:description" content="' + this.model.get('meta_description') + '" />');
			}
			if (this.model.get('_social_media_image') && this.model.get('_social_media_image').get('id')) {
				$('meta[name="twitter:image:src"]').remove();
				$('head').append('<meta name="twitter:image:src" content="' + WMAPP.settings.site_url + 'site/img/' + this.model.get('_social_media_image').get('file') + '" />');
			}

			// Open Graph
			$('meta[property="og:url"]').remove();
			$('head').append('<meta property="og:url" content="' + WMAPP.settings.site_url + '" />');
			$('meta[property="article:published_time"]').remove();
			$('head').append('<meta property="article:published_time" content="' + this.model.get('published_date') + '" />');
			$('meta[property="article:modified_time"]').remove();
			$('head').append('<meta property="article:modified_time" content="' + this.model.get('modified') + '" />');
			if (this.model.get('meta_title')) {
				$('meta[property="og:type"]').remove();
				$('head').append('<meta property="og:type" content="' + this.model.get('meta_title') + '" />');
			}
			if (this.model.get('meta_description')) {
				$('meta[property="og:description"]').remove();
				$('head').append('<meta property="og:description" content="' + this.model.get('meta_description') + '" />');
			}
			if (this.model.get('_social_media_image') && this.model.get('_social_media_image').get('id')) {
				$('meta[property="og:image"]').remove();
				$('head').append('<meta property="og:image" content="' + WMAPP.settings.site_url + 'site/img/' + this.model.get('_social_media_image').get('file') + '" />');
			}
			//<meta property="article:section" content="<?=$this->Session->read('meta.article.section');?>" />
			//<meta property="article:tag" content="<?=$this->Session->read('meta.article.section');?>" />
		},
		_destroyContentArea: function () {
			WMAPP.destroyContentArea(this.$el[0]);

			// remove the meta tags
			$('link[rel="author"]').remove();
			$('meta[itemprop="name"]').remove();
			$('meta[itemprop="description"]').remove();
			$('meta[itemprop="image"]').remove();
			$('meta[name="twitter:title"]').remove();
			$('meta[name="twitter:description"]').remove();
			$('meta[name="twitter:image:src"]').remove();
			$('meta[property="og:url"]').remove();
			$('meta[property="article:published_time"]').remove();
			$('meta[property="article:modified_time"]').remove();
			$('meta[property="og:type"]').remove();
			$('meta[property="og:description"]').remove();
			$('meta[property="og:image"]').remove();
		}
	});

    View.DocumentAbstractContentArea = WMAPP.Extension.View.AbstractContentArea.extend({
		template : function(data) {
			return data.html;
		},
		initialize : function() {
			this.on('show', this._renderContentArea, this);
			this.on('before:destroy', this._destroyContentArea, this);
		},
		_renderContentArea : function() {
			WMAPP.renderContentArea(this.$el[0]);
		},
		_destroyContentArea: function(){
			WMAPP.destroyContentArea(this.$el[0]);
		}
	});

	/**
	 * AutoCompleteView and ItemView base objects
	 */
	View.AutoCompleteItemViewBase = Backbone.View.extend({
		tagName: "li",
		template: null,

		events: {
			"click": "select"
		},

		initialize: function (options) {
			this.options = options;
		},

		select: function () {
			this.options.parent.hide().select(this.model);
			return false;
		}

	});

	// the AutoCompleteViewBase
	View.AutoCompleteViewBase = Backbone.View.extend({
		tagName: "ul",
		className: "wmapp-autocomplete",
		wait: 300,
		selectModel: null,

		queryParameter: "query",
		minKeywordLength: 2,
		currentText: "",
		itemView: View.AutoCompleteItemView,

		initialize: function (options) {
			_.extend(this, options);
			this.filter = _.debounce(this.filter, this.wait);
			this.queryParameter = options.queryParameter;
		},

		onShow: function () {
			// disable the native auto complete functionality
			$(this.input).attr("autocomplete", "off");

			this.$el.width($(this.input).outerWidth());

			$(this.input)
				.focus(_.bind(this.keyup, this))
				.keyup(_.bind(this.keyup, this))
				.keydown(_.bind(this.keydown, this))
				.after(this.$el);
		},

		render: function () {
			return this;
		},

		keydown: function (event) {
			if (event.keyCode == 38) return this.move(-1);
			if (event.keyCode == 40) return this.move(+1);
			if (event.keyCode == 13) return this.onEnter();
			if (event.keyCode == 27) return this.hide();
		},

		keyup: function () {
			var keyword = $(this.input).val();
			if (this.isChanged(keyword)) {
				if (this.isValid(keyword)) {
					this.filter(keyword);
				} else {
					this.hide();
				}
			}
		},

		filter: function (keyword) {
			var keyword = keyword.toLowerCase();
			if (this.model.backendUrl) {

				var parameters = {};
				parameters[this.queryParameter] = keyword;

				this.model.fetch({
					success: function () {
						this.loadResult(this.model.models, keyword);
					}.bind(this),
					data: parameters
				});

			} else {
				this.loadResult(this.model.filter(function (model) {
					return model.label().toLowerCase().indexOf(keyword) !== -1
				}), keyword);
			}
		},

		isValid: function (keyword) {
			return keyword.length > this.minKeywordLength || this.minKeywordLength == 0;
		},

		isChanged: function (keyword) {
			return this.currentText != keyword || this.minKeywordLength == 0;
		},

		move: function (position) {
			var current = this.$el.children(".active"),
				siblings = this.$el.children(),
				index = current.index() + position;
			if (siblings.eq(index).length) {
				current.removeClass("active");
				siblings.eq(index).addClass("active");
			}
			return false;
		},

		onEnter: function () {
			this.$el.children(".active").click();
			return false;
		},

		loadResult: function (model, keyword) {
			this.currentText = keyword;
			this.show().reset();
			if (model.length) {
				$(this.input).attr('style', 'margin-bottom: 0rem;');
				_.forEach(model, this.addItem, this);
				this.show();
			} else {
				this.hide();
			}
		},

		addItem: function (model) {
			this.$el.append(new this.itemView({
				model: model,
				parent: this
			}).render().$el);
		},

		select: function (model) {
			var label = model.label();
			$(this.input).val(label);
			this.currentText = label;
			this.onSelect(model);
			$(this.input).attr('style', 'margin-bottom: 0.5rem;');
		},

		reset: function () {
			this.$el.empty();
			return this;
		},

		hide: function () {
			this.$el.hide();
			return this;
		},

		show: function () {
			this.$el.show();
			return this;
		},

		// callback definitions
		onSelect: function (model) {
			$('#' + this.fieldId + 'Upload').val('');
			var fieldName = this.selectField.charAt(0).toUpperCase() + WMAPP.Helper.camelCase(this.selectField).slice(1);
			var func = "this.selectModel.set" + fieldName + "FromSelect(model);";
			eval(func);
		}
	});

	/**
	 * Extend the Composite View
	 */
	View.SortableCompositeView = Backbone.Marionette.CompositeView.extend({
		_sortStop: function (event, ui) {
			var modelBeingSorted = this.collection.get(ui.item.attr("data-model-cid"));
			var modelViewContainerEl = this._getContainerEl();
			var newIndex = modelViewContainerEl.children().index(ui.item);

			if (newIndex == -1) {
				// the element was removed from this list. can happen if this sortable is connected
				// to another sortable, and the item was dropped into the other sortable.
				this.collection.remove(modelBeingSorted);
			}

			this._reorderCollectionBasedOnHTML();
			this.updateDependentControls();
			this.trigger("sortStop", modelBeingSorted, newIndex);
			if (this._isBackboneCourierAvailable())
				this.spawn("sortStop", {
					modelBeingSorted: modelBeingSorted,
					newIndex: newIndex
				});
		},

		_receive: function (event, ui) {
			var senderListEl = ui.sender;
			var senderCollectionListView = senderListEl.data("view");
			if (!senderCollectionListView || !senderCollectionListView.collection) return;

			// trigger an event in the list view so that we can do something with all of the item views first?
			this._getContainerEl().trigger('receive', ui);

			var newIndex = this._getContainerEl().children().index(ui.item);
			var modelReceived = senderCollectionListView.collection.get(ui.item.attr("data-model-cid"));

			// remove from the sender collection
			var senderCollection = senderCollectionListView.collection
			senderCollection.remove(modelReceived);

			if (senderCollectionListView.model) {
				var senderItems = senderCollectionListView.model.get(senderCollectionListView.options.name);
				senderItems = _.without(senderItems, modelReceived.get('id'));

				senderCollectionListView.model.set(senderCollectionListView.options.name, senderItems);
			}

			// check for length of receiver colleciton
			if (this.collection.length == 0) {
				//modelReceived.set('_default', 1);
			}

			// add to the receiver collection
			this.collection.add(modelReceived, {
				at: newIndex
			});
			modelReceived.collection = this.collection; // otherwise will not get properly set, since modelReceived.collection might already have a value.
			this.setSelectedModel(modelReceived);
		},

		_registerCollectionEvents: function () {
			this.listenTo(this.collection, "add", function (model) {
				if (this._hasBeenRendered) {
					var modelView = this._createNewModelView(model, this._getModelViewOptions(model));
					this._insertAndRenderModelView(modelView, this._getContainerEl(), this.collection.indexOf(model));
				}

				if (this._isBackboneCourierAvailable())
					this.spawn("add");
			});

			this.listenTo(this.collection, "remove", function (model) {
				if (this._hasBeenRendered)
					this._removeModelView(model);

				if (this._isBackboneCourierAvailable())
					this.spawn("remove");
			});

			this.listenTo(this.collection, "reset", function () {
				if (this._hasBeenRendered) this.render();
				if (this._isBackboneCourierAvailable())
					this.spawn("reset");
			});

			// we should not be listening to change events on the model as a default behavior. the models
			// should be responsible for re-rendering themselves if necessary, and if the collection does
			// also need to re-render as a result of a model change, this should be handled by overriding
			// this method. by default the collection view should not re-render in response to model changes
			// this.listenTo( this.collection, "change", function( model ) {
			// 	if( this._hasBeenRendered ) this.viewManager.findByModel( model ).render();
			// 	if( this._isBackboneCourierAvailable() )
			// 		this.spawn( "change", { model : model } );
			// } );

			this.listenTo(this.collection, "sort", function (collection, options) {
				if (this._hasBeenRendered && options.add !== true) this.render();
				if (this._isBackboneCourierAvailable())
					this.spawn("sort");
			});
		},

		updateDependentControls: function () {
			this.trigger("updateDependentControls", this.getSelectedModels());
			if (this._isBackboneCourierAvailable()) {
				this.spawn("updateDependentControls", {
					selectedModels: this.getSelectedModels()
				});
			}
		},

		getSelectedModel: function (options) {
			return _.first(this.getSelectedModels(options));
		},

		getSelectedModels: function (options) {
			var _this = this;

			options = _.extend({}, {
				by: "model"
			}, options);

			var referenceBy = options.by;
			var items = [];

			switch (referenceBy) {
			case "id":
				_.each(this.selectedItems, function (item) {
					items.push(_this.collection.get(item).id);
				});
				break;
			case "cid":
				items = items.concat(this.selectedItems);
				break;
			case "offset":
				var curLineNumber = 0;

				var itemElements = this._getVisibleItemEls();

				itemElements.each(function () {
					var thisItemEl = $(this);
					if (thisItemEl.is(".selected"))
						items.push(curLineNumber);
					curLineNumber++;
				});
				break;
			case "model":
				_.each(this.selectedItems, function (item) {
					items.push(_this.collection.get(item));
				});
				break;
			case "view":
				_.each(this.selectedItems, function (item) {
					items.push(_this.viewManager.findByModel(_this.collection.get(item)));
				});
				break;
			}

			return items;

		},

		setSelectedModels: function (newSelectedItems, options) {
			if (!_.isArray(newSelectedItems)) throw "Invalid parameter value";
			if (!this.selectable && newSelectedItems.length > 0) return; // used to throw error, but there are some circumstances in which a list can be selectable at times and not at others, don't want to have to worry about catching errors

			options = _.extend({}, {
				silent: false,
				by: kDefaultReferenceBy
			}, options);

			var referenceBy = options.by;
			var newSelectedCids = [];

			switch (referenceBy) {
			case "cid":
				newSelectedCids = newSelectedItems;
				break;
			case "id":
				this.collection.each(function (thisModel) {
					if (_.contains(newSelectedItems, thisModel.id)) newSelectedCids.push(thisModel.cid);
				});
				break;
			case "model":
				newSelectedCids = _.pluck(newSelectedItems, "cid");
				break;
			case "view":
				_.each(newSelectedItems, function (item) {
					newSelectedCids.push(item.model.cid);
				});
				break;
			case "offset":
				var curLineNumber = 0;
				var selectedItems = [];

				var itemElements = this._getVisibleItemEls();
				itemElements.each(function () {
					var thisItemEl = $(this);
					if (_.contains(newSelectedItems, curLineNumber))
						newSelectedCids.push(thisItemEl.attr("data-model-cid"));
					curLineNumber++;
				});
				break;
			}

			var oldSelectedModels = this.getSelectedModels();
			var oldSelectedCids = _.clone(this.selectedItems);

			this.selectedItems = this._convertStringsToInts(newSelectedCids);
			this._validateSelection();

			var newSelectedModels = this.getSelectedModels();

			if (!this._containSameElements(oldSelectedCids, this.selectedItems)) {
				this._addSelectedClassToSelectedItems(oldSelectedCids);

				if (!options.silent) {
					this.trigger("selectionChanged", newSelectedModels, oldSelectedModels);
					if (this._isBackboneCourierAvailable()) {
						this.spawn("selectionChanged", {
							selectedModels: newSelectedModels,
							oldSelectedModels: oldSelectedModels
						});
					}
				}

				this.updateDependentControls();
			}
		},

		setSelectedModel: function (newSelectedItem, options) {
			if (!newSelectedItem && newSelectedItem !== 0)
				this.setSelectedModels([], options);
			else
				this.setSelectedModels([newSelectedItem], options);
		},

		_getContainerEl: function () {
			// not all tables have a tbody, so we test
			var tbody = this.$el.find("> tbody");
			if (tbody.length > 0)
				return tbody;

			return this.$el;
		},

		_reorderCollectionBasedOnHTML: function () {
			var _this = this;

			this._getContainerEl().children().each(function () {
				var thisModelCid = $(this).attr("data-model-cid");

				if (thisModelCid) {
					// remove the current model and then add it back (at the end of the collection).
					// When we are done looping through all models, they will be in the correct order.
					var thisModel = _this.collection.get(thisModelCid);
					if (thisModel) {
						_this.collection.remove(thisModel, {
							silent: true
						});
						_this.collection.add(thisModel, {
							silent: true,
							sort: !_this.collection.comparator
						});
					}
				}
			});

			this.collection.trigger("reorder");

			if (this._isBackboneCourierAvailable()) this.spawn("reorder");

			if (this.collection.comparator) this.collection.sort();

		},

		_isBackboneCourierAvailable: function () {
			return !_.isUndefined(Backbone.Courier);
		},
	});

	/**
	 * Nested collection view - Item View
	 */
	View.NestedCollectionItemView = View.CompositeView.extend({
		tagName: 'li',
		template: function (data) {
			var model = data.model;
			var collection = data.collection;
			var options = data.options;
			var tmplStr = '<a href="#" class="wmapp-nested-view-item">';
			tmplStr += model.get(options.keyName) + '</a>';
			if (collection && collection.length > 0) {
				tmplStr += '<ul></ul>';
			}
			return tmplStr;
		},
		initialize: function (options) {
			this.collection = this.model.get(this.options.childrenKeyName);
			if (!this.collection || this.collection.length == 0) {
				this.childViewContainer = null;
			}
			if (this.options.childView !== undefined) {
				this.childView = this.options.childView;
			} else {
				this.childView = View.NestedCollectionItemView;
			}
		},
		events: {
			"click .wmapp-nested-view-item": "onClick",
		},
		childView: View.NestedCollectionItemView,
		childViewContainer: 'ul',
		childViewOptions: function () {
			return {
				childrenKeyName: this.options.childrenKeyName,
				keyName: this.options.keyName,
				channel: this.options.channel,
			}
		},
		templateHelpers: function () {
			return {
				model: this.model,
				collection: this.collection,
				options: this.options
			};
		},
		onClick: function (e) {
			e.preventDefault();
			e.stopPropagation();
			this.options.channel.vent.trigger('trigger:nestedCollectionItemViewClick', this.model);
		}
	});

	/**
	 * Nested collection view - Collection View
	 */
	View.NestedCollectionView = View.CollectionView.extend({
		tagName: 'ul',
		childView: View.NestedCollectionItemView,
		classname: 'wmapp-nested-collection',
		options: {
			childrenKeyName: '_childrens',
			keyName: 'name',
		},
		initialize: function (options) {
			this.options = _.extend(options, this.options);
		},
		childViewOptions: function () {
			return {
				childrenKeyName: this.options.childrenKeyName,
				keyName: this.options.keyName,
				channel: this.options.channel,
			}
		},
	});

	View.DocumentSubmissionLayout = WMAPP.Extension.View.LayoutView.extend({
		regions: {
			heading: '.wmapp-document-display-heading',
			slides: '.wmapp-document-display-slides',
			command: '.wmapp-document-display-commands',
		},
		initialize: function (options) {
			var tmplStr = '';
			if(options.displayHeading){
				tmplStr += '<div class="row">';
				tmplStr += '	<div class="large-12 small-12 columns">';
				tmplStr += '		<div class="wmapp-document-display-heading">';
				tmplStr += '		</div>';
				tmplStr += '	</div>';
				tmplStr += '</div>';
			}
			tmplStr += '<div class="row">';
			tmplStr += '	<div class="large-12 small-12 columns">';
			tmplStr += '		<div class="wmapp-document-display-slides">';
			tmplStr += '		</div>';
			tmplStr += '	</div>';
			tmplStr += '</div>';
			tmplStr += '<div class="row">';
			tmplStr += '	<div class="large-12 small-12 columns">';
			tmplStr += '		<div class="wmapp-document-display-commands text-center">';
			tmplStr += '		</div>';
			tmplStr += '	</div>';
			tmplStr += '</div>';

			this.template = _.template(tmplStr);
		},
		templateHelpers: function () {
			return {
				displayHeading: this.options.displayHeading,
			}
		}
	});

	/* view for the commands area above the list */
	View.DocumentSubmissionCommand = WMAPP.Extension.View.ItemView.extend({
		template: function (data) {

			var cancelButtonText 	= 'Close';
			var previousButtonText 	= '<< Back';
			var nextButtonText 		= 'Next >>';
			var finishButtonText 	= 'Finish';

			if (data.customNextName 	&& data.customNextName 		!= '') {nextButtonText 		= data.customNextName};
			if (data.customPreviousName && data.customPreviousName 	!= '') {previousButtonText 	= data.customPreviousName};
			if (data.customFinishName 	&& data.customFinishName 	!= '') {finishButtonText 	= data.customFinishName};
			if (data.customCancelName 	&& data.customCancelName 	!= '') {cancelButtonText 	= data.customCancelName};

			var tmplStr = '<ul class="button-group">';
			if (data.displayCancel) {
				tmplStr += '<li><button class="wmapp-cancel-button button">' + cancelButtonText + '</button></li>';
			}
			if (data.displayPrevious) {
				tmplStr += '<li><button class="wmapp-back-button button">' + previousButtonText + '</button></li>';
			}
			if (data.displayNext) {
				tmplStr += '<li><button class="wmapp-next-button button">' + nextButtonText + '</button></li>';
			}
			if (data.displayFinish) {
				tmplStr += '<li><button class="wmapp-finish-button button">' + finishButtonText + '</button></li>';
			}
			tmplStr += '</ul>';

			return tmplStr;
		},

		className: 'wmapp-document-list-commands',
		events: {
			"click .wmapp-back-button": "onBack",
			"click .wmapp-next-button": "onNext",
			"click .wmapp-finish-button": "onFinish",
			"click .wmapp-cancel-button": "onCancel",
		},
		onBack: function (e) {
			WMAPP.Helper.wmAjaxStart($(e.target));
			this.triggerDelayed('trigger:questionPreviousSlideEvent');
		},
		onNext: function (e) {
			WMAPP.Helper.wmAjaxStart($(e.target));
			this.triggerDelayed('trigger:questionNextSlideEvent');
		},
		onFinish: function (e) {
			WMAPP.Helper.wmAjaxStart($(e.target));
			this.triggerDelayed('trigger:questionFinishEvent');
		},
		onCancel: function (e) {
			this.triggerDelayed('trigger:questionCancelEvent');
		},
		templateHelpers: function () {
			return {
				displayNext: this.options.displayNext,
				displayPrevious: this.options.displayPrevious,
				displayFinish: this.options.displayFinish,
				displayCancel: this.options.displayCancel,
				customNextName: this.options.customNextName,
				customPreviousName: this.options.customPreviousName,
				customFinishName: this.options.customFinishName,
				customCancelName: this.options.customCancelName,
			}
		}
	});

	/**
	 * NOTE: A childview for this composite view MUST inlcude the following:
	 * tagName: 'dd',
	 *
	 * attributes: function(){
	 	return {
        	'data-slug': this.model.get('slug')
	 	}
	 },

	 detailsPanel ui element: a hidden element with the html content of a details panel
	 * ui: {
     	"detailsPanel": ".wmapp-staff-list-grid-collection-item-details",
     },
	 *
	 * trigger:element:clicked should be triggered on component click
	 *triggers: {
	 	"click .wmapp-twirl-down-list-item-container": "trigger:element:clicked"
	 },
	 *
	 *childview content must be wrapped in <div class="wmapp-twirl-down-list-item-container">

	 *css classes .wmapp-twirl-down-list-item-container.selected and .wmapp-twirl-down-list-triangle
	 * should be defined as necessary
	 *
	 */
	View.TwirlDownListView = WMAPP.Extension.View.CompositeView.extend({
		className: 'clearfix wmapp-twirl-down-list',
		template: function (model) {
			var tmplStr = '';

			if (model.name) {
				tmplStr += '<h1 class="wmapp-twirl-down-list-title">' + model.name + '</h1>';
			}

			tmplStr += '<dl class="wmapp-twirl-down-list-view"></dl>' +
				'<dd class="left wmapp-twirl-down-list-item-details" style="width:100%;display: none;" data-listitem="">' +
				'<div class="wmapp-twirl-down-list-item-details-content"></div>' +
				'<button class="wmapp-twirl-down-list-item-details-close-button secondary right"><i class="fa fa-times"></i></button></dd>';

			return tmplStr;
		},

		childViewContainer: '.wmapp-twirl-down-list-view',
		tagName: 'dd',

		ui: {
			"title": ".wmapp-twirl-down-list-title",
			"list": ".wmapp-twirl-down-list-view",
			"detailsPanelCloseButton": "button.wmapp-twirl-down-list-item-details-close-button",
			"detailsPanel": ".wmapp-twirl-down-list-item-details",
			"detailsPanelContent": ".wmapp-twirl-down-list-item-details-content"
		},

		initialize: function () {
			this.on('childview:trigger:element:clicked', this.onPanelClick);
			$(window).bind("resize.app", _.bind(_.debounce(this.onResize, 500), this));
		},

		events: {
			"click @ui.detailsPanelCloseButton": "onPanelClose"
		},

		remove: function () {
			$(window).unbind("resize.app");
			Backbone.View.prototype.remove.call(this);
		},

		onBeforeAddChild: function (childView) {
			childView.tileOptions = this.options.tileOptions;
		},

		onResize: function () {
			this.resize(this.childView);
		},

		// set the corresponding list item selected
		setSelected: function (item) {
			var container = item.find('.wmapp-twirl-down-list-item-container');
			container.addClass('selected');

			var triangle = '<div class="wmapp-twirl-down-list-triangle"></div>';
			item.append(triangle);
		},

		// remove selection from the corresponding list item
		setUnselected: function (item) {
			var container = item.find('.wmapp-twirl-down-list-item-container');
			container.removeClass('selected');

			var triangle = item.find('.wmapp-twirl-down-list-triangle');
			triangle.remove();
		},

		// panel close event handler
		onPanelClose: function () {
			var panel = this.ui.detailsPanel;
			var slug = panel.attr('data-listitem');
			panel.attr('data-listitem', '');

			this.closePanel(slug);
		},

		// close the details panel
		closePanel: function (slug) {
			var panel = this.ui.detailsPanel;
			var item = this.ui.list.find('dd[data-slug=' + slug + ']');
			this.setUnselected(item);
			panel.hide();
		},

		// open the details panel
		openPanel: function (sibling, item, slug, text) {
			this.ui.detailsPanelContent.html(text);
			this.ui.detailsPanel.attr('data-listitem', slug);
			sibling.after(this.ui.detailsPanel);
			this.ui.detailsPanel.show();
			this.setSelected(item);
		},

		resize: function (childView) {
			var panel = this.ui.detailsPanel;
			if (panel.is(':visible')) {
				panel.hide();
				var top = childView.$el.position().top;
				var $siblings = childView.$el.siblings().andSelf().filter(function (index, sibling) {
					return $(sibling).position().top == top;
				});
				var lastSibling = $siblings.last();
				lastSibling.after(panel);
				panel.show();
			}
		},

		// childview click event handler
		onPanelClick: function (childView) {
			this.childView = childView;
			var text = childView.ui.detailsPanel.html(),
				item = childView.$el,
				panel = this.ui.detailsPanel,
				top = item.position().top,
				slug = childView.model.get('slug'),
				$siblings = childView.$el.siblings().andSelf().filter(function (index, sibling) {
					return $(sibling).position().top == top;
				}),
				lastSibling = $siblings.last(),
				selectedSlug = panel.attr('data-listitem');
			// clicked the same item again
			if ((selectedSlug == slug) && panel.is(':visible')) {
				this.closePanel(slug);
				// clicked another item
			} else {
				if (selectedSlug) {
					// close the panel if it was open before
					this.closePanel(selectedSlug);
				}
				// open the panel
				this.openPanel(lastSibling, item, slug, text);
			}
		}
	});

	/**
	 * Extend the ItemView to display a timeline.
	 */
	View.TimelineItemView = WMAPP.Extension.View.ItemView.extend({
		id: 'wmapp-timeline-view-container',
		timeline: null,
		timelineItems: [],
		template: function (data) {
			var tmplStr = '';
			if (!WMAPP.isApp) {
				tmplStr += '<fieldset><legend>'+ WMAPP.Helper.pluralize(data.model.displayName) + '</legend></fieldset>';
			}
			tmplStr += '<div id="wmapp-timeline-view"></div>';
			tmplStr += '<ul id="wmapp-timeline-list"></ul>';
			return tmplStr;
		},
		templateHelpers: function() {
			return {
				model: this.options.model,
			}
		},
		events: {
			'click #wmapp-timeline-list li[data-action*="#"]': function(e) {
				var action = $(e.currentTarget).attr('data-action');
				if (action) {
					window.location = action;
				}
			}
		},
		initialize: function (data) {
			if (data && data.reminders) {
				this.reminders = data.reminders;
			}
			if (data && typeof data.showListView != "undefined") {
				this.showListView = data.showListView;
			} else {
				this.showListView = true;
			}
		},
		onShow: function () {
			//this.listenTo(this.collection, 'sync change reset add remove', this.renderTimeline);
			var that = this;
			this.listenTo(this.collection, 'sync change add remove', function () {
				//that.stopListening();
				that.renderTimeline();
			});
			this.renderTimeline();
		},
		renderTimeline: function () {
			var that = this;
			// this method will add a reminder to the timeline based on its schedules.
			var addReminderToTimeline = function (reminder, itemsId, parentId) {
				// get the schedule of this reminder (same reminder can be sent multiple times) and loop over them
				var reminderSchedules = reminder["_reminder_schedules"] ? reminder["_reminder_schedules"] : reminder.get("_reminder_schedules").toJSON();
				for (var k = 0; k < reminderSchedules.length; k++) {
					// grab a reference to the reminder schedule
					var reminderSchedule = reminderSchedules[k];
					// a unique id for this item on the timeline
					var timelineItemId = [(parentId ? parentId : "rem"), reminder.id, reminderSchedule.id].join("|");
					// create another vis.js dataset object for this reminder
					var notificationItem = {
						id: timelineItemId,
						type: 'point', // set the type to point (shows up as a circle instead of a box ont he timeline)
						content: reminder.message ? reminder.message : reminder.get("message"), // the text to display on the timeline
						model: new WMAPP.Core.Model.ReminderSchedule(reminderSchedule), // the underlying backbone model of the schedule
					};

					// is this a relative reminder? (ie, will adjust itself in relation to its parent timeline item)
					if (reminderSchedule.type == "Relative") {
						// The date of a reminder is actually an integer.
						// It is the ammount of seconds difference between this reminder and the parent timeline item
						var timeDifference = parseInt(reminderSchedule.date) * 1000; // javascript expects milliseconds for some stupid reason
						// now we know the relative date, work out what that actual date is.
						notificationItem.start = new Date(item.get("date")).valueOf() + timeDifference;
					} else {
						// no, this is a fixed date - it will be in EPOCH time though, so we need to convert
						notificationItem.start = new Date(parseInt(reminderSchedule.date) * 1000);
					}
					// same as above, get a copy of the date since the above will change as the item is modified
					notificationItem.datetime = notificationItem.start;
					// make the reminder editable if it is in the future
					notificationItem.editable = notificationItem.start > new Date();
					// add this reminder to the parent timeline item (if it exists)
					if (itemsId) {
						items[itemsId].reminders.push(notificationItem.id);
					}

					// add this notification to the vis.js dataset
					items.push(notificationItem);
				}
			}

			// if we've already created a timeline, delete it
			if (this.timeline) {
				this.timeline.destroy();
			}

			// make sure we're starting with an empty array (things that will go in the timeline will be in here)
			this.timelineItems = [];
			// add all timeline traces to the timeline
			for (var i = 0; i < this.collection.length; i++) {
				this.timelineItems.push(this.collection.models[i]);
			}
			// add all standalone reminders to the timeline
			for (var i = 0; i < this.reminders.length; i++) {
				this.timelineItems.push(this.reminders.models[i]);
			}

			// empty array of timeline items (this will be populated with a vis.js dataset, not simply a collection of backbone models)
			var items = [];

			// loop over each timeline item
			for (var i = 0; i < this.timelineItems.length; i++) {
				// grab a reference to the item in the collection
				var item = this.timelineItems[i];
				var isReminder = typeof item.attributes.timeline_id != "undefined";

				if (isReminder) {
					addReminderToTimeline(item);
				} else {
					// add this item to the vis.js dataset
					var date = moment(item.get('date'));
					var currentDate = moment();
					items.push({
						id: item.get("id"), // a unique id on the timeline
						model: item, // the underlying backbone model
						content: item.get("name"), // the text to display on the timeline
						start: date.toDate(), // the date in which the item will be displayed on the timeline
						datetime: date.toDate(), // another copy of the date (the above date changes as the user moves the timeline element around, so this one is for our reference)
						className: (item.get("foreign_entity") ? item.get("foreign_entity").replace(".", "_") : '') + (date > currentDate ? ' future' : ''), // set the css class of the timeline item (if a foreign entity exists, set it as the class name, also set a class if the date is in the future)
						editable: false, // new Date(item.get("date")) > new Date(), // if the item is in the future, it should be able to be edited (moved and deleted)
						reminders: [] // an array of any reminders associated with this timeline item
					});

					var itemsId = items.length - 1;

					// are there any reminders associated with this item?
					if (item.get("_reminders") && item.get("_reminders").length > 0) {
						// yes, get them and loop over them
						var reminders = item.get("_reminders");
						for (var j = 0; j < reminders.length; j++) {
							addReminderToTimeline(reminders[j], itemsId, item.get("id"));
						}
					}
				}
			}

			// sort the array (only really needed for the list view)
			items.sort(function (a, b) {
				if (a.start.valueOf() < b.start.valueOf()) {
					return 1;
				} else if (a.start.valueOf() > b.start.valueOf()) {
					return -1;
				} else {
					return 0;
				}
			});

			// create the list view
			if (that.showListView) {
				var listView = $("#wmapp-timeline-list");
				listView.find("li").remove();
				for (var i = 0; i < items.length; i++) {
					var item = items[i];
					var html = '<li class="' + (item.reminders ? 'timeline' : 'reminder') + '"'
					if (item.model && item.model.get('action')) {
						html += 'data-action="' + item.model.get("action") + '"';
					}
					html += '>';
					if (item.start) {
						html += '<span class="date">' + moment(item.start).format('DD/MM/YYYY') + '</span>';
					}
					if (item.content) {
						html += '<span class="content">' + item.content + '</span>';
					}
					if (item.model && item.model.get('description')) {
						html += '<span class="description">' + item.model.get("description") + '</span>';
					}
					html += '</li>';
					listView.append(html);
				}
			}

			// convert the collection of timeline elements from above into an actual vis.js dataset
			items = new vis.DataSet(items);

			// define some options for the vis.js timeline
			var options = {
				minHeight: "100%",
				align: "center",
				editable: false, // by default, the timeline cant be edited (this is overridden on a per-item basis)
				zoomMax: 31536000000, // don't zoom out more than this (seconds)
				zoomMin: 900000 // don't zoom in more than this (seconds)
			};

			// create the timeline
			this.timeline = new vis.Timeline(document.getElementById('wmapp-timeline-view'), items, options);

			// Event handler for all events on the timeline
			var timelineEvent = function (event, properties) {
				// temporarily unbind from timeline events (otherwise we're get a recursive stack overflow error)
				items.off('*', timelineEvent);
				// get the timeline item this event is on
				var item = items.get(properties.items[0]);

				if (event == "remove") { // This is a remove event - the user deleted the timeline item
					// vis.js will already have removed the item from the dataset, so we just need to remove it from the database
					if (properties.items[0].indexOf("|") > -1) {
						// if the id has dashes in it, it is a reminder (reminder schedule)
						var itemIds = properties.items[0].split("|");

						// delete the reminder schedule
						item = new WMAPP.Core.Model.ReminderSchedule({
							id: itemIds[2],
						});
						item.destroy();

						// we need to check if there are any other reminder schedules associated with this reminder
						var otherSchedulesExists = false;
						for (var i in items._data) {
							if (i.indexOf(itemIds[0] + "|" + itemIds[1] + "|") === 0) {
								otherSchedulesExists = true;
								break;
							}
						}
						// delete the reminder if it doesnt have any more schedules associated with it.
						if (!otherSchedulesExists) {
							item = new WMAPP.Core.Model.Reminder({
								id: itemIds[1]
							});
							item.destroy();
						}
					} else {
						// otherwise, assume it's a timeline item
						item = new WMAPP.Core.Model.Timeline({id: properties.items[0]});
						item.destroy();
						that.collection.remove(properties.items[0]);
					}
				} else if (event == "update") { // This is an update event - the user moved the timeline item
					// make sure we have a valid item (if not, just stop)
					if (item == null) {
						console.error("item is null");
						return;
					}

					// FYI - item.start will be the update date ie, the date the user has changed the item to
					// (this is why we needed to leep a copy of the original date in item.datetime)

					if (item.start < new Date()) { // Check if the update date is in the past
						// yep, date is in the past, which isn't allowed, so set the date back to what it originall was
						item.start = new Date(item.datetime);
					} else {
						// the updated date is in the future, so we can procede.

						// determine the diffence in time from the original date to the updated date (in milliseconds)
						var timeDifference = item.start.valueOf() - item.datetime.valueOf();

						// update our copy of the original date, since we've now genuinely changed it
						item.datetime = item.start;

						// check the type of this timeline item
						if (item.type && item.type == "point") {
							// the type is "point" which means this is a reminder

							// What kind of reminder are we dealing with?
							if (item.model.get("type") == "Relative") {
								// this is a relative reminder
								// update the date in the model with the updated date
								// (remember, for a relative reminder this is the difference in seconds, not the actual datetime)
								item.model.set("date", parseInt(item.model.get("date")) + timeDifference / 1000);
							} else {
								// this is a fixed reminder
								// update the date in the model with the updated date (in unix time!)
								item.model.set("date", item.start.valueOf() / 1000);
							}
						} else {
							// this is a normal "event" on the timeline
							// update the date in the model with the updated date
							item.model.set("date", item.start /*new Date(item.start.valueOf()-new Date().getTimezoneOffset()*60000).toISOString().substring(0, 10)*/ );
						}

						// save the timeline item (will update the database)
						item.model.save();

						// if this item has reminders, we need to loop over them and adjust them as appropriate
						if (item.reminders && item.reminders.length > 0) {
							for (var i = 0; i < item.reminders.length; i++) {
								// get a reference to the reminder
								var reminder = items.get(item.reminders[i]);
								// if this reminder is a relative reminder, we need to move it in relatino to the parent timeline item
								if (reminder.model.get("type") == "Relative") {
									// update the date in which the reminder is displayed on the timeline
									reminder.start = reminder.start.valueOf() + timeDifference;
									reminder.datetime = reminder.start;
									// update the vis.js dataset to represent our modified reminder
									items.update(reminder);
								}
							}
						}
					}

					// update the vis.js dataset to represent our modified items
					items.update(item);
				}

				// rebind to the timeline events again
				items.on('*', timelineEvent);
			}

			// bind to events on the timeline
			items.on('*', timelineEvent);
		}
	});

	/**
	 * Extend the Layout View to make a form
	 */
	View.AssociationsLayout = WMAPP.Extension.View.LayoutView.extend({
		template: null,
		model: null,
		options: {

		},
		initialize: function (options) {
			var that = this;
			window.addEventListener("resize", function () {
				clearInterval(that.redrawSlickTimeout);
				that.redrawSlickTimeout = setInterval(function () {
					that.drawSlick();
					clearInterval(that.redrawSlickTimeout);
				}, 500);
			});

			options = _.extend(this.options, options);

			var tmplStr = '<ul class="tabs" data-tab role="tablist">';
			if (_.isObject(options.regions)) {
				var i = 0;
				for (var regionName in options.regions) {
					var className = options.regions[regionName];
					className = options.regions[regionName].substr(1);
					tmplStr += '<li class="tab-title' + ((i == 0) ? ' active' : '') + '" role="presentation" data-index="' + i + '"><a href="#' + className + '" role="tab" tabindex="0" aria-selected="' + ((i == 0) ? 'true' : 'false') + '" aria-controls="' + className + '">' + options.associations[regionName].name + '</a></li>';
					++i;
				}
				this.regions = options.regions;
			}
			tmplStr += '</ul>';
			tmplStr += '<div class="tabs-content">';
			if (_.isObject(options.regions)) {
				var i = 0;
				for (var regionName in options.regions) {
					var className = options.regions[regionName];
					className = options.regions[regionName].substr(1);
					tmplStr += '<div role="tabpanel" aria-hidden="false" class="content' + ((i == 0) ? ' active' : '') + '" id="' + className + '">';
					tmplStr += '	<div class="' + className + '"></div>';
					tmplStr += '</div>';
					++i;
				}
				this.regions = options.regions;
			}
			tmplStr += '</div>';

			this.template = _.template(tmplStr);
		},
		events: {
			"click .tab-title": "onTabTitleClicked",
		},
		onTabTitleClicked: function (e) {
			//var onTabTitleClickedMethod = function(e, context) {
			e.preventDefault();
			e.stopPropagation();
			$(".tabs-content").slick('slickGoTo', $(e.target).parent().attr('data-index'));
			/*};
			if (window.click && WMAPP.isApp) {
				click(e, this, onTabTitleClickedMethod);
			} else {
				onTabTitleClickedMethod(e, this);
			}*/
		},
		onShow: function () {
			var that = this;
			if (_.isObject(this.options.regions)) {
				var i = 0;
				for (var regionName in this.options.regions) {
					this.model.get('_' + regionName)

					if (this.options.associations[regionName].type == 'many') {
						this[regionName + 'View'] = new WMAPP.Extension.View.AssociationsCollectionView({
							collection: this.model.get('_' + regionName),
							link: this.options.associations[regionName].link
						});

						this[regionName].show(this[regionName + 'View']);
					} else {
						if (this.model.get(regionName)) {
							this[regionName + 'View'] = new WMAPP.Extension.View.AssociationsModelLayoutView({
								model: this.model.get('_' + regionName),
								link: this.options.associations[regionName].link
							});

							this[regionName].show(this[regionName + 'View']);
						}
					}
				}
			}
			setTimeout(function () {
				that.drawSlick();
			}, 100);
		},
		drawSlick: function () {
			var tabsContent = $(".tabs-content");

			if (tabsContent.length > 0 && $(".slick-initialized").length > 0) {
				tabsContent.slick('unslick');
			}

			if (tabsContent.length > 0) {
				var minHeight = document.documentElement.clientHeight - tabsContent.offset().top - 50;
				$('.tabs-content, .tabs-content div[role="tabpanel"]').css("min-height", minHeight + "px");
			}

			tabsContent.slick({
				arrows: false,
				infinite: false,
				mobileFirst: true,
			}).on("beforeChange", function (e, slick, currentSlide, nextSlide) {
				$(".tab-title").removeClass("active");
				$($(".tab-title")[nextSlide]).addClass("active");
			});
		}
	});

	View.AssociationsCollectionItemView = View.ItemView.extend({
		tagName: 'li',
		classname: 'wmapp-entity-associations-collection-item',
		template: function (data) {
			var model = data.model;
			var options = data.options;
			var tmplStr = '<div>';
			if (data.options.link) {
				tmplStr += '<a href="#" class="wmapp-entity-associations-collection-item">';
			}
			tmplStr += '<span>' + model.get(model.displayAttribute) + '</span>';
			if (data.options.link) {
				tmplStr += '</a>';
			}
			tmplStr += '</div>';
			return tmplStr;
		},
		events: {
			"click .wmapp-entity-associations-collection-item": "onClick",
		},
		templateHelpers: function () {
			return {
				model: this.model,
				options: this.options
			};
		},
		onClick: function (e) {
			var onClickMethod = function (e, context) {
				e.preventDefault();
				var route = WMAPP.Helper.camelCase(context.model.featureName).toLowerCase() + "_" + WMAPP.Helper.camelCase(context.model.entityName).toLowerCase() + "_tile/details/" + context.model.get("id");
				WMAPP.appRouter.navigate(route, {
					replace: true,
					trigger: true
				});
			};
			if (window.click && WMAPP.isApp) {
				click(e, this, onClickMethod);
			} else {
				location.href = '/' + WMAPP.Helper.camelCase(this.model.featureName).toLowerCase() + '_' + WMAPP.Helper.camelCase(this.model.entityName).toLowerCase() + '/details/' + this.model.get('id');
			}
		}
	});

	View.AssociationsCollectionView = View.CollectionView.extend({
		tagName: 'ul',
		childView: View.AssociationsCollectionItemView,
		classname: 'wmapp-entity-associations-collection',
		options: {
			childrenKeyName: '_childrens',
			keyName: 'name',
		},
		childViewOptions: function () {
			return {
				link: this.options.link
			}
		},
		initialize: function (options) {
			this.options = _.extend(options, this.options);
		},
	});

	View.AssociationsModelLayoutView = View.LayoutView.extend({
		template: function (data) {
			var model = data.model;
			var options = data.options;
			var tmplStr = '';
			tmplStr += '<ul class="wmapp-entity-associations-model"></ul>';
			return tmplStr;
		},
		regions: {
			modelRegion: '.wmapp-entity-associations-model',
		},
		initialize: function (options) {
			this.options = _.extend(options, this.options);
		},
		onShow: function () {
			this.modelView = new WMAPP.Extension.View.AssociationsCollectionItemView({
				model: this.model,
				link: this.options.link
			});

			this.modelRegion.show(this.modelView);
		}
	});



	View.TableViewRowItem = View.ItemView.extend({
		options: {
			views: {},
		},
		tagName: 'tr',
		template: function (data) {
			if (typeof data.condition == "function" && !data.condition(data.model, data.columns)) {
				return '';
			}

			var rowClass = data.rowClass;
			if (rowClass) {
				if (typeof rowClass == "function") {
					$(data.el).addClass(rowClass(data.model));
				} else {
					$(data.el).addClass(rowClass);
				}
			}

			var tmplStr = '';
			for (var i in data.columns) {
				var view = null;

				if (data.columns[i] instanceof Backbone.View) {
					view = data.columns[i];
				} else if (typeof data.columns[i] == "function") {
					view = data.columns[i](data.model);
				} else {
					view = data.model.get(data.columns[i]);
				}

				if (view instanceof Backbone.View) {
					data.options.views[view.cid] = view;
					tmplStr += '<td data-cid="' + view.cid + '"></td>';
				} else {
					tmplStr += '<td>' + (view ? view : '') + '</td>';
				}
			}
			return tmplStr;
		},
		templateHelpers: function () {
			return {
				el: this.el,
				model: this.model,
				options: this.options,
				columns: this.options.compositeView.options.options.columns,
				condition: this.options.compositeView.options.options.condition,
				rowClass: this.options.compositeView.options.options.rowClass,
			}
		},
		onShow: function() {
			var that = this;
			if (this.$el.children().length === 0) {
				this.$el.remove();
			} else {
				_.each(this.options.views, function(view) {
					var el = that.$el.find('td[data-cid="' + view.cid + '"]');
					if (el.length) {
						var region = new Marionette.Region({ el: el[0] });
						region.show(view);
					}
				});
			}
		},
	});

	View.TableViewRowCollection = View.CompositeView.extend({
		childView: View.TableViewRowItem,
		childViewContainer: 'tbody',
		childViewOptions: function () {
			return {
				compositeView: this,
			}
		},
		emptyView: View.TableViewRowEmptyCollection,
		template: function (data) {
			if (data.options.collection.length == 0) {
				if (data.options.emptyTemplate) {
					if (typeof data.options.emptyTemplate == "function") {
						return data.options.emptyTemplate();
					}
					return data.options.emptyTemplate;
				}
				return '<tbody></tbody>';
			}

			var tmplStr = '<table class="wmapp-table-view ' + (data.options.className ? data.options.className : '') + '">'

			if (typeof data.options.headerRow == "undefined" || data.options.headerRow) {
				tmplStr += '<thead><tr>';
				for (var i in data.options.columns) {
					tmplStr += '<td>' + (i.indexOf('_') === 0 ? '&nbsp;' : i) + '</td>';
				}
				tmplStr += '</tr></thead>';
			}

			tmplStr += '<tbody></tbody></table>';
			return tmplStr;
		},
		collectionEvents: {
			"sync": "render"
		},
		templateHelpers: function () {
			return {
				options: this.options.options,
			}
		},
	});

	View.TableViewRowPageableCollection = View.PaginationView.extend({

	});

	View.TableView = View.LayoutView.extend({

		initialze: function () {
			if (this.options.events) {
				this.events = this.options.events;
			}
		},

		template: function (data) {
			var columnCount = 0;
			var tmplStr = '';
			if (data.options.heading && data.options.heading != '') {
				data.options.className = data.options.heading.toLowerCase().replace(" ", "-");
				tmplStr = '<h2 class="' + data.options.className + '">' + data.options.heading + '</h2>';
			}

			tmplStr += '<div class="wmapp-table-view"></div>';
			tmplStr += '<div class="wmapp-table-view-pagination"></div>'

			return tmplStr;
		},

		regions: {
			table: ".wmapp-table-view",
			pagination: '.wmapp-table-view-pagination',
		},

		onShow: function () {
			// --- Collection view
			this.tableViewRowCollection = new View.TableViewRowCollection({
				collection: this.options.collection,
				options: this.options
			});
			// show the collection view
			this.table.show(this.tableViewRowCollection);

			// show pagination if the collection is a pageable collection
			if (this.options.collection.state) {
				// --- Pagination view
				this.tableViewRowPageableCollection = new View.TableViewRowPageableCollection({
					collection: this.options.collection
				});

				// show the pagination view
				this.pagination.show(this.tableViewRowPageableCollection);
			}
		},
		templateHelpers: function () {
			return {
				model: this.model,
				options: this.options
			}
		},
	});

	View.EditableListItem = WMAPP.Extension.View.ItemView.extend({
		initialze: function () {
			this.listenTo(this.model, 'change', this.render);
			WMAPP.Extension.View.LayoutView.prototype.initialize.call(this);
		},
		template: function(data) {
			var model = data.model;

			var tmplStr = '';
			tmplStr += '<li class="wmapp-editable-list-item"><a href="#" class="wmapp-editable-list-edit button">' + model.get(model.displayAttribute) + '</a>';
			if(data.options.deleteItem){
				tmplStr += '<a href="#" class="wmapp-editable-list-delete button"></a>';
			}

			tmplStr += '</li>';

			return tmplStr;
		},
		templateHelpers: function () {
			return {
				model: this.model,
				options: this.options
			}
		},
		events: {
		    'click .wmapp-editable-list-edit': 'onEditEntity'
		},
		triggers: {
			"click .wmapp-editable-list-delete": 'trigger:onRemoveEntity',
		},
		onEditEntity: function(e) {
        	e.preventDefault();
        	e.stopPropagation();

			this.trigger('trigger:editableList:onEditEntity', this.model);
		},
	});

	View.EditableList = WMAPP.Extension.View.CompositeView.extend({
		options: {
			formOptions: {},
			displayName: null,
			deleteItem: false,
			lightboxOptions: {
				modal: true,
				width:'400px',
				height:'600px',
				closeImage: false,
				saveImage: false,
				canRotate: false,
			}

		},
    	initialize: function() {
    		this.listenTo(this.collection, 'sync', this.render);
    		this.on('childview:trigger:onRemoveEntity', this.removeEntity);
    	},
    	removeEntity: function(childView, args){
			this.collection.remove(args.model);
		},
		template: function(options) {
			var tmpModel = new options.modelName();

			var tmplStr = '';
			tmplStr += '<div class="wmapp-editable-list-wrapper"></div>';
			tmplStr += '<div class="wmapp-editable-list-add"><a href="#" class="button">Add ' + ((options.displayName) ? options.displayName : tmpModel.displayName) + '</a></div>';

			return tmplStr;

		},
		templateHelpers: function() {
			return this.options
		},
    	tagName: "ul",
    	className: "wmapp-editable-list",
    	id: "wmappEditableList",
    	childView: View.EditableListItem,
    	childViewContainer: ".wmapp-editable-list-wrapper",
    	events: {
    		'click .wmapp-editable-list-add' : 'onAddEntity'
       	},
    	onAddEntity: function(e) {
        	e.preventDefault();
        	e.stopPropagation();

        	this.options.model = new this.options.modelName();

        	this.openForm();
    	},
    	openForm: function(model) {
        	var that = this;

        	if (model) {
        		this.options.model = model;
        	}

           	this.formView = new this.options.form(_.defaults({
        		model: this.options.model
			}, this.options.formOptions));


			WMAPP.LightboxRegion.show(this.formView, this.options.lightboxOptions);

			//
			var keys = _.keys(this.options.formEvents);
			_.each(keys, function(key) {
				that.listenTo(that.formView, key, function() {
					that.options.formEvents[key](arguments[0]);
				});
			});
    	},
    	onRender: function() {
    		this.listenTo(this, 'childview:trigger:editableList:onEditEntity', function(childView, model) {
    			this.openForm(model);
    		});
    	}
	});

	/**
	 * ------------------------------------------------------------------------------------------------------------------------------------
	 * FORM VIEWS
	 * ------------------------------------------------------------------------------------------------------------------------------------
	 */
	/**
	 * Extend the Layout View to make a form
	 */
	View.BaseForm = WMAPP.Extension.View.LayoutView.extend({
		template: null,
		model: null,
		options: {
			formId: 'form',
			formClass: null,
			legend: null,
			regions: null,
			saveLabel: 'Save',
			cancelLabel: 'Cancel',
			fieldset: true,
		},
		initialize: function (options) {
			options = _.extend(this.options, options);

			var tmplStr = '<form id="' + options.formId + '"';
			if (options.formClass !== null) {
				tmplStr += (' class="' + options.formClass + '"');
			}
			tmplStr += '>';

			if (this.options.fieldset) {
				tmplStr += '<fieldset>';
				if (_.isString(options.legend)) {
					tmplStr += '<legend>' + options.legend + '</legend>';
				}
			}

			tmplStr += '<div class="wmapp-form">';
			if (_.isObject(options.regions)) {
				for (var regionName in options.regions) {
					var className = options.regions[regionName];
					className = options.regions[regionName].substr(1)
					tmplStr += '<div class="' + className + '"></div>';
				}
				this.regions = options.regions;
			}
			tmplStr += '</div>';

			tmplStr += '<ul class="button-group wmapp-button-group-space">';
			if (this.options.saveLabel !== false) {
				tmplStr += '<li><button type="button" class="wmapp-submit-button" id="'+options.formId+'Save">'+options.saveLabel+'</button></li>';
			}
			tmplStr += '&nbsp;';
			if (this.options.cancelLabel !== false) {
				tmplStr += '<li><button type="button" class="wmapp-cancel-button alert" id="'+options.formId+'Cancel">'+options.cancelLabel+'</button></li>';
			}
			tmplStr += '</ul>';

			if (this.options.fieldset) {
				tmplStr += '</fieldset>';
			}

			tmplStr += '</form>';
			this.template = _.template(tmplStr);

			if (this.model) {
				Backbone.Validation.bind(this);
			}

			this.options.layoutId = this.options.formId;
		},
		events: {
			"click .wmapp-submit-button": "onSubmit",
			"click .wmapp-cancel-button": "onCancel"
		},
		ui: {
			form: 'form',
			submitButton: '.wmapp-submit-button',
			cancelButton: '.wmapp-cancel-button',
		},
		beforeSubmit: function () {
			return true;
		},
		_submitData: function () {
			if (this.model !== null) {
				this.model.validate();
				if (this.model.isValid()) {
					// trigger the create site event in the application
					this.trigger('trigger:formSubmit', this.model, this);
				} else {
					WMAPP.Helper.wmAjaxEnd();
				}
			} else {
				// serialize the form data
				var data = this.ui.form.serializeObject();
				// trigger the create site event in the application
				this.trigger('trigger:formSubmit', data, this);
			}
		},
		onSubmit: function (e) {
			this.clearErrors();
			if (!$(e.target).hasClass('disabled')) {
				var that = this;
				WMAPP.Helper.wmAjaxStart($(e.target));

				// this function is required for Chrome to display spinning
				// icon on a button properly
				_.delay(function () {
					var pre = that.beforeSubmit();
					if (_.isBoolean(pre) && pre) {
						that._submitData();
					} else if (pre instanceof Backbone.Marionette.Callbacks) { // callback
						pre.add(that._submitData, that);
					}
				}, 300);
			}
		},
		onCancel: function () {
			// trigger the cancel event
			this.trigger('trigger:formCancel');
		},
		showErrors: function (errors) {
			this.clearErrors();
			if (!$.isEmptyObject(errors)) {
				var fields = this.$el.find('input, select, textarea');
				$.each(errors, function (fieldName, errMsg) {
					var targetField = fields.filter('[name=' + fieldName + ']').first();
					if (targetField.attr('type') == 'radio') {
						targetField = targetField.parent();
					}
					targetField.addClass("error");
					targetField.closest('label').append('<small class="error">' + errMsg + '</small>');
				});
			}

			WMAPP.Helper.wmAjaxEnd();
		},
		clearErrors: function () {
			this.$el.find('small.error').remove();
			this.$el.find('.error').removeClass('error');

			WMAPP.Helper.wmAjaxEnd();
		}
	});

	View.ComboButtons = Backbone.Marionette.ItemView.extend({
		className: 'wmapp-combo-buttons',
		template: function(options) {
			var model = options.model;
			var tmplStr = '<label';
			if (options.fieldId) {
				tmplStr += ' for="' + options.fieldId + '"';
			}
			tmplStr += '>' + '<span class="wmapp-input-title">' + options.label + '</span>';
			if (options.required) {
				tmplStr += '<span class="is-required" title="Required">*</span>';
			}
			if (options.tooltip) {
				tmplStr += '<span data-tooltip class="has-tip tip-right" title="' + options.tooltip + '"></span>';
			}
			tmplStr += '</label><div class="btn-group ' + options.fieldId +'">';

			_.each(options.options, function(option) {
				tmplStr += '<button'
				if (options.readonly) {
					tmplStr += ' disabled="disabled"';
				}
				if (model && typeof model.get(options.name) != undefined) {
					var optionValue =  _.isObject(option) ? option.get(options.valueField) : option;
					if (_.isObject(model.get(options.name))) {
						if (model.get(options.name).id == optionValue) {
							tmplStr += ' class="selected"';
						}
					} else {
						if (model.get(options.name) == optionValue) {
							tmplStr += ' class="selected"';
						}
					}
				} else if (_.isObject(option) && option.get('selected')) {
					tmplStr += ' class="selected"';
				}
				tmplStr += '>' + (_.isObject(option) ? option.get(options.optionField) : option) + '</button>';
			});
			tmplStr += '</div>';
			return tmplStr;
		},
		templateHelpers: function() {
			return this.options
		},
		events: {
			'click button': 'onButtonClicked'
		},
		onButtonClicked: function(e) {
			this.$el.find('.selected').removeClass('selected');
			$(e.target).addClass('selected');
			if (this.options.model) {
				var optFieldName = this.options.optionField;
				var selectedValue = e.currentTarget.childNodes[0].data;
				var hit = this.options.options.find(function(model) {
					if (_.isFunction(model.get)) {
						return model.get(optFieldName) == selectedValue;
					}
					return model == selectedValue;
				});
				if (hit) {
					if (_.isFunction(hit.get)) {
						this.options.model.set(this.options.name, hit.get(this.options.valueField));
					} else {
						this.options.model.set(this.options.name, hit);
					}
				}
			}
			this.trigger('trigger:onSelectionChanged', $(e.target).text());
		},
		setReadOnly: function(state){
			this.options.readonly = state;
			_.each(this.$el.find('button'), function(button){
				var $button = $(button);
				$button.prop('disabled', state);
			});
			return this.options.readonly;
		},
		isReadOnly: function(){
			return this.options.readonly;
		},
	});

	/**
	 * Extend the Item View to make a combo box
	 */
	View.ComboBox = Backbone.Marionette.ItemView.extend({
		template: function (data) {
			var options = data.options;
			var model = data.model;
			var styleColor = '';
			var element = $('<label></label>');
			if (options.fieldId) {
				element.attr('for', options.fieldId);
			}
			if(options.textColor){
				styleColor = 'color:' + options.textColor;
			}
			if (options.label) {
				element.html('<span style="' + styleColor + '" class="wmapp-input-title">' + options.label + '</span>');
				if (options.required) {
					element.append('<span class="is-required" title="Required">*</span>');
				}
				if (options.tooltip) {
					element.append('<span data-tooltip class="has-tip tip-right" title="' + options.tooltip + '"></span>');
				}
			}

			var comboBox = $('<select style="' + styleColor + '" ></select>');
			comboBox.attr('name', options.name);
			comboBox.attr('id', options.fieldId);
            comboBox.addClass("needsclick"); // Prevents Fastclick from causing problems opening this on Android
			if (options.fieldClass) {
				comboBox.addClass(options.fieldClass);
			}
			if (options.readonly) {
				comboBox.prop('disabled', true);
			}
			if (options.cfquestions) {
				comboBox.attr('cf-questions', options.cfquestions);
			}
			if (options.cferror) {
				comboBox.attr('cf-error', options.cferror);
			}

			if (options.empty) {
				var opt = $('<option value="' + options.empty.value + '">' + options.empty.option + '</option>');
				comboBox.append(opt);
			}

			if (_.isArray(options.options)) {
				_.each(options.options, function (item, index) {
					if (typeof options.optionsFilter == 'function') {
						if (!options.optionsFilter.apply(null, arguments)) {
							return;
						}
					}
					var itemValue = typeof options.valueField == "function" ? options.valueField(item) :_.isObject(item) ? item.get(options.valueField) : item;
					var itemOption = typeof options.optionField == "function" ? options.optionField(item) : _.isObject(item) ? item.get(options.optionField) : item;

					// escape double quote in itemValue
					if (typeof itemValue === 'string') {
						itemValue = itemValue.replace(/"/g , '&quot;');
					}

					var opt = $('<option value="' + itemValue + '">' + (typeof itemOption == "function" ? itemOption(item) : itemOption) + '</option>');
					if (_.isObject(item) && Boolean(item.get(options.isDisabled))) {
						opt.attr('disabled', 'disabled');
					}
					if (model && typeof model.get(options.name) != undefined) {
						if (_.isObject(model.get(options.name))) {
							if (model.get(options.name).id == itemValue) {
								opt.attr('selected', 'selected');
							}
						} else {
							if (model.get(options.name) == itemValue) {
								opt.attr('selected', 'selected');
							}
						}
					} else if (_.isObject(item) && item.get('selected')) {
						opt.attr('selected', 'selected');
					}
					comboBox.append(opt);
				});
			}

			var htmlString = element[0].outerHTML;
			htmlString += comboBox[0].outerHTML;

			if (options.notes) {
				htmlString += '<span class="notes">' + options.notes + '</span>';
			}

			return htmlString;
		},
		model: null,
		events: function () {
			var events = {};
			events['change select'] = 'onInputChange';
			return events;
		},
		modelEvents: function () {
			var events = {};
			events['change:' + this.options.name] = 'onModelChange';
			return events;
		},
		options: {
			fieldId: null,
			fieldClass: null,
			name: null,
			tooltip: null,
			notes: null,
			empty: null,
			options: null,
			optionsFilter: null,
			valueField: 'id',
			optionField: 'name',
			label: null,
			sortBy: null, // property_name[ ASC|DESC]
			isDisabled: null, // property_name
			readonly: false,
			silentChange: true,
			selected: false,
			required: false,
			cfquestions: null,
            cferror: null,
            textColor: null,
		},
		templateHelpers: function () {
			var selectOptions = null;
			if (this.options.options) {
				if (_.isString(this.options.sortBy)) {
					var _sortBy = this.options.sortBy.trim().split(' ');
					selectOptions = this.options.options.sortBy(_sortBy[0]);
					if (_sortBy[1] && _sortBy[1].toLowerCase() === 'desc') {
						selectOptions = selectOptions.reverse();
					}
				} else if (!_.isArray(this.options.options)) {
					selectOptions = this.options.options.toArray();
				} else {
					selectOptions = this.options.options;
				}
			}
			return {
				model: this.model,
				options: {
					fieldId: this.options.fieldId,
					fieldClass: this.options.fieldClass,
					name: this.options.name,
					tooltip: this.options.tooltip,
					readonly: this.options.readonly,
					label: this.options.label,
					empty: this.options.empty,
					notes: this.options.notes,
					options: selectOptions,
					optionsFilter: this.options.optionsFilter,
					valueField: this.options.valueField,
					optionField: this.options.optionField,
					isDisabled: this.options.isDisabled,
					selected: this.options.selected,
					required: this.options.required,
					cfquestions: this.options.cfquestions,
		            cferror: this.options.cferror,
					textColor: this.options.textColor
				}
			}
		},
		onInputChange: function () {
			var newValue = this.$el.find('select').val();
			if (this.model) {
				var change = {};
				change[this.options.name] = newValue;
				if (!_.isArray(this.options.options)) {
					if (this.options.options.get(newValue)) {
						this.model.attributes['_' + this.options.name] = this.options.options.get(newValue);
					} else if (this.options.options.models) {
						var option = _.find(this.options.options.models, function (option) {
							return option.get('value') == newValue;
						})
						if (option) {
							change['_' + this.options.name] = option;
						} else {
							// Once, this was set to {} which actually destroys the attributes
							// of whatever model is attached
							change['_' + this.options.name] = null;
						}
					}
				}

				this.model.set(change, {
					silent: Boolean(this.options.silentChange)
				});
				var newModel = _.find(this.options.options.models, function(model) {
					return model.get(this.options.valueField) == newValue;
				}, this);
				this.trigger('trigger:coreComboBoxChange', newModel);
			} else {
				this.trigger('trigger:coreComboBoxChange', newValue);
			}

			if (this.options.onChange && typeof this.options.onChange == "function") {
				this.options.onChange(this.model);
			}
		},
		onModelChange: function () {
			if (this.model && this.model.get(this.options.name)) {
				var el = this.$el.find('select option[value="' + this.model.get(this.options.name) + '"]');
				if (el.length) {
					// do nothing
				} else if (this.options.empty) {
					el = this.$el.find('select option[value="' + this.options.empty.value + '"]');
				} else {
					el = this.$el.find('select option').first();
				}
				el.prop('selected', true);
			} else {
				this.$el.find('select option').first().prop('selected', true);
			}
		},
		initialize: function () {
			_.bindAll(this, 'beforeRender', 'render', 'afterRender');
			var _this = this;
			this.render = _.wrap(this.render, function (render) {
				_this.beforeRender();
				render();
				_this.afterRender();
				return _this;
			});

			if (this.options.options && !_.isArray(this.options.options)) {
				this.listenTo(this.options.options, 'sync', this.render);
				//this.listenTo(this.options.options, 'add', this.render);
				this.listenTo(this.options.options, 'reset', this.render);
			}
		},
		beforeRender: function () {},
		afterRender: function () {},
		toggleReadonly: function (pass) {
			this.$el.find('select').prop('disabled', !this.$el.find('select').prop('disabled'));
		}
	});

	/**
	 * Extend the Item View to make a combo box
	 */
	View.LinkedComboBox = Backbone.Marionette.ItemView.extend({
		template: function (data) {
			var options = data.options;
			var model = data.model;
			var styleColor = '';
			if (options.tableView) {
				var div = $('<div></div>');
				div.css('width', '50%');
				div.css('display', 'inline-block');
			}
			if(options.textColor){
				styleColor = 'color:'+options.textColor;
			}
			var element = $('<label style="' + styleColor + '"></label>');
			if (options.fieldId) {
				element.attr('for', options.fieldId);
			}

			if (options.label) {
				element.html('<span class="wmapp-input-title">' + options.label + '</span>');
				if (options.required) {
					element.append('<span class="is-required" title="Required">*</span>');
				}
				if (options.tooltip) {
					element.append('<span data-tooltip class="has-tip tip-right" title="' + options.tooltip + '"></span>');
				}
			}

			var comboBox = $('<select></select>');
			comboBox.attr('name', options.name);
			comboBox.attr('id', options.fieldId);

			if (options.fieldClass) {
				comboBox.addClass(options.fieldClass);
			}
			if (options.readonly) {
				comboBox.prop('disabled', true);
			}

			if (options.empty) {
				var opt = $('<option value="' + options.empty.value + '">' + options.empty.option + '</option>');
				comboBox.append(opt);
			}

			var entitySelected = false;
			var linkedOptions = false;
			if (options.options) {
				_.each(options.options.models, function (item, index) {
					var opt = $('<option style="' + styleColor + '" value="' + item.get(options.valueField) + '">' + item.get(options.options.displayAttribute) + '</option>');
					if (_.isObject(item) && Boolean(item.get(options.isDisabled))) {
						opt.attr('disabled', 'disabled');
					}
					if (model && model.get(options.name)) {
						if (model.get(options.name) == item.get(options.valueField)) {
							opt.attr('selected', 'selected');
							entitySelected = true;
							if (item.get('_' + options.linkedEntity + 's')) {
								linkedOptions = item.get('_' + options.linkedEntity + 's');
							}
						}
					} else if (item.get('selected')) {
						opt.attr('selected', 'selected');
					}
					comboBox.append(opt);
				});
			}

			var tmplStr = element[0].outerHTML;
			tmplStr += comboBox[0].outerHTML;
			if (options.tableView) {
				div.append(tmplStr);
				tmplStr = div[0].outerHTML;
			}

			// if the entity is selected, render the second combobox
			if (entitySelected && linkedOptions && linkedOptions.models.length) {
				if (options.tableView) {
					var div = $('<div></div>');
					div.css('width', '50%');
					div.css('display', 'inline-block');
				}

				var element = $('<label></label>');
				if (options.fieldId) {
					element.attr('for', options.fieldId + 'Linked');
				}

				if (options.linkedLabel) {
					element.html(options.linkedLabel);
				}

				var comboBox = $('<select></select>');
				comboBox.attr('name', options.linkedEntity);
				comboBox.attr('id', options.fieldId + 'Linked');

				if (options.fieldClass) {
					comboBox.addClass(options.fieldClass);
				}
				if (options.readonly) {
					comboBox.prop('disabled', true);
				}

				if (options.empty) {
					var opt = $('<option value="' + options.empty.value + '">-- ' + options.linkedLabel + ' --</option>');
					comboBox.append(opt);
				}

				_.each(linkedOptions.models, function (item, index) {
					var opt = $('<option style="' + styleColor + '" value="' + item.get(options.valueField) + '">' + item.get(options.optionField) + '</option>');
					if (Boolean(item.get(options.isDisabled))) {
						opt.attr('disabled', 'disabled');
					}
					if (model && model.get('_' + options.name) && model.get('_' + options.name).get(options.linkedEntity)) {
						if (model.get('_' + options.name).get(options.linkedEntity) == item.get(options.valueField)) {
							opt.attr('selected', 'selected');
						}
					} else if (item.get('selected')) {
						opt.attr('selected', 'selected');
					}
					comboBox.append(opt);
				});

				var linkedTmplStr = element[0].outerHTML;
				linkedTmplStr += comboBox[0].outerHTML;

				if (options.tableView) {
					div.append(linkedTmplStr);
					tmplStr += div[0].outerHTML;
				} else {
					tmplStr += linkedTmplStr;
				}
			}
			return tmplStr;
		},
		model: null,
		events: function () {
			var events = {};
			events['change #' + this.options.fieldId] = 'onInputChange';
			events['change #' + this.options.fieldId + 'Linked'] = 'onLinkedInputChange';
			return events;
		},
		modelEvents: {
			'change': 'onModelChange'
		},
		options: {
			fieldId: null,
			fieldClass: null,
			name: null,
			tooltip: null,
			notes: null,
			empty: null,
			options: null,
			valueField: 'id',
			optionField: 'name',
			label: null,
			sortBy: null, // property_name[ ASC|DESC]
			isDisabled: null, // property_name
			readonly: false,
			silentChange: true,
			selected: false,
			required: false,
			tableView: false,
			textColor: null
		},
		templateHelpers: function () {
			var selectOptions = null;
			if (this.options.options) {
				if (_.isString(this.options.sortBy)) {
					var _sortBy = this.options.sortBy.trim().split(' ');
					selectOptions = this.options.options.sortBy(_sortBy[0]);
					if (_sortBy[1] && _sortBy[1].toLowerCase() === 'desc') {
						selectOptions = selectOptions.reverse();
					}
				} else if (!_.isArray(this.options.options)) {
					selectOptions = this.options.options.toArray();
				}
			}
			return {
				model: this.model,
				options: this.options
			}
		},
		onInputChange: function (evt) {
			var newValue = this.$el.find('select#' + evt.target.id).val();

			if (this.model) {
				var change = {};
				change[evt.target.name] = newValue;
				if (this.options.options.get(newValue)) {
					var option = this.options.options.get(newValue);
				} else if (this.options.options.models) {
					var option = _.find(this.options.options.models, function (option) {
						return option.get('value') == newValue;
					});
				}

				if (option) {
					var clone = option.clone();
					// unset the linked options
					clone.unset('_' + this.options.linkedEntity + 's');
					clone.unset(this.options.linkedEntity + 's');
					change['_' + evt.target.name] = clone;

					this.model.set(change, {
						silent: Boolean(this.options.silentChange)
					});

					// set a default linked option is there are none
					this.model.get('_' + evt.target.name).set(this.options.linkedEntity, 0, {
						silent: Boolean(this.options.silentChange)
					});
					this.model.get('_' + evt.target.name).unset('_' + this.options.linkedEntity, {
						silent: Boolean(this.options.silentChange)
					});
				} else {
					change['_' + evt.target.name] = {};
					this.model.set(change, {
						silent: Boolean(this.options.silentChange)
					});
				}

				this.trigger('trigger:coreLinkedComboBoxChange', this.options.options.get(newValue));
			} else {
				this.trigger('trigger:coreLinkedComboBoxChange', newValue);
			}

			this.render();
		},
		onLinkedInputChange: function (evt) {
			var entityValue = this.$el.find('select').val();
			var linkedValue = $('#' + evt.target.id).val();

			if (this.model) {
				if (!this.model.get('_' + this.options.name) && entityValue) {
					var option = _.find(this.options.options.models, function (option) {
						return option.get('value') == entityValue;
					})
					if (option) {
						this.model.set('_' + this.options.name, option, {
							silent: Boolean(this.options.silentChange)
						});
					}
				}
				var entity = this.model.get('_' + this.options.name);

				var change = {};
				change[evt.target.name] = linkedValue;
				if (this.options.options.get(entityValue) && this.options.options.get(entityValue).get('_' + this.options.linkedEntity + 's') && this.options.options.get(entityValue).get('_' + this.options.linkedEntity + 's').get(linkedValue)) {
					change['_' + evt.target.name] = this.options.options.get(entityValue).get('_' + this.options.linkedEntity + 's').get(linkedValue);
					this.trigger('trigger:coreLinkedComboBoxChange', this.options.options.get(entityValue).get('_' + this.options.linkedEntity + 's').get(linkedValue));
				} else if (this.options.options.models) {
					var option = _.find(this.options.options.models, function (option) {
						return option.get('value') == entityValue;
					});
					if (option && option.get('_' + this.options.linkedEntity + 's').models) {
						var linked = _.find(option.get('_' + this.options.linkedEntity + 's').models, function (option) {
							return option.get('value') == linkedValue;
						});
						if (linked) {
							change['_' + evt.target.name] = linked;
						}
					}
					this.trigger('trigger:coreLinkedComboBoxChange', option);
				} else {
					this.trigger('trigger:coreLinkedComboBoxChange', linkedValue);
				}

				entity.set(change, {
					silent: Boolean(this.options.silentChange)
				});
			} else {
				this.trigger('trigger:coreLinkedComboBoxChange', linkedValue);
			}

			this.render();
		},
		onModelChange: function () {
			// just re-render the view?
			this.render();
		},
		initialize: function () {
			_.bindAll(this, 'beforeRender', 'render', 'afterRender');
			var _this = this;
			this.render = _.wrap(this.render, function (render) {
				_this.beforeRender();
				render();
				_this.afterRender();
				return _this;
			});

			if (this.options.options) {
				this.listenTo(this.options.options, 'sync', this.render);
				this.listenTo(this.options.options, 'add', this.render);
				this.listenTo(this.options.options, 'reset', this.render);
			}
		},
		beforeRender: function () {},
		afterRender: function () {
			$(document).foundation('reflow');
		},
		toggleReadonly: function (pass) {
			this.$el.find('select').prop('disabled', !this.$el.find('select').prop('disabled'));
		}
	});

	/**
	 * Extend the Item View to make a combo box
	 */
	View.ComboBoxVersion = Backbone.Marionette.ItemView.extend({
		template: function (data) {
			var view = data.view;
			var options = data.options;
			var model = data.model;
			var element = $('<div class="row collapse"></div>');
			var label = $('<label><span class="wmapp-input-title"></span></label>');
			if (options.fieldId) {
				label.attr('for', options.fieldId);
			}

			if (options.label) {
				label.html(options.label);
				if (options.required) {
					label.append('<span class="is-required" title="Required">*</span>');
				}
				if (options.tooltip) {
					label.append('<span data-tooltip class="has-tip tip-right" title="' + options.tooltip + '"></span>');
				}
			}

			var col1 = $('<div class="small-9 large-10 columns"></div>');
			var col2 = $('<div class="small-3 large-2 columns"></div>');

			var hidden = '<input name="' + options.name + '_version" type="hidden" value="';
			if (model && model.get(options.name + '_version')) {
				hidden += model.get(options.name + '_version');
			}
			hidden += '" id="' + options.fieldId + 'Version"/>';
			var div = $('<div id="' + options.fieldId + 'VersionDiv"><a id="' + options.fieldId + 'File"><span class="postfix"><i class="fa fa-file-pdf-o" style="font-size: 1.2rem; padding-top: 6px;"></i></span></a></div>');
			if (model && model.get(options.name + '_version')) {
				var version = view.getVersionFromId(model.get(options.name + '_version'));
				if (version) {
					var link = version.get('url');
					div.find('a').attr('href', link);
				}
			}
			col2.append(div);
			col2.append(hidden);


			if (model && model.get(options.name)) {
				var input = $('<input />');
				input.attr('type', 'text');
				input.attr('name', options.name);
				input.attr('id', options.fieldId);
				if (options.fieldClass) {
					input.addClass(options.fieldClass);
				}
				if (options.readonly) {
					input.prop('disabled', true);
				}

				var selected = _.find(options.options.models, function(m) {
					return model.get(options.name) == m.get(options.valueField);
				});

				if (selected) {
					input.attr('value', selected.get(options.optionField));
				}

				col1.append(input); // put the input inside the first column

			} else {
				var comboBox = $('<select></select>');
				comboBox.attr('name', options.name);
				comboBox.attr('id', options.fieldId);
				if (options.fieldClass) {
					comboBox.addClass(options.fieldClass);
				}
				if (options.readonly) {
					comboBox.prop('disabled', true);
				}

				if (options.empty) {
					var opt = $('<option value="' + options.empty.value + '">' + options.empty.option + '</option>');
					comboBox.append(opt);
				}

				_.each(options.options.models, function (item, index) {
					if (typeof options.filter !== 'function' || options.filter(item)) {
						var opt = $('<option value="' + item.get(options.valueField) + '">' + item.get(options.optionField) + '</option>');
						if (Boolean(item.get(options.isDisabled))) {
							opt.attr('disabled', 'disabled');
						}
						if (model && model.get(options.name)) {
							if (_.isObject(model.get(options.name))) {
								if (model.get(options.name).id = item.get(options.valueField)) {
									opt.attr('selected', 'selected');
								}
							} else {
								if (model.get(options.name) == item.get(options.valueField)) {
									opt.attr('selected', 'selected');
								}
							}
						} else if (item.get('selected')) {
							opt.attr('selected', 'selected');
						}
						comboBox.append(opt);
					}
				});

				col1.append(comboBox); // put the combobox inside the first column
			}

			element.append(label); // put the label inside the row
			element.append(col1); // put the first column inside the label
			element.append(col2); // put the second column inside the label
			return element[0].outerHTML;
		},
		model: null,
		events: function () {
			var events = {};
			events['change #' + this.options.fieldId] = 'onInputChange';
			events['click #' + this.options.fieldId + 'File'] = 'onFileLinkClicked';
			return events;
		},
		modelEvents: function () {
			var events = {};
			events['change:' + this.options.name] = 'onModelChange';
			return events;
		},
		options: {
			fieldId: null,
			fieldClass: null,
			name: null,
			tooltip: null,
			notes: null,
			empty: null,
			options: null,
			valueField: 'id',
			optionField: 'name',
			label: null,
			sortBy: null, // property_name[ ASC|DESC]
			isDisabled: null, // property_name
			readonly: false,
			silentChange: true,
			selected: false,
			required: false,
			plugin: false,
		},
		templateHelpers: function () {
			var selectOptions = null;
			if (this.options.options) {
				if (_.isString(this.options.sortBy)) {
					var _sortBy = this.options.sortBy.trim().split(' ');
					selectOptions = this.options.options.sortBy(_sortBy[0]);
					if (_sortBy[1] && _sortBy[1].toLowerCase() === 'desc') {
						selectOptions = selectOptions.reverse();
					}
				}
			}
			return {
				view: this,
				model: this.model,
				options: this.options
			}
		},
		onFileLinkClicked: function (e) {
			e.preventDefault();
			console.log('onFileLinkClicked');
			if (this.model.get(this.options.name + '_version') && WMAPP.isApp) {
				var version = this.getVersionFromId(this.model.get(this.options.name + '_version'));
				if (version) {
					WMAPP.vent.trigger('trigger:coreComboBoxVersionFileClicked', version, $(e.currentTarget).attr('href'));
				} else {
					window.open($(e.currentTarget).attr('href'), '_system');
				}
			} else if (!WMAPP.isApp && $(e.currentTarget).attr('href')) {
				window.open($(e.currentTarget).attr('href'), '_blank');
			}
		},
		onInputChange: function () {
			var that = this;
			var newValue = this.$el.find('#' + this.options.fieldId).val();

			if (newValue !== '') {
				if (this.options.model) {
					var change = {};
					change[this.options.name] = newValue;
					if (this.options.options.get(newValue)) {
						change['_' + this.options.name] = this.options.options.get(newValue);

						// need to provide a link to the latest version
						var version = _.max(this.options.options.get(newValue).get('_versions').models, function (version) {
							if (version.get('published')) {
								return version.get('version');
							}
						});
						if (version) {
							change[this.options.name + '_version'] = version.get('id');
							change['_' + this.options.name + '_version'] = version;
							this.$el.find('#' + this.options.fieldId + 'Version').val(version.get('id'));
							var link = version.get('url');
							this.$el.find('#' + this.options.fieldId + 'VersionDiv > a').attr('href', link);
						}
					} else if (this.options.options.models) {
						var option = _.find(this.options.options.models, function (option) {
							return option.get('value') == newValue;
						})
						if (option) {
							change['_' + this.options.name] = option;
						}
					}

					// Manually setting the attributes, rather than using `set`, because it seems to modify options.collection somehow!?
					_.each(change, function(value, key) {
						that.options.model.attributes[key] = value;
					});

					this.trigger('trigger:coreComboBoxVersionChange', this.options.options.get(newValue));
				} else {
					this.trigger('trigger:coreComboBoxVersionChange', newValue);
				}
			} else {
				if (this.options.model) {
					this.options.model.unset(this.options.name + '_version', {
						silent: Boolean(this.options.silentChange)
					});
					this.options.model.unset('_' + this.options.name + '_version', {
						silent: Boolean(this.options.silentChange)
					});
				}

				this.$el.find('#' + this.options.fieldId + 'Version').val('');
				this.$el.find('#' + this.options.fieldId + 'VersionDiv > a').removeAttr('href');
				this.trigger('trigger:coreComboBoxVersionChange', newValue);
			}
		},
		onModelChange: function () {
			if (this.model && this.model.get(this.options.name)) {
				this.$el.find('#' + this.options.fieldId + ' option[value="' + this.model.get(this.options.name) + '"]').prop('selected', true);
			} else {
				this.$el.find('#' + this.options.fieldId + ' option').first().prop('selected', true);
			}
			if (this.model && this.model.get(this.options.name + '_version')) {
				var version = this.getVersionFromId(this.model.get(this.options.name + '_version'));
				if (version) {
					this.$el.find('#' + this.options.fieldId + 'Version').val(version.get('id'));
					var link = version.get('url');
					this.$el.find('#' + this.options.fieldId + 'VersionDiv > a').attr('href', link);
				}
			}
		},
		getVersionFromId: function (versionId) {
			var selected = _.find(this.options.options.models, function (model) {
				return this.model.get(this.options.name) == model.get('id');
			}, this);
			if (selected) {
				var version = _.find(selected.get('_versions').models, function (version) {
					return version.get('id') == versionId;
				}, this);
				if (version) {
					return version;
				}
			}
			return false;
		},
		initialize: function () {
			_.bindAll(this, 'beforeRender', 'render', 'afterRender');
			var _this = this;
			this.render = _.wrap(this.render, function (render) {
				_this.beforeRender();
				render();
				_this.afterRender();
				return _this;
			});

			if (this.options.options) {
				this.listenTo(this.options.options, 'sync', this.render);
				this.listenTo(this.options.options, 'add', this.render);
				this.listenTo(this.options.options, 'reset', this.render);
			}
		},
		beforeRender: function () {},
		afterRender: function () {},
		toggleReadonly: function (pass) {
			this.$el.find('select').prop('disabled', !this.$el.find('select').prop('disabled'));
		}
	});

	View.HtmlComboBoxItem = View.LayoutView.extend({
		tagName: 'li',
		className: function() {
			var className = 'html-combobox-option';
			if(this.options.model.get('selected')) {
				className += ' selected';
			}
			return className;
		},
		attributes: function() {
			return {
				// 'style': 'height:150px',
				'data-index': this.options.childIndex
			};
		},
		template: function(data) {
			var tmplStr = "";
			if(data.options.hasIcon) {
				tmplStr += '<i class="html-combobox-option-icon"/>'
			}
			tmplStr += '<span class="html-combobox-option-text">';
			var options = data.options;
			tmplStr += data.model.get(options.optionField);
			tmplStr += '</span>';
			return tmplStr;
		},
		templateHelpers: function() {
			return this.options;
		},
		events: {
			'click': 'clickItem'
		},
		onRender: function() {
			this.$el.attr({
				'data-cid': this.options.model.cid,
				'data-value': this.options.model.get(this.options.valueField),
			});
			// if (this.options.comboModel.get(this.options.name) == this.options.model.get(this.options.valueField)) {
			// 	this.$el.addClass('selected');
			// }
		},
		clickItem: function(event) {
			event.stopPropagation();
			this.trigger('trigger:HtmlComboBoxOption:click', this.model);
		}
	});

	View.HtmlComboBoxCollection = View.CollectionView.extend({
		tagName: 'ul',
		className: function() {
			var className = 'html-combobox-option-list';
			return className;
		},
		childView: View.HtmlComboBoxItem,
		childViewOptions: function(model, index) {
			return _.extend(this.options, {
				childIndex: index
			});
		},
		childEvents: {
			'trigger:HtmlComboBoxOption:click':'clickItem'
		},
		clickItem: function(childView, option) {
			this.trigger('trigger:HtmlComboBoxOptionList:click', option);
		},
	});

	/**
	 * Extend the ItemView to make an HTML comboBox
	 */
	View.HtmlComboBox = View.LayoutView.extend({
		className: 'html-combobox',
		options: {
			model: null,
			fieldId: null,
			fieldClass: null,
			name: null,
			options: null,
			valueField: 'id',
			optionField: 'name',
			label: null,
			readonly: false,
			onChange: null,
			hasFilter: false, // whether could type into a text box to filter the result
			hasIcon: false,
			tooltip: null,
			//empty: null, // not yet implemented
			//sortBy: null, // not yet implemented
			//required: false, // not yet implemented
			//tooltip: null, // not yet implemented
		},
		// childView: View.HtmlComboBoxItem,
		// childViewContainer: 'ul',
		childViewOptions: function() {
			return {
				valueField: this.options.valueField,
				optionField: this.options.optionField,
				comboModel: this.options.model,
				name: this.options.name,
				shown: false,
			}
		},
		initialize: function() {
			var that = this;

			this.options.displayName = 'option';

			if (this.options.options instanceof WMAPP.Extension.Model.Collection || this.options.options instanceof Backbone.Collection) {
				if(this.options.options.displayName) {
					this.options.displayName = this.options.options.displayName;
				} else {
					this.options.displayName = this.options.model.displayName;
				}
			} else {
				var options = new WMAPP.Extension.Model.Collection();
				_.each(this.options.options, function(value) {
					var m = {};
					m[that.options.valueField] = value;
					m[that.options.optionField] = value;
					options.add(new WMAPP.Extension.Model.AbstractModel(m));
				});
				this.options.options = options;

				if (this.options.model instanceof WMAPP.Extension.Model.AbstractModel) {
					this.options.displayName = this.options.model.displayName;
				}
			}

			this.options.collection = this.options.options;
			this.collection = this.options.options;

			// this.listenTo(this, 'childview:onOptionClicked', function(view, e, model) {
			// 	that.onOptionClicked.call(that, e, model);
			// });

			Backbone.Marionette.LayoutView.prototype.initialize.apply(this, arguments);
		},
		modelEvents:{
			change: 'render',
		},
		collectionEvents: {
			sync: 'render',
			reset: 'render',
		},
		template: function(options) {
			var tmplStr = '';
			if (options.tooltip) {
				tmplStr += '<span data-tooltip class="has-tip tip-right" title="' + options.tooltip + '"></span>';
			}
			if (options.label) {
				tmplStr += '<label ';
				if (options.fieldId) {
					tmplStr += 'for="' + options.fieldId + '" ';
				}
				tmplStr += 'class="html-combobox-label">' + '<span class="wmapp-input-title">' + options.label + '</span>' + '</label>';
			}
			tmplStr += '<div'
			if(options.hasFilter) {
				tmplStr += ' class="html-combobox-display-region editable" contenteditable="true"';
			} else {
				tmplStr += ' class="html-combobox-display-region"';
			}
			tmplStr += ' name="' + options.name + '" id="' + options.fieldId +'">';
			if(options.model.get(options.name)) {
				var valueField = options.valueField;
				var query = {};
				query[valueField] = options.model.get(options.name);
				var optionSelected = options.options.findWhere(query);
				tmplStr += optionSelected.get(options.optionField);
			} else {
				tmplStr += options.placeholder;
			}

			tmplStr += '</div>';
			tmplStr += '<div class="html-combobox-collection-wrapper">';
			tmplStr += '</div>';
			// tmplStr += '<ul class="wmapp-htmlcombobox ' + (options.readOnly ? 'readonly ' : ' ');
			// if (options.fieldClass) {
			// 	tmplStr += options.fieldClass;
			// }
			// tmplStr += ' " ';
			// if (options.fieldId) {
			// 	tmplStr += 'id="' + options.FieldId + '" ';
			// }
			// tmplStr += ' style="position:absolute;z-index:300;overflow-y:scroll;max-height:100px"></ul>';
			return tmplStr;
		},
		templateHelpers: function() {
			return _.extend({
				that: this,
			}, this.options);
		},
		events: {
			'keyup .editable': 'onKeyUp',
			'keydown .editable': 'onKeyDown',
			'click .html-combobox-display-region': 'onClicked',
		},
		regions: {
			'optionsList': 'div.html-combobox-collection-wrapper',
		},
		onRender: function() {
			var that = this;
			if(this.options.model.get(this.options.name)) {
				_.each(this.options.collection.models, function(model) {
					model.set('selected', false);
					if(that.options.model.get(that.options.name) == model.get(that.options.valueField)) {
						model.set('selected', true);
					}
				});
			}
			// var pleaseSelect = $('<li>-- Please select ' + WMAPP.Helper.aOrAn(this.options.displayName) + ' --</li>');
			// pleaseSelect.on('click', function(e) {
			// 	if ($(this).parent('ul').hasClass('open')) {
			// 		that.onOptionClicked.call(that, e, null);
			// 	}
			// });
			// this.$el.find('ul').prepend(pleaseSelect);

			// if (this.$el.find('.selected').length === 0) {
			// 	this.$el.find('li:first-child').addClass('selected');
			// 	if (typeof this.options.onChange == "function") {
			// 		this.options.onChange(null);
			// 	}
			// }
			// console.error(this.$el.find('ul').height());
		},
		onClicked: function(e) {
			// var target = $(e.currentTarget);
			// if (target.hasClass('open')) {
			// 	target.removeClass('open');
			// 	target.css('maxHeight', target.find('li').first().outerHeight());
			// 	target.scrollTop(0);
			// } else {
			// 	target.addClass('open');
			// 	var height = 300; // TODO - calculate this to best fit screen size!
			// 	target.css('maxHeight', height);
			// 	var li = target.find('.selected');
			// 	var scrollTo = (parseInt(li.attr('data-index'))+1)*li.innerHeight();
			// 	var middle = height/2;
			// 	if (target[0].scrollHeight > middle && scrollTo > middle) {
			// 		scrollTo -= middle;
			// 	} else {
			// 		scrollTo = 0;
			// 	}
			// 	target.scrollTop(scrollTo);
			// }
			if(!this.shown) {
				e.stopPropagation();
				this.showOptions();
			}
		},
		onOptionClicked: function(e, model) {
			// var target = $(e.target);
			// var ul = target.parent('ul');

			// if (!target.hasClass('selected')) {
			// 	ul.find('.selected').removeClass('selected');
			// 	target.addClass('selected');

			// 	if (this.options.model) {
			// 		if (model) {
			// 			this.options.model.set(this.options.name, model.get(this.options.valueField), {silent: true});
			// 			this.options.model.unset('_'+this.options.name, {silent: true});
			// 			this.options.model.set('_'+this.options.name, model, {silent: true});
			// 		} else {
			// 			this.options.model.set(this.options.name, null, {silent: true});
			// 		}
			// 	}

			// 	if (typeof this.options.onChange == "function") {
			// 		this.options.onChange(model);
			// 	}
			// }
		},
		showOptions: function() {
			var that = this;
			// clone a fitlerd collection
			this.filteredCollection = this.options.collection.clone();
			this.comoboItemCollection = new View.HtmlComboBoxCollection({
				collection: this.filteredCollection,
				options: this.options
			});
			var target = this.comoboItemCollection.$el;
			var height = 300; // TODO - calculate this to best fit screen size!
			this.adjustDropdown(true);

			// target.css({
			// 	'maxHeight': height,
			// 	// 'overflow-y': 'scroll'
			// });

			this.listenTo(this.comoboItemCollection, 'trigger:HtmlComboBoxOptionList:click', function(option) {
				var optionValue = option.get(that.options.valueField)
				that.model.set(that.options.name, optionValue);
				that.model.set('_' + that.options.name, option);
				// change the class of the selected item
				_.each(that.collection.models, function(model) {
					model.set('selected', false);
				});
				option.set('selected', true);
				that.hideOptions();
				try{
					that.model.save();
				} catch (error) {
					console.error(error);
				}

			});

			$( window ).on('resize.adjustDropdown', function() {
				that.adjustDropdown.call(that, true);
			});

			$(window).on('click.closedropdown', function() {
				that.hideOptions.call(that);
			});

			this.optionsList.show(this.comoboItemCollection);
			// scroll top the selected  option
			var li = this.comoboItemCollection.$el.find('.selected');
			var height = 300;
			var scrollTo = (parseInt(li.attr('data-index'))+1)*li.innerHeight();
			var middle = height/2;
			if (this.comoboItemCollection.$el[0].scrollHeight > middle && scrollTo > middle) {
				scrollTo -= middle;
			} else {
				scrollTo = 0;
			}
			this.comoboItemCollection.$el.scrollTop(scrollTo);

			this.shown = true;
		},
		hideOptions: function() {
			if(this.comoboItemCollection) {
				this.comoboItemCollection.remove();
			}
			this.shown = false;
			// unbind the listener for the dropdown
			$(window).off('click.closedropdown');
			$(window).off('resize.adjustDropdown');
			this.adjustDropdown(false);
		},
		onKeyUp: function(e) {
			if ([38, 40, 13].indexOf(e.keyCode) >= 0) {
				e.preventDefault();
				return false;
			}
			console.error(e);
			var that = this;
			var value = $(e.target).val().trim();
			if (value == '') {
				this.filteredCollection = this.options.collection.clone();
			} else {
				this.filteredCollection.reset(this.options.collection.filter(function(model) {
					return model.get(that.options.optionField).toLowerCase().indexOf(value.toLowerCase()) >= 0;
				}));
			}
		},
		// adjust the dropdown to check how to show the dropdown
		adjustDropdown: function(show) {
			var optionsList = this.$el.find(this.optionsList.el);
			if(!show) {
				optionsList.removeClass('show-above');
				optionsList.removeClass('show-down');
				return;
			}
			var maximumHeight = 300;
			var listItemHeight = 100;
			var height = 300;
			// know the size of the list
			if(this.filteredCollection.length * listItemHeight > maximumHeight) {
				height = maximumHeight;
			} else {
				height = this.filteredCollection.length * listItemHeight;
			}
			// get the offset to the bottom
			if(!show) {
				optionsList.addClass('show-above');
				optionsList.removeClass('show-down');
			}
			var offsetToBottom = window.innerHeight - optionsList.offset().top;
			if(offsetToBottom > height) {
				optionsList.addClass('shown-down');
				optionsList.removeClass('show-above');
			} else {
				optionsList.addClass('show-above');
				optionsList.removeClass('show-down');
			}

		}
	});

	/**
	 * Extend the Item View to make a radio button group
	 */
	View.RadioButtonGroup = Backbone.Marionette.ItemView.extend({
		id: function() {
			if (this.options.fieldId) {
				return this.options.fieldId;
			}
		},
		template: function (data) {
			var tmplStr = '';
			var options = data.options;
			var styleColor = '';
			var model = data.model;
			if(options.textColor){
				styleColor = 'color:'+options.textColor;
			}
			var element = $('<label style="' + styleColor + '" ></label>');
			if (options.fieldId) {
				element.attr('for', options.fieldId);
			}
			if (options.label) {
				element.html('<span class="wmapp-input-title">' + options.label + '</span>');
				if (options.required) {
					element.append('<span class="is-required" title="Required">*</span>');
				}
			}
			if (options.tooltip) {
				element.append('<span data-tooltip class="has-tip tip-right" title="' + options.tooltip + '"></span>');
			}
			var radioButtonGroup = $('<div></div>');
			radioButtonGroup.append($('<div><input type="radio" style="display:none;" name="' + options.name + '" value="" id="' + options.name + '_place_holder"></div>'));
			if (_.isArray(options.options)) {
				_.each(options.options, function (item, index) {
					var rb = $('<input type="radio"  name="' + options.name + options.fieldId + '" value="' + item.get(options.valueField) + '" id="' + options.fieldId + '_' + item.get(options.valueField) + '"' + (options.readonly?' disabled':'') +'>');
					if (Boolean(item.get(options.isDisabled))) {
						rb.attr('disabled', 'disabled');
					}
					if (options.cfquestions){
						rb.attr('cf-questions', options.cfquestions);
					}
					if (options.cferror){
						rb.attr('cf-error', options.cferror);
					}
					if (model !== null && model.get(options.name) != null && model.get(options.name) == item.get(options.valueField)) {
						rb.attr('checked', 'checked');
					}
					var label = $('<label style=" ' + styleColor + '"for="' + options.fieldId + '_' + item.get(options.valueField) + '"></label>');
					if (model !== null && model.get(options.name) != null && model.get(options.name) == item.get(options.valueField)) {
						label.addClass('checked');
					}					
					label.append(rb).append(item.get(options.optionField));
					radioButtonGroup.append(label);
				});
			}
			element.append(radioButtonGroup);
			if (options.notes) {
				element.append('<span class="notes">' + options.notes + '</span>');
			}

			return element[0].outerHTML;
		},
		model: null,
		events: {
			'change input[type=radio]': 'onInputChange'
		},
		options: {
			fieldId: null,
			fieldClass: null,
			name: null,
			tooltip: null,
			empty: null,
			options: null,
			valueField: 'id',
			optionField: 'name',
			label: null,
			sortBy: null, // property_name[ ASC|DESC]
			isDisabled: null, // property_name
			readonly: false,
			silentChange: true,
			notes: false,
			required: false,
			cfquestions: null,
            cferror: null,
			textColor: null
		},
		templateHelpers: function () {
			var checkOptions = null;
			if (this.options.options) {
				if (_.isString(this.options.sortBy)) {
					var _sortBy = this.options.sortBy.trim().split(' ');
					checkOptions = this.options.options.sortBy(_sortBy[0]);
					if (_sortBy[1] && _sortBy[1].toLowerCase() === 'desc') {
						checkOptions = checkOptions.reverse();
					}
				} else {
					checkOptions = this.options.options.toArray();
				}
			}
			return {
				model: this.model,
				options: {
					fieldId: this.options.fieldId,
					fieldClass: this.options.fieldClass,
					name: this.options.name,
					tooltip: this.options.tooltip,
					readonly: this.options.readonly,
					label: this.options.label,
					empty: this.options.empty,
					options: checkOptions,
					valueField: this.options.valueField,
					optionField: this.options.optionField,
					isDisabled: this.options.isDisabled,
					notes: this.options.notes,
					required: this.options.required,
					cfquestions: this.options.cfquestions,
		            cferror: this.options.cferror,
		            textColor: this.options.textColor
				}
			}
		},
		modelEvents: {
			'change': 'onModelChange'
		},
		onInputChange: function (evt) {
			var newValue = this.$el.find('#' + evt.target.id).val();

			if (this.model) {
				var change = {};
				change[this.options.name] = newValue;
				change['_' + this.options.name] = this.options.options.get(newValue);
				this.model.set(change, {
					silent: Boolean(this.options.silentChange)
				});
			}

			// add a style to the wrapping label
			this.$el.find('label.checked').removeClass('checked');
			//$(evt.currentTarget).parents('label[for="' + this.options.fieldId + '"]').find('label[for^="' + this.options.fieldId + '"]')
			if ($(evt.currentTarget).is(":checked")) {
				$(evt.currentTarget).parent('label').addClass('checked');
			}

			this.trigger('trigger:coreRadioButtonGroupChange', newValue);
		},
		onModelChange: function (evt) {

		},
		initialize: function () {
			if (this.options.options) {
				this.listenTo(this.options.options, 'sync', this.render);
			}
		}
	});

	/**
	 * Extend the Item View to make a combo box
	 */
	View.MultiComboBox = Backbone.Marionette.ItemView.extend({
		template: function (data) {
			var tmplStr = '';

			if (data.options.label) {
				tmplStr += '<label for="' + data.options.fieldId + '">' + '<span class="wmapp-input-title">' + data.options.label + '</span>';
				if (data.options.required) {
					tmplStr += '<span class="is-required" title="Required">*</span>';
				}
				if (data.options.tooltip != null) {
					tmplStr += '<span data-tooltip class="has-tip tip-right" title="' + data.options.tooltip + '"></span>';
				}
				tmplStr += '</label>';
			}

			if (_.isArray(data.options.options)) {
				_.each(data.options.options, function (item, index) {
					tmplStr += '<select name="' + item.get('name') + '" data-id="' + item.get('id') + '" id="' + data.options.fieldId + '"';
					if (data.options.readonly != null && data.options.readonly) {
						tmplStr += ' disabled="disabled"';
					}
					if (data.options.fieldClass != null) {
						tmplStr += ' class="' + data.options.fieldClass + '"';
					}
					tmplStr += '>';
					tmplStr += '<option value="">' + item.get('name') + '</option>';
					if (item.get('_' + data.options.name).models != null) {
						_.each(item.get('_' + data.options.name).models, function (option) {
							tmplStr += '<option value="' + option.get('id') + '"';
							if (_.isArray(data.options.model.get(data.options.name))) {
								if (data.options.model !== null && data.options.model.get(data.options.name) != null && data.options.model.get(data.options.name).indexOf(option.get('id')) >= 0) {
									tmplStr += ' selected="selected"';
								}
							} else {
								if (data.options.model !== null && data.options.model.get(data.options.name) != null) {
									var array = $.map(data.options.model.get(data.options.name), function(el) { return el });

									if (array.indexOf(option.get('id'))  >= 0) {
										tmplStr += ' selected="selected"';
									}
								}
							}
							tmplStr += '>' + option.get('name') + '</option>';
						});
					}
					tmplStr += '</select>';
				});
			}

			return tmplStr;

		},
		model: null,
		events: function () {
			var events = {};
			events['change select'] = 'onInputChange';
			return events;
		},
		options: {
			fieldId: null,
			fieldClass: null,
			name: null,
			tooltip: null,
			empty: null,
			options: null,
			valueField: 'id',
			optionField: 'name',
			label: null,
			sortBy: null,
			readonly: false,
			required: false,
		},
		templateHelpers: function () {
			var selectOptions = null;
			if (this.options.options) {
				if (this.options.sortBy) {
					selectOptions = this.options.options.sortBy(this.options.sortBy);
				} else {
					selectOptions = this.options.options.toArray();
				}
			}
			return {
				options: {
					fieldId: this.options.fieldId,
					fieldClass: this.options.fieldClass,
					name: this.options.name,
					tooltip: this.options.tooltip,
					readonly: this.options.readonly,
					label: this.options.label,
					empty: this.options.empty,
					options: selectOptions,
					valueField: this.options.valueField,
					optionField: this.options.optionField,
					required: this.options.required,
					model: this.model,
				}
			}
		},
		modelEvents: {
			'change': 'onModelChange'
		},
		onModelChange: function (evt) {

		},
		onInputChange: function () {
			if (this.model) {
				var that = this;
				this.model.set(this.options.name, new Array(), {
					silent: true
				});
				this.model.unset('_' + this.options.name, {
					silent: true
				});

				var ids = new Array();
				var _ids = new Backbone.Collection();
				this.$el.find('.' + this.options.fieldClass).each(function (i, field) {
					var id = $(this).val();
					var optionId = $(this).data('id');
					if (id != '') {
						ids.push(id);

						var opts = _.find(that.options.options.models, function (option) {
							return option.get('id') == optionId;
						});
						var opt = _.find(opts.get('_' + that.options.name).models, function (option) {
							return option.get('id') == id;
						});
						_ids.add(opt);
					}
				});
				this.model.set(this.options.name, ids, {
					silent: true
				});
				this.model.set('_' + this.options.name, _ids, {
					silent: true
				});
			}

			this.trigger('trigger:coreMultiComboBoxChange');
		},
		initialize: function (options) {
			this.options = $.extend({}, this.options, options);
		},
		toggleReadonly: function (pass) {
			this.$el.find('select').prop('disabled', !this.$el.find('select').prop('disabled'));
		}
	});

	/**
	 * Extend the Item View to make a select box
	 */
	View.SelectBox = Backbone.Marionette.ItemView.extend({
		template: function(data) {
			var options = data.options;
			var model = data.model;

			var tmplStr = '';
			if (options.label) {
				tmplStr += '<label for="' + options.fieldId + '"><span class="wmapp-input-title">' + options.label + '</span></label>';
			}
			if (options.required) {
				tmplStr += '<span class="is-required" title="Required">*</span>';
			}
			if (options.tooltip) {
				tmplStr += '<span data-tooltip class="has-tip tip-right" title="' + options.tooltip + '"></span>';
			}
			tmplStr += '<select name="' + options.name + '" multiple id="' + options.fieldId + '"';
			if (options.readonly != null && options.readonly) {
				tmplStr += ' disabled="disabled"';
			}
			if (options.fieldClass != null) {
				tmplStr += ' class="' + options.fieldClass + '"';
			}
			tmplStr += '>';
			if (options.options != null && options.options.models != null) {
				_.each(options.options.models, function(item){
					tmplStr += '<option value="' + item.get(options.valueField) + '"';

					if (model !== null && model.get(options.name) != null && model.get(options.name).indexOf((item.get(options.valueField)).toString())  >= 0) {
						tmplStr += ' selected="selected"';
					}
					tmplStr += '>' + item.get(options.optionField) + '</option>';
				});
			}
			tmplStr += '</select>';
			return tmplStr;
		},
		model: null,
		events: function () {
			return {"change select": 'onInputChange'};
		},
		options: {
			fieldId: null,
			fieldClass: null,
			name: null,
			tooltip: null,
			empty: null,
			options: null, // The collection from which to create the select box
			valueField: 'id',
			optionField: 'name',
			label: null,
			readonly: false,
			required: false,
		},
		templateHelpers: function () {
			return {
				model: this.model,
				options: {
					fieldId: this.options.fieldId,
					fieldClass: this.options.fieldClass,
					name: this.options.name,
					tooltip: this.options.tooltip,
					label: this.options.label,
					empty: this.options.empty,
					options: this.options.options,
					valueField: this.options.valueField,
					optionField: this.options.optionField,
					readonly: this.options.readonly,
					required: this.options.required,
				}
			}
		},
		modelEvents: {
			'change': 'onModelChange'
		},
		onModelChange: function (evt) {

		},
		onInputChange: function () {
			if (this.model) {
				var id = this.$el.find('select').val();
				this.model.set(this.options.name, id, {
					silent: true
				});
				this.model.set('_' + this.options.name, this.options.options.get(id), {
					silent: true
				});
			}

			this.trigger('trigger:coreSelectBoxChange');
		},
		initialize: function () {
			if (this.options.options) {
				this.listenTo(this.options.options, 'sync', this.render);
			}
		},
		toggleReadonly: function (pass) {
			this.$el.find('select').prop('disabled', !this.$el.find('select').prop('disabled'));
		}
	});

	/**
	 * Extend the Item View to make a pepper box
	 */
	View.PepperBox = Backbone.Marionette.ItemView.extend({
		template: function (data) {
			var options = data.options;
			var model = data.model;
			var tmplStr = '<label for="' + options.fieldId + '">' + '<span class="wmapp-input-title">' + options.label + '</span>';
			if (options.required) {
				tmplStr += '<span class="is-required" title="Required">*</span>';
			}
			if (options.tooltip != null) {
				tmplStr += '<span data-tooltip class="has-tip tip-right" title="' + options.tooltip + '"></span>';
			}
			tmplStr += '<div class="row wmapp-pepper-box-container" id="' + options.fieldId + '">' +
				'<div class="large-5 medium-5 columns text-center">' +
				'<p><strong>Options</strong></p>' +
				'<select multiple id="' + options.fieldId + 'Left"' + ((options.fieldClass != null) ? ' class="' + options.fieldClass + '"' : '') + ((options.readonly != null && options.readonly) ? ' disabled="disabled"' : '') + '>';

			if (options.options && options.options.models != null) {
				_.each(options.options.models, function (item) {
					if (model && model.get(options.name) != null && model.get(options.name).indexOf(item.get(options.valueField)) < 0) {
						tmplStr += '<option value="' + item.get(options.valueField) + '">' + item.get(options.optionField) + '</option>';
					}
				}, this);
			}
			tmplStr += '</select></div>' +
				'<div class="large-2 medium-2 columns text-center"><p>&nbsp;</p><input type="button" id="btnLeft" data-id="' + options.fieldId + 'Left" value="&lt;&lt;" /><input type="button" id="btnRight" data-id="' + options.fieldId + 'Right" value="&gt;&gt;" />'+
				'<input type="button" style="width:100%; margin:1rem 0;" id="btnSelectAll"  value="Select All" />' +
				'<input type="button" style="width:100%" id="btnUnselectAll"  value="Unselect All" />';
			if (options.orderable) {
			tmplStr +=	'	<input type="button" id="btnUp" data-id="' + options.fieldId + 'Up" value="up" /><input type="button" id="btnDown" data-id="' + options.fieldId + 'Down" value="down" />';
			}
			tmplStr +=	'</div>' +
				'<div class="large-5 medium-5 columns text-center">' +
				'<p><strong>Selected</strong></p>' +
				'<select name="' + options.name + '" multiple id="' + options.fieldId + 'Right"' + ((options.fieldClass != null) ? ' class="' + options.fieldClass + '"' : '') + ((options.readonly != null && options.readonly) ? ' disabled="disabled"' : '') + '>';
			if (options.options && options.options.models != null) {
				var collection = model.get('_' + options.name);
				_.each(model.get('_' + options.name).models, function (item) {
					if (model !== null && model.get(options.name) != null && model.get(options.name).indexOf(item.get(options.valueField)) >= 0) {
						tmplStr += '<option value="' + item.get(options.valueField) + '">' + item.get(options.optionField) + '</option>';
					}
				}, this);
			}
			tmplStr += '</select></div>' +
				'</div></label>';
			return tmplStr;
		},
		templateHelpers: function () {
			return {
				model: this.model,
				options: {
					fieldId: this.options.fieldId,
					fieldClass: this.options.fieldClass,
					name: this.options.name,
					tooltip: this.options.tooltip,
					label: this.options.label,
					empty: this.options.empty,
					options: this.options.options,
					valueField: this.options.valueField,
					optionField: this.options.optionField,
					readonly: this.options.readonly,
					required: this.options.required,
					orderable: this.options.orderable,
					orderField: this.options.orderField,
				}
			}
		},
		initialize: function () {
			if (this.options.options) {
				this.listenTo(this.options.options, 'sync', this.render);
			}
			this.listenTo(this.model, 'sync', this.render);
		},
		ui: {
			btnLeft: '#btnLeft',
			btnRight: '#btnRight',
			btnSelectAll: '#btnSelectAll',
			btnUnselectAll: '#btnUnselectAll',
			btnUp: '#btnUp',
			btnDown: '#btnDown',
		},
		events: function () {
			var events = {};
			events['click @ui.btnLeft'] = 'onRemove';
			events['click @ui.btnRight'] = 'onAdd';
			events['click @ui.btnSelectAll'] = 'onAddAll';
			events['click @ui.btnUnselectAll'] = 'onRemoveAll';
			events['click @ui.btnUp'] = 'onUp';
			events['click @ui.btnDown'] = 'onDown';
			return events;
		},
		options: {
			fieldId: null,
			fieldClass: null,
			name: null,
			tooltip: null,
			empty: null,
			options: null,
			valueField: 'id',
			optionField: 'name',
			label: null,
			required: false,
		},
		onUp: function () {
			var that = this;

			this.$el.find("#" + this.options.fieldId + "Right option:selected").each(function() {
				$(this).prev().insertAfter(this);
			});

			this.$el.find("#" + this.options.fieldId + "Right option").each(function(i, option) {
				var model = that.model.get('_' + that.options.name).get($(option).val());
				model.set(that.options.orderField, i+1);
				that.trigger('trigger:moveItemUp', model);

			});

			this.trigger('trigger:corePepperBoxChange');
		},
		onDown: function() {
			var that = this;

			this.$el.find("#" + this.options.fieldId + "Right option:selected").each(function() {
				$(this).next().insertBefore(this);

			});

			this.$el.find("#" + this.options.fieldId + "Right option").each(function(i, option) {
				var model = that.model.get('_' + that.options.name).get($(option).val());
				model.set(that.options.orderField, i+1);
				that.trigger('trigger:moveItemDown', model);

			});

			this.trigger('trigger:corePepperBoxChange');
		},
		onAddAll: function () {

			var that = this;
			$('#' +this.options.fieldId +'Left option').prop('selected', true);

			var availableCollection = this.options.options;
			var selectedCollection = this.model.get('_' + this.options.name);
			var selectedItems = this.model.get(this.options.name);
			var orderField = this.options.orderField;
			var order = 0;
			if (this.options.orderable) {
				selectedCollection.sort();
				if (selectedCollection.length > 0) {
					order = selectedCollection.models[selectedCollection.length - 1].get(orderField);
				}
			}
			var selectedItem = $("#" + this.options.fieldId + "Left option:selected");
			if (selectedItem && availableCollection) {
				selectedItem.each(function() {
					var model = availableCollection.get($(this).val());
					if (model) {
						if (that.options.orderable) {
							model.set(orderField, ++order);
						}
						selectedCollection.add(model);
						selectedItems.push(model.get('id'));
					}
				});
				$("#" + that.options.fieldId + "Right").append(selectedItem);
			} else {
				alert('No items available');
			}
			this.trigger('trigger:corePepperBoxChange');
		},
		onRemoveAll: function (item) {
			var that = this;
			$('#' +this.options.fieldId +'Right option').prop('selected', true);

			var availableCollection = this.options.options;
			var selectedCollection = this.model.get('_' + this.options.name);
			var selectedItems = this.model.get(this.options.name);

			var selectedItem = $("#" + this.options.fieldId + "Right option:selected");
			if (selectedItem && availableCollection) {
				selectedItem.each(function() {
					var model = selectedCollection.get($(this).val());
					if (model) {
						selectedItems = _.without(selectedItems, model.get('id'));
						selectedCollection.remove(model);

						//this.model.set('_' + this.options.name, selectedItems);
						that.model.set(that.options.name, selectedItems);
					}
				});
				$("#" + that.options.fieldId + "Left").append(selectedItem);
			} else {
				alert('No item selected');
			}
			this.trigger('trigger:corePepperBoxChange');
		},
		onAdd: function (item) {
			var that = this;
			// add the item to the selected collection in the model
			// the available collection is this.options.options
			// the selected collection is this.model.get(this.options.name);
			var availableCollection = this.options.options;
			var selectedCollection = this.model.get('_' + this.options.name);
			var selectedItems = this.model.get(this.options.name);
			var orderField = this.options.orderField;
			var order = 0;
			if (this.options.orderable) {
				selectedCollection.sort();
				if (selectedCollection.length > 0) {
					order = selectedCollection.models[selectedCollection.length - 1].get(orderField);
				}
			}

			var selectedItem = $("#" + this.options.fieldId + "Left option:selected");
			if (selectedItem && availableCollection) {
				selectedItem.each(function() {
					var model = availableCollection.get($(this).val());
					if (model) {
						if (that.options.orderable) {
							model.set(orderField, ++order);
						}
						$("#" + that.options.fieldId + "Right").append(selectedItem);
						selectedCollection.add(model);
						selectedItems.push(model.get('id'));
					}
				});
			} else {
				alert('No item selected');
			}
			this.trigger('trigger:corePepperBoxChange');
		},
		onRemove: function (item) {
			var that = this;
			// add the item to the available collection in the view
			// the available collection is this.options.options
			// the selected collection is this.model.get(this.options.name);
			var availableCollection = this.options.options;
			var selectedCollection = this.model.get('_' + this.options.name);
			var selectedItems = this.model.get(this.options.name);

			var selectedItem = $("#" + this.options.fieldId + "Right option:selected");
			if (selectedItem && availableCollection) {
				selectedItem.each(function() {
					var model = selectedCollection.get($(this).val());
					if (model) {
						$("#" + that.options.fieldId + "Left").append(selectedItem);
						selectedItems = _.without(selectedItems, model.get('id'));
						selectedCollection.remove(model);

						//this.model.set('_' + this.options.name, selectedItems);
						that.model.set(that.options.name, selectedItems);
					}
				});
			} else {
				alert('No item selected');
			}
			this.trigger('trigger:corePepperBoxChange');
		},

		toggleReadonly: function (pass) {
			this.$el.find('select').prop('disabled', !this.$el.find('select').prop('disabled'));
		}
	});

	/**
	 * Extend the Item View to make a list of checkboxes
	 */
	View.CheckBoxes = Backbone.Marionette.ItemView.extend({
		initialize: function () {
			if (this.options.options && !_.isArray(this.options.options)) {
				this.listenTo(this.options.options, 'sync', this.render);
				this.listenTo(this.options.options, 'add', this.render);
				this.listenTo(this.options.options, 'reset', this.render);
				this.listenTo(this.options.options, 'update', this.render);
				this.listenTo(this.options.options, 'remove', this.render);
			}
			//submission is used for the conversational form
			if (!this.options.submission){
				this.options.submission = this.options.name;
			}
		},
		model: null,
		events: function () {
			var events = {};
			if (this.options.fieldClass) {
				events['change .' + this.options.fieldClass.replace(/ /g, ".")] = 'onInputChange';
			} else {
				events['change #' + this.options.fieldId] = 'onInputChange';
			}
			return events;
		},
		options: {
			fieldId: null,
			fieldClass: null,
			name: null,
			submission: null,
			tooltip: null,
			empty: null,
			options: null,
			valueField: 'id',
			optionField: 'name',
			label: null,
			readonly: false,
			required: false,
			cfquestions: null,
			cferror: null,
			textColor: null,
			silentChange: true,
			customCss: null
		},
		modelEvents: {
			'change': 'onModelChange'
		},
		onModelChange: function (evt) {

		},
		onInputChange: function (e) {
			if (this.model) {
				var selectedCollection = this.model.get('_' + this.options.submission);
				var selectedItems = this.model.get(this.options.submission);
				if (!selectedItems)
					selectedItems = new Array();

				var checkbox = $(e.target);
				var id = WMAPP.Helper.castId(checkbox.attr('value'));

				if (checkbox.prop('checked')) {

					selectedItems.push(id);
					if (selectedCollection !== undefined)
						selectedCollection.add(this.options.options.get(id), {
							silent: this.options.silentChange
						});

					this.model.set(this.options.name, selectedItems, {
						silent: this.options.silentChange
					});
					if (!this.options.silentChange) {
						this.model.trigger('change');
					}

				} else {
					selectedItems = _.without(selectedItems, id);
					if (selectedCollection !== undefined) {
						var model = selectedCollection.get(id);
						selectedCollection.remove(model, {
							silent: this.options.silentChange
						});
					}

					this.model.set(this.options.name, selectedItems, {
						silent: this.options.silentChange
					});
					if (!this.options.silentChange) {
						this.model.trigger('change');
					}
				}
			}

			// add a style to the wrapping label
			if ($(e.currentTarget).is(":checked")) {
				$(e.currentTarget).parent('label').addClass('checked');
			} else {
				$(e.currentTarget).parent('label').removeClass('checked');
			}

			// trigger change event with ticked option value
			this.trigger('trigger:coreCheckBoxesChange', $(e.currentTarget).val());
		},
		template: function (data) {
			var model = data.model;
			var options = data.options;
			var styleColor = '';
			var tmplStr = '';

			if (options.customCss != null) {
				tmplStr += '<div style="' + options.customCss + '">';
			} else {
				tmplStr += '<div>';
			}
			if(options.textColor){
			   styleColor = 'color:'+options.textColor;
		   }
			if (options.label) {
				tmplStr += '<label style="' + styleColor + '" for="' + options.fieldId + '">' + '<span class="wmapp-input-title">' + options.label + '</span>';
				if (options.required) {
					tmplStr += '<span class="is-required" title="Required">*</span>';
				}
				if (options.tooltip) {
					tmplStr += '<span data-tooltip class="has-tip tip-right" title="' + options.tooltip + '"></span>';
				}
			}

			tmplStr += '<input  name="' + options.name + '" type="hidden" value="0" id="' + options.fieldId + '_"/><br />';
			tmplStr += '</label>';
			tmplStr += '<div id="' + options.fieldId + '">';
			if (options.options.models != null) {
				_.each(options.options.models, function (item) {
					if (!options.inputFirst) {
						tmplStr += '<label style="' + styleColor + '" for="' + options.fieldId + '_' + item.get(options.valueField) + '" style="display:block;">';
					} else {
						tmplStr += '<div class="'+ options.fieldClass + '-checkbox">';
					}
					tmplStr += '<input style="' + styleColor + '" name="' + options.name + '" type="checkbox" value="' + item.get(options.valueField) + '" id="' + options.fieldId + '_' + item.get(options.valueField) + '" ';
					if(options.cfquestions){
						tmplStr += ' cf-questions="'+ options.cfquestions +'"';
					}
					if(options.cferror){
						tmplStr += ' cf-error="'+ options.cferror +'"';
					}
					if (model && model.get(options.name)) {
						if (_.isObject(model.get(options.name)) && !_.isArray(model.get(options.name))) {
							if (model.get(options.name).hasOwnProperty(item.get(options.valueField))) {
								tmplStr += ' checked="checked"';
							}
						} else if (_.isArray(model.get(options.name))) {
							var found = false;
							_.each(model.get(options.name), function (value, key) {
								if (value.toString() == item.get(options.valueField)) {
									found = true;
								}
							});
							if (found) {
								tmplStr += ' checked="checked"';
							}
						} else {
							if (model.get(options.name).indexOf(item.get(options.valueField))  >= 0 || model.get(options.name).indexOf(WMAPP.Helper.castId(item.get(options.valueField))) >= 0) {
								tmplStr += ' checked="checked"';
							}
						}
					}
					if (options.fieldClass != null) {
						tmplStr += ' class="' + options.fieldClass + '"';
					}
					if (options.readonly != null && options.readonly) {
						tmplStr += ' disabled="disabled"';
					}
					tmplStr += ' style="margin-top: 0.5rem;" /> ';
					if (options.inputFirst) {
						tmplStr += '<label for="' + options.fieldId + '_' + item.get(options.valueField) + '" style="display:block; ' + styleColor + '">';
					}
					tmplStr += item.get(options.optionField) + '</label>';
					if (options.inputFirst) {
						tmplStr += '</div>';
					}
				});
			}

			tmplStr += '</div>';
			tmplStr += '</div>';
			return tmplStr;
		},
		templateHelpers: function () {
			return {
				model: this.model,
				options: {
					fieldId: this.options.fieldId,
					fieldClass: this.options.fieldClass,
					name: this.options.name,
					tooltip: this.options.tooltip,
					label: this.options.label,
					empty: this.options.empty,
					options: this.options.options,
					valueField: this.options.valueField,
					optionField: this.options.optionField,
					readonly: this.options.readonly,
					required: this.options.required,
					inputFirst: this.options.inputFirst,
					cfquestions: this.options.cfquestions,
					cferror: this.options.cferror,
					textColor: this.options.textColor,
					customCss: this.options.customCss,
				}
			}
		},
		toggleReadonly: function (pass) {
			this.$el.find('input[type="checkbox"]').prop('disabled', !this.$el.find('input[type="checkbox"]').prop('disabled'));
		}
	});

	/**
	 * Extend the Item View to make a text field
	 */
	View.TextField = Backbone.Marionette.ItemView.extend({
		className:function() {
			return 'wmapp-textfield-wrapper ' + this.options.customClass;
		},
		template: function (data) {
			var model = data.model;
            var options = data.options;
            var styleColor = '';
            var tmplStr = '';
			if (options.clearButton) {
				tmplStr += '<span class="deleteicon">';
			}

			if (options.label) {
				if(options.textColor){
                    styleColor = 'color:'+ options.textColor;
                }
				tmplStr += '<label style="' + styleColor + '" for="' + options.fieldId + '">' + '<span class="wmapp-input-title">' + options.label + '</span>';
				if (options.required) {
					tmplStr += '<span class="is-required" title="Required">*</span>';
				}
				if (options.tooltip) {
					tmplStr += '<span data-tooltip class="has-tip tip-right" title="' + options.tooltip + '"></span>';
				}
				tmplStr += '</label>';
			}

			if ((options.prefix && options.prefixSize) || (options.postfix && options.postfixSize) || (options.postfixTip && options.postfixSize)) {
				tmplStr += '<div class="row collapse">';
			}

			if (options.prefix && options.prefixSize) {
				tmplStr += '<div class="small-' + options.prefixSize + ' columns"><span class="prefix">' + options.prefix + '</span></div>';
			}

			if ((options.prefix && options.prefixSize) || (options.postfix && options.postfixSize) || (options.postfixTip && options.postfixSize)) {
				var size = 12;
				if (options.prefixSize) {
					size = size - parseInt(options.prefixSize);
				}
				if (options.postfixSize) {
					size = size - parseInt(options.postfixSize);
				}

				tmplStr += '<div class="small-' + size + ' columns">';
			}

			if (options.pretext) {
				tmplStr += '<div class="pretext-div"><span class="pretext">' + options.pretext + '</span>';
			}

			tmplStr += '<input name="' + options.name + '"';

			if(options.doubleClickToEdit){
				tmplStr += ' title="Double Click to edit" ';
			}

			if(options.cfquestions && options.cfquestions != null){
				tmplStr += ' cf-questions="'+ options.cfquestions +'"';
			}
			if(options.cferror && options.cferror != null){
				tmplStr += ' cf-error="'+ options.cferror +'"';
			}
			if (options.clearButton) {
				tmplStr += ' onfocus="document.activeElement.classList.add(\'focused\')" onblur="document.activeElement.classList.remove(\'focused\')"';
			}
			tmplStr += ' autocomplete=' + (options.autocomplete == "on" ? 'on' : 'off');
			tmplStr += ' maxlength="' + options.maxlength + '" type="' + options.fieldType + '" ';
			if (options.minValue !== null && options.minValue !== undefined) {
				tmplStr += ' min="' + options.minValue + '"';
			}
			if (options.maxValue !== null && options.maxValue !== undefined) {
				tmplStr += ' max="' + options.maxValue + '"';
			}
			if (options.readonly) {
				tmplStr += ' readonly="readonly"';
			}
			if (options.disabled || options.doubleClickToEdit) {
				tmplStr += ' disabled="disabled"';
			}
			if(options.autoFocus) {
				tmplStr += 'autofocus';
			}

			if(options.inputPattern) {
				tmplStr += ' pattern="' + options.inputPattern + '" ';
			}
			tmplStr += ' value="';
			if (model && (model.get(options.name) || model.get(options.name) == 0)) {
				if (options.displayValue) {
					tmplStr += options.displayValue(model.get(options.name));
				} else {
					tmplStr += model.get(options.name);
				}

			} else if (options.value && options.value != null) {
				if (options.displayValue) {
					tmplStr += options.displayValue(options.value);
				} else {
					tmplStr += options.value;
				}
			}
			tmplStr += '" id="' + options.fieldId + '"';
			if (options.fieldClass != null) {
				tmplStr += ' class="' + options.fieldClass + '"';
			}
			if (options.placeholder) {
				tmplStr += ' placeholder="' + options.placeholder + '"';
			}
			if (options.tabIndex) {
				tmplStr += ' tabindex="' + options.tabIndex + '"';
			}
			tmplStr += ' />';
			if (options.postLabel) {
				tmplStr += '<span' + (options.postLabelClass ? ' class="' + options.postLabelClass + '"' : '')+ '>' + options.postLabel + '</span>';
			}
			if (options.pretext) {
				tmplStr += '</div>';
			}
			if (options.postfix && options.postfixSize) {
				tmplStr += '</div><div class="small-' + options.postfixSize + ' columns"><span class="postfix">' + options.postfix + '</span></div></div>';
			} else if (options.postfixTip && options.postfixSize) {
				tmplStr += '</div><div class="small-' + options.postfixSize + ' columns"><span class="postfix"><span data-tooltip class="has-tip tip-right" title="' + options.postfixTip + '"></span></span></div></div>';
			}
			if (options.notes) {
				tmplStr += '<span class="notes">' + options.notes + '</span>';
			}
			if (options.clearButton) {
				tmplStr += '<span onclick="var input = this.previousSibling; input.value = \'\'; input.focus();"><img src="/img/close.svg"/></span>';
				tmplStr += '</span>';
			}
			if (options.discardChangesButton) {
				if (options.doubleClickToEdit) {
					tmplStr += '<span class="discard-changes" style="display:none;"><img src="/img/close.svg"/></span>';
				} else {
					tmplStr += '<span class="discard-changes"><img src="/img/close.svg"/></span>';
				}
			}

			return tmplStr;
		},
		onRender: function() {
			this.toggleEmptyClass();
		},
		model: null,
		events: function () {
			this._ensureElement();
			var events =  {
				'change input': 'onInputChange',
				'focus input': 'onInputFocus',
				'blur input': 'onInputBlur',
				'keydown input': 'onKeyDown',
				'keyup input': 'onKeyUp',
				'click input': 'onInputClick',
				'touchstart input': 'onTouchStart',
				'mousedown span.discard-changes': 'onDiscardChanges',
			};
			if(this.options.doubleClickToEdit){
				events['dblclick input'] = 'onDoubleClick';
			}
			return events;
		},
		options: {
			value: null,
			fieldId: null,
			fieldClass: null,
			fieldType: 'text',
			name: null,
			tooltip: null,
			placeholder: null,
			label: null,
			readonly: false,
			disabled: false,
			silentChange: true,
			maxlength: 255,
			notes: null,
			autocomplete: 'off',
			displayValue: false,
			required: false,
			postfix: false,
			postfixSize: 1,
			suffix: false,
			suffixSize: 1,
			clearButton: false,
			discardChangesButton: false, //Discards the changes the have just been made
			doubleClickToEdit: false, //Double Click to edit a disabled TextField
			onKeyUp: null,
			double: false,
			pattern: null,	// Regex against which to validate the field
			cfquestions: null,
			cferror: null,
			textColor: null,
			pretex: false,
			tabIndex: null,
			customClass: '',
			autoFocus: false,
			inputPattern: null,
			minValue: null, // The min value for a numerical input
			maxValue: null, // The max value for a numerical input
		},
		templateHelpers: function () {
			return {
				model: this.model,
				options: this.options
			}
		},
		modelEvents: function () {
			var events = {};
			events['change:' + this.options.name] = 'onModelChange';
			return events;
		},
		onModelChange: function (evt) {
			var newDatum = this.model.get(this.options.name);
			// [GEV-440] if a non-matching value gets through somehow ...
			if (this.options.pattern) {
				if (newDatum != "") {
					var matches = newDatum.match(this.options.pattern);
					if (!matches || matches.length == 0) {
						this.model.set(this.options.name, this.model.previous(this.options.name));
					}
				}
			}
			this.$el.find('input').val(newDatum);
			this.toggleEmptyClass();
		},
		onInputChange: function (evt) {
			if (this.options.fieldClass == 'wmapp-slug') {
				this.$el.find('input').val(WMAPP.Helper.slugify(this.$el.find('input').val()));
			}

			if (this.model) {
				this.model.set(this.options.name, this.$el.find('input').val(), {
					silent: this.options.silentChange
				});
			}

			//Reverts the changes made to the TextField and resets the model
			if(this.cancelEdit){
				this.cancelEdit = false;
				this.model.set(this.options.name, this.model.previous(this.options.name));
			}
			this.toggleEmptyClass();

			this.trigger('trigger:coreTextFieldChange', this.$el.find('input').val());
		},
		onKeyDown: function (evt) {
			// [GEV-440] retain previous value.
			this.previousValue = this.$el.find('input').val();
			this.trigger('trigger:coreTextFieldKeyDown', this.$el.find('input').val());
		},
		onKeyUp: function (evt) {
			if (this.options.fieldClass == 'wmapp-slug') {
				 this.$el.find('input').val(WMAPP.Helper.slugify(this.$el.find('input').val()));
			} else if (this.options.pattern) {
				var matches = this.$el.find('input').val().match(this.options.pattern);
				this.$el.find('input').val(matches && matches.length > 0
					? matches[0] : this.previousValue);
			} else if (this.options.fieldType == 'number') {
				if (this.options.double != true) {
					if (this.$el.find('input').val() != "") {
						this.$el.find('input').val(this.$el.find('input').val().match(/[-+]?[0-9]*\.?[0-9]*/)[0]);
					}
				}
			}
			delete this.previousValue;	// we don't need it any more

			//If Enter is pressed call onInputBlur function
			if(this.options.doubleClickToEdit && event.keyCode == 13){
		        this.onInputBlur(evt);
		    }
			//If ESC is pressed call on onDiscardChanges function
			if(this.options.doubleClickToEdit && event.keyCode == 27){
		        this.onDiscardChanges(evt);
		    }

			if (typeof this.options.onKeyUp == "function") {
				this.options.onKeyUp.apply(this, arguments);
			}

			this.toggleEmptyClass();

			this.trigger('trigger:input:keyup', evt, this.model);
		},
		toggleReadonly: function (pass) {
			this.$el.find('input').prop('readonly', !this.$el.find('input').prop('readonly'));
		},
		onInputFocus: function (evt) {
			evt.preventDefault();
			this.showKeyboard(evt);
			this.toggleEmptyClass();
			this.trigger('trigger:input:focus', evt, this.model);
		},
		onDiscardChanges: function(evt) {
			evt.preventDefault();
			evt.stopPropagation();

			this.cancelEdit = true;

			if(this.options.doubleClickToEdit){
				this.$el.find('span.discard-changes').hide();
				this.$el.find('input').prop("disabled", true);
			}
			if(this.options.discardChangesButton){
				this.onInputChange(evt);
			}
		},
		onInputBlur: function(evt) {
			this.hideKeyboard();
			this.toggleEmptyClass();

			if(this.options.doubleClickToEdit){
				this.$el.find('span.discard-changes').hide();
				this.$el.find('input').prop("disabled", true);
			}

			this.trigger('trigger:input:blur', evt, this.model);
		},
		toggleEmptyClass: function() {
			if (this.$el.find('input').val()) {
				this.$el.find('input').removeClass('empty');
				this.$el.removeClass('empty');
			} else {
				this.$el.find('input').addClass('empty');
				this.$el.addClass('empty');

			}
		},
		onDoubleClick: function(evt){
			this.$el.find('input').prop("disabled", false);
			this.$el.find('span.discard-changes').show();
			this.$el.find('input').focus();
		},
		showKeyboard: function(evt) {
			var that = this;
			var setValue = function(value) {
				that.$el.find('input').val(value);

				if (that.model) {
					that.model.set(that.options.name, value, {
						silent: that.options.silentChange
					});
				}

				that.toggleEmptyClass.call(that);

				that.trigger('trigger:coreTextFieldChange', value);
				that.trigger('trigger:input:change', evt, that.model);
				this.showingKeyboard = false;
			};
			if (this.options.keyboardType && window.CustomKeyboard) {
				if (this.showingKeyboard) {
					return;
				}
				this.showingKeyboard = true;
				this.$el.find('input').focus().addClass('custom-keyboard');
				CustomKeyboard.open(this.$el.find('input').val().replace(/\|/g, ''), this.options.keyboardType, function (value) {
					that.$el.find('input').val(value);

					if (that.model) {
						that.model.set(that.options.name, value, {
							silent: that.options.silentChange
						});
					}

					that.toggleEmptyClass.call(that);

					that.trigger('trigger:coreTextFieldChange', value);
					that.trigger('trigger:input:change', evt, that.model);
				}, function (value) {
					that.hideKeyboard();
				});
			} else if (window.DateTimePicker && !window.device) {
				/*
				 * Both iOS and Android do a picker automatically when <input type="date"> or <input type="time">.
				 * No further work needed.
				 */
				if (this.showingKeyboard) {
					return;
				}
				this.showingKeyboard = true;
				if (this.options.fieldType == 'time') {
					var initialHour = 0;
					var initialMinute = 0;
					if (that.model && that.model.get(that.options.name)) {
						var value = that.model.get(that.options.name);
						initialHour = parseInt(value.split(':')[0]);
						initialMinute = parseInt(value.split(':')[1]);
					}
					DateTimePicker.showTimePicker(initialHour, initialMinute, function(time) {
						var value = WMAPP.Helper.padLeft(time.hour, 2) + ':' + WMAPP.Helper.padLeft(time.minute, 2);
						setValue(value);
					}, function(error) {
						console.error('TimePicker Error', error);
						this.showingKeyboard = false;
					});
				} else if (this.options.fieldType == 'date') {
					var initialYear = moment().year();
					var initialMonth = moment().month();
					var initialDay = moment().date();
					if (that.model && that.model.get(that.options.name)) {
						var value = that.model.get(that.options.name);
						initialYear = parseInt(value.split('-')[0]);
						initialMonth = parseInt(value.split('-')[1])-1;
						initialDay = parseInt(value.split('-')[2]);
						console.error(value, initialYear, initialMonth, initialDay);
					}
					DateTimePicker.showDatePicker(initialYear, initialMonth, initialDay, function(date) {
						var value = date.year + '-' + WMAPP.Helper.padLeft(date.month+1, 2) + '-' + WMAPP.Helper.padLeft(date.day, 2);
						setValue(value);
					}, function(error) {
						console.error('DatePicker Error', error);
						this.showingKeyboard = false;
					});
				}
			}
		},
		hideKeyboard: function() {
			if (this.showingKeyboard) {
				this.showingKeyboard = false;
				if (this.options.keyboardType && window.CustomKeyboard) {
					this.$el.find('input').blur().removeClass('custom-keyboard');
					CustomKeyboard.close();
				}
			}
		}
	});

	/**
	 * Extend the TextField to make a Password field
	 */
	View.Password = View.TextField.extend({
		template: _.template(
			'<label for="<%=options.fieldId%>"><%=options.label%><% if (options.required) { %><span class="is-required" title="Required">*</span><% } %><% if (options.tooltip) ' +
			'{ %><span data-tooltip class="has-tip tip-right" title="<%=options.tooltip%>"></span><% } ' +
			'%></label><input name="<%=options.name%>" maxlength="<%=options.maxlength%>" type="password" placeholder="<%=options.placeholder%>"' +
			'<% if (options.readonly) { %> disabled="disabled"<% } %> ' +
			'value="<% if (model && model.get(options.name)) { %><%=model.get(options.name)%><% } %>" ' +
			'id="<%=options.fieldId%>"<% if (options.fieldClass != null) { %> class="<%=options.fieldClass%>"<% } %>/>'),
		toggleReadonly: function (pass) {
			this.$el.find('input').prop('disabled', !this.$el.find('input').prop('disabled'));
		}
	});

	/**
	 * Extend the Item View to make a text field
	 */
	View.CheckBox = Backbone.Marionette.ItemView.extend({
		template: function(data) {
			var options = data.options;
			var model = data.model;
			var styleColor = '';
			var tmplStr = '';

			if (!options.inputFirst) {
				if(options.textColor){
					styleColor = 'color:'+options.textColor;
				}
				tmplStr += '<label style="' + styleColor + '" for="'+options.tooltip+ '"><span class="wmapp-input-title">' + options.label + '</span>';

				if (options.required) {
					tmplStr += '<span class="is-required" title="Required">*</span>';
				}
				if (options.tooltip) {
					tmplStr += '<span data-tooltip class="has-tip tip-right" title="'+ options.tooltip +'"></span>';
				}
				tmplStr += '</label>';
			}
			tmplStr += '<input name="' + options.name + '" type="hidden" value="0" id="' + options.fieldId + '_"/>';
			tmplStr += '<input name="' + options.name + '" type="checkbox" value="1" id="' + options.fieldId + '"';
			if (options.readonly != null && options.readonly) {
				tmplStr += ' disabled="disabled"' ;
			}
			if (options.fieldClass != null) {
				tmplStr += ' class="' + options.fieldClass + '"';
			}
			if (model && model.get(options.name)) {
				tmplStr += ' checked="checked"';
			}
			tmplStr += '/>';
			if (options.inputFirst) {
				tmplStr += '<label for="<%=options.fieldId%>">' + options.label;

				if (options.required) {
					tmplStr += '<span class="is-required" title="Required">*</span>';
				}
				if (options.tooltip) {
					tmplStr += '<span data-tooltip class="has-tip tip-right" title="<%=options.tooltip%>"></span>';
				}
				tmplStr += '</label>';
			}
			return tmplStr;
		},
		model: null,
		events: function () {
			this._ensureElement();
			var events = {};
			events['change input[type="checkbox"]'] = 'onInputChange';
			return events;
		},
		options: {
			fieldId: null,
			fieldClass: null,
			name: null,
			tooltip: null,
			label: null,
			readonly: false,
			silentChange: true,
			required: false,
			inputFirst: false,
			textColor: null
		},
		templateHelpers: function () {
			return {
				model: this.model,
				options: this.options
			}
		},
		modelEvents: function () {
			var events = {};
			events['change:' + this.options.name] = 'onModelChange';
			return events;
		},
		onModelChange: function (evt) {
			this.render();
		},
		onInputChange: function (e) {
			var checkbox = $(e.target);
			if (checkbox.prop('checked')) {
				if (this.options.confirmCheck && !confirm(this.options.confirmCheck)) {
					checkbox.prop('checked', false);
				} else {
					if (this.model) {
						checkbox.attr('checked', 'checked');
						this.model.set(this.options.name, 1, {
							silent: this.options.silentChange
						});
					}
				}
			} else {
				if (this.options.confirmUnCheck && !confirm(this.options.confirmUnCheck)) {
					checkbox.prop('checked', true);
				} else {
					if (this.model) {
						checkbox.removeAttr('checked');
						this.model.set(this.options.name, 0, {
							silent: this.options.silentChange
						});
					}
				}
			}
			this.trigger('trigger:coreCheckBoxChange');
			this.trigger('trigger:input:change', e, this.model);
		},
		toggleReadonly: function (pass) {
			this.$el.find('input[type="checkbox"]').prop('disabled', !this.$el.find('input[type="checkbox"]').prop('disabled'));
		}
	});

	/**
	 * Extend the Item View to make a text area
	 */
	View.MarkdownArea = Backbone.Marionette.ItemView.extend({
		initialize: function() {
			this.options.inputId = this.options.fieldId +'-file-upload';
		},
		template: function (data) {
			var model = data.model;
			var options = data.options;
			var styleColor = '';
			var htmlStr = '';
			// Here is an hidden file uploader for use in uploading images into the markdown
			if(options.canUpload) {
				htmlStr += '<input class="hide" type="file" accept=".jpg,.png" id="'+ options.inputId +'"/>';
			}
			if (options.label) {
				if(options.textColor){
					styleColor = 'color:'+options.textColor;
				}
				htmlStr += '<label style="' + styleColor + '" for="' + options.fieldId + '">' + '<span class="wmapp-input-title">' + options.label + '</span>';
				if (options.required) {
					htmlStr += '<span class="is-required" title="Required">*</span>';
				}
				if (options.tooltip) {
					htmlStr += '<span data-tooltip class="has-tip tip-right" title="' + options.tooltip + '"></span>';
				}
				htmlStr += '</label>';
			}

			htmlStr += '<textarea name="' + options.name + '" rows="' + options.rows + '"';
			if (options.cfquestions) {
				htmlStr += ' cf-questions="'+ options.cfquestions +'"';
			}
			if (options.cferror) {
				htmlStr += ' cf-error="'+ options.cferror +'"';
			}
			if (options.readonly) {
				htmlStr += ' disabled="disabled"'
			}
			htmlStr += ' id="' + options.fieldId + '"';
			if (options.fieldClass != null) {
				htmlStr += ' class="' + options.fieldClass + '"';
			}
			htmlStr += '>';
			if (model && model.get(options.name)) {
				htmlStr += model.get(options.name);
			} else if (options.placeholder) {
				htmlStr += options.placeholder;
			}
			htmlStr += '</textarea>';
			return htmlStr;
		},
		model: null,
		events: function () {
			this._ensureElement();
			var events = {};
			events['blur textarea#' + this.options.fieldId] = 'onInputChange';
			events['keyup textarea#' + this.options.fieldId] = 'onKeyup';
			if(this.options.canUpload) {
				events['change input#' + this.options.inputId] =  'onFileChosen';
			}
			return events;
		},
		options: {
			fieldId: null,
			fieldClass: null,
			name: null,
			tooltip: null,
			placeholder: null,
			label: null,
			rows: 5,
			silent: true,
			readonly: false,
			required: false,
			cfquestions: null,
            cferror: null,
			textColor: null, 
			isUploading: false,
			canUpload: false
		},
		templateHelpers: function () {
			return {
				model: this.model,
				options: this.options
			}
		},
		onKeyup: function(e) {
			this.trigger('trigger:onMarkdownAreaChange', this.simplemde.value());
		},
		onInputChange: function (e) {
			if (this.model) {
				this.model.set(this.options.name, this.simplemde.value(), {
					silent: this.options.silent,
				});
			}

			this.trigger('trigger:coreMarkdownAreaChange', this.simplemde.value());
		},
		onFileChosen: function(e) {
			this.options.file = this.$el.find('#' + this.options.inputId)[0].files[0];
			if(!this.isUploading && (this.options.file.type === 'image/png' || this.options.file.type === 'image/jpeg')) {
				this.isUploading = true;
				this.trigger('trigger:coreMarkdownAreaStartImageUpload', this.options.file);
			}
		}, 
		imageUploaded: function(url) {
			this.isUploading = false;
			if(url != null) {
				// set the drawtext for image temporarily (sort of a workaround to actually manipulating editor)
				var imageInsertText = this.simplemde.options.insertTexts["image"];
				this.simplemde.options.insertTexts["image"] = ["![](" + url + ")", ""];
				this.simplemde.drawImage();
				this.simplemde.options.insertTexts["image"] = imageInsertText;		
			}
		},
		modelEvents: function () {
			var events = {};
			events['change:' + this.options.name] = 'onModelChange';
			return events;
		},
		onModelChange: function (evt) {
			this.$el.find('textarea').val(this.model.get(this.options.name));
		},
		toggleReadonly: function (pass) {
			this.$el.find('textarea').prop('disabled', !this.$el.find('textarea').prop('disabled'));
		},
		addImage: function(that) {
			$('#'+ that.options.fieldId +'-file-upload').click();
		},
		onShow: function () {
			var that = this;
			this.simplemde = new SimpleMDE({ 
				element: this.$el.find('textarea')[0], 
				showIcons: ["code", "table"],
			});

			// If canUpload set, override the image function to allow choosing of image
			if(this.options.canUpload) {
				this.simplemde.toolbar.find(function(x) {
					return x.name == "image";
				}).action = function() {
					that.addImage(that);
				}
			}
			
			that.simplemde.codemirror.on("change", function(){
				that.onInputChange();
			});

			// Handle drag and drop events
			that.simplemde.codemirror.on("dragstart", function(instance, event){
				that.trigger('trigger:coreMarkdownAreaDragStart', event);
			});
			that.simplemde.codemirror.on("dragenter", function(instance, event){
				that.trigger('trigger:coreMarkdownAreaDragEnter', event);
			});
			that.simplemde.codemirror.on("dragover", function(instance, event){
				that.trigger('trigger:coreMarkdownAreaDragOver', event);
			});
			that.simplemde.codemirror.on("dragleave", function(instance, event){
				that.trigger('trigger:coreMarkdownAreaDragLeave', event);
			});
			that.simplemde.codemirror.on("drop", function(instance, event){
				event.preventDefault();
				event.stopPropagation();
				that.trigger('trigger:coreMarkdownAreaDrop', event);
			});
		}
	});

	/**
	 * Extend the Item View to make a text area
	 */
	View.TextArea = Backbone.Marionette.ItemView.extend({
		template: function (data) {
			var model = data.model;
			var options = data.options;
			var styleColor = '';
			var htmlStr = '';
			if (options.label) {
				if(options.textColor){
					styleColor = 'color:'+options.textColor;
				}
				htmlStr += '<label style="' + styleColor + '" for="' + options.fieldId + '">' + '<span class="wmapp-input-title">' + options.label + '</span>';
				if (options.required) {
					htmlStr += '<span class="is-required" title="Required">*</span>';
				}
				if (options.tooltip) {
					htmlStr += '<span data-tooltip class="has-tip tip-right" title="' + options.tooltip + '"></span>';
				}
				htmlStr += '</label>';
			}

			htmlStr += '<textarea name="' + options.name + '" rows="' + options.rows + '"';
			if (options.cfquestions) {
				htmlStr += ' cf-questions="'+ options.cfquestions +'"';
			}
			if (options.cferror) {
				htmlStr += ' cf-error="'+ options.cferror +'"';
			}
			if (options.readonly) {
				htmlStr += ' disabled="disabled"'
			}
			htmlStr += ' maxlength="' + options.maxlength + '"';
			htmlStr += ' id="' + options.fieldId + '"';
			if (options.fieldClass != null) {
				htmlStr += ' class="' + options.fieldClass + '"';
			}
			if (options.placeholder) {
				htmlStr += ' placeholder="' + options.placeholder + '"';
			}
			htmlStr += '>';
			if (model && model.get(options.name)) {
				htmlStr += model.get(options.name);
			}
			htmlStr += '</textarea>';
			return htmlStr;
		},
		model: null,
		events: function () {
			this._ensureElement();
			var events = {};
			events['blur textarea#' + this.options.fieldId] = 'onInputChange';
			events['keyup textarea#' + this.options.fieldId] = 'onKeyup';
			return events;
		},
		options: {
			fieldId: null,
			fieldClass: null,
			name: null,
			tooltip: null,
			placeholder: null,
			label: null,
			rows: 5,
			wysiwyg: false,
			silent: true,
			readonly: false,
			required: false,
			cfquestions: null,
            cferror: null,
			textColor: null
		},
		templateHelpers: function () {
			return {
				model: this.model,
				options: this.options
			}
		},
		onKeyup: function(e) {
			this.trigger('trigger:onTextAreaChange', this.$el.find('textarea').val());
		},
		onInputChange: function (e) {
			if (this.model) {
				this.model.set(this.options.name, this.$el.find('textarea').val(), {
					silent: this.options.silent,
				});
			}

			this.trigger('trigger:coreTextAreaChange', this.$el.find('textarea').val());
		},
		modelEvents: function () {
			var events = {};
			events['change:' + this.options.name] = 'onModelChange';
			return events;
		},
		onModelChange: function (evt) {
			this.$el.find('textarea').val(this.model.get(this.options.name));
			if (this.options.fieldClass == "wmapp-wysiwyg") {
				this.$el.find('#' + this.options.fieldId).data("wysihtml5").editor.setValue(this.model.get(this.options.name));
			}
		},
		toggleReadonly: function (pass) {
			this.$el.find('textarea').prop('disabled', !this.$el.find('textarea').prop('disabled'));
		},
		onShow: function () {
			var that = this;
			if (this.options.wysiwyg === true || _.isObject(this.options.wysiwyg)) {
				var _userSetting = _.isObject(this.options.wysiwyg) ? this.options.wysiwyg : {};
				var _setting = _.pick(_userSetting, _.keys(View.TextArea.defaultWysiwygSettings));
				_setting['name'] = this.options.name;
				_setting = _.defaults(_setting, View.TextArea.defaultWysiwygSettings);
				if ((WMAPP.user instanceof Backbone.Model && WMAPP.user.get('isGod')) || WMAPP.user.isGod) {
					_setting["html"] = true;
				}
				// new and store the wysiwyg jqueryObject
				this.wysiwygEditor = this.$el.find('textarea').wysihtml5(_setting);
				// bind the blur event
				this.wysiwygEditor.data('wysihtml5').editor.on("blur", function() {
					that.onInputChange();
				});
			}
		}
	});

	View.TextArea.defaultWysiwygSettings = {
		useLineBreaks: false,
		'font-styles': true,
		emphasis: true,
		lists: true,
		html: false,
		link: true,
		image: true,
		color: false
	};

	/**
	 * Extend the Item View to make a hidden field
	 */
	View.HiddenField = Backbone.Marionette.ItemView.extend({
		template: function (data) {
			var model = data.model;
			var options = data.options;
			var htmlStr = '';
			htmlStr += '<input name="' + options.name + '" type="hidden" value="';
			if (model && model.get(options.name)) {
				htmlStr += model.get(options.name);
			} else if (options.value && options.value != null) {
				htmlStr += options.value;
			}
			htmlStr += '" id="' + options.fieldId + '"/>';
			return htmlStr;
		},
		model: null,
		events: function () {
			this._ensureElement();
			var events = {};
			events['change input[type="hidden"]'] = 'onInputChange';
			return events;
		},
		options: {
			fieldId: null,
			name: null,
		},
		templateHelpers: function () {
			return {
				model: this.model,
				options: this.options
			}
		},
		onInputChange: function () {
			if (this.model) {
				this.model.set(this.options.name, this.$el.find('input').val(), {
					silent: true
				});
			}

			this.trigger('trigger:coreHiddenFieldChange', this.$el.find('input').val());
		},
		modelEvents: function () {
			var events = {};
			events['change:' + this.options.name] = 'onModelChange';
			return events;
		},
		onModelChange: function (evt) {
			this.$el.find('input').val(this.model.get(this.options.name));
		},
	});

	/**
	 * Extend the Item View to make a combo box
	 */
	View.ComboCheckBox = Backbone.Marionette.LayoutView.extend({
		template: null,
		initialize: function () {
			var tmplStr = '<div class="wmapp-combo-checkboxes-combo"></div>' +
				'<div class="wmapp-combo-checkboxes-checkboxes"></div>';

			this.template = _.template(tmplStr);
		},
		regions: {
			comboboxField: '.wmapp-combo-checkboxes-combo',
			checkboxesField: '.wmapp-combo-checkboxes-checkboxes',
		},
		options: {
			fieldId: null,
			fieldClass: null,
			name: null,
			tooltip: null,
			empty: null,
			options: null,
			valueField: 'id',
			optionField: 'name',
			label: null,
			sortBy: null,
			readonly: false,
			textColor: null
		},
		onRender: function () {
			var comboboxField = new WMAPP.Extension.View.ComboCheckBoxComboBox({
				model: this.model,
				fieldId: this.options.fieldId,
				name: this.options.name,
				tooltip: this.options.tooltip,
				label: this.options.label,
				options: this.options.options,
				optionField: 'name',
				empty: this.options.empty,
			});

			var checkboxesField = new WMAPP.Extension.View.ComboCheckBoxCheckBoxes({
				model: this.model,
				collection: this.model.get('_' + this.options.name),
				options: this.options.options,
				fieldId: this.options.fieldId,
				fieldClass: this.options.fieldClass,
				name: this.options.checkboxesOptionsName,
				valueField: 'id',
				optionField: this.options.checkboxesOptionOptionField,
			});

			this.comboboxField.show(comboboxField);
			this.checkboxesField.show(checkboxesField);
		},
	});

	/**
	 * Extend the Item View to make a combo box
	 */
	View.ComboCheckBoxComboBox = WMAPP.Extension.View.ComboBox.extend({
		template: _.template('<label for="<%=options.fieldId%>"><%=options.label%><% if (options.tooltip) { %><span data-tooltip class="has-tip tip-right" title="<%=options.tooltip%>"></span><% } %><select name="<%=options.name%>" id="<%=options.fieldId%>"<% if (options.readonly != null && options.readonly) { %> disabled="disabled"<% } %><% if (options.fieldClass != null) { %> class="<%=options.fieldClass%>"<% } %>><% if (options.empty != null) { %><option value="<%= options.empty.value %>"><%= options.empty.option %></option><% } %><% if (_.isArray(options.options)) { %><% _.each(options.options, function(item){ %><option value="<%= item.get(options.valueField) %>"<% if (model !== null && model.get(options.name) != null && model.get(options.name) == item.get(options.valueField)) { %> selected="selected"<% } %>><%= item.get(options.optionField) %></option><% }); %><% } %></select></label>'),
		events: function () {
			var events = {};
			events['change #' + this.options.fieldId + 'ComboBox'] = 'onInputChange';
			return events;
		},
		options: {
			fieldId: null,
			fieldClass: null,
			name: null,
			tooltip: null,
			empty: null,
			options: null,
			valueField: 'id',
			optionField: 'name',
			label: null,
			sortBy: null,
			readonly: false,
			textColor: null
		},
		templateHelpers: function () {
			var selectOptions = null;
			if (this.options.options) {
				if (this.options.sortBy) {
					selectOptions = this.options.options.sortBy(this.options.sortBy);
				} else {
					selectOptions = this.options.options.toArray();
				}
			}
			return {
				model: this.model,
				options: {
					fieldId: this.options.fieldId + 'ComboBox',
					fieldClass: this.options.fieldClass,
					name: this.options.name,
					tooltip: this.options.tooltip,
					readonly: this.options.readonly,
					label: this.options.label,
					empty: this.options.empty,
					options: selectOptions,
					valueField: this.options.valueField,
					optionField: this.options.optionField,
					textColor: this.options.textColor,
				}
			}
		},
		onInputChange: function () {
			if (this.model) {
				var selectedCollection = this.model.get('_' + this.options.name);
				var selectedItems = this.model.get(this.options.name);
				var id = this.$el.find('#' + this.options.fieldId + 'ComboBox').val();
				if (id != '') {
					selectedCollection.add(this.options.options.get(id));
					selectedItems.push(id);

					this.model.set(this.options.name, selectedItems);

					this.$el.find('#' + this.options.fieldId + 'ComboBox option[value="' + id + '"]').attr('disabled', 'disabled');
				}
			}

		},
		initialize: function () {
			if (this.options.options) {
				this.listenTo(this.options.options, 'sync', this.render);
			}
		},
	});

	View.ComboCheckBoxCheckBoxesItem = WMAPP.Extension.View.ItemView.extend({
		tagName: 'tr',
		template: null,
		events: function () {
			var events = {};
			events['change .' + this.options.fieldClass] = 'onInputChange';
			return events;
		},
		initialize: function (options) {
			var tmplStr = '<td style="text-align:left">' + this.model.get('name');
			if (this.options.options.get(this.model.get('id')) && this.options.options.get(this.model.get('id')).get('_' + this.options.name).models != null) {
				var self = this;
				tmplStr += '<div>';
				_.each(this.options.options.get(this.model.get('id')).get('_' + this.options.name).models, function (item) {
					tmplStr += '<input name="' + self.options.name + '" type="checkbox" value="' + item.get(self.options.valueField) + '" id="' + self.options.fieldId + '_' + item.get(self.options.valueField) + '"';
					if (self.options.fieldClass != null) {
						tmplStr += ' class="' + self.options.fieldClass + '"';
					}
					if (self.options.saveModel !== null && self.options.saveModel.get(self.options.name) != null && self.options.saveModel.get(self.options.name).indexOf(item.get(self.options.valueField)) >= 0) {
						tmplStr += ' checked="checked"';
					}
					tmplStr += ' /><label style=" ' + styleColor + '" for="right-label" class="right inline">' + item.get(self.options.optionField) + '</label><br />';
				});
				tmplStr += '</div>';
			}

			tmplStr += '</td><td style="text-align: right; vertical-align: top;"><a class="wmapp-delete-button button small edit" data-id="' + this.model.get('id') + '" title="Are you sure?">Delete</a></td>';
			this.template = _.template(tmplStr);
		},
		onInputChange: function (e) {
			if (this.options.saveModel) {
				var selectedCollection = this.options.saveModel.get('_' + this.options.name);
				var selectedItems = this.options.saveModel.get(this.options.name);

				var checkbox = $(e.target);
				var id = checkbox.attr('value');
				if (checkbox.prop('checked')) {
					selectedCollection.add(this.model.get('_' + this.options.name).get(id));
					selectedItems.push(id);

					this.options.saveModel.set(this.options.name, selectedItems);
				} else {
					var model = selectedCollection.get(id);
					selectedItems = _.without(selectedItems, id);
					selectedCollection.remove(model);

					this.options.saveModel.set(this.options.name, selectedItems);
				}
			}
		},
		triggers: {
			"click .wmapp-delete-button": 'trigger:comboChockboxesItemRemoveRow'
		}
	});
	View.ComboCheckBoxCheckBoxes = WMAPP.Extension.View.CompositeView.extend({
		tagName: "table",
		className: "wmapp-table",
		id: "thisId",
		template: _.template('<tbody></tbody>'),
		childView: View.ComboCheckBoxCheckBoxesItem,
		childViewContainer: "tbody",
		childViewOptions: function () {
			return {
				saveModel: this.model,
				options: this.options.options,
				fieldId: this.options.fieldId + 'ComboBox',
				fieldClass: this.options.fieldClass,
				name: this.options.name,
				valueField: this.options.valueField,
				optionField: this.options.optionField,
			}
		},
		initialize: function () {
			this.on('childview:trigger:comboChockboxesItemRemoveRow', this.removeRow);
		},
		removeRow: function (childView, args) {
			this.collection.remove(args.model);
			this.$el.find('#' + this.options.fieldId + 'ComboBox option[value="' + args.model.get('id') + '"]').removeAttr('disabled');
		},
	});

	/**
	 * Extend the Item View to make a date time picker
	 */
	View.DatePicker = Backbone.Marionette.ItemView.extend({
		template: function(data) {
			var options = data.options;
			var model = data.model;
			var styleColor = '';
			var tmplStr = '';
			if(options.textColor){
				styleColor = 'color:'+options.textColor;
			}
			tmplStr += '<label style="' + styleColor + '" for="' + options.fieldId+ '">' +  '<span class="wmapp-input-title">' + options.label + '</span>';
			if (options.required) {
				tmplStr += '<span class="is-required" title="Required">*</span>';
			}
			if (options.tooltip) {
				tmplStr += '<span data-tooltip class="has-tip tip-right" title="' + options.tooltip+ '"></span>';
			}
			tmplStr += '</label><input';
			if (options.readonly) {
				tmplStr += ' readonly';
			}
			if (options.disabled) {
				tmplStr += ' disabled="disabled"';
			}
			tmplStr += ' name="' + options.name+ '" maxlength="' + options.maxlength+ '" type="text" value="' + data.initialDate + '" id="' + options.fieldId+ '" class="wmapp-date-picker-input ' + options.fieldClass+ '"';
			if (options.placeholder != null) {
				tmplStr += 'placeholder="' + options.placeholder+ '"';
			}
			tmplStr += '/>';

			return tmplStr;
		},
		templateHelpers: function(){
            return {
				model: this.model,
				options: this.options,
				initialDate: this.getInitialDate(),
			}
		},
		model: null,
		options: {
			fieldId: null,
			fieldClass: null,
			name: null,
			tooltip: null,
			placeholder: null,
			label: null,
			dateFormat: 'dd-mm-yyyy',
			closeButton: false,
			autoclose: true,
			weekStart: 0,
			maxlength: 255,
			required: false,
			onInputChange: null,
			readonly: false,
			disabled: false,
			silentChange: true,
			startView: 'month',
			minView: 'month',
			maxView: 'decade',
			dateType: 'date',
			useMobile: true,
			titleText: null,
			textColor: null,
			endDate: null,
			startDate: null,
			initialDate: null,
			disableKeyPress: false,
            minDate: null,
            maxDate: null
		},
		events: function () {
			this._ensureElement();
			var events = {};
			events['change input.wmapp-date-picker-input'] = 'onInputChange';
			events['click input.wmapp-date-picker-input'] = 'onInputClick';
			events['keydown input.wmapp-date-picker-input'] = 'onKeyDown';
			return events;
		},
		ui: {
			"textfield": "input"
		},
		modelEvents: function () {
			var events = {};
			events['change:' + this.options.name] = 'onModelChange';
			return events;
		},
		onModelChange: function (evt) {
			this.$el.find('input').val(this.model.get(this.options.name));
		},
		onKeyDown: function (e){
			if (this.options.disableKeyPress) {
				e.stopPropagation();
				e.preventDefault();				
				return false;	
			}
		},
		onInputChange: function () {
			if (typeof this.options.onInputChange == "function") {
				this.options.onInputChange(this.options.name, this.$el.find('input').val(), this.model);
			} else {
				if (this.model) {
					this.model.set(this.options.name, this.$el.find('input').val(), {
						silent: this.options.silentChange
					});
				}
			}
			this.trigger('trigger:coreDatePickerChange', this.$el.find('input').val());
		},
		onInputClick: function (e) {

			// if we're in cordova, show a native datepicker
			if (this.options.useMobile && WMAPP.cordovaStarted) {
				e.stopPropagation();
				e.preventDefault();
				var that = this;
				var date = new Date();
				if (this.model && this.model.get(this.options.name)) {
                    date = moment(this.model.get(this.options.name), this.options.dateFormat, true);
					date = date.isValid() ? date.toDate() : new Date();
				}
                var options = {
					date: date,                    
                    titleText: this.options.titleText,
					androidTheme: datePicker.ANDROID_THEMES.THEME_DEVICE_DEFAULT_DARK,
					mode: this instanceof View.DateTimePicker ? 'datetime' : 'date',
				};
                //specify iOS minDate and maxDate if options arguments exists otherwise device will through exception if null  
                if(this.options.minDate){
                    options.minDate = this.options.minDate;
                }                
                if(this.options.maxDate){ //in some case we may only need to restrict future date scrolling 
					options.maxDate = this.options.maxDate;
                }
				datePicker.show(options, function (date) {
                    if (date === undefined) { return; } //bugfix 20190306 after setting a different time than now() > save > datetime picker > cancel > input field reverts to now()
                    
                    date = moment(date).format(that.options.dateFormat);
					that.model.set(that.options.name, date, {
						silent: that.options.silentChange
					});
					that.$el.find('#' + that.options.fieldId).val(date);
				}, function (error) {
					console.error(error);
				});
			}
		},
		onRender: function () {
			// add the foundation datepicker if we're in the browser
			if (!WMAPP.cordovaStarted || !this.options.useMobile) {
				this.ui.textfield.fdatepicker({
					initialDate: this.getInitialDate(),
					format: this.options.dateFormat,
					dateType: this.options.dateType,
					weekStart: this.options.weekStart,
					closeButton: this.options.closeButton,
					autoclose: this.options.autoclose,
					pickTime: this.options.dateType == 'datetime',
					startView: this.options.startView, // 'decade' = 4, 'year' = 3, 'month' = 2, 'day' = 1, 'hour' = 0
					minView: this.options.minView, // 'decade' = 4, 'year' = 3, 'month' = 2, 'day' = 1, 'hour' = 0
					maxView: this.options.maxView, // 'decade' = 4, 'year' = 3, 'month' = 2, 'day' = 1, 'hour' = 0
					startDate: this.options.startDate,
					endDate: this.options.endDate
				});
			}
			// if we're in cordova, use upper case date format
			if (this.options.useMobile && WMAPP.cordovaStarted) {
                this.options.dateFormat = this.options.dateFormat.toUpperCase();
			}
		},
		onDestroy: function() {
			this.ui.textfield.fdatepicker('remove');
		},
		getInitialDate: function() {
			if (this.options.initialDate) {
				if (typeof this.options.initialDate == "function") {
					return this.options.initialDate(this.options.model);
				} else {
					return this.options.initialDate
				}
			} else if (this.model && this.model.get(this.options.name)) {
				return this.model.get(this.options.name)
			}
			else {
				return '';
			}			
		}
	});

	/**
	 * Extend the DatePicker for the DateTimePicker
	 */
	View.DateTimePicker = WMAPP.Extension.View.DatePicker.extend({
		options: {
			fieldId: null,
			fieldClass: null,
			name: null,
			tooltip: null,
			placeholder: null,
			label: null,
			dateFormat: (window.cordova ? 'DD-MM-YYYY HH:mm' : 'dd-mm-yyyy hh:ii:ss'),
			closeButton: false,
			autoclose: true,
			weekStart: 0,
			maxlength: 255,
			required: false,
			startView: 'month',
			minView: 'hour',
			maxView: 'decade',
			dateType: 'datetime',
			useMobile: true,
			readonly: false,
			silentChange: true,
		},
		onInputChange: function () {
			if (typeof this.options.onInputChange == "function") {
				this.options.onInputChange(this.options.name, this.$el.find('input').val(), this.model);
			} else {
				if (this.model) {
					this.model.set(this.options.name, this.$el.find('input').val(), {
						silent: this.options.silentChange
					});
				}
			}
			this.trigger('trigger:coreDatePickerChange', this.$el.find('input').val());
		},
		onRender: function () {
			// add the foundation datepicker if we're in the browser
			if (!WMAPP.cordovaStarted || !this.options.useMobile) {
				this.ui.textfield.fdatepicker({
					initialDate: this.model ? this.model.get(this.options.name) : '',
					format: this.options.dateFormat,
					dateType: this.options.dateType,
					weekStart: this.options.weekStart,
					closeButton: this.options.closeButton,
					autoclose: this.options.autoclose,
					pickTime: this.options.dateType == 'datetime',
					startView: this.options.startView, // 'decade' = 4, 'year' = 3, 'month' = 2, 'day' = 1, 'hour' = 0
					minView: this.options.minView, // 'decade' = 4, 'year' = 3, 'month' = 2, 'day' = 1, 'hour' = 0
					maxView: this.options.maxView, // 'decade' = 4, 'year' = 3, 'month' = 2, 'day' = 1, 'hour' = 0
				});

				if (this.options.readonly !== undefined && this.options.readonly) {
					this.ui.textfield.prop('disabled', true);
				}
			}
		},
	});


	/**
	 * Extend the Item View to make a time picker
	 */
	View.TimePicker = Backbone.Marionette.ItemView.extend({
		template: _.template('<label for="<%=options.fieldId%>"><%=options.label%><% if (options.required) { %><span class="is-required" title="Required">*</span><% } %><% if (options.tooltip) { %><span data-tooltip class="has-tip tip-right" title="<%=options.tooltip%>"></span><% } %></label><input <% if (options.readonly) { %> readonly <% } if (options.disabled) { %> disabled="disabled"<% } %> name="<%=options.name%>" maxlength="<%=options.maxlength%>" type="time" value="<% if (model && model.get(options.name)) { %><%=model.get(options.name)%><% } %>" id="<%=options.fieldId%>" class="wmapp-date-picker-input <%=options.fieldClass%>"<% if (options.placeholder != null) { %> placeholder="<%=options.placeholder%>"<% } %>/>'),
		model: null,
		options: {
			fieldId: null,
			fieldClass: null,
			name: null,
			tooltip: null,
			placeholder: null,
			label: null,
			maxlength: 255,
			required: false,
			onInputChange: null,
			readonly: false,
			disabled: false,
			startView: 'day',
			minView: 'hour',
			maxView: 'day',
			dateFormat: 'HH:mm',
			dateType: 'time',
			silentChange: true,
			titleText: null,
			textColor: null,
            minDate: null,
            maxDate: null
		},
		events: function () {
			this._ensureElement();
			var events = {};
			events['change input.wmapp-date-picker-input'] = 'onInputChange';
			events['click input.wmapp-date-picker-input'] = 'onInputClick';
			return events;
		},
		templateHelpers: function () {
			return {
				model: this.model,
				options: this.options
			}
		},
		modelEvents: function () {
			var events = {};
			events['change:' + this.options.name] = 'onModelChange';
			return events;
		},
		onModelChange: function (evt) {
			this.$el.find('input').val(this.model.get(this.options.name));
		},
		onInputChange: function () {
				if (typeof this.options.onInputChange == "function") {
					this.options.onInputChange(this.options.name, this.$el.find('input').val(), this.model);
				} else {
					if (this.model) {
						this.model.set(this.options.name, this.$el.find('input').val(), {
							silent: this.options.silentChange
						});
					}
				}
				this.trigger('trigger:coreDatePickerChange', this.$el.find('input').val());

		},
		onInputClick: function (e) {
			// if we're in cordova, show a native datepicker
			if (WMAPP.cordovaStarted && device && device.platform == 'Android') {
				e.preventDefault();
				e.stopPropagation();
				var that = this;
				var date = new Date();
				if (this.model && this.model.get(this.options.name)) {
					date = moment(this.model.get(this.options.name), this.options.dateFormat, true);
					date = date.isValid() ? date.toDate() : new Date();
				}
                var options = {
					date: date,
					titleText: this.options.titleText,
					androidTheme: datePicker.ANDROID_THEMES.THEME_DEVICE_DEFAULT_DARK,
					mode: 'time' // date, time, datetime (ios only)
				};
                
                //specify iOS minDate and maxDate if options arguments exists otherwise device will through exception if null  
                if(this.options.minDate){
                    options.minDate = this.options.minDate;
                }                
                if(this.options.maxDate){ //in some case we may only need to restrict future date scrolling 
					options.maxDate = this.options.maxDate;
                }
				datePicker.show(options, function (date) {
					if (date === undefined) { return; } //bugfix 20190306 after setting a different time than now() > save > datetime picker > cancel > input field reverts to now()
                    
                    date = moment(date).format(that.options.dateFormat);
					that.model.set(that.options.name, date, {
						silent: that.options.silentChange
					});
					that.$el.find('#' + that.options.fieldId).val(date);
				}, function (error) {
				});
			}
		},
	});


	/**
	 * Extend the Item View to make a signature pad
	 */
	View.SignaturePad = Backbone.Marionette.ItemView.extend({
		model: null,
		options: {
			fieldId: null,
			fieldClass: null,
			name: null,
			tooltip: null,
			value: null,
			label: null,
			padWidth: 250,
			padHeight: 96,
			padLineTop: 64,
			required: false,
			newSignature: true,
			textColor: null
		},
		ui: {
			"sigPad": ".sigPad",
			"hiddenfield": "input"
		},
		events: function () {
			this._ensureElement();
			var events = {};
			events['click a.reset'] = 'clearCanvas';
			return events;
		},
		modelEvents: function () {
			var events = {};
			events['sync'] = 'onModelSync';
			events['change:' + this.options.name] = 'onModelChange';
			return events;
		},
		onModelSync: function(model) {
			this.options.newSignature = false;
		},
		onModelChange: function (model) {
			var prev = model.previousAttributes();

			if (!this.options.newSignature) {
				this.render();
			}
		},
		template: function (data) {
			var options = data.options;
			var styleColor = '';
			var _tmplStr = '<label style="' + styleColor + '" for="' + options.fieldId + '">';
			if(options.textColor){
				styleColor = 'color:'+options.textColor;
			}
			if (options.label) {
				_tmplStr += '<span style="' + styleColor + '" class="wmapp-input-title">' + options.label + '</span>';
				if (options.required) {
					_tmplStr += '<span class="is-required" title="Required">*</span>';
				}
				if (options.tooltip) {
					_tmplStr += '<span data-tooltip class="has-tip tip-right" title="' + options.tooltip + '"></span>';
				}
			}
			_tmplStr += '<div id="' + options.fieldId + '" class="sigPad ' + options.fieldClass + '">';
			_tmplStr += '<div class="sig" id="' + options.fieldId + 'Canvas"><canvas width="' + options.padWidth + '" height="' + options.padHeight + '" style="border: 1px solid #000; cursor:initial;" class="pad"></canvas> <a class="reset"> clear</a></div>';
			_tmplStr += '<div id="' + options.fieldId + 'Image" style="display:none"></div>';
			_tmplStr += '<input name="' + options.name + '" type="hidden" value="' + options.value + '" id="' + options.fieldId + 'Hidden" />';
			_tmplStr += '</div></label>';
			return _tmplStr;
		},
		templateHelpers: function () {
			return {
				model: this.model,
				options: this.options
			}
		},
		onRender: function () {
			if (this.ui.sigPad.find('canvas').length > 0) {
				var that = this;

				if (this.model.get(this.options.name) && this.model.get(this.options.name).get('toUrl')) {
					this.$el.find('#' + this.options.fieldId + 'Image').show().html('<img src="' + this.model.get(this.options.name).get('toUrl') + '" />');
					this.$el.find('#' + this.options.fieldId + 'Canvas').hide();
				} else if (this.model.get(this.options.name) && this.model.get(this.options.name).get('json')) {
					this._signaturePad = this.ui.sigPad.signaturePad({
						displayOnly: true
					});
					this._signaturePad.regenerate(this.model.get(this.options.name).get('json'));
					this.ui.sigPad.find('a.reset').remove();
				} else {
					this._signaturePad = this.ui.sigPad.signaturePad({
						drawOnly: true,
						lineMargin: 5,
						lineTop: this.options.padLineTop,
						onDrawEnd: function () {
							that.updateModel();
						}
					});
					this.ui.sigPad.find('canvas').on('touchstart', function (evt) {
						evt.preventDefault();
						evt.stopPropagation();
					});
				}
			}
		},
		updateModel: function (keepSilent) {
			if (!_.isBoolean(keepSilent)) {
				keepSilent = true;
			}
			if (this.model) {
				var signature = new WMAPP.Extension.Model.Signature({
					json: this._signaturePad.getSignatureString(),
					toUrl: this._signaturePad.getSignatureImage()
				});

				this.ui.hiddenfield.val(this._signaturePad.getSignatureImage());

				this.model.set(this.options.name, signature, {
					silent: keepSilent
				});
			}

			this.trigger('trigger:coreSignaturePadChange');
		},
		clearCanvas: function (keepSilent) {
			if (_.isObject(this._signaturePad)) {
				this._signaturePad.clearCanvas();
				this.ui.hiddenfield.val('');

				if (!_.isBoolean(keepSilent)) {
					keepSilent = true;
				}
				if (this.model) {
					var signature = new WMAPP.Extension.Model.Signature({
						json: null,
						toUrl: null
					});

					this.model.set(this.options.name, signature, {
						silent: keepSilent
					});
				}
			}
		}
	});

	/**
	 * Extend the Item View to make a signature pad
	 */
	View.DrawingCanvas = Backbone.Marionette.ItemView.extend({
		template: null,
		model: null,
		options: {
			fieldId: null,
			fieldClass: null,
			name: null,
			tooltip: null,
			label: null,
			canvasWidth: 500,
			canvasHeight: 500,
			readOnly: false,
			required: false,
			textColor: null
		},
		ui: {
			"drawingCanvas": ".drawingCanvas"
		},
		events: function () {
			this._ensureElement();
			var events = {};
			events['click a#toolMarker' + this.options.fieldId] = 'selectToolMarker';

			events['click a#colourBlack' + this.options.fieldId] = 'selectColourBlack';
			events['click a#colourPurple' + this.options.fieldId] = 'selectColourPurple';
			events['click a#colourGreen' + this.options.fieldId] = 'selectColourGreen';
			events['click a#colourYellow' + this.options.fieldId] = 'selectColourYellow';
			events['click a#colourBrown' + this.options.fieldId] = 'selectColourBrown';

			events['click a#sizeSmall' + this.options.fieldId] = 'selectSizeSmall';
			events['click a#sizeNormal' + this.options.fieldId] = 'selectSizeNormal';
			events['click a#sizeLarge' + this.options.fieldId] = 'selectSizeLarge';
			events['click a#sizeJumbo' + this.options.fieldId] = 'selectSizeJumbo';

			events['click a#clear' + this.options.fieldId] = 'clearCanvas';
			events['click a#actionUndo' + this.options.fieldId] = 'actionUndo';
			events['click a#actionRedo' + this.options.fieldId] = 'actionRedo';
			return events;
		},
		selectToolMarker: function (e) {
			this._drawingCanvas.setLineColor('#000000');
			this._drawingCanvas.setTool('marker');
			this.$el.find('a[id^="tool"]').removeClass('disabled');
			$(e.target).addClass('disabled');
		},
		selectToolStamp: function (e) {
			this._drawingCanvas.setLineColor('#0003FF');
			this._drawingCanvas.setTool('stamp');
			this.$el.find('a[id^="tool"]').removeClass('disabled');
			$(e.target).addClass('disabled');
		},
		selectColourBlack: function (e) {
			this._drawingCanvas.setLineColor(this.colorBlack);
			this.$el.find('a[id^="colour"]').removeClass('disabled');
			$(e.target).addClass('disabled');
		},
		selectColourPurple: function (e) {
			this._drawingCanvas.setLineColor(this.colorPurple);
			this.$el.find('a[id^="colour"]').removeClass('disabled');
			$(e.target).addClass('disabled');
		},
		selectColourGreen: function (e) {
			this._drawingCanvas.setLineColor(this.colorGreen);
			this.$el.find('a[id^="colour"]').removeClass('disabled');
			$(e.target).addClass('disabled');
		},
		selectColourYellow: function (e) {
			this._drawingCanvas.setLineColor(this.colorYellow);
			this.$el.find('a[id^="colour"]').removeClass('disabled');
			$(e.target).addClass('disabled');
		},
		selectColourBrown: function (e) {
			this._drawingCanvas.setLineColor(this.colorBrown);
			this.$el.find('a[id^="colour"]').removeClass('disabled');
			$(e.target).addClass('disabled');
		},
		selectSizeSmall: function (e) {
			this._drawingCanvas.setLineSize(1);
			this.$el.find('a[id^="size"]').removeClass('disabled');
			$(e.target).addClass('disabled');
		},
		selectSizeNormal: function (e) {
			this._drawingCanvas.setLineSize(2);
			this.$el.find('a[id^="size"]').removeClass('disabled');
			$(e.target).addClass('disabled');
		},
		selectSizeLarge: function (e) {
			this._drawingCanvas.setLineSize(4);
			this.$el.find('a[id^="size"]').removeClass('disabled');
			$(e.target).addClass('disabled');
		},
		selectSizeJumbo: function (e) {
			this._drawingCanvas.setLineSize(8);
			this.$el.find('a[id^="size"]').removeClass('disabled');
			$(e.target).addClass('disabled');
		},
		clearCanvas: function () {
			this._drawingCanvas.clear();
		},
		actionUndo: function (e) {
			this._drawingCanvas.undo();
			this.updateModel();
		},
		actionRedo: function (e) {
			this._drawingCanvas.redo();
			this.updateModel();
		},
		modelEvents: function () {
			var events = {};
			events['change:' + this.options.name] = 'onModelChange';
			return events;
		},
		onModelChange: function (evt) {
			this.render();
		},
		initialize: function (options) {
			this.lineSize = 2;
			this.colorBlack = "#000000";
			this.colorPurple = "#cb3594";
			this.colorGreen = "#659b41";
			this.colorYellow = "#ffcf33";
			this.colorBrown = "#986928";
			var styleColor = '';
			if(options.textColor){
                    styleColor = 'color:'+options.textColor;
            }
			var _tmplStr = '<label style="' + styleColor + '" for="' + options.fieldId + '">';
			if (options.label) {
				_tmplStr += '<span class="wmapp-input-title">' + options.label + '</span>';
				if (options.required) {
					_tmplStr += '<span class="is-required" title="Required">*</span>';
				}
				if (options.tooltip) {
					_tmplStr += '<span data-tooltip class="has-tip tip-right" title="' + options.tooltip + '"></span>';
				}
				_tmplStr += '<br/>';
			}

			// options
			_tmplStr += '<a id="colourBlack' + options.fieldId + '" class="button disabled">Black</a>';
			_tmplStr += '<a id="colourPurple' + options.fieldId + '" class="button">Purple</a>';
			_tmplStr += '<a id="colourGreen' + options.fieldId + '" class="button">Green</a>';
			_tmplStr += '<a id="colourYellow' + options.fieldId + '" class="button">Yellow</a>';
			_tmplStr += '<a id="colourBrown' + options.fieldId + '" class="button">Brown</a><br/>';
			_tmplStr += '<a id="sizeSmall' + options.fieldId + '" class="button">Small</a>';
			_tmplStr += '<a id="sizeNormal' + options.fieldId + '" class="button disabled">Normal</a>';
			_tmplStr += '<a id="sizeLarge' + options.fieldId + '" class="button">Large</a>';
			_tmplStr += '<a id="sizeJumbo' + options.fieldId + '" class="button">Jumbo</a><br/>';
			_tmplStr += '<a id="clear' + options.fieldId + '" class="button" style="margin-bottom: 0.1rem; min-width: 95px;">Clear</a>';
			_tmplStr += '<a id="actionUndo' + options.fieldId + '" class="button" style="margin-bottom: 0.1rem; min-width: 95px;">Undo</a>';
			_tmplStr += '<a id="actionRedo' + options.fieldId + '" class="button" style="margin-bottom: 0.1rem; min-width: 100px;">Redo</a>';
			_tmplStr += '</div>';
			_tmplStr += '</div>';

			_tmplStr += '<div id="' + options.fieldId + '" class="' + options.fieldClass + ' resize drawingCanvas" style="display:block;';
			if (_.isObject(options.background) && options.background != null) {
				var _imgStr = '/site/img/';
				if (options.background.get('plugin_id') != 0) {
					_imgStr += options.background.get('plugin_id') + "/";
				}
				_imgStr += options.background.get('file');
				_tmplStr += '">';
				_tmplStr += '<image src="' + _imgStr + '" id="backgroundImage' + options.fieldId + '" style="display: none;" />';
			} else {
				_tmplStr += '">';
			}
			_tmplStr += '<canvas width="' + options.canvasWidth + '" height="' + options.canvasWidth + '" style="border: 1px solid #000; cursor:initial;"></canvas>' +
				'<canvas width="' + options.canvasWidth + '" height="' + options.canvasWidth + '" style="border: 1px solid #000; cursor:initial; display:none;" id="hidden"></canvas>' +
				'</div></label>';
			this.template = _.template(_tmplStr);
		},
		onShow: function () {
			if (this.ui.drawingCanvas.find('canvas').length > 0) {
				var that = this;
				this._drawingCanvas = this.ui.drawingCanvas.find('canvas').sketchpad({
					baseWidth: this.options.canvasWidth,
					baseHeight: this.options.canvasHeight,
					aspectRatio: 1,
					lineSize: this.lineSize,
					lineColor: this.colorBlack,
					canvasColor: 'transparent',
					background: that.options.background,
					onDrawEnd: function () {
						that.updateModel();
					}
				});
			}

			// check if there is data
			if (_.isObject(this.model.get(this.options.name))) {
				var data = this.model.get(this.options.name);
				if (data && data.toUrl && data.toUrl[0] == "%") {
					data.toUrl = unescape(data.toUrl);
				}
				if (data && data.json) {
					if (data.json[0] == "%") {
						data.json = unescape(data.json);
					}
					this._drawingCanvas.jsonLoad(data.json);
				}
				//data.toUrl = data.toUrl;
			}
		},
		updateModel: function (keepSilent) {
			if (!_.isBoolean(keepSilent)) {
				keepSilent = true;
			}
			if (this.model) {
				var data = {};
				data.json = this._drawingCanvas.json();
				data.toUrl = this._drawingCanvas.getImage();

				this.model.set(this.options.name, data, {
					silent: keepSilent
				});
			}
		},
	});

	/**
	 * Extend the Item View to make a member field combo
	 */
	View.MemberFields = WMAPP.Extension.View.LayoutView.extend({
		modelEvents: {
			'change': 'render'
		},
		template: function (data) {
			var options = data.options;

			if (options.displayHorizontal) {
				var cols = 3;
				if (options.displayTitle)
					++cols;
				if (options.displayActive)
					++cols;
				if (options.displayPhone)
					++cols;
				var tmplStr = '<ul class="small-block-grid-1 medium-block-grid-' + cols + '" style="margin: 0 -0.125rem">';

				if (!WMAPP.isApp && options.displayActive)
					tmplStr += '<li><div class="wmapp-member-field-active"></div></li>';

				if (options.displayTitle)
					tmplStr += '<li><div class="wmapp-member-field-title"></div></li>';

				tmplStr += '<li><div class="wmapp-member-field-firstname"></div></li>';
				tmplStr += '<li><div class="wmapp-member-field-lastname"></div></li>';
				tmplStr += '<li><div class="wmapp-member-field-email"></div></li>';
				if (options.displayPhone)
					tmplStr += '<li><div class="wmapp-member-field-phone"></div></li>';

				tmplStr += '</ul>';
			} else {
				var tmplStr = '<div class="wmapp-member-field">';

				if (!WMAPP.isApp && options.displayActive) {
					tmplStr += '<div class="wmapp-member-field-active"></div>';
				}
				if (options.displayTitle)
					tmplStr += '<div class="wmapp-member-field-title"></div>';

				tmplStr += '<div class="wmapp-member-field-firstname"></div>';
				tmplStr += '<div class="wmapp-member-field-lastname"></div>';
				tmplStr += '<div class="wmapp-member-field-email"></div>';
				if (options.displayPhone)
					tmplStr += '<div class="wmapp-member-field-phone"></div>';
				if (options.displayPassword) {
					tmplStr += '<div class="wmapp-member-field-password"></div>';
					tmplStr += '<div class="wmapp-member-field-password-confirm"></div>';
				}
				if (options.displayImage)
					tmplStr += '<div class="wmapp-member-field-image_id"></div>';
				tmplStr += '<div class="wmapp-member-field-notify"></div>';

				if (options.displayAddress) {
					tmplStr += '<fieldset>' +
						'<legend>Addresses</legend>' +
						'<div class="wmapp-member-field-address"></div>' +
						'</fieldset>';
				}

				tmplStr += '</div>';
			}

			return tmplStr;
		},
		initialize: function () {
			if (this.options.displayPassword) {
				this.model.validation['password'] = {
					required: false,
					minLength: 8
				};
				this.model.validation['confirm_password'] = {
					equalTo: 'password'
				};
			}

			if (this.model) {
				Backbone.Validation.bind(this);
			}

			this.options.layoutId = this.options.fieldId + 'MemberId';
			//this.listenTo(this.model, "reset",
		},
		regions: {
			activeField: '.wmapp-member-field-active',
			titleField: '.wmapp-member-field-title',
			firstnameField: '.wmapp-member-field-firstname',
			lastnameField: '.wmapp-member-field-lastname',
			emailField: '.wmapp-member-field-email',
			phoneField: '.wmapp-member-field-phone',
			passwordField: '.wmapp-member-field-password',
			confirmPasswordField: '.wmapp-member-field-password-confirm',
			addressField: '.wmapp-member-field-address',
			imageIdField: '.wmapp-member-field-image_id',
			notifyField: '.wmapp-member-field-notify',
		},
		options: {
			layoutId: null,
			fieldId: null,
			fieldClass: null,
			name: null,
			tooltip: null,
			placeholder: null,
			value: null,
			label: null,
			displayTitle: false,
			displayActive: true,
			displayPhone: true,
			displayLabels: true,
			displayAddress: false,
			displayReadonly: false,
			displayEmail: true,
			displayPassword: false,
			displayImage: false,
			tooltipActive: null,
			tooltipFirstname: null,
			tooltipLastname: null,
			tolltipPhone: null,
			tooltipEmail: null,
			displayHorizontal: false,
            phoneLabel: null // Option to specify the label to use for the phone field
		},
		templateHelpers: function () {
			return {
				model: this.model,
				options: this.options
			}
		},
		onRender: function () {
			if (this.options.displayTitle) {
	            this.titleCollection = new Backbone.Collection([
		            {value: 'Mr', option: 'Mr'},
		            {value: 'Mrs', option: 'Mrs'},
		            {value: 'Ms', option: 'Ms'},
		            {value: 'Miss', option: 'Miss'},
		            {value: 'Dr', option: 'Dr'},
		        ]);

	            // Titlecombobox for profile filter
				var memberTitle = new WMAPP.Extension.View.ComboBox({
					model: this.model,
					fieldId: this.options.fieldId + 'MemberIdTitle',
	                label: 'Title',
	                name: 'title',
	                tooltip: 'Member title',
	                options: this.titleCollection,
	                valueField: 'value',
					optionField: 'option',
	                empty: {"value": "", "option": "Select "+(WMAPP.aOrAn ? WMAPP.aOrAn('Title') : 'a Title')},
	            });
			}

			var that = this;
			if (this.options.displayActive) {
				if(!this.options.tooltipActive){
					this.options.tooltipActive = 'Active';
				}
				var memberActive = new WMAPP.Extension.View.CheckBox({
					model: this.model,
					fieldId: this.options.fieldId + 'MemberIdActive',
					name: 'active',
					tooltip: this.options.tooltipActive,
					label: 'Active',
				});
			}

			if(!this.options.tooltipFirstname){
				this.options.tooltipFirstname = (this.options.displayLabels ? 'First Name' : false);
			}
			var memberFirstname = new WMAPP.Extension.View.TextField({
				model: this.model,
				fieldId: this.options.fieldId + 'MemberIdFirstname',
				fieldClass: '',
				tooltip: that.options.tooltipFirstname,
				placeholder: 'First Name',
				label: (that.options.displayLabels ? 'First Name' : ''),
				name: 'firstname',
				readonly: this.options.displayReadonly,
			});

			if(!this.options.tooltipLastname){
				this.options.tooltipLastname = (this.options.displayLabels ? 'Last Name' : false);
			}
			var memberLastname = new WMAPP.Extension.View.TextField({
				model: this.model,
				fieldId: this.options.fieldId + 'MemberIdLastname',
				fieldClass: '',
				tooltip: that.options.tooltipLastname,
				placeholder: 'Last Name',
				label: (that.options.displayLabels ? 'Last Name' : ''),
				name: 'lastname',
				readonly: this.options.displayReadonly,
			});

			if(!this.options.tooltipEmail){
				this.options.tooltipEmail = (this.options.displayLabels ? 'Email' : false);
			}
			var memberEmail = new WMAPP.Extension.View.TextField({
				model: this.model,
				fieldId: this.options.fieldId + 'MemberIdEmail',
				fieldType: 'email',
				fieldClass: '',
				tooltip: that.options.tooltipEmail,
				placeholder: 'Email',
				label: (that.options.displayLabels ? 'Email' : ''),
				name: 'email',
				readonly: this.options.displayReadonly,
			});

			if (this.options.displayPhone) {
				if(!this.options.tooltipPhone){
					this.options.tooltipPhone = (this.options.displayLabels ? 'Phone' : false);
				}
				var phoneLabel = '';
				if (this.options.displayLabels) {
				    phoneLabel = this.options.phoneLabel ? this.options.phoneLabel : 'Phone';
                }

				var memberPhone = new WMAPP.Extension.View.TextField({
					model: this.model,
					fieldId: this.options.fieldId + 'MemberIdPhone',
					fieldClass: '',
					tooltip: that.options.tooltipPhone,
					placeholder: 'Phone',
					label: phoneLabel,
					name: 'phone',
					readonly: this.options.displayReadonly,
				});
			}

			if (this.options.displayImage) {
				var imageIdField = new WMAPP.Extension.View.ImageSingleField({
					model: this.model,
					fieldId: this.options.fieldId + 'MemberIdImageId',
					fieldClass: '',
					tooltip: 'Member Image',
					placeholder: '',
					label: 'Member Image',
					name: 'image',
					selectField: false,
				});
			}

			if (this.options.displayPassword) {
				var memberPassword = new WMAPP.Extension.View.TextField({
					model: this.model,
					fieldId: this.options.fieldId + 'MemberIdPassword',
					fieldClass: '',
					fieldType: 'password',
					tooltip: (that.options.displayLabels ? 'Change Password (optional)' : false),
					placeholder: 'Change Password (optional)',
					label: (that.options.displayLabels ? 'Change Password  (optional)' : ''),
					name: 'password',
					readonly: this.options.displayReadonly,
				});

				var memberPasswordConfirm = new WMAPP.Extension.View.TextField({
					model: this.model,
					fieldId: this.options.fieldId + 'MemberIdConfirmPassword',
					fieldClass: '',
					fieldType: 'password',
					tooltip: (that.options.displayLabels ? 'Confirm Password' : false),
					placeholder: 'Confirm Password',
					label: (that.options.displayLabels ? 'Confirm Password' : ''),
					name: 'confirm_password',
					readonly: this.options.displayReadonly,
				});
			}

			if (this.options.displayTitle && !WMAPP.isApp) {
				this.titleField.show(memberTitle);
			}
			if (this.options.displayActive && !WMAPP.isApp) {
				this.activeField.show(memberActive);
			}
			this.firstnameField.show(memberFirstname);
			this.lastnameField.show(memberLastname);
			if (this.options.displayEmail) {
				this.emailField.show(memberEmail);
			}

			if (this.options.displayPhone) {
				this.phoneField.show(memberPhone);
			}

			if (this.options.displayImage) {
				this.imageIdField.show(imageIdField);
			}

			if (this.options.displayPassword) {
				this.passwordField.show(memberPassword);
				this.confirmPasswordField.show(memberPasswordConfirm);
			}

			if (this.options.displayAddress) {
				var memberAddress = new WMAPP.Extension.View.MemberAddressFields({
					member: this.model,
					fieldId: this.options.fieldId + 'MemberIdAddress',
					fieldClass: '',
					tooltip: 'Member Addresses',
					displayAuthority: false,
					displayNotes: false,
					selectedAddress: this.options.selectedAddress
				});

				this.listenTo(memberAddress, 'trigger:coreMemberAddressSubmit', function (model) {
					this.trigger('trigger:coreMemberAddressSubmit', model);
				}, this);

				this.listenTo(memberAddress, 'trigger:coreMemberAddressSelect', function (model) {
					this.trigger('trigger:coreMemberAddressSelect', model);
				}, this);

				this.addressField.show(memberAddress);
			}
		}
	});

	View.MemberExtraFields = WMAPP.Extension.View.LayoutView.extend({
		modelEvents: {
			'change': 'render'
		},
		initialize: function () {
			var that = this;

			if (this.model) {
				Backbone.Validation.bind(this);
			}

			_.each(this.options.fields, function(field) {
				that.addRegion(field+'Field', '.wmapp-member-field-' + field);
			});

			this.options.layoutId = this.options.fieldId + 'MemberId';
		},
		template: function (data) {
			var model = data.model;
			var options = data.options;
			var tmplStr = '';

			_.each(options.fields, function(field) {
				tmplStr += '<div class="wmapp-member-field-'+field+'"></div>';
			});

			return tmplStr;
		},
		onRender: function() {
			var that = this;

			_.each(this.options.fields, function(field) {
				var textfield = new WMAPP.Extension.View.TextField({
					model: that.model,
					fieldId: that.options.fieldId + 'MemberId' + field,
					fieldClass: that.options.fieldClass ? that.options.fieldClass : '',
					tooltip: WMAPP.Helper.upperCaseFirst(field),
					placeholder: WMAPP.Helper.upperCaseFirst(field),
					label: WMAPP.Helper.upperCaseFirst(field),
					name: field,
					readonly: that.options.displayReadonly,
				});
				that[field+'Field'].show(textfield);
			});

		},
		options: {
			fieldId: null,
			fieldClass: null,
			displayReadonly: false,
			fields: ['website', 'facebook', 'google', 'linkedin', 'twitter'],
		},
		templateHelpers: function () {
			return {
				model: this.model,
				options: this.options
			}
		},
	});

	/**
	 * Extend the Item View to make a member field combo
	 */
	View.MemberAddressFields = WMAPP.Extension.View.LayoutView.extend({
		initialize: function () {
			this.options.layoutId = this.options.fieldId + 'MemberAddress';

			if (this.model) {
				Backbone.Validation.bind(this);
			}

			if (this.options.member.get('_member_addresss')) {
				this.collection = this.options.member.get('_member_addresss');

				// bind an event when we add an address to the collection
				this.collection.bind('add', this.onAddedAddress, this);
			}
		},
		template: function (data) {
			var model = data.model;
			var options = data.options;

			var tmplStr = '<div class="row collapse">' +
			'<div class="small-10 columns"><div class="wmapp-member-address-field-select"></div></div>' +
			'<div class="small-2 columns"><button class="button postfix wmapp-member-address-field-update">';

			if (options.selectedAddress) {
				tmplStr += 'Update';
			} else {
				tmplStr += 'Create';
			}

			tmplStr += '</button></div>' +
			'</div>' +
			'<div class="wmapp-member-address-field-address"></div>' +
			'<div class="wmapp-member-address-field-address_2"></div>' +
			'<div class="wmapp-member-address-field-suburb"></div>' +
			'<div class="wmapp-member-address-field-postcode"></div>' +
			'<div class="wmapp-member-address-field-state"></div>' +
			'<div class="wmapp-member-address-field-country"></div>' +
			'<div class="wmapp-member-address-field-authority"></div>' +
			'<div class="wmapp-member-address-field-notes"></div>' +
			'<button type="button" class="wmapp-member-address-field-button hide">Update Address</button>';

			return tmplStr;
		},
		events: {
			"click .wmapp-member-address-field-update": "onUpdateAddress",
			"click .wmapp-member-address-field-button": "onSubmitAddress",
		},
		onUpdateAddress: function (e) {
			e.preventDefault();
			e.stopPropagation();

			if (!this.options.selectedAddress && !this.model) {
				this.model = new WMAPP.Core.Model.MemberAddress({
					'member_id': this.options.member.get('id'),
					'address': 'New address'
				});
			}

			// bind the validation
			Backbone.Validation.bind(this);

			this.trigger('trigger:coreMemberAddressUpdate', this.model);
			$('.wmapp-member-address-field-button').removeClass('hide');
			$('.wmapp-member-address-field-update').html('Update');
		},
		onSubmitAddress: function (e) {
			e.preventDefault();
			e.stopPropagation();

			// validate both the member and member address
			this.model.validate();

			if (this.model.isValid()) {
				this.addressField.empty();
				this.address2Field.empty();
				this.suburbField.empty();
				this.postcodeField.empty();
				this.stateField.empty();
				this.countryField.empty();
				this.authorityField.empty();
				this.notesField.empty();
				$('.wmapp-member-address-field-button').addClass('hide');

				this.trigger('trigger:coreMemberAddressSubmit', this.model);
			}
		},
		onAddedAddress: function (addedModel) {
			this.options.selectedAddress = addedModel.get('id');

			var that = this;
			this.$el.find('#' + that.options.fieldId + 'MemberAddressSelect > option[value="' + that.options.selectedAddress + '"]').attr('selected', 'selected');
		},
		regions: {
			selectField: '.wmapp-member-address-field-select',
			addressField: '.wmapp-member-address-field-address',
			address2Field: '.wmapp-member-address-field-address_2',
			suburbField: '.wmapp-member-address-field-suburb',
			postcodeField: '.wmapp-member-address-field-postcode',
			stateField: '.wmapp-member-address-field-state',
			countryField: '.wmapp-member-address-field-country',
			authorityField: '.wmapp-member-address-field-authority',
			notesField: '.wmapp-member-address-field-notes',
		},
		options: {
			layoutId: '',
			fieldId: '',
			fieldClass: null,
			name: null,
			tooltip: null,
			placeholder: null,
			value: null,
			label: null,
			displayAuthority: true,
			displayNotes: true,
			selectedAddress: 0,
			member: null,
		},

		templateHelpers: function () {
			return {
				model: this.model,
				collection: this.collection,
				options: {
					fieldId: this.options.fieldId,
					fieldClass: this.options.fieldClass,
					name: this.options.name,
					placeholder: this.options.placeholder,
					tooltip: this.options.tooltip,
					label: this.options.label,
					value: this.options.value,
					memberId: this.options.memberId,
					selectedAddress: this.options.selectedAddress,
				}
			}
		},

		modelEvents: {
			'change': 'render'
		},

		onRender: function () {
			if (this.options.selectedAddress && this.collection && this.collection.models) {
				// select the "selected" address
				_.each(this.collection.models, function (model) {
					if (model.get('id') == this.options.selectedAddress) {
						model.set('selected', true);
						this.model = model;
					} else {
						model.set('selected', false);
					}
				}, this);
			}

			this.memberAddressSelect = new WMAPP.Extension.View.ComboBox({
				fieldId: this.options.fieldId + 'MemberAddressSelect',
				tooltip: 'Select an existing address or create a new one',
				label: false,
				name: 'selectedAddress',
				options: this.collection,
				valueField: "id",
				optionField: "address",
				empty: {
					"value": "",
					"option": "Create a new address"
				},
			});

			// listen to an event on the combobox
			this.listenTo(this.memberAddressSelect, 'trigger:coreComboBoxChange', function (modelId) {
				this.options.selectedAddress = modelId;

				if (this.options.selectedAddress) {
					$('.wmapp-member-address-field-update').html('Update');
				} else {
					$('.wmapp-member-address-field-update').html('Create');
				}

				if (this.collection && this.collection.models) {
					// set the new model
					this.model = _.find(this.collection.models, function (address) {
						return address.get('id') == this.options.selectedAddress;
					}, this);
					this.trigger('trigger:coreMemberAddressSelect', this.model);

					// select the "selected" address
					if (this.collection && this.collection.models) {
						_.each(this.collection.models, function (model) {
							if (model.get('id') == this.options.selectedAddress) {
								model.set('selected', true);
							} else {
								model.set('selected', false);
							}
						}, this);
					}
				}

				// reset the fields
				this.addressField.empty();
				this.address2Field.empty();
				this.suburbField.empty();
				this.postcodeField.empty();
				this.stateField.empty();
				this.countryField.empty();
				this.authorityField.empty();
				this.notesField.empty();
				$('.wmapp-member-address-field-button').addClass('hide');
			}, this);

			this.selectField.show(this.memberAddressSelect);

			var that = this;

			// listen to an event on the combobox
			this.listenTo(this, 'trigger:coreMemberAddressUpdate', function (model) {
				if (this.model) {
					this.memberAddressAddress = new WMAPP.Extension.View.TextField({
						model: this.model,
						fieldId: this.options.layoutId + 'Address',
						fieldClass: '',
						tooltip: 'Address',
						placeholder: 'Address',
						label: 'Address',
						name: 'address',
					});

					this.memberAddressAddress2 = new WMAPP.Extension.View.TextField({
						model: this.model,
						fieldId: this.options.layoutId + 'Address2',
						fieldClass: '',
						tooltip: 'Address 2',
						placeholder: 'Address 2',
						label: 'Address 2',
						name: 'address_2',
					});

					this.memberAddressSuburb = new WMAPP.Extension.View.TextField({
						model: this.model,
						fieldId: this.options.layoutId + 'Suburb',
						fieldClass: '',
						tooltip: 'Suburb',
						placeholder: 'Suburb',
						label: 'Suburb',
						name: 'suburb',
					});

					this.memberAddressPostcode = new WMAPP.Extension.View.TextField({
						model: this.model,
						fieldId: this.options.layoutId + 'Postcode',
						fieldClass: '',
						tooltip: 'Postcode',
						placeholder: 'Postcode',
						label: 'Postcode',
						name: 'postcode',
					});

					this.memberAddressState = new WMAPP.Extension.View.TextField({
						model: this.model,
						fieldId: this.options.layoutId + 'State',
						fieldClass: '',
						tooltip: 'State',
						placeholder: 'State',
						label: 'State',
						name: 'state',
					});

					this.memberAddressCountry = new WMAPP.Extension.View.Country({
						model: this.model,
						fieldId: this.options.layoutId + 'Country',
						fieldClass: '',
						tooltip: 'Country',
						placeholder: 'Country',
						label: 'Country',
						name: 'country',
						empty: {
							"value": "",
							"option": "Country"
						},
					});

					if (this.options.displayAuthority) {
						this.memberAddressAuthority = new WMAPP.Extension.View.CheckBox({
							model: this.model,
							fieldId: this.options.layoutId + 'AuthorityToLeave',
							name: 'authority_to_leave',
							tooltip: 'Authority to Leave',
							label: 'Authority to Leave',
						});
					}

					if (this.options.displayNotes) {
						this.memberAddressNotes = new WMAPP.Extension.View.TextArea({
							model: this.model,
							fieldId: this.options.layoutId + 'Notes',
							fieldClass: '',
							tooltip: 'Notes',
							placeholder: 'Notes',
							label: 'Notes',
							name: 'notes',
						});
					}

					this.addressField.show(this.memberAddressAddress);
					this.address2Field.show(this.memberAddressAddress2);
					this.suburbField.show(this.memberAddressSuburb);
					this.postcodeField.show(this.memberAddressPostcode);
					this.stateField.show(this.memberAddressState);
					this.countryField.show(this.memberAddressCountry);

					if (this.options.displayNotes) {
						this.authorityField.show(this.memberAddressAuthority);
					}
					if (this.options.displayAuthority) {
						this.notesField.show(this.memberAddressNotes);
					}
				}
			});
		}
	});

	/**
	 * Extend the Item View to make a member field combo
	 */
	View.PageTileFields = WMAPP.Extension.View.LayoutView.extend({
		template: function () {
			var tmplStr = '<div class="wmapp-page-tile-bgcolor"></div>' +
				'<div class="wmapp-page-tile-text_color"></div>' +
				'<div class="wmapp-page-tile-justify"></div>' +
				'<div class="wmapp-page-tile-font"></div>' +
				'<div class="wmapp-page-tile-padding"></div>' +
				'<div class="wmapp-page-tile-margin"></div>' +
				'<div class="wmapp-page-tile-border"></div>' +
				'<div class="wmapp-page-tile-border_colour"></div>' +
				'<div class="wmapp-page-tile-custom_class"></div>' +
				'<div class="wmapp-page-tile-background_image_id"></div>' +
				'<div class="wmapp-page-tile-background_size"></div>' +
				'<div class="wmapp-page-tile-background_position"></div>' +
				'<div class="wmapp-page-tile-background_repeat"></div>';

			return tmplStr;
		},
		initialize: function () {
			if (this.model) {
				Backbone.Validation.bind(this);
			}

			this.options.layoutId = this.options.fieldId + 'PageTileId';

			// options for enum intervalTypeEnum
			this.justifyEnum = new Backbone.Collection([{
				value: 'left',
				option: 'Left'
			}, {
				value: 'center',
				option: 'Center'
			}, {
				value: 'right',
				option: 'Right'
			}, ]);

			if (this.model) {
				this.listenTo(this.model, 'sync', this.render);
			}
		},
		regions: {
			bgColorField: '.wmapp-page-tile-bgcolor',
			fontField: '.wmapp-page-tile-font',
			textColorField: '.wmapp-page-tile-text_color',
			justifyField: '.wmapp-page-tile-justify',
			paddingField: '.wmapp-page-tile-padding',
			marginField: '.wmapp-page-tile-margin',
			borderField: '.wmapp-page-tile-border',
			borderColourField: '.wmapp-page-tile-border_colour',
			customClassField: '.wmapp-page-tile-custom_class',
			backgroundImageIdField: '.wmapp-page-tile-background_image_id',
			backgroundSizeField: '.wmapp-page-tile-background_size',
			backgroundPositionField: '.wmapp-page-tile-background_position',
			backgroundRepeatField: '.wmapp-page-tile-background_repeat',
		},
		options: {
			layoutId: null,
			fieldId: null,
			fieldClass: null,
			name: null,
			tooltip: null,
			placeholder: null,
			value: null,
			label: null,
		},
		templateHelpers: function () {
			return {
				model: this.model,
				options: this.options
			}
		},
		onRender: function () {

			var bgColorField = new WMAPP.Extension.View.ColorPicker({
				model: this.model,
				fieldId: this.options.fieldId + 'PageTileIdBgColor',
				fieldClass: '',
				tooltip: 'Background Colour',
				placeholder: '',
				label: 'Background Colour',
				name: 'bgcolor',
			});

			var textColorField = new WMAPP.Extension.View.ColorPicker({
				model: this.model,
				fieldId: this.options.fieldId + 'PageTileIdTextColor',
				fieldClass: '',
				tooltip: 'Text Colour',
				placeholder: '',
				label: 'Text Colour',
				name: 'text_color',
			});

			var justifyField = new WMAPP.Extension.View.ComboBox({
				model: this.model,
				fieldId: this.options.fieldId + 'PageTileIdJustify',
				fieldClass: '',
				tooltip: 'Justify',
				label: 'Justify',
				name: 'justify',
				valueField: 'value',
				optionField: 'option',
				options: this.justifyEnum,
			});

			var fontField = new WMAPP.Extension.View.TextField({
				model: this.model,
				fieldId: this.options.fieldId + 'PageTileIdFont',
				fieldClass: '',
				tooltip: 'Font',
				placeholder: '',
				label: 'Font',
				name: 'font',
			});

			var paddingField = new WMAPP.Extension.View.TextField({
				model: this.model,
				fieldId: this.options.fieldId + 'PageTileIdPadding',
				fieldClass: '',
				tooltip: 'Padding around the tile in pixels',
				placeholder: '',
				label: 'Padding',
				name: 'padding',
			});

			var marginField = new WMAPP.Extension.View.TextField({
				model: this.model,
				fieldId: this.options.fieldId + 'PageTileIdMargin',
				fieldClass: '',
				tooltip: 'Margin around the tile in pixels',
				placeholder: '',
				label: 'Margin',
				name: 'margin',
			});

			var borderField = new WMAPP.Extension.View.TextField({
				model: this.model,
				fieldId: this.options.fieldId + 'PageTileIdBorder',
				fieldClass: '',
				tooltip: 'Border width in pixels',
				placeholder: '',
				label: 'Border',
				name: 'border',
			});

			var borderColourField = new WMAPP.Extension.View.ColorPicker({
				model: this.model,
				fieldId: this.options.fieldId + 'PageTileIdBorderColour',
				fieldClass: '',
				tooltip: 'Border Colour',
				placeholder: '',
				label: 'Border Colour',
				name: 'border_colour',
			});

			var customClassField = new WMAPP.Extension.View.TextField({
				model: this.model,
				fieldId: this.options.fieldId + 'PageTileIdCustomClass',
				fieldClass: '',
				tooltip: 'Custom Class',
				placeholder: '',
				label: 'Custom Class',
				name: 'custom_class',
			});

			var backgroundImageIdField = new WMAPP.Extension.View.ImageSingleField({
				model: this.model,
				fieldId: this.options.fieldId + 'PageTileIdBackgroundImageId',
				fieldClass: '',
				tooltip: 'Background Image',
				placeholder: '',
				label: 'Background Image',
				name: 'background_image_id',
				selectField: false,
			});

			// options for enum backgroundSizeField
			var backgroundSizes = new Backbone.Collection([{
				value: 'auto',
				option: 'Auto'
			}, {
				value: 'cover',
				option: 'Cover'
			}, {
				value: 'contain',
				option: 'Contain'
			}, {
				value: '25%',
				option: '25%'
			}, {
				value: '50%',
				option: '50%'
			}, {
				value: '75%',
				option: '75%'
			}, {
				value: '100%',
				option: '100%'
			}, ]);

			var backgroundSizeField = new WMAPP.Extension.View.ComboBox({
				model: this.model,
				fieldId: this.options.fieldId + 'PageTileIdBackgroundSize',
				label: 'Background Image Size',
				name: 'background_size',
				tooltip: 'The size of the background image',
				options: backgroundSizes,
				valueField: 'value',
				optionField: 'option',
				empty: {
					"value": "",
					"option": "Select a Background Image Size"
				},
			});

			// options for enum backgroundPositionField
			var backgroundPositions = new Backbone.Collection([{
				value: 'top',
				option: 'Top'
			}, {
				value: 'bottom',
				option: 'Bottom'
			}, {
				value: 'center',
				option: 'Center'
			}, {
				value: 'left',
				option: 'Left'
			}, {
				value: 'right',
				option: 'Right'
			}, ]);

			var backgroundPositionField = new WMAPP.Extension.View.ComboBox({
				model: this.model,
				fieldId: this.options.fieldId + 'PageTileIdBackgroundPosition',
				label: 'Background Image Position',
				name: 'background_position',
				tooltip: 'The position of the background image',
				options: backgroundPositions,
				valueField: 'value',
				optionField: 'option',
				empty: {
					"value": "",
					"option": "Select a Background Image Position"
				},
			});

			// options for enum backgroundRepeatField
			var backgroundRepeats = new Backbone.Collection([{
				value: 'no-repeat',
				option: 'No Repeat'
			}, {
				value: 'repeat-x',
				option: 'Repeat Horizontally'
			}, {
				value: 'repeat-y',
				option: 'Repeat Vertically'
			}, {
				value: 'repeat',
				option: 'Tile Image'
			}, {
				value: 'space',
				option: 'Tile Without Clipping'
			}, {
				value: 'round',
				option: 'Tile With Fit'
			}, ]);

			var backgroundRepeatField = new WMAPP.Extension.View.ComboBox({
				model: this.model,
				fieldId: this.options.fieldId + 'PageTileIdBackgroundRepeat',
				label: 'Background Image Repeat',
				name: 'background_repeat',
				tooltip: 'The repeat setting of the background image',
				options: backgroundRepeats,
				valueField: 'value',
				optionField: 'option',
				empty: {
					"value": "",
					"option": "Select a Background Image Repeat"
				},
			});

			this.bgColorField.show(bgColorField);
			this.textColorField.show(textColorField);
			this.justifyField.show(justifyField);
			this.fontField.show(fontField);
			this.paddingField.show(paddingField);
			this.marginField.show(marginField);
			this.borderField.show(borderField);
			this.borderColourField.show(borderColourField);
			this.customClassField.show(customClassField);
			this.backgroundImageIdField.show(backgroundImageIdField);
			this.backgroundSizeField.show(backgroundSizeField);
			this.backgroundPositionField.show(backgroundPositionField);
			this.backgroundRepeatField.show(backgroundRepeatField);

		},
	});

	/**
	 * Extend the Item View to make a combo box
	 */
	View.Country = Backbone.Marionette.ItemView.extend({
		model: null,
		initialize: function (options) {
			if (!this.options) {
				this.options.options = new WMAPP.Core.Model.CountryCollection(_.map(this.countryList, function(country) {
					return {
						name: country
					}
				}));
				this.options.options.remote = true;
				this.options.options.fetch({
					reset: true
				});
			}
			this.listenTo(this.options.options, 'sync', this.render);
		},
		template: function (data) {
			var options = data.options;
			var model = data.model;

			var tmplStr = '<label for="' + options.fieldId + '">' + '<span class="wmapp-input-title">' + options.label + '</span>';
			if (options.required) {
				tmplStr += '<span class="is-required" title="Required">*</span>';
			}
			if (options.tooltip) {
				tmplStr += '<span data-tooltip class="has-tip tip-right" title="' + options.tooltip + '"></span>';
			}
			tmplStr += '</label><select name="' + options.name + '" id="' + options.fieldId + '"';
			if (options.readonly != null && options.readonly) {
				tmplStr += 'disabled="disabled"';
			}
			if (options.fieldClass != null) {
				tmplStr += 'class="' + options.fieldClass + '"';
			}
			tmplStr += '>';
			if (options.empty != null) {
				tmplStr += '<option value="' + options.empty.value + '">' + options.empty.option + '</option>';
			}

			options.options.each(function (item) {
				tmplStr += '<option value="' + item.get(options.valueField) + '"';
				if (model && model.get(options.name) && model.get(options.name) == item.get(options.valueField)) {
					tmplStr += ' selected="selected"';
				}
				tmplStr += '>' + item.get(options.optionField) + '</option>';
			});
			tmplStr += '</select>';
			return tmplStr;
		},
		events: function () {
			var events = {};
			events['change select'] = 'onInputChange';
			return events;
		},
		options: {
			fieldId: null,
			fieldClass: null,
			name: 'country',
			tooltip: 'Country',
			options: null,
			valueField: 'id',
			optionField: 'name',
			empty: {
				"value": "",
				"option": "Country"
			},
			label: 'Country',
			readonly: false,
			silentChange: true,
			required: false,
		},
		templateHelpers: function () {
			var selectOptions = null;
			if (this.options.options) {
				if (this.options.sortBy) {
					selectOptions = this.options.options.sortBy(this.options.sortBy);
				} else {
					selectOptions = this.options.options.toArray();
				}
			}
			return {
				model: this.model,
				options: this.options
			}
		},
		modelEvents: function () {
			var events = {};
			events['change:' + this.options.name] = 'onModelChange';
			return events;
		},
		onModelChange: function () {
			if (this.model && this.model.get(this.options.name)) {
				this.$el.find('#' + this.options.fieldId + ' option[value="' + this.model.get(this.options.name) + '"]').prop('selected', true);
			} else {
				this.$el.find('#' + this.options.fieldId + ' option').first().prop('selected', true);
			}
		},
		onInputChange: function () {
			if (this.model) {
				var id = this.$el.find('select').val();

				this.model.set(this.options.name, id, {
					silent: true
				});
				this.model.set('_' + this.options.name, this.options.options.get(id), {
					silent: this.options.silentChange
				});
			}
		},
		toggleReadonly: function (pass) {
			this.$el.find('select').prop('disabled', !this.$el.find('select').prop('disabled'));
		},
		countryList: [
			"Afghanistan","Albania","Algeria","Andorra","Angola","Anguilla","Antigua &amp; Barbuda","Argentina","Armenia","Aruba","Australia","Austria","Azerbaijan","Bahamas"
			,"Bahrain","Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bermuda","Bhutan","Bolivia","Bosnia &amp; Herzegovina","Botswana","Brazil","British Virgin Islands"
			,"Brunei","Bulgaria","Burkina Faso","Burundi","Cambodia","Cameroon","Cape Verde","Cayman Islands","Chad","Chile","China","Colombia","Congo","Cook Islands","Costa Rica"
			,"Cote D Ivoire","Croatia","Cruise Ship","Cuba","Cyprus","Czech Republic","Denmark","Djibouti","Dominica","Dominican Republic","Ecuador","Egypt","El Salvador","Equatorial Guinea"
			,"Estonia","Ethiopia","Falkland Islands","Faroe Islands","Fiji","Finland","France","French Polynesia","French West Indies","Gabon","Gambia","Georgia","Germany","Ghana"
			,"Gibraltar","Greece","Greenland","Grenada","Guam","Guatemala","Guernsey","Guinea","Guinea Bissau","Guyana","Haiti","Honduras","Hong Kong","Hungary","Iceland","India"
			,"Indonesia","Iran","Iraq","Ireland","Isle of Man","Israel","Italy","Jamaica","Japan","Jersey","Jordan","Kazakhstan","Kenya","Kuwait","Kyrgyz Republic","Laos","Latvia"
			,"Lebanon","Lesotho","Liberia","Libya","Liechtenstein","Lithuania","Luxembourg","Macau","Macedonia","Madagascar","Malawi","Malaysia","Maldives","Mali","Malta","Mauritania"
			,"Mauritius","Mexico","Moldova","Monaco","Mongolia","Montenegro","Montserrat","Morocco","Mozambique","Namibia","Nepal","Netherlands","Netherlands Antilles","New Caledonia"
			,"New Zealand","Nicaragua","Niger","Nigeria","Norway","Oman","Pakistan","Palestine","Panama","Papua New Guinea","Paraguay","Peru","Philippines","Poland","Portugal"
			,"Puerto Rico","Qatar","Reunion","Romania","Russia","Rwanda","Saint Pierre &amp; Miquelon","Samoa","San Marino","Satellite","Saudi Arabia","Senegal","Serbia","Seychelles"
			,"Sierra Leone","Singapore","Slovakia","Slovenia","South Africa","South Korea","Spain","Sri Lanka","St Kitts &amp; Nevis","St Lucia","St Vincent","St. Lucia","Sudan"
			,"Suriname","Swaziland","Sweden","Switzerland","Syria","Taiwan","Tajikistan","Tanzania","Thailand","Timor L'Este","Togo","Tonga","Trinidad &amp; Tobago","Tunisia"
			,"Turkey","Turkmenistan","Turks &amp; Caicos","Uganda","Ukraine","United Arab Emirates","United Kingdom","Uruguay","Uzbekistan","Venezuela","Vietnam","Virgin Islands (US)"
			,"Yemen","Zambia","Zimbabwe"],
	});

	/**
	 * Extend the Item View to make a combo box
	 */
	View.Currency = Backbone.Marionette.ItemView.extend({
		model: null,
		initialize: function (options) {
			if (!WMAPP.currencies) {
				WMAPP.currencies = new WMAPP.Core.Model.CurrencyCollection();
			}
			this.listenTo(WMAPP.currencies, 'sync', this.render);

			if (WMAPP.currencies.models.length == 0) {
				WMAPP.currencies.fetch({
					remote: true,
					async: true
				});
			}
		},
		template: function (data) {
			var options = data.options;
			var model = data.model;

			var tmplStr = '<label for="' + options.fieldId + '">' + options.label;
			if (options.required) {
				tmplStr += '<span class="is-required" title="Required">*</span>';
			}
			if (options.tooltip) {
				tmplStr += '<span data-tooltip class="has-tip tip-right" title="' + options.tooltip + '"></span>';
			}
			tmplStr += '</label><select name="' + options.name + '" id="' + options.fieldId + '"';
			if (options.readonly != null && options.readonly) {
				tmplStr += 'disabled="disabled"';
			}
			if (options.fieldClass != null) {
				tmplStr += 'class="' + options.fieldClass + '"';
			}
			tmplStr += '>';
			if (options.empty != null) {
				tmplStr += '<option value="' + options.empty.value + '">' + options.empty.option + '</option>';
			}

			WMAPP.currencies.each(function (item) {
				tmplStr += '<option value="' + item.get(options.valueField) + '"';
				if (model && model.get(options.name) && model.get(options.name) == item.get(options.valueField)) {
					tmplStr += ' selected="selected"';
				}
				tmplStr += '>' + item.get(options.optionField) + '</option>';
			});
			tmplStr += '</select>';
			return tmplStr;
		},
		events: function () {
			var events = {};
			events['change select'] = 'onInputChange';
			return events;
		},
		options: {
			fieldId: null,
			fieldClass: null,
			name: 'currency',
			tooltip: 'Currency',
			options: null,
			valueField: 'id',
			optionField: 'name',
			empty: {
				"value": "",
				"option": "Currency"
			},
			label: 'Currency',
			readonly: false,
			silentChange: true,
			required: false,
		},
		templateHelpers: function () {
			return {
				model: this.model,
				options: this.options
			}
		},
		modelEvents: function () {
			var events = {};
			events['change:' + this.options.name] = 'onModelChange';
			return events;
		},
		onModelChange: function () {
			if (this.model && this.model.get(this.options.name)) {
				this.$el.find('#' + this.options.fieldId + ' option[value="' + this.model.get(this.options.name) + '"]').prop('selected', true);
			} else {
				this.$el.find('#' + this.options.fieldId + ' option').first().prop('selected', true);
			}
		},
		onInputChange: function () {
			if (this.model) {
				var id = this.$el.find('select').val();

				this.model.set(this.options.name, id, {
					silent: this.options.silentChange
				});
				this.model.set('_' + this.options.name, WMAPP.currencies.get(id), {
					silent: this.options.silentChange
				});
			}
		},
		toggleReadonly: function (pass) {
			this.$el.find('select').prop('disabled', !this.$el.find('select').prop('disabled'));
		}
	});

	/**
	 * Extend the Layout View to make a Single Image upload field
	 */
	View.ImageSingleField = WMAPP.Extension.View.LayoutView.extend({
		regions: {
			uploadImageField: '.wmapp-image-single-field-upload-image',
			selectImageField: '.wmapp-image-single-field-select-image',
			autocompleteCode: '.wmapp-image-single-field-select-image-autocomplete',
		},
		events: function () {
			var events = {};
			events['click #' + this.options.fieldId + 'PreviewImageRemove'] = 'onRemoveImage';
			return events;
		},
		onRemoveImage: function () {
			this.model.get('_' + this.options.name).clear().set(this.model.get('_' + this.options.name).defaults);
			this.model.set(this.options.name, this.model.get('_' + this.options.name).get('id'));
			this.trigger('trigger:updatePreviewUpload', null);
			this.render();
		},
		template: function (data) {
			var options = data.options;
			var model = data.model.get('_' + options.name);
			var tmplStr = '<div class="wmapp-image-single-field"><label>' + options.label
			if (options.required) {
				tmplStr += '<span class="is-required" title="Required">*</span>';
			}
			tmplStr += '</label>' +
				'<div class="wmapp-image-single-field-upload-image"></div>';

			if (options.selectField) {
			tmplStr +=	'<div id="' + options.fieldId + 'Progress"></div>' +
				'<div class="wmapp-image-single-field-select-image"></div>' +
				'<div class="wmapp-image-single-field-select-image-autocomplete"></div>';
			}

			if (options.showPreview) {
				tmplStr +=	'<div class="wm-admin-preview-element">' +
							'	<div style="height: 100%; vertical-align: top;">' +
							'		<label>';
				if (! options.hidePreviewLabel) {
					tmplStr +=	'<p>' + options.label + ' Preview</p>';
				};
				tmplStr +=	'			<input name="' + options.name + '" type="hidden" id="' + options.fieldId + '" value="';
				if (model && model.get(options.name)) {
					tmplStr += model.get(options.name);
				}
				tmplStr += '" />'; // end input

				tmplStr += '<div id="' + options.fieldId + 'PreviewImageWrapper" ' + ((!model.get('file') && !options.defaultImage) ? 'style="display:none;"' : '') + '>';
				if (! options.hideDelete) {
					tmplStr += '	<a id="' + options.fieldId + 'PreviewImageRemove" class="right"><i class="fa fa-times"></i></a><br />';
				};
				tmplStr += '	<div id="' + options.fieldId + 'PreviewImage" style="padding-left: 5px;">';

				var href;
				
				if (model.get('file')) {
					if (model.get('data')) {
						href = model.get('data');
					} else if (model.get('url')) {
						href = model.get('url');
					}
					else if (model.get('id')) {
						if (model.get('plugin_id') && model.get('plugin_id') != 0) {
							href = '/site/img/' + model.get('plugin_id') + '/' + model.get('file');
						} else {
							href = '/site/img/' + model.get('file');
						}
						if (WMAPP.domain) {
							href = 'https://' + WMAPP.domain + href;
						}
						if (! options.noLink) {
							tmplStr += '<a href="' + href + '" target="_blank">';
						}
					}

					var ext = model.get('file') ? model.get('file').split('.').pop() : model.get('type');

					if ((model.get('type') && model.get('type').indexOf('image/') === 0) || WMAPP.acceptedImageTypes[ext]) {
						tmplStr += '<img src="' + href + '" />';
					} else {
						tmplStr += '<img src="'+(WMAPP.isApp ? 'img/file-types' : '/img/icons/file_types')+'/' + ext + '.png" style="width: 30px;" />' + model.get('name');
					}

					if (model.get('id') && !options.noLink) {
						tmplStr += '</a>';
					}
				} else if (options.defaultImage) {
					tmplStr += '<img src="' + options.defaultImage + '"/>';
				}

				tmplStr += '</div>' +
					'		</div>' +
					'		</label>' +
					'	</div>' +
					'</div>';
			}
			tmplStr +=	'</div>';

			return tmplStr;
		},

		initialize: function (options) {
			var that = this;

			if (options.showImageOnly) {
				options.hideUpload = true;
				options.hideDelete = true;
				options.hidePreviewLabel = true;
			};

			this.listenTo(this.model.get('_' + this.options.name), 'change', function () {
				that.model.set(that.options.name, that.model.get('_' + that.options.name).get('id'));
				if (!that.isDestroyed) {
					that.render();
				}
			}, this);
		},
		uploadImageField: null,
		selectImageField: null,
		autocompleteCode: null,
		model: null,
		options: {
			fieldId: null,
			fieldClass: null,
			name: null,
			tooltip: null,
			placeholder: null,
			label: null,
			options: null,
			fileField: 'file',
			labelField: 'name',
			selectField: true,
			required: false,
			defaultImage: false,
			disabled: false,
			showPreview: true,
			uploadlabel: null,
			hideUpload: false,
			hideDelete: false,
			hidePreviewLabel: false,
			// If true, will set hideUpload, hideDelete, hidePreviewLabel to true
			showImageOnly: false,
			// Does not add the anchor tag linking to image
			noLink: false,

		},
		templateHelpers: function () {
			return {
				model: this.model,
				options: this.options
			}
		},
		onRender: function () {
			var that = this;
			var model = this.model.get('_' + this.options.name);
			if(!this.options.uploadlabel){
				this.options.uploadlabel = this.options.label;
			}

			if (! this.options.hideUpload) {
				this.uploadView = new WMAPP.Extension.View.ImageSingleFieldUpload({
					model: model,
					fieldId: this.options.fieldId,
					fieldClass: this.options.fieldClass,
					label: this.options.uploadlabel,
					name: this.options.name,
					tooltip: this.options.tooltip,
					disabled: this.options.disabled,
					allowNativeManipulation: this.options.allowNativeManipulation,
				});
				this.uploadImageField.show(this.uploadView);
				this.listenTo(this.uploadView, 'trigger:updatePreviewUpload', function() {
					that.trigger('trigger:updatePreviewUpload', model);
				});
			};

			if (this.options.selectField) {
				this.selectView = new WMAPP.Extension.View.ImageSingleFieldSelect({
					model: model,
					fieldId: this.options.fieldId,
					fieldClass: this.options.fieldClass,
					label: this.options.label,
					name: this.options.name,
					tooltip: this.options.tooltip,
					disabled: this.options.disabled,
				});

				this.autocompleteView = new WMAPP.Extension.View.SingleImageAutoCompleteView({
					model: this.options.options,
					selectModel: model,
					selectField: this.options.name,
					queryParameter: 'Images_name',
					input: '#' + this.options.fieldId + 'Select',
					fieldId: this.options.fieldId,
					fieldClass: this.options.fieldClass,
					label: this.options.label,
					name: this.options.name,
					tooltip: this.options.tooltip,
					disabled: this.options.disabled,
				});
			}


			if (this.options.selectField) {
				this.selectImageField.show(this.selectView);
				this.autocompleteCode.show(this.autocompleteView);
			}
		},
		onShow: function () {
			if (this.options.selectField) {
				this.autocompleteView.onShow();
			}
		}
	});

	// the upload field for ImageSingleField
	View.ImageSingleFieldUpload = Backbone.Marionette.ItemView.extend({
		template: function(data) {
			var options = data.options
			var tmplStr = '';
			tmplStr += '<label for="' + options.fieldId + 'Upload">' + options.label;
			if(options.tooltip) {
				tmplStr += '<span data-tooltip class="has-tip tip-right" title="' + options.tooltip + '"></span>';
			}
			tmplStr += '</label>';
			tmplStr += '<input name="' + options.name + '_upload" type="file" id="' + options.fieldId + 'Upload" class="';
			if(options.fieldClass != null && options.fieldClass != "") {
				tmplStr += options.fieldClass + " ";
			}
			tmplStr += 'image-field"';
			if (options.disabled) {
				tmplStr += ' disabled';
			}
			tmplStr += '></input>';
			return tmplStr;
		},
		onRender: function() {
			this.listenTo(this.options.model, 'fileModel:fileModelUpdated', function() {
				this.trigger('trigger:updatePreviewUpload');
			});
		},
		events: {
			'change .image-field': 'updatePreviewUpload',
			'click .image-field': 'checkCamera',
		},
		model: null,
		options: {
			fieldId: null,
			fieldClass: null,
			name: null,
			tooltip: null,
			placeholder: null,
			label: null,
			disabled: false,
			allowNativeManipulation: false,
		},
		updatePreviewUpload: function (e) {
			this.$el.find('#' + this.options.fieldId + 'Select').val('');
			this.model.setFromFile(e.target.files[0], this.$el.parents('fieldset').find('#' + this.options.fieldId + 'PreviewFile'), this.options.name);
		},
		checkCamera: function (e) {
			var that = this;
			var model = this.model;
			var fieldId = this.options.fieldId;
			if (navigator && navigator.camera) {
				e.preventDefault();
				var options = {
					androidTheme: plugins.actionsheet.ANDROID_THEMES.THEME_DEVICE_DEFAULT_DARK,
					title: 'Please Select',
					buttonLabels: ['Pick from Photo Library', 'Take a Photo'],
					androidEnableCancelButton: true,
					addCancelButtonWithLabel: 'Cancel',
				};
				var callback = function(buttonIndex) {
					if (buttonIndex < 1 || buttonIndex > 2) {
						return;
					}
					navigator.camera.getPicture(function (imgData) {
						try {
							// If the cordova-plugin-camera-with-exif plugin is used, imgData will be a JSON object,
							// so, pull out the Base64 string
							var jsonImgData = JSON.parse(imgData);
							if (jsonImgData) {
								imgData = jsonImgData.filename;
							}
						} catch (err) {
							// If the cordova-plugin-camera plugin is used, imgData will already be a Base64 string
						}
						model.setFromFile(imgData, fieldId, that.options.name);
					}, function () {}, {
						quality: 70,
						destinationType: Camera.DestinationType.DATA_URL,
						sourceType: buttonIndex-1, // 0:Photo Library, 1=Camera, 2=Saved Album
						encodingType: 0, // 0=JPG 1=PNG
						correctOrientation: true,
						targetWidth: 800,
						targetHeight: 800,
						allowEdit: that.options.allowNativeManipulation,
					});
				}
				if (window.plugins && window.plugins.actionsheet) {
					plugins.actionsheet.show(options, callback);
				} else {
					// assume "camera"
					callback(2);
				}
			}
		},
		templateHelpers: function () {
			return {
				model: this.model,
				options: {
					fieldId: this.options.fieldId,
					fieldClass: this.options.fieldClass,
					name: this.options.name,
					placeholder: this.options.placeholder,
					tooltip: this.options.tooltip,
					label: this.options.label,
					disabled: this.options.disabled,
				}
			}
		},
	});

	// the select field for ImageSingleField
	View.ImageSingleFieldSelect = Backbone.Marionette.ItemView.extend({
		template: _.template('<label for="<%=options.fieldId%>Select">Select an Image<span data-tooltip class="has-tip tip-right" title="Select from a list of current images."></span><input name="<%=options.name%>_select" type="text" id="<%=options.fieldId%>Select"<% if (options.fieldClass != null) { %> class="<%=options.fieldClass%>"<% } %>/></label>'),
		model: null,
		options: {
			fieldId: null,
			fieldClass: null,
			name: null,
			tooltip: null,
			placeholder: null,
			label: null,
		},
		templateHelpers: function () {
			return {
				model: this.model,
				options: {
					fieldId: this.options.fieldId,
					fieldClass: this.options.fieldClass,
					name: this.options.name,
					placeholder: this.options.placeholder,
					tooltip: this.options.tooltip,
					label: this.options.label,
				}
			}
		},
	});

	// the AutoCompleteItemView for ImageSingleField
	View.SingleImageAutoCompleteItemView = View.AutoCompleteItemViewBase.extend({
		tagName: "li",
		template: null,
		initialize: function (options) {
			var tmplStr = '<a style="position: relative;"><img src="/site/img/';
			if (this.model.get('plugin_id') && this.model.get('plugin_id') != 0) {
				tmplStr += this.model.get('plugin_id') + '/';
			}
			tmplStr += 'thumb_' + this.model.get('file') + '" style="height: 50px;" /><div style="display: inline; height: 50px; padding-left: 20px;">' + this.model.get('alt') + '</div></a>';
			this.template = _.template(tmplStr);

			this.options = options;
		},
		render: function () {
			this.$el.html(this.template({
				"file": this.model.file(),
				"label": this.model.label()
			}));
			return this;
		},

	});

	// the AutoCompleteView for ImageSingleField
	View.SingleImageAutoCompleteView = View.AutoCompleteViewBase.extend({

		itemView: View.SingleImageAutoCompleteItemView,
		minKeywordLength: 0,

		loadResult: function (model, keyword) {
			this.currentText = keyword;
			this.show().reset();
			if (model.length) {
				$(this.input).attr('style', 'margin-bottom: 0rem;');
				_.forEach(model, this.addItem, this);
				this.show();
			} else {
				this.hide();
			}
		},

		select: function (model) {
			var label = model.label();
			$(this.input).val(label);
			this.currentText = label;
			this.onSelect(model);
			$(this.input).attr('style', 'margin-bottom: 0.5rem;');
		},

		// callback definitions
		onSelect: function (model) {
			$('#' + this.fieldId + 'Upload').val('');
			this.selectModel.setFromSelect(model, this.$el.find('#' + this.fieldId), this.$el.find('#' + this.fieldId + 'PreviewFile'));
		}
	});

	/**
	 * Extend the Layout View to make a Image Collection field
	 */
	View.ImageCollectionField = WMAPP.Extension.View.LayoutView.extend({
		template: _.template('<fieldset><legend><%=options.label%></legend><div class="wmapp-image-collection-field-upload-image"></div><div class="wmapp-image-collection-wrapper" style="margin-right: 5px;"><div class="wmapp-image-collection-field-available-images"></div></div><div class="wmapp-image-collection-wrapper" style="margin-right: 5px;"><div class="wmapp-image-collection-field-current-images"></div></div></fieldset>'), //<input name="<%=options.name%>" type="hidden" id="<%=options.fieldId%>"/>
		regions: {
			uploadImageField: '.wmapp-image-collection-field-upload-image',
			availableImagesField: '.wmapp-image-collection-field-available-images',
			currentImagesField: '.wmapp-image-collection-field-current-images',
		},
		initialize: function () {
			// empty
		},
		uploadImageField: null,
		availableImagesField: null,
		currentImagesField: null,
		model: null,
		options: {
			fieldId: null,
			fieldClass: null,
			name: null,
			tooltip: null,
			placeholder: null,
			label: null,
			options: null,
			fileField: 'file',
			labelField: 'name',
			availableImages: null,
			displayAvailableImages: true
		},
		templateHelpers: function () {
			return {
				model: this.model,
				options: {
					fieldId: this.options.fieldId,
					fieldClass: this.options.fieldClass,
					name: this.options.name,
					placeholder: this.options.placeholder,
					tooltip: this.options.tooltip,
					label: this.options.label,
					options: this.options.options,
					fileField: this.options.fileField,
					labelField: this.options.labelField,
					displayAvailableImages: this.options.displayAvailableImages
				}
			}
		},
		onRender: function () {
			this.uploadField = new WMAPP.Extension.View.ImageCollectionFieldUpload({
				//model: this.model,
				collection: this.model.get('_' + this.options.name),
				fieldId: this.options.fieldId,
				fieldClass: this.options.fieldClass,
				label: this.options.label,
				name: this.options.name,
				tooltip: this.options.tooltip,
				uploadUrl: this.options.uploadUrl,
			});

			this.availableField = new WMAPP.Extension.View.ImageCollectionFieldAvailable({
				collection: this.options.availableImages,
				fieldId: this.options.fieldId,
				fieldClass: this.options.fieldClass,
				label: this.options.label,
				name: this.options.name,
				tooltip: this.options.tooltip
			});

			this.currentField = new WMAPP.Extension.View.ImageCollectionFieldCurrent({
				model: this.model,
				collection: this.model.get('_' + this.options.name),
				fieldId: this.options.fieldId,
				fieldClass: this.options.fieldClass,
				label: this.options.label,
				name: this.options.name,
				tooltip: this.options.tooltip
			});

			this.uploadImageField.show(this.uploadField);
			if (this.options.displayAvailableImages) {
				this.availableImagesField.show(this.availableField);
			}

			this.currentImagesField.show(this.currentField);
		},
		onShow: function () {
			//this.uploadField.afterRender();
			this.availableField.afterRender();
			this.currentField.afterRender();
		}
	});

	// the upload field for ImageCollectionField
	View.ImageCollectionFieldUpload = Backbone.Marionette.ItemView.extend({
		template: _.template('<div style="position: relative; clear: both; height: 30px;"><a class="button success" id="wmappImageCollectionUploadLink" href="#" style="position: absolute; z-index: 1; top: 0; left: 0; cursor: pointer;"> Upload Images... </a><input type="file" name="files[]" id="wmappImageCollectionUpload" multiple style="position: absolute; margin: 0; border: solid transparent; opacity: 0; filter: alpha(opacity =   0); direction: ltr; cursor: pointer; z-index: 2; top: 0; left: 0; width: 110px; height: 27px;"></div><br /><div id="wmappImageCollectionUploadProgress"><div class="bar" style="background: url(\'/img/progressbar.gif\'); height: 22px; width: 0%;"></div></div>'),
		model: null,
		initialize: function (options) {
			// Create the file list
			this.files = new WMAPP.Core.Model.ImageCollection();

			// Create the file-upload wrapper
			this.uploadProcess = $('<input id="wmappImageCollectionUpload" type="file" name="files[]" multiple="multiple">').fileupload({
				dataType: 'json',
				dropZone: null,
				url: options.uploadUrl,
				autoUpload: true,
				singleFileUploads: true
			});

			// Add local events handlers
			// this.bindLocal();
		},
		options: {
			fieldId: null,
			fieldClass: null,
			name: null,
			tooltip: null,
			placeholder: null,
			label: null,
		},
		templateHelpers: function () {
			return {
				model: this.model,
				options: {
					fieldId: this.options.fieldId,
					fieldClass: this.options.fieldClass,
					name: this.options.name,
					placeholder: this.options.placeholder,
					tooltip: this.options.tooltip,
					label: this.options.label,
				}
			}
		},

		onShow: function () {
			self = this;

			// Add add files handler
			var input = $('input#wmappImageCollectionUpload', this.el),
				self = this;
			input.on('change', function () {
				self.uploadProcess.fileupload('add', {
					fileInput: $(this)
				});
			});

			// Add upload process events handlers
			this.uploadProcess.on('fileuploadstart', function (e, data) {
				$('#wmappImageCollectionUploadProgress .bar').fadeIn();
			}).on('fileuploaddone', function (e, data) {
				// add the uploaded file to the collection?
				var image = new WMAPP.Core.Model.Image(data.result);
				self.collection.add(image);
			}).on('fileuploadprogressall', function (e, data) {
				var progress = parseInt(data.loaded / data.total * 100, 10);
				$('#wmappImageCollectionUploadProgress .bar').css('width', progress + '%');
			}).on('fileuploadstop', function (e, data) {
				$('#wmappImageCollectionUploadProgress .bar').fadeOut();
			});
		}
	});

	// the item view for ImageCollectionFieldAvailable
	View.ImageCollectionFieldAvailableItem = WMAPP.Extension.View.ItemView.extend({
		tagName: 'tr',
		className: 'wmapp-image-collection-image',
		template: null,
		initialize: function (options) {
			var tmplStr = '<td style="text-align:left"><img src="/site/img/';
			if (this.model.get('plugin_id') && this.model.get('plugin_id') != 0) {
				tmplStr += this.model.get('plugin_id') + '/';
			}

			tmplStr += 'thumb_' + this.model.get('file') + '" style="width:25px; height:25px; float:left" title="' + this.model.get('alt') + '" /></td><td style="text-align:left"><input type="text" class="input-text medium input-text" size="50" value="' + this.model.get('alt') + '" disabled="disabled"></td><td style="text-align:left"><a class="wmapp-edit-button button small edit disabled" title="Set as Default">Set as Default</a></td>';
			this.template = _.template(tmplStr);
		},
		onRender: function () {
			this.$el.attr("data-model-cid", this.model.cid);
		},
	});

	View.ImageCollectionFieldAvailable = WMAPP.Extension.View.SortableCompositeView.extend({
		tagName: "table",
		className: "wmapp-table",
		id: "wmappImageCollectionAvailable",
		template: _.template('<thead><tr><th>&nbsp;</th><th colspan="2">Available Images</th></tr></thead><tbody id="wmappImageCollectionAvailableImages" class="wmapp-image-collecton-images"></tbody>'),
		childView: View.ImageCollectionFieldAvailableItem,
		itemViewContainer: "tbody",
		onRender: function () {
			var html = '<tr class="not-sortable"><td style="text-align:center" colspan="3"><p>Drop here</p></td></tr>';
			this.$el.find('tbody').prepend(html);
		},
		afterRender: function () {
			var self = this;

			$('#wmappImageCollectionAvailable tbody').data("view", this); // needed for connected sortable lists

			$('#wmappImageCollectionAvailable tbody').sortable({
				connectWith: ".wmapp-image-collecton-images",
				dropOnEmpty: true,
				items: "tr.wmapp-image-collection-image",
				stop: _.bind(self._sortStop, self),
				receive: _.bind(self._receive, self),
			});
		}
	});

	// the item view for ImageCollectionFieldAvailable
	View.ImageCollectionFieldCurrentItem = WMAPP.Extension.View.LayoutView.extend({
		tagName: 'tr',
		className: 'wmapp-image-collection-image',
		template: function (data) {
			var tmplStr = '<td colspan="3">' +
				'<div class="row">' +
				'<div class="small-2 columns">' +
				'<img src="/site/img/';
			if (data.plugin_id) {
				tmplStr += data.plugin_id + '/';
			}
			tmplStr += 'thumb_' + data.file + '" title="' + data.alt + '"/>' + //style="width:25px; height:25px; float:left"
				'</div>' +
				'<div class="small-7 columns">' +
				'<input type="text" class="input-text medium input-text" size="50" value="' + data.alt +
				'" disabled="disabled">' +
				'</div>' +
				'<div class="small-3 columns">' +
				'<a class="wmapp-default-button button small edit';
			if (data._default == 1) {
				tmplStr += ' disabled';
			}
			tmplStr += '" title="Set as Default">Set as Default</a>' +
				'</div>' +
				'</div>' +

				'<div class="row"><div class="wmapp-image-collection-image-link"></div>' +
				'</div>' +
				'</td>';

			return tmplStr;
		},
		initialize: function (options) {
			this.model.bind("change", this.setDefault, this);
			if (this.model) {
				Backbone.Validation.bind(this);
			}
			this.options.layoutId = 'ImageTextField';
		},
		ui: {
			'editField': '.wmapp-image-collection-image-link-edit',
		},

		events: {
			'click .wmapp-default-button': 'onDefault'
		},

		templateHelpers: function () {
			return {
				model: this.model,
				layoutId: this.options.layoutId
			}
		},

		regions: {
			'linkField': '.wmapp-image-collection-image-link'
		},

		onDefault: function (e) {
			e.preventDefault();
			if (this.model.get('_default') == 0) {
				// trigger something in list (parent) view
				this.trigger("default", this);

				this.model.set('_default', 1);
			}
		},

		setDefault: function (model) {
			if (model.get('_default') == 0) {
				this.$el.find('a.wmapp-default-button').removeClass('disabled');
			} else {
				this.$el.find('a.wmapp-default-button').addClass('disabled');
			}
		},
		onRender: function () {
			this.$el.attr("data-model-cid", this.model.cid);

			var linkTextField = new WMAPP.Extension.View.TextField({
				model: this.model,
				fieldId: this.options.layoutId + 'Link' + this.model.cid,
				fieldClass: '',
				fieldType: 'text',
				placeholder: 'Link',
				name: 'link',
			});

			this.linkField.show(linkTextField);
		},
	});

	View.ImageCollectionFieldCurrent = WMAPP.Extension.View.SortableCompositeView.extend({
		tagName: "table",
		className: "wmapp-table",
		id: "wmappImageCollectionCurrent",
		template: _.template('<thead><tr><th>&nbsp;</th><th colspan="2">Current Images</th></tr></thead><tbody id="wmappImageCollectionCurrentImages" class="wmapp-image-collecton-images" style="min-height: 50px;"></tbody>'),
		childView: View.ImageCollectionFieldCurrentItem,
		itemViewContainer: "tbody",
		initialize: function () {
			this.on('childview:default', function (view) {
				this.onDefault(view);
			});

			if (this.collection) {
				this.collection.bind("remove", this.removeImage, this);
				this.collection.bind("add", this.addImage, this);
			}
		},
		onDefault: function (view) {
			if (this.collection && this.collection.models) {
				_.each(this.collection.models, function (model) {
					model.set('_default', 0);
				});
			}
		},
		addImage: function (model) {
			if (this.collection.length == 1) {
				model.set('_default', 1);
			} else {
				model.set('_default', 0);
			}
		},
		removeImage: function (model) {
			// check if the removed model was the default.
			if (model.get('_default') == 1) {
				model.set('_default', 0);

				// if there are still models in the collection, make the first one the default.
				if (this.collection.length >= 1) {
					this.collection.first().set('_default', 1);
				}
			}
		},
		onRender: function () {
			var html = '<tr class="not-sortable"><td style="text-align:center" colspan="3"><p>Drop here</p></td></tr>';
			this.$el.find('tbody').prepend(html);
		},
		afterRender: function () {
			self = this;

			$('#wmappImageCollectionCurrent tbody').data("view", this); // needed for connected sortable lists

			$('#wmappImageCollectionCurrent tbody').sortable({
				connectWith: ".wmapp-image-collecton-images",
				dropOnEmpty: true,
				items: "tr.wmapp-image-collection-image",
				stop: _.bind(self._sortStop, self),
				receive: _.bind(self._receive, self),
			});
		}
	});

	/**
	 * Extend the Layout View ro make a Multiple File upload field
	*/

	View.FileMultipleField = WMAPP.Extension.View.ItemView.extend({
		template: function (data) {
			var options = data.options;
			var file = data.model;
			var styleColor = '';

			var tmplStr = '<div style="height: 100%; vertical-align: top;">';
			tmplStr += '<label>';

			tmplStr += '<div id="' + options.fieldId + 'File"></div>' +  file.get('name') ;
			tmplStr += '<input name="' + options.name + '" type="hidden" id="' + options.fieldId + '" value="';


			if (file && file.get('id')) {
				tmplStr += file.get('id');
			}
			tmplStr += '" /></label>';

			tmplStr += '<div></div>';
			tmplStr += '<div id="' + options.fieldId  + 'PreviewMultipleFile" style="padding-left: 5px;">';

			tmplStr += '<a class="multiplefile button tiny alert right">X</a>';

			if (file.get('file')) {
				if (file.get('id')) {
					if (file.get('plugin_id') && file.get('plugin_id') != 0) {
						var href = '/site/files/' + file.get('plugin_id') + '/' + file.get('file');
					} else {
						var href = '/site/files/' + file.get('file');
					}
					if (WMAPP.isApp) {
						href = 'https://' + WMAPP.domain + href;
					}
					tmplStr += '<a href="' + href + '" target="_blank">';
				} else if (file.get('data')) {
					if(file.get('data').includes('%')){
						 if(!WMAPP.isOnline && file.get('file')){
						 		href = 'https://' + WMAPP.domain + '/site/files/' + file.get('file');
								file.set('data', null);
						 } else {
							 file.set('data', decodeURIComponent(file.get('data')));
							 href = file.get('data');
						 }
					} else {
						href = file.get('data');
					}
				}

				if (file.get('type') && file.get('type').indexOf('image/') === 0) {
					// file is an image, so display it
					if (WMAPP.isApp) {
						// by using an object for the image, we can set a "default" image inside for when the main image can't be loaded.
						// Neat, huh? :)
						tmplStr += '<object data="' + href + '" type="' + file.get('type') + '"><img src="img/offline.svg" /><span>File unavailable offline</span></object>';
					} else {
						// don't do our neat hack from above for a browser. It's not worthy!
						tmplStr += '<img src="' + href + '" />';
					}
				} else {
					// otherwise show the file type icon
					var icon = file.get('file') ? file.get('file').split('.').pop() : file.get('type');
					tmplStr += '<img src="'+(WMAPP.isApp ? 'img/file-types' : '/img/icons/file_types')+'/' + icon + '.png" style="width: 30px;" />' + file.get('file');
				}


				if (file.get('id')) {
					tmplStr += '</a>';

				}

				tmplStr += '</div>';

			}
			return tmplStr;
		},

		templateHelpers: function () {
			return {
				model: this.model,
				options: {
					fieldId: this.options.fieldId,
					fieldClass: this.options.fieldClass,
					name: this.options.name,
					placeholder: this.options.placeholder,
					tooltip: this.options.tooltip,
					label: this.options.label,
					options: this.options.options,
					fileField: this.options.fileField,
					labelField: this.options.labelField,
					selectField: this.options.selectField,
					showPreview: this.options.showPreview,
				}
			}
		},

		onRender: function () {

		},
		triggers: {
			'click a.multiplefile.button.alert': 'trigger:file:destroy'
		},


	});

	//Composite View for Multiple Fileupload

	// the upload field for ImageSingleField (For multiple Fileupload)

	View.FileMultipleFieldUpload = Backbone.Marionette.CompositeView.extend({
		className: 'file-multiple-field-upload',
		initialize: function (options) {
			var that = this;

			this.on('childview:trigger:file:destroy', this.removeFile);
			if (this.model) {
				Backbone.Validation.bind(this);
			}

			this.options.layoutId = this.options.fieldId + 'FileId' + this.options.id;
			this.collection = this.model.get('_' + this.options.name);
			if(this.collection.length == 1){
				if(this.collection.models[0].get('file') == null){
					this.collection.reset();
				}
			}
			this.listenTo(this.model.get('_' + this.options.name), 'add', function(model, collection) {
				model.set(that.options.name, model.get('id'));
			}, this);

			//this.render();

		},
		template: function(options){
			var options = options.options;

			var tmplStr = '<fieldset><legend>';
			if(options.textColor){
                    styleColor = 'color:'+options.textColor;
            }
			tmplStr +=  '<span style="' + options.styleColor + '" class="wmapp-input-title">' + options.label + '</span>' + '</legend>' +
				'<div class="wmapp-file-single-field-upload-file">';
			tmplStr += '<label for="'+options.fieldId +'Upload">' +options.label ;
			if (options.tooltip) {
				tmplStr += '<span data-tooltip class="has-tip tip-right" title="' + options.tooltip + '"></span>';

			}
			tmplStr += '<input name="' +options.name +'_upload" type="file" id="' + options.fieldId +'Upload" class="';
			if(options.fieldClass != null){
				tmplStr += options.fieldClass;
			}

			tmplStr += ' wmapp-multiple-file-field"/></label>';
			tmplStr += '</div>';

			if (options.showPreview) {

				tmplStr +=	'<div class="wm-admin-preview-element"></div></div></fieldset>';
			}
			return tmplStr;
		},

		model: null,
		collection: null,
		options: {
			fieldId: null,
			fieldClass: null,
			name: null,
			tooltip: null,
			placeholder: null,
			label: null,
			options: null,
			fileField: 'file',
			labelField: 'name',
			selectField: true,
			required: false,
			showPreview: true,
			allowNativeManipulation: false,
		},
		events: {
			'change .wmapp-multiple-file-field': 'updatePreviewUpload',
			'click .wmapp--multiple-file-field': 'checkCamera',
			'click a.button.alert': 'removeFile',
		},
		//Add file into collection
		updatePreviewUpload: function (e) {
			var that = this;

			if (this.collection){
					var model = new WMAPP.Core.Model.File();
					model.setFromFile(e.target.files[0], that.$el.parents('fieldset').find('#' + that.options.fieldId + (this.collection.length+1) + 'PreviewFile'), that.options.name);
					this.collection.add(model);
					this.collection.trigger('sync');
					this.listenTo(model, 'fileModel:fileModelUpdated', function() {
						that.trigger('fileMultipleFieldUpload:newFileAdded');
					});
			}
		},

		//Add file into collection using mobile app
		checkCamera: function (e) {
			var that = this;
			var fileModel = new WMAPP.Core.Model.File();
			var model = this.collection
				var fieldId = this.options.fieldId;
				if (navigator && navigator.camera) {
					e.preventDefault();
					var options = {
						androidTheme: plugins.actionsheet.ANDROID_THEMES.THEME_DEVICE_DEFAULT_DARK,
						title: 'Please Select',
						buttonLabels: ['Pick from Photo Library', 'Take a Photo'],
						androidEnableCancelButton: true,
						addCancelButtonWithLabel: 'Cancel',
					};
					var callback = function(buttonIndex) {
						if (buttonIndex < 1 || buttonIndex > 2) {
							return;
						}
						navigator.camera.getPicture(function (imgData) {
							try {
								// If the cordova-plugin-camera-with-exif plugin is used, imgData will be a JSON object,
								// so, pull out the Base64 string
								var jsonImgData = JSON.parse(imgData);
								if (jsonImgData) {
									imgData = jsonImgData.filename;
								}
							} catch (err) {
								// If the cordova-plugin-camera plugin is used, imgData will already be a Base64 string
							}
							fieldId = fieldId + (model.length + 1);
							fileModel.setFromFile(imgData, fieldId);
							model.add(fileModel);
							model.trigger('sync');
						}, function () {}, {
							quality: 70,
							destinationType: Camera.DestinationType.DATA_URL,
							sourceType: buttonIndex-1, // 0:Photo Library, 1=Camera, 2=Saved Album
							encodingType: 0, // 0=JPG 1=PNG
							correctOrientation: true,
							targetWidth: 800,
							targetHeight: 800,
							allowEdit: that.options.allowNativeManipulation,
						});
					}
					if (window.plugins && window.plugins.actionsheet) {
						plugins.actionsheet.show(options, callback);
					} else {
						// assume "camera"
						callback(2);
					}
				}


		},
		templateHelpers: function () {
			return {
				model: this.model,
				options: {
					fieldId: this.options.fieldId,
					fieldClass: this.options.fieldClass,
					name: this.options.name,
					placeholder: this.options.placeholder,
					tooltip: this.options.tooltip,
					label: this.options.label,
					options: this.options.options,
					fileField: this.options.fileField,
					labelField: this.options.labelField,
					selectField: this.options.selectField,
					showPreview: this.options.showPreview,
				}
			}
		},
		childView: View.FileMultipleField,
		childViewOptions: function() {
			return {
				fieldId: this.options.fieldId,
				fieldClass: this.options.fieldClass,
				name: this.options.name,
				placeholder: this.options.placeholder,
				tooltip: this.options.tooltip,
				label: this.options.label,
				options: this.options.options,
				fileField: this.options.fileField,
				labelField: this.options.labelField,
				selectField: this.options.selectField,
				showPreview: this.options.showPreview,
				collection: this.collection
			}
		},
		//Remove file from collection
		removeFile: function(childView, args){
			if(args.model.id){
				this.collection.remove(args.model);
				if(this.model.get(this.options.name)) {
					var removedIds = _.without(this.model.get(this.options.name), args.model.id);
					this.model.set(this.options.name, removedIds);
				}
			} else {
				this.collection.remove(args.model.cid);
		    }
			this.collection.trigger('sync');
			this.trigger('fileMultipleFieldUpload:fileRemoved');
		},
		onShow: function () {
			var model = this.model.get('_' + this.options.name);

			if(model && model.get('data')){
					var collection = this.model.get('_' + this.options.name);
					this.$el.find('#' + this.options.fieldId + 'Upload').val('');
					var count = 1;
					if(collection && collection.length > 0){
						collection.each(function(model){
							model.setFromData( model, that.$el.find('#' + that.options.fieldId), that.$el.find('#' + that.options.fieldId + (count) + 'PreviewFile'));
							count++;
						});
					}
			}

		},


	});

	/**
	 * Extend the Layout View to make a Single File upload field
	 */
	View.FileSingleField = WMAPP.Extension.View.LayoutView.extend({
		template: function (data) {
			var options = data.options;
			var model = data.model.get('_' + options.name);
			var styleColor = '';
			var tmplStr = '<fieldset id="' + options.fieldId + '"><legend>';
			if(options.textColor){
                    styleColor = 'color:'+options.textColor;
            }
			tmplStr +=  '<span style="' + styleColor + '" class="wmapp-input-title">' + options.label + '</span>' + '</legend>' +
				'<div class="wmapp-file-single-field-upload-file"></div>' +
				'<div id="' + options.fieldId + 'Progress"></div>' +
				'<div class="wmapp-file-single-field-select-file"></div>' +
				'<div class="wmapp-file-single-field-select-file-autocomplete"></div>';
			if (options.showPreview) {
				tmplStr +=	'<div class="wm-admin-preview-element">' +
							'<div style="height: 100%; vertical-align: top;">' +
							'<label>' +
							'<div id="' + options.fieldId + 'File"></div>' + options.label + ' Preview' +
							'<input name="' + options.name + '" type="hidden" id="' + options.fieldId + '" value="';
				if (model && model.get('id')) {
					tmplStr += model.get('id');
				}
				tmplStr += '" /><div id="' + options.fieldId + 'PreviewFile" style="padding-left: 5px;">';

				if (model.get('file')) {
					if (model.get('id')) {
						if (model.get('plugin_id') && model.get('plugin_id') != 0) {
							var href = '/site/files/' + model.get('plugin_id') + '/' + model.get('file');
						} else {
							var href = '/site/files/' + model.get('file');
						}
						if (WMAPP.isApp) {
							href = 'https://' + WMAPP.domain + href;
						}
						tmplStr += '<a href="' + href + '" target="_blank">';
					} else if (model.get('data')) {
						if(model.get('data').includes('%')){
							 if(!WMAPP.isOnline && model.get('file')){
							 		href = 'https://' + WMAPP.domain + '/site/files/' + model.get('file');
									model.set('data', null);
							 } else {
								 model.set('data', decodeURIComponent(model.get('data')));
								 href = model.get('data');
							 }
						} else {
							href = model.get('data');
						}
					}

					if (model.get('type') && model.get('type').indexOf('image/') === 0) {
						// file is an image, so display it
						if (WMAPP.isApp) {
							// by using an object for the image, we can set a "default" image inside for when the main image can't be loaded.
							// Neat, huh? :)
							tmplStr += '<object data="' + href + '" type="' + model.get('type') + '"><img src="img/offline.svg" /><span>File unavailable offline</span></object>';
						} else {
							// don't do our neat hack from above for a browser. It's not worthy!
							tmplStr += '<img src="' + href + '" />';
						}
					} else {
						// otherwise show the file type icon
						var icon = model.get('file') ? model.get('file').split('.').pop() : model.get('type');
						tmplStr += '<img src="'+(WMAPP.isApp ? 'img/file-types' : '/img/icons/file_types')+'/' + icon + '.png" style="width: 30px;" />' + model.get('file');
					}


					if (model.get('id')) {
						tmplStr += '</a>';
					}
				}

				tmplStr += '</div>' +
					'</div>' +
					'</label>' +
					'</div>' +
					'</div>';
			}
			tmplStr +=	'</fieldset>';

			return tmplStr;
		},
		initialize: function (options) {
			var that = this;

			if (this.model) {
				Backbone.Validation.bind(this, {
					model: this.model.get('_' + this.options.name)
				});
			}

			this.options.layoutId = this.options.fieldId + 'FileId';
			this.listenTo(this.model.get('_' + this.options.name), 'change', function () {
				that.model.set(that.options.name, that.model.get('_' + that.options.name).get('id'));
				//that.render();
			}, this);
		},
		regions: {
			uploadFileField: '.wmapp-file-single-field-upload-file',
			selectFileField: '.wmapp-file-single-field-select-file',
			autocompleteCode: '.wmapp-file-single-field-select-file-autocomplete',
		},
		uploadFileField: null,
		selectFileField: null,
		autocompleteCode: null,
		model: null,
		options: {
			fieldId: null,
			fieldClass: null,
			name: null,
			tooltip: null,
			placeholder: null,
			label: null,
			options: null,
			fileField: 'file',
			labelField: 'name',
			selectField: true,
			required: false,
			showPreview: true,
			allowNativeManipulation: false,
		},
		templateHelpers: function () {
			return {
				model: this.model,
				options: {
					fieldId: this.options.fieldId,
					fieldClass: this.options.fieldClass,
					name: this.options.name,
					placeholder: this.options.placeholder,
					tooltip: this.options.tooltip,
					label: this.options.label,
					options: this.options.options,
					fileField: this.options.fileField,
					labelField: this.options.labelField,
					selectField: this.options.selectField,
					showPreview: this.options.showPreview,
				}
			}
		},
		onRender: function () {
			var model = this.model.get('_' + this.options.name);

			this.uploadView = new WMAPP.Extension.View.FileSingleFieldUpload({
				model: model,
				fieldId: this.options.fieldId,
				fieldClass: this.options.fieldClass,
				label: this.options.label,
				name: this.options.name,
				tooltip: this.options.tooltip,
				allowNativeManipulation: this.options.allowNativeManipulation,
			});

			if (this.options.selectField) {
				this.selectView = new WMAPP.Extension.View.FileSingleFieldSelect({
					model: model,
					fieldId: this.options.fieldId,
					fieldClass: this.options.fieldClass,
					label: this.options.label,
					name: this.options.name,
					tooltip: this.options.tooltip
				});

				this.autocompleteView = new WMAPP.Extension.View.SingleFileAutoCompleteView({
					model: this.options.options,
					selectModel: model,
					selectField: this.options.name,
					queryParameter: 'Files_name',
					input: '#' + this.options.fieldId + 'Select',
					fieldId: this.options.fieldId,
					fieldClass: this.options.fieldClass,
					label: this.options.label,
					name: this.options.name,
					tooltip: this.options.tooltip,
				});

				this.selectFileField.show(this.selectView);
				this.autocompleteCode.show(this.autocompleteView);
			}

			this.uploadFileField.show(this.uploadView);
		},
		onShow: function () {
			var model = this.model.get('_' + this.options.name);

			if (model && model.get('data')) {
				this.$el.find('#' + this.options.fieldId + 'Upload').val('');
				model.setFromData( model, this.$el.find('#' + this.options.fieldId), this.$el.find('#' + this.options.fieldId + 'PreviewFile'));
			}
		}
	});

	// the upload field for FileSingleField
	View.FileSingleFieldUpload = Backbone.Marionette.ItemView.extend({
		template: function(data) {
			var options = data.options
			var tmplStr = '';
			tmplStr += '<label for="' + options.fieldId + 'Upload">' + options.label;
			if(options.tooltip) {
				tmplStr += '<span data-tooltip class="has-tip tip-right" title="' + options.tooltip + '"></span>';
			}
			tmplStr += '</label>';
			tmplStr += '<input name="' + options.name + '_upload" type="file" id="' + options.fieldId + 'Upload" class="';
			if(options.fieldClass != null && options.fieldClass != "") {
				tmplStr += options.fieldClass + " ";
			}
			tmplStr += 'wmapp-file-field"';
			if (options.disabled) {
				tmplStr += ' disabled';
			}
			tmplStr += '></input>';
			return tmplStr;
		},
		events: {
			'change .wmapp-file-field': 'updatePreviewUpload',
			'click .wmapp-file-field': 'checkCamera',
		},
		model: null,
		options: {
			fieldId: null,
			fieldClass: null,
			name: null,
			tooltip: null,
			placeholder: null,
			label: null,
			allowNativeManipulation: false,
		},
		updatePreviewUpload: function (e) {
			var that = this;
			if(this.options.updateLabel) {
				var input = this.$el.find('input');
				var that = this;

				var label = this.$el.find('label');
				var labelVal = label.html();
				var fileName = '';
				if( this.files && this.files.length > 1 ) {
					fileName = ( this.getAttribute( 'data-multiple-caption' ) || '' ).replace( '{count}', this.files.length );
				}
				else {
					fileName = e.target.value.split( '\\' ).pop();
				}
				if( fileName ) {
					label.text(fileName);
				}
			}
			this.$el.find('#' + this.options.fieldId + 'Select').val('');
			this.model.setFromFile(e.target.files[0], this.$el.parents('fieldset').find('#' + this.options.fieldId + 'PreviewFile'), this.options.name);
		},
		checkCamera: function (e) {
			var that = this;
			var model = this.model;
			var fieldId = this.options.fieldId;

			console.log('BALLS');
			if (navigator && navigator.camera) {
				e.preventDefault();
				var options = {
					androidTheme: plugins.actionsheet.ANDROID_THEMES.THEME_DEVICE_DEFAULT_DARK,
					title: 'Please Select',
					buttonLabels: ['Pick from Photo Library', 'Take a Photo'],
					androidEnableCancelButton: true,
					addCancelButtonWithLabel: 'Cancel',
				};
				var callback = function(buttonIndex) {
					if (buttonIndex < 1 || buttonIndex > 2) {
						return;
					}
					navigator.camera.getPicture(function (imgData) {
						try {
							// If the cordova-plugin-camera-with-exif plugin is used, imgData will be a JSON object,
							// so, pull out the Base64 string
							var jsonImgData = JSON.parse(imgData);
							if (jsonImgData) {
								imgData = jsonImgData.filename;
							}
						} catch (err) {
							// If the cordova-plugin-camera plugin is used, imgData will already be a Base64 string
						}
						model.setFromFile(imgData, fieldId);
					}, function () {}, {
						quality: 70,
						destinationType: Camera.DestinationType.DATA_URL,
						sourceType: buttonIndex-1, // 0:Photo Library, 1=Camera, 2=Saved Album
						encodingType: 0, // 0=JPG 1=PNG
						correctOrientation: true,
						targetWidth: 800,
						targetHeight: 800,
						allowEdit: that.options.allowNativeManipulation,
					});
				}
				if (window.plugins && window.plugins.actionsheet) {
					plugins.actionsheet.show(options, callback);
				} else {
					// assume "camera"
					callback(2);
				}
			}
		},
		templateHelpers: function () {
			return {
				model: this.model,
				options: {
					fieldId: this.options.fieldId,
					fieldClass: this.options.fieldClass,
					name: this.options.name,
					placeholder: this.options.placeholder,
					tooltip: this.options.tooltip,
					label: this.options.label,
				}
			}
		}
	});

	// the select field for FileSingleField
	View.FileSingleFieldSelect = Backbone.Marionette.ItemView.extend({
		template: _.template('<label for="<%=options.fieldId%>Select">Select a File<span data-tooltip class="has-tip tip-right" title="Select from a list of current files."></span><input name="<%=options.name%>_select" type="text" id="<%=options.fieldId%>Select"<% if (options.fieldClass != null) { %> class="<%=options.fieldClass%>"<% } %>/></label>'),
		model: null,
		options: {
			fieldId: null,
			fieldClass: null,
			name: null,
			tooltip: null,
			placeholder: null,
			label: null,
		},
		templateHelpers: function () {
			return {
				model: this.model,
				options: {
					fieldId: this.options.fieldId,
					fieldClass: this.options.fieldClass,
					name: this.options.name,
					placeholder: this.options.placeholder,
					tooltip: this.options.tooltip,
					label: this.options.label,
				}
			}
		},
	});

	// the AutoCompleteItemView for FileSingleField
	View.SingleFileAutoCompleteItemView = View.AutoCompleteItemViewBase.extend({
		tagName: "li",
		template: null,
		initialize: function (options) {
			var icon = this.model.get('file') ? this.model.get('file').split('.').pop() : this.model.get('type');

			var tmplStr = '<a style="position: relative;"><img src="/img/' + (WMAPP.isApp ? 'file-types/' : 'icons/file_types/');
			tmplStr += icon + '.png" style="height: 50px;" /><div style="display: inline; height: 50px; padding-left: 20px;">';
			tmplStr += this.model.get('name') + '</div></a>';
			this.template = _.template(tmplStr);

			this.options = options;
		},
		render: function () {
			this.$el.html(this.template({
				"type": this.model.type(),
				"name": this.model.name()
			}));
			return this;
		},
	});

	// the AutoCompleteView for FileSingleField
	View.SingleFileAutoCompleteView = View.AutoCompleteViewBase.extend({

		itemView: View.SingleFileAutoCompleteItemView,
		minKeywordLength: 0,

		loadResult: function (model, keyword) {
			this.currentText = keyword;
			this.show().reset();
			if (model.length) {
				$(this.input).attr('style', 'margin-bottom: 0rem;');
				_.forEach(model, this.addItem, this);
				this.show();
			} else {
				this.hide();
			}
		},

		select: function (model) {
			var file = model.file();
			$(this.input).val(file);
			this.currentText = file;
			this.onSelect(model);
			$(this.input).attr('style', 'margin-bottom: 0.5rem;');
		},

		// callback definitions
		onSelect: function (model) {
			$('#' + this.fieldId + 'Upload').val('');
			this.model.setFromSelect(this.model, this.$el.find('#' + this.fieldId), this.$el.find('#' + this.fieldId + 'PreviewFile'));
		},
	});

	// the upload field for FileSingleFieldCompact
	View.FileSingleFieldCompact = Backbone.Marionette.ItemView.extend({
		template: function (data) {
			var model = data.model;
			var options = data.options;

			var tmplStr = '<label for="' + options.fieldId + '">';
			if (options.label) {
				tmplStr += '<span class="wmapp-input-title">' + options.label + '</span>';
				if (options.required) {
					tmplStr += '<span class="is-required" title="Required">*</span>';
				}
				if (options.tooltip) {
					tmplStr += '<span data-tooltip class="has-tip tip-right" title="' + options.tooltip + '"></span>';
				}
			}
			tmplStr += '</label>';

			if (options.postfix && options.postfixSize) {
				tmplStr += '<div class="row collapse"><div class="large-' + (12 - parseInt(options.postfixSize)) + ' columns">';
			}

			tmplStr += '<div class="wmapp-file-field wmapp-button button" style="display:inline-block;"><span>Upload</span><input name="' + options.name + '" type="file"';
			if (options.autocomplete == "on") {
				tmplStr += ' autocomplete=on';
			} else {
				tmplStr += ' autocomplete=off';
			}
			tmplStr += ' maxlength="' + options.maxlength + '" type="' + options.fieldType + '" ';
			if (options.readonly) {
				tmplStr += ' readonly';
			}
			tmplStr += ' value="';
			if (model && model.get(options.name)) {
				if (options.displayValue) {
					tmplStr += options.displayValue(model.get(options.name));
				} else {
					tmplStr += model.get(options.name);
				}

			} else if (options.value && options.value != null) {
				if (options.displayValue) {
					tmplStr += options.displayValue(options.value);
				} else {
					tmplStr += options.value;
				}
			}
			tmplStr += '" id="' + options.fieldId + 'Upload" class="';
			if (options.fieldClass) {
				tmplStr += options.fieldClass + ' ';
			}
			tmplStr += 'wmapp-file-field"';
			if (options.placeholder) {
				tmplStr += ' placeholder="' + options.placeholder + '"';
			}
			if (options.disabled) {
				tmplStr += ' disabled';
			}
			tmplStr += ' /></div>';

			tmplStr += '<div id="' + options.fieldId + 'PreviewFile" class="wmapp-file-preview-file" style="display:inline-block;position: relative; padding-right: 3px;">';
			var fileModel = (model && model.get('_' + options.name)) ? model.get('_' + options.name) : false;
			if (fileModel && fileModel.get('file')) {
				if (fileModel.get('id')) {
					if (fileModel.get('plugin_id') && fileModel.get('plugin_id') != 0) {
						var href = '/site/files/' + fileModel.get('plugin_id') + '/' + fileModel.get('file');
					} else {
						var href = '/site/files/' + fileModel.get('file');
					}
					if (WMAPP.isApp) {
						href = 'https://' + WMAPP.domain + href;
					}
					tmplStr += '<a href="' + href + '" target="_blank">';
				} else if (fileModel.get('data')) {
					href = fileModel.get('data');
					tmplStr += '<a href="' + href + '" target="_blank">';
				}

				if (fileModel.get('type') && fileModel.get('type').indexOf('image/') === 0) {
					// file is an image, so display it
					if (WMAPP.isApp) {
						// by using an object for the image, we can set a "default" image inside for when the main image can't be loaded.
						// Neat, huh? :)
						tmplStr += '<object data="' + href + '" type="' + fileModel.get('type') + '"><img src="img/offline.svg" /><span>File unavailable offline</span></object>';
					} else {
						// don't do our neat hack from above for a browser. It's not worthy!
						tmplStr += '<img src="' + href + '" />';
					}
				} else {
					// otherwise show the file type icon
					var icon = fileModel.get('file') ? fileModel.get('file').split('.').pop() : fileModel.get('type');
					tmplStr += '<img src="'+(WMAPP.isApp ? 'img/file-types' : '/img/icons/file_types')+'/' + icon + '.png" style="width: 30px;" />';
				}

				if (fileModel.get('id') || fileModel.get('data')) {
					tmplStr += '</a>';
				}
			}

			tmplStr += '</div>';

			if (options.postfix && options.postfixSize) {
				tmplStr += '</div><div class="large-' + options.postfixSize + ' columns"><span class="postfix">.' + options.postfix + '</span></div></div>';
			}
			if (options.notes) {
				tmplStr += '<span class="notes">' + options.notes + '</span>';
			}

			return tmplStr;
		},
		templateHelpers: function () {
			return {
				model: this.model,
				options: this.options
			}
		},
		events: {
			'change input.wmapp-file-field': 'updatePreviewUpload',
			'click .wmapp-file-preview-file span': 'removeFile',
		},
		model: null,
		modelEvents: {
			'change': 'onModelChange'
		},
		options: {
			fieldId: null,
			fieldClass: null,
			name: null,
			tooltip: null,
			placeholder: null,
			label: null,
		},
		onModelChange: function(e) {
			console.log(this.model);
		},
		updatePreviewUpload: function (e) {
			var model = this.model.get('_' + this.options.name);

			this.$el.find('#' + this.options.fieldId + 'Select').val('');
			model.setFromFile(e.target.files[0], this.$el.parents('fieldset').find('#' + this.options.fieldId + 'PreviewFile'), this.options.name);
		},
		removeFile: function (e) {
			this.model.removeFile(this.options.fieldId);
			$(document).unbindArrive("#" + this.options.fieldId + 'PreviewFile');
		},
		onShow: function () {
			if (!this.model.get('_' + this.options.name)) {
				this.model.set('_' + this.options.name, new WMAPP.Core.Model.File());
			}
			var model = this.model.get('_' + this.options.name);

			if (model != null && model.get('id') != null) {
				this.$el.find('#' + this.options.fieldId + 'Upload').val('');
				model.setFromSelect(model, this.$el.find('#' + this.options.fieldId), this.$el.find('#' + this.options.fieldId + 'PreviewFile'));
			}
		}
	});

	/**
	 * Extend the Layout View to make a Single File upload field
	 */
	View.FileVersionedField = WMAPP.Extension.View.LayoutView.extend({
		template: _.template('<fieldset><legend><%=options.label%></legend><div class="wmapp-file-versioned-field-upload-file"></div><div id="<%=options.fieldId%>Progress"></div><div class="wm-admin-preview-element"><div style="height: 100%; vertical-align: top;"><label><div id="<%=options.fieldId%>File"></div><%=options.label%> Preview<input name="<%=options.name%>" type="hidden" id="<%=options.fieldId%>" value="<% if (model && model.get(options.name)) { %><%=model.get(options.name)%><% } %>" /><div id="<%=options.fieldId%>PreviewFile" style="padding-left: 5px;"></div></div></label></div></fieldset>'), //<input name="<%=options.name%>" type="hidden" id="<%=options.fieldId%>"/>
		regions: {
			uploadFileField: '.wmapp-file-versioned-field-upload-file',
		},
		uploadFileField: null,
		model: null,
		options: {
			fieldId: null,
			fieldClass: null,
			name: null,
			tooltip: null,
			placeholder: null,
			label: null,
			fileField: 'file',
			labelField: 'name',
			required: false,
		},
		templateHelpers: function () {
			return {
				model: this.model,
				options: {
					fieldId: this.options.fieldId,
					fieldClass: this.options.fieldClass,
					name: this.options.name,
					placeholder: this.options.placeholder,
					tooltip: this.options.tooltip,
					label: this.options.label,
					fileField: this.options.fileField,
					labelField: this.options.labelField
				}
			}
		},
		onRender: function () {
			var model = this.model.get('_' + this.options.name);

			this.uploadView = new WMAPP.Extension.View.FileVersionedFieldUpload({
				model: model,
				fieldId: this.options.fieldId,
				fieldClass: this.options.fieldClass,
				label: this.options.label,
				name: this.options.name,
				tooltip: this.options.tooltip
			});

			this.uploadFileField.show(this.uploadView);
		},
		onShow: function () {
			var model = this.model.get('_' + this.options.name);

			if (model != null && model.get('id') != null) {
				this.$el.find('#' + this.options.fieldId + 'Upload').val('');
				model.set(model, this.$el.find('#' + this.options.fieldId), this.$el.find('#' + this.options.fieldId + 'PreviewFile'));
			}
		}
	});

	// the upload field for FileVersionedField
	View.FileVersionedFieldUpload = Backbone.Marionette.ItemView.extend({
		template: _.template('<label for="<%=options.fieldId%>">Upload a File<% if (options.required) { %><span class="is-required" title="Required">*</span><% } %><% if (options.tooltip) { %><span data-tooltip class="has-tip tip-right" title="<%=options.tooltip%>"></span><% } %><input name="<%=options.name%>_upload" type="file" id="<%=options.fieldId%>Upload" class="<% if (options.fieldClass != null) { %><%=options.fieldClass%> <% } %>wmapp-file-field" /></label>'),
		events: {
			'change .wmapp-file-field': 'updatePreviewUpload',
		},
		model: null,
		options: {
			fieldId: null,
			fieldClass: null,
			name: null,
			tooltip: null,
			placeholder: null,
			label: null,
			required: false,
		},
		updatePreviewUpload: function (e) {
			this.$el.find('#' + this.options.fieldId + 'Select').val('');
			this.model.setFromFile(e.target.files[0], this.$el.parents('fieldset').find('#' + this.options.fieldId + 'PreviewFile'), this.options.name);
		},
		templateHelpers: function () {
			return {
				model: this.model,
				options: {
					fieldId: this.options.fieldId,
					fieldClass: this.options.fieldClass,
					name: this.options.name,
					placeholder: this.options.placeholder,
					tooltip: this.options.tooltip,
					label: this.options.label,
					required: this.options.required,
				}
			}
		},
	});

	/**
	 * Extend the Item View to make a risk field
	 */
	View.RiskField = Backbone.Marionette.ItemView.extend({
		template: _.template(
			'<label for="<%=options.fieldId%>"><span class="wmapp-input-title"><%=options.label%></span>' +
			'<% if (options.required) { %><span class="is-required" title="Required">*</span><% } %>' +
			'<% if (options.tooltip) { %>' +
			'<span data-tooltip class="has-tip tip-right" title="<%=options.tooltip%>"></span>' +
			'<% } %></label><input type="text" readonly id="<%=options.fieldId%>" class="wmapp-risk-matrix-input <%=options.fieldClass%>"' +
			'<% if (options.placeholder) { %> placeholder="<%=options.placeholder%>"<% } %>/>' +
			'<input id="<%=options.fieldId%>_" name="<%=options.name%>" type="hidden" ' +
			'value="<% if (model && model.get(options.name)) { ' +
			'%><%=model.get(options.name)%><% } else if (options.value && options.value != null) ' +
			'{ %><%=options.value%><% } %>"/>'),
		model: null,
		events: {
			'change input[type="hidden"]': 'onInputChange',
			'focus input[readonly]': 'onInputFocus',
		},
		options: {
			value: null,
			fieldId: null,
			fieldClass: null,
			name: null,
			tooltip: null,
			placeholder: null,
			label: null,
			readonly: false,
			silentChange: true,
			required: false,
		},
		templateHelpers: function () {
			return {
				model: this.model,
				options: {
					value: this.options.value,
					fieldId: this.options.fieldId,
					fieldClass: this.options.fieldClass,
					name: this.options.name,
					placeholder: this.options.placeholder,
					tooltip: this.options.tooltip,
					label: this.options.label,
					required: this.options.required,
				}
			}
		},
		modelEvents: function () {
			var events = {};
			events['change:' + this.options.name] = 'onModelChange';
			return events;
		},
		onModelChange: function (evt) {
			var label = View.RiskMatrix.translateValueToLabel(this.model.get(this.options.name));
			var newClass = View.RiskMatrix.translateValueToClass(this.model.get(this.options.name));

			this.$el.find('#' + this.options.fieldId + ':input[readonly]').val(label);
			this.$el.find('#' + this.options.fieldId + ':input[readonly]').removeClass(function (index, css) {
				return (css.match(/(^|\s)risk-rating-color-\S+/g) || []).join(' ');
			}).addClass(newClass);
		},
		onRender: function () {
			var label = View.RiskMatrix.translateValueToLabel(this.$el.find('input[type=hidden]').val());
			this.$el.find('input[readonly]').val(label);
		},
		onInputChange: function () {
			var value = this.$el.find('input[type="hidden"]').val();
			if (value) {
				if (this.model) {
					this.model.set(this.options.name, value);
				}
				this.$el.find('input[type=hidden]').val(value);

				this.trigger('trigger:coreRiskFieldChange', value);
			} else {
				throw "Unexpected value: " + label;
			}
		},
		onInputFocus: function (evt) {
			if (this.options.readonly !== true) {
				this.trigger('trigger:input:focus', evt.target);
			}
		},
	});

	View.RiskMatrix = WMAPP.Extension.View.ItemView.extend({
		className: 'matrix-wrapper',
		template: function () {
			if (WMAPP.MediaQuery.matchSmallWidth()) {
				var tmplStr = '<div class="wmapp-risk-matrix-radio-group-wrapper">' +
					'<h5>Severity</h5>' +
					'<ul class="small-block-grid-5 wmapp-risk-matrix-radio-group">' +
					'<li><label for="wmappRiskMatrixRadioButtonSeverity1">Insignificant</label></li>' +
					'<li><label for="wmappRiskMatrixRadioButtonSeverity2">Minor</label></li>' +
					'<li><label for="wmappRiskMatrixRadioButtonSeverity3">Moderate</label></li>' +
					'<li><label for="wmappRiskMatrixRadioButtonSeverity4">Major</label></li>' +
					'<li><label for="wmappRiskMatrixRadioButtonSeverity5">Catastrophic</label></li>' +
					'<li><div class="switch small"><input id="wmappRiskMatrixRadioButtonSeverity1" type="radio" name="residual_risk_severity" value="1" /><label for="wmappRiskMatrixRadioButtonSeverity1"></label></div></li>' +
					'<li><div class="switch small"><input id="wmappRiskMatrixRadioButtonSeverity2" type="radio" name="residual_risk_severity" value="2" /><label for="wmappRiskMatrixRadioButtonSeverity2"></label></div></li>' +
					'<li><div class="switch small"><input id="wmappRiskMatrixRadioButtonSeverity3" type="radio" name="residual_risk_severity" value="3" /><label for="wmappRiskMatrixRadioButtonSeverity3"></label></div></li>' +
					'<li><div class="switch small"><input id="wmappRiskMatrixRadioButtonSeverity4" type="radio" name="residual_risk_severity" value="4" /><label for="wmappRiskMatrixRadioButtonSeverity4"></label></div></li>' +
					'<li><div class="switch small"><input id="wmappRiskMatrixRadioButtonSeverity5" type="radio" name="residual_risk_severity" value="5" /><label for="wmappRiskMatrixRadioButtonSeverity5"></label></div></li>' +
					'</ul>' +
					'<h5>Possibility</h5>' +
					'<ul class="small-block-grid-5 wmapp-risk-matrix-radio-group">' +
					'<li><label for="wmappRiskMatrixRadioButtonPossibility1">Rare</label></li>' +
					'<li><label for="wmappRiskMatrixRadioButtonPossibility2">Unlikely</label></li>' +
					'<li><label for="wmappRiskMatrixRadioButtonPossibility3">Possible</label></li>' +
					'<li><label for="wmappRiskMatrixRadioButtonPossibility4">Likely</label></li>' +
					'<li><label for="wmappRiskMatrixRadioButtonPossibility5">Almost Certain</label></li>' +
					'<li><div class="switch small"><input id="wmappRiskMatrixRadioButtonPossibility1" type="radio" name="residual_risk_possibility" value="1" /><label for="wmappRiskMatrixRadioButtonPossibility1"></label></div></li>' +
					'<li><div class="switch small"><input id="wmappRiskMatrixRadioButtonPossibility2" type="radio" name="residual_risk_possibility" value="2" /><label for="wmappRiskMatrixRadioButtonPossibility2"></label></div></li>' +
					'<li><div class="switch small"><input id="wmappRiskMatrixRadioButtonPossibility3" type="radio" name="residual_risk_possibility" value="3" /><label for="wmappRiskMatrixRadioButtonPossibility3"></label></div></li>' +
					'<li><div class="switch small"><input id="wmappRiskMatrixRadioButtonPossibility4" type="radio" name="residual_risk_possibility" value="4" /><label for="wmappRiskMatrixRadioButtonPossibility4"></label></div></li>' +
					'<li><div class="switch small"><input id="wmappRiskMatrixRadioButtonPossibility5" type="radio" name="residual_risk_possibility" value="5" /><label for="wmappRiskMatrixRadioButtonPossibility5"></label></div></li>' +
					'</ul><a class="button tiny right collapse-radio-group">Save</a></div>';
			} else {
				var tmplStr = '<div class="matrix-row">' +
					'<div class="matrix-grid matrix-grid-1 matrix-left-corner-grid-1"></div>' +
					'<div class="matrix-grid matrix-grid-3 matrix-left-corner-grid-2"></div>' +
					'<div class="matrix-grid matrix-grid-2 matrix-axis-desc rm0"></div>' +
					'<div class="matrix-grid matrix-grid-2 matrix-axis-desc lm0 rm0"></div>' +
					'<div class="matrix-grid matrix-grid-2 matrix-axis-desc lm0 rm0"><p><b>Consequences</b></p></div>' +
					'<div class="matrix-grid matrix-grid-2 matrix-axis-desc lm0 rm0"></div>' +
					'<div class="matrix-grid matrix-grid-2 matrix-axis-desc lm0"></div>' +
					'</div>' +
					'<div class="matrix-row">' +
					'<div class="matrix-grid matrix-grid-1 matrix-left-corner-grid-3"></div>' +
					'<div class="matrix-grid matrix-grid-3 matrix-left-corner-grid-4"></div>' +
					'<div class="matrix-grid matrix-grid-2 row-col-desc"><p><b>Insignificant (1)</b><br>No injuries/minimal financial loss</p></div>' +
					'<div class="matrix-grid matrix-grid-2 row-col-desc"><p><b>Minor (2)</b><br>First aid treatment/medium financial loss</p></div>' +
					'<div class="matrix-grid matrix-grid-2 row-col-desc"><p><b>Moderate (3)</b><br>Medical treatment/high financial loss</p></div>' +
					'<div class="matrix-grid matrix-grid-2 row-col-desc"><p><b>Major (4)</b><br>Hospitalized/large financial loss</p></div>' +
					'<div class="matrix-grid matrix-grid-2 row-col-desc"><p><b>Catastrophic (5)</b><br>Death/massive financial loss</p></div>' +
					'</div>' +
					'<div class="matrix-row">' +
					'<div class="matrix-grid matrix-grid-1 matrix-axis-desc bm0"></div>' +
					'<div class="matrix-grid matrix-grid-3 row-col-desc"><p><b>Almost Certain (5)</b><br>Often occurs/once a week</p></div>' +
					'<div class="matrix-grid matrix-grid-2 moderate-risk-grid" data-risk-value="5"><p>Moderate (5)</p></div>' +
					'<div class="matrix-grid matrix-grid-2 high-risk-grid" data-risk-value="10"><p>High (10)</p></div>' +
					'<div class="matrix-grid matrix-grid-2 high-risk-grid" data-risk-value="15"><p>High (15)</p></div>' +
					'<div class="matrix-grid matrix-grid-2 catastrophic-risk-grid" data-risk-value="20"><p>Catastrophic (20)</p></div>' +
					'<div class="matrix-grid matrix-grid-2 catastrophic-risk-grid" data-risk-value="25"><p>Catastrophic (25)</p></div>' +
					'</div>' +
					'<div class="matrix-row">' +
					'<div class="matrix-grid matrix-grid-1 matrix-axis-desc tm0 bm0"></div>' +
					'<div class="matrix-grid matrix-grid-3 row-col-desc"><p><b>Likely (4)</b><br>Could easily happen/once a month</p></div>' +
					'<div class="matrix-grid matrix-grid-2 moderate-risk-grid" data-risk-value="4"><p>Moderate (4)</p></div>' +
					'<div class="matrix-grid matrix-grid-2 moderate-risk-grid" data-risk-value="8"><p>Moderate (8)</p></div>' +
					'<div class="matrix-grid matrix-grid-2 high-risk-grid" data-risk-value="12"><p>High (12)</p></div>' +
					'<div class="matrix-grid matrix-grid-2 catastrophic-risk-grid" data-risk-value="16"><p>Catastrophic (16)</p></div>' +
					'<div class="matrix-grid matrix-grid-2 catastrophic-risk-grid" data-risk-value="20"><p>Catastrophic (20)</p></div>' +
					'</div>' +
					'<div class="matrix-row">' +
					'<div class="matrix-grid matrix-grid-1 matrix-axis-desc tm0 bm0"><p><b>Likelihood</b></p></div>' +
					'<div class="matrix-grid matrix-grid-3 row-col-desc"><p><b>Possible (3)</b><br>Could happen or known it to happen/once a year</p></div>' +
					'<div class="matrix-grid matrix-grid-2 low-risk-grid" data-risk-value="3"><p>Low (3)</p></div>' +
					'<div class="matrix-grid matrix-grid-2 moderate-risk-grid" data-risk-value="6"><p>Moderate (6)</p></div>' +
					'<div class="matrix-grid matrix-grid-2 moderate-risk-grid" data-risk-value="9"><p>Moderate (9)</p></div>' +
					'<div class="matrix-grid matrix-grid-2 high-risk-grid" data-risk-value="12"><p>High (12)</p></div>' +
					'<div class="matrix-grid matrix-grid-2 high-risk-grid" data-risk-value="15"><p>High (15)</p></div>' +
					'</div>' +
					'<div class="matrix-row">' +
					'<div class="matrix-grid matrix-grid-1 matrix-axis-desc tm0 bm0"></div>' +
					'<div class="matrix-grid matrix-grid-3 row-col-desc"><p><b>Unlikely (2)</b><br>Hasn&#39;t happened yet but could/once every 10 years</p></div>' +
					'<div class="matrix-grid matrix-grid-2 low-risk-grid" data-risk-value="2"><p>Low (2)</p></div>' +
					'<div class="matrix-grid matrix-grid-2 moderate-risk-grid" data-risk-value="4"><p>Moderate (4)</p></div>' +
					'<div class="matrix-grid matrix-grid-2 moderate-risk-grid" data-risk-value="6"><p>Moderate (6)</p></div>' +
					'<div class="matrix-grid matrix-grid-2 moderate-risk-grid" data-risk-value="8"><p>Moderate (8)</p></div>' +
					'<div class="matrix-grid matrix-grid-2 high-risk-grid" data-risk-value="10"><p>High (10)</p></div>' +
					'</div>' +
					'<div class="matrix-row">' +
					'<div class="matrix-grid matrix-grid-1 matrix-axis-desc tm0"></div>' +
					'<div class="matrix-grid matrix-grid-3 row-col-desc"><p><b>Rare (1)</b><br>Conceivable but only on extreme circumstances/once every 100 years</p></div>' +
					'<div class="matrix-grid matrix-grid-2 low-risk-grid" data-risk-value="1"><p>Low (1)</p></div>' +
					'<div class="matrix-grid matrix-grid-2 low-risk-grid" data-risk-value="2"><p>Low (2)</p></div>' +
					'<div class="matrix-grid matrix-grid-2 low-risk-grid" data-risk-value="3"><p>Low (3)</p></div>' +
					'<div class="matrix-grid matrix-grid-2 moderate-risk-grid" data-risk-value="4"><p>Moderate (4)</p></div>' +
					'<div class="matrix-grid matrix-grid-2 moderate-risk-grid" data-risk-value="5"><p>Moderate (5)</p></div>' +
					'</div>';
			}
			return tmplStr;
		},
		ui: {
			riskOptions: '.low-risk-grid, .moderate-risk-grid, .high-risk-grid, .catastrophic-risk-grid',
			radioCloseButton: 'a.button'
		},
		events: {
			'click @ui.riskOptions': 'onRiskOptionSelected',
			'change input[type=radio]': 'updateRadioRiskRating',
			'click @ui.radioCloseButton': 'closeRadioRiskRating',
		},
		onRiskOptionSelected: function (evt) {
			evt.preventDefault();
			evt.stopPropagation();
			this.trigger('trigger:riskoption:selected', $(evt.currentTarget).data('risk-value'));
		},
		updateRadioRiskRating: function (evt) {
			var _target = $(evt.target);
			var _targetWrapper = _target.closest('.wmapp-risk-matrix-radio-group-wrapper');
			var _selectedRadioButtons = _targetWrapper.find('input:checked');
			if (_selectedRadioButtons.length === 2) {
				this.riskRating = _selectedRadioButtons.first().val() * _selectedRadioButtons.last().val();
			}
		},
		closeRadioRiskRating: function () {
			if (this.riskRating) {
				this.trigger('trigger:riskoption:selected', this.riskRating);
			}
		}
	});
	View.RiskMatrix.translateValueToLabel = function (value) {
		var _val = parseInt(value);
		var label = '';
		if (_val) {
			if (_val > 0 && _val < 4) {
				label = 'Low (' + _val + ')';
			} else if (_val > 3 && _val < 10) {
				label = 'Moderate (' + _val + ')';
			} else if (_val > 9 && _val < 16) {
				label = 'High (' + _val + ')';
			} else if (_val > 15 && _val < 26) {
				label = 'Catastrophic (' + _val + ')';
			}
		}
		return label;
	}
	View.RiskMatrix.translateValueToClass = function (value) {
		var _val = parseInt(value);
		var riskClass = '';
		if (_val) {
			if (_val > 0 && _val < 4) {
				riskClass = 'risk-rating-color-low';
			} else if (_val > 3 && _val < 10) {
				riskClass = 'risk-rating-color-moderate';
			} else if (_val > 9 && _val < 16) {
				riskClass = 'risk-rating-color-high';
			} else if (_val > 15 && _val < 26) {
				riskClass = 'risk-rating-color-catastrophic';
			}
		}
		return riskClass;
	}

	/**
	 * Color picker view
	 */
	View.ColorPickerInput = Backbone.Marionette.ItemView.extend({
		template: function (data) {
			var htmlStr = '<input id="' + data._options.fieldId + '" type="text" style="text-transform: uppercase;" name="' + data._options.name + '"';
			if (data._options.readonly) {
				htmlStr += ' readonly';
			}
			if (data[data._options.name]) {
				htmlStr += '  value="' + data[data._options.name] + '"';
			} else if (data._options.value) {
				htmlStr += '  value="' + data._options.value + '"';
			}
			if (data._options.fieldClass) {
				htmlStr += ' class="' + data._options.fieldClass + '"';
			}
			if (data._options.placeholder) {
				htmlStr += ' placeholder="' + data._options.placeholder + '"';
			}
			htmlStr += '/>';
			return htmlStr;
		},
		triggers: {
			'focus input': 'trigger:input:focused',
			'blur input': 'trigger:input:blured'
		},
		events: {
			'change input': 'onInputChange'
		},
		options: {
			value: null,
			fieldId: null,
			fieldClass: null,
			name: null,
			tooltip: null,
			placeholder: null,
			label: null,
			readonly: false
		},
		modelEvents: function () {
			var events = {};
			events['change:' + this.options.name] = 'onModelChange';
			return events;
		},
		templateHelpers: function () {
			return {
				_options: this.options
			};
		},
		onModelChange: function () {
			if (this.options.name) {
				this.$el.find('input').val(this.model.get(this.options.name));
			}
		},
		onInputChange: function () {
			if (this.options.name) {
				this.model.set(this.options.name, this.$el.find('input').val());
			}
			this.trigger('trigger:input:blured');
		}
	});

	View.ColorPickerWidget = Backbone.Marionette.ItemView.extend({
		template: function (data) {
			return '';
		},
		className: 'wmapp-extension-view-colorpicker-widget',
		onShow: function () {
			var me = this;
			var color_picker = $.farbtastic(this.$el, function (color) {
				me.pickColor(color);
			});
			if (this.model && this.options.name && this.model.get(this.options.name)) {
				color_picker.setColor(this.model.get(this.options.name));
			}
		},
		pickColor: function (color) {
			if (this.model && this.options.name) {
				this.model.set(this.options.name, color);
			}
		},
	});

	View.ColorPicker = WMAPP.Extension.View.LayoutView.extend({
		template: function (data) {
			var htmlStr = '<label class="wmapp-input-title" for="' + data._options.fieldId + '">';
			if (data._options.label !== null) {
				htmlStr += data._options.label;
			}
			if (data._options.required) {
				htmlStr += '<span class="is-required" title="Required">*</span>';
			}
			if (data._options.tooltip != null) {
				htmlStr += '<span data-tooltip class="has-tip tip-right" title="' + data._options.tooltip + '"></span>';
			}
			htmlStr += '<div class="input_region"></div>';
			htmlStr += '<div class="color_picker_region"></div>';
			htmlStr += '</label>';
			return htmlStr;
		},
		regions: {
			input_region: ".input_region",
			color_picker: ".color_picker_region"
		},
		options: {
			value: null,
			fieldId: null,
			fieldClass: null,
			name: null,
			tooltip: null,
			placeholder: null,
			label: null,
			silentChange: true,
			readonly: false,
			required: false,
			widgetOnly: false,
		},
		templateHelpers: function () {
			return {
				_options: this.options
			};
		},
		initialize: function () {
			this.viewModel = new Backbone.Model();

			if (this.model && this.options.name) {
				this.viewModel.set(this.options.name, this.model.get(this.options.name));
				this.listenTo(this.model, 'change:' + this.options.name, this.onModelUpdate);
				this.viewModel.on('change', function () {
					this.model.set(this.options.name, this.viewModel.get(this.options.name), {
						silent: this.options.silentChange
					});
				}, this);
			}
		},
		onModelUpdate: function () {
			this.viewModel.set(this.options.name, this.model.get(this.options.name));
		},
		onRender: function () {
			var viewOptions = _.defaults({
				model: this.viewModel
			}, this.options);
			if (!this.options.widgetOnly) {
				var inputView = new View.ColorPickerInput(viewOptions);
				this.listenTo(inputView, 'trigger:input:focused', this.showColorPicker);
				this.listenTo(inputView, 'trigger:input:blured', this.hideColorPicker);
				this.input_region.show(inputView);
			} else {
				this.showColorPicker();
			}
		},
		showColorPicker: function () {
			if (!this.options.readonly) {
				var viewOptions = _.defaults({
					model: this.viewModel
				}, this.options);
				this.color_picker.show(new View.ColorPickerWidget(viewOptions));
			}
		},
		hideColorPicker: function () {
			this.color_picker.reset();
		}
	});

	/**
	 * Slider view
	 */
	View.SliderInput = Backbone.Marionette.ItemView.extend({
		template: function (data) {
			var model = data.model;
			var options = data.options;
			var styleColor = '';
			var htmlStr = '<input id="' + options.fieldId + '" type="number" min="' + options.min + '" max="' + options.max + '" step="' + options.step + '" name="' + options.name + '"';
			if(options.textColor){
				styleColor = 'color:'+ options.textColor;
			}
			if (options.readonly) {
				htmlStr += ' readonly';
			}
			if (model.get(options.name)) {
				htmlStr += '  value="' + model.get(options.name) + '"';
			} else if (options.value || options.value == 0) {
				htmlStr += '  value="' + options.value + '"';
			} else if (options.min) {
				htmlStr += '  value="' + options.min + '"';
			}
			if (options.fieldClass) {
				htmlStr += ' class="' + options.fieldClass + '"';
			}
			if (options.placeholder) {
				htmlStr += ' placeholder="' + options.placeholder + '"';
			}
			htmlStr += '/>';
			return htmlStr;
		},
		events: {
			'change input': 'onInputChange'
		},
		modelEvents: function () {
			var events = {};
			events['change:' + this.options.name] = 'onModelChange';
			return events;
		},
		options: {
			value: null,
			fieldId: null,
			fieldClass: null,
			name: null,
			tooltip: null,
			placeholder: null,
			label: null,
			min: 1,
			max: 100,
			step: 1,
			readonly: false,
			textColor: null
		},
		templateHelpers: function () {
			return {
				options: this.options,
				model: this.model
			};
		},
		onModelChange: function () {
			if (this.options.name) {
				this.$el.find('input').val(this.model.get(this.options.name));
			}
		},
		onInputChange: function () {
			if (this.options.name) {
				if (this.$el.find('input').val() !== '') {

					var newValue = parseFloat(this.$el.find('input').val());
					if (newValue || newValue === 0) {
						if (newValue < this.options.min) {
							newValue = this.options.min;
						} else if (newValue > this.options.max) {
							newValue = this.options.max;
						}
					} else {
						newValue = this.options.min;
					}

					this.$el.find('input').val(newValue);
					this.model.set(this.options.name, newValue);

				} else {
					var newValue = this.options.min;

					this.$el.find('input').val(newValue);
					this.model.set(this.options.name, newValue);
				}
			}
		}
	});

	View.SliderWidget = Backbone.Marionette.ItemView.extend({
		template: function (data) {
			var htmlStr = '<div class="range-slider" data-slider="' + data._options.model.get(data._options.name) + '" data-options="start:' + data._options.min + '; end:' + data._options.max + '; step:' + data._options.step + ';">' +
				'	<span class="range-slider-handle" role="slider"></span>' +
				'	<span class="range-slider-active-segment"></span>' +
				'	<input type="hidden">' +
				'</div>';
			return htmlStr;
		},
		modelEvents: function () {
			var events = {};
			events['change:' + this.options.name] = 'onModelChange';
			return events;
		},
		options: {
			value: null,
			fieldId: null,
			fieldClass: null,
			name: null,
			tooltip: null,
			placeholder: null,
			label: null,
			min: 1,
			max: 100,
			step: 1,
			readonly: false
		},
		templateHelpers: function () {
			return {
				_options: this.options
			};
		},
		enable: function (enabled) {
			//var sliderItself = this.$el.find('[data-slider]');
			var sliderItself = this.$el.find('[data-slider]');
			if (enabled) {
				sliderItself.removeAttr('disabled');
			} else {
				sliderItself.attr('disabled', true);
			}
			this.$el.foundation();
		},
		onShow: function () {
			var me = this;
			this.$el.find('[data-slider]').attr('disabled', true);
			this.$el.find('[data-slider]').on('change.fndtn.slider', function () {
				me.onSlide();
			});
			this.$el.foundation();
			var initValue = parseFloat(this.model.get(this.options.name));
			initValue = initValue || this.options.min;
			this.$el.foundation('slider', 'set_value', initValue);
			this.$el.parents('label').find('.range-values-value span').text(initValue);
		},
		onSlide: function () {
			var value = parseFloat(this.$el.find('.range-slider').attr('data-slider'));
			if (value) {
				this.model.set(this.options.name, value);
				if (this.options.showRangeValues) {
					this.$el.parents('label').find('.range-values-value span').text(value);
				}
				this.trigger('trigger:onInputChanged', this.model, value);
			}
		},
		onModelChange: function () {
			var newValue = parseFloat(this.model.get(this.options.name));
			if (newValue) {
				this.$el.foundation('slider', 'set_value', newValue);
			}
		}
	});

	View.SliderRangeInput = Backbone.Marionette.ItemView.extend({
		template: function (data) {
			var model = data.model;
			var options = data.options;

			var htmlStr = '<input id="' + options.fieldId + 'Min" type="number" min="' + options.min + '" max="' + options.max + '" step="' + options.step + '" style="width:80px" name="' + options.name + '"';
			if (options.readonly) {
				htmlStr += ' readonly';
			}
			if (model.get(options.name)) {
				htmlStr += '  value="' + model.get(options.name) + '"';
			} else if (options.value || options.value == 0) {
				htmlStr += '  value="' + options.value + '"';
			} else if (options.min) {
				htmlStr += '  value="' + options.min + '"';
			}

			htmlStr += ' class="left ' + ((options.fieldClass) ? options.fieldClass : '') + '"';

			if (options.placeholder) {
				htmlStr += ' placeholder="' + options.placeholder + '"';
			}
			htmlStr += '/>';

			htmlStr += '<input id="' + options.fieldId + 'Max" type="number" min="' + options.min + '" max="' + options.max + '" step="' + options.step + '" style="width:80px" name="' + options.name + '"';
			if (options.readonly) {
				htmlStr += ' readonly';
			}
			if (model.get(options.name)) {
				htmlStr += '  value="' + model.get(options.name) + '"';
			} else if (options.value || options.value == 0) {
				htmlStr += '  value="' + options.value + '"';
			} else if (options.min) {
				htmlStr += '  value="' + options.min + '"';
			}

			htmlStr += ' class="right ' + ((options.fieldClass) ? options.fieldClass : '') + '"';

			if (options.placeholder) {
				htmlStr += ' placeholder="' + options.placeholder + '"';
			}
			htmlStr += '/>';
			return htmlStr;
		},
		className: 'clearfix',
		modelEvents: function () {
			var events = {};
			events['change:' + this.options.name] = 'onModelChange';
			return events;
		},
		options: {
			value: null,
			fieldId: null,
			fieldClass: null,
			name: null,
			tooltip: null,
			placeholder: null,
			label: null,
			min: 1,
			max: 100,
			step: 1,
			readonly: false
		},
		templateHelpers: function () {
			return {
				options: this.options,
				model: this.model
			};
		},
		onModelChange: function () {
			if (this.options.name) {
				this.$el.find('input').val(this.model.get(this.options.name));
			}
		},
	});

	View.SliderRangeWidget = Backbone.Marionette.ItemView.extend({
		template: function (data) {
			var htmlStr = '<div class="sliderRegion"></div>';
			return htmlStr;
		},
		modelEvents: function () {
			var events = {};
			events['change:' + this.options.name] = this.onModelChange;
			return events;
		},
		options: {
			value: null,
			fieldId: null,
			fieldClass: null,
			name: null,
			tooltip: null,
			placeholder: null,
			label: null,
			min: 1,
			max: 100,
			step: 1,
			readonly: false
		},
		templateHelpers: function () {
			return {
				_options: this.options
			};
		},
		onModelChange: function () {
			var newValue = parseFloat(this.model.get(this.options.name));
			if (newValue) {
				this.$el.foundation('slider', 'set_value', newValue);
			}
		}
	});

	View.Slider = WMAPP.Extension.View.LayoutView.extend({
		template: function (data) {
			var styleColor = '';
			if(data._options.textColor){
				styleColor = 'color:'+ data._options.textColor;
			}
			var htmlStr = '<label style="' + styleColor + '" for="' + data._options.fieldId + '"><span class="wmapp-input-title">' + data._options.label + '</span>';
			if (data._options.required) {
				htmlStr += '<span class="is-required" title="Required">*</span>';
			}
			if (data._options.tooltip) {
				htmlStr += '<span data-tooltip class="has-tip tip-right" title="' + data._options.tooltip + '"></span>';
			}
			if (data._options.showRangeValues) {
				htmlStr +=	'<div class="range-values">';
				if (data._options.range) {
					htmlStr +=	'<div class="range-values-min">' + data._options.minLabel + ': <span></span> ' + (data._options.placeholder ? data._options.placeholder : '') + '</div>' +
								'<div class="range-values-max">' + data._options.maxLabel + ': <span></span> ' + (data._options.placeholder ? data._options.placeholder : '') + '</div>';
				} else {
					htmlStr +=	'<div class="range-values-value">' + data._options.valueLabel + ': <span></span> ' + (data._options.placeholder ? data._options.placeholder : '') + '</div>';
				}
				htmlStr  +=	'</div>'
			}
			if (data._options.range) {
				htmlStr += '<div class="slider_region"></div>';
				htmlStr += '<div class="input_region clearfix"></div>';
			} else {
				htmlStr += '<div class="input_region"></div>';
				htmlStr += '<div class="slider_region"></div>';
			}

			if (data._options.notes) {
				htmlStr += '<span class="notes">' + data._options.notes + '</span>';
			}
			htmlStr += '</label>';
			return htmlStr;
		},
		regions: {
			input_region: ".input_region",
			slider_region: ".slider_region"
		},
		options: {
			value: null,
			fieldId: null,
			fieldClass: null,
			name: null,
			tooltip: null,
			placeholder: null,
			notes: null,
			label: null,
			silentChange: true,
			min: 1,
			max: 100,
			step: 1,
			readonly: false,
			required: false,
			showRangeInputs: true,
			showRangeValues: false,
			textColor: null,
			changeAfterDrag: false,
			minLabel: 'Min',
			maxLabel: 'Max',
			valueLabel: 'Value',
		},
		templateHelpers: function () {
			return {
				_options: this.options
			};
		},
		initialize: function () {
			this.viewModel = new Backbone.Model();

			if (this.model && this.options.name) {
				if (!this.model.get(this.options.name)) {
					this.model.set(this.options.name, this.options.min, {silent: true});
				}
				this.viewModel.set(this.options.name, this.model.get(this.options.name));
				this.listenTo(this.model, 'change:' + this.options.name, this.onModelUpdate);
				this.viewModel.on('change', function () {
					this.model.set(this.options.name, this.viewModel.get(this.options.name), {
						silent: this.options.silentChange
					});
				}, this);
			}
		},
		onModelUpdate: function () {
			this.viewModel.set(this.options.name, this.model.get(this.options.name));
			if (this.noUiSliderElement) {
				this.noUiSliderElement.noUiSlider.set([this.model.get(this.options.name).min, this.model.get(this.options.name).max]);
			}
		},
		onInputChange: function (values, handle) {
			if (this.options.name) {
				// find the min value
				if (values) {
					minValue = parseFloat(values[0]);
				} else if (this.$el.find('input.left').val() !== '') {
					var minValue = parseFloat(this.$el.find('input.left').val());
					//console.log('MIN',minValue);
					if (minValue || minValue === 0) {
						if (minValue < this.options.min) {
							minValue = this.options.min;
						} else if (minValue > this.options.max) {
							minValue = this.options.max;
						}
					} else {
						minValue = this.options.min;
					}
				} else {
					var minValue = this.options.min;
				}

				// find the max value
				if (values) {
					maxValue = parseFloat(values[1]);
				} else if (this.$el.find('input.right').val() !== '') {
					var maxValue = parseFloat(this.$el.find('input.right').val());
					//console.log('MAX',maxValue);
					if (maxValue || maxValue === 0) {
						if (maxValue > this.options.max) {
							maxValue = this.options.max;
						} else if (maxValue < this.options.min) {
							maxValue = this.options.min;
						}
					} else {
						maxValue = this.options.max;
					}
				} else {
					var maxValue = this.options.max;
				}

				if (!values) {
					this.$el.find('.sliderRegion').get(0).noUiSlider.set([minValue, maxValue]);
				}

				if (this.options.showRangeValues) {
					this.$el.find('.range-values-min span').text(minValue);
					this.$el.find('.range-values-max span').text(maxValue);
				}

				var newValue = {"min": minValue, "max": maxValue};
				//console.log('NEW VALUE',newValue);
				this.model.set(this.options.name, newValue, {silent: this.options.silentChange});
				this.trigger('trigger:onInputChanged', this.model, minValue, maxValue);
			} else {
				this.model.set(this.options.name, {}, {silent: this.options.silentChange});
			}
		},
		enable: function (enabled) {
			if (this.options.range) {
				if (enabled) {
					this.elementDOM.removeAttr('disabled');
				} else {
					this.elementDOM.attr('disabled', true);
				}
			} else {
				this.sliderView.enable(enabled);
			}
		},
		onShow: function () {
			var that = this;
			var viewOptions = _.defaults({
				model: this.viewModel
			}, this.options);

			if (this.options.range) {
				//var slider = document.getElementById('sliderRegion');
				var sliderView = new View.SliderRangeWidget(viewOptions);
				this.slider_region.show(sliderView);

				if (this.options.showRangeInputs) {
					var inputView = new View.SliderRangeInput(viewOptions);
					this.input_region.show(inputView);
				}

				var model = this.model.get(this.options.name);
				if (_.isObject(model)) {
					var startMin = model.min;
					var startMax = model.max;
				} else {
					var startMin = this.options.min;
					var startMax = this.options.max;
				}

				this.elementDOM = this.$el.find('.sliderRegion');
                this.noUiSliderElement = this.elementDOM.get(0);
				noUiSlider.create(this.noUiSliderElement, {
					start: [startMin, startMax],
					step: this.options.step,
					range: {
						'min': this.options.min,
						'max': this.options.max
					},
				});

				if (this.options.showRangeValues) {
					this.$el.find('.range-values-min span').text(startMin);
					this.$el.find('.range-values-max span').text(startMax);
				}

				var that = this;
				if (this.options.changeAfterDrag) {
					this.elementDOM.get(0).noUiSlider.on('end', function ( values, handle ) {
						if ( handle ) {
							that.$el.find('#' + that.options.fieldId + 'Max').val(values[handle]);
						} else {
							that.$el.find('#' + that.options.fieldId + 'Min').val(values[handle]);
						}
						that.onInputChange(values, handle);
					});
				} else {
					this.elementDOM.get(0).noUiSlider.on('update', function ( values, handle ) {
						if ( handle ) {
							that.$el.find('#' + that.options.fieldId + 'Max').val(values[handle]);
						} else {
							that.$el.find('#' + that.options.fieldId + 'Min').val(values[handle]);
						}
					});

					this.elementDOM.get(0).noUiSlider.on('slide', function ( values, handle ) {
						if ( handle ) {
							that.$el.find('#' + that.options.fieldId + 'Max').val(values[handle]);
						} else {
							that.$el.find('#' + that.options.fieldId + 'Min').val(values[handle]);
						}
						that.onInputChange(values, handle);
					});
				}

				this.$el.find('input.left').on('change', function() {
					that.onInputChange();
				});

				this.$el.find('input.right').on('change', function() {
					that.onInputChange();
				});
			} else {
				if (this.options.showRangeInputs) {
					var inputView = new View.SliderInput(viewOptions);
					this.input_region.show(inputView);
				}

				this.sliderView = new View.SliderWidget(viewOptions);
				this.$el.find('.sliderRegion').attr('disabled', true);
				this.listenTo(this.sliderView, 'trigger:onInputChanged', function(model, value) {
					this.trigger('trigger:onInputChanged', model, value);
				});
				this.slider_region.show(this.sliderView);

				$(document).foundation('reflow');
			}
			this.enable(!this.options.readonly);
		}
	});

	View.SliderField = View.LayoutView.extend({
		options: {
			model: null,
			fieldId: null,
			fieldClass: null,
			name: null,
			label: null,
			min: 1,
			max: 100,
			step: 1,
			value: null,
			readonly: false,
			silentChange: true,


			// required: false, // not used (yet)
			// tooltip: null, // not used (yet)
			// placeholder: null, // not used (yet)
			// notes: null, // not used (yet)
		},
		template: function(options) {
			var tmplStr = 	'<input type="range" ' +
							(options.fieldId ? ('id="' + options.fieldId + '" ') : '') +
							(options.fieldClass ? ('class="' + options.fieldClass + '" ') : '') +
							(options.readonly ? ('readonly="readonly" ') : '') +
							'min="' + options.min + '" ' +
							'max="' + options.max + '" ' +
							'step="' + options.step + '" ' +
							'value="' + (options.value ? options.value : options.model.get(options.name)) + '"' +
							'/>';
			if (options.label) {
				tmplStr = 	'<label ' + (options.fieldId ? 'for="' + (options.fieldId + '"') : '') + '>' + '<span class="wmapp-input-title">' + options.label + '</span>' + '</label>' + tmplStr;
			}
			return tmplStr;
		},
		templateHelpers: function() {
			return this.options;
		},
		modelEvents: {
			'change': 'render',
		},
		events: {
			'input input': 'onSliderChanged',
			'change input': 'onSliderChanged',
		},
		onSliderChanged: function(e) {
			var target = $(e.target);
			this.options.model.set(this.options.name, Number(target.val()), {silent: this.options.silentChange});
			this.trigger('onSliderChanged', Number(target.val()));
		}
	});

	/**
	 * Single tab view
	 */
	View.SingleTabView = WMAPP.Extension.View.ItemView.extend({
		tagName: 'dd',
		attributes: function () {
			return {
				'data-tabslug': this.model.get('slug')
			}
		},
		template: function (data) {
			var tmplStr = '';
			if (data.adminOnly) {
				if (!WMAPP.isAdmin) {
					return tmplStr;
				}
			}
			tmplStr += '<a href="#">' + data.name + '</a>';

			return tmplStr;
		},

		onRender: function () {
			var tab = this.$el;
			if (this.model.get('active')) {
				this.$el.addClass('active');
			} else {
				this.$el.removeClass('active');
			}
		},

		triggers: {
			'click a': 'trigger:setActiveTab'
		},
	});

	/**
	 * Tab collection extension view
	 */
	View.TabCollectionView = WMAPP.Extension.View.CollectionView.extend({
		className: 'tabs',
		tagName: 'dl',
		childView: View.SingleTabView,

		// set the initial state of the tabs depending on the querystring
		initialize: function (options) {
			if (options && options.router && options.collection) {
				var currentTab = '';

				// get querystring params
				this.parameters = options.router.parseQuery();

				if (this.parameters && this.parameters.tab) {
					// get the current tab object from the collection
					// the tab with 'default === true' attribute goes by default
					// if it's missing then the first item from the collection is the default item
					currentTab = options.collection.findWhere({
						slug: this.parameters.tab
					});
				}

				if (!currentTab) { // current tab was not found
					currentTab = this.getDefaultTab(options);
				}

				// activate current tab
				if (currentTab) {
					currentTab.set('active', true);
				}
			}
		},

		/**
		 * gets the default tab if it's not set in the querystring
		 * @param options
		 * @returns {string}
		 */
		getDefaultTab: function (options) {
			var currentTab = '';
			if (options && options.collection) {
				// get the first available item with 'default' === true
				if (WMAPP.isAdmin) {
					currentTab = options.collection.findWhere({
						'default': true,
					});
				} else {
					currentTab = options.collection.findWhere({
						'default': true,
						adminOnly: false
					});
				}

				// if still empty, grab the first collection item
				if (!currentTab) {
					currentTab = options.collection.first();
				}
			}
			return currentTab;
		},

		collectionEvents: {
			'change': 'render'
		},

		onChildviewTriggerSetActiveTab: function (view) {
			var activeModel = view.model;

			// deactivate all tabs
			this.collection.reset(this.collection.map(function (tab) {
				return tab.set('active', false);
			}));

			// set the specified tab active
			view.model.set('active', true);

			// modify the querystring
			this.parameters = this.options.router.parseQuery();
			this.parameters.tab = activeModel.get('slug');
			this.options.router.navigate('/?' + this.options.router.stringifyQuery(this.parameters), {
				trigger: true
			});
		},
	});

	/**
	 * Extend the Item ViewG
	 */
	View.GoogleMap = Backbone.Marionette.ItemView.extend({
		template: function (data) {
			var options = data.options;
			var tmplStr = '';
			tmplStr += '<label for="' + options.fieldId + '">' + options.label;
			tmplStr += '<div id="' + options.fieldId + 'Map" style="width: ' + options.width + 'px; height: ' + options.height + 'px;padding-bottom: 15px;"></div></label>';
			return tmplStr;
		},
		templateHelpers: function () {
			return {
				model: this.model,
				options: this.options
			}
		},
		options: {
			width: 200,
			height: 200,
		},
		onShow: function () {
			var mapVar = {
				id: this.model.id,
				//TODO width
				width: this.options.width,
				//TODO height
				height: this.options.height,
				//title: this.model.get('_type_id').get('name')
			};

			// set map options
			var myOptions = {
				center: new google.maps.LatLng(mapVar.lat, mapVar.lng),
				zoom: mapVar.zoom,
				streetViewControl: false,
				panControl: false,
				zoomControl: false
			};

			var map = new google.maps.Map(document.getElementById(this.options.fieldId + 'Map'), myOptions);
			var bounds = new google.maps.LatLngBounds();

			// drop some markers onto the map
			if (this.options.markers.length) {
				for (var i = 0; i < this.options.markers.length; i++) {
					var marker = new google.maps.Marker({
						map: map,
						title: this.options.markers[i].name,
						position: new google.maps.LatLng(parseFloat(this.options.markers[i].latitude), parseFloat(this.options.markers[i].longitude)),
					});

					//extend the bounds to include each marker's position
					bounds.extend(marker.position);

					google.maps.event.addListener(marker, 'click', (function (marker, i) {
						return function () {
							infowindow.setContent(marker.title);
							infowindow.open(map, marker);
						}
					})(marker, i));
				}
			}

			//now fit the map to the newly inclusive bounds
			map.fitBounds(bounds);
			//Resize the map if it is zoomed too close
			var maxZoomListener = google.maps.event.addListener(map, "idle", function () {
				if (map.getZoom() > 18) map.setZoom(18);
				google.maps.event.removeListener(maxZoomListener);
			});

			// push the map into the array of maps
			name = "wmMapCanvas_" + mapVar.id;
			maps.push({
				id: name,
				map: map
			});

			// add map resize event listener
			google.maps.event.addListener(map, 'resize', function () {
				// set the map's center to the marker position
				//map.setCenter(marker.position);

			});

			// add DOM event listener to trigger map resize event for
			// each map when the window is resized
			// _.debounce is used to prevent the event from numerous executions
			google.maps.event.addDomListener(window, 'resize', _.debounce(mapResize, 500));
		},
	});

	View.Switch = View.LayoutView.extend({
		options: {
			fieldId: null,
			model: null,
			name: null,
			placeholder: null,
			label: null,
			tooltip: null,
			text: null,
			value: false,
			required: false,
			disabled: false,
		},
		initialize: function() {
			if (!this.options.text && !this.options.label) {
				this.options.text = 'Show Inactive';
			}
			//WMAPP.Extension.View.LayoutView.prototype.initialize.apply(this, arguments);
		},
		className: function() {
			var className = 'wmapp-switch';
			if (typeof this.options.value == "function") {
				className += this.options.value() ? ' selected' : '';
			} else if (this.options.value) {
				className += ' selected';
			} else if (this.options.model && this.options.name && this.options.model.get(this.options.name)) {
				className += ' selected';
			}
			return className;
		},
		id: function() {
			if (this.options.fieldId) {
				return this.options.fieldId;
			}
		},
		template: function(options) {
			var tmplStr = '';
			if (options.label) {
				tmplStr += tmplStr = '<label'
				if (options.fieldId) {
					tmplStr += ' for="' + options.fieldId + '"';
				}
				tmplStr += '>' + options.label;
				if (options.required) {
					tmplStr += '<span class="is-required" title="Required">*</span>';
				}
				if (options.tooltip) {
					tmplStr += '<span data-tooltip class="has-tip tip-right" title="' + options.tooltip + '"></span>';
				}
				if (options.placeholder) {
					tmplStr += '<span class="placeholder">' + options.placeholder + '</span>';
				}
				tmplStr += '</label>';
			}
			tmplStr +=	'<div class="wmapp-switch-switch' + (disabled ? ' disabled' : '') + '"></div>';
			if (options.text) {
				var disabled = options.disabled;
				if (typeof disabled == "function") {
					disabled = disabled(options.model);
				}
				var text = options.text;
				if (typeof options.text == "function") {
					text = options.text(options);
				}
				tmplStr += '<div class="wmapp-switch-text">' + text + '</div>';
			}
			return tmplStr;
		},
		templateHelpers: function() {
			return this.options;
		},
		events: {
			'click .wmapp-switch-switch': 'onToggle'
		},
		modelEvents: function() {
			var modelEvents = {};
			if (this.options.model && this.options.name) {
				modelEvents['change:' + this.options.name] = 'onModelChange';
			}
			return modelEvents;
		},
		onModelChange: function(model, value, options) {
			if (!options || !options.suppressModelChangeEvent) {
				if (this.options.model.get(this.options.name)) {
					this.toggleOn();
				} else {
					this.toggleOff();
				}
			}
		},
		toggleOn: function() {
			this.options.value = true;
			this.$el.addClass('selected');
			this.trigger('toggle:on');
			if (this.options.model && !this.options.model.get(this.options.name)) {
				this.options.model.set(this.options.name, true, {suppressModelChangeEvent: true});
				this.trigger('trigger:coreSwitchToggle', this.options.model);
			}
		},
		toggleOff: function() {
			this.options.value = false;
			this.$el.removeClass('selected');
			this.trigger('toggle:off');
			if (this.options.model && this.options.model.get(this.options.name)) {
				this.options.model.set(this.options.name, false, {suppressModelChangeEvent: true});
				this.trigger('trigger:coreSwitchToggle', this.options.model);
			}
		},
		onToggle: function(e) {
			var disabled = this.options.disabled;
			if (typeof this.options.disabled == "function") {
				disabled = this.options.disabled(this.options.model);
			}
			if (!disabled) {
				this.trigger('toggle');
				if (this.$el.hasClass('selected')) {
					this.toggleOff();
				} else {
					this.toggleOn();
				}
				this.$el.find('.wmapp-switch-text').text(this.getText());
			}
		},
		getText: function(options) {
			options = options || this.options;
			if (typeof options.text == "function") {
				return options.text(options);
			} else {
				return options.text;
			}
		}
	});

	View.SuperListCreate = View.LayoutView.extend({
		template: function(data) {
			var tmplStr = 	'<button class="button wmapp-add-button wmapp-button-add"'+(data.options.hideCreateButton?'style="display:none;"':'')+'>' + (data.options.createText ? data.options.createText : ('Add ' + data.options.collection.displayName)) + '</button>' +
							'<div class="wmapp-super-list-create-wrapper"></div>';
			return tmplStr;
		},
		templateHelpers: function() {
			return {
				options: this.options
			}
		},
		regions: {
			createRegion: '.wmapp-super-list-create-wrapper'
		},
		events: {
			'click .wmapp-add-button': 'onAddClicked',
		},
		onAddClicked: function(e) {
			var that = this;
			var createView = null;
			if (that.createRegion.currentView) {
				that.createRegion.reset();
			} else {
				var options = _.extend({
					model: new this.options.collection.model()
				}, this.options);

				if (this.options.createView && this.options.createView.prototype instanceof Backbone.View) {
					createView = new this.options.createView(options);
				} else if (typeof this.options.createView == "function") {
					createView = this.options.createView(options);
				}

				if (this.options.createModal) {
					var lightboxOptions = {
		        		overlayClose: true,
						width: '100%',
						maxWidth: window.innerWidth*0.9 + 'px',
						height: '100%',
						maxHeight: window.innerHeight*0.9 + 'px',
					}
					_.extend(lightboxOptions, this.options.createModalOptions);
		        	WMAPP.LightboxRegion.show(createView, lightboxOptions);
		        	// Add new model to collection
		        	this.listenTo(createView.options.model, 'sync', function() {
		        		createView.options.model.off('sync');
						that.options.collection.add(createView.options.model);
						that.options.collection.trigger('sync');
					});
				} else if (this.options.createTrigger) {
					this.trigger('superlist:create:clicked');
				} else {
					this.createRegion.show(createView);
					// add the model to the collection after it's been saved and destroy the view
					this.listenTo(createView.options.model, 'sync', function() {
						createView.options.model.off('sync');
						that.options.collection.add(createView.options.model);
						that.options.collection.trigger('sync');
						if (that.createRegion) {
							that.createRegion.reset();
						}
					});
				}
			}
		},
	});

	View.SuperListSwitch = View.LayoutView.extend({
		template: function() {
			return '<div></div>';
		},
		regions: {
			switchRegion: 'div'
		},
		onRender: function() {
			var that = this;

			var switchView = new View.Switch({
				text: this.options.switchText,
				value: function() {
					if (typeof that.options.switchValue == "function") {
						return that.options.switchValue.call(that, that.options);
					} else if (that.options.switchValue === null) {
						return that.getValue(this.options);
					} else {
						return that.options.switchValue
					}
				},
				disabled: function() {
					if (typeof that.options.switchDisabled == "function") {
						return that.options.switchDisabled(that.options);
					} else {
						return that.options.switchDisabled;
					}
				},
			});

			// bubble toggle events up to the superlist
			this.listenTo(switchView, 'toggle:on', function() {
				if (typeof that.options.switchToggle == "function") {
					that.options.switchToggle.call(that, true);
				} else if (that.options.switchToggle !== false) {
					that.onToggle.call(that, true);
				}
				this.trigger('superlist:switch:toggle:on');
			});

			this.listenTo(switchView, 'toggle:off', function() {
				if (typeof that.options.switchToggle == "function") {
					that.options.switchToggle.call(that, false);
				} else if (that.options.switchToggle !== false) {
					that.onToggle.call(that, false);
				}
				this.trigger('superlist:switch:toggle:off');
			});

			this.switchRegion.show(switchView);
		},
		getValue: function(options) {
			var paramName = this.options.collection.featureName + this.options.collection.entityName + '_' + this.options.switchFilter;
			return this.options.collection.queryParams[paramName] ? true : false;
		},
		onToggle: function(value) {

			// if there's a previous search filter, clear it
			if (this.options.collection.fullCollection && this.options.collection.fullCollection.length > 0) {
				this.options.collection.reset(this.options.collection.fullCollection, {silent: true});
				delete this.options.collection.fullCollection;
			}
			if (this.options.searchModel) {
				this.options.searchModel.set('query', '');
			}

			var paramName = this.options.collection.featureName + this.options.collection.entityName + '_' + this.options.switchFilter;
			if (this.options.switchNegate) {
				this.options.collection.queryParams[paramName] = value ? 0 : 1;
			} else {
				this.options.collection.queryParams[paramName] = value ? 1 : 0;
			}
			this.options.collection.fetch();
		}
	});

	View.SuperListItemRow = View.LayoutView.extend({
		tagName: 'tr',
		className: function() {
			var className = 'wmapp-super-list-list-row ';
			if (this.options.image) {
				className += 'image ';
			}
			if (typeof this.options.rowClass == "function") {
				className += this.options.rowClass(this.options.model);
			} else if (this.options.rowClass) {
				className += this.options.rowClass;
			}
			return className;
		},
		initialize: function() {
			if (this.options.groupBy) {
				this.$el.attr('data-group-header', typeof this.options.groupBy == "function" ? this.options.groupBy(this.model) : this.model.get(this.options.groupBy));
			}
			View.LayoutView.prototype.initialize.apply(this, arguments);
		},
		template: function(options) {
			var model = options.model;
			var tmplStr = '';

			if (options.multiEdit) {
				tmplStr += '<td class="wmapp-super-list-list-item-col multi-edit-checkbox"><input type="checkbox" /></td>';
			}

			// Ignore numbers, as they are probably an attribute called "image" which is an "image" attribute type
			if (options.image && typeof options.image != "number") {
				tmplStr += '<td class="wmapp-super-list-list-item-image" style="background-image: url(';
				if (typeof options.image == "string") {
					tmplStr += model.get(options.image).toString();
				} else if (typeof options.image == "function") {
					tmplStr += options.image(model).toString();
				} else {
					tmplStr += options.image.toString();
				}
				tmplStr +=	')">&nbsp;</td>';
			}

			var colspan = 1;
			if (options.columns.length == 1 && options.groupBy) {
				colspan++;
				if (options.image) {
					colspan--;
				}
				if (options.extendedView) {
					colspan--;
				}
			}

			var columns = options.columns;
			if (typeof options.columns == "function") {
				columns = options.columns(model);
			}
			_.each(columns, function(column, i) {
				tmplStr +=	'<td data-th="'+(options.sort ? options.sort[i] : '')+'" colspan="'+colspan+'" class="wmapp-super-list-list-item-col ';
				if (typeof column == "function") {
					var val = column(model);
					tmplStr += '">' + (val ? val.toString() : '');
				} else {
					var val = model.get(column)
					tmplStr += column + '">' + (val ? val.toString() : '');
				}
				tmplStr += '</td>';
			});


			if (options.extendedView && !options.extendedViewAlwaysShown) {
				var extendedViewLabel = "More";
				if (options.extendedViewLabel) {
					if (typeof options.extendedViewLabel == "function") {
						extendedViewLabel = options.extendedViewLabel(options);
					} else {
						extendedViewLabel = options.extendedViewLabel;
					}
				}
				tmplStr += '<td class="wmapp-super-list-list-item-col show-extended"><a href="#">' + extendedViewLabel + '</a></td>';
			}

			return tmplStr;
		},
		templateHelpers: function() {
			return this.options;
		},
		events: function() {
			var events = {};
			if (this.options.rowEvents) {
				events = _.clone(this.options.rowEvents);
			}
			events['click .show-extended a'] = 'showExtendedView';
			events['click .wmapp-super-list-list-item-col'] = 'onColumnClicked';
			return events;
		},
		onRender: function() {
			var that = this;
			if (this.options.multiEdit && this.options.multiEditSelected) {
				var checkbox = this.$el.find('td.multi-edit-checkbox input');
				// Set checkbox to be true if the model is already in the selected list
				if (this.options.multiEditSelected.get(this.options.model.get('id')) && !checkbox.prop('checked')) {
					checkbox.trigger('click');
				}
			}
			if (this.options.extendedView && this.options.extendedViewAlwaysShown) {
				setTimeout(function() {
					that.trigger('showExtendedView', that.options.model);
				}, 0);
			} else {
				setTimeout(function() {
					that.trigger('hideExtendedView', that.options.model);
				}, 0);
			}
		},
		onColumnClicked: function(e, forceState) {
			var that = this;
			if (this.options.multiEdit) {
				var item = this.$el;
				if (forceState === true) {
					item.addClass('multi-edit-selected');
				} else if (forceState === false) {
					item.removeClass('multi-edit-selected');
				} else {
					item.toggleClass('multi-edit-selected');
				}
				setTimeout(function() {
					var isSelected = item.hasClass('multi-edit-selected');
					item.find('input[type="checkbox"]').prop('checked', isSelected).trigger('change', [isSelected]);
					if (!isSelected) {
						that.trigger('hideExtendedView', that.options.model);
					}
					// change the status of the selected items
					var existedModel = that.options.multiEditSelected.findWhere({id: that.options.model.get('id')});
					if(existedModel && !isSelected) {
						that.options.multiEditSelected.remove(existedModel);
					} else if(isSelected && !existedModel) {
						that.options.multiEditSelected.add(that.options.model);
					}
					that.trigger('superlist:multiEdit:columnClicked', that.options.model, isSelected);
				}, 10);
			} else if (this.options.columnClickCallback) {
				this.options.columnClickCallback(this, that.options.model, e);
			} else if (this.options.columnClickable) {
				this.trigger('superlist:columnClickable:columnClicked', that.options.model);
			}
		},
		showExtendedView: function(e) {
			e.preventDefault();
			e.stopPropagation();
			if (this.options.selectColumnOnMoreClicked) {
				this.onColumnClicked(e, true);
			}
			this.trigger('showExtendedView', this.options.model);
		},
		hideExtendedView: function(e) {
			e.preventDefault();
			e.stopPropagation();
			if (this.options.selectColumnOnMoreClicked) {
				this.onColumnClicked(e, false);
			}
			this.trigger('hideExtendedView', this.options.model);
		}
	});

	View.SuperListCollection = View.CompositeView.extend({
		childView: View.SuperListItemRow,
		childViewContainer: '.wmapp-super-list-list-collection',
		childViewOptions: function () {
			return this.options;
		},
		childEvents: {
			hideExtendedView: 'hideExtendedView',
			showExtendedView: 'showExtendedView',
		},
		tagName: 'table',
		className: 'wmapp-table',
		template: function(options) {
			var tmplStr = '';
			if (options.sort) {
				tmplStr += '<thead class="wmapp-super-list-list-sort"><tr class="'+(options.image ? 'image' : '')+'">';
				if (options.multiEdit) {
					tmplStr += '<td class="wmapp-super-list-list-item-col multi-edit-checkbox"><input type="checkbox" /></td>';
				}
				if (options.image) {
					tmplStr += '<td class="wmapp-super-list-list-item-col image">&nbsp;</td>';
				}

				var columns = options.columns;
				if (typeof options.columns == "function") {
					columns = options.columns();
				}
				_.each(columns, function(column, i) {
					tmplStr += 	'<td class="wmapp-super-list-list-item-col" '+(options.columns.length == 1 && options.groupBy && !options.image ? 'colspan="2"' : '')+'>' +
								'	<a href="#" data-sort-order="'+(options.collection.sortColumn == i ? options.collection.sortOrder : '0')+'" data-sort-column="' + i + '">' + options.sort[i] + '</a>' +
								'</td>';
				});
				if (options.extendedView && !options.extendedViewAlwaysShown) {
					tmplStr += '<td class="wmapp-super-list-list-item-col extended">&nbsp;</td>';
				}
				tmplStr += 	'</tr></thead>';
			}
			tmplStr += '<tbody class="wmapp-super-list-list-collection"></tbody>';
			return tmplStr;
		},
		templateHelpers: function() {
			return this.options;
		},
		initialize: function() {
			this.extendedModels = new Backbone.Collection();
		},
		collectionEvents: {
			// do nothing when this collection syncs/resets (it is handled up higher in the superlist)
			'sync': function() {},
			'reset': function() {},
		},
		events: {
			'click .wmapp-super-list-list-sort a': 'onSort',
			'change .wmapp-super-list-list-sort input[type="checkbox"]' : 'onCheckboxToggle'
		},
		onCheckboxToggle: function(e) {
			var target = $(e.target);
			this.$el.find('.wmapp-super-list-list-collection .multi-edit-checkbox')
				.trigger('click', [target.prop('checked')]);
		},
		hideExtendedView: function(view, model) {
			if (this.options.extendedViewAlwaysShown) {
				return true;
			}
			if (view.extendedView) {
				view.$el.removeClass('extended-view-shown');
				view.extendedView.$el.parents('.wmapp-super-list-list-extended-view').remove();
				view.extendedView.destroy();
			}
			if (this.extendedModels && this.extendedModels.get(model)) {
				this.extendedModels.remove(model);
				return false;
			}
			return true;
		},
		showExtendedView: function(view, model) {
			if (!this.hideExtendedView(view, model)) {
				return;
			}
			var that = this;
			var extendedView = null;
			var colspan = view.$el.find('td').length;
			if (this.options.columns.length == 1 && this.options.groupBy) {
				colspan++;
				if (this.options.image) {
					colspan--;
				}
				if (this.options.extendedView) {
					colspan--;
				}
			}
			//we will need to hide all other extended views first
			if (that.options.singleExtendOnly) {
				that.extendedModels.each(function(model, index) {
					that.hideExtendedView(model.associatedViews[0], model);
				});
				that.extendedModels.reset();
			}

			this.extendedModels.push(model);

			var el =	$('<tr class="wmapp-super-list-list-extended-view ' +
							(this.options.collection.groupHeaders && this.options.collection.groupHeaders.length > 1 && this.options.extendedViewAlwaysShow ? 'hide': '') +
							'"><td colspan="'+colspan+'"><div></div></td></tr>'
						);
			if (this.options.groupBy) {
				el.attr('data-group-header', typeof this.options.groupBy == "function" ? this.options.groupBy(model) : model.get(this.options.groupBy));
			}
			view.$el.addClass('extended-view-shown');
			view.$el.after(el);

			if (typeof this.options.extendedView.constructor != "undefined") {
				extendedView = new this.options.extendedView(_.defaults({
					model: model
				}, this.options));
			} else if (typeof this.options.extendedView == "function") {
				extendedView = this.options.extendedView(_.defaults({
					model: model,
				}, this.options));
			}

			// bubble up any *superlist* events from the extended view
			this.listenTo(extendedView, 'all', function(eventName) {
				if (eventName.indexOf("superlist:") >= 0) {
					that.trigger.apply(this, arguments);
				}
			});

			extendedView.$el = el.find('div');
			extendedView.el = extendedView.$el.first();
			extendedView.delegateEvents();
			extendedView.render();
			extendedView.trigger('before:show');
			extendedView.trigger('show');

			view.extendedView = extendedView;
		},
		onSort: function(e) {
			e.preventDefault();
			e.stopPropagation();

			if (this.options.groupBy) {
				return; // don't allow sorting if we're grouping
			}

			var that = this;
			var column = $(e.target);
			var i = parseInt(column.attr('data-sort-column'));
			var sortOrder = parseInt(column.attr('data-sort-order'));
			// clean other columns first
			_.each(this.options.columns, function(column, index) {
				var theadCol = that.$el.find('thead a[data-sort-column="' + index + '"]');
				var sortOrder = parseInt(theadCol.attr('data-sort-order'));
				if(index != i) {
					theadCol.attr('data-sort-order', 0);
				}
			})
			if (sortOrder === 0) {
				sortOrder = 1;
			// check whether to use the default order
			} else if (sortOrder === -1 && this.options.defaultOrder) {
				sortOrder = 0;
			} else if (sortOrder){
				sortOrder *= -1;
			}
			column.attr('data-sort-order', sortOrder);
			
			
			if (this.options.mode == 'pageable') {
				if (sortOrder === 0) {
					delete this.options.collection.pageableCollection.queryParams['direction'];
					delete this.options.collection.pageableCollection.queryParams['sort'];
					delete this.options.collection.sortColumn;
					delete this.options.collection.sortOrder;
				} else {
					this.options.collection.sortColumn = i;
					this.options.collection.sortOrder = sortOrder;
					
					this.options.collection.pageableCollection.queryParams['direction'] = sortOrder > 0 ? 'ASC' : 'DESC';
					if (_.isArray(this.options.sortComparator)) {
						this.options.collection.pageableCollection.queryParams['sort'] = this.options.sortComparator[i];
					} else {
						this.options.collection.pageableCollection.queryParams['sort'] = this.options.columns[i];
					}
				}
				this.options.collection.pageableCollection.fetch({reset: true});
			} else {
				// use the column to order the list
				if(sortOrder === 0) {
					// should be in default order
					this.options.collection.comparator = this.options.defaultOrder;
					this.options.collection.sortColumn = -1;
					this.options.collection.sortOrder = 0;
				} else {
					this.options.collection.sortColumn = i;
					this.options.collection.sortOrder = sortOrder;
					if (_.isArray(this.options.sortComparator) && typeof this.options.sortComparator[i] == "function") {
						this.options.collection.comparator = function(modelA, modelB) {
							return that.options.sortComparator[i](modelA, modelB)*sortOrder;
						};
					} else {
						this.options.collection.comparator = function(modelA, modelB) {
							var a = "";
							var b = "";
							if (typeof that.options.columns[i] == "function") {
								a = that.options.columns[i](modelA);
								a = a ? a.toString() : '';
								b = that.options.columns[i](modelB);
								b = b ? b.toString() : '';
							} else {
								a = modelA.get(that.options.columns[i]);
								a = a ? a.toString() : '';
								b = modelB.get(that.options.columns[i]);
								b = b ? b.toString() : '';
							}
							if (a.match(/^[0-9.]*$/)) {
								a = Number(a);
							}
							if (b.match(/^[0-9.]*$/)) {
								b = Number(b);
							}
							if (typeof a == "string" && typeof b == "string") {
								a = a.replace(/<.+?>/g, '');
								b = b.replace(/<.+?>/g, '');
								return a.localeCompare(b)*sortOrder;
							} else if (a > b) {
								return 1*sortOrder;
							} else if (a < b) {
								return -1*sortOrder;
							} else {
								return 0;
							}
						}
					}
				}
				this.trigger('superlist:collectionSorted');
				this.options.collection.sort();
			}
		},
		onRender: function() {
			var that = this;
			if (this.options.groupBy) {
				this.options.collection.groupHeaders = [];
				this.$el.find('tr[data-group-header!=""]').each(function() {
					if ($(this).attr('data-group-header') && that.options.collection.groupHeaders.indexOf($(this).attr('data-group-header')) < 0) {
						that.options.collection.groupHeaders.push($(this).attr('data-group-header'));
					}
				});

				var colspan = that.$el.find('tr.wmapp-super-list-list-row').first().find('td').length - (that.options.multiEdit ? 2 : 1);

				var i = 0;
				_.each(this.options.collection.groupHeaders, function(header) {
					var tmplStr = 	'<tr class="wmapp-super-list-list-group-header' + (i%2==1?' wmapp-super-list-alt-group-header':'') + '" data-group-header-row="' + header + '">';
					if (that.options.multiEdit) {
						tmplStr += 	'	<td class="wmapp-super-list-list-group-header-checkbox multi-edit-checkbox"><input type="checkbox" /></td>'
					}
					tmplStr += 		'	<td class="wmapp-super-list-list-group-header-text" colspan="'+colspan+'"><span>' + header.replace(/"/g,'\\"') + '</span></td>' +
									'	<td class="wmapp-super-list-list-group-header-toggle"><a class="groupby-toggle groupby-hide" href="#">Hide</a></td>'
									'</tr>';

					var groupHeader = $(tmplStr);

					if (that.options.groupHeaderAttrs) {
						if (typeof that.options.groupHeaderAttrs == "function") {
							groupHeader.attr(that.options.groupHeaderAttrs(header, that.options, groupHeader));
						} else {
							groupHeader.attr(that.options.groupHeaderAttrs);
						}
					}

					if (_.size(that.options.groupHeaderEvents) > 0) {
						_.each(that.options.groupHeaderEvents, function(callback, selector) {
							var select = selector.split(' ');
							var event = select.shift();
							if (select.length) {
								groupHeader.on(event, select.join(' '), callback);
							} else {
								groupHeader.on(event, callback);
							}
						});
					}

					// jquery events, not backbone!
					groupHeader.find('.wmapp-super-list-list-group-header-toggle > a').off('click');
					groupHeader.find('.wmapp-super-list-list-group-header-toggle > a').on('click', function(e) {
						e.stopPropagation();
						e.preventDefault();
						var a = $(this);
						if (a.html() == 'Hide') {
							a.html('Show');
							a.removeClass('groupby-hide');
							a.addClass('groupby-show');
							that.$el.find('tr[data-group-header="'+header.replace(/"/g,'\\"')+'"]').addClass('hide');
						} else {
							a.html('Hide');
							a.removeClass('groupby-show');
							a.addClass('groupby-hide');
							that.$el.find('tr[data-group-header="'+header.replace(/"/g,'\\"')+'"]').removeClass('hide');
						}
					});

					if (that.options.selectGroupHeaderOnClicked) {
						groupHeader.find('td').off('click');
						groupHeader.find('td').on('click', function(e) {
							e.stopPropagation();
							e.preventDefault();
							var headerInput = that.$el.find('tr[data-group-header-row="'+header.replace(/"/g,'\\"')+'"] .multi-edit-checkbox input');
							var state = false;

							if (e.target == headerInput[0]) {
								// clicked the input box, so use whatever its value is
								state = $(e.target).prop('checked');
								setTimeout(function() {
									$(e.target).prop('checked', state);
								}, 10);
							} else {
								// clicked the column somewhere, so toggle the check value
								state = !headerInput.prop('checked');
								headerInput.prop('checked', state);
							}

							that.$el.find('tr[data-group-header="'+header.replace(/"/g,'\\"')+'"] .wmapp-super-list-list-item-col.multi-edit-checkbox').trigger('click', state);
						});
					}
					groupHeader.off('change', 'input[type="checkbox"]');
					groupHeader.on('change', 'input[type="checkbox"]', function(e) {
						that.$el.find('tr[data-group-header="'+header.replace(/"/g,'\\"')+'"] .wmapp-super-list-list-item-col.multi-edit-checkbox').trigger('click', $(this).prop('checked'));
					});

					that.$el.find('tr[data-group-header="'+header.replace(/"/g,'\\"')+'"]').first().before(groupHeader);
					if (that.options.collection.groupHeaders.length > 1) {
						groupHeader.find('.wmapp-super-list-list-group-header-toggle > a').trigger('click');
					}
					i++;
				});
			}

		}
	});

	View.SuperList = View.LayoutView.extend({
		options: {
			search: null,
			searchPlaceholder: null, // Optionally override the placeholder of the search text input
			filter: null,
			sort: null,
			sortComparator: [], // an array of comparators that match with the sort columns
			image: null,
			columns: [],
			collection: null,
			extendedView: null,
			extendedViewLabel: 'More',
			emptyView: null,
			emptyViewHidesAll: false,
			createView: null,
			createDisabled: false,
			createModal: false, // Whether to display the createView in defined region or in a modal
			createModalOptions: null, //Lightbox options for the createView modal
			createTrigger: false, // If true, pressing create will trigger instance of superlist:create:clicked instead of showing a view
			createText: null, // optionally override the default create button text
			groupBy: null,
			groupHeaderAttrs: null,
			groupHeaderEvents: {},
			multiEdit: false,
			multiEditSelected: null, // Collection of models to keep track of what has been selected
			extendedViewAlwaysShown: false,
			rowEvents: null,
			rowClass: null,
			title: false,
			switchFilter: null,
			switchText: 'Show Inactive',
			switchValue: null,
			switchToggle: null,
			switchDisabled: false,
			switchNegate: false, //Note if using switchNegate: true, if switchValue is a function its result must be negated as well
			selectColumnOnMoreClicked: true, // Selecting a row in multiEdit when "More" is clicked
			selectGroupHeaderOnClicked: false, // Selecting a group header in multiEdit when anywhere on row is clicked
			columnClickable: false,
			hideCreateButton: false,
			singleExtendOnly: false, //if this is set to true, superlist can only have one extendedview showing at a time
			mode: 'normal', // either "normal" or "pageable". Pageable assumes passing through the "fullCollection" of an infinite mode pageable collection
		},
		initialize: function() {
			var that = this;

			// use the default display attribute if no columns are provided
			if (this.options.collection && this.options.columns.length === 0) {
				this.options.columns = [
					this.options.collection.model.prototype.displayAttribute
				];
			}

			this.listenTo(this, 'superlist:configure', function(options) {
				that.options = _.extend(that.options, options);
			});

			View.LayoutView.prototype.initialize.apply(this, arguments);
		},
		template: function(data) {
			var options = data.options;
			var tmplStr = '<div class="wmapp-super-list ' + (options.multiEdit ? 'multi-edit' : '') + '">';
			if (options.title) {
				var title = null;
				if (typeof options.title == "function") {
					title = options.title(options);
				} else if (options.title === true && options.collection) {
					title = WMAPP.Helper.pluralize(options.collection.displayName);
				} else if (options.title) {
					title = options.title;
				}
				if (title) {
					tmplStr += '<h3>' + title.toString() + '</h3>';
				}
			}

			if (options.search || options.switchFilter) {
				tmplStr += '	<div>';
				if (options.search) {
					tmplStr += '		<div class="wmapp-super-list-search"></div>';
				}
				if (options.switchFilter) {
					tmplStr += '		<div class="wmapp-super-list-switch' + (options.search ? '' : ' standalone') + '"></div>';
				}
				tmplStr += '	</div>';
			}

			if (options.createView || options.createTrigger) {
				tmplStr += '	<div class="wmapp-super-list-create"></div>';
			}

			tmplStr += '	<div class="wmapp-super-list-list"></div>';
			tmplStr += '</div>';

			return tmplStr;
		},
		regions: {
			parentRegion: '.wmapp-super-list',
			listRegion: '.wmapp-super-list-list',
			searchRegion: '.wmapp-super-list-search',
			switchRegion: '.wmapp-super-list-switch',
			createRegion: '.wmapp-super-list-create',
		},
		templateHelpers: function() {
			return {
				options: this.options
			}
		},
		collectionEvents: {
			'sync': 'render',
			'reset': 'render',
			'remove': function() {
				if (this.options.collection.length == 0) {
					this.render();
				}
			},
			'add': function() {
				if (this.options.collection.length == 1) {
					this.render();
				}
			},
		},
		onRender: function() {
			var that = this;
			
			
			//if there's a previous search filter, clear it
			if (this.options.mode == "pageable" && this.options.collection.fullCollection && this.options.collection.fullCollection.length > 0) {
				this.options.collection.reset(this.options.collection.fullCollection, {silent: true});
				delete this.options.collection.fullCollection;
			}

			if ((!this.options.collection || this.options.collection.length == 0) && this.options.emptyView) {
				this.listRegion.reset();
				this.listRegion.show(new this.options.emptyView());
				if (typeof this.options.emptyViewHidesAll == "function") {
					if (this.options.emptyViewHidesAll()) {
						return;
					}
				} else if (this.options.emptyViewHidesAll) {
					return;
				}
			}

			if (this.options.collection && this.options.groupBy) {
				this.options.collection.comparator = function(modelA, modelB) {
					var a = "";
					var b = "";
					if (typeof that.options.groupBy == "function") {
						a = that.options.groupBy(modelA).toString();
						b = that.options.groupBy(modelB).toString();
					} else {
						a = modelA.get(that.options.groupBy).toString();
						b = modelB.get(that.options.groupBy).toString();
					}
					if (a.match(/^[0-9.]*$/)) {
						a = Number(a);
					}
					if (b.match(/^[0-9.]*$/)) {
						b = Number(b);
					}
					if (typeof a == "string" && typeof b == "string") {
						a = a.replace(/<.+?>/g, '');
						b = b.replace(/<.+?>/g, '');
						return a.localeCompare(b);
					} else if (a > b) {
						return 1;
					} else if (a < b) {
						return -1;
					} else {
						return 0;
					}
				}
			}

			if (this.options.createView || this.options.createTrigger) {
				var disabled = this.options.createDisabled;
				if (typeof disabled == "function") {
					disabled = disabled(this.options);
				}
				if (!disabled) {
					this.createRegion.reset();
					var createView = new View.SuperListCreate(this.options);

					this.listenTo(createView, 'all', function(eventName) {
						if (eventName.indexOf("superlist:") >= 0) {
							var args = [eventName.replace(/superlist:/g, '')].concat(Array.prototype.slice.call(arguments, 1));
							that.trigger.apply(this, args);
						}
					});

					this.listenTo(createView, 'destroy', function() {
						this.stopListening(this.createRegion.currentView);
					});

					this.createRegion.show(createView);
				}
			}

			if (this.options.switchFilter) {
				var switchView = new View.SuperListSwitch(this.options);

				this.listenTo(switchView, 'all', function(eventName) {
					if (eventName.indexOf('superlist:switch:toggle') >= 0) {
						this.trigger(eventName);
					}
				});

				this.listenTo(switchView, 'destroy', function() {
						this.stopListening(this.switchRegion.currentView);
				});

				this.switchRegion.reset();
				this.switchRegion.show(switchView);
			}

			if (this.options.search) {
				if (!this.options.searchModel) {
					this.options.searchModel = new Backbone.Model({
						query: "",
					});
				}
				this.searchField = new WMAPP.Extension.View.TextField({
					model: this.options.searchModel,
					name: 'query',
					fieldType: 'search',
					placeholder: 'Search ' + this.options.searchPlaceholder ? this.options.searchPlaceholder : this.options.collection.model.prototype.displayName,
					onKeyUp: function(e) {
						if (e.keyCode == 13) {
							that.search.call(that, that.options.searchModel.get('query'));
						} else if ($(e.target).val().trim() == "") {
							that.options.searchModel.set('query', '');
							that.search.call(that, null);
						}
					}
				});
				this.searchRegion.reset();
				this.searchRegion.show(this.searchField);
			}

			if (this.options.collection && this.options.collection.length > 0) {
				if (this.options.sort) {
					//this.sortRegion.reset();
					//this.sortRegion.show(new View.SuperListSort(this.options));
				}

				if (this.options.groupBy) {
					this.options.collection.sort();
				}

				if (this.superListCollectionView) {
					this.superListCollectionView.remove();
				}
				this.superListCollectionView = new View.SuperListCollection(this.options);

				// bubble up any *superlist* events from the collection view
				this.listenTo(this.superListCollectionView, 'all', function(eventName) {
					if (eventName.indexOf("superlist:") >= 0) {
						var args = [eventName.replace(/superlist:/g, '')].concat(Array.prototype.slice.call(arguments, 1));
						that.trigger.apply(this, args);
					}
				});

				this.listenTo(this.superListCollectionView, 'destroy', function() {
					this.stopListening(this.listRegion.currentView);
				});

				this.listRegion.show(this.superListCollectionView);
			}
		},
		search: function(query) {
			var that = this;
			if (this.options.mode == 'pageable') {
				this.options.search(query);
			} else {
				// if there's a previous search filter, clear it
				if (this.options.collection.fullCollection && this.options.collection.fullCollection.length > 0) {
					this.options.collection.reset(this.options.collection.fullCollection, {silent: true});
					delete this.options.collection.fullCollection;
				}
				if (query) {
					// keep a copy of the original full collection
					this.options.collection.fullCollection = this.options.collection.toJSON();
					// get a filtered collection
					var results = this.options.collection.filter(function(model) {
						if (typeof that.options.search == "function") {
							return that.options.search(model, query);
						} else {
							return model.get(that.options.search).toString().toLowerCase().indexOf(query.toLowerCase()) >= 0;
						}
					});
					// set the collection to the filtered list
					this.options.collection.reset(results, {silent: true});
				}
				// Re-render the list region
				this.listRegion.currentView.render();
			}
		}
	});

	View.TablegridField = View.ItemView.extend({
		options: {
			model: null,
			readonly: false,
			disabled: false,
			type: 'text',
			attribute: 'name',
			display: null,
			value: null,
			onClick: null,
			onInputChanged: null,
			onRender: null,
			silentChange: false,
		},
		template: function(options) {
			var value = '';
			if (options.model && (options.model.get(options.attribute) != null)) {
				value = options.model.get(options.attribute);
			} else if (typeof options.value == "function") {
				value = options.value();
			} else if (options.value) {
				value = options.value
			}
			return value;
		},
		templateHelpers: function() {
			return this.options;
		},
		modelEvents: function() {
			var modelEvents = {};
			if (!this.options.silentChange) {
				modelEvents['sync'] = 'render';
			}
			modelEvents['change:' + this.options.attribute] = 'render';
			return modelEvents;
		},
		onInputClicked: function() {
			this.trigger('onInputClicked');
		},
		onInputChanged: function() {
			var invalid = this.options.model.validate();
			var that = this;
			if (invalid) {
				if (invalid[this.options.attribute]) {
					this.$el.addClass('error').attr('title', invalid[this.options.attribute]);
				} else {
					WMAPP.alert(_.values(invalid).join('\n'));
				}
				WMAPP.Helper.hideSpinner();
				return;
			}

			this.$el.removeClass('error').attr('title', '');

			if (this.options.autosave) {
				if (typeof this.options.onInputChanged == "function") {
					var result = this.options.onInputChanged.call(this, this.options);
					if (typeof result == "undefined" || result) {
						this.options.model.save({
							suppressSpinner: that.options.silentChange,
							suppressStatus: that.options.silentChange,
						}, null, null);
					}
				} else {
					this.options.model.save({
						suppressSpinner: that.options.silentChange,
						suppressStatus: that.options.silentChange,
					}, null, null);
				}
			} else {
				if (typeof this.options.onInputChanged == "function") {
					this.options.onInputChanged.call(this, this.options);
				}
			}
		},
		onRender: function() {
			if (this.$el.find('input').length) {
				this.$el.find('input').attr('title', this.options.renderedValue);
			} else {
				this.$el.attr('title', this.$el.text());
			}
			if (this.options.onRender) {
				this.options.onRender.call(this);
			}
		}
	});

	View.TablegridTextField = View.TablegridField.extend({
		template: function(options) {
			var tmplStr = 	'<input type="' + options.type + '" ' +
							(options.readonly ? ' readonly="readonly"' : '') +
							(options.disabled ? ' disabled="disabled"' : '');

			var value = '';

			if (options.model && (options.model.get(options.attribute) != null)) {
				value = options.model.get(options.attribute);
			} else if (typeof options.value == "function") {
				value = options.value();
			} else if (options.value) {
				value = options.value
			}

			tmplStr += 	' value="' + value + '" title="' + value + '"';

			tmplStr +=		'/>';
			return tmplStr;
		},
		templateHelpers: function() {
			return this.options;
		},
		events: {
			'change input': 'onInputChanged',
			'click input': 'onInputClicked',
			'keyup input': function(e) {
				if (!this.options.readonly && !this.options.disabled) {
					var target = $(e.target);
					this.model.set(this.options.attribute, target.val(), { silent: this.options.silentChange });
				}
			},
		},
		modelEvents: function() {
			var modelEvents = View.TablegridField.prototype.modelEvents;
			if (!this.options.silentChange) {
				modelEvents = _.extend({
					'sync': 'render'
				}, modelEvents);
			}
			return modelEvents;
		},

	});

	View.TablegridCheckboxField = View.TablegridField.extend({
		className: 'checkbox',
		template: function(options) {
			var tmplStr = 	'<input type="checkbox" ' + (options.readonly || options.disabled ? ' disabled="disabled"' : '');
			if (options.model && options.model.get(options.attribute)) {
				tmplStr += 	' checked="checked"';
			} else if (typeof options.value == "function") {
				if (options.value()) {
					tmplStr += 	' checked="checked"';
				}
			} else if (options.value) {
				tmplStr += 	' checked="checked"';
			}

			tmplStr += 		'/>';
			return tmplStr;
		},
		templateHelpers: function() {
			return this.options;
		},
		events: {
			'click input': 'onInputClicked',
			'change input': function(e) {
				if (!this.options.readonly && !this.options.disabled) {
					var target = $(e.target);
					this.model.set(this.options.attribute, target.prop('checked'), { silent: true });
					this.onInputChanged();
				}
			}
		}
	});

	View.TablegridDateField = View.TablegridField.extend({
		template: function(options) {
			var tmplStr = 	'<input type="text" ' +
							(options.readonly ? ' readonly="readonly"' : '') +
							(options.disabled ? ' disabled="disabled"' : '');

			if (options.model && options.model.get(options.attribute)) {
				tmplStr += 	' value="' + moment(options.model.get(options.attribute), 'DD-MM-YYYY').format('DD-MM-YYYY') + '"';
			} else if (typeof options.value == "function") {
				tmplStr += 	' value="' + moment(options.value(), 'dd-MM-yyyy').format('DD-MM-YYYY') + '"';
			} else if (options.value) {
				tmplStr += 	' value="' + moment(options.value, 'dd-MM-yyyy').format('DD-MM-YYYY') + '"';
			}

			tmplStr +=		'/>';
			return tmplStr;
		},
		templateHelpers: function() {
			return this.options;
		},
		events: {
			'click input': function() {
				this.$el.find('input').fdatepicker({
					initialDate: this.options.model.get(this.options.attribute) ? moment(this.options.model.get(this.options.attribute), 'DD-MM-YYYY').format('DD-MM-YYYY') : null,
					format: 'dd-mm-yyyy',
				});
				this.$el.find('input').fdatepicker('show');
				this.datepickedInitialised = true;
				this.onInputClicked.apply(this, arguments);
			},
			'change input': function(e) {
				if (!this.options.readonly && !this.options.disabled) {
					var target = $(e.target);
					this.model.set(this.options.attribute, target.val() ? target.val() : null, { silent: this.options.silentChange });
					this.onInputChanged();
				}
			}
		},
		onDestroy: function() {
			if (this.datepickedInitialised) {
				this.$el.find('input').fdatepicker('remove');
			}
			if (View.TablegridField.prototype.onDestroy) {
				View.TablegridField.prototype.onDestroy.apply(this, arguments);
			}
		}
	});

	View.TablegridSelectField = View.TablegridField.extend({
		options: {
			valueField: 'id',
			optionField: 'name',
		},
		template: function(options) {
			var tmplStr = 	'<select> ' +
							(options.readonly ? ' readonly="readonly"' : '') +
							(options.disabled ? ' disabled="disabled"' : '');
			if (typeof options.options == "array") {
				_.each(options.options, function(option) {
					tmplStr += '<option value="' + option + '" ' + (options.model.get(options.attribute) == option ? 'selected="selected"' : '') + '>' + option + '</option>';
				})
			} else {
				options.options.each(function(option) {
					tmplStr += '<option value="' + option.get(options.valueField) + '" ';
					if (options.model.get(options.attribute) == option.get(options.valueField)) {
						tmplStr += 'selected="selected"'
					}
					tmplStr += ' data-cid="' + option.cid +'">' + option.get(options.optionField) + '</option>';
				});
			}
			tmplStr += 		'</select>';
			return tmplStr;
		},
		templateHelpers: function() {
			return this.options;
		},
		events: {
			'click select': 'onInputClicked',
			'change select': function(e) {
				if (!this.options.readonly && !this.options.disabled) {
					var value = null;
					if (typeof this.options.options == "array") {
						value = this.$el.find('select').val();
						this.model.set(this.options.attribute, value, {silent: this.options.silentChange});
					} else {
						var cid = this.$el.find('select option:selected').attr('data-cid');
						value = this.options.options.get(cid);

						this.model.set(this.options.attribute, value.get(this.options.valueField), {silent: this.options.silentChange});

						if (value instanceof WMAPP.Extension.Model.AbstractModel) {
							// an association
							this.model.set('_'+this.options.attribute, value, {silent: this.options.silentChange});
						} else {
							// most likely an enum
							this.model.set('_'+this.options.attribute, value.get(this.options.valueField), {silent: this.options.silentChange});
						}
					}
					this.onInputChanged();
				}
			}
		}
	});

	View.TablegridButtonField = View.TablegridField.extend({
		template: function(options) {
			var tmplStr = 	'<button class="button" ' +
							(options.readonly ? ' readonly="readonly"' : '') +
							(options.disabled ? ' disabled="disabled"' : '') +
							'>' +
							options.value +
							'</button>';

			return tmplStr;
		},
		templateHelpers: function() {
			return this.options;
		},
		events: {
			'click button': function(e) {
				this.onInputClicked(e);
				if (!this.options.readonly && !this.options.disabled) {
					if (typeof this.options.onClick == "function") {
						this.options.onClick.call(this, this.options);
					}
				}
			}
		}
	});

	View.TablegridDeleteButtonField = View.TablegridButtonField.extend({
		options: {
			value: 'Delete',
			onClick: function() {
				var that = this;
				WMAPP.confirm('Are you sure you want to delete this entry?', function(result) {
					if (result) {
						that.collection.remove(that.model);
						that.model.set('is_active', 0);
						that.model.save();
					}
				});
			}
		},
		onRender: function() {
			this.$el.find('button').addClass('delete');
		}
	});

	View.TablegridTextareaFieldLightbox = View.TablegridField.extend({
		template: function(options) {
			var tmplStr = 	'<h3>' + options.display + '</h3>' +
							'<textarea style="min-height:200px" ' +
							(options.readonly ? ' readonly="readonly"' : '') +
							(options.disabled ? ' disabled="disabled"' : '') +
							'>';

			if (options.model && options.model.get(options.attribute)) {
				tmplStr += 	options.model.get(options.attribute);
			} else if (typeof options.value == "function") {
				tmplStr += 	options.value();
			} /*else if (options.value) {
				tmplStr += 	options.value;
			}*/

			tmplStr += 		'</textarea>';
			return tmplStr;
		},
		templateHelpers: function() {
			return this.options;
		},
		events: {
			'keyup textarea': function(e) {
				if (!this.options.readonly && !this.options.disabled) {
					var target = $(e.target);
					this.model.set(this.options.attribute, target.val(), { silent: true });
				}
			},
			'change textarea': 'onInputChanged'
		},
	});

	View.TablegridTextareaField = View.TablegridButtonField.extend({
		options: {
			value: 'View',
			onClick: function() {
				this.onEditClicked.apply(this, arguments);
			},
		},
		onRender: function() {
			this.$el.find('button').addClass('edit');
		},
		onEditClicked: function() {
			var lightboxView = new View.TablegridTextareaFieldLightbox(this.options);

			WMAPP.LightboxRegion.show(lightboxView, {
				width: '100%',
				maxWidth: '480px',
				height: '100%',
				maxHeight: '480px',
			});
		},
	});

	View.TablegridItemView = View.LayoutView.extend({
		initialize: function() {
			var that = this;
			_.each(this.options.columns, function(column, index) {
				var region = 'field' + index + 'Region';
				that.addRegion(region, 'td[data-index="' + index + '"]');
			});
		},
		tagName: 'tr',
		className: function() {
			var className = 'wmapp-tablegrid-row';
			className += ' ' + this.options.model.entityName;
			if (!this.options.model.id) {
				className += " new";
			}
			return className;
		},
		suppressValidationErrors: true,
		template: function(options) {
			var tmplStr = 	'';
			_.each(options.columns, function(col, index) {
				var column = col();
				tmplStr += 	'<td class="';
				if (column.options.readonly) {
					tmplStr += 'readonly ';
				}
				if (column.options.disabled) {
					tmplStr += 'disabled ';
				}
				tmplStr += 	'" data-index="' + index + '"></td>';
			});
			return tmplStr;
		},
		templateHelpers: function() {
			return this.options;
		},
		events: {
			'click td:first-child': 'onFirstTdClicked'
		},
		modelEvents: {
			'sync': 'toggleNewClass',
		},
		onRender: function() {
			var that = this;
			// setTimeout(function() {
			// 	_.each(that.options.columns, function(column, i) {
			// 		//setTimeout(function() {
			// 			that.renderField.call(that, i);
			// 		//}, 0);
			// 	});
			// }, 0);

			for (var i=0; i<that.options.columns.length; i++) {
				this.renderField(i);
			}

			if (typeof this.options.groupBy == "function") {
				this.$el.attr('data-group-by', this.options.groupBy(this.options.model));
			}
		},
		renderField: function(index) {
			var region = 'field' + index + 'Region';
			if (this[region]) {
				if (this[region].currentView) {
					this[region].currentView.destroy();
				}
				var field = this.options.columns[index].call(this, this.options.model, _.extend({that: this}, this.options));
				this[region].show(field);
			}
		},
		toggleNewClass: function() {
			if (this.options.model.id) {
				this.$el.removeClass('new');
			} else {
				this.$el.addClass('new');
			}
		},
		onFirstTdClicked: function(e) {
			if (this.options.groupBy) {
				var tbody = this.$el.parents('.wmapp-tablegrid-body');
				if ($(e.currentTarget).parent().hasClass('group-visible')) {
					tbody.find('.group-visible').removeClass('group-visible');
				} else {
					tbody.find('.group-visible').removeClass('group-visible');
					tbody.find('[data-group-by="' + this.$el.attr('data-group-by') + '"]').addClass('group-visible');
				}
			}
		}
	});

	View.TablegridEmptyView = View.LayoutView.extend({
		tagName: 'tr',
		className: 'wmapp-tablegrid-row-empty',
		template: function(options) {
			return '<td colspan="' + options.columns.length + '">No records to display.</td>';
		},
		templateHelpers: function() {
			return this.options;
		},
	});

	View.Tablegrid = View.CompositeView.extend({
		options: {
			columns: null,
			autosave: true,
			highlightNew: true, // add a "new" class to rows who's model.id is not yet set
			groupBy: null, // which 'column.display' to group the rows by
			silentChange: false // determines whether a sync event is thrown on render or not
		},
		childView: View.TablegridItemView,
		childViewContainer: '.wmapp-tablegrid-body',
		childViewOptions: function() {
			return this.options
		},
		emptyView: View.TablegridEmptyView,
		emptyViewOptions: function() {
			return this.options
		},
		collectionEvents: function() {
			var events = {}
			if (!this.options.silentChange) {
				events['sync'] = 'render'
			}
			return events;
		},
		template: function(options) {
			var tmplStr = 	'<table class="wmapp-tablegrid' + (options.groupBy ? ' has-groups' : '') + '">' +
							'	<thead class="wmapp-tablegrid-head">' +
							'		<tr class="wmapp-tablegrid-row">';
			_.each(options.columns, function(col) {
				tmplStr += 	'<td>';
				var column = col();
				if (column.options.display) {
					if (typeof column.options.display == "function") {
						tmplStr += column.options.display().toString();
					} else {
						tmplStr += column.options.display.toString();
					}
				} else if (column.options.model) {
					tmplStr += column.options.model.displayName;
				}
				tmplStr += 	'</td>';
			});
			tmplStr += 		'		</tr>' +
							'	</thead>' +
							'	<tbody class="wmapp-tablegrid-body"></tbody>' +
							'</table>';
			return tmplStr;
		},
		templateHelpers: function() {
			return this.options;
		},
		onRender: function() {
			var that = this;
			if (this.options.groupBy) {
				var currentGroup = null;
				this.$el.find('[data-group-by]').each(function() {
					var el = $(this);
					var group = el.attr('data-group-by');
					if (currentGroup != group) {
						currentGroup = group;
						el.addClass('first-in-group');
						if (that.$el.find('[data-group-by="' + group + '"]').length == 1) {
							el.addClass('only-in-group');
						}
					}
				});
			}
		}
	});

	View.TabsTabItemView = View.LayoutView.extend({
		className: 'wmapp-tabs-tabs-tab',
		template: function(options) {
			var optIcon = options.model.get('icon');
			var optTabClassName = options.model.get('tabClassName');
			return (optIcon ? '<img src="' + optIcon + '" />' : '')
				+ '<div'
				+ (optTabClassName ? ' class="' + optTabClassName + '"' : '')
				+ '>' + options.model.get('name')
				+ '</div>';
		},
		templateHelpers: function() {
			return this.options;
		},
		regions: {
			tabRegion: 'div',
		},
		events: {
			'click': 'onTabClicked'
		},
		onTabClicked: function(e) {
			if (!this.$el.hasClass('active')) {
				this.trigger('onTabClicked', this.options.model);
			}
		},
		onRender: function() {
			if (this.options.model.get('tabView')) {
				var view = this.options.model.get('tabView');
				if (view instanceof Backbone.View) {
					// do nothing, it's already a view
				} else if (view.constructor == Backbone.View.constructor) {
					// create a new instance of the view object
					view = new view();
				} else if (typeof view == "function") {
					// return the result of the function
					view = view();
				}
				this.tabRegion.show(view);
			}
		},
	});

	View.TabsTabCollectionView = View.CollectionView.extend({
		childView: View.TabsTabItemView,
	});

	View.Tabs = View.LayoutView.extend({
		options: {
			loadTab: '', //Loads tab the view that has been passed in at initial load
			activeClass: 'active',
			preventDestroy: false
		},
		className: 'wmapp-tabs',
		template: function(options) {
			var optTabsRegionClassName = options['tabsRegionClassName'];
			var optViewRegionClassName = options['viewRegionClassName'];
			var tmplStr =	'<div class="wmapp-tabs-tabs' + (optTabsRegionClassName ? ' ' + optTabsRegionClassName : '') +'"></div>';
			tmplStr += '<div class="wmapp-tabs-views' + (optViewRegionClassName ? ' ' + optViewRegionClassName : '') +'"></div>';
			return tmplStr;
		},
		regions: {
			tabsRegion: '.wmapp-tabs-tabs',
			viewRegion: '.wmapp-tabs-views',
		},
		templateHelpers:function() {
			return this.options;
		},
		onRender: function() {
			var that = this;

			var tabsRegion = new View.TabsTabCollectionView({
				collection: this.options.collection
			});
			this.listenTo(tabsRegion, 'childview:onTabClicked', function(view, tab) {
				that.showTabView.call(that, tab);
			});
			this.tabsRegion.show(tabsRegion);
			//checks if view has been set in loadTab and loads the passed in view instead of the first view in collection
			if (this.options.loadTab){
				this.showTabView(this.options.loadTab);
			} else {
				// check whether the view collection is available
				if (this.options.startingTab && this.options.collection.length) {
					var that = this;
					var tab = _.find(this.options.collection.models, function(model) {
						return model.get('route') == that.options.startingTab;
					});
					if (tab) {
						this.showTabView(tab);
					}
				} else if(this.options.collection.first()) {
					this.showTabView(this.options.collection.first());
				}
			}

		},
		showTabView: function(tab) {
			var view = tab.get('view');
			if (view instanceof Backbone.View) {
				// do nothing, it's already a view
			} else if (view.constructor == Backbone.View.constructor) {
				// create a new instance of the view object
				view = new view();
			} else if (typeof view == "function") {
				// return the result of the function
				view = view();
			}
			// only show the view if it isn't already being shown;  this test is too strict
			// when multiple tabs have the same view but rendered differently according to
			// the options that are passed-in.
			this.showTabViewNoDupTest(tab, view);
		},
		showTabViewNoDupTest: function(tab, view) {
			this.viewRegion.show(view, { preventDestroy: this.options.preventDestroy });
			this.tabsRegion.$el.find('.wmapp-tabs-tabs-tab.active').removeClass('active');
			this.tabsRegion.$el.find('.wmapp-tabs-tabs-tab:nth-child('+(this.options.collection.indexOf(tab)+1)+')').addClass('active');
			
			// update the router if present
			if (this.options.appRouter && this.options.appRoute) {
				this.options.appRouter.navigate(this.options.appRoute + '/' + tab.get('route'));
			}
		}
	});

	View.Button = WMAPP.Extension.View.LayoutView.extend({
		template: function (data) {
			var tmplStr = '<button';
			tmplStr += ' class="wmapp-button';
			if (data.options.classTag) {
				tmplStr += ' ' + data.options.classTag;
			}
			tmplStr += '"';
			// Add extra attributes in form of
			// attributes: {
			// 		attribute: value
			// }
			if (data.options.attributes) {
				var attrs = data.options.attributes;
				for (var key in attrs) {
					if (attrs.hasOwnProperty(key)) {
						tmplStr += ' ' + key + '="';
						if (_.isArray(attrs[key])) {
							_.each(attrs[key], function (childAttr) {
                                tmplStr += childAttr + ' ';
							});
							tmplStr += '"';
                        } else {
							tmplStr += attrs[key] + '"';
						}
					}
				}
			}
			tmplStr += '>';
			if (data.options.label) {
				tmplStr += data.options.label;
			}
			tmplStr += '</button>';
			return tmplStr;
		},
		templateHelpers: function() {
			return {
				options: this.options
			}
		},
		onRender: function () {
			if (this.options.readonly !== undefined && this.options.readonly) {
				this.ui.button.prop('disabled', true);
			}
		},
		ui: {
			'button': 'button.wmapp-button'
		},
		triggers: {
			'click .wmapp-button': 'trigger:onButtonClicked'
		},
		options: {
			classTag: null,
			label: null,
			attributes: {}
		}
	});

	/**
	 * ------------------------------------------------------------------------------------------------------------------------------------
	 * MOBILE APP VIEWS
	 * ------------------------------------------------------------------------------------------------------------------------------------
	 */

	View.MobileTabMenuItemView = WMAPP.Extension.View.ItemView.extend({
		tagName: 'li',
		template: function(options) {
			if (options.model.get('html')) {
				return options.model.get('html');
			} else {
				var imgSrc = options.image || ('img/' + WMAPP.Helper.slugify(options.model.get('feature')) + '/icons/' + WMAPP.Helper.slugify(options.model.get('name')) + '.svg');
				var tmplStr = '<img src="' + imgSrc + ' " />';
				if (options.model.get('show_name')) {
					tmplStr += '<br />' + options.model.get('name');
				}
				return tmplStr;
			}
		},
		templateHelpers: function() {
			return this.options;
		},
		events: {
			'click': 'onTabClicked'
		},
		onRender: function() {
			if (this.options.model.get('active')) {
				this.$el.parents('ul').find('.active').removeClass('active');
				this.$el.addClass('active');
			}
		},
		onTabClicked: function(e) {
			e.preventDefault();
			this.$el.parents('ul').find('.active').removeClass('active');
			this.$el.addClass('active');
			if (this.options.model.get('route')) {
                WMAPP.vent.trigger('trigger:menu:gotoRoute', this.options.model.get('route'), this.options.model.get('tileAnimation'), true); //3rd param isTabClicked=true
			} else if (this.options.model.get('trigger')) {
				WMAPP.vent.trigger(this.options.model.get('trigger'));
			} else if (this.options.model.get('callback') && typeof this.options.model.get('callback') == "function") {
				var callback = this.options.model.get('callback');
				callback(this.options.model);
			}
		},
		modelEvents: {
			'change:active': 'render',
		}
	});

	View.MobileTabMenu = WMAPP.Extension.View.CollectionView.extend({
		tagName: 'ul',
		childView: View.MobileTabMenuItemView,
		onRender: function() {
			this.onPopStateHandler = this.onPopState.bind(this)
			window.addEventListener('popstate', this.onPopStateHandler);
			this.onPopState();
		},
		onBeforeDestroy: function() {
			window.removeEventListener('popstate', this.onPopStateHandler);
		},
		onPopState: function() {
			var hash = window.location.hash.substring(1);
			var route = this.options.collection.each(function(tab) {
				if (hash.indexOf(tab.get('route')) >= 0) {
					tab.set('active', true);
				} else {
					tab.set('active', false);
				}
			});
		},
	});


	/**
	 * Extend the Layout View to make mobile layout
	 */
	View.MobileAppLayout = WMAPP.Extension.View.LayoutView.extend({
		options: {
			menuSide: 'right',
			menuHeading: 'Menu',
			menuPushesContent: true,
			tabs: false,
			showSyncStatus: false,
			contentHasPadding: true,
			syncProgressPosition: 'top' // options: aboveTitle (or top), belowTitle, aboveTabs, belowTabs (or bottom)
		},
		el: '#wmappMobileLayout',
		template: function (options) {
            //display: none is required to hide title bar and tab bar initially for login screen on slow Android devices
            var tmplStr =	'<div style="display: none;" class="wmapp-off-canvas-menu"></div>' +
							'<div style="display: none;" class="wmapp-title-bar">' +
							'	<h1 id="wmappMobileTitle" class="app" data-menu-side="'+ options.menuSide + '" data-menu-pushes-content="' + options.menuPushesContent.toString() + '">';
			if (['top', 'aboveTitle', 'belowTitle'].indexOf(options.syncProgressPosition) >= 0) {
				tmplStr += 	'		<div class="wmapp-mobile-sync-progress ' + options.syncProgressPosition + '"></div>';
			}
			tmplStr +=		'		<a href="#" class="wmapp-mobile-back-button"' + (Backbone.History.savedStates.length <= 1 ? ' style="opacity: 0" ' : '') + '></a>';
			if (options.menuSide == 'left') {
				tmplStr +=	'		<a href="#" class="wmapp-mobile-menu"></a>';
			}
			tmplStr +=		'		<span id="wmappTitle">' + WMAPP.title + '</span>';
			if (WMAPP.isSync) {
				tmplStr += 	'		<a href="#" class="wmapp-mobile-sync-button"></a>';
			}
			switch (options.menuSide) {
				case 'right':
					tmplStr += '	<a href="#" class="wmapp-mobile-menu"></a>';
					break;
				case 'custom':
					tmplStr += '	<a href="#" class="wmapp-custom-button"></a>';
					break;
				case 'none':
					break;
			}
			tmplStr +=		'	</h1>' +
							'</div>' +
							'<div class="wmapp-mobile-content-wrapper app' + (options.tabs ? ' tabs' : '') + '">' +
							'	<div class="wmapp-mobile-content ' + (options.contentHasPadding ? 'padding' : '') + '">' +
							'	</div>' +
							'</div>';
			if (options.showSyncStatus) {
				tmplStr += '<div class="wmapp-sync-status"></div>'
			}
			if (options.tabs) {
                tmplStr += '<div style="display: none;" class="wmapp-tab-bar app"></div>';
			}
			if (['bottom', 'aboveTabs', 'belowTabs'].indexOf(options.syncProgressPosition) >= 0) {
				tmplStr += '<div class="wmapp-mobile-sync-progress ' + options.syncProgressPosition + '"></div>';
			}
			return tmplStr;
		},
		initialize: function () {
			this.$el.html(this.template(this.templateHelpers())); // this.$el is a jQuery wrapped el var
			this.render();
			if (WMAPP.isApp) {
				WMAPP.setTitle(WMAPP.title);
			}
			if (WMAPP.syncInBackground) {
				this.listenTo(WMAPP.vent, 'trigger:app:sync:push:progress', this.onSyncProgress, this)
				this.listenTo(WMAPP.vent, 'trigger:app:sync:pull:progress', this.onSyncProgress, this)
			}
		},
		onDestroy: function() {
			if (WMAPP.syncInBackground) {
				this.stopListening(WMAPP.vent, 'trigger:app:sync:push:progress', this.onSyncProgress)
				this.stopListening(WMAPP.vent, 'trigger:app:sync:pull:progress', this.onSyncProgress)
			}
		},
		regions: {
			offCanvasMenu: '.wmapp-off-canvas-menu',
			tabBar: '.wmapp-tab-bar',
		},
		events: function() {
			var events = {
				'click a.wmapp-mobile-menu': 'toggleMenu',
				'click a.wmapp-custom-button': 'customButton',
				'click a.wmapp-mobile-back-button': 'backButton',
				'click a.wmapp-mobile-sync-button': _.debounce(this.syncButton, 500),
			}
			return events;
		},
		openMenu: function() {
			if (!this.mobileOffCanvasMenu.options.isOpen) {
				this.mobileOffCanvasMenu.open();
			}
		},

		closeMenu: function() {
			if (this.mobileOffCanvasMenu.options.isOpen) {
				this.mobileOffCanvasMenu.close();
			}
		},

		toggleMenu: function (e) {
			e.preventDefault();
			e.stopPropagation();
			click(e, this, function (e, context) {
				if (context.mobileOffCanvasMenu.options.isOpen) {
					context.mobileOffCanvasMenu.close();
				} else {
					context.mobileOffCanvasMenu.open();
				}
			}, 1);
		},

		customButton: function (e) {
			e.preventDefault();
			e.stopPropagation();
			console.log('User button (app) pressed');
			click(e, this, function () {
				WMAPP.vent.trigger('trigger:menu:gotoRoute', WMAPP.customButtonRoute);
			});
		},

		backButton: function (e) {
			e.preventDefault();
			e.stopPropagation();
			console.log('Back button (app) pressed');
			click(e, this, function () {
				WMAPP.vent.trigger('trigger:app:back', 'soft-back');
			});
		},

		syncButton: function (e) {
			e.preventDefault();
			e.stopPropagation();
			click(e, this, function () {
				WMAPP.vent.trigger('trigger:app:sync');
			});
		},

		templateHelpers: function () {
			return this.options;
		},

		initNavigation: function (menu, tabs) {
			this.$el.find('.wmapp-mobile-menu').show();
			this.mobileOffCanvasMenu = new View.MobileOffCanvasMenu({
				collection: menu,
				menuSide: this.options.menuSide,
				menuHeading: this.options.menuHeading,
				menuPushesContent: this.options.menuPushesContent,
			});
			this.offCanvasMenu.show(this.mobileOffCanvasMenu);
		},

        //bugfix 20190528 Android Alcatel 1x: first time app install > tab-bar and title-bar is shown for about 300ms. NOTE: this does not happen a high performance device only on slow ones
        showNavigation: function(){
            this.$el.find('.wmapp-mobile-menu').removeAttr('style');
            this.$el.find('.wmapp-off-canvas-menu').removeAttr('style');
            this.$el.find('.wmapp-title-bar').removeAttr('style');
            
            if (this.options.tabs) {				
                this.$el.find('.wmapp-tab-bar').removeAttr('style');
				this.tabMenu = new View.MobileTabMenu({
					collection: WMAPP._app.get('tabs'),
				});
				this.tabBar.show(this.tabMenu);
			}
        },

		hideNavigation: function () {
			this.$el.find('.wmapp-title-bar').hide();
            this.$el.find('.wmapp-mobile-menu').hide();
			if (this.options.tabs) {
				this.$el.find('.wmapp-tab-bar').hide();
			}
		},
        
		onSyncProgress: function(done, total, percentage) {
			var that = this;
			$('body').find('.wmapp-spinner').css('top', '2px');
			this.$el.find('.wmapp-mobile-sync-progress').css('width', percentage + '%');
			if (done === total) {
				setTimeout(function(){
					that.$el.find('.wmapp-mobile-sync-progress').css('width', '0');
					$('body').find('.wmapp-spinner').css('top', '0');
				}, 300);
			}
		},
		resetButtons: function() {
			var tmplStr = this.template(this.templateHelpers());
			var titleEl = $(tmplStr).find('#wmappMobileTitle');
			this.$el.find('#wmappMobileTitle').replaceWith(titleEl);
			this.delegateEvents();
		},
		removeButtons: function() {
			this.$el.find('#wmappMobileTitle > a').off('click').remove();
		},
		addButton: function(side, options) {
			var tmplStr = '<a href="#" class="' + (options.className ? options.className : '') + '">';
			if (options.icon) {
				tmplStr += '<img src="' + options.icon + '" />';
			}
			if (options.text) {
				tmplStr += '<span>' + options.text + '</span>';
			}
			tmplStr += '</a>';

			var el = $(tmplStr);
			el.on('click', function(e) {
				e.stopPropagation();
				e.preventDefault();
				if (typeof options.onClick == 'function') {
					options.onClick(e);
				}
			});
			if (side == 'left') {
				this.$el.find('#wmappTitle').before(el);
			} else {
				this.$el.find('#wmappMobileTitle').append(el);
			}
		}
	});

	/**
	 * Extend the Item View for an offcanvas menu item
	 */
	View.MobileOffCanvasMenuItem = Backbone.Marionette.ItemView.extend({
		tagName: 'li',
		template: function (data) {
			return	'<a href="#" id="' + data.model.get('route') + '">' +
					(data.model.get('icon') ? '<img src="'+data.model.get('icon')+'"/> ' : '') +
					'<span>' + data.model.get('name') + '</span></a>';
		},

		templateHelpers: function () {
			return {
				model: this.model,
			}
		},

		events: {
			'click a': 'menuItemClicked'
		},

		menuItemClicked: function (event) {
			event.preventDefault();
			this.options.parent.close.call(this.options.parent);
			var route = this.options.model.get('route');
			if (typeof route == "function") {
				route = route(this.options.model);
			}
			if (route) {
				WMAPP.vent.trigger('trigger:menu:gotoRoute', route);
			}
		},
		className: function() {
			return this.options.model.get('className');
		}
	});

	/**
	 * Extend the Composite View for an offcanvas menu
	 */
	View.MobileOffCanvasMenu = Backbone.Marionette.CompositeView.extend({
		options: {
			isOpen: false,
			collection: null,
			menuSide: 'right',
			menuHeading: 'Menu',
			menuPushesContent: true,
		},
		childView: View.MobileOffCanvasMenuItem,
		childViewContainer: 'ul',
		childViewOptions: function () {
			return {
				parent: this,
			};
		},
		template: function (options) {
			var tmplStr =	'<ul id="wmappMobileMenu" data-side="' + options.menuSide + '" data-version="v' + WMAPP.version + ' (' + WMAPP.build + ')">' +
							'	<li>' + options.menuHeading + '</li>' +
							'</ul>' +
							'<div id="wmappMobileMenuHotspot" data-side="' + options.menuSide + '">&nbsp;</div>';
			return tmplStr;
		},
		templateHelpers: function() {
			return this.options;
		},
		events: {
			'click #wmappMobileMenuHotspot': 'close'
		},
		close: function () {
			$("#wmappMobileMenu, #wmappMobileMenuHotspot").removeClass("active");
			$(".app").removeClass("wmapp-mobile-menu-open");
			this.options.isOpen = false;
		},
		open: function () {
			$("#wmappMobileMenu, #wmappMobileMenuHotspot").addClass("active");
			$(".app").addClass("wmapp-mobile-menu-open").attr('data-menu-side', this.options.menuSide);
			this.options.isOpen = true;
			var that = this;
			setTimeout(function () {
				that.delegateEvents();
			}, 300);
		},
		onRender: function() {
			$(".app").attr('data-menu-pushes-content', this.options.menuPushesContent.toString());
		}
	});

	/**
	 * Extend the Layout View to make mobile layout
	 */
	View.MobileAppLayoutFull = WMAPP.Extension.View.LayoutView.extend({
		options: {
			padding: true,
		},
		el: '#wmappMobileLayout',
		template: function () {
			var tmplStr = '<div class="wmapp-mobile-content-wrapper app" style="padding-top:0">' +
				'	<a href="#" class="wmapp-easter-egg"></a>' +
				'	<div class="wmapp-mobile-content ' + (options.padding ? 'padding' : '') + '">' +
				'	</div>' +
				'</div>';
			return tmplStr;
		},
		initialize: function () {
			this.$el.html(this.template()); // this.$el is a jQuery wrapped el var
			this.render();
		},
	});

	View.ProductTourView = View.ItemView.extend({
		initialize: function (options) {
			this.options = _.extend(options, this.options);
		},
		templateHelpers: function () {
			return {
				model: this.model,
				options: this.options
			};
		},
		template: function (data) {
			var tmplStr = '<p class="wmapp-product-tour-skip">skip tour</p>';
			tmplStr += '<div class="wmapp-product-tour">';
			for (var i = 0; i < data.options.slides.length; i++) {
				tmplStr += '<div><span>' + data.options.slides[i];
				if (i == data.options.slides.length - 1) {
					tmplStr += "<button>Let's Get Started</button>";
				}
				tmplStr += '</span></div>';
			}
			tmplStr += '</div><ul class="wmapp-product-tour-indicators">';
			for (var i = 0; i < data.options.slides.length; i++) {
				tmplStr += '<li' + (i === 0 ? ' class="current"' : '') + '></li>';
			}
			tmplStr += '</ul>';
			return tmplStr;
		},
		events: {
			'click .wmapp-product-tour-skip': "onSkipTour",
			'click .wmapp-product-tour button': "onFinishTour",
		},
		onSkipTour: function (e) {
			var onSkipTourMethod = function (e, context) {
				context.exitTour();
			}
			if (window.click && WMAPP.isApp) {
				click(e, this, onSkipTourMethod);
			} else {
				onSkipTourMethod(e, this);
			}
		},
		onFinishTour: function (e) {
			var onFinishTourMethod = function (e, context) {
				context.exitTour();
			}
			if (window.click && WMAPP.isApp) {
				click(e, this, onFinishTourMethod);
			} else {
				onFinishTourMethod(e, this);
			}
		},
		exitTour: function () {
			localStorage.setItem("WMAPP.hasSeenProductTour", true);
			$(".wmapp-product-tour-container").css("opacity", 0);
			setTimeout(function () {
				$(".wmapp-product-tour-container").remove();
			}, 500);
		},
		onShow: function () {
			var that = this;
			$(".wmapp-product-tour").slick({
				arrows: false,
				infinite: false,
				mobileFirst: true,
			}).on("beforeChange", function (e, slick, currentSlide, nextSlide) {
				// animate the background
				$('.wmapp-product-tour-container').css({
					"transform": "translate3d(" + (nextSlide * -100) + "px, 0, 0)",
					"-webkit-transform": "translate3d(" + (nextSlide * -100) + "px, 0, 0)"
				});
				// animate the forground
				$('.wmapp-product-tour-container > div').css({
					"transform": "translate3d(" + (nextSlide * 100) + "px, 0, 0)",
					"-webkit-transform": "translate3d(" + (nextSlide * 100) + "px, 0, 0)"
				});
				// update the indicator
				$($(".wmapp-product-tour-indicators li")[currentSlide]).removeClass("current");
				setTimeout(function () {
					$($(".wmapp-product-tour-indicators li")[nextSlide]).addClass("current");
				}, 200);
			});
			$('.wmapp-product-tour-container').css({
				'opacity': 1,
				'background-position': '0px center',
			});
		}
	});

	View.MobileAppSupport = View.LayoutView.extend({
		options: {
			// none at this stage
		},
		template: function(options) {
			var tmplStr =	'<p class="version">Version ' + WMAPP.version + ' (' + WMAPP.build + ')' + '</p>' +
							'<p><a href="mailto:' + WMAPP.supportEmail + '">' + WMAPP.supportEmail + '</a></p>' +
							'<p class="terms">' +
							'	<a href="' + WMAPP.privacyUrl + '">Privacy Policy</a>' +
							'	<a href="' + WMAPP.termsUrl + '">Terms</a>' +
							'</p>' +
							'<div class="wmapp-mobile-upload-database">' +
							'	<h4>Upload Database</h4>' +
							'	<p>' +
							'		To assist in supporting you, we may ask for a copy of your database.' +
							'		Before doing so, please ensure you have plenty of battery and are on a stable internet connection, as this may take <strong>quite a while.</strong>' +
							'	</p>' +
							'	<label><input type="checkbox" />Include application logs</label>' +
							'	<button>Upload Database</button>' +
							'</div>' +
							'<div class="wmapp-mobile-reset-database">' +
							'	<h4>Reset Database</h4>' +
							'	<p>' +
							'		If you are experiencing issues with inconsistent data, you may need to reset your database and re-sync.' +
							'	</p>' +
							'	<button>Reset Database</button>' +
							'</div>';
			return tmplStr;
		},
		templateHelpers: function() {
			return this.options;
		},
		events: {
			'click a': 'onLinkClicked',
			'click .wmapp-mobile-upload-database button': 'onUploadClicked',
			'click .wmapp-mobile-reset-database button': 'onResetClicked',
		},
		onLinkClicked: function(e) {
			if ($(e.target).attr('href').indexOf('mailto:') < 0) {
				e.preventDefault();
				e.stopPropagation();
				window.open($(e.target).attr('href'), '_system');
			}
		},
		onUploadClicked: function() {
			var includeLogs = this.$el.find('.wmapp-mobile-upload-database input[type="checkbox"]').prop('checked');
			var startedAt = new Date().valueOf();
			this.options._dialog.close();

			WMAPP.Helper.showSpinner();
			WMAPP.uploadDatabase(localStorage.getItem('WMAPP.site'), reason, function(e) {
				if (e === false) {
					delete WMAPP.Helper.progressBars['uploadDatabase'];
					WMAPP.Helper.refreshProgressBars();
					WMAPP.Helper.hideSpinner();
					WMAPP.Helper.hideStatus();
					return;
				}
				WMAPP.Helper.progressBars['uploadDatabase'] = e.loaded *100 / e.total;
				if (includeLogs) {
					WMAPP.Helper.progressBars['uploadDatabase'] /= 2;
				}
				WMAPP.Helper.refreshProgressBars();

				var kbps = (e.loaded/1024) / ((new Date().valueOf() - startedAt) / 1000);
				WMAPP.Helper.showStatus('Uploading at ' + kbps.toFixed(0) +' KB/s');
			}).then(function(email) {
				if (includeLogs) {
					WMAPP.uploadDatabase('logs', function(e) {

						WMAPP.Helper.progressBars['uploadDatabase'] = e.loaded * 100 / e.total;
						if (includeLogs) {
							WMAPP.Helper.progressBars['uploadDatabase'] /= 2;
							WMAPP.Helper.progressBars['uploadDatabase'] += 50;
						}
						WMAPP.Helper.refreshProgressBars();

						var kbps = (e.loaded/1024) / ((new Date().valueOf() - startedAt) / 1000);
						WMAPP.Helper.showStatus('Uploading at ' + kbps.toFixed(0) +' KB/s');

					}).then(function(email) {
						WMAPP.Helper.showMessage('success', 'Successfully sent database' + (email ? (' to ' + email) : '') + '.');

						delete WMAPP.Helper.progressBars['uploadDatabase'];
						WMAPP.Helper.refreshProgressBars();
						WMAPP.Helper.hideSpinner();
						WMAPP.Helper.hideStatus();
					}, function(error) {
						WMAPP.Helper.showMessage('error', error ? error : 'Failed to upload logs database.');

						delete WMAPP.Helper.progressBars['uploadDatabase'];
						WMAPP.Helper.refreshProgressBars();
						WMAPP.Helper.hideSpinner();
						WMAPP.Helper.hideStatus();
					});
				} else {
					WMAPP.Helper.showMessage('success', 'Successfully uploaded database' + (email ? (' to ' + email) : '') + '.');

					delete WMAPP.Helper.progressBars['uploadDatabase'];
					WMAPP.Helper.refreshProgressBars();
					WMAPP.Helper.hideSpinner();
					WMAPP.Helper.hideStatus();
				}
			}, function(error) {
				WMAPP.Helper.showMessage('error', error ? error : 'Failed to upload app database.');

				delete WMAPP.Helper.progressBars['uploadDatabase'];
				WMAPP.Helper.refreshProgressBars();
				WMAPP.Helper.hideSpinner();
				WMAPP.Helper.hideStatus();
			});
		},
		onResetClicked: function() {
			this.options._dialog.close();
			WMAPP.dialog({
				message: 'Are you sure you want to reset your data and re-sync with the server? <strong>Any un-synced data will be lost.</strong>',
				title: 'Reset Data',
				buttons: ['No', 'Yes'],
				warning: true,
				showClose: false,
			}).promise.then(function(buttonIndex) {
				if (buttonIndex === 2) {
					WMAPP.vent.trigger('trigger:app:resync');
				}
			});
		},
	});

	View.ProgressBar = View.LayoutView.extend({
		options: {
			collection: null,
			value: null,
			caption: true,
			model: null,
			attribute: 'progress',
			inlineStyle: true,
		},
		className: 'wmapp-progress-bar-wrapper',
		template: function(options) {
			var percentage = options.getProgress();
			var tmplStr = '';
			tmplStr += '<div class="wmapp-progress-bar-total"';
			if(options.inlineStyle){
				tmplStr += 'style="background-color:#FF0000; height:10px;"';
			}
			tmplStr += '>';
			tmplStr += '	<div class="wmapp-progress-bar-completed" style="width:'+(percentage*100)+'%;';
			if(options.inlineStyle){
				tmplStr += ' background-color:#00FF00; height:10px;';
			}
			tmplStr += '"></div>';
			tmplStr += '</div>';

			if (options.caption) {
				tmplStr += typeof options.caption == "function" ? options.caption(options) : typeof options.caption == "boolean" ? ((percentage*100)+'%') : options.caption;
			}

			return tmplStr;
		},
		templateHelpers: function() {
			var that = this;
			return _.extend(this.options, {
				getProgress: function() {
					return that.getProgress.call(that);
				}
			});
		},
		getProgress: function() {
			var progress = 0;
			if (this.options.value) {
				if (typeof this.options.value == 'function') {
					progress = parseFloat(this.options.value(this.options.model, this.options));
				} else {
					progress = parseFloat(this.options.value);
				}
			} else if (this.options.model && this.options.attribute) {
				progress = parseFloat(this.options.model.get(this.options.attribute));
			}
			return progress > 1 ? 1 : progress < 0 ? 0 : progress;
		},
	});

	View.ProgressCircle = View.LayoutView.extend({
		options: {
			image: null,
			caption: null,
			model: null,
			attribute: 'progress',
			value: null,
			colour: 'rgba(0, 0, 255, 0.5)',
			noProgressColour: 'rgb(175, 175, 175)',
			noProgressFade: 0.8,
			outline: null,
			animate: true,
		},
		className: 'wmapp-progress-circle',
		template: function(options) {
			var tmplStr =	'<div class="wmapp-progress-circle-wrapper">' +
							'	<div class="wmapp-progress-circle-progress"></div>';
			if (options.image) {
				tmplStr += 	'	<div class="wmapp-progress-circle-image"></div>';
			}
			tmplStr += 		'</div>';
			if (options.caption) {
				tmplStr += 	'<div class="wmapp-progress-circle-caption"></div>';
			}
			return tmplStr;
		},
		templateHelpers: function() {
			return this.options;
		},
		events: {
			'click .wmapp-progress-circle-progress': 'onClicked',
			'click .wmapp-progress-circle-image > img': 'onClicked',
		},
		modelEvents: function() {
			var events = {
				sync: 'render',
			}
			events['change:'+this.options.attribute] = 'animateProgress';
			return events;
		},
		onRender: function(e) {
			var that = this;
			this.setCaption();
			this.$el.attr('data-border-colour', this.$el.css('border-color'));
			if (this.getProgress() === 0) {
				if (this.options.noProgressFade) {
					this.$el.css('opacity', this.options.noProgressFade);
				}
				if (this.options.noProgressColour) {
					this.$el.css('border-color', typeof this.options.noProgressColour == 'function' ? this.options.noProgressColour(this.options.model) : this.options.noProgressColour)
				}
			}
			this.progressCircleOutline = null;
			this.progressCircle = new ProgressBar.Circle(this.$el.find('.wmapp-progress-circle-progress')[0], {
				easing: 'easeOut',
				strokeWidth: 50,
				color: typeof this.options.colour == 'function' ? this.options.colour(this.options.model) : this.options.colour,
			});
			if (this.options.outline) {
				this.progressCircleOutline = new ProgressBar.Circle(this.$el.find('.wmapp-progress-circle-progress')[0], {
					easing: 'easeOut',
					strokeWidth: 8/(window.devicePixelRatio < 2 ? 4 : window.devicePixelRatio),
					color: typeof this.options.outline == 'function' ? this.options.outline(this.options.model) : this.options.outline,
				});
			}
			setTimeout(function() {
				that.animateProgress.call(that, false);
			}, this.options.animate ? 400 : 0);
		},
		setCaption: function() {
			if (this.options.image) {
				this.$el.find('.wmapp-progress-circle-image').html('	<img src="' + (typeof this.options.image == 'function' ? this.options.image(this.options.model) : this.options.image) + '" />');
			}
			if (this.options.caption) {
				this.$el.find('.wmapp-progress-circle-caption').html(this.options.caption ? (typeof this.options.caption == 'function' ? this.options.caption(this.options.model) : this.options.caption) : '');
			}
		},
		getProgress: function() {
			var progress = 0;
			if (this.options.value) {
				if (typeof this.options.value == 'function') {
					progress = parseFloat(this.options.value(this.options.model));
				} else {
					progress = parseFloat(this.options.value);
				}
			} else if (this.options.model && this.options.attribute) {
				progress = parseFloat(this.options.model.get(this.options.attribute));
			}
			return progress > 1 ? 1 : progress < 0 ? 0 : progress;
		},
		animateProgress: function(e) {
			var progress = this.getProgress();
			if (progress === 0) {
				if (this.options.noProgressColour) {
					this.$el.css('border-color', typeof this.options.noProgressColour == 'function' ? this.options.noProgressColour(this.options.model) : this.options.noProgressColour)
				}
				if (this.options.noProgressFade) {
					this.$el.css('opacity', this.options.noProgressFade);
				}
				return;
			} else {
				if (this.options.noProgressFade) {
					this.$el.css('opacity', 1);
				}
				this.$el.css('border-color', this.$el.attr('data-border-colour'));
			}
			if (this.progressCircle) {
				$(this.progressCircle.path).attr('stroke', typeof this.options.colour == 'function' ? this.options.colour(this.options.model) : this.options.colour);
				if (this.options.animate) {
					this.progressCircle.animate(progress);
				} else {
					this.progressCircle.set(progress);
				}
			}
			if (this.progressCircleOutline) {
				$(this.progressCircleOutline.path).attr('stroke', typeof this.options.outline == 'function' ? this.options.outline(this.options.model) : this.options.outline);

				if (this.options.animate) {
					this.progressCircleOutline.animate(progress, {
						color: typeof this.options.outline == 'function' ? this.options.outline(this.options.model) : this.options.outline
					});
				} else {
					this.progressCircleOutline.set(progress);
				}
			}
			this.setCaption();
		},
		onClicked: function(e) {
			this.trigger('trigger:onClicked', this.options.model);
		}
	});

	View.Button = WMAPP.Extension.View.LayoutView.extend({
		template: function(data) {
			var tmplStr = '<button';
			tmplStr += ' class="wmapp-button';
			if (data.options.classTag) {
				tmplStr += ' ' + data.options.classTag;
			}
			tmplStr += '"';
			//add extra attributes
			if (data.options.attributes) {
				var attrs = data.options.attributes;
				for (var key in attrs) {
					if (attrs.hasOwnProperty(key)) {
						tmplStr += ' ' + key + '="' + attrs[key] + '"';
					}
				}
			}
			if (data.options.disabled === true){
				tmplStr += 'disabled="disabled"';
			}
			tmplStr += '>';
			if (data.options.label) {
				tmplStr += data.options.label;
			}
			tmplStr += '</button>';
			return tmplStr;
		},
		templateHelpers: function() {
			return {
				options: this.options
			}
		},
		onRender: function () {
			if (this.options.readonly !== undefined && this.options.readonly) {
				this.ui.button.prop('disabled', true);
			}
		},
		ui: {
			'button': 'button.wmapp-button'
		},
		events: {
			'click .wmapp-button': function(e) {
				this.trigger('trigger:onButtonClicked', e);
			}
		},
		options: {
			classTag: null,
			label: null,
			disabled: false,
			attributes: {},
		},

	});

	View.ChipsAutocompleteItemView = View.ItemView.extend({
		className: function() {
			return this.options.model.id == this.options.selectedId ? 'selected' : '';
		},
		template: function(options) {
			return options.model.get(options.option);
		},
		templateHelpers: function() {
			return this.options;
		},
		events: {
			'click': function() {
				this.trigger('trigger:onChipSelected', this.options.model);
			}
		}
	});

	View.ChipsAutocompleteView = View.CollectionView.extend({
		className: function() {
			if (!this.options.collection.length) {
				return 'empty';
			}
		},
		childView: View.ChipsAutocompleteItemView,
		childViewOptions: function() {
			return this.options;
		},
		childEvents: {
			'trigger:onChipSelected': function(childView, model) {
				this.trigger('trigger:onChipSelected', model);
			}
		},
		onRender: function() {
			this.options.selectedId = this.options.collection.length ? this.options.collection.first().id : null;
			if (this.options.collection.length) {
				this.$el.removeClass('empty');
			} else {
				this.$el.addClass('empty');
			}
		},
		select: function(i) {
			if (this.options.collection.length) {
				var model = this.options.collection.get(this.options.selectedId);
				if (typeof i == "undefined") {
					this.trigger('trigger:onChipSelected', model);
				} else {
					var index = this.options.collection.models.indexOf(model);
					if (i<0 && index > 0 || i > 0 && index < this.options.collection.length-1) {
						index += i;
					}
					this.options.selectedId = this.options.collection.at(index).id;

					this.$el.find('.selected').removeClass('selected');
					this.$el.find('div[data-model-id="' + this.options.selectedId + '"]').addClass('selected');
				}
			}
		}
	});

	View.ChipsSelectedItemView = View.ItemView.extend({
		template: function(options) {

			var tmplStr = '';
			if(WMAPP.isApp){
				tmplStr += '<div>';
				tmplStr +=     options.model.get(options.option);
				tmplStr += '</div>';
				tmplStr += '<span class="wmapp-chips-remove-icon">';
				tmplStr += '	<img src="/img/remove.svg" />';
				tmplStr += '</span>';
			} else {
				tmplStr += '<div>';
				tmplStr += 	   options.model.get(options.option);
				tmplStr += '</div>';
				tmplStr += '<span class="wmapp-chips-remove-icon">';
				tmplStr += '	<img src="/img/remove.svg" />';
				tmplStr += '</span>';
			}

			return tmplStr;
		},
		templateHelpers: function() {
			return this.options;
		},
		events: {
			'click  span.wmapp-chips-remove-icon': function() {
				this.trigger('trigger:onChipRemoved', this.options.model);
			}
		}
	});

	View.ChipsSelectedView = View.CollectionView.extend({
		childView: View.ChipsSelectedItemView,
		childViewOptions: function() {
			return this.options;
		},
		childEvents: {
			'trigger:onChipRemoved': function(childView, model) {
				this.trigger('trigger:onChipRemoved', model);
			}
		},
	});

	/**
	 * View that is used to contain a single selected view, only used by the chips view when singleItem = true
	 */
	View.ChipsSingleSelectedView = View.LayoutView.extend({
		options: {
			model: null, // The model which contains an attribute
			name: null // The name of the attribute that contains the
		},
		template: function() {
			return '<div class="chips-single-selected-view"></div>';
		},
		regions: {
			selectedItemRegion: '.chips-single-selected-view'
		},
		onRender: function() {
			this.renderSelectedItem();
		},
		modelEvents: function(){
			var events = {};
			events['change:_'+this.options.name] = 'renderSelectedItem';
			return events;
		},
		renderSelectedItem: function() {
			var selectedModel = this.options.model.get("_" + this.options.name);
			if(selectedModel) {
				var selectedItemView = new View.ChipsSelectedItemView({
					model: selectedModel,
					option: this.options.option
				});
				this.listenTo(selectedItemView, 'trigger:onChipRemoved', function(childView, model) {
					this.trigger('trigger:onChipRemoved', model);
				});
				this.selectedItemRegion.show(selectedItemView);
			} else {
				this.selectedItemRegion.empty();
			}
		}
	});

	View.ChipsView = View.LayoutView.extend({
		options: {
			collection: null, // the collection of all items that can be searched/selected
			model: null, // the model to assign the selected items to
			name: 'name', // the attribute name within the model that stores the selected items
			option: 'name', // the attribute name within the collection model to use as as displaying in the autocomplete and chip
			label: null, // the label above the text field
			id: null, // the id for the text field (use a random string by default)
			className: null, // the class name for this
			placeholder: 'Begin typing...', // The placeholder for the text field
			addCustomChipItem: true, // ability to add custom item by hitting the add button
			displayLimit: null, // limit the size of display filtered items
			singleItem: false // only allow the selection of a single item and set it directly onto the model using name (not adding the item to the collection)
		},
		initialize: function() {
			if (!this.options.id) {
				this.options.id = Math.random().toString().replace('0.', '');
			}
			if (!this.options.model.get(this.options.name)) {
				if(!this.options.singleItem) {
					this.options.model.set(this.options.name, [], {silent: true});
				}
			}
			if (!this.options.model.get('_' + this.options.name)) {
				if(!this.options.singleItem) {
					var collection = _.findWhere(this.options.model.constructor.prototype.relations, {
						key: '_' + this.options.name
					});
					if (collection && collection.type) {
						collection = eval('new ' + collection.collectionType + '()');
						this.options.model.set('_' + this.options.name, collection);
					}
				}
			}
		},
		className: function() {
			var className = 'wmapp-chips ';
			if (typeof this.options.className == "function") {
				className += this.options.className(this.options.model, this.options.collection);
			} else if (this.options.className) {
				className += this.options.className;
			}
			return className;
		},
		template: function(options) {
			var tmplStr = '';

			if (options.label) {
				tmplStr += '<label for="' + options.id + '">' + (typeof options.label == "function" ? options.label(options.model) : options.label) + '</label>';
			}
			if (options.addCustomChipItem) {
				tmplStr += '<div class="row collapse">' +
	               '<div class="wmapp-chips-selected"></div>' +
	               '<div class="small-10 columns">' +
	               '<input type="text" name="' + options.name + '" id="' + options.fieldId + '" placeholder="' + options.placeholder + '" autocomplete="false" />' +
	               '</div>' +
	               '<div class="small-2 columns">' +
	               	'<span class="wmapp-chips-add-instance postfix">Add</span>' +
	               	'</div></div>'+
	               	'<div class="wmapp-chips-autocomplete"></div>';
			} else {
				// only able to select from parsed collection
				tmplStr += '<div class="row collapse">' +
	               '<div class="wmapp-chips-selected"></div>' +
	               '<div class="small-12 columns">' +
	               '<input type="text" name="' + options.name + '" id="' + options.fieldId + '" placeholder="' + options.placeholder + '" autocomplete="false" />' +
	               '</div>' +
	               '</div>'+
	               '<div class="wmapp-chips-autocomplete"></div>';
			}
			return tmplStr;
		},
		templateHelpers: function() {
			return this.options;
		},
		regions: {
			autocompleteRegion: '.wmapp-chips-autocomplete',
			selectedRegion: '.wmapp-chips-selected',
		},
		events: {
			'keyup input': 'onKeyUp',
			'keydown input': 'onKeyDown',
			'click .wmapp-chips-add-instance': 'onAddToCollection',
		},
		// modelEvents: {
		//		sync: 'render',
		// },
		collectionEvents: {
			sync: 'render',
		},
		onRender: function() {
			this.filteredCollection = new Backbone.Collection();

			if(this.options.singleItem) {
				this.selectedView = new View.ChipsSingleSelectedView({
					model: this.options.model,
					name: this.options.name,
					option: this.options.option
				});
			} else {
				this.selectedView = new View.ChipsSelectedView({
					collection: this.options.model.get('_' + this.options.name),
					option: this.options.option
				});
			}


			this.listenTo(this.selectedView, 'trigger:onChipRemoved', this.onChipRemoved, this);

			this.selectedRegion.show(this.selectedView);

			this.autocompleteView = new View.ChipsAutocompleteView({
				collection: this.filteredCollection,
				option: this.options.option,
			});

			this.listenTo(this.autocompleteView, 'trigger:onChipSelected', this.onChipSelected, this);

			this.autocompleteRegion.show(this.autocompleteView);
		},
		onKeyDown: function(e) {
			var that = this;
			if (e.keyCode == 38) { // arrow up
				e.preventDefault();
				this.autocompleteView.select(-1);
			} else if (e.keyCode == 40) { // arrow down
				e.preventDefault();
				this.autocompleteView.select(1);
			} else if (e.keyCode == 13) { // enter
				e.preventDefault();
				if (!this.options.collection.length) {
					this.onAddToCollection();
				} else {
					this.autocompleteView.select();
				}
			}
		},
		onKeyUp: function(e) {
			if ([38, 40, 13].indexOf(e.keyCode) >= 0) {
				e.preventDefault();
				return false;
			}
			var that = this;
			var value = $(e.target).val().trim();
			if (value == '') {
				this.filteredCollection.reset();
			} else {
				if (that.options.displayLimit) {
					var numLimit = 0;
				}
				this.filteredCollection.reset(this.options.collection.filter(function(model) {
					var alreadySelected = false;
					if (that.options.model.get('_' + that.options.name)) {
						alreadySelected = that.options.model.get('_' + that.options.name).get(model);
					}
					if (that.options.displayLimit && numLimit < that.options.displayLimit) {
						if (!alreadySelected && model.get(that.options.option).toLowerCase().indexOf(value.toLowerCase()) >= 0) {
							numLimit += 1;
							return true;
						}
					}
					if (!that.options.displayLimit) {
						return !alreadySelected && model.get(that.options.option).toLowerCase().indexOf(value.toLowerCase()) >= 0;
					}
				}));
			}
		},
		onAddToCollection: function() {
			if ($('#' + this.options.id).val() != '') {
				var model = new this.options.collection.model();
				model.set(this.options.option, $('#' + this.options.id).val());
				// trigger the event sotaht could do something before save to database
				this.trigger('chipsview:addToCollection', model);

				var that = this;
				model.save().then(function() {
					that.options.model.get(that.options.name).push(model.id);
					that.options.model.get('_' + that.options.name).add(model);
				});
				// clear the input
				$('#' + this.options.id).val('');
			}
		},
		// For the following two methods, model may be either a Backbone.Collection or Array
		// XXX May also be at other areas, but only needed to fix this for the moment
		// If singleItem is defined then we are only setting a single model not adding to a collection
		onChipSelected: function(model) {
			if(this.options.singleItem) {
				this.options.model.set(this.options.name, model.get("id"));
				this.options.model.set("_" + this.options.name, model);
			}
			else {
				if (this.options.model.get(this.options.name).indexOf(model.id) < 0) {
					if (model instanceof (Backbone.Collection)) {
						this.options.model.get(this.options.name).push(model);
					} else { // Assume it's an array
						this.options.model.get(this.options.name).push(model.get('id'));
					}
				}
				if (this.options.model.get('_' + this.options.name).models.indexOf(model) < 0) {
					this.options.model.get('_' + this.options.name).push(model);
				}
			}

			// Reset views
			this.filteredCollection.reset();
			this.$el.find('input').val('');
		},
		onChipRemoved: function(model) {
			if(this.options.singleItem) {
				this.options.model.unset(this.options.name);
				this.options.model.unset("_" + this.options.name);
			} else {
				if (model instanceof (Backbone.Collection)) {
					this.options.model.get(this.options.name).remove(model);
				} else { // Assume it's an array
					var index = this.options.model.get(this.options.name).indexOf(model.id);
					this.options.model.get(this.options.name).splice(index, 1)
				}
				this.options.model.get('_' + this.options.name).remove(model);
			}
		},
	});

	View.BreadcrumbsItem = View.ItemView.extend({
		template: function(options) {
			var tmplStr = '<li class="' + ((options.options.current == options.options.itemIndex) ? 'current ' : '') + ((options.options.unavailable == options.options.itemIndex) ? 'unavailable' : '') + '"><a href="#" class="wmapp-breadcrumb-link" data-level="' + options.options.itemIndex + '">' + options.model.get('label') + '</a></li>';
			return tmplStr;
		},
		templateHelpers: function () {
			return {
				model: this.model,
				options: this.options
			};
		},
		events: {
			'click .wmapp-breadcrumb-link': 'onClickBreadcrumb',
		},
		onClickBreadcrumb: function(e) {
			e.preventDefault();
			if (this.options.options.vent) {
				this.options.options.vent.trigger('trigger:breadcrumb:' + $(e.target).data('level'));
			} else {
				this.trigger('trigger:breadcrumb:' + $(e.target).data('level'));
			}
		}
	});

	View.Breadcrumbs = View.CollectionView.extend({
		tagName: 'ul',
		className: 'wmapp-breadcrumb breadcrumbs',
		childView: View.BreadcrumbsItem,
		childViewOptions: function(model, index) {
	        return {
	            itemIndex: index,
	            options: this.options
	        }
		}
	});

    /**
	 * View used to display multiple attributes of passed-in model as a list of checkboxes.
	 *
	 * Requires the following:
	 * -	labelName:			name for the wrapping <label>
	 * -	listClass: 			class for the wrapping <label>. Default to empty.
	 * -	itemClass: 			class for each of the <li> of the list. Default to empty.
	 * -	modelAttributes: 	a map of attributes to their <label> display name of the passed-in model.
	 * -	model: 				model from which all of the attributes exists.
	 *
	 * 	@author Rex
     */
    View.CheckboxListMultiAttributes = View.LayoutView.extend({
        tagName: 'div',
        className: 'wmapp-checkbox-list-multi-attributes',
        initialize: function () {
            this.model = this.options.model;
            this.modelAttributes = this.options.modelAttributes;
        },
        template: function (options) {
            var tmplStr = '';

			tmplStr += '<label class="wmapp-checkbox-list-multi-attributes-list' + (options.listClass ? ' ' + options.listClass : '') + '">';
			tmplStr += '<span class="wmapp-input-title">' + options.labelName + '</span>';
            tmplStr += '	<ul>';
            // Iterate over the attribute lists and create list item for each of them.
            $.each(options.modelAttributes, function (attribute, fancyName) {
                tmplStr += '	<li class="wmapp-checkbox-list-multi-attributes-list-item">';
                tmplStr += '		<label class="wmapp-checkbox-list-multi-attributes-list-item-input ' + attribute + '">';
                tmplStr += '			<input type="checkbox" class="wmapp-checkbox-list-multi-attributes-list-item-input ' + attribute + (options.itemClass ? ' ' + options.itemClass : '') + '"' + (!!options.model.get(attribute) === true ? ' checked' : '') + ' attribute="' + attribute + '"/>' + fancyName;
                tmplStr += '		</label>';
                tmplStr += '	</li>';
            });
            tmplStr += '	</ul>';
            tmplStr += '</label>';
            return tmplStr;
        },
        templateHelpers: function () {
            return this.options;
        },
        modelEvents: {
            'change': 'render'
		},
		events: function () {
			var events = {};
			$.each(this.options.modelAttributes, function (attribute) {
				events['click input.wmapp-checkbox-list-multi-attributes-list-item-input.' + attribute] = 'onListItemClicked';
			});
        	return events;
		},
		ui: {
			'listItemInput': 'li.wmapp-checkbox-list-multi-attributes-list-item > label > input'
		},
		onRender: function () {
			if (this.options.readonly !== undefined && this.options.readonly) {
				this.ui.listItemInput.prop('disabled', true);
			}
		},
        /**
		 * Triggered when the user clicks on a list item.
         * @param jsEvent JavaScript event object
         */
		onListItemClicked: function (jsEvent) {
        	jsEvent.stopPropagation();
        	// Retrieve the attribute that this list item is for.
			var attribute = $(jsEvent.target).attr('attribute');
			// Then flip the value.
        	var isChecked = this.model.get(attribute) === 1;
			this.model.set(attribute, isChecked ? 0 : 1);
			this.trigger('click:options:' + attribute, !isChecked);
		}
    });

    /**
	 * Display a collection as a list of checkboxes with the first item being the main switcher. If checked, the rest of the list will be hidden.
	 * 
	 *  Requires the following:
	 * -	nameAttribute:		the attribute of the collection's model to be used to display the checkboxes.
	 * -	labelName:			name for the wrapping <label>
	 * -	listClass: 			class for the wrapping <label>. Default to empty.
	 * -	itemClass: 			class for each of the <li> of the list. Default to empty.
	 * -	collection: 		a map of attributes to their <label> display name of the passed-in model.
	 *
	 * 	@author Rex
     */
    View.CheckboxListWithMainSwitcher = WMAPP.Extension.View.LayoutView.extend({
        tagName: 'div',
        className: 'wmapp-checkbox-list-multi-attributes-with-main-switcher',
        initialize: function () {
			this.collection = this.options.collection;
			this.returnedCollection = this.options.returnedCollection;
			this.nameAttribute = this.options.nameAttribute;
			// All of the items are showing
			this.isShowing = true;
        },
        template: function (options) {
            var tmplStr = '';

			tmplStr += '<label class="wmapp-checkbox-list-multi-attributes-with-main-switcher-list' + (options.listClass ? ' ' + options.listClass : '') + '">';
			tmplStr += '<span class="wmapp-input-title">' + options.labelName + '</span>';
			tmplStr += '	<ul>';
			// Add the main switcher
			tmplStr += '		<li class="wmapp-checkbox-list-multi-attributes-with-main-switcher-switcher-item">';
			tmplStr += '			<label>';
            tmplStr += '				<input type="checkbox" class="wmapp-checkbox-list-multi-attributes-with-main-switcher-switcher-item-input' + (options.mainSwitcherClass ? ' ' + options.mainSwitcherClass : '') + '"/>' + (options.mainSwitcherName ? options.mainSwitcherName : 'Apply to all');
            tmplStr += '			</label>';
			tmplStr += '		</li>';
            // Iterate over the attribute lists and create list item for each of them.
            options.collection.each(function (model) {
                tmplStr += '	<li class="wmapp-checkbox-list-multi-attributes-with-main-switcher-list-item">';
                tmplStr += '		<label>';
                tmplStr += '			<input type="checkbox" class="wmapp-checkbox-list-multi-attributes-with-main-switcher-list-item-input' + (options.itemClass ? ' ' + options.itemClass : '') + '" value="' + model.get('id') + '"/>' + model.get(options.nameAttribute);
                tmplStr += '		</label>';
                tmplStr += '	</li>';
            });
            tmplStr += '	</ul>';
            tmplStr += '</label>';
            return tmplStr;
        },
        templateHelpers: function () {
            return this.options;
        },
        ui: {
			'switcherItemInput': 'input.wmapp-checkbox-list-multi-attributes-with-main-switcher-switcher-item-input',
			'listItem': 'li.wmapp-checkbox-list-multi-attributes-with-main-switcher-list-item',
			'listItemInput': 'input.wmapp-checkbox-list-multi-attributes-with-main-switcher-list-item-input'
        },
        events: {
			'click @ui.switcherItemInput': 'onSwitcherClicked',
            'click @ui.listItemInput': 'onListItemClicked'
		},
		collectionEvents: {
			'change': 'render',
			'sync': 'render'
		},
		/**
         * Triggered when the user clicks on the main switcher.
         * @param jsEvent JavaScript event object
         */
		onSwitcherClicked: function (jsEvent) {
			jsEvent.stopPropagation();
			if (this.isShowing) {
				this.ui.switcherItemInput.attr('checked', true);
				this.ui.listItem.css('display', 'none');
				this.trigger('checked:all');
			} else {
				this.ui.switcherItemInput.attr('checked', false);
				this.ui.listItem.css('display', 'list-item');
				this.trigger('unchecked:all');
			}
			this.isShowing = !this.isShowing;
			this.trigger('toogleChecked:all');
		},
        /**
         * Triggered when the user clicks on a list item.
         * @param jsEvent JavaScript event object
         */
        onListItemClicked: function (jsEvent) {
            jsEvent.stopPropagation();
			// Retrieve the id that this list item is for.
			var listItem = $(jsEvent.target);
			var id = WMAPP.Helper.castId(listItem.val());
			var model = this.collection.findWhere({id: id});
			// Add or remove the model to/from the returned collection.
			if (this.returnedCollection.contains(model)) {
				this.returnedCollection.remove(model);
				listItem.attr('checked', false);
				this.trigger('unchecked:model', model);
			} else {
				this.returnedCollection.add(model);
				listItem.attr('checked', true);
				this.trigger('checked:model', model);
			}
			this.trigger('toggleChecked:model', model);
		},
		/**
		 * Checked if the main switcher is currently selected or not.
		 */
		isMainSwitcherSelected: function () {
			return this.ui.switcherItemInput.attr('checked');
		}
	});

	/**
	 * Given a backbone collection of route models, display a list of links.
	 * 
	 * A route model contains the following:
	 * -	name:				what to be displayed as the link item
	 * -	isSubTitle:			whether the current model needs to be displayed as a subtitle inside a <span>. The span will have the same class as other list items, but is static with no events triggered.
	 * -	baseRoute:			optional. Can be put in to override the passed-in baseRoute when constructing the view.
	 * -	className:			custom class to be put into the link item of this model in addition to the other classes.
	 * -	subRoutes:			one or many subroutes to be appended to the base route. Can be a string or an array of strings.
	 * -	
	 * 
	 * Require the following:
	 * -	collection: 		the collection contains route models to be displayed
	 * 
	 * Optional:
	 * -	listClass: 			class for the list itself. Default to empty string.
	 * -	itemClass: 			class for each list item. Default to empty string.
	 * -	baseRoute:			base route for all links. Default to empty string.
	 * -	activate:			whether to highlight the link item that has the same route as the currently displayed page. Default to true.
	 * 
	 * @author Rex
	 */
	View.LinksList = WMAPP.Extension.View.LayoutView.extend({
		tagName: 'ul',
		className: function () {
			return 'wmapp-links-list' + (this.options.listClass ? ' ' + this.options.listClass : '');
		},
		initialize: function () {
			this.collection = this.options.collection;
		},
		collectionEvents: {
			'change': 'render'
		},
		template: function (data) {
			var options = data.options;
			var constructAllRoute = data.constructAllRoute;

			var tmplStr = '';

			options.collection.each(function (model, index) {

				// Construct the whole path given base route and subroutes.
				var allRoute = constructAllRoute(options, model);

				// use a span or li depending on whether the model is a subtitle or not.
				if (model.has('isSubTitle') && model.get('isSubTitle')) {
					tmplStr += '<span value="' + index + '" class="wmapp-links-list-item' + (options.itemClass ? ' ' + options.itemClass : '') + '">' + model.get('name') + '</span>';
				} else {
					tmplStr += '<li value="' + index + '" class="wmapp-links-list-item' + (options.itemClass ? ' ' + options.itemClass : '') + (model.has('className') ? ' ' + model.get('className') : '') + '">';
					tmplStr += '	<a href="' + allRoute + '">' + model.get('name') + '</a>';
					tmplStr += '</li>';
				}
			});

			return tmplStr;
		},
		templateHelpers: function () {
			return {
				options: this.options,
				constructAllRoute: this.constructAllRoute
			};
		},
		onRender: function () {
			if (this.options.activate === undefined || this.options.activate) {
				this.activateLinkItem();
			}
		},
		/**
		 * Construct the whole path given a model in the passed-in collection.
		 * 
		 * @param model {Object} model containing subRoutes and optionally baseRoute.
		 */
		constructAllRoute: function (options, model) {
			var allRoute = options.precedeSlash === undefined || !options.precedeSlash ? '/' : '';
			allRoute += model.has('baseRoute') ? model.get('baseRoute') : (options.baseRoute ? options.baseRoute : '');
			if (model.has('subRoutes')) {
				var subRoutes = model.get('subRoutes');
				if (_.isArray(subRoutes)) {
					_.each(subRoutes, function (subRoute) {
						allRoute += '/' + subRoute;
					});
				} else {
					allRoute += '/' + subRoutes;
				}
			}
			return allRoute;
		},
		/**
		 * Highlight which page is currently displaying by adding active class to the link item.
		 */
		activateLinkItem: function () {
			this.$el.find('a[href="' + window.location.pathname + '"]').parent().toggleClass('active');
		}
	})
});

/**
 * triggers google map resize
 */
var maps = new Array();

function mapResize() {
	_.each(maps, function (map) {
		google.maps.event.trigger(map.map, 'resize');
	})
};
