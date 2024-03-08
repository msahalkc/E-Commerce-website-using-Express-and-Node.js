var db = require('../config/connection')
var collection = require('../config/collections')
const { response } = require('express')

module.exports = {
    addProduct:(product,callback)=>{
db.get().collection(collection.PRODUCT_COLLECTION).insertOne(product).then((data)=>{
            callback(data.insertedId.toString())
        })
    },
    getAllProducts:()=>{
        return new Promise(async (resolve,reject)=>{
            let products = await db.get().collection(collection.PRODUCT_COLLECTION).find().toArray()
            resolve(products)
        })
    },
    deleteProduct:(prodId)=>{
        return new Promise((resolve,reject)=>{

            db.get().collection(collection.PRODUCT_COLLECTION).deleteOne({_id:prodId}).then((response)=>{
                resolve(response)
            })
        })
    },
    getProductDetails:(prodId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION).findOne({_id:prodId}).then((product)=>{
                resolve(product)
            })
        })
    },
    updateProduct:(prodId,product)=>{
        return new Promise((resolve,reject)=>{
            
            db.get().collection(collection.PRODUCT_COLLECTION).
            updateOne({_id:prodId},{$set:{
                                            Name:product.Name,
                                            Description:product.Description,
                                            Price:product.Price,
                                            Category:product.Category
                                        }}).then(()=>{
                                            resolve()
                                        })
        })
    }
}