var express = require('express');
var router = express.Router();
var productHelper = require('../helpers/product-helpers')
var userHelper = require('../helpers/user-helpers');

const verifyLogin = (req,res,next)=>{
  if(req.session.userloggedIn){
    next()
  }
  else{
    res.redirect('/login')
  }
}

/* GET home page. */
router.get('/',async(req, res, next) => {
  let user = req.session.user
  let cartCount = null
  if (user) {
    cartCount = await userHelper.getCartCount(req.session.user._id)
  }
  productHelper.getAllProducts().then((products)=>{
    res.render('user/view-products', {products,user, cartCount});
  })
});

router.get('/login',(req,res)=>{
  if (req.session.user) {
    res.redirect('/')
  } else {
    res.render("user/login",{loginError:req.session.userloginError})
    req.session.userloginError = false
  }
})

router.get('/signup',(req,res)=>{
  res.render("user/signup")
})

router.post('/signup',(req,res)=>{
  userHelper.doSignup(req.body).then((response)=>{
    console.log(response);
    req.session.user = response.user
    req.session.user.loggedIn = true
    res.redirect('/')
  })
})

router.post('/login',(req,res)=>{
  userHelper.doLogin(req.body).then((response)=>{
    if (response.status) {
      req.session.user = response.user
      req.session.user.loggedIn = true
      res.redirect('/')
    }else{
      req.session.userloginError = "Invalid Username or Password"
      res.redirect('/login')
    }
  })
})

router.get('/logout',(req,res)=>{
  req.session.user = null;
  req.session.userloggedIn = false;
  res.redirect('/')
})

router.get('/cart',verifyLogin,async(req,res)=>{
  let products = await userHelper.getCartProducts(req.session.user._id)
  let totalValue = 0
  if (products.length > 0) {
    totalValue = await userHelper.getTotalAmount(req.session.user._id)
  }
  res.render('user/cart',{products, user:req.session.user, totalValue})
})

router.get("/add-to-cart/:id",verifyLogin,(req,res)=>{
  userHelper.getCartCount(req.session.user._id)
  console.log(req.params.id);
  console.log('api call');
  userHelper.addToCart(req.params.id,req.session.user._id).then(()=>{
    res.json({status:true})
  })
})

router.post('/change-product-quantity',async(req,res,next)=>{
  userHelper.changeProductQuantity(req.body).then(async(response)=>{
    response.total = await userHelper.getTotalAmount(req.body.user)
    res.json(response)
  })
})

router.get('/place-order',verifyLogin,async(req,res)=>{
  let total = await userHelper.getTotalAmount(req.session.user._id)
  res.render('user/place-order',{total,user:req.session.user})
})

router.post('/place-order',verifyLogin,async(req,res)=>{
  let products = await userHelper.getCartProductList(req.body.user)
  let totalPrice = await userHelper.getTotalAmount(req.body.userId)
  userHelper.placeOrder(req.body,products,totalPrice).then((orderId)=>{
    if (req.body['payment-method']=== 'COD') {
      res.json({paymentSuccess : true})
    }
    else{
      userHelper.generateRazorpay(orderId, totalPrice).then((response)=>{
        res.json(response)
      })
    }
  })
})

router.get('/order-success',(req,res)=>{
  res.render('user/order-success',{user:req.session.user})
})

router.get('/orders', async(req,res)=>{
  let orders = await userHelper.getUserOrder(req.session.user._id)
  res.render('user/orders',{user:req.session.user,orders})
})

router.get('/view-order-products/:id',async(req,res)=>{
  let products = await userHelper.getOrderProducts(req.params.id)
  res.render('user/view-order-products',{user:req.session.user,products})
})

module.exports = router;
