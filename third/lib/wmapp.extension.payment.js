'use strict';


/**
 * Payment - Checkout Module
 */
WMAPP.module('Extension.Payment.Checkout', Backbone.Marionette.Module.extend({
    startWithParent: true,
    getChannel: function () {
        if (this._channel) {
            return this._channel;
        } else {
            this._channel = Backbone.Wreqr.radio.channel('WMAPP.' + this.moduleName + '.channel');
            return this._channel;
        }
    },
    onStart: function (options) {
        WMAPP.Log.getLogger("WMAPP." + this.moduleName).trace("Payment.Checkout Module onStart begin");
        WMAPP.Log.getLogger("WMAPP." + this.moduleName).trace("Payment.Checkout Module onStart end");
    },
    onStop: function () {
        WMAPP.Log.getLogger("WMAPP." + this.moduleName).trace("Payment.Checkout Module onStop begin");
        WMAPP.Log.getLogger("WMAPP." + this.moduleName).trace("Payment.Checkout Module onStop end");
    },
}));

WMAPP.module('Extension.Payment.Checkout.Application', Backbone.Marionette.Module.extend({
    startWithParent: true,
    alertMessage: null,
    successMessage: null,
    notificationMessage: null,
    vent: WMAPP.Extension.Payment.Checkout.getChannel().vent,

    //---------------------------------GENERAL-----------------------------------------

    /**
     * Creates general cart view
     * @param options
     */
    createView: function(options) {
        WMAPP.Log.getLogger("WMAPP.Payment.Checkout").trace("Hello");
        if (options) {
            this.viewOptions = options;
            if (this.viewOptions.region) {
                this.region = this.viewOptions.region;
                this.model = this.viewOptions.model;
                this.status = this.viewOptions.status;
                this.message = this.viewOptions.message;
                this.paymentTypes = this.viewOptions.paymentTypes;

                if (this.viewOptions.displayPromotion == undefined)
                	this.viewOptions.displayPromotion = true;             
                if (this.viewOptions.displayPayment == undefined)
                	this.viewOptions.displayPayment = true;
                if (this.viewOptions.displayAddress == undefined)
                	this.viewOptions.displayAddress = true;                

                if (this.status == 'checkout' || this.status == 'confirm') {
                    this.paymentCheckoutLayoutView = new WMAPP.Extension.Payment.Checkout.View.PaymentCheckoutLayout({
                    	model: this.model,
                    	paymentTypes: this.paymentTypes,
                    	status: this.status,
                		displayAddress: this.viewOptions.displayAddress,
                		displayPromotion: this.viewOptions.displayPromotion,
                		displayCode: this.viewOptions.displayCode,
                		displayQuantity: this.viewOptions.displayQuantity,
                		displayDiscount: this.viewOptions.displayDiscount,
                		displayPayment: this.viewOptions.displayPayment,
                		redirect: this.viewOptions.redirect,
                    });
                    
                    // render the view
                    this.region.show(this.paymentCheckoutLayoutView);                	
                } else {
                	this.paymentCheckoutLayoutView = new WMAPP.Extension.Payment.Checkout.View.PaymentCheckoutMessage({
                		message: this.message,
                	});
                	
                    // render the view
                    this.region.show(this.paymentCheckoutLayoutView);                 	
                }
            } else {
                WMAPP.Log.getLogger("WMAPP.Payment.Checkout").trace("Payment.Checkout createView region required");
            }
        } else {
            WMAPP.Log.getLogger("WMAPP.Payment.Checkout").trace("Payment.Checkout createView options required");
        }
        WMAPP.Log.getLogger("WMAPP.Payment.Checkout").trace("Payment.Checkout createView end");
    },
}));

