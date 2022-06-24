'use strict';

var jwt = require('jsonwebtoken');
var config = require('../config');

const axios = require("axios");

const Store = require('../models/store');
const User = require('../models/user');
const StoreMenu = require('../models/storemenu');
const Product = require('../models/product');
const Barista = require('../models/barista');
const Merchant = require('../models/merchant');

const moment = require('moment-timezone');
require('moment/locale/ko');

const {
   createError,
   BAD_REQUEST,
   UNAUTHORIZED,
   UNPROCESSABLE,
   CONFLICT,
   NOT_FOUND,
   GENERIC_ERROR
} = require('../helpers/errorHelper');

const helpers = require('../helpers/imageHelper');

const {
   convertToKRW,
   padString,
   groupArrayByKey
} = require('../helpers/stringHelper');

var oValidate = require("validate.js");
const { async } = require('validate.js');

const modalresources = async (index) => {
   let oResult = {};
   let optionList = [];
   let optionText = "";

   const result = await Store.getModalOptionList(index);
   if(result.length > 0){
      for await (let iData of result) {
         let temp = {};
         temp.title = iData.name;
         temp.type = iData.type;

         optionList.push(temp);
         optionText = iData.title;
      }
      oResult.mainTitle = optionText;
      oResult.contents = optionList;
   }

   return oResult;
}

// The admin controller.
var ModalController = {}

ModalController.index = function (req, res) {
   res.status(200).json({ message: 'Welcome to the store area !' });
}

ModalController.modalBackPage = async (req, res) => {
   const storeId = req.params.store_id;

   let oResult = {
      userLat : null,
      userLng : null,
      storeOwner : "미정",
      storeBN : "미정",
      storeInfo : "미정",
      storeNoti : "미정",
      menuDetail : "미정",
      storeTime : "미정"
   };
   
   try {
      const getData = await Store.modalAddress(storeId);
      if(getData != undefined && getData.length > 0){
         if(getData[0].lat != null && getData[0].lat != undefined && getData[0].lat != ""){
            oResult.userLat = getData[0].lat;
         }
         if(getData[0].lng != null && getData[0].lng != undefined && getData[0].lng != ""){
            oResult.userLng = getData[0].lng;
         }
         if(getData[0].description != null && getData[0].description != undefined && getData[0].description != ""){
            oResult.storeInfo = getData[0].description;
         }
         if(getData[0].description_noti != null && getData[0].description_noti != undefined && getData[0].description_noti != ""){
            oResult.storeNoti = getData[0].description_noti;
         }
         if(getData[0].description_extra != null && getData[0].description_extra != undefined && getData[0].description_extra != ""){
            oResult.menuDetail = getData[0].description_extra;
         }
         if(getData[0].business_number != null && getData[0].business_number != undefined && getData[0].business_number != ""){
            oResult.storeBN = getData[0].business_number;
         }
         if(getData[0].description_holiday != null && getData[0].description_holiday != undefined && getData[0].description_holiday != ""){
            oResult.storeTime = getData[0].description_holiday;
         }
         if(getData[0].full_name != null && getData[0].full_name != undefined && getData[0].full_name != ""){
            oResult.storeOwner = getData[0].full_name;
         }
         
      }
      
   } catch (error) {
      console.log("error",error);
   }
   res.status(200).json(oResult);
}

ModalController.getOptionListModal = async (req, res) => {
   const storeId = req.params.store_id;

   let oResult = {
      resultCd : "9999",
      result : [],
   };

   try {
      const getParam = await Store.getoptionList(parseInt(storeId));
      oResult.resultCd = "0000";
      if(getParam.length > 0){
         for await (let iData of getParam) {
            let iDataList = {}
            iDataList.lists = [];
            iDataList.id = iData.option_type_id;
            iDataList.name = iData.name;
            iDataList.menu = "";
            iDataList.optionNm = "";

            const items = await Store.getOptionDetail(parseInt(iData.option_type_id));
            if(items.length > 0){
               let sucTemp = "";
               let tempOption = [];
               for await (let pData of items) {
                  let pDataList = {};
                  pDataList.price = Math.floor(parseFloat(pData.price));
                  pDataList.name = pData.name;
                  iDataList.lists.push(pDataList);
                  tempOption.push(iDataList);
               }
               if(tempOption.length > 0){
                  sucTemp = tempOption.map(function(elem){
                     return elem.name;
                  }).join(", ");
               }
               iDataList.optionNm = sucTemp;
            }
            
            const products = await Store.getInsideOfOption(parseInt(storeId),parseInt(iData.option_type_id));
            if(products.length > 0){
               let sucTemp = "";
               let tempMenu = [];
               for await (let sData of products) {
                  let sDataList = {};
                  sDataList.productNm = sData.name;
                  tempMenu.push(sDataList);
               }
               if(tempMenu.length > 0){
                  sucTemp = tempMenu.map(function(elem){
                     return elem.productNm;
                  }).join(", ");
               }
               iDataList.menu = sucTemp;
            }

            oResult.result.push(iDataList);
         }
      }

   } catch (error) {
      console.log(error);
   }

   res.status(200).json(oResult);
}

