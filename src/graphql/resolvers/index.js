"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvers = void 0;
const lodash_1 = require("lodash");
const Viewer_1 = require("./Viewer");
const User_1 = require("./User");
const Listing_1 = require("./Listing");
const Booking_1 = require("./Booking");
exports.resolvers = lodash_1.merge(Viewer_1.viewerResolvers, User_1.userResolvers, Listing_1.listingResolver, Booking_1.bookingResolver);
