// The Card model.
'use strict';

var bcrypt = require('bcryptjs');

var config = require('../config'),
   knex = require('../services/database');

const sPosAdminUser = 'wmpos_admin_user';
const iStoreTimeHoliday = "wm_store_time_holiday";
const sPosUser = 'wmpos_user';
const iStoreMedia = 'wm_store_media';
const sProduct = 'wm_product';
const sProductMedia = 'wm_product_media';
const sMenuCatXPrd = "wm_menu_cat_x_prd";
const sProductOption = 'wm_product_option';
const sProductOptionBase = "wm_product_option_base";

const SALT_ROUNDS = 10;
const hashPassword = password => bcrypt.hash(password, SALT_ROUNDS);
const verifyPassword = (password, hash) => bcrypt.compare(password, hash);

const beforeSave = user => {
   if (!user.password) return Promise.resolve(user)
   
   // `password` will always be hashed before being saved.
   return hashPassword(user.password)
   .then(hash => ({ ...user, password: hash }))
   .catch(err => `Error hashing password: ${err}`)
}

var Sales = {};


/// v2

// knex
Sales.bannerImg = () => {
   return  knex.select('banner_id', 'url_path',"mime_type","param", "type","site")
               .from("wm_website_banner")
               .where({ status: 1 })
               .then((result) => {
                  return result;
               })
               .catch((err) => console.log(err));
}

Sales.deleteMember = (sIndex) => {
   return   knex("wmpos_admin_user")
            .update({ group_id: 99999, activated: 0, group_name: "미정" })
            .where({ admin_user_id: sIndex })
            .then((result) => {
               return result;
            }).catch((err) => console.log(err));
}

Sales.managerChangeMember = (sIndex,aIndex,iIndex) => {
   return   knex("wmpos_admin_user")
            .update({ group_id: aIndex, activated: 1, group_name: iIndex })
            .where({ admin_user_id: sIndex })
            .then((result) => {
               return result;
            }).catch((err) => console.log(err));
}

Sales.userData = (groupId) => {
   return  knex.select('sales_type','group_id',"admin_user_id","user_type","activated","group_name")
               .from("wmpos_admin_user")
               .where({ admin_user_id: groupId })
               .then((result) => {
                  return result;
               })
               .catch((err) => console.log(err));
}

Sales.salesNewUser = () => {
   return  knex.select('email', 'full_name', "admin_user_id", "activated")
               .from("wmpos_admin_user")
               .where({ activated: 0 })
               .where({ sales_type: "sales" })
               .then((result) => {
                  return result;
               })
               .catch((err) => console.log(err));
}

Sales.salesTeamMember = (aParam,iParam) => {
   return  knex.select('email', 'full_name', "admin_user_id", "activated")
               .from("wmpos_admin_user")
               .where({ group_id: aParam })
               .whereNot({ admin_user_id: iParam })
               .whereNot({ user_type: 1 })
               .then((result) => {
                  return result;
               })
               .catch((err) => console.log(err));
}

Sales.salesUserSignUp = (userName,sCount,userEmail,userPhone,userPwd,groupId,groupName) => {
   return   knex('wmpos_admin_user')
            .insert({
               phone_number: userPhone,
               group_id: groupId,
               group_name: groupName,
               sales_type: "sales",
               email: userEmail,
               password: userPwd,
               content: sCount,
               full_name: userName,
               status: 1,
               activated: 1
            })
            .then(function (result) {
               return result;
            }).catch((err) => console.log(err));
}

Sales.salesUserSignUpV2 = (userName,sCount,userEmail,userPhone,userPwd,groupId,groupName) => {
   return   knex('wmpos_admin_user')
            .insert({
               phone_number: userPhone,
               group_id: groupId,
               group_name: groupName,
               sales_type: "sales",
               email: userEmail,
               password: userPwd,
               content: sCount,
               full_name: userName,
               status: 1,
               activated: 0
            })
            .then(function (result) {
               return result;
            }).catch((err) => console.log(err));
}

Sales.findSalesUser = (oEmail) => {
   return  knex.select('admin_user_id', 'group_id', 'phone_number', 'email', 'full_name', 'content', 'password','sales_type', 'group_name', 'status', 'activated','user_type')
           .from("wmpos_admin_user")
           .where({email : oEmail})
           .where({status : 1})
           .timeout(config.queryTimeout).first().then(function (result) {
               return result;
           })
           .catch((err) => console.log(err));
}

Sales.getAllSalesMessage = () => {
   return  knex.select('type_id', 'group_id', 'title', 'content', 'created_at')
           .from("wm_sales_alarm")
           .where({status : 1})
           .orderBy('created_at', 'desc')
           .timeout(config.queryTimeout).then(function (result) {
               return result;
           })
           .catch((err) => console.log(err));
}