WMAPP.module('Extension.Payment.Checkout.View', function (View) {
    View.vent = WMAPP.Extension.Payment.Checkout.getChannel().vent;

    View.PaymentCheckoutLayout = WMAPP.Extension.View.LayoutView.extend({
    	initialize: function() {
    		this.listenTo(this.model, 'sync', this.render);
    	},
    	template: function(data) {
    		var model = data.model;
    		var options = data.options;

        	var tmplStr = '<div class="wmapp-payment-checkout-details"></div>' +
        	'<div class="wmapp-payment-checkout-order"></div>' +
        	'<div class="wmapp-payment-checkout-promotion"></div>' +
        	'<div class="wmapp-payment-checkout-payment"></div>';
        	
        	return tmplStr;
        },
		templateHelpers:function(){
			return {
				model: this.model,
				options: this.options
			}
		},        
        regions: {
        	details: '.wmapp-payment-checkout-details',
            promotion: '.wmapp-payment-checkout-promotion',
            order: '.wmapp-payment-checkout-order',
            payment: '.wmapp-payment-checkout-payment',
        },
    	options: {
    		paymentTypes: {},
    		status: 'checkout',
    		displayAddress: true,
    		displayPromotion: true,
    		displayQuantity: true,
    		displayPrice: true,
    		displayDiscount: true, 
    		displayPayment: true, 
    	},        
        onRender: function() {
            // TODO here this.model.get('_member_id') is a plain JavaScript object instead
            // of Backbone model!!
        	if (this.model.get('_member_id')) {
        		if (!this.model.get('_member_id').get('_member_addresss')) {
            		this.model.get('_member_id').set('_member_addresss', new WMAPP.Core.Model.MemberAddressCollection());
            	}

            	if (this.options.status == 'checkout') {
            		if (this.options.displayAddress) {
            			var details = new WMAPP.Extension.Payment.Checkout.View.PaymentCheckoutDetailsLayout ({
            				model: this.model.get('_member_id'),
            				invoice: this.model,
            				redirect: this.options.redirect,
            			}); 
            			this.details.show(details);
            		}

                    if (this.options.displayPromotion) {
                        var promotion = new WMAPP.Extension.Payment.Checkout.View.PaymentCheckoutPromotionForm ({
                            model: this.model.get('_promotion_id'),
                            invoice: this.model
                        });
                        this.promotion.show(promotion);
                    }
            	}
            	
                var order = new WMAPP.Extension.Payment.Checkout.View.PaymentCheckoutOrderLayout ({
                    model: this.model,
                    collection: this.model.get('_invoice_line_items'),
            		displayCode: this.options.displayCode,
            		displayQuantity: this.options.displayQuantity,
            		displayDiscount: this.options.displayDiscount,                   
                });
                this.order.show(order);
                
                if (this.options.displayPayment) {
    	            var payment = new WMAPP.Extension.Payment.Checkout.View.PaymentCheckoutPaymentLayout ({
    	                model: this.model, 
    	                collection: this.options.paymentTypes,
    	            });             	
    	            this.payment.show(payment);
                }        		
        	}
        },
    });	 
    
    View.PaymentCheckoutDetailsLayout = WMAPP.Extension.View.LayoutView.extend({
    	template: function() {
    		var ele = '<fieldset><legend>Your Details</legend>' +
    		'<div class="wmapp-form">' +
    		'<div class="wmapp-payment-checkout-member-fields"></div>' +
    		'</div>' +
    		'</fieldset>';
    		return ele;
    	},
		initialize: function() {
			this.options.layoutId = 'Member';
			if (this.model) {
				Backbone.Validation.bind(this);
			}
		},    	
		regions: {
			memberField: '.wmapp-payment-checkout-member-fields',
			memberAddressField: '.wmapp-payment-checkout-member-addresses',
		},
		
        onUpdateMember: function(model) {
    		if (WMAPP.member.id) {
    			// persist to server
    			var response = model.save().then(function(model, response) {
	                	WMAPP.Helper.showMessage('success', 'The address has been saved');
	                	WMAPP.Helper.wmAjaxEnd();
	                }, function(response) {
	                    if (response.responseJSON) {
	                    	if (response.responseJSON.message) {
	                    		WMAPP.Helper.showMessage('alert', response.responseJSON.message);
	    	                    WMAPP.Helper.wmAjaxEnd();
	                    	}
	                    } else if (response.statusText && response.status) {
	                    	WMAPP.Helper.showMessage('alert', "Error ("+response.status+"): " + response.statusText);
	                    } else {
	                    	WMAPP.Helper.showMessage('alert', "An unknown error has occurred.");
	                    }
	                }//,
	                //wait: true,
	                //async: false,
	            //}
				);
    		}

    		// set every other address selected to false
			_.each(this.model.get('_member_addresss').models, function(model) {
				model.set('selected', false);
			}, this);
    		
    		// add the address to the member
			model.set('selected', true);
    		this.model.get('_member_addresss').add(model);
    		
    		if (model.get('id')) {
    			this.options.invoice.get('_invoice_address_id').set({
    				'_member_address_id': model,
    				'member_address_id': model.get('id'),
    				'address': model.get('address'),
    				'address_2': model.get('address_2'),
    				'suburb': model.get('suburb'),
    				'state': model.get('state'),
    				'postcode': model.get('postcode'),
    				'country': model.get('country'),    				
    			}, {silent: true});
    			
    			this.options.invoice.updateInvoice();
    		}
    		
    		WMAPP.Extension.Payment.Checkout.View.vent.trigger('trigger:paymentCheckout:onPaymentCheckoutAddressChanged');
        },
        onUpdateAddress: function(model) {
    		if (model && model.get('id')) {
    			this.options.invoice.get('_invoice_address_id').set({
    				'_member_address_id': model,
    				'member_address_id': model.get('id'),
    				'address': model.get('address'),
    				'address_2': model.get('address_2'),
    				'suburb': model.get('suburb'),
    				'state': model.get('state'),
    				'postcode': model.get('postcode'),
    				'country': model.get('country'),
    			}, {silent: true});
    		} else {
    			this.options.invoice.get('_invoice_address_id').set({
    				'_member_address_id': new WMAPP.Core.Model.MemberAddress(),
    				'member_address_id': 0,
    				'address': '',
    				'address_2': '',
    				'suburb': '',
    				'state': '',
    				'postcode': '',
    				'country': 0,
    			}, {silent: true});    			
    		}
    		
    		this.options.invoice.updateInvoice();
    		
    		WMAPP.Extension.Payment.Checkout.View.vent.trigger('trigger:paymentCheckout:onPaymentCheckoutAddressChanged');
        },        
		templateHelpers:function(){
			return {
				model: this.model
			}
		},
        onRender: function() {	
        	if (!this.model || !this.model.get('id')) {
        		// login/register
        		console.log(this.options.redirect);
                var loginOptions = {
                        register_automatically: true,
                        region: this.memberField,
                        loginLabel: 'Email',
                        passwordLabel: 'Password',
                        redirect: this.options.redirect,
                    }

                    var vent = WMAPP.Extension.UserLogin.getChannel().vent;
                    this.listenTo(vent, 'trigger:userLogin:onUserLoggedInAndInGroups', this.onStartAfterLogin);
                    WMAPP.Extension.UserLogin.Application.createView(loginOptions);        		
        		
        	} else {
                // Member fields
                var paymentCheckoutMember = new WMAPP.Extension.View.MemberFields({
                    model: this.model,
                    fieldId: 'Member',
                    fieldClass: '',
                    tooltip: 'Member',
                    emailNotify: false,
                    displayActive: false,
                    displayPhone: false,
                    displayEmail: false,
                    displayLabels: true,
                    displayAddress: true,
                    displayReadonly: true,
                    selectedAddress: this.options.invoice.get('_invoice_address_id').get('member_address_id'),
                });
                
                this.listenTo(paymentCheckoutMember, 'trigger:coreMemberAddressSubmit', this.onUpdateMember);
                this.listenTo(paymentCheckoutMember, 'trigger:coreMemberAddressSelect', this.onUpdateAddress);
                
    			this.memberField.show(paymentCheckoutMember);  
        	}
		},		
    });	  

    View.PaymentCheckoutOrderLayout = WMAPP.Extension.View.LayoutView.extend({
    	template: function(data) {
    		var model = data.model;
    		var options = data.options;
    		
    		var tmplStr = '<fieldset>' +
    		'<legend>Your Order</legend>' +
    		'<div class="row">' +
    		'<div class="columns large-12"><div class="wmapp-payment-checkout-order-table"></div></div>' +
    		'</div>' +
    		'</fieldset>';    		
        	
        	return tmplStr;
        },
        initialize: function() {
        	WMAPP.Extension.View.LayoutView.prototype.initialize.call(this);
        	
        	//this.listenTo(this.model, 'sync', this.render);
        },
        regions: {
        	orderTable: '.wmapp-payment-checkout-order-table',
        },
		modelEvents: {
			sync: function() {
				if (!this.isDestroyed) {
					this.render();
				}
			},
		},
		onRender: function() {
			console.error('onRender');
			var orderTable = new WMAPP.Extension.Payment.Checkout.View.PaymentCheckoutOrder({
                model: this.model,
                collection: this.collection,
        		displayCode: this.options.displayCode,
        		displayQuantity: this.options.displayQuantity,
        		displayDiscount: this.options.displayDiscount,                   
            });	
			
			this.orderTable.show(orderTable);	
		},        
    });
    
    View.PaymentCheckoutOrderLineItem = WMAPP.Extension.View.ItemView.extend({
    	tagName: 'tr',
    	template: function(data) {
			var options = data.options;
			console.log(options);
			var model = data.model;

			var tmplStr = '';
            if (options.displayCode) {
                tmplStr += '<td>' + model.get('sku') + '</td>';
            }

            if (options.displayQuantity) {
                tmplStr += '<td>' + model.get('quantity') + '</td>';
            }

			tmplStr += '<td>' + model.get('name') + '</td>';
			tmplStr += '<td>' + parseFloat(model.get('item_price')).toFixed(2) + '</td>';

            if (options.displayDiscount || options.invoice.get('promotion_id')) {
                tmplStr += '<td>' + parseFloat(model.get('discount_subtotal')).toFixed(2) + '</td>';
            }
			tmplStr += '<td>' + parseFloat(model.get('total')).toFixed(2) + '</td>';
			return tmplStr;

    	},
        templateHelpers:function(){
            return {
                model: this.model,
                options: {
                    displayCode: this.options.displayCode,
                    displayQuantity: this.options.displayQuantity,
                    displayDiscount: this.options.displayDiscount,   
                    invoice: this.options.invoice,
                }
            }
        },
    });
    
    View.PaymentCheckoutOrder = WMAPP.Extension.View.CompositeView.extend({
    	tagName: "table",
    	className: "wmapp-table",
    	id: "wmappTemplatePaymentOrder",
    	childView: View.PaymentCheckoutOrderLineItem,
    	childViewContainer: "tbody",
    	childViewOptions: function() {
    		return {
    			invoice: this.model,
    		}
    	},
		template: function(data){
			var model = data.model;
            var colspan = 3;
            if (data.displayCode && data.displayQuantity) {
                colspan = 3;
            } else if (!(data.displayCode || data.displayQuantity)) {
                colspan = 1;
            } else {
                colspan = 2;
            }


			var tmplStr = '<thead>';
			tmplStr += '	<tr>';
            if (data.displayCode) {
                tmplStr += '		<th>Code</th>';
            }

            if (data.displayQuantity) {
                tmplStr += '		<th>Qty</th>';
            }

			tmplStr += '		<th>Items(s)</th>';
			tmplStr += '		<th>Item Price</th>';

			if (data.displayDiscount || model.get('promotion_id')) {
                tmplStr += '		<th>Discount</th>';
            }

			tmplStr += '		<th>Total</th>';
			tmplStr += '	</tr>';
			tmplStr += '</thead>';
			tmplStr += '<tbody>';
			tmplStr += '</tbody>';
			tmplStr += '<tfoot>';
			tmplStr += '	<tr>';
			tmplStr += '		<th colspan="' + colspan + '"></th>';
			tmplStr += '		<th>Sub-total</th>';

			if (data.displayDiscount || model.get('promotion_id')) {
                tmplStr += '		<th>' + parseFloat(model.get('discount')).toFixed(2) + '</th>';
            }

			tmplStr += '		<th>' + parseFloat(model.get('subtotal')).toFixed(2) + '</th>';
			tmplStr += '	</tr>';
			tmplStr += '	<tr>';
			tmplStr += '		<th colspan="' + colspan + '"></th>';
			tmplStr += '		<th>Total</th>';

			if (data.displayDiscount || model.get('promotion_id')) {
                tmplStr += '		<th>&nbsp;</th>';
            }

			tmplStr += '		<th>' + parseFloat(model.get('total')).toFixed(2) + '</th>';
			tmplStr += '	</tr>';
			tmplStr += '</tfoot>';		
			
			return tmplStr;
		},
		templateHelpers:function(){
			return {
				model: this.model,
                displayCode: this.options.displayCode,
                displayQuantity: this.options.displayQuantity,
                displayDiscount: this.options.displayDiscount,
            }
		},  		
        onBeforeAddChild: function(childView) {
            childView.options.displayCode = this.options.displayCode;
            childView.options.displayQuantity = this.options.displayQuantity;
            childView.options.displayDiscount = this.options.displayDiscount;
        }
    });     
  
    
    View.PaymentCheckoutPaymentLayout = WMAPP.Extension.View.LayoutView.extend({
    	initialize: function() {
    		this.listenTo(WMAPP.Extension.Payment.Checkout.View.vent, 'trigger:paymentCheckout:onPaymentCheckoutAddressChanged', this.render);
    	},
        template: function() {
        	
        	var tmplStr = '<fieldset>' +
        	'<legend>Payment Options</legend>' +
        	'<div class="row">' +
        	'<div class="columns large-12"><div class="wmapp-payment-checkout-payment-options"></div></div>' +
        	'</div>' +
        	'</fieldset>';
        	
        	return tmplStr;
        },      
        regions: {
        	paymentOptions: '.wmapp-payment-checkout-payment-options',
        },   
		onRender: function() {
            if (this.model.get('_invoice_address_id') && this.model.get('_invoice_address_id').get('member_address_id')) {
    			var payment = new WMAPP.Extension.Payment.Checkout.View.PaymentForm({
                    model: this.model,
                    collection: this.collection,                
                });
            } else {
            	var payment = new WMAPP.Extension.Payment.Checkout.View.PaymentCheckoutMessage({
            		message:'<h3>Please create or select an address to continue</h3>',
            	});            	
            }
			this.paymentOptions.show(payment);	
		},         
    });	 
    
    View.PaymentCheckoutPromotionForm = WMAPP.Extension.View.ItemView.extend({
        template: function(data) {
        	var model = data.model;
        	var invoice = data.invoice;
        	
        	var htmlStr = '<fieldset>' +
	        '<legend>Promotional Code</legend>';
            if (invoice.get('_invoice_address_id') && invoice.get('_invoice_address_id').get('member_address_id')) {
            	htmlStr += '<div class="row">' +
    	        '<div class="columns large-12">If you have a promotional code, please enter it here, then press "Apply"</div>' +
    	        '</div>' +
    	        '<div class="row">' +
    	        '<div class="columns large-3">Code</div>' +
    	        '<div class="columns large-9">' +
    	        '<div class="row collapse">' +
    	        '<div class="small-10 columns">' +
    	        '<input type="text" placeholder="Code" class="wmapp-payment-checkout-promotional-code"';
            	//console.log('PROMO', model);
    	        if(model.get('id')) {
    	        	htmlStr += ' disabled="disabled" value="' + model.get('code') + '"';
    	        }
    	        
    	        htmlStr += '></div>' +
    	        '<div class="small-2 columns">';
    	        
    	        if(model.get('id')) {
    	        	htmlStr += '<button class="button alert postfix wmapp-payment-checkout-promotional-code-button-cancel">Cancel</button>';
    	        } else {
    	        	htmlStr += '<button class="button postfix wmapp-payment-checkout-promotional-code-button">Apply</button>';
    	        }
    	        
    	        htmlStr += '</div>' +
    	        '</div' +		
    	        '</div>' +
    	        '</div>';
            } else {
            	htmlStr += '<h3>Please create or select an address to continue</h3>';            	
            }        	
            htmlStr += '</fieldset>';       	
        	return htmlStr;
        },
    	initialize: function() {
    		this.listenTo(WMAPP.Extension.Payment.Checkout.View.vent, 'trigger:paymentCheckout:onPaymentCheckoutAddressChanged', this.render);
    	},
        ui: {
        	'codeField' : '.wmapp-payment-checkout-promotional-code',
        },
    	events: {
    		"click .wmapp-payment-checkout-promotional-code-button": "onApplyCode",
    		"click .wmapp-payment-checkout-promotional-code-button-cancel": "onCancelCode",
    	},
		templateHelpers:function(){
			return {
				model: this.model,
				invoice: this.options.invoice
			}
		},    	
		onApplyCode: function(e) {
			if (!$(e.target).hasClass('disabled')) {
				e.preventDefault();
				e.stopPropagation();
				this.model.set('code', this.ui.codeField.val());
				this.model.set('action', 'apply');				
				WMAPP.Extension.Payment.Checkout.View.vent.trigger('trigger:paymentCheckout:onPaymentCheckoutPromotionalCodeEvent');			
			}
        },
        onCancelCode: function(e) {
			if (!$(e.target).hasClass('disabled')) {
				e.preventDefault();
				e.stopPropagation();				
				this.model.set('code', 0);
				this.model.set('action', 'cancel');
				WMAPP.Extension.Payment.Checkout.View.vent.trigger('trigger:paymentCheckout:onPaymentCheckoutPromotionalCodeEvent');			
			}
        },        
    });	     
    
	View.PaymentForm = WMAPP.Extension.View.LayoutView.extend({
		options: {
			// If set, adds target to the form head
			// Useful for listening to an iframe and listening for a page load
			target: '',
			confirm: false,
			// Any fields here will be added as hidden field inputs on the form
			// Very useful for fraud prevention
			hiddenFields: {},
			// Overrides the default labels, if set
			// Only currently set for eWay forms
			fieldLabels: {
				cardHolderName: '',
				cardNumber: '',
				cardCvn: '',
			},
		},
		template: null,
		initialize: function(options){
			_.bindAll(this, 'afterRender');
	        var _this = this; 
	        this.render = _.wrap(this.render, function(render) { 
	            render(); 
	            _this.afterRender(); 
	            return _this; 
	        });				
			
			options = _.extend(this.options, options);

            // this is the payment options form
    		var paymentRegions = new Array();
    		
    		var i = 0;
    		if (this.options.collection && this.options.collection.models.length) {
    			// if we only have one payment type, dont display an accordian
    			if (this.options.collection.models.length == 1) {
    				var paymentType = this.options.collection.models[0];
    				this.addRegion(WMAPP.Helper.tableName(paymentType.get('name')), '.wmapp-payment-form-' + WMAPP.Helper.tableName(paymentType.get('name')));
    				paymentRegions[WMAPP.Helper.tableName(paymentType.get('name'))] = '.wmapp-payment-form-' + WMAPP.Helper.tableName(paymentType.get('name'));
    				var tmplStr = '';
    				tmplStr += '<div class="wmapp-payment-form-'+WMAPP.Helper.tableName(paymentType.get('name'))+'"></div>';
    			} else {
    				var tmplStr = '<dl class="accordion" data-accordion>';
            		this.options.collection.each(function(paymentType, key) {
            			if (WMAPP.parameters == undefined || (WMAPP.parameters != undefined && WMAPP.parameters.result != undefined && WMAPP.parameters.result == 'confirm' && WMAPP.parameters.pid != undefined && WMAPP.parameters.pid == paymentType.get('id'))) {
                			this.addRegion(WMAPP.Helper.tableName(paymentType.get('name')), '.wmapp-payment-form-' + WMAPP.Helper.tableName(paymentType.get('name')));
                			paymentRegions[WMAPP.Helper.tableName(paymentType.get('name'))] = '.wmapp-payment-form-' + WMAPP.Helper.tableName(paymentType.get('name'));
                			
            				var className = '.wmapp-payment-form-' + WMAPP.Helper.tableName(paymentType.get('name'));
            				tmplStr += '<dd class="accordion-navigation' + ((i == 0) ? ' active' : '' ) + '">';
            				tmplStr += '    <a href="#' + WMAPP.Helper.tableName(paymentType.get('name')) + '" class="accordion-icon">' + paymentType.get('name') + '</a>';
            				tmplStr += '    <div id="' + WMAPP.Helper.tableName(paymentType.get('name')) + '" class="content' + ((i == 0) ? ' active' : '' ) + '">';
            				tmplStr += '		<div class="wmapp-payment-form-'+WMAPP.Helper.tableName(paymentType.get('name'))+'"></div>';
            				tmplStr += '    </div>';
            				tmplStr += '</dd>';  
            				
            				++i;
            			}
            		}, this);      				
            		tmplStr += '</dl>';
    			}
    		} else {
    			var tmplStr = '<dl class="accordion" data-accordion>';
    			
    			this.addRegion('placeorder', '.wmapp-payment-form-placeorder');
    			paymentRegions['placeorder'] = '.wmapp-payment-form-placeorder';
    			
				var className = '.wmapp-payment-form-placeorder';
				tmplStr += '<dd class="accordion-navigation' + ((i == 0) ? ' active' : '' ) + '">';
				tmplStr += '    <a href="#' + WMAPP.Helper.tableName('Place Order') + '" class="accordion-icon">Place Order</a>';
				tmplStr += '    <div id="' + WMAPP.Helper.tableName('Place Order') + '" class="content' + ((i == 0) ? ' active' : '' ) + '">';
				tmplStr += '		<div class="wmapp-payment-form-placeorder"></div>';
				tmplStr += '    </div>';
				tmplStr += '</dd>';
				
				tmplStr += '</dl>';
    		}

    		this.regions = paymentRegions;

			
			this.template = _.template(tmplStr);
		},
		afterRender: function() {
			if(_.isObject(this.regions) && this.options.collection && this.options.collection.models.length) {
				for(var regionName in this.regions) {
					var model = _.find(this.options.collection.models, function(paymentType) { return paymentType.get('type') == WMAPP.Helper.tableName(regionName); });
					var modelName = 'Payment' + WMAPP.Helper.upperCaseFirst(regionName);
					var paymentName = regionName + 'PaymentForm';
					var ucFirstPaymentName =  WMAPP.Helper.upperCaseFirst(regionName) + 'PaymentForm';
		            this[paymentName] = new WMAPP.Extension.Payment.Checkout.View[ucFirstPaymentName]({
		            	confirm: this.options.confirm,
		            	model: model,
		            	layoutId: modelName,
		            	formId: modelName,
						target: this.options.target,
						hiddenFields: this.options.hiddenFields,
						fieldLabels: this.options.fieldLabels,
		            });
		            
		            this[regionName].show(this[paymentName]); 

		            // listen to the regions to see if the forms have been submitted
		            this.listenTo(this[paymentName], 'trigger:formSubmit', function(model, view) { WMAPP.Extension.Payment.Checkout.View.vent.trigger('trigger:paymentCheckout:onPaymentCheckoutPaymentButtonClick', model, view); }, this); 
				}
			} else {
    			var model = new WMAPP.Core.Model.PaymentType({
    				type: 'placeorder',
    				name: 'Place Order',
    				credit_card: new WMAPP.Extension.Model.AbstractModel(),
    			});

				var modelName = 'PaymentPlaceorder';
				var paymentName = 'PlaceorderPaymentForm';
				var ucFirstPaymentName = 'PlaceorderPaymentForm';
	            this[paymentName] = new WMAPP.Extension.Payment.Checkout.View[ucFirstPaymentName]({
	            	confirm: this.options.confirm,
	            	model: model,
	            	layoutId: modelName,
	            	formId: modelName,
					target: this.options.target,
					hiddenFields: this.options.hiddenFields,
					fieldLabels: this.options.fieldLabels,
	            });
	            
	            this.placeorder.show(this[paymentName]); 

	            // listen to the regions to see if the forms have been submitted
	            this.listenTo(this[paymentName], 'trigger:formSubmit', function(model, view) { WMAPP.Extension.Payment.Checkout.View.vent.trigger('trigger:paymentCheckout:onPaymentCheckoutPaymentButtonClick', model, view); }, this);     			
			}
		},
	});
	
	View.CreditCardForm = WMAPP.Extension.View.LayoutView.extend({
		options: {
			showCardType: true
		},
		regions: {
			cardHoldersNameField: '.wmapp-payment-form-credit-card-holders-name',
	    	cardTypeField: '.wmapp-payment-form-credit-card-type',
	    	cardNumberField: '.wmapp-payment-form-credit-card-number',
	    	cardCvnField: '.wmapp-payment-form-credit-card-cvn',
	    	cardExpiryMonthField: '.wmapp-payment-form-credit-card-expiry-month',
	    	cardExpiryYearField: '.wmapp-payment-form-credit-card-expiry-year',    			
		}, 	
		initialize: function(options){
			_.bindAll(this, 'afterRender');
	        var _this = this; 
	        this.render = _.wrap(this.render, function(render) { 
	            render(); 
	            _this.afterRender(); 
	            return _this; 
	        });	
			
	        this.options.layoutId = this.options.formId;
	        
			options = _.extend(this.options, options);

			var tmplStr = '<div class="wmapp-payment-form-credit-card-holders-name input-container"></div>';
			tmplStr += '<div class="wmapp-payment-form-credit-card-type input-container"></div>';
			tmplStr += '<div class="wmapp-payment-form-credit-card-number input-container"></div>';
			tmplStr += '<div class="wmapp-payment-form-credit-card-cvn input-container"></div>';
			tmplStr += '<div class="wmapp-payment-form-credit-card-expiry-month input-container"></div>';
			tmplStr += '<div class="wmapp-payment-form-credit-card-expiry-year input-container"></div>';

			this.template = _.template(tmplStr);

			if (this.model) {
				Backbone.Validation.bind(this);
			}			
		},
		afterRender: function() {
			var cardHoldersName = new WMAPP.Extension.View.TextField({
                model: this.model,
                fieldId: this.options.formId + 'CardHoldersName',
                fieldClass: '',
                tooltip: 'Card Holders Name',
                placeholder: 'Card Holders Name',
                label: 'Card Holders Name',
                name: 'card_holders_name',
            });
            
			if (this.options.showCardType) {
				var options = new Backbone.Collection([{type: 'VISA', name: 'VISA'}, {type: 'MASTERCARD', name: 'MASTERCARD'}]);
	            var cardType = new WMAPP.Extension.View.ComboBox({
	                model: this.model,
	                fieldId: this.options.formId + 'CardType',
	                fieldClass: '',
	                tooltip: 'Card Type',
	                placeholder: 'Card Type',
	                label: 'Card Type',
	                name: 'card_type',
	                valueField: 'type',	
	    			optionField: 'name',                
	                options: options,                
	                empty: {"value": "", "option": "Card Type"},
	            });	
			} else {
				this.model.validation['card_type'] = { required: false };
			}

            var cardNumber = new WMAPP.Extension.View.TextField({
                model: this.model,
                fieldId: this.options.formId + 'CardNumber',
                fieldClass: '',
                tooltip: 'Card Number',
                placeholder: 'Card Number',
                label: 'Card Number',
                name: 'card_number',
            });
            
            var cardCvn = new WMAPP.Extension.View.TextField({
                model: this.model,
                fieldId: this.options.formId + 'CardCvn',
                fieldClass: '',
                tooltip: 'Card CVN',
                placeholder: 'Card CVN',
                label: 'Card Cvn',
                name: 'card_cvn',
            });
            
            var months = new Backbone.Collection([{month: '01', name: 'JAN'}, { month: '02', name: "FEB"}, { month: '03', name: "MAR"}, { month: '04', name: "APR"}, { month: '05', name: "MAY"}, { month: '06', name: "JUN"}, { month: '07', name: "JUL"}, { month: '08', name: "AUG"}, { month: '09', name: "SEP"}, { month: '10', name: "OCT"}, { month: '11', name: "NOV"}, { month: '12', name: "DEC"}]);
            var cardExpiryMonth = new WMAPP.Extension.View.ComboBox({
                model: this.model,
                fieldId: this.options.formId + 'CardExpiryMonth',
                fieldClass: '',
                tooltip: 'Expiry Month',
                label: 'Expiry Month',
                name: 'card_expiry_month',
                valueField: 'month',	
    			optionField: 'name',                
                options: months,               
                empty: {"value": "", "option": "Month"},
            });
            
            var year = parseInt(moment().format('YYYY'));
            var years = new Backbone.Collection();
            for (var i = 0; i < 15; i++) {
            	var addYear = year + i;
            	years.add({year: addYear, name: addYear})
            }
            var cardExpiryYear = new WMAPP.Extension.View.ComboBox({
                model: this.model,
                fieldId: this.options.formId + 'CardExpiryYear',
                fieldClass: '',
                tooltip: 'Expiry Year',
                label: 'Expiry Year',
                name: 'card_expiry_year',
                valueField: 'year',	
    			optionField: 'name',                
                options: years,
                empty: {"value": "", "option": "Year"},
            });             
            
        	
            this.cardHoldersNameField.show(cardHoldersName);	
            if (this.options.showCardType) {
            	this.cardTypeField.show(cardType);	
            }
			this.cardNumberField.show(cardNumber);
			this.cardCvnField.show(cardCvn);	
			this.cardExpiryMonthField.show(cardExpiryMonth);	
			this.cardExpiryYearField.show(cardExpiryYear);	
	
		},		
	});

    View.EwayCreditCardForm = WMAPP.Extension.View.LayoutView.extend({
		options: {
			// Any fields here will be added as hidden field inputs on the form
			// Very useful for fraud prevention
			hiddenFields: {},
			// Overrides the default labels, if set
			fieldLabels: {},
		},
        regions: {
            cardHoldersNameField: '.wmapp-payment-form-credit-card-holders-name',
            cardNumberField: '.wmapp-payment-form-credit-card-number',
            cardCvnField: '.wmapp-payment-form-credit-card-cvn',
            cardExpiryMonthField: '.wmapp-payment-form-credit-card-expiry-month',
            cardExpiryYearField: '.wmapp-payment-form-credit-card-expiry-year',
        },
        initialize: function(options){
            _.bindAll(this, 'afterRender');
            var _this = this;
            this.render = _.wrap(this.render, function(render) {
                render();
                _this.afterRender();
                return _this;
            });

            this.options.layoutId = this.options.formId;

            options = _.extend(this.options, options);

            var tmplStr = '<div class="wmapp-payment-form-credit-card-holders-name input-container"></div>';
            tmplStr += '<div class="wmapp-payment-form-credit-card-type input-container">' +
                '<input type="hidden" name="EWAY_PAYMENTTYPE" value="Credit Card" id="EwayPaymenttype"/>' +
                '   <input type="hidden" name="EWAY_ACCESSCODE" value="<<AccessCode Goes Here>> id="EwayAccesscode" />';
            tmplStr += '<div class="wmapp-payment-form-credit-card-number input-container"></div>';
            tmplStr += '<div class="wmapp-payment-form-credit-card-cvn input-container"></div>';
            tmplStr += '<div class="wmapp-payment-form-credit-card-expiry-month input-container"></div>';
            tmplStr += '<div class="wmapp-payment-form-credit-card-expiry-year input-container"></div>';

			_.map(options.hiddenFields, function(v, k) {
				tmplStr += '<input type="hidden" name="' + WMAPP.Helper.escape(k) + '" value="' + WMAPP.Helper.escape(v) + '"/>';
			});

            this.template = _.template(tmplStr);

            if (this.model) {
                Backbone.Validation.bind(this);
            }
        },
        afterRender: function() {
            var cardHoldersName = new WMAPP.Extension.View.TextField({
                model: this.model,
                fieldId: this.options.formId + 'EwayCardname',
                fieldClass: '',
                tooltip: 'The name on the credit card',
                placeholder: 'Card Holders Name',
				// Have we provided an alternative label for card holder name? If so, use that
                label: ((this.options.fieldLabels && this.options.fieldLabels.cardHolderName) || 'Card Holders Name'),
                name: 'EWAY_CARDNAME',
            });

            var cardNumber = new WMAPP.Extension.View.TextField({
                model: this.model,
                fieldId: this.options.formId + 'EwayCardnumber',
                fieldClass: '',
                tooltip: 'The number on the credit card',
                placeholder: 'Card Number',
                label: ((this.options.fieldLabels && this.options.fieldLabels.cardNumber) || 'Card Number'),
                name: 'EWAY_CARDNUMBER',
            });

            var cardCvn = new WMAPP.Extension.View.TextField({
                model: this.model,
                fieldId: this.options.formId + 'EwayCardcvn',
                fieldClass: '',
                tooltip: 'The card verification number, also commonly called ccv or cvc. This is usually found on the back of the card',
                placeholder: 'Card CVN',
                label: ((this.options.fieldLabels && this.options.fieldLabels.cardCvn) || 'Card Cvn'),
                name: 'EWAY_CARDCVN',
            });

            var months = new Backbone.Collection([{month: '01', name: 'JAN'}, { month: '02', name: "FEB"}, { month: '03', name: "MAR"}, { month: '04', name: "APR"}, { month: '05', name: "MAY"}, { month: '06', name: "JUN"}, { month: '07', name: "JUL"}, { month: '08', name: "AUG"}, { month: '09', name: "SEP"}, { month: '10', name: "OCT"}, { month: '11', name: "NOV"}, { month: '12', name: "DEC"}]);
            var cardExpiryMonth = new WMAPP.Extension.View.ComboBox({
                model: this.model,
                fieldId: this.options.formId + 'EwayCardexpirymonth',
                fieldClass: '',
                tooltip: 'The month that the card expires',
                label: 'Expiry Month',
                name: 'EWAY_CARDEXPIRYMONTH',
                valueField: 'month',
                optionField: 'name',
                options: months,
                empty: {"value": "", "option": "Month"},
            });

            var year = parseInt(moment().format('YYYY'));
            var years = new Backbone.Collection();
            for (var i = 0; i < 15; i++) {
                var addYear = year + i;
                years.add({year: addYear, name: addYear})
            }
            var cardExpiryYear = new WMAPP.Extension.View.ComboBox({
                model: this.model,
                fieldId: this.options.formId + 'EwayCardexpiryyear',
                fieldClass: '',
                tooltip: 'The year that the card expires',
                label: 'Expiry Year',
                name: 'EWAY_CARDEXPIRYYEAR',
                valueField: 'year',
                optionField: 'name',
                options: years,
                empty: {"value": "", "option": "Year"},
            });


            this.cardHoldersNameField.show(cardHoldersName);
            if (this.options.showCardType) {
                this.cardTypeField.show(cardType);
            }
            this.cardNumberField.show(cardNumber);
            this.cardCvnField.show(cardCvn);
            this.cardExpiryMonthField.show(cardExpiryMonth);
            this.cardExpiryYearField.show(cardExpiryYear);

        },
    });
	
	/**
	 * Extend the Item View to make a combo box
	 */
	View.EwayPaymentForm = WMAPP.Extension.View.BaseForm.extend({
		options: {
			// If set, adds target to the form head
			// Useful for listening to an iframe and listening for load
			target: '',
			// Any fields here will be added as hidden field inputs on the form
			// Very useful for fraud prevention
			hiddenFields: {},
			fieldLabels: {},
		},
		regions: {
			creditCardField: '.wmapp-payment-form-eway-credit-card', 			
		}, 		
		initialize: function(options){
			_.bindAll(this, 'afterRender');
	        var _this = this; 
	        this.render = _.wrap(this.render, function(render) { 
	            render(); 
	            _this.afterRender(); 
	            return _this; 
	        });	
			
	        this.options.layoutId = this.options.formId;
	        
			options = _.extend(this.options, options);

			var tmplStr = '<form method="POST" id="'+options.formId+'"';
			if(options.formClass !== null) {
				tmplStr += (' class="' + options.formClass + '"');
			}
			tmplStr += ' action=""';
			if (options.target) {
				tmplStr += (' target="' + options.target + '"');
			}
			tmplStr += '>';
			
			if (options.fieldset) {
				tmplStr += '<fieldset>';
				if(_.isString(options.legend)) {
					tmplStr += '<legend>'+options.legend+'</legend>';
				}				
			}

            tmplStr += '<div class="wmapp-eway-form-warning">';
            tmplStr += '<p>Please don\'t refresh the page after submitting your payment details</p>';
            tmplStr += '</div>';
			tmplStr += '<div class="wmapp-form">';
			tmplStr += '    <div class="wmapp-payment-form-eway-credit-card">';
            tmplStr += '        <form method="POST" action="<<FormActionURL Goes Here>>" id="payment_form" ';
			if (options.target) {
				tmplStr += (' target="' + options.target + '"');
			}
			tmplStr += '>\n' +
                '  <input type="hidden" name="EWAY_ACCESSCODE" value="<<AccessCode Goes Here>>" />\n' +
                '  <input type="hidden" name="EWAY_PAYMENTTYPE" value="Credit Card" />\n' +
                '  Card Name: <input type="text" name="EWAY_CARDNAME" />\n' +
                '  Card Number: <input type="text" name="EWAY_CARDNUMBER" />\n' +
                '  Card Expiry Month: <input type="text" name="EWAY_CARDEXPIRYMONTH" />\n' +
                '  Card Expiry Year: <input type="text" name="EWAY_CARDEXPIRYYEAR" />\n' +
                '  Card CVN: <input type="text" name="EWAY_CARDCVN" />\n' +
                '</form> ';
            tmplStr +=  '   </div>';
			tmplStr += '</div>';
			
			if (options.saveLabel != false) {
				tmplStr += '<button type="button" class="wmapp-submit-button" id="'+options.formId+'Save">Pay Now</button>';
			}	
			tmplStr += '&nbsp;';	
			if (false) {	
				tmplStr += '<button type="button" class="wmapp-cancel-button alert" id="'+options.formId+'Cancel">'+options.cancelLabel+'</button>';
			}
			
			if (this.options.fieldset) {
				tmplStr += '</fieldset>';
			}
			
			tmplStr += '</form>';
			this.template = _.template(tmplStr);

			this.model.set("credit_card", null);
			this.model.set("credit_card", new WMAPP.Extension.Payment.Model.EwayPaymentCreditCard());

			if (this.model) {
				Backbone.Validation.bind(this);
			}			
		},
		afterRender: function() {
			
			var creditCardField = new WMAPP.Extension.Payment.Checkout.View.EwayCreditCardForm({
				model: this.model.get('credit_card'),
				formId: this.options.formId + 'CreditCard',
				hiddenFields: this.options.hiddenFields,
				fieldLabels: this.options.fieldLabels,
			});
            
            this.creditCardField.show(creditCardField);	
		},
	});
	
	/**
	 * Extend the Item View to make a combo box
	 */
	View.PaypalPaymentForm = WMAPP.Extension.View.BaseForm.extend({
		regions: {
    			tokenField: '.wmapp-payment-form-payment-confirm-token',
    	    	payerIdField: '.wmapp-payment-form-payment-payer-id',  			
    	}, 		
		initialize: function(options){
			_.bindAll(this, 'afterRender');
	        var _this = this; 
	        this.render = _.wrap(this.render, function(render) { 
	            render(); 
	            _this.afterRender(); 
	            return _this; 
	        });	
			
			options = _.extend(this.options, options);

			if (options.fieldset) {
				tmplStr += '<fieldset>';
				if(_.isString(options.legend)) {
					tmplStr += '<legend>'+options.legend+'</legend>';
				}				
			}			
			
			var tmplStr = '<form id="'+options.formId+'"';
			if(options.formClass !== null) {
				tmplStr += (' class="' + options.formClass + '"');
			}
			tmplStr += '>';

			this.model.unset('credit_card');
			if (WMAPP.parameters != undefined && WMAPP.parameters.result != undefined && WMAPP.parameters.result == 'confirm') {	
				this.model.set('credit_card', new WMAPP.Extension.Model.AbstractModel({
					'token': WMAPP.parameters.token,
					'payer_id': WMAPP.parameters.PayerID,
				}));
				
				tmplStr += '<div class="wmapp-payment-form-payment-confirm-token"></div>';
				tmplStr += '<div class="wmapp-payment-form-payment-payer-id"></div>';
				if (options.saveLabel != false) {
					tmplStr += '<button type="button" class="wmapp-submit-button" id="'+options.formId+'Save">Pay Now</button>';
				}	
			} else {
				this.model.set('credit_card', new WMAPP.Extension.Model.AbstractModel());
                // If there is no account app id, then this is the two step process
				if (this.model.get('settings') && (!this.model.get('settings').account_app_id)) {
					this.model.set('confirm', true);
				}
				
				tmplStr += '<a class="wmapp-submit-button" data-paypal-button="true">';
				tmplStr += '	<img src="//www.paypal.com/en_US/i/btn/btn_xpressCheckout.gif" alt="Checkout" />';
				tmplStr += '</a>';
			}
			
			if (this.options.fieldset) {
				tmplStr += '</fieldset>';
			}

			tmplStr += '</form>';
			this.template = _.template(tmplStr);

			if (this.model) {
				Backbone.Validation.bind(this);
			}			
		},
		afterRender: function() {
			if (WMAPP.parameters != undefined && WMAPP.parameters.result != undefined && WMAPP.parameters.result !== 'confirm') {	
				var tokenField = new WMAPP.Extension.View.HiddenField({
	                model: this.model.get('credit_card'),
	                fieldId: this.options.formId + 'Token',
	                fieldClass: '',
	                name: 'token',
	            });
				
				var payerIdField = new WMAPP.Extension.View.HiddenField({
	                model: this.model.get('credit_card'),
	                fieldId: this.options.formId + 'PayerId',
	                fieldClass: '',
	                name: 'payer_id',
	            });	
				
				this.tokenField.show(tokenField);
				this.payerIdField.show(payerIdField);
			}
		},
	});	
	
	/**
	 * Extend the Item View to make a combo box
	 */
	View.IntegrapayPaymentForm = WMAPP.Extension.View.BaseForm.extend({
		regions: {
			creditCardField: '.wmapp-payment-form-integra-credit-card', 			
		}, 		
		initialize: function(options){
			_.bindAll(this, 'afterRender');
	        var _this = this; 
	        this.render = _.wrap(this.render, function(render) { 
	            render(); 
	            _this.afterRender(); 
	            return _this; 
	        });	
			
	        this.options.layoutId = this.options.formId;
	        
			options = _.extend(this.options, options);

			var tmplStr = '<form id="'+options.formId+'"';
			if(options.formClass !== null) {
				tmplStr += (' class="' + options.formClass + '"');
			}
			tmplStr += '>';
			
			if (options.fieldset) {
				tmplStr += '<fieldset>';
				if(_.isString(options.legend)) {
					tmplStr += '<legend>'+options.legend+'</legend>';
				}				
			}

			tmplStr += '<h3>Credit Card</h3>';
			tmplStr += '<div class="wmapp-form">';
			tmplStr += '<div class="wmapp-payment-form-integra-credit-card"></div>';
			tmplStr += '</div>';
			
			if (options.saveLabel != false) {
				tmplStr += '<button type="button" class="wmapp-submit-button" id="'+options.formId+'Save">Pay Now</button>';
			}	
			tmplStr += '&nbsp;';	
			if (false) {	
				tmplStr += '<button type="button" class="wmapp-cancel-button alert" id="'+options.formId+'Cancel">'+options.cancelLabel+'</button>';
			}
			
			if (this.options.fieldset) {
				tmplStr += '</fieldset>';
			}
			
			tmplStr += '</form>';
			this.template = _.template(tmplStr);

			if (this.model) {
				Backbone.Validation.bind(this);
			}			
		},
		afterRender: function() {

			var creditCardField = new WMAPP.Extension.Payment.Checkout.View.CreditCardForm({
                model: this.model.get('credit_card'),
                formId: this.options.formId + 'CreditCard',
                showCardType: false,
            });
            
            this.creditCardField.show(creditCardField);	
            
            // add validation
            this.model.validation['credit_card'] = {
            	required: true,
            	model: 'Please check your credit card details'
            };
		},
	});	
	
	/**
	 * Extend the Item View to make a combo box
	 */
	View.BanktransferPaymentForm = WMAPP.Extension.View.BaseForm.extend({	
		initialize: function(options){
			_.bindAll(this, 'afterRender');
	        var _this = this;
	        this.render = _.wrap(this.render, function(render) {
	            render();
	            _this.afterRender();
	            return _this;
	        });

	        this.options.layoutId = this.options.formId;

			options = _.extend(this.options, options);

			if (this.model) {
				Backbone.Validation.bind(this);
			}
		},
		template: function (data) {
			var tmplStr = '<h3>Bank Transfer</h3>';
			tmplStr += '<div class="wmapp-payment-form-bank-transfer-transaction-ref-no"></div>';
			return tmplStr;
		},
		templateHelpers: function () {
			return {
				_options: this.options
			};
		},
		regions: {
			transactionRefNoField: '.wmapp-payment-form-bank-transfer-transaction-ref-no',
		},
		afterRender: function() {

            // var transactionRefNo = new WMAPP.Extension.View.TextField({
            //     model: this.model,
            //     fieldId: this.options.formId + 'TransactionRefNo',
            //     fieldClass: 'input-container',
            //     tooltip: 'Transaction Reference Number',
            //     placeholder: 'Transaction/Reference Number',
            //     label: 'Transaction/Reference Number',
            //     name: 'transaction_ref_no',
            // });
            //
            // this.transactionRefNoField.show(transactionRefNo);
            //
            // // add validation
            // this.model.validation['transaction_ref_no'] = {
            // 	required: true,
            // };
		},
	});	
	
	/**
	*Ensure that the model has a local_amount, local_currency, brandCode & paymentName in the root.
	 */
	View.AdyenPaymentForm = WMAPP.Extension.View.BaseForm.extend({
		regions: {
			adyenPaymentMethodsRegion: '.wmapp-payment-form-adyen', 			
		}, 		
		initialize: function(options){
			_.bindAll(this, 'afterRender');
	        var _this = this; 
	        this.render = _.wrap(this.render, function(render) { 
	            render(); 
	            _this.afterRender(); 
	            return _this; 
	        });

	        this.options.layoutId = this.options.formId;
	        
			options = _.extend(this.options, options);

			var tmplStr = '';
			tmplStr += '<form method="post" action="https://live.adyen.com/hpp/skipDetails.shtml" id="adyenForm" name="adyenForm" target="_parent" style="visibility:hidden; position: fixed;">';
			tmplStr += 		'<input type="hidden" name="merchantReference" value="SKINTEST-1519191422052" />';
			tmplStr +=		'<input type="hidden" name="merchantSig" value="" />';
			tmplStr +=		'<input type="hidden" name="resURL" value="http://' + window.location.hostname + '/home/redirect" />';
			tmplStr +=		'<input type="hidden" name="sessionValidity" value="" />';
			tmplStr +=		'<input type="hidden" name="merchantAccount" value="FX2SeComm" />';
			tmplStr +=		'<input type="hidden" name="paymentAmount" value="' + Math.round(options.model.get('local_amount').toFixed(2) * 100) + '" />';
			tmplStr +=		'<input type="hidden" name="currencyCode" value="' + options.model.get('local_currency') + '" />';
			tmplStr +=		'<input type="hidden" name="skinCode" value="VFGFyxMH" />';
			tmplStr +=		'<input type="hidden" name="brandCode" value="' + options.model.get('brandCode') + '" />';
			tmplStr +=		'<input type="hidden" name="issuerId" value="" />';
			tmplStr +=		'<input type="submit" value="Send" />';
			tmplStr += '</form>';

            tmplStr += '<div>Click Next to go to the ' + options.model.get('paymentName') + ' payment portal</div>';
			
			this.template = _.template(tmplStr);

			if (this.model) {
				Backbone.Validation.bind(this);
			}			
		},
		afterRender: function() {
			var that = this;
            WMAPP.Helper.showSpinner();
            $.ajax({
                type: 'POST',
                dataType: 'json',
                data: jQuery.param({merchantReference: "SKINTEST-1519191422052",
                    merchantAccount: "FX2SeComm",
                    paymentAmount: Math.round(that.options.model.get('local_amount').toFixed(2) * 100),
                    currencyCode: that.options.model.get('local_currency'),
                    skinCode: "VFGFyxMH",
                    brandCode: that.options.model.get('_payment_method_id').get('adyen_reference'),
                    issuerId: "",
                    resURL: 'http://' + window.location.hostname + '/home/redirect',
                }),
                url: '/feature/enrolmentpay/enrolmentpaypaymentstile/calculate_signature',
                custom: {pointer: this}
            }).then(function(response) {
                $('input[name="merchantSig"]').val(response[0]);
                $('input[name="sessionValidity"]').val(response[1]);
                WMAPP.Helper.hideSpinner();
            }, function() {
                console.error('error calculating adyen signature');
            });
		},
	});	
	
	/**
	 * Polipay integration ( now deprecated)
	 */
//	View.PolipayPaymentForm = WMAPP.Extension.View.BaseForm.extend({
//		regions: {
//			polipayPaymentMethodsRegion: '.wmapp-payment-form-polipay', 			
//		}, 		
//		initialize: function(options){
//			_.bindAll(this, 'afterRender');
//	        var _this = this; 
//	        this.render = _.wrap(this.render, function(render) { 
//	            render(); 
//	            _this.afterRender(); 
//	            return _this; 
//	        });	
//			
//	        this.options.layoutId = this.options.formId;
//	        
//			options = _.extend(this.options, options);
//
//			var tmplStr = '';
//			this.options.paymentType
//			tmplStr += '<form method="post" action="https://poliapi.apac.paywithpoli.com/api/v2/Transaction/Initiate" id="polipayForm" name="polipayForm" target="_parent" style="visibility:hidden; position: fixed;">';
//			tmplStr +=		'<input type="hidden" name="amount" value="' + this.options.model.get("amount_due") + '00" />';
//			tmplStr +=		'<input type="hidden" name="currencyCode" value="AUD" />';
//			tmplStr += 		'<input type="hidden" name="merchantReference" value="S6102904" />';
//			tmplStr +=		'<input type="hidden" name="successURL" value="https://test.crowdsites.com/home/6" />';
//			tmplStr +=		'<input type="hidden" name="failureURL" value="https://test.crowdsites.com/home/4" />';
//			tmplStr +=		'<input type="hidden" name="cancellationURL" value="https://test.crowdsites.com/home/1" />';
//			tmplStr +=		'<input type="hidden" name="merchantHomepageURL" value="https://test.crowdsites.com/home/5" />';
//			tmplStr += '</form>';
//			
//          window.location="https://poliapi.apac.paywithpoli.com/api/v2/Transaction/Initiate"
//			tmplStr += '<div>Here are your PoliPay Payment Options</div>';
	// Accessing the variable Payment Type created in enrolmentpay.paymentTile.view
//			tmplStr += '<p>'+this.options.model.get("amount_due")+'</p>';
//			tmplStr += '<p>'+this.options.paymentType.get("description")+'</p>';
//			tmplStr += '<div class="wmapp-payment-form-polipay"></div>';
//			
//			this.template = _.template(tmplStr);
//
//			if (this.model) {
//				Backbone.Validation.bind(this);
//			}	
//		},
//	});
	
	/**
	 * Extend the Item View to make a combo box
	 */
	View.PlaceorderPaymentForm = WMAPP.Extension.View.BaseForm.extend({	
		initialize: function(options){
			_.bindAll(this, 'afterRender');
	        var _this = this; 
	        this.render = _.wrap(this.render, function(render) { 
	            render(); 
	            _this.afterRender(); 
	            return _this; 
	        });	
			
			options = _.extend(this.options, options);

			if (options.fieldset) {
				tmplStr += '<fieldset>';
				if(_.isString(options.legend)) {
					tmplStr += '<legend>'+options.legend+'</legend>';
				}				
			}			
			
			var tmplStr = '<form id="'+options.formId+'"';
			if(options.formClass !== null) {
				tmplStr += (' class="' + options.formClass + '"');
			}
			tmplStr += '>';

			tmplStr += '<button type="button" class="wmapp-submit-button" id="'+options.formId+'Save">Place Order</button>';
			
			if (this.options.fieldset) {
				tmplStr += '</fieldset>';
			}

			tmplStr += '</form>';
			this.template = _.template(tmplStr);

			if (this.model) {
				Backbone.Validation.bind(this);
			}			
		},
	});		
	
    View.PaymentCheckoutMessage = WMAPP.Extension.View.ItemView.extend({
        template: function(data) {
        	return data.options.message;
        },  
		templateHelpers:function(){
			return {
				options: this.options
			}
		},        
    });
});

