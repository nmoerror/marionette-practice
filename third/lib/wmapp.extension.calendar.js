/**
 * Calendar Module
 *
 * Usage:
 *
 * WMAPP.Extension.Calendar.start({
 * 		model: yourModel, // expanded to include the entities calendar
 * 		region: this.tileRegion // the tile region within your application
 * });
 *
 */
WMAPP.module('Extension.Calendar', Backbone.Marionette.Module.extend({
	startWithParent: false,
	getChannel: function () {
		if (this._channel) {
			return this._channel;
		} else {
			this._channel = Backbone.Wreqr.radio.channel('WMAPP.' + this.moduleName + '.channel');
			return this._channel;
		}
	},
	onStart: function (options) {
		WMAPP.Log.getLogger("WMAPP." + this.moduleName).trace("Calendar Module onStart begin");
		WMAPP.Log.getLogger("WMAPP." + this.moduleName).trace("Calendar Module onStart end");
	},
	onStop: function () {
		WMAPP.Log.getLogger("WMAPP." + this.moduleName).trace("Calendar Module onStop begin");
		WMAPP.Log.getLogger("WMAPP." + this.moduleName).trace("Calendar Module onStop end");
	},
}));

WMAPP.module('Extension.Calendar.Router', function (Router) {
	Router.ExtensionCalendarRouter = WMAPP.Extension.Router.AppRouter.extend({
		appRoutes: {
			"": "showCalendar",
			'*notFound': 'pageNotFound'
		}
	});
});

