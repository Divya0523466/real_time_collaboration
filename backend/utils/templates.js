export const htmlTemplateOtp = (otp) => {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #ffffff; color: #092328; margin: 0; padding: 40px 20px;">
      <div style="max-width: 600px; margin: 0 auto;">
        
        <div style="text-align: center; margin-bottom: 40px;">
          <img src="https://res.cloudinary.com/nbmkbcu4/image/upload/v1790058816/worknestlogo.png" alt="WorkNest Logo" style="height: 48px; margin-bottom: 8px;" />
          <h2 style="margin: 0; color: #092328; font-size: 20px; font-weight: 700; letter-spacing: 0.5px;">WorkNest</h2>
        </div>
        
        <h1 style="font-size: 24px; font-weight: 600; margin-bottom: 16px; color: #092328;">Password Reset</h1>
        
        <p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
          We received a request to reset the password for your WorkNest account. Use the verification code below to proceed.
        </p>
        
        <div style="border: 2px solid #8BBB92; border-radius: 8px; padding: 24px; margin-bottom: 24px; display: inline-block;">
          <span style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #12544F;">
            ${otp}
          </span>
        </div>
        
        <p style="font-size: 14px; color: #2A835F; margin-bottom: 40px; font-weight: 600;">
          This code is valid for the next 10 minutes.
        </p>
        
        <hr style="border: none; border-top: 1px solid #8BBB92; opacity: 0.3; margin: 48px 0 24px;" />
        <p style="font-size: 14px; color: #12544F; line-height: 1.5; margin-bottom: 8px; opacity: 0.8;">
          If you didn't request a password reset, you can safely ignore this email.
        </p>
        <p style="font-size: 12px; color: #12544F; margin-top: 24px; opacity: 0.6;">
          © ${new Date().getFullYear()} WorkNest. All rights reserved.
        </p>
      </div>
    </div>
  `;
};

export const htmlTemplateWelcome = (username) => {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #ffffff; color: #092328; margin: 0; padding: 40px 20px;">
      <div style="max-width: 600px; margin: 0 auto;">
        
        <div style="text-align: center; margin-bottom: 40px;">
          <img src="https://res.cloudinary.com/nbmkbcu4/image/upload/v1790058816/worknestlogo.png" alt="WorkNest Logo" style="height: 48px; margin-bottom: 8px;" />
          <h2 style="margin: 0; color: #092328; font-size: 20px; font-weight: 700; letter-spacing: 0.5px;">WorkNest</h2>
        </div>
        
        <h1 style="font-size: 24px; font-weight: 600; margin-bottom: 16px; color: #092328;">Account Created!</h1>
        
        <p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
          Hi <strong style="color: #12544F;">${username}</strong>,<br><br>
          Welcome! Your WorkNest account has been successfully created. Before you begin collaborating, here are your next steps.
        </p>
        
        <h2 style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; color: #2A835F; margin-bottom: 16px;">Next Steps</h2>
        <ul style="padding-left: 20px; font-size: 16px; line-height: 1.6; color: #092328; margin-bottom: 32px;">
          <li style="margin-bottom: 8px;"><strong>Create a Workspace</strong> and set up a dedicated space for your team.</li>
          <li style="margin-bottom: 8px;"><strong>Invite Members</strong> to bring your colleagues on board.</li>
          <li style="margin-bottom: 8px;"><strong>Create Channels</strong> to organize your conversations by topic or project.</li>
        </ul>
        
        <div style="text-align: center; margin: 40px 0;">
          <a href="https://real-time-collaboration-psi.vercel.app/" style="display: inline-block; background-color: #12544F; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600;">Go to Dashboard</a>
        </div>
        
        <hr style="border: none; border-top: 1px solid #8BBB92; opacity: 0.3; margin: 48px 0 24px;" />
        
        <p style="font-size: 14px; color: #12544F; line-height: 1.5; margin-bottom: 8px; opacity: 0.8;">
          <strong>Support</strong><br>
          If you have any questions about your WorkNest account, our support team is available anytime at <a href="mailto:support@worknest.com" style="color: #2A835F; text-decoration: none;">support@worknest.com</a>
        </p>
        <p style="font-size: 12px; color: #12544F; margin-top: 24px; opacity: 0.6;">
          © ${new Date().getFullYear()} WorkNest. All rights reserved.
        </p>
      </div>
    </div>
  `;
};

