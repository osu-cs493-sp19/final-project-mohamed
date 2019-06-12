const jwt = require('jsonwebtoken');

// XXX: In production this should be loaded from some secret manager
const secretKey = 'aishoo7ri7siepieceizo5riloovee6thieV5aequeiz3or0aeshejoo2ahjeehu';

exports.generateAuthToken = function (userId) {
    const payload = {
        sub: userId
    };
    const token = jwt.sign(payload, secretKey, { expiresIn: '24h' });
    return token;
};

// Check authenticated user, but don't error if authentication is invalid or not present
exports.checkAuthToken = function (req, res, next) {
    const authHeader = req.get('Authorization') || '';
    const authHeaderParts = authHeader.split(' ');
    const token = authHeaderParts[0] === 'Bearer' ? authHeaderParts[1] : null;

    try {
        const payload = jwt.verify(token, secretKey);
        req.user = payload.sub;
    } catch (err) {
        console.log(err);
        req.user = null;
    }
    next();
};
