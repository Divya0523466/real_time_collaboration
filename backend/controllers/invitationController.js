import Invitation from "../models/Invitation.js"
import WorkspaceMembership from "../models/WorkspaceMembership.js"
import User from "../models/User.js"

const inviteMembers = async (req, res) => {
  try {
    const { workspaceId } = req.params
    const { emails, message, role = "MEMBER" } = req.body
    const userId = req.userId

    if (!Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ message: "At least one email is required" })
    }

    const inviteRole = ["ADMIN", "MEMBER"].includes(role) ? role : "MEMBER"

    const requesterMembership = await WorkspaceMembership.findOne({ userId, workspaceId })
    if (!requesterMembership || requesterMembership.role !== "OWNER") {
      return res.status(403).json({ message: "Only workspace owners can invite members" })
    }

    const normalized = [...new Set(
      emails
        .map((email) => String(email).trim().toLowerCase())
        .filter(Boolean)
        .filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)),
    )]

    if (normalized.length === 0) {
      return res.status(400).json({ message: "No valid email addresses were provided" })
    }

    const createdInvites = []
    for (const email of normalized) {
      const existingUser = await User.findOne({ email })
      if (existingUser) {
        const alreadyMember = await WorkspaceMembership.findOne({ workspaceId, userId: existingUser._id })
        if (!alreadyMember) {
          await WorkspaceMembership.create({
            userId: existingUser._id,
            workspaceId,
            role: inviteRole,
          })
        }
        continue
      }

      const invite = await Invitation.findOneAndUpdate(
        { workspaceId, email },
        {
          workspaceId,
          email,
          invitedBy: userId,
          status: "PENDING",
          role: inviteRole,
          message: message || "",
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
      createdInvites.push({ email, status: invite.status, role: inviteRole })
    }

    return res.status(201).json({
      message: "Invitations processed successfully",
      invites: createdInvites,
    })
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message })
  }
}

export { inviteMembers }
