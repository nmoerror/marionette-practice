'use strict';

WMAPP.module('Extension.View', function(View) {
	
    View.OrderLineItem = WMAPP.Extension.View.ItemView.extend({
    	tagName: 'tr',
    	template: null,
    	initialize: function(options) {
			options = _.extend(this.options, options);
			
			var tmplStr = '<td>' + this.model.get('sku') + '</td>';
			tmplStr += '<td>' + this.model.get('quantity') + '</td>';
			tmplStr += '<td>' + this.model.get('name') + '</td>';
			tmplStr += '<td>' + this.model.get('item_price') + '</td>';
			tmplStr += '<td>' + this.model.get('discount_subtotal') + '</td>';
			tmplStr += '<td>' + this.model.get('total') + '</td>';
			
			this.template = _.template(tmplStr);
			
			console.log(this.model);
    	},
		modelEvents: {
			'change': 'render'
		},
    });
    
    View.Order = WMAPP.Extension.View.CompositeView.extend({
    	tagName: "table",
    	className: "wmapp-table",
    	id: "wmappTemplatePaymentOrder",
    	template: null,
    	childView: View.OrderLineItem,
    	childViewContainer: "tbody",
		initialize: function(options){
			options = _.extend(this.options, options);
			
			var tmplStr = '<thead>';
			tmplStr += '	<tr>';
			tmplStr += '		<th>Code</th>';
			tmplStr += '		<th>Qty</th>';
			tmplStr += '		<th>Items(s)</th>';
			tmplStr += '		<th>Price</th>';
			tmplStr += '		<th>Discount</th>';
			tmplStr += '		<th>Total</th>';
			tmplStr += '	</tr>';
			tmplStr += '</thead>';
			tmplStr += '<tbody>';
			tmplStr += '</tbody>';
			tmplStr += '<tfoot>';
			tmplStr += '	<tr>';
			tmplStr += '		<th colspan="3"></th>';
			tmplStr += '		<th>Sub-total</th>';
			tmplStr += '		<th>' + this.model.get('discount') + '</th>';
			tmplStr += '		<th>' + this.model.get('total_less_postage') + '</th>';
			tmplStr += '	</tr>';
			tmplStr += '	<tr>';
			tmplStr += '		<th colspan="3"></th>';
			tmplStr += '		<th>Shipping</th>';
			tmplStr += '		<th>&nbsp;</th>';
			tmplStr += '		<th>' + this.model.get('postage') + '</th>';
			tmplStr += '	</tr>';
			tmplStr += '	<tr>';
			tmplStr += '		<th colspan="3"></th>';
			tmplStr += '		<th>Total</th>';
			tmplStr += '		<th>&nbsp;</th>';
			tmplStr += '		<th>' + this.model.get('total') + '</th>';
			tmplStr += '	</tr>';
			tmplStr += '</tfoot>';		
			
			this.template = _.template(tmplStr);
		}
    });	
});