const PodcastSeason = require('../models/PodcastSeason');
const PodcastPlatform = require('../models/PodcastPlatform');
const PodcastEpisode = require('../models/PodcastEpisode');
const Setting = require('../models/Setting');
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);


exports.getAllSeasons = async (req, res) => {
  try {
    const seasons = await PodcastSeason.find().sort({ createdAt: -1 });
    res.json({ success: true, data: seasons });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllEpisodes = async (req, res) => {
  try {
    const episodes = await PodcastEpisode.find().sort({ createdAt: -1 });
    res.json({ success: true, data: episodes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getSeasonById = async (req, res) => {
  try {
    const season = await PodcastSeason.findById(req.params.id);
    if (!season) return res.status(404).json({ success: false, message: 'Season not found' });
    
    const episodes = await PodcastEpisode.find({ seasonId: season._id }).sort({ createdAt: 1 });
    res.json({ success: true, data: { ...season.toObject(), episodes } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createSeason = async (req, res) => {
  try {
    const { title, description, status, image } = req.body;
    const season = new PodcastSeason({ title, description, status, image });
    await season.save();
    res.status(201).json({ success: true, data: season });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.updateSeason = async (req, res) => {
  try {
    const allowedFields = ['title', 'description', 'status', 'image', 'resources', 'spotifyUrl', 'applePodcastsUrl', 'isPremium'];
    const updateData = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updateData[field] = req.body[field];
    }
    const season = await PodcastSeason.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    if (!season) return res.status(404).json({ success: false, message: 'Season not found' });
    res.json({ success: true, data: season });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.deleteSeason = async (req, res) => {
  try {
    const season = await PodcastSeason.findByIdAndDelete(req.params.id);
    if (!season) return res.status(404).json({ success: false, message: 'Season not found' });
    // Also delete episodes
    await PodcastEpisode.deleteMany({ seasonId: req.params.id });
    res.json({ success: true, message: 'Season deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createEpisode = async (req, res) => {
  try {
    const { title, seasonId, audioUrl, duration, description } = req.body;
    const episode = new PodcastEpisode({ title, seasonId, audioUrl, duration, description });
    await episode.save();

    // Update season episode count
    await PodcastSeason.findByIdAndUpdate(seasonId, { $inc: { episodesCount: 1 } });

    res.status(201).json({ success: true, data: episode });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.updateEpisode = async (req, res) => {
  try {
    const { title, audioUrl, duration, description } = req.body;
    const episode = await PodcastEpisode.findByIdAndUpdate(
      req.params.id,
      { title, audioUrl, duration, description },
      { new: true }
    );
    if (!episode) return res.status(404).json({ success: false, message: 'Episode not found' });
    res.json({ success: true, data: episode });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.recordListen = async (req, res) => {
  try {
    const episode = await PodcastEpisode.findByIdAndUpdate(
      req.params.id,
      { $inc: { listensCount: 1 } },
      { new: true }
    );
    if (!episode) return res.status(404).json({ success: false, message: 'Episode not found' });
    
    // Also increment season listen count
    await PodcastSeason.findByIdAndUpdate(episode.seasonId, { $inc: { listensCount: 1 } });
    
    res.json({ success: true, message: 'Listen recorded' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteEpisode = async (req, res) => {
  try {
    const episode = await PodcastEpisode.findByIdAndDelete(req.params.id);
    if (!episode) return res.status(404).json({ success: false, message: 'Episode not found' });
    
    // Update season episode count
    await PodcastSeason.findByIdAndUpdate(episode.seasonId, { $inc: { episodesCount: -1 } });

    res.json({ success: true, message: 'Episode deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Use Lead model for resource downloads
const Lead = require('../models/Lead');

exports.downloadResource = async (req, res) => {
  try {
    const { email, fileUrl } = req.body;
    if (email) {
      const existing = await Lead.findOne({ email });
      if (!existing) {
        await Lead.create({ 
          name: 'Podcast Listener', 
          email: email,
          resourceTitle: 'Podcast Resource Download' 
        });
      }
    }
    res.json({ success: true, url: fileUrl });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.submitForm = async (req, res) => {
  try {
    const { formType, parentName, parentEmail, childName, location, content, fileUrl } = req.body;
    
    const setting = await Setting.findOne({ key: 'podcast_banner' });
    const toEmail = setting?.value?.submissionEmail || 'angelisse@onemustardseed.com';

    let messageHtml = `
      <h1>New Podcast Submission: ${formType}</h1>
      <p><strong>Parent:</strong> ${parentName} (<a href="mailto:${parentEmail}">${parentEmail}</a>)</p>
      <p><strong>Child:</strong> ${childName}</p>
      <p><strong>Location:</strong> ${location}</p>
    `;

    if (content) {
      messageHtml += `<p><strong>Content:</strong><br/>${content.replace(/\\n/g, '<br/>')}</p>`;
    }
    if (fileUrl) {
      messageHtml += `<p><strong>File Attachment:</strong> <a href="${fileUrl}">Download / View File</a></p>`;
    }

    await resend.emails.send({
      from: 'OMS Podcast <onboarding@resend.dev>',
      to: toEmail,
      replyTo: parentEmail,
      subject: `New Podcast Submission: ${formType.toUpperCase()} - ${childName}`,
      html: messageHtml
    });

    res.json({ success: true, message: 'Submission sent successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getPlatforms = async (req, res) => {
  try {
    const platforms = await PodcastPlatform.find().sort({ createdAt: 1 });
    res.json({ success: true, data: platforms });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createPlatform = async (req, res) => {
  try {
    const { name, url, iconUrl, color } = req.body;
    const platform = new PodcastPlatform({ name, url, iconUrl, color });
    await platform.save();
    res.status(201).json({ success: true, data: platform });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.updatePlatform = async (req, res) => {
  try {
    const { name, url, iconUrl, color } = req.body;
    const platform = await PodcastPlatform.findByIdAndUpdate(
      req.params.id,
      { name, url, iconUrl, color },
      { new: true }
    );
    if (!platform) return res.status(404).json({ success: false, message: 'Platform not found' });
    res.json({ success: true, data: platform });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.deletePlatform = async (req, res) => {
  try {
    const platform = await PodcastPlatform.findByIdAndDelete(req.params.id);
    if (!platform) return res.status(404).json({ success: false, message: 'Platform not found' });
    res.json({ success: true, message: 'Platform deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
