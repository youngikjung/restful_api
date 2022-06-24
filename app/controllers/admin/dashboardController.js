'use strict';

var jwt = require('jsonwebtoken');
var config = require('../../config');
var bcrypt = require('bcryptjs');

const Store = require('../../models/store');
const User = require('../../models/user');
const Worker = require('../../models/worker');
const Order = require('../../models/order');
const Management = require('../../models/management');
const Commercial = require('../../models/commercial');

const CryptoJS = require('crypto-js');
const crypto = require("crypto");
const axios = require('axios').default;
const ExcelJS = require('exceljs');
const fs = require('fs');
const moment = require('moment-timezone');
require('moment/locale/ko');

// Bcrypt functions used for hashing password and later verifying it.
const SALT_ROUNDS = 10;
const hashPassword = password => bcrypt.hash(password, SALT_ROUNDS);
const verifyPassword = (password, hash) => bcrypt.compare(password, hash);

const {
   sendAlertMessage,
   sendPushMessageForSales,
   sendPushMessageForStoreApp,
   sendThrooAlertMessage
} = require('../../batch/job/checkUser');

const {
   createError,
   BAD_REQUEST,
   UNAUTHORIZED,
   UNPROCESSABLE,
   CONFLICT,
   NOT_FOUND,
   GENERIC_ERROR
} = require('../../helpers/errorHelper');

const helpers = require('../../helpers/imageHelper');

const {
   convertToKRW,
   mysqlDateToYMD,
   padString,
   getCurrentDatetime,
   getClientIP
} = require('../../helpers/stringHelper');

const {
   inquireEmail,
   settlementEmail
} = require('../../helpers/emailSender');

var oValidate = require("validate.js");

const { async } = require('validate.js');