Sales.checkUpdateToken = (sIndex) => {
   return  knex.select('push_token_id')
           .from("wm_push_token_sales")
           .where({sales_id : sIndex})
           .timeout(config.queryTimeout).then(function (result) {
               return result;
           })
           .catch((err) => console.log(err));
}

Sales.updatePushToken = (sIndex,aIndex) => {
   return   knex("wm_push_token_sales")
            .update({ token: aIndex, updated_at: knex.fn.now() })
            .where({ sales_id: sIndex })
            .then((result) => {
               return result;
            }).catch((err) => console.log(err));
}

Sales.insertPushToken = (sIndex,aIndex) => {
   return   knex("wm_push_token_sales")
            .insert({ sales_id: sIndex,token: aIndex })
            .then((result) => {
               return result;
            }).catch((err) => console.log(err));
}

Sales.getGroupUserList = (sIndex) => {
   return  knex.select('full_name', 'phone_number', 'email', 'group_name')
           .from("wmpos_admin_user")
           .where({group_id : sIndex})
           .timeout(config.queryTimeout).then(function (result) {
               return result;
           })
           .catch((err) => console.log(err));
}


// sql
Sales.getAllGroupStore = (sIndex) => {
   let sQuery = knex.raw(`
                 COUNT(*) AS sCount
     FROM        wmpos_user          
     WHERE       parent_id = ?
  `, [sIndex]);

  let oQuery = knex.select(sQuery);
  return oQuery.then(function (result) {
     return result;
  }).catch((err) => console.log("err",err));
}

Sales.getStoreInfoLimit = (sIndex) => {
   let sQuery = knex.raw(`
                     t1.store_id, 
                     t1.store_name,
                     t1.status,
                     t2.email,
                     t3.url_path 
      FROM           wm_store       AS t1
      INNER JOIN     wmpos_user     AS t2 ON t1.store_id = t2.store_id 
      LEFT JOIN      wm_store_media AS t3 ON t3.store_id = t1.store_id 
      GROUP BY       t1.store_id 
      ORDER BY       t1.store_id    DESC 
      LIMIT          ?
  `, [sIndex]);

  let oQuery = knex.select(sQuery);
  return oQuery.then(function (result) {
     return result;
  }).catch((err) => console.log("err",err));
}

Sales.enrollingStore = () => {
   let sQuery = knex.raw(`
                     t1.store_id, 
                     t1.store_name,
                     t1.status,
                     t2.email,
                     t3.url_path 
      FROM           wm_store       AS t1
      INNER JOIN     wmpos_user     AS t2 ON t1.store_id = t2.store_id 
      LEFT JOIN      wm_store_media AS t3 ON t3.store_id = t1.store_id 
      WHERE          t1.status = 0
      GROUP BY       t1.store_id 
      ORDER BY       t1.store_id    DESC
  `, []);

  let oQuery = knex.select(sQuery);
  return oQuery.then(function (result) {
     return result;
  }).catch((err) => console.log("err",err));
}

Sales.enrollingStoreByStoreName = (sIndex) => {
   let name = "%" + sIndex + "%";
   let sQuery = knex.raw(`
                     t1.store_id, 
                     t1.store_name,
                     t1.status,
                     t1.created_at,
                     t2.email,
                     t3.url_path 
      FROM           wm_store       AS t1
      INNER JOIN     wmpos_user     AS t2 ON t1.store_id = t2.store_id 
      LEFT JOIN      wm_store_media AS t3 ON t3.store_id = t1.store_id 
      WHERE          t1.status = 0
      AND            t1.store_name LIKE ?
      GROUP BY       t1.store_id 
      ORDER BY       t1.store_id    DESC
  `, [name]);

  let oQuery = knex.select(sQuery);
  return oQuery.then(function (result) {
     return result;
  }).catch((err) => console.log("err",err));
}

Sales.enrolledStoreByStoreName = (sIndex) => {
   let name = "%" + sIndex + "%";
   let sQuery = knex.raw(`
                     t1.store_id, 
                     t1.store_name,
                     t1.created_at,
                     t1.status,
                     t2.email,
                     t3.url_path 
      FROM           wm_store       AS t1
      INNER JOIN     wmpos_user     AS t2 ON t1.store_id = t2.store_id 
      LEFT JOIN      wm_store_media AS t3 ON t3.store_id = t1.store_id 
      WHERE          t1.status = 1
      AND            t1.store_name LIKE ?
      GROUP BY       t1.store_id 
      ORDER BY       t1.store_id    DESC
  `, [name]);

  let oQuery = knex.select(sQuery);
  return oQuery.then(function (result) {
     return result;
  }).catch((err) => console.log("err",err));
}

