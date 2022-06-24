// The Website model.
'use strict';

var config = require('../config'),
   knex = require('../services/database');

const sTableName = 'wm_store';
const sPosUser = 'wmpos_user';
const iStoreMedia = 'wm_store_media';
const iStoreCongestion = 'wm_store_time_congestion';
const iStoreTimeBusiness = 'wm_store_time_business';
//const iStoreTimeOrder = 'wm_store_time_order';
const sProduct = 'wm_product';
const sProductOption = 'wm_product_option';
const sProductMedia = 'wm_product_media';
const sNoticeTable = "wmpos_notice";
const sMenu = "wm_menu";
const sMenuCategory = "wm_menu_category";
const sProductOptionType = "wm_product_option_type";
const sProductOptionBase = "wm_product_option_base";
const sMenuCatXPrd = "wm_menu_cat_x_prd";
const iStoreType = "wm_store_type";
const iStoreXStoreType = "wm_store_x_store_type";
const iStoreTimeHoliday = "wm_store_time_holiday";
const sInquiry = "wm_inquiry";
const iMerchant = "wm_merchant";

const moment = require('moment-timezone');
require('moment/locale/ko');

async function* asyncGenerator(sIndex) {
   let count = 0;
   while (count < sIndex) 
   yield count++;
};

const makeList = async (operatingList,optionList,sDay) => {
   let sResult = {};
   
   sResult.o_time = await operatingList.openTime;
   sResult.c_time = await operatingList.closeTime;
   sResult.c_time = await operatingList.closeTime;
   sResult.day_week = await sDay;
   sResult.d_type = await 0;

   
   if(operatingList.orderTime === "easy"){
      sResult.c_type = await 0
   } else if(operatingList.orderTime === "normal"){
      sResult.c_type = await 1
   } else {
      sResult.c_type = await 2
   }

   if(operatingList.isBreakTime){
      sResult.b_from = await operatingList.breakFrom;
      sResult.b_to = await operatingList.breakTo;
   } else {
      sResult.b_from = await null;
      sResult.b_to = await null;
   }
   
   if(operatingList.allDay){
      sResult.alltime = await 0;
   } else {
      sResult.alltime = await 1;
   }
   
   if(optionList.dataSource != undefined){
      sResult.sData = await optionList.dataSource;       
   } else {
      sResult.sData = await "none";
   }

   return sResult;
}

const fnGetMainMenuOption = async (iterator,store_id) => {
   let productOption = [];

   const optionList = await Store.getOptionListByMenuId(parseInt(iterator));
   if(optionList !== undefined && optionList !== null && optionList.length > 0){
      for await (let i of optionList) {
         let tempProductOption = {};
         let optionId = null;

         const checkOption = await Store.checkOption(parseInt(store_id),i.name.toString());
         if(checkOption !== undefined && checkOption !== null && checkOption.length > 0){
            optionId = checkOption[0].option_type_id;
         }

         if(optionId !== null){
            tempProductOption.key = optionId;
            productOption.push(tempProductOption);
         }
      }
   }

   return productOption;
}

var Store = {};