WMAPP.module('Extension.Calendar.Application', Backbone.Marionette.Module.extend({
	startWithParent: true,
	vent: WMAPP.Extension.Calendar.getChannel().vent,
	initialize: function () {
		this.RecurringTypeEnum = new Backbone.Collection([
			{ value: '0', option: 'Daily' },
			{ value: '1', option: 'Weekly' },
			{ value: '2', option: 'Monthly' },
			{ value: '3', option: 'Yearly' }
		]);
	},
	onStart: function (options) {
		// initialize tile region
		/******************************************************************************
		/******* Extension.Calendar Interface Definition*******************
		/	defaultView: the default View Type when the first time the calendar shows
		/	model: expanded to include the entities calendar, could be undefined or null
		/	collection: collection could be passed in without model undefined or null, if the calendar view shows the events of multiple calendars
		/	region: the tile region within your application
		/	eventCollectionKey: the events collection key name in your calendar model,
		/	eventModel: the event model constructor definition,
		******************************************************************************/
		this.config = {
			// defaultView: options.defaultView || 'agendaWeek',
			// allDaySlot: options.allDaySlot || false,
			// allowManagement: options.allowManagement,
			model: options.model,
			collection: options.collection,
			eventOccurrenceCollection: options.eventOccurrenceCollection,
			tileRegion: options.tileRegion,
			eventModel: options.eventModel,
			eventOccurrenceModel: options.eventOccurrenceModel,
			filterModel: options.filterModel,
			bookingModel: options.bookingModel,
			pluginCalendarIdAttr: options.pluginCalendarIdAttr,
			fetchCalendarOnStart: options.fetchCalendarOnStart === undefined ? true : options.fetchCalendarOnStart,
			initialiseCalendarView: options.initialiseCalendarView === undefined ? true : options.initialiseCalendarView,
			pluginApp: options.pluginApp,
			usageMode: options.usageMode,
			usageScenario: options.usageScenario
		};

		WMAPP.Extension.Calendar.View.CustomCalendarView = this.customCalendarView = options.customCalendarView;
		WMAPP.Extension.Calendar.View.CustomEventItemView = options.customEventItemView;
		WMAPP.Extension.Calendar.View.CustomEventDetailView = options.customEventDetailView;
		WMAPP.Extension.Calendar.View.CustomEventEditView = options.customEventEditView;
		WMAPP.Extension.Calendar.View.CustomEventFilterView = options.customEventFilterView;
		WMAPP.Extension.Calendar.View.CustomEventEditDetails = options.customEventEditDetails;
		WMAPP.Extension.Calendar.Router.CustomCalendarRouter = options.customCalendarRouter;

		this.model = this.config.model;
		this.collection = this.config.collection;
		this.eventOccurrenceCollection = this.config.eventOccurrenceCollection;
		this.tileRegion = this.config.tileRegion;
		if (this.config.filterModel) {
			this.curEventsFilter = new this.config.filterModel();
		}		

		this.curCalendarViewType = '';

		if (WMAPP.Extension.Calendar.Router.CustomCalendarRouter)
			this.router = new WMAPP.Extension.Calendar.Router.CustomCalendarRouter({ controller: this });
		else
			this.router = new WMAPP.Extension.Calendar.Router.ExtensionCalendarRouter({ controller: this });

		this.config.calendarRouter = this.router;

		// bind events
		this.listenTo(WMAPP.Extension.Calendar.Application.vent, 'trigger:selectNewEvent', this.onSelectNewEvent);
		this.listenTo(WMAPP.Extension.Calendar.Application.vent, 'trigger:clickExistingEvent', this.onClickExistingEvent);
		this.listenTo(WMAPP.Extension.Calendar.Application.vent, 'trigger:getEvents', this.getEvents);
		this.listenTo(WMAPP.Extension.Calendar.Application.vent, 'trigger:clickCancel', this.onEventEditCancel);
		this.listenTo(WMAPP.Extension.Calendar.Application.vent, 'trigger:clickConfirm', this.onEventEditConfirm);
		this.listenTo(WMAPP.Extension.Calendar.Application.vent, 'trigger:filterChanged', this.onfilterChange);
		this.listenTo(WMAPP.Extension.Calendar.Application.vent, 'trigger:showCalendar', this.showCalendar);
		this.listenTo(WMAPP.Extension.Calendar.Application.vent, 'trigger:onClickEditEvent', this.onEditEvent);
		this.listenTo(WMAPP.Extension.Calendar.Application.vent, 'trigger:onShowEditEvent', this.showEditEvent);
		this.listenTo(WMAPP.Extension.Calendar.Application.vent, 'trigger:deleteEvent', this.onDeleteEvent);
	},

	onStop: function () {
		this.stopListening();
		WMAPP.Extension.Calendar.stop();
	},
	pageNotFound: function(){
		this.router.navigate('');
		if(this.config.pluginApp.pageNotFound)
			this.config.pluginApp.pageNotFound();
		else
			this.showCalendar();
	},
	showCalendar: function (usageScenario) {
		// this.router.navigate('');

		/**
		 * Get any models or collections
		 */
		// this.router.navigate('');
		// get the document collection
		var that = this;

		this.curUsageScenario = usageScenario; // undefined will be passed to plugin App as default scenario

		// fetch the calendar to get the associated events
		if (this.config.fetchCalendarOnStart) {
			this.model.fetch({ reset: true }).then(function () {
				that.renderCalendar();
			});
		} else {
			this.renderCalendar();
		}
	},
	renderCalendar: function () {
		var that = this;
		if (this.config.initialiseCalendarView) {
			var CalendarView = WMAPP.Extension.Calendar.View.CustomCalendarView || WMAPP.Extension.Calendar.View.Calendar;
			this.config = _.extend(this.config, {
				lastStartDate: this.lastStartDate,
				lastEndDate: this.lastEndDate,
				lastViewName: this.lastViewName
			});
			this.calendarView = new CalendarView({
				config: that.config,
				model: that.model,
				collection: that.collection,
				pluginApp: that.config.pluginApp,
				calendarApp: that,
				curEventsFilter: that.curEventsFilter
			});
		} else {
			this.calendarView = this.customCalendarView;
		}

        /**
         * Render Views
         */
		// Show the layout in the tile region
		that.config.tileRegion.show(that.calendarView);

		// reflow foundation
		$(document).foundation('reflow');

		// throw a trigger saying render done
        WMAPP.Extension.Calendar.Application.vent.trigger('trigger:calendarRendered', this.model);
	},
	onfilterChange: function(filter){
		this.curEventsFilter = filter;
		// this.calendarView.fullCalendar('refresh');
		this.calendarView.render();
	},
	getEvents: function (data) {
		var renderEventCallback = data.callback;
		var that = this;
		this.fetchEvents(data).then(function () {
			var fcEventsArray = that.collection.map(function (event) {
				return event.toFullCalendar();
			});
			var fcEventsOccurArray = that.eventOccurrenceCollection.map(function (event) {
				return that.config.eventModel.prototype.toFullCalendar.call(event);
			});
			fcEventsArray = fcEventsArray.concat(fcEventsOccurArray);
			renderEventCallback(fcEventsArray);
			// this rerender is a workaround for fullCalendar bug, based on the research online
			setTimeout(function () {
				that.calendarView.calendar.fullCalendar('rerenderEvents');
			}, 0);
		});
	},
	fetchEvents: function (data) {
		var deferred = $.Deferred();
		var that = this;

		var calendarStart = data.start.format('YYYY-MM-DD');
		var calendarEnd = data.end.format('YYYY-MM-DD');

		var promiseNonRecurring = this.fetchNonRecuEvents(calendarStart, calendarEnd);
		var promiseRecurring = this.fetchRecuEvents(calendarStart, calendarEnd);

		$.when(promiseNonRecurring, promiseRecurring).done(function (noRecuResult, recuResult) {
			if (that.config.pluginApp && that.config.pluginApp.customProcessEventsAfterFetch){
				that.config.pluginApp.customProcessEventsAfterFetch(that.collection, that.eventOccurrenceCollection, that.curEventsFilter).then(function(){
					deferred.resolve();
				});
			}else{
				deferred.resolve();
			}
		});

		return deferred.promise();
	},
	fetchNonRecuEvents: function(calendarStart, calendarEnd){
		var deferred = $.Deferred();
		var that = this;

		// deferred.resolve();
		// return deferred.promise();

		this.collection.queryParams['calendarStart'] = calendarStart;
		this.collection.queryParams['calendarEnd'] = calendarEnd;

		if(this.curEventsFilter && this.config.pluginApp && this.config.pluginApp.customEventFilterQueryParams){
			this.config.pluginApp.customEventFilterQueryParams(this.curEventsFilter, this.collection.queryParams);
		}
		
		that.collection.queryParams['expand'] = "event";
		if(this.config.pluginApp && this.config.pluginApp.customExpandParams){
			this.config.pluginApp.customExpandParams('event', this.collection.queryParams);
		}
		this.collection.fetch({ reset: true }).then(function () {
			deferred.resolve();
		});
		return deferred.promise();
	},
	fetchRecuEvents: function(calendarStart, calendarEnd){
		var deferred = $.Deferred();
		var that = this;

		if (!this.eventOccurrenceCollection) {
			deferred.resolve();
			return deferred.promise();
		}

		this.eventOccurrenceCollection.queryParams['calendarStart'] = calendarStart;
		this.eventOccurrenceCollection.queryParams['calendarEnd'] = calendarEnd;


		if(this.curEventsFilter && this.config.pluginApp && this.config.pluginApp.customEventFilterQueryParams){
			this.config.pluginApp.customEventFilterQueryParams(this.curEventsFilter, this.eventOccurrenceCollection.queryParams);
		}
		
		that.eventOccurrenceCollection.queryParams['expand'] = "event_occurrence";
		if(this.config.pluginApp && this.config.pluginApp.customExpandParams){
			this.config.pluginApp.customExpandParams('occurrence', this.eventOccurrenceCollection.queryParams);
		}
		this.eventOccurrenceCollection.fetch({ reset: true }).then(function () {
			deferred.resolve();
		});
		return deferred.promise();
	},
	// showEvent: function () {
	// 	this.router.navigate('event/' + this.event.get('id'));

	// 	var expandQueryString = 'attenders';

	// 	// set any query params
	// 	this.event.queryParams['expand'] = expandQueryString;

	// 	var that = this;
	// 	// fetch the full model to get the list of associated attenders
	// 	this.event.fetch({ reset: true }).then(function () {
	// 		that.eventView = new WMAPP.Extension.Calendar.View.Event({
	// 			model: that.event,
	// 			collection: that.event.get('_attenders')
	// 		});

	// 		// bind events
	// 		that.listenTo(that.eventView, 'trigger:bookEvent', that.attendEvent);

	// 		/**
	// 		 * Render Views
	// 		 */
	// 		// Show the layout in the tile region
	// 		that.tileRegion.show(that.eventView);

	// 		// reflow foundation
	// 		$(document).foundation('reflow');
	// 	});
	// },
	fetchEditEvent: function (id) {
		var that = this;
		id = +id;
		if (!id)
			this.showEditEvent(new this.config.eventModel());
		else {
			this.event = new this.config.eventModel({ id: id });
			var expandQueryString = "all";
			this.event.queryParams["expand"] = expandQueryString;
			this.event.fetch().then(function () {
				that.showEditEvent(that.event);
			});
		}
	},
	onSelectNewEvent: function (data) {
		var newEvent = new this.config.eventModel();
		var newCoreEvent = new WMAPP.Core.Model.Event();
		newCoreEvent.set("start_date", moment(data.start).startOf('day').format("YYYY-MM-DD"));
		newCoreEvent.set("start_time", data.start.format("HH:mm:ss"));
		newCoreEvent.set("end_date", moment(data.end).startOf('day').format("YYYY-MM-DD"));
		newCoreEvent.set("end_time", data.end.format("HH:mm:ss"));

		newEvent.set('_event', newCoreEvent);

		if (this.config.pluginApp && this.config.pluginApp.customNewEventStucture)
			this.config.pluginApp.customNewEventStucture(newEvent);

		this.showEditEvent(newEvent);
	},
	onClickExistingEvent: function (data) {
		var that = this;
		var existingEvent = data.event;
		var isOccurrence = data.isOccurrence || false;
		var recurringEvent = data.recurringEvent;

		if (existingEvent) {
			if (this.config.usageMode === 'event_booking')
				this.onStartBooking(existingEvent, isOccurrence);
			else {

				if (isOccurrence) {
					var occurrence = new this.config.eventOccurrenceModel({ id: existingEvent.id });
					occurrence.queryParams['expand'] = "event_occurrence";
					if(this.config.pluginApp && this.config.pluginApp.customExpandParams){
						this.config.pluginApp.customExpandParams('occurrence', occurrence.queryParams);
					}
					occurrence.fetch().then(function () {
						if (occurrence.customEventStuctureForDisplay) {
							occurrence.customEventStuctureForDisplay(occurrence);
							that.showViewEvent(occurrence, isOccurrence);
						}
					});
				} else {
					var event = new this.config.eventModel({ id: existingEvent.id });
					event.queryParams['expand'] = "event";
					if(this.config.pluginApp && this.config.pluginApp.customExpandParams){
						this.config.pluginApp.customExpandParams('event', event.queryParams);
					}
					event.fetch().then(function () {
						if (event.customEventStuctureForDisplay) {
							event.customEventStuctureForDisplay(event);
							that.showViewEvent(event, isOccurrence);
						}
					});
				}


				// if (this.config.pluginApp && this.config.pluginApp.customEventStuctureForDisplay)
				// 	this.config.pluginApp.customEventStuctureForDisplay(existingEvent);
				// else if (existingEvent && !isOccurrence && existingEvent.customEventStuctureForDisplay)
				// 	existingEvent.customEventStuctureForDisplay(existingEvent);
				// else if(existingEvent && isOccurrence && recurringEvent.customEventStuctureForDisplay)
				// 	recurringEvent.customEventStuctureForDisplay(recurringEvent);
				
				
			}
		}
	},
	onEditEvent: function (event, isOccurrence) {
		var that = this;
		if (isOccurrence) {
			var occurrence = new this.config.eventOccurrenceModel({ id: event.id });
			occurrence.queryParams['expand'] = "event_occurrence";
			if(this.config.pluginApp && this.config.pluginApp.customExpandParams){
				this.config.pluginApp.customExpandParams('occurrence', occurrence.queryParams);
			}
			occurrence.fetch().then(function () {
				if (occurrence.customEventStuctureForDisplay) {
					occurrence.customEventStuctureForDisplay(occurrence);
					that.showEditEvent(occurrence, true);
				}
			});
		} else {
			var event = new this.config.eventModel({ id: event.id });
			event.queryParams['expand'] = "event";
			if(this.config.pluginApp && this.config.pluginApp.customExpandParams){
				this.config.pluginApp.customExpandParams('event', event.queryParams);
			}
			event.fetch().then(function () {
				if (event.customEventStuctureForDisplay) {
					event.customEventStuctureForDisplay(event);
					that.showEditEvent(event);
				}
			});
		}
	},
	showEditEvent: function (event, isOccurrence) {
		if(!event.get('id'))
			this.router.navigate('events/create');
		else
			this.router.navigate('events/' + (event.id || '0'));
		var EventEditView = WMAPP.Extension.Calendar.View.CustomEventEditView || WMAPP.Extension.Calendar.View.EventEdit;
		this.eventEditView = new EventEditView({
			vent: this.config.pluginApp.vent,
			config: this.config,
			model: event,
			isOccurrence: isOccurrence,
		});

		this.calendarView.showEventEditView(this.eventEditView);
		// reflow foundation
		$(document).foundation('reflow');
	},
	showViewEvent: function (event, isOccurrence) {
		this.router.navigate('events/' + event.get('id'));
		var EventEditView = WMAPP.Extension.Calendar.View.CustomEventEditView || WMAPP.Extension.Calendar.View.EventEdit;
		this.eventEditView = new EventEditView({
			vent: this.config.pluginApp.vent,
			config: this.config,
			model: event,
			isOccurrence: isOccurrence,
			readonly: true
		});

		this.calendarView.showEventEditView(this.eventEditView);
		// reflow foundation
		// $(document).foundation('reflow');
	},
	onEventEditCancel: function () {
		this.router.navigate('');
		this.calendarView.fullCalendar('unselect');
		this.calendarView.hideEventEditView();
	},
	onEventEditConfirm: function (data) {
		var event = data.event;
		var options = data.options || {};
		var that = this;
		if (this.config.pluginApp.beforeEventSave) {
			this.config.pluginApp.beforeEventSave(event);
		}
		var isNewEvent = !event.id;
		this.saveEvent(event, options).then(function (model) {
			var coreEvent = model.get('_event');
			if (coreEvent && coreEvent.isRecurring) {
				that.router.navigate('', { trigger: true });
			}
			else {
				that.router.navigate('');
				that.calendarView.hideEventEditView();
				if(isNewEvent){
					var coreEvent = model.get('_event');
					if(coreEvent){
						coreEvent.set('start_date', moment(coreEvent.get('start_date'), 'DD-MM-YYYY').format('YYYY-MM-DD'));
						coreEvent.set('end_date', moment(coreEvent.get('end_date'), 'DD-MM-YYYY').format('YYYY-MM-DD'));
					}
					that.calendarView.addEventToCalendar(model.toFullCalendar());
				}
				else{
					that.calendarView.fullCalendar('refetchEvents');
				}
			}
		});
	},
	saveEvent: function (event, options) {
		var that = this;
		var deferred = $.Deferred();

		// Todo: Temp Hard Code, needs to be changed
		if (that.model && that.model['id'] && that.config.pluginCalendarIdAttr)
			event.set(that.config.pluginCalendarIdAttr, that.model['id']);
		if (that.model && that.model.get('calendar_id') && event.get('_event'))
			event.get('_event').set("calendar_id", that.model.get('calendar_id'));

		event.save({}, {
			success: function (model, response) {
				// display flash message
				WMAPP.Helper.showMessage('success', 'The event has been saved.');
				WMAPP.Helper.wmAjaxEnd();
				deferred.resolve(model);
			},
			error: function (model, response) {
				if (response.responseJSON) {
					if (response.responseJSON.message) {
						WMAPP.Helper.showMessage('alert', response.responseJSON.message);
					}
				} else if (response.statusText && response.status) {
					WMAPP.Helper.showMessage('alert', "Error (" + response.status + "): " + response.statusText);
				} else {
					WMAPP.Helper.showMessage('alert', "An unknown error has occurred.");
				}
				WMAPP.Helper.wmAjaxEnd();
				deferred.reject();
			},
			remote: WMAPP.isOnline,
		},options);
		return deferred.promise();
	},
	onDeleteEvent: function (event) {
		var that = this;
		
		event.destroy({
			wait: true, // wait for a success response from server before removing from collection
			success: function(model, response, options) {
				
			},
			error: function(model, response, options) {
				if (response.responseJSON) {
					if (response.responseJSON.message) {
						WMAPP.Helper.showMessage('alert', response.responseJSON.message);
					}
				} else if (response.statusText && response.status) {
					WMAPP.Helper.showMessage('alert', "Error ("+response.status+"): " + response.statusText);
				} else {
					WMAPP.Helper.showMessage('alert', "An unknown error has occurred.");
				}
			}
		}).done(function() {
			WMAPP.Helper.showMessage('success', 'The event has been deleted.');

			// redirect to the list if successful
			WMAPP.Extension.Calendar.Application.vent.trigger('trigger:deleteEventSuccess');
			
			// find in the collection
			that.calendarView.fullCalendar('refetchEvents');
			
			that.calendarView.hideEventEditView();
		});
	},	
	attendEvent: function () {
		// save the event, presumably with a new attender

		// clear any errors
		WMAPP.Helper.clearErrors('Calendar');

		// validate the model
		this.event.validate();

		if (this.event.isValid()) {
			var that = this;

			// set some dates if we are offline
			if (WMAPP.isApp && !WMAPP.isOnline) {
				if (this.model.get('created') === null) {
					this.model.set('created', moment().format("YYYY-MM-DD HH:mm:ss"));
				}
				this.model.set('modified', moment().format("YYYY-MM-DD HH:mm:ss"));
			}

			this.event.save({}, {
				success: function (model, response) {
					// display flash message
					WMAPP.Helper.showMessage('success', 'The event has been saved.');

					WMAPP.Helper.wmAjaxEnd();
				},
				error: function (model, response) {
					if (response.responseJSON) {
						if (response.responseJSON.message) {
							WMAPP.Helper.showMessage('alert', response.responseJSON.message);
						}
					} else if (response.statusText && response.status) {
						WMAPP.Helper.showMessage('alert', "Error (" + response.status + "): " + response.statusText);
					} else {
						WMAPP.Helper.showMessage('alert', "An unknown error has occurred.");
					}
					WMAPP.Helper.wmAjaxEnd();
				},
				remote: WMAPP.isOnline,
			});
		} else {
			WMAPP.Helper.wmAjaxEnd();
		}
	},
}));