Sales.getGroupStoreInfoLimit = (sIndex,aIndex) => {
   let sQuery = knex.raw(`
                     t2.email,
                     t3.store_id, 
                     t3.store_name,
                     t3.status,
                     t4.url_path
      FROM           wmpos_admin_user     AS t1
      INNER JOIN     wmpos_user           AS t2 ON t2.parent_id = t1.group_id 
      INNER JOIN     wm_store             AS t3 ON t3.store_id = t2.store_id 
      LEFT JOIN      wm_store_media       AS t4 ON t4.store_id = t3.store_id 
      WHERE          t1.admin_user_id = ?
      GROUP BY       t3.store_id 
      ORDER BY       t3.store_id          DESC 
      LIMIT          ?
  `, [sIndex,aIndex]);

  let oQuery = knex.select(sQuery);
  return oQuery.then(function (result) {
     return result;
  }).catch((err) => console.log("err",err));
}

Sales.enrollingStoreByGroupId = (sIndex) => {
   let sQuery = knex.raw(`
                     t2.email,
                     t3.store_id, 
                     t3.store_name,
                     t3.status,
                     t3.created_at,
                     t4.url_path
      FROM           wmpos_admin_user     AS t1
      INNER JOIN     wmpos_user           AS t2 ON t2.parent_id = t1.group_id 
      INNER JOIN     wm_store             AS t3 ON t3.store_id = t2.store_id 
      LEFT JOIN      wm_store_media       AS t4 ON t4.store_id = t3.store_id 
      WHERE          t1.admin_user_id = ?
      AND            t3.status = 0
      GROUP BY       t3.store_id 
      ORDER BY       t3.store_id          DESC 
  `, [sIndex]);

  let oQuery = knex.select(sQuery);
  return oQuery.then(function (result) {
     return result;
  }).catch((err) => console.log("err",err));
}

Sales.enrolledStoreByGroupId = (sIndex) => {
   let sQuery = knex.raw(`
                     t2.email,
                     t3.store_id, 
                     t3.store_name,
                     t3.created_at,
                     t3.status,
                     t4.url_path
      FROM           wmpos_admin_user     AS t1
      INNER JOIN     wmpos_user           AS t2 ON t2.parent_id = t1.group_id 
      INNER JOIN     wm_store             AS t3 ON t3.store_id = t2.store_id 
      LEFT JOIN      wm_store_media       AS t4 ON t4.store_id = t3.store_id 
      WHERE          t1.admin_user_id = ?
      AND            t3.status = 1
      GROUP BY       t3.store_id 
      ORDER BY       t3.store_id          DESC 
  `, [sIndex]);

  let oQuery = knex.select(sQuery);
  return oQuery.then(function (result) {
     return result;
  }).catch((err) => console.log("err",err));
}

Sales.enrollingStoreGroupIdByStoreNm = (sIndex,aIndex) => {
   let name = "%" + sIndex + "%";
   let sQuery = knex.raw(`
                     t2.email,
                     t3.store_id, 
                     t3.created_at, 
                     t3.store_name,
                     t3.status,
                     t4.url_path
      FROM           wmpos_admin_user     AS t1
      INNER JOIN     wmpos_user           AS t2 ON t2.parent_id = t1.group_id 
      INNER JOIN     wm_store             AS t3 ON t3.store_id = t2.store_id 
      LEFT JOIN      wm_store_media       AS t4 ON t4.store_id = t3.store_id 
      WHERE          t1.admin_user_id = ?
      AND            t3.status = 0
      AND            t3.store_name LIKE ?
      GROUP BY       t3.store_id 
      ORDER BY       t3.store_id          DESC 
  `, [aIndex,name]);

  let oQuery = knex.select(sQuery);
  return oQuery.then(function (result) {
     return result;
  }).catch((err) => console.log("err",err));
}

Sales.enrolledStoreGroupIdByStoreNm = (sIndex,aIndex) => {
   let name = "%" + sIndex + "%";
   let sQuery = knex.raw(`
                     t2.email,
                     t3.store_id, 
                     t3.store_name,
                     t3.created_at,
                     t3.status,
                     t4.url_path
      FROM           wmpos_admin_user     AS t1
      INNER JOIN     wmpos_user           AS t2 ON t2.parent_id = t1.group_id 
      INNER JOIN     wm_store             AS t3 ON t3.store_id = t2.store_id 
      LEFT JOIN      wm_store_media       AS t4 ON t4.store_id = t3.store_id 
      WHERE          t1.admin_user_id = ?
      AND            t3.status = 1
      AND            t3.store_name LIKE ?
      GROUP BY       t3.store_id 
      ORDER BY       t3.store_id          DESC 
  `, [aIndex,name]);

  let oQuery = knex.select(sQuery);
  return oQuery.then(function (result) {
     return result;
  }).catch((err) => console.log("err",err));
}