ModalController.modalOptionList = async (req, res) => {
   const optionId = req.body.optionIndex;

   let oResult = {
      resultCd : "9999",
      result : [],
   };

   try {
      if(optionId.length > 0){
         for await (let iData of optionId) {
            const getData = await modalresources(iData);
            if(getData.mainTitle != undefined){
               oResult.result.push(getData);
               oResult.resultCd = "0000";
            }
         }
      }
   } catch (error) {
      console.log(error);
   }

   res.status(200).json(oResult);
}

ModalController.modalFrontPage = async (req, res) => {
   const storeId = req.params.store_id;

   let sCount = 0;
   let oResult = {
      logoImage : "",
      storeImage1 : "",
      storeImage2 : "",
      storeImage3 : "",
      storeName : "미입력",
      parkingTime : "미입력",
      storePhone : "미입력",
      address: "미입력",
   };

   try {
      const getData = await Store.modalConfig(storeId);
      if(getData.length > 0){
         for await (let iData of getData) {
            if(parseInt(sCount) === 0){
               if(iData.store_name !== null && iData.store_name !== undefined && iData.store_name !== ""){
                  oResult.storeName = iData.store_name;
               }

               if(iData.parking_time !== null && iData.parking_time !== undefined && iData.parking_time !== ""){
                  oResult.parkingTime = iData.parking_time;
               }
               
               if(iData.phone_number !== null && iData.phone_number !== undefined && iData.phone_number !== ""){
                  oResult.storePhone = iData.phone_number;
               }
   
               if(iData.address1 !== null && iData.address1 !== undefined && iData.address1 !== ""){
                  oResult.address = iData.address1;
               }

               if(iData.address2 !== null && iData.address2 !== undefined && iData.address2 !== ""){
                  oResult.address = oResult.address + iData.address2;
               }

               oResult.logoImage = iData.url_path;
            } else if (parseInt(sCount) === 1){
               oResult.storeImage1 = iData.url_path;
            } else if (parseInt(sCount) === 2){
               oResult.storeImage2 = iData.url_path;
            } else if (parseInt(sCount) === 3){
               oResult.storeImage3 = iData.url_path;
            }
            sCount += 1;
         }
      }
   } catch (error) {
      console.log("error",error);
   }
   res.status(200).json(oResult);
}

ModalController.modalConfig = async (req, res) => {
   const storeId = req.params.store_id;

   let oResult = {
      logoImage : "",
      storeImg : "",
      storekImg : "",
      storepImg : "",
      parkingTime : "미정",
      orderTime : "미정",
      storePhone : "",
      sContent: ""
   };

   try {
      const getData = await Store.modalConfig(storeId);
      if(getData.length > 0){
         for await (let iData of getData) {
            if(iData.type != null && iData.type != undefined && iData.type != ""){
               if(oResult.logoImage === ""){
                  oResult.logoImage = iData.url_path;
               } else if (oResult.storeImg === ""){
                  oResult.storeImg = iData.url_path;
               } else if (oResult.storekImg === ""){
                  oResult.storekImg = iData.url_path;
               } else if(oResult.storepImg === ""){
                  oResult.storepImg = iData.url_path;
               }
            }

            if(iData.parking_time != null && iData.parking_time != undefined && iData.parking_time != ""){
               oResult.parkingTime = iData.parking_time;
            }
            
            if(iData.phone_number != null && iData.phone_number != undefined && iData.phone_number != ""){
               oResult.storePhone = iData.phone_number;
            }

            if(iData.address1 != null && iData.address1 != undefined && iData.address1 != ""){
               oResult.sContent = iData.address1;
            }

            const operationTime = await Store.modalOperationTime(storeId);
            if(operationTime.length > 0){
               for await(let iterator of operationTime) {
                  let tempToday = moment().day();
                  if(parseInt(tempToday) == parseInt(iterator.day_of_week)){
                     oResult.orderTime = "일요일" + iterator.opening_time.toString() + "~" + iterator.closing_time.toString();
                     if(parseInt(tempToday) == 1){
                        oResult.orderTime = "월요일" + iterator.opening_time.toString() + "~" + iterator.closing_time.toString();
                     } else if(parseInt(tempToday) == 2){
                        oResult.orderTime = "화요일" + iterator.opening_time.toString() + "~" + iterator.closing_time.toString();
                     } else if(parseInt(tempToday) == 3){
                        oResult.orderTime = "수요일" + iterator.opening_time.toString() + "~" + iterator.closing_time.toString();
                     } else if(parseInt(tempToday) == 4){
                        oResult.orderTime = "목요일" + iterator.opening_time.toString() + "~" + iterator.closing_time.toString();
                     } else if(parseInt(tempToday) == 5){
                        oResult.orderTime = "금요일" + iterator.opening_time.toString() + "~" + iterator.closing_time.toString();
                     } else if(parseInt(tempToday) == 6){
                        oResult.orderTime = "토요일" + iterator.opening_time.toString() + "~" + iterator.closing_time.toString();
                     }
                  } else if(parseInt(iterator.day_of_week) == 7){
                     oResult.orderTime = "매일" + iterator.opening_time.toString() + "~" + iterator.closing_time.toString();
                  } else if(parseInt(iterator.day_of_week) == 8){
                     if(parseInt(tempToday) > 0 && parseInt(tempToday) < 6){
                        oResult.orderTime = "평일" + iterator.opening_time.toString() + "~" + iterator.closing_time.toString();
                     }
                  } else if(parseInt(iterator.day_of_week) == 9){
                     if((parseInt(tempToday) > 5 && parseInt(tempToday) < 7) || (parseInt(tempToday) < 1)){
                        oResult.orderTime = "주말" + iterator.opening_time.toString() + "~" + iterator.closing_time.toString();
                     }
                  }
               }
            }
            
         }
      }
   } catch (error) {
      console.log("error",error);
   }
   res.status(200).json(oResult);
}

