'use strict';

/**
 * Payment - Cart Module
 */
WMAPP.module('Extension.Payment.Cart', Backbone.Marionette.Module.extend({
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
        WMAPP.Log.getLogger("WMAPP." + this.moduleName).trace("Payment.Cart Module onStart begin");
        WMAPP.Log.getLogger("WMAPP." + this.moduleName).trace("Payment.Cart Module onStart end");
    },
    onStop: function () {
        WMAPP.Log.getLogger("WMAPP." + this.moduleName).trace("Payment.Cart Module onStop begin");
        WMAPP.Log.getLogger("WMAPP." + this.moduleName).trace("Payment.Cart Module onStop end");
    },
}));

WMAPP.module('Extension.Payment.Cart.Application', Backbone.Marionette.Module.extend({
    startWithParent: true,
    alertMessage: null,
    successMessage: null,
    notificationMessage: null,
    vent: WMAPP.Extension.Payment.getChannel().vent,

    //---------------------------------GENERAL-----------------------------------------

    /**
     * Creates general cart view
     * @param options
     */
    createView: function(options) {
        WMAPP.Log.getLogger("WMAPP.Payment.Cart").trace("Hello");
        if (options) {
            this.viewOptions = options;
            if (this.viewOptions.region) {
                this.region = this.viewOptions.region;
                this.model = this.viewOptions.model;
                
                this.paymentCartLayoutView = new WMAPP.Extension.Payment.Cart.View.PaymentCartLayout({
                	model: this.model,
                	displayBack: this.viewOptions.displayBack,
            		displayQuantity: this.viewOptions.displayQuantity,
            		displayPrice: this.viewOptions.displayPrice,
            		displayDiscount: this.viewOptions.displayDiscount,                 	
                });
                
                // render the view
                this.region.show(this.paymentCartLayoutView);
            } else {
                WMAPP.Log.getLogger("WMAPP.Payment.Cart").trace("Payment.Cart createView region required");
            }
        } else {
            WMAPP.Log.getLogger("WMAPP.Payment.Cart").trace("Payment.Cart createView options required");
        }
        WMAPP.Log.getLogger("WMAPP.Payment.Cart").trace("Payment.Cart createView end");
    },
}));

