const stripeKids = require('stripe')(process.env.STRIPE_KIDS_SECRET_KEY || process.env.STRIPE_SECRET_KEY);
const stripePrayer = require('stripe')(process.env.STRIPE_PRAYER_SECRET_KEY || process.env.STRIPE_SECRET_KEY);
const stripeEvents = require('stripe')(process.env.STRIPE_EVENTS_SECRET_KEY || process.env.STRIPE_SECRET_KEY);
const stripeDonations = require('stripe')(process.env.STRIPE_DONATIONS_SECRET_KEY || process.env.STRIPE_SECRET_KEY);
const stripeFilms = require('stripe')(process.env.STRIPE_FILMS_SECRET_KEY || process.env.STRIPE_SECRET_KEY);
const stripeDefault = require('stripe')(process.env.STRIPE_SECRET_KEY);

const getStripeClient = (type) => {
  switch (type) {
    case 'kids_subscription':
      return stripeKids;
    case 'prayer_access':
      return stripePrayer;
    case 'event_ticket':
      return stripeEvents;
    case 'donation':
      return stripeDonations;
    case 'film_purchase':
      return stripeFilms;
    default:
      return stripeDefault;
  }
};

const retrieveStripeSession = async (sessionId) => {
  const clients = [
    { name: 'kids_subscription', client: stripeKids },
    { name: 'event_ticket', client: stripeEvents },
    { name: 'prayer_access', client: stripePrayer },
    { name: 'donation', client: stripeDonations },
    { name: 'film_purchase', client: stripeFilms },
    { name: 'default', client: stripeDefault }
  ];

  for (const item of clients) {
    try {
      const session = await item.client.checkout.sessions.retrieve(sessionId);
      if (session) {
        return { session, client: item.client };
      }
    } catch (e) {
      // ignore and try next client
    }
  }
  return null;
};

const User = require('../models/User');
const Event = require('../models/Event');
const Ticket = require('../models/Ticket');
const KidsPurchase = require('../models/KidsPurchase');
const Setting = require('../models/Setting');
const PromoCode = require('../models/PromoCode');
const PrayerSeason = require('../models/PrayerSeason');
const PrayerAccess = require('../models/PrayerAccess');
const Film = require('../models/Film');
const Purchase = require('../models/Purchase');
const Donation = require('../models/Donation');
const Campaign = require('../models/Campaign');