export const workspaceInvitation = (inviterName, workspaceName, customMessage, inviteLink) => {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #ffffff; color: #092328; margin: 0; padding: 40px 20px;">
      <div style="max-width: 600px; margin: 0 auto;">
        
        <div style="text-align: center; margin-bottom: 40px;">
          <img src="https://res.cloudinary.com/nbmkbcu4/image/upload/v1790058816/worknestlogo.png" alt="WorkNest Logo" style="height: 48px; margin-bottom: 8px;" />
          <h2 style="margin: 0; color: #092328; font-size: 20px; font-weight: 700; letter-spacing: 0.5px;">WorkNest</h2>
        </div>
        
        <h1 style="font-size: 24px; font-weight: 600; margin-bottom: 16px; color: #092328;">You've been invited to ${workspaceName}</h1>
        
        <p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
          <strong style="color: #12544F;">${inviterName}</strong> has invited you to collaborate in the <strong style="color: #12544F;">${workspaceName}</strong> workspace on WorkNest.
        </p>

        ${customMessage ? `
        <div style="border-left: 4px solid #2A835F; padding: 12px 20px; margin-bottom: 24px;">
          <p style="font-size: 15px; margin: 0; font-style: italic; line-height: 1.5; color: #12544F;">"${customMessage}"</p>
        </div>
        ` : ''}
        
        <div style="text-align: center; margin: 40px 0;">
          <a href="${inviteLink}" style="display: inline-block; background-color: #12544F; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600;">Accept Invitation</a>
        </div>
        
        <hr style="border: none; border-top: 1px solid #8BBB92; opacity: 0.3; margin: 48px 0 24px;" />
        <p style="font-size: 14px; color: #12544F; line-height: 1.5; margin-bottom: 8px; opacity: 0.8;">
          If you do not wish to join this workspace, you can safely ignore this email.
        </p>
        <p style="font-size: 12px; color: #12544F; margin-top: 24px; opacity: 0.6;">
          © ${new Date().getFullYear()} WorkNest. All rights reserved.
        </p>
      </div>
    </div>
  `;
};

export const roleUpdated = (workspaceName, newRole) => {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #ffffff; color: #092328; margin: 0; padding: 40px 20px;">
      <div style="max-width: 600px; margin: 0 auto;">
        
        <div style="text-align: center; margin-bottom: 40px;">
          <img src="https://res.cloudinary.com/nbmkbcu4/image/upload/v1790058816/worknestlogo.png" alt="WorkNest Logo" style="height: 48px; margin-bottom: 8px;" />
          <h2 style="margin: 0; color: #092328; font-size: 20px; font-weight: 700; letter-spacing: 0.5px;">WorkNest</h2>
        </div>
        
        <h1 style="font-size: 24px; font-weight: 600; margin-bottom: 16px; color: #092328;">Role Updated</h1>
        
        <p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
          Your permissions in the <strong style="color: #12544F;">${workspaceName}</strong> workspace have been updated by an administrator.
        </p>
        
        <p style="font-size: 16px; line-height: 1.6; margin-bottom: 32px; padding-left: 16px; border-left: 3px solid #2A835F;">
          New Role: <strong style="color: #12544F; font-size: 18px;">${newRole.toUpperCase()}</strong>
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://real-time-collaboration-psi.vercel.app/" style="display: inline-block; background-color: #12544F; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600;">Open WorkNest</a>
        </div>
        
        <hr style="border: none; border-top: 1px solid #8BBB92; opacity: 0.3; margin: 48px 0 24px;" />
        <p style="font-size: 12px; color: #12544F; margin-top: 24px; opacity: 0.6;">
          © ${new Date().getFullYear()} WorkNest. All rights reserved.
        </p>
      </div>
    </div>
  `;
};

