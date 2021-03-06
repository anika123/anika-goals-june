var express = require('express');
var router = express.Router();
var Product = require('../models/products');
var Cart = require('../models/cart');
var Order = require('../models/order');

/* GET home page. */
router.get('/', function(req, res, next) {
	var successMessage = req.flash('success')[0];
	Product.find(function(err, prods) {
		var productsArray = [];
		var limit = 3;
		for(var i =0; i < prods.length; i += limit) {
			productsArray.push(prods.slice(i, i+limit));
		}
		res.render('shop/index', { title: 'Anika\'s Shopping Cart', products: productsArray, successMessage: successMessage, noMessage: !successMessage});
	});
});

router.get('/add-to-cart/:id', function(req, res, next) {
	var productId = req.params.id;
	var cart = new Cart(req.session.cart ? req.session.cart : {});

	Product.findById(productId, function(err, product) {
		if(err) {
			return res.redirect('/');
		}
		cart.add(product, product.id);
		req.session.cart = cart;
		res.redirect('/');
	});
});

router.get('/reduce/:id', function(req, res, next) {
	var productId = req.params.id;
	var cart = new Cart(req.session.cart ? req.session.cart : {});
	cart.reduceByOne(productId);
	req.session.cart = cart;
	res.redirect('/shopping-cart');
});

router.get('/shopping-cart', function(req, res, next) {
	if(!req.session.cart) {
		return res.render('shop/shopping-cart', {products: null});
	}
	var cart = new Cart(req.session.cart);
	res.render('shop/shopping-cart', {products: cart.generateArray(), totalPrice: cart.totalPrice});
});

router.get('/checkout', isLoggedIn, function(req, res, next) {
	if(!req.session.cart) {
		return res.redirect('/shopping-cart');
	}
	var cart = new Cart(req.session.cart);
	var errorMessage = req.flash('error')[0];
	res.render('shop/checkout', {total: cart.totalPrice, errorMessage: errorMessage, noErrors: !errorMessage});
});

router.post('/checkout', isLoggedIn, function(req, res, next){
	if(!req.session.cart) {
		return res.redirect('/shopping-cart');
	}
	var cart = new Cart(req.session.cart);

	var stripe = require("stripe")(
		"sk_test_JQaNyZeKDZmEk4NJvuoP9fQV"
	);

	stripe.charges.create({
		amount: cart.totalPrice * 100,
		currency: "usd",
		source: req.body.stripeToken,
		description: "Charge for andrew.johnson@example.com"
	}, function(err, charge) {
		if(err) {
			req.flash('error', err.message);
			return res.redirect('/checkout');
		}
		var order = new Order({
			user: req.user,
			cart: cart,
			address: req.body.address,
			name: req.body.name,
			paymentId: charge.id
		});
		order.save(function(err, result) {
			req.flash('success', 'Product purchased successfully!');
			req.session.cart = null;
			res.redirect('/');
		});
	});
});

module.exports = router;

function isLoggedIn(req, res, next) {
	if(req.isAuthenticated()) {
		return next();
	}
	req.session.oldUrl = req.url;
	res.redirect('/user/register');
}