WMAPP.module('Extension.Payment.Cart.View', function (View) {
    View.vent = WMAPP.Extension.Payment.Cart.getChannel().vent;

    View.PaymentCartLayout = WMAPP.Extension.View.LayoutView.extend({
        template: function(data) {
        	var options = data.options;
    		var htmlStr = '<fieldset>' +
    		'<legend>Cart</legend>';
    		if (options.displayBack) {
    			htmlStr += '<p><a class="wmapp-back-button button right"><< Back</a></p>';
    		}
    		
    		htmlStr += '<div class="wmapp-payment-cart-content"></div>' +
    		'<div class="wmapp-payment-cart-commands"></div>' +
    		'</fieldset>';
    		return htmlStr;
    	}, 
		templateHelpers:function(){
			return {
				model: this.model,
				options: {
					displayBack: this.options.displayBack,
	        		displayQuantity: this.options.displayQuantity,
	        		displayPrice: this.options.displayPrice,
	        		displayDiscount: this.options.displayDiscount, 
				}
			}
		},     	
        events: {
            "click .wmapp-back-button": "onBack",
        },
        onBack: function(e) {
			e.preventDefault();
			e.stopPropagation();
			WMAPP.Extension.Payment.Cart.View.vent.trigger('trigger:paymentCart:onPaymentCartBackButtonClick');
        },     	
    	options: {
    		displayBack: true,
    		displayQuantity: true,
    		displayPrice: true,
    		displayDiscount: true,    		
    	},
        regions: {
        	content: '.wmapp-payment-cart-content',
            command: '.wmapp-payment-cart-commands',    	
        },
        onRender: function() {
            var content = new WMAPP.Extension.Payment.Cart.View.PaymentCart ({
                model: this.model, 
                collection: this.model.get('_cart_line_items'),
        		displayQuantity: this.options.displayQuantity,
        		displayPrice: this.options.displayPrice,
        		displayDiscount: this.options.displayDiscount,                 
            });

            var commands = new WMAPP.Extension.Payment.Cart.View.PaymentCartCommands({
                model: this.model,
            });
            
			this.content.show(content);	
			this.command.show(commands);        	
        },
    });	
	
    View.PaymentCartCommands = WMAPP.Extension.View.ItemView.extend({
    	initialize: function() {
    		this.listenTo(this.model, 'change', this.render);
    	},
        template: function(data) {
        	var model = data.model;

        	var htmlStr = '<p>' +
        	'<a class="wmapp-update-button button success">Update Cart</a>' +
        	'<a class="wmapp-empty-button button alert" title="Are you sure you want to empty the cart?">Empty Cart</a>';
        	if (model.get('_cart_line_items') && model.get('_cart_line_items').models.length) {
        		htmlStr += '<a class="wmapp-checkout-button button success">Checkout</a>';
        	}
        	htmlStr += '</p>';
        	return htmlStr;
    	},
		templateHelpers:function(){
			return {
				model: this.model,
			}
		},     	
        className: 'wmapp-payment-cart-commands',
        events: {
            "click .wmapp-update-button": "onUpdate",
            "click .wmapp-empty-button": "onEmpty",
            "click .wmapp-checkout-button": "onCheckout",
        },
        onUpdate: function(e) {
			e.preventDefault();
			e.stopPropagation();        	
        	this.model.updateCart();
        },  
        onEmpty: function(e) {
			e.preventDefault();
			e.stopPropagation();        	
        	if (confirm(e.target.title)) {
        		this.model.emptyCart();
        	}
        },
        onCheckout: function(e) {
			e.preventDefault();
			e.stopPropagation();
			WMAPP.Extension.Payment.Cart.View.vent.trigger('trigger:paymentCart:onPaymentCartCheckoutButtonClick');
        },        
    });	
    
    View.PaymentCartLineItem = WMAPP.Extension.View.ItemView.extend({
    	tagName: 'tr',
    	template: function(data) {
    		var model = data.model;
    		var options = data.options;  

			var htmlStr = '<td style="text-align: center; width:100px">' +
			'<input type="hidden" value="0" name="data[multiple]">' +
			'<input type="checkbox" value="' + model.get('id') + '" class="wmapp-select-all-input" name="data[multiple]">' +
			'</td>';
			
			if (options.displayQuantity) {
				htmlStr += '<td><input type="text" value="' + model.get('quantity') + '" style="width: 50px;" class="wmapp-payment-cart-quantity"></td>';	
			}
			
			htmlStr += '<td>' + model.get('name') + '</td>';
			htmlStr += '<td>' + parseFloat(model.get('item_price')).toFixed(2) + '</td>';	

			if (options.displayDiscount) {
				htmlStr += '<td>' + parseFloat(model.get('item_discount')).toFixed(2) + '</td>';	
			}			
			htmlStr += '<td>' + parseFloat(model.get('total')).toFixed(2) + '</td>';    		
    		return htmlStr;
    	},
		templateHelpers:function(){
			return {
				model: this.model,
				options: {
	        		displayQuantity: this.options.displayQuantity,
	        		displayPrice: this.options.displayPrice,
	        		displayDiscount: this.options.displayDiscount, 
				}
			}
		},     	
    	ui: {
    		qtyField: '.wmapp-payment-cart-quantity',
    	},
    	events: {
    		"change .wmapp-payment-cart-quantity": "onUpdateQuantity",
    		"change .wmapp-select-all-input": "onDelete",
    	},
    	onUpdateQuantity: function(e) {
        	e.preventDefault();
        	e.stopPropagation();
        	this.model.set('_quantity', this.ui.qtyField.val(), {silent: true});
        },
        onDelete: function(e) {
    		var checkbox = $(e.target);
    		if (checkbox.prop('checked')) {
    			this.model.set('_delete', true, {silent: true});
    		} else {
    			this.model.unset('_delete', {silent: true});
    		}          	
        }
      
    });
    
    View.PaymentCart = WMAPP.Extension.View.CompositeView.extend({
    	tagName: "table",
    	className: "wmapp-table",
    	id: "wmappPaymentCartCollection",
    	template: function(data) {
    		var model = data.model;
    		var options = data.options;
    		
    		var htmlStr = '<thead>' +
    		'<tr>' +
    		'<th style="text-align: center" width="100px">' +
    		'Remove<br />' +
    		'<input type="hidden" value="0" id="wmappSelectAll_" name="data[select_all]">' +
    		'<input class="wmapp-select-all input-text medium input-text" type="checkbox" value="1" name="data[select_all]">' +
    		'</th>';
			if (options.displayQuantity) {
				htmlStr += '<th>Qty.</th>';	
			}

			htmlStr += '<th>Product(s)</th>';
			htmlStr += '<th>Price</th>';	
			if (options.displayDiscount) {
				htmlStr += '<th>Discount</th>';	
			}	

			htmlStr += '<th>Total</th>' +
    		'</tr>' +
    		'</thead>' +
    		'<tbody>' +
    		'</tbody>' +
    		'<tfoot>' +
    		'<tr>';
			
			var colCount = 2;
			if (options.displayQuantity)
				++colCount;
				
			htmlStr += '<th colspan="' + colCount + '">Please click on "Update" if you change the quantity or remove a product.</th>' +
    		'<th>Sub-total</th>';
			if (options.displayDiscount) {
				htmlStr += '<th>' + parseFloat(model.get('discount')).toFixed(2) + '</th>';	
			}
			htmlStr += '<th>' + parseFloat(model.get('subtotal')).toFixed(2) + '</th>' +
    		'</tr>' +
    		'</tfoot>';
    		return htmlStr;
    	},
		modelEvents: {
			'change': 'onModelChange'
		},	
		onModelChange: function() {
			this.render();
		},
		templateHelpers:function(){
			return {
				model: this.model,
				options: {
	        		displayQuantity: this.options.displayQuantity,
	        		displayPrice: this.options.displayPrice,
	        		displayDiscount: this.options.displayDiscount, 
				}
			}
		},    	
    	childView: View.PaymentCartLineItem,
    	childViewContainer: "tbody",
    	childViewOptions: function() {
    		return {
        		displayQuantity: this.options.displayQuantity,
        		displayPrice: this.options.displayPrice,
        		displayDiscount: this.options.displayDiscount, 
        	}
    	},    	
    	ui: {
    		columnHeaders: "th.wmapp-admin-sort"
    	},
    	events: {
    		"click .wmapp-select-all": "onSelectAll",
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
});
