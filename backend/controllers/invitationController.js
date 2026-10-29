import mongoose from "mongoose"
import Invitation from "../models/Invitation.js"
import Workspace from "../models/Workspace.js"
import WorkspaceMembership from "../models/WorkspaceMembership.js"
import User from "../models/User.js"
import { createAndSendNotification } from "../utils/notificationService.js";
import { sendEmail } from "../utils/sendMail.js";
import {workspaceInvitation} from "../utils/templates.js"

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
    if (!requesterMembership) {
      return res.status(403).json({ message: "Access denied to workspace" })
    }

    const invitationEmails = [...new Set(
      emails
        .map((email) => String(email).trim())
        .filter(Boolean)
        .filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)),
    )]

    if (invitationEmails.length === 0) {
      return res.status(400).json({ message: "No valid email addresses were provided" })
    }

    const inviterUser = await User.findById(userId).select("username email");
    const workspace = await Workspace.findById(workspaceId).select("name description");
    
    const inviteLink = `${process.env.FRONTEND_URL}/app/dashboard`; 
    const io = req.app.get("io");

    const createdInvites = []
    for (const email of invitationEmails) {
      const htmlTemplate = workspaceInvitation(
        inviterUser?.username || "A teammate", 
        workspace?.name || "a workspace", 
        message, 
        inviteLink
      );
      
      await sendEmail(
        email, 
        `You've been invited to join ${workspace?.name || "a workspace"} on WorkNest`,
        htmlTemplate
      );
      const existingUser = await User.findOne({ email }).select("_id email username").lean();
      if (existingUser) {
        const alreadyMember = await WorkspaceMembership.findOne({ workspaceId, userId: existingUser._id }).select("_id").lean();
        if (alreadyMember) {
          // If they are already a member, skip creating an invitation
          continue;
        }
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

      // Real-time socket emission to invited user
      if (existingUser && io) {
        const formattedInvite = {
          id: invite._id,
          workspaceId: workspace?._id || workspaceId,
          workspaceName: workspace?.name || "Workspace",
          workspaceDescription: workspace?.description || "",
          inviter: inviterUser
            ? {
                id: inviterUser._id,
                username: inviterUser.username,
                email: inviterUser.email,
              }
            : null,
          role: inviteRole,
          message: message || "",
          createdAt: invite.createdAt || new Date(),
        };

        io.to(`user:${existingUser._id}`).emit("invitation-received", formattedInvite);

        createAndSendNotification(io, {
          recipientId: existingUser._id,
          actorId: userId,
          type: "WORKSPACE_INVITED",
          title: `Invited to ${workspace?.name || "a workspace"}`,
          message: `${inviterUser?.username || "A teammate"} invited you to join "${workspace?.name || "a workspace"}".`,
          workspaceId,
        }).catch(() => {});
      }
    }

    return res.status(201).json({
      message: "Invitations processed successfully",
      invites: createdInvites,
    })
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message })
  }
}

const getPendingInvitations = async (req, res) => {
  try {
    const currentUser = await User.findById(req.userId).select("email")
    if (!currentUser) {
      return res.status(404).json({ message: "User not found" })
    }

    const invitations = await Invitation.find({
      email: currentUser.email,
      status: "PENDING",
    })
      .populate("workspaceId", "name description")
      .populate("invitedBy", "username email")
      .sort({ createdAt: -1 })
      .lean()

    return res.json({
      invitations: invitations.map((invitation) => ({
        id: invitation._id,
        workspaceId: invitation.workspaceId?._id || invitation.workspaceId,
        workspaceName: invitation.workspaceId?.name || "Workspace",
        workspaceDescription: invitation.workspaceId?.description || "",
        inviter: invitation.invitedBy
          ? {
              id: invitation.invitedBy._id,
              username: invitation.invitedBy.username,
              email: invitation.invitedBy.email,
            }
          : null,
        role: invitation.role,
        message: invitation.message || "",
        createdAt: invitation.createdAt,
      })),
    })
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message })
  } 
}

const acceptInvitation = async (req, res) => {
  try {
    const { invitationId } = req.params
    const userId = req.userId

    if (!mongoose.Types.ObjectId.isValid(invitationId)) {
      return res.status(400).json({ message: "Invalid invitation ID" })
    }

    const currentUser = await User.findById(userId).select("_id email")
    if (!currentUser) {
      return res.status(404).json({ message: "User not found" })
    }

    const invitation = await Invitation.findOne({
      _id: invitationId,
      email: currentUser.email,
      status: "PENDING",
    }).populate("workspaceId", "name description")

    if (!invitation) {
      return res.status(404).json({ message: "Pending invitation not found for this user" })
    }

    const workspace = invitation.workspaceId
    if (!workspace) {
      return res.status(404).json({ message: "Workspace no longer exists" })
    }

    const existingMembership = await WorkspaceMembership.findOne({
      userId: currentUser._id,
      workspaceId: workspace._id,
    })

    if (!existingMembership) {
      await WorkspaceMembership.create({
        userId: currentUser._id,
        workspaceId: workspace._id,
        role: invitation.role,
      })
    }

    invitation.status = "ACCEPTED"
    await invitation.save()

    const io = req.app.get("io")
    if (io) {
      io.to(`user:${userId}`).emit("invitation-removed", { invitationId });
    }
    if (invitation.invitedBy) {
      await createAndSendNotification(io, {
        recipientId: invitation.invitedBy,
        actorId: currentUser._id,
        type: "WORKSPACE_INVITE_ACCEPTED",
        title: "Invitation Accepted",
        message: `${currentUser.username || currentUser.email} accepted your invitation to ${workspace.name}.`,
        workspaceId: workspace._id,
      })
    }

    return res.json({
      message: "Invitation accepted successfully",
      invitation: {
        id: invitation._id,
        status: invitation.status,
        role: invitation.role,
      },
      workspace: {
        id: workspace._id,
        name: workspace.name,
        description: workspace.description,
      },
    })
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message })
  }
}

const declineInvitation = async (req, res) => {
  try {
    const { invitationId } = req.params
    const userId = req.userId

    if (!mongoose.Types.ObjectId.isValid(invitationId)) {
      return res.status(400).json({ message: "Invalid invitation ID" })
    }

    const currentUser = await User.findById(userId).select("_id email username")
    if (!currentUser) {
      return res.status(404).json({ message: "User not found" })
    }

    const invitation = await Invitation.findOne({
      _id: invitationId,
      email: currentUser.email,
      status: "PENDING",
    })

    if (!invitation) {
      return res.status(404).json({ message: "Pending invitation not found for this user" })
    }

    invitation.status = "DECLINED"
    await invitation.save()

    const io = req.app.get("io")
    if (io) {
      io.to(`user:${userId}`).emit("invitation-removed", { invitationId });
    }
    if (invitation.invitedBy) {
      const workspace = await Workspace.findById(invitation.workspaceId).select("name")
      await createAndSendNotification(io, {
        recipientId: invitation.invitedBy,
        actorId: currentUser._id,
        type: "WORKSPACE_INVITE_DECLINED",
        title: "Invitation Declined",
        message: `${currentUser.username || currentUser.email} declined your invitation to ${workspace?.name || "the workspace"}.`,
        workspaceId: invitation.workspaceId,
      })
    }

    return res.json({
      message: "Invitation declined successfully",
      invitation: {
        id: invitation._id,
        status: invitation.status,
      },
    })
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message })
  }
}

export { inviteMembers, getPendingInvitations, acceptInvitation, declineInvitation }
