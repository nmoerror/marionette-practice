'use strict';

WMAPP.module('Extension.Wizard', function(Wizard) {
	Wizard.WizardSubTaskLayoutView = WMAPP.Extension.View.LayoutView.extend({
		tagName: 'li',
		className: function() {
			var className = [];
			if (this.options.completedResident.indexOf(this.options.model.get('id')) >= 0) {
				className.push('visited');
			}
			if (this.options.currentIndex == this.options.model.get('index')) {
				className.push('current');
			}
			return className.join(' ');
		},
		
		template: function(options) {
			var tmplStr =  '<span data-sub-index="'+ options.model.get('index') +'">' + options.model.get('name');
			tmplStr += '</span>';
			return tmplStr;
		},

		templateHelpers: function() {
			return this.options;
		},
	})
	
	Wizard.WizardSubTasksCollectionView = WMAPP.Extension.View.CollectionView.extend({
		tagName: 'ul',
		childView: Wizard.WizardSubTaskLayoutView,
		childViewOptions: function() {
			return {
				collection: this.options.collection,
				currentIndex: this.options.currentIndex,
				completedResident: this.options.completedResident,
			}
		},
		collectionEvents: {
			'sync': 'render',
			'reset': 'render',
		},
		onBeforeRender: function() {
			this.options.collection.each(function(model, i) {
				model.set('index', i);
			});
		},
		
	})
	
	Wizard.WizardRightLayoutView = WMAPP.Extension.View.LayoutView.extend({
		tagName: 'li',
		
		className: function() {
			var className = [];
			if (this.options.completed.get(this.options.current) && this.options.completed.get(this.options.current).get('completedAreasOfCare').indexOf(this.options.model.get('id')) >= 0) {
				className.push('visited');
			}
			if (this.options.completed.get(this.options.current) &&  (!this.options.completed.currentId || this.options.model.get('id') == this.options.completed.currentId)) {
				className.push('current');
				if (!this.options.completed.currentId){
					this.options.completed.currentId = this.options.model.get('id');
				}
			}
			return className.join(' ');
		},
		template: function(options) {
			var tmplStr =  '<span data-index="' + options.model.get('id') + '">' + options.model.get('name');
			tmplStr += '</span>';
			return tmplStr;
		},
		templateHelpers: function() {
			return this.options;
		},
		
	})
	
	Wizard.WizardRightCollectionView = WMAPP.Extension.View.CollectionView.extend({
		childView: Wizard.WizardRightLayoutView,
		childViewOptions: function() {
			return {
				collection: this.options.collection,
				completed: this.options.completed,
				current: this.options.completed.currentResident,
				currentId : this.options.completed.currentId
			}
		},
		tagName: 'ul',
		collectionEvents: {
			sync: 'render'
		},
		onRender: function() {
			var that = this;
			if (this.options.collection.length) {
				this.$el.css('display', 'block');
				setTimeout(function() {
					that.positionElement.call(that);
				}, 100);
			} else {
				this.$el.css('display', 'none');
			}
		},
		positionElement: function() {
			this.$el.parent().find('.wmapp-core-wizard-title').remove();
			this.$el.before('<div class="wmapp-core-wizard-title">' + this.options.collection.title + '</div>');
			var progress = this.$el.parents('.wmapp-core-wizard').find('.wmapp-core-wizard-progress');
			var offset = progress.offset();
			if (offset) {
				this.$el.parent().css({
					'top': offset.top + 'px',
					'max-height': (window.innerHeight - offset.top - 20)  + 'px',
				});
			}
		}
	})

	Wizard.WizardTaskLayoutView = WMAPP.Extension.View.LayoutView.extend({
		tagName: 'li',
		className: function() {
			var className = [];
			if (this.options.visitedSlides.indexOf(this.options.slides[this.options.model.get('index')]) >= 0) {
				className.push('visited');
			}
			if (this.options.currentSlideModel == this.options.model) {
				className.push('current');
			}
			return className.join(' ');
		},
		template: function(options) {
			var tmplStr =  '<span data-index="' + options.model.get('index') + '">' + options.model.get('name');
			 if (options.hasSubset && options.hasSubset().collection.length > 0) {
			 	tmplStr += '<div class="subset"></div>';
			}
			tmplStr += '</span>';
			return tmplStr;
		},
		templateHelpers: function() {
			return this.options;
		},
		regions: {
			subsetRegion: 'div.subset'
		},
		onRender: function() {
			if (this.options.model.get('hasSubset') && this.options.currentSlideModel && this.options.model && this.options.currentSlideModel.cid == this.options.model.cid) {
				var hasSubset = this.options.model.get('hasSubset');
				if (hasSubset().collection.length > 0) {
					this.subsetRegion.show(new Wizard.WizardSubTasksCollectionView({
						collection: hasSubset().collection,
						currentIndex: hasSubset().index,
						completedResident: hasSubset().completed, 
					}))	
				} 
			}
		}
	});

	Wizard.WizardTaskCollectionView = WMAPP.Extension.View.CollectionView.extend({
		childView: Wizard.WizardTaskLayoutView,
		childViewOptions: function() {
			return {
				currentSlide: this.options.currentSlide,
				currentSlideModel: this.options.collection.at(this.options.currentSlide),
				visitedSlides: this.options.visitedSlides,
				slides: this.options.slides,
				collection: this.options.collection,
			}
		},
		tagName: 'ul',
		onBeforeRender: function() {
			this.options.collection.each(function(model, i) {
				model.set('index', i);
			});
		},
		onRender: function() {
			if (this.options.showFinish) {
				this.$el.append('<li class="'+(this.options.currentSlide == this.options.collection.length ? 'current' : '')+'">' +
								'	<span>Finish</span>' +
								'</li>');
			}
		}
	});

	Wizard.WizardProgressionView = WMAPP.Extension.View.ItemView.extend({
		template: function(data) {
			var tmplStr = 	'<div class="wmapp-core-wizard-progression-value">' + Math.ceil(data.progress) + '%</div>' +
							'<div class="wmapp-core-wizard-progression-bar">' +
							'	<div style="width:' + data.progress + '%"></div>' +
							'</div>';
			return tmplStr;
		},
		templateHelpers: function() {
			return {
				progress: this.options.progress
			}
		}
	});

	Wizard.WizardView = WMAPP.Extension.View.LayoutView.extend({
		options: {
			title: '',
			finishView: null,
			finishText: 'Finish',
			slides: [],
			visitedSlides: [],
			currentSlide: 0,
			currentSubsetIndex: 0,
			totalSlides: 0,
			onFirstPreviousClicked: null,
			vAlignButton: 'top',
			wizardClassName:'',
			progressClassName:'',
			contentClassName:'',
			initializeRouter: false,
			routerController: null,
			routes: {},
			
		},
		initialize: function() {
			WMAPP.Extension.View.LayoutView.prototype.initialize.apply(this, arguments);

			var that = this;

			this.listenTo(this, 'trigger:next', function(bypassCallback) {
				that.onNextClicked.call(that, null, bypassCallback);
			});

			this.listenTo(this, 'trigger:previous', function(bypassCallback) {
				that.onPreviousClicked.call(that, null, bypassCallback);
			});

			for (var i=0; i<this.options.currentSlide; i++) {
				this.options.visitedSlides.push(this.options.slides[i]);
			}
			
			if (this.options.initializeRouter) {
				var Router = WMAPP.Extension.Router.AppRouter.extend({
					appRoutes: _.clone(this.options.routes),
					routes: {},
				});
				this.router = new Router({controller: this.options.routerController});
			}
		},
		className: function(){
			return 'wmapp-core-wizard '+this.options.wizardClassName;
		},
		template: function(options) {
			var tmplStr = 	'<div class="wmapp-core-wizard-progress '+ options.progressClassName +'">' +
							'	<div class="wmapp-core-wizard-title">' + options.title + '</div>' +
							'	<div>' +
							'		<div class="wmapp-core-wizard-slide-list"></div>' +
							'		<div class="wmapp-core-wizard-progression"></div>' +
							'		<div class="wmapp-core-wizard-worm"></div>' +
							'	</div>' +
							'</div>' +
							'<div class="wmapp-core-wizard-content '+ options.contentClassName +'">';
			if (options.vAlignButton == 'top') {
				tmplStr += 	'	<div class="wmapp-core-wizard-commands">' +
							'		<button class="button wmapp-previous-button wmapp-button-previous" ';
				if (options.currentSlide === 0) {
					if (options.onFirstPreviousClicked) {
						tmplStr += '>Exit';
					} else {
						tmplStr += 'disabled="disabled">Previous';
					}
				} else {
					tmplStr += 	'>Previous';
				}
				tmplStr += 	'		</button>' +
							'		<button class="button wmapp-next-button wmapp-button-next">Next</button>' +
							'	</div>';
			}
			tmplStr += 		'	<div class="wmapp-core-wizard-slide"></div>';
			if (options.vAlignButton == 'bottom') {
				tmplStr += 	'	<div class="wmapp-core-wizard-commands ">' +
							'		<button class="button wmapp-previous-button wmapp-button-previous" ';
				if (options.currentSlide === 0) {
					if (options.onFirstPreviousClicked) {
						tmplStr += '>Exit';
					} else {
						tmplStr += 'disabled="disabled">Previous';
					}
				} else {
					tmplStr += 	'>Previous';
				}
				tmplStr += 	'		</button>' +
							'		<button class="button wmapp-next-button wmapp-button-next">Next</button>' +
							'	</div>';
			}	
			tmplStr += 		'</div>';
		    tmplStr += 		'<div class="wmapp-core-wizard-secondry-slide-list"></div>';
			return tmplStr;
		},
		templateHelpers: function() {
			return this.options
		},
		regions: {
			slideListRegion: '.wmapp-core-wizard-slide-list',
			secondarySlideListRegion: '.wmapp-core-wizard-secondry-slide-list',
			progressionRegion: '.wmapp-core-wizard-progression',
			slideRegion: '.wmapp-core-wizard-slide',
		},
		events: {
			'click .wmapp-previous-button': 'onPreviousClicked',
			'click .wmapp-next-button': 'onNextClicked',
			'click .wmapp-core-wizard-slide-list > ul > li': 'onSlideClicked',
			'click .wmapp-core-wizard-slide-list .subset > ul > li > span': 'onSubsetSlideClicked',
			'click .wmapp-core-wizard-secondry-slide-list > ul > li > span': 'onWizardRightClicked',
		},
		onRender: function() {
			this.renderSlides();
			this.updateProgress();
			var offset = this.$el.offset();
			if (offset) {
				this.$el.find('.wmapp-core-wizard-progress').css('max-height', (window.innerHeight - offset.top - 20)  + 'px');
			}
		},
		renderSlides: function() {
			var that = this;

			// render the slide list
			this.slideListRegion.show(new Wizard.WizardTaskCollectionView({
				collection: new WMAPP.Extension.Model.Collection(this.options.slides),
				currentSlide: this.options.currentSlide,
				currentSubsetIndex: this.options.currentSubsetIndex,
				showFinish: this.options.finishView ? true : false,
				visitedSlides: this.options.visitedSlides,
				slides: this.options.slides,
			}));
			
			if (this.options.secondarySlideListCollection) {
				this.secondarySlideListRegion.show(new Wizard.WizardRightCollectionView({
					collection: this.options.secondarySlideListCollection,
					completed: this.options.secondarySlideListCollectionCompleted,
				}));				
			}

			// destroy the existing slide area if it exists
			if (this.slideRegion.currentView) {
				WMAPP.destroyContentArea(this.$el[0]);
				this.slideRegion.currentView.destroy();
				this.slideRegion.reset();
			}

			var layout = null;

			// render the finish view if it exists and we're on the last page
			if (this.options.currentSlide == this.options.slides.length && this.options.finishView) {
				if (typeof this.options.finishView.constructor != "undefined") {
					layout = new this.options.finishView();
				} else {
					layout = this.options.finishView();
				}
			} else {
				// render the actual slide
				var slide = this.options.slides[this.options.currentSlide];

				if (slide.hasRightWizard) {
					slide.hasRightWizard();
				}
				
				if (slide.currentSubsetIndex) {
					slide.currentSubsetIndex = this.options.currentSubsetIndex;
				}
				
				// assemble the content of the slide
				if (slide.tiles && slide.tiles.length > 0) {

					var tileAppHtml = function(tile, i) {
						var tileId = [WMAPP.Helper.tableName(slide.name), tile, moment().unix(), i].join('-');
						return 	'<div class="wmapp-tile" data-tile-type="' + tile + '" data-page-tile-id="'+tileId+'">' +
								'	<div id="wmappTileInner'+tileId+'"></div>' +
								'</div>';
					}

					if (slide.layout) {
						if (typeof slide.layout.constructor != "undefined") {
							layout = new slide.layout();
						} else {
							layout = slide.layout();
						}

						that.listenTo(layout, 'render', function() {
							_.each(slide.tiles, function(tile, i) {
								var appLayout = WMAPP.Extension.View.LayoutView.extend({
									template: function() {
										return tileAppHtml(tile, i);
									},
									onRender: function() {
										// wait for the html to render, then start the tile
										if (slide.interval) {
											clearInterval(slide.interval);
										}
										slide.interval = setInterval(function() {
											clearInterval(slide.interval);
											delete slide.interval;
											WMAPP.renderContentArea(that.$el[0]);
											if (typeof slide.onRender == "function") {
												setTimeout(function() {
													slide.onRender.call(that);
												}, 50);
											}
										}, 50);
									}
								});
								layout[tile].show(new appLayout());
							});
						});
					} else {
						var tmplStr = '';
						_.each(slide.tiles, function(tile, i) {
							tmplStr += tileAppHtml(tile, i);
						});

						layout = WMAPP.Extension.View.LayoutView.extend({
							template: function() {
								return tmplStr;
							},
							onRender: function() {
								// wait for the html to render, then start the tiles
								if (slide.interval) {
									clearInterval(slide.interval);
								}
								slide.interval = setInterval(function() {
									clearInterval(slide.interval);
									delete slide.interval;
									WMAPP.renderContentArea(that.$el[0]);
									if (typeof slide.onRender == "function") {
										setTimeout(function() {
											slide.onRender.call(that);
										}, 50);
									}
								}, 50);
							}
						});
						layout = new layout();
					}
				} else if (slide.layout) {

					if (typeof slide.layout.constructor != "undefined") {
						layout = new slide.layout();
					} else {
						layout = slide.layout();
					}

					if (typeof slide.onRender == "function") {
						this.listenTo(layout, 'render', function() {
							slide.onRender.call(that);
						});
						
						
					}
				}
			}

			if (layout) {
				this.slideRegion.show(layout);
				if (slide) {
					this.slideRegion.currentView.$el.attr('data-slide-name', slide.name);
					this.trigger('trigger:wizard:slideRendered', this.options.currentSlide);
				}
			} else {
				console.error('No "tiles" or "layout" provided for slide "'+slide.name+'" of the Wizard tile.')
			}
		},
		updateProgress: function(overridePercentage) {
			var that = this;
			var percentage = overridePercentage ? overridePercentage : (this.options.currentSlide*100/this.options.slides.length);
			if (this.progressionRegion.currentView) {
				this.progressionRegion.$el.find('.wmapp-core-wizard-progression-bar > div').css('width', percentage + '%');
				var el = this.progressionRegion.$el.find('.wmapp-core-wizard-progression-value');
				var currentPercentage = parseInt(el.html().replace('%', ''));
				var duration = 500; // should be same as in core.css or other overridden css
				//var stepDelay = duration / Math.abs(percentage-currentPercentage);
				var stepSize =  Math.abs(percentage-currentPercentage)*10/duration;
				var direction = percentage > currentPercentage ? 1 : -1;
				if (this.progressTimer) {
					clearInterval(this.progressTimer);
				}
				this.progressTimer = setInterval(function() {
					if ((currentPercentage < percentage && direction === 1) || currentPercentage > percentage && direction === -1) {
						currentPercentage += stepSize*direction;
						el.html(Math.ceil(currentPercentage) + '%');
					} else {
						clearInterval(that.progressTimer);
						// set it to the actual percentage incase calculations messed up
						el.html(Math.ceil(percentage) + '%');
					}
				}, 10);
			} else {
				this.progressionRegion.show(new Wizard.WizardProgressionView({
					progress: percentage
				}));
			}


		},
		updateButtons: function() {
			var buttons = this.$el.find('.wmapp-core-wizard-commands').find('button');
			buttons.prop('disabled', false);
			var currentSlide = this.options.slides[this.options.currentSlide];
			if (!this.options.finishView  || (this.options.finishView && this.options.currentSlide != this.options.slides.length)) {
				buttons.filter('.wmapp-next-button').html('Next');
			}
			if (this.options.onFirstPreviousClicked) {
				buttons.filter('.wmapp-previous-button').html(this.options.currentSlide == 0 ? 'Exit' : 'Previous');
			}
			if ((this.options.currentSlide == 0 && !this.options.onFirstPreviousClicked) || currentSlide.disablePrevious) {
				buttons.filter('.wmapp-previous-button').prop('disabled', true);
			} else if (this.options.currentSlide == this.options.slides.length-1) {
				buttons.filter('.wmapp-next-button').html(this.options.finishText);
			}
		},
		onSlideClicked: function(e) {
			var target = $(e.currentTarget);
			var selectedSlide = parseInt(target.children('span').attr('data-index'));
			if (!isNaN(selectedSlide) && selectedSlide != this.options.currentSlide && selectedSlide <= target.parent().find('.visited').length) {
				if (this.options.slides[this.options.currentSlide] && typeof this.options.slides[this.options.currentSlide].beforeDestroy == 'function') {
					if (!this.options.slides[this.options.currentSlide].beforeDestroy()) {
						return false;
					}
				}
				this.options.currentSlide = selectedSlide;
				this.updateProgress();
				this.renderSlides();
				this.updateButtons();
			}
		},
		onSubsetSlideClicked: function(e) {
			e.preventDefault();
			e.stopPropagation();
			
			// Get subset slide index
			var currentSlide = this.options.slides[this.options.currentSlide];
			
			if (currentSlide.onSubsetSlideClicked) {
				currentSlide.onSubsetSlideClicked(parseInt($(e.target).attr('data-sub-index')), this);
			}
			
			var childView = _.find(this.slideListRegion.currentView.children._views, function(v) {
				return typeof v.subsetRegion != 'undefined' && v.subsetRegion.currentView && v.subsetRegion.currentView._isRendered && v.subsetRegion.currentView._isShown;
			});
			if (childView) {
				childView.subsetRegion.currentView.options.currentIndex = parseInt($(e.target).attr('data-sub-index'));
				childView.subsetRegion.currentView.render();
			}
			// Rerender slides
			this.updateProgress();
		},
		onWizardRightClicked: function(e) {
			var currentSlide = this.options.slides[this.options.currentSlide];
			
			if (currentSlide.onWizardRightClicked) {
				currentSlide.onWizardRightClicked(parseInt($(e.target).attr('data-index')), this);
			}
			
		},
		onPreviousClicked: function(e, bypassCallback) {
			var slide = this.options.slides[this.options.currentSlide];
			if (slide && !bypassCallback && typeof slide.beforePrevious == "function" && !slide.beforePrevious(this)) {
				return false;
			}

			if (this.options.currentSlide > 0) {
				if (this.options.slides[this.options.currentSlide] && typeof this.options.slides[this.options.currentSlide].beforeDestroy == 'function') {
					if (!this.options.slides[this.options.currentSlide].beforeDestroy()) {
						return false;
					}
				}
				this.options.currentSlide--;
				this.updateProgress();
				this.renderSlides();
				this.updateButtons();
			} else if (this.options.onFirstPreviousClicked) {
				this.options.onFirstPreviousClicked(this);
			}
		},
		onNextClicked: function(e, bypassCallback) {
			var slide = this.options.slides[this.options.currentSlide];
			if (slide && !bypassCallback && typeof slide.beforeNext == "function" && !slide.beforeNext(this)) {
				return false;
			}

			if (this.options.currentSlide < this.options.slides.length-1 || (this.options.finishView && this.options.currentSlide < this.options.slides.length)) {
				this.options.visitedSlides.push(slide);
				if (this.options.slides[this.options.currentSlide] && typeof this.options.slides[this.options.currentSlide].beforeDestroy == 'function') {
					if (!this.options.slides[this.options.currentSlide].beforeDestroy()) {
						return false;
					}
				}
				this.options.currentSlide++;
				this.updateProgress();
				this.renderSlides();
				this.updateButtons();
			} else if ((!this.options.finishView && this.options.currentSlide == this.options.slides.length-1) || (this.options.finishView && this.options.currentSlide == this.options.slides.length)) {
				this.trigger('trigger:wizard:finished');
			}
		},
	});
	
	Wizard.newWizardView = function(options) {
		var wizardView = new Wizard.WizardView(options);
		
		if (options && typeof options.onFinished == "function") {
			wizardView.on('trigger:wizard:finished', options.onFinished);
		}
		
		return wizardView;
	};
});
