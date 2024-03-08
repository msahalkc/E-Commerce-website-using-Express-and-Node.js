var db = require('../config/connection')
var collection = require('../config/collections')
var bcrypt = require('bcrypt')
const { ObjectId } = require('mongodb');
const Razorpay = require('razorpay')
var instance = new Razorpay({
    key_id : 'rzp_test_0OxOpuBRvjcPiP',
    key_secret : 'IBnURGePashS1j37QV00p60r'
})

module.exports = {
    doSignup:(userData)=>{
        return new Promise(async (resolve,reject)=>{
            userData.Password =await bcrypt.hash(userData.Password,10)
            db.get().collection(collection.USER_COLLECTION).insertOne(userData).then((data)=>{
                resolve(data.insertedId)
            })
        })
    },
    doLogin:(userData)=>{
        return new Promise(async (resolve,reject)=>{
            let loginStatus = false
            let response = {}
            let user = await db.get().collection(collection.USER_COLLECTION).findOne({Email:userData.Email})
            if (user) {
                bcrypt.compare(userData.Password,user.Password).then((status)=>{
                    if (status) {
                        console.log('Successful Login');
                        response.user = user
                        response.status = true
                        resolve(response)
                    }else{
                        console.log('Failed Login');
                        resolve({status: false})
                    }
                })
            }else{
                console.log('Failed Login');
                resolve({status: false})
            }
        })
    },
    addToCart:(proId,userId)=>{
        let proObj={
            item: proId,
            quantity:1,
        }
        return new Promise(async(resolve,reject)=>{
            let userCart = await db.get().collection(collection.CART_COLLECTION).findOne({user:userId})
            console.log(userCart);
           if(userCart){
            let proExist = userCart.products.findIndex((product) => 
                {return (product.item == proId)})
            console.log(proExist);
            if (proExist != -1) {
                db.get().collection(collection.CART_COLLECTION)
                .updateOne({user:userId,'products.item':proId},
                {
                    $inc:{'products.$.quantity':1}
                }).then((response)=>{   
                    resolve()
                })
            }else{
                db.get().collection(collection.CART_COLLECTION).
            updateOne({user:userId},
            {
                $push:{products:proObj}
            }).then((response)=>{   
                resolve()
            })
            }
            
           }else{
            let cartObj = {
                user:userId,
                products:[proObj]
            }
            db.get().collection(collection.CART_COLLECTION).insertOne(cartObj).then((response)=>{
                resolve()
            })
           }
        })
    },
    getCartProducts:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            let cartItems = await db.get().collection(collection.CART_COLLECTION).
            aggregate([
                {
                    $match:{user:userId}
                },
                {
                    $unwind:'$products'
                },
                {
                    $project: {
                        item: { $toObjectId: '$products.item' },
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup:{
                        from : collection.PRODUCT_COLLECTION,
                        localField : 'item',
                        foreignField : '_id',
                        as : 'product'
                    }
                },
                {
                    $project:{
                        item: 1,
                        quantity: 1,
                        product: {$arrayElemAt:["$product",0]} 
                    }
                }
            ]).toArray()
            console.log(cartItems);
            resolve(cartItems)
        })
    },
    getCartCount:(userId)=>{
        return new Promise(async(resolve, reject) => {
            let count = 0
            let cart = await db.get().collection(collection.CART_COLLECTION).
            findOne({user: userId})
            if (cart) {
                cart.products.map((itemCount)=>{
                    count = count + itemCount.quantity
                })
            }
            resolve(count)
        })
    },
    changeProductQuantity:(details)=>{
        details.count = parseInt(details.count)
        details.quantity = parseInt(details.quantity)

        return new Promise((resolve, reject) => {
            if (details.count == -1 && details.quantity == 1) {
                db.get().collection(collection.CART_COLLECTION).updateOne(
                    {
                    _id:new ObjectId(details.cart)
                    },
                    {
                     $pull: {products:{item : details.product}}
                    }).then((response)=>{   
                        resolve({removeProduct:true})
                    })
            }else{
                db.get().collection(collection.CART_COLLECTION).updateOne(
                    {
                    _id:new ObjectId(details.cart),
                    'products.item': details.product 
                    },
                    {
                     $inc: { 'products.$.quantity': details.count }
                    }).then((response)=>{   
                        resolve({status:true})
                    })
            }
        })
    },
    getTotalAmount:(userId)=>{
        return new Promise(async (resolve, reject) => {
            let total = await db.get().collection(collection.CART_COLLECTION)
              .aggregate([
                {
                  $match: { user: userId }
                },
                {
                  $unwind: '$products'
                },
                {
                  $project: {
                  item: { $toObjectId: '$products.item' },
                  quantity: '$products.quantity'
                }
              },
              {
                $lookup: {
                  from: collection.PRODUCT_COLLECTION,
                  localField: 'item',
                  foreignField: '_id',
                  as: 'product'
                }
              },
              {
                $project: {
                  item: 1,
                  quantity: 1,
                  product: { $arrayElemAt: ['$product', 0] }
                }
              },
              {
                $group: {
                  _id : null,
                  total: {
                    $sum: {
                      $multiply: [
                        '$quantity',
                        { $toDouble: { $replaceAll: { input: '$product.Price', find: ',', replacement: '' } } }
                      ]
                    }
                  }
                }
              }
            ]).toArray();
            resolve(total[0].total);
          });
          
    },
    placeOrder:(order,products,total)=>{
        return new Promise((resolve, reject) => {
            let status = order['payment-method'] === 'COD' ? 'placed':'pending'
            let orderObj = {
                deliveryDetails : {
                    mobile : order.mobile,
                    address : order.address,
                    pincode : order.pincode
                },
                userId : order.userId,
                paymentMethod : order['payment-method'],
                products : products,
                totalAmount : total,
                status : status,
                date : new Date()
            }

            db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj).then((response)=>{
                db.get().collection(collection.CART_COLLECTION).deleteOne({user:order.userId})
                resolve(response.insertedId)
            })
        })
    },
    getCartProductList:(userId)=>{
        return new Promise(async(resolve, reject) => {
            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({userId})
            resolve(cart.products)
        })
    },
    getUserOrder:(userId)=>{
        return new Promise(async(resolve, reject) => {
            let orders = await db.get().collection(collection.ORDER_COLLECTION).find({userId:userId}).toArray()
            resolve(orders)
        })
    },
    getOrderProducts:(orderId)=>{
        return new Promise(async(resolve, reject) => {
            let orderItems = await db.get().collection(collection.ORDER_COLLECTION)
            .aggregate([
                {
                    $match:{_id:orderId}
                },
                {
                    $unwind:'$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup:{
                        from : collection.PRODUCT_COLLECTION,
                        localField : 'item',
                        foreignField : '_id',
                        as : 'product'
                    }
                },
                {
                    $project:{
                        item: 1,
                        quantity: 1,
                        product: {$arrayElemAt:["$product",0]} 
                    }
                }
            ]).toArray()
            resolve(orderItems)
        })
    },
    generateRazorpay:(orderId, totalPrice)=>{
        return new Promise((resolve, reject) => {
            var options = {
                amount : totalPrice,
                currency : 'INR',
                receipt : ''+orderId
            }
            instance.orders.create(options, (err, order)=>{
                resolve(order);
            })
        })
    }
}