Store.checkNewStoreCommercial = async (sParam) => {
   let sQuery = knex.raw(`
               t2.adver_coupon_id,
               t3.adver_event_id, 
               t4.adver_product_popular_id, 
               t5.adver_product_throo_only_id, 
               t6.adver_store_id 
   FROM        wm_merchant_points                  AS t1
   LEFT JOIN   wm_adver_coupon                     AS t2 ON t1.store_id = t2.store_id 
   LEFT JOIN   wm_adver_event                      AS t3 ON t1.store_id = t3.store_id
   LEFT JOIN   wm_adver_product_popular            AS t4 ON t1.store_id = t4.store_id 
   LEFT JOIN   wm_adver_product_throo_only         AS t5 ON t1.store_id = t5.store_id
   LEFT JOIN   wm_adver_store                      AS t6 ON t1.store_id = t6.store_id 
   WHERE       t1.store_id = ?
   `, [sParam]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err", err));
}

Store.authenticateUserCheckPwd = async (sParam,aParam) => {
   let sQuery = knex.raw(`
                     t1.store_id
      FROM           wmpos_user        AS t1
      INNER JOIN     wm_merchant       AS t2 ON t1.store_id = t2.store_id 
      WHERE          t1.email = ?
      AND            t1.phone_number = ?
   `, [sParam,aParam,]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err", err));
}

Store.authenticateUserCheckId = async (sParam,aParam,iParam) => {
   let storeName = "%" + sParam + "%";
   let name = "%" + aParam + "%";
   let sQuery = knex.raw(`
                     t3.email 
      FROM           wm_merchant    AS t1
      INNER JOIN     wm_store       AS t2 ON t1.store_id = t2.store_id 
      INNER JOIN     wmpos_user     AS t3 ON t3.store_id = t2.store_id 
      WHERE          t2.store_name LIKE ?
      AND            t1.full_name LIKE ?
      AND            t1.phone_number = ?
      ORDER BY       t1.store_id DESC
   `, [storeName,name,iParam]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err", err));
}

Store.completeNonePointCommercial = async (iResult) => {
   let resultCd = '9999';
   let sList = {}

   const trx = await knex.transaction();
   try {
      sList = {
         order_nr: iResult.orderNr,
         type_id: 1,
         uuid: iResult.uuid,
         merchant_id: iResult.merchantId,
         store_id: iResult.storeId,
         state_id: 14002,
         discount_amount: 0,
         total_amount_org: iResult.cartAmount,
         total_amount_incl: 0,
         total_amount_excl: 0,
         phone_number: iResult.merchantPhone,
         device_os_info: iResult.osInfo,
         product_name: iResult.productNm
      }
      const insert = await trx("wm_adver_order") 
                           .insert(sList)
                           .then(async (res) => {
                              console.log("res",res);
                              return res;
                           })
                           .catch((err) => {
                              console.log("err",err);
                              throw e;
                           });
                           
      resultCd = '1111';      
                           
      sList = {
         merchant_id: iResult.merchantId,
         uuid: iResult.uuid,
         store_id: iResult.storeId,
         order_id: insert[0],
         points: 0,
         type: 5,
         description: "결재완료",
         status: 1
      }
      await trx("wm_merchant_points") 
            .insert(sList)
            .then(async (res) => {
               console.log("res",res);
               return res;
            })
            .catch((err) => {
               console.log("err",err);
               throw e;
            });

      resultCd = '2222'; 

      for await (const iterator of iResult.commercialList) {
         const toDate = moment(iterator.toDate).add(30,"days").format('YYYY-MM-DD');
         if(iterator.key === "1"){
            sList = {
               admin_id: 5,
               event_type: 'popup_adver',
               recurring: null,
               title: iResult.sImgTitle,
               subtitle: iResult.sImgSubTitle,
               content: "",
               img_url_thumbnail: iResult.sImg,
               img_url1: iResult.sImg,
               has_action: 2,
               has_action_param: iResult.iLat + "," + iResult.iLng + "," + iResult.storeId,
               lat: iResult.iLat,
               lng: iResult.iLng,
               radius: 3,
               start_date: moment(iterator.toDate).format('YYYY-MM-DD'),
               end_date: toDate,
               status: 1
            }
            const eventId = await trx("wm_event") 
                                 .insert(sList)
                                 .then(async (res) => {
                                    console.log("res",res);
                                    return res;
                                 })
                                 .catch((err) => {
                                    console.log("err",err);
                                    throw e;
                                 });

            resultCd = '3333'; 

            sList = {
               merchant_id: iResult.merchantId,
               store_id: iResult.storeId,
               event_id: eventId[0],
               order_id: insert[0],
               end_date: toDate,
               status: 1
            }
            await trx("wm_adver_event") 
                  .insert(sList)
                  .then(async (res) => {
                     console.log("res",res);
                     return res;
                  })
                  .catch((err) => {
                     console.log("err",err);
                     throw e;
                  });

            resultCd = '4444'; 

         } else if (iterator.key === "2") {
            sList = {
               merchant_id: iResult.merchantId,
               store_id: iResult.storeId,
               coupon_id: iResult.couponId,
               order_id: insert[0],
               end_date: toDate,
               status: 1
            }
            await trx("wm_adver_coupon") 
                  .insert(sList)
                  .then(async (res) => {
                     console.log("res",res);
                     return res;
                  })
                  .catch((err) => {
                     console.log("err",err);
                     throw e;
                  });

            resultCd = '5555'; 

         } else if (iterator.key === "3") {
            sList = {
               merchant_id: iResult.merchantId,
               store_id: iResult.storeId,
               product_id: iResult.throoOnlyId,
               order_id: insert[0],
               end_date: toDate,
               status: 1
            }
            await trx("wm_adver_product_throo_only") 
                  .insert(sList)
                  .then(async (res) => {
                     console.log("res",res);
                     return res;
                  })
                  .catch((err) => {
                     console.log("err",err);
                     throw e;
                  });

            resultCd = '6666';
            
         } else if (iterator.key === "4") {
            sList = {
               merchant_id: iResult.merchantId,
               store_id: iResult.storeId,
               order_id: insert[0],
               end_date: toDate,
               status: 1
            }
            await trx("wm_adver_store") 
                  .insert(sList)
                  .then(async (res) => {
                     console.log("res",res);
                     return res;
                  })
                  .catch((err) => {
                     console.log("err",err);
                     throw e;
                  });

            resultCd = '7777';
            
         } else if (iterator.key === "5") {
            sList = {
               merchant_id: iResult.merchantId,
               store_id: iResult.storeId,
               product_id: iResult.hotMenuId,
               order_id: insert[0],
               end_date: toDate,
               status: 1
            }
            await trx("wm_adver_product_popular") 
                  .insert(sList)
                  .then(async (res) => {
                     console.log("res",res);
                     return res;
                  })
                  .catch((err) => {
                     console.log("err",err);
                     throw e;
                  });

            resultCd = '8888';

         }
      }

      resultCd = '0000';
      await trx.commit();
      return resultCd;
   }
   catch (e) {
      await trx.rollback();
      return resultCd;
   }
}

Store.completePointCommercial = async (iResult) => {
   let resultCd = '9999';
   let sList = {}

   const trx = await knex.transaction();
   try {
      sList = {
         order_nr: iResult.orderNr,
         type_id: 1,
         uuid: iResult.uuid,
         merchant_id: iResult.merchantId,
         store_id: iResult.storeId,
         state_id: 14002,
         discount_amount: iResult.pointAmount,
         total_amount_org: iResult.cartAmount,
         total_amount_incl: iResult.payAmount,
         total_amount_excl: iResult.payAmount,
         phone_number: iResult.merchantPhone,
         device_os_info: iResult.osInfo,
         product_name: iResult.productNm
      }
      const insert = await trx("wm_adver_order") 
                           .insert(sList)
                           .then(async (res) => {
                              console.log("res",res);
                              return res;
                           })
                           .catch((err) => {
                              console.log("err",err);
                              throw e;
                           });
                           
      resultCd = '1111';      
                           
      sList = {
         merchant_id: iResult.merchantId,
         uuid: iResult.uuid,
         store_id: iResult.storeId,
         order_id: insert[0],
         points: - Math.abs(iResult.pointAmount),
         type: 3,
         description: "결재완료",
         status: 1
      }
      await trx("wm_merchant_points") 
            .insert(sList)
            .then(async (res) => {
               console.log("res",res);
               return res;
            })
            .catch((err) => {
               console.log("err",err);
               throw e;
            });

      resultCd = '2222'; 

      for await (const iterator of iResult.commercialList) {
         const toDate = moment(iterator.toDate).add(30,"days").format('YYYY-MM-DD');
         if(iterator.key === "1"){
            sList = {
               admin_id: 5,
               event_type: 'popup_adver',
               recurring: null,
               title: iResult.sImgTitle,
               subtitle: iResult.sImgSubTitle,
               content: "",
               img_url_thumbnail: iResult.sImg,
               img_url1: iResult.sImg,
               has_action: 2,
               has_action_param: iResult.iLat + "," + iResult.iLng + "," + iResult.storeId,
               lat: iResult.iLat,
               lng: iResult.iLng,
               radius: 3,
               start_date: moment(iterator.toDate).format('YYYY-MM-DD'),
               end_date: toDate,
               status: 1
            }
            const eventId = await trx("wm_event") 
                                 .insert(sList)
                                 .then(async (res) => {
                                    console.log("res",res);
                                    return res;
                                 })
                                 .catch((err) => {
                                    console.log("err",err);
                                    throw e;
                                 });

            resultCd = '3333'; 

            sList = {
               merchant_id: iResult.merchantId,
               store_id: iResult.storeId,
               event_id: eventId[0],
               order_id: insert[0],
               end_date: toDate,
               status: 1
            }
            await trx("wm_adver_event") 
                  .insert(sList)
                  .then(async (res) => {
                     console.log("res",res);
                     return res;
                  })
                  .catch((err) => {
                     console.log("err",err);
                     throw e;
                  });

            resultCd = '4444'; 

         } else if (iterator.key === "2") {
            sList = {
               merchant_id: iResult.merchantId,
               store_id: iResult.storeId,
               coupon_id: iResult.couponId,
               order_id: insert[0],
               end_date: toDate,
               status: 1
            }
            await trx("wm_adver_coupon") 
                  .insert(sList)
                  .then(async (res) => {
                     console.log("res",res);
                     return res;
                  })
                  .catch((err) => {
                     console.log("err",err);
                     throw e;
                  });

            resultCd = '5555'; 

         } else if (iterator.key === "3") {
            sList = {
               merchant_id: iResult.merchantId,
               store_id: iResult.storeId,
               product_id: iResult.throoOnlyId,
               order_id: insert[0],
               end_date: toDate,
               status: 1
            }
            await trx("wm_adver_product_throo_only") 
                  .insert(sList)
                  .then(async (res) => {
                     console.log("res",res);
                     return res;
                  })
                  .catch((err) => {
                     console.log("err",err);
                     throw e;
                  });

            resultCd = '6666';
            
         } else if (iterator.key === "4") {
            sList = {
               merchant_id: iResult.merchantId,
               store_id: iResult.storeId,
               order_id: insert[0],
               end_date: toDate,
               status: 1
            }
            await trx("wm_adver_store") 
                  .insert(sList)
                  .then(async (res) => {
                     console.log("res",res);
                     return res;
                  })
                  .catch((err) => {
                     console.log("err",err);
                     throw e;
                  });

            resultCd = '7777';
            
         } else if (iterator.key === "5") {
            sList = {
               merchant_id: iResult.merchantId,
               store_id: iResult.storeId,
               product_id: iResult.hotMenuId,
               order_id: insert[0],
               end_date: toDate,
               status: 1
            }
            await trx("wm_adver_product_popular") 
                  .insert(sList)
                  .then(async (res) => {
                     console.log("res",res);
                     return res;
                  })
                  .catch((err) => {
                     console.log("err",err);
                     throw e;
                  });

            resultCd = '8888';

         }
      }
      resultCd = '0000';
      await trx.commit();
      return resultCd;
   }
   catch (e) {
      await trx.rollback();
      return resultCd;
   }
}

Store.payCommercialLastStep = async (storeId,orderId,commercialItem) => {
   let resultCd = '9999';

   const trx = await knex.transaction();
   try {
      await trx("wm_merchant_points")
            .where({ store_id: storeId })
            .where({ order_id: orderId })
            .update({ status: 1, description: "결재완료", updated_at: knex.fn.now() })
            .then(async (res) => {
               return res;
            })
            .catch((err) => {
               console.log("err",err);
               throw e;
            });
            resultCd = '8888';

      for await (const iterator of commercialItem) {
         if(iterator.key === "wm_adver_coupon"){
            await trx("wm_adver_coupon")
                  .where({ store_id: storeId })
                  .where({ adver_coupon_id: parseInt(iterator.id) })
                  .where({ order_id: orderId })
                  .update({ status: 1 })
                  .then(async (res) => {
                     return res;
                  })
                  .catch((err) => {
                     console.log("err",err);
                     throw e;
                  });
                  resultCd = '7777';
            
         } else if (iterator.key === "wm_adver_event") {
            await trx("wm_event")
                  .where({ event_id: parseInt(iterator.param) })
                  .update({ status: 1, updated_at: knex.fn.now() })
                  .then(async (res) => {
                     return res;
                  })
                  .catch((err) => {
                     console.log("err",err);
                     throw e;
                  });
                  resultCd = '6666';

            await trx("wm_adver_event")
                  .where({ store_id: storeId })
                  .where({ adver_event_id: parseInt(iterator.id) })
                  .where({ order_id: orderId })
                  .update({ status: 1 })
                  .then(async (res) => {
                     return res;
                  })
                  .catch((err) => {
                     console.log("err",err);
                     throw e;
                  });
                  resultCd = '6667';
            
         } else if (iterator.key === "wm_adver_product_popular") {
            await trx("wm_adver_product_popular")
                  .where({ store_id: storeId })
                  .where({ adver_product_popular_id: parseInt(iterator.id) })
                  .where({ order_id: orderId })
                  .update({ status: 1 })
                  .then(async (res) => {
                     return res;
                  })
                  .catch((err) => {
                     console.log("err",err);
                     throw e;
                  });
                  resultCd = '5555';
            
         } else if (iterator.key === "wm_adver_product_throo_only") {
            await trx("wm_adver_product_throo_only")
                  .where({ store_id: storeId })
                  .where({ adver_product_throo_only_id: parseInt(iterator.id) })
                  .where({ order_id: orderId })
                  .update({ status: 1 })
                  .then(async (res) => {
                     return res;
                  })
                  .catch((err) => {
                     console.log("err",err);
                     throw e;
                  });
                  resultCd = '4444';
            
         } else if (iterator.key === "wm_adver_store") {
            await trx("wm_adver_store")
                  .where({ store_id: storeId })
                  .where({ adver_store_id: parseInt(iterator.id) })
                  .where({ order_id: orderId })
                  .update({ status: 1 })
                  .then(async (res) => {
                     return res;
                  })
                  .catch((err) => {
                     console.log("err",err);
                     throw e;
                  });
                  resultCd = '3333';
            
         }
      }
      resultCd = '0000';
      await trx.commit();
      return resultCd;
   }
   catch (e) {
      await trx.rollback();
      return resultCd;
   }
}

Store.payCommercialFirstStep = async (iResult) => {
   let result = {
      resultCd: '9999',
      orderId: null,
   }
      
   let sList = {}

   const trx = await knex.transaction();
   try {
      sList = {
         order_nr: iResult.orderNr,
         type_id: 1,
         uuid: iResult.uuid,
         merchant_id: iResult.merchantId,
         store_id: iResult.storeId,
         state_id: 14001,
         discount_amount: iResult.pointAmount,
         total_amount_org: iResult.cartAmount,
         total_amount_incl: iResult.payAmount,
         total_amount_excl: iResult.payAmount,
         phone_number: iResult.merchantPhone,
         device_os_info: iResult.osInfo,
         product_name: iResult.productNm
      }
      const insert = await trx("wm_adver_order") 
                           .insert(sList)
                           .then(async (res) => {
                              console.log("res",res);
                              return res;
                           })
                           .catch((err) => {
                              console.log("err",err);
                              throw e;
                           });
                           
      result.resultCd = '1111';   

      sList = {
         merchant_id: iResult.merchantId,
         uuid: iResult.uuid,
         store_id: iResult.storeId,
         order_id: insert[0],
         points: - Math.abs(iResult.pointAmount),
         type: 4,
         description: "결제대기중",
         status: 0
      }
      await trx("wm_merchant_points") 
            .insert(sList)
            .then(async (res) => {
               console.log("res",res);
               return res;
            })
            .catch((err) => {
               console.log("err",err);
               throw e;
            });

      result.resultCd = '2222';    

      for await (const iterator of iResult.commercialList) {
         const toDate = moment(iterator.toDate).add(30,"days").format('YYYY-MM-DD');
         if(iterator.key === "1"){
            sList = {
               admin_id: 5,
               event_type: 'popup_adver',
               recurring: null,
               title: iResult.sImgTitle,
               subtitle: iResult.sImgSubTitle,
               content: "",
               img_url_thumbnail: iResult.sImg,
               img_url1: iResult.sImg,
               has_action: 2,
               has_action_param: iResult.iLat + "," + iResult.iLng + "," + iResult.storeId,
               lat: iResult.iLat,
               lng: iResult.iLng,
               radius: 3,
               start_date: moment(iterator.toDate).format('YYYY-MM-DD'),
               end_date: toDate,
               status: 0
            }
            const eventId = await trx("wm_event") 
                                 .insert(sList)
                                 .then(async (res) => {
                                    console.log("res",res);
                                    return res;
                                 })
                                 .catch((err) => {
                                    console.log("err",err);
                                    throw e;
                                 });

            result.resultCd = '3333'; 

            sList = {
               merchant_id: iResult.merchantId,
               store_id: iResult.storeId,
               event_id: eventId[0],
               order_id: insert[0],
               end_date: toDate,
               status: 0
            }
            await trx("wm_adver_event") 
                  .insert(sList)
                  .then(async (res) => {
                     console.log("res",res);
                     return res;
                  })
                  .catch((err) => {
                     console.log("err",err);
                     throw e;
                  });

            result.resultCd = '4444'; 

         } else if (iterator.key === "2") {
            sList = {
               merchant_id: iResult.merchantId,
               store_id: iResult.storeId,
               coupon_id: iResult.couponId,
               order_id: insert[0],
               end_date: toDate,
               status: 0
            }
            await trx("wm_adver_coupon") 
                  .insert(sList)
                  .then(async (res) => {
                     console.log("res",res);
                     return res;
                  })
                  .catch((err) => {
                     console.log("err",err);
                     throw e;
                  });

            result.resultCd = '5555'; 

         } else if (iterator.key === "3") {
            sList = {
               merchant_id: iResult.merchantId,
               store_id: iResult.storeId,
               product_id: iResult.throoOnlyId,
               order_id: insert[0],
               end_date: toDate,
               status: 0
            }
            await trx("wm_adver_product_throo_only") 
                  .insert(sList)
                  .then(async (res) => {
                     console.log("res",res);
                     return res;
                  })
                  .catch((err) => {
                     console.log("err",err);
                     throw e;
                  });

            result.resultCd = '6666';

         } else if (iterator.key === "4") {
            sList = {
               merchant_id: iResult.merchantId,
               store_id: iResult.storeId,
               order_id: insert[0],
               end_date: toDate,
               status: 0
            }
            await trx("wm_adver_store") 
                  .insert(sList)
                  .then(async (res) => {
                     console.log("res",res);
                     return res;
                  })
                  .catch((err) => {
                     console.log("err",err);
                     throw e;
                  });

            result.resultCd = '7777';

         } else if (iterator.key === "5") {
            sList = {
               merchant_id: iResult.merchantId,
               store_id: iResult.storeId,
               product_id: iResult.hotMenuId,
               order_id: insert[0],
               end_date: toDate,
               status: 0
            }
            await trx("wm_adver_product_popular") 
                  .insert(sList)
                  .then(async (res) => {
                     console.log("res",res);
                     return res;
                  })
                  .catch((err) => {
                     console.log("err",err);
                     throw e;
                  });

            result.resultCd = '8888';

         }
      }
      result.resultCd = '0000';
      result.orderId = insert[0];
      await trx.commit();
      return result;
   }
   catch (e) {
      await trx.rollback();
      return result;
   }
}

Store.mainMenuInsert = async (targetKeys,store_id,categoryId) => {
   let resultCd = '9999';
   let sList = {}
   let productOption = [];

   const trx = await knex.transaction();
   try {
      for await (const iterator of targetKeys) {
         const sOption = await fnGetMainMenuOption(iterator.key,store_id);
         if(sOption.length > 0){
            productOption = sOption;
         }
         const getProductCopy = await Store.getProductCopy(parseInt(store_id),parseInt(iterator.key));
         if(getProductCopy.length > 0){
            const checkProduct = await Store.checkOutMainProduct(getProductCopy[0].name.toString(),getProductCopy[0].name.toString() + "대표메뉴");
            console.log("checkProduct",checkProduct);
            if(checkProduct.length > 0){
               console.log("out");
            } else {
               console.log("in");
               sList = {
                  store_id : store_id,
                  name : getProductCopy[0].name.toString(),
                  name2 : getProductCopy[0].name.toString() + "대표메뉴",
                  description : getProductCopy[0].description.toString(),
                  base_price : getProductCopy[0].base_price,
                  org_price : getProductCopy[0].org_price,
                  out_of_stock : 0,
                  in_stock : 0,
                  status : 1,
                  is_deleted : 0,
                  id_order : getProductCopy[0].id_order
               }
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
   
               if(getProductCopy[0].url_path !== undefined && getProductCopy[0].url_path !== null && getProductCopy[0].url_path !== ""){
                  sList = {
                     product_id : insertProduct[0],
                     option_id : 0,
                     file_name : getProductCopy[0].file_name,
                     full_path : getProductCopy[0].full_path,
                     url_path : getProductCopy[0].url_path,
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
   
               if(productOption !== undefined && productOption !== null && productOption.length > 0){
                  for await (let i of productOption) {
                     let xCount = 0;
                     const getOption = await Store.getOptionDetail(i.key);
                     for await (let x of getOption) {
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
            }
         }
      }
      resultCd = '0000';
      await trx.commit();
      return resultCd;
   }
   catch (e) {
      await trx.rollback();
      return resultCd;
   }
}

Store.searchProduct = (storeId,sParam) => {
   let name = "%" + sParam + "%";

   let sQuery = knex.raw(`
               product_id, 
               name, 
               base_price 
      FROM     wm_product 
      WHERE    store_id = ?
      AND      name LIKE ?
      AND      status = 1 
      AND      is_deleted = 0
   `, [storeId,name]);

   let oQuery = knex.select(sQuery);

   return oQuery.then( (result) => {
      return result;
   }).catch((err) => console.log(err));
}

Store.checkOptionGroupNm = (iStoreId,iParam) => {
   return knex.select("option_type_id")
      .from('wm_product_option_type')
      .where({ store_id: iStoreId })
      .where({ name: iParam })
      .timeout(config.queryTimeout).first().then(function (result) {
         return result;
      })
      .catch((err) => console.log(err));
}

Store.checkCommercialEventId = (iStoreId,iParam) => {
   return knex.select("event_id")
      .from('wm_adver_event')
      .where({ store_id: iStoreId })
      .where({ adver_event_id: iParam })
      .where({ status: 1 })
      .then(function (result) {
         return result;
      })
      .catch((err) => console.log(err));
}

Store.cancelCouponTargetUser = async (sParam) => {
   let sQuery = knex.raw(`     
                  t1.order_id, 
                  t1.store_id, 
                  t1.user_id, 
                  t2.phone_number 
      FROM        wm_order          AS t1
      INNER JOIN  wm_user           AS t2 ON t1.user_id = t2.user_id
      WHERE       t1.order_id = ?
   `, [sParam]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err", err));
}

Store.getMainMenuProduct = async (sParam) => {
   let sQuery = knex.raw(`     
                  t1.product_id, 
                  t2.name, 
                  t2.base_price, 
                  t3.url_path 
      FROM        wm_menu_cat_x_prd    AS t1
      INNER JOIN  wm_product           AS t2 ON t1.product_id = t2.product_id
      LEFT  JOIN  wm_product_media     AS t3 ON t3.product_id = t2.product_id 
      WHERE       t1.category_id = ?  
      AND         t2.is_deleted = 0
      AND         t2.status = 1
      ORDER BY    t2.id_order
   `, [sParam]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err", err));
}

Store.getMainMenuId = async (sParam) => {
   let sQuery = knex.raw(`     
                  t1.menu_id,
                  t2.is_main,
                  t2.category_id
      FROM        wm_menu           AS t1
      INNER JOIN  wm_menu_category  AS t2 ON t1.menu_id = t2.menu_id
      WHERE       t1.store_id = ?
      AND         t2.is_deleted = 0    
   `, [sParam]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err", err));
}

Store.getInsideOfOption = async (sParam,iParam) => {
   let sQuery = knex.raw(`             
                  t1.name 
      FROM        wm_product              AS t1 
      INNER JOIN  wm_product_option       AS t2 ON t1.product_id = t2.product_id
      INNER JOIN  wm_product_option_type  AS t3 ON t3.option_type_id = t2.option_type_id
      WHERE       t1.store_id = ?
      AND         t3.option_type_id = ?
      GROUP BY    t1.product_id

   `, [sParam,iParam]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err", err));
}

Store.getChargedInfomationCommercial = async (sParam) => {
   let sQuery = knex.raw(`   
                     t1.state_id, 
                     t1.discount_amount, 
                     t3.result_cd, 
                     t3.amount,
                     t4.type
         FROM        wm_adver_order                AS t1
         INNER JOIN  wm_adver_order_payment        AS t2 ON t2.payment_id = t1.payment_id
         INNER JOIN  wm_adver_order_payment_tpay   AS t3 ON t3.payment_id = t2.payment_id 
         INNER JOIN  wm_merchant_points            AS t4 ON t4.order_id = t1.order_id 
         WHERE       t1.order_id = ?
   `, [sParam]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err", err));
}

Store.getCommercialPointList = async (sParam,fDate,tDate) => {
   let sQuery = knex.raw(`   
                     t2.description, 
                     t2.points,
                     t2.type, 
                     t2.created_at, 
                     t3.discount_amount, 
                     t3.total_amount_org,
                     t3.total_amount_incl 
      FROM           wm_store             AS t1
      INNER JOIN     wm_merchant_points   AS t2 ON t1.store_id = t2.store_id 
      LEFT JOIN      wm_adver_order       AS t3 ON t3.order_id = t2.order_id 
      WHERE          t1.store_id = ?
      AND            t2.created_at BETWEEN DATE(?) AND DATE(?)
      AND            t2.status = 1
   `, [sParam,fDate,tDate]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err", err));
}

Store.adverEventByDate = async (sParam,fDate,tDate) => {
   let sQuery = knex.raw(`   
                     t2.description, 
                     t2.points,
                     t2.type, 
                     t2.created_at, 
                     t3.discount_amount, 
                     t3.total_amount_excl,
                     t3.total_amount_incl 
      FROM           wm_store             AS t1
      INNER JOIN     wm_merchant_points   AS t2 ON t1.store_id = t2.store_id 
      LEFT JOIN      wm_adver_order       AS t3 ON t3.order_id = t2.order_id 
      WHERE          t1.store_id = ?
      AND            t2.created_at BETWEEN DATE(?) AND DATE(?)
      AND            t2.status = 1
   `, [sParam,fDate,tDate]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err", err));
}

Store.getCommercialListOrdered = async (sParam) => {
   let sQuery = knex.raw(`             
                     t2.adver_coupon_id, 
                     t3.adver_event_id, 
                     t4.adver_product_popular_id, 
                     t5.adver_product_throo_only_id, 
                     t6.adver_store_id, 
                     t3.event_id 
      FROM           wm_adver_order                AS t1
      LEFT JOIN      wm_adver_coupon               AS t2 ON t2.order_id = t1.order_id AND t2.status = 0
      LEFT JOIN      wm_adver_event                AS t3 ON t3.order_id = t1.order_id AND t3.status = 0
      LEFT JOIN      wm_adver_product_popular      AS t4 ON t4.order_id = t1.order_id AND t4.status = 0
      LEFT JOIN      wm_adver_product_throo_only   AS t5 ON t5.order_id = t1.order_id AND t5.status = 0
      LEFT JOIN      wm_adver_store                AS t6 ON t6.order_id = t1.order_id AND t6.status = 0
      WHERE          t1.order_id = ?
   `, [sParam]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err", err));
}

Store.getBasicInfomationCommercial = async (sParam) => {
   let sQuery = knex.raw(`             
                  t1.phone_number, 
                  t1.merchant_id, 
                  t2.store_name,
                  t2.lat,
                  t2.lng
      FROM        wm_merchant              AS t1 
      INNER JOIN  wm_store                 AS t2 ON t1.store_id = t2.store_id
      WHERE       t1.store_id = ?
   `, [sParam]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err", err));
}

Store.checkOutMainProduct = async (iParam,kParam) => {
   return  knex.select('name')
               .from('wm_product')
               .where({ 'is_deleted': 0 })
               .where({ 'status': 1 })
               .where({ 'name': iParam })
               .where({ 'name2': kParam })
               .then(function (result) {
                  return result;
               })
               .catch((err) => console.log(err));
}

Store.adverEventData = async (iParam) => {
   return  knex.select("event_id", "title", "subtitle", "img_url_thumbnail", "img_url1")
               .from('wm_event')
               .where({ 'event_type': "popup_adver" })
               .where({ 'event_id': iParam })
               .then(function (result) {
                  return result;
               })
               .catch((err) => console.log(err));
}

Store.checkWalkThrooCongestionTime = async (iParam) => {
   return  knex.select('store_time_order_cong_id')
               .from('wm_store_time_congestion_walkthru')
               .where({ 'store_id': iParam })
               .where({ 'status': 1 })
               .then(function (result) {
                  return result;
               })
               .catch((err) => console.log(err));
}

Store.connectThrooStoreApp = (sIndex,dIndex,aIndex) => {
   return   knex("wmpos_user_login_log")
            .insert({ ip_address: dIndex, store_id: sIndex, pos_version: aIndex, created_at: knex.fn.now()})
            .then((result) => {
               return result;
            }).catch((err) => console.log(err));
}

Store.insertWalkThrooCongestionTime = (sIndex,aIndex) => {
   return   knex("wm_store_time_congestion_walkthru")
            .insert({ store_id: aIndex, congestion_type: 0, minute: sIndex, status: 1, created_at: knex.fn.now()})
            .then((result) => {
               return result;
            }).catch((err) => console.log(err));
}

Store.connectThrooStoreAppLogin = (sIndex,dIndex,aIndex) => {
   return   knex("wmpos_user_login_log")
            .insert({ ip_address: dIndex, store_id: sIndex, pos_version: aIndex, created_at: knex.fn.now(), login_at : knex.fn.now() })
            .then((result) => {
               return result;
            }).catch((err) => console.log(err));
}

Store.getStoreAlert = (iStoreId) => {
   return knex.select('description_noti')
      .from('wm_store')
      .where({ 'store_id': iStoreId })
      .timeout(config.queryTimeout).first().then(function (result) {
         return result;
      })
      .catch((err) => console.log(err));
}

Store.storePause = (iStoreId) => {
   return knex.select('pause')
      .from('wm_store')
      .where({ 'store_id': iStoreId })
      .timeout(config.queryTimeout).first().then(function (result) {
         return result;
      })
      .catch((err) => console.log(err));
}

Store.getIntroduction = (iStoreId) => {
   return knex.select('description')
      .from('wm_store')
      .where({ 'store_id': iStoreId })
      .timeout(config.queryTimeout).first().then(function (result) {
         return result;
      })
      .catch((err) => console.log(err));
}

Store.getOriginIntroduction = (iStoreId) => {
   return knex.select('description_extra')
      .from('wm_store')
      .where({ 'store_id': iStoreId })
      .timeout(config.queryTimeout).first().then(function (result) {
         return result;
      })
      .catch((err) => console.log(err));
}

Store.checkCommercialOpen = () => {
   return knex.select('value')
      .from('throo_app_config')
      .where({ 'app_config_id': 401 })
      .then(function (result) {
         return result;
      })
      .catch((err) => console.log(err));
}

Store.getStoreDescriptionNoti = (iStoreId) => {
   return knex.select('description_noti')
      .from('wm_store')
      .where({ 'store_id': iStoreId })
      .timeout(config.queryTimeout).first().then(function (result) {
         return result;
      })
      .catch((err) => console.log(err));
}

Store.getStoreNotiDistance = (iStoreId) => {
   return knex.select("noti_nearby_distance", "noti_arrival_distance", "parking_time", "store_name")
      .from('wm_store')
      .where({ store_id: iStoreId })
      .timeout(config.queryTimeout).first().then(function (result) {
         return result;
      })
      .catch((err) => console.log(err));
}

Store.getChildStores = (iStoreId) => {
   return knex.select('store_id')
      .from('wm_store')
      .where({ parent_store_id: parseInt(iStoreId) })
      .timeout(config.queryTimeout).then(function (result) {
         return result;
      })
      .catch((err) => console.log(err));
};

Store.storeCouponConnect = (sIndex,aIndex) => {
   return   knex("wm_event_coupon_x_store")
            .insert({ coupon_id: aIndex, store_id: sIndex })
            .then((result) => {
               return result;
            }).catch((err) => console.log(err));
}

Store.insertNoCommercialPoint = (sIndex,aIndex) => {
   return   knex("wm_merchant_points")
            .insert({ merchant_id: aIndex, uuid: "", store_id: sIndex, points: 150000, type: 1, status: 1 })
            .then((result) => {
               return result;
            }).catch((err) => console.log(err));
}

Store.storeStampChangeState = (aIndex,zIndex,dIndex) => {
   return   knex('wm_stamp')
            .update({ status: dIndex })
            .where({ store_id: aIndex })
            .where({ stamp_id: zIndex })
            .then((result) => {
               return result;
            }).catch((err) => console.log(err));
}

Store.completeCommercialChargedDB = (aIndex,zIndex,dIndex) => {
   return   knex('wm_merchant_points')
            .update({ status: 1, updated_at: knex.fn.now(), description: "결제완료" })
            .where({ store_id: aIndex })
            .where({ order_id: zIndex })
            .where({ points: (dIndex + (dIndex * 10 / 100)) })
            .then((result) => {
               return result;
            }).catch((err) => console.log(err));
}

Store.storePickUpInfo = (aIndex,zIndex,dIndex) => {
   return   knex('wm_store')
            .update({ noti_nearby_distance: aIndex, parking_time: zIndex })
            .where({ store_id: dIndex })
            .then((result) => {
               return result;
            }).catch((err) => console.log(err));
}

Store.editCommercialEventId = (aIndex,zIndex,dIndex,fIndex) => {
   return   knex('wm_event')
            .update({ title: zIndex, subtitle: dIndex, img_url1: fIndex, img_url_thumbnail: fIndex })
            .where({ event_id: aIndex })
            .where({ status: 1 })
            .where({ event_type: "popup_adver" })
            .then((result) => {
               return result;
            }).catch((err) => console.log(err));
}

Store.storeStampDelete = (aIndex,zIndex) => {
   return   knex('wm_stamp')
            .update({ status: 0 })
            .where({ store_id: aIndex })
            .where({ stamp_id: zIndex })
            .then((result) => {
               return result;
            }).catch((err) => console.log(err));
}

Store.storeStampEdit = (aIndex,zIndex) => {
   return   knex('wm_stamp')
            .update({ is_edit: 1 })
            .where({ store_id: aIndex })
            .where({ stamp_id: zIndex })
            .then((result) => {
               return result;
            }).catch((err) => console.log(err));
}

Store.storeCouponDelete = (aIndex,zIndex) => {
   return   knex('wm_event_coupon')
            .update({ status: 0 })
            .where({ store_id: aIndex })
            .where({ coupon_id: zIndex })
            .then((result) => {
               return result;
            }).catch((err) => console.log(err));
}

Store.couponUserDownload = async (sParam) => {
   let sQuery = knex.raw(`             
                  COUNT(user_coupon_id) AS nm
      FROM        wm_event_coupon_user       
      WHERE       coupon_id = ?
   `, [sParam]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err", err));
}

Store.isStampEvent = async (sParam,aParam) => {
   let sQuery = knex.raw(`             
                  stamp_id, 
                  store_id, 
                  stamp_coupon_id, 
                  status, 
                  minimum_amount, 
                  start_date, 
                  end_date
      FROM        wm_stamp       
      WHERE       store_id = ?
      AND         edited_at IS NULL
      AND         DATE(end_date) > ?
   `, [sParam,aParam]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err", err));
}

Store.getStoreWithoutCommercialPoint = async () => {
   let sQuery = knex.raw(`             
                  t1.store_id, 
                  t2.merchant_id 
      FROM        wm_store       AS t1
      INNER JOIN  wm_merchant    AS t2 ON t1.store_id = t2.store_id
   `, []);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err", err));
}

Store.stampUserDownload = async (sParam) => {
   let sQuery = knex.raw(`             
                  COUNT(stamp_coupon_user_id) AS nm
      FROM        wm_stamp_coupon_user       
      WHERE       stamp_coupon_id = ?
   `, [sParam]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err", err));
}

Store.stampUserCount = async (sParam,aParam) => {
   let sQuery = knex.raw(`             
                  stamp_user_id
      FROM        wm_stamp_user       
      WHERE       store_id = ?
      AND         stamp_id = ?
      GROUP BY    user_id
   `, [sParam,aParam]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err", err));
}

Store.adverEventChartCommercial = async (sIndex,aIndex,nIndex) => {
   let sQuery = knex.raw(`
               SUM(display_count) AS sNm
      FROM     wm_adver_event_stats
      WHERE    store_id = ?
      AND      DATE(created_at) = DATE(?)
      AND      adver_event_id = ?
   `, [sIndex,aIndex,nIndex]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Store.adverEventChartCommercialClicked = async (sIndex,aIndex,nIndex) => {
   let sQuery = knex.raw(`
               SUM(clicked_count) AS sNm
      FROM     wm_adver_event_stats
      WHERE    store_id = ?
      AND      DATE(created_at) = DATE(?)
      AND      adver_event_id = ?
   `, [sIndex,aIndex,nIndex]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Store.adverProductPopularChartCommercial = async (sIndex,aIndex,nIndex) => {
   let sQuery = knex.raw(`
               SUM(display_count) AS sNm
      FROM     wm_adver_product_popular_stats
      WHERE    store_id = ?
      AND      DATE(created_at) = DATE(?)
      AND      adver_product_popular_id = ?
   `, [sIndex,aIndex,nIndex]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Store.adverProductPopularChartCommercialClicked = async (sIndex,aIndex,nIndex) => {
   let sQuery = knex.raw(`
               SUM(clicked_count) AS sNm
      FROM     wm_adver_product_popular_stats
      WHERE    store_id = ?
      AND      DATE(created_at) = DATE(?)
      AND      adver_product_popular_id = ?
   `, [sIndex,aIndex,nIndex]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Store.adverCouponChartCommercial = async (sIndex,aIndex,nIndex) => {
   let sQuery = knex.raw(`
               SUM(display_count) AS sNm
      FROM     wm_adver_coupon_stats
      WHERE    store_id = ?
      AND      DATE(created_at) = DATE(?)
      AND      adver_coupon_id = ?
   `, [sIndex,aIndex,nIndex]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Store.adverCouponChartCommercialClicked = async (sIndex,aIndex,nIndex) => {
   let sQuery = knex.raw(`
               SUM(clicked_count) AS sNm
      FROM     wm_adver_coupon_stats
      WHERE    store_id = ?
      AND      DATE(created_at) = DATE(?)
      AND      adver_coupon_id = ?
   `, [sIndex,aIndex,nIndex]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Store.adverProductThroo_onlyChartCommercial = async (sIndex,aIndex,nIndex) => {
   let sQuery = knex.raw(`
               SUM(display_count) AS sNm
      FROM     wm_adver_product_throo_only_stats
      WHERE    store_id = ?
      AND      DATE(created_at) = DATE(?)
      AND      adver_product_throo_only_id = ?
   `, [sIndex,aIndex,nIndex]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Store.adverProductThroo_onlyChartCommercialClicked = async (sIndex,aIndex,nIndex) => {
   let sQuery = knex.raw(`
               SUM(clicked_count) AS sNm
      FROM     wm_adver_product_throo_only_stats
      WHERE    store_id = ?
      AND      DATE(created_at) = DATE(?)
      AND      adver_product_throo_only_id = ?
   `, [sIndex,aIndex,nIndex]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Store.adverStoreChartCommercial = async (sIndex,aIndex,nIndex) => {
   let sQuery = knex.raw(`
               SUM(display_count) AS sNm
      FROM     wm_adver_store_stats
      WHERE    store_id = ?
      AND      DATE(created_at) = DATE(?)
      AND      adver_store_id = ?
   `, [sIndex,aIndex,nIndex]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Store.adverStoreChartCommercialClicked = async (sIndex,aIndex,nIndex) => {
   let sQuery = knex.raw(`
               SUM(clicked_count) AS sNm
      FROM     wm_adver_store_stats
      WHERE    store_id = ?
      AND      DATE(created_at) = DATE(?)
      AND      adver_store_id = ?
   `, [sIndex,aIndex,nIndex]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Store.storeStampList = async (sParam) => {
   let sQuery = knex.raw(`             
                  t1.stamp_id,
                  t1.title,
                  t1.minimum_amount,
                  t1.completion_value,
                  t1.date_value,
                  t1.start_date,
                  t1.end_date,
                  t1.edited_At,
                  t1.stamp_coupon_id,
                  t1.status,
                  t2.partner_discount
      FROM        wm_stamp          AS t1
      INNER JOIN  wm_stamp_coupon   AS t2 ON t1.stamp_coupon_id = t2.stamp_coupon_id     
      WHERE       t1.store_id = ?
      ORDER BY    t1.stamp_id DESC
   `, [sParam]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err", err));
}

Store.storeCouponList = (aIndex) => {
   return  knex.select('*')
           .from("wm_event_coupon")
           .where({store_id : aIndex})
           .where({status : 1})
           .where({partnership : 1})
           .then(function (result) {
               return result;
           })
           .catch((err) => console.log(err));
}

Store.storeCouponAmountInsert = (sIndex,aIndex,qIndex,bIndex,xIndex,vIndex,jIndex,oIndex,pIndex) => {
   return   knex("wm_event_coupon")
            .insert({ type_id: 0, store_id: sIndex, price: aIndex, partner_discount: qIndex, requirement: bIndex, count_limit: xIndex, name: vIndex, description: jIndex, start_date: oIndex, end_date: pIndex})
            .then((result) => {
               return result;
            }).catch((err) => console.log(err));
}

Store.storeCouponAmountInsertHidden = (sIndex,aIndex,qIndex,bIndex,xIndex,vIndex,jIndex,oIndex,pIndex) => {
   return   knex("wm_event_coupon")
            .insert({ type_id: 0, store_id: sIndex, price: aIndex, partner_discount: qIndex, requirement: bIndex, count_limit: xIndex, name: vIndex, description: jIndex, start_date: oIndex, end_date: pIndex, hidden: 1})
            .then((result) => {
               return result;
            }).catch((err) => console.log(err));
}

Store.storeCouponPercentInsert = (sIndex,aIndex,qIndex,bIndex,xIndex,vIndex,jIndex,oIndex,pIndex,gIndex) => {
   return   knex("wm_event_coupon")
            .insert({ type_id: 1, store_id: sIndex, price: 0, percent: qIndex,requirement: bIndex, count_limit: xIndex, name: vIndex, description: jIndex, start_date: oIndex, end_date: pIndex, max_discount: gIndex})
            .then((result) => {
               return result;
            }).catch((err) => console.log(err));
}

Store.storeCouponInsert = (sIndex,aIndex,qIndex,bIndex,xIndex,vIndex,jIndex,oIndex,pIndex) => {
   return   knex("wm_event_coupon")
            .insert({ type_id: 0, store_id: sIndex, price: aIndex, partner_discount: qIndex, requirement: bIndex, count_limit: xIndex, name: vIndex, description: jIndex, start_date: oIndex, end_date: pIndex})
            .then((result) => {
               return result;
            }).catch((err) => console.log(err));
}

Store.getCurrentVersionNm = (aIndex,zIndex) => {
   return  knex.select('value')
           .from("throo_app_config")
           .where({env : aIndex})
           .where({name : zIndex})
           .timeout(config.queryTimeout).then(function (result) {
               return result;
           })
           .catch((err) => console.log(err));
}

Store.storeNotiForUser = (aIndex) => {
   return  knex.select('description_noti')
           .from("wm_store")
           .where({store_id : aIndex})
           .timeout(config.queryTimeout).then(function (result) {
               return result;
           })
           .catch((err) => console.log(err));
}

Store.getAdverEvent = async (storeId,sDate) => {
   let sQuery = knex.raw(`
               adver_event_id,
               event_id, 
               end_date 
      FROM     wm_adver_event 
      WHERE    store_id = ?
      AND      DATE(end_date) >= DATE(?)
      AND      status = 1
   `, [storeId,sDate]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Store.getAdverBanner = async (storeId,sDate) => {
   let sQuery = knex.raw(`
               adver_throo_banner_id, 
               end_date 
      FROM     wm_adver_throo_banner 
      WHERE    store_id = ?
      AND      DATE(end_date) >= DATE(?)
      AND      status = 1
   `, [storeId,sDate]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Store.getAdverThrooKit = async (storeId,sDate) => {
   let sQuery = knex.raw(`
               adver_throo_kit_id, 
               end_date 
      FROM     wm_adver_throo_kit 
      WHERE    store_id = ?
      AND      DATE(end_date) >= DATE(?)
      AND      status = 1
   `, [storeId,sDate]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Store.getAdverStore = async (storeId,sDate) => {
   let sQuery = knex.raw(`
               adver_store_id, 
               end_date 
      FROM     wm_adver_store 
      WHERE    store_id = ?
      AND      DATE(end_date) >= DATE(?)
      AND      status = 1
   `, [storeId,sDate]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Store.getAdverProductThrooOnly = async (storeId,sDate) => {
   let sQuery = knex.raw(`
               adver_product_throo_only_id, 
               end_date 
      FROM     wm_adver_product_throo_only 
      WHERE    store_id = ?
      AND      DATE(end_date) >= DATE(?)
      AND      status = 1
   `, [storeId,sDate]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Store.getAdverCoupon = async (storeId,sDate) => {
   let sQuery = knex.raw(`
               adver_coupon_id, 
               end_date 
      FROM     wm_adver_coupon 
      WHERE    store_id = ?
      AND      DATE(end_date) >= DATE(?)
      AND      status = 1
   `, [storeId,sDate]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Store.getAdverProductPopular = async (storeId,sDate) => {
   let sQuery = knex.raw(`
               adver_product_popular_id, 
               end_date 
      FROM     wm_adver_product_popular 
      WHERE    store_id = ?
      AND      DATE(end_date) >= DATE(?)
      AND      status = 1
   `, [storeId,sDate]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Store.getAdverEventByMonth = async (storeId) => {
   let sQuery = knex.raw(`
               adver_event_id, 
               end_date 
      FROM     wm_adver_event 
      WHERE    store_id = ?
      AND      status = 1
      ORDER BY adver_event_id DESC
   `, [storeId]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Store.getAdverStoreByMonth = async (storeId) => {
   let sQuery = knex.raw(`
               adver_store_id, 
               end_date 
      FROM     wm_adver_store 
      WHERE    store_id = ?
      AND      status = 1
      ORDER BY adver_store_id DESC
   `, [storeId]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Store.getAdverProductThrooOnlyByMonth = async (storeId) => {
   let sQuery = knex.raw(`
               adver_product_throo_only_id, 
               end_date 
      FROM     wm_adver_product_throo_only 
      WHERE    store_id = ?
      AND      status = 1
      ORDER BY adver_product_throo_only_id DESC
   `, [storeId]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Store.getAdverCouponByMonth = async (storeId) => {
   let sQuery = knex.raw(`
               adver_coupon_id, 
               end_date 
      FROM     wm_adver_coupon 
      WHERE    store_id = ?
      AND      status = 1
      ORDER BY adver_coupon_id DESC
   `, [storeId]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Store.getAdverProductPopularByMonth = async (storeId) => {
   let sQuery = knex.raw(`
               adver_product_popular_id, 
               end_date 
      FROM     wm_adver_product_popular 
      WHERE    store_id = ?
      AND      status = 1
      ORDER BY adver_product_popular_id DESC
   `, [storeId]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Store.userIncreaseChartCommercialProduct = async (sDate) => {
   let sQuery = knex.raw(`
               clicked_count AS sNm
      FROM     wm_adver_product_popular 
      WHERE    store_id = ?
   `, [sDate]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Store.userIncreaseChartCommercialEvent = async (sIndex) => {
   let sQuery = knex.raw(`
               clicked_count AS sNm
      FROM     wm_adver_event 
      WHERE    store_id = ?
   `, [sIndex]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Store.userIncreaseChartCommercialThrooOnly = async (sIndex) => {
   let sQuery = knex.raw(`
               clicked_count AS sNm
      FROM     wm_adver_product_throo_only 
      WHERE    store_id = ?
   `, [sIndex]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Store.userIncreaseChartCommercialStore = async (sIndex) => {
   let sQuery = knex.raw(`
               clicked_count AS sNm
      FROM     wm_adver_store 
      WHERE    store_id = ?
   `, [sIndex]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Store.getSoreCommercialThrooOnlyListWithImg = async (sIndex) => {
   let sQuery = knex.raw(`
               t1.product_id,
               t1.name,
               t1.base_price,
               t1.org_price,
               t2.url_path
   FROM        wm_product        AS t1 
   left join   wm_product_media  AS t2 ON t1.product_id = t2.product_id 
   WHERE       t1.store_id = ?
   AND         t1.status = 1
   AND         t1.is_deleted = 0
   AND         t1.is_throo_only = 1
   `, [sIndex]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Store.getCommercialOrderTime = async (sIndex) => {
   let sQuery = knex.raw(`
               t3.minute AS walking,
               t2.minute AS drive
   FROM        wm_store_time_business                 AS t1 
   LEFT JOIN   wm_store_time_congestion               AS t2 ON t1.congestion_type = t2.congestion_type 
   LEFT JOIN   wm_store_time_congestion_delivery      AS t3 ON t3.congestion_type = t1.congestion_type 
   WHERE       t1.store_id = ?
   `, [sIndex]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Store.getSoreCommercialStoreDetail = async (sIndex) => {
   let sQuery = knex.raw(`
               t1.store_name,
               t1.parking_time,
               t2.url_path
   FROM        wm_store        AS t1 
   LEFT JOIN   wm_store_media  AS t2 ON t1.store_id = t2.store_id 
   WHERE       t1.store_id = ?
   `, [sIndex]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Store.getSoreCommercialProductListWithImg = async (sIndex) => {
   let sQuery = knex.raw(`
               t1.product_id,
               t1.name,
               t1.base_price,
               t1.org_price,
               t2.url_path
   FROM        wm_product        AS t1 
   left join   wm_product_media  AS t2 ON t1.product_id = t2.product_id 
   WHERE       t1.store_id = ?
   AND         t1.status = 1
   AND         t1.is_deleted = 0
   `, [sIndex]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Store.userIncreaseChartCommercialCoupon = async (sIndex) => {
   let sQuery = knex.raw(`
               clicked_count AS sNm
      FROM     wm_adver_coupon 
      WHERE    store_id = ?
   `, [sIndex]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Store.getSoreCommercialProductList = (aIndex) => {
   return  knex.select('product_id','name', 'base_price', 'org_price')
           .from("wm_product")
           .where({store_id : aIndex})
           .where({status : 1})
           .where({is_deleted : 0})
           .then(function (result) {
               return result;
           })
           .catch((err) => console.log(err));
}

Store.getSoreCommercialThrooOnlyList = (aIndex) => {
   return  knex.select('product_id','name', 'base_price', 'org_price')
           .from("wm_product")
           .where({store_id : aIndex})
           .where({status : 1})
           .where({is_deleted : 0})
           .where({is_throo_only : 1})
           .then(function (result) {
               return result;
           })
           .catch((err) => console.log(err));
}

Store.getMerchantPoints = (aIndex) => {
   return  knex.select('store_point_id','merchant_id','order_id','points','type')
           .from("wm_merchant_points")
           .where({store_id : aIndex})
           .where({status : 1})
           .then(function (result) {
               return result;
           })
           .catch((err) => console.log(err));
}

Store.checkMegaStore = (aIndex) => {
   return  knex.select('store_id')
           .from("wm_store_x_megastore")
           .where({store_id : aIndex})
           .timeout(config.queryTimeout).then(function (result) {
               return result;
           })
           .catch((err) => console.log(err));
}

Store.chatUserInputMessageInsert = (sIndex,aIndex,qIndex) => {
   return   knex("wm_order_chat_input")
            .insert({ user_id: sIndex, sequence: aIndex, message: qIndex })
            .then((result) => {
               return result;
            }).catch((err) => console.log(err));
}

Store.chatStoreInputMessageInsert = (sIndex,aIndex,qIndex) => {
   return   knex("wm_order_chat_input")
            .insert({ store_id: sIndex, sequence: aIndex, message: qIndex })
            .then((result) => {
               return result;
            }).catch((err) => console.log(err));
}

Store.chatUserInputMessage = (sIndex,aIndex) => {
   return  knex.select('message')
           .from("wm_order_chat_input")
           .where({user_id : sIndex})
           .where({sequence : aIndex})
           .timeout(config.queryTimeout).then(function (result) {
               return result;
           })
           .catch((err) => console.log(err));
}

Store.chatStoreInputMessage = (sIndex,aIndex) => {
   return  knex.select('message')
           .from("wm_order_chat_input")
           .where({store_id : sIndex})
           .where({sequence : aIndex})
           .timeout(config.queryTimeout).then(function (result) {
               return result;
           })
           .catch((err) => console.log(err));
}

Store.chatUserInputMessageUpdate = (aIndex,zIndex,iIndex) => {
   return   knex('wm_order_chat_input')
            .update({ message: iIndex, updated_at: knex.fn.now() })
            .where({ user_id: aIndex })
            .where({ sequence: zIndex })
            .then((result) => {
               return result;
            }).catch((err) => console.log(err));
}

Store.changeStoreNoticeText = (aIndex,zIndex) => {
   return   knex('wm_store')
            .update({ description_noti: aIndex })
            .where({ store_id: zIndex })
            .then((result) => {
               return result;
            }).catch((err) => console.log(err));
}

Store.changeStoreDescriptionText = (aIndex,zIndex) => {
   return   knex('wm_store')
            .update({ description: aIndex })
            .where({ store_id: zIndex })
            .then((result) => {
               return result;
            }).catch((err) => console.log(err));
}

Store.changeStoreDescriptionExtraText = (aIndex,zIndex) => {
   return   knex('wm_store')
            .update({ description_extra: aIndex })
            .where({ store_id: zIndex })
            .then((result) => {
               return result;
            }).catch((err) => console.log(err));
}

Store.chatStoreInputMessageUpdate = (aIndex,zIndex,iIndex) => {
   return   knex('wm_order_chat_input')
            .update({ message: iIndex, updated_at: knex.fn.now() })
            .where({ store_id: aIndex })
            .where({ sequence: zIndex })
            .then((result) => {
               return result;
            }).catch((err) => console.log(err));
}

Store.updateCommercialPickUpZoneData = (aIndex,zIndex,kIndex,nIndex) => {
   return   knex("wm_event")
            .update({ lat: zIndex, lng: kIndex, has_action_param: nIndex })
            .where({ event_id: aIndex })
            .where({ status: 1 })
            .where({ event_type: "popup_adver" })
            .then((result) => {
               return result;
            }).catch((err) => console.log(err));
}

Store.changeOrderAutoConfirm = (aIndex,zIndex) => {
   return   knex(sTableName)
            .update({ auto_confirm: zIndex })
            .where({ store_id: aIndex })
            .then((result) => {
               return result;
            }).catch((err) => console.log(err));
}
Store.updatePushToken = (aIndex,zIndex) => {
   return   knex("wm_push_token_pos")
            .update({ token: zIndex, updated_at: knex.fn.now() })
            .where({ unique_id: aIndex })
            .then((result) => {
               return result;
            }).catch((err) => console.log(err));
}

Store.deletePushToken = (aIndex,zIndex) => {
   return   knex("wm_push_token_pos")
            .where({ unique_id: aIndex })
            .where({ store_id: zIndex })
            .del()
            .then((result) => {
               return result;
            }).catch((err) => console.log(err));
}

Store.onChangeSoldoutProduct = async (productId,soldOut) => {
   return   knex(sProduct)
            .update({ is_soldout: soldOut })
            .where({ product_id: productId })
            .then((result) => {
               return result;
            }).catch((err) => console.log(err));
}

Store.inventoryEdit = async (productId,count,isSoldOut) => {
   return   knex(sProduct)
            .update({ is_soldout: isSoldOut, in_stock: count })
            .where({ product_id: productId })
            .then((result) => {
               return result;
            }).catch((err) => console.log(err));
}

Store.deleteStore = async (storeId) => {
   let result_cd = "9999";
   
   const trx = await knex.transaction();
   try {
      await trx("wmpos_user")
            .where({ store_id: storeId })
            .update({ status: 0, activated: 0, parent_id: null, updated_at: knex.fn.now() })
            .then(async (res) => {
               return res;
            })
            .catch((err) => {
               console.log(err);
               throw e;
            });

      result_cd = '1111';      

      await trx("wm_store")
            .where({ store_id: storeId })
            .update({ status: 0, updated_at: knex.fn.now() })
            .then(async (res) => {
               return res;
            })
            .catch((err) => {
               console.log(err);
               throw e;
            });

      result_cd = '2222';

      await trx("wmpos_admin_x_group")
            .where({ store_id : storeId })
            .del()
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

Store.chargedPointFirstStep = async (oData) => {
   let result = {
      resultCd: "9999",
      resultId: 0,
   }

   const trx = await knex.transaction();
   try {
      let temp = {
         order_nr: oData.orderNr,
         type_id: 1,
         uuid: oData.uuid,
         merchant_id: oData.merchantId,
         store_id: oData.storeId,
         state_id: 14001,
         total_amount_org: oData.iPrice,
         total_amount_incl: oData.iPrice,
         total_amount_excl: oData.iPrice,
         phone_number: oData.merchantPhone,
         device_os_info: oData.osInfo,
         product_name: oData.productNm,
      }
      const insert = await trx("wm_adver_order") 
                           .insert(temp)
                           .then(async (res) => {
                              console.log("res",res);
                              return res;
                           })
                           .catch((err) => {
                              console.log("err",err);
                              throw e;
                           });
                           
      result.resultCd = '1111';      
                           
      temp = {
         merchant_id: oData.merchantId,
         uuid: oData.uuid,
         store_id: oData.storeId,
         order_id: insert[0],
         points: (oData.iPrice + (oData.iPrice * 10 / 100)),
         type: 2,
         description: "결제대기중",
         status: 0
      }
      await trx("wm_merchant_points") 
            .insert(temp)
            .then(async (res) => {
               console.log("res",res);
               return res;
            })
            .catch((err) => {
               console.log("err",err);
               throw e;
            });

      result.resultCd = '0000';
      result.resultId = insert[0];

      await trx.commit();
      return result;
   }
   catch (e) {
      await trx.rollback();
      return result;
   }
}

Store.getCategoryForCoupon = async (sParam) => {
   let sQuery = knex.raw(`             
               a1.category_id, 
               a1.name
      FROM     wm_menu_category AS a1
      WHERE    a1.menu_id = (SELECT t1.menu_id FROM wm_menu AS t1 WHERE t1.store_id = ?)
      AND      a1.is_deleted = 0 
      AND      a1.status = 1;
   `, [sParam]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err", err));
}

Store.checkCancelOrderCouponType = async (sParam) => {
   let sQuery = knex.raw(`             
                     t2.parent_store_type_id 
      FROM           wm_store_x_store_type AS t1
      INNER JOIN     wm_store_type AS t2 ON t1.store_type_id = t2.store_type_id 
      WHERE          t1.store_id = ?
      AND            t1.is_main = 1
   `, [sParam]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err", err));
}

Store.getProductForCoupon = async (sParam) => {
   let sQuery = knex.raw(`             
                  t2.product_id, 
                  t2.name 
      FROM        wm_menu_cat_x_prd    AS t1
      inner join  wm_product           AS t2 ON t1.product_id = t2.product_id
      WHERE       t1.category_id = ?
      AND         t2.is_deleted = 0
      AND         t2.status = 1
   `, [sParam]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err", err));
}

Store.checkOption = async (storeId,sName) => {
   return  knex.select("option_type_id")
               .from("wm_product_option_type")
               .where({store_id : storeId})
               .where({name : sName})
               .where({is_deleted : 0})
               .then(function (result) {
                  return result;
               })
               .catch((err) => console.log(err));
}

Store.checkOptionV2 = async (storeId,sIndex) => {
   return  knex.select("option_type_id")
               .from("wm_product_option_type")
               .where({store_id : storeId})
               .where({option_type_id : sIndex})
               .then(function (result) {
                  return result;
               })
               .catch((err) => console.log(err));
}

Store.checkMenuId = async (storeId) => {
   return  knex.select("menu_id")
               .from("wm_menu")
               .where({store_id : storeId})
               .then(function (result) {
                  return result;
               })
               .catch((err) => console.log(err));
}

Store.checkProductId = async (storeId,sName) => {
   return  knex.select("product_id")
               .from("wm_product")
               .where({store_id : storeId})
               .where({name : sName})
               .where({is_deleted : 0})
               .then(function (result) {
                  return result;
               })
               .catch((err) => console.log(err));
}

Store.checkOutStampCoupon = async (storeId,couponId) => {
   return  knex.select("coupon_id")
               .from("wm_stamp")
               .where({store_id : storeId})
               .where({coupon_id : couponId})
               .then(function (result) {
                  return result;
               })
               .catch((err) => console.log(err));
}

Store.getProductCopy = async (sParam,aParam) => {
   let sQuery = knex.raw(`             
                  t1.name,
                  t1.name2,
                  t1.description,
                  t1.base_price,
                  t1.org_price,
                  t1.id_order,
                  t2.file_name,
                  t2.full_path,
                  t2.url_path
      FROM        wm_product        AS t1
      LEFT JOIN   wm_product_media  AS t2 ON t1.product_id = t2.product_id
      WHERE       t1.store_id = ?
      AND         t1.product_id = ?
   `, [sParam,aParam]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err", err));
}

Store.getDesignateStoreProductV2 = async (sParam,aParam) => {
   let sQuery = knex.raw(`             
                     t6.product_id,
                     t6.name 
      FROM           wmpos_admin_user     AS t1
      INNER JOIN     wmpos_admin_x_group  AS t2 ON t1.admin_user_id = t2.admin_user_id
      INNER JOIN     wmpos_user           AS t3 ON t3.store_id = t2.store_id
      INNER JOIN     wm_store             AS t4 ON t4.store_id = t3.store_id 
      INNER JOIN     wm_merchant  		   AS t5 ON t5.store_id = t2.store_id 
      INNER JOIN     wm_product           AS t6 on t6.store_id = t3.store_id 
      WHERE          t1.admin_user_id = ?
      AND            t3.store_id = ?
      AND            t6.is_deleted = 0
      AND            t6.status = 1
   `, [sParam,aParam]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err", err));
}

Store.getDesignateStoreProduct = async (sParam,aParam) => {
   let sQuery = knex.raw(`             
                     t4.product_id,
                     t4.name 
      FROM           wmpos_admin_user     AS t1
      INNER JOIN     wmpos_user           AS t2 ON t1.group_id = t2.parent_id 
      INNER JOIN     wm_store             AS t3 ON t3.store_id = t2.store_id 
      INNER JOIN     wm_product           AS t4 on t4.store_id = t3.store_id 
      WHERE          t1.admin_user_id = ?
      AND            t3.store_id = ?
      AND            t4.is_deleted = 0
      AND            t4.status = 1
   `, [sParam,aParam]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err", err));
}

Store.getDesignateManagerStoreProduct = async (sParam) => {
   let sQuery = knex.raw(`             
                     t3.product_id,
                     t3.name 
      FROM           wmpos_user           AS t1 
      INNER JOIN     wm_store             AS t2 ON t2.store_id = t1.store_id 
      INNER JOIN     wm_product           AS t3 on t3.store_id = t1.store_id 
      WHERE          t1.store_id = ?
      AND            t3.is_deleted = 0
      AND            t3.status = 1
   `, [sParam]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err", err));
}

Store.getAllProduct = async (sParam) => {
   let sQuery = knex.raw(`             
                     t2.name, 
                     t2.product_id, 
                     t2.base_price
      FROM           wm_store          AS t1
      INNER JOIN     wm_product        AS t2 ON t1.store_id = t2.store_id 
      WHERE          t1.store_id = ?
      AND            t2.is_deleted = 0
      AND            t2.status = 1
   `, [sParam]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err", err));
}

Store.getOwnerByDate = async (fromDate,toDate) => {
   let sQuery = knex.raw(`             
                     CASE 
                           WHEN  t2.status > 0
                           THEN  "등록"
                           ELSE  "미등록"
                     END   AS "businessStatus",
                     (
                        SELECT   count(product_id) 
                        FROM     wm_product 
                        WHERE    store_id = t1.store_id
                     ) AS "productNm",
                     (
                        SELECT   count(store_id) 
                        FROM     wm_store_x_store_type 
                        WHERE    store_id = t1.store_id
                     ) AS "storeTypeNm",
                     (
                        SELECT 
                              CASE 
                                    WHEN  count(store_time_id) > 0
                                    THEN  "등록"
                                    ELSE  "미등록"
                              END   AS carNm      
                        FROM     wm_store_time_business 
                        WHERE    store_id = t1.store_id
                     ) AS "operationTime",
                     t1.status 
      FROM           wm_store       AS t1
      INNER JOIN     wm_merchant    AS t2 ON t1.store_id = t2.store_id 
      INNER JOIN     wmpos_user     AS t3 ON t1.store_id = t3.store_id 
      WHERE          DATE(t1.created_at) BETWEEN DATE(?) AND DATE(?)
      AND            t2.phone_number NOT IN ("01039438070","01029273377")
   `, [fromDate,toDate]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err", err));
}

Store.getOwnerCountByDate = async (storeId) => {
   let sQuery = knex.raw(`             
               COUNT(1) AS sNm
      FROM     wmpos_user_token 
      WHERE    ((DATE(loggedin_at) < NOW() AND loggedout_at IS NULL) || (NOW() BETWEEN  DATE(loggedin_at) AND DATE(loggedout_at))) 
      AND      store_id = ?
   `, [storeId]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err", err));
}

Store.isLogin = async (storeId) => {
   let sQuery = knex.raw(`             
               COUNT(1) AS sNm
      FROM     wmpos_user_token 
      WHERE    ((DATE(loggedin_at) < NOW() AND loggedout_at IS NULL) || (NOW() BETWEEN  DATE(loggedin_at) AND DATE(loggedout_at))) 
      AND      store_id = ?
   `, [storeId]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err", err));
}

Store.getSalesPoints = async (storeId) => {
   let sQuery = knex.raw(`             
                  t1.store_name,
                  t1.store_id, 
                  t2.email 
      FROM        wm_store          AS t1 
      INNER JOIN  wmpos_user        AS t2 ON t1.store_id = t2.store_id
      WHERE       t1.store_id = ?
   `, [storeId]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err", err));
}

Store.startOperation = async (storeId) => {
   return   knex(sTableName)
            .update({ status: 1, pause: 0, order_time: 0 })
            .where({ store_id: storeId })
            .then((result) => {
               return result;
            }).catch((err) => console.log(err));
}

Store.startOperationCeoPage = async (storeId) => {
   return   knex(sTableName)
            .update({ status: 1 })
            .where({ store_id: storeId })
            .then((result) => {
               return result;
            }).catch((err) => console.log(err));
}

Store.lastCheckUpAuthenticate = async (storeId) => {
   let sQuery = knex.raw(`
                     t1.store_name,             
                     t1.address1, 
                     t1.phone_number, 
                     t2.store_time_id, 
                     t3.store_type_id 
      FROM           wm_store                AS t1
      INNER JOIN     wm_store_time_business  AS t2 ON t1.store_id = t2.store_id 
      INNER JOIN     wm_store_x_store_type   AS t3 ON t1.store_id = t3.store_id
      WHERE          t1.store_id = ?
   `, [storeId]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err", err));
}

Store.checkUnRegisterStore = async (fromDate,toDate) => {
   let sQuery = knex.raw(`
                     t1.store_name AS "storeNm",
                     t1.created_at AS "createDate",
                     t2.full_name AS "ownerNm", 
                     t2.phone_number AS "phoneNm",
                     t2.email,
                     CASE 
                           WHEN  t2.status > 0
                           THEN  "등록"
                           ELSE  "미등록"
                     END   AS "businessStatus",
                     (
                        SELECT   count(product_id) 
                        FROM     wm_product 
                        WHERE    store_id = t1.store_id
                     ) AS "productNm",
                     (
                        SELECT   count(store_id) 
                        FROM     wm_store_x_store_type 
                        WHERE    store_id = t1.store_id
                     ) AS "storeTypeNm",
                     (
                        SELECT 
                                 CASE 
                                       WHEN  count(store_time_id) > 0
                                       THEN  "등록"
                                       ELSE  "미등록"
                                 END   AS carNm      
                        FROM     wm_store_time_business 
                        WHERE    store_id = t1.store_id
                     ) AS "operationTime"
      FROM           wm_store       AS t1
      INNER JOIN     wm_merchant    AS t2 ON t1.store_id = t2.store_id 
      INNER JOIN     wmpos_user     AS t3 ON t1.store_id = t3.store_id 
      WHERE          DATE(t1.created_at) BETWEEN DATE(?) AND DATE(?)
      AND            t2.phone_number NOT IN ("01039438070","01029273377")
      AND            t3.parent_id is null
      AND            t1.status = 0
      AND            t3.status = 1
   `, [fromDate,toDate]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err", err));
}

Store.setPickUpZone = async (sLat,sLng,sViewPoint,storeId) => {
   return   knex("wm_store")
            .update({ lat: sLat, lng: sLng, parking_pan: sViewPoint.pan, parking_tilt: sViewPoint.tilt, parking_zoom: sViewPoint.zoom })
            .where({ store_id: storeId })
            .then((result) => {
               return result;
            }).catch((err) => console.log(err));
}

Store.updateParkingImg = async (sImg,storeId) => {
   return   knex("wm_store")
            .update({ parking_image: sImg })
            .where({ store_id: storeId })
            .then((result) => {
               return result;
            }).catch((err) => console.log(err));
}

Store.editPickUp = async (sLat,sLng,sAddress,sExtraAddress,sPhoneNm,sNoti,sParkingTime,storeId,sParam) => {
   let oResult = "9999";

   const trx = await knex.transaction();
   try {
      if(sParam !== "skip"){
         await trx(iMerchant)
               .where({ store_id: storeId })
               .update({ phone_number: sPhoneNm, address1: sAddress, address2: sExtraAddress })
               .then(async (res) => {
                  return res;
               })
               .catch((err) => {
                  console.log("err",err);
                  throw e;
               });
               
         oResult = '8888';
      }

      await trx(sTableName)
            .where({ store_id: storeId })
            .update({ phone_number: sPhoneNm, address1: sAddress, address2: sExtraAddress, lat: sLat, lng: sLng, noti_nearby_distance: sNoti, parking_time: sParkingTime })
            .then(async (res) => {
               return res;
            })
            .catch((err) => {
               console.log("err",err);
               throw e;
            });
      oResult = '0000';

      await trx.commit();
      return oResult;
   }
   catch (e) {
      console.log("User.proprietorshipInsert fail !!! ===>",e);
      await trx.rollback();
      return oResult;
   }
}

Store.throoStoreStep1 = async (sLat,sLng,sAddress,sExtraAddress,sPhoneNm,storeId,sParam,storeName) => {
   let oResult = "9999";

   const trx = await knex.transaction();
   try {
      if(sParam !== "skip"){
         await trx(iMerchant)
               .where({ store_id: storeId })
               .update({ phone_number: sPhoneNm, address1: sAddress, address2: sExtraAddress })
               .then(async (res) => {
                  return res;
               })
               .catch((err) => {
                  console.log("err",err);
                  throw e;
               });
               
         oResult = '8888';
      }

      await trx(sTableName)
            .where({ store_id: storeId })
            .update({ phone_number: sPhoneNm, address1: sAddress, address2: sExtraAddress, lat: sLat, lng: sLng, store_name: storeName })
            .then(async (res) => {
               return res;
            })
            .catch((err) => {
               console.log("err",err);
               throw e;
            });
      oResult = '0000';

      await trx.commit();
      return oResult;
   }
   catch (e) {
      console.log("User.proprietorshipInsert fail !!! ===>",e);
      await trx.rollback();
      return oResult;
   }
}

Store.throoStoreStep2 = async (sBank,bytes,sBusinessNm,storeOwner,accountHolder,store_id) => {
   return   knex(iMerchant)
            .update({ business_number: sBusinessNm, bank_name : sBank, account_nm: bytes, full_name: storeOwner, account_holder: accountHolder, status: 1 })
            .where({ store_id: store_id })
            .then((result) => {
               console.log("result",result);
               return result;
            }).catch((err) => console.log(err));
}

Store.getPickUpInfo = async (storeId) => {
   let sQuery = knex.raw(`             
               t1.address1 AS sAddress1,
               t1.address2 AS sAddress2,
               t1.phone_number AS sPhone, 
               t1.parking_time, 
               t1.store_name AS storeName, 
               t1.noti_nearby_distance, 
               t2.address1 AS mAddress1,
               t2.address2 AS mAddress2,
               t2.phone_number AS mPhone 
   FROM        wm_store    AS t1
   LEFT JOIN   wm_merchant AS t2 ON t1.store_id = t2.store_id 
   WHERE       t1.store_id = ?
   `, [storeId]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err", err));
}

Store.getOwnerAccount = async (storeId) => {
   return  knex.select('bank_name','business_number','account_holder','account_nm','full_name')
               .from("wm_merchant")
               .where({store_id : storeId})
               .then(function (result) {
                  return result;
               })
               .catch((err) => console.log(err));
}

Store.verifyStore = async (storeId) => {
   let sQuery = knex.raw(`             
                  t1.store_time_id, 
                  t2.store_type_id
      FROM        wm_store_time_business  AS t1
      INNER JOIN  wm_store_x_store_type   AS t2 ON t1.store_id = t2.store_id 
      WHERE       t1.store_id = ?
      GROUP BY    t1.store_time_id;
   `, [storeId]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err", err));
}

Store.verifyProduct = async (storeId) => {
   let sQuery = knex.raw(`             
            COUNT(*) AS sCount 
      FROM  wm_product 
      WHERE store_id = ?
   `, [storeId]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err", err));
}

Store.dashboardStoreData = async (storeId) => {
   let sQuery = knex.raw(`             
                  t1.store_name, 
                  t1.noti_nearby_distance,
                  t1.phone_number, 
                  t1.parking_time,
                  t3.name
      FROM        wm_store                AS t1 
      INNER JOIN  wm_store_x_store_type   AS t2 ON t1.store_id = t2.store_id 
      INNER JOIN  wm_store_type           AS t3 ON t2.store_type_id = t3.store_type_id 
      WHERE         t1.store_id = ?  
   `, [storeId]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err", err));
}

Store.currentStatus = async (storeId) => {
   return  knex.select("pause", "order_time" )
               .from(sTableName)
               .where({store_id : storeId})
               .then(function (result) {
                  return result;
               })
               .catch((err) => console.log(err));
}

Store.checkMerchantStatus = async (storeId) => {
   let sQuery = knex.raw(`             
               t1.status, 
               t2.store_name 
   FROM        wm_merchant AS t1 
   INNER JOIN  wm_store AS t2 ON t1.store_id = t2.store_id 
   WHERE       t1.store_id = ?
   `, [storeId]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err", err));
}

Store.responseInquirt = async (sParam,iParam,wParam) => {
   return   knex(sInquiry)
            .update({ answer: sParam, admin_id: wParam, state_id: 1, updated_at: knex.fn.now() })
            .where({ inquiry_id: iParam })
            .then((result) => {
               return result;
            }).catch((err) => console.log(err));
}

Store.getInquiryList = async () => {
   let sQuery = knex.raw(`             
                  t1.inquiry_id, 
                  t1.title, 
                  t1.content, 
                  t1.answer, 
                  t1.state_id, 
                  t1.img_url, 
                  t1.created_at,
                  t2.full_name,
                  t2.phone_number
      FROM        wm_inquiry  AS t1
      INNER JOIN  wm_user     AS t2 ON t1.user_id = t2.user_id 
      ORDER BY    t1.created_at DESC
   `, []);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err", err));
}

Store.checkStoreData = async (storeId) => {
   let sQuery = knex.raw(`
                  t1.store_id
      FROM        wm_store_x_store_type   AS t1
      INNER JOIN  wm_store_time_business  AS t2 ON t2.store_id = t1.store_id 
      INNER JOIN  wm_menu                 AS t3 ON t3.store_id = t1.store_id 
      INNER JOIN  wm_product              AS t4 ON t4.store_id = t1.store_id 
      INNER JOIN  wm_menu_category        AS t5 ON t5.menu_id  = t3.menu_id
      WHERE       t1.store_id = ?
      LIMIT       1
   `, [storeId]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err", err));
}

Store.storeStampMaker = async (sIndex,aIndex,vIndex,jIndex,oIndex,pIndex,mIndex,iIndex,gIndex) => {
   let result_cd = '9999';
   
   const trx = await knex.transaction();
   try {
      
      const couponId = await  trx("wm_stamp_coupon")
                              .insert({ type_id: 0, store_id: sIndex, price: aIndex, partner_discount: aIndex, requirement: 0, count_limit: 0, name: vIndex, description: jIndex, start_date: oIndex, end_date: pIndex, hidden: 1})
                              .then(async (res) => {
                                 console.log("res",res);
                                 return res;
                              })
                              .catch((err) => {
                                 console.log("err",err);
                                 throw e;
                              });
      result_cd = '8888';

      await trx("wm_stamp")
            .insert({ store_id: sIndex, stamp_coupon_id: couponId[0], title: vIndex, minimum_amount: mIndex, completion_value: iIndex, start_date: oIndex, end_date: pIndex, date_value: gIndex})
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
   } catch (e) {
      await trx.rollback();
      return result_cd;
   }
}

Store.storeStampEditor = async (sIndex,aIndex,vIndex,jIndex,oIndex,pIndex,mIndex,iIndex,gIndex,cIndex,fIndex) => {
   let result_cd = '9999';
   
   const trx = await knex.transaction();
   try {
      await trx("wm_stamp")
            .where({ store_id: sIndex })
            .where({ stamp_id: cIndex })
            .update({ edited_at: knex.fn.now(), status: 0 })
            .then(async (res) => {
               console.log("res",res);
               return res;
            })
            .catch((err) => {
               console.log("err",err);
               throw e;
            });

      result_cd = '7777';   

      await trx("wm_stamp_coupon")
            .where({ store_id: sIndex })
            .where({ stamp_coupon_id: fIndex })
            .update({ status: 0 })
            .then(async (res) => {
               console.log("res",res);
               return res;
            })
            .catch((err) => {
               console.log("err",err);
               throw e;
            });

      result_cd = '6666';      

      const couponId = await  trx("wm_stamp_coupon")
                              .insert({ type_id: 0, store_id: sIndex, price: aIndex, partner_discount: aIndex, requirement: 0, count_limit: 0, name: vIndex, description: jIndex, start_date: oIndex, end_date: pIndex, hidden: 1})
                              .then(async (res) => {
                                 console.log("res",res);
                                 return res;
                              })
                              .catch((err) => {
                                 console.log("err",err);
                                 throw e;
                              });
      result_cd = '8888';

      await trx("wm_stamp")
            .insert({ store_id: sIndex, stamp_coupon_id: couponId[0], title: vIndex, minimum_amount: mIndex, completion_value: iIndex, start_date: oIndex, end_date: pIndex, date_value: gIndex})
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
   } catch (e) {
      await trx.rollback();
      return result_cd;
   }
}

Store.editStoreType = async (storeId,sResult,iResult,isSub,sInfo,sNoti,sDetail) => {
   let result_cd = '9999';
   
   const trx = await knex.transaction();
   try {
      await trx(iStoreXStoreType)
            .where({ store_id : storeId })
            .del()
            .then(async (res) => {
               console.log("res",res);
               return res;
            })
            .catch((err) => {
               console.log("err",err);
               throw e;
            });

      result_cd = '1111'; 

      for await (let iCount of sResult) {
         let sData = {
            store_id : storeId,
            store_type_id: parseInt(iCount),
            is_main: 1,
         };
         
         await trx(iStoreXStoreType)
               .insert(sData)
               .then(async (res) => {
                  console.log("res",res);
                  return res;
               })
               .catch((err) => {
                  console.log("err",err);
                  throw e;
               });
      }

      result_cd = '2222';

      if(isSub){
         for await (let sCount of iResult) {
            let sData = {
               store_id : storeId,
               store_type_id: parseInt(sCount),
               is_main: 0,
            };
   
            await trx(iStoreXStoreType)
                  .insert(sData)
                  .then(async (res) => {
                     console.log("res",res);
                     return res;
                  })
                  .catch((err) => {
                     console.log("err",err);
                     throw e;
                  });
         }
      } else {
         await trx(iStoreXStoreType)
               .where({ store_id : storeId })
               .where({ is_main : 0 })
               .del()
               .then(async (res) => {
                  console.log("res",res);
                  return res;
               })
               .catch((err) => {
                  console.log("err",err);
                  throw e;
               });
      }

      result_cd = '3333';

      await trx(sTableName)
            .where({ store_id: storeId })
            .update({ description: sInfo,description_extra: sDetail,description_noti: sNoti, store_type_id: 0 })
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

Store.editStoreTypeV2 = async (storeId,sResult,iResult,isSub) => {
   let result_cd = '9999';
   
   const trx = await knex.transaction();
   try {
      await trx(iStoreXStoreType)
            .where({ store_id : storeId })
            .del()
            .then(async (res) => {
               console.log("res",res);
               return res;
            })
            .catch((err) => {
               console.log("err",err);
               throw e;
            });

      result_cd = '1111'; 

      for await (let iCount of sResult) {
         let sData = {
            store_id : storeId,
            store_type_id: parseInt(iCount),
            is_main: 1,
         };
         
         await trx(iStoreXStoreType)
               .insert(sData)
               .then(async (res) => {
                  console.log("res",res);
                  return res;
               })
               .catch((err) => {
                  console.log("err",err);
                  throw e;
               });
      }

      result_cd = '2222';

      if(isSub){
         for await (let sCount of iResult) {
            let sData = {
               store_id : storeId,
               store_type_id: parseInt(sCount),
               is_main: 0,
            };
   
            await trx(iStoreXStoreType)
                  .insert(sData)
                  .then(async (res) => {
                     console.log("res",res);
                     return res;
                  })
                  .catch((err) => {
                     console.log("err",err);
                     throw e;
                  });
         }
      } else {
         await trx(iStoreXStoreType)
               .where({ store_id : storeId })
               .where({ is_main : 0 })
               .del()
               .then(async (res) => {
                  console.log("res",res);
                  return res;
               })
               .catch((err) => {
                  console.log("err",err);
                  throw e;
               });
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


Store.getMainType = async (storeId) => {
   let sQuery = knex.raw(`
                  t1.is_main, 
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

Store.getCongestionTime = async (sParam,iParam) => {
   return  knex.select('minute')
               .from("wm_store_time_congestion")
               .where({store_id : sParam})
               .where({congestion_type : iParam})
               .timeout(config.queryTimeout).first().then(function (result) {
                  return result;
               })
               .catch((err) => console.log(err));
}

Store.isPause = async (sParam) => {
   return  knex.select('pause','order_time')
               .from("wm_store")
               .where({store_id : sParam})
               .timeout(config.queryTimeout).first().then(function (result) {
                  return result;
               })
               .catch((err) => console.log(err));
}

Store.getParamType = async (sParam) => {
   return  knex.select('store_type_id')
               .from(iStoreType)
               .where({name : sParam})
               .where({status : 1})
               .whereNot({parent_store_type_id : 0})
               .timeout(config.queryTimeout).first().then(function (result) {
                  return result;
               })
               .catch((err) => console.log(err));
}

Store.getOperationTime = async (storeId) => {
   return  knex.select('day_of_week','congestion_type','opening_time','closing_time')
               .from(iStoreTimeBusiness)
               .where({store_id : storeId})
               .then(function (result) {
                  return result;
               })
               .catch((err) => console.log(err));
}

Store.getOperationTimeV2 = async (storeId) => {
   return  knex.select('day_of_week','congestion_type','opening_time','closing_time','pickup_type')
               .from(iStoreTimeBusiness)
               .where({store_id : storeId})
               .then(function (result) {
                  return result;
               })
               .catch((err) => console.log(err));
}

Store.getCongestionData = async (storeId,sParam) => {
   return  knex.select('minute')
               .from("wm_store_time_congestion")
               .where({store_id : storeId})
               .where({congestion_type : sParam})
               .then(function (result) {
                  return result;
               })
               .catch((err) => console.log(err));
}

Store.getStorePictures = async (storeId) => {
   let sQuery = knex.raw(`
                  COUNT(store_media_id) AS countNm
      FROM        wm_store_media  
      WHERE       store_id = ?
      AND         url_path IS NOT NULL
   `, [storeId]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err", err));
}

Store.getProductPicCount = async (storeId) => {
   let sQuery = knex.raw(`
                  COUNT(t2.url_path) AS countNm
      FROM        wm_product        AS t1 
      LEFT JOIN   wm_product_media  AS t2 ON t1.product_id = t2.product_id 
      WHERE       t1.store_id = ?
      AND         t1.is_deleted = 0
      AND         t1.status = 1
   `, [storeId]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err", err));
}

Store.insertOperationV2 = async (sList,storeId,stringList,storeType) => {
   let result_cd = '9999';
   
   const trx = await knex.transaction();
   try {
      await trx(iStoreTimeBusiness)
            .where({ store_id : storeId })
            .del()
            .then(async (res) => {
               console.log("res",res);
               return res;
            })
            .catch((err) => {
               console.log("err",err);
               throw e;
            });

      result_cd = '1111'; 

      await trx(sTableName)
            .where({ store_id: storeId })
            .update({ description_holiday: stringList, pickup_type: storeType })
            .then(async (res) => {
               console.log("res",res);
               return res;
            })
            .catch((err) => {
               console.log("err",err);
               throw e;
            });

      result_cd = '2222';   

      for await (let iCount of sList) {
         let tempSData = {};
         if(iCount.congestion_type.toString() === "3"){
            tempSData.pickup_type = 2;
            tempSData.congestion_type = 0;
         } else {
            tempSData.pickup_type = 1;
            tempSData.congestion_type = await iCount.congestion_type;
         }
         tempSData.day_of_week = await iCount.day_of_week;
         tempSData.opening_time = await iCount.opening_time;
         tempSData.closing_time = await iCount.closing_time;
         tempSData.store_id = await storeId;

         await trx(iStoreTimeBusiness)
               .insert(tempSData)
               .then(async (res) => {
                  console.log("res",res);
                  return res;
               })
               .catch((err) => {
                  console.log("err",err);
                  throw e;
               });
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

Store.insertOperation = async (sList,storeId,stringList) => {
   let result_cd = '9999';
   
   const trx = await knex.transaction();
   try {
      await trx(iStoreTimeBusiness)
            .where({ store_id : storeId })
            .del()
            .then(async (res) => {
               console.log("res",res);
               return res;
            })
            .catch((err) => {
               console.log("err",err);
               throw e;
            });

      result_cd = '1111'; 

      await trx(sTableName)
            .where({ store_id: storeId })
            .update({ description_holiday: stringList })
            .then(async (res) => {
               console.log("res",res);
               return res;
            })
            .catch((err) => {
               console.log("err",err);
               throw e;
            });

      result_cd = '2222';   

      for await (let iCount of sList) {
         let tempSData = {};
         
         tempSData.congestion_type = await iCount.congestion_type;
         tempSData.day_of_week = await iCount.day_of_week;
         tempSData.opening_time = await iCount.opening_time;
         tempSData.closing_time = await iCount.closing_time;
         tempSData.store_id = await storeId;

         await trx(iStoreTimeBusiness)
               .insert(tempSData)
               .then(async (res) => {
                  console.log("res",res);
                  return res;
               })
               .catch((err) => {
                  console.log("err",err);
                  throw e;
               });
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

Store.insertCoupon = async (sList,storeId,iList) => {
   let result_cd = '9999';
   
   const trx = await knex.transaction();
   try {
      const coupon = {
         type_id : sList.type,
         extra : sList.extra,
         duplicate_user : sList.userLimit,
         price : sList.price,
         point : sList.point,
         percent : sList.percent,
         requirement : sList.requirement,
         max_discount : sList.max,
         count_limit : sList.countLimit,
         name : sList.name,
         status : 1,
         start_date : sList.from,
         end_date : sList.to,
      }
      const couponId = await  trx("wm_event_coupon")
                              .insert(coupon)
                              .then(async (res) => {
                                 return res;
                              })
                              .catch((err) => {
                                 console.log("err",err);
                                 throw e;
                              });
      result_cd = "8888";      
      
      await trx("wm_event_coupon_x_store")
            .insert({ coupon_id: couponId[0], store_id : storeId })
            .then(async (res) => {
               return res;
            })
            .catch((err) => {
               console.log("err",err);
               throw e;
            });

      result_cd = "7777"; 

      if(sList.limit){
         for await (const x of iList) {
            await trx("wm_event_coupon_x_category")
                  .insert({ coupon_id: couponId[0], category_id : parseInt(x.cValue) })
                  .then(async (res) => {
                     return res;
                  })
                  .catch((err) => {
                     console.log("err",err);
                     throw e;
                  });
            
            if(x.pValue.toString() !== "none"){
               await trx("wm_event_coupon_x_product")
                     .insert({ coupon_id: couponId[0], product_id : parseInt(x.pValue) })
                     .then(async (res) => {
                        return res;
                     })
                     .catch((err) => {
                        console.log("err",err);
                        throw e;
                     });
            }      
         }
      }   

      result_cd = "0000"; 

      await trx.commit();
      return result_cd;
   }
   catch (e) {
      await trx.rollback();
      return result_cd;
   }
}

Store.getStoreHoliday = async (storeId) => {
   return  knex.select("*")
               .from(iStoreTimeHoliday)
               .where({store_id : storeId})
               .then(function (result) {
                  return result;
               })
               .catch((err) => console.log(err));
}

Store.editStoreExtraInfo = async (storeId,sContent,sPhoneNm,sNotiValue,parkingTime) => {
   return   knex(sTableName)
            .update({ address1: sContent,phone_number: sPhoneNm,noti_nearby_distance: sNotiValue, parking_time: parkingTime })
            .where({ store_id: storeId })
            .then((result) => {
               console.log("result",result);
               return result;
            }).catch((err) => console.log(err));
}

Store.storeExtraInfo = async (storeId) => {
   return  knex.select('address1','phone_number','parking_time','noti_nearby_distance')
               .from(sTableName)
               .where({store_id : storeId})
               .then(function (result) {
                  return result;
               })
               .catch((err) => console.log(err));
}

Store.storeMediaImageV2 = async (sParam) => {
   let sQuery = knex.raw(`             
                  url_path
      FROM        wm_store_media
      WHERE       store_id       = ?
      ORDER BY    store_media_id
   `, [sParam]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err", err));
}

Store.storeMediaImage = async (storeId) => {
   return  knex.select('url_path')
               .from(iStoreMedia)
               .where({store_id : storeId})
               .where({status : 1})
               .then(function (result) {
                  return result;
               })
               .catch((err) => console.log(err));
}

Store.editStoreInfo = async (storeId,sInfo,sNoti,sDetail,sClassifi) => {
   return   knex(sTableName)
            .update({ description: sInfo,description_extra: sDetail,description_noti: sNoti, store_type_id: sClassifi })
            .where({ store_id: storeId })
            .then((result) => {
               console.log("result",result);
               return result;
            }).catch((err) => console.log(err));
}

Store.inventoryChangeStatus = async (sPId,pStatus) => {
   return   knex(sProduct)
            .update({ is_soldout: pStatus })
            .where({ product_id: sPId })
            .then((result) => {
               console.log("result",result);
               return result;
            }).catch((err) => console.log(err));
}

Store.completeStore = async (storeId) => {
   let sQuery = knex.raw(`
                  t1.store_id, 
                  t1.store_name, 
                  t1.address1, 
                  t1.phone_number, 
                  t1.lat, 
                  t1.lng, 
                  t2.full_name, 
                  t3.user_id, 
                  t3.uuid 
      FROM        wm_store       AS t1
      INNER JOIN  wm_merchant    AS t2 ON t2.store_id = t1.store_id 
      LEFT  JOIN  wmpos_user     AS t3 ON t3.store_id = t2.store_id 
      WHERE       t1.store_id = ?
      LIMIT       1
   `, [storeId]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      console.log("result", result);
      return result;
   }).catch((err) => console.log("err", err));
}

Store.inventoryList = async (categoryId) => {
   let sQuery = knex.raw(`
                  t1.product_id, 
                  t2.name, 
                  t2.description, 
                  t2.base_price, 
                  t2.is_soldout,
                  t3.url_path
      FROM        wm_menu_cat_x_prd    AS t1
      INNER JOIN  wm_product           AS t2 ON t2.product_id = t1.product_id 
      LEFT  JOIN  wm_product_media     AS t3 ON t3.product_id = t2.product_id 
      WHERE       t1.category_id = ?
      AND         t2.is_deleted = 0
      GROUP BY    t1.product_id
      ORDER BY    id_order ASC;
   `, [categoryId]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      console.log("result", result);
      return result;
   }).catch((err) => console.log("err", err));
}

Store.getModalOptionList = async (optionId) => {
   let sQuery = knex.raw(`
                  t1.name AS title, 
                  t1.input_type AS type, 
                  t2.name
      FROM        wm_product_option_type AS t1
      INNER JOIN  wm_product_option_base AS t2 ON t1.option_type_id = t2.option_type_id
      WHERE       t1.option_type_id = ?
   `, [optionId]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      console.log("result", result);
      return result;
   }).catch((err) => console.log("err", err));
}

Store.modalOperationTime = async (storeId) => {
   return  knex.from(iStoreTimeBusiness)
               .where({store_id : storeId})
               .then(function (result) {
                  return result;
               })
               .catch((err) => console.log(err));
}

Store.menuByStoreId = async (categoryId) => {
   let sQuery = knex.raw(`
               t2.name AS categoryName,
               t3.product_id,
               t3.base_price, 
               t3.name, 
               t4.url_path 
   FROM        wm_menu_cat_x_prd AS t1
   LEFT JOIN   wm_menu_category  AS t2 ON t1.category_id = t2.category_id  AND t2.is_deleted = 0
   LEFT JOIN   wm_product        AS t3 ON t1.product_id = t3.product_id    AND t3.is_deleted = 0 AND t3.status = 1
   LEFT JOIN   wm_product_media  AS t4 ON t3.product_id = t4.product_id    AND t4.status = 1
   WHERE       t1.category_id = ?
   ORDER BY    t3.id_order ASC
   `, [categoryId]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      console.log("result", result);
      return result;
   }).catch((err) => console.log("err", err));
}

Store.categoryByStoreId = async (storeId) => {
   let sQuery = knex.raw(`
                  DISTINCT(t3.name) AS name,
                  t3.category_id
      FROM        wm_store          AS t1
      LEFT JOIN   wm_menu           AS t2 ON t1.store_id = t2.store_id
      LEFT JOIN   wm_menu_category  AS t3 ON t3.menu_id = t2.menu_id AND t3.is_deleted = 0  AND t3.status = 1
      LEFT JOIN   wm_menu_cat_x_prd AS t4 ON t3.category_id = t4.category_id
      WHERE       t1.store_id = ?    
   `, [storeId]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      console.log("result", result);
      return result;
   }).catch((err) => console.log("err", err));
}

Store.modalAddress = async (storeId) => {
   let sQuery = knex.raw(`
                  t1.lat, 
                  t1.lng, 
                  t1.description, 
                  t1.description_extra, 
                  t1.description_noti, 
                  t1.description_holiday, 
                  t2.full_name,
                  t2.business_number
      FROM        wm_store     AS t1
      LEFT JOIN   wm_merchant  AS t2 ON t1.store_id = t2.store_id 
      WHERE       t1.store_id = ?
   `, [storeId]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      console.log("result", result);
      return result;
   }).catch((err) => console.log("err", err));
}

Store.modalConfig = async (storeId) => {
   let sQuery = knex.raw(`
                  t1.parking_time,
                  t1.store_name,
                  t1.phone_number,
                  t1.address1,
                  t1.address2,
                  t3.url_path,
                  t3.type 
      FROM        wm_store                AS t1
      LEFT JOIN   wm_store_media          AS t3 ON t1.store_id = t3.store_id 
      WHERE       t1.store_id = ?
   `, [storeId]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      console.log("result", result);
      return result;
   }).catch((err) => console.log("err", err));
}

Store.deleteMenu = async (menuId) => {
   return   knex(sProduct)
            .update({ is_deleted : 1, status : 0 })
            .where({ product_id: menuId })
            .then((result) => {
               return result;
            }).catch((err) => console.log("Store.deleteMenu err",err));
}

Store.checkHaveProduct = async (optionId) => {
   let sQuery = knex.raw(`
                  DISTINCT(t2.product_id) AS id
      FROM        wm_product              AS t1
      INNER JOIN  wm_product_option       AS t2 ON t2.product_id = t1.product_id AND t2.is_deleted != 1
      INNER JOIN  wm_product_option_type  AS t3 ON t3.option_type_id = t2.option_type_id AND t3.is_deleted != 1
      WHERE       t3.option_type_id = ?
   `, [optionId]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err", err));
}

Store.getOptionId = async (optionId) => {
   let sQuery = knex.raw(`
                  t2.option_id            AS id
      FROM        wm_product              AS t1
      INNER JOIN  wm_product_option       AS t2 ON t2.product_id = t1.product_id AND t2.is_deleted != 1
      INNER JOIN  wm_product_option_type  AS t3 ON t3.option_type_id = t2.option_type_id AND t3.is_deleted != 1
      WHERE       t3.option_type_id = ?
   `, [optionId]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err", err));
}

Store.editOption = async (sGroupTitle,optionId,count,sMin,sData,optionIdList,productList,xAction) => {
   let result_cd = '9999';
   let baseOptionList = [];
   
   const trx = await knex.transaction();
   try {
      await trx(sProductOptionType)
            .where({ option_type_id: optionId })
            .update({ name: sGroupTitle, input_max: count, input_min: sMin })
            .then(async (res) => {
               console.log("res",res);
               return res;
            })
            .catch((err) => {
               console.log("err",err);
               throw e;
            });
                           
      result_cd = '1111';
      
      await trx(sProductOptionBase)
            .where({ option_type_id : optionId })
            .del()
            .then(async (res) => {
               console.log("res",res);
               return res;
            })
            .catch((err) => {
               console.log("err",err);
               throw e;
            });

      result_cd = '2222'; 

      let sCount = 0;
      for await (let i of sData) {
         const base_id = await   trx(sProductOptionBase)
                                 .insert({ name: i.name, option_type_id: optionId, price: i.price, status: 1, is_deleted : 0, id_order : sCount})
                                 .then(async (res) => {
                                    console.log("res",res);
                                    return res;
                                 })
                                 .catch((err) => {
                                    console.log("err",err);
                                    throw e;
                                 });
         let temp = {};
         temp.name = i.name;                      
         temp.price = i.price;                      
         temp.id_order = i.sCount;                      
         temp.base_id = base_id[0];                      
         baseOptionList.push(temp)
         sCount = sCount + 1;
      }
      result_cd = '3333';

      if(xAction){
         for await (let x of optionIdList) {
            await trx(sProductOption)
                  .where({ option_id : x.id })
                  .del()
                  .then(async (res) => {
                     console.log("res",res);
                     return res;
                  })
                  .catch((err) => {
                     console.log("err",err);
                     throw e;
                  });
         }
         result_cd = '4444';

         for await (let s of productList) {
            let xCount = 0;
            for await (let k of baseOptionList) {
               await trx(sProductOption)
                     .insert({ id_order : xCount, option_base_id : k.base_id, name : k.name, product_id : s.id, option_type_id : optionId, price : k.price, status: 1, is_deleted : 0 })
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

Store.editOptionV3 = async (sGroupTitle,optionId,count,sMin,type,sData,optionIdList,productList,xAction) => {
   let result_cd = '9999';
   let baseOptionList = [];
   
   const trx = await knex.transaction();
   try {
      await trx(sProductOptionType)
            .where({ option_type_id: optionId })
            .update({ name: sGroupTitle, input_type: type, input_max: count, input_min: sMin })
            .then(async (res) => {
               console.log("res",res);
               return res;
            })
            .catch((err) => {
               console.log("err",err);
               throw e;
            });
                           
      result_cd = '1111';
      
      await trx(sProductOptionBase)
            .where({ option_type_id : optionId })
            .del()
            .then(async (res) => {
               console.log("res",res);
               return res;
            })
            .catch((err) => {
               console.log("err",err);
               throw e;
            });

      result_cd = '2222'; 

      let sCount = 0;
      for await (let i of sData) {
         const base_id = await   trx(sProductOptionBase)
                                 .insert({ name: i.name, option_type_id: optionId, price: i.price, status: 1, is_deleted : 0, id_order : sCount})
                                 .then(async (res) => {
                                    console.log("res",res);
                                    return res;
                                 })
                                 .catch((err) => {
                                    console.log("err",err);
                                    throw e;
                                 });
         let temp = {};
         temp.name = i.name;                      
         temp.price = i.price;                      
         temp.id_order = i.sCount;                      
         temp.base_id = base_id[0];                      
         baseOptionList.push(temp)
         sCount = sCount + 1;
      }
      result_cd = '3333';

      if(xAction){
         for await (let x of optionIdList) {
            await trx(sProductOption)
                  .where({ option_id : x.id })
                  .del()
                  .then(async (res) => {
                     console.log("res",res);
                     return res;
                  })
                  .catch((err) => {
                     console.log("err",err);
                     throw e;
                  });
         }
         result_cd = '4444';

         for await (let s of productList) {
            let xCount = 0;
            for await (let k of baseOptionList) {
               await trx(sProductOption)
                     .insert({ id_order : xCount, option_base_id : k.base_id, name : k.name, product_id : s.id, option_type_id : optionId, price : k.price, status: 1, is_deleted : 0 })
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

Store.deleteOption = async (optionId,xAction) => {
   let result_cd = '9999';
   
   const trx = await knex.transaction();
   try {
      await trx(sProductOptionType)
            .where({ option_type_id: optionId })
            .update({ is_deleted: 1, status: 0 })
            .then(async (res) => {
               console.log("res",res);
               return res;
            })
            .catch((err) => {
               console.log("err",err);
               throw e;
            });
                           
      result_cd = '1111';
      
      await trx(sProductOptionBase)
            .where({ option_type_id: optionId })
            .update({ is_deleted: 1, status: 0 })
            .then(async (res) => {
               console.log("res",res);
               return res;
            })
            .catch((err) => {
               console.log("err",err);
               throw e;
            });

      result_cd = '2222'; 
      
      if(xAction){
         await trx(sProductOption)
               .where({ option_type_id: optionId })
               .update({ is_deleted: 1, status: 0 })
               .then(async (res) => {
                  console.log("res",res);
                  return res;
               })
               .catch((err) => {
                  console.log("err",err);
                  throw e;
               });
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

Store.getPieChartData = (storeId, fromDate, toDate) => {
   let sQuery = knex.raw(`
                  t1.order_id, 
                  t3.name,
                  SUM(t1.total_amount_org) AS price,
                  ROW_NUMBER() OVER (ORDER BY price DESC) AS rank,
                  (
                     SELECT   sum(total_amount_org) 
                     FROM     wm_order 
                     WHERE    store_id = ? 
                     AND      cancelled_at IS NULL
                     AND      payment_id != 0
                     AND      DATE(created_at) BETWEEN DATE(?) AND DATE(?)
                  ) AS total
      FROM        wm_order          AS t1
      INNER JOIN  wm_order_detail   AS t2   ON t2.order_id = t1.order_id 
      INNER JOIN  wm_product        AS t3   ON t3.product_id = t2.product_id 
      WHERE       t1.store_id = ?
      AND         t1.cancelled_at IS NULL
      AND         t1.payment_id != 0
      AND         DATE(t1.created_at) BETWEEN DATE(?) AND DATE(?)
      GROUP BY    t3.product_id
      ORDER BY    rank;
   `, [storeId, fromDate, toDate, storeId, fromDate, toDate]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err", err));
}

Store.settlementOfSalesDay = (storeId,fromDate,toDate) => {
   let sQuery = knex.raw(`
               SUM(total_amount_org) AS price
      FROM     wm_order 
      WHERE    store_id = ?
      AND      DATE(created_at) BETWEEN DATE(?) AND DATE(?)
      AND      cancelled_at IS NULL
      AND      payment_id != 0 
   `, [storeId,fromDate,toDate]);

   let oQuery = knex.select(sQuery);

   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log(err));
};

Store.getOptionListByMenuId = async (menuId) => {
   let sQuery = knex.raw(`
               DISTINCT(t3.name),
               t3.option_type_id
   FROM        wm_product              AS t1
   INNER JOIN  wm_product_option       AS t2  ON t1.product_id = t2.product_id AND t2.is_deleted = 0
   INNER JOIN  wm_product_option_type  AS t3  ON t3.option_type_id = t2.option_type_id AND t3.is_deleted = 0
   WHERE       t1.product_id = ?
   AND         t1.is_deleted = 0
   ORDER BY    t2.option_id
   `, [menuId]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Store.getMenuDetail = async (menuId) => {
   let sQuery = knex.raw(`
               t3.name AS category_name, 
               t1.name AS product_name, 
               t1.base_price, 
               t1.org_price, 
               t1.is_soldout, 
               t1.status, 
               t1.description, 
               t4.url_path,
               t1.product_id, 
               t3.category_id,
               t4.product_media_id,
               t1.is_throo_only,
               t1.in_stock
   FROM        wm_product AS t1
   INNER JOIN  wm_menu_cat_x_prd AS t2 ON t1.product_id = t2.product_id
   INNER JOIN  wm_menu_category  AS t3 ON t2.category_id = t3.category_id AND t3.is_deleted = 0
   LEFT JOIN   wm_product_media  AS t4 ON t1.product_id = t4.product_id
   WHERE       t1.product_id = ?
   AND         t1.is_deleted = 0
   `, [menuId]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Store.getMenuList = async (categoryId) => {
   let sQuery = knex.raw(`
               t1.id_order, 
               t1.in_stock, 
               t1.product_id, 
               t1.name, 
               t1.is_soldout 
   FROM        wm_product AS t1
   INNER JOIN  wm_menu_cat_x_prd AS t2 ON t2.product_id = t1.product_id
   WHERE       t2.category_id  = ?
   AND         t1.is_deleted  != 1
   ORDER BY    t1.id_order
   `, [categoryId]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Store.getOptionList = async (storeId) => {
   let sQuery = knex.raw(`
               t1.name AS groupTitle, 
               t1.input_max AS maxCount, 
               t1.input_min AS minCount, 
               t2.name AS optionName, 
               t2.price,
               t1.input_type 
   FROM        wm_product_option_type AS t1
   INNER JOIN  wm_product_option_base AS t2 ON t1.option_type_id = t2.option_type_id
   WHERE       t2.option_type_id  = ?;
   `, [storeId]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Store.getCopyOptionData = async (aParam,storeId) => {
   let sQuery = knex.raw(`
               t1.input_type,
               t1.input_min,
               t1.input_max, 
               t2.name, 
               t2.price,
               t2.id_order
   FROM        wm_product_option_type AS t1
   INNER JOIN  wm_product_option_base AS t2 ON t1.option_type_id = t2.option_type_id
   WHERE       t1.option_type_id  = ?
   AND         t1.store_id  = ?
   ORDER BY    t2.id_order ASC
   `, [aParam,storeId]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Store.makeOption = async (storeId,sGroupTitle,type,count,sMin,sData) => {
   let result_cd = '9999';
   
   const trx = await knex.transaction();
   try {
      const makeId = await trx(sProductOptionType)
                           .insert({ store_id: storeId, name: sGroupTitle, input_type: type, input_min: sMin, input_max: count, status : 1, is_deleted : 0})
                           .then(async (res) => {
                              console.log("res",res);
                              return res;
                           })
                           .catch((err) => {
                              console.log("err",err);
                              throw e;
                           });
                           
      result_cd = '1111';
      
      let sCount = 0;
      for await (let i of sData) {
         await trx(sProductOptionBase)
               .insert({ name: i.name, option_type_id: makeId[0], price: i.price, status: 1, is_deleted : 0, id_order : sCount})
               .then(async (res) => {
                  console.log("res",res);
                  return res;
               })
               .catch((err) => {
                  console.log("err",err);
                  throw e;
               });
         sCount = sCount + 1;
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

Store.copyOption = async (storeId,sGroupTitle,type,count,sMin,sData) => {
   let result = {
      result_cd: '9999',
      result_id: null,
   };
   
   const trx = await knex.transaction();
   try {
      const makeId = await trx(sProductOptionType)
                           .insert({ store_id: storeId, name: sGroupTitle, input_type: type, input_min: sMin, input_max: count, status : 1, is_deleted : 0})
                           .then(async (res) => {
                              return res;
                           })
                           .catch((err) => {
                              throw e;
                           });
                           
      result.result_cd = '1111';
      result.result_id = makeId[0];
      
      let sCount = 0;
      for await (let i of sData) {
         await trx(sProductOptionBase)
               .insert({ name: i.name, option_type_id: makeId[0], price: i.price, status: 1, is_deleted : 0, id_order : sCount})
               .then(async (res) => {
                  return res;
               })
               .catch((err) => {
                  throw e;
               });
         sCount = sCount + 1;
      }
      
      result.result_cd = '0000';
      await trx.commit();
      return result;
   }
   catch (e) {
      await trx.rollback();
      return result;
   }
}

Store.getoptionList = async (storeId) => {
   return  knex.from(sProductOptionType)
               .where({store_id : storeId})
               .where({is_deleted : 0})
               .then(function (result) {
                  return result;
               })
               .catch((err) => console.log(err));
}

Store.categorySwitch = async (sList) => {
   let result_cd = '9999';
   
   const trx = await knex.transaction();
   try {
      let sCount = 0;
      for await (let i of sList) {
         await trx(sMenuCategory)
               .where({ category_id: i.id })
               .update({ id_order : sCount })
               .then(async (res) => {
                  console.log("res",res);
                  return res;
               })
               .catch((err) => {
                  console.log("err",err);
                  throw e;
               });
         sCount = sCount + 1;      
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

Store.menuMainSwitch = async (sList) => {
   let result_cd = '9999';
   
   const trx = await knex.transaction();
   try {
      let sCount = 0;
      for await (let i of sList) {
         await trx(sProduct)
               .where({ product_id: i.key })
               .update({ id_order : sCount })
               .then(async (res) => {
                  console.log("res",res);
                  return res;
               })
               .catch((err) => {
                  console.log("err",err);
                  throw e;
               });
         sCount = sCount + 1;      
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

Store.menuSwitch = async (sList) => {
   let result_cd = '9999';
   
   const trx = await knex.transaction();
   try {
      let sCount = 0;
      for await (let i of sList) {
         await trx(sProduct)
               .where({ product_id: i.id })
               .update({ id_order : sCount })
               .then(async (res) => {
                  console.log("res",res);
                  return res;
               })
               .catch((err) => {
                  console.log("err",err);
                  throw e;
               });
         sCount = sCount + 1;      
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

Store.officialHoliday = async (sList,sType,storeId) => {
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

      if(sList.length > 0){
         for await (let i of sList) {
            await trx(iStoreTimeHoliday) 
                  .insert({day_of_week: i.sDayValue, date_type: i.sMethodValue, store_id: storeId, type: sType })
                  .then(async (res) => {
                     console.log("res",res);
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

Store.temperaryHoliday = async (sList,sType,storeId) => {
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
      
      if(sList.length > 0){
         for await (let i of sList) {
            console.log("i",i);
            await trx(iStoreTimeHoliday) 
                  .insert({holiday_from: i.fromDate, holiday_to: i.toDate, store_id: storeId, type: sType })
                  .then(async (res) => {
                     console.log("res",res);
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

Store.editMenu = async (mediaId,productId,sFileList,sTitle,sDesc,iPrice,dPrice,isUse,sCategory,preOptionList,isOption,optionList) => {
   let result_cd = '9999';
   
   const trx = await knex.transaction();
   try {
      if(sFileList.url_path != undefined){
         if(mediaId != null){
            await trx(sProductMedia)
                  .where({ product_media_id: mediaId })
                  .update({ file_name : sFileList.file_name, full_path : sFileList.full_path, url_path : sFileList.url_path })
                  .then(async (res) => {
                     console.log("res",res);
                     return res;
                  })
                  .catch((err) => {
                     console.log("err",err);
                     throw e;
                  });
         } else {
            let sList = {
               product_id : productId,
               option_id : 0,
               file_name : sFileList.file_name,
               full_path : sFileList.full_path,
               url_path : sFileList.url_path,
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
         }
      }

      await trx(sProduct)
            .where({ product_id: productId })
            .update({ name : sTitle, description : sDesc, base_price : dPrice, org_price: iPrice, is_soldout : isUse })
            .then(async (res) => {
               console.log("res",res);
               return res;
            })
            .catch((err) => {
               console.log("err",err);
               throw e;
            });

      result_cd = '8888';

      await trx(sMenuCatXPrd)
            .where({ product_id: productId })
            .update({ category_id : sCategory })
            .then(async (res) => {
               console.log("res",res);
               return res;
            })
            .catch((err) => {
               console.log("err",err);
               throw e;
            });

      result_cd = '7777';

      for await (let i of preOptionList) {
         await trx(sProductOption)
               .where({ product_id: productId })
               .where({ option_type_id: parseInt(i) })
               .del()
               .then(async (res) => {
                  console.log("res",res);
                  return res;
               })
               .catch((err) => {
                  console.log("err",err);
                  throw e;
               });
      }
      result_cd = '6666';

      if(isOption){
         for await (let i of optionList) {
            let xCount = 0;
            const getOption = await Store.getOptionDetail(i);
            for await (let x of getOption) {
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

Store.editMenuV2 = async (mediaId,productId,sFileList,sTitle,sDesc,iPrice,dPrice,sCategory,preOptionList,optionList,isCheck,iStock,productType) => {
   let result_cd = '9999';
   
   const trx = await knex.transaction();
   try {
      if(mediaId !== null){
         if(sFileList.url_path !== undefined){
            await trx(sProductMedia)
                  .where({ product_media_id: mediaId })
                  .where({ product_id: productId })
                  .update({ file_name : sFileList.file_name, full_path : sFileList.full_path, url_path : sFileList.url_path })
                  .then(async (res) => {
                     return res;
                  })
                  .catch((err) => {
                     throw e;
                  });
         } else {
            if(!isCheck){
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
         if(sFileList.url_path !== undefined){
            let sList = {
               product_id : productId,
               option_id : 0,
               file_name : sFileList.file_name,
               full_path : sFileList.full_path,
               url_path : sFileList.url_path,
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
            .update({ name : sTitle, description : sDesc, base_price : dPrice, org_price: iPrice, is_soldout : 0, is_throo_only: productType, in_stock: iStock  })
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
            const getOption = await Store.getOptionDetail(i.key);
            for await (let x of getOption) {
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

Store.insertMenu = async (storeId,sName,desc,price,sNm,productImg,categoryId,isOption,optionList) => {
   let result_cd = '9999';
   let sList = {
      store_id : storeId,
      name : sName,
      description : desc,
      base_price : price,
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

      if(productImg.url_path != undefined){
         sList = {
            product_id : insertProduct[0],
            option_id : 0,
            file_name : productImg.file_name,
            full_path : productImg.full_path,
            url_path : productImg.url_path,
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
if(isOption){
   for await (let i of optionList) {
      let xCount = 0;
      const getOption = await Store.getOptionDetail(i);
      for await (let x of getOption) {
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


Store.insertMenuV2 = async (storeId,sName,desc,price,dPrice,sNm,productImg,categoryId,optionList,productType,iStock) => {
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

      if(productImg.url_path != undefined){
         sList = {
            product_id : insertProduct[0],
            option_id : 0,
            file_name : productImg.file_name,
            full_path : productImg.full_path,
            url_path : productImg.url_path,
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
            const getOption = await Store.getOptionDetail(i.key);
            for await (let x of getOption) {
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

Store.copyProduct = async (storeId,sName,desc,price,dPrice,sNm,file_name,full_path,url_path,categoryId,optionList) => {
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

      if(url_path !== undefined && url_path !== null && url_path !== ""){
         sList = {
            product_id : insertProduct[0],
            option_id : 0,
            file_name : file_name,
            full_path : full_path,
            url_path : url_path,
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
            const getOption = await Store.getOptionDetail(i.key);
            for await (let x of getOption) {
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


Store.getOptionDetail = async (optionId) => {
   return  knex.from(sProductOptionBase)
               .where({option_type_id : optionId})
               .then(function (result) {
                  return result;
               })
               .catch((err) => console.log(err));
}

Store.checkCategoryTitle = async (menuId,sTitle) => {
   return  knex.count('*', {as: 'count'})
               .from(sMenuCategory)
               .where({menu_id : menuId})
               .where({name : sTitle})
               .where({is_deleted : 0})
               .then(function (result) {
                  console.log("result",result);
                  return result;
               })
               .catch((err) => console.log(err));
}

Store.categoryListLength = async (menuId) => {
   return  knex.max('id_order', {as: 'count'})
               .from(sMenuCategory)
               .where({menu_id : menuId})
               .then(function (result) {
                  return result;
               })
               .catch((err) => console.log(err));
}

Store.productListLength = async (categoryId) => {
   let sQuery = knex.raw(`
               MAX(t2.id_order)  AS count
   FROM        wm_menu_cat_x_prd AS t1
   INNER JOIN  wm_product        AS t2 ON t1.product_id = t2.product_id
   WHERE       t1.category_id = ?
   `, [categoryId]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Store.checkMainMenu = async (storeId) => {
   let sQuery = knex.raw(`
                  t1.menu_id,
                  t2.category_id
      FROM        wm_menu           AS t1
      INNER JOIN  wm_menu_category  AS t2 ON t1.menu_id = t2.menu_id
      WHERE       t1.store_id = ?
      AND         t2.is_main = 1
      AND         t2.is_deleted = 0
   `, [storeId]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Store.editcategory = async (sContent,menuId,isMain,isUse) => {
   return   knex(sMenuCategory)
            .update({ name : sContent, is_main : isMain, status : isUse })
            .where({ category_id: menuId })
            .then((result) => {
               return result;
            }).catch((err) => console.log(err));
}

Store.deleteCategory = async (categoryId) => {
   return   knex(sMenuCategory)
            .update({ is_deleted : 1, status: 0 })
            .where({ category_id: categoryId })
            .then((result) => {
               return result;
            }).catch((err) => console.log(err));
}

Store.insertCategory = async (menuId,sName, isMain,iStatus, sNm) => {
   return knex(sMenuCategory)
         .insert({ menu_id: menuId, name: sName, is_main: isMain, status: iStatus, id_order : sNm})
         .then((result) => {
            return result;
         }).catch((err) => console.log(err));
}

Store.insertMenuId = async (sName,storeId) => {
   return knex(sMenu)
         .insert({ name: sName, menu_type: "default", store_id: storeId, id_order: 0})
         .then((result) => {
            return result;
         }).catch((err) => console.log(err));
}

Store.checkCategory = async (storeId) => {
   return  knex.from(sMenu)
               .where({store_id : storeId})
               .then(function (result) {
                  return result;
               })
               .catch((err) => console.log(err));
}

Store.getCategoryList = async (menuId) => {
   return  knex.from(sMenuCategory)
               .where({is_deleted : 0})
               .andWhere({menu_id : menuId})
               .orderBy('id_order')
               .then(function (result) {
                  console.log("result",result);
                  return result;
               })
               .catch((err) => console.log(err));
}

Store.parkingDetailUpdate = (storeId,parkingImg,userLat,userLng) => {
   return knex(sTableName)
         .update({ lat : userLat, lng : userLng, parking_image : parkingImg.url_path })
         .where({ store_id: storeId })
         .then((result) => {
            return result;
         }).catch((err) => console.log(err));
}

Store.noticeList = (countNm) => {
   let sQuery = knex.raw(`
                  ( SELECT COUNT(*) FROM wmpos_notice ) AS count_index,
                  created_at,
                  content,
                  title
      FROM        wmpos_notice
      ORDER BY    created_at DESC 
      LIMIT ?
   `, [countNm]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Store.noticeListV2 = () => {
   let sQuery = knex.raw(`
                  created_at,
                  content,
                  title,
                  notice_id
      FROM        wmpos_notice
      WHERE       status = 1
      ORDER BY    created_at DESC
   `, []);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Store.noticeListTotal = () => {
   let sQuery = knex.raw(`
                  created_at,
                  content,
                  title
      FROM        wmpos_notice
      ORDER BY    created_at DESC
   `, []);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Store.noticeListByNm = (sText) => {
   return knex(sNoticeTable)
   .where('title', 'like', `%${sText}%`)
   .then((result) => {
      return result;
   }).catch((err) => console.log(err));
   
}

Store.updateStoreStatus = (sIndex, aStoreId) => {
   return knex(sTableName)
         .update({ pause : sIndex})
         .where({ store_id: aStoreId })
         .where({ store_id: parseInt() })
         .then((result) => {
            return result;
         }).catch((err) => console.log(err));
}

Store.storeOperationSleep = (aStoreId) => {
   return knex(sTableName)
         .update({ order_time: 60, pause : 1 })
         .where({ store_id: aStoreId })
         .then((result) => {
            return result;
         }).catch((err) => console.log(err));
}

Store.storeOperationWakeUp = (aStoreId) => {
   return knex(sTableName)
         .update({ order_time: 0, pause : 0 })
         .where({ store_id: aStoreId })
         .then((result) => {
            return result;
         }).catch((err) => console.log(err));
}

Store.getStoreById = (iStoreId) => {
   return knex.select('t1.store_id',
      't1.phone_number',
      't1.store_name',
      't1.address1',
      't1.address2',
      't1.noti_nearby_distance',
      't1.noti_arrival_distance',
      't1.parking_time',
      't1.city',
      't1.province',
      't1.postcode',
      't1.lat',
      't1.lng',
      't1.auto_confirm',
      't1.opening_time',
      't1.closing_time',
      't1.breaktime_from',
      't1.breaktime_to',
      't1.order_time',
      't1.order_completed',
      't1.pause',
      't1.description',
      't1.status',
      't1.pickup_type',
      't2.url_path',
      't3.full_name',
      't3.business_number',
      't3.business_type',
      't3.phone_number AS merc_phone_nr')
      .from(sTableName + ' AS t1')
      .leftJoin('wm_store_media AS t2', (builder) => {
         builder.on('t1.store_id', 't2.store_id').on('t2.type', knex.raw('?', ['logo']));
      })
      .leftJoin('wm_merchant AS t3', (builder) => {
         builder.on('t3.store_id', 't1.store_id');
      })
      .where({ 't1.store_id': iStoreId })
      .timeout(config.queryTimeout).first().then(function (result) {
         return result;
      })
      .catch((err) => console.log(err));
}

Store.storeInfoShortly = (storeId) => {
   let sQuery = knex.raw(`
                  t1.pause, t1.status, t2.url_path 
      FROM        wm_store AS t1  
      LEFT JOIN   wm_store_media AS t2 ON t1.store_id  = t2.store_id AND t2.type = "logo"
      WHERE       t1.store_id = ?
      ORDER BY    t2.store_media_id ASC
      LIMIT 1;
   `, [storeId]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Store.getStoreInfo = (storeId, fromDate, toDate) => {
   let sQuery = knex.raw(`
                  SUM(t2.total_amount_org) AS price,
                  t1.pause, 
                  t1.status
      FROM        wm_store          AS t1
      INNER JOIN  wm_order          AS t2    ON t1.store_id = t2.store_id
      WHERE       t1.store_id = ?
      AND         DATE(t2.created_at) BETWEEN DATE(?) AND DATE(?)
      AND         t2.cancelled_at IS NULL
      AND         t2.payment_id != 0
   `, [storeId,fromDate,toDate]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Store.getOrderList = (storeId, fromDate, toDate) => {
   let sQuery = knex.raw(`
                  state_id
      FROM        wm_order          
      WHERE       store_id = ?
      AND         DATE(created_at) BETWEEN DATE(?) AND DATE(?)
   `, [storeId,fromDate,toDate]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Store.amountChart = (storeId, fromDate, toDate) => {
   let sQuery = knex.raw(`
                  SUM(total_amount_org) AS amount
      FROM        wm_order          
      WHERE       store_id = ?
      AND         DATE(created_at) BETWEEN DATE(?) AND DATE(?)
      AND         payment_id != 0
      AND         cancelled_at IS NULL
   `, [storeId,fromDate,toDate]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Store.adverEventDisplayCount = (storeId, sId) => {
   let sQuery = knex.raw(`
                  SUM(display_count) AS amount
      FROM        wm_adver_event_stats          
      WHERE       store_id = ?
      AND         adver_event_id = ?
   `, [storeId,sId]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Store.adverEventClickCount = (storeId, sId) => {
   let sQuery = knex.raw(`
                  SUM(clicked_count) AS amount
      FROM        wm_adver_event_stats          
      WHERE       store_id = ?
      AND         adver_event_id = ?
   `, [storeId,sId]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Store.adverCouponDisplayCount = (storeId, sId) => {
   let sQuery = knex.raw(`
                  SUM(display_count) AS amount
      FROM        wm_adver_coupon_stats          
      WHERE       store_id = ?
      AND         adver_coupon_id = ?
   `, [storeId,sId]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Store.adverCouponClickCount = (storeId, sId) => {
   let sQuery = knex.raw(`
                  SUM(clicked_count) AS amount
      FROM        wm_adver_coupon_stats          
      WHERE       store_id = ?
      AND         adver_coupon_id = ?
   `, [storeId,sId]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Store.adverProductThrooOnlyDisplayCount = (storeId, sId) => {
   let sQuery = knex.raw(`
                  SUM(display_count) AS amount
      FROM        wm_adver_product_throo_only_stats          
      WHERE       store_id = ?
      AND         adver_product_throo_only_id = ?
   `, [storeId,sId]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Store.adverProductThrooOnlyClickCount = (storeId, sId) => {
   let sQuery = knex.raw(`
                  SUM(clicked_count) AS amount
      FROM        wm_adver_product_throo_only_stats          
      WHERE       store_id = ?
      AND         adver_product_throo_only_id = ?
   `, [storeId,sId]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Store.adverStoreDisplayCount = (storeId, sId) => {
   let sQuery = knex.raw(`
                  SUM(display_count) AS amount
      FROM        wm_adver_store_stats          
      WHERE       store_id = ?
      AND         adver_store_id = ?
   `, [storeId,sId]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Store.adverStoreClickCount = (storeId, sId) => {
   let sQuery = knex.raw(`
                  SUM(clicked_count) AS amount
      FROM        wm_adver_store_stats          
      WHERE       store_id = ?
      AND         adver_store_id = ?
   `, [storeId,sId]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Store.adverProductPopularDisplayCount = (storeId, sId) => {
   let sQuery = knex.raw(`
                  SUM(display_count) AS amount
      FROM        wm_adver_product_popular_stats          
      WHERE       store_id = ?
      AND         adver_product_popular_id = ?
   `, [storeId,sId]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Store.adverProductPopularClickCount = (storeId, sId) => {
   let sQuery = knex.raw(`
                  SUM(clicked_count) AS amount
      FROM        wm_adver_product_popular_stats          
      WHERE       store_id = ?
      AND         adver_product_popular_id = ?
   `, [storeId,sId]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Store.countWebsiteType = (fromDate, sParam) => {
   let sQuery = knex.raw(`
                  COUNT(DISTINCT(query)) AS sCount
      FROM        throo_stats_webuser          
      WHERE       DATE(created_at) = DATE(?)
      AND         os_version = ?
      AND         type = "homepage"
   `, [fromDate,sParam]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Store.countCEOWebsiteType = (fromDate, sParam) => {
   let sQuery = knex.raw(`
                  COUNT(DISTINCT(query)) AS sCount
      FROM        throo_stats_webuser          
      WHERE       DATE(created_at) = DATE(?)
      AND         os_version = ?
      AND         type != "homepage"
   `, [fromDate,sParam]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Store.countWebsiteUser = (fromDate) => {
   let sQuery = knex.raw(`
                  COUNT(DISTINCT(query)) AS sCount
      FROM        throo_stats_webuser          
      WHERE       DATE(created_at) = DATE(?)
      AND         type = "homepage"
   `, [fromDate]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Store.countCEOWebsiteUser = (fromDate) => {
   let sQuery = knex.raw(`
                  COUNT(DISTINCT(query)) AS sCount
      FROM        throo_stats_webuser          
      WHERE       DATE(created_at) = DATE(?)
      AND         type != "homepage"
   `, [fromDate]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Store.countChart = (fromDate) => {
   let sQuery = knex.raw(`
                  COUNT(t1.order_id) AS sCount
      FROM        wm_order          AS t1
      INNER JOIN  wm_store          AS t2 ON t1.store_id = t2.store_id
      INNER JOIN  wm_merchant       AS t3 ON t1.store_id = t3.store_id  
      WHERE       DATE(t1.created_at) = DATE(?)
      AND         t1.payment_id != 0
      AND         t1.cancelled_at IS NULL
      AND         t3.phone_number != "01039438070"
      AND         t2.store_name != "스루"
      AND         t2.store_name != "스루 컨벤션"
      AND         t2.store_name != "스루 강남역점"
   `, [fromDate]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Store.orderCountByUser = (fromDate,toDate,sParam) => {
   let sQuery = knex.raw(`
                  COUNT(order_id) AS sCount
      FROM        wm_order         
      WHERE       DATE(created_at) BETWEEN DATE(?) AND DATE(?)
      AND         payment_id != 0
      AND         cancelled_at IS NULL
      AND         user_id = ?
   `, [fromDate,toDate,sParam]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Store.storeAmountChart = (fromDate, toDate) => {
   let sQuery = knex.raw(`
                  COUNT(*) AS sCount
      FROM        wm_store          
      WHERE       DATE(created_at) BETWEEN DATE(?) AND DATE(?)
   `, [fromDate,toDate]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Store.userAmountChart = (fromDate, toDate) => {
   let sQuery = knex.raw(`
                  COUNT(*) AS sCount
      FROM        wm_user          
      WHERE       DATE(created_at) BETWEEN DATE(?) AND DATE(?)
      AND         status != 0
   `, [fromDate,toDate]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Store.doubleChartForDay = (storeId, fromDate, toDate) => {
   let sQuery = knex.raw(`
                  COUNT(*) AS count
      FROM        wm_order          
      WHERE       store_id = ?
      AND         DATE(created_at) BETWEEN DATE(?) AND DATE(?)
      AND         payment_id != 0
      AND         cancelled_at IS NULL
   `, [storeId,fromDate,toDate]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Store.getMediaId = async (storeId) => {
   let sQuery = knex.raw(`
            store_media_id AS media_id
   FROM     wm_store_media 
   WHERE    store_id = ? 
   AND      type = 'logo' 
   ORDER BY store_media_id ASC
   `, [storeId]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
         return result;
   }).catch((err) => console.log("err",err));
}

Store.deleteStoreMediaData = async (iParam,storeId) => {
   return   knex(iStoreMedia)
            .update({ file_name: null, full_path: null, url_path: null, status : 0 })
            .where({ store_media_id: iParam })
            .where({ store_id: storeId })
            .then((result) => {
               return result;
            }).catch((err) => console.log(err));
}

Store.updateStoreMediaData = async (sParam,iParam,storeId) => {
   return   knex(iStoreMedia)
            .update({ file_name: sParam.file_name, full_path: sParam.full_path, url_path: sParam.url_path, status : 1 })
            .where({ store_media_id: iParam })
            .where({ store_id: storeId })
            .then((result) => {
               return result;
            }).catch((err) => console.log(err));
}

Store.imagesContentUpdate = async (logo_img_id,first_img_id,second_img_id,third_img_id,logoImg,first_img,second_img,third_img) => {
   let result_cd = '9999';
   
   const trx = await knex.transaction();
   try {
      await trx(iStoreMedia)
            .where({ store_media_id: logo_img_id })
            .update({ file_name: logoImg.file_name, full_path: logoImg.full_path, url_path: logoImg.url_path, status : 1 })
            .then(async (res) => {
               return res;
            })
            .catch((err) => {
               console.log("err",err);
               throw e;
            });

      result_cd = '1111';

      await trx(iStoreMedia)
            .where({ store_media_id: first_img_id })
            .update({ file_name: first_img.file_name, full_path: first_img.full_path, url_path: first_img.url_path, status : 1 })
            .then(async (res) => {
               return res;
            })
            .catch((err) => {
               console.log("err",err);
               throw e;
            });

      result_cd = '2222';

      await trx(iStoreMedia)
            .where({ store_media_id: second_img_id })
            .update({ file_name: second_img.file_name, full_path: second_img.full_path, url_path: second_img.url_path, status : 1 })
            .then(async (res) => {
               return res;
            })
            .catch((err) => {
               console.log("err",err);
               throw e;
            });

      result_cd = '3333';

      await trx(iStoreMedia)
            .where({ store_media_id: third_img_id })
            .update({ file_name: third_img.file_name, full_path: third_img.full_path, url_path: third_img.url_path, status : 1 })
            .then(async (res) => {
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

Store.contractComplete = async (storeId) => {
   let result_cd = '9999';
   
   const trx = await knex.transaction();
   try {
      await trx(sPosUser)
            .where({ store_id: storeId })
            .update({ status : 1 })
            .then(async (res) => {
               return res;
            })
            .catch((err) => {
               console.log("err",err);
               throw e;
            });

      result_cd = '1111';

      await trx(sTableName)
            .where({ store_id: storeId })
            .update({ pause: 1, status : 1 })
            .then(async (res) => {
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

Store.orderTimeUpdate = async (otFirst,otMiddle,otLast,oWalkTime,storeId) => {
   let result_cd = '9999';
   console.log("5",oWalkTime);
   const trx = await knex.transaction();
   try {
      await trx(iStoreCongestion)
            .where({ congestion_type: 0 })
            .where({ store_id: storeId })
            .update({ minute : otFirst })
            .then(async (res) => {
               console.log("res",res);
               return res;
            })
            .catch((err) => {
               console.log("err",err);
               throw e;
            });

      result_cd = '1111';

      await trx(iStoreCongestion)
            .where({ congestion_type: 1 })
            .where({ store_id: storeId })
            .update({ minute : otMiddle })
            .then(async (res) => {
               console.log("res",res);
               return res;
            })
            .catch((err) => {
               console.log("err",err);
               throw e;
            });
      result_cd = '2222';

      await trx(iStoreCongestion)
            .where({ congestion_type: 2 })
            .where({ store_id: storeId })
            .update({ minute : otLast })
            .then(async (res) => {
               console.log("res",res);
               return res;
            })
            .catch((err) => {
               console.log("err",err);
               throw e;
            });

      result_cd = '3333';

      console.log("6",oWalkTime);
      if(oWalkTime !== ""){
         console.log("7",oWalkTime);
         await trx('wm_store_time_congestion_walkthru')
               .where({ congestion_type: 0 })
               .where({ store_id: storeId })
               .update({ minute : oWalkTime })
               .then(async (res) => {
                  console.log("res",res);
                  return res;
               })
               .catch((err) => {
                  console.log("err",err);
                  throw e;
               });
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

Store.storeOrderType = async (storeId) => {
   return  knex.from(iStoreTimeBusiness)
               .where({store_id : storeId})
               .where({date_type : 1})
               .then(function (result) {
                  return result;
               })
               .catch((err) => console.log(err));
}

Store.storeTimeBusiness = async (storeId,o_time,c_time,b_from,b_to,day_week,d_type,c_type,sData, alltime) => {
   let result_cd = '9999';
   const trx = await knex.transaction();
   try {
      let sList = {
         store_id : storeId,
         opening_time : o_time,
         closing_time : c_time,
         breaktime_from : b_from,
         breaktime_to : b_to,
         day_of_week : day_week,
         date_type : d_type,
         all_time: alltime,
         status : 1,
      }
      await trx(iStoreTimeBusiness)
            .del()
            .where({store_id : storeId})
            .then(async (res) => {
               return res;
            })
            .catch((err) => {
               console.log(err);
               throw e;
            });
      result_cd = '1111';

      await trx(iStoreTimeOrder)
            .del()
            .where({store_id : storeId})
            .then(async (res) => {
               return res;
            })
            .catch((err) => {
               console.log(err);
               throw e;
            });
      result_cd = '2222';      

      const storeTimeInsert = await trx(iStoreTimeBusiness)
                                    .insert(sList)
                                    .then(async (res) => {
                                       return res;
                                    })
                                    .catch((err) => {
                                       console.log(err);
                                       throw e;
                                    });
      result_cd = '3333';

      sList = {
         store_time_id : storeTimeInsert[0],
         store_id : storeId,
         time_from : o_time,
         time_to : c_time,
         time_type: 0,
         congestion_type : c_type,
         status : 1,
      }
      await trx(iStoreTimeOrder)
            .insert(sList)
            .then(async (res) => {
               return res;
            })
            .catch((err) => {
               console.log(err);
               throw e;
            });

      if(sData !== "none"){
         result_cd = '4444';

         for await (let i of sData) {
            let sType;
            if(i.selectValue === "easy"){
               sType = 0
            } else if(i.selectValue === "normal"){
               sType = 1
            } else {
               sType = 2
            }

            let aList = {
               store_time_id : storeTimeInsert[0],
               store_id : storeId,
               time_from : i.from,
               time_to : i.to,
               time_type: 1,
               congestion_type : sType,
               status : 1,
            }
            await trx(iStoreTimeOrder)
                  .insert(aList)
                  .then(async (res) => {
                     return res;
                  })
                  .catch((err) => {
                     console.log(err);
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

Store.storeTimeWeeklyBusiness = async (storeId,operating) => {
   let result_cd = '9999';
   let sDay;
   let operatingList;
   let optionList;

   const trx = await knex.transaction();
   try {
      await trx(iStoreTimeBusiness)
            .del()
            .where({store_id : storeId})
            .then(async (res) => {
               console.log("iStoreTimeBusiness del res",res);
               return res;
            })
            .catch((err) => {
               console.log("iStoreTimeBusiness delerr",err);
               throw e;
            });
      result_cd = '1111';

      await trx(iStoreTimeOrder)
            .del()
            .where({store_id : storeId})
            .then(async (res) => {
               console.log("iStoreTimeOrder del res",res);
               return res;
            })
            .catch((err) => {
               console.log("iStoreTimeOrder del err",err);
               throw e;
            });
      result_cd = '2222';      

      for await (let i of operating) {
         if(i.mOperatingList != undefined && i.mOperatingList != null){
            operatingList = i.mOperatingList;
            optionList = i.mOptionList;
            sDay = 1;
         } else if(i.tOperatingList != undefined && i.tOperatingList != null){
            operatingList = i.tOperatingList;
            optionList = i.tOptionList;
            sDay = 2;
         } else if(i.wOperatingList != undefined && i.wOperatingList != null){
            operatingList = i.wOperatingList;
            optionList = i.wOptionList;
            sDay = 3;
         } else if(i.thOperatingList != undefined && i.thOperatingList != null){
            operatingList = i.thOperatingList;
            optionList = i.thOptionList;
            sDay = 4;
         } else if(i.fOperatingList != undefined && i.fOperatingList != null){
            operatingList = i.fOperatingList;
            optionList = i.fOptionList;
            sDay = 5;
         } else if(i.sOperatingList != undefined && i.sOperatingList != null){
            operatingList = i.sOperatingList;
            optionList = i.sOptionList;
            sDay = 6;
         } else if(i.suOperatingList != undefined && i.suOperatingList != null){
            operatingList = i.suOperatingList;
            optionList = i.suOptionList;
            sDay = 0;
         }

         const insertData = await makeList(operatingList,optionList,sDay);
         let sList = {
            store_id : storeId,
            opening_time : insertData.o_time,
            closing_time : insertData.c_time,
            breaktime_from : insertData.b_from,
            breaktime_to : insertData.b_to,
            day_of_week : insertData.day_week,
            date_type : insertData.d_type,
            all_time: insertData.alltime,
            status : 1,
         }
         const storeTimeInsert = await trx(iStoreTimeBusiness)
                                       .insert(sList)
                                       .then(async (res) => {
                                          console.log("storeTimeInsert insert res",res);
                                          return res;
                                       })
                                       .catch((err) => {
                                          console.log("storeTimeInsert insert res",res);
                                          throw e;
                                       });
         
         let eList = {
            store_time_id : storeTimeInsert[0],
            store_id : storeId,
            time_from : insertData.o_time,
            time_to : insertData.c_time,
            time_type: 0,
            congestion_type : insertData.c_type,
            status : 1,
         }
         await trx(iStoreTimeOrder)
               .insert(eList)
               .then(async (res) => {
                  console.log("iStoreTimeOrder insert res",res);
                  return res;
               })
               .catch((err) => {
                  console.log("iStoreTimeOrder insert res",res);
                  throw e;
               });

         if(insertData.sData !== "none"){
            result_cd = '4444';

            for await (let as of insertData.sData) {
               let sType;
               if(as.selectValue === "easy"){
                  sType = 0
               } else if(as.selectValue === "normal"){
                  sType = 1
               } else {
                  sType = 2
               }

               let aList = {
                  store_time_id : storeTimeInsert[0],
                  store_id : storeId,
                  time_from : as.from,
                  time_to : as.to,
                  time_type: 1,
                  congestion_type : sType,
                  status : 1,
               }
               await trx(iStoreTimeOrder)
                     .insert(aList)
                     .then(async (res) => {
                        console.log("iStoreTimeOrder option insert res",res);
                        return res;
                     })
                     .catch((err) => {
                        console.log("iStoreTimeOrder option insert res",res);
                        throw e;
                     });
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

Store.getStoreText = async (storeId) => {
   return  knex.select('description','description_extra','description_noti','store_type_id')
               .from(sTableName)
               .where({store_id : storeId})
               .then(function (result) {
                  return result;
               })
               .catch((err) => console.log(err));
}

Store.getStoreType = async () => {
   let sQuery = knex.raw(`
               name,
               code,
               store_type_id,
               parent_store_type_id
   FROM        wm_store_type
   WHERE       status = 1
   AND         parent_store_type_id != 0
   `, []);
   
   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
         return result;
   }).catch((err) => console.log("err",err));
}

Store.getStoreTypeXStoreId = async (sIndex,aIndex) => {
   let sQuery = knex.raw(`
                     t1.is_main,
                     t2.parent_store_type_id,
                     t2.name 
      FROM 			   wm_store_x_store_type   AS t1 
      INNER JOIN 		wm_store_type           AS t2 ON t1.store_type_id = t2.store_type_id 
      WHERE 			t1.store_id = ?
      AND 			   t1.store_type_id = ?
   `, [sIndex,aIndex]);
   
   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
         return result;
   }).catch((err) => console.log("err",err));
}

Store.storeDesc = async (storeId) => {
   let sQuery = knex.raw(`
               t1.address1, 
               t1.description,
               t1.description_extra, 
               t1.description_noti, 
               t1.lat, 
               t1.lng, 
               t1.noti_nearby_distance,
               t1.parking_time, 
               t1.parking_image, 
               t2.url_path
   FROM        wm_store AS t1
   LEFT JOIN   wm_store_media AS t2 ON t1.store_id = t2.store_id AND t2.type = "logo"
   WHERE       t1.store_id = ?
   `, [storeId]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
         return result;
   }).catch((err) => console.log("err",err));
}

Store.getPickUpZoneInfo = async (storeId) => {
   return  knex.select('lat', 'lng','parking_image','parking_pan','parking_tilt','parking_zoom')
               .from("wm_store")
               .where({store_id : storeId})
               .then(function (result) {
                  return result;
               })
               .catch((err) => console.log(err));
}

Store.storeOrderTime = async (storeId) => {
   return  knex.select('congestion_type', 'minute')
               .from(iStoreCongestion)
               .where({store_id : storeId})
               .then(function (result) {
                  return result;
               })
               .catch((err) => console.log(err));
}

Store.getAdverEventChartList = async (storeId) => {
   return  knex.select('adver_event_id', 'created_at', 'end_date')
               .from('wm_adver_event')
               .where({store_id : storeId})
               .where({status : 1})
               .orderBy('adver_event_id', 'desc')
               .then(function (result) {
                  return result;
               })
               .catch((err) => console.log(err));
}

Store.getAdverCouponChartList = async (storeId) => {
   return  knex.select('adver_coupon_id', 'created_at', 'end_date')
               .from('wm_adver_coupon')
               .where({store_id : storeId})
               .where({status : 1})
               .orderBy('adver_coupon_id', 'desc')
               .then(function (result) {
                  return result;
               })
               .catch((err) => console.log(err));
}

Store.getAdverPopularChartList = async (storeId) => {
   return  knex.select('adver_product_popular_id', 'created_at', 'end_date')
               .from('wm_adver_product_popular')
               .where({store_id : storeId})
               .where({status : 1})
               .orderBy('adver_product_popular_id', 'desc')
               .then(function (result) {
                  return result;
               })
               .catch((err) => console.log(err));
}

Store.getAdverThrooOnlyChartList = async (storeId) => {
   return  knex.select('adver_product_throo_only_id', 'created_at', 'end_date')
               .from('wm_adver_product_throo_only')
               .where({store_id : storeId})
               .where({status : 1})
               .orderBy('adver_product_throo_only_id', 'desc')
               .then(function (result) {
                  return result;
               })
               .catch((err) => console.log(err));
}

Store.getAdverStoreChartList = async (storeId) => {
   return  knex.select('adver_store_id', 'created_at', 'end_date')
               .from('wm_adver_store')
               .where({store_id : storeId})
               .where({status : 1})
               .orderBy('adver_store_id', 'desc')
               .then(function (result) {
                  return result;
               })
               .catch((err) => console.log(err));
}

Store.storeWalkThrooOrderTime = async (storeId) => {
   return  knex.select('minute')
               .from('wm_store_time_congestion_walkthru')
               .where({store_id : storeId})
               .then(function (result) {
                  return result;
               })
               .catch((err) => console.log(err));
}

Store.weeklyOrderTimeList = async (storeId) => {
   return  knex.from(iStoreTimeBusiness)
               .where({store_id : storeId})
               .then(function (result) {
                  return result;
               })
               .catch((err) => console.log(err));
}

Store.weeklyOrderTimeList = async (storeId) => {
   return  knex.from(iStoreTimeBusiness)
               .where({store_id : storeId})
               .then(function (result) {
                  return result;
               })
               .catch((err) => console.log(err));
}

Store.checkOptionBoth = async (storeTimeId) => {
   return  knex.from(iStoreTimeOrder)
               .where({store_time_id : storeTimeId})
               .where({time_type : 1})
               .then(function (result) {
                  return result;
               })
               .catch((err) => console.log(err));
}

Store.getOrderTimeCongestion = async (storeTimeId) => {
   return  knex.from(iStoreTimeOrder)
               .where({store_time_id : storeTimeId})
               .where({time_type : 0})
               .then(function (result) {
                  return result;
               })
               .catch((err) => console.log(err));
}


module.exports = Store;