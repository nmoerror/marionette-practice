/**
 * @namespace WMAPP.Extension.Superwizard
 * @memberof WMAPP.Extension
 * @see WMAPP.module
 */
WMAPP.module('Extension.Superwizard', function(Superwizard) {

	/**
	 * Enum to represent the available progress options
	 */
	var _PROGRESS = {
		Percentage: 'percentage',
		Count: 'count'
	};

	/**
	 * Holds the options and state for the Superwizard
	 *
	 * @private
	 * @member {object} WMAPP.Extension.Superwizard~_wizardOptions
	 **/
	var _wizardOptions = null;

	/**
	 * Given a option, try to evaluate it as a function, model attribute, or primative
	 *
	 * @private
	 * @method  WMAPP.Extension.Superwizard~_evaluateOption
	 * @param   {any}  option        The option to evaluate
	 * @param   {Backbone.Model=}  model         If option is potentially a model attribute, this is the model it should come from
	 * @param   {any=}  defaultValue  The default value that should be returned if the evaluation is falsy
	 **/
	var _evaluateOption = function(option, model, defaultValue) {
		if (typeof option == "function") {
			return option.call(this);
		} else if (model instanceof Backbone.Model) {
			return model.get(option) ? model.get(option) : defaultValue;
		} else {
			return option ? option : defaultValue;
		}
	};

	/**
	 * Takes an infinitly deep collection of slides (one to many self reference) and creates
	 * a double linked list connecting each slide (leaf node) to each other in order
	 *
	 * @private
	 * @method  WMAPP.Extension.Superwizard~_initializeSlides
	 * @param   {WMAPP.Extension.Superwizard.SlideCollection}  slides  The collection of slides
	 * @param   {WMAPP.Extension.Superwizard.Slide=}  parent  The parent slide of the previous collection of slides
	 **/
	var _initializeSlides = function(slides, parent) {
		var leaves = [];

		slides.each(function(slide) {
			if (parent) {
				slide.set('_parent', parent);
			}
			if (slide.get('_children') && slide.get('_children').length) {
				leaves = leaves.concat(_initializeSlides(slide.get('_children'), slide));
			} else {
				slide.set({
					'_isLeaf': true,
					'id': WMAPP.Helper.generateUuid(),
				});
				leaves.push(slide);
			}
		});

		if (!parent) {
			_.each(leaves, function(leaf, index) {
				if (index > 0) {
					leaf.set('_previous', leaves[index - 1]);
				}
				if (index < leaves.length - 1) {
					leaf.set('_next', leaves[index + 1]);
				}
			});
			leaves = new Superwizard.SlideCollection(leaves);

		}
		return leaves;
	};

	/**
	 * View that is used to render the name of the a slide and it's children in the progression view
	 * @class WMAPP.Extension.Superwizard~_WizardProgressSlideView
	 * @memberof WMAPP.Extension.Superwizard
	 * @extends WMAPP.Extension.View.CompositeView
	 * @see {@link @WMAPP.Extension.Superwizard~_WizardProgressSlidesView}
	 **/
	var _WizardProgressSlideView = WMAPP.Extension.View.CompositeView.extend({
		className: function() {
			var className = 'wmapp-superwizard-progress-slide';
			if (this.options.model.get('_children') && this.options.model.get('_children').length) {
				className += ' has-children';
			}
			if (this.options.model.get('_isActive')) {
				className += ' is-active';
			}
			if (this.options.model.get('_isVisited')) {
				className += ' is-visited';
			}
			return className;
		},
		tagName: 'li',
		template: function(options) {
			var tmplStr = '<span>' + options.model.get('name') + '</span>';
			if (options.model.get('_children') && options.model.get('_children').length) {
				tmplStr += '<ul></ul>'
			}
			return tmplStr;
		},
		templateHelpers: function() {
			return this.options;
		},
		events: {
			'click span': 'onClicked',
		},
		childView: _WizardProgressSlideView,
		childViewContainer: '> ul',
		childViewOptions: function(model, index) {
			return {
				_index: index,
				model: model,
				collection: model.get('_children'),
				vent: _wizardOptions.vent,
			};
		},
		onRender: function() {
			this.$el.attr('data-index', this.options._index);
		},
		modelEvents: {
			'change:_isActive': 'onIsActiveChanged',
			'change:_isVisited': 'onIsVisitedChanged',
		},
		/**
		 * Event handler for when `_isActive` is changed on the bound model
		 *
		 * @event WMAPP.Extension.Superwizard~_WizardProgressSlideView#onIsActiveChanged
		 **/
		onIsActiveChanged: function() {
			this.$el.attr('class', this.className());
		},
		/**
		 * Event handler for when `_isVisited` is changed on the bound model
		 * @event WMAPP.Extension.Superwizard~_WizardProgressSlideView#onIsVisitedChanged
		 **/
		onIsVisitedChanged: function() {
			this.$el.attr('class', this.className());
		},
		/**
		 * Event handler for when a slide name is clicked
		 * @event WMAPP.Extension.Superwizard~_WizardProgressSlideView#onClicked
		 * @fires WMAPP.Extension.Superwizard~_WizardProgressSlideView#trigger:slides:goto
		 **/
		onClicked: function(e) {
			e.preventDefault();
			e.stopPropagation();
			if (_wizardOptions.allowJumpBackwards && this.options.model.get('_isVisited')) {
				_wizardOptions.vent.trigger('trigger:slides:goto', this.options.model);
			}
		}
	});


	/**
	 * View that is used to render the names of slides in the progression view
	 * @class WMAPP.Extension.Superwizard~_WizardProgressSlidesView
	 * @extends WMAPP.Extension.View.CollectionView
	 * @see {@link @WMAPP.Extension.Superwizard~_WizardProgressView}
	 **/
	var _WizardProgressSlidesView = WMAPP.Extension.View.CollectionView.extend({
		tagName: 'ul',
		childView: _WizardProgressSlideView,
		childViewOptions: function(model, index) {
			return {
				_index: index,
				model: model,
				collection: model.get('_children'),
				vent: _wizardOptions.vent,
			};
		}
	});

	/**
	 * View that is used to render progress of the wizard (including progress bar / percentage)
	 *
	 * @private
	 * @class WMAPP.Extension.Superwizard~_WizardProgressView
	 * @extends WMAPP.Extension.View.LayoutView
	 * @see {@link @WMAPP.Extension.Superwizard~_WizardView}
	 **/
	var _WizardProgressView = WMAPP.Extension.View.LayoutView.extend({
		template: function(options) {
			var tmplStr = '<div class="wmapp-superwizard-progress-slides"></div>';
			if (options.showProgress) {
				if (options.progressType === _PROGRESS.Percentage) {
					tmplStr += '<div class="wmapp-superwizard-progress-percentage" data-percentage="0"><div>0%</div></div>';
				} else if (options.progressType === _PROGRESS.Count) {
					tmplStr += '<div class="wmapp-superwizard-progress-count" data-count="1">';
					tmplStr += '	<span class="current-slide">1</span>/' + _wizardOptions.leaves.length;
					tmplStr += '</div>';
				}
			}

			return tmplStr;
		},
		templateHelpers: function() {
			return this.options;
		},
		regions: {
			slideRegion: '.wmapp-superwizard-progress-slides',
		},
		onRender: function() {
			this.slideRegion.show(new _WizardProgressSlidesView(_wizardOptions));
		},

		/**
		 * Sets the value of the progress bar. Will try to calculate progression if param is not passed through
		 *
		 * Will display count or percentage based on what is selected.
		 *
		 * @method WMAPP.Extension.Superwizard~_WizardProgressView#setProgress
		 * @param {number=} progress The percentage (0-100) to set the progress bar to if options.showProgress==percentage
		 * 								Otherwise it is just the current slide.
		 */
		setProgress: function(progress) {
			if (this.options.progressType === _PROGRESS.Percentage) {
				var percentage = progress || (_wizardOptions.activeSlideIndex * 100 / _wizardOptions.leaves.length);
				this.$el.find('.wmapp-superwizard-progress-percentage').attr('data-percentage', percentage).find('> div')
					.text(percentage.toFixed(0) + '%').css('width', percentage + '%');
			} else if (this.options.progressType === _PROGRESS.Count) {
				// If the count param is not parsed attempted to get the current progress based on the active slide
				progress = progress || (_wizardOptions.activeSlideIndex + 1);
				this.$el.find('.wmapp-superwizard-progress-count').attr('data-count', progress).find('> span')
					.text(progress).css('width', progress / _wizardOptions.leaves.length + '%');
			}
		},
	});

	/**
	 * View that is used to render the buttons/controlls
	 *
	 * @private
	 * @class WMAPP.Extension.Superwizard~_WizardButtonsView
	 * @extends WMAPP.Extension.View.LayoutView
	 * @see {@link @WMAPP.Extension.Superwizard~_WizardView}
	 **/
	var _WizardButtonsView = WMAPP.Extension.View.LayoutView.extend({
		template: function() {
			var tmplStr = '<button class="previous">Previous</button>' +
				'<button class="next">Next</button>' +
				'<button class="finish">Finish</button>';
			return tmplStr;
		},
		events: {
			'click button.next': function() {
				Superwizard.Wizard.prototype.gotoNextSlide();
			},
			'click button.finish': function() {
				Superwizard.Wizard.prototype.gotoNextSlide();
			},
			'click button.previous': function() {
				Superwizard.Wizard.prototype.gotoPreviousSlide();
			},
		},
		/**
		 * Hides/shows and enables/disables buttons/controls as appropriate based on the current slide
		 *
		 * @method WMAPP.Extension.Superwizard~_WizardButtonsView#updateButtons
		 **/
		updateButtons: function() {
			if (Superwizard.Wizard.prototype.canGoForward()) {
				this.$el.find('button.next').prop('disabled', false).css('display', '');
			} else {
				this.$el.find('button.next').prop('disabled', true).css('display', 'none');
			}

			if (Superwizard.Wizard.prototype.canGoBack()) {
				this.$el.find('button.previous').prop('disabled', false).css('display', '');
			} else {
				this.$el.find('button.previous').prop('disabled', true).css('display', 'none');
			}

			if (Superwizard.Wizard.prototype.isLastSlide()) {
				this.$el.find('button.next').prop('disabled', true).css('display', 'none');
				this.$el.find('button.finish').prop('disabled', false).css('display', '');
			} else {
				this.$el.find('button.next').prop('disabled', false).css('display', '');
				this.$el.find('button.finish').prop('disabled', true).css('display', 'none');
			}

			// Set state on parent to allow easily styling for different button layouts
			if(Superwizard.Wizard.prototype.canGoForward() && !Superwizard.Wizard.prototype.canGoBack()) {
				this.$el.attr('data-slide-type', 'slide-initial');
			}
			else if(Superwizard.Wizard.prototype.canGoForward() && Superwizard.Wizard.prototype.canGoBack()) {
				this.$el.attr('data-slide-type', 'slide-next-previous');
			}
			else if (Superwizard.Wizard.prototype.isLastSlide()) {
				this.$el.attr('data-slide-type', 'slide-last');
			}

		}
	});

	/**
	 * View that is shown when the wizard has been completedf
	 *
	 * @private
	 * @class WMAPP.Extension.Superwizard~_WizardFinishView
	 * @extends WMAPP.Extension.View.LayoutView
	 * @see {@link @WMAPP.Extension.Superwizard~_WizardView}
	 **/
	var _WizardFinishView = WMAPP.Extension.View.LayoutView.extend({
		template: function() {
			var tmplStr = 'Finished';
			return tmplStr;
		},
	});

	/**
	 * View that is shown when a slide has not defined a `view` property (or if it is invalid/falsy)
	 *
	 * @private
	 * @class WMAPP.Extension.Superwizard~_WizardInvalidSlideView
	 * @extends WMAPP.Extension.View.LayoutView
	 * @see {@link WMAPP.Extension.Superwizard~_WizardView}
	 **/
	var _WizardInvalidSlideView = WMAPP.Extension.View.LayoutView.extend({
		template: function() {
			return 'Invalid view defined for this slide.'
		}
	});

	/**
	 * Main controlling view of the wizard. Handles rending of progress, buttons/controlls, and slides
	 *
	 * @private
	 * @class WMAPP.Extension.Superwizard~_WizardView
	 * @extends WMAPP.Extension.View.LayoutView
	 * @listens vent#trigger:slides:goto
	 * @listens vent#trigger:slides:finish
	 * @fires this#trigger:slides:changed(number, WMAPP.Extension.Superwizard.Slide, WMAPP.Extension.Superwizard.Slide)
	 * @fires this#trigger:finished()
	 * @see {@link WMAPP.Extension.Superwizard~_WizardProgressView}
	 * @see {@link WMAPP.Extension.Superwizard~_WizardButtonsView}
	 * @see {@link WMAPP.Extension.Superwizard~_WizardFinishView}
	 * @see {@link WMAPP.Extension.Superwizard~_WizardInvalidSlideView}
	 **/
	var _WizardView = WMAPP.Extension.View.LayoutView.extend({
		initialize: function() {

			this.listenTo(_wizardOptions.vent, 'trigger:slides:goto', this.setActiveSlide.bind(this));
			this.listenTo(_wizardOptions.vent, 'trigger:slides:finish', this.onFinishWizard.bind(this));

			return WMAPP.Extension.View.LayoutView.prototype.initialize.apply(this, arguments);
		},
		className: function() {
			var className = 'wmapp-superwizard';
			if (this.options.className) {
				className += ' ' + _evaluateOption(this.options.className);
			}
			return className;
		},
		id: function() {
			if (this.options.id) {
				return _evaluateOption(this.options.id);
			} else {
				return null;
			}
		},
		template: function(options) {
			var showProgress = _evaluateOption(options.showProgress);
			var progressPosition = _evaluateOption(options.progressPosition, null, 'left');
			var showButtons = _evaluateOption(options.showButtons);
			var buttonPosition = _evaluateOption(options.buttonPosition);


			var tmplStr = '';

			if (options.title) {
				tmplStr += '<div class="wmapp-superwizard-title">' + _evaluateOption(options.title) + '</div>';
			}

			if (showProgress && (progressPosition == "top" || progressPosition == "left")) {

				tmplStr += '<div class="wmapp-superwizard-progress-wrapper" data-position="' + progressPosition + '">';

				if (showButtons && buttonPosition == "above_progress") {
					tmplStr += '	<div class="wmapp-superwizard-buttons" data-position="above_progress"></div>';
				}

				tmplStr += '		<div class="wmapp-superwizard-progress"></div>';

				if (showButtons && buttonPosition == "below_progress") {
					tmplStr += '	<div class="wmapp-superwizard-buttons" data-position="below_progress"></div>';
				}

				tmplStr += '</div>';
			}

			tmplStr += '<div class="wmapp-superwizard-slides-wrapper">';

			if (showButtons && buttonPosition == "above_slides") {
				tmplStr += '	<div class="wmapp-superwizard-buttons" data-position="above_slides"></div>';
			}
			
			tmplStr += '			<div class="wmapp-superwizard-slides"></div>';
			
			if(options.slideAnimation){
				tmplStr += '		<div class="wmapp-superwizard-remove"></div>';
			}
			

			if (showButtons && buttonPosition == "below_slides") {
				tmplStr += '	<div class="wmapp-superwizard-buttons" data-position="below_slides"></div>';
			}

			tmplStr += '</div>';


			if (showProgress && (progressPosition == "bottom" || progressPosition == "right")) {

				tmplStr += '<div class="wmapp-superwizard-progress-wrapper" data-position="' + progressPosition + '">';

				if (showButtons && buttonPosition == "above_progress") {
					tmplStr += '	<div class="wmapp-superwizard-buttons" data-position="above_progress"></div>';
				}

				tmplStr += '		<div class="wmapp-superwizard-progress"></div>';
			
				if (showButtons && buttonPosition == "below_progress") {
					tmplStr += '	<div class="wmapp-superwizard-buttons" data-position="below_progress"></div>';
				}

				tmplStr += '</div>';
			}


			return tmplStr;
		},
		templateHelpers: function() {
			return this.options;
		},
		regions: {
			slideRegion: '.wmapp-superwizard-slides',
			removeSlideRegion: '.wmapp-superwizard-remove',
		},
		onRender: function() {

			if (_wizardOptions.showProgress) {
				if (!this.regionManager.get('progressRegion')) {
					this.regionManager.addRegion('progressRegion', new Marionette.Region({
						el: this.$el.find('.wmapp-superwizard-progress')[0]
					}));
				}
				this.regionManager.get('progressRegion').show(new _WizardProgressView(_wizardOptions));
			}

			if (_wizardOptions.showButtons) {
				if (!this.regionManager.get('buttonRegion')) {
					this.regionManager.addRegion('buttonRegion', new Marionette.Region({
						el: this.$el.find('.wmapp-superwizard-buttons')[0]
					}));
				}
				this.regionManager.get('buttonRegion').show(new _WizardButtonsView(_wizardOptions));
			}

			if (_wizardOptions.enableRouting && _wizardOptions.router) {

				var wizardRouteHandler = _.find(Backbone.history.handlers, (function(handler) {
					return handler.callback == this.setActiveSlide;
				}).bind(this));

				var fragment = Backbone.history.getFragment();
				var match = wizardRouteHandler.route.exec(fragment);

				if (wizardRouteHandler && match) {
					wizardRouteHandler.callback.apply(this, match.splice(1));
				} else {
					this.setActiveSlide(_wizardOptions.startingSlideIndex);
				}
			} else {
				this.setActiveSlide(_wizardOptions.startingSlideIndex);
			}

			this.setPreviousAsVisited();
		},
		/**
		 * Attempts to change to the given slide (does not render slide yet), respecting the promise of the slide's `beforeChange` property
		 *
		 * @method WMAPP.Extension.Superwizard~_WizardView#setActiveSlide
		 * @param {(number | WMAPP.Extension.Superwizard.Slide)} slideIndex Either an index or slide model to activate
		 * @param {number} direction The direction in which the wizard is heading [Forward==+1    Backwards=-1    Unknown=NULL]
		 **/
		setActiveSlide: function(slideIndex, direction) {
			var currentSlide = _wizardOptions.activeSlideIndex == null ? null : _wizardOptions.leaves.at(_wizardOptions.activeSlideIndex);
			var newSlide = _wizardOptions.leaves.at(slideIndex) || _wizardOptions.leaves.get(slideIndex);

			if (newSlide) {
				var onChangePermitted = (function() {
					if (currentSlide) {
						currentSlide.set({
							'_isActive': false,
							'_isVisited': true,
						});
					}
					newSlide.set('_isActive', true);
					if(_wizardOptions.slideAnimation){
						this.renderSlide(newSlide, currentSlide);
					} else {
						this.renderSlide(newSlide, null);
					}
					
					this.trigger('trigger:slides:changed', _wizardOptions.activeSlideIndex, newSlide, currentSlide);
				}).bind(this);

				if (currentSlide && typeof currentSlide.get('beforeChange') == "function") {
					currentSlide.get('beforeChange').call(null, currentSlide == newSlide ? null : currentSlide, newSlide, _wizardOptions, direction).then(onChangePermitted);
				} else {
					onChangePermitted();
				}
			} else {
				console.error('Could not find slide');
				return false;
			}
		},
		/**
		 * Renders a given slide into the main slide view. Triggers the refreshing/updating of progression and buttons/controlls.
		 *
		 * @method WMAPP.Extension.Superwizard~_WizardView#renderSlide
		 * @param {WMAPP.Extension.Superwizard.Slide} slide The slide to render
		 **/
		renderSlide: function(slide, currentSlide) {
			_wizardOptions.activeSlideIndex = _wizardOptions.leaves.indexOf(slide);

			if (_wizardOptions.enableRouting) {
				_wizardOptions.router.navigate(_wizardOptions.routingPrefix + _wizardOptions.activeSlideIndex);
			}

			var view = null;
			var currentSlideView = null;
			var viewConstructor = slide.get('view',"new");

			if (viewConstructor && viewConstructor.prototype instanceof Backbone.View) {
				view = new viewConstructor(_wizardOptions);
			} else if (viewConstructor && typeof viewConstructor == "function") {
				view = viewConstructor.call(null, _wizardOptions, slide);
			} else {
				view = new _WizardInvalidSlideView();
			}
			
			if(currentSlide != null){
				viewConstructor = currentSlide.get('view');
				currentSlideView = viewConstructor.call(null, _wizardOptions, slide);
				currentSlideView.options.slideClassName = "superwizard-remove";
				this.removeSlideRegion.show(currentSlideView);
			}
		
			this.slideRegion.show(view);
						
			this.updateProgress();
			this.updateButtons();
			
		},
		/**
		 * Re-renders/updaters the progression views
		 *
		 * @method WMAPP.Extension.Superwizard~_WizardView#updateProgress
		 **/
		updateProgress: function() {
			if (_wizardOptions.showProgress) {
				this.regionManager.get('progressRegion').currentView.setProgress();
			}
		},
		/**
		 * Re-renders/updaters the button/controlls views
		 *
		 * @method WMAPP.Extension.Superwizard~_WizardView#updateButtons
		 **/
		updateButtons: function() {
			if (_wizardOptions.showButtons) {
				this.regionManager.get('buttonRegion').currentView.updateButtons();
			}
		},
		/**
		 * Event handler for when the wizard is finished. Respects the promise of the last slide's `beforeChange` property.
		 * Will render the "finish" view, removing all other views including progression, buttons/controlls, and slides.
		 *
		 * @event WMAPP.Extension.Superwizard~_WizardView#onFinishWizard
		 **/
		onFinishWizard: function() {
			var currentSlide = _wizardOptions.leaves.at(_wizardOptions.activeSlideIndex);

			var onChangePermitted = (function() {
				if (_wizardOptions.showProgress) {
					if (_wizardOptions.progressType === _PROGRESS.Percentage) {
						this.regionManager.get('progressRegion').currentView.slideRegion.reset();
						this.regionManager.get('progressRegion').currentView.setProgress(100);
					} else if (_wizardOptions.progressType === _PROGRESS.Count) {
						this.regionManager.get('progressRegion').currentView.slideRegion.reset();
						this.regionManager.get('progressRegion').currentView.setProgress(_wizardOptions.leaves.length);
					} else {
						this.regionManager.get('progressRegion').reset();
					}
				}
				if (_wizardOptions.showButtons) {
					this.regionManager.get('buttonRegion').reset();
				}
				var finishView = _wizardOptions.finishView ? _wizardOptions.finishView.call(this) : new _WizardFinishView(_wizardOptions);
				if(_wizardOptions.slideAnimation){
					this.removeSlideRegion.reset();
				}
				this.slideRegion.show(finishView);

				this.trigger('trigger:finished');
			}).bind(this);

			if (typeof currentSlide.get('beforeChange') == "function") {
				currentSlide.get('beforeChange').call(null, currentSlide, null, _wizardOptions).then(onChangePermitted);
			} else {
				onChangePermitted();
			}
		},
		/**
		 * Sets/flags all previous slides (slides before the currently active slide) as "visited"
		 *
		 * @method WMAPP.Extension.Superwizard~_WizardView#setPreviousAsVisited
		 * @returns {void}
		 */
		setPreviousAsVisited: function() {
			for (var i = 0; i < _wizardOptions.activeSlideIndex; i++) {
				_wizardOptions.leaves.at(i).set('_isVisited', true);
			}
		}
	});

	/**
	 * @class WMAPP.Extension.Superwizard.Slide
	 * @memberof WMAPP.Extension.Superwizard
	 * @extends WMAPP.Extension.Model.AbstractModel
	 * @see {@link WMAPP.Extension.Model.AbstractModel}
	 **/
	Superwizard.Slide = WMAPP.Extension.Model.AbstractModel.extend({
		initialize: function() {
			this.listenTo(this, 'change:_isActive', function(model, newValue) {
				if (this.get('_parent')) {
					this.get('_parent').set('_isActive', newValue)
				}
			});

			this.listenTo(this, 'change:_isVisited', function(model, newValue) {
				if (this.get('_parent')) {
					this.get('_parent').set('_isVisited', newValue)
				}
			});

			return WMAPP.Extension.Model.AbstractModel.prototype.initialize.apply(this, arguments);
		},
		defaults: {
			id: null,
			name: null,
			view: null,
			beforeChange: null, // function that must return a promise. Args are: currentSlide, nextSlide, wizardOptions, direction
			_isLeaf: false,
			_isActive: false,
			_isVisited: false,
		},
		relations: [{
			type: Backbone.Many,
			key: '_children',
			relatedModel: 'WMAPP.Extension.Superwizard.Slide',
			collectionType: 'WMAPP.Extension.Superwizard.SlideCollection',
		}]
	});

	/**
	 * @class WMAPP.Extension.Superwizard.SlideCollection
	 * @memberof WMAPP.Extension.Superwizard
	 * @extends WMAPP.Extension.Model.Collection
	 * @see {@link WMAPP.Extension.Model.Collection}
	 **/
	Superwizard.SlideCollection = WMAPP.Extension.Model.Collection.extend({
		model: Superwizard.Slide
	});

	/**
	 * @class WMAPP.Extension.Superwizard.Wizard
	 * @memberof WMAPP.Extension.Superwizard
	 * @extends Backbone.Events
	 * @fires this#trigger:slides:changed
	 * @fires this# trigger: finished
	 * @param {object} options An object of options for configuring the wizard
	 * @see {@link http://backbonejs.org/#Events}
	 **/
	Superwizard.Wizard = function(options) {
		/**
		 * @member WMAPP.Extension.Superwizard.Wizard#options
		 * @type {object}
		 * @property {WMAPP.Extension.Superwizard.SlideCollection} collection The collection of slides to use for the wizard
		 * @property {string} title Adds a title above the wizard
		 * @property {boolean} showProgress Shows the name of all slides in a list to track progress
		 * @property {string} progressPosition Sets the position of list of slides ("left"|"top"|"bottom"|"right")
		 * @property {object} progressType Shows a progress bar of the user's progression through the wizard as the selected progress type ("percentage", "count")
		 * @property {boolean} showButtons Shows "previous", "next", and "finish" controls (as appropriate)
		 * @property {string} buttonPosition Sets the position of the buttons ("above_slides"|"below_slides"|"above_progress"|"below_progress")
		 * @property {integer} startingSlideIndex The index of the slide to start the wizard from
		 * @property {boolean} allowJumpBackwards Enables jumping back to any previously visited slide by clicking on the name in the slide list
		 * @property {boolean} enableRouting Enables URL routing
		 * @property {Backbone.Marionette.AppRouter} The router of your tile application
		 * @property {string} routingPrefix A prefix to apply to the routes of the wizard. Note: You must define also define this as the *first* route in tile router (eg 'wizard/*wizard')
		 * @property {function} The view to show when the wizard has been completed. Must be a function which returns a new instance of a Backbone.View.
		 * @property {boolean} slideAnimation for slide animation
		 */
		_wizardOptions = _.defaults(options, {
			collection: options.slides,
			title: null,
			showProgress: true,
			progressPosition: 'left', // left, top, bottom, right
			progressType: _PROGRESS.Percentage, // percentage, count
			showButtons: true,
			buttonPosition: 'below_slides', // above_slides, below_slides, above_progress, below_progress
			startingSlideIndex: 0,
			allowJumpBackwards: true,
			enableRouting: false,
			router: null,
			routingPrefix: 'wizard/',
			finishView: null,
			slideAnimation: false, //For animation between two slide
			// "private" options
			activeSlideIndex: null,
			leaves: _initializeSlides(options.slides),
			vent: Backbone.Wreqr.radio.channel(WMAPP.Helper.generateUuid()).vent,
		});
		
		
		if(_wizardOptions.className){
			_wizardOptions.className = 'wmapp-superwizard ' + _wizardOptions.className;
		}
		
		var _wizardView = new _WizardView(_wizardOptions);

		if (_wizardOptions.enableRouting && _wizardOptions.router) {
			Backbone.history.route(_wizardOptions.router._routeToRegExp(_wizardOptions.routingPrefix + ':index'), _wizardView.setActiveSlide);
		}

		this.listenTo(_wizardView, 'trigger:finished', this.trigger.bind(this, 'trigger:finished'));
		this.listenTo(_wizardView, 'trigger:slides:changed', this.trigger.bind(this, 'trigger:slides:changed'));


		/**
		 * Renders the wizard into a region
		 *
		 * @method WMAPP.Extension.Superwizard.Wizard#showInRegion
		 * @param {Marionette.Region} region The region to render the wizard in
		 * @throws Error if region is falsy
		 **/
		this.__proto__.showInRegion = function(region) {
			if (region) {
				region.show(_wizardView);
			} else {
				throw new Error('Region is empty');
			}
		};

		/**
		 * Goes to the next slide in the wizard (if possble)
		 *
		 * @method WMAPP.Extension.Superwizard.Wizard#gotoNextSlide
		 * @return {boolean} Whether or not the wizard was able to move to the next slide
		 **/
		this.__proto__.gotoNextSlide = function() {
			if (this.isLastSlide()) {
				_wizardOptions.vent.trigger('trigger:slides:finish');
				return true;
			} else if (this.canGoForward()) {
				_wizardOptions.vent.trigger('trigger:slides:goto', _wizardOptions.activeSlideIndex + 1, 1);
				return true;
			}

			return false
		};

		/**
		 * Goes to the previous slide in the wizard (if possble)
		 *
		 * @method WMAPP.Extension.Superwizard.Wizard#gotoPreviousSlide
		 * @return {boolean} Whether or not the wizard was able to move to the previous slide
		 **/
		this.__proto__.gotoPreviousSlide = function() {
			if (this.canGoBack()) {
				_wizardOptions.vent.trigger('trigger:slides:goto', _wizardOptions.activeSlideIndex - 1, -1);
				return true;
			}

			return false
		};

		/**
		 * Tests if the wizard can go back to the previous slide
		 *
		 * @method WMAPP.Extension.Superwizard.Wizard#canGoBack
		 * @return {boolean}
		 **/
		this.__proto__.canGoBack = function() {
			return _wizardOptions.activeSlideIndex > 0;
		};

		/**
		 * Tests if the wizard can go back to the next slide
		 *
		 * @method WMAPP.Extension.Superwizard.Wizard#canGoForward
		 * @return {boolean}
		 **/
		this.__proto__.canGoForward = function() {
			return _wizardOptions.activeSlideIndex < _wizardOptions.leaves.length - 1;
		};

		/**
		 * Tests if the wizard is currently on the last slide
		 *
		 * @method WMAPP.Extension.Superwizard.Wizard#isLastSlide
		 * @return {boolean}
		 **/
		this.__proto__.isLastSlide = function() {
			return _wizardOptions.activeSlideIndex == _wizardOptions.leaves.length - 1;
		};
	};

	Superwizard.Wizard.prototype = _.extend(Superwizard.Wizard.prototype, Backbone.Events);
});