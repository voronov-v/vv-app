"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bookingResolver = void 0;
exports.bookingResolver = {
    Mutation: {
        createBooking: () => {
            return 'Mutation.createBooking';
        },
    },
    Booking: {
        id: (booking) => {
            return booking._id.toString();
        },
        listing: (booking, args, { db }) => {
            return db.listings.findOne({ _id: booking.listing });
        },
    },
};
