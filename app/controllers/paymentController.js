'use strict';

var jwt = require('jsonwebtoken');
var config = require('../config');

const Store = require('../models/store');
const User = require('../models/user');
const Order = require('../models/order');

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
   mysqlDateToYMD,
   groupArrayByKey
} = require('../helpers/stringHelper');

var oValidate = require("validate.js");

const { async } = require('validate.js');

async function* asyncGenerator(sIndex) {
   let count = 0;
   while (count < sIndex) 
   yield count++;
};

const calculatePay = async (preDate,afterDate,storeId) => {
   let oResult = {
      payAmount: null,
      payFee: null,
      payTotal: null,
      taxAmount: null,
      taxFee: null,
      taxTotal: null,
   };

   let totalAmount = 0;
   let amount = 0;
   let feeAmount = 0;
   let taxFee = 0;
   
   const calPayment = await Order.dashboardMerchantData(preDate,afterDate,storeId);
   if(calPayment.length > 0){
      for await (const iterator of calPayment) {
         let tempTotal = 0;
         let tempDiscount = 0;
         if(iterator.totalAmount !== undefined && iterator.totalAmount !== null){
            tempTotal = parseFloat(iterator.totalAmount);
         }
         if(iterator.payment !== undefined && iterator.payment !== null){
            taxFee = taxFee + parseFloat(iterator.payment);
         }
         if(iterator.coupon_partner_amount !== undefined && iterator.coupon_partner_amount !== null){
            tempDiscount = parseFloat(iterator.coupon_partner_amount);
            totalAmount = totalAmount + (tempTotal - tempDiscount);
         } else {
            totalAmount = totalAmount + tempTotal;
         }
      }
      amount = totalAmount / 11;
      oResult.payAmount = Math.floor(parseFloat(amount * 10));
      oResult.payFee = Math.round(parseFloat(amount * 1));
      oResult.payTotal = oResult.payAmount + oResult.payFee;
      
      feeAmount = Math.floor(parseFloat(taxFee) * 0.033) / 11;
      oResult.taxAmount = Math.floor(parseFloat(feeAmount * 10));
      oResult.taxFee = Math.round(parseFloat(feeAmount * 1));
      oResult.taxTotal = oResult.taxAmount + oResult.taxFee;
   }

   return oResult;
}

const calculatePayV2 = async (preDate,afterDate,storeId) => {
   let oResult = {
      payAmount: null,
      payFee: null,
      payTotal: null,
      taxAmount: null,
      taxFee: null,
      taxTotal: null,
      count: null,
   };

   let oTotal = 0;
   let oIncome = 0;
   let oFee = 0;
   let iTotal = 0;
   let iFee = 0;
   let iOrigin = 0;
   let iCount = 0;
   
   const calPayment = await Order.getSettlementStoreID(preDate,afterDate,storeId);
   if(calPayment.length > 0){
      for await (const iterator of calPayment) {
         let total = 0;
         let vat = 0;
         let pay = 0;
         let fee = 0;
         let origin = 0;
         let iVat = 0;
         let payment = 0;
         let couponThroo = 0;
         let couponCodeThroo = 0;
         let pointThroo = 0;
         
         if(iterator.payment !== undefined && iterator.payment !== null){
            payment = Math.floor(parseFloat(iterator.payment));
            fee = Math.floor(parseFloat(iterator.payment)* 0.033);
         }

         let pointByStoreId = await Order.getPointByOrderId(parseInt(iterator.order_id));
         if(pointByStoreId !== undefined && pointByStoreId !== null && pointByStoreId.length > 0){
            pointByStoreId = pointByStoreId[0];
            if(pointByStoreId.sAmount !== undefined && pointByStoreId.sAmount !== null){
               pointThroo = Math.floor(parseFloat(pointByStoreId.sAmount));
            }
         }

         let getCouponCodeByOrderId = await Order.getCouponCodeByOrderId(preDate,afterDate,parseInt(iterator.store_id));
         if(getCouponCodeByOrderId !== undefined && getCouponCodeByOrderId !== null && getCouponCodeByOrderId.length > 0){
            getCouponCodeByOrderId = getCouponCodeByOrderId[0];
            if(getCouponCodeByOrderId.sAmount !== undefined && getCouponCodeByOrderId.sAmount !== null){
               couponThroo =  Math.floor(parseFloat(getCouponCodeByOrderId.sAmount));
            }
         }

         let getCouponByOrderId = await Order.getCouponByOrderId(preDate,afterDate,parseInt(iterator.store_id));
         if(getCouponByOrderId !== undefined && getCouponByOrderId !== null && getCouponByOrderId.length > 0){
            getCouponByOrderId = getCouponByOrderId[0];
            if(getCouponByOrderId.sAmount !== undefined && getCouponByOrderId.sAmount !== null){
               couponCodeThroo =  Math.floor(parseFloat(getCouponByOrderId.sAmount));
            }
         }

         total = payment + pointThroo + couponThroo + couponCodeThroo;
         pay = Math.round(total / 1.1);
         vat = total - pay;
         origin = Math.round(fee / 1.1);
         iVat = fee - origin;

         oTotal += total;
         oIncome += pay;
         oFee += vat;
         iTotal += fee;
         iFee += iVat;
         iOrigin += origin;
         iCount += 1;
      }
      oResult.payAmount = oIncome;
      oResult.payFee = oFee;
      oResult.payTotal = oTotal;
      oResult.count = iCount;
      oResult.taxAmount = iOrigin;
      oResult.taxFee = iFee;
      oResult.taxTotal = iTotal;
   }

   return oResult;
}

const adjustmentCalculate = async (getData,storeId) => {
   let oResult = [];
   for await (const e of getData) {
      let tempFromDate = moment(e.transaction_date).startOf('week').add(-6,"days").format('YYYY-MM-DD');
      let tempToDate = moment(e.transaction_date).startOf('week').format('YYYY-MM-DD');
      let sDate = moment(e.transaction_date).format('MM-DD');
      let sPeriod = moment(tempFromDate).format('MM-DD') + " ~ " + moment(tempToDate).format('MM-DD');
      let pStamp = 0;
      let pMoney = 0;
      let pCoupon = 0;
      let tMoney = 0;
      let tCoupon = 0;
      let partnerTotal = 0;
      let throoTotal = 0;
      let paymentTotal = 0;
      let totalPayment = 0;
      let payment = 0;
      let fee = 0;
      let sReturn = 0;
      let temp = {};

      const getMonthlyData = await Order.getMonthlySettlementByStoreId(tempFromDate,tempToDate,storeId);
      if(getMonthlyData.length > 0){
         for await (const s of getMonthlyData) {
            paymentTotal += Math.floor(parseFloat(s.total_amount_org));
            payment += Math.floor(parseFloat(s.total_amount_incl));
            
            if(s.coupon_partner_amount !== undefined && s.coupon_partner_amount !== null){
               pCoupon += Math.floor(parseFloat(s.coupon_partner_amount));
            } else {
               pCoupon += 0;
            }
            if(s.coupon_amount !== undefined && s.coupon_amount !== null){
               tCoupon += Math.floor(parseFloat(s.coupon_amount));
            } else {
               tCoupon += 0;
            }
            if(s.points_amount !== undefined && s.points_amount !== null){
               tMoney += Math.floor(parseFloat(s.points_amount));
            } else {
               tMoney += 0;
            }
         }
         
         sReturn = convertToKRW(paymentTotal - (Math.floor(parseFloat(payment) * 0.033) + (pCoupon + pMoney + pStamp)), true);
         fee = convertToKRW(Math.floor(parseFloat(payment) * 0.033), true);
         totalPayment = convertToKRW(paymentTotal, true);
         payment = convertToKRW(payment, true);
         
         throoTotal = convertToKRW(tMoney + tCoupon, true);
         tMoney = convertToKRW(tMoney, true);
         tCoupon = convertToKRW(tCoupon, true);
         partnerTotal = convertToKRW(pCoupon + pMoney + pStamp, true);
         pCoupon = convertToKRW(pCoupon, true);
      }
      
      temp.date = sDate;
      temp.period = sPeriod;
      temp.return = sReturn;
      temp.throoTotal = throoTotal;
      temp.tMoney = tMoney;
      temp.tMoney = tMoney;
      temp.tCoupon = tCoupon;
      temp.partnerTotal = partnerTotal;
      temp.pMoney = pMoney;
      temp.pCoupon = pCoupon;
      temp.pStamp = pStamp;
      temp.totalPayment = totalPayment;
      temp.payment = payment;
      temp.fee = fee;
      temp.iList = await excelFirstSheet(sDate,totalPayment,throoTotal,partnerTotal,payment,fee,sReturn);
      temp.aList = await excelLastSheet(tempFromDate,tempToDate,getMonthlyData);
      oResult.push(temp);
   }
   
   return oResult;
   
}

