'use strict';

var jwt = require('jsonwebtoken');
var config = require('../config');

const axios = require("axios");
const CryptoJS = require('crypto-js');

const Store = require('../models/store');
const Commercial = require('../models/commercial');
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

const loopChartDataV2 = async (kIndex,sIndex,aIndex,xIndex,nIndex) => {
   let oResult = [];
   for await (let iCount of asyncGenerator2(sIndex,aIndex)) {
      let userChart;
      let sDay = moment().add(-iCount, 'days').format('YYYY-MM-DD');
      let temp = {};
      if(kIndex === "wm_adver_event"){
         userChart = await Commercial.adverEventChartCommercial(xIndex,sDay,nIndex);
         userChart = userChart[0];
         temp.name = "메인 배너광고"
      } else if (kIndex === "wm_adver_product_popular") {
         userChart = await Commercial.adverProductPopularChartCommercial(xIndex,sDay,nIndex);
         userChart = userChart[0];
         temp.name = "핫메뉴 광고"
      } else if (kIndex === "wm_adver_coupon") {
         userChart = await Commercial.adverCouponChartCommercial(xIndex,sDay,nIndex);
         userChart = userChart[0];
         temp.name = "내 주변 쿠폰 광고"
      } else if (kIndex === "wm_adver_product_throo_only") {
         userChart = await Commercial.adverProductThroo_onlyChartCommercial(xIndex,sDay,nIndex);
         userChart = userChart[0];
         temp.name = "스루 온리 광고"
      } else if (kIndex === "wm_adver_store") {
         userChart = await Commercial.adverStoreChartCommercial(xIndex,sDay,nIndex);
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
         userChart = await Commercial.adverEventChartCommercialClicked(storeId,sDay,parseInt(paramId));
      } else if (sIndex === "coupon"){
         userChart = await Commercial.adverCouponChartCommercialClicked(storeId,sDay,parseInt(paramId));
      } else if (sIndex === "throoOnly"){
         userChart = await Commercial.adverProductThroo_onlyChartCommercialClicked(storeId,sDay,parseInt(paramId));
      } else if (sIndex === "new"){
         userChart = await Commercial.adverStoreChartCommercialClicked(storeId,sDay,parseInt(paramId));
      } else if (sIndex === "hot"){
         userChart = await Commercial.adverProductPopularChartCommercialClicked(storeId,sDay,parseInt(paramId));
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
         userChart = await Commercial.adverEventChartCommercial(storeId,sDay,parseInt(paramId));
      } else if (sIndex === "coupon"){
         userChart = await Commercial.adverCouponChartCommercial(storeId,sDay,parseInt(paramId));
      } else if (sIndex === "throoOnly"){
         userChart = await Commercial.adverProductThroo_onlyChartCommercial(storeId,sDay,parseInt(paramId));
      } else if (sIndex === "new"){
         userChart = await Commercial.adverStoreChartCommercial(storeId,sDay,parseInt(paramId));
      } else if (sIndex === "hot"){
         userChart = await Commercial.adverProductPopularChartCommercial(storeId,sDay,parseInt(paramId));
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

const pointCheck = async (sIndex,iMyPoint,aIndex) => {
   let result = {
      tempPoint: parseInt(sIndex) - 15000,
      tempPointCharged: 0,
      tempPay: 15000
   }

   if((parseInt(iMyPoint) - 15000) < parseInt(sIndex)){
      result.tempPointCharged = parseInt(aIndex);
      result.tempPay = parseInt(sIndex) - (parseInt(sIndex) - 15000) - parseInt(aIndex);
   }

   return result;
}

const pointSumCheck = async (sIndex,iMyPoint,aPoint) => {
   let totalPay = parseInt(sIndex);
   let result = {
      tempPoint: 0,
      tempPointCharged: 0,
      tempPay: 0
   }

   if(parseInt(iMyPoint) >= 15000){
      if(totalPay >= (parseInt(iMyPoint) + 15000)){
         result.tempPoint = parseInt(iMyPoint);
         result.tempPointCharged = totalPay - parseInt(iMyPoint);
         result.tempPay = totalPay - (parseInt(iMyPoint) + (totalPay - parseInt(iMyPoint)));
      } else {
         if(parseInt(aPoint) >= (totalPay - 15000)){
            result.tempPoint = 15000;
            result.tempPointCharged = totalPay - 15000;
            result.tempPay = totalPay - (15000 + (totalPay - 15000));
         } else {
            if(parseInt(iMyPoint) >= parseInt(totalPay)){
               const pResult = await pointCheck(totalPay,iMyPoint,aPoint);
               result.tempPoint = pResult.tempPoint;
               result.tempPointCharged = pResult.tempPointCharged;
               result.tempPay = pResult.tempPay;
            } else {
               result.tempPoint = parseInt(iMyPoint) - 15000;
               if(parseInt(aPoint) >= (totalPay - (parseInt(iMyPoint) - 15000))){
                  result.tempPointCharged = totalPay - (parseInt(iMyPoint) - 15000);
                  result.tempPay = totalPay - ((parseInt(iMyPoint) - 15000) + (totalPay - (parseInt(iMyPoint) - 15000)));
               } else {
                  result.tempPointCharged = parseInt(aPoint);
                  result.tempPay = totalPay - (parseInt(aPoint) + (parseInt(iMyPoint) - 15000));
               }
            }
         }
      }
   } else {
      result.tempPoint = parseInt(iMyPoint);
      result.tempPointCharged = totalPay - parseInt(iMyPoint);
      result.tempPay = totalPay - (parseInt(iMyPoint) + (totalPay - parseInt(iMyPoint)));
   }
   return result;
}

const calcaulateCheck = async (sIndex,iMyPoint,aPoint) => {
   let totalPay = parseInt(sIndex);
   let result = {
      tempPoint: 0,
      tempPointCharged: 0,
      tempPay: 0
   }
   if((parseInt(iMyPoint) + 15000) >= totalPay){
      result.tempPoint = parseInt(totalPay) - 15000;
      result.tempPointCharged = parseInt(aPoint);
      result.tempPay = totalPay - ((parseInt(totalPay) - 15000) + parseInt(aPoint));
   } else {
      result.tempPoint = parseInt(iMyPoint);
      result.tempPointCharged = parseInt(aPoint);
      result.tempPay = totalPay - (parseInt(iMyPoint) + parseInt(aPoint));
   }

   return result;
}

const commercialChartBykey = async (storeId,type,adverId,endDate) => {
   let xConfigList = [];
   let result = [];
   try {
      if (type === "banner"){
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
      
   }

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

const getDeliveryData = async (sIndex,aIndex) => {
   let oResult = [];

   try {
      const tracker = await axios({
         url: `https://apis.tracker.delivery/carriers/${sIndex}/tracks/${aIndex}`,
         method: "get",
         timeout: (15 * 10000),
         headers: {
            'Content-Type': 'application/json;charset=UTF-8',
         },
         data: null,
         transformResponse: [ (data) => {
            return data;
         }],
      });
      const parsing = await JSON.parse(tracker.data);
      oResult = parsing.progresses;
   } catch (error) {
      console.log("getDeliveryData fail error ======>",error);
   }

   return oResult;
}

// The admin controller.
var CommercialController = {}

CommercialController.index = function (req, res) {
   res.status(200).json({ message: 'Welcome to the store area !' });
}

CommercialController.chargedPointCheck = async (req, res) => {
   const iUserId = req.user.user_id;
   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
   } else {
      let sResult = false;
      try {
         const storeId = req.body.store_id; 
         const orderId = req.body.order_id; 
         const result = await Commercial.checkPointOrderDoneDeal(parseInt(storeId),parseInt(orderId));
         console.log("result",result);
         if(result.length > 0){
            console.log("result[0].state_id.toString()",result[0].state_id.toString());
            if(result[0].state_id.toString() === "14002"){
               sResult = true;
            }
         }
      } catch (error) {
         console.log("chargedPointCheck error",error);
      }

      res.status(200).json(sResult);
   }
}

CommercialController.editBannerCommercial = async (req, res) => {
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
      let storeNm = "";

      try {
         const storeId = req.body.store_id; 
         const imgUrl = req.body.img_url; 
         const title = req.body.title; 
         const subTitle = req.body.subTitle; 
         const eventId = req.body.eventId; 
         const commercialId = req.body.commercialId; 
         
         const checkEventId = await Commercial.checkCommercialEventId(parseInt(storeId),parseInt(commercialId));
         if(checkEventId.length > 0){
            if(eventId.toString() === checkEventId[0].event_id.toString()){
               const getStoreNm = await Commercial.getStoreNm(parseInt(storeId));
               if(getStoreNm.length > 0){
                  if(getStoreNm[0].store_name !== undefined && getStoreNm[0].store_name !== null && getStoreNm[0].store_name !== ""){
                     storeNm = getStoreNm[0].store_name
                     process1 = true;
                  }
               }
            }
         }
         
         if(process1){
            const result = await Commercial.editCommercialEventId(storeNm,parseInt(eventId),title,subTitle,imgUrl);
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

CommercialController.getCommercialStoreDetailList = async (req, res) => {
   const iUserId = req.user.user_id;
   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
   } else {
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
      let iResult = [];
      let data1 = {};

      try {
         const storeId = req.params.store_id;
         const oResult = await Commercial.getSoreCommercialStoreDetail(parseInt(storeId));
         const eResult = await Commercial.getCommercialOrderTime(parseInt(storeId));
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

CommercialController.getChart = async (req, res) => {
   let xConfigList = [];
   let adverEvent = [];
   let adverProductPopular = [];
   let adverCoupon = [];
   let adverProductThrooOnly = [];
   let adverStore = [];
   let result = [];
   let adverId = null;
   let endDate = null;

   try {
      const storeId = req.body.store_id;
      const type = req.body.type;

      if(req.body.adverId !== undefined && req.body.adverId !== null){
         adverId = req.body.adverId;
      }
      if(req.body.endDate !== undefined && req.body.endDate !== null){
         endDate = req.body.endDate;
      }
      if(type === "current"){
         adverEvent = await Commercial.getAdverEventChartList(parseInt(storeId));
         adverProductPopular = await Commercial.getAdverPopularChartList(parseInt(storeId));
         adverCoupon = await Commercial.getAdverCouponChartList(parseInt(storeId));
         adverProductThrooOnly = await Commercial.getAdverThrooOnlyChartList(parseInt(storeId));
         adverStore = await Commercial.getAdverStoreChartList(parseInt(storeId));
         result = await makeValuationChart(adverEvent,adverCoupon,adverProductThrooOnly,adverStore,adverProductPopular,type,storeId);
         xConfigList = result;
      } else if (type === "banner") {
         result = await commercialChartBykey(parseFloat(storeId),"banner",parseInt(adverId),endDate);
         xConfigList = result;
      } else if (type === "coupon") {
         result = await commercialChartBykey(parseFloat(storeId),"coupon",parseInt(adverId),endDate);
         xConfigList = result;
      } else if (type === "throoOnly") {
         result = await commercialChartBykey(parseFloat(storeId),"throoOnly",parseInt(adverId),endDate);
         xConfigList = result;
      } else if (type === "new") {
         result = await commercialChartBykey(parseFloat(storeId),"new",parseInt(adverId),endDate);
         xConfigList = result;
      } else if (type === "hot") {
         result = await commercialChartBykey(parseFloat(storeId),"hot",parseInt(adverId),endDate);
         xConfigList = result;
      }

   } catch (error) {
      console.log("getChart error",error);
   }
   
   res.status(200).json(xConfigList);
}

CommercialController.getUsedCommercialChart = async (req, res) => {
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
         const adverEvent = await Commercial.getAdverEventChartList(parseInt(storeId));
         const adverProductPopular = await Commercial.getAdverPopularChartList(parseInt(storeId));
         const adverCoupon = await Commercial.getAdverCouponChartList(parseInt(storeId));
         const adverProductThrooOnly = await Commercial.getAdverThrooOnlyChartList(parseInt(storeId));
         const adverStore = await Commercial.getAdverStoreChartList(parseInt(storeId));
         if(adverEvent.length > 0){
            for await (const iterator of adverEvent) {
               let resultData = await commercialChartBykey(parseFloat(storeId),"banner",parseInt(iterator.adver_event_id),moment(iterator.end_date).format("YYYY-MM-DD"));
               let temp = {
                  key: "wm_adver_event",
                  name: "메인 배너광고",
                  chart: resultData,
                  date: moment(iterator.end_date).add(-30, 'days').format("YYYY-MM-DD") + "~" + moment(iterator.end_date).format("YYYY-MM-DD"),
                  uri: "https://ceo.throo.co.kr/selfmanage/commercial/app/ceo?=" + parseFloat(storeId) + "?@=" + "banner" + "?@=" + iterator.adver_event_id + "?@=" + moment(iterator.end_date).format("YYYY-MM-DD")
               };
               sResult.push(temp);
            }
         }
         if(adverCoupon.length > 0){
            for await (const iterator of adverCoupon) {
               let resultData = await commercialChartBykey(parseFloat(storeId),"coupon",parseInt(iterator.adver_coupon_id),moment(iterator.end_date).format("YYYY-MM-DD"));
               let temp = {
                  key: "wm_adver_coupon",
                  name: "내 주변 쿠폰 광고",
                  chart: resultData,
                  date: moment(iterator.end_date).add(-30, 'days').format("YYYY-MM-DD") + "~" + moment(iterator.end_date).format("YYYY-MM-DD"),
                  uri: "https://ceo.throo.co.kr/selfmanage/commercial/app/ceo?=" + parseFloat(storeId) + "?@=" + "coupon" + "?@=" + iterator.adver_coupon_id + "?@=" + moment(iterator.end_date).format("YYYY-MM-DD")
               };
               sResult.push(temp);
            }
         }
         if(adverProductThrooOnly.length > 0){
            for await (const iterator of adverProductThrooOnly) {
               let resultData = await commercialChartBykey(parseFloat(storeId),"throoOnly",parseInt(iterator.adver_product_throo_only_id),moment(iterator.end_date).format("YYYY-MM-DD"));
               let temp = {
                  key: "wm_adver_product_throo_only",
                  name: "스루 온리 광고",
                  chart: resultData,
                  date: moment(iterator.end_date).add(-30, 'days').format("YYYY-MM-DD") + "~" + moment(iterator.end_date).format("YYYY-MM-DD"),
                  uri: "https://ceo.throo.co.kr/selfmanage/commercial/app/ceo?=" + parseFloat(storeId) + "?@=" + "throoOnly" + "?@=" + iterator.adver_product_throo_only_id + "?@=" + moment(iterator.end_date).format("YYYY-MM-DD")
               };
               sResult.push(temp);
            }
         }
         if(adverStore.length > 0){
            for await (const iterator of adverStore) {
               let resultData = await commercialChartBykey(parseFloat(storeId),"new",parseInt(iterator.adver_store_id),moment(iterator.end_date).format("YYYY-MM-DD"));
               let temp = {
                  key: "wm_adver_store",
                  name: "신규 입점 광고",
                  chart: resultData,
                  date: moment(iterator.end_date).add(-30, 'days').format("YYYY-MM-DD") + "~" + moment(iterator.end_date).format("YYYY-MM-DD"),
                  uri: "https://ceo.throo.co.kr/selfmanage/commercial/app/ceo?=" + parseFloat(storeId) + "?@=" + "new" + "?@=" + iterator.adver_store_id + "?@=" + moment(iterator.end_date).format("YYYY-MM-DD")
               };
               sResult.push(temp);
            }
         }
         if(adverProductPopular.length > 0){
            for await (const iterator of adverProductPopular) {
               let resultData = await commercialChartBykey(parseFloat(storeId),"hot",parseInt(iterator.adver_product_popular_id),moment(iterator.end_date).format("YYYY-MM-DD"));
               let temp = {
                  key: "wm_adver_product_popular",
                  name: "핫메뉴 광고",
                  chart: resultData,
                  date: moment(iterator.end_date).add(-30, 'days').format("YYYY-MM-DD") + "~" + moment(iterator.end_date).format("YYYY-MM-DD"),
                  uri: "https://ceo.throo.co.kr/selfmanage/commercial/app/ceo?=" + parseFloat(storeId) + "?@=" + "hot" + "?@=" + iterator.adver_product_popular_id + "?@=" + moment(iterator.end_date).format("YYYY-MM-DD")
               };
               sResult.push(temp);
            }
         }
      } catch (error) {
         console.log("StoreController.getChartCommercialApp fail! ====>> error:", error);
      }

      res.status(200).json(sResult);
   }
}

CommercialController.getUsedCommercial = async (req, res) => {
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
         xConfigList: [],
         commercialList: [],
      };

      try {
         const storeId = req.params.store_id;
         const today = moment().format("YYYY-MM-DD");
         const adverEvent = await Commercial.getAdverEvent(parseInt(storeId),today);
         const adverProductPopular = await Commercial.getAdverProductPopular(parseInt(storeId),today);
         const adverCoupon = await Commercial.getAdverCoupon(parseInt(storeId),today);
         const adverProductThrooOnly = await Commercial.getAdverProductThrooOnly(parseInt(storeId),today);
         const adverStore = await Commercial.getAdverStore(parseInt(storeId),today);
         if(adverEvent.length > 0){
            const tempLeak = await Commercial.adverEventDisplayCount(parseInt(storeId),parseInt(adverEvent[0].adver_event_id));
            const tempClick = await Commercial.adverEventClickCount(parseInt(storeId),parseInt(adverEvent[0].adver_event_id));
            const eventData = await Commercial.adverEventData(parseInt(adverEvent[0].event_id));
            let temp = {
               name: "메인 배너광고",
               price: "80000",
               priceCasting: "80,000",
               limit: moment(adverEvent[0].end_date).format("MM-DD") + "까지",
               id: adverEvent[0].adver_event_id,
               leak: (tempLeak[0].amount !== undefined && tempLeak[0].amount !== null && parseInt(tempLeak[0].amount) > 0) ? parseInt(tempLeak[0].amount) : 0,
               click: (tempClick[0].amount !== undefined && tempClick[0].amount !== null && parseInt(tempClick[0].amount) > 0) ? parseInt(tempClick[0].amount) : 0,
               action: "집행중",
               key: "wm_adver_event",
               title: eventData[0].content,
               subTitle:  eventData[0].subtitle,
               img:  eventData[0].img_url1,
               eventId:  eventData[0].event_id,
            }
            tempCommercialList.push(temp);
         }
         if(adverCoupon.length > 0){
            const tempLeak = await Commercial.adverCouponDisplayCount(parseInt(storeId),parseInt(adverCoupon[0].adver_coupon_id));
            const tempClick = await Commercial.adverCouponClickCount(parseInt(storeId),parseInt(adverCoupon[0].adver_coupon_id));
            let temp = {
               name: "내 주변 쿠폰 광고",
               price: "40000",
               priceCasting: "40,000",
               limit: moment(adverCoupon[0].end_date).format("MM-DD") + "까지",
               id: adverCoupon[0].adver_coupon_id,
               leak: (tempLeak[0].amount !== undefined && tempLeak[0].amount !== null && parseInt(tempLeak[0].amount) > 0) ? parseInt(tempLeak[0].amount) : 0,
               click: (tempClick[0].amount !== undefined && tempClick[0].amount !== null && parseInt(tempClick[0].amount) > 0) ? parseInt(tempClick[0].amount) : 0,
               action: "집행중",
               key: "wm_adver_coupon"
            }
            tempCommercialList.push(temp);
         }
         if(adverProductThrooOnly.length > 0){
            const tempLeak = await Commercial.adverProductThrooOnlyDisplayCount(parseInt(storeId),parseInt(adverProductThrooOnly[0].adver_product_throo_only_id));
            const tempClick = await Commercial.adverProductThrooOnlyClickCount(parseInt(storeId),parseInt(adverProductThrooOnly[0].adver_product_throo_only_id));
            let temp = {
               name: "스루 온리 광고",
               price: "0",
               priceCasting: "0",
               limit: moment(adverProductThrooOnly[0].end_date).format("MM-DD") + "까지",
               id: adverProductThrooOnly[0].adver_product_throo_only_id,
               leak: (tempLeak[0].amount !== undefined && tempLeak[0].amount !== null && parseInt(tempLeak[0].amount) > 0) ? parseInt(tempLeak[0].amount) : 0,
               click: (tempClick[0].amount !== undefined && tempClick[0].amount !== null && parseInt(tempClick[0].amount) > 0) ? parseInt(tempClick[0].amount) : 0,
               action: "집행중",
               key: "wm_adver_product_throo_only"
            }
            tempCommercialList.push(temp);
         }

         if(adverStore.length > 0){
            const tempLeak = await Commercial.adverStoreDisplayCount(parseInt(storeId),parseInt(adverStore[0].adver_store_id));
            const tempClick = await Commercial.adverStoreClickCount(parseInt(storeId),parseInt(adverStore[0].adver_store_id));
            let temp = {
               name: "신규 입점 광고",
               price: "20000",
               priceCasting: "20,000",
               limit: moment(adverStore[0].end_date).format("MM-DD") + "까지",
               id: adverStore[0].adver_store_id,
               leak: (tempLeak[0].amount !== undefined && tempLeak[0].amount !== null && parseInt(tempLeak[0].amount) > 0) ? parseInt(tempLeak[0].amount) : 0,
               click: (tempClick[0].amount !== undefined && tempClick[0].amount !== null && parseInt(tempClick[0].amount) > 0) ? parseInt(tempClick[0].amount) : 0,
               action: "집행중",
               key: "wm_adver_store"
            }
            tempCommercialList.push(temp);
         }

         if(adverProductPopular.length > 0){
            const tempLeak = await Commercial.adverProductPopularDisplayCount(parseInt(storeId),parseInt(adverProductPopular[0].adver_product_popular_id));
            const tempClick = await Commercial.adverProductPopularClickCount(parseInt(storeId),parseInt(adverProductPopular[0].adver_product_popular_id));
            let temp = {
               name: "핫메뉴 광고",
               price: "30000",
               priceCasting: "30,000",
               limit: moment(adverProductPopular[0].end_date).format("MM-DD") + "까지",
               id: adverProductPopular[0].adver_product_popular_id,
               leak: (tempLeak[0].amount !== undefined && tempLeak[0].amount !== null && parseInt(tempLeak[0].amount) > 0) ? parseInt(tempLeak[0].amount) : 0,
               click: (tempClick[0].amount !== undefined && tempClick[0].amount !== null && parseInt(tempClick[0].amount) > 0) ? parseInt(tempClick[0].amount) : 0,
               action: "집행중",
               key: "wm_adver_product_popular"
            }
            tempCommercialList.push(temp);
         }

         const getThrooBannerKit = await Commercial.getThrooBannerKit(parseInt(storeId));
         if(getThrooBannerKit.length > 0){
            for await (const e of getThrooBannerKit) {
               let tempDelivery = [];
               let tempText = "";
               if(e.state_id.toString() === "0"){
                  tempText = "주문 확인중";
               } else if (e.state_id.toString() === "1"){
                  tempText = "주문 확인";
               } else if (e.state_id.toString() === "2"){
                  tempText = "배송 중";
                  const gDeliveryData = await getDeliveryData(e.delivery_company_id,e.delivery_param);
                  if(gDeliveryData !== undefined && gDeliveryData !== null && gDeliveryData !== ""){
                     if(gDeliveryData.length > 0){
                        for await (const h of gDeliveryData) {
                           let tempProgress = {};
                           tempProgress.title = h.location.name;
                           tempProgress.content = h.description;
                           tempProgress.date = moment(h.time).format("LLLL");
                           tempProgress.status = h.status.text;
                           tempDelivery.push(tempProgress);
                        }
                     }
                  }

               } else if (e.state_id.toString() === "3"){
                  tempText = "배송 완료";
               }

               let temp = {
                  name: "야외 광고 배너",
                  price: "30000",
                  priceCasting: "30,000(무상포인트 사용은 최대 15,000)",
                  limit: "",
                  leak: "",
                  click: "",
                  action: tempText,
                  param: e.state_id,
                  deliveryCompany: e.delivery_company,
                  deliveryParam: e.delivery_param,
                  list: tempDelivery,
                  createdAt: moment(e.created_at).format("YYYY-MM-DD"),
                  confirmAt: moment(e.confirm_at).format("YYYY-MM-DD"),
                  deliverdAt: moment(e.delivered_at).format("YYYY-MM-DD"),
                  completeAt: moment(e.updated_at).format("YYYY-MM-DD"),
                  detail1: "오프라인 광고물 배너, 물통, 폴대4개, 메인파이프 사이즈 1800 x 600mm 입니다",
                  detail2: "우리 매장의 인기 상품을 광고해 보세요. 우리 매장의 인기상품을 고객에게 알릴 수 있습니다.",
                  img: "https://prd-throo-store-product.s3.ap-northeast-2.amazonaws.com/store-id-0001020/photo_1652349677783-1024.jpg",
                  key: "picket"
               }
               tempCommercialList.push(temp); 
            }
         }

         const getThrooKit = await Commercial.getThrooKit(parseInt(storeId));
         if(getThrooKit.length > 0){
            for await (const e of getThrooKit) {
               let tempDelivery = [];
               let tempText = "";
               if(e.state_id.toString() === "0"){
                  tempText = "주문 확인중";
               } else if (e.state_id.toString() === "1"){
                  tempText = "주문 확인";
               } else if (e.state_id.toString() === "2"){
                  tempText = "배송 중";

                  const gDeliveryData = await getDeliveryData(e.delivery_company_id,e.delivery_param);
                  if(gDeliveryData !== undefined && gDeliveryData !== null && gDeliveryData !== ""){
                     if(gDeliveryData.length > 0){
                        for await (const h of gDeliveryData) {
                           let tempProgress = {};
                           tempProgress.title = h.location.name;
                           tempProgress.content = h.description;
                           tempProgress.date = moment(h.time).format("LLLL");
                           tempProgress.status = h.status.text;
                           tempDelivery.push(tempProgress);
                        }
                     }
                  }
               } else if (e.state_id.toString() === "3"){
                  tempText = "배송 완료";
               }

               let temp = {
                  name: "스루키트",
                  price: "0",
                  priceCasting: "0",
                  limit: "",
                  leak: "",
                  click: "",
                  action: tempText,
                  param: e.state_id,
                  deliveryCompany: e.delivery_company,
                  deliveryParam: e.delivery_param,
                  list: tempDelivery,
                  createdAt: moment(e.created_at).format("YYYY-MM-DD"),
                  confirmAt: moment(e.confirm_at).format("YYYY-MM-DD"),
                  deliverdAt: moment(e.delivered_at).format("YYYY-MM-DD"),
                  completeAt: moment(e.updated_at).format("YYYY-MM-DD"),
                  detail1: "오프라인 광고물 a2 포스터, a3 포스터, a5 전단지, 테이블 텐트, 스티 커(매장 부착용 2종)",
                  detail2: "a2 포스터, a3 포스터, a5 전단지, 테이블 텐트, 스티 커(매장 부착용 2종), 테이블 텐트도 2종 구성으로 이루어져 있습니다. 매장을 방문하는 고객에게 스루를 홍보할 수 있어요.",
                  img: "https://prd-throo-store-product.s3.ap-northeast-2.amazonaws.com/store-id-0001020/photo_1652349653602-1024.jpg",
                  key: "kit"
               }
               tempCommercialList.push(temp); 
            }
         }

         if(tempCommercialList.length > 0){
            sResult.commercialList = tempCommercialList;
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
         console.log("getUsedCommercial error",error);
      }

      res.status(200).json(sResult);
   }
}

CommercialController.paymentList = async (req, res) => {
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
         const storeId = req.body.store_id; 
         const fromData = moment(req.body.fromData).format("YYYY-MM-DD"); 
         const toData = moment(req.body.toData).format("YYYY-MM-DD"); 
         const result = await Commercial.getCommercialPaymentList(parseInt(storeId),fromData,toData);
         if(result.length > 0){
            for await (const iterator of result) {
               let temp = {};
               let isPushItem = true;
               temp.key = iterator.order_id;
               temp.date = moment(iterator.created_at).format("YYYY-MM-DD HH:mm");
               temp.freeAmount = "0";
               temp.chargedAmount = "0";
               temp.cartAmount = "0";
               temp.payment = "0";
               temp.type = "";

               if(iterator.total_amount_org !== undefined && iterator.total_amount_org !== null){
                  temp.cartAmount = convertToKRW(parseInt(iterator.total_amount_org), false).toString() + "원";;
               }
               if(iterator.total_amount_incl !== undefined && iterator.total_amount_incl !== null){
                  temp.payment = convertToKRW(parseInt(iterator.total_amount_incl), false).toString() + "원";;
               }

               const pointDetail = await Commercial.getPointDetail(parseInt(iterator.order_id));
               if(pointDetail.length > 0){
                  for await (const e of pointDetail) {
                     if(e.type.toString() === "2"){
                        temp.type = "유상 포인트 충전";
                        temp.freeAmount = "0";
                        temp.chargedAmount = "0";
                        temp.cartAmount = "0";
                     } else if (e.type.toString() === "3") {
                        temp.type = "광고구매";
                        temp.freeAmount = convertToKRW(parseInt(e.points), false).toString();
                     } else if (e.type.toString() === "4") {
                        temp.type = "광고구매";
                        temp.chargedAmount = convertToKRW(parseInt(e.points), false).toString();
                     }
                  }
               } else {
                  isPushItem = false;
               }

               if(isPushItem){
                  sResult.push(temp);
               }
            }
         }
      } catch (error) {
         console.log("paymentList error",error);
      }

      res.status(200).json(sResult);
   }

}

CommercialController.completePaymentCommercial = async (req, res) => {
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
      let iData = {};
      let sResult = {
         resultCd: "9999",
         resultMsg: "네트워크에러입니다 나중에 다시 시도바랍니다.",
      };

      try {
         const storeId = req.body.store_id;
         const orderId = req.body.orderId;
         if(storeId !== undefined && storeId !== null && orderId !== undefined && orderId !== null){
            const getChargedPointInfomation = await Commercial.getChargedInfomationCommercial(orderId); 
            if(getChargedPointInfomation.length > 0){
               iStateId = getChargedPointInfomation[0].state_id;
               iResultCd = getChargedPointInfomation[0].result_cd;
               iAmount = getChargedPointInfomation[0].amount;
               iType = getChargedPointInfomation[0].type;
               process1 = true;
            }
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
            const getCommercialIdByOrderId = await Commercial.getCommercialIdByOrderId(orderId); 
            if(getCommercialIdByOrderId.length > 0){
               iData = getCommercialIdByOrderId[0];
               console.log("iData",iData);
               process4 = true;
            } else {
               sResult.resultMsg = "잘못된 정보입니다.";
            }
         }

         if(process4){
            const result = await Commercial.payCommercialLastStep(parseInt(storeId),parseInt(orderId),iData);
            if(result !== undefined){
               sResult.resultCd = "0000";
            }
         }
      } catch (error) {
         console.log("completePaymentCommercial error",error);
      }

      res.status(200).json(sResult);
   }
}

CommercialController.paymentCommercial = async (req, res) => {
   const iUserId = req.user.user_id;
   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
   } else {
      let pointFreeAmount = 0;
      let pointChargedAmount = 0;
      let tempCart = 0;
      let tempPointAmount = 0;
      let tempPointCharged = 0;
      let tempPay = 0;
      let tempPicket = false;
      let process1 = false;
      let process2 = false;
      let process3 = false;
      let sResult = {
         resultCd: "9999",
         orderId: 0,
         resultMsg: "",
      };

      try {
         const storeId = req.body.store_id;
         const cartList = req.body.cartList;
         const paymentAmount = req.body.paymentAmount;
         const osInfo = req.body.osInfo;

         if(storeId !== undefined && storeId !== null && cartList !== undefined && cartList !== null && paymentAmount !== undefined && paymentAmount !== null && osInfo !== undefined && osInfo !== null) {
            let iResult = {
               uuid: uuidv1(),
               storeId,
               cartAmount: 0,
               pointAmount: 0,
               pointChargedAmount: 0,
               payAmount: paymentAmount,
               osInfo,
               cartList,
               merchantPhone: "",
               productNm: "",
               merchantId: "",
               orderNr: "",
               storeNm: "",
               desc: "스토어아이디" + storeId + "광고구매",
               itemCount: 0,
               iLat: 0,
               iLng: 0,
            }

            if(cartList.length > 0){
               let pointFree = 0;
               let pointFreeUsed = 0;
               let pointCharged = 0;
               let pointChargedUsed = 0;
               const merchantPoints = await Commercial.getMerchantPoints(parseInt(storeId)); 
               if(merchantPoints.length > 0){
                  for await (const item of merchantPoints) {
                     if(item.type.toString() === "1"){
                        pointFree += item.points;
                     } else if (item.type.toString() === "2") {
                        pointCharged += item.points;
                     } else if (item.type.toString() === "3") {
                        pointFreeUsed += Math.abs(item.points); 
                     } else if (item.type.toString() === "4") {
                        pointChargedUsed += Math.abs(item.points); 
                     }
                  }
                  
                  if(parseInt(pointFree - pointFreeUsed) > 0){
                     pointFreeAmount = parseInt(pointFree - pointFreeUsed);
                  } else {
                     pointFreeAmount = 0;
                  }
                  if(parseInt(pointCharged - pointChargedUsed) > 0){
                     pointChargedAmount = parseInt(pointCharged - pointChargedUsed);
                  } else {
                     pointChargedAmount = 0;
                  }
               }
               process1 = true;
            } else {
               sResult.resultCd = "8888";
               sResult.resultMsg = "잘못된 접근입니다.";
            }
            
            if(process1){
               for await (const iterator of cartList) {
                  if(iterator.param === "picket"){
                     tempPicket = true;
                  }
                  tempCart += parseInt(iterator.price);
               }

               if(tempPicket){
                  if((parseInt(pointFreeAmount) + parseInt(pointChargedAmount)) >= parseInt(tempCart)){
                     const pResult = await pointSumCheck(tempCart,pointFreeAmount,pointChargedAmount);
                     tempPointAmount = pResult.tempPoint;
                     tempPointCharged = pResult.tempPointCharged;
                     tempPay = pResult.tempPay;
                  } else if(parseInt(pointFreeAmount) >= parseInt(tempCart)){
                     const pResult = await pointCheck(tempCart,pointFreeAmount,pointChargedAmount);
                     tempPointAmount = pResult.tempPoint;
                     tempPointCharged = pResult.tempPointCharged;
                     tempPay = pResult.tempPay;
                  } else if(parseInt(pointChargedAmount) >= parseInt(tempCart)){
                     tempPointCharged = parseInt(tempCart);
                  } else {
                     const pResult = await calcaulateCheck(tempCart,pointFreeAmount,pointChargedAmount);
                     tempPointAmount = pResult.tempPoint;
                     tempPointCharged = pResult.tempPointCharged;
                     tempPay = pResult.tempPay;
                  }
               } else {
                  if(parseInt(pointFreeAmount) >= parseInt(tempCart)){
                     tempPointAmount = parseInt(tempCart);
                  } else if(parseInt(pointChargedAmount) >= parseInt(tempCart)){
                     tempPointCharged = parseInt(tempCart);
                  } else if((parseInt(pointFreeAmount) + parseInt(pointChargedAmount)) >= parseInt(tempCart)){
                     tempPointAmount = parseInt(pointFreeAmount);
                     tempPointCharged = parseInt(tempCart) - parseInt(pointFreeAmount);
                  } else {
                     tempPointAmount = parseInt(pointFreeAmount);
                     tempPointCharged = parseInt(pointChargedAmount);
                     tempPay = parseInt(tempCart) - parseInt(pointFreeAmount) - parseInt(pointChargedAmount);
                  }
               }

               if(tempPointAmount < 0){
                  tempPointAmount = 0;
               }
               if(tempPointCharged < 0){
                  tempPointCharged = 0;
               }
               if(tempPay < 0){
                  tempPay = 0;
               }

               if(tempPay.toString() === paymentAmount.toString()){
                  iResult.cartAmount = parseInt(tempCart);
                  iResult.pointAmount = parseInt(tempPointAmount);
                  iResult.pointChargedAmount = parseInt(tempPointCharged);
                  iResult.payAmount = parseInt(tempPay);
                  iResult.itemCount = cartList.length;
                  process2 = true;
               } else {
                  process2 = false;
               }
            } else {
               sResult.resultCd = "7777";
               sResult.resultMsg = "잘못된 접근입니다.";
            }

            if(process2){
               const getStoreInfomation = await Commercial.getBasicInfomationCommercial(parseInt(storeId));
               if(getStoreInfomation.length > 0){
                  if(parseInt(tempPay) > 0){
                     iResult.desc = "스토어아이디" + storeId + "광고구매" + "결제금액" + tempPay + "원" + "광고포인트 사용 " + (parseInt(tempPointAmount) + parseInt(tempPointCharged)) + "원";
                     iResult.productNm = "광고 " + cartList.length.toString() + "개" + convertToKRW(parseFloat(tempPay), true) + "원";
                  } else {
                     iResult.productNm = "광고 " + cartList.length.toString() + "개";
                  }

                  iResult.iLat = getStoreInfomation[0].lat;
                  iResult.iLng = getStoreInfomation[0].lng;
                  iResult.merchantId = getStoreInfomation[0].merchant_id;
                  iResult.merchantPhone = getStoreInfomation[0].phone_number;
                  iResult.orderNr = getStoreInfomation[0].merchant_id + (Math.random() * (10 - 1)) + 1;
                  iResult.storeNm = getStoreInfomation[0].store_name;
                  process3 = true;
               }
            } else {
               sResult.resultCd = "6666";
               sResult.resultMsg = "잘못된 접근입니다.";
            }

            if(process3){
               if(parseInt(tempPay) > 0){
                  const result = await Commercial.payCommercialFirstStep(iResult); 
                  if(result.resultCd === "0000"){
                     sResult.resultCd = "0101";
                     sResult.orderId = result.orderId;
                  }
               } else {
                  const result = await Commercial.zeroAmountCommercialProduct(iResult); 
                  if(result === "0000"){
                     sResult.resultCd = "0000";
                     sResult.resultMsg = "광고구매가 정상적으로 되었습니다.";
                  }
               }
            }
         }
         
      } catch (error) {
         console.log("paymentCommercial error",error);
      }

      res.status(200).json(sResult);
   }
}

CommercialController.chargedPointLastStep = async (req, res) => {
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
            const getChargedPointInfomation = await Commercial.getChargedInfomationCommercial(orderId); 
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
               const result = await Commercial.completeCommercialChargedDB(parseInt(storeId),parseInt(orderId),parseInt(iAmount));
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

CommercialController.chargedPointFirstStep = async (req, res) => {
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
            const getStoreInfomation = await Commercial.getBasicInfomationCommercial(parseInt(storeId));
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
               const result = await Commercial.chargedPointFirstStep(oData);
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

CommercialController.getCommercialProductList = async (req, res) => {
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
         const storeProductList = await Commercial.getSoreCommercialProductListWithImg(parseInt(storeId));
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

CommercialController.getCommercialThrooOnlyList = async (req, res) => {
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
         const storeProductList = await Commercial.getSoreCommercialThrooOnlyListWithImg(parseInt(storeId));
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

CommercialController.getCommercialCouponList = async (req, res) => {
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
         const result = await Commercial.storeCouponList(parseInt(storeId));
         if(result.length > 0){
            for await (const iterator of result) {
                  let temp = {};
                  temp.id = iterator.coupon_id;
                  temp.name = iterator.name;
                  temp.couponCount = iterator.count_limit;
                  temp.fromDate = moment(iterator.start_date).format("YYYY-MM-DD");
                  temp.toDate = moment(iterator.end_date).format("YYYY-MM-DD");
   
                  const is_before = moment().isBefore(temp.toDate);
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
                  
   
                  const countNm = await Commercial.couponUserDownload(parseInt(iterator.coupon_id));
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

CommercialController.getCommercial = async (req, res) => {
   const iUserId = req.user.user_id;
   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
   } else {
      let tempItemList = [
         {
            name: "야외 광고 배너",
            price: "30000",
            priceCasting: "30,000(무상포인트 사용은 최대 15,000)",
            date: "-",
            id: "6",
            key: "6",
            param: "picket",
            detail1: "오프라인 광고물 배너, 물통, 폴대4개, 메인파이프 사이즈 1800 x 600mm 입니다",
            detail2: "우리 매장의 인기 상품을 광고해 보세요. 우리 매장의 인기상품을 고객에게 알릴 수 있습니다.",
            img: "https://prd-throo-store-product.s3.ap-northeast-2.amazonaws.com/store-id-0001020/photo_1652349677783-1024.jpg"
         },
         {
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
         }
      ];
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
         const adverEvent = await Commercial.getAdverEvent(parseInt(storeId),today);
         const adverProductPopular = await Commercial.getAdverProductPopular(parseInt(storeId),today);
         const adverCoupon = await Commercial.getAdverCoupon(parseInt(storeId),today);
         const adverProductThrooOnly = await Commercial.getAdverProductThrooOnly(parseInt(storeId),today);
         const adverStore = await Commercial.getAdverStore(parseInt(storeId),today);
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
         sResult.commercialList = tempItemList;
         
         const merchantPoints = await Commercial.getMerchantPoints(parseInt(storeId)); 
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
         
         const checkNewStoreCommercial = await Commercial.checkNewStoreCommercial(parseInt(storeId)); 
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
         const checkThrooDeliveryKit = await Commercial.checkThrooDeliveryKit(parseInt(storeId));
         if(checkThrooDeliveryKit.length > 0){
            sResult.storeType = "used";
         }
         const checkThrooDeliveryBanner = await Commercial.checkThrooDeliveryBanner(parseInt(storeId));
         if(checkThrooDeliveryBanner.length > 0){
            sResult.storeType = "used";
         }
      } catch (error) {
         console.log("StoreController.getCommercialApp fail! ====>> error:", error);
      }
   
      res.status(200).json(sResult);
   }
}


module.exports = CommercialController;