
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  const {
    name, email, phone, service, title,
    budget, deadline, description, links, attachment
  } = req.body || {};

  // Basic validation
  if (!name || !email || !phone || !service || !title || !description) {
    return res.status(400).json({ error: "Please fill in all required fields." });
  }

  if (typeof name !== "string" || name.length > 100 ||
      typeof email !== "string" || email.length > 150 ||
      typeof description !== "string" || description.length > 3000) {
    return res.status(400).json({ error: "Some fields are too long or invalid." });
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    return res.status(400).json({ error: "Please enter a valid email address." });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const ownerEmail = process.env.OWNER_EMAIL || "pranav.tiwari18072007@gmail.com";
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !fromEmail) {
    return res.status(500).json({
      error: "Email service is not configured yet. Please contact me on WhatsApp."
    });
  }

  const safe = value => String(value || "Not provided")
    .replace(/[<>]/g, "")
    .slice(0, 3000);

  const details = `
New project enquiry

Name: ${safe(name)}
Email: ${safe(email)}
WhatsApp: ${safe(phone)}
Service: ${safe(service)}
Project: ${safe(title)}
Budget: ${safe(budget)}
Deadline: ${safe(deadline)}
Reference links: ${safe(links)}

Description:
${safe(description)}
`;

  const attachments = [];
  if (attachment) {
    const allowed = /\.(pdf|png|jpe?g|webp|mp4|zip)$/i;
    if (
      typeof attachment.filename !== "string" ||
      !allowed.test(attachment.filename) ||
      typeof attachment.content !== "string" ||
      attachment.content.length > 4_200_000
    ) {
      return res.status(400).json({ error: "Invalid or oversized attachment." });
    }

    attachments.push({
      filename: attachment.filename.replace(/[^a-zA-Z0-9._-]/g, "_"),
      content: attachment.content
    });
  }

  async function sendEmail(payload) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Email provider rejected the request.");
    }
    return data;
  }

  try {
    // Send full enquiry to the owner.
    await sendEmail({
      from: fromEmail,
      to: [ownerEmail],
      reply_to: email,
      subject: `New project enquiry: ${safe(title)}`,
      text: details,
      attachments
    });

    // Send confirmation to the client.
    await sendEmail({
      from: fromEmail,
      to: [email],
      subject: "We received your project enquiry — Pranav Tiwari",
      text: `Hi ${safe(name)},

Thank you for contacting me. Your project enquiry has been received.

I will review the details and get back to you.

Enquiry summary:
Project: ${safe(title)}
Service: ${safe(service)}

Regards,
Pranav Tiwari
Email: pranav.tiwari18072007@gmail.com
WhatsApp: +91 8826115084`
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Enquiry email error:", error.message);
    return res.status(502).json({
      error: "Your enquiry could not be emailed right now. Please try again or contact me on WhatsApp."
    });
  }
}
