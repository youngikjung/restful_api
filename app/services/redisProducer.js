const oRedis = require('redis');
const config = require('../config');
const Queue = require('bee-queue');
const { v1: uuidv1 } = require('uuid');
const moment = require('moment-timezone');
require('moment/locale/ko');

let sAutoCancelQueueName = 'auto-order-cancel';
let sAutoUpdateQueueName = 'auto-order-update';

class Redis {
    constructor() {
        this.host = config.redis['host'] || 'localhost';
        this.port = config.redis['port'] || '6379';
        this.password = config.redis['password'] || '';
        this.client;

        this.envPrefix;

        if (config.default['environment'] == 'development') {
            this.envPrefix = 'dev:'
        } else if (config.default['environment'] == 'staging') {
            this.envPrefix = 'stg:'
        } else if (config.default['environment'] == 'production') {
            this.envPrefix = 'prd:'
        }

        sAutoCancelQueueName = this.envPrefix + sAutoCancelQueueName;
        sAutoUpdateQueueName = this.envPrefix + sAutoUpdateQueueName;
    }

    initConnection() {
        return new Promise(async (resolve, reject) => {
            let oRedisOptions = {
                host: this.host,
                port: this.port,
                db: 0,
                options: {},
                retry_strategy(options) {
                    if (options.times_connected >= 10) {
                        return new Error('Retry attempts exhausted');
                    }
                    return 1 * 1000;
                }
            };

            if (this.password != undefined && this.password != null && this.password != '') {
                oRedisOptions.password = this.password;
            }

            this.client = oRedis.createClient(oRedisOptions);

            this.client.on('end', (err) => {
                console.log('REDIS connection has been closed');
                reject(err);
            });

            this.client.on('error', (err) => {
                console.log('REDIS client %o', err);
                reject(err);
            });

            this.client.on('connect', () => {
                console.log('REDIS connected');

                resolve(this.client);
            });
        });
    }

    async createAutoCancelJob(iOrderId, DbOrder, iMinutes) {
        this.initConnection().then(async function (oRedisConnection) {
            if (oRedisConnection != undefined) {
                let oRedisCon = oRedisConnection;

                const oQueueConfig = {
                    redis: oRedisCon,
                    isWorker: false,
                    getEvents: false,
                    sendEvents: true,
                    activateDelayedJobs: true,
                    removeOnSuccess: true
                }

                let autoCancelQueue = new Queue(sAutoCancelQueueName, oQueueConfig);
                try {
                    let iDelayInMinutes = 3;
                    if (iMinutes != undefined && iMinutes > 0) {
                        iDelayInMinutes = iMinutes;
                    }

                    let oDateTime = moment().tz('Asia/Seoul').add(iDelayInMinutes, 'm');
                    let oDelayed = oDateTime.toDate();

                    let sSqlDate = oDateTime.format("YYYY-MM-DD HH:mm:ss");
                    // Update db with cancel time
                    await DbOrder.updateCancelScheduleTime(iOrderId, sSqlDate);

                    const jobOrderAutoCancel = autoCancelQueue.createJob({ order_id: iOrderId });
                    jobOrderAutoCancel.delayUntil(oDelayed);
                    jobOrderAutoCancel.timeout(10000).retries(5);
                    jobOrderAutoCancel.save().then((job) => {
                        console.log('createAutoCancelJob', job.status);
                    }).catch(function (error) {
                        console.log('createAutoCancelJob failed ', error);
                    });
        
                } catch (error) {
                    console.log('createAutoCancelJob', error);
                }
            }
        });
    }