const adjustmentCalculateV2 = async (getData,storeId) => {
   let oResult = [];
   for await (const e of getData) {
      let tempFromDate = moment(e.transaction_date).startOf('week').add(-6,"days").format('YYYY-MM-DD');
      let tempToDate = moment(e.transaction_date).startOf('week').format('YYYY-MM-DD');
      let sDate = moment(e.transaction_date).format('MM-DD');
      let sPeriod = moment(tempFromDate).format('MM-DD') + " ~ " + moment(tempToDate).format('MM-DD');
      let pStamp = 0;
      let pMoney = 0;
      let pCoupon = 0;
      let tMoney = 0;
      let tCoupon = 0;
      let partnerTotal = 0;
      let throoTotal = 0;
      let paymentTotal = 0;
      let totalPayment = 0;
      let payment = 0;
      let fee = 0;
      let sReturn = 0;
      let temp = {};
      let excelData = [];

      const getMonthlyData = await Order.getMonthlySettlementByStoreIdV2(tempFromDate,tempToDate,storeId);
      if(getMonthlyData.length > 0){
         for await (const s of getMonthlyData) {
            let tempExcel = {};
            let tempCoupon = 0;
            let tempCouponP = 0;
            let tempCouponStamp = 0;
            let tempCouponCode = 0;
            let tempOrderPoint = 0;
            let tempOrderPointP = 0;
            let tempPayment = 0;
            let tempTotal = 0;
            let tempFee = 0;
            let tempReturn = 0;

            if(s.total_amount_incl !== undefined && s.total_amount_incl !== null){
               tempTotal = Math.floor(parseFloat(s.total_amount_org));
               tempPayment = Math.floor(parseFloat(s.total_amount_incl));
               tempFee = Math.floor(parseFloat(tempPayment) * 0.033);
            }

            let getCouponNormalByStoreId = await Order.getCouponNormalByOrderId(parseInt(s.order_id));
            if(getCouponNormalByStoreId !== undefined && getCouponNormalByStoreId !== null && getCouponNormalByStoreId.length > 0){
               getCouponNormalByStoreId = getCouponNormalByStoreId[0];
               if(getCouponNormalByStoreId.sAmount !== undefined && getCouponNormalByStoreId.sAmount !== null){
                  tempCoupon =  Math.floor(parseFloat(getCouponNormalByStoreId.sAmount));
               }
            }

            let getCouponCodeByOrderId = await Order.getCouponCodeByOrderId(parseInt(s.order_id));
            if(getCouponCodeByOrderId !== undefined && getCouponCodeByOrderId !== null && getCouponCodeByOrderId.length > 0){
               getCouponCodeByOrderId = getCouponCodeByOrderId[0];
               if(getCouponCodeByOrderId.sAmount !== undefined && getCouponCodeByOrderId.sAmount !== null){
                  tempCouponCode =  Math.floor(parseFloat(getCouponCodeByOrderId.sAmount));
               }
            }

            let getOrderPointByOrderId = await Order.getOrderPointByOrderId(parseInt(s.order_id));
            if(getOrderPointByOrderId !== undefined && getOrderPointByOrderId !== null && getOrderPointByOrderId.length > 0){
               getOrderPointByOrderId = getOrderPointByOrderId[0];
               if(getOrderPointByOrderId.sAmount !== undefined && getOrderPointByOrderId.sAmount !== null){
                  tempOrderPoint =  Math.floor(parseFloat(getOrderPointByOrderId.sAmount));
               }
            }

            let partnerCouponByStoreId = await Order.getPartnerCouponByOrderId(tempFromDate,tempToDate,parseInt(s.order_id),parseInt(s.store_id));
            if(partnerCouponByStoreId !== undefined && partnerCouponByStoreId !== null && partnerCouponByStoreId.length > 0){
               partnerCouponByStoreId = partnerCouponByStoreId[0];
               if(partnerCouponByStoreId.sAmount !== undefined && partnerCouponByStoreId.sAmount !== null){
                  tempCouponP = Math.floor(parseFloat(partnerCouponByStoreId.sAmount));
               }
            }

            let getPartnerCouponPercentByStoreId = await Order.getPartnerCouponPercentByOrderId(tempFromDate,tempToDate,parseInt(s.order_id),parseInt(s.store_id));
            if(getPartnerCouponPercentByStoreId !== undefined && getPartnerCouponPercentByStoreId !== null && getPartnerCouponPercentByStoreId.length > 0){
               getPartnerCouponPercentByStoreId = getPartnerCouponPercentByStoreId[0];
               if(getPartnerCouponPercentByStoreId.sAmount !== undefined && getPartnerCouponPercentByStoreId.sAmount !== null){
                  tempOrderPointP = Math.floor(parseFloat(getPartnerCouponPercentByStoreId.sAmount));
               }
            }

            //todo
            let partnerStampCouponByStoreId = await Order.getPartnerStampCouponByOrderId(tempFromDate,tempToDate,parseInt(s.order_id),parseInt(s.store_id));
            if(partnerStampCouponByStoreId !== undefined && partnerStampCouponByStoreId !== null && partnerStampCouponByStoreId.length > 0){
               partnerStampCouponByStoreId = partnerStampCouponByStoreId[0];
               if(partnerStampCouponByStoreId.sAmount !== undefined && partnerStampCouponByStoreId.sAmount !== null){
                  tempCouponStamp = Math.floor(parseFloat(partnerStampCouponByStoreId.sAmount));
               }
            }

            tempReturn = tempPayment + tempCoupon + tempCouponCode + tempOrderPoint - tempFee;

            
            sReturn += tempReturn;
            totalPayment += tempTotal;
            payment += tempPayment;
            fee += tempFee;
            tCoupon += tempCoupon + tempCouponCode;
            tMoney += tempOrderPoint;
            pStamp += tempCouponStamp;
            pMoney += tempOrderPointP;
            pCoupon += tempCouponP;
            
            tempExcel.create = moment(s.created_at).format("YYYY-MM-DD HH:mm");;
            tempExcel.tempTotal = tempTotal;
            tempExcel.tempPayment = tempPayment;
            tempExcel.tempFee = tempFee;
            tempExcel.tempReturn = tempReturn;
            tempExcel.tempThrooTotal = tCoupon + tMoney;
            tempExcel.tempPartner = pMoney + pCoupon + pStamp;
            excelData.push(tempExcel);
         }
      }
      partnerTotal = pStamp + pMoney + pCoupon;
      throoTotal = tMoney + tCoupon;
      temp.date = sDate;
      temp.period = sPeriod;
      temp.return = sReturn;
      temp.throoTotal = tMoney + tCoupon;
      temp.tMoney = tMoney;
      temp.tCoupon = tCoupon;
      temp.totalPayment = totalPayment;
      temp.payment = payment;
      temp.fee = fee;
      temp.partnerTotal = partnerTotal;
      temp.pMoney = pMoney;
      temp.pCoupon = pCoupon;
      temp.pStamp = pStamp;

      temp.iList = await excelFirstSheet(sDate,totalPayment,throoTotal,partnerTotal,payment,fee,sReturn);
      temp.aList = await excelLastSheetV2(tempFromDate,tempToDate,excelData);
      oResult.push(temp);
   }
   
   return oResult;
   
}

