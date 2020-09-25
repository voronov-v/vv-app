"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.viewerResolvers = void 0;
const Google_1 = require("../../../lib/api/Google");
const crypto_1 = __importDefault(require("crypto"));
const utils_1 = require("../../../lib/utils");
const Stripe_1 = require("../../../lib/api/Stripe");
const cookieOptions = {
    httpOnly: true,
    sameSite: true,
    signed: true,
    secure: process.env.NODE_ENV !== 'development',
};
const logInViaCookie = (token, db, req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const updateRes = yield db.users.findOneAndUpdate({ _id: req.signedCookies.viewer }, { $set: { token } }, { returnOriginal: false });
    const viewer = updateRes.value;
    if (!viewer) {
        res.clearCookie('viewer', cookieOptions);
    }
    return viewer;
});
const logInViaGoogle = (code, token, db, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { user } = yield Google_1.Google.login(code);
    if (!user) {
        throw new Error('Google login error');
    }
    const userNamesList = user.names && user.names.length ? user.names : null;
    const userPhotosList = user.photos && user.photos.length ? user.photos : null;
    const userEmailsList = user.emailAddresses && user.emailAddresses.length ? user.emailAddresses : null;
    const userName = userNamesList ? userNamesList[0].displayName : null;
    const userId = userNamesList && userNamesList[0].metadata && userNamesList[0].metadata.source
        ? userNamesList[0].metadata.source.id
        : null;
    const userAvatar = userPhotosList && userPhotosList[0].url ? userPhotosList[0].url : null;
    const userEmail = userEmailsList && userEmailsList[0].value ? userEmailsList[0].value : null;
    if (!userName || !userId || !userAvatar || !userEmail) {
        throw new Error('Google login user data error ');
    }
    const updateRes = yield db.users.findOneAndUpdate({ _id: userId }, {
        $set: {
            name: userName,
            avatar: userAvatar,
            contact: userEmail,
            token,
        },
    }, { returnOriginal: false });
    let viewer = updateRes.value;
    if (!viewer) {
        const insertResult = yield db.users.insertOne({
            _id: userId,
            token,
            name: userName,
            avatar: userAvatar,
            contact: userEmail,
            income: 0,
            bookings: [],
            listings: [],
        });
        viewer = insertResult.ops[0];
    }
    res.cookie('viewer', userId, Object.assign(Object.assign({}, cookieOptions), { maxAge: 365 * 24 * 60 * 60 * 1000 }));
    return viewer;
});
exports.viewerResolvers = {
    Query: {
        authUrl: () => {
            try {
                return Google_1.Google.authUrl;
            }
            catch (err) {
                throw new Error(`Failed to query Google Auth Url: ${err}`);
            }
        },
    },
    Mutation: {
        logIn: (root, { input }, { db, req, res }) => __awaiter(void 0, void 0, void 0, function* () {
            try {
                const code = input ? input.code : null;
                const token = crypto_1.default.randomBytes(16).toString('hex');
                const viewer = code ? yield logInViaGoogle(code, token, db, res) : yield logInViaCookie(token, db, req, res);
                if (!viewer) {
                    return { didRequest: true };
                }
                return {
                    _id: viewer._id,
                    token: viewer.token,
                    avatar: viewer.avatar,
                    walledId: viewer.walletId,
                    didRequest: true,
                };
            }
            catch (err) {
                throw new Error(`Failed to log in: ${err}`);
            }
        }),
        logOut: (root, args, { res }) => {
            try {
                res.clearCookie('viewer', cookieOptions);
                return { didRequest: true };
            }
            catch (err) {
                throw new Error(`Failed to log out: ${err}`);
            }
        },
        connectStripe: (root, { input }, { db, req }) => __awaiter(void 0, void 0, void 0, function* () {
            try {
                const { code } = input;
                let viewer = yield utils_1.authorize(db, req);
                if (!viewer) {
                    throw new Error(`viewer can't be found`);
                }
                const wallet = yield Stripe_1.Stripe.connect(code);
                if (!wallet) {
                    throw new Error('stripe grant error');
                }
                const updateRes = yield db.users.findOneAndUpdate({ _id: viewer._id }, { $set: { walletId: wallet.stripe_user_id } }, { returnOriginal: true });
                if (!updateRes.value) {
                    throw new Error('viewer could not be updated');
                }
                viewer = updateRes.value;
                console.log('viewer', viewer);
                return {
                    _id: viewer === null || viewer === void 0 ? void 0 : viewer._id,
                    token: viewer === null || viewer === void 0 ? void 0 : viewer.token,
                    avatar: viewer === null || viewer === void 0 ? void 0 : viewer.avatar,
                    walledId: viewer === null || viewer === void 0 ? void 0 : viewer.walletId,
                    didRequest: true,
                };
            }
            catch (err) {
                throw new Error(`Failed to connect with Stripe: ${err}`);
            }
        }),
        disconnectStripe: (root, {}, { db, req }) => __awaiter(void 0, void 0, void 0, function* () {
            try {
                let viewer = yield utils_1.authorize(db, req);
                if (!viewer) {
                    throw new Error(`viewer can't be found`);
                }
                const updateRes = yield db.users.findOneAndUpdate({ _id: viewer._id }, 
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                //@ts-ignore
                { $set: { walletId: null } }, { returnOriginal: true });
                if (!updateRes.value) {
                    throw new Error('viewer could not be updated');
                }
                viewer = updateRes.value;
                return {
                    _id: viewer === null || viewer === void 0 ? void 0 : viewer._id,
                    token: viewer === null || viewer === void 0 ? void 0 : viewer.token,
                    avatar: viewer === null || viewer === void 0 ? void 0 : viewer.avatar,
                    walledId: viewer === null || viewer === void 0 ? void 0 : viewer.walletId,
                    didRequest: true,
                };
            }
            catch (err) {
                throw new Error(`Failed to disconnect with Stripe: ${err}`);
            }
        }),
    },
    Viewer: {
        id: (viewer) => {
            return viewer._id;
        },
        hasWallet: (viewer) => {
            return viewer.walledId ? true : undefined;
        },
    },
};
