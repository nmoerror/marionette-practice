WMAPP.module('Extension.Documents.Admin', Backbone.Marionette.Module.extend({
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
        WMAPP.Log.getLogger("WMAPP." + this.moduleName).trace("Documents Admin Module onStart begin");
        WMAPP.Log.getLogger("WMAPP." + this.moduleName).trace("Documents Admin Module onStart end");
    },
    onStop: function () {
        WMAPP.Log.getLogger("WMAPP." + this.moduleName).trace("Documents Admin Module onStop begin");
        WMAPP.Log.getLogger("WMAPP." + this.moduleName).trace("Documents Admin Module onStop end");
    },
}));

WMAPP.module('Extension.Documents.Admin.Router', function(Router) {
	Router.ExtensionDocumentsAdminRouter = WMAPP.Extension.Router.AppRouter.extend({
		appRoutes : {
			"documents" : "listDocument",
			"documents/create" : "showCreateDocument",
			"documents/edit/:id" : "showEditDocument",
			"documents/versions/:id" : "listDocumentVersions",
			"documents/submissions/:id" : "showDocumentSubmissions",
			"documents/submission_datas/:id" : "viewDocumentSubmission",
		},		
	});
});

WMAPP.module('Extension.Documents.Admin.Application', Backbone.Marionette.Module.extend({
	startWithParent: true,
	
	onStart: function(options) {
        this.options = options;
        
        // initialize tile region
        this.documentOptions = options;
        this.tileRegion = this.documentOptions.region;
        this.router = new WMAPP.Extension.Documents.Admin.Router.ExtensionDocumentsAdminRouter({controller: this});
        
        /* Initialize model/s */       
        // Document Pageable Collection
        this.documentPageableCollection = new WMAPP.Core.Model.DocumentPageableCollection();
        if (WMAPP.isApp && _.isBoolean(WMAPP.isOnline) && !WMAPP.isOnline) {
        	this.documentPageableCollection.local = true;
        	this.documentPageableCollection.switchMode('client');
        } else {
        	this.documentPageableCollection.remote = true;
        }   
        
        this.documentPageableCollection.queryParams['CoreDocument_entity_name'] = this.documentOptions.entity;

		// options for enum questionValidationEnum
		this.questionValidationEnum = new Backbone.Collection([
			{value: 'NUMERIC', option: 'Numeric'},
			{value: 'EMAIL', option: 'Email'},
			{value: 'URL', option: 'URL'},
		]);
		// options for enum textRuleOperatorsEnum
		this.textRuleOperatorsEnum = new Backbone.Collection([
			{value: '0', option: 'Is answered'},
			{value: '1', option: 'Is not answered'},
			{value: '2', option: 'Contains'},
			{value: '3', option: 'Does not contain'},
		]);
		// options for enum optionRuleOperatorsEnum
		this.optionRuleOperatorsEnum = new Backbone.Collection([
			{value: '0', option: 'Is answered'},
			{value: '1', option: 'Is not answered'},
			{value: '4', option: 'Includes one of the following'},
			{value: '5', option: 'Does not include one of the following'},
		]);
		// options for enum basicRuleOperatorsEnum
		this.basicRuleOperatorsEnum = new Backbone.Collection([
			{value: '0', option: 'Is answered'},
			{value: '1', option: 'Is not answered'},
		]);
		// options for enum ruleValueTypeEnum
		this.ruleValueTypeEnum = new Backbone.Collection([
			{value: '1', option: 'Option'},
			{value: '2', option: 'Text'},
		]);
		// options for enum submissionStatusEnum
		this.submissionStatusEnum = new Backbone.Collection([
			{value: '0', option: 'Open'},
			{value: '1', option: 'Completed'},
			{value: '2', option: 'Invalid'},
		]);
		// options for enum justifyEnum
		this.justifyEnum = new Backbone.Collection([
			{value: 'left', option: 'LEFT'},
			{value: 'center', option: 'CENTER'},
			{value: 'right', option: 'RIGHT'},
		]);
		// options for enum socialNetworkEnum
		this.socialNetworkEnum = new Backbone.Collection([
			{value: '1', option: 'Facebook'},
			{value: '2', option: 'Google'},
			{value: '3', option: 'Instagram'},
			{value: '4', option: 'LinkedIn'},
			{value: '5', option: 'Pinterest'},
			{value: '6', option: 'Twitter'},
			{value: '7', option: 'Vimeo'},
			{value: '8', option: 'YouTube'},
		]);
		// options for enum unitTypesEnum
		this.unitTypesEnum = new Backbone.Collection([
			{value: 'One off', option: 'One off'},
			{value: 'Weekly', option: 'Weekly'},
			{value: 'Monthly', option: 'Monthly'},
			{value: 'Daily', option: 'Daily'},
			{value: 'Quarterly', option: 'Quarterly'},
			{value: 'Semi Annually', option: 'Semi Annually'},
			{value: 'Annually', option: 'Annually'},
		]);
		// options for enum costTypeEnum
		this.costTypeEnum = new Backbone.Collection([
			{value: 'Credit', option: 'Credit'},
			{value: 'Debit', option: 'Debit'},
		]);
		// options for enum reminderTypeEnum
		this.reminderTypeEnum = new Backbone.Collection([
			{value: 'Fixed', option: 'Fixed'},
			{value: 'Relative', option: 'Relative'},
		]);
		// options for enum recipientTypeEnum
		this.recipientTypeEnum = new Backbone.Collection([
			{value: 'Push', option: 'Push'},
			{value: 'Email', option: 'Email'},
			{value: 'PushAndEmail', option: 'PushAndEmail'},
		]);


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
    
	listDocument: function() {
		this.router.navigate('documents');
		
        /**
         * Get any models or collections
         */        
		// collection query string
        var expandQueryString = '';
		// TODO Custom request additions for Document
		// And here	            
		expandQueryString += '|icon';

		if (expandQueryString != '') {
			expandQueryString = expandQueryString.substring(1);
		}  
		   
		// set any query params 
		this.documentPageableCollection.queryParams['expand'] = expandQueryString; 

		// set any query params from the filter model		
             
        // get the document collection
        this.documentPageableCollection.fetch();

        /**
         * Initialize Views
         */

        // --- Command view
        this.coreDocumentListCommandView = new WMAPP.Extension.Documents.Admin.View.CoreDocumentListCommand({collection: this.documentPageableCollection});

        // --- Collection view
        this.coreDocumentListCollectionView = new WMAPP.Extension.Documents.Admin.View.CoreDocumentList({collection: this.documentPageableCollection});
        
        // --- Pagination view
        this.coreDocumentListPaginationView = new WMAPP.Extension.Documents.Admin.View.CoreDocumentListPagination({
            collection: this.documentPageableCollection
        });
        
        // --- Layout
        this.coreDocumentListLayout = new WMAPP.Extension.Documents.Admin.View.CoreDocumentListLayout();

        /**
        * Bind Events
        */
        var that = this;
	    this.listenTo(this.coreDocumentListCommandView, 'trigger:createDocumentEvent', this.showCreateDocument);
	    this.listenTo(this.coreDocumentListCommandView, 'trigger:backDocumentEvent', function() { 
	    	this.router.navigate('', {trigger: true}); 
	    	WMAPP.Extension.Documents.Admin.stop();
	    });
        this.listenTo(this.coreDocumentListCollectionView, 'childview:trigger:showEditDocument', function(childView, model) { that.showEditDocument(model.get("id")) });
        this.listenTo(this.coreDocumentListCollectionView, 'childview:trigger:deleteDocument', function(childView, model) { that.deleteDocument(model) });
        this.listenTo(this.coreDocumentListCollectionView, 'childview:trigger:showVersionsDocument', function(childView, model) { that.listDocumentVersions(model.get("id")) });
        this.listenTo(this.coreDocumentListCommandView, 'trigger:deleteDocumentMultiple', this.deleteDocumentMultiple);
        this.listenTo(this.coreDocumentListCollectionView, 'childview:trigger:showDocumentSubmissions', function(childView, model) { that.showDocumentSubmissions(model.get("id")) });
    
    	//<!-- TODO Custom event bindings for Document between here -->
		//<!-- And here --> 
 	
        /**
         * Render Views
         */
        // Show the layout in the tile region
        this.tileRegion.show(this.coreDocumentListLayout);

        // show the command view
        this.coreDocumentListLayout.command.show(this.coreDocumentListCommandView);

        // show the collection view
        this.coreDocumentListLayout.list.show(this.coreDocumentListCollectionView);
        
        // show the pagination view
        this.coreDocumentListLayout.pagination.show(this.coreDocumentListPaginationView);
        
        // reflow foundation
		$(document).foundation('reflow');
	
    },
	
	onNetworkChanged: function(networkChanged) {
		if (_.isBoolean(networkChanged)) { // if networkChanged is undefined, then network status is not changed
			if (WMAPP.isOnline) {
				delete this.documentPageableCollection['local'];
				this.documentPageableCollection.remote = true;
				this.documentPageableCollection.switchMode('server', {fetch: false, resetState: false});
			} else {
				this.documentPageableCollection.local = true;
				this.documentPageableCollection.remote = false;
				
				this.documentPageableCollection.switchMode('client', {fetch: false, resetState: false});
				
				this.documentPageableCollection.state.totalRecords = this.documentLocalCollection.models.length;
				this.documentPageableCollection.state.totalPages = Math.ceil(this.documentPageableCollection.state.totalRecords/this.documentPageableCollection.state.pageSize);
				this.documentPageableCollection.state.lastPage = Math.ceil(this.documentPageableCollection.state.totalRecords/this.sitePageableCollection.state.pageSize);
				this.documentPageableCollection.fetch();
				
				// rerender the view
				if (this.coreDocumentListLayout.pagination) {
	            	this.coreDocumentListPaginationView = new WMAPP.Extension.Documents.Admin.View.CoreDocumentListPagination({
		                collection: this.documentPageableCollection
		            });			
		            this.coreDocumentListLayout.pagination.show(this.coreDocumentListPaginationView);
		        }				
			}
		}
	},          

	showCreateDocument: function() {
   
		this.router.navigate('documents/create');
		
   		// clear any messages
   		WMAPP.Helper.hideMessage();
   		
        // document Model
        this.document = new WMAPP.Core.Model.Document();              
        if (!WMAPP.isApp) {
        	this.document.remote = true;
        }
        
		// initialize the model we will be using to collect this data
		this.document.clear().set(this.document.defaults);
		this.document.set('_icon', new WMAPP.Core.Model.Image({plugin_id: this.documentOptions.plugin_id}));
		this.document.set('entity_name', this.documentOptions.entity);
	
		// Custom code for document now that we have set our model
		// End here 		
        // initialize views
        this.coreDocumentCreateForm = new WMAPP.Extension.Documents.Admin.View.CoreDocumentCreate({
        	model: this.document,
        	layoutId: 'CoreDocument',
			label: 'Create Document',
        });
        
        this.showCreateDocumentForm();

    },
	showCreateDocumentForm: function(promote) {
		if (promote === undefined) {
			promote = false;
		}
		
		// set the image collection to be used within the fields.
		var images = new WMAPP.Core.Model.ImageCollection();
		images.fetch();



        // Name TextField for document create
        this.coreDocumentCreateFormName = new WMAPP.Extension.View.TextField({
            model: this.document,
            fieldId: 'CoreDocumentName',
            fieldClass: '',
			fieldType: 'text',		
            label: 'Name',
            name: 'name',
            tooltip: 'The name of the Safety Document',
			maxlength: 255,
        });


        // Description TextArea for document create
        this.coreDocumentCreateFormDescription = new WMAPP.Extension.View.TextArea({
            model: this.document,
            fieldId: 'CoreDocumentDescription',
            fieldClass: '',
			fieldType: 'text',		
            label: 'Description',
            name: 'description',
            tooltip: 'A general description for the document',
			maxlength: 1024,
        });


        // single image field for Icon
		// TODO Custom file image filters icon
		WMAPP.resetAcceptedImageTypes(); // leave this in, or uncomment and customize below
        // WMAPP.acceptedImageTypes = {
		// 	'jpg': 'image_jpeg',
		// };
		// And here
        this.coreDocumentCreateFormIcon = new WMAPP.Extension.View.ImageSingleField({
        	model: this.document,
            fieldId: 'CoreDocumentIcon',
            fieldClass: '',
            label: 'Icon',
            name: 'icon',
            tooltip: 'The image that will be used when displaying the document types',
            options: images,
        });


        // EntityName HiddenField for document create
        this.coreDocumentCreateFormEntityName = new WMAPP.Extension.View.HiddenField({
            model: this.document,
            fieldId: 'CoreDocumentEntityName',
            name: 'entity_name',
        });

		// Tabular CheckBox for document create
        this.coreDocumentCreateFormTabular = new WMAPP.Extension.View.CheckBox({									
            model: this.document,
            fieldId: 'CoreDocumentTabular',
            fieldClass: '',
            label: 'Tabulate PDF Submission',
            name: 'tabular_pdf',
            tooltip: 'Tabulate the submission results when generating the PDF for this document',              
        });	

        // Email TextField for document create
        this.coreDocumentCreateFormEmail = new WMAPP.Extension.View.TextField({
            model: this.document,
            fieldId: 'CoreDocumentEmail',
            fieldClass: '',
			fieldType: 'text',		
            label: 'Email',
            name: 'email',
            tooltip: 'The email to send the form data to upon the document submission',
        });


		// AutoResponseEmail CheckBox for document create
        this.coreDocumentCreateFormAutoResponseEmail = new WMAPP.Extension.View.CheckBox({									
            model: this.document,
            fieldId: 'CoreDocumentAutoResponseEmail',
            fieldClass: '',
            label: 'Auto Response Email',
            name: 'auto_response_email',
            tooltip: 'Add an auto response email to this document',              
        });
        					

        // EmailId HiddenField for document create
        this.coreDocumentCreateFormEmailId = new WMAPP.Extension.View.HiddenField({
            model: this.document,
            fieldId: 'CoreDocumentEmailId',
            name: 'email_id',
        });
                   



// TODO Custom field declarations for document create
// And here

        // bind events
        this.listenTo(this.coreDocumentCreateForm, 'trigger:createDocumentEventSubmit', this.createDocument);
		this.listenTo(this.coreDocumentCreateForm, 'trigger:createDocumentEventCancel', this.listDocument);

        // render the view
        this.tileRegion.show(this.coreDocumentCreateForm);
        
		this.coreDocumentCreateForm.nameField.show(this.coreDocumentCreateFormName);
		this.coreDocumentCreateForm.descriptionField.show(this.coreDocumentCreateFormDescription);
		this.coreDocumentCreateForm.iconField.show(this.coreDocumentCreateFormIcon);
        this.coreDocumentCreateForm.entityNameField.show(this.coreDocumentCreateFormEntityName);
		this.coreDocumentCreateForm.tabularField.show(this.coreDocumentCreateFormTabular); 
		this.coreDocumentCreateForm.emailField.show(this.coreDocumentCreateFormEmail);
		this.coreDocumentCreateForm.autoResponseEmailField.show(this.coreDocumentCreateFormAutoResponseEmail);
        this.coreDocumentCreateForm.emailIdField.show(this.coreDocumentCreateFormEmailId);

		// TODO Custom field display for document create
		// And here


		// run the afterAllShown function
		this.coreDocumentCreateForm.afterAllShown();

		// reflow foundation
		$(document).foundation('reflow');
    },



	createDocument: function() {

        // clear any errors
        WMAPP.Helper.clearErrors('CoreDocument');

        // validate the model
        this.document.validate();
        
        if (this.document.isValid()) {
        	var that = this;
        	
        	// set some dates if we are offline
        	if (WMAPP.isApp && !WMAPP.isOnline) {
        		if (this.document.get('created') == null) {
        			this.document.set('created', moment().format("YYYY-MM-DD HH:mm:ss"));
        		}
        		this.document.set('modified', moment().format("YYYY-MM-DD HH:mm:ss"));
        	}
        	
        	// save the model
            this.document.save({}, {            	
                success: function(model, response, options) {
                    // display flash message
            		WMAPP.Helper.showMessage('success', 'The document has been saved.');

		  			// TODO Custom code for creation for document create
					// And here	                		
                		                		

					// add the model to the collection?
	            	if (WMAPP.isApp && !WMAPP.isOnline) {
	            		// add this model locally
	            		that.documentLocalCollection.create(model.toJSON(), {remote: false});
		            } 

		            // list the documents
		            that.listDocument();
		            
		            WMAPP.Helper.wmAjaxEnd();
                },
                error: function(model, response, options) {
                    if (response.responseJSON) {
						if (response.responseJSON.message) {
							 WMAPP.Helper.showMessage('alert', response.responseJSON.message);
		                    if (response.responseJSON.errors) {
			                    // handle the validation within the form
		                    	_.each(response.responseJSON.errors, function(val, attr){
		                    		Backbone.Validation.callbacks.invalid(that.coreDocumentCreateForm, attr, val[0], attr);
		                        });		
		                    } else if (response.responseJSON.version) { // if we get a response that the model is out of date, check the version
								// save this data locally
								that.documentLocalCollection.create(that.document.toJSON(), {remote: false, wait: true});
								
								if (WMAPP.isApp) {
									// set the app to upgrade status
									WMAPP.setUpgrade();
								}
								
				            	// list the documents
				            	that.listDocument();		
							}
						}
					} else if (response.statusText && response.status) {
						WMAPP.Helper.showMessage('alert', "Error ("+response.status+"): " + response.statusText);
					} else {
						WMAPP.Helper.showMessage('alert', "An unknown error has occurred.");
					}
					
					WMAPP.Helper.wmAjaxEnd(); 
                },
                remote: WMAPP.isOnline
            });
        } else {
			WMAPP.Helper.wmAjaxEnd();
        }
    },

    showEditDocument: function(DocumentId) {
    	
    	this.router.navigate('documents/edit/' + DocumentId);
    
   		// clear any messages
   		WMAPP.Helper.hideMessage();        
        
        // get the entry?
        this.setDocument(DocumentId);
        
        // show the edit form         	
     	this.showEditDocumentForm(); 
	},
			
	setDocument: function(DocumentId) {
        // get the entry?
        if (this.documentPageableCollection.length === 0) {
            this.document = new WMAPP.Core.Model.Document({
            	id: DocumentId,
				_icon: new WMAPP.Core.Model.Image(),
            });
            var documentUrl = this.document.getUrl();
       		var queryString = '';
			// TODO Custom edit request additions for Document
			// And here	             		
			queryString += '|icon';
			if (queryString != '') {
				queryString = '?expand=' + queryString.substring(1);
			}                    
            this.document.url = documentUrl + '/' + DocumentId + queryString;                
            this.document.remote = true;
            this.document.fetch({async: false});
        } else {
       		this.document = this.documentPageableCollection.get(DocumentId);
        }
        
    	// TODO Custom edit the Document that we got from the collection or retrieved
		// And here	             
    },

	showEditDocumentForm: function() {
	
		// set the image collection to be used within the fields.
		var images = new WMAPP.Core.Model.ImageCollection();
		images.fetch();
		

       	// initialize views
       	this.coreDocumentEditForm = new WMAPP.Extension.Documents.Admin.View.CoreDocumentEdit({
       		model: this.document,
       		layoutId: 'CoreDocument',
       	});

		
        // Name TextField for document edit
        this.coreDocumentEditFormName = new WMAPP.Extension.View.TextField({
            model: this.document,
            fieldId: 'CoreDocumentName',
            fieldClass: '',
			fieldType: 'text',
            label: 'Name',
            name: 'name',               
            tooltip: 'The name of the Safety Document'            	
        });	
        			
		
        // Description TextArea for document edit
        this.coreDocumentEditFormDescription = new WMAPP.Extension.View.TextArea({
            model: this.document,
            fieldId: 'CoreDocumentDescription',
            fieldClass: '',
			fieldType: 'text',
            label: 'Description',
            name: 'description',               
            tooltip: 'A general description for the document'            	
        });	
        			
		
        // single image field for Icon
		// TODO Custom file image filters icon
		WMAPP.resetAcceptedImageTypes(); // leave this in, or uncomment and customize below
        // WMAPP.acceptedImageTypes = {
		// 	'jpg': 'image_jpeg',
		// };
		// And here             
        this.coreDocumentEditFormIcon = new WMAPP.Extension.View.ImageSingleField({
        	model: this.document,
            fieldId: 'CoreDocumentIcon',
            fieldClass: '',
            label: 'Icon',
            name: 'icon',
            tooltip: 'The image that will be used when displaying the document types',
            options: images,
        });
        					
		
        // EntityName HiddenField for document edit
        this.coreDocumentEditFormEntityName = new WMAPP.Extension.View.HiddenField({
            model: this.document,
            fieldId: 'CoreDocumentEntityName',
            name: 'entity_name',
        });	
        			
		// Tabular CheckBox for document edit
        this.coreDocumentEditFormTabular = new WMAPP.Extension.View.CheckBox({									
            model: this.document,
            fieldId: 'CoreDocumentTabular',
            fieldClass: '',
            label: 'Tabulate PDF Submission',
            name: 'tabular_pdf',
            tooltip: 'Tabulate the submission results when generating the PDF for this document',              
        });	

        // Email TextField for document edit
        this.coreDocumentEditFormEmail = new WMAPP.Extension.View.TextField({
            model: this.document,
            fieldId: 'CoreDocumentEmail',
            fieldClass: '',
			fieldType: 'text',		
            label: 'Email',
            name: 'email',
            tooltip: 'The email to send the form data to upon the document submission',
        });


		// AutoResponseEmail CheckBox for document edit
        this.coreDocumentEditFormAutoResponseEmail = new WMAPP.Extension.View.CheckBox({									
            model: this.document,
            fieldId: 'CoreDocumentAutoResponseEmail',
            fieldClass: '',
            label: 'Auto Response Email',
            name: 'auto_response_email',
            tooltip: 'Add an auto response email to this document',              
        });
        					

        // EmailId HiddenField for document edit
        this.coreDocumentEditFormEmailId = new WMAPP.Extension.View.HiddenField({
            model: this.document,
            fieldId: 'CoreDocumentEmailId',
            name: 'email_id',
        });
        
        // EmailQuestion combobox for document edit
        var questions = new WMAPP.Core.Model.PageTileCollection();
        questions.url = questions.frontendUrl + '/?CorePageTile_content_area_id=' + this.document.get('content_area_id') + '&displayType=childrenFlat&expand=page_tile_type&CorePageTileType_question=1&CorePageTileType_tile=1&CorePageTileType_email=1';
        questions.fetch().done(function() {
            _.each(questions.models, function(element, index, questions) {
            	element.set('name', element.get('_question').name);
            });  
            questions.trigger('reset');
        });         
        
        this.coreDocumentEditFormEmailQuestion = new WMAPP.Extension.View.ComboBox({									
            model: this.document,
            fieldId: 'CoreDocumentEmailQuestionField',
            label: 'Email Question',
            name: 'email_question',
            tooltip: 'The question to use as the users email address to send the auto response email to',
            options: questions,
			valueField: 'id',
			optionField: 'name',
			empty: {"value": "", "option": "Select a Question"}, 				
        });                 




		// TODO Custom field declarations for document edit
		// And here	
 
        // bind events
        this.listenTo(this.coreDocumentEditForm, 'trigger:editDocumentEventSubmit', this.editDocument);
		this.listenTo(this.coreDocumentEditForm, 'trigger:editDocumentEventCancel', this.listDocument);
        

        // render the view
        this.tileRegion.show(this.coreDocumentEditForm);
		this.coreDocumentEditForm.nameField.show(this.coreDocumentEditFormName);			
		this.coreDocumentEditForm.descriptionField.show(this.coreDocumentEditFormDescription);			
		this.coreDocumentEditForm.iconField.show(this.coreDocumentEditFormIcon);
        this.coreDocumentEditForm.entityNameField.show(this.coreDocumentEditFormEntityName);			

		this.coreDocumentEditForm.tabularField.show(this.coreDocumentEditFormTabular); 
		this.coreDocumentEditForm.emailField.show(this.coreDocumentEditFormEmail);
		this.coreDocumentEditForm.autoResponseEmailField.show(this.coreDocumentEditFormAutoResponseEmail);
        this.coreDocumentEditForm.emailIdField.show(this.coreDocumentEditFormEmailId);
        this.coreDocumentEditForm.emailQuestionField.show(this.coreDocumentEditFormEmailQuestion);

		// TODO Custom field display for document edit
		// And here		


		// run the afterAllShown function
		this.coreDocumentEditForm.afterAllShown();

		// reflow foundation
		$(document).foundation('reflow');	
    },
    
    editDocument: function(model) {
        // clear any errors
        WMAPP.Helper.clearErrors('CoreDocument');        
    
        // redirect to the list if successful
        this.listenTo(WMAPP.vent, 'core:edit:document:success', function(model) { this.editPostProcess(model); });          
    
    	// call the edit site method
        this.edit(model);
    },
    
    editPostProcess: function(model) {
        // redirect to the list
        this.listDocument();
                	
    },
             
    edit: function(model) {
        // validate the model
        model.validate();
        
        if (model.isValid()) {
        	var that = this;
        
        	// set some dates if we are offline
        	if (WMAPP.isApp && !WMAPP.isOnline) {
        		if (model.get('created') == null) {
        			model.set('created', moment().format("YYYY-MM-DD HH:mm:ss"));
        		}
        		model.set('modified', moment().format("YYYY-MM-DD HH:mm:ss"));
        	}            
        
            model.save({}, {
                success: function(model, response) {
                    // add the model to the collection?
		  			// TODO Custom code for editing for document edit
					// And here                    
                    
                    // display flash message
                	WMAPP.Helper.showMessage('success', 'The document has been saved.');
                	
        			// redirect to the list if successful
        			WMAPP.vent.trigger('core:edit:document:success', model);
        			
        			WMAPP.Helper.wmAjaxEnd(); 
                },
                error: function(model, response) {
                	if (response.responseJSON) {
						if (response.responseJSON.message) {
		                	WMAPP.Helper.showMessage('alert', response.responseJSON.message);
		                    
		                    if (response.responseJSON.errors) {
			                    // handle the validation within the form
		                    	_.each(response.responseJSON.errors, function(val, attr){
		                    		Backbone.Validation.callbacks.invalid(that.coreDocumentEditForm, attr, val[0], attr);
		                        });
		                    } else if (response.responseJSON.version) { // if we get a response that the model is out of date, check the version
								// save this data locally
								that.documentLocalCollection.create(that.document.toJSON(), {remote: false, wait: true});
								
								// set the app to upgrade status
								WMAPP.setUpgrade();
								
		            			// redirect to the list if successful
		            			WMAPP.vent.trigger('core:edit:document:success', model);		
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

    listDocumentVersions: function(DocumentId) {

    	this.router.navigate('documents/versions/' + DocumentId);
    	
        /**
         * Get any models or collections
         */    
        // get the entry?
        this.document = new WMAPP.Core.Model.Document();
        this.document.set({id: DocumentId});
        var documentUrl = this.document.getUrl();
       	var queryString = '';
		// TODO Custom request additions for Document
		// And here	             		
		queryString += '|icon';
		if (queryString != '') {
			queryString = '?expand=' + queryString.substring(1);
		}             
        
        this.document.url = documentUrl + '/' + DocumentId + queryString;                
        this.document.fetch();             
                 
        // get the document version collection
        this.documentVersionPageableCollection = new WMAPP.Core.Model.DocumentPageableCollection();
        this.documentVersionPageableCollection.storeName = 'WMAPP.Core.Model.Document.' + DocumentId;
        if (queryString != '') {
        	this.documentVersionPageableCollection.queryParams['expand'] = queryString.substring(8);
        }
        this.documentVersionPageableCollection.queryParams['CoreDocument_instance_id'] = this.document.get('id');
        this.documentVersionPageableCollection.fetch();

		this.document.set('_versions', this.documentVersionPageableCollection);

        /**
         * Initialize Views
         */
        // --- Command view
        this.coreDocumentVersionListCommandView = new WMAPP.Extension.Documents.Admin.View.CoreDocumentVersionListCommand({
        	collection: this.documentVersionPageableCollection
       	});
        
        // --- Collection view
        this.coreDocumentVersionListCollectionView = new WMAPP.Extension.Documents.Admin.View.CoreDocumentVersionList({
        	model: this.document,
        	collection: this.documentVersionPageableCollection,
        });
        
        // --- Pagination view
        this.coreDocumentVersionListPaginationView = new WMAPP.Extension.Documents.Admin.View.CoreDocumentVersionListPagination({
            collection: this.documentVersionPageableCollection
        });
        
        // --- Layout
        this.coreDocumentVersionListLayout = new WMAPP.Extension.Documents.Admin.View.CoreDocumentVersionListLayout();

        /**
         * Bind Events
         */
        this.listenTo(this.coreDocumentVersionListCommandView, 'trigger:createDocumentVersionEvent', this.createDocumentVersion);
        this.listenTo(this.coreDocumentVersionListCollectionView, 'childview:trigger:deleteDocumentVersion', function(childView, model) { this.deleteDocumentVersion(model) });
        this.listenTo(this.coreDocumentVersionListCollectionView, 'childview:trigger:showDocumentSubmissions', function(childView, model) { this.showDocumentSubmissions(model.get("id")) });
        this.listenTo(this.coreDocumentVersionListCollectionView, 'childview:trigger:publishDocumentVersion', function(childView, model) { this.publishDocumentVersion(model) }); 
        this.listenTo(this.coreDocumentVersionListCommandView, 'trigger:backDocumentVersionEvent', this.listDocument);
         	
        /**
         * Render Views
         */
        // Show the layout in the tile region
        this.tileRegion.show(this.coreDocumentVersionListLayout);

        // show the command view
        this.coreDocumentVersionListLayout.command.show(this.coreDocumentVersionListCommandView);
        
        // show the collection view
        this.coreDocumentVersionListLayout.list.show(this.coreDocumentVersionListCollectionView);
        
        // show the pagination view
        this.coreDocumentVersionListLayout.pagination.show(this.coreDocumentVersionListPaginationView);
        
        // reflow foundation
		$(document).foundation('reflow');
    },
    
    createDocumentVersion: function() {
        // clear any errors
        WMAPP.Helper.clearErrors('CoreDocument');

        // get the model to duplicate
        if (this.document.get('_versions').size() > 0) {
        	var duplicate = this.document.get('_versions').last();
        } else {
        	var duplicate = this.document;
        }
        
        var model = duplicate.clone();
        
        // update the url
        var modelUrl = model.getUrl();            
        model.url = modelUrl + '/' + model.get('id');
        
        // validate the model
        model.set('version', parseInt(model.get('version')) + 1);
        model.set('published', 0);
        model.set('instance_id', this.document.get('id'));
        
        // unset the id
        model.unset('id');
        model.validate();
        
        if (model.isValid()) {
        	var that = this;
        
            // add to collection, which saves to server automatically if it passes validation
            var model = this.documentVersionPageableCollection.create(model, {
                success: function(model, response) {
                    // display flash message
            		WMAPP.Helper.showMessage('success', 'The document version has been saved.');
            		
		  			// TODO Custom code for creation for document create version
					// And here	                		
                		
                	// list the documents
                	that.listDocumentVersions(that.document.get('id'));
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
                },
            });
        }

        WMAPP.Helper.wmAjaxEnd();            
    },        
    
    publishDocumentVersion: function(model) {
        // clear any errors
        WMAPP.Helper.clearErrors('ReferenceDocument'); 
        model.set('published', 1);
        
        // redirect to the list if successful
        this.listenTo(WMAPP.vent, 'core:edit:document:success', function(model) { this.listDocumentVersions(model.get('instance_id')); });             
        
		// call the edit method
        this.edit(model);
        
        WMAPP.Helper.wmAjaxEnd(); 
    },   
    
    deleteDocumentVersion: function(model) {
    	
   		// clear any messages
   		WMAPP.Helper.hideMessage();          
        
        if (this.deleteDocumentModel(model)) {            
            // redirect to the list
            this.listDocumentVersions(this.document.get('id'));
        }        	
    },  

	showDocumentSubmissions: function(DocumentId) {
		
		this.router.navigate('documents/submissions/' + DocumentId);
        
        // set the id
        this.DocumentId = DocumentId;
        
   		// clear any messages
   		WMAPP.Helper.hideMessage();        

        // get the entry?
        this.document = new WMAPP.Core.Model.Document();
        this.document.set({id: DocumentId});
        var documentUrl = this.document.getUrl();
        this.document.url = documentUrl + '/' + DocumentId + '?expand=all';                
        var that = this;
        this.document.fetch().done(function() {            

            that.coreSubmissionCollection = new WMAPP.Core.Model.SubmissionPageableCollection({});
            that.coreSubmissionCollection.queryParams['expand'] = 'all';
        	that.coreSubmissionCollection.queryParams['CoreSubmission_content_area_id'] = that.document.get('content_area_id');
            that.coreSubmissionCollection.fetch().done(function() {
				// --- Command view
	            that.documentSubmissionListCommandView = new WMAPP.Extension.Documents.Admin.View.CoreDocumentSubmissionListCommand({model: that.document});
	            
	            // --- Collection view
	            that.documentSubmissionListCollectionView = new WMAPP.Extension.Documents.Admin.View.CoreDocumentSubmissionList({collection: that.coreSubmissionCollection});
	            
	            // --- Pagination view
	            that.documentSubmissionListPaginationView = new WMAPP.Extension.Documents.Admin.View.CoreDocumentSubmissionListPagination({
	            	collection: that.coreSubmissionCollection
	            });
	
	            // --- Layout
	            that.documentSubmissionListLayout = new WMAPP.Extension.Documents.Admin.View.CoreDocumentSubmissionListLayout();
	
	            // bind events
				that.listenTo(that.documentSubmissionListCommandView, 'trigger:backDocumentSubmissionEventSubmit', that.listDocument);            
				that.listenTo(that.documentSubmissionListCollectionView, 'childview:trigger:deleteDocumentSubmission', function(childView, model) { that.deleteDocumentSubmission(model) });
				that.listenTo(that.documentSubmissionListCommandView, 'trigger:deleteDocumentSubmissionMultiple', that.deleteDocumentSubmissionMultiple);
				that.listenTo(that.documentSubmissionListCollectionView, 'childview:trigger:viewDocumentSubmission', function(childView, model) { that.viewDocumentSubmission(model.get('id')) });
	
	            /**
	             * Render Views
				*/
	            // Show the layout in the tile region
	            that.tileRegion.show(that.documentSubmissionListLayout);
	
	            // show the command view
	            that.documentSubmissionListLayout.command.show(that.documentSubmissionListCommandView);
	            
	            // show the collection view
	            that.documentSubmissionListLayout.content.show(that.documentSubmissionListCollectionView);
	            
	            // show the pagination view
	            that.documentSubmissionListLayout.pagination.show(that.documentSubmissionListPaginationView);
	            
				// reflow foundation
				$(document).foundation('reflow'); 	            
            });
		});    
    },
    
	viewDocumentSubmission: function(SubmissionId) {
		
		this.router.navigate('documents/submission_datas/' + SubmissionId);

        // get the entry?
        if (!this.coreSubmissionCollection || this.coreSubmissionCollection.length === 0) {
            this.coreSubmission = new WMAPP.Core.Model.Submission({id: SubmissionId});
            var coreSubmissionUrl = this.coreSubmission.getUrl();
            this.coreSubmission.url = coreSubmissionUrl + '/' + SubmissionId + '?expand=all|plainhtml';                
            this.coreSubmission.fetch();
        } else {
            this.coreSubmission = this.coreSubmissionCollection.get(SubmissionId);
            if (!this.coreSubmission.get('plainhtml')) {
                this.coreSubmission = new WMAPP.Core.Model.Submission({id: SubmissionId});
                var coreSubmissionUrl = this.coreSubmission.getUrl();
                this.coreSubmission.url = coreSubmissionUrl + '/' + SubmissionId + '?expand=all|plainhtml';                
                this.coreSubmission.fetch();                	
            }                
        }                   	
    	
        // --- Command view
        this.documentSubmissionDataListCommandView = new WMAPP.Extension.Documents.Admin.View.CoreDocumentSubmissionDataListCommand({model: this.coreSubmission});
        
        // --- Collection view
        this.documentSubmissionDataListHtmlView = new WMAPP.Extension.Documents.Admin.View.CoreDocumentSubmissionDataListHtml({ model: this.coreSubmission });       
        
        // --- Layout
        this.documentSubmissionDataListLayout = new WMAPP.Extension.Documents.Admin.View.CoreDocumentSubmissionDataListLayout();

        // bind events
        this.listenTo(this.documentSubmissionDataListCommandView, 'trigger:backDocumentSubmissionDataEventSubmit', function(model) { if (this.document.get('id')) { this.showDocumentSubmissions(this.document.get('id')); } else { this.listDocument(); } });
        
        /**
         * Render Views
		*/
        // Show the layout in the tile region
        this.tileRegion.show(this.documentSubmissionDataListLayout);

        // show the command view
        this.documentSubmissionDataListLayout.command.show(this.documentSubmissionDataListCommandView);
        
        // show the collection view
        this.documentSubmissionDataListLayout.content.show(this.documentSubmissionDataListHtmlView);
        
		// reflow foundation
		$(document).foundation('reflow');
        
    },   

	deleteDocumentSubmission: function(model) {
    
   		// clear any messages
   		WMAPP.Helper.hideMessage();          

        this.deleteDocumentSubmissionProcess(model);        
    },
    
    deleteDocumentSubmissionProcess: function(model) {

        // remove from collection. See http://backbonejs.org/#Model-destroy
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
        	WMAPP.Helper.showMessage('success', 'The document has been deleted.');
        });
    },  
    
    deleteDocumentSubmissionMultiple: function(ids) {
    
        // clear any messages
   		WMAPP.Helper.hideMessage();  
    
    	this.coreSubmissionCollection.url = this.coreSubmissionCollection.getUrl();
        var result = this.coreSubmissionCollection.deleteMultiple(ids);
          
        if (result.success) {    
        	WMAPP.Helper.showMessage('success','Submission/s deleted');
                
            // redirect to the list
            this.showDocumentSubmissions(this.DocumentId);               	
        } else {
        	WMAPP.Helper.showMessage('alert',result.message);
        }            
    },

    deleteDocument: function(model) {
    
   		// clear any messages
   		WMAPP.Helper.hideMessage();          
    
        // redirect to the list if successful
        this.listenTo(WMAPP.vent, 'core:delete:document:success', this.deletePostProcess);          

        this.deleteDocumentModel(model);        
    },
    
    deletePostProcess: function() {
        // redirect to the list
        this.listDocument();        
    },
    
    deleteDocumentModel: function(model) {

        // remove from collection. See http://backbonejs.org/#Model-destroy
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
        	WMAPP.Helper.showMessage('success', 'The document has been deleted.');
        	
			// redirect to the list if successful
			WMAPP.vent.trigger('core:delete:document:success'); 
        });
    },

    deleteDocumentMultiple: function(ids) {
    
        // clear any messages
   		WMAPP.Helper.hideMessage();  
    
    	this.documentPageableCollection.url = this.documentPageableCollection.getUrl();
        var result = this.documentPageableCollection.deleteMultiple(ids);
          
        if (result.success) {    
        	WMAPP.Helper.showMessage('success','Document/s deleted');
                
            // redirect to the list
            this.listDocument();               	
        } else {
        	WMAPP.Helper.showMessage('alert',result.message);
        }            
    },
}));

WMAPP.module('Extension.Documents.Admin.View', function(View) {

	 View.CoreDocumentListLayout = WMAPP.Extension.View.LayoutView.extend({
	        initialize: function() {
				if (WMAPP.isApp) {
					WMAPP.setTitle('Documents');
				}
				WMAPP.Extension.View.LayoutView.prototype.initialize.call(this);
			},
	        template: function() {
				var tmplStr = '<fieldset>' +
				'<legend>Documents</legend>' +
				'<div class="wmapp-core-document-list-commands"></div>' +
				'<div class="wmapp-core-document-list-content"></div>' +
				'<div class="wmapp-core-document-list-pagination"></div>';
				tmplStr += '</fieldset>';       
				return tmplStr;
	        },
	        regions: {
	        	command: '.wmapp-core-document-list-commands',
	            list: '.wmapp-core-document-list-content',
	            pagination: '.wmapp-core-document-list-pagination',
	        },
	        onClose: function() {
	        	
	        },
	    });

	    View.CoreDocumentListPagination = WMAPP.Extension.View.PaginationView.extend({

	    });

	    /* view for the commands area above the list */
	    View.CoreDocumentListCommand = WMAPP.Extension.View.ItemView.extend({
	        template: function() {
				var tmplStr = '<div style="padding-bottom: 10px;" class="wmapp-commands clearfix"><ul class="button-group wmapp-button-group-spaced" style="display:inline-block">';
				if (!WMAPP.isApp || WMAPP.isApp && WMAPP.isOnline) {
					tmplStr += '<li><a class="wmapp-create-button button success small">Create Document</a></li>';
					tmplStr += '<li><a class="wmapp-delete-multiple-button button alert small" title="Are you sure you want to delete this Document(s)?">Delete Document(s)</a></li>';
				}
				tmplStr += '</ul><a class="wmapp-back-button button small right">Back</a></div>';
				return tmplStr;        
	        },
	        className: 'wmapp-core-document-list-commands',
	        events: {
	            "click .wmapp-create-button": "onCreate",
	            "click .wmapp-delete-multiple-button": "onDeleteMultiple",
	            "click .wmapp-back-button": "onBack",   
	        },
	        onBack: function(e) {
	        	e.preventDefault();
	        	e.stopPropagation();   
	        	this.trigger('trigger:backDocumentEvent', this.model);
	        }, 		            		
	        onCreate: function() {
	        	this.trigger('trigger:createDocumentEvent');
	        },  
	        onDeleteMultiple: function(e) {
	        	var array = new Array();
	        	$('input:checkbox:checked.wmapp-select-all-input').each(function() {
	        		array.push($(this).val());
	        	});
	        	
	        	if (array.length == 0) {
	        		alert('Please select at least one Document');
	        	} else {
	            	if (confirm(e.target.title)) {
	            		this.trigger('trigger:deleteDocumentMultiple', array);
	            	}        		
	        	}
	        },
	    });
	    View.CoreDocumentListItem = WMAPP.Extension.View.ItemView.extend({
	    	tagName: 'tr',
	    	template: function(data) {
	    		var model = data.model;
	    		var options = data.options;
	    		var tmplStr = '';
				tmplStr += '<td data-th="Name: ">' + model.get('name') + '</td>';
				// TODO Custom column rows for document
				// And here
				tmplStr += '<td style="text-align: right"><ul class="button-group">';
			   	tmplStr += '<li><a class="wmapp-edit-button button small" data-id="' + model.get('id') + '">Edit</a></li></li>'; 
				tmplStr += '<li><a class="wmapp-view-submissions-button button small" data-id="' + model.get('id') + '">View Submissions</a></li>';
				tmplStr += '<li><a class="wmapp-versions-button button small" data-id="' + model.get('id') + '">Versions</a></li>';
				// <protected> TODO: add code for custom row buttons here
				// </protected>
				tmplStr += '<li><a class="wmapp-delete-button button small" data-id="' + model.get('id') + '" title="Are you sure you want to delete this Document?">Delete</a></li>';	
				tmplStr += '</ul></td>';
		if (!WMAPP.isApp || WMAPP.isApp && WMAPP.isOnline) {
				tmplStr += '<td style="text-align: center; width:100px" data-th="Select: ">';
				tmplStr += '	<input type="hidden" value="0" name="data[multiple]">';
				tmplStr += '	<input type="checkbox" value="' + model.get('id') + '" class="wmapp-select-all-input" name="data[multiple]">';
				tmplStr += '</td>';
		}
	    		return tmplStr;
	    	},
			templateHelpers: function(){
				return {
					model: this.model,
					options: this.options
				}
			},      	
	    	events: {
	    		"click .wmapp-edit-button": "onEdit",
				"click .wmapp-view-submissions-button": "onViewSubmissions",
	        	"click .wmapp-versions-button": "onVersions",
	    		"click .wmapp-delete-button": "onDelete",
				// TODO Custom events for Document between here
				// And here	   
	    	},      	
	        onEdit: function(e) {
	        	e.preventDefault();
	        	e.stopPropagation();
	        	this.trigger('trigger:showEditDocument', this.model);
	        },
	        onVersions: function(e) {
	        	e.preventDefault();
	        	e.stopPropagation();
	        	this.trigger('trigger:showVersionsDocument', this.model);
	        },
	        onDelete: function(e) {
	        	e.preventDefault();
	        	e.stopPropagation();
	        	if (confirm(e.target.title)) {
	        		this.trigger('trigger:deleteDocument', this.model);
	        	}
	        },
	        onViewSubmissions: function(e) {
	        	e.preventDefault();
	        	e.stopPropagation();
	        	WMAPP.Helper.wmAjaxStart($(e.target));
	        	this.trigger('trigger:showDocumentSubmissions', this.model);
	        }, 
			// TODO Custom functions for Document between here
			// And here	
	    });
	    
	    View.CoreDocumentList = WMAPP.Extension.View.CompositeView.extend({
	    	initialize: function() {
	    		this.listenTo(this.collection, 'sync', this.render);
	    	},    
	    	template: function() {
				var tmplStr = '<thead>';
					tmplStr += '<tr>';
						tmplStr += '<th class="wmapp-admin-sort" data-sort-key="CoreDocument.name">Name</th>';
						// TODO Custom column headings for document
						// And here	
						tmplStr += '<th class="">Commands</th>';
				if (!WMAPP.isApp || WMAPP.isApp && WMAPP.isOnline) {
						tmplStr += '<th style="text-align: center" width="100px">';
						tmplStr += '	Select All ';
						tmplStr += '	<input type="hidden" value="0" id="wmappSelectAll_" name="data[select_all]">';
						tmplStr += '	<input class="wmapp-select-all input-text medium input-text" type="checkbox" value="1" name="data[select_all]">';
						tmplStr += '</th>';
				}
					tmplStr += '</tr>';
				tmplStr += '</thead>';
				tmplStr += '<tbody>';
				tmplStr += '</tbody>';  
				return tmplStr;  	
	    	},
	    	tagName: "table",
	    	className: "wmapp-table",
	    	id: "thisId",
	    	childView: View.CoreDocumentListItem,
	    	childViewContainer: "tbody",
	    	ui: {
	    		columnHeaders: "th.wmapp-admin-sort"
	    	},
	    	events: {
	    		"click th.wmapp-admin-sort": "onSort",
	    		"click .wmapp-select-all": "onSelectAll",
	    	},
	    	onSort: function(e) {
	    		var th = $(e.target);
	    		var sortKey = $(e.target).data('sort-key');
	    		var sortOrder = (this.collection.state.sortKey == sortKey) ? -((this.collection.state.order*(-1)+2)%3-1) : -1;
	    		if(sortOrder != 0) {
	    			this.collection.setSorting(sortKey, sortOrder);
	    		} else {
	    			this.collection.setSorting(null, -1);
	    		}
	    		this.collection.getFirstPage({reset:true});
	    	},
	    	onRenderCollection: function(){ // Marionette built-in callback
	    		var collection = this.collection;
	    		$.each(this.ui.columnHeaders, function(k,colHeader){
	    			$(colHeader).removeClass("sort_desc").removeClass("sort_asc");
	    			if(collection.state && collection.state.sortKey == $(colHeader).data('sort-key')) {
	    				$(colHeader).addClass((collection.state.order > 0) ? "sort_desc" : "sort_asc");
	    			}
	    		});
	    	},
	        onSelectAll: function(e) {
	        	if ($(e.target).prop('checked')) {
	        		$(".wmapp-select-all-input").prop("checked", true);
	        	} else {
	        		$(".wmapp-select-all-input").prop("checked", false);
	        	}
	        	return true;
	        }
	    });
		View.CoreDocumentCapabilitiesList = WMAPP.Extension.View.ItemView.extend({
			className: 'wmapp-core-document-list-capabilities',
			template: function() {
				var tmplStr = '<ul class="button-group">';
				if (!WMAPP.isApp || WMAPP.isApp && WMAPP.isOnline) {
				}
				tmplStr += '</ul>';
				return tmplStr;  
			},
			
	        events: {
	    	},
	    	
		});


		View.CoreDocumentListFilterBar = WMAPP.Extension.View.ItemView.extend({
	    	tagName: 'div',
	    	template: function(data) {
	    		var model = data.model;
	    		var options = data.options;
	    		var tmplStr = '<ul class="button-group">';
	    		tmplStr += '<li><button type="button" class="wmapp-search-button button">Search</button></li>';
				tmplStr += '<li><button type="button" class="wmapp-search-reset-button button">Reset</button></li>';
				tmplStr += '</ul>';
	    		return tmplStr;
	    	},
			templateHelpers: function(){
				return {
					model: this.model,
					options: this.options
				}
			},      	
	    	events: {
	    		"click .wmapp-search-button": "onSearch",
	    		"click .wmapp-search-reset-button": "onSearchReset",
				// TODO Custom events for Document between here
				// And here	   
	    	}, 
	    	onSearch: function(e) {
	    		var onSearchMethod = function(e, context) {
		        	e.preventDefault();
		        	e.stopPropagation();
		        	context.trigger('trigger:searchDocumentEvent', context.model);
		        };
		        if (window.click && WMAPP.isApp) {
		        	window.click(e, this, onSearchMethod);
		        } else {
		        	onSearchMethod(e, this);
		        }
	        },
	        onSearchReset: function(e) {
	        	var onSearchReset = function(e, context) {
		        	e.preventDefault();
		        	e.stopPropagation();
		        	this.model.set(this.model.defaults);
		        	this.trigger('trigger:showListDocument', this.model);
	        	};
	        	if (window.click && WMAPP.isApp) {
		        	window.click(e, this, onSearchReset);
		        } else {
		        	onSearchReset(e, this);
		        }
	        },
			// TODO Custom functions for Document between here
			// And here	
	    });  

	    View.CoreDocumentListFilter = WMAPP.Extension.View.LayoutView.extend({
			template: function(data) {
				var model = data.model;
				var options = data.options;
				var tmplStr = '';
				tmplStr = '<div style="width:100%; float:left">';
				tmplStr += '<button type="button" class="wmapp-search-button button">Go</button>' +
							'<button type="button" class="wmapp-search-reset-button button">Reset</button>' +
							'</div>';
				return tmplStr;
			},
			templateHelpers: function(){
				return {
					model: this.model,
					options: this.options
				}
			}, 
	    	regions: function() {
	    		var regions = {};
	    	 

				return regions;
	    	},		      
	        className: 'wmapp-search-filter core-document',
	        events: {
	            "click .wmapp-search-reset-button": "onSearchReset",
	            "click .wmapp-search-button": "onSearch"
	        },
	    	onSearch: function(e) {
	        	e.preventDefault();
	        	e.stopPropagation();
	        	this.trigger('trigger:showListDocument', this.model);
	        },
	        onSearchReset: function(e) {
	        	e.preventDefault();
	        	e.stopPropagation();
	        	this.model.set(this.model.defaults);
	        	this.trigger('trigger:showListDocument', this.model);
	        },
	        onShow: function() {
	        
	        	
	        	 // show the fields of the filter

	        	$(document).foundation('reflow');
	        }
	    });   


	    View.CoreDocumentCreate = WMAPP.Extension.View.LayoutView.extend({
	        initialize: function() {
				if (WMAPP.isApp) {
					WMAPP.setTitle("Create Document");
				}
				WMAPP.Extension.View.LayoutView.prototype.initialize.call(this);
			},
	        template: function(data) {
	        	var model = data.model;
	        	var options = data.options;
	        	var tmplStr = '';
				tmplStr += '<input type="hidden" name="locale" id="wmappSetLocale" value="en" class="input-text medium input-text">';
				tmplStr += '	<div class="wmapp-form">';
				tmplStr += '		<div class="wmapp-core-document-create-name"></div>';
				tmplStr += '		<div class="wmapp-core-document-create-description"></div>';
				tmplStr += '		<div class="wmapp-core-document-create-icon"></div>';
				tmplStr += '		<div class="wmapp-core-document-create-entity_name"></div>';
				tmplStr += '		<div class="wmapp-core-document-create-tabular_pdf"></div>';
				tmplStr += '		<fieldset id="CoreDocumentEmailSettings">';
				tmplStr += '			<legend>Email Settings</legend>';
				tmplStr += '			<div>';
				tmplStr += '				<div class="wmapp-core-document-create-email"></div>';
				tmplStr += '				<div class="wmapp-core-document-create-auto_response_email"></div>';
				tmplStr += '				<div class="wmapp-core-document-create-email_id"></div>';
				tmplStr += '				<div class="wmapp-core-document-create-email_question"></div>';
				tmplStr += '			</div>';
				tmplStr += '		</fieldset>';
				// TODO Custom create field divs document
				// And here     		
				tmplStr += '	</div>';
				tmplStr += '	<ul class="button-group wmapp-button-group-spaced"><li><button type="button" class="wmapp-submit-button wymupdate js-trigger-pepperbox">Save Document</button></li>';
				// TODO Custom add buttons lease_log
				// And here  	
				tmplStr += '	<li><button type="button" class="wmapp-cancel-button alert">Cancel</button></li></ul>';
				return tmplStr;     	
	        },
	        regions: {
				nameField: '.wmapp-core-document-create-name',
				descriptionField: '.wmapp-core-document-create-description',
				iconField: '.wmapp-core-document-create-icon',
				entityNameField: '.wmapp-core-document-create-entity_name',
				tabularField: '.wmapp-core-document-create-tabular_pdf',
				emailField: '.wmapp-core-document-create-email',
				autoResponseEmailField: '.wmapp-core-document-create-auto_response_email',
				emailIdField: '.wmapp-core-document-create-email_id',
				emailQuestionField: '.wmapp-core-document-create-email_question',
				//TODO Custom regions for document create		
				// And here 	
	        },
	        className: 'wmapp-core-document-create',
	        events: {
	            "click .wmapp-submit-button": "onSubmit",
	            "click .wmapp-cancel-button": "onCancel",          
	        },
	        ui: {
	        	form : '#CoreDocument'
	        },
			templateHelpers:function(){
				return {
					model: this.model,
					options: {
						label: this.options.label,
					}
				}
			},          
	        onSubmit: function(e) {
	        	WMAPP.Helper.wmAjaxStart($(e.target));
	        	
		
		
	        	// trigger the create document event in the application
	        	this.triggerDelayed('trigger:createDocumentEventSubmit', this.model);
	        },
	        onCancel: function() {
	        	// trigger the cancel document event in the application
	        	this.triggerDelayed('trigger:createDocumentEventCancel', this.model);
	        },              
	    }); 



	 
	    View.CoreDocumentEdit = WMAPP.Extension.View.LayoutView.extend({
	    	initialize: function() {
				if (WMAPP.isApp) {
					WMAPP.setTitle("Edit Document");
				}
				WMAPP.Extension.View.LayoutView.prototype.initialize.call(this);
			},
	        template: function(data) {
	        	var model = data.model;
	        	var options = data.options;
	        	var tmplStr = '';
				tmplStr += '<input name="id" id="CoreDocumentId" type="hidden" value="' + model.get('id') + '"/>';
				tmplStr += '<input type="hidden" name="locale" id="wmappSetLocale" value="en" class="input-text medium input-text">';
				tmplStr += '	<div class="wmapp-form">';
				tmplStr += '		<div class="wmapp-core-document-edit-name"></div>';
				tmplStr += '		<div class="wmapp-core-document-edit-description"></div>';
				tmplStr += '		<div class="wmapp-core-document-edit-icon"></div>';
				tmplStr += '		<div class="wmapp-core-document-edit-entity_name"></div>';
				tmplStr += '		<div class="wmapp-core-document-edit-tabular_pdf"></div>';
				tmplStr += '		<fieldset id="CoreDocumentEmailSettings">';
				tmplStr += '			<legend>Email Settings</legend>';
				tmplStr += '			<div>';		
				tmplStr += '				<div class="wmapp-core-document-edit-email"></div>';
				tmplStr += '				<div class="wmapp-core-document-edit-auto_response_email"></div>';
				tmplStr += '				<div class="wmapp-core-document-edit-email_id"></div>';
				tmplStr += '				<div class="wmapp-core-document-edit-email_question"></div>';
				tmplStr += '			</div>';
				tmplStr += '		</fieldset>';
				// TODO Custom edit field divs document
				// And here  		
				tmplStr += '	</div>';	
				tmplStr += '	<ul class="button-group wmapp-button-group-spaced"><li><button type="button" class="wmapp-submit-button wymupdate js-trigger-pepperbox">Save Document</button></li>';
				// TODO Custom add buttons lease_log
				// And here  	
				tmplStr += '	<li><button type="button" class="wmapp-cancel-button alert">Cancel</button></li></ul>';	
				return tmplStr;
	        },
	        regions: {
				nameField: '.wmapp-core-document-edit-name',
				descriptionField: '.wmapp-core-document-edit-description',
				iconField: '.wmapp-core-document-edit-icon',
				entityNameField: '.wmapp-core-document-edit-entity_name',
	  			tabularField: '.wmapp-core-document-edit-tabular_pdf',
				emailField: '.wmapp-core-document-edit-email',
				autoResponseEmailField: '.wmapp-core-document-edit-auto_response_email',
				emailIdField: '.wmapp-core-document-edit-email_id',
				emailQuestionField: '.wmapp-core-document-edit-email_question',
	    		//TODO Custom regions for document edit		
				// And here 	
	        },
	        className: 'wmapp-core-document-edit',
	        events: {
	            "click .wmapp-submit-button": "onSubmit",
	            "click .wmapp-cancel-button": "onCancel",
	        },
	        ui: {
	        	form : '#CoreDocument'
	        },   
	        templateHelpers:function(){
				return {
					model: this.model,
					options: {
						label: this.options.label,
					}
				}
			},  
	        onSubmit: function(e) {
	        	WMAPP.Helper.wmAjaxStart($(e.target));
	        	
		
				
	        	// trigger the edit document event in the application
	        	this.triggerDelayed('trigger:editDocumentEventSubmit', this.model);
	        },
	        onCancel: function() {
	        	// trigger the cancel document event in the application
	        	this.triggerDelayed('trigger:editDocumentEventCancel', this.model);
	        },
	    });
	  





	    View.CoreDocumentVersionListLayout = WMAPP.Extension.View.LayoutView.extend({
	        template: function() {
				var tmplStr = '<div class="wmapp-core-document-list-version-filter"></div>' +
				'<fieldset>' +
				'<legend>Documents</legend>' +
				'<div class="wmapp-core-document-list-version-commands"></div>' +
				'<div class="wmapp-core-document-list-version-content"></div>' +
				'<div class="wmapp-core-document-list-version-pagination"></div>' +
				'</fieldset>';       
				return tmplStr;
	        },
	        regions: {
	        	filter: '.wmapp-core-document-list-version-filter',
	        	command: '.wmapp-core-document-list-version-commands',
	            list: '.wmapp-core-document-list-version-content',
	            pagination: '.wmapp-core-document-list-version-pagination'        	
	        },
	        onClose: function() {
	        	
	        },
	    });

	    View.CoreDocumentVersionListPagination = WMAPP.Extension.View.PaginationView.extend({

	    });

	    /* view for the commands area above the list */
	    View.CoreDocumentVersionListCommand = WMAPP.Extension.View.ItemView.extend({
	        template: function(data) {
	        	var model = data.model;
	        	var collection = data.collection;        
	        
	        	// check if we have an unpublished version
	        	var unpublished = _.find(collection.models, function(model) {
	        		return (model.get('published') == '0' && model.get('instance_id') != '0');
	        	});       	
	        	
				var tmplStr = '<div style="padding-bottom: 10px;"  class="wmapp-commands clearfix"><ul class="button-group wmapp-button-group-spaced" style="display:inline-block;">' +
					'<li><a class="wmapp-create-version-button button success ' + ((unpublished) ? ' disabled' : '') + ' small">Create Document Version</a></li>' +
				'</ul><a class="wmapp-back-button button small right">Back</a></div>';  
				return tmplStr;      
	        },
	        className: 'wmapp-core-document-list-commands',
	        events: {
	        	"click .wmapp-create-version-button": "onCreateVersion", 
				"click .wmapp-back-button": "onBack",   
	        },
			templateHelpers:function(){
				return {
					model: this.model,
					collection: this.collection, 
				}
			},         
	        onCreateVersion: function(e) {
	        	if (!$(e.target).hasClass('disabled')) {
	        		this.trigger('trigger:createDocumentVersionEvent');
	        	}
	        },  
	        onBack: function(e) {
	        	e.preventDefault();
	        	e.stopPropagation();   
	        	this.trigger('trigger:backDocumentVersionEvent', this.model);
	        }, 	
			initialize: function(){
				if(this.collection) {
					this.listenTo(this.collection, 'sync', this.render);
					this.listenTo(this.collection, 'add', this.render);
	                this.listenTo(this.collection, 'reset', this.render);
				}			
			},  	    
	    });

	    View.CoreDocumentVersionListItem = WMAPP.Extension.View.ItemView.extend({
	    	tagName: 'tr',
	    	template: function (data) {
	    		var model = data.model;
	    		var tmplStr = '';
	    		tmplStr += '<td>' +  model.get('version')  + '</td>';
				tmplStr += '<td>' +  model.get('name')  + '</td>';
				//<!-- TODO Custom column rows for document -->
		 
				//<!-- And here -->
				tmplStr += '<td style="text-align: right"><ul class="button-group">';

				if (model.get('published') == '0') {
					tmplStr += '<li><a class="wmapp-publish-button button small" href="#" data-id="' +  model.get('id')  + '" title="Are you sure you want to publish this Document?">Publish</a></li>';
					tmplStr += '<li><a class="wmapp-edit-content-button button small edit" href="/admin/core/coredocument/edit_document_content/' +  model.get('id')  + '" data-id="' +  model.get('id')  + '">Edit Questions</a></li>';			 
					//<protected> TODO: add code for custom row buttons here
	    
					//</protected>
					tmplStr += '<li><a class="wmapp-delete-button button small" data-id="' +  model.get('id')  + '" title="Are you sure you want to delete this Document?">Delete</a></li>';
				} else {
					tmplStr += '<li><a class="wmapp-download-button button small" target="blank" href="/site/files/Core/' + WMAPP.Helper.tableName(model.get('name')) + '-' + String("000" + model.get('version')).slice(-3) + '.pdf" data-id="' +  model.get('id')  + '">Download</a></li>';
				}
				tmplStr += '</ul></td>';
				return tmplStr; 	
	    	},
	    	events: {
				"click .wmapp-publish-button": "onPublishVersion",
	    		"click .wmapp-delete-button": "onDeleteVersion",
	    	},
			templateHelpers:function(){
				return {
					model: this.model,    	
				}
			}, 
	        onDeleteVersion: function(e) {
	        	e.preventDefault();
	        	e.stopPropagation();
	        	if (confirm(e.target.title)) {
	        		this.trigger('trigger:deleteDocumentVersion', this.model);
	        	}
	        },     
	        onPublishVersion: function(e) {
	        	e.preventDefault();
	        	e.stopPropagation();
	        	if (confirm(e.target.title)) {
	        		WMAPP.Helper.wmAjaxStart($(e.target));
	        		this.triggerDelayed('trigger:publishDocumentVersion', this.model);
	        	}
	        },     
	    });
	    
	    View.CoreDocumentVersionList = WMAPP.Extension.View.CompositeView.extend({
	    	tagName: "table",
	    	className: "wmapp-table",
	    	id: "thisId",
	    	template: function() {
				var tmplStr = '<thead>' +
					'<tr>' +
						'<th class="wmapp-admin-sort" data-sort-key="CoreDocument.version">Version</th>' +
						'<th class="wmapp-admin-sort" data-sort-key="CoreDocument.name">Name</th>' +
						'<!-- TODO Custom column headings for document -->' +
				 
						'<!-- And here -->' +	
						'<th class="">Commands</th>' +
					'</tr>' +
				'</thead>' +
				'<tbody>' +
				'</tbody>';
				return tmplStr;    	
	    	},
	    	childView: View.CoreDocumentVersionListItem,
	    	childViewContainer: "tbody",
	    	ui: {
	    		columnHeaders: "th.wmapp-admin-sort"
	    	},
	    	events: {
	    		"click th.wmapp-admin-sort": "onSort",
	    		"click .wmapp-select-all": "onSelectAll",
	    	},
	    	onSort: function(e) {
	    		var th = $(e.target);
	    		var sortKey = $(e.target).data('sort-key');
	    		var sortOrder = (this.collection.state.sortKey == sortKey) ? -((this.collection.state.order*(-1)+2)%3-1) : -1;
	    		if(sortOrder != 0) {
	    			this.collection.setSorting(sortKey, sortOrder);
	    		} else {
	    			this.collection.setSorting(null, -1);
	    		}
	    		this.collection.getFirstPage({reset:true});
	    	},
	    	onRenderCollection: function(){ // Marionette built-in callback
	    		var collection = this.collection;
	    		$.each(this.ui.columnHeaders, function(k,colHeader){
	    			$(colHeader).removeClass("sort_desc").removeClass("sort_asc");
	    			if(collection.state.sortKey == $(colHeader).data('sort-key')) {
	    				$(colHeader).addClass((collection.state.order > 0) ? "sort_desc" : "sort_asc");
	    			}
	    		});
	    	},
	        onSelectAll: function(e) {
	        	if ($(e.target).prop('checked')) {
	        		$(".wmapp-select-all-input").prop("checked", true);
	        	} else {
	        		$(".wmapp-select-all-input").prop("checked", false);
	        	}
	        	return true;
	        }
	    });



	    View.CoreDocumentTableItem = WMAPP.Extension.View.LayoutView.extend({
	    	tagName: 'div',
	    	template: function(data) {
	    		var options = data.options;
	    		var model = data.model;
	    		
	    		var _tmplStr = '<ul class="small-block-grid-1" id="' + options.parentLayoutId + options.fieldId + '">';
				_tmplStr += '<li><div class="wmapp-core-document-table-name"></div></li>';
				_tmplStr += '<li><div class="wmapp-core-document-table-description"></div></li>';
				//<!-- TODO Custom column rows for Documents -->
				//<!-- end here -->	
				
				if (options.create || !options.readonly) {
					_tmplStr += '<li class="text-center">' +
					'<a class="wmapp-delete-button button small alert" data-id="' + model.id + '" title="Are you sure you want to delete this Document?"><i class="fa fa-times"></i></a>'; 
	    			//<!-- <protected> TODO: add code for custom row buttons here -->    
	    			//<!-- </protected> -->
					_tmplStr += '</li>';		
				}
				_tmplStr +=  '</ul>';
				return _tmplStr;
	    	},
			templateHelpers: function(){
				return {
					model: this.model,
					options: this.options
				}
			},    	
	        regions: {
				nameField: '.wmapp-core-document-table-name',
				descriptionField: '.wmapp-core-document-table-description',
		
				// TODO Custom field/s for document Item
				// And here	
	        },
			initialize: function(options) {
				this.options = _.extend(this.options, options.options);
				this.options.layoutId = 'CoreDocument';
				if (this.model) {
					Backbone.Validation.bind(this);
				}
			},        
	        onRender: function() {
		
				// options for true false collection
				var trueFalseCollection = new Backbone.Collection([
					{value: '1', option: 'True'},
					{value: '0', option: 'False'},
				]);	       
	        

	            // Name TextField for document create
	            var coreDocumentName = new WMAPP.Extension.View.TextField({
	                model: this.model,
	                fieldId: 'CoreDocumentName' + this.model.cid,
	                fieldClass: '',
					fieldType: 'text',		
	                placeholder: 'Name',
	                label: 'Name',
	                name: 'name',
	                tooltip: 'The name of the Safety Document',
					maxlength: 255,
					readonly: this.options.readonly,		
	            });


	            // Description TextArea for document create
	            var coreDocumentDescription = new WMAPP.Extension.View.TextArea({
	                model: this.model,
	                fieldId: 'CoreDocumentDescription' + this.model.cid,
	                fieldClass: '',
					fieldType: 'text',		
	                placeholder: 'Description',
	                label: 'Description',
	                name: 'description',
	                tooltip: 'A general description for the document',
					maxlength: 1024,
					readonly: this.options.readonly,		
	            });



				
				// TODO Custom fields for document - declaration
				// And here

				// the count of fields plus the commands
				var cols = 3;	

				this.nameField.show(coreDocumentName);
				this.descriptionField.show(coreDocumentDescription);
							
				// TODO Custom field/s for document - item render
				// And here 	
							
				// reflow foundation
				$(document).foundation('reflow');
				
				// add the medium grid class to the block grid ul
				if (!this.options.create && this.options.readonly) {
					--cols;
				}			
				this.$el.find('ul.small-block-grid-1').addClass('medium-block-grid-' + cols);			
			},
			triggers: {
				"click .wmapp-delete-button": 'trigger:coreDocumentDeleteTableRow'
			}              
	    });
	    
	    View.CoreDocumentTable = WMAPP.Extension.View.CollectionView.extend({
	    	tagName: "div", 		
	    	childView: View.CoreDocumentTableItem,
	    	initialize: function() {
				if (this.model) {
					Backbone.Validation.bind(this);
				}      	
	    		this.on('childview:trigger:coreDocumentDeleteTableRow', this.removeRow);
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
	    			options: this.options
	    		}
	    	},		
	    }); 

	    View.CoreDocumentTableCreate = WMAPP.Extension.View.LayoutView.extend({
			initialize: function() {
				this.options.layoutId = 'CoreDocument';
				if (this.model) {
					Backbone.Validation.bind(this);
				}			
			},       	
	    	template: function(data) {
	    		var options = data.options;
	    		var model = data.model;
	    	
				var _tmplStr = '<ul class="small-block-grid-1" id="' + options.parentLayoutId + options.fieldId + '">';
				_tmplStr += '<li><div class="wmapp-core-document-table-name"></div></li>';
				_tmplStr += '<li><div class="wmapp-core-document-table-description"></div></li>';
				//<!-- TODO Custom columns for Documents -->
				//<!-- end here -->	
				_tmplStr += '<li class="text-center">' +
				'<a class="wmapp-add-button button small edit' + ((model.get('id')) ? ' hide' : '') + '"><i class="fa fa-plus"></i></a>' +
				'<a class="wmapp-clear-button button small secondary' + ((model.get('id')) ? ' hide' : '') + '"><i class="fa fa-minus"></i></a>';
				if (options.singleReference) {
					_tmplStr += '<a class="wmapp-delete-button button small alert' + ((model.get('id')) ? '' : ' hide') + '" title="Are you sure you want to remove this Document?"><i class="fa fa-times"></i></a>';
				}
				_tmplStr += '</li>' +
				'</ul>'; 
				return _tmplStr;   	
	    	},
	        regions: {
				nameField: '.wmapp-core-document-table-name',
				descriptionField: '.wmapp-core-document-table-description',
				// TODO Custom field/s for document Create
				// And here	
	        },
	        events: {
	            "click .wmapp-add-button": "onAdd",
	            "click .wmapp-clear-button": "onClear",
	        	"click .wmapp-delete-button": "onRemove",                   
	        },  
	        options: {
	        	singleReference: false,
	        	showSystemFields: true,
	        	readonly: false,
	        },        
	        onAdd: function() {
	        	// add the model to the collection, and rerender?
	        	this.model.validate();

	        	if (this.model.isValid()) {
	        		if (this.collection !== undefined) {
	            		this.collection.add(this.model.clone());
	            		this.model.clear().set(this.model.defaults);         			
	        		} else {
	        			this.model.set('id', 0);
						this.$el.find('.wmapp-add-button').toggleClass('hide');
						this.$el.find('.wmapp-clear-button').toggleClass('hide');
						this.$el.find('.wmapp-delete-button').toggleClass('hide');
	        		}
	        		
					WMAPP.Helper.clearErrors('CoreDocument'); 
	        	}				

	        },
	        onClear: function() {
	        	// reset the model back to the defaults, but keep the id
	        	var id = this.model.id;
	        	this.model.clear().set(this.model.defaults);
	        	this.model.id = id; 
	        	this.model.set('id', id);
	        },  
	        onRemove: function() {
	        	this.model.clear().set(this.model.defaults);
				this.$el.find('.wmapp-add-button').toggleClass('hide');
				this.$el.find('.wmapp-clear-button').toggleClass('hide');
				this.$el.find('.wmapp-delete-button').toggleClass('hide');   
	        },             
	        onRender: function() {
		
		     	// options for true false collection
				var trueFalseCollection = new Backbone.Collection([
					{value: '1', option: 'True'},
					{value: '0', option: 'False'},
				]);
	        
	            // Name TextField for document create
	            var coreDocumentName = new WMAPP.Extension.View.TextField({
	                model: this.model,
	                fieldId: 'CoreDocumentName',
	                fieldClass: '',
					fieldType: 'text',		
	                placeholder: 'Name',
	                label: 'Name',
	                name: 'name',
	                tooltip: 'The name of the Safety Document',
					maxlength: 255,
	            });
	            		
	            // Description TextArea for document create
	            var coreDocumentDescription = new WMAPP.Extension.View.TextArea({
	                model: this.model,
	                fieldId: 'CoreDocumentDescription',
	                fieldClass: '',
					fieldType: 'text',		
	                placeholder: 'Description',
	                label: 'Description',
	                name: 'description',
	                tooltip: 'A general description for the document',
					maxlength: 1024,
	            });
	            		

				// TODO Custom field/s for document - create declaration
				// And here		

				// the count of fields plus the commands
				var cols = 3;	

				this.nameField.show(coreDocumentName);
				this.descriptionField.show(coreDocumentDescription);
		
	    		// TODO Custom field/s for document - create render
				// And here 	
				
				// reflow foundation
				$(document).foundation('reflow');	
				
				// add the medium grid class to the block grid ul
				this.$el.find('ul.small-block-grid-1').addClass('medium-block-grid-' + cols);	
	        },       
			templateHelpers:function(){
				return {
					model: this.model,
					options: this.options
				}
			},          
	    });
	    
	    View.CoreDocumentTableLayout = WMAPP.Extension.View.LayoutView.extend({
	    	initialize: function() {
	    		// TODO Custom init document - table layout
				// And here 
	    	},
	    	template: function(options) {
				var _tmplStr = '<fieldset>' +
				'<legend>' + options.options.label + '</legend>' +
				'<div class="wmapp-core-document-table-create wmapp-table-create"></div>' +
				'<div class="wmapp-core-document-table-list wmapp-table-list"></div>' +
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
				listField: '.wmapp-core-document-table-list',
				createField: '.wmapp-core-document-table-create',
	        },
	    });  
	    

	    View.CoreDocumentSubmissionListLayout = WMAPP.Extension.View.LayoutView.extend({
			template: function(data){
				var options = data.options;
				var _htmlStr = '<fieldset>' +
				'<legend>Document Submissions</legend>' +
				'<div class="wmapp-core-document-submission-list-commands"></div>' +
				'<div class="wmapp-core-document-submission-list-content"></div>' +
				'<div class="wmapp-core-document-submission-list-pagination"></div>' +
				'</fieldset>';
				
				return _htmlStr;
			},	
	        regions: {
	        	command: '.wmapp-core-document-submission-list-commands',
	        	content: '.wmapp-core-document-submission-list-content',
	            pagination: '.wmapp-core-document-submission-list-pagination'        	
	        }
	    });
	    
	    View.CoreDocumentSubmissionListPagination = WMAPP.Extension.View.PaginationView.extend({

	    }); 
	    
	    /* view for the commands area above the list */
	    View.CoreDocumentSubmissionListCommand = WMAPP.Extension.View.ItemView.extend({
			template: function(data){
				var options = data.options;
		           
				var tmplStr = '<div style="padding-bottom: 10px;" class="wmapp-commands clearfix"><ul class="button-group wmapp-button-group-spaced" style="display:inline-block">';
				tmplStr += '</ul><a class="wmapp-back-button button small right">Back</a></div>';	 				

				return tmplStr;
			},	        
	        className: 'wmapp-core-document-list-commands',
	        events: {
	            "click .wmapp-delete-multiple-button": "onDeleteMultiple",
	            "click .wmapp-back-button": "onBack",
	        },
	        onBack: function(e) {
	        	e.preventDefault();
	        	e.stopPropagation();   
	        	this.trigger('trigger:backDocumentSubmissionEventSubmit', this.model);
	        },  
	        onDeleteMultiple: function(e) {
	        	e.preventDefault();
	        	e.stopPropagation();          
	        	var array = new Array();
	        	$('input:checkbox:checked.wmapp-select-all-input').each(function() {
	        		array.push($(this).val());
	        	});
	        	
	        	if (array.length == 0) {
	        		alert('Please select at least one Document Submission');
	        	} else {
	            	if (confirm(e.target.title)) {
	            		this.trigger('trigger:deleteDocumentSubmissionMultiple', array);
	            	}        		
	        	}
	        },
	    });

	    View.CoreDocumentSubmissionListItem = WMAPP.Extension.View.ItemView.extend({
	    	tagName: 'tr',
			template: function(model){
				var tmplStr = '<td>' + model.id + '</td>' +
				'<td>' + model.created + '</td>' +
				'<td style="text-align: right"><ul class="button-group">' +
				'<li><a class="wmapp-view-button button small edit" data-id="' + model.id + '">View</a></li>';
				if (!model.finished) {
					tmplStr += '<li><a class="wmapp-delete-button button small alert" data-id="' + model.id + '" title="Are you sure you want to delete this submission?">Delete</a></li>';	
				}
				if (!WMAPP.isApp || WMAPP.isApp && WMAPP.isOnline) {
					tmplStr += '<td style="text-align: center; width:100px" data-th="Select: ">';
					tmplStr += '	<input type="hidden" value="0" name="data[multiple]">';
					tmplStr += '	<input type="checkbox" value="' + model.id + '" class="wmapp-select-all-input" name="data[multiple]">';
					tmplStr += '</td>';
				}
				tmplStr += '</ul></td>';  
				return tmplStr;
			},
	    	events: {
	    		"click .wmapp-view-button": "onView",
	    		"click .wmapp-delete-button": "onDelete",
	    	},
	        onDelete: function(e) {
	        	e.preventDefault();
	        	e.stopPropagation();
	        	if (confirm(e.target.title)) {
	        		this.trigger('trigger:deleteDocumentSubmission', this.model);
	        	}
	        },
	        onView: function(e) {
	        	e.preventDefault();
	        	e.stopPropagation();
	        	this.trigger('trigger:viewDocumentSubmission', this.model);
	        },          
			templateHelpers:function(){
				return {
					model: this.model,
				}
			},        
	    });
	    
	    View.CoreDocumentSubmissionList = WMAPP.Extension.View.CompositeView.extend({
	    	tagName: "table",
	    	className: "wmapp-table",
	    	id: "thisId",
			template: function(data){
				var options = data.options;    	
				var tmplStr = '<thead>' +
				'<tr>' +
				'<th class="wmapp-admin-sort" data-sort-key="CoreSubmission.id">Id</th>' +
				'<th class="wmapp-admin-sort" data-sort-key="CoreSubmission.created">Created</th>' +
				'<th class="">Commands</th>';
				if (!WMAPP.isApp || WMAPP.isApp && WMAPP.isOnline) {
					tmplStr += '<th style="text-align: center" width="100px">';
					tmplStr += '	Select All ';
					tmplStr += '	<input type="hidden" value="0" id="wmappSelectAll_" name="data[select_all]">';
					tmplStr += '	<input class="wmapp-select-all input-text medium input-text" type="checkbox" value="1" name="data[select_all]">';
					tmplStr += '</th>';
				}			
				tmplStr += '</tr>' +
				'</thead>' +
				'<tbody>' +
				'</tbody>';  
				return tmplStr;
			},
	    	childView: View.CoreDocumentSubmissionListItem,
	    	childViewContainer: "tbody",
	    	ui: {
	    		columnHeaders: "th.wmapp-admin-sort"
	    	},
	    	events: {
	    		"click th.wmapp-admin-sort": "onSort",
	    		"click .wmapp-select-all": "onSelectAll",
	    	},
	    	onSort: function(e) {
	    		var th = $(e.target);
	    		var sortKey = $(e.target).data('sort-key');
	    		var sortOrder = (this.collection.state.sortKey == sortKey) ? -((this.collection.state.order*(-1)+2)%3-1) : -1;
	    		if(sortOrder != 0) {
	    			this.collection.setSorting(sortKey, sortOrder);
	    		} else {
	    			this.collection.setSorting(null, -1);
	    		}
	    		this.collection.getFirstPage({reset:true});
	    	},
	    	onRenderCollection: function(){ // Marionette built-in callback
	    		var collection = this.collection;
	    		$.each(this.ui.columnHeaders, function(k,colHeader){
	    			$(colHeader).removeClass("sort_desc").removeClass("sort_asc");
	    			if(collection.state.sortKey == $(colHeader).data('sort-key')) {
	    				$(colHeader).addClass((collection.state.order > 0) ? "sort_desc" : "sort_asc");
	    			}
	    		});
	    	},
	        onSelectAll: function(e) {
	        	if ($(e.target).prop('checked')) {
	        		$(".wmapp-select-all-input").prop("checked", true);
	        	} else {
	        		$(".wmapp-select-all-input").prop("checked", false);
	        	}
	        	return true;
	        }
	    }); 
	    
		View.CoreDocumentSubmissionDataListLayout = WMAPP.Extension.View.LayoutView.extend({
			template: function(data){
				var options = data.options;
				var _htmlStr = '<fieldset>' +
				'<legend>Document Submission Data</legend>' +
				'<div class="wmapp-core-document-submission-data-list-commands"></div>' +
				'<div class="wmapp-core-document-submission-data-list-content"></div>' +
				'</fieldset>';
				
				return _htmlStr;
			},	
	        regions: {
	        	command: '.wmapp-core-document-submission-data-list-commands',
	        	content: '.wmapp-core-document-submission-data-list-content'        	
	        }
	    });
	    
	    /* view for the commands area above the list */
	    View.CoreDocumentSubmissionDataListCommand = WMAPP.Extension.View.ItemView.extend({
			template: function(data){
				var options = data.options;
				var model = data.model;
				var _htmlStr = '<div style="padding-bottom: 10px;" class="clearfix"><ul class="button-group">' +
				'<li><a class="wmapp-download-button button edit" href="/site/files/Core/submission/' + String("00000000" + model.get('id')).slice(-8) + '.pdf">Download PDF</a></li>' +
				'</ul><a class="wmapp-back-button button small right">Back</a></div>';
				return _htmlStr;
			},	
			templateHelpers:function(){
				return {
					model: this.model,
					options: this.options
				}
			},			        
	        className: 'wmapp-core-document-submission-data-list-commands',
	        events: {
	        	"click .wmapp-download-button": "onDownload",
	            "click .wmapp-back-button": "onBack",
	        },
	        onBack: function(e) {
	        	e.preventDefault();
	        	e.stopPropagation();        	
	        	this.trigger('trigger:backDocumentSubmissionDataEventSubmit', this.model);
	        },
	        onDownload: function(e) {
	        	e.preventDefault();
	        	e.stopPropagation();
	        	window.open($(e.currentTarget).attr('href'));
	        }, 
	    });    
	    
	    View.CoreDocumentSubmissionDataListHtml = WMAPP.Extension.View.ItemView.extend({
			template: function(data){
				var model = data.model;   	
				var _htmlStr = model.get('plainhtml');
				return _htmlStr;
			},
			templateHelpers:function(){
				return {
					model: this.model,
				}
			},
			initialize: function() {
				this.listenTo(this.model, 'change', this.render);
			},  		
	    });
        
});