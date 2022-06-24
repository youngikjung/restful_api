'use strict';

var jwt = require('jsonwebtoken');
var config = require('../../config');

const axios = require("axios");

const Store = require('../../models/store');
const User = require('../../models/user');
const StoreMenu = require('../../models/storemenu');
const Product = require('../../models/product');
const Barista = require('../../models/barista');
const Merchant = require('../../models/merchant');

const pdf = require('html-pdf');
const fs = require('fs');
const xml2js = require('xml2js')
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
} = require('../../helpers/errorHelper');

const {
   completeSignUpEmail
} = require('../../helpers/emailSender');

const {
   convertToKRW,
   padString,
   groupArrayByKey
} = require('../../helpers/stringHelper');

var oValidate = require("validate.js");
const { async } = require('validate.js');
const Order = require('../../models/order');

const calculatePay = async (preDate,afterDate,storeId) => {
   let tempTotalAmt = 0;
   let tempFee = 0;
   let tempCouponP = 0;
   let temp = 0;

   const calPayment = await Order.dashboardMerchantData(preDate,afterDate,storeId);
   if(calPayment.length > 0){
      for await (const iterator of calPayment) {
         if(iterator.totalAmount !== undefined && iterator.totalAmount !== null){
            tempTotalAmt += Math.floor(parseFloat(iterator.totalAmount));
         }
         if(iterator.payment !== undefined && iterator.payment !== null){
            tempFee += Math.floor(parseFloat(iterator.payment) * 0.033);
         }
         if(iterator.coupon_partner_amount !== undefined && iterator.coupon_partner_amount !== null){
            tempCouponP += Math.floor(parseFloat(iterator.coupon_partner_amount));
         }
      }
      temp = convertToKRW((tempTotalAmt - (tempCouponP + tempFee)), true);
   }
   return temp;
}


async function* asyncGenerator(sIndex) {
   let count = 0;
   while (count < sIndex) 
   yield count++;
};

// The admin controller.
var DashboardController = {}


DashboardController.index = function (req, res) {
   res.status(200).json({ message: 'Welcome to the store area !' });
}

DashboardController.storeOnOff = async (req, res) => {
   const iUserId = req.user.user_id;
   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
   } else {
      const storeId = req.body.store_id;
      const checked = req.body.checked;
      let sResult = {
         resultCd : "9999",
         resultMsg: "네트워크 에러입니다 나중에 다시 시도바랍니다."
      };

      try {
         if(!checked){
            const statusStore = await Store.storeOperationSleep(storeId);
            if(statusStore){
               sResult.resultCd = "0000";
               sResult.resultMsg = "변경되었습니다.";
            }
         } else {
            const getStatus = await Store.isLogin(storeId);
            if(getStatus !== undefined && getStatus !== null){
               if(parseInt(getStatus[0].sNm) > 0){
                  const statusStore = await Store.storeOperationWakeUp(storeId);
                  if(statusStore){
                     sResult.resultCd = "0000";
                     sResult.resultMsg = "변경되었습니다.";
                  }
               } else {
                  sResult.resultMsg = "포스에 로그인이 필요합니다.";
               }
            } else {
               sResult.resultMsg = "포스에 로그인이 필요합니다.";
            }
         }
      } catch (error) {
         console.log("changeStatus fail! ====>> error:", error);
      }
      res.status(200).json(sResult);
   }
}

DashboardController.operationStore = async (req, res) => {
   let sResult = {
      resultCd: "9999",
      resultMsg: "네트워크 에러입니다, 잠시 후 다시 시도바랍니다.",
   };
   let checkedMerchant = false;
   let checkedProduct = false;
   let checkedStore = false;
   let storeName = "";

   try {
      const storeId = req.body.sParam;
      let checkMerchant = await Store.checkMerchantStatus(storeId);
      sResult.resultMsg = "사업자 인증을 해주세요";
      checkMerchant = checkMerchant[0];
      if(parseInt(checkMerchant.status) > 0){
         checkedMerchant = true;
      }

      if(checkedMerchant){
         let checkProduct = await Store.verifyProduct(storeId);
         sResult.resultMsg = "상품을 등록해주세요";
         if(checkProduct !== undefined){
            checkProduct = checkProduct[0];
            if(parseInt(checkProduct.sCount) > 0){
               checkedProduct = true;
            }
         }
      } 

      if(checkedProduct){
         sResult.resultMsg = "매장 정보를 입력해주세요";
         const checkStore = await Store.lastCheckUpAuthenticate(storeId);
         if(checkStore !== undefined && checkStore !== null){
            if(checkStore.length > 0){
               storeName = checkStore[0];
               storeName = storeName.store_name;
               checkedStore = true;
            }
         }
      }

      if(checkedStore){
         const startOperation = await Store.startOperationCeoPage(storeId);
         if(startOperation !== undefined){
            completeSignUpEmail(storeName);
            sResult.resultCd = "0000";
         }
      }

   } catch (error) {
      console.log("operationStore fail! ====>> error:", error);
   }

   res.status(200).json(sResult);
}

