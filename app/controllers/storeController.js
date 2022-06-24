'use strict';

var jwt = require('jsonwebtoken');
var config = require('../config');

const axios = require("axios");
const CryptoJS = require('crypto-js');

const Store = require('../models/store');
const User = require('../models/user');
const StoreMenu = require('../models/storemenu');
const Product = require('../models/product');
const Barista = require('../models/barista');
const Merchant = require('../models/merchant');

const { v1: uuidv1 } = require('uuid');

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

const getConvert = (sText, iText) => {
   let temp;
   if(sText != undefined){
      if(sText != null){
         temp = sText;
      } else {
         temp = iText;
      }
   } else {
      temp = iText;
   }

   return temp;
}


const searchKakaoAddress = async (sQuery) => {
   let oResult = {};

   const oResKakaoAddress = await axios({
      url: 'https://dapi.kakao.com/v2/local/search/address.json',
      method: "get",
      params: {
         analyze_type: 'similar',
         page: 1,
         size: 10,
         query: sQuery
      },
      timeout: (15 * 1000),
      headers: {
         Authorization: 'KakaoAK d9d0e02b55d250f7014e2485bf97890e'
      },
      transformResponse: [(data) => {
         return data;
      }],
   });

   if (oResKakaoAddress.status != undefined && oResKakaoAddress.status === 200) {
      let oRes = oResKakaoAddress.data;
      let oParsedRes = JSON.parse(oRes);

      let aAddress = [];
      if (oParsedRes.documents != undefined) {
         let oAdd = {};
         for (let oAddress of oParsedRes.documents) {
            oAdd = {
               x: oAddress['x'],
               y: oAddress['y']
            }
            aAddress.push(oAdd);
         }
      }

      oResult.success = true;
      oResult.address = aAddress;
   } else {
      oResult.success = false;
   }
   return oResult;
}

async function* asyncGenerator(sIndex) {
   let count = 0;
   while (count < sIndex) 
   yield count++;
};

async function* asyncGenerator2(sIndex,aIndex) {
   let count = sIndex;
   while (count > aIndex) 
   yield count--;
};

const changeArrayOrder = async (sList, targetIdx, moveValue) => {
   const newPosition = targetIdx + moveValue;
 
   if (newPosition < 0 || newPosition >= sList.length) return;
 
   const tempList = JSON.parse(JSON.stringify(sList));
 
   const target = tempList.splice(targetIdx, 1)[0];
 
   tempList.splice(newPosition, 0, target);
   return tempList;
};

const congestionDecision = async (iCount) => {
   let temp = "";
   if (0 < parseInt(iCount.congestion_type) && parseInt(iCount.congestion_type) < 2) {
      temp = "normal";
   } else if (1 < parseInt(iCount.congestion_type) && parseInt(iCount.congestion_type) < 3) {
      temp = "busy";
   } else {
      if(parseInt(iCount.pickup_type) > 1 && parseInt(iCount.pickup_type) < 3){
         temp = "walk";
      } else {
         temp = "easy";
      }
   }

   return temp;
}

const congestionDecision2 = async (iCount) => {
   let temp = "easy";
   if (0 < parseInt(iCount.congestion_type) && parseInt(iCount.congestion_type) < 2) {
      temp = "normal";
   } else if (1 < parseInt(iCount.congestion_type) && parseInt(iCount.congestion_type) < 3) {
      temp = "busy";
   } else if (2 < parseInt(iCount.congestion_type) && parseInt(iCount.congestion_type) < 4) {
      temp = "walk";
   }

   return temp;
}

const getOperationTime = async (sData,sIndex,aIndex,gIndex) => {
   let temp = "none";
   for await (let iCount of sData) {
      console.log("getOperationTime",iCount);
      const iStartTime = iCount.opening_time.substring(0, 2);
      const iEndTime = iCount.closing_time.substring(0, 2);
      if(gIndex.toString() === iCount.day_of_week.toString()){
         if(parseInt(aIndex) <= parseInt(iEndTime)){
            if(parseInt(sIndex) >= parseInt(iStartTime)){
               temp = await congestionDecision(iCount);
            }
         } else {
            if(parseInt(sIndex) <= parseInt(iEndTime)){
               temp = await congestionDecision(iCount);
            }
         }
      }
   }

   return temp;
}

const loopChartDataV2 = async (kIndex,sIndex,aIndex,xIndex,nIndex) => {
   let oResult = [];
   for await (let iCount of asyncGenerator2(sIndex,aIndex)) {
      let userChart;
      let sDay = moment().add(-iCount, 'days').format('YYYY-MM-DD');
      let temp = {};
      if(kIndex === "wm_adver_event"){
         userChart = await Store.adverEventChartCommercial(xIndex,sDay,nIndex);
         userChart = userChart[0];
         temp.name = "메인 배너광고"
      } else if (kIndex === "wm_adver_product_popular") {
         userChart = await Store.adverProductPopularChartCommercial(xIndex,sDay,nIndex);
         userChart = userChart[0];
         temp.name = "핫메뉴 광고"
      } else if (kIndex === "wm_adver_coupon") {
         userChart = await Store.adverCouponChartCommercial(xIndex,sDay,nIndex);
         userChart = userChart[0];
         temp.name = "내 주변 쿠폰 광고"
      } else if (kIndex === "wm_adver_product_throo_only") {
         userChart = await Store.adverProductThroo_onlyChartCommercial(xIndex,sDay,nIndex);
         userChart = userChart[0];
         temp.name = "스루 온리 광고"
      } else if (kIndex === "wm_adver_store") {
         userChart = await Store.adverStoreChartCommercial(xIndex,sDay,nIndex);
         userChart = userChart[0];
         temp.name = "신규 입점 광고"
      }
      temp.date = sDay;
      temp.scales = 0;
      if(userChart !== undefined){
         if(userChart.sNm !== undefined && userChart.sNm !== null && parseInt(userChart.sNm) > 0 ){
            temp.scales = parseInt(userChart.sNm);
         }
      }
      oResult.push(temp);
   }

   return oResult;
}

const getOperationTimeEveryDay = async (sData,sIndex,aIndex) => {
   let temp = "none";
   for await (let iCount of sData) {
      console.log("getOperationTimeEveryDay",iCount);
      const iStartTime = iCount.opening_time.substring(0, 2);
      const iEndTime = iCount.closing_time.substring(0, 2);
      if(parseInt(aIndex) <= parseInt(iEndTime)){
         if(parseInt(sIndex) >= parseInt(iStartTime)){
            temp = await congestionDecision(iCount);
         }
      } else {
         if(parseInt(sIndex) <= parseInt(iEndTime)){
            temp = await congestionDecision(iCount);
         }
      }
   }

   return temp;
}

const getOperationTime2 = async (sData,sIndex,aIndex,gIndex) => {
   let temp = "none";
   for await (let iCount of sData) {
      console.log("getOperationTime2",iCount);
      const iStartTime = iCount.opening_time.substring(0, 2);
      const iEndTime = iCount.closing_time.substring(0, 2);
      if(gIndex.toString() === iCount.day_of_week.toString()){
         if(parseInt(aIndex) <= parseInt(iEndTime)){
            if(parseInt(sIndex) >= parseInt(iStartTime)){
               temp = await congestionDecision2(iCount);
            }
         } else {
            if(parseInt(sIndex) <= parseInt(iEndTime)){
               temp = await congestionDecision2(iCount);
            }
         }
      }
   }

   return temp;
}

const bannerCommercialDataChart = async (paramId,storeId,sIndex,endDate) => {
   let xConfigList = [];
   let oResult = [];
   let iResult = [];

   for await (let iCount of asyncGenerator2(30,0)) {
      let userChart;
      let sDay = moment(endDate).add(-iCount, 'days').format('YYYY-MM-DD');
      let temp = {
         name: "클릭수",
         date: sDay,
         scales: 0,
      };
      if(sIndex === "banner"){
         userChart = await Store.adverEventChartCommercialClicked(storeId,sDay,parseInt(paramId));
      } else if (sIndex === "coupon"){
         userChart = await Store.adverCouponChartCommercialClicked(storeId,sDay,parseInt(paramId));
      } else if (sIndex === "throoOnly"){
         userChart = await Store.adverProductThroo_onlyChartCommercialClicked(storeId,sDay,parseInt(paramId));
      } else if (sIndex === "new"){
         userChart = await Store.adverStoreChartCommercialClicked(storeId,sDay,parseInt(paramId));
      } else if (sIndex === "hot"){
         userChart = await Store.adverProductPopularChartCommercialClicked(storeId,sDay,parseInt(paramId));
      }
      userChart = userChart[0];
      if(userChart !== undefined){
         if(userChart.sNm !== undefined && userChart.sNm !== null && parseInt(userChart.sNm) > 0 ){
            temp.scales = parseInt(userChart.sNm);
         }
      }
      oResult.push(temp);
   }
   xConfigList = xConfigList.concat(oResult);
  
   for await (let iCount of asyncGenerator2(30,0)) {
      let userChart;
      let sDay = moment(endDate).add(-iCount, 'days').format('YYYY-MM-DD');
      let temp = {
         name: "노출수",
         date: sDay,
         scales: 0,
      };
      if(sIndex === "banner"){
         userChart = await Store.adverEventChartCommercial(storeId,sDay,parseInt(paramId));
      } else if (sIndex === "coupon"){
         userChart = await Store.adverCouponChartCommercial(storeId,sDay,parseInt(paramId));
      } else if (sIndex === "throoOnly"){
         userChart = await Store.adverProductThroo_onlyChartCommercial(storeId,sDay,parseInt(paramId));
      } else if (sIndex === "new"){
         userChart = await Store.adverStoreChartCommercial(storeId,sDay,parseInt(paramId));
      } else if (sIndex === "hot"){
         userChart = await Store.adverProductPopularChartCommercial(storeId,sDay,parseInt(paramId));
      }
      userChart = userChart[0];
      if(userChart !== undefined){
         if(userChart.sNm !== undefined && userChart.sNm !== null && parseInt(userChart.sNm) > 0 ){
            temp.scales = parseInt(userChart.sNm);
         }
      }
      iResult.push(temp);
   }
   xConfigList = xConfigList.concat(iResult);

   return xConfigList;
}

const makeValuationChart = async (adverEvent,adverCoupon,adverProductThrooOnly,adverStore,adverProductPopular,type,storeId) => {
   let xConfigList = [];
   let tempCommercialList = []; 

   if(adverEvent.length > 0){
      let temp = {
         id: adverEvent[0].adver_event_id,
         key: "wm_adver_event"
      }
      tempCommercialList.push(temp);
   }
   if(adverCoupon.length > 0){
      let temp = {
         id: adverCoupon[0].adver_coupon_id,
         key: "wm_adver_coupon"
      }
      tempCommercialList.push(temp);
   }
   if(adverProductThrooOnly.length > 0){
      let temp = {
         id: adverProductThrooOnly[0].adver_product_throo_only_id,
         key: "wm_adver_product_throo_only"
      }
      tempCommercialList.push(temp);
   } 
   if(adverStore.length > 0){
      let temp = {
         id: adverStore[0].adver_store_id,
         key: "wm_adver_store"
      }
      tempCommercialList.push(temp);
   } 
   if(adverProductPopular.length > 0){
      let temp = {
         id: adverProductPopular[0].adver_product_popular_id,
         key: "wm_adver_product_popular"
      }
      tempCommercialList.push(temp);
   } 
   if(tempCommercialList.length > 0){
      for await (const iterator of tempCommercialList) {
         if(iterator.key === "wm_adver_coupon"){
            const wm_adver_coupon = await loopChartDataV2("wm_adver_coupon",type === "current" ? 7 : 30,0,parseInt(storeId),parseInt(iterator.id));
            xConfigList = xConfigList.concat(wm_adver_coupon);
         } else if (iterator.key === "wm_adver_product_throo_only") {
            const wm_adver_product_throo_only = await loopChartDataV2("wm_adver_product_throo_only",type === "current" ? 7 : 30,0,parseInt(storeId),parseInt(iterator.id));
            xConfigList = xConfigList.concat(wm_adver_product_throo_only);
         } else if (iterator.key === "wm_adver_store") {
            const wm_adver_store = await loopChartDataV2("wm_adver_store",type === "current" ? 7 : 30,0,parseInt(storeId),parseInt(iterator.id));
            xConfigList = xConfigList.concat(wm_adver_store);
         } else if (iterator.key === "wm_adver_product_popular") {
            const wm_adver_product_popular = await loopChartDataV2("wm_adver_product_popular",type === "current" ? 7 : 30,0,parseInt(storeId),parseInt(iterator.id));
            xConfigList = xConfigList.concat(wm_adver_product_popular);
         } else if (iterator.key === "wm_adver_event") {
            const wm_adver_event = await loopChartDataV2("wm_adver_event",type === "current" ? 7 : 30,0,parseInt(storeId),parseInt(iterator.id));
            xConfigList = xConfigList.concat(wm_adver_event);
         }
      }
   }
   return xConfigList;
}

const getOperationTimeEveryDay2 = async (sData,sIndex,aIndex) => {
   let temp = "none";
   for await (let iCount of sData) {
      console.log("iCount",iCount);
      const iStartTime = iCount.opening_time.substring(0, 2);
      const iEndTime = iCount.closing_time.substring(0, 2);
      if(parseInt(aIndex) <= parseInt(iEndTime)){
         if(parseInt(sIndex) >= parseInt(iStartTime)){
            temp = await congestionDecision2(iCount);
         }
      } else {
         if(parseInt(sIndex) <= parseInt(iEndTime)){
            temp = await congestionDecision2(iCount);
         }
      }
   }

   return temp;
}


// The admin controller.
var StoreController = {}

StoreController.index = function (req, res) {
   res.status(200).json({ message: 'Welcome to the store area !' });
}


StoreController.editBannerCommercial = async (req, res) => {
   const iUserId = req.user.user_id;
   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
   } else {
      let sResult = false;
      let process1 = false;

      try {
         const storeId = req.body.store_id; 
         const imgUrl = req.body.img_url; 
         const title = req.body.title; 
         const subTitle = req.body.subTitle; 
         const eventId = req.body.eventId; 
         const commercialId = req.body.commercialId; 
         
         const checkEventId = await Store.checkCommercialEventId(parseInt(storeId),parseInt(commercialId));
         if(checkEventId.length > 0){
            if(eventId.toString() === checkEventId[0].event_id.toString()){
               process1 = true;
            }
         }
         
         if(process1){
            const result = await Store.editCommercialEventId(parseInt(eventId),title,subTitle,imgUrl);
            if(result !== undefined){
               sResult = true;
            }
         }
      } catch (error) {
         console.log("editBannerCommercial error",error);
      }

      res.status(200).json(sResult);
   }
}

StoreController.throoManagerCommercialChart = async (req, res) => {
   let xConfigList = [];
   let result = [];
   let adverEvent = [];
   let adverProductPopular = [];
   let adverCoupon = [];
   let adverProductThrooOnly = [];
   let adverStore = [];
   let adverId = null;
   let endDate = null;

   try {
      const today = moment().format("YYYY-MM-DD");
      const storeId = req.body.store_id;
      const type = req.body.type;

      if(req.body.adverId !== undefined && req.body.adverId !== null){
         adverId = req.body.adverId;
      }
      if(req.body.endDate !== undefined && req.body.endDate !== null){
         endDate = req.body.endDate;
      }

      if(type === "current"){
         adverEvent = await Store.getAdverEvent(parseInt(storeId),today);
         adverProductPopular = await Store.getAdverProductPopular(parseInt(storeId),today);
         adverCoupon = await Store.getAdverCoupon(parseInt(storeId),today);
         adverProductThrooOnly = await Store.getAdverProductThrooOnly(parseInt(storeId),today);
         adverStore = await Store.getAdverStore(parseInt(storeId),today);
         result = await makeValuationChart(adverEvent,adverCoupon,adverProductThrooOnly,adverStore,adverProductPopular,type,storeId);
         xConfigList = result;
      } else if (type === "long"){
         adverEvent = await Store.getAdverEventByMonth(parseInt(storeId));
         adverProductPopular = await Store.getAdverProductPopularByMonth(parseInt(storeId));
         adverCoupon = await Store.getAdverCouponByMonth(parseInt(storeId));
         adverProductThrooOnly = await Store.getAdverProductThrooOnlyByMonth(parseInt(storeId));
         adverStore = await Store.getAdverStoreByMonth(parseInt(storeId));
         result = await makeValuationChart(adverEvent,adverCoupon,adverProductThrooOnly,adverStore,adverProductPopular,type,storeId);
         xConfigList = result;
      } else if (type === "banner"){
         result = await bannerCommercialDataChart(adverId,parseInt(storeId),type,endDate);
         xConfigList = result;
      } else if (type === "coupon"){
         result = await bannerCommercialDataChart(adverId,parseInt(storeId),type,endDate);
         xConfigList = result;
      } else if (type === "throoOnly"){
         result = await bannerCommercialDataChart(adverId,parseInt(storeId),type,endDate);
         xConfigList = result;
      } else if (type === "new"){
         result = await bannerCommercialDataChart(adverId,parseInt(storeId),type,endDate);
         xConfigList = result;
      } else if (type === "hot"){
         result = await bannerCommercialDataChart(adverId,parseInt(storeId),type,endDate);
         xConfigList = result;
      }
      
   } catch (error) {
      console.log("throoManagerCommercialChart error",error);
   }
   
   res.status(200).json(xConfigList);
}

StoreController.getCommercialThrooOnlyList = async (req, res) => {
   const iUserId = req.user.user_id;
   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
   } else {
      let tempThrooOnlyList = [];
      
      try {
         const storeId = req.params.store_id;
         const storeProductList = await Store.getSoreCommercialThrooOnlyListWithImg(parseInt(storeId));
         if(storeProductList.length > 0){
            for await (const iterator of storeProductList) {
               let tempPrice = 0;
               if(iterator.base_price !== undefined && iterator.base_price !== null && iterator.org_price !== undefined && iterator.org_price !== null){
                  if(iterator.base_price.toString().trim() === "" || iterator.org_price.toString().trim() === ""){
                     tempPrice = 0;
                  } else  {
                     tempPrice = Math.round(parseFloat(100 - (iterator.base_price / iterator.org_price * 100)));
                  }
               }
      
               let temp = {
                  id: iterator.product_id,
                  name: iterator.name,
                  basePrice: convertToKRW(parseInt(iterator.base_price), false).toString() + "원",
                  orgPrice: convertToKRW(parseInt(iterator.org_price), false).toString() + "원",
                  discount: tempPrice,
                  imgPath: (iterator.url_path !== undefined && iterator.url_path !== null && iterator.url_path !== "") ? iterator.url_path : "https://api-stg.ivid.kr/img/no-image-new.png"
               }
               tempThrooOnlyList.push(temp);
            }
         }
      } catch (error) {
         console.log("getCommercialThrooOnlyList error",error);
      }
      
      res.status(200).json(tempThrooOnlyList);
   }
}

StoreController.getCommercialStoreDetailList = async (req, res) => {
   const iUserId = req.user.user_id;
   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
   } else {
      let iResult = [];
      let data1 = {};
      let data2 = { 
         name: "훌리오 강남점", 
         order: "5", 
         parking: "20", 
         image: "https://prd-throo-store-product.s3.amazonaws.com/store-id-0000005/julio_logo-1024.jpg" 
      };
      let data3 = { 
         name: "오스틴 강남점",
         order: "15", 
         parking: "10", 
         image: "https://prd-throo-store-product.s3.amazonaws.com/store-id-0000006/austin_logo-1024.jpg" 
      }
   
      try {
         const storeId = req.params.store_id;
         const oResult = await Store.getSoreCommercialStoreDetail(parseInt(storeId));
         const eResult = await Store.getCommercialOrderTime(parseInt(storeId));
         if(oResult.length > 0 && eResult.length > 0){
            let temp = "";
            let tempOrderTime = "";
   
            for await (const iterator of oResult) {
               if(temp === ""){
                  if(iterator.url_path !== undefined && iterator.url_path !== null && iterator.url_path !== ""){
                     temp = iterator.url_path;
                  }
               }
            }
            for await (const iterator of eResult) {
               if(tempOrderTime === ""){
                  if(iterator.drive !== undefined && iterator.drive !== null){
                     tempOrderTime = iterator.drive;
                  }
                  if(iterator.walking !== undefined && iterator.walking !== null){
                     tempOrderTime = iterator.walking;
                  }
               }
            }
            console.log("tempOrderTime",tempOrderTime);
   
            data1.name = oResult[0].store_name;
            data1.parking = oResult[0].parking_time;
            data1.order = tempOrderTime;
            data1.image = temp !== "" ? temp : "https://api-stg.ivid.kr/img/no-image-new.png";
   
         }
   
         iResult.push(data1,data2,data3);
   
      } catch (error) {
         console.log("getCommercialStoreDetailList error",error);
      }
   
      res.status(200).json(iResult);
   }
}

StoreController.getCommercialProductList = async (req, res) => {
   const iUserId = req.user.user_id;
   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
   } else {
      let tempProductList = [];
   
      try {
         const storeId = req.params.store_id;
         const storeProductList = await Store.getSoreCommercialProductListWithImg(parseInt(storeId));
         if(storeProductList.length > 0){
            for await (const iterator of storeProductList) {
               let tempPrice = 0;
               if(iterator.base_price !== undefined && iterator.base_price !== null && iterator.org_price !== undefined && iterator.org_price !== null){
                  if(iterator.base_price.toString().trim() === "" || iterator.org_price.toString().trim() === ""){
                     tempPrice = 0;
                  } else  {
                     tempPrice = Math.round(parseFloat(100 - (iterator.base_price / iterator.org_price * 100)));
                  }
               }
   
               let temp = {
                  id: iterator.product_id,
                  name: iterator.name,
                  basePrice: convertToKRW(parseInt(iterator.base_price), false).toString() + "원",
                  orgPrice: convertToKRW(parseInt(iterator.org_price), false).toString() + "원",
                  discount: tempPrice,
                  imgPath: (iterator.url_path !== undefined && iterator.url_path !== null && iterator.url_path !== "") ? iterator.url_path : "https://api-stg.ivid.kr/img/no-image-new.png"
               }
               tempProductList.push(temp);
            }
         }
      } catch (error) {
         console.log("getCommercialProductList error",error);
      }
   
      res.status(200).json(tempProductList);
   }
}

StoreController.getCommercialCouponList = async (req, res) => {
   const iUserId = req.user.user_id;
   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
   } else {
      let tempCouponList = [];
   
      try {
         const storeId = req.params.store_id;
         const result = await Store.storeCouponList(parseInt(storeId));
         if(result.length > 0){
            for await (const iterator of result) {
                  let temp = {};
                  temp.id = iterator.coupon_id;
                  temp.name = iterator.name;
                  temp.couponCount = iterator.count_limit;
                  temp.fromDate = moment(iterator.start_date).format("YYYY-MM-DD");
                  temp.toDate = moment(iterator.end_date).format("YYYY-MM-DD");
   
                  const is_before = moment().isBefore(temp.toDate);
                  console.log("is_before",is_before);
                  console.log("temp.toDate",temp.toDate);
                  console.log("today",moment());
                  if(is_before){
                     temp.expired = false;
                  } else {
                     temp.expired = true;
                  }
   
                  if(parseInt(iterator.requirement) > 0){
                     temp.limitAmount = parseInt(iterator.requirement);
                  } else {
                     temp.limitAmount = 0;
                  }
   
                  if(parseInt(iterator.type_id) > 0){
                     temp.type = "percent";
                     if(parseInt(iterator.percent) > 0){
                        temp.percent = parseInt(iterator.percent);
                     } else {
                        temp.percent = 0;
                     }
                     if(iterator.max_discount !== undefined  && iterator.max_discount !== null && parseInt(iterator.max_discount) > 0){
                        temp.maxlimitAmount = parseInt(iterator.max_discount);
                     } else {
                        temp.maxlimitAmount = 0;
                     }
                  } else {
                     temp.type = "amount";
                     if(parseInt(iterator.partner_discount) > 0){
                        temp.amount = parseInt(iterator.partner_discount);
                     } else {
                        temp.amount = 0;
                     }
                  }
                  
   
                  const countNm = await Store.couponUserDownload(parseInt(iterator.coupon_id));
                  if(countNm.length > 0){
                     temp.userCount = countNm[0].nm
                  } else {
                     temp.userCount = 0;
                  }
   
                  tempCouponList.push(temp);
            }
         }
      } catch (error) {
         console.log("getCommercialCouponList error",error);
      }
   
      res.status(200).json(tempCouponList);
   }
}

