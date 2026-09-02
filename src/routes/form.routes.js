const express = require('express');
const router = express.Router();
const { Resend } = require('resend');
const BirthdaySubmission = require('../models/BirthdaySubmission');
const PremierePartner = require('../models/PremierePartner');
const { protect, authorize } = require('../middlewares/auth.middleware');

const resend = new Resend(process.env.RESEND_API_KEY);

// ── Rich's Birthday Club Form ──
router.post('/birthday-club', async (req, res) => {
  try {
    const { parentName, parentEmail, childName, childDob, instructions } = req.body;

    if (!parentName || !parentEmail || !childName || !childDob) {
      return res.status(400).json({ success: false, message: 'Please provide parent name, email, child name, and birth date.' });
    }

    const submission = await BirthdaySubmission.create({
      parentName,
      parentEmail,
      childName,
      childDob,
      instructions: instructions || ''
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="margin:0;padding:0;background-color:#FAF7EE;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        <div style="max-width:600px;margin:40px auto;background-color:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 20px rgba(26,47,36,0.08);">
          <div style="background-color:#1a2f24;padding:40px 30px;text-align:center;">
            <p style="margin:0;font-size:12px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#D4AF37;">Rich's Birthday Club</p>
            <h1 style="margin:15px 0 0;font-size:26px;color:#ffffff;font-weight:500;">New Child Birthday Signup</h1>
          </div>
          <div style="padding:40px 30px;">
            <table style="width:100%;border-collapse:collapse;">
              <tr>
                <td style="padding:12px 0;border-bottom:1px solid #EFECE3;">
                  <span style="font-size:11px;font-weight:700;text-transform:uppercase;color:#8F9A93;display:block;">Child's Name</span>
                  <span style="font-size:18px;color:#1a2f24;font-weight:bold;">${childName}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 0;border-bottom:1px solid #EFECE3;">
                  <span style="font-size:11px;font-weight:700;text-transform:uppercase;color:#8F9A93;display:block;">Date of Birth</span>
                  <span style="font-size:16px;color:#1a2f24;">${childDob}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 0;border-bottom:1px solid #EFECE3;">
                  <span style="font-size:11px;font-weight:700;text-transform:uppercase;color:#8F9A93;display:block;">Parent's Name</span>
                  <span style="font-size:16px;color:#1a2f24;">${parentName}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 0;border-bottom:1px solid #EFECE3;">
                  <span style="font-size:11px;font-weight:700;text-transform:uppercase;color:#8F9A93;display:block;">Parent's Email</span>
                  <a href="mailto:${parentEmail}" style="font-size:16px;color:#D4AF37;text-decoration:none;">${parentEmail}</a>
                </td>
              </tr>
            </table>

            ${instructions ? `
              <div style="margin-top:25px;background-color:#FAF7EE;padding:20px;border-radius:12px;border:1px solid #EFECE3;">
                <span style="font-size:11px;font-weight:700;text-transform:uppercase;color:#1a2f24;display:block;margin-bottom:8px;">Special Instructions / Pronunciation</span>
                <p style="margin:0;font-size:14px;color:#3a4b41;white-space:pre-wrap;">${instructions}</p>
              </div>
            ` : ''}

            <div style="margin-top:35px;text-align:center;">
              <p style="margin:0;font-size:13px;color:#8F9A93;">Reply directly to this email to contact the parent.</p>
            </div>
          </div>
          <div style="background-color:#EFECE3;padding:15px;text-align:center;">
            <p style="margin:0;font-size:11px;color:#8F9A93;text-transform:uppercase;">One Mustard Seed &bull; Birthday Club System</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      await resend.emails.send({
        from: "Rich's Birthday Club <onboarding@resend.dev>",
        to: 'angelisse@onemustardseed.com',
        replyTo: parentEmail,
        subject: `New Birthday Club Signup: ${childName}`,
        html: htmlContent
      });
    } catch (emailErr) {
      console.error("Birthday Club Resend Email Warning:", emailErr.message);
    }

    res.status(201).json({ success: true, message: "You've successfully signed up for Rich's Birthday Club!", data: submission });
  } catch (error) {
    console.error("Birthday Club Submission Error:", error);
    res.status(500).json({ success: false, message: 'Failed to process Birthday Club submission.' });
  }
});

// ── Premiere Partner Form ──
router.post('/premiere-partner', async (req, res) => {
  try {
    const { name, email, phone, church, newsletter } = req.body;

    if (!name || !email || !church) {
      return res.status(400).json({ success: false, message: 'Please provide name, email, and church.' });
    }

    const partner = await PremierePartner.create({
      name,
      email,
      phone: phone || '',
      church,
      newsletter: newsletter ? 'Yes' : 'No'
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="margin:0;padding:0;background-color:#FAF7EE;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        <div style="max-width:600px;margin:40px auto;background-color:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 20px rgba(26,47,36,0.08);">
          <div style="background-color:#1a2f24;padding:40px 30px;text-align:center;">
            <p style="margin:0;font-size:12px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#D4AF37;">OMS Films</p>
            <h1 style="margin:15px 0 0;font-size:26px;color:#ffffff;font-weight:500;">New Premiere Partner Registration</h1>
          </div>
          <div style="padding:40px 30px;">
            <table style="width:100%;border-collapse:collapse;">
              <tr>
                <td style="padding:12px 0;border-bottom:1px solid #EFECE3;">
                  <span style="font-size:11px;font-weight:700;text-transform:uppercase;color:#8F9A93;display:block;">Church / Organization</span>
                  <span style="font-size:18px;color:#1a2f24;font-weight:bold;">${church}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 0;border-bottom:1px solid #EFECE3;">
                  <span style="font-size:11px;font-weight:700;text-transform:uppercase;color:#8F9A93;display:block;">Contact Name</span>
                  <span style="font-size:16px;color:#1a2f24;">${name}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 0;border-bottom:1px solid #EFECE3;">
                  <span style="font-size:11px;font-weight:700;text-transform:uppercase;color:#8F9A93;display:block;">Email Address</span>
                  <a href="mailto:${email}" style="font-size:16px;color:#D4AF37;text-decoration:none;">${email}</a>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 0;border-bottom:1px solid #EFECE3;">
                  <span style="font-size:11px;font-weight:700;text-transform:uppercase;color:#8F9A93;display:block;">Phone</span>
                  <span style="font-size:16px;color:#1a2f24;">${phone || 'Not provided'}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 0;border-bottom:1px solid #EFECE3;">
                  <span style="font-size:11px;font-weight:700;text-transform:uppercase;color:#8F9A93;display:block;">Newsletter Opt-in</span>
                  <span style="font-size:16px;color:#1a2f24;">${newsletter ? 'Yes' : 'No'}</span>
                </td>
              </tr>
            </table>

            <div style="margin-top:35px;text-align:center;">
              <p style="margin:0;font-size:13px;color:#8F9A93;">Reply directly to this email to contact ${name}.</p>
            </div>
          </div>
          <div style="background-color:#EFECE3;padding:15px;text-align:center;">
            <p style="margin:0;font-size:11px;color:#8F9A93;text-transform:uppercase;">One Mustard Seed &bull; Films Ministry</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      await resend.emails.send({
        from: 'OMS Films <onboarding@resend.dev>',
        to: 'leo@onemustardseed.com',
        replyTo: email,
        subject: `New Premiere Partner Registration: ${church}`,
        html: htmlContent
      });
    } catch (emailErr) {
      console.error("Premiere Partner Resend Email Warning:", emailErr.message);
    }

    res.status(201).json({ success: true, message: 'Thank you for registering your interest! Our team will contact you soon.', data: partner });
  } catch (error) {
    console.error("Premiere Partner Submission Error:", error);
    res.status(500).json({ success: false, message: 'Failed to process Premiere Partner registration.' });
  }
});

// Admin list endpoints
router.get('/birthday-club', protect, authorize('admin'), async (req, res) => {
  try {
    const list = await BirthdaySubmission.find().sort({ createdAt: -1 });
    res.json({ success: true, data: list });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/premiere-partner', protect, authorize('admin'), async (req, res) => {
  try {
    const list = await PremierePartner.find().sort({ createdAt: -1 });
    res.json({ success: true, data: list });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
