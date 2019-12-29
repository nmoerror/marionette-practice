WMAPP.module('Extension.CustomFields.Admin', Backbone.Marionette.Module.extend({
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
        WMAPP.Log.getLogger("WMAPP." + this.moduleName).trace("CustomFields Admin Module onStart begin");
        WMAPP.Log.getLogger("WMAPP." + this.moduleName).trace("CustomFields Admin Module onStart end");
    },
    onStop: function () {
        WMAPP.Log.getLogger("WMAPP." + this.moduleName).trace("CustomFields Admin Module onStop begin");
        WMAPP.Log.getLogger("WMAPP." + this.moduleName).trace("CustomFields Admin Module onStop end");
    },
}));

WMAPP.module('Extension.CustomFields.Admin.Router', function(Router) {
	Router.ExtensionCustomFieldsAdminRouter = WMAPP.Extension.Router.AppRouter.extend({
		appRoutes : {
			"custom_fields" : "showCustomFields",
			"custom_fields/edit/:id" : "setEditCustomFields",
			"custom_fields/create/:foreignType/:foreignId": "setCreateCustomFields"
		},		
	});
});

WMAPP.module('Extension.CustomFields.Admin.Application', Backbone.Marionette.Module.extend({
	startWithParent: true,
	
	onStart: function(options) {
        // initialize tile region
        this.customFieldOptions = options;
        this.tileRegion = this.customFieldOptions.region;
        this.router = new WMAPP.Extension.CustomFields.Admin.Router.ExtensionCustomFieldsAdminRouter({controller: this});
        
        if (this.customFieldOptions.model) {
        	this.dataSet = this.customFieldOptions.model;
        	
    		// set any query params 
    		this.dataSet.queryParams['expand'] = 'data_fields|data_fields_options';         	
        } else {
        	// get the list of datasets from core
        	this.dataSetCollection = new WMAPP.Core.Model.DataSetCollection();
        	
    		// set any query params 
    		this.dataSetCollection.queryParams['expand'] = 'data_fields|data_fields_options';        	
        }
        
		// options for true false collection
		this.trueFalseCollection = new Backbone.Collection([
			{value: '1', option: 'True'},
			{value: '0', option: 'False'},
		]);	
        
    },

    onStop: function() {
        this.stopListening();         
    },
    
    showCustomFields: function () {
    	this.router.navigate('custom_fields');
    	
    	var that = this;
    	this.dataSetCollection.fetch().then(function() {
			/**
			 * Initialize Views
			 */
			// --- Command view
    		that.coreDataSetAdminListCommandView = new WMAPP.Extension.CustomFields.Admin.View.CoreDataSetAdminListCommand({
				collection: that.dataSetCollection
			});

			// --- Collection view
    		that.coreDataSetAdminListCollectionView = new WMAPP.Extension.CustomFields.Admin.View.CoreDataSetAdminList({collection: that.dataSetCollection});

			// --- Layout
    		that.coreDataSetAdminListLayout = new WMAPP.Extension.CustomFields.Admin.View.CoreDataSetAdminListLayout();
    		
    		// --- Bind events		
    		that.listenTo(that.coreDataSetAdminListCommandView, 'trigger:createDataSetEvent', function() {
    			that.dataSet = new WMAPP.Core.Model.DataSet({
    				'foreign_id': 0,
    				'foreign_type': 'Core.CoreDataSet',
    				'_data_fields': new WMAPP.Core.Model.DataFieldCollection()
    			});
    			that.capability = true;
    			that.setCreateCustomFields();
    		});
    		that.listenTo(that.coreDataSetAdminListCommandView, 'trigger:backCustomFieldsEvent', function() { 
    			that.router.navigate('', {trigger: true}); 
    			WMAPP.Extension.CustomFields.Admin.stop(); 
    	    });    		
    		that.listenTo(that.coreDataSetAdminListCollectionView, 'childview:trigger:showEditDataSet', function(childView, model) { 
    			that.dataSet = model;
    			that.capability = true;
    			that.setEditCustomFields(); 
    		});
    		that.listenTo(that.coreDataSetAdminListCollectionView, 'childview:trigger:deleteDataSet', function(childView, model) { that.deleteDataSet(model) });    		
    		
			/**
			 * Render Views
			 */
			// Show the layout in the tile region
    		that.tileRegion.show(that.coreDataSetAdminListLayout);
			// show the command view
    		that.coreDataSetAdminListLayout.command.show(that.coreDataSetAdminListCommandView);

			// show the collection view
    		that.coreDataSetAdminListLayout.list.show(that.coreDataSetAdminListCollectionView);   		
    	});
    },
    
    setCreateCustomFields: function(foreignType, foreignId) {
		this.router.navigate('custom_fields/create/' + foreignType + '/' + foreignId);
		
		this.dataSet.set({
			name: foreignType,
			foreign_type: foreignType,
			foreign_id: WMAPP.Helper.castId(foreignId),
		});
		this.dataSet.save().then(this.setEditCustomFields.bind(this, this.dataSet.id, true));
    },
    
    setEditCustomFields: function(id, skipFetch) {
		skipFetch = skipFetch || false;
		this.router.navigate('custom_fields/edit/' + this.dataSet.get('id'));

		if (skipFetch) {
			this.showEditCustomFields();
		} else {
			// get the full data set
			this.dataSet.fetch({reset: true}).then(this.showEditCustomFields.bind(this));
		}
    },
    
    showEditCustomFields: function() {

		// initialize views
    	this.coreDataSetAdminEditForm = new WMAPP.Core.View.CoreDataSetAdminEdit({
			model: this.dataSet,
			layoutId: 'CoreDataSet',
		});
    	
    	if (this.capability) {
			// Name TextField for data_set edit
    		this.coreDataSetAdminEditFormName = new WMAPP.Extension.View.TextField({
				model: this.dataSet,
				fieldId: 'CoreDataSetName',
				fieldClass: '',
				fieldType: 'text',
				label: 'Name',
				name: 'name',
				tooltip: ''
			});        		
    	}
		
		// --- Layout for DataField table
    	this.coreDataSetAdminEditFormDataFields = new WMAPP.Core.View.CoreDataFieldTableLayout({
			label: 'Data Fields',
		});
		// create a new model
    	this.newDataField	= new WMAPP.Core.Model.DataField({}, {validate:true});
    	this.newDataField.clear().set(this.newDataField.defaults);

		// remove the reverse validation
		delete this.newDataField.validation._data_set_id;
		delete this.newDataField.validation.data_set_id;

		this.coreDataSetAdminEditFormDataFieldsTable = new WMAPP.Core.View.CoreDataFieldTable({
			layoutId: 'CoreDataField',
			parentLayoutId: 'CoreDataSet',
			fieldId: 'DataFields',
			collection: this.dataSet.get('_data_fields'),
			// <protected> Additional options for DataField table view
				// </protected>
		});
		this.coreDataSetAdminEditFormDataFieldsCreate = new WMAPP.Core.View.CoreDataFieldTableCreate({
			layoutId: 'CoreDataField',
			parentLayoutId: 'CoreDataSet',
			fieldId: 'DataFields',
			collection: this.dataSet.get('_data_fields'),
			model: this.newDataField,
			// <protected> Additional options for DataField table create view
				// </protected>
		});
		
		// bind events
		this.listenTo(this.coreDataSetAdminEditForm, 'trigger:editDataSetEventSubmit', this.editDataSet);
		this.listenTo(this.coreDataSetAdminEditForm, 'trigger:editDataSetEventCancel', function() {
			if (this.capability) {
				this.router.navigate('custom_fields', {trigger: true});
			} else {
				this.router.navigate('', {trigger: true}); 
    	    	WMAPP.Extension.CustomFields.Admin.stop(); 
			}   			
		}, this);		
		

        /**
         * Render Views
         */
        // Show the layout in the tile region
		this.tileRegion.show(this.coreDataSetAdminEditForm);

        // show the regions within the layout
		if (this.capability) {
			this.coreDataSetAdminEditForm.nameField.show(this.coreDataSetAdminEditFormName);
		}
		this.coreDataSetAdminEditForm.dataFieldsField.show(this.coreDataSetAdminEditFormDataFields);
		this.coreDataSetAdminEditFormDataFields.listField.show(this.coreDataSetAdminEditFormDataFieldsTable);
		this.coreDataSetAdminEditFormDataFields.createField.show(this.coreDataSetAdminEditFormDataFieldsCreate);
        
        // reflow foundation
		$(document).foundation('reflow');
    },
    
    editDataSet: function() {
		// validate the model
		if (this.coreDataSetAdminEditForm) {
			Backbone.Validation.bind(this.coreDataSetAdminEditForm);
		}
		this.dataSet.validate();

		if (this.dataSet.isValid()) {
			var that = this;

			// set some dates if we are offline
			if (WMAPP.isApp && !WMAPP.isOnline) {
				if (this.dataSet.get('created') == null) {
					this.dataSet.set('created', moment().format("YYYY-MM-DD HH:mm:ss"));
				}
				this.dataSet.set('modified', moment().format("YYYY-MM-DD HH:mm:ss"));
			}

			this.dataSet.save({}, {
				success: function(model, response) {
					// display flash message
					WMAPP.Helper.showMessage('success', 'The data set has been saved.');

					WMAPP.Helper.wmAjaxEnd();

					// redirect to the list if successful
	    			if (that.capability) {
	    				that.router.navigate('custom_fields', {trigger: true});
	    			} else {
	        	    	that.router.navigate('', {trigger: true}); 
	        	    	WMAPP.Extension.CustomFields.Admin.stop(); 
	    			} 
				},
				error: function(model, response) {
					if (response.responseJSON) {
						if (response.responseJSON.message) {
							WMAPP.Helper.showMessage('alert', response.responseJSON.message);

							if (response.responseJSON.errors) {
								// handle the validation within the form
								_.each(response.responseJSON.errors, function(val, attr){
									Backbone.Validation.callbacks.invalid(that.coreDataSetEditForm, attr, val[0], attr);
								});
							} else if (response.responseJSON.version) { // if we get a response that the model is out of date, check the version
								// redirect to the list if successful
								callback();
							}
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
	
	deleteDataSet: function(model) {

		// clear any messages
		WMAPP.Helper.hideMessage();

		// redirect to the list if successful
		this.listenTo(WMAPP.vent, 'core:delete:data_set:success', this.deletePostProcess);

		this.delete(model);
	},

	deletePostProcess: function() {
		// redirect to the list
		this.showCustomFields();
	},

	delete: function(model) {
		model.destroy({
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
			WMAPP.Helper.showMessage('success', 'The data set has been deleted.');

			// redirect to the list if successful
			WMAPP.vent.trigger('core:delete:data_set:success');
		});
	},	
}));

WMAPP.module('Extension.CustomFields.Admin.View', function(View) {
	
	View.CoreDataSetAdminListLayout = WMAPP.Extension.View.LayoutView.extend({
		initialize: function() {
			if (WMAPP.isApp) {
				WMAPP.setTitle(WMAPP.Helper.pluralize('Data Set'));
			}
			WMAPP.Extension.View.LayoutView.prototype.initialize.call(this);
		},
		template: function() {
			var tmplStr = '' +
			'<fieldset>' +
			'<legend>' + (WMAPP.Helper.pluralize ? WMAPP.Helper.pluralize('DataSet') : 'DataSets') + '</legend>' +
			'<div class="wmapp-core-data_set-list-commands wmapp-commands clearfix"></div>' +
			'<div class="wmapp-core-data_set-list-content"></div>';
			tmplStr += '</fieldset>';
			return tmplStr;
		},
		regions: {
			command: '.wmapp-core-data_set-list-commands',
			list: '.wmapp-core-data_set-list-content',
		},
	});

	/* view for the commands area above the list */
	View.CoreDataSetAdminListCommand = WMAPP.Extension.View.ItemView.extend({
		template: function() {
			var tmplStr = '<div style="padding-bottom: 10px;"><ul class="button-group wmapp-button-group-spaced">';
			
			tmplStr += '<li><a class="wmapp-button wmapp-button-create wmapp-create-button button">Create Data Set</a></li>';
			
			tmplStr += '</ul><a class="wmapp-back-button button small right">Back</a></div>';
			return tmplStr;
		},
		class: 'wmapp-core-data_set-list-commands',
		events: {
			"click .wmapp-create-button": "onCreate",
			"click .wmapp-back-button": "onBack",  
		},
        onBack: function(e) {
        	e.preventDefault();
        	e.stopPropagation();   
        	this.trigger('trigger:backCustomFieldsEvent');
        }, 			
		onCreate: function(e) {
        	e.preventDefault();
        	e.stopPropagation(); 			
			this.trigger('trigger:createDataSetEvent');
		}
	});
	View.CoreDataSetAdminListItem = WMAPP.Extension.View.ItemView.extend({
		tagName: 'tr',
		template: function(data) {
			var model = data.model;
			var options = data.options;
			var tmplStr = '';
			tmplStr += '<td data-th="Name: ">' + model.get('name') + '</td>';
			tmplStr += '<td style="text-align: right"><ul class="button-group">';
			tmplStr += '<li><a class="wmapp-button wmapp-button-icon wmapp-button-edit wmapp-edit-button button small" data-id="' + model.get(model.primaryKey) + '" title="Edit">Edit</a></li></li>';
			tmplStr += '<li><a class="wmapp-button wmapp-button-icon wmapp-button-delete wmapp-delete-button button small" data-id="' + model.get(model.primaryKey) + '" title="Are you sure you want to delete this Data Set?">Delete</a></li>';
			tmplStr += '</ul></td>';
			return tmplStr;
		},
		templateHelpers: function(){
			return {
				model: this.model,
				options: this.options,
			}
		},
		events: {
			"click .wmapp-edit-button": "onEdit",
			"click .wmapp-delete-button": "onDelete",
		},
		onEdit: function(e) {
			e.preventDefault();
			e.stopPropagation();
			this.trigger('trigger:showEditDataSet', this.model);
		},
		onDelete: function(e) {
			e.preventDefault();
			e.stopPropagation();
			var that = this;
			WMAPP.confirm(e.target.title, function(result) {
				if (result) {
					that.trigger('trigger:deleteDataSet', that.model);
				}
			}, 'Delete DataSet?');
		},
	});

	View.CoreDataSetAdminList = WMAPP.Extension.View.CompositeView.extend({
		initialize: function() {
			this.listenTo(this.collection, 'sync', this.render);
		},
		template: function() {
			var tmplStr = '<thead>';
				tmplStr += '<tr>';
					tmplStr += '<th class="wmapp-admin-sort" data-sort-key="CoreDataSet.name">Name</th>';
					tmplStr += '<th class="wmapp-admin-commands">Commands</th>';
				tmplStr += '</tr>';
			tmplStr += '</thead>';
			tmplStr += '<tbody>';
			tmplStr += '</tbody>';
			return tmplStr;
		},
		tagName: "table",
		className: "wmapp-table",
		id: "thisId",
		childView: View.CoreDataSetAdminListItem,
		childViewContainer: "tbody",
	});        
});