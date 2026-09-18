import { BrevoClient } from '@getbrevo/brevo';

const brevo = new BrevoClient({
apiKey: process.env.BREVO_API_KEY,
});


export const sendEmail=async() =>{
 try {
   const result = await brevo.transactionalEmails.sendTransacEmail({
     subject: "",
     textContent: " ",
     sender: { name: "Support Team", email: "support@worknest.com" },
     to: [{ email: " ", name: "" }],
   });
   console.log("Email sent successfully:", result);
 } catch (error) {
   console.error("Error sending email:", error);
 }
}
