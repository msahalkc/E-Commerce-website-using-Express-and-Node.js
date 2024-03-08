var express = require('express');
var router = express.Router();
var productHelper = require('../helpers/product-helpers');

/* GET users listing. */
router.get('/', function(req, res, next) {
  productHelper.getAllProducts().then((products)=>{

    res.render('admin/view-products',{admin:true,products})
  })
});

router.get('/add-product', (req, res, next)=>{
  res.render('admin/add-product')
})

router.post('/add-product', (req,res,next)=>{

  productHelper.addProduct(req.body,(id)=>{
    let image = req.files.Image
    image.mv('./public/images/product-images/'+id+'.jpg',(err)=>{
      if(!err){
        res.render('admin/add-product')
      }else{
        console.log(err);
      }
    })
  })
})


router.get('/delete-product',(req,res)=>{
  let prodId = req.query.id
  productHelper.deleteProduct(prodId).then((response)=>{
    res.redirect('/admin/')
  })
})

router.get('/edit-product',async (req,res)=>{
  let product = await productHelper.getProductDetails(req.query.id)
  res.render("admin/edit-product",{product})
})

router.post('/edit-product',(req,res)=>{
  let id = req.query.id
  productHelper.updateProduct(id,req.body).then(()=>{
    res.redirect('/admin')
    if (req.files && req.files.Image != null) {
      let image = req.files.Image 
      image.mv('./public/images/product-images/'+id+'.jpg')
    }
  })
})



module.exports = router;
