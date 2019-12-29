WMAPP.module('Extension.CustomFields', Backbone.Marionette.Module.extend({
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
        WMAPP.Log.getLogger("WMAPP." + this.moduleName).trace("CustomFields Module onStart begin");
        WMAPP.Log.getLogger("WMAPP." + this.moduleName).trace("CustomFields Module onStart end");
    },
    onStop: function () {
        WMAPP.Log.getLogger("WMAPP." + this.moduleName).trace("CustomFields Module onStop begin");
        WMAPP.Log.getLogger("WMAPP." + this.moduleName).trace("CustomFields Module onStop end");
    },
}));

WMAPP.module('Extension.CustomFields.Router', function(Router) {
	Router.ExtensionCustomFieldsRouter = WMAPP.Extension.Router.AppRouter.extend({
		appRoutes : {
			"custom_fields_data" : "showEditCustomFieldsData",
		},		
	});
});

WMAPP.module('Extension.CustomFields.Application', Backbone.Marionette.Module.extend({
	startWithParent: true,
	
	onStart: function(options) {
        // initialize tile region
        this.options = options;
        this.tileRegion = this.options.region;
        this.router = new WMAPP.Extension.CustomFields.Router.ExtensionCustomFieldsRouter({controller: this});
        
        this.model = this.options.model;
        
		// options for true false collection
		this.trueFalseCollection = new Backbone.Collection([
			{value: '1', option: 'True'},
			{value: '0', option: 'False'},
		]);	
        
    },

    onStop: function() {
        this.stopListening();
        // <protected> TODO: add controller stop logic here
		// </protected>            
    },
    
    showEditCustomFieldsData: function() {

		this.router.navigate('custom_fields_data');
		
        /**
         * Get any models or collections
         */        
		// collection query string
        var expandQueryString = 'data_sets|data_submissions';
		   
		// set any query params 
		this.model.queryParams['expand'] = expandQueryString; 

		// set any query params from the filter model		
             
        // get the document collection
		var that = this;
        this.model.fetch({reset: true}).then(function() {
        	that.coreDataSetEditForm = new WMAPP.Extension.CustomFields.View.DataSet({
        		associatedModel: that.model,
        		collection: that.model.get('_data_sets'),
        		submissions: that.model.get('_data_submissions')
        	});
        	
    		// bind events
        	that.listenTo(that.coreDataSetEditForm, 'trigger:editDataSetEventSubmit', that.editModel);
        	that.listenTo(that.coreDataSetEditForm, 'trigger:editDataSetEventCancel', function() {
        		that.router.navigate('', {trigger: true}); 
    	    	WMAPP.Extension.CustomFields.stop();    			
    		});	        	
        	
            /**
             * Render Views
             */
            // Show the layout in the tile region
    		that.tileRegion.show(that.coreDataSetEditForm);

            
            // reflow foundation
    		$(document).foundation('reflow');        	
        });	
    },
    
    editModel: function() {
		// clear any errors
		WMAPP.Helper.clearErrors('CustomFields');    	
    	
		// validate the model
		if (this.coreDataSetAdminEditForm) {
			Backbone.Validation.bind(this.coreDataSetAdminEditForm);
		}
		this.model.validate();

		if (this.model.isValid()) {
			var that = this;

			// set some dates if we are offline
			if (WMAPP.isApp && !WMAPP.isOnline) {
				if (this.model.get('created') == null) {
					this.model.set('created', moment().format("YYYY-MM-DD HH:mm:ss"));
				}
				this.model.set('modified', moment().format("YYYY-MM-DD HH:mm:ss"));
			}

			this.model.save({}, {
				success: function(model, response) {
					// add the model to the collection?
					// TODO Custom code for editing for data_set edit
					// And here

					// display flash message
					WMAPP.Helper.showMessage('success', 'The ' + that.options.name + ' has been saved.');

					WMAPP.Helper.wmAjaxEnd();

					// redirect to the list if successful
	    	    	that.router.navigate('', {trigger: true}); 
	    	    	WMAPP.Extension.CustomFields.stop(); 
				},
				error: function(model, response) {
					if (response.responseJSON) {
						if (response.responseJSON.message) {
							WMAPP.Helper.showMessage('alert', response.responseJSON.message);
						}
					} else if (response.statusText && response.status) {
						WMAPP.Helper.showMessage('alert', "Error ("+response.status+"): " + response.statusText);
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

WMAPP.module('Extension.CustomFields.View', function(View) {
	
	View.DataSetItemField = WMAPP.Extension.View.LayoutView.extend({
		tagName: 'div',
		template: function(data) {
			var model = data.options.model;
			return '<div class="data-field-region"></div>';
		},
		templateHelpers: function () {
			return {
				options: this.options
			};
		},
		regions: {
			dataField: '.data-field-region'
		},
		onShow: function() {
			if (this.options.submission.get('_data_submission_datas')) {
				var submissionData = _.find(this.options.submission.get('_data_submission_datas').models, function(model) {
					return this.model.get('id') == model.get('data_field_id');
				}, this);					
			}			
			
			if (!submissionData) {
				var submissionData = new WMAPP.Core.Model.DataSubmissionData({
					'data_field_id': this.model.get('id')
				});
				delete submissionData.validation.data_submission_id;
				this.options.submission.get('_data_submission_datas').add(submissionData);				
			}

			if (this.model.get('required')) {
				submissionData.validation.data.required = true;
				submissionData.validation.data['msg'] = this.model.get('name') + ' is required';
			} else {
				submissionData.validation = {};
			}				
			
			switch (this.model.get('field_type')) {
				case 'string' :
					this.dataFieldView = new WMAPP.Extension.View.TextField({
						model: submissionData,
						fieldId: this.options.associatedModel.featureName + this.options.associatedModel.entityName + WMAPP.Helper.camelCase(this.model.get('name')),
						fieldClass: '',
						fieldType: 'text',
						label: this.model.get('name'),
						name: 'data',
						tooltip: this.model.get('name'),
						required: ((this.model.get('required') == 1) ? true : false),
					});
					break;
				case 'numeric' :
					this.dataFieldView = new WMAPP.Extension.View.TextField({
						model: submissionData,
						fieldId: this.options.associatedModel.featureName + this.options.associatedModel.entityName + WMAPP.Helper.camelCase(this.model.get('name')),
						fieldClass: '',
						fieldType: 'number',
						label: this.model.get('name'),
						name: 'data',
						tooltip: this.model.get('name'),
						required: ((this.model.get('required') == 1) ? true : false),
					});
					break;
				case 'boolean' : 
					this.dataFieldView = new WMAPP.Extension.View.CheckBox({
						model: submissionData,
						fieldId: this.options.associatedModel.featureName + this.options.associatedModel.entityName + WMAPP.Helper.camelCase(this.model.get('name')),
						fieldClass: '',
						fieldType: 'text',
						label: this.model.get('name'),
						name: 'data',
						tooltip: this.model.get('name'),
						required: ((this.model.get('required') == 1) ? true : false),
					});
					break;
			}
			
			this.dataField.show(this.dataFieldView);
			
			if (this.model.get('required')) {
				Backbone.Validation.bind(this.dataFieldView);
			}
		}
	});	
        
	View.DataSetItem = WMAPP.Extension.View.CompositeView.extend({
		initialize: function() {
			this.collection = this.model.get('_data_fields');
			
			// get the submission for this dataSet
			this.submission = _.find(this.options.submissions.models, function(model) {
				return this.model.get('id') == model.get('data_set_id');
			}, this);
			
			if (!this.submission) {
				this.submission = new WMAPP.Core.Model.DataSubmission({
					'foreign_id': this.options.associatedModel.get('id'),
					'foreign_type': this.options.associatedModel.featureName + '.' + this.options.associatedModel.featureName + this.options.associatedModel.entityName,
					'data_set_id': this.model.get('id'),
					'_data_submission_datas': new WMAPP.Core.Model.DataSubmissionDataCollection()
				});
				
				this.options.submissions.add(this.submission);
			}
		},
		tagName: 'section',
		template: function(data) {
			return '<div class="field-content"></div>';
		},
		templateHelpers: function () {
			return {
				collection: this.collection,
				options: this.options
			};
		},			
		className: function() {
			// find the active tab
			var tab = this.options.parentEl.find('dl.tabs dd.active#' + WMAPP.Helper.tableName(this.model.get(this.model.displayAttribute)));
			if (tab && tab.attr('id') == WMAPP.Helper.tableName(this.model.get(this.model.displayAttribute))) {
				return 'content active';
			} else {
				return 'content';
			}
		},
		id: function() {
			return WMAPP.Helper.tableName(this.model.get(this.model.displayAttribute));
		},
		childView: View.DataSetItemField,
		childViewContainer: "div.field-content",
		childViewOptions: function() {
			return {
				dataSet: this.model,
				associatedModel: this.options.associatedModel,
				submission: this.submission,
				submissions: this.options.submissions
			};
		},		
	});
	
	View.DataSet = WMAPP.Extension.View.CompositeView.extend({
		initialize: function() {
			this.listenTo(this.collection, 'sync', this.render);
		},
		template: function(data) {
			var collection = data.options.collection;
			
			var tmplStr = '<dl class="tabs" data-tab>';
			var i = 0;
			_.each(collection.models, function(model) {
				tmplStr += '	<dd class="tab-title' + ((i==0) ? ' active' : '') + '" id="' + WMAPP.Helper.tableName(model.get(model.displayAttribute)) + '"><a href="#' + WMAPP.Helper.tableName(model.get(model.displayAttribute)) + '">' + model.get(model.displayAttribute) + '</a></dd>';
				++i;
			});
			tmplStr += '</dl>';
			tmplStr += '<div class="tabs-content">';
			tmplStr += '</div>';
			tmplStr += '	<ul class="button-group wmapp-button-group-spaced"><li><button type="button" class="wmapp-button wmapp-button-submit wmapp-submit-button wymupdate js-trigger-pepperbox">Save Custom Fields</button></li>';
			tmplStr += '	<li><button type="button" class="wmapp-button wmapp-button-cancel wmapp-cancel-button alert">Cancel</button></li>';
			tmplStr += '	</ul>';			
			return tmplStr;
		},
		templateHelpers: function () {
			return {
				collection: this.collection,
				options: this.options
			};
		},			
		childView: View.DataSetItem,
		childViewContainer: "div.tabs-content",
		childViewOptions: function() {
			return {
				parentEl: this.$el,
				associatedModel: this.options.associatedModel,
				submissions: this.options.submissions				
			};
		},
		className: 'tabs',
		events: {
			"click .wmapp-submit-button": "onSubmit",
			"click .wmapp-cancel-button": "onCancel",
		},
		onSubmit: function(e) {
			WMAPP.Helper.wmAjaxStart($(e.target));

			// trigger the edit data_set event in the application
			this.triggerDelayed('trigger:editDataSetEventSubmit', this.model);
		},
		onCancel: function() {
			// trigger the cancel data_set event in the application
			this.triggerDelayed('trigger:editDataSetEventCancel', this.model);
		},		
	});	
	
});
