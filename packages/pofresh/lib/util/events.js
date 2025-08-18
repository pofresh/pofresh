/**
 * Event constants used throughout the Pofresh framework
 * These constants define the standard events for server lifecycle,
 * session management, and administrative operations.
 */

/**
 * Server lifecycle events
 */
const SERVER_EVENTS = {
    ADD_SERVERS: 'add_servers',
    REMOVE_SERVERS: 'remove_servers',
    REPLACE_SERVERS: 'replace_servers'
};

/**
 * Session management events
 */
const SESSION_EVENTS = {
    BIND_SESSION: 'bind_session',
    UNBIND_SESSION: 'unbind_session',
    CLOSE_SESSION: 'close_session'
};

/**
 * Scheduled operation events
 */
const CRON_EVENTS = {
    ADD_CRONS: 'add_crons',
    REMOVE_CRONS: 'remove_crons'
};

/**
 * Server control events
 */
const CONTROL_EVENTS = {
    START_SERVER: 'start_server',
    START_ALL: 'start_all'
};

/**
 * Combined events object for backward compatibility
 */
const events = {
    ADD_SERVERS: SERVER_EVENTS.ADD_SERVERS,
    REMOVE_SERVERS: SERVER_EVENTS.REMOVE_SERVERS,
    REPLACE_SERVERS: SERVER_EVENTS.REPLACE_SERVERS,
    BIND_SESSION: SESSION_EVENTS.BIND_SESSION,
    UNBIND_SESSION: SESSION_EVENTS.UNBIND_SESSION,
    CLOSE_SESSION: SESSION_EVENTS.CLOSE_SESSION,
    ADD_CRONS: CRON_EVENTS.ADD_CRONS,
    REMOVE_CRONS: CRON_EVENTS.REMOVE_CRONS,
    START_SERVER: CONTROL_EVENTS.START_SERVER,
    START_ALL: CONTROL_EVENTS.START_ALL
};

module.exports = events;