/**
 * pofresh-rpc router module
 * Provides various routing algorithms for RPC load balancing
 */

const crc = require('crc');
const ConsistentHash = require('../util/consistentHash');
const logger = require('pofresh-logger').getLogger('pofresh-rpc', 'router');

/**
 * Default route algorithm using CRC32 hashing based on session uid
 *
 * @param {Object} session - session object for current rpc request
 * @param {Object} msg - rpc message {serverType, service, method, args, opts}
 * @param {Object} context - context of client
 * @param {Function} cb - callback function (err, serverId)
 */
function defRoute(session, msg, context, cb) {
    if (!msg || typeof msg !== 'object') {
        cb(new Error('Invalid RPC message'));
        return;
    }
    
    if (!msg.serverType) {
        cb(new Error('serverType is required in RPC message'));
        return;
    }
    
    if (!context || typeof context.getServersByType !== 'function') {
        cb(new Error('Invalid context object'));
        return;
    }
    
    if (typeof cb !== 'function') {
        logger.error('[pofresh-rpc] callback is required for defRoute');
        return;
    }
    
    try {
        const list = context.getServersByType(msg.serverType);
        if (!list || !Array.isArray(list) || list.length === 0) {
            cb(new Error(`can not find server info for type:${msg.serverType}`));
            return;
        }
        
        const uid = session?.uid || '';
        const index = Math.abs(crc.crc32(`${uid}`)) % list.length;
        cb(null, list[index].id);
    } catch (error) {
        logger.error('[pofresh-rpc] error in defRoute:', error);
        cb(error);
    }
}

/**
 * Random algorithm for calculating server id.
 *
 * @param {Object} client - rpc client
 * @param {string} serverType - rpc target serverType
 * @param {Object} _msg - rpc message (unused)
 * @param {Function} cb - callback function (err, serverId)
 */
function rdRoute(client, serverType, _msg, cb) {
    if (!client || !client._station || !client._station.serversMap) {
        cb(new Error('Invalid client or station configuration'));
        return;
    }
    
    if (!serverType || typeof serverType !== 'string') {
        cb(new Error('serverType must be a non-empty string'));
        return;
    }
    
    if (typeof cb !== 'function') {
        logger.error('[pofresh-rpc] callback is required for rdRoute');
        return;
    }
    
    try {
        const servers = client._station.serversMap[serverType];
        if (!servers || !Array.isArray(servers) || servers.length === 0) {
            cb(new Error(`rpc servers not exist with serverType: ${serverType}`));
            return;
        }
        
        const index = Math.floor(Math.random() * servers.length);
        cb(null, servers[index]);
    } catch (error) {
        logger.error('[pofresh-rpc] error in rdRoute:', error);
        cb(error);
    }
}

/**
 * Round-Robin algorithm for calculating server id.
 *
 * @param {Object} client - rpc client
 * @param {string} serverType - rpc target serverType
 * @param {Object} _msg - rpc message (unused)
 * @param {Function} cb - callback function (err, serverId)
 */
function rrRoute(client, serverType, _msg, cb) {
    if (!client || !client._station || !client._station.serversMap) {
        cb(new Error('Invalid client or station configuration'));
        return;
    }
    
    if (!serverType || typeof serverType !== 'string') {
        cb(new Error('serverType must be a non-empty string'));
        return;
    }
    
    if (typeof cb !== 'function') {
        logger.error('[pofresh-rpc] callback is required for rrRoute');
        return;
    }
    
    try {
        const servers = client._station.serversMap[serverType];
        if (!servers || !Array.isArray(servers) || servers.length === 0) {
            cb(new Error(`rpc servers not exist with serverType: ${serverType}`));
            return;
        }
        
        // Initialize round-robin parameters if not exists
        if (!client.rrParam) {
            client.rrParam = {};
        }
        
        // Get current index for this server type
        let index = client.rrParam[serverType] || 0;
        
        // Select server using round-robin
        const serverId = servers[index % servers.length];
        
        // Update index for next request
        index++;
        if (index >= Number.MAX_VALUE) {
            index = 0; // Reset to prevent overflow
        }
        client.rrParam[serverType] = index;
        
        cb(null, serverId);
    } catch (error) {
        logger.error('[pofresh-rpc] error in rrRoute:', error);
        cb(error);
    }
}

/**
 * Weight-Round-Robin algorithm for calculating server id.
 *
 * @param {Object} client - rpc client
 * @param {string} serverType - rpc target serverType
 * @param {Object} _msg - rpc message (unused)
 * @param {Function} cb - callback function (err, serverId)
 */