//transaction

///

Sales.brandStore = async (sName,sEmail,sPassword,sPhone,storeList) => {
   let oResult = {
      result_cd: "9999"
   };

   const trx = await knex.transaction();
   try {
      const convertTo = await beforeSave({ password: sPassword });
      const oStoreInfo = {
         group_id: 0,
         group_name: sName,
         sales_type: 'owner',
         phone_number: sPhone,
         email: sEmail,
         password: convertTo.password,
         content: sName,
         full_name: sName,
         status: 1,
         activated: 1,
      }
      const makeId = await  trx("wmpos_admin_user")
                                 .insert(oStoreInfo)
                                 .then(async (res) => {
                                    return res;
                                 })
                                 .catch((err) => {
                                    console.log(err);
                                    throw e;
                                 });
      oResult.result_cd = '4444';

      for await (const iterator of storeList) {
         let oData = {
            admin_user_id: makeId[0],
            store_id: iterator.id,
         }

         await trx("wmpos_admin_x_group")
               .insert(oData)
               .then(async (res) => {
                  return res;
               })
               .catch((err) => {
                  console.log(err);
                  throw e;
               });
      }

      oResult.result_cd = '0000';
      await trx.commit();
      return oResult;

   } catch (error) {
      console.log("brandStore fail !!! ===>",e);
      await trx.rollback();
      return oResult;
   }
}

Sales.findByEmail = (oId) => {
   return knex.count('*', {as: 'count'})
      .from("wmpos_admin_user")
      .where({email : oId})
      .then(function (result) {
         console.log("result",result);
         return result;
      })
      .catch((err) => console.log(err));
}

Sales.editMenuV2 = async (mediaId,productId,sTitle,sDesc,iPrice,dPrice,sCategory,preOptionList,optionList,url_path,isCheck,storeId) => {
   let result_cd = '9999';
   
   const trx = await knex.transaction();
   try {
      if(mediaId !== null){
         if(url_path !== undefined && url_path !== null && url_path !== ""){
            await trx(sProductMedia)
                  .where({ product_media_id: mediaId })
                  .where({ product_id: productId })
                  .update({ url_path : url_path })
                  .then(async (res) => {
                     return res;
                  })
                  .catch((err) => {
                     throw e;
                  });
         } else {
            if(isCheck){
               await trx(sProductMedia)
                     .where({ product_media_id: mediaId })
                     .where({ product_id: productId })
                     .del()
                     .then(async (res) => {
                        return res;
                     })
                     .catch((err) => {
                        throw e;
                     });
            }
         }
      } else {
         if(url_path !== undefined && url_path !== null && url_path !== ""){
            let sList = {
               product_id : productId,
               option_id : 0,
               file_name : "app" + storeId + "/" + sTitle,
               full_path : "app" + storeId + "/" + sTitle,
               url_path : url_path,
               status : 1
            }
      
            await trx(sProductMedia) 
                  .insert(sList)
                  .then(async (res) => {
                     return res;
                  })
                  .catch((err) => {
                     throw e;
                  });
         }
      }

      await trx(sProduct)
            .where({ product_id: productId })
            .update({ name : sTitle, description : sDesc, base_price : dPrice, org_price: iPrice, is_soldout : 0 })
            .then(async (res) => {
               return res;
            })
            .catch((err) => {
               throw e;
            });

      result_cd = '8888';

      await trx(sMenuCatXPrd)
            .where({ product_id: productId })
            .update({ category_id : sCategory })
            .then(async (res) => {
               return res;
            })
            .catch((err) => {
               throw e;
            });

      result_cd = '7777';

      for await (let i of preOptionList) {
         await trx(sProductOption)
               .where({ product_id: productId })
               .where({ option_type_id: parseInt(i.key) })
               .del()
               .then(async (res) => {
                  return res;
               })
               .catch((err) => {
                  throw e;
               });
      }
      result_cd = '6666';

      if(optionList !== undefined && optionList !== null && optionList.length > 0){
         for await (let i of optionList) {
            let xCount = 0;
            const getOption = await Sales.getOptionDetail(parseInt(i.key));
            for await (let x of getOption) {
               console.log("x",x);
               await trx(sProductOption)
                     .insert({ option_base_id: x.option_base_id, name: x.name, product_id: productId, option_type_id: x.option_type_id, price: x.price, status: 1, is_deleted: 0, id_order: xCount })
                     .then(async (res) => {
                        console.log("res",res);
                        return res;
                     })
                     .catch((err) => {
                        console.log("err",err);
                        throw e;
                     });
               xCount = xCount + 1;
            }
         }
      }
            
      result_cd = '0000';

      await trx.commit();
      return result_cd;
   }
   catch (e) {
      await trx.rollback();
      return result_cd;
   }
}