const taxExcelSheet = async (quarterList,quarterFeeList) => {
   
   let oResult = [];
   let dataFirst = [
      [
         {value: "매출자료", style: {font: {sz: "24", bold: true}}},
      ],
      [
         {value: ""},
      ],
      [
         {value: "기간", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
         {value: "매출분류", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
         {value: "매출", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
         {value: "부가세", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
         {value: "합계", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
      ],
   ];

   
   for await (const sPay of quarterList) {
      let iterateList = [];
      let iDate = {
         value: sPay.date.toString(), 
         style: {font: {sz: "15"}}
      };
      let iType = {
         value: "기타매출", 
         style: {font: {sz: "15"}}
      };
      let iPay = {
         value: sPay.pay.toString(), 
         style: {font: {sz: "15"}}
      };
      let iFee = {
         value: sPay.fee.toString(), 
         style: {font: {sz: "15"}}
      };
      let iTotal = {
         value: sPay.total.toString(), 
         style: {font: {sz: "15"}}
      };
      iterateList.push(iDate);
      iterateList.push(iType);
      iterateList.push(iPay);
      iterateList.push(iFee);
      iterateList.push(iTotal);
      dataFirst.push(iterateList);
   }
   
   let tempValue = [{value: ""}];
   let summaryValue = [{value: "매입자료", style: {font: {sz: "24", bold: true}}}];
   let tempList = [
      {value: "기간", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
      {value: "매입분류", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
      {value: "건수", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
      {value: "공급가액", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
      {value: "부가세", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
      {value: "합계", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
   ];
   
   dataFirst.push(tempValue);
   dataFirst.push(tempValue);
   dataFirst.push(tempValue);
   dataFirst.push(summaryValue);
   dataFirst.push(tempList);

   for await (const sFee of quarterFeeList) {
      let iterateList = [];
      let iDate = {
         value: sFee.date.toString(), 
         style: {font: {sz: "15"}}
      };
      let iType = {
         value: "결제수수료", 
         style: {font: {sz: "15"}}
      };
      let iCount = {
         value: "1건", 
         style: {font: {sz: "15"}}
      };
      let iPay = {
         value: sFee.pay.toString(), 
         style: {font: {sz: "15"}}
      };
      let iFee = {
         value: sFee.fee.toString(), 
         style: {font: {sz: "15"}}
      };
      let iTotal = {
         value: sFee.total.toString(), 
         style: {font: {sz: "15"}}
      };
      iterateList.push(iDate);
      iterateList.push(iType);
      iterateList.push(iCount);
      iterateList.push(iPay);
      iterateList.push(iFee);
      iterateList.push(iTotal);
      dataFirst.push(iterateList);
   }

   let tempContextFirst = [{value: "매출은 고객이 결제한 금액 + 스루에서 부담하는 할인 금액을 포함합니다.", style: {font: {sz: "12"}}}];
   let tempContextSecond = [{value: "결제수수료는 고객이 결제한 카드매출액의 결제수수료입니다.", style: {font: {sz: "12"}}}];
   let tempContextThird = [{value: "전자계산서로 발행된 내역이며 따로 신고하실 필요는 없습니다.", style: {font: {sz: "12"}}},];

   dataFirst.push(tempValue);
   dataFirst.push(tempValue);
   dataFirst.push(tempContextFirst);
   dataFirst.push(tempContextSecond);
   dataFirst.push(tempContextThird);
   

   oResult = [
      {
         columns: [
            {title: "", width: {wch: 40}},//pixels width 
            {title: "", width: {wch: 40}},//char width 
            {title: "", width: {wch: 40}},
            {title: "", width: {wch: 40}},
            {title: "", width: {wch: 40}},
            {title: "", width: {wch: 40}},
         ],
         data: dataFirst
      }
   ];
   return oResult;
}

const excelFirstSheet = async (fromDate,totalAmount,discountPay,partnerTotal,payment,fee,sReturn) => {
   
   let oResult = [];
   let dataFirst = [
      [
         {value: fromDate + " 정산 명세서", style: {font: {sz: "20", bold: true}}},
      ],
      [
         {value: ""},
      ],
      [
         {value: "구분", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
         {value: "금액", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
      ],
   ];
   let tempValue = [{value: ""}];
   let tempContextFirst = [{value: "할인지원금은 스루에서 부담하는 금액이며 정산시 파트너에게 지급됩니다. (할인지원금만큼 파트너사의 매출로 세금 계산서가 발행되오니 매출신고시 누락하지 않도록 주의바랍니다.)", style: {font: {sz: "12"}}}];
   let tempContextSecond = [{value: "혜택할인금은 파트너 자체적으로 고객님께 들이는 혜택(할인)금액으로 입금받을 금액에 포함되지 않으며 PG결제수수료도 부과되지 않습니다.", style: {font: {sz: "12"}}}];
   let tempContextThird = [{value: "스루의 결제 수수료는 카드수수료 3%(부가세별도)를 의미합니다", style: {font: {sz: "12"}}},];
   let tempContextLast = [{value: "입금받을금액은 카드결제 + 할인지원금 - 결제수수료를 의미하며 입금 예정일은 익월 10일입니다", style: {font: {sz: "12"}}}];
   let summaryValue = [{value: "정산 요약", style: {font: {sz: "24", bold: true}}}];
   let tempList = [
      {value: "주문금액(할인전 총주문액)", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
      {value: "할인지원금(스루 지원)", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
      {value: "혜택할인금(매장 자체 할인)", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
      {value: "고객 결제금액", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
      {value: "PG결제수수료(3%,부가세별도)", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
      {value: "입금받을금액", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
   ];
   let tempDataList = [
      {value: totalAmount.toString(), style: {font: {sz: "15"}}},
      {value: discountPay.toString(), style: {font: {sz: "15"}}},
      {value: partnerTotal.toString(), style: {font: {sz: "15"}}},
      {value: payment.toString(), style: {font: {sz: "15"}}},
      {value: fee.toString(), style: {font: {sz: "15"}}},
      {value: sReturn.toString(), style: {font: {sz: "15"}}},
   ];
   let totalPay = [
      {value: "총 거래금액", style: {font: {sz: "15"}}},
      {value: totalAmount, style: {font: {sz: "15"}}},
   ];
   let returnPay = [
      {value: "입금받을 금액", style: {font: {sz: "15"}}},
      {value: sReturn, style: {font: {sz: "15"}}},
   ];
   dataFirst.push(totalPay);
   dataFirst.push(returnPay);
   dataFirst.push(tempValue);
   dataFirst.push(tempValue);
   dataFirst.push(tempValue);
   dataFirst.push(summaryValue);
   dataFirst.push(tempList);
   dataFirst.push(tempDataList);
   dataFirst.push(tempValue);
   dataFirst.push(tempValue);
   dataFirst.push(tempContextFirst);
   dataFirst.push(tempContextSecond);
   dataFirst.push(tempContextThird);
   dataFirst.push(tempContextLast);
   dataFirst.push(tempValue);
   dataFirst.push(tempValue);
   dataFirst.push(tempValue);
   dataFirst.push(tempValue);

   oResult = [
      {
         columns: [
            {title: "", width: {wch: 40}},//pixels width 
            {title: "", width: {wch: 40}},//char width 
            {title: "", width: {wch: 40}},
            {title: "", width: {wch: 40}},
            {title: "", width: {wch: 40}},
            {title: "", width: {wch: 40}},
         ],
         data: dataFirst
      }
   ];
   return oResult;
}

const excelLastSheet = async (fromWeek,toWeek,getMonthlyData) => {
   let oResult = [];
   let dataLast = [
      [
         {value: "정산 상세내역", style: {font: {sz: "20", bold: true}}},
         {value: `기간 : ${fromWeek} ~ ${toWeek}`, style: {font: {sz: "15"}}},
      ],
      [
         {value: ""},
      ],
      [
         {value: "기간", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
         {value: "주문금액", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
         {value: "할인지원금", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
         {value: "혜택지원금", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
         {value: "카드결제", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
         {value: "결제수수료", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
         {value: "입금받을금액", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
      ],
   ];

   for await (const iCount of getMonthlyData) {
      let sList = [];
      let tempTcoupon = 0;
      let tempTMoney = 0;
      let tempDate = {};
      let tempTotal = {};
      let tempThroo = {};
      let tempPartner = {};
      let tempPay = {};
      let tempPayFee = {};
      let tempPayReturn = {};
   
      tempDate.value = moment(iCount.created_at).format("YYYY-MM-DD HH:mm");
      tempDate.style = { font: { sz: "15" } };
      tempTotal.value = Math.floor(parseInt(iCount.total_amount_org));
      tempTotal.style = { font: { sz: "15" } };
      tempPay.value = Math.floor(parseInt(iCount.total_amount_incl));
      tempPay.style = { font: { sz: "15" } };
      tempPayFee.value = Math.floor(parseFloat(iCount.total_amount_incl) * 0.033);
      tempPayFee.style = { font: { sz: "15" } };
      tempPayReturn.value = Math.floor(parseInt(iCount.total_amount_org) - Math.floor(parseFloat(iCount.total_amount_incl) * 0.033));
      tempPayReturn.style = { font: { sz: "15" } };
   
      if(iCount.coupon_partner_amount !== undefined && iCount.coupon_partner_amount !== null){
         tempPartner.value = Math.floor(parseInt(iCount.coupon_partner_amount));
      } else {
         tempPartner.value = 0;
      }
      tempPartner.style = { font: { sz: "15" } };
   
      if(iCount.points_amount !== undefined && iCount.points_amount !== null){
         tempTMoney = Math.floor(parseInt(iCount.points_amount));
      }
      if(iCount.coupon_amount !== undefined && iCount.coupon_amount !== null){
         tempTcoupon = Math.floor(parseInt(iCount.coupon_amount));
      }
      tempThroo.value = tempTMoney + tempTcoupon;
      tempThroo.style = { font: { sz: "15" } };
   
      sList.push(tempDate);
      sList.push(tempTotal);
      sList.push(tempThroo);
      sList.push(tempPartner);
      sList.push(tempPay);
      sList.push(tempPayFee);
      sList.push(tempPayReturn);

      dataLast.push(sList);
   }

   oResult = [
      {
         columns: [
            {title: "", width: {wch: 40}},//pixels width 
            {title: "", width: {wch: 40}},//char width 
            {title: "", width: {wch: 40}},
            {title: "", width: {wch: 40}},
            {title: "", width: {wch: 40}},
            {title: "", width: {wch: 40}},
            {title: "", width: {wch: 40}},
         ], 
         data: dataLast
      }
   ];
   return oResult;
}

const excelLastSheetV2 = async (fromWeek,toWeek,getMonthlyData) => {
   let oResult = [];
   let dataLast = [
      [
         {value: "정산 상세내역", style: {font: {sz: "20", bold: true}}},
         {value: `기간 : ${fromWeek} ~ ${toWeek}`, style: {font: {sz: "15"}}},
      ],
      [
         {value: ""},
      ],
      [
         {value: "기간", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
         {value: "주문금액", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
         {value: "할인지원금", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
         {value: "혜택지원금", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
         {value: "카드결제", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
         {value: "결제수수료", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
         {value: "입금받을금액", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
      ],
   ];

   for await (const iCount of getMonthlyData) {
      let sList = [];
      let tempDate = {};
      let tempTotal = {};
      let tempThroo = {};
      let tempPartner = {};
      let tempPay = {};
      let tempPayFee = {};
      let tempPayReturn = {};
   
      tempDate.value = iCount.create;
      tempDate.style = { font: { sz: "15" } };
      tempTotal.value = iCount.tempTotal;
      tempTotal.style = { font: { sz: "15" } };
      tempPay.value = iCount.tempPayment;
      tempPay.style = { font: { sz: "15" } };
      tempPayFee.value = iCount.tempFee;
      tempPayFee.style = { font: { sz: "15" } };
      tempPayReturn.value = iCount.tempReturn
      tempPayReturn.style = { font: { sz: "15" } };
      tempPartner.value = iCount.tempThrooTotal;
      tempPartner.style = { font: { sz: "15" } };
      tempThroo.value = iCount.tempPartner;
      tempThroo.style = { font: { sz: "15" } };
   
      sList.push(tempDate);
      sList.push(tempTotal);
      sList.push(tempThroo);
      sList.push(tempPartner);
      sList.push(tempPay);
      sList.push(tempPayFee);
      sList.push(tempPayReturn);

      dataLast.push(sList);
   }

   oResult = [
      {
         columns: [
            {title: "", width: {wch: 40}},//pixels width 
            {title: "", width: {wch: 40}},//char width 
            {title: "", width: {wch: 40}},
            {title: "", width: {wch: 40}},
            {title: "", width: {wch: 40}},
            {title: "", width: {wch: 40}},
            {title: "", width: {wch: 40}},
         ], 
         data: dataLast
      }
   ];
   return oResult;
}

//to do - delete
const adjustmentPayList = async (sType,storeId,fromMonth,toMonth,fromDate,dateTwo) => {
   let oResult = {};
   let list = {};
   let isComplete = true;

   try {
      const checkReturnPay = await Order.checkReturnPay(storeId,fromMonth,toMonth);
      if(checkReturnPay.length > 0){
         isComplete = true;
      }
      const queryResult = await Order.adjustmentPayment(storeId,fromMonth,toMonth);
      if(queryResult.length > 0){
         let sTotalAmount = 0; 
         let sAmount = 0; 
         let sPoint = 0; 
         let sCoupon = 0; 
         for await (let iCount of queryResult) {
            let tempThroo = {};
            let sList = [];
   
            sTotalAmount += parseInt(iCount.total_amount_org);
            sAmount += parseInt(iCount.total_amount_excl);
            const discountResult = await Order.adjustmentDiscount(iCount.order_id);
            if(discountResult.length > 0){
               let tempPay = 0;
               for await (let qData of discountResult) {
                  if(qData.code.toString() === "COUPON"){
                     tempPay += parseInt(qData.amount)
                     sCoupon += parseInt(qData.amount);
                  } else {
                     tempPay += parseInt(qData.amount)
                     sPoint += parseInt(qData.amount);
                  }
               }
               tempThroo.value = tempPay;
               tempThroo.style = { font: { sz: "15" } };
            } else {
               tempThroo.value = 0;
               tempThroo.style = { font: { sz: "15" } };
            }
   
            if(sType === "excel"){
               let tempDate = {};
               let tempTotal = {};
               let tempPay = {};
               let tempPayFee = {};
               let tempPayReturn = {};
               let tempPartner = {value: "0", style: {font: {sz: "15"}}};
   
               tempDate.value = moment(iCount.created_at).format("YYYY-MM-DD HH:mm");
               tempDate.style = { font: { sz: "15" } };
               tempTotal.value = Math.floor(parseInt(iCount.total_amount_org));
               tempTotal.style = { font: { sz: "15" } };
               tempPay.value = Math.floor(parseInt(iCount.total_amount_excl));
               tempPay.style = { font: { sz: "15" } };
               tempPayFee.value = Math.floor(parseFloat(iCount.total_amount_excl) * 0.033);
               tempPayFee.style = { font: { sz: "15" } };
               tempPayReturn.value = Math.floor(parseInt(iCount.total_amount_org) - Math.floor(parseFloat(iCount.total_amount_excl) * 0.033));
               tempPayReturn.style = { font: { sz: "15" } };
   
               sList.push(tempDate);
               sList.push(tempTotal);
               sList.push(tempThroo);
               sList.push(tempPartner);
               sList.push(tempPay);
               sList.push(tempPayFee);
               sList.push(tempPayReturn);
               dateTwo.push(sList);
            }
         }
         
         list.date = fromDate;
         list.complete = isComplete;
         list.pointP = 0;
         list.couponP = 0;
         list.stemp = 0;
         list.totalAmount = await convertToKRW(Math.floor(parseFloat(sTotalAmount)), true);
         list.payment = await convertToKRW(Math.floor(parseFloat(sAmount)), true);
         list.fee = await convertToKRW(Math.floor(parseFloat(sAmount) * 0.033), true);
         list.point = await convertToKRW(Math.floor(parseFloat(sPoint)), true);
         list.coupon = await convertToKRW(Math.floor(parseFloat(sCoupon)), true);
         list.return = await convertToKRW(Math.floor(parseFloat(sTotalAmount) - Math.floor(parseFloat(sAmount) * 0.033))   , true);
   
         oResult.result = "0000";
         oResult.amount = await convertToKRW(Math.floor(parseFloat(sTotalAmount) - (parseFloat(sAmount) * 0.033)), true) ;
         oResult.list = await list;
         oResult.listTwo = dateTwo;
         oResult.discountPay = await convertToKRW(Math.floor(parseFloat(sPoint)) + Math.floor(parseFloat(sCoupon)), true);
   
      } else {
         oResult.result = "1111";
      }
   } catch (error) {
      console.log("adjustment error!!!!!!!!!!!!",error)
      oResult.result = "1111";
   }

   return oResult;
}
const getQuarterList = async (dateValue,quarter1,quarter2,quarter3,quarter4) => {
   let quarterList = [];
   let fromDate = null;

   for await (const letter of asyncGenerator(12)) {
      let temp = {};
      if(parseInt(letter) === 0 && quarter1){
         fromDate =  dateValue + "-01";
         temp.startDate = moment(fromDate).startOf('month').format('YYYY-MM-DD');
         temp.endDate = moment(fromDate).endOf('month').format('YYYY-MM-DD');
      } else if (parseInt(letter) === 1 && quarter1) {
         fromDate =  dateValue + "-02";
         temp.startDate = moment(fromDate).startOf('month').format('YYYY-MM-DD');
         temp.endDate = moment(fromDate).endOf('month').format('YYYY-MM-DD');
      } else if (parseInt(letter) === 2 && quarter1) {
         fromDate =  dateValue + "-03";
         temp.startDate = moment(fromDate).startOf('month').format('YYYY-MM-DD');
         temp.endDate = moment(fromDate).endOf('month').format('YYYY-MM-DD');
      } else if (parseInt(letter) === 3 && quarter2) {
         fromDate =  dateValue + "-04";
         temp.startDate = moment(fromDate).startOf('month').format('YYYY-MM-DD');
         temp.endDate = moment(fromDate).endOf('month').format('YYYY-MM-DD');
      } else if (parseInt(letter) === 4 && quarter2) {
         fromDate =  dateValue + "-05";
         temp.startDate = moment(fromDate).startOf('month').format('YYYY-MM-DD');
         temp.endDate = moment(fromDate).endOf('month').format('YYYY-MM-DD');
      } else if (parseInt(letter) === 5 && quarter2) {
         fromDate =  dateValue + "-06";
         temp.startDate = moment(fromDate).startOf('month').format('YYYY-MM-DD');
         temp.endDate = moment(fromDate).endOf('month').format('YYYY-MM-DD');
      } else if (parseInt(letter) === 6 && quarter3) {
         fromDate =  dateValue + "-07";
         temp.startDate = moment(fromDate).startOf('month').format('YYYY-MM-DD');
         temp.endDate = moment(fromDate).endOf('month').format('YYYY-MM-DD');
      } else if (parseInt(letter) === 7 && quarter3) {
         fromDate =  dateValue + "-08";
         temp.startDate = moment(fromDate).startOf('month').format('YYYY-MM-DD');
         temp.endDate = moment(fromDate).endOf('month').format('YYYY-MM-DD');
      } else if (parseInt(letter) === 8 && quarter3) {
         fromDate =  dateValue + "-09";
         temp.startDate = moment(fromDate).startOf('month').format('YYYY-MM-DD');
         temp.endDate = moment(fromDate).endOf('month').format('YYYY-MM-DD');
      } else if (parseInt(letter) === 9 && quarter4) {
         fromDate =  dateValue + "-10";
         temp.startDate = moment(fromDate).startOf('month').format('YYYY-MM-DD');
         temp.endDate = moment(fromDate).endOf('month').format('YYYY-MM-DD');
      } else if (parseInt(letter) === 10 && quarter4) {
         fromDate =  dateValue + "-11";
         temp.startDate = moment(fromDate).startOf('month').format('YYYY-MM-DD');
         temp.endDate = moment(fromDate).endOf('month').format('YYYY-MM-DD');
      } else if (parseInt(letter) === 11 && quarter4) {
         fromDate =  dateValue + "-12";
         temp.startDate = moment(fromDate).startOf('month').format('YYYY-MM-DD');
         temp.endDate = moment(fromDate).endOf('month').format('YYYY-MM-DD');
      }

      if(temp.startDate !== undefined && temp.endDate !== undefined){
         quarterList.push(temp);
      }
   }
   return quarterList;
}

const salesStoreCalculate = async (store_id,from_date,to_date) => {
   let iResult = {
      total: 0,
      order: 0,
      cancel: 0,
      totalPay: 0,
   };

   const result = await Order.getAllOrderList(parseInt(store_id), from_date, to_date);
   if(result.length > 0){
      for await (let i of result) {
         iResult.total += 1;
         if(i.cancelled_at !== null){
            iResult.cancel += 1;
         } else {
            if(i.amount !== undefined && i.amount !== null){
               iResult.totalPay = iResult.totalPay + Math.floor(parseFloat(i.amount));
            }
            
            iResult.order += 1;
         }
      }
   }
   iResult.totalPay = convertToKRW(iResult.totalPay, true);

   return iResult;
}
// The admin controller.
var PaymentController = {}

PaymentController.index = function (req, res) {
   res.status(200).json({ message: 'Welcome to the store area !' });
}

PaymentController.salesStoreCalculate = async (req, res) => {
   const fromDate = req.body.fromDate;
   const toDate = req.body.toDate;
   const sList = req.body.sList;

   let iResult = [];

   try {
      for await (const iterator of sList) {
         if(iterator.smsAuthenticate !== undefined && iterator.smsAuthenticate !== null && iterator.smsAuthenticate){
            const result = await salesStoreCalculate(iterator.key,fromDate,toDate);
            let temp = {};
            temp.storeNm = iterator.storeName;
            temp.total = result.total;
            temp.order = result.order;
            temp.cancel = result.cancel;
            temp.totalPay = result.totalPay;

            iResult.push(temp);
         }
      }
   } catch (error) {
      console.log("PaymentController.salesStoreCalculate fail !=== > ", error);
   }

   res.status(200).json(iResult);
}


PaymentController.taxCalculateV2 = async (req, res) => {
   const iUserId = req.user.user_id;
   const store_id = req.body.storeId;
   const dateValue = req.body.dateValue;
   const quarter1 = req.body.q1;
   const quarter2 = req.body.q2;
   const quarter3 = req.body.q3;
   const quarter4 = req.body.q4;
   
   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
   } else {
      let iResult = {
         sList: [],
         iList: [],
         eList: [],
      };

      try {
         const quarterList = await getQuarterList(dateValue,quarter1,quarter2,quarter3,quarter4);
         if(quarterList.length > 0){
            for await (const iterator of quarterList) {
               let iTempList = {};
               let sTempList = {};
               const result = await calculatePayV2(iterator.startDate,iterator.endDate,store_id);
               if(result.count !== undefined && result.count !== null && parseInt(result.count) > 0){
                  iTempList.date = iterator.startDate + "~" + iterator.endDate;
                  iTempList.pay = convertToKRW(result.payAmount, true);
                  iTempList.fee = convertToKRW(result.payFee, true);
                  iTempList.total = convertToKRW(result.payTotal, true);

                  sTempList.date = iterator.startDate + "~" + iterator.endDate;
                  sTempList.count = result.count;
                  sTempList.pay = convertToKRW(result.taxAmount, true);
                  sTempList.fee = convertToKRW(result.taxFee, true);
                  sTempList.total = convertToKRW(result.taxTotal, true);
                  iResult.iList.push(iTempList);
                  iResult.sList.push(sTempList);
               }
            }
            iResult.eList = await taxExcelSheet(iResult.iList,iResult.sList);
         }
      } catch (error) {
         console.log("PaymentController.taxCalculate fail !=== > ", error);
      }

      res.status(200).json(iResult);
   }

}

PaymentController.taxCalculate = async (req, res) => {
   const iUserId = req.user.user_id;
   const store_id = req.body.storeId;
   const dateValue = req.body.dateValue;
   const quarter1 = req.body.q1;
   const quarter2 = req.body.q2;
   const quarter3 = req.body.q3;
   const quarter4 = req.body.q4;
   
   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
   } else {
      let iResult = {
         sList: [],
         iList: [],
         eList: [],
      };

      try {
         const quarterList = await getQuarterList(dateValue,quarter1,quarter2,quarter3,quarter4);
         if(quarterList.length > 0){
            for await (const iterator of quarterList) {
               let iTempList = {};
               let sTempList = {};
               const result = await calculatePay(iterator.startDate,iterator.endDate,store_id);
               if(result.payTotal !== null && result.payAmount !== null && result.payFee !== null){
                  iTempList.date = iterator.startDate + "~" + iterator.endDate;
                  sTempList.date = iterator.startDate + "~" + iterator.endDate;
                  iTempList.pay = convertToKRW(result.payAmount, true);
                  sTempList.pay = convertToKRW(result.taxAmount, true);
                  iTempList.fee = convertToKRW(result.payFee, true);
                  sTempList.fee = convertToKRW(result.taxFee, true);
                  iTempList.total = convertToKRW(result.payTotal, true);
                  sTempList.total = convertToKRW(result.taxTotal, true);

                  iResult.iList.push(iTempList);
                  iResult.sList.push(sTempList);
               }
            }
            iResult.eList = await taxExcelSheet(iResult.iList,iResult.sList);
         }
      } catch (error) {
         console.log("PaymentController.taxCalculate fail !=== > ", error);
      }

      res.status(200).json(iResult);
   }

}

PaymentController.getColumnChart = async (req, res) => {
   const iUserId = req.user.user_id;
   
   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
   } else {
      const store_id = req.params.store_id;
      
      let iResult = [];

      try {
         const today = await moment().format("YYYY-MM");
         for await (let iterator of asyncGenerator(8)) {
            let tempData = {};
            let temp = 7;
            if(parseInt(iterator) === 1){
               temp = 6;
            } else if (parseInt(iterator) === 2){
               temp = 5;
            } else if (parseInt(iterator) === 3){
               temp = 4;
            } else if (parseInt(iterator) === 4){
               temp = 3;
            } else if (parseInt(iterator) === 5){
               temp = 2;
            } else if (parseInt(iterator) === 6){
               temp = 1;
            } else if (parseInt(iterator) === 7){
               temp = 0;
            }

            const thisMonth = moment(today).add(-temp,"month").format('YYYY-MM');
            const startDate = await moment(thisMonth).startOf('month').format('YYYY-MM-DD');
            const endDate = await moment(thisMonth).endOf('month').format('YYYY-MM-DD');
            let paymentColumnChartData = await Order.paymentColumnChartData(store_id,startDate,endDate);
            if(paymentColumnChartData !== undefined && paymentColumnChartData !== null){
               console.log("paymentColumnChartData[0]",paymentColumnChartData[0]);
               console.log("paymentColumnChartData[0]",paymentColumnChartData[0].sNm);
               tempData.date = thisMonth;
               tempData.value = paymentColumnChartData[0].sNm;
               iResult.push(tempData);
            }
         }

      } catch (error) {
         console.log("PaymentController.getListV2 fail !=== > ", error);
      }
      
      res.status(200).json(iResult);
   }

}

PaymentController.getLineChart = async (req, res) => {
   const iUserId = req.user.user_id;
   
   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
   } else {
      const store_id = req.body.storeId;
      const from_date = req.body.fromDate;
      const to_date = req.body.toDate;
      
      let iResult = [];

      try {
         const dashboardChartData = await Order.dashboardChartData(store_id,from_date,to_date);
         if(dashboardChartData.length > 0){
            for await (let iterator of dashboardChartData) {
               let temp = {};
               temp.date = moment(iterator.created_at).format("YYYY-MM-DD");
               temp.value = Math.floor(parseFloat(iterator.total_amount_org));
               iResult.push(temp);
            }
         }         

      } catch (error) {
         console.log("PaymentController.getListV2 fail !=== > ", error);
      }
      
      res.status(200).json(iResult);
   }

}

PaymentController.AdjustmentPaymentExcel = async (req, res) => {
   const storeId = req.body.storeId;
   const fromDate = req.body.fromDate;
   const iUserId = req.user.user_id;

   let oResult = {};

   if (iUserId == undefined || iUserId == 0) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
   } else {
      const fromMonth = moment(fromDate).startOf('month').format('YYYY-MM-DD');
      const toMonth = moment(fromDate).endOf('month').format('YYYY-MM-DD');
      let dataFirst = [
         [
            {value: fromDate + " 정산 명세서", style: {font: {sz: "20", bold: true}}},
         ],
         [
            {value: ""},
         ],
         [
            {value: "구분", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
            {value: "금액", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
         ],
      ];
      let dataLast = [
         [
            {value: "정산 상세내역", style: {font: {sz: "20", bold: true}}},
            {value: `기간 : ${fromMonth} ~ ${toMonth}`, style: {font: {sz: "15"}}},
         ],
         [
            {value: ""},
         ],
         [
            {value: "기간", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
            {value: "주문금액", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
            {value: "할인지원금", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
            {value: "혜택지원금", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
            {value: "카드결제", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
            {value: "결제수수료", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
            {value: "입금받을금액", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
         ],
      ];

      const payList = await adjustmentPayList("excel",storeId,fromMonth,toMonth,fromDate,dataLast);
      if(payList.result === "0000"){
         let tempValue = [{value: ""}];
         let tempContextFirst = [{value: "할인지원금은 스루에서 부담하는 금액이며 정산시 파트너에게 지급됩니다. (할인지원금만큼 파트너사의 매출로 세금 계산서가 발행되오니 매출신고시 누락하지 않도록 주의바랍니다.)", style: {font: {sz: "12"}}}];
         let tempContextSecond = [{value: "혜택할인금은 파트너 자체적으로 고객님께 들이는 혜택(할인)금액으로 입금받을 금액에 포함되지 않으며 PG결제수수료도 부과되지 않습니다.", style: {font: {sz: "12"}}}];
         let tempContextThird = [{value: "스루의 결제 수수료는 카드수수료 3%(부가세별도)를 의미합니다", style: {font: {sz: "12"}}},];
         let tempContextLast = [{value: "입금받을금액은 카드결제 + 할인지원금 - 결제수수료를 의미하며 입금 예정일은 익월 10일입니다", style: {font: {sz: "12"}}}];
         let summaryValue = [{value: "정산 요약", style: {font: {sz: "24", bold: true}}}];
         let tempList = [
            {value: "주문금액(할인점 총주문액)", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
            {value: "할인지원금(스루 지원)", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
            {value: "혜택할인금(매장 자체 할인)", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
            {value: "고객 결제금액", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
            {value: "PG결제수수료(3%,부가세별도)", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
            {value: "입금받을금액", style: {font: {sz: "15"},fill: {patternType: "solid", fgColor: {rgb: "FFCCEEFF"}}}},
         ];
         let tempDataList = [
            {value: payList.list.totalAmount.toString(), style: {font: {sz: "15"}}},
            {value: payList.discountPay.toString(), style: {font: {sz: "15"}}},
            {value: "₩0", style: {font: {sz: "15"}}},
            {value: payList.list.payment.toString(), style: {font: {sz: "15"}}},
            {value: payList.list.fee.toString(), style: {font: {sz: "15"}}},
            {value: payList.list.return.toString(), style: {font: {sz: "15"}}},
         ];
         let totalPay = [
            {value: "총 거래금액", style: {font: {sz: "15"}}},
            {value: payList.list.totalAmount, style: {font: {sz: "15"}}},
         ];
         let returnPay = [
            {value: "입금받을 금액", style: {font: {sz: "15"}}},
            {value: payList.list.return, style: {font: {sz: "15"}}},
         ];
         dataFirst.push(totalPay);
         dataFirst.push(returnPay);
         dataFirst.push(tempValue);
         dataFirst.push(tempValue);
         dataFirst.push(tempValue);
         dataFirst.push(summaryValue);
         dataFirst.push(tempList);
         dataFirst.push(tempDataList);
         dataFirst.push(tempValue);
         dataFirst.push(tempValue);
         dataFirst.push(tempContextFirst);
         dataFirst.push(tempContextSecond);
         dataFirst.push(tempContextThird);
         dataFirst.push(tempContextLast);
         dataFirst.push(tempValue);
         dataFirst.push(tempValue);
         dataFirst.push(tempValue);
         dataFirst.push(tempValue);
         
         oResult.resultCd = "0000";
         oResult.listOne = dataFirst;
         oResult.listTwo = payList.listTwo;
      } else {
         oResult.resultCd = "1111";
      }
      res.status(200).json(oResult);
   }
}

PaymentController.salesStoreAdjustmentPayment = async (req, res) => {
   const storeId = req.body.storeId;
   const fromDate = req.body.fromDate;
   const findDay = moment().day();
   
   let fromWeek = moment().startOf('week').add(1,"days").format('YYYY-MM-DD');
   let toWeek = moment().endOf('week').add(1,"days").format('YYYY-MM-DD');
   if(parseInt(findDay) == 0){
      fromWeek = moment().add(-6,"days").format('YYYY-MM-DD');
      toWeek = moment().format('YYYY-MM-DD');
   }
   const fromMonth = moment(fromDate).startOf('month').format('YYYY-MM-DD');
   const toMonth = moment(fromDate).endOf('month').format('YYYY-MM-DD');
   
   let amount = 0;
   let result = [];
   let period = fromWeek + "~" + toWeek;
   
   try {
      const preAmount = await Order.getMonthlySettlementByStoreId(fromWeek,toWeek,storeId);
      if(preAmount.length > 0){
         let tempDiscount = 0;
         let tempPayment = 0;
         let tempTotal = 0;
         let tempFee = 0;
         for await (const i of preAmount) {
            if(i.total_amount_org !== undefined && i.total_amount_org !== null){
               tempTotal += Math.floor(parseFloat(i.total_amount_org));
            }
            if(i.total_amount_incl !== undefined && i.total_amount_incl !== null){
               tempPayment += Math.floor(parseFloat(i.total_amount_incl));
            }
            if(i.coupon_partner_amount !== undefined && i.coupon_partner_amount !== null){
               tempDiscount += Math.floor(parseFloat(i.coupon_partner_amount));
            }
         }
         tempFee = Math.floor(parseFloat(tempPayment) * 0.033);
         amount = convertToKRW(tempTotal - (tempFee + tempDiscount), true);
      }
      const getData = await Order.paymentDataByStoreInvoice(fromMonth,toMonth,storeId);
      if(getData.length > 0){
         result = await adjustmentCalculate(getData,storeId);
      }
   } catch (error) {
      console.log("PaymentController.adjustmentPaymentV2 fail !! =====>>>>", error);
   }

   res.status(200).json({amount,result,period});
}

PaymentController.adjustmentPaymentV2 = async (req, res) => {
   const iUserId = req.user.user_id;
   const storeId = req.body.storeId;
   const fromDate = req.body.fromDate;
   const findDay = moment().day();
   
   if (iUserId == undefined || iUserId == 0) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
   } else {
      let fromWeek = moment().startOf('week').add(1,"days").format('YYYY-MM-DD');
      let toWeek = moment().endOf('week').add(1,"days").format('YYYY-MM-DD');
      if(parseInt(findDay) == 0){
         fromWeek = moment().add(-6,"days").format('YYYY-MM-DD');
         toWeek = moment().format('YYYY-MM-DD');
      }
      const fromMonth = moment(fromDate).startOf('month').format('YYYY-MM-DD');
      const toMonth = moment(fromDate).endOf('month').format('YYYY-MM-DD');
      
      let amount = 0;
      let result = [];
      let period = fromWeek + "~" + toWeek;
      
      try {
         const preAmount = await Order.getMonthlySettlementByStoreId(fromWeek,toWeek,storeId);
         if(preAmount.length > 0){
            let tempDiscount = 0;
            let tempPayment = 0;
            let tempTotal = 0;
            let tempFee = 0;
            for await (const i of preAmount) {
               if(i.total_amount_org !== undefined && i.total_amount_org !== null){
                  tempTotal += Math.floor(parseFloat(i.total_amount_org));
               }
               if(i.total_amount_incl !== undefined && i.total_amount_incl !== null){
                  tempPayment += Math.floor(parseFloat(i.total_amount_incl));
               }
               if(i.coupon_partner_amount !== undefined && i.coupon_partner_amount !== null){
                  tempDiscount += Math.floor(parseFloat(i.coupon_partner_amount));
               }
            }
            tempFee = Math.floor(parseFloat(tempPayment) * 0.033);
            amount = convertToKRW(tempTotal - (tempFee + tempDiscount), true);
         }
         const getData = await Order.paymentDataByStoreInvoice(fromMonth,toMonth,storeId);
         if(getData.length > 0){
            result = await adjustmentCalculate(getData,storeId);
         }
      } catch (error) {
         console.log("PaymentController.adjustmentPaymentV2 fail !! =====>>>>", error);
      }

      res.status(200).json({amount,result,period});
   }
}

PaymentController.adjustmentPaymentV3 = async (req, res) => {
   const iUserId = req.user.user_id;
   const storeId = req.body.storeId;
   const fromDate = req.body.fromDate;
   const findDay = moment().day();
   
   if (iUserId == undefined || iUserId == 0) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
   } else {
      let fromWeek = moment().startOf('week').add(1,"days").format('YYYY-MM-DD');
      let toWeek = moment().endOf('week').add(1,"days").format('YYYY-MM-DD');
      if(parseInt(findDay) == 0){
         fromWeek = moment().add(-6,"days").format('YYYY-MM-DD');
         toWeek = moment().format('YYYY-MM-DD');
      }
      const fromMonth = moment(fromDate).startOf('month').format('YYYY-MM-DD');
      const toMonth = moment(fromDate).endOf('month').format('YYYY-MM-DD');
      
      let amount = 0;
      let sPay = 0;
      let result = [];
      let period = fromWeek + "~" + toWeek;
      
      try {
         const preAmount = await Order.getMonthlySettlementByStoreIdV2(fromWeek,toWeek,storeId);
         if(preAmount.length > 0){
            for await (const i of preAmount) {
               let tempCoupon = 0;
               let tempCouponCode = 0;
               let tempOrderPoint = 0;
               let tempPayment = 0;
               let tempTotal = 0;
               let tempFee = 0;
               
               if(i.total_amount_incl !== undefined && i.total_amount_incl !== null){
                  tempPayment = Math.floor(parseFloat(i.total_amount_incl));
                  tempFee = Math.floor(parseFloat(tempPayment) * 0.033);
               }

               let getCouponNormalByStoreId = await Order.getCouponNormalByOrderId(parseInt(i.order_id));
               if(getCouponNormalByStoreId !== undefined && getCouponNormalByStoreId !== null && getCouponNormalByStoreId.length > 0){
                  getCouponNormalByStoreId = getCouponNormalByStoreId[0];
                  if(getCouponNormalByStoreId.sAmount !== undefined && getCouponNormalByStoreId.sAmount !== null){
                     tempCoupon =  Math.floor(parseFloat(getCouponNormalByStoreId.sAmount));
                  }
               }

               let getCouponCodeByOrderId = await Order.getCouponCodeByOrderId(parseInt(i.order_id));
               if(getCouponCodeByOrderId !== undefined && getCouponCodeByOrderId !== null && getCouponCodeByOrderId.length > 0){
                  getCouponCodeByOrderId = getCouponCodeByOrderId[0];
                  if(getCouponCodeByOrderId.sAmount !== undefined && getCouponCodeByOrderId.sAmount !== null){
                     tempCouponCode =  Math.floor(parseFloat(getCouponCodeByOrderId.sAmount));
                  }
               }

               let getOrderPointByOrderId = await Order.getOrderPointByOrderId(parseInt(i.order_id));
               if(getOrderPointByOrderId !== undefined && getOrderPointByOrderId !== null && getOrderPointByOrderId.length > 0){
                  getOrderPointByOrderId = getOrderPointByOrderId[0];
                  if(getOrderPointByOrderId.sAmount !== undefined && getOrderPointByOrderId.sAmount !== null){
                     tempOrderPoint =  Math.floor(parseFloat(getOrderPointByOrderId.sAmount));
                  }
               }

               tempTotal = tempPayment + tempCoupon + tempCouponCode + tempOrderPoint - tempFee;
               amount += tempTotal;
            }
            
         }
         const getData = await Order.paymentDataByStoreInvoice(fromMonth,toMonth,storeId);
         if(getData.length > 0){
            result = await adjustmentCalculateV2(getData,storeId);
         }
      } catch (error) {
         console.log("PaymentController.adjustmentPaymentV3 fail !! =====>>>>", error);
      }

      res.status(200).json({amount,result,period});
   }
}


PaymentController.adjustmentPayment = async (req, res) => {
   const storeId = req.body.storeId;
   const iValue = req.body.iValue;
   const fromDate = req.body.fromDate;
   const iUserId = req.user.user_id;

   let amount = 0;
   let result = [];
   let resultCd = "9999";
   
   if (iUserId == undefined || iUserId == 0) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
   } else {
      try {
         let fromMonth = "";
         let toMonth = "";
         
         if(iValue === "with"){
            fromMonth = moment().startOf('month').format('YYYY-MM-DD');
            toMonth = moment().endOf('month').format('YYYY-MM-DD');
            const payList = await adjustmentPayList("null",storeId,fromMonth,toMonth,fromDate,[]);

            resultCd = "0000";
            if(payList.result === "0000"){
               amount = payList.amount;
               result.push(payList.list);
            }
            
         } else {
            fromMonth = moment(fromDate).startOf('month').format('YYYY-MM-DD');
            toMonth = moment(fromDate).endOf('month').format('YYYY-MM-DD');
            const payList = await adjustmentPayList("null",storeId,fromMonth,toMonth,fromDate,[]);

            resultCd = "0000";
            if(payList.result === "0000"){
               result.push(payList.list);
            }
         }
      } catch (error) {
         console.log("error",error);
      }

      res.status(200).json({resultCd,amount,result});
   }

}

PaymentController.mainContentData = async (req, res) => {
   const storeId = req.params.store_id;
   const validFrom = moment().startOf('month').format('YYYY-MM-DD');
   const validTo = moment().endOf('month').format('YYYY-MM-DD');
   const toDate = moment().format("YYYY-MM-DD");
   const afterDate = moment().add(1, 'days').format("YYYY-MM-DD");

   let sChart = [];
   let dTotalAmount = '₩' + 0;
   let mTotalAmount = '₩' + 0;
   let totalCount = 0;
   let pauseCount = 0;

   try {
      const settlementOfSalesDay = await Store.settlementOfSalesDay(storeId, toDate, afterDate);
      const settlementOfSalesMonth = await Store.settlementOfSalesDay(storeId, validFrom, validTo);
   
      if (settlementOfSalesDay[0].price != null) {
         dTotalAmount = convertToKRW(parseFloat(settlementOfSalesDay[0].price), true);
      }
   
      if (settlementOfSalesMonth[0].price != null) {
         mTotalAmount = convertToKRW(parseFloat(settlementOfSalesMonth[0].price), true);
      }
      
      const result = await Store.getPieChartData(storeId, validFrom, validTo);
      if(result.length > 0){
         totalCount = parseInt(result[0].total);
         for await (let iCount of result) {
            let sTemp = {};
            sTemp.type = iCount.name;
            sTemp.value = parseInt(iCount.price);
            
            if(pauseCount < 5){
               sChart.push(sTemp);
               pauseCount = pauseCount + 1;
               totalCount = totalCount - parseInt(iCount.price);
            }
         }

         if(result.length > 5){
            let oData = { type: '나머지',value: totalCount};
            sChart.push(oData);
         }
      } else {
         let oData = [{ type: '데이터가 없습니다',value: 0}]
         sChart = oData;
      }
      
   } catch (error) {
      console.log("error", error);
   }

   res.status(200).json({ dTotalAmount, mTotalAmount, sChart, totalCount });
}

PaymentController.chartData = async (req, res) => {
   const storeId = req.params.store_id;
   const iUserId = req.user.user_id;

   let dChart = [];
   let iChart = [];

   if (iUserId == undefined || iUserId == 0) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
   } else {
      for await (let iCount of asyncGenerator(7)) {
         let tempList = {};
         let temp = {};
         let sPrice = 0;
         let sCount = 0;
         let sDay = moment().add(-iCount, 'M').format('MM');
         let toDate = await moment().add(-iCount, 'M');
         let preDate = await toDate.startOf("month").format("YYYY-MM-DD");
         let afterDate = await toDate.endOf("month").format("YYYY-MM-DD");
         
         const settlementOfSalesDay = await Store.doubleChartForDay(parseInt(storeId), preDate, afterDate);
         const amountChart = await Store.amountChart(parseInt(storeId), preDate, afterDate);

         if(settlementOfSalesDay[0].count != null){
            sCount = parseInt(settlementOfSalesDay[0].count);
         }
         if(amountChart[0].amount != null){
            sPrice = parseInt(amountChart[0].amount);
         }

         temp.type = sDay + "월";
         temp.amount = sPrice;

         tempList.type = sDay + "월";
         tempList.count = sCount;

         dChart.push(temp);
         iChart.push(tempList);
      }
      res.status(200).json({dChart,iChart});
   }
}

PaymentController.getSalesStorePaymentList = async (req, res) => {
   const iResult = {
      todayPay: 0,
      yesterdayPay: 0,
      list: [],
   };
   const store_id = req.body.storeId;
   const i_value = req.body.iValue;
   const from_date = req.body.fromDate;
   const to_date = req.body.toDate;
      
   try {
      let sCount = 0;
      let result = [];

      const weeklyDate = moment().format("YYYY-MM-DD");
      const weeklyRecentDate = moment().add(-1, 'days').format("YYYY-MM-DD");
      const dashboardChartData = await Order.dashboardChartData(store_id,weeklyRecentDate,weeklyDate);
      if(dashboardChartData.length > 0){
         let tempPayment =  0; 
         let tempYesterday =  0;
         for await (const iterator of dashboardChartData) {
            if(weeklyDate === moment(iterator.created_at).format("YYYY-MM-DD")){
               tempPayment += Math.floor(parseFloat(iterator.total_amount_org));
            } else if(weeklyRecentDate === moment(iterator.created_at).format("YYYY-MM-DD")){
               tempYesterday += Math.floor(parseFloat(iterator.total_amount_org));
            } 
         }
         iResult.todayPay = convertToKRW(tempPayment, true);
         iResult.yesterdayPay = convertToKRW(tempYesterday, true);
      }         

      if(i_value === "total"){
         result = await Order.getAllOrderList(parseInt(store_id), from_date, to_date);
      } else if (i_value === "cancel") {
         result = await Order.getCancelOrderList(parseInt(store_id), from_date, to_date);
      } else {
         result = await Order.getOrderList(parseInt(store_id), from_date, to_date);
      }
      if(result.length > 0){
         for await (let i of result) {
            let sPhone = i.phone_number;
            let sCarNm = i.carNm.split('/');
            let temp = {}

            temp.key = sCount.toString();
            temp.date = moment(i.createDate).format("MM-DD");
            temp.carNm = sCarNm[0];
            if(sPhone !== undefined && sPhone !== null){
               temp.phone = "***-****-" + sPhone.substring((sPhone.length),(sPhone.length - 4));
            } else {
               temp.phone = "탈퇴회원";
            }
            if(i.amount !== undefined && i.amount !== null){
               temp.totalPay = convertToKRW(Math.floor(parseFloat(i.amount)), true);
            } else {
               temp.totalPay = 0;
            }
            if(i.total_amount_incl !== undefined && i.total_amount_incl !== null){
               temp.payment = convertToKRW(Math.floor(parseFloat(i.total_amount_incl)), true);
            } else {
               temp.payment = 0;
            }
            if(i.discount_amount !== undefined && i.discount_amount !== null){
               temp.discount = convertToKRW(Math.floor(parseFloat(i.discount_amount)), true);
            } else {
               temp.discount = 0;
            }
            temp.id = i.orderId;

            if(i.cancelled_at !== null){
               temp.status = 'cancel';
            } else {
               temp.status = 'complete';
            }

            const getProductName = await Order.getProductName(i.orderId);
            if(getProductName.length > 1){
               temp.list = getProductName[0].name + "...";
            } else {
               temp.list = getProductName[0].name;
            }

            iResult.list.push(temp);
            sCount ++;
         }
      }
   } catch (error) {
      console.log("PaymentController.getListV2 fail !=== > ", error);
   }
   
   res.status(200).json(iResult);
}
PaymentController.getListV2 = async (req, res) => {
   const iUserId = req.user.user_id;
   
   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
   } else {
      const iResult = {
         todayPay: 0,
         yesterdayPay: 0,
         list: [],
      };
      const store_id = req.body.storeId;
      const i_value = req.body.iValue;
      const from_date = req.body.fromDate;
      const to_date = req.body.toDate;
      
      try {
         let sCount = 0;
         let result = [];

         const weeklyDate = moment().format("YYYY-MM-DD");
         const weeklyRecentDate = moment().add(-1, 'days').format("YYYY-MM-DD");
         const dashboardChartData = await Order.dashboardChartData(store_id,weeklyRecentDate,weeklyDate);
         if(dashboardChartData.length > 0){
            let tempPayment =  0; 
            let tempYesterday =  0;
            for await (const iterator of dashboardChartData) {
               if(weeklyDate === moment(iterator.created_at).format("YYYY-MM-DD")){
                  tempPayment += Math.floor(parseFloat(iterator.total_amount_org));
               } else if(weeklyRecentDate === moment(iterator.created_at).format("YYYY-MM-DD")){
                  tempYesterday += Math.floor(parseFloat(iterator.total_amount_org));
               } 
            }
            iResult.todayPay = convertToKRW(tempPayment, true);
            iResult.yesterdayPay = convertToKRW(tempYesterday, true);
         }         

         if(i_value === "total"){
            result = await Order.getAllOrderList(parseInt(store_id), from_date, to_date);
         } else if (i_value === "cancel") {
            result = await Order.getCancelOrderList(parseInt(store_id), from_date, to_date);
         } else {
            result = await Order.getOrderList(parseInt(store_id), from_date, to_date);
         }
         if(result.length > 0){
            for await (let i of result) {
               let sPhone = i.phone_number;
               let sCarNm = i.carNm.split('/');
               let temp = {}

               temp.key = sCount.toString();
               temp.date = moment(i.createDate).format("MM-DD");
               temp.carNm = sCarNm[0];
               if(sPhone !== undefined && sPhone !== null){
                  temp.phone = "***-****-" + sPhone.substring((sPhone.length),(sPhone.length - 4));
               } else {
                  temp.phone = "탈퇴회원";
               }
               if(i.amount !== undefined && i.amount !== null){
                  temp.totalPay = convertToKRW(Math.floor(parseFloat(i.amount)), true);
               } else {
                  temp.totalPay = 0;
               }
               if(i.total_amount_incl !== undefined && i.total_amount_incl !== null){
                  temp.payment = convertToKRW(Math.floor(parseFloat(i.total_amount_incl)), true);
               } else {
                  temp.payment = 0;
               }
               if(i.discount_amount !== undefined && i.discount_amount !== null){
                  temp.discount = convertToKRW(Math.floor(parseFloat(i.discount_amount)), true);
               } else {
                  temp.discount = 0;
               }
               temp.id = i.orderId;

               if(i.cancelled_at !== null){
                  temp.status = 'cancel';
               } else {
                  temp.status = 'complete';
               }
   
               const getProductName = await Order.getProductName(i.orderId);
               if(getProductName.length > 1){
                  temp.list = getProductName[0].name + "...";
               } else {
                  temp.list = getProductName[0].name;
               }
   
               iResult.list.push(temp);
               sCount ++;
            }
         }
      } catch (error) {
         console.log("PaymentController.getListV2 fail !=== > ", error);
      }
      
      res.status(200).json(iResult);
   }
}

PaymentController.getList = async (req, res) => {
   const iUserId = req.user.user_id;
   const oResult = [];

   const store_id = req.body.storeId;
   const i_value = req.body.iValue;
   const from_date = req.body.fromDate;
   const to_date = req.body.toDate;

   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
   } else {
      let sCount = 0;
      let result = [];

      if(i_value === "total"){
         result = await Order.getAllOrderList(parseInt(store_id), from_date, to_date);
      } else if (i_value === "cancel") {
         result = await Order.getCancelOrderList(parseInt(store_id), from_date, to_date);
      } else {
         result = await Order.getOrderList(parseInt(store_id), from_date, to_date);
      }
      if(result.length > 0){
         for await (let i of result) {
            let temp = {}
   
            temp.key = sCount.toString();
            temp.carNm = i.carNm;
            temp.payment = i.payment_method;
            temp.id = i.orderId;
            temp.amount = convertToKRW(parseFloat(i.amount), true);

            if(i.cancelled_at !== null){
               temp.status = 'cancel';
            } else {
               temp.status = 'complete';
            }

            const getProductName = await Order.getProductName(i.orderId);
            if(getProductName.length > 1){
               temp.list = getProductName[0].name + "...";
            } else {
               temp.list = getProductName[0].name;
            }

            oResult.push(temp);
            sCount ++;
         }
      }
      res.status(200).json(oResult);
   }
}



module.exports = PaymentController;