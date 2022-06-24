'use strict';

var config = require('../../config');

const Order = require('../../models/order');
const Store = require('../../models/store');
const User = require('../../models/user');

const CryptoJS = require('crypto-js');
const geolib = require('geolib');
var admin = require("firebase-admin");

const moment = require('moment-timezone');
require('moment/locale/ko');

const {
    convertToKRW,
    padString,
    groupArrayByKey
} = require('../../helpers/stringHelper');

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
    oFirebaseAdminAppPos,
    oFirebaseAdminApp,
    oFirebaseAdminAppCeo
} = require('../../services/firebaseAdmin');

var oValidate = require("validate.js");
const { async } = require('validate.js');
const oRedisProducer = require('../../services/redisProducer');

async function* asyncGenerator(sIndex) {
    let count = 0;
    while (count < sIndex) 
    yield count++;
};

const trimString = function (string, length) {
    return string.length > length ?
        string.substring(0, length) + '' :
        string;
};

const sealOfApproval = async (orderId) => {
    let oNotiMessage = {
        data: {
            title: "고객님 스탬프가 발행되었습니다.",
            body: "주문하신 매장에 스탬프가 발행되었습니다.",
            type: "publish_stamp",
            order_id: 0,
            user_id: 0,
            store_id: 0,
        },
        notification: {
            title: "고객님 스탬프가 발행되었습니다.",
            body: "주문하신 매장에 스탬프가 발행되었습니다."
        },
        android: {
            priority: "high",
            ttl: 3600 * 1000,
            notification: {
                channelId: "throo_app_alarm"
            },
        },
    };
    let sResult = false;
    let process1 = false;
    let process2 = false;
    let process3 = false;
    let sCount = 0;
    let stampId = "";
    let stampMinAmount = 0;
    let stampCouponId = "";
    let stampState = "";
    let stampStartDate = "";
    let stampEndDate = "";
    let userId = "";
    let storeId = "";
    let storeName = "";
    let paymentPrice = "";

    try {
        const startDate = moment().format('YYYY-MM-DD');
        const getList = await Order.getOrderDetailByOrderId(parseInt(orderId));
        if(getList.length > 0){
            if(getList[0].user_id !== undefined && getList[0].store_id !== undefined && getList[0].total_amount_excl !== undefined){
                if(parseInt(getList[0].total_amount_excl) > 0){
                    userId = getList[0].user_id;
                    storeId = getList[0].store_id;
                    paymentPrice = getList[0].total_amount_excl;
                    storeName = getList[0].store_name;
                    process1 = true;
                }
            }
        }
        
        if(process1){
            const storeStampEvent = await Store.isStampEvent(parseInt(storeId),startDate);
            if(storeStampEvent.length > 0){
                stampId = storeStampEvent[0].stamp_id;
                stampCouponId = storeStampEvent[0].stamp_coupon_id;
                stampState = storeStampEvent[0].status;
                stampMinAmount = storeStampEvent[0].minimum_amount;
                stampStartDate = moment(storeStampEvent[0].start_date).format("YYYY-MM-DD");
                stampEndDate = moment(storeStampEvent[0].end_date).format("YYYY-MM-DD");
                process2 = true;
            }
        }

        if(process2){
            if(parseInt(stampState) > 0){
                process3 = true;
            } else {
                const getUserStempList = await User.getUserStempListByStore(parseInt(userId),parseInt(storeId));
                if(getUserStempList.length > 0){
                    process3 = true;
                }
            }
        }
        
        if(process3){
            if(parseInt(stampMinAmount) <= parseInt(paymentPrice)){
                sCount = parseInt(parseInt(paymentPrice) / parseInt(stampMinAmount));
                for await (const letter of asyncGenerator(parseInt(sCount))) {
                    await User.publishStamp(parseInt(storeId),parseInt(userId),parseInt(orderId),parseInt(stampMinAmount),stampEndDate,stampId);
                }

                const getPushToken = await Order.getUserPushToken(parseInt(userId));
                if(getPushToken.length > 0){
                    for await (const e of getPushToken) {
                        if(e.token !== undefined && e.token !== null && e.token !== ""){
                            oNotiMessage.data.title = `${storeName.toString()}점 스탬프가 발급되었습니다.`;
                            oNotiMessage.data.body = `고객님, 오늘 스탬프 ${sCount.toString()}개를 적립하셨습니다. 감사합니다.`;
                            oNotiMessage.data.order_id = orderId.toString();
                            oNotiMessage.data.user_id = userId.toString();
                            oNotiMessage.data.store_id = storeId.toString();
                            oNotiMessage.notification.title = `${storeName.toString()}점 스탬프가 발급되었습니다.`;
                            oNotiMessage.notification.body = `고객님, 오늘 스탬프 ${sCount.toString()}개를 적립하셨습니다. 감사합니다.`;
                            oNotiMessage.token = e.token.toString();
                            await userTargetPushMessage(oNotiMessage);
                        }
                    }
                }
            }
        }

    } catch (error) {
        console.log("sealOfApproval errr",error);
    }

}