StoreController.getCommercialList = async (req, res) => {
   const iUserId = req.user.user_id;
   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
   } else {
      let tempCommercialList = [];
      let sResult = {
         resultCd : "9999",
         payList: [],
         chartList: [],
      }
      
      try {
         const storeId = req.body.store_id; 
         const fromData = moment(req.body.fromData).format("YYYY-MM-DD"); 
         const toData = moment(req.body.toData).format("YYYY-MM-DD"); 
         const result = await Store.getCommercialPointList(parseInt(storeId),fromData,toData);
         if(result.length > 0){
            for await (const iterator of result) {
               let temp = {};
               temp.key = iterator.store_point_id;
               temp.date = moment(iterator.created_at).format("YYYY-MM-DD");
               temp.amount = 0;
               temp.discount = 0;
               temp.cartAmount = 0;
               temp.payment = 0;
               
               if(iterator.type.toString() === "1"){
                  temp.type = "무상 포인트 지급";
               } else if(iterator.type.toString() === "2"){
                  temp.type = "포인트 충전";
                  temp.amount = parseInt(iterator.points);
                  if(iterator.total_amount_incl !== undefined && iterator.total_amount_incl !== null){
                     temp.payment = convertToKRW(parseInt(iterator.total_amount_incl), false).toString() + "원";;
                  } else {
                     temp.payment = "0" + "원";;
                  }
               } else if(iterator.type.toString() === "3"){
                  temp.type = "무상 포인트 사용";
                  temp.amount = parseInt(iterator.points);
                  if(iterator.discount_amount !== undefined && iterator.discount_amount !== null){
                     temp.discount = convertToKRW(parseInt(iterator.discount_amount), false).toString() + "원";;
                  } else {
                     temp.discount = "0" + "원";;
                  }
                  if(iterator.total_amount_org !== undefined && iterator.total_amount_org !== null){
                     temp.cartAmount = convertToKRW(parseInt(iterator.total_amount_org), false).toString() + "원";;
                  } else {
                     temp.cartAmount = "0" + "원";;
                  }
               } else {
                  temp.type = "광고 구매";
                  if(iterator.points !== undefined && iterator.points !== null){
                     temp.amount = convertToKRW(parseInt(iterator.points), false).toString() + "원";
                  } else {
                     temp.amount = "0" + "원";;
                  }
                  if(iterator.discount_amount !== undefined && iterator.discount_amount !== null){
                     temp.discount = convertToKRW(parseInt(iterator.discount_amount), false).toString() + "원";;
                  } else {
                     temp.discount = "0" + "원";;
                  }
                  if(iterator.total_amount_org !== undefined && iterator.total_amount_org !== null){
                     temp.cartAmount = convertToKRW(parseInt(iterator.total_amount_org), false).toString() + "원";;
                  } else {
                     temp.cartAmount = "0" + "원";;
                  }
                  if(iterator.total_amount_incl !== undefined && iterator.total_amount_incl !== null){
                     temp.payment = convertToKRW(parseInt(iterator.total_amount_incl), false).toString() + "원";;
                  } else {
                     temp.payment = "0" + "원";;
                  }
               }
               sResult.payList.push(temp);
            }
            sResult.resultCd = "0000";
         }

         const adverEvent = await Store.getAdverEventByMonth(parseInt(storeId));
         const adverProductPopular = await Store.getAdverProductPopularByMonth(parseInt(storeId));
         const adverCoupon = await Store.getAdverCouponByMonth(parseInt(storeId));
         const adverProductThrooOnly = await Store.getAdverProductThrooOnlyByMonth(parseInt(storeId));
         const adverStore = await Store.getAdverStoreByMonth(parseInt(storeId));
         if(adverEvent.length > 0){
            let temp = {
               id: adverEvent[0].adver_event_id,
               key: "wm_adver_event"
            }
            tempCommercialList.push(temp);
         }
         if(adverCoupon.length > 0){
            let temp = {
               id: adverCoupon[0].adver_coupon_id,
               key: "wm_adver_coupon"
            }
            tempCommercialList.push(temp);
         }
         if(adverProductThrooOnly.length > 0){
            let temp = {
               id: adverProductThrooOnly[0].adver_product_throo_only_id,
               key: "wm_adver_product_throo_only"
            }
            tempCommercialList.push(temp);
         }
         if(adverStore.length > 0){
            let temp = {
               id: adverStore[0].adver_store_id,
               key: "wm_adver_store"
            }
            tempCommercialList.push(temp);
         }
         if(adverProductPopular.length > 0){
            let temp = {
               id: adverProductPopular[0].adver_product_popular_id,
               key: "wm_adver_product_popular"
            }
            tempCommercialList.push(temp);
         }
         if(tempCommercialList.length > 0){
            for await (const iterator of tempCommercialList) {
               if(iterator.key === "wm_adver_coupon"){
                  const wm_adver_coupon = await loopChartDataV2("wm_adver_coupon",30,0,parseInt(storeId),parseInt(iterator.id));
                  sResult.chartList = sResult.chartList.concat(wm_adver_coupon);
               } else if (iterator.key === "wm_adver_product_throo_only") {
                  const wm_adver_product_throo_only = await loopChartDataV2("wm_adver_product_throo_only",30,0,parseInt(storeId),parseInt(iterator.id));
                  sResult.chartList = sResult.chartList.concat(wm_adver_product_throo_only);
               } else if (iterator.key === "wm_adver_store") {
                  const wm_adver_store = await loopChartDataV2("wm_adver_store",30,0,parseInt(storeId),parseInt(iterator.id));
                  sResult.chartList = sResult.chartList.concat(wm_adver_store);
               } else if (iterator.key === "wm_adver_product_popular") {
                  const wm_adver_product_popular = await loopChartDataV2("wm_adver_product_popular",30,0,parseInt(storeId),parseInt(iterator.id));
                  sResult.chartList = sResult.chartList.concat(wm_adver_product_popular);
               } else if (iterator.key === "wm_adver_event") {
                  const wm_adver_event = await loopChartDataV2("wm_adver_event",30,0,parseInt(storeId),parseInt(iterator.id));
                  sResult.chartList = sResult.chartList.concat(wm_adver_event);
               }
               sResult.resultCd = "0000";
            }
         }
      } catch (error) {
         console.log("getCommercialPointList error",error);
      }

      res.status(200).json(sResult);
   }
}

StoreController.chargedPointFirstStep = async (req, res) => {
   const iUserId = req.user.user_id;
   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
   } else {
      let sResult = {
         resultCd : "9999",
         orderId: 0,
         iPrice: 0,
      }
      let process1 = false;
      let merchantId = "";
      let merchantPhone = "";
      let uuid = uuidv1();
      let desc = "";
      let orderNr = "";
      let productNm = "";

      try {
         const storeId = req.body.store_id;
         const iPrice = req.body.iPrice;
         const osInfo = req.body.osInfo;
         
         if(storeId !== undefined && storeId !== null && iPrice !== undefined && iPrice !== null && osInfo !== undefined && osInfo !== null){
            const getStoreInfomation = await Store.getBasicInfomationCommercial(parseInt(storeId));
            if(getStoreInfomation.length > 0){
               merchantId = getStoreInfomation[0].merchant_id;
               merchantPhone = getStoreInfomation[0].phone_number;
               orderNr = merchantId + (Math.random() * (10 - 1)) + 1;
               desc = "스토어아이디" + storeId + "광고포인트 충전 " + iPrice + "원";
               productNm = "광고 포인트" + convertToKRW(parseFloat(iPrice), true) + "원 충전";
               process1 = true;
            }

            if(process1){
               const oData = {
                  merchantId,
                  uuid,
                  storeId,
                  iPrice,
                  orderNr,
                  merchantPhone,
                  osInfo,
                  productNm,
               }
               const result = await Store.chargedPointFirstStep(oData);
               if(result.resultCd === "0000"){
                  sResult.resultCd = "0000";
                  sResult.orderId = result.resultId;
                  sResult.iPrice = iPrice;
               }
            }
         }

      } catch (error) {
         console.log("chargedPointFirstStep error",error);
      }

      res.status(200).json(sResult);
   }
}

StoreController.commercialPayFirstStep = async (req, res) => {
   const iUserId = req.user.user_id;
   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
   } else {
      let sResult = {
         resultCd : "9999",
         orderId: 0,
         iPrice: 0,
      }
      let process1 = false;
      let process2 = false;
      let iAmount = 0;

      try {
         const storeId = req.body.store_id;
         const commercialList = req.body.commercialList;
         const sImg = req.body.sImg;
         const sImgTitle = req.body.sImgTitle;
         const sImgSubTitle = req.body.sImgSubTitle;
         const couponId = req.body.couponId;
         const throoOnlyId = req.body.throoOnlyId;
         const hotMenuId = req.body.hotMenuId;
         const remainAmount = req.body.remainAmount;
         const totalAmount = req.body.totalAmount;
         const paymentAmount = req.body.paymentAmount;
         const osInfo = req.body.osInfo;
         if(storeId !== undefined && storeId !== null && commercialList !== undefined && commercialList !== null && commercialList.length > 0 
            && sImg !== undefined && sImg !== null && couponId !== undefined && couponId !== null && throoOnlyId !== undefined && throoOnlyId !== null
            && hotMenuId !== undefined && hotMenuId !== null && remainAmount !== undefined && remainAmount !== null && totalAmount !== undefined && totalAmount !== null
            && paymentAmount !== undefined && paymentAmount !== null && osInfo !== undefined && osInfo !== null && sImgTitle !== undefined && sImgTitle !== null && sImgSubTitle !== undefined && sImgSubTitle !== null
         ) {

            let iResult = {
               uuid: uuidv1(),
               storeId,
               cartAmount: totalAmount,
               pointAmount: remainAmount,
               payAmount: paymentAmount,
               osInfo,
               commercialList,
               merchantPhone: "",
               productNm: "",
               merchantId: "",
               orderNr: "",
               storeNm: "",
               desc: "",
               itemCount: 0,
               iLat: 0,
               iLng: 0,
               sImg: sImg.url_path,
               sImgTitle: sImgTitle,
               sImgSubTitle: sImgSubTitle,
               couponId,
               throoOnlyId,
               hotMenuId
            }

            if(commercialList.length > 0){
               iResult.itemCount = commercialList.length;
               for await (const iterator of commercialList) {
                  if(iterator.key === "1"){
                     iAmount += 80000;
                  } else if (iterator.key === "2") {
                     iAmount += 40000;
                  } else if (iterator.key === "4") {
                     iAmount += 20000;
                  } else if (iterator.key === "5") {
                     iAmount += 30000;
                  }
               }
               iAmount = parseInt(iAmount) - parseInt(remainAmount);
               if(iAmount.toString() === paymentAmount.toString()){
                  process1 = true;
               }
            }
            
            if(process1){
               const getStoreInfomation = await Store.getBasicInfomationCommercial(parseInt(storeId));
               if(getStoreInfomation.length > 0){
                  iResult.desc = "스토어아이디" + storeId + "광고구매" + "결제금액" + paymentAmount + "원" + "광고포인트 사용 " + remainAmount + "원";
                  iResult.productNm = "광고 " + commercialList.length.toString() + "개" + convertToKRW(parseFloat(paymentAmount), true) + "원";
                  iResult.iLat = getStoreInfomation[0].lat;
                  iResult.iLng = getStoreInfomation[0].lng;
                  iResult.merchantId = getStoreInfomation[0].merchant_id;
                  iResult.merchantPhone = getStoreInfomation[0].phone_number;
                  iResult.orderNr = getStoreInfomation[0].merchant_id + (Math.random() * (10 - 1)) + 1;
                  iResult.storeNm = getStoreInfomation[0].store_name;
                  process2 = true;
               }
            }
            if(process2){
               const result = await Store.payCommercialFirstStep(iResult);
               if(result.resultCd === "0000"){
                  sResult.resultCd = "0000";
                  sResult.orderId = result.orderId;
               }
            }
         }
         
      } catch (error) {
         console.log("commercialPayFirstStep error",error);
      }

      res.status(200).json(sResult);
   }
}

StoreController.chargedPointLastStep = async (req, res) => {
   const iUserId = req.user.user_id;
   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
   } else {
      let process1 = false;
      let process2 = false;
      let process3 = false;
      let process4 = false;
      let iStateId = null;
      let iType = null;
      let iResultCd = null;
      let iAmount = null;
      let sResult = {
         resultCd: "9999",
         resultMsg: "네트워크에러입니다 나중에 다시 시도바랍니다.",
      };
      try {
         const storeId = req.body.store_id;
         const orderId = req.body.orderId;
         if(storeId !== undefined && storeId !== null && orderId !== undefined && orderId !== null){
            const getChargedPointInfomation = await Store.getChargedInfomationCommercial(orderId); 
            if(getChargedPointInfomation.length > 0){
               iStateId = getChargedPointInfomation[0].state_id;
               iResultCd = getChargedPointInfomation[0].result_cd;
               iAmount = getChargedPointInfomation[0].amount;
               iType = getChargedPointInfomation[0].type;
               process1 = true;
            }

            if(process1){
               if(iType.toString() === "2"){
                  process2 = true;
               } else {
                  sResult.resultMsg = "결제가 필요합니다.";
               }
            }

            if(process2){
               if(iResultCd.toString() === "3001"){
                  process3 = true;
               } else {
                  sResult.resultMsg = "결제가 필요합니다.";
               }
            }

            if(process3){
               if(iStateId.toString() === "14002"){
                  process4 = true;
               } else {
                  sResult.resultMsg = "결제가 필요합니다.";
               }
            }

            if(process4){
               const result = await Store.completeCommercialChargedDB(parseInt(storeId),parseInt(orderId),parseInt(iAmount));
               if(result !== undefined){
                  sResult.resultCd = "0000";
               }
            }
         }
      } catch (error) {
         console.log("chargedPointLastStep error",error);
      }

      res.status(200).json(sResult);
   }
}

StoreController.commercialPayLastStep = async (req, res) => {
   const iUserId = req.user.user_id;
   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
   } else {
      let process1 = false;
      let process2 = false;
      let process3 = false;
      let process4 = false;
      let process5 = false;
      let iStateId = null;
      let iType = null;
      let iResultCd = null;
      let commercialItem = [];
      let iAmount = 0;
      let iPay = 0;
      let iDiscount = 0;
      let sResult = {
         resultCd: "9999",
         resultMsg: "네트워크에러입니다 나중에 다시 시도바랍니다.",
      };
      try {
         const storeId = req.body.store_id;
         const orderId = req.body.orderId;
         if(storeId !== undefined && storeId !== null && orderId !== undefined && orderId !== null){
            const getChargedPointInfomation = await Store.getChargedInfomationCommercial(orderId); 
            if(getChargedPointInfomation.length > 0){
               iStateId = getChargedPointInfomation[0].state_id;
               iResultCd = getChargedPointInfomation[0].result_cd;
               iType = getChargedPointInfomation[0].type;
               iPay = getChargedPointInfomation[0].amount;
               if(getChargedPointInfomation[0].discount_amount !== undefined && getChargedPointInfomation[0].discount_amount !== null){
                  iDiscount = parseInt(getChargedPointInfomation[0].discount_amount);
               } else {
                  iDiscount = 0;
               }
               process1 = true;
            }
            
            if(process1){
               if(iResultCd.toString() === "3001"){
                  process2 = true;
               } else {
                  sResult.resultMsg = "결제가 필요합니다.";
               }
            }

            if(process2){
               if(iStateId.toString() === "14002"){
                  process3 = true;
               } else {
                  sResult.resultMsg = "결제가 필요합니다.";
               }
            }
            
            if(process3){
               const getCommercialList = await Store.getCommercialListOrdered(parseInt(orderId));
               if(getCommercialList[0].adver_coupon_id !== undefined && getCommercialList[0].adver_coupon_id !== null){
                  let temp = {
                     key: "wm_adver_coupon",
                     id: getCommercialList[0].adver_coupon_id
                  }
                  iAmount += 40000;
                  commercialItem.push(temp);
               }
               if(getCommercialList[0].adver_event_id !== undefined && getCommercialList[0].adver_event_id !== null){
                  let temp = {
                     key: "wm_adver_event",
                     id: getCommercialList[0].adver_event_id,
                     param: getCommercialList[0].event_id
                  }
                  iAmount += 80000;
                  commercialItem.push(temp);
               }
               if(getCommercialList[0].adver_product_popular_id !== undefined && getCommercialList[0].adver_product_popular_id !== null){
                  let temp = {
                     key: "wm_adver_product_popular",
                     id: getCommercialList[0].adver_product_popular_id,
                  }
                  iAmount += 30000;
                  commercialItem.push(temp);
               }
               if(getCommercialList[0].adver_product_throo_only_id !== undefined && getCommercialList[0].adver_product_throo_only_id !== null){
                  let temp = {
                     key: "wm_adver_product_throo_only",
                     id: getCommercialList[0].adver_product_throo_only_id,
                  }
                  iAmount += 0;
                  commercialItem.push(temp);
               }
               if(getCommercialList[0].adver_store_id !== undefined && getCommercialList[0].adver_store_id !== null){
                  let temp = {
                     key: "wm_adver_store",
                     id: getCommercialList[0].adver_store_id,
                  }
                  iAmount += 20000;
                  commercialItem.push(temp);
               }

               iAmount = iAmount - iDiscount;
               if(parseInt(iAmount) == parseInt(iPay)){
                  process4 = true;
               }
            }
            if(process4){
               if(commercialItem.length > 0){
                  const result = await Store.payCommercialLastStep(parseInt(storeId),parseInt(orderId),commercialItem);
                  console.log("result",result);
                  if(result !== undefined){
                     sResult.resultCd = "0000";
                  }
               }
            }
         }
         console.log("sResult",sResult);
      } catch (error) {
         console.log("chargedPointLastStep error",error);
      }

      res.status(200).json(sResult);
   }
}

StoreController.noPaymentCommercial = async (req, res) => {
   const iUserId = req.user.user_id;
   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
   } else {
      let sResult = "9999";
      let process1 = false;
      let process2 = false;

      try {
         const storeId = req.body.store_id;
         const commercialList = req.body.commercialList;
         const sImg = req.body.sImg;
         const sImgTitle = req.body.sImgTitle;
         const sImgSubTitle = req.body.sImgSubTitle;
         const couponId = req.body.couponId;
         const throoOnlyId = req.body.throoOnlyId;
         const hotMenuId = req.body.hotMenuId;
         const remainAmount = req.body.remainAmount;
         const totalAmount = req.body.totalAmount;
         const paymentAmount = req.body.paymentAmount;
         const dataType = req.body.dataType;
         const osInfo = req.body.osInfo;

         if(storeId !== undefined && storeId !== null && commercialList !== undefined && commercialList !== null && commercialList.length > 0 
            && sImg !== undefined && sImg !== null && couponId !== undefined && couponId !== null && throoOnlyId !== undefined && throoOnlyId !== null
            && hotMenuId !== undefined && hotMenuId !== null && remainAmount !== undefined && remainAmount !== null && totalAmount !== undefined && totalAmount !== null && sImgSubTitle !== undefined && sImgSubTitle !== null
            && paymentAmount !== undefined && paymentAmount !== null && dataType !== undefined && dataType !== null && osInfo !== undefined && osInfo !== null && sImgTitle !== undefined && sImgTitle !== null
         ) {
            let iResult = {
               uuid: uuidv1(),
               storeId,
               cartAmount: totalAmount,
               pointAmount: remainAmount,
               payAmount: paymentAmount,
               osInfo,
               commercialList,
               merchantPhone: "",
               productNm: "",
               merchantId: "",
               orderNr: "",
               storeNm: "",
               desc: "",
               itemCount: 0,
               iLat: 0,
               iLng: 0,
               sImg: sImg.url_path,
               sImgTitle: sImgTitle,
               sImgSubTitle: sImgSubTitle,
               couponId,
               throoOnlyId,
               hotMenuId
            }

            if(commercialList.length > 0){
               iResult.itemCount = commercialList.length;
               process1 = true;
            }

            if(process1){
               const getStoreInfomation = await Store.getBasicInfomationCommercial(parseInt(storeId));
               if(getStoreInfomation.length > 0){
                  if(dataType === "none"){
                     iResult.desc = "스토어아이디" + storeId + "광고구매";
                     iResult.productNm = "광고 " + commercialList.length.toString() + "개";
                  } else {
                     iResult.desc = "스토어아이디" + storeId + "광고구매" + "광고포인트 사용 " + remainAmount + "원";
                     iResult.productNm = "광고 " + commercialList.length.toString() + "개" + convertToKRW(parseFloat(remainAmount), true) + "원";
                  }

                  iResult.iLat = getStoreInfomation[0].lat;
                  iResult.iLng = getStoreInfomation[0].lng;
                  iResult.merchantId = getStoreInfomation[0].merchant_id;
                  iResult.merchantPhone = getStoreInfomation[0].phone_number;
                  iResult.orderNr = getStoreInfomation[0].merchant_id + (Math.random() * (10 - 1)) + 1;
                  iResult.storeNm = getStoreInfomation[0].store_name;
                  process2 = true;
               }
            }

            if(process2){
               if(dataType === "none"){
                  const result = await Store.completeNonePointCommercial(iResult); 
                  if(result === "0000"){
                     sResult = "0000";
                  }
               } else {
                  const result = await Store.completePointCommercial(iResult); 
                  if(result === "0000"){
                     sResult = "0000";
                  }
               }
            }
         }
         console.log("sResult",sResult);
      } catch (error) {
         console.log("noPaymentCommercial error",error);
      }

      res.status(200).json(sResult);
   }
}

StoreController.getCouponData = async (req, res) => {
   const iUserId = req.user.user_id;
   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
   } else {
      let sResult = [];

      try {
         const storeId = req.params.store_id;
         const result = await Store.storeCouponList(parseInt(storeId));
         if(result.length > 0){
            for await (const iterator of result) {
               let temp = {};
               temp.id = iterator.coupon_id;
               temp.name = iterator.name;
               temp.couponCount = iterator.count_limit;
               temp.fromDate = moment(iterator.start_date).format("YYYY-MM-DD");
               temp.toDate = moment(iterator.end_date).format("YYYY-MM-DD");

               if(parseInt(iterator.requirement) > 0){
                  temp.limitAmount = parseInt(iterator.requirement);
               } else {
                  temp.limitAmount = 0;
               }

               if(parseInt(iterator.type_id) > 0){
                  temp.type = "percent";
                  if(parseInt(iterator.percent) > 0){
                     temp.percent = parseInt(iterator.percent);
                  } else {
                     temp.percent = 0;
                  }
                  if(iterator.max_discount !== undefined  && iterator.max_discount !== null && parseInt(iterator.max_discount) > 0){
                     temp.maxlimitAmount = parseInt(iterator.max_discount);
                  } else {
                     temp.maxlimitAmount = 0;
                  }
               } else {
                  temp.type = "amount";
                  if(parseInt(iterator.partner_discount) > 0){
                     temp.amount = parseInt(iterator.partner_discount);
                  } else {
                     temp.amount = 0;
                  }
               }
               

               const countNm = await Store.couponUserDownload(parseInt(iterator.coupon_id));
               if(countNm.length > 0){
                  temp.userCount = countNm[0].nm
               } else {
                  temp.userCount = 0;
               }

               sResult.push(temp);
            }
         }
      } catch (error) {
         console.log("storeCouponList error",error);
      }

      res.status(200).json(sResult);
   }
}

