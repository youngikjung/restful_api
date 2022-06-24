'use strict';

var config = require('../config');

const Order = require('../models/order');
const Store = require('../models/store');
const User = require('../models/user');

const CryptoJS = require('crypto-js');
const geolib = require('geolib');
var admin = require("firebase-admin");

const moment = require('moment-timezone');
require('moment/locale/ko');

const {
    convertToKRW,
    padString,
    groupArrayByKey
} = require('../helpers/stringHelper');

const {
    createError,
    BAD_REQUEST,
    UNAUTHORIZED,
    UNPROCESSABLE,
    CONFLICT,
    NOT_FOUND,
    GENERIC_ERROR
} = require('../helpers/errorHelper');

const {
    oFirebaseAdminAppPos,
    oFirebaseAdminApp,
    oFirebaseAdminAppCeo
} = require('../services/firebaseAdmin');

var oValidate = require("validate.js");
const { async } = require('validate.js');

const trimString = function (string, length) {
    return string.length > length ?
        string.substring(0, length) + '' :
        string;
};
 
const sendPushNoti = async (oData) => {
    let bSendDataResult;
    let sResultCode = "3333";
    let bSendNoti = false;
 
    const getToken = await Order.getFirebaseToken(oData.user_id, 1);
    if (getToken != undefined && getToken.length > 0 && getToken[0].token != undefined && getToken[0].token != null && getToken[0].token != "") {
 
        const bCanDoNotify = await Order.getOrderNotiCount(parseInt(oData.order_id));

        console.log('oData.sNotiType', oData.sNotiType);

        if (oData.sNotiType === "noti_parking_arrival" && bCanDoNotify.parking_arrival === 0) {
            sResultCode = await User.parkingArrival(parseInt(oData.order_id), 1);
            bSendNoti = true;
        } else if (oData.sNotiType === "noti_parking_prepare" && bCanDoNotify.parking_prepare === 0) {
            sResultCode = await User.parkingPrepare(parseInt(oData.order_id), 1);
            bSendNoti = true;
        } else if (oData.sNotiType === "cancel" && bCanDoNotify.pos_order_cancel === 0) {
            sResultCode = await User.posOrderCancel(parseInt(oData.order_id), 1);
            bSendNoti = true;
        } else if (oData.sNotiType === "noti_auto_order_cancel" && bCanDoNotify.auto_order_cancel === 0) {
            sResultCode = await User.autoOrderCancel(parseInt(oData.order_id), 1);
            bSendNoti = true;
        } else if (oData.sNotiType === "confirm" && bCanDoNotify.order_confirm === 0) {
            sResultCode = await User.orderConfirm(parseInt(oData.order_id), 1);
            bSendNoti = true;
        } else if (oData.sNotiType === "noti_order_prepared_aft" && bCanDoNotify.order_prepared_aft === 0) {
            sResultCode = await User.orderPreparedAft(parseInt(oData.order_id), 1);
            bSendNoti = true;
        } else if (oData.sNotiType === "noti_order_prepared_bef" && bCanDoNotify.order_prepared_bef === 0) {
            sResultCode = await User.orderPreparedBef(parseInt(oData.order_id), 1);
            bSendNoti = true;
        } else if (oData.sNotiType === "pickup-complete" && bCanDoNotify.concluded === 0) {
            sResultCode = await User.concluded(parseInt(oData.order_id), 1);
            bSendNoti = true;
        } else if (oData.sNotiType === "arrival_customer" && bCanDoNotify.arrival_customer === 0) {
            sResultCode = await User.arrivalCustomer(parseInt(oData.order_id), 1);
            bSendNoti = true;
        } else if (oData.sNotiType === "shop_arrival_confirmed" && bCanDoNotify.arrival_confirm === 0) {
            sResultCode = await User.arrivalCustomerConfirmed(parseInt(oData.order_id), 1);
            bSendNoti = true;
        }

        if (bSendNoti === true) {

            const oDataMessage = {
                token: getToken[0].token,
                data: {
                    title: oData.sTitle,
                    body: oData.sContent
                },
                notification: {
                    title: oData.sTitle,
                    body: oData.sContent
                },
            };

            if (oDataMessage != undefined && Object.keys(oDataMessage).length > 0) {
                bSendDataResult = await oFirebaseAdminApp.messaging()
                                        .send(oDataMessage)
                                        .then((response) => {
                                            return true
                                        })
                                        .catch((error) => {
                                            console.log("error",error);
                                            return false
                                        });
                console.log("bSendDataResult",bSendDataResult);   
            }
            if (bSendDataResult) {
                let list = {
                    type_id: "order",
                    user_id: oData.user_id,
                    title: trimString(oData.sSubContent, 100),
                    param: oData.order_id.toString(),
                    status: 1
                }

                sResultCode = await User.insertAlarm(list);
            }
        }
    }
 
    return sResultCode;
}
// The order controller.
var OrderController = {}

