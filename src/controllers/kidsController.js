const KidsSeries = require('../models/KidsSeries');
const KidsEpisode = require('../models/KidsEpisode');
const KidsPurchase = require('../models/KidsPurchase');
const Setting = require('../models/Setting');
const User = require('../models/User');

// ─── SERIES ──────────────────────────────────────────────────────────────────

exports.createSeries = async (req, res) => {
  try {
    const series = new KidsSeries(req.body);
    await series.save();

    if (series.trailer) {
      const introEpisode = new KidsEpisode({
        seriesId: series._id,
        title: req.body.trailerTitle || "Introduction",
        description: req.body.trailerDescription || "Series Introduction Video",
        vimeoLink: series.trailer,
        image: series.image,
        length: "00:00"
      });
      await introEpisode.save();
    }

    if (series.audioLink) {
      const audioIntroEpisode = new KidsEpisode({
        seriesId: series._id,
        title: req.body.audioTitle || "Audio Introduction",
        description: req.body.audioDescription || "Series Audio Introduction",
        audioLink: series.audioLink,
        image: series.image,
        length: "00:00"
      });
      await audioIntroEpisode.save();
    }

    res.status(201).json(series);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getAllSeries = async (req, res) => {
  try {
    console.log("getAllSeries: starting");
    const series = await KidsSeries.find().sort('-createdAt');
    const hasAccess = req.user && (req.user.kidsAccess || req.user.role === 'admin');
    const enriched = await Promise.all(
      series.map(async (s) => {
        const episodes = await KidsEpisode.find({ seriesId: s._id }, 'views');
        const count = episodes.length;
        const totalViews = episodes.reduce((sum, ep) => sum + (ep.views || 0), 0);
        const obj = s.toObject();
        if (!hasAccess) {
          delete obj.trailer;
          delete obj.audioLink;
        }
        return { ...obj, episodeCount: count, totalViews };
      })
    );
    res.json(enriched);
  } catch (error) {
    console.log("getAllSeries: err", error.message);
    res.status(500).json({ message: error.message });
  }
};

exports.getSeriesById = async (req, res) => {
  try {
    const series = await KidsSeries.findById(req.params.id);
    if (!series) return res.status(404).json({ message: 'Series not found' });
    const hasAccess = req.user && (req.user.kidsAccess || req.user.role === 'admin');
    const obj = series.toObject();
    if (!hasAccess) {
      delete obj.trailer;
      delete obj.audioLink;
    }
    res.json(obj);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateSeries = async (req, res) => {
  try {
    const series = await KidsSeries.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(series);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteSeries = async (req, res) => {
  try {
    await KidsSeries.findByIdAndDelete(req.params.id);
    await KidsEpisode.deleteMany({ seriesId: req.params.id });
    res.json({ message: 'Series and its episodes deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── EPISODES ────────────────────────────────────────────────────────────────

exports.createEpisode = async (req, res) => {
  try {
    const episode = new KidsEpisode({ ...req.body, seriesId: req.params.seriesId });
    await episode.save();
    res.status(201).json(episode);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getEpisodesBySeries = async (req, res) => {
  try {
    const episodes = await KidsEpisode.find({ seriesId: req.params.seriesId }).sort('createdAt');
    const hasAccess = req.user && (req.user.kidsAccess || req.user.role === 'admin');
    if (!hasAccess) {
      const stripped = episodes.map(ep => {
        const obj = ep.toObject();
        delete obj.vimeoLink;
        delete obj.audioLink;
        return obj;
      });
      return res.json(stripped);
    }
    res.json(episodes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateEpisode = async (req, res) => {
  try {
    const episode = await KidsEpisode.findByIdAndUpdate(req.params.episodeId, req.body, { new: true });
    res.json(episode);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteEpisode = async (req, res) => {
  try {
    await KidsEpisode.findByIdAndDelete(req.params.episodeId);
    res.json({ message: 'Episode deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── VIEW TRACKING ───────────────────────────────────────────────────────────

exports.trackEpisodeView = async (req, res) => {
  try {
    const episode = await KidsEpisode.findByIdAndUpdate(
      req.params.episodeId,
      { $inc: { views: 1 } },
      { new: true }
    );
    if (!episode) return res.status(404).json({ message: 'Episode not found' });
    await KidsSeries.findByIdAndUpdate(episode.seriesId, { $inc: { views: 1 } });
    res.json({ views: episode.views });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getSeriesViews = async (req, res) => {
  try {
    const episodes = await KidsEpisode.find({ seriesId: req.params.id }, 'views');
    const totalViews = episodes.reduce((sum, ep) => sum + (ep.views || 0), 0);
    res.json({ totalViews });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── ANALYTICS ───────────────────────────────────────────────────────────────

exports.getAnalytics = async (req, res) => {
  try {
    const allSeries = await KidsSeries.find({}, 'name views');
    const allEpisodes = await KidsEpisode.find({}, 'title views seriesId').sort({ views: -1 }).limit(10);

    const seriesAnalytics = await Promise.all(
      allSeries.map(async (s) => {
        const eps = await KidsEpisode.find({ seriesId: s._id }, 'views');
        const totalViews = eps.reduce((sum, ep) => sum + (ep.views || 0), 0);
        return { name: s.name, views: totalViews };
      })
    );
    seriesAnalytics.sort((a, b) => b.views - a.views);
    const totalViews = seriesAnalytics.reduce((sum, s) => sum + s.views, 0);

    const seriesMap = {};
    allSeries.forEach(s => { seriesMap[s._id.toString()] = s.name; });

    const topEpisodes = allEpisodes.map(ep => ({
      title: ep.title,
      series: seriesMap[ep.seriesId?.toString()] || 'Unknown',
      views: ep.views || 0
    }));

    // Subscriber stats
    const totalSubscribers = await KidsPurchase.countDocuments({ status: 'active' });
    const lifetimeCount = await KidsPurchase.countDocuments({ plan: 'lifetime', status: 'active' });
    const monthlyCount = await KidsPurchase.countDocuments({ plan: 'monthly', status: 'active' });
    const yearlyCount = await KidsPurchase.countDocuments({ plan: 'yearly', status: 'active' });

    // Revenue totals (strip $ sign and sum)
    const allPurchases = await KidsPurchase.find({ status: 'active' }, 'amount');
    const totalRevenue = allPurchases.reduce((sum, p) => {
      const val = parseFloat((p.amount || '0').replace(/[^0-9.]/g, ''));
      return sum + (isNaN(val) ? 0 : val);
    }, 0);

    // Monthly join trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const recentPurchases = await KidsPurchase.find({
      purchasedAt: { $gte: sixMonthsAgo }
    }, 'purchasedAt amount');

    const monthlyTrend = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      monthlyTrend[key] = { month: key, subscribers: 0, revenue: 0 };
    }
    recentPurchases.forEach(p => {
      const key = new Date(p.purchasedAt).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      if (monthlyTrend[key]) {
        monthlyTrend[key].subscribers++;
        const val = parseFloat((p.amount || '0').replace(/[^0-9.]/g, ''));
        monthlyTrend[key].revenue += isNaN(val) ? 0 : val;
      }
    });

    res.json({
      totalViews,
      seriesAnalytics,
      topEpisodes,
      subscriberStats: {
        total: totalSubscribers,
        lifetime: lifetimeCount,
        monthly: monthlyCount,
        yearly: yearlyCount,
        totalRevenue: totalRevenue.toFixed(2),
      },
      monthlyTrend: Object.values(monthlyTrend),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── SETTINGS ────────────────────────────────────────────────────────────────

exports.getKidsSettings = async (req, res) => {
  try {
    let setting = await Setting.findOne({ key: 'kidsHeroBanner' });
    if (!setting) {
      setting = new Setting({ key: 'kidsHeroBanner', value: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=2000' });
      await setting.save();
    }
    res.json(setting);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateKidsSettings = async (req, res) => {
  try {
    const { value } = req.body;
    let setting = await Setting.findOne({ key: 'kidsHeroBanner' });
    if (!setting) {
      setting = new Setting({ key: 'kidsHeroBanner', value });
    } else {
      setting.value = value;
    }
    await setting.save();
    res.json(setting);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// ─── PURCHASES / SUBSCRIPTIONS ───────────────────────────────────────────────

// POST /api/kids/purchase  — called after payment success
exports.createPurchase = async (req, res) => {
  try {
    const { userId, name, email, plan, amount, source, stripeSessionId, notes } = req.body;

    const planPriceMap = { lifetime: null, monthly: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), yearly: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) };
    const expiresAt = planPriceMap[plan] || null;

    const purchase = new KidsPurchase({
      userId: userId || null,
      name,
      email,
      plan,
      amount,
      status: 'active',
      source: source || 'stripe',
      stripeSessionId: stripeSessionId || null,
      purchasedAt: new Date(),
      expiresAt,
      notes: notes || '',
    });
    await purchase.save();

    // Update the user's kidsAccess if userId is provided
    if (userId) {
      await User.findByIdAndUpdate(userId, {
        kidsAccess: true,
        kidsAccessType: plan,
        kidsAccessGrantedAt: new Date(),
        kidsAccessExpiry: expiresAt,
        kidsAccessSource: source || 'stripe',
      });
    } else if (email) {
      // Try to find user by email and update
      await User.findOneAndUpdate({ email }, {
        kidsAccess: true,
        kidsAccessType: plan,
        kidsAccessGrantedAt: new Date(),
        kidsAccessExpiry: expiresAt,
        kidsAccessSource: source || 'stripe',
      });
    }

    res.status(201).json({ success: true, data: purchase });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// GET /api/kids/purchases — list all (admin)
exports.getAllPurchases = async (req, res) => {
  try {
    const purchases = await KidsPurchase.find().sort('-createdAt');
    res.json({ success: true, data: purchases });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/kids/access — check current user's access (protected route)
exports.checkAccess = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, hasAccess: false });

    let hasAccess = user.kidsAccess;
    // If access exists but is a timed plan that expired, revoke it
    if (hasAccess && user.kidsAccessExpiry && new Date() > user.kidsAccessExpiry) {
      hasAccess = false;
      await User.findByIdAndUpdate(user._id, { kidsAccess: false });
    }

    res.json({
      success: true,
      hasAccess,
      accessType: user.kidsAccessType,
      expiresAt: user.kidsAccessExpiry,
      grantedAt: user.kidsAccessGrantedAt,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/kids/grant-access — admin grant
exports.grantAccess = async (req, res) => {
  try {
    const { name, email, plan, source, notes } = req.body;

    const planAmountMap = { lifetime: '$99.00', monthly: '$4.99', yearly: '$49.99' };
    const planExpiry = { lifetime: null, monthly: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), yearly: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) };

    // Find user by email if exists
    const user = await User.findOne({ email });

    const purchase = new KidsPurchase({
      userId: user?._id || null,
      name,
      email,
      plan: plan || 'lifetime',
      amount: planAmountMap[plan] || '$99.00',
      status: 'active',
      source: source || 'admin_grant',
      purchasedAt: new Date(),
      expiresAt: planExpiry[plan] || null,
      notes: notes || '',
    });
    await purchase.save();

    // If user exists, update their access
    if (user) {
      await User.findByIdAndUpdate(user._id, {
        kidsAccess: true,
        kidsAccessType: plan || 'lifetime',
        kidsAccessGrantedAt: new Date(),
        kidsAccessExpiry: planExpiry[plan] || null,
        kidsAccessSource: 'admin_grant',
      });
    }

    res.status(201).json({ success: true, data: purchase });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// DELETE /api/kids/purchases/:id — revoke access (admin)
exports.revokeAccess = async (req, res) => {
  try {
    const purchase = await KidsPurchase.findById(req.params.id);
    if (!purchase) return res.status(404).json({ success: false, message: 'Record not found' });

    purchase.status = 'revoked';
    await purchase.save();

    // Revoke on user account if userId exists
    if (purchase.userId) {
      // Check if user has any other active purchases
      const otherActive = await KidsPurchase.findOne({ userId: purchase.userId, status: 'active', _id: { $ne: purchase._id } });
      if (!otherActive) {
        await User.findByIdAndUpdate(purchase.userId, { kidsAccess: false, kidsAccessType: null });
      }
    } else if (purchase.email) {
      const otherActive = await KidsPurchase.findOne({ email: purchase.email, status: 'active', _id: { $ne: purchase._id } });
      if (!otherActive) {
        await User.findOneAndUpdate({ email: purchase.email }, { kidsAccess: false, kidsAccessType: null });
      }
    }

    res.json({ success: true, message: 'Access revoked successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── PLAN SETTINGS ───────────────────────────────────────────────────────────

exports.getPlanSettings = async (req, res) => {
  try {
    let setting = await Setting.findOne({ key: 'kidsPlanSettings' });
    if (!setting) {
      setting = new Setting({
        key: 'kidsPlanSettings',
        value: JSON.stringify({
          lifetimeEnabled: true,
          lifetimePrice: 99,
          monthlyEnabled: true,
          monthlyPrice: 4.99,
          yearlyEnabled: true,
          yearlyPrice: 49.99,
          trialDays: 7,
        })
      });
      await setting.save();
    }
    res.json({ success: true, data: JSON.parse(setting.value) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updatePlanSettings = async (req, res) => {
  try {
    let setting = await Setting.findOne({ key: 'kidsPlanSettings' });
    if (!setting) {
      setting = new Setting({ key: 'kidsPlanSettings', value: JSON.stringify(req.body) });
    } else {
      setting.value = JSON.stringify(req.body);
    }
    await setting.save();
    res.json({ success: true, data: JSON.parse(setting.value) });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ─── DOWNLOADS ───────────────────────────────────────────────────────────────

exports.downloadSampleGuide = (req, res) => {
  try {
    const seriesName = req.query.series || 'Friendly Forest';
    const filename = `${seriesName.replace(/[^a-z0-9]/gi, '_')}_Connection_Guide.txt`;
    const content = `KidsBibleFlix Connection Guide
==============================
Series: ${seriesName}

BIBLE FOCUS:
"But the fruit of the Spirit is love, joy, peace, forbearance, kindness..." - Galatians 5:22

CONVERSATION STARTERS:
• What was the main lesson learned in this series?
• Can you name a time when you experienced something similar?
• How does God help us when we face these challenges?

FAMILY ACTIVITY:
This week, find one way to practice the virtue highlighted in this series with your family. Pray together and ask God to guide your actions!`;

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(content);
  } catch (error) {
    res.status(500).json({ message: 'Failed to generate download' });
  }
};