Sales.editMenuV3 = async (mediaId,productId,sTitle,sDesc,iPrice,dPrice,sCategory,preOptionList,optionList,url_path,isCheck,storeId,iStock,productType) => {
   let result_cd = '9999';
   
   const trx = await knex.transaction();
   try {
      if(mediaId !== null){
         if(url_path !== undefined && url_path !== null && url_path !== ""){
            await trx(sProductMedia)
                  .where({ product_media_id: mediaId })
                  .where({ product_id: productId })
                  .update({ url_path : url_path })
                  .then(async (res) => {
                     return res;
                  })
                  .catch((err) => {
                     throw e;
                  });
         } else {
            if(isCheck){
               await trx(sProductMedia)
                     .where({ product_media_id: mediaId })
                     .where({ product_id: productId })
                     .del()
                     .then(async (res) => {
                        return res;
                     })
                     .catch((err) => {
                        throw e;
                     });
            }
         }
      } else {
         if(url_path !== undefined && url_path !== null && url_path !== ""){
            let sList = {
               product_id : productId,
               option_id : 0,
               file_name : "app" + storeId + "/" + sTitle,
               full_path : "app" + storeId + "/" + sTitle,
               url_path : url_path,
               status : 1
            }
      
            await trx(sProductMedia) 
                  .insert(sList)
                  .then(async (res) => {
                     return res;
                  })
                  .catch((err) => {
                     throw e;
                  });
         }
      }

      await trx(sProduct)
            .where({ product_id: productId })
            .update({ name : sTitle, description : sDesc, base_price : dPrice, org_price: iPrice, is_soldout : 0, is_throo_only: productType, in_stock: iStock })
            .then(async (res) => {
               return res;
            })
            .catch((err) => {
               throw e;
            });

      result_cd = '8888';

      await trx(sMenuCatXPrd)
            .where({ product_id: productId })
            .update({ category_id : sCategory })
            .then(async (res) => {
               return res;
            })
            .catch((err) => {
               throw e;
            });

      result_cd = '7777';

      for await (let i of preOptionList) {
         await trx(sProductOption)
               .where({ product_id: productId })
               .where({ option_type_id: parseInt(i.key) })
               .del()
               .then(async (res) => {
                  return res;
               })
               .catch((err) => {
                  throw e;
               });
      }
      result_cd = '6666';

      if(optionList !== undefined && optionList !== null && optionList.length > 0){
         for await (let i of optionList) {
            let xCount = 0;
            const getOption = await Sales.getOptionDetail(parseInt(i.key));
            for await (let x of getOption) {
               console.log("x",x);
               await trx(sProductOption)
                     .insert({ option_base_id: x.option_base_id, name: x.name, product_id: productId, option_type_id: x.option_type_id, price: x.price, status: 1, is_deleted: 0, id_order: xCount })
                     .then(async (res) => {
                        console.log("res",res);
                        return res;
                     })
                     .catch((err) => {
                        console.log("err",err);
                        throw e;
                     });
               xCount = xCount + 1;
            }
         }
      }
            
      result_cd = '0000';

      await trx.commit();
      return result_cd;
   }
   catch (e) {
      await trx.rollback();
      return result_cd;
   }
}

Sales.insertMenuV2 = async (storeId,sName,desc,price,dPrice,sNm,productImg,categoryId,optionList) => {
   let result_cd = '9999';
   let sList = {
      store_id : storeId,
      name : sName,
      description : desc,
      base_price : dPrice,
      org_price : price,
      out_of_stock : 0,
      in_stock : 0,
      status : 1,
      is_deleted : 0,
      id_order : sNm
   }

   const trx = await knex.transaction();
   try {
      const insertProduct = await   trx(sProduct) 
                                    .insert(sList)
                                    .then(async (res) => {
                                       console.log("res",res);
                                       return res;
                                    })
                                    .catch((err) => {
                                       console.log("err",err);
                                       throw e;
                                    });

      result_cd = '1111';  

      if(productImg !== undefined && productImg !== null && productImg !== ""){
         sList = {
            product_id : insertProduct[0],
            option_id : 0,
            file_name : "app" + storeId + "/" + sName,
            full_path : "app" + storeId + "/" + sName,
            url_path : productImg,
            status : 1
         }
   
         await trx(sProductMedia) 
               .insert(sList)
               .then(async (res) => {
                  console.log("res",res);
                  return res;
               })
               .catch((err) => {
                  console.log("err",err);
                  throw e;
               });

         result_cd = '2222';  
      }

      sList = {
         category_id : categoryId,
         product_id : insertProduct[0],
      }

      await trx(sMenuCatXPrd) 
            .insert(sList)
            .then(async (res) => {
               console.log("res",res);
               return res;
            })
            .catch((err) => {
               console.log("err",err);
               throw e;
            });

      result_cd = '3333';  

      if(optionList !== undefined && optionList !== null && optionList.length > 0){
         for await (let i of optionList) {
            let xCount = 0;
            const getOption = await Sales.getOptionDetail(parseInt(i.key));
            for await (let x of getOption) {
               console.log("x",x);
               await trx(sProductOption)
                     .insert({ option_base_id: x.option_base_id, name: x.name, product_id: insertProduct[0], option_type_id: x.option_type_id, price: x.price, status: 1, is_deleted: 0, id_order: xCount })
                     .then(async (res) => {
                        console.log("res",res);
                        return res;
                     })
                     .catch((err) => {
                        console.log("err",err);
                        throw e;
                     });
               xCount = xCount + 1;
            }
         }
      }

      result_cd = '0000';

      await trx.commit();
      return result_cd;
   }
   catch (e) {
      await trx.rollback();
      return result_cd;
   }
}