StoreController.getChartCommercialApp = async (req, res) => {
   const iUserId = req.user.user_id;
   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
   } else {
      let tempItemList = [];
      let sResult = [];
      try {
         const storeId = req.params.store_id;
         const adverEvent = await Store.getAdverEventChartList(parseInt(storeId));
         const adverProductPopular = await Store.getAdverPopularChartList(parseInt(storeId));
         const adverCoupon = await Store.getAdverCouponChartList(parseInt(storeId));
         const adverProductThrooOnly = await Store.getAdverThrooOnlyChartList(parseInt(storeId));
         const adverStore = await Store.getAdverStoreChartList(parseInt(storeId));
         if(adverEvent.length > 0){
            for await (const iterator of adverEvent) {
               let temp = {
                  key: "wm_adver_event",
                  name: "메인 배너광고",
                  date: moment(iterator.created_at).format("YYYY-MM-DD") + "~" + moment(iterator.created_at).format("YYYY-MM-DD"),
                  uri: "https://ceo.throo.co.kr/selfmanage/commercial/app/ceo?=" + parseFloat(storeId) + "?@=" + "banner" + "?@=" + iterator.adver_event_id + "?@=" + moment(iterator.end_date).format("YYYY-MM-DD")
               };
               tempItemList.push(temp);
            }
         }
         if(adverCoupon.length > 0){
            for await (const iterator of adverCoupon) {
               let temp = {
                  key: "wm_adver_coupon",
                  name: "내 주변 쿠폰 광고",
                  date: moment(iterator.created_at).format("YYYY-MM-DD") + "~" + moment(iterator.created_at).format("YYYY-MM-DD"),
                  uri: "https://ceo.throo.co.kr/selfmanage/commercial/app/ceo?=" + parseFloat(storeId) + "?@=" + "coupon" + "?@=" + iterator.adver_coupon_id + "?@=" + moment(iterator.end_date).format("YYYY-MM-DD")
               };
               tempItemList.push(temp);
            }
         }
         if(adverProductThrooOnly.length > 0){
            for await (const iterator of adverProductThrooOnly) {
               let temp = {
                  key: "wm_adver_product_throo_only",
                  name: "스루 온리 광고",
                  date: moment(iterator.created_at).format("YYYY-MM-DD") + "~" + moment(iterator.created_at).format("YYYY-MM-DD"),
                  uri: "https://ceo.throo.co.kr/selfmanage/commercial/app/ceo?=" + parseFloat(storeId) + "?@=" + "throoOnly" + "?@=" + iterator.adver_product_throo_only_id + "?@=" + moment(iterator.end_date).format("YYYY-MM-DD")
               };
               tempItemList.push(temp);
            }
         }
         if(adverStore.length > 0){
            for await (const iterator of adverStore) {
               let temp = {
                  key: "wm_adver_store",
                  name: "신규 입점 광고",
                  date: moment(iterator.created_at).format("YYYY-MM-DD") + "~" + moment(iterator.created_at).format("YYYY-MM-DD"),
                  uri: "https://ceo.throo.co.kr/selfmanage/commercial/app/ceo?=" + parseFloat(storeId) + "?@=" + "new" + "?@=" + iterator.adver_store_id + "?@=" + moment(iterator.end_date).format("YYYY-MM-DD")
               };
               tempItemList.push(temp);
            }
         }
         if(adverProductPopular.length > 0){
            for await (const iterator of adverProductPopular) {
               let temp = {
                  key: "wm_adver_product_popular",
                  name: "핫메뉴 광고",
                  date: moment(iterator.created_at).format("YYYY-MM-DD") + "~" + moment(iterator.created_at).format("YYYY-MM-DD"),
                  uri: "https://ceo.throo.co.kr/selfmanage/commercial/app/ceo?=" + parseFloat(storeId) + "?@=" + "hot" + "?@=" + iterator.adver_product_popular_id + "?@=" + moment(iterator.end_date).format("YYYY-MM-DD")
               };
               tempItemList.push(temp);
            }
         }
         
         if(tempItemList.length > 0){
            sResult = tempItemList;
         }
      } catch (error) {
         console.log("StoreController.getChartCommercialApp fail! ====>> error:", error);
      }
   
      res.status(200).json(sResult);
   }
}

StoreController.getCommercialApp = async (req, res) => {
   const iUserId = req.user.user_id;
   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
   } else {
      let tempItemList = [];
      let sResult = {
         commercialList: [],
         remainPrice: 0,
         remainPriceWon: 0,
         remainChargedPrice: 0,
         remainChargedPriceWon: 0,
         storeType: "new",
      };

      try {
         const storeId = req.params.store_id;
         const today = moment().format("YYYY-MM-DD");
         const adverEvent = await Store.getAdverEvent(parseInt(storeId),today);
         const adverProductPopular = await Store.getAdverProductPopular(parseInt(storeId),today);
         const adverCoupon = await Store.getAdverCoupon(parseInt(storeId),today);
         const adverProductThrooOnly = await Store.getAdverProductThrooOnly(parseInt(storeId),today);
         const adverStore = await Store.getAdverStore(parseInt(storeId),today);
         const adverBanner = await Store.getAdverBanner(parseInt(storeId),today);
         const adverThrooKit = await Store.getAdverThrooKit(parseInt(storeId),today);
         if(adverEvent.length < 1){
            let temp = {
               name: "메인 배너광고",
               price: "80000",
               priceCasting: "80,000",
               date: "30일",
               id: "1",
               key: "1",
               param: "banner",
               detail1: "스루 앱 가장 처음 상단에 나타나는 메인 배너광고입니다. ",
               detail2: "스루 앱 가장 처음 상단에 나타나는 메인 배너광고입니다. 고객에게 가장 먼저 보이기 때문에 노출도가 가장 높습니다.",
               img: "https://prd-throo-store-product.s3.amazonaws.com/store-id-0001020/photo_1650965403209-1024.jpg"
            };
            tempItemList.push(temp);
         }
         if(adverCoupon.length < 1){
            let temp = {
               name: "내 주변 쿠폰 광고",
               price: "40000",
               priceCasting: "40,000",
               date: "30일",
               id: "2",
               key: "2",
               param: "coupon",
               detail1: "쿠폰을 등록한 뒤 광고를 통해 쿠폰 효과를 올려보세요.",
               detail2: "매장에 쿠폰이 등록되어 있을 경우에만 노출됩니다. 쿠폰을 등록한 뒤 광고를 통해 쿠폰 효과를 올려보세요.",
               img: "https://prd-throo-store-product.s3.ap-northeast-2.amazonaws.com/store-id-0001020/photo_1650965413536-1024.jpg"
            };
            tempItemList.push(temp);
         }
         if(adverProductThrooOnly.length < 1){
            let temp = {
               name: "스루 온리 광고",
               price: "0",
               priceCasting: "0",
               date: "30일",
               id: "3",
               key: "3",
               param: "only",
               detail1: "스루에서만 구매할 수 있는 상품을 등록하셨다면 이용가능한 광고입니다",
               detail2: "스루 온리 광고는 한시적으로 무료이며 최상단에 노출됩니다. 스루에서만 구매할 수 있는 상품을 등록하셨다면 광고가 적용되어 더 많은 고객에게 상품이 노출됩니다. 적극 활용해 보세요!",
               img: "https://prd-throo-store-product.s3.ap-northeast-2.amazonaws.com/store-id-0001020/photo_1650965423737-1024.jpg"
            };
            tempItemList.push(temp);
         }
         if(adverStore.length < 1){
            let temp = {
               name: "신규 입점 광고",
               price: "20000",
               priceCasting: "20,000",
               date: "30일",
               id: "4",
               key: "4",
               param: "new",
               detail1: "스루 영업 시작을 더 많은 고객에게 알려보세요.",
               detail2: "입점일 기준 6개월 이내의 신규매장을 나타내는 광고입니다. 스루 영업 시작을 더 많은 고객에게 알려보세요.",
               img: "https://prd-throo-store-product.s3.ap-northeast-2.amazonaws.com/store-id-0001020/photo_1650965429181-1024.jpg"
            };
            tempItemList.push(temp);
         }
         if(adverProductPopular.length < 1){
            let temp = {
               name: "핫메뉴 광고",
               price: "30000",
               priceCasting: "30,000",
               date: "30일",
               id: "5",
               key: "5",
               param: "hot",
               detail1: "우리 매장의 인기상품을 고객에게 알릴 수 있습니다.",
               detail2: "우리 매장의 인기 상품을 광고해 보세요. 우리 매장의 인기상품을 고객에게 알릴 수 있습니다.",
               img: "https://prd-throo-store-product.s3.ap-northeast-2.amazonaws.com/store-id-0001020/photo_1650965515839-1024.jpg"
            };
            tempItemList.push(temp);
         }
         if(adverBanner.length < 1){
            let temp = {
               name: "야외 광고 배너",
               price: "30000",
               priceCasting: "30,000",
               date: "-",
               id: "6",
               key: "6",
               param: "picket",
               detail1: "오프라인 광고물 배너, 물통, 폴대4개, 메인파이프 사이즈 1800 x 600mm 입니다",
               detail2: "우리 매장의 인기 상품을 광고해 보세요. 우리 매장의 인기상품을 고객에게 알릴 수 있습니다.",
               img: "https://prd-throo-store-product.s3.ap-northeast-2.amazonaws.com/store-id-0001020/photo_1652349677783-1024.jpg"
            };
            tempItemList.push(temp);
         }
         if(adverThrooKit.length < 1){
            let temp = {
               name: "스루키트",
               price: "0",
               priceCasting: "0",
               date: "-",
               id: "7",
               key: "7",
               param: "kit",
               detail1: "오프라인 광고물 a2 포스터, a3 포스터, a5 전단지, 테이블 텐트, 스티 커(매장 부착용 2종)",
               detail2: "a2 포스터, a3 포스터, a5 전단지, 테이블 텐트, 스티 커(매장 부착용 2종), 테이블 텐트도 2종 구성으로 이루어져 있습니다. 매장을 방문하는 고객에게 스루를 홍보할 수 있어요.",
               img: "https://prd-throo-store-product.s3.ap-northeast-2.amazonaws.com/store-id-0001020/photo_1652349653602-1024.jpg"
            };
            tempItemList.push(temp);
         }
         
         if(tempItemList.length > 0){
            sResult.commercialList = tempItemList;
         }
         
         const merchantPoints = await Store.getMerchantPoints(parseInt(storeId)); 
         if(merchantPoints.length > 0){
            let tempChargedAmount = 0;
            let tempFreeAmount = 0;
            let tempGift = 0;
            let tempCharged = 0;
            let tempUsedGift = 0;
            let tempUsedCharged = 0;
   
            for await (const item of merchantPoints) {
               if(item.type.toString() === "1"){
                  tempGift += item.points;
               } else if (item.type.toString() === "2") {
                  tempCharged += item.points;
               } else if (item.type.toString() === "3") {
                  tempUsedGift += Math.abs(item.points); 
               } else if (item.type.toString() === "4") {
                  tempUsedCharged += Math.abs(item.points); 
               }
            }
            
            if(parseInt(tempGift - tempUsedGift) > 0){
               tempFreeAmount = parseInt(tempGift - tempUsedGift);
            } else {
               tempFreeAmount = 0;
            }
            if(parseInt(tempCharged - tempUsedCharged) > 0){
               tempChargedAmount = parseInt(tempCharged - tempUsedCharged);
            } else {
               tempChargedAmount = 0;
            }

            sResult.remainPrice = tempFreeAmount;
            sResult.remainChargedPrice = tempChargedAmount;
            sResult.remainPriceWon = convertToKRW(parseFloat(tempFreeAmount));
            sResult.remainChargedPriceWon = convertToKRW(parseFloat(sResult.remainChargedPrice));
         }
         
         const checkNewStoreCommercial = await Store.checkNewStoreCommercial(parseInt(storeId)); 
         if(checkNewStoreCommercial !== undefined && checkNewStoreCommercial !== null){
            if(checkNewStoreCommercial[0].adver_coupon_id !== undefined && checkNewStoreCommercial[0].adver_coupon_id !== null){
               sResult.storeType = "used";
            }
            if(checkNewStoreCommercial[0].adver_event_id !== undefined && checkNewStoreCommercial[0].adver_event_id !== null){
               sResult.storeType = "used";
            }
            if(checkNewStoreCommercial[0].adver_product_popular_id !== undefined && checkNewStoreCommercial[0].adver_product_popular_id !== null){
               sResult.storeType = "used";
            }
            if(checkNewStoreCommercial[0].adver_product_throo_only_id !== undefined && checkNewStoreCommercial[0].adver_product_throo_only_id !== null){
               sResult.storeType = "used";
            }
            if(checkNewStoreCommercial[0].adver_store_id !== undefined && checkNewStoreCommercial[0].adver_store_id !== null){
               sResult.storeType = "used";
            }
         }
      } catch (error) {
         console.log("StoreController.getCommercialApp fail! ====>> error:", error);
      }
   
      res.status(200).json(sResult);
   }
}

StoreController.getCommercial = async (req, res) => {
   const iUserId = req.user.user_id;
   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
   } else {
      let tempItemList = [];
      let tempCommercialList = [];
      let sResult = {
         xConfigList: [],
         itemList: [],
         productList: [],
         couponList: [],
         throoOnlyList: [],
         commercialList: [],
         remainPrice: 0,
         totalPrice: 0,
         payedPrice: 0,
         remainPriceWon: 0,
         totalPriceWon: 0,
         payedPriceWon: 0,
      };
      let sList = [
         {
            name: "메인 배너광고",
            price: "80000",
            priceCasting: "80,000",
            date: "30일",
            id: "1",
            key: "1",
         },
         {
            name: "내 주변 쿠폰 광고",
            price: "40000",
            priceCasting: "40,000",
            date: "30일",
            id: "2",
            key: "2",
         },
         {
            name: "스루 온리 광고",
            price: "0",
            priceCasting: "0",
            date: "30일",
            id: "3",
            key: "3",
         },
         {
            name: "신규 입점 광고",
            price: "20000",
            priceCasting: "20,000",
            date: "30일",
            id: "4",
            key: "4",
         },
         {
            name: "핫메뉴 광고",
            price: "30000",
            priceCasting: "30,000",
            date: "30일",
            id: "5",
            key: "5",
         }
      ]
      try {
         const today = moment().format("YYYY-MM-DD");
         const storeId = req.params.store_id;
         const adverEvent = await Store.getAdverEvent(parseInt(storeId),today);
         const adverProductPopular = await Store.getAdverProductPopular(parseInt(storeId),today);
         const adverCoupon = await Store.getAdverCoupon(parseInt(storeId),today);
         const adverProductThrooOnly = await Store.getAdverProductThrooOnly(parseInt(storeId),today);
         const adverStore = await Store.getAdverStore(parseInt(storeId),today);
         if(adverEvent.length > 0){
            const tempLeak = await Store.adverEventDisplayCount(parseInt(storeId),parseInt(adverEvent[0].adver_event_id));
            const tempClick = await Store.adverEventClickCount(parseInt(storeId),parseInt(adverEvent[0].adver_event_id));
            const eventData = await Store.adverEventData(parseInt(adverEvent[0].event_id));
            let temp = {
               name: "메인 배너광고",
               price: "80000",
               priceCasting: "80,000",
               limit: moment(adverEvent[0].end_date).format("MM-DD") + "까지",
               id: adverEvent[0].adver_event_id,
               leak: tempLeak[0].amount,
               click: tempClick[0].amount,
               action: "집행중",
               key: "wm_adver_event",
               title: eventData[0].title,
               subTitle:  eventData[0].subtitle,
               img:  eventData[0].img_url1,
               eventId:  eventData[0].event_id,
            }
            
            tempCommercialList.push(temp);
         } else {
            let temp = {
               name: "메인 배너광고",
               price: "80000",
               priceCasting: "80,000",
               date: "30일",
               id: "1",
               key: "1",
            }
            tempItemList.push(temp);
         }
         if(adverCoupon.length > 0){
            const tempLeak = await Store.adverCouponDisplayCount(parseInt(storeId),parseInt(adverCoupon[0].adver_coupon_id));
            const tempClick = await Store.adverCouponClickCount(parseInt(storeId),parseInt(adverCoupon[0].adver_coupon_id));
            console.log("tempLeak",tempLeak);
            console.log("tempClick",tempClick);
            let temp = {
               name: "내 주변 쿠폰 광고",
               price: "40000",
               priceCasting: "40,000",
               limit: moment(adverCoupon[0].end_date).format("MM-DD") + "까지",
               id: adverCoupon[0].adver_coupon_id,
               leak: tempLeak[0].amount,
               click: tempClick[0].amount,
               action: "집행중",
               key: "wm_adver_coupon"
            }
            tempCommercialList.push(temp);
         } else {
            let temp = {
               name: "내 주변 쿠폰 광고",
               price: "40000",
               priceCasting: "40,000",
               date: "30일",
               id: "2",
               key: "2",
            }
            tempItemList.push(temp);
         }
         if(adverProductThrooOnly.length > 0){
            const tempLeak = await Store.adverProductThrooOnlyDisplayCount(parseInt(storeId),parseInt(adverProductThrooOnly[0].adver_product_throo_only_id));
            const tempClick = await Store.adverProductThrooOnlyClickCount(parseInt(storeId),parseInt(adverProductThrooOnly[0].adver_product_throo_only_id));
            console.log("tempLeak",tempLeak);
            console.log("tempClick",tempClick);
            let temp = {
               name: "스루 온리 광고",
               price: "0",
               priceCasting: "0",
               limit: moment(adverProductThrooOnly[0].end_date).format("MM-DD") + "까지",
               id: adverProductThrooOnly[0].adver_product_throo_only_id,
               leak: tempLeak[0].amount,
               click: tempClick[0].amount,
               action: "집행중",
               key: "wm_adver_product_throo_only"
            }
            tempCommercialList.push(temp);
         } else {
            let temp = {
               name: "스루 온리 광고",
               price: "0",
               priceCasting: "0",
               date: "30일",
               id: "3",
               key: "3",
            }
            tempItemList.push(temp);
         }
         if(adverStore.length > 0){
            const tempLeak = await Store.adverStoreDisplayCount(parseInt(storeId),parseInt(adverStore[0].adver_store_id));
            const tempClick = await Store.adverStoreClickCount(parseInt(storeId),parseInt(adverStore[0].adver_store_id));
            console.log("tempLeak",tempLeak);
            console.log("tempClick",tempClick);
            let temp = {
               name: "신규 입점 광고",
               price: "20000",
               priceCasting: "20,000",
               limit: moment(adverStore[0].end_date).format("MM-DD") + "까지",
               id: adverStore[0].adver_store_id,
               leak: tempLeak[0].amount,
               click: tempClick[0].amount,
               action: "집행중",
               key: "wm_adver_store"
            }
            tempCommercialList.push(temp);
         } else {
            let temp = {
               name: "신규 입점 광고",
               price: "20000",
               priceCasting: "20,000",
               date: "30일",
               id: "4",
               key: "4",
            }
            tempItemList.push(temp);
         }
         if(adverProductPopular.length > 0){
            const tempLeak = await Store.adverProductPopularDisplayCount(parseInt(storeId),parseInt(adverProductPopular[0].adver_product_popular_id));
            const tempClick = await Store.adverProductPopularClickCount(parseInt(storeId),parseInt(adverProductPopular[0].adver_product_popular_id));
            console.log("tempLeak",tempLeak);
            console.log("tempClick",tempClick);
            let temp = {
               name: "핫메뉴 광고",
               price: "30000",
               priceCasting: "30,000",
               limit: moment(adverProductPopular[0].end_date).format("MM-DD") + "까지",
               id: adverProductPopular[0].adver_product_popular_id,
               leak: tempLeak[0].amount,
               click: tempClick[0].amount,
               action: "집행중",
               key: "wm_adver_product_popular"
            }
            tempCommercialList.push(temp);
         } else {
            let temp = {
               name: "핫메뉴 광고",
               price: "30000",
               priceCasting: "30,000",
               date: "30일",
               id: "5",
               key: "5",
            }
            tempItemList.push(temp);
         }
         
         if(tempCommercialList.length > 0){
            sResult.commercialList = tempCommercialList;
            sResult.itemList = tempItemList;
         } else {
            sResult.itemList = sList;
         }

         const merchantPoints = await Store.getMerchantPoints(parseInt(storeId)); 
         if(merchantPoints.length > 0){
            let tempGift = 0;
            let tempCharged = 0;
            let tempUsedGift = 0;
            let tempUsedCharged = 0;

            for await (const item of merchantPoints) {
               if(item.type.toString() === "1"){
                  tempGift += item.points;
               } else if (item.type.toString() === "2") {
                  tempCharged += item.points;
               } else if (item.type.toString() === "3") {
                  tempUsedGift += Math.abs(item.points); 
               } else if (item.type.toString() === "4") {
                  tempUsedCharged += Math.abs(item.points); 
               }
            }
            sResult.remainPrice = (tempGift + tempCharged) - (tempUsedGift + tempUsedCharged);
            sResult.remainPriceWon = convertToKRW(parseFloat(sResult.remainPrice), true);
         }

         const storeCouponList = await Store.storeCouponList(parseInt(storeId));
         if(storeCouponList.length > 0){
            let tempCouponList = [];
            for await (const iterator of storeCouponList) {
               let temp = {
                  id: iterator.coupon_id,
                  name: iterator.name,
               }
               tempCouponList.push(temp);
            }
            sResult.couponList = tempCouponList;
         }

         const storeProductList = await Store.getSoreCommercialProductList(parseInt(storeId));
         if(storeProductList.length > 0){
            let tempProductList = [];
            for await (const iterator of storeProductList) {
               let temp = {
                  id: iterator.product_id,
                  name: iterator.name,
               }
               tempProductList.push(temp);
            }
            sResult.productList = tempProductList;
         }
         const storeThrooOnlyProductList = await Store.getSoreCommercialThrooOnlyList(parseInt(storeId));
         if(storeThrooOnlyProductList.length > 0){
            let tempThrooOnlyProductList = [];
            for await (const iterator of storeThrooOnlyProductList) {
               let temp = {
                  id: iterator.product_id,
                  name: iterator.name,
               }
               tempThrooOnlyProductList.push(temp);
            }
            sResult.throoOnlyList = tempThrooOnlyProductList;
         }
         if(tempCommercialList.length > 0){
            for await (const iterator of tempCommercialList) {
               if(iterator.key === "wm_adver_coupon"){
                  const wm_adver_coupon = await loopChartDataV2("wm_adver_coupon",7,0,parseInt(storeId),parseInt(iterator.id));
                  sResult.xConfigList = sResult.xConfigList.concat(wm_adver_coupon);
               } else if (iterator.key === "wm_adver_product_throo_only") {
                  const wm_adver_product_throo_only = await loopChartDataV2("wm_adver_product_throo_only",7,0,parseInt(storeId),parseInt(iterator.id));
                  sResult.xConfigList = sResult.xConfigList.concat(wm_adver_product_throo_only);
               } else if (iterator.key === "wm_adver_store") {
                  const wm_adver_store = await loopChartDataV2("wm_adver_store",7,0,parseInt(storeId),parseInt(iterator.id));
                  sResult.xConfigList = sResult.xConfigList.concat(wm_adver_store);
               } else if (iterator.key === "wm_adver_product_popular") {
                  const wm_adver_product_popular = await loopChartDataV2("wm_adver_product_popular",7,0,parseInt(storeId),parseInt(iterator.id));
                  sResult.xConfigList = sResult.xConfigList.concat(wm_adver_product_popular);
               } else if (iterator.key === "wm_adver_event") {
                  const wm_adver_event = await loopChartDataV2("wm_adver_event",7,0,parseInt(storeId),parseInt(iterator.id));
                  sResult.xConfigList = sResult.xConfigList.concat(wm_adver_event);
               }
            }
         }
         
      } catch (error) {
         console.log("getCommercial error",error);
      }

      res.status(200).json(sResult);
   }
}

StoreController.setPickUpZone = async (req, res) => {
   const iUserId = req.user.user_id;
   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
   } else {
      const storeId = req.body.store_id;
      const sLat = req.body.lat;
      const sLng = req.body.lng;
      const sViewPoint = req.body.viewPoint;
      
      let sResult = false;

      try {
         const toDate = moment().format("YYYY-MM-DD");
         const getAdverEvent = await Store.getAdverEvent(parseInt(storeId),toDate);
         if(getAdverEvent.length > 0){
            let param = sLat + "," + sLng + "," + storeId;
            let eventId = getAdverEvent[0].event_id;
            await Store.updateCommercialPickUpZoneData(eventId,sLat,sLng,param);
         }
         
         const result = await Store.setPickUpZone(sLat,sLng,sViewPoint,storeId);
         if(result !== undefined){
            sResult = true;
         }
      } catch (error) {
         console.log("StoreController.editParkingImage fail! ====>> error:", error);
      }
   
      res.status(200).json(sResult);
   }

}