WMAPP.module('Extension.Calendar.View', function (View) {

	// This view will be the list of events in whatever format is chosen.
	// etc Month, Day, Week
	// It should be configurable by either the frontend user, and the developer at the time of initialization
	View.CalendarEvent = WMAPP.Extension.View.ItemView.extend({
		tagName: 'li',
		template: function (data) {
			var model = data.options.model;
			tmplStr = '';
			tmplStr += '<div class="wmapp-view-event"><h2>Event:</h2><p>' + model.get('name') + '</p><p>Date: ' + model.get('start') + '</p></div>';

			return tmplStr;
		},
		templateHelpers: function () {
			return {
				options: this.options
			};
		},
		regions: {
			calendarField: '.wmapp-calendar-region',
		},
		onShow: function () {
			// do what you gotta do
		},
		events: {
			"click .wmapp-view-event": "onViewEvent",
		},
		onViewEvent: function () {
			// trigger the cancel data_set event in the application
			WMAPP.Extension.Calendar.Application.vent.trigger('trigger:viewEvent', this.model);
		},
	});

	View.Calendar = WMAPP.Extension.View.LayoutView.extend({
		className: 'calendar',
		options: {
			'config': null,
			'model': null,
			'collection': null
		},
		initialize: function () {
			this.config = this.options.config;
			this.model = this.options.model;
			this.collection = this.options.collection;
			if (this.config) {
				this.eventEditOrDisplayRegion = this.eventEditOrDisplayRegion || this.config.tileRegion; //event edit and viewing region is default to occupy the whole tile region
			}
			var EventFilterView = WMAPP.Extension.Calendar.View.CustomEventFilterView || WMAPP.Extension.Calendar.View.EventFilterView;
		},
		collectionEvents: {
			'add': 'addEvent',
			'reset': 'resetEvents',
			'destroy': 'deleteEvent',
			'sync': 'onSyncEvents'
		},
		template: function (data) {
			var model = data.options.model;

			var tmplStr = "";
			tmplStr += '<div class="row">';
			tmplStr += '	<div class="columns large-4 medium-4">';
			tmplStr += '		<h1>' + model.get('name') + '</h1>';
			tmplStr += '	</div>';
			tmplStr += '	<div class="columns large-8 medium-8">';
			tmplStr += '		<a href="#" class="button round blue toggle-edit" style="background-color:#72bfd6;">todo :Toggle Planner/Viewer</a>';
			tmplStr += '	</div>';
			tmplStr += '</div>';
			tmplStr += '<div class="row">';
			tmplStr += '	<div class="columns">';
			tmplStr += '		<div class="wmapp-calendar-view"> </div>';
			tmplStr += '	</div>';
			tmplStr += '</div>';

			return tmplStr;
		},
		templateHelpers: function () {
			return {
				// collection: this.collection,
				options: this.options
			};
		},
		regions: {
		},
		onRender: function () {
			var that = this;

			// Render the full calendar with options.
			this.calendar = this.$el.find('div.wmapp-calendar-view').fullCalendar(that.getCalendarOptions());

			var EventFilterView = WMAPP.Extension.Calendar.View.CustomEventFilterView || WMAPP.Extension.Calendar.View.EventFilterView;
			if (EventFilterView && this.options.curEventsFilter && this.eventFilterRegion) {
				if(!this.options.curEventsFilter.get('start_date'))
				{
					that.updateFilterStartDate();
					// var curView = that.fullCalendar('getView');
					// var startDate = curView.start;
					// var strStartDate = startDate.format('DD-MM-YYYY');
					// this.options.curEventsFilter.set('start_date', strStartDate);
				}
				this.eventFilterView = new EventFilterView({
					model: this.options.curEventsFilter,
				});
				this.eventFilterRegion.show(this.eventFilterView);
			}

			// The following commented code had asynchronous problem, needs to be fixed and enabled if this function is required
			// if (this.options.config && this.options.config.lastViewName && this.options.config.lastStartDate)
			// 	this.fullCalendar('changeView', this.options.config.lastViewName, this.options.config.lastStartDate);
		},
		updateFilterStartDate: function(startDate){
			if(this.options.curEventsFilter && this.calendar)
			{
				var curView = this.fullCalendar('getView');
				var startDate = curView.start;
				var strStartDate = startDate.format('DD-MM-YYYY');
				this.options.curEventsFilter.set('start_date', strStartDate);
			}
		}, 
		showEventEditView: function (eventEditView) {
			this.eventEditOrDisplayRegion.show(eventEditView);
			this.eventEditOrDisplayRegion.$el.show();
		},
		hideEventEditView: function () {
			this.eventEditOrDisplayRegion.$el.hide();
		},
		showBookingConfigView: function(bookingConfig){
			this.config.tileRegion.show(bookingConfig);
			this.config.tileRegion.$el.show();

		},
		/**
		 * Create a calendar and return if necessary.
		 */
		getCalendarOptions: function () {
			var that = this;
			return {
				events: function (start, end, timezone, callback) {
					WMAPP.Extension.Calendar.Application.vent.trigger('trigger:getEvents', {
						start: start,
						end: end,
						timezone: timezone,
						callback: callback
					});
				},
				defaultView: this.options.calendarApp.curCalendarViewType||that.config.defaultView,
				allDaySlot: that.config.allDaySlot,
				defaultDate: that.options.calendarApp.curEventsFilter && that.options.calendarApp.curEventsFilter.get('start_date') ? moment(that.options.calendarApp.curEventsFilter.get('start_date'), 'DD-MM-YYYY') : null,
				editable: true,
				selectable: true,
				selectHelper: true,
				unselectAuto: true,
				handleWindowResize: true,
				height: "parent",
				header: {
					left: "prev,next today",
					center: 'title',
					right: 'month,agendaWeek,agendaDay'
				},
				views: {},
				eventRender: function (fcEvent, element) {
					element.attr('unique-event-id', fcEvent.id);

					var cln = that.calendar;
					switch (cln.data().fullCalendar.view.type) {
						case 'month':
							return that.renderEventOnMonthView(fcEvent, element, that.options.calendarApp.curEventsFilter);
						case 'agendaDay':
							return that.renderEventOnDayView(fcEvent, element, that.options.calendarApp.curEventsFilter);
						case 'agendaWeek':
						case 'basicWeek':
							return that.renderEventOnWeekView(fcEvent, element, that.options.calendarApp.curEventsFilter);
						default:
							return;
					}
				},
				dayRender: function (date, cell) {
					// overwrite in plugin if needed
				},
				dayClick: function (date, jsEvent, view) {
					that.fullCalendar('gotoDate', date);
					// that.fullCalendar('changeView', 'agendaWeek');
				},
				eventClick: function (calEvent, jsEvent, view) {
					if (jsEvent.ctrlKey) {
						alert("Ctrl + Click. Todo: Multiple selections");
					}
					else {
						that.onClickExistingEvent(calEvent, jsEvent, view);
					}
					that.$el.find('.fc-event').not(this).css('border-color', '');
					that.$el.find('[unique-event-id="' + calEvent.id + '"]').css('border-color', 'red');
				},
				viewRender: function(view, element){
					that.options.calendarApp.curCalendarViewType = view.type;
					setTimeout(function(){
						that.updateFilterStartDate();
					},0);
					
				},
				select: function (start, end, jsEvent, view, resource) {
					var cln = that.calendar;
					switch (cln.data().fullCalendar.view.type) {
						case 'month':
							that.onSelectNewEventOnMonthView(start, end, jsEvent, view, resource);
							break;
						case 'agendaWeek':
							that.onSelectNewEventOnWeekView(start, end, jsEvent, view, resource);
							break;
						case 'agendaDay':
							that.onSelectNewEventOnDayView(start, end, jsEvent, view, resource);
							break;
						default:
					}
				}
			};
		},
		onClickExistingEvent: function (calEvent, jsEvent, view) {
			WMAPP.Extension.Calendar.Application.vent.trigger('trigger:clickExistingEvent', calEvent);
		},
		renderEventOnMonthView: function(event, element){
			//default to not change anything to default event view
		},
		renderEventOnWeekView: function(event, element){
			//default to not change anything to default event view
		},
		renderEventOnDayView: function(event, element){
			//default to not change anything to default event view
		},
		onSelectNewEventOnMonthView: function (start, end, jsEvent, view, resource) {
			// default to do nothing
		},
		onSelectNewEventOnWeekView: function (start, end, jsEvent, view, resource) {
			WMAPP.Extension.Calendar.Application.vent.trigger('trigger:selectNewEvent', {
				start: start,
				end: end
			});
		},
		onSelectNewEventOnDayView: function (start, end, jsEvent, view, resource) {
			WMAPP.Extension.Calendar.Application.vent.trigger('trigger:selectNewEvent', {
				start: start,
				end: end
			});
		},
		addEventToCalendar: function (fc_event) {
			this.fullCalendar('renderEvent', fc_event);
		},
		addEvent: function (newEvent) {
			this.fullCalendar('renderEvent', newEvent.toFullCalendar());
		},
		deleteEvent: function (eventModel) {
			this.fullCalendar('removeEvents', eventModel.get('id'));
		},
		resetEvents: function (eventCollection) {
			var events = eventCollection.map(function (event) {
				return event.toFullCalendar();
			});
			this.fullCalendar('renderEvents', events);
		},
        /**
		 * Triggered when attached event collection or any model inside it is synced with the server.
         * @param eventCollectionOrModel {Object} attached event collection or any model inside it
         */
        onSyncEvents: function (eventCollectionOrModel) {
			var that = this;
			if (!that.calendar) {
				this.render();
			}
        	if (eventCollectionOrModel instanceof Backbone.Collection) {
                eventCollectionOrModel.each(function (eventModel) {
                    var event = eventModel.toFullCalendar();
                    // Need to remove the old event and recreate a new one.
                    that.fullCalendar('removeEvents', event.id);
                    that.fullCalendar('renderEvent', event);
                });
			} else {
                var event = eventCollectionOrModel.toFullCalendar();
                // Need to remove the old event and recreate a new one.
                that.fullCalendar('removeEvents', event.id);
                that.fullCalendar('renderEvent', event);
			}
        },
        /**
		 * Delegate fullCalendar commands to FullCalendar.
         * @returns {*} anything returned by fullCalendar commands.
         */
		fullCalendar: function () {
			if (arguments.length === 2) {
                return this.calendar.fullCalendar(arguments[0], arguments[1]);
			} else if (arguments.length === 3) {
                return this.calendar.fullCalendar(arguments[0], arguments[1], arguments[2]);
			}
			else{
				return this.calendar.fullCalendar(arguments[0]);
			}
		}
	});

	View.EventEdit = WMAPP.Extension.View.LayoutView.extend({
		template: function (options) {
			var tmplStr = '';
			tmplStr += '<div class="event-edit-details">';
			return tmplStr;
		},
		templateHelpers: function () {
			return this.options;
		},
		regions: {
			eventRegion: 'div.event-edit-details',
		},
		onRender: function () {
			var that = this;

			var EventEditDetailsView = WMAPP.Extension.Calendar.View.CustomEventEditDetails || WMAPP.Extension.Calendar.View.EventEditDetails;

			this.eventEditDetialsView = new EventEditDetailsView({
				model: this.options.model.get('_event'),
			});
			this.eventRegion.show(this.eventEditDetialsView);
		}
	});

	View.EventEditDetails = WMAPP.Extension.View.LayoutView.extend({
		className: 'wmapp-core-calendar-event_edit-view',
		initialize: function () {
			var that = this;
			// this.options.layoutId = '';
			this.bShowRepeatView = false;
			WMAPP.Extension.View.LayoutView.prototype.initialize.call(this);
		},
		template: function (options) {
			var tmplStr = '';
			tmplStr += '<div>';
			tmplStr += '	<div class="column" style="margin-left:-1vw;">';
			tmplStr += '		<div class="row">';
			tmplStr += '			<div class="columns">';
			tmplStr += '				<a href="#" class="button confirm-add">Confirm</a>';
			tmplStr += '				<a href="#" class="button cancel-add">Cancel</a>';
			tmplStr += '				<a href="#" class="button repeat-event">Repeat</a>';
			tmplStr += '			</div>';
			tmplStr += '		</div>';
			tmplStr += '		<div class="row">';
			tmplStr += '			<div class="columns detail-view medium-6 large-6">';
			tmplStr += '				<div class="row">';
			tmplStr += '					<div class="column">Details</div>';
			tmplStr += '				</div>';
			tmplStr += '				<hr>';
			tmplStr += '				<div class="row">';
			tmplStr += '					<div class="columns">';
			tmplStr += '						<div class="row">';
			tmplStr += '							<div class="columns">';
			tmplStr += '								<div class="event-name"></div>';
			tmplStr += '							</div>';
			tmplStr += '						</div>';
			tmplStr += '						<div class="row">';
			tmplStr += '							<div class="columns large-4 medium-4 small-4">';
			tmplStr += '								<div class="row">';
			tmplStr += '									<div class="columns">';
			tmplStr += '										<div class="start-date"></div>';
			tmplStr += '									</div>';
			tmplStr += '								</div>';
			tmplStr += '								<div class="row">';
			tmplStr += '									<div class="columns">';
			tmplStr += '										<div class="end-date"></div>';
			tmplStr += '									</div>';
			tmplStr += '								</div>';
			tmplStr += '							</div>';
			tmplStr += '							<div class="columns large-4 medium-4 small-4">';
			tmplStr += '								<div class="row">';
			tmplStr += '									<div class="columns">';
			tmplStr += '										<div class="start-time"></div>';
			tmplStr += '									</div>';
			tmplStr += '								</div>';
			tmplStr += '								<div class="row">';
			tmplStr += '									<div class="columns">';
			tmplStr += '										<div class="end-time"></div>';
			tmplStr += '									</div>';
			tmplStr += '								</div>';
			tmplStr += '							</div>';
			tmplStr += '							<div class="columns large-4 medium-4 small-4">';
			tmplStr += '								<div class="all-day"></div>';
			tmplStr += '							</div>';
			tmplStr += '						</div>';
			tmplStr += '						<div class="row">';
			tmplStr += '							<div class="columns">';
			tmplStr += '								<div class="event-description"></div>';
			tmplStr += '							</div>';
			tmplStr += '						</div>';
			tmplStr += '					</div>';
			tmplStr += '				</div>';
			tmplStr += '			</div>';
			tmplStr += '			<div class="columns repeat-view medium-6 large-6">';
			tmplStr += '				<div class="row">';
			tmplStr += '					<div class="columns">';
			tmplStr += '						Repeat';
			tmplStr += '					</div>';
			tmplStr += '				</div>';
			tmplStr += '				<hr>';
			tmplStr += '				<div class="row">';
			tmplStr += '					<div class="columns">';
			tmplStr += '						<div class="recurring-type">';
			tmplStr += '						</div>';
			tmplStr += '					</div>';
			tmplStr += '				</div>';
			tmplStr += '				<div class="row daily-config">';
			tmplStr += '					<div class="columns">';
			tmplStr += '						<div class="row">';
			tmplStr += '							<div class="columns">';
			tmplStr += '							</div>';
			tmplStr += '							<div class="columns">';
			tmplStr += '							</div>';
			tmplStr += '						</div>';
			tmplStr += '						<div class="row">';
			tmplStr += '							<div class="columns">';
			tmplStr += '							</div>';
			tmplStr += '						</div>';
			tmplStr += '					</div>';
			tmplStr += '				</div>';
			tmplStr += '				<div class="row weekly-config">';
			tmplStr += '					<div class="columns">';
			tmplStr += '						<div class="row">';
			tmplStr += '							<div class="columns">';
			tmplStr += '							</div>';
			tmplStr += '						</div>';
			tmplStr += '						<div class="row">';;
			tmplStr += '							<div class="columns">';
			tmplStr += '							</div>';
			tmplStr += '							<div class="columns">';
			tmplStr += '								<div class="row">';
			tmplStr += '									<div class="columns"></div>';
			tmplStr += '								</div>';
			tmplStr += '								<div class="row">';
			tmplStr += '									<div class="columns"></div>';
			tmplStr += '								</div>';
			tmplStr += '							</div>';
			tmplStr += '							<div class="columns">';
			tmplStr += '							</div>';
			tmplStr += '						</div>';
			tmplStr += '					</div>';
			tmplStr += '				</div>';
			tmplStr += '				<div class="row daily-config">';
			tmplStr += '					<div class="columns">';
			tmplStr += '					</div>';
			tmplStr += '				</div>';
			tmplStr += '				<div class="row daily-config">';
			tmplStr += '					<div class="columns">';
			tmplStr += '					</div>';
			tmplStr += '				</div>';
			tmplStr += '			</div>';
			tmplStr += '		</div>';
			tmplStr += '  </div>';
			tmplStr += '</div>';

			return tmplStr;
		},
		regions: {
			eventNameRegion: 'div.event-name',
			startDateRegion: 'div.start-date',
			endDateRegion: 'div.end-date',
			startTimeRegion: 'div.start-time',
			endTimeRegion: 'div.end-time',
			allDayRegion: 'div.all-day',
			evetnDescriptionRegion: 'div.event-description',
			recurringTypeRegion: 'div.recurring-type'
		},
		events: {
			"click .confirm-add": "onClickConfirm",
			"click .cancel-add": "onClickCancel",
			"click .repeat-event": "onClickRepeat",
		},
		onRender: function () {
			var that = this;

			this.eleEventName = new WMAPP.Extension.View.TextField({
				model: this.options.model.get('_event'),
				name: 'name',
				fieldId: 'CoreCalendarEventName',
				label: 'Name',
			});
			this.eventNameRegion.show(this.eleEventName);

			var eleStartDate = new WMAPP.Extension.View.DatePicker({
				model: this.options.model.get('_event'),
				fieldId: 'StartDate',
				fieldClass: 'wmapp-date-entry',
				fieldType: 'text',
				// placeholder: 'Start',
				label: 'Start',
				name: 'start_date',
				tooltip: 'Set event start date',
				readonly: false
			});
			this.startDateRegion.show(eleStartDate);

			var eleStartTime = new WMAPP.Extension.View.TimePicker({
				model: this.options.model.get('_event'),
				fieldId: 'StartTime',
				fieldClass: 'wmapp-time-entry',
				fieldType: 'text',
				// placeholder: 'Time',
				// label: 'Time',
				name: 'start_time',
				tooltip: 'Set event start time',
				readonly: false,
			});
			this.startTimeRegion.show(eleStartTime);

			var eleEndDate = new WMAPP.Extension.View.DatePicker({
				model: this.options.model.get('_event'),
				fieldId: 'EndDate',
				fieldClass: 'wmapp-date-entry',
				fieldType: 'text',
				label: 'End',
				name: 'end_date',
				tooltip: 'Set event end date',
				readonly: false
			});
			this.endDateRegion.show(eleEndDate);

			var eleEndTime = new WMAPP.Extension.View.TimePicker({
				model: this.options.model.get('_event'),
				fieldId: 'EndTime',
				fieldClass: 'wmapp-time-entry',
				fieldType: 'text',
				name: 'end_time',
				tooltip: 'Set event end time',
				readonly: false,
			});
			this.endTimeRegion.show(eleEndTime);

			var eleAllDay = new WMAPP.Extension.View.CheckBox({
				model: this.options.model.get('_event'),
				fieldId: 'AllDay',
				fieldClass: '',
				label: 'All Day',
				name: 'AllDay',
				tooltip: 'Is this an all-day event or not?',
			});
			this.allDayRegion.show(eleAllDay);

			var eleEventDescription = new WMAPP.Extension.View.TextArea({
				model: this.options.model.get('_event'),
				fieldId: 'EventDescription',
				fieldClass: '',
				fieldType: 'text',
				label: 'Event Description',
				name: 'EventDescription'
			});
			this.evetnDescriptionRegion.show(eleEventDescription);

			this.options.model.set('recurringType', 1);
			var eleRecurringType = new WMAPP.Extension.View.ComboBox({
				model: this.options.model.get('_event'),
				fieldId: '',
				label: '',
				name: 'recurringType',
				// tooltip: 'Member title',
				options: WMAPP.Extension.Calendar.Application.RecurringTypeEnum,
				valueField: 'value',
				optionField: 'option',
				// empty: {"value": "", "option": "Select "+(WMAPP.aOrAn ? WMAPP.aOrAn('Title') : 'a Title')},
			});
			this.recurringTypeRegion.show(eleRecurringType);
		},
		templateHelpers: function () {
			// <protected> Additional OctfolioContractorsTileCreateCompanyView templateHelpers code
			// </protected>
			return this.options;
		},
		onClickConfirm: function (e) {
			e.preventDefault();
			e.stopPropagation();
			WMAPP.Extension.Calendar.Application.vent.trigger('trigger:clickConfirm',
				{
					event: this.options.model,
					options: { mode: this.options.mode || 'create'}
				}
			);
		},
		onClickCancel: function (e) {
			e.preventDefault();
			e.stopPropagation();
			WMAPP.Extension.Calendar.Application.vent.trigger('trigger:clickCancel');
		},
		onClickRepeat: function (e) {
			e.preventDefault();
			e.stopPropagation();
			if (this.bShowRepeatView) {
				this.$el.find(".repeat-view").hide();
				this.$el.find(".detail-view").toggleClass('medium-6 large-6');
				this.bShowRepeatView = false;
			}
			else {
				this.$el.find(".repeat-view").show();
				this.$el.find(".detail-view").toggleClass('medium-6 large-6');
				this.bShowRepeatView = true;
			}
		},
		afterRender: function () {
			this.$el.find(".repeat-view").hide();
			this.$el.find(".detail-view").toggleClass('medium-6 large-6');
			this.bShowRepeatView = false;
		}
	});

	View.EventAttender = WMAPP.Extension.View.ItemView.extend({
		tagName: 'li',
		template: function (data) {
			var model = data.options.model;
			return '<div class="wmapp-view-attender"><h2>Attender:</h2><p>' + 'Dummy Attender' + '</p></div>';
		},
		templateHelpers: function () {
			return {
				options: this.options
			};
		},
		regions: {
			calendarField: '.wmapp-calendar-region'
		},
		onShow: function () {
			// do what you gotta do
		},
		events: {
			"click .wmapp-view-attender": "onViewAttender",
		},
		onViewAttender: function () {
			// trigger the cancel data_set event in the application
			// this.triggerDelayed('trigger:viewAttender', this.model);
		},
	});

	View.Event = WMAPP.Extension.View.CompositeView.extend({
		template: function (data) {
			var collection = data.options.collection;

			var tmplStr = '<h2>The event data</h2><button class="add-me">Add me</button>';
			tmplStr += '<ul class="calendar-attender-region"></div>'
			return tmplStr;
		},

		templateHelpers: function () {
			return {
				// collection: this.options.attenders,
				options: this.options
			};
		},
		events: {
			"click .add-me": "onAddToEvent",
		},
		onAddToEvent: function () {
			this.model.get('attenders').push(1); // add to array
			// this.triggerDelayed('trigger:bookEvent', this.model);
		},
		childView: View.EventAttender,
		childViewContainer: "ul.calendar-attender-region",
		className: 'event',
	});

	View.Attender = WMAPP.Extension.View.LayoutView.extend({
		template: function (data) {
			var collection = data.options.collection;

			var tmplStr = '<p>The attender data</p><button class="add-me">Dummy Attendar</button>';
			return tmplStr;
		},
		templateHelpers: function () {
			return {
				options: this.options
			};
		},
		events: {

		}
	});

});