exports.createCheckoutSession = async (req, res) => {
  try {
    const { type, successUrl, cancelUrl } = req.body;

    if (!successUrl || !cancelUrl) {
      return res.status(400).json({ success: false, message: 'successUrl and cancelUrl are required' });
    }

    let line_items = [];
    let metadata = { type };

    if (type === 'kids_subscription') {
      const { plan } = req.body;
      if (!plan) return res.status(400).json({ success: false, message: 'Plan is required' });

      // Retrieve plan settings from database
      let planSettings = { lifetimePrice: 99, monthlyPrice: 4.99, yearlyPrice: 49.99 };
      try {
        const setting = await Setting.findOne({ key: 'kidsPlanSettings' });
        if (setting) {
          planSettings = JSON.parse(setting.value);
        }
      } catch (e) {
        console.error('Error fetching plan settings:', e.message);
      }

      let price = 0;
      let planName = '';

      if (plan === 'lifetime') {
        price = planSettings.lifetimePrice;
        planName = 'KidsBibleFlix Lifetime Access';
      } else if (plan === 'monthly') {
        price = planSettings.monthlyPrice;
        planName = 'KidsBibleFlix Monthly Premium Access';
      } else if (plan === 'yearly') {
        price = planSettings.yearlyPrice;
        planName = 'KidsBibleFlix Yearly Premium Access';
      } else if (plan === 'ministry') {
        price = 14.99;
        planName = 'KidsBibleFlix Ministry Partner Subscription';
      } else {
        return res.status(400).json({ success: false, message: 'Invalid plan' });
      }

      line_items.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: planName,
          },
          unit_amount: Math.round(price * 100),
        },
        quantity: 1,
      });

      metadata.userId = req.user ? req.user.id : (req.body.userId || 'guest');
      metadata.plan = plan;
      metadata.amount = `$${price}`;
      metadata.name = req.user ? req.user.name : (req.body.name || 'Guest');
      metadata.email = req.user ? req.user.email : (req.body.email || '');

    } else if (type === 'event_ticket') {
      const { eventId, city, showtimeId, categoryName, quantity, promoCode } = req.body;
      if (!eventId || !city || !showtimeId || !quantity) {
        return res.status(400).json({ success: false, message: 'Required fields missing for event ticket' });
      }

      const event = await Event.findById(eventId);
      if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

      let ticketPrice = event.price;
      let selectedCategory = null;
      let numTickets = parseInt(quantity) || 1;

      if (categoryName && event.categories && event.categories.length > 0) {
        selectedCategory = event.categories.find(c => c.name === categoryName);
        if (!selectedCategory) return res.status(400).json({ success: false, message: 'Invalid category selected' });
        ticketPrice = parseFloat(selectedCategory.price) || 0;
      } else {
        ticketPrice = parseFloat(ticketPrice.toString().replace(/[^0-9.]/g, '')) || 0;
      }

      let appliedPromo = null;
      if (promoCode) {
        appliedPromo = await PromoCode.findOne({ code: promoCode.toUpperCase() });
        if (appliedPromo && appliedPromo.isActive && (appliedPromo.maxUses === 0 || appliedPromo.usedCount < appliedPromo.maxUses)) {
          ticketPrice = ticketPrice - (ticketPrice * (appliedPromo.discountPercentage / 100));
        } else {
          return res.status(400).json({ success: false, message: 'Invalid or expired promo code' });
        }
      }

      line_items.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${event.name} Ticket (${categoryName || 'General'})`,
            description: `${city} - ${showtimeId}`,
          },
          unit_amount: Math.round(ticketPrice * 100),
        },
        quantity: numTickets,
      });

      metadata.userId = req.user ? req.user.id : (req.body.userId || 'guest');
      metadata.eventId = eventId;
      metadata.city = city;
      metadata.showtimeId = showtimeId;
      metadata.categoryName = categoryName || 'General';
      metadata.quantity = numTickets.toString();
      metadata.promoCode = promoCode || '';
      metadata.pricePaid = ticketPrice.toString();


    } else if (type === 'cart_checkout') {
      const { items } = req.body;
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: 'Items are required for cart checkout' });
      }

      line_items = items.map(item => ({
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.name,
            images: item.image ? [item.image] : [],
          },
          unit_amount: Math.round(parseFloat(item.price) * 100),
        },
        quantity: item.quantity,
      }));

      // Add Shipping
      line_items.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Shipping & Handling',
          },
          unit_amount: 599,
        },
        quantity: 1,
      });

      metadata.userId = req.user ? req.user.id : 'guest';
      metadata.itemsJson = JSON.stringify(items.map(i => ({ id: i.id, quantity: i.quantity })));

    } else if (type === 'prayer_access') {
      const { seriesId } = req.body;
      if (!seriesId) return res.status(400).json({ success: false, message: 'seriesId is required for prayer access' });

      const season = await PrayerSeason.findById(seriesId);
      if (!season) return res.status(404).json({ success: false, message: 'Prayer season not found' });

      line_items.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: season.title,
            description: `Week of Prayer Registration - ${season.theme || ''}`,
            images: season.bannerImage ? [season.bannerImage] : []
          },
          unit_amount: Math.round((season.price || 29) * 100)
        },
        quantity: 1
      });

      metadata.userId = req.user ? req.user.id : 'guest';
      metadata.seasonId = seriesId;
      metadata.seasonTitle = season.title;

    } else if (type === 'film_purchase') {
      const { filmId, purchaseType } = req.body;
      if (!filmId || !purchaseType) {
        return res.status(400).json({ success: false, message: 'filmId and purchaseType are required' });
      }

      const film = await Film.findById(filmId);
      if (!film) return res.status(404).json({ success: false, message: 'Film not found' });

      const priceStr = purchaseType === 'buy' ? film.price : film.rentPrice;
      const priceNum = parseFloat(priceStr.toString().replace(/[^0-9.]/g, '')) || 0;

      line_items.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: film.title,
            description: purchaseType === 'buy' ? 'Digital HD Purchase' : '48-Hour Rental',
            images: film.thumbnail ? [film.thumbnail] : []
          },
          unit_amount: Math.round(priceNum * 100)
        },
        quantity: 1
      });

      metadata.userId = req.user ? req.user.id : 'guest';
      metadata.filmId = filmId;
      metadata.filmTitle = film.title;
      metadata.purchaseType = purchaseType;
      metadata.amount = priceNum.toString();

    } else if (type === 'donation') {
      const { amount, donationType, campaignId, firstName, lastName, email, isLegacy } = req.body;
      if (!amount || !donationType || !email) {
        return res.status(400).json({ success: false, message: 'amount, donationType and email are required for donations' });
      }

      const priceNum = parseFloat(amount.toString()) || 0;
      if (priceNum <= 0) {
        return res.status(400).json({ success: false, message: 'Donation amount must be greater than zero' });
      }

      const priceData = {
        currency: 'usd',
        product_data: {
          name: `Donation to OMS - ${donationType === 'monthly' ? 'Monthly' : donationType === 'annual' ? 'Annual' : 'One-time'} Stewardship`,
        },
        unit_amount: Math.round(priceNum * 100),
      };

      if (donationType === 'monthly' || donationType === 'annual') {
        priceData.recurring = {
          interval: donationType === 'monthly' ? 'month' : 'year'
        };
      }

      line_items.push({
        price_data: priceData,
        quantity: 1
      });

      metadata.userId = req.user ? req.user.id : 'guest';
      metadata.firstName = firstName || 'Guest';
      metadata.lastName = lastName || 'Donor';
      metadata.email = email;
      metadata.campaignId = campaignId || '';
      metadata.isLegacy = isLegacy ? 'true' : 'false';
      metadata.donationType = donationType;
      metadata.amount = priceNum.toString();

    } else {
      return res.status(400).json({ success: false, message: 'Invalid checkout type' });
    }

    let sessionMode = 'payment';
    if (type === 'donation' && (req.body.donationType === 'monthly' || req.body.donationType === 'annual')) {
      sessionMode = 'subscription';
    }

    const activeStripe = getStripeClient(type);
    const session = await activeStripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: sessionMode,
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      metadata,
    });

    res.status(200).json({ success: true, url: session.url, sessionId: session.id });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.verifyCheckoutSession = async (req, res) => {
  try {
    const { sessionId } = req.query;
    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'sessionId parameter is required' });
    }

    const sessionResult = await retrieveStripeSession(sessionId);
    if (!sessionResult) {
      return res.status(404).json({ success: false, message: 'Stripe session not found in any configured account' });
    }

    const { session } = sessionResult;

    if (session.payment_status !== 'paid') {
      return res.status(400).json({ success: false, message: 'Payment not completed' });
    }

    const metadata = session.metadata;
    const type = metadata.type;

    if (type === 'kids_subscription') {
      const { userId, plan, amount, name, email } = metadata;

      // Check if purchase already recorded
      let purchase = await KidsPurchase.findOne({ stripeSessionId: sessionId });
      if (!purchase) {
        const planPriceMap = { 
          lifetime: null, 
          monthly: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 
          yearly: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          ministry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        };
        const expiresAt = planPriceMap[plan] || null;

        purchase = new KidsPurchase({
          userId: userId || null,
          name,
          email,
          plan,
          amount,
          status: 'active',
          source: 'stripe',
          stripeSessionId: sessionId,
          purchasedAt: new Date(),
          expiresAt,
        });
        await purchase.save();

        // Update user profile kidsAccess
        const updateFields = {
          kidsAccess: true,
          kidsAccessType: plan,
          kidsAccessGrantedAt: new Date(),
          kidsAccessExpiry: expiresAt,
          kidsAccessSource: 'stripe',
        };

        if (userId) {
          await User.findByIdAndUpdate(userId, updateFields);
        } else if (email) {
          await User.findOneAndUpdate({ email }, updateFields);
        }
      }

      res.status(200).json({ success: true, type, purchase });

    } else if (type === 'event_ticket') {
      const { userId, eventId, city, showtimeId, categoryName, quantity, promoCode, pricePaid } = metadata;
      const numTickets = parseInt(quantity) || 1;

      // Check if tickets already recorded
      let tickets = await Ticket.find({ stripeSessionId: sessionId });
      if (tickets.length === 0) {
        const event = await Event.findById(eventId);
        if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

        let selectedCategory = null;
        if (categoryName && event.categories && event.categories.length > 0) {
          selectedCategory = event.categories.find(c => c.name === categoryName);
        }

        const ticketsToCreate = [];
        for (let i = 0; i < numTickets; i++) {
          const ticketId = `TKT-${Math.floor(1000 + Math.random() * 9000)}-${Date.now().toString().slice(-4)}-${i}`;
          ticketsToCreate.push({
            user: userId,
            event: eventId,
            city,
            showtimeId,
            ticketId,
            pricePaid: pricePaid || '0',
            status: 'Paid',
            category: categoryName || 'General',
            stripeSessionId: sessionId
          });
        }

        tickets = await Ticket.insertMany(ticketsToCreate);

        // Update Event counters
        event.ticketsSold += numTickets;
        if (selectedCategory) {
          selectedCategory.available = Math.max(0, selectedCategory.available - numTickets);
        }
        await event.save();

        // Update PromoCode uses
        if (promoCode) {
          const appliedPromo = await PromoCode.findOne({ code: promoCode.toUpperCase() });
          if (appliedPromo) {
            appliedPromo.usedCount += 1;
            await appliedPromo.save();
          }
        }
      }

      res.status(200).json({ success: true, type, ticket: tickets[0] });

    } else if (type === 'cart_checkout') {
      res.status(200).json({ success: true, type });

    } else if (type === 'prayer_access') {
      const { seasonId, seasonTitle } = metadata;

      let access = await PrayerAccess.findOne({ email: session.customer_details ? session.customer_details.email : 'guest@example.com' });
      if (!access) {
        const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year
        access = new PrayerAccess({
          name: session.customer_details ? (session.customer_details.name || 'Guest User') : 'Guest User',
          email: session.customer_details ? (session.customer_details.email || 'guest@example.com') : 'guest@example.com',
          status: 'Active',
          expires: expiresAt.toISOString()
        });
        await access.save();
      }

      res.status(200).json({ success: true, type, seasonId, seasonTitle });

    } else if (type === 'film_purchase') {
      const { filmId, filmTitle, purchaseType, amount } = metadata;

      let purchase = await Purchase.findOne({
        filmId,
        user: session.customer_details ? (session.customer_details.name || 'Guest User') : 'Guest User',
        type: purchaseType === 'buy' ? 'Buy' : 'Rent'
      });

      const expiresAt = purchaseType === 'rent' ? new Date(Date.now() + 48 * 60 * 60 * 1000) : null;

      if (!purchase) {
        purchase = new Purchase({
          user: session.customer_details ? (session.customer_details.name || 'Guest User') : 'Guest User',
          filmId,
          filmTitle,
          type: purchaseType === 'buy' ? 'Buy' : 'Rent',
          amount: `$${amount}`,
          expiresAt
        });
        await purchase.save();

        try {
          await Film.findByIdAndUpdate(filmId, { $inc: { sales: 1, purchases: 1 } });
        } catch (e) {
          console.error("Failed to update Film sales count:", e.message);
        }
      }

      res.status(200).json({
        success: true,
        type,
        filmId,
        filmTitle,
        purchaseType,
        expiresAt: expiresAt ? expiresAt.toISOString() : null
      });

    } else if (type === 'donation') {
      const { firstName, lastName, email, campaignId, isLegacy, donationType, amount } = metadata;

      const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
      let donation = await Donation.findOne({
        email: email.toLowerCase(),
        amount: parseFloat(amount),
        createdAt: { $gte: fiveMinsAgo }
      });

      let campaignTitle = 'General Fund';
      if (campaignId) {
        try {
          const campaign = await Campaign.findById(campaignId);
          if (campaign) campaignTitle = campaign.title;
        } catch (e) {
          console.error("Failed to fetch campaign:", e.message);
        }
      }

      if (!donation) {
        donation = new Donation({
          firstName,
          lastName,
          email,
          amount: parseFloat(amount),
          type: donationType,
          campaignId: campaignId || null,
          isLegacy: isLegacy === 'true',
          status: 'Completed'
        });
        await donation.save();

        if (campaignId) {
          try {
            await Campaign.findByIdAndUpdate(campaignId, { $inc: { raised: parseFloat(amount) } });
          } catch (e) {
            console.error("Failed to update campaign raised amount:", e.message);
          }
        }
      }

      res.status(200).json({
        success: true,
        type,
        amount,
        campaignTitle
      });

    } else {
      res.status(400).json({ success: false, message: 'Invalid session type metadata' });
    }

  } catch (error) {
    console.error('Error verifying checkout session:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