function wrrRoute(client, serverType, _msg, cb) {
    if (!client || !client._station || !client._station.serversMap || !client._station.servers) {
        cb(new Error('Invalid client or station configuration'));
        return;
    }
    
    if (!serverType || typeof serverType !== 'string') {
        cb(new Error('serverType must be a non-empty string'));
        return;
    }
    
    if (typeof cb !== 'function') {
        logger.error('[pofresh-rpc] callback is required for wrrRoute');
        return;
    }
    
    try {
        const servers = client._station.serversMap[serverType];
        if (!servers || !Array.isArray(servers) || servers.length === 0) {
            cb(new Error(`rpc servers not exist with serverType: ${serverType}`));
            return;
        }
        
        // Initialize weight-round-robin parameters if not exists
        if (!client.wrrParam) {
            client.wrrParam = {};
        }
        
        let index, weight;
        if (client.wrrParam[serverType]) {
            index = client.wrrParam[serverType].index;
            weight = client.wrrParam[serverType].weight;
        } else {
            index = -1;
            weight = 0;
        }
        
        // Get maximum weight among all servers
        const getMaxWeight = () => {
            let maxWeight = -1;
            for (let i = 0; i < servers.length; i++) {
                const server = client._station.servers[servers[i]];
                if (server && typeof server.weight === 'number' && server.weight > maxWeight) {
                    maxWeight = server.weight;
                }
            }
            return maxWeight;
        };
        
        // Weighted round-robin algorithm
        while (true) {
            index = (index + 1) % servers.length;
            if (index === 0) {
                weight -= 1;
                if (weight <= 0) {
                    weight = getMaxWeight();
                    if (weight <= 0) {
                        cb(new Error('rpc wrr route get invalid weight'));
                        return;
                    }
                }
            }
            
            const server = client._station.servers[servers[index]];
            if (server && server.weight >= weight) {
                client.wrrParam[serverType] = {
                    index,
                    weight
                };
                cb(null, server.id);
                return;
            }
        }
    } catch (error) {
        logger.error('[pofresh-rpc] error in wrrRoute:', error);
        cb(error);
    }
}

/**
 * Least-Active algorithm for calculating server id.
 *
 * @param {Object} client - rpc client
 * @param {string} serverType - rpc target serverType
 * @param {Object} _msg - rpc message (unused)
 * @param {Function} cb - callback function (err, serverId)
 */
function laRoute(client, serverType, _msg, cb) {
    if (!client || !client._station || !client._station.serversMap) {
        cb(new Error('Invalid client or station configuration'));
        return;
    }
    
    if (!serverType || typeof serverType !== 'string') {
        cb(new Error('serverType must be a non-empty string'));
        return;
    }
    
    if (typeof cb !== 'function') {
        logger.error('[pofresh-rpc] callback is required for laRoute');
        return;
    }
    
    try {
        const servers = client._station.serversMap[serverType];
        if (!servers || !Array.isArray(servers) || servers.length === 0) {
            cb(new Error(`rpc servers not exist with serverType: ${serverType}`));
            return;
        }
        
        // Initialize least-active parameters if not exists
        if (!client.laParam) {
            client.laParam = {};
        }
        
        const actives = [];
        if (client.laParam[serverType]) {
            // Get existing active counts
            for (let j = 0; j < servers.length; j++) {
                let count = client.laParam[serverType][servers[j]];
                if (!count) {
                    client.laParam[serverType][servers[j]] = count = 0;
                }
                actives.push(count);
            }
        } else {
            // Initialize active counts for new server type
            client.laParam[serverType] = {};
            for (let i = 0; i < servers.length; i++) {
                client.laParam[serverType][servers[i]] = 0;
                actives.push(0);
            }
        }
        
        // Find servers with minimum active count
        const leastActiveServers = [];
        let minInvoke = Number.MAX_VALUE;
        
        for (let k = 0; k < actives.length; k++) {
            if (actives[k] < minInvoke) {
                minInvoke = actives[k];
                leastActiveServers.length = 0; // Clear array
                leastActiveServers.push(servers[k]);
            } else if (actives[k] === minInvoke) {
                leastActiveServers.push(servers[k]);
            }
        }
        
        // Randomly select from least active servers
        const index = Math.floor(Math.random() * leastActiveServers.length);
        const serverId = leastActiveServers[index];
        
        // Increment active count for selected server
        client.laParam[serverType][serverId] += 1;
        
        cb(null, serverId);
    } catch (error) {
        logger.error('[pofresh-rpc] error in laRoute:', error);
        cb(error);
    }
}

/**
 * Consistent-Hash algorithm for calculating server id.
 *
 * @param {Object} client - rpc client
 * @param {string} serverType - rpc target serverType
 * @param {Object} msg - rpc message
 * @param {Function} cb - callback function (err, serverId)
 */
function chRoute(client, serverType, msg, cb) {
    if (!client || !client._station || !client._station.serversMap) {
        cb(new Error('Invalid client or station configuration'));
        return;
    }
    
    if (!serverType || typeof serverType !== 'string') {
        cb(new Error('serverType must be a non-empty string'));
        return;
    }
    
    if (!msg || typeof msg !== 'object') {
        cb(new Error('Invalid RPC message'));
        return;
    }
    
    if (typeof cb !== 'function') {
        logger.error('[pofresh-rpc] callback is required for chRoute');
        return;
    }
    
    try {
        const servers = client._station.serversMap[serverType];
        if (!servers || !Array.isArray(servers) || servers.length === 0) {
            cb(new Error(`rpc servers not exist with serverType: ${serverType}`));
            return;
        }
        
        // Initialize consistent-hash parameters if not exists
        if (!client.chParam) {
            client.chParam = {};
        }
        
        let con;
        if (client.chParam[serverType]) {
            con = client.chParam[serverType].consistentHash;
        } else {
            client.opts.station = client._station;
            con = new ConsistentHash(servers, client.opts);
        }
        
        // Get hash field for consistent hashing
        const hashFieldIndex = client.opts.hashFieldIndex;
        const field = msg.args?.[hashFieldIndex] || JSON.stringify(msg);
        
        const serverId = con.getNode(field);
        client.chParam[serverType] = {
            consistentHash: con
        };
        
        cb(null, serverId);
    } catch (error) {
        logger.error('[pofresh-rpc] error in chRoute:', error);
        cb(error);
    }
}

module.exports = {
    rr: rrRoute,
    wrr: wrrRoute,
    la: laRoute,
    ch: chRoute,
    rd: rdRoute,
    df: defRoute
};