StoreController.editParkingImage = async (req, res) => {
   const iUserId = req.user.user_id;
   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
   } else {
      const storeId = req.body.store_id;
      const imageType = req.body.imageType;
      
      let sResult = false;
      let imgData = "";

      try {
         if(imageType !== "delete"){
            imgData = req.body.imgData.url_path;
         }

         const result = await Store.updateParkingImg(imgData,storeId);
         if(result !== undefined){
            sResult = true;
         }
      } catch (error) {
         console.log("StoreController.editParkingImage fail! ====>> error:", error);
      }
   
      res.status(200).json(sResult);
   }

}

StoreController.userBusinessInfo = async (req, res) => {
   let sResult = {
      resultCd: "9999",
      groupList: [
         { key: 0, name: "미지정"}
      ],
   };
   
   try {
      const storeId = req.params.sParam;
      let result = await User.userBusinessInfo(storeId);
      if(result !== undefined && result !== null){
         if(result.length > 0){
            result = result[0];
            
            sResult.resultCd = "0000";
            sResult.address1 = "";
            sResult.address2 = "";
            sResult.store_name = "";
            sResult.bank_name = "";
            sResult.business_number = "";
            sResult.full_name = result.full_name;
            sResult.email = result.email;
            sResult.account_nm = "";
            sResult.userPhone = "";
            sResult.lock = false;
            
            if(result.status !== undefined && result.status !== null && parseInt(result.status) > 0){
               sResult.lock = true;
            }
            if(result.account_nm !== undefined && result.account_nm !== null && result.account_nm !== ""){
               let bytes = CryptoJS.AES.decrypt(result.account_nm, config.keys.secret);
               sResult.account_nm = bytes.toString(CryptoJS.enc.Utf8);
            }
            if(result.business_number !== undefined && result.business_number !== null && result.business_number !== ""){
               sResult.business_number = result.business_number;
            }
            if(result.bank_name !== undefined && result.bank_name !== null && result.bank_name !== ""){
               sResult.bank_name = result.bank_name;
            }
            if(result.store_name !== undefined && result.store_name !== null && result.store_name !== ""){
               sResult.store_name = result.store_name;
            }
            if(result.mAddress1 !== undefined && result.mAddress1 !== null && result.mAddress1 !== ""){
               sResult.address1 = result.mAddress1;
            } else if (result.sAddress1 !== undefined && result.sAddress1 !== null && result.sAddress1 !== ""){
               sResult.address1 = result.sAddress1;
            }
            if(result.mAddress2 !== undefined && result.mAddress2 !== null && result.mAddress2 !== ""){
               sResult.address2 = result.mAddress2;
            } else if (result.sAddress2 !== undefined && result.sAddress2 !== null && result.sAddress2 !== ""){
               sResult.address2 = result.sAddress2;
            }
            if(result.mPhone !== undefined && result.mPhone !== null && result.mPhone !== ""){
               sResult.userPhone = result.mPhone;
            } else if (result.sPhone !== undefined && result.sPhone !== null && result.sPhone !== ""){
               sResult.userPhone = result.sPhone;
            }
         }

         const getThrooCoperationList = await User.getThrooCoperationCompanyList();
         if(getThrooCoperationList.length > 0){
            for (const e of getThrooCoperationList) {
               let temp = {};
               temp.key = e.admin_user_id;
               temp.name = e.group_name;
               sResult.groupList.push(temp);
            }
         }
         const getThrooCoperationName = await User.getThrooCoperationCompanyName(storeId);
         if(getThrooCoperationName.length > 0){
            sResult.companyName = getThrooCoperationName[0].admin_user_id;
         }
      }
   } catch (error) {
      console.log("currentStatus fail! ====>> error:", error);
   }

   res.status(200).json(sResult);
}

StoreController.currentStatus = async (req, res) => {
   let sResult = false;
   
   try {
      const storeId = req.params.sParam;
      console.log("storeId",storeId);
      const statusStore = await Store.currentStatus(storeId);
      console.log("statusStore",statusStore);
      if(statusStore !== undefined){
         if(parseInt(statusStore[0]) < 1){
            sResult = true;
         }
      }
      console.log("sResult",sResult);
   } catch (error) {
      console.log("currentStatus fail! ====>> error:", error);
   }

   res.status(200).json(sResult);
}

StoreController.getStoreOperation = async (req, res) => {
   const iUserId = req.user.user_id;
   
   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
   } else {
      let iDayType = "day";
      let sCount = 0;
      let oResult = {
         resultCd : "unlocked",
         scheduleList : [],
         sData : [],
         setWalkthru: false,
      };
   
      try {
         const store_id = req.params.store_id;
         const getList = await Store.getOperationTimeV2(store_id);
         if(getList.length > 0){
            oResult.resultCd = "locked";

            for await (let eCount of getList) {
               if(eCount.day_of_week > 6 && eCount.day_of_week < 8){
                  iDayType = await "everyday";
               } else if (eCount.day_of_week > 7 && eCount.day_of_week < 10) {
                  iDayType = await "weekly";
               }
            }

            for await (let iCount of asyncGenerator(24)) {
               let tempResult = [];
               let temp = {};
               let tempOpen = "";
               let tempClose = "";
   
               temp.key = iCount;
               temp.value = [];
               
               if(iCount < 9){
                  tempOpen = "0" + iCount.toString();
                  tempClose = "0" + (iCount + 1).toString();
               } else if(iCount > 8 && iCount < 10){
                  tempOpen = "0" + iCount.toString();
                  tempClose = (iCount + 1).toString();
               } else {
                  tempOpen = iCount.toString();
                  tempClose = (iCount + 1).toString();
               }
   
               for await (let gCount of asyncGenerator(7)) {
                  let getValue = null;
                  let tempValue = {};

                  if(iDayType === "day"){
                     getValue = await getOperationTime(getList,tempOpen,tempClose,gCount);
                  } else if (iDayType === "everyday"){
                     getValue = await getOperationTimeEveryDay(getList,tempOpen,tempClose);
                  } else {
                     let tempDayCount = 8;
                     if(gCount > 4 && gCount < 7){
                        tempDayCount = 9;
                     }
                     getValue = await getOperationTime(getList,tempOpen,tempClose,tempDayCount);
                  }

                  tempValue.value = getValue;
                  tempResult.push(tempValue);
               }

               if(iDayType !== "weekly"){
                  temp.value = await changeArrayOrder(tempResult, 0, 6);
               } else {
                  temp.value = tempResult;
               }
   
               oResult.scheduleList.push(temp);
            }

            for await (let iCount of getList) {
               let temp = {};
               let tempDay = "일요일";
               let tempTime = "";
               let tempCongestionTime = 0;
   
               if (iCount.day_of_week > 0 && iCount.day_of_week < 2){
                  tempDay = "월요일";
               } else if (iCount.day_of_week > 1 && iCount.day_of_week < 3){
                  tempDay = "화요일";
               } else if (iCount.day_of_week > 2 && iCount.day_of_week < 4){
                  tempDay = "수요일";
               } else if (iCount.day_of_week > 3 && iCount.day_of_week < 5){
                  tempDay = "목요일";
               } else if (iCount.day_of_week > 4 && iCount.day_of_week < 6){
                  tempDay = "금요일";
               } else if (iCount.day_of_week > 5 && iCount.day_of_week < 7){
                  tempDay = "토요일";
               } else if (iCount.day_of_week > 6 && iCount.day_of_week < 8){
                  tempDay = "매일";
               } else if (iCount.day_of_week > 7 && iCount.day_of_week < 9){
                  tempDay = "평일";
               } else if (iCount.day_of_week > 8 && iCount.day_of_week < 10){
                  tempDay = "주말";
               }

               if (iCount.congestion_type > 0 && iCount.congestion_type < 2){
                  tempTime = "보통";
                  tempCongestionTime = 1;
               } else if (iCount.congestion_type > 1 && iCount.congestion_type < 3){
                  tempTime = "바쁨";
                  tempCongestionTime = 2;
               } else {
                  if(iCount.pickup_type > 1 && iCount.pickup_type < 3){
                     tempTime = "워크스루";
                     tempCongestionTime = 3;
                  } else {
                     tempTime = "여유";
                     tempCongestionTime = 0;
                  }
               }

   
               temp.key = sCount + 1;
               temp.day = tempDay;
               temp.operation = iCount.opening_time + "~" + iCount.closing_time;
               temp.time = tempTime;
               temp.day_of_week = iCount.day_of_week;
               temp.congestion_type = tempCongestionTime;
               temp.opening_time = iCount.opening_time;
               temp.closing_time = iCount.closing_time;
   
               oResult.sData.push(temp);
               sCount += 1;
            }
         }

         const walkThrooTime = await Store.storeWalkThrooOrderTime(store_id);
         if(walkThrooTime.length > 0){
            oResult.setWalkthru = true;
         }

      } catch (error) {
         console.log("error",error);
      }
   
      res.status(200).json(oResult);
   }
}

StoreController.editStoreOperation = async (req, res) => {
   const iUserId = req.user.user_id;
   
   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
   } else {
      let stringList = [];
      let iDriveThru = 0;
      let iWalkThru = 0;
      let iDayType = "day";
      let iStoreType = 1;
      let oResult = {
         resultCd: false,
         scheduleList : [],
         pickup: 1
      };
   
      try {
         const store_id = req.body.store_id;
         const sData = req.body.sData;

         if(sData.length > 0){
            for await (let dataLink of sData) {
               let tempDay = "";
               if (dataLink.day_of_week > 0 && dataLink.day_of_week < 2){
                   if(dataLink.congestion_type.toString() === "3"){
                       tempDay = "일요일 워크스루시간 : " + dataLink.opening_time + "~" + dataLink.closing_time;
                       iWalkThru += 1;
                   } else {
                       tempDay = "월요일 : " + dataLink.opening_time + "~" + dataLink.closing_time;
                       iDriveThru += 1;
                   }
               } else if (dataLink.day_of_week > 1 && dataLink.day_of_week < 3){
                   if(dataLink.congestion_type.toString() === "3"){
                       tempDay = "화요일 워크스루시간 : " + dataLink.opening_time + "~" + dataLink.closing_time;
                       iWalkThru += 1;
                   } else {
                       tempDay = "화요일 : " + dataLink.opening_time + "~" + dataLink.closing_time;
                       iDriveThru += 1;
                   }
               } else if (dataLink.day_of_week > 2 && dataLink.day_of_week < 4){
                   if(dataLink.congestion_type.toString() === "3"){
                       tempDay = "수요일 워크스루시간 : " + dataLink.opening_time + "~" + dataLink.closing_time;
                       iWalkThru += 1;
                   } else {
                       tempDay = "수요일 : " + dataLink.opening_time + "~" + dataLink.closing_time;
                       iDriveThru += 1;
                   }
               } else if (dataLink.day_of_week > 3 && dataLink.day_of_week < 5){
                   if(dataLink.congestion_type.toString() === "3"){
                       tempDay = "목요일 워크스루시간 : " + dataLink.opening_time + "~" + dataLink.closing_time;
                       iWalkThru += 1;
                   } else {
                       tempDay = "목요일 : " + dataLink.opening_time + "~" + dataLink.closing_time;
                       iDriveThru += 1;
                   }
               } else if (dataLink.day_of_week > 4 && dataLink.day_of_week < 6){
                   if(dataLink.congestion_type.toString() === "3"){
                       tempDay = "금요일 워크스루시간 : " + dataLink.opening_time + "~" + dataLink.closing_time;
                       iWalkThru += 1;
                   } else {
                       tempDay = "금요일 : " + dataLink.opening_time + "~" + dataLink.closing_time;
                       iDriveThru += 1;
                   }
               } else if (dataLink.day_of_week > 5 && dataLink.day_of_week < 7){
                   if(dataLink.congestion_type.toString() === "3"){
                       tempDay = "토요일 워크스루시간 : " + dataLink.opening_time + "~" + dataLink.closing_time;
                       iWalkThru += 1;
                   } else {
                       tempDay = "토요일 : " + dataLink.opening_time + "~" + dataLink.closing_time;
                       iDriveThru += 1;
                   }
               } else if (dataLink.day_of_week > 6 && dataLink.day_of_week < 8){
                   if(dataLink.congestion_type.toString() === "3"){
                       tempDay = "매일 워크스루시간 : " + dataLink.opening_time + "~" + dataLink.closing_time;
                       iWalkThru += 1;
                   } else {
                       tempDay = "매일 : " + dataLink.opening_time + "~" + dataLink.closing_time;
                       iDriveThru += 1;
                   }
               } else if (dataLink.day_of_week > 7 && dataLink.day_of_week < 9){
                   if(dataLink.congestion_type.toString() === "3"){
                       tempDay = "평일 워크스루시간 : " + dataLink.opening_time + "~" + dataLink.closing_time;
                       iWalkThru += 1;
                   } else {
                       tempDay = "평일 : " + dataLink.opening_time + "~" + dataLink.closing_time;
                       iDriveThru += 1;
                   }
               } else if (dataLink.day_of_week > 8 && dataLink.day_of_week < 10){
                   if(dataLink.congestion_type.toString() === "3"){
                       tempDay = "주말 워크스루시간 : " + dataLink.opening_time + "~" + dataLink.closing_time;
                       iWalkThru += 1;
                   } else {
                       tempDay = "주말 : " + dataLink.opening_time + "~" + dataLink.closing_time;
                       iDriveThru += 1;
                   }
               } else {
                   if(dataLink.congestion_type.toString() === "3"){
                       tempDay = "일요일 워크스루시간 : " + dataLink.opening_time + "~" + dataLink.closing_time;
                       iWalkThru += 1;
                   } else {
                       tempDay = "일요일 : " + dataLink.opening_time + "~" + dataLink.closing_time;
                       iDriveThru += 1;
                   }
               }
   
               stringList.push(tempDay);
            }
            stringList = await stringList.join("\n");

            if(parseInt(iDriveThru) < 1){
               iStoreType = 2;
            }

            const insertOperation = await Store.insertOperationV2(sData,store_id,stringList,iStoreType);
            if(insertOperation === "0000"){
               for await (let eCount of sData) {
                  if(eCount.day_of_week > 6 && eCount.day_of_week < 8){
                     iDayType = await "everyday";
                  } else if (eCount.day_of_week > 7 && eCount.day_of_week < 10) {
                     iDayType = await "weekly";
                  }
               }
   
               for await (let iCount of asyncGenerator(24)) {
                  let tempResult = [];
                  let temp = {};
                  let tempOpen = "";
                  let tempClose = "";
      
                  temp.key = iCount;
                  temp.value = [];
      
                  if(iCount < 9){
                     tempOpen = "0" + iCount.toString();
                     tempClose = "0" + (iCount + 1).toString();
                  } else if(iCount > 8 && iCount < 10){
                     tempOpen = "0" + iCount.toString();
                     tempClose = (iCount + 1).toString();
                  } else {
                     tempOpen = iCount.toString();
                     tempClose = (iCount + 1).toString();
                  }
      
                  for await (let gCount of asyncGenerator(7)) {
                     let getValue = null;
                     let tempValue = {};
   
                     if(iDayType === "day"){
                        getValue = await getOperationTime2(sData,tempOpen,tempClose,gCount);
                     } else if (iDayType === "everyday"){
                        getValue = await getOperationTimeEveryDay2(sData,tempOpen,tempClose);
                     } else {
                        let tempDayCount = 8;
                        if(gCount > 4 && gCount < 7){
                           tempDayCount = 9;
                        }
                        getValue = await getOperationTime2(sData,tempOpen,tempClose,tempDayCount);
                     }
   
                     tempValue.value = getValue;
                     tempResult.push(tempValue);
                  }
   
                  if(iDayType !== "weekly"){
                     temp.value = await changeArrayOrder(tempResult, 0, 6);
                  } else {
                     temp.value = tempResult;
                  }
      
                  oResult.scheduleList.push(temp);
                  oResult.resultCd = true;
               }
            }
         }
      } catch (error) {
         console.log("error",error);
      }
      
      res.status(200).json(oResult);
   }
}

StoreController.getStoreHoliday = async (req, res) => {
   const iUserId = req.user.user_id;
   
   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
   } else {
      let oResult = {
         resultCd : "unlocked",
         official : [],
         temporary : [],
         oKey : 0,
         tKey : 0,
      };
      let oCount = 0;
      let tCount = 0;
   
      try {
         const store_id = req.params.store_id;
         const result = await Store.getStoreHoliday(store_id);
         if(result.length > 0){
            for await (const iterator of result) {
               let temp = {};
               if(iterator.type > 0 && iterator.type < 2){
                  temp.key = tCount + 1;
                  temp.fromDate = iterator.holiday_from;
                  temp.toDate = iterator.holiday_to;

                  oResult.temporary.push(temp);

                  tCount += 1;

               } else {
                  temp.key = oCount + 1;
                  temp.sMethodValue = iterator.date_type;
                  temp.sDayValue = iterator.day_of_week;

                  oResult.official.push(temp);

                  oCount += 1;
               }
            }
         }
         
         if(oResult.official.length > 0 || oResult.temporary.length > 0){
            oResult.resultCd = "locked";
            oResult.tKey = tCount;
            oResult.oKey = oCount;
         }
      } catch (error) {
         console.log("error",error);
      }
   
      res.status(200).json(oResult);
   }

}

StoreController.editStoreHoliday = async (req, res) => {
   const iUserId = req.user.user_id;
   
   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
   } else {
      let oResult = false;

      try {
         let officialResult = true;
         let temperaryResult = true;

         const store_id = req.body.store_id;
         const iList = req.body.iList;
         const sList = req.body.sList;
         const insertOfficial = await Store.officialHoliday(iList,0,store_id);
         if(insertOfficial !== "0000"){
            officialResult = false;
         }

         const insertTemperary = await Store.temperaryHoliday(sList,1,store_id);
         if(insertTemperary !== "0000"){
            temperaryResult = false;
         }

         if(officialResult && temperaryResult){
            oResult = true;
         }

      } catch (error) {
         console.log("error",error);
      }

      res.status(200).json(oResult);
   }
}

StoreController.editPickUpInfo = async (req, res) => {
   const iUserId = req.user.user_id;
   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
   } else {
      const store_id = req.body.store_id;
      const sAddress = req.body.sAddress;
      const sExtraAddress = req.body.sExtraAddress;
      const sPhoneNm = req.body.sPhoneNm;
      const sNoti = req.body.sNotsNearByDistanceValue;
      const sParkingTime = req.body.sParkingTime;

      let sLat = parseFloat(37.5657);
      let sLng = parseFloat(126.9769);
      let sParam = "";
      let oResult = false;

      try {
         let merchantCheck = await User.merchantInfoCheck(store_id);
         if(merchantCheck.length > 0){
            merchantCheck = merchantCheck[0];
            if(parseInt(merchantCheck.status) > 0){
               sParam = "skip";
            }
         }
         const sLatLng = await searchKakaoAddress(sAddress);
         if(sLatLng.success && sLatLng != undefined && sLatLng.address != undefined && sLatLng.address.length > 0){
            sLat = parseFloat(sLatLng.address[0].y);
            sLng = parseFloat(sLatLng.address[0].x);
         }
         const result = await Store.editPickUp(sLat,sLng,sAddress,sExtraAddress,sPhoneNm,sNoti,sParkingTime,store_id,sParam);
         if(result != undefined){
            oResult = true;
         }
      } catch (error) {
         console.log("error",error);
      }

      res.status(200).json(oResult);
   }
}

StoreController.editStoreExtraInfo = async (req, res) => {
   const iUserId = req.user.user_id;
   
   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
   } else {
      let oResult = false;

      try {
         const store_id = req.body.store_id;
         const sContent = req.body.sContent;
         const sPhoneNm = req.body.sPhoneNm;
         let sNotiValue = req.body.sNotiValue;
         let parkingTime = req.body.parkingTime;

         if (typeof (sNotiValue) === 'string') {
            sNotiValue = await 100;
         }

         if (typeof (parkingTime) === 'string') {
            parkingTime = await 5;
         }

         const result = await Store.editStoreExtraInfo(store_id,sContent,sPhoneNm,sNotiValue,parkingTime);
         if(result != undefined){
            oResult = true;
         }
      } catch (error) {
         console.log("error",error);
      }

      res.status(200).json(oResult);
   }
}

StoreController.getPickUpInfo = async (req, res) => {
   const iUserId = req.user.user_id;
   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
   } else {
      const store_id = req.params.store_id;
      let oResult = {
         address : "",
         extraAddress : "",
         Nm : "",
         parkingTime : 5,
         sNoti : 100,
      };
   
      try {
         let result = await Store.getPickUpInfo(store_id);
         if(result !== undefined && result !== null){
            result = result[0];

            if(result.sAddress1 !== undefined && result.sAddress1 !== null && result.sAddress1 !== ""){
               oResult.address = result.sAddress1;
            } else if (result.mAddress1 !== undefined && result.mAddress1 !== null && result.mAddress1 !== "") {
               oResult.address = result.mAddress1;
            }
            if(result.sAddress2 !== undefined && result.sAddress2 !== null && result.sAddress2 !== ""){
               oResult.extraAddress = result.sAddress2;
            } else if (result.mAddress2 !== undefined && result.mAddress2 !== null && result.mAddress2 !== "") {
               oResult.extraAddress = result.mAddress2;
            }
            if(result.sPhone !== undefined && result.sPhone !== null && result.sPhone !== ""){
               oResult.Nm = result.sPhone;
            } else if (result.mPhone !== undefined && result.mPhone !== null && result.mPhone !== "") {
               oResult.Nm = result.mPhone;
            }
            if(result.parking_time !== undefined && result.parking_time !== null && result.parking_time !== ""){
               oResult.parkingTime = result.parking_time;
            }
            if(result.noti_nearby_distance !== undefined && result.noti_nearby_distance !== null && result.noti_nearby_distance !== ""){
               oResult.sNoti = result.noti_nearby_distance;
            }
         }
      } catch (error) {
         console.log("error",error);
      }
   
      res.status(200).json(oResult);
   }
}

StoreController.storeExtraInfo = async (req, res) => {
   const iUserId = req.user.user_id;
   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
   } else {
      let oResult = {
         resultCd : "unlocked",
         address : "",
         Nm : "",
         parkingTime : "5분",
         sNoti : "100m",
      };
   
      try {
         const store_id = req.params.store_id;
         const result = await Store.storeExtraInfo(store_id);
         if(result != undefined){
            if(result[0].address1 != undefined && result[0].address1 != null && result[0].address1 != ""){
               oResult.address = await result[0].address1;
            }

            if(result[0].phone_number != undefined && result[0].phone_number != null && result[0].phone_number != ""){
               oResult.Nm = await result[0].phone_number;
            }

            if(result[0].parking_time != undefined && result[0].parking_time != null && result[0].parking_time != ""){
               oResult.parkingTime = await result[0].parking_time;
            }

            if(result[0].noti_nearby_distance != undefined && result[0].noti_nearby_distance != null && result[0].noti_nearby_distance > 0){
               oResult.sNoti = await result[0].noti_nearby_distance;
            }

            if(oResult.address !== "" || oResult.Nm !== ""){
               oResult.resultCd = "locked";
            }
         }
      } catch (error) {
         console.log("error",error);
      }
   
      res.status(200).json(oResult);
   }
}

StoreController.editStoreInfo = async (req, res) => {
   const iUserId = req.user.user_id;
   const storeId = req.body.store_id;
   const sInfo = req.body.sInfo;
   const sNoti = req.body.sNoti;
   const sDetail = req.body.sDetail;
   const mainType = req.body.mainType;
   const subType = req.body.subType;
   const haveSubList = req.body.isSub;
   
   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
   } else {
      let oResult = false;
      let isSub = false;
      let sResult = [];
      let iResult = [];

      try {

         if(mainType.length > 0){
            for await (const iterator of mainType) {
               let temp = null;
               const getParam = await Store.getParamType(iterator.toString());
               if(getParam !== undefined && getParam !== null){
                  temp = getParam.store_type_id;
               }
               sResult.push(temp);
            }
            if(haveSubList.toString() !== "4"){
               if(subType.length > 0){
                  for await (const iterator of subType) {
                     let temp = null;
                     const subTypeName = await Store.getParamType(iterator.toString());
                     if(subTypeName != undefined && subTypeName != null){
                        temp = subTypeName.store_type_id;
                     }
                     iResult.push(temp);
                  }
                  isSub = true;
               }
            }
               
            const result = await Store.editStoreType(storeId,sResult,iResult,isSub,sInfo,sNoti,sDetail);
            if(result === "0000"){
               oResult = true;
            }
         }
      } catch (error) {
         console.log("StoreController.editStoreInfo failll   ===>>>",error);
      }

      res.status(200).json(oResult);
   }
}