    async createAutoUpdateJob(iOrderId, iStoreId, iUserId, iMinutes) {
        this.initConnection().then(async function (oRedisConnection) {

            if (oRedisConnection != undefined) {
                let oRedisCon = oRedisConnection;
                const oQueueConfig = {
                    redis: oRedisCon,
                    isWorker: false,
                    getEvents: false,
                    sendEvents: true,
                    activateDelayedJobs: true,
                    removeOnSuccess: true
                }

                let autoUpdateQueue = new Queue(sAutoUpdateQueueName, oQueueConfig);
                try {
                    let iDelayInMinutes = 60;
                    if (iMinutes != undefined && iMinutes > 0) {
                        iDelayInMinutes = iMinutes;
                    }
                    let oDelayed = moment().tz('Asia/Seoul').add(iDelayInMinutes, 'm').toDate();

                    const jobOrderToPickedUp = autoUpdateQueue.createJob({ action: 'auto_complete_order', order_id: iOrderId, state_id: config.order['ORDER_PICKUP_COMPLETE'] });
                    jobOrderToPickedUp.delayUntil(oDelayed);
                    jobOrderToPickedUp.timeout(10000).retries(5);
                    jobOrderToPickedUp.save().then((job) => {
                        console.log('createAutoUpdateJob', job.status);
                    }).catch(function (error) {
                        console.log('createAutoUpdateJob failed ', error);
                    });
       
                } catch (error) {
                    console.log('createAutoUpdateJob', error);
                }
            }
        });
    }

    createPosNotifierProducer(iOrderId, iStoreId, iOrderUserId) {

        if (iStoreId === undefined || iStoreId === 0) {
            console.log('createPosNotifierProducer failed : store id > ' + iStoreId);
            return false;
        }

        let sEnvPrefix = this.envPrefix;
        this.initConnection().then(async function (oRedisConnection) {
            const oQueueConfig = {
                redis: oRedisConnection,
                isWorker: false,
                getEvents: false,
                sendEvents: true,
                removeOnSuccess: true
            }

            let sRedisQueueName = sEnvPrefix + 'redis-ws-pos:' + iStoreId;
            let posNotifierQueue = new Queue(sRedisQueueName, oQueueConfig);

            let oJobProp = {
                target: 'api-websocket-server',
                order_id: iOrderId,
                user_id: iOrderUserId,
                store_id: iStoreId,
                to_id: '#pos-' + iStoreId,
                message: { uuid: uuidv1(), action: 'REFRESH_ORDER', store_id: parseInt(iStoreId), send_time: 0 }
            }
             

            const jobNotifyPos = posNotifierQueue.createJob(oJobProp);
            jobNotifyPos.timeout(10000).retries(5);
            jobNotifyPos.save().then((job) => {
                console.log('createPosNotifierProducer', job.status);
            }).catch(function (error) {
                console.log('createPosNotifierProducer failed ', error);
            });
        });
    }

    createUserNotifierProducer(iOrderId, iStoreId, iOrderUserId, iStateId) {

        if (iOrderUserId === undefined || iOrderUserId === 0) {
            console.log('createUserNotifierProducer failed : user id > ' + iOrderUserId);
            return false;
        }

        let sEnvPrefix = this.envPrefix;
        this.initConnection().then(async function (oRedisConnection) {
            const oQueueConfig = {
                redis: oRedisConnection,
                isWorker: false,
                getEvents: false,
                sendEvents: true,
                removeOnSuccess: true
            }

            let sRedisQueueName = sEnvPrefix + 'redis-ws-user:' + iOrderUserId;
            let userNotifierQueue = new Queue(sRedisQueueName, oQueueConfig);

            let oJobProp = {
                target: 'api-websocket-server',
                order_id: iOrderId,
                user_id: iOrderUserId,
                store_id: iStoreId,
                to_id: '#user-order-' + iOrderUserId,
                message: { action: 'ORDER_STATUS', store_id: parseInt(iStoreId), state_id: iStateId, send_time: 0, order_id: iOrderId }
            }

            const jobNotifyUser = userNotifierQueue.createJob(oJobProp);
            jobNotifyUser.timeout(10000).retries(5);
            jobNotifyUser.save().then((job) => {
                console.log('createUserNotifierProducer', job.status);
            }).catch(function (error) {
                console.log('createUserNotifierProducer failed ', error);
            });

        });
    }
}

// This will be a singleton class. After first connection npm will cache this object for whole runtime.
// Every time you will call this getConnection() you will get the same connection back
module.exports = new Redis()