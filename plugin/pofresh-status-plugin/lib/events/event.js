const _statusService = require('../service/statusService');
const logger = require('pofresh-logger').getLogger(__filename);

const Event = function (app) {
    this.app = app;
    this.statusService = app.get('statusService');
};

module.exports = Event;

Event.prototype.bind_session = function (session) {
    if (!session.uid) {
        return;
    }
    this.statusService.add(session.uid, session.frontendId, err => {
        if (err) {
            logger.error('statusService add user failed: [%s] [%s], err: %j', session.uid, session.frontendId, err);
            return;
        }
    });
};

Event.prototype.close_session = function (session) {
    if (!session.uid) {
        return;
    }
    // don't remove entry if another session for the same user on the same frontend remain
    const currentUserSessions = this.app.get('sessionService').getByUid(session.uid);
    if (currentUserSessions !== undefined) {
        logger.debug(
            'at least another session exists for this user on this frontend: [%s] [%s]',
            session.uid,
            session.frontendId
        );
        return;
    }
    this.statusService.leave(session.uid, session.frontendId, err => {
        if (err) {
            logger.error(
                'failed to kick user in statusService: [%s] [%s], err: %j',
                session.uid,
                session.frontendId,
                err
            );
            return;
        }
    });
};