StoreController.settingStoreDetail = async (req, res) => {
   const iUserId = req.user.user_id;
   
   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
   } else {
      let oResult = {
         resultCd : "unlocked",
         plainOptions : [],
         cafeOptions : [],
         shopOptions : [],
         setType : [],
         subTypeNm : [],
         sInfo : "",
         sNoti : "",
         sDetail : "",
      };
      let mainList = [];
      let subList = [];

      try {
         const store_id = req.params.store_id;
         const storeDetail = await Store.getStoreText(store_id);
         if(storeDetail != undefined){
            if(storeDetail[0].description != undefined && storeDetail[0].description != null && storeDetail[0].description != ""){
               oResult.sInfo = await storeDetail[0].description;
            }

            if(storeDetail[0].description_extra != undefined && storeDetail[0].description_extra != null && storeDetail[0].description_extra != ""){
               oResult.sDetail = await storeDetail[0].description_extra;
            }

            if(storeDetail[0].description_noti != undefined && storeDetail[0].description_noti != null && storeDetail[0].description_noti != ""){
               oResult.sNoti = await storeDetail[0].description_noti;
            }
         }

         const sType = await Store.getMainType(store_id); 
         if(sType.length > 0){
            for await (const gCount of sType) {
               let tempMainList = null;
               let tempSubList = null;
               if(gCount.is_main < 1){
                  tempSubList = gCount.name;
                  subList.push(tempSubList);
               } else if (gCount.is_main > 0 && gCount.is_main < 2){
                  tempMainList = gCount.name;
                  mainList.push(tempMainList);
               }
            }
         }

         const getList = await Store.getStoreType();
         for await (const iterator of getList) {
            if(iterator.parent_store_type_id.toString() === "2"){
               oResult.plainOptions.push(iterator.name.toString());
               
            }else if(iterator.parent_store_type_id.toString() === "1"){
               oResult.cafeOptions.push(iterator.name.toString());

            }else if(iterator.parent_store_type_id.toString() === "8"){
               oResult.shopOptions.push(iterator.name.toString());
            }
         }

         if(mainList.length > 0){
            oResult.setType = mainList;
            oResult.subTypeNm = subList;
            oResult.resultCd = "locked";
         }
      } catch (error) {
         console.log("error",error);
      }
   
      res.status(200).json(oResult);
   }
}

StoreController.inventoryChangeStatus = async (req, res) => {
   const iUserId = req.user.user_id;
   
   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
   } else {
      let oResult = "9999";

      try {
         const productId = req.body.sIndex;
         let iStatus = req.body.aIndex;

         if(iStatus){
            iStatus = 0;
         } else {
            iStatus = 1;
         }

         const result = await Store.inventoryChangeStatus(productId,iStatus);
         if(result != undefined){
            oResult = "0000";
         }
         
      } catch (error) {
         console.log("error",error);
      }
      res.status(200).json(oResult);
   }
}

StoreController.inventoryList = async (req, res) => {
   const iUserId = req.user.user_id;
   
   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
   } else {
      let oResult = [];

      try {
         const sId = req.params.sIndex;
         const result = await Store.inventoryList(sId);
         if(result.length > 0){
            for await (let oData of result) {
               let temp = {};
               temp.id = oData.product_id;
               temp.title = oData.name;
               temp.description = oData.description;
               temp.price = Math.floor(parseFloat(oData.base_price));
               temp.url = "https://api-stg.ivid.kr/img/no-image-new.png";
               temp.content = "일시품절";
               temp.status = true;

               if(oData.url_path !== undefined && oData.url_path !== null && oData.url_path != ""){
                  temp.url = oData.url_path;
               }

               if(parseInt(oData.is_soldout) < 1){
                  temp.content = "주문가능";
                  temp.status = false;
               }

               oResult.push(temp);
            }
         }
      } catch (error) {
         console.log("error",error);
      }

      res.status(200).json(oResult);
   }
}

StoreController.openingHoursDesc = async (req, res) => {
   const iUserId = req.user.user_id;
   
   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
   } else {
      let oResult = {};

      const store_id = req.params.store_id;
      const storeDesc = await Store.storeDesc(store_id);
      if(storeDesc != undefined && storeDesc != null){
         oResult.result_cd = "0000";

         const storeOrderType = await Store.storeOrderType(store_id);
         if(storeOrderType != undefined && storeOrderType != null && storeOrderType.length > 0){
            oResult.opening_time = storeOrderType[0].opening_time;
            oResult.closeing_time = storeOrderType[0].closing_time;

            if(storeOrderType[0].breaktime_from != null){
               oResult.isBreakTime = true;
               oResult.breaktime_from = storeOrderType[0].breaktime_from;
               oResult.breaktime_to = storeOrderType[0].breaktime_to;
            } else {
               oResult.isBreakTime = false;
               oResult.breaktime_from = "00:00";
               oResult.breaktime_to = "00:00";
            }

            if(storeOrderType[0].all_time > 0){
               oResult.allTime = false;
            } else {
               oResult.allTime = true;
            }

            const getOrderTimeCongestion = await Store.getOrderTimeCongestion(storeOrderType[0].store_time_id);
            if(parseInt(getOrderTimeCongestion[0].congestion_type) < 1){
               oResult.orderTime = "easy";
            } else if(parseInt(getOrderTimeCongestion[0].congestion_type) > 0 && parseInt(getOrderTimeCongestion[0].congestion_type) < 2){
               oResult.orderTime = "normal";
            } else if(parseInt(getOrderTimeCongestion[0].congestion_type) > 1 && parseInt(getOrderTimeCongestion[0].congestion_type) < 3){
               oResult.orderTime = "busy";
            }

            const checkOptionBoth = await Store.checkOptionBoth(storeOrderType[0].store_time_id);
            if(checkOptionBoth.length > 0){
               let sList = [];
               for await (let x of checkOptionBoth) {
                  let temp = {};
                  temp.from = x.time_from;
                  temp.to = x.time_to;
                  if(parseInt(x.congestion_type) < 1){
                     temp.selectValue = "easy";
                  } else if(parseInt(x.congestion_type) > 0 && parseInt(x.congestion_type) < 2){
                     temp.selectValue = "normal";
                  } else if(parseInt(x.congestion_type) > 1 && parseInt(x.congestion_type) < 3){
                     temp.selectValue = "busy";
                  }
                  sList.push(temp);
               }
               oResult.congestionList = sList;
               oResult.congestion = true;
            } else {
               oResult.congestion = false;
            }
            oResult.date_type = "daily";

         } else {
            const weeklyOrderTimeList = await Store.weeklyOrderTimeList(store_id);
            if(weeklyOrderTimeList.length > 0){
               let sList = [];
               for await (let i of weeklyOrderTimeList) {
                  if(parseInt(i.day_of_week) > 0 && parseInt(i.day_of_week) < 2 ){
                     let operateList = {};
                     operateList.mOperatingList = {};
                     operateList.mOptionList = [];
                     operateList.mOperatingList.openTime = i.opening_time;
                     operateList.mOperatingList.closeTime = i.closing_time;
   
                     if(i.breaktime_from != null){
                        operateList.mOperatingList.isBreakTime = true
                        operateList.mOperatingList.breakFrom = i.breaktime_from;
                        operateList.mOperatingList.breakTo = i.breaktime_to;
                     } else {
                        operateList.mOperatingList.isBreakTime = false
                        operateList.mOperatingList.breakFrom = "00:00";
                        operateList.mOperatingList.breakTo = "00:00";
                     }
                     
                     if(i.all_time > 0){
                        operateList.mOperatingList.allDay = false;
                     } else {
                        operateList.mOperatingList.allDay = true;
                     }

                     const getOrderTimeCongestion = await Store.getOrderTimeCongestion(i.store_time_id);
                     if(parseInt(getOrderTimeCongestion[0].congestion_type) < 1){
                        operateList.mOperatingList.orderTime = "easy";
                     } else if(parseInt(getOrderTimeCongestion[0].congestion_type) > 0 && parseInt(getOrderTimeCongestion[0].congestion_type) < 2){
                        operateList.mOperatingList.orderTime = "normal";
                     } else if(parseInt(getOrderTimeCongestion[0].congestion_type) > 1 && parseInt(getOrderTimeCongestion[0].congestion_type) < 3){
                        operateList.mOperatingList.orderTime = "busy";
                     }

                     const checkOptionBoth = await Store.checkOptionBoth(i.store_time_id);
                     if(checkOptionBoth.length > 0){
                        for await (let x of checkOptionBoth) {
                           let temp = {};
                           temp.from = x.time_from;
                           temp.to = x.time_to;
                           if(parseInt(x.congestion_type) < 1){
                              temp.selectValue = "easy";
                           } else if(parseInt(x.congestion_type) > 0 && parseInt(x.congestion_type) < 2){
                              temp.selectValue = "normal";
                           } else if(parseInt(x.congestion_type) > 1 && parseInt(x.congestion_type) < 3){
                              temp.selectValue = "busy";
                           }
                           operateList.mOptionList.push(temp);
                        }
                        operateList.mOperatingList.isCongestion = true;
                        
                     } else {
                        operateList.mOperatingList.isCongestion = false;
                     }
                     sList.push(operateList);

                  } else if(i.day_of_week > 1 && i.day_of_week < 3 ){
                     let operateList = {};
                     operateList.tOperatingList = {};
                     operateList.tOptionList = [];
                     operateList.tOperatingList.openTime = i.opening_time;
                     operateList.tOperatingList.closeTime = i.closing_time;
   
                     if(i.breaktime_from != null){
                        operateList.tOperatingList.isBreakTime = true
                        operateList.tOperatingList.breakFrom = i.breaktime_from;
                        operateList.tOperatingList.breakTo = i.breaktime_to;
                     } else {
                        operateList.tOperatingList.isBreakTime = false
                        operateList.tOperatingList.breakFrom = "00:00";
                        operateList.tOperatingList.breakTo = "00:00";
                     }
                     
                     if(i.all_time > 0){
                        operateList.tOperatingList.allDay = false;
                     } else {
                        operateList.tOperatingList.allDay = true;
                     }

                     const getOrderTimeCongestion = await Store.getOrderTimeCongestion(i.store_time_id);
                     if(parseInt(getOrderTimeCongestion[0].congestion_type) < 1){
                        operateList.tOperatingList.orderTime = "easy";
                     } else if(parseInt(getOrderTimeCongestion[0].congestion_type) > 0 && parseInt(getOrderTimeCongestion[0].congestion_type) < 2){
                        operateList.tOperatingList.orderTime = "normal";
                     } else if(parseInt(getOrderTimeCongestion[0].congestion_type) > 1 && parseInt(getOrderTimeCongestion[0].congestion_type) < 3){
                        operateList.tOperatingList.orderTime = "busy";
                     }

                     const checkOptionBoth = await Store.checkOptionBoth(i.store_time_id);
                     if(checkOptionBoth.length > 0){
                        for await (let x of checkOptionBoth) {
                           let temp = {};
                           temp.from = x.time_from;
                           temp.to = x.time_to;
                           if(parseInt(x.congestion_type) < 1){
                              temp.selectValue = "easy";
                           } else if(parseInt(x.congestion_type) > 0 && parseInt(x.congestion_type) < 2){
                              temp.selectValue = "normal";
                           } else if(parseInt(x.congestion_type) > 1 && parseInt(x.congestion_type) < 3){
                              temp.selectValue = "busy";
                           }
                           operateList.tOptionList.push(temp);
                        }
                        operateList.tOperatingList.isCongestion = true;
                        
                     } else {
                        operateList.tOperatingList.isCongestion = false;
                     }
                     sList.push(operateList);

                  } else if(i.day_of_week > 2 && i.day_of_week < 4 ){
                     let operateList = {};
                     operateList.wOperatingList = {};
                     operateList.wOptionList = [];
                     operateList.wOperatingList.openTime = i.opening_time;
                     operateList.wOperatingList.closeTime = i.closing_time;
   
                     if(i.breaktime_from != null){
                        operateList.wOperatingList.isBreakTime = true
                        operateList.wOperatingList.breakFrom = i.breaktime_from;
                        operateList.wOperatingList.breakTo = i.breaktime_to;
                     } else {
                        operateList.wOperatingList.isBreakTime = false
                        operateList.wOperatingList.breakFrom = "00:00";
                        operateList.wOperatingList.breakTo = "00:00";
                     }
                     
                     if(i.all_time > 0){
                        operateList.wOperatingList.allDay = false;
                     } else {
                        operateList.wOperatingList.allDay = true;
                     }

                     const getOrderTimeCongestion = await Store.getOrderTimeCongestion(i.store_time_id);
                     if(parseInt(getOrderTimeCongestion[0].congestion_type) < 1){
                        operateList.wOperatingList.orderTime = "easy";
                     } else if(parseInt(getOrderTimeCongestion[0].congestion_type) > 0 && parseInt(getOrderTimeCongestion[0].congestion_type) < 2){
                        operateList.wOperatingList.orderTime = "normal";
                     } else if(parseInt(getOrderTimeCongestion[0].congestion_type) > 1 && parseInt(getOrderTimeCongestion[0].congestion_type) < 3){
                        operateList.wOperatingList.orderTime = "busy";
                     }

                     const checkOptionBoth = await Store.checkOptionBoth(i.store_time_id);
                     if(checkOptionBoth.length > 0){
                        for await (let x of checkOptionBoth) {
                           let temp = {};
                           temp.from = x.time_from;
                           temp.to = x.time_to;
                           if(parseInt(x.congestion_type) < 1){
                              temp.selectValue = "easy";
                           } else if(parseInt(x.congestion_type) > 0 && parseInt(x.congestion_type) < 2){
                              temp.selectValue = "normal";
                           } else if(parseInt(x.congestion_type) > 1 && parseInt(x.congestion_type) < 3){
                              temp.selectValue = "busy";
                           }
                           operateList.wOptionList.push(temp);
                        }
                        operateList.wOperatingList.isCongestion = true;
                        
                     } else {
                        operateList.wOperatingList.isCongestion = false;
                     }
                     sList.push(operateList);

                  } else if(i.day_of_week > 3 && i.day_of_week < 5 ){
                     let operateList = {};
                     operateList.thOperatingList = {};
                     operateList.thOptionList = [];
                     operateList.thOperatingList.openTime = i.opening_time;
                     operateList.thOperatingList.closeTime = i.closing_time;
   
                     if(i.breaktime_from != null){
                        operateList.thOperatingList.isBreakTime = true
                        operateList.thOperatingList.breakFrom = i.breaktime_from;
                        operateList.thOperatingList.breakTo = i.breaktime_to;
                     } else {
                        operateList.thOperatingList.isBreakTime = false
                        operateList.thOperatingList.breakFrom = "00:00";
                        operateList.thOperatingList.breakTo = "00:00";
                     }
                     
                     if(i.all_time > 0){
                        operateList.thOperatingList.allDay = false;
                     } else {
                        operateList.thOperatingList.allDay = true;
                     }

                     const getOrderTimeCongestion = await Store.getOrderTimeCongestion(i.store_time_id);
                     if(parseInt(getOrderTimeCongestion[0].congestion_type) < 1){
                        operateList.thOperatingList.orderTime = "easy";
                     } else if(parseInt(getOrderTimeCongestion[0].congestion_type) > 0 && parseInt(getOrderTimeCongestion[0].congestion_type) < 2){
                        operateList.thOperatingList.orderTime = "normal";
                     } else if(parseInt(getOrderTimeCongestion[0].congestion_type) > 1 && parseInt(getOrderTimeCongestion[0].congestion_type) < 3){
                        operateList.thOperatingList.orderTime = "busy";
                     }

                     const checkOptionBoth = await Store.checkOptionBoth(i.store_time_id);
                     if(checkOptionBoth.length > 0){
                        for await (let x of checkOptionBoth) {
                           let temp = {};
                           temp.from = x.time_from;
                           temp.to = x.time_to;
                           if(parseInt(x.congestion_type) < 1){
                              temp.selectValue = "easy";
                           } else if(parseInt(x.congestion_type) > 0 && parseInt(x.congestion_type) < 2){
                              temp.selectValue = "normal";
                           } else if(parseInt(x.congestion_type) > 1 && parseInt(x.congestion_type) < 3){
                              temp.selectValue = "busy";
                           }
                           operateList.thOptionList.push(temp);
                        }
                        operateList.thOperatingList.isCongestion = true;
                        
                     } else {
                        operateList.thOperatingList.isCongestion = false;
                     }
                     sList.push(operateList);

                  } else if(i.day_of_week > 4 && i.day_of_week < 6 ){
                     let operateList = {};
                     operateList.fOperatingList = {};
                     operateList.fOptionList = [];
                     operateList.fOperatingList.openTime = i.opening_time;
                     operateList.fOperatingList.closeTime = i.closing_time;
   
                     if(i.breaktime_from != null){
                        operateList.fOperatingList.isBreakTime = true
                        operateList.fOperatingList.breakFrom = i.breaktime_from;
                        operateList.fOperatingList.breakTo = i.breaktime_to;
                     } else {
                        operateList.fOperatingList.isBreakTime = false
                        operateList.fOperatingList.breakFrom = "00:00";
                        operateList.fOperatingList.breakTo = "00:00";
                     }
                     
                     if(i.all_time > 0){
                        operateList.fOperatingList.allDay = false;
                     } else {
                        operateList.fOperatingList.allDay = true;
                     }

                     const getOrderTimeCongestion = await Store.getOrderTimeCongestion(i.store_time_id);
                     if(parseInt(getOrderTimeCongestion[0].congestion_type) < 1){
                        operateList.fOperatingList.orderTime = "easy";
                     } else if(parseInt(getOrderTimeCongestion[0].congestion_type) > 0 && parseInt(getOrderTimeCongestion[0].congestion_type) < 2){
                        operateList.fOperatingList.orderTime = "normal";
                     } else if(parseInt(getOrderTimeCongestion[0].congestion_type) > 1 && parseInt(getOrderTimeCongestion[0].congestion_type) < 3){
                        operateList.fOperatingList.orderTime = "busy";
                     }

                     const checkOptionBoth = await Store.checkOptionBoth(i.store_time_id);
                     if(checkOptionBoth.length > 0){
                        for await (let x of checkOptionBoth) {
                           let temp = {};
                           temp.from = x.time_from;
                           temp.to = x.time_to;
                           if(parseInt(x.congestion_type) < 1){
                              temp.selectValue = "easy";
                           } else if(parseInt(x.congestion_type) > 0 && parseInt(x.congestion_type) < 2){
                              temp.selectValue = "normal";
                           } else if(parseInt(x.congestion_type) > 1 && parseInt(x.congestion_type) < 3){
                              temp.selectValue = "busy";
                           }
                           operateList.fOptionList.push(temp);
                        }
                        operateList.fOperatingList.isCongestion = true;
                        
                     } else {
                        operateList.fOperatingList.isCongestion = false;
                     }
                     sList.push(operateList);

                  } else if(i.day_of_week > 5 && i.day_of_week < 7 ){
                     let operateList = {};
                     operateList.sOperatingList = {};
                     operateList.sOptionList = [];
                     operateList.sOperatingList.openTime = i.opening_time;
                     operateList.sOperatingList.closeTime = i.closing_time;
   
                     if(i.breaktime_from != null){
                        operateList.sOperatingList.isBreakTime = true
                        operateList.sOperatingList.breakFrom = i.breaktime_from;
                        operateList.sOperatingList.breakTo = i.breaktime_to;
                     } else {
                        operateList.sOperatingList.isBreakTime = false
                        operateList.sOperatingList.breakFrom = "00:00";
                        operateList.sOperatingList.breakTo = "00:00";
                     }
                     
                     if(i.all_time > 0){
                        operateList.sOperatingList.allDay = false;
                     } else {
                        operateList.sOperatingList.allDay = true;
                     }

                     const getOrderTimeCongestion = await Store.getOrderTimeCongestion(i.store_time_id);
                     if(parseInt(getOrderTimeCongestion[0].congestion_type) < 1){
                        operateList.sOperatingList.orderTime = "easy";
                     } else if(parseInt(getOrderTimeCongestion[0].congestion_type) > 0 && parseInt(getOrderTimeCongestion[0].congestion_type) < 2){
                        operateList.sOperatingList.orderTime = "normal";
                     } else if(parseInt(getOrderTimeCongestion[0].congestion_type) > 1 && parseInt(getOrderTimeCongestion[0].congestion_type) < 3){
                        operateList.sOperatingList.orderTime = "busy";
                     }

                     const checkOptionBoth = await Store.checkOptionBoth(i.store_time_id);
                     if(checkOptionBoth.length > 0){
                        for await (let x of checkOptionBoth) {
                           let temp = {};
                           temp.from = x.time_from;
                           temp.to = x.time_to;
                           if(parseInt(x.congestion_type) < 1){
                              temp.selectValue = "easy";
                           } else if(parseInt(x.congestion_type) > 0 && parseInt(x.congestion_type) < 2){
                              temp.selectValue = "normal";
                           } else if(parseInt(x.congestion_type) > 1 && parseInt(x.congestion_type) < 3){
                              temp.selectValue = "busy";
                           }
                           operateList.sOptionList.push(temp);
                        }
                        operateList.sOperatingList.isCongestion = true;
                        
                     } else {
                        operateList.sOperatingList.isCongestion = false;
                     }
                     sList.push(operateList);

                  } else if(i.day_of_week < 1){
                     let operateList = {};
                     operateList.suOperatingList = {};
                     operateList.suOptionList = [];
                     operateList.suOperatingList.openTime = i.opening_time;
                     operateList.suOperatingList.closeTime = i.closing_time;
   
                     if(i.breaktime_from != null){
                        operateList.suOperatingList.isBreakTime = true
                        operateList.suOperatingList.breakFrom = i.breaktime_from;
                        operateList.suOperatingList.breakTo = i.breaktime_to;
                     } else {
                        operateList.suOperatingList.isBreakTime = false
                        operateList.suOperatingList.breakFrom = "00:00";
                        operateList.suOperatingList.breakTo = "00:00";
                     }
                     
                     if(i.all_time > 0){
                        operateList.suOperatingList.allDay = false;
                     } else {
                        operateList.suOperatingList.allDay = true;
                     }

                     const getOrderTimeCongestion = await Store.getOrderTimeCongestion(i.store_time_id);
                     if(parseInt(getOrderTimeCongestion[0].congestion_type) < 1){
                        operateList.suOperatingList.orderTime = "easy";
                     } else if(parseInt(getOrderTimeCongestion[0].congestion_type) > 0 && parseInt(getOrderTimeCongestion[0].congestion_type) < 2){
                        operateList.suOperatingList.orderTime = "normal";
                     } else if(parseInt(getOrderTimeCongestion[0].congestion_type) > 1 && parseInt(getOrderTimeCongestion[0].congestion_type) < 3){
                        operateList.suOperatingList.orderTime = "busy";
                     }

                     const checkOptionBoth = await Store.checkOptionBoth(i.store_time_id);
                     if(checkOptionBoth.length > 0){
                        for await (let x of checkOptionBoth) {
                           let temp = {};
                           temp.from = x.time_from;
                           temp.to = x.time_to;
                           if(parseInt(x.congestion_type) < 1){
                              temp.selectValue = "easy";
                           } else if(parseInt(x.congestion_type) > 0 && parseInt(x.congestion_type) < 2){
                              temp.selectValue = "normal";
                           } else if(parseInt(x.congestion_type) > 1 && parseInt(x.congestion_type) < 3){
                              temp.selectValue = "busy";
                           }
                           operateList.suOptionList.push(temp);
                        }
                        operateList.suOperatingList.isCongestion = true;
                        
                     } else {
                        operateList.suOperatingList.isCongestion = false;
                     }
                     sList.push(operateList);
                  } 
               }
               oResult.date_type = "weekly";
               oResult.totalList = sList;
            } else {
               oResult.date_type = "none";
            }
         }
      } else {
         oResult.result_cd = "9999";
      }

      res.status(200).json(oResult);
   }
}

