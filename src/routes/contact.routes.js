const express = require('express');
const router = express.Router();
const { Resend } = require('resend');
const Contact = require('../models/Contact');
const { protect, authorize } = require('../middlewares/auth.middleware');

const resend = new Resend(process.env.RESEND_API_KEY);

// GET all contact messages (admin only)
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const contacts = await Contact.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: contacts });
  } catch (err) {
    console.error("Get Contacts Error:", err);
    res.status(500).json({ success: false, message: 'Failed to fetch contact inquiries' });
  }
});

// DELETE contact message (admin only)
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    await Contact.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Message deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete message' });
  }
});

// POST send contact message & save to DB (public)
router.post('/', async (req, res) => {
  try {
    const { firstName, lastName, email, category, message } = req.body;

    if (!firstName || !lastName || !email || !category || !message) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Save to Database
    const savedContact = await Contact.create({
      firstName,
      lastName,
      email,
      category,
      message
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #FAF7EE; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <div style="max-w-600px; margin: 40px auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 20px rgba(26, 47, 36, 0.08);">
          
          <!-- Header -->
          <div style="background-color: #1a2f24; padding: 40px 30px; text-align: center;">
            <p style="margin: 0; font-size: 12px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: #D4AF37;">New Inquiry</p>
            <h1 style="margin: 15px 0 0; font-size: 28px; color: #ffffff; font-weight: 400; font-family: Georgia, serif;">${category}</h1>
          </div>
          
          <!-- Body -->
          <div style="padding: 40px 30px;">
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
              <tr>
                <td style="padding: 15px 0; border-bottom: 1px solid #EFECE3;">
                  <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #8F9A93; display: block; margin-bottom: 5px;">Sender Name</span>
                  <span style="font-size: 16px; color: #1a2f24; font-weight: 500;">${firstName} ${lastName}</span>
                </td>
              </tr>
              <tr>
                <td style="padding: 15px 0; border-bottom: 1px solid #EFECE3;">
                  <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #8F9A93; display: block; margin-bottom: 5px;">Email Address</span>
                  <a href="mailto:${email}" style="font-size: 16px; color: #D4AF37; text-decoration: none; font-weight: 500;">${email}</a>
                </td>
              </tr>
            </table>

            <div style="background-color: #FAF7EE; padding: 25px; border-radius: 12px; border: 1px solid #EFECE3;">
              <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #1a2f24; display: block; margin-bottom: 15px;">Message Content</span>
              <p style="margin: 0; font-size: 15px; line-height: 1.7; color: #3a4b41; white-space: pre-wrap;">${message}</p>
            </div>
            
            <div style="margin-top: 40px; text-align: center;">
              <p style="margin: 0; font-size: 13px; color: #8F9A93;">You can reply directly to this email to respond to ${firstName}.</p>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #EFECE3; padding: 20px; text-align: center;">
            <p style="margin: 0; font-size: 11px; color: #8F9A93; text-transform: uppercase; letter-spacing: 0.1em;">One Mustard Seed &bull; Automated System</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      const cat = (category || '').toLowerCase();
      const isGivingOrSupport = cat.includes('giving') || cat.includes('sponsor') || cat.includes('support') || cat.includes('donation');
      const targetEmail = isGivingOrSupport ? 'rich@onemustardseed.com' : (process.env.ADMIN_EMAIL || 'leo@onemustardseed.com');

      await resend.emails.send({
        from: 'OMS Contact Form <onboarding@resend.dev>',
        to: targetEmail,
        replyTo: email,
        subject: `New OMS Inquiry: ${category} - ${firstName} ${lastName}`,
        html: htmlContent
      });
    } catch (emailErr) {
      console.error("Resend Email Warning:", emailErr.message);
    }

    res.status(200).json({ success: true, message: 'Message sent successfully', data: savedContact });
  } catch (err) {
    console.error("Contact Error:", err);
    res.status(500).json({ message: 'Failed to send message' });
  }
});

module.exports = router;

