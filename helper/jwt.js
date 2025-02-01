const expressJwt =  require('express-jwt');

function authJwt() {
    const secret = process.env.secret;
    const api = process.env.API_URL;
    return expressJwt({
            secret,
            algorithms: ['HS256'],
            isRevoked: isRevoked
        }).unless({
            path: [
                { url: /\/api\/v1\/student(.*)/, methods: ['OPTIONS', 'POST', 'GET'] },
                `${api}/student/login`,
                `${api}/student/register`,
                { url: /(.*)/},
            ],
        })
    }

    async function isRevoked(req, payload, done) {
        if (!payload.isAdmin) {
            done(null, true)
        }

        done();
    }

module.exports = authJwt;