StoreController.orderTimeDesc = async (req, res) => {
   const iUserId = req.user.user_id;
   
   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
   } else {
      let oResult = {};

      const store_id = req.params.store_id;
      const storeDesc = await Store.storeDesc(store_id);
      if(storeDesc != undefined && storeDesc != null){
         oResult.result_cd = "0000";
         oResult.sEasy = "1";
         oResult.sNormal = "25";
         oResult.sBusy = "40";
         oResult.sWalkThroo = "";

         const storeOrderTime = await Store.storeOrderTime(store_id);
         for await (let i of storeOrderTime) {
            if(parseInt(i.congestion_type) < 1){
               oResult.sEasy = i.minute;
            } else if (0 < parseInt(i.congestion_type) && parseInt(i.congestion_type) < 2){
               oResult.sNormal = i.minute;
            } else if (1 < parseInt(i.congestion_type) && parseInt(i.congestion_type) < 3){
               oResult.sBusy = i.minute;
            }
         }

         const walkThrooTime = await Store.storeWalkThrooOrderTime(store_id);
         if(walkThrooTime.length > 0){
            oResult.sWalkThroo = walkThrooTime[0].minute;
         }

      } else {
         oResult.result_cd = "9999";
      }

      res.status(200).json(oResult);
   }
}

StoreController.getPickUpZoneInfo = async (req, res) => {
   const iUserId = req.user.user_id;
   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
   } else {
      const store_id = req.params.store_id;

      let tempViewPoint = {
         pan: 0,
         tilt: 0,
         zoom: 0,
      };
      let oResult = {
         lat : 37.566611,
         lng : 126.978441,
         pointView : tempViewPoint,
         sParkingImg : "",
      };
   
      try {
         let storeDesc = await Store.getPickUpZoneInfo(store_id);
         if(storeDesc !== undefined && storeDesc !== null){
            if(storeDesc.length > 0){
               storeDesc = storeDesc[0];

               if(storeDesc.lat !== undefined && storeDesc.lat !== null){
                  oResult.lat = storeDesc.lat;
               }
               if(storeDesc.lng !== undefined && storeDesc.lng !== null){
                  oResult.lng = storeDesc.lng;
               }
               if(storeDesc.parking_pan !== undefined && storeDesc.parking_pan !== null){
                  tempViewPoint.pan = storeDesc.parking_pan;
                  oResult.pointView = tempViewPoint;
               }
               if(storeDesc.parking_tilt !== undefined && storeDesc.parking_tilt !== null){
                  tempViewPoint.tilt = storeDesc.parking_tilt;
                  oResult.pointView = tempViewPoint;
               }
               if(storeDesc.parking_zoom !== undefined && storeDesc.parking_zoom !== null){
                  tempViewPoint.zoom = storeDesc.parking_zoom;
                  oResult.pointView = tempViewPoint;
               }
               if(storeDesc.parking_image !== undefined && storeDesc.parking_image !== null && storeDesc.parking_image !== ""){
                  oResult.sParkingImg = storeDesc.parking_image;
               }
            }
         }

      } catch (error) {
         console.log(error);
      }
   
      res.status(200).json(oResult);
   }
}

StoreController.pickUpZoneDesc = async (req, res) => {
   const iUserId = req.user.user_id;
   
   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
   } else {
      let oResult = {
         resultCd : "unlocked",
         sLat : 37.566611,
         sLng : 126.978441,
         sParkingImg : "",
      };
   
      try {
         const store_id = req.params.store_id;
         const storeDesc = await Store.storeDesc(store_id);
         if(storeDesc != undefined && storeDesc != null){

            if(storeDesc[0].lat != undefined && storeDesc[0].lat != null && storeDesc[0].lat > 0){
               oResult.sLat = await storeDesc[0].lat;
            }

            if(storeDesc[0].lng != undefined && storeDesc[0].lng != null && storeDesc[0].lng > 0){
               oResult.sLng = await storeDesc[0].lng;
            }

            if(storeDesc[0].parking_image != undefined && storeDesc[0].parking_image != null && storeDesc[0].parking_image != ""){
               oResult.sParkingImg = await storeDesc[0].parking_image;
               oResult.resultCd = "locked";
            }
         }
      } catch (error) {
         console.log(error);
      }
   
      res.status(200).json(oResult);
   }
}


StoreController.getStoreImage = async (req, res) => {
   const iUserId = req.user.user_id;
   
   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
   } else {
      let oResult = {
         resultCd : "unlocked",
         url_path_logo : "",
         url_path_first : "",
         url_path_second : "",
         url_path_third : "",
      };

      try {
         const store_id = req.params.store_id;
         const storeDesc = await Store.storeMediaImage(store_id);
         if(storeDesc.length > 0){
            for await (let gData of storeDesc) {
               if(oResult.url_path_logo === ""){
                  oResult.url_path_logo = gData.url_path;
               } else if (oResult.url_path_first === ""){
                  oResult.url_path_first = gData.url_path;
               } else if (oResult.url_path_second === ""){
                  oResult.url_path_second = gData.url_path;
               } else if (oResult.url_path_third === ""){
                  oResult.url_path_third = gData.url_path;
               }
            }
            if((oResult.url_path_logo !== "")){
               oResult.resultCd = "locked";
            }
         }
      } catch (error) {
         console.log("error",error);
      }
   
      res.status(200).json(oResult);
   }
}

StoreController.getStoreMediaImage = async (req, res) => {
   const iUserId = req.user.user_id;
   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
   } else {
      const store_id = req.params.store_id;

      let sNm = 0;
      let oResult = {
         url_path_logo : "",
         url_path_first : "",
         url_path_second : "",
         url_path_third : "",
      };

      try {
         const storeDesc = await Store.storeMediaImageV2(store_id);
         if(storeDesc.length > 0){
            for await (let gData of storeDesc) {
               if(gData.url_path !== undefined && gData.url_path !== null && gData.url_path !== ""){
                  if(parseInt(sNm) < 1){
                     oResult.url_path_logo = gData.url_path;
                  } else if(parseInt(sNm) > 0 && parseInt(sNm) < 2){
                     oResult.url_path_first = gData.url_path;
                  } else if(parseInt(sNm) > 1 && parseInt(sNm) < 3){
                     oResult.url_path_second = gData.url_path;
                  } else {
                     oResult.url_path_third = gData.url_path;
                  }
               }
               sNm += 1;
            }
         }
      } catch (error) {
         console.log("error",error);
      }
   
      res.status(200).json(oResult);
   }
}

StoreController.storeInfoDesc = async (req, res) => {
   const iUserId = req.user.user_id;
   
   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
   } else {
      let oResult = {};

      const store_id = req.params.store_id;
      const storeDesc = await Store.storeDesc(store_id);
      if(storeDesc != undefined && storeDesc != null){
         oResult.result_cd = "0000";
         oResult.url_path_logo = "";
         oResult.url_path_store = "";
         oResult.description = storeDesc[0].description;
         oResult.description_extra = storeDesc[0].description_extra;
         oResult.description_noti = storeDesc[0].description_noti;
   
         if(storeDesc[0].url_path != undefined && storeDesc[0].url_path != null){
            oResult.url_path_logo = storeDesc[0].url_path;
         }
         if(storeDesc[1].url_path != undefined && storeDesc[1].url_path != null){
            oResult.url_path_store = storeDesc[1].url_path;
         }
   
      } else {
         oResult.result_cd = "9999";
      }
   
      res.status(200).json(oResult);
   }
}

StoreController.noticeListByNm = async (req, res) => {
   const sText = req.body.sText;
   const iUserId = req.user.user_id;
   
   let oResult = {
      resultCd : "9999",
      resultData : [],
   };
   
   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
   } else {
      const result = await Store.noticeListByNm(sText);
      if(result.length > 0){
         oResult.resultCd = "0000";
         oResult.resultData = result;
      }
      res.status(200).json(oResult);
   }
}

StoreController.noticeListV2 = async (req, res) => {
   const today = moment().format('YYYY-MM-DD');
   const exDate = moment(today).add(-14, 'days').format("YYYY-MM-DD");
   let oResult = [];

   try {
      const result = await Store.noticeListV2();
      if(result !== undefined && result !== null){
         if(result.length > 0){
            for await (const iterator of result) {
               const sDate = moment(iterator.created_at).format('YYYY-MM-DD');
               const isBefore = moment(sDate).isBefore(exDate);
               
               let temp = {};
               temp.id = parseInt(iterator.notice_id);
               temp.title = iterator.title.toString();
               temp.content = iterator.content.toString();
               temp.date = sDate;
               temp.late = false;
               if(!isBefore){
                  temp.late = true;
               }
               oResult.push(temp);
            }
         }
      }
   } catch (error) {
      console.log("error",error);
   }
   
   res.status(200).json(oResult);
}

StoreController.noticeList = async (req, res) => {
   const countNm = req.params.countNm;

   let oResult = {
      resultCd : "9999",
      resultData : [],
      limit : false
   };

   try {
      const result = await Store.noticeList(parseInt(countNm));
      if(result.length > 0){
         oResult.resultCd = "0000";
         oResult.resultData = result;
         if(parseInt(result[0].count_index) <= parseInt(countNm)){
            oResult.limit = true;
         }
      }
   } catch (error) {
      console.log("error",error);
   }
   
   res.status(200).json(oResult);
}

StoreController.changeStatus = async (req, res) => {
   const storeId = req.body.store_id;
   const iStatus = req.body.status_id;
   let sResult = false;
   
   try {
      if(parseInt(iStatus) < 1){
         const statusStore = await Store.storeOperationSleep(storeId);
         if(statusStore){
            sResult = true;
         }
      } else {
         const statusStore = await Store.storeOperationWakeUp(storeId);
         if(statusStore){
            sResult = true;
         }
      }
   } catch (error) {
      console.log("changeStatus fail! ====>> error:", error);
   }

   res.status(200).json(sResult);
}

StoreController.storeOperationController = async (req, res) => {
   console.log("req.body",req.body);
   const storeId = req.body.store_id;
   const iStatus = req.body.status_id;
   let sResult = false;
   
   try {
      if(parseInt(iStatus) < 1){
         const statusStore = await Store.storeOperationSleep(storeId);
         if(statusStore){
            sResult = true;
         }
      } else {
         const statusStore = await Store.storeOperationWakeUp(storeId);
         if(statusStore){
            sResult = true;
         }
      }
   } catch (error) {
      console.log("changeStatus fail! ====>> error:", error);
   }

   res.status(200).json(sResult);
}

StoreController.storeInfoShortly = async (req, res) => {
   const store_id = req.params.store_id;
   const iUserId = req.user.user_id;

   let oResult = {};

   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
   } else {
      const result = await Store.storeInfoShortly(parseInt(store_id));
      if(result != undefined){
         oResult.resultCd = "0000";
         if(result[0].url_path != null){
            oResult.url_path = result[0].url_path;
         } else {
            oResult.url_path = "https://api-stg.ivid.kr/img/no-image-new.png";
         }
         oResult.pause = result[0].pause;
         oResult.status = result[0].status;
      } else {
         oResult.resultCd = "1111";
      }
      res.status(200).json(oResult);
   }
}


StoreController.storeInfo = async (req, res) => {
   const store_id = req.params.store_id;
   const iUserId = req.user.user_id;

   let oResult = {};
   let sResult = {};
   let receipt = 0;
   let confirm = 0;
   let ready = 0;
   let complete = 0;
   let cancel = 0;
   let iCount = 0;
   let aResult = [];
   let week = [];

   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
   } else {
      let todate = moment().format("YYYY-MM-DD");
      let afterDate = moment().add(1, 'days').format("YYYY-MM-DD");
      const result = await Store.getStoreInfo(parseInt(store_id), todate, afterDate);
      if(result != undefined){
         oResult.resultCd = "0000";
         if(result[0].price != null){
            oResult.price = convertToKRW(parseFloat(result[0].price), true);
         } else {
            oResult.price = "₩" + 0;
         }
         oResult.pause = result[0].pause;
         oResult.status = result[0].status;
         oResult.today = moment().format('LLL');
      } else {
         oResult.resultCd = "1111";
      }

      const getOrderList = await Store.getOrderList(parseInt(store_id), todate, afterDate);
      if(getOrderList.length > 0) {
         for await (let e of getOrderList) {
            if (e.state_id.toString() === "12001" || (e.state_id.toString() === "12002") || (e.state_id.toString() === "12003") || (e.state_id.toString() === "12004")) {
               confirm = confirm + 1;
            } else if (e.state_id.toString() === "13001" || (e.state_id.toString() === "13002")) {
               ready = ready + 1;

            } else if ((e.state_id.toString() === "14002") || (e.state_id.toString() === "14003")) {
               receipt = receipt + 1;
               
            } else if (e.state_id.toString() === "14004" || (e.state_id.toString() === "14005") || (e.state_id.toString() === "16001") || (e.state_id.toString() === "17001") || (e.state_id.toString() === "18001")) {
               cancel = cancel + 1;
            } else if ((e.state_id.toString() === "15002") || (e.state_id.toString() === "16002")) {
               complete = complete + 1;

            }
         }
      }

      sResult.resultCd = "0000";
      sResult.receipt = receipt;
      sResult.confirm = confirm;
      sResult.ready = ready;
      sResult.complete = complete;
      sResult.cancel = cancel;

      for await (let nIndex of asyncGenerator(7)) {
         let tempList = {};
         let tempPrice = 0;
         let sDay = moment().add(-iCount, 'days').format('MM-DD');
         let temp = moment().add(-iCount, 'days').format("YYYY-MM-DD");
         let preDate = temp + " 00:00:00";
         let sAfterDate = moment(temp).add(1, 'days').format("YYYY-MM-DD");
         sAfterDate = sAfterDate + " 00:00:00";
         const settlementOfSalesDay = await Store.doubleChartForDay(parseInt(store_id), preDate, sAfterDate);
   
         if(settlementOfSalesDay[0].count != null){
            tempPrice = parseInt(settlementOfSalesDay[0].count);
         }
         tempList.type = sDay;
         tempList.count = tempPrice;
         aResult.push(tempList);
         iCount += 1;
      }
      
      res.status(200).json({oResult, sResult, aResult});
   }
}

