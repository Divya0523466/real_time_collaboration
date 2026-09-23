export const sendEmail = async (to, subject, html = "") => {
  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": process.env.BREVO_API_KEY,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        sender: { name: "Worknest", email: process.env.BREVO_SENDER_EMAIL || "support@worknest.com" },
        to: [{ email: to }],
        subject: subject,
        htmlContent: html
      })
    });
    
    if (!response.ok) {
        const errorData = await response.json();
        console.error("Error sending email:", errorData);
    } else {
        console.log("Email sent successfully");
    }
  } catch (error) {
    console.error("Error sending email:", error);
  }
}