const userTargetPushMessage = async (oNotiMessage) => {
    const res =  await  oFirebaseAdminApp.messaging()
                        .send(oNotiMessage)
                        .then((response) => {
                            return true
                        })
                        .catch((error) => {
                            console.log("error",error);
                            return false
                        });
    console.log("res",res);   
    return res; 
}

const posTargetPushMessage = async (oNotiMessage) => {
    const res =  await  oFirebaseAdminAppPos.messaging()
                        .send(oNotiMessage)
                        .then((response) => {
                            return true
                        })
                        .catch((error) => {
                            console.log("error",error);
                            return false
                        });
    console.log("res",res);   
    return res;                 
}

const ceoTargetPushMessage = async (oNotiMessage) => {
    const res =  await  oFirebaseAdminAppCeo.messaging()
                        .send(oNotiMessage)
                        .then((response) => {
                            return true
                        })
                        .catch((error) => {
                            console.log("error",error);
                            return false
                        });
    console.log("res",res);   
    return res; 
}
 
const cancelPosNotification = async (iOrderId, sType) => {
    if (iOrderId !== undefined && iOrderId !== 0) {
        // Get push tokens by orderid
        let oOrderStoreId = await Order.getParentStoreIdByOrderId(iOrderId);
        if (oOrderStoreId != undefined) {
            let aStoreIds = [];
            aStoreIds.push(oOrderStoreId.store_id);
            aStoreIds.push(oOrderStoreId.parent_store_id);

            let oNotiMessage;
            let sNotiTitle;
            let sNotiBody;

            if (sType === 'neworder') {
                sNotiTitle = '사장님 신규 주문이 들어왔어요.';
                sNotiBody = '주문 내역 확인 후 주문 확인 버튼을 눌러주세요.';
            } else if (sType === 'customernearby') {
                sNotiTitle = '사장님 고객님이 잠시 후 도착합니다.';
                sNotiBody = '고객님이 바로 상품을 받아 가실 수 있도록 준비해 주세요.';
            } else if (sType === 'customerarrived') {
                sNotiTitle = '고객님이 매장 앞에 도착했어요.';
                sNotiBody = '상품 전달 후 전달 완료 버튼을 눌러주세요.';
            } else if (sType === 'autocancel') {
                sNotiTitle = '자동으로 주문이 취소 되었어요.';
                sNotiBody = '자동으로 주문이 취소 되었어요.';
            } else if (sType === 'storecancel') {
                sNotiTitle = '주문이 취소 되었어요.';
                sNotiBody = '주문이 취소 되었어요.';
            }

            if (sNotiTitle === undefined || sNotiTitle === '') {
                console.log('No sNotiTitle');
                return;
            }

            if (sNotiBody === undefined || sNotiBody === '') {
                console.log('No sNotiBody');
                return;
            }

            oNotiMessage = {
                data: {
                    title: sNotiTitle,
                    body: sNotiBody,
                    action: 'stop-the-sound',
                    type: sType
                },
                notification: {
                    title: sNotiTitle,
                    body: sNotiBody
                },
                android: {
                    priority: "high",
                    ttl: 3600 * 1000
                },
            };

            let aPosPushTokens = await Order.getPushTokensByStoreIds(aStoreIds);
            if (aPosPushTokens != undefined && aPosPushTokens.length > 0) {
                let oPushNotiData = {};
                for (const oRes of aPosPushTokens) {
                    oNotiMessage.token = oRes.token;

                    oPushNotiData.push_token_id = oRes.push_token_id;
                    if (sType === 'neworder') {
                        oPushNotiData.noti_order_cancel = 1;
                    } else if (sType === 'customernearby') {
                        oPushNotiData.noti_nearby_cancel = 1;
                    } else if (sType === 'customerarrived') {
                        oPushNotiData.noti_arrive_cancel = 1;
                    }

                    // Check if already sent, if so, don't send again
                    let oCheckSent = await Order.checkPosPushCancelSent(oRes.push_token_id, iOrderId);
                    if (oCheckSent != undefined && oCheckSent.noti_order_cancel === 1 && sType === 'neworder') {
                        continue;
                    } else if (oCheckSent != undefined && oCheckSent.noti_nearby_cancel === 1 && sType === 'customernearby') {
                        continue;
                    } else if (oCheckSent != undefined && oCheckSent.noti_arrive_cancel === 1 && sType === 'customerarrived') {
                        continue;
                    }

                    if (oNotiMessage != undefined && Object.keys(oNotiMessage).length > 0 && oNotiMessage.token != '' && oNotiMessage.token != undefined) {
                        try {
                            await ceoTargetPushMessage(oNotiMessage);
                            await posTargetPushMessage(oNotiMessage);
                        } catch (error) {}
                    } else {
                        console.log('No NotiMessage.Token');
                        return false
                    }
                }
            }
        }
    }
}