export const memberRemoved = (workspaceName) => {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #ffffff; color: #092328; margin: 0; padding: 40px 20px;">
      <div style="max-width: 600px; margin: 0 auto;">
        
        <div style="text-align: center; margin-bottom: 40px;">
          <img src="https://res.cloudinary.com/nbmkbcu4/image/upload/v1790058816/worknestlogo.png" alt="WorkNest Logo" style="height: 48px; margin-bottom: 8px;" />
          <h2 style="margin: 0; color: #092328; font-size: 20px; font-weight: 700; letter-spacing: 0.5px;">WorkNest</h2>
        </div>
        
        <h1 style="font-size: 24px; font-weight: 600; margin-bottom: 16px; color: #092328;">Workspace Access Revoked</h1>
        
        <p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
          You are no longer a member of the <strong style="color: #12544F;">${workspaceName}</strong> workspace. Your access to its channels and resources has been removed.
        </p>
        
        <hr style="border: none; border-top: 1px solid #8BBB92; opacity: 0.3; margin: 48px 0 24px;" />
        <p style="font-size: 14px; color: #12544F; line-height: 1.5; margin-bottom: 8px; opacity: 0.8;">
          If you believe this was a mistake, please reach out directly to the workspace administrator.
        </p>
        <p style="font-size: 12px; color: #12544F; margin-top: 24px; opacity: 0.6;">
          © ${new Date().getFullYear()} WorkNest. All rights reserved.
        </p>
      </div>
    </div>
  `;
};

export const addedToChannel = (workspaceName, channelName) => {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #ffffff; color: #092328; margin: 0; padding: 40px 20px;">
      <div style="max-width: 600px; margin: 0 auto;">
        
        <div style="text-align: center; margin-bottom: 40px;">
          <img src="https://res.cloudinary.com/nbmkbcu4/image/upload/v1790058816/worknestlogo.png" alt="WorkNest Logo" style="height: 48px; margin-bottom: 8px;" />
          <h2 style="margin: 0; color: #092328; font-size: 20px; font-weight: 700; letter-spacing: 0.5px;">WorkNest</h2>
        </div>
        
        <h1 style="font-size: 24px; font-weight: 600; margin-bottom: 16px; color: #092328;">Added to #${channelName}</h1>
        
        <p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
          You have been added to a new private channel in the <strong style="color: #12544F;">${workspaceName}</strong> workspace.
        </p>
        
        <div style="text-align: center; margin: 40px 0;">
          <a href="https://real-time-collaboration-psi.vercel.app/" style="display: inline-block; background-color: #12544F; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600;">View Channel</a>
        </div>
        
        <hr style="border: none; border-top: 1px solid #8BBB92; opacity: 0.3; margin: 48px 0 24px;" />
        <p style="font-size: 12px; color: #12544F; margin-top: 24px; opacity: 0.6;">
          © ${new Date().getFullYear()} WorkNest. All rights reserved.
        </p>
      </div>
    </div>
  `;
};

export const removedFromChannel = (workspaceName, channelName) => {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #ffffff; color: #092328; margin: 0; padding: 40px 20px;">
      <div style="max-width: 600px; margin: 0 auto;">
        
        <div style="text-align: center; margin-bottom: 40px;">
          <img src="https://res.cloudinary.com/nbmkbcu4/image/upload/v1790058816/worknestlogo.png" alt="WorkNest Logo" style="height: 48px; margin-bottom: 8px;" />
          <h2 style="margin: 0; color: #092328; font-size: 20px; font-weight: 700; letter-spacing: 0.5px;">WorkNest</h2>
        </div>
        
        <h1 style="font-size: 24px; font-weight: 600; margin-bottom: 16px; color: #092328;">Removed from #${channelName}</h1>
        
        <p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
          Your access to the private channel <strong style="color: #12544F;">#${channelName}</strong> in the <strong style="color: #12544F;">${workspaceName}</strong> workspace has been revoked.
        </p>
        
        <p style="font-size: 15px; color: #12544F; line-height: 1.6; margin-bottom: 32px;">
          You will no longer be able to view or send messages in this specific channel. You still have access to the rest of the workspace channels that you are a member of.
        </p>
        
        <div style="text-align: center; margin: 40px 0;">
          <a href="https://real-time-collaboration-psi.vercel.app/app/dashboard" style="display: inline-block; background-color: #12544F; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600;">Go to Dashboard</a>
        </div>
        
        <hr style="border: none; border-top: 1px solid #8BBB92; opacity: 0.3; margin: 48px 0 24px;" />
        <p style="font-size: 12px; color: #12544F; margin-top: 24px; opacity: 0.6;">
          © ${new Date().getFullYear()} WorkNest. All rights reserved.
        </p>
      </div>
    </div>
  `;
};