StoreController.storeDetailNoPermission = async (req, res) => {
   const store_id = req.params.store_id;

   let oResult = {};

   if(store_id != undefined && store_id != null && store_id > 0){
      const storeDesc = await Store.storeDesc(store_id);
      if(storeDesc != undefined && storeDesc != null){
         oResult.result_cd = "0000";
         
         oResult.sLat = storeDesc[0].lat
         oResult.sLng = storeDesc[0].lng
         oResult.sParkingImg = storeDesc[0].parking_image
         oResult.sParkingTime = storeDesc[0].parking_time.toString() + "분"
         oResult.sNotiValue = storeDesc[0].noti_nearby_distance.toString() + "m"
         oResult.sAdress = storeDesc[0].address1
         
         const storeOrderType = await Store.storeOrderType(store_id);
         if(storeOrderType != undefined && storeOrderType != null && storeOrderType.length > 0){
            oResult.opening_time = storeOrderType[0].opening_time;
            oResult.closeing_time = storeOrderType[0].closing_time;

            if(storeOrderType[0].breaktime_from != null){
               oResult.isBreakTime = true;
               oResult.breaktime_from = storeOrderType[0].breaktime_from;
               oResult.breaktime_to = storeOrderType[0].breaktime_to;
            } else {
               oResult.isBreakTime = false;
               oResult.breaktime_from = "00:00";
               oResult.breaktime_to = "00:00";
            }

            if(storeOrderType[0].all_time > 0){
               oResult.allTime = false;
            } else {
               oResult.allTime = true;
            }

            const getOrderTimeCongestion = await Store.getOrderTimeCongestion(storeOrderType[0].store_time_id);
            if(parseInt(getOrderTimeCongestion[0].congestion_type) < 1){
               oResult.orderTime = "easy";
            } else if(parseInt(getOrderTimeCongestion[0].congestion_type) > 0 && parseInt(getOrderTimeCongestion[0].congestion_type) < 2){
               oResult.orderTime = "normal";
            } else if(parseInt(getOrderTimeCongestion[0].congestion_type) > 1 && parseInt(getOrderTimeCongestion[0].congestion_type) < 3){
               oResult.orderTime = "busy";
            }

            const checkOptionBoth = await Store.checkOptionBoth(storeOrderType[0].store_time_id);
            if(checkOptionBoth.length > 0){
               let sList = [];
               for await (let x of checkOptionBoth) {
                  let temp = {};
                  temp.from = x.time_from;
                  temp.to = x.time_to;
                  if(parseInt(x.congestion_type) < 1){
                     temp.selectValue = "easy";
                  } else if(parseInt(x.congestion_type) > 0 && parseInt(x.congestion_type) < 2){
                     temp.selectValue = "normal";
                  } else if(parseInt(x.congestion_type) > 1 && parseInt(x.congestion_type) < 3){
                     temp.selectValue = "busy";
                  }
                  sList.push(temp);
               }
               oResult.congestionList = sList;
               oResult.congestion = true;
            } else {
               oResult.congestion = false;
            }
            oResult.date_type = "daily";

         } else {
            const weeklyOrderTimeList = await Store.weeklyOrderTimeList(store_id);
            if(weeklyOrderTimeList.length > 0){
               let sList = [];
               for await (let i of weeklyOrderTimeList) {
                  if(parseInt(i.day_of_week) > 0 && parseInt(i.day_of_week) < 2 ){
                     let operateList = {};
                     operateList.mOperatingList = {};
                     operateList.mOptionList = [];
                     operateList.mOperatingList.openTime = i.opening_time;
                     operateList.mOperatingList.closeTime = i.closing_time;
   
                     if(i.breaktime_from != null){
                        operateList.mOperatingList.isBreakTime = true
                        operateList.mOperatingList.breakFrom = i.breaktime_from;
                        operateList.mOperatingList.breakTo = i.breaktime_to;
                     } else {
                        operateList.mOperatingList.isBreakTime = false
                        operateList.mOperatingList.breakFrom = "00:00";
                        operateList.mOperatingList.breakTo = "00:00";
                     }
                     
                     if(i.all_time > 0){
                        operateList.mOperatingList.allDay = false;
                     } else {
                        operateList.mOperatingList.allDay = true;
                     }

                     const getOrderTimeCongestion = await Store.getOrderTimeCongestion(i.store_time_id);
                     if(parseInt(getOrderTimeCongestion[0].congestion_type) < 1){
                        operateList.mOperatingList.orderTime = "easy";
                     } else if(parseInt(getOrderTimeCongestion[0].congestion_type) > 0 && parseInt(getOrderTimeCongestion[0].congestion_type) < 2){
                        operateList.mOperatingList.orderTime = "normal";
                     } else if(parseInt(getOrderTimeCongestion[0].congestion_type) > 1 && parseInt(getOrderTimeCongestion[0].congestion_type) < 3){
                        operateList.mOperatingList.orderTime = "busy";
                     }

                     const checkOptionBoth = await Store.checkOptionBoth(i.store_time_id);
                     if(checkOptionBoth.length > 0){
                        for await (let x of checkOptionBoth) {
                           let temp = {};
                           temp.from = x.time_from;
                           temp.to = x.time_to;
                           if(parseInt(x.congestion_type) < 1){
                              temp.selectValue = "easy";
                           } else if(parseInt(x.congestion_type) > 0 && parseInt(x.congestion_type) < 2){
                              temp.selectValue = "normal";
                           } else if(parseInt(x.congestion_type) > 1 && parseInt(x.congestion_type) < 3){
                              temp.selectValue = "busy";
                           }
                           operateList.mOptionList.push(temp);
                        }
                        operateList.mOperatingList.isCongestion = true;
                        
                     } else {
                        operateList.mOperatingList.isCongestion = false;
                     }
                     sList.push(operateList);

                  } else if(i.day_of_week > 1 && i.day_of_week < 3 ){
                     let operateList = {};
                     operateList.tOperatingList = {};
                     operateList.tOptionList = [];
                     operateList.tOperatingList.openTime = i.opening_time;
                     operateList.tOperatingList.closeTime = i.closing_time;
   
                     if(i.breaktime_from != null){
                        operateList.tOperatingList.isBreakTime = true
                        operateList.tOperatingList.breakFrom = i.breaktime_from;
                        operateList.tOperatingList.breakTo = i.breaktime_to;
                     } else {
                        operateList.tOperatingList.isBreakTime = false
                        operateList.tOperatingList.breakFrom = "00:00";
                        operateList.tOperatingList.breakTo = "00:00";
                     }
                     
                     if(i.all_time > 0){
                        operateList.tOperatingList.allDay = false;
                     } else {
                        operateList.tOperatingList.allDay = true;
                     }

                     const getOrderTimeCongestion = await Store.getOrderTimeCongestion(i.store_time_id);
                     if(parseInt(getOrderTimeCongestion[0].congestion_type) < 1){
                        operateList.tOperatingList.orderTime = "easy";
                     } else if(parseInt(getOrderTimeCongestion[0].congestion_type) > 0 && parseInt(getOrderTimeCongestion[0].congestion_type) < 2){
                        operateList.tOperatingList.orderTime = "normal";
                     } else if(parseInt(getOrderTimeCongestion[0].congestion_type) > 1 && parseInt(getOrderTimeCongestion[0].congestion_type) < 3){
                        operateList.tOperatingList.orderTime = "busy";
                     }

                     const checkOptionBoth = await Store.checkOptionBoth(i.store_time_id);
                     if(checkOptionBoth.length > 0){
                        for await (let x of checkOptionBoth) {
                           let temp = {};
                           temp.from = x.time_from;
                           temp.to = x.time_to;
                           if(parseInt(x.congestion_type) < 1){
                              temp.selectValue = "easy";
                           } else if(parseInt(x.congestion_type) > 0 && parseInt(x.congestion_type) < 2){
                              temp.selectValue = "normal";
                           } else if(parseInt(x.congestion_type) > 1 && parseInt(x.congestion_type) < 3){
                              temp.selectValue = "busy";
                           }
                           operateList.tOptionList.push(temp);
                        }
                        operateList.tOperatingList.isCongestion = true;
                        
                     } else {
                        operateList.tOperatingList.isCongestion = false;
                     }
                     sList.push(operateList);

                  } else if(i.day_of_week > 2 && i.day_of_week < 4 ){
                     let operateList = {};
                     operateList.wOperatingList = {};
                     operateList.wOptionList = [];
                     operateList.wOperatingList.openTime = i.opening_time;
                     operateList.wOperatingList.closeTime = i.closing_time;
   
                     if(i.breaktime_from != null){
                        operateList.wOperatingList.isBreakTime = true
                        operateList.wOperatingList.breakFrom = i.breaktime_from;
                        operateList.wOperatingList.breakTo = i.breaktime_to;
                     } else {
                        operateList.wOperatingList.isBreakTime = false
                        operateList.wOperatingList.breakFrom = "00:00";
                        operateList.wOperatingList.breakTo = "00:00";
                     }
                     
                     if(i.all_time > 0){
                        operateList.wOperatingList.allDay = false;
                     } else {
                        operateList.wOperatingList.allDay = true;
                     }

                     const getOrderTimeCongestion = await Store.getOrderTimeCongestion(i.store_time_id);
                     if(parseInt(getOrderTimeCongestion[0].congestion_type) < 1){
                        operateList.wOperatingList.orderTime = "easy";
                     } else if(parseInt(getOrderTimeCongestion[0].congestion_type) > 0 && parseInt(getOrderTimeCongestion[0].congestion_type) < 2){
                        operateList.wOperatingList.orderTime = "normal";
                     } else if(parseInt(getOrderTimeCongestion[0].congestion_type) > 1 && parseInt(getOrderTimeCongestion[0].congestion_type) < 3){
                        operateList.wOperatingList.orderTime = "busy";
                     }

                     const checkOptionBoth = await Store.checkOptionBoth(i.store_time_id);
                     if(checkOptionBoth.length > 0){
                        for await (let x of checkOptionBoth) {
                           let temp = {};
                           temp.from = x.time_from;
                           temp.to = x.time_to;
                           if(parseInt(x.congestion_type) < 1){
                              temp.selectValue = "easy";
                           } else if(parseInt(x.congestion_type) > 0 && parseInt(x.congestion_type) < 2){
                              temp.selectValue = "normal";
                           } else if(parseInt(x.congestion_type) > 1 && parseInt(x.congestion_type) < 3){
                              temp.selectValue = "busy";
                           }
                           operateList.wOptionList.push(temp);
                        }
                        operateList.wOperatingList.isCongestion = true;
                        
                     } else {
                        operateList.wOperatingList.isCongestion = false;
                     }
                     sList.push(operateList);

                  } else if(i.day_of_week > 3 && i.day_of_week < 5 ){
                     let operateList = {};
                     operateList.thOperatingList = {};
                     operateList.thOptionList = [];
                     operateList.thOperatingList.openTime = i.opening_time;
                     operateList.thOperatingList.closeTime = i.closing_time;
   
                     if(i.breaktime_from != null){
                        operateList.thOperatingList.isBreakTime = true
                        operateList.thOperatingList.breakFrom = i.breaktime_from;
                        operateList.thOperatingList.breakTo = i.breaktime_to;
                     } else {
                        operateList.thOperatingList.isBreakTime = false
                        operateList.thOperatingList.breakFrom = "00:00";
                        operateList.thOperatingList.breakTo = "00:00";
                     }
                     
                     if(i.all_time > 0){
                        operateList.thOperatingList.allDay = false;
                     } else {
                        operateList.thOperatingList.allDay = true;
                     }

                     const getOrderTimeCongestion = await Store.getOrderTimeCongestion(i.store_time_id);
                     if(parseInt(getOrderTimeCongestion[0].congestion_type) < 1){
                        operateList.thOperatingList.orderTime = "easy";
                     } else if(parseInt(getOrderTimeCongestion[0].congestion_type) > 0 && parseInt(getOrderTimeCongestion[0].congestion_type) < 2){
                        operateList.thOperatingList.orderTime = "normal";
                     } else if(parseInt(getOrderTimeCongestion[0].congestion_type) > 1 && parseInt(getOrderTimeCongestion[0].congestion_type) < 3){
                        operateList.thOperatingList.orderTime = "busy";
                     }

                     const checkOptionBoth = await Store.checkOptionBoth(i.store_time_id);
                     if(checkOptionBoth.length > 0){
                        for await (let x of checkOptionBoth) {
                           let temp = {};
                           temp.from = x.time_from;
                           temp.to = x.time_to;
                           if(parseInt(x.congestion_type) < 1){
                              temp.selectValue = "easy";
                           } else if(parseInt(x.congestion_type) > 0 && parseInt(x.congestion_type) < 2){
                              temp.selectValue = "normal";
                           } else if(parseInt(x.congestion_type) > 1 && parseInt(x.congestion_type) < 3){
                              temp.selectValue = "busy";
                           }
                           operateList.thOptionList.push(temp);
                        }
                        operateList.thOperatingList.isCongestion = true;
                        
                     } else {
                        operateList.thOperatingList.isCongestion = false;
                     }
                     sList.push(operateList);

                  } else if(i.day_of_week > 4 && i.day_of_week < 6 ){
                     let operateList = {};
                     operateList.fOperatingList = {};
                     operateList.fOptionList = [];
                     operateList.fOperatingList.openTime = i.opening_time;
                     operateList.fOperatingList.closeTime = i.closing_time;
   
                     if(i.breaktime_from != null){
                        operateList.fOperatingList.isBreakTime = true
                        operateList.fOperatingList.breakFrom = i.breaktime_from;
                        operateList.fOperatingList.breakTo = i.breaktime_to;
                     } else {
                        operateList.fOperatingList.isBreakTime = false
                        operateList.fOperatingList.breakFrom = "00:00";
                        operateList.fOperatingList.breakTo = "00:00";
                     }
                     
                     if(i.all_time > 0){
                        operateList.fOperatingList.allDay = false;
                     } else {
                        operateList.fOperatingList.allDay = true;
                     }

                     const getOrderTimeCongestion = await Store.getOrderTimeCongestion(i.store_time_id);
                     if(parseInt(getOrderTimeCongestion[0].congestion_type) < 1){
                        operateList.fOperatingList.orderTime = "easy";
                     } else if(parseInt(getOrderTimeCongestion[0].congestion_type) > 0 && parseInt(getOrderTimeCongestion[0].congestion_type) < 2){
                        operateList.fOperatingList.orderTime = "normal";
                     } else if(parseInt(getOrderTimeCongestion[0].congestion_type) > 1 && parseInt(getOrderTimeCongestion[0].congestion_type) < 3){
                        operateList.fOperatingList.orderTime = "busy";
                     }

                     const checkOptionBoth = await Store.checkOptionBoth(i.store_time_id);
                     if(checkOptionBoth.length > 0){
                        for await (let x of checkOptionBoth) {
                           let temp = {};
                           temp.from = x.time_from;
                           temp.to = x.time_to;
                           if(parseInt(x.congestion_type) < 1){
                              temp.selectValue = "easy";
                           } else if(parseInt(x.congestion_type) > 0 && parseInt(x.congestion_type) < 2){
                              temp.selectValue = "normal";
                           } else if(parseInt(x.congestion_type) > 1 && parseInt(x.congestion_type) < 3){
                              temp.selectValue = "busy";
                           }
                           operateList.fOptionList.push(temp);
                        }
                        operateList.fOperatingList.isCongestion = true;
                        
                     } else {
                        operateList.fOperatingList.isCongestion = false;
                     }
                     sList.push(operateList);

                  } else if(i.day_of_week > 5 && i.day_of_week < 7 ){
                     let operateList = {};
                     operateList.sOperatingList = {};
                     operateList.sOptionList = [];
                     operateList.sOperatingList.openTime = i.opening_time;
                     operateList.sOperatingList.closeTime = i.closing_time;
   
                     if(i.breaktime_from != null){
                        operateList.sOperatingList.isBreakTime = true
                        operateList.sOperatingList.breakFrom = i.breaktime_from;
                        operateList.sOperatingList.breakTo = i.breaktime_to;
                     } else {
                        operateList.sOperatingList.isBreakTime = false
                        operateList.sOperatingList.breakFrom = "00:00";
                        operateList.sOperatingList.breakTo = "00:00";
                     }
                     
                     if(i.all_time > 0){
                        operateList.sOperatingList.allDay = false;
                     } else {
                        operateList.sOperatingList.allDay = true;
                     }

                     const getOrderTimeCongestion = await Store.getOrderTimeCongestion(i.store_time_id);
                     if(parseInt(getOrderTimeCongestion[0].congestion_type) < 1){
                        operateList.sOperatingList.orderTime = "easy";
                     } else if(parseInt(getOrderTimeCongestion[0].congestion_type) > 0 && parseInt(getOrderTimeCongestion[0].congestion_type) < 2){
                        operateList.sOperatingList.orderTime = "normal";
                     } else if(parseInt(getOrderTimeCongestion[0].congestion_type) > 1 && parseInt(getOrderTimeCongestion[0].congestion_type) < 3){
                        operateList.sOperatingList.orderTime = "busy";
                     }

                     const checkOptionBoth = await Store.checkOptionBoth(i.store_time_id);
                     if(checkOptionBoth.length > 0){
                        for await (let x of checkOptionBoth) {
                           let temp = {};
                           temp.from = x.time_from;
                           temp.to = x.time_to;
                           if(parseInt(x.congestion_type) < 1){
                              temp.selectValue = "easy";
                           } else if(parseInt(x.congestion_type) > 0 && parseInt(x.congestion_type) < 2){
                              temp.selectValue = "normal";
                           } else if(parseInt(x.congestion_type) > 1 && parseInt(x.congestion_type) < 3){
                              temp.selectValue = "busy";
                           }
                           operateList.sOptionList.push(temp);
                        }
                        operateList.sOperatingList.isCongestion = true;
                        
                     } else {
                        operateList.sOperatingList.isCongestion = false;
                     }
                     sList.push(operateList);

                  } else if(i.day_of_week < 1){
                     let operateList = {};
                     operateList.suOperatingList = {};
                     operateList.suOptionList = [];
                     operateList.suOperatingList.openTime = i.opening_time;
                     operateList.suOperatingList.closeTime = i.closing_time;
   
                     if(i.breaktime_from != null){
                        operateList.suOperatingList.isBreakTime = true
                        operateList.suOperatingList.breakFrom = i.breaktime_from;
                        operateList.suOperatingList.breakTo = i.breaktime_to;
                     } else {
                        operateList.suOperatingList.isBreakTime = false
                        operateList.suOperatingList.breakFrom = "00:00";
                        operateList.suOperatingList.breakTo = "00:00";
                     }
                     
                     if(i.all_time > 0){
                        operateList.suOperatingList.allDay = false;
                     } else {
                        operateList.suOperatingList.allDay = true;
                     }

                     const getOrderTimeCongestion = await Store.getOrderTimeCongestion(i.store_time_id);
                     if(parseInt(getOrderTimeCongestion[0].congestion_type) < 1){
                        operateList.suOperatingList.orderTime = "easy";
                     } else if(parseInt(getOrderTimeCongestion[0].congestion_type) > 0 && parseInt(getOrderTimeCongestion[0].congestion_type) < 2){
                        operateList.suOperatingList.orderTime = "normal";
                     } else if(parseInt(getOrderTimeCongestion[0].congestion_type) > 1 && parseInt(getOrderTimeCongestion[0].congestion_type) < 3){
                        operateList.suOperatingList.orderTime = "busy";
                     }

                     const checkOptionBoth = await Store.checkOptionBoth(i.store_time_id);
                     if(checkOptionBoth.length > 0){
                        for await (let x of checkOptionBoth) {
                           let temp = {};
                           temp.from = x.time_from;
                           temp.to = x.time_to;
                           if(parseInt(x.congestion_type) < 1){
                              temp.selectValue = "easy";
                           } else if(parseInt(x.congestion_type) > 0 && parseInt(x.congestion_type) < 2){
                              temp.selectValue = "normal";
                           } else if(parseInt(x.congestion_type) > 1 && parseInt(x.congestion_type) < 3){
                              temp.selectValue = "busy";
                           }
                           operateList.suOptionList.push(temp);
                        }
                        operateList.suOperatingList.isCongestion = true;
                        
                     } else {
                        operateList.suOperatingList.isCongestion = false;
                     }
                     sList.push(operateList);
                  } 
               }
               oResult.date_type = "weekly";
               oResult.totalList = sList;
            } else {
               oResult.date_type = "none";
            }
         }
      } else {
         oResult.result_cd = "9999";
      }
   }
   res.status(200).json(oResult);
}

StoreController.deleteImage = async (req, res) => {
   const iUserId = req.user.user_id;
   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
   } else {
      const storeId = req.body.store_id;
      const imageType = req.body.imageType;
   
      let sType = null;
      let sResult = false;

      try {
         const getMediaId = await Store.getMediaId(storeId);
         if(imageType === "logo_file"){
            sType = getMediaId[0].media_id;
         } else if (imageType === "menu1_file"){
            sType = getMediaId[1].media_id;
         } else if (imageType === "menu2_file"){
            sType = getMediaId[2].media_id;
         } else {
            sType = getMediaId[3].media_id;
         }

         if(sType !== null){
            const result = await Store.deleteStoreMediaData(sType,storeId);
            if(result !== undefined){
               sResult = true;
            }
         }
      } catch (error) {
         console.log("error",error);
      }
      res.status(200).json(sResult);
   }
   
}

StoreController.registerImageV2 = async (req, res) => {
   const iUserId = req.user.user_id;
   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
   } else {
      const storeId = req.body.store_id;
      const imgData = req.body.imgData;
      const imageType = req.body.imageType;
   
      let sType = null;
      let sResult = false;

      try {
         const getMediaId = await Store.getMediaId(storeId);
         if(imageType === "logo_file"){
            sType = getMediaId[0].media_id;
         } else if (imageType === "menu1_file"){
            sType = getMediaId[1].media_id;
         } else if (imageType === "menu2_file"){
            sType = getMediaId[2].media_id;
         } else {
            sType = getMediaId[3].media_id;
         }

         if(sType !== null){
            const result = await Store.updateStoreMediaData(imgData,sType,storeId);
            if(result !== undefined){
               sResult = true;
            }
         }
      } catch (error) {
         console.log("error",error);
      }
      res.status(200).json(sResult);
   }
   
}

StoreController.registerImage = async (req, res) => {
   const storeId = req.body.store_id;
   const logoImg = req.body.logoImg;
   const firstImg = req.body.firstImg;
   const secondImg = req.body.secondImg;
   const thirdImg = req.body.thirdImg;

   const iUserId = req.user.user_id;

   let sResult = false;
   
   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
   } else {
      try {
         const getMediaId = await Store.getMediaId(storeId);
         const result = await Store.imagesContentUpdate(getMediaId[0].media_id,getMediaId[1].media_id,getMediaId[2].media_id,getMediaId[3].media_id,logoImg,firstImg,secondImg,thirdImg);
         if(result === "0000"){
            sResult = true;
         }
      } catch (error) {
         console.log("error",error);
      }
      res.status(200).json(sResult);
   }
   
}

StoreController.orderTime = async (req, res) => {
   const iUserId = req.user.user_id;
   const storeId = req.body.store_id;
   
   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
   } else {
      let sResult = false;
      let oWalkTime = "";

      try {
         let otFirst = req.body.sEasy;
         let otMiddle = req.body.sNormal;
         let otLast = req.body.sBusy;

         if(req.body.sWalkThroo !== undefined && req.body.sWalkThroo !== null && req.body.sWalkThroo !== ""){
            oWalkTime = req.body.sWalkThroo;
            const checkUp = await Store.checkWalkThrooCongestionTime(storeId);
            if(checkUp.length > 0) {} else {
                await Store.insertWalkThrooCongestionTime(oWalkTime,storeId);
            }
        }

         const result = await Store.orderTimeUpdate(otFirst,otMiddle,otLast,oWalkTime,storeId);
         if(result === "0000"){
            sResult = true;
         }
         
      } catch (error) {
         console.log("error",error);
      }

      res.status(200).json(sResult);
   }
}

StoreController.operatingTime = async (req, res) => {
   const iUserId = req.user.user_id;

   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
   } else {
      const type = req.body.type;
      const store_id = req.body.store_id;
   
      let sResult = false;
   
      if(type === "daily"){
         const operatingList = req.body.operatingList;
         const option = req.body.option;
      
         const openTime = operatingList.openTime;
         const closeTime = operatingList.closeTime;
         const orderTime = operatingList.orderTime;
         const isBreakTime = operatingList.isBreakTime;
         const isAlltime = operatingList.allDay;
      
         let breakFrom = null;
         let breakTo = null;
         
         let c_type;
         let sData = "none";
   
         if(orderTime === "easy"){
            c_type = 0
         } else if(orderTime === "normal"){
            c_type = 1
         } else {
            c_type = 2
         }
   
         if(isBreakTime){
            breakFrom = operatingList.breakFrom
            breakTo = operatingList.breakTo
         }
   
         if(option === "width"){
            sData = req.body.dataSource;
         }
         let alltime = 1;
         if(isAlltime){
            alltime = 0;
         }
   
         const result = await Store.storeTimeBusiness(store_id,openTime,closeTime,breakFrom,breakTo,7,1,c_type, sData, alltime);
         if(result === "0000"){
            sResult = true;
         }
      } else {
         const operating = req.body.sList;
         const result = await Store.storeTimeWeeklyBusiness(store_id,operating);
         if(result === "0000"){
            sResult = true;
         }
      }
   
      res.status(200).json(sResult);
   }

}

StoreController.pickUpZone = async (req, res) => {
   const iUserId = req.user.user_id;

   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
   } else {
      const storeId = req.body.store_id;
      const parkingImg = req.body.parkingUpload;
      const userLat = req.body.userLat;
      const userLng = req.body.userLng;

      let sResult = false;

      try {
         const result = await Store.parkingDetailUpdate(storeId,parkingImg,userLat,userLng);
         if(result != undefined){
            sResult = true;
         }
      } catch (error) {
         console.log("error",error);
      }
      
      res.status(200).json(sResult);
   }

}

StoreController.insertCategory = async (req, res) => {
   const iUserId = req.user.user_id;

   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
   } else {
      const storeId = req.body.store_id;
      const storeNm = req.body.storeName;
      const sContent = req.body.sContent;

      let menuId = req.body.menuId;
      let isMain = req.body.isMain;
      let isUse = req.body.isUse;
      let isProcess = true;
      let oResult = {
         resultCd : "9999",
         resultMsg : "네트워크에러입니다 잠시 후 다시 시도바랍니다"
      };

      try {
         if(menuId === "none"){
            let sName = storeNm + "메뉴";
            const insert = await Store.insertMenuId(sName,storeId);
            if(insert[0] != undefined){
               menuId = insert[0];
            } else {
               isProcess = false;
            }
         }
         
         if(isMain === "yes"){
            isMain = 1;
         } else {
            isMain = 0;
         }
         if(isUse === "unused"){
            isUse = 0;
         } else {
            isUse = 1;
         }

         let sCount = await Store.categoryListLength(menuId);
         if(sCount != undefined && sCount != null){
            if(sCount[0].count != null){
               sCount = parseInt(sCount[0].count) + 1;
            } else {
               sCount = 0;
            }
         } else {
            isProcess = false;
         }

         let checkTitle = await Store.checkCategoryTitle(menuId,sContent);
         if(checkTitle != undefined && checkTitle != null){
            if(checkTitle[0].count > 0){
               isProcess = false;
               oResult.resultCd = "8888";
               oResult.resultMsg = "같은 이름의 카테고리가 존재합니다";
            }
         } else {
            isProcess = false;
         }

         if(isProcess){
            const insertCategory = await Store.insertCategory(menuId, sContent, isMain, isUse, sCount);
            if(insertCategory[0] != undefined){
               oResult.resultCd = "0000";
               oResult.resultMsg = "등록되었습니다";
            }
         }
      } catch (error) {
         console.log("StoreController.insertCategoryV2 fail !!!!=======> ",error);
      }
      res.status(200).json(oResult);
   }
}

StoreController.deleteCategory = async (req, res) => {
   const categoryId = req.body.category_id;
   const iUserId = req.user.user_id;

   let oResult = false;

   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
   } else {
      try {
         const result = await Store.deleteCategory(categoryId);
         if(result != undefined){
            oResult = true;
         } 
      } catch (error) {
         console.log("error",error);
      }
      res.status(200).json(oResult);
   }
}


StoreController.editCategoryList = async (req, res) => {
   const sContent = req.body.sContent;
   const menuId = req.body.menuId;
   const iUserId = req.user.user_id;

   let isMain = req.body.isMain;
   let isUse = req.body.isUse;

   let oResult = false;
   
   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
   } else {
      try {
         if(isMain === "yes"){
            isMain = 1;
         } else {
            isMain = 0;
         }
         if(isUse === "unused"){
            isUse = 0;
         } else {
            isUse = 1;
         }
   
         const result = await Store.editcategory(sContent,menuId,isMain,isUse);
         if(result != undefined){
            oResult = true;
         } 
      } catch (error) {
         console.log("error",error);
      }
      res.status(200).json(oResult);
   }
}

StoreController.changeIndexCategory = async (req, res) => {
   const iUserId = req.user.user_id;
   const sList = req.body.sIndex;

   let oResult = {
      resultCd : "9999",
      resultMsg : "네트워크에러입니다 잠시 후 다시 시도바랍니다"
   };

   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
   } else {
      try {
         if(sList.length > 1){
            const result = await Store.categorySwitch(sList);
            if(result === "0000"){
               oResult.resultCd = "0000";
               oResult.resultMsg = "변경되었습니다";
            }
         } else {
            oResult.resultCd = "8888";
         }
      } catch (error) {
         console.log("error",error);
      }
   
      res.status(200).json(oResult);
   }
}

StoreController.insertOptionV2 = async (req, res) => {
   const iUserId = req.user.user_id;

   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
   } else {
      const sData = req.body.sData;
      const store_id = req.body.store_id;
      
      let type = req.body.type;
      let isProcess = true;
      let count = 0;
      let sMin = 0;
      let sGroupTitle = req.body.sGroupTitle;
      let oResult = {
         resultCd : "9999",
         resultMsg : "네트워크에러입니다 잠시 후 다시 시도바랍니다"
      };
      try {
         if(sData.length > 0){
            if(type === "radioDouble"){
               sMin = parseInt(req.body.minCount);
               count = parseInt(req.body.minCount);
               type = "checkbox";
               
               if(sData.length < sMin){
                  isProcess = false;
                  oResult.resultCd = "7777";
                  oResult.resultMsg = "최소 선택가능 횟수가 입력된 옵션보다 큽니다";
               }
            } else if (type === "checkbox"){
               count = parseInt(req.body.maxCount);
               
               if(sData.length < count){
                  isProcess = false;
                  oResult.resultCd = "7777";
                  oResult.resultMsg = "최대 선택가능 횟수가 입력된 옵션보다 큽니다";
               }
            } else {
               type = "radio";
            }
            
            const checkOptionGroupNm = await Store.checkOptionGroupNm(store_id,sGroupTitle);
            if (checkOptionGroupNm !== undefined && checkOptionGroupNm !== null && checkOptionGroupNm !== '') {
               isProcess = false;
               oResult.resultCd = "7777";
               oResult.resultMsg = "동일한 옵션의 이름이 존재합니다.";
            }

            if(isProcess){
               const makeOption = await Store.makeOption(store_id,sGroupTitle,type,count,sMin,sData);
               if(makeOption === "0000"){
                  oResult.resultCd = "0000";
                  oResult.resultMsg = "등록되었습니다";
               }
            }
         } else {
            oResult.resultCd = "8888";
            oResult.resultMsg = "옵션리스트를 작성해주세요";
         }
      } catch (error) {
         console.log("error",error);
      }
   
      res.status(200).json(oResult);
   }
}

StoreController.insertOption = async (req, res) => {
   const iUserId = req.user.user_id;

   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
   } else {
      const sData = req.body.sData;
      const store_id = req.body.store_id;
      const type = req.body.type;
   
      let isProcess = true;
      let count = 0;
      let sGroupTitle = req.body.sGroupTitle;
      let oResult = {
         resultCd : "9999",
         resultMsg : "네트워크에러입니다 잠시 후 다시 시도바랍니다"
      };
   
      try {
         if(sData.length > 0){
            if(req.body.maxCount != undefined){
               count = parseInt(req.body.maxCount);
            }
            if(sData.length < count){
               isProcess = false;
               oResult.resultCd = "7777";
               oResult.resultMsg = "최대 선택가능 횟수가 입력된 옵션보다 큽니다";
            }
   
            if(isProcess){
               const makeOption = await Store.makeOption(store_id,sGroupTitle,type,count,sData);
               if(makeOption === "0000"){
                  oResult.resultCd = "0000";
                  oResult.resultMsg = "등록되었습니다";
               }
            }
         } else {
            oResult.resultCd = "8888";
            oResult.resultMsg = "옵션리스트를 작성해주세요";
         }
      } catch (error) {
         console.log("error",error);
      }
   
      res.status(200).json(oResult);
   }
}
StoreController.registerMenu = async (req, res) => {
   const iUserId = req.user.user_id;

   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
   } else {
      const sFileList = req.body.sFileList;
      const sTitle = req.body.sTitle;
      const sCategory = req.body.sCategory;
      const iPrice = req.body.iPrice;
      const options = req.body.options;
      const optionYn = req.body.optionYn;
      const sDesc = req.body.sDesc;
      const store_id = req.body.store_id;
   
      let oResult = {
         resultCd : "9999",
         resultMsg : "네트워크에러입니다 잠시 후 다시 시도바랍니다"
      };
   
      try {
         if(sTitle === ""){
            oResult.resultCd = "1111";
            oResult.resultMsg = "메뉴명을 입력하세요"
   
         } else if (parseInt(iPrice) == null){
            oResult.resultCd = "2222";
            oResult.resultMsg = "가격을 입력하세요";
   
         } else if (sCategory == null || sCategory == undefined){
            oResult.resultCd = "3333";
            oResult.resultMsg = "카테고리를 선택하세요";
   
         } else {
            let process = true;
            let sCount = await Store.productListLength(sCategory);
            if(sCount != undefined && sCount != null){
               if(sCount[0].count != null){
                  sCount = parseInt(sCount[0].count) + 1;
               } else {
                  sCount = 0;
               }
            } else {
               process = false;
            }
   
            if(process){
               const insertMenu = await Store.insertMenu(store_id,sTitle,sDesc,iPrice,sCount,sFileList,sCategory,optionYn,options);
               if(insertMenu === "0000"){
                  oResult.resultCd = "0000";
                  oResult.resultMsg = "정상적으로 처리되었습니다";
               }
            }
         }
      } catch (error) {
         console.log("error",error);
      }
   
      res.status(200).json(oResult);
   }

}