ModalController.modalAddress = async (req, res) => {
   const storeId = req.params.store_id;

   let oResult = {
      userLat : "",
      userLng : "",
      storeInfo : "",
      storeNoti : "",
      menuDetail : "",
      storeBusinessNumber : "",
      day_of_week : "",
      storeTimeList : [],
      storeTime : ""
   };

   try {
      const getData = await Store.modalAddress(storeId);
      if(getData != undefined && getData.length > 0){
         if(getData[0].lat != null && getData[0].lat != undefined && getData[0].lat != ""){
            oResult.userLat = getData[0].lat;
         }
         if(getData[0].lng != null && getData[0].lng != undefined && getData[0].lng != ""){
            oResult.userLng = getData[0].lng;
         }
         if(getData[0].description != null && getData[0].description != undefined && getData[0].description != ""){
            oResult.storeInfo = getData[0].description;
         }
         if(getData[0].description_noti != null && getData[0].description_noti != undefined && getData[0].description_noti != ""){
            oResult.storeNoti = getData[0].description_noti;
         }
         if(getData[0].description_extra != null && getData[0].description_extra != undefined && getData[0].description_extra != ""){
            oResult.menuDetail = getData[0].description_extra;
         }
         if(getData[0].business_number != null && getData[0].business_number != undefined && getData[0].business_number != ""){
            oResult.storeBusinessNumber = getData[0].business_number;
         }
         if(getData[0].description_holiday != null && getData[0].description_holiday != undefined && getData[0].description_holiday != ""){
            oResult.day_of_week = getData[0].description_holiday;
         }
         
      }
      
   } catch (error) {
      console.log("error",error);
   }
   res.status(200).json(oResult);
}

ModalController.modalMenuDetailV2 = async (req, res) => {
   let oResult = {};
   let option = [];
   let optionIds = [];
   try {
      const menu_id = req.params.menu_id;
      const getMenuDetail = await Store.getMenuDetail(parseInt(menu_id));
      if(getMenuDetail != undefined && getMenuDetail != null){
         const optionList = await Store.getOptionListByMenuId(parseInt(menu_id));
         if(optionList != undefined && optionList != null && optionList.length > 0){
            oResult.optionYn = true;
            for await (let i of optionList) {
               optionIds.push(i.option_type_id);
            }
         } else {
            oResult.optionYn = false;
         }

         if(getMenuDetail[0].url_path == null || getMenuDetail[0].url_path === ""){
            oResult.url_path = "https://api-stg.ivid.kr/img/no-image-new.png";
         } else {
            oResult.url_path = getMenuDetail[0].url_path;
         }
         
         oResult.product_name = getMenuDetail[0].product_name;
         oResult.base_price = Math.floor(parseFloat(getMenuDetail[0].base_price));
      }

      if(oResult.optionYn){
         for await (let iData of optionIds) {
            const getData = await modalresources(iData);
            if(getData.mainTitle != undefined){
               option.push(getData);
            }
         }
         oResult.optionList = option;
      }

   } catch (error) {
      console.log("error",error);
   }

   res.status(200).json(oResult);
}