DashboardController.currentStatus = async (req, res) => {
   let sResult = false;
   
   try {
      const storeId = req.params.sParam;
      const result = await Store.isLogin(storeId);
      if(result !== undefined && result !== null){
         if(parseInt(result[0].sNm) > 0){
            sResult = true;
         }
      }
      
   } catch (error) {
      console.log("currentStatus fail! ====>> error:", error);
   }

   res.status(200).json(sResult);
}

DashboardController.getDashBoardData = async (req, res) => {
   let noticeData = { result: false, list: [] };
   let merchantData = { result: false, lastMonthPay: 0, preAmount: 0 };
   let storeData = { result: false, storeNm: "미정", phoneNm: "", notiAlarm: "", type: "", parkingTime: "" };
   let productData = { result: false, list: [] };
   let mainData = { payment: 0, totalCount: 0, yesterday: 0, percent: 0, totalCancel: 0, userCancel: 0, storeCancel: 0 ,cancel: 0, sChart: [] };

   try {
      const storeId = req.params.sParam;
      const noticeList = await Store.noticeListTotal();
      if(noticeList.length > 0){
         for await (const iterator of noticeList) {
            let temp = {};
            temp.title = iterator.title;
            temp.date = moment(iterator.created_at).format('L');
            noticeData.list.push(temp);
         }
         noticeData.result = true;
      }
      
      let merchantStatus = await Store.checkMerchantStatus(storeId);
      if(merchantStatus.length > 0){
         merchantStatus = merchantStatus[0];
         if(parseInt(merchantStatus.status) > 0){
            const preDate = moment().startOf('week').add(1,"days").format('YYYY-MM-DD');
            const afterDate = moment().endOf('week').add(1,"days").format('YYYY-MM-DD');
            const exDate = moment().startOf('week').add(-6,"days").format('YYYY-MM-DD');
            const exAfterDate = moment().endOf('week').add(-6,"days").format('YYYY-MM-DD');
            merchantData.preAmount = await calculatePay(preDate,afterDate,storeId);
            merchantData.lastMonthPay = await calculatePay(exDate,exAfterDate,storeId);
            merchantData.storeName = merchantStatus.store_name;
            merchantData.result = true;
         }
      }
      
      let checkStore = await Store.verifyStore(storeId);
      if(checkStore.length > 0){
         storeData.result = true;
         let getStoreInfo = await Store.dashboardStoreData(storeId);
         if(getStoreInfo.length > 0){
            getStoreInfo = getStoreInfo[0];
            if(getStoreInfo.store_name !== undefined && getStoreInfo.store_name !== null && getStoreInfo.store_name !== ""){
               storeData.storeNm = getStoreInfo.store_name;
            }
            if(getStoreInfo.noti_nearby_distance !== undefined && getStoreInfo.noti_nearby_distance !== null && getStoreInfo.noti_nearby_distance !== ""){
               storeData.notiAlarm = getStoreInfo.noti_nearby_distance;
            }
            if(getStoreInfo.phone_number !== undefined && getStoreInfo.phone_number !== null && getStoreInfo.phone_number !== ""){
               storeData.phoneNm = getStoreInfo.phone_number;
            }
            if(getStoreInfo.parking_time !== undefined && getStoreInfo.parking_time !== null && getStoreInfo.parking_time !== ""){
               storeData.parkingTime = getStoreInfo.parking_time;
            }
            if(getStoreInfo.name !== undefined && getStoreInfo.name !== null && getStoreInfo.name !== ""){
               storeData.type = getStoreInfo.name;
            }
         }
      }
      
      let checkProduct = await Product.dashboardProduct(storeId);
      checkProduct = checkProduct[0];
      if(parseInt(checkProduct.productCount) > 0){
         const toDate = moment().format("YYYY-MM-DD");
         let sChart = [];
         let totalCount = 0;
         let pauseCount = 0;
         
         const pieChart = await Store.getPieChartData(storeId, "2021-01-01", toDate);
         if(pieChart.length > 0){
            totalCount = parseInt(pieChart[0].total);
            for await (let iCount of pieChart) {
               let sTemp = {};
               sTemp.type = iCount.name;
               sTemp.value = parseInt(iCount.price);
               
               if(pauseCount < 5){
                  sChart.push(sTemp);
                  pauseCount = pauseCount + 1;
                  totalCount = totalCount - parseInt(iCount.price);
               }
            }
            
            if(pieChart.length > 5){
               let oData = { type: '나머지',value: totalCount};
               sChart.push(oData);
            }
         } else {
            let oData = [{ type: '데이터가 없습니다',value: 0}]
            sChart = oData;
         }
         productData.result = true;
         productData.list = sChart;
      }
      
      let calculatePercent = await Order.calculatePercent(storeId,storeId);
      if(calculatePercent.length > 0){
         calculatePercent = calculatePercent[0].percentage;
         console.log("calculatePercent",calculatePercent);
         if(calculatePercent !== undefined && calculatePercent !== null){
            mainData.percent = calculatePercent;
         }
      }
      console.log("mainData",mainData);
      
      const weeklyDate = moment().format("YYYY-MM-DD");
      const weeklyRecentDate = moment().add(-1, 'days').format("YYYY-MM-DD");
      const dashboardChartData = await Order.dashboardChartData(storeId,weeklyRecentDate,weeklyDate);
      if(dashboardChartData.length > 0){
         let tempPayment =  0; 
         let tempYesterday =  0;
         let tempTotalCount =  0;
         let tempTotalCancel = 0; 
         let tempUserCancel = 0;
         let tempStoreCancel = 0;
         let tempCancel = 0;
         for await (const iterator of dashboardChartData) {
            if(weeklyDate === moment(iterator.created_at).format("YYYY-MM-DD")){
               if(iterator.payment_id !== null && iterator.cancelled_at === null){
                  tempTotalCount += 1;
               } else {
                  tempTotalCancel += 1;
                  if(iterator.state_id.toString() === "16001"){
                     tempUserCancel += 1;
                  } else if (iterator.state_id.toString() === "17001"){
                     tempStoreCancel += 1;
                  } else if (iterator.state_id.toString() === "18001"){
                     tempCancel += 1;
                  }
               }
               tempPayment += Math.floor(parseFloat(iterator.total_amount_org));
            } else if(moment().add(-1, 'days').format("YYYY-MM-DD") === moment(iterator.created_at).format("YYYY-MM-DD")){
               tempYesterday += 1;
            } 
         }
         mainData.payment = tempPayment;
         mainData.totalCount = tempTotalCount;
         mainData.yesterday = tempYesterday;
         mainData.totalCancel = tempTotalCancel;
         mainData.userCancel = tempUserCancel;
         mainData.storeCancel = tempStoreCancel;
         mainData.cancel = tempCancel;
      }
      
      for await (let iCount of asyncGenerator(7)) {
         let tempList = {};
         let tempPrice = 0;
         let sDay = moment().add(-iCount, 'days').format('MM-DD');
         let temp = moment().add(-iCount, 'days').format("YYYY-MM-DD");
         let preDate = temp + " 00:00:00";
         let sAfterDate = moment(temp).add(1, 'days').format("YYYY-MM-DD");
         sAfterDate = sAfterDate + " 00:00:00";
         const settlementOfSalesDay = await Store.doubleChartForDay(parseInt(storeId), preDate, sAfterDate);
         
         if(settlementOfSalesDay[0].count != null){
            tempPrice = parseInt(settlementOfSalesDay[0].count);
         }
         tempList.date = sDay;
         tempList.scale = tempPrice;

         mainData.sChart.push(tempList);
      }

   } catch (error) {
      console.log("getDashBoardData fail! ====>> error:", error);
   }
   
   res.status(200).json({noticeData,merchantData,storeData,productData,mainData});
}



module.exports = DashboardController;