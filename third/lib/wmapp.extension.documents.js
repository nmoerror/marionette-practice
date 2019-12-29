WMAPP.module('Extension.Documents', Backbone.Marionette.Module.extend({
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
        WMAPP.Log.getLogger("WMAPP." + this.moduleName).trace("Documents Module onStart begin");
        WMAPP.Log.getLogger("WMAPP." + this.moduleName).trace("Documents Module onStart end");
    },
    onStop: function () {
        WMAPP.Log.getLogger("WMAPP." + this.moduleName).trace("Documents Module onStop begin");
        WMAPP.Log.getLogger("WMAPP." + this.moduleName).trace("Documents Module onStop end");
    },
}));

WMAPP.module('Extension.Documents.Router', function(Router) {
	Router.ExtensionDocumentsRouter = WMAPP.Extension.Router.AppRouter.extend({
		appRoutes : {
		},
	});
});

WMAPP.module('Extension.Documents.Application', Backbone.Marionette.Module.extend({
	startWithParent: true,

    onStop: function() {
        this.stopListening();
    },

	onStart: function(options) {
		this.options = options;

		// initialize tile region
		this.documentOptions = options;
		this.tileRegion = this.documentOptions.region;

		// Safety Document Pageable Collection
		this.documentCollection = new WMAPP.Core.Model.DocumentCollection();

		var collQueryString = '?expand=all|slides|questions&CoreDocument_published=1&CoreDocument_entity_name=' + this.documentOptions.entity;
		var documentCollectionUrl = this.documentCollection.getUrl();
		this.documentCollection.url = documentCollectionUrl + collQueryString;

		// redirect to the list if successful
		this.listenTo(WMAPP.vent, 'process:document:success', function(currentSlide) {
			this.processPostProcess(currentSlide);
		}, this);

		// Init router
		var appRoutes = {
			"documents/:id" : "showDocumentTypes",
			"documents/list/:id" : "showDocumentSubmissions",
			"documents/create" : "createDocument",
			"documents/edit/:id" : "editDocument",
		};
		if (WMAPP.isApp) {
			var tile = WMAPP.slug;
			for (var i in appRoutes) {
				var key = i == "" ? tile : (tile+'/'+i);
				appRoutes[key] = appRoutes[i];
				delete appRoutes[i];
			}
		}
		this.documentRouter = new WMAPP.Extension.Documents.Router.ExtensionDocumentsRouter({
			controller: this,
			appRoutes : appRoutes,
		});
	},

	showDocumentTypes: function() {

		this.documentRouter.navigate((WMAPP.isApp ? (WMAPP.slug+'/') : '') + 'documents/' + this.documentOptions.entity_id, {replace: true});

		// fetch the document types
		this.documentCollection.fetch();

		// initialize views
		this.documentCollectionView = new WMAPP.Extension.Documents.View.DocumentTypeCollectionView({
			collection: this.documentCollection,
		});
		this.documentLayout = new WMAPP.Extension.Documents.View.DocumentLayout();

		// bind events
		this.listenTo(this.documentCollectionView, 'childview:trigger:showDocumentSubmissions', function(childView, model) { this.getDocumentSubmissions(model.get("id")); });
		this.listenTo(this.documentLayout, 'trigger:backDocumentEvent', function() {
			console.log(this);
	    	this.documentRouter.navigate('', {trigger: true});
	    	WMAPP.Extension.Documents.stop();
		}, this);

		// render views
		this.tileRegion.show(this.documentLayout);
		this.documentLayout.list.show(this.documentCollectionView);

		if (WMAPP.isApp) {
			this.listenTo( this.documentCollection, "sync", function() {
				WMAPP.vent.trigger('trigger:documentTypes:sync');
			});
		}
	},

	onNetworkChanged: function(networkChanged) {

	},

	getDocumentSubmissions: function(documentTypeId) {

		this.documentTypeId = documentTypeId;

        var that = this;
        // get the submission data
        WMAPP.vent.once('trigger:getSubmissionData', function() {
        	this.documentSubmissionCollection = new WMAPP.Core.Model.SubmissionPageableCollection();

        	// get the latest "submissions" or instances of this document
        	this.documentSubmissionCollection.storeName = 'WMAPP.Core.Model.Submission.' + this.documentTypeId + '-' + this.documentOptions.entity_id + '-';
        	this.documentSubmissionCollection.state.pageSize = 10;

            var contentAreaIds = '';
            _.each(that.documentType.get('_versions').models, function(model) {
            	contentAreaIds += '|' + model.get('content_area_id');
            });
            this.documentSubmissionCollection.queryParams['expand'] = 'all';
            this.documentSubmissionCollection.queryParams['CoreSubmission_content_area_id'] = contentAreaIds.substring(1);
            this.documentSubmissionCollection.queryParams['CoreSubmission_entity_id'] = this.documentOptions.entity_id;
            this.documentSubmissionCollection.setSorting('CoreSubmission.id', -1)
           	this.documentSubmissionCollection.remote = true;

            this.documentSubmissionCollection.fetch({
            	success: function() {
            		that.showDocumentSubmissions();
            	},
            });
        }, this);

        if (this.documentCollection.length === 0) {
            this.documentType = new WMAPP.Core.Model.Document({id: documentTypeId});
            this.documentType.remote = true;
            var documentUrl = this.documentType.getUrl();
       		var queryString = '';
       		queryString += '|all|slides|questions';
			if (queryString != '') {
				queryString = '?expand=' + queryString.substring(1);
			}
            this.documentType.url = documentUrl + '/' + documentTypeId + queryString;
            this.documentType.fetch().done(function() {
            	// trigger to get the submission data
            	that.channel.vent.trigger('trigger:getSubmissionData');
            });
        } else {
        	this.documentType = this.documentCollection.get(documentTypeId);

        	// trigger to get the submission data
        	WMAPP.vent.trigger('trigger:getSubmissionData');
        }
	},

	showDocumentSubmissions: function() {

		this.documentRouter.navigate((WMAPP.isApp ? (WMAPP.slug+'/') : '') + 'documents/list/' + this.documentTypeId, {replace: true});

        // set the version of the document we are working with
        this.documentVersion = _.find(this.documentType.get('_versions').models,
        		function(model) {
        			return model.get('content_area_id') == this.documentType.get('content_area_id');
        		}, this);

        // modify the questions
        if (this.documentVersion.get('_questions')) {
        	this.documentVersion.get('_questions').setTileTypeModels();
        }

		// initialize views
        this.documentSubmissionsLayout = new WMAPP.Extension.Documents.View.DocumentSubmissionsLayout();
        this.documentSubmissionList = new WMAPP.Extension.Documents.View.DocumentSubmissionList({
			collection: this.documentSubmissionCollection,
			model: this.documentVersion,
		});
        this.documentSubmissionsCommand = new WMAPP.Extension.Documents.View.DocumentSubmissionsCommand();
        // --- Pagination view
        this.documentSubmissionsPagination = new WMAPP.Extension.Documents.View.DocumentSubmissionsPagination({
            collection: this.documentSubmissionCollection
        });

        // listeners
        this.listenTo(this.documentSubmissionsCommand, 'trigger:createDocumentSubmissionEvent', this.createDocument);
        this.listenTo(this.documentSubmissionList, 'childview:trigger:editDocumentSubmission', function(childView, model) { this.editDocument(model.get("id")); });
        this.listenTo(this.documentSubmissionList, 'childview:trigger:emailDocumentSubmission', function(childView, model) { this.emailDocument(model); });
        this.listenTo(this.documentSubmissionsCommand, 'trigger:backDocumentSubmissionEvent', this.showDocumentTypes);

		// render views
        this.tileRegion.show(this.documentSubmissionsLayout);
        this.documentSubmissionsLayout.commands.show(this.documentSubmissionsCommand);
        this.documentSubmissionsLayout.list.show(this.documentSubmissionList);
        this.documentSubmissionsLayout.pagination.show(this.documentSubmissionsPagination);
	},

	emailDocument: function(submission) {

		// Load Risk Assessment Email Template
		var documentEmail = new WMAPP.Safework.Model.Email();
		documentEmail.set('submission_id', submission.id);
		documentEmail.set('_submission_id', submission);

		// initialize views
		this.documentEmailForm = new WMAPP.Extension.View.BaseForm({
			model: documentEmail,
			formId: 'Email',
			formClass: 'wmapp-document-email-form',
			legend: 'Email Document',
			saveLabel: 'Send Email',
			regions: {
				nameField: '.wmapp-document-email-name',
				emailField: '.wmapp-document-email-email'
			}
		});

		// name text field for site create
		var documentEmailFormName = new WMAPP.Extension.View.TextField({
			model: documentEmail,
			fieldId: 'EmailName',
			label: 'Name',
			name: 'name',
			tooltip: 'The name for your client'
		});

		// email text area for site create
		var documentEmailFormEmail = new WMAPP.Extension.View.TextField({
			model: documentEmail,
			fieldId: 'EmailEmail',
			label: 'Email',
			name: 'email',
			type: 'email',
			tooltip: 'The email to send to'
		});


		// bind events
		this.listenTo(this.documentEmailForm, 'trigger:formSubmit', this.sendDocumentEmail);
		this.listenTo(this.documentEmailForm, 'trigger:formCancel', function() {
			WMAPP.LightboxRegion.close();
		});

		// render the view
		this.documentEmailForm.once('show', function(){
			this.documentEmailForm.nameField.show(documentEmailFormName);
			this.documentEmailForm.emailField.show(documentEmailFormEmail);
		}, this);
		WMAPP.LightboxRegion.show(this.documentEmailForm,{width:'90%', maxWidth: 800, closeButton:false});
	},

	sendDocumentEmail: function(model){

		// clear any errors
        WMAPP.Helper.clearErrors('SafeworkEmail');

        // validate the model
        model.validate();

        if (model.isValid()) {
        	var that = this;

        	// save the model
            model.save({}, {
                success: function(model, response, options) {

                    // display flash message
            		if (WMAPP.isOnline) {
                        WMAPP.Helper.showMessage('success', 'The email has been sent.');
                    } else {
                        WMAPP.Helper.showMessage('success', "You appear to currently be offline, so we'll automatically send this email for you when you next come online.");
                    }

					// close the lightbox
		        	WMAPP.lightbox.close();
					WMAPP.Helper.wmAjaxEnd();

                },
                error: function(model, response, options) {
                	if (response.responseJSON) {
                		if (response.responseJSON.message) {
                			WMAPP.Helper.showMessage('alert', response.responseJSON.message);
                		}
                		if (response.responseJSON.errors) {
                			// handle the validation within the form
	                    	_.each(response.responseJSON.errors, function(val, attr){
	                    		Backbone.Validation.callbacks.invalid(that.documentEmailForm, attr, val[0], attr);
	                        });
                		}
                	} else if (response.statusText && response.status) {
                		WMAPP.Helper.showMessage('alert', "Error ("+response.status+"): " + response.statusText);
                	} else {
                		WMAPP.Helper.showMessage('alert', "An unknown error has occurred.");
                	}
                	WMAPP.Helper.wmAjaxEnd();
                },
                remote: WMAPP.isOnline,
                dirty: (WMAPP.isApp && _.isBoolean(WMAPP.isOnline) && !WMAPP.isOnline)
            });
        } else {
			WMAPP.Helper.wmAjaxEnd();
        }
	},

	createDocument: function() {

		this.documentRouter.navigate((WMAPP.isApp ? (WMAPP.slug+'/') : '') + 'documents/create', {replace: true});

   		// clear any messages
   		WMAPP.Helper.hideMessage();

        // submission Model
   		this.submission = new WMAPP.Core.Model.Submission();
        if (!WMAPP.isApp) {
        	this.submission.remote = true;
        }

        this.submission.clear().set(this.submission.defaults);
        this.submission.set({'finished' : false});
        this.submission.set({'entity_id' : this.documentOptions.entity_id});
        this.submission.storeName = 'WMAPP.Core.Model.Submission.' + this.documentTypeId + '-' + this.documentOptions.entity_id + '-';

        // set the content area id if not already set
        if (this.submission.get('content_area_id') === null) {
        	this.submission.set('content_area_id', this.documentType.get('content_area_id'));
        }
        // set the user if it is present
        if (WMAPP.user.id !== 0 && this.submission.get('user_id') === null) {
        	this.submission.set('user_id', WMAPP.user.id);
        }
        // set the data collection if required
        if (this.submission.get('_submission_datas') === undefined) {
        	this.submission.set('_submission_datas', new WMAPP.Core.Model.SubmissionDataCollection());
        }

        this.startDocument();
	},

	editDocument: function(submissionId) {

		this.documentRouter.navigate((WMAPP.isApp ? (WMAPP.slug+'/') : '') + 'documents/edit/' + submissionId, {replace: true});

		WMAPP.vent.on('trigger:startDocument', this.startDocument);

        if (this.documentSubmissionCollection.length === 0) {
            //this.submission = new WMAPP.Core.Model.Submission({id: submissionId});
        	this.submission = new WMAPP.Core.Model.Submission({id: submissionId});
            this.submission.storeName = 'WMAPP.Core.Model.Submission.' + this.documentTypeId + '-' + this.documentOptions.entity_id + '-';
            if (WMAPP.isApp && _.isBoolean(WMAPP.isOnline) && !WMAPP.isOnline) {
            	this.submission.local = true;
            } else {
            	this.submission.remote = true;
            }
            var submissionUrl = this.submission.getUrl();
       		var queryString = '';
       		queryString += '|all';
			if (queryString != '') {
				queryString = '?expand=' + queryString.substring(1);
			}
            this.submission.url = submissionUrl + '/' + submissionId + queryString;
            var that = this;
            this.submission.fetch().done(function() {
            	// reset the finished status
            	that.submission.set('finished', false);

            	// start the document
            	that.startDocument();
            });
        } else {
        	this.submission = this.documentSubmissionCollection.get(submissionId);

        	if (this.submission) {
            	// reset the finished status
            	this.submission.set({'finished' : false});

            	// start the document
            	this.startDocument();
        	} else {
        		WMAPP.Helper.showMessage('alert', "Error retreiving submission. Please try again.");
        		this.showDocumentSubmissions();
        	}
        }
	},

	startDocument: function() {

		if (WMAPP.isApp) {
			WMAPP.setTitle('Edit Document');
		}

		this.location = 'document';

        // set the version of the document we are working with
        this.documentVersion = _.find(this.documentType.get('_versions').models,
        		function(model) {
        			return model.get('content_area_id') == this.submission.get('content_area_id');
        		}, this);

        // get the html for this document too...
        this.slideIndex = 0; // holds the index of the current slide, or last submitted slide
        this.slideId = null; // holds the id of the current slide, or last submitted slide
        this.slideIds = new Array(); // holds all of the slide ids in the order they have been saved in the db

        // get the collection of slides in order
        var that = this;
        this.slides = new WMAPP.Core.Model.SlideBuilderTileCollection(this.documentVersion.get('_slides').models);
        // index the slides by page_tile_id
        _.each(this.slides.models, function(model, index) {
        	if (that.slideId == null) {
        		that.slideId = model.get('id');
        	}
        	that.slideIds.push(WMAPP.Helper.castId(model.id));
        });
        this.goToNextSlide();
	},

	cancelDocument: function() {
		delete this.documentSlideView;
		this.showDocumentSubmissions(this.documentTypeId);
	},

    goToNextSlide: function(currentSlide, finished) {
    	// show the first slide if the currentSlide is null
    	if (currentSlide == null) {
    		this.nextSlide = this.slides.at(this.slideIndex);
    		this.showSlide(this.nextSlide);
    	} else {
    		var that = this;
			// validate the current submission
    		if (this.validateSubmission()) {
				// process the submission
				that.processSubmission(currentSlide, finished);
    		} else {
    			WMAPP.Helper.wmAjaxEnd();
    		}

			if (!finished) {
				WMAPP.Helper.wmAjaxEnd();
			}
    	}
    },

    /*
     * Get the next slide
     */
    getNextSlide: function (slide) {
    	++this.slideIndex;
    	this.slideId = this.slideIds[this.slideIndex];
    	return this.slides.at(this.slideIndex);
    },

    goToPreviousSlide: function(currentSlide) {
    	var previousSlideId = WMAPP.Helper.castId(currentSlide.get('previous_slide_id'));
    	this.slideIndex = _.indexOf(this.slideIds, previousSlideId);
    	this.slideId = this.slideIds[this.slideIndex]; // get the slideId
    	this.nextSlide = this.slides.at(this.slideIndex); // get the slide
    	this.showSlide(this.nextSlide);
    },

    showSlide: function(currentSlide) {
        // --- Layout
        this.documentDisplayLayout = new WMAPP.Extension.Documents.View.SafetyDocumentSubmissionLayout();

        if (currentSlide !== undefined) {
            _.each(currentSlide.get('_slide_questions').models, function(element, index) {
            	if (this.submission && this.submission.get('_submission_datas').length) {
                	var submissionData = _.find(this.submission.get('_submission_datas').models, function(data) { return data.get('page_tile_id') == element.get('id'); }, this);
                	if (submissionData) {
                		element.set('_submission_data', submissionData);
                	}
            	} else {
            		element.unset('_submission_data');
            	}
            }, this);

            // massage the tile_types
            currentSlide.get('_slide_questions').setTileTypeModels();

            // this is the collection of questions
            WMAPP.Core.questions = currentSlide.get('_slide_questions');

            this.documentSlideView = new WMAPP.Extension.Documents.View.SafetyDocumentSubmissionAbstractContentArea({
            	model: currentSlide
        	});

            this.documentDisplayCommand = new WMAPP.Extension.Documents.View.SafetyDocumentSubmissionCommand({
            	displayPrevious: ((this.slideIndex == 0) ? false : true ),
            	displayNext: (((this.slides.length - 1) == this.slideIndex) ? false : true ),
            	displayFinish: (((this.slides.length - 1) == this.slideIndex) ? true : false ),
            });

            this.listenTo(this.documentDisplayCommand, 'trigger:questionNextSlideEvent', function(model) { this.goToNextSlide(currentSlide); }, this);
            this.listenTo(this.documentDisplayCommand, 'trigger:questionPreviousSlideEvent', function(model) { this.goToPreviousSlide(currentSlide); }, this);
            this.listenTo(this.documentDisplayCommand, 'trigger:questionFinishEvent', function(model) { this.submission.set('finished', true); this.goToNextSlide(currentSlide, true); }, this);
            this.listenTo(this.documentDisplayCommand, 'trigger:questionCancelEvent', function(model) { this.cancelDocument(); }, this);
            WMAPP.vent.on('trigger:coreComboBoxVersionFileClicked', function(model) {
				this.viewSafetyProcedure(model);
			}, this);

            this.tileRegion.show(this.documentDisplayLayout);
            this.documentDisplayLayout.slides.show(this.documentSlideView);
            this.documentDisplayLayout.command.show(this.documentDisplayCommand);

            // reflow foundation
			$(document).foundation('reflow');
        } else {
        	this.showDocumentTypes();
        }
    },

    viewSafetyProcedure: function(latestVersion) {
    	var fileName = WMAPP.Helper.tableName(latestVersion.get('name')) + '-' + String("000" + latestVersion.get('version')).slice(-3) + '.pdf';
    	var cachedPDF = WMAPP.cachedFilesLocalCollection.findWhere({type: 'Procedure', file: fileName});
    	if (cachedPDF) {
    		WMAPP.vent.trigger('trigger:file:open', cachedPDF.get('path'))
    	}
    },

    /*
     * Get the skip logic for a slide. If the skip is not null, get the next skip after the passed skip in the skip array.
     */
    getSkipLogic: function (slide, skipLogic) {
    	if (!skipLogic && slide.get('_skip_logics').length === 0) {
    		return null;
    	} else if (!skipLogic && slide.get('_skip_logics').length !== 0) {
    		// check the first logic
    		this.checkSkipLogics = true;
    		return slide.get('_skip_logics').at(0);
    	} else {
    		// get and check the next logic
    		var index = slide.get('_skip_logics').indexOf(skipLogic);
    		++index; // get the next one
    		if (index >= slide.get('_skip_logics').models.length) {
        		this.checkSkipLogics = false;
        		return null;
    		} else {
        		this.checkSkipLogics = true;
        		return slide.get('_skip_logics').at(index);
    		}
    	}
    },

    checkSkipLogic: function(skipLogic) {
    	// loop thru the rules of the skip logic and see if they check out
    	var passes = false;
    	if (this.submission.get('_submission_datas')) {
        	if (skipLogic.get('_rules')) {
                _.each(skipLogic.get('_rules').models, function(rule, index) {
                	// see if there is a submission data for this rules condition (ie question)
                	var submissionData = _.find(this.submission.get('_submission_datas').models, function(data) {
						return WMAPP.Helper.compareIds(data.get('page_tile_id'), rule.get('condition'));
					});
                	if (submissionData) {
                		passes = this.checkLogicRule(submissionData, rule);
                	} else {
                		if (rule.get('operator') == "2" || rule.get('operator') == "4" || rule.get('operator') == "6") {
                			passes = true;
                		}
                	}
                }, this);
        	} else {
        		return false;
        	}
    	} else {
    		return false;
    	}
    	return passes;
    },

    /*
     * Checks a submissionData for a question against a rule condition
     */
    checkLogicRule: function(submissionData, rule) {
    	console.log('SUBMISSION DATA', submissionData);

    	var checkQuestion = new WMAPP.Core.Model[submissionData.get('_tile_type_id').get('extends')]();
    	switch (rule.get('operator')) {
    		// IS ANSWERED
    		case "1" :
    			if (checkQuestion.checkAnswered(submissionData.get('data'))) {
    				return true;
    			}
    			break;
    		// IS NOT ANSWERED
    		case "2" :
    			if (!checkQuestion.checkAnswered(submissionData.get('data'))) {
    				return true;
    			}
    			break;
    		// CONTAIN
    		case "3" :
    			if (checkQuestion.checkContains(submissionData.get('data'), rule.get('value'))) {
    				return true;
    			}
    			break;
    		// DOES NOT CONTAIN
    		case "4" :
    			if (!checkQuestion.checkContains(submissionData.get('data'), rule.get('value'))) {
    				return true;
    			}
    			break;
    		// INCLUDES ONE OF THE FOLLOWING
    		case "5" :
    			if (checkQuestion.checkIncludes(submissionData.get('data'), rule.get('value'))) {
    				return true;
    			}
    			break;
    		// DOES NOT INCLUDE ONE OF THE FOLLOWING
    		case "6" :
    			if (!checkQuestion.checkIncludes(submissionData.get('data'), rule.get('value'))) {
    				return true;
    			}
    			break;
    	}

    	return false;
    },

    /*
     * Does this slide show, based on its "show logic"
     */
    getShow: function(slide) {
    	var passes = true;
    	if (slide && slide.get('_show_logic_id') && slide.get('_show_logic_id').get('id')) {
        	if (this.submission.get('_submission_datas')) {
            	if (slide.get('_show_logic_id').get('_rules')) {
            		// set the passes to false, because we only want to display the slide if any of the rules pass
            		passes = false;
                    _.each(slide.get('_show_logic_id').get('_rules').models, function(rule, index) {
                    	// see if there is a submission data for this rules condition (ie question)
                    	var submissionData = _.find(this.submission.get('_submission_datas').models, function(data) {
							return WMAPP.Helper.compareIds(data.get('page_tile_id'), rule.get('condition'));
						});
                    	if (submissionData) {
                    		if (!passes)
                    			passes = this.checkLogicRule(submissionData, rule);
                    	} else {
                    		if (!passes && (rule.get('operator') == "2" || rule.get('operator') == "4" || rule.get('operator') == "6")) {
                    			passes = true;
                    		}
                    	}
                    }, this);
            	}
        	}
    	}

    	return passes;
    },

    validateSubmission: function() {
    	var that = this;

        // clear any errors
        WMAPP.Helper.clearErrors('QuestionnaireQuestionnaire');

        // validate the tiles
        var isValid = true;

		// run any pre-validation steps
		$.each(WMAPP.tileApplications, function(index, tileApplication) {
			if (typeof tileApplication.preValidation === "function") {
				tileApplication.preValidation();
			}
		});

		// go thru each "question" (ie pageTile)
    	WMAPP.Core.questions.each(function(slideQuestion) {
    		if (slideQuestion.get('_question') !== undefined && slideQuestion.get('_tile_type_id').get('question') == '1') { // this should exist if we were able to bind the question type tile to this page tile
    			var question = slideQuestion.get('_question');

				question.validate(); // validate the question type, this validation is set in the tile applications
        		if (!question.isValid()) {
        			isValid = false;
        		} else {
        			// if the current "pageTile" has some data saved against it, update it.
        			// this will update the submission data also.
        			if (question !== undefined && slideQuestion !== undefined) {
            			if (slideQuestion.get('_submission_data') !== undefined) {
            				if (this.submission.get('_submission_datas') !== undefined) {
            					// get the submission data for this question, and update the value
            					var submissionData = _.find(this.submission.get('_submission_datas').models, function(data) { return slideQuestion.get('id') == data.get('page_tile_id'); });
            					if (submissionData) {
            						submissionData.set('data', question.setData());
            						submissionData.set('score', question.setScore());
            						submissionData.set('question_name', question.get('name'));
            					}
            				}
            			} else {
            				var _page_tile_id = slideQuestion.clone();
            				_page_tile_id.unset('_question');
            				_page_tile_id.unset('_tile_type_id');

            				// create a new submission question data, and add it to the submission
                			var submissionData = new WMAPP.Core.Model.SubmissionData({
                				content_area_id: this.submission.get('content_area_id'),
                				page_tile_id: slideQuestion.get('id'),
                				_page_tile_id: _page_tile_id,
                				tile_type_id: slideQuestion.get('_tile_type_id').get('id'),
                				_tile_type_id: slideQuestion.get('_tile_type_id'),
                				slide_id: this.nextSlide.get('page_tile_id'),
                				question_name: question.get('name'),
                				data: question.setData(),
                				score: question.setScore(),
                			});

                			// add to the submission datas
                			this.submission.get('_submission_datas').add(submissionData);
            			}

        				// this sets the value on the question on the form
        				slideQuestion.set('_submission_data', submissionData);
        			}
        		}
    		}
    	}, this);

    	return isValid;
    },

    processSubmission: function(currentSlide, finished) {
    	var that = this;

    	if (finished) {
    		this.submission.set('finished', true);
    	}

		// update the slideIndex
		this.submission.set('slide', this.slideId);

		if (this.submission.get('finished')) {
        	// set some dates
    		if (this.submission.get('created') == null) {
    			this.submission.set('created', moment().format("YYYY-MM-DD HH:mm:ss"));
    		}
        	if (WMAPP.isApp && !WMAPP.isOnline) {
        		this.submission.set('modified', moment().format("YYYY-MM-DD HH:mm:ss"));
        	}

        	// persist the submission to the server
            var response = this.submission.save({}, {
                success: function(model, response, options) {
	            				WMAPP.vent.trigger('process:document:success', currentSlide);
                },
                error: function(model, response, options) {
                	if (response.responseJSON) {
                		if (response.responseJSON.message) {
							WMAPP.Helper.showMessage('alert', response.responseJSON.message);

							if (response.responseJSON.errors) {
								// handle the validation within the form
								model.validationError = response.responseJSON.errors;

							} else if (response.responseJSON.version) { // if we get a response that the model is out of date, check the version
								// save this data locally
								that.documentSubmissionCollection.create(that.submission.toJSON(), {remote: false, wait: true});

								// set the app to upgrade status
								WMAPP.setUpgrade();

								// redirect to the list if successful
								WMAPP.vent.trigger('process:document:success', currentSlide);
							}
                		}
                	} else if (response.statusText && response.status) {
                		WMAPP.vent.trigger('change:network:status', false, "Error ("+response.status+"): " + response.statusText + ". Saving locally");

						// save this data locally
						that.documentSubmissionCollection.create(that.submission.toJSON(), {remote: false, wait: true});
                	} else {
                		WMAPP.vent.trigger('change:network:status', false, "An unknown error has occurred. Saving locally");

						// save this data locally
						that.documentSubmissionCollection.create(that.submission.toJSON(), {remote: false, wait: true});
                	}

                	that.getDocumentSubmissions(that.documentTypeId);
					WMAPP.Helper.wmAjaxEnd();
                },
                remote: WMAPP.isOnline,
                both: WMAPP.isOnline,
                dirty: (WMAPP.isApp && _.isBoolean(WMAPP.isOnline) && !WMAPP.isOnline)
            });
		} else {
			WMAPP.vent.trigger('process:document:success', currentSlide);
		}
    },

    processPostProcess: function(currentSlide) {
		var skipLogic;
		this.checkSkipLogics = true;
		var show = false; // does the slide show logic pass or fail.
		this.nextSlide = currentSlide;

    	var i = 0;
		do {
			if (this.checkSkipLogics) {
				skipLogic = this.getSkipLogic(currentSlide, skipLogic);
			}

			if (skipLogic === null || !this.checkSkipLogics) {
				this.nextSlide = this.getNextSlide();

				if (this.nextSlide) {
        			// check show logic of slideId
        			show = this.getShow(this.nextSlide);
				}

			} else {
				// check if this logic passes
				if (this.checkSkipLogic(skipLogic)) {
    				this.slideId = WMAPP.Helper.castId(skipLogic.get('_action_id').get('skip'));
    				this.slideIndex = _.indexOf(this.slideIds, this.slideId);

    				// get the slide based off the id set above.
    				this.nextSlide = this.slides.at(this.slideIndex);
    				if (this.nextSlide) {
            			// check show logic of slideId
            			show = this.getShow(this.nextSlide);
    				}
				}
			}
			++i;
		} while (!show && this.nextSlide && i < 10);

		if (this.nextSlide) {
    		// set the previous slide
    		this.nextSlide.set('previous_slide_id', currentSlide.get('id'));
    		this.showSlide(this.nextSlide);
		} else {
			if (!WMAPP.isOnline) {
				WMAPP.Helper.showMessage('success', 'The safety document has been saved locally');
			}
            this.getDocumentSubmissions(this.documentTypeId);
		}

		WMAPP.Helper.wmAjaxEnd();
    },

}));