ModalController.modalMenuV2 = async (req, res) => {
   let oResult = [];
   
   try {
      const category_id = req.params.category_id;
      const menu = await Store.menuByStoreId(category_id);
      if(menu !== undefined && menu !== null){
         if(menu.length > 0){
            for await (let pData of menu) {
               if(pData.name !== undefined && pData.name !== null){
                  let temp = {};
                  temp.price = Math.floor(parseFloat(pData.base_price));
                  temp.name = pData.name;
                  temp.id = pData.product_id;
   
                  if(pData.url_path != null && pData.url_path != undefined && pData.url_path != ""){
                     temp.img = pData.url_path;
                  } else {
                     temp.img = "https://api-stg.ivid.kr/img/no-image-new.png";
                  }
   
                  oResult.push(temp);
               }
            }
         }
      }

   } catch (error) {
      console.log("error",error);
   }

   res.status(200).json(oResult);
}

ModalController.modalCategoryV2 = async (req, res) => {
   let oResult = [];
   
   try {
      const store_id = req.params.store_id;
      const getData = await Store.categoryByStoreId(store_id);
      if(getData !== undefined && getData !== null){
         if(getData.length > 0){
            for await (let iData of getData) {
               if(iData.name !== null && iData.name !== undefined){
                  let temp = {};
                  temp.name = iData.name;
                  temp.key = iData.category_id;
      
                  oResult.push(temp);
               }
            }
         }
      }

   } catch (error) {
      console.log("error",error);
   }

   res.status(200).json(oResult);
}

ModalController.modalMenu = async (req, res) => {
   const storeId = req.params.store_id;

   let tempMenu = [
      { name: "미정", price: "0원", img : "https://api-stg.ivid.kr/img/no-image-new.png"},
      { name: "미정", price: "0원", img : "https://api-stg.ivid.kr/img/no-image-new.png"},
      { name: "미정", price: "0원", img : "https://api-stg.ivid.kr/img/no-image-new.png"},
      { name: "미정", price: "0원", img : "https://api-stg.ivid.kr/img/no-image-new.png"}
   ];
   let categoryId = "null";
   let oResult = {
      resultCd : "9999",
      menus : [],
      menutitle : [],
   };

   try {
      const getData = await Store.categoryByStoreId(storeId);
      if(getData.length > 0){
         for await (let iData of getData) {
            if(iData.name !== null && iData.name !== undefined){
               let temp = {};
               temp.name = iData.name;
   
   
               oResult.menutitle.push(temp);
   
               if(categoryId === "null"){
                  categoryId = iData.category_id;
               }
            }
         }

         const menu = await Store.menuByStoreId(categoryId);
         if(menu.length > 0){
            for await (let pData of menu) {
               if(pData.name !== undefined && pData.name !== null){
                  let temp = {};
                  temp.price = Math.floor(parseFloat(pData.base_price));
                  temp.name = pData.name;
                  if(pData.url_path != null && pData.url_path != undefined && pData.url_path != ""){
                     temp.img = pData.url_path;
                  } else {
                     temp.img = "https://api-stg.ivid.kr/img/no-image-new.png";
                  }
                  oResult.menus.push(temp);
               }
            }
         } else {
            oResult.menus = tempMenu;
         }

         oResult.resultCd = "0000";
      }

   } catch (error) {
      console.log("error",error);
   }

   res.status(200).json(oResult);
}


ModalController.modalMenuList = async (req, res) => {
   const categoryId = req.params.category_id;

   let oResult = {
      resultCd : "9999",
      menus : [],
      menutitle : "",
   };

   try {
      const menu = await Store.menuByStoreId(categoryId);
      if(menu.length > 0){
         for await (let pData of menu) {
            if(pData.name !== undefined && pData.name !== null){
               let temp = {};
               temp.price = Math.floor(parseFloat(pData.base_price));
               temp.name = pData.name;
               if(pData.url_path != null && pData.url_path != undefined && pData.url_path != ""){
                  temp.img = pData.url_path;
               } else {
                  temp.img = "https://api-stg.ivid.kr/img/no-image-new.png";
               }
               
               oResult.menus.push(temp);
               oResult.menutitle = pData.categoryName;
               oResult.resultCd = "0000";
            }
         }
      }

   } catch (error) {
      console.log("error",error);
   }

   res.status(200).json(oResult);
}


module.exports = ModalController;