OrderController.index = function (req, res) {
   res.status(200).json({ message: 'Welcome to the order area ' + req.user.user_id + '!' });
}

OrderController.getAllOrders = async (req, res) => {
    if (req.user.store_id == undefined || isNaN(req.user.store_id)) {
        res.json(createError({
            status: UNAUTHORIZED,
            message: 'Unauthorized',
            type: 'store_id'
        }))
    } else if (req.user.user_id == undefined || isNaN(req.user.user_id)) {
        res.json(createError({
            status: UNAUTHORIZED,
            message: 'Unauthorized',
            type: 'user_id'
        }))
    } else {
        let sReady = 0;
        let sPrepare = 0;
        let sComplete = 0;
        let userCloseCount = 0;
        let nOrderId = 0;
        let userArriveCount = 0;
        let nUserCarNm = "";
        let totalOrderList = [];
        let sPrintInfo = {};
        let totalOrderResult = {
            isOrder: false,
        };
        var mStoreId = parseInt(req.user.store_id);
        let aChildStores = await Store.getChildStores(mStoreId);
        let aOrders = await Order.getOrderListPos(mStoreId, aChildStores);
        let oStoreNotiDistance = await Store.getStoreNotiDistance(mStoreId);

        if (aOrders != undefined && aOrders.length > 0) {
            let aOrdersProcessed = {};
            let aOrderStateCount = {};
            let sOrderKey = '';
            aOrderStateCount['confirm'] = [];
            aOrderStateCount['prepare'] = [];
            aOrderStateCount['pickup'] = [];

            // Order status settings
            let OrderPickup = config.order['ORDER_PICKUP_COMPLETE'];
            let OrderPrepare = config.order['ORDER_PREPARING_COMPLETE'];
            let OrderOther = [
                config.order['ORDER_CONFIRMED_APP'],
                config.order['ORDER_CONFIRMED_OFFLINE'],
                config.order['ORDER_CONFIRMED_WALKIN'],
                config.order['ORDER_CONFIRMED_DELIVERY'],
            ];
            let OrderConsumerCancelled = config.order['ORDER_CANCELLED'];
            let OrderStoreCancelled = [
                config.order['ORDER_CANCELLED_STORE'],
                config.order['ORDER_CANCELLED_AUTO']
            ];

            for (let orderData of aOrders) {
                sOrderKey = 'order:' + orderData['order_nr'].toString() + ':' + parseInt(orderData['order_id']);
                if (aOrdersProcessed.hasOwnProperty(sOrderKey) == false) {
                    aOrdersProcessed[sOrderKey] = {};
                }

                aOrdersProcessed[sOrderKey]['row_num'] = padString((parseInt(orderData['row_num'])), 3);
                aOrdersProcessed[sOrderKey]['order_sequence'] = orderData['order_sequence'];
                aOrdersProcessed[sOrderKey]['store_id'] = parseInt(orderData['store_id']);
                aOrdersProcessed[sOrderKey]['order_id'] = parseInt(orderData['order_id']);
                aOrdersProcessed[sOrderKey]['order_nr'] = orderData['order_nr'].toString().substr(-4);
                aOrdersProcessed[sOrderKey]['uuid'] = orderData['uuid'];
                aOrdersProcessed[sOrderKey]['state_id'] = orderData['state_id'];
                aOrdersProcessed[sOrderKey]['payment_state_id'] = orderData['payment_state_id'];
                aOrdersProcessed[sOrderKey]['type_id'] = orderData['type_id'];
                aOrdersProcessed[sOrderKey]['dist_remaining'] = orderData['dist_remaining'];
                aOrdersProcessed[sOrderKey]['order_lat'] = orderData['lat'];
                aOrdersProcessed[sOrderKey]['order_lng'] = orderData['lng'];
                aOrdersProcessed[sOrderKey]['user_id'] = orderData['user_id'];
                aOrdersProcessed[sOrderKey]['ccard_id'] = orderData['ccard_id'];
                aOrdersProcessed[sOrderKey]['inquiry'] = orderData['inquiry'];
                aOrdersProcessed[sOrderKey]['user_phone_number'] = orderData['phone_number'];

                aOrdersProcessed[sOrderKey]['store_name'] = (mStoreId != orderData['store_id']) ? orderData['store_name'] : '';
                aOrdersProcessed[sOrderKey]['store_prepare_time'] = orderData['store_prepare_time'];
                aOrdersProcessed[sOrderKey]['arrival_time'] = orderData['arrival_time'];
                aOrdersProcessed[sOrderKey]['created_at'] = orderData['created_at'];
                aOrdersProcessed[sOrderKey]['updated_at'] = orderData['updated_at'];
                aOrdersProcessed[sOrderKey]['confirmed_at'] = orderData['confirmed_at'];
                aOrdersProcessed[sOrderKey]['order_created_at'] = moment(orderData['created_at']).tz('Asia/Seoul').format('YYYY.MM.DD HH:mm');

                aOrdersProcessed[sOrderKey]['prepared_at'] = orderData['prepared_at'];
                aOrdersProcessed[sOrderKey]['picked_up_at'] = orderData['picked_up_at'];
                aOrdersProcessed[sOrderKey]['cancelled_at'] = orderData['cancelled_at'];

                aOrdersProcessed[sOrderKey]['noti_type'] = orderData['noti_type'];
                aOrdersProcessed[sOrderKey]['noti_type_msg'] = '';
                aOrdersProcessed[sOrderKey]['pickup_type'] = orderData['pickup_type'];

                let iStoreNotiDistance = (oStoreNotiDistance != undefined) ? oStoreNotiDistance.noti_nearby_distance : '0';
                if (parseInt(orderData['noti_type']) === 1) {
                    aOrdersProcessed[sOrderKey]['noti_type_msg'] = '고객은 도착 예정 0m 전.';
                } else if (parseInt(orderData['noti_type']) === 2) {
                    aOrdersProcessed[sOrderKey]['noti_type_msg'] = '고객은 도착 예정 ' + iStoreNotiDistance + 'm 전.';
                } else if (parseInt(orderData['noti_type']) === 3) {
                    aOrdersProcessed[sOrderKey]['noti_type_msg'] = '고객이 이미 도착하였습니다. 빠른 준비 부탁드립니다.';
                }

                // Order payment settings
                if (config.payment['COMPLETED'] == orderData['payment_state_id']) {
                    aOrdersProcessed[sOrderKey]['payment_state'] = 'completed';
                }

                // Distance settings
                let oUserDistance = await Order.getOrderLocation(parseInt(orderData['order_id']));
                let iUseDistance = 0;
                if (oUserDistance != undefined) {
                    let iOrderDistance = await geolib.getPreciseDistance(
                        { latitude: parseFloat(orderData.lat), longitude: parseFloat(orderData.lng) },
                        { latitude: parseFloat(oUserDistance.lat), longitude: parseFloat(oUserDistance.lng) }
                    );
                    iUseDistance = iOrderDistance;
                }

                if (iUseDistance > 1000) {
                    aOrdersProcessed[sOrderKey]['dist_remaining_nrm'] = parseFloat(iUseDistance / 1000).toFixed(2) + 'km';
                } else {
                    aOrdersProcessed[sOrderKey]['dist_remaining_nrm'] = iUseDistance + 'm';
                }

                aOrdersProcessed[sOrderKey]['type_code'] = orderData['type_code'].toLowerCase();
                aOrdersProcessed[sOrderKey]['type_name'] = orderData['type_name'];

                // Order status settings
                aOrdersProcessed[sOrderKey]['state_color'] = 'standby';
                if (OrderOther.indexOf(orderData['state_id']) != -1) {
                    aOrdersProcessed[sOrderKey]['state_color'] = 'confirmed';
                //aOrderStateCount['confirm'].push(orderData['order_id']);
                } else if ([OrderPrepare].indexOf(orderData['state_id']) != -1) {
                    aOrdersProcessed[sOrderKey]['state_color'] = 'prepared';
                //aOrderStateCount['prepare'].push(orderData['order_id']);
                } else if ([OrderPickup].indexOf(orderData['state_id']) != -1) {
                    aOrdersProcessed[sOrderKey]['state_color'] = 'conclude';
                //aOrderStateCount['pickup'].push(orderData['order_id']);
                } else if ([OrderConsumerCancelled].indexOf(orderData['state_id']) != -1) {
                    aOrdersProcessed[sOrderKey]['state_color'] = 'customer_cancelled';
                } else if (OrderStoreCancelled.indexOf(orderData['state_id']) != -1) {
                    aOrdersProcessed[sOrderKey]['state_color'] = 'store_cancelled';
                }

                // Send noti
                if (parseInt(orderData['noti_type']) === 3 && orderData['noti_parking_arrival'] === 0) {
                    let oNotiMsg = {};
                    oNotiMsg.sNotiType = "noti_parking_arrival";
                    oNotiMsg.sTitle = "현재위치는 주차가능시간이" + oStoreNotiDistance.parking_time + "분입니다.";
                    oNotiMsg.sContent = "경과 시 주차위반 단속 위험이 있습니다.";
                    oNotiMsg.sSubContent = "경과 시 주차위반 단속 위험이 있습니다.";
                    oNotiMsg.user_id = orderData['user_id'].toString();
                    oNotiMsg.order_id = parseInt(orderData['order_id']).toString();
                    oNotiMsg.store_name = oStoreNotiDistance.store_name;
                    await sendPushNoti(oNotiMsg);
                }

                aOrdersProcessed[sOrderKey]['user_full_name'] = orderData['user_full_name'];
                aOrdersProcessed[sOrderKey]['license_number'] = orderData['license_number'];
                aOrdersProcessed[sOrderKey]['order_total_quantity'] = orderData['order_total_quantity'];
                aOrdersProcessed[sOrderKey]['order_total_amount_incl'] = orderData['order_total_amount_incl'];
                aOrdersProcessed[sOrderKey]['order_total_amount_excl'] = orderData['order_total_amount_excl'];
                aOrdersProcessed[sOrderKey]['order_total_amount_show'] = convertToKRW(orderData['order_total_amount_incl'], false);

                aOrdersProcessed[sOrderKey]['order_discount_amount'] = orderData['order_discount_amount'];
                aOrdersProcessed[sOrderKey]['order_discount_amount_show'] = convertToKRW(orderData['order_discount_amount'], false);

                aOrdersProcessed[sOrderKey]['order_total_amount_org'] = orderData['order_total_amount_org'];
                aOrdersProcessed[sOrderKey]['order_total_amount_org_show'] = convertToKRW(orderData['order_total_amount_org'], false);


                let aLicenseNr = orderData['license_number'];
                let aSplitLicenseNr;
                if (aLicenseNr != undefined && aLicenseNr.length > 0 && aLicenseNr.indexOf('/') != -1) {
                    aSplitLicenseNr = aLicenseNr.split('/');
                }

                aOrdersProcessed[sOrderKey]['car_nr'] = aLicenseNr;
                aOrdersProcessed[sOrderKey]['car_style'] = '';
                if (aSplitLicenseNr != undefined && aSplitLicenseNr.length > 0 && aSplitLicenseNr != undefined) {
                    aOrdersProcessed[sOrderKey]['car_nr'] = aSplitLicenseNr[0];
                if (aSplitLicenseNr.length >= 1) {
                    aOrdersProcessed[sOrderKey]['car_style'] = aSplitLicenseNr[1];
                }
                //if (aSplitLicenseNr.length >= 2) {
                // aOrdersProcessed[sOrderKey]['car_style'] = aSplitLicenseNr[1] + ' / ' + aSplitLicenseNr[2];
                //}
                }

                var oNow = moment(new Date());
                var oEnd = moment(orderData['arrival_time']).tz('Asia/Seoul');
                var oDuration = moment.duration(oEnd.diff(oNow));
                var iMinutes = oDuration.asMinutes();
                var iSeconds = parseInt(oDuration.asSeconds());
                if (iMinutes < 0) {
                    iMinutes = 0;
                }
                if (iSeconds < 0) {
                    iSeconds = 0;
                }

                var oOrderTime = moment(orderData['created_at']).tz('Asia/Seoul');
                aOrdersProcessed[sOrderKey]['arrival_in_minutes'] = moment.duration(oEnd.diff(oOrderTime)).asMinutes();
                aOrdersProcessed[sOrderKey]['arrival_in_minutes_show'] = moment.utc(moment.duration(Math.round(iMinutes * 60), "seconds").asMilliseconds()).format("HH시간 mm분");
                aOrdersProcessed[sOrderKey]['arrival_in_seconds'] = iSeconds;
                aOrdersProcessed[sOrderKey]['arrival_norm'] = moment(orderData['arrival_time']).tz('Asia/Seoul').format('LT');
                aOrdersProcessed[sOrderKey]['store_prepare_time_show'] = moment.utc(moment.duration(Math.round(orderData['store_prepare_time'] * 60), "seconds").asMilliseconds()).format("HH시간 mm분");

                // Prepare time
                oNow = moment(new Date());
                oEnd = moment(orderData['created_at']).add(Math.round(orderData['store_prepare_time']), 'minutes').tz('Asia/Seoul');
                oDuration = moment.duration(oEnd.diff(oNow));
                iMinutes = oDuration.asMinutes();
                iSeconds = parseInt(oDuration.asSeconds());
                if (iSeconds < 0) {
                    iSeconds = 0;
                }
                aOrdersProcessed[sOrderKey]['prepare_in_seconds'] = iSeconds;


                // Product and Options
                let aPrdAndOpt = await Order.getOrderProductAndOptions(parseInt(orderData['order_id']));

                if (aPrdAndOpt != undefined) {
                    for (const oPrdOpt of aPrdAndOpt) {
                        let sDetailKey = 'items:' + oPrdOpt['order_detail_id'];
                        if (aOrdersProcessed[sOrderKey].hasOwnProperty(sDetailKey) == false) {
                            aOrdersProcessed[sOrderKey][sDetailKey] = {};
                            aOrdersProcessed[sOrderKey][sDetailKey]['options'] = [];
                        }

                        if (aOrdersProcessed[sOrderKey].hasOwnProperty(sDetailKey) == true) {
                            aOrdersProcessed[sOrderKey][sDetailKey]['product_id'] = oPrdOpt['product_id'];
                            aOrdersProcessed[sOrderKey][sDetailKey]['prd_name'] = oPrdOpt['prd_name'];
                            aOrdersProcessed[sOrderKey][sDetailKey]['prd_name2'] = oPrdOpt['prd_name2'];
                            aOrdersProcessed[sOrderKey][sDetailKey]['prd_price'] = oPrdOpt['prd_price'];
                            aOrdersProcessed[sOrderKey][sDetailKey]['prd_price_show'] = convertToKRW(oPrdOpt['prd_price'], false);
                            aOrdersProcessed[sOrderKey][sDetailKey]['prd_quantity'] = oPrdOpt['item_quantity'];
                            aOrdersProcessed[sOrderKey][sDetailKey]['prd_total_price_show'] = convertToKRW(parseFloat(oPrdOpt['item_quantity'] * oPrdOpt['prd_price']), false);
                            aOrdersProcessed[sOrderKey][sDetailKey]['order_prd_key'] = oPrdOpt['order_prd_key'];
                            aOrdersProcessed[sOrderKey][sDetailKey]['request_message'] = orderData['request_message'];
                            aOrdersProcessed[sOrderKey][sDetailKey]['prd_with_opt_amnt_tax_incl'] = oPrdOpt['item_amount_tax_incl'];
                            aOrdersProcessed[sOrderKey][sDetailKey]['prd_with_opt_amnt_tax_excl'] = oPrdOpt['item_amount_tax_excl'];

                            // Check if has options
                            if (oPrdOpt['product_option_id'] != undefined && oPrdOpt['product_option_id'] != 0) {
                                let aProductOption = {
                                'option_price': oPrdOpt['option_price'],
                                'option_price_show': convertToKRW(parseFloat(oPrdOpt['item_quantity'] * oPrdOpt['option_price']), false),
                                'option_name': ((oPrdOpt['option_name'] !== undefined && oPrdOpt['option_name'] !== null) ? oPrdOpt['option_name'] : ' '), 
                                'option_name2': ((oPrdOpt['option_name2'] !== undefined && oPrdOpt['option_name2'] !== null) ? oPrdOpt['option_name2'] : ' '), 
                                'option_quantity': 1,
                                'option_id': oPrdOpt['product_option_id']
                                };
                                aOrdersProcessed[sOrderKey][sDetailKey]['options'].push(aProductOption);
                            }
                        }
                    }
                }

                // Noti 
                aOrdersProcessed[sOrderKey]['noti_parking_arrival'] = orderData['noti_parking_arrival'];
                aOrdersProcessed[sOrderKey]['noti_parking_prepare'] = orderData['noti_parking_prepare'];
                aOrdersProcessed[sOrderKey]['noti_auto_order_cancel'] = orderData['noti_auto_order_cancel'];
                aOrdersProcessed[sOrderKey]['noti_pos_order_cancel'] = orderData['noti_pos_order_cancel'];
                aOrdersProcessed[sOrderKey]['noti_order_confirm'] = orderData['noti_order_confirm'];
                aOrdersProcessed[sOrderKey]['noti_order_prepared_aft'] = orderData['noti_order_prepared_aft'];
                aOrdersProcessed[sOrderKey]['noti_order_prepared_bef'] = orderData['noti_order_prepared_bef'];
                aOrdersProcessed[sOrderKey]['noti_concluded'] = orderData['noti_concluded'];
            }

            let aKeys = [];
            if(aOrdersProcessed !== undefined){
                for (var iKey in aOrdersProcessed) {
                    aKeys.push(iKey);
                }
                aKeys.sort();
                aKeys.forEach(function (sItem) {
                    let oOrderData = aOrdersProcessed[sItem];
                    let optionList = [];
                    
                    for (let sKey in oOrderData) {
                        if (sKey.indexOf('items:') != -1) {
                            optionList.push(oOrderData[sKey]);
                        }
                    }
                    oOrderData.optionList = optionList;
                    if (oOrderData.state_color === 'standby') {
                        sReady += 1;
                        sPrintInfo = oOrderData;
                    } else if (oOrderData.state_color === 'confirmed') {
                        sPrepare += 1;
                    } else if (oOrderData.state_color === 'prepared') {
                        sComplete += 1;
                    }

                    if (oOrderData.state_color !== 'customer_cancelled' && oOrderData.state_color !== 'store_cancelled' && oOrderData.state_color !== 'conclude') {
                        if ([2].indexOf(parseInt(oOrderData.noti_type)) != -1) {
                            userCloseCount += 1;
                            nOrderId = parseInt(oOrderData.order_id);
                            nUserCarNm = oOrderData.car_nr;
                        }
                        if ([3].indexOf(parseInt(oOrderData.noti_type)) != -1) {
                            userArriveCount += 1;
                            nOrderId = parseInt(oOrderData.order_id);
                            nUserCarNm = oOrderData.car_nr;
                        }
                        totalOrderList.push(oOrderData);
                    }
                })
            }
            if(totalOrderList.length > 0){
                totalOrderList.sort(function (a,b) {
                    return new Date(b.created_at) - new Date(a.created_at);
                });

                totalOrderResult.isOrder = true;
                totalOrderResult.iReady = sReady;
                totalOrderResult.iPrepare = sPrepare;
                totalOrderResult.iComplete = sComplete;
                totalOrderResult.isNewOrder = sReady;
                totalOrderResult.sCloseCount = userCloseCount;
                totalOrderResult.sArriveCount = userArriveCount;
                totalOrderResult.nOrderId = nOrderId;
                totalOrderResult.nUserCarNm = nUserCarNm;
                totalOrderResult.sPrintInfo = sPrintInfo;
                totalOrderResult.orderList = totalOrderList;
            }

        }

        res.status(200).json(totalOrderResult);
    }
}

module.exports = OrderController;