/**
 * Calendar Module
 *
 * Usage:
 *
 * WMAPP.Extension.Calendar.Admin.start({
 * 		model: yourModel, // expanded to include the entities calendar
 * 		region: this.tileRegion // the tile region within your application
 * });
 *
 */
WMAPP.module('Extension.Calendar.Admin', Backbone.Marionette.Module.extend({
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

WMAPP.module('Extension.Calendar.Admin.Router', function (Router) {
    Router.ExtensionCalendarRouter = WMAPP.Extension.Router.AppRouter.extend({
        appRoutes: {
            "event/create": "showCreateEvent",
        },
    });
});

WMAPP.module('Extension.Calendar.Admin.Application', Backbone.Marionette.Module.extend({
    startWithParent: true,
    vent: WMAPP.Extension.Calendar.Admin.getChannel().vent,
    onStart: function (options) {
    	// bind some events
    	this.listenTo(this.vent, 'trigger:onSaveEvent', this.onSaveEvent);

        // options for enum submissionStatusEnum
        this.RecurringTypeEnum = new Backbone.Collection([
            { value: '0', option: 'Daily' },
            { value: '1', option: 'Weekly' },
            { value: '2', option: 'Monthly' },
            { value: '3', option: 'Yearly' },
        ]);
    },

    onStop: function () {
        this.stopListening();
        // <protected> TODO: add controller stop logic here
        WMAPP.Extension.Calendar.Admin.stop();
        // </protected>
    },
    
    showCreateCalendar: function (options) {
        this.calendar = options.model;
        this.region = options.region;    	

        /**
         * Get any models or collections
         */
        this.createCalendarView = new WMAPP.Extension.Calendar.Admin.View.CreateCalendar({
            model: this.calendar,
        });

        /**
         * Render Views
         */
        // Show the layout in the tile region
        this.region.show(this.createCalendarView);

        // reflow foundation
        $(document).foundation('reflow');
    },    

    showCreateEvent: function (options) {
        this.event = options.model;
        this.region = options.region;
        this.calendarCollection = new WMAPP.Core.Model.CalendarCollection();        	
        	
   		// fetch Calendar Collection
   		this.calendarCollection.fetch({reset: true});	        	

        /**
         * Get any models or collections
         */
        this.createEventView = new WMAPP.Extension.Calendar.Admin.View.CreateEvent({
            model: this.event,
            calendarCollection: this.calendarCollection
        });

        /**
         * Render Views
         */
        // Show the layout in the tile region
        this.region.show(this.createEventView);

        // reflow foundation
        $(document).foundation('reflow');
    },
}));

WMAPP.module('Extension.Calendar.Admin.View', function (View) {
    View.CreateCalendar = WMAPP.Extension.View.LayoutView.extend({
		initialize: function () {
			this.options.layoutId = 'CalendarExtensionAdminCalendar';
			if (this.model) {
				Backbone.Validation.bind(this);
			}
		},    	
        template: function (data) {
            // var collection = data.collection;
            var model = data.options.model;

            var tmplStr = "";
			tmplStr += '	<div class="wmapp-form">';
			tmplStr += '		<fieldset>';
			tmplStr += '			<legend>Calendar</legend>';
			tmplStr += '			<div class="wmapp-calendar-extension-admin-calendar-name"></div>';
			tmplStr += '			<div class="wmapp-calendar-extension-admin-calendar-public"></div>';
			tmplStr += '		</fieldset>';
			tmplStr += '	</div>';
			return tmplStr;
        },
        templateHelpers: function () {
            return {
                options: this.options
            };
        },
		regions: {
			nameField: '.wmapp-calendar-extension-admin-calendar-name',
			publicField: '.wmapp-calendar-extension-admin-calendar-public',
		},
		class: 'wmapp-calendar-extension-admin-calendar',	
        onRender: function () {
            var that = this;
            
			// Name TextField for event create
			this.calendarName = new WMAPP.Extension.View.TextField({
				model: this.options.model,
				fieldId: 'CalendarExtensionAdminCalendarName',
				fieldClass: '',
				fieldType: 'text',
				label: 'Name',
				name: 'name',
				tooltip: 'The Name for your calendar',
			});
			
			// Public CheckBox for calendar create
			this.calendarPublic = new WMAPP.Extension.View.CheckBox({
				model: this.options.model,
				fieldId: 'CalendarExtensionAdminCalendarNamePublic',
				fieldClass: '',
				label: 'Public',
				name: 'public',
				tooltip: 'The Public for your calendar',
			});			

			this.nameField.show(this.calendarName);
			this.publicField.show(this.calendarPublic);
        },
    });	
	
	
    View.CreateEvent = WMAPP.Extension.View.LayoutView.extend({
		initialize: function () {
			this.options.layoutId = 'CalendarExtensionAdminEvent';
			if (this.model) {
				Backbone.Validation.bind(this);
			}
		},    	
        template: function (data) {
            // var collection = data.collection;
            var model = data.options.model;

            var tmplStr = "";
			tmplStr += '	<div class="wmapp-form">';
			tmplStr += '		<fieldset>';
			tmplStr += '			<legend>Event</legend>';
			tmplStr += '			<div class="wmapp-calendar-extension-admin-event-name"></div>';
			tmplStr += '			<div class="wmapp-calendar-extension-admin-event-description"></div>';
			tmplStr += '			<div class="wmapp-calendar-extension-admin-event-start_time"></div>';
			tmplStr += '			<div class="wmapp-calendar-extension-admin-event-end_time"></div>';
			tmplStr += '			<div class="wmapp-calendar-extension-admin-event-start_date"></div>';
			tmplStr += '			<div class="wmapp-calendar-extension-admin-event-end_date"></div>';
			tmplStr += '			<div class="wmapp-calendar-extension-admin-event-is_full_day_event"></div>';
			tmplStr += '			<div class="wmapp-calendar-extension-admin-event-calendar"></div>';
			tmplStr += '			<div class="wmapp-calendar-extension-admin-event-is_recurring"></div>'; 
			tmplStr += '			<div class="wmapp-calendar-extension-admin-event-recurring_pattern_id"></div>';
			tmplStr += '		</fieldset>';
			tmplStr += '	</div>';
			return tmplStr;
        },
        templateHelpers: function () {
            return {
                // collection: this.collection,
                options: this.options
            };
        },
		regions: {
			nameField: '.wmapp-calendar-extension-admin-event-name',
			descriptionField: '.wmapp-calendar-extension-admin-event-description',
			startTimeField: '.wmapp-calendar-extension-admin-event-start_time',
			endTimeField: '.wmapp-calendar-extension-admin-event-end_time',
			startDateField: '.wmapp-calendar-extension-admin-event-start_date',
			endDateField: '.wmapp-calendar-extension-admin-event-end_date',
			isRecurringField: '.wmapp-calendar-extension-admin-event-is_recurring',
			isFullDayEventField: '.wmapp-calendar-extension-admin-event-is_full_day_event',
			calendarField: '.wmapp-calendar-extension-admin-event-calendar',
			recurringPatternIdField: '.wmapp-calendar-extension-admin-event-recurring_pattern_id',
		},
		class: 'wmapp-calendar-extension-admin-event',	
        onRender: function () {
            var that = this;

			// Name TextField for event create
			this.eventName = new WMAPP.Extension.View.TextField({
				model: this.options.model,
				fieldId: 'CalendarExtensionAdminEventName',
				fieldClass: '',
				fieldType: 'text',
				label: 'Name',
				name: 'name',
				tooltip: 'The Name for your event',
			});


			// Description TextField for event create
			this.eventDescription = new WMAPP.Extension.View.TextField({
				model: this.options.model,
				fieldId: 'CalendarExtensionAdminEventDescription',
				fieldClass: '',
				fieldType: 'text',
				label: 'Description',
				name: 'description',
				tooltip: 'The Description for your event',
			});


			// StartTime TextField for event create
			this.eventStartTime = new WMAPP.Extension.View.DateTimePicker({
				model: this.options.model,
				fieldId: 'CalendarExtensionAdminEventStartTime',
				dateFormat: 'hh:ii',
				startView: 'day',
				minView: 'hour',
				maxView: 'hour',
				fieldClass: 'wmapp-time-entry',
				fieldType: 'text',
				label: 'Start Time',
				name: 'start_time',
				tooltip: 'The Start Time for your event',
			});


			// EndTime TextField for event create
			this.eventEndTime = new WMAPP.Extension.View.DateTimePicker({
				model: this.options.model,
				fieldId: 'CalendarExtensionAdminEventEndTime',
				dateFormat: 'hh:ii',
				startView: 'day',
				minView: 'hour',
				maxView: 'hour',				
				fieldClass: 'wmapp-time-entry',
				fieldType: 'text',
				label: 'End Time',
				name: 'end_time',
				tooltip: 'The End Time for your event',
			});


			// StartDate DatePicker for event create
			this.eventStartDate = new WMAPP.Extension.View.DatePicker({
				model: this.options.model,
				fieldId: 'CalendarExtensionAdminEventStartDate',
				fieldClass: 'wmapp-date-entry',
				fieldType: 'text',
				label: 'Start Date',
				name: 'start_date',
				tooltip: 'The Start Date for your event',
			});


			// EndDate DatePicker for event create
			this.eventEndDate = new WMAPP.Extension.View.DatePicker({
				model: this.options.model,
				fieldId: 'CalendarExtensionAdminEventEndDate',
				fieldClass: 'wmapp-date-entry',
				fieldType: 'text',
				label: 'End Date',
				name: 'end_date',
				tooltip: 'The End Date for your event',
			});

			// IsFullDayEvent CheckBox for event create
			this.eventIsFullDayEvent = new WMAPP.Extension.View.CheckBox({
				model: this.options.model,
				fieldId: 'CalendarExtensionAdminEventIsFullDayEvent',
				fieldClass: '',
				label: 'Is Full Day Event',
				name: 'is_full_day_event',
				tooltip: 'The Is Full Day Event for your event',
			});
			
			// Ferrycombobox for ferry_trip create
			this.eventCalendar = new WMAPP.Extension.View.SelectBox({
				model: this.options.model,
				fieldId: 'CalendarExtensionAdminEventCalendar',
				label: 'Calendars',
				name: 'calendars',
				tooltip: 'The Calendar/s for your event',
				options: this.options.calendarCollection,
				optionField: 'name',
				empty: {"value": "", "option": "Select "+(WMAPP.Helper.aOrAn ? WMAPP.Helper.aOrAn('Calendar') : 'a Calendar')},
			});			

			// IsRecurring CheckBox for event create
			this.eventIsRecurring = new WMAPP.Extension.View.CheckBox({
				model: this.options.model,
				fieldId: 'CalendarExtensionAdminEventIsRecurring',
				fieldClass: '',
				label: 'Is Recurring',
				name: 'is_recurring',
				tooltip: 'The Is Recurring for your event',
			});	
			
			// --- Layout for RecurringPattern table
			this.eventRecurringPattern = new WMAPP.Extension.Calendar.Admin.View.RecurringPatternTableLayout({
				label: 'Recurring Pattern',
			});
			// remove the reverse validation
			delete this.options.model.get('_recurring_pattern_id').validation._event_id;
			delete this.options.model.get('_recurring_pattern_id').validation.event_id;
			this.eventRecurringPatternCreate = new WMAPP.Extension.Calendar.Admin.View.RecurringPatternTableCreate({
				layoutId: 'CalendarExtensionAdminEventRecurringPatternId',
				parentLayoutId: 'CalendarExtensionAdminEvent',
				singleReference: true,
				fieldId: 'RecurringPatternId',
				model:	this.options.model.get('_recurring_pattern_id'),
				parent: this.options.model,
				parentField: 'recurring_pattern_id',
			});			
			
			
			this.nameField.show(this.eventName);
			this.descriptionField.show(this.eventDescription);
			this.startTimeField.show(this.eventStartTime);
			this.endTimeField.show(this.eventEndTime);
			this.startDateField.show(this.eventStartDate);
			this.endDateField.show(this.eventEndDate);
			this.isRecurringField.show(this.eventIsRecurring);
			this.isFullDayEventField.show(this.eventIsFullDayEvent);
			this.calendarField.show(this.eventCalendar);
			
			this.recurringPatternIdField.show(this.eventRecurringPattern);
			this.eventRecurringPattern.createField.show(this.eventRecurringPatternCreate);			
        },
    });
    
	View.RecurringPatternTableItem = WMAPP.Extension.View.LayoutView.extend({
		tagName: 'div',
		template: function(data) {
			var options = data.options;
			var model = data.model;

			var _tmplStr = '<ul class="small-block-grid-1" id="' + options.parentLayoutId + options.fieldId + '">';
			_tmplStr += '<li><div class="wmapp-core-recurring_pattern-table-recurring_type"></div></li>';
			_tmplStr += '<li><div class="wmapp-core-recurring_pattern-table-interval"></div></li>';
			_tmplStr += '<li><div class="wmapp-core-recurring_pattern-table-count"></div></li>';
			_tmplStr += '<li><div class="wmapp-core-recurring_pattern-table-until"></div></li>';

			if (options.create || !options.readonly) {
				_tmplStr += '<li class="text-center">' +
				'<a href="#" class="wmapp-button wmapp-button-icon wmapp-button-delete-step wmapp-delete-step-button button small" data-id="' + model.get(model.primaryKey) + '" title="Are you sure you want to delete this Recurring Pattern?"></a>';
				_tmplStr += '</li>';
			}
			_tmplStr +=	 '</ul>';
			return _tmplStr;
		},
		templateHelpers: function(){
			return {
				model: this.model,
				options: this.options,
			}
		},
		regions: {
			recurringTypeField: '.wmapp-core-recurring_pattern-table-recurring_type',
			intervalField: '.wmapp-core-recurring_pattern-table-interval',
			countField: '.wmapp-core-recurring_pattern-table-count',
			untilField: '.wmapp-core-recurring_pattern-table-until',
		},
		initialize: function(options) {
			this.options = _.extend(this.options, options.options);
			this.options.layoutId = 'RecurringPattern';
			if (this.model) {
				Backbone.Validation.bind(this);
			}
		},
		onRender: function() {
			var that = this;
			// options for enum recurringTypeEnum
			var recurringTypeEnum = new Backbone.Collection([
				{value: 'daily', option: 'Daily'},
				{value: 'weekly', option: 'Weekly'},
				{value: 'monthly', option: 'Monthly'},
				{value: 'yearly', option: 'Yearly'},
			]);


			// options for true false collection
			var trueFalseCollection = new Backbone.Collection([
				{value: '1', option: 'True'},
				{value: '0', option: 'False'},
			]);


			// Combobox for RecurringType
			var coreRecurringPatternRecurringType = new WMAPP.Extension.View.ComboBox({
				model: this.model,
				fieldId: 'RecurringPatternRecurringType' + this.model.cid,
				fieldClass: 'wmapp-core-recurring_pattern-recurring_type',
				label: 'Recurring Type',
				name: 'recurring_type',
				tooltip: 'The Recurring Type for your recurring pattern',
				options: recurringTypeEnum,
				valueField: 'value',
				optionField: 'option',
				empty: {"value": "", "option": "Select "+(WMAPP.Helper.aOrAn ? WMAPP.Helper.aOrAn('recurring type') : 'a recurring type')},
				readonly: this.options.readonly,
			});


			// Interval TextField for recurring_pattern create
			var coreRecurringPatternInterval = new WMAPP.Extension.View.TextField({
				model: this.model,
				fieldId: 'RecurringPatternInterval' + this.model.cid,
				fieldClass: '',
				fieldType: 'number',
				placeholder: 'Interval',
				label: 'Interval',
				name: 'interval',
				tooltip: 'The Interval for your recurring pattern',
				readonly: this.options.readonly,
			});


			// Count TextField for recurring_pattern create
			var coreRecurringPatternCount = new WMAPP.Extension.View.TextField({
				model: this.model,
				fieldId: 'RecurringPatternCount' + this.model.cid,
				fieldClass: '',
				fieldType: 'number',
				placeholder: 'Count',
				label: 'Count',
				name: 'count',
				tooltip: 'The Count for your recurring pattern',
				readonly: this.options.readonly,
			});


			// Until DatePicker for recurring_pattern create
			var coreRecurringPatternUntil = new WMAPP.Extension.View.DatePicker({
				model: this.model,
				fieldId: 'RecurringPatternUntil' + this.model.cid,
				fieldClass: 'wmapp-date-entry',
				fieldType: 'text',
				placeholder: 'Until',
				label: 'Until',
				name: 'until',
				tooltip: 'The Until for your recurring pattern',
				readonly: this.options.readonly,
				endDate: '2019-01-01'
			});

			// the count of fields plus the commands
			var cols = 5;

			this.recurringTypeField.show(coreRecurringPatternRecurringType);
			this.intervalField.show(coreRecurringPatternInterval);
			this.countField.show(coreRecurringPatternCount);
			this.untilField.show(coreRecurringPatternUntil);

			// reflow foundation
			$(document).foundation('reflow');

			// add the medium grid class to the block grid ul
			if (!this.options.create && this.options.readonly) {
				--cols;
			}
			this.$el.find('ul.small-block-grid-1').addClass('medium-block-grid-' + cols);
		},
		triggers: {
			"click .wmapp-delete-step-button": 'trigger:coreRecurringPatternDeleteTableRow',
		}
	});

	View.RecurringPatternTable = WMAPP.Extension.View.CollectionView.extend({
		tagName: "div",
		childView: View.RecurringPatternTableItem,
		initialize: function() {
			if (this.model) {
				Backbone.Validation.bind(this);
			}
			this.on('childview:trigger:coreRecurringPatternDeleteTableRow', this.removeRow);
		},
		removeRow: function(childView, args){
			this.collection.remove(args.model);
		},
		options: {
			showSystemFields: true,
			readonly: false
		},
		childViewOptions: function() {
			return {
				options: this.options,
			}
		},
	});

	View.RecurringPatternTableCreate = WMAPP.Extension.View.LayoutView.extend({
		initialize: function() {
			this.options.layoutId = 'RecurringPattern';
			if (this.model) {
				Backbone.Validation.bind(this);
			}
		},
		template: function(data) {
			var options = data.options;
			var model = data.model;

			var _tmplStr = '<ul class="small-block-grid-1" id="' + options.parentLayoutId + options.fieldId + '">';
			_tmplStr += '<li><div class="wmapp-core-recurring_pattern-table-recurring_type"></div></li>';
			_tmplStr += '<li><div class="wmapp-core-recurring_pattern-table-interval"></div></li>';
			_tmplStr += '<li><div class="wmapp-core-recurring_pattern-table-count"></div></li>';
			_tmplStr += '<li><div class="wmapp-core-recurring_pattern-table-until"></div></li>';
			_tmplStr += '<li class="text-center">' +
			'<a href="#" class="wmapp-button wmapp-button-icon wmapp-button-add-step wmapp-add-step-button button small' + ((model.get(model.primaryKey)) ? ' hide' : '') + '"></a>' +
			'<a href="#" class="wmapp-button wmapp-button-icon wmapp-button-clear-step wmapp-clear-step-button button small' + ((model.get(model.primaryKey)) ? ' hide' : '') + '"></a>';
			if (options.singleReference) {
				_tmplStr += '<a href="#" class="wmapp-button wmapp-button-icon wmapp-button-delete-step wmapp-delete-step-button button small' + ((model.get(model.primaryKey)) ? '' : ' hide') + '" title="Are you sure you want to remove this Recurring Pattern?"></a>';
			}
			_tmplStr += '</li>' +
			'</ul>';
			return _tmplStr;
		},
		regions: {
			recurringTypeField: '.wmapp-core-recurring_pattern-table-recurring_type',
			intervalField: '.wmapp-core-recurring_pattern-table-interval',
			countField: '.wmapp-core-recurring_pattern-table-count',
			untilField: '.wmapp-core-recurring_pattern-table-until',
		},
		events: {
			"click .wmapp-add-step-button": "onAdd",
			"click .wmapp-clear-step-button": "onClear",
			"click .wmapp-delete-step-button": "onRemove",
		},
		options: {
			singleReference: false,
			showSystemFields: true,
			readonly: false,
		},
		onAdd: function(e) {
			e.preventDefault();

			// bind the datepicker value to the model
			this.model.set({'until': this.$el.find('#RecurringPatternUntil').val()}, {silent: true});

			if (typeof this.model.get(this.model.primaryKey) != "undefined") {
				// clear the errors
				WMAPP.Helper.clearErrors('RecurringPattern');

				// add the model to the collection, and rerender?
				this.model.validate();

				if (this.model.isValid()) {
					if (this.collection !== undefined) {
						this.collection.add(this.model.clone());
						this.model.clear().set(this.model.defaults);
						//delete this.model.attributes[this.model.primaryKey];
					}

					// hide the create option as we only need one reference
					if (this.options.singleReference) {
						// Set the id to 0 to prevent validation errors
						this.options.parent.set(this.options.parentField, 0);
						this.$el.find('.wmapp-button-add-step').addClass('hide');
						this.$el.find('.wmapp-button-clear-step').addClass('hide');
						this.$el.find('.wmapp-button-delete-step').removeClass('hide');

						// toggle readonly/disabled
						this.$el.find('input[type="text"]').prop('readonly', true);
						this.$el.find('input[type="checkbox"]').prop('disabled', true);
					}

					return true;
				} else {
					return false;
				}
			}

			return true;
		},
		onClear: function(e) {
			e.preventDefault();

			// reset the model back to the defaults
			this.model.clear().set(this.model.defaults);
			//delete this.model.attributes[this.model.primaryKey];

			if (this.options.singleReference) {
				// toggle readonly/disabled
				this.$el.find('input[type="text"]').prop('readonly', false);
				this.$el.find('input[type="checkbox"]').prop('disabled', false);
			}
		},
		onRemove: function(e) {
			e.preventDefault();

			this.model.clear().set(this.model.defaults);
			this.$el.find('.wmapp-add-step-button').removeClass('hide');
			this.$el.find('.wmapp-clear-step-button').removeClass('hide');
			this.$el.find('.wmapp-delete-step-button').addClass('hide');

			if (this.options.singleReference) {
				// Unset the id
				this.options.parent.unset(this.options.parentField);
				// toggle readonly/disabled
				this.$el.find('input[type="text"]').prop('readonly', false);
				this.$el.find('input[type="checkbox"]').prop('disabled', false);
			}
		},
		onRender: function() {
			// options for enum recurringTypeEnum
			var recurringTypeEnum = new Backbone.Collection([
				{value: 'daily', option: 'Daily'},
				{value: 'weekly', option: 'Weekly'},
				{value: 'monthly', option: 'Monthly'},
				{value: 'yearly', option: 'Yearly'},
			]);


			// options for true false collection
			var trueFalseCollection = new Backbone.Collection([
				{value: '1', option: 'True'},
				{value: '0', option: 'False'},
			]);

			// Combobox for RecurringType
			var coreRecurringPatternRecurringType = new WMAPP.Extension.View.ComboBox({
				model: this.model,
				fieldId: 'RecurringPatternRecurringType',
				fieldClass: 'wmapp-core-recurring_pattern-recurring_type',
				label: 'Recurring Type',
				name: 'recurring_type',
				tooltip: 'The Recurring Type for your recurring pattern',
				options: recurringTypeEnum,
				valueField: 'value',
				optionField: 'option',
				empty: {"value": "", "option": "Select "+(WMAPP.Helper.aOrAn ? WMAPP.Helper.aOrAn('recurring type') : 'a recurring type')}
			});

			// Interval TextField for recurring_pattern create
			var coreRecurringPatternInterval = new WMAPP.Extension.View.TextField({
				model: this.model,
				fieldId: 'RecurringPatternInterval',
				fieldClass: '',
				fieldType: 'number',
				placeholder: 'Interval',
				label: 'Interval',
				name: 'interval',
				tooltip: 'The Interval for your recurring pattern',
			});

			// Count TextField for recurring_pattern create
			var coreRecurringPatternCount = new WMAPP.Extension.View.TextField({
				model: this.model,
				fieldId: 'RecurringPatternCount',
				fieldClass: '',
				fieldType: 'number',
				placeholder: 'Count',
				label: 'Count',
				name: 'count',
				tooltip: 'The Count for your recurring pattern',
			});

			// Until DatePicker for recurring_pattern create
			var coreRecurringPatternUntil = new WMAPP.Extension.View.DatePicker({
				model: this.model,
				fieldId: 'RecurringPatternUntil',
				fieldClass: 'wmapp-date-entry',
				fieldType: 'text',
				placeholder: 'Until',
				label: 'Until',
				name: 'until',
				tooltip: 'The Until for your recurring pattern',
				startDate: moment().format('YYYY-MM-DD'),
				endDate: moment().add(2, 'y').format('YYYY-MM-DD')
			});

			// the count of fields plus the commands
			var cols = 5;

			this.recurringTypeField.show(coreRecurringPatternRecurringType);
			this.intervalField.show(coreRecurringPatternInterval);
			this.countField.show(coreRecurringPatternCount);
			this.untilField.show(coreRecurringPatternUntil);

			// reflow foundation
			$(document).foundation('reflow');

			// add the medium grid class to the block grid ul
			this.$el.find('ul.small-block-grid-1').addClass('medium-block-grid-' + cols);

			if (this.model.id) {
				this.$el.find('.wmapp-add-step-button').addClass('hide');
				this.$el.find('.wmapp-clear-step-button').addClass('hide');
				this.$el.find('.wmapp-delete-step-button').removeClass('hide');

				if (this.options.singleReference) {
					// toggle readonly/disabled
					this.$el.find('input[type="text"]').prop('readonly', true);
					this.$el.find('input[type="checkbox"]').prop('disabled', true);
				}
			}
		},
		templateHelpers:function(){
			return {
				model: this.model,
				options: this.options,
			}
		},
		modelEvents: {
		},
	});

	View.RecurringPatternTableLayout = WMAPP.Extension.View.LayoutView.extend({
		initialize: function() {

		},
		template: function(options) {
			var _tmplStr = '<fieldset>' +
			'<legend>' + options.options.label + '</legend>' +
			'<div class="wmapp-core-recurring_pattern-table-create wmapp-table-create"></div>' +
			'<div class="wmapp-core-recurring_pattern-table-list wmapp-table-list"></div>' +
			'</fieldset>';
			return _tmplStr;
		},
		templateHelpers:function(){
			return {
				options: {
					label: this.options.label,
				}
			}
		},
		regions: {
			listField: '.wmapp-core-recurring_pattern-table-list',
			createField: '.wmapp-core-recurring_pattern-table-create',
		},
	});    
});
