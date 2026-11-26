/**
 * Email (Resend) and payment (Stripe) clients that never crash the server at start-up.
 *
 * Without these helpers, a missing RESEND_API_KEY or STRIPE_*_KEY throws as soon as the file is loaded,
 * so the whole backend refuses to start (common on a new developer machine with no .env yet).
 * Now the server starts, prints one clear warning, and only the feature that needs the key reports an error when used.
 */
const warned = new Set();
const warnOnce = (msg) => { if (!warned.has(msg)) { warned.add(msg); console.warn(`[config] ${msg}`); } };

// A stand-in that throws a clear message the moment anything is called on it
const unavailable = (message) => {
    const make = () => new Proxy(function () {}, {
        get: (_t, prop) => (prop === 'then' ? undefined : make()),
        apply: () => { throw new Error(message); },
    });
    return make();
};

function getResend() {
    const key = process.env.RESEND_API_KEY;
    if (!key) {
        warnOnce('RESEND_API_KEY is not set: the server will run, but emails (contact form, birthday club, newsletters) will not be sent.');
        return unavailable('Email is not configured on this server (RESEND_API_KEY is missing).');
    }
    const { Resend } = require('resend');
    return new Resend(key);
}

function getStripe(key, name = 'STRIPE_SECRET_KEY') {
    if (!key) {
        warnOnce(`${name} is not set: the server will run, but payments for that area will not work.`);
        return unavailable(`Payments are not configured on this server (${name} is missing).`);
    }
    return require('stripe')(key);
}

module.exports = { getResend, getStripe };