WMAPP.module('Extension.Payment.Model', function (Model) {
    Model.EwayPaymentCreditCard = WMAPP.Extension.Model.AbstractModel.extend({
        frontendUrlRoot: "/feature/paymenttype/api",
        backendUrlRoot:  "/admin/paymenttype/api",
        remote: function() {
            if (!WMAPP.isApp)
                return true;
        },
        relations: [

        ],
        validation: {
            EWAY_CARDNAME: {
                required: true,
                msg: "Card name is missing or invalid"
            },
            EWAY_CARDNUMBER: {
                required: true,
                minLength: 14,
                maxLength: 16,
                pattern: 'digits',
                msg: "Card number is missing or invalid"
            },
            EWAY_CARDCVN: {
                required: true,
                minLength: 3,
                maxLength: 4,
                pattern: 'digits',
                msg: "Card cvn is missing or invalid"

            },
            EWAY_CARDEXPIRYMONTH: {
                required: true,
                minLength: 2,
                maxLength: 2,
                pattern: 'digits',
                msg: "Expiry month is missing or invalid"
            },
            EWAY_CARDEXPIRYYEAR: {
                required: true,
                minLength: 4,
                maxLength: 4,
                pattern: 'digits',
                msg: "Expiry year is  missing or invalid"
            },
        },
    });
});