const sendPushNoti = async (oData) => {
    let sResultCode = "3333";
    let bSendNoti = false;
    let bSendDataResult;

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
        } else if (oData.sNotiType === "stamp_collected") {
            bSendNoti = true;
        }

        if (bSendNoti) {

            const oDataMessage = {
                token: getToken[0].token,
                data: {
                    title: oData.sTitle,
                    body: oData.sContent,
                    notiType: oData.sNotiType
                },
                notification: {
                    title: oData.sTitle,
                    body: oData.sContent
                },
                android: {
                    priority: "high",
                    ttl: 3600 * 1000,
                    notification: {
                        //channelId: 'throo_app_alarm',
                        sound: "default"
                    },
                },
                apns: {
                    headers: {
                        "apns-priority": "10"
                    },
                    payload: {
                        aps: {
                            alert: {
                                title: oData.sTitle,
                                body: oData.sContent
                            },
                            sound: "default"
                        }
                    }
                }
            };

            
            if (oDataMessage != undefined && Object.keys(oDataMessage).length > 0) {
                bSendDataResult = await userTargetPushMessage(oDataMessage);
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
var DesignatedController = {}

DesignatedController.index = function (req, res) {
   res.status(200).json({ message: 'Welcome to the order area ' + req.user.user_id + '!' });
}


DesignatedController.getAllOrders = async (req, res) => {
    let sReady = 0;
    let sPrepare = 0;
    let sComplete = 0;
    let userCloseCount = 0;
    let nOrderId = 0;
    let userArriveCount = 0;
    let nUserCarNm = "";
    let totalOrderList = [];
    let sPrintInfo = {};
    let process1 = false;
    let process2 = false;
    let totalOrderResult = {
        isOrder: false,
    };
    let mKey = req.body.designatedKey;
    let mStoreId = req.body.store_id;

    try {
        if(mStoreId.toString() === "677" || mStoreId.toString() === "685" || mStoreId.toString() === "707"){
            process1 = true;
        }

        if(process1){
            if(mKey.toString() === config.designatedStoreKey){
                process2 = true;
            }
        }

        if(process1 && process2){
            let aChildStores = await Store.getChildStores(parseInt(mStoreId));
            let aOrders = await Order.getOrderListPos(parseInt(mStoreId), aChildStores);
            let oStoreNotiDistance = await Store.getStoreNotiDistance(parseInt(mStoreId));
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

                    aOrdersProcessed[sOrderKey]['store_name'] = (parseInt(mStoreId) != orderData['store_id']) ? orderData['store_name'] : '';
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
                    } else if ([OrderPrepare].indexOf(orderData['state_id']) != -1) {
                        aOrdersProcessed[sOrderKey]['state_color'] = 'prepared';
                    } else if ([OrderPickup].indexOf(orderData['state_id']) != -1) {
                        aOrdersProcessed[sOrderKey]['state_color'] = 'conclude';
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
                    }

                    let oNow = moment(new Date());
                    let oEnd = moment(orderData['arrival_time']).tz('Asia/Seoul');
                    let oDuration = moment.duration(oEnd.diff(oNow));
                    let iMinutes = oDuration.asMinutes();
                    let iSeconds = parseInt(oDuration.asSeconds());
                    if (iMinutes < 0) {
                        iMinutes = 0;
                    }
                    if (iSeconds < 0) {
                        iSeconds = 0;
                    }
                    
                    let oOrderTime = moment(orderData['created_at']).tz('Asia/Seoul');
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
                                        'option_name': oPrdOpt['option_name'].toUpperCase(),
                                        'option_name2': oPrdOpt['option_name2'].toUpperCase(),
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
        }
    } catch (error) {
        console.log("DesignatedController  getAllOrders  errr",error);
        console.log("created",moment());
        console.log("DesignatedController storeId",mStoreId);
    }

    res.status(200).json(totalOrderResult);
}

DesignatedController.changeNotiType = async (req, res) => {
    let oResult = false;
    let process1 = false;
    let process2 = false;
    let sStoreName = "";
    let iStoreId = 0;
    let iOrderUserId = 0;

    try {
        const order_id = req.body.orderId;
        const iNotiType = req.body.noti_type;
        const mKey = req.body.designatedKey;

        if(mKey.toString() === config.designatedStoreKey){
            process1 = true;
        }
        
        if(process1){
            let oOrderData = await Order.selectOrderByIdForNoti(parseInt(order_id));
            console.log('oOrderData', oOrderData);
            sStoreName = oOrderData.store_name;
            iStoreId = oOrderData.store_id;
            iOrderUserId = oOrderData.user_id;

            if(oOrderData.store_id.toString() === "677" || oOrderData.store_id.toString() === "685" || oOrderData.store_id.toString() === "707"){
                process2 = true;
            }
        }

        if(process2){
            if (iNotiType != undefined && iNotiType != 0) {
                await Order.changeNotiType(parseInt(order_id), parseInt(iNotiType));
                if (parseInt(iNotiType) === 10) {
                    let oNotiMsg = {};
                    oNotiMsg.sNotiType = "shop_arrival_confirmed";
                    oNotiMsg.sTitle = "판매자가 고객님 도착을 확인하였습니다.";
                    oNotiMsg.sContent = "곧 주문하신 상품을 전달할 예정입니다. 잠시만 기다려주세요~";
                    oNotiMsg.sSubContent = "곧 주문하신 상품을 전달할 예정입니다. 잠시만 기다려주세요~";
                    oNotiMsg.user_id = parseInt(iOrderUserId);
                    oNotiMsg.order_id = order_id.toString();
                    oNotiMsg.store_name = sStoreName;
                    await sendPushNoti(oNotiMsg);
                }

                if (parseInt(iNotiType) === 9 || parseInt(iNotiType) === 10) {
                    oRedisProducer.createPosNotifierProducer(parseInt(order_id), parseInt(iStoreId), parseInt(iOrderUserId));
                    let oParentStore = await Order.getParentStoreIdByOrderId(parseInt(order_id));
                    if (oParentStore != undefined && Object.keys(oParentStore).length > 0) {
                        oRedisProducer.createPosNotifierProducer(parseInt(order_id), parseInt(oParentStore.parent_store_id), parseInt(iOrderUserId));
                    }
                }

            } else {
                await Order.changeNotiTypeConfirm(parseInt(order_id));
            }
            
            oResult = true;
        }
    } catch (error) {
        console.log("DesignatedController changeNotiType  errr",error);
        console.log("created",moment());
    }

    res.status(200).json(oResult);
}

DesignatedController.changeState = async (req, res) => {
    let iNewStateId = 0;
    let iStoreId = 0;
    let iUserId = 0;
    let iOrderTime = 0;
    let sStoreName = "";
    let iStoreParkingTime = "";
    let sProcess1 = false;
    let sProcess2 = false;
    let sProcess3 = false;
    let sProcess4 = false;
    let oData = {};
    let oResult = {
        ok: false,
        message: '네트워크 에러입니다. ERR -4001'
    };
    try {
        const iOrderId = parseInt(req.body.order_id);
        const sState = req.body.current_state;
        const mKey = req.body.designatedKey;

        if(mKey.toString() === config.designatedStoreKey){
            let oOrderState = await Order.selectOrderStateById(iOrderId);
            if (oOrderState != undefined && oOrderState.state_id != undefined) {
                let OrderCancelledState = [
                    config.order['PAYMENT_CANCELLED'],
                    config.order['PAYMENT_POS_CANCELLED'],
                    config.order['ORDER_CANCELLED'],
                    config.order['ORDER_CANCELLED_STORE'],
                    config.order['ORDER_CANCELLED_AUTO'],
                    config.order['ORDER_DELETE']
                ];
                if (OrderCancelledState.indexOf(oOrderState.state_id) != -1) {
                    oResult.ok = false;
                    oResult.message = '주문 상태를 변경할 수 없습니다. ERR -2001';
                } else {
                    iOrderTime = oOrderState.order_time;
                    iStoreId = oOrderState.store_id;
                    sStoreName = oOrderState.store_name;
                    iStoreParkingTime = oOrderState.parking_time;
                    iUserId = parseInt(oOrderState.user_id);
                    sProcess1 = true;
                }
            }
        }

        if(sProcess1){
            if(iStoreId.toString() === "677" || iStoreId.toString() === "685" || iStoreId.toString() === "707"){
                sProcess2 = true;
            }
        }

        if(sProcess2){
            var tzoffset = (new Date()).getTimezoneOffset() * 60000;
            var localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, -5).replace("T", " ");

            if (sState == 'confirm') {
                iNewStateId = config.order['ORDER_CONFIRMED_APP'];
                oData = {
                    state_id: iNewStateId,
                    confirmed_at: localISOTime
                }
                sProcess3 = true;
            } else if (sState == 'prepare') {
                iNewStateId = config.order['ORDER_PREPARING_COMPLETE'];
                oData = {
                    state_id: iNewStateId,
                    prepared_at: localISOTime
                }
            } else if (sState == 'pickup-complete') {
                iNewStateId = config.order['ORDER_PICKUP_COMPLETE'];
                oData = {
                    state_id: iNewStateId,
                    picked_up_at: localISOTime
                }
            }
        }
    
        if(sProcess3){
            if (iNewStateId == 0) {
                oResult.ok = false;
                oResult.message = '주문 상태를 변경할 수 없습니다. ERR -2002';
            } else {
                sProcess4 = true;
            }
        }
    
        if(sProcess4){
            let oResUpdate = await Order.updateOrder(oData, iOrderId);
            if (oResUpdate != undefined && oResUpdate == 1) {
                let oNotiMsg = {};
                let oOrderData = await Order.selectOrderByIdForNoti(parseInt(iOrderId));
                let iOrderUserId = parseInt(oOrderData.user_id);
                sStoreName = oOrderData.store_name;

                if (sState == 'confirm') {
                    oNotiMsg.sNotiType = "confirm";
                    oNotiMsg.sTitle = "판매자가 주문 상품을 확인하였습니다.";
                    oNotiMsg.sContent = "상품준비까지 " + iOrderTime + "분이 소요될예정입니다.";
                    oNotiMsg.sSubContent = "상품준비까지 " + iOrderTime + "분이 소요될예정입니다.";
                    oNotiMsg.user_id = iOrderUserId.toString();
                    oNotiMsg.order_id = iOrderId.toString();
                    oNotiMsg.store_name = sStoreName;

                    await sendPushNoti(oNotiMsg);
                } else if (sState == 'prepare') {
                    let sDescriptionNoti = '';
                    let sGetStoreDesc = await Store.getStoreDescriptionNoti(parseInt(iStoreId));
                    if (sGetStoreDesc != undefined && sGetStoreDesc != '') {
                        sDescriptionNoti = ' ' + sGetStoreDesc['description_noti'];
                    }

                    oNotiMsg.sNotiType = "noti_order_prepared_bef";
                    oNotiMsg.sTitle = "판매자가 주문 상품 준비를 마쳤습니다.";
                    oNotiMsg.sContent = "매장 앞 픽업존으로 이동 부탁드립니다." + sDescriptionNoti;
                    oNotiMsg.sSubContent = "매장 앞 픽업존으로 이동 부탁드립니다." + sDescriptionNoti;
                    oNotiMsg.user_id = iOrderUserId.toString();
                    oNotiMsg.order_id = iOrderId.toString();
                    oNotiMsg.store_name = sStoreName;
                    await sendPushNoti(oNotiMsg);

                } else if (sState == 'pickup-complete') {
                    oNotiMsg.sNotiType = "pickup-complete";
                    oNotiMsg.sTitle = "상품 전달 완료! ";
                    oNotiMsg.sContent = "만족하셨다면 휙오더를 등록후 간편하게 주문하세요.";
                    oNotiMsg.sSubContent = "만족하셨다면 휙오더를 등록후 간편하게 주문하세요.";
                    oNotiMsg.user_id = iOrderUserId.toString();
                    oNotiMsg.order_id = iOrderId.toString();
                    oNotiMsg.store_name = sStoreName;
                    await sendPushNoti(oNotiMsg);
                    sealOfApproval(parseInt(iOrderId));
                }

                oRedisProducer.createPosNotifierProducer(iOrderId, parseInt(iStoreId), iUserId);
                oRedisProducer.createUserNotifierProducer(iOrderId, parseInt(iStoreId), iUserId, iNewStateId);
                let oParentStore = await Order.getParentStoreIdByOrderId(parseInt(iOrderId));
                if (oParentStore != undefined && Object.keys(oParentStore).length > 0) {
                   oRedisProducer.createPosNotifierProducer(parseInt(iOrderId), parseInt(oParentStore.parent_store_id), iUserId);
                }
            }

            oResult.ok = true;
            oResult.message = '주문 상태를 변경되었습니다. ERR -2002';
        }
    } catch (error) {
        console.log("DesignatedController changeState  errr",error);
        console.log("created",moment());
        console.log("changeState iOrderId",iOrderId);
    }

    res.status(200).json(oResult);

}

module.exports = DesignatedController;