Sales.insertMenuV3 = async (storeId,sName,desc,price,dPrice,sNm,productImg,categoryId,optionList,productType,iStock) => {
   let result_cd = '9999';
   let sList = {
      store_id : storeId,
      name : sName,
      description : desc,
      base_price : dPrice,
      org_price : price,
      out_of_stock : 0,
      in_stock : iStock,
      is_throo_only : productType,
      status : 1,
      is_deleted : 0,
      id_order : sNm
   }

   const trx = await knex.transaction();
   try {
      const insertProduct = await   trx(sProduct) 
                                    .insert(sList)
                                    .then(async (res) => {
                                       console.log("res",res);
                                       return res;
                                    })
                                    .catch((err) => {
                                       console.log("err",err);
                                       throw e;
                                    });

      result_cd = '1111';  

      if(productImg !== undefined && productImg !== null && productImg !== ""){
         sList = {
            product_id : insertProduct[0],
            option_id : 0,
            file_name : "app" + storeId + "/" + sName,
            full_path : "app" + storeId + "/" + sName,
            url_path : productImg,
            status : 1
         }
   
         await trx(sProductMedia) 
               .insert(sList)
               .then(async (res) => {
                  console.log("res",res);
                  return res;
               })
               .catch((err) => {
                  console.log("err",err);
                  throw e;
               });

         result_cd = '2222';  
      }

      sList = {
         category_id : categoryId,
         product_id : insertProduct[0],
      }

      await trx(sMenuCatXPrd) 
            .insert(sList)
            .then(async (res) => {
               console.log("res",res);
               return res;
            })
            .catch((err) => {
               console.log("err",err);
               throw e;
            });

      result_cd = '3333';  

      if(optionList !== undefined && optionList !== null && optionList.length > 0){
         for await (let i of optionList) {
            let xCount = 0;
            const getOption = await Sales.getOptionDetail(parseInt(i.key));
            for await (let x of getOption) {
               console.log("x",x);
               await trx(sProductOption)
                     .insert({ option_base_id: x.option_base_id, name: x.name, product_id: insertProduct[0], option_type_id: x.option_type_id, price: x.price, status: 1, is_deleted: 0, id_order: xCount })
                     .then(async (res) => {
                        console.log("res",res);
                        return res;
                     })
                     .catch((err) => {
                        console.log("err",err);
                        throw e;
                     });
               xCount = xCount + 1;
            }
         }
      }

      result_cd = '0000';

      await trx.commit();
      return result_cd;
   }
   catch (e) {
      await trx.rollback();
      return result_cd;
   }
}