StoreController.registerMenuV2 = async (req, res) => {
   const iUserId = req.user.user_id;

   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
   } else {
      const sFileList = req.body.sFileList;
      const sTitle = req.body.sTitle;
      const sCategory = req.body.sCategory;
      const iPrice = req.body.iPrice;
      const option = req.body.option;
      const sDesc = req.body.sDesc;
      const store_id = req.body.store_id;
      
      let oResult = {
         resultCd : "9999",
         resultMsg : "네트워크에러입니다 잠시 후 다시 시도바랍니다"
      };
      let dPrice = req.body.dPrice;
      let productType = req.body.productType;
      let iStock = req.body.iStock;

      try {
         if(sTitle === ""){
            oResult.resultCd = "1111";
            oResult.resultMsg = "메뉴명을 입력하세요"
   
         } else if (parseInt(iPrice) == null || iPrice === ""){
            oResult.resultCd = "2222";
            oResult.resultMsg = "가격을 입력하세요";
         } else if (sCategory == null || sCategory == undefined || sCategory === ""){
            oResult.resultCd = "3333";
            oResult.resultMsg = "카테고리를 선택하세요";
   
         } else {
            let process = true;
            let sCount = await Store.productListLength(sCategory);
            if(sCount != undefined && sCount != null){
               if(sCount[0].count != null){
                  sCount = parseInt(sCount[0].count) + 1;
               } else {
                  sCount = 0;
               }
            } else {
               process = false;
            }
            
            if(process){
               if(dPrice === undefined || dPrice === null || parseInt(dPrice) < 1 || dPrice === ""){
                  dPrice = iPrice;
               }
               if(productType !== undefined && productType !== null){
                  if(productType === "normal"){
                     productType = 0;
                  } else {
                     productType = 1;
                  }
               } else {
                  productType = 0;
               }
               if(iStock !== undefined && iStock !== null){
                  if(iStock === ""){
                     iStock = 0;
                  }
               } else {
                  iStock = 0;
               }
               const insertMenu = await Store.insertMenuV2(store_id,sTitle,sDesc,iPrice,dPrice,sCount,sFileList,sCategory,option,productType,iStock);
               if(insertMenu === "0000"){
                  oResult.resultCd = "0000";
                  oResult.resultMsg = "정상적으로 처리되었습니다";
               }
            }
         }
      } catch (error) {
         console.log("error",error);
      }
   
      res.status(200).json(oResult);
   }
}

StoreController.editMenu = async (req, res) => {
   const iUserId = req.user.user_id;

   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
   } else {
      const sFileList = req.body.sFileList;
      const sTitle = req.body.sTitle;
      const sCategory = req.body.sCategory;
      const iPrice = req.body.iPrice;
      const options = req.body.options;
      const optionYn = req.body.optionYn;
      const sDesc = req.body.sDesc;
      const productId = req.body.product_id;
      const mediaId = req.body.media_id;
      const preOptionList = req.body.pre_option_list;
      
      let dPrice = req.body.iPrice;
      let isUse = req.body.is_use;
      let oResult = {
         resultCd : "9999",
         resultMsg : "네트워크에러입니다 잠시 후 다시 시도바랍니다"
      };
      
      try {
         if(isUse === "use"){
            isUse = 1;
         } else {
            isUse = 0;
         }

         if(req.body.dPrice !== undefined && req.body.dPrice !== null && parseInt(req.body.dPrice) !== 0){
            dPrice = req.body.dPrice;
         }

         const editMenu = await Store.editMenu(mediaId,productId,sFileList,sTitle,sDesc,iPrice,dPrice,isUse,sCategory,preOptionList,optionYn,options);
         if(editMenu === "0000"){
            oResult.resultCd = "0000";
            oResult.resultMsg = "정상적으로 처리되었습니다";
         }
         
      } catch (error) {
         console.log("error",error);
      }
      res.status(200).json(oResult);
   }
}

StoreController.editMenuV2 = async (req, res) => {
   const iUserId = req.user.user_id;

   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
   } else {
      const sFileList = req.body.sFileList;
      const sTitle = req.body.sTitle;
      const sCategory = req.body.sCategory;
      const iPrice = req.body.iPrice;
      const options = req.body.options;
      const sDesc = req.body.sDesc;
      const productId = req.body.product_id;
      const mediaId = req.body.media_id;
      const preOptionList = req.body.pre_option_list;
      const iProductPic = req.body.sProductPic;
      
      let productType = req.body.productType;
      let iStock = req.body.iStock;
      let dPrice = req.body.iPrice;
      let isPicture = false;
      let oResult = {
         resultCd : "9999",
         resultMsg : "네트워크에러입니다 잠시 후 다시 시도바랍니다"
      };
      
      try {
         const checkPictures = iProductPic.substr(0,5);
         if(checkPictures === "https"){
            isPicture = true;
         }
         if(req.body.dPrice !== undefined && req.body.dPrice !== null && parseInt(req.body.dPrice) !== 0 && req.body.dPrice !== ""){
            dPrice = req.body.dPrice;
         }
         if(productType !== undefined && productType !== null){
            if(productType === "normal"){
                  productType = 0;
            } else {
                  productType = 1;
            }
         } else {
            productType = 0;
         }
         if(iStock !== undefined && iStock !== null){
            if(iStock === ""){
                  iStock = 0;
            }
         } else {
            iStock = 0;
         }
         const editMenu = await Store.editMenuV2(mediaId,productId,sFileList,sTitle,sDesc,iPrice,dPrice,sCategory,preOptionList,options,isPicture,iStock,productType);
         if(editMenu === "0000"){
            oResult.resultCd = "0000";
            oResult.resultMsg = "정상적으로 처리되었습니다";
         }
         
      } catch (error) {
         console.log("StoreController.editMenuV2 error =>>>>>>>>>>",error);
      }
      res.status(200).json(oResult);
   }
}


StoreController.changeIndexMenu = async (req, res) => {
   const iUserId = req.user.user_id;

   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
   } else {
      const sList = req.body.sIndex;
   
      let oResult = {
         resultCd : "9999",
         resultMsg : "네트워크에러입니다 잠시 후 다시 시도바랍니다"
      };
   
      try {
         if(sList.length > 1){
            const result = await Store.menuSwitch(sList);
            if(result === "0000"){
               oResult.resultCd = "0000";
               oResult.resultMsg = "변경되었습니다";
            }
         } else {
            oResult.resultCd = "8888";
         }
      } catch (error) {
         console.log("error",error);
      }
      
      res.status(200).json(oResult);
   }
   
}

StoreController.changeIndexMainMenu = async (req, res) => {
   const iUserId = req.user.user_id;

   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
   } else {
      const sList = req.body.sIndex;
   
      let oResult = {
         resultCd : "9999",
         resultMsg : "네트워크에러입니다 잠시 후 다시 시도바랍니다"
      };
   
      try {
         if(sList.length > 1){
            const result = await Store.menuMainSwitch(sList);
            if(result === "0000"){
               oResult.resultCd = "0000";
               oResult.resultMsg = "변경되었습니다";
            }
         } else {
            oResult.resultCd = "8888";
         }
      } catch (error) {
         console.log("error",error);
      }
      
      res.status(200).json(oResult);
   }
   
}


StoreController.editOptionV2 = async (req, res) => {
   const iUserId = req.user.user_id;

   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
   } else {
      const sData = req.body.sData;
      const optionId = req.body.option_id;
   
      let isProcess = true;
      let count = 0;
      let sMin = 0;
      let productList = [];
      let optionIdList = [];
      let xAction = false;
      let sGroupTitle = req.body.sGroupTitle;
      let oResult = {
         resultCd : "9999",
         resultMsg : "네트워크에러입니다 잠시 후 다시 시도바랍니다"
      };
   
      try {
         if(sData.length > 0){
            if(req.body.maxCount !== undefined){
               count = parseInt(req.body.maxCount);

               if(sData.length < count){
                  isProcess = false;
                  oResult.resultCd = "7777";
                  oResult.resultMsg = "최대 선택가능 횟수가 입력된 옵션보다 큽니다";
               }
            }
            
            if(req.body.minCount !== undefined){
               if(parseInt(req.body.minCount) > 1){
                  sMin = parseInt(req.body.minCount);
                  count = parseInt(req.body.minCount);
               }

               if(sData.length < sMin){
                  isProcess = false;
                  oResult.resultCd = "7777";
                  oResult.resultMsg = "최소 선택가능 횟수가 입력된 옵션보다 큽니다";
               }
            }
   
            const checkUp = await Store.checkHaveProduct(optionId);
            if(checkUp !== undefined && checkUp !== null){
               if(checkUp.length > 0){
                  for await (let i of checkUp) {
                     let tempProduct = {};
                     tempProduct.id = i.id;
                     productList.push(tempProduct);
                  }
                  
                  const getOptionId = await Store.getOptionId(optionId);
                  for await (let s of getOptionId) {
                     let tempOption = {};
                     tempOption.id = s.id;
                     optionIdList.push(tempOption);
                  }
      
                  xAction = true;
               }
            }
   
            if(isProcess){
               const editOption = await Store.editOption(sGroupTitle,optionId,count,sMin,sData,optionIdList,productList,xAction);
               if(editOption === "0000"){
                  oResult.resultCd = "0000";
                  oResult.resultMsg = "수정되었습니다";
               }
            }
         } else {
            oResult.resultCd = "8888";
            oResult.resultMsg = "옵션리스트를 작성해주세요";
         }
      } catch (error) {
         console.log("error",error);
      }
   
      res.status(200).json(oResult);
   }
}

StoreController.editOption = async (req, res) => {
   const iUserId = req.user.user_id;

   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
   } else {
      const sData = req.body.sData;
      const optionId = req.body.option_id;
   
      let isProcess = true;
      let count = 0;
      let productList = [];
      let optionIdList = [];
      let xAction = false;
      let sGroupTitle = req.body.sGroupTitle;
      let oResult = {
         resultCd : "9999",
         resultMsg : "네트워크에러입니다 잠시 후 다시 시도바랍니다"
      };
   
      try {
         if(sData.length > 0){
            if(req.body.maxCount != undefined){
               count = parseInt(req.body.maxCount);
            }
            if(sData.length < count){
               isProcess = false;
               oResult.resultCd = "7777";
               oResult.resultMsg = "최대 선택가능 횟수가 입력된 옵션보다 큽니다";
            }
   
            const checkUp = await Store.checkHaveProduct(optionId);
            if(checkUp.length > 0){
               for await (let i of checkUp) {
                  let tempProduct = {};
                  tempProduct.id = i.id;
                  productList.push(tempProduct);
               }
               
               const getOptionId = await Store.getOptionId(optionId);
               for await (let s of getOptionId) {
                  let tempOption = {};
                  tempOption.id = s.id;
                  optionIdList.push(tempOption);
               }
   
               xAction = true;
            }
   
            if(isProcess){
               const editOption = await Store.editOption(sGroupTitle,optionId,count,sData,optionIdList,productList,xAction);
               if(editOption === "0000"){
                  oResult.resultCd = "0000";
                  oResult.resultMsg = "수정되었습니다";
               }
            }
         } else {
            oResult.resultCd = "8888";
            oResult.resultMsg = "옵션리스트를 작성해주세요";
         }
      } catch (error) {
         console.log("error",error);
      }
   
      res.status(200).json(oResult);
   }
}


StoreController.deleteMenuV2 = async (req, res) => {
   const iUserId = req.user.user_id;
   const menuId = req.body.sIndex;
   let oResult = false;

   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
   } else {
      try {
         const result = await Store.deleteMenu(menuId);
         if(result !== undefined){
            oResult = true;
         } 
      } catch (error) {
         console.log("error",error);
      }
      res.status(200).json(oResult);
   }
}

StoreController.deleteMenu = async (req, res) => {
   const iUserId = req.user.user_id;
   const menuId = req.body.menu_id;
   let oResult = false;

   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
   } else {
      try {
         const result = await Store.deleteMenu(menuId);
         if(result !== undefined){
            oResult = true;
         } 
      } catch (error) {
         console.log("error",error);
      }
      res.status(200).json(oResult);
   }
}

StoreController.deleteOption = async (req, res) => {
   const iUserId = req.user.user_id;

   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
   } else {
      const oData = req.body.sIndex;
   
      let oResult = false;
      let xAction = false;
      
      try {
         const checkUp = await Store.checkHaveProduct(oData.id);
         if(checkUp.length > 0){
            xAction = true;
         }
   
         const result = await Store.deleteOption(oData.id,xAction);
         if(result === "0000"){
            oResult = true;
         }
      } catch (error) {
         console.log("error",error);
      }
   
      res.status(200).json(oResult);
   }
   
}

StoreController.categoryListV2 = async (req, res) => {
   const iUserId = req.user.user_id;

   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
   } else {
      const store_id = req.params.store_id;
   
      let sResult = [];
      let noList = "none";
      let sLimit = false;
      let limitMain = 1;
      let mainId = null;
      try {
         const checkCategory = await Store.checkCategory(store_id);
         if(checkCategory[0].menu_id != undefined && checkCategory[0].menu_id != null){
            noList = parseInt(checkCategory[0].menu_id);
            const result = await Store.getCategoryList(noList);
            if(result.length > 0){
               let count = 1;
               for await (let i of result) {
                  let temp = {};
                  temp.key = count;
                  temp.name = i.name;
                  temp.index = i.id_order;
                  temp.id = i.category_id;
                  temp.useYn = "미사용";
                  temp.isMain = "아니오";
                  if(i.status > 0){
                     temp.useYn = "사용중";
                  }
                  if(i.is_main > 0){
                     temp.isMain = "예";
                     mainId = i.category_id;
                     limitMain ++;
                  }
                  count ++;
   
                  sResult.push(temp);
               }
            }
         }
         if(limitMain > 1){
            sLimit = true;
         }
      } catch (error) {
         console.log("StoreController.categoryListV2 fail !!!=======>  ",error);
      }
      res.status(200).json({sResult,noList,sLimit,mainId});
   }
}

StoreController.categoryList = async (req, res) => {
   const iUserId = req.user.user_id;

   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
   } else {
      const store_id = req.params.store_id;
   
      let sResult = [];
      let noList = "none";
      let sLimit = false;
      let limitMain = 1;
      let mainId = 1;
      try {
         const checkCategory = await Store.checkCategory(store_id);
         if(checkCategory[0].menu_id != undefined && checkCategory[0].menu_id != null){
            noList = parseInt(checkCategory[0].menu_id);
            const result = await Store.getCategoryList(noList);
            if(result.length > 0){
               let count = 1;
               for await (let i of result) {
                  let temp = {};
                  temp.key = count;
                  temp.name = i.name;
                  temp.index = i.id_order;
                  temp.id = i.category_id;
                  temp.useYn = "미사용";
                  temp.isMain = "아니오";
                  if(i.status > 0){
                     temp.useYn = "사용중";
                  }
                  if(i.is_main > 0){
                     temp.isMain = "예";
                     mainId = i.category_id;
                     limitMain ++;
                  }
                  count ++;
   
                  sResult.push(temp);
               }
            }
         }
         if(limitMain > 1){
            sLimit = true;
         }
      } catch (error) {
         console.log("error",error);
      }
      res.status(200).json({sResult,noList,sLimit,mainId});
   }
}

StoreController.optionList = async (req, res) => {
   const iUserId = req.user.user_id;

   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
   } else {
      const store_id = req.params.store_id;
   
      let sResult = [];
      try {
         const result = await Store.getoptionList(store_id);
         if(result.length > 0){
            let count = 1;
            for await (let i of result) {
               let temp = {};
               temp.key = count;
               temp.name = i.name;
               temp.count = i.input_max;
               temp.id = i.option_type_id;
               if(i.input_type === "radio"){
                  temp.type = "선택영역";
               } else {
                  temp.type = "체크박스";
               }
               
               count ++;
   
               sResult.push(temp);
            }
         }
      } catch (error) {
         console.log("error",error);
      }
      res.status(200).json(sResult);
   }
}

StoreController.detailOptionRow = async (req, res) => {
   const iUserId = req.user.user_id;

   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
   } else {
      const optionId = req.params.option_id;
   
      let oResult = {
         resultCd : "9999",
         resultMsg : "네트워크에러입니다 잠시 후 다시 시도바랍니다"
      };
      let sResult = [];
      let optionInputType = "";
      let result = {}
      try {
         if(optionId != undefined){
            const getOptionList = await Store.getOptionList(optionId);
            if(getOptionList.length > 0){
               let count = 1;
               for await (let i of getOptionList) {
                  let temp = {};
                  temp.key = count;
                  temp.name = i.optionName;
                  temp.price = parseFloat(i.price);

                  if(optionInputType === ""){
                     optionInputType = i.input_type.toString();
                  }
                  count ++;
                  
                  sResult.push(temp);
               }
   
               if(getOptionList[0].maxCount > 0){
                  result.maxCount = parseInt(getOptionList[0].maxCount);
               } else {
                  result.maxCount = 0;
               }
               if(getOptionList[0].minCount > 0){
                  result.minCount = parseInt(getOptionList[0].minCount);
               } else {
                  result.minCount = 0;
               }
               
               result.inputType = optionInputType;
               result.sGroupTitle = getOptionList[0].groupTitle;
               result.list = sResult;
   
               oResult.resultCd = "0000";
               oResult.resultData = result;
            }
   
         }
      } catch (error) {
         console.log("error",error);
      }
   
      res.status(200).json(oResult);
   }
}

StoreController.detailMenuList = async (req, res) => {
   const iUserId = req.user.user_id;

   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
   } else {
      const store_id = req.params.store_id;
   
      let sResult = [];
      let aResult = [];
      let noList = "none";
   
      try {
         const checkCategory = await Store.checkCategory(store_id);
         if(checkCategory[0].menu_id != undefined && checkCategory[0].menu_id != null){
            noList = parseInt(checkCategory[0].menu_id);
            const getCategoryList = await Store.getCategoryList(noList);
            if(getCategoryList.length > 0){
               let count = 1;
               for await (let i of getCategoryList) {
                  let temp = {};
                  temp.key = count;
                  temp.name = i.name;
                  temp.id = i.category_id;
                  if(i.is_deleted < 1){
                     sResult.push(temp);
                  }
                  count ++;
               }
            }
         }
   
         const getoptionList = await Store.getoptionList(store_id);
         if(getoptionList.length > 0){
            let count = 1;
            for await (let i of getoptionList) {
               let temp = {};
               temp.key = count;
               temp.name = i.name;
               temp.id = i.option_type_id;
               if(i.status > 0){
                  aResult.push(temp);
               }
               count ++;
   
            }
         }
   
      } catch (error) {
         console.log("error",error);
      }
      res.status(200).json({sResult,aResult});
   }
}


StoreController.menuList = async (req, res) => {
   const iUserId = req.user.user_id;

   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
   } else {
      const category_id = req.params.category_id;
   
      let sResult = [];
      try {
         const getMenuList = await Store.getMenuList(category_id);
         if(getMenuList.length > 0){
            let count = 1;
            for await (let i of getMenuList) {
               let temp = {};
               temp.key = count;
               temp.name = i.name;
               temp.id = i.product_id;
               temp.categoryId = category_id;
               
               if(i.is_soldout > 0){
                  temp.soldOut = "일시품절";
               } else {
                  temp.soldOut = "주문가능";
               }
               sResult.push(temp);
               count ++;
            }
         }
      } catch (error) {
         console.log("error",error);
      }
      res.status(200).json(sResult);
   }

}


StoreController.getMenuDetailV2 = async (req, res) => {
   const iUserId = req.user.user_id;
      
   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
   } else {
      const menu_id = req.params.menu_id;

      let oResult = {};
      let sOption = [];

      try {
         const getMenuDetail = await Store.getMenuDetail(parseInt(menu_id));
         if(getMenuDetail != undefined && getMenuDetail != null){
            const optionList = await Store.getOptionListByMenuId(parseInt(menu_id));
            if(optionList !== undefined && optionList !== null && optionList.length > 0){
               for await (let i of optionList) {
                  let temp = {};
                  temp.key = parseInt(i.option_type_id);
                  temp.name = i.name.toString();
                  sOption.push(temp);
               }
            }

            if(getMenuDetail[0].url_path !== null && getMenuDetail[0].url_path !== ""){
               oResult.url_path = getMenuDetail[0].url_path;
            } else {
               oResult.url_path = "";
            }
            console.log("getMenuDetail[0].url_path",getMenuDetail[0].url_path);
            console.log("oResult.url_path",oResult.url_path);
   
            if(getMenuDetail[0].is_soldout > 0){
               oResult.soldOut = "일시품절";
               oResult.status = "use";
            } else {
               oResult.soldOut = "주문가능";
               oResult.status = "unused";
            }

            if(Math.floor(parseFloat(getMenuDetail[0].org_price)) === Math.floor(parseFloat(getMenuDetail[0].base_price))){
               oResult.base_price = 0;
               oResult.org_price = Math.floor(parseFloat(getMenuDetail[0].org_price));
            } else {
               oResult.base_price = Math.floor(parseFloat(getMenuDetail[0].base_price));
               oResult.org_price = Math.floor(parseFloat(getMenuDetail[0].org_price));
            }

            if(parseInt(getMenuDetail[0].is_throo_only) === 0){
               oResult.isThrooOnly = "normal";
            } else {
               oResult.isThrooOnly = "only";
            }

            if(parseInt(getMenuDetail[0].in_stock) === 0){
               oResult.inStock = "";
            } else {
               oResult.inStock = getMenuDetail[0].in_stock.toString();
            }

            oResult.options = sOption;
            oResult.productId = getMenuDetail[0].product_id;
            oResult.categoryId = getMenuDetail[0].category_id;
            oResult.category_name = getMenuDetail[0].category_name;
            oResult.product_name = getMenuDetail[0].product_name;
            oResult.description = getMenuDetail[0].description;
            oResult.mediaId = getMenuDetail[0].product_media_id;
         }
      } catch (error) {
         console.log("StoreController.getMenuDetailV2 fail error!!!!",error);
      }
      res.status(200).json(oResult);
   }
}

StoreController.getMenuDetail = async (req, res) => {
   const iUserId = req.user.user_id;

   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
   } else {
      const menu_id = req.params.menu_id;
   
      let oResult = {};
      let option = [];
      let optionIds = [];
      try {
         const getMenuDetail = await Store.getMenuDetail(parseInt(menu_id));
         if(getMenuDetail != undefined && getMenuDetail != null){
            const optionList = await Store.getOptionListByMenuId(parseInt(menu_id));
            if(optionList != undefined && optionList != null && optionList.length > 0){
               oResult.optionYn = true;
               for await (let i of optionList) {
                  optionIds.push(i.option_type_id);
                  option.push(i.name.toString());
               }
            } else {
               oResult.optionYn = false;
            }
   
            if(getMenuDetail[0].url_path == null || getMenuDetail[0].url_path === ""){
               oResult.url_path = "https://api-stg.ivid.kr/img/no-image-new.png";
            } else {
               oResult.url_path = getMenuDetail[0].url_path;
            }
   
            if(getMenuDetail[0].is_soldout > 0){
               oResult.soldOut = "일시품절";
               oResult.status = "use";
            } else {
               oResult.soldOut = "주문가능";
               oResult.status = "unused";
            }
            
            oResult.option_name = option.join(',');
            oResult.option_nameList = option;
            oResult.optionIdList = optionIds;
            oResult.productId = getMenuDetail[0].product_id;
            oResult.categoryId = getMenuDetail[0].category_id;
            oResult.category_name = getMenuDetail[0].category_name;
            oResult.product_name = getMenuDetail[0].product_name;
            oResult.base_price = Math.floor(parseFloat(getMenuDetail[0].base_price));
            oResult.description = getMenuDetail[0].description;
            oResult.mediaId = getMenuDetail[0].product_media_id;
         }
      } catch (error) {
         console.log("error",error);
      }
      res.status(200).json(oResult);
   }

}


module.exports = StoreController;