const beforeSave = user => {
   if (!user.password) return Promise.resolve(user)

   // `password` will always be hashed before being saved.
   return hashPassword(user.password)
      .then(hash => ({ ...user, password: hash }))
      .catch(err => `Error hashing password: ${err}`)
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

async function* asyncGenerator3(sIndex) {
   let count = sIndex;
   while (count > 7) 
   yield count--;
};

async function* asyncGenerator4(sIndex) {
   let count = sIndex;
   while (count > 14) 
   yield count--;
};

const loopChartDataV2 = async (kIndex,sIndex,aIndex) => {
   let oResult = [];
   for await (let iCount of asyncGenerator2(sIndex,aIndex)) {
      let userChart;
      let sDay = moment().add(-iCount, 'days').format('YYYY-MM-DD');
      let temp = {};
      if(kIndex === "total"){
         userChart = await Management.userIncreaseChartByTotal(sDay);
         userChart = userChart[0];
         temp.name = "전체"
      } else if (kIndex === "kakao") {
         userChart = await Management.userIncreaseChartByKakao(sDay);
         userChart = userChart[0];
         temp.name = "카카오"
      } else if (kIndex === "normal") {
         userChart = await Management.userIncreaseChartByNormal(sDay);
         userChart = userChart[0];
         temp.name = "일반"
      } else if (kIndex === "apple") {
         userChart = await Management.userIncreaseChartByApple(sDay);
         userChart = userChart[0];
         temp.name = "애플"
      } else if (kIndex === "order_complete") {
         userChart = await Management.completeOrderChart(sDay);
         userChart = userChart[0];
         temp.name = "픽업완료"
      } else if (kIndex === "store_cancel") {
         userChart = await Management.storeCancelOrderChart(sDay);
         userChart = userChart[0];
         temp.name = "매장취소"
      } else if (kIndex === "auto_cancel") {
         userChart = await Management.autoCancelOrderChart(sDay);
         userChart = userChart[0];
         temp.name = "자동취소"
      } else if (kIndex === "store_total") {
         userChart = await Management.getTotalStore(sDay);
         userChart = userChart[0];
         temp.name = "전체"
      } else if (kIndex === "store_activate") {
         userChart = await Management.getActivateStore(sDay);
         userChart = userChart[0];
         temp.name = "운영중"
      } else if (kIndex === "store_un_activate") {
         userChart = await Management.getUnActivateStore(sDay);
         userChart = userChart[0];
         temp.name = "미운영"
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

const loopChartDataV3 = async (kIndex,sIndex,aIndex) => {
   let oResult = [];
   for await (let iCount of asyncGenerator2(sIndex,aIndex)) {
      const sDay = moment().add(-iCount, 'M').format('YYYY-MM');
      const validFrom = moment(sDay).startOf('month').format('YYYY-MM-DD');
      const validTo = moment(sDay).endOf('month').format('YYYY-MM-DD');

      let userChart;
      let temp = {};
      if(kIndex === "total"){
         userChart = await Management.monthlyUserIncreaseChartByTotal(validFrom,validTo);
         userChart = userChart[0];
         temp.name = "전체"
      } else if (kIndex === "kakao") {
         userChart = await Management.monthlyUserIncreaseChartByKakao(validFrom,validTo);
         userChart = userChart[0];
         temp.name = "카카오"
      } else if (kIndex === "normal") {
         userChart = await Management.monthlyUserIncreaseChartByNormal(validFrom,validTo);
         userChart = userChart[0];
         temp.name = "일반"
      } else if (kIndex === "apple") {
         userChart = await Management.monthlyUserIncreaseChartByApple(validFrom,validTo);
         userChart = userChart[0];
         temp.name = "애플"
      } else if (kIndex === "storeTotal") {
         userChart = await Management.monthlyStoreIncreaseChart(validFrom,validTo);
         userChart = userChart[0];
         temp.name = "전체"
      } else if (kIndex === "storeActivate") {
         userChart = await Management.monthlyStoreIncreaseChartByActive(validFrom,validTo);
         userChart = userChart[0];
         temp.name = "정상영업"
      } else if (kIndex === "storeUnActivate") {
         userChart = await Management.monthlyStoreIncreaseChartByUnActive(validFrom,validTo);
         userChart = userChart[0];
         temp.name = "준비중"
      } else if (kIndex === "orderComplete") {
         userChart = await Management.completeOrderChartByMonth(validFrom,validTo);
         userChart = userChart[0];
         temp.name = "픽업완료"
      } else if (kIndex === "orderCancel") {
         userChart = await Management.storeCancelOrderChartByMonth(validFrom,validTo);
         userChart = userChart[0];
         temp.name = "주문취소"
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

const loopChartDataV4 = async (kIndex,sIndex,aIndex) => {
   let oResult = [];
   for await (let iCount of asyncGenerator2(sIndex,aIndex)) {
      const sDay = moment().add(-iCount, 'M').format('YYYY-MM');
      const validFrom = "2021-02-01";
      const validTo = moment(sDay).endOf('month').format('YYYY-MM-DD');

      let userChart;
      let temp = {};
      if(kIndex === "total"){
         userChart = await Management.monthlyUserIncreaseChartByTotal(validFrom,validTo);
         userChart = userChart[0];
         temp.name = "전체"
      } else if (kIndex === "kakao") {
         userChart = await Management.monthlyUserIncreaseChartByKakao(validFrom,validTo);
         userChart = userChart[0];
         temp.name = "카카오"
      } else if (kIndex === "normal") {
         userChart = await Management.monthlyUserIncreaseChartByNormal(validFrom,validTo);
         userChart = userChart[0];
         temp.name = "일반"
      } else if (kIndex === "apple") {
         userChart = await Management.monthlyUserIncreaseChartByApple(validFrom,validTo);
         userChart = userChart[0];
         temp.name = "애플"
      } else if (kIndex === "storeTotal") {
         userChart = await Management.monthlyStoreIncreaseChart(validFrom,validTo);
         userChart = userChart[0];
         temp.name = "전체"
      } else if (kIndex === "storeActivate") {
         userChart = await Management.monthlyStoreIncreaseChartByActive(validFrom,validTo);
         userChart = userChart[0];
         temp.name = "정상영업"
      } else if (kIndex === "storeUnActivate") {
         userChart = await Management.monthlyStoreIncreaseChartByUnActive(validFrom,validTo);
         userChart = userChart[0];
         temp.name = "준비중"
      } else if (kIndex === "orderComplete") {
         userChart = await Management.completeOrderChartByMonth(validFrom,validTo);
         userChart = userChart[0];
         temp.name = "픽업완료"
      } else if (kIndex === "orderCancel") {
         userChart = await Management.storeCancelOrderChartByMonth(validFrom,validTo);
         userChart = userChart[0];
         temp.name = "주문취소"
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

const checkValidation = async (sIndex) => {
   let roll = "";
   try {
      const result = await Worker.getRoll(sIndex);
      if(result !== undefined && result !== null){
         roll = result.roll;
      }
   } catch (error) {
      console.log("error",error);
   }
   return roll;
}

const loopChartData = async (sParam,xNm,sNm) => {
   let tempList = [];

   for await (let iCount of asyncGenerator2(12,0)) {
      let sDay = moment().add(-iCount, 'M').format('YYYY-MM');
      let toDate = await moment().add(-iCount, 'M');
      let preDate = await toDate.startOf("month").format("YYYY-MM-DD");
      let afterDate = await toDate.endOf("month").format("YYYY-MM-DD");
      let temp = {};
      
      if(sParam === "userIncrease"){
         let userChart = await Management.userIncreaseChart(preDate,afterDate);
         userChart = userChart[0];
         temp.Date = sDay;
         temp.scales = 0;
         if(userChart.total !== undefined && userChart.total !== null && parseInt(userChart.total) > 0 ){
            temp.scales = parseInt(userChart.total);
         }
      } else if (sParam === "userCard") {
         let userChart = await Management.userCardChart(preDate,afterDate);
         userChart = userChart[0];
         temp.name = "RegisterCard";
         temp.month = sDay;
         temp.scales = 0;
         if(userChart.total !== undefined && userChart.total !== null && parseInt(userChart.total) > 0 ){
            temp.scales = parseInt(userChart.total);
         }
      } else if (sParam === "userCar") {
         let userChart = await Management.userCarChart(preDate,afterDate);
         userChart = userChart[0];
         temp.name = "RegisterCar";
         temp.month = sDay;
         temp.scales = 0;
         if(userChart.total !== undefined && userChart.total !== null && parseInt(userChart.total) > 0 ){
            temp.scales = parseInt(userChart.total);
         }
      } else if (sParam === "userBluelink") {
         let userChart = await Management.userBlueLinkChart(preDate,afterDate);
         userChart = userChart[0];
         temp.name = "ConnectedCar";
         temp.month = sDay;
         temp.scales = 0;
         if(userChart.total !== undefined && userChart.total !== null && parseInt(userChart.total) > 0 ){
            temp.scales = parseInt(userChart.total);
         }
      } else if (sParam === "salesChart") {
         let userChart = await Management.salesChart(xNm,preDate,afterDate);
         userChart = userChart[0];
         temp.name = sNm;
         temp.month = sDay;
         temp.scales = 0;
         if(userChart.total !== undefined && userChart.total !== null && parseInt(userChart.total) > 0 ){
            temp.scales = parseInt(userChart.total);
         }
      } else if (sParam === "storeIncrease") {
         let storeChart = await Management.storeIncreaseChart(preDate,afterDate);
         storeChart = storeChart[0];
         temp.Date = sDay;
         temp.scales = 0;
         if(storeChart.total !== undefined && storeChart.total !== null && parseInt(storeChart.total) > 0 ){
            temp.scales = parseInt(storeChart.total);
         }
      } else {
         let storeTypeChart = await Management.storeTypeChart(preDate,afterDate,xNm);
         storeTypeChart = storeTypeChart[0];
         temp.name = sParam;
         temp.month = sDay;
         temp.scales = 0;
         if(storeTypeChart.total !== undefined && storeTypeChart.total !== null && parseInt(storeTypeChart.total) > 0 ){
            temp.scales = parseInt(storeTypeChart.total);
         }
      }
      tempList.push(temp);
   }

   return tempList;
}

const excelData = async (getMonthlyData) => {
   let result = {};
   let totalData = [];
   let summaryList = {};
   let iTotalAmt = 0;
   let iThrooDiscount = 0;
   let iStoreDiscount = 0;
   let sPayment = 0;
   let iFee = 0;
   let iReturn = 0;

   for (const iterator of getMonthlyData) {
      let tempTotalAmt = 0;
      let tempThrooDiscount = 0;
      let tempStoreDiscount = 0;
      let tempThrooCoupon = 0;
      let tempThrooPoint = 0;
      let tempFee = 0;
      let tempPayment = 0;
      let tempReturn = 0;
      
      let temp = {};
      temp.date = "";
      temp.amount = 0;
      temp.discount = 0;
      temp.reward = 0;
      temp.card = 0;
      temp.fee = 0;
      temp.return = 0;
      
      if(iterator.created_at !== undefined && iterator.created_at !== null){
         temp.date = iterator.created_at; 
      }

      if(iterator.total_amount_org !== undefined && iterator.total_amount_org !== null){
         tempTotalAmt = Math.floor(parseFloat(iterator.total_amount_org)); 
         temp.amount = convertToKRW(Math.floor(parseFloat(iterator.total_amount_org)), true); 
      }

      if(iterator.total_amount_incl !== undefined && iterator.total_amount_incl !== null){
         tempFee = Math.floor(parseFloat(iterator.total_amount_incl) * 0.033);
         tempPayment = Math.floor(parseFloat(iterator.total_amount_incl));
         temp.card = convertToKRW(Math.floor(parseFloat(iterator.total_amount_incl)), true);
         temp.fee = convertToKRW(Math.floor(parseFloat(iterator.total_amount_incl) * 0.033), true);
      }

      if(iterator.coupon_amount !== undefined && iterator.coupon_amount !== null && parseInt(iterator.coupon_amount) > 0){
         tempThrooCoupon = Math.floor(parseFloat(iterator.coupon_amount));
      }

      if(iterator.points_amount !== undefined && iterator.points_amount !== null && parseInt(iterator.points_amount) > 0){
         tempThrooPoint = Math.floor(parseFloat(iterator.points_amount));
      }

      if(iterator.coupon_partner_amount !== undefined && iterator.coupon_partner_amount !== null && parseInt(iterator.coupon_partner_amount) > 0){
         tempStoreDiscount = Math.floor(parseFloat(iterator.coupon_partner_amount));
      }

      tempThrooDiscount = tempThrooCoupon + tempThrooPoint;
      tempReturn = tempTotalAmt - (tempFee + tempStoreDiscount);
      temp.return = convertToKRW(tempReturn, true);
      temp.discount = convertToKRW(tempThrooDiscount, true);
      temp.reward = convertToKRW(tempStoreDiscount, true);
      totalData.push(temp);

      iTotalAmt = tempTotalAmt + iTotalAmt;
      iThrooDiscount = tempThrooDiscount + iThrooDiscount;
      iStoreDiscount = tempStoreDiscount + iStoreDiscount;
      sPayment = tempPayment + sPayment;
      iFee = tempFee + iFee;
      iReturn = tempReturn + iReturn;
   }

   summaryList.totalAmount = iTotalAmt;
   summaryList.discount = iThrooDiscount;
   summaryList.store = iStoreDiscount;
   summaryList.payment = sPayment;
   summaryList.fee = iFee;
   summaryList.return = iReturn;

   result.summaryList = summaryList;
   result.orderData = totalData;

   return result;
}

const fileMove =async  (kParam) => {
   try { 
      const oldPath = process.cwd() + '/settlement.xlsx';
      const newPath = process.cwd() + `/public/settlement/${kParam}.xlsx`;
      await fs.rename(oldPath, newPath, function (err) {
         if (err) throw "fail";
         return "succ";
      })
      return err;
   } catch(err) {
      return err;
   }
}

const excelSheet = async (sParam,iParam,kParam,dParam,eParam) => {
   let isgoing = false;
   let workbook = new ExcelJS.Workbook();
   const summarySheet = workbook.addWorksheet("요약");
   summarySheet.columns = [
      { header : "주문금액(할인점 총주문액)", key: "totalAmount", width: 30},
      { header : "할인지원금(스루 지원)", key: "discount", width: 30},
      { header : "혜택할인금(매장 자체 할인)", key: "store", width: 30},
      { header : "고객 결제금액", key: "payment", width: 30},
      { header : "PG결제수수료(3%,부가세별도)", key: "fee", width: 30},
      { header : "입금받을금액", key: "return", width: 30},
   ];
   summarySheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, bgColor: "#ADD1FE" };
   });

   const summaryData = {
      totalAmount : sParam.totalAmount,
      discount : sParam.discount,
      store : sParam.store,
      payment : sParam.payment,
      fee : sParam.fee,
      return : sParam.return,
   };
   await summarySheet.addRow(summaryData);
   
   const dataSheet = workbook.addWorksheet("상세");
   dataSheet.columns = [
      { header : "날짜", key: "date", width: 30},
      { header : "주문금액", key: "amount", width: 30},
      { header : "할인지원금", key: "discount", width: 30},
      { header : "혜택지원금", key: "reward", width: 30},
      { header : "카드결제", key: "card", width: 30},
      { header : "결제수수료", key: "fee", width: 30},
      { header : "입금받을금액", key: "return", width: 30},
   ];
   dataSheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, bgColor: "#ADD1FE" };
   });

   for await (let sItem of iParam) {
      const dataPageData = {
         date: sItem.date,
         amount: sItem.amount,
         discount: sItem.discount,
         reward: sItem.reward,
         card: sItem.card,
         fee: sItem.fee,
         return: sItem.return,
      };
      await dataSheet.addRow(dataPageData);
   }

   await workbook.xlsx.writeFile("settlement.xlsx");

   const renameXlsx = await fileMove(kParam);
   if(renameXlsx !== "fail"){
      const newPath = process.cwd() + `/public/settlement/${kParam}.xlsx`;
      const sender = await settlementEmail(eParam.toString(),kParam,newPath,dParam);
      if(sender){
         isgoing = true;
         await fs.stat(process.cwd() + `/public/settlement/${kParam}.xlsx`, function (err, stats) {
            if (!err) {
               fs.unlink(process.cwd() + `/public/settlement/${kParam}.xlsx`,function(error){
                  if (error) {
                     console.log("file unlink err =>>>>>> ", moment(), "storeName => ",kParam);
                  }
               });  
            }
         });
      }
   }

   return isgoing;
};


const cancellationByRestfulApi = async (amt, sTid, sMethod) => {
   var formBody = [];

   let oApiKey = {
      sTitle: '',
      content: '',
      tid: '',
      cancelDate: ''
   };

   let oData = {
      api_key: config.keys.apiKey,
      mid: config.keys.mid,
      cancel_pw: config.keys.cancelPw,
      cancel_amt: parseInt(amt),
      partial_cancel: parseInt(0),
      tid: sTid
   }

   if (sMethod === 'online') {
      oData = {
         api_key: config.keys.apiKeyIso,
         mid: config.keys.midIso,
         cancel_pw: config.keys.cancelPw,
         cancel_amt: parseInt(amt),
         partial_cancel: parseInt(0),
         tid: sTid
      }
   }

   for (var property in oData) {
      var encodedKey = encodeURIComponent(property);
      var encodedValue = encodeURIComponent(oData[property]);
      formBody.push(encodedKey + "=" + encodedValue);
   }
   formBody = formBody.join("&");

   try {
      const tpay_ApiKey = await axios({
         url: `https://webtx.tpay.co.kr/api/v1/refunds`,
         method: "post",
         timeout: (15 * 1000),
         headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
         },
         data: formBody,
         transformResponse: [(data) => {
            return data;
         }],
      });

      if (tpay_ApiKey == undefined && tpay_ApiKey.data == undefined) {
         oApiKey.sTitle = '99999999';
         oApiKey.content = '서버전송에 실패하였습니다.';
      } else {
         const oResult = JSON.parse(tpay_ApiKey.data);
         if (oResult.result_cd == '2001') {
            oApiKey.sTitle = '000';
            oApiKey.content = oResult.result_msg;
            oApiKey.tid = oResult.tid;
            oApiKey.cancelDate = oResult.CancelDate + oResult.CancelTime;
         } else {
            oApiKey.sTitle = oResult.result_cd;
            oApiKey.content = oResult.result_msg;
         }
      }
      return oApiKey;
   } catch (error) {
      if (error != undefined) {
         if (error.response != undefined) {
            const oResponse = JSON.parse(error.response.data);
            oApiKey.sTitle = '99999998';
            oApiKey.content = oResponse;
            console.error('oResponse :' + oResponse);
         } else {
            oApiKey.sTitle = '99999997';
            oApiKey.content = error;
            console.error('error : ' + error);
         }
         return oApiKey;
      }
   }
}


const tPayPaymentSearch = async (sTid, sMethod) => {
   var formBody = [];

   let oApiKey = {
      sTitle: '',
      content: '',
   };

   let today = new Date();
   let yyyy = today.getFullYear();
   let mm = today.getMonth() + 1;
   let dd = today.getDate();
   let nextDD = today.getDate() + 1;

   if (dd < 10) dd = '0' + dd;
   if (mm < 10) mm = '0' + mm;
   if (nextDD < 10) nextDD = '0' + nextDD;

   let oData = {
      api_key: config.keys.apiKey,
      mid: config.keys.mid,
      sch_sdate: yyyy + mm + dd,
      sch_edate: yyyy + mm + nextDD,
      tid: sTid
   }

   if (sMethod === 'online') {
      oData = {
         api_key: config.keys.apiKeyIso,
         mid: config.keys.midIso,
         sch_sdate: yyyy + mm + dd,
         sch_edate: yyyy + mm + nextDD,
         tid: sTid
      }
   }

   for (var property in oData) {
      var encodedKey = encodeURIComponent(property);
      var encodedValue = encodeURIComponent(oData[property]);
      formBody.push(encodedKey + "=" + encodedValue);
   }
   formBody = formBody.join("&");

   try {
      const tpay_ApiKey = await axios({
         url: `https://webtx.tpay.co.kr/api/v1/trans_search`,
         method: "post",
         timeout: (15 * 1000),
         headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
         },
         data: formBody,
         transformResponse: [(data) => {
            return data;
         }],
      });

      if (tpay_ApiKey == undefined && tpay_ApiKey.data == undefined) {
         oApiKey.sTitle = '99999999';
         oApiKey.content = '서버전송에 실패하였습니다.';
      } else {
         const oResult = JSON.parse(tpay_ApiKey.data);
         if (oResult.result_cd == '0000') {
            oApiKey.sTitle = '000';
            oApiKey.content = oResult.list_arr;
         } else {
            oApiKey.sTitle = oResult.result_cd;
            oApiKey.content = oResult.result_msg;
         }
      }
      return oApiKey;
   } catch (error) {
      if (error != undefined) {
         if (error.response != undefined) {
            const oResponse = JSON.parse(error.response.data);
            oApiKey.sTitle = '99999998';
            oApiKey.content = oResponse;
            console.error('oResponse :' + oResponse);
         } else {
            oApiKey.sTitle = '99999997';
            oApiKey.content = error;
            console.error('error : ' + error);
         }
         return oApiKey;
      }
   }
}

const orderStateLoop = async (state_id) => {
   let status = "";
   if(state_id.toString() === "12001" || state_id.toString() === "12002" || state_id.toString() === "12003" || state_id.toString() === "12004"){
      status = "확인완료";
   } else if (state_id.toString() === "14002" || state_id.toString() === "14003") {
      status = "결제완료";
   } else if (state_id.toString() === "13001") {
      status = "제조중";
   } else if (state_id.toString() === "13002") {
      status = "제조완료";
   } else if (state_id.toString() === "14001") {
      status = "결제중";
   } else if (state_id.toString() === "14004") {
      status = "고객취소";
   } else if (state_id.toString() === "14005" || state_id.toString() === "17001") {
      status = "매장주문취소";
   } else if (state_id.toString() === "15001") {
      status = "픽업중";
   } else if (state_id.toString() === "15002") {
      status = "픽업완료";
   } else if (state_id.toString() === "16001") {
      status = "주문취소";
   } else if (state_id.toString() === "16002") {
      status = "주문완료";
   } else {
      status = "자동취소";
   }

   return status;
}

// The admin controller.
var DashboardController = {}

DashboardController.index = function (req, res) {
   res.status(200).json({ message: 'Welcome to the store area !' });
}

DashboardController.commercialList = async (req, res) => {
   let result = [];
   let endResult = [];
   let tempClick = null;
   let tempLeak = null;
   let sResult = {
      endList: [],
      list: []
   };
   try {
      const date = moment().format("YYYY-MM-DD");
      const sType = req.body.type;
      if(sType === "banner"){
         result = await Commercial.bannerCommercialList(date);
         endResult = await Commercial.bannerCommercialEndList(date);
      } else if (sType === "store"){
         result = await Commercial.storeCommercialList(date);
         endResult = await Commercial.storeCommercialEndList(date);
      } else if (sType === "coupon"){
         result = await Commercial.couponCommercialList(date);
         endResult = await Commercial.couponCommercialEndList(date);
      } else if (sType === "product"){
         result = await Commercial.productCommercialList(date);
         endResult = await Commercial.productCommercialEndList(date);
      } else if (sType === "throoonly"){
         result = await Commercial.throoOnlyCommercialList(date);
         endResult = await Commercial.throoOnlyCommercialEndList(date);
      } else if (sType === "kit"){
         result = await Commercial.kitCommercialList();
         endResult = await Commercial.kitCommercialEndList();
      } else if (sType === "placard"){
         result = await Commercial.placardCommercialList();
         endResult = await Commercial.placardCommercialEndList();
      }

      if(result.length > 0){
         for await (const iterator of result) {
            let temp = {};
            temp.storeName = iterator.store_name;
            temp.created_at = moment(iterator.created_at).format("YYYY-MM-DD");
            temp.end_at = ""
            temp.leak = 0;
            temp.click = 0;
            
            if(iterator.end_date !== undefined && iterator.end_date !== null && iterator.end_date !== ""){
               temp.end_at = moment(iterator.end_date).format("YYYY-MM-DD");
            }
            if(sType === "banner"){
               tempLeak = await Commercial.adverEventDisplayCount(parseInt(iterator.store_id),parseInt(iterator.adver_event_id));
               tempClick = await Commercial.adverEventClickCount(parseInt(iterator.store_id),parseInt(iterator.adver_event_id));
               temp.leak = (tempLeak[0].amount !== undefined && tempLeak[0].amount !== null && parseInt(tempLeak[0].amount) > 0) ? parseInt(tempLeak[0].amount) : 0;
               temp.click = (tempClick[0].amount !== undefined && tempClick[0].amount !== null && parseInt(tempClick[0].amount) > 0) ? parseInt(tempClick[0].amount) : 0;
               temp.title = "메인 배너광고";
               temp.price = "80000";
            } else if (sType === "store"){
               tempLeak = await Commercial.adverStoreDisplayCount(parseInt(iterator.store_id),parseInt(iterator.adver_store_id));
               tempClick = await Commercial.adverStoreClickCount(parseInt(iterator.store_id),parseInt(iterator.adver_store_id));
               temp.leak = (tempLeak[0].amount !== undefined && tempLeak[0].amount !== null && parseInt(tempLeak[0].amount) > 0) ? parseInt(tempLeak[0].amount) : 0;
               temp.click = (tempClick[0].amount !== undefined && tempClick[0].amount !== null && parseInt(tempClick[0].amount) > 0) ? parseInt(tempClick[0].amount) : 0;
               temp.title = "신규 입점 광고";
               temp.price = "20000";
            } else if (sType === "coupon"){
               tempLeak = await Commercial.adverCouponDisplayCount(parseInt(iterator.store_id),parseInt(iterator.adver_coupon_id));
               tempClick = await Commercial.adverCouponClickCount(parseInt(iterator.store_id),parseInt(iterator.adver_coupon_id));
               temp.leak = (tempLeak[0].amount !== undefined && tempLeak[0].amount !== null && parseInt(tempLeak[0].amount) > 0) ? parseInt(tempLeak[0].amount) : 0;
               temp.click = (tempClick[0].amount !== undefined && tempClick[0].amount !== null && parseInt(tempClick[0].amount) > 0) ? parseInt(tempClick[0].amount) : 0;
               temp.title = "내 주변 쿠폰 광고";
               temp.price = "40000";
            } else if (sType === "product"){
               tempLeak = await Commercial.adverProductPopularDisplayCount(parseInt(iterator.store_id),parseInt(iterator.adver_product_popular_id));
               tempClick = await Commercial.adverProductPopularClickCount(parseInt(iterator.store_id),parseInt(iterator.adver_product_popular_id));
               temp.leak = (tempLeak[0].amount !== undefined && tempLeak[0].amount !== null && parseInt(tempLeak[0].amount) > 0) ? parseInt(tempLeak[0].amount) : 0;
               temp.click = (tempClick[0].amount !== undefined && tempClick[0].amount !== null && parseInt(tempClick[0].amount) > 0) ? parseInt(tempClick[0].amount) : 0;
               temp.title = "핫메뉴 광고";
               temp.price = "30000";
            } else if (sType === "throoonly"){
               tempLeak = await Commercial.adverProductThrooOnlyDisplayCount(parseInt(iterator.store_id),parseInt(iterator.adver_product_throo_only_id));
               tempClick = await Commercial.adverProductThrooOnlyClickCount(parseInt(iterator.store_id),parseInt(iterator.adver_product_throo_only_id));
               temp.leak = (tempLeak[0].amount !== undefined && tempLeak[0].amount !== null && parseInt(tempLeak[0].amount) > 0) ? parseInt(tempLeak[0].amount) : 0;
               temp.click = (tempClick[0].amount !== undefined && tempClick[0].amount !== null && parseInt(tempClick[0].amount) > 0) ? parseInt(tempClick[0].amount) : 0;
               temp.title = "스루 온리 광고";
               temp.price = "0";
            } else if (sType === "placard"){
               temp.title = "야외 광고 배너";
               temp.price = "30000";
            } else if (sType === "placard"){
               temp.title = "스루키트";
               temp.price = "0";
            }
            sResult.list.push(temp);
         }
      }
      if(endResult.length > 0){
         for await (const iterator of endResult) {
            let temp = {};
            temp.storeName = iterator.store_name;
            temp.created_at = moment(iterator.created_at).format("YYYY-MM-DD");
            temp.end_at = ""
            temp.leak = 0;
            temp.click = 0;
            
            if(iterator.end_date !== undefined && iterator.end_date !== null && iterator.end_date !== ""){
               temp.end_at = moment(iterator.end_date).format("YYYY-MM-DD");
            }
            if(sType === "banner"){
               tempLeak = await Commercial.adverEventDisplayCount(parseInt(iterator.store_id),parseInt(iterator.adver_event_id));
               tempClick = await Commercial.adverEventClickCount(parseInt(iterator.store_id),parseInt(iterator.adver_event_id));
               temp.leak = (tempLeak[0].amount !== undefined && tempLeak[0].amount !== null && parseInt(tempLeak[0].amount) > 0) ? parseInt(tempLeak[0].amount) : 0;
               temp.click = (tempClick[0].amount !== undefined && tempClick[0].amount !== null && parseInt(tempClick[0].amount) > 0) ? parseInt(tempClick[0].amount) : 0;
               temp.title = "메인 배너광고";
               temp.price = "80000";
            } else if (sType === "store"){
               tempLeak = await Commercial.adverStoreDisplayCount(parseInt(iterator.store_id),parseInt(iterator.adver_store_id));
               tempClick = await Commercial.adverStoreClickCount(parseInt(iterator.store_id),parseInt(iterator.adver_store_id));
               temp.leak = (tempLeak[0].amount !== undefined && tempLeak[0].amount !== null && parseInt(tempLeak[0].amount) > 0) ? parseInt(tempLeak[0].amount) : 0;
               temp.click = (tempClick[0].amount !== undefined && tempClick[0].amount !== null && parseInt(tempClick[0].amount) > 0) ? parseInt(tempClick[0].amount) : 0;
               temp.title = "신규 입점 광고";
               temp.price = "20000";
            } else if (sType === "coupon"){
               tempLeak = await Commercial.adverCouponDisplayCount(parseInt(iterator.store_id),parseInt(iterator.adver_coupon_id));
               tempClick = await Commercial.adverCouponClickCount(parseInt(iterator.store_id),parseInt(iterator.adver_coupon_id));
               temp.leak = (tempLeak[0].amount !== undefined && tempLeak[0].amount !== null && parseInt(tempLeak[0].amount) > 0) ? parseInt(tempLeak[0].amount) : 0;
               temp.click = (tempClick[0].amount !== undefined && tempClick[0].amount !== null && parseInt(tempClick[0].amount) > 0) ? parseInt(tempClick[0].amount) : 0;
               temp.title = "내 주변 쿠폰 광고";
               temp.price = "40000";
            } else if (sType === "product"){
               tempLeak = await Commercial.adverProductPopularDisplayCount(parseInt(iterator.store_id),parseInt(iterator.adver_product_popular_id));
               tempClick = await Commercial.adverProductPopularClickCount(parseInt(iterator.store_id),parseInt(iterator.adver_product_popular_id));
               temp.leak = (tempLeak[0].amount !== undefined && tempLeak[0].amount !== null && parseInt(tempLeak[0].amount) > 0) ? parseInt(tempLeak[0].amount) : 0;
               temp.click = (tempClick[0].amount !== undefined && tempClick[0].amount !== null && parseInt(tempClick[0].amount) > 0) ? parseInt(tempClick[0].amount) : 0;
               temp.title = "핫메뉴 광고";
               temp.price = "30000";
            } else if (sType === "throoonly"){
               tempLeak = await Commercial.adverProductThrooOnlyDisplayCount(parseInt(iterator.store_id),parseInt(iterator.adver_product_throo_only_id));
               tempClick = await Commercial.adverProductThrooOnlyClickCount(parseInt(iterator.store_id),parseInt(iterator.adver_product_throo_only_id));
               temp.leak = (tempLeak[0].amount !== undefined && tempLeak[0].amount !== null && parseInt(tempLeak[0].amount) > 0) ? parseInt(tempLeak[0].amount) : 0;
               temp.click = (tempClick[0].amount !== undefined && tempClick[0].amount !== null && parseInt(tempClick[0].amount) > 0) ? parseInt(tempClick[0].amount) : 0;
               temp.title = "스루 온리 광고";
               temp.price = "0";
            } else if (sType === "placard"){
               temp.title = "야외 광고 배너";
               temp.price = "30000";
            } else if (sType === "placard"){
               temp.title = "스루키트";
               temp.price = "0";
            }
            sResult.endList.push(temp);
         }
      }
   } catch (error) {
      console.log("RegisterController.commercialList fail !!! ===>", error);
   }

   res.status(200).json(sResult);
}

DashboardController.activateNewOrderKakao = async (req, res) => {
   let sResult = {
      resultCd : "9999",
      resultMsg: "fail"
   };
   const sPhoneNm = req.body.phone;

   try {
      if(sPhoneNm !== undefined && sPhoneNm !== null){
         const result = await sendAlertMessage(sPhoneNm.toString(),"TH_7090");
         if(result === "0000") {
            sResult.resultCd = "0000";
            sResult.resultMsg = "success";
         }
      }
   } catch (error) {
      console.log("RegisterController.activateOrderCancelKakao fail !!! ===>", error);
   }

   res.status(200).json(sResult);
}

DashboardController.activateOrderCancelKakao = async (req, res) => {
   let process = false;
   let sResult = {
      resultCd : "9999",
      resultMsg: "fail"
   };
   const sPhoneNm = req.body.phone;
   const orderId = req.body.order_id;

   try {
      if(sPhoneNm !== undefined && sPhoneNm !== null){
         const result = await sendAlertMessage(sPhoneNm.toString(),"TF_8618");
         if(result === "0000") {
            sResult.resultCd = "0000";
            sResult.resultMsg = "success";
         }
      }
      if(orderId !== undefined && orderId !== null){
         const cancelCouponTargetUser = await Store.cancelCouponTargetUser(parseInt(orderId));
         if(cancelCouponTargetUser.length > 0){
            const fromDate = moment().format('YYYY-MM-DD');
            const toDate = moment().add(7,"days").format('YYYY-MM-DD');
            const user_id = cancelCouponTargetUser[0].user_id;
            const order_id = cancelCouponTargetUser[0].order_id;
            const store_id = cancelCouponTargetUser[0].store_id;
            const phoneNm = cancelCouponTargetUser[0].phone_number;
            
            const checkStoreType = await Store.checkCancelOrderCouponType(parseInt(store_id));
            if(checkStoreType.length > 0){
               process = true;
            }
            
            if(process){
               if(checkStoreType[0].parent_store_type_id.toString() === "1" || checkStoreType[0].parent_store_type_id.toString() === "8"){
                  const makeCoupon = await Order.giftCouponForOrderCancel(1000);
                  if(makeCoupon !== undefined){
                     await Order.setGiftCoupon(makeCoupon[0],store_id);
                     await Order.setCancelOrderCoupon(user_id,makeCoupon[0],1000,1000,"주문이 취소되어서 죄송한 마음을 드려요",order_id,fromDate,toDate);
                  }
               } else if (checkStoreType[0].parent_store_type_id.toString() === "2") {
                  const makeCoupon = await Order.giftCouponForOrderCancel(2000);
                  if(makeCoupon !== undefined){
                     await Order.setGiftCoupon(makeCoupon[0],store_id);
                     await Order.setCancelOrderCoupon(user_id,makeCoupon[0],2000,2000,"주문이 취소되어서 죄송한 마음을 드려요",order_id,fromDate,toDate);
                  }
               }
               
               if(phoneNm !== undefined && phoneNm !== null && phoneNm !== ""){
                  await sendThrooAlertMessage(phoneNm,"TG_6173");
               }
            }
         }
      }
   } catch (error) {
      console.log("RegisterController.activateOrderCancelKakao fail !!! ===>", error);
   }

   res.status(200).json(sResult);
}

DashboardController.bannerList = async (req, res) => {
   const userId = req.body.userId;
   let sResult = [];
   
   try {
      const checkRoll = await checkValidation(userId);
      if(checkRoll === "master" || checkRoll === "marketing"){
         const getBannerList = await Management.getBannerList();
         if (getBannerList.length > 0){
            for await (const x of getBannerList) {
               let temp = {};
               temp.key = x.banner_id;
               temp.url_path = x.url_path;
               temp.title = x.title;
               temp.type = x.type;
               if(parseInt(x.status) > 0){
                  temp.status = true;
               } else {
                  temp.status = false;
               }
               sResult.push(temp);
            }
         }
      }
   } catch (error) {
      console.log("RegisterController.changeSalesUserStatus fail !!! ===>", error);
   }
   res.status(200).json(sResult);
}

DashboardController.webResponseInquiry2 = async (req, res) => {
   let sResult = false;
   let deliveryCompany = "";
   let deliveryNm = "";
   let deliveryCompanyId = "";
   
   try {
      const userId = req.body.userId;
      const stateId = req.body.stateId;
      const sKey = req.body.sKey;
      const checkRoll = await checkValidation(userId);
      if(checkRoll === "master" || checkRoll === "marketing"){
         if(stateId === 0){
            await Management.webResponseInquiryConfirm(userId,sKey);
            sResult = true;
         } else if(stateId === 1){
            deliveryCompany = req.body.delivery_company;
            deliveryNm = req.body.delivery_nm;
            deliveryCompanyId = req.body.delivery_company_id;
            await Management.webResponseInquiryDelivery(userId,sKey,deliveryNm,deliveryCompany,deliveryCompanyId);
            sResult = true;
         } else if(stateId === 2){
            await Management.webResponseInquiryFinish(userId,sKey);
            sResult = true;
         }
      }
   } catch (error) {
      console.log("RegisterController.responseInquiry fail !!! ===>", error);
   }
   res.status(200).json(sResult);
}

DashboardController.webResponseInquiry = async (req, res) => {
   let sResult = false;
   
   try {
      const userId = req.body.userId;
      const sKey = req.body.sKey;
      const checkRoll = await checkValidation(userId);
      if(checkRoll === "master" || checkRoll === "marketing"){
         const responseInquiry = await Management.webResponseInquiry(userId,sKey);
         if (responseInquiry !== undefined){
            sResult = true;
         }
      }
   } catch (error) {
      console.log("RegisterController.responseInquiry fail !!! ===>", error);
   }
   res.status(200).json(sResult);
}

DashboardController.responseInquiry = async (req, res) => {
   let sResult = false;
   
   try {
      const userId = req.body.userId;
      const sContent = req.body.sContent;
      const sKey = req.body.sKey;
      const checkRoll = await checkValidation(userId);
      if(checkRoll === "master" || checkRoll === "marketing"){
         const responseInquiry = await Management.responseInquiry(sContent,userId,sKey);
         if (responseInquiry !== undefined){
            sResult = true;
         }
      }
   } catch (error) {
      console.log("RegisterController.responseInquiry fail !!! ===>", error);
   }
   res.status(200).json(sResult);
}

DashboardController.webInquiryList2 = async (req, res) => {
   let sResult = {
      endList: [],
      listing: []
   };
   let tempEnd = [];
   let tempIng = [];
   try {
      const userId = req.body.userId;
      const checkRoll = await checkValidation(userId);
      if(checkRoll === "master" || checkRoll === "marketing"){
         const inquiryList = await Management.webInquiryList2();
         if (inquiryList.length > 0){
            for await (const x of inquiryList) {
               let temp = {};
               temp.key = x.inquiry_id;
               temp.created_at = moment(x.created_at).format("YYYY-MM-DD HH:mm");
               temp.confirm_at = moment(x.confirm_at).format("YYYY-MM-DD HH:mm");
               temp.delivered_at = moment(x.delivered_at).format("YYYY-MM-DD HH:mm");
               temp.updated_at = moment(x.updated_at).format("YYYY-MM-DD HH:mm");
               temp.storeName = x.store_name;
               temp.phoneNm = x.phone_number;
               temp.address = x.address;
               temp.title = x.title;
               temp.company = x.delivery_company;
               temp.deliveryNm = x.delivery_param;
               temp.author = x.full_name;
               temp.state_id = x.state_id;
               
               if(x.state_id.toString() === "0"){
                  temp.state = "신규신청";
                  tempIng.push(temp);
               } else if(x.state_id.toString() === "1"){
                  temp.state = "신청확인";
                  tempIng.push(temp);
               } else if(x.state_id.toString() === "2"){
                  temp.state = "배송중";
                  tempIng.push(temp);
               } else if(x.state_id.toString() === "3"){
                  temp.state = "완료";
                  tempEnd.push(temp);
               }
            }
         }
      }

      if(tempEnd.length > 0){
         sResult.endList = tempEnd;
      }
      if(tempIng.length > 0){
         sResult.listing = tempIng;
      }
   } catch (error) {
      console.log("RegisterController.webInquiryList2 fail !!! ===>", error);
   }
   res.status(200).json(sResult);
}
DashboardController.webInquiryList = async (req, res) => {
   let sResult = {
      endList: [],
      listing: []
   };
   
   try {
      const userId = req.body.userId;
      const checkRoll = await checkValidation(userId);
      if(checkRoll === "master" || checkRoll === "marketing"){
         const inquiryList = await Management.webInquiryList();
         if (inquiryList.length > 0){
            for await (const x of inquiryList) {
               let temp = {};
               temp.key = x.inquiry_id;
               temp.img_url = x.img_url;
               temp.date = moment(x.created_at).format("YYYY-MM-DD HH:mm");
               temp.file_type = x.file_type;
               temp.content = x.content;
               temp.store_name = x.store_name;
               temp.full_name = x.full_name;
               temp.phone_number = x.phone_number;
               temp.address = x.address;
               temp.email = x.email;

               if(parseInt(x.state_id) > 0){
                  sResult.endList.push(temp);
               } else {
                  sResult.listing.push(temp);
               }
            }
         }
      }
   } catch (error) {
      console.log("RegisterController.inquiryList fail !!! ===>", error);
   }
   res.status(200).json(sResult);
}

DashboardController.inquiryList = async (req, res) => {
   let sResult = {
      endList: [],
      listing: []
   };
   
   try {
      const userId = req.body.userId;
      const checkRoll = await checkValidation(userId);
      if(checkRoll === "master" || checkRoll === "marketing"){
         const inquiryList = await Management.inquiryList();
         if (inquiryList.length > 0){
            for await (const x of inquiryList) {
               let endList = {};
               let listing = {};

               if(parseInt(x.state_id) > 0){
                  endList.img_url = x.img_url;
                  endList.title = x.title;
                  endList.content = x.content;
                  endList.answer = x.answer;
                  endList.full_name = x.full_name;
                  endList.phone_number = x.phone_number;
                  endList.email = x.email;
                  sResult.endList.push(endList);
               } else {
                  listing.key = x.inquiry_id;
                  listing.date = moment(x.created_at).format("YYYY-MM-DD HH:mm");
                  listing.img_url = x.img_url;
                  listing.title = x.title;
                  listing.content = x.content;
                  listing.full_name = x.full_name;
                  listing.phone_number = x.phone_number;
                  listing.email = x.email;
                  sResult.listing.push(listing);
               }
            }
         }
      }
   } catch (error) {
      console.log("RegisterController.inquiryList fail !!! ===>", error);
   }
   res.status(200).json(sResult);
}


DashboardController.noticeWebList = async (req, res) => {
   const userId = req.body.userId;
   let sResult = [];

   try {
      const checkRoll = await checkValidation(userId);
      if(checkRoll === "master" || checkRoll === "marketing"){
         const getWebNoticeList = await Management.getWebNoticeList();
         if (getWebNoticeList.length > 0){
            for await (const x of getWebNoticeList) {
               let temp = {};
               let sTemp = x.content.toString();
               temp.title = x.title;
               temp.short = sTemp.substr(0, 8) + "....";
               temp.content = sTemp;
               sResult.push(temp);
            }
         }
      }
   } catch (error) {
      console.log("AuthController.salesUserSignUp fail !!! ===>", error);
   }
   res.status(200).json(sResult);
}

DashboardController.insertWebNotice = async (req, res) => {
   let sResult = false;
   
   try {
      const userId = req.body.userId;
      const sTitle = req.body.sTitle;
      const sContent = req.body.sContent;

      const checkRoll = await checkValidation(userId);
      if(checkRoll === "master" || checkRoll === "marketing"){

         const insert = await Management.insertWebNotice(sTitle,sContent,userId);
         if(insert !== undefined){
            await sendPushMessageForSales(sTitle,sContent);
            await sendPushMessageForStoreApp(sTitle,sContent);
            sResult = true;
         }
      }
   } catch (error) {
      console.log("AuthController.insertWebNotice fail !!! ===>", error);
   }
   res.status(200).json(sResult);
}

DashboardController.noticeAppList = async (req, res) => {
   const userId = req.body.userId;
   let sResult = [];

   try {
      const checkRoll = await checkValidation(userId);
      if(checkRoll === "master" || checkRoll === "marketing"){
         const getAppNoticeList = await Management.getAppNoticeList();
         if (getAppNoticeList.length > 0){
            for await (const x of getAppNoticeList) {
               let temp = {};
               let sTemp = x.answer.toString();
               temp.title = x.title;
               temp.short = sTemp.substr(0, 8) + "....";
               temp.content = sTemp;
               sResult.push(temp);
            }
         }
      }
   } catch (error) {
      console.log("AuthController.salesUserSignUp fail !!! ===>", error);
   }
   res.status(200).json(sResult);
}

DashboardController.insertAppNotice = async (req, res) => {
   let sResult = false;
   
   try {
      const userId = req.body.userId;
      const sTitle = req.body.sTitle;
      const sContent = req.body.sContent;

      const checkRoll = await checkValidation(userId);
      if(checkRoll === "master" || checkRoll === "marketing"){
         const insert = await Management.insertAppNotice(sTitle,sContent,userId);
         if(insert !== undefined){
            await sendPushMessageForSales(sTitle,sContent);
            sResult = true;
         }
      }
   } catch (error) {
      console.log("AuthController.insertWebNotice fail !!! ===>", error);
   }
   res.status(200).json(sResult);
}

DashboardController.salesUserSignUp = async (req, res) => {
   let processStatus = true; 
   let oResult = false;

   try {
      const userName = req.body.userName;
      const sCount = req.body.content;
      const userEmail = req.body.userEmail;
      const userPhone = req.body.userPhone;
      const userPwd = req.body.pw;
      const groupId = req.body.group_id;
      const groupName = req.body.group_name;

      if(userName === undefined || userName === null || userName === ""){
         processStatus = false;
      }
      if (sCount === undefined || sCount === null || sCount === "") {
         processStatus = false;
      }
      if (userEmail === undefined || userEmail === null || userEmail === "") {
         processStatus = false;
      }
      if (userPhone === undefined || userPhone === null || userPhone === "") {
         processStatus = false;
      }
      if (userPwd === undefined || userPwd === null || userPwd === "") {
         processStatus = false;
      }

      if(processStatus){
         const convertTo = await beforeSave({ password: userPwd });
         const result = await User.salesUserSignUp(userName,sCount,userEmail,userPhone,convertTo.password,groupId,groupName);
         if(result !== undefined){
            oResult = true;
         }
      }

   } catch (error) {
      console.log("AuthController.salesUserSignUp fail !!! ===>", error);
   }
   res.status(200).json(oResult);
}

DashboardController.changeSalesUserStatus = async (req, res) => {
   const userId = req.body.userId;
   const sParam = req.body.sParam;
   const aParam = req.body.aParam;
   let sResult = false;
   let sKey = 1;
   let aKey = 1;
   
   try {
      const checkRoll = await checkValidation(userId);
      if(checkRoll === "master" || checkRoll === "marketing"){
         if(aParam){
            sKey = 0;
            aKey = 0;
         }
         const changeSalesUserStatus = await Management.changeSalesUserStatus(sParam,sKey,aKey);
         if (changeSalesUserStatus !== undefined && changeSalesUserStatus !== null){
            sResult = true;
         }
      }
   } catch (error) {
      console.log("RegisterController.changeSalesUserStatus fail !!! ===>", error);
   }
   res.status(200).json(sResult);
}

DashboardController.salesData = async (req, res) => {
   const userId = req.body.userId;
   let sResult = {
      userList : [],
      teamList : [],
      chart : [],
   };
   
   try {
      const checkRoll = await checkValidation(userId);
      if(checkRoll === "master" || checkRoll === "marketing"){
         const getSalesTeam = await Management.getSalesTeam();
         if (getSalesTeam.length > 0){
            for await (const x of getSalesTeam) {
               let temp = {};
               temp.name = x.group_name;
               temp.key = x.group_id;
               temp.count = x.total;
               sResult.teamList.push(temp);

               const salesChart = await loopChartData("salesChart",parseInt(x.group_id),x.group_name);
               sResult.chart = sResult.chart.concat(salesChart);
            }
         }
         
         const getAllSalesUser = await Management.getAllSalesUser();
         if (getAllSalesUser.length > 0){
            for await (const x of getAllSalesUser) {
               let temp = {};
               temp.name = x.full_name;
               temp.groupNm = x.group_name;
               temp.content = x.content;
               temp.email = x.email;
               temp.key = x.admin_user_id;
               if(parseInt(x.status) > 0){
                  temp.status = true;
               } else {
                  temp.status = false;
               }
               sResult.userList.push(temp);
            }
         }
      }
   } catch (error) {
      console.log("RegisterController.salesData fail !!! ===>", error);
   }
   res.status(200).json(sResult);
}

DashboardController.productInfo = async (req, res) => {
   let sResult = [];
   
   try {
      const categoryId = req.params.sParam;
      const getProduct = await Management.adminProductInfo(parseInt(categoryId));
      if(getProduct.length > 0){
         for await (const x of getProduct) {
            let temp = {};
            temp.name = x.name;
            temp.oPrice = convertToKRW(Math.floor(parseInt(x.org_price)), true);
            temp.bPrice = convertToKRW(Math.floor(parseInt(x.base_price)), true);
            temp.img = x.url_path;
            sResult.push(temp);
         }
      }
   } catch (error) {
      console.log("RegisterController.productInfo fail !!! ===>", error);
   }
   res.status(200).json(sResult);
}

DashboardController.orderInfo = async (req, res) => {
   const userId = req.body.userId;
   const sParam = req.body.sParam;

   let oResult = {
      pickUpRoute: [],
      orderList: [],
      orderData: {
         name: "알수없음",
         address: "알수없음",
         phone: "알수없음",
         owner: "알수없음",
         date: "알수없음",
         total: "알수없음",
         payment: "알수없음",
         t_point: 0,
         t_coupon: 0,
         s_point: 0,
         s_coupon: 0,
         state_id: "none",
         status: "알수없음",
         user_email: "알수없음",
         user_phone: "알수없음",
         user_name: "알수없음",
         user_car: "알수없음",
         message: "알수없음",
      },
      userLat: 37.56637919891677,
      userLng: 126.97914589375286,
      anglePoint: { 
         pan: 0,
         tilt: 0,
         zoom: 0
      }
      
      
   }
   try {
      const checkRoll = await checkValidation(userId);
      if(checkRoll === "master" || checkRoll === "operation" || checkRoll === "marketing" || checkRoll === "design" || checkRoll === "develop"){
         const partnerCouponByOrderId = await Management.getPartnerCouponByOrderId(parseInt(sParam));
         if(partnerCouponByOrderId !== undefined && partnerCouponByOrderId !== null && partnerCouponByOrderId.length > 0){
            if(partnerCouponByOrderId[0].amount !== undefined && partnerCouponByOrderId[0].amount !== null){
               oResult.orderData.s_coupon = Math.floor(parseFloat(partnerCouponByOrderId[0].amount));
            }
         }
         
         const throoCouponByOrderId = await Management.getThrooCouponByOrderId(parseInt(sParam));
         if(throoCouponByOrderId !== undefined && throoCouponByOrderId !== null && throoCouponByOrderId.length > 0){
            if(throoCouponByOrderId[0].amount !== undefined && throoCouponByOrderId[0].amount !== null){
               oResult.orderData.t_coupon = Math.floor(parseFloat(throoCouponByOrderId[0].amount));
            }
         }
         
         const throoPointByOrderId = await Management.getThrooPointByOrderId(parseInt(sParam));
         if(throoPointByOrderId !== undefined && throoPointByOrderId !== null && throoPointByOrderId.length > 0){
            if(throoPointByOrderId[0].amount !== undefined && throoPointByOrderId[0].amount !== null){
               oResult.orderData.t_point = Math.floor(parseFloat(throoPointByOrderId[0].amount));
            }
         }
         
         const getOrderList = await Management.orderList(sParam);
         if(getOrderList.length > 0){
            for await (const xCount of getOrderList) {
               let temp = {};
               temp.name = xCount.product_nm;
               temp.count = xCount.quantity;
               temp.price = (Math.floor(parseInt(xCount.base_price)) * parseInt(xCount.quantity));
               temp.list = [];
               if(parseInt(xCount.has_option) > 0){
                  const getProductOption = await Management.getOrderProductOption(xCount.order_detail_id);
                  console.log("getProductOption",getProductOption);
                  if(getProductOption.length > 0){
                     let tempList = [];
                     for await (const iCount of getProductOption) {
                        let sTemp = {};
                        sTemp.name = iCount.name;
                        sTemp.price = iCount.price;
                        tempList.push(sTemp);
                     }
                     temp.list = tempList;
                  }
               }
               oResult.orderList.push(temp);
            }
         }

         const getLocation = await Management.getLocationDistance(sParam);
         if(getLocation.length > 0){
            for await (const sCount of getLocation) {
               let temp = {};
               temp.lat = parseFloat(sCount.lat);
               temp.lng = parseFloat(sCount.lng);
               oResult.pickUpRoute.push(temp);
            }
         }

         const orderDetail = await Management.OrderInfo(sParam);
         if(orderDetail !== undefined && orderDetail !== null && orderDetail.length > 0){
            if(orderDetail[0].created_at !== undefined && orderDetail[0].created_at !== null){
               oResult.orderData.date = moment(orderDetail[0].created_at).format("YYYY-MM-DD HH:mm");
            }
            if(orderDetail[0].total_amount_org !== undefined && orderDetail[0].total_amount_org !== null){
               oResult.orderData.total = convertToKRW(Math.floor(parseInt(orderDetail[0].total_amount_org)), true);
            }
            if(orderDetail[0].total_amount_excl !== undefined && orderDetail[0].total_amount_excl !== null){
               oResult.orderData.payment = convertToKRW(Math.floor(parseInt(orderDetail[0].total_amount_excl)), true);
            }
            if(orderDetail[0].license_number !== undefined && orderDetail[0].license_number !== null && orderDetail[0].license_number !== ""){
               oResult.orderData.user_car = orderDetail[0].license_number;
            }
            if(orderDetail[0].inquiry !== undefined && orderDetail[0].inquiry !== null && orderDetail[0].inquiry !== ""){
               oResult.orderData.message = orderDetail[0].inquiry;
            }
            if(orderDetail[0].address1 !== undefined && orderDetail[0].address1 !== null && orderDetail[0].address1 !== ""){
               oResult.orderData.address = orderDetail[0].address1;
            }
            if(orderDetail[0].store_name !== undefined && orderDetail[0].store_name !== null && orderDetail[0].store_name !== ""){
               oResult.orderData.name = orderDetail[0].store_name;
            }
            if(orderDetail[0].phone_number !== undefined && orderDetail[0].phone_number !== null && orderDetail[0].phone_number !== ""){
               oResult.orderData.phone = orderDetail[0].phone_number;
            }
            if(orderDetail[0].parking_zoom !== undefined && orderDetail[0].parking_zoom !== null){
               oResult.anglePoint.zoom = parseFloat(orderDetail[0].parking_zoom);
            }
            if(orderDetail[0].parking_pan !== undefined && orderDetail[0].parking_pan !== null){
               oResult.anglePoint.pan = parseFloat(orderDetail[0].parking_pan);
            }
            if(orderDetail[0].parking_tilt !== undefined && orderDetail[0].parking_tilt !== null){
               oResult.anglePoint.tilt = parseFloat(orderDetail[0].parking_tilt);
            }
            if(orderDetail[0].lat !== undefined && orderDetail[0].lat !== null){
               oResult.userLat = parseFloat(orderDetail[0].lat);
            }
            if(orderDetail[0].lng !== undefined && orderDetail[0].lng !== null){
               oResult.userLng = parseFloat(orderDetail[0].lng);
            }
            if(orderDetail[0].userPhone !== undefined && orderDetail[0].userPhone !== null && orderDetail[0].userPhone !== ""){
               oResult.orderData.user_phone = orderDetail[0].userPhone;
            }
            if(orderDetail[0].full_name !== undefined && orderDetail[0].full_name !== null && orderDetail[0].full_name !== ""){
               oResult.orderData.user_name = orderDetail[0].full_name;
            }
            if(orderDetail[0].email !== undefined && orderDetail[0].email !== null && orderDetail[0].email !== ""){
               oResult.orderData.user_email = orderDetail[0].email;
            }
            if(orderDetail[0].owner !== undefined && orderDetail[0].owner !== null && orderDetail[0].owner !== ""){
               oResult.orderData.owner = orderDetail[0].owner;
            }
            if(orderDetail[0].state_id !== undefined && orderDetail[0].state_id !== null){
               const tempResult = await orderStateLoop(orderDetail[0].state_id);
               oResult.orderData.status = tempResult;
               if(tempResult === "고객취소" || tempResult === "매장주문취소" || tempResult === "주문취소" || tempResult === "자동취소"){
                  oResult.orderData.state_id = "cancel";
               }
            }
         }
      }

   } catch (error) {
      console.log("DashboardController.orderInfo error",error);
   }

   res.status(200).json(oResult);
}

DashboardController.orderCancel = async (req, res) => {
   const userId = req.body.userId;
   const order_id = req.body.sOrderId;

   let oResult = {
      result_cd: "9999",
      result_msg: "권한이 없습니다."
   }
   try {
      let process1 = false;
      let process2 = false;
      let paymentId = null;
      let sTid = null;
      let sState_id = null;
      let iOrderUserId = null;
      let sMethod = "";
      let amt = 0;

      const checkRoll = await checkValidation(userId);
         const getOrderPayWay = await Management.getOrderPayWay(order_id);
         if(getOrderPayWay !== undefined && getOrderPayWay !== null && getOrderPayWay.length > 0){
            sMethod = getOrderPayWay[0].payment_method.toString() === "[tpay]:card" ? "online": "billingKey";
            amt = Math.floor(parseInt(getOrderPayWay[0].amount));
            process1 = true;
         }
         
         if(process1){
            const getTid = await Management.selectTid(order_id, sMethod);
            paymentId = getTid[0].payment_id;
            sTid = getTid[0].transaction_id;
            sState_id = getTid[0].state_id;
            iOrderUserId = getTid[0].user_id;

            if (sState_id === 14001) {
               oResult.result_cd = '8888';
               oResult.result_msg = '아직 결제중입니다.'
            } else if (sState_id === 14004 || sState_id === 16001) {
               oResult.result_cd = '7777';
               oResult.result_msg = '이미 주문이 취소 되었습니다 다시 확인해주세요.'
            } else {
               process2 = true;
            }
         }

         if(process2){
            const cancellation = await cancellationByRestfulApi(amt, sTid, sMethod);
            if (cancellation.sTitle === '000') {
               let paymentSearch = await tPayPaymentSearch(cancellation.tid, sMethod);
               paymentSearch = paymentSearch.content[0];

               const aList = {
                  orderId: order_id,
                  payment_id: paymentId,
                  sTitle: cancellation.sTitle,
                  content: cancellation.content,
                  tid: cancellation.tid,
                  cancelDate: cancellation.cancelDate,
                  sAmt: amt,
                  card_no: paymentSearch.card_no.substr(0, 4),
                  app_dt: paymentSearch.app_dt,
                  app_tm: paymentSearch.app_tm,
                  app_no: paymentSearch.app_no,
                  fn_cd: paymentSearch.fn_cd,
                  fn_nm: paymentSearch.fn_nm,
                  fn_no: paymentSearch.fn_no,
                  acqu_nm: paymentSearch.acqu_nm,
                  acqu_nm: paymentSearch.acqu_co,
                  cardInterest: paymentSearch.cardInterest,
               }

               const completeCancellationByPG = await Management.completeCancellationByPG(aList, sMethod, iOrderUserId);
               if (completeCancellationByPG === '00000') {
                  const fromDay = moment().format("YYYY-MM-DD");
                  const toDay = moment().format("YYYY-MM-DD");
                  const sIpAddress = await getClientIP(req);
                  await Management.insertQuery(userId,"orderCancel",sIpAddress,"cancel","none",fromDay + "~" + toDay);
                  oResult.result_cd = '0000';
                  oResult.result_msg = '주문이 취소되었습니다.';

               } else if (completeCancellationByPG === '77777') {
                  oResult.result_cd = completeCancellationByPG.result_cd;
                  oResult.result_msg = 'wm_order_payment 데이터 저장에 실패하였습니다.';
                  console.info('취소성공 하지만 :' + oResult.result_msg + '관련 데이터 : ' + JSON.stringify(aList));

               } else if (completeCancellationByPG === '88888') {
                  oResult.result_cd = completeCancellationByPG.result_cd;
                  oResult.result_msg = 'wm_order_payment_pg 데이터 저장에 실패하였습니다.';
                  console.info('취소성공 하지만 :' + oResult.result_msg + '관련 데이터 : ' + JSON.stringify(aList));

               } else if (completeCancellationByPG === '77776') {
                  oResult.result_cd = completeCancellationByPG.result_cd;
                  oResult.result_msg = 'wm_order 데이터 저장에 실패하였습니다.';
                  console.info('취소성공 하지만 :' + oResult.result_msg + '관련 데이터 : ' + JSON.stringify(aList));

               } else {
                  oResult.result_cd = completeCancellationByPG.result_cd;
                  oResult.result_msg = '알수없는 이유로 실패하였습니다.';
                  console.info('알수없는 이유 :' + oResult.result_msg + '관련 데이터 : ' + JSON.stringify(aList));
               }
            }
      }

   } catch (error) {
      console.log("DashboardController.orderCancel error",error);
   }

   res.status(200).json(oResult);
}

DashboardController.orderList = async (req, res) => {
   const userId = req.body.userId;
   const fromDate = req.body.fromDate;
   const toDate = req.body.toDate;
   
   let sOrderPrice = 0;
   let sTotal = 0;
   let sSuccess = 0;
   let sCancel = 0;
   let aCancel = 0;
   let oResult = {
      orderChart: [],
      orderList: [],
      orderData: {
         sOrderPrice: 0,
         sTotal: 0,
         sSuccess: 0,
         sCancel: 0,
         aCancel: 0,
      }
   };
   try {
      const checkRoll = await checkValidation(userId);
      if(checkRoll === "master" || checkRoll === "operation" || checkRoll === "marketing" || checkRoll === "design" || checkRoll === "develop"){
         const fromDay = moment(fromDate).format("YYYY-MM-DD");
         const toDay = moment(toDate).format("YYYY-MM-DD");
         const getOrderList = await Management.getOrderList(fromDay,toDay);
         if(getOrderList.length > 0){
            for await (const sCount of getOrderList) {
               let temp = {};
               temp.key = sCount.order_id
               temp.date = moment(sCount.created_at).format("YYYY-MM-DD HH:mm");
               temp.store_name = sCount.store_name;
               temp.store_phone = sCount.store_phone;
               temp.user_email = sCount.email;
               temp.user_phone = sCount.user_phone;
               temp.total = convertToKRW(Math.floor(parseInt(sCount.total_amount_org)), true);
               temp.payment = convertToKRW(Math.floor(parseInt(sCount.total_amount_incl)), true);
               temp.discount = convertToKRW(Math.floor(parseInt(sCount.discount_amount)), true);
               temp.status = sCount.state_id
               if(sCount.state_id.toString() === "12001" || sCount.state_id.toString() === "12002" || sCount.state_id.toString() === "12003" || sCount.state_id.toString() === "12004"){
                  temp.status = "확인완료";
                  sTotal += 1;
               } else if (sCount.state_id.toString() === "14002" || sCount.state_id.toString() === "14003") {
                  temp.status = "결제완료";
                  sOrderPrice += parseInt(sCount.total_amount_org);
                  sTotal += 1;
               } else if (sCount.state_id.toString() === "13001") {
                  temp.status = "제조중";
                  sOrderPrice += parseInt(sCount.total_amount_org);
                  sTotal += 1;
               } else if (sCount.state_id.toString() === "13002") {
                  temp.status = "제조완료";
                  sOrderPrice += parseInt(sCount.total_amount_org);
                  sTotal += 1;
               } else if (sCount.state_id.toString() === "14001") {
                  temp.status = "결제중";
                  sTotal += 1;
               } else if (sCount.state_id.toString() === "14004") {
                  temp.status = "고객취소";
                  sTotal += 1;
               } else if (sCount.state_id.toString() === "14005" || sCount.state_id.toString() === "17001") {
                  temp.status = "매장주문취소";
                  sCancel += 1;
                  sTotal += 1;
               } else if (sCount.state_id.toString() === "15001") {
                  temp.status = "픽업중";
                  sOrderPrice += parseInt(sCount.total_amount_org);
                  sTotal += 1;
               } else if (sCount.state_id.toString() === "15002") {
                  temp.status = "픽업완료";
                  sOrderPrice += parseInt(sCount.total_amount_org);
                  sSuccess += 1;
                  sTotal += 1;
               } else if (sCount.state_id.toString() === "16001") {
                  temp.status = "주문취소";
                  sTotal += 1;
               } else if (sCount.state_id.toString() === "16002") {
                  temp.status = "주문완료";
                  sOrderPrice += parseInt(sCount.total_amount_org);
                  sTotal += 1;
               } else {
                  temp.status = "자동취소";
                  aCancel += 1;
                  sTotal += 1;
               }
               oResult.orderList.push(temp);
            }
            oResult.orderData.sOrderPrice = convertToKRW(sOrderPrice, true);
            oResult.orderData.sTotal = sTotal;
            oResult.orderData.sSuccess = sSuccess;
            oResult.orderData.sCancel = sCancel;
            oResult.orderData.aCancel = aCancel;
         }

         for await (let iCount of asyncGenerator(3)) {
            if(parseInt(iCount) == 0){
               const order_complete = await loopChartDataV2("order_complete",7,0);
               oResult.orderChart = order_complete;
            } else if (parseInt(iCount) == 1) {
               const store_cancel = await loopChartDataV2("store_cancel",7,0);
               oResult.orderChart = oResult.orderChart.concat(store_cancel);
            } else if (parseInt(iCount) == 2) {
               const auto_cancel = await loopChartDataV2("auto_cancel",7,0);
               oResult.orderChart = oResult.orderChart.concat(auto_cancel);
            }
         }
      }
      
   } catch (error) {
      console.log("DashboardController.orderList error",error);
   }

   res.status(200).json(oResult);
}

DashboardController.storeListExcelDownload = async (req, res) => {
   try {
      const userId = req.body.userId;
      const fromDate = req.body.fromDate;
      const toDate = req.body.toDate;
      const osVersion = req.body.osVersion;
      const fromDay = moment(fromDate).format("YYYY-MM-DD");
      const toDay = moment(toDate).format("YYYY-MM-DD");
      const sIpAddress = await getClientIP(req);
      await Management.insertQuery(userId,"storeData",sIpAddress,"excel",osVersion,fromDay + "~" + toDay); 
   } catch (error) {
      console.log("DashboardController.storeListExcelDownload error",error);
   }

   res.status(200).json(true);
}

DashboardController.userListExcelDownload = async (req, res) => {
   try {
      const userId = req.body.userId;
      const fromDate = req.body.fromDate;
      const toDate = req.body.toDate;
      const osVersion = req.body.osVersion;
      const fromDay = moment(fromDate).format("YYYY-MM-DD");
      const toDay = moment(toDate).format("YYYY-MM-DD");
      const sIpAddress = await getClientIP(req);
      await Management.insertQuery(userId,"userData",sIpAddress,"excel",osVersion,fromDay + "~" + toDay); 
   } catch (error) {
      console.log("DashboardController.userListExcelDownload error",error);
   }

   res.status(200).json(true);
}

DashboardController.checkEmailSettlement = async (req, res) => {
   const userId = req.body.userId;
   const orderList = req.body.orderList;

   let tempTotalCount = 0;
   let tempCount = 0;
   let oResult =  {};

   try {
      const checkRoll = await checkValidation(userId);
      if(checkRoll === "master" || checkRoll === "accounting"){
         if(orderList.length > 0){
            let today = moment();
            let preToDate = await today.startOf("month").format("YYYY-MM-DD");
            let afterToDate = await today.endOf("month").format("YYYY-MM-DD");

            for (const sItem of orderList) {
               if(sItem.sUserEmail !== undefined && sItem.sUserEmail !== null && sItem.sUserEmail !== ""){
                  const checkOut = await Order.getStoreInvoiceMail(preToDate,afterToDate,sItem.key);
                  if(checkOut === undefined || checkOut === null || checkOut.length == 0){
                     let toDate = await moment().add(-1, 'M');
                     let settlementMonth = await toDate.format("YYYY-MM");
                     let preDate = await toDate.startOf("month").format("YYYY-MM-DD");
                     let afterDate = await toDate.endOf("month").format("YYYY-MM-DD");
                     const getMonthlyData = await Order.getMonthlySettlementByStoreId(preDate,afterDate,sItem.key);
                     if(getMonthlyData.length > 0){
                        const result = await excelData(getMonthlyData);
                        if(result.summaryList !== undefined && result.orderData !== undefined){
                           const excelResult = await excelSheet(result.summaryList,result.orderData,sItem.storeNm,settlementMonth,sItem.sUserEmail);
                           if(excelResult){
                              const senderResult = await Management.sendMailSettlement(sItem.key);
                              if(senderResult !== undefined){
                                 tempCount += 1;
                              }
                           }
                        }
                        
                     }
                  }
                  tempTotalCount += 1;
               }
            }

            oResult.total = tempTotalCount;
            oResult.count = tempCount;
            oResult.fail = tempTotalCount - tempCount;
         }
      }
   } catch (error) {
      console.log("error",error);
   }

   res.status(200).json(oResult);
}

DashboardController.completeSettlement = async (req, res) => {
   let oResult =  false;

   try {
      const userId = req.body.userId;
      const orderList = req.body.orderList;
      const findDay = moment().day();
      if(parseInt(findDay) == 3){
         const checkRoll = await checkValidation(userId);
         if(checkRoll === "master" || checkRoll === "accounting"){
            if(orderList.length > 0){
               const preDate = moment().format('YYYY-MM-DD');
               for (const iterator of orderList) {
                  const checkOut = await Order.getStoreInvoice(preDate,iterator.key);
                  if(checkOut === undefined || checkOut === null || checkOut.length == 0){
                     await Management.completeSettlement(iterator.key);
                  }
               }
               oResult = true;
            }
         }
      }
   } catch (error) {
      console.log("error",error);
   }

   res.status(200).json(oResult);
}

DashboardController.getTaxData = async (req, res) => {
   const userId = req.body.userId;
   const sDate = req.body.sDate;
   
   let sResult = [];
   let oResult = {
      list: [],
      excelData: [],
      lineDate: null
   };
   let excelSheetData = [
      {
         columns: [],
         data: []
      }
   ];
   
   try {
      const checkRoll = await checkValidation(userId);
      if(checkRoll === "master" || checkRoll === "accounting"){
         const fixDate = moment(sDate);
         let preDate = await fixDate.startOf("month").format("YYYY-MM-DD");
         let afterDate = await fixDate.endOf("month").format("YYYY-MM-DD");
         const storeData = await Order.getSettlementGroupByStoreID(preDate,afterDate);
         if(storeData.length > 0){
            for await (const ets of storeData) {
               if(ets.store_id !== undefined && ets.store_id !== null){
                  let temp = {};

                  temp.key = ets.store_id;
                  temp.storeNm = ets.store_name;
                  temp.complete = false;
                  temp.sender = false;
                  temp.account_nm = 0;
                  temp.bankNm = "";
                  temp.bankUser = "";
                  temp.owner = "";
                  temp.business_number = "";

                  temp.point = 0;
                  temp.coupon = 0;
                  temp.pointP = 0;
                  temp.couponP = 0;
                  temp.stemp = 0;
                  temp.payment = 0;
                  temp.fee = 0;
                  temp.return = 0;
                  temp.totalAmount = 0;

                  if(ets.account_nm !== undefined && ets.account_nm !== null && ets.account_nm !== ""){
                     let bytes = CryptoJS.AES.decrypt(ets.account_nm, config.keys.secret);
                     temp.account_nm = bytes.toString(CryptoJS.enc.Utf8);
                  }
                  if(ets.bank_name !== undefined && ets.bank_name !== null){
                     temp.bankNm = ets.bank_name;
                  }
                  if(ets.account_holder !== undefined && ets.account_holder !== null){
                     temp.bankUser = ets.account_holder;
                  }
                  if(ets.full_name !== undefined && ets.full_name !== null){
                     temp.owner = ets.full_name;
                  }
                  if(ets.business_number !== undefined && ets.business_number !== null){
                     temp.business_number = parseInt(ets.business_number);
                  }

                  let pointByStoreId = await Order.getPointByStoreId(preDate,afterDate,parseInt(ets.store_id));
                  if(pointByStoreId !== undefined && pointByStoreId !== null && pointByStoreId.length > 0){
                     pointByStoreId = pointByStoreId[0];
                     if(pointByStoreId.sAmount !== undefined && pointByStoreId.sAmount !== null){
                        temp.point = Math.floor(parseFloat(pointByStoreId.sAmount));
                     }
                  }

                  let couponByStoreId = await Order.getCouponByStoreIdV2(preDate,afterDate,parseInt(ets.store_id));
                  if(couponByStoreId !== undefined && couponByStoreId !== null && couponByStoreId.length > 0){
                     couponByStoreId = couponByStoreId[0];
                     if(couponByStoreId.sAmount !== undefined && couponByStoreId.sAmount !== null){
                        temp.coupon =  Math.floor(parseFloat(couponByStoreId.sAmount));
                     }
                  }

                  let partnerCouponByStoreId = await Order.getPartnerCouponByStoreId(preDate,afterDate,parseInt(ets.store_id));
                  if(partnerCouponByStoreId !== undefined && partnerCouponByStoreId !== null && partnerCouponByStoreId.length > 0){
                     partnerCouponByStoreId = partnerCouponByStoreId[0];
                     if(partnerCouponByStoreId.sAmount !== undefined && partnerCouponByStoreId.sAmount !== null){
                        temp.couponP = Math.floor(parseFloat(partnerCouponByStoreId.sAmount));
                     }
                  }

                  //todo
                  let partnerStampCouponByStoreId = await Order.getPartnerStampCouponByStoreId(preDate,afterDate,parseInt(ets.store_id));
                  if(partnerStampCouponByStoreId !== undefined && partnerStampCouponByStoreId !== null && partnerStampCouponByStoreId.length > 0){
                     partnerStampCouponByStoreId = partnerStampCouponByStoreId[0];
                     if(partnerStampCouponByStoreId.sAmount !== undefined && partnerStampCouponByStoreId.sAmount !== null){
                        temp.stemp = Math.floor(parseFloat(partnerStampCouponByStoreId.sAmount));
                     }
                  }

                  const getWeeklyData = await Order.getSettlementStoreID(preDate,afterDate,parseInt(ets.store_id));
                  if(getWeeklyData.length > 0){
                     let storeReturn = 0;
                     let storeTotalAmt = 0;
                     let storeFee = 0;
                     let storePayment = 0;

                     for await (const iterator of getWeeklyData) {
                        let tempReturn = 0;
                        let tempTotalAmt = 0;
                        let tempFee = 0;
                        let tempPayment = 0;
                        let tempCouponP = 0;
                        let tempStampP = 0;

                        if(iterator.totalAmount !== undefined && iterator.totalAmount !== null){
                           tempTotalAmt = Math.floor(parseFloat(iterator.totalAmount));
                        }

                        if(iterator.payment !== undefined && iterator.payment !== null){
                           tempFee = Math.floor(parseFloat(iterator.payment)* 0.033);
                           tempPayment = Math.floor(parseFloat(iterator.payment));
                        }

                        let partnerCouponByStoreId = await Order.getPartnerCouponByOrderId(preDate,afterDate,parseInt(iterator.order_id),parseInt(ets.store_id));
                        if(partnerCouponByStoreId !== undefined && partnerCouponByStoreId !== null && partnerCouponByStoreId.length > 0){
                           partnerCouponByStoreId = partnerCouponByStoreId[0];
                           if(partnerCouponByStoreId.sAmount !== undefined && partnerCouponByStoreId.sAmount !== null){
                              tempCouponP = Math.floor(parseFloat(partnerCouponByStoreId.sAmount));
                           }
                        }

                        let partnerStampCouponByStoreId = await Order.getPartnerStampCouponByOrderId(preDate,afterDate,parseInt(iterator.order_id),parseInt(ets.store_id));
                        if(partnerStampCouponByStoreId !== undefined && partnerStampCouponByStoreId !== null && partnerStampCouponByStoreId.length > 0){
                           partnerStampCouponByStoreId = partnerStampCouponByStoreId[0];
                           if(partnerStampCouponByStoreId.sAmount !== undefined && partnerStampCouponByStoreId.sAmount !== null){
                              tempStampP = Math.floor(parseFloat(partnerStampCouponByStoreId.sAmount));
                           }
                        }

                        tempReturn = tempTotalAmt - (tempFee + tempCouponP + tempStampP);
                        storeReturn += tempReturn;
                        storeTotalAmt += tempTotalAmt;
                        storeFee += tempFee;
                        storePayment += tempPayment;
                     }

                     temp.totalAmount = convertToKRW(storeTotalAmt, true); 
                     temp.payment = convertToKRW(storePayment, true); 
                     temp.fee = convertToKRW(storeFee, true); 
                     temp.return = convertToKRW(storeReturn, true); 
                  }
                  sResult.push(temp);
               }
            }
            
            excelSheetData[0].data = [
               [{value: preDate + "~" + afterDate + " 정산 명세서", style: {font: {sz: "20", bold: true}}}],
               [{value: ""}],
               [{value: "매장명", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
               {value: "주문금액", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
               {value: "적립금(할인지원금-스루)", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
               {value: "쿠폰(할인지원금-스루)", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
               {value: "적립금(혜택지원금-파트너)", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
               {value: "쿠폰(혜택지원금-파트너)", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
               {value: "스탬프(혜택지원금-파트너)", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
               {value: "카드결제", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
               {value: "결제수수료", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
               {value: "입금받을금액", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
               {value: "은행", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
               {value: "계좌번호", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
               {value: "예금주", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
               {value: "대표자명", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
               {value: "사업자번호", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}}],
            ];

            for await (const excelItem of sResult) {
               let temp = [
                  {value : excelItem.storeNm !== undefined && excelItem.storeNm !== null ? excelItem.storeNm : "", style : { font: { sz: "15" } }},
                  {value : excelItem.totalAmount !== undefined && excelItem.totalAmount !== null ? excelItem.totalAmount : "", style : { font: { sz: "15" } }},
                  {value : excelItem.point !== undefined && excelItem.point !== null ? excelItem.point : "", style : { font: { sz: "15" } }},
                  {value : excelItem.coupon !== undefined && excelItem.coupon !== null ? excelItem.coupon : "", style : { font: { sz: "15" } }},
                  {value : excelItem.pointP !== undefined && excelItem.pointP !== null ? excelItem.pointP : "", style : { font: { sz: "15" } }},
                  {value : excelItem.couponP !== undefined && excelItem.couponP !== null ? excelItem.couponP : "", style : { font: { sz: "15" } }},
                  {value : excelItem.stemp !== undefined && excelItem.stemp !== null ? excelItem.stemp : "", style : { font: { sz: "15" } }},
                  {value : excelItem.payment !== undefined && excelItem.payment !== null ? excelItem.payment : "", style : { font: { sz: "15" } }},
                  {value : excelItem.fee !== undefined && excelItem.fee !== null ? excelItem.fee : "", style : { font: { sz: "15" } }},
                  {value : excelItem.return !== undefined && excelItem.return !== null ? excelItem.return : "", style : { font: { sz: "15" } }},
                  {value : excelItem.bankNm !== undefined && excelItem.bankNm !== null ? excelItem.bankNm : "", style : { font: { sz: "15" } }},
                  {value : excelItem.account_nm !== undefined && excelItem.account_nm !== null ? excelItem.account_nm : "", style : { font: { sz: "15" } }},
                  {value : excelItem.bankUser !== undefined && excelItem.bankUser !== null ? excelItem.bankUser : "", style : { font: { sz: "15" } }},
                  {value : excelItem.owner !== undefined && excelItem.owner !== null ? excelItem.owner : "", style : { font: { sz: "15" } }},
                  {value : excelItem.business_number !== undefined && excelItem.business_number !== null && excelItem.business_number !== "" && !isNaN(excelItem.business_number) ? excelItem.business_number : "", style : { font: { sz: "15" } }},
               ]
               excelSheetData[0].data.push(temp);
            }

            for await (let nullRow of asyncGenerator(17)) {
               let temp = {title: "", width: {wpx: 300}}
               excelSheetData[0].columns.push(temp);
            }
            oResult.excelData = excelSheetData;
         }
         oResult.lineDate = preDate + "~" + afterDate;
         oResult.list = sResult;
      }
   } catch (error) {
      console.log("error",error);
   }

   res.status(200).json(oResult);
}

DashboardController.getMonthlySettlement = async (req, res) => {
   const userId = req.body.userId;

   let tempSenderSucc = 0;
   let tempSucc = 0;
   let sResult = [];
   let oResult = {
      lineDate: null,
      complete: false,
      sender: false,
      list: [],
      excelData: []
   };
   let excelSheetData = [
      {
         columns: [],
         data: []
      }
   ];
   
   try {
      const findDay = moment().day();
      if(parseInt(findDay) !== 0){
         const checkRoll = await checkValidation(userId);
         if(checkRoll === "master" || checkRoll === "accounting"){
            const preDate = moment().startOf('week').add(-6,"days").format('YYYY-MM-DD');
            const afterDate = moment().endOf('week').add(-6,"days").format('YYYY-MM-DD');
            const preToDate = moment().format('YYYY-MM-DD');
            const getMonthlyData = await Order.getMonthlySettlement(preDate,afterDate);
            if(getMonthlyData.length > 0){
               for await (const iterator of getMonthlyData) {
                  let tempReturn = 0;
                  let tempTotalAmt = 0;
                  let tempFee = 0;
                  let tempCouponP = 0;
                  let temp = {};
   
                  temp.key = iterator.store_id;
                  temp.storeNm = iterator.store_name;
                  temp.complete = false;
                  temp.sender = false;
                  temp.totalAmount = 0;
                  temp.point = 0;
                  temp.coupon = 0;
                  temp.pointP = 0;
                  temp.couponP = 0;
                  temp.stemp = 0;
                  temp.payment = 0;
                  temp.fee = 0;
                  temp.return = 0;
                  temp.sBank = iterator.bank_name;
                  temp.sBankNm = 0;
                  temp.sBankUser = iterator.account_holder;
                  temp.sUserEmail = iterator.email;
                  temp.sUserName = iterator.full_name;
                  temp.sUserPhone = iterator.phone_number;
                  temp.sBNm = iterator.business_number;
                  
                  if (iterator.account_nm != undefined && iterator.account_nm != null) {
                     let bytes = CryptoJS.AES.decrypt(iterator.account_nm, config.keys.secret);
                     temp.sBankNm = bytes.toString(CryptoJS.enc.Utf8);
                  }
   
                  if(iterator.totalAmount !== undefined && iterator.totalAmount !== null){
                     tempTotalAmt = Math.floor(parseFloat(iterator.totalAmount));
                     temp.totalAmount = convertToKRW(Math.floor(parseFloat(iterator.totalAmount)), true); 
                  }
                  if(iterator.payment !== undefined && iterator.payment !== null){
                     tempFee = Math.floor(parseFloat(iterator.payment)* 0.033);
                     temp.payment = convertToKRW(Math.floor(parseFloat(iterator.payment)), true);
                     temp.fee = convertToKRW(Math.floor(parseFloat(iterator.payment) * 0.033), true);
                  }
                  
                  let partnerCouponByStoreId = await Order.getPartnerCouponByStoreId(preDate,afterDate,parseInt(iterator.store_id));
                  if(partnerCouponByStoreId !== undefined && partnerCouponByStoreId !== null && partnerCouponByStoreId.length > 0){
                     partnerCouponByStoreId = partnerCouponByStoreId[0];
                     if(partnerCouponByStoreId.sAmount !== undefined && partnerCouponByStoreId.sAmount !== null){
                        tempCouponP = Math.floor(parseFloat(partnerCouponByStoreId.sAmount));
                        temp.couponP = Math.floor(parseFloat(partnerCouponByStoreId.sAmount));
                     }
                  }
                  
                  let pointByStoreId = await Order.getPointByStoreId(preDate,afterDate,parseInt(iterator.store_id));
                  if(pointByStoreId !== undefined && pointByStoreId !== null && pointByStoreId.length > 0){
                     pointByStoreId = pointByStoreId[0];
                     if(pointByStoreId.sAmount !== undefined && pointByStoreId.sAmount !== null){
                        temp.point = Math.floor(parseFloat(pointByStoreId.sAmount));
                     }
                  }
                  
                  let couponByStoreId = await Order.getCouponByStoreId(preDate,afterDate,parseInt(iterator.store_id));
                  if(couponByStoreId !== undefined && couponByStoreId !== null && couponByStoreId.length > 0){
                     couponByStoreId = couponByStoreId[0];
                     if(couponByStoreId.sAmount !== undefined && couponByStoreId.sAmount !== null){
                        temp.coupon =  Math.floor(parseFloat(couponByStoreId.sAmount));
                     }
                  }
                  
                  let storeInvoice = await Order.getStoreInvoice(preToDate,parseInt(iterator.store_id));
                  if(storeInvoice !== undefined && storeInvoice !== null && storeInvoice.length > 0){
                     temp.complete = true;
                     tempSucc += 1;
                  }
   
                  let storeEmailInvoice = await Order.getStoreInvoiceEmail(preToDate,parseInt(iterator.store_id));
                  if(storeEmailInvoice !== undefined && storeEmailInvoice !== null && storeEmailInvoice.length > 0){
                     temp.sender = true;
                     tempSenderSucc += 1;
                  }
   
                  tempReturn = tempTotalAmt - (tempFee + tempCouponP);
                  temp.return = convertToKRW(tempReturn, true);
                  sResult.push(temp);
               }
   
               if(parseInt(getMonthlyData.length) == parseInt(tempSucc)){
                  oResult.complete = true;
               }
   
               excelSheetData[0].data = [
                  [{value: preDate + "~" + afterDate + " 정산 명세서", style: {font: {sz: "20", bold: true}}}],
                  [{value: ""}],
                  [{value: "매장명", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
                  {value: "주문금액", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
                  {value: "적립금(할인지원금-스루)", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
                  {value: "쿠폰(할인지원금-스루)", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
                  {value: "적립금(혜택지원금-파트너)", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
                  {value: "쿠폰(혜택지원금-파트너)", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
                  {value: "스탬프(혜택지원금-파트너)", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
                  {value: "카드결제", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
                  {value: "결제수수료", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
                  {value: "입금받을금액", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
                  {value: "은행", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
                  {value: "계좌번호", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
                  {value: "예금주", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
                  {value: "대표자 이메일", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
                  {value: "대표자명", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
                  {value: "대표자전화번호", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
                  {value: "사업자번호", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}}],
               ];
               for await (const excelItem of sResult) {
                  let temp = [
                     {value : excelItem.storeNm !== undefined && excelItem.storeNm !== null ? excelItem.storeNm : "", style : { font: { sz: "15" } }},
                     {value : excelItem.totalAmount !== undefined && excelItem.totalAmount !== null ? excelItem.totalAmount : "", style : { font: { sz: "15" } }},
                     {value : excelItem.point !== undefined && excelItem.point !== null ? excelItem.point : "", style : { font: { sz: "15" } }},
                     {value : excelItem.coupon !== undefined && excelItem.coupon !== null ? excelItem.coupon : "", style : { font: { sz: "15" } }},
                     {value : excelItem.pointP !== undefined && excelItem.pointP !== null ? excelItem.pointP : "", style : { font: { sz: "15" } }},
                     {value : excelItem.couponP !== undefined && excelItem.couponP !== null ? excelItem.couponP : "", style : { font: { sz: "15" } }},
                     {value : excelItem.stemp !== undefined && excelItem.stemp !== null ? excelItem.stemp : "", style : { font: { sz: "15" } }},
                     {value : excelItem.payment !== undefined && excelItem.payment !== null ? excelItem.payment : "", style : { font: { sz: "15" } }},
                     {value : excelItem.fee !== undefined && excelItem.fee !== null ? excelItem.fee : "", style : { font: { sz: "15" } }},
                     {value : excelItem.return !== undefined && excelItem.return !== null ? excelItem.return : "", style : { font: { sz: "15" } }},
                     {value : excelItem.sBank !== undefined && excelItem.sBank !== null ? excelItem.sBank : "", style : { font: { sz: "15" } }},
                     {value : excelItem.sBankNm !== undefined && excelItem.sBankNm !== null ? excelItem.sBankNm : "", style : { font: { sz: "15" } }},
                     {value : excelItem.sBankUser !== undefined && excelItem.sBankUser !== null ? excelItem.sBankUser : "", style : { font: { sz: "15" } }},
                     {value : excelItem.sUserEmail !== undefined && excelItem.sUserEmail !== null ? excelItem.sUserEmail : "", style : { font: { sz: "15" } }},
                     {value : excelItem.sUserName !== undefined && excelItem.sUserName !== null ? excelItem.sUserName : "", style : { font: { sz: "15" } }},
                     {value : excelItem.sUserPhone !== undefined && excelItem.sUserPhone !== null ? excelItem.sUserPhone : "", style : { font: { sz: "15" } }},
                     {value : excelItem.sBNm !== undefined && excelItem.sBNm !== null ? excelItem.sBNm : "", style : { font: { sz: "15" } }},
                  ]
                  excelSheetData[0].data.push(temp);
               }
             
               for await (let nullRow of asyncGenerator(17)) {
                  let temp = {title: "", width: {wpx: 300}}
                  excelSheetData[0].columns.push(temp);
               }
   
               oResult.excelData = excelSheetData;
            }
            oResult.lineDate = preDate + "~" + afterDate;
            oResult.list = sResult;
         }
      }

   } catch (error) {
      console.log("error",error);
   }

   res.status(200).json(oResult);
}

DashboardController.getMonthlySettlementV2 = async (req, res) => {
   const userId = req.body.userId;

   let tempSenderSucc = 0;
   let tempSucc = 0;
   let sResult = [];
   let oResult = {
      lineDate: null,
      complete: false,
      sender: false,
      list: [],
      excelData: []
   };
   let excelSheetData = [
      {
         columns: [],
         data: []
      }
   ];
   
   try {
      const findDay = moment().day();
      if(parseInt(findDay) !== 0){
         const checkRoll = await checkValidation(userId);
         if(checkRoll === "master" || checkRoll === "accounting"){
            const preDate = moment().startOf('week').add(-6,"days").format('YYYY-MM-DD');
            const afterDate = moment().endOf('week').add(-6,"days").format('YYYY-MM-DD');
            const preToDate = moment().format('YYYY-MM-DD');
            const storeData = await Order.getSettlementGroupByStoreID(preDate,afterDate);
            if(storeData.length > 0){
               for await (const ets of storeData) {
                  if(ets.store_id !== undefined && ets.store_id !== null){
                     let preCoupon = 0;
                     let preCouponPercent = 0;
                     let preCouponThroo = 0;
                     let preCouponCodeThroo = 0;
                     let temp = {};

                     temp.key = ets.store_id;
                     temp.storeNm = ets.store_name;
                     temp.complete = false;
                     temp.sender = false;
                     temp.point = 0;
                     temp.coupon = 0;
                     temp.pointP = 0;
                     temp.couponP = 0;
                     temp.stemp = 0;
                     temp.sBank = ets.bank_name;
                     temp.sBankNm = 0;
                     temp.sBankUser = ets.account_holder;
                     temp.sUserEmail = ets.email;
                     temp.sUserName = ets.full_name;
                     temp.sUserPhone = ets.phone_number;
                     temp.sBNm = ets.business_number;
                     
                     temp.totalAmount = 0;
                     temp.payment = 0;
                     temp.fee = 0;
                     temp.return = 0;

                     if (ets.account_nm != undefined && ets.account_nm != null) {
                        let bytes = CryptoJS.AES.decrypt(ets.account_nm, config.keys.secret);
                        temp.sBankNm = bytes.toString(CryptoJS.enc.Utf8);
                     }

                     let storeInvoice = await Order.getStoreInvoice(preToDate,parseInt(ets.store_id));
                     if(storeInvoice !== undefined && storeInvoice !== null && storeInvoice.length > 0){
                        temp.complete = true;
                        tempSucc += 1;
                     }

                     let storeEmailInvoice = await Order.getStoreInvoiceEmail(preToDate,parseInt(ets.store_id));
                     if(storeEmailInvoice !== undefined && storeEmailInvoice !== null && storeEmailInvoice.length > 0){
                        temp.sender = true;
                        tempSenderSucc += 1;
                     }

                     let partnerCouponByStoreId = await Order.getPartnerCouponByStoreId(preDate,afterDate,parseInt(ets.store_id));
                     if(partnerCouponByStoreId !== undefined && partnerCouponByStoreId !== null && partnerCouponByStoreId.length > 0){
                        partnerCouponByStoreId = partnerCouponByStoreId[0];
                        if(partnerCouponByStoreId.sAmount !== undefined && partnerCouponByStoreId.sAmount !== null){
                           preCoupon = Math.floor(parseFloat(partnerCouponByStoreId.sAmount));
                        }
                     }

                     let getPartnerCouponPercentByStoreId = await Order.getPartnerCouponPercentByStoreId(preDate,afterDate,parseInt(ets.store_id));
                     if(getPartnerCouponPercentByStoreId !== undefined && getPartnerCouponPercentByStoreId !== null && getPartnerCouponPercentByStoreId.length > 0){
                        getPartnerCouponPercentByStoreId = getPartnerCouponPercentByStoreId[0];
                        if(getPartnerCouponPercentByStoreId.sAmount !== undefined && getPartnerCouponPercentByStoreId.sAmount !== null){
                           preCouponPercent = Math.floor(parseFloat(getPartnerCouponPercentByStoreId.sAmount));
                        }
                     }

                     //todo
                     let partnerStampCouponByStoreId = await Order.getPartnerStampCouponByStoreId(preDate,afterDate,parseInt(ets.store_id));
                     if(partnerStampCouponByStoreId !== undefined && partnerStampCouponByStoreId !== null && partnerStampCouponByStoreId.length > 0){
                        partnerStampCouponByStoreId = partnerStampCouponByStoreId[0];
                        if(partnerStampCouponByStoreId.sAmount !== undefined && partnerStampCouponByStoreId.sAmount !== null){
                           temp.stemp = Math.floor(parseFloat(partnerStampCouponByStoreId.sAmount));
                        }
                     }

                     let pointByStoreId = await Order.getPointByStoreId(preDate,afterDate,parseInt(ets.store_id));
                     if(pointByStoreId !== undefined && pointByStoreId !== null && pointByStoreId.length > 0){
                        pointByStoreId = pointByStoreId[0];
                        if(pointByStoreId.sAmount !== undefined && pointByStoreId.sAmount !== null){
                           temp.point = Math.floor(parseFloat(pointByStoreId.sAmount));
                        }
                     }

                     let getCouponNormalByStoreId = await Order.getCouponNormalByStoreId(preDate,afterDate,parseInt(ets.store_id));
                     if(getCouponNormalByStoreId !== undefined && getCouponNormalByStoreId !== null && getCouponNormalByStoreId.length > 0){
                        getCouponNormalByStoreId = getCouponNormalByStoreId[0];
                        if(getCouponNormalByStoreId.sAmount !== undefined && getCouponNormalByStoreId.sAmount !== null){
                           preCouponThroo =  Math.floor(parseFloat(getCouponNormalByStoreId.sAmount));
                        }
                     }

                     let getCouponCodeByStoreId = await Order.getCouponCodeByStoreId(preDate,afterDate,parseInt(ets.store_id));
                     if(getCouponCodeByStoreId !== undefined && getCouponCodeByStoreId !== null && getCouponCodeByStoreId.length > 0){
                        getCouponCodeByStoreId = getCouponCodeByStoreId[0];
                        if(getCouponCodeByStoreId.sAmount !== undefined && getCouponCodeByStoreId.sAmount !== null){
                           preCouponCodeThroo =  Math.floor(parseFloat(getCouponCodeByStoreId.sAmount));
                        }
                     }

                     const getWeeklyData = await Order.getSettlementStoreID(preDate,afterDate,parseInt(ets.store_id));
                     if(getWeeklyData.length > 0){
                        let storeReturn = 0;
                        let storeTotalAmt = 0;
                        let storeFee = 0;
                        let storePayment = 0;

                        for await (const iterator of getWeeklyData) {
                           let tempReturn = 0;
                           let tempTotalAmt = 0;
                           let tempFee = 0;
                           let tempPayment = 0;
                           let tempCoupon = 0;
                           let tempCouponCode = 0;
                           let tempOrderPoint = 0;
                           if(iterator.totalAmount !== undefined && iterator.totalAmount !== null){
                              tempTotalAmt = Math.floor(parseFloat(iterator.totalAmount));
                           }

                           if(iterator.payment !== undefined && iterator.payment !== null){
                              tempFee = Math.floor(parseFloat(iterator.payment)* 0.033);
                              tempPayment = Math.floor(parseFloat(iterator.payment));
                           }

                           let getCouponNormalByStoreId = await Order.getCouponNormalByOrderId(parseInt(iterator.order_id));
                           if(getCouponNormalByStoreId !== undefined && getCouponNormalByStoreId !== null && getCouponNormalByStoreId.length > 0){
                              getCouponNormalByStoreId = getCouponNormalByStoreId[0];
                              if(getCouponNormalByStoreId.sAmount !== undefined && getCouponNormalByStoreId.sAmount !== null){
                                 tempCoupon =  Math.floor(parseFloat(getCouponNormalByStoreId.sAmount));
                              }
                           }
      
                           let getCouponCodeByOrderId = await Order.getCouponCodeByOrderId(parseInt(iterator.order_id));
                           if(getCouponCodeByOrderId !== undefined && getCouponCodeByOrderId !== null && getCouponCodeByOrderId.length > 0){
                              getCouponCodeByOrderId = getCouponCodeByOrderId[0];
                              if(getCouponCodeByOrderId.sAmount !== undefined && getCouponCodeByOrderId.sAmount !== null){
                                 tempCouponCode =  Math.floor(parseFloat(getCouponCodeByOrderId.sAmount));
                              }
                           }

                           let getOrderPointByOrderId = await Order.getOrderPointByOrderId(parseInt(iterator.order_id));
                           if(getOrderPointByOrderId !== undefined && getOrderPointByOrderId !== null && getOrderPointByOrderId.length > 0){
                              getOrderPointByOrderId = getOrderPointByOrderId[0];
                              if(getOrderPointByOrderId.sAmount !== undefined && getOrderPointByOrderId.sAmount !== null){
                                 tempOrderPoint =  Math.floor(parseFloat(getOrderPointByOrderId.sAmount));
                              }
                           }

                           tempReturn = tempPayment + tempCoupon + tempCouponCode + tempOrderPoint - tempFee;
                           storeReturn += tempReturn;
                           storeTotalAmt += tempTotalAmt;
                           storeFee += tempFee;
                           storePayment += tempPayment;
                        }

                        temp.pointP = preCoupon + preCouponPercent;
                        temp.coupon = preCouponThroo + preCouponCodeThroo;
                        temp.totalAmount = convertToKRW(storeTotalAmt, true); 
                        temp.payment = convertToKRW(storePayment, true); 
                        temp.fee = convertToKRW(storeFee, true); 
                        temp.return = convertToKRW(storeReturn, true); 
                     }
                     sResult.push(temp);
                  }
               }

               if(parseInt(storeData.length) == parseInt(tempSucc)){
                  oResult.complete = true;
               }

               excelSheetData[0].data = [
                  [{value: preDate + "~" + afterDate + " 정산 명세서", style: {font: {sz: "20", bold: true}}}],
                  [{value: ""}],
                  [{value: "매장명", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
                  {value: "주문금액", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
                  {value: "적립금(할인지원금-스루)", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
                  {value: "쿠폰(할인지원금-스루)", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
                  {value: "적립금(혜택지원금-파트너)", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
                  {value: "쿠폰(혜택지원금-파트너)", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
                  {value: "스탬프(혜택지원금-파트너)", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
                  {value: "카드결제", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
                  {value: "결제수수료", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
                  {value: "입금받을금액", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
                  {value: "은행", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
                  {value: "계좌번호", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
                  {value: "예금주", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
                  {value: "대표자 이메일", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
                  {value: "대표자명", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
                  {value: "대표자전화번호", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
                  {value: "사업자번호", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}}],
               ];

               for await (const excelItem of sResult) {
                  let temp = [
                     {value : excelItem.storeNm !== undefined && excelItem.storeNm !== null ? excelItem.storeNm : "", style : { font: { sz: "15" } }},
                     {value : excelItem.totalAmount !== undefined && excelItem.totalAmount !== null ? excelItem.totalAmount : "", style : { font: { sz: "15" } }},
                     {value : excelItem.point !== undefined && excelItem.point !== null ? excelItem.point : "", style : { font: { sz: "15" } }},
                     {value : excelItem.coupon !== undefined && excelItem.coupon !== null ? excelItem.coupon : "", style : { font: { sz: "15" } }},
                     {value : excelItem.pointP !== undefined && excelItem.pointP !== null ? excelItem.pointP : "", style : { font: { sz: "15" } }},
                     {value : excelItem.couponP !== undefined && excelItem.couponP !== null ? excelItem.couponP : "", style : { font: { sz: "15" } }},
                     {value : excelItem.stemp !== undefined && excelItem.stemp !== null ? excelItem.stemp : "", style : { font: { sz: "15" } }},
                     {value : excelItem.payment !== undefined && excelItem.payment !== null ? excelItem.payment : "", style : { font: { sz: "15" } }},
                     {value : excelItem.fee !== undefined && excelItem.fee !== null ? excelItem.fee : "", style : { font: { sz: "15" } }},
                     {value : excelItem.return !== undefined && excelItem.return !== null ? excelItem.return : "", style : { font: { sz: "15" } }},
                     {value : excelItem.sBank !== undefined && excelItem.sBank !== null ? excelItem.sBank : "", style : { font: { sz: "15" } }},
                     {value : excelItem.sBankNm !== undefined && excelItem.sBankNm !== null ? excelItem.sBankNm : "", style : { font: { sz: "15" } }},
                     {value : excelItem.sBankUser !== undefined && excelItem.sBankUser !== null ? excelItem.sBankUser : "", style : { font: { sz: "15" } }},
                     {value : excelItem.sUserEmail !== undefined && excelItem.sUserEmail !== null ? excelItem.sUserEmail : "", style : { font: { sz: "15" } }},
                     {value : excelItem.sUserName !== undefined && excelItem.sUserName !== null ? excelItem.sUserName : "", style : { font: { sz: "15" } }},
                     {value : excelItem.sUserPhone !== undefined && excelItem.sUserPhone !== null ? excelItem.sUserPhone : "", style : { font: { sz: "15" } }},
                     {value : excelItem.sBNm !== undefined && excelItem.sBNm !== null ? excelItem.sBNm : "", style : { font: { sz: "15" } }},
                  ]
                  excelSheetData[0].data.push(temp);
               }
               //end
               for await (let nullRow of asyncGenerator(17)) {
                  let temp = {title: "", width: {wpx: 300}}
                  excelSheetData[0].columns.push(temp);
               }
               oResult.excelData = excelSheetData;
            }
            oResult.lineDate = preDate + "~" + afterDate;
            oResult.list = sResult;
         }
      }
   } catch (error) {
      console.log("error",error);
   }

   res.status(200).json(oResult);
}

DashboardController.managerCheck = async (req, res) => {
   const userId = req.body.userId;

   let oResult = {
      resultCd: "9999"
   };
   
   try {
      const checkRoll = await checkValidation(userId);
      if(checkRoll === "marketing"){
         let result = await Management.notificationSales(userId);
         result = result[0];

         if(parseInt(result.total) > 0){
            oResult.resultCd = "0000";
            oResult.resultMsg = "새로운 입점문의가 있습니다.";
         }
      } else if (checkRoll === "marketing") {
         let result = await Management.notificationMarketing(userId);
         result = result[0];

         if(parseInt(result.total) > 0){
            oResult.resultCd = "0000";
            oResult.resultMsg = "새로운 문의사항이 있습니다.";
         }
         
      } else if (checkRoll === "master") {
         let result = await Management.notificationMaster(userId);
         result = result[0];
         if((parseInt(result.app) > 0) || (parseInt(result.web) > 0)){
            oResult.resultCd = "0000";
            oResult.resultMsg = "새로운 문의사항이 있습니다.";
         }
      }
   } catch (error) {
      console.log("error",error);
   }

   res.status(200).json(oResult);
}

DashboardController.updateStoreInquiry = async (req, res) => {
   const userId = req.body.userId;
   const iData = req.body.iData;

   let oResult = false;
   
   try {
      const checkRoll = await checkValidation(userId);
      if(checkRoll === "master" || checkRoll === "marketing"){
         const result = await Management.updateStoreInquiry(iData.id, userId);
         if(result !== undefined){
            const mailSender = await inquireEmail(iData.email);
            if(mailSender){
               oResult = true;
            }
         }
      }
   } catch (error) {
      console.log("error",error);
   }

   res.status(200).json(oResult);
}

DashboardController.bannerAction = async (req, res) => {
   const userId = req.body.userId;
   const iData = req.body.sNm;
   const uploadPic = req.body.uploadPic;
   const sIndex = req.body.sIndex;
   const aIndex = req.body.aIndex;
   const kParam = req.body.kIndex;
   const sType = req.body.sType;

   let oResult = false;
   
   try {
      const checkRoll = await checkValidation(userId);
      if(checkRoll === "master" || checkRoll === "marketing"){
         if(sIndex === "insert"){
            const result = await Management.bannerInsert(iData, uploadPic, sType);
            if(result !== undefined){
               oResult = true;
            }
         } else if(sIndex === "delete") {
            const result = await Management.bannerDel(aIndex,kParam);
            if(result !== undefined){
               oResult = true;
            }
         }
      }
   } catch (error) {
      console.log("error",error);
   }

   res.status(200).json(oResult);
}

DashboardController.appNoticeModify = async (req, res) => {
   const userId = req.body.userId;
   const xIndex = req.body.xIndex;
   const bIndex = req.body.bIndex;
   const aIndex = req.body.aIndex;
   const kIndex = req.body.kIndex;

   let oResult = false;

   try {
      const checkRoll = await checkValidation(userId);
      if(checkRoll === "master" || checkRoll === "marketing" || checkRoll === "design" || checkRoll === "develop"){
         if(kIndex === "app"){
            const result = await Management.modifyAppNotice(xIndex,bIndex,aIndex);
            if(result !== undefined){
               oResult = true;
            }
         } else {
            const result = await Management.modifyHomeNotice(xIndex,bIndex,aIndex);
            if(result !== undefined){
               oResult = true;
            }
         }
      }
   } catch (error) {
      console.log("error",error);
   }

   res.status(200).json(oResult);
}

DashboardController.appNoticeInsert = async (req, res) => {
   const userId = req.body.userId;
   const bIndex = req.body.bIndex;
   const aIndex = req.body.aIndex;
   const kIndex = req.body.kIndex;

   let oResult = false;

   try {
      const checkRoll = await checkValidation(userId);
      if(checkRoll === "master" || checkRoll === "marketing" || checkRoll === "design" || checkRoll === "develop"){
         if(kIndex === "app"){
            const result = await Management.insertAppNotice(bIndex,aIndex);
            if(result !== undefined){
               oResult = true;
            }
         } else {
            const result = await Management.insertHomePageNotice(bIndex,aIndex);
            if(result !== undefined){
               oResult = true;
            }
         }
      }
   } catch (error) {
      console.log("error",error);
   }

   res.status(200).json(oResult);
}

DashboardController.getStoreData = async (req, res) => {
   const userId = req.body.userId;
   const sParam = req.body.sParam;

   let oResult = {};
   let increaseChart = [];
   let orderList = [];
   let storeData = {};
   let sTotal = 0;
   let sSuccess = 0;
   let totalPay = 0;
   let totalCount = 0;
   
   try {
      const checkRoll = await checkValidation(userId);
      if(checkRoll === "master" || checkRoll === "marketing" || checkRoll === "design" || checkRoll === "develop"){
         const sOrderList = await Management.orderListByStore(sParam);
         if(sOrderList.length > 0){
            for await (let xData of sOrderList) {
               let temp = {};
               temp.orderId = xData.order_id;
               temp.carNm = xData.license_number;
               temp.payment = Math.floor(parseInt(xData.total_amount_excl));
               temp.totalPayment = Math.floor(parseInt(xData.total_amount_org));
               if(xData.state_id.toString() === "12001" || xData.state_id.toString() === "12002" || xData.state_id.toString() === "12003" || xData.state_id.toString() === "12004"){
                  temp.status = "확인완료";
                  totalPay += parseInt(xData.total_amount_org);
                  sSuccess += 1;
                  sTotal += 1;
                  totalCount += 1;
               } else if (xData.state_id.toString() === "14002" || xData.state_id.toString() === "14003") {
                  temp.status = "결제완료";
                  totalPay += parseInt(xData.total_amount_org);
                  sSuccess += 1;
                  sTotal += 1;
                  totalCount += 1;
               } else if (xData.state_id.toString() === "13001") {
                  temp.status = "제조중";
                  totalPay += parseInt(xData.total_amount_org);
                  sSuccess += 1;
                  sTotal += 1;
                  totalCount += 1;
               } else if (xData.state_id.toString() === "13002") {
                  temp.status = "제조완료";
                  totalPay += parseInt(xData.total_amount_org);
                  sSuccess += 1;
                  sTotal += 1;
                  totalCount += 1;
               } else if (xData.state_id.toString() === "14001") {
                  temp.status = "결제중";
               } else if (xData.state_id.toString() === "14004") {
                  temp.status = "고객취소";
                  sTotal += 1;
                  totalCount += 1;
               } else if (xData.state_id.toString() === "14005") {
                  temp.status = "판매자취소";
                  sTotal += 1;
                  totalCount += 1;
               } else if (xData.state_id.toString() === "15001") {
                  temp.status = "픽업중";
                  totalPay += parseInt(xData.total_amount_org);
                  sSuccess += 1;
                  sTotal += 1;
                  totalCount += 1;
               } else if (xData.state_id.toString() === "15002") {
                  temp.status = "픽업완료";
                  totalPay += parseInt(xData.total_amount_org);
                  sSuccess += 1;
                  sTotal += 1;
                  totalCount += 1;
               } else if (xData.state_id.toString() === "16001") {
                  temp.status = "주문취소";
                  sTotal += 1;
                  totalCount += 1;
               } else if (xData.state_id.toString() === "16002") {
                  temp.status = "주문완료";
                  sSuccess += 1;
                  sTotal += 1;
                  totalCount += 1;
               } else if (xData.state_id.toString() === "17001") {
                  temp.status = "매장주문취소";
                  sTotal += 1;
                  totalCount += 1;
               } else {
                  sTotal += 1;
                  totalCount += 1;
                  temp.status = "자동취소";
               }
               temp.date = moment(xData.created_at).format("YYYY-MM-DD HH:mm");
               orderList.push(temp);
            }
         }

         let getStoreInfo = await Management.getStoreInfo(sParam);
         if(getStoreInfo !== undefined && getStoreInfo !== null){
            getStoreInfo = getStoreInfo[0];
            storeData.store_name = getStoreInfo.store_name;
            storeData.phone_number = getStoreInfo.phone_number;
            storeData.order_time = getStoreInfo.order_time;
            storeData.operation_time = getStoreInfo.description_holiday;
            storeData.closer = getStoreInfo.noti_nearby_distance;
            storeData.arrive = getStoreInfo.noti_arrival_distance;
            storeData.parking_time = getStoreInfo.parking_time;
            storeData.address = getStoreInfo.address1;
            storeData.description = getStoreInfo.description;
            storeData.description_noti = getStoreInfo.description_noti;
            storeData.description_extra = getStoreInfo.description_extra;
            storeData.lat = getStoreInfo.lat;
            storeData.lng = getStoreInfo.lng;
            storeData.type = getStoreInfo.name;
            storeData.merchant = getStoreInfo.full_name;
            storeData.pause = "운영중";
            if(parseInt(getStoreInfo.pause) > 0){
               storeData.pause = "일시정지";
            }
         }

         for await (let iCount of asyncGenerator(7)) {
            let temp = {};
            let sDay = moment().add(-iCount, 'M').format("YYYY-MM-DD");
            let toDate = await moment().add(-iCount, 'M');
            let preDate = await toDate.startOf("month").format("YYYY-MM-DD");
            let afterDate = await toDate.endOf("month").format("YYYY-MM-DD");
            
            const storeAmountChart = await Management.storeAmountChart(preDate, afterDate, sParam);
            temp.month = sDay;
            temp.value = parseInt(storeAmountChart[0].sCount);
            increaseChart.push(temp);
         }

         if(parseInt(sTotal) == 0 || parseInt(sSuccess) == 0){
            oResult.sucValue = 0;
         } else {
            sSuccess = await parseInt(sSuccess) / parseInt(sTotal) * 100;
            sSuccess = await parseInt(sSuccess.toFixed());
            oResult.sucValue = sSuccess;
         }

         oResult.orderList = orderList;
         oResult.totalCount = totalCount;
         oResult.totalPay = Math.floor(parseInt(totalPay));
         oResult.storeData = storeData;
         oResult.increaseChart = increaseChart;
      }
   } catch (error) {
      console.log("error",error);
   }

   res.status(200).json(oResult);
}

DashboardController.storeChartList = async (req, res) => {
   const userId = req.body.userId;

   let oResult = {};
   let increaseChart = [];
   let storeDataChart = [];

   try {
      const checkRoll = await checkValidation(userId);
      if(checkRoll === "master" || checkRoll === "marketing" || checkRoll === "design" || checkRoll === "develop"){
         const userIncrease = await loopChartData("storeIncrease",0);
         increaseChart = userIncrease;
         oResult.increaseChart = increaseChart;
         
         for await (let iCount of asyncGenerator(7)) {
            if(parseInt(iCount) == 0){
               const cafeData = await loopChartData("cafe",1);
               storeDataChart = cafeData;
            } else if (parseInt(iCount) == 1) {
               const restaurantData = await loopChartData("restaurant",2);
               storeDataChart = storeDataChart.concat(restaurantData);
            } else if (parseInt(iCount) == 2) {
               const fastfoodData = await loopChartData("fastfood",5);
               storeDataChart = storeDataChart.concat(fastfoodData);
            } else if (parseInt(iCount) == 3) {
               const takeoutData = await loopChartData("takeout",6);
               storeDataChart = storeDataChart.concat(takeoutData);
            } else if (parseInt(iCount) == 4) {
               const bunsikData = await loopChartData("bunsik",7);
               storeDataChart = storeDataChart.concat(bunsikData);
            } else if (parseInt(iCount) == 5) {
               const shopData = await loopChartData("shop",8);
               storeDataChart = storeDataChart.concat(shopData);
            } else if (parseInt(iCount) == 6) {
               const hospitalData = await loopChartData("hospital",9);
               storeDataChart = storeDataChart.concat(hospitalData);
            }
         }
         oResult.storeDataChart = storeDataChart;
      }
   } catch (error) {
      console.log("error",error);
   }

   res.status(200).json(oResult);
}

DashboardController.storeData = async (req, res) => {
   const userId = req.body.userId;
   const columnList = req.body.columnList;
   const fromDate = req.body.fromDate;
   const toDate = req.body.toDate;
   const osVersion = req.body.osVersion;
   const isMobile = req.body.isMobile;
   
   let excelSheetData = [
      {
         columns: [],
         data: []
      }
   ];
   let oResult = {
      excelData: [],
      orderList: [],
      orderChartList: [],
      orderData: {
         totalCount: 0,
      }
   };
   try {
      const checkRoll = await checkValidation(userId);
      if(checkRoll === "master" || checkRoll === "marketing" || checkRoll === "design" || checkRoll === "develop"){
         const fromDay = moment(fromDate).format("YYYY-MM-DD");
         const toDay = moment(toDate).format("YYYY-MM-DD");
         const sIpAddress = await getClientIP(req);
         const result = await Management.insertQuery(userId,"storeData",sIpAddress,"search",osVersion,fromDay + "~" + toDay);
         if(result !== undefined){
            for await (let iCount of asyncGenerator(4)) {
               if(parseInt(iCount) == 0){
                  const totalWeek = await loopChartDataV2("store_total",7,0);
                  oResult.orderChartList = totalWeek;
               } else if (parseInt(iCount) == 1) {
                  const activeWeek = await loopChartDataV2("store_activate",7,0);
                  oResult.orderChartList = oResult.orderChartList.concat(activeWeek);
               } else if (parseInt(iCount) == 2) {
                  const unActiveWeek = await loopChartDataV2("store_un_activate",7,0);
                  oResult.orderChartList = oResult.orderChartList.concat(unActiveWeek);
               }
            }
            const getTotalUser = await Store.getOwnerByDate(fromDay,toDay);
            if(getTotalUser.length > 0){
               let tempTotal = 0;
               let tempActivate = 0;
               let tempBusiness = 0;
               let tempStore = 0;
               let tempProduct = 0;
               for await (const sCount of getTotalUser) {
                  tempTotal += 1;
                  if(parseInt(sCount.status) > 0){
                     tempActivate += 1;
                  }
                  if(sCount.businessStatus.toString() !== "미등록"){
                     tempBusiness += 1;
                  }
                  if(sCount.operationTime.toString() !== "미등록" && parseInt(sCount.storeTypeNm) > 0){
                     tempStore += 1;
                  }
                  if(parseInt(sCount.productNm) > 0){
                     tempProduct += 1;
                  }
               }
               oResult.orderData.totalCount = tempTotal;
               oResult.orderData.activeCount = tempActivate;
               oResult.orderData.businessCount = tempBusiness;
               oResult.orderData.productCount = tempProduct;
               oResult.orderData.storeCount = tempStore;
            }
            
            const getList = await Management.storeListByDate(fromDay,toDay);
            if(getList.length > 0){
               for await (const xParam of getList) {
                  let temp = {};
                  for await (const sParam of columnList) {
                     if(sParam.key.toString() === "storeNm"){
                        temp[sParam.key] = (xParam.store_name !== undefined && xParam.store_name !== null && xParam.store_name !== "")  ? xParam.store_name : "알수없음";
                     } else if (sParam.key.toString() === "phone") {
                        temp[sParam.key] = (xParam.phone_number !== undefined && xParam.phone_number !== null && xParam.phone_number !== "")  ? xParam.phone_number : "알수없음";
                     } else if (sParam.key.toString() === "email") {
                        temp[sParam.key] = (xParam.email !== undefined && xParam.email !== null && xParam.email !== "")  ? xParam.email : "알수없음";
                     } else if (sParam.key.toString() === "date") {
                        temp[sParam.key] = (xParam.created_at !== undefined && xParam.created_at !== null && xParam.created_at !== "")  ? moment(xParam.created_at).format("YYYY-MM-DD HH:mm") : "알수없음";
                     } else if (sParam.key.toString() === "id") {
                        temp[sParam.key] = (xParam.storeId !== undefined && xParam.storeId !== null && xParam.storeId !== "")  ? xParam.storeId : "알수없음";
                     } else if (sParam.key.toString() === "businessNm") {
                        temp[sParam.key] = (xParam.business_number !== undefined && xParam.business_number !== null && xParam.business_number !== "")  ? xParam.business_number : "알수없음";
                     } else if (sParam.key.toString() === "storeAddress") {
                        temp[sParam.key] = (xParam.address1 !== undefined && xParam.address1 !== null && xParam.address1 !== "")  ? xParam.address1 : "알수없음";
                     } else if (sParam.key.toString() === "isStart") {
                        temp[sParam.key] = (xParam.status !== undefined && xParam.status !== null && parseInt(xParam.status) > 0)  ? "운영중" : "미운영";
                     } else if (sParam.key.toString() === "productCount") {
                        temp[sParam.key] = (xParam.productNm !== undefined && xParam.productNm !== null) && xParam.productNm.toString() + "개";
                     } else if (sParam.key.toString() === "easy") {
                        const congestion = await Store.getCongestionData(parseInt(xParam.store_id),0);
                        if(congestion !== undefined){
                           temp[sParam.key] = (congestion[0].minute !== undefined && congestion[0].minute !== null && parseInt(congestion[0].minute) != 0) ? congestion[0].minute.toString() + "분" : "미정";
                        }
                     } else if (sParam.key.toString() === "normal") {
                        const congestion = await Store.getCongestionData(parseInt(xParam.store_id),1);
                        if(congestion !== undefined){
                           temp[sParam.key] = (congestion[0].minute !== undefined && congestion[0].minute !== null && parseInt(congestion[0].minute) != 0) ? congestion[0].minute.toString() + "분" : "미정";
                        }
                     } else if (sParam.key.toString() === "busy") {
                        const congestion = await Store.getCongestionData(parseInt(xParam.store_id),2);
                        if(congestion !== undefined){
                           temp[sParam.key] = (congestion[0].minute !== undefined && congestion[0].minute !== null && parseInt(congestion[0].minute) != 0) ? congestion[0].minute.toString() + "분" : "미정";
                        }
                     } else if (sParam.key.toString() === "storePic") {
                        const count = await Store.getStorePictures(parseInt(xParam.store_id));
                        if(count !== undefined){
                           temp[sParam.key] = (count[0].countNm !== undefined && count[0].countNm !== null) ? count[0].countNm.toString() + "개" : "미정";
                        }
                     } else if (sParam.key.toString() === "productPic") {
                        const count = await Store.getProductPicCount(parseInt(xParam.store_id));
                        if(count !== undefined){
                           temp[sParam.key] = (count[0].countNm !== undefined && count[0].countNm !== null) ? count[0].countNm.toString() + "개" : "미정";
                        }
                     } else if (sParam.key.toString() === "orderNm") {
                        temp[sParam.key] = (xParam.orderCount !== undefined && xParam.orderCount !== null)  && xParam.orderCount.toString() + "건";
                     } else if (sParam.key.toString() === "recent") {
                        const sDay = moment().add(-1, 'M').format('YYYY-MM');
                        const validFrom = moment(sDay).startOf('month').format('YYYY-MM-DD');
                        const validTo = moment(sDay).endOf('month').format('YYYY-MM-DD');
                        const count = await Management.getMonthTotalAmountOrg(validFrom,validTo,parseInt(xParam.store_id));
                        if(count !== undefined){
                           temp[sParam.key] = (count[0].sNm !== undefined && count[0].sNm !== null) ? convertToKRW(Math.floor(parseFloat(count[0].sNm)), true) + "원" : "없음";
                        }
                     } else if (sParam.key.toString() === "thisMonth") {
                        const validFrom = moment().startOf('month').format('YYYY-MM-DD');
                        const validTo = moment().endOf('month').format('YYYY-MM-DD');
                        const count = await Management.getMonthTotalAmountOrg(validFrom,validTo,parseInt(xParam.store_id));
                        if(count !== undefined){
                           temp[sParam.key] = (count[0].sNm !== undefined && count[0].sNm !== null) ? convertToKRW(Math.floor(parseFloat(count[0].sNm)), true) + "원" : "없음";
                        }
                     } else if (sParam.key.toString() === "key") {
                        temp[sParam.key] = xParam.store_id;
                     } else if (sParam.key.toString() === "route") {
                        const checkSales = await Management.checkUpSalesCompany(parseInt(xParam.store_id));
                        if(checkSales !== undefined && checkSales.length > 0){
                           temp[sParam.key] = (checkSales[0].group_name !== undefined && checkSales[0].group_name !== null && checkSales[0].group_name !== "") ? checkSales[0].group_name : "알수없는 업체";
                        } else {
                           const checkOriginCompany = await Management.checkUpOriginCompany(parseInt(xParam.store_id));
                           if(checkOriginCompany !== undefined && checkOriginCompany.length > 0){
                              temp[sParam.key] = (checkOriginCompany[0].group_name !== undefined && checkOriginCompany[0].group_name !== null && checkOriginCompany[0].group_name !== "") ? checkOriginCompany[0].group_name : "셀프";
                           } else {
                              temp[sParam.key] = "셀프";
                           }
                        }
                     }
                  }
                  oResult.orderList.push(temp);
               }

               if(sIpAddress.toString() === "210.206.157.98" && !isMobile){
                  excelSheetData[0].data = [
                     [{value: fromDay + "~" + toDay + " 매장 데이터", style: {font: {sz: "20", bold: true}}}],
                     [{value: ""}],
                     [
                        {value: "매장명", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
                        {value: "전화번호", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
                        {value: "email", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
                        {value: "가입일시", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
                        {value: "ID", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
                        {value: "등록경로", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
                        {value: "사업자번호", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
                        {value: "매장주소", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
                        {value: "영업시작", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
                        {value: "등록상품수", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
                        {value: "여유시간", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
                        {value: "보통시간", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
                        {value: "바쁜시간", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
                        {value: "매장사진", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
                        {value: "등록된 메뉴사진수", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
                        {value: "누적 주문수", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
                        {value: "전월 매출", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
                        {value: "당월 매출", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
                     ]
                  ];
                  for await (const excelItem of oResult.orderList) {
                     let temp = [
                        {value : excelItem.storeNm, style : { font: { sz: "15" } }},
                        {value : excelItem.phone, style : { font: { sz: "15" } }},
                        {value : excelItem.email, style : { font: { sz: "15" } }},
                        {value : excelItem.date, style : { font: { sz: "15" } }},
                        {value : excelItem.id, style : { font: { sz: "15" } }},
                        {value : (excelItem.route !== undefined && excelItem.route !== null) ? excelItem.route : "", style : { font: { sz: "15" } }},
                        {value : (excelItem.businessNm !== undefined && excelItem.businessNm !== null) ? excelItem.businessNm : "", style : { font: { sz: "15" } }},
                        {value : (excelItem.storeAddress !== undefined && excelItem.storeAddress !== null) ? excelItem.storeAddress : "", style : { font: { sz: "15" } }},
                        {value : (excelItem.isStart !== undefined && excelItem.isStart !== null) ? excelItem.isStart : "", style : { font: { sz: "15" } }},
                        {value : (excelItem.productCount !== undefined && excelItem.productCount !== null) ? excelItem.productCount : "", style : { font: { sz: "15" } }},
                        {value : (excelItem.easy !== undefined && excelItem.easy !== null) ? excelItem.easy : "", style : { font: { sz: "15" } }},
                        {value : (excelItem.normal !== undefined && excelItem.normal !== null) ? excelItem.normal : "", style : { font: { sz: "15" } }},
                        {value : (excelItem.busy !== undefined && excelItem.busy !== null) ? excelItem.busy : "", style : { font: { sz: "15" } }},
                        {value : (excelItem.storePic !== undefined && excelItem.storePic !== null) ? excelItem.storePic : "", style : { font: { sz: "15" } }},
                        {value : (excelItem.productPic !== undefined && excelItem.productPic !== null) ? excelItem.productPic : "", style : { font: { sz: "15" } }},
                        {value : (excelItem.orderNm !== undefined && excelItem.orderNm !== null) ? excelItem.orderNm : "", style : { font: { sz: "15" } }},
                        {value : (excelItem.recent !== undefined && excelItem.recent !== null) ? excelItem.recent : "", style : { font: { sz: "15" } }},
                        {value : (excelItem.thisMonth !== undefined && excelItem.thisMonth !== null) ? excelItem.thisMonth : "", style : { font: { sz: "15" } }},
                     ]
                     excelSheetData[0].data.push(temp);
                  }
                
                  for await (let nullRow of asyncGenerator(18)) {
                     let temp = {title: "", width: {wpx: 300}}
                     excelSheetData[0].columns.push(temp);
                  }
                  oResult.excelData = excelSheetData;
               }
            }
         }

      }
   } catch (error) {
      console.log("DashboardController.userData error",error);
   }
   res.status(200).json(oResult);

}

DashboardController.userData = async (req, res) => {
   const userId = req.body.userId;
   const columnList = req.body.columnList;
   const fromDate = req.body.fromDate;
   const toDate = req.body.toDate;
   const osVersion = req.body.osVersion;
   const isMobile = req.body.isMobile;
   
   let hCount = 0;
   let kCount = 0;
   let gCount = 0;
   let excelSheetData = [
      {
         columns: [],
         data: []
      }
   ];
   let oResult = {
      excelData: [],
      userList: [],
      userChartList: [],
      userData: {
         userCount: 0,
         sCount: 0,
         hCount: 0,
         kCount: 0,
         gCount: 0,
      }
   };
   try {
      const checkRoll = await checkValidation(userId);
      if(checkRoll === "master" || checkRoll === "marketing" || checkRoll === "design" || checkRoll === "develop"){
         const fromDay = moment(fromDate).format("YYYY-MM-DD");
         const toDay = moment(toDate).format("YYYY-MM-DD");
         const sIpAddress = await getClientIP(req);
         const result = await Management.insertQuery(userId,"userData",sIpAddress,"search",osVersion,fromDay + "~" + toDay);
         if(result !== undefined){
            for await (let iCount of asyncGenerator(4)) {
               if(parseInt(iCount) == 0){
                  const totalWeek = await loopChartDataV2("total",7,0);
                  oResult.userChartList = totalWeek;
               } else if (parseInt(iCount) == 1) {
                  const kakaoWeek = await loopChartDataV2("kakao",7,0);
                  oResult.userChartList = oResult.userChartList.concat(kakaoWeek);
               } else if (parseInt(iCount) == 2) {
                  const normalWeek = await loopChartDataV2("normal",7,0);
                  oResult.userChartList = oResult.userChartList.concat(normalWeek);
               } else {
                  const appleWeek = await loopChartDataV2("apple",7,0);
                  oResult.userChartList = oResult.userChartList.concat(appleWeek);
               }
            }
            const getTotalUser = await User.getTotalUserByDate(fromDay,toDay);
            if(getTotalUser !== undefined){
               oResult.userData.userCount = parseInt(getTotalUser[0].total);
            }
            
            const getKiaUser = await Management.blueLinkUserCount(fromDay,toDay,"kia");
            const getHyundaiUser = await Management.blueLinkUserCount(fromDay,toDay,"hyundai");
            const getGenesisUser = await Management.blueLinkUserCount(fromDay,toDay,"genesis");
            if(getKiaUser !== undefined){
               kCount = parseInt(getKiaUser[0].total);
               oResult.userData.kCount = parseInt(getKiaUser[0].total);
            }
            if(getKiaUser !== undefined){
               gCount = parseInt(getGenesisUser[0].total);
               oResult.userData.gCount = parseInt(getGenesisUser[0].total);
            }
            if(getHyundaiUser !== undefined){
               hCount = parseInt(getHyundaiUser[0].total);
               oResult.userData.hCount = parseInt(getHyundaiUser[0].total);
            }
            oResult.userData.sCount = hCount + gCount + kCount;
            
            const getList = await Management.userListByDate(fromDay,toDay,fromDay,toDay,fromDay,toDay);
            if(getList.length > 0){
               for await (const xParam of getList) {
                  let temp = {};
                  for await (const sParam of columnList) {
                     if(sParam.key.toString() === "id"){
                        temp[sParam.key] = (xParam.full_name !== undefined && xParam.full_name !== null && xParam.full_name !== "")  ? xParam.full_name : "알수없음";
                     } else if (sParam.key.toString() === "phone") {
                        temp[sParam.key] = (xParam.phone_number !== undefined && xParam.phone_number !== null && xParam.phone_number !== "")  ? xParam.phone_number : "알수없음";
                     } else if (sParam.key.toString() === "email") {
                        temp[sParam.key] = (xParam.email !== undefined && xParam.email !== null && xParam.email !== "")  ? xParam.email : "알수없음";
                     } else if (sParam.key.toString() === "date") {
                        temp[sParam.key] = (xParam.created_at !== undefined && xParam.created_at !== null && xParam.created_at !== "")  ? moment(xParam.created_at).format("YYYY-MM-DD HH:mm") : "알수없음";
                     } else if (sParam.key.toString() === "connectedCar") {
                        let tempBlueLink = "미등록"
                        if(xParam.bluelink_id !== undefined && xParam.bluelink_id !== null && parseInt(xParam.bluelink_id) > 0){
                           if(xParam.is_disconnected !== undefined && xParam.is_disconnected !== null && parseInt(xParam.is_disconnected) === 0){
                              tempBlueLink = "등록"
                           }
                        }
                        temp[sParam.key] = tempBlueLink;
                     } else if (sParam.key.toString() === "carNm") {
                        temp[sParam.key] = (xParam.carNm !== undefined && xParam.carNm !== null && parseInt(xParam.carNm) > 0)  ? parseInt(xParam.carNm) : "미등록";
                     } else if (sParam.key.toString() === "cardYn") {
                        temp[sParam.key] = (xParam.cardNm !== undefined && xParam.cardNm !== null && parseInt(xParam.cardNm) > 0) ? parseInt(xParam.cardNm) : "미등록";
                     } else if (sParam.key.toString() === "route") {
                        if(xParam.apple_id !== undefined && xParam.apple_id !== null){
                           temp[sParam.key] = "apple id"
                        } else if (xParam.kakao_id !== undefined && xParam.kakao_id !== null && parseInt(xParam.kakao_id) > 0) {
                           temp[sParam.key] = "kakao id"
                        } else {
                           temp[sParam.key] = "일반가입"
                        }
                     } else if (sParam.key.toString() === "totalCount") {
                        let tempOrderCount = 0;
                        let totalOrderCount = await User.totalOrderCount(xParam.user_id);
                        if(totalOrderCount !== undefined && totalOrderCount.length > 0){
                           tempOrderCount = totalOrderCount[0].oCount;
                        }
                        temp[sParam.key] = tempOrderCount;
                     } else if (sParam.key.toString() === "mCount") {
                        let fDay = moment().startOf('month').format('YYYY-MM-DD');
                        let tDay = moment().endOf('month').format('YYYY-MM-DD');
                        let tempOrderCount = 0;
                        let monthlyOrderCount = await User.monthlyOrderCountUser(xParam.user_id,fDay,tDay);
                        if(monthlyOrderCount !== undefined && monthlyOrderCount.length > 0){
                           tempOrderCount = monthlyOrderCount[0].oCount;
                        }
                        temp[sParam.key] = tempOrderCount;
                     } else if (sParam.key.toString() === "recentDate") {
                        let tempOrderDate = "없음";
                        let orderRecently = await User.orderRecentlyUser(xParam.user_id);
                        if(orderRecently !== undefined && orderRecently.length > 0){
                           tempOrderDate = moment(orderRecently[0].created_at).format("YYYY-MM-DD HH:mm")
                        }
                        temp[sParam.key] =  tempOrderDate;
                     }
                  }
                  oResult.userList.push(temp);
               }

               if(!isMobile){
                  excelSheetData[0].data = [
                     [{value: fromDay + "~" + toDay + " 유저 데이터", style: {font: {sz: "20", bold: true}}}],
                     [{value: ""}],
                     [
                        {value: "이름", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
                        {value: "전화번호", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
                        {value: "email", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
                        {value: "가입일시", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
                        {value: "가입경로", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
                        {value: "커넥티드카", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
                        {value: "총구매건수", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
                        {value: "당월구매건수", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
                        {value: "최근주문일", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
                        {value: "등록차량수량", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
                        {value: "등록카드수량", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
                     ]
                  ];
                  for await (const excelItem of oResult.userList) {
                     let temp = [
                        {value : excelItem.id, style : { font: { sz: "15" } }},
                        {value : excelItem.phone, style : { font: { sz: "15" } }},
                        {value : excelItem.email, style : { font: { sz: "15" } }},
                        {value : excelItem.date, style : { font: { sz: "15" } }},
                        {value : (excelItem.route !== undefined && excelItem.route !== null) ? excelItem.route : "", style : { font: { sz: "15" } }},
                        {value : (excelItem.connectedCar !== undefined && excelItem.connectedCar !== null) ? excelItem.connectedCar : "", style : { font: { sz: "15" } }},
                        {value : (excelItem.totalCount !== undefined && excelItem.totalCount !== null) ? excelItem.totalCount : "", style : { font: { sz: "15" } }},
                        {value : (excelItem.mCount !== undefined && excelItem.mCount !== null) ? excelItem.mCount : "", style : { font: { sz: "15" } }},
                        {value : (excelItem.recentDate !== undefined && excelItem.recentDate !== null) ? excelItem.recentDate : "", style : { font: { sz: "15" } }},
                        {value : (excelItem.carNm !== undefined && excelItem.carNm !== null) ? excelItem.carNm : "", style : { font: { sz: "15" } }},
                        {value : (excelItem.cardYn !== undefined && excelItem.cardYn !== null) ? excelItem.cardYn : "", style : { font: { sz: "15" } }},
                     ]
                     excelSheetData[0].data.push(temp);
                  }
                
                  for await (let nullRow of asyncGenerator(11)) {
                     let temp = {title: "", width: {wpx: 300}}
                     excelSheetData[0].columns.push(temp);
                  }
                  oResult.excelData = excelSheetData;
               }
            }
         }

      }
   } catch (error) {
      console.log("DashboardController.userData error",error);
   }
   res.status(200).json(oResult);

}

DashboardController.userChartList = async (req, res) => {
   const userId = req.body.userId;

   let oResult = {};
   let increaseChart = [];
   let userDataChart = [];

   try {
      const checkRoll = await checkValidation(userId);
      if(checkRoll === "master" || checkRoll === "marketing" || checkRoll === "design" || checkRoll === "develop"){
         const userIncrease = await loopChartData("userIncrease",0);
         increaseChart = userIncrease;
         oResult.increaseChart = increaseChart;
         
         for await (let iCount of asyncGenerator(3)) {
            if(parseInt(iCount) == 0){
               const userCard = await loopChartData("userCard",0);
               userDataChart = userCard;
            } else if (parseInt(iCount) == 1) {
               const userCar = await loopChartData("userCar",0);
               userDataChart = userDataChart.concat(userCar);
            } else {
               const userBluelink = await loopChartData("userBluelink",0);
               userDataChart = userDataChart.concat(userBluelink);
            }
         }
         oResult.userDataChart = userDataChart;
      }
   } catch (error) {
      console.log("error",error);
   }

   res.status(200).json(oResult);
}

DashboardController.getUserData = async (req, res) => {
   const userId = req.body.userId;
   const sParam = req.body.sParam;

   let oResult = {
      orderList : [],
      inquiryList : [],
      cardList : [],
      carList : [],
      userChart : [],
      userData : {},
      orderNm: 0,
   };

   try {
      const checkRoll = await checkValidation(userId);
      if(checkRoll === "master" || checkRoll === "marketing" || checkRoll === "design" || checkRoll === "develop"){
         const orderList = await Management.orderListByUser(sParam);
         if(orderList.length > 0){
            let sNm = 0;
            for await (let i of orderList) {
               let temp = {};
               temp.carNm = i.license_number;
               temp.payment = convertToKRW(Math.floor(parseFloat(i.total_amount_excl)), true);
               temp.total = convertToKRW(Math.floor(parseFloat(i.total_amount_org)), true);
               temp.date = moment(i.created_at).format("YYYY-MM-DD");
               temp.storeName = i.store_name;

               if(i.state_id.toString() === "14004"){
                  temp.status = "고객취소";
               } else if (i.state_id.toString() === "14005") {
                  temp.status = "판매자취소";
               } else if (i.state_id.toString() === "15002") {
                  temp.status = "픽업완료";
                  sNm += 1;
               } else if (i.state_id.toString() === "16001") {
                  temp.status = "주문취소";
               } else if (i.state_id.toString() === "16002") {
                  temp.status = "주문완료";
               } else if (i.state_id.toString() === "17001") {
                  temp.status = "매장주문취소";
               } else if (i.state_id.toString() === "18001") {
                  temp.status = "자동취소";
               }

               oResult.orderList.push(temp);
            }
            oResult.orderNm = sNm;
         }

         const inquiryListByUser = await Management.inquiryListByUser(sParam);
         if(inquiryListByUser.length > 0){
            for await (let e of inquiryListByUser) {
               let temp = {};
               temp.answerDate = "미정";
               temp.status = "미답변";
               temp.title = e.title;
               temp.author = e.full_name;
               temp.date = moment(e.created_at).format("YYYY-MM-DD");
               
               if(parseInt(e.state_id) > 0){
                  temp.answerDate = moment(e.updated_at).format("YYYY-MM-DD");
                  temp.status = "답변완료";
               }
               oResult.inquiryList.push(temp);
            }
         }

         const cardListByUser = await Management.cardListByUser(sParam);
         if(cardListByUser.length > 0){
            for await (let a of cardListByUser) {
               let temp = {};
               temp.cardNm = a.ccard_name;
               temp.cardCompany = a.ccard_company;
               temp.date = moment(a.created_at).format("YYYY-MM-DD");
               oResult.cardList.push(temp);
            }
         }

         const carListByUser = await Management.carListByUser(sParam);
         if(carListByUser.length > 0){
            for await (let a of carListByUser) {
               let temp = {};
               temp.carName = a.car_name;
               temp.carStyle = a.car_style;
               temp.carNm = a.license_number;
               temp.date = moment(a.created_at).format("YYYY-MM-DD");
               oResult.carList.push(temp);
            }
         }

         const userDetail = await Management.userDetail(sParam);
         if(userDetail.length > 0){
            for await (const iterator of userDetail) {
               let temp = {};
               if(parseInt(iterator.status) > 0){
                  temp.userPoint = 0;
                  if(iterator.apple_id !== undefined && iterator.apple_id !== null && iterator.apple_id !== ""){
                     temp.userType = "Apple Id";
                  }else if(iterator.kakao_id !== undefined && iterator.kakao_id !== null && iterator.kakao_id !== ""){
                     temp.userType = "Kakao Id";
                  } else {
                     temp.userType = "Throo Id";
                  }
                  const userPoints = await Management.getUserPointsById(sParam);
                  if(userPoints !== undefined && userPoints !== null){
                     const sPoint = userPoints[0];
                     if(sPoint.points !== undefined &&  sPoint.points !== null && parseInt(sPoint.points) > 0){
                        temp.userPoint = parseInt(sPoint.points);
                     }
                  }
                  temp.email = iterator.email;
                  temp.userName = iterator.full_name;
                  temp.phone = iterator.phone_number;
                  temp.blueLink = iterator.type;
                  oResult.userData = temp;
               }
            }
         }
         
         for await (let xCount of asyncGenerator2(6,0)) {
            const sDay = moment().add(-xCount, 'M').format('YYYY-MM');
            const validFrom = moment(sDay).startOf('month').format('YYYY-MM-DD');
            const validTo = moment(sDay).endOf('month').format('YYYY-MM-DD');
            const countChart = await Store.orderCountByUser(validFrom,validTo,sParam);

            let temp = {};
            temp.type = sDay;
            temp.sales = parseInt(countChart[0].sCount);
            oResult.userChart.push(temp);
         }

      }
   } catch (error) {
      console.log("error",error);
   }

   res.status(200).json(oResult);
}

DashboardController.searchStore = async (req, res) => {
   const userId = req.body.userId;
   const iParam = req.body.iParam;

   let oResult = [];

   try {
      const checkRoll = await checkValidation(userId);
      if(checkRoll === "master" || checkRoll === "marketing" || checkRoll === "design" || checkRoll === "develop"){
         const getList = await Management.searchStoreByName(iParam);
         if(getList.length > 0){
            for await (let iterator of getList) {
               let temp = {};
               temp.id = iterator.store_id;
               temp.name = iterator.store_name;
               temp.status = "매장등록중";
               if(parseInt(iterator.status) > 0){
                  temp.status = "영업준비완료";
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

DashboardController.searchUser = async (req, res) => {
   const userId = req.body.userId;
   const sParam = req.body.sParam;
   const today = moment().format("YYYY-MM-DD").toString();
   
   let oResult = [];

   try {
      const checkRoll = await checkValidation(userId);
      if(checkRoll === "master" || checkRoll === "marketing" || checkRoll === "design" || checkRoll === "develop"){
         const getList = await Management.searchUserByParam(sParam);
         if(getList.length > 0){
            for await (let iterator of getList) {
               let temp = {};
               temp.id = iterator.user_id;
               temp.email = "탈퇴";
               temp.phone = "탈퇴";
               temp.status = "quit";
               temp.name = "";

               if(parseInt(iterator.status) > 0){
                  temp.status = "hold";
                  temp.email = iterator.email;
                  temp.phone = iterator.phone_number;
                  if(iterator.full_name !== undefined && iterator.full_name !== null && iterator.full_name !== ""){
                     temp.name = iterator.full_name;
                  }
                  if(today === moment(iterator.created_at).format("YYYY-MM-DD")){
                     temp.status = "new";
                  }
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

DashboardController.storeList = async (req, res) => {
   const userId = req.body.userId;
   const sParam = req.body.sParam;

   let oResult = [];

   try {
      const checkRoll = await checkValidation(userId);
      if(checkRoll === "master" || checkRoll === "operation" || checkRoll === "marketing" || checkRoll === "design" || checkRoll === "develop"){
         const getList = await Management.getStoreList(sParam);
         if(getList.length > 0){
            for await (let iterator of getList) {
               let temp = {};
               temp.id = iterator.store_id;
               temp.name = iterator.store_name;
               temp.status = "접속";
               if(parseInt(iterator.pause) > 0){
                  temp.status = "미접속";
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

DashboardController.storeInfoV2 = async (req, res) => {
   const sParam = req.body.sParam;

   let oResult = {
      store: {},
      pickUpZone: {},
      pictureList: {
         first: null,
         second: null,
         third: null,
         forth: null
      },
      operationList: [],
      dayOffList: [],
      categoryList: [],
      optionList: [],
      orderList: [],
   };

   try {
      const getStoreInfo = await Management.getInfoByStoreId(parseInt(sParam));
      if(getStoreInfo.length > 0){
         oResult.store.key = getStoreInfo[0].email;
         oResult.store.storeCreateAt = moment(getStoreInfo[0].created_at).format('LLL');
         oResult.store.storeAddress = getStoreInfo[0].address1;
         oResult.store.storePhone = getStoreInfo[0].storePhone;
         oResult.store.ownerNm = getStoreInfo[0].full_name;
         oResult.store.ownerPhone = getStoreInfo[0].phone_number;
         oResult.store.businessNm = getStoreInfo[0].business_number;
         oResult.store.businessAddress = getStoreInfo[0].address1;
         oResult.store.email = getStoreInfo[0].ownerEmail;
         oResult.store.bankNm = getStoreInfo[0].bank_name;
         oResult.store.storeDesc = getStoreInfo[0].description;
         oResult.store.storeNotification = getStoreInfo[0].description_extra;
         oResult.store.storeNotice = getStoreInfo[0].description_noti;
         oResult.store.distance = getStoreInfo[0].noti_nearby_distance;
         oResult.store.parkingTime = getStoreInfo[0].parking_time;
         oResult.store.dayOff = getStoreInfo[0].holiday_from + "~" + getStoreInfo[0].holiday_to;

         const checkSales = await Management.checkUpSalesCompany(parseInt(sParam));
         if(checkSales !== undefined && checkSales.length > 0){
            oResult.store.storeRoute = (checkSales[0].group_name !== undefined && checkSales[0].group_name !== null && checkSales[0].group_name !== "") ? checkSales[0].group_name : "알수없는 업체";
         } else {
            const checkOriginCompany = await Management.checkUpOriginCompany(parseInt(sParam));
            if(checkOriginCompany !== undefined && checkOriginCompany.length > 0){
               oResult.store.storeRoute = (checkOriginCompany[0].group_name !== undefined && checkOriginCompany[0].group_name !== null && checkOriginCompany[0].group_name !== "") ? checkOriginCompany[0].group_name : "셀프";
            } else {
               oResult.store.storeRoute = "셀프";
            }
         }

         if(getStoreInfo[0].account_nm !== undefined && getStoreInfo[0].account_nm !== null && getStoreInfo[0].account_nm !== ""){
            let bytes = CryptoJS.AES.decrypt(getStoreInfo[0].account_nm, config.keys.secret);
            oResult.store.bankAccount = bytes.toString(CryptoJS.enc.Utf8);
         } else {
            oResult.store.bankAccount = "미등록"
         }
         
         oResult.pickUpZone.lng = parseFloat(getStoreInfo[0].lng);
         oResult.pickUpZone.lat = parseFloat(getStoreInfo[0].lat);
         oResult.pickUpZone.parking_pan = parseFloat(getStoreInfo[0].parking_pan);
         oResult.pickUpZone.parking_tilt = parseFloat(getStoreInfo[0].parking_tilt);
         oResult.pickUpZone.parking_zoom = parseFloat(getStoreInfo[0].parking_zoom);
         oResult.pickUpZone.parkingImg = getStoreInfo[0].parking_image;

         for await(const xCount of getStoreInfo) {
            if(parseInt(xCount.congestion_type) === 0){
               oResult.store.easy = parseInt(xCount.minute);
            }
            if(parseInt(xCount.congestion_type) === 1){
               oResult.store.normal = parseInt(xCount.minute);
            }
            if(parseInt(xCount.congestion_type) === 2){
               oResult.store.busy = parseInt(xCount.minute);
            }
         }
         
      }

      const storeType = await Management.storeTypeByStoreId(parseInt(sParam));
      if(storeType.length > 0){
         let mainList = [];
         let subList = [];
         for await (const aCount of storeType) {
            let temp = "";
            temp = aCount.name;
            if(parseInt(aCount.is_main) > 0){
               mainList.push(temp);
            } else {
               subList.push(temp);
            }
         }

         if(mainList.length > 0){
            oResult.store.mainType = mainList.join();
         }
         if(subList.length > 0){
            oResult.store.subType = subList.join();
         }
      }

      const storePictureList = await Management.storePictureList(parseInt(sParam));
      if(storePictureList.length > 0){
         oResult.pictureList.first = storePictureList[0].url_path;
         oResult.pictureList.second = storePictureList[1].url_path;
         oResult.pictureList.third = storePictureList[2].url_path;
         oResult.pictureList.forth = storePictureList[3].url_path;
      }

      const operationTime = await Management.operationTimeByStoreId(parseInt(sParam));
      if(operationTime.length > 0){
         for (const yCount of operationTime) {
            let temp = {};
            temp.key = parseInt(yCount.store_time_id);
            temp.time = yCount.opening_time + "~" + yCount.opening_time;
            temp.minute = yCount.minute;
            if(parseInt(yCount.day_of_week) === 0){
               temp.day = "일요일";
            } else if (parseInt(yCount.day_of_week) === 1) {
               temp.day = "월요일";
            } else if (parseInt(yCount.day_of_week) === 2) {
               temp.day = "화요일";
            } else if (parseInt(yCount.day_of_week) === 3) {
               temp.day = "수요일";
            } else if (parseInt(yCount.day_of_week) === 4) {
               temp.day = "목요일";
            } else if (parseInt(yCount.day_of_week) === 5) {
               temp.day = "금요일";
            } else if (parseInt(yCount.day_of_week) === 6) {
               temp.day = "토요일";
            } else if (parseInt(yCount.day_of_week) === 7) {
               temp.day = "매일";
            } else if (parseInt(yCount.day_of_week) === 8) {
               temp.day = "평일";
            } else if (parseInt(yCount.day_of_week) === 9) {
               temp.day = "주말";
            }
            oResult.operationList.push(temp);
         }
      }

      const dayOffList = await Management.dayOffList(parseInt(sParam));
      if(dayOffList.length > 0){
         for await (const sCount of dayOffList) {
            let temp = {};
            temp.key = parseInt(sCount.store_holiday_id);
            if(parseInt(sCount.day_of_week) === 0){
               temp.day = "일요일";
            } else if (parseInt(sCount.day_of_week) === 1) {
               temp.day = "월요일";
            } else if (parseInt(sCount.day_of_week) === 2) {
               temp.day = "화요일";
            } else if (parseInt(sCount.day_of_week) === 3) {
               temp.day = "수요일";
            } else if (parseInt(sCount.day_of_week) === 4) {
               temp.day = "목요일";
            } else if (parseInt(sCount.day_of_week) === 5) {
               temp.day = "금요일";
            } else if (parseInt(sCount.day_of_week) === 6) {
               temp.day = "토요일";
            }

            if(parseInt(sCount.day_of_week) === 1){
               temp.week = "매주";
            } else if (parseInt(sCount.day_of_week) === 2) {
               temp.week = "매달 첫주";
            } else if (parseInt(sCount.day_of_week) === 3) {
               temp.week = "매달 둘째주";
            } else if (parseInt(sCount.day_of_week) === 4) {
               temp.week = "매달 셋째주";
            } else if (parseInt(sCount.day_of_week) === 5) {
               temp.week = "매달 넷쨰주";
            } else if (parseInt(sCount.day_of_week) === 6) {
               temp.week = "매달 다섯째주";
            } else if (parseInt(sCount.day_of_week) === 7) {
               temp.week = "매달 마지막주";
            }
            oResult.dayOffList.push(temp);
         }
      }

      const checkCategory = await Store.checkCategory(parseInt(sParam));
      if(checkCategory.length > 0){
         const getCategoryList = await Store.getCategoryList(parseInt(checkCategory[0].menu_id));
         if(getCategoryList.length > 0){
            let count = 1;
            for await (let i of getCategoryList) {
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
               }
               oResult.categoryList.push(temp);
               count ++;
            }
         }
      }

      const optionList = await Store.getoptionList(parseInt(sParam));
      if(optionList.length > 0){
         let count = 1;
         for await (let i of optionList) {
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
            
            oResult.optionList.push(temp);
            count ++;
         }
      }

      const orderList = await Management.orderListAdmin(parseInt(sParam));
      if(orderList.length > 0){
         for await (const n of orderList) {
            let temp = {};
            temp.key = n.order_id;
            temp.phone = n.phone_number;
            temp.email = n.email;
            temp.createAt = moment(n.created_at).format('LLL');
            temp.total = convertToKRW(Math.floor(parseFloat(n.total_amount_org)), true);
            if(n.state_id.toString() === "14004"){
               temp.status = "고객취소";
            } else if (n.state_id.toString() === "14005") {
               temp.status = "판매자취소";
            } else if (n.state_id.toString() === "15002") {
               temp.status = "픽업완료";
            } else if (n.state_id.toString() === "16001") {
               temp.status = "주문취소";
            } else if (n.state_id.toString() === "16002") {
               temp.status = "주문완료";
            } else if (n.state_id.toString() === "17001") {
               temp.status = "매장주문취소";
            } else if (n.state_id.toString() === "17002") {
               temp.status = "고객 기록삭제요청";
            } else if (n.state_id.toString() === "18001") {
               temp.status = "자동취소";
            } else if (n.state_id.toString() === "15001") {
               temp.status = "픽업중";
            } else if (n.state_id.toString() === "12001" || n.state_id.toString() === "12002" || n.state_id.toString() === "12003" || n.state_id.toString() === "12004") {
               temp.status = "확인완료";
            } else if (n.state_id.toString() === "14003" || n.state_id.toString() === "14002") {
               temp.status = "결제완료";
            } else if (n.state_id.toString() === "14001") {
               temp.status = "결제중";
            } else if (n.state_id.toString() === "13002") {
               temp.status = "제조완료";
            } else if (n.state_id.toString() === "13001") {
               temp.status = "제조중";
            }
            oResult.orderList.push(temp);
         }

      }

      const isLogin = await Store.isLogin(parseInt(sParam));
      if(isLogin !== undefined && isLogin !== null){
         if(parseInt(isLogin[0].sNm) > 0){
            oResult.store.status = "운영중";
         } else {
            oResult.store.status = "준비중";
         }
      } else {
         oResult.store.status = "준비중";
      }

   } catch (error) {
      console.log("DashboardController.storeInfoV2 error =>>>>>>", error);
   }

   res.status(200).json(oResult);
}

DashboardController.storeListV2 = async (req, res) => {
   const userId = req.body.userId;
   const sParam = req.body.sParam;

   let oResult = {
      chart: [],
      list: []
   };

   try {
      const checkRoll = await checkValidation(userId);
      if(checkRoll === "master" || checkRoll === "operation" || checkRoll === "marketing" || checkRoll === "design" || checkRoll === "develop"){
         const getList = await Management.getStoreList(sParam);
         if(getList.length > 0){
            for await (let iterator of getList) {
               let temp = {};
               temp.id = iterator.store_id;
               temp.name = iterator.store_name;
               temp.status = "매장등록중";
               if(parseInt(iterator.status) > 0){
                  temp.status = "영업준비완료";
               }
               oResult.list.push(temp);
            }
         }

         const allList = await Management.getAllStoreList();
         if(allList.length > 0){
            let tempTotal = 0;
            let tempPause = 0;
            let tempUnPlug = 0;
            let tempIsOn = 0;
            let tempPrepare = 0;
            for await (let sCount of allList) {
               if(parseInt(sCount.status) > 0){
                  if(parseInt(sCount.pause) > 0){
                     tempPause += 1;
                  } else {
                     const result = await Store.isLogin(sCount.store_id);
                     if(result !== undefined && result !== null){
                        if(parseInt(result[0].sNm) > 0){
                           tempIsOn += 1;
                        } else {
                           tempUnPlug += 1;
                        }
                     } else {
                        tempUnPlug += 1;
                     }
                  }
               } else {
                  tempPrepare += 1;
               }
               tempTotal += 1;
            }
            tempUnPlug = await tempUnPlug / parseInt(tempTotal) * 100;
            tempIsOn = await tempIsOn / parseInt(tempTotal) * 100;
            tempPause = await tempPause / parseInt(tempTotal) * 100;
            tempPrepare = await tempPrepare / parseInt(tempTotal) * 100;
            tempUnPlug = await parseInt(tempUnPlug.toFixed());
            tempIsOn = await parseInt(tempIsOn.toFixed());
            tempPause = await parseInt(tempPause.toFixed());
            tempPrepare = await parseInt(tempPrepare.toFixed());

            oResult.chart = [
               {
                  type: '정상영업중',
                  value: tempIsOn,
               },
               {
                  type: '매장등록중',
                  value: tempPrepare,
               },
               {
                  type: '일시정지',
                  value: tempPause,
               },
               {
                  type: '미접속',
                  value: tempUnPlug,
               }
            ]
         }
      }
   } catch (error) {
      console.log("error",error);
   }

   res.status(200).json(oResult);
}

DashboardController.userList = async (req, res) => {
   const userId = req.body.userId;
   const sParam = req.body.sParam;

   const today = moment().format("YYYY-MM-DD").toString();
   let oResult = {
      chart: [],
      list: []
   };

   try {
      const checkRoll = await checkValidation(userId);
      if(checkRoll === "master" || checkRoll === "operation" || checkRoll === "marketing" || checkRoll === "design" || checkRoll === "develop"){
         const getList = await Management.getUserList(sParam);
         if(getList.length > 0){
            for await (let iterator of getList) {
               let temp = {};
               temp.id = iterator.user_id;
               temp.email = "탈퇴";
               temp.phone = "탈퇴";
               temp.status = "quit";
               temp.name = "";

               if(parseInt(iterator.status) > 0){
                  temp.status = "hold";
                  temp.email = iterator.email;
                  temp.phone = iterator.phone_number;
                  if(iterator.full_name !== undefined && iterator.full_name !== null && iterator.full_name !== ""){
                     temp.name = iterator.full_name;
                  }
                  if(today === moment(iterator.created_at).format("YYYY-MM-DD")){
                     temp.status = "new";
                  }
               }

               oResult.list.push(temp);
            }
         }

         const getUserStatus = await Management.getUserStatus();
         if(getUserStatus.length > 0){
            let tempTotal = 0;
            let tempDelete = 0;
            let tempOrder = 0;
            let tempNormal = 0;
            for await (let sCount of getUserStatus) {
               if(parseInt(sCount.status) > 0){
                  if(parseInt(sCount.sNm) > 0){
                     tempOrder += 1;
                  } else {
                     tempNormal += 1;
                  }
               } else {
                  tempDelete += 1;
               }
               tempTotal += 1;
            }

            tempDelete = await tempDelete / parseInt(tempTotal) * 100;
            tempOrder = await tempOrder / parseInt(tempTotal) * 100;
            tempNormal = await tempNormal / parseInt(tempTotal) * 100;
            tempDelete = await parseInt(tempDelete.toFixed());
            tempOrder = await parseInt(tempOrder.toFixed());
            tempNormal = await parseInt(tempNormal.toFixed());
   
            oResult.chart = [
               {
                  type: '탈퇴회원',
                  value: tempDelete,
               },
               {
                  type: '주문내역이 있는 회원',
                  value: tempOrder,
               },
               {
                  type: '주문내역이 없는 회원',
                  value: tempNormal,
               }
            ]
         }
      }
   } catch (error) {
      console.log("error",error);
   }

   res.status(200).json(oResult);
}

DashboardController.manageList = async (req, res) => {
   const userId = req.body.userId;
   const sParam = req.body.sParam;
   let oResult = {
      resultCd: "9999",
      list: []
   };

   try {
      let getList = [];
      const checkRoll = await checkValidation(userId);
      if(checkRoll === "master" || checkRoll === "operation" || checkRoll === "marketing" || checkRoll === "design" || checkRoll === "develop"){
         if(sParam === "banner"){
            getList = await Management.getBannerList();
            if(getList.length > 0){
               for await (let iterator of getList) {
                  let temp = {};
                  temp.id = iterator.banner_id;
                  temp.url_path = iterator.url_path;
                  temp.title = iterator.title;
                  temp.type = iterator.type;
                  temp.mime_type = iterator.mime_type;
                  temp.status = iterator.status;
                  oResult.list.push(temp);
               }
               oResult.resultCd = "0000";
            }
         } else if(sParam === "commencement") {
            getList = await Management.commencementBusiness();
            if(getList.length > 0){
               for await (let iterator of getList) {
                  let temp = {};
                  temp.id = iterator.inquiry_id;
                  temp.url_path = "https://api-stg.ivid.kr/img/no-image-new.png";
                  temp.store_name = iterator.store_name;
                  temp.phone_number = iterator.phone_number;
                  temp.email = iterator.email;
                  temp.address = iterator.address;
                  temp.title = iterator.title;
                  temp.status = false;
                  if(iterator.state_id == 1){
                     temp.status = true;
                  }
                  oResult.list.push(temp);
               }
               oResult.resultCd = "0000";
            }
         } else if(sParam === "app_inquiry") {
            const getInquiryList = await Store.getInquiryList();
            if(getInquiryList.length > 0){
               for await (let iterator of getInquiryList) {
                  let temp = {};
                  temp.created_at = moment(iterator.created_at).format("YYYY-MM-DD");
                  temp.id = iterator.inquiry_id;
                  temp.url_path = "https://api-stg.ivid.kr/img/no-image-new.png";
                  temp.title = iterator.title;
                  temp.content = iterator.content;
                  temp.answer = iterator.answer;
                  temp.userName = iterator.phone_number;
                  temp.img_url = iterator.img_url;
                  temp.status = false;
                  if(parseInt(iterator.state_id) > 0){
                     temp.status = true;
                  }
                  oResult.list.push(temp);
               }
               oResult.resultCd = "0000";
            }
         } else {
            if(sParam === "home_notice") {
               getList = await Management.getHomeNoticeList();
            } else if(sParam === "app_notice") {
               getList = await Management.getAppNoticeList();
            }
            
            if(getList.length > 0){
               for await (let iterator of getList) {
                  let temp = {};
                  temp.id = iterator.notice_id;
                  temp.url_path = "https://api-stg.ivid.kr/img/no-image-new.png";
                  temp.title = iterator.title;
                  temp.created_at = moment(iterator.created_at).format("YYYY-MM-DD");
                  if(sParam === "home_notice") {
                     temp.content = iterator.content;
                  } else {
                     temp.content = iterator.answer;
                  }

                  oResult.list.push(temp);
               }
               oResult.resultCd = "0000";
            }
         }
      }
   } catch (error) {
      console.log("error",error);
   }
   res.status(200).json(oResult);
}

DashboardController.answerInquiry = async (req, res) => {
   const userId = req.body.userId;
   const sContent = req.body.answers;
   const inquiryId = req.body.inquiry_id;
   let oResult = "9999";

   try {
      const checkRoll = await checkValidation(userId);
      if(checkRoll === "master" || checkRoll === "operation" || checkRoll === "marketing" || checkRoll === "design" || checkRoll === "develop"){
         const result = await Management.responseInquiry(sContent,userId,inquiry_id);
         if(result != undefined && result != null){
            oResult = "0000";
         }
      }
   } catch (error) {
      console.log("error",error);
   }
   res.status(200).json(oResult);
}

DashboardController.dashboard = async (req, res) => {
   let pieChartList = [];
   let oResult = {
      orderList : [],
      aChart : [],
      kChart :[],
      wChart : [],
      mChart : [],
      nChart : [],
      hChart : [],
      vChart : [],
      gChart : []
   };

   try {
      let calUser = await User.calculateUser();
      if(calUser != undefined && calUser != null){
         calUser = calUser[0];

         let androidUserValue = parseInt(calUser.android_user);
         androidUserValue = androidUserValue / parseInt(calUser.total) * 100;
         androidUserValue = parseInt(androidUserValue.toFixed());

         let appleUserValue = parseInt(calUser.ios_user);
         appleUserValue = appleUserValue / parseInt(calUser.total) * 100;
         appleUserValue = parseInt(appleUserValue.toFixed());

         let appleValue = parseInt(calUser.appleId);
         appleValue = appleValue / parseInt(calUser.total) * 100;
         appleValue = parseInt(appleValue.toFixed());

         let kakaoValue = parseInt(calUser.kakaoId);
         kakaoValue = kakaoValue / parseInt(calUser.total) * 100;
         kakaoValue = parseInt(kakaoValue.toFixed());

         let normalValue = parseInt(calUser.normal);
         normalValue = normalValue / parseInt(calUser.total) * 100;
         normalValue = parseInt(normalValue.toFixed());

         for await (let iCount of asyncGenerator(3)) {
            let temp = {};
            if(iCount == 0){
               temp.type = "Apple계정";
               temp.value = appleValue
            }
            if(iCount == 1){
               temp.type = "Kakao계정";
               temp.value = kakaoValue
            }
            if(iCount == 2){
               temp.type = "일반회원";
               temp.value = normalValue
            }
            await pieChartList.push(temp);
         }

         oResult.normal = calUser.normal;
         oResult.normalPercent = normalValue;
         oResult.kakaoId = calUser.kakaoId;
         oResult.kakaoPercent = kakaoValue;
         oResult.appleId = calUser.appleId;
         oResult.applePercent = appleValue;
         oResult.androidUser = calUser.android_user;
         oResult.androidUserPercent = androidUserValue;
         oResult.appleUser = calUser.ios_user;
         oResult.appleUserPercent = appleUserValue;
         oResult.total = calUser.total;
         oResult.pieChart = pieChartList;
      }

      const orderList = await Order.orderListLimit(8);
      if(orderList != undefined && orderList != null && orderList.length > 0){
         for await (let sCount of orderList) {
            let temp = {};
            temp.amount = Math.floor(parseInt(sCount.total_amount_org));
            temp.name = sCount.store_name;
            temp.status = true;

            if(sCount.cancelled_at != undefined && sCount.cancelled_at != null && sCount.cancelled_at != ""){
               temp.status = false;
            }

            await oResult.orderList.push(temp);
         }
      }

      for await (let iCount of asyncGenerator(7)) {
         if(parseInt(iCount) == 0){
            const totalWeek = await loopChartDataV3("total",7,0);
            const storeTotal = await loopChartDataV3("storeTotal",7,0);
            const orderComplete = await loopChartDataV3("orderComplete",7,0);
            oResult.kChart = totalWeek;
            oResult.wChart = storeTotal;
            oResult.vChart = orderComplete;
         } else if (parseInt(iCount) == 1) {
            const kakaoWeek = await loopChartDataV3("kakao",7,0);
            const storeActivate = await loopChartDataV3("storeActivate",7,0);
            const orderCancel = await loopChartDataV3("orderCancel",7,0);
            oResult.kChart = oResult.kChart.concat(kakaoWeek);
            oResult.wChart = oResult.wChart.concat(storeActivate);
            oResult.vChart = oResult.vChart.concat(orderCancel);
         } else if (parseInt(iCount) == 2) {
            const normalWeek = await loopChartDataV3("normal",7,0);
            const storeUnActivate = await loopChartDataV3("storeUnActivate",7,0);
            oResult.kChart = oResult.kChart.concat(normalWeek);
            oResult.wChart = oResult.wChart.concat(storeUnActivate);
         } else if (parseInt(iCount) == 3) {
            const appleWeek = await loopChartDataV3("apple",7,0);
            oResult.kChart = oResult.kChart.concat(appleWeek);
         }
      }

      for await (let xCount of asyncGenerator2(6,0)) {
         const sDay = moment().add(-xCount, 'days').format('YYYY-MM-DD');
         const iDay = moment().add(-xCount, 'days').format('MM-DD');

         const countChart = await Store.countChart(sDay);
         const countWebUserChart = await Store.countWebsiteUser(sDay);
         const countWebCEOUserChart = await Store.countCEOWebsiteUser(sDay);

         for await (let oCount of asyncGenerator(4)) {
            let tempWebType = {};
            let tempCEOWebType = {};
            let tempNm = "Android";
            if(parseInt(oCount) == 0){
               tempNm = "iOS"
            } else if (parseInt(oCount) == 1){
               tempNm = "Windows"
            } else if (parseInt(oCount) == 2){
               tempNm = "Mac OS"
            }
            const countWebsiteType = await Store.countWebsiteType(sDay, tempNm);
            const countWebCEOsiteType = await Store.countCEOWebsiteType(sDay, tempNm);
   
            tempWebType.date = iDay;
            tempCEOWebType.date = iDay;
            tempWebType.type = tempNm;
            tempCEOWebType.type = tempNm;
            tempWebType.value = parseInt(countWebsiteType[0].sCount);
            tempCEOWebType.value = parseInt(countWebCEOsiteType[0].sCount);
            oResult.nChart.push(tempWebType);
            oResult.hChart.push(tempCEOWebType);
         }

         let temp = {};
         let tempWebUser = {};
         let tempWebCEOUser = {};

         temp.type = iDay;
         tempWebUser.date = iDay;
         tempWebCEOUser.date = iDay;
         temp.sales = parseInt(countChart[0].sCount);
         tempWebUser.scales = parseInt(countWebUserChart[0].sCount);
         tempWebCEOUser.scales = parseInt(countWebCEOUserChart[0].sCount);

         oResult.mChart.push(tempWebUser);
         oResult.gChart.push(tempWebCEOUser);
         oResult.aChart.push(temp);
      }
   } catch (error) {
      console.log("error",error);
   }
   
   res.status(200).json(oResult);

}

DashboardController.testDashboard = async (req, res) => {
   let pieChartList = [];
   let oResult = {
      orderList : [],
      aChart : [],
      kChart :[],
      wChart : [],
      mChart : [],
      nChart : [],
      hChart : [],
      vChart : [],
      gChart : []
   };

   try {
      let calUser = await User.calculateUser();
      if(calUser != undefined && calUser != null){
         calUser = calUser[0];

         let androidUserValue = await parseInt(calUser.android_user);
         androidUserValue = await androidUserValue / parseInt(calUser.total) * 100;
         androidUserValue = await parseInt(androidUserValue.toFixed());

         let appleUserValue = await parseInt(calUser.ios_user);
         appleUserValue = await appleUserValue / parseInt(calUser.total) * 100;
         appleUserValue = await parseInt(appleUserValue.toFixed());

         let appleValue = await parseInt(calUser.appleId);
         appleValue = await appleValue / parseInt(calUser.total) * 100;
         appleValue = await parseInt(appleValue.toFixed());

         let kakaoValue = await parseInt(calUser.kakaoId);
         kakaoValue = await kakaoValue / parseInt(calUser.total) * 100;
         kakaoValue = await parseInt(kakaoValue.toFixed());

         let normalValue = await parseInt(calUser.normal);
         normalValue = await normalValue / parseInt(calUser.total) * 100;
         normalValue = await parseInt(normalValue.toFixed());

         for await (let iCount of asyncGenerator(3)) {
            let temp = {};
            if(iCount == 0){
               temp.type = "Apple계정";
               temp.value = appleValue
            }
            if(iCount == 1){
               temp.type = "Kakao계정";
               temp.value = kakaoValue
            }
            if(iCount == 2){
               temp.type = "일반회원";
               temp.value = normalValue
            }
            await pieChartList.push(temp);
         }

         oResult.normal = calUser.normal;
         oResult.normalPercent = normalValue;
         oResult.kakaoId = calUser.kakaoId;
         oResult.kakaoPercent = kakaoValue;
         oResult.appleId = calUser.appleId;
         oResult.applePercent = appleValue;
         oResult.androidUser = calUser.android_user;
         oResult.androidUserPercent = androidUserValue;
         oResult.appleUser = calUser.ios_user;
         oResult.appleUserPercent = appleUserValue;
         oResult.total = calUser.total;
         oResult.pieChart = pieChartList;
      }

      const orderList = await Order.orderListLimit(8);
      if(orderList != undefined && orderList != null && orderList.length > 0){
         for await (let sCount of orderList) {
            let temp = {};
            temp.amount = Math.floor(parseInt(sCount.total_amount_org));
            temp.name = sCount.store_name;
            temp.status = true;

            if(sCount.cancelled_at != undefined && sCount.cancelled_at != null && sCount.cancelled_at != ""){
               temp.status = false;
            }

            await oResult.orderList.push(temp);
         }
      }

      for await (let iCount of asyncGenerator(7)) {
         if(parseInt(iCount) == 0){
            const totalWeek = await loopChartDataV4("total",8,0);
            const storeTotal = await loopChartDataV4("storeTotal",8,0);
            const orderComplete = await loopChartDataV4("orderComplete",8,0);
            oResult.kChart = totalWeek;
            oResult.wChart = storeTotal;
            oResult.vChart = orderComplete;
         } else if (parseInt(iCount) == 1) {
            const kakaoWeek = await loopChartDataV4("kakao",8,0);
            const storeActivate = await loopChartDataV4("storeActivate",8,0);
            const orderCancel = await loopChartDataV4("orderCancel",8,0);
            oResult.kChart = oResult.kChart.concat(kakaoWeek);
            oResult.wChart = oResult.wChart.concat(storeActivate);
            oResult.vChart = oResult.vChart.concat(orderCancel);
         } else if (parseInt(iCount) == 2) {
            const normalWeek = await loopChartDataV4("normal",8,0);
            const storeUnActivate = await loopChartDataV4("storeUnActivate",8,0);
            oResult.kChart = oResult.kChart.concat(normalWeek);
            oResult.wChart = oResult.wChart.concat(storeUnActivate);
         } else if (parseInt(iCount) == 3) {
            const appleWeek = await loopChartDataV4("apple",8,0);
            oResult.kChart = oResult.kChart.concat(appleWeek);
         }
      }

      for await (let xCount of asyncGenerator2(6,0)) {
         const sDay = moment().add(-xCount, 'days').format('YYYY-MM-DD');
         const iDay = moment().add(-xCount, 'days').format('MM-DD');

         const countChart = await Store.countChart(sDay);
         const countWebUserChart = await Store.countWebsiteUser(sDay);
         const countWebCEOUserChart = await Store.countCEOWebsiteUser(sDay);

         for await (let oCount of asyncGenerator(4)) {
            let tempWebType = {};
            let tempCEOWebType = {};
            let tempNm = "Android";
            if(parseInt(oCount) == 0){
               tempNm = "iOS"
            } else if (parseInt(oCount) == 1){
               tempNm = "Windows"
            } else if (parseInt(oCount) == 2){
               tempNm = "Mac OS"
            }
            const countWebsiteType = await Store.countWebsiteType(sDay, tempNm);
            const countWebCEOsiteType = await Store.countCEOWebsiteType(sDay, tempNm);
   
            tempWebType.date = iDay;
            tempCEOWebType.date = iDay;
            tempWebType.type = tempNm;
            tempCEOWebType.type = tempNm;
            tempWebType.value = parseInt(countWebsiteType[0].sCount);
            tempCEOWebType.value = parseInt(countWebCEOsiteType[0].sCount);
            oResult.nChart.push(tempWebType);
            oResult.hChart.push(tempCEOWebType);
         }

         let temp = {};
         let tempWebUser = {};
         let tempWebCEOUser = {};

         temp.type = iDay;
         tempWebUser.date = iDay;
         tempWebCEOUser.date = iDay;
         temp.sales = parseInt(countChart[0].sCount);
         tempWebUser.scales = parseInt(countWebUserChart[0].sCount);
         tempWebCEOUser.scales = parseInt(countWebCEOUserChart[0].sCount);

         oResult.mChart.push(tempWebUser);
         oResult.gChart.push(tempWebCEOUser);
         oResult.aChart.push(temp);
      }
   } catch (error) {
      console.log("error",error);
   }
   
   res.status(200).json(oResult);

}


module.exports = DashboardController;