Sales.getMenuList = async (categoryId) => {
   let sQuery = knex.raw(`
               t1.id_order, 
               t1.in_stock, 
               t1.product_id, 
               t1.name, 
               t1.is_soldout,
               t1.in_stock,
               t1.base_price, 
               t3.url_path  
   FROM        wm_product AS t1
   INNER JOIN  wm_menu_cat_x_prd AS t2 ON t2.product_id = t1.product_id
   LEFT JOIN   wm_product_media  AS t3 ON t3.product_id = t1.product_id 
   WHERE       t2.category_id  = ?
   AND         t1.is_deleted  != 1
   ORDER BY    t1.id_order
   `, [categoryId]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Sales.storeUnActiveList = async (sIndex) => {
   let sQuery = knex.raw(`
                  t3.store_name, 
                  t3.status,
                  t2.created_at, 
                  t4.verified, 
                  t3.store_id,
                  t2.email,
                  t5.phone_number 
      FROM        wmpos_admin_user     AS t1
      INNER JOIN  wmpos_user           AS t2 ON t2.parent_id = t1.group_id
      INNER JOIN  wm_store             AS t3 ON t3.store_id = t2.store_id 
      LEFT JOIN   wmpos_user_sms_code  AS t4 ON t3.store_id = t4.store_id
      LEFT JOIN   wm_merchant          AS t5 ON t5.store_id = t2.store_id 
      WHERE       t1.admin_user_id = ?
      AND         t3.status = 0;
   `, [sIndex]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Sales.searchStoreUnActiveList = async (sIndex,aParam) => {
   let name = "%" + aParam + "%";
   let sQuery = knex.raw(`
                  t3.store_name, 
                  t3.status,
                  t2.created_at, 
                  t4.verified, 
                  t3.store_id,
                  t2.email,
                  t5.phone_number 
      FROM        wmpos_admin_user     AS t1
      INNER JOIN  wmpos_user           AS t2 ON t2.parent_id = t1.group_id
      INNER JOIN  wm_store             AS t3 ON t3.store_id = t2.store_id 
      LEFT JOIN   wmpos_user_sms_code  AS t4 ON t3.store_id = t4.store_id
      LEFT JOIN   wm_merchant          AS t5 ON t5.store_id = t2.store_id 
      WHERE       t1.admin_user_id = ?
      AND         t3.store_name LIKE ?
      AND         t3.status = 0;
   `, [sIndex,name]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Sales.getStoreLogoImg = async (sIndex) => {
   let sQuery = knex.raw(`
               url_path 
      FROM     wm_store_media 
      WHERE    store_id = ? 
      AND      url_path != "" 
      ORDER BY store_media_id ASC 
      LIMIT 1
   `, [sIndex]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Sales.storeActiveList = async (sIndex) => {
   let sQuery = knex.raw(`
                  t3.store_name, 
                  t3.status,
                  t2.created_at, 
                  t4.verified, 
                  t3.store_id,
                  t2.email,
                  t5.phone_number 
      FROM        wmpos_admin_user     AS t1
      INNER JOIN  wmpos_user           AS t2 ON t2.parent_id = t1.group_id
      INNER JOIN  wm_store             AS t3 ON t3.store_id = t2.store_id 
      LEFT JOIN   wmpos_user_sms_code  AS t4 ON t3.store_id = t4.store_id
      LEFT JOIN   wm_merchant          AS t5 ON t5.store_id = t2.store_id 
      WHERE       t1.admin_user_id = ?
   `, [sIndex]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Sales.searchStoreActiveList = async (sIndex,aParam) => {
   let name = "%" + aParam + "%";
   let sQuery = knex.raw(`
                  t3.store_name, 
                  t3.status,
                  t2.created_at, 
                  t4.verified, 
                  t3.store_id,
                  t2.email,
                  t5.phone_number 
      FROM        wmpos_admin_user     AS t1
      INNER JOIN  wmpos_user           AS t2 ON t2.parent_id = t1.group_id
      INNER JOIN  wm_store             AS t3 ON t3.store_id = t2.store_id 
      LEFT JOIN   wmpos_user_sms_code  AS t4 ON t3.store_id = t4.store_id
      LEFT JOIN   wm_merchant          AS t5 ON t5.store_id = t2.store_id 
      WHERE       t1.admin_user_id = ?
      AND         t3.store_name LIKE ?
   `, [sIndex,name]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}


Sales.getOptionDetail = async (optionId) => {
   return  knex.from(sProductOptionBase)
               .where({option_type_id : optionId})
               .then(function (result) {
                  return result;
               })
               .catch((err) => console.log(err));
}

Sales.updateStoreMediaData = async (sParam,storeId) => {
   let result_cd = '9999';
   console.log("sParam",sParam);
   const trx = await knex.transaction();
   try {
      if(sParam.length > 0){
         for await (const iterator of sParam) {
            await trx(iStoreMedia)
                  .where({ store_media_id: iterator.key })
                  .where({ store_id: storeId })
                  .update({ url_path: iterator.url_path, status : 1 })
                  .then(async (res) => {
                     return res;
                  })
                  .catch((err) => {
                     console.log("err",err);
                     throw e;
                  });
         }
      }
      result_cd = '0000';

      await trx.commit();
      return result_cd;
   }
   catch (e) {
      await trx.rollback();
      return result_cd;
   }
}

Sales.temperaryHolidayDelete = (sType,storeId) => {
   return  knex(iStoreTimeHoliday)
           .where({store_id : storeId})
           .where({type : sType})
           .del()
           .then(function (result) {
               return result;
           })
           .catch((err) => console.log(err));
}

Sales.officialHolidayDelete = (sType,storeId) => {
   return  knex(iStoreTimeHoliday)
           .where({store_id : storeId})
           .where({type : sType})
           .del()
           .then(function (result) {
               return result;
           })
           .catch((err) => console.log(err));
}

Sales.temperaryHoliday = async (fromDate,toDate,sType,storeId) => {
   let result_cd = '9999';
   
   const trx = await knex.transaction();
   try {
      await trx(iStoreTimeHoliday)
            .where({ store_id: storeId })
            .where({ type: sType })
            .del()
            .then(async (res) => {
               console.log("res",res);
               return res;
            })
            .catch((err) => {
               console.log("err",err);
               throw e;
            });
      
      await trx(iStoreTimeHoliday) 
            .insert({holiday_from: fromDate, holiday_to: toDate, store_id: storeId, type: sType })
            .then(async (res) => {
               console.log("res",res);
               return res;
            })
            .catch((err) => {
               console.log("err",err);
               throw e;
            });

      result_cd = '0000';

      await trx.commit();
      return result_cd;
   }
   catch (e) {
      await trx.rollback();
      return result_cd;
   }
}


Sales.getPushTokens = (sIndex) => {
    return  knex.select('token')
            .from("wm_push_token_sales")
            .where({sales_id : sIndex})
            .timeout(config.queryTimeout).then(function (result) {
                return result;
            })
            .catch((err) => console.log(err));
}

Sales.getEachSalesTeam = (sIndex) => {
    return  knex.select('admin_user_id','group_name')
            .from("wmpos_admin_user")
            .where({group_id : sIndex})
            .where({activated : 1})
            .where({status : 1})
            .timeout(config.queryTimeout).then(function (result) {
                return result;
            })
            .catch((err) => console.log(err));
}

Sales.getTotalSalesTeam = () => {
    return  knex.select('admin_user_id')
            .from("wmpos_admin_user")
            .where({activated : 1})
            .where({status : 1})
            .timeout(config.queryTimeout).then(function (result) {
                return result;
            })
            .catch((err) => console.log(err));
}

Sales.checkupPushToken = (sIndex,aIndex) => {
    return  knex.select('push_token_id')
            .from("wm_push_token_pos")
            .where({unique_id : sIndex})
            .where({store_id : aIndex})
            .timeout(config.queryTimeout).then(function (result) {
                return result;
            })
            .catch((err) => console.log(err));
}



Sales.getUnActiveGroupStore = (sIndex) => {
    let sQuery = knex.raw(`
                    COUNT(*)            AS sCount
        FROM        wmpos_user          AS t1
        INNER JOIN   wm_store            AS t2 ON t1.store_id = t2.store_id
        WHERE       t1.parent_id = ?
        AND         t2.status = 0
   `, [sIndex]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Sales.getUnActiveStoreLimit = (sIndex) => {
    let sQuery = knex.raw(`
                        t2.store_id, t2.store_name, t3.verified, t4.phone_number, t1.email
        FROM            wmpos_user          AS t1
        INNER JOIN      wm_store            AS t2 ON t1.store_id = t2.store_id
        INNER JOIN      wmpos_user_sms_code AS t3 ON t1.store_id = t3.store_id 
        INNER JOIN      wm_merchant         AS t4 ON t1.store_id = t4.store_id 
        WHERE           t1.parent_id = ?
        AND             t2.status = 0
        ORDER BY        t2.created_at DESC
        LIMIT 1
   `, [sIndex]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}


Sales.insertMessageList = (sIndex,aIndex,xIndeex,nIndex) => {
   return   knex("wm_sales_alarm")
            .insert({ type_id: sIndex,group_id: aIndex, title: xIndeex, content: nIndex })
            .then((result) => {
               return result;
            }).catch((err) => console.log(err));
}

Sales.editStoreId = (sIndex,aIndex) => {
   return   knex("wmpos_user")
            .update({ email: aIndex })
            .where({ store_id: sIndex })
            .then((result) => {
               return result;
            }).catch((err) => console.log(err));
}


Sales.editStorePw = (sIndex,aIndex) => {
   return   knex("wmpos_user")
            .update({ password: aIndex })
            .where({ store_id: sIndex })
            .then((result) => {
               return result;
            }).catch((err) => console.log(err));
}


Sales.getMainType = async (storeId) => {
   let sQuery = knex.raw(`
                  t1.is_main, 
                  t2.parent_store_type_id AS typeId,
                  t2.name
      FROM        wm_store_x_store_type   AS t1 
      INNER JOIN  wm_store_type           AS t2 ON t2.store_type_id = t1.store_type_id 
      WHERE       t1.store_id = ?
   `, [storeId]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err", err));
}

module.exports = Sales;

