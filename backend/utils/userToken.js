const jwt = require('jsonwebtoken');

function createToken(user) {
    return jwt.sign(
        {userId: user.id, role: 'citizen', tokenVersion: user.token_version ?? 0},
        process.env.USER_JWT_SECRET,
        {expiresIn: '7d'}
    );
}

module.exports = {createToken};