WMAPP.module('Extension.Documents.View', function(View) {

	View.DocumentLayout = WMAPP.Extension.View.LayoutView.extend({
		initialize: function() {
			if (WMAPP.isApp) {
				WMAPP.setTitle('Document Types');
			}
			WMAPP.Extension.View.LayoutView.prototype.initialize.call(this);
		},
		template: function() {
			var _tmplStr = '';
			_tmplStr += '<div class="wmapp-commands clearfix">';
			if (!WMAPP.isApp) {
				_tmplStr += '<div style="padding-bottom: 10px;" class="clearfix"><ul class="button-group" style="display:inline-block;"></ul>' +
				'<a class="wmapp-back-button button small right">Back</a></div>';
			}
			_tmplStr += '</div>';
			_tmplStr += '<div class="wmapp-document-management-list"></div>' +
			'<div class="wmapp-document-management-pagination"></div>';
			return _tmplStr;
		},
		regions: {
			list:       '.wmapp-document-management-list',
			pagination: '.wmapp-document-management-pagination'
		},
		events: {
			"click .wmapp-back-button": "onBack",
		},
        onBack: function(e) {
        	e.preventDefault();
        	e.stopPropagation();
        	this.trigger('trigger:backDocumentEvent', this.model);
        },
	});

	View.DocumentTypeCollectionItemView = WMAPP.Extension.View.ItemView.extend({
		initialize: function() {
			if (WMAPP.isApp) {
				WMAPP.setTitle('Document Types');
			}
			WMAPP.Extension.View.LayoutView.prototype.initialize.call(this);
		},
		tagName: 'li',
		template: function(data) {
			var model = data.model;
			var options = data.options;
			var _tmplStr = '';
			_tmplStr += '<div class="text-center">';
			_tmplStr += '<a href="list/' + model.get('id') + '" class="wmapp-inline-list-item-icon wmapp-view-button">';
			var domain = "";
			if (WMAPP.isApp && WMAPP.domain) {
				domain += "https://" + WMAPP.domain;
			}

			if (model.get('_icon') && model.get('_icon').get('id')) {
				_tmplStr += '<div class="wmapp-inline-list-item-icon-circular" style="background: url(' + domain + '/site/img/' + model.get('_icon').get('file') + ') no-repeat; background-size: 150px; background-position: center; "></div>';
			} else {
				_tmplStr += '<div class="wmapp-inline-list-item-icon-circular" style="background: url(' + domain + '/img/default_document.svg) no-repeat; background-size: 150px; background-position: center;"></div>';
			}
			_tmplStr += '</a>';
			_tmplStr += '<br />';
			_tmplStr += '<a href="list/' + model.get('id') + '" class="wmapp-inline-list-item-label wmapp-view-button">' + model.get('name') + '</a>';
			_tmplStr += '</div>';

			return _tmplStr;
		},
		events: {
			"click .wmapp-view-button": "onView",
			"click .wmapp-back-button": "onBack",
		},
		onView: function(e) {
			e.preventDefault();
			e.stopPropagation();
			this.trigger('trigger:showDocumentSubmissions', this.model);
		},
		templateHelpers:function(){
			return {
				model: this.model,
				options: this.options
			}
		},
	});

	View.DocumentTypeCollectionEmptyView = WMAPP.Extension.View.ItemView.extend({
		tagName: 'li',
		template: _.template('<div class="text-center">No Document Types</div>')
	});

	View.DocumentTypeCollectionLoadingView = WMAPP.Extension.View.ItemView.extend({
		tagName: 'li',
		template: _.template('<div class="text-center">Loading ...</div>')
	});

	View.DocumentTypeCollectionView = WMAPP.Extension.View.CollectionView.extend({
		tagName: "ul",
		className: "wmapp-inline-list",
		childView: View.DocumentTypeCollectionItemView,
		getEmptyView: function() {
			if(this.collection && this.collection.state && this.collection.state.totalRecords === null) {
				return View.DocumentTypeCollectionLoadingView;
			} else {
				return View.DocumentTypeCollectionEmptyView;
			}
		},
		emptyView: View.DocumentTypeCollectionEmptyView,
		initialize : function() {
			this.listenTo( this.collection, "sync", this.render);
		},
	});

	View.DocumentPaginationView = WMAPP.Extension.View.PaginationView.extend({

	});

	View.DocumentSubmissionsLayout = WMAPP.Extension.View.LayoutView.extend({
		initialize: function() {
			if (WMAPP.isApp) {
				WMAPP.setTitle('Document Submissions');
			}
			WMAPP.Extension.View.LayoutView.prototype.initialize.call(this);
		},
		template: function() {
			var tmplStr = '<div class="wmapp-document-submissions-commands"></div>' +
			'<div class="wmapp-document-submissions-list"></div>' +
			'<div class="wmapp-document-submissions-pagination"></div>';
			return tmplStr;
		},
		regions: {
			commands:       '.wmapp-document-submissions-commands',
			list:       '.wmapp-document-submissions-list',
			pagination: '.wmapp-document-submissions-pagination'
		}
	});

	View.DocumentSubmissionsCommand = WMAPP.Extension.View.ItemView.extend({
        template: function() {
			var tmplStr = '<div style="padding-bottom: 10px;" class="clearfix text-center"><ul class="button-group" style="display:inline-block;">';
				tmplStr += '<li><a href="create" class="wmapp-router-nav wmapp-create-button button success small">Create new Document</a></li></ul>';
			if (!WMAPP.isApp) {
				tmplStr += '<a class="wmapp-back-button button small right"><span>&lt;</span> Back</a>';
			}
			tmplStr += '</div>';
			return tmplStr;
		},
		events: {
			"click .wmapp-create-button": "onCreate",
			"click .wmapp-back-button": "onBack",
		},
		onCreate: function(e) {
			e.preventDefault();
			e.stopPropagation();
			this.trigger('trigger:createDocumentSubmissionEvent');
		},
        onBack: function(e) {
        	e.preventDefault();
        	e.stopPropagation();
        	this.trigger('trigger:backDocumentSubmissionEvent');
        },
	});

    View.DocumentSubmissionListItem = WMAPP.Extension.View.ItemView.extend({
    	tagName: 'tr',
		template: function(data){
			var options = data.options;
			var model = data.model;

			var _htmlStr = '';
			if (options.displayModel && options.displayModel.get('_questions')) {
				// get the member columns first
				_.each(options.displayModel.get('_questions').models, function(question) {
					if (question.get('_question') && question.get('_question').get('column') && question.get('_tile_type_id').get('type') == 'CoreSignatureQuestionTile') {
						if (model.get('_submission_datas')) {
							var found = false;
							var submissionData = _.find(model.get('_submission_datas').models, function(subData) { return subData.get('_page_tile_id').get('instance_id') == question.get('instance_id'); });
							if (submissionData) {
								// set the data against the tile type
								_htmlStr += '<td data-th="' + question.get('_question').get('name') + ': ">' + question.get('_question').getDisplayData(submissionData) + '</td>';
								found = true;
							}

							if (!found) {
								_htmlStr += '<td data-th="' + question.get('_question').get('name') + ': ">N/A</td>';
							}
						} else {
							_htmlStr += '<td data-th="' + question.get('_question').get('name') + ': ">N/A</td>';
						}
					}
				});

				// now get the non columns
				_.each(options.displayModel.get('_questions').models, function(question) {
					if (question.get('_question') && question.get('_question').get('column') && question.get('_tile_type_id').get('type') != 'CoreSignatureQuestionTile') {
						if (model.get('_submission_datas')) {
							var found = false;
							var submissionData = _.find(model.get('_submission_datas').models, function(subData) { return subData.get('_page_tile_id').get('instance_id') == question.get('instance_id'); });

							if (submissionData) {
								// set the data against the tile type
								_htmlStr += '<td data-th="' + question.get('_question').get('name') + ': ">' + question.get('_question').getDisplayData(submissionData) + '</td>';
								found = true;
							}

							if (!found) {
								_htmlStr += '<td data-th="' + question.get('_question').get('name') + ': ">N/A</td>';
							}
						} else {
							_htmlStr += '<td data-th="' + question.get('_question').get('name') + ': ">N/A</td>';
						}
					}
				});
			}
			_htmlStr += '<td style="text-align: right">';
			//_htmlStr += '<a class="wmapp-email-button button small image" data-id="' + model.get('id') + '"></a>';
			_htmlStr += '<a class="wmapp-edit-button button small image" data-id="' + model.get('id') + '"></a>';
			//_htmlStr += '<a class="wmapp-delete-button button small" data-id="' + model.get('id') + '" title="Are you sure you want to delete this submission?"><img src="/img/buttons/delete.svg" /></a>';
			_htmlStr += '</td>';
			return _htmlStr;
		},
    	events: {
    		"click .wmapp-email-button": "onEmail",
    		"click .wmapp-edit-button": "onEdit",
    		"click .wmapp-delete-button": "onDelete",
    	},
        onDelete: function(e) {
        	e.preventDefault();
        	e.stopPropagation();
        	if (confirm(e.target.title)) {
        		this.trigger('trigger:deleteDocumentSubmission', this.model);
        	}
        },
		onEdit: function(e) {
			var onEditMethod = function(e, context) {
				e.preventDefault();
				e.stopPropagation();
				context.trigger('trigger:editDocumentSubmission', context.model);
			};
			if (window.click && WMAPP.isApp) {
				click(e, this, onEditMethod);
			} else {
				onEditMethod(e, this);
			}
		},
		onEmail: function(e) {
        	e.preventDefault();
        	e.stopPropagation();
        	this.trigger('trigger:emailDocumentSubmission', this.model);
        },
		templateHelpers:function(){
			return {
				model: this.model,
				options: this.options
			}
		},
    });

    View.DocumentSubmissionList = WMAPP.Extension.View.CompositeView.extend({
    	tagName: "table",
    	className: "wmapp-table",
    	id: "thisId",
		template: function(data){
			var options = data.options;
			var model = data.model;
			var _htmlStr = '<thead>' +
			'<tr>';
			if (model && model.get('_questions')) {
				// member columns first
				_.each(model.get('_questions').models, function(question) {
					if (question.get('_question') && question.get('_question').get('column') && question.get('_tile_type_id').get('type') == 'CoreSignatureQuestionTile') {
						_htmlStr += '<th>' + question.get('_question').get('name') + '</th>';
					}
				});
				// non-member columns second
				_.each(model.get('_questions').models, function(question) {
					if (question.get('_question') && question.get('_question').get('column') && question.get('_tile_type_id').get('type') != 'CoreSignatureQuestionTile') {
						_htmlStr += '<th>' + question.get('_question').get('name') + '</th>';
					}
				});
			}
			_htmlStr += '<th class="">Commands</th>' +
			'</tr>' +
			'</thead>' +
			'<tbody>' +
			'</tbody>';
			return _htmlStr;
		},
		templateHelpers:function(){
			return {
				model: this.model,
				options: this.options
			}
		},
    	childView: View.DocumentSubmissionListItem,
    	childViewContainer: "tbody",
    	childViewOptions: function() {
    		return {
    			displayModel: this.model,
    		}
    	},
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

	View.SafetyDocumentSubmissionAbstractContentArea = WMAPP.Extension.View.AbstractContentArea.extend({
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

	View.SafetyDocumentSubmissionLayout = WMAPP.Extension.View.LayoutView.extend({
		regions: {
			heading:       '.wmapp-document-display-heading',
			slides:       '.wmapp-document-display-slides',
			command:       '.wmapp-document-display-commands',
		},
		initialize: function(options) {
			var tmplStr = '<div class="row">';
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
    });

    /* view for the commands area above the list */
    View.SafetyDocumentSubmissionCommand = WMAPP.Extension.View.ItemView.extend({
        template: function(data) {
            var tmplStr = '<ul class="button-group">';
            if (data.displayPrevious) {
                tmplStr += '<li><button class="wmapp-back-button button"><< Back</button></li>';
            }
            if (data.displayNext) {
                tmplStr += '<li><button class="wmapp-next-button button">Next >></button></li>';
            }
            if (data.displayFinish) {
                tmplStr += '<li><button class="wmapp-finish-button button">Finish</button></li>';
            }
            tmplStr += '<li><button class="wmapp-cancel-button alert button">Cancel</button></li>';
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
        onBack: function(e) {
            WMAPP.Helper.wmAjaxStart($(e.target));
        	this.triggerDelayed('trigger:questionPreviousSlideEvent');
        },
        onNext: function(e) {
            WMAPP.Helper.wmAjaxStart($(e.target));
            this.triggerDelayed('trigger:questionNextSlideEvent');
        },
        onFinish: function(e) {
            WMAPP.Helper.wmAjaxStart($(e.target));
        	this.triggerDelayed('trigger:questionFinishEvent');
        },
        onCancel: function(e) {
        	this.triggerDelayed('trigger:questionCancelEvent');
        },
        templateHelpers: function() {
            return {
                displayNext: this.options.displayNext,
                displayPrevious: this.options.displayPrevious,
                displayFinish: this.options.displayFinish
            }
        }
    });

	View.DocumentSubmissionsPagination = WMAPP.Extension.View.PaginationView.extend({
		initialize : function() {
			this.listenTo( this.collection, "sync", this.render);
		},
